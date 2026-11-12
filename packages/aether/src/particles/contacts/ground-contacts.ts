import type { Particle } from "../particle.js";
import type { ParticleContact } from "./contact.js";
import type { ParticleContactGenerator } from "./contact-generator.js";

const UP = { x: 0, y: 1, z: 0 } as const;

/**
 * Contacts between particles and a horizontal ground plane, one per movable particle below
 * `height`.
 */
export class GroundContacts implements ParticleContactGenerator {
    /** Particles tested against the plane. Read each step, so it can be a live array. */
    particles: readonly Particle[];
    /** Height of the plane in meters. */
    height: number;
    /** Coefficient of restitution for every ground contact, in [0, 1]. */
    restitution: number;

    /**
     * @param particles Particles to test, such as `ParticleWorld.particles`.
     * @param height Height of the plane in meters.
     * @param restitution Coefficient of restitution, in [0, 1].
     */
    constructor(particles: readonly Particle[], height = 0, restitution = 0.2) {
        this.particles = particles;
        this.height = height;
        this.restitution = restitution;
    }

    addContacts(out: readonly ParticleContact[], start: number): number {
        let index = start;
        for (const particle of this.particles) {
            if (index >= out.length) break;
            if (!(particle.inverseMass > 0)) continue;
            const depth = this.height - particle.position.y;
            if (!(depth > 0)) continue;
            out[index++]!.set(particle, null, UP, depth, this.restitution);
        }
        return index - start;
    }
}
