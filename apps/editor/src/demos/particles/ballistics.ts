import {
    BoxGeometry,
    BufferGeometry,
    Float32BufferAttribute,
    LineBasicMaterial,
    LineDashedMaterial,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
    SphereGeometry,
} from "three";
import { Particle, ParticleWorld, Vec3, type Vec3Like } from "aether-physics";
import { defineDemo, type SeriesIndex } from "../../core/demo";
import { DEG_TO_RAD, formatNumber } from "../../core/format";
import { number, toggle } from "../../core/params";
import { Polyline } from "../helpers/polyline";
import { VectorArrow } from "../helpers/vector-arrow";

/**
 * Projectiles on a shooting range. Each shot is a `Particle` in a `ParticleWorld` with the
 * current muzzle speed, elevation, gravity scale and damping. The dashed line is the same shot
 * with no damping, from `x₀ + v₀t + ½at²`. Range lines are 10 m apart, brighter every 50 m.
 */

const MUZZLE: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1.5, z: 0 }); // m
const MAX_SHOTS = 8;
const LIFETIME = 5; // s
const RANGE_LENGTH = 200; // m
const RANGE_HALF_WIDTH = 15; // m
const MINOR_SPACING = 10; // m
const MAJOR_SPACING = 50; // m
const RANGE_HEIGHT = 0.02; // m
const AUTO_FIRE_INTERVAL = 1.2; // s
const TRAIL_INTERVAL = 0.05; // s
const TRAIL_POINTS = Math.ceil(LIFETIME / TRAIL_INTERVAL) + 2;
const IDEAL_POINTS = 128;
const SHOT_RADIUS = 0.45; // m, enlarged so shots read from the camera
const VELOCITY_ARROW_SCALE = 0.1; // m of arrow per m/s

const _blended = new Vec3();
const _point = new Vec3();
const _velocity = new Vec3();

interface ShotReport {
    flightTime: number;
    range: number;
    apex: number;
    finalSpeed: number;
}

const params = {
    speed: number({ label: "Muzzle speed", min: 1, max: 120, step: 1, default: 50, unit: " m/s" }),
    elevation: number({ label: "Elevation", min: 0, max: 80, step: 1, default: 37, unit: "°" }),
    gravityScale: number({
        label: "Gravity scale",
        min: -0.2,
        max: 3,
        step: 0.01,
        default: 2,
        unit: "×",
    }),
    damping: number({ label: "Damping", min: 0.5, max: 1, step: 0.005, default: 0.99, digits: 3 }),
    auto: toggle({ label: "Auto-fire", default: true }),
};

function hasEnded(position: Vec3Like, age: number): boolean {
    return position.y < 0 || position.z > RANGE_LENGTH || age > LIFETIME;
}

function rangeLines(spacing: number, color: number, skipEvery = 0): LineSegments {
    const vertices: number[] = [];
    for (let z = 0; z <= RANGE_LENGTH; z += spacing) {
        if (skipEvery > 0 && z % skipEvery === 0) continue;
        vertices.push(-RANGE_HALF_WIDTH, RANGE_HEIGHT, z, RANGE_HALF_WIDTH, RANGE_HEIGHT, z);
    }
    const geometry = new BufferGeometry().setAttribute(
        "position",
        new Float32BufferAttribute(vertices, 3),
    );
    return new LineSegments(geometry, new LineBasicMaterial({ color }));
}

