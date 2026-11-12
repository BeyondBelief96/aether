import type { Particle } from "../particle.js";

/** Recomputes the forces on a set of particles from their current state. */
export interface ForceEvaluator {
    /**
     * Sets each particle's `forceAccum` to the total force on it at its current position and
     * velocity, including gravity and any force added before the step began.
     */
    evaluate(): void;
}

/**
 * Advances a set of particles by one step.
 *
 * Integrators that evaluate forces more than once per step move the particles to trial states
 * and call `forces.evaluate()` at each, so force generators must depend only on the state they
 * are given.
 */
export interface ParticleIntegrator {
    /** Display name, such as `"RK4"`. */
    readonly name: string;
    /**
     * Number of times `step` calls `forces.evaluate()`. When it is more than 1, the world saves
     * forces added before the step and restores them on every evaluation.
     */
    readonly evaluationsPerStep: number;
    /**
     * Advances every particle by `dt`. Particles with `inverseMass = 0` are left unchanged.
     * `forceAccum` is unspecified afterward; the caller clears it.
     *
     * @param particles Particles to advance.
     * @param forces Fills each particle's `forceAccum` for the current state.
     * @param dt Step length in seconds, positive.
     */
    step(particles: readonly Particle[], forces: ForceEvaluator, dt: number): void;
}
