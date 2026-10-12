import { describe, expect, it } from "vitest";
import { Mat3x4 } from "../geometry/mat3x4";
import { Vec3 } from "../geometry/vec3";
import { approxEqual } from "../scalar";

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

function elementsOf(m: Mat3x4): number[] {
    return Array.from(m.elements);
}

function expectApprox(m: Mat3x4, expected: number[]): void {
    const actual = elementsOf(m);
    expect(
        actual.every((x, i) => approxEqual(x, expected[i]!)),
        `${actual} ≉ ${expected}`,
    ).toBe(true);
}

// Rotation about the unit axis (x, y, z) by `angle`, followed by translation (tx, ty, tz).
function rigid(
    x: number,
    y: number,
    z: number,
    angle: number,
    tx: number,
    ty: number,
    tz: number,
): Mat3x4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const k = 1 - c;
    return new Mat3x4(
        c + x * x * k, x * y * k - z * s, x * z * k + y * s, tx,
        y * x * k + z * s, c + y * y * k, y * z * k - x * s, ty,
        z * x * k - y * s, z * y * k + x * s, c + z * z * k, tz,
    );
}

function expectVec(v: Vec3, x: number, y: number, z: number): void {
    expect(
        approxEqual(v.x, x) && approxEqual(v.y, y) && approxEqual(v.z, z),
        `(${v.x}, ${v.y}, ${v.z}) ≉ (${x}, ${y}, ${z})`,
    ).toBe(true);
}

const AXIS = 1 / Math.sqrt(3);
const sampleRigid = () => rigid(AXIS, AXIS, AXIS, 0.7, 3, -2, 5);

const sample = () => new Mat3x4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
const reversed = () => new Mat3x4(12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1);

const translation = (x: number, y: number, z: number) =>
    new Mat3x4(1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z);

// 90° counter-clockwise about +Z: +X → +Y.
const rotationZ90 = () => new Mat3x4(0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0);

