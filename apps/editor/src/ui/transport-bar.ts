import { css, html, LitElement, type PropertyDeclarations } from "lit";
import { PHYSICS_RATES as RATES, type LoopStats } from "../core/session";
import { baseStyles, icons } from "./shared";

const SCALES = [0.1, 0.25, 0.5, 1, 2] as const;

/**
 * Pause, single step and reset, the world's physics rate and time scale, and loop statistics.
 *
 * Events: `toggle-pause`, `step-once`, `reset`, `hz-change` (number), `time-scale-change` (number).
 */
export class TransportBar extends LitElement {
    static override properties: PropertyDeclarations = {
        paused: { type: Boolean },
        hz: { type: Number },
        timeScale: { type: Number },
        interpolate: { type: Boolean },
        stats: { attribute: false },
    };

    declare paused: boolean;
    declare hz: number;
    declare timeScale: number;
    declare interpolate: boolean;
    declare stats: LoopStats;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: var(--u) calc(var(--u) * 3);
                padding-top: calc(var(--u) * 2);
                border-top: 1px solid var(--rule-strong);
            }
            .group {
                display: flex;
                align-items: center;
                gap: var(--u);
            }
            .btn.play {
                min-width: 108px;
            }
            label {
                display: flex;
                align-items: center;
                gap: var(--u);
            }
            select {
                min-height: 36px;
                padding: 0 28px 0 10px;
                border: 1px solid var(--rule-strong);
                border-radius: var(--radius);
                background: transparent
                    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.6'/%3E%3C/svg%3E")
                    right 8px center / 12px no-repeat;
                color: var(--ink);
                font: 500 var(--text-small) / 1 var(--mono);
                appearance: none;
                cursor: pointer;
            }
            select option {
                background: var(--paper);
                color: var(--ink);
            }
            .check {
                gap: 8px;
                min-height: 36px;
                font: 600 var(--text-small) / 1 var(--sans);
                cursor: pointer;
            }
            .check input {
                appearance: none;
                display: grid;
                place-content: center;
                width: 18px;
                height: 18px;
                margin: 0;
                border: 1px solid var(--rule-strong);
                border-radius: var(--radius);
                cursor: pointer;
            }
            .check input:checked {
                background: var(--ink);
            }
            .check input:checked::after {
                content: "";
                width: 9px;
                height: 5px;
                margin-top: -2px;
                border: solid var(--paper);
                border-width: 0 0 2px 2px;
                transform: rotate(-45deg);
            }
            .stats {
                margin-left: auto;
                display: flex;
                gap: calc(var(--u) * 2);
                font: 400 var(--text-small) / 1 var(--mono);
                font-variant-numeric: tabular-nums;
                color: var(--muted);
                white-space: nowrap;
            }
            .stats b {
                font-weight: 500;
                color: var(--ink);
            }
            .warn,
            .warn b {
                color: var(--warn);
            }
            @media (max-width: 720px) {
                .stats {
                    margin-left: 0;
                    width: 100%;
                    flex-wrap: wrap;
                    gap: var(--u) calc(var(--u) * 2);
                }
            }
        `,
    ];

    constructor() {
        super();
        this.paused = false;
        this.hz = 60;
        this.timeScale = 1;
        this.interpolate = true;
        this.stats = { fps: 0, stepsPerFrame: 0, simTime: 0, droppedTime: false };
    }

    #emit(name: string, detail?: unknown): void {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    protected override render() {
        const s = this.stats;
        const rates: readonly number[] = RATES.includes(this.hz as (typeof RATES)[number])
            ? RATES
            : [...RATES, this.hz].sort((a, b) => a - b);
        return html`
            <div class="group">
                <button
                    class="btn primary play"
                    aria-keyshortcuts="Space"
                    @click=${() => this.#emit("toggle-pause")}
                >
                    ${this.paused ? icons.play : icons.pause} ${this.paused ? "Play" : "Pause"}
                    <kbd>Space</kbd>
                </button>
                <button
                    class="btn icon"
                    title="Step once (.)"
                    aria-label="Step once"
                    aria-keyshortcuts="."
                    ?disabled=${!this.paused}
                    @click=${() => this.#emit("step-once")}
                >
                    ${icons.step}
                </button>
                <button
                    class="btn icon"
                    title="Reset (R)"
                    aria-label="Reset"
                    aria-keyshortcuts="R"
                    @click=${() => this.#emit("reset")}
                >
                    ${icons.reset}
                </button>
            </div>
            <div class="group">
                <label>
                    <span class="label">Physics</span>
                    <select
                        @change=${(e: Event) => this.#emit("hz-change", Number((e.target as HTMLSelectElement).value))}
                    >
                        ${rates.map((hz) => html`<option value=${hz} ?selected=${hz === this.hz}>${hz} Hz</option>`)}
                    </select>
                </label>
                <label>
                    <span class="label">Speed</span>
                    <select
                        @change=${(e: Event) => this.#emit("time-scale-change", Number((e.target as HTMLSelectElement).value))}
                    >
                        ${SCALES.map((k) => html`<option value=${k} ?selected=${k === this.timeScale}>${k}×</option>`)}
                    </select>
                </label>
                <label
                    class="check"
                    title="Draw between physics steps. Off, motion jumps from step to step at low rates."
                >
                    <input
                        type="checkbox"
                        .checked=${this.interpolate}
                        @change=${(e: Event) => this.#emit("interpolate-change", (e.target as HTMLInputElement).checked)}
                    />
                    <span>Smooth</span>
                </label>
            </div>
            <div class="stats" aria-live="off">
                <span><b>${s.fps.toFixed(0)}</b> fps</span>
                <span
                    class=${s.droppedTime ? "warn" : ""}
                    title=${s.droppedTime ? "The loop hit its step limit and dropped time" : ""}
                >
                    <b>${s.stepsPerFrame.toFixed(2)}</b> steps/frame
                </span>
                <span>t <b>${s.simTime.toFixed(2)}</b> s</span>
            </div>
        `;
    }
}

customElements.define("transport-bar", TransportBar);

declare global {
    interface HTMLElementTagNameMap {
        "transport-bar": TransportBar;
    }
}
