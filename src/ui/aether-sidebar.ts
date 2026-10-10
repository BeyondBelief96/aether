import { LitElement, css, html } from 'lit';
import type { DemoInfo } from '../demos/types';

export interface LoopStats {
  fps: number;
  stepsPerFrame: number;
  simTime: number;
  droppedTime: boolean;
}

/**
 * Controls and readouts. Holds no simulation state of its own: everything
 * comes in as properties, and every user action goes out as a bubbling event
 * for `aether-app` to handle.
 *
 * Events: `demo-change` (detail: id), `toggle-pause`, `step-once`, `reset`,
 * `hz-change` (detail: number), `time-scale-change` (detail: number).
 */
export class AetherSidebar extends LitElement {
  static override properties = {
    demos: { attribute: false },
    demoId: { attribute: false },
    paused: { type: Boolean },
    hz: { type: Number },
    timeScale: { attribute: false },
    stats: { attribute: false },
  };

  declare demos: readonly DemoInfo[];
  declare demoId: string;
  declare paused: boolean;
  declare hz: number;
  declare timeScale: number;
  declare stats: LoopStats;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px 16px;
      overflow-y: auto;
      background: var(--panel);
      border-left: 1px solid var(--border);
    }
    header h1 {
      margin: 0;
      font-size: 20px;
      letter-spacing: 0.02em;
    }
    header p,
    .summary,
    footer {
      margin: 4px 0 0;
      color: var(--muted);
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    h2 {
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
      border-radius: 6px;
      padding: 6px 10px;
    }
    button {
      flex: 1;
      cursor: pointer;
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
      gap: 8px;
    }
    label {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px;
    }
    label input {
      grid-column: 1 / -1;
      accent-color: var(--accent);
    }
    output,
    dd {
      font-family: var(--mono);
      font-variant-numeric: tabular-nums;
    }
    dl {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
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
    footer {
      margin-top: auto;
      font-size: 12px;
    }
    kbd {
      font-family: var(--mono);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0 4px;
    }
  `;

  constructor() {
    super();
    this.demos = [];
    this.demoId = '';
    this.paused = false;
    this.hz = 60;
    this.timeScale = 1;
    this.stats = { fps: 0, stepsPerFrame: 0, simTime: 0, droppedTime: false };
  }

  #emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  override render() {
    const current = this.demos.find((d) => d.id === this.demoId);
    const { fps, stepsPerFrame, simTime, droppedTime } = this.stats;

    return html`
      <header>
        <h1>Aether</h1>
        <p>A 3D physics engine, from scratch.</p>
      </header>

      <section>
        <h2>Demo</h2>
        <select
          aria-label="Demo"
          @change=${(e: Event) => this.#emit('demo-change', (e.target as HTMLSelectElement).value)}
        >
          ${this.demos.map(
            (d) => html`<option value=${d.id} ?selected=${d.id === this.demoId}>
              Phase ${d.phase} · ${d.title}
            </option>`,
          )}
        </select>
        <p class="summary">${current?.summary}</p>
      </section>

      <section>
        <h2>Simulation</h2>
        <div class="buttons">
          <button class="primary" @click=${() => this.#emit('toggle-pause')}>
            ${this.paused ? 'Play' : 'Pause'}
          </button>
          <button ?disabled=${!this.paused} @click=${() => this.#emit('step-once')}>Step</button>
          <button @click=${() => this.#emit('reset')}>Reset</button>
        </div>
        <label>
          Physics rate
          <output>${this.hz} Hz</output>
          <input
            type="range"
            min="5"
            max="240"
            step="1"
            .value=${String(this.hz)}
            @input=${(e: Event) => this.#emit('hz-change', Number((e.target as HTMLInputElement).value))}
          />
        </label>
        <label>
          Time scale
          <output>${this.timeScale.toFixed(2)}×</output>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.05"
            .value=${String(this.timeScale)}
            @input=${(e: Event) =>
              this.#emit('time-scale-change', Number((e.target as HTMLInputElement).value))}
          />
        </label>
      </section>

      <section>
        <h2>Stats</h2>
        <dl>
          <dt>Frame rate</dt>
          <dd>${fps.toFixed(0)} fps</dd>
          <dt>Steps / frame</dt>
          <dd class=${droppedTime ? 'warn' : ''}>${stepsPerFrame.toFixed(2)}</dd>
          <dt>Sim time</dt>
          <dd>${simTime.toFixed(2)} s</dd>
        </dl>
      </section>

      <footer><kbd>Space</kbd> pause · <kbd>.</kbd> step · <kbd>R</kbd> reset</footer>
    `;
  }
}

customElements.define('aether-sidebar', AetherSidebar);

declare global {
  interface HTMLElementTagNameMap {
    'aether-sidebar': AetherSidebar;
  }
}
