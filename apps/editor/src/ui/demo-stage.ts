import { css, html, LitElement, nothing, type PropertyDeclarations } from "lit";
import type { Callout } from "../core/demo";
import { Stage } from "../stage/stage";
import { baseStyles } from "./shared";

const _screen = { x: 0, y: 0 };
const MAX_CALLOUTS = 12;
const CALLOUT_GAP = 14; // px between a point and its label

/**
 * The viewport: the 3D stage with the demo's title over it and labels pinned beside bodies.
 * The editor owns the frame loop and calls `draw` and `placeCallouts`.
 */
export class DemoStage extends LitElement {
    static override properties: PropertyDeclarations = {
        heading: { type: String },
        summary: { type: String },
        hint: { type: String },
        callouts: { attribute: false },
        failed: { state: true },
    };

    declare heading: string;
    declare summary: string;
    declare hint: string;
    declare callouts: readonly Callout[];
    declare failed: boolean;

    stage: Stage | null = null;
    #resizeObserver = new ResizeObserver(() => this.stage?.resize());

    static override styles = [
        baseStyles,
        css`
            :host {
                position: relative;
                display: block;
                overflow: hidden;
                background: var(--paper-sunk);
                border-radius: var(--radius);
                isolation: isolate;
            }
            canvas {
                display: block;
                width: 100%;
                height: 100%;
                touch-action: none;
            }
            .title {
                position: absolute;
                top: calc(var(--u) * 3);
                left: calc(var(--u) * 3);
                max-width: min(560px, calc(100% - 48px));
                pointer-events: none;
            }
            h1 {
                margin: 0;
                font: 750 var(--text-title) / 0.95 var(--sans);
                letter-spacing: -0.035em;
                text-wrap: balance;
            }
            .summary {
                margin: 14px 0 0;
                max-width: 46ch;
                font-size: var(--text-lead);
                line-height: 1.45;
                color: var(--ink-2);
                text-wrap: pretty;
            }
            .hint {
                position: absolute;
                left: calc(var(--u) * 3);
                bottom: calc(var(--u) * 2.5);
                max-width: min(620px, calc(100% - 48px));
                margin: 0;
                font-size: var(--text-small);
                color: var(--ink-2);
                pointer-events: none;
            }
            .hint b {
                font-weight: 650;
                color: var(--ink);
            }
            .orbit {
                position: absolute;
                right: calc(var(--u) * 3);
                bottom: calc(var(--u) * 2.5);
                margin: 0;
                font: 400 var(--text-label) / 1 var(--mono);
                color: var(--muted);
                pointer-events: none;
            }
            .callout {
                position: absolute;
                top: 0;
                left: 0;
                padding: 3px 6px;
                font: 500 var(--text-label) / 1.2 var(--mono);
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
                color: var(--ink);
                background: color-mix(in srgb, var(--paper) 86%, transparent);
                border-left: 1px solid currentColor;
                pointer-events: none;
                will-change: transform;
            }
            .failed {
                position: absolute;
                inset: 0;
                display: grid;
                place-content: center;
                gap: var(--u);
                padding: calc(var(--u) * 4);
                text-align: center;
            }
            .failed p {
                margin: 0;
                max-width: 44ch;
                color: var(--ink-2);
            }
            @media (max-width: 720px) {
                .summary,
                .orbit {
                    display: none;
                }
                .title {
                    top: calc(var(--u) * 2);
                    left: calc(var(--u) * 2);
                }
                .hint {
                    left: calc(var(--u) * 2);
                    bottom: calc(var(--u) * 1.5);
                }
            }
        `,
    ];

    constructor() {
        super();
        this.heading = "";
        this.summary = "";
        this.hint = "";
        this.callouts = [];
        this.failed = false;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.#resizeObserver.observe(this);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#resizeObserver.disconnect();
        this.stage?.dispose();
        this.stage = null;
    }

    protected override firstUpdated(): void {
        const canvas = this.renderRoot.querySelector("canvas") as HTMLCanvasElement;
        try {
            this.stage = new Stage(canvas, this);
            this.stage.resize();
        } catch {
            this.failed = true;
        }
    }

    /** Moves each callout label to its point's current position on screen. */
    placeCallouts(): void {
        const stage = this.stage;
        if (!stage) return;
        const labels = this.renderRoot.querySelectorAll<HTMLElement>(".callout");
        labels.forEach((label, i) => {
            const callout = this.callouts[i];
            if (!callout || !stage.project(callout.at, _screen)) {
                label.style.visibility = "hidden";
                return;
            }
            label.style.visibility = "";
            // Beside the point, flipped to its left when it would leave the stage.
            const width = label.offsetWidth;
            const right = _screen.x + CALLOUT_GAP;
            const x = right + width > this.clientWidth ? _screen.x - CALLOUT_GAP - width : right;
            const y = Math.min(Math.max(_screen.y - 10, 0), this.clientHeight - label.offsetHeight);
            label.style.transform = `translate(${Math.round(Math.max(0, x))}px, ${Math.round(y)}px)`;
        });
    }

    protected override render() {
        return html`
            <canvas
                aria-label=${`${this.heading} simulation. Drag to orbit, scroll to zoom.`}
                role="img"
            ></canvas>
            ${this.callouts
                .slice(0, MAX_CALLOUTS)
                .map(
                    (c) =>
                        html`<span
                            class="callout"
                            aria-hidden="true"
                            style=${c.color === undefined ? "" : `color: var(--series-${c.color + 1})`}
                            ><span style="color: var(--ink)">${c.text}</span></span
                        >`,
                )}
            <div class="title">
                <h1>${this.heading}</h1>
                <p class="summary">${this.summary}</p>
            </div>
            ${this.hint ? html`<p class="hint"><b>Try:</b> ${this.hint}</p>` : nothing}
            <p class="orbit" aria-hidden="true">drag to orbit · scroll to zoom</p>
            ${
                this.failed
                    ? html`<div class="failed">
                          <strong>WebGL is not available</strong>
                          <p>
                              This browser could not start a 3D context. The parameters still work,
                              and the code tab shows how the demo is built.
                          </p>
                      </div>`
                    : nothing
            }
        `;
    }
}

customElements.define("demo-stage", DemoStage);

declare global {
    interface HTMLElementTagNameMap {
        "demo-stage": DemoStage;
    }
}
