import { LitElement, css, html } from "lit";
import { demos } from "../demos/registry";
import type { Demo } from "../demos/types";
import { FixedStepLoop, type FrameResult } from "aether-physics";
import type { LoopStats } from "./aether-sidebar";
import "./aether-sidebar";
import "./aether-viewport";

/** How often the sidebar's stats refresh. */
const STATS_INTERVAL_MS = 250;

/**
 * Top-level shell. Owns the animation frame, the fixed-step loop and the
 * current demo. Each frame: step the physics, sync meshes, draw.
 */
export class AetherApp extends LitElement {
    static override properties = {
        demoId: { state: true },
        paused: { state: true },
        hz: { state: true },
        timeScale: { state: true },
        stats: { state: true },
        panel: { state: true },
    };

    declare demoId: string;
    declare paused: boolean;
    declare hz: number;
    declare timeScale: number;
    declare stats: LoopStats;
    declare panel: HTMLElement | null;

    static override styles = css`
        :host {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 300px;
            height: 100dvh;
        }
        @media (max-width: 720px) {
            :host {
                grid-template-columns: 1fr;
                grid-template-rows: 60dvh auto;
                height: auto;
            }
            aether-sidebar {
                border-left: none;
                border-top: 1px solid var(--border);
            }
        }
    `;

    #loop = new FixedStepLoop(60);
    #demo: Demo | null = null;
    #frameHandle = 0;
    #window = { start: 0, frames: 0, steps: 0, dropped: false };

    constructor() {
        super();
        this.demoId = demos[0]?.id ?? "";
        this.paused = false;
        this.hz = this.#loop.hz;
        this.timeScale = this.#loop.timeScale;
        this.stats = {
            fps: 0,
            stepsPerFrame: 0,
            simTime: 0,
            droppedTime: false,
        };
        this.panel = null;
    }

    get #viewport() {
        return this.renderRoot.querySelector("aether-viewport");
    }

    override connectedCallback(): void {
        super.connectedCallback();
        window.addEventListener("keydown", this.#onKey);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        window.removeEventListener("keydown", this.#onKey);
        cancelAnimationFrame(this.#frameHandle);
        const scene = this.#viewport?.scene;
        if (scene) this.#demo?.unmount(scene);
        this.#demo = null;
    }

    override firstUpdated(): void {
        this.#loadDemo(this.demoId);
        this.#frameHandle = requestAnimationFrame(this.#tick);
    }

    #tick = (now: number): void => {
        this.#frameHandle = requestAnimationFrame(this.#tick);
        const demo = this.#demo;
        const result = this.#loop.advance(now, (dt) => demo?.step(dt));
        demo?.sync(result.alpha);
        this.#viewport?.draw();
        this.#recordStats(now, result);
    };

    #recordStats(now: number, result: FrameResult): void {
        const w = this.#window;
        if (w.start === 0) w.start = now;
        w.frames++;
        w.steps += result.steps;
        w.dropped ||= result.droppedTime;

        const elapsed = now - w.start;
        if (elapsed < STATS_INTERVAL_MS) return;
        this.stats = {
            fps: (w.frames * 1000) / elapsed,
            stepsPerFrame: w.steps / w.frames,
            simTime: this.#loop.simTime,
            droppedTime: w.dropped,
        };
        this.#window = { start: now, frames: 0, steps: 0, dropped: false };
    }

    #loadDemo(id: string): void {
        const info = demos.find((d) => d.id === id);
        const viewport = this.#viewport;
        if (!info || !viewport) return;
        this.#demo?.unmount(viewport.scene);
        viewport.resetCamera();
        this.#demo = info.create();
        this.#demo.mount(viewport.scene, viewport.view);
        this.panel = this.#demo.panel ?? null;
        this.#loop.reset();
        this.demoId = id;
    }

    #togglePause(): void {
        this.paused = !this.paused;
        this.#loop.paused = this.paused;
    }

    #onKey = (e: KeyboardEvent): void => {
        // Let focused controls keep their own keys (Space on a button already clicks it).
        const target = e.composedPath()[0];
        if (target instanceof HTMLElement && target.matches("button, input, select, textarea"))
            return;
        if (e.key === " ") {
            e.preventDefault();
            this.#togglePause();
        } else if (e.key === "." && this.paused) {
            this.#loop.stepOnce();
        } else if (e.key === "r" || e.key === "R") {
            this.#loadDemo(this.demoId);
        }
    };

    override render() {
        return html`
            <aether-viewport></aether-viewport>
            <aether-sidebar
                .demos=${demos}
                .demoId=${this.demoId}
                .paused=${this.paused}
                .hz=${this.hz}
                .timeScale=${this.timeScale}
                .stats=${this.stats}
                .panel=${this.panel}
                @demo-change=${(e: CustomEvent<string>) => this.#loadDemo(e.detail)}
                @toggle-pause=${() => this.#togglePause()}
                @step-once=${() => this.#loop.stepOnce()}
                @reset=${() => this.#loadDemo(this.demoId)}
                @hz-change=${(e: CustomEvent<number>) => {
                    this.#loop.hz = e.detail;
                    this.hz = e.detail;
                }}
                @time-scale-change=${(e: CustomEvent<number>) => {
                    this.#loop.timeScale = e.detail;
                    this.timeScale = e.detail;
                }}
            ></aether-sidebar>
        `;
    }
}

customElements.define("aether-app", AetherApp);

declare global {
    interface HTMLElementTagNameMap {
        "aether-app": AetherApp;
    }
}
