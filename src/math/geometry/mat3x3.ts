import type { QuatLike, Vec3Like } from "../types.js";
import { Vec3 } from "./vec3.js";

const IDENTITY = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

/**
 * A 3×3 matrix for linear transforms (rotation, scale, shear, reflection) and other 3×3
 * quantities such as inertia tensors.
 *
 * Conventions:
 *
 * - **Row-major storage.** Element (row `r`, column `c`) is `elements[r * 3 + c]`, and the
 *   constructor takes arguments in reading order, so source code looks like the matrix on paper.
 * - **Column vectors.** Vectors are transformed as `M · v`. In a product `A · B`, `B` is
 *   applied first, then `A`.
 * - **Columns are basis axes.** For a rotation from a child frame into its parent, column `i` is
 *   the child's `i`-th axis expressed in the parent frame. For a rigid body's orientation the
 *   columns are the body's X, Y and Z axes in world space.
 * - **Right-hand rule.** A positive angle turns counter-clockwise when looking from the tip of
 *   the rotation axis back toward the origin.
 * - **Mutation and output.** Methods that modify this matrix do it in place and return `this`
 *   for chaining. Methods that produce a vector write to an optional `out`, allocating one if
 *   it is omitted. Inputs may alias `this` or `out`.
 * - **`Orthonormal` variants.** Methods with `Orthonormal` in the name, and
 *   `transformInverseVec3`, assume a pure rotation (or reflection) and use the transpose as the
 *   inverse. Their results are undefined if the matrix contains scale or shear.
 *
 * The layout differs from Three.js: `THREE.Matrix3.elements` is column-major. Do not copy
 * `elements` arrays between the two directly.
 */
export class Mat3x3 {
    /** The nine elements in row-major order: `[m00, m01, m02, m10, m11, m12, m20, m21, m22]`. */
    readonly elements: Float64Array;

    /**
     * Creates a matrix from its elements in row-major (reading) order. Defaults to the identity.
     */
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

    /**
     * Sets this matrix to the identity, which leaves every vector unchanged.
     */
    identity(): this {
        this.elements.set(IDENTITY);
        return this;
    }

    /**
     * Copies the elements of `m` into this matrix.
     *
     * @param m Source matrix.
     */
    copy(m: Mat3x3): this {
        this.elements.set(m.elements);
        return this;
    }

    /**
     * Returns a new matrix with the same elements as this one.
     */
    clone(): Mat3x3 {
        return new Mat3x3().copy(this);
    }

    /**
     * Sets this matrix to a diagonal matrix with `a`, `b` and `c` on the diagonal and zeros
     * elsewhere.
     *
     * Overwrites the current contents. Used for axis-aligned scaling and for the inertia tensor
     * of a shape aligned with its principal axes.
     *
     * @param a Element (0, 0).
     * @param b Element (1, 1).
     * @param c Element (2, 2).
     */
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
     * Sets this matrix to a scaling matrix that stretches each axis by its own factor.
     *
     * Pass a single factor for uniform scaling: `setScale(2)` scales every axis by 2.
     * Overwrites the current contents rather than scaling them.
     *
     * @param x Scale factor along the X axis.
     * @param y Scale factor along the Y axis. Defaults to `x`.
     * @param z Scale factor along the Z axis. Defaults to `x`.
     */
    setScale(x: number, y: number = x, z: number = x): this {
        return this.setDiagonal(x, y, z);
    }

    /**
     * Sets this matrix to a scale by factor `k` along an arbitrary `axis` through the origin.
     *
     * Components parallel to `axis` are multiplied by `k`; components perpendicular to it
     * are left unchanged. The result is `I + (k - 1) · axis · axisᵀ`, which is symmetric.
     * With a cardinal axis this matches `setScale` with `k` on that axis and 1 elsewhere.
     * `k = -1` reflects across the plane perpendicular to `axis`, and `k = 0` projects onto it.
     *
     * `axis` must be a unit vector. It is not normalized here, to keep this cheap on hot
     * paths. A non-unit axis scales by `1 + (k - 1)·|axis|²` instead of `k`. Call
     * `normalize()` on the axis first if it is not already unit length.
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
        e[3] = t * x * y;
        e[4] = 1 + t * y * y;
        e[5] = t * y * z;
        e[6] = t * x * z;
        e[7] = t * y * z;
        e[8] = 1 + t * z * z;
        return this;
    }

    /**
     * Sets this matrix to a reflection across the plane perpendicular to `normal`.
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
     * @param normal Unit-length normal of the mirror plane. Its sign does not matter.
     */
    setReflection(normal: Vec3Like): this {
        return this.setScaleAlongAxis(normal, -1);
    }

