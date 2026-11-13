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
import type { Particle } from "aether-physics";
import { defineDemo } from "../../core/demo";
import { formatDegrees, formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { StepBlend } from "../helpers/step-blend";
import { Strut } from "../helpers/strut";
import { Substeps } from "../helpers/substeps";
import { TapHandle } from "../helpers/tap-handle";
import { RaftSim } from "./raft-sim";

/**
 * A raft of logs and springs floating on `ParticleBuoyancy` (see `RaftSim`). Tap the deck to
 * set a crate where you tapped; each crate hangs on springs from the four deck nodes around it,
 * so its weight bends and tips the raft.
 */

const GRAVITY = 9.81; // m/s²
const ALONG = 7; // nodes along each log
const LOGS = 5;
const STEP_X = 0.8; // m between nodes along a log
const STEP_Z = 0.75; // m between logs
const LOG_RADIUS = 0.36; // m
const DECK = LOG_RADIUS + 0.1; // m, deck nodes above log nodes
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
const _c = new Vector3();
const _basis = new Matrix4();

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

export const raftDemo = defineDemo({
    id: "raft",
    title: "Raft",
    category: "springs",
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
    source: "apps/editor/src/demos/springs/raft.ts",
    create({ root, view, palette, values, useWorld }) {
        let current = values;
        const substeps = new Substeps(MAX_SUBSTEP);
        const sim = new RaftSim({
            along: ALONG,
            logs: LOGS,
            stepX: STEP_X,
            stepZ: STEP_Z,
            logRadius: LOG_RADIUS,
            deck: DECK,
            deckShare: DECK_SHARE,
            stiffness: STIFFNESS,
            crateRate: CRATE_RATE,
            crateSize: CRATE_SIZE,
            maxCrates: MAX_CRATES,
            lakeDepth: LAKE_DEPTH,
            gravity: GRAVITY,
            wood: values.wood,
            damping: values.damping,
        });
        useWorld(sim.world);
        const { logs, deck } = sim;
        let seed = 7;
        const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

        // Drawing: log segments between log nodes, beams across the deck, a lake.
        const raft = new Group();
        const unitLog = new CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 1, 18);
        const unitBeam = new BoxGeometry(0.16, 1, 0.12);
        const wood = new MeshStandardMaterial({ color: palette.muted, roughness: 0.8 });
        const beamMaterial = new MeshStandardMaterial({ color: palette.ink, roughness: 0.7 });
        const segments: [Strut, Particle, Particle][] = [];
        for (let k = 0; k < LOGS; k++) {
            for (let i = 0; i + 1 < ALONG; i++) {
                const strut = new Strut(unitLog, wood);
                segments.push([strut, logs[k]![i]!, logs[k]![i + 1]!]);
                raft.add(strut);
            }
        }
        for (let i = 0; i < ALONG; i += 2) {
            for (let k = 0; k + 1 < LOGS; k++) {
                const strut = new Strut(unitBeam, beamMaterial);
                segments.push([strut, deck[k]![i]!, deck[k + 1]![i]!]);
                raft.add(strut);
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

        /** One mesh per crate on the deck, in the same order as `sim.crates`. */
        const crateMeshes: Mesh[] = [];
        const crateGeometry = new BoxGeometry(CRATE_SIZE, CRATE_SIZE, CRATE_SIZE);
        const crateMaterial = new MeshStandardMaterial({ color: palette.accent, roughness: 0.6 });
        const blend = new StepBlend();
        blend.remember(sim.world.particles);

        const addCrate = (cell: number): void => {
            if (!sim.addCrate(cell, current.crate)) return;
            const mesh = new Mesh(crateGeometry, crateMaterial);
            mesh.castShadow = true;
            crates.add(mesh);
            crateMeshes.push(mesh);
        };

        const removeCrate = (): void => {
            const crate = sim.removeCrate();
            if (!crate) return;
            blend.forget(crate.particle);
            crates.remove(crateMeshes.pop()!);
        };

        const tap = new TapHandle(view, raft, (hit) => {
            const cell = sim.nearestFreeCell(hit.point);
            if (cell !== undefined) addCrate(cell);
        });

        return {
            update(next, changed) {
                current = next;
                if (changed.has("wood")) sim.setWood(next.wood);
                if (changed.has("damping")) sim.setDamping(next.damping);
            },
            action(id) {
                if (id === "load") {
                    const cells = sim.freeCells();
                    if (cells.length > 0) addCrate(cells[Math.floor(rand() * cells.length)]!);
                }
                if (id === "unload") removeCrate();
            },
            step(dt) {
                blend.remember(sim.world.particles);
                substeps.run(dt, (h) => sim.step(h));
            },
            sync(alpha) {
                blend.blend(alpha);
                const at = (p: Particle, out: Vector3) => out.copy(blend.positionOf(p));
                for (const [strut, from, to] of segments) strut.place(at(from, _a), at(to, _b));
                sim.crates.forEach((crate, n) => {
                    const mesh = crateMeshes[n]!;
                    at(crate.particle, mesh.position);
                    // Square to the deck cell it stands on.
                    const corners = sim.cellCorners(crate.cell);
                    at(corners[0], _a);
                    at(corners[1], _b).sub(_a).normalize();
                    at(corners[2], _c).sub(_a);
                    _a.crossVectors(_c, _b).normalize();
                    _c.crossVectors(_b, _a);
                    mesh.quaternion.setFromRotationMatrix(_basis.makeBasis(_b, _a, _c));
                });
            },
            readouts() {
                const total = sim.totalMass();
                const cargo = sim.cargo();
                const spare = sim.fullBuoyancy() - total;
                const rim = sim.freeboard();
                return [
                    {
                        title: "Raft",
                        rows: [
                            { label: "Raft mass", value: `${formatNumber(total - cargo, 0)} kg` },
                            { label: "Crates", value: `${sim.crates.length} of ${MAX_CRATES}` },
                            { label: "Cargo", value: `${formatNumber(cargo, 0)} kg` },
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
                            { label: "Tilt", value: formatDegrees(sim.tilt()) },
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
