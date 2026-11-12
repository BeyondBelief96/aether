import {
    BufferAttribute,
    BufferGeometry,
    Color,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    Points,
    PointsMaterial,
    SphereGeometry,
} from "three";
import { Particle, ParticleAttraction, ParticleWorld } from "aether-physics";
import { defineDemo } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";
import { Polyline } from "../helpers/polyline";

/**
 * A disk of dust around two stars. Each star is the source of one `ParticleAttraction`, shared
 * by the other star and every grain of dust; the dust pulls nothing. Generators keep their
 * parameters fixed, so a new star mass means new generators.
 */

const HEIGHT = 4; // m, the disk's plane above the ground
const SEPARATION = 3; // m between the stars
const BASE_PULL = 60; // m³/s², G·M for a star of mass 1
const SOFTENING = 0.6; // m
const INNER_RADIUS = 4.5; // m
const OUTER_RADIUS = 13; // m
const THICKNESS = 0.25; // m
const SUBSTEPS = 2;
const TRAIL_POINTS = 240;
const MAX_DUST = 2000;
const ESCAPE_RADIUS = 60; // m, dust past this is counted as escaped
const STAR_RADIUS = 0.6; // m
const SAMPLES_PER_SECOND = 30;

/** Small seeded generator, so a reset rebuilds the same disk. */
function random(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const params = {
    mass: number({ label: "Star mass", min: 0.25, max: 4, step: 0.05, default: 1, unit: "×" }),
    dust: number({ label: "Dust", min: 200, max: MAX_DUST, step: 50, default: 1200 }),
    drag: number({ label: "Drag", min: 0, max: 0.2, step: 0.005, default: 0, digits: 3 }),
};

export const orbitsDemo = defineDemo({
    id: "orbits",
    title: "Orbits",
    category: "particles",
    summary: "Dust circling two stars, every grain pulled by both.",
    hint: "Add a little drag and watch the disk fall in.",
    params,
    presets: [
        { label: "Binary", note: "Settled disk", values: { mass: 1, drag: 0 } },
        { label: "Heavy", note: "Stars ×3", values: { mass: 3, drag: 0 } },
        { label: "Feather", note: "Stars ×0.3", values: { mass: 0.3, drag: 0 } },
        { label: "Infall", note: "Drag 0.05", values: { mass: 1, drag: 0.05 } },
    ],
    charts: [
        {
            id: "separation",
            title: "Distance between the stars",
            series: [{ label: "Separation", color: 0 }],
            ranges: [
                { label: "0–6 m", min: 0, max: 6, digits: 1 },
                { label: "±5%", min: SEPARATION * 0.95, max: SEPARATION * 1.05, digits: 2 },
            ],
            reference: SEPARATION,
            capacity: SAMPLES_PER_SECOND * 20,
            description: "Distance between the two stars over the last 20 seconds.",
        },
    ],
    camera: { position: { x: -5, y: 13, z: 21 }, target: { x: -5, y: HEIGHT - 1, z: 0 } },
    source: "apps/editor/src/demos/particles/orbits.ts",
    create({ root, palette, values, plot, clearCharts, useWorld }) {
        let current = values;
        let sampleTime = 0;
        const world = useWorld(new ParticleWorld());
        world.gravity.set(0, 0, 0);
        const rand = random(11);

        const stars = [new Particle(), new Particle()] as const;
        const starPull = () => BASE_PULL * current.mass;
        let attractions: ParticleAttraction[] = [];
        const dust: Particle[] = [];

        const starMeshes = stars.map((_, i) => {
            const mesh = new Mesh(
                new SphereGeometry(STAR_RADIUS, 32, 16),
                new MeshStandardMaterial({
                    color: i === 0 ? palette.accent : palette.ink,
                    emissive: i === 0 ? palette.accent : palette.ink,
                    emissiveIntensity: 0.35,
                    roughness: 0.4,
                }),
            );
            root.add(mesh);
            return mesh;
        });
        const trails = stars.map((_, i) => {
            const trail = new Polyline(
                TRAIL_POINTS,
                new LineBasicMaterial({
                    color: i === 0 ? palette.accent : palette.ink,
                    transparent: true,
                    opacity: 0.6,
                }),
            );
            root.add(trail);
            return trail;
        });

        const positions = new BufferAttribute(new Float32Array(MAX_DUST * 3), 3);
        const colors = new BufferAttribute(new Float32Array(MAX_DUST * 3), 3);
        const previous = new Float32Array(MAX_DUST * 3);
        const geometry = new BufferGeometry()
            .setAttribute("position", positions)
            .setAttribute("color", colors);
        const cloud = new Points(geometry, new PointsMaterial({ size: 0.24, vertexColors: true }));
        cloud.frustumCulled = false;
        root.add(cloud);
        const slow = new Color(palette.muted);
        const fast = new Color(palette.series[1]);
        const _color = new Color();

        /** Registers one attraction per star: on the other star and on every grain. */
        const attach = (): void => {
            const registry = world.forceRegistry;
            registry.clear();
            attractions = stars.map((star) => new ParticleAttraction(star, starPull(), SOFTENING));
            const [towardA, towardB] = attractions as [ParticleAttraction, ParticleAttraction];
            registry.add(stars[0], towardB);
            registry.add(stars[1], towardA);
            for (const p of dust) {
                registry.add(p, towardA);
                registry.add(p, towardB);
            }
        };

        /** Places the stars on a circular binary orbit and lays out a disk of dust around them. */
        const build = (): void => {
            world.particles.length = 0;
            dust.length = 0;

            const mu = starPull();
            // Each star circles the shared centre at half the relative speed sqrt(2μ/d).
            const v = Math.sqrt((2 * mu) / SEPARATION) / 2;
            stars.forEach((star, i) => {
                const side = i === 0 ? -1 : 1;
                star.position.set((side * SEPARATION) / 2, HEIGHT, 0);
                star.velocity.set(0, 0, side * v);
                star.clearAccumulator();
                world.particles.push(star);
            });

            for (let i = 0; i < current.dust; i++) {
                const p = new Particle();
                // Even area density between the inner and outer radius.
                const r = Math.sqrt(
                    INNER_RADIUS ** 2 + rand() * (OUTER_RADIUS ** 2 - INNER_RADIUS ** 2),
                );
                const angle = rand() * Math.PI * 2;
                const speed = Math.sqrt((2 * mu) / r) * (0.97 + rand() * 0.06);
                p.position.set(
                    Math.cos(angle) * r,
                    HEIGHT + (rand() * 2 - 1) * THICKNESS,
                    Math.sin(angle) * r,
                );
                p.velocity.set(-Math.sin(angle) * speed, 0, Math.cos(angle) * speed);
                p.damping = 1 - current.drag;
                world.particles.push(p);
                dust.push(p);
            }
            attach();
            remember();
            for (const trail of trails) trail.setCount(0);
            sampleTime = 0;
            clearCharts();
        };

        const remember = (): void => {
            dust.forEach((p, i) => {
                previous[i * 3] = p.position.x;
                previous[i * 3 + 1] = p.position.y;
                previous[i * 3 + 2] = p.position.z;
            });
        };

        build();

        const escaped = () =>
            dust.filter((p) => p.position.distanceTo(stars[0].position) > ESCAPE_RADIUS).length;

        return {
            update(next, changed) {
                current = next;
                if (changed.has("dust")) {
                    build();
                    return;
                }
                if (changed.has("mass")) attach();
                if (changed.has("drag")) for (const p of dust) p.damping = 1 - current.drag;
            },
            step(dt) {
                remember();
                for (let i = 0; i < SUBSTEPS; i++) world.step(dt / SUBSTEPS);
                sampleTime += dt;
                while (sampleTime >= 1 / SAMPLES_PER_SECOND) {
                    plot("separation", [stars[0].position.distanceTo(stars[1].position)]);
                    sampleTime -= 1 / SAMPLES_PER_SECOND;
                }
                stars.forEach((star, i) => trails[i]!.append(star.position));
            },
            sync(alpha) {
                stars.forEach((star, i) => starMeshes[i]!.position.copy(star.position));
                const n = dust.length;
                for (let i = 0; i < n; i++) {
                    const p = dust[i]!;
                    const k = i * 3;
                    positions.setXYZ(
                        i,
                        previous[k]! + (p.position.x - previous[k]!) * alpha,
                        previous[k + 1]! + (p.position.y - previous[k + 1]!) * alpha,
                        previous[k + 2]! + (p.position.z - previous[k + 2]!) * alpha,
                    );
                    const t = Math.min(1, p.velocity.magnitude() / (Math.sqrt(starPull()) * 0.9));
                    _color.copy(slow).lerp(fast, t * t);
                    colors.setXYZ(i, _color.r, _color.g, _color.b);
                }
                geometry.setDrawRange(0, n);
                positions.needsUpdate = colors.needsUpdate = true;
            },
            readouts: () => [
                {
                    title: "System",
                    rows: [
                        { label: "Particles", value: String(world.particles.length) },
                        { label: "Attraction generators", value: String(attractions.length) },
                        { label: "Registrations", value: String(dust.length * 2 + 2) },
                        {
                            label: "Star separation",
                            value: `${formatNumber(stars[0].position.distanceTo(stars[1].position), 2)} m`,
                        },
                        {
                            label: "Escaped",
                            value: `${formatNumber((escaped() / Math.max(1, dust.length)) * 100, 1)} %`,
                        },
                    ],
                },
            ],
            callouts: () => [
                {
                    at: starMeshes[0]!.position,
                    text: `G·M ${formatNumber(starPull(), 0).trim()} m³/s²`,
                    color: 0,
                },
            ],
        };
    },
});
