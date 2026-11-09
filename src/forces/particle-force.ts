import type { Particle } from "../engine/index.js";

/**
 * Adds a force to whichever particle it is given.
 *
 * Holds no particles, so one instance can be shared, e.g. a single drag generator added to
 * many particles with `ParticleForceRegistry.add(particle, generator)`.
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

/**
 * A force that holds the particles it acts on, such as a spring holding both of its ends.
 *
 * Each step it adds force to all of its particles at once, so a two-particle force is
 * computed once and its ends get exactly equal and opposite forces.
 */
export interface ParticleForce {
    /** The particles this force acts on. Must not change while the force is registered. */
    readonly particles: readonly Particle[];

    /**
     * Adds this step's force to every particle this force acts on.
     *
     * @param dt Step length in seconds.
     */
    apply(dt: number): void;
}
