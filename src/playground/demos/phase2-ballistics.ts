import {
    BoxGeometry,
    BufferGeometry,
    Float32BufferAttribute,
    Group,
    LineBasicMaterial,
    LineDashedMaterial,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
    SphereGeometry,
    type Scene,
} from "three";
import { Particle, ParticleWorld, Vec3, type Vec3Like } from "aether-physics";
import "../ui/panels/ballistics-panel";
import type { ShotReport } from "../ui/panels/ballistics-panel";
import { MUTED } from "./helpers/colors";
import { Polyline } from "./helpers/polyline";
import { disposeObject } from "./helpers/three";
import { VectorArrow } from "./helpers/vector-arrow";
import type { Demo, DemoInfo, DemoView } from "./types";

/**
 * Phase 2: particles on a shooting range.
 *
 * Each shot is one `Particle` in a `ParticleWorld`, with its own mass, muzzle velocity,
 * gravity scale and damping. The dashed line is the same shot with no damping, from
 * the closed-form `x₀ + v₀t + ½at²`, so the gap between it and the trail is what damping did.
 * Shots fly along +Z and the range lines are 10 m apart, with a brighter line every 50 m.
 */

interface Preset {
    id: string;
    label: string;
    mass: number; // kg
    velocity: Readonly<Vec3Like>; // m/s
    gravityScale: number; // multiple of the world's gravity; negative rises
    damping: number; // fraction of velocity kept per second
    radius: number; // m, enlarged so shots are visible from the camera
    color: number;
}

const PRESETS: readonly Preset[] = [
    {
        id: "pistol",
        label: "Pistol",
        mass: 2,
        velocity: { x: 0, y: 0, z: 35 },
        gravityScale: 0.1,
        damping: 0.99,
        radius: 0.3,
        color: 0xb0b8c4,
    },
    {
        id: "artillery",
        label: "Artillery",
        mass: 200,
        velocity: { x: 0, y: 30, z: 40 },
        gravityScale: 2,
        damping: 0.99,
        radius: 0.6,
        color: 0x46a758,
    },
    {
        id: "fireball",
        label: "Fireball",
        mass: 1,
        velocity: { x: 0, y: 0, z: 10 },
        gravityScale: -0.06,
        damping: 0.9,
        radius: 0.8,
        color: 0xe8833a,
    },
    {
        id: "laser",
        label: "Laser",
        mass: 0.1,
        velocity: { x: 0, y: 0, z: 100 },
        gravityScale: 0,
        damping: 0.99,
        radius: 0.2,
        color: 0xff6b6f,
    },
];

const MUZZLE: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1.5, z: 0 }); // m
const MAX_SHOTS = 8;
const LIFETIME = 5; // s
const RANGE_LENGTH = 200; // m
const RANGE_HALF_WIDTH = 15; // m
const MINOR_SPACING = 10; // m
const MAJOR_SPACING = 50; // m
const RANGE_HEIGHT = 0.02; // m, just above the shared grid
const AUTO_FIRE_INTERVAL = 1.5; // s
const TRAIL_INTERVAL = 0.05; // s
const TRAIL_POINTS = Math.ceil(LIFETIME / TRAIL_INTERVAL) + 2;
const IDEAL_POINTS = 128;
const VELOCITY_ARROW_SCALE = 0.1; // m of arrow per m/s
const READOUT_INTERVAL_MS = 250;

// Scratch objects, reused every update.
const _blended = new Vec3();
const _point = new Vec3();

/** One projectile: its particle, what draws it, and what it has done so far. */
class Shot {
    readonly particle = new Particle();
    readonly previous = new Vec3();
    readonly mesh = new Mesh(new SphereGeometry(1, 16, 12), new MeshStandardMaterial());
    readonly arrow = new VectorArrow(MUTED);
    readonly material = new LineBasicMaterial();
    readonly trail = new Polyline(TRAIL_POINTS, this.material);
    active = false;
    age = 0;
    apex = 0;
    trailCount = 0;
    nextTrailAge = 0;

    constructor() {
        this.mesh.visible = false;
        this.arrow.visible = false;
    }
}

/** Whether a shot at `position` and `age` has finished. */
function hasEnded(position: Vec3Like, age: number): boolean {
    return position.y < 0 || position.z > RANGE_LENGTH || age > LIFETIME;
}

