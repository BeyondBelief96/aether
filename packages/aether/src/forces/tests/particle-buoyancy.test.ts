import { describe, expect, it } from "vitest";
import { Particle } from "../../engine";
import { ParticleBuoyancy } from "../particle-buoyancy";

/** A particle at rest at height `y`. */
function atHeight(y: number): Particle {
    const p = new Particle();
    p.position.set(0, y, 0);
    return p;
}

describe("ParticleBuoyancy", () => {
    // ρ·V·g = 1000 · 0.002 · 10 = 20 N when fully submerged
    const make = () => new ParticleBuoyancy(0.5, 0.002, 0, 1000, 10);

    it("applies no force above the surface", () => {
        const p = atHeight(0.5);
        make().updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("applies the full force when fully submerged", () => {
        const p = atHeight(-0.5);
        make().updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 20, z: 0 });

        const deep = atHeight(-10);
        make().updateForce(deep, 1 / 60);
        expect(deep.forceAccum).toBeCloseToVec3({ x: 0, y: 20, z: 0 });
    });

    it("scales linearly with the submerged fraction", () => {
        const half = atHeight(0);
        make().updateForce(half, 1 / 60);
        expect(half.forceAccum).toBeCloseToVec3({ x: 0, y: 10, z: 0 });

        const quarter = atHeight(0.25);
        make().updateForce(quarter, 1 / 60);
        expect(quarter.forceAccum).toBeCloseToVec3({ x: 0, y: 5, z: 0 });
    });

    it("measures depth from waterHeight", () => {
        const p = atHeight(3);
        new ParticleBuoyancy(0.5, 0.002, 3, 1000, 10).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 10, z: 0 });
    });

    it("defaults to water under Earth gravity", () => {
        const p = atHeight(-1);
        new ParticleBuoyancy(0.5, 0.001, 0).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 9.81, z: 0 });
    });

    it("skips immovable particles", () => {
        const p = atHeight(-1);
        p.setMass(Infinity);
        make().updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("rejects invalid parameters", () => {
        expect(() => new ParticleBuoyancy(0, 1, 0)).toThrow(RangeError);
        expect(() => new ParticleBuoyancy(1, -1, 0)).toThrow(RangeError);
        expect(() => new ParticleBuoyancy(1, 1, NaN)).toThrow(RangeError);
        expect(() => new ParticleBuoyancy(1, 1, 0, -1)).toThrow(RangeError);
        expect(() => new ParticleBuoyancy(1, 1, 0, 1000, -1)).toThrow(RangeError);
    });
});
