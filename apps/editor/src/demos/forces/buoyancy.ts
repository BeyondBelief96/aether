import {
    BoxGeometry,
    EdgesGeometry,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
} from "three";
import { Particle, ParticleBuoyancy, ParticleWorld, Vec3, type Vec3Like } from "aether-physics";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { VectorArrow } from "../helpers/vector-arrow";

/**
 * Four 1 m cubes of different densities dropped into a tank, each with its own
 * `ParticleBuoyancy`. A cube spans exactly `maxDepth` above and below its centre, so the
 * generator's linear submerged fraction is exact: a floating cube settles with
 * `body density / liquid density` of it under the surface. The tank floor is a clamp in the
 * demo, not a contact.
 */

const SIZE = 1; // m
const HALF = SIZE / 2; // m
const VOLUME = SIZE ** 3; // m³
const GRAVITY = 9.81; // m/s²
const SURFACE = 4; // m
const FLOOR = 0; // m
const TANK_WIDTH = 14; // m
const TANK_DEPTH = 3; // m
const DROP_HEIGHT = 6.5; // m
const SPACING = 3; // m
const FORCE_ARROW_SCALE = 1 / 8000; // m of arrow per N

const MATERIALS = [
    { name: "Cork", density: 240 },
    { name: "Pine", density: 500 },
    { name: "Ice", density: 920 },
    { name: "Brick", density: 1900 },
] as const;

const _blended = new Vec3();
const _force = new Vec3();
const _weight = new Vec3();
const _probe = new Particle();

const params = {
    density: number({
        label: "Liquid density",
        min: 100,
        max: 2500,
        step: 10,
        default: 1000,
        unit: " kg/m³",
    }),
    damping: number({ label: "Damping", min: 0.05, max: 1, step: 0.01, default: 0.4 }),
};

export const buoyancyDemo = defineDemo({
    id: "buoyancy",
    title: "Buoyancy",
    category: "forces",
    summary:
        "Cubes of cork, pine, ice and brick dropped into a tank. Each floats with its density " +
        "ratio under the surface, or sinks.",
    hint: "Choose Oil: ice is denser than oil and goes to the bottom.",
    params,
    presets: [
        { label: "Oil", note: "910 kg/m³", values: { density: 910 } },
        { label: "Water", note: "1000 kg/m³", values: { density: 1000 } },
        { label: "Honey", note: "1420 kg/m³", values: { density: 1420 } },
        { label: "Dense brine", note: "2200 kg/m³", values: { density: 2200 } },
    ],
    camera: { position: { x: 0, y: 6, z: 16 }, target: { x: 0, y: 3, z: 0 } },
    source: "apps/editor/src/demos/forces/buoyancy.ts",
    create({ root, palette, values }) {
        let current = values;
        const world = new ParticleWorld();
        world.gravity.set(0, -GRAVITY, 0);
        const left = -((MATERIALS.length - 1) * SPACING) / 2;

        const cubes = MATERIALS.map(({ name, density }, i) => {
            const particle = new Particle();
            particle.setMass(density * VOLUME);
            const start: Vec3Like = { x: left + i * SPACING, y: DROP_HEIGHT, z: 0 };
            particle.position.copy(start);
            const mesh = new Mesh(
                new BoxGeometry(SIZE, SIZE, SIZE),
                new MeshStandardMaterial({ color: palette.series[i] }),
            );
            const buoyancyArrow = new VectorArrow(palette.accent);
            const weightArrow = new VectorArrow(palette.muted);
            root.add(mesh, buoyancyArrow, weightArrow);
            world.particles.push(particle);
            return {
                name,
                density,
                particle,
                previous: new Vec3().copy(start),
                mesh,
                buoyancyArrow,
                weightArrow,
                buoyancy: new ParticleBuoyancy(HALF, VOLUME, SURFACE),
            };
        });
        type Cube = (typeof cubes)[number];

        const height = SURFACE - FLOOR;
        const tank = new BoxGeometry(TANK_WIDTH, height, TANK_DEPTH);
        const liquid = new Mesh(
            tank,
            new MeshStandardMaterial({
                color: palette.liquid,
                transparent: true,
                opacity: 0.28,
                depthWrite: false,
            }),
        );
        const outline = new LineSegments(
            new EdgesGeometry(tank),
            new LineBasicMaterial({ color: palette.muted }),
        );
        liquid.position.set(0, FLOOR + height / 2, 0);
        outline.position.copy(liquid.position);
        root.add(liquid, outline);

        // Generators keep their parameters fixed, so a new density means new generators.
        const rebuildForces = (): void => {
            world.forceRegistry.clear();
            for (const cube of cubes) {
                cube.buoyancy = new ParticleBuoyancy(
                    HALF,
                    VOLUME,
                    SURFACE,
                    current.density,
                    GRAVITY,
                );
                world.forceRegistry.add(cube.particle, cube.buoyancy);
            }
        };
        const applyDamping = (): void => {
            for (const { particle } of cubes) particle.damping = current.damping;
        };
        rebuildForces();
        applyDamping();

        const submerged = (cube: Cube) =>
            Math.min(Math.max((SURFACE + HALF - cube.particle.position.y) / SIZE, 0), 1);
        const buoyancyForce = (cube: Cube): Vec3 => {
            _probe.position.copy(cube.particle.position);
            _probe.inverseMass = cube.particle.inverseMass;
            _probe.clearAccumulator();
            cube.buoyancy.updateForce(_probe, 0);
            return _force.copy(_probe.forceAccum);
        };

        return {
            update(next, changed) {
                current = next;
                if (changed.has("density")) rebuildForces();
                if (changed.has("damping")) applyDamping();
            },
            step(dt) {
                for (const cube of cubes) cube.previous.copy(cube.particle.position);
                world.step(dt);
                for (const { particle } of cubes) {
                    if (particle.position.y >= FLOOR + HALF) continue;
                    particle.position.y = FLOOR + HALF;
                    if (particle.velocity.y < 0) particle.velocity.y = 0;
                }
            },
            sync(alpha) {
                for (const cube of cubes) {
                    _blended.copy(cube.previous).lerp(cube.particle.position, alpha);
                    const centre = cube.mesh.position.copy(_blended);
                    cube.buoyancyArrow.update(centre, buoyancyForce(cube), FORCE_ARROW_SCALE);
                    _weight.set(0, -cube.particle.mass * GRAVITY, 0);
                    cube.weightArrow.update(centre, _weight, FORCE_ARROW_SCALE);
                }
            },
            readouts: () =>
                cubes.map((cube, i) => {
                    const ratio = cube.density / current.density;
                    return {
                        title: cube.name,
                        color: i as SeriesIndex,
                        rows: [
                            { label: "Density", value: `${formatNumber(cube.density, 0)} kg/m³` },
                            {
                                label: "Submerged",
                                value: `${formatNumber(submerged(cube) * 100, 0)} %`,
                            },
                            {
                                label: "At rest",
                                value:
                                    ratio < 1 ? `${formatNumber(ratio * 100, 0)} % under` : "sinks",
                            },
                            {
                                label: "Buoyancy",
                                value: `${formatNumber(buoyancyForce(cube).y, 0)} N`,
                            },
                            {
                                label: "Weight",
                                value: `${formatNumber(cube.particle.mass * GRAVITY, 0)} N`,
                            },
                        ],
                    };
                }),
            callouts: () =>
                cubes.map((cube, i) => ({
                    at: cube.mesh.position,
                    text: `${cube.name.toLowerCase()} ${Math.round(submerged(cube) * 100)}%`,
                    color: i as SeriesIndex,
                })),
        };
    },
});
