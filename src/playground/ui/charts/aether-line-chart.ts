import {
    css,
    html,
    LitElement,
    type CSSResultGroup,
    type PropertyDeclarations,
    type TemplateResult,
} from "lit";
import { RingBuffer } from "./ring-buffer";

export interface ChartSeries {
    label: string;
    /** Name of a CSS custom property holding the line color, e.g. `--series-1`. */
    color: string;
}

const LEFT_GUTTER = 40; // CSS px
const VERTICAL_PADDING = 8; // CSS px
const TICK_COUNT = 3;
const DIMMED_ALPHA = 0.2;
/** Limit on pixel coordinates, since canvases draw huge values unreliably. */
const MAX_COORDINATE = 1e4;

/**
 * A scrolling line chart on a hand-drawn canvas, with one ring buffer per series. The newest
 * sample is at the right edge. Values outside `yMin`..`yMax` run off the plot, and non-finite
 * values leave a gap.
 *
 * Call `push` as often as data arrives: drawing is batched to one per animation frame.
 */
export class AetherLineChart extends LitElement {
    static override properties: PropertyDeclarations = {
        series: { attribute: false },
        capacity: { type: Number },
        yMin: { type: Number },
        yMax: { type: Number },
        digits: { type: Number },
        reference: { attribute: false },
        highlight: { attribute: false },
        label: { type: String },
    };

