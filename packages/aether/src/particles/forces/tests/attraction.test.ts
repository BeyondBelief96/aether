import { describe, expect, it } from "vitest";
import { Particle, ParticleWorld } from "../..";
import { ParticleAttraction } from "../attraction";

function at(x: number, y: number, z: number, mass = 1): Particle {
    const p = new Particle();
    p.setMass(mass);
    p.position.set(x, y, z);
    return p;
}

describe("ParticleAttraction", () => {
    it("pulls toward the source with mass · strength / r²", () => {
        const source = at(0, 0, 0);
        const p = at(2, 0, 0, 3);
        new ParticleAttraction(source, 8).updateForce(p, 1 / 60);
        // 3 · 8 / 2² = 6 N toward the origin
        expect(p.forceAccum).toBeCloseToVec3({ x: -6, y: 0, z: 0 });
    });

    it("follows the inverse-square law", () => {
        const source = at(0, 0, 0);
        const near = at(0, 1, 0);
        const far = at(0, 3, 0);
        const pull = new ParticleAttraction(source, 5);
        pull.updateForce(near, 1 / 60);
        pull.updateForce(far, 1 / 60);
        expect(near.forceAccum.y / far.forceAccum.y).toBeCloseTo(9, 12);
    });

    it("stays finite at the source when softened", () => {
        const source = at(1, 1, 1);
        const p = at(1, 1, 1);
        new ParticleAttraction(source, 10, 0.5).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("skips coincident particles without softening", () => {
        const p = at(0, 0, 0);
        new ParticleAttraction(at(0, 0, 0), 10).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("weakens the force near the source when softened", () => {
        const source = at(0, 0, 0);
        const hard = at(0.1, 0, 0);
        const soft = at(0.1, 0, 0);
        new ParticleAttraction(source, 1).updateForce(hard, 1 / 60);
        new ParticleAttraction(source, 1, 1).updateForce(soft, 1 / 60);
        expect(Math.abs(soft.forceAccum.x)).toBeLessThan(Math.abs(hard.forceAccum.x) / 100);
    });

    it("skips immovable particles", () => {
        const p = at(1, 0, 0, Infinity);
        new ParticleAttraction(at(0, 0, 0), 10).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("rejects negative, NaN or infinite parameters", () => {
        const source = at(0, 0, 0);
        expect(() => new ParticleAttraction(source, -1)).toThrow(RangeError);
        expect(() => new ParticleAttraction(source, 1, -1)).toThrow(RangeError);
        expect(() => new ParticleAttraction(source, Number.NaN)).toThrow(RangeError);
        expect(() => new ParticleAttraction(source, Infinity)).toThrow(RangeError);
        expect(() => new ParticleAttraction(source, 1, Infinity)).toThrow(RangeError);
    });

    it("holds a circular orbit", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        const sun = at(0, 0, 0, Infinity);
        const planet = at(5, 0, 0);
        const strength = 20;
        planet.velocity.set(0, 0, Math.sqrt(strength / 5)); // v = sqrt(GM / r)
        planet.damping = 1;
        world.particles.push(sun, planet);
        world.forceRegistry.add(planet, new ParticleAttraction(sun, strength));

        const dt = 1 / 240;
        let minRadius = Infinity;
        let maxRadius = 0;
        for (let t = 0; t < 20; t += dt) {
            world.step(dt);
            const r = planet.position.magnitude();
            minRadius = Math.min(minRadius, r);
            maxRadius = Math.max(maxRadius, r);
        }
        expect(minRadius).toBeGreaterThan(4.9);
        expect(maxRadius).toBeLessThan(5.1);
    });
});
