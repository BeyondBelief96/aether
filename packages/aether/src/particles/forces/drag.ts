import type { Particle } from "../particle.js";
import { Vec3 } from "../../math/index.js";
import type { ParticleForceGenerator } from "./force-generator.js";

const _force = new Vec3();

/**
 * Applies drag opposing the particle's velocity, with magnitude `k1·|v| + k2·|v|²`.
 *
 * `k1` models drag at low speed and `k2` models drag at high speed. Large coefficients on
 * light particles can reverse the velocity within one step once `k·inverseMass·dt > 1`;
 * reduce `dt` or the coefficients if that happens. Immovable particles are skipped.
 */
export class ParticleDrag implements ParticleForceGenerator {
    private readonly k1: number;
    private readonly k2: number;

    /**
     * @param k1 Linear drag coefficient in N·s/m.
     * @param k2 Quadratic drag coefficient in N·s²/m².
     * @throws RangeError If either coefficient is negative.
     */
    constructor(k1: number, k2: number) {
        if (!(k1 >= 0)) throw new RangeError(`k1 must be non-negative, got ${k1}`);
        if (!(k2 >= 0)) throw new RangeError(`k2 must be non-negative, got ${k2}`);
        this.k1 = k1;
        this.k2 = k2;
    }

    updateForce(particle: Particle, _dt: number): void {
        if (!particle.hasFiniteMass()) return;
        const speed = particle.velocity.magnitude();
        particle.addForce(_force.copy(particle.velocity).scale(-(this.k1 + this.k2 * speed)));
    }
}
