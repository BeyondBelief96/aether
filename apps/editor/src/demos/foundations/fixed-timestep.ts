import { Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, type Object3D } from "three";
import { defineDemo } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";

/**
 * Two balls on the same orbit clock. The first is drawn between the last two physics states,
 * blended by alpha; the second at the latest state only, so it stutters at low physics rates.
 */

const HEIGHT = 1; // m
const SMOOTH_RADIUS = 3; // m
const RAW_RADIUS = 2; // m
const BALL_RADIUS = 0.3; // m

const params = {
    speed: number({
        label: "Orbit speed",
        min: 0.2,
        max: 6,
        step: 0.1,
        default: 1.6,
        unit: " rad/s",
    }),
};

function orbitRing(radius: number, material: MeshStandardMaterial): Mesh {
    const ring = new Mesh(new TorusGeometry(radius, 0.015, 8, 128), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = HEIGHT;
    return ring;
}

function placeOnOrbit(obj: Object3D, angle: number, radius: number): void {
    obj.position.set(Math.cos(angle) * radius, HEIGHT, Math.sin(angle) * radius);
}

export const fixedTimestepDemo = defineDemo({
    id: "fixed-timestep",
    title: "Fixed timestep",
    category: "foundations",
    summary:
        "Physics steps at a fixed rate and the renderer blends between steps. The outer ball " +
        "is blended; the inner ball jumps from step to step.",
    hint: "Pick 10 Hz and watch the inner ball stutter while the outer one stays smooth.",
    params,
    presets: [
        { label: "10 Hz", note: "Choppy", values: {}, hz: 10 },
        { label: "30 Hz", note: "Console", values: {}, hz: 30 },
        { label: "60 Hz", note: "Default", values: {}, hz: 60 },
        { label: "240 Hz", note: "Fine", values: {}, hz: 240 },
    ],
    camera: { position: { x: 5, y: 6, z: 7 }, target: { x: 0, y: 0.6, z: 0 } },
    source: "apps/editor/src/demos/foundations/fixed-timestep.ts",
    create({ root, palette, values }) {
        let speed = values.speed;
        let previousAngle = 0;
        let angle = 0;
        let dt = 1 / 60;

        const ball = new SphereGeometry(BALL_RADIUS, 32, 16);
        const smooth = new Mesh(ball, new MeshStandardMaterial({ color: palette.accent }));
        const raw = new Mesh(ball, new MeshStandardMaterial({ color: palette.ink }));
        const ringMaterial = (color: number) =>
            new MeshStandardMaterial({ color, transparent: true, opacity: 0.45 });
        root.add(
            smooth,
            raw,
            orbitRing(SMOOTH_RADIUS, ringMaterial(palette.accent)),
            orbitRing(RAW_RADIUS, ringMaterial(palette.muted)),
        );

        return {
            update(next) {
                speed = next.speed;
            },
            step(stepDt) {
                dt = stepDt;
                previousAngle = angle;
                angle += speed * stepDt;
            },
            sync(alpha) {
                placeOnOrbit(
                    smooth,
                    previousAngle + (angle - previousAngle) * alpha,
                    SMOOTH_RADIUS,
                );
                placeOnOrbit(raw, angle, RAW_RADIUS);
            },
            readouts: () => [
                {
                    title: "Clock",
                    rows: [
                        { label: "Step", value: `${formatNumber(dt * 1000, 1)} ms` },
                        {
                            label: "Turn per step",
                            value: `${formatNumber(speed * dt * (180 / Math.PI), 1)}°`,
                        },
                    ],
                },
            ],
            callouts: () => [
                { at: smooth.position, text: "interpolated", color: 0 },
                { at: raw.position, text: "latest step" },
            ],
        };
    },
});
