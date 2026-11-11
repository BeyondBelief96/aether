import {
    BoxGeometry,
    EdgesGeometry,
    Group,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshStandardMaterial,
    Vector3,
    type Scene,
} from "three";
import { Particle, ParticleBuoyancy, ParticleWorld, Vec3, type Vec3Like } from "aether-physics";
import { formatNumber } from "../ui/format/format";
import "../ui/panels/buoyancy-panel";
import type { FloatReadout } from "../ui/panels/buoyancy-panel";
import { MUTED, SERIES_COLORS, WARN } from "./helpers/colors";
import { disposeObject } from "./helpers/three";
import { VectorArrow } from "./helpers/vector-arrow";
import type { Demo, DemoInfo, DemoView } from "./types";

/**
 * Phase 3: four 1 m cubes of different densities dropped into a tank, each with its own
 * `ParticleBuoyancy`.
 *
 * A cube spans exactly `maxDepth` above and below its centre, so the generator's linear
 * submerged fraction is exact. A floating cube settles where buoyancy equals its weight, with
 * `body density / liquid density` of it under the surface; a cube denser than the liquid sinks
 * to the tank floor.
 *
 * Orange arrows show buoyancy and grey arrows show weight. The tank floor is a clamp in the
 * demo, not a contact.
 */

const SIZE = 1; // m, cube edge
const HALF = SIZE / 2; // m, the generator's maxDepth
const VOLUME = SIZE ** 3; // m³
const GRAVITY = 9.81; // m/s²
const SURFACE = 4; // m, height of the liquid surface
const FLOOR = 0; // m, height of the tank floor, on the ground grid
const TANK_WIDTH = 14; // m
const TANK_DEPTH = 3; // m, along z
const DROP_HEIGHT = 6.5; // m, starting height of each cube's centre
const SPACING = 3; // m between cube centres
const DEFAULT_LIQUID_DENSITY = 1000; // kg/m³
const DEFAULT_DAMPING = 0.4; // fraction of velocity kept per second
const FORCE_ARROW_SCALE = 1 / 8000; // m of arrow per N
const READOUT_INTERVAL_MS = 250;

/** Name and density in kg/m³ of each cube, left to right. */
const MATERIALS = [
    { name: "Cork", density: 240 },
    { name: "Pine", density: 500 },
    { name: "Ice", density: 920 },
    { name: "Brick", density: 1900 },
] as const;

// Scratch objects, reused every update.
const _blended = new Vec3();
const _force = new Vec3();
const _weight = new Vec3();
const _probe = new Particle();

/** A cube's particle, its position at the start of the step, and what draws it. */
class Float {
    readonly particle = new Particle();
    readonly previous = new Vec3();
    readonly mesh: Mesh;
    readonly buoyancyArrow = new VectorArrow(WARN);
    readonly weightArrow = new VectorArrow(MUTED);
    readonly start: Readonly<Vec3Like>;
    readonly name: string;
    readonly density: number; // kg/m³
    buoyancy: ParticleBuoyancy;

    constructor(name: string, density: number, color: number, x: number, group: Group) {
        this.name = name;
        this.density = density;
        this.particle.setMass(density * VOLUME);
        this.start = Object.freeze({ x, y: DROP_HEIGHT, z: 0 });
        this.mesh = new Mesh(
            new BoxGeometry(SIZE, SIZE, SIZE),
            new MeshStandardMaterial({ color }),
        );
        this.buoyancy = new ParticleBuoyancy(HALF, VOLUME, SURFACE);
        group.add(this.mesh, this.buoyancyArrow, this.weightArrow);
    }

    place(): void {
        this.particle.position.copy(this.start);
        this.particle.velocity.set(0, 0, 0);
        this.particle.clearAccumulator();
        this.previous.copy(this.start);
    }

    /** Fraction of the cube below the surface, in [0, 1]. */
    submerged(): number {
        const top = SURFACE + HALF;
        return Math.min(Math.max((top - this.particle.position.y) / SIZE, 0), 1);
    }

    /** The force the buoyancy generator applies in the current state. */
    buoyancyForce(): Vec3 {
        _probe.position.copy(this.particle.position);
        _probe.inverseMass = this.particle.inverseMass;
        _probe.clearAccumulator();
        this.buoyancy.updateForce(_probe, 0);
        return _force.copy(_probe.forceAccum);
    }

    sync(alpha: number): void {
        _blended.copy(this.previous).lerp(this.particle.position, alpha);
        const centre = this.mesh.position.copy(_blended);
        this.buoyancyArrow.update(centre, this.buoyancyForce(), FORCE_ARROW_SCALE);
        _weight.set(0, -this.particle.mass * GRAVITY, 0);
        this.weightArrow.update(centre, _weight, FORCE_ARROW_SCALE);
    }
}

class BuoyancyDemo implements Demo {
    readonly panel = document.createElement("aether-buoyancy-panel");