/** Lines across the range, every `spacing` m, skipping multiples of `skipEvery` if given. */
function makeRangeLines(spacing: number, color: number, skipEvery = 0): LineSegments {
    const vertices: number[] = [];
    for (let z = 0; z <= RANGE_LENGTH; z += spacing) {
        if (skipEvery > 0 && z % skipEvery === 0) continue;
        vertices.push(-RANGE_HALF_WIDTH, RANGE_HEIGHT, z);
        vertices.push(RANGE_HALF_WIDTH, RANGE_HEIGHT, z);
    }
    const geometry = new BufferGeometry().setAttribute(
        "position",
        new Float32BufferAttribute(vertices, 3),
    );
    return new LineSegments(geometry, new LineBasicMaterial({ color }));
}

function getPreset(id: string): Preset {
    return PRESETS.find((preset) => preset.id === id) ?? (PRESETS[0] as Preset);
}

class BallisticsDemo implements Demo {
    readonly panel = document.createElement("aether-ballistics-panel");

    #world = new ParticleWorld();
    #group = new Group();
    #shots: Shot[] = [];
    #nextShot = 0;
    #preset = PRESETS[0] as Preset;
    #damping = this.#preset.damping;
    #autoFire = true;
    #fireTimer = 0;
    #lastShot: ShotReport | null = null;
    #lastReadoutMs = -Infinity;
    #ideal = new Polyline(
        IDEAL_POINTS,
        new LineDashedMaterial({ color: MUTED, dashSize: 1.5, gapSize: 1 }),
    );

    constructor() {
        const muzzle = new Mesh(
            new BoxGeometry(0.6, MUZZLE.y, 0.6),
            new MeshStandardMaterial({ color: 0x5d6673 }),
        );
        muzzle.position.set(MUZZLE.x, MUZZLE.y / 2, MUZZLE.z);
        this.#group.add(
            muzzle,
            this.#ideal,
            makeRangeLines(MINOR_SPACING, 0x3a4250, MAJOR_SPACING),
            makeRangeLines(MAJOR_SPACING, 0x8b95a3),
        );
        for (let i = 0; i < MAX_SHOTS; i++) {
            const shot = new Shot();
            this.#shots.push(shot);
            this.#group.add(shot.mesh, shot.arrow, shot.trail);
        }
        this.#drawIdealPath();

        this.panel.addEventListener("preset-change", (e) => {
            this.#preset = getPreset((e as CustomEvent<string>).detail);
            this.#damping = this.#preset.damping;
            this.#drawIdealPath();
            this.#pushInputs();
        });
        this.panel.addEventListener("damping-change", (e) => {
            this.#damping = (e as CustomEvent<number>).detail;
            this.#pushInputs();
        });
        this.panel.addEventListener("auto-fire-change", (e) => {
            this.#autoFire = (e as CustomEvent<boolean>).detail;
            this.#fireTimer = 0;
            this.#pushInputs();
        });
        this.panel.addEventListener("fire", () => {
            this.#fire();
            this.#fireTimer = AUTO_FIRE_INTERVAL;
        });
        this.panel.presets = PRESETS.map(({ id, label }) => ({ value: id, label }));
        this.#pushInputs();
    }

    /** Passes the input state back to the panel (its inputs are controlled). */
    #pushInputs(): void {
        const { id, mass, velocity, gravityScale } = this.#preset;
        this.panel.preset = id;
        this.panel.damping = this.#damping;
        this.panel.autoFire = this.#autoFire;
        this.panel.spec = {
            mass,
            speed: Math.hypot(velocity.x, velocity.y, velocity.z),
            acceleration: Math.abs(gravityScale) * this.#world.gravity.magnitude(),
        };
    }

    /** Traces the current preset with no damping, ending where a real shot would. */
    #drawIdealPath(): void {
        const { velocity: v, gravityScale } = this.#preset;
        const dt = LIFETIME / (IDEAL_POINTS - 1);
        let count = 0;
        for (let i = 0; i < IDEAL_POINTS; i++) {
            const t = i * dt;
            _point
                .copy(MUZZLE)
                .addScaled(v, t)
                .addScaled(this.#world.gravity, 0.5 * gravityScale * t * t);
            if (hasEnded(_point, t)) break;
            this.#ideal.setPoint(count++, _point);
        }
        this.#ideal.setCount(count);
        this.#ideal.computeLineDistances();
    }

    /** Launches the current preset, reusing the oldest shot's slot. */
    #fire(): void {
        const shot = this.#shots[this.#nextShot] as Shot;
        this.#nextShot = (this.#nextShot + 1) % MAX_SHOTS;
        if (shot.active) this.#removeFromWorld(shot);

        const { mass, velocity, gravityScale, radius, color } = this.#preset;
        const p = shot.particle;
        p.setMass(mass);
        p.damping = this.#damping;
        p.position.copy(MUZZLE);
        p.velocity.copy(velocity);
        p.gravityScale = gravityScale;
        p.clearAccumulator();
        this.#world.particles.push(p);

        shot.previous.copy(p.position);
        shot.active = true;
        shot.age = 0;
        shot.apex = p.position.y;
        shot.trailCount = 0;
        shot.nextTrailAge = 0;
        shot.mesh.scale.setScalar(radius);
        (shot.mesh.material as MeshStandardMaterial).color.setHex(color);
        shot.material.color.setHex(color);
        this.#recordTrailPoint(shot);
    }

    #removeFromWorld(shot: Shot): void {
        const index = this.#world.particles.indexOf(shot.particle);
        if (index !== -1) this.#world.particles.splice(index, 1);
        shot.active = false;
    }

    #recordTrailPoint(shot: Shot): void {
        shot.trail.setPoint(shot.trailCount++, shot.particle.position);
        shot.nextTrailAge = shot.age + TRAIL_INTERVAL;
    }

    /** Ends a shot: reports it and leaves its trail in place until the slot is reused. */
    #finish(shot: Shot): void {
        const p = shot.particle;
        // A shot that hit the ground stepped past it, so measure from the crossing point.
        const end = _point.copy(p.position);
        if (p.position.y < 0) {
            const t = shot.previous.y / (shot.previous.y - p.position.y);
            end.copy(shot.previous).lerp(p.position, t);
        }
        shot.trail.setPoint(shot.trailCount, end);
        shot.trail.setCount(shot.trailCount + 1);
        this.#lastShot = {
            flightTime: shot.age,
            range: end.z - MUZZLE.z,
            apex: shot.apex,
            finalSpeed: p.velocity.magnitude(),
        };
        this.#removeFromWorld(shot);
    }

    mount(scene: Scene, view: DemoView): void {
        view.setCamera({ x: -34, y: 30, z: -48 }, { x: 0, y: 4, z: 62 });
        scene.add(this.#group);
    }

    step(dt: number): void {
        this.#fireTimer -= dt;
        if (this.#autoFire && this.#fireTimer <= 0) {
            this.#fire();
            this.#fireTimer = AUTO_FIRE_INTERVAL;
        }

        for (const shot of this.#shots) if (shot.active) shot.previous.copy(shot.particle.position);

        this.#world.step(dt);

        for (const shot of this.#shots) {
            if (!shot.active) continue;
            const { position } = shot.particle;
            shot.age += dt;
            shot.apex = Math.max(shot.apex, position.y);
            if (hasEnded(position, shot.age)) this.#finish(shot);
            else if (shot.age >= shot.nextTrailAge) this.#recordTrailPoint(shot);
        }
    }

    sync(alpha: number): void {
        for (const shot of this.#shots) {
            shot.mesh.visible = shot.active;
            if (!shot.active) {
                shot.arrow.visible = false;
                continue;
            }
            _blended.copy(shot.previous).lerp(shot.particle.position, alpha);
            shot.mesh.position.copy(_blended);
            shot.arrow.update(_blended, shot.particle.velocity, VELOCITY_ARROW_SCALE);
            // The newest trail point follows the shot between recorded points.
            shot.trail.setPoint(shot.trailCount, _blended);
            shot.trail.setCount(shot.trailCount + 1);
        }

        const now = performance.now();
        if (now - this.#lastReadoutMs < READOUT_INTERVAL_MS) return;
        this.#lastReadoutMs = now;
        this.panel.inFlight = this.#world.particles.length;
        this.panel.lastShot = this.#lastShot;
    }

    unmount(scene: Scene): void {
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

export const ballisticsDemo: DemoInfo = {
    id: "ballistics",
    title: "Ballistics",
    phase: 2,
    summary:
        "Four projectiles, each a particle with its own mass, velocity, gravity scale and " +
        "damping. The dashed line is the same shot with no damping. Range lines are 10 m apart.",
    create: () => new BallisticsDemo(),
};
