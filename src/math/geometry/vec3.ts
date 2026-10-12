import type { Vec3Like } from "../types";

export class Vec3 implements Vec3Like {
    x: number;
    y: number;
    z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    copy(vec3Like: Vec3Like): this {
        this.x = vec3Like.x;
        this.y = vec3Like.y;
        this.z = vec3Like.z;

        return this;
    }

    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    magnitude(): number {
        return Math.sqrt(this.magnitudeSquared());
    }

    magnitudeSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    add(v: Vec3Like): this {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    subtract(v: Vec3Like): this {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    scale(s: number): this {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    addScaled(v: Vec3Like, s: number): this {
        this.x += v.x * s;
        this.y += v.y * s;
        this.z += v.z * s;
        return this;
    }

    componentWiseProduct(v: Vec3Like): this {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    dot(v: Vec3Like): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v: Vec3Like): this {
        const ax = this.x,
            ay = this.y,
            az = this.z;
        const bx = v.x,
            by = v.y,
            bz = v.z;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }

    static cross(v1: Vec3Like, v2: Vec3Like): Vec3 {
        return new Vec3(
            v1.y * v2.z - v1.z * v2.y,
            v1.z * v2.x - v1.x * v2.z,
            v1.x * v2.y - v1.y * v2.x,
        );
    }

    /**
     *
     * @returns This vector normalized (magnitude of 1). If the magnitude of this vector is 0, it returns the zero vector.
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
