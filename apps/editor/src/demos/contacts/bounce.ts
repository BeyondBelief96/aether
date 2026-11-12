import { LineBasicMaterial, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { Polyline } from "../helpers/polyline";
import { StepBlend } from "../helpers/step-blend";
import { BounceSim } from "./bounce-sim";

/**
 * Four balls dropped onto `GroundContacts`, each with its own restitution. Each rebound peak
 * should be `e²` of the one before, and every ball comes to rest on the ground without
 * jittering, which is the resting-contact correction at work. A tick beside each ball marks its
 * last peak.
 */

const RADIUS = 0.3; // m
const SPACING = 1.6; // m
const MARK_WIDTH = 0.9; // m
const SAMPLES_PER_SECOND = 30;

const restitution = (index: number, value: number) =>
    number({
        label: `Ball ${index + 1}`,
        min: 0,
        max: 1,
        step: 0.01,
        default: value,
        color: `var(--series-${index + 1})`,
    });

const params = {
    height: number({ label: "Drop height", min: 0.5, max: 8, step: 0.1, default: 4, unit: " m" }),
    gravity: number({
        label: "Gravity",
        min: 1,
        max: 25,
        step: 0.01,
        default: 9.81,
        unit: " m/s²",
    }),
    e0: restitution(0, 0.9),
    e1: restitution(1, 0.7),
    e2: restitution(2, 0.5),
    e3: restitution(3, 0.3),
};

const KEYS = ["e0", "e1", "e2", "e3"] as const;

export const bounceDemo = defineDemo({
    id: "bounce",
    title: "Bounce",
    category: "contacts",
    summary: "Four balls with four restitutions, dropped onto the ground together.",
    hint: "Raise the physics rate. Each rebound gets closer to e² of the one before.",
    params,
    presets: [
        {
            label: "Spread",
            note: "0.9 to 0.3",
            values: { e0: 0.9, e1: 0.7, e2: 0.5, e3: 0.3, gravity: 9.81 },
        },
        {
            label: "Lively",
            note: "1 to 0.85",
            values: { e0: 1, e1: 0.95, e2: 0.9, e3: 0.85, gravity: 9.81 },
        },
        {
            label: "Dead",
            note: "0.3 to 0",
            values: { e0: 0.3, e1: 0.2, e2: 0.1, e3: 0, gravity: 9.81 },
        },
        { label: "Moon", note: "1.62 m/s²", values: { gravity: 1.62 } },
    ],
    actions: [{ id: "drop", label: "Drop", key: "d" }],
    charts: [
        {
            id: "height",
            title: "Height",
            series: KEYS.map((_, i) => ({ label: `Ball ${i + 1}`, color: i as SeriesIndex })),
            ranges: [
                { label: "0–8 m", min: 0, max: 8, digits: 0 },
                { label: "0–2 m", min: 0, max: 2, digits: 1 },
                { label: "0–0.2 m", min: 0, max: 0.2, digits: 2 },
            ],
            capacity: SAMPLES_PER_SECOND * 12,
            description: "Height of each ball above the ground over the last 12 seconds.",
        },
    ],
    camera: { position: { x: 0, y: 3, z: 8 }, target: { x: 0, y: 2.2, z: 0 } },
    source: "apps/editor/src/demos/contacts/bounce.ts",
    create({ root, palette, values, plot, clearCharts, useWorld }) {
        let current = values;
        let sampleTime = 0;
        const sim = new BounceSim({
            radius: RADIUS,
            spacing: SPACING,
            restitutions: KEYS.map((key) => values[key]),
            height: values.height,
            gravity: values.gravity,
        });
        useWorld(sim.world);
        const heights = sim.balls.map(() => 0);

        const sphere = new SphereGeometry(RADIUS, 32, 16);
        const balls = sim.balls.map((ball, i) => {
            const mesh = new Mesh(sphere, new MeshStandardMaterial({ color: palette.series[i] }));
            const mark = new Polyline(2, new LineBasicMaterial({ color: palette.series[i] }));
            mark.setCount(2);
            root.add(mesh, mark);
            return { ball, mesh, mark };
        });

        const particles = sim.balls.map((ball) => ball.particle);
        const blend = new StepBlend();
        blend.reset(particles);

        const placeMark = (entry: (typeof balls)[number]): void => {
            const { x } = entry.ball.particle.position;
            const y = entry.ball.lastPeak + RADIUS;
            entry.mark.setPoint(0, { x: x - MARK_WIDTH / 2, y, z: -RADIUS });
            entry.mark.setPoint(1, { x: x + MARK_WIDTH / 2, y, z: -RADIUS });
        };

        const drop = (): void => {
            sim.drop(current.height);
            blend.reset(particles);
            sampleTime = 0;
            clearCharts();
        };

        return {
            update(next, changed) {
                current = next;
                KEYS.forEach((key, i) => {
                    if (changed.has(key)) sim.setRestitution(i, next[key]);
                });
                if (changed.has("gravity")) sim.setGravity(next.gravity);
                if (changed.has("height")) drop();
            },
            action(id) {
                if (id === "drop") drop();
            },
            step(dt) {
                blend.remember(particles);
                sim.step(dt);
                sampleTime += dt;
                while (sampleTime >= 1 / SAMPLES_PER_SECOND) {
                    sim.balls.forEach((ball, i) => (heights[i] = sim.heightOf(ball)));
                    plot("height", heights);
                    sampleTime -= 1 / SAMPLES_PER_SECOND;
                }
            },
            sync(alpha) {
                blend.blend(alpha);
                for (const entry of balls) {
                    entry.mesh.position.copy(blend.positionOf(entry.ball.particle));
                    placeMark(entry);
                }
            },
            readouts: () =>
                sim.balls.map((ball, i) => {
                    const e = ball.ground.restitution;
                    const ratio = ball.reboundRatio();
                    return {
                        title: `Ball ${i + 1}`,
                        color: i as SeriesIndex,
                        rows: [
                            { label: "Restitution", value: formatNumber(e, 2) },
                            { label: "e²", value: `${formatNumber(e * e * 100, 0)} %` },
                            {
                                label: "Last rebound",
                                value:
                                    ratio === undefined ? "—" : `${formatNumber(ratio * 100, 0)} %`,
                            },
                            { label: "Last peak", value: `${formatNumber(ball.lastPeak, 2)} m` },
                            { label: "Bounces", value: String(ball.bounces) },
                        ],
                    };
                }),
            callouts: () =>
                balls.map(({ ball, mesh }, i) => ({
                    at: mesh.position,
                    text: sim.atRest(ball)
                        ? "at rest"
                        : `e ${formatNumber(ball.ground.restitution, 2)}`,
                    color: i as SeriesIndex,
                })),
        };
    },
});
