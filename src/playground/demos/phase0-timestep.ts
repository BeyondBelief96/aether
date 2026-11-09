import {
    Group,
    Mesh,
    MeshStandardMaterial,
    SphereGeometry,
    TorusGeometry,
    type Material,
    type Object3D,
    type Scene,
} from "three";
import type { Demo, DemoInfo } from "./types";

/**
 * Phase 0: why the renderer interpolates.
 *
 * Two balls orbit at the same angular speed, both driven by the fixed-step
 * loop. The teal ball is drawn between the last two physics states (blended
 * by alpha); the orange ball is drawn at the latest state only. Drop the
 * physics rate to ~10 Hz and the orange ball visibly stutters.
 */

const ANGULAR_SPEED = Math.PI / 2; // rad/s
const HEIGHT = 1;
const SMOOTH_RADIUS = 3;
const RAW_RADIUS = 2;

const TEAL = 0x2bb5a0;
const ORANGE = 0xe8833a;

class TimestepDemo implements Demo {
    #prevAngle = 0;
    #angle = 0;
    #group = new Group();
    #smooth: Mesh;
    #raw: Mesh;

    constructor() {
        const ball = new SphereGeometry(0.3, 32, 16);
        this.#smooth = new Mesh(ball, new MeshStandardMaterial({ color: TEAL }));
        this.#raw = new Mesh(ball, new MeshStandardMaterial({ color: ORANGE }));
        this.#group.add(
            this.#smooth,
            this.#raw,
            orbitRing(SMOOTH_RADIUS, TEAL),
            orbitRing(RAW_RADIUS, ORANGE),
        );
    }

    mount(scene: Scene): void {
        scene.add(this.#group);
        this.sync(1);
    }

    step(dt: number): void {
        this.#prevAngle = this.#angle;
        this.#angle += ANGULAR_SPEED * dt;
    }

    sync(alpha: number): void {
        const blended = this.#prevAngle + (this.#angle - this.#prevAngle) * alpha;
        placeOnOrbit(this.#smooth, blended, SMOOTH_RADIUS);
        placeOnOrbit(this.#raw, this.#angle, RAW_RADIUS);
    }

    unmount(scene: Scene): void {
        scene.remove(this.#group);
        this.#group.traverse((obj) => {
            if (obj instanceof Mesh) {
                obj.geometry.dispose();
                (obj.material as Material).dispose();
            }
        });
    }
}

function orbitRing(radius: number, color: number): Mesh {
    const ring = new Mesh(
        new TorusGeometry(radius, 0.015, 8, 128),
        new MeshStandardMaterial({ color, transparent: true, opacity: 0.35 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = HEIGHT;
    return ring;
}

function placeOnOrbit(obj: Object3D, angle: number, radius: number): void {
    obj.position.set(Math.cos(angle) * radius, HEIGHT, Math.sin(angle) * radius);
}

export const timestepDemo: DemoInfo = {
    id: "timestep",
    title: "Fixed timestep",
    phase: 0,
    summary:
        "Teal is interpolated between physics steps; orange shows only the latest step. " +
        "Lower the physics rate to see why interpolation matters.",
    create: () => new TimestepDemo(),
};
