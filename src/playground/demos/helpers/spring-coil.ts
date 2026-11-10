import type { Material } from "three";
import { Vec3, type Vec3Like } from "aether-physics";
import { Polyline } from "./polyline";

const POINTS = 120;

// Scratch objects, reused every update.
const _axis = new Vec3();
const _u = new Vec3();
const _v = new Vec3();
const _point = new Vec3();

/**
 * A helix between two points, with a fixed number of turns so the coils bunch up when
 * compressed and spread out when stretched. Pinched at both ends so it meets what it joins.
 */
export class SpringCoil extends Polyline {
    readonly turns: number;
    readonly radius: number;

    constructor(material: Material, turns = 12, radius = 0.15) {
        super(POINTS, material);
        this.turns = turns;
        this.radius = radius;
    }

    /** Redraws the coil from `start` to `end`. Draws nothing if they coincide. */
    update(start: Vec3Like, end: Vec3Like): void {
        _axis.copy(end).subtract(start);
        const length = _axis.magnitude();
        if (length === 0) {
            this.setCount(0);
            return;
        }

        // Any unit vector perpendicular to the axis, then a second one perpendicular to both.
        _axis.scale(1 / length);
        _u.set(0, 0, 1);
        if (Math.abs(_axis.dot(_u)) > 0.9) _u.set(1, 0, 0);
        _u.crossVectors(_axis, _u).normalize();
        _v.crossVectors(_axis, _u);

        for (let i = 0; i < POINTS; i++) {
            const t = i / (POINTS - 1);
            const angle = t * this.turns * 2 * Math.PI;
            const r = this.radius * Math.min(1, 12 * t, 12 * (1 - t));
            _point
                .copy(start)
                .addScaled(_axis, t * length)
                .addScaled(_u, r * Math.cos(angle))
                .addScaled(_v, r * Math.sin(angle));
            this.setPoint(i, _point);
        }
        this.setCount(POINTS);
    }
}
