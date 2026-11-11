import { Raycaster, Vector2, type Intersection, type Object3D } from "three";
import type { DemoView } from "../../core/demo";

/**
 * Calls `onTap` with the hit when the user presses on `target` in the viewport. A press that
 * lands on the target turns orbiting off until the pointer is released, so a tap does not also
 * turn the camera. Presses elsewhere orbit as usual.
 */
export class TapHandle {
    readonly #view: DemoView;
    readonly #target: Object3D;
    readonly #onTap: (hit: Intersection) => void;

    #raycaster = new Raycaster();
    #pointer = new Vector2(); // normalized device coordinates, -1 to 1
    #pressed: number | null = null;

    constructor(view: DemoView, target: Object3D, onTap: (hit: Intersection) => void) {
        this.#view = view;
        this.#target = target;
        this.#onTap = onTap;
        const el = view.element;
        // Capture phase: runs before OrbitControls' listener on the canvas inside.
        el.addEventListener("pointerdown", this.#onDown, { capture: true });
        el.addEventListener("pointermove", this.#onMove);
        el.addEventListener("pointerup", this.#onUp);
        el.addEventListener("pointercancel", this.#onUp);
        el.addEventListener("lostpointercapture", this.#onUp);
    }

    dispose(): void {
        const el = this.#view.element;
        el.removeEventListener("pointerdown", this.#onDown, { capture: true });
        el.removeEventListener("pointermove", this.#onMove);
        el.removeEventListener("pointerup", this.#onUp);
        el.removeEventListener("pointercancel", this.#onUp);
        el.removeEventListener("lostpointercapture", this.#onUp);
        if (this.#pressed !== null) this.#view.setOrbitEnabled(true);
        el.style.cursor = "";
    }

    #hit(e: PointerEvent): Intersection | undefined {
        const rect = this.#view.element.getBoundingClientRect();
        this.#pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1, // screen y points down
        );
        this.#raycaster.setFromCamera(this.#pointer, this.#view.camera);
        return this.#raycaster.intersectObject(this.#target)[0];
    }

    #onDown = (e: PointerEvent): void => {
        if (e.button !== 0 || this.#pressed !== null) return;
        const hit = this.#hit(e);
        if (!hit) return;
        this.#pressed = e.pointerId;
        // Captured, so the release reaches us even if it happens outside the viewport.
        this.#view.element.setPointerCapture(e.pointerId);
        this.#view.setOrbitEnabled(false);
        this.#onTap(hit);
    };

    #onMove = (e: PointerEvent): void => {
        if (this.#pressed === null) {
            this.#view.element.style.cursor = this.#hit(e) ? "pointer" : "";
        }
    };

    #onUp = (e: PointerEvent): void => {
        if (e.pointerId !== this.#pressed) return;
        this.#pressed = null;
        const el = this.#view.element;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        this.#view.setOrbitEnabled(true);
    };
}
