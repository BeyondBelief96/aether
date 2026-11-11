import {
    BoxGeometry,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    Plane,
    SphereGeometry,
    Vector3,
    type Group,
} from "three";
import {
    Particle,
    ParticleAnchoredSpring,
    ParticleBungee,
    ParticleSpring,
    ParticleWorld,
    Vec3,
    type ParticleForceGenerator,
    type Vec3Like,
} from "aether-physics";
import { defineDemo } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { DragHandle } from "../helpers/drag-handle";
import { Polyline } from "../helpers/polyline";
import { SpringCoil } from "../helpers/spring-coil";
import { VectorArrow } from "../helpers/vector-arrow";

/**
 * The three particle springs side by side, sharing one stiffness and rest length. Left: a bob
 * on a `ParticleAnchoredSpring` whose anchor can be dragged. Middle: two floating particles
 * joined by a `ParticleSpring` on each end, so their total momentum stays zero. Right: a
 * `ParticleBungee` that pulls only while stretched. Arrows show each generator's force.
 */

const MASS = 1; // kg
const ANCHORED_X = -6; // m
const PAIR_X = 0; // m
const BUNGEE_X = 6; // m
const TOP = 7; // m
const PAIR_HEIGHT = 4; // m
const PAIR_SPIN_SPEED = 1.5; // m/s
const BOB_RADIUS = 0.35; // m
const FORCE_ARROW_SCALE = 0.04; // m of arrow per N
const MAX_ARROW_FORCE = 100; // N

const ANCHOR_START: Readonly<Vec3Like> = Object.freeze({ x: ANCHORED_X, y: TOP, z: 0 });
const BUNGEE_TOP: Readonly<Vec3Like> = Object.freeze({ x: BUNGEE_X, y: TOP, z: 0 });

const _blended = new Vec3();
const _force = new Vec3();
const _momentum = new Vec3();
const _hit = new Vector3();
const _probe = new Particle();

const params = {
    stiffness: number({ label: "Stiffness", min: 2, max: 200, step: 1, default: 20, unit: " N/m" }),
    restLength: number({
        label: "Rest length",
        min: 0.5,
        max: 4,
        step: 0.05,
        default: 2,
        unit: " m",
    }),
    damping: number({ label: "Damping", min: 0.5, max: 1, step: 0.01, default: 0.9 }),
};

/** The force `generator` applies to `particle`, measured on a stand-in so nothing changes. */
function forceOn(particle: Particle, generator: ParticleForceGenerator): Vec3 {
    _probe.position.copy(particle.position);
    _probe.velocity.copy(particle.velocity);
    _probe.inverseMass = particle.inverseMass;
    _probe.clearAccumulator();
    generator.updateForce(_probe, 0);
    return _force.copy(_probe.forceAccum);
}

class Body {
    readonly particle = new Particle();
    readonly previous = new Vec3();
    readonly mesh: Mesh;
    readonly arrow: VectorArrow;

    constructor(color: number, arrowColor: number, root: Group) {
        this.particle.setMass(MASS);
        this.mesh = new Mesh(
            new SphereGeometry(BOB_RADIUS, 24, 16),
            new MeshStandardMaterial({ color }),
        );
        this.arrow = new VectorArrow(arrowColor);
        root.add(this.mesh, this.arrow);
    }

    place(position: Vec3Like, velocity: Vec3Like = { x: 0, y: 0, z: 0 }): void {
        this.particle.position.copy(position);
        this.particle.velocity.copy(velocity);
        this.particle.clearAccumulator();
        this.previous.copy(position);
    }

    blend(alpha: number): Vector3 {
        _blended.copy(this.previous).lerp(this.particle.position, alpha);
        return this.mesh.position.copy(_blended);
    }

    drawForce(generator: ParticleForceGenerator): void {
        const force = forceOn(this.particle, generator);
        const magnitude = force.magnitude();
        if (magnitude > MAX_ARROW_FORCE) force.scale(MAX_ARROW_FORCE / magnitude);
        this.arrow.update(this.mesh.position, force, FORCE_ARROW_SCALE);
    }
}

