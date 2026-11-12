import { css, html, LitElement, nothing, type PropertyDeclarations } from "lit";
import { CATEGORIES, type DemoDefinition } from "../core/demo";
import { formatHash } from "../core/route";
import { ENGINE_VERSION, REPOSITORY_URL } from "../core/site";
import { baseStyles, icons, wordmark } from "./shared";

const demoHref = (id: string) => formatHash({ view: "demo", id, query: new URLSearchParams() });

/** Wordmark, category navigation, and the demos of the current category. */
export class SiteHeader extends LitElement {
    static override properties: PropertyDeclarations = {
        demos: { attribute: false },
        current: { type: String },
        index: { type: Boolean },
        embedded: { type: Boolean },
    };

    declare demos: readonly DemoDefinition[];
    /** Id of the open demo. */
    declare current: string;
    /** Whether the index of all demos is showing. */
    declare index: boolean;
    /** Inside the website, which supplies the wordmark and outbound links. */
    declare embedded: boolean;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
            }
            .top {
                display: flex;
                align-items: center;
                gap: calc(var(--u) * 4);
                min-height: 60px;
                border-bottom: 1px solid var(--rule-strong);
            }
            .mark {
                display: flex;
                align-items: baseline;
                gap: 10px;
                color: inherit;
                text-decoration: none;
                white-space: nowrap;
            }
            .mark b {
                font: 800 22px / 1 var(--sans);
                letter-spacing: -0.03em;
            }
            .wordmark {
                display: inline-flex;
                align-items: baseline;
            }
            .wordmark svg {
                width: 0.733em;
                height: 0.98em;
                margin-right: 0.03em;
                overflow: visible;
            }
            .wordmark path {
                fill: none;
                stroke: currentColor;
            }
            .wordmark circle {
                fill: var(--accent);
            }
            .mark span {
                font-size: var(--text-small);
                color: var(--muted);
            }
            nav {
                display: flex;
                gap: calc(var(--u) * 3);
                overflow-x: auto;
                scrollbar-width: none;
            }
            nav a,
            .demos a {
                position: relative;
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                color: var(--muted);
                font: 600 var(--text-body) / 1 var(--sans);
                text-decoration: none;
                white-space: nowrap;
                transition: color 160ms var(--ease-out);
            }
            nav a:hover,
            .demos a:hover,
            nav a[aria-current],
            .demos a[aria-current] {
                color: var(--ink);
            }
            nav a[aria-current]::after,
            .demos a[aria-current]::after {
                content: "";
                position: absolute;
                left: 0;
                right: 0;
                bottom: 4px;
                height: 2px;
                background: var(--accent);
            }
            .end {
                margin-left: auto;
                display: flex;
                align-items: center;
                gap: calc(var(--u) * 3);
            }
            .end a {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                color: var(--ink);
                font: 600 var(--text-small) / 1 var(--sans);
                text-decoration: none;
                white-space: nowrap;
            }
            .end a:hover {
                color: var(--accent-ink);
            }
            .end a[aria-current] {
                text-decoration: underline;
                text-decoration-color: var(--accent);
                text-decoration-thickness: 2px;
                text-underline-offset: 6px;
            }
            .version {
                font: 400 var(--text-label) / 1 var(--mono);
                color: var(--muted);
                white-space: nowrap;
            }
            .demos {
                display: flex;
                gap: calc(var(--u) * 3);
                min-height: 48px;
                align-items: center;
                overflow-x: auto;
                scrollbar-width: none;
            }
            .top .demos {
                min-height: 0;
                padding-left: calc(var(--u) * 3);
                border-left: 1px solid var(--rule);
            }
            .demos a {
                font-size: var(--text-small);
                min-height: 40px;
            }
            .demos a[aria-current]::after {
                bottom: 2px;
            }
            @media (max-width: 900px) {
                .mark span,
                .version {
                    display: none;
                }
            }
            @media (max-width: 720px) {
                .top {
                    flex-wrap: wrap;
                    gap: 0 calc(var(--u) * 3);
                    padding-top: 10px;
                }
                nav {
                    order: 3;
                    width: 100%;
                }
                .end {
                    gap: calc(var(--u) * 2);
                }
                .end .github-label {
                    display: none;
                }
            }
        `,
    ];

    constructor() {
        super();
        this.demos = [];
        this.current = "";
        this.index = false;
        this.embedded = false;
    }

    #demos(siblings: readonly DemoDefinition[]) {
        if (siblings.length === 0) return nothing;
        return html`<nav class="demos" aria-label="Demos in this category">
            ${siblings.map(
                (d) =>
                    html`<a
                        href=${demoHref(d.id)}
                        aria-current=${d.id === this.current ? "page" : nothing}
                        >${d.title}</a
                    >`,
            )}
        </nav>`;
    }

    protected override render() {
        const open = this.demos.find((d) => d.id === this.current);
        const category = this.index ? undefined : open?.category;
        const siblings = this.demos.filter((d) => d.category === category);
        return html`
            <div class="top">
                ${
                    this.embedded
                        ? nothing
                        : html`<a class="mark" href=${demoHref("")}
                              ><b>${wordmark}</b><span>Physics engine demos</span></a
                          >`
                }
                <nav aria-label="Categories">
                    ${CATEGORIES.map(({ id, label }) => {
                        const first = this.demos.find((d) => d.category === id);
                        if (!first) return nothing;
                        return html`<a
                            href=${demoHref(first.id)}
                            aria-current=${id === category ? "true" : nothing}
                            >${label}</a
                        >`;
                    })}
                </nav>
                ${this.embedded ? this.#demos(siblings) : nothing}
                <div class="end">
                    <a href="#/demos" aria-current=${this.index ? "page" : nothing}
                        >${icons.grid} All demos</a
                    >
                    ${
                        this.embedded
                            ? nothing
                            : html`<a
                                      href=${REPOSITORY_URL}
                                      target="_blank"
                                      rel="noopener"
                                      aria-label="Aether on GitHub"
                                      ><span class="github-label">GitHub</span> ${icons.external}</a
                                  >
                                  <span class="version">aether-physics ${ENGINE_VERSION}</span>`
                    }
                </div>
            </div>
            ${this.embedded ? nothing : this.#demos(siblings)}
        `;
    }
}

customElements.define("site-header", SiteHeader);

declare global {
    interface HTMLElementTagNameMap {
        "site-header": SiteHeader;
    }
}
