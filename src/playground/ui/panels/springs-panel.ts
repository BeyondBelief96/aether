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

/** One titled group of readouts. */
export interface ReadoutSection {
    title: string;
    /** CSS color for the title, e.g. `var(--series-1)`. */
    color: string;
    /** Label and already-formatted value for each row. */
    rows: readonly (readonly [string, string])[];
}

/**
 * Inputs and readouts for the springs demo. Holds no state of its own: inputs come in as
 * properties and go out as events, and the demo pushes readouts in.
 *
 * Events: `stiffness-change` (number), `rest-length-change` (number), `damping-change`
 * (number), `restart`.
 */
export class SpringsPanel extends LitElement {
    static override properties: PropertyDeclarations = {
        // Inputs
        stiffness: { attribute: false },
        restLength: { attribute: false },
        damping: { attribute: false },
        // Readouts
        sections: { attribute: false },
    };

    declare stiffness: number;
    declare restLength: number;
    declare damping: number;
    declare sections: readonly ReadoutSection[];

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
        this.stiffness = 0;
        this.restLength = 0;
        this.damping = 1;
        this.sections = [];
    }

    #emit(name: string, detail?: unknown): void {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    protected override render(): TemplateResult {
        return html`
            <aether-slider
                label="Stiffness"
                unit=" N/m"
                min="2"
                max="200"
                step="1"
                digits="0"
                .value=${this.stiffness}
                @value-change=${(e: CustomEvent<number>) =>
                    this.#emit("stiffness-change", e.detail)}
            ></aether-slider>
            <aether-slider
                label="Rest length"
                unit=" m"
                min="0.5"
                max="4"
                step="0.1"
                digits="1"
                .value=${this.restLength}
                @value-change=${(e: CustomEvent<number>) =>
                    this.#emit("rest-length-change", e.detail)}
            ></aether-slider>
            <aether-slider
                label="Damping (kept per second)"
                min="0.1"
                max="1"
                step="0.01"
                digits="2"
                .value=${this.damping}
                @value-change=${(e: CustomEvent<number>) => this.#emit("damping-change", e.detail)}
            ></aether-slider>
            <div class="buttons">
                <button @click=${() => this.#emit("restart")}>Restart</button>
            </div>

            ${this.sections.map(
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

customElements.define("aether-springs-panel", SpringsPanel);

declare global {
    interface HTMLElementTagNameMap {
        "aether-springs-panel": SpringsPanel;
    }
}
