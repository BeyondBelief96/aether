# Walkthrough: building the rotation gizmo

A code-along build of the Phase 1 demo. Every step gives you the **actual code** to type in, explains why it's written that way, and says how to check it before you move on. [DEMOS.md](./DEMOS.md) has the general rules; this file is the concrete path.

All the code here has been type-checked against this repo's `tsconfig` (strict, `noUnusedLocals`, `noUncheckedIndexedAccess`) at three checkpoints: the end of step 3, step 8 and step 11. The finished demo was also run in a browser.

How to use it:

- **Type the code in yourself**; don't paste it. Typing is what makes you notice each line.
- Keep `npm run dev` and `npm test` running the whole time.
- Every step ends with a **Check**. Don't move on until it passes.
- New files are given in full. Changes to existing files are given as **before → after** snippets, or as a full replacement when most of the file changes.

---

## The big picture

One idea: **a quaternion is the orientation, and everything else is a view of it.**

```
        inputs (panel)                the one source of truth                 views
┌──────────────────────────┐                                        ┌──────────────────────────────┐
│ axis-angle: axis, angle  │──┐                                ┌──▶ │ body mesh orientation        │
│                          │  ├──▶  #q : Quaternion  ──────────┼──▶ │ basis arrows q·X, q·Y, q·Z   │
│ euler: x, y, z           │──┘    (#updateQuaternion)         ├──▶ │ gimbal rings (Euler mode)    │
└──────────────────────────┘                                   └──▶ │ readouts: q, axis-angle,     │
             ▲                                                      │ Euler, matrix                │
             └──────────── input values pushed back (controlled) ───┴──────────────────────────────┘
```

| Layer | Folder | Knows about |
|---|---|---|
| Math | `src/math` | nothing else (done) |
| Demo | `src/demos` | math + Three.js + the panel's properties and events |
| UI | `src/ui` | Lit, plus math (`Vec3Like`, `QuatLike`, `Vec3`) |

| Step | You build | You see |
|---|---|---|
| 1 | Register the demo | It's in the picker |
| 2 | A box spun by `setFromAxisAngle` | Your quaternions driving Three.js |
| 3 | `colors.ts`, `VectorArrow`, basis arrows | Rotated X/Y/Z arrows |
| 4 | Panel plumbing in the shell | A "Controls" section |
| 5 | `format.ts` + tests | Green tests |
| 6 | Tokens, `shared-styles.ts` | Sidebar unchanged |
| 7 | `<aether-slider>` | Sidebar sliders rebuilt from it |
| 8 | `<aether-gizmo-panel>` v1 | Dragging an angle rotates the box |
| 9 | `<aether-vec3-input>` + axis | Typing an axis |
| 10 | Readouts | q, axis-angle, Euler, matrix |
| 11 | Euler mode + gimbal rings | Gimbal lock you can see |
| 12 | Finish | Tick PLAN.md |

---

## Step 1: Register the demo

You've already done this: the file is `src/demos/phase1-rotation-gizmo.ts`, the id is `"rotation-gizmo"`, and it's in `registry.ts`. One fix:

```ts
// before
disposeObject(this.#mesh);
// after
disposeObject(this.#group);
```

**Why:** you'll add arrows and rings to the group. Disposing only the mesh would leak their GPU buffers on every Reset (R), because Reset calls `create()` again and builds everything fresh.

**Check:** the picker shows the demo; switching to Phase 0 and back leaves nothing behind.

---

## Step 2: A quaternion drives the box

Replace the whole file with this. It spins the box with **your** `Quaternion`, to prove your math and Three.js agree.

```ts
// src/demos/phase1-rotation-gizmo.ts
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Scene } from "three";
import { Quaternion, type Vec3Like } from "../math";
import { disposeObject } from "./helpers/three";
import type { Demo, DemoInfo } from "./types";

/**
 * Phase 1: quaternions, and why engines don't store Euler angles.
 *
 * For now the body just spins, to check the quaternion library against Three.js.
 */

const CENTER: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 }); // m
const BODY_SIZE: Readonly<Vec3Like> = Object.freeze({ x: 1.2, y: 0.6, z: 0.3 }); // m

const UNIT_Y: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 });

// Temporary: spin the body to check everything is wired up. Removed in step 8.
const SPIN_AXIS = UNIT_Y;
const SPIN_SPEED = Math.PI / 4; // rad/s

// Scratch objects for sync. Module-level, reused every frame, never exported.
const _orientation = new Quaternion();

class RotationGizmoDemo implements Demo {
    #spinAngle = 0; // rad
    #previousOrientation = new Quaternion();
    #orientation = new Quaternion();

    #group = new Group();
    #body: Mesh;

    constructor() {
        // Everything is placed relative to the group, so (0, 0, 0) below means CENTER.
        this.#group.position.copy(CENTER);
        this.#body = new Mesh(
            new BoxGeometry(BODY_SIZE.x, BODY_SIZE.y, BODY_SIZE.z),
            new MeshStandardMaterial({ color: 0x2bb5a0 }),
        );
        this.#group.add(this.#body);
    }

    mount(scene: Scene): void {
        scene.add(this.#group);
        this.sync(1);
    }

    step(dt: number): void {
        this.#previousOrientation.copy(this.#orientation);
        this.#spinAngle += SPIN_SPEED * dt;
        this.#orientation.setFromAxisAngle(SPIN_AXIS, this.#spinAngle);
    }

    sync(alpha: number): void {
        _orientation.slerpQuaternions(this.#previousOrientation, this.#orientation, alpha);
        this.#body.quaternion.copy(_orientation);
    }

    unmount(scene: Scene): void {
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

export const rotationGizmoDemo: DemoInfo = {
    id: "rotation-gizmo",
    title: "Rotation gizmo",
    phase: 1,
    summary: "A box spinning about +Y.",
    create: () => new RotationGizmoDemo(),
};
```

**Why it's built this way**

- **Box with three different side lengths:** a sphere or cube looks the same after many rotations. A 1.2 × 0.6 × 0.3 box doesn't, so you can always tell its orientation.
- **The group is positioned, not the mesh.** Every object you add later (arrows, rings) is centred on the box automatically.
- **Position is gone.** It never changes, so it doesn't need `previous`/`current` copies. Orientation does change in `step`, so it keeps them, and `sync` slerps between them (the Phase 0 lesson).
- **`this.#body.quaternion.copy(_orientation)`** works because Three.js's `copy` accepts anything with `x, y, z, w` fields, and yours has them.

**Check**

- The box spins about the vertical axis.
- **Direction:** seen from above, the long (X) side turns counter-clockwise, swinging from +X toward −Z. That's the right-hand rule, and the same fact as your "90° about +Y maps +X to −Z" test.
- Set the physics rate to 10 Hz: still smooth. Then temporarily change `sync`'s first line to `_orientation.copy(this.#orientation);`: it stutters. Put the slerp back.
- Try `const SPIN_AXIS: Readonly<Vec3Like> = { x: Math.SQRT1_2, y: Math.SQRT1_2, z: 0 };` (a unit-length diagonal). `setFromAxisAngle` needs a **unit** axis: try `{ x: 1, y: 1, z: 0 }` and watch it go wrong.

---

## Step 3: Basis arrows

The most useful picture of a rotation is where it sends the three axes. Those three vectors are also the **columns of the rotation matrix**, which you'll display in step 10.

### 3a. `src/demos/helpers/colors.ts` (new)

```ts
/**
 * Viewport colors. The axis colors match the --axis-* tokens in styles.css, so a
 * slider labelled "X" is the same red as the X arrow. Three.js can't read CSS
 * variables cheaply, so keep the two in step by hand.
 */
export const AXIS_COLORS = {
    x: 0xe5484d,
    y: 0x46a758,
    z: 0x3e63dd,
} as const;

export const ACCENT = 0x2bb5a0;
export const WARN = 0xe8833a;
export const MUTED = 0xb0b8c4;
```

### 3b. `src/demos/helpers/vector-arrow.ts` (new)

```ts
import { ArrowHelper, Vector3, type Material } from "three";
import { clamp, type Vec3Like } from "../../math";

const _dir = new Vector3();

/**
 * An arrow from `origin` along `vector`, with the arrow's length equal to the vector's
 * magnitude. Wraps Three.js's ArrowHelper so callers can pass engine types.
 *
 * Drawn on top of meshes, so the part inside a body stays visible.
 */
export class VectorArrow extends ArrowHelper {
    /** Lengths shorter than this hide the arrow, since a zero vector has no direction. */
    static readonly MIN_LENGTH = 1e-4;

    constructor(color: number) {
        super(new Vector3(1, 0, 0), new Vector3(), 1, color);
        for (const part of [this.line, this.cone]) {
            (part.material as Material).depthTest = false;
            part.renderOrder = 1;
        }
    }

    /** Points the arrow from `origin` along `vector`, scaled by `scale`. Call from sync. */
    update(origin: Vec3Like, vector: Vec3Like, scale = 1): void {
        _dir.copy(vector);
        const length = _dir.length() * scale;
        this.visible = length > VectorArrow.MIN_LENGTH;
        if (!this.visible) return;
        this.position.copy(origin);
        this.setDirection(_dir.normalize());
        // Scale the head with the length, clamped, so short arrows still look like arrows.
        const headLength = clamp(0.2 * length, 0.05, 0.25);
        this.setLength(length, headLength, 0.5 * headLength);
    }
}
```

**Why**

- `ArrowHelper` is made of a `Line` and a cone `Mesh`. `depthTest = false` means "draw even if something is in front", and a higher `renderOrder` draws them after the box. Without both, the half of each arrow inside the box disappears. `renderOrder` is per object and not inherited, so it goes on each part.
- `ArrowHelper` wants a **unit** direction plus a length, while physics thinks in vectors whose length *means* something. `update()` converts between the two. That will matter in Phase 2 for velocity and force arrows.
- `_dir` is module-level scratch, so `update` allocates nothing per frame.

