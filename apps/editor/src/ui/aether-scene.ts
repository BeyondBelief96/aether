import { css, html, LitElement, type PropertyDeclarations } from "lit";
import type { Group, Object3D } from "three";
import type { Vec3Like } from "aether-physics";
import { decodeValues } from "../core/params";
import { DemoSession } from "../core/session";
import { findDemo } from "../demos/registry";
import { DARK, LIGHT, type ScenePalette } from "../stage/palette";
import { Stage } from "../stage/stage";
import { disposeObject } from "../demos/helpers/three";

/** A label pinned to a point in the scene. */
export interface SceneTag {
    readonly at: Readonly<Vec3Like>;
    readonly text: string;
    /** Draws the tag in the muted, dashed style used for things that don't exist yet. */
    readonly ghost?: boolean;
}

const _screen = { x: 0, y: 0 };

function parseCamera(text: string): [Vec3Like, Vec3Like] | null {
    const parts = text
        .trim()
        .split(/\s+/)
        .map((p) => p.split(",").map(Number));
    if (parts.length !== 2 || !parts.every((p) => p.length === 3 && p.every(Number.isFinite)))
        return null;
    const [[x, y, z], [tx, ty, tz]] = parts as [number[], number[]];
    return [
        { x: x!, y: y!, z: z! },
        { x: tx!, y: ty!, z: tz! },
    ];
}

/**
 * One demo running on its own, with no controls: for pages that show the engine at work,
 * such as the landing page. Stops drawing while off screen.
 *
 * Attributes: `demo` (id), `values` (a query string of parameter overrides, as in demo URLs).
 * `set(values)` changes parameters from outside. `decorate` adds objects of the page's own
 * around the demo, rebuilt when the theme changes; `tags` labels points in the scene.
 */
export class AetherScene extends LitElement {
    static override properties: PropertyDeclarations = {
        demo: { type: String },
        values: { type: String },
        label: { type: String },
        warmup: { type: Number },
        camera: { type: String },
        tags: { attribute: false },
    };

    declare demo: string;
    declare values: string;
    declare label: string;
    /** Seconds to simulate before the first frame. */
    declare warmup: number;
    /** Camera override as "x,y,z tx,ty,tz"; the demo's own framing otherwise. */
    declare camera: string;
    declare tags: readonly SceneTag[];
    #decorator: ((palette: ScenePalette) => Object3D) | null = null;

    /** Builds extra scenery around the demo for a palette; called again on theme changes. */
    get decorate(): ((palette: ScenePalette) => Object3D) | null {
        return this.#decorator;
    }

    set decorate(build: ((palette: ScenePalette) => Object3D) | null) {
        this.#decorator = build;
        this.#decorate();
    }

    static override styles = css`
        :host {
            position: relative;
            display: block;
            overflow: hidden;
            background: var(--paper-sunk);
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
            touch-action: pan-y;
        }
        .tag {
            position: absolute;
            top: 0;
            left: 0;
            padding: 3px 7px;
            font: 500 var(--text-label) / 1.2 var(--mono);
            white-space: nowrap;
            color: var(--ink);
            background: color-mix(in srgb, var(--paper) 88%, transparent);
            border-left: 1px solid var(--ink);
            pointer-events: none;
            will-change: transform;
        }
        .tag.ghost {
            color: var(--ink-2);
            border-left: 1px dashed var(--muted);
        }
    `;

