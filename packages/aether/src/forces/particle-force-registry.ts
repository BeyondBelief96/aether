import type { Particle } from "../engine/index.js";
import type { ParticleForceGenerator } from "./particle-force-generator.js";

/**
 * The force generators acting on each particle.
 *
 * Generators run grouped by particle, in the order each particle was first registered, and
 * in the order they were added within a particle, so repeated runs give identical results.
 */
export class ParticleForceRegistry {
    private readonly byParticle = new Map<Particle, ParticleForceGenerator[]>();

    /**
     * Makes `generator` act on `particle`. Adding the same pair twice applies its force twice.
     *
     * @param particle Particle to act on.
     * @param generator Generator to run for `particle`.
     */
    add(particle: Particle, generator: ParticleForceGenerator) {
        const generators = this.byParticle.get(particle);
        if (generators) generators.push(generator);
        else this.byParticle.set(particle, [generator]);
    }

    /**
     * Removes the first registration of this pair. A generator removed during `updateForces`
     * still runs for the rest of that step.
     *
     * @param particle Registered particle.
     * @param generator Registered generator.
     * @returns Whether a registration was removed.
     */
    remove(particle: Particle, generator: ParticleForceGenerator): boolean {
        const generators = this.byParticle.get(particle);
        const index = generators?.indexOf(generator) ?? -1;
        if (!generators || index === -1) return false;
        if (generators.length === 1) this.byParticle.delete(particle);
        else this.byParticle.set(particle, generators.toSpliced(index, 1));
        return true;
    }

    /**
     * Removes every generator registered on `particle`. Generators registered on other
     * particles that refer to `particle`, such as the far end of a spring, are left in place.
     *
     * @param particle Particle whose registrations to remove.
     * @returns Whether `particle` had any registrations.
     */
    removeParticle(particle: Particle): boolean {
        return this.byParticle.delete(particle);
    }

    /** Removes every registration. */
    clear() {
        this.byParticle.clear();
    }

    /**
     * Runs every registered generator once.
     *
     * @param dt Step length in seconds.
     */
    updateForces(dt: number) {
        for (const [particle, generators] of this.byParticle) {
            for (const generator of generators) generator.updateForce(particle, dt);
        }
    }
}