export const ballisticsDemo = defineDemo({
    id: "ballistics",
    title: "Ballistics",
    category: "particles",
    summary: "Shots down a range. The dashed line is the same shot without drag.",
    hint: "Lower the damping and watch them fall short.",
    params,
    presets: [
        {
            label: "Pistol",
            note: "35 m/s, flat",
            values: { speed: 35, elevation: 0, gravityScale: 0.1, damping: 0.99 },
        },
        {
            label: "Artillery",
            note: "50 m/s at 37°",
            values: { speed: 50, elevation: 37, gravityScale: 2, damping: 0.99 },
        },
        {
            label: "Fireball",
            note: "Rises, slows",
            values: { speed: 10, elevation: 0, gravityScale: -0.06, damping: 0.9 },
        },
        {
            label: "Laser",
            note: "100 m/s, no gravity",
            values: { speed: 100, elevation: 0, gravityScale: 0, damping: 0.99 },
        },
    ],
    actions: [{ id: "fire", label: "Fire", key: "f" }],
    camera: { position: { x: -34, y: 30, z: -48 }, target: { x: 0, y: 4, z: 62 } },
    source: "apps/editor/src/demos/particles/ballistics.ts",
    create({ root, palette, values }) {
        let current = values;
        const world = new ParticleWorld();
        let nextShot = 0;
        let fireTimer = 0;
        let shotCount = 0;
        let lastShot: ShotReport | null = null;
        let newest: (typeof shots)[number] | null = null;

        const ideal = new Polyline(
            IDEAL_POINTS,
            new LineDashedMaterial({ color: palette.muted, dashSize: 1.5, gapSize: 1 }),
        );
        const muzzle = new Mesh(
            new BoxGeometry(0.6, MUZZLE.y, 0.6),
            new MeshStandardMaterial({ color: palette.ink }),
        );
        muzzle.position.set(MUZZLE.x, MUZZLE.y / 2, MUZZLE.z);
        root.add(
            muzzle,
            ideal,
            rangeLines(MINOR_SPACING, palette.gridMajor, MAJOR_SPACING),
            rangeLines(MAJOR_SPACING, palette.muted),
        );

        const shots = Array.from({ length: MAX_SHOTS }, () => {
            const material = new MeshStandardMaterial();
            const trailMaterial = new LineBasicMaterial();
            const shot = {
                particle: new Particle(),
                previous: new Vec3(),
                mesh: new Mesh(new SphereGeometry(SHOT_RADIUS, 16, 12), material),
                arrow: new VectorArrow(palette.muted),
                trail: new Polyline(TRAIL_POINTS, trailMaterial),
                material,
                trailMaterial,
                active: false,
                age: 0,
                apex: 0,
                trailCount: 0,
                nextTrailAge: 0,
                color: 0 as SeriesIndex,
            };
            shot.mesh.visible = false;
            shot.arrow.visible = false;
            root.add(shot.mesh, shot.arrow, shot.trail);
            return shot;
        });
        type Shot = (typeof shots)[number];

        const launchVelocity = (out: Vec3): Vec3 => {
            const a = current.elevation * DEG_TO_RAD;
            return out.set(0, current.speed * Math.sin(a), current.speed * Math.cos(a));
        };

        const drawIdealPath = (): void => {
            launchVelocity(_velocity);
            const dt = LIFETIME / (IDEAL_POINTS - 1);
            let count = 0;
            for (let i = 0; i < IDEAL_POINTS; i++) {
                const t = i * dt;
                _point
                    .copy(MUZZLE)
                    .addScaled(_velocity, t)
                    .addScaled(world.gravity, 0.5 * current.gravityScale * t * t);
                if (hasEnded(_point, t)) break;
                ideal.setPoint(count++, _point);
            }
            ideal.setCount(count);
            ideal.computeLineDistances();
        };
        drawIdealPath();

        const recordTrailPoint = (shot: Shot): void => {
            shot.trail.setPoint(shot.trailCount++, shot.particle.position);
            shot.nextTrailAge = shot.age + TRAIL_INTERVAL;
        };

        const fire = (): void => {
            const shot = shots[nextShot]!;
            nextShot = (nextShot + 1) % MAX_SHOTS;
            if (shot.active) world.remove(shot.particle);
            const p = shot.particle;
            p.damping = current.damping;
            p.gravityScale = current.gravityScale;
            p.position.copy(MUZZLE);
            launchVelocity(p.velocity);
            p.clearAccumulator();
            world.particles.push(p);
            shot.previous.copy(p.position);
            shot.active = true;
            shot.age = 0;
            shot.apex = p.position.y;
            shot.trailCount = 0;
            shot.color = (shotCount++ % 4) as SeriesIndex;
            const color = palette.series[shot.color];
            shot.material.color.setHex(color);
            shot.trailMaterial.color.setHex(color);
            recordTrailPoint(shot);
            newest = shot;
        };

        const finish = (shot: Shot): void => {
            const p = shot.particle;
            const end = _point.copy(p.position);
            if (p.position.y < 0) {
                // The step crossed the ground; measure from the crossing.
                const t = shot.previous.y / (shot.previous.y - p.position.y);
                end.copy(shot.previous).lerp(p.position, t);
            }
            shot.trail.setPoint(shot.trailCount, end);
            shot.trail.setCount(shot.trailCount + 1);
            lastShot = {
                flightTime: shot.age,
                range: end.z - MUZZLE.z,
                apex: shot.apex,
                finalSpeed: p.velocity.magnitude(),
            };
            world.remove(p);
            shot.active = false;
        };

        return {
            update(next) {
                current = next;
                drawIdealPath();
            },
            action(id) {
                if (id !== "fire") return;
                fire();
                fireTimer = AUTO_FIRE_INTERVAL;
            },
            step(dt) {
                fireTimer -= dt;
                if (current.auto && fireTimer <= 0) {
                    fire();
                    fireTimer = AUTO_FIRE_INTERVAL;
                }
                for (const shot of shots)
                    if (shot.active) shot.previous.copy(shot.particle.position);
                world.step(dt);
                for (const shot of shots) {
                    if (!shot.active) continue;
                    shot.age += dt;
                    shot.apex = Math.max(shot.apex, shot.particle.position.y);
                    if (hasEnded(shot.particle.position, shot.age)) finish(shot);
                    else if (shot.age >= shot.nextTrailAge) recordTrailPoint(shot);
                }
            },
            sync(alpha) {
                for (const shot of shots) {
                    shot.mesh.visible = shot.active;
                    shot.arrow.visible &&= shot.active;
                    if (!shot.active) continue;
                    _blended.copy(shot.previous).lerp(shot.particle.position, alpha);
                    shot.mesh.position.copy(_blended);
                    shot.arrow.update(_blended, shot.particle.velocity, VELOCITY_ARROW_SCALE);
                    shot.trail.setPoint(shot.trailCount, _blended);
                    shot.trail.setCount(shot.trailCount + 1);
                }
            },
            readouts: () => [
                {
                    title: "Range",
                    rows: [
                        { label: "In flight", value: String(world.particles.length) },
                        {
                            label: "Launch acceleration",
                            value: `${formatNumber(Math.abs(current.gravityScale) * world.gravity.magnitude(), 2)} m/s²`,
                        },
                    ],
                },
                {
                    title: "Last completed shot",
                    rows: lastShot
                        ? [
                              {
                                  label: "Flight time",
                                  value: `${formatNumber(lastShot.flightTime, 2)} s`,
                              },
                              { label: "Range", value: `${formatNumber(lastShot.range, 1)} m` },
                              { label: "Apex", value: `${formatNumber(lastShot.apex, 1)} m` },
                              {
                                  label: "Final speed",
                                  value: `${formatNumber(lastShot.finalSpeed, 1)} m/s`,
                              },
                          ]
                        : [{ label: "Flight time", value: "waiting" }],
                },
            ],
            callouts: () =>
                newest?.active
                    ? [
                          {
                              at: newest.mesh.position,
                              text: `${formatNumber(newest.particle.velocity.magnitude(), 1).trim()} m/s`,
                              color: newest.color,
                          },
                      ]
                    : [],
        };
    },
});
