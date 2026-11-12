import type { Particle } from "../particle.js";
import { ParticleLink } from "./link.js";

/**
 * A cable between two particles: no contact while they are closer than `maxLength`, and a
 * contact that draws them together once they are farther apart.
 */
export class ParticleCable extends ParticleLink {
    /** Length in meters past which the cable is taut. */
    maxLength: number;
    /** Coefficient of restitution when the cable snaps taut, in [0, 1]. */
    restitution: number;

    /**
     * @param maxLength Length in meters past which the cable is taut, greater than zero.
     * @param restitution Coefficient of restitution, in [0, 1].
     * @throws RangeError If `particleA` and `particleB` are the same particle, `maxLength` is
     *   not a positive finite number, or `restitution` is outside [0, 1].
     */
    constructor(particleA: Particle, particleB: Particle, maxLength: number, restitution = 0) {
        super(particleA, particleB);
        if (!(maxLength > 0 && Number.isFinite(maxLength))) {
            throw new RangeError(`maxLength must be positive and finite, got ${maxLength}`);
        }
        if (!(restitution >= 0 && restitution <= 1)) {
            throw new RangeError(`restitution must be in [0, 1], got ${restitution}`);
        }
        this.maxLength = maxLength;
        this.restitution = restitution;
    }

    protected deviation(length: number): number {
        return length > this.maxLength ? length - this.maxLength : 0;
    }
}
