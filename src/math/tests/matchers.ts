import { expect } from "vitest";
import type { QuatLike, Vec3Like } from "../types";

/**
 * Custom Vitest matchers for math types, registered through `test.setupFiles`.
 *
 * `digits` works like the built-in `toBeCloseTo`: each component must satisfy
 * `|actual − expected| < 10^−digits / 2`.
 */

interface MathMatchers<R> {
    /** Asserts that `x`, `y` and `z` are each close to `expected`'s. */
    toBeCloseToVec3(expected: Vec3Like, digits?: number): R;
    /**
     * Asserts that the quaternion represents the same rotation as `expected`. `q` and `−q`
     * are treated as equal, so a sign flip on every component still passes.
     */
    toBeCloseToQuat(expected: QuatLike, digits?: number): R;
}

declare module "vitest" {
    // Vitest 5's signature: `R` is the assertion's return type, `T` the received value's type.
    interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
        extends MathMatchers<R> {}
}

const DEFAULT_DIGITS = 12;

function tolerance(digits: number): number {
    return 10 ** -digits / 2;
}

function closeTo(a: number, b: number, tol: number): boolean {
    return Math.abs(a - b) < tol;
}

function formatVec3(v: Vec3Like): string {
    return `(${v.x}, ${v.y}, ${v.z})`;
}

function formatQuat(q: QuatLike): string {
    return `[${q.w}, (${q.x}, ${q.y}, ${q.z})]`;
}

expect.extend({
    toBeCloseToVec3(received: Vec3Like, expected: Vec3Like, digits: number = DEFAULT_DIGITS) {
        const tol = tolerance(digits);
        const pass =
            closeTo(received.x, expected.x, tol) &&
            closeTo(received.y, expected.y, tol) &&
            closeTo(received.z, expected.z, tol);
        return {
            pass,
            message: () =>
                `expected ${formatVec3(received)} ${pass ? "not " : ""}to be close to ` +
                `${formatVec3(expected)} (tolerance ${tol})`,
        };
    },

    toBeCloseToQuat(received: QuatLike, expected: QuatLike, digits: number = DEFAULT_DIGITS) {
        const tol = tolerance(digits);
        const sign =
            received.w * expected.w +
                received.x * expected.x +
                received.y * expected.y +
                received.z * expected.z <
            0
                ? -1
                : 1;
        const pass =
            closeTo(received.w, sign * expected.w, tol) &&
            closeTo(received.x, sign * expected.x, tol) &&
            closeTo(received.y, sign * expected.y, tol) &&
            closeTo(received.z, sign * expected.z, tol);
        return {
            pass,
            message: () =>
                `expected ${formatQuat(received)} ${pass ? "not " : ""}to be the same rotation ` +
                `as ${formatQuat(expected)} (tolerance ${tol}, q ≡ −q)`,
        };
    },
});
