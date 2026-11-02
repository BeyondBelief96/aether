import { approxEqual, EPSILON } from "../scalar.js";
import type { QuatLike, Vec3Like } from "../types.js";
import type { Mat3x3 } from "./mat3x3.js";
import { Vec3 } from "./vec3.js";

/** Above this `cos θ`, slerp falls back to normalized lerp to avoid dividing by `sin θ ≈ 0`. */
const SLERP_LERP_THRESHOLD = 0.9999;

/**
 * Below this `1 + from·to`, `setFromUnitVectors` treats the vectors as opposite. Corresponds
 * to about 1.4e-6 rad from exactly opposite.
 */
const UNIT_VECTORS_OPPOSITE_THRESHOLD = 1e-12;

/** Above this `|m02|`, `getEulerXYZ` treats the Y angle as ±90° (gimbal lock). */
const EULER_GIMBAL_LOCK_THRESHOLD = 0.9999999;

/**
 * A quaternion `[w, (x, y, z)]`, used to represent orientations and rotations.
 *
 * A rotation of angle `θ` about unit axis `n` is stored as `[cos(θ/2), sin(θ/2)·n]`, which
 * has magnitude 1. `q` and `−q` represent the same rotation.
 *
 * Conventions:
 *
 * - **Component order.** The constructor takes `w` first, matching the `[w, v]` notation.
 *   This differs from `THREE.Quaternion`, which takes `(x, y, z, w)`.
 * - **Plain public fields.** `w`, `x`, `y` and `z` are ordinary properties, not getters, so V8
 *   can optimize access in hot loops.
 * - **Mutation.** Methods that modify this quaternion do it in place and return `this` for
 *   chaining. Use `clone()` first when you need to keep the original.
 * - **Inputs.** Arguments are any `QuatLike` or `Vec3Like`, including `THREE.Quaternion`, and
 *   are never modified. An argument may be `this`: every method reads its inputs before
 *   writing.
 */
export class Quaternion implements QuatLike {
    w: number;
    x: number;
    y: number;
    z: number;