### 3c. Arrows in the demo

Add to the imports:

```ts
import { Quaternion, Vec3, type Vec3Like } from "../math";
import { ACCENT, AXIS_COLORS } from "./helpers/colors";
import { VectorArrow } from "./helpers/vector-arrow";
```

Add constants and a scratch vector next to the others:

```ts
const ARROW_LENGTH = 1.5; // m

const ORIGIN: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 0 });
const UNIT_X: Readonly<Vec3Like> = Object.freeze({ x: 1, y: 0, z: 0 });
const UNIT_Y: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 });
const UNIT_Z: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 1 });
const UNITS = [UNIT_X, UNIT_Y, UNIT_Z] as const;

const _basis = new Vec3();
```

Add a field, and include the arrows in the group:

```ts
    #arrows = [
        new VectorArrow(AXIS_COLORS.x),
        new VectorArrow(AXIS_COLORS.y),
        new VectorArrow(AXIS_COLORS.z),
    ];

    // in the constructor: swap the literal color for ACCENT, and add the arrows
    new MeshStandardMaterial({ color: ACCENT }),
    // ...
    this.#group.add(this.#body, ...this.#arrows);
```

Extend `sync`:

```ts
    sync(alpha: number): void {
        _orientation.slerpQuaternions(this.#previousOrientation, this.#orientation, alpha);
        this.#body.quaternion.copy(_orientation);
        this.#arrows.forEach((arrow, i) => {
            _orientation.rotateVec3(UNITS[i]!, _basis);
            arrow.update(ORIGIN, _basis, ARROW_LENGTH);
        });
    }
```

**Why**

- `rotateVec3(v, out)` writes into `_basis`, which you own, so nothing is allocated per frame.
- The arrows use the **interpolated** `_orientation`, the same as the box. Everything drawn in one frame must come from the same blended state, or the arrows would lag the box at low physics rates.
- `UNITS[i]!`: with `noUncheckedIndexedAccess`, indexing with a `number` gives `T | undefined`. `i` comes from a 3-element array, so the `!` is safe.
- The arrows start at `ORIGIN`, not `CENTER`: they're children of the group, which is already at `CENTER`.

**Check**

- Temporarily set `SPIN_SPEED` to `0`: the arrows sit exactly on the viewport's `AxesHelper` lines. Put it back.
- While it spins, each arrow stays glued to the same face of the box, and the green arrow (the spin axis) doesn't move at all.

---

## Step 4: Panel plumbing

The shell needs a way for a demo to put controls in the sidebar. You do this once; every later demo uses it. It's "properties down, events up" again.

### `src/demos/types.ts`

Add to the `Demo` interface, after `unmount`:

```ts
  /**
   * Controls and readouts for this demo, shown in the sidebar. The demo creates it,
   * listens to its events, and pushes readouts into its properties.
   */
  readonly panel?: HTMLElement;
```

### `src/ui/aether-app.ts`

Five small additions (this file uses 2-space indents and single quotes; match them):

```ts
  static override properties = {
    // ...existing
    stats: { state: true },
    panel: { state: true },            // ← add
  };

  declare stats: LoopStats;
  /** The current demo's panel. Reactive state, because the demo itself isn't reactive. */
  declare panel: HTMLElement | null;   // ← add

  constructor() {
    // ...existing
    this.panel = null;                 // ← add
  }

  #loadDemo(id: string): void {
    // ...
    this.#demo.mount(scene);
    this.panel = this.#demo.panel ?? null;   // ← add
    this.#loop.reset();
    // ...
  }

  // in render(), on <aether-sidebar>:
        .stats=${this.stats}
        .panel=${this.panel}           // ← add
```

### `src/ui/aether-sidebar.ts`

```ts
import { LitElement, css, html, nothing } from 'lit';   // ← add `nothing`

  static override properties = {
    // ...existing
    panel: { attribute: false },       // ← add
  };

  declare panel: HTMLElement | null;   // ← add

  // constructor:
    this.panel = null;                 // ← add

  // render(), between the Demo section and the Simulation section:
      ${this.panel ? html`<section><h2>Controls</h2>${this.panel}</section>` : nothing}
```

### Test it with a throwaway panel

In the demo class:

```ts
    readonly panel = document.createElement("p");

    // at the end of the constructor:
    this.panel.textContent = "Controls go here.";
```

**Why**

- The app must hold the panel in **reactive** state. Lit re-renders the sidebar only when one of its properties changes. When you switch demos or press R, there's a new demo with a new panel element, and putting it into `this.panel` is what makes the sidebar re-render.
- Lit can render a DOM node as a template value directly, so the sidebar doesn't need to know which panel it's showing.
- `nothing` renders nothing at all, so the Phase 0 demo has no empty "Controls" heading.

**Check**

- The gizmo shows a "Controls" section with your text. Phase 0 shows no Controls section.
- R on the gizmo: still there. In devtools, the `<p>` is a new element each time.
- `npm run typecheck` passes.

---

## Step 5: Number formatting (test first)

### `src/ui/format.test.ts` (new): write this first and watch it fail

```ts
import { describe, expect, it } from "vitest";
import { formatDegrees, formatNumber } from "./format";

const FIGURE_SPACE = " ";
const MINUS = "−";

describe("formatNumber", () => {
    it("pads positive numbers with a figure space", () => {
        expect(formatNumber(1)).toBe(`${FIGURE_SPACE}1.000`);
    });

    it("uses a real minus sign for negative numbers", () => {
        expect(formatNumber(-0.25)).toBe(`${MINUS}0.250`);
    });

    it("never prints negative zero", () => {
        expect(formatNumber(-0.0001)).toBe(`${FIGURE_SPACE}0.000`);
        expect(formatNumber(-0)).toBe(`${FIGURE_SPACE}0.000`);
    });

    it("rounds to the requested number of digits", () => {
        expect(formatNumber(0.12345, 2)).toBe(`${FIGURE_SPACE}0.12`);
        expect(formatNumber(60, 0)).toBe(`${FIGURE_SPACE}60`);
    });

    it("prints a dash for non-finite values", () => {
        expect(formatNumber(NaN)).toBe("—");
        expect(formatNumber(Infinity)).toBe("—");
        expect(formatNumber(-Infinity)).toBe("—");
    });
});

describe("formatDegrees", () => {
    it("converts radians to degrees", () => {
        expect(formatDegrees(Math.PI / 2)).toBe(`${FIGURE_SPACE}90.0°`);
        expect(formatDegrees(-Math.PI)).toBe(`${MINUS}180.0°`);
    });
});
```

### `src/ui/format.ts` (new)

```ts
/** Figure space: the same width as a digit in tabular fonts, used in place of a plus sign. */
const FIGURE_SPACE = " ";
const MINUS = "−";

export const RAD_TO_DEG = 180 / Math.PI;
export const DEG_TO_RAD = Math.PI / 180;

/**
 * Formats `value` with a fixed number of decimals and a sign column, so numbers line up
 * and don't jitter as they change: " 1.000", "−0.250".
 *
 * Values that round to zero print as " 0.000", never "−0.000". Non-finite values print "—".
 */
export function formatNumber(value: number, digits = 3): string {
    if (!Number.isFinite(value)) return "—";
    // Rounding first turns −0.0001 into −0, and `−0 < 0` is false, so it gets no minus.
    const rounded = Number(value.toFixed(digits));
    const sign = rounded < 0 ? MINUS : FIGURE_SPACE;
    return sign + Math.abs(rounded).toFixed(digits);
}

/** Formats radians as degrees: " 90.0°". */
export function formatDegrees(radians: number, digits = 1): string {
    return `${formatNumber(radians * RAD_TO_DEG, digits)}°`;
}
```

**Why**

- **Sign column:** `tabular-nums` makes every digit the same width; the figure space makes the sign slot the same width as `−`. Together, a number that crosses zero doesn't shift left and right.
- **Negative zero:** rotations produce it constantly (`cos 90°` is `6e-17`, not 0). `−0.000` on screen is noise.
- The trick is the order: round **first**, then test the sign of the *rounded* value.

**Check:** `npm test` is green.

---

## Step 6: Tokens and shared styles

### `src/styles.css`

Add inside the first `:root`, after `--viewport-bg`:

```css
  /* X red, Y green, Z blue everywhere. Keep in step with src/demos/helpers/colors.ts. */
  --axis-x: #d93f45;
  --axis-y: #3a8f4b;
  --axis-z: #3b5fd0;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --radius: 6px;
```

And inside the dark-mode `:root`, after `--warn`:

```css
    --axis-x: #ff6b6f;
    --axis-y: #6fd17f;
    --axis-z: #7b9bff;
```

### `src/ui/shared-styles.ts` (new)

```ts
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
```

### `src/ui/aether-sidebar.ts`: use them

```ts
import { panelStyles } from './shared-styles';
```

Replace `static override styles = css\`...\`;` with the version below. It's the old styles minus everything that moved into `panelStyles`, with tokens in place of hard-coded sizes:

```ts
  static override styles = [
    panelStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
        padding: var(--space-5) var(--space-4);
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
        margin: var(--space-1) 0 0;
        color: var(--muted);
      }
      section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      /* The two native sliders still need these until step 7 replaces them. */
      label {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 4px;
      }
      label input {
        grid-column: 1 / -1;
        accent-color: var(--accent);
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
    `,
  ];
```

**Why**

- Shadow DOM isolates each component: a panel can't see the sidebar's `button` rule. Sharing a `css` module is how Lit shares styles. CSS **custom properties** are the one thing that *does* cross the shadow boundary, so colors and spacing live in tokens.
- `white-space: pre` on `dd`/`output` keeps the figure space from step 5 from being collapsed.

**Check:** the sidebar looks **exactly** as before, in light and dark mode (devtools → Rendering → Emulate `prefers-color-scheme`). Tab through it to see the focus ring.

---

## Step 7: `<aether-slider>`

### `src/ui/controls/aether-slider.ts` (new)

```ts
import { LitElement, css, html } from "lit";
import { live } from "lit/directives/live.js";
import { formatNumber } from "../format";

