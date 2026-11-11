import {
    BoxGeometry,
    CylinderGeometry,
    EdgesGeometry,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
    Plane,
    Vector3,
    type BufferGeometry,
} from "three";
import { Particle, ParticleBuoyancy, ParticleWorld, Vec3, type Vec3Like } from "aether-physics";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { DragHandle } from "../helpers/drag-handle";

/**
 * Three liquids stacked in a tank and four objects that settle at the layer matching their
 * density. Pressure from stacked liquids adds up, so each object carries one
 * `ParticleBuoyancy` per layer: the top layer at its own density, and each layer below at the
 * difference between it and the layer above. Every object is an upright prism, which makes the
 * generator's linear submerged fraction exact. The tank floor is a clamp in the demo.
 */

const GRAVITY = 9.81; // m/s²
const LAYER = 2; // m, depth of each liquid
const FLOOR = 0; // m
const TANK_WIDTH = 7.5; // m
const TANK_DEPTH = 2.5; // m
const DROP_HEIGHT = 8; // m
const SURFACES = [FLOOR + LAYER, FLOOR + 2 * LAYER, FLOOR + 3 * LAYER] as const; // bottom first

interface Shape {
    readonly name: string;
    readonly density: number; // kg/m³
    readonly height: number; // m
    readonly volume: number; // m³
    readonly geometry: () => BufferGeometry;
}

const prismVolume = (radius: number, height: number, sides: number) =>
    // A regular prism's volume, so the hexagonal nut is measured as drawn.
    0.5 * sides * radius * radius * Math.sin((2 * Math.PI) / sides) * height;

const SHAPES: readonly Shape[] = [
    {
        name: "Cork",
        density: 240,
        height: 0.5,
        volume: prismVolume(0.4, 0.5, 48),
        geometry: () => new CylinderGeometry(0.4, 0.4, 0.5, 48),
    },
    {
        name: "Plastic",
        density: 950,
        height: 0.7,
        volume: 0.7 ** 3,
        geometry: () => new BoxGeometry(0.7, 0.7, 0.7),
    },
    {
        name: "Rubber",
        density: 1150,
        height: 0.4,
        volume: 0.9 * 0.4 * 0.6,
        geometry: () => new BoxGeometry(0.9, 0.4, 0.6),
    },
    {
        name: "Steel",
        density: 7850,
        height: 0.4,
        volume: prismVolume(0.45, 0.4, 6),
        geometry: () => new CylinderGeometry(0.45, 0.45, 0.4, 6),
    },
];

const _blended = new Vec3();
const _hit = new Vector3();
const _probe = new Particle();
const dragPlane = new Plane(new Vector3(0, 0, 1), 0);

const params = {
    top: number({
        label: "Top layer",
        min: 700,
        max: 1000,
        step: 5,
        default: 920,
        unit: " kg/m³",
    }),
    middle: number({
        label: "Middle layer",
        min: 1000,
        max: 1400,
        step: 5,
        default: 1000,
        unit: " kg/m³",
    }),
    bottom: number({
        label: "Bottom layer",
        min: 1400,
        max: 14000,
        step: 10,
        default: 1420,
        unit: " kg/m³",
    }),
    damping: number({ label: "Damping", min: 0.05, max: 1, step: 0.01, default: 0.3 }),
};