    /**
     * Sets this matrix to a shear: each coordinate is offset in proportion to the
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
        e[3] = yx;
        e[4] = 1;
        e[5] = yz;
        e[6] = zx;
        e[7] = zy;
        e[8] = 1;
        return this;
    }

    /**
     * Multiplies every element of this matrix by the scalar `k`, in place.
     *
     * Unlike `setScale`, this keeps the current contents and scales them.
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

    /**
     * Transposes this matrix in place, swapping rows and columns: element (r, c) becomes
     * element (c, r).
     *
     * For an orthonormal matrix the transpose is the inverse.
     */
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

    /**
     * Returns the determinant: the factor by which this matrix scales volumes.
     *
     * Zero means the matrix is singular and has no inverse. A negative value means it includes
     * a reflection. Rotations have determinant 1.
     */
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
     * Inverts this matrix in place, or sets it to zero if it is singular.
     */
    inverse(): this {
        return this.setInverse(this);
    }

    /**
     * Sets this matrix to the inverse of `m`, assuming `m` is orthonormal.
     *
     * Computes `mᵀ`, which equals `m⁻¹` for any orthonormal matrix: rotations, reflections
     * and their products. The result is undefined if `m` contains scale or shear.
     *
     * @param m Matrix to invert. May be `this`.
     */
    setInverseOrthonormal(m: Mat3x3): this {
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

        const e = this.elements;
        e[0] = a00;
        e[1] = a10;
        e[2] = a20;
        e[3] = a01;
        e[4] = a11;
        e[5] = a21;
        e[6] = a02;
        e[7] = a12;
        e[8] = a22;
        return this;
    }

    /**
     * Inverts this matrix in place, assuming it is orthonormal.
     */
    inverseOrthonormal(): this {
        return this.transpose();
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

    /**
     * Computes `thisᵀ · v`, the inverse transform of `v`, without building the inverse.
     *
     * Assumes this matrix is orthonormal.
     *
     * @param v Vector to transform.
     * @param out Destination. Allocated if omitted. May be `v`.
     */
    transformInverseVec3(v: Vec3Like, out: Vec3 = new Vec3()): Vec3 {
        const e = this.elements;
        const x = v.x,
            y = v.y,
            z = v.z;

        out.x = e[0]! * x + e[3]! * y + e[6]! * z;
        out.y = e[1]! * x + e[4]! * y + e[7]! * z;
        out.z = e[2]! * x + e[5]! * y + e[8]! * z;
        return out;
    }

    /**
     * Sets this matrix to a rotation of `theta` radians about the X axis.
     *
     * Positive angles turn counter-clockwise when looking from +X back toward the origin,
     * so a quarter turn carries the Y axis onto the Z axis.
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
        e[4] = c;
        e[5] = -s;
        e[6] = 0;
        e[7] = s;
        e[8] = c;
        return this;
    }

    /**
     * Sets this matrix to a rotation of `theta` radians about the Y axis.
     *
     * Positive angles turn counter-clockwise when looking from +Y back toward the origin,
     * so a quarter turn carries the Z axis onto the X axis.
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
        e[4] = 1;
        e[5] = 0;
        e[6] = -s;
        e[7] = 0;
        e[8] = c;
        return this;
    }

    /**
     * Sets this matrix to a rotation of `theta` radians about the Z axis.
     *
     * Positive angles turn counter-clockwise when looking from +Z back toward the origin,
     * so a quarter turn carries the X axis onto the Y axis.
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
        e[3] = s;
        e[4] = c;
        e[5] = 0;
        e[6] = 0;
        e[7] = 0;
        e[8] = 1;
        return this;
    }

    /**
     * Sets this matrix to a rotation of `angle` radians about an arbitrary `axis`.
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
        e[3] = x * y * t + z * s;
        e[4] = c + y * y * t;
        e[5] = y * z * t - x * s;
        e[6] = x * z * t - y * s;
        e[7] = y * z * t + x * s;
        e[8] = c + z * z * t;

        return this;
    }

    /**
     * Sets this matrix to the rotation represented by the quaternion `q`, so that
     * `transformVec3(v)` equals `q.rotateVec3(v)`.
     *
     * The columns are the images of the X, Y and Z axes under `q`. `q` and `−q` give the same
     * matrix.
     *
     * `q` must be unit length. It is not normalized here, to keep this cheap on hot paths. A
     * non-unit `q` generally produces a matrix that is not a rotation.
     *
     * @param q Unit quaternion.
     */
    setFromQuaternion(q: QuatLike): this {
        const w = q.w,
            x = q.x,
            y = q.y,
            z = q.z;

        const x2 = x + x,
            y2 = y + y,
            z2 = z + z;
        const xx = x * x2,
            yy = y * y2,
            zz = z * z2;
        const xy = x * y2,
            xz = x * z2,
            yz = y * z2;
        const wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        const e = this.elements;
        e[0] = 1 - (yy + zz);
        e[1] = xy - wz;
        e[2] = xz + wy;
        e[3] = xy + wz;
        e[4] = 1 - (xx + zz);
        e[5] = yz - wx;
        e[6] = xz - wy;
        e[7] = yz + wx;
        e[8] = 1 - (xx + yy);
        return this;
    }
}
