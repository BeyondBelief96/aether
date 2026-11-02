import {
    css,
    html,
    LitElement,
    nothing,
    type CSSResultGroup,
    type PropertyDeclarations,
} from "lit";
import type { QuatLike, Vec3Like } from "../../math";
import {
    DEG_TO_RAD,
    formatDegrees,
    formatNumber,
    RAD_TO_DEG,
} from "../format/format";
import { panelStyles } from "../shared-styles";
import "../controls/aether-slider";
import "../controls/aether-vec3-input";

export type GizmoMode = "axis-angle" | "euler";

const EULER_SLIDERS = [
    { axis: "x", label: "X", color: "var(--axis-x)", range: 180 },
    { axis: "y", label: "Y", color: "var(--axis-y)", range: 90 },
    { axis: "z", label: "Z", color: "var(--axis-z)", range: 180 },
] as const;

/** One-click axes. Any non-zero vector works; the demo normalizes it. */
const AXIS_PRESETS = [
    { label: "X", axis: { x: 1, y: 0, z: 0 } },
    { label: "Y", axis: { x: 0, y: 1, z: 0 } },
    { label: "Z", axis: { x: 0, y: 0, z: 1 } },
    { label: "XYZ", axis: { x: 1, y: 1, z: 1 } },
] as const;

export interface AxisAngle {
    axis: Vec3Like;
    /** Radians */
    angle: number;
}

/**
 * Inputs and readouts for the rotation gizmo demo. Holds no state of its own: inputs come
 * in as properties and go out as events, and the demo pushes readouts in.
 *
 * Angles are degrees on screen and radians in every property and event.
 *
 * Events: `mode-change` (GizmoMode), `axis-change` (Vec3Like), `angle-change` (number),
 * `euler-change` (Vec3Like).
 */
export class GizmoPanel extends LitElement {
    static override properties: PropertyDeclarations = {
        // Inputs
        mode: { attribute: false },
        axis: { attribute: false },
        angle: { attribute: false },
        eulerInput: { attribute: false },
        // Readouts
        quaternion: { attribute: false },
        axisAngle: { attribute: false },
        euler: { attribute: false },
        matrix: { attribute: false },
        gimbalLock: { attribute: false },
    };

    declare mode: GizmoMode;
    declare axis: Vec3Like;
    declare angle: number;
    declare eulerInput: Vec3Like;
    declare quaternion: QuatLike;
    declare axisAngle: AxisAngle;
    declare euler: Vec3Like;
    /** 9 values, row-major. */
    declare matrix: readonly number[];
    declare gimbalLock: boolean;

    static override styles?: CSSResultGroup | undefined = [
        panelStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                gap: var(--space-3);
            }

