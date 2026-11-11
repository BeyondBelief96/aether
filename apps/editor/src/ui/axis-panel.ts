import { css, html, LitElement, type PropertyDeclarations } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { Vec3Like } from "aether-physics";
import { digitsOf, type Param, type ParamSchema, type ParamValue } from "../core/params";
import { baseStyles } from "./shared";
import "./controls/axis-choice";
import "./controls/axis-slider";
import "./controls/axis-vec3";

const TOGGLE_OPTIONS = [
    { value: "on", label: "On" },
    { value: "off", label: "Off" },
] as const;

/**
 * Every visible parameter of a demo as a row of axes.
 *
 * Events: `param-input` ({ key, value }).
 */
export class AxisPanel extends LitElement {
    static override properties: PropertyDeclarations = {
        schema: { attribute: false },
        values: { attribute: false },
    };

    declare schema: ParamSchema;
    declare values: Readonly<Record<string, ParamValue>>;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
                gap: calc(var(--u) * 3) calc(var(--u) * 4);
            }
            .empty {
                grid-column: 1 / -1;
                margin: 0;
                color: var(--muted);
                font-size: var(--text-small);
            }
        `,
    ];

    constructor() {
        super();
        this.schema = {};
        this.values = {};
    }

    #emit(key: string, value: unknown): void {
        this.dispatchEvent(
            new CustomEvent("param-input", {
                detail: { key, value },
                bubbles: true,
                composed: true,
            }),
        );
    }

    #control(key: string, param: Param) {
        const value = this.values[key];
        switch (param.kind) {
            case "number":
                return html`<axis-slider
                    label=${param.label}
                    .value=${value as number}
                    .min=${param.min}
                    .max=${param.max}
                    .step=${param.step}
                    .digits=${digitsOf(param)}
                    unit=${param.unit ?? ""}
                    color=${param.color ?? ""}
                    @value-input=${(e: CustomEvent<number>) => this.#emit(key, e.detail)}
                ></axis-slider>`;
            case "choice":
                return html`<axis-choice
                    label=${param.label}
                    .value=${value as string}
                    .options=${param.options}
                    @value-input=${(e: CustomEvent<string>) => this.#emit(key, e.detail)}
                ></axis-choice>`;
            case "toggle":
                return html`<axis-choice
                    label=${param.label}
                    .value=${value ? "on" : "off"}
                    .options=${TOGGLE_OPTIONS}
                    @value-input=${(e: CustomEvent<string>) => this.#emit(key, e.detail === "on")}
                ></axis-choice>`;
            case "vec3":
                return html`<axis-vec3
                    label=${param.label}
                    .value=${value as Vec3Like}
                    .digits=${param.digits ?? 2}
                    ?nonzero=${param.nonzero ?? false}
                    @value-input=${(e: CustomEvent<Vec3Like>) => this.#emit(key, e.detail)}
                ></axis-vec3>`;
        }
    }

    protected override render() {
        const visible = Object.entries(this.schema).filter(
            ([, param]) => !param.hidden?.(this.values),
        );
        if (visible.length === 0)
            return html`<p class="empty">
                This demo has no parameters. Use the physics rate below.
            </p>`;
        return repeat(
            visible,
            ([key]) => key,
            ([key, param]) => this.#control(key, param),
        );
    }
}

customElements.define("axis-panel", AxisPanel);

declare global {
    interface HTMLElementTagNameMap {
        "axis-panel": AxisPanel;
    }
}
