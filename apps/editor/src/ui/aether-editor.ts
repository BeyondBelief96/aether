import { css, html, LitElement, type PropertyDeclarations } from "lit";
import type { Group } from "three";
import type { DemoDefinition, ReadoutGroup } from "../core/demo";
import { morph } from "../core/morph";
import {
    decodeValues,
    encodeValues,
    sameValue,
    type NumberParam,
    type ParamValue,
} from "../core/params";
import { formatHash, parseHash, type Route } from "../core/route";
import { DemoSession, type LoopStats, type SessionHost } from "../core/session";
import { ENGINE_VERSION, REPOSITORY_URL } from "../core/site";
import { demos, featuredDemo, findDemo } from "../demos/registry";
import { applyPalette, DARK, LIGHT, type ScenePalette } from "../stage/palette";
import type { DataTab } from "./data-tabs";
import type { DemoStage } from "./demo-stage";
import type { InstanceView } from "./instance-bar";
import { baseStyles } from "./shared";
import "./axis-panel";
import "./data-tabs";
import "./demo-index";
import "./demo-stage";
import "./instance-bar";
import "./site-header";
import "./transport-bar";

const POLL_MS = 250;
const URL_DELAY_MS = 200;
const TAB_KEY = "aether.data-tab";

function readTab(): DataTab {
    try {
        const tab = localStorage.getItem(TAB_KEY);
        return tab === "charts" || tab === "code" ? tab : "readouts";
    } catch {
        return "readouts";
    }
}

function writeTab(tab: DataTab): void {
    try {
        localStorage.setItem(TAB_KEY, tab);
    } catch {
        // Storage can be unavailable; the tab is a convenience only.
    }
}

/** Whether `value` is within half a step of `target`, for numbers, or equal otherwise. */
function close(param: NumberParam | undefined, value: ParamValue, target: ParamValue): boolean {
    if (param && typeof value === "number" && typeof target === "number") {
        return Math.abs(value - target) <= param.step / 2;
    }
    return sameValue(value, target);
}

/**
 * The demo app: the open demo's stage, parameters, instances and transport, its data, and the
 * index of every demo. Owns the frame loop and keeps the URL in step with the parameters.
 */
export class AetherEditor extends LitElement {
    static override properties: PropertyDeclarations = {
        route: { state: true },
        demo: { state: true },
        values: { state: true },
        paused: { state: true },
        hz: { state: true },
        timeScale: { state: true },
        stats: { state: true },
        readouts: { state: true },
        tab: { state: true },
    };

