import { GroundContacts, Particle, ParticleWorld } from "aether-physics";

/**
 * Balls dropped side by side onto the ground, each with its own `GroundContacts` so each can
 * have its own restitution. Records the peak height between bounces, so the ratio of successive
 * peaks can be compared with `e²`.
 */

/** Peaks lower than this, in meters, count as resting. */
const REST_HEIGHT = 1e-3;

/** One ball and the record of its peaks and bounces. */
export class BounceBall {
    readonly particle: Particle;
    readonly ground: GroundContacts;
    private peak = 0;
    private priorPeak = 0;
    private hits = 0;
    private rebounds = 0;
    private rising = false;
    private airborne = true;

    constructor(particle: Particle, ground: GroundContacts) {
        this.particle = particle;
        this.ground = ground;
    }

    /** Height of the ball's bottom at the last peak, in meters. */
    get lastPeak(): number {
        return this.peak;
    }

    /** Height of the ball's bottom at the peak before `lastPeak`, in meters. */
    get previousPeak(): number {
        return this.priorPeak;
    }

    /** Number of times the ball has hit the ground. */
    get bounces(): number {
        return this.hits;
    }

    /** Number of peaks reached after a bounce. */
    get peaks(): number {
        return this.rebounds;
    }

    /** Clears the record for a ball held at rest `height` above the ground. */
    reset(height: number): void {
        this.peak = height;
        this.priorPeak = height;
        this.hits = 0;
        this.rebounds = 0;
        this.rising = false;
        this.airborne = height >= REST_HEIGHT;
    }

    /** `lastPeak / previousPeak`, or `undefined` before the first rebound peak or once at rest. */
    reboundRatio(): number | undefined {
        if (this.rebounds === 0 || this.priorPeak < REST_HEIGHT || this.peak < REST_HEIGHT) {
            return undefined;
        }
        return this.peak / this.priorPeak;
    }

    /** Updates the record from the ball's height above the ground after a step. */
    record(height: number): void {
        const rising = this.particle.velocity.y > 0;
        const airborne = height >= REST_HEIGHT;
        if (this.airborne && !airborne) this.hits++;
        if (this.rising && !rising) {
            this.setPeak(height);
            this.rebounds++;
        } else if (!rising && !airborne && this.peak >= REST_HEIGHT) {
            // Landed without rebounding: the ball's last peak is the ground.
            this.setPeak(0);
        }
        this.rising = rising;
        this.airborne = airborne;
    }

    private setPeak(height: number): void {
        this.priorPeak = this.peak;
        this.peak = height;
    }
}

export interface BounceOptions {
    readonly radius: number;
    readonly spacing: number;
    readonly restitutions: readonly number[];
    readonly height: number;
    readonly gravity: number;
}

export class BounceSim {
    readonly world = new ParticleWorld();
    readonly balls: BounceBall[];
    readonly radius: number;

    constructor(options: BounceOptions) {
        this.radius = options.radius;
        this.world.gravity.set(0, -options.gravity, 0);
        const left = (-(options.restitutions.length - 1) * options.spacing) / 2;
        this.balls = options.restitutions.map((restitution, i) => {
            const particle = new Particle();
            particle.damping = 1;
            particle.position.set(left + i * options.spacing, 0, 0);
            const ground = new GroundContacts([particle], options.radius, restitution);
            this.world.particles.push(particle);
            this.world.contactGenerators.push(ground);
            return new BounceBall(particle, ground);
        });
        this.drop(options.height);
    }

    /** Holds every ball at `height` above the ground, at rest, and lets go. */
    drop(height: number): void {
        for (const ball of this.balls) {
            ball.particle.position.y = this.radius + height;
            ball.particle.velocity.set(0, 0, 0);
            ball.particle.lastAcceleration.set(0, 0, 0);
            ball.reset(height);
        }
    }

    setRestitution(index: number, restitution: number): void {
        this.balls[index]!.ground.restitution = restitution;
    }

    setGravity(gravity: number): void {
        this.world.gravity.set(0, -gravity, 0);
    }

    step(dt: number): void {
        this.world.step(dt);
        for (const ball of this.balls) ball.record(this.heightOf(ball));
    }

    /** Height of the ball's bottom above the ground, in meters. */
    heightOf(ball: BounceBall): number {
        return ball.particle.position.y - this.radius;
    }

    /** Whether the ball has stopped bouncing. */
    atRest(ball: BounceBall): boolean {
        return (
            ball.bounces > 0 &&
            ball.lastPeak < REST_HEIGHT &&
            Math.abs(ball.particle.velocity.y) < 1e-3 &&
            this.heightOf(ball) < REST_HEIGHT
        );
    }
}
