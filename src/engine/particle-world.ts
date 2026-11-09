import { ParticleForceRegistry } from "../forces/index.js";
import { addGravityForce } from "../forces/particle-gravity.js";
import { Vec3 } from "../math/index.js";
import type { Particle } from "./particle.js";

/** A collection of particles stepped together. */
export class ParticleWorld {
    /**
     * Particles in this world, integrated in array order. Push to add one; use `remove`
     * to take one out, so the forces acting on it are dropped too.
     */
    readonly particles: Particle[] = [];
    /** Forces applied to particles at the start of each step. */
    readonly forceRegistry = new ParticleForceRegistry();
    /** Gravitational acceleration in m/s², scaled by each particle's `gravityScale`. */
    readonly gravity = new Vec3(0, -9.81, 0);

    /**
     * Removes `particle` and every force acting on it, including a spring whose other end
     * stays in the world.
     *
     * @param particle Particle to remove.
     * @returns Whether `particle` was in this world.
     */
    remove(particle: Particle): boolean {
        const index = this.particles.indexOf(particle);
        if (index === -1) return false;
        this.particles.splice(index, 1);
        this.forceRegistry.removeParticle(particle);
        return true;
    }

    /**
     * Applies registered forces and gravity, then integrates every particle by one step.
     *
     * @param dt Step length in seconds.
     * @throws RangeError If `dt` is not positive and the world has particles.
     */
    step(dt: number): void {
        this.forceRegistry.updateForces(dt);
        for (const particle of this.particles) {
            addGravityForce(particle, this.gravity, particle.gravityScale);
            particle.integrate(dt);
        }
    }
}
