import {
    css,
    html,
    LitElement,
    type CSSResultGroup,
    type PropertyDeclarations,
    type TemplateResult,
} from "lit";
import { formatNumber } from "../format/format";
import { live } from "lit/directives/live.js";

export class AetherSlider extends LitElement {
    static override properties: PropertyDeclarations = {
        label: { type: String },
        min: { type: String },
        max: { type: String },
        step: { type: String },
        value: { type: Number },
        unit: { type: String },
        digits: { type: Number },
        color: { type: String },
    };

    declare label: string;
    declare min: number;
    declare max: number;
    declare step: number;
    declare value: number;
    declare unit: string;
    declare digits: number;
    /** Optional CSS color for the label, e.g. `var(--axis-x)`. */
    declare color: string;

    static override styles?: CSSResultGroup | undefined = css`
        :host {
            display: block;
        }

        label {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: var(--space-1);
        }
        output {
            font-family: var(--mono);
            font-variant-numeric: tabular-nums;
            white-space: pre;
        }
        input {
            grid-column: 1 / -1;
            width: 100%;
            margin: 0;
            accent-color: var(--accent);
        }
        input:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }
    `;

    constructor() {
        super();
        this.label = "";
        this.min = 0;
        this.max = 1;
        this.step = 0.01;
        this.value = 0;
        this.unit = "";
        this.digits = 2;
        this.color = "";
    }

    #onInput(e: Event): void {
        const value = Number((e.target as HTMLInputElement).value);
        this.dispatchEvent(
            new CustomEvent("value-change", {
                detail: value,
                bubbles: true,
                composed: true,
            }),
        );
    }

    protected override render(): TemplateResult {
        return html`
            <label>
                <span>${this.label}</span>
                <output
                    >${formatNumber(this.value, this.digits)}${this
                        .unit}</output
                >
                <input
                    type="range"
                    min=${this.min}
                    max=${this.max}
                    step=${this.step}
                    .value=${live(String(this.value))}
                    @input=${this.#onInput}
                />
            </label>
        `;
    }
}

customElements.define("aether-slider", AetherSlider);

declare global {
    interface HTMLElementTagNameMap {
        "aether-slider": AetherSlider;
    }
}
