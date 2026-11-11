import {
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    DoubleSide,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
    Plane,
    Vector3,
} from "three";
import { Vec3 } from "aether-physics";
import { defineDemo } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { choice, number } from "../../core/params";
import { DragHandle } from "../helpers/drag-handle";
import { substepsFor } from "../helpers/substeps";
import { ClothSim, type PinMode } from "./cloth-sim";

/**
 * A cloth of 324 particles joined by 2,380 `ParticleSpring`s, blown by a wind written as a
 * custom force generator. The demo substeps the world four times per physics step to keep the
 * stiff springs stable. Drag a pin to move the cloth.
 */

const SIZE = 18;
const SPACING = 0.28; // m
const MASS = 0.05; // kg per particle
const TOP = 6.5; // m
const MAX_SUBSTEP = 1 / 240; // s; keeps the stiffest links stable at any physics rate
const PIN_SIZE = 0.22; // m

const _hit = new Vector3();
const _blended = new Vec3();

const params = {
    stiffness: number({
        label: "Stiffness",
        min: 100,
        max: 1000,
        step: 10,
        default: 500,
        unit: " N/m",
    }),
    wind: number({ label: "Wind", min: 0, max: 16, step: 0.5, default: 6, unit: " m/s" }),
    damping: number({ label: "Damping", min: 0.2, max: 1, step: 0.01, default: 0.6 }),
    pins: choice<PinMode>({
        label: "Pinned",
        options: [
            { value: "corners", label: "Corners" },
            { value: "edge", label: "Top edge" },
            { value: "one", label: "One pin" },
        ],
        default: "corners",
    }),
};

