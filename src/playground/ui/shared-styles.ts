import { css } from "lit";

/**
 * Base styles for anything shown in the sidebar: headings, buttons, selects and readout
 * lists. Shadow DOM stops styles from leaking into components, so each sidebar
 * component includes these explicitly: `static styles = [panelStyles, css`...`]`.
 */
export const panelStyles = css`
    h2,
    h3 {
        margin: 0;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
    }
    select,
    button {
        font: inherit;
        color: var(--text);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 6px 10px;
    }
    button {
        flex: 1;
        cursor: pointer;
    }
    button:hover:not(:disabled) {
        border-color: var(--muted);
    }
    button.primary {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--accent-text);
    }
    button:disabled {
        opacity: 0.5;
        cursor: default;
    }
    .buttons {
        display: flex;
        gap: var(--space-2);
    }
    output,
    dd {
        font-family: var(--mono);
        font-variant-numeric: tabular-nums;
        white-space: pre;
    }
    dl {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--space-1) var(--space-3);
        margin: 0;
    }
    dt {
        color: var(--muted);
    }
    dd {
        margin: 0;
        text-align: right;
    }
    .warn {
        color: var(--warn);
    }
    :focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
`;
