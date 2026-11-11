import { css, html, LitElement, type PropertyDeclarations } from "lit";
import { baseStyles } from "../shared";

export interface ChoiceOption {
    readonly value: string;
    readonly label: string;
}

/**
 * One of a few options as a row of joined square buttons.
 *
 * Events: `value-input` (string).
 */
export class AxisChoice extends LitElement {
    static override properties: PropertyDeclarations = {
        label: { type: String },
        value: { type: String },
        options: { attribute: false },
    };

    declare label: string;
    declare value: string;
    declare options: readonly ChoiceOption[];

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
                grid-auto-flow: column;
                grid-auto-columns: minmax(0, 1fr);
            }
            button {
                min-width: 0;
                min-height: 34px;
                padding: 0 10px;
                border: 1px solid var(--rule-strong);
                margin-left: -1px;
                font: 500 var(--text-small) / 1 var(--sans);
                white-space: nowrap;
                transition: background-color 140ms var(--ease-out);
            }
            button:first-child {
                margin-left: 0;
                border-radius: var(--radius) 0 0 var(--radius);
            }
            button:last-child {
                border-radius: 0 var(--radius) var(--radius) 0;
            }
            button:hover:not([aria-checked="true"]) {
                background: var(--paper-sunk);
            }
            button[aria-checked="true"] {
                background: var(--ink);
                color: var(--paper);
            }
            button:focus-visible {
                position: relative;
                z-index: 1;
            }
        `,
    ];

    constructor() {
        super();
        this.label = "";
        this.value = "";
        this.options = [];
    }

    #pick(value: string): void {
        if (value === this.value) return;
        this.dispatchEvent(
            new CustomEvent("value-input", { detail: value, bubbles: true, composed: true }),
        );
    }

    #onKey(e: KeyboardEvent): void {
        const step =
            e.key === "ArrowRight" || e.key === "ArrowDown"
                ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                  ? -1
                  : 0;
        if (step === 0) return;
        e.preventDefault();
        const index = this.options.findIndex((o) => o.value === this.value);
        const next = this.options[(index + step + this.options.length) % this.options.length];
        if (!next) return;
        this.#pick(next.value);
        this.updateComplete.then(() =>
            this.renderRoot.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus(),
        );
    }

    protected override render() {
        return html`
            <span class="name" id="name">${this.label}</span>
            <div class="row" role="radiogroup" aria-labelledby="name" @keydown=${this.#onKey}>
                ${this.options.map(
                    (o) =>
                        html`<button
                            role="radio"
                            aria-checked=${String(o.value === this.value)}
                            tabindex=${o.value === this.value ? 0 : -1}
                            @click=${() => this.#pick(o.value)}
                        >
                            ${o.label}
                        </button>`,
                )}
            </div>
        `;
    }
}

customElements.define("axis-choice", AxisChoice);

declare global {
    interface HTMLElementTagNameMap {
        "axis-choice": AxisChoice;
    }
}