    declare route: Route;
    declare demo: DemoDefinition;
    declare values: Readonly<Record<string, ParamValue>>;
    declare paused: boolean;
    declare hz: number;
    declare timeScale: number;
    declare stats: LoopStats;
    declare readouts: readonly ReadoutGroup[];
    declare tab: DataTab;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
                padding: 0 var(--gutter);
            }
            main {
                display: block;
            }
            .demo {
                display: grid;
                gap: calc(var(--u) * 3);
                padding-bottom: calc(var(--u) * 6);
            }
            demo-stage {
                height: clamp(340px, calc(100dvh - 390px), 860px);
            }
            instance-bar {
                margin-top: calc(var(--u) * -0.5);
            }
            data-tabs {
                padding-bottom: calc(var(--u) * 9);
            }
            demo-index {
                padding-bottom: calc(var(--u) * 9);
            }
            [hidden] {
                display: none !important;
            }
            footer {
                display: flex;
                flex-wrap: wrap;
                gap: var(--u) calc(var(--u) * 3);
                justify-content: space-between;
                padding: calc(var(--u) * 3) 0 calc(var(--u) * 4);
                border-top: 1px solid var(--rule-strong);
                font-size: var(--text-small);
                color: var(--muted);
            }
            footer a {
                color: var(--ink);
                text-underline-offset: 3px;
            }
            .index-page {
                padding-top: calc(var(--u) * 5);
            }
            @media (max-width: 720px) {
                demo-stage {
                    height: 56svh;
                    min-height: 300px;
                }
                .demo {
                    gap: calc(var(--u) * 2.5);
                }
            }
        `,
    ];

    #session: DemoSession | null = null;
    #palette: ScenePalette = LIGHT;
    #frame = 0;
    #lastPoll = 0;
    #urlTimer = 0;
    #cancelMorph: () => void = () => {};
    #scheme = window.matchMedia("(prefers-color-scheme: dark)");
    #unsubscribe: (() => void)[] = [];

    constructor() {
        super();
        this.route = parseHash(location.hash);
        this.demo = featuredDemo;
        this.values = {};
        this.paused = false;
        this.hz = 60;
        this.timeScale = 1;
        this.stats = { fps: 0, stepsPerFrame: 0, simTime: 0, droppedTime: false };
        this.readouts = [];
        this.tab = readTab();
    }

    get #stage(): DemoStage | null {
        return this.renderRoot.querySelector("demo-stage");
    }

    override connectedCallback(): void {
        super.connectedCallback();
        window.addEventListener("hashchange", this.#onHashChange);
        window.addEventListener("keydown", this.#onKey);
        this.#scheme.addEventListener("change", this.#onSchemeChange);
        this.#palette = this.#scheme.matches ? DARK : LIGHT;
        applyPalette(document.documentElement, this.#palette);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        window.removeEventListener("hashchange", this.#onHashChange);
        window.removeEventListener("keydown", this.#onKey);
        this.#scheme.removeEventListener("change", this.#onSchemeChange);
        cancelAnimationFrame(this.#frame);
        this.#closeSession();
    }

    protected override async firstUpdated(): Promise<void> {
        // The stage creates its renderer in its own first update, after this one.
        await this.#stage?.updateComplete;
        this.#stage?.stage?.setPalette(this.#palette);
        this.#openRoute(this.route);
        this.#frame = requestAnimationFrame(this.#tick);
    }

    get #host(): SessionHost {
        const stage = this.#stage?.stage;
        const scene = stage?.scene;
        return {
            view: stage?.view ?? {
                camera: null as never,
                element: this,
                setOrbitEnabled: () => {},
            },
            palette: this.#palette,
            attach: (root: Group) => scene?.add(root),
            detach: (root: Group) => scene?.remove(root),
        };
    }

    #openRoute(route: Route): void {
        this.route = route;
        if (route.view === "index") {
            document.title = "All demos · Aether";
            window.scrollTo({ top: 0 });
            return;
        }
        const demo = findDemo(route.id) ?? featuredDemo;
        this.#openDemo(demo, route.query);
    }

    #openDemo(demo: DemoDefinition, query: URLSearchParams): void {
        this.#cancelMorph();
        this.#closeSession();
        this.demo = demo;
        document.title = `${demo.title} · Aether`;
        this.#stage?.stage?.setCamera(demo.camera.position, demo.camera.target);

        const session = new DemoSession(demo, decodeValues(demo.params, query), this.#host);
        session.loop.paused = this.paused;
        session.loop.timeScale = this.timeScale;
        this.#session = session;
        this.values = session.values;
        this.hz = session.loop.hz;
        this.#unsubscribe = [
            session.onValues((values) => {
                this.values = values;
                this.#scheduleUrl();
            }),
            session.onStats((stats) => {
                this.stats = stats;
            }),
        ];
        this.#poll();
    }

    #closeSession(): void {
        for (const off of this.#unsubscribe) off();
        this.#unsubscribe = [];
        this.#session?.dispose();
        this.#session = null;
    }

    #tick = (now: number): void => {
        this.#frame = requestAnimationFrame(this.#tick);
        const session = this.#session;
        const stage = this.#stage;
        if (!session || !stage?.stage || this.route.view !== "demo") return;
        session.frame(now);
        stage.stage.draw();
        stage.placeCallouts();
        if (now - this.#lastPoll >= POLL_MS) {
            this.#lastPoll = now;
            this.#poll();
        }
    };

    #poll(): void {
        const session = this.#session;
        if (!session) return;
        const stage = this.#stage;
        if (stage) stage.callouts = session.callouts();
        if (this.tab === "readouts") this.readouts = session.readouts();
    }

    #scheduleUrl(): void {
        clearTimeout(this.#urlTimer);
        this.#urlTimer = window.setTimeout(() => {
            const session = this.#session;
            if (!session || this.route.view !== "demo") return;
            const query = encodeValues(session.definition.params, session.values);
            const route: Route = { view: "demo", id: session.definition.id, query };
            this.route = route;
            history.replaceState(null, "", formatHash(route));
        }, URL_DELAY_MS);
    }

    #onHashChange = (): void => {
        const next = parseHash(location.hash);
        if (formatHash(next) === formatHash(this.route)) return;
        if (
            next.view === "demo" &&
            this.route.view === "demo" &&
            (findDemo(next.id) ?? featuredDemo) === this.demo &&
            this.#session
        ) {
            // Same demo, new values: apply them without restarting.
            this.route = next;
            this.#session.set(decodeValues(this.demo.params, next.query));
            return;
        }
        this.#openRoute(next);
        if (next.view === "demo") window.scrollTo({ top: 0 });
    };

    #onSchemeChange = (): void => {
        this.#palette = this.#scheme.matches ? DARK : LIGHT;
        applyPalette(document.documentElement, this.#palette);
        this.#stage?.stage?.setPalette(this.#palette);
        this.#session?.rehost(this.#host);
        this.renderRoot
            .querySelector("data-tabs")
            ?.shadowRoot?.querySelectorAll("line-chart")
            .forEach((c) => c.invalidate());
    };

    #set(key: string, value: unknown): void {
        this.#cancelMorph();
        this.#session?.set({ [key]: value });
    }

    #pickPreset(index: number): void {
        const session = this.#session;
        const preset = session?.definition.presets?.[index];
        if (!session || !preset) return;
        this.#cancelMorph();
        if (preset.hz !== undefined) this.#setHz(preset.hz);
        const from = session.values as Record<string, ParamValue>;
        this.#cancelMorph = morph(
            session.definition.params,
            from,
            preset.values as Record<string, ParamValue>,
            (values) => session.set(values),
        );
    }

    #instances(): InstanceView[] {
        const presets = this.demo.presets ?? [];
        return presets.map((preset) => {
            const matches = Object.entries(preset.values).every(([key, target]) => {
                const param = this.demo.params[key];
                const value = this.values[key];
                return (
                    value !== undefined &&
                    close(param?.kind === "number" ? param : undefined, value, target as ParamValue)
                );
            });
            return {
                label: preset.label,
                ...(preset.note ? { note: preset.note } : {}),
                active: matches && (preset.hz === undefined || preset.hz === this.hz),
            };
        });
    }

    #togglePause(): void {
        this.paused = !this.paused;
        if (this.#session) this.#session.loop.paused = this.paused;
    }

    #setHz(hz: number): void {
        this.hz = hz;
        if (this.#session) this.#session.loop.hz = hz;
    }

    #reset(): void {
        this.#cancelMorph();
        this.#session?.reset();
        this.#poll();
    }

    #onKey = (e: KeyboardEvent): void => {
        if (e.metaKey || e.ctrlKey || e.altKey || this.route.view !== "demo") return;
        const target = e.composedPath()[0];
        if (
            target instanceof HTMLElement &&
            target.matches("input, select, textarea, button, [role='tab'], [role='radio']")
        )
            return;
        const key = e.key.toLowerCase();
        if (key === " ") {
            e.preventDefault();
            this.#togglePause();
        } else if (key === "." && this.paused) {
            this.#session?.loop.stepOnce();
        } else if (key === "r") {
            this.#reset();
        } else if (/^[1-9]$/.test(key)) {
            this.#pickPreset(Number(key) - 1);
        } else {
            const action = this.demo.actions?.find((a) => a.key === key);
            if (action) this.#session?.action(action.id);
        }
    };

    protected override render() {
        const index = this.route.view === "index";
        const charts = this.#session ? [...this.#session.charts.values()] : [];
        return html`
            <site-header .demos=${demos} current=${this.demo.id} ?index=${index}></site-header>
            <main>
                <section class="demo" ?hidden=${index} aria-label=${this.demo.title}>
                    <demo-stage
                        heading=${this.demo.title}
                        summary=${this.demo.summary}
                        hint=${this.demo.hint ?? ""}
                    ></demo-stage>
                    <axis-panel
                        .schema=${this.demo.params}
                        .values=${this.values}
                        @param-input=${(e: CustomEvent<{ key: string; value: unknown }>) => this.#set(e.detail.key, e.detail.value)}
                    ></axis-panel>
                    <instance-bar
                        .instances=${this.#instances()}
                        .actions=${this.demo.actions ?? []}
                        @preset-pick=${(e: CustomEvent<number>) => this.#pickPreset(e.detail)}
                        @demo-action=${(e: CustomEvent<string>) => this.#session?.action(e.detail)}
                    ></instance-bar>
                    <transport-bar
                        ?paused=${this.paused}
                        .hz=${this.hz}
                        .timeScale=${this.timeScale}
                        .stats=${this.stats}
                        @toggle-pause=${() => this.#togglePause()}
                        @step-once=${() => this.#session?.loop.stepOnce()}
                        @reset=${() => this.#reset()}
                        @hz-change=${(e: CustomEvent<number>) => this.#setHz(e.detail)}
                        @time-scale-change=${(e: CustomEvent<number>) => {
                            this.timeScale = e.detail;
                            if (this.#session) this.#session.loop.timeScale = e.detail;
                        }}
                    ></transport-bar>
                </section>
                <data-tabs
                    ?hidden=${index}
                    tab=${this.tab}
                    .readouts=${this.readouts}
                    .charts=${charts}
                    source=${this.demo.source}
                    @tab-change=${(e: CustomEvent<DataTab>) => {
                        this.tab = e.detail;
                        writeTab(e.detail);
                        this.#poll();
                    }}
                ></data-tabs>
                <demo-index
                    class=${index ? "index-page" : ""}
                    .demos=${demos}
                    current=${index ? "" : this.demo.id}
                    heading=${index ? "All demos" : "More demos"}
                ></demo-index>
            </main>
            <footer>
                <span
                    >Every demo uses only the public API of
                    <a href=${REPOSITORY_URL} target="_blank" rel="noopener">aether-physics</a>
                    ${ENGINE_VERSION}.</span
                >
                <span>MIT licensed</span>
            </footer>
        `;
    }
}

customElements.define("aether-editor", AetherEditor);

declare global {
    interface HTMLElementTagNameMap {
        "aether-editor": AetherEditor;
    }
}
