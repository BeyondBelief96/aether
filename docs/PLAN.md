# Aether: build plan

A 3D rigid-body physics engine written from scratch in TypeScript, plus a browser playground for poking at it. The project has two goals:

1. **Learn how physics engines work** by writing the math, integrators, collision detection and solvers by hand.
2. **Learn modern web UI** (TypeScript, Lit web components, CSS layout, Canvas and WebGL, Web Workers) by building the playground around the engine.

Each phase ends with something you can **see** (a demo) and something you can **trust** (tests). Resources for every phase are in [RESOURCES.md](./RESOURCES.md).

---

## Ground rules

These hold for every phase. Breaking them early is how hobby engines turn into unmaintainable tangles.

| Rule | Why |
|---|---|
| **The engine never imports `three` or touches the DOM.** `src/math`, `src/engine`, `src/forces`, `src/collision` and `src/constraints` are plain TypeScript. | You can unit-test the engine in Node, move it into a Web Worker later, and swap renderers. |
| **Demos are the bridge.** Only `src/demos/*` imports both the engine and Three.js. | Rendering concerns stay in one place. |
| **Fixed timestep, always.** Physics steps in equal `dt` slices; the renderer interpolates. | Stable, reproducible simulation. Variable `dt` makes springs explode and stacks jitter. |
| **TypeScript `erasableSyntaxOnly`.** No `enum`, `namespace`, parameter properties or `import x = require()`. Use `as const` objects and union types instead of enums. | The code stays "JavaScript with types", runs in Node's type stripping, and matches where TS is heading. |
| **Lit without decorators.** Use `static properties` with `declare` fields and `customElements.define`. | Closer to the web-components platform; no decorator transform needed. |
| **Write the test first for math.** Every vector, matrix and quaternion operation gets a Vitest test before it is used. | Physics bugs caused by a wrong cross product are miserable to find visually. |
| **Draw what you compute.** Every new concept gets a debug visualization: contact points, normals, AABBs, velocity arrows. | Most physics bugs are obvious once you can see them. |
| **Don't retrofit earlier phases.** Add new modules; leave old demos working. | The repo doubles as a record of how you learned it. |

### Folder layout

```
src/
  math/         Vec3, Mat3, Mat4, Quat, helpers              (Phase 1)
  engine/       loop, Particle, RigidBody, World, islands     (Phases 0, 2, 4, 7)
  forces/       gravity, drag, springs, buoyancy              (Phases 3, 4)
  collision/    shapes, AABB, broadphase, narrowphase, GJK    (Phase 5)
  constraints/  contacts, solver, joints                      (Phases 6, 7)
  demos/        one file per demo; the only engine+Three.js code
  ui/           Lit components: app shell, viewport, sidebar, panels
docs/           this plan, resources, notes
```

### Millington chapter map

The main text is Ian Millington, *Game Physics Engine Development*. Its chapters map onto the phases like this:

| Book chapter | Phase |
|---|---|
| 1 Introduction | 0 |
| 2 The Mathematics of Particles | 1 |
| 3 The Laws of Motion · 4 The Particle Physics Engine | 2 |
| 5 Adding General Forces · 6 Springs and Springlike Things · 7 Hard Constraints · 8 The Mass-Aggregate Physics Engine | 3 |
| 9 The Mathematics of Rotations | 1 (quaternions), 4 |
| 10 Laws of Motion for Rigid Bodies · 11 The Rigid-Body Physics Engine | 4 |
| 12 Collision Detection · 13 Generating Contacts | 5 |
| 14 Collision Resolution · 15 Resting Contacts and Friction | 6 |
| 16 Stability and Optimization · 17 Putting It All Together | 7 |
| 18 Other Types of Physics | 8 |

Millington resolves contacts one at a time, ordered by severity. Modern engines (Box2D, Bullet, Jolt) use **sequential impulses**, an iterative solver over all contacts. Phase 6 builds Millington's version first, then Catto's, so you can compare them.

---

## Phase 0: Scaffold and game loop ✅

**Goal:** a running app shell with a correct fixed-timestep loop, before any physics.

**Concepts:** the game loop; fixed vs variable timestep; the accumulator; interpolating render state; the "spiral of death"; `requestAnimationFrame`.

