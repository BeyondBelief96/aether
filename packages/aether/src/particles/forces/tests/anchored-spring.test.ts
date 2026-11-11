import { describe, expect, it } from "vitest";
import { Particle } from "../..";
import { Vec3 } from "../../../math";
import { ParticleAnchoredSpring } from "../anchored-spring";

/** A particle at rest at `(x, y, z)`. */
function at(x: number, y: number, z: number): Particle {
    const p = new Particle();
    p.position.set(x, y, z);
    return p;
}

describe("ParticleAnchoredSpring", () => {
    it("pulls a stretched particle toward the anchor with k·(length − rest)", () => {
        const p = at(3, 0, 0);
        new ParticleAnchoredSpring({ x: 0, y: 0, z: 0 }, 2, 1).updateForce(p, 1 / 60);

        // stretch = 2, |F| = 4
        expect(p.forceAccum).toBeCloseToVec3({ x: -4, y: 0, z: 0 });
    });

    it("pushes a compressed particle away from the anchor", () => {
        const p = at(0, 1, 0);
        new ParticleAnchoredSpring({ x: 0, y: 0, z: 0 }, 10, 3).updateForce(p, 1 / 60);

        // compression = 2, |F| = 20
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 20, z: 0 });
    });

    it("applies no force at rest length", () => {
        const p = at(3, 4, 0);
        new ParticleAnchoredSpring({ x: 0, y: 0, z: 0 }, 5, 5).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("acts along the line from the anchor", () => {
        const p = at(4, 5, 1);
        new ParticleAnchoredSpring({ x: 1, y: 1, z: 1 }, 1, 0).updateForce(p, 1 / 60);

        // stretch = 5, |F| = 5 along −(0.6, 0.8, 0)
        expect(p.forceAccum).toBeCloseToVec3({ x: -3, y: -4, z: 0 });
    });

    it("copies the anchor at construction", () => {
        const source = new Vec3(0, 0, 0);
        const spring = new ParticleAnchoredSpring(source, 1, 0);
        source.set(10, 0, 0);
        expect(spring.anchor).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("follows the anchor when it moves", () => {
        const p = at(0, 0, 0);
        const spring = new ParticleAnchoredSpring({ x: 0, y: 0, z: 0 }, 1, 0);
        spring.anchor.set(0, 0, 2);
        spring.updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 2 });
    });

    it("skips immovable particles", () => {
        const p = at(2, 0, 0);
        p.setMass(Infinity);
        new ParticleAnchoredSpring({ x: 0, y: 0, z: 0 }, 1, 0).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("skips a particle at the anchor", () => {
        const p = at(1, 1, 1);
        new ParticleAnchoredSpring({ x: 1, y: 1, z: 1 }, 1, 1).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("rejects invalid parameters", () => {
        const anchor = { x: 0, y: 0, z: 0 };
        expect(() => new ParticleAnchoredSpring(anchor, -1, 1)).toThrow(RangeError);
        expect(() => new ParticleAnchoredSpring(anchor, 1, -1)).toThrow(RangeError);
        expect(() => new ParticleAnchoredSpring(anchor, NaN, 1)).toThrow(RangeError);
    });
});
