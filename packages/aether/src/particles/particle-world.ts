import { ParticleForceRegistry } from "./forces/index.js";
import { addGravityForce } from "./forces/gravity.js";
import { SemiImplicitEuler } from "./integrators/semi-implicit-euler.js";
import type { ForceEvaluator, ParticleIntegrator } from "./integrators/particle-integrator.js";
import { ensureLength } from "./integrators/scratch.js";
import { Vec3 } from "../math/index.js";
import type { Particle } from "./particle.js";

/** A collection of particles stepped together. */
export class ParticleWorld {
    /**
     * Particles in this world, integrated in array order. Push to add one; use `remove`
     * to take one out, so the generators registered on it are dropped too.
     */
    readonly particles: Particle[] = [];
    /** Force generators applied to particles each time forces are evaluated. */
    readonly forceRegistry = new ParticleForceRegistry();
    /** Gravitational acceleration in m/s², scaled by each particle's `gravityScale`. */
    readonly gravity = new Vec3(0, -9.81, 0);
    /** Integrator used by `step`. Can be replaced between steps. */
    integrator: ParticleIntegrator = new SemiImplicitEuler();

    /** Forces added to each particle before the current step, restored on every evaluation. */
    private readonly appliedForces: Vec3[] = [];
    private restoreAppliedForces = false;
    private stepDt = 0;
    private readonly forces: ForceEvaluator = { evaluate: () => this.evaluateForces() };

    /**
     * Removes `particle` and every generator registered on it. Generators on other particles
     * that refer to it, such as the far end of a spring, must be removed by the caller.
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
     * Advances every particle by one step with `integrator`, records each particle's
     * `lastAcceleration` from the integrator's last force evaluation, then clears the force
     * accumulators.
     *
     * Forces added to a particle before the step are held constant through it. Registered
     * generators and gravity are evaluated as often as the integrator needs.
     *
     * @param dt Step length in seconds.
     * @throws RangeError If `dt` is not positive and the world has particles.
     */
    step(dt: number): void {
        const { particles } = this;
        if (particles.length > 0 && !(dt > 0)) {
            throw new RangeError(`dt must be positive, got ${dt}`);
        }
        // A single evaluation adds to the forces already accumulated, so nothing needs saving.
        this.restoreAppliedForces = this.integrator.evaluationsPerStep > 1;
        if (this.restoreAppliedForces) {
            ensureLength(this.appliedForces, particles.length);
            for (let i = 0; i < particles.length; i++) {
                this.appliedForces[i]!.copy(particles[i]!.forceAccum);
            }
        }
        this.stepDt = dt;

        this.integrator.step(particles, this.forces, dt);

        for (const particle of particles) {
            particle.lastAcceleration.copy(particle.forceAccum).scale(particle.inverseMass);
            particle.clearAccumulator();
        }
    }

    private evaluateForces(): void {
        const { particles } = this;
        if (this.restoreAppliedForces) {
            for (let i = 0; i < particles.length; i++) {
                particles[i]!.forceAccum.copy(this.appliedForces[i]!);
            }
        }
        this.forceRegistry.updateForces(this.stepDt);
        for (const particle of particles) {
            addGravityForce(particle, this.gravity, particle.gravityScale);
        }
    }
}
