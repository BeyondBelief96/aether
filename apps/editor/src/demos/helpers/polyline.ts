import { BufferAttribute, BufferGeometry, Line, type Material } from "three";
import type { Vec3Like } from "aether-physics";

/**
 * A line through up to `capacity` points, rewritten in place without allocating. Use for
 * trails, coils and anything else whose shape changes while the demo runs.
 */
export class Polyline extends Line<BufferGeometry, Material> {
    readonly capacity: number;
    #positions: BufferAttribute;

    constructor(capacity: number, material: Material) {
        const positions = new BufferAttribute(new Float32Array(capacity * 3), 3);
        super(new BufferGeometry().setAttribute("position", positions), material);
        this.capacity = capacity;
        this.#positions = positions;
        this.geometry.setDrawRange(0, 0);
        // The shape changes every frame, so a cached bounding sphere would go stale.
        this.frustumCulled = false;
    }

    /** Sets point `index`. Call `setCount` to choose how many points are drawn. */
    setPoint(index: number, point: Vec3Like): void {
        this.#positions.setXYZ(index, point.x, point.y, point.z);
        this.#positions.needsUpdate = true;
    }

    /** Draws the first `count` points. */
    setCount(count: number): void {
        this.geometry.setDrawRange(0, count);
    }

    /** Adds `point` after the last drawn point, dropping the oldest when full. For trails. */
    append(point: Vec3Like): void {
        const count = this.geometry.drawRange.count;
        if (count < this.capacity) {
            this.setPoint(count, point);
            this.setCount(count + 1);
            return;
        }
        this.#positions.array.copyWithin(0, 3);
        this.setPoint(this.capacity - 1, point);
    }
}