/**
 * A labelled range slider with a monospace readout.
 *
 * Controlled: dragging doesn't change `value`. The slider emits `value-change` and waits
 * for its parent to pass the new value back, so the parent stays the one source of truth
 * and can clamp or reject values.
 *
 * Events: `value-change` (detail: number), fired continuously while dragging.
 */
export class AetherSlider extends LitElement {
    static override properties = {
        label: { type: String },
        min: { type: Number },
        max: { type: Number },
        step: { type: Number },
        value: { type: Number },
        unit: { type: String },
        digits: { type: Number },
        color: { type: String },
    };

    declare label: string;
    declare min: number;
    declare max: number;
    declare step: number;
    declare value: number;
    declare unit: string;
    declare digits: number;
    /** Optional CSS color for the label, e.g. `var(--axis-x)`. */
    declare color: string;

    static override styles = css`
        :host {
            display: block;
        }
        label {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: var(--space-1);
        }
        output {
            font-family: var(--mono);
            font-variant-numeric: tabular-nums;
            white-space: pre;
        }
        input {
            grid-column: 1 / -1;
            width: 100%;
            margin: 0;
            accent-color: var(--accent);
        }
        input:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }
    `;

    constructor() {
        super();
        this.label = "";
        this.min = 0;
        this.max = 1;
        this.step = 0.01;
        this.value = 0;
        this.unit = "";
        this.digits = 2;
        this.color = "";
    }

    #onInput(e: Event): void {
        const value = Number((e.target as HTMLInputElement).value);
        this.dispatchEvent(
            new CustomEvent("value-change", { detail: value, bubbles: true, composed: true }),
        );
    }

    override render() {
        return html`
            <label>
                <span style=${this.color ? `color: ${this.color}` : ""}>${this.label}</span>
                <output>${formatNumber(this.value, this.digits)}${this.unit}</output>
                <input
                    type="range"
                    min=${this.min}
                    max=${this.max}
                    step=${this.step}
                    .value=${live(String(this.value))}
                    @input=${this.#onInput}
                />
            </label>
        `;
    }
}

customElements.define("aether-slider", AetherSlider);

