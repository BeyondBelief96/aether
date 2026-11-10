import {
    BoxGeometry,
    Group,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    Plane,
    SphereGeometry,
    Vector3,
    type Scene,
} from "three";
import {
    Particle,
    ParticleAnchoredSpring,
    ParticleBungee,
    ParticleSpring,
    ParticleWorld,
    Vec3,
    type ParticleForceGenerator,
    type Vec3Like,
} from "aether-physics";
import { formatNumber } from "../ui/format/format";
import "../ui/panels/springs-panel";
import type { ReadoutSection } from "../ui/panels/springs-panel";
import { MUTED, SERIES_COLORS, WARN } from "./helpers/colors";
import { DragHandle } from "./helpers/drag-handle";
import { Polyline } from "./helpers/polyline";
import { SpringCoil } from "./helpers/spring-coil";
import { disposeObject } from "./helpers/three";
import { VectorArrow } from "./helpers/vector-arrow";
import type { Demo, DemoInfo, DemoView } from "./types";

/**
 * Phase 3: the three particle springs side by side, sharing one stiffness and rest length.
 *
 * Left: a bob on a `ParticleAnchoredSpring`. Drag the anchor block to move the spring's
 * anchor. Middle: two particles with gravity off, joined by a `ParticleSpring` registered on
 * each end; the forces are equal and opposite, so their total momentum stays zero while they
 * spin and oscillate. Right: a jumper on a `ParticleBungee` from an immovable particle; the
 * rope is grey while slack and pulls only once it is longer than its rest length.
 *
 * Orange arrows show the force each generator applies.
 */

const MASS = 1; // kg
const DEFAULT_STIFFNESS = 20; // N/m
const DEFAULT_REST_LENGTH = 2; // m
const DEFAULT_DAMPING = 0.9; // fraction of velocity kept per second
const ANCHORED_X = -6; // m
const PAIR_X = 0; // m
const BUNGEE_X = 6; // m
const TOP = 7; // m, height of the anchor and the bungee's fixed end
const PAIR_HEIGHT = 4; // m
const PAIR_SPIN_SPEED = 1.5; // m/s, each end's starting speed across the spring
const BOB_RADIUS = 0.3; // m
const FORCE_ARROW_SCALE = 0.04; // m of arrow per N
const MAX_ARROW_FORCE = 100; // N, where the drawn arrow stops growing
const READOUT_INTERVAL_MS = 250;

const ANCHOR_START: Readonly<Vec3Like> = Object.freeze({ x: ANCHORED_X, y: TOP, z: 0 });
const BUNGEE_TOP: Readonly<Vec3Like> = Object.freeze({ x: BUNGEE_X, y: TOP, z: 0 });

// Scratch objects, reused every update.
const _blended = new Vec3();
const _force = new Vec3();
const _momentum = new Vec3();
const _hit = new Vector3();
const _probe = new Particle();

/** A movable particle, its position at the start of the step, and what draws it. */
class Body {
    readonly particle = new Particle();
    readonly previous = new Vec3();
    readonly mesh: Mesh;
    readonly arrow: VectorArrow;

    constructor(color: number, group: Group) {
        this.particle.setMass(MASS);
        this.mesh = new Mesh(
            new SphereGeometry(BOB_RADIUS, 24, 16),
            new MeshStandardMaterial({ color }),
        );
        this.arrow = new VectorArrow(WARN);
        group.add(this.mesh, this.arrow);
    }

    /** Puts the particle at `position` with `velocity`, as if it had always been there. */
    place(position: Vec3Like, velocity: Vec3Like = { x: 0, y: 0, z: 0 }): void {
        this.particle.position.copy(position);
        this.particle.velocity.copy(velocity);
        this.particle.clearAccumulator();
        this.previous.copy(position);
    }

    /** Moves the mesh between the previous and current positions, and returns where. */
    blend(alpha: number): Vector3 {
        _blended.copy(this.previous).lerp(this.particle.position, alpha);
        return this.mesh.position.copy(_blended);
    }

    /** Draws the force `generator` would apply to this particle in its current state. */
    drawForce(generator: ParticleForceGenerator): void {
        const force = forceOn(this.particle, generator);
        const magnitude = force.magnitude();
        if (magnitude > MAX_ARROW_FORCE) force.scale(MAX_ARROW_FORCE / magnitude);
        this.arrow.update(this.mesh.position, force, FORCE_ARROW_SCALE);
    }
}

/** The force `generator` applies to `particle`, measured on a stand-in so nothing is changed. */
function forceOn(particle: Particle, generator: ParticleForceGenerator): Vec3 {
    _probe.position.copy(particle.position);
    _probe.velocity.copy(particle.velocity);
    _probe.inverseMass = particle.inverseMass;
    _probe.clearAccumulator();
    generator.updateForce(_probe, 0);
    return _force.copy(_probe.forceAccum);
}