export const densityColumnDemo = defineDemo({
    id: "density-column",
    title: "Density column",
    category: "fluids",
    summary: "Oil on water on honey. Each thing sinks until it finds a liquid heavier than itself.",
    hint: "Pick Mercury. The steel nut comes back up.",
    params,
    presets: [
        {
            label: "Kitchen",
            note: "Oil on water",
            values: { top: 920, middle: 1000, bottom: 1420 },
        },
        {
            label: "Salt water",
            note: "Middle 1,200",
            values: { top: 920, middle: 1200, bottom: 1420 },
        },
        {
            label: "Mercury",
            note: "Bottom 13,546",
            values: { top: 920, middle: 1000, bottom: 13546 },
        },
    ],
    actions: [
        { id: "drop", label: "Drop again", key: "d" },
        { id: "shake", label: "Shake", key: "s" },
    ],
    camera: { position: { x: 0, y: 5.4, z: 13 }, target: { x: 0, y: 3.6, z: 0 } },
    source: "apps/editor/src/demos/fluids/density-column.ts",
    create({ root, view, palette, values }) {
        let current = values;
        const world = new ParticleWorld();
        world.gravity.set(0, -GRAVITY, 0);
        const left = -TANK_WIDTH / 2 + 1.2;
        const gap = (TANK_WIDTH - 2.4) / (SHAPES.length - 1);

        const objects = SHAPES.map((shape, i) => {
            const particle = new Particle();
            particle.setMass(shape.density * shape.volume);
            const mesh = new Mesh(
                shape.geometry(),
                new MeshStandardMaterial({ color: palette.series[i], roughness: 0.55 }),
            );
            mesh.castShadow = true;
            root.add(mesh);
            world.particles.push(particle);
            const object = {
                ...shape,
                x: left + i * gap,
                particle,
                mesh,
                previous: new Vec3(),
                held: null as Vec3 | null,
                layers: [] as ParticleBuoyancy[],
                drag: null as DragHandle | null,
            };
            object.drag = new DragHandle(
                view,
                mesh,
                (ray) => {
                    if (ray.intersectPlane(dragPlane, _hit)) object.held = new Vec3().copy(_hit);
                },
                () => {
                    object.held = null;
                },
            );
            return object;
        });
        type Item = (typeof objects)[number];

        // The liquids, darker the denser, and an outline of the whole tank.
        const opacities = [0.42, 0.28, 0.16];
        SURFACES.forEach((surface, i) => {
            const layer = new Mesh(
                new BoxGeometry(TANK_WIDTH, LAYER, TANK_DEPTH),
                new MeshStandardMaterial({
                    color: palette.liquid,
                    transparent: true,
                    opacity: opacities[i],
                    depthWrite: false,
                }),
            );
            layer.position.set(0, surface - LAYER / 2, 0);
            root.add(layer);
        });
        const tank = new LineSegments(
            new EdgesGeometry(new BoxGeometry(TANK_WIDTH, 3 * LAYER, TANK_DEPTH)),
            new LineBasicMaterial({ color: palette.muted }),
        );
        tank.position.set(0, FLOOR + 1.5 * LAYER, 0);
        root.add(tank);

        const densities = () => [current.bottom, current.middle, current.top] as const;

        // Generators keep their parameters fixed, so new densities mean new generators.
        const rebuildForces = (): void => {
            world.forceRegistry.clear();
            const [bottom, middle, top] = densities();
            const steps = [bottom - middle, middle - top, top];
            for (const item of objects) {
                item.layers = SURFACES.map(
                    (surface, i) =>
                        new ParticleBuoyancy(
                            item.height / 2,
                            item.volume,
                            surface,
                            steps[i],
                            GRAVITY,
                        ),
                );
                for (const layer of item.layers) world.forceRegistry.add(item.particle, layer);
            }
        };
        const applyDamping = (): void => {
            for (const { particle } of objects) particle.damping = current.damping;
        };

        const place = (item: Item, at: Vec3Like): void => {
            item.particle.position.copy(at);
            item.particle.velocity.set(0, 0, 0);
            item.particle.clearAccumulator();
            item.previous.copy(at);
        };
        const drop = (): void => {
            objects.forEach((item, i) =>
                place(item, { x: item.x, y: DROP_HEIGHT + i * 0.6, z: 0 }),
            );
        };
        // Sends each object to a different layer from the one it is in now.
        const shake = (): void => {
            objects.forEach((item, i) => {
                const layer = (i + 1 + Math.round(item.particle.position.y / LAYER)) % 3;
                place(item, { x: item.x, y: FLOOR + layer * LAYER + LAYER / 2, z: 0 });
            });
        };

        const buoyancy = (item: Item): number => {
            _probe.position.copy(item.particle.position);
            _probe.inverseMass = item.particle.inverseMass;
            _probe.clearAccumulator();
            for (const layer of item.layers) layer.updateForce(_probe, 0);
            return _probe.forceAccum.y;
        };

        /** The layer an object comes to rest on, from what floats on what. */
        const restsIn = (item: Item): string => {
            const [bottom, middle, top] = densities();
            if (item.density < top) return "floats on top";
            if (item.density < middle) return "on the middle layer";
            if (item.density < bottom) return "on the bottom layer";
            return "sinks";
        };

        rebuildForces();
        applyDamping();
        drop();

        return {
            update(next, changed) {
                current = next;
                if (changed.has("top") || changed.has("middle") || changed.has("bottom")) {
                    rebuildForces();
                }
                if (changed.has("damping")) applyDamping();
            },
            action(id) {
                if (id === "drop") drop();
                if (id === "shake") shake();
            },
            step(dt) {
                for (const item of objects) item.previous.copy(item.particle.position);
                world.step(dt);
                for (const item of objects) {
                    const { particle, held } = item;
                    if (held) {
                        particle.position.copy(held);
                        particle.velocity.set(0, 0, 0);
                        continue;
                    }
                    const bottom = FLOOR + item.height / 2;
                    if (particle.position.y >= bottom) continue;
                    particle.position.y = bottom;
                    if (particle.velocity.y < 0) particle.velocity.y = 0;
                }
            },
            sync(alpha) {
                for (const item of objects) {
                    _blended.copy(item.previous).lerp(item.particle.position, alpha);
                    item.mesh.position.copy(_blended);
                }
            },
            readouts: () =>
                objects.map((item, i) => ({
                    title: item.name,
                    color: i as SeriesIndex,
                    rows: [
                        { label: "Density", value: `${formatNumber(item.density, 0)} kg/m³` },
                        { label: "Comes to rest", value: restsIn(item) },
                        { label: "Buoyancy", value: `${formatNumber(buoyancy(item), 0)} N` },
                        {
                            label: "Weight",
                            value: `${formatNumber(item.particle.mass * GRAVITY, 0)} N`,
                        },
                    ],
                })),
            callouts: () => {
                const [bottom, middle, top] = densities();
                const edge = TANK_WIDTH / 2;
                return [
                    ...[bottom, middle, top].map((density, i) => ({
                        at: { x: edge, y: SURFACES[i]! - LAYER / 2, z: TANK_DEPTH / 2 },
                        text: `${formatNumber(density, 0).trim()} kg/m³`,
                    })),
                    ...objects.map((item, i) => ({
                        at: item.mesh.position,
                        text: item.name.toLowerCase(),
                        color: i as SeriesIndex,
                    })),
                ];
            },
            dispose() {
                for (const item of objects) item.drag?.dispose();
            },
        };
    },
});