**Build**
- [x] Vite, TypeScript (strict, `erasableSyntaxOnly`), Vitest
- [x] `FixedStepLoop` in `src/engine/loop.ts`: accumulator, `alpha`, frame-time clamp, max steps per frame, pause, single-step, time scale
- [x] Lit shell: `aether-app` (owns the loop), `aether-viewport` (Three.js renderer, camera, orbit controls), `aether-sidebar` (controls and stats)
- [x] `Demo` interface (`mount` / `step` / `sync` / `unmount`) and demo registry
- [x] Keyboard shortcuts: Space pauses, `.` steps, R resets
- [x] Light and dark theme from CSS custom properties

**Tests:** `loop.test.ts` covers step counting, leftover alpha, the frame clamp, dropped time, pause, single-step and time scale.

**Demo:** *Fixed timestep*. Two orbiting balls, one interpolated and one not. At 10 Hz physics you can see why interpolation matters.

**Web skills:** Vite project setup; Lit `static properties` with `declare` fields; Shadow DOM styling; custom events up, properties down; `ResizeObserver`; CSS grid app layout.

**Done when:** the app runs, the tests pass, and you can explain why the accumulator exists.

**Stretch:** a frame-time graph in the sidebar; read the demo from the URL hash (`#timestep`).

---

## Phase 1: Math library

**Goal:** the vector, matrix and quaternion types everything else is built on.

**Concepts:** dot and cross products and what they mean geometrically; matrix multiplication order; column-major vs row-major; transforming points vs directions; quaternion rotation, composition and normalization; why not Euler angles (gimbal lock); floating-point tolerance.

**Build**
- [ ] `Vec3`: add, sub, scale, dot, cross, length, normalize, `addScaled` (`v += s·w`, used constantly by integrators), lerp, approximate equality
- [ ] `Mat3`: multiply, transpose, inverse, determinant, transform; built from a quaternion. Used for inertia tensors.
- [ ] `Mat4` (3×4 affine is enough): transform point vs direction, inverse transform. Used for body-to-world transforms.
- [ ] `Quat`: from axis-angle, multiply, normalize, rotate a vector, conjugate, `addScaledVector` (integrate an angular velocity), slerp
- [ ] API decision: mutable "in-place" methods (`v.add(w)`), pure functions (`add(out, a, b)`), or both. Recommendation: mutable methods for the hot path plus a few allocating helpers for tests and demos. Write the choice down in `src/math/README.md`.

**Tests:** identities (`a × b ⊥ a`, `|q| = 1` after normalize, `M · M⁻¹ = I`), known rotations (90° about Y maps +X to −Z), round trips (quat → mat3 → apply == quat apply). Consider property-based tests with `fast-check`.

**Demo:** *Rotation gizmo*. Sliders for axis and angle drive a quaternion; show the rotated basis vectors, the matching Euler angles, and gimbal lock when using Euler input.

**Web skills:** a reusable `<aether-slider>` component; a `<aether-vec3-input>` that emits a vector; formatting numbers in monospace for the UI.

**Done when:** every engine-facing operation is tested, and you can rotate a vector by a quaternion on paper.

---

## Phase 2: Particles and integration

**Goal:** point masses that move under forces, and a feel for how integrators differ.

**Concepts:** Newton's second law; position, velocity, acceleration; inverse mass (and why `invMass = 0` means immovable); damping; explicit Euler, semi-implicit (symplectic) Euler, velocity Verlet, RK4; energy drift and stability.

**Build**
- [ ] `Particle`: position, velocity, acceleration, `invMass`, damping, force accumulator, `integrate(dt)`
- [ ] Integrators behind a small strategy interface so a demo can switch them at runtime
- [ ] `ParticleWorld`: list of particles, `step(dt)`

**Tests:** constant acceleration matches `x = x₀ + v₀t + ½at²` within tolerance (exactly for semi-implicit Euler with small dt); `invMass = 0` never moves; a spring with semi-implicit Euler keeps energy bounded over 10,000 steps while explicit Euler grows.

**Demos**
- *Ballistics* (Millington ch. 4): pistol, artillery, fireball and laser presets.
- *Integrator shoot-out*: four mass-spring oscillators side by side, one per integrator, with a live energy graph.

**Web skills:** a hand-written `<canvas>` line chart component (no chart library): ring buffer, resizing, `devicePixelRatio`. A segmented control for choosing the integrator.

**Done when:** you can explain why games default to semi-implicit Euler, and the energy graph shows it.

---

## Phase 3: Forces, springs and mass aggregates

**Goal:** particles connected into structures: ropes, cloth, soft blobs.

