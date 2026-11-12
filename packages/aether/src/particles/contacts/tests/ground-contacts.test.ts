import { describe, expect, it } from "vitest";
import { Particle } from "../..";
import { ParticleContact } from "..";
import { GroundContacts } from "../ground-contacts";

function at(y: number): Particle {
    const p = new Particle();
    p.position.set(1, y, 2);
    return p;
}

function pool(size: number): ParticleContact[] {
    return Array.from({ length: size }, () => new ParticleContact());
}

describe("GroundContacts", () => {
    it("writes one upward contact per particle below the plane", () => {
        const below = at(-0.25);
        const ground = new GroundContacts([at(1), below, at(0)], 0, 0.3);
        const out = pool(4);

        expect(ground.addContacts(out, 0)).toBe(1);
        expect(out[0]!.particleA).toBe(below);
        expect(out[0]!.particleB).toBeNull();
        expect(out[0]!.normal).toBeCloseToVec3({ x: 0, y: 1, z: 0 });
        expect(out[0]!.penetration).toBeCloseTo(0.25);
        expect(out[0]!.restitution).toBe(0.3);
    });

    it("measures penetration from height", () => {
        const out = pool(1);
        new GroundContacts([at(1.5)], 2).addContacts(out, 0);
        expect(out[0]!.penetration).toBeCloseTo(0.5);
    });

    it("writes from start and stops at the end of the pool", () => {
        const ground = new GroundContacts([at(-1), at(-2), at(-3)]);
        const out = pool(3);
        const untouched = out[0]!;

        expect(ground.addContacts(out, 1)).toBe(2);
        expect(out[0]).toBe(untouched);
        expect(out[1]!.penetration).toBeCloseTo(1);
        expect(out[2]!.penetration).toBeCloseTo(2);
    });

    it("skips immovable particles", () => {
        const fixed = at(-1);
        fixed.inverseMass = 0;
        expect(new GroundContacts([fixed]).addContacts(pool(1), 0)).toBe(0);
    });

    it("reads the particle array each call", () => {
        const particles: Particle[] = [];
        const ground = new GroundContacts(particles);
        particles.push(at(-1));
        expect(ground.addContacts(pool(1), 0)).toBe(1);
    });

    it("ignores a particle with a NaN position", () => {
        expect(new GroundContacts([at(NaN)]).addContacts(pool(1), 0)).toBe(0);
    });
});
