import { BoxGeometry, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { Vec3 } from "aether-physics";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number, toggle } from "../../core/params";
import { BreakSim, MAX_ROWS } from "./break-sim";

/**
 * A cue ball fired into a rack of touching balls. Every contact (table, cushions and ball pairs)
 * goes through the engine's worst-first resolver, which spends each iteration on the contact
 * closing fastest. With too few iterations the budget goes to the balls resting on the table,
 * and overlapping pairs are never pushed apart. A square hit on a perfect rack of frictionless
 * balls sends almost all the energy to the back corners, so the default aim is off centre.
 */

const RADIUS = 0.18; // m
const HALF_LENGTH = 4; // m
const HALF_WIDTH = 2; // m
const CUSHION = 0.2; // m, thickness and height
const OVERLAP_WARNING = 0.01; // m

const _blended = new Vec3();

const params = {
    speed: number({ label: "Cue speed", min: 2, max: 20, step: 0.5, default: 10, unit: " m/s" }),
    aim: number({ label: "Aim", min: -5, max: 5, step: 0.1, default: 1, unit: "°" }),
    restitution: number({ label: "Restitution", min: 0, max: 1, step: 0.01, default: 0.95 }),
    damping: number({ label: "Rolling damping", min: 0.1, max: 1, step: 0.01, default: 0.6 }),
    rows: number({ label: "Rack rows", min: 1, max: MAX_ROWS, step: 1, default: 5 }),
    auto: toggle({ label: "Auto iterations", default: true }),
    iterations: number({
        label: "Iterations",
        min: 1,
        max: 200,
        step: 1,
        default: 20,
        hidden: (values) => values.auto === true,
    }),
};

export const breakDemo = defineDemo({
    id: "break",
    title: "Break",
    category: "collisions",
    summary: "A cue ball fired into a rack of fifteen, resolved one contact at a time.",
    hint: "Try Starved. The resolver runs out of iterations and balls stay fused together.",
    params,
    presets: [
        { label: "Clean break", note: "2× contacts", values: { auto: true, restitution: 0.95 } },
        {
            label: "Starved",
            note: "10 iterations",
            values: { auto: false, iterations: 10, restitution: 0.95 },
        },
        { label: "Soft balls", note: "e = 0.4", values: { auto: true, restitution: 0.4 } },
        { label: "Low rate", note: "15 Hz", values: { auto: true, restitution: 0.95 }, hz: 15 },
    ],
    actions: [{ id: "break", label: "Break", key: "b" }],
    camera: { position: { x: -5.5, y: 7, z: 6.5 }, target: { x: 0.3, y: 0, z: 0 } },
    source: "apps/editor/src/demos/collisions/break.ts",
    create({ root, palette, values, useWorld }) {
        let current = values;
        const iterationsFor = (v: typeof values) => (v.auto ? undefined : v.iterations);
        const sim = new BreakSim({
            radius: RADIUS,
            halfLength: HALF_LENGTH,
            halfWidth: HALF_WIDTH,
            rows: values.rows,
            restitution: values.restitution,
            damping: values.damping,
            iterations: iterationsFor(values),
        });
        useWorld(sim.world);

        const cushionMaterial = new MeshStandardMaterial({ color: palette.muted });
        const long = new BoxGeometry(2 * (HALF_LENGTH + CUSHION), CUSHION, CUSHION);
        const short = new BoxGeometry(CUSHION, CUSHION, 2 * HALF_WIDTH);
        for (const sign of [-1, 1]) {
            const side = new Mesh(long, cushionMaterial);
            side.position.set(0, CUSHION / 2, sign * (HALF_WIDTH + CUSHION / 2));
            const end = new Mesh(short, cushionMaterial);
            end.position.set(sign * (HALF_LENGTH + CUSHION / 2), CUSHION / 2, 0);
            root.add(side, end);
        }

        const ballGeometry = new SphereGeometry(RADIUS, 32, 16);
        const cueMaterial = new MeshStandardMaterial({ color: palette.ink });
        const rackMaterials = palette.series.map((color) => new MeshStandardMaterial({ color }));
        const meshes: Mesh[] = [];
        const previous: Vec3[] = [];

        /** Matches the meshes to the balls on the table and snaps them into place. */
        const syncMeshes = (): void => {
            while (meshes.length > sim.particles.length) root.remove(meshes.pop()!);
            while (meshes.length < sim.particles.length) {
                const i = meshes.length;
                const material = i === 0 ? cueMaterial : rackMaterials[(i - 1) % 4]!;
                const mesh = new Mesh(ballGeometry, material);
                mesh.castShadow = true;
                meshes.push(mesh);
                previous.push(new Vec3());
                root.add(mesh);
            }
            sim.particles.forEach((p, i) => previous[i]!.copy(p.position));
        };

        const shoot = (): void => {
            sim.rack(current.rows);
            sim.shoot(current.speed, (current.aim * Math.PI) / 180);
            syncMeshes();
        };
        shoot();

        return {
            update(next, changed) {
                current = next;
                if (changed.has("restitution")) sim.setRestitution(next.restitution);
                if (changed.has("damping")) sim.setDamping(next.damping);
                if (changed.has("auto") || changed.has("iterations")) {
                    useWorld(sim.setIterations(iterationsFor(next)));
                }
                if (changed.has("rows")) shoot();
            },
            action(id) {
                if (id === "break") shoot();
            },
            step(dt) {
                sim.particles.forEach((p, i) => previous[i]!.copy(p.position));
                sim.step(dt);
            },
            sync(alpha) {
                sim.particles.forEach((p, i) => {
                    _blended.copy(previous[i]!).lerp(p.position, alpha);
                    meshes[i]!.position.copy(_blended);
                });
            },
            readouts: () => {
                const { world } = sim;
                const resolver = world.contactResolver;
                const limit = resolver.iterations ?? 2 * world.contactCount;
                const overlap = sim.deepestOverlap();
                return [
                    {
                        title: "Resolver",
                        color: 0,
                        rows: [
                            { label: "Contacts", value: String(world.contactCount) },
                            { label: "Peak contacts", value: String(sim.peakContacts) },
                            {
                                label: "Iterations",
                                value: `${resolver.iterationsUsed} of ${limit}`,
                                warn: resolver.iterationsUsed >= limit && limit > 0,
                            },
                        ],
                    },
                    {
                        title: "Table",
                        color: 1,
                        rows: [
                            { label: "Balls", value: String(sim.particles.length) },
                            {
                                label: "Kinetic energy",
                                value: `${formatNumber(sim.kineticEnergy(), 2)} J`,
                            },
                            {
                                label: "Deepest overlap",
                                value: `${formatNumber(Math.max(overlap, 0) * 1000, 0)} mm`,
                                warn: overlap > OVERLAP_WARNING,
                            },
                        ],
                    },
                ];
            },
            callouts: () => [{ at: meshes[0]!.position, text: "cue", color: 0 as SeriesIndex }],
        };
    },
});
