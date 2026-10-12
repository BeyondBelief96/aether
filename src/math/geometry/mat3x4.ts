import type { Vec3Like } from "../types";
import { Vec3 } from "./vec3";

const IDENTITY = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);

/**
 * A 3×4 affine transform: a 3×3 linear part with a translation column, stored row-major.
 *
 * Behaves as a 4×4 matrix whose implicit bottom row is `[0, 0, 0, 1]`.
 */
export class Mat3x4 {
    readonly elements: Float64Array;

    constructor(
        m00 = 1,
        m01 = 0,
        m02 = 0,
        m03 = 0,
        m10 = 0,
        m11 = 1,
        m12 = 0,
        m13 = 0,
        m20 = 0,
        m21 = 0,
        m22 = 1,
        m23 = 0,
    ) {
        this.elements = new Float64Array([
            m00,
            m01,
            m02,
            m03,
            m10,
            m11,
            m12,
            m13,
            m20,
            m21,
            m22,
            m23,
        ]);
    }

    identity(): this {
        this.elements.set(IDENTITY);
        return this;
    }

    copy(m: Mat3x4): this {
        this.elements.set(m.elements);
        return this;
    }

    clone(): Mat3x4 {
        return new Mat3x4().copy(this);
    }

    /**
     * Post-multiplies this transform by `m`: `this = this · m`.
     *
     * Under the column-vector convention, the result applies `m` first, then this.
     *
     * @param m Right-hand operand. May be `this`.
     */
    multiply(m: Mat3x4): this {
        return this.multiplyMatrices(this, m);
    }

    /**
     * Pre-multiplies this transform by `m`: `this = m · this`.
     *
     * Under the column-vector convention, the result applies this first, then `m`.
     *
     * @param m Left-hand operand. May be `this`.
     */
    premultiply(m: Mat3x4): this {
        return this.multiplyMatrices(m, this);
    }

