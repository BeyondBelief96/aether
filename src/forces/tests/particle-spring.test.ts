import { describe, expect, it } from "vitest";
import { Particle } from "../../engine";
import { ParticleSpring } from "../particle-spring";

/** A particle at rest at `(x, y, z)`. */
function at(x: number, y: number, z: number): Particle {
    const p = new Particle();
    p.position.set(x, y, z);
    return p;
}

describe("ParticleSpring", () => {
    it("pulls stretched ends together with k·(length − rest)", () => {
        const a = at(0, 0, 0);
        const b = at(3, 0, 0);
        new ParticleSpring(a, b, 2, 1).apply(1 / 60);

        // stretch = 2, |F| = 4
        expect(a.forceAccum).toBeCloseToVec3({ x: 4, y: 0, z: 0 });
        expect(b.forceAccum).toBeCloseToVec3({ x: -4, y: 0, z: 0 });
    });

    it("pushes compressed ends apart", () => {
        const a = at(0, 0, 0);
        const b = at(0, 1, 0);
        new ParticleSpring(a, b, 10, 3).apply(1 / 60);

        // compression = 2, |F| = 20
        expect(a.forceAccum).toBeCloseToVec3({ x: 0, y: -20, z: 0 });
        expect(b.forceAccum).toBeCloseToVec3({ x: 0, y: 20, z: 0 });
    });

    it("applies no force at rest length", () => {
        const a = at(0, 0, 0);
        const b = at(3, 4, 0);
        new ParticleSpring(a, b, 5, 5).apply(1 / 60);
        expect(a.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        expect(b.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("acts along the line between the ends", () => {
        const a = at(0, 0, 0);
        const b = at(3, 4, 0);
        new ParticleSpring(a, b, 1, 0).apply(1 / 60);

        // stretch = 5, |F| = 5 along (0.6, 0.8, 0)
        expect(a.forceAccum).toBeCloseToVec3({ x: 3, y: 4, z: 0 });
        expect(b.forceAccum).toBeCloseToVec3({ x: -3, y: -4, z: 0 });
    });

    it("still pushes the movable end when the other is immovable", () => {
        const anchor = at(0, 0, 0);
        anchor.setMass(Infinity);
        const bob = at(0, -2, 0);
        new ParticleSpring(anchor, bob, 3, 1).apply(1 / 60);

        expect(anchor.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        expect(bob.forceAccum).toBeCloseToVec3({ x: 0, y: 3, z: 0 });
    });

    it("skips coincident ends", () => {
        const a = at(1, 1, 1);
        const b = at(1, 1, 1);
        new ParticleSpring(a, b, 1, 1).apply(1 / 60);
        expect(a.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        expect(b.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("lists both ends as its particles", () => {
        const a = at(0, 0, 0);
        const b = at(1, 0, 0);
        expect(new ParticleSpring(a, b, 1, 1).particles).toEqual([a, b]);
    });

    it("rejects invalid parameters", () => {
        const a = new Particle();
        const b = new Particle();
        expect(() => new ParticleSpring(a, a, 1, 1)).toThrow(RangeError);
        expect(() => new ParticleSpring(a, b, -1, 1)).toThrow(RangeError);
        expect(() => new ParticleSpring(a, b, 1, -1)).toThrow(RangeError);
        expect(() => new ParticleSpring(a, b, NaN, 1)).toThrow(RangeError);
    });
});
