import { Vec3 } from "../../math/index.js";
import type { Particle } from "../particle.js";
import type { ParticleContact } from "./contact.js";
import type { ParticleContactGenerator } from "./contact-generator.js";

const _normal = new Vec3();

/**
 * A constraint between two particles written as a contact generator: it writes a contact along
 * the line between them whenever `deviation` reports the distance breaks its rule.
 */
export abstract class ParticleLink implements ParticleContactGenerator {
    /** Coefficient of restitution for the link's contact, in [0, 1]. */
    abstract readonly restitution: number;
    /** First particle. */
    particleA: Particle;
    /** Second particle. */
    particleB: Particle;

    /** @throws RangeError If `particleA` and `particleB` are the same particle. */
    constructor(particleA: Particle, particleB: Particle) {
        if (particleA === particleB) {
            throw new RangeError("a link needs two different particles");
        }
        this.particleA = particleA;
        this.particleB = particleB;
    }

    /** Distance between the particles in meters. */
    currentLength(): number {
        return this.particleA.position.distanceTo(this.particleB.position);
    }

    /** Writes nothing for coincident particles, which give no direction to push along. */
    addContacts(out: readonly ParticleContact[], start: number): number {
        if (start >= out.length) return 0;
        const length = this.currentLength();
        if (!(length > 0)) return 0;
        const deviation = this.deviation(length);
        if (deviation === 0 || Number.isNaN(deviation)) return 0;
        const normal = _normal
            .copy(this.particleB.position)
            .subtract(this.particleA.position)
            .scale(Math.sign(deviation) / length);
        out[start]!.set(
            this.particleA,
            this.particleB,
            normal,
            Math.abs(deviation),
            this.restitution,
        );
        return 1;
    }

    /**
     * How far the link is from its rule at `length`, in meters: positive to draw the particles
     * together, negative to push them apart, zero for no contact.
     */
    protected abstract deviation(length: number): number;
}
