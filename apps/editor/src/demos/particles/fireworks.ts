import {
    BufferAttribute,
    BufferGeometry,
    LineBasicMaterial,
    LineSegments,
    Points,
    PointsMaterial,
    Color,
} from "three";
import { Particle, ParticleDrag, ParticleWorld, Vec3 } from "aether-physics";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { number } from "../../core/params";

/**
 * Rockets that burst into hundreds of sparks. Every rocket and spark is a `Particle` in one
 * `ParticleWorld`; the sparks share a single `ParticleDrag` generator and fade out at the end
 * of their life. Bursts are seeded, so a reset replays the same show.
 */

const CAPACITY = 4000;
const LAUNCH_HALF_WIDTH = 9; // m
const ROCKET_SPEED = 22; // m/s
/** Rockets burst once they slow to this upward speed. */
const BURST_SPEED_Y = 3; // m/s
const SPARK_LIFE = 2.2; // s
const SPARK_LIFE_SPREAD = 0.8; // s
const STREAK_TIME = 0.05; // s of motion each streak shows
const SPARK_MASS = 0.5; // kg
const ROCKET_COLOR_INDEX = -1;

/** Small seeded generator, so a reset replays the same bursts. */
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
    rate: number({ label: "Launches", min: 0.2, max: 4, step: 0.1, default: 1.2, unit: " /s" }),
    sparks: number({ label: "Sparks per burst", min: 20, max: 400, step: 10, default: 160 }),
    burst: number({ label: "Burst speed", min: 2, max: 20, step: 0.5, default: 9, unit: " m/s" }),
    drag: number({ label: "Drag k₁", min: 0, max: 2, step: 0.05, default: 0.6, unit: " N·s/m" }),
    gravity: number({
        label: "Spark gravity",
        min: 0,
        max: 1.5,
        step: 0.05,
        default: 0.5,
        unit: "×",
    }),
};

interface Spark {
    particle: Particle;
    age: number;
    life: number;
    color: number;
}

