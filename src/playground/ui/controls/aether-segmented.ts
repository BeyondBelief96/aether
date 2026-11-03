import {
    css,
    html,
    LitElement,
    type CSSResultGroup,
    type PropertyDeclarations,
    type TemplateResult,
} from "lit";

export interface SegmentedOption {
    value: string;
    label: string;
}

/**
 * A row of joined buttons for choosing one of a few options. Controlled: it shows `value`
 * and reports clicks, and the owner passes the new value back.
 *
 * Events: `value-change` (detail: the option's value).
 */
export class AetherSegmented extends LitElement {
    static override properties: PropertyDeclarations = {
        label: { type: String },
        options: { attribute: false },
        value: { type: String },
    };

    /** Shown above the buttons, and names the group for screen readers. */
    declare label: string;
    declare options: readonly SegmentedOption[];
    declare value: string;

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
        }
        .label {
            display: block;
            margin-bottom: var(--space-1);
        }
        .group {
            display: flex;
        }
        button {
            flex: 1 1 0;
            min-width: 0;
            padding: 6px 2px;
            font: inherit;
            font-size: 12px;
            color: var(--text);
            background: var(--bg);
            border: 1px solid var(--border);
            border-left-width: 0;
            cursor: pointer;
        }
        button:first-child {
            border-left-width: 1px;
            border-radius: var(--radius) 0 0 var(--radius);
        }
        button:last-child {
            border-radius: 0 var(--radius) var(--radius) 0;
        }
        button:hover {
            background: var(--panel);
        }
        button[aria-pressed="true"] {
            color: var(--accent-text);
            background: var(--accent);
            border-color: var(--accent);
        }
        button:focus-visible {
            position: relative;
            outline: 2px solid var(--accent);
            outline-offset: 1px;
        }
    `;

    constructor() {
        super();
        this.label = "";
        this.options = [];
        this.value = "";
    }

    #select(value: string): void {
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
            <span class="label">${this.label}</span>
            <div class="group" role="group" aria-label=${this.label}>
                ${this.options.map(
                    ({ value, label }) => html`
                        <button
                            aria-pressed=${String(value === this.value)}
                            @click=${() => this.#select(value)}
                        >
                            ${label}
                        </button>
                    `,
                )}
            </div>
        `;
    }
}

customElements.define("aether-segmented", AetherSegmented);

declare global {
    interface HTMLElementTagNameMap {
        "aether-segmented": AetherSegmented;
    }
}