describe("Mat3x4", () => {
    describe("construction", () => {
        it("defaults to the identity", () => {
            expect(elementsOf(new Mat3x4())).toEqual(IDENTITY);
        });

        it("stores its arguments row-major", () => {
            const m = sample();
            expect(elementsOf(m)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
            // m[row * 4 + col]
            expect(m.elements[0 * 4 + 3]).toBe(4); // m03, x translation
            expect(m.elements[1 * 4 + 0]).toBe(5); // m10
            expect(m.elements[2 * 4 + 3]).toBe(12); // m23, z translation
        });

        it("fills omitted arguments from the identity", () => {
            expect(elementsOf(new Mat3x4(5))).toEqual([5, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
        });

        it("gives each instance its own storage", () => {
            const a = new Mat3x4();
            const b = new Mat3x4();
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
            const a = new Mat3x4().identity();
            a.elements[3] = 42;
            expect(elementsOf(sample().identity())).toEqual(IDENTITY);
        });
    });

    describe("copy", () => {
        it("copies all twelve elements and returns itself", () => {
            const m = new Mat3x4();
            const result = m.copy(sample());
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(sample()));
        });

        it("does not share storage with the source", () => {
            const source = sample();
            const m = new Mat3x4().copy(source);
            source.elements[0] = 42;
            expect(m.elements[0]).toBe(1);
        });

        it("leaves a matrix unchanged when copying itself", () => {
            const m = sample();
            m.copy(m);
            expect(elementsOf(m)).toEqual(elementsOf(sample()));
        });
    });

    describe("multiply", () => {
        it("computes this · m and returns itself", () => {
            const a = sample();
            const result = a.multiply(reversed());
            expect(result).toBe(a);
            expect(elementsOf(a)).toEqual([40, 34, 28, 26, 136, 118, 100, 90, 232, 202, 172, 154]);
        });

        it("is not commutative", () => {
            expect(elementsOf(reversed().multiply(sample()))).toEqual([
                157, 190, 223, 265, 97, 118, 139, 165, 37, 46, 55, 65,
            ]);
        });

        it("leaves a matrix unchanged when multiplied by the identity on either side", () => {
            expect(elementsOf(sample().multiply(new Mat3x4()))).toEqual(elementsOf(sample()));
            expect(elementsOf(new Mat3x4().multiply(sample()))).toEqual(elementsOf(sample()));
        });

        it("adds translations", () => {
            expect(elementsOf(translation(1, 2, 3).multiply(translation(4, 5, 6)))).toEqual(
                elementsOf(translation(5, 7, 9)),
            );
        });

        it("applies the right-hand transform first", () => {
            // Translate then rotate: the translation is rotated, (1, 0, 0) → (0, 1, 0).
            expect(elementsOf(rotationZ90().multiply(translation(1, 0, 0)))).toEqual([
                0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            ]);
            // Rotate then translate: the translation is unchanged.
            expect(elementsOf(translation(1, 0, 0).multiply(rotationZ90()))).toEqual([
                0, -1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0,
            ]);
        });

        it("squares a matrix when multiplied by itself", () => {
            const m = sample();
            m.multiply(m);
            expect(elementsOf(m)).toEqual([38, 44, 50, 60, 98, 116, 134, 160, 158, 188, 218, 260]);
        });

        it("does not modify the operand", () => {
            const b = reversed();
            sample().multiply(b);
            expect(elementsOf(b)).toEqual(elementsOf(reversed()));
        });
    });

    describe("premultiply", () => {
        it("computes m · this and returns itself", () => {
            const a = sample();
            const result = a.premultiply(reversed());
            expect(result).toBe(a);
            expect(elementsOf(a)).toEqual([157, 190, 223, 265, 97, 118, 139, 165, 37, 46, 55, 65]);
        });

        it("squares a matrix when multiplied by itself", () => {
            const m = sample();
            m.premultiply(m);
            expect(elementsOf(m)).toEqual([38, 44, 50, 60, 98, 116, 134, 160, 158, 188, 218, 260]);
        });
    });

    describe("multiplyMatrices", () => {
        it("sets this to a · b and returns itself", () => {
            const out = new Mat3x4();
            const result = out.multiplyMatrices(sample(), reversed());
            expect(result).toBe(out);
            expect(elementsOf(out)).toEqual([40, 34, 28, 26, 136, 118, 100, 90, 232, 202, 172, 154]);
        });

        it("overwrites any previous contents of this", () => {
            const out = sample();
            out.multiplyMatrices(new Mat3x4(), new Mat3x4());
            expect(elementsOf(out)).toEqual(IDENTITY);
        });

        it("does not modify either operand", () => {
            const a = sample();
            const b = reversed();
            new Mat3x4().multiplyMatrices(a, b);
            expect(elementsOf(a)).toEqual(elementsOf(sample()));
            expect(elementsOf(b)).toEqual(elementsOf(reversed()));
        });

        it("handles this as either operand", () => {
            const left = sample();
            expect(elementsOf(left.multiplyMatrices(left, reversed()))).toEqual(
                elementsOf(new Mat3x4().multiplyMatrices(sample(), reversed())),
            );
            const right = sample();
            expect(elementsOf(right.multiplyMatrices(reversed(), right))).toEqual(
                elementsOf(new Mat3x4().multiplyMatrices(reversed(), sample())),
            );
        });
    });

    describe("transposeLinear", () => {
        it("transposes the linear part, keeps the translation, and returns itself", () => {
            const m = sample();
            const result = m.transposeLinear();
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([1, 5, 9, 4, 2, 6, 10, 8, 3, 7, 11, 12]);
        });

        it("restores the original when applied twice", () => {
            expect(elementsOf(sample().transposeLinear().transposeLinear())).toEqual(
                elementsOf(sample()),
            );
        });

        it("inverts a rotation", () => {
            const r = rotationZ90();
            const product = r.clone().multiply(r.clone().transposeLinear());
            expect(elementsOf(product).map((x) => x + 0)).toEqual(IDENTITY);
        });
    });

    describe("determinant", () => {
        it("is 1 for the identity", () => {
            expect(new Mat3x4().determinant()).toBe(1);
        });

        it("ignores the translation column", () => {
            expect(translation(4, -5, 6).determinant()).toBe(1);
            expect(new Mat3x4(2, 0, 0, 5, 0, 3, 0, 6, 0, 0, 4, 7).determinant()).toBe(24);
        });

        it("computes a general determinant", () => {
            expect(new Mat3x4(2, -3, 1, 9, 2, 0, -1, 8, 1, 4, 5, 7).determinant()).toBe(49);
        });

        it("is 0 for a singular linear part", () => {
            expect(sample().determinant()).toBe(0);
        });

        it("is 1 for a rotation", () => {
            expect(approxEqual(sampleRigid().determinant(), 1)).toBe(true);
        });

        it("is multiplicative: det(a · b) = det(a) · det(b)", () => {
            const a = new Mat3x4(2, -3, 1, 9, 2, 0, -1, 8, 1, 4, 5, 7);
            const b = new Mat3x4(0.3, -1.2, 2.5, 1, 4.1, 0.7, -0.6, 2, 1.9, 3.3, 0.2, 3);
            const product = new Mat3x4().multiplyMatrices(a, b).determinant();
            expect(approxEqual(product, a.determinant() * b.determinant())).toBe(true);
        });

        it("does not modify the transform", () => {
            const m = sampleRigid();
            m.determinant();
            expect(elementsOf(m)).toEqual(elementsOf(sampleRigid()));
        });
    });

    describe("setInverse", () => {
        const general = () => new Mat3x4(1, 2, 3, 1, 0, 1, 4, 2, 5, 6, 0, 3);
        const affine = () => new Mat3x4(0.3, -1.2, 2.5, 1, 4.1, 0.7, -0.6, 2, 1.9, 3.3, 0.2, 3);

        it("inverts a general transform and returns itself", () => {
            // Linear part has det = 1, so the inverse is exact: t' = −L⁻¹t.
            const out = new Mat3x4();
            const result = out.setInverse(general());
            expect(result).toBe(out);
            expect(elementsOf(out)).toEqual([-24, 18, 5, -27, 20, -15, -4, 22, -5, 4, 1, -6]);
        });

        it("inverts a scale and translation", () => {
            expect(
                elementsOf(new Mat3x4().setInverse(new Mat3x4(2, 0, 0, 4, 0, 4, 0, 8, 0, 0, 8, 16))),
            ).toEqual([0.5, 0, 0, -2, 0, 0.25, 0, -2, 0, 0, 0.125, -2]);
        });

        it("produces the identity when multiplied by the original on either side", () => {
            const m = affine();
            const inv = new Mat3x4().setInverse(m);
            expectApprox(new Mat3x4().multiplyMatrices(m, inv), IDENTITY);
            expectApprox(new Mat3x4().multiplyMatrices(inv, m), IDENTITY);
        });

        it("sets this to zero for a singular linear part", () => {
            expect(elementsOf(new Mat3x4().setInverse(sample()))).toEqual(new Array(12).fill(0));
        });

        it("matches setInverseOrthonormal for a rotation and translation", () => {
            expectApprox(
                new Mat3x4().setInverse(sampleRigid()),
                elementsOf(new Mat3x4().setInverseOrthonormal(sampleRigid())),
            );
        });

        it("differs from setInverseOrthonormal once scale is present", () => {
            const m = new Mat3x4(2, 0, 0, 4, 0, 4, 0, 8, 0, 0, 8, 16);
            expectApprox(new Mat3x4().multiplyMatrices(m, new Mat3x4().setInverse(m)), IDENTITY);
            const wrong = new Mat3x4().multiplyMatrices(m, new Mat3x4().setInverseOrthonormal(m));
            expect(elementsOf(wrong)).not.toEqual(IDENTITY);
        });

        it("does not modify the operand", () => {
            const m = affine();
            new Mat3x4().setInverse(m);
            expect(elementsOf(m)).toEqual(elementsOf(affine()));
        });
    });

    describe("inverse", () => {
        it("inverts in place and returns itself", () => {
            const m = new Mat3x4(1, 2, 3, 1, 0, 1, 4, 2, 5, 6, 0, 3);
            const result = m.inverse();
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([-24, 18, 5, -27, 20, -15, -4, 22, -5, 4, 1, -6]);
        });

        it("restores the original when applied twice", () => {
            const m = new Mat3x4(0.3, -1.2, 2.5, 1, 4.1, 0.7, -0.6, 2, 1.9, 3.3, 0.2, 3);
            expectApprox(m.clone().inverse().inverse(), elementsOf(m));
        });
    });

    describe("setInverseOrthonormal", () => {
        it("negates a pure translation and returns itself", () => {
            const out = new Mat3x4();
            const result = out.setInverseOrthonormal(translation(1, -2, 3));
            expect(result).toBe(out);
            expect(elementsOf(out).map((x) => x + 0)).toEqual(elementsOf(translation(-1, 2, -3)));
        });

        it("transposes a pure rotation", () => {
            expect(elementsOf(new Mat3x4().setInverseOrthonormal(rotationZ90())).map((x) => x + 0)).toEqual(
                elementsOf(rotationZ90().transposeLinear()),
            );
        });

        it("rotates the negated translation by the inverse rotation", () => {
            // rotZ90 then translate (1, 0, 0): inverse translates by -(1, 0, 0), then rotates by -90°.
            const m = translation(1, 0, 0).multiply(rotationZ90());
            expect(elementsOf(new Mat3x4().setInverseOrthonormal(m)).map((x) => x + 0)).toEqual([
                0, 1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0,
            ]);
        });

        it("produces the identity when multiplied by the original on either side", () => {
            const m = sampleRigid();
            const inv = new Mat3x4().setInverseOrthonormal(m);
            expectApprox(new Mat3x4().multiplyMatrices(m, inv), IDENTITY);
            expectApprox(new Mat3x4().multiplyMatrices(inv, m), IDENTITY);
        });

        it("does not modify the operand", () => {
            const m = sampleRigid();
            new Mat3x4().setInverseOrthonormal(m);
            expect(elementsOf(m)).toEqual(elementsOf(sampleRigid()));
        });
    });

    describe("inverseOrthonormal", () => {
        it("inverts in place and returns itself", () => {
            const m = sampleRigid();
            const result = m.inverseOrthonormal();
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(new Mat3x4().setInverseOrthonormal(sampleRigid())));
        });

        it("restores the original when applied twice", () => {
            expectApprox(sampleRigid().inverseOrthonormal().inverseOrthonormal(), elementsOf(sampleRigid()));
        });
    });

    describe("clone", () => {
        it("creates an equal, independent instance", () => {
            const a = sample();
            const b = a.clone();
            expect(b).not.toBe(a);
            expect(b.elements).not.toBe(a.elements);
            expect(elementsOf(b)).toEqual(elementsOf(a));
            b.elements[3] = 42;
            expect(a.elements[3]).toBe(4);
        });
    });

    describe("point and direction transforms", () => {
        // Rotate 90° about Z, then translate by (1, 2, 3).
        const placed = () => translation(1, 2, 3).multiply(rotationZ90());

        describe("transformPoint", () => {
            it("applies the 3×3 part, then the translation", () => {
                expectVec(placed().transformPoint(new Vec3(1, 0, 0)), 1, 3, 3);
                expectVec(sample().transformPoint(new Vec3(1, 2, 3)), 18, 46, 74);
            });

            it("writes into out and returns it", () => {
                const out = new Vec3(9, 9, 9);
                expect(placed().transformPoint(new Vec3(1, 0, 0), out)).toBe(out);
                expectVec(out, 1, 3, 3);
            });

            it("allocates a new vector when out is omitted", () => {
                const p = new Vec3(1, 0, 0);
                expect(placed().transformPoint(p)).not.toBe(p);
                expectVec(p, 1, 0, 0);
            });

            it("transforms in place when out is p", () => {
                const p = new Vec3(1, 0, 0);
                placed().transformPoint(p, p);
                expectVec(p, 1, 3, 3);
            });
        });

        describe("transformDirection", () => {
            it("ignores the translation", () => {
                expectVec(placed().transformDirection(new Vec3(1, 0, 0)), 0, 1, 0);
                expectVec(sample().transformDirection(new Vec3(1, 2, 3)), 14, 38, 62);
            });

            it("transforms in place when out is d", () => {
                const d = new Vec3(1, 0, 0);
                expect(placed().transformDirection(d, d)).toBe(d);
                expectVec(d, 0, 1, 0);
            });
        });

        describe("transformInversePoint", () => {
            it("undoes the translation, then the rotation", () => {
                expectVec(placed().transformInversePoint(new Vec3(1, 3, 3)), 1, 0, 0);
            });

            it("round-trips with transformPoint", () => {
                const m = sampleRigid();
                const p = m.transformPoint(new Vec3(-2, 0.5, 7));
                expectVec(m.transformInversePoint(p), -2, 0.5, 7);
            });

            it("matches transformPoint with the inverse transform", () => {
                const m = sampleRigid();
                const p = new Vec3(-2, 0.5, 7);
                const expected = new Mat3x4().setInverse(m).transformPoint(p);
                expectVec(m.transformInversePoint(p), expected.x, expected.y, expected.z);
            });

            it("transforms in place when out is p", () => {
                const p = new Vec3(1, 3, 3);
                expect(placed().transformInversePoint(p, p)).toBe(p);
                expectVec(p, 1, 0, 0);
            });
        });

        describe("transformInverseDirection", () => {
            it("undoes the rotation and ignores the translation", () => {
                expectVec(placed().transformInverseDirection(new Vec3(0, 1, 0)), 1, 0, 0);
            });

            it("round-trips with transformDirection", () => {
                const m = sampleRigid();
                const d = m.transformDirection(new Vec3(-2, 0.5, 7));
                expectVec(m.transformInverseDirection(d), -2, 0.5, 7);
            });

            it("transforms in place when out is d", () => {
                const d = new Vec3(0, 1, 0);
                expect(placed().transformInverseDirection(d, d)).toBe(d);
                expectVec(d, 1, 0, 0);
            });
        });

        it("does not modify the transform", () => {
            const m = placed();
            const v = new Vec3(1, 2, 3);
            m.transformPoint(v);
            m.transformDirection(v);
            m.transformInversePoint(v);
            m.transformInverseDirection(v);
            expect(elementsOf(m)).toEqual(elementsOf(placed()));
        });
    });
});
