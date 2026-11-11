import {
    BoxGeometry,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    Plane,
    SphereGeometry,
    Vector3,
} from "three";
import {
    Particle,
    ParticleAnchoredSpring,
    ParticleWorld,
    Vec3,
    type Vec3Like,
} from "aether-physics";
import { defineDemo } from "../../core/demo";
import { DEG_TO_RAD, formatDegrees, formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { DragHandle } from "../helpers/drag-handle";
import { Polyline } from "../helpers/polyline";
import { SpringCoil } from "../helpers/spring-coil";

/**
 * A bob on a `ParticleAnchoredSpring` under gravity: a pendulum that can also bounce. When the
 * spring's frequency is twice the swing's, energy moves back and forth between the two motions.
 * The chart splits the energy into the bounce (along the spring) and the swing (across it).
 */

const MASS = 1; // kg
const GRAVITY = 9.81; // m/s²
const ANCHOR: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 9, z: 0 });
const START_STRETCH = 0.7; // m past the resting length
const SEED_SPEED = 0.12; // m/s across the swing plane, so the path leaves it
const BOB_RADIUS = 0.3; // m
const TRAIL_POINTS = 1800;
const SAMPLES_PER_SECOND = 30;

const _blended = new Vec3();
const _offset = new Vec3();
const _hit = new Vector3();
const _normal = new Vector3();
const _anchor = new Vector3().copy(ANCHOR);

const params = {
    stiffness: number({
        label: "Stiffness",
        min: 3,
        max: 60,
        step: 0.1,
        default: 9.8,
        unit: " N/m",
    }),
    restLength: number({
        label: "Rest length",
        min: 1.5,
        max: 4,
        step: 0.05,
        default: 3,
        unit: " m",
    }),
    angle: number({ label: "Start angle", min: 0, max: 60, step: 1, default: 6, unit: "°" }),
    damping: number({ label: "Damping", min: 0.9, max: 1, step: 0.005, default: 1, digits: 3 }),
};

