import {
    BoxGeometry,
    CylinderGeometry,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    SphereGeometry,
    type Material,
} from "three";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { formatDegrees, formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { Ticker } from "../../core/ticker";
import { Polyline } from "../helpers/polyline";
import { StepBlend } from "../helpers/step-blend";
import { Strut } from "../helpers/strut";
import { Substeps } from "../helpers/substeps";
import { PendulumsSim, type Pendulum } from "./pendulums-sim";

/**
 * A bob on a `ParticleRod` beside a bob on a `ParticleCable`, kicked from hanging at the same
 * speed. Below `√(2gL)` they swing together. Above it the cable goes slack partway up, its bob
 * falls inside the circle, and the cable snaps taut again; the rod pushes its bob along the
 * circle the whole way. A rod carries its bob over the top above `√(4gL)`, a cable only above
 * `√(5gL)`. Each bob leaves a trail of the last two seconds.
 */

const PIVOT_HEIGHT = 3.2; // m
const LENGTH = 1.5; // m
const SPACING = 3.8; // m, wide enough that the two circles never overlap
const MASS = 1; // kg
const BOB_RADIUS = 0.12; // m
const LINK_RADIUS = 0.02; // m
const POST = 0.12; // m
const MAX_SUBSTEP = 1 / 1000; // s; keeps the swing within a few percent of its energy
const TRAIL_POINTS = 120;
const TRAIL_SECONDS = 2;

/** One pendulum as drawn: what to call it, its series colour and how its link looks now. */
interface PendulumSpec {
    readonly pendulum: Pendulum;
    readonly title: string;
    readonly color: SeriesIndex;
    readonly tag: () => string;
    readonly linkMaterial: () => Material;
}

const params = {
    speed: number({ label: "Kick", min: 0, max: 10, step: 0.1, default: 7, unit: " m/s" }),
    restitution: number({ label: "Cable restitution", min: 0, max: 1, step: 0.01, default: 0 }),
};

export const pendulumsDemo = defineDemo({
    id: "pendulums",
    title: "Pendulums",
    category: "contacts",
    summary: "A bob on a rod and a bob on a cable, kicked at the same speed.",
    hint: "Try Rod loops. A rod can push its bob over the top; a cable can only pull.",
    params,
    presets: [
        { label: "Swing", note: "4 m/s", values: { speed: 4 } },
        { label: "Slack", note: "7 m/s", values: { speed: 7 } },
        { label: "Rod loops", note: "8.2 m/s", values: { speed: 8.2 } },
        { label: "Both loop", note: "9 m/s", values: { speed: 9 } },
    ],
    actions: [{ id: "kick", label: "Kick", key: "k" }],
    camera: { position: { x: 0, y: 3, z: 8.5 }, target: { x: 0, y: 2.4, z: 0 } },
    source: "apps/editor/src/demos/contacts/pendulums.ts",
    create({ root, palette, values, useWorld }) {
        let current = values;
        const substeps = new Substeps(MAX_SUBSTEP);
        const trailClock = new Ticker(TRAIL_SECONDS / TRAIL_POINTS);
        const sim = new PendulumsSim({
            pivotHeight: PIVOT_HEIGHT,
            length: LENGTH,
            spacing: SPACING,
            mass: MASS,
            restitution: values.restitution,
        });
        useWorld(sim.world);
        const blend = new StepBlend();

        const fixtureMaterial = new MeshStandardMaterial({ color: palette.muted });
        // Each pivot hangs from a post behind the swing, so the bobs pass in front of it.
        const postGeometry = new BoxGeometry(POST, PIVOT_HEIGHT + POST, POST);
        for (const { pivot } of sim.pendulums) {
            const post = new Mesh(postGeometry, fixtureMaterial);
            post.position.set(pivot.position.x, (PIVOT_HEIGHT + POST) / 2, -2 * POST);
            const arm = new Mesh(new BoxGeometry(POST / 2, POST / 2, 2 * POST), fixtureMaterial);
            arm.position.set(pivot.position.x, PIVOT_HEIGHT, -POST);
            root.add(post, arm);
        }

        const linkGeometry = new CylinderGeometry(LINK_RADIUS, LINK_RADIUS, 1, 8);
        const rodMaterial = new MeshStandardMaterial({ color: palette.ink, roughness: 0.6 });
        const tautMaterial = new MeshStandardMaterial({ color: palette.accent, roughness: 0.6 });
        const slackMaterial = new MeshStandardMaterial({ color: palette.muted, roughness: 0.6 });
        const bobGeometry = new SphereGeometry(BOB_RADIUS, 24, 16);

        const specs: readonly PendulumSpec[] = [
            {
                pendulum: sim.rod,
                title: "Rod",
                color: 0,
                tag: () => "rod",
                linkMaterial: () => rodMaterial,
            },
            {
                pendulum: sim.cable,
                title: "Cable",
                color: 1,
                tag: () => (sim.cableSlack() ? "cable · slack" : "cable"),
                linkMaterial: () => (sim.cableSlack() ? slackMaterial : tautMaterial),
            },
        ];
        const views = specs.map((spec) => {
            const bob = new Mesh(
                bobGeometry,
                new MeshStandardMaterial({ color: palette.series[spec.color] }),
            );
            bob.castShadow = true;
            const link = new Strut(linkGeometry, spec.linkMaterial());
            const trail = new Polyline(
                TRAIL_POINTS,
                new LineBasicMaterial({
                    color: palette.series[spec.color],
                    transparent: true,
                    opacity: 0.7,
                }),
            );
            root.add(bob, link, trail);
            return { ...spec, bob, link, trail };
        });

        const kick = (): void => {
            sim.kick(current.speed);
            blend.reset(sim.world.particles);
            for (const { trail } of views) trail.setCount(0);
            trailClock.reset();
        };
        kick();

        return {
            update(next, changed) {
                current = next;
                if (changed.has("restitution")) sim.setRestitution(next.restitution);
                if (changed.has("speed")) kick();
            },
            action(id) {
                if (id === "kick") kick();
            },
            step(dt) {
                blend.remember(sim.world.particles);
                substeps.run(dt, (h) => sim.step(h));
                for (let i = trailClock.advance(dt); i > 0; i--) {
                    for (const { trail, pendulum } of views) trail.append(pendulum.bob.position);
                }
            },
            sync(alpha) {
                blend.blend(alpha);
                for (const { pendulum, bob, link, linkMaterial } of views) {
                    bob.position.copy(blend.positionOf(pendulum.bob));
                    link.place(pendulum.pivot.position, bob.position);
                    link.material = linkMaterial();
                }
            },
            readouts: () => [
                ...views.map(({ pendulum, title, color }) => ({
                    title,
                    color,
                    rows: [
                        {
                            label: "Speed",
                            value: `${formatNumber(pendulum.bob.velocity.magnitude(), 2)} m/s`,
                        },
                        { label: "Angle", value: formatDegrees(sim.angle(pendulum), 0) },
                        {
                            label: "Reach",
                            value: `${formatNumber(sim.reach(pendulum) * 100, 0)} % of length`,
                        },
                        { label: "Energy", value: `${formatNumber(sim.energy(pendulum), 1)} J` },
                    ],
                })),
                {
                    title: "Kick needed",
                    rows: [
                        {
                            label: "Past level, √(2gL)",
                            value: `${formatNumber(sim.levelSpeed(), 2)} m/s`,
                        },
                        {
                            label: "Rod over the top, √(4gL)",
                            value: `${formatNumber(sim.rodLoopSpeed(), 2)} m/s`,
                        },
                        {
                            label: "Cable over the top, √(5gL)",
                            value: `${formatNumber(sim.cableLoopSpeed(), 2)} m/s`,
                        },
                        substeps.readout(),
                    ],
                },
            ],
            callouts: () =>
                views.map(({ bob, tag, color }) => ({ at: bob.position, text: tag(), color })),
        };
    },
});
