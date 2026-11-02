# Building demos

How to add a demo to the playground: how a demo plugs into the app shell, how to drive Three.js from the engine's math types, how to give a demo its own controls, and how to make the UI look like part of the same app.

The code below is **templates, not finished code**. `TODO` marks the parts left for you. The templates type-check against this repo's `tsconfig`, but until the TODOs are filled in, `noUnusedLocals` will flag the constants and fields they haven't used yet. Signatures are suggestions; change them when you have a reason, and write the reason down in your phase notes.

Contents:

1. [How a demo fits in](#1-how-a-demo-fits-in)
2. [Checklist for a new demo](#2-checklist-for-a-new-demo)
3. [Demo file template](#3-demo-file-template)
4. [Using the engine library from a demo](#4-using-the-engine-library-from-a-demo)
5. [Debug drawing helpers](#5-debug-drawing-helpers)
6. [Giving a demo its own controls](#6-giving-a-demo-its-own-controls)
7. [Reusable controls: `<aether-slider>` and `<aether-vec3-input>`](#7-reusable-controls)
8. [Making it look good](#8-making-it-look-good)
9. [Lit gotchas](#9-lit-gotchas)
10. [Worked example: the Phase 1 rotation gizmo](#10-worked-example-the-phase-1-rotation-gizmo)

---

## 1. How a demo fits in

```
                    ┌──────────────────────── aether-app ─────────────────────────┐
                    │ owns: FixedStepLoop, the current Demo, requestAnimationFrame│
                    │                                                             │
 registry.ts ──────▶│  #loadDemo(id): info.create() → demo.mount(scene, view)     │
 (DemoInfo[])       │                                                             │
                    │  every frame:                                               │
                    │    loop.advance(now, dt => demo.step(dt))   0..n times      │
                    │    demo.sync(alpha)                          once           │
                    │    viewport.draw()                           once           │
                    └──────┬──────────────────────────────────────────┬───────────┘
              properties ▼ │ ▲ events                     .scene      │
                    ┌──────┴─┴────────┐                    ┌──────────▼──────────┐
                    │ aether-sidebar  │                    │  aether-viewport    │
                    │ demo picker,    │                    │  renderer, camera,  │
                    │ loop controls,  │                    │  orbit controls,    │
                    │ stats, and the  │                    │  grid, axes, lights │
                    │ demo's panel    │                    └─────────────────────┘
                    └─────────────────┘
```

The rules that keep this working:

- **The engine knows nothing about demos.** `src/math`, `src/engine` and the other engine folders never import `three`, `lit` or anything in `src/playground/ui` or `src/playground/demos`.
- **A demo is the bridge.** It owns engine objects (bodies, quaternions, worlds) *and* the Three.js objects that draw them. It's the only place both are imported.
- **`step(dt)` changes simulation state; `sync(alpha)` copies it onto meshes.** Never touch meshes in `step`, never advance the simulation in `sync`. `step` can run 0, 1 or several times per frame; `sync` runs exactly once.
- **The viewport supplies the shared scenery.** Grid, axes, lights and camera already exist. A demo adds only its own objects, all under one `Group`, and removes them in `unmount`.
- **Properties down, events up.** The app passes state into the sidebar as properties; the sidebar reports user actions as bubbling `CustomEvent`s. Demo panels (section 6) follow the same rule.

## 2. Checklist for a new demo

1. Create `src/playground/demos/phaseN-name.ts` from the [template](#3-demo-file-template). Kebab-case, prefixed with the phase so the folder sorts in build order.
2. Export a `DemoInfo` and add it to the array in `src/playground/demos/registry.ts`, in phase order.
3. Build the scene in the constructor or `mount`, under one `Group`.
4. Put the simulation in `step(dt)`. A demo with no simulation (like the rotation gizmo) leaves `step` empty.
5. Copy state to meshes in `sync(alpha)`, interpolating if the state changes in `step`.
6. Dispose geometry and materials in `unmount`.
7. If the demo needs controls, add a panel ([section 6](#6-giving-a-demo-its-own-controls)).
8. Add debug drawing for every new concept: arrows, points, outlines.
9. Check it by hand:
   - Switch to another demo and back: nothing is left behind in the scene.
   - Press R: the demo resets cleanly.
   - Press Space, then `.`: single-stepping works.
   - Set the physics rate to 10 Hz: motion stays smooth, which shows interpolation works.
   - Check it in both light and dark mode, and at a phone-width window.

## 3. Demo file template

```ts
// src/playground/demos/phaseN-name.ts
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Scene,
} from 'three';
import { Quaternion, Vec3 } from 'aether-physics';
import type { Demo, DemoInfo } from './types';
import { disposeObject } from './helpers/three';

/**
 * Phase N: <the one idea this demo shows>.
 *
 * <What the viewer should look at, and what to change to see the effect.>
 */

// Tunables as named constants at the top, with units.
const RADIUS = 0.5; // m

// Scratch objects for sync. Module-level, reused every frame, never exported.
const _position = new Vec3();
const _orientation = new Quaternion();

class NameDemo implements Demo {
  // Simulation state: engine types only.
  #previousPosition = new Vec3();
  #position = new Vec3(0, 1, 0);
  #previousOrientation = new Quaternion();
  #orientation = new Quaternion();

  // View state: Three.js objects, all under one group.
  #group = new Group();
  #mesh: Mesh;

  constructor() {
    this.#mesh = new Mesh(
      new SphereGeometry(RADIUS, 32, 16),
      new MeshStandardMaterial({ color: 0x2bb5a0 }),
    );
    this.#group.add(this.#mesh);
  }

  mount(scene: Scene): void {
    scene.add(this.#group);
    this.sync(1);
  }

  step(dt: number): void {
    // Save the old state first so sync can blend between the two.
    this.#previousPosition.copy(this.#position);
    this.#previousOrientation.copy(this.#orientation);
    // TODO: advance the simulation by dt.
    void dt;
  }

  sync(alpha: number): void {
    _position.copy(this.#previousPosition).lerp(this.#position, alpha);
    _orientation.slerpQuaternions(this.#previousOrientation, this.#orientation, alpha);
    this.#mesh.position.copy(_position);
    this.#mesh.quaternion.copy(_orientation);
  }

  unmount(scene: Scene): void {
    scene.remove(this.#group);
    disposeObject(this.#group);
  }
}

export const nameDemo: DemoInfo = {
  id: 'name', // used in URLs later; keep it stable
  title: 'Name',
  phase: N,
  summary: 'One or two sentences: what you are looking at and what to try.',
  create: () => new NameDemo(),
};
```

Notes:

- **`id` is permanent.** Phase 0's stretch goal reads the demo from the URL hash, and Phase 7 shares scenes in the URL, so renaming an `id` breaks links.
- **`create()` must return a fresh instance.** Reset (R) calls it again, so all state has to live on the instance, not in module variables. The module-level `_scratch` objects are fine because nothing reads them between frames.
- **Keep `summary` instructional.** "Lower the physics rate to see…" teaches more than "A demo of X".

## 4. Using the engine library from a demo

### Imports

Import everything from `'aether-physics'`, never from individual folders or files:

```ts
import { Mat3x3, Quaternion, Vec3, approxEqual } from 'aether-physics';
```

`'aether-physics'` is an alias for `src/index.ts`, set under `paths` in `tsconfig.json`, and Vite reads it from there. Demos and UI use the engine exactly as an outside user would, so anything they need has to be exported from `src/index.ts`. Code inside the engine keeps its relative imports.

### Engine types into Three.js

The engine's `Vec3` and `Quaternion` have plain `x`, `y`, `z` (and `w`) fields, so Three.js's `copy` accepts them directly:

```ts
mesh.position.copy(vec3);     // Vector3.copy(v: Vector3Like)
mesh.quaternion.copy(quat);   // Quaternion.copy(q: QuaternionLike)
```

Watch the component order when you call `set` instead:

```ts
// Aether: new Quaternion(w, x, y, z)        Three.js: quaternion.set(x, y, z, w)
mesh.quaternion.set(q.x, q.y, q.z, q.w);
```

Going the other way also works without conversion: engine methods take `Vec3Like` and `QuatLike`, so `new Quaternion().copy(mesh.quaternion)` and `v.add(threeVector)` are fine.

### Never copy matrix arrays

`Mat3x3` and `Mat3x4` are **row-major**, while Three.js's `Matrix3`/`Matrix4.elements` are **column-major**. Copying `elements` across silently transposes the matrix, which inverts every rotation. Always go through position and quaternion:

```ts
// ✗ threeMatrix.elements.set(mat.elements)
// ✓
mesh.position.copy(body.position);
mesh.quaternion.copy(body.orientation);
```

If you really need a matrix (for example, a shear demo where no quaternion exists), convert it explicitly with one function in `src/playground/demos/helpers/three.ts` that has a test, rather than inline.

### Allocation

`sync` runs every frame and `step` can run several times per frame. Don't allocate in either:

```ts
// ✗ allocates three objects per arrow per frame
arrow.setDirection(new Vector3().copy(q.rotateVec3(new Vec3(1, 0, 0))));

// ✓ module-level scratch, engine `out` parameters
const _dir = new Vec3();
const _threeDir = new Vector3();
q.rotateVec3(UNIT_X, _dir);
arrow.setDirection(_threeDir.copy(_dir));
```

Constant vectors such as `UNIT_X` should be frozen, so nothing can change them by accident:

```ts
const UNIT_X: Readonly<Vec3Like> = Object.freeze({ x: 1, y: 0, z: 0 });
```

### Interpolation

Use the pattern from the template: keep `previous` and `current` state, save `previous` at the top of `step`, and blend in `sync`. Use `Vec3.lerp` for positions and `Quaternion.slerpQuaternions` for orientations. Never lerp the components of Euler angles or matrices.

A demo with no time evolution (driven only by sliders) can skip interpolation and set meshes directly in `sync`.

## 5. Debug drawing helpers

Every demo needs arrows, points and outlines, so write them once in `src/playground/demos/helpers/`. Helpers live under `demos/` because they import Three.js.

```ts
// src/playground/demos/helpers/three.ts
import { Mesh, type Material, type Object3D } from 'three';

/** Frees the GPU resources of every mesh under `root`. Call after removing it from the scene. */
export function disposeObject(root: Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.geometry.dispose();
      // TODO: materials can be an array; handle both.
      (obj.material as Material).dispose();
    }
  });
}
```

```ts
// src/playground/demos/helpers/colors.ts
/**
 * Axis colors, matching the --axis-* tokens in styles.css so a slider labelled
 * "X" is the same color as the X arrow in the viewport.
 */
export const AXIS_COLORS = {
  x: 0xe5484d,
  y: 0x46a758,
  z: 0x3e63dd,
} as const;

export const ACCENT = 0x2bb5a0;
export const WARN = 0xe8833a;
```

```ts
// src/playground/demos/helpers/vector-arrow.ts
import { ArrowHelper, Vector3 } from 'three';
import type { Vec3Like } from 'aether-physics';

const _origin = new Vector3();
const _dir = new Vector3();

/**
 * An arrow from `origin` along `vector`, with the arrow's length equal to the vector's
 * magnitude. Wraps Three.js's ArrowHelper so callers can pass engine types.
 */
export class VectorArrow extends ArrowHelper {
  /** Lengths shorter than this hide the arrow, since a zero vector has no direction. */
  static readonly MIN_LENGTH = 1e-4;

  constructor(color: number) {
    super(new Vector3(1, 0, 0), new Vector3(), 1, color);
  }

  /** Points the arrow from `origin` along `vector`. Call from sync. */
  update(origin: Vec3Like, vector: Vec3Like, scale = 1): void {
    _dir.copy(vector);
    const length = _dir.length() * scale;
    this.visible = length > VectorArrow.MIN_LENGTH;
    if (!this.visible) return;
    this.position.copy(_origin.copy(origin));
    this.setDirection(_dir.normalize());
    // TODO: scale the head with the length, clamped, so short arrows still look like arrows.
    this.setLength(length);
  }
}
```

`ArrowHelper` is not a `Mesh` (it holds a `Line` and a `Mesh`), and it already has its own `dispose()`. Make `disposeObject` call `dispose()` on any object that has one, or dispose arrows explicitly in `unmount`.

Later phases will want a few more: a `PointMarker` (a small sphere), an `AabbOutline` (`Box3Helper`), and a line batch for contacts and normals (one `LineSegments` with a preallocated `BufferAttribute`, filled every frame). Phase 5's "Debug draw data" item is the engine-side half of that last one: the engine fills a plain array, and a demo helper uploads it.

### Dragging things in the viewport

`mount` also receives a `DemoView`: the camera, the viewport element, and `setOrbitEnabled`. Demos that don't need it can leave the parameter off.

`DragHandle` (`src/playground/demos/helpers/drag-handle.ts`) builds on it. Give it the view, an object to grab, and a callback. It turns orbiting off during the drag, captures the pointer, and passes your callback the pointer's world-space `Ray`. What that ray means (a point on a plane, on a sphere) is up to the demo. It skips targets with `visible = false`, so hiding a handle also makes it impossible to grab. Call `dispose()` in `unmount`.

## 6. Giving a demo its own controls

The sidebar currently has only the loop controls. A demo needs a way to put its own sliders and readouts there. The plan does this in two stages:

| When | How | Why |
|---|---|---|
| **Phase 1** (now) | Each demo builds its own **panel element**, and the sidebar shows it. | One demo, hand-written controls. You learn how Lit components and events work before abstracting them. |
| **Phase 3** | Demos declare a **parameter schema**, and a generic panel renders it. | By then you'll have several demos with sliders and toggles, and the repetition shows you what the schema needs. Hand-written panels stay available for the rest. |

### 6.1 Shell changes (once)

**`src/playground/demos/types.ts`**: add an optional panel to `Demo`:

```ts
export interface Demo {
  // ...mount, step, sync, unmount
  /**
   * Controls and readouts for this demo, shown in the sidebar. The demo creates it,
   * listens to its events, and pushes readouts into its properties.
   */
  readonly panel?: HTMLElement;
}
```

**`src/playground/ui/aether-app.ts`**: keep the current panel in reactive state, because the demo itself isn't reactive:

```ts
static override properties = {
  // ...existing
  panel: { state: true },
};
declare panel: HTMLElement | null;
// constructor: this.panel = null;

#loadDemo(id: string): void {
  // ...existing create + mount
  this.panel = this.#demo.panel ?? null;
}

// render(): <aether-sidebar .panel=${this.panel} ...>
```

**`src/playground/ui/aether-sidebar.ts`**: render the panel as its own section, between Demo and Simulation:

```ts
import { nothing } from 'lit';

static override properties = {
  // ...existing
  panel: { attribute: false },
};
declare panel: HTMLElement | null;

// in render(), after the Demo section:
${this.panel
  ? html`<section><h2>Controls</h2>${this.panel}</section>`
  : nothing}
```

Lit can render a DOM node directly. When the app passes a new panel (after a demo switch or R), Lit swaps the node.

### 6.2 A panel component

A panel is an ordinary Lit element in `src/playground/ui/panels/`. It holds **no simulation state**: input values come in as properties, user changes go out as events, and readouts come in as properties. Use the same shape as `aether-sidebar`.

```ts
// src/playground/ui/panels/name-panel.ts
import { LitElement, css, html } from 'lit';
import { panelStyles } from '../shared-styles';
import '../controls/aether-slider';

/**
 * Controls for the <name> demo.
 *
 * Events: `strength-change` (detail: number).
 */
export class NamePanel extends LitElement {
  static override properties = {
    strength: { type: Number },
    energy: { attribute: false }, // readout, pushed in by the demo
  };

  declare strength: number;
  declare energy: number;

  static override styles = [
    panelStyles,
    css`
      /* panel-specific layout only */
    `,
  ];

  constructor() {
    super();
    this.strength = 1;
    this.energy = 0;
  }

  #emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <aether-slider
        label="Strength"
        min="0"
        max="10"
        step="0.1"
        .value=${this.strength}
        @value-change=${(e: CustomEvent<number>) => this.#emit('strength-change', e.detail)}
      ></aether-slider>
      <dl>
        <dt>Energy</dt>
        <dd>${this.energy.toFixed(2)} J</dd>
      </dl>
    `;
  }
}

customElements.define('aether-name-panel', NamePanel);

declare global {
  interface HTMLElementTagNameMap {
    'aether-name-panel': NamePanel;
  }
}
```

### 6.3 Wiring it to the demo

The demo creates the panel and wires it up in its constructor:

```ts
import '../ui/panels/name-panel';

class NameDemo implements Demo {
  readonly panel = document.createElement('aether-name-panel'); // typed via HTMLElementTagNameMap
  #strength = 1;

  constructor() {
    // ...scene setup
    this.panel.strength = this.#strength;
    this.panel.addEventListener('strength-change', (e) => {
      this.#strength = (e as CustomEvent<number>).detail;
      this.panel.strength = this.#strength; // keep the panel's input in sync
    });
  }
}
```

**Readouts.** Update readouts from `sync`, but only when a value changes. Setting a Lit property schedules a re-render, so for values that change every frame (energy, speed), throttle the updates the way `aether-app` throttles stats (`STATS_INTERVAL_MS`):

```ts
#lastReadout = 0;
sync(alpha: number): void {
  // ...meshes
  const now = performance.now();
  if (now - this.#lastReadout > 100) {
    this.#lastReadout = now;
    this.panel.energy = this.#energy();
  }
}
```

**Keyboard shortcuts.** `aether-app` ignores Space, `.` and R when the event comes from a `button`, `input`, `select` or `textarea`, and `composedPath()[0]` sees through shadow DOM. Build controls from native inputs and the shortcuts won't fire while someone is typing a value.

## 7. Reusable controls

These live in `src/playground/ui/controls/`. They know nothing about demos or the engine, take plain values, and emit `value-change`. Only types may be imported from the engine (`Vec3Like`).

### Number formatting

Write this first; every readout and control uses it.

```ts
// src/playground/ui/format/format.ts

/** Figure space: the same width as a digit in tabular fonts, used in place of a plus sign. */
const FIGURE_SPACE = ' ';
const MINUS = '−';

/**
 * Formats `value` with a fixed number of decimals and a sign column, so numbers line up
 * and don't jitter as they change: " 1.000", "−0.250".
 *
 * Values that round to zero print as " 0.000", never "−0.000".
 */
export function formatNumber(value: number, digits = 3): string {
  // TODO:
  // 1. Round to `digits` decimals (value.toFixed(digits)), then parse back with Number(),
  //    so −0.0001 becomes −0, then treat −0 as 0 (Object.is(x, -0)).
  // 2. Non-negative → FIGURE_SPACE + digits; negative → MINUS + digits of |x|.
  // 3. Non-finite values: return '—'.
  return String(value);
}

export const RAD_TO_DEG = 180 / Math.PI;
export const DEG_TO_RAD = Math.PI / 180;

/** Formats radians as degrees: " 90.0°". */
export function formatDegrees(radians: number, digits = 1): string {
  return `${formatNumber(radians * RAD_TO_DEG, digits)}°`;
}
```

Write a `format.test.ts` for it (sign column, −0, rounding, `NaN`). It's pure, so it's as easy to test as the math.

### `<aether-slider>`

A labelled range input with a live readout. Copy the look from the sidebar's existing Physics-rate slider and turn it into a component.

```ts
// src/playground/ui/controls/aether-slider.ts
import { LitElement, css, html } from 'lit';
import { live } from 'lit/directives/live.js';
import { formatNumber } from '../format/format';

/**
 * A labelled range slider with a monospace readout.
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
    color: { type: String }, // optional CSS color for the label, e.g. 'var(--axis-x)'
  };

  declare label: string;
  declare min: number;
  declare max: number;
  declare step: number;
  declare value: number;
  declare unit: string;
  declare digits: number;
  declare color: string;

  static override styles = css`
    :host {
      display: block;
    }
    label {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px;
    }
    output {
      font-family: var(--mono);
      font-variant-numeric: tabular-nums;
    }
    input {
      grid-column: 1 / -1;
      accent-color: var(--accent);
      /* TODO: width: 100%; margin: 0; */
    }
  `;

  constructor() {
    super();
    this.label = '';
    this.min = 0;
    this.max = 1;
    this.step = 0.01;
    this.value = 0;
    this.unit = '';
    this.digits = 2;
    this.color = '';
  }

  #onInput(e: Event): void {
    const value = Number((e.target as HTMLInputElement).value);
    // TODO: decide whether the slider updates this.value itself or waits for the parent
    // to pass it back. Waiting ("controlled") keeps one source of truth; the `live`
    // directive below makes either choice safe.
    this.dispatchEvent(new CustomEvent('value-change', { detail: value, bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <label>
        <span style=${this.color ? `color: ${this.color}` : ''}>${this.label}</span>
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

customElements.define('aether-slider', AetherSlider);

declare global {
  interface HTMLElementTagNameMap {
    'aether-slider': AetherSlider;
  }
}
```

Ideas to extend it with:

- Double-click the readout to type an exact value: swap the `<output>` for an `<input type="number">`.
- A `default` property and a reset button.
- An `aria-valuetext` attribute that includes the unit.

### `<aether-vec3-input>`

Three number fields labelled X, Y, Z in the axis colors. It emits a **new object** every time, never a mutated one (see [Lit gotchas](#9-lit-gotchas)).

```ts
// src/playground/ui/controls/aether-vec3-input.ts
import { LitElement, css, html } from 'lit';
import { live } from 'lit/directives/live.js';
import type { Vec3Like } from 'aether-physics';

const AXES = ['x', 'y', 'z'] as const;
type Axis = (typeof AXES)[number];

/**
 * Three numeric inputs for a vector.
 *
 * Events: `value-change` (detail: Vec3Like, a new object each time).
 */
export class AetherVec3Input extends LitElement {
  static override properties = {
    label: { type: String },
    value: { attribute: false },
    step: { type: Number },
    nonzero: { type: Boolean }, // when set, reject edits that make the zero vector
  };

  declare label: string;
  declare value: Vec3Like;
  declare step: number;
  declare nonzero: boolean;

  static override styles = css`
    :host {
      display: grid;
      gap: 4px;
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    input {
      width: 100%;
      font: inherit;
      font-family: var(--mono);
      font-variant-numeric: tabular-nums;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 6px;
    }
    .x { border-left: 3px solid var(--axis-x); }
    .y { border-left: 3px solid var(--axis-y); }
    .z { border-left: 3px solid var(--axis-z); }
  `;

  constructor() {
    super();
    this.label = '';
    this.value = { x: 0, y: 0, z: 0 };
    this.step = 0.1;
    this.nonzero = false;
  }

  #onChange(axis: Axis, e: Event): void {
    const raw = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(raw)) return;
    const next = { ...this.value, [axis]: raw };
    // TODO: if this.nonzero and `next` is the zero vector, call this.requestUpdate()
    // and return. live() then puts the current value back in the field.
    this.dispatchEvent(new CustomEvent('value-change', { detail: next, bubbles: true, composed: true }));
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
              .value=${live(String(this.value[axis]))}
              @change=${(e: Event) => this.#onChange(axis, e)}
            />
          `,
        )}
      </div>
    `;
  }
}

customElements.define('aether-vec3-input', AetherVec3Input);

declare global {
  interface HTMLElementTagNameMap {
    'aether-vec3-input': AetherVec3Input;
  }
}
```

Values go out exactly as typed, and the demo normalizes wherever it uses the vector. An input that normalizes on every edit fights the user: start from `0, 1, 0`, type `1` in X, and you get `0.707, 0.707, 0`, with neither field showing what you typed.

Don't name a property `normalize`: every DOM element already has a `normalize()` method, and TypeScript won't let a property shadow it. Watch for the same clash with names like `title`, `hidden`, `id` and `slot`.

Use `@change` (fires when the user commits a value) instead of `@input`. Otherwise, rejecting a value while someone types "0.5" would rewrite the field before they finish typing.

## 8. Making it look good

The app already has a design system: the tokens in `src/playground/styles.css` and the sidebar's styles. Making things look good mostly means reusing it consistently.

### Tokens: use them, add to them, don't hard-code

Every color in UI code is a `var(--…)`. Add tokens to `:root` in `styles.css`, with a dark-mode value next to each one:

```css
:root {
  /* existing tokens... */
  --axis-x: #d93f45;
  --axis-y: #3a8f4b;
  --axis-z: #3b5fd0;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --radius: 6px;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* existing... */
    --axis-x: #ff6b6f;
    --axis-y: #6fd17f;
    --axis-z: #7b9bff;
  }
}
```

The axis colors are the most important addition. **X is red, Y is green, Z is blue everywhere:** slider labels, input borders, viewport arrows and matrix columns. That matches Three.js's `AxesHelper`, which is already in the scene, and lets the viewer link a number to the arrow it controls without reading. Keep `src/playground/demos/helpers/colors.ts` in step with these (Three.js can't read CSS variables cheaply).

Custom properties inherit through shadow DOM, so every component sees the tokens without importing anything.

### Shared styles

Buttons, selects, `dl` readouts and section headings are currently styled inside `aether-sidebar`. Before you write the first panel, move them into a shared module so panels match the sidebar exactly:

```ts
// src/playground/ui/shared-styles.ts
import { css } from 'lit';

/** Base styles for anything shown in the sidebar: buttons, selects, readout lists. */
export const panelStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  /* TODO: move button, select, .buttons, dl/dt/dd and .warn here from aether-sidebar,
     then use static styles = [panelStyles, css\`...\`] in the sidebar and in each panel. */
`;
```

### Layout and typography rules

These are already used in the sidebar; keep using them:

| Rule | Value | Why |
|---|---|---|
| Spacing | Multiples of 4px: 4 / 8 / 12 / 16 / 20 | Even rhythm is most of what makes a UI look "designed". |
| Sections | `h2`: 11px, 600 weight, uppercase, `letter-spacing: 0.08em`, `--muted` | Labels group content without competing with it. |
| Body | 14px system font | Already set on `body`. |
| Numbers | `var(--mono)` + `font-variant-numeric: tabular-nums` + `formatNumber` | Digits don't jitter as values change, and columns line up. |
| Fixed decimals | Pick a precision per quantity and keep it | `0.5` becoming `0.4999999` on the next frame is noise. |
| Units | Always shown: `m`, `m/s`, `°`, `Hz`, `J` | A bare number is ambiguous. |
| Readouts | `<dl>` with `dt` muted on the left, `dd` right-aligned | Scannable label/value pairs. |
| Corners | 6px (`--radius`) everywhere | Consistency. |
| One accent | `--accent` for the primary button, slider fill and focus ring only | If everything is highlighted, nothing is. |
| Warnings | `--warn`, used sparingly | Use it for states such as dropped time, gimbal lock or instability. |

### States and accessibility

- **Focus:** keyboard focus must be visible. Add `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` to the shared styles.
- **Hover:** give buttons a subtle hover (`border-color: var(--muted)`). Don't make hover the only way to see something.
- **Disabled:** reduce opacity and set `cursor: default`, as the sidebar's Step button does.
- **Labels:** every input needs a visible `<label>` or an `aria-label`.
- **Native controls:** `<input type="range">`, `<select>` and `<button>` are accessible and keyboard-friendly by default. Restyle them; don't rebuild them from `<div>`s.

### Matrices and other grids of numbers

Show a 3×3 matrix as a CSS grid of monospace cells, with each column tinted by its axis color. The columns of a rotation matrix are the rotated basis vectors, so the colors match the arrows in the viewport:

```css
.matrix {
  display: grid;
  grid-template-columns: repeat(3, auto);
  justify-content: end;
  gap: 2px 12px;
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}
.matrix .c0 { color: var(--axis-x); }
.matrix .c1 { color: var(--axis-y); }
.matrix .c2 { color: var(--axis-z); }
```

### The viewport

- Keep the shared scenery (grid, axes, lights) in `aether-viewport`. Demos add only what they're about.
- Use `MeshStandardMaterial` with the axis/accent colors from `helpers/colors.ts` for real objects, and `MeshBasicMaterial` or lines for debug overlays (they shouldn't react to lighting).
- Make overlays readable: draw arrows with `depthTest: false` and a higher `renderOrder` when they would otherwise hide inside a mesh.
- Keep demo objects around the default camera target `(0, 1, 0)` at a size of about 1–5 m, so nothing needs re-framing.

### A pre-commit look test

Before committing a demo, check: light mode, dark mode, a 360px-wide window (the layout switches at 720px), keyboard-only (Tab through the controls), and 10 Hz physics.

## 9. Lit gotchas

- **Lit compares properties by identity.** If a demo mutates a `Vec3` and passes the same object back, `hasChanged` sees the same reference and **doesn't re-render**. Pass a fresh `{ x, y, z }` (or a `clone()`) to UI properties. That allocation is fine: it happens on user input or at a throttled rate, not in the physics loop.
- **Use `live()` for form values.** Without it, if the user drags a slider and the parent then sets `value` to what Lit last rendered, Lit skips the update and the input stays wherever the user left it. `live()` checks against the DOM's current value.
- **Use `.prop=` for objects and numbers, `attr=` for strings.** `.value=${v}` sets a property; `value=${v}` sets an attribute (always a string). Static numbers in templates (`min="0"`) are fine as attributes when the property declares `type: Number`.
- **Events must be `bubbles: true, composed: true`** to leave the shadow root. Without `composed`, a listener on the app never sees the event.
- **Compute derived values in `willUpdate`, not `render`.** `render` should stay a pure function of properties. If several outputs come from one expensive computation (say, Euler angles from a quaternion), do it in `willUpdate(changed)` when `changed.has('quaternion')`.
- **Use `declare` fields, and set defaults in the constructor.** With `useDefineForClassFields`, a field initializer such as `value = 0` would shadow Lit's accessor. That is why the codebase uses `declare` plus constructor assignment.
- **Clean up global listeners.** Anything added to `window` in `connectedCallback` is removed in `disconnectedCallback`, as `aether-app` does with `keydown`.
- **Keep `<dd>` and `<output>` contents short enough to stay on one line.** `panelStyles` gives them `white-space: pre`, and Prettier formats `html` templates. If it wraps the contents, the line breaks and indentation render as text, which makes the row taller and can overflow the sidebar. Build long values in a variable before the template, as `axisText` does in `gizmo-panel.ts`.

---

## 10. Worked example: the Phase 1 rotation gizmo

This demo is finished, so this section describes it rather than giving a template. The code is in `src/playground/demos/phase1-rotation-gizmo.ts` and `src/playground/ui/panels/gizmo-panel.ts`.

**Goal (from PLAN.md):** sliders for axis and angle drive a quaternion; show the rotated basis vectors and the matching Euler angles; show gimbal lock when using Euler input.

### What's on screen

**Viewport**

- A body (a box with uneven sides, so you can see its orientation) at `(0, 1, 0)`, oriented by the quaternion `q`.
- Three basis arrows (`VectorArrow` in the axis colors) from the body's center: `q.rotateVec3(UNIT_X)`, `q.rotateVec3(UNIT_Y)` and `q.rotateVec3(UNIT_Z)`.
- In axis-angle mode: a muted arrow showing the rotation axis, with a handle at its tip that you can drag to aim it.
- In Euler mode: three nested **gimbal rings** (`TorusGeometry`), shown in the diagram below.

**Panel (`<aether-gizmo-panel>`)**

- A mode switch with two buttons: Axis–angle | Euler XYZ. Switching starts the new mode from the current orientation, so the body doesn't jump.
- Inputs:
  - Axis–angle mode: `<aether-vec3-input nonzero>` and preset buttons (X, Y, Z, XYZ) for the axis, and `<aether-slider>` for the angle (−180°…180°).
  - Euler mode: three sliders X, Y, Z, labelled in axis colors. Y covers ±90°, the range `getEulerXYZ` returns, and exactly where the lock happens.
- Readouts:
  - quaternion `w, x, y, z` and `|q|`;
  - axis–angle (from `getAxisAngle`);
  - Euler XYZ in degrees (from `getEulerXYZ`);
  - the rotation matrix (from `Mat3x3.setFromQuaternion`), with columns tinted by axis;
  - a **Gimbal lock** warning when `|cos y| < 0.02`.

### Gimbal rings and why they show the lock

`setFromEulerXYZ(x, y, z)` is `qx · qy · qz`: intrinsic X, then Y about the new Y, then Z about the newest Z. That is exactly a physical gimbal:

```
outer group                  rotates about X by x, holds the red ring
  middle group (child of outer)   rotates about Y by y, holds the green ring
    inner group (child of middle) rotates about Z by z, holds the blue ring
```

The inner group ends up oriented exactly like the body, which isn't parented to it: the body is drawn from `q`, so the rings and the quaternion can be compared. Each group's quaternion is `setFromAxisAngle(axis, angle)` from your library. The fixed turn that makes a ring face its own axis goes on the ring mesh, because on the group it would change which axis the gimbal angle turns about. At `y = ±90°` the inner ring's axis lines up with the outer ring's axis. Two rings then spin about the same line, and one degree of freedom is gone. The viewer *sees* it: dragging the X and Z sliders produces the same motion. Turn the rings `--warn` orange while the lock warning is on.

Draw each ring in its axis color, with each ring slightly smaller than its parent.

### Files

```
src/playground/
  ui/
    format/
      format.ts                  formatNumber, formatDegrees (+ format.test.ts)
    shared-styles.ts             panelStyles, extracted from aether-sidebar
    controls/
      aether-slider.ts
      aether-vec3-input.ts
    panels/
      gizmo-panel.ts             <aether-gizmo-panel>
  demos/
    helpers/
      three.ts                   disposeObject
      colors.ts                  AXIS_COLORS
      vector-arrow.ts            VectorArrow
      drag-handle.ts             DragHandle
    phase1-rotation-gizmo.ts
    registry.ts                  + rotationGizmoDemo
```

### Stretch ideas

- **Slerp playground:** set two orientations and animate between them in `step` with `slerpQuaternions`. Draw the path of the X arrow's tip, and compare it with naively lerping the Euler angles. The difference is the case for quaternions.
- **Drag to rotate:** use `pointermove` on the viewport to build `setFromUnitVectors(from, to)` from a virtual trackball.
- **`q` vs `−q`:** a button that negates the quaternion. The readouts flip sign and the body doesn't move.
