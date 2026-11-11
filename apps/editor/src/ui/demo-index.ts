import { css, html, LitElement, nothing, type PropertyDeclarations } from "lit";
import { CATEGORIES, type DemoDefinition } from "../core/demo";
import { formatHash } from "../core/route";
import { baseStyles, icons } from "./shared";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Every demo as a cell in a specimen grid, grouped by category. */
export class DemoIndex extends LitElement {
    static override properties: PropertyDeclarations = {
        demos: { attribute: false },
        current: { type: String },
        heading: { type: String },
    };

    declare demos: readonly DemoDefinition[];
    declare current: string;
    declare heading: string;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
            }
            h2 {
                margin: 0 0 calc(var(--u) * 4);
                font: 750 clamp(28px, 3vw, 40px) / 1 var(--sans);
                letter-spacing: -0.03em;
            }
            section + section {
                margin-top: calc(var(--u) * 6);
            }
            h3 {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                margin: 0;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--rule-strong);
                font: 650 var(--text-lead) / 1.2 var(--sans);
            }
            h3 .label {
                font-weight: 400;
            }
            ul {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
                margin: 0;
                padding: 0;
                list-style: none;
                border-left: 1px solid var(--rule);
            }
            li {
                border-right: 1px solid var(--rule);
                border-bottom: 1px solid var(--rule);
            }
            a {
                display: flex;
                flex-direction: column;
                gap: 10px;
                height: 100%;
                min-height: 200px;
                padding: calc(var(--u) * 3);
                color: inherit;
                text-decoration: none;
                transition: background-color 180ms var(--ease-out);
            }
            a:hover {
                background: var(--paper-sunk);
            }
            a:hover .go {
                transform: translateX(4px);
                color: var(--accent-ink);
            }
            a[aria-current="page"] {
                background: var(--ink);
                color: var(--paper);
            }
            a[aria-current="page"] p,
            a[aria-current="page"] .meta {
                color: color-mix(in srgb, var(--paper) 72%, transparent);
            }
            .name {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: var(--u);
                font: 750 clamp(26px, 2.4vw, 34px) / 1 var(--sans);
                letter-spacing: -0.03em;
            }
            .go {
                display: inline-flex;
                transition:
                    transform 200ms var(--ease-out),
                    color 200ms var(--ease-out);
            }
            p {
                margin: 0;
                font-size: var(--text-small);
                line-height: 1.5;
                color: var(--ink-2);
                max-width: 52ch;
            }
            .meta {
                margin-top: auto;
                font: 400 var(--text-label) / 1.2 var(--mono);
                color: var(--muted);
            }
        `,
    ];

    constructor() {
        super();
        this.demos = [];
        this.current = "";
        this.heading = "All demos";
    }

    protected override render() {
        return html`
            <h2>${this.heading}</h2>
            ${CATEGORIES.map(({ id, label }) => {
                const list = this.demos.filter((d) => d.category === id);
                if (list.length === 0) return nothing;
                return html`<section aria-labelledby=${`cat-${id}`}>
                    <h3 id=${`cat-${id}`}>
                        ${label} <span class="label">${plural(list.length, "demo")}</span>
                    </h3>
                    <ul>
                        ${list.map((demo) => {
                            const axes = Object.keys(demo.params).length;
                            const presets = demo.presets?.length ?? 0;
                            return html`<li>
                                <a
                                    href=${formatHash({ view: "demo", id: demo.id, query: new URLSearchParams() })}
                                    aria-current=${demo.id === this.current ? "page" : nothing}
                                >
                                    <span class="name"
                                        >${demo.title}<span class="go">${icons.arrow}</span></span
                                    >
                                    <p>${demo.summary}</p>
                                    <span class="meta"
                                        >${plural(axes, "parameter")} ·
                                        ${plural(presets, "instance")}${demo.charts?.length ? ` · ${plural(demo.charts.length, "chart")}` : ""}</span
                                    >
                                </a>
                            </li>`;
                        })}
                    </ul>
                </section>`;
            })}
        `;
    }
}

customElements.define("demo-index", DemoIndex);

declare global {
    interface HTMLElementTagNameMap {
        "demo-index": DemoIndex;
    }
}