    /**
     * Creates a quaternion from its components. Defaults to the identity `[1, 0]`.
     *
     * @param w Scalar part.
     * @param x X component of the vector part.
     * @param y Y component of the vector part.
     * @param z Z component of the vector part.
     */
    constructor(w: number = 1, x: number = 0, y: number = 0, z: number = 0) {
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Sets this quaternion to the identity `[1, 0]`, the rotation that changes nothing.
     *
     * `[−1, 0]` also represents no rotation, but only `[1, 0]` leaves a quaternion
     * unchanged when multiplied by it.
     */
    identity(): this {
        this.w = 1.0;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        return this;
    }

    /**
     * Sets all four components.
     *
     * @param w Scalar part.
     * @param x X component of the vector part.
     * @param y Y component of the vector part.
     * @param z Z component of the vector part.
     */
    set(w: number, x: number, y: number, z: number): this {
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /**
     * Returns true if every component is within `epsilon` of `q`'s, using `approxEqual`.
     *
     * Compares components, not rotations: `q` and `−q` are the same rotation but are not equal
     * here.
     *
     * @param q Quaternion to compare against.
     * @param epsilon Tolerance. Defaults to `EPSILON`.
     */
    equals(q: QuatLike, epsilon: number = EPSILON): boolean {
        return (
            approxEqual(this.w, q.w, epsilon) &&
            approxEqual(this.x, q.x, epsilon) &&
            approxEqual(this.y, q.y, epsilon) &&
            approxEqual(this.z, q.z, epsilon)
        );
    }

    /**
     * Returns true if this quaternion and `q` represent the same rotation: if every component
     * is within `epsilon` of `q`'s, or of `−q`'s.
     *
     * The sign compared against is chosen from the dot product, so this costs about the same
     * as `equals`. Comparing components keeps the tolerance meaningful for small angles,
     * where `|dot| ≈ 1` alone is insensitive (it deviates from 1 only by about `φ²/8`).
     *
     * @param q Quaternion to compare against.
     * @param epsilon Tolerance. Defaults to `EPSILON`.
     */
    equalsRotation(q: QuatLike, epsilon: number = EPSILON): boolean {
        const s = this.dot(q) < 0 ? -1 : 1;
        return (
            approxEqual(this.w, s * q.w, epsilon) &&
            approxEqual(this.x, s * q.x, epsilon) &&
            approxEqual(this.y, s * q.y, epsilon) &&
            approxEqual(this.z, s * q.z, epsilon)
        );
    }

    /**
     * Copies the components of `q` into this quaternion.
     *
     * @param q Source quaternion.
     */
    copy(q: QuatLike): this {
        this.w = q.w;
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        return this;
    }

    /**
     * Returns a new quaternion with the same components as this one.
     */
    clone(): Quaternion {
        return new Quaternion(this.w, this.x, this.y, this.z);
    }

    /**
     * Returns the squared magnitude of this quaternion, `w² + x² + y² + z²`.
     *
     * Prefer this over `magnitude` when checking whether the quaternion is still unit length,
     * since it avoids the square root.
     */
    magnitudeSquared(): number {
        return (
            this.w * this.w +
            this.x * this.x +
            this.y * this.y +
            this.z * this.z
        );
    }

    /**
     * Returns the magnitude of this quaternion, `√(w² + x² + y² + z²)`.
     *
     * Rotation quaternions have magnitude 1, but floating-point error makes it drift.
     */
    magnitude(): number {
        return Math.sqrt(this.magnitudeSquared());
    }

    /**
     * Scales this quaternion to unit length so it represents a pure rotation.
     *
     * Call it after integrating orientation, after long chains of multiplications, and
     * after linear interpolation, since each one moves the length away from 1.
     *
     * A zero quaternion represents no rotation, so it becomes the identity instead of NaN.
     */
    normalize(): this {
        const magnitude = this.magnitude();

        if (magnitude === 0) {
            return this.identity();
        }

        this.w /= magnitude;
        this.x /= magnitude;
        this.y /= magnitude;
        this.z /= magnitude;
        return this;
    }

    /**
     * Multiplies every component by the scalar `k`: `this = k · this`.
     *
     * Scaling by a non-zero `k` does not change the rotation once normalized, so this is
     * mainly useful as a building block, e.g. for interpolation.
     *
     * @param k Scale factor.
     */
    scale(k: number): this {
        this.w *= k;
        this.x *= k;
        this.y *= k;
        this.z *= k;
        return this;
    }

    /**
     * Returns the 4D dot product `w·qw + x·qx + y·qy + z·qz`.
     *
     * For unit quaternions it is `cos(φ/2)`, where `φ` is the angle of the rotation between
     * them. Its sign tells you whether `q` or `−q` is the shorter path, and `|dot| ≈ 1` means
     * they are the same rotation.
     *
     * @param q The other quaternion.
     */
    dot(q: QuatLike): number {
        return this.w * q.w + this.x * q.x + this.y * q.y + this.z * q.z;
    }

    /**
     * Negates the vector part: `this = [w, −v]`.
     *
     * For a unit quaternion the conjugate is the inverse: the same rotation in the opposite
     * direction. It is cheaper than `inverse()`, so prefer it for rotations.
     */
    conjugate(): this {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * Sets this quaternion to its multiplicative inverse, `q⁻¹ = q* / |q|²`, so that
     * `q · q⁻¹ = q⁻¹ · q = [1, 0]`.
     *
     * Works for any non-zero quaternion. For unit quaternions it equals `conjugate()`, which
     * is cheaper.
     *
     * The zero quaternion has no inverse, so it stays zero instead of becoming NaN, matching
     * how singular matrices invert to zero.
     */
    inverse(): this {
        const magnitudeSquared = this.magnitudeSquared();

        if (magnitudeSquared === 0) {
            return this;
        }

        const invMagnitudeSquared = 1.0 / magnitudeSquared;
        this.w *= invMagnitudeSquared;
        this.x *= -invMagnitudeSquared;
        this.y *= -invMagnitudeSquared;
        this.z *= -invMagnitudeSquared;
        return this;
    }

    /**
     * Sets this quaternion to its natural logarithm:
     * `log [w, v] = [ln |q|, (v / |v|) · atan2(|v|, w)]`.
     *
     * For a unit quaternion `[cos(θ/2), sin(θ/2)·n]` this is `[0, (θ/2)·n]`: half the rotation
     * vector. That makes it the way to measure or scale a rotation, e.g.
     * `exp(t · log(q))` is `q` raised to the power `t`. The angle `θ/2` is in `[0, π]`, so `q`
     * and `−q` give different logarithms.
     *
     * Edge cases:
     *
     * - With no vector part and `w > 0` (the identity, up to scale), the vector part is zero.
     * - With no vector part and `w < 0` (`[−1, 0]`, up to scale), any axis is valid. `+X` is
     *   used, giving `[ln |w|, (π, 0, 0)]`, so `exp` still recovers the original.
     * - The zero quaternion has no logarithm: `w` becomes `−∞` and the vector part zero.
     *
     * Inverse of `exp`.
     */
    log(): this {
        const w = this.w;
        const x = this.x;
        const y = this.y;
        const z = this.z;

        const vectorMagnitudeSquared = x * x + y * y + z * z;
        const vectorMagnitude = Math.sqrt(vectorMagnitudeSquared);

        // ln |q|, with |q|² computed from the parts already squared.
        this.w = 0.5 * Math.log(w * w + vectorMagnitudeSquared);

        if (vectorMagnitude === 0) {
            this.x = w < 0 ? Math.PI : 0;
            this.y = 0;
            this.z = 0;
            return this;
        }

        // atan2 stays accurate near 0 and π, where acos(w / |q|) loses precision.
        const k = Math.atan2(vectorMagnitude, w) / vectorMagnitude;
        this.x = k * x;
        this.y = k * y;
        this.z = k * z;
        return this;
    }

    /**
     * Sets this quaternion to its exponential:
     * `exp [w, v] = e^w · [cos |v|, (v / |v|) · sin |v|]`.
     *
     * With `w = 0` the result is a unit quaternion: `exp [0, (θ/2)·n]` is the rotation of
     * angle `θ` about unit axis `n`. So `exp` turns half a rotation vector into a rotation,
     * e.g. integrating angular velocity exactly with `exp [0, ½·ω·dt] · q`.
     *
     * Inverse of `log`.
     */
    exp(): this {
        const x = this.x;
        const y = this.y;
        const z = this.z;

        const vectorMagnitude = Math.sqrt(x * x + y * y + z * z);
        const scale = Math.exp(this.w);

        // sin(s)/s → 1 as s → 0. Only an exactly zero s needs the limit: for any representable
        // s > 0, Math.sin(s) is accurate enough that the division loses nothing.
        const k =
            vectorMagnitude === 0
                ? scale
                : (scale * Math.sin(vectorMagnitude)) / vectorMagnitude;

        this.w = scale * Math.cos(vectorMagnitude);
        this.x = k * x;
        this.y = k * y;
        this.z = k * z;
        return this;
    }

    /**
     * Post-multiplies this quaternion by `q`: `this = this · q`.
     *
     * The result applies `q` first, then this.
     *
     * @param q Right-hand operand. May be `this`.
     */
    multiply(q: QuatLike): this {
        return this.multiplyQuaternions(this, q);
    }

    /**
     * Pre-multiplies this quaternion by `q`: `this = q · this`.
     *
     * The result applies this first, then `q`.
     *
     * @param q Left-hand operand. May be `this`.
     */
    premultiply(q: QuatLike): this {
        return this.multiplyQuaternions(q, this);
    }

    /**
     * Sets this quaternion to the Hamilton product `a · b`:
     * `[a.w·b.w − a.v·b.v,  a.w·b.v + b.w·a.v + a.v × b.v]`.
     *
     * @param a Left-hand operand. May be `this`.
     * @param b Right-hand operand. May be `this`.
     */
    multiplyQuaternions(a: QuatLike, b: QuatLike): this {
        const aw = a.w;
        const ax = a.x;
        const ay = a.y;
        const az = a.z;

        const bw = b.w;
        const bx = b.x;
        const by = b.y;
        const bz = b.z;

        this.w = aw * bw - (ax * bx + ay * by + az * bz);
        this.x = aw * bx + bw * ax + (ay * bz - az * by);
        this.y = aw * by + bw * ay + (az * bx - ax * bz);
        this.z = aw * bz + bw * az + (ax * by - ay * bx);
        return this;
    }

    /**
     * Sets this quaternion to the rotation of `angle` radians about `axis`:
     * `[cos(angle/2), sin(angle/2)·n]`, where `n` is `axis` normalized.
     *
     * Positive angles rotate counter-clockwise when looking down the axis toward the origin
     * (right-hand rule). `axis` need not be unit length and is not modified. A zero axis has
     * no direction, so the result is the identity.
     *
     * @param axis Rotation axis, any non-zero length.
     * @param angle Rotation angle in radians.
     */
    setFromAxisAngle(axis: Vec3Like, angle: number): this {
        const ax = axis.x;
        const ay = axis.y;
        const az = axis.z;
        const axisMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);

        if (axisMagnitude === 0) {
            return this.identity();
        }

        const halfAngle = angle / 2.0;
        const k = Math.sin(halfAngle) / axisMagnitude;
        this.w = Math.cos(halfAngle);
        this.x = k * ax;
        this.y = k * ay;
        this.z = k * az;
        return this;
    }

    /**
     * Sets this quaternion to the rotation that takes `q` to this one: `this = q⁻¹ · this`,
     * so that `q · (q⁻¹ · this)` is the original `this`.
     *
     * The difference is applied first, then `q`, so it is expressed in `q`'s local frame:
     * for orientations, it is the rotation from `q` to this as seen by a body oriented by `q`.
     *
     * `q` is not modified. Uses the full inverse, so `q` need not be unit length; a zero `q`
     * makes the result zero, as with `inverse()`.
     *
     * @param q The starting orientation. May be `this`.
     */
    setToDifferenceQuaternion(q: QuatLike): this {
        const qw = q.w;
        const qx = q.x;
        const qy = q.y;
        const qz = q.z;
        const magnitudeSquared = qw * qw + qx * qx + qy * qy + qz * qz;
        const k = magnitudeSquared === 0 ? 0 : 1.0 / magnitudeSquared;

        // a = q⁻¹ = [qw, −qv] / |q|², multiplied in place as in multiplyQuaternions.
        const aw = qw * k;
        const ax = -qx * k;
        const ay = -qy * k;
        const az = -qz * k;

        const bw = this.w;
        const bx = this.x;
        const by = this.y;
        const bz = this.z;

        this.w = aw * bw - (ax * bx + ay * by + az * bz);
        this.x = aw * bx + bw * ax + (ay * bz - az * by);
        this.y = aw * by + bw * ay + (az * bx - ax * bz);
        this.z = aw * bz + bw * az + (ax * by - ay * bx);
        return this;
    }

    /**
     * Rotates `v` by this quaternion and writes the result to `out`: the vector part of
     * `q · [0, v] · q*`.
     *
     * Uses the expanded form `t = 2(u × v)`, `v' = v + w·t + u × t`, where `u` is the vector
     * part, instead of two full products. The expansion relies on `w² + |u|² = 1`, so this
     * quaternion must be unit length; it is not normalized here.
     *
     * For orientations, this takes a direction from body space to world space.
     *
     * @param v Vector to rotate.
     * @param out Destination. Allocated if omitted. May be `v`.
     */
    rotateVec3(v: Vec3Like, out: Vec3 = new Vec3()): Vec3 {
        const qw = this.w;
        const qx = this.x;
        const qy = this.y;
        const qz = this.z;

        const vx = v.x;
        const vy = v.y;
        const vz = v.z;

        // t = 2(u × v)
        const tx = 2.0 * (qy * vz - qz * vy);
        const ty = 2.0 * (qz * vx - qx * vz);
        const tz = 2.0 * (qx * vy - qy * vx);

        // v' = v + w·t + u × t
        out.x = vx + qw * tx + (qy * tz - qz * ty);
        out.y = vy + qw * ty + (qz * tx - qx * tz);
        out.z = vz + qw * tz + (qx * ty - qy * tx);
        return out;
    }

    /**
     * Rotates `v` by the inverse of this quaternion and writes the result to `out`: the
     * vector part of `q* · [0, v] · q`.
     *
     * Same as `rotateVec3` with the vector part negated, so this quaternion is not modified.
     * Assumes it is unit length, where the conjugate is the inverse.
     *
     * For orientations, this takes a direction from world space to body space.
     *
     * @param v Vector to rotate.
     * @param out Destination. Allocated if omitted. May be `v`.
     */
    inverseRotateVec3(v: Vec3Like, out: Vec3 = new Vec3()): Vec3 {
        const qw = this.w;
        const qx = this.x;
        const qy = this.y;
        const qz = this.z;

        const vx = v.x;
        const vy = v.y;
        const vz = v.z;

        // t = 2(−u × v)
        const tx = 2.0 * (qz * vy - qy * vz);
        const ty = 2.0 * (qx * vz - qz * vx);
        const tz = 2.0 * (qy * vx - qx * vy);

        // v' = v + w·t + (−u) × t
        out.x = vx + qw * tx - (qy * tz - qz * ty);
        out.y = vy + qw * ty - (qz * tx - qx * tz);
        out.z = vz + qw * tz - (qx * ty - qy * tx);
        return out;
    }

    /**
     * Spherically interpolates from this quaternion toward `q`: `this = slerp(this, q, t)`.
     *
     * See `slerpQuaternions` for the details and edge cases.
     *
     * @param q Target rotation, unit length. May be `this`.
     * @param t Interpolation parameter. `0` gives this, `1` gives `q` (possibly as `−q`).
     */
    slerp(q: QuatLike, t: number): this {
        return this.slerpQuaternions(this, q, t);
    }

    /**
     * Sets this quaternion to the spherical linear interpolation from `a` to `b` at `t`: the
     * rotation a fraction `t` of the way along the shortest arc between them, turning at
     * constant angular speed.
     *
     * With `θ` the 4D angle between them (half the rotation angle from `a` to `b`), the
     * result is `a · sin((1 − t)θ) / sin θ + b · sin(tθ) / sin θ`.
     *
     * Edge cases:
     *
     * - `a` and `b` must be unit length; the result then is too.
     * - If `a · b < 0`, `−b` is used instead. It is the same rotation, and the shorter path,
     *   so the result at `t = 1` may be `−b`. `b` itself is not modified.
     * - When `a` and `b` are nearly equal, `sin θ ≈ 0`, so this falls back to linear
     *   interpolation followed by `normalize()`. The two agree closely at such small angles.
     * - `t` outside `[0, 1]` extrapolates along the same arc.
     *
     * @param a Start rotation, returned at `t = 0`. May be `this`.
     * @param b End rotation, returned at `t = 1`. May be `this`.
     * @param t Interpolation parameter, usually in `[0, 1]`.
     */
    slerpQuaternions(a: QuatLike, b: QuatLike, t: number): this {
        const aw = a.w;
        const ax = a.x;
        const ay = a.y;
        const az = a.z;

        let bw = b.w;
        let bx = b.x;
        let by = b.y;
        let bz = b.z;

        let cosOmega = aw * bw + ax * bx + ay * by + az * bz;

        // q and −q are the same rotation; pick the one on the shorter arc.
        if (cosOmega < 0) {
            bw = -bw;
            bx = -bx;
            by = -by;
            bz = -bz;
            cosOmega = -cosOmega;
        }

        // Nearly equal: sin θ ≈ 0, so lerp and renormalize instead.
        if (cosOmega > SLERP_LERP_THRESHOLD) {
            const k0 = 1.0 - t;
            this.w = k0 * aw + t * bw;
            this.x = k0 * ax + t * bx;
            this.y = k0 * ay + t * by;
            this.z = k0 * az + t * bz;
            return this.normalize();
        }

        // atan2 stays accurate where acos(cosOmega) loses precision. cosOmega ≤ the
        // threshold here, so 1 − cos² is positive.
        const sinOmega = Math.sqrt(1.0 - cosOmega * cosOmega);
        const omega = Math.atan2(sinOmega, cosOmega);
        const invSinOmega = 1.0 / sinOmega;
        const k0 = Math.sin((1.0 - t) * omega) * invSinOmega;
        const k1 = Math.sin(t * omega) * invSinOmega;

        this.w = k0 * aw + k1 * bw;
        this.x = k0 * ax + k1 * bx;
        this.y = k0 * ay + k1 * by;
        this.z = k0 * az + k1 * bz;
        return this;
    }

    /**
     * Advances this orientation by angular velocity `omega` over `dt` seconds:
     * `q += ½·dt·[0, ω]·q`.
     *
     * This is a first-order step of `q̇ = ½·ω·q`, with `ω` in world space. It does not
     * normalize, and each step moves the length slightly away from 1, so call `normalize()`
     * afterwards (a rigid body does this when it recomputes its derived data). For an exact
     * step, use `exp [0, ½·ω·dt] · q` instead.
     *
     * @param omega Angular velocity in world space, in radians per second.
     * @param dt Time step in seconds.
     */
    addScaledAngularVelocity(omega: Vec3Like, dt: number): this {
        const h = 0.5 * dt;
        const ox = omega.x * h;
        const oy = omega.y * h;
        const oz = omega.z * h;

        const qw = this.w;
        const qx = this.x;
        const qy = this.y;
        const qz = this.z;

        // [0, o] · q = [−o·v, qw·o + o × v], with o = ½·dt·ω and v the vector part of q.
        this.w = qw - (ox * qx + oy * qy + oz * qz);
        this.x = qx + qw * ox + (oy * qz - oz * qy);
        this.y = qy + qw * oy + (oz * qx - ox * qz);
        this.z = qz + qw * oz + (ox * qy - oy * qx);
        return this;
    }

    /**
     * Sets this quaternion from the rotation matrix `m`, so that `rotateVec3(v)` equals
     * `m.transformVec3(v)`.
     *
     * Uses Shepperd's method: it branches on the largest of the trace and the diagonal
     * elements, so the square root is always of a value of at least 1 and the division is
     * well conditioned. The sign of the result is not canonical; `q` and `−q` are the same
     * rotation.
     *
     * `m` must be a pure rotation (orthonormal, determinant 1). Scale, shear or reflection
     * give a meaningless result.
     *
     * @param m Rotation matrix.
     */
    setFromRotationMatrix(m: Mat3x3): this {
        const e = m.elements;
        const m00 = e[0]!,
            m01 = e[1]!,
            m02 = e[2]!;
        const m10 = e[3]!,
            m11 = e[4]!,
            m12 = e[5]!;
        const m20 = e[6]!,
            m21 = e[7]!,
            m22 = e[8]!;

        const trace = m00 + m11 + m22;

        if (trace > 0) {
            // s = 4w
            const s = 2.0 * Math.sqrt(trace + 1.0);
            this.w = 0.25 * s;
            this.x = (m21 - m12) / s;
            this.y = (m02 - m20) / s;
            this.z = (m10 - m01) / s;
        } else if (m00 > m11 && m00 > m22) {
            // s = 4x
            const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
            this.w = (m21 - m12) / s;
            this.x = 0.25 * s;
            this.y = (m01 + m10) / s;
            this.z = (m02 + m20) / s;
        } else if (m11 > m22) {
            // s = 4y
            const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
            this.w = (m02 - m20) / s;
            this.x = (m01 + m10) / s;
            this.y = 0.25 * s;
            this.z = (m12 + m21) / s;
        } else {
            // s = 4z
            const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
            this.w = (m10 - m01) / s;
            this.x = (m02 + m20) / s;
            this.y = (m12 + m21) / s;
            this.z = 0.25 * s;
        }
        return this;
    }

    /**
     * Writes the rotation axis of this quaternion to `outAxis` and returns the rotation
     * angle, so that `setFromAxisAngle(outAxis, angle)` gives back this rotation.
     *
     * The angle is in `[0, π]`: for `w < 0` the axis is flipped instead of returning an
     * angle above π, so `q` and `−q` give the same result. The axis is unit length.
     *
     * Works for any non-zero quaternion, not only unit ones. With no rotation (zero vector
     * part) any axis is valid; `+X` is written and the angle is 0.
     *
     * @param outAxis Destination for the unit axis. Allocated if omitted.
     * @returns The rotation angle in radians, in `[0, π]`.
     */
    getAxisAngle(outAxis: Vec3 = new Vec3()): number {
        const w = this.w;
        const x = this.x;
        const y = this.y;
        const z = this.z;
        const vectorMagnitude = Math.sqrt(x * x + y * y + z * z);

        if (vectorMagnitude === 0) {
            outAxis.x = 1;
            outAxis.y = 0;
            outAxis.z = 0;
            return 0;
        }

        // Flipping to w ≥ 0 keeps the angle in [0, π].
        const k = (w < 0 ? -1 : 1) / vectorMagnitude;
        outAxis.x = k * x;
        outAxis.y = k * y;
        outAxis.z = k * z;

        // atan2 stays accurate near 0 and π, where acos(|w|) loses precision.
        return 2.0 * Math.atan2(vectorMagnitude, Math.abs(w));
    }

    /**
     * Returns the angle of the rotation between this quaternion and `q`, in `[0, π]`: the
     * smallest rotation that takes one orientation to the other.
     *
     * Computed as the angle of `this* · q`, using `atan2` so it stays accurate for small
     * angles, where `2·acos(|dot|)` loses precision. `q` and `−q` give the same result.
     *
     * Both quaternions must be unit length.
     *
     * @param q The other rotation.
     */
    angleTo(q: QuatLike): number {
        const aw = this.w;
        const ax = this.x;
        const ay = this.y;
        const az = this.z;

        const bw = q.w;
        const bx = q.x;
        const by = q.y;
        const bz = q.z;

        // this* · q = [aw·bw + a·b,  aw·b − bw·a − a × b]
        const dw = aw * bw + ax * bx + ay * by + az * bz;
        const dx = aw * bx - bw * ax - (ay * bz - az * by);
        const dy = aw * by - bw * ay - (az * bx - ax * bz);
        const dz = aw * bz - bw * az - (ax * by - ay * bx);

        return 2.0 * Math.atan2(Math.sqrt(dx * dx + dy * dy + dz * dz), Math.abs(dw));
    }

    /**
     * Sets this quaternion from Euler angles in `XYZ` order: `qx · qy · qz`, where each is the
     * rotation of the given angle about that axis.
     *
     * `qz` is applied first, then `qy`, then `qx`, all about the fixed world axes. Equivalently,
     * the rotations are applied about the body's own axes in the order X, Y, Z. This matches
     * Three.js's default `'XYZ'` order.
     *
     * @param x Rotation about X, in radians.
     * @param y Rotation about Y, in radians.
     * @param z Rotation about Z, in radians.
     */
    setFromEulerXYZ(x: number, y: number, z: number): this {
        const c1 = Math.cos(x / 2.0);
        const s1 = Math.sin(x / 2.0);
        const c2 = Math.cos(y / 2.0);
        const s2 = Math.sin(y / 2.0);
        const c3 = Math.cos(z / 2.0);
        const s3 = Math.sin(z / 2.0);

        this.w = c1 * c2 * c3 - s1 * s2 * s3;
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        return this;
    }

    /**
     * Writes this rotation's Euler angles in `XYZ` order to `out`, the inverse of
     * `setFromEulerXYZ`.
     *
     * The angles are in `x ∈ (−π, π]`, `y ∈ [−π/2, π/2]`, `z ∈ (−π, π]`. Many angle triples
     * describe the same rotation, so the result may differ from the angles passed to
     * `setFromEulerXYZ` while still representing the same rotation.
     *
     * At `y = ±π/2` (gimbal lock), X and Z rotate about the same axis and only their
     * combination is defined. Then `z` is set to 0 and `x` carries the whole rotation.
     *
     * This quaternion must be unit length.
     *
     * @param out Destination for the angles `(x, y, z)` in radians. Allocated if omitted.
     */
    getEulerXYZ(out: Vec3 = new Vec3()): Vec3 {
        const w = this.w;
        const x = this.x;
        const y = this.y;
        const z = this.z;

        // The rotation matrix elements that the decomposition needs.
        const m00 = 1 - 2 * (y * y + z * z);
        const m01 = 2 * (x * y - w * z);
        const m02 = 2 * (x * z + w * y);
        const m11 = 1 - 2 * (x * x + z * z);
        const m12 = 2 * (y * z - w * x);
        const m21 = 2 * (y * z + w * x);
        const m22 = 1 - 2 * (x * x + y * y);

        // m02 = sin(y). Clamp, since rounding can push it just past ±1.
        out.y = Math.asin(Math.min(1, Math.max(-1, m02)));

        if (Math.abs(m02) < EULER_GIMBAL_LOCK_THRESHOLD) {
            out.x = Math.atan2(-m12, m22);
            out.z = Math.atan2(-m01, m00);
        } else {
            out.x = Math.atan2(m21, m11);
            out.z = 0;
        }
        return out;
    }

    /**
     * Sets this quaternion to the shortest rotation that takes direction `from` to direction
     * `to`.
     *
     * The axis is `from × to` and the angle is the angle between them. When they are
     * opposite, every axis perpendicular to them gives a shortest rotation (of π); one is
     * built from the larger of `from`'s X and Z components, so it is never near zero.
     *
     * Both vectors must be unit length. They are not modified.
     *
     * @param from Unit start direction.
     * @param to Unit end direction.
     */
    setFromUnitVectors(from: Vec3Like, to: Vec3Like): this {
        const fx = from.x;
        const fy = from.y;
        const fz = from.z;
        const tx = to.x;
        const ty = to.y;
        const tz = to.z;

        // [1 + cos φ, from × to] is the rotation by φ, scaled by 2·cos(φ/2); normalize fixes it.
        const r = 1.0 + (fx * tx + fy * ty + fz * tz);

        if (r < UNIT_VECTORS_OPPOSITE_THRESHOLD) {
            // Opposite: rotate π about an axis perpendicular to `from`.
            if (Math.abs(fx) > Math.abs(fz)) {
                this.w = 0;
                this.x = -fy;
                this.y = fx;
                this.z = 0;
            } else {
                this.w = 0;
                this.x = 0;
                this.y = -fz;
                this.z = fy;
            }
            return this.normalize();
        }

        this.w = r;
        this.x = fy * tz - fz * ty;
        this.y = fz * tx - fx * tz;
        this.z = fx * ty - fy * tx;
        return this.normalize();
    }
}