declare global {
    interface HTMLElementTagNameMap {
        "aether-slider": AetherSlider;
    }
}
```

### Use it in the sidebar

```ts
import './controls/aether-slider';
```

Replace the two `<label>…</label>` sliders in `render()` with:

```ts
        <aether-slider
          label="Physics rate"
          min="5"
          max="240"
          step="1"
          digits="0"
          unit=" Hz"
          .value=${this.hz}
          @value-change=${(e: CustomEvent<number>) => this.#emit('hz-change', e.detail)}
        ></aether-slider>
        <aether-slider
          label="Time scale"
          min="0.1"
          max="2"
          step="0.05"
          digits="2"
          unit="×"
          .value=${this.timeScale}
          @value-change=${(e: CustomEvent<number>) => this.#emit('time-scale-change', e.detail)}
        ></aether-slider>
```

Then delete the `label` and `label input` rules you kept in step 6.

**Why**

- **Controlled:** the slider never sets its own `value`. The app decides, and passes the value back down. If the app clamps, the thumb shows the clamped value.
- **`live()`** compares against the input's *current DOM value*, not the last value Lit rendered. Without it, controlled inputs drift out of sync (DEMOS.md §9).
- **`bubbles: true, composed: true`:** without `composed`, the event can't leave the slider's shadow root and the sidebar never hears it.
- `min="5"` is a string attribute, but `type: Number` converts it. `.value=${…}` (with the dot) sets the property directly, as a number.

**Check**

- Both sliders look and work as before, and Phase 0 still responds.
- Try the controlled behaviour: in `aether-app`'s `hz-change` handler, use `Math.min(e.detail, 120)` in both places. Drag to 240 and the readout stops at 120. Undo it after.

---

## Step 8: The gizmo panel, version 1

Now the real panel, with one control: the angle. The axis stays fixed at +Y for one more step.

### `src/ui/panels/gizmo-panel.ts` (new)

```ts
import { LitElement, css, html } from "lit";
import type { QuatLike } from "../../math";
import { DEG_TO_RAD, RAD_TO_DEG, formatNumber } from "../format";
import { panelStyles } from "../shared-styles";
import "../controls/aether-slider";

/**
 * Inputs and readouts for the rotation gizmo demo. Holds no state of its own: inputs come
 * in as properties and go out as events, and the demo pushes readouts in.
 *
 * Angles are degrees on screen and radians in every property and event.
 *
 * Events: `angle-change` (number).
 */
export class GizmoPanel extends LitElement {
    static override properties = {
        // Inputs
        angle: { attribute: false },
        // Readouts
        quaternion: { attribute: false },
    };

    declare angle: number;
    declare quaternion: QuatLike;

    static override styles = [
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
        this.angle = 0;
        this.quaternion = { w: 1, x: 0, y: 0, z: 0 };
    }

    #emit(name: string, detail: unknown): void {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    override render() {
        const q = this.quaternion;
        return html`
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
            ></aether-slider>

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
```

### The demo, rewritten around the panel

Replace the whole demo file. The spin and the interpolation go; a dirty flag and the panel wiring come in.

```ts
// src/demos/phase1-rotation-gizmo.ts
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Scene } from "three";
import { Quaternion, Vec3, type Vec3Like } from "../math";
import "../ui/panels/gizmo-panel";
import { ACCENT, AXIS_COLORS } from "./helpers/colors";
import { disposeObject } from "./helpers/three";
import { VectorArrow } from "./helpers/vector-arrow";
import type { Demo, DemoInfo } from "./types";

/**
 * Phase 1: quaternions, and why engines don't store Euler angles.
 *
 * An angle slider drives a quaternion; the box and its basis arrows are drawn from it.
 */

const CENTER: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 }); // m
const BODY_SIZE: Readonly<Vec3Like> = Object.freeze({ x: 1.2, y: 0.6, z: 0.3 }); // m
const ARROW_LENGTH = 1.5; // m

const ORIGIN: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 0 });
const UNIT_X: Readonly<Vec3Like> = Object.freeze({ x: 1, y: 0, z: 0 });
const UNIT_Y: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 });
const UNIT_Z: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 1 });
const UNITS = [UNIT_X, UNIT_Y, UNIT_Z] as const;

const _basis = new Vec3();

class RotationGizmoDemo implements Demo {
    readonly panel = document.createElement("aether-gizmo-panel");

    // Input state. The panel shows it; the demo owns it.
    #axis: Vec3Like = UNIT_Y;
    #angle = 0; // rad

    // Derived state: the one orientation everything else is drawn from.
    #q = new Quaternion();
    #dirty = true;

    // View.
    #group = new Group();
    #body: Mesh;
    #arrows = [
        new VectorArrow(AXIS_COLORS.x),
        new VectorArrow(AXIS_COLORS.y),
        new VectorArrow(AXIS_COLORS.z),
    ];

    constructor() {
        this.#group.position.copy(CENTER);
        this.#body = new Mesh(
            new BoxGeometry(BODY_SIZE.x, BODY_SIZE.y, BODY_SIZE.z),
            new MeshStandardMaterial({ color: ACCENT }),
        );
        this.#group.add(this.#body, ...this.#arrows);

        this.#pushInputs();
        this.panel.addEventListener("angle-change", (e) => {
            this.#angle = (e as CustomEvent<number>).detail;
            this.#pushInputs();
        });
    }

    /** Passes the input state back to the panel (its inputs are controlled) and marks dirty. */
    #pushInputs(): void {
        this.panel.angle = this.#angle;
        this.#dirty = true;
    }

    mount(scene: Scene): void {
        scene.add(this.#group);
        this.sync(1);
    }

    step(_dt: number): void {
        // Nothing to simulate: the orientation comes straight from the inputs.
    }

    sync(_alpha: number): void {
        if (!this.#dirty) return; // inputs only change on user events
        this.#dirty = false;

        this.#updateQuaternion();
        this.#updateView();
        this.#updateReadouts();
    }

    #updateQuaternion(): void {
        this.#q.setFromAxisAngle(this.#axis, this.#angle);
    }

    #updateView(): void {
        this.#body.quaternion.copy(this.#q);
        this.#arrows.forEach((arrow, i) => {
            this.#q.rotateVec3(UNITS[i]!, _basis);
            arrow.update(ORIGIN, _basis, ARROW_LENGTH);
        });
    }

    #updateReadouts(): void {
        // Lit compares properties by identity, so every readout gets a fresh object.
        const q = this.#q;
        this.panel.quaternion = { w: q.w, x: q.x, y: q.y, z: q.z };
    }

    unmount(scene: Scene): void {
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

export const rotationGizmoDemo: DemoInfo = {
    id: "rotation-gizmo",
    title: "Rotation gizmo",
    phase: 1,
    summary: "Drag the angle slider to rotate the box about +Y.",
    create: () => new RotationGizmoDemo(),
};
```

**Why it's built this way**

- **Degrees on screen, radians everywhere else.** The panel converts at its edge (`* RAD_TO_DEG` in, `* DEG_TO_RAD` out), so the demo and engine never see a degree.
- **`document.createElement("aether-gizmo-panel")` is typed `GizmoPanel`**, thanks to the `HTMLElementTagNameMap` declaration, so `this.panel.angle` type-checks. The bare `import "../ui/panels/gizmo-panel"` is what runs `customElements.define`.
- **The demo owns the input state.** The panel emits `angle-change`; the demo stores it and pushes it back (`#pushInputs`). That's the controlled pattern from step 7, one level up.
- **Dirty flag.** The orientation only changes when the user does something, so `sync` does nothing on most frames. That avoids recomputing, and avoids re-rendering the panel 60 times a second.
- **No interpolation:** `step` changes nothing, so there's nothing to blend. DEMOS.md §4: demos driven only by inputs skip it.
- **Three `#update…` methods:** state → view → readouts, always in that order. Steps 9–11 only add lines inside them.
- **`step(_dt)`/`sync(_alpha)`:** the leading underscore tells `noUnusedParameters` the parameter is unused on purpose.

**Check**

- Drag the angle: the box and arrows turn about Y.
- At 90°: `w ≈ 0.707, y ≈ 0.707`, and the red arrow points along −Z.
- At +180° and −180°: the box is in the same place, but `y` has flipped sign. **`q` and `−q` are the same rotation.**
- Click the slider, then press Space: it doesn't pause (the app ignores keys aimed at inputs).
- R: the angle goes back to 0, and the slider follows.
- Experiment: change `#updateReadouts` to `this.panel.quaternion = this.#q;`. The readout updates **once**, then freezes. Lit saw the same object, so it decided nothing changed. Undo it.

---

## Step 9: The axis input

### `src/ui/controls/aether-vec3-input.ts` (new)

```ts
import { LitElement, css, html } from "lit";
import { live } from "lit/directives/live.js";
import { Vec3, type Vec3Like } from "../../math";

const AXES = ["x", "y", "z"] as const;
type Axis = (typeof AXES)[number];

/** Shows at most 3 decimals in a field, without trailing zeros: 0.577, 1, -0.5. */
function fieldText(n: number): string {
    return String(Number(n.toFixed(3)));
}

/**
 * Three numeric inputs for a vector, labelled X, Y, Z in the axis colors.
 *
 * With `unit` set, the emitted vector is normalized, and an edit that would make it the
 * zero vector is rejected: the fields snap back to the current value.
 *
 * Events: `value-change` (detail: Vec3Like, a new object each time).
 */
export class AetherVec3Input extends LitElement {
    static override properties = {
        label: { type: String },
        value: { attribute: false },
        step: { type: Number },
        unit: { type: Boolean },
    };

    declare label: string;
    declare value: Vec3Like;
    declare step: number;
    declare unit: boolean;

    static override styles = css`
        :host {
            display: grid;
            gap: var(--space-1);
        }
        .fields {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
        }
        input {
            box-sizing: border-box; /* the global rule in styles.css doesn't reach shadow DOM */
            width: 100%;
            font: inherit;
            font-family: var(--mono);
            font-variant-numeric: tabular-nums;
            color: var(--text);
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 4px 6px;
        }
        input:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }
        .x {
            border-left: 3px solid var(--axis-x);
        }
        .y {
            border-left: 3px solid var(--axis-y);
        }
        .z {
            border-left: 3px solid var(--axis-z);
        }
    `;

    constructor() {
        super();
        this.label = "";
        this.value = { x: 0, y: 0, z: 0 };
        this.step = 0.1;
        this.unit = false;
    }

    #onChange(axis: Axis, e: Event): void {
        const raw = Number((e.target as HTMLInputElement).value);
        if (!Number.isFinite(raw)) return this.#reject();

        const next = new Vec3(this.value.x, this.value.y, this.value.z);
        next[axis] = raw;
        if (this.unit) {
            const length = next.magnitude();
            if (length < 1e-6) return this.#reject();
            next.scale(1 / length);
        }

        this.dispatchEvent(
            new CustomEvent("value-change", {
                detail: { x: next.x, y: next.y, z: next.z },
                bubbles: true,
                composed: true,
            }),
        );
    }

    /** Re-renders without emitting, so live() puts the current value back in the field. */
    #reject(): void {
        this.requestUpdate();
    }

    override render() {
        return html`
            <span>${this.label}</span>
            <div class="fields">
                ${AXES.map(
                    (axis) => html`
                        <input
                            class=${axis}
                            type="number"
                            step=${this.step}
                            aria-label="${this.label} ${axis.toUpperCase()}"
                            .value=${live(fieldText(this.value[axis]))}
                            @change=${(e: Event) => this.#onChange(axis, e)}
                        />
                    `,
                )}
            </div>
        `;
    }
}

customElements.define("aether-vec3-input", AetherVec3Input);

declare global {
    interface HTMLElementTagNameMap {
        "aether-vec3-input": AetherVec3Input;
    }
}
```

**Why**

- **`@change`, not `@input`:** `change` fires when you commit (Enter or Tab out). With `input`, typing `0.5` would normalize after the `0` and rewrite the field under your cursor.
- **The detail is a plain new object**, never `this.value` mutated, because of Lit's identity check (step 8's experiment).
- **Rejecting:** `requestUpdate()` re-renders with the unchanged `value`, and `live()` notices the DOM field differs and puts the old number back.
- **`unit` and not `normalize`:** every DOM element already has a `normalize()` method, and TypeScript won't let you shadow it.
- **`box-sizing`:** `styles.css` sets `* { box-sizing: border-box }`, but that rule can't reach into shadow DOM. Without this line, `width: 100%` plus padding overflows the sidebar.

### Panel: add the axis

```ts
import type { QuatLike, Vec3Like } from "../../math";   // add Vec3Like
import "../controls/aether-vec3-input";                 // add

    static override properties = {
        axis: { attribute: false },                     // add
        angle: { attribute: false },
        // ...
    };

    declare axis: Vec3Like;                             // add

    // constructor:
        this.axis = { x: 0, y: 1, z: 0 };               // add

    // render(), before the angle slider:
            <aether-vec3-input
                label="Axis"
                unit
                .value=${this.axis}
                @value-change=${(e: CustomEvent<Vec3Like>) => this.#emit("axis-change", e.detail)}
            ></aether-vec3-input>
```

Update the class doc's event list: `` `axis-change` (Vec3Like), `angle-change` (number) ``.

### Demo: listen for it, and draw the axis

```ts
import { ACCENT, AXIS_COLORS, MUTED } from "./helpers/colors";   // add MUTED

const AXIS_ARROW_LENGTH = 2; // m                                 // add

    #axis: Vec3Like = { x: 0, y: 1, z: 0 };     // was UNIT_Y; now the user changes it
    #axisArrow = new VectorArrow(MUTED);        // add, under #arrows

    // constructor:
        this.#group.add(this.#body, ...this.#arrows, this.#axisArrow);
        // ...
        this.panel.addEventListener("axis-change", (e) => {
            this.#axis = (e as CustomEvent<Vec3Like>).detail;
            this.#pushInputs();
        });

    #pushInputs(): void {
        this.panel.axis = this.#axis;           // add
        this.panel.angle = this.#angle;
        this.#dirty = true;
    }

    // end of #updateView():
        this.#axisArrow.update(ORIGIN, this.#axis, AXIS_ARROW_LENGTH);
```

**Why the axis arrow:** it shows the defining fact about axis-angle. **The axis is the one direction the rotation leaves alone.** Drag the angle and the gray arrow stays put while everything turns around it.

**Check**

- Starting from `0, 1, 0`, type `1` in X and press Tab: the fields become `0.707, 0.707, 0`. Every commit renormalizes all three.
- Then type `0.707` in Z: all three become `0.577`, which is `(1, 1, 1)` normalized.
- Type `0` into all three: the last one snaps back. Nothing breaks.
- Axis `(1, 1, 1)`, angle 120°: **the three arrows swap places**: red goes to where green was, green to blue, blue to red.

---

## Step 9b: An axis that doesn't fight you

Step 9's `unit` input normalizes on every commit. Start from `0, 1, 0`, type `1` in X, and you get `0.707, 0.707, 0`: both fields change, and neither shows what you typed. It's correct, but it fights you.

The fix splits two jobs that step 9 bundled together:

- **The fields hold the direction exactly as typed.** `1, 1, 0` stays `1, 1, 0`. Only the zero vector is rejected, since it has no direction.
- **The demo normalizes wherever it uses the axis.** `setFromAxisAngle` already divides by the axis length, so only the arrow needs it. The axis–angle readout in step 10 shows the normalized axis, so you still see the unit vector.

On top of that come two quicker ways to set the axis: **preset buttons**, and **dragging the gray arrow's tip** in the viewport.

### `src/ui/controls/aether-vec3-input.ts`: `unit` becomes `nonzero`

The math import shrinks to the type. `Vec3` was only there to normalize:

```ts
import type { Vec3Like } from "../../math";
```

Class doc, property, declaration and constructor:

```ts
/**
 * Three numeric inputs for a vector, labelled X, Y, Z in the axis colors.
 *
 * Values go out exactly as typed. With `nonzero` set, an edit that would make the zero
 * vector is rejected: the fields snap back to the current value.
 *
 * Events: `value-change` (detail: Vec3Like, a new object each time).
 */

        nonzero: { type: Boolean },     // was: unit

    declare nonzero: boolean;           // was: unit

        this.nonzero = false;           // was: this.unit = false
```

`#onChange`, in full:

```ts
    #onChange(axis: Axis, e: Event): void {
        const raw = Number((e.target as HTMLInputElement).value);
        if (!Number.isFinite(raw)) return this.#reject();

        const next: Vec3Like = { ...this.value, [axis]: raw };
        if (this.nonzero && Math.hypot(next.x, next.y, next.z) < 1e-6) {
            return this.#reject();
        }

        this.dispatchEvent(
            new CustomEvent("value-change", {
                detail: next,
                bubbles: true,
                composed: true,
            }),
        );
    }
```

`{ ...this.value, [axis]: raw }` is a new object with one field replaced: the same trick as the Euler sliders in step 11. `[axis]` is a *computed key*. Because `axis` has type `Axis` (`"x" | "y" | "z"`), TypeScript knows the result is still a `Vec3Like`.

### `src/ui/panels/gizmo-panel.ts`: `nonzero`, and presets

Above the class:

```ts
/** One-click axes. Any non-zero vector works; the demo normalizes it. */
const AXIS_PRESETS = [
    { label: "X", axis: { x: 1, y: 0, z: 0 } },
    { label: "Y", axis: { x: 0, y: 1, z: 0 } },
    { label: "Z", axis: { x: 0, y: 0, z: 1 } },
    { label: "XYZ", axis: { x: 1, y: 1, z: 1 } },
] as const;
```

In `render()`, the axis input changes `unit` to `nonzero`, and the presets go right under it:

```ts
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
```

`{ ...axis }` hands the demo a copy, not the shared preset object. The demo stores whatever it's given, so a later edit could otherwise end up mutating the table.

### Letting a demo see the pointer: `DemoView`

Until now a demo only got the `Scene`. Dragging needs three more things: the **camera** (to turn a pixel into a ray), the **element** (for pointer events), and a way to **stop orbiting** while dragging, or the camera would spin as you drag the tip.

`src/demos/types.ts`:

```ts
import type { Camera, Scene } from "three";

export interface Demo {
    /**
     * Add meshes, lights and helpers to the scene. `view` is only needed by demos that
     * react to the pointer in the viewport.
     */
    mount(scene: Scene, view: DemoView): void;
    // ...step, sync, unmount and panel unchanged
}

/** What a demo may use of the viewport, beyond the scene. */
export interface DemoView {
    readonly camera: Camera;
    /** The viewport element. Pointer events from its canvas bubble up to it. */
    readonly element: HTMLElement;
    /** Turns camera orbiting off while a demo drags something, and back on after. */
    setOrbitEnabled(enabled: boolean): void;
}
```

`src/ui/aether-viewport.ts` builds one. Put it after `#resizeObserver`:

```ts
import type { DemoView } from '../demos/types';

  /** Handed to each demo's `mount`. */
  readonly view: DemoView = {
    camera: this.camera,
    element: this,
    setOrbitEnabled: (enabled) => {
      if (this.#controls) this.#controls.enabled = enabled;
    },
  };
```

`src/ui/aether-app.ts`, in `#loadDemo`:

```ts
    #loadDemo(id: string): void {
        const info = demos.find((d) => d.id === id);
        const viewport = this.#viewport;
        if (!info || !viewport) return;
        this.#demo?.unmount(viewport.scene);
        this.#demo = info.create();
        this.#demo.mount(viewport.scene, viewport.view);
        this.panel = this.#demo.panel ?? null;
        this.#loop.reset();
        this.demoId = id;
    }
```

The timestep demo's `mount(scene: Scene)` doesn't need changing. A function that takes fewer parameters still satisfies the interface.

`setOrbitEnabled` is an arrow function, so `this` is the viewport even when a demo calls it. `#controls` is still `null` until `firstUpdated`, so it checks first.

### `src/demos/helpers/drag-handle.ts` (new)

The pointer plumbing goes in a helper, so later demos (dragging a body, aiming a force) can reuse it. It knows nothing about axes. It reports a world-space ray, and the demo decides what that ray means.

```ts
import { Raycaster, Vector2, type Object3D, type Ray } from "three";
import type { DemoView } from "../types";

/**
 * Lets the user drag `target` in the viewport. Pressing on it turns orbiting off and
 * captures the pointer; each move then calls `onDrag` with the pointer's world-space ray.
 * What the ray means (a point on a plane, on a sphere, ...) is up to the caller.
 *
 * Hit-testing ignores depth, so the target can be grabbed through other meshes.
 */
export class DragHandle {
    readonly #view: DemoView;
    readonly #target: Object3D;
    readonly #onDrag: (ray: Ray) => void;

    #raycaster = new Raycaster();
    #pointer = new Vector2(); // normalized device coordinates, -1 to 1
    #dragging: number | null = null; // id of the pointer doing the dragging

    constructor(view: DemoView, target: Object3D, onDrag: (ray: Ray) => void) {
        this.#view = view;
        this.#target = target;
        this.#onDrag = onDrag;

        const el = view.element;
        // Capture phase: runs before OrbitControls' listener on the canvas inside.
        el.addEventListener("pointerdown", this.#onDown, { capture: true });
        el.addEventListener("pointermove", this.#onMove);
        el.addEventListener("pointerup", this.#onUp);
        el.addEventListener("pointercancel", this.#onUp);
    }

    /** Removes the listeners. Call from the demo's `unmount`. */
    dispose(): void {
        const el = this.#view.element;
        el.removeEventListener("pointerdown", this.#onDown, { capture: true });
        el.removeEventListener("pointermove", this.#onMove);
        el.removeEventListener("pointerup", this.#onUp);
        el.removeEventListener("pointercancel", this.#onUp);
        if (this.#dragging !== null) this.#end();
        el.style.cursor = "";
    }

    /** Points the raycaster's ray from the camera through the pointer. */
    #castRay(e: PointerEvent): Ray {
        const rect = this.#view.element.getBoundingClientRect();
        this.#pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1, // screen y points down
        );
        this.#raycaster.setFromCamera(this.#pointer, this.#view.camera);
        return this.#raycaster.ray;
    }

    #hits(e: PointerEvent): boolean {
        if (!this.#target.visible) return false;
        this.#castRay(e);
        return this.#raycaster.intersectObject(this.#target).length > 0;
    }

    #onDown = (e: PointerEvent): void => {
        if (e.button !== 0 || this.#dragging !== null || !this.#hits(e)) return;
        this.#dragging = e.pointerId;
        this.#view.element.setPointerCapture(e.pointerId);
        this.#view.setOrbitEnabled(false);
        this.#view.element.style.cursor = "grabbing";
    };

    #onMove = (e: PointerEvent): void => {
        if (this.#dragging === null) {
            // Not dragging: just show whether a press here would grab.
            this.#view.element.style.cursor = this.#hits(e) ? "grab" : "";
            return;
        }
        if (e.pointerId !== this.#dragging) return;
        this.#onDrag(this.#castRay(e));
    };

    #onUp = (e: PointerEvent): void => {
        if (e.pointerId === this.#dragging) this.#end();
    };

    #end(): void {
        const el = this.#view.element;
        if (this.#dragging !== null && el.hasPointerCapture(this.#dragging)) {
            el.releasePointerCapture(this.#dragging);
        }
        this.#dragging = null;
        this.#view.setOrbitEnabled(true);
        el.style.cursor = "";
    }
}
```

**Why it's built this way**

- **Capture phase on the host.** OrbitControls listens for `pointerdown` on the canvas, which sits *inside* the viewport's shadow root. A capture listener on the host runs first. It turns the controls off, and OrbitControls' own handler returns early because `enabled === false`.
- **`setPointerCapture`** keeps `pointermove` coming to the element even when the pointer leaves the canvas mid-drag, and guarantees the `pointerup` arrives.
- **NDC:** `setFromCamera` wants the pointer in *normalized device coordinates*, −1 to 1 on both axes, with +y up. Screen y grows downwards, hence the minus sign.
- **Hover raycasts** set the `grab` cursor. That's one ray against one small sphere per mouse move, which costs nothing.
- **`Raycaster` ignores `visible`**, so `#hits` checks it. That's how a hidden handle (step 11's Euler mode) stops being grabbable.

