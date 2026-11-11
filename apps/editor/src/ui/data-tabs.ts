import { css, html, LitElement, nothing, type PropertyDeclarations } from "lit";
import type { ReadoutGroup } from "../core/demo";
import type { ChartData } from "../core/session";
import { baseStyles } from "./shared";
import "./code-view";
import "./controls/axis-choice";
import "./line-chart";

export type DataTab = "readouts" | "charts" | "code";

/**
 * The numbers behind the scene: readouts, charts and the demo's source, one tab at a time.
 *
 * Events: `tab-change` (DataTab).
 */
export class DataTabs extends LitElement {
    static override properties: PropertyDeclarations = {
        tab: { type: String },
        readouts: { attribute: false },
        charts: { attribute: false },
        source: { type: String },
        ranges: { state: true },
    };

    declare tab: DataTab;
    declare readouts: readonly ReadoutGroup[];
    declare charts: readonly ChartData[];
    declare source: string;
    declare ranges: Readonly<Record<string, number>>;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
            }
            [role="tablist"] {
                display: flex;
                gap: calc(var(--u) * 4);
                border-bottom: 1px solid var(--rule-strong);
                margin-bottom: calc(var(--u) * 3);
            }
            [role="tab"] {
                position: relative;
                padding: 12px 0;
                font: 600 var(--text-body) / 1 var(--sans);
                color: var(--muted);
                transition: color 160ms var(--ease-out);
            }
            [role="tab"]:hover,
            [role="tab"][aria-selected="true"] {
                color: var(--ink);
            }
            [role="tab"][aria-selected="true"]::after {
                content: "";
                position: absolute;
                left: 0;
                right: 0;
                bottom: -1px;
                height: 3px;
                background: var(--accent);
            }
            .groups {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
                gap: calc(var(--u) * 4);
            }
            h3 {
                display: flex;
                align-items: center;
                gap: var(--u);
                margin: 0 0 calc(var(--u) * 1.5);
                font: 650 var(--text-small) / 1.2 var(--sans);
            }
            .swatch {
                width: 10px;
                height: 10px;
                flex: none;
            }
            dl {
                display: grid;
                grid-template-columns: 1fr auto;
                margin: 0;
                border-top: 1px solid var(--rule-strong);
            }
            dt,
            dd {
                padding: 7px 0;
                border-bottom: 1px solid var(--rule);
                font-size: var(--text-small);
            }
            dt {
                color: var(--ink-2);
            }
            dd {
                margin: 0;
                padding-left: calc(var(--u) * 2);
                text-align: right;
                font-family: var(--mono);
                font-variant-numeric: tabular-nums;
                white-space: pre;
            }
            .warn {
                color: var(--warn);
                font-weight: 600;
            }
            .chart + .chart {
                margin-top: calc(var(--u) * 5);
            }
            .chart-head {
                display: flex;
                justify-content: space-between;
                align-items: end;
                gap: calc(var(--u) * 2);
                flex-wrap: wrap;
                margin-bottom: calc(var(--u) * 2);
            }
            .chart-head h3 {
                margin: 0 0 6px;
                font-size: var(--text-body);
            }
            .legend {
                display: flex;
                flex-wrap: wrap;
                gap: 4px calc(var(--u) * 2);
                margin: 0;
                padding: 0;
                list-style: none;
                font-size: var(--text-small);
                color: var(--ink-2);
            }
            .legend li {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .legend .swatch {
                height: 2px;
                width: 16px;
            }
            axis-choice {
                min-width: 240px;
            }
            .empty {
                color: var(--muted);
                font-size: var(--text-small);
            }
        `,
    ];

    constructor() {
        super();
        this.tab = "readouts";
        this.readouts = [];
        this.charts = [];
        this.source = "";
        this.ranges = {};
    }

    #tabs(): { id: DataTab; label: string }[] {
        return [
            { id: "readouts", label: "Readouts" },
            ...(this.charts.length > 0 ? [{ id: "charts" as const, label: "Charts" }] : []),
            { id: "code", label: "Code" },
        ];
    }

    #select(tab: DataTab): void {
        this.dispatchEvent(
            new CustomEvent("tab-change", { detail: tab, bubbles: true, composed: true }),
        );
    }

    #onKey(e: KeyboardEvent): void {
        const tabs = this.#tabs();
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (step === 0) return;
        const index = tabs.findIndex((t) => t.id === this.tab);
        const next = tabs[(index + step + tabs.length) % tabs.length];
        if (!next) return;
        this.#select(next.id);
        this.updateComplete.then(() =>
            this.renderRoot.querySelector<HTMLElement>('[aria-selected="true"]')?.focus(),
        );
    }

    #readouts() {
        if (this.readouts.length === 0)
            return html`<p class="empty">This demo has no readouts.</p>`;
        return html`<div class="groups">
            ${this.readouts.map(
                (group) =>
                    html`<section>
                        <h3>
                            ${group.color === undefined ? nothing : html`<span class="swatch" style=${`background: var(--series-${group.color + 1})`}></span>`}
                            ${group.title}
                        </h3>
                        <dl>
                            ${group.rows.map(
                                (row) =>
                                    html`<dt>${row.label}</dt>
                                        <dd class=${row.warn ? "warn" : ""}>${row.value}</dd>`,
                            )}
                        </dl>
                    </section>`,
            )}
        </div>`;
    }

    #charts() {
        return this.charts.map((chart) => {
            const range = this.ranges[chart.spec.id] ?? 0;
            return html`<section class="chart">
                <div class="chart-head">
                    <div>
                        <h3>${chart.spec.title}</h3>
                        <ul class="legend">
                            ${chart.spec.series.map(
                                (s) =>
                                    html`<li>
                                        <span
                                            class="swatch"
                                            style=${`background: var(--series-${s.color + 1})`}
                                        ></span
                                        >${s.label}
                                    </li>`,
                            )}
                        </ul>
                    </div>
                    <axis-choice
                        label="Range"
                        .value=${String(range)}
                        .options=${chart.spec.ranges.map((r, i) => ({ value: String(i), label: r.label }))}
                        @value-input=${(e: CustomEvent<string>) => {
                            e.stopPropagation();
                            this.ranges = { ...this.ranges, [chart.spec.id]: Number(e.detail) };
                        }}
                    ></axis-choice>
                </div>
                <line-chart .data=${chart} .range=${range}></line-chart>
            </section>`;
        });
    }

    protected override render() {
        const tabs = this.#tabs();
        const tab = tabs.some((t) => t.id === this.tab) ? this.tab : "readouts";
        return html`
            <div role="tablist" aria-label="Demo data" @keydown=${this.#onKey}>
                ${tabs.map(
                    (t) =>
                        html`<button
                            role="tab"
                            id=${`tab-${t.id}`}
                            aria-selected=${String(t.id === tab)}
                            aria-controls="panel"
                            tabindex=${t.id === tab ? 0 : -1}
                            @click=${() => this.#select(t.id)}
                        >
                            ${t.label}
                        </button>`,
                )}
            </div>
            <div role="tabpanel" id="panel" aria-labelledby=${`tab-${tab}`}>
                ${tab === "readouts" ? this.#readouts() : tab === "charts" ? this.#charts() : html`<code-view .path=${this.source}></code-view>`}
            </div>
        `;
    }
}

customElements.define("data-tabs", DataTabs);

declare global {
    interface HTMLElementTagNameMap {
        "data-tabs": DataTabs;
    }
}
