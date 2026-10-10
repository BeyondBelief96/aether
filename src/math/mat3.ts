const IDENTITY = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

export class Mat3 {
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

    copy(m: Mat3): this {
        this.elements.set(m.elements);
        return this;
    }

    clone(): Mat3 {
        return new Mat3().copy(this);
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
     * Post-multiplies this matrix by `m`: `this = this · m`.
     *
     * Under the column-vector convention, the result applies `m` first, then this.
     *
     * @param m Right-hand operand. May be `this`.
     */
    multiply(m: Mat3): this {
        return this.multiplyMatrices(this, m);
    }

    /**
     * Pre-multiplies this matrix by `m`: `this = m · this`.
     *
     * Under the column-vector convention, the result applies this first, then `m`.
     *
     * @param m Left-hand operand. May be `this`.
     */
    premultiply(m: Mat3): this {
        return this.multiplyMatrices(m, this);
    }

    /**
     * Sets this matrix to `a · b`.
     *
     * @param a Left-hand operand. May be `this`.
     * @param b Right-hand operand. May be `this`.
     */
    multiplyMatrices(a: Mat3, b: Mat3): this {
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
}
