import type { Vec3Like } from "../types";
import { Mat3x3 } from "./mat3x3";
import { Vec3 } from "./vec3";

const IDENTITY = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);

/**
 * A 3×4 affine transform: a 3×3 linear part `A` with a translation column `t`.
 *
 * Behaves as a 4×4 matrix whose implicit bottom row is `[0, 0, 0, 1]`, mapping a point
 * `p ↦ A·p + t`: the linear part is applied first, then the translation. Typically it holds a
 * rigid transform from a child frame into its parent, such as a body's local-to-world transform.
 *
 * Conventions:
 *
 * - **Row-major storage.** Element (row `r`, column `c`) is `elements[r * 4 + c]`, and the
 *   constructor takes arguments in reading order. The translation is at indices 3, 7 and 11.
 * - **Column vectors.** Vectors are transformed as `M · v`. In a product `A · B`, `B` is
 *   applied first, then `A`.
 * - **Columns are the child frame.** For a rigid transform, columns 0–2 are the child's X, Y and
 *   Z axes in the parent frame, and column 3 is the child's origin in the parent frame.
 * - **Points and directions.** `transformPoint` applies the translation; `transformDirection`
 *   applies only the linear part. Use directions for normals, velocities and axes.
 * - **Right-hand rule.** A positive angle turns counter-clockwise when looking from the tip of
 *   the rotation axis back toward the origin.
 * - **Mutation and output.** Methods that modify this transform do it in place and return
 *   `this` for chaining. Methods that produce a vector write to an optional `out`, allocating
 *   one if it is omitted. Inputs may alias `this` or `out`.
 * - **`Orthonormal` and `transformInverse*` methods.** These assume the linear part is a pure
 *   rotation (or reflection) and use its transpose as the inverse. Their results are undefined
 *   if the linear part contains scale or shear.
 *
 * Three.js has no 3×4 type, and `THREE.Matrix4.elements` is column-major. Build Three.js
 * transforms from a position and a quaternion instead of copying `elements`.
 */
export class Mat3x4 {
    /**
     * The twelve elements in row-major order:
     * `[m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23]`.
     */
    readonly elements: Float64Array;

    /**
     * Creates a transform from its elements in row-major (reading) order. Defaults to the
     * identity.
     */
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

    /**
     * Sets this transform to the identity: no rotation, scale or translation.
     */
    identity(): this {
        this.elements.set(IDENTITY);
        return this;
    }

    /**
     * Copies the elements of `m` into this transform.
     *
     * @param m Source transform.
     */
    copy(m: Mat3x4): this {
        this.elements.set(m.elements);
        return this;
    }

    /**
     * Returns a new transform with the same elements as this one.
     */
    clone(): Mat3x4 {
        return new Mat3x4().copy(this);
    }

    /**
     * Sets this transform from a 3×3 linear part `m` and a translation `t`: `p ↦ m·p + t`.
     *
     * @param m Linear part.
     * @param t Translation. Defaults to zero.
     */
    setFromMat3x3(m: Mat3x3, t: Vec3Like = { x: 0, y: 0, z: 0 }): this {
        const e = this.elements;
        const a = m.elements;
        e[0] = a[0]!;
        e[1] = a[1]!;
        e[2] = a[2]!;
        e[3] = t.x;
        e[4] = a[3]!;
        e[5] = a[4]!;
        e[6] = a[5]!;
        e[7] = t.y;
        e[8] = a[6]!;
        e[9] = a[7]!;
        e[10] = a[8]!;
        e[11] = t.z;
        return this;
    }

    /**
     * Copies the 3×3 linear part of this transform into `out`, dropping the translation.
     *
     * @param out Destination. Allocated if omitted.
     */
    getMat3x3(out: Mat3x3 = new Mat3x3()): Mat3x3 {
        const e = this.elements;
        const o = out.elements;
        o[0] = e[0]!;
        o[1] = e[1]!;
        o[2] = e[2]!;
        o[3] = e[4]!;
        o[4] = e[5]!;
        o[5] = e[6]!;
        o[6] = e[8]!;
        o[7] = e[9]!;
        o[8] = e[10]!;
        return out;
    }

    /**
     * Sets this transform to a pure translation by `(x, y, z)`.
     *
     * Overwrites the current contents: the linear part becomes the identity.
     *
     * @param x Translation along the X axis.
     * @param y Translation along the Y axis.
     * @param z Translation along the Z axis.
     */
    setTranslation(x: number, y: number, z: number): this {
        this.elements.set(IDENTITY);
        const e = this.elements;
        e[3] = x;
        e[7] = y;
        e[11] = z;
        return this;
    }

