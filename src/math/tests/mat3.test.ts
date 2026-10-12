import { describe, expect, it } from "vitest";
import { Mat3x3 } from "../geometry/mat3x3";
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
            expect(elementsOf(new Mat3x3(5))).toEqual([
                5, 0, 0, 0, 1, 0, 0, 0, 1,
            ]);
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
            expect(
                elementsOf(new Mat3x3(9, 9, 9, 9, 9, 9, 9, 9, 9).identity()),
            ).toEqual(IDENTITY);
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

    describe("scale", () => {
        it("multiplies every element by k and returns itself", () => {
            const m = sample();
            const result = m.scale(2);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18]);
        });

        it("leaves the matrix unchanged for k = 1", () => {
            expect(elementsOf(sample().scale(1))).toEqual(elementsOf(sample()));
        });

        it("produces the zero matrix for k = 0", () => {
            expect(elementsOf(sample().scale(0))).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
        });

        it("negates every element for k = -1", () => {
            expect(elementsOf(sample().scale(-1))).toEqual([-1, -2, -3, -4, -5, -6, -7, -8, -9]);
        });

        it("turns the identity into a uniform diagonal", () => {
            expect(elementsOf(new Mat3x3().scale(3))).toEqual(
                elementsOf(new Mat3x3().setDiagonal(3, 3, 3)),
            );
        });

        it("scales the determinant by k³", () => {
            const m = new Mat3x3(2, -3, 1, 2, 0, -1, 1, 4, 5);
            expect(m.clone().scale(2).determinant()).toBe(8 * m.determinant());
        });

        it("scales transformed vectors by k", () => {
            const v = new Vec3(1, 2, 3);
            const r = sample().scale(2).transformVec3(v);
            expect([r.x, r.y, r.z]).toEqual([28, 64, 100]);
        });

        it("chains with other operations", () => {
            expect(elementsOf(new Mat3x3().scale(2).multiply(sample()))).toEqual([
                2, 4, 6, 8, 10, 12, 14, 16, 18,
            ]);
        });
    });

    describe("multiply", () => {
        it("computes this · m and returns itself", () => {
            const a = sample();
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            const result = a.multiply(b);
            expect(result).toBe(a);
            expect(elementsOf(a)).toEqual([
                30, 24, 18, 84, 69, 54, 138, 114, 90,
            ]);
        });

        it("is not commutative", () => {
            const a = sample();
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            expect(elementsOf(b.multiply(a))).toEqual([
                90, 114, 138, 54, 69, 84, 18, 24, 30,
            ]);
        });

        it("leaves a matrix unchanged when multiplied by the identity on either side", () => {
            expect(elementsOf(sample().multiply(new Mat3x3()))).toEqual(
                elementsOf(sample()),
            );
            expect(elementsOf(new Mat3x3().multiply(sample()))).toEqual(
                elementsOf(sample()),
            );
        });

        it("squares a matrix when multiplied by itself", () => {
            const m = sample();
            m.multiply(m);
            expect(elementsOf(m)).toEqual([
                30, 36, 42, 66, 81, 96, 102, 126, 150,
            ]);
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
            expect(elementsOf(a)).toEqual([
                90, 114, 138, 54, 69, 84, 18, 24, 30,
            ]);
        });

        it("squares a matrix when multiplied by itself", () => {
            const m = sample();
            m.premultiply(m);
            expect(elementsOf(m)).toEqual([
                30, 36, 42, 66, 81, 96, 102, 126, 150,
            ]);
        });
    });

    describe("multiplyMatrices", () => {
        it("sets this to a · b and returns itself", () => {
            const out = new Mat3x3();
            const result = out.multiplyMatrices(
                sample(),
                new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1),
            );
            expect(result).toBe(out);
            expect(elementsOf(out)).toEqual([
                30, 24, 18, 84, 69, 54, 138, 114, 90,
            ]);
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
            expect(elementsOf(sample().transpose().transpose())).toEqual(
                elementsOf(sample()),
            );
        });

        it("leaves the identity unchanged", () => {
            expect(elementsOf(new Mat3x3().transpose())).toEqual(IDENTITY);
        });

        it("satisfies (a · b)ᵀ = bᵀ · aᵀ", () => {
            const b = new Mat3x3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            const lhs = new Mat3x3().multiplyMatrices(sample(), b).transpose();
            const rhs = new Mat3x3().multiplyMatrices(
                b.clone().transpose(),
                sample().transpose(),
            );
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
            expect(new Mat3x3(2, -3, 1, 2, 0, -1, 1, 4, 5).determinant()).toBe(
                49,
            );
        });

        it("is 0 for a singular matrix", () => {
            expect(sample().determinant()).toBe(0);
        });

        it("changes sign when two rows are swapped", () => {
            expect(new Mat3x3(0, 1, 4, 1, 2, 3, 5, 6, 0).determinant()).toBe(
                -1,
            );
        });

        it("is unchanged by transposition", () => {
            const m = new Mat3x3(2, -3, 1, 2, 0, -1, 1, 4, 5);
            expect(m.clone().transpose().determinant()).toBe(m.determinant());
        });

        it("is multiplicative: det(a · b) = det(a) · det(b)", () => {
            const a = new Mat3x3(2, -3, 1, 2, 0, -1, 1, 4, 5);
            const b = new Mat3x3(0.3, -1.2, 2.5, 4.1, 0.7, -0.6, 1.9, 3.3, 0.2);
            const product = new Mat3x3().multiplyMatrices(a, b).determinant();
            expect(
                approxEqual(product, a.determinant() * b.determinant()),
            ).toBe(true);
        });

        it("is the reciprocal of the inverse's determinant", () => {
            const m = new Mat3x3(0.3, -1.2, 2.5, 4.1, 0.7, -0.6, 1.9, 3.3, 0.2);
            const inv = m.clone().inverse();
            expect(approxEqual(m.determinant() * inv.determinant(), 1)).toBe(
                true,
            );
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
            const result = out.setInverse(
                new Mat3x3(1, 2, 3, 0, 1, 4, 5, 6, 0),
            );
            expect(result).toBe(out);
            expect(elementsOf(out)).toEqual([
                -24, 18, 5, 20, -15, -4, -5, 4, 1,
            ]);
        });

        it("inverts a diagonal matrix", () => {
            expect(
                elementsOf(
                    new Mat3x3().setInverse(new Mat3x3().setDiagonal(2, 4, 8)),
                ),
            ).toEqual([0.5, 0, 0, 0, 0.25, 0, 0, 0, 0.125]);
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
                elementsOf(
                    new Mat3x3().setInverse(
                        new Mat3x3().setDiagonal(1e-4, 1e-4, 1e-4),
                    ),
                ),
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
});
