import { css, html, LitElement, type PropertyDeclarations } from "lit";
import type { Vec3Like } from "aether-physics";
import { baseStyles } from "../shared";

const COMPONENTS = ["x", "y", "z"] as const;

/**
 * A vector typed per component. A component that doesn't parse, or a zero vector when
 * `nonzero` is set, is reverted on blur.
 *
 * Events: `value-input` (Vec3Like) when a component commits.
 */
export class AxisVec3 extends LitElement {
    static override properties: PropertyDeclarations = {
        label: { type: String },
        value: { attribute: false },
        digits: { type: Number },
        nonzero: { type: Boolean },
    };

    declare label: string;
    declare value: Readonly<Vec3Like>;
    declare digits: number;
    declare nonzero: boolean;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
            }
            .name {
                display: block;
                margin-bottom: 10px;
                font: 600 var(--text-small) / 1.3 var(--sans);
            }
            .row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: var(--u);
            }
            label {
                display: flex;
                align-items: center;
                gap: 6px;
                min-height: 34px;
                padding: 0 10px;
                border: 1px solid var(--rule-strong);
                border-radius: var(--radius);
            }
            label:focus-within {
                outline: 2px solid var(--accent);
                outline-offset: 2px;
            }
            span {
                font: 700 var(--text-label) / 1 var(--mono);
            }
            input {
                width: 100%;
                min-width: 0;
                border: 0;
                background: transparent;
                color: var(--ink);
                font: 500 var(--text-small) / 1 var(--mono);
                font-variant-numeric: tabular-nums;
                text-align: right;
                caret-color: var(--accent);
            }
            input:focus {
                outline: none;
            }
        `,
    ];

    constructor() {
        super();
        this.label = "";
        this.value = { x: 0, y: 0, z: 0 };
        this.digits = 2;
        this.nonzero = false;
    }

    #commit(axis: (typeof COMPONENTS)[number], input: HTMLInputElement): void {
        const parsed = Number(input.value.replace("−", "-"));
        const next = { ...this.value, [axis]: parsed };
        const zero = next.x === 0 && next.y === 0 && next.z === 0;
        if (input.value.trim() === "" || !Number.isFinite(parsed) || (this.nonzero && zero)) {
            input.value = this.value[axis].toFixed(this.digits);
            return;
        }
        this.dispatchEvent(
            new CustomEvent("value-input", { detail: next, bubbles: true, composed: true }),
        );
    }

    protected override render() {
        return html`
            <span class="name" id="name">${this.label}</span>
            <div class="row" role="group" aria-labelledby="name">
                ${COMPONENTS.map(
                    (axis) =>
                        html`<label style=${`color: var(--axis-${axis})`}>
                            <span>${axis.toUpperCase()}</span>
                            <input
                                inputmode="decimal"
                                aria-label=${`${this.label} ${axis.toUpperCase()}`}
                                .value=${this.value[axis].toFixed(this.digits)}
                                @change=${(e: Event) => this.#commit(axis, e.target as HTMLInputElement)}
                                @keydown=${(e: KeyboardEvent) => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                }}
                            />
                        </label>`,
                )}
            </div>
        `;
    }
}

customElements.define("axis-vec3", AxisVec3);

declare global {
    interface HTMLElementTagNameMap {
        "axis-vec3": AxisVec3;
    }
}
