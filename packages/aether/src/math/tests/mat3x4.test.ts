import { describe, expect, it } from "vitest";
import { Mat3x3 } from "../geometry/mat3x3";
import { Mat3x4 } from "../geometry/mat3x4";
import { Quaternion } from "../geometry/quaternion";
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
        c + x * x * k,
        x * y * k - z * s,
        x * z * k + y * s,
        tx,
        y * x * k + z * s,
        c + y * y * k,
        y * z * k - x * s,
        ty,
        z * x * k - y * s,
        z * y * k + x * s,
        c + z * z * k,
        tz,
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

    describe("multiplyScalar", () => {
        it("multiplies every element, including translation, by k and returns itself", () => {
            const m = sample();
            const result = m.multiplyScalar(2);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
        });

        it("leaves the transform unchanged for k = 1", () => {
            expect(elementsOf(sample().multiplyScalar(1))).toEqual(elementsOf(sample()));
        });

        it("produces the zero transform for k = 0", () => {
            expect(elementsOf(sample().multiplyScalar(0))).toEqual([
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            ]);
        });

        it("turns the identity into a uniform scale", () => {
            expect(elementsOf(new Mat3x4().multiplyScalar(3))).toEqual(
                elementsOf(new Mat3x4().setScale(3)),
            );
        });

        it("scales the determinant by k³", () => {
            const m = sampleRigid();
            expect(
                approxEqual(m.clone().multiplyScalar(2).determinant(), 8 * m.determinant()),
            ).toBe(true);
        });

        it("scales transformed points by k", () => {
            const p = new Vec3(1, 2, 3);
            const expected = sampleRigid().transformPoint(p).scale(2);
            expectVec(
                sampleRigid().multiplyScalar(2).transformPoint(p),
                expected.x,
                expected.y,
                expected.z,
            );
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
            expect(elementsOf(out)).toEqual([
                40, 34, 28, 26, 136, 118, 100, 90, 232, 202, 172, 154,
            ]);
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
                elementsOf(
                    new Mat3x4().setInverse(new Mat3x4(2, 0, 0, 4, 0, 4, 0, 8, 0, 0, 8, 16)),
                ),
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
            expect(
                elementsOf(new Mat3x4().setInverseOrthonormal(rotationZ90())).map((x) => x + 0),
            ).toEqual(elementsOf(rotationZ90().transposeLinear()));
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
            expect(elementsOf(m)).toEqual(
                elementsOf(new Mat3x4().setInverseOrthonormal(sampleRigid())),
            );
        });

        it("restores the original when applied twice", () => {
            expectApprox(
                sampleRigid().inverseOrthonormal().inverseOrthonormal(),
                elementsOf(sampleRigid()),
            );
        });
    });

    describe("setScale", () => {
        it("overwrites every element, clearing translation, and returns itself", () => {
            const m = sample();
            const result = m.setScale(2, 3, 4);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0]);
        });

        it("scales uniformly when given one factor", () => {
            expect(elementsOf(new Mat3x4().setScale(3))).toEqual([
                3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0,
            ]);
        });

        it("is the identity for a factor of 1", () => {
            expect(elementsOf(sample().setScale(1))).toEqual(IDENTITY);
        });

        it("scales points about the origin", () => {
            expectVec(new Mat3x4().setScale(2, 3, 4).transformPoint(new Vec3(1, 2, 3)), 2, 6, 12);
        });

        it("has the product of its factors as its determinant", () => {
            expect(new Mat3x4().setScale(2, 3, 4).determinant()).toBe(24);
        });

        it("is inverted by the reciprocal factors", () => {
            // Approximate: the inverted translation comes out as -0.
            expectApprox(
                new Mat3x4().setScale(2, 4, 8).inverse(),
                elementsOf(new Mat3x4().setScale(0.5, 0.25, 0.125)),
            );
        });

        it("scales before translating when post-multiplied onto a translation", () => {
            // T · S: scale about the origin, then move.
            const m = translation(10, 20, 30).multiply(new Mat3x4().setScale(2));
            expectVec(m.transformPoint(new Vec3(1, 2, 3)), 12, 24, 36);
        });
    });

    describe("setScaleAlongAxis", () => {
        const axis = new Vec3(1, 2, 3).normalize();
        const scaling = (k: number) => new Mat3x4().setScaleAlongAxis(axis, k);

        it("overwrites every element, clearing translation, and returns itself", () => {
            const m = sample();
            const result = m.setScaleAlongAxis(axis, 3);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(scaling(3)));
            expect([m.elements[3], m.elements[7], m.elements[11]]).toEqual([0, 0, 0]);
        });

        it("matches Mat3x3.setScaleAlongAxis in its linear part", () => {
            expect(elementsOf(scaling(3))).toEqual(
                elementsOf(new Mat3x4().setFromMat3x3(new Mat3x3().setScaleAlongAxis(axis, 3))),
            );
        });

        it.each([
            ["X", new Vec3(1, 0, 0), [3, 1, 1]],
            ["Y", new Vec3(0, 1, 0), [1, 3, 1]],
            ["Z", new Vec3(0, 0, 1), [1, 1, 3]],
        ] as const)("matches setScale along the %s axis", (_, cardinal, f) => {
            expect(elementsOf(new Mat3x4().setScaleAlongAxis(cardinal, 3))).toEqual(
                elementsOf(new Mat3x4().setScale(f[0], f[1], f[2])),
            );
        });

        it("scales points on the axis by k and fixes points on the perpendicular plane", () => {
            expectVec(scaling(3).transformPoint(axis), 3 * axis.x, 3 * axis.y, 3 * axis.z);
            expectVec(scaling(3).transformPoint(new Vec3(3, 0, -1)), 3, 0, -1);
        });

        it("has determinant k", () => {
            expect(approxEqual(scaling(3).determinant(), 3)).toBe(true);
        });

        it("is inverted by the reciprocal factor", () => {
            expectApprox(scaling(4).inverse(), elementsOf(scaling(0.25)));
        });

        it("is the identity for k = 1", () => {
            expectApprox(scaling(1), IDENTITY);
        });
    });

    describe("setReflection", () => {
        const normal = new Vec3(1, 2, 3).normalize();
        const reflection = () => new Mat3x4().setReflection(normal);

        it("overwrites every element and returns itself", () => {
            const m = sample();
            const result = m.setReflection(normal);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(reflection()));
        });

        it("matches setScaleAlongAxis with k = -1", () => {
            expect(elementsOf(reflection())).toEqual(
                elementsOf(new Mat3x4().setScaleAlongAxis(normal, -1)),
            );
        });

        it.each([
            ["X", new Vec3(1, 0, 0), [-1, 1, 1]],
            ["Y", new Vec3(0, 1, 0), [1, -1, 1]],
            ["Z", new Vec3(0, 0, 1), [1, 1, -1]],
        ] as const)("negates only the %s coordinate for that cardinal normal", (_, n, f) => {
            // Approximate: the off-diagonal entries come out as -0.
            expectApprox(
                new Mat3x4().setReflection(n),
                elementsOf(new Mat3x4().setScale(f[0], f[1], f[2])),
            );
        });

        it("negates the normal and fixes vectors in the plane", () => {
            expectVec(reflection().transformPoint(normal), -normal.x, -normal.y, -normal.z);
            expectVec(reflection().transformPoint(new Vec3(3, 0, -1)), 3, 0, -1);
        });

        it("is its own inverse", () => {
            const m = reflection();
            expectApprox(m.clone().multiply(m), IDENTITY);
        });

        it("is orthogonal with determinant -1", () => {
            const m = reflection();
            expect(approxEqual(m.determinant(), -1)).toBe(true);
            expectApprox(m.clone().transposeLinear().multiply(m), IDENTITY);
        });

        it("ignores the sign of the normal", () => {
            const flipped = new Vec3(-normal.x, -normal.y, -normal.z);
            expect(elementsOf(new Mat3x4().setReflection(flipped))).toEqual(
                elementsOf(reflection()),
            );
        });
    });

    describe("setShear", () => {
        it("overwrites every element and returns itself", () => {
            const m = sample();
            const result = m.setShear(1, 2, 3, 4, 5, 6);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([1, 1, 2, 0, 3, 1, 4, 0, 5, 6, 1, 0]);
        });

        it("is the identity with no arguments", () => {
            expect(elementsOf(sample().setShear())).toEqual(IDENTITY);
        });

        it("offsets each coordinate by the others", () => {
            const r = new Mat3x4().setShear(1, 2, 3, 4, 5, 6).transformPoint(new Vec3(1, 2, 3));
            // x + 1·y + 2·z, y + 3·x + 4·z, z + 5·x + 6·y
            expect([r.x, r.y, r.z]).toEqual([9, 17, 20]);
        });

        it("shears X by Y only when given one factor", () => {
            const m = new Mat3x4().setShear(2);
            const r = m.transformPoint(new Vec3(1, 3, 5));
            expect([r.x, r.y, r.z]).toEqual([7, 3, 5]);
        });

        it("leaves points on the shearing axis fixed", () => {
            // Shearing X by Y moves nothing with y = 0.
            const r = new Mat3x4().setShear(2).transformPoint(new Vec3(4, 0, -1));
            expect([r.x, r.y, r.z]).toEqual([4, 0, -1]);
        });

        it("preserves volume when shearing one coordinate by both others", () => {
            expect(new Mat3x4().setShear(2, 3).determinant()).toBe(1);
            expect(new Mat3x4().setShear(0, 0, 0, 0, 4, 5).determinant()).toBe(1);
        });

        it("preserves volume for one-directional shears across axes", () => {
            // Upper triangular: x by y and z, y by z.
            expect(new Mat3x4().setShear(2, 3, 0, 4).determinant()).toBe(1);
        });

        it("has the documented determinant for a general shear", () => {
            const [xy, xz, yx, yz, zx, zy] = [1, 2, 3, 4, 5, 6];
            expect(new Mat3x4().setShear(xy, xz, yx, yz, zx, zy).determinant()).toBe(
                1 - xy * yx - xz * zx - yz * zy + xy * yz * zx + xz * zy * yx,
            );
        });

        it("is inverted by the negated factor for a single shear", () => {
            expectApprox(
                new Mat3x4().setShear(0, 0, 0, 2.5).inverse(),
                elementsOf(new Mat3x4().setShear(0, 0, 0, -2.5)),
            );
        });
    });

    describe("setTranslation", () => {
        it("overwrites every element with a pure translation and returns itself", () => {
            const m = sample();
            const result = m.setTranslation(3, -2, 5);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(translation(3, -2, 5)));
        });

        it("moves points but not directions", () => {
            const m = new Mat3x4().setTranslation(3, -2, 5);
            expectVec(m.transformPoint(new Vec3(1, 2, 3)), 4, 0, 8);
            expectVec(m.transformDirection(new Vec3(1, 2, 3)), 1, 2, 3);
        });

        it("is inverted by the opposite translation", () => {
            expectApprox(
                new Mat3x4().setTranslation(3, -2, 5).inverse(),
                elementsOf(new Mat3x4().setTranslation(-3, 2, -5)),
            );
        });

        it("is the identity for a zero translation", () => {
            expect(elementsOf(sample().setTranslation(0, 0, 0))).toEqual(IDENTITY);
        });
    });

    describe("getTranslation", () => {
        it("reads the translation column", () => {
            const t = sample().getTranslation();
            expect([t.x, t.y, t.z]).toEqual([4, 8, 12]);
        });

        it("is where the transform sends the origin", () => {
            const m = sampleRigid();
            const t = m.getTranslation();
            const o = m.transformPoint(new Vec3(0, 0, 0));
            expect([t.x, t.y, t.z]).toEqual([o.x, o.y, o.z]);
        });

        it("writes into and returns out when given", () => {
            const out = new Vec3();
            expect(sample().getTranslation(out)).toBe(out);
        });
    });

    describe("setFromMat3x3", () => {
        const linear = () => new Mat3x3(1, 2, 3, 4, 5, 6, 7, 8, 9);

        it("places the linear part and translation and returns itself", () => {
            const m = new Mat3x4();
            const result = m.setFromMat3x3(linear(), new Vec3(10, 11, 12));
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual([1, 2, 3, 10, 4, 5, 6, 11, 7, 8, 9, 12]);
        });

        it("defaults to a zero translation, overwriting any existing one", () => {
            expect(elementsOf(sample().setFromMat3x3(linear()))).toEqual([
                1, 2, 3, 0, 4, 5, 6, 0, 7, 8, 9, 0,
            ]);
        });

        it("matches the Mat3x4 rotation for a Mat3x3 rotation", () => {
            expect(elementsOf(new Mat3x4().setFromMat3x3(new Mat3x3().setRotationZ(0.7)))).toEqual(
                elementsOf(new Mat3x4().setRotationZ(0.7)),
            );
        });

        it("transforms points as m·p + t", () => {
            const m = new Mat3x4().setFromMat3x3(linear(), new Vec3(10, 11, 12));
            const v = linear().transformVec3(new Vec3(1, -1, 2));
            expectVec(m.transformPoint(new Vec3(1, -1, 2)), v.x + 10, v.y + 11, v.z + 12);
        });
    });

    describe("getMat3x3", () => {
        it("extracts the linear part, dropping the translation", () => {
            expect(Array.from(sample().getMat3x3().elements)).toEqual([
                1, 2, 3, 5, 6, 7, 9, 10, 11,
            ]);
        });

        it("writes into and returns out when given", () => {
            const out = new Mat3x3();
            expect(sample().getMat3x3(out)).toBe(out);
        });

        it("round-trips with setFromMat3x3", () => {
            const m = sample();
            const back = new Mat3x4().setFromMat3x3(m.getMat3x3(), m.getTranslation());
            expect(elementsOf(back)).toEqual(elementsOf(m));
        });

        it("has the same determinant as the transform", () => {
            const m = sampleRigid();
            expect(m.getMat3x3().determinant()).toBe(m.determinant());
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

    describe.each([
        // [method, axis, a, b]: a 90° rotation about axis takes a → b.
        ["setRotationX", new Vec3(1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, 0, 1)],
        ["setRotationY", new Vec3(0, 1, 0), new Vec3(0, 0, 1), new Vec3(1, 0, 0)],
        ["setRotationZ", new Vec3(0, 0, 1), new Vec3(1, 0, 0), new Vec3(0, 1, 0)],
    ] as const)("%s", (method, axis, a, b) => {
        const rotation = (theta: number) => new Mat3x4()[method](theta);

        it("overwrites every element, clearing translation, and returns itself", () => {
            const m = sample();
            const result = m[method](0.7);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(rotation(0.7)));
        });

        it("rotates a 90° turn right-handed about the axis", () => {
            const m = rotation(Math.PI / 2);
            const r1 = m.transformPoint(a);
            expectVec(r1, b.x, b.y, b.z);
            const r2 = m.transformPoint(b);
            expectVec(r2, -a.x, -a.y, -a.z);
        });

        it("leaves the axis unchanged", () => {
            expectVec(rotation(0.7).transformPoint(axis), axis.x, axis.y, axis.z);
        });

        it("matches the general axis-angle rotation", () => {
            expectApprox(rotation(0.7), elementsOf(rigid(axis.x, axis.y, axis.z, 0.7, 0, 0, 0)));
        });

        it("is inverted orthonormally by the opposite angle", () => {
            expectApprox(rotation(0.7).inverseOrthonormal(), elementsOf(rotation(-0.7)));
        });

        it("has determinant 1", () => {
            expect(approxEqual(rotation(0.7).determinant(), 1)).toBe(true);
        });

        it("adds angles under composition", () => {
            expectApprox(rotation(0.3).multiply(rotation(0.4)), elementsOf(rotation(0.7)));
        });
    });

    it("setRotationZ(90°) matches the rotationZ90 fixture", () => {
        expectApprox(new Mat3x4().setRotationZ(Math.PI / 2), elementsOf(rotationZ90()));
    });

    describe("setFromAxisAngle", () => {
        const axis = new Vec3(1, 2, 3).normalize();
        const rotation = (theta: number) => new Mat3x4().setFromAxisAngle(axis, theta);

        it("overwrites every element, clearing translation, and returns itself", () => {
            const m = sample();
            const result = m.setFromAxisAngle(axis, 0.7);
            expect(result).toBe(m);
            expect(elementsOf(m)).toEqual(elementsOf(rotation(0.7)));
            expect([m.elements[3], m.elements[7], m.elements[11]]).toEqual([0, 0, 0]);
        });

        it("matches the general rigid transform with no translation", () => {
            expectApprox(rotation(0.7), elementsOf(rigid(axis.x, axis.y, axis.z, 0.7, 0, 0, 0)));
        });

        it.each([
            ["setRotationX", new Vec3(1, 0, 0)],
            ["setRotationY", new Vec3(0, 1, 0)],
            ["setRotationZ", new Vec3(0, 0, 1)],
        ] as const)("matches %s for its cardinal axis", (method, cardinal) => {
            expectApprox(
                new Mat3x4().setFromAxisAngle(cardinal, 0.7),
                elementsOf(new Mat3x4()[method](0.7)),
            );
        });

        it("leaves points on the axis unchanged", () => {
            const p = axis.clone().scale(4);
            expectVec(rotation(0.7).transformPoint(p), p.x, p.y, p.z);
        });

        it("turns a perpendicular vector a quarter turn onto axis × v", () => {
            const v = new Vec3(3, 0, -1).normalize(); // v · axis = 0
            const expected = Vec3.cross(axis, v);
            expectVec(
                rotation(Math.PI / 2).transformDirection(v),
                expected.x,
                expected.y,
                expected.z,
            );
        });

        it("is inverted orthonormally by the opposite angle", () => {
            expectApprox(rotation(0.7).inverseOrthonormal(), elementsOf(rotation(-0.7)));
        });

        it("has determinant 1", () => {
            expect(approxEqual(rotation(0.7).determinant(), 1)).toBe(true);
        });

        it("adds angles under composition about the same axis", () => {
            expectApprox(rotation(0.3).multiply(rotation(0.4)), elementsOf(rotation(0.7)));
        });
    });

    describe("getAxis", () => {
        it("reads each column of the transform", () => {
            const m = sample();
            expectVec(m.getAxis(0), 1, 5, 9);
            expectVec(m.getAxis(1), 2, 6, 10);
            expectVec(m.getAxis(2), 3, 7, 11);
            expectVec(m.getAxis(3), 4, 8, 12);
        });

        it("gives the rotated basis axes for a rotation", () => {
            const m = rotationZ90();
            expectVec(m.getAxis(0), 0, 1, 0);
            expectVec(m.getAxis(1), -1, 0, 0);
            expectVec(m.getAxis(2), 0, 0, 1);
        });

        it("matches transformDirection of the basis vectors", () => {
            const m = sampleRigid();
            const expected = m.transformDirection(new Vec3(0, 1, 0));
            expectVec(m.getAxis(1), expected.x, expected.y, expected.z);
        });

        it("matches getTranslation for column 3", () => {
            const m = sampleRigid();
            const t = m.getTranslation();
            expectVec(m.getAxis(3), t.x, t.y, t.z);
        });

        it("writes to out and returns it", () => {
            const out = new Vec3();
            expect(sample().getAxis(2, out)).toBe(out);
            expectVec(out, 3, 7, 11);
        });
    });

    describe("setFromPositionQuaternion", () => {
        const q = new Quaternion().setFromAxisAngle(new Vec3(AXIS, AXIS, AXIS), 0.7);
        const p = new Vec3(3, -2, 5);

        it("matches the same rotation and translation built directly", () => {
            expectApprox(new Mat3x4().setFromPositionQuaternion(p, q), elementsOf(sampleRigid()));
        });

        it("gives the identity for a zero position and the identity quaternion", () => {
            expectApprox(
                sample().setFromPositionQuaternion(new Vec3(), new Quaternion()),
                IDENTITY,
            );
        });

        it("has the linear part of Mat3x3.setFromQuaternion and the translation p", () => {
            const m = new Mat3x4().setFromPositionQuaternion(p, q);
            const linear = new Mat3x3().setFromQuaternion(q);
            expect(Array.from(m.getMat3x3().elements)).toEqual(Array.from(linear.elements));
            expectVec(m.getTranslation(), 3, -2, 5);
        });

        it("transforms points as q.rotateVec3(x) + p", () => {
            const x = new Vec3(0.4, -1.5, 2.2);
            const expected = q.rotateVec3(x).add(p);
            const actual = new Mat3x4().setFromPositionQuaternion(p, q).transformPoint(x);
            expectVec(actual, expected.x, expected.y, expected.z);
        });

        it("round-trips points through transformInversePoint", () => {
            const m = new Mat3x4().setFromPositionQuaternion(p, q);
            const x = new Vec3(0.4, -1.5, 2.2);
            expectVec(m.transformInversePoint(m.transformPoint(x)), x.x, x.y, x.z);
        });

        it("accepts any Vec3Like and QuatLike", () => {
            const m = new Mat3x4().setFromPositionQuaternion(
                { x: p.x, y: p.y, z: p.z },
                { w: q.w, x: q.x, y: q.y, z: q.z },
            );
            expectApprox(m, elementsOf(sampleRigid()));
        });

        it("returns itself", () => {
            const m = new Mat3x4();
            expect(m.setFromPositionQuaternion(p, q)).toBe(m);
        });
    });
});
