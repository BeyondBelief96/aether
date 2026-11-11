import {
    css,
    html,
    LitElement,
    nothing,
    type PropertyDeclarations,
    type TemplateResult,
} from "lit";
import { REPOSITORY_URL } from "../core/site";
import { baseStyles, icons } from "./shared";
import { splitImports } from "./split-imports";

const sources = import.meta.glob(["../demos/**/*.ts", "!../demos/**/tests/**"], {
    query: "?raw",
    import: "default",
}) as Record<string, () => Promise<string>>;

const TOKEN =
    /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|return|function|class|new|if|else|for|of|type|interface|readonly|extends|implements|this|true|false|null|undefined|continue|break|while|switch|case|as)\b|(\b\d[\d_.]*(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)/g;

/** Names the file imports from the engine package. */
function engineImports(source: string): Set<string> {
    const names = new Set<string>();
    const pattern = /import\s*\{([^}]*)\}\s*from\s*"aether-physics"/g;
    for (const match of source.matchAll(pattern)) {
        for (const part of (match[1] ?? "").split(",")) {
            const name = part.replace(/\btype\b/, "").trim();
            if (name) names.add(name);
        }
    }
    return names;
}

function highlight(source: string, engine = engineImports(source)): TemplateResult[] {
    const out: TemplateResult[] = [];
    let last = 0;
    for (const match of source.matchAll(TOKEN)) {
        const index = match.index ?? 0;
        if (index > last) out.push(html`${source.slice(last, index)}`);
        const [text, comment, string, keyword, number, identifier] = match;
        if (comment) out.push(html`<span class="c">${text}</span>`);
        else if (string)
            out.push(html`<span class=${text === '"aether-physics"' ? "e" : "s"}>${text}</span>`);
        else if (keyword) out.push(html`<span class="k">${text}</span>`);
        else if (number) out.push(html`<span class="n">${text}</span>`);
        else if (identifier && engine.has(identifier))
            out.push(html`<span class="e">${text}</span>`);
        else out.push(html`${text}`);
        last = index + text.length;
    }
    if (last < source.length) out.push(html`${source.slice(last)}`);
    return out;
}

/** The demo's own source file, with every engine import marked. */
export class CodeView extends LitElement {
    static override properties: PropertyDeclarations = {
        path: { type: String },
        source: { state: true },
        error: { state: true },
    };

    declare path: string;
    declare source: string | null;
    declare error: boolean;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
            }
            .bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: calc(var(--u) * 2);
                flex-wrap: wrap;
                margin-bottom: calc(var(--u) * 2);
            }
            .path {
                font: 500 var(--text-small) / 1.3 var(--mono);
                overflow-wrap: anywhere;
            }
            .legend {
                font-size: var(--text-small);
                color: var(--ink-2);
            }
            .legend .e {
                padding: 0 4px;
            }
            a {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                color: var(--ink);
                font: 600 var(--text-small) / 1 var(--sans);
                text-decoration: underline;
                text-underline-offset: 3px;
                text-decoration-thickness: 1px;
            }
            a:hover {
                color: var(--accent-ink);
            }
            pre {
                margin: 0;
                max-height: 720px;
                overflow: auto;
                padding: calc(var(--u) * 2) 0;
                border-top: 1px solid var(--rule-strong);
                border-bottom: 1px solid var(--rule);
                font: 400 13px / 1.6 var(--mono);
                tab-size: 4;
                scrollbar-color: var(--muted) transparent;
            }
            details {
                border-top: 1px solid var(--rule-strong);
            }
            summary {
                padding: 10px 0;
                font: 600 var(--text-small) / 1.2 var(--sans);
                cursor: pointer;
            }
            summary .num {
                margin-left: var(--u);
                font-weight: 400;
                color: var(--muted);
            }
            details[open] pre.imports {
                border-bottom: 0;
                max-height: none;
            }
            .c {
                color: var(--muted);
                font-style: italic;
            }
            .s {
                color: var(--ink-2);
            }
            .k {
                font-weight: 700;
            }
            .n {
                color: var(--ink-2);
            }
            .e {
                color: var(--accent-ink);
                font-weight: 700;
                background: color-mix(in srgb, var(--accent) 10%, transparent);
            }
            .status {
                color: var(--muted);
                font-size: var(--text-small);
            }
        `,
    ];

    #loading = "";

    constructor() {
        super();
        this.path = "";
        this.source = null;
        this.error = false;
    }

    protected override willUpdate(): void {
        if (this.path === this.#loading) return;
        this.#loading = this.path;
        this.source = null;
        this.error = false;
        const key = `../${this.path.slice(this.path.indexOf("src/") + 4)}`;
        const load = sources[key];
        if (!load) {
            this.error = true;
            return;
        }
        const path = this.path;
        load()
            .then((text) => {
                if (path === this.path) this.source = text;
            })
            .catch(() => {
                if (path === this.path) this.error = true;
            });
    }

    #renderSource(source: string) {
        const engine = engineImports(source);
        const [imports, body] = splitImports(source);
        const lines = imports.split("\n").length - 1;
        return html`
            ${
                imports
                    ? html`<details>
                          <summary>Imports <span class="num">${lines} lines</span></summary>
                          <pre class="imports"><code>${highlight(imports, engine)}</code></pre>
                      </details>`
                    : nothing
            }
            <pre><code>${highlight(body, engine)}</code></pre>
        `;
    }

    protected override render() {
        return html`
            <div class="bar">
                <span class="path">${this.path}</span>
                <span class="legend"
                    ><span class="e">Highlighted</span> names come from
                    <code>aether-physics</code>.</span
                >
                <a href=${`${REPOSITORY_URL}/blob/main/${this.path}`} target="_blank" rel="noopener"
                    >View on GitHub ${icons.external}</a
                >
            </div>
            ${
                this.error
                    ? html`<p class="status">
                          The source for this demo could not be loaded. It is on GitHub at the path
                          above.
                      </p>`
                    : this.source === null
                      ? html`<p class="status">Loading source…</p>`
                      : this.#renderSource(this.source)
            }
            ${nothing}
        `;
    }
}

customElements.define("code-view", CodeView);

declare global {
    interface HTMLElementTagNameMap {
        "code-view": CodeView;
    }
}