function makeBlock(): Mesh {
    return new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({ color: 0x5d6673 }));
}

class SpringsDemo implements Demo {
    readonly panel = document.createElement("aether-springs-panel");

    #world = new ParticleWorld();
    #group = new Group();
    #stiffness = DEFAULT_STIFFNESS;
    #restLength = DEFAULT_REST_LENGTH;
    #damping = DEFAULT_DAMPING;
    #dt = 1 / 60;
    #lastReadoutMs = -Infinity;

    // Left: anchored spring.
    #anchorBlock = makeBlock();
    #anchoredBob: Body;
    #anchoredCoil: SpringCoil;
    #anchored: ParticleAnchoredSpring;
    #drag: DragHandle | null = null;
    #dragPlane = new Plane(new Vector3(0, 0, 1), 0);

    // Middle: a free pair joined by one spring on each end.
    #pairA: Body;
    #pairB: Body;
    #pairCoil: SpringCoil;
    #springOnA: ParticleSpring;
    #springOnB: ParticleSpring;

    // Right: bungee from an immovable particle.
    #bungeeTop = new Particle();
    #jumper: Body;
    #ropeMaterial = new LineBasicMaterial({ color: MUTED });
    #rope = new Polyline(2, this.#ropeMaterial);
    #bungee: ParticleBungee;

    constructor() {
        const [anchoredColor, pairColor, bungeeColor] = SERIES_COLORS;

        this.#anchoredBob = new Body(anchoredColor, this.#group);
        this.#anchoredCoil = new SpringCoil(new LineBasicMaterial({ color: anchoredColor }));
        this.#anchorBlock.position.copy(ANCHOR_START);

        this.#pairA = new Body(pairColor, this.#group);
        this.#pairB = new Body(pairColor, this.#group);
        this.#pairCoil = new SpringCoil(new LineBasicMaterial({ color: pairColor }));

        this.#bungeeTop.setMass(Infinity);
        this.#bungeeTop.position.copy(BUNGEE_TOP);
        this.#jumper = new Body(bungeeColor, this.#group);
        this.#rope.setCount(2);
        const bungeeBlock = makeBlock();
        bungeeBlock.position.copy(BUNGEE_TOP);

        this.#group.add(
            this.#anchorBlock,
            this.#anchoredCoil,
            this.#pairCoil,
            bungeeBlock,
            this.#rope,
        );

