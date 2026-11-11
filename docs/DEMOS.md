# Building demos

How to add a demo to the demo app in `apps/editor`: the demo contract, parameters and presets, readouts, charts and callouts, using the engine from Three.js, and the drawing helpers.

A demo is one file. It describes its parameters as data and returns a running instance; the app draws every control, the transport, the readouts, the charts and the code view from that description. A demo never builds UI.

Contents:

1. [How a demo fits in](#1-how-a-demo-fits-in)
2. [Checklist for a new demo](#2-checklist-for-a-new-demo)
3. [Demo file template](#3-demo-file-template)
4. [Parameters, presets and actions](#4-parameters-presets-and-actions)
5. [Readouts, charts and callouts](#5-readouts-charts-and-callouts)
6. [Using the engine from a demo](#6-using-the-engine-from-a-demo)
7. [Drawing helpers](#7-drawing-helpers)
8. [Colour and look](#8-colour-and-look)
9. [Notes on the current demos](#9-notes-on-the-current-demos)

---

## 1. How a demo fits in

```
apps/editor/src/
  core/        framework-free: the demo contract, parameter schema, URL routes, the session
  stage/       Three.js renderer, camera, orbit controls, theme palette
  demos/       one file per demo, grouped by category; the only engine + Three.js code
  ui/          Lit components that render whatever the demo describes
```

```
 registry.ts ──▶ aether-editor ──────────────────────────────────────────────┐
 (definitions)   │ route (#/cloth?wind=14) ──▶ decodeValues ──▶ DemoSession   │
                 │                                                 │          │
                 │  every frame:  session.frame(now)               │          │
                 │                  loop.advance → instance.step(dt) 0..n     │
                 │                  instance.sync(alpha)           once       │
                 │                stage.draw(), place callouts                │
                 │  4× a second:  instance.readouts(), instance.callouts()    │
                 │                                                            │
                 │  axis-panel ── param-input ──▶ session.set ──▶ instance.update
                 │  instance-bar ── preset ──▶ morph values over 420 ms       │
                 │  values change ──▶ URL hash (only non-default values)      │
                 └────────────────────────────────────────────────────────────┘
```

The rules that keep this working:

- **The engine knows nothing about demos.** `packages/aether` never imports `three`, `lit` or anything in `apps/`. Its tsconfig has no DOM types, so a stray `window` fails to compile.
- **A demo is the bridge.** It owns engine objects and the Three.js objects that draw them. It is the only place both are imported.
- **`step(dt)` changes simulation state; `sync(alpha)` copies it onto meshes.** `step` can run 0, 1 or several times per frame; `sync` runs exactly once.
- **Parameters are data.** A demo declares a schema; the app renders it, validates input, writes it to the URL, and calls `update` with the new values. The demo never touches the DOM outside the viewport.
- **The session owns cleanup.** Everything added to `ctx.root` is removed and its GPU resources freed after the instance is discarded. `dispose` is only for things outside `root`, such as `DragHandle` listeners.
- **Reset recreates the instance** from the current parameter values. A demo doesn't need its own restart logic.

## 2. Checklist for a new demo

1. Create `apps/editor/src/demos/<category>/<name>.ts` from the [template](#3-demo-file-template). Categories are listed in `CATEGORIES` in `core/demo.ts`.
2. Add it to the array in `demos/registry.ts`, in the order its category should list it.
3. Declare the parameters that matter, with units and ranges that stay stable. Add up to four presets that show the demo's range, and a `hint` that names one thing to try.
4. Build the scene under `ctx.root`; simulate in `step`; draw in `sync`.
5. Add readouts for the numbers that prove the physics is right, and callouts for the few that belong next to a body.
6. If the simulation is non-trivial, move it into a Three.js-free module beside the demo and test it (see `forces/cloth-sim.ts`).
7. Add the demo's id to `DEMOS` in `apps/editor/scripts/smoke-test.mjs`.
8. Check it by hand:
   - Every preset, then Reset (R): it restarts cleanly with the current values.
   - Pause (Space) and step (`.`).
   - Physics rate 10 Hz: motion stays smooth, which shows interpolation works.
   - Copy the URL after changing parameters and open it in a new tab: the same state loads.
   - Light and dark mode, and a phone-width window.

## 3. Demo file template

```ts
// apps/editor/src/demos/forces/name.ts
import { Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { Particle, ParticleWorld, Vec3 } from "aether-physics";
import { defineDemo } from "../../core/demo";
import { formatNumber } from "../../core/format";
import { number } from "../../core/params";

/** <The one idea this demo shows, and what to look at.> */

const RADIUS = 0.4; // m

const _blended = new Vec3();

const params = {
    gravity: number({ label: "Gravity", min: 0, max: 20, step: 0.1, default: 9.81, unit: " m/s²" }),
};

export const nameDemo = defineDemo({
    id: "name", // used in URLs; keep it stable
    title: "Name",
    category: "forces",
    summary: "One or two sentences: what is on screen.",
    hint: "One thing to try.",
    params,
    presets: [{ label: "Moon", note: "1.62 m/s²", values: { gravity: 1.62 } }],
    camera: { position: { x: 6, y: 5, z: 8 }, target: { x: 0, y: 1, z: 0 } },
    source: "apps/editor/src/demos/forces/name.ts",
    create({ root, palette, values }) {
        const world = new ParticleWorld();
        world.gravity.set(0, -values.gravity, 0);
        const ball = new Particle();
        ball.position.set(0, 4, 0);
        world.particles.push(ball);
        const previous = new Vec3().copy(ball.position);

        const mesh = new Mesh(new SphereGeometry(RADIUS, 24, 16), new MeshStandardMaterial({ color: palette.accent }));
        root.add(mesh);

        return {
            update(next) {
                world.gravity.set(0, -next.gravity, 0);
            },
            step(dt) {
                previous.copy(ball.position);
                world.step(dt);
            },
            sync(alpha) {
                mesh.position.copy(_blended.copy(previous).lerp(ball.position, alpha));
            },
            readouts: () => [
                { title: "Ball", rows: [{ label: "Height", value: `${formatNumber(ball.position.y, 2)} m` }] },
            ],
        };
    },
});
```

`defineDemo` infers the parameter types from the schema, so `values.gravity` is a `number` and a preset with `gravity: "high"` fails to compile.

## 4. Parameters, presets and actions

Parameter kinds, from `core/params.ts`:

| Builder | Control | Value |
|---|---|---|
| `number({ label, min, max, step, default, unit?, digits?, color? })` | Axis slider with live value and range ends | `number`, clamped and snapped to `step` |
| `choice({ label, options, default })` | Joined buttons | One of the option values |
| `toggle({ label, default })` | On / Off buttons | `boolean` |
| `vec3({ label, default, nonzero?, digits? })` | Three typed inputs in axis colours | `Vec3Like` |

Every kind takes `hidden: (values) => boolean` to show a parameter only when it applies (the rotation demo hides the Euler sliders in axis–angle mode).

`update(values, changed)` receives every value and the set of keys that changed. Engine generators keep their parameters fixed, so a stiffness change usually means building new generators; check `changed` so unrelated parameters don't rebuild them.

To change a parameter from inside the demo, for example when the user drags something, call `ctx.set({ axis })`. It goes through the same validation and reaches `update` like any other change.

**Presets** are named sets of values. Picking one blends numbers and vectors over 420 ms; other kinds switch at once. A preset may also set the physics rate with `hz`. The app numbers presets 1–9 on the keyboard and marks the one that matches the current values.

**Actions** are one-shot commands, such as Fire. Declare `{ id, label, key? }` and handle them in `action(id)`.

## 5. Readouts, charts and callouts

- **Readouts:** `readouts()` returns groups of label and formatted value. It is called about four times a second while the Readouts tab is open. Format with `formatNumber` (fixed decimals, real minus sign) and include units. Mark a row `warn: true` when it shows something going wrong, like `ω·dt > 1`.
- **Charts:** declare a `ChartSpec` in `charts` (series, switchable vertical ranges, a reference line, capacity) and call `ctx.plot(id, values)` from `step`. Samples are kept while the tab is closed. Plot at a fixed rate in simulated time, not once per step, so the chart's width means the same at every physics rate.
- **Callouts:** `callouts()` returns short labels pinned to points in the scene. `at` is read every frame, so pass a live position such as `mesh.position`. Keep them to a few words and use them for the one number a viewer should watch.

Colours in all three refer to series by index (`color: 0` to `3`), so a readout, a chart line and a body share one colour.

## 6. Using the engine from a demo

### Imports

Import everything from `"aether-physics"`, never from engine files. The workspace links the package, and the `aether-source` export condition resolves it to the TypeScript source, so demos use the engine exactly as an outside user would. Anything a demo needs has to be exported from `packages/aether/src/index.ts`.

### Engine types into Three.js

The engine's `Vec3` and `Quaternion` have plain `x`, `y`, `z` (and `w`) fields, so Three.js's `copy` accepts them directly:

```ts
mesh.position.copy(vec3);
mesh.quaternion.copy(quat);
```

Watch the component order when calling `set`: Aether is `new Quaternion(w, x, y, z)`, Three.js is `quaternion.set(x, y, z, w)`. The other direction needs no conversion: engine methods take `Vec3Like` and `QuatLike`.

### Never copy matrix arrays

`Mat3x3` and `Mat3x4` are row-major; Three.js's `elements` are column-major. Copying `elements` across silently transposes the matrix. Go through position and quaternion.

### Allocation

`sync` runs every frame and `step` can run several times per frame. Don't allocate in either: use module-level scratch objects (`const _dir = new Vec3()`) and the engine's `out` parameters. Freeze constant vectors with `Object.freeze`.

### Interpolation

Save the previous state at the top of `step` and blend in `sync`: `Vec3.lerp` for positions, `Quaternion.slerpQuaternions` for orientations. A demo with no time evolution can set meshes directly in `update`.

### Substepping

A demo may advance the world several times inside one `step` to keep stiff systems stable (the cloth runs four substeps). Report the substep count in a readout so the viewer knows.

## 7. Drawing helpers

In `apps/editor/src/demos/helpers/`:

| Helper | Use |
|---|---|
| `VectorArrow` | An arrow whose length is a vector's magnitude, drawn over meshes |
| `Polyline` | A line rewritten in place without allocating, for trails |
| `SpringCoil` | A helix between two points with a fixed number of turns |
| `DragHandle` | Lets the user drag an object. Your callback receives the pointer's world-space ray; turns orbiting off during the drag. Call `dispose()` in `dispose` |
| `disposeObject` | Frees the GPU resources under an object. The session already calls it on `root` |
| `integrators` | Four one-dimensional integrators, used by the shoot-out only, so they are not part of the package |

## 8. Colour and look

Demos take every colour from `ctx.palette` (`stage/palette.ts`): `ink` for main bodies, `muted` for fixtures, `accent` for the one thing to watch, `series[0..3]` for things being compared, and `axis.x/y/z`. The palette changes with the system theme, and the app recreates the instance when it does, so never hard-code a hex value in a demo.

The app's visual system (paper and ink, one orange accent, Schibsted Grotesk and JetBrains Mono, hairline rules) is recorded in `DESIGN.md` at the repository root. Demos don't style UI; if a demo needs a control that doesn't exist, add a parameter kind to `core/params.ts` and a control to `ui/axis-panel.ts`.

## 9. Notes on the current demos

### Rotation

Axis–angle input drives the quaternion directly; Euler input drives three nested gimbal groups. `setFromEulerXYZ(x, y, z)` is `qx · qy · qz`: intrinsic X, then Y about the new Y, then Z about the newest Z, which is exactly a physical gimbal:

```
outer group                   rotates about X by x, holds the red ring
  middle group (child)        rotates about Y by y, holds the green ring
    inner group (child)       rotates about Z by z, holds the blue ring
```

The body is drawn from the quaternion, not parented to the rings, so the two can be compared. The fixed turn that makes each ring face its own axis goes on the ring mesh, because on the group it would change which axis the gimbal angle turns about. At `y = ±90°` the inner ring's axis lines up with the outer ring's, and moving X and Z produces the same motion. Switching input mode seeds the new mode from the current orientation, so the body doesn't jump.

### Ballistics

Each shot is one `Particle` in a shared `ParticleWorld`, ending at the ground, past 200 m, or after 5 s. The dashed line is the same shot with no damping, from `x₀ + v₀t + ½at²`.

- **Lower the damping.** The trail pulls away from the dashed line.
- **Change the physics rate.** Range barely changes between 30 Hz and 240 Hz, because damping is per second, not per step.
- There is no mass parameter: no force other than gravity acts on a shot, and gravity is applied as an acceleration, so mass would not change the motion.

### Integrator shoot-out

All four rows start from the same state with the same 1 kg mass and spring. The translucent ball on each row is the exact solution `A·cos(ωt)`. The chart plots `E / E₀`, where a flat line at 1 is perfect.

| Do this | You should see |
|---|---|
| Watch at the defaults | Explicit Euler climbs off the chart. The others hold |
| Range ±10% | Semi-implicit Euler swings in a steady band of about ±3% and never drifts |
| Range ±0.1% | Verlet's much smaller band appears. RK4 sits on the line |
| Coarse steps, then raise the stiffness | `ω·dt` crosses 2 and semi-implicit Euler and Verlet blow up. RK4 survives longer |

Changing the stiffness or damping model restarts the run, because `E₀` changes meaning.

### Fireworks

Rockets climb until their upward speed falls to 3 m/s, then burst. Sparks share a single `ParticleDrag`; changing drag swaps that one generator on every live spark. Removed particles go back to a pool, so a long show doesn't allocate. Bursts use a seeded random generator, so a reset replays the same show.

### Cloth

An 18 × 18 grid of particles with structural and shear links, each link a `ParticleSpring` on both ends. `WindForce` in `forces/cloth-sim.ts` is a user-written `ParticleForceGenerator`, registered alongside the springs like any built-in generator. The world is stepped four times per physics step; at 1000 N/m and 0.05 kg per particle that keeps `ω·h` well under the stability limit. `cloth-sim.test.ts` checks the cloth stays bounded across the stiffness range.
