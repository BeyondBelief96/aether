import { describe, expect, it } from "vitest";
import { Particle } from "../..";
import { ParticleContact } from "..";
import { ParticleContactResolver } from "../contact-resolver";

const DT = 1 / 60;
const UP = { x: 0, y: 1, z: 0 };

/** A particle with mass `mass` at height `y` moving vertically at `vy`. */
function particle(y: number, vy = 0, mass = 1): Particle {
    const p = new Particle();
    p.setMass(mass);
    p.position.set(0, y, 0);
    p.velocity.set(0, vy, 0);
    return p;
}

/** Lower on the ground and upper 1 m above lower, both overlapping by 0.1. */
function stack() {
    const lower = particle(-0.1);
    const upper = particle(0.8);
    const ground = new ParticleContact().set(lower, null, UP, 0.1, 0);
    const between = new ParticleContact().set(upper, lower, UP, 0.1, 0);
    return { lower, upper, ground, between };
}

describe("ParticleContactResolver", () => {
    it.each([-1, 1.5, NaN])("rejects %s iterations", (iterations) => {
        expect(() => new ParticleContactResolver(iterations)).toThrow(RangeError);
    });

    it("uses no iterations when nothing is closing or penetrating", () => {
        const resolver = new ParticleContactResolver(10);
        const contacts = [new ParticleContact().set(particle(0, 1), null, UP, 0, 0.5)];
        resolver.resolveContacts(contacts, 1, DT);
        expect(resolver.iterationsUsed).toBe(0);
    });

    it("resolves the contact with the lowest separating velocity first", () => {
        const slow = particle(0, -1);
        const fast = particle(0, -5);
        const contacts = [
            new ParticleContact().set(slow, null, UP, 0, 1),
            new ParticleContact().set(fast, null, UP, 0, 1),
        ];
        new ParticleContactResolver(1).resolveContacts(contacts, 2, DT);

        expect(fast.velocity.y).toBeCloseTo(5);
        expect(slow.velocity.y).toBeCloseTo(-1);
    });

    it("stops at the iteration limit", () => {
        const a = particle(0, -1);
        const b = particle(0, -2);
        const resolver = new ParticleContactResolver(1);
        resolver.resolveContacts(
            [
                new ParticleContact().set(a, null, UP, 0, 0),
                new ParticleContact().set(b, null, UP, 0, 0),
            ],
            2,
            DT,
        );
        expect(resolver.iterationsUsed).toBe(1);
        expect(a.velocity.y).toBeCloseTo(-1);
    });

    it("ignores contacts past count", () => {
        const outside = particle(0, -3);
        const contacts = [
            new ParticleContact().set(particle(0, 1), null, UP, 0, 0),
            new ParticleContact().set(outside, null, UP, 0, 0),
        ];
        new ParticleContactResolver(4).resolveContacts(contacts, 1, DT);
        expect(outside.velocity.y).toBeCloseTo(-3);
    });

    it("pushes out a separating contact that still penetrates", () => {
        const p = particle(-0.1, 2);
        const contacts = [new ParticleContact().set(p, null, UP, 0.1, 0)];
        const resolver = new ParticleContactResolver(4);
        resolver.resolveContacts(contacts, 1, DT);

        expect(p.position.y).toBeCloseTo(0);
        expect(p.velocity.y).toBeCloseTo(2);
        expect(resolver.iterationsUsed).toBe(1);
    });

    it.each([1, 2, 3, 10])(
        "keeps penetrations in step with positions after %i iterations",
        (iterations) => {
            const { lower, upper, ground, between } = stack();
            new ParticleContactResolver(iterations).resolveContacts([ground, between], 2, DT);

            expect(ground.penetration).toBeCloseTo(-lower.position.y, 12);
            expect(between.penetration).toBeCloseTo(1 - (upper.position.y - lower.position.y), 12);
        },
    );

    it("shrinks the overlap in a stack as iterations increase", () => {
        const overlap = (iterations: number) => {
            const { ground, between } = stack();
            new ParticleContactResolver(iterations).resolveContacts([ground, between], 2, DT);
            return Math.max(ground.penetration, between.penetration);
        };
        expect(overlap(4)).toBeLessThan(overlap(2));
        expect(overlap(40)).toBeLessThan(1e-6);
    });

    it("sets a resolved contact's own penetration to zero", () => {
        const a = particle(0.4);
        const b = particle(0, 0, 3);
        const contact = new ParticleContact().set(a, b, UP, 0.2, 0);
        new ParticleContactResolver(1).resolveContacts([contact], 1, DT);
        expect(contact.penetration).toBeCloseTo(0, 12);
    });

    it("defaults to twice the contact count", () => {
        const resolver = new ParticleContactResolver();
        const { ground, between } = stack();
        resolver.resolveContacts([ground, between], 2, DT);
        expect(resolver.iterations).toBeUndefined();
        expect(resolver.iterationsUsed).toBe(4);
        expect(resolver.iterationLimit).toBe(4);
    });

    it("reports its fixed limit before the first call, or 0 without one", () => {
        expect(new ParticleContactResolver(7).iterationLimit).toBe(7);
        expect(new ParticleContactResolver().iterationLimit).toBe(0);
    });

    it("reports a fixed limit whatever the contact count", () => {
        const resolver = new ParticleContactResolver(7);
        resolver.resolveContacts([], 0, DT);
        expect(resolver.iterationLimit).toBe(7);
    });

    it("resets iterationsUsed when called with no contacts", () => {
        const resolver = new ParticleContactResolver();
        resolver.resolveContacts(
            [new ParticleContact().set(particle(0, -1), null, UP, 0, 0)],
            1,
            DT,
        );
        resolver.resolveContacts([], 0, DT);
        expect(resolver.iterationsUsed).toBe(0);
    });

    // Masses, heights and overlaps whose resolution leaves a rounding residue in penetration.
    type Pair = readonly [massA: number, massB: number, y: number, overlap: number];
    const residuePairs: readonly Pair[] = [
        [0.8373589809925104, 0.19239354112296997, 0.9443275383414362, 0.06564684522601164],
        [1.9479157036626318, 2.319231457854263, 1.9641495421361874, 0.07306773414512525],
        [0.868129900292554, 1.3592342169532712, 1.0659791115047312, 0.09554635300093628],
    ];

    /** A pair contact from `residuePairs`, overlapping along `UP`. */
    function residuePair([massA, massB, y, overlap]: Pair) {
        const a = particle(y, 0, massA);
        const b = particle(y + overlap, 0, massB);
        return new ParticleContact().set(a, b, UP, overlap, 0);
    }

    it.each(residuePairs)("resolves a pair with masses %f and %f once", (...pair) => {
        const contact = residuePair(pair);
        const resolver = new ParticleContactResolver(50);
        resolver.resolveContacts([contact], 1, DT);

        expect(resolver.iterationsUsed).toBe(1);
        expect(contact.penetration).toBe(0);
    });

    it("does not let a resolved pair starve another contact", () => {
        const victim = particle(-0.1, 0.5);
        const contacts = [
            residuePair(residuePairs[0]!),
            new ParticleContact().set(victim, null, UP, 0.1, 0),
        ];
        new ParticleContactResolver().resolveContacts(contacts, 2, DT);
        expect(victim.position.y).toBeCloseTo(0);
    });

    it("skips contacts whose particles cannot move", () => {
        const fixedA = particle(0);
        const fixedB = particle(0);
        fixedA.inverseMass = fixedB.inverseMass = 0;
        const victim = particle(-0.2, 0.01);
        const contacts = [
            new ParticleContact().set(fixedA, fixedB, UP, 0.5, 0),
            new ParticleContact().set(victim, null, UP, 0.2, 0),
        ];
        const resolver = new ParticleContactResolver();
        resolver.resolveContacts(contacts, 2, DT);

        expect(victim.position.y).toBeCloseTo(0);
        expect(resolver.iterationsUsed).toBe(1);
    });
});
