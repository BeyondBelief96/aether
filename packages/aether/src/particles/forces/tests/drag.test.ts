import { describe, expect, it } from "vitest";
import { Particle, ParticleWorld } from "../..";
import { ParticleDrag } from "../drag";

/** A particle at the origin moving at `velocity`. */
function moving(x: number, y: number, z: number): Particle {
    const p = new Particle();
    p.velocity.set(x, y, z);
    return p;
}

describe("ParticleDrag", () => {
    it("applies k1·|v| + k2·|v|² opposite the velocity", () => {
        const p = moving(3, 4, 0); // |v| = 5
        new ParticleDrag(0.5, 0.1).updateForce(p, 1 / 60);

        // |F| = 0.5·5 + 0.1·25 = 5, along −v̂ = (−0.6, −0.8, 0)
        expect(p.forceAccum).toBeCloseToVec3({ x: -3, y: -4, z: 0 });
    });

    it("applies no force at rest", () => {
        const p = moving(0, 0, 0);
        new ParticleDrag(1, 1).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("grows quadratically with speed when k1 is zero", () => {
        const slow = moving(2, 0, 0);
        const fast = moving(4, 0, 0);
        const drag = new ParticleDrag(0, 1);
        drag.updateForce(slow, 1 / 60);
        drag.updateForce(fast, 1 / 60);
        expect(fast.forceAccum.x / slow.forceAccum.x).toBeCloseTo(4, 12);
    });

    it("does not modify the particle's velocity", () => {
        const p = moving(1, 2, 3);
        new ParticleDrag(1, 1).updateForce(p, 1 / 60);
        expect(p.velocity).toBeCloseToVec3({ x: 1, y: 2, z: 3 });
    });

    it("skips immovable particles", () => {
        const p = moving(1, 0, 0);
        p.setMass(Infinity);
        new ParticleDrag(1, 1).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("rejects negative coefficients", () => {
        expect(() => new ParticleDrag(-1, 0)).toThrow(RangeError);
        expect(() => new ParticleDrag(0, -1)).toThrow(RangeError);
        expect(() => new ParticleDrag(Number.NaN, 0)).toThrow(RangeError);
    });

    it("slows a particle without reversing it", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        const p = moving(10, 0, 0);
        p.damping = 1;
        world.particles.push(p);
        world.forceRegistry.add(p, new ParticleDrag(0.5, 0.05));

        let previous = p.velocity.x;
        for (let i = 0; i < 300; i++) {
            world.step(1 / 60);
            expect(p.velocity.x).toBeGreaterThan(0);
            expect(p.velocity.x).toBeLessThan(previous);
            previous = p.velocity.x;
        }
    });

    it("reaches terminal velocity under gravity", () => {
        const world = new ParticleWorld();
        const p = moving(0, 0, 0);
        p.damping = 1;
        world.particles.push(p);
        world.forceRegistry.add(p, new ParticleDrag(0, 0.1));

        for (let i = 0; i < 60 * 20; i++) world.step(1 / 60);

        // m·g = k2·v² → v = √(9.81 / 0.1)
        expect(p.velocity.y).toBeCloseTo(-Math.sqrt(98.1), 3);
    });
});
