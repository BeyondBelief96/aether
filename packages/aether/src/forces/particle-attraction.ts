import type { Particle } from "../engine/index.js";
import { Vec3 } from "../math/index.js";
import type { ParticleForceGenerator } from "./particle-force-generator.js";

const _force = new Vec3();

/**
 * Inverse-square attraction toward `source`, with force `mass · strength · r / (|r|² + ε²)^(3/2)`
 * where `r` points from the particle to `source` and `ε` is the softening length.
 *
 * Only the particle it is registered on is pulled. For two bodies that attract each other,
 * register one on each, each pointing at the other. Softening keeps the force finite when the
 * two get close; with zero softening, coincident particles are skipped. Immovable particles are
 * skipped.
 */
export class ParticleAttraction implements ParticleForceGenerator {
    /** Particle pulling toward itself. */
    readonly source: Particle;
    private readonly strength: number;
    private readonly softeningSquared: number;

    /**
     * @param source Particle pulling toward itself.
     * @param strength Gravitational parameter `G·M` of the source, in m³/s².
     * @param softening Softening length `ε` in metres.
     * @throws RangeError If `strength` or `softening` is negative or not finite.
     */
    constructor(source: Particle, strength: number, softening = 0) {
        if (!(strength >= 0) || !Number.isFinite(strength))
            throw new RangeError(`strength must be finite and non-negative, got ${strength}`);
        if (!(softening >= 0) || !Number.isFinite(softening))
            throw new RangeError(`softening must be finite and non-negative, got ${softening}`);
        this.source = source;
        this.strength = strength;
        this.softeningSquared = softening * softening;
    }

    updateForce(particle: Particle, _dt: number): void {
        if (!particle.hasFiniteMass() || this.strength === 0) return;
        _force.copy(this.source.position).subtract(particle.position);
        const d2 = _force.magnitudeSquared() + this.softeningSquared;
        if (d2 === 0) return;
        particle.addForce(_force.scale((this.strength * particle.mass) / (d2 * Math.sqrt(d2))));
    }
}
