import { Particle, ParticleCable, ParticleRod, ParticleWorld } from "aether-physics";

/**
 * Two pendulums side by side, one bob on a `ParticleRod` and one on a `ParticleCable`, kicked
 * sideways from hanging at the same speed. A rod pushes as well as pulls, so its bob stays on the
 * circle; a cable only pulls, so once gravity needs more than the cable can give, its bob leaves
 * the circle and falls inside it until the cable snaps taut.
 */

export interface PendulumsOptions {
    /** Height of both pivots, in meters. */
    readonly pivotHeight: number;
    /** Length of the rod and the cable, in meters. */
    readonly length: number;
    /** Distance between the two pivots along the swing, in meters. */
    readonly spacing: number;
    /** Mass of each bob, in kilograms. */
    readonly mass: number;
    /** Coefficient of restitution when the cable snaps taut, in [0, 1]. */
    readonly restitution: number;
}

export interface Pendulum<L extends ParticleRod | ParticleCable = ParticleRod | ParticleCable> {
    readonly pivot: Particle;
    readonly bob: Particle;
    readonly link: L;
}

/** How far short of its length a cable counts as slack, in meters. */
const SLACK_TOLERANCE = 0.002;

export class PendulumsSim {
    readonly world = new ParticleWorld();
    readonly rod: Pendulum<ParticleRod>;
    readonly cable: Pendulum<ParticleCable>;
    readonly length: number;

    constructor(options: PendulumsOptions) {
        this.length = options.length;
        const { length, restitution } = options;
        const make = <L extends ParticleRod | ParticleCable>(
            x: number,
            join: (pivot: Particle, bob: Particle) => L,
        ): Pendulum<L> => {
            const pivot = new Particle();
            pivot.inverseMass = 0;
            pivot.position.set(x, options.pivotHeight, 0);
            const bob = new Particle();
            bob.setMass(options.mass);
            bob.damping = 1;
            const link = join(pivot, bob);
            this.world.particles.push(bob);
            this.world.contactGenerators.push(link);
            return { pivot, bob, link };
        };
        this.rod = make(-options.spacing / 2, (pivot, bob) => new ParticleRod(pivot, bob, length));
        this.cable = make(
            options.spacing / 2,
            (pivot, bob) => new ParticleCable(pivot, bob, length, restitution),
        );
        this.kick(0);
    }

    get pendulums(): readonly Pendulum[] {
        return [this.rod, this.cable];
    }

    setRestitution(restitution: number): void {
        this.cable.link.restitution = restitution;
    }

    /** Hangs both bobs straight down and sends them sideways at `speed` m/s. */
    kick(speed: number): void {
        for (const { pivot, bob } of this.pendulums) {
            bob.position.copy(pivot.position).y -= this.length;
            bob.velocity.set(speed, 0, 0);
            bob.lastAcceleration.set(0, 0, 0);
            bob.clearAccumulator();
        }
    }

    step(dt: number): void {
        this.world.step(dt);
    }

    /** Whether the cable is shorter than its length, so it pulls on nothing. */
    cableSlack(): boolean {
        return this.cable.link.currentLength() < this.length - SLACK_TOLERANCE;
    }

    /** Distance from the pivot to the bob, as a fraction of the link's length. */
    reach(pendulum: Pendulum): number {
        return pendulum.link.currentLength() / this.length;
    }

    /** Angle of the bob from hanging straight down, in radians, from 0 to π. */
    angle(pendulum: Pendulum): number {
        const { pivot, bob } = pendulum;
        const dx = bob.position.x - pivot.position.x;
        const dy = bob.position.y - pivot.position.y;
        return Math.atan2(Math.abs(dx), -dy);
    }

    /** Kinetic plus potential energy of the bob, relative to hanging at rest, in joules. */
    energy(pendulum: Pendulum): number {
        const { pivot, bob } = pendulum;
        const height = bob.position.y - (pivot.position.y - this.length);
        return bob.mass * (0.5 * bob.velocity.magnitudeSquared() - this.world.gravity.y * height);
    }

    /** Kick speed above which a bob swings past level: `√(2gL)`, in m/s. */
    levelSpeed(): number {
        return Math.sqrt(2 * -this.world.gravity.y * this.length);
    }

    /** Kick speed above which a rod carries its bob over the top: `√(4gL)`, in m/s. */
    rodLoopSpeed(): number {
        return Math.sqrt(4 * -this.world.gravity.y * this.length);
    }

    /** Kick speed above which a cable stays taut over the top: `√(5gL)`, in m/s. */
    cableLoopSpeed(): number {
        return Math.sqrt(5 * -this.world.gravity.y * this.length);
    }
}
