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
    /**
     * Unit normal along which resolving the contact pushes `particleA`; `particleB` is pushed
     * the opposite way. For a collision it points from `particleB` toward `particleA`.
     */
    readonly normal = new Vec3();
    /** Overlap along `normal` in meters. Negative values are a gap. */
    penetration = 0;
    /** Coefficient of restitution, in [0, 1]. */
    restitution = 0;

    /**
     * Overwrites every field of the contact.
     *
     * @param normal Unit normal along which `particleA` is pushed.
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
     * closing speed, less the closing speed the particles' `lastAcceleration` built up over `dt`.
     * Separating contacts are left alone.
     */
    private resolveVelocity(dt: number): void {
        const separatingVelocity = this.separatingVelocity();

        if (separatingVelocity > 0) return;

        let newSepVelocity = -separatingVelocity * this.restitution;

        // Closing velocity built up by the last step's acceleration alone is not bounced
        let accCausedSepVelocity = this.particleA.lastAcceleration.dot(this.normal);
        if (this.particleB)
            accCausedSepVelocity -= this.particleB.lastAcceleration.dot(this.normal);
        accCausedSepVelocity *= dt;
        if (accCausedSepVelocity < 0) {
            newSepVelocity += this.restitution * accCausedSepVelocity;
            if (newSepVelocity < 0) newSepVelocity = 0;
        }

        const deltaVelocity = newSepVelocity - separatingVelocity;

        let totalInverseMass = this.particleA.inverseMass;
        if (this.particleB) totalInverseMass += this.particleB.inverseMass;

        if (totalInverseMass <= 0) return;

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
