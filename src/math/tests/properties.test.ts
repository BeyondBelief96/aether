import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Mat3x3 } from "../geometry/mat3x3";
import { Mat3x4 } from "../geometry/mat3x4";
import { Quaternion } from "../geometry/quaternion";
import { Vec3 } from "../geometry/vec3";

// Property-based tests: each property runs against fast-check's random inputs (100 by default)
// and shrinks any failure to a minimal counterexample.

const coord = (max: number) => fc.double({ min: -max, max, noNaN: true, noDefaultInfinity: true });

const vec3 = fc.tuple(coord(100), coord(100), coord(100)).map(([x, y, z]) => new Vec3(x, y, z));

/** Unit quaternions from 4D points away from the origin, so normalizing is well conditioned. */
const unitQuat = fc
    .tuple(coord(1), coord(1), coord(1), coord(1))
    .map(([w, x, y, z]) => new Quaternion(w, x, y, z))
    .filter((q) => q.magnitude() > 0.1)
    .map((q) => q.normalize());

/** Matrices with entries in [−10, 10] and |det| ≥ 1, so the inverse is not ill conditioned. */
const invertibleMat3x3 = fc
    .array(coord(10), { minLength: 9, maxLength: 9 })
    .map((e) => new Mat3x3(...(e as [number, number, number, number, number, number, number, number, number])))
    .filter((m) => Math.abs(m.determinant()) >= 1);

const invertibleMat3x4 = fc
    .tuple(invertibleMat3x3, vec3)
    .map(([m, t]) => new Mat3x4().setFromMat3x3(m, t));

const IDENTITY_3X3 = new Mat3x3();

function expectMat3x3Close(actual: Mat3x3, expected: Mat3x3, digits: number): void {
    for (let i = 0; i < 9; i++) {
        expect(actual.elements[i]).toBeCloseTo(expected.elements[i]!, digits);
    }
}

describe("Quaternion properties", () => {
    it("rotating preserves vector length", () => {
        fc.assert(
            fc.property(unitQuat, vec3, (q, v) => {
                expect(q.rotateVec3(v).magnitude()).toBeCloseTo(v.magnitude(), 9);
            }),
        );
    });

    it("rotating preserves the dot product between vectors", () => {
        fc.assert(
            fc.property(unitQuat, vec3, vec3, (q, a, b) => {
                expect(q.rotateVec3(a).dot(q.rotateVec3(b))).toBeCloseTo(a.dot(b), 7);
            }),
        );
    });

    it("composes as a · b applies b first, then a", () => {
        fc.assert(
            fc.property(unitQuat, unitQuat, vec3, (a, b, v) => {
                const composed = a.clone().multiply(b).rotateVec3(v);
                const sequential = a.rotateVec3(b.rotateVec3(v));
                expect(composed).toBeCloseToVec3(sequential, 9);
            }),
        );
    });

    it("rotates the same way as its rotation matrix", () => {
        fc.assert(
            fc.property(unitQuat, vec3, (q, v) => {
                const m = new Mat3x3().setFromQuaternion(q);
                expect(m.transformVec3(v)).toBeCloseToVec3(q.rotateVec3(v), 9);
            }),
        );
    });

    it("round-trips through a rotation matrix", () => {
        fc.assert(
            fc.property(unitQuat, (q) => {
                const back = new Quaternion().setFromRotationMatrix(new Mat3x3().setFromQuaternion(q));
                expect(back).toBeCloseToQuat(q, 9);
            }),
        );
    });

    it("multiplied by its conjugate gives the identity", () => {
        fc.assert(
            fc.property(unitQuat, (q) => {
                expect(q.clone().multiply(q.clone().conjugate())).toBeCloseToQuat(new Quaternion(), 12);
            }),
        );
    });
});

describe("Mat3x3 properties", () => {
    it("M · M⁻¹ = I for random invertible matrices", () => {
        fc.assert(
            fc.property(invertibleMat3x3, (m) => {
                const product = new Mat3x3().multiplyMatrices(m, new Mat3x3().setInverse(m));
                expectMat3x3Close(product, IDENTITY_3X3, 6);
            }),
        );
    });

    it("det(Mᵀ) = det(M)", () => {
        fc.assert(
            fc.property(invertibleMat3x3, (m) => {
                const det = m.determinant();
                expect(m.clone().transpose().determinant()).toBeCloseTo(det, 6);
            }),
        );
    });

    it("det(A · B) = det(A) · det(B)", () => {
        fc.assert(
            fc.property(invertibleMat3x3, invertibleMat3x3, (a, b) => {
                const expected = a.determinant() * b.determinant();
                const actual = new Mat3x3().multiplyMatrices(a, b).determinant();
                expect(Math.abs(actual - expected)).toBeLessThan(1e-9 * Math.max(1, Math.abs(expected)));
            }),
        );
    });

    it("a quaternion's matrix is orthonormal: its inverse is its transpose", () => {
        fc.assert(
            fc.property(unitQuat, (q) => {
                const m = new Mat3x3().setFromQuaternion(q);
                expectMat3x3Close(new Mat3x3().setInverse(m), m.clone().transpose(), 9);
            }),
        );
    });
});

describe("Mat3x4 properties", () => {
    it("transformInversePoint undoes transformPoint for rigid transforms", () => {
        fc.assert(
            fc.property(vec3, unitQuat, vec3, (p, q, v) => {
                const m = new Mat3x4().setFromPositionQuaternion(p, q);
                expect(m.transformInversePoint(m.transformPoint(v))).toBeCloseToVec3(v, 9);
            }),
        );
    });

    it("the inverse of a random invertible transform round-trips points", () => {
        fc.assert(
            fc.property(invertibleMat3x4, vec3, (m, v) => {
                const inverse = new Mat3x4().setInverse(m);
                expect(inverse.transformPoint(m.transformPoint(v))).toBeCloseToVec3(v, 6);
            }),
        );
    });
});