    #stage: Stage | null = null;
    #session: DemoSession | null = null;
    #frame = 0;
    #extra: Object3D | null = null;
    #visible = false;
    #drawn = false;
    #scheme = window.matchMedia("(prefers-color-scheme: dark)");
    #resize = new ResizeObserver(() => this.#stage?.resize());
    #intersection = new IntersectionObserver(([entry]) => {
        this.#visible = entry?.isIntersecting ?? false;
    });

    constructor() {
        super();
        this.demo = "";
        this.values = "";
        this.label = "";
        this.warmup = 0;
        this.camera = "";
        this.tags = [];
    }

    /** Changes the running demo's parameters. */
    set(values: Record<string, unknown>): void {
        this.#session?.set(values);
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.#resize.observe(this);
        this.#intersection.observe(this);
        this.#scheme.addEventListener("change", this.#onScheme);
        // Moved in the DOM: disconnecting disposed everything, so start again.
        if (this.hasUpdated && !this.#stage) this.#start();
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#resize.disconnect();
        this.#intersection.disconnect();
        this.#scheme.removeEventListener("change", this.#onScheme);
        cancelAnimationFrame(this.#frame);
        this.#session?.dispose();
        this.#stage?.dispose();
        this.#session = null;
        this.#stage = null;
    }

    protected override firstUpdated(): void {
        this.#start();
    }

    #start(): void {
        const definition = findDemo(this.demo);
        if (!definition) return;
        try {
            this.#stage = new Stage(this.renderRoot.querySelector("canvas")!, this);
        } catch {
            return; // No WebGL: the element keeps its background.
        }
        this.#stage.zoom = false;
        this.#stage.resize();
        this.#stage.setPalette(this.#palette);
        const [position, target] = parseCamera(this.camera) ?? [
            definition.camera.position,
            definition.camera.target,
        ];
        this.#stage.setCamera(position, target);
        this.#decorate();
        this.#session = new DemoSession(
            definition,
            decodeValues(definition.params, new URLSearchParams(this.values)),
            this.#host(),
        );
        if (this.warmup > 0) this.#session.warmup(this.warmup);
        this.#frame = requestAnimationFrame(this.#tick);
    }

    /** Moves the camera, e.g. to frame the decoration as well as the demo. */
    setCamera(position: Vec3Like, target: Vec3Like): void {
        this.#stage?.setCamera(position, target);
    }

    #decorate(): void {
        const stage = this.#stage;
        if (!stage) return;
        if (this.#extra) {
            stage.scene.remove(this.#extra);
            disposeObject(this.#extra);
            this.#extra = null;
        }
        if (!this.#decorator) return;
        this.#extra = this.#decorator(this.#palette);
        stage.scene.add(this.#extra);
    }

    get #palette(): ScenePalette {
        return this.#scheme.matches ? DARK : LIGHT;
    }

    #host() {
        const stage = this.#stage!;
        return {
            view: stage.view,
            palette: this.#palette,
            attach: (root: Group) => stage.scene.add(root),
            detach: (root: Group) => stage.scene.remove(root),
            prepare: (root: Group) => stage.prepare(root),
        };
    }

    #onScheme = (): void => {
        if (!this.#stage || !this.#session) return;
        this.#stage.setPalette(this.#palette);
        this.#session.rehost(this.#host());
        this.#decorate();
    };

    #tick = (now: number): void => {
        this.#frame = requestAnimationFrame(this.#tick);
        // Draw once even off screen, so the scene is never a blank box.
        if (!this.#drawn && this.#session && this.#stage) {
            this.#drawn = true;
            this.#session.frame(now);
            this.#stage.draw();
        }
        if (!this.#visible || !this.#session || !this.#stage) {
            // Restart the clock on return instead of catching up on the time away.
            this.#session?.loop.reset();
            return;
        }
        this.#session.frame(now);
        this.#stage.draw();
        this.#placeTags();
    };

    #placeTags(): void {
        const stage = this.#stage;
        if (!stage) return;
        this.renderRoot.querySelectorAll<HTMLElement>(".tag").forEach((el, i) => {
            const tag = this.tags[i];
            if (!tag || !stage.project(tag.at, _screen)) {
                el.style.visibility = "hidden";
                return;
            }
            el.style.visibility = "";
            // Beside the point, flipped to its left when it would leave the scene.
            const right = _screen.x + 12;
            const x =
                right + el.offsetWidth > this.clientWidth ? _screen.x - 12 - el.offsetWidth : right;
            el.style.transform = `translate(${Math.round(Math.max(0, x))}px, ${Math.round(_screen.y - 10)}px)`;
        });
    }

    protected override render() {
        return html`<canvas role="img" aria-label=${this.label}></canvas> ${this.tags.map(
                (t) =>
                    html`<span class="tag ${t.ghost ? "ghost" : ""}" aria-hidden="true"
                        >${t.text}</span
                    >`,
            )}`;
    }
}

customElements.define("aether-scene", AetherScene);

declare global {
    interface HTMLElementTagNameMap {
        "aether-scene": AetherScene;
    }
}