export const springsDemo = defineDemo({
    id: "springs",
    title: "Springs",
    category: "forces",
    summary:
        "An anchored spring you can drag, a floating pair joined by a spring on each end, " +
        "and a bungee that only pulls. Arrows show each spring's force.",
    hint: "Drag the left anchor block around, then choose Stiff.",
    params,
    presets: [
        { label: "Soft", note: "8 N/m", values: { stiffness: 8, restLength: 2, damping: 0.9 } },
        {
            label: "Default",
            note: "20 N/m",
            values: { stiffness: 20, restLength: 2, damping: 0.9 },
        },
        {
            label: "Stiff",
            note: "150 N/m",
            values: { stiffness: 150, restLength: 2, damping: 0.9 },
        },
        {
            label: "Undamped",
            note: "Keeps ringing",
            values: { stiffness: 30, restLength: 1.5, damping: 1 },
        },
    ],
    camera: { position: { x: -4.6, y: 5.6, z: 14 }, target: { x: -4.6, y: 4.6, z: 0 } },
    source: "apps/editor/src/demos/forces/springs.ts",
    create({ root, view, palette, values }) {
        let current = values;
        let dt = 1 / 60;
        const world = new ParticleWorld();
        const [anchoredColor, pairColor, bungeeColor] = palette.series;

        const block = () =>
            new Mesh(
                new BoxGeometry(0.5, 0.5, 0.5),
                new MeshStandardMaterial({ color: palette.ink }),
            );
        const anchorBlock = block();
        anchorBlock.position.copy(ANCHOR_START);
        const anchoredBob = new Body(anchoredColor, palette.ink, root);
        const anchoredCoil = new SpringCoil(new LineBasicMaterial({ color: anchoredColor }));

        const pairA = new Body(pairColor, palette.ink, root);
        const pairB = new Body(pairColor, palette.ink, root);
        const pairCoil = new SpringCoil(new LineBasicMaterial({ color: pairColor }));
        pairA.particle.gravityScale = 0;
        pairB.particle.gravityScale = 0;

        const bungeeTop = new Particle();
        bungeeTop.setMass(Infinity);
        bungeeTop.position.copy(BUNGEE_TOP);
        const jumper = new Body(bungeeColor, palette.ink, root);
        const ropeMaterial = new LineBasicMaterial({ color: palette.muted });
        const rope = new Polyline(2, ropeMaterial);
        rope.setCount(2);
        const bungeeBlock = block();
        bungeeBlock.position.copy(BUNGEE_TOP);

        root.add(anchorBlock, anchoredCoil, pairCoil, bungeeBlock, rope);
        const bodies = [anchoredBob, pairA, pairB, jumper];
        for (const body of bodies) world.particles.push(body.particle);

        let anchored = new ParticleAnchoredSpring(ANCHOR_START, 0, 0);
        let springOnA = new ParticleSpring(pairB.particle, 0, 0);
        let springOnB = new ParticleSpring(pairA.particle, 0, 0);
        let bungee = new ParticleBungee(bungeeTop, 0, 0);

        // Generators keep their parameters fixed, so new values mean new generators.
        const rebuildForces = (): void => {
            const { stiffness: k, restLength: rest } = current;
            world.forceRegistry.clear();
            anchored = new ParticleAnchoredSpring(anchored.anchor, k, rest);
            springOnA = new ParticleSpring(pairB.particle, k, rest);
            springOnB = new ParticleSpring(pairA.particle, k, rest);
            bungee = new ParticleBungee(bungeeTop, k, rest);
            world.forceRegistry.add(anchoredBob.particle, anchored);
            world.forceRegistry.add(pairA.particle, springOnA);
            world.forceRegistry.add(pairB.particle, springOnB);
            world.forceRegistry.add(jumper.particle, bungee);
        };

        const applyDamping = (): void => {
            for (const particle of world.particles) particle.damping = current.damping;
        };

        rebuildForces();
        anchoredBob.place({ x: ANCHORED_X + 1.5, y: TOP - 1, z: 0 });
        // Stretched past rest length and spinning, so it both oscillates and turns.
        const half = (current.restLength + 1) / 2;
        pairA.place(
            { x: PAIR_X - half, y: PAIR_HEIGHT, z: 0 },
            { x: 0, y: -PAIR_SPIN_SPEED, z: 0 },
        );
        pairB.place({ x: PAIR_X + half, y: PAIR_HEIGHT, z: 0 }, { x: 0, y: PAIR_SPIN_SPEED, z: 0 });
        // Starts just below its fixed end, so it falls slack, then swings.
        jumper.place({ x: BUNGEE_X + 0.5, y: TOP - 0.3, z: 0 });
        applyDamping();

        const dragPlane = new Plane(new Vector3(0, 0, 1), 0);
        const drag = new DragHandle(view, anchorBlock, (ray) => {
            if (ray.intersectPlane(dragPlane, _hit)) anchored.anchor.copy(_hit);
        });

        const jumperStretch = () =>
            jumper.particle.position.distanceTo(bungeeTop.position) - current.restLength;

        return {
            update(next, changed) {
                current = next;
                if (changed.has("stiffness") || changed.has("restLength")) rebuildForces();
                if (changed.has("damping")) applyDamping();
            },
            step(stepDt) {
                dt = stepDt;
                for (const body of bodies) body.previous.copy(body.particle.position);
                world.step(stepDt);
            },
            sync(alpha) {
                anchorBlock.position.copy(anchored.anchor);
                anchoredCoil.update(anchored.anchor, anchoredBob.blend(alpha));
                anchoredBob.drawForce(anchored);
                pairCoil.update(pairA.blend(alpha), pairB.blend(alpha));
                pairA.drawForce(springOnA);
                pairB.drawForce(springOnB);
                const end = jumper.blend(alpha);
                rope.setPoint(0, bungeeTop.position);
                rope.setPoint(1, end);
                ropeMaterial.color.setHex(
                    bungeeTop.position.distanceTo(end) > current.restLength
                        ? bungeeColor
                        : palette.muted,
                );
                jumper.drawForce(bungee);
            },
            readouts() {
                const omega = Math.sqrt(current.stiffness / MASS);
                const pairLength = pairA.particle.position.distanceTo(pairB.particle.position);
                _momentum
                    .copy(pairA.particle.velocity)
                    .scale(MASS)
                    .addScaled(pairB.particle.velocity, MASS);
                const stretch = jumperStretch();
                return [
                    {
                        title: "Anchored spring",
                        color: 0,
                        rows: [
                            {
                                label: "Stretch",
                                value: `${formatNumber(anchoredBob.particle.position.distanceTo(anchored.anchor) - current.restLength, 2)} m`,
                            },
                            {
                                label: "Force",
                                value: `${formatNumber(forceOn(anchoredBob.particle, anchored).magnitude(), 2)} N`,
                            },
                            { label: "ω·dt", value: formatNumber(omega * dt, 2) },
                        ],
                    },
                    {
                        title: "Spring pair",
                        color: 1,
                        rows: [
                            {
                                label: "Stretch",
                                value: `${formatNumber(pairLength - current.restLength, 2)} m`,
                            },
                            {
                                label: "Total momentum",
                                value: `${formatNumber(_momentum.magnitude(), 2)} kg·m/s`,
                            },
                            // Each end sees twice the stiffness about the fixed centre of mass.
                            { label: "ω·dt", value: formatNumber(Math.SQRT2 * omega * dt, 2) },
                        ],
                    },
                    {
                        title: "Bungee",
                        color: 2,
                        rows: [
                            {
                                label: "Stretch",
                                value: stretch > 0 ? `${formatNumber(stretch, 2)} m` : "slack",
                            },
                            {
                                label: "Force",
                                value: `${formatNumber(forceOn(jumper.particle, bungee).magnitude(), 2)} N`,
                            },
                        ],
                    },
                ];
            },
            callouts: () => [
                { at: anchorBlock.position, text: "drag me", color: 0 },
                {
                    at: pairA.mesh.position,
                    text: `p ${formatNumber(_momentum.copy(pairA.particle.velocity).add(pairB.particle.velocity).scale(MASS).magnitude(), 2).trim()}`,
                    color: 1,
                },
                {
                    at: jumper.mesh.position,
                    text: jumperStretch() > 0 ? "taut" : "slack",
                    color: 2,
                },
            ],
            dispose() {
                drag.dispose();
            },
        };
    },
});
