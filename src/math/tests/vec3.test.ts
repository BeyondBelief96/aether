import { describe, expect, it } from "vitest";
import { Vec3 } from "../geometry/vec3";
import type { Vec3Like } from "../types";

function expectVec3(
    actual: Vec3Like,
    x: number,
    y: number,
    z: number,
    digits = 12,
) {
    expect(actual.x).toBeCloseTo(x, digits);
    expect(actual.y).toBeCloseTo(y, digits);
    expect(actual.z).toBeCloseTo(z, digits);
}

const X = () => new Vec3(1, 0, 0);
const Y = () => new Vec3(0, 1, 0);
const Z = () => new Vec3(0, 0, 1);

describe("Vec3", () => {
    describe("construction and copying", () => {
        it("stores its components", () => {
            expectVec3(new Vec3(1, -2, 3), 1, -2, 3);
        });

        it("copies from any Vec3Like and returns itself", () => {
            const v = new Vec3(0, 0, 0);
            const result = v.copy({ x: 4, y: 5, z: 6 });
            expect(result).toBe(v);
            expectVec3(v, 4, 5, 6);
        });

        it("clones into an independent instance", () => {
            const a = new Vec3(1, 2, 3);
            const b = a.clone();
            expect(b).not.toBe(a);
            b.x = 10;
            expect(a.x).toBe(1);
        });
    });

    describe("magnitude", () => {
        it("computes the Euclidean length", () => {
            expect(new Vec3(3, 4, 0).magnitude()).toBe(5);
            expect(new Vec3(2, 3, 6).magnitude()).toBe(7);
        });

        it("computes the squared length", () => {
            expect(new Vec3(1, 2, 3).magnitudeSquared()).toBe(14);
        });

        it("is zero for the zero vector", () => {
            expect(new Vec3(0, 0, 0).magnitude()).toBe(0);
        });
    });

    describe("arithmetic", () => {
        it("adds", () => {
            expectVec3(new Vec3(1, 2, 3).add({ x: 4, y: 5, z: 6 }), 5, 7, 9);
        });

        it("subtracts", () => {
            expectVec3(
                new Vec3(1, 2, 3).subtract({ x: 4, y: 6, z: 8 }),
                -3,
                -4,
                -5,
            );
        });

        it("scales", () => {
            expectVec3(new Vec3(1, -2, 3).scale(2), 2, -4, 6);
        });

        it("adds a scaled vector without scaling itself", () => {
            expectVec3(
                new Vec3(1, 1, 1).addScaled({ x: 1, y: 2, z: 3 }, 2),
                3,
                5,
                7,
            );
        });

        it("multiplies component-wise", () => {
            expectVec3(
                new Vec3(1, 2, 3).componentWiseProduct({ x: 4, y: 5, z: -6 }),
                4,
                10,
                -18,
            );
        });

        it("returns itself from mutating methods for chaining", () => {
            const v = new Vec3(1, 0, 0);
            expect(
                v
                    .add(Y())
                    .subtract(Z())
                    .scale(2)
                    .addScaled(X(), 1)
                    .componentWiseProduct(X()),
            ).toBe(v);
            expectVec3(v, 3, 0, 0);
        });

        it("does not modify the argument", () => {
            const w = new Vec3(4, 5, 6);
            new Vec3(1, 2, 3)
                .add(w)
                .subtract(w)
                .addScaled(w, 2)
                .componentWiseProduct(w);
            expectVec3(w, 4, 5, 6);
        });
    });

    describe("dot", () => {
        it("sums component products", () => {
            expect(new Vec3(1, 2, 3).dot({ x: 4, y: -5, z: 6 })).toBe(12);
        });

        it("is zero for perpendicular vectors", () => {
            expect(X().dot(Y())).toBe(0);
        });

        it("equals the squared magnitude when dotted with itself", () => {
            const v = new Vec3(1, -2, 3);
            expect(v.dot(v)).toBe(v.magnitudeSquared());
        });

        it("is commutative", () => {
            const a = new Vec3(1, 2, 3);
            const b = new Vec3(-4, 0.5, 7);
            expect(a.dot(b)).toBe(b.dot(a));
        });
    });

    describe("cross", () => {
        it("follows the right-handed basis cycle", () => {
            expectVec3(X().cross(Y()), 0, 0, 1);
            expectVec3(Y().cross(Z()), 1, 0, 0);
            expectVec3(Z().cross(X()), 0, 1, 0);
        });

        it("is anti-commutative", () => {
            const a = new Vec3(1, 2, 3);
            const b = new Vec3(-4, 5, 0.5);
            const ab = a.clone().cross(b);
            const ba = b.clone().cross(a);
            expectVec3(ab, -ba.x, -ba.y, -ba.z);
        });

        it("is perpendicular to both inputs", () => {
            const a = new Vec3(1, 2, 3);
            const b = new Vec3(-4, 5, 0.5);
            const c = a.clone().cross(b);
            expect(c.dot(a)).toBeCloseTo(0, 12);
            expect(c.dot(b)).toBeCloseTo(0, 12);
        });

        it("has magnitude |a||b|sin(θ)", () => {
            const a = new Vec3(2, 0, 0);
            const b = new Vec3(
                Math.cos(Math.PI / 6),
                Math.sin(Math.PI / 6),
                0,
            ).scale(3);
            expect(a.clone().cross(b).magnitude()).toBeCloseTo(2 * 3 * 0.5, 12);
        });

        it("is zero for parallel vectors", () => {
            expectVec3(new Vec3(1, 2, 3).cross({ x: 2, y: 4, z: 6 }), 0, 0, 0);
        });

        it("handles crossing a vector with itself", () => {
            const v = new Vec3(1, 2, 3);
            expectVec3(v.cross(v), 0, 0, 0);
        });

        it("returns itself", () => {
            const v = X();
            expect(v.cross(Y())).toBe(v);
        });

        it("static version matches the instance method", () => {
            const a = new Vec3(1, 2, 3);
            const b = new Vec3(-4, 5, 0.5);
            const expected = a.clone().cross(b);
            expectVec3(Vec3.cross(a, b), expected.x, expected.y, expected.z);
        });

        it("static version does not modify its inputs", () => {
            const a = new Vec3(1, 2, 3);
            const b = new Vec3(-4, 5, 0.5);
            Vec3.cross(a, b);
            expectVec3(a, 1, 2, 3);
            expectVec3(b, -4, 5, 0.5);
        });
    });

    describe("normalize", () => {
        it("produces a unit vector", () => {
            expect(new Vec3(3, -4, 12).normalize().magnitude()).toBeCloseTo(
                1,
                12,
            );
        });

        it("preserves direction", () => {
            expectVec3(new Vec3(0, 0, -5).normalize(), 0, 0, -1);
            expectVec3(new Vec3(3, 4, 0).normalize(), 0.6, 0.8, 0);
        });

        it("leaves a unit vector unchanged", () => {
            expectVec3(Y().normalize(), 0, 1, 0);
        });

        it("leaves the zero vector unchanged instead of producing NaN", () => {
            const v = new Vec3(0, 0, 0).normalize();
            expect(
                Number.isNaN(v.x) || Number.isNaN(v.y) || Number.isNaN(v.z),
            ).toBe(false);
            expectVec3(v, 0, 0, 0);
        });

        it("handles very small vectors", () => {
            expect(
                new Vec3(1e-150, 1e-150, 0).normalize().magnitude(),
            ).toBeCloseTo(1, 12);
        });

        it("returns itself", () => {
            const v = new Vec3(1, 2, 3);
            expect(v.normalize()).toBe(v);
        });
    });
});
