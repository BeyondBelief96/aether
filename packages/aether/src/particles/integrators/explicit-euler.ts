import type { Particle } from "../particle.js";
import type { ForceEvaluator, ParticleIntegrator } from "./particle-integrator.js";

/**
 * Explicit Euler: position with the old velocity, then velocity. First order, one force
 * evaluation per step, and energy grows on oscillators.
 */
export class ExplicitEuler implements ParticleIntegrator {
    readonly name = "Explicit Euler";

    step(particles: readonly Particle[], forces: ForceEvaluator, dt: number): void {
        forces.evaluate();
        for (const particle of particles) {
            if (!(particle.inverseMass > 0)) continue;
            particle.position.addScaled(particle.velocity, dt);
            particle.velocity
                .addScaled(particle.forceAccum, particle.inverseMass * dt)
                .scale(Math.pow(particle.damping, dt));
        }
    }
}
