import { Mesh, Vector3, type BufferGeometry, type Material } from "three";
import type { Vec3Like } from "aether-physics";

const _from = new Vector3();
const _axis = new Vector3();
const _up = new Vector3(0, 1, 0);

/**
 * A mesh stretched between two points, for rods, cables, logs and beams. Its geometry is one
 * unit long along y and centred on the origin, as Three.js builds cylinders and boxes, so one
 * geometry serves every strut of the same thickness.
 */
export class Strut extends Mesh<BufferGeometry, Material> {
    constructor(geometry: BufferGeometry, material: Material) {
        super(geometry, material);
        this.castShadow = true;
    }

    /** Moves the strut to run from `a` to `b`. Keeps its last direction if they coincide. */
    place(a: Vec3Like, b: Vec3Like): void {
        _from.set(a.x, a.y, a.z);
        _axis.set(b.x, b.y, b.z).sub(_from);
        const length = _axis.length();
        this.position.copy(_from).addScaledVector(_axis, 0.5);
        this.scale.set(1, length, 1);
        if (length > 0) this.quaternion.setFromUnitVectors(_up, _axis.divideScalar(length));
    }
}
