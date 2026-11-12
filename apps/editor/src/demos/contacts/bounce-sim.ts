import { GroundContacts, Particle, ParticleWorld } from "aether-physics";

/**
 * Balls dropped side by side onto the ground, each with its own `GroundContacts` so each can
 * have its own restitution. Records the peak height between bounces, so the ratio of successive
 * peaks can be compared with `e²`.
 */

/** Peaks lower than this, in meters, count as resting. */
const REST_HEIGHT = 1e-3;

export interface BounceBall {
    readonly particle: Particle;
    readonly ground: GroundContacts;
    /** Height of the ball's bottom at the last peak, in meters. */
    lastPeak: number;
    /** Height of the ball's bottom at the peak before `lastPeak`, in meters. */
    previousPeak: number;
    /** Number of times the ball has hit the ground. */
    bounces: number;
    /** Number of peaks reached after a bounce. */
    peaks: number;
    /** Whether the ball was moving up at the end of the last step. */
    rising: boolean;
    /** Whether the ball was above the ground at the end of the last step. */
    airborne: boolean;
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
            return {
                particle,
                ground,
                lastPeak: 0,
                previousPeak: 0,
                bounces: 0,
                peaks: 0,
                rising: false,
                airborne: true,
            };
        });
        this.drop(options.height);
    }

    /** Holds every ball at `height` above the ground, at rest, and lets go. */
    drop(height: number): void {
        for (const ball of this.balls) {
            ball.particle.position.y = this.radius + height;
            ball.particle.velocity.set(0, 0, 0);
            ball.particle.lastAcceleration.set(0, 0, 0);
            ball.lastPeak = height;
            ball.previousPeak = height;
            ball.bounces = 0;
            ball.peaks = 0;
            ball.rising = false;
            ball.airborne = height >= REST_HEIGHT;
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
        for (const ball of this.balls) {
            const height = this.heightOf(ball);
            const rising = ball.particle.velocity.y > 0;
            const airborne = height >= REST_HEIGHT;
            if (ball.airborne && !airborne) ball.bounces++;
            if (!rising && ball.rising) {
                ball.previousPeak = ball.lastPeak;
                ball.lastPeak = height;
                ball.peaks++;
            } else if (!rising && !airborne && ball.lastPeak >= REST_HEIGHT) {
                // Landed without rebounding: the ball's last peak is the ground.
                ball.previousPeak = ball.lastPeak;
                ball.lastPeak = 0;
            }
            ball.rising = rising;
            ball.airborne = airborne;
        }
    }

    /** Height of the ball's bottom above the ground, in meters. */
    heightOf(ball: BounceBall): number {
        return ball.particle.position.y - this.radius;
    }

    /** `lastPeak / previousPeak`, or `undefined` before the first rebound peak or once at rest. */
    reboundRatio(ball: BounceBall): number | undefined {
        if (ball.peaks === 0 || ball.previousPeak < REST_HEIGHT || ball.lastPeak < REST_HEIGHT) {
            return undefined;
        }
        return ball.lastPeak / ball.previousPeak;
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
