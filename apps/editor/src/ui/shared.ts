import { css, svg, type SVGTemplateResult } from "lit";

/** Base styles every component includes: labels, buttons, focus and numerals. */
export const baseStyles = css`
    :host {
        font-family: var(--sans);
        color: var(--ink);
    }
    * {
        box-sizing: border-box;
    }
    ::selection {
        background: var(--selection);
    }
    :focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
    .label {
        font: 500 var(--text-label) / 1.2 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
    }
    .num {
        font-family: var(--mono);
        font-variant-numeric: tabular-nums;
    }
    button {
        font: inherit;
        color: inherit;
        background: none;
        border: 0;
        padding: 0;
        cursor: pointer;
    }
    button:disabled {
        cursor: default;
    }
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--u);
        min-height: 36px;
        padding: 0 14px;
        border: 1px solid var(--rule-strong);
        border-radius: var(--radius);
        font: 600 var(--text-small) / 1 var(--sans);
        transition:
            background-color 160ms var(--ease-out),
            color 160ms var(--ease-out);
    }
    .btn:hover {
        background: var(--paper-sunk);
    }
    .btn.primary {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--on-accent);
    }
    .btn.primary:hover {
        background: color-mix(in srgb, var(--accent) 86%, var(--ink));
    }
    .btn.primary kbd {
        color: inherit;
        opacity: 0.62;
    }
    .btn:disabled {
        opacity: 0.4;
    }
    .btn:disabled:hover {
        background: none;
    }
    .btn.icon {
        width: 36px;
        padding: 0;
    }
    svg.icon {
        width: 16px;
        height: 16px;
        flex: none;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
    kbd {
        font: 500 var(--text-label) / 1 var(--mono);
        color: var(--muted);
    }
    @media (prefers-reduced-motion: reduce) {
        * {
            transition: none !important;
        }
    }
`;

const icon = (body: SVGTemplateResult) =>
    svg`<svg class="icon" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;

/** Authored 16px icons on one 1.6 stroke. */
export const icons = {
    pause: icon(svg`<path d="M5.5 3.5v9M10.5 3.5v9" />`),
    play: icon(svg`<path d="M4.5 3.2v9.6L12.5 8z" />`),
    step: icon(svg`<path d="M3.5 3.5 9.5 8l-6 4.5zM12.5 3.5v9" />`),
    reset: icon(svg`<path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5" /><path d="M4.5 2.2v2.6h2.6" />`),
    arrow: icon(svg`<path d="M3 8h10M9 4l4 4-4 4" />`),
    external: icon(svg`<path d="M9.5 3h3.5v3.5M13 3 7.5 8.5M11.5 9.5V13H3V4.5h3.5" />`),
    grid: icon(svg`<path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" />`),
};
