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
import { localImports, splitImports } from "./split-imports";

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

interface SourceFile {
    /** Path relative to the repository root. */
    readonly path: string;
    readonly text: string;
}

/** Folder of a repository path, with its trailing slash. */
const folderOf = (path: string) => path.slice(0, path.lastIndexOf("/") + 1);
const nameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** Loads the source of a repository path under `src/`, or `null` if it isn't bundled. */
function load(path: string): Promise<string> | null {
    return sources[`../${path.slice(path.indexOf("src/") + 4)}`]?.() ?? null;
}

/**
 * The demo's source: its own file and the files it imports from its folder, such as the
 * simulation it drives, one tab per file. Every engine import is marked.
 */
export class CodeView extends LitElement {
    static override properties: PropertyDeclarations = {
        path: { type: String },
        files: { state: true },
        selected: { state: true },
        error: { state: true },
    };

    /** The demo's own file, relative to the repository root. */
    declare path: string;
    /** The files shown, imported files first. `null` while loading. */
    declare files: readonly SourceFile[] | null;
    declare selected: number;
    declare error: boolean;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
            }
            .bar {
                display: flex;
                align-items: flex-end;
                justify-content: space-between;
                gap: var(--u) calc(var(--u) * 3);
                flex-wrap: wrap;
                border-bottom: 1px solid var(--rule);
            }
            [role="tablist"] {
                display: flex;
                flex-wrap: wrap;
                column-gap: calc(var(--u) * 3);
            }
            [role="tab"] {
                position: relative;
                flex: none;
                padding: 10px 0;
                font: 500 13px / 1.3 var(--mono);
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
                bottom: 0;
                height: 2px;
                background: var(--accent);
            }
            a {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 10px 0;
                color: var(--ink);
                font: 600 var(--text-small) / 1.3 var(--sans);
                text-decoration: underline;
                text-underline-offset: 3px;
                text-decoration-thickness: 1px;
            }
            a:hover {
                color: var(--accent-ink);
            }
            .meta {
                display: flex;
                justify-content: space-between;
                gap: var(--u) calc(var(--u) * 3);
                flex-wrap: wrap;
                padding: var(--u) 0 calc(var(--u) * 2);
                font-size: var(--text-small);
                color: var(--ink-2);
            }
            .path {
                font: 400 11px / 1.6 var(--mono);
                color: var(--muted);
                overflow-wrap: anywhere;
            }
            .legend .e {
                padding: 0 4px;
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
        this.files = null;
        this.selected = 0;
        this.error = false;
    }

    protected override willUpdate(): void {
        if (this.path === this.#loading) return;
        this.#loading = this.path;
        this.files = null;
        this.selected = 0;
        this.error = false;
        void this.#load(this.path);
    }

    /** Loads the demo's file, then every file it imports from its folder. */
    async #load(path: string): Promise<void> {
        const current = () => path === this.path;
        try {
            const text = await load(path);
            if (text == null) throw new Error(`${path} is not bundled`);
            const folder = folderOf(path);
            const imported = await Promise.all(
                localImports(text).map(async (name) => {
                    const importPath = `${folder}${name}.ts`;
                    const importText = await load(importPath)?.catch(() => null);
                    return importText == null ? null : { path: importPath, text: importText };
                }),
            );
            if (!current()) return;
            this.files = [...imported.filter((file) => file !== null), { path, text }];
        } catch {
            if (current()) this.error = true;
        }
    }

    #onKey(e: KeyboardEvent): void {
        const count = this.files?.length ?? 0;
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (step === 0 || count < 2) return;
        e.preventDefault();
        this.selected = (this.selected + step + count) % count;
        this.updateComplete.then(() =>
            this.renderRoot
                .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
                ?.focus(),
        );
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

    #renderTabs(files: readonly SourceFile[], selected: number) {
        return html`<div role="tablist" aria-label="Source files" @keydown=${this.#onKey}>
            ${files.map(
                (file, i) =>
                    html`<button
                        role="tab"
                        id=${`file-${i}`}
                        aria-selected=${String(i === selected)}
                        aria-controls="source"
                        tabindex=${i === selected ? 0 : -1}
                        title=${file.path}
                        @click=${() => (this.selected = i)}
                    >
                        ${nameOf(file.path)}
                    </button>`,
            )}
        </div>`;
    }

    protected override render() {
        const files = this.files;
        const selected = Math.min(this.selected, (files?.length ?? 1) - 1);
        const path = files?.[selected]?.path ?? this.path;
        const link = html`<a
            href=${`${REPOSITORY_URL}/blob/main/${path}`}
            target="_blank"
            rel="noopener"
            >View on GitHub ${icons.external}</a
        >`;
        if (this.error || !files) {
            return html`
                <div class="bar"><span class="path">${this.path}</span>${link}</div>
                <p class="status">
                    ${
                        this.error
                            ? "The source for this demo could not be loaded. It is on GitHub at the path above."
                            : "Loading source…"
                    }
                </p>
            `;
        }
        return html`
            <div class="bar">${this.#renderTabs(files, selected)} ${link}</div>
            <div role="tabpanel" id="source" aria-labelledby=${`file-${selected}`}>
                <div class="meta">
                    <span class="path">${path}</span>
                    <span class="legend"
                        ><span class="e">Highlighted</span> names come from
                        <code>aether-physics</code>.</span
                    >
                </div>
                ${this.#renderSource(files[selected]!.text)}
            </div>
        `;
    }
}

customElements.define("code-view", CodeView);

declare global {
    interface HTMLElementTagNameMap {
        "code-view": CodeView;
    }
}