    /**
     * Sets this transform to `a · b`.
     *
     * @param a Left-hand operand. May be `this`.
     * @param b Right-hand operand. May be `this`.
     */
    multiplyMatrices(a: Mat3x4, b: Mat3x4): this {
        const ea = a.elements;
        const eb = b.elements;

        const a00 = ea[0]!,
            a01 = ea[1]!,
            a02 = ea[2]!,
            a03 = ea[3]!;
        const a10 = ea[4]!,
            a11 = ea[5]!,
            a12 = ea[6]!,
            a13 = ea[7]!;
        const a20 = ea[8]!,
            a21 = ea[9]!,
            a22 = ea[10]!,
            a23 = ea[11]!;

        const b00 = eb[0]!,
            b01 = eb[1]!,
            b02 = eb[2]!,
            b03 = eb[3]!;
        const b10 = eb[4]!,
            b11 = eb[5]!,
            b12 = eb[6]!,
            b13 = eb[7]!;
        const b20 = eb[8]!,
            b21 = eb[9]!,
            b22 = eb[10]!,
            b23 = eb[11]!;

        const e = this.elements;

        e[0] = a00 * b00 + a01 * b10 + a02 * b20;
        e[1] = a00 * b01 + a01 * b11 + a02 * b21;
        e[2] = a00 * b02 + a01 * b12 + a02 * b22;
        e[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03;

        e[4] = a10 * b00 + a11 * b10 + a12 * b20;
        e[5] = a10 * b01 + a11 * b11 + a12 * b21;
        e[6] = a10 * b02 + a11 * b12 + a12 * b22;
        e[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13;

        e[8] = a20 * b00 + a21 * b10 + a22 * b20;
        e[9] = a20 * b01 + a21 * b11 + a22 * b21;
        e[10] = a20 * b02 + a21 * b12 + a22 * b22;
        e[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23;

        return this;
    }

    /**
     * Transposes the 3×3 linear part in place. The translation column is unchanged.
     *
     * The full 3×4 transpose is 4×3 and has no in-place equivalent.
     */
    transposeLinear(): this {
        const e = this.elements;
        const a01 = e[1]!,
            a02 = e[2]!;
        const a10 = e[4]!,
            a12 = e[6]!;
        const a20 = e[8]!,
            a21 = e[9]!;

        e[1] = a10;
        e[2] = a20;
        e[4] = a01;
        e[6] = a21;
        e[8] = a02;
        e[9] = a12;
        return this;
    }

    /**
     * Determinant of the 3×3 linear part, which equals that of the full 4×4 transform.
     */
    determinant(): number {
        const e = this.elements;
        const a00 = e[0]!,
            a01 = e[1]!,
            a02 = e[2]!;
        const a10 = e[4]!,
            a11 = e[5]!,
            a12 = e[6]!;
        const a20 = e[8]!,
            a21 = e[9]!,
            a22 = e[10]!;

        return (
            a00 * (a11 * a22 - a12 * a21) +
            a01 * (a12 * a20 - a10 * a22) +
            a02 * (a10 * a21 - a11 * a20)
        );
    }

    /**
     * Sets this transform to the inverse of `m`, or to zero if `m` is singular.
     *
     * @param m Transform to invert. May be `this`.
     */
    setInverse(m: Mat3x4): this {
        const s = m.elements;
        const a00 = s[0]!,
            a01 = s[1]!,
            a02 = s[2]!,
            tx = s[3]!;
        const a10 = s[4]!,
            a11 = s[5]!,
            a12 = s[6]!,
            ty = s[7]!;
        const a20 = s[8]!,
            a21 = s[9]!,
            a22 = s[10]!,
            tz = s[11]!;

        const c00 = a11 * a22 - a12 * a21;
        const c01 = a12 * a20 - a10 * a22;
        const c02 = a10 * a21 - a11 * a20;
        const det = a00 * c00 + a01 * c01 + a02 * c02;

        const e = this.elements;
        if (det === 0) {
            e.fill(0);
            return this;
        }
        const invDet = 1 / det;

        const i00 = c00 * invDet;
        const i01 = (a02 * a21 - a01 * a22) * invDet;
        const i02 = (a01 * a12 - a02 * a11) * invDet;
        const i10 = c01 * invDet;
        const i11 = (a00 * a22 - a02 * a20) * invDet;
        const i12 = (a02 * a10 - a00 * a12) * invDet;
        const i20 = c02 * invDet;
        const i21 = (a01 * a20 - a00 * a21) * invDet;
        const i22 = (a00 * a11 - a01 * a10) * invDet;

        e[0] = i00;
        e[1] = i01;
        e[2] = i02;
        e[3] = -(i00 * tx + i01 * ty + i02 * tz);

        e[4] = i10;
        e[5] = i11;
        e[6] = i12;
        e[7] = -(i10 * tx + i11 * ty + i12 * tz);

        e[8] = i20;
        e[9] = i21;
        e[10] = i22;
        e[11] = -(i20 * tx + i21 * ty + i22 * tz);

        return this;
    }

    /**
     * Inverts this transform in place, or sets it to zero if it is singular.
     */
    inverse(): this {
        return this.setInverse(this);
    }

    /**
     * Sets this transform to the inverse of `r`, assuming its 3×3 part is orthonormal.
     *
     * Computes `[Rᵀ | −Rᵀt]`. The result is undefined if `r` contains scale or shear.
     *
     * @param r Transform to invert. May be `this`.
     */
    setInverseOrthonormal(r: Mat3x4): this {
        const s = r.elements;
        const r00 = s[0]!,
            r01 = s[1]!,
            r02 = s[2]!,
            tx = s[3]!;
        const r10 = s[4]!,
            r11 = s[5]!,
            r12 = s[6]!,
            ty = s[7]!;
        const r20 = s[8]!,
            r21 = s[9]!,
            r22 = s[10]!,
            tz = s[11]!;

        const e = this.elements;

        e[0] = r00;
        e[1] = r10;
        e[2] = r20;
        e[3] = -(r00 * tx + r10 * ty + r20 * tz);

        e[4] = r01;
        e[5] = r11;
        e[6] = r21;
        e[7] = -(r01 * tx + r11 * ty + r21 * tz);

        e[8] = r02;
        e[9] = r12;
        e[10] = r22;
        e[11] = -(r02 * tx + r12 * ty + r22 * tz);

        return this;
    }

    /**
     * Inverts this transform in place, assuming its 3×3 part is orthonormal.
     */
    inverseOrthonormal(): this {
        return this.setInverseOrthonormal(this);
    }

    /**
     * Transforms a point: `R·p + t`.
     *
     * @param p Point to transform.
     * @param out Destination. Allocated if omitted. May be `p`.
     */
    transformPoint(p: Vec3Like, out: Vec3 = new Vec3()): Vec3 {
        const e = this.elements;
        const x = p.x,
            y = p.y,
            z = p.z;

        out.x = e[0]! * x + e[1]! * y + e[2]! * z + e[3]!;
        out.y = e[4]! * x + e[5]! * y + e[6]! * z + e[7]!;
        out.z = e[8]! * x + e[9]! * y + e[10]! * z + e[11]!;
        return out;
    }

    /**
     * Transforms a direction by the 3×3 part only: `R·d`. Translation is ignored.
     *
     * @param d Direction to transform.
     * @param out Destination. Allocated if omitted. May be `d`.
     */
    transformDirection(d: Vec3Like, out: Vec3 = new Vec3()): Vec3 {
        const e = this.elements;
        const x = d.x,
            y = d.y,
            z = d.z;

        out.x = e[0]! * x + e[1]! * y + e[2]! * z;
        out.y = e[4]! * x + e[5]! * y + e[6]! * z;
        out.z = e[8]! * x + e[9]! * y + e[10]! * z;
        return out;
    }

    /**
     * Applies the inverse transform to a point, `Rᵀ·(p − t)`, without building the inverse.
     *
     * Assumes the 3×3 part is orthonormal.
     *
     * @param p Point to transform.
     * @param out Destination. Allocated if omitted. May be `p`.
     */
    transformInversePoint(p: Vec3Like, out: Vec3 = new Vec3()): Vec3 {
        const e = this.elements;
        const x = p.x - e[3]!,
            y = p.y - e[7]!,
            z = p.z - e[11]!;

        out.x = e[0]! * x + e[4]! * y + e[8]! * z;
        out.y = e[1]! * x + e[5]! * y + e[9]! * z;
        out.z = e[2]! * x + e[6]! * y + e[10]! * z;
        return out;
    }

    /**
     * Applies the inverse of the 3×3 part to a direction, `Rᵀ·d`, without building the inverse.
     *
     * Assumes the 3×3 part is orthonormal.
     *
     * @param d Direction to transform.
     * @param out Destination. Allocated if omitted. May be `d`.
     */
    transformInverseDirection(d: Vec3Like, out: Vec3 = new Vec3()): Vec3 {
        const e = this.elements;
        const x = d.x,
            y = d.y,
            z = d.z;

        out.x = e[0]! * x + e[4]! * y + e[8]! * z;
        out.y = e[1]! * x + e[5]! * y + e[9]! * z;
        out.z = e[2]! * x + e[6]! * y + e[10]! * z;
        return out;
    }
}
