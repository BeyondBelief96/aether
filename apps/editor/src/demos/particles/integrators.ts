import {
    BoxGeometry,
    BufferAttribute,
    Group,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    SphereGeometry,
} from "three";
import { Vec3 } from "aether-physics";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { choice, number } from "../../core/params";
import { makeIntegrator, type IntegratorChoice } from "../helpers/integrators";
import { Polyline } from "../helpers/polyline";
import { SpringCoil } from "../helpers/spring-coil";
import { disposeObject } from "../helpers/three";
import { IntegratorLane, type ShootoutOptions } from "./integrators-sim";

/**
 * The same scene run once per integrator, each in its own `ParticleWorld`, so the only
 * difference between the four lanes is `world.integrator`. The chart plots each lane's energy
 * against its starting energy: 1 is exact, a rising line gains energy, a falling one loses it.
 * A lane whose energy runs away stops and is marked as diverged.
 */

const LANES: readonly { choice: IntegratorChoice; color: SeriesIndex }[] = [
    { choice: "semi-implicit", color: 0 },
    { choice: "explicit", color: 1 },
    { choice: "verlet", color: 2 },
    { choice: "rk4", color: 3 },
];
const SPACING = 13; // m between lane centres
const HEIGHT = 4; // m above the ground, enough for the tallest orbit
const BODY_RADIUS = 0.35; // m
const STAR_RADIUS = 0.5; // m
const TRAIL_POINTS = 360;
const SAMPLES_PER_SECOND = 30;

const _drawn = new Vec3();

const isOrbit = (v: Readonly<Record<string, unknown>>) => v.scene === "orbit";
const isSpring = (v: Readonly<Record<string, unknown>>) => v.scene === "spring";

const params = {
    scene: choice({
        label: "Scene",
        options: [
            { value: "spring", label: "Spring" },
            { value: "orbit", label: "Orbit" },
        ],
        default: "spring",
    }),
    stiffness: number({
        label: "Stiffness",
        min: 5,
        max: 600,
        step: 5,
        default: 40,
        unit: " N/m",
        hidden: isOrbit,
    }),
    eccentricity: number({
        label: "Eccentricity",
        min: 0,
        max: 0.9,
        step: 0.05,
        default: 0.5,
        hidden: isSpring,
    }),
};

