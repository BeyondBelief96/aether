import { LitElement, css, html, nothing } from "lit";
import type { DemoInfo } from "../demos/types";
import { panelStyles } from "./shared-styles";
import "./controls/aether-slider";

export interface LoopStats {
    fps: number;
    stepsPerFrame: number;
    simTime: number;
    droppedTime: boolean;
}

/**
 * Controls and readouts. Holds no simulation state of its own: everything
 * comes in as properties, and every user action goes out as a bubbling event
 * for `aether-app` to handle.
 *
 * Events: `demo-change` (detail: id), `toggle-pause`, `step-once`, `reset`,
 * `hz-change` (detail: number), `time-scale-change` (detail: number).
 */
export class AetherSidebar extends LitElement {
    static override properties = {
        demos: { attribute: false },
        demoId: { attribute: false },
        paused: { type: Boolean },
        hz: { type: Number },
        timeScale: { attribute: false },
        stats: { attribute: false },
        panel: { attribute: false },
    };

    declare demos: readonly DemoInfo[];
    declare demoId: string;
    declare paused: boolean;
    declare hz: number;
    declare timeScale: number;
    declare stats: LoopStats;
    declare panel: HTMLElement | null;

    static override styles = [
        panelStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                gap: var(--space-5);
                padding: var(--space-5) var(--space-4);
                overflow-y: auto;
                background: var(--panel);
                border-left: 1px solid var(--border);
            }
            header h1 {
                margin: 0;
                font-size: 20px;
                letter-spacing: 0.02em;
            }
            header p,
            .summary,
            footer {
                margin: var(--space-1) 0 0;
                color: var(--muted);
            }
            section {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            footer {
                margin-top: auto;
                font-size: 12px;
            }
            kbd {
                font-family: var(--mono);
                border: 1px solid var(--border);
                border-radius: 4px;
                padding: 0 4px;
            }
        `,
    ];

    constructor() {
        super();
        this.demos = [];
        this.demoId = "";
        this.paused = false;
        this.hz = 60;
        this.timeScale = 1;
        this.stats = {
            fps: 0,
            stepsPerFrame: 0,
            simTime: 0,
            droppedTime: false,
        };
        this.panel = null;
    }

    #emit(name: string, detail?: unknown): void {
        this.dispatchEvent(
            new CustomEvent(name, { detail, bubbles: true, composed: true }),
        );
    }

    override render() {
        const current = this.demos.find((d) => d.id === this.demoId);
        const { fps, stepsPerFrame, simTime, droppedTime } = this.stats;
        // Built here because dd is `white-space: pre`: if Prettier wrapped this inside the
        // template, the line breaks and indentation would render as text.
        const steps = stepsPerFrame.toFixed(2);

        return html`
            <header>
                <h1>Aether</h1>
                <p>A 3D physics engine, from scratch.</p>
            </header>

            <section>
                <h2>Demo</h2>
                <select
                    aria-label="Demo"
                    @change=${(e: Event) =>
                        this.#emit(
                            "demo-change",
                            (e.target as HTMLSelectElement).value,
                        )}
                >
                    ${this.demos.map(
                        (d) =>
                            html`<option
                                value=${d.id}
                                ?selected=${d.id === this.demoId}
                            >
                                Phase ${d.phase} · ${d.title}
                            </option>`,
                    )}
                </select>
                <p class="summary">${current?.summary}</p>
            </section>

            ${this.panel
                ? html` <section>
                      <h2>Controls</h2>
                      ${this.panel}
                  </section>`
                : nothing}

            <section>
                <h2>Simulation</h2>
                <div class="buttons">
                    <button
                        class="primary"
                        @click=${() => this.#emit("toggle-pause")}
                    >
                        ${this.paused ? "Play" : "Pause"}
                    </button>
                    <button
                        ?disabled=${!this.paused}
                        @click=${() => this.#emit("step-once")}
                    >
                        Step
                    </button>
                    <button @click=${() => this.#emit("reset")}>Reset</button>
                </div>
                <aether-slider
                    label="Physics rate"
                    min="5"
                    max="240"
                    step="1"
                    digits="0"
                    unit=" Hz"
                    .value=${this.hz}
                    @value-change=${(e: CustomEvent<number>) =>
                        this.#emit("hz-change", e.detail)}
                ></aether-slider>
                <aether-slider
                    label="Time scale"
                    min="0.1"
                    max="2"
                    step="0.05"
                    digits="2"
                    unit="×"
                    .value=${this.timeScale}
                    @value-change=${(e: CustomEvent<number>) =>
                        this.#emit("time-scale-change", e.detail)}
                ></aether-slider>
            </section>

            <section>
                <h2>Stats</h2>
                <dl>
                    <dt>Frame rate</dt>
                    <dd>${fps.toFixed(0)} fps</dd>
                    <dt>Steps / frame</dt>
                    <dd class=${droppedTime ? "warn" : ""}>${steps}</dd>
                    <dt>Sim time</dt>
                    <dd>${simTime.toFixed(2)} s</dd>
                </dl>
            </section>

            <footer>
                <kbd>Space</kbd> pause · <kbd>.</kbd> step · <kbd>R</kbd> reset
            </footer>
        `;
    }
}

customElements.define("aether-sidebar", AetherSidebar);

declare global {
    interface HTMLElementTagNameMap {
        "aether-sidebar": AetherSidebar;
    }
}
