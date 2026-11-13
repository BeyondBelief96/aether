import { css, html, LitElement, type PropertyDeclarations } from "lit";
import type { ChartData } from "../core/session";
import { baseStyles } from "./shared";

const LEFT_GUTTER = 48; // CSS px
const VERTICAL_PADDING = 10; // CSS px
const TICK_COUNT = 3;
/** Canvases draw huge coordinates unreliably. */
const MAX_COORDINATE = 1e4;

/**
 * A scrolling line chart of one `ChartData`, newest sample at the right edge. Redraws on
 * animation frames while the data's version changes. Values outside the range run off the plot;
 * non-finite values leave a gap.
 */
export class LineChart extends LitElement {
    static override properties: PropertyDeclarations = {
        data: { attribute: false },
        range: { type: Number },
    };

    declare data: ChartData | null;
    /** Index into the chart's ranges. */
    declare range: number;

    static override styles = [
        baseStyles,
        css`
            :host {
                display: block;
                height: 220px;
            }
            canvas {
                display: block;
                width: 100%;
                height: 100%;
            }
        `,
    ];

    #frame = 0;
    #drawnVersion = -1;
    #style: CSSStyleDeclaration | null = null;

    constructor() {
        super();
        this.data = null;
        this.range = 0;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.#frame = requestAnimationFrame(this.#tick);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        cancelAnimationFrame(this.#frame);
    }

    protected override updated(): void {
        this.#drawnVersion = -1;
    }

    /** Forces a redraw, e.g. after the theme's colours change. */
    invalidate(): void {
        this.#drawnVersion = -1;
    }

    #tick = (): void => {
        this.#frame = requestAnimationFrame(this.#tick);
        if (this.data && this.data.version !== this.#drawnVersion) this.#draw();
    };

    #color(token: string): string {
        return this.#style?.getPropertyValue(token).trim() || "#888";
    }

    #draw(): void {
        const data = this.data;
        const canvas = this.renderRoot.querySelector("canvas");
        const ctx = canvas?.getContext("2d");
        if (!data || !canvas || !ctx) return;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width === 0 || height === 0) return;
        this.#drawnVersion = data.version;
        this.#style = getComputedStyle(this);

        const dpr = window.devicePixelRatio;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const range = data.spec.ranges[this.range] ?? data.spec.ranges[0];
        if (!range) return;
        const plotHeight = height - 2 * VERTICAL_PADDING;
        const toY = (v: number) => {
            const y =
                VERTICAL_PADDING + (1 - (v - range.min) / (range.max - range.min)) * plotHeight;
            return Math.min(MAX_COORDINATE, Math.max(-MAX_COORDINATE, y));
        };

        ctx.font = `11px ${this.#color("--mono")}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 1;
        for (let i = 0; i < TICK_COUNT; i++) {
            const value = range.min + ((range.max - range.min) * i) / (TICK_COUNT - 1);
            const y = Math.round(toY(value)) + 0.5;
            ctx.strokeStyle = this.#color("--rule");
            ctx.beginPath();
            ctx.moveTo(LEFT_GUTTER, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.fillStyle = this.#color("--muted");
            ctx.fillText(value.toFixed(range.digits), LEFT_GUTTER - 8, y);
        }
        if (data.spec.reference !== undefined) {
            const y = Math.round(toY(data.spec.reference)) + 0.5;
            ctx.strokeStyle = this.#color("--ink");
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(LEFT_GUTTER, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(LEFT_GUTTER, 0, width - LEFT_GUTTER, height);
        ctx.clip();
        const step = (width - LEFT_GUTTER) / Math.max(1, data.capacity - 1);
        ctx.lineWidth = 1.75;
        ctx.lineJoin = "round";
        data.buffers.forEach((buffer, s) => {
            const series = data.spec.series[s];
            if (!series) return;
            ctx.strokeStyle = this.#color(`--series-${series.color + 1}`);
            ctx.beginPath();
            const start =
                buffer.length < data.capacity ? LEFT_GUTTER : width - (buffer.length - 1) * step;
            let down = false;
            for (let i = 0; i < buffer.length; i++) {
                const v = buffer.at(i) ?? NaN;
                if (!Number.isFinite(v)) {
                    down = false;
                    continue;
                }
                const x = start + i * step;
                if (down) ctx.lineTo(x, toY(v));
                else ctx.moveTo(x, toY(v));
                down = true;
            }
            ctx.stroke();
        });
        ctx.restore();
    }

    protected override render() {
        return html`<canvas role="img" aria-label=${this.data?.spec.description ?? ""}></canvas>`;
    }
}

customElements.define("line-chart", LineChart);

declare global {
    interface HTMLElementTagNameMap {
        "line-chart": LineChart;
    }
}
