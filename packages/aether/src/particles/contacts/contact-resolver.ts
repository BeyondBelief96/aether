import { Vec3 } from "../../math/index.js";
import type { ParticleContact } from "./contact.js";

/** Penetration in meters and closing speed in m/s below which a contact counts as resolved. */
const TOLERANCE = 1e-9;

/**
 * Resolves contacts one at a time, worst first: each iteration resolves the contact with the
 * lowest separating velocity among those that are closing or still penetrating, then updates the
 * penetration of every contact that shares a particle with it.
 */
export class ParticleContactResolver {
    /** Maximum contacts resolved per call, or `undefined` for twice the contact count. */
    readonly iterations: number | undefined;
    private used = 0;
    private limit = 0;
    /** Each particle's position before a resolve, then how far the resolve moved it. */
    private readonly movementA = new Vec3();
    private readonly movementB = new Vec3();

    /**
     * @param iterations Maximum contacts resolved per call, a non-negative integer. Omit to use
     *   twice the number of contacts passed to each call.
     * @throws RangeError If `iterations` is given and is not a non-negative integer.
     */
    constructor(iterations?: number) {
        if (iterations !== undefined && !(Number.isInteger(iterations) && iterations >= 0)) {
            throw new RangeError(`iterations must be a non-negative integer, got ${iterations}`);
        }
        this.iterations = iterations;
    }

    /** Iterations the last `resolveContacts` used. */
    get iterationsUsed(): number {
        return this.used;
    }

    /** Most iterations the last `resolveContacts` allowed: `iterations`, or twice its count. */
    get iterationLimit(): number {
        return this.limit;
    }

    /**
     * Resolves velocity and interpenetration for `contacts[0..count)`. Stops early once no contact
     * that can move is closing or penetrating.
     *
     * @param contacts Contacts to resolve; their `penetration` is updated as particles move.
     * @param count Number of contacts in use.
     * @param dt Duration of the step in seconds.
     */
    resolveContacts(contacts: readonly ParticleContact[], count: number, dt: number): void {
        this.limit = this.iterations ?? 2 * count;
        this.used = 0;
        while (this.used < this.limit) {
            const worst = findWorst(contacts, count);
            if (!worst) return;

            const { particleA, particleB } = worst;
            const movementA = this.movementA.copy(particleA.position);
            const movementB = particleB ? this.movementB.copy(particleB.position) : null;
            worst.resolve(dt);
            movementA.subtract(particleA.position).negate();
            if (particleB) movementB!.subtract(particleB.position).negate();

            if (worst.penetration > 0) worst.penetration = 0;
            for (let i = 0; i < count; i++) {
                const contact = contacts[i]!;
                if (contact !== worst) updatePenetration(contact, worst, movementA, movementB);
            }
            this.used++;
        }
    }
}

/** The movable contact with the lowest separating velocity that is closing or penetrating. */
function findWorst(contacts: readonly ParticleContact[], count: number): ParticleContact | null {
    let worstVelocity = Infinity;
    let worst: ParticleContact | null = null;
    for (let i = 0; i < count; i++) {
        const contact = contacts[i]!;
        const velocity = contact.separatingVelocity();
        if (!(velocity < worstVelocity)) continue;
        if (!(velocity < -TOLERANCE || contact.penetration > TOLERANCE)) continue;
        const inverseMass = contact.particleA.inverseMass + (contact.particleB?.inverseMass ?? 0);
        if (!(inverseMass > 0)) continue;
        worstVelocity = velocity;
        worst = contact;
    }
    return worst;
}

/** Adjusts `contact.penetration` for the movement resolving `resolved` applied to its particles. */
function updatePenetration(
    contact: ParticleContact,
    resolved: ParticleContact,
    movementA: Vec3,
    movementB: Vec3 | null,
): void {
    const { particleA, particleB } = resolved;
    if (contact.particleA === particleA) {
        contact.penetration -= movementA.dot(contact.normal);
    } else if (movementB && contact.particleA === particleB) {
        contact.penetration -= movementB.dot(contact.normal);
    }
    if (!contact.particleB) return;
    if (contact.particleB === particleA) {
        contact.penetration += movementA.dot(contact.normal);
    } else if (movementB && contact.particleB === particleB) {
        contact.penetration += movementB.dot(contact.normal);
    }
}
