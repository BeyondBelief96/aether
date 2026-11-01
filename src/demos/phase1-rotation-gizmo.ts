import {
    BoxGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    SphereGeometry,
    type Ray,
    type Scene,
} from "three";
import { Quaternion, Vec3, type Vec3Like } from "../math";
import "../ui/panels/gizmo-panel";
import { ACCENT, AXIS_COLORS, MUTED } from "./helpers/colors";
import { DragHandle } from "./helpers/drag-handle";
import { disposeObject } from "./helpers/three";
import { VectorArrow } from "./helpers/vector-arrow";
import type { Demo, DemoInfo, DemoView } from "./types";

/**
 * Phase 1: quaternions, and why engines don't store Euler angles.
 *
 * An axis and an angle drive a quaternion; the box and its basis arrows are drawn from
 * it. The axis can be typed, picked from presets, or dragged by its arrow tip.
 */

const CENTER: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 }); // m
const BODY_SIZE: Readonly<Vec3Like> = Object.freeze({ x: 1.2, y: 0.6, z: 0.3 }); // m
const ARROW_LENGTH = 1.5; // m
const AXIS_ARROW_LENGTH = 2; // m
const HANDLE_RADIUS = 0.12; // m

const ORIGIN: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 0 });
const UNIT_X: Readonly<Vec3Like> = Object.freeze({ x: 1, y: 0, z: 0 });
const UNIT_Y: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 });
const UNIT_Z: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 1 });
const UNITS = [UNIT_X, UNIT_Y, UNIT_Z] as const;

// Scratch objects, reused every update.
const _basis = new Vec3();
const _axisDir = new Vec3();
const _rayOrigin = new Vec3();
const _tip = new Vec3();
const _near = new Vec3();
const _far = new Vec3();

class RotationGizmoDemo implements Demo {
    readonly panel = document.createElement("aether-gizmo-panel");

    // Input state. The panel shows it; the demo owns it.
    /** Any non-zero vector, kept as the user typed it. Normalized wherever it's used. */
    #axis: Vec3Like = { x: 0, y: 1, z: 0 };
    #angle = 0; // rad

    // Derived state: the one orientation everything else is drawn from.
    #q = new Quaternion();
    #dirty = true;

    // View.
    #group = new Group();
    #body: Mesh;
    #bodyAxisArrows = [
        new VectorArrow(AXIS_COLORS.x),
        new VectorArrow(AXIS_COLORS.y),
        new VectorArrow(AXIS_COLORS.z),
    ];
    #rotationAxisArrow = new VectorArrow(MUTED);
    /** The grab point at the tip of the rotation axis arrow. */
    #axisHandle = new Mesh(
        new SphereGeometry(HANDLE_RADIUS, 16, 12),
        new MeshBasicMaterial({ color: MUTED, depthTest: false }),
    );
    #drag: DragHandle | null = null;

    constructor() {
        this.#group.position.copy(CENTER);
        this.#body = new Mesh(
            new BoxGeometry(BODY_SIZE.x, BODY_SIZE.y, BODY_SIZE.z),
            new MeshStandardMaterial({ color: ACCENT }),
        );
        this.#axisHandle.renderOrder = 1; // drawn on top, like the arrows
        this.#group.add(
            this.#body,
            ...this.#bodyAxisArrows,
            this.#rotationAxisArrow,
            this.#axisHandle,
        );

        this.#pushInputs();
        this.panel.addEventListener("angle-change", (e) => {
            this.#angle = (e as CustomEvent<number>).detail;
            this.#pushInputs();
        });
        this.panel.addEventListener("axis-change", (e) => {
            this.#axis = (e as CustomEvent<Vec3Like>).detail;
            this.#pushInputs();
        });
    }

    /** Passes the input state back to the panel (its inputs are controlled) and marks dirty. */
    #pushInputs(): void {
        this.panel.axis = this.#axis;
        this.panel.angle = this.#angle;
        this.#dirty = true;
    }

    /**
     * Points the axis at where the pointer's ray meets the sphere the handle moves on
     * (centered on the box, radius AXIS_ARROW_LENGTH).
     *
     * A ray that crosses a sphere crosses it twice, front and back. The crossing nearer
     * the current tip wins, so the tip can be dragged over the edge to the far side. A ray
     * that misses uses its closest approach to the center, which keeps the tip on the
     * sphere's outline instead of stopping dead.
     */
    #dragAxis(ray: Ray): void {
        const r = AXIS_ARROW_LENGTH;
        // Solve |o + t·d|² = r², with o relative to the sphere center and d unit length:
        // t² + 2bt + c = 0, where b = o·d and c = |o|² − r².
        const o = _rayOrigin.copy(ray.origin).subtract(CENTER);
        const d = ray.direction;
        const b = o.dot(d);
        const c = o.magnitudeSquared() - r * r;
        const discriminant = b * b - c;

        let hit: Vec3;
        if (discriminant < 0) {
            hit = _near.copy(o).addScaled(d, -b); // closest point to the center
        } else {
            const s = Math.sqrt(discriminant);
            _near.copy(o).addScaled(d, -b - s);
            _far.copy(o).addScaled(d, -b + s);
            _tip.copy(this.#axis).normalize().scale(r);
            hit = _near.distanceToSquared(_tip) <= _far.distanceToSquared(_tip) ? _near : _far;
        }

        if (hit.magnitudeSquared() < 1e-12) return; // ray straight through the center
        hit.normalize();
        this.#axis = { x: hit.x, y: hit.y, z: hit.z };
        this.#pushInputs();
    }

    mount(scene: Scene, view: DemoView): void {
        scene.add(this.#group);
        this.#drag = new DragHandle(view, this.#axisHandle, (ray) => this.#dragAxis(ray));
        this.sync(1);
    }

    step(_dt: number): void {
        // Nothing to simulate: the orientation comes straight from the inputs.
    }

    sync(_alpha: number): void {
        if (!this.#dirty) return; // inputs only change on user events
        this.#dirty = false;

        this.#updateQuaternion();
        this.#updateView();
        this.#updateReadouts();
    }

    #updateQuaternion(): void {
        this.#q.setFromAxisAngle(this.#axis, this.#angle); // normalizes the axis itself
    }

    #updateView(): void {
        this.#body.quaternion.copy(this.#q);
        this.#bodyAxisArrows.forEach((arrow, i) => {
            this.#q.rotateVec3(UNITS[i]!, _basis);
            arrow.update(ORIGIN, _basis, ARROW_LENGTH);
        });

        // The arrow's length comes from the vector, so draw it from the unit axis.
        _axisDir.copy(this.#axis).normalize();
        this.#rotationAxisArrow.update(ORIGIN, _axisDir, AXIS_ARROW_LENGTH);
        this.#axisHandle.position.copy(_axisDir).multiplyScalar(AXIS_ARROW_LENGTH);
    }

    #updateReadouts(): void {
        // Lit compares properties by identity, so every readout gets a fresh object.
        const q = this.#q;
        this.panel.quaternion = { w: q.w, x: q.x, y: q.y, z: q.z };
    }

    unmount(scene: Scene): void {
        this.#drag?.dispose();
        this.#drag = null;
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

export const rotationGizmoDemo: DemoInfo = {
    id: "rotation-gizmo",
    title: "Rotation gizmo",
    phase: 1,
    summary: "Set an axis (type it, pick a preset, or drag the gray tip), then drag the angle.",
    create: () => new RotationGizmoDemo(),
};