export const clothDemo = defineDemo({
    id: "cloth",
    title: "Cloth",
    category: "soft-bodies",
    summary: "A sheet of 324 particles and 2,380 springs, out in the wind.",
    hint: "Choose One pin, then drag it around.",
    params,
    presets: [
        {
            label: "Still air",
            note: "Hanging",
            values: { wind: 0, pins: "corners", stiffness: 500 },
        },
        { label: "Breeze", note: "6 m/s", values: { wind: 6, pins: "corners", stiffness: 500 } },
        {
            label: "Gale",
            note: "14 m/s, top edge",
            values: { wind: 14, pins: "edge", stiffness: 700 },
        },
        { label: "Loose", note: "Soft, one pin", values: { wind: 3, pins: "one", stiffness: 150 } },
    ],
    camera: { position: { x: 5.5, y: 5, z: 11 }, target: { x: 0, y: 3.6, z: 1 } },
    source: "apps/editor/src/demos/soft-bodies/cloth.ts",
    create({ root, view, palette, values }) {
        let current = values;
        let dt = 1 / 60;
        const cloth = new ClothSim({ size: SIZE, spacing: SPACING, mass: MASS, top: TOP });
        const count = cloth.particles.length;
        const previous = new Float32Array(count * 3);

        const positions = new BufferAttribute(new Float32Array(count * 3), 3);
        const surfaceGeometry = new BufferGeometry().setAttribute("position", positions);
        const indices: number[] = [];
        for (let row = 0; row + 1 < SIZE; row++) {
            for (let col = 0; col + 1 < SIZE; col++) {
                const a = row * SIZE + col;
                indices.push(a, a + SIZE, a + 1, a + 1, a + SIZE, a + SIZE + 1);
            }
        }
        surfaceGeometry.setIndex(indices);
        const surface = new Mesh(
            surfaceGeometry,
            new MeshStandardMaterial({ color: palette.accent, side: DoubleSide, roughness: 0.85 }),
        );
        surface.frustumCulled = false;

        const latticeIndices: number[] = [];
        for (const [a, b, rest] of cloth.links) if (rest === SPACING) latticeIndices.push(a, b);
        const latticeGeometry = new BufferGeometry().setAttribute("position", positions);
        latticeGeometry.setIndex(latticeIndices);
        const lattice = new LineSegments(
            latticeGeometry,
            new LineBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.35 }),
        );
        lattice.frustumCulled = false;
        root.add(surface, lattice);

        const pinMaterial = new MeshStandardMaterial({ color: palette.ink });
        const pinMeshes = Array.from({ length: SIZE }, () => {
            const mesh = new Mesh(new BoxGeometry(PIN_SIZE, PIN_SIZE, PIN_SIZE), pinMaterial);
            root.add(mesh);
            return mesh;
        });
        const dragPlane = new Plane(new Vector3(0, 0, 1), 0);
        const drags = pinMeshes.map(
            (mesh, slot) =>
                new DragHandle(view, mesh, (ray) => {
                    const index = [...cloth.pinned][slot];
                    if (index === undefined || !ray.intersectPlane(dragPlane, _hit)) return;
                    cloth.particles[index]!.position.copy(_hit);
                }),
        );

        const remember = (): void => {
            cloth.particles.forEach((p, i) => {
                previous[i * 3] = p.position.x;
                previous[i * 3 + 1] = p.position.y;
                previous[i * 3 + 2] = p.position.z;
            });
        };

        const placePins = (): void => {
            const pinned = [...cloth.pinned];
            pinMeshes.forEach((mesh, slot) => {
                const index = pinned[slot];
                mesh.visible = index !== undefined;
                if (index !== undefined) mesh.position.copy(cloth.particles[index]!.position);
            });
        };

        cloth.setPins(current.pins);
        cloth.setStiffness(current.stiffness);
        cloth.setDamping(current.damping);
        cloth.wind.speed = current.wind;
        remember();

        return {
            update(next, changed) {
                current = next;
                if (changed.has("stiffness")) cloth.setStiffness(current.stiffness);
                if (changed.has("damping")) cloth.setDamping(current.damping);
                if (changed.has("pins")) cloth.setPins(current.pins);
                cloth.wind.speed = current.wind;
            },
            step(stepDt) {
                dt = stepDt;
                remember();
                cloth.step(stepDt, substepsFor(stepDt, MAX_SUBSTEP));
            },
            sync(alpha) {
                cloth.particles.forEach((p, i) => {
                    _blended
                        .set(previous[i * 3]!, previous[i * 3 + 1]!, previous[i * 3 + 2]!)
                        .lerp(p.position, alpha);
                    positions.setXYZ(i, _blended.x, _blended.y, _blended.z);
                });
                positions.needsUpdate = true;
                surfaceGeometry.computeVertexNormals();
                placePins();
            },
            readouts: () => [
                {
                    title: "Cloth",
                    rows: [
                        { label: "Particles", value: String(count) },
                        { label: "Springs", value: String(cloth.links.length * 2) },
                        { label: "Pinned", value: String(cloth.pinned.size) },
                        {
                            label: "Largest stretch",
                            value: `${formatNumber(cloth.maxStretch() * 100, 1)} %`,
                        },
                    ],
                },
                {
                    title: "Stepping",
                    rows: [
                        {
                            label: "Substeps per step",
                            value: String(substepsFor(dt, MAX_SUBSTEP)),
                        },
                        {
                            label: "Link ω·h",
                            value: formatNumber(
                                (Math.sqrt(current.stiffness / MASS) * dt) /
                                    substepsFor(dt, MAX_SUBSTEP),
                                3,
                            ),
                        },
                    ],
                },
            ],
            callouts: () => {
                const pin = [...cloth.pinned].at(-1);
                const hem = cloth.particles[count - Math.ceil(SIZE / 2)]!;
                return [
                    ...(pin === undefined
                        ? []
                        : [{ at: cloth.particles[pin]!.position, text: "drag" }]),
                    {
                        at: hem.position,
                        text: `stretch ${formatNumber(cloth.maxStretch() * 100, 0).trim()}%`,
                        color: 0 as const,
                    },
                ];
            },
            dispose() {
                for (const drag of drags) drag.dispose();
            },
        };
    },
});
