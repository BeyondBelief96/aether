import { describe, expect, it } from "vitest";
import { Mat3x3 } from "../geometry/mat3x3";
import { Quaternion } from "../geometry/quaternion";
import { Vec3 } from "../geometry/vec3";
import { approxEqual } from "../scalar";

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function elementsOf(m: Mat3x3): number[] {
    return Array.from(m.elements);
}

function expectApprox(m: Mat3x3, expected: number[]): void {
    const actual = elementsOf(m);
    expect(
        actual.every((x, i) => approxEqual(x, expected[i]!)),
        `${actual} ≉ ${expected}`,
    ).toBe(true);
}

const sample = () => new Mat3x3(1, 2, 3, 4, 5, 6, 7, 8, 9);
const sampleRotation = () => new Mat3x3().setFromAxisAngle(new Vec3(1, 2, 3).normalize(), 0.7);

describe("Mat3", () => {
    describe("construction", () => {
        it("defaults to the identity", () => {
            expect(elementsOf(new Mat3x3())).toEqual(IDENTITY);
        });

        it("stores its arguments row-major", () => {
            const m = sample();
            expect(elementsOf(m)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            // m[row * 3 + col]
            expect(m.elements[0 * 3 + 1]).toBe(2); // m01
            expect(m.elements[1 * 3 + 0]).toBe(4); // m10
            expect(m.elements[2 * 3 + 2]).toBe(9); // m22
        });

        it("fills omitted arguments from the identity", () => {
            expect(elementsOf(new Mat3x3(5))).toEqual([5, 0, 0, 0, 1, 0, 0, 0, 1]);
        });

        it("gives each instance its own storage", () => {
            const a = new Mat3x3();
            const b = new Mat3x3();
            expect(a.elements).not.toBe(b.elements);
            a.elements[0] = 42;
            expect(b.elements[0]).toBe(1);
        });
    });

    describe("identity", () => {
        it("resets every element and returns itself", () => {
            const m = sample();
            const result = m.identity();
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(IDENTITY);
        });

        it("is not affected by earlier mutation of another identity", () => {
            const a = new Mat3x3().identity();
            a.elements[0] = 42;
            expect(elementsOf(new Mat3x3(9, 9, 9, 9, 9, 9, 9, 9, 9).identity())).toEqual(IDENTITY);
        });
    });

    describe("copy", () => {
        it("copies all nine elements and returns itself", () => {
            const m = new Mat3x3();
            const result = m.copy(sample());
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });

        it("does not share storage with the source", () => {
            const source = sample();
            const m = new Mat3x3().copy(source);
            source.elements[0] = 42;
            expect(m.elements[0]).toBe(1);
        });

        it("leaves a matrix unchanged when copying itself", () => {
            const m = sample();
            m.copy(m);
            expect(elementsOf(m)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
    });

    describe("setScale", () => {
        it("overwrites every element with a scaling matrix and returns itself", () => {
            const m = sample();
            const result = m.setScale(2, 3, 4);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([2, 0, 0, 0, 3, 0, 0, 0, 4]);
        });

        it("scales uniformly when given one factor", () => {
            expect(elementsOf(new Mat3x3().setScale(3))).toEqual([3, 0, 0, 0, 3, 0, 0, 0, 3]);
        });

        it("is the identity for a factor of 1", () => {
            expect(elementsOf(sample().setScale(1))).toEqual(IDENTITY);
        });

        it("scales each component of a vector by its axis factor", () => {
            const r = new Mat3x3().setScale(2, 3, 4).transformVec3(new Vec3(1, 2, 3));
            expect([r.x, r.y, r.z]).toEqual([2, 6, 12]);
        });

        it("has the product of its factors as its determinant", () => {
            expect(new Mat3x3().setScale(2, 3, 4).determinant()).toBe(24);
        });

        it("is inverted by the reciprocal factors", () => {
            expect(elementsOf(new Mat3x3().setScale(2, 4, 8).inverse())).toEqual(
                elementsOf(new Mat3x3().setScale(0.5, 0.25, 0.125)),
            );
        });

        it("scales before rotating when post-multiplied onto a rotation", () => {
            // R · S: stretch X by 2, then turn +X onto +Y.
            const m = new Mat3x3()
                .setRotationZ(Math.PI / 2)
                .multiply(new Mat3x3().setScale(2, 1, 1));
            const r = m.transformVec3(new Vec3(1, 0, 0));
            expect(approxEqual(r.x, 0) && approxEqual(r.y, 2) && approxEqual(r.z, 0)).toBe(true);
        });
    });

    describe("setScaleAlongAxis", () => {
        const axis = new Vec3(1, 2, 3).normalize();
        const scaling = (k: number) => new Mat3x3().setScaleAlongAxis(axis, k);

        function expectVec(v: Vec3, x: number, y: number, z: number): void {
            expect(
                approxEqual(v.x, x) && approxEqual(v.y, y) && approxEqual(v.z, z),
                `(${v.x}, ${v.y}, ${v.z}) ≉ (${x}, ${y}, ${z})`,
            ).toBe(true);
        }

        it("overwrites every element and returns itself", () => {
            const m = sample();
            const result = m.setScaleAlongAxis(axis, 3);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(scaling(3)));
        });

        it.each([
            ["X", new Vec3(1, 0, 0), [3, 1, 1]],
            ["Y", new Vec3(0, 1, 0), [1, 3, 1]],
            ["Z", new Vec3(0, 0, 1), [1, 1, 3]],
        ] as const)("matches setScale along the %s axis", (_, cardinal, factors) => {
            expect(elementsOf(new Mat3x3().setScaleAlongAxis(cardinal, 3))).toEqual(
                elementsOf(new Mat3x3().setScale(factors[0], factors[1], factors[2])),
            );
        });

        it("scales the axis by k", () => {
            const r = scaling(3).transformVec3(axis);
            expectVec(r, 3 * axis.x, 3 * axis.y, 3 * axis.z);
        });

        it("leaves a perpendicular vector unchanged", () => {
            const v = new Vec3(3, 0, -1); // v · axis = 0
            expectVec(scaling(3).transformVec3(v), 3, 0, -1);
        });

        it("scales only the parallel component of a general vector", () => {
            const v = new Vec3(4, -1, 2);
            const d = v.dot(axis);
            const r = scaling(3).transformVec3(v);
            expectVec(r, v.x + 2 * d * axis.x, v.y + 2 * d * axis.y, v.z + 2 * d * axis.z);
        });

        it("is symmetric", () => {
            const m = scaling(3);
            expect(elementsOf(m.clone().transpose())).toEqual(elementsOf(m));
        });

        it("has determinant k", () => {
            expect(approxEqual(scaling(3).determinant(), 3)).toBe(true);
        });

        it("is the identity for k = 1", () => {
            expectApprox(scaling(1), IDENTITY);
        });

        it("is inverted by the reciprocal factor", () => {
            expectApprox(scaling(4).inverse(), elementsOf(scaling(0.25)));
        });

        it("reflects across the perpendicular plane for k = -1", () => {
            const m = scaling(-1);
            expectApprox(m.clone().multiply(m), IDENTITY);
            expect(approxEqual(m.determinant(), -1)).toBe(true);
            expectVec(m.transformVec3(axis), -axis.x, -axis.y, -axis.z);
        });

        it("projects onto the perpendicular plane for k = 0", () => {
            const r = scaling(0).transformVec3(new Vec3(4, -1, 2));
            expect(approxEqual(r.dot(axis), 0)).toBe(true);
        });

        it("ignores the sign of the axis", () => {
            const flipped = new Vec3(-axis.x, -axis.y, -axis.z);
            expect(elementsOf(new Mat3x3().setScaleAlongAxis(flipped, 3))).toEqual(
                elementsOf(scaling(3)),
            );
        });
    });

    describe("setReflection", () => {
        const normal = new Vec3(1, 2, 3).normalize();
        const reflection = () => new Mat3x3().setReflection(normal);

        function expectVec(v: Vec3, x: number, y: number, z: number): void {
            expect(
                approxEqual(v.x, x) && approxEqual(v.y, y) && approxEqual(v.z, z),
                `(${v.x}, ${v.y}, ${v.z}) ≉ (${x}, ${y}, ${z})`,
            ).toBe(true);
        }

        it("overwrites every element and returns itself", () => {
            const m = sample();
            const result = m.setReflection(normal);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(reflection()));
        });

        it("matches setScaleAlongAxis with k = -1", () => {
            expect(elementsOf(reflection())).toEqual(
                elementsOf(new Mat3x3().setScaleAlongAxis(normal, -1)),
            );
        });

        it.each([
            ["X", new Vec3(1, 0, 0), [-1, 1, 1]],
            ["Y", new Vec3(0, 1, 0), [1, -1, 1]],
            ["Z", new Vec3(0, 0, 1), [1, 1, -1]],
        ] as const)("negates only the %s coordinate for that cardinal normal", (_, n, f) => {
            // Approximate: the off-diagonal entries come out as -0.
            expectApprox(
                new Mat3x3().setReflection(n),
                elementsOf(new Mat3x3().setScale(f[0], f[1], f[2])),
            );
        });

        it("negates the normal and fixes vectors in the plane", () => {
            expectVec(reflection().transformVec3(normal), -normal.x, -normal.y, -normal.z);
            expectVec(reflection().transformVec3(new Vec3(3, 0, -1)), 3, 0, -1);
        });

        it("is its own inverse", () => {
            const m = reflection();
            expectApprox(m.clone().multiply(m), IDENTITY);
        });

        it("is orthogonal with determinant -1", () => {
            const m = reflection();
            expect(approxEqual(m.determinant(), -1)).toBe(true);
            expectApprox(m.clone().transpose().multiply(m), IDENTITY);
        });

        it("ignores the sign of the normal", () => {
            const flipped = new Vec3(-normal.x, -normal.y, -normal.z);
            expect(elementsOf(new Mat3x3().setReflection(flipped))).toEqual(
                elementsOf(reflection()),
            );
        });
    });

    describe("setShear", () => {
        it("overwrites every element and returns itself", () => {
            const m = sample();
            const result = m.setShear(1, 2, 3, 4, 5, 6);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([1, 1, 2, 3, 1, 4, 5, 6, 1]);
        });

        it("is the identity with no arguments", () => {
            expect(elementsOf(sample().setShear())).toEqual(IDENTITY);
        });

        it("offsets each coordinate by the others", () => {
            const r = new Mat3x3().setShear(1, 2, 3, 4, 5, 6).transformVec3(new Vec3(1, 2, 3));
            // x + 1·y + 2·z, y + 3·x + 4·z, z + 5·x + 6·y
            expect([r.x, r.y, r.z]).toEqual([9, 17, 20]);
        });

        it("shears X by Y only when given one factor", () => {
            const m = new Mat3x3().setShear(2);
            const r = m.transformVec3(new Vec3(1, 3, 5));
            expect([r.x, r.y, r.z]).toEqual([7, 3, 5]);
        });

        it("leaves points on the shearing axis fixed", () => {
            // Shearing X by Y moves nothing with y = 0.
            const r = new Mat3x3().setShear(2).transformVec3(new Vec3(4, 0, -1));
            expect([r.x, r.y, r.z]).toEqual([4, 0, -1]);
        });

        it("preserves volume when shearing one coordinate by both others", () => {
            expect(new Mat3x3().setShear(2, 3).determinant()).toBe(1);
            expect(new Mat3x3().setShear(0, 0, 0, 0, 4, 5).determinant()).toBe(1);
        });

        it("preserves volume for one-directional shears across axes", () => {
            // Upper triangular: x by y and z, y by z.
            expect(new Mat3x3().setShear(2, 3, 0, 4).determinant()).toBe(1);
        });

        it("has the documented determinant for a general shear", () => {
            const [xy, xz, yx, yz, zx, zy] = [1, 2, 3, 4, 5, 6];
            expect(new Mat3x3().setShear(xy, xz, yx, yz, zx, zy).determinant()).toBe(
                1 - xy * yx - xz * zx - yz * zy + xy * yz * zx + xz * zy * yx,
            );
        });

        it("is inverted by the negated factor for a single shear", () => {
            expectApprox(
                new Mat3x3().setShear(0, 0, 0, 2.5).inverse(),
                elementsOf(new Mat3x3().setShear(0, 0, 0, -2.5)),
            );
        });
    });

    describe("multiplyScalar", () => {
        it("multiplies every element by k and returns itself", () => {
            const m = sample();
            const result = m.multiplyScalar(2);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
        });

        it("leaves the matrix unchanged for k = 1", () => {
            expect(elementsOf(sample().multiplyScalar(1))).toEqual(elementsOf(sample()));
        });

        it("produces the zero matrix for k = 0", () => {
            expect(elementsOf(sample().multiplyScalar(0))).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
        });

        it("negates every element for k = -1", () => {
            expect(elementsOf(sample().multiplyScalar(-1))).toEqual([
                -1, -2, -3, -4, -5, -6, -7, -8, -9,
            ]);
        });

        it("turns the identity into a uniform scale", () => {
            expect(elementsOf(new Mat3x3().multiplyScalar(3))).toEqual(
                elementsOf(new Mat3x3().setScale(3)),
            );
        });

        it("scales the determinant by k³", () => {
            const m = new Mat3x3(2, -3, 1, 2, 0, -1, 1, 4, 5);
            expect(m.clone().multiplyScalar(2).determinant()).toBe(8 * m.determinant());
        });

        it("scales transformed vectors by k", () => {
            const r = sample()
                .multiplyScalar(2)
                .transformVec3(new Vec3(1, 2, 3));
            expect([r.x, r.y, r.z]).toEqual([28, 64, 100]);
        });
    });

    describe("multiply", () => {
        it("computes this · m and returns itself", () => {
            const a = sample();
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            const result = a.multiply(b);
            expect(result).toBe(a);
            expect(elementsOf(a)).toEqual([30, 24, 18, 84, 69, 54, 138, 114, 90]);
        });

        it("is not commutative", () => {
            const a = sample();
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            expect(elementsOf(b.multiply(a))).toEqual([90, 114, 138, 54, 69, 84, 18, 24, 30]);
        });

        it("leaves a matrix unchanged when multiplied by the identity on either side", () => {
            expect(elementsOf(sample().multiply(new Mat3x3()))).toEqual(elementsOf(sample()));
            expect(elementsOf(new Mat3x3().multiply(sample()))).toEqual(elementsOf(sample()));
        });

        it("squares a matrix when multiplied by itself", () => {
            const m = sample();
            m.multiply(m);
            expect(elementsOf(m)).toEqual([30, 36, 42, 66, 81, 96, 102, 126, 150]);
        });

        it("does not modify the operand", () => {
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            sample().multiply(b);
            expect(elementsOf(b)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
        });
    });

    describe("premultiply", () => {
        it("computes m · this and returns itself", () => {
            const a = sample();
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            const result = a.premultiply(b);
            expect(result).toBe(a);
            expect(elementsOf(a)).toEqual([90, 114, 138, 54, 69, 84, 18, 24, 30]);
        });

        it("squares a matrix when multiplied by itself", () => {
            const m = sample();
            m.premultiply(m);
            expect(elementsOf(m)).toEqual([30, 36, 42, 66, 81, 96, 102, 126, 150]);
        });
    });

    describe("multiplyMatrices", () => {
        it("sets this to a · b and returns itself", () => {
            const out = new Mat3x3();
            const result = out.multiplyMatrices(sample(), new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1));
            expect(result).toBe(out);
            expect(elementsOf(out)).toEqual([30, 24, 18, 84, 69, 54, 138, 114, 90]);
        });

        it("overwrites any previous contents of this", () => {
            const out = new Mat3x3(5, 5, 5, 5, 5, 5, 5, 5, 5);
            out.multiplyMatrices(new Mat3x3(), new Mat3x3());
            expect(elementsOf(out)).toEqual(IDENTITY);
        });

        it("does not modify either operand", () => {
            const a = sample();
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            new Mat3x3().multiplyMatrices(a, b);
            expect(elementsOf(a)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            expect(elementsOf(b)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
        });

        it("handles this as either operand", () => {
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            const left = sample();
            expect(elementsOf(left.multiplyMatrices(left, b))).toEqual(
                elementsOf(new Mat3x3().multiplyMatrices(sample(), b)),
            );
            const right = sample();
            expect(elementsOf(right.multiplyMatrices(b, right))).toEqual(
                elementsOf(new Mat3x3().multiplyMatrices(b, sample())),
            );
        });
    });

    describe("transpose", () => {
        it("swaps rows and columns and returns itself", () => {
            const m = sample();
            const result = m.transpose();
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9]);
        });

        it("restores the original when applied twice", () => {
            expect(elementsOf(sample().transpose().transpose())).toEqual(elementsOf(sample()));
        });

        it("leaves the identity unchanged", () => {
            expect(elementsOf(new Mat3x3().transpose())).toEqual(IDENTITY);
        });

        it("satisfies (a · b)ᵀ = bᵀ · aᵀ", () => {
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            const lhs = new Mat3x3().multiplyMatrices(sample(), b).transpose();
            const rhs = new Mat3x3().multiplyMatrices(b.clone().transpose(), sample().transpose());
            expect(elementsOf(lhs)).toEqual(elementsOf(rhs));
        });
    });

    describe("determinant", () => {
        it("is 1 for the identity", () => {
            expect(new Mat3x3().determinant()).toBe(1);
        });

        it("is the product of the diagonal for a diagonal matrix", () => {
            expect(new Mat3x3().setDiagonal(2, 3, 4).determinant()).toBe(24);
        });

        it("computes a general determinant", () => {
            expect(new Mat3x3(1, 2, 3, 0, 1, 4, 5, 6, 0).determinant()).toBe(1);
            expect(new Mat3x3(2, -3, 1, 2, 0, -1, 1, 4, 5).determinant()).toBe(49);
        });

        it("is 0 for a singular matrix", () => {
            expect(sample().determinant()).toBe(0);
        });

        it("changes sign when two rows are swapped", () => {
            expect(new Mat3x3(0, 1, 4, 1, 2, 3, 5, 6, 0).determinant()).toBe(-1);
        });

        it("is unchanged by transposition", () => {
            const m = new Mat3x3(2, -3, 1, 2, 0, -1, 1, 4, 5);
            expect(m.clone().transpose().determinant()).toBe(m.determinant());
        });

        it("is multiplicative: det(a · b) = det(a) · det(b)", () => {
            const a = new Mat3x3(2, -3, 1, 2, 0, -1, 1, 4, 5);
            const b = new Mat3x3(0.3, -1.2, 2.5, 4.1, 0.7, -0.6, 1.9, 3.3, 0.2);
            const product = new Mat3x3().multiplyMatrices(a, b).determinant();
            expect(approxEqual(product, a.determinant() * b.determinant())).toBe(true);
        });

        it("is the reciprocal of the inverse's determinant", () => {
            const m = new Mat3x3(0.3, -1.2, 2.5, 4.1, 0.7, -0.6, 1.9, 3.3, 0.2);
            const inv = m.clone().inverse();
            expect(approxEqual(m.determinant() * inv.determinant(), 1)).toBe(true);
        });

        it("does not modify the matrix", () => {
            const m = sample();
            m.determinant();
            expect(elementsOf(m)).toEqual(elementsOf(sample()));
        });
    });

    describe("setInverse", () => {
        it("inverts a general matrix and returns itself", () => {
            // det = 1, so the inverse is exact.
            const out = new Mat3x3();
            const result = out.setInverse(new Mat3x3(1, 2, 3, 0, 1, 4, 5, 6, 0));
            expect(result).toBe(out);
            expect(elementsOf(out)).toEqual([-24, 18, 5, 20, -15, -4, -5, 4, 1]);
        });

        it("inverts a diagonal matrix", () => {
            expect(elementsOf(new Mat3x3().setInverse(new Mat3x3().setDiagonal(2, 4, 8)))).toEqual([
                0.5, 0, 0, 0, 0.25, 0, 0, 0, 0.125,
            ]);
        });

        it("produces the identity when multiplied by the original on either side", () => {
            const m = new Mat3x3(0.3, -1.2, 2.5, 4.1, 0.7, -0.6, 1.9, 3.3, 0.2);
            const inv = new Mat3x3().setInverse(m);
            expectApprox(new Mat3x3().multiplyMatrices(m, inv), IDENTITY);
            expectApprox(new Mat3x3().multiplyMatrices(inv, m), IDENTITY);
        });

        it("inverts matrices with very small entries", () => {
            // det = 1e-12, well below EPSILON, but the matrix is invertible.
            expect(
                elementsOf(new Mat3x3().setInverse(new Mat3x3().setDiagonal(1e-4, 1e-4, 1e-4))),
            ).toEqual([1e4, 0, 0, 0, 1e4, 0, 0, 0, 1e4]);
        });

        it("sets this to zero for a singular matrix", () => {
            expect(elementsOf(new Mat3x3().setInverse(sample()))).toEqual([
                0, 0, 0, 0, 0, 0, 0, 0, 0,
            ]);
        });

        it("does not modify the operand", () => {
            const m = new Mat3x3(1, 2, 3, 0, 1, 4, 5, 6, 0);
            new Mat3x3().setInverse(m);
            expect(elementsOf(m)).toEqual([1, 2, 3, 0, 1, 4, 5, 6, 0]);
        });
    });

    describe("inverse", () => {
        it("inverts in place and returns itself", () => {
            const m = new Mat3x3(1, 2, 3, 0, 1, 4, 5, 6, 0);
            const result = m.inverse();
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([-24, 18, 5, 20, -15, -4, -5, 4, 1]);
        });

        it("restores the original when applied twice", () => {
            const m = new Mat3x3(0.3, -1.2, 2.5, 4.1, 0.7, -0.6, 1.9, 3.3, 0.2);
            expectApprox(m.clone().inverse().inverse(), elementsOf(m));
        });
    });

    describe("setInverseOrthonormal", () => {
        it("transposes the operand and returns itself", () => {
            const out = new Mat3x3();
            const result = out.setInverseOrthonormal(sample());
            expect(result).toBe(out);
            expect(elementsOf(out)).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9]);
        });

        it("matches setInverse for a rotation", () => {
            expectApprox(
                new Mat3x3().setInverseOrthonormal(sampleRotation()),
                elementsOf(new Mat3x3().setInverse(sampleRotation())),
            );
        });

        it("inverts a reflection", () => {
            const m = new Mat3x3().setReflection(new Vec3(1, 2, 3).normalize());
            expectApprox(
                new Mat3x3().multiplyMatrices(m, new Mat3x3().setInverseOrthonormal(m)),
                IDENTITY,
            );
        });

        it("produces the identity when multiplied by the original on either side", () => {
            const m = sampleRotation();
            const inv = new Mat3x3().setInverseOrthonormal(m);
            expectApprox(new Mat3x3().multiplyMatrices(m, inv), IDENTITY);
            expectApprox(new Mat3x3().multiplyMatrices(inv, m), IDENTITY);
        });

        it("differs from setInverse once scale is present", () => {
            const m = sampleRotation().multiply(new Mat3x3().setScale(2, 3, 4));
            const wrong = new Mat3x3().multiplyMatrices(m, new Mat3x3().setInverseOrthonormal(m));
            expect(elementsOf(wrong).every((x, i) => approxEqual(x, IDENTITY[i]!))).toBe(false);
        });

        it("works when the operand is this", () => {
            const m = sample();
            m.setInverseOrthonormal(m);
            expect(elementsOf(m)).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9]);
        });

        it("does not modify the operand", () => {
            const m = sample();
            new Mat3x3().setInverseOrthonormal(m);
            expect(elementsOf(m)).toEqual(elementsOf(sample()));
        });
    });

    describe("inverseOrthonormal", () => {
        it("inverts in place and returns itself", () => {
            const m = sampleRotation();
            const result = m.inverseOrthonormal();
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(
                elementsOf(new Mat3x3().setInverseOrthonormal(sampleRotation())),
            );
        });

        it("restores the original when applied twice", () => {
            expect(elementsOf(sampleRotation().inverseOrthonormal().inverseOrthonormal())).toEqual(
                elementsOf(sampleRotation()),
            );
        });
    });

    describe("clone", () => {
        it("creates an equal, independent instance", () => {
            const a = sample();
            const b = a.clone();
            expect(b).not.toBe(a);
            expect(b.elements).not.toBe(a.elements);
            expect(elementsOf(b)).toEqual(elementsOf(a));
            b.elements[4] = 42;
            expect(a.elements[4]).toBe(5);
        });
    });

    describe("transformVec3", () => {
        it("computes this · v", () => {
            const r = sample().transformVec3(new Vec3(1, 2, 3));
            expect([r.x, r.y, r.z]).toEqual([14, 32, 50]);
        });

        it("writes into out and returns it", () => {
            const out = new Vec3(9, 9, 9);
            const result = sample().transformVec3(new Vec3(1, 2, 3), out);
            expect(result).toBe(out);
            expect([out.x, out.y, out.z]).toEqual([14, 32, 50]);
        });

        it("allocates a new vector when out is omitted", () => {
            const v = new Vec3(1, 2, 3);
            const result = sample().transformVec3(v);
            expect(result).not.toBe(v);
            expect([v.x, v.y, v.z]).toEqual([1, 2, 3]);
        });

        it("transforms in place when out is v", () => {
            const v = new Vec3(1, 2, 3);
            sample().transformVec3(v, v);
            expect([v.x, v.y, v.z]).toEqual([14, 32, 50]);
        });

        it("accepts any Vec3Like", () => {
            const r = sample().transformVec3({ x: 1, y: 2, z: 3 });
            expect([r.x, r.y, r.z]).toEqual([14, 32, 50]);
        });

        it("leaves a vector unchanged under the identity", () => {
            const r = new Mat3x3().transformVec3(new Vec3(4, -5, 6));
            expect([r.x, r.y, r.z]).toEqual([4, -5, 6]);
        });

        it("does not modify the matrix", () => {
            const m = sample();
            m.transformVec3(new Vec3(1, 2, 3));
            expect(elementsOf(m)).toEqual(elementsOf(sample()));
        });
    });

    describe("transformInverseVec3", () => {
        it("computes thisᵀ · v", () => {
            const r = sample().transformInverseVec3(new Vec3(1, 2, 3));
            expect([r.x, r.y, r.z]).toEqual([30, 36, 42]);
        });

        it("writes into out and returns it", () => {
            const out = new Vec3(9, 9, 9);
            const result = sample().transformInverseVec3(new Vec3(1, 2, 3), out);
            expect(result).toBe(out);
            expect([out.x, out.y, out.z]).toEqual([30, 36, 42]);
        });

        it("allocates a new vector when out is omitted", () => {
            const v = new Vec3(1, 2, 3);
            const result = sample().transformInverseVec3(v);
            expect(result).not.toBe(v);
            expect([v.x, v.y, v.z]).toEqual([1, 2, 3]);
        });

        it("transforms in place when out is v", () => {
            const v = new Vec3(1, 2, 3);
            sample().transformInverseVec3(v, v);
            expect([v.x, v.y, v.z]).toEqual([30, 36, 42]);
        });

        it("matches transformVec3 with the inverse rotation", () => {
            const m = sampleRotation();
            const v = new Vec3(4, -5, 6);
            const r = m.transformInverseVec3(v);
            const expected = new Mat3x3().setInverse(m).transformVec3(v);
            expect(
                approxEqual(r.x, expected.x) &&
                    approxEqual(r.y, expected.y) &&
                    approxEqual(r.z, expected.z),
            ).toBe(true);
        });

        it("undoes transformVec3 for a rotation", () => {
            const m = sampleRotation();
            const r = m.transformInverseVec3(m.transformVec3(new Vec3(4, -5, 6)));
            expect(approxEqual(r.x, 4) && approxEqual(r.y, -5) && approxEqual(r.z, 6)).toBe(true);
        });

        it("does not modify the matrix", () => {
            const m = sample();
            m.transformInverseVec3(new Vec3(1, 2, 3));
            expect(elementsOf(m)).toEqual(elementsOf(sample()));
        });
    });

    describe.each([
        // [method, axis, a, b]: a 90° rotation about axis takes a → b.
        ["setRotationX", new Vec3(1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, 0, 1)],
        ["setRotationY", new Vec3(0, 1, 0), new Vec3(0, 0, 1), new Vec3(1, 0, 0)],
        ["setRotationZ", new Vec3(0, 0, 1), new Vec3(1, 0, 0), new Vec3(0, 1, 0)],
    ] as const)("%s", (method, axis, a, b) => {
        const rotation = (theta: number) => new Mat3x3()[method](theta);

        function expectVec(v: Vec3, expected: Vec3): void {
            expect(
                approxEqual(v.x, expected.x) &&
                    approxEqual(v.y, expected.y) &&
                    approxEqual(v.z, expected.z),
                `(${v.x}, ${v.y}, ${v.z}) ≉ (${expected.x}, ${expected.y}, ${expected.z})`,
            ).toBe(true);
        }

        it("overwrites every element and returns itself", () => {
            const m = sample();
            const result = m[method](0.7);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(rotation(0.7)));
        });

        it("rotates a 90° turn right-handed about the axis", () => {
            const m = rotation(Math.PI / 2);
            expectVec(m.transformVec3(a), b);
            expectVec(m.transformVec3(b), a.clone().scale(-1));
        });

        it("leaves the axis unchanged", () => {
            expectVec(rotation(0.7).transformVec3(axis), axis);
        });

        it("is orthonormal with determinant 1", () => {
            const m = rotation(0.7);
            expectApprox(m.clone().transpose().multiply(m), IDENTITY);
            expect(approxEqual(m.determinant(), 1)).toBe(true);
        });

        it("is inverted by the opposite angle", () => {
            expectApprox(rotation(0.7).multiply(rotation(-0.7)), IDENTITY);
        });

        it("adds angles under composition", () => {
            expectApprox(rotation(0.3).multiply(rotation(0.4)), elementsOf(rotation(0.7)));
        });

        it("returns to the identity after a full turn", () => {
            expectApprox(rotation(2 * Math.PI), IDENTITY);
        });
    });

    describe("setFromAxisAngle", () => {
        const axis = new Vec3(1, 2, 3).normalize();
        const rotation = (theta: number) => new Mat3x3().setFromAxisAngle(axis, theta);

        function expectVec(v: Vec3, x: number, y: number, z: number): void {
            expect(
                approxEqual(v.x, x) && approxEqual(v.y, y) && approxEqual(v.z, z),
                `(${v.x}, ${v.y}, ${v.z}) ≉ (${x}, ${y}, ${z})`,
            ).toBe(true);
        }

        it("overwrites every element and returns itself", () => {
            const m = sample();
            const result = m.setFromAxisAngle(axis, 0.7);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(rotation(0.7)));
        });

        it.each([
            ["setRotationX", new Vec3(1, 0, 0)],
            ["setRotationY", new Vec3(0, 1, 0)],
            ["setRotationZ", new Vec3(0, 0, 1)],
        ] as const)("matches %s for its cardinal axis", (method, cardinal) => {
            expectApprox(
                new Mat3x3().setFromAxisAngle(cardinal, 0.7),
                elementsOf(new Mat3x3()[method](0.7)),
            );
        });

        it("leaves the axis unchanged", () => {
            const r = rotation(0.7).transformVec3(axis);
            expectVec(r, axis.x, axis.y, axis.z);
        });

        it("turns a perpendicular vector a quarter turn onto axis × v", () => {
            const v = new Vec3(3, 0, -1).normalize(); // v · axis = 0
            const expected = Vec3.cross(axis, v);
            const r = rotation(Math.PI / 2).transformVec3(v);
            expectVec(r, expected.x, expected.y, expected.z);
        });

        it("swaps x and y with a half turn about their diagonal", () => {
            const diagonal = new Vec3(1, 1, 0).normalize();
            const r = new Mat3x3()
                .setFromAxisAngle(diagonal, Math.PI)
                .transformVec3(new Vec3(1, 0, 0));
            expectVec(r, 0, 1, 0);
        });

        it("is orthonormal with determinant 1", () => {
            const m = rotation(0.7);
            expectApprox(m.clone().transpose().multiply(m), IDENTITY);
            expect(approxEqual(m.determinant(), 1)).toBe(true);
        });

        it("is the identity for a zero angle", () => {
            expectApprox(rotation(0), IDENTITY);
        });

        it("treats a flipped axis like a negated angle", () => {
            expectApprox(
                new Mat3x3().setFromAxisAngle(axis.clone().scale(-1), 0.7),
                elementsOf(rotation(-0.7)),
            );
        });

        it("adds angles under composition about the same axis", () => {
            expectApprox(rotation(0.3).multiply(rotation(0.4)), elementsOf(rotation(0.7)));
        });

        it("accepts any Vec3Like axis", () => {
            expectApprox(
                new Mat3x3().setFromAxisAngle({ x: axis.x, y: axis.y, z: axis.z }, 0.7),
                elementsOf(rotation(0.7)),
            );
        });
    });

    describe("setFromQuaternion", () => {
        const axis = new Vec3(1, 2, 3).normalize();
        const q = new Quaternion().setFromAxisAngle(axis, 0.7);

        it("gives the identity for the identity quaternion", () => {
            expectApprox(
                new Mat3x3(2, 3, 4, 5, 6, 7, 8, 9, 10).setFromQuaternion(new Quaternion()),
                IDENTITY,
            );
        });

        it("maps +X to +Y for 90° about +Z", () => {
            const m = new Mat3x3().setFromQuaternion(
                new Quaternion().setFromAxisAngle(new Vec3(0, 0, 1), Math.PI / 2),
            );
            expectApprox(m, [0, -1, 0, 1, 0, 0, 0, 0, 1]);
        });

        it("matches setFromAxisAngle for the same axis and angle", () => {
            expectApprox(new Mat3x3().setFromQuaternion(q), elementsOf(sampleRotation()));
        });

        it("transforms vectors the same way as rotateVec3", () => {
            const m = new Mat3x3().setFromQuaternion(q);
            const v = new Vec3(0.4, -1.5, 2.2);
            const expected = q.rotateVec3(v);
            const actual = m.transformVec3(v);
            expect(actual.x).toBeCloseTo(expected.x, 12);
            expect(actual.y).toBeCloseTo(expected.y, 12);
            expect(actual.z).toBeCloseTo(expected.z, 12);
        });

        it("gives the same matrix for q and −q", () => {
            const negated = q.clone().scale(-1);
            expectApprox(
                new Mat3x3().setFromQuaternion(negated),
                elementsOf(new Mat3x3().setFromQuaternion(q)),
            );
        });

        it("produces an orthonormal matrix with determinant 1", () => {
            const m = new Mat3x3().setFromQuaternion(q);
            expect(m.determinant()).toBeCloseTo(1, 12);
            expectApprox(m.clone().multiply(m.clone().transpose()), IDENTITY);
        });

        it("turns a quaternion product into a matrix product", () => {
            const b = new Quaternion().setFromAxisAngle(new Vec3(-1, 0, 2).normalize(), 1.9);
            const product = new Mat3x3().setFromQuaternion(q.clone().multiply(b));
            const expected = new Mat3x3()
                .setFromQuaternion(q)
                .multiply(new Mat3x3().setFromQuaternion(b));
            expectApprox(product, elementsOf(expected));
        });

        it("accepts any QuatLike", () => {
            expectApprox(
                new Mat3x3().setFromQuaternion({ w: q.w, x: q.x, y: q.y, z: q.z }),
                elementsOf(new Mat3x3().setFromQuaternion(q)),
            );
        });

        it("returns itself", () => {
            const m = new Mat3x3();
            expect(m.setFromQuaternion(q)).toBe(m);
        });
    });
});
