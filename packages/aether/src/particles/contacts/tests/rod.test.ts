import { describe, expect, it } from "vitest";
import { Particle, ParticleWorld } from "../..";
import { ParticleContact } from "..";
import { ParticleRod } from "../rod";

function at(x: number, y = 0): Particle {
    const p = new Particle();
    p.position.set(x, y, 0);
    return p;
}

function pool(size: number): ParticleContact[] {
    return Array.from({ length: size }, () => new ParticleContact());
}

describe("ParticleRod", () => {
    it.each([0, -1, NaN, Infinity])("rejects a length of %s", (length) => {
        expect(() => new ParticleRod(at(0), at(1), length)).toThrow(RangeError);
    });

    it("writes nothing at exactly its length", () => {
        expect(new ParticleRod(at(0), at(2), 2).addContacts(pool(1), 0)).toBe(0);
    });

    it("draws stretched particles together", () => {
        const out = pool(1);
        expect(new ParticleRod(at(0), at(3), 2).addContacts(out, 0)).toBe(1);
        expect(out[0]!.normal).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
        expect(out[0]!.penetration).toBeCloseTo(1);
        expect(out[0]!.restitution).toBe(0);
    });

    it("pushes compressed particles apart", () => {
        const out = pool(1);
        expect(new ParticleRod(at(0), at(1.5), 2).addContacts(out, 0)).toBe(1);
        expect(out[0]!.normal).toBeCloseToVec3({ x: -1, y: 0, z: 0 });
        expect(out[0]!.penetration).toBeCloseTo(0.5);
    });

    it("writes nothing for coincident particles or a full pool", () => {
        expect(new ParticleRod(at(1), at(1), 2).addContacts(pool(1), 0)).toBe(0);
        expect(new ParticleRod(at(0), at(3), 2).addContacts(pool(1), 1)).toBe(0);
    });

    it("restores its length in one resolve, sharing the move by inverse mass", () => {
        const world = new ParticleWorld();
        const light = at(0);
        const heavy = at(3);
        heavy.setMass(3);
        world.gravity.set(0, 0, 0);
        world.particles.push(light, heavy);
        world.contactGenerators.push(new ParticleRod(light, heavy, 2));

        world.step(1 / 60);

        expect(light.position.x).toBeCloseTo(0.75);
        expect(heavy.position.x).toBeCloseTo(2.75);
    });

    it("keeps its length while a pendulum on it swings under gravity", () => {
        const world = new ParticleWorld();
        const pivot = at(0);
        pivot.inverseMass = 0;
        const bob = at(1.5, 0);
        bob.damping = 1;
        world.particles.push(bob);
        const rod = new ParticleRod(pivot, bob, 1.5);
        world.contactGenerators.push(rod);

        for (let i = 0; i < 600; i++) {
            world.step(1 / 60);
            expect(rod.currentLength()).toBeCloseTo(1.5, 9);
        }
    });

    it("keeps its length while a free rod tumbles", () => {
        const world = new ParticleWorld();
        const a = at(0);
        const b = at(1);
        a.velocity.set(0, 3, 1);
        b.velocity.set(-2, 1, 0);
        world.particles.push(a, b);
        const rod = new ParticleRod(a, b, 1);
        world.contactGenerators.push(rod);

        for (let i = 0; i < 120; i++) {
            world.step(1 / 60);
            expect(rod.currentLength()).toBeCloseTo(1, 9);
        }
    });
});