            .matrix {
                display: grid;
                grid-template-columns: repeat(3, auto);
                justify-content: end;
                gap: 2px var(--space-3);
                font-family: var(--mono);
                font-variant-numeric: tabular-nums;
                white-space: pre;
            }
            .c0 {
                color: var(--axis-x);
            }
            .c1 {
                color: var(--axis-y);
            }
            .c2 {
                color: var(--axis-z);
            }
            p.warn {
                margin: 0;
            }
        `,
    ];

    constructor() {
        super();
        this.mode = "axis-angle";
        this.axis = { x: 0, y: 1, z: 0 };
        this.angle = 0;
        this.eulerInput = { x: 0, y: 0, z: 0 };
        this.quaternion = { w: 1, x: 0, y: 0, z: 0 };
        this.axisAngle = { axis: { x: 1, y: 0, z: 0 }, angle: 0 };
        this.euler = { x: 0, y: 0, z: 0 };
        this.matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
        this.gimbalLock = false;
    }

    #emit(name: string, detail: unknown): void {
        this.dispatchEvent(
            new CustomEvent(name, { detail, bubbles: true, composed: true }),
        );
    }

    #renderModeSwitch() {
        const button = (mode: GizmoMode, label: string) => html`
            <button
                class=${this.mode === mode ? "primary" : ""}
                aria-pressed=${String(this.mode === mode)}
                @click=${() => this.#emit("mode-change", mode)}
            >
                ${label}
            </button>
        `;
        return html`
            <div class="buttons" role="group" aria-label="Input mode">
                ${button("axis-angle", "Axis–angle")}
                ${button("euler", "Euler XYZ")}
            </div>
        `;
    }

    #renderAxisAngleInputs() {
        return html`
            <aether-vec3-input
                label="Axis"
                nonzero
                .value=${this.axis}
                @value-change=${(e: CustomEvent<Vec3Like>) =>
                    this.#emit("axis-change", e.detail)}
            ></aether-vec3-input>
            <div class="buttons" role="group" aria-label="Axis presets">
                ${AXIS_PRESETS.map(
                    ({ label, axis }) => html`
                        <button
                            @click=${() =>
                                this.#emit("axis-change", { ...axis })}
                        >
                            ${label}
                        </button>
                    `,
                )}
            </div>
            <aether-slider
                label="Angle"
                min="-180"
                max="180"
                step="1"
                digits="0"
                unit="°"
                .value=${this.angle * RAD_TO_DEG}
                @value-change=${(e: CustomEvent<number>) =>
                    this.#emit("angle-change", e.detail * DEG_TO_RAD)}
            >
            </aether-slider>
        `;
    }

    #renderEulerInputs() {
        return EULER_SLIDERS.map(
            ({ axis, label, color, range }) => html`
                <aether-slider
                    label=${label}
                    color=${color}
                    min=${-range}
                    max=${range}
                    step="1"
                    digits="0"
                    unit="°"
                    .value=${this.eulerInput[axis] * RAD_TO_DEG}
                    @value-change=${(e: CustomEvent<number>) =>
                        this.#emit("euler-change", {
                            ...this.eulerInput,
                            [axis]: e.detail * DEG_TO_RAD,
                        })}
                ></aether-slider>
            `,
        );
    }

    protected override render() {
        const q = this.quaternion;
        const { axis, angle } = this.axisAngle;
        const e = this.euler;
        // Built here because dd is `white-space: pre`: if Prettier wrapped this inside the
        // template, the line breaks and indentation would render as text.
        const axisText = [axis.x, axis.y, axis.z]
            .map((v) => formatNumber(v, 2))
            .join(" ");
        return html`
            ${this.#renderModeSwitch()}
            ${
                this.mode === "axis-angle"
                    ? this.#renderAxisAngleInputs()
                    : this.#renderEulerInputs()
            }
            ${
                this.gimbalLock
                    ? html`<p class="warn">
                          Gimbal lock: X and Z now rotate about the same axis.
                      </p>`
                    : nothing
            }

            <h3>Quaternion</h3>
            <dl>
                <dt>w</dt>
                <dd>${formatNumber(q.w)}</dd>
                <dt>x</dt>
                <dd>${formatNumber(q.x)}</dd>
                <dt>y</dt>
                <dd>${formatNumber(q.y)}</dd>
                <dt>z</dt>
                <dd>${formatNumber(q.z)}</dd>
                <dt>|q|</dt>
                <dd>${formatNumber(Math.hypot(q.w, q.x, q.y, q.z))}</dd>
            </dl>
            <h3>Axis–angle</h3>
            <dl>
                <dt>Axis</dt>
                <dd>${axisText}</dd>
                <dt>Angle</dt>
                <dd>${formatDegrees(angle)}</dd>
            </dl>

            <h3>Euler XYZ</h3>
            <dl>
                <dt>X</dt>
                <dd>${formatDegrees(e.x)}</dd>
                <dt>Y</dt>
                <dd>${formatDegrees(e.y)}</dd>
                <dt>Z</dt>
                <dd>${formatDegrees(e.z)}</dd>
            </dl>

            <h3>Rotation matrix</h3>
            <div class="matrix">
                ${this.matrix.map(
                    (v, i) =>
                        html`<span class="c${i % 3}">${formatNumber(v)}</span>`,
                )}
            </div>
        `;
    }
}

customElements.define("aether-gizmo-panel", GizmoPanel);

declare global {
    interface HTMLElementTagNameMap {
        "aether-gizmo-panel": GizmoPanel;
    }
}