    /**
     * Copies the translation column of this transform into `out`.
     *
     * This is where the transform sends the origin.
     *
     * @param out Destination. Allocated if omitted.
     */
    getTranslation(out: Vec3 = new Vec3()): Vec3 {
        const e = this.elements;
        out.x = e[3]!;
        out.y = e[7]!;
        out.z = e[11]!;
        return out;
    }

    /**
     * Sets this transform to a scaling about the origin that stretches each axis by its own
     * factor.
     *
     * Pass a single factor for uniform scaling: `setScale(2)` scales every axis by 2.
     * Overwrites the current contents rather than scaling them, and clears the translation.
     *
     * @param x Scale factor along the X axis.
     * @param y Scale factor along the Y axis. Defaults to `x`.
     * @param z Scale factor along the Z axis. Defaults to `x`.
     */
    setScale(x: number, y: number = x, z: number = x): this {
        const e = this.elements;
        e[0] = x;
        e[1] = 0;
        e[2] = 0;
        e[3] = 0;
        e[4] = 0;
        e[5] = y;
        e[6] = 0;
        e[7] = 0;
        e[8] = 0;
        e[9] = 0;
        e[10] = z;
        e[11] = 0;
        return this;
    }

    /**
     * Sets this transform to a scale by factor `k` along an arbitrary `axis` through the origin.
     *
     * Components parallel to `axis` are multiplied by `k`; components perpendicular to it
     * are left unchanged. The linear part is `I + (k - 1) · axis · axisᵀ`, which is symmetric.
     * With a cardinal axis this matches `setScale` with `k` on that axis and 1 elsewhere.
     * `k = -1` reflects across the plane perpendicular to `axis`, and `k = 0` projects onto it.
     *
     * `axis` must be a unit vector. It is not normalized here, to keep this cheap on hot
     * paths. A non-unit axis scales by `1 + (k - 1)·|axis|²` instead of `k`. Call
     * `normalize()` on the axis first if it is not already unit length.
     *
     * Clears the translation.
     *
     * @param axis Unit-length scaling axis. Its sign does not matter.
     * @param k Scale factor along `axis`.
     */
    setScaleAlongAxis(axis: Vec3Like, k: number): this {
        const e = this.elements;
        const x = axis.x;
        const y = axis.y;
        const z = axis.z;
        const t = k - 1;
        e[0] = 1 + t * x * x;
        e[1] = t * x * y;
        e[2] = t * x * z;
        e[3] = 0;
        e[4] = t * x * y;
        e[5] = 1 + t * y * y;
        e[6] = t * y * z;
        e[7] = 0;
        e[8] = t * x * z;
        e[9] = t * y * z;
        e[10] = 1 + t * z * z;
        e[11] = 0;
        return this;
    }

    /**
     * Sets this transform to a reflection across the plane through the origin perpendicular
     * to `normal`.
     *
     * Components along `normal` are negated; components in the plane are left unchanged.
     * The result is `I - 2 · normal · normalᵀ`: symmetric, orthogonal, its own inverse, with
     * determinant -1. Equivalent to `setScaleAlongAxis(normal, -1)`. With a cardinal axis
     * this negates that one coordinate, e.g. `(1, 0, 0)` mirrors across the YZ plane.
     *
     * `normal` must be a unit vector. It is not normalized here, to keep this cheap on hot
     * paths. A non-unit normal does not produce a reflection. Call `normalize()` on it first
     * if it is not already unit length.
     *
     * Clears the translation.
     *
     * @param normal Unit-length normal of the mirror plane. Its sign does not matter.
     */
    setReflection(normal: Vec3Like): this {
        return this.setScaleAlongAxis(normal, -1);
    }

    /**
     * Sets this transform to a shear about the origin: each coordinate is offset in proportion to the
     * others.
     *
     * Factor `ab` is how far coordinate `a` moves per unit of coordinate `b`, and is stored
     * in the matching off-diagonal element (`xy` → `m01`):
     *
     * ```
     * x' = x + xy·y + xz·z
     * y' = y + yx·x + yz·z
     * z' = z + zx·x + zy·y
     * ```
     *
     * Omitted factors default to 0, so `setShear(2)` shears X by Y only, and no arguments
     * gives the identity. Shearing a coordinate by one or both of the others is volume
     * preserving (determinant 1). Combining shears in both directions between a pair, such as
     * `xy` with `yx`, is not: the determinant is
     * `1 - xy·yx - xz·zx - yz·zy + xy·yz·zx + xz·zy·yx`.
     *
     * Clears the translation.
     *
     * @param xy Shift of X per unit of Y.
     * @param xz Shift of X per unit of Z.
     * @param yx Shift of Y per unit of X.
     * @param yz Shift of Y per unit of Z.
     * @param zx Shift of Z per unit of X.
     * @param zy Shift of Z per unit of Y.
     */
    setShear(xy = 0, xz = 0, yx = 0, yz = 0, zx = 0, zy = 0): this {
        const e = this.elements;
        e[0] = 1;
        e[1] = xy;
        e[2] = xz;
        e[3] = 0;
        e[4] = yx;
        e[5] = 1;
        e[6] = yz;
        e[7] = 0;
        e[8] = zx;
        e[9] = zy;
        e[10] = 1;
        e[11] = 0;
        return this;
    }

