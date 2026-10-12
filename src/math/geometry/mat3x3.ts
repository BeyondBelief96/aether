import type { Vec3Like } from "../types";
import { Vec3 } from "./vec3";

const IDENTITY = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

export class Mat3x3 {
    readonly elements: Float64Array;

    constructor(
        m00 = 1,
        m01 = 0,
        m02 = 0,
        m10 = 0,
        m11 = 1,
        m12 = 0,
        m20 = 0,
        m21 = 0,
        m22 = 1,
    ) {
        this.elements = new Float64Array([
            m00,
            m01,
            m02,
            m10,
            m11,
            m12,
            m20,
            m21,
            m22,
        ]);
    }

    identity(): this {
        this.elements.set(IDENTITY);
        return this;
    }

    copy(m: Mat3x3): this {
        this.elements.set(m.elements);
        return this;
    }

    clone(): Mat3x3 {
        return new Mat3x3().copy(this);
    }

    setDiagonal(a: number, b: number, c: number): this {
        const e = this.elements;
        e[0] = a;
        e[1] = 0;
        e[2] = 0;
        e[3] = 0;
        e[4] = b;
        e[5] = 0;
        e[6] = 0;
        e[7] = 0;
        e[8] = c;
        return this;
    }

    /**
     * Scales every element of this matrix by the scaling factor `k`.
     * @param k The scaling factor.
     */
    scale(k: number): this {
        const e = this.elements;
        e[0] = k * e[0]!;
        e[1] = k * e[1]!;
        e[2] = k * e[2]!;
        e[3] = k * e[3]!;
        e[4] = k * e[4]!;
        e[5] = k * e[5]!;
        e[6] = k * e[6]!;
        e[7] = k * e[7]!;
        e[8] = k * e[8]!;

        return this;
    }

    /**
     * Post-multiplies this matrix by `m`: `this = this · m`.
     *
     * Under the column-vector convention, the result applies `m` first, then this.
     *
     * @param m Right-hand operand. May be `this`.
     */
    multiply(m: Mat3x3): this {
        return this.multiplyMatrices(this, m);
    }

    /**
     * Pre-multiplies this matrix by `m`: `this = m · this`.
     *
     * Under the column-vector convention, the result applies this first, then `m`.
     *
     * @param m Left-hand operand. May be `this`.
     */
    premultiply(m: Mat3x3): this {
        return this.multiplyMatrices(m, this);
    }

    /**
     * Sets this matrix to `a · b`.
     *
     * @param a Left-hand operand. May be `this`.
     * @param b Right-hand operand. May be `this`.
     */
    multiplyMatrices(a: Mat3x3, b: Mat3x3): this {
        const ea = a.elements;
        const eb = b.elements;

        const a00 = ea[0]!,
            a01 = ea[1]!,
            a02 = ea[2]!;
        const a10 = ea[3]!,
            a11 = ea[4]!,
            a12 = ea[5]!;
        const a20 = ea[6]!,
            a21 = ea[7]!,
            a22 = ea[8]!;

        const b00 = eb[0]!,
            b01 = eb[1]!,
            b02 = eb[2]!;
        const b10 = eb[3]!,
            b11 = eb[4]!,
            b12 = eb[5]!;
        const b20 = eb[6]!,
            b21 = eb[7]!,
            b22 = eb[8]!;

        const e = this.elements;

        e[0] = a00 * b00 + a01 * b10 + a02 * b20;
        e[1] = a00 * b01 + a01 * b11 + a02 * b21;
        e[2] = a00 * b02 + a01 * b12 + a02 * b22;

        e[3] = a10 * b00 + a11 * b10 + a12 * b20;
        e[4] = a10 * b01 + a11 * b11 + a12 * b21;
        e[5] = a10 * b02 + a11 * b12 + a12 * b22;

        e[6] = a20 * b00 + a21 * b10 + a22 * b20;
        e[7] = a20 * b01 + a21 * b11 + a22 * b21;
        e[8] = a20 * b02 + a21 * b12 + a22 * b22;

        return this;
    }

    transpose(): this {
        const e = this.elements;
        const a01 = e[1]!,
            a02 = e[2]!;
        const a10 = e[3]!,
            a12 = e[5]!;
        const a20 = e[6]!,
            a21 = e[7]!;

        e[1] = a10;
        e[2] = a20;
        e[3] = a01;
        e[5] = a21;
        e[6] = a02;
        e[7] = a12;
        return this;
    }

    determinant(): number {
        const e = this.elements;
        const a00 = e[0]!,
            a01 = e[1]!,
            a02 = e[2]!;
        const a10 = e[3]!,
            a11 = e[4]!,
            a12 = e[5]!;
        const a20 = e[6]!,
            a21 = e[7]!,
            a22 = e[8]!;

        return (
            a00 * (a11 * a22 - a12 * a21) +
            a01 * (a12 * a20 - a10 * a22) +
            a02 * (a10 * a21 - a11 * a20)
        );
    }

    /**
     * Sets this matrix to the inverse of `m`, or to zero if `m` is singular.
     *
     * @param m Matrix to invert. May be `this`.
     */
    setInverse(m: Mat3x3): this {
        const s = m.elements;
        const a00 = s[0]!,
            a01 = s[1]!,
            a02 = s[2]!;
        const a10 = s[3]!,
            a11 = s[4]!,
            a12 = s[5]!;
        const a20 = s[6]!,
            a21 = s[7]!,
            a22 = s[8]!;

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

        e[0] = c00 * invDet;
        e[1] = (a02 * a21 - a01 * a22) * invDet;
        e[2] = (a01 * a12 - a02 * a11) * invDet;
        e[3] = c01 * invDet;
        e[4] = (a00 * a22 - a02 * a20) * invDet;
        e[5] = (a02 * a10 - a00 * a12) * invDet;
        e[6] = c02 * invDet;
        e[7] = (a01 * a20 - a00 * a21) * invDet;
        e[8] = (a00 * a11 - a01 * a10) * invDet;
        return this;
    }

    /**
     * Set's this matrix to the inverse of itself. If the determinant is zero, set's this matrix to the zero matrix.
     */
    inverse(): this {
        return this.setInverse(this);
    }

    /**
     * Computes `this · v` and writes it to `out`.
     *
     * @param v Vector to transform.
     * @param out Destination. Allocated if omitted. May be `v`.
     */
    transformVec3(v: Vec3Like, out: Vec3 = new Vec3()): Vec3 {
        const e = this.elements;
        const x = v.x,
            y = v.y,
            z = v.z;

        out.x = e[0]! * x + e[1]! * y + e[2]! * z;
        out.y = e[3]! * x + e[4]! * y + e[5]! * z;
        out.z = e[6]! * x + e[7]! * y + e[8]! * z;
        return out;
    }
}
