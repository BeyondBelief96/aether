import type { Camera, Scene } from "three";
import type { Vec3Like } from "aether-physics";

/**
 * A self-contained scene that exercises one phase of the engine.
 *
 * Demos are the only code that touches both the engine and Three.js: they own
 * the meshes and copy simulation state onto them in `sync`.
 */
export interface Demo {
    /**
     * Add meshes, lights and helpers to the scene. `view` is only needed by demos that
     * react to the pointer in the viewport.
     */
    mount(scene: Scene, view: DemoView): void;
    /** Advance the simulation by one fixed step of `dt` seconds. */
    step(dt: number): void;
    /** Copy simulation state onto meshes, blending previous and current state by `alpha`. */
    sync(alpha: number): void;
    /** Remove everything `mount` added and free GPU resources. */
    unmount(scene: Scene): void;
    /**
     * Controls and readouts for this demo, shown in the sidebar. The demo creates it,
     * listens to its events, and pushes readouts into its properties.
     */
    readonly panel?: HTMLElement;
}

/** What a demo may use of the viewport, beyond the scene. */
export interface DemoView {
    readonly camera: Camera;
    /** The viewport element. Pointer events from its canvas bubble up to it. */
    readonly element: HTMLElement;
    /** Turns camera orbiting off while a demo drags something, and back on after. */
    setOrbitEnabled(enabled: boolean): void;
    /** Moves the camera and its orbit target. The app restores the default before each `mount`. */
    setCamera(position: Vec3Like, target: Vec3Like): void;
}

export interface DemoInfo {
    id: string;
    title: string;
    phase: number;
    summary: string;
    create(): Demo;
}
