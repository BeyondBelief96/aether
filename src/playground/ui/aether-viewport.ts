import { LitElement, css, html } from "lit";
import {
    AxesHelper,
    Color,
    DirectionalLight,
    GridHelper,
    HemisphereLight,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Vec3Like } from "aether-physics";
import type { DemoView } from "../demos/types";

const DEFAULT_CAMERA_POSITION: Readonly<Vec3Like> = Object.freeze({ x: 6, y: 5, z: 8 });
const DEFAULT_CAMERA_TARGET: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 });

/**
 * The Three.js canvas. It owns the renderer, camera and orbit controls, but
 * not the animation loop: `aether-app` calls `draw()` once per frame after the
 * physics has stepped.
 */
export class AetherViewport extends LitElement {
    static override styles = css`
        :host {
            display: block;
            position: relative;
            min-width: 0;
            min-height: 0;
            overflow: hidden;
            background: var(--viewport-bg);
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
            touch-action: none;
        }
    `;

    readonly scene = new Scene();
    readonly camera = new PerspectiveCamera(50, 1, 0.1, 500);

    #renderer: WebGLRenderer | null = null;
    #controls: OrbitControls | null = null;
    #target = new Vector3();
    #resizeObserver = new ResizeObserver(() => this.#resize());

    /** Handed to each demo's `mount`. */
    readonly view: DemoView = {
        camera: this.camera,
        element: this,
        setOrbitEnabled: (enabled) => {
            if (this.#controls) this.#controls.enabled = enabled;
        },
        setCamera: (position, target) => this.#setCamera(position, target),
    };

    constructor() {
        super();
        this.scene.background = new Color(0x15181d);
        this.scene.add(
            new HemisphereLight(0xdfe8ff, 0x20242b, 1.5),
            new GridHelper(40, 40, 0x3a4250, 0x262b33),
            new AxesHelper(1.5),
        );
        const sun = new DirectionalLight(0xffffff, 2);
        sun.position.set(5, 10, 7);
        this.scene.add(sun);
        this.resetCamera();
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.#resizeObserver.observe(this);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#resizeObserver.disconnect();
        this.#controls?.dispose();
        this.#renderer?.dispose();
        this.#controls = null;
        this.#renderer = null;
    }

    override firstUpdated(): void {
        const canvas = this.renderRoot.querySelector("canvas") as HTMLCanvasElement;
        this.#renderer = new WebGLRenderer({ canvas, antialias: true });
        this.#controls = new OrbitControls(this.camera, canvas);
        this.#controls.target.copy(this.#target);
        this.#controls.enableDamping = true;
        this.#resize();
    }

    /** Restores the default camera position and orbit target. */
    resetCamera(): void {
        this.#setCamera(DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET);
    }

    #setCamera(position: Vec3Like, target: Vec3Like): void {
        this.camera.position.copy(position);
        this.#target.copy(target);
        this.#controls?.target.copy(target);
    }

    /** Render one frame. */
    draw(): void {
        if (!this.#renderer) return;
        this.#controls?.update();
        this.#renderer.render(this.scene, this.camera);
    }

    #resize(): void {
        const { clientWidth: width, clientHeight: height } = this;
        if (!this.#renderer || width === 0 || height === 0) return;
        this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.#renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    override render() {
        return html`<canvas></canvas>`;
    }
}

customElements.define("aether-viewport", AetherViewport);

declare global {
    interface HTMLElementTagNameMap {
        "aether-viewport": AetherViewport;
    }
}
