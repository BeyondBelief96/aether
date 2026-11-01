import {
    css,
    html,
    LitElement,
    type CSSResultGroup,
    type PropertyDeclarations,
} from "lit";
import type { QuatLike, Vec3Like } from "../../math";
import { DEG_TO_RAD, formatNumber, RAD_TO_DEG } from "../format/format";
import { panelStyles } from "../shared-styles";
import "../controls/aether-slider";
import "../controls/aether-vec3-input";

/** One-click axes. Any non-zero vector works; the demo normalizes it. */
const AXIS_PRESETS = [
    { label: "X", axis: { x: 1, y: 0, z: 0 } },
    { label: "Y", axis: { x: 0, y: 1, z: 0 } },
    { label: "Z", axis: { x: 0, y: 0, z: 1 } },
    { label: "XYZ", axis: { x: 1, y: 1, z: 1 } },
] as const;

export class GizmoPanel extends LitElement {
    static override properties: PropertyDeclarations = {
        axis: { attribute: false },
        angle: { attribute: false },
        quaternion: { attribute: false },
    };

    declare axis: Vec3Like;
    declare angle: number;
    declare quaternion: QuatLike;

    static override styles?: CSSResultGroup | undefined = [
        panelStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                gap: var(--space-3);
            }
        `,
    ];

    constructor() {
        super();
        this.axis = { x: 0, y: 1, z: 0 };
        this.angle = 0;
        this.quaternion = { w: 1, x: 0, y: 0, z: 0 };
    }

    #emit(name: string, detail: unknown): void {
        this.dispatchEvent(
            new CustomEvent(name, { detail, bubbles: true, composed: true }),
        );
    }

    protected override render() {
        const q = this.quaternion;
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
                        <button @click=${() => this.#emit("axis-change", { ...axis })}>
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
            </dl>
        `;
    }
}

customElements.define("aether-gizmo-panel", GizmoPanel);

declare global {
    interface HTMLElementTagNameMap {
        "aether-gizmo-panel": GizmoPanel;
    }
}
