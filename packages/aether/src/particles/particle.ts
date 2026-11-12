import { Vec3, type Vec3Like } from "../math/index.js";
import { semiImplicitEulerStep } from "./integrators/semi-implicit-euler.js";

/**
 * A point mass integrated with semi-implicit Euler.
 *
 * Mass is stored as its inverse, so `inverseMass = 0` represents an immovable particle.
 * Vector fields are `readonly` references: change them in place, e.g.
 * `particle.position.set(0, 1, 0)`.
 */
export class Particle {
    /** Position in meters. */
    readonly position = new Vec3();
    /** Velocity in meters per second. */
    readonly velocity = new Vec3();
    /** Multiplier on the world's gravity. `0` ignores gravity; negative values rise. */
    gravityScale = 1;
    /** Sum of forces in newtons applied since the last `integrate`. */
    readonly forceAccum = new Vec3();
    /**
     * Acceleration in m/s² from the forces of the last step, recorded before the accumulator is
     * cleared. Zero for immovable particles.
     */
    readonly lastAcceleration = new Vec3();
    /** Fraction of velocity kept per second, in [0, 1]. `1` disables damping. */
    damping = 0.99;
    /** Reciprocal of mass in 1/kg. `0` makes the particle immovable. */
    inverseMass = 1;

    /** Mass in kilograms. `Infinity` when `inverseMass` is `0`. */
    get mass(): number {
        return this.inverseMass === 0 ? Infinity : 1 / this.inverseMass;
    }

    /**
     * Sets the mass.
     *
     * @param mass Mass in kilograms. `Infinity` makes the particle immovable.
     * @throws RangeError If `mass` is not positive.
     */
    setMass(mass: number): void {
        if (!(mass > 0)) throw new RangeError(`mass must be positive, got ${mass}`);
        this.inverseMass = 1 / mass;
    }

    /** Whether forces and integration can move this particle. */
    hasFiniteMass(): boolean {
        return this.inverseMass > 0;
    }

    /**
     * Adds a force for the next `integrate`.
     *
     * @param force Force in newtons.
     */
    addForce(force: Vec3Like): void {
        this.forceAccum.add(force);
    }

    /** Discards all accumulated forces. */
    clearAccumulator(): void {
        this.forceAccum.set(0, 0, 0);
    }

    /**
     * Advances the particle by one step with semi-implicit Euler, records `lastAcceleration` and
     * clears the force accumulator.
     * `ParticleWorld` uses its own `integrator` instead.
     *
     * Velocity is updated first and the new velocity moves the position. A particle with
     * `inverseMass = 0` does not move, whatever its velocity.
     *
     * @param dt Step length in seconds.
     * @throws RangeError If `dt` is not positive.
     */
    integrate(dt: number): void {
        if (!(dt > 0)) throw new RangeError(`dt must be positive, got ${dt}`);
        semiImplicitEulerStep(this, dt);
        this.lastAcceleration.copy(this.forceAccum).scale(this.inverseMass);
        this.clearAccumulator();
    }
}
