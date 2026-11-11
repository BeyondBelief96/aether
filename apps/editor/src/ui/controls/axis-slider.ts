import { css, html, LitElement, type PropertyDeclarations } from "lit";
import { baseStyles } from "../shared";

const MINUS = "−";

/** Formats with fixed decimals and a real minus sign. */
export function formatValue(value: number, digits: number): string {
    const text = Math.abs(value).toFixed(digits);
    return Number(text) === 0 || value >= 0 ? text : MINUS + text;
}

/**
 * A parameter as an axis: label and live value above a full-width track, range ends below.
 *
 * Events: `value-input` (number) while dragging and on every keyboard step.
 */
export class AxisSlider extends LitElement {
    static override properties: PropertyDeclarations = {
        label: { type: String },
        value: { type: Number },
        min: { type: Number },
        max: { type: Number },
        step: { type: Number },
        digits: { type: Number },
        unit: { type: String },
        color: { type: String },
    };

    declare label: string;
    declare value: number;
    declare min: number;
    declare max: number;
    declare step: number;
    declare digits: number;
    declare unit: string;
    declare color: string;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
                --fill: 0%;
            }
            .head {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: var(--u);
            }
            label {
                font: 600 var(--text-small) / 1.3 var(--sans);
            }
            output {
                font: 500 var(--text-small) / 1.3 var(--mono);
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
            }
            input {
                display: block;
                width: 100%;
                height: 28px;
                margin: 6px 0 2px;
                background: transparent;
                appearance: none;
                -webkit-appearance: none;
                cursor: pointer;
            }
            input::-webkit-slider-runnable-track {
                height: 2px;
                background:
                    linear-gradient(var(--ink), var(--ink)) 0 / var(--fill) 100% no-repeat,
                    var(--rule);
            }
            input::-moz-range-track {
                height: 2px;
                background: var(--rule);
            }
            input::-moz-range-progress {
                height: 2px;
                background: var(--ink);
            }
            input::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                margin-top: -9px;
                border-radius: 50%;
                background: var(--paper);
                border: 2px solid var(--ink);
                transition:
                    transform 140ms var(--ease-out),
                    background-color 140ms var(--ease-out);
            }
            input::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: var(--paper);
                border: 2px solid var(--ink);
            }
            input:hover::-webkit-slider-thumb,
            input:active::-webkit-slider-thumb {
                background: var(--accent);
            }
            input:active::-webkit-slider-thumb {
                transform: scale(1.15);
            }
            input:hover::-moz-range-thumb,
            input:active::-moz-range-thumb {
                background: var(--accent);
            }
            input:focus-visible {
                outline: none;
            }
            input:focus-visible::-webkit-slider-thumb {
                outline: 2px solid var(--accent);
                outline-offset: 2px;
            }
            input:focus-visible::-moz-range-thumb {
                outline: 2px solid var(--accent);
                outline-offset: 2px;
            }
            .ends {
                display: flex;
                justify-content: space-between;
                font: 400 var(--text-label) / 1 var(--mono);
                color: var(--muted);
            }
        `,
    ];

    constructor() {
        super();
        this.label = "";
        this.value = 0;
        this.min = 0;
        this.max = 1;
        this.step = 0.01;
        this.digits = 2;
        this.unit = "";
        this.color = "";
    }

    #onInput(e: Event): void {
        const value = Number((e.target as HTMLInputElement).value);
        this.dispatchEvent(
            new CustomEvent("value-input", { detail: value, bubbles: true, composed: true }),
        );
    }

    protected override updated(): void {
        const span = this.max - this.min;
        const fill = span > 0 ? ((this.value - this.min) / span) * 100 : 0;
        this.style.setProperty("--fill", `${Math.min(100, Math.max(0, fill))}%`);
    }

    protected override render() {
        const unit = this.unit.trim();
        return html`
            <div class="head">
                <label for="range" style=${this.color ? `color:${this.color}` : ""}
                    >${this.label}</label
                >
                <output for="range">${formatValue(this.value, this.digits)}${this.unit}</output>
            </div>
            <input
                id="range"
                type="range"
                .min=${String(this.min)}
                .max=${String(this.max)}
                .step=${String(this.step)}
                .value=${String(this.value)}
                aria-valuetext=${`${formatValue(this.value, this.digits)} ${unit}`.trim()}
                @input=${this.#onInput}
            />
            <div class="ends" aria-hidden="true">
                <span>${formatValue(this.min, this.digits)}</span>
                <span>${formatValue(this.max, this.digits)}</span>
            </div>
        `;
    }
}

customElements.define("axis-slider", AxisSlider);

declare global {
    interface HTMLElementTagNameMap {
        "axis-slider": AxisSlider;
    }
}
