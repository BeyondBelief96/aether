# Building demos

How to add a demo to the demo app in `apps/editor`: the demo contract, parameters and presets, readouts, charts and callouts, using the engine from Three.js, and the drawing helpers.

A demo is one file. It describes its parameters as data and returns a running instance; the app draws every control, the transport, the readouts, the charts and the code view from that description. A demo never builds UI.

**Where this is heading.** V1 in [PLAN.md](./PLAN.md#track-v-visualization-library) moves the stage, drawing helpers and parameter schema into `packages/aether-viz`, shared with Aether Lab. The engine's demos then import them from there; the demo contract below doesn't change. Lab examples are a separate thing, built on `createLab` (V2), and get their own guide.

Contents:

1. [How a demo fits in](#1-how-a-demo-fits-in)
   - [Where a demo goes](#where-a-demo-goes)
2. [Checklist for a new demo](#2-checklist-for-a-new-demo)
3. [Demo file template](#3-demo-file-template)
4. [Parameters, presets and actions](#4-parameters-presets-and-actions)
5. [Readouts, charts and callouts](#5-readouts-charts-and-callouts)
6. [Using the engine from a demo](#6-using-the-engine-from-a-demo)
7. [Drawing helpers](#7-drawing-helpers)
8. [Scene and colour](#8-scene-and-colour)
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

### Where a demo goes

Demos are grouped by what they simulate, not by which engine module or build phase they use. The categories are fixed in `CATEGORIES` in `core/demo.ts` and cover the whole roadmap; the app only shows a category once it has a demo, so adding the first demo to `joints/` makes the Joints tab appear. Each category's demos live in `demos/<category id>/`.

| Category | Folder | What belongs there | Built | Planned (from `docs/PLAN.md`) |
|---|---|---|---|---|
| Particles | `particles/` | Point masses moving under forces: projectiles, swarms, fields | Orbits, Fireworks, Ballistics, Integrators | |
| Soft bodies | `soft-bodies/` | Particles joined by springs or constraints | Cloth, Drumhead, Elastic pendulum, Springs, Bridge | Rope and cloth tearing |
| Fluids | `fluids/` | Buoyancy, drag through a medium, lift | Raft, Density column, Buoyancy | Sailing, Flight sim |
| Rigid bodies | `rigid-bodies/` | Orientation, inertia, torque, a single body's motion | Rotation | Spinning bodies |
| Collisions | `collisions/` | Detection, contacts, restitution, friction, stacking | Bounce, Break | Collision inspector, Broadphase heatmap, Restitution and friction lab, Solver comparison |
| Joints | `joints/` | Bodies held together by joints; islands and sleeping | | Newton's cradle, Chain bridge, Car, Ragdoll, Sleep visualizer |

When a demo could fit two categories, put it where its most interesting thing happens: a sailing boat is about the water, so it goes in Fluids even though the boat is a rigid body. Add a category only when a new kind of simulation arrives that none of these describe; insert it in `CATEGORIES` where it falls in the roadmap.

## 2. Checklist for a new demo

1. Create `apps/editor/src/demos/<category>/<name>.ts` from the [template](#3-demo-file-template). [Where a demo goes](#where-a-demo-goes) says which category.
2. Add it to the array in `demos/registry.ts`, in the order its category should list it.
3. Declare the parameters that matter, with units and ranges that stay stable. Add up to four presets that show the demo's range, and a `hint` that names one thing to try.
4. Build the scene under `ctx.root`; simulate in `step`; draw in `sync`.
5. Add readouts for the numbers that prove the physics is right, and callouts for the few that belong next to a body.
6. If the simulation is non-trivial, move it into a Three.js-free module beside the demo and test it (see `soft-bodies/cloth-sim.ts`).
7. Add the demo's id to `DEMOS` in `apps/editor/scripts/smoke-test.mjs`. `demos/tests/stability.test.ts` picks up every registered demo on its own and fails if any preset goes non-finite at any physics rate; if yours does, substep with `substepsFor`.
8. Tick it off in `docs/PLAN.md`.
9. Check it by hand:
   - Every preset, then Reset (R): it restarts cleanly with the current values.
   - Pause (Space) and step (`.`).
   - Physics rate 10 Hz: motion stays smooth with Smooth on, and steps visibly with it off.
   - Copy the URL after changing parameters and open it in a new tab: the same state loads.
   - Light and dark mode, and a phone-width window.

## 3. Demo file template

```ts
// apps/editor/src/demos/soft-bodies/name.ts
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
    category: "soft-bodies",
    summary: "One or two sentences: what is on screen.",
    hint: "One thing to try.",
    params,
    presets: [{ label: "Moon", note: "1.62 m/s²", values: { gravity: 1.62 } }],
    camera: { position: { x: 6, y: 5, z: 8 }, target: { x: 0, y: 1, z: 0 } },
    source: "apps/editor/src/demos/soft-bodies/name.ts",
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

### Worlds and the integrator setting

The transport strip's Integrator applies to every demo. Register each `ParticleWorld` the demo builds with `ctx.useWorld`, which sets the chosen integrator on it now and whenever the setting changes:

```ts
create({ root, values, useWorld }) {
    const world = useWorld(new ParticleWorld());
```

A world built inside a helper registers the same way (`useWorld(cloth.world)`). A demo with no world, or one that sets its own integrators like *Integrators*, doesn't call it, and the select is disabled while it is open. `demos/tests/stability.test.ts` checks that every other demo registers its worlds and runs under every integrator without throwing.

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
| `DragHandle` | Lets the user drag an object. Your callback receives the pointer's world-space ray; an optional second callback runs on release. Turns orbiting off during the drag. Call `dispose()` in `dispose` |
| `substepsFor` | How many substeps keep each one under a maximum length. Stiff demos substep by it so every physics rate the transport offers stays stable |
| `TapHandle` | Calls back with the hit when the user presses on an object, without also turning the camera. For strikes and placing things. Call `dispose()` in `dispose` |
| `disposeObject` | Frees the GPU resources under an object. The session already calls it on `root` |

## 8. Scene and colour

The stage gives every demo the same scenery: a key light with soft shadows, a ground that catches them, an environment map for materials, and fog in the ground colour so the floor fades out instead of ending. Solid, opaque meshes under `root` cast and receive shadows automatically once `create` returns; transparent ones (liquids, ghosts) don't.

Demos don't choose a renderer, lights or camera rig. They choose a camera `position` and `target` in their definition, and nothing else about the view.

### Colour and look

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

### Orbits

Two stars on a circular binary orbit and a disk of dust around them. Each star is the source of one engine `ParticleAttraction` (softened inverse-square), shared by the other star and every grain; grains pull nothing, so the cost is two registrations per grain and two generators in total. Generators keep their parameters fixed, so a change of star mass re-registers new ones. The world is stepped twice per physics step. Changing the star mass mid-run leaves the dust on orbits sized for the old mass, which is why the disk breathes and spirals after a preset.

### Integrators

The same scene four times, one `ParticleWorld` per integrator, so `world.integrator` is the only difference between lanes. The spring scene is a 1 kg mass on a `ParticleAnchoredSpring`; the orbit scene is a planet around a fixed `ParticleAttraction` source, with μ chosen so every eccentricity takes 4 s. The chart plots each lane's energy over its starting energy. A lane stops once that ratio leaves 0 to 3, which on the orbit means the planet is no longer bound; the diverging step is undone, so everything drawn stays finite. The spring's rest length is more than √3 times its stretch, so a lane reaching 3× its energy never swings through its anchor. Readouts show each integrator's force evaluations per step and its measured step time. The simulation lives in `integrators-sim.ts`, tested on its own.

### Fireworks

Rockets climb until their upward speed falls to 3 m/s, then burst. Sparks share a single `ParticleDrag`; changing drag swaps that one generator on every live spark. Removed particles go back to a pool, so a long show doesn't allocate. Bursts use a seeded random generator, so a reset replays the same show.

### Cloth

An 18 × 18 grid of particles with structural and shear links, each link a `ParticleSpring` on both ends. `WindForce` in `soft-bodies/cloth-sim.ts` is a user-written `ParticleForceGenerator`, registered alongside the springs like any built-in generator. The world is substepped so no substep is longer than 1/240 s, whatever the physics rate; at 1000 N/m and 0.05 kg per particle that keeps `ω·h` well under the stability limit. `cloth-sim.test.ts` checks the cloth stays bounded across the stiffness range.

### Drumhead

About 1,200 particles on a square grid inside a 5 m circle, each joined to its four neighbours by a `ParticleSpring` on both ends. Grid points missing a neighbour form the rim and are immovable. The springs' rest length is `spacing · (1 − tension)`, so the skin starts stretched and every spring pulls with `k · spacing · tension`; that pull, not the stiffness, sets the wave speed `√(T / spacing · spacing² / m)`. Gravity is off, and the world is substepped to 1/60 s so low physics rates stay stable. A strike adds downward velocity with a cos² falloff across the mallet. The drawn skin is a separate ring mesh whose heights are sampled bilinearly from the grid, so its edge meets the round hoop instead of following the grid's staircase.

### Elastic pendulum

One particle on a `ParticleAnchoredSpring` under gravity. The spring's frequency is `√(k/m)` and the swing's is `√(g/L)` with `L` the length the spring hangs at; when the first is twice the second the two motions trade energy. With `m = 1 kg` and a 3 m rest length that happens at `k = 3mg / L₀ ≈ 9.8 N/m`, the default. The chart splits the energy along the spring (bounce) from the energy across it (swing), both measured about the resting point. A small sideways start speed takes the path out of a single plane.

### Bridge

A rope bridge built only from contact generators: two rails of 9 particles each, fixed at both ends, joined along each rail by a `ParticleCable` and across the deck by a `ParticleRod`. *Hangers* adds a cable from a fixed anchor above each deck particle, 0.6 m longer than the drop to the deck, so the hangers near the ends stay slack. The load is not a particle: each step `bridge-sim.ts` adds its mass to the four deck particles around it, split by how far along the section it is, so gravity pulls harder there. Cables are drawn in the accent colour when within 2 mm of their length and grey when slack.

A hanging chain needs far more resolver iterations than the default of twice the contact count, which leaves the cables stretched by half a meter (*Starved*). The default is 2,000 per step. Changing *Auto iterations* or *Iterations* builds a new world around the same particles, as in *Break*. The world is substepped to 1/60 s so a heavy load stays stable at low physics rates.

### Density column

Three liquid layers and four upright prisms. Pressure from stacked liquids adds, so each object has three `ParticleBuoyancy` generators: one at the top surface with the top layer's density, and one at each lower surface with the difference between that layer and the one above it. An object inside the middle layer then gets the top density plus the difference, which is the middle density. The density sliders' ranges don't overlap, so no difference is negative. Prisms keep the generator's linear submerged fraction exact.

### Raft

Five logs as a two-layer truss: 35 log nodes and 35 deck nodes, joined along, across and diagonally within each layer and between them, so the raft resists bending without any rigid body. Only log nodes float. A crate is one particle on four springs to the corners of the deck cell under it, registered on both ends, so removing a crate removes the springs on the deck nodes too. The truss and crate springs are stiff for the lightest deck nodes, so the world is substepped to 1/600 s; that holds 20 crates of 1,500 kg on balsa at every physics rate.

### Bounce

Four particles side by side, each with its own `GroundContacts` (height = radius) so each can have its own restitution. `bounce-sim.ts` records the peak height after every bounce, and the readouts compare the ratio of successive peaks with `e²`. Lower physics rates fall short of `e²`, because a ball is caught up to one step below the ground and the resting-contact correction subtracts `e · g · dt` from each rebound; at 240 Hz the ratio is within a percent or two. Every ball comes to rest exactly on the ground. Changing the drop height drops again; changing a restitution or gravity applies on the next bounce.

### Break

A rack of touching balls and a cue ball on a table: `GroundContacts` for the top, and two generators in `break-sim.ts` for the cushions and the ball pairs (brute force, every pair). Ball pairs within 0.1 mm count as touching; racked balls start exactly touching and fall the same distance each step, so without the margin their contacts would never be generated. A square hit on a perfect rack of frictionless balls sends nearly all the energy to the back corners, so the default aim is 1° off centre.

The resolver's iteration count can't change on a live world, so changing *Auto iterations* or *Iterations* builds a new world around the same particles and registers it with `useWorld`. With a fixed budget below the contact count, the resolver spends it on the most negative separating velocities, which every step are the balls pressing into the table, so overlapping pairs that are already separating are never pushed apart (*Starved*). The readouts show the iterations used against the limit and the deepest overlap between any two balls.