**Concepts:** force generators and a force registry; drag (linear and quadratic); spring forces (Hooke's law with damping); stiff springs and why they explode; hard constraints (rods and cables) as contacts; Verlet position-based constraints (Jakobsen); a first look at XPBD.

**Build**
- [ ] `ForceGenerator` interface and `ForceRegistry`
- [ ] Gravity, drag, spring, anchored spring, bungee, buoyancy
- [ ] Particle contacts: rod, cable, ground plane; a particle contact resolver (Millington ch. 7)
- [ ] Alternative: a Jakobsen-style Verlet constraint solver; compare it with the force-based approach

**Tests:** a spring at rest length applies zero force; a rod keeps length within tolerance after N steps; buoyancy at full submersion matches the analytic force.

**Demos**
- *Bridge* (Millington's mass-aggregate bridge)
- *Rope and cloth*: drag particles with the mouse; tear the cloth if the strain is too high
- *Stiffness lab*: raise spring stiffness until it explodes; watch it stabilize at a higher physics rate

**Web skills:** pointer events and raycasting from the screen to a 3D plane to drag particles; an auto-generated parameter panel (each demo declares a parameter schema and the sidebar renders sliders and toggles from it).

**Done when:** you can drag cloth around at 60 Hz without it exploding, and explain why.

---

## Phase 4: Rigid bodies

**Goal:** bodies that rotate as well as translate.

**Concepts:** orientation as a quaternion; angular velocity and momentum; torque; the inertia tensor in body space vs world space; why to store the **inverse** inertia tensor; applying a force at a point (`τ = r × F`); D'Alembert's principle; gyroscopic effects; the "tennis racket" (Dzhanibekov) effect.

**Build**
- [ ] `RigidBody`: position, orientation, linear and angular velocity, `invMass`, `invInertiaBody`, derived `invInertiaWorld` and transform matrix, force and torque accumulators, `integrate(dt)`
- [ ] `addForceAtPoint`, `addForceAtBodyPoint`, `addTorque`
- [ ] Inertia tensors for sphere, box, cylinder and capsule; mass properties for a convex hull (Mirtich)
- [ ] `World`: bodies, force registry, `step(dt)`
- [ ] Rigid-body force generators: gravity, spring between body points, aero surfaces (Millington's flight sim)

**Tests:** a symmetric body spun about a principal axis stays on that axis; torque-free spin conserves angular momentum (check `|L|` over time); a force through the center of mass produces no rotation.

**Demos**
- *Spinning bodies*: boxes and cylinders with editable inertia; the tennis-racket flip about the intermediate axis
- *Flight sim* (Millington ch. 11): a simple aircraft with aero surfaces. It fits the aviation theme.

**Web skills:** an object inspector: click a body (Three.js `Raycaster`) to show its live state in a side panel; reactive `state: true` properties updated on a throttle; a selection outline in Three.js.

**Done when:** the tennis-racket flip appears on its own, without being scripted.

---

## Phase 5: Collision detection

**Goal:** find which bodies touch, where, and how deeply.

**Concepts:** the detection pipeline (broadphase → narrowphase → contact generation); bounding volumes (sphere, AABB, OBB); broadphase structures (uniform grid, sweep-and-prune, dynamic AABB tree / BVH); primitive tests; the separating axis theorem (SAT); support functions and Minkowski differences; GJK for distance and overlap; EPA for penetration depth; contact manifolds and clipping; persistent contacts.

**Build**
- [ ] Shapes: sphere, box, plane, capsule, convex hull. Each provides a support function and a local AABB.
- [ ] Broadphase v1: brute force O(n²), kept for testing
- [ ] Broadphase v2: sweep-and-prune or a dynamic AABB tree (Catto, GDC 2019)
- [ ] Narrowphase: sphere–sphere, sphere–plane, sphere–box, box–plane, box–box (SAT with 15 axes and clipping for the manifold)
- [ ] GJK + EPA for any pair of convex shapes
- [ ] `Contact`: point, normal, penetration, body pair; manifolds of up to 4 points
- [ ] Debug draw: AABBs, contact points, normals scaled by depth, broadphase pairs

**Tests:** each narrowphase pair against hand-computed cases (touching, separated, deep, edge–edge); GJK agrees with SAT on random box pairs; the broadphase returns a superset of the true overlapping pairs.

**Demos**
- *Collision inspector*: move two shapes with gizmos; see the separating axis, contact points and depth live
- *Broadphase heatmap*: 1,000 AABBs; show candidate pairs and timing for brute force vs your broadphase

**Web skills:** Three.js `TransformControls` for gizmos; a performance HUD using `performance.now()` with p50 and p95; CSS container queries so the inspector panel adapts to its width.

**Done when:** box–box contacts are stable and correct as you drag the boxes through each other.

---

## Phase 6: Collision response and friction

**Goal:** bodies bounce, slide, come to rest and stack.

**Concepts:** impulses and impulsive torque; the coefficient of restitution; the effective mass at a contact; resolving velocity vs resolving penetration; Coulomb friction and the friction cone (approximated as a pyramid); resting contact and micro-collisions; **sequential impulses**; accumulated impulse clamping; warm starting; Baumgarte stabilization vs split impulses vs soft constraints; the solver iteration count trade-off.

**Build**
- [ ] v1: Millington's contact resolver (ch. 14–15): resolve the worst contact first, adjust the others
- [ ] v2: a sequential-impulse solver (Catto, GDC 2006) with accumulated impulses, friction and warm starting, using persistent contact IDs from Phase 5
- [ ] Position correction: Baumgarte, then split impulses or soft step (Catto's Solver2D post compares them)
- [ ] Solver settings in the UI: iterations, Baumgarte factor, slop, warm starting on/off

**Tests:** a ball with restitution 1 returns to its drop height (within tolerance); a box on a slope stays put when `tan θ < μ`; a 10-box stack settles and drifts less than 1 cm over 10 s.

**Demos**
- *Restitution and friction lab*: balls and boxes on an adjustable ramp
- *Stacking*: towers and pyramids; toggle warm starting and watch them collapse
- *Dominoes*
- *Solver comparison*: the same scene with Millington's resolver and sequential impulses side by side

**Web skills:** save and load scenes as JSON, and share a scene in the URL hash; an undo stack for scene edits.

**Done when:** a 10-box stack stands still at 60 Hz with about 10 iterations.

---

## Phase 7: Joints, sleeping and stability

**Goal:** articulated bodies, and an engine that scales.

**Concepts:** constraints as Jacobians (Catto's "Modeling and Solving Constraints"); ball-socket, hinge, slider, distance and fixed joints; limits and motors; soft constraints (frequency and damping ratio); simulation islands (union-find); sleeping and waking; solver ordering and determinism.

**Build**
- [ ] A general constraint interface inside the sequential-impulse solver
- [ ] Joints: distance, ball-socket, hinge (with limits and a motor), fixed
- [ ] Islands via union-find over contacts and joints
- [ ] Sleeping: a velocity threshold over a time window; wake on contact or user interaction
- [ ] Profiling: time per phase (broadphase, narrowphase, solve, integrate)

**Tests:** a pendulum on a distance joint keeps its length; a hinge keeps its axis aligned; sleeping bodies don't move; a sleeping island wakes when hit.

**Demos**
- *Ragdoll*
- *Chain bridge and Newton's cradle*
- *Car* with hinge-joint wheels and motors
- *Sleep visualizer*: tint sleeping bodies; color bodies by island

**Web skills:** a Lit tree view of the scene graph; a flame-graph-style timing bar for each step.

**Done when:** 500 boxes settle, fall asleep, and the frame rate recovers.

---

## Phase 8: Stretch goals

Pick whatever interests you most.

- **Continuous collision detection (CCD):** conservative advancement or time of impact (Catto, GDC 2013). Demo: a bullet through a thin wall, with CCD off and on.
- **The engine in a Web Worker:** the simulation runs off the main thread; transforms come back through a `SharedArrayBuffer` (requires COOP/COEP headers in Vite).
- **Determinism:** same inputs, same output, bit for bit; record and replay (Box2D's determinism post).
- **XPBD solver:** Müller's extended position-based dynamics as an alternative to impulses; soft bodies and cloth.
- **Performance:** struct-of-arrays layout in `Float64Array`s; object pooling; benchmark against cannon-es.
- **WebGPU:** move rendering to `WebGPURenderer`; later, a GPU broadphase.
- **Publishing:** deploy the playground to GitHub Pages; record GIFs for the README.

---

## Working rhythm for each phase

1. Read the book chapter(s) and one or two linked resources. Take notes in `docs/notes/phase-N.md`.
2. Write tests for the math first.
3. Implement the engine side in plain TypeScript.
4. Build the demo and its debug visualization.
5. Add the phase's UI feature.
6. Write down what surprised you in the notes file, tick the boxes here, and commit.
