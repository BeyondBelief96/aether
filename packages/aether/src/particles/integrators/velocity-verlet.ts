import type { Vec3 } from "../../math/index.js";
import type { Particle } from "../particle.js";
import type { ForceEvaluator, ParticleIntegrator } from "./particle-integrator.js";
import { ensureLength } from "./scratch.js";

/**
 * Velocity Verlet: `x += v·dt + ½·a·dt²`, then `v += ½·(a + a')·dt` with `a'` evaluated at the
 * new position. Second order, two force evaluations per step. The second evaluation sees the
 * velocity estimate `v + a·dt`, so velocity-dependent forces stay second order.
 */
export class VelocityVerlet implements ParticleIntegrator {
    readonly name = "Velocity Verlet";
    readonly evaluationsPerStep = 2;
    private readonly acceleration: Vec3[] = [];
    private readonly startVelocity: Vec3[] = [];

    step(particles: readonly Particle[], forces: ForceEvaluator, dt: number): void {
        ensureLength(this.acceleration, particles.length);
        ensureLength(this.startVelocity, particles.length);

        forces.evaluate();
        particles.forEach((particle, i) => {
            if (!(particle.inverseMass > 0)) return;
            const a = this.acceleration[i]!.copy(particle.forceAccum).scale(particle.inverseMass);
            this.startVelocity[i]!.copy(particle.velocity);
            particle.position.addScaled(particle.velocity, dt).addScaled(a, 0.5 * dt * dt);
            particle.velocity.addScaled(a, dt);
        });

        forces.evaluate();
        particles.forEach((particle, i) => {
            if (!(particle.inverseMass > 0)) return;
            particle.velocity
                .copy(this.startVelocity[i]!)
                .addScaled(this.acceleration[i]!, 0.5 * dt)
                .addScaled(particle.forceAccum, 0.5 * particle.inverseMass * dt)
                .scale(Math.pow(particle.damping, dt));
        });
    }
}
