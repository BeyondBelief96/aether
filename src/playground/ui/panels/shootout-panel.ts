import {
    css,
    html,
    LitElement,
    nothing,
    type CSSResultGroup,
    type PropertyDeclarations,
    type PropertyValues,
    type TemplateResult,
} from "lit";
import { formatCompact, formatNumber } from "../format/format";
import { panelStyles } from "../shared-styles";
import "../charts/aether-line-chart";
import "../controls/aether-segmented";
import "../controls/aether-slider";
import type { ChartSeries } from "../charts/aether-line-chart";
import type { SegmentedOption } from "../controls/aether-segmented";

export type EnergyRange = "full" | "zoom" | "fine";
export type DampingMode = "none" | "power" | "pade";

export interface IntegratorRow {
    label: string;
    /** Name of the CSS custom property holding this integrator's color. */
    color: string;
    /** Current energy over initial energy. */
    energyRatio: number;
}

const RANGES: Readonly<
    Record<EnergyRange, { min: number; max: number; digits: number }>
> = {
    full: { min: 0, max: 3, digits: 1 },
    zoom: { min: 0.9, max: 1.1, digits: 2 },
    fine: { min: 0.999, max: 1.001, digits: 3 },
};

const RANGE_OPTIONS: readonly SegmentedOption[] = [
    { value: "full", label: "0–3" },
    { value: "zoom", label: "±10%" },
    { value: "fine", label: "±0.1%" },
];

const DAMPING_OPTIONS: readonly SegmentedOption[] = [
    { value: "none", label: "None" },
    { value: "power", label: "e^(−c·dt)" },
    { value: "pade", label: "1/(1+c·dt)" },
];

/** Energy ratios past this are flagged as blown up. */
const BLOWN_UP_RATIO = 10;
const ALL = "all";

/**
 * Inputs and readouts for the integrator shoot-out. Holds no state of its own apart from the
 * chart, which keeps its samples: the demo pushes to `chart` directly so that recording a
 * sample doesn't re-render the panel.
 *
 * Events: `focus-change` (row index or null), `range-change` (EnergyRange), `stiffness-change`
 * (number), `damping-mode-change` (DampingMode), `damping-rate-change` (number), `restart`.
 */
export class ShootoutPanel extends LitElement {
    static override properties: PropertyDeclarations = {
        // Inputs
        rows: { attribute: false },
        focus: { attribute: false },
        range: { attribute: false },
        stiffness: { attribute: false },
        dampingMode: { attribute: false },
        dampingRate: { attribute: false },
        // Readouts
        omegaDt: { attribute: false },
        keptPerSecond: { attribute: false },
    };

    declare rows: readonly IntegratorRow[];
    declare focused: number | null;
    declare range: EnergyRange;
    declare stiffness: number;
    declare dampingMode: DampingMode;
    declare dampingRate: number;
    declare omegaDt: number;
    declare keptPerSecond: number;

    /** The energy graph. Created here so it exists before the panel first renders. */
    readonly chart = document.createElement("aether-line-chart");

