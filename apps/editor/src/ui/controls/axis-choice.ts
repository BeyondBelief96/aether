import { css, html, LitElement, type PropertyDeclarations } from "lit";
import { baseStyles } from "../shared";
import { choiceColumns, lastSpan } from "./choice-columns";

export interface ChoiceOption {
    readonly value: string;
    readonly label: string;
}

/** Horizontal padding plus borders around an option's label, in pixels. */
const OPTION_CHROME = 22;

/** Canvas used to measure labels in the control's font. Created on first use. */
let measureContext: CanvasRenderingContext2D | null = null;

/**
 * One of a few options as joined square buttons. The options sit in one row when their labels
 * fit and wrap into an even grid when they don't.
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

    #columns = 0;
    #lastSpan = 0;
    #optionWidth = 0;
    #resize = new ResizeObserver(() => this.#layout());

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
            /* The 1px gaps show the ink beneath, so options share their rules in any grid. */
            .row {
                display: grid;
                grid-template-columns: repeat(var(--columns, 1), minmax(0, 1fr));
                gap: 1px;
                border: 1px solid var(--rule-strong);
                border-radius: var(--radius);
                background: var(--rule-strong);
            }
            button {
                min-width: 0;
                min-height: 32px;
                padding: 0 10px;
                background: var(--paper);
                font: 500 var(--text-small) / 1 var(--sans);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: background-color 140ms var(--ease-out);
            }
            /* A short last row: the final option spans the rest of it, so no cell is left empty. */
            button:last-child {
                grid-column: span var(--last-span, 1);
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

    override connectedCallback(): void {
        super.connectedCallback();
        this.#resize.observe(this);
        // Labels are measured in the web font, so measure again once it has loaded.
        void document.fonts?.ready.then(() => {
            this.#optionWidth = 0;
            this.#layout();
        });
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#resize.disconnect();
    }

    protected override updated(changed: Map<string, unknown>): void {
        if (changed.has("options")) this.#optionWidth = 0;
        this.#layout();
    }

    /** Widest option, label measured in the buttons' computed font. */
    #measure(): number {
        const button = this.renderRoot.querySelector("button");
        if (!button) return 0;
        measureContext ??= document.createElement("canvas").getContext("2d");
        if (!measureContext) return 0;
        const style = getComputedStyle(button);
        measureContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        let widest = 0;
        for (const option of this.options) {
            widest = Math.max(widest, measureContext.measureText(option.label).width);
        }
        return Math.ceil(widest) + OPTION_CHROME;
    }

    #layout(): void {
        const width = this.clientWidth;
        if (width === 0) return;
        if (this.#optionWidth === 0) this.#optionWidth = this.#measure();
        const count = this.options.length;
        const columns = choiceColumns(count, width, this.#optionWidth);
        const span = lastSpan(count, columns);
        if (columns === this.#columns && span === this.#lastSpan) return;
        this.#columns = columns;
        this.#lastSpan = span;
        this.style.setProperty("--columns", String(columns));
        this.style.setProperty("--last-span", String(span));
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
        // Arrow keys move through the options in order, whether they sit in one row or several.
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
                            title=${o.label}
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
