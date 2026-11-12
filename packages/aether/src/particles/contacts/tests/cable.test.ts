import { describe, expect, it } from "vitest";
import { pool } from "./helpers";
import { Particle, ParticleWorld } from "../..";
import { ParticleCable } from "../cable";

function at(x: number, y = 0): Particle {
    const p = new Particle();
    p.position.set(x, y, 0);
    return p;
}

function anchor(x: number, y: number): Particle {
    const p = at(x, y);
    p.inverseMass = 0;
    return p;
}

describe("ParticleCable", () => {
    it.each([0, -1, NaN, Infinity])("rejects a maxLength of %s", (maxLength) => {
        expect(() => new ParticleCable(at(0), at(1), maxLength)).toThrow(RangeError);
    });

    it.each([-0.1, 1.1, NaN])("rejects a restitution of %s", (restitution) => {
        expect(() => new ParticleCable(at(0), at(1), 1, restitution)).toThrow(RangeError);
    });

    it("rejects a cable from a particle to itself", () => {
        const p = at(0);
        expect(() => new ParticleCable(p, p, 1)).toThrow(RangeError);
    });

    it("writes nothing while slack or exactly at its length", () => {
        const out = pool(1);
        expect(new ParticleCable(at(0), at(1.5), 2).addContacts(out, 0)).toBe(0);
        expect(new ParticleCable(at(0), at(2), 2).addContacts(out, 0)).toBe(0);
    });

    it("draws the particles together once past its length", () => {
        const a = at(0);
        const b = at(3);
        const out = pool(1);

        expect(new ParticleCable(a, b, 2, 0.4).addContacts(out, 0)).toBe(1);
        expect(out[0]!.particleA).toBe(a);
        expect(out[0]!.particleB).toBe(b);
        expect(out[0]!.normal).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
        expect(out[0]!.penetration).toBeCloseTo(1);
        expect(out[0]!.restitution).toBe(0.4);
    });

    it("writes at start and nothing when the pool is full", () => {
        const cable = new ParticleCable(at(0), at(3), 2);
        const out = pool(2);
        expect(cable.addContacts(out, 2)).toBe(0);
        expect(cable.addContacts(out, 1)).toBe(1);
        expect(out[1]!.penetration).toBeCloseTo(1);
    });

    it("snaps taut with its restitution", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        const ball = at(1.95);
        ball.velocity.set(6, 0, 0);
        ball.damping = 1;
        world.particles.push(ball);
        world.contactGenerators.push(new ParticleCable(anchor(0, 0), ball, 2, 0.5));

        world.step(1 / 60);

        expect(ball.position.x).toBeCloseTo(2);
        expect(ball.velocity.x).toBeCloseTo(-3);
    });

    it("writes nothing for coincident particles, whatever maxLength is set to", () => {
        const cable = new ParticleCable(at(1), at(1), 1);
        cable.maxLength = -1;
        expect(cable.addContacts(pool(1), 0)).toBe(0);
    });

    it("leaves a particle free while it moves inside the cable's reach", () => {
        const world = new ParticleWorld();
        const ball = at(0, 0.5);
        ball.velocity.set(0, 2, 0);
        ball.damping = 1;
        world.particles.push(ball);
        world.contactGenerators.push(new ParticleCable(anchor(0, 0), ball, 5));

        for (let i = 0; i < 30; i++) {
            world.step(1 / 60);
            expect(world.contactCount).toBe(0);
        }
    });

    it("holds a hanging particle at its length", () => {
        const world = new ParticleWorld();
        const ball = at(0, -1);
        world.particles.push(ball);
        world.contactGenerators.push(new ParticleCable(anchor(0, 0), ball, 2));

        for (let i = 0; i < 600; i++) world.step(1 / 60);

        expect(ball.position.y).toBeCloseTo(-2, 6);
        expect(ball.velocity.magnitude()).toBeLessThan(1e-6);
    });

    it("swings a pendulum without stretching", () => {
        const world = new ParticleWorld();
        const bob = at(2, 0);
        bob.damping = 1;
        const pivot = anchor(0, 0);
        world.particles.push(bob);
        const cable = new ParticleCable(pivot, bob, 2);
        world.contactGenerators.push(cable);

        let lowest = 0;
        for (let i = 0; i < 300; i++) {
            world.step(1 / 240);
            expect(cable.currentLength()).toBeLessThanOrEqual(2 + 1e-9);
            lowest = Math.min(lowest, bob.position.y);
        }
        expect(lowest).toBeCloseTo(-2, 1);
    });
});