    declare series: readonly ChartSeries[];
    /** Samples kept per series, and so the width of the plot in samples. */
    declare capacity: number;
    declare yMin: number;
    declare yMax: number;
    /** Decimals on the vertical axis labels. */
    declare digits: number;
    /** Value marked with a dashed line, if any. */
    declare reference: number | null;
    /** Index of a series to draw on top while the others are dimmed, if any. */
    declare highlight: number | null;
    /** Description of the chart for screen readers. */
    declare label: string;

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
            height: 140px;
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            background: var(--bg);
        }
    `;

    #buffers: RingBuffer[] = [];
    #frameHandle = 0;
    #colors: Map<string, string> | null = null;
    #resizeObserver = new ResizeObserver(() => this.#scheduleDraw());
    #colorScheme = window.matchMedia("(prefers-color-scheme: dark)");

    constructor() {
        super();
        this.series = [];
        this.capacity = 600;
        this.yMin = 0;
        this.yMax = 1;
        this.digits = 2;
        this.reference = null;
        this.highlight = null;
        this.label = "";
    }

    /** Appends one sample per series, in `series` order. */
    push(values: readonly number[]): void {
        this.#syncBuffers();
        this.#buffers.forEach((buffer, i) => buffer.push(values[i] ?? NaN));
        this.#scheduleDraw();
    }

    /** Removes all samples. */
    clear(): void {
        for (const buffer of this.#buffers) buffer.clear();
        this.#scheduleDraw();
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.#resizeObserver.observe(this);
        this.#colorScheme.addEventListener("change", this.#onColorSchemeChange);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#resizeObserver.disconnect();
        this.#colorScheme.removeEventListener("change", this.#onColorSchemeChange);
        cancelAnimationFrame(this.#frameHandle);
        this.#frameHandle = 0;
    }

    protected override updated(): void {
        this.#scheduleDraw();
    }

    #onColorSchemeChange = (): void => {
        this.#colors = null;
        this.#scheduleDraw();
    };

    /** Rebuilds the buffers if the series count or capacity changed, dropping old samples. */
    #syncBuffers(): void {
        if (
            this.#buffers.length === this.series.length &&
            this.#buffers[0]?.capacity === this.capacity
        )
            return;
        this.#buffers = this.series.map(() => new RingBuffer(this.capacity));
    }

    #scheduleDraw(): void {
        if (this.#frameHandle !== 0) return;
        this.#frameHandle = requestAnimationFrame(() => {
            this.#frameHandle = 0;
            this.#draw();
        });
    }

    /** Resolves a custom property once; reading computed style every frame is wasteful. */
    #color(token: string): string {
        this.#colors ??= new Map();
        let color = this.#colors.get(token);
        if (color === undefined) {
            color = getComputedStyle(this).getPropertyValue(token).trim();
            this.#colors.set(token, color);
        }
        return color;
    }

    #draw(): void {
        const canvas = this.renderRoot.querySelector("canvas");
        const ctx = canvas?.getContext("2d");
        const width = canvas?.clientWidth ?? 0;
        const height = canvas?.clientHeight ?? 0;
        if (!canvas || !ctx || width === 0 || height === 0) return;

        const dpr = window.devicePixelRatio;
        const pixelWidth = Math.round(width * dpr);
        const pixelHeight = Math.round(height * dpr);
        if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
        if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const plotHeight = height - 2 * VERTICAL_PADDING;
        const toY = (value: number): number => {
            const t = (value - this.yMin) / (this.yMax - this.yMin);
            const y = VERTICAL_PADDING + (1 - t) * plotHeight;
            return Math.min(MAX_COORDINATE, Math.max(-MAX_COORDINATE, y));
        };

        this.#drawAxis(ctx, width, toY);
        ctx.save();
        ctx.beginPath();
        ctx.rect(LEFT_GUTTER, 0, width - LEFT_GUTTER, height);
        ctx.clip();
        this.#drawSeries(ctx, width, toY);
        ctx.restore();
    }

    #drawAxis(ctx: CanvasRenderingContext2D, width: number, toY: (value: number) => number): void {
        ctx.font = `11px ${this.#color("--mono")}`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "right";
        ctx.lineWidth = 1;

        for (let i = 0; i < TICK_COUNT; i++) {
            const value = this.yMin + ((this.yMax - this.yMin) * i) / (TICK_COUNT - 1);
            const y = Math.round(toY(value)) + 0.5;
            ctx.strokeStyle = this.#color("--border");
            ctx.beginPath();
            ctx.moveTo(LEFT_GUTTER, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.fillStyle = this.#color("--muted");
            ctx.fillText(value.toFixed(this.digits), LEFT_GUTTER - 4, y);
        }

        if (this.reference !== null) {
            const y = Math.round(toY(this.reference)) + 0.5;
            ctx.strokeStyle = this.#color("--muted");
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(LEFT_GUTTER, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    #drawSeries(
        ctx: CanvasRenderingContext2D,
        width: number,
        toY: (value: number) => number,
    ): void {
        this.#syncBuffers();
        const step = (width - LEFT_GUTTER) / Math.max(1, this.capacity - 1);
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";

        const drawOne = (index: number): void => {
            const buffer = this.#buffers[index];
            const series = this.series[index];
            if (!buffer || !series) return;
            ctx.strokeStyle = this.#color(series.color);
            ctx.globalAlpha =
                this.highlight === null || this.highlight === index ? 1 : DIMMED_ALPHA;
            ctx.beginPath();
            const start = width - (buffer.length - 1) * step;
            let penDown = false;
            for (let i = 0; i < buffer.length; i++) {
                const value = buffer.at(i) ?? NaN;
                if (!Number.isFinite(value)) {
                    penDown = false;
                    continue;
                }
                const x = start + i * step;
                if (penDown) ctx.lineTo(x, toY(value));
                else ctx.moveTo(x, toY(value));
                penDown = true;
            }
            ctx.stroke();
        };

        this.series.forEach((_, i) => {
            if (i !== this.highlight) drawOne(i);
        });
        if (this.highlight !== null) drawOne(this.highlight);
        ctx.globalAlpha = 1;
    }

    protected override render(): TemplateResult {
        return html`<canvas role="img" aria-label=${this.label}></canvas>`;
    }
}

customElements.define("aether-line-chart", AetherLineChart);

declare global {
    interface HTMLElementTagNameMap {
        "aether-line-chart": AetherLineChart;
    }
}
