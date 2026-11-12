import { Vec3 } from "../../math/index.js";
import type { Particle } from "../particle.js";
import type { ForceEvaluator, ParticleIntegrator } from "./particle-integrator.js";
import { ensureLength } from "./scratch.js";

const WEIGHTS = [1, 2, 2, 1] as const;
const NEXT_OFFSET = [0.5, 0.5, 1] as const;
const _accel = new Vec3();

/**
 * Classic fourth-order Runge–Kutta on position and velocity together. Four force evaluations
 * per step, with every particle moved to each trial state at once so coupled forces such as
 * springs see consistent positions. Damping is applied after the step.
 */
export class Rk4 implements ParticleIntegrator {
    readonly name = "RK4";
    private readonly startPosition: Vec3[] = [];
    private readonly startVelocity: Vec3[] = [];
    private readonly sumPosition: Vec3[] = [];
    private readonly sumVelocity: Vec3[] = [];

    step(particles: readonly Particle[], forces: ForceEvaluator, dt: number): void {
        const count = particles.length;
        ensureLength(this.startPosition, count);
        ensureLength(this.startVelocity, count);
        ensureLength(this.sumPosition, count);
        ensureLength(this.sumVelocity, count);

        particles.forEach((particle, i) => {
            this.startPosition[i]!.copy(particle.position);
            this.startVelocity[i]!.copy(particle.velocity);
            this.sumPosition[i]!.set(0, 0, 0);
            this.sumVelocity[i]!.set(0, 0, 0);
        });

        for (let stage = 0; stage < 4; stage++) {
            forces.evaluate();
            const weight = WEIGHTS[stage]!;
            const offset = NEXT_OFFSET[stage];
            particles.forEach((particle, i) => {
                if (!(particle.inverseMass > 0)) return;
                // Derivatives at this trial state: dx/dt = v, dv/dt = F·w.
                _accel.copy(particle.forceAccum).scale(particle.inverseMass);
                this.sumPosition[i]!.addScaled(particle.velocity, weight);
                this.sumVelocity[i]!.addScaled(_accel, weight);
                if (offset === undefined) return;
                const velocity = particle.velocity;
                particle.position.copy(this.startPosition[i]!).addScaled(velocity, offset * dt);
                velocity.copy(this.startVelocity[i]!).addScaled(_accel, offset * dt);
            });
        }

        particles.forEach((particle, i) => {
            if (!(particle.inverseMass > 0)) return;
            particle.position.copy(this.startPosition[i]!).addScaled(this.sumPosition[i]!, dt / 6);
            particle.velocity
                .copy(this.startVelocity[i]!)
                .addScaled(this.sumVelocity[i]!, dt / 6)
                .scale(Math.pow(particle.damping, dt));
        });
    }
}
