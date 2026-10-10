import { describe, expect, it } from "vitest";
import { Mat3 } from "../mat3";

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function elementsOf(m: Mat3): number[] {
    return Array.from(m.elements);
}

const sample = () => new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9);

describe("Mat3", () => {
    describe("construction", () => {
        it("defaults to the identity", () => {
            expect(elementsOf(new Mat3())).toEqual(IDENTITY);
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
            expect(elementsOf(new Mat3(5))).toEqual([5, 0, 0, 0, 1, 0, 0, 0, 1]);
        });

        it("gives each instance its own storage", () => {
            const a = new Mat3();
            const b = new Mat3();
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
            const a = new Mat3().identity();
            a.elements[0] = 42;
            expect(elementsOf(new Mat3(9, 9, 9, 9, 9, 9, 9, 9, 9).identity())).toEqual(IDENTITY);
        });
    });

    describe("copy", () => {
        it("copies all nine elements and returns itself", () => {
            const m = new Mat3();
            const result = m.copy(sample());
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });

        it("does not share storage with the source", () => {
            const source = sample();
            const m = new Mat3().copy(source);
            source.elements[0] = 42;
            expect(m.elements[0]).toBe(1);
        });

        it("leaves a matrix unchanged when copying itself", () => {
            const m = sample();
            m.copy(m);
            expect(elementsOf(m)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
    });

    describe("multiply", () => {
        it("computes this · m and returns itself", () => {
            const a = sample();
            const b = new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            const result = a.multiply(b);
            expect(result).toBe(a);
            expect(elementsOf(a)).toEqual([30, 24, 18, 84, 69, 54, 138, 114, 90]);
        });

        it("is not commutative", () => {
            const a = sample();
            const b = new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            expect(elementsOf(b.multiply(a))).toEqual([90, 114, 138, 54, 69, 84, 18, 24, 30]);
        });

        it("leaves a matrix unchanged when multiplied by the identity on either side", () => {
            expect(elementsOf(sample().multiply(new Mat3()))).toEqual(elementsOf(sample()));
            expect(elementsOf(new Mat3().multiply(sample()))).toEqual(elementsOf(sample()));
        });

        it("squares a matrix when multiplied by itself", () => {
            const m = sample();
            m.multiply(m);
            expect(elementsOf(m)).toEqual([30, 36, 42, 66, 81, 96, 102, 126, 150]);
        });

        it("does not modify the operand", () => {
            const b = new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            sample().multiply(b);
            expect(elementsOf(b)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
        });
    });

    describe("premultiply", () => {
        it("computes m · this and returns itself", () => {
            const a = sample();
            const b = new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1);
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
            const out = new Mat3();
            const result = out.multiplyMatrices(sample(), new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1));
            expect(result).toBe(out);
            expect(elementsOf(out)).toEqual([30, 24, 18, 84, 69, 54, 138, 114, 90]);
        });

        it("overwrites any previous contents of this", () => {
            const out = new Mat3(5, 5, 5, 5, 5, 5, 5, 5, 5);
            out.multiplyMatrices(new Mat3(), new Mat3());
            expect(elementsOf(out)).toEqual(IDENTITY);
        });

        it("does not modify either operand", () => {
            const a = sample();
            const b = new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            new Mat3().multiplyMatrices(a, b);
            expect(elementsOf(a)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            expect(elementsOf(b)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
        });

        it("handles this as either operand", () => {
            const b = new Mat3(9, 8, 7, 6, 5, 4, 3, 2, 1);
            const left = sample();
            expect(elementsOf(left.multiplyMatrices(left, b))).toEqual(
                elementsOf(new Mat3().multiplyMatrices(sample(), b)),
            );
            const right = sample();
            expect(elementsOf(right.multiplyMatrices(b, right))).toEqual(
                elementsOf(new Mat3().multiplyMatrices(b, sample())),
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
});