export const elasticPendulumDemo = defineDemo({
    id: "elastic-pendulum",
    title: "Elastic pendulum",
    category: "soft-bodies",
    summary: "A weight on a spring that can't decide whether to bounce or swing.",
    hint: "Watch the chart. The energy trades sides every few seconds.",
    params,
    presets: [
        {
            label: "2 : 1",
            note: "Energy trades",
            values: { stiffness: 9.8, restLength: 3, angle: 6 },
        },
        {
            label: "Stiff",
            note: "Mostly swings",
            values: { stiffness: 60, restLength: 3, angle: 25 },
        },
        { label: "Soft", note: "Out of tune", values: { stiffness: 4, restLength: 3, angle: 6 } },
        {
            label: "Wild",
            note: "Starts at 50°",
            values: { stiffness: 9.8, restLength: 3, angle: 50 },
        },
    ],
    actions: [{ id: "release", label: "Release", key: "e" }],
    charts: [
        {
            id: "energy",
            title: "Where the energy is",
            series: [
                { label: "Bounce", color: 0 },
                { label: "Swing", color: 1 },
            ],
            ranges: [
                { label: "0–6 J", min: 0, max: 6, digits: 1 },
                { label: "0–30 J", min: 0, max: 30, digits: 0 },
            ],
            capacity: SAMPLES_PER_SECOND * 20,
            description:
                "Energy in the bounce along the spring and in the swing across it, over the last 20 seconds.",
        },
    ],
    camera: { position: { x: 4, y: 7, z: 13 }, target: { x: 0, y: 5.2, z: 0 } },
    source: "apps/editor/src/demos/soft-bodies/elastic-pendulum.ts",
    create({ root, view, palette, values, plot, clearCharts }) {
        let current = values;
        let sampleTime = 0;
        let held = false;
        const holdAt = new Vec3();

        const world = new ParticleWorld();
        world.gravity.set(0, -GRAVITY, 0);
        const bob = new Particle();
        bob.setMass(MASS);
        world.particles.push(bob);
        const previous = new Vec3();
        let spring = new ParticleAnchoredSpring(ANCHOR, 0, 0);

        const anchorBlock = new Mesh(
            new BoxGeometry(0.5, 0.5, 0.5),
            new MeshStandardMaterial({ color: palette.ink }),
        );
        anchorBlock.position.copy(ANCHOR);
        const bobMesh = new Mesh(
            new SphereGeometry(BOB_RADIUS, 32, 16),
            new MeshStandardMaterial({ color: palette.ink }),
        );
        const coil = new SpringCoil(new LineBasicMaterial({ color: palette.muted }), 16, 0.18);
        const trail = new Polyline(
            TRAIL_POINTS,
            new LineBasicMaterial({ color: palette.series[0] }),
        );
        root.add(anchorBlock, bobMesh, coil, trail);

        // Ring buffer of recent positions, copied into the trail in order when it changes.
        const ring = new Float32Array(TRAIL_POINTS * 3);
        let ringStart = 0;
        let ringCount = 0;
        let trailDirty = false;
        const clearTrail = (): void => {
            ringStart = 0;
            ringCount = 0;
            trail.setCount(0);
        };
        const record = (p: Vec3Like): void => {
            const slot = ((ringStart + ringCount) % TRAIL_POINTS) * 3;
            ring[slot] = p.x;
            ring[slot + 1] = p.y;
            ring[slot + 2] = p.z;
            if (ringCount < TRAIL_POINTS) ringCount++;
            else ringStart = (ringStart + 1) % TRAIL_POINTS;
            trailDirty = true;
        };
        const drawTrail = (): void => {
            if (!trailDirty) return;
            for (let i = 0; i < ringCount; i++) {
                const slot = ((ringStart + i) % TRAIL_POINTS) * 3;
                _offset.set(ring[slot]!, ring[slot + 1]!, ring[slot + 2]!);
                trail.setPoint(i, _offset);
            }
            trail.setCount(ringCount);
            trailDirty = false;
        };

        const restingLength = () => current.restLength + (MASS * GRAVITY) / current.stiffness;
        const springFrequency = () => Math.sqrt(current.stiffness / MASS);
        const swingFrequency = () => Math.sqrt(GRAVITY / restingLength());

        const rebuildForce = (): void => {
            world.forceRegistry.clear();
            spring = new ParticleAnchoredSpring(ANCHOR, current.stiffness, current.restLength);
            world.forceRegistry.add(bob, spring);
        };

        /** Pulls the bob down past its resting length, out to the start angle, and lets go. */
        const release = (): void => {
            const angle = current.angle * DEG_TO_RAD;
            const length = restingLength() + START_STRETCH;
            bob.position.set(
                ANCHOR.x + length * Math.sin(angle),
                ANCHOR.y - length * Math.cos(angle),
                ANCHOR.z,
            );
            bob.velocity.set(0, 0, SEED_SPEED);
            bob.clearAccumulator();
            previous.copy(bob.position);
            clearTrail();
            clearCharts();
            sampleTime = 0;
        };

        /** Energy in the bounce and in the swing, measured about the resting point. */
        const energies = (): [number, number] => {
            _offset.copy(bob.position).subtract(ANCHOR);
            const length = _offset.magnitude();
            _offset.scale(1 / length);
            const radial = bob.velocity.dot(_offset);
            const across = bob.velocity.magnitudeSquared() - radial * radial;
            const rest = restingLength();
            const bounce =
                0.5 * MASS * radial * radial + 0.5 * current.stiffness * (length - rest) ** 2;
            const swing = 0.5 * MASS * across + MASS * GRAVITY * rest * (1 + _offset.y);
            return [bounce, swing];
        };

        const swingAngle = () => {
            _offset.copy(bob.position).subtract(ANCHOR).normalize();
            return Math.acos(Math.min(1, Math.max(-1, -_offset.y)));
        };

        const dragPlane = new Plane();
        const drag = new DragHandle(
            view,
            bobMesh,
            (ray) => {
                // A vertical plane through the anchor, facing the camera.
                _normal.copy(view.camera.position).sub(_anchor).setY(0);
                if (_normal.lengthSq() === 0) _normal.set(0, 0, 1);
                dragPlane.setFromNormalAndCoplanarPoint(_normal.normalize(), _anchor);
                if (!ray.intersectPlane(dragPlane, _hit)) return;
                holdAt.copy(_hit);
                if (!held) clearTrail();
                held = true;
            },
            () => {
                held = false;
                bob.velocity.set(0, 0, 0);
                clearCharts();
            },
        );

        bob.damping = current.damping;
        rebuildForce();
        release();

        return {
            update(next, changed) {
                current = next;
                if (changed.has("stiffness") || changed.has("restLength")) rebuildForce();
                if (changed.has("damping")) bob.damping = current.damping;
                if (changed.has("angle")) release();
            },
            action(id) {
                if (id === "release") release();
            },
            step(dt) {
                previous.copy(bob.position);
                world.step(dt);
                if (held) {
                    bob.position.copy(holdAt);
                    bob.velocity.set(0, 0, 0);
                    return;
                }
                record(bob.position);
                sampleTime += dt;
                while (sampleTime >= 1 / SAMPLES_PER_SECOND) {
                    plot("energy", energies());
                    sampleTime -= 1 / SAMPLES_PER_SECOND;
                }
            },
            sync(alpha) {
                _blended.copy(previous).lerp(bob.position, alpha);
                bobMesh.position.copy(_blended);
                coil.update(ANCHOR, _blended);
                drawTrail();
            },
            readouts() {
                const [bounce, swing] = energies();
                const ratio = springFrequency() / swingFrequency();
                return [
                    {
                        title: "Tuning",
                        rows: [
                            {
                                label: "Spring ω",
                                value: `${formatNumber(springFrequency(), 2)} rad/s`,
                            },
                            {
                                label: "Swing ω",
                                value: `${formatNumber(swingFrequency(), 2)} rad/s`,
                            },
                            {
                                label: "Ratio",
                                value: `${formatNumber(ratio, 2)} : 1`,
                                warn: Math.abs(ratio - 2) > 0.15,
                            },
                        ],
                    },
                    {
                        title: "Bounce",
                        color: 0,
                        rows: [
                            {
                                label: "Stretch",
                                value: `${formatNumber(bob.position.distanceTo(ANCHOR) - current.restLength, 2)} m`,
                            },
                            { label: "Energy", value: `${formatNumber(bounce, 2)} J` },
                        ],
                    },
                    {
                        title: "Swing",
                        color: 1,
                        rows: [
                            { label: "Angle", value: formatDegrees(swingAngle()) },
                            { label: "Energy", value: `${formatNumber(swing, 2)} J` },
                        ],
                    },
                ];
            },
            callouts: () => [
                {
                    at: bobMesh.position,
                    text: held ? "let go" : "drag me",
                    color: 0,
                },
            ],
            dispose() {
                drag.dispose();
            },
        };
    },
});
