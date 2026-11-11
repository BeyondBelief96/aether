import {
    Color,
    DirectionalLight,
    GridHelper,
    Group,
    HemisphereLight,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Vec3Like } from "aether-physics";
import type { DemoView } from "../core/demo";
import type { ScenePalette } from "./palette";

const GRID_SIZE = 40; // m
const _projected = new Vector3();

/**
 * The Three.js side of the viewport: renderer, camera, orbit controls and the shared scenery.
 * Draws only when asked; the simulation decides when a frame is due.
 */
export class Stage {
    readonly scene = new Scene();
    readonly camera = new PerspectiveCamera(45, 1, 0.1, 500);
    readonly view: DemoView;

    #renderer: WebGLRenderer;
    #controls: OrbitControls;
    #scenery = new Group();
    #element: HTMLElement;
    #width = 0;
    #height = 0;

    constructor(canvas: HTMLCanvasElement, element: HTMLElement) {
        this.#element = element;
        this.#renderer = new WebGLRenderer({ canvas, antialias: true });
        this.#controls = new OrbitControls(this.camera, canvas);
        this.#controls.enableDamping = true;
        this.scene.add(this.#scenery);
        this.view = {
            camera: this.camera,
            element,
            setOrbitEnabled: (enabled) => {
                this.#controls.enabled = enabled;
            },
        };
    }

    /** Rebuilds the background, grid and lights for `palette`. */
    setPalette(palette: ScenePalette): void {
        this.scene.background = new Color(palette.ground);
        for (const child of [...this.#scenery.children]) {
            this.#scenery.remove(child);
            if (child instanceof GridHelper) {
                child.geometry.dispose();
                child.dispose();
            }
        }
        const light = palette.theme === "light";
        const sun = new DirectionalLight(0xffffff, light ? 2.2 : 2);
        sun.position.set(5, 10, 7);
        this.#scenery.add(
            new HemisphereLight(0xffffff, light ? 0xb8b6ae : 0x2a2a27, light ? 1.6 : 1.4),
            sun,
            new GridHelper(GRID_SIZE, GRID_SIZE, palette.gridMajor, palette.gridMinor),
        );
    }

    setCamera(position: Vec3Like, target: Vec3Like): void {
        this.camera.position.copy(position);
        this.#controls.target.copy(target);
        this.#controls.update();
    }

    /** Matches the drawing buffer to the element's size. */
    resize(): void {
        const width = this.#element.clientWidth;
        const height = this.#element.clientHeight;
        if (width === 0 || height === 0 || (width === this.#width && height === this.#height))
            return;
        this.#width = width;
        this.#height = height;
        this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.#renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    draw(): void {
        this.#controls.update();
        this.#renderer.render(this.scene, this.camera);
    }

    /**
     * Projects a world point to CSS pixels in the element. Returns `false` when the point is
     * behind the camera.
     */
    project(point: Vec3Like, out: { x: number; y: number }): boolean {
        _projected.copy(point).project(this.camera);
        if (_projected.z > 1) return false;
        out.x = ((_projected.x + 1) / 2) * this.#width;
        out.y = ((1 - _projected.y) / 2) * this.#height;
        return true;
    }

    dispose(): void {
        this.#controls.dispose();
        this.#renderer.dispose();
    }
}