### The demo, with the handle

Replace the whole demo file. You renamed `#arrows` and `#axisArrow` to `#bodyAxisArrows` and `#rotationAxisArrow`: keep your names. The guide uses the short ones so steps 10 and 11 still match.

```ts
import {
    BoxGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    SphereGeometry,
    type Ray,
    type Scene,
} from "three";
import { Quaternion, Vec3, type Vec3Like } from "../math";
import "../ui/panels/gizmo-panel";
import { ACCENT, AXIS_COLORS, MUTED } from "./helpers/colors";
import { DragHandle } from "./helpers/drag-handle";
import { disposeObject } from "./helpers/three";
import { VectorArrow } from "./helpers/vector-arrow";
import type { Demo, DemoInfo, DemoView } from "./types";

/**
 * Phase 1: quaternions, and why engines don't store Euler angles.
 *
 * An axis and an angle drive a quaternion; the box and its basis arrows are drawn from
 * it. The axis can be typed, picked from presets, or dragged by its arrow tip.
 */

const CENTER: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 }); // m
const BODY_SIZE: Readonly<Vec3Like> = Object.freeze({ x: 1.2, y: 0.6, z: 0.3 }); // m
const ARROW_LENGTH = 1.5; // m
const AXIS_ARROW_LENGTH = 2; // m
const HANDLE_RADIUS = 0.12; // m

const ORIGIN: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 0 });
const UNIT_X: Readonly<Vec3Like> = Object.freeze({ x: 1, y: 0, z: 0 });
const UNIT_Y: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 });
const UNIT_Z: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 1 });
const UNITS = [UNIT_X, UNIT_Y, UNIT_Z] as const;

// Scratch objects, reused every update.
const _basis = new Vec3();
const _axisDir = new Vec3();
const _rayOrigin = new Vec3();
const _tip = new Vec3();
const _near = new Vec3();
const _far = new Vec3();

class RotationGizmoDemo implements Demo {
    readonly panel = document.createElement("aether-gizmo-panel");

    // Input state. The panel shows it; the demo owns it.
    /** Any non-zero vector, kept as the user typed it. Normalized wherever it's used. */
    #axis: Vec3Like = { x: 0, y: 1, z: 0 };
    #angle = 0; // rad

    // Derived state: the one orientation everything else is drawn from.
    #q = new Quaternion();
    #dirty = true;

    // View.
    #group = new Group();
    #body: Mesh;
    #arrows = [
        new VectorArrow(AXIS_COLORS.x),
        new VectorArrow(AXIS_COLORS.y),
        new VectorArrow(AXIS_COLORS.z),
    ];
    #axisArrow = new VectorArrow(MUTED);
    /** The grab point at the tip of the rotation axis arrow. */
    #axisHandle = new Mesh(
        new SphereGeometry(HANDLE_RADIUS, 16, 12),
        new MeshBasicMaterial({ color: MUTED, depthTest: false }),
    );
    #drag: DragHandle | null = null;

    constructor() {
        this.#group.position.copy(CENTER);
        this.#body = new Mesh(
            new BoxGeometry(BODY_SIZE.x, BODY_SIZE.y, BODY_SIZE.z),
            new MeshStandardMaterial({ color: ACCENT }),
        );
        this.#axisHandle.renderOrder = 1; // drawn on top, like the arrows
        this.#group.add(
            this.#body,
            ...this.#arrows,
            this.#axisArrow,
            this.#axisHandle,
        );

        this.#pushInputs();
        this.panel.addEventListener("angle-change", (e) => {
            this.#angle = (e as CustomEvent<number>).detail;
            this.#pushInputs();
        });
        this.panel.addEventListener("axis-change", (e) => {
            this.#axis = (e as CustomEvent<Vec3Like>).detail;
            this.#pushInputs();
        });
    }

    /** Passes the input state back to the panel (its inputs are controlled) and marks dirty. */
    #pushInputs(): void {
        this.panel.axis = this.#axis;
        this.panel.angle = this.#angle;
        this.#dirty = true;
    }

    /**
     * Points the axis at where the pointer's ray meets the sphere the handle moves on
     * (centered on the box, radius AXIS_ARROW_LENGTH).
     *
     * A ray that crosses a sphere crosses it twice, front and back. The crossing nearer
     * the current tip wins, so the tip can be dragged over the edge to the far side. A ray
     * that misses uses its closest approach to the center, which keeps the tip on the
     * sphere's outline instead of stopping dead.
     */
    #dragAxis(ray: Ray): void {
        const r = AXIS_ARROW_LENGTH;
        // Solve |o + t·d|² = r², with o relative to the sphere center and d unit length:
        // t² + 2bt + c = 0, where b = o·d and c = |o|² − r².
        const o = _rayOrigin.copy(ray.origin).subtract(CENTER);
        const d = ray.direction;
        const b = o.dot(d);
        const c = o.magnitudeSquared() - r * r;
        const discriminant = b * b - c;

        let hit: Vec3;
        if (discriminant < 0) {
            hit = _near.copy(o).addScaled(d, -b); // closest point to the center
        } else {
            const s = Math.sqrt(discriminant);
            _near.copy(o).addScaled(d, -b - s);
            _far.copy(o).addScaled(d, -b + s);
            _tip.copy(this.#axis).normalize().scale(r);
            hit = _near.distanceToSquared(_tip) <= _far.distanceToSquared(_tip) ? _near : _far;
        }

        if (hit.magnitudeSquared() < 1e-12) return; // ray straight through the center
        hit.normalize();
        this.#axis = { x: hit.x, y: hit.y, z: hit.z };
        this.#pushInputs();
    }

    mount(scene: Scene, view: DemoView): void {
        scene.add(this.#group);
        this.#drag = new DragHandle(view, this.#axisHandle, (ray) => this.#dragAxis(ray));
        this.sync(1);
    }

    step(_dt: number): void {
        // Nothing to simulate: the orientation comes straight from the inputs.
    }

    sync(_alpha: number): void {
        if (!this.#dirty) return; // inputs only change on user events
        this.#dirty = false;

        this.#updateQuaternion();
        this.#updateView();
        this.#updateReadouts();
    }

    #updateQuaternion(): void {
        this.#q.setFromAxisAngle(this.#axis, this.#angle); // normalizes the axis itself
    }

    #updateView(): void {
        this.#body.quaternion.copy(this.#q);
        this.#arrows.forEach((arrow, i) => {
            this.#q.rotateVec3(UNITS[i]!, _basis);
            arrow.update(ORIGIN, _basis, ARROW_LENGTH);
        });

        // The arrow's length comes from the vector, so draw it from the unit axis.
        _axisDir.copy(this.#axis).normalize();
        this.#axisArrow.update(ORIGIN, _axisDir, AXIS_ARROW_LENGTH);
        this.#axisHandle.position.copy(_axisDir).multiplyScalar(AXIS_ARROW_LENGTH);
    }

    #updateReadouts(): void {
        // Lit compares properties by identity, so every readout gets a fresh object.
        const q = this.#q;
        this.panel.quaternion = { w: q.w, x: q.x, y: q.y, z: q.z };
    }

    unmount(scene: Scene): void {
        this.#drag?.dispose();
        this.#drag = null;
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

export const rotationGizmoDemo: DemoInfo = {
    id: "rotation-gizmo",
    title: "Rotation gizmo",
    phase: 1,
    summary: "Set an axis (type it, pick a preset, or drag the gray tip), then drag the angle.",
    create: () => new RotationGizmoDemo(),
};
```

