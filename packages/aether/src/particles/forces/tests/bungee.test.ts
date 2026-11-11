import { describe, expect, it } from "vitest";
import { Particle } from "../..";
import { ParticleBungee } from "../bungee";

/** A particle at rest at `(x, y, z)`. */
function at(x: number, y: number, z: number): Particle {
    const p = new Particle();
    p.position.set(x, y, z);
    return p;
}

describe("ParticleBungee", () => {
    it("pulls a stretched particle toward the other end with k·(length − rest)", () => {
        const p = at(3, 0, 0);
        new ParticleBungee(at(0, 0, 0), 2, 1).updateForce(p, 1 / 60);

        // stretch = 2, |F| = 4
        expect(p.forceAccum).toBeCloseToVec3({ x: -4, y: 0, z: 0 });
    });

    it("applies no force when compressed", () => {
        const p = at(0, 1, 0);
        new ParticleBungee(at(0, 0, 0), 10, 3).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("applies no force at rest length", () => {
        const p = at(3, 4, 0);
        new ParticleBungee(at(0, 0, 0), 5, 5).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("acts along the line between the ends", () => {
        const p = at(3, 4, 0);
        new ParticleBungee(at(0, 0, 0), 1, 0).updateForce(p, 1 / 60);

        // stretch = 5, |F| = 5 along −(0.6, 0.8, 0)
        expect(p.forceAccum).toBeCloseToVec3({ x: -3, y: -4, z: 0 });
    });

    it("gives equal and opposite forces when registered on both ends", () => {
        const a = at(0, 0, 0);
        const b = at(1, 2, 2);
        new ParticleBungee(b, 4, 1).updateForce(a, 1 / 60);
        new ParticleBungee(a, 4, 1).updateForce(b, 1 / 60);

        expect(a.forceAccum).toBeCloseToVec3({
            x: -b.forceAccum.x,
            y: -b.forceAccum.y,
            z: -b.forceAccum.z,
        });
    });

    it("does not pull the other end", () => {
        const other = at(0, 0, 0);
        new ParticleBungee(other, 1, 0).updateForce(at(1, 0, 0), 1 / 60);
        expect(other.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("skips immovable particles", () => {
        const p = at(2, 0, 0);
        p.setMass(Infinity);
        new ParticleBungee(at(0, 0, 0), 1, 0).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("skips coincident ends with zero rest length", () => {
        const p = at(1, 1, 1);
        new ParticleBungee(at(1, 1, 1), 1, 0).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("rejects invalid parameters", () => {
        const other = new Particle();
        expect(() => new ParticleBungee(other, -1, 1)).toThrow(RangeError);
        expect(() => new ParticleBungee(other, 1, -1)).toThrow(RangeError);
        expect(() => new ParticleBungee(other, NaN, 1)).toThrow(RangeError);
    });
});
