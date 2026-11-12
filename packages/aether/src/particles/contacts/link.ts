import { Vec3 } from "../../math/index.js";
import type { Particle } from "../particle.js";
import type { ParticleContact } from "./contact.js";
import type { ParticleContactGenerator } from "./contact-generator.js";

const _normal = new Vec3();

/**
 * A constraint between two particles written as a contact generator: it reports a contact when
 * the distance between them breaks its rule, and the contact resolver restores it.
 */
export abstract class ParticleLink implements ParticleContactGenerator {
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

    abstract addContacts(out: readonly ParticleContact[], start: number): number;

    /**
     * Writes a contact along the line between the particles.
     *
     * @param contact Pooled contact to overwrite.
     * @param length Current distance between the particles, greater than zero.
     * @param penetration How far the link is from its rule, in meters.
     * @param restitution Coefficient of restitution, in [0, 1].
     * @param pull Whether resolving the contact draws the particles together; otherwise it
     *   pushes them apart.
     */
    protected writeContact(
        contact: ParticleContact,
        length: number,
        penetration: number,
        restitution: number,
        pull: boolean,
    ): void {
        const normal = _normal
            .copy(this.particleB.position)
            .subtract(this.particleA.position)
            .scale((pull ? 1 : -1) / length);
        contact.set(this.particleA, this.particleB, normal, penetration, restitution);
    }
}
