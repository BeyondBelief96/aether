import {
    BoxGeometry,
    CylinderGeometry,
    EdgesGeometry,
    Group,
    LineBasicMaterial,
    LineSegments,
    Matrix4,
    Mesh,
    MeshStandardMaterial,
    Vector3,
} from "three";
import { Particle, ParticleBuoyancy, ParticleSpring, ParticleWorld, Vec3 } from "aether-physics";
import { defineDemo } from "../../core/demo";
import { formatDegrees, formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { substepsFor } from "../helpers/substeps";
import { TapHandle } from "../helpers/tap-handle";

/**
 * A log raft as a two-layer truss of particles: a node on each log, a deck node above it, and
 * `ParticleSpring`s along, across and diagonally through both layers so the raft resists
 * bending. Only the log nodes float, each with its own `ParticleBuoyancy`. A crate hangs on
 * springs from the four deck nodes around it, so its weight bends and tips the raft where it
 * sits. The lake bed is a clamp in the demo.
 */

const GRAVITY = 9.81; // m/s²
const ALONG = 7; // nodes along each log
const LOGS = 5;
const STEP_X = 0.8; // m between nodes along a log
const STEP_Z = 0.75; // m between logs
const LOG_RADIUS = 0.36; // m
const DECK = LOG_RADIUS + 0.1; // m, deck nodes above log nodes
const LOG_VOLUME = Math.PI * LOG_RADIUS ** 2 * STEP_X; // m³ per log node
const DECK_SHARE = 0.5; // deck node mass as a fraction of a log node's
const STIFFNESS = 150000; // N/m, raft springs
const CRATE_SIZE = 0.6; // m
const CRATE_RATE = 400; // N/m of crate spring per kg of crate
const MAX_CRATES = 20;
// s. Crates of 1,500 kg sharing one balsa deck node are the stiffest case; this keeps it stable.
const MAX_SUBSTEP = 1 / 600;
const LAKE_DEPTH = 3.5; // m
const LAKE_WIDTH = 10; // m
const LAKE_LENGTH = 7; // m

const _a = new Vector3();
const _b = new Vector3();
const _up = new Vector3(0, 1, 0);
const _c = new Vector3();
const _basis = new Matrix4();
const _normal = new Vec3();
const _edgeX = new Vec3();
const _edgeZ = new Vec3();
const _blended = new Vec3();

const params = {
    wood: number({
        label: "Wood density",
        min: 150,
        max: 950,
        step: 10,
        default: 500,
        unit: " kg/m³",
    }),
    crate: number({ label: "Crate mass", min: 50, max: 1500, step: 10, default: 400, unit: " kg" }),
    damping: number({ label: "Damping", min: 0.05, max: 1, step: 0.01, default: 0.35 }),
};

interface Crate {
    readonly particle: Particle;
    readonly mesh: Mesh;
    readonly cell: number;
    /** Each spring and the particle it is registered on. */
    readonly springs: readonly [Particle, ParticleSpring][];
}

export const raftDemo = defineDemo({
    id: "raft",
    title: "Raft",
    category: "fluids",
    summary: "Five logs, 70 particles, and as much cargo as you dare.",
    hint: "Stack crates on one corner and watch it tip.",
    params,
    presets: [
        { label: "Balsa", note: "150 kg/m³", values: { wood: 150 } },
        { label: "Pine", note: "500 kg/m³", values: { wood: 500 } },
        { label: "Oak", note: "750 kg/m³", values: { wood: 750 } },
        { label: "Ironwood", note: "950 kg/m³", values: { wood: 950 } },
    ],
    actions: [
        { id: "load", label: "Add crate", key: "a" },
        { id: "unload", label: "Remove crate", key: "u" },
    ],
    camera: { position: { x: 5.2, y: 4.4, z: 7.4 }, target: { x: 0, y: -0.5, z: 0 } },
    hz: 120,
    source: "apps/editor/src/demos/fluids/raft.ts",
    create({ root, view, palette, values, useWorld }) {
        let current = values;
        const world = useWorld(new ParticleWorld());
        world.gravity.set(0, -GRAVITY, 0);
        let seed = 7;
        const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

        // Two layers of nodes, indexed [log][along].
        const makeLayer = (y: number) =>
            Array.from({ length: LOGS }, (_, k) =>
                Array.from({ length: ALONG }, (_, i) => {
                    const p = new Particle();
                    p.position.set(
                        (i - (ALONG - 1) / 2) * STEP_X,
                        y,
                        (k - (LOGS - 1) / 2) * STEP_Z,
                    );
                    world.particles.push(p);
                    return p;
                }),
            );
        const logs = makeLayer(0.2);
        const deck = makeLayer(0.2 + DECK);

        const link = (a: Particle, b: Particle, k: number): [Particle, ParticleSpring][] => {
            const rest = a.position.distanceTo(b.position);
            const onA = new ParticleSpring(b, k, rest);
            const onB = new ParticleSpring(a, k, rest);
            world.forceRegistry.add(a, onA);
            world.forceRegistry.add(b, onB);
            return [
                [a, onA],
                [b, onB],
            ];
        };
        for (const layer of [logs, deck]) {
            for (let k = 0; k < LOGS; k++) {
                for (let i = 0; i < ALONG; i++) {
                    const node = layer[k]![i]!;
                    if (i + 1 < ALONG) link(node, layer[k]![i + 1]!, STIFFNESS);
                    if (k + 1 < LOGS) link(node, layer[k + 1]![i]!, STIFFNESS);
                    if (i + 1 < ALONG && k + 1 < LOGS) {
                        link(node, layer[k + 1]![i + 1]!, STIFFNESS);
                        link(layer[k]![i + 1]!, layer[k + 1]![i]!, STIFFNESS);
                    }
                }
            }
        }
        for (let k = 0; k < LOGS; k++) {
            for (let i = 0; i < ALONG; i++) {
                const log = logs[k]![i]!;
                link(log, deck[k]![i]!, STIFFNESS);
                if (i + 1 < ALONG) link(log, deck[k]![i + 1]!, STIFFNESS);
                if (i > 0) link(log, deck[k]![i - 1]!, STIFFNESS);
                if (k + 1 < LOGS) link(log, deck[k + 1]![i]!, STIFFNESS);
                if (k > 0) link(log, deck[k - 1]![i]!, STIFFNESS);
            }
        }
        const floats = new ParticleBuoyancy(LOG_RADIUS, LOG_VOLUME, 0, 1000, GRAVITY);
        for (const log of logs.flat()) world.forceRegistry.add(log, floats);

        const applyWood = (): void => {
            const logMass = current.wood * LOG_VOLUME;
            for (const log of logs.flat()) log.setMass(logMass);
            for (const node of deck.flat()) node.setMass(logMass * DECK_SHARE);
        };
        const applyDamping = (): void => {
            for (const p of world.particles) p.damping = current.damping;
        };

        // Drawing: log segments between log nodes, beams across the deck, a lake.
        const raft = new Group();
        const unitLog = new CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 1, 18);
        const unitBeam = new BoxGeometry(0.16, 1, 0.12);
        const wood = new MeshStandardMaterial({ color: palette.muted, roughness: 0.8 });
        const beamMaterial = new MeshStandardMaterial({ color: palette.ink, roughness: 0.7 });
        const segments: [Mesh, Particle, Particle][] = [];
        for (let k = 0; k < LOGS; k++) {
            for (let i = 0; i + 1 < ALONG; i++) {
                const mesh = new Mesh(unitLog, wood);
                mesh.castShadow = true;
                segments.push([mesh, logs[k]![i]!, logs[k]![i + 1]!]);
                raft.add(mesh);
            }
        }
        for (let i = 0; i < ALONG; i += 2) {
            for (let k = 0; k + 1 < LOGS; k++) {
                const mesh = new Mesh(unitBeam, beamMaterial);
                mesh.castShadow = true;
                segments.push([mesh, deck[k]![i]!, deck[k + 1]![i]!]);
                raft.add(mesh);
            }
        }
        const lake = new Mesh(
            new BoxGeometry(LAKE_WIDTH, LAKE_DEPTH, LAKE_LENGTH),
            new MeshStandardMaterial({
                color: palette.liquid,
                transparent: true,
                opacity: 0.24,
                depthWrite: false,
            }),
        );
        lake.position.y = -LAKE_DEPTH / 2;
        const outline = new LineSegments(
            new EdgesGeometry(lake.geometry),
            new LineBasicMaterial({ color: palette.muted }),
        );
        outline.position.copy(lake.position);
        const crates = new Group();
        root.add(lake, outline, raft, crates);

        const crateList: Crate[] = [];
        const crateGeometry = new BoxGeometry(CRATE_SIZE, CRATE_SIZE, CRATE_SIZE);
        const crateMaterial = new MeshStandardMaterial({ color: palette.accent, roughness: 0.6 });
        const previous = new Map<Particle, Vec3>();
        for (const p of world.particles) previous.set(p, new Vec3().copy(p.position));

        const cellCorners = (cell: number): [Particle, Particle, Particle, Particle] => {
            const k = Math.floor(cell / (ALONG - 1));
            const i = cell % (ALONG - 1);
            return [deck[k]![i]!, deck[k]![i + 1]!, deck[k + 1]![i]!, deck[k + 1]![i + 1]!];
        };
        const cellCentre = (cell: number, out: Vec3): Vec3 => {
            out.set(0, 0, 0);
            for (const corner of cellCorners(cell)) out.add(corner.position);
            return out.scale(0.25);
        };

        const addCrate = (cell: number): void => {
            if (crateList.length >= MAX_CRATES || crateList.some((c) => c.cell === cell)) return;
            const particle = new Particle();
            particle.setMass(current.crate);
            particle.damping = current.damping;
            const corners = cellCorners(cell);
            // Raised along the deck's normal so it sits on the deck however the raft is tilted.
            cellCentre(cell, particle.position);
            _edgeX.copy(corners[1].position).subtract(corners[0].position);
            _edgeZ.copy(corners[2].position).subtract(corners[0].position);
            _normal.crossVectors(_edgeZ, _edgeX).normalize();
            particle.position.addScaled(_normal, CRATE_SIZE / 2 + 0.06);
            particle.velocity.copy(corners[0].velocity);
            // A raft that has already blown up has no deck to stand on.
            if (!Number.isFinite(particle.position.magnitudeSquared())) return;
            const springs = corners.flatMap((corner) =>
                link(particle, corner, CRATE_RATE * current.crate),
            );
            world.particles.push(particle);
            previous.set(particle, new Vec3().copy(particle.position));
            const mesh = new Mesh(crateGeometry, crateMaterial);
            mesh.castShadow = true;
            crates.add(mesh);
            crateList.push({ particle, mesh, cell, springs });
        };

        const removeCrate = (): void => {
            const crate = crateList.pop();
            if (!crate) return;
            for (const [owner, spring] of crate.springs) world.forceRegistry.remove(owner, spring);
            world.remove(crate.particle);
            previous.delete(crate.particle);
            crates.remove(crate.mesh);
        };

        const freeCells = () => {
            const taken = new Set(crateList.map((c) => c.cell));
            const cells: number[] = [];
            for (let c = 0; c < (ALONG - 1) * (LOGS - 1); c++) if (!taken.has(c)) cells.push(c);
            return cells;
        };

        const tap = new TapHandle(view, raft, (hit) => {
            let best = -1;
            let bestDistance = Infinity;
            const centre = new Vec3();
            for (const cell of freeCells()) {
                const d = cellCentre(cell, centre).distanceTo(hit.point);
                if (d < bestDistance) {
                    bestDistance = d;
                    best = cell;
                }
            }
            if (best >= 0) addCrate(best);
        });

        const totalMass = () => world.particles.reduce((sum, p) => sum + p.mass, 0);
        const cargo = () => crateList.reduce((sum, c) => sum + c.particle.mass, 0);
        const fullBuoyancy = LOGS * ALONG * LOG_VOLUME * 1000; // kg of water displaced when sunk
        const tilt = (): number => {
            _edgeX.copy(deck[0]![ALONG - 1]!.position).subtract(deck[0]![0]!.position);
            _edgeZ.copy(deck[LOGS - 1]![0]!.position).subtract(deck[0]![0]!.position);
            _normal.crossVectors(_edgeZ, _edgeX).normalize();
            return Math.acos(Math.min(1, Math.abs(_normal.y)));
        };
        const freeboard = () => Math.min(...deck.flat().map((p) => p.position.y));

        applyWood();
        applyDamping();

        return {
            update(next, changed) {
                current = next;
                if (changed.has("wood")) applyWood();
                if (changed.has("damping")) applyDamping();
            },
            action(id) {
                if (id === "load") {
                    const cells = freeCells();
                    if (cells.length > 0) addCrate(cells[Math.floor(rand() * cells.length)]!);
                }
                if (id === "unload") removeCrate();
            },
            step(dt) {
                for (const p of world.particles) previous.get(p)?.copy(p.position);
                const n = substepsFor(dt, MAX_SUBSTEP);
                for (let i = 0; i < n; i++) {
                    world.step(dt / n);
                    for (const p of world.particles) {
                        if (p.position.y >= -LAKE_DEPTH + 0.2) continue;
                        p.position.y = -LAKE_DEPTH + 0.2;
                        if (p.velocity.y < 0) p.velocity.y = 0;
                    }
                }
            },
            sync(alpha) {
                const at = (p: Particle, out: Vector3) =>
                    out.copy(_blended.copy(previous.get(p) ?? p.position).lerp(p.position, alpha));
                for (const [mesh, from, to] of segments) {
                    at(from, _a);
                    at(to, _b);
                    const length = _a.distanceTo(_b);
                    mesh.position.addVectors(_a, _b).multiplyScalar(0.5);
                    mesh.scale.set(1, length, 1);
                    mesh.quaternion.setFromUnitVectors(_up, _b.sub(_a).normalize());
                }
                for (const crate of crateList) {
                    at(crate.particle, crate.mesh.position);
                    // Square to the deck cell it stands on.
                    const corners = cellCorners(crate.cell);
                    at(corners[0], _a);
                    at(corners[1], _b).sub(_a).normalize();
                    at(corners[2], _c).sub(_a);
                    _a.crossVectors(_c, _b).normalize();
                    _c.crossVectors(_b, _a);
                    crate.mesh.quaternion.setFromRotationMatrix(_basis.makeBasis(_b, _a, _c));
                }
            },
            readouts() {
                const total = totalMass();
                const spare = fullBuoyancy - total;
                const rim = freeboard();
                return [
                    {
                        title: "Raft",
                        rows: [
                            {
                                label: "Raft mass",
                                value: `${formatNumber(total - cargo(), 0)} kg`,
                            },
                            { label: "Crates", value: `${crateList.length} of ${MAX_CRATES}` },
                            { label: "Cargo", value: `${formatNumber(cargo(), 0)} kg` },
                        ],
                    },
                    {
                        title: "Afloat",
                        color: 0,
                        rows: [
                            {
                                label: "Can still carry",
                                value: spare > 0 ? `${formatNumber(spare, 0)} kg` : "sinking",
                                warn: spare <= 0,
                            },
                            {
                                label: "Deck above water",
                                value: rim > 0 ? `${formatNumber(rim, 2)} m` : "awash",
                                warn: rim <= 0,
                            },
                            { label: "Tilt", value: formatDegrees(tilt()) },
                        ],
                    },
                ];
            },
            dispose() {
                tap.dispose();
            },
        };
    },
});
