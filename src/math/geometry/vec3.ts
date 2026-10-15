import { approxEqual, EPSILON } from "../scalar";
import type { Vec3Like } from "../types";

/**
 * A 3D vector, used for points, directions, velocities, forces and other 3-component quantities.
 *
 * Conventions:
 *
 * - **Right-handed coordinates**, matching Three.js: `X × Y = Z`.
 * - **Plain public fields.** `x`, `y` and `z` are ordinary properties, not getters, so V8 can
 *   optimize access in hot loops.
 * - **Mutation.** Methods that modify this vector do it in place and return `this` for
 *   chaining, e.g. `v.add(w).scale(2)`. Use `clone()` first when you need to keep the original.
 * - **Inputs.** Arguments are any `Vec3Like`, including `THREE.Vector3`, and are never
 *   modified. An argument may be `this`: every method reads its inputs before writing.
 */
export class Vec3 implements Vec3Like {
    x: number;
    y: number;
    z: number;

    /**
     * Creates a vector from its components. Defaults to the zero vector.
     *
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     */
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Sets all three components.
     *
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     */
    set(x: number, y: number, z: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /**
     * Copies the components of `vec3Like` into this vector.
     *
     * @param vec3Like Source vector.
     */
    copy(vec3Like: Vec3Like): this {
        this.x = vec3Like.x;
        this.y = vec3Like.y;
        this.z = vec3Like.z;

        return this;
    }

    /**
     * Returns a new vector with the same components as this one.
     */
    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    /**
     * Returns the length of this vector, `√(x² + y² + z²)`.
     *
     * Prefer `magnitudeSquared` when only comparing lengths, since it avoids the square root.
     */
    magnitude(): number {
        return Math.sqrt(this.magnitudeSquared());
    }

    /**
     * Returns the squared length of this vector, `x² + y² + z²`.
     */
    magnitudeSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    /**
     * Returns the distance between this point and `v`, `|this − v|`.
     *
     * Prefer `distanceToSquared` when only comparing distances, since it avoids the square root.
     *
     * @param v The other point.
     */
    distanceTo(v: Vec3Like): number {
        return Math.sqrt(this.distanceToSquared(v));
    }

    /**
     * Returns the squared distance between this point and `v`, `|this − v|²`.
     *
     * @param v The other point.
     */
    distanceToSquared(v: Vec3Like): number {
        const dx = this.x - v.x,
            dy = this.y - v.y,
            dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Adds `v` to this vector: `this = this + v`.
     *
     * @param v Vector to add.
     */
    add(v: Vec3Like): this {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    /**
     * Subtracts `v` from this vector: `this = this − v`.
     *
     * @param v Vector to subtract.
     */
    subtract(v: Vec3Like): this {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    /**
     * Multiplies every component by the scalar `s`: `this = this · s`.
     *
     * @param s Scale factor.
     */
    scale(s: number): this {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    /**
     * Adds `v` scaled by `s` to this vector: `this = this + v · s`.
     *
     * The workhorse of integration, e.g. `position.addScaled(velocity, dt)`. Cheaper than
     * `add(v.clone().scale(s))` and leaves `v` unchanged.
     *
     * @param v Vector to scale and add.
     * @param s Scale applied to `v`.
     */
    addScaled(v: Vec3Like, s: number): this {
        this.x += v.x * s;
        this.y += v.y * s;
        this.z += v.z * s;
        return this;
    }

    /**
     * Multiplies this vector by `v` component by component (the Hadamard product):
     * `(x·vx, y·vy, z·vz)`.
     *
     * Not a dot or cross product. Useful for per-axis scaling.
     *
     * @param v Vector of per-component factors.
     */
    componentWiseProduct(v: Vec3Like): this {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    /**
     * Reverses the direction of this vector: `this = −this`.
     */
    negate(): this {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * Moves this vector toward `v` by fraction `t`: `this + (v − this) · t`.
     *
     * `t = 0` leaves it unchanged and `t = 1` sets it to `v`. Values outside [0, 1]
     * extrapolate.
     *
     * @param v Target vector.
     * @param t Interpolation fraction.
     */
    lerp(v: Vec3Like, t: number): this {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        return this;
    }

    /**
     * Returns true if every component is within `epsilon` of `v`'s, using `approxEqual`.
     *
     * The tolerance is absolute for components up to about 1 and relative above that.
     *
     * @param v Vector to compare against.
     * @param epsilon Tolerance. Defaults to `EPSILON`.
     */
    equals(v: Vec3Like, epsilon: number = EPSILON): boolean {
        return (
            approxEqual(this.x, v.x, epsilon) &&
            approxEqual(this.y, v.y, epsilon) &&
            approxEqual(this.z, v.z, epsilon)
        );
    }

    /**
     * Returns the dot product `this · v = x·vx + y·vy + z·vz`.
     *
     * Equals `|this| |v| cos θ`: positive when the vectors point the same way, zero when they
     * are perpendicular, negative when they point apart. With a unit `v` it is the length of
     * this vector's projection onto `v`.
     *
     * @param v The other vector.
     */
    dot(v: Vec3Like): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /**
     * Sets this vector to the cross product `this × v`.
     *
     * The result is perpendicular to both inputs, with length `|this| |v| sin θ` and direction
     * given by the right-hand rule. It is zero for parallel vectors, and `a × b = −(b × a)`.
     *
     * @param v Right-hand operand. May be `this`.
     */
    cross(v: Vec3Like): this {
        return this.crossVectors(this, v);
    }

    /**
     * Sets this vector to the cross product `a × b` without allocating.
     *
     * @param a Left-hand operand. May be `this`.
     * @param b Right-hand operand. May be `this`.
     */
    crossVectors(a: Vec3Like, b: Vec3Like): this {
        const ax = a.x,
            ay = a.y,
            az = a.z;
        const bx = b.x,
            by = b.y,
            bz = b.z;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }

    /**
     * Returns the cross product `v1 × v2` as a new vector, leaving both inputs unchanged.
     *
     * Allocates. On hot paths use `crossVectors` with a reused vector instead.
     *
     * @param v1 Left-hand operand.
     * @param v2 Right-hand operand.
     */
    static cross(v1: Vec3Like, v2: Vec3Like): Vec3 {
        return new Vec3(
            v1.y * v2.z - v1.z * v2.y,
            v1.z * v2.x - v1.x * v2.z,
            v1.x * v2.y - v1.y * v2.x,
        );
    }

    /**
     * Scales this vector to unit length, keeping its direction.
     *
     * The zero vector has no direction, so it stays zero instead of becoming NaN. Check
     * `magnitudeSquared()` first if a zero input needs handling.
     */
    normalize(): this {
        const magnitude = this.magnitude();
        if (magnitude > 0.0) {
            this.x /= magnitude;
            this.y /= magnitude;
            this.z /= magnitude;
        } else {
            this.x = 0.0;
            this.y = 0.0;
            this.z = 0.0;
        }

        return this;
    }
}