    /**
     * Multiplies every element of this transform by the scalar `k`, in place, including
     * the translation.
     *
     * Unlike `setScale`, this keeps the current contents and scales them. Equivalent to
     * scaling the result of every `transformPoint` by `k`.
     *
     * @param k Scalar to multiply by.
     */
    multiplyScalar(k: number): this {
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
        e[9] = k * e[9]!;
        e[10] = k * e[10]!;
        e[11] = k * e[11]!;
        return this;
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

    /**
     * Sets this transform to a rotation of `theta` radians about the X axis.
     *
     * Positive angles turn counter-clockwise when looking from +X back toward the origin,
     * so a quarter turn carries the Y axis onto the Z axis.
     *
     * Clears the translation.
     *
     * @param theta Angle in radians.
     */
    setRotationX(theta: number): this {
        const e = this.elements;
        const s = Math.sin(theta);
        const c = Math.cos(theta);
        e[0] = 1;
        e[1] = 0;
        e[2] = 0;
        e[3] = 0;
        e[4] = 0;
        e[5] = c;
        e[6] = -s;
        e[7] = 0;
        e[8] = 0;
        e[9] = s;
        e[10] = c;
        e[11] = 0;
        return this;
    }

    /**
     * Sets this transform to a rotation of `theta` radians about the Y axis.
     *
     * Positive angles turn counter-clockwise when looking from +Y back toward the origin,
     * so a quarter turn carries the Z axis onto the X axis.
     *
     * Clears the translation.
     *
     * @param theta Angle in radians.
     */
    setRotationY(theta: number): this {
        const e = this.elements;
        const s = Math.sin(theta);
        const c = Math.cos(theta);
        e[0] = c;
        e[1] = 0;
        e[2] = s;
        e[3] = 0;
        e[4] = 0;
        e[5] = 1;
        e[6] = 0;
        e[7] = 0;
        e[8] = -s;
        e[9] = 0;
        e[10] = c;
        e[11] = 0;
        return this;
    }

    /**
     * Sets this transform to a rotation of `theta` radians about the Z axis.
     *
     * Positive angles turn counter-clockwise when looking from +Z back toward the origin,
     * so a quarter turn carries the X axis onto the Y axis.
     *
     * Clears the translation.
     *
     * @param theta Angle in radians.
     */
    setRotationZ(theta: number): this {
        const e = this.elements;
        const s = Math.sin(theta);
        const c = Math.cos(theta);
        e[0] = c;
        e[1] = -s;
        e[2] = 0;
        e[3] = 0;
        e[4] = s;
        e[5] = c;
        e[6] = 0;
        e[7] = 0;
        e[8] = 0;
        e[9] = 0;
        e[10] = 1;
        e[11] = 0;
        return this;
    }

    /**
     * Sets this transform to a rotation of `angle` radians about an arbitrary `axis`
     * through the origin.
     *
     * Positive angles turn counter-clockwise when looking from the tip of `axis` back toward
     * the origin. With a cardinal axis this matches `setRotationX`, `setRotationY` or
     * `setRotationZ`.
     *
     * `axis` must be a unit vector. It is not normalized here, to keep this cheap on hot
     * paths. A non-unit axis generally produces a matrix that is not a rotation: it
     * distorts lengths and angles. Call `normalize()` on the axis first if it is not
     * already unit length.
     *
     * Clears the translation.
     *
     * @param axis Unit-length rotation axis.
     * @param angle Angle in radians.
     */
    setFromAxisAngle(axis: Vec3Like, angle: number): this {
        const x = axis.x,
            y = axis.y,
            z = axis.z;

        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const e = this.elements;
        const t = 1 - c;

        e[0] = t * x * x + c;
        e[1] = x * y * t - z * s;
        e[2] = x * z * t + y * s;
        e[3] = 0;
        e[4] = x * y * t + z * s;
        e[5] = c + y * y * t;
        e[6] = y * z * t - x * s;
        e[7] = 0;
        e[8] = x * z * t - y * s;
        e[9] = y * z * t + x * s;
        e[10] = c + z * z * t;
        e[11] = 0;

        return this;
    }
}
