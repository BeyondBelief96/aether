import type { Particle } from "../particle.js";
import { ParticleLink } from "./link.js";

/**
 * A rigid rod between two particles: a contact whenever they are not exactly `length` apart,
 * drawing them together when the rod is stretched and pushing them apart when it is compressed.
 * Rod contacts have no restitution.
 */
export class ParticleRod extends ParticleLink {
    /** Length in meters the rod holds the particles at. */
    length: number;

    /**
     * @param length Length in meters, greater than zero.
     * @throws RangeError If `particleA` and `particleB` are the same particle, or `length` is
     *   not a positive finite number.
     */
    constructor(particleA: Particle, particleB: Particle, length: number) {
        super(particleA, particleB);
        if (!(length > 0 && Number.isFinite(length))) {
            throw new RangeError(`length must be positive and finite, got ${length}`);
        }
        this.length = length;
    }

    protected deviation(length: number): number {
        return length - this.length;
    }

    protected contactRestitution(): number {
        return 0;
    }
}
