import { Vec3, type Vec3Like } from "../../math/index.js";
import type { Particle } from "../particle.js";

/**
 * A contact between two particles, or between a particle and immovable scenery when
 * `particleB` is null.
 *
 * Contacts are pooled: generators overwrite them each step with `set` rather than constructing
 * new ones, and only contacts a generator has filled are resolved.
 */
export class ParticleContact {
    /** First particle in the contact. Set by `set` before the contact is resolved. */
    particleA!: Particle;
    /** Null for contact with immovable scenery. */
    particleB: Particle | null = null;
    /** Unit contact normal, from `particleB` toward `particleA`. */
    readonly normal = new Vec3();
    /** Overlap along `normal` in meters. Negative values are a gap. */
    penetration = 0;
    /** Coefficient of restitution, in [0, 1]. */
    restitution = 0;

    /**
     * Overwrites every field of the contact.
     *
     * @param normal Unit normal from `particleB` toward `particleA`.
     */
    set(
        particleA: Particle,
        particleB: Particle | null,
        normal: Vec3Like,
        penetration: number,
        restitution: number,
    ): this {
        this.particleA = particleA;
        this.particleB = particleB;
        this.normal.copy(normal);
        this.penetration = penetration;
        this.restitution = restitution;
        return this;
    }

    /** Relative velocity along `normal`. Positive when separating, negative when closing. */
    separatingVelocity(): number {
        let velocity = this.particleA.velocity.dot(this.normal);
        if (this.particleB) velocity -= this.particleB.velocity.dot(this.normal);
        return velocity;
    }

    /**
     * Resolves velocity, then interpenetration. Each change is shared between the particles in
     * proportion to inverse mass. Does nothing when both particles are immovable.
     *
     * @param dt Duration of the step in seconds.
     */
    resolve(dt: number): void {
        this.resolveVelocity(dt);
        this.resolveInterpenetration();
    }

    /**
     * Applies an impulse along `normal` so a closing contact separates at `restitution` times its
     * closing speed. Separating contacts are left alone.
     */
    private resolveVelocity(_dt: number): void {
        // Find the velocity  in the direction of the contact
        const separatingVelocity = this.separatingVelocity();

        // Check if it needs to be resolved
        if (separatingVelocity > 0) {
            // The contact is either separating or stationary, no impulse required.
            return;
        }

        // Calculate the new separating velocity
        const newSepVelocity = -separatingVelocity * this.restitution;
        const deltaVelocity = newSepVelocity - separatingVelocity;

        // We apply the change in velocity to each object in proportion to
        // its inverse mass (i.e., those with lower inverse mass [higher
        // actual mass] get less change in velocity).
        let totalInverseMass = this.particleA.inverseMass;
        if (this.particleB) totalInverseMass += this.particleB.inverseMass;

        // If all particles have infinite mass, then impulses have no effect
        if (totalInverseMass <= 0) return;

        // Calculate the impulses to apply
        const impulsePerInverseMass = deltaVelocity / totalInverseMass;
        this.particleA.velocity.addScaled(
            this.normal,
            impulsePerInverseMass * this.particleA.inverseMass,
        );
        if (this.particleB) {
            this.particleB.velocity.addScaled(
                this.normal,
                -impulsePerInverseMass * this.particleB.inverseMass,
            );
        }
    }

    /** Moves the particles apart along `normal` until they no longer overlap. Gaps are left alone. */
    private resolveInterpenetration(): void {
        if (this.penetration <= 0) return;
        let totalInverseMass = this.particleA.inverseMass;
        if (this.particleB) totalInverseMass += this.particleB.inverseMass;

        if (totalInverseMass <= 0) return;

        const movementPerUnitOfInverseMass = this.penetration / totalInverseMass;
        this.particleA.position.addScaled(
            this.normal,
            movementPerUnitOfInverseMass * this.particleA.inverseMass,
        );
        if (this.particleB) {
            this.particleB.position.addScaled(
                this.normal,
                -movementPerUnitOfInverseMass * this.particleB.inverseMass,
            );
        }
    }
}
