import { describe, expect, it } from "vitest";
import { Quaternion } from "../geometry/quaternion";
import { Vec3 } from "../geometry/vec3";
import { Mat3x3 } from "../geometry/mat3x3";

function expectQuat(
    actual: Quaternion,
    w: number,
    x: number,
    y: number,
    z: number,
    digits = 12,
) {
    expect(actual.w).toBeCloseTo(w, digits);
    expect(actual.x).toBeCloseTo(x, digits);
    expect(actual.y).toBeCloseTo(y, digits);
    expect(actual.z).toBeCloseTo(z, digits);
}

function expectVec3(actual: Vec3, x: number, y: number, z: number, digits = 12) {
    expect(actual.x).toBeCloseTo(x, digits);
    expect(actual.y).toBeCloseTo(y, digits);
    expect(actual.z).toBeCloseTo(z, digits);
}

function hasNaN(q: Quaternion): boolean {
    return (
        Number.isNaN(q.w) ||
        Number.isNaN(q.x) ||
        Number.isNaN(q.y) ||
        Number.isNaN(q.z)
    );
}

describe("Quaternion", () => {
    describe("construction", () => {
        it("stores its components in w, x, y, z order", () => {
            expectQuat(new Quaternion(1, -2, 3, -4), 1, -2, 3, -4);
        });

        it("defaults to the identity", () => {
            expectQuat(new Quaternion(), 1, 0, 0, 0);
        });
    });

    describe("identity", () => {
        it("sets [1, 0]", () => {
            expectQuat(new Quaternion(5, 6, 7, 8).identity(), 1, 0, 0, 0);
        });

        it("returns itself", () => {
            const q = new Quaternion(5, 6, 7, 8);
            expect(q.identity()).toBe(q);
        });
    });

    describe("magnitude", () => {
        it("computes the squared magnitude", () => {
            expect(new Quaternion(1, 2, 3, 4).magnitudeSquared()).toBe(30);
        });

        it("computes the magnitude", () => {
            expect(new Quaternion(1, 2, 2, 4).magnitude()).toBeCloseTo(5, 12);
        });

        it("is 1 for the identity", () => {
            expect(new Quaternion(1, 0, 0, 0).magnitude()).toBe(1);
        });

        it("is 1 for a rotation quaternion", () => {
            const half = Math.PI / 6;
            const s = Math.sin(half) / Math.sqrt(3);
            expect(
                new Quaternion(Math.cos(half), s, s, s).magnitude(),
            ).toBeCloseTo(1, 12);
        });
    });

    describe("normalize", () => {
        it("produces unit magnitude", () => {
            expect(
                new Quaternion(3, -4, 12, 84).normalize().magnitude(),
            ).toBeCloseTo(1, 12);
        });

        it("preserves direction", () => {
            expectQuat(new Quaternion(1, 2, 2, 4).normalize(), 0.2, 0.4, 0.4, 0.8);
            expectQuat(new Quaternion(0, 0, -5, 0).normalize(), 0, 0, -1, 0);
        });

        it("leaves a unit quaternion unchanged", () => {
            expectQuat(new Quaternion(0.5, 0.5, -0.5, 0.5).normalize(), 0.5, 0.5, -0.5, 0.5);
        });

        it("keeps the sign of [-1, 0]", () => {
            expectQuat(new Quaternion(-2, 0, 0, 0).normalize(), -1, 0, 0, 0);
        });

        it("turns the zero quaternion into the identity instead of producing NaN", () => {
            const q = new Quaternion(0, 0, 0, 0).normalize();
            expect(hasNaN(q)).toBe(false);
            expectQuat(q, 1, 0, 0, 0);
        });

        it("handles very small quaternions", () => {
            expect(
                new Quaternion(1e-150, 1e-150, 0, 0).normalize().magnitude(),
            ).toBeCloseTo(1, 12);
        });

        it("corrects drift from repeated small perturbations", () => {
            const q = new Quaternion(1, 0, 0, 0);
            for (let i = 0; i < 1000; i++) {
                q.w += 1e-4;
                q.x += 1e-4;
            }
            expect(q.magnitude()).not.toBeCloseTo(1, 6);
            expect(q.normalize().magnitude()).toBeCloseTo(1, 12);
        });

        it("returns itself", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.normalize()).toBe(q);
        });
    });

    describe("set", () => {
        it("overwrites all components in w, x, y, z order", () => {
            expectQuat(new Quaternion(0, 0, 0, 0).set(1, -2, 3, -4), 1, -2, 3, -4);
        });

        it("returns itself", () => {
            const q = new Quaternion(0, 0, 0, 0);
            expect(q.set(1, 2, 3, 4)).toBe(q);
        });
    });

    describe("equals", () => {
        it("is true for identical quaternions", () => {
            expect(new Quaternion(1, 2, 3, 4).equals(new Quaternion(1, 2, 3, 4), 1e-9)).toBe(true);
        });

        it("is true within epsilon", () => {
            expect(
                new Quaternion(1, 2, 3, 4).equals(new Quaternion(1 + 1e-10, 2, 3, 4 - 1e-10), 1e-9),
            ).toBe(true);
        });

        it("is false when any single component differs beyond epsilon", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.equals(new Quaternion(1.1, 2, 3, 4), 1e-9)).toBe(false);
            expect(q.equals(new Quaternion(1, 2.1, 3, 4), 1e-9)).toBe(false);
            expect(q.equals(new Quaternion(1, 2, 3.1, 4), 1e-9)).toBe(false);
            expect(q.equals(new Quaternion(1, 2, 3, 4.1), 1e-9)).toBe(false);
        });

        it("treats q and -q as different, even though they are the same rotation", () => {
            expect(new Quaternion(1, 0, 0, 0).equals(new Quaternion(-1, 0, 0, 0), 1e-9)).toBe(false);
        });
    });

    describe("dot", () => {
        it("sums the component-wise products", () => {
            expect(new Quaternion(1, 2, 3, 4).dot(new Quaternion(5, 6, 7, 8))).toBe(70);
        });

        it("equals magnitudeSquared when dotted with itself", () => {
            const q = new Quaternion(1, -2, 3, -4);
            expect(q.dot(q)).toBe(q.magnitudeSquared());
        });

        it("is -1 between q and -q for a unit quaternion", () => {
            const q = new Quaternion(0.5, 0.5, -0.5, 0.5);
            expect(q.dot(new Quaternion(-0.5, -0.5, 0.5, -0.5))).toBeCloseTo(-1, 12);
        });
    });

    describe("multiply", () => {
        const s = Math.SQRT1_2;
        // 90° rotations about each axis: [cos 45°, sin 45° · n].
        const rotX = () => new Quaternion(s, s, 0, 0);
        const rotY = () => new Quaternion(s, 0, s, 0);
        const rotZ = () => new Quaternion(s, 0, 0, s);

        it("follows the Hamilton basis rules i² = j² = k² = ijk = -1", () => {
            const i = () => new Quaternion(0, 1, 0, 0);
            const j = () => new Quaternion(0, 0, 1, 0);
            const k = () => new Quaternion(0, 0, 0, 1);

            expectQuat(i().multiply(i()), -1, 0, 0, 0);
            expectQuat(j().multiply(j()), -1, 0, 0, 0);
            expectQuat(k().multiply(k()), -1, 0, 0, 0);
            expectQuat(i().multiply(j()).multiply(k()), -1, 0, 0, 0);
        });

        it("follows the cyclic basis rules ij = k, jk = i, ki = j", () => {
            const i = () => new Quaternion(0, 1, 0, 0);
            const j = () => new Quaternion(0, 0, 1, 0);
            const k = () => new Quaternion(0, 0, 0, 1);

            expectQuat(i().multiply(j()), 0, 0, 0, 1);
            expectQuat(j().multiply(k()), 0, 1, 0, 0);
            expectQuat(k().multiply(i()), 0, 0, 1, 0);
        });

        it("is not commutative: ji = -k", () => {
            const i = new Quaternion(0, 1, 0, 0);
            const j = new Quaternion(0, 0, 1, 0);
            expectQuat(j.multiply(i), 0, 0, 0, -1);
        });

        it("matches a hand-computed general product", () => {
            // [1, (2, 3, 4)] · [5, (6, 7, 8)]
            // w = 5 - (12 + 21 + 32) = -60
            // v = 1·(6, 7, 8) + 5·(2, 3, 4) + (2, 3, 4) × (6, 7, 8)
            //   = (6, 7, 8) + (10, 15, 20) + (-4, 8, -4) = (12, 30, 24)
            expectQuat(
                new Quaternion(1, 2, 3, 4).multiply(new Quaternion(5, 6, 7, 8)),
                -60, 12, 30, 24,
            );
        });

        it("leaves a quaternion unchanged when multiplied by the identity on either side", () => {
            const id = new Quaternion(1, 0, 0, 0);
            expectQuat(new Quaternion(1, 2, 3, 4).multiply(id), 1, 2, 3, 4);
            expectQuat(new Quaternion(1, 0, 0, 0).multiply(new Quaternion(1, 2, 3, 4)), 1, 2, 3, 4);
        });

        it("composes two 90° rotations about the same axis into 180°", () => {
            expectQuat(rotZ().multiply(rotZ()), 0, 0, 0, 1);
        });

        it("composes a 90° X rotation then a 90° Y rotation into 120° about (1, 1, -1)", () => {
            // Applying X first, then Y, is rotY · rotX.
            // 120° about unit (1, 1, -1)/√3 is [cos 60°, sin 60° · n] = [0.5, (0.5, 0.5, -0.5)].
            expectQuat(rotY().multiply(rotX()), 0.5, 0.5, 0.5, -0.5);
        });

        it("gives the identity when a unit quaternion is multiplied by its conjugate", () => {
            const half = Math.PI / 5;
            const n = 1 / Math.sqrt(3);
            const sn = Math.sin(half) * n;
            const q = new Quaternion(Math.cos(half), sn, sn, sn);
            const conj = new Quaternion(q.w, -q.x, -q.y, -q.z);
            expectQuat(q.multiply(conj), 1, 0, 0, 0);
        });

        it("preserves unit magnitude", () => {
            expect(
                new Quaternion(0.5, 0.5, -0.5, 0.5).multiply(rotX()).magnitude(),
            ).toBeCloseTo(1, 12);
        });

        it("multiplies magnitudes", () => {
            const a = new Quaternion(1, 2, 3, 4);
            const b = new Quaternion(5, 6, 7, 8);
            const expected = a.magnitude() * b.magnitude();
            expect(a.multiply(b).magnitude()).toBeCloseTo(expected, 10);
        });

        it("is associative", () => {
            const a = () => new Quaternion(1, 2, 3, 4);
            const b = () => new Quaternion(-2, 0.5, 1, -1);
            const c = () => new Quaternion(0.3, -4, 2, 1);
            const left = a().multiply(b()).multiply(c());
            const right = a().multiply(b().multiply(c()));
            expectQuat(left, right.w, right.x, right.y, right.z, 10);
        });

        it("handles squaring itself (q.multiply(q))", () => {
            const q = new Quaternion(1, 2, 3, 4);
            // [w² - |v|², 2w·v] = [1 - 29, (4, 6, 8)]
            expectQuat(q.multiply(q), -28, 4, 6, 8);
        });

        it("does not modify its argument", () => {
            const q = new Quaternion(5, 6, 7, 8);
            new Quaternion(1, 2, 3, 4).multiply(q);
            expectQuat(q, 5, 6, 7, 8);
        });

        it("returns itself", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.multiply(rotX())).toBe(q);
        });
    });

    describe("premultiply", () => {
        it("computes q · this", () => {
            // [5, (6, 7, 8)] · [1, (2, 3, 4)]: same as the general product but with the
            // cross product flipped, so v = (6, 7, 8) + (10, 15, 20) + (4, -8, 4) = (20, 14, 32).
            expectQuat(
                new Quaternion(1, 2, 3, 4).premultiply(new Quaternion(5, 6, 7, 8)),
                -60, 20, 14, 32,
            );
        });

        it("differs from multiply for non-commuting operands", () => {
            const s = Math.SQRT1_2;
            const a = new Quaternion(s, s, 0, 0).multiply(new Quaternion(s, 0, s, 0));
            const b = new Quaternion(s, s, 0, 0).premultiply(new Quaternion(s, 0, s, 0));
            expect(a.equals(b, 1e-9)).toBe(false);
        });

        it("handles squaring itself (q.premultiply(q))", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expectQuat(q.premultiply(q), -28, 4, 6, 8);
        });

        it("does not modify its argument", () => {
            const q = new Quaternion(5, 6, 7, 8);
            new Quaternion(1, 2, 3, 4).premultiply(q);
            expectQuat(q, 5, 6, 7, 8);
        });

        it("returns itself", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.premultiply(new Quaternion(1, 0, 0, 0))).toBe(q);
        });
    });

    describe("multiplyQuaternions", () => {
        it("sets this to a · b without modifying the operands", () => {
            const a = new Quaternion(1, 2, 3, 4);
            const b = new Quaternion(5, 6, 7, 8);
            const out = new Quaternion(0, 0, 0, 0).multiplyQuaternions(a, b);
            expectQuat(out, -60, 12, 30, 24);
            expectQuat(a, 1, 2, 3, 4);
            expectQuat(b, 5, 6, 7, 8);
        });

        it("works when the output aliases the left operand", () => {
            const a = new Quaternion(1, 2, 3, 4);
            a.multiplyQuaternions(a, new Quaternion(5, 6, 7, 8));
            expectQuat(a, -60, 12, 30, 24);
        });

        it("works when the output aliases the right operand", () => {
            const b = new Quaternion(5, 6, 7, 8);
            b.multiplyQuaternions(new Quaternion(1, 2, 3, 4), b);
            expectQuat(b, -60, 12, 30, 24);
        });

        it("works when the output aliases both operands", () => {
            const q = new Quaternion(1, 2, 3, 4);
            q.multiplyQuaternions(q, q);
            expectQuat(q, -28, 4, 6, 8);
        });

        it("returns itself", () => {
            const out = new Quaternion(0, 0, 0, 0);
            expect(
                out.multiplyQuaternions(new Quaternion(1, 0, 0, 0), new Quaternion(1, 0, 0, 0)),
            ).toBe(out);
        });
    });

    describe("copy and clone", () => {
        it("copies from any QuatLike and returns itself", () => {
            const q = new Quaternion();
            expect(q.copy({ w: 1, x: -2, y: 3, z: -4 })).toBe(q);
            expectQuat(q, 1, -2, 3, -4);
        });

        it("clones into an independent instance", () => {
            const a = new Quaternion(1, 2, 3, 4);
            const b = a.clone();
            expect(b).not.toBe(a);
            expectQuat(b, 1, 2, 3, 4);
            b.w = 10;
            expect(a.w).toBe(1);
        });
    });

    describe("equals (default epsilon)", () => {
        it("uses EPSILON when no tolerance is given", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.equals(new Quaternion(1 + 1e-8, 2, 3, 4))).toBe(true);
            expect(q.equals(new Quaternion(1 + 1e-3, 2, 3, 4))).toBe(false);
        });
    });

    describe("scale", () => {
        it("multiplies every component", () => {
            expectQuat(new Quaternion(1, -2, 3, -4).scale(-2), -2, 4, -6, 8);
        });

        it("returns itself", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.scale(2)).toBe(q);
        });
    });

    describe("conjugate", () => {
        it("negates the vector part only", () => {
            expectQuat(new Quaternion(1, 2, -3, 4).conjugate(), 1, -2, 3, -4);
        });

        it("is its own inverse operation", () => {
            expectQuat(new Quaternion(1, 2, 3, 4).conjugate().conjugate(), 1, 2, 3, 4);
        });

        it("gives q · q* = [|q|², 0]", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expectQuat(q.clone().multiply(q.clone().conjugate()), 30, 0, 0, 0);
        });

        it("returns itself", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.conjugate()).toBe(q);
        });
    });

    describe("inverse", () => {
        it("divides the conjugate by the squared magnitude", () => {
            expectQuat(new Quaternion(1, 2, 3, 4).inverse(), 1 / 30, -2 / 30, -3 / 30, -4 / 30);
        });

        it("gives the identity when multiplied on either side", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expectQuat(q.clone().multiply(q.clone().inverse()), 1, 0, 0, 0);
            expectQuat(q.clone().inverse().multiply(q), 1, 0, 0, 0);
        });

        it("equals the conjugate for a unit quaternion", () => {
            const q = new Quaternion(0.5, 0.5, -0.5, 0.5);
            const conj = q.clone().conjugate();
            expectQuat(q.inverse(), conj.w, conj.x, conj.y, conj.z);
        });

        it("is its own inverse operation", () => {
            expectQuat(new Quaternion(1, 2, 3, 4).inverse().inverse(), 1, 2, 3, 4);
        });

        it("leaves the zero quaternion zero instead of producing NaN", () => {
            const q = new Quaternion(0, 0, 0, 0).inverse();
            expect(hasNaN(q)).toBe(false);
            expectQuat(q, 0, 0, 0, 0);
        });

        it("returns itself", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.inverse()).toBe(q);
        });
    });

    describe("setFromAxisAngle", () => {
        const s = Math.SQRT1_2;

        it("builds [cos(θ/2), sin(θ/2)·n] for a unit axis", () => {
            expectQuat(new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2), s, 0, 0, s);
            expectQuat(new Quaternion().setFromAxisAngle(new Vec3(1, 0, 0), Math.PI), 0, 1, 0, 0);
        });

        it("normalizes a non-unit axis", () => {
            expectQuat(new Quaternion().setFromAxisAngle({ x: 0, y: 5, z: 0 }, Math.PI / 2), s, 0, s, 0);
        });

        it("does not modify the axis", () => {
            const axis = new Vec3(0, 0, 5);
            new Quaternion().setFromAxisAngle(axis, 1);
            expect(axis.z).toBe(5);
        });

        it("produces a unit quaternion", () => {
            expect(
                new Quaternion().setFromAxisAngle(new Vec3(1, -2, 3), 2.5).magnitude(),
            ).toBeCloseTo(1, 12);
        });

        it("gives the identity for a zero angle", () => {
            expectQuat(new Quaternion(5, 6, 7, 8).setFromAxisAngle(new Vec3(1, 2, 3), 0), 1, 0, 0, 0);
        });

        it("gives [-1, 0] for a full turn", () => {
            expectQuat(new Quaternion().setFromAxisAngle(new Vec3(0, 1, 0), 2 * Math.PI), -1, 0, 0, 0);
        });

        it("gives the identity for a zero axis instead of producing NaN", () => {
            const q = new Quaternion(5, 6, 7, 8).setFromAxisAngle(new Vec3(0, 0, 0), 1);
            expect(hasNaN(q)).toBe(false);
            expectQuat(q, 1, 0, 0, 0);
        });

        it("returns itself", () => {
            const q = new Quaternion();
            expect(q.setFromAxisAngle(new Vec3(1, 0, 0), 1)).toBe(q);
        });
    });

    describe("setToDifferenceQuaternion", () => {
        const s = Math.SQRT1_2;
        const rotX = () => new Quaternion(s, s, 0, 0);
        const rotY = () => new Quaternion(s, 0, s, 0);

        it("gives d such that q · d = this", () => {
            const d = rotX().setToDifferenceQuaternion(rotY());
            const back = d.premultiply(rotY());
            const expected = rotX();
            expectQuat(back, expected.w, expected.x, expected.y, expected.z);
        });

        it("matches q⁻¹ · this", () => {
            const a = new Quaternion(1, 2, 3, 4);
            const b = new Quaternion(-2, 0.5, 1, -1);
            const expected = b.clone().inverse().multiply(a);
            expectQuat(a.setToDifferenceQuaternion(b), expected.w, expected.x, expected.y, expected.z);
        });

        it("does not modify its argument", () => {
            const q = rotY();
            rotX().setToDifferenceQuaternion(q);
            expectQuat(q, s, 0, s, 0);
        });

        it("gives the identity when the argument is this", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expectQuat(q.setToDifferenceQuaternion(q), 1, 0, 0, 0);
        });

        it("gives zero for a zero argument instead of producing NaN", () => {
            const q = rotX().setToDifferenceQuaternion(new Quaternion(0, 0, 0, 0));
            expect(hasNaN(q)).toBe(false);
            expectQuat(q, 0, 0, 0, 0);
        });

        it("returns itself", () => {
            const q = rotX();
            expect(q.setToDifferenceQuaternion(rotY())).toBe(q);
        });
    });

    describe("log", () => {
        it("gives [0, (θ/2)·n] for a unit rotation quaternion", () => {
            const s = Math.SQRT1_2;
            expectQuat(new Quaternion(s, 0, 0, s).log(), 0, 0, 0, Math.PI / 4);

            const axis = new Vec3(1, -2, 3).normalize();
            const q = new Quaternion().setFromAxisAngle(axis, 2);
            expectQuat(q.log(), 0, axis.x, axis.y, axis.z);
        });

        it("gives zero for the identity", () => {
            expectQuat(new Quaternion(1, 0, 0, 0).log(), 0, 0, 0, 0);
        });

        it("picks the +X axis for [-1, 0]", () => {
            expectQuat(new Quaternion(-1, 0, 0, 0).log(), 0, Math.PI, 0, 0);
        });

        it("puts ln |q| in the scalar part for non-unit quaternions", () => {
            expectQuat(new Quaternion(2, 0, 0, 0).log(), Math.LN2, 0, 0, 0);
            expectQuat(new Quaternion(0, 3, 0, 0).log(), Math.log(3), Math.PI / 2, 0, 0);
        });

        it("gives different logarithms for q and -q", () => {
            const s = Math.SQRT1_2;
            expectQuat(new Quaternion(-s, 0, 0, -s).log(), 0, 0, 0, -3 * Math.PI / 4);
        });

        it("stays accurate for tiny angles", () => {
            const q = new Quaternion().setFromAxisAngle(new Vec3(0, 1, 0), 1e-10).log();
            expect(q.y / 5e-11).toBeCloseTo(1, 10);
        });

        it("stays accurate for angles near a full turn", () => {
            const angle = 2 * Math.PI - 1e-9;
            const q = new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), angle).log();
            expect(q.z).toBeCloseTo(angle / 2, 12);
        });

        it("gives w = -∞ and no NaN for the zero quaternion", () => {
            const q = new Quaternion(0, 0, 0, 0).log();
            expect(hasNaN(q)).toBe(false);
            expect(q.w).toBe(-Infinity);
            expect(q.x).toBe(0);
            expect(q.y).toBe(0);
            expect(q.z).toBe(0);
        });

        it("returns itself", () => {
            const q = new Quaternion(1, 2, 3, 4);
            expect(q.log()).toBe(q);
        });
    });

    describe("exp", () => {
        it("turns [0, (θ/2)·n] into the rotation of θ about n", () => {
            const s = Math.SQRT1_2;
            expectQuat(new Quaternion(0, 0, 0, Math.PI / 4).exp(), s, 0, 0, s);
            expectQuat(new Quaternion(0, Math.PI / 2, 0, 0).exp(), 0, 1, 0, 0);
        });

        it("gives the identity for zero", () => {
            expectQuat(new Quaternion(0, 0, 0, 0).exp(), 1, 0, 0, 0);
        });

        it("gives e^w for a pure scalar", () => {
            expectQuat(new Quaternion(Math.LN2, 0, 0, 0).exp(), 2, 0, 0, 0);
        });

        it("produces a unit quaternion when w = 0", () => {
            expect(new Quaternion(0, 1, -2, 3).exp().magnitude()).toBeCloseTo(1, 12);
        });

        it("matches the first-order expansion for tiny vectors", () => {
            expectQuat(new Quaternion(0, 1e-12, -2e-12, 0).exp(), 1, 1e-12, -2e-12, 0, 20);
        });

        it("returns itself", () => {
            const q = new Quaternion(0, 1, 2, 3);
            expect(q.exp()).toBe(q);
        });
    });

    describe("log and exp together", () => {
        it("round-trips exp(log(q)) for any non-zero quaternion", () => {
            for (const [w, x, y, z] of [
                [1, 2, 3, 4],
                [-1, 0.5, -2, 0.1],
                [0.5, 0.5, -0.5, 0.5],
                [-3, 0, 0, 0],
                [1, 0, 0, 0],
                [0, 0, 0, 1],
            ] as const) {
                expectQuat(new Quaternion(w, x, y, z).log().exp(), w, x, y, z, 10);
            }
        });

        it("round-trips log(exp(p)) while |v| < π", () => {
            expectQuat(new Quaternion(0.3, 1, -1, 0.5).exp().log(), 0.3, 1, -1, 0.5, 12);
        });

        it("computes powers: exp(½ · log(q)) squared is q", () => {
            const q = new Quaternion().setFromAxisAngle(new Vec3(1, 1, 0), 2.4);
            const root = q.clone().log().scale(0.5).exp();
            const squared = root.clone().multiply(root);
            expectQuat(squared, q.w, q.x, q.y, q.z);
        });

        it("halves the rotation angle with exp(½ · log(q))", () => {
            const axis = new Vec3(0, 0, 1);
            const root = new Quaternion().setFromAxisAngle(axis, 2).log().scale(0.5).exp();
            const expected = new Quaternion().setFromAxisAngle(axis, 1);
            expectQuat(root, expected.w, expected.x, expected.y, expected.z);
        });
    });

    describe("rotateVec3", () => {
        const q = new Quaternion().setFromAxisAngle(new Vec3(1, -2, 3), 1.3);
        const v = new Vec3(0.4, -1.5, 2.2);

        it("rotates +X to +Y by 90° about +Z", () => {
            const r = new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2);
            expectVec3(r.rotateVec3(new Vec3(1, 0, 0)), 0, 1, 0);
        });

        it("rotates +X to −Z by 90° about +Y", () => {
            const r = new Quaternion().setFromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
            expectVec3(r.rotateVec3(new Vec3(1, 0, 0)), 0, 0, -1);
        });

        it("leaves a vector on the axis unchanged", () => {
            const r = new Quaternion().setFromAxisAngle(new Vec3(1, 1, 1), 2);
            expectVec3(r.rotateVec3(new Vec3(2, 2, 2)), 2, 2, 2);
        });

        it("leaves vectors unchanged for the identity", () => {
            expectVec3(new Quaternion().rotateVec3(v), v.x, v.y, v.z);
        });

        it("matches the sandwich product q · [0, v] · q*", () => {
            const sandwich = new Quaternion()
                .multiplyQuaternions(q, new Quaternion(0, v.x, v.y, v.z))
                .multiply(q.clone().conjugate());
            expect(sandwich.w).toBeCloseTo(0, 12);
            expectVec3(q.rotateVec3(v), sandwich.x, sandwich.y, sandwich.z);
        });

        it("matches Mat3x3.setFromAxisAngle for the same axis and angle", () => {
            const axis = new Vec3(1, -2, 3).normalize();
            const expected = new Mat3x3().setFromAxisAngle(axis, 1.3).transformVec3(v);
            const actual = new Quaternion().setFromAxisAngle(axis, 1.3).rotateVec3(v);
            expectVec3(actual, expected.x, expected.y, expected.z);
        });

        it("preserves length", () => {
            expect(q.rotateVec3(v).magnitude()).toBeCloseTo(v.magnitude(), 12);
        });

        it("gives the same result for q and −q", () => {
            const negated = q.clone().scale(-1);
            const expected = q.rotateVec3(v);
            expectVec3(negated.rotateVec3(v), expected.x, expected.y, expected.z);
        });

        it("applies b first, then a, for the product a · b", () => {
            const a = new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2);
            const b = new Quaternion().setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
            const expected = a.rotateVec3(b.rotateVec3(v));
            expectVec3(a.clone().multiply(b).rotateVec3(v), expected.x, expected.y, expected.z);

            // +Y about X → +Z, then about Z stays +Z. The other order would give −X.
            expectVec3(a.clone().multiply(b).rotateVec3(new Vec3(0, 1, 0)), 0, 0, 1);
        });

        it("writes to out and returns it", () => {
            const out = new Vec3();
            expect(q.rotateVec3(v, out)).toBe(out);
        });

        it("allocates a new vector when out is omitted", () => {
            const result = q.rotateVec3(v);
            expect(result).toBeInstanceOf(Vec3);
            expect(result).not.toBe(v);
        });

        it("allows out to be v", () => {
            const expected = q.rotateVec3(v);
            const aliased = v.clone();
            expect(q.rotateVec3(aliased, aliased)).toBe(aliased);
            expectVec3(aliased, expected.x, expected.y, expected.z);
        });

        it("does not modify the quaternion or the input vector", () => {
            const r = q.clone();
            const input = v.clone();
            r.rotateVec3(input, new Vec3());
            expectQuat(r, q.w, q.x, q.y, q.z, 15);
            expectVec3(input, v.x, v.y, v.z, 15);
        });

        it("accepts any Vec3Like", () => {
            const expected = q.rotateVec3(v);
            expectVec3(q.rotateVec3({ x: v.x, y: v.y, z: v.z }), expected.x, expected.y, expected.z);
        });
    });

    describe("inverseRotateVec3", () => {
        const q = new Quaternion().setFromAxisAngle(new Vec3(1, -2, 3), 1.3);
        const v = new Vec3(0.4, -1.5, 2.2);

        it("rotates +Y back to +X for 90° about +Z", () => {
            const r = new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2);
            expectVec3(r.inverseRotateVec3(new Vec3(0, 1, 0)), 1, 0, 0);
        });

        it("undoes rotateVec3", () => {
            expectVec3(q.inverseRotateVec3(q.rotateVec3(v)), v.x, v.y, v.z);
        });

        it("is undone by rotateVec3", () => {
            expectVec3(q.rotateVec3(q.inverseRotateVec3(v)), v.x, v.y, v.z);
        });

        it("matches rotateVec3 with the conjugate", () => {
            const expected = q.clone().conjugate().rotateVec3(v);
            expectVec3(q.inverseRotateVec3(v), expected.x, expected.y, expected.z);
        });

        it("matches Mat3x3.transformInverseVec3 for the same axis and angle", () => {
            const axis = new Vec3(1, -2, 3).normalize();
            const expected = new Mat3x3().setFromAxisAngle(axis, 1.3).transformInverseVec3(v);
            const actual = new Quaternion().setFromAxisAngle(axis, 1.3).inverseRotateVec3(v);
            expectVec3(actual, expected.x, expected.y, expected.z);
        });

        it("preserves length", () => {
            expect(q.inverseRotateVec3(v).magnitude()).toBeCloseTo(v.magnitude(), 12);
        });

        it("writes to out and returns it", () => {
            const out = new Vec3();
            expect(q.inverseRotateVec3(v, out)).toBe(out);
        });

        it("allows out to be v", () => {
            const expected = q.inverseRotateVec3(v);
            const aliased = v.clone();
            expect(q.inverseRotateVec3(aliased, aliased)).toBe(aliased);
            expectVec3(aliased, expected.x, expected.y, expected.z);
        });

        it("does not modify the quaternion or the input vector", () => {
            const r = q.clone();
            const input = v.clone();
            r.inverseRotateVec3(input, new Vec3());
            expectQuat(r, q.w, q.x, q.y, q.z, 15);
            expectVec3(input, v.x, v.y, v.z, 15);
        });
    });

    describe("slerpQuaternions", () => {
        const zAxis = new Vec3(0, 0, 1);
        const a = new Quaternion().setFromAxisAngle(new Vec3(1, 2, -1), 0.4);
        const b = new Quaternion().setFromAxisAngle(new Vec3(-2, 1, 3), 2.1);

        /** Rotation angle between two unit quaternions, ignoring the q / −q sign. */
        function rotationAngle(p: Quaternion, q: Quaternion): number {
            return 2 * Math.acos(Math.min(1, Math.abs(p.dot(q))));
        }

        function expectSameRotation(actual: Quaternion, expected: Quaternion, digits = 12) {
            expect(Math.abs(actual.dot(expected))).toBeCloseTo(1, digits);
        }

        it("returns a at t = 0 and b at t = 1", () => {
            expectQuat(new Quaternion().slerpQuaternions(a, b, 0), a.w, a.x, a.y, a.z);
            expectQuat(new Quaternion().slerpQuaternions(a, b, 1), b.w, b.x, b.y, b.z);
        });

        it("gives 45° about Z halfway from the identity to 90° about Z", () => {
            const end = new Quaternion().setFromAxisAngle(zAxis, Math.PI / 2);
            const expected = new Quaternion().setFromAxisAngle(zAxis, Math.PI / 4);
            const mid = new Quaternion().slerpQuaternions(new Quaternion(), end, 0.5);
            expectQuat(mid, expected.w, expected.x, expected.y, expected.z);
        });

        it("matches setFromAxisAngle at every t for a single-axis rotation", () => {
            const end = new Quaternion().setFromAxisAngle(zAxis, 2.5);
            for (const t of [0.1, 0.25, 0.6, 0.9]) {
                const expected = new Quaternion().setFromAxisAngle(zAxis, 2.5 * t);
                const actual = new Quaternion().slerpQuaternions(new Quaternion(), end, t);
                expectQuat(actual, expected.w, expected.x, expected.y, expected.z);
            }
        });

        it("moves at constant angular speed", () => {
            const total = rotationAngle(a, b);
            for (const t of [0.25, 0.5, 0.75]) {
                const q = new Quaternion().slerpQuaternions(a, b, t);
                expect(rotationAngle(a, q)).toBeCloseTo(t * total, 12);
                expect(rotationAngle(q, b)).toBeCloseTo((1 - t) * total, 12);
            }
        });

        it("produces unit quaternions", () => {
            for (const t of [0, 0.3, 0.5, 0.8, 1]) {
                expect(new Quaternion().slerpQuaternions(a, b, t).magnitude()).toBeCloseTo(1, 12);
            }
        });

        it("takes the shorter path when the dot product is negative", () => {
            const negB = b.clone().scale(-1);
            expect(a.dot(negB)).toBeLessThan(0);

            const viaNeg = new Quaternion().slerpQuaternions(a, negB, 0.5);
            const viaPos = new Quaternion().slerpQuaternions(a, b, 0.5);
            expectSameRotation(viaNeg, viaPos);
            expect(rotationAngle(a, viaNeg)).toBeCloseTo(rotationAngle(a, b) / 2, 12);
        });

        it("returns −b at t = 1 when it flips b for the shorter path", () => {
            const negB = b.clone().scale(-1);
            expectQuat(new Quaternion().slerpQuaternions(a, negB, 1), b.w, b.x, b.y, b.z);
        });

        it("goes the short way for rotations more than 180° apart", () => {
            // 0° and 270° about Z are 90° apart the short way, so halfway is −45°.
            const end = new Quaternion().setFromAxisAngle(zAxis, 1.5 * Math.PI);
            const expected = new Quaternion().setFromAxisAngle(zAxis, -Math.PI / 4);
            expectSameRotation(new Quaternion().slerpQuaternions(new Quaternion(), end, 0.5), expected);
        });

        it("falls back to a normalized lerp for nearly equal inputs", () => {
            const end = new Quaternion().setFromAxisAngle(zAxis, 0.001);
            const mid = new Quaternion().slerpQuaternions(new Quaternion(), end, 0.5);
            expect(hasNaN(mid)).toBe(false);
            expect(mid.magnitude()).toBeCloseTo(1, 14);

            const expected = new Quaternion().setFromAxisAngle(zAxis, 0.0005);
            expectQuat(mid, expected.w, expected.x, expected.y, expected.z, 10);
        });

        it("returns the input for identical quaternions", () => {
            for (const t of [0, 0.5, 1]) {
                const q = new Quaternion().slerpQuaternions(a, a, t);
                expect(hasNaN(q)).toBe(false);
                expectQuat(q, a.w, a.x, a.y, a.z);
            }
        });

        it("handles q and −q as the same rotation", () => {
            const q = new Quaternion().slerpQuaternions(a, a.clone().scale(-1), 0.5);
            expect(hasNaN(q)).toBe(false);
            expectQuat(q, a.w, a.x, a.y, a.z);
        });

        it("handles rotations exactly 180° apart without NaN", () => {
            const end = new Quaternion().setFromAxisAngle(zAxis, Math.PI);
            const mid = new Quaternion().slerpQuaternions(new Quaternion(), end, 0.5);
            expect(hasNaN(mid)).toBe(false);
            expectSameRotation(mid, new Quaternion().setFromAxisAngle(zAxis, Math.PI / 2));
        });

        it("extrapolates along the same arc for t outside [0, 1]", () => {
            const end = new Quaternion().setFromAxisAngle(zAxis, 1);
            const expected = new Quaternion().setFromAxisAngle(zAxis, 1.5);
            const actual = new Quaternion().slerpQuaternions(new Quaternion(), end, 1.5);
            expectQuat(actual, expected.w, expected.x, expected.y, expected.z);
        });

        it("is symmetric: slerp(a, b, t) = slerp(b, a, 1 − t)", () => {
            const forward = new Quaternion().slerpQuaternions(a, b, 0.3);
            const backward = new Quaternion().slerpQuaternions(b, a, 0.7);
            expectSameRotation(forward, backward);
        });

        it("does not modify a or b, including when it flips b", () => {
            const a2 = a.clone();
            const negB = b.clone().scale(-1);
            new Quaternion().slerpQuaternions(a2, negB, 0.4);
            expectQuat(a2, a.w, a.x, a.y, a.z, 15);
            expectQuat(negB, -b.w, -b.x, -b.y, -b.z, 15);
        });

        it("allows this to be a or b", () => {
            const expected = new Quaternion().slerpQuaternions(a, b, 0.3);

            const asA = a.clone();
            expectQuat(asA.slerpQuaternions(asA, b, 0.3), expected.w, expected.x, expected.y, expected.z);

            const asB = b.clone();
            expectQuat(asB.slerpQuaternions(a, asB, 0.3), expected.w, expected.x, expected.y, expected.z);
        });

        it("returns itself in both branches", () => {
            const q = new Quaternion();
            expect(q.slerpQuaternions(a, b, 0.5)).toBe(q);
            expect(q.slerpQuaternions(a, a, 0.5)).toBe(q);
        });
    });

    describe("slerp", () => {
        const a = new Quaternion().setFromAxisAngle(new Vec3(1, 2, -1), 0.4);
        const b = new Quaternion().setFromAxisAngle(new Vec3(-2, 1, 3), 2.1);

        it("matches slerpQuaternions(this, q, t)", () => {
            const expected = new Quaternion().slerpQuaternions(a, b, 0.35);
            const actual = a.clone().slerp(b, 0.35);
            expectQuat(actual, expected.w, expected.x, expected.y, expected.z);
        });

        it("allows q to be this", () => {
            const q = a.clone();
            expectQuat(q.slerp(q, 0.5), a.w, a.x, a.y, a.z);
        });

        it("does not modify q", () => {
            const target = b.clone();
            a.clone().slerp(target, 0.5);
            expectQuat(target, b.w, b.x, b.y, b.z, 15);
        });

        it("returns itself", () => {
            const q = a.clone();
            expect(q.slerp(b, 0.5)).toBe(q);
        });
    });

    describe("equalsRotation", () => {
        const q = new Quaternion().setFromAxisAngle(new Vec3(1, -2, 3), 1.3);

        it("is true for the same quaternion", () => {
            expect(q.equalsRotation(q.clone())).toBe(true);
        });

        it("is true for −q, unlike equals", () => {
            const negated = q.clone().scale(-1);
            expect(q.equalsRotation(negated)).toBe(true);
            expect(q.equals(negated)).toBe(false);
        });

        it("is false for a different rotation", () => {
            const other = new Quaternion().setFromAxisAngle(new Vec3(1, -2, 3), 1.4);
            expect(q.equalsRotation(other)).toBe(false);
        });

        it("detects small angle differences that |dot| ≈ 1 would miss", () => {
            // 1e-3 rad apart: |dot| differs from 1 by ~1.25e-7, but components by ~5e-4.
            const axis = new Vec3(0, 0, 1);
            const a = new Quaternion().setFromAxisAngle(axis, 1);
            const b = new Quaternion().setFromAxisAngle(axis, 1.001);
            expect(Math.abs(a.dot(b))).toBeCloseTo(1, 6);
            expect(a.equalsRotation(b)).toBe(false);
        });

        it("respects epsilon", () => {
            const nudged = new Quaternion(q.w + 1e-4, q.x, q.y, q.z);
            expect(q.equalsRotation(nudged)).toBe(false);
            expect(q.equalsRotation(nudged, 1e-3)).toBe(true);
        });

        it("treats the identity and [−1, 0] as equal", () => {
            expect(new Quaternion().equalsRotation(new Quaternion(-1, 0, 0, 0))).toBe(true);
        });
    });

    describe("addScaledAngularVelocity", () => {
        it("does nothing for zero angular velocity", () => {
            const q = new Quaternion().setFromAxisAngle(new Vec3(1, 2, 3), 0.8);
            const before = q.clone();
            q.addScaledAngularVelocity(new Vec3(0, 0, 0), 0.1);
            expectQuat(q, before.w, before.x, before.y, before.z, 15);
        });

        it("computes q + ½·dt·[0, ω]·q", () => {
            const q = new Quaternion().setFromAxisAngle(new Vec3(1, 2, 3), 0.8);
            const omega = new Vec3(0.5, -1.2, 2);
            const dt = 0.05;

            const delta = new Quaternion(0, omega.x, omega.y, omega.z).multiply(q).scale(0.5 * dt);
            const expected = new Quaternion(q.w + delta.w, q.x + delta.x, q.y + delta.y, q.z + delta.z);

            expectQuat(q.addScaledAngularVelocity(omega, dt), expected.w, expected.x, expected.y, expected.z);
        });

        it("approaches the exact rotation as steps get smaller", () => {
            const omega = new Vec3(0, 0, 2); // 2 rad/s about Z, for 1 s
            const steps = 1000;

            const q = new Quaternion();
            for (let i = 0; i < steps; i++) {
                q.addScaledAngularVelocity(omega, 1 / steps).normalize();
            }

            const expected = new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), 2);
            expect(q.angleTo(expected)).toBeLessThan(1e-3);
        });

        it("rotates about the world-space ω, not the body's axes", () => {
            // The body is turned 90° about Z, so its X axis points along world +Y. Spinning about
            // world X moves world +Y toward +Z; spinning about the body's X would leave it fixed.
            const q = new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2);
            q.addScaledAngularVelocity(new Vec3(1, 0, 0), 0.01).normalize();
            const bodyX = q.rotateVec3(new Vec3(1, 0, 0));
            expect(bodyX.z).toBeGreaterThan(0.009);
            expect(bodyX.x).toBeCloseTo(0, 12);
        });

        it("does not normalize", () => {
            const q = new Quaternion().addScaledAngularVelocity(new Vec3(3, 0, 0), 0.1);
            expect(q.magnitude()).toBeGreaterThan(1);
        });

        it("does not modify omega", () => {
            const omega = new Vec3(1, 2, 3);
            new Quaternion().addScaledAngularVelocity(omega, 0.1);
            expectVec3(omega, 1, 2, 3, 15);
        });

        it("returns itself", () => {
            const q = new Quaternion();
            expect(q.addScaledAngularVelocity(new Vec3(1, 0, 0), 0.1)).toBe(q);
        });
    });

    describe("setFromRotationMatrix", () => {
        const v = new Vec3(0.4, -1.5, 2.2);

        function expectRoundTrip(q: Quaternion) {
            const m = new Mat3x3().setFromQuaternion(q);
            const back = new Quaternion().setFromRotationMatrix(m);
            expect(back.equalsRotation(q)).toBe(true);
            expect(back.magnitude()).toBeCloseTo(1, 12);

            const expected = m.transformVec3(v);
            expectVec3(back.rotateVec3(v), expected.x, expected.y, expected.z);
        }

        it("gives the identity for the identity matrix", () => {
            expectQuat(new Quaternion(0, 1, 2, 3).setFromRotationMatrix(new Mat3x3()), 1, 0, 0, 0);
        });

        it("round-trips a general rotation (positive trace)", () => {
            expectRoundTrip(new Quaternion().setFromAxisAngle(new Vec3(1, -2, 3), 0.7));
        });

        it("round-trips rotations near π about each axis (negative-trace branches)", () => {
            expectRoundTrip(new Quaternion().setFromAxisAngle(new Vec3(1, 0.1, 0.2), 3));
            expectRoundTrip(new Quaternion().setFromAxisAngle(new Vec3(0.1, 1, 0.2), 3));
            expectRoundTrip(new Quaternion().setFromAxisAngle(new Vec3(0.1, 0.2, 1), 3));
        });

        it("handles exactly 180° about each axis", () => {
            for (const axis of [new Vec3(1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, 0, 1)]) {
                expectRoundTrip(new Quaternion().setFromAxisAngle(axis, Math.PI));
            }
        });

        it("matches Mat3x3.setFromAxisAngle", () => {
            const axis = new Vec3(2, -1, 0.5).normalize();
            const q = new Quaternion().setFromRotationMatrix(new Mat3x3().setFromAxisAngle(axis, 2.2));
            expect(q.equalsRotation(new Quaternion().setFromAxisAngle(axis, 2.2))).toBe(true);
        });

        it("does not modify the matrix", () => {
            const m = new Mat3x3().setFromAxisAngle(new Vec3(0, 1, 0), 1);
            const before = Array.from(m.elements);
            new Quaternion().setFromRotationMatrix(m);
            expect(Array.from(m.elements)).toEqual(before);
        });

        it("returns itself", () => {
            const q = new Quaternion();
            expect(q.setFromRotationMatrix(new Mat3x3())).toBe(q);
        });
    });

    describe("getAxisAngle", () => {
        it("recovers the axis and angle passed to setFromAxisAngle", () => {
            const axis = new Vec3(1, -2, 3).normalize();
            const axisOut = new Vec3();
            const angle = new Quaternion().setFromAxisAngle(axis, 1.3).getAxisAngle(axisOut);
            expect(angle).toBeCloseTo(1.3, 12);
            expectVec3(axisOut, axis.x, axis.y, axis.z);
        });

        it("returns an angle in [0, π] by flipping the axis", () => {
            // 270° about +Z is 90° about −Z.
            const axisOut = new Vec3();
            const angle = new Quaternion()
                .setFromAxisAngle(new Vec3(0, 0, 1), 1.5 * Math.PI)
                .getAxisAngle(axisOut);
            expect(angle).toBeCloseTo(Math.PI / 2, 12);
            expectVec3(axisOut, 0, 0, -1);
        });

        it("gives the same result for q and −q", () => {
            const q = new Quaternion().setFromAxisAngle(new Vec3(1, 1, 0), 2);
            const a1 = new Vec3();
            const a2 = new Vec3();
            expect(q.getAxisAngle(a1)).toBeCloseTo(q.clone().scale(-1).getAxisAngle(a2), 12);
            expectVec3(a1, a2.x, a2.y, a2.z);
        });

        it("round-trips through setFromAxisAngle", () => {
            const q = new Quaternion().setFromAxisAngle(new Vec3(-2, 0.5, 1), 2.7);
            const axis = new Vec3();
            const angle = q.getAxisAngle(axis);
            expect(new Quaternion().setFromAxisAngle(axis, angle).equalsRotation(q)).toBe(true);
        });

        it("returns angle 0 and +X for the identity", () => {
            const axis = new Vec3(5, 5, 5);
            expect(new Quaternion().getAxisAngle(axis)).toBe(0);
            expectVec3(axis, 1, 0, 0, 15);
        });

        it("returns π for a half turn", () => {
            const axis = new Vec3();
            expect(new Quaternion(0, 0, 1, 0).getAxisAngle(axis)).toBeCloseTo(Math.PI, 12);
            expectVec3(axis, 0, 1, 0);
        });

        it("is accurate for tiny angles", () => {
            const angle = new Quaternion().setFromAxisAngle(new Vec3(0, 1, 0), 1e-9).getAxisAngle();
            expect(angle / 1e-9).toBeCloseTo(1, 9);
        });

        it("works for a non-unit quaternion", () => {
            const q = new Quaternion().setFromAxisAngle(new Vec3(1, 0, 0), 0.8).scale(3);
            expect(q.getAxisAngle()).toBeCloseTo(0.8, 12);
        });
    });

    describe("angleTo", () => {
        const axis = new Vec3(1, -2, 3);

        it("is 0 for the same rotation, including −q", () => {
            const q = new Quaternion().setFromAxisAngle(axis, 1.3);
            expect(q.angleTo(q)).toBe(0);
            expect(q.angleTo(q.clone().scale(-1))).toBeCloseTo(0, 15);
        });

        it("is the difference in angle about a shared axis, in either direction", () => {
            const a = new Quaternion().setFromAxisAngle(axis, 0.4);
            const b = new Quaternion().setFromAxisAngle(axis, 1.5);
            expect(a.angleTo(b)).toBeCloseTo(1.1, 12);
            expect(b.angleTo(a)).toBeCloseTo(1.1, 12);
        });

        it("takes the shorter way, staying in [0, π]", () => {
            const b = new Quaternion().setFromAxisAngle(axis, 1.5 * Math.PI);
            expect(new Quaternion().angleTo(b)).toBeCloseTo(Math.PI / 2, 12);
        });

        it("matches the angle of the difference quaternion", () => {
            const a = new Quaternion().setFromAxisAngle(new Vec3(1, 0, 0), 0.9);
            const b = new Quaternion().setFromAxisAngle(new Vec3(0, 1, 1), 2.1);
            const difference = b.clone().setToDifferenceQuaternion(a);
            expect(a.angleTo(b)).toBeCloseTo(difference.getAxisAngle(), 12);
        });

        it("is accurate for tiny angles, where acos(|dot|) is not", () => {
            const a = new Quaternion().setFromAxisAngle(axis, 1);
            const b = new Quaternion().setFromAxisAngle(axis, 1 + 1e-8);
            expect(a.angleTo(b) / 1e-8).toBeCloseTo(1, 6);
        });
    });

    describe("setFromEulerXYZ", () => {
        const xAxis = new Vec3(1, 0, 0);
        const yAxis = new Vec3(0, 1, 0);
        const zAxis = new Vec3(0, 0, 1);

        it("gives the identity for zero angles", () => {
            expectQuat(new Quaternion(0, 1, 2, 3).setFromEulerXYZ(0, 0, 0), 1, 0, 0, 0);
        });

        it("matches setFromAxisAngle for a single axis", () => {
            const qx = new Quaternion().setFromAxisAngle(xAxis, 0.6);
            const qy = new Quaternion().setFromAxisAngle(yAxis, 0.6);
            const qz = new Quaternion().setFromAxisAngle(zAxis, 0.6);
            expect(new Quaternion().setFromEulerXYZ(0.6, 0, 0).equalsRotation(qx)).toBe(true);
            expect(new Quaternion().setFromEulerXYZ(0, 0.6, 0).equalsRotation(qy)).toBe(true);
            expect(new Quaternion().setFromEulerXYZ(0, 0, 0.6).equalsRotation(qz)).toBe(true);
        });

        it("equals qx · qy · qz", () => {
            const expected = new Quaternion()
                .setFromAxisAngle(xAxis, 0.3)
                .multiply(new Quaternion().setFromAxisAngle(yAxis, -1.1))
                .multiply(new Quaternion().setFromAxisAngle(zAxis, 2.4));
            const actual = new Quaternion().setFromEulerXYZ(0.3, -1.1, 2.4);
            expectQuat(actual, expected.w, expected.x, expected.y, expected.z);
        });

        it("matches the matrix product Rx · Ry · Rz", () => {
            const m = new Mat3x3()
                .setRotationX(0.3)
                .multiply(new Mat3x3().setRotationY(-1.1))
                .multiply(new Mat3x3().setRotationZ(2.4));
            const v = new Vec3(0.4, -1.5, 2.2);
            const expected = m.transformVec3(v);
            const actual = new Quaternion().setFromEulerXYZ(0.3, -1.1, 2.4).rotateVec3(v);
            expectVec3(actual, expected.x, expected.y, expected.z);
        });

        it("produces a unit quaternion", () => {
            expect(new Quaternion().setFromEulerXYZ(1, 2, 3).magnitude()).toBeCloseTo(1, 12);
        });

        it("returns itself", () => {
            const q = new Quaternion();
            expect(q.setFromEulerXYZ(1, 2, 3)).toBe(q);
        });
    });

    describe("getEulerXYZ", () => {
        it("recovers angles inside the canonical ranges", () => {
            for (const [x, y, z] of [
                [0.3, -1.1, 2.4],
                [-2.9, 0.2, -0.5],
                [1, 1.5, 3],
                [0, 0, 0],
            ] as const) {
                const angles = new Quaternion().setFromEulerXYZ(x, y, z).getEulerXYZ();
                expectVec3(angles, x, y, z, 10);
            }
        });

        it("returns angles for the same rotation when the input is outside the ranges", () => {
            const q = new Quaternion().setFromEulerXYZ(0.4, 2.5, -0.7);
            const angles = q.getEulerXYZ();
            expect(Math.abs(angles.y)).toBeLessThanOrEqual(Math.PI / 2);
            const rebuilt = new Quaternion().setFromEulerXYZ(angles.x, angles.y, angles.z);
            expect(rebuilt.equalsRotation(q)).toBe(true);
        });

        it("gives the same angles for q and −q", () => {
            const q = new Quaternion().setFromEulerXYZ(0.3, -1.1, 2.4);
            const a = q.getEulerXYZ();
            expectVec3(q.clone().scale(-1).getEulerXYZ(), a.x, a.y, a.z);
        });

        it("puts the whole rotation in x at gimbal lock and still round-trips", () => {
            for (const y of [Math.PI / 2, -Math.PI / 2]) {
                const q = new Quaternion().setFromEulerXYZ(0.5, y, 0.3);
                const angles = q.getEulerXYZ();
                expect(Number.isNaN(angles.x) || Number.isNaN(angles.y)).toBe(false);
                expect(angles.z).toBe(0);
                expect(angles.y).toBeCloseTo(y, 6);
                const rebuilt = new Quaternion().setFromEulerXYZ(angles.x, angles.y, angles.z);
                expect(rebuilt.equalsRotation(q)).toBe(true);
            }
        });

        it("writes to out and returns it", () => {
            const out = new Vec3();
            expect(new Quaternion().getEulerXYZ(out)).toBe(out);
        });
    });

    describe("setFromUnitVectors", () => {
        const from = new Vec3(1, 2, -1).normalize();
        const to = new Vec3(-3, 0.5, 2).normalize();

        it("rotates from onto to", () => {
            const q = new Quaternion().setFromUnitVectors(from, to);
            expectVec3(q.rotateVec3(from), to.x, to.y, to.z);
            expect(q.magnitude()).toBeCloseTo(1, 12);
        });

        it("gives 90° about +Z from +X to +Y", () => {
            const q = new Quaternion().setFromUnitVectors(new Vec3(1, 0, 0), new Vec3(0, 1, 0));
            expectQuat(q, Math.SQRT1_2, 0, 0, Math.SQRT1_2);
        });

        it("is the shortest rotation: the axis is perpendicular to both vectors", () => {
            const axis = new Vec3();
            const angle = new Quaternion().setFromUnitVectors(from, to).getAxisAngle(axis);
            expect(axis.dot(from)).toBeCloseTo(0, 12);
            expect(axis.dot(to)).toBeCloseTo(0, 12);
            expect(angle).toBeCloseTo(Math.acos(from.dot(to)), 12);
        });

        it("gives the identity for equal vectors", () => {
            expectQuat(new Quaternion().setFromUnitVectors(from, from), 1, 0, 0, 0);
        });

        it("gives a half turn about a perpendicular axis for opposite vectors", () => {
            for (const start of [
                new Vec3(1, 0, 0),
                new Vec3(0, 1, 0),
                new Vec3(0, 0, 1),
                new Vec3(1, 2, 3).normalize(),
                new Vec3(-3, 0.1, 0.2).normalize(),
            ]) {
                const end = start.clone().negate();
                const q = new Quaternion().setFromUnitVectors(start, end);
                expect(hasNaN(q)).toBe(false);
                expect(q.magnitude()).toBeCloseTo(1, 12);
                expect(q.w).toBeCloseTo(0, 12);
                expectVec3(q.rotateVec3(start), end.x, end.y, end.z);
            }
        });

        it("handles nearly opposite vectors without NaN", () => {
            const start = new Vec3(1, 0, 0);
            const end = new Vec3(-1, 1e-7, 0).normalize();
            const q = new Quaternion().setFromUnitVectors(start, end);
            expect(hasNaN(q)).toBe(false);
            expectVec3(q.rotateVec3(start), end.x, end.y, end.z, 6);
        });

        it("does not modify the inputs", () => {
            const start = new Vec3(1, 0, 0);
            const end = new Vec3(0, 0, 1);
            new Quaternion().setFromUnitVectors(start, end);
            expectVec3(start, 1, 0, 0, 15);
            expectVec3(end, 0, 0, 1, 15);
        });

        it("returns itself", () => {
            const q = new Quaternion();
            expect(q.setFromUnitVectors(from, to)).toBe(q);
        });
    });
});
