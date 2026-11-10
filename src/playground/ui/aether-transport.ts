import { LitElement, css, html, svg } from "lit";

export interface LoopStats {
    fps: number;
    stepsPerFrame: number;
    simTime: number;
    droppedTime: boolean;
}

const icon = (paths: ReturnType<typeof svg>) => html`
    <svg viewBox="0 0 16 16" aria-hidden="true">${paths}</svg>
`;
const PLAY = icon(svg`<path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />`);
const PAUSE = icon(
    svg`<rect x="3.5" y="2.8" width="3" height="10.4" rx="0.6" fill="currentColor" /><rect x="9.5" y="2.8" width="3" height="10.4" rx="0.6" fill="currentColor" />`,
);
const STEP = icon(
    svg`<path d="M3 2.8v10.4L10 8z" fill="currentColor" /><rect x="11" y="2.8" width="2.2" height="10.4" rx="0.5" fill="currentColor" />`,
);
const RESET = icon(
    svg`<path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /><path d="M3 1.8v3.4h3.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />`,
);

/**
 * Play, step and reset, with the loop's live stats. Sits over the viewport so it stays in
 * reach whatever the sidebar is scrolled to.
 *
 * Events: `toggle-pause`, `step-once`, `reset`.
 */
export class AetherTransport extends LitElement {
    static override properties = {
        paused: { type: Boolean },
        stats: { attribute: false },
    };

    declare paused: boolean;
    declare stats: LoopStats;

    static override styles = css`
        :host {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-1);
            padding-right: var(--space-3);
            color: var(--hud-text);
            background: var(--hud-bg);
            border: 1px solid var(--hud-border);
            border-radius: 10px;
            box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
            font-size: 12px;
        }
        .buttons {
            display: flex;
            gap: 2px;
        }
        button {
            display: grid;
            place-items: center;
            width: 36px;
            height: 36px;
            padding: 0;
            color: inherit;
            background: transparent;
            border: none;
            border-radius: var(--radius);
            cursor: pointer;
        }
        button:hover:not(:disabled) {
            background: var(--hud-hover);
        }
        button.primary {
            color: var(--hud-accent-text);
            background: var(--hud-accent);
        }
        button.primary:hover {
            background: var(--hud-accent-hover);
        }
        button:disabled {
            color: var(--hud-muted);
            opacity: 0.5;
            cursor: default;
        }
        button:focus-visible {
            outline: 2px solid var(--hud-accent);
            outline-offset: 1px;
        }
        svg {
            width: 16px;
            height: 16px;
        }
        dl {
            display: flex;
            gap: var(--space-3);
            margin: 0;
            font-family: var(--mono);
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }
        dl div {
            display: flex;
            gap: var(--space-1);
            align-items: baseline;
        }
        dt {
            order: 1;
            color: var(--hud-muted);
        }
        dd {
            margin: 0;
            min-width: 3ch;
            text-align: right;
        }
        .warn dd {
            color: var(--hud-warn);
        }
        .divider {
            align-self: stretch;
            width: 1px;
            margin: var(--space-1) 0;
            background: var(--hud-border);
        }
        @media (max-width: 420px) {
            .steps {
                display: none;
            }
        }
    `;

    constructor() {
        super();
        this.paused = false;
        this.stats = { fps: 0, stepsPerFrame: 0, simTime: 0, droppedTime: false };
    }

    #emit(name: string): void {
        this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
    }

    override render() {
        const { fps, stepsPerFrame, simTime, droppedTime } = this.stats;
        return html`
            <div class="buttons">
                <button
                    class="primary"
                    aria-label=${this.paused ? "Play" : "Pause"}
                    aria-keyshortcuts="Space"
                    title=${this.paused ? "Play (Space)" : "Pause (Space)"}
                    @click=${() => this.#emit("toggle-pause")}
                >
                    ${this.paused ? PLAY : PAUSE}
                </button>
                <button
                    aria-label="Step"
                    aria-keyshortcuts="."
                    title=${this.paused ? "Step one tick (.)" : "Pause to step one tick"}
                    ?disabled=${!this.paused}
                    @click=${() => this.#emit("step-once")}
                >
                    ${STEP}
                </button>
                <button
                    aria-label="Reset"
                    aria-keyshortcuts="R"
                    title="Reset (R)"
                    @click=${() => this.#emit("reset")}
                >
                    ${RESET}
                </button>
            </div>
            <span class="divider"></span>
            <dl aria-label="Loop stats">
                <div title="Frames drawn per second">
                    <dt>fps</dt>
                    <dd>${fps.toFixed(0)}</dd>
                </div>
                <div
                    class="steps ${droppedTime ? "warn" : ""}"
                    title=${
                        droppedTime
                            ? "Physics steps per frame. The loop fell behind and dropped time."
                            : "Physics steps per frame"
                    }
                >
                    <dt>steps/frame</dt>
                    <dd>${stepsPerFrame.toFixed(2)}</dd>
                </div>
                <div title="Simulated time">
                    <dt>s</dt>
                    <dd>${simTime.toFixed(2)}</dd>
                </div>
            </dl>
        `;
    }
}

customElements.define("aether-transport", AetherTransport);

declare global {
    interface HTMLElementTagNameMap {
        "aether-transport": AetherTransport;
    }
}