        for (const body of [this.#anchoredBob, this.#pairA, this.#pairB, this.#jumper]) {
            this.#world.particles.push(body.particle);
        }
        // The pair floats so its centre of mass stays put.
        this.#pairA.particle.gravityScale = 0;
        this.#pairB.particle.gravityScale = 0;

        // Assigned for real by #rebuildForces; these keep the fields definitely assigned.
        this.#anchored = new ParticleAnchoredSpring(ANCHOR_START, 0, 0);
        this.#springOnA = new ParticleSpring(this.#pairB.particle, 0, 0);
        this.#springOnB = new ParticleSpring(this.#pairA.particle, 0, 0);
        this.#bungee = new ParticleBungee(this.#bungeeTop, 0, 0);
        this.#rebuildForces();
        this.#restart();

        // Generators keep their parameters fixed, so new values mean new generators.
        this.panel.addEventListener("stiffness-change", (e) => {
            this.#stiffness = (e as CustomEvent<number>).detail;
            this.#rebuildForces();
            this.#pushInputs();
        });
        this.panel.addEventListener("rest-length-change", (e) => {
            this.#restLength = (e as CustomEvent<number>).detail;
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

    /** Replaces every generator with one using the current stiffness and rest length. */
    #rebuildForces(): void {
        const k = this.#stiffness;
        const rest = this.#restLength;
        const registry = this.#world.forceRegistry;
        registry.clear();

        this.#anchored = new ParticleAnchoredSpring(this.#anchored.anchor, k, rest);
        this.#springOnA = new ParticleSpring(this.#pairB.particle, k, rest);
        this.#springOnB = new ParticleSpring(this.#pairA.particle, k, rest);
        this.#bungee = new ParticleBungee(this.#bungeeTop, k, rest);

        registry.add(this.#anchoredBob.particle, this.#anchored);
        registry.add(this.#pairA.particle, this.#springOnA);
        registry.add(this.#pairB.particle, this.#springOnB);
        registry.add(this.#jumper.particle, this.#bungee);
    }

    #applyDamping(): void {
        for (const particle of this.#world.particles) particle.damping = this.#damping;
    }

    #restart(): void {
        this.#anchored.anchor.copy(ANCHOR_START);
        this.#anchoredBob.place({ x: ANCHORED_X + 1.5, y: TOP - 1, z: 0 });

        // Stretched past rest length and spinning, so it both oscillates and turns.
        const half = (this.#restLength + 1) / 2;
        this.#pairA.place(
            { x: PAIR_X - half, y: PAIR_HEIGHT, z: 0 },
            { x: 0, y: -PAIR_SPIN_SPEED, z: 0 },
        );
        this.#pairB.place(
            { x: PAIR_X + half, y: PAIR_HEIGHT, z: 0 },
            { x: 0, y: PAIR_SPIN_SPEED, z: 0 },
        );

        // Starts just below the fixed end and to one side, so it falls slack, then swings.
        this.#jumper.place({ x: BUNGEE_X + 0.5, y: TOP - 0.3, z: 0 });

        this.#applyDamping();
        this.#pushReadouts();
    }

    /** Passes the input state back to the panel (its inputs are controlled). */
    #pushInputs(): void {
        this.panel.stiffness = this.#stiffness;
        this.panel.restLength = this.#restLength;
        this.panel.damping = this.#damping;
    }

    #pushReadouts(): void {
        const omega = Math.sqrt(this.#stiffness / MASS);
        const anchoredLength = this.#anchoredBob.particle.position.distanceTo(
            this.#anchored.anchor,
        );
        const anchoredForce = forceOn(this.#anchoredBob.particle, this.#anchored).magnitude();

        const pairLength = this.#pairA.particle.position.distanceTo(this.#pairB.particle.position);
        _momentum
            .copy(this.#pairA.particle.velocity)
            .scale(MASS)
            .addScaled(this.#pairB.particle.velocity, MASS);

        const jumperLength = this.#jumper.particle.position.distanceTo(this.#bungeeTop.position);
        const jumperForce = forceOn(this.#jumper.particle, this.#bungee).magnitude();
        const stretch = jumperLength - this.#restLength;

        const sections: ReadoutSection[] = [
            {
                title: "Anchored spring",
                color: "var(--series-1)",
                rows: [
                    ["Stretch", `${formatNumber(anchoredLength - this.#restLength, 2)} m`],
                    ["Force", `${formatNumber(anchoredForce, 2)} N`],
                    ["ω·dt", formatNumber(omega * this.#dt, 2)],
                ],
            },
            {
                title: "Spring pair",
                color: "var(--series-2)",
                rows: [
                    ["Stretch", `${formatNumber(pairLength - this.#restLength, 2)} m`],
                    ["Total momentum", `${formatNumber(_momentum.magnitude(), 2)} kg·m/s`],
                    // Each end sees twice the stiffness about the fixed centre of mass.
                    ["ω·dt", formatNumber(Math.SQRT2 * omega * this.#dt, 2)],
                ],
            },
            {
                title: "Bungee",
                color: "var(--series-3)",
                rows: [
                    ["Stretch", stretch > 0 ? `${formatNumber(stretch, 2)} m` : "slack"],
                    ["Force", `${formatNumber(jumperForce, 2)} N`],
                ],
            },
        ];
        this.panel.sections = sections;
    }

    mount(scene: Scene, view: DemoView): void {
        view.setCamera({ x: 0, y: 5, z: 18 }, { x: 0, y: 4, z: 0 });
        scene.add(this.#group);
        this.#drag = new DragHandle(view, this.#anchorBlock, (ray) => {
            if (ray.intersectPlane(this.#dragPlane, _hit)) this.#anchored.anchor.copy(_hit);
        });
    }

    step(dt: number): void {
        this.#dt = dt;
        for (const body of [this.#anchoredBob, this.#pairA, this.#pairB, this.#jumper]) {
            body.previous.copy(body.particle.position);
        }
        this.#world.step(dt);
    }

    sync(alpha: number): void {
        this.#anchorBlock.position.copy(this.#anchored.anchor);
        this.#anchoredCoil.update(this.#anchored.anchor, this.#anchoredBob.blend(alpha));
        this.#anchoredBob.drawForce(this.#anchored);

        this.#pairCoil.update(this.#pairA.blend(alpha), this.#pairB.blend(alpha));
        this.#pairA.drawForce(this.#springOnA);
        this.#pairB.drawForce(this.#springOnB);

        const jumper = this.#jumper.blend(alpha);
        this.#rope.setPoint(0, this.#bungeeTop.position);
        this.#rope.setPoint(1, jumper);
        const taut = this.#bungeeTop.position.distanceTo(jumper) > this.#restLength;
        this.#ropeMaterial.color.setHex(taut ? (SERIES_COLORS[2] as number) : MUTED);
        this.#jumper.drawForce(this.#bungee);

        const now = performance.now();
        if (now - this.#lastReadoutMs < READOUT_INTERVAL_MS) return;
        this.#lastReadoutMs = now;
        this.#pushReadouts();
    }

    unmount(scene: Scene): void {
        this.#drag?.dispose();
        this.#drag = null;
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

export const springsDemo: DemoInfo = {
    id: "springs",
    title: "Springs",
    phase: 3,
    summary:
        "An anchored spring you can drag, a free pair joined by a spring on each end, and a " +
        "bungee that only pulls. Arrows show each spring's force.",
    create: () => new SpringsDemo(),
};