    static override styles: CSSResultGroup = [
        panelStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .swatch {
                display: inline-block;
                width: 10px;
                height: 10px;
                margin-right: var(--space-2);
                border-radius: 50%;
            }
            .dim {
                opacity: 0.45;
            }
        `,
    ];

    constructor() {
        super();
        this.rows = [];
        this.focused = null;
        this.range = "full";
        this.stiffness = 1;
        this.dampingMode = "none";
        this.dampingRate = 0;
        this.omegaDt = 0;
        this.keptPerSecond = 1;
        this.chart.reference = 1;
        this.chart.label = "Energy of each integrator relative to its starting energy, over time";
    }

    #emit(name: string, detail?: unknown): void {
        this.dispatchEvent(
            new CustomEvent(name, { detail, bubbles: true, composed: true }),
        );
    }

    protected override willUpdate(changed: PropertyValues): void {
        if (changed.has("rows")) {
            // Compared by length: labels and colors are fixed, and new rows arrive with every readout.
            const series: ChartSeries[] = this.rows.map(({ label, color }) => ({ label, color }));
            if (series.length !== this.chart.series.length) this.chart.series = series;
        }
        const { min, max, digits } = RANGES[this.range];
        this.chart.yMin = min;
        this.chart.yMax = max;
        this.chart.digits = digits;
        this.chart.highlight = this.focused;
    }

    protected override render(): TemplateResult {
        const focusOptions: SegmentedOption[] = [
            { value: ALL, label: "All" },
            ...this.rows.map(({ label }, i) => ({ value: String(i), label })),
        ];
        const omegaDtText = formatNumber(this.omegaDt, 2);
        const keptText = formatNumber(this.keptPerSecond, 3);
        const pastLimit = this.omegaDt >= 2;

        return html`
            <aether-segmented
                label="Focus"
                .options=${focusOptions}
                .value=${this.focused === null ? ALL : String(this.focused)}
                @value-change=${(e: CustomEvent<string>) =>
                    this.#emit("focus-change", e.detail === ALL ? null : Number(e.detail))}
            ></aether-segmented>

            <h3>Energy E / E₀, last 20 s</h3>
            ${this.chart}
            <aether-segmented
                label="Vertical range"
                .options=${RANGE_OPTIONS}
                .value=${this.range}
                @value-change=${(e: CustomEvent<EnergyRange>) =>
                    this.#emit("range-change", e.detail)}
            ></aether-segmented>

            <dl>
                ${this.rows.map(({ label, color, energyRatio }, i) => {
                    const ratio = formatCompact(energyRatio);
                    const blownUp = !(Math.abs(energyRatio) < BLOWN_UP_RATIO);
                    const dim = this.focused !== null && this.focused !== i;
                    return html`
                        <dt class=${dim ? "dim" : ""}>
                            <span class="swatch" style="background: var(${color})"></span>${label}
                        </dt>
                        <dd class="${blownUp ? "warn" : ""} ${dim ? "dim" : ""}">${ratio}</dd>
                    `;
                })}
            </dl>

            <aether-slider
                label="Stiffness k"
                min="1"
                max="400"
                step="1"
                digits="0"
                unit=" N/m"
                .value=${this.stiffness}
                @value-change=${(e: CustomEvent<number>) =>
                    this.#emit("stiffness-change", e.detail)}
            ></aether-slider>
            <dl>
                <dt>ω·dt</dt>
                <dd class=${pastLimit ? "warn" : ""}>${omegaDtText}</dd>
            </dl>
            ${pastLimit
                ? html`<p class="warn">
                      Past ω·dt = 2: semi-implicit Euler and Verlet are unstable.
                      ${this.omegaDt >= 2 * Math.SQRT2 ? "So is RK4." : nothing}
                  </p>`
                : nothing}

            <aether-segmented
                label="Damping"
                .options=${DAMPING_OPTIONS}
                .value=${this.dampingMode}
                @value-change=${(e: CustomEvent<DampingMode>) =>
                    this.#emit("damping-mode-change", e.detail)}
            ></aether-segmented>
            ${this.dampingMode === "none"
                ? nothing
                : html`
                      <aether-slider
                          label="Damping rate c"
                          min="0.1"
                          max="3"
                          step="0.1"
                          digits="1"
                          unit=" 1/s"
                          .value=${this.dampingRate}
                          @value-change=${(e: CustomEvent<number>) =>
                              this.#emit("damping-rate-change", e.detail)}
                      ></aether-slider>
                      <dl>
                          <dt>Velocity kept per second</dt>
                          <dd>${keptText}</dd>
                      </dl>
                  `}

            <div class="buttons">
                <button @click=${() => this.#emit("restart")}>Restart</button>
            </div>
        `;
    }
}

customElements.define("aether-shootout-panel", ShootoutPanel);

declare global {
    interface HTMLElementTagNameMap {
        "aether-shootout-panel": ShootoutPanel;
    }
}
