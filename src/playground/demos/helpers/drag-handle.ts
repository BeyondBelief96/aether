import { Raycaster, Vector2, type Object3D, type Ray } from "three";
import type { DemoView } from "../types";

/**
 * Lets the user drag `target` in the viewport. Pressing on it turns orbiting off and
 * captures the pointer; each move then calls `onDrag` with the pointer's world-space ray.
 * What the ray means (a point on a plane, on a sphere, ...) is up to the caller.
 *
 * Hit-testing ignores depth, so the target can be grabbed through other meshes.
 */
export class DragHandle {
    readonly #view: DemoView;
    readonly #target: Object3D;
    readonly #onDrag: (ray: Ray) => void;

    #raycaster = new Raycaster();
    #pointer = new Vector2(); // normalized device coordinates, -1 to 1
    #dragging: number | null = null; // id of the pointer doing the dragging

    constructor(view: DemoView, target: Object3D, onDrag: (ray: Ray) => void) {
        this.#view = view;
        this.#target = target;
        this.#onDrag = onDrag;

        const el = view.element;
        // Capture phase: runs before OrbitControls' listener on the canvas inside.
        el.addEventListener("pointerdown", this.#onDown, { capture: true });
        el.addEventListener("pointermove", this.#onMove);
        el.addEventListener("pointerup", this.#onUp);
        el.addEventListener("pointercancel", this.#onUp);
    }

    /** Removes the listeners. Call from the demo's `unmount`. */
    dispose(): void {
        const el = this.#view.element;
        el.removeEventListener("pointerdown", this.#onDown, { capture: true });
        el.removeEventListener("pointermove", this.#onMove);
        el.removeEventListener("pointerup", this.#onUp);
        el.removeEventListener("pointercancel", this.#onUp);
        if (this.#dragging !== null) this.#end();
        el.style.cursor = "";
    }

    /** Points the raycaster's ray from the camera through the pointer. */
    #castRay(e: PointerEvent): Ray {
        const rect = this.#view.element.getBoundingClientRect();
        this.#pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1, // screen y points down
        );
        this.#raycaster.setFromCamera(this.#pointer, this.#view.camera);
        return this.#raycaster.ray;
    }

    #hits(e: PointerEvent): boolean {
        if (!this.#target.visible) return false;
        this.#castRay(e);
        return this.#raycaster.intersectObject(this.#target).length > 0;
    }

    #onDown = (e: PointerEvent): void => {
        if (e.button !== 0 || this.#dragging !== null || !this.#hits(e)) return;
        this.#dragging = e.pointerId;
        this.#view.element.setPointerCapture(e.pointerId);
        this.#view.setOrbitEnabled(false);
        this.#view.element.style.cursor = "grabbing";
    };

    #onMove = (e: PointerEvent): void => {
        if (this.#dragging === null) {
            // Not dragging: just show whether a press here would grab.
            this.#view.element.style.cursor = this.#hits(e) ? "grab" : "";
            return;
        }
        if (e.pointerId !== this.#dragging) return;
        this.#onDrag(this.#castRay(e));
    };

    #onUp = (e: PointerEvent): void => {
        if (e.pointerId === this.#dragging) this.#end();
    };

    #end(): void {
        const el = this.#view.element;
        if (this.#dragging !== null && el.hasPointerCapture(this.#dragging)) {
            el.releasePointerCapture(this.#dragging);
        }
        this.#dragging = null;
        this.#view.setOrbitEnabled(true);
        el.style.cursor = "";
    }
}
