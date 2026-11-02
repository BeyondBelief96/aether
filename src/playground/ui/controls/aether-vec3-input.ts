import { css, html, LitElement } from "lit";
import type { Vec3Like } from "aether-physics";
import { live } from "lit/directives/live.js";

const AXES = ["x", "y", "z"] as const;
type Axis = (typeof AXES)[number];

function fieldText(n: number): string {
    return String(Number(n.toFixed(3)));
}
/**
 * Three numeric inputs for a vector, labelled X, Y, Z in the axis colors.
 *
 * Values go out exactly as typed. With `nonzero` set, an edit that would make the zero
 * vector is rejected: the fields snap back to the current value.
 *
 * Events: `value-change` (detail: Vec3Like, a new object each time).
 */
export class AetherVec3Input extends LitElement {
    static override properties = {
        label: { type: String },
        value: { attribute: false },
        step: { type: Number },
        nonzero: { type: Boolean },
    };

    declare label: string;
    declare value: Vec3Like;
    declare step: number;
    declare nonzero: boolean;

    static override styles = css`
        :host {
            display: grid;
            gap: var(--space-1);
        }
        .fields {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
        }
        input {
            box-sizing: border-box; /* the global rule in styles.css doesn't reach shadow DOM */
            width: 100%;
            font: inherit;
            font-family: var(--mono);
            font-variant-numeric: tabular-nums;
            color: var(--text);
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 4px 6px;
        }
        input:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }
        .x {
            border-left: 3px solid var(--axis-x);
        }
        .y {
            border-left: 3px solid var(--axis-y);
        }
        .z {
            border-left: 3px solid var(--axis-z);
        }
    `;

    constructor() {
        super();
        this.label = "";
        this.value = { x: 0, y: 0, z: 0 };
        this.step = 0.1;
        this.nonzero = false;
    }

    #onChange(axis: Axis, e: Event): void {
        const raw = Number((e.target as HTMLInputElement).value);
        if (!Number.isFinite(raw)) return this.#reject();

        const next: Vec3Like = { ...this.value, [axis]: raw };
        if (this.nonzero && Math.hypot(next.x, next.y, next.z) < 1e-6) {
            return this.#reject();
        }

        this.dispatchEvent(
            new CustomEvent("value-change", {
                detail: next,
                bubbles: true,
                composed: true,
            }),
        );
    }

    /** Re-renders without emitting, so live() puts the current value back in the field. */
    #reject() {
        this.requestUpdate();
    }

    override render() {
        return html`
            <span>${this.label}</span>
            <div class="fields">
                ${AXES.map(
                    (axis) => html`
                        <input
                            class=${axis}
                            type="number"
                            step=${this.step}
                            aria-label="${this.label} ${axis.toUpperCase()}"
                            .value=${live(fieldText(this.value[axis]))}
                            @change=${(e: Event) => this.#onChange(axis, e)}
                        />
                    `,
                )}
            </div>
        `;
    }
}
customElements.define("aether-vec3-input", AetherVec3Input);

declare global {
    interface HTMLElementTagNameMap {
        "aether-vec3-input": AetherVec3Input;
    }
}
