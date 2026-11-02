import { ArrowHelper, Material, Vector3 } from "three";
import { type Vec3Like, clamp } from "aether";

const _dir = new Vector3();

/**
 * An arrow from `origin` along `vector`, with the arrow's length equal to the vector's
 * magnitude. Wraps Three.js's ArrowHelper so callers can pass engine types.
 *
 * Drawn on top of meshes, so the part inside a body stays visible.
 */
export class VectorArrow extends ArrowHelper {
    static readonly MIN_LENGTH = 1e-4;

    constructor(color: number) {
        super(new Vector3(1, 0, 0), new Vector3(), 1, color);
        for (const part of [this.line, this.cone]) {
            (part.material as Material).depthTest = false;
            part.renderOrder = 1;
        }
    }

    update(origin: Vec3Like, vector: Vec3Like, scale = 1): void {
        _dir.copy(vector);
        const length = _dir.length() * scale;
        this.visible = length > VectorArrow.MIN_LENGTH;
        if (!this.visible) return;
        this.position.copy(origin);
        this.setDirection(_dir.normalize());
        const headLength = clamp(0.2 * length, 0.05, 0.25);
        this.setLength(length, headLength, 0.5 * headLength);
    }
}
