import type { Particle } from "./particle.js";

/** A collection of particles stepped together. */
export class ParticleWorld {
    /** Particles in this world, integrated in array order. Add and remove them directly. */
    readonly particles: Particle[] = [];

    /**
     * Integrates every particle by one step.
     *
     * @param dt Step length in seconds.
     * @throws RangeError If `dt` is not positive and the world has particles.
     */
    step(dt: number): void {
        for (const particle of this.particles) particle.integrate(dt);
    }
}