**The sphere math in `#dragAxis`**

The handle lives on a sphere of radius `r = 2` around the box. The ray is `o + t·d`, with `o` taken relative to the sphere's center. Setting its length to `r` gives a quadratic in `t`:

```
|o + t·d|² = r²
t² + 2(o·d)t + (|o|² − r²) = 0           (d·d = 1)
t = −b ± √(b² − c)                       b = o·d,  c = |o|² − r²
```

- **Two roots:** the ray enters the sphere at the near point and leaves at the far point. The near point is always on the camera's side, so picking it every time would leave you unable to aim the axis away from the camera. Picking **whichever root is nearer the current tip** lets you push the tip over the outline and keep going round the back.
- **No roots** (`b² − c < 0`): the pointer is outside the sphere's outline. `o − b·d` is the point on the ray closest to the center. Normalized, it's a direction perpendicular to the view, so the tip slides along the outline and doesn't freeze.
- This is the same algebra as a ray-vs-sphere collision test, which you'll write for real in the collision phase.

**Check**

- `0, 1, 0`, type `1` in X: the fields read `1, 1, 0`, and the gray arrow points between X and Y at full length.
- Type `0` in X and Y, leaving Z at 0 too: the last edit snaps back. Zero is still rejected.
- Click **XYZ**, then set angle 120°: the basis arrows still swap places (step 9's check), with the fields showing `1, 1, 1`.
- Hover over the gray tip: the cursor becomes a hand. Drag it: the axis follows, the fields update, and the camera **doesn't** orbit.
- Drag the tip past the edge of the sphere and keep going: it wraps round to the far side, not snapping back to the front.
- Let go, then drag empty space: orbiting works again.
- Press R, or switch demos and back: dragging still works, and only once per move. If `unmount` didn't call `dispose`, the old listeners would still be attached.

---

## Step 10: Readouts

Same `q`, shown four ways. Each conversion is a library method you've already tested; the demo just puts them side by side.

### Panel

```ts
import { LitElement, css, html } from "lit";
import type { QuatLike, Vec3Like } from "../../math";
import { DEG_TO_RAD, RAD_TO_DEG, formatDegrees, formatNumber } from "../format";  // add formatDegrees

export interface AxisAngle {
    axis: Vec3Like;
    /** Radians. */
    angle: number;
}

    static override properties = {
        // ...inputs
        // Readouts
        quaternion: { attribute: false },
        axisAngle: { attribute: false },   // add
        euler: { attribute: false },       // add
        matrix: { attribute: false },      // add
    };

    declare axisAngle: AxisAngle;
    declare euler: Vec3Like;
    /** 9 values, row-major. */
    declare matrix: readonly number[];

    // constructor:
        this.axisAngle = { axis: { x: 1, y: 0, z: 0 }, angle: 0 };
        this.euler = { x: 0, y: 0, z: 0 };
        this.matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
```

Add the matrix styles to the panel's `css`, after `:host`:

```css
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
```

At the top of `render()`, next to `const q`:

```ts
        const { axis, angle } = this.axisAngle;
        const e = this.euler;
```

Add `|q|` to the quaternion `<dl>`, and the new sections after it:

```ts
                <dt>|q|</dt>
                <dd>${formatNumber(Math.hypot(q.w, q.x, q.y, q.z))}</dd>
            </dl>

            <h3>Axis–angle</h3>
            <dl>
                <dt>Axis</dt>
                <dd>${formatNumber(axis.x, 2)} ${formatNumber(axis.y, 2)} ${formatNumber(axis.z, 2)}</dd>
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
                ${this.matrix.map((v, i) => html`<span class="c${i % 3}">${formatNumber(v)}</span>`)}
            </div>
```

### Demo

```ts
import { Mat3x3, Quaternion, Vec3, type Vec3Like } from "../math";   // add Mat3x3

const _basis = new Vec3();
const _axis = new Vec3();        // add
const _euler = new Vec3();       // add
const _matrix = new Mat3x3();    // add

    #updateReadouts(): void {
        // Lit compares properties by identity, so every readout gets a fresh object.
        const q = this.#q;
        this.panel.quaternion = { w: q.w, x: q.x, y: q.y, z: q.z };

        const angle = q.getAxisAngle(_axis);
        this.panel.axisAngle = { axis: _axis.clone(), angle };

        this.panel.euler = q.getEulerXYZ(_euler).clone();
        this.panel.matrix = Array.from(_matrix.setFromQuaternion(q).elements);
    }
```

**Why**

- **The matrix columns *are* the basis arrows.** Column 0 is `q·X`, the red arrow. Tinting the columns by axis makes that visible.
- `elements` is **row-major**: `[m00, m01, m02, m10, …]`. Cell `i` is in column `i % 3`, which picks the class. (Three.js is column-major, which is why you never copy `elements` into a Three.js matrix.)
- `getAxisAngle(out)` **returns** the angle and **writes** the axis into `out`. Write into scratch first, then `clone()` it into a fresh object for Lit.
- The math happens in the demo and the panel only formats. The panel doesn't import `Quaternion` at all.

**Check**

- Angle 0: identity matrix, Euler all 0, `|q| = 1.000`.
- Axis +Y, 90°: matrix column 0 (red) reads `0, 0, −1`, the same as the red arrow. Euler reads `0°, 90°, 0°`.
- Axis +Y, −90°: the axis-angle readout shows **90° about −Y**. Same rotation; `getAxisAngle` always returns an angle in [0°, 180°].
- `|q|` reads `1.000` for every input.

---

## Step 11: Euler mode and the gimbal rings

The payoff. These are the last changes, so here are both files in full; diff them against yours.

### How the gimbals work

`setFromEulerXYZ(x, y, z)` builds `qx · qy · qz`. Read in body axes: turn about X, then about the **new** Y, then about the **newest** Z. A scene graph composes rotations exactly like that, parent before child:

```
#gimbals                       (no rotation; sits at CENTER via #group)
  outer  group: about X by x   holds the red ring   (faces X)
    middle group: about Y by y holds the green ring (faces Y)
      inner  group: about Z by z  holds the blue ring  (faces Z)
```

So the inner group ends up oriented exactly like the box. At `y = ±90°`, the middle gimbal turns the inner ring's axis onto the outer ring's axis. The red and blue rings become **coplanar**: two rings spinning about one line, and one degree of freedom is gone.

### `src/ui/panels/gizmo-panel.ts` (final)

```ts
import { LitElement, css, html, nothing } from "lit";
import type { QuatLike, Vec3Like } from "../../math";
import { DEG_TO_RAD, RAD_TO_DEG, formatDegrees, formatNumber } from "../format";
import { panelStyles } from "../shared-styles";
import "../controls/aether-slider";
import "../controls/aether-vec3-input";

export type GizmoMode = "axis-angle" | "euler";

export interface AxisAngle {
    axis: Vec3Like;
    /** Radians. */
    angle: number;
}

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
    static override properties = {
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

    static override styles = [
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
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
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
                ${button("axis-angle", "Axis–angle")} ${button("euler", "Euler XYZ")}
            </div>
        `;
    }

    #renderAxisAngleInputs() {
        return html`
            <aether-vec3-input
                label="Axis"
                nonzero
                .value=${this.axis}
                @value-change=${(e: CustomEvent<Vec3Like>) => this.#emit("axis-change", e.detail)}
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
            ></aether-slider>
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

    override render() {
        const q = this.quaternion;
        const { axis, angle } = this.axisAngle;
        const e = this.euler;

        return html`
            ${this.#renderModeSwitch()}
            ${this.mode === "axis-angle" ? this.#renderAxisAngleInputs() : this.#renderEulerInputs()}
            ${this.gimbalLock
                ? html`<p class="warn">Gimbal lock: X and Z now rotate about the same axis.</p>`
                : nothing}

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
                <dd>${formatNumber(axis.x, 2)} ${formatNumber(axis.y, 2)} ${formatNumber(axis.z, 2)}</dd>
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
                ${this.matrix.map((v, i) => html`<span class="c${i % 3}">${formatNumber(v)}</span>`)}
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
```

What's new in the panel:

- **`EULER_SLIDERS`** is a table that the render maps over, instead of three copies of a slider. `as const` makes `axis` the literal type `"x" | "y" | "z"`, so `this.eulerInput[axis]` type-checks.
- **The Euler event spreads the old value:** `{ ...this.eulerInput, [axis]: … }` is a new object with one field changed.
- **The axis input and presets** are step 9b's, moved into `#renderAxisAngleInputs`.
- **Y is limited to ±90°.** `getEulerXYZ` returns Y in [−90°, 90°] anyway, and ±90° is exactly where the lock happens.
- **The mode switch** is two buttons with `aria-pressed`, so screen readers announce which one is on.

### `src/demos/phase1-rotation-gizmo.ts` (final)

```ts
import {
    BoxGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    SphereGeometry,
    TorusGeometry,
    type Ray,
    type Scene,
} from "three";
import { Mat3x3, Quaternion, Vec3, type Vec3Like } from "../math";
import "../ui/panels/gizmo-panel";
import type { GizmoMode } from "../ui/panels/gizmo-panel";
import { ACCENT, AXIS_COLORS, MUTED, WARN } from "./helpers/colors";
import { DragHandle } from "./helpers/drag-handle";
import { disposeObject } from "./helpers/three";
import { VectorArrow } from "./helpers/vector-arrow";
import type { Demo, DemoInfo, DemoView } from "./types";

/**
 * Phase 1: quaternions, and why engines don't store Euler angles.
 *
 * Axis–angle input drives a quaternion directly; the axis can be typed, picked from
 * presets, or dragged by its arrow tip. Euler input drives three nested
 * gimbal rings; at Y = ±90° two of them line up and a degree of freedom disappears.
 * Everything drawn and every readout is derived from the one quaternion.
 */

const CENTER: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 }); // m
const BODY_SIZE: Readonly<Vec3Like> = Object.freeze({ x: 1.2, y: 0.6, z: 0.3 }); // m
const ARROW_LENGTH = 1.5; // m
const AXIS_ARROW_LENGTH = 2; // m
const HANDLE_RADIUS = 0.12; // m
const RING_RADII = [1.3, 1.15, 1.0] as const; // m: outer (X), middle (Y), inner (Z)
const RING_TUBE = 0.02; // m
/** |cos y| below this counts as gimbal lock: within about 1.15° of ±90°. */
const GIMBAL_LOCK_COS = 0.02;

const ORIGIN: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 0 });
const UNIT_X: Readonly<Vec3Like> = Object.freeze({ x: 1, y: 0, z: 0 });
const UNIT_Y: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 1, z: 0 });
const UNIT_Z: Readonly<Vec3Like> = Object.freeze({ x: 0, y: 0, z: 1 });
const UNITS = [UNIT_X, UNIT_Y, UNIT_Z] as const;
const RING_COLORS = [AXIS_COLORS.x, AXIS_COLORS.y, AXIS_COLORS.z] as const;

// Scratch objects, reused every update.
const _basis = new Vec3();
const _axis = new Vec3();
const _euler = new Vec3();
const _matrix = new Mat3x3();
const _turn = new Quaternion();
const _axisDir = new Vec3();
const _rayOrigin = new Vec3();
const _tip = new Vec3();
const _near = new Vec3();
const _far = new Vec3();

/** A thin ring in its local XY plane, so its hole faces +Z. */
function makeRing(radius: number, color: number): Mesh<TorusGeometry, MeshBasicMaterial> {
    return new Mesh(
        new TorusGeometry(radius, RING_TUBE, 12, 96),
        new MeshBasicMaterial({ color }),
    );
}

class RotationGizmoDemo implements Demo {
    readonly panel = document.createElement("aether-gizmo-panel");

    // Input state. The panel shows it; the demo owns it.
    #mode: GizmoMode = "axis-angle";
    /** Any non-zero vector, kept as the user typed it. Normalized wherever it's used. */
    #axis: Vec3Like = { x: 0, y: 1, z: 0 };
    #angle = 0; // rad
    #eulerAngles: Vec3Like = { x: 0, y: 0, z: 0 }; // rad

    // Derived state: the one orientation everything else is drawn from.
    #q = new Quaternion();
    #dirty = true;

    // View.
    #group = new Group();
    #body: Mesh;
    #arrows = [
        new VectorArrow(AXIS_COLORS.x),
        new VectorArrow(AXIS_COLORS.y),
        new VectorArrow(AXIS_COLORS.z),
    ];
    #axisArrow = new VectorArrow(MUTED);
    /** The grab point at the tip of the rotation axis arrow. */
    #axisHandle = new Mesh(
        new SphereGeometry(HANDLE_RADIUS, 16, 12),
        new MeshBasicMaterial({ color: MUTED, depthTest: false }),
    );
    #drag: DragHandle | null = null;
    #gimbals = new Group();
    /** Outer (X), middle (Y), inner (Z). Each is a child of the one before. */
    #gimbalGroups = [new Group(), new Group(), new Group()] as const;
    #rings = [
        makeRing(RING_RADII[0], AXIS_COLORS.x),
        makeRing(RING_RADII[1], AXIS_COLORS.y),
        makeRing(RING_RADII[2], AXIS_COLORS.z),
    ] as const;

    constructor() {
        this.#group.position.copy(CENTER);

        this.#body = new Mesh(
            new BoxGeometry(BODY_SIZE.x, BODY_SIZE.y, BODY_SIZE.z),
            new MeshStandardMaterial({ color: ACCENT }),
        );

        // Gimbals: outer → middle → inner, each nested in the one before.
        const [outer, middle, inner] = this.#gimbalGroups;
        this.#gimbals.add(outer);
        outer.add(middle);
        middle.add(inner);

        // Each ring faces its own axis. A torus faces +Z, so turn the X and Y rings once
        // here. These turns are on the ring meshes; the gimbal angles go on the groups.
        const [ringX, ringY, ringZ] = this.#rings;
        ringX.quaternion.copy(_turn.setFromAxisAngle(UNIT_Y, Math.PI / 2)); // +Z → +X
        ringY.quaternion.copy(_turn.setFromAxisAngle(UNIT_X, -Math.PI / 2)); // +Z → +Y
        outer.add(ringX);
        middle.add(ringY);
        inner.add(ringZ);

        this.#axisHandle.renderOrder = 1; // drawn on top, like the arrows
        this.#group.add(
            this.#body,
            ...this.#arrows,
            this.#axisArrow,
            this.#axisHandle,
            this.#gimbals,
        );

        this.#pushInputs();
        this.panel.addEventListener("mode-change", (e) => {
            this.#setMode((e as CustomEvent<GizmoMode>).detail);
        });
        this.panel.addEventListener("axis-change", (e) => {
            this.#axis = (e as CustomEvent<Vec3Like>).detail;
            this.#pushInputs();
        });
        this.panel.addEventListener("angle-change", (e) => {
            this.#angle = (e as CustomEvent<number>).detail;
            this.#pushInputs();
        });
        this.panel.addEventListener("euler-change", (e) => {
            this.#eulerAngles = (e as CustomEvent<Vec3Like>).detail;
            this.#pushInputs();
        });
    }

    /** Passes the input state back to the panel (its inputs are controlled) and marks dirty. */
    #pushInputs(): void {
        this.panel.mode = this.#mode;
        this.panel.axis = this.#axis;
        this.panel.angle = this.#angle;
        this.panel.eulerInput = this.#eulerAngles;
        this.#dirty = true;
    }

    /**
     * Switches input mode, seeding the new mode's inputs from the current orientation so
     * the body doesn't jump.
     */
    #setMode(mode: GizmoMode): void {
        if (mode === this.#mode) return;
        this.#updateQuaternion();
        if (mode === "euler") {
            this.#q.getEulerXYZ(_euler);
            this.#eulerAngles = { x: _euler.x, y: _euler.y, z: _euler.z };
        } else {
            this.#angle = this.#q.getAxisAngle(_axis);
            this.#axis = { x: _axis.x, y: _axis.y, z: _axis.z };
        }
        this.#mode = mode;
        this.#pushInputs();
    }

    /**
     * Points the axis at where the pointer's ray meets the sphere the handle moves on
     * (centered on the box, radius AXIS_ARROW_LENGTH).
     *
     * A ray that crosses a sphere crosses it twice, front and back. The crossing nearer
     * the current tip wins, so the tip can be dragged over the edge to the far side. A ray
     * that misses uses its closest approach to the center, which keeps the tip on the
     * sphere's outline instead of stopping dead.
     */
    #dragAxis(ray: Ray): void {
        const r = AXIS_ARROW_LENGTH;
        // Solve |o + t·d|² = r², with o relative to the sphere center and d unit length:
        // t² + 2bt + c = 0, where b = o·d and c = |o|² − r².
        const o = _rayOrigin.copy(ray.origin).subtract(CENTER);
        const d = ray.direction;
        const b = o.dot(d);
        const c = o.magnitudeSquared() - r * r;
        const discriminant = b * b - c;

        let hit: Vec3;
        if (discriminant < 0) {
            hit = _near.copy(o).addScaled(d, -b); // closest point to the center
        } else {
            const s = Math.sqrt(discriminant);
            _near.copy(o).addScaled(d, -b - s);
            _far.copy(o).addScaled(d, -b + s);
            _tip.copy(this.#axis).normalize().scale(r);
            hit = _near.distanceToSquared(_tip) <= _far.distanceToSquared(_tip) ? _near : _far;
        }

        if (hit.magnitudeSquared() < 1e-12) return; // ray straight through the center
        hit.normalize();
        this.#axis = { x: hit.x, y: hit.y, z: hit.z };
        this.#pushInputs();
    }

    mount(scene: Scene, view: DemoView): void {
        scene.add(this.#group);
        this.#drag = new DragHandle(view, this.#axisHandle, (ray) => this.#dragAxis(ray));
        this.sync(1);
    }

    step(_dt: number): void {
        // Nothing to simulate: the orientation comes straight from the inputs.
    }

    sync(_alpha: number): void {
        if (!this.#dirty) return; // inputs only change on user events
        this.#dirty = false;

        this.#updateQuaternion();
        this.#updateView();
        this.#updateReadouts();
    }

    #updateQuaternion(): void {
        if (this.#mode === "axis-angle") {
            this.#q.setFromAxisAngle(this.#axis, this.#angle); // normalizes the axis itself
        } else {
            const { x, y, z } = this.#eulerAngles;
            this.#q.setFromEulerXYZ(x, y, z);
        }
    }

    #isGimbalLocked(): boolean {
        return (
            this.#mode === "euler" && Math.abs(Math.cos(this.#eulerAngles.y)) < GIMBAL_LOCK_COS
        );
    }

    #updateView(): void {
        this.#body.quaternion.copy(this.#q);
        this.#arrows.forEach((arrow, i) => {
            this.#q.rotateVec3(UNITS[i]!, _basis);
            arrow.update(ORIGIN, _basis, ARROW_LENGTH);
        });

        const euler = this.#mode === "euler";
        this.#axisHandle.visible = !euler; // hidden also means it can't be grabbed
        if (euler) {
            this.#axisArrow.visible = false;
        } else {
            // The arrow's length comes from the vector, so draw it from the unit axis.
            _axisDir.copy(this.#axis).normalize();
            this.#axisArrow.update(ORIGIN, _axisDir, AXIS_ARROW_LENGTH);
            this.#axisHandle.position.copy(_axisDir).multiplyScalar(AXIS_ARROW_LENGTH);
        }

        this.#gimbals.visible = euler;
        if (!euler) return;

        // Each gimbal turns about its own local axis; the nesting does the composing.
        const { x, y, z } = this.#eulerAngles;
        const [outer, middle, inner] = this.#gimbalGroups;
        outer.quaternion.copy(_turn.setFromAxisAngle(UNIT_X, x));
        middle.quaternion.copy(_turn.setFromAxisAngle(UNIT_Y, y));
        inner.quaternion.copy(_turn.setFromAxisAngle(UNIT_Z, z));

        const locked = this.#isGimbalLocked();
        this.#rings.forEach((ring, i) => {
            ring.material.color.setHex(locked ? WARN : RING_COLORS[i]!);
        });
    }

    #updateReadouts(): void {
        // Lit compares properties by identity, so every readout gets a fresh object.
        const q = this.#q;
        this.panel.quaternion = { w: q.w, x: q.x, y: q.y, z: q.z };

        const angle = q.getAxisAngle(_axis);
        this.panel.axisAngle = { axis: _axis.clone(), angle };

        this.panel.euler = q.getEulerXYZ(_euler).clone();
        this.panel.matrix = Array.from(_matrix.setFromQuaternion(q).elements);
        this.panel.gimbalLock = this.#isGimbalLocked();
    }

    unmount(scene: Scene): void {
        this.#drag?.dispose();
        this.#drag = null;
        scene.remove(this.#group);
        disposeObject(this.#group);
    }
}

export const rotationGizmoDemo: DemoInfo = {
    id: "rotation-gizmo",
    title: "Rotation gizmo",
    phase: 1,
    summary:
        "Rotate with an axis and angle (drag the gray tip to aim the axis), or switch to Euler angles and push Y to ±90° " +
        "to watch two gimbals line up.",
    create: () => new RotationGizmoDemo(),
};
```

What's new in the demo, and why:

- **Ring mesh vs. gimbal group.** A torus lies in its XY plane with its hole facing +Z. The *mesh* gets a fixed turn so each ring faces its own axis (the X ring: 90° about Y takes +Z to +X). The *group* gets the gimbal angle. Put both on one object and the fixed turn would change which axis the gimbal angle turns about.
- **The axis handle hides in Euler mode** along with the axis arrow. `DragHandle` checks `visible`, so a hidden handle can't be grabbed either.
- **`_turn` is reused** for every `setFromAxisAngle` and copied out immediately, so it can be shared.
- **`#setMode` seeds the new mode from the current `q`**, using `getEulerXYZ` / `getAxisAngle`. Switching modes never moves the box, and you're watching a round trip through your library. It calls `#updateQuaternion()` first, in case two events arrive within one frame and `#q` is stale.
- **Gimbal lock is judged on the input Y**, not the readout. The warning is about what the *sliders* can do.
- **`#rings` as a `const` tuple** lets `const [ringX, ringY, ringZ] = this.#rings` type-check without `!` or casts.
- `ring.material.color.setHex(...)` type-checks because `makeRing` returns `Mesh<TorusGeometry, MeshBasicMaterial>`, not plain `Mesh`.

**Check**

- Switch modes back and forth: the box never jumps.
- Euler mode, all zero: the three rings sit around the box, each facing its own axis.
- **The lock:** set Y to 90°. The red and blue rings become coplanar and every ring turns orange. Drag X, then drag Z: **the box makes the same motion.** The warning is showing.
- At the lock, the Euler readout shows `Z = 0°` with all the rotation in X. That's what `getEulerXYZ` promises at gimbal lock.
- Now switch to axis-angle at that same orientation and nudge the angle. Nothing special happens. The problem was in the *parameterization*, not the orientation, and that's why engines store quaternions.
- The scene graph proves `qx · qy · qz`. Temporarily add this at the end of `#updateView` (with `import { Quaternion as ThreeQuaternion } from "three"`). The two logged quaternions should match, or match with every sign flipped:

  ```ts
  console.log(inner.getWorldQuaternion(new ThreeQuaternion()), this.#q);
  ```

---

## Step 12: Finish

- [ ] Switch demos and back: nothing left behind. R resets everything, panel included.
- [ ] Space and `.` work when focus isn't in an input.
- [ ] Light and dark mode.
- [ ] A 360 px-wide window: panel readable, nothing overflows.
- [ ] Keyboard only: Tab reaches the mode buttons, sliders and axis fields, with a visible focus ring.
- [ ] `npm run typecheck` and `npm run test:run` pass.

Then tick the demo in PLAN.md, and write `docs/notes/phase-1.md`: what surprised you, and anything you'd do differently.

**Stretch ideas** (DEMOS.md §10): a slerp playground (animate between two orientations in `step`, which brings interpolation back), drag-to-rotate with `setFromUnitVectors`, and a "negate q" button.

## Questions to answer at the end

1. Why does the demo store a quaternion and derive Euler angles, rather than the reverse?
2. Why are the basis arrows and the matrix columns guaranteed to agree?
3. Why does the axis-angle readout sometimes show a different axis and angle from what you typed, while the box hasn't moved?
4. At Y = 90°, which two sliders do the same thing, and which rings show it?
5. Why did the spinning box in step 2 need interpolation, but the slider-driven box in step 8 doesn't?
6. Why does `aether-app` hold the panel as reactive state, and why must the demo pass the panel new objects?