export const integratorsDemo = defineDemo({
    id: "integrators",
    title: "Integrators",
    category: "particles",
    summary:
        "One scene, four integrators side by side: semi-implicit Euler, explicit Euler, velocity Verlet and RK4.",
    hint: "Pick the stiff spring and watch explicit Euler gain energy until it diverges.",
    params,
    presets: [
        { label: "Spring", note: "40 N/m", values: { scene: "spring", stiffness: 40 } },
        { label: "Stiff", note: "500 N/m", values: { scene: "spring", stiffness: 500 } },
        { label: "Orbit", note: "e = 0.5", values: { scene: "orbit", eccentricity: 0.5 } },
        {
            label: "Close pass",
            note: "e = 0.85 at 15 Hz",
            values: { scene: "orbit", eccentricity: 0.85 },
            hz: 15,
        },
    ],
    charts: [
        {
            id: "energy",
            title: "Energy against the start",
            series: LANES.map(({ choice: value, color }) => ({
                label: makeIntegrator(value).name,
                color,
            })),
            ranges: [
                { label: "±2%", min: 0.98, max: 1.02, digits: 3 },
                { label: "±25%", min: 0.75, max: 1.25, digits: 2 },
                { label: "0–3×", min: 0, max: 3, digits: 1 },
            ],
            reference: 1,
            capacity: SAMPLES_PER_SECOND * 20,
            description:
                "Each integrator's energy divided by its starting energy, over the last 20 seconds. A lane stops when its ratio leaves 0 to 3.",
        },
    ],
    camera: { position: { x: 0, y: 7, z: 31 }, target: { x: 0, y: 4.5, z: 0 } },
    source: "apps/editor/src/demos/particles/integrators.ts",
    create({ root, palette, values, plot, clearCharts }) {
        let current = values;
        let sampleTime = 0;

        let lanes: IntegratorLane[] = [];
        let scene = new Group();
        let draw: {
            body: Mesh;
            previous: Vec3;
            coil?: SpringCoil;
            trail?: Polyline;
            trailCount: number;
        }[] = [];

        const origin = (i: number) => new Vec3((i - (LANES.length - 1) / 2) * SPACING, HEIGHT, 0);

        /** Rebuilds every lane from the current values. */
        const build = (): void => {
            root.remove(scene);
            disposeObject(scene);
            scene = new Group();
            root.add(scene);

            const options: ShootoutOptions = {
                scene: current.scene,
                stiffness: current.stiffness,
                eccentricity: current.eccentricity,
            };
            lanes = LANES.map(
                ({ choice: value }, i) =>
                    new IntegratorLane(makeIntegrator(value), origin(i), options),
            );
            draw = lanes.map((lane, i) => {
                const color = palette.series[LANES[i]!.color]!;
                const body = new Mesh(
                    new SphereGeometry(BODY_RADIUS, 24, 16),
                    new MeshStandardMaterial({ color, roughness: 0.5 }),
                );
                scene.add(body);

                if (current.scene === "spring") {
                    const post = new Mesh(
                        new BoxGeometry(0.2, 1.2, 0.2),
                        new MeshStandardMaterial({ color: palette.muted }),
                    );
                    post.position.copy(lane.pivot);
                    scene.add(post);
                    const coil = new SpringCoil(new LineBasicMaterial({ color: palette.ink }));
                    scene.add(coil);
                    return { body, previous: lane.body.position.clone(), coil, trailCount: 0 };
                }

                const star = new Mesh(
                    new SphereGeometry(STAR_RADIUS, 24, 16),
                    new MeshStandardMaterial({
                        color: palette.ink,
                        emissive: palette.ink,
                        emissiveIntensity: 0.3,
                    }),
                );
                star.position.copy(lane.pivot);
                scene.add(star);
                const trail = new Polyline(
                    TRAIL_POINTS,
                    new LineBasicMaterial({ color, transparent: true, opacity: 0.7 }),
                );
                scene.add(trail);
                return { body, previous: lane.body.position.clone(), trail, trailCount: 0 };
            });
            sampleTime = 0;
            clearCharts();
        };

        /** Appends the lane's current position to its trail, dropping the oldest when full. */
        const extendTrail = (i: number): void => {
            const item = draw[i]!;
            const trail = item.trail;
            if (!trail) return;
            const position = lanes[i]!.body.position;
            if (item.trailCount < TRAIL_POINTS) {
                trail.setPoint(item.trailCount, position);
                item.trailCount++;
                trail.setCount(item.trailCount);
                return;
            }
            const attr = trail.geometry.getAttribute("position") as BufferAttribute;
            attr.array.copyWithin(0, 3);
            trail.setPoint(TRAIL_POINTS - 1, position);
        };

        build();

        return {
            update(next, changed) {
                current = next;
                if (
                    changed.has("scene") ||
                    changed.has("stiffness") ||
                    changed.has("eccentricity")
                ) {
                    build();
                }
            },
            step(dt) {
                lanes.forEach((lane, i) => {
                    draw[i]!.previous.copy(lane.body.position);
                    lane.step(dt);
                });
                sampleTime += dt;
                while (sampleTime >= 1 / SAMPLES_PER_SECOND) {
                    plot(
                        "energy",
                        lanes.map((lane) => lane.relativeEnergy()),
                    );
                    lanes.forEach((_, i) => extendTrail(i));
                    sampleTime -= 1 / SAMPLES_PER_SECOND;
                }
            },
            sync(alpha) {
                lanes.forEach((lane, i) => {
                    const item = draw[i]!;
                    item.body.position.copy(
                        _drawn.copy(item.previous).lerp(lane.body.position, alpha),
                    );
                    item.coil?.update(lane.pivot, item.body.position);
                });
            },
            readouts: () =>
                lanes.map((lane, i) => ({
                    title: lane.integrator.name,
                    color: LANES[i]!.color,
                    rows: [
                        {
                            label: "Energy drift",
                            value: lane.diverged
                                ? "diverged"
                                : `${formatNumber((lane.relativeEnergy() - 1) * 100, 2)} %`,
                            warn: lane.diverged,
                        },
                        {
                            label: "Force evaluations",
                            value: `${lane.integrator.evaluationsPerStep} per step`,
                        },
                        { label: "Step time", value: `${formatNumber(lane.stepMicros, 1)} µs` },
                    ],
                })),
            callouts: () =>
                lanes.map((lane, i) => ({
                    at: draw[i]!.body.position,
                    text: lane.diverged
                        ? `${lane.integrator.name}: diverged`
                        : lane.integrator.name,
                    color: LANES[i]!.color,
                })),
        };
    },
});
