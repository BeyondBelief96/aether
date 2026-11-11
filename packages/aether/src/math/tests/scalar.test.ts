import { describe, expect, it } from "vitest";
import { EPSILON, approxEqual, clamp } from "../scalar";

describe("scalar", () => {
    describe("approxEqual", () => {
        it("treats identical values as equal", () => {
            expect(approxEqual(0, 0)).toBe(true);
            expect(approxEqual(1.5, 1.5)).toBe(true);
            expect(approxEqual(-3, -3)).toBe(true);
        });

        it("absorbs floating-point rounding error", () => {
            expect(approxEqual(0.1 + 0.2, 0.3)).toBe(true);
            expect(approxEqual(Math.sqrt(2) * Math.sqrt(2), 2)).toBe(true);
        });

        it("accepts differences smaller than EPSILON", () => {
            expect(approxEqual(1, 1 + EPSILON * 0.5)).toBe(true);
            expect(approxEqual(1, 1 - EPSILON * 0.5)).toBe(true);
        });

        it("rejects differences larger than EPSILON", () => {
            expect(approxEqual(1, 1 + EPSILON * 2)).toBe(false);
            expect(approxEqual(1, 1 - EPSILON * 2)).toBe(false);
            expect(approxEqual(0, 1)).toBe(false);
        });

        it("is symmetric", () => {
            const a = 1;
            const b = 1 + EPSILON * 0.5;
            expect(approxEqual(a, b)).toBe(approxEqual(b, a));
        });

        it("treats signed zeros as equal", () => {
            expect(approxEqual(0, -0)).toBe(true);
        });

        it("scales the tolerance with magnitude", () => {
            expect(approxEqual(1e10, 1e10 + 1)).toBe(true);
            expect(approxEqual(1e10, 1e10 + 1e5)).toBe(false);
        });

        it("keeps an absolute tolerance near zero", () => {
            expect(approxEqual(0, EPSILON * 0.5)).toBe(true);
            expect(approxEqual(0, EPSILON * 2)).toBe(false);
        });

        it("accepts a custom epsilon", () => {
            expect(approxEqual(1, 1.01, 0.1)).toBe(true);
            expect(approxEqual(1, 1.01, 0.001)).toBe(false);
        });

        it("treats matching infinities as equal", () => {
            expect(approxEqual(Infinity, Infinity)).toBe(true);
            expect(approxEqual(-Infinity, -Infinity)).toBe(true);
            expect(approxEqual(Infinity, -Infinity)).toBe(false);
            expect(approxEqual(Infinity, 1e300)).toBe(false);
        });

        it("never matches NaN", () => {
            expect(approxEqual(NaN, NaN)).toBe(false);
            expect(approxEqual(NaN, 0)).toBe(false);
        });
    });

    describe("clamp", () => {
        it("returns the value when inside the range", () => {
            expect(clamp(0.5, 0, 1)).toBe(0.5);
            expect(clamp(-2, -5, 5)).toBe(-2);
        });

        it("clamps values above the upper bound", () => {
            expect(clamp(2, 0, 1)).toBe(1);
        });

        it("clamps values below the lower bound", () => {
            expect(clamp(-1, 0, 1)).toBe(0);
        });

        it("returns the bound when the value equals it", () => {
            expect(clamp(1, 0, 1)).toBe(1);
            expect(clamp(0, 0, 1)).toBe(0);
        });

        it("handles a degenerate range", () => {
            expect(clamp(5, 3, 3)).toBe(3);
            expect(clamp(-5, 3, 3)).toBe(3);
        });

        it("clamps infinities to the bounds", () => {
            expect(clamp(Infinity, 0, 1)).toBe(1);
            expect(clamp(-Infinity, 0, 1)).toBe(0);
        });
    });
});