    #world = new ParticleWorld();
    #group = new Group();
    #floats: Float[];
    #liquidDensity = DEFAULT_LIQUID_DENSITY;
    #damping = DEFAULT_DAMPING;
    #lastReadoutMs = -Infinity;

    constructor() {
        this.#world.gravity.set(0, -GRAVITY, 0);
        const left = -((MATERIALS.length - 1) * SPACING) / 2;
        this.#floats = MATERIALS.map(
            ({ name, density }, i) =>
                new Float(
                    name,
                    density,
                    SERIES_COLORS[i] as number,
                    left + i * SPACING,
                    this.#group,
                ),
        );
        for (const float of this.#floats) this.#world.particles.push(float.particle);
        this.#group.add(...makeTank());

        this.#rebuildForces();
        this.#restart();

        this.panel.addEventListener("liquid-density-change", (e) => {
            this.#liquidDensity = (e as CustomEvent<number>).detail;
            this.#rebuildForces();
            this.#pushInputs();
        });
        this.panel.addEventListener("damping-change", (e) => {
            this.#damping = (e as CustomEvent<number>).detail;
            this.#applyDamping();
            this.#pushInputs();
        });
        this.panel.addEventListener("restart", () => this.#restart());
        this.#pushInputs();
        this.#pushReadouts();
    }

    /** Generators keep their parameters fixed, so a new density means new generators. */
    #rebuildForces(): void {
        const registry = this.#world.forceRegistry;
        registry.clear();
        for (const float of this.#floats) {
            float.buoyancy = new ParticleBuoyancy(
                HALF,
                VOLUME,
                SURFACE,
                this.#liquidDensity,
                GRAVITY,
            );
            registry.add(float.particle, float.buoyancy);
        }
    }

    #applyDamping(): void {
        for (const particle of this.#world.particles) particle.damping = this.#damping;
    }

    #restart(): void {
        for (const float of this.#floats) float.place();
        this.#applyDamping();
        this.#pushReadouts();
    }

    /** Passes the input state back to the panel (its inputs are controlled). */
    #pushInputs(): void {
        this.panel.liquidDensity = this.#liquidDensity;
        this.panel.damping = this.#damping;
    }

    #pushReadouts(): void {
        const readouts: FloatReadout[] = this.#floats.map((float, i) => {
            const ratio = float.density / this.#liquidDensity;
            return {
                title: float.name,
                color: `var(--series-${i + 1})`,
                rows: [
                    ["Density", `${formatNumber(float.density, 0)} kg/m³`],
                    ["Submerged", `${formatNumber(float.submerged() * 100, 0)} %`],
                    ["At rest", ratio < 1 ? `${formatNumber(ratio * 100, 0)} %` : "sinks"],
                    ["Buoyancy", `${formatNumber(float.buoyancyForce().y, 0)} N`],
                    ["Weight", `${formatNumber(float.particle.mass * GRAVITY, 0)} N`],
                ],
            };
        });
        this.panel.floats = readouts;
    }

    mount(scene: Scene, view: DemoView): void {
        view.setCamera({ x: 0, y: 6, z: 16 }, { x: 0, y: 3, z: 0 });
        scene.add(this.#group);
    }

    step(dt: number): void {
        for (const float of this.#floats) float.previous.copy(float.particle.position);
        this.#world.step(dt);
        for (const { particle } of this.#floats) {
            if (particle.position.y >= FLOOR + HALF) continue;
            particle.position.y = FLOOR + HALF;
            if (particle.velocity.y < 0) particle.velocity.y = 0;
        }
    }

    sync(alpha: number): void {
        for (const float of this.#floats) float.sync(alpha);

        const now = performance.now();
        if (now - this.#lastReadoutMs < READOUT_INTERVAL_MS) return;
        this.#lastReadoutMs = now;
        this.#pushReadouts();
    }

    unmount(scene: Scene): void {
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

/** A translucent block of liquid from the floor to the surface, with an outline. */
function makeTank(): [Mesh, LineSegments] {
    const height = SURFACE - FLOOR;
    const geometry = new BoxGeometry(TANK_WIDTH, height, TANK_DEPTH);
    const centre = new Vector3(0, FLOOR + height / 2, 0);

    const liquid = new Mesh(
        geometry,
        new MeshStandardMaterial({
            color: 0x2f7fd8,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
        }),
    );
    liquid.position.copy(centre);

    const outline = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({ color: MUTED }),
    );
    outline.position.copy(centre);
    return [liquid, outline];
}

export const buoyancyDemo: DemoInfo = {
    id: "buoyancy",
    title: "Buoyancy",
    phase: 3,
    summary:
        "Cubes of cork, pine, ice and brick dropped into a tank. Each floats with its density " +
        "ratio submerged, or sinks. Change the liquid's density to see them rise and fall.",
    create: () => new BuoyancyDemo(),
};
