import {
    css,
    html,
    LitElement,
    type CSSResultGroup,
    type PropertyDeclarations,
    type TemplateResult,
} from "lit";
import { panelStyles } from "../shared-styles";
import "../controls/aether-slider";

/** Readouts for one floating block. */
export interface FloatReadout {
    title: string;
    /** CSS color for the title, e.g. `var(--series-1)`. */
    color: string;
    /** Label and already-formatted value for each row. */
    rows: readonly (readonly [string, string])[];
}

/**
 * Inputs and readouts for the buoyancy demo. Holds no state of its own: inputs come in as
 * properties and go out as events, and the demo pushes readouts in.
 *
 * Events: `liquid-density-change` (number), `damping-change` (number), `restart`.
 */
export class BuoyancyPanel extends LitElement {
    static override properties: PropertyDeclarations = {
        // Inputs
        liquidDensity: { attribute: false },
        damping: { attribute: false },
        // Readouts
        floats: { attribute: false },
    };

    declare liquidDensity: number;
    declare damping: number;
    declare floats: readonly FloatReadout[];

    static override styles: CSSResultGroup = [
        panelStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
        `,
    ];

    constructor() {
        super();
        this.liquidDensity = 1000;
        this.damping = 1;
        this.floats = [];
    }

    #emit(name: string, detail?: unknown): void {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    protected override render(): TemplateResult {
        return html`
            <aether-slider
                label="Liquid density"
                unit=" kg/m³"
                min="200"
                max="1500"
                step="10"
                digits="0"
                .value=${this.liquidDensity}
                @value-change=${(e: CustomEvent<number>) =>
                    this.#emit("liquid-density-change", e.detail)}
            ></aether-slider>
            <aether-slider
                label="Damping (kept per second)"
                min="0.05"
                max="1"
                step="0.01"
                digits="2"
                .value=${this.damping}
                @value-change=${(e: CustomEvent<number>) => this.#emit("damping-change", e.detail)}
            ></aether-slider>
            <div class="buttons">
                <button @click=${() => this.#emit("restart")}>Restart</button>
            </div>

            ${this.floats.map(
                ({ title, color, rows }) => html`
                    <h3 style="color: ${color}">${title}</h3>
                    <dl>
                        ${rows.map(
                            ([label, value]) =>
                                html`<dt>${label}</dt>
                                    <dd>${value}</dd>`,
                        )}
                    </dl>
                `,
            )}
        `;
    }
}

customElements.define("aether-buoyancy-panel", BuoyancyPanel);

declare global {
    interface HTMLElementTagNameMap {
        "aether-buoyancy-panel": BuoyancyPanel;
    }
}
