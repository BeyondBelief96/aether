import {
    ACESFilmicToneMapping,
    Color,
    DirectionalLight,
    Fog,
    GridHelper,
    Group,
    HemisphereLight,
    Mesh,
    PCFSoftShadowMap,
    PerspectiveCamera,
    PlaneGeometry,
    PMREMGenerator,
    Scene,
    ShadowMaterial,
    SRGBColorSpace,
    Vector3,
    WebGLRenderer,
    type Material,
    type Object3D,
    type Texture,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Vec3Like } from "aether-physics";
import type { DemoView } from "../core/demo";
import type { ScenePalette } from "./palette";

const GRID_SIZE = 120; // m
const GRID_DIVISIONS = 120;
/** Fog starts and ends this far from the camera's target, so the floor fades out. */
const FOG_NEAR = 1.2; // × distance to target
const FOG_FAR = 3.2; // × distance to target
const SHADOW_EXTENT = 24; // m, half-width of the area the sun casts shadows over
const SHADOW_MAP_SIZE = 2048;
/** Below this width-to-height ratio the camera backs off, so wide scenes still fit. */
const FIT_ASPECT = 1.25;

const _projected = new Vector3();

/** Whether a mesh should cast and receive shadows: solid, opaque surfaces only. */
function isSolid(obj: Object3D): obj is Mesh {
    if (!(obj instanceof Mesh)) return false;
    const materials: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    return materials.every((m) => !m.transparent && m.depthTest);
}

/**
 * The Three.js side of the viewport: renderer, camera, orbit controls and the shared scenery.
 * Every demo gets the same light, soft shadows, a ground that catches them, and a horizon that
 * fades into the background. Draws only when asked; the simulation decides when a frame is due.
 */
export class Stage {
    readonly scene = new Scene();
    readonly camera = new PerspectiveCamera(42, 1, 0.1, 600);
    readonly view: DemoView;

    #renderer: WebGLRenderer;
    #controls: OrbitControls;
    #scenery = new Group();
    #environment: Texture;
    #fog = new Fog(0xffffff, 30, 90);
    #element: HTMLElement;
    #width = 0;
    #height = 0;
    #framing: { position: Vector3; target: Vector3 } | null = null;

    constructor(canvas: HTMLCanvasElement, element: HTMLElement) {
        this.#element = element;
        this.#renderer = new WebGLRenderer({ canvas, antialias: true });
        this.#renderer.outputColorSpace = SRGBColorSpace;
        this.#renderer.toneMapping = ACESFilmicToneMapping;
        this.#renderer.toneMappingExposure = 1.05;
        this.#renderer.shadowMap.enabled = true;
        this.#renderer.shadowMap.type = PCFSoftShadowMap;

        const pmrem = new PMREMGenerator(this.#renderer);
        this.#environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
        this.scene.environment = this.#environment;
        this.scene.environmentIntensity = 0.35;
        this.scene.fog = this.#fog;

        this.#controls = new OrbitControls(this.camera, canvas);
        this.#controls.enableDamping = true;
        this.#controls.maxPolarAngle = Math.PI * 0.495; // stay above the ground
        this.#controls.addEventListener("change", () => this.#fitFog());
        this.scene.add(this.#scenery);
        this.view = {
            camera: this.camera,
            element,
            setOrbitEnabled: (enabled) => {
                this.#controls.enabled = enabled;
            },
        };
    }

    /** Rebuilds the background, ground, grid and lights for `palette`. */
    setPalette(palette: ScenePalette): void {
        this.scene.background = new Color(palette.ground);
        this.#fog.color.setHex(palette.ground);
        for (const child of [...this.#scenery.children]) {
            this.#scenery.remove(child);
            child.traverse((obj) => {
                if (obj instanceof Mesh || obj instanceof GridHelper) {
                    obj.geometry.dispose();
                    (obj.material as Material).dispose();
                }
            });
        }

        const light = palette.theme === "light";
        const sun = new DirectionalLight(0xffffff, light ? 2.4 : 2.1);
        sun.position.set(8, 16, 10);
        sun.castShadow = true;
        sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
        sun.shadow.radius = 6;
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.02;
        const cam = sun.shadow.camera;
        cam.left = cam.bottom = -SHADOW_EXTENT;
        cam.right = cam.top = SHADOW_EXTENT;
        cam.near = 1;
        cam.far = 80;

        const ground = new Mesh(
            new PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2),
            new ShadowMaterial({ color: 0x000000, opacity: light ? 0.12 : 0.45 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;

        const grid = new GridHelper(
            GRID_SIZE,
            GRID_DIVISIONS,
            palette.gridMajor,
            palette.gridMinor,
        );
        grid.position.y = 0.002;

        this.#scenery.add(
            new HemisphereLight(0xffffff, light ? 0xc9c6bc : 0x26251f, light ? 1.3 : 1.1),
            sun,
            ground,
            grid,
        );
    }

    /** Turns on shadows for the solid meshes under `root`. */
    prepare(root: Object3D): void {
        root.traverse((obj) => {
            if (!isSolid(obj)) return;
            obj.castShadow = true;
            obj.receiveShadow = true;
        });
    }

    /** Scroll-to-zoom; off where the stage sits inside a scrolling page. */
    set zoom(enabled: boolean) {
        this.#controls.enableZoom = enabled;
    }

    /**
     * Frames the scene from `position` toward `target`. On narrow, portrait-ish stages the camera
     * backs off along the same line so the scene keeps its width.
     */
    setCamera(position: Vec3Like, target: Vec3Like): void {
        this.#framing = {
            position: new Vector3().copy(position),
            target: new Vector3().copy(target),
        };
        this.#applyFraming();
    }

    #applyFraming(): void {
        const framing = this.#framing;
        if (!framing) return;
        const aspect = this.#height > 0 ? this.#width / this.#height : FIT_ASPECT;
        const back = aspect < FIT_ASPECT ? (FIT_ASPECT / aspect) ** 0.75 : 1;
        this.camera.position.copy(framing.target).lerp(framing.position, back);
        this.#controls.target.copy(framing.target);
        this.#controls.update();
        this.#fitFog();
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
        this.#applyFraming();
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
        this.#environment.dispose();
        this.#renderer.dispose();
    }

    /** Keeps the fade at the same place on screen however far the camera zooms. */
    #fitFog(): void {
        const distance = this.camera.position.distanceTo(this.#controls.target);
        this.#fog.near = distance * FOG_NEAR;
        this.#fog.far = distance * FOG_FAR;
    }
}