export const fireworksDemo = defineDemo({
    id: "fireworks",
    title: "Fireworks",
    category: "particles",
    summary:
        "Rockets launch, slow, and burst into sparks. Every point is a particle; the sparks " +
        "share one drag generator.",
    hint: "Choose Willow, then push Drag to 2: the sparks hang and fall straight down.",
    params,
    presets: [
        {
            label: "Peony",
            note: "Round, quick",
            values: { sparks: 160, burst: 9, drag: 0.6, gravity: 0.5 },
        },
        {
            label: "Chrysanthemum",
            note: "Wide, long",
            values: { sparks: 300, burst: 14, drag: 0.35, gravity: 0.35 },
        },
        {
            label: "Willow",
            note: "Heavy, drooping",
            values: { sparks: 220, burst: 7, drag: 1.4, gravity: 1.2 },
        },
        {
            label: "Zero-g",
            note: "No gravity",
            values: { sparks: 200, burst: 6, drag: 0.2, gravity: 0 },
        },
    ],
    actions: [{ id: "launch", label: "Launch", key: "l" }],
    camera: { position: { x: 6, y: 14, z: 50 }, target: { x: 2, y: 17, z: 0 } },
    source: "apps/editor/src/demos/particles/fireworks.ts",
    create({ root, palette, values }) {
        let current = values;
        const rand = random(7);
        const world = new ParticleWorld();
        let drag = new ParticleDrag(current.drag, 0);
        const rockets: Spark[] = [];
        const sparks: Spark[] = [];
        const pool: Particle[] = [];
        let launchTimer = 0;
        let bursts = 0;

        const positions = new BufferAttribute(new Float32Array(CAPACITY * 3), 3);
        const colors = new BufferAttribute(new Float32Array(CAPACITY * 3), 3);
        const streakPositions = new BufferAttribute(new Float32Array(CAPACITY * 6), 3);
        const streakColors = new BufferAttribute(new Float32Array(CAPACITY * 6), 3);
        const pointGeometry = new BufferGeometry()
            .setAttribute("position", positions)
            .setAttribute("color", colors);
        const streakGeometry = new BufferGeometry()
            .setAttribute("position", streakPositions)
            .setAttribute("color", streakColors);
        const points = new Points(
            pointGeometry,
            new PointsMaterial({ size: 0.32, vertexColors: true }),
        );
        const streaks = new LineSegments(
            streakGeometry,
            new LineBasicMaterial({ vertexColors: true }),
        );
        points.frustumCulled = false;
        streaks.frustumCulled = false;
        root.add(points, streaks);

        const ground = new Color(palette.ground);
        const seriesColors = palette.series.map((c) => new Color(c));
        const rocketColor = new Color(palette.ink);
        const _color = new Color();
        const _from = new Vec3();

        const take = (): Particle => {
            const p = pool.pop() ?? new Particle();
            p.clearAccumulator();
            world.particles.push(p);
            return p;
        };

        const release = (p: Particle): void => {
            world.remove(p);
            pool.push(p);
        };

        const launch = (): void => {
            if (rockets.length + sparks.length >= CAPACITY) return;
            const p = take();
            p.position.set((rand() * 2 - 1) * LAUNCH_HALF_WIDTH, 0, (rand() * 2 - 1) * 2);
            p.velocity.set(
                (rand() * 2 - 1) * 2,
                ROCKET_SPEED * (0.85 + rand() * 0.3),
                (rand() * 2 - 1) * 1.5,
            );
            p.gravityScale = 1;
            p.damping = 1;
            rockets.push({ particle: p, age: 0, life: Infinity, color: ROCKET_COLOR_INDEX });
        };

        const burst = (rocket: Particle): void => {
            const color = bursts++ % 4;
            const count = Math.min(current.sparks, CAPACITY - rockets.length - sparks.length);
            for (let i = 0; i < count; i++) {
                const p = take();
                // Uniform direction on the sphere.
                const z = rand() * 2 - 1;
                const angle = rand() * 2 * Math.PI;
                const r = Math.sqrt(1 - z * z);
                const speed = current.burst * (0.8 + rand() * 0.4);
                p.position.copy(rocket.position);
                p.velocity
                    .set(r * Math.cos(angle) * speed, z * speed, r * Math.sin(angle) * speed)
                    .addScaled(rocket.velocity, 0.3);
                p.setMass(SPARK_MASS);
                p.gravityScale = current.gravity;
                p.damping = 1;
                world.forceRegistry.add(p, drag);
                sparks.push({
                    particle: p,
                    age: 0,
                    life: SPARK_LIFE + (rand() * 2 - 1) * SPARK_LIFE_SPREAD,
                    color,
                });
            }
        };

        const write = (index: number, spark: Spark): void => {
            const { position, velocity } = spark.particle;
            const fade =
                spark.color === ROCKET_COLOR_INDEX
                    ? 1
                    : Math.max(0, 1 - (spark.age / spark.life) ** 2);
            const base =
                spark.color === ROCKET_COLOR_INDEX ? rocketColor : seriesColors[spark.color]!;
            _color.copy(ground).lerp(base, fade);
            positions.setXYZ(index, position.x, position.y, position.z);
            colors.setXYZ(index, _color.r, _color.g, _color.b);
            _from.copy(position).addScaled(velocity, -STREAK_TIME);
            streakPositions.setXYZ(index * 2, _from.x, _from.y, _from.z);
            streakPositions.setXYZ(index * 2 + 1, position.x, position.y, position.z);
            _color.copy(ground).lerp(base, fade * 0.35);
            streakColors.setXYZ(index * 2, _color.r, _color.g, _color.b);
            _color.copy(ground).lerp(base, fade);
            streakColors.setXYZ(index * 2 + 1, _color.r, _color.g, _color.b);
        };

        launch();

        return {
            update(next, changed) {
                current = next;
                if (changed.has("drag")) {
                    for (const { particle } of sparks) world.forceRegistry.remove(particle, drag);
                    drag = new ParticleDrag(current.drag, 0);
                    for (const { particle } of sparks) world.forceRegistry.add(particle, drag);
                }
                if (changed.has("gravity"))
                    for (const { particle } of sparks) particle.gravityScale = current.gravity;
            },
            action(id) {
                if (id === "launch") launch();
            },
            step(dt) {
                launchTimer -= dt;
                if (launchTimer <= 0) {
                    launch();
                    launchTimer = 1 / current.rate;
                }
                world.step(dt);
                for (let i = rockets.length - 1; i >= 0; i--) {
                    const rocket = rockets[i]!;
                    rocket.age += dt;
                    if (rocket.particle.velocity.y > BURST_SPEED_Y) continue;
                    burst(rocket.particle);
                    release(rocket.particle);
                    rockets.splice(i, 1);
                }
                let kept = 0;
                for (const spark of sparks) {
                    spark.age += dt;
                    if (spark.age < spark.life && spark.particle.position.y > 0)
                        sparks[kept++] = spark;
                    else release(spark.particle);
                }
                sparks.length = kept;
            },
            sync() {
                let n = 0;
                for (const rocket of rockets) write(n++, rocket);
                for (const spark of sparks) write(n++, spark);
                pointGeometry.setDrawRange(0, n);
                streakGeometry.setDrawRange(0, n * 2);
                positions.needsUpdate = colors.needsUpdate = true;
                streakPositions.needsUpdate = streakColors.needsUpdate = true;
            },
            readouts: () => [
                {
                    title: "World",
                    rows: [
                        { label: "Particles", value: String(world.particles.length) },
                        { label: "Rockets climbing", value: String(rockets.length) },
                        { label: "Bursts", value: String(bursts) },
                    ],
                },
            ],
            callouts: () => {
                const rocket = rockets[rockets.length - 1];
                return rocket
                    ? [
                          {
                              at: rocket.particle.position,
                              text: `${rocket.particle.velocity.y.toFixed(1)} m/s ↑`,
                              color: (bursts % 4) as SeriesIndex,
                          },
                      ]
                    : [];
            },
        };
    },
});
