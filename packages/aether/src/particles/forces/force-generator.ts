import type { Particle } from "../particle.js";

/**
 * Adds a force to whichever particle it is given.
 *
 * Generators that hold only parameters, such as drag, can be shared across many particles.
 * Register one with `ParticleForceRegistry.add(particle, generator)`.
 */
export interface ParticleForceGenerator {
    /**
     * Adds this generator's force to `particle`.
     *
     * @param particle Particle to act on.
     * @param dt Step length in seconds.
     */
    updateForce(particle: Particle, dt: number): void;
}
