import { css, html, LitElement, nothing, type PropertyDeclarations } from "lit";
import type { DemoAction } from "../core/demo";
import { baseStyles } from "./shared";

export interface InstanceView {
    readonly label: string;
    readonly note?: string;
    readonly active: boolean;
}

/**
 * The demo's named instances, numbered for the keyboard, and its one-shot actions.
 *
 * Events: `preset-pick` (index), `demo-action` (action id).
 */
export class InstanceBar extends LitElement {
    static override properties: PropertyDeclarations = {
        instances: { attribute: false },
        actions: { attribute: false },
    };

    declare instances: readonly InstanceView[];
    declare actions: readonly DemoAction[];

    static override styles = [
        baseStyles,
        css`
            :host {
                display: flex;
                align-items: stretch;
                gap: calc(var(--u) * 3);
                flex-wrap: wrap;
            }
            .presets {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: var(--u);
                flex: 1 1 520px;
                min-width: 0;
            }
            .preset {
                display: grid;
                grid-template-columns: 1fr auto;
                align-items: center;
                gap: 2px var(--u);
                min-height: 52px;
                padding: 8px 12px;
                border: 1px solid var(--rule-strong);
                border-radius: var(--radius);
                text-align: left;
                transition:
                    background-color 160ms var(--ease-out),
                    color 160ms var(--ease-out);
            }
            .preset:hover:not([aria-pressed="true"]) {
                background: var(--paper-sunk);
            }
            .preset[aria-pressed="true"] {
                background: var(--ink);
                color: var(--paper);
            }
            .preset[aria-pressed="true"] .note,
            .preset[aria-pressed="true"] kbd {
                color: color-mix(in srgb, var(--paper) 72%, transparent);
            }
            .name {
                font: 600 var(--text-small) / 1.2 var(--sans);
            }
            .note {
                grid-column: 1;
                font: 400 var(--text-label) / 1.2 var(--mono);
                color: var(--muted);
            }
            .preset kbd {
                grid-column: 2;
                grid-row: 1 / span 2;
            }
            .actions {
                display: flex;
                gap: var(--u);
                align-items: stretch;
            }
            .actions .btn {
                min-height: 52px;
                padding: 0 20px;
            }
            .btn.ink {
                background: var(--ink);
                border-color: var(--ink);
                color: var(--paper);
            }
            .btn.ink:hover {
                background: color-mix(in srgb, var(--ink) 82%, var(--paper));
            }
            .actions kbd {
                color: inherit;
                opacity: 0.7;
            }
        `,
    ];

    constructor() {
        super();
        this.instances = [];
        this.actions = [];
    }

    #emit(name: string, detail: unknown): void {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    protected override render() {
        return html`
            ${
                this.instances.length > 0
                    ? html`<div class="presets" role="group" aria-label="Instances">
                          ${this.instances.map(
                              (p, i) =>
                                  html`<button
                                      class="preset"
                                      aria-pressed=${String(p.active)}
                                      aria-keyshortcuts=${i < 9 ? String(i + 1) : nothing}
                                      @click=${() => this.#emit("preset-pick", i)}
                                  >
                                      <span class="name">${p.label}</span>
                                      ${p.note ? html`<span class="note">${p.note}</span>` : nothing}
                                      ${i < 9 ? html`<kbd>${i + 1}</kbd>` : nothing}
                                  </button>`,
                          )}
                      </div>`
                    : nothing
            }
            ${
                this.actions.length > 0
                    ? html`<div class="actions">
                          ${this.actions.map(
                              (a) =>
                                  html`<button
                                      class="btn ink"
                                      aria-keyshortcuts=${a.key ?? nothing}
                                      @click=${() => this.#emit("demo-action", a.id)}
                                  >
                                      ${a.label}
                                      ${a.key ? html`<kbd>${a.key.toUpperCase()}</kbd>` : nothing}
                                  </button>`,
                          )}
                      </div>`
                    : nothing
            }
        `;
    }
}

customElements.define("instance-bar", InstanceBar);

declare global {
    interface HTMLElementTagNameMap {
        "instance-bar": InstanceBar;
    }
}
