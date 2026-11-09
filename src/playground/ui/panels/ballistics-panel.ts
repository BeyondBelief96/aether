import {
    css,
    html,
    LitElement,
    type CSSResultGroup,
    type PropertyDeclarations,
    type TemplateResult,
} from "lit";
import { formatNumber } from "../format/format";
import { panelStyles } from "../shared-styles";
import "../controls/aether-segmented";
import "../controls/aether-slider";
import type { SegmentedOption } from "../controls/aether-segmented";

export interface ProjectileSpec {
    /** kg */
    mass: number;
    /** m/s */
    speed: number;
    /** m/s², magnitude */
    acceleration: number;
}

export interface ShotReport {
    /** s */
    flightTime: number;
    /** m */
    range: number;
    /** m */
    apex: number;
    /** m/s */
    finalSpeed: number;
}

/**
 * Inputs and readouts for the ballistics demo. Holds no state of its own: inputs come in as
 * properties and go out as events, and the demo pushes readouts in.
 *
 * Events: `preset-change` (preset id), `damping-change` (number), `auto-fire-change` (boolean),
 * `fire`.
 */
export class BallisticsPanel extends LitElement {
    static override properties: PropertyDeclarations = {
        // Inputs
        presets: { attribute: false },
        preset: { attribute: false },
        damping: { attribute: false },
        autoFire: { attribute: false },
        // Readouts
        spec: { attribute: false },
        inFlight: { attribute: false },
        lastShot: { attribute: false },
    };

    declare presets: readonly SegmentedOption[];
    declare preset: string;
    declare damping: number;
    declare autoFire: boolean;
    declare spec: ProjectileSpec;
    declare inFlight: number;
    declare lastShot: ShotReport | null;

    static override styles: CSSResultGroup = [
        panelStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
        `,
    ];

    constructor() {
        super();
        this.presets = [];
        this.preset = "";
        this.damping = 1;
        this.autoFire = false;
        this.spec = { mass: 0, speed: 0, acceleration: 0 };
        this.inFlight = 0;
        this.lastShot = null;
    }

    #emit(name: string, detail?: unknown): void {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    protected override render(): TemplateResult {
        const { mass, speed, acceleration } = this.spec;
        const last = this.lastShot;
        // Built here because dd is `white-space: pre`: a line break inside the template
        // would render as text.
        const massText = `${formatNumber(mass, 1)} kg`;
        const speedText = `${formatNumber(speed, 1)} m/s`;
        const accelText = `${formatNumber(acceleration, 1)} m/s²`;
        const timeText = last ? `${formatNumber(last.flightTime, 2)} s` : "—";
        const rangeText = last ? `${formatNumber(last.range, 1)} m` : "—";
        const apexText = last ? `${formatNumber(last.apex, 1)} m` : "—";
        const finalText = last ? `${formatNumber(last.finalSpeed, 1)} m/s` : "—";

        return html`
            <aether-segmented
                label="Projectile"
                .options=${this.presets}
                .value=${this.preset}
                @value-change=${(e: CustomEvent<string>) => this.#emit("preset-change", e.detail)}
            ></aether-segmented>
            <aether-slider
                label="Damping (kept per second)"
                min="0.1"
                max="1"
                step="0.01"
                digits="2"
                .value=${this.damping}
                @value-change=${(e: CustomEvent<number>) => this.#emit("damping-change", e.detail)}
            ></aether-slider>
            <div class="buttons">
                <button class="primary" @click=${() => this.#emit("fire")}>Fire</button>
                <button
                    aria-pressed=${String(this.autoFire)}
                    @click=${() => this.#emit("auto-fire-change", !this.autoFire)}
                >
                    Auto-fire: ${this.autoFire ? "on" : "off"}
                </button>
            </div>

            <h3>Projectile</h3>
            <dl>
                <dt>Mass</dt>
                <dd>${massText}</dd>
                <dt>Muzzle speed</dt>
                <dd>${speedText}</dd>
                <dt>Acceleration</dt>
                <dd>${accelText}</dd>
                <dt>In flight</dt>
                <dd>${this.inFlight}</dd>
            </dl>

            <h3>Last completed shot</h3>
            <dl>
                <dt>Flight time</dt>
                <dd>${timeText}</dd>
                <dt>Range</dt>
                <dd>${rangeText}</dd>
                <dt>Apex</dt>
                <dd>${apexText}</dd>
                <dt>Final speed</dt>
                <dd>${finalText}</dd>
            </dl>
        `;
    }
}

customElements.define("aether-ballistics-panel", BallisticsPanel);

declare global {
    interface HTMLElementTagNameMap {
        "aether-ballistics-panel": BallisticsPanel;
    }
}
