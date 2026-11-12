import type { Particle } from "../particle.js";
import type { ForceEvaluator, ParticleIntegrator } from "./particle-integrator.js";

/**
 * Advances one particle with semi-implicit Euler: `v += F·w·dt`, `v *= damping^dt`, then
 * `x += v·dt`. Leaves immovable particles and `forceAccum` unchanged.
 */
export function semiImplicitEulerStep(particle: Particle, dt: number): void {
    if (!(particle.inverseMass > 0)) return;
    particle.velocity
        .addScaled(particle.forceAccum, particle.inverseMass * dt)
        .scale(Math.pow(particle.damping, dt));
    particle.position.addScaled(particle.velocity, dt);
}

/**
 * Semi-implicit (symplectic) Euler: velocity first, then position with the new velocity.
 * First order, one force evaluation per step, and energy stays bounded on oscillators.
 */
export class SemiImplicitEuler implements ParticleIntegrator {
    readonly name = "Semi-implicit Euler";

    step(particles: readonly Particle[], forces: ForceEvaluator, dt: number): void {
        forces.evaluate();
        for (const particle of particles) semiImplicitEulerStep(particle, dt);
    }
}
