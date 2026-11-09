import type { Particle } from "../engine/index.js";
import type { ParticleForce, ParticleForceGenerator } from "./particle-force.js";

/** Binds a shared generator to one particle. */
function bind(particle: Particle, generator: ParticleForceGenerator): ParticleForce {
    return {
        particles: [particle],
        apply: (dt) => generator.updateForce(particle, dt),
    };
}

/**
 * The forces acting in a world. Runs them in the order they were added.
 *
 * Forces are indexed by particle, so removing a particle costs time proportional to the
 * forces acting on it rather than to the whole registry.
 */
export class ParticleForceRegistry {
    private readonly forces = new Set<ParticleForce>();
    private readonly byParticle = new Map<Particle, Set<ParticleForce>>();

    /**
     * Adds a force that holds its own particles. Adding a registered force again does nothing.
     *
     * @param force Force to run each step.
     * @returns `force`, for passing to `remove`.
     */
    add(force: ParticleForce): ParticleForce;
    /**
     * Makes `generator` act on `particle`. Each call adds a separate registration, so adding
     * the same pair twice applies its force twice.
     *
     * @param particle Particle to act on.
     * @param generator Generator to run for `particle`.
     * @returns Handle for passing to `remove`.
     */
    add(particle: Particle, generator: ParticleForceGenerator): ParticleForce;
    add(target: ParticleForce | Particle, generator?: ParticleForceGenerator): ParticleForce {
        const force = generator ? bind(target as Particle, generator) : (target as ParticleForce);
        if (this.forces.has(force)) return force;
        this.forces.add(force);
        for (const particle of force.particles) {
            let forces = this.byParticle.get(particle);
            if (!forces) this.byParticle.set(particle, (forces = new Set()));
            forces.add(force);
        }
        return force;
    }

    /**
     * Removes a force, or a generator registration by the handle `add` returned.
     *
     * @param force Registered force or handle.
     * @returns Whether it was registered.
     */
    remove(force: ParticleForce): boolean {
        if (!this.forces.delete(force)) return false;
        for (const particle of force.particles) {
            const forces = this.byParticle.get(particle);
            if (forces?.delete(force) && forces.size === 0) this.byParticle.delete(particle);
        }
        return true;
    }

    /**
     * Removes every force that acts on `particle`, keeping the order of the rest.
     *
     * @param particle Particle whose forces to remove.
     * @returns Number of forces removed.
     */
    removeParticle(particle: Particle): number {
        const forces = this.byParticle.get(particle);
        if (!forces) return 0;
        const removed = forces.size;
        for (const force of [...forces]) this.remove(force);
        return removed;
    }

    /** Number of registered forces. */
    get size(): number {
        return this.forces.size;
    }

    /** Removes every force. */
    clear() {
        this.forces.clear();
        this.byParticle.clear();
    }

    /**
     * Runs every registered force once. Forces added during the run also run this step; forces
     * removed during the run are skipped if they have not run yet.
     *
     * @param dt Step length in seconds.
     */
    updateForces(dt: number) {
        for (const force of this.forces) force.apply(dt);
    }
}
