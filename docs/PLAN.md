# Aether: build plan

Two products from one repository, both written from scratch in TypeScript:

- **Aether** (`aether-physics`): a 3D rigid-body physics engine for games and interactive scenes. Stable and fast at a fixed timestep. Built first.
- **Aether Lab** (working name): a simulation and visualization library for the systems in a physics course. Students and teachers declare a system, whether a double pendulum, a charged particle in a magnetic bottle or a dipole antenna, and get an accurate, instrumented 3D view of it in a few lines. Built on the engine's math once the engine is done.

They share the math library and the Three.js layer, and nothing else. They have different users, different promises (plausible at 60 Hz versus correct to a stated tolerance) and different APIs, so each gets its own package, docs and front page.

The project has four goals:

1. **Learn how physics engines work** by writing the math, integrators, collision detection and solvers by hand.
2. **Ship the engine**, `aether-physics`, as a library people can adopt.
3. **Ship the Lab**: an accurate simulation core with error control, generalized coordinates and fields, each tested against analytic solutions, with a Three.js layer so setting up a simulation never means writing a renderer.
4. **Learn modern web UI** (TypeScript, Lit web components, CSS layout, Canvas, WebGL and WebGPU, Web Workers) by building the demo app, the libraries and the site.

The work is split into three [tracks](#tracks): Track G builds the engine (Phases 0–8); Tracks S (S1–S6) and V (V1–V5) build the Lab.

Each phase ends with something you can **see** (a demo) and something you can **trust** (tests). Track G follows Millington's book in order: every phase lists what to build, step by step, where Aether differs from the book, the options with a recommendation, and what to read alongside. The full reading list is in [RESOURCES.md](./RESOURCES.md). How to build a demo (templates, using the library from Three.js, per-demo controls and UI style) is in [DEMOS.md](./DEMOS.md).

The class sketches below are starting points, not specifications. Signatures will change as you learn.

**Keep this plan current.** It is the only record of where the engine stands and what comes next. Update it in the same change as the work: tick items as they land, add generators and demos that weren't planned, and note where the build departs from a sketch. The README, website and demo app have no roadmap: they show only what exists, so a feature reaches them when it ships.

---

## Ground rules

These hold for every phase. Breaking them early is how hobby engines turn into unmaintainable tangles.

| Rule | Why |
|---|---|
| **The engine never imports `three` or touches the DOM.** `packages/aether` is plain TypeScript, type-checked without DOM types. | You can unit-test the engine in Node, move it into a Web Worker later, and swap renderers. |
| **Demos are the bridge.** Only `apps/editor/src/demos/*` imports both the engine and Three.js. Once Track V starts, `packages/aether-viz` is the second bridge, and demos move onto it. | Rendering concerns stay in one place. |
| **Fixed timestep, always.** Physics steps in equal `dt` slices; the renderer interpolates. | Stable, reproducible simulation. Variable `dt` makes springs explode and stacks jitter. |
| **TypeScript `erasableSyntaxOnly`.** No `enum`, `namespace`, parameter properties or `import x = require()`. Use `as const` objects and union types instead of enums. | The code stays "JavaScript with types", runs in Node's type stripping, and matches where TS is heading. |
| **Lit without decorators.** Use `static properties` with `declare` fields and `customElements.define`. | Closer to the web-components platform; no decorator transform needed. |
| **Write the test first for math.** Every vector, matrix and quaternion operation gets a Vitest test before it is used. | Physics bugs caused by a wrong cross product are miserable to find visually. |
| **Draw what you compute.** Every new concept gets a debug visualization: contact points, normals, AABBs, velocity arrows. | Most physics bugs are obvious once you can see them. |
| **The book's version first, behind a seam.** Each concept is built the way Millington builds it, as the first implementation behind a small interface. Production versions (Catto, Box3D) are added beside it as alternatives, never replacing it. See [Seams](#seams). | You can follow the book step by step, and every comparison demo has the book's version as its baseline. |
| **Generalize on the second implementation.** Write the first implementation so its seam is easy to see; extract the interface when the alternative arrives, not before. | Interfaces shaped by two real implementations instead of guesses. |
| **Record where Aether differs from the book.** Every phase has a *Where Aether differs from the book* list, and every new difference goes there in the same change. | The book stays usable as a guide even where the engine has moved on. |
| **The engine is a publishable library.** `packages/aether/src/index.ts` is the package entry point. Public methods accept `Vec3Like` / `QuatLike` and return engine types. Source comments are terse API docs; explanations go in `docs/`. | Users can pass `THREE.Vector3` directly, and the code reads like a library, not a tutorial. |
| **Accuracy is explicit (Track S).** Every simulation names its integrator and either a step size or an error tolerance. | A user should always know how far to trust what they see. |
| **No hidden fudges in the Lab.** No default damping, velocity clamps or softening in `aether-lab`; energy is conserved when the physics conserves it. | Game-grade tricks that keep stacks stable would quietly falsify a mechanics problem. |
| **Test against the answer (Track S).** Every Track S feature is tested against an analytic solution, and every integrator against its convergence order. | "Looks right" is the game-track standard. A teaching tool has to be right. |
| **CPU first, GPU second.** Every GPU kernel has a CPU version in `packages/aether-lab` that its tests compare against. | GPU code is hard to debug, and float32 needs a float64 reference. |

### Folder layout

```
packages/aether/src/
  index.ts      public package entry point (engine + math only)
  math/         Vec3, Mat3, Mat4, Quat, scalar helpers       (Phase 1)
  loop/         FixedStepLoop                                 (Phase 0)
  collision/    shapes, AABB, broadphase, narrowphase, GJK, EPA; no bodies   (Phase 5)
  particles/    Particle, ParticleWorld                       (Phase 2)
    integrators/  semi-implicit Euler, explicit Euler, velocity Verlet, RK4   (Phase 2 follow-up)
    forces/     gravity, drag, springs, buoyancy, attraction  (Phase 3)
    contacts/   contacts, worst-first and sequential-impulse resolvers, ground, cables and rods   (Phase 3)
    verlet/     Verlet and XPBD                               (Phase 3)
  bodies/       RigidBody, inertia, World, islands            (Phases 4, 7)
    forces/     gravity, springs, aero                        (Phase 4)
    contacts/   Collider, ContactManifold, the collision pipeline   (Phase 5)
    solver/     solver interface and settings, contact constraints, v1–v3   (Phases 6, 7)
    joints/     distance, ball-socket, hinge, fixed           (Phase 7)
packages/aether-lab/src/        Aether Lab's simulation core (planned); depends on aether-physics for math
  math/         Dual, HyperDual, small dense linear algebra   (S1, S2)
  ode/          OdeSystem, integrators, adaptive stepping, events (S1)
  mechanics/    exact N-body and rigid bodies, Lagrangian and Hamiltonian systems (S2)
  fields/       Field, charges and currents, Boris pusher, field lines, grid solvers, FDTD (S3–S5)
  analysis/     energy and momentum monitors, phase space, Poincaré sections, FFT (S2–S5)
packages/aether-gpu/   WebGPU kernels for the Lab's grid solvers and N-body (S6)
packages/aether-viz/   the Three.js layer shared by the demo app and the Lab: stage, helpers, createLab (V1–V5)
apps/editor/src/
  core/         demo contract, parameter schema, routes, session
  stage/        Three.js renderer and theme palette
  demos/        one file per demo, by category; the only engine+Three.js code
  ui/           Lit components that render each demo's description
docs/           this plan, resources, demo guide
```

Paths in the checked items of the phase checklists below are where files lived when each phase was built; the engine now lives under `packages/aether/` and the demos under `apps/editor/src/demos/`.

The engine is split by system first and by stage second. Particles and rigid bodies are separate systems with the same shape: a body type and a world, with `forces/` and `contacts/` underneath. They share `math/` and the body-agnostic geometry in `collision/`, which works on shapes and transforms and never imports a body. `loop/` is the clock the user drives; the engine never calls it. Imports run one way: `math → collision → particles` and `math → collision → bodies`, and inside `bodies/`, `forces/` and `contacts/` → `solver/` → `joints/` → `World`. Inside a system folder, file names drop the system prefix the class name carries: `particles/forces/spring.ts` exports `ParticleSpring`.

File names are lowercase kebab-case (`rigid-body.ts`), one main class per file, tests in a `tests/` folder inside each module (`bodies/tests/rigid-body.test.ts`). Each folder has an `index.ts` barrel; other modules import from the barrel, not from individual files.

### Millington chapter map

The main text is Ian Millington, *Game Physics Engine Development* (local PDF: `~/Desktop/Textbooks/Ian_Millington-Game_Physics_Engine_Development-EN.pdf`). Page numbers in this plan are the book's printed page numbers; **add 23 to get the PDF page** (printed p. 301 is PDF p. 324). Its chapters map onto the phases like this:

| Book chapter | Printed pages | Phase |
|---|---|---|
| 1 Introduction | 1–12 | 0 |
| 2 The Mathematics of Particles | 13–42 | 1 |
| 3 The Laws of Motion · 4 The Particle Physics Engine | 43–66 | 2 |
| 5 Adding General Forces · 6 Springs and Springlike Things · 7 Hard Constraints · 8 The Mass-Aggregate Physics Engine | 69–142 | 3 |
| 9 The Mathematics of Rotations | 145–191 | 1 (§9.2, §9.4), 4 (§9.1, §9.3) |
| 10 Laws of Motion for Rigid Bodies · 11 The Rigid-Body Physics Engine | 193–227 | 4 |
| 12 Collision Detection · 13 Generating Contacts | 231–297 | 5 |
| 14 Collision Resolution · 15 Resting Contacts and Friction | 301–374 | 6 |
| 16 Stability and Optimization · 17 Putting It All Together | 375–419 | 7 |
| 18 Other Types of Physics | 423–429 | 7 (as a bridge to Jacobians), 8 |
| App. A Common Inertia Tensors · B Friction Coefficients · D Mathematics Summary | 431–443 | 4 · 6 · 1 (cheat sheet) |

Each phase below has a **Resources** table: the Millington sections that phase follows, then other sources for alternatives and depth, and the Box3D files for the production version.

Millington resolves contacts one at a time, ordered by severity. Modern engines (Box2D, Bullet, Jolt, Box3D) use **sequential impulses**, an iterative solver over all contacts, and Box3D adds substeps and soft constraints. Phase 6 builds Millington's version first, then Catto's two, all three behind one `Solver` interface so demos can switch between them.

The book's code uses its own naming (`real`, `Vector3`, quaternions as `r, i, j, k`). Translate the ideas, not the identifiers: Aether uses `number`, `Vec3`, and quaternions as `x, y, z, w`.

### Box3D as the second reference

Erin Catto's [Box3D](https://github.com/erincatto/box3d) (MIT, C17, released 2026) is the modern counterpart to Millington: the same problems, solved the way Box2D v3 solves them. [BOX3D.md](./BOX3D.md) has the full side-by-side comparison, a file map by phase, and the papers behind each technique. The short version:

| | Millington | Box3D |
|---|---|---|
| Solver | Worst contact first; separate velocity and penetration passes | **Soft Step**: substepped soft sequential impulses with a relax pass |
| Position error | Nonlinear projection | Soft constraints in hertz and damping ratio |
| Friction | Per point, static and dynamic | One friction cone per manifold, plus twist and rolling friction |
| Fast motion | Not handled | Speculative contacts, then time of impact for bullets |
| Collision | Box–box SAT, primitives | Hull SAT + GJK, Quickhull, three dynamic AABB trees, persistent and recycled manifolds |
| Rotation | Quaternion, no gyroscopic term | Quaternion, implicit gyroscopic solve |
| Scale | Single-threaded, pointers | Islands for sleep, graph coloring, SIMD, handle IDs, determinism |

Each phase builds Millington's version first. Where Box3D does something meaningfully different, the phase says so in its *Where Aether differs* list or adds it as a second implementation behind the phase's seam, and the **Resources** table ends with the Box3D files to compare against.

### Seams

A seam is a small interface at a point where the book's design and production engines differ, so the book's version and later versions can run side by side and demos can switch between them, as Box2D's samples and Erin Catto's [Solver2D](https://box2d.org/posts/2024/02/solver2d/) do. Each seam appears in the phase where the book introduces its concept.

| Seam | Phase | Book's implementation (first) | Alternatives added later |
|---|---|---|---|
| `ParticleIntegrator` | 2 (follow-up) | Semi-implicit Euler with `damping^dt` (the book moves position first; see Phase 2) | Explicit Euler (the book's order), velocity Verlet and RK4 for the shoot-out; Padé damping |
| `ParticleContactResolver` | 3 | Worst-contact-first iterative resolver | Sequential impulses with warm starting (Phase 3, Step 10) |
| `Broadphase` | 5 | Brute force, then a bounding-volume hierarchy | Sweep-and-prune, the dynamic AABB tree |
| `Solver` (rigid bodies) | 6 | v1: Millington's resolver | v2: sequential impulses; v3: Box3D's Soft Step |
| Gyroscopic mode | 4 | `'none'` (the book has no gyroscopic term) | `'momentum'`, `'implicit'` |

Rules for seams:

- **Data stays separate from the algorithm** once a seam has two implementations. Contacts, manifolds and joints are data every implementation reads; the maths lives in the implementation.
- **Switching is safe between steps.** An implementation keeps only caches it can rebuild, and resets them when swapped in.
- **Every implementation passes the same tests** for the behavior they share, and comparison demos time each stage so they show cost as well as behavior.
- **Multistage integrators** (Verlet, RK4) evaluate forces more than once per step, so force generators keep no state that changes from one call to the next.

---

## Tracks

| Track | Product | Phases | What it builds | Standard |
|---|---|---|---|---|
| **G: game-grade dynamics** | Aether (`aether-physics`) | 0–8 | Particles, rigid bodies, collision, contacts, joints. Fixed timestep, stable at 60 Hz, approximate. | Stable, fast, plausible |
| **S: simulation core** | Aether Lab (`aether-lab`) | S1–S6 | ODE integrators with error control, exact mechanics in generalized coordinates, electromagnetic fields and waves. | Matches analytic solutions; convergence order tested |
| **V: visualization library** | Shared (`aether-viz`), then the Lab | V1–V5 | A Three.js layer: first the demo app's stage and helpers, then `createLab`, which binds any Lab simulation to meshes, trails, plots, field visualizers and a timeline. | Short setup: a double pendulum in about ten lines |

**Why two products.** A game engine and a scientific simulator disagree on who owns time and accuracy, and they serve different people.

| | Aether (Track G) | Aether Lab (Track S) |
|---|---|---|
| User | A developer building a game or interactive scene | A student or teacher working through a mechanics or E&M problem |
| Proof | Demos that look good and hold up when you play with them | Matching the analytic answer |
| State | Objects (`Particle`, `RigidBody`) that integrate themselves | One flat state vector `y` with `dy/dt = f(t, y)` |
| Integrator | Fixed: semi-implicit Euler, or substepped soft impulses | Pluggable: RK4, adaptive RK45, Verlet, Yoshida-4, Boris, implicit midpoint |
| Step size | Fixed `dt` tied to the render loop | Chosen by an error tolerance, independent of the render loop |
| Fudges | Damping, velocity clamps, soft contacts | None by default |
| Rendering | Interpolate between the last two steps | Sample dense output at the frame's time, or play back a recorded trajectory |

The Lab doesn't make you choose between accuracy and real time. The tolerance sets the accuracy. Real time only asks whether the solver keeps up with the playback clock, and when it can't, the Lab slows playback or precomputes the trajectory and plays it back with a scrub bar. The engine stays the right tool for contact-rich scenes (billiards, toppling, stacking, games), and the Lab's events can call into it later for collisions.

**What's shared.** The Lab depends on `aether-physics` for `Vec3`, `Mat3` and `Quaternion`, and Phase 4's inertia tensors. The package is side-effect free, so the Lab doesn't pull in the engine's worlds or solvers. If that ever stops being true, the math moves into its own package. `aether-viz` is shared from V1: the demo app moves onto it, and the Lab builds `createLab` on top of it.

**Order.** The engine comes first: Phases 3–7 as planned. Then S1 → V1 → S2 → S3 → V2 and V3 → S4 and S5 → V4 and V5 → S6. Phase 8's stretch goals stay optional and can be done between Lab phases. Nothing in Track G changes scope. Where an engine phase builds something the Lab reuses, the phase says so.

**Public surfaces.** The website and the demo app present Aether, the engine. Neither shows a roadmap or anything unbuilt. The Lab gets its own front page, at `/lab`, once S1 and V1 have shipped and there is something running to show; until then public surfaces don't mention it.

**Logo.** The strut mark (rods drawn as an A, a slack cable, an orange particle at the apex) is the favicon of the site and the demo app and stands in for the A of the wordmark in the site nav, footer and demo header. DESIGN.md has the spec.

**Architecture.**

```
packages/aether/        aether-physics, the engine: no DOM, no three       Track G
packages/aether-lab/    aether-lab, the Lab's simulation core: no DOM, no three   Track S
packages/aether-gpu/    WebGPU kernels for the Lab; CPU references live in aether-lab
packages/aether-viz/    Three.js layer; depends on both, neither depends on it    Track V
apps/editor/            the engine's demo app, moving onto aether-viz
apps/site/              the engine's website; the Lab's page and gallery at /lab (V4)
```

---

## Track G: game-grade dynamics

Phases 0–8 build Aether, the engine (`packages/aether`, published as `aether-physics`), along Millington and Box3D. Fixed timestep, stable and fast, approximate where it has to be. The Lab reuses its math library and Phase 4's inertia tensors.

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
- [x] Library entry point `src/index.ts` and `Vec3Like` in `src/math/types.ts`

**Tests:** `loop.test.ts` covers step counting, leftover alpha, the frame clamp, dropped time, pause, single-step and time scale.

**Demo:** *Fixed timestep*. Two orbiting balls, one interpolated and one not. At 10 Hz physics you can see why interpolation matters. Since retired: every demo now has a Smooth switch that turns interpolation off, which shows the same thing in any scene.

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Glenn Fiedler, [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) | All; the core is "Free the physics" and "The final touch" | The accumulator loop, the 0.25 s frame clamp, and `alpha = accumulator / dt` interpolation. This is `FixedStepLoop`. |
| Millington ch. 1 | §1.2 What Is a Physics Engine? (pp. 2–5); §1.3 Approaches to Physics Engines (pp. 5–7) | §1.3.2 *Contact Resolution* and §1.3.3 *Impulses and Forces* preview the two solver families this plan builds in Phase 6. |
| Millington ch. 1 | §1.4 The Mathematics of Physics Engines (pp. 7–10) | A self-check list: anything in §1.4.1 that feels shaky is worth reviewing before Phase 1. |
| Liam Brummitt, [Game physics from scratch](https://brm.io/game-physics-for-beginners/) | The whole link list | A map of the field. Most of its links are already placed in later phases here; skim it to see the territory. |
| [Lit reactive properties](https://lit.dev/docs/components/properties/) | JavaScript tab | `static properties` with `declare` fields, no decorators. |

More: [RESOURCES.md, Phase 0](./RESOURCES.md#phase-0-scaffold-and-game-loop)

**Done when:** the app runs, the tests pass, and you can explain why the accumulator exists.

**Stretch:** a frame-time graph in the sidebar; read the demo from the URL hash (`#timestep`).

---

## Phase 1: Math library

**Goal:** the vector, matrix and quaternion types everything else is built on.

**Concepts:** dot and cross products and what they mean geometrically; matrix multiplication order; row-major vs column-major storage; transforming points vs directions; quaternion rotation, composition and normalization; why not Euler angles (gimbal lock); floating-point tolerance.

### Build

- [x] `src/math/scalar.ts`: `EPSILON`, `approxEqual(a, b, epsilon?)`, `clamp(value, min, max)`
- [x] `src/math/geometry/vec3.ts`: `Vec3`
- [x] `src/math/geometry/mat3x3.ts`: `Mat3x3` (sketched below as `Mat3`)
- [x] `src/math/geometry/mat3x4.ts`: `Mat3x4` (3×4 affine; sketched below as `Mat4`)
- [x] `src/math/geometry/quaternion.ts`: `Quaternion` (sketched below as `Quat`), plus `QuatLike` in `types.ts`
- [x] Test helpers: custom Vitest matchers `toBeCloseToVec3`, `toBeCloseToQuat` (`src/math/tests/matchers.ts`)
- [x] Property-based tests with `fast-check` (`src/math/tests/properties.test.ts`)
- [x] Export everything from `src/math/index.ts` and `src/index.ts`
- [x] Record the API decision in `src/math/README.md`

Deferred to the phase that first uses them: `Mat3.setInertiaTensorCoeffs` (Phase 4), `Mat3.setSkewSymmetric` and `Mat3.add` (Phase 7).

**API decision.** The recommended default is mutable methods that write into `this` and return `this` for chaining (`v.add(w).scale(2)`), plus `clone()` when you need a copy. That avoids allocating in the inner loops of the solver. Keep `x`, `y`, `z` as plain public fields, not getters, so V8 can optimize them.

```ts
class Vec3 implements Vec3Like {
  x: number; y: number; z: number
  constructor(x?: number, y?: number, z?: number)
  set(x: number, y: number, z: number): this
  copy(v: Vec3Like): this
  clone(): Vec3
  add(v: Vec3Like): this
  sub(v: Vec3Like): this
  scale(s: number): this
  addScaled(v: Vec3Like, s: number): this     // this += v * s
  multiply(v: Vec3Like): this                 // component-wise
  negate(): this
  dot(v: Vec3Like): number
  cross(v: Vec3Like): this                    // this = this × v
  crossVectors(a: Vec3Like, b: Vec3Like): this
  lengthSq(): number
  length(): number
  normalize(): this                           // leaves a zero vector unchanged
  distanceTo(v: Vec3Like): number
  lerp(v: Vec3Like, t: number): this
  equals(v: Vec3Like, epsilon?: number): boolean
}

class Mat3 {
  readonly elements: Float64Array              // 9 values, row-major: m[row * 3 + col]
  identity(): this
  copy(m: Mat3): this
  setDiagonal(a: number, b: number, c: number): this
  setInertiaTensorCoeffs(ixx: number, iyy: number, izz: number, ixy?: number, ixz?: number, iyz?: number): this
  setSkewSymmetric(v: Vec3Like): this          // M · w == v × w
  setFromQuat(q: QuatLike): this
  multiply(m: Mat3): this                      // this = this · m
  multiplyMatrices(a: Mat3, b: Mat3): this
  transpose(): this
  determinant(): number
  invert(): boolean                            // false and unchanged when singular
  transformVec3(v: Vec3, out?: Vec3): Vec3     // M · v
  transformTransposeVec3(v: Vec3, out?: Vec3): Vec3
}

class Mat4 {
  readonly elements: Float64Array              // 12 values: 3×3 rotation | translation column
  setFromPositionQuat(p: Vec3Like, q: QuatLike): this
  transformPoint(p: Vec3, out?: Vec3): Vec3          // rotate + translate
  transformDirection(d: Vec3, out?: Vec3): Vec3      // rotate only
  transformInversePoint(p: Vec3, out?: Vec3): Vec3
  transformInverseDirection(d: Vec3, out?: Vec3): Vec3
  getAxis(index: 0 | 1 | 2 | 3, out: Vec3): Vec3
}

class Quat implements QuatLike {
  x: number; y: number; z: number; w: number   // identity is (0, 0, 0, 1)
  identity(): this
  setFromAxisAngle(axis: Vec3Like, radians: number): this
  multiply(q: QuatLike): this                  // this = this · q (apply q first, then this)
  premultiply(q: QuatLike): this               // this = q · this
  conjugate(): this
  normalize(): this                            // a zero quaternion becomes identity
  dot(q: QuatLike): number
  rotateVec3(v: Vec3): Vec3                    // in place
  addScaledAngularVelocity(omega: Vec3Like, dt: number): this
  slerp(q: QuatLike, t: number): this
  equalsRotation(q: QuatLike, epsilon?: number): boolean
}
```

### Guidance

- **Aliasing.** `a.cross(a)` and `m.multiply(m)` must still be correct. Read every input component into locals before writing any output.
- **No shared mutable constants.** A `static readonly ZERO = new Vec3()` will eventually get mutated by accident. Either freeze it or use factory functions.
- **Scratch temporaries.** Inside a module, reuse private `const _tmp = new Vec3()` objects instead of allocating in functions that run every step. Never export them.
- **Row-major storage, column vectors.** Store `Mat3` row-major because it matches how you write matrices on paper. Transform with `M · v`. Three.js stores column-major internally, so demos should build Three.js transforms from position + quaternion (`mesh.position.set`, `mesh.quaternion.set`) instead of copying matrix arrays.
- **Inverse of a rotation is its transpose.** `Mat4.transformInverse*` can use the transposed rotation part, as long as the rotation stays orthonormal (no scale).
- **Inertia tensor signs.** Off-diagonal entries of an inertia tensor are the *negated* products of inertia. `setInertiaTensorCoeffs` hides that so callers pass positive values.
- **Rotating a vector.** You don't need the full `q · v · q*` product. With `u = (q.x, q.y, q.z)`: `t = 2 (u × v)`, then `v' = v + w·t + u × t`.
- **Integrating angular velocity.** With world-space ω, `q̇ = ½ · (ωx, ωy, ωz, 0) · q`. So `q += ½ · dt · ω̃ · q`, then normalize. Normalize after every integration step, because drift accumulates.
- **Slerp.** If `dot(a, b) < 0`, negate one so the interpolation takes the short path. When `dot` is close to 1, fall back to normalized lerp to avoid dividing by `sin θ ≈ 0`.
- **`q` and `−q` are the same rotation.** Tests that compare quaternions should compare `|dot| ≈ 1`, not components.
- **Tolerance.** Compare floats with `approxEqual`. `EPSILON = 1e-6` is absolute for values up to about 1 and relative above that, so it works at any scale. Pass a looser epsilon in tests that accumulate many operations.

### Where Aether differs from the book

- **Quaternions are `x, y, z, w`** with identity `(0, 0, 0, 1)`; the book uses `r, i, j, k` with the real part first.
- **Names:** the book's `Matrix3` and `Matrix4` (a 3×4 affine matrix) are `Mat3x3` and `Mat3x4`.
- **Methods write into `this` and return `this`** for chaining, and accept `Vec3Like`, so callers can pass `THREE.Vector3`. The book mixes operator overloads that allocate with in-place `*=` forms.
- **Inverse transforms of a rigid `Mat3x4` use the transposed rotation** rather than a general inverse, valid while the matrix has no scale.
- **Methods arrive when first used:** `setInertiaTensorCoeffs` in Phase 4, `setSkewSymmetric` and `add` in Phase 7.

### Tests

- Identities: `a × b ⊥ a` and `⊥ b`; `a × a = 0`; `|normalize(v)| = 1`; `M · M⁻¹ = I`; `det(Mᵀ) = det(M)`.
- Known values: a 90° rotation about +Y maps +X to −Z; a 90° rotation about +Z maps +X to +Y.
- Round trips: `Mat3.setFromQuat(q).transformVec3(v)` equals `q.rotateVec3(v)`; `transformInversePoint(transformPoint(p)) = p`.
- Composition order: `(a · b).rotateVec3(v)` equals `a.rotate(b.rotate(v))`.
- Aliasing: `v.cross(v)`, `m.multiply(m)`.
- Property-based (add `fast-check` as a dev dependency): random unit quaternions preserve vector length; random invertible matrices round-trip.

Register the custom matchers in a Vitest setup file (`test.setupFiles` in `vite.config.ts`). Add a `declare module 'vitest'` augmentation so TypeScript knows about them.

**Demo:** *Rotation gizmo*. Sliders for axis and angle drive a quaternion; show the rotated basis vectors, the matching Euler angles, and gimbal lock when using Euler input. Built: `apps/editor/src/demos/rigid-bodies/rotation.ts`. What's on screen and why: [DEMOS.md, Rotation](./DEMOS.md#rotation).

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| 3Blue1Brown, [*Essence of Linear Algebra*](https://www.3blue1brown.com/topics/linear-algebra) | Chapters 1–7 and 10 | Intuition for matrices as transformations, determinants as volume scale, cross products. Watch before reading the formulas. |
| Millington ch. 2 | §2.1 Vectors (pp. 15–35), especially §2.1.1 *Handedness of Space*, §2.1.6–2.1.8 component, scalar and vector products, §2.1.9 *The Orthonormal Basis* | The `Vec3` operations and the orthonormal-basis construction you'll reuse for contact tangents in Phase 6. |
| Millington ch. 2 | §2.2 Calculus (pp. 35–42) | Skim: derivatives as rates of change, integrals as accumulation. Phase 2 builds on it. |
| Millington ch. 9 | §9.2 Orientation in Three Dimensions (pp. 152–159): Euler angles, axis–angle, rotation matrices, quaternions | Why Euler angles gimbal-lock and why engines store quaternions. Background for the rotation gizmo demo. |
| Millington ch. 9 | §9.4 Implementing the Mathematics (pp. 161–191) | §9.4.1–9.4.3 matrix classes, multiplication, inverse and transpose → `Mat3`, `Mat4`. §9.4.4 quaternion to matrix → `Mat3.setFromQuat`. §9.4.5–9.4.6 transforming vectors and changing basis. §9.4.7–9.4.11 the quaternion class, normalizing, combining, rotating, and updating by angular velocity → `Quat`. The book's 3×4 matrix is Aether's `Mat4`. |
| Song Ho Ahn, [Quaternion to Rotation Matrix](http://www.songho.ca/opengl/gl_quaternion.html) | Overview; Quaternion to Matrix; Example | A step-by-step derivation to check `setFromQuat` against. The Example (rotating (1, 2, 3) by 45° about the normalized (1, 1, 1) axis, three ways) makes a ready-made known-value test. |
| [Interactive quaternions](https://eater.net/quaternions) (Ben Eater & 3Blue1Brown) | The interactive explorable | Builds intuition for `q · v · q*` and why `q` and `−q` are the same rotation. |
| Dunn & Parberry, [*3D Math Primer*](https://gamemath.com/book/) | The chapters on matrices and orientation | A second, more careful treatment when Millington is terse. |
| Millington App. D | §D.1–D.3 Vectors, Quaternions, Matrices (pp. 438–440) | A one-page formula cheat sheet to keep open while writing tests. |
| Three.js `Vector3` / `Quaternion`; cannon-es `src/math/` | Source | API comparison only, after you've designed your own. |
| Box3D `include/box3d/math_functions.h`, `src/math_internal.h` | `b3Quat`, `b3Transform`, `b3IntegrateRotation` | A quaternion-first engine: transforms are `{p, q}` and no 3×4 matrix is stored. Compare with Aether's `Mat3x4`, and note how little matrix code Box3D needs. |
| Fabian Giesen, [Quaternion differentiation](https://fgiesen.wordpress.com/2012/08/24/quaternion-differentiation/) | All | Where `q̇ = ½ω q` comes from, and the update Box3D cites. |

More: [RESOURCES.md, Phase 1](./RESOURCES.md#phase-1-math-library)

**Done when:** every engine-facing operation is tested, and you can rotate a vector by a quaternion on paper.

---

## Phase 2: Particles and integration

**Goal:** point masses that move under forces, and a feel for how integrators differ.

**Concepts:** Newton's second law; position, velocity, acceleration; inverse mass (and why `invMass = 0` means immovable); damping; explicit Euler, semi-implicit (symplectic) Euler, velocity Verlet, RK4; energy drift and stability.

### Build

- [x] `src/engine/particle.ts`: `Particle`
- [x] `src/playground/demos/helpers/integrators.ts`: four integrators behind one function type, for the shoot-out demo only, so they are not part of the package (removed along with the shoot-out demo)
- [x] `src/engine/particle-world.ts`: `ParticleWorld`
- [x] Export from `src/engine/index.ts` and `src/index.ts`
- [x] Record the API decisions in `src/engine/README.md`

Where the build goes beyond the sketch below: gravity moved from a per-particle `acceleration` to `ParticleWorld.gravity`, which `step` adds to each movable particle as the force `gravity · gravityScale · mass`, so `Particle` knows nothing about gravity. `setMass` and `integrate` throw a `RangeError` on invalid input, a particle with `inverseMass = 0` also ignores its own velocity, and `velocityVerlet` passes `accel` an estimate of the new velocity so that it stays second order on damped systems.

```ts
class Particle {
  readonly position = new Vec3()
  readonly velocity = new Vec3()
  gravityScale = 1                        // multiple of the world's gravity
  readonly forceAccum = new Vec3()
  damping = 0.99                          // fraction of velocity kept per second
  inverseMass = 1
  setMass(mass: number): void             // Infinity sets inverseMass = 0
  get mass(): number
  hasFiniteMass(): boolean
  addForce(force: Vec3Like): void
  clearAccumulator(): void
  integrate(dt: number): void
}

interface OscillatorState { x: number; v: number }
type AccelFn = (x: number, v: number) => number
type Integrator = (state: OscillatorState, accel: AccelFn, dt: number) => void
// explicitEuler, semiImplicitEuler, velocityVerlet, rk4

class ParticleWorld {
  readonly particles: Particle[] = []
  readonly gravity = new Vec3(0, -9.81, 0)
  step(dt: number): void
}
```

#### Follow-up: the integrator seam

- [x] `src/particles/integrators/`: `ParticleIntegrator` and `ForceEvaluator`; `SemiImplicitEuler` (the default, moved out of `Particle.integrate`), `ExplicitEuler`, `VelocityVerlet`, `Rk4`
- [x] `ParticleWorld.integrator`, switchable between steps
- [x] `Particle.integrate` delegates to `SemiImplicitEuler`, so existing callers keep working
- [x] An Integrator select in the demo app's transport strip that applies to every demo's worlds, registered with `ctx.useWorld` (`apps/editor/src/core/integrators.ts`)
- [x] Demo: *Integrators* (`apps/editor/src/demos/particles/integrators.ts`), the shoot-out back on the engine: the same spring or orbit in four lanes, one per integrator, with an energy chart, force evaluations and step times

Where the build goes beyond the sketch: each integrator declares `evaluationsPerStep`. When it is more than 1, forces a caller adds with `addForce` before `ParticleWorld.step` are saved at the start of the step and restored on every evaluation, so they act as constant forces through every stage; single-evaluation integrators skip the copy, so the default path costs the same as before the seam. Damping is applied once per step, after the integrator's update, for every integrator.

**Covers:** the integrator as a seam, the first one in the engine. Multistage integrators evaluate forces several times per step, so `ForceEvaluator` reruns the force registry and gravity at a trial state: the integrator writes trial positions and velocities, calls `evaluate()`, reads `forceAccum`, and restores the state. That only works because force generators keep no per-call state (see [Seams](#seams)).

```ts
interface ForceEvaluator {
  evaluate(): void                        // clears accumulators, then runs the registry and gravity
}

interface ParticleIntegrator {
  readonly name: string
  step(particles: readonly Particle[], forces: ForceEvaluator, dt: number): void
}

class ParticleWorld {
  // ...members above
  integrator: ParticleIntegrator = new SemiImplicitEuler()
}
```

**Done when:** every Phase 2 test passes through `SemiImplicitEuler`; velocity Verlet matches `x₀ + v₀t + ½at²` exactly; RK4's error on a harmonic oscillator falls 16× when `dt` halves; and switching integrator mid-run keeps the state.

### Guidance

- **Store inverse mass.** Infinite mass becomes `0`, so you never divide by zero, and static objects fall out naturally: every `Δv = impulse · invMass` is zero.
- **`Particle.integrate` uses semi-implicit Euler:** `a = force · invMass`, where the world has already added gravity as a force, then `v += a·dt`, then `v *= damping^dt`, then `x += v·dt`, then clear the accumulator. Updating velocity *before* position is the whole difference from explicit Euler.
- **Frame-rate-independent damping.** `damping^dt` gives the same decay at 30 Hz and 120 Hz. A plain `v *= 0.99` per step does not. Box3D instead uses `v *= 1 / (1 + dt·c)`, with a damping rate `c` in 1/s: the Padé approximation of `e^(−c·dt)`, cheaper than `pow` and stable at any `dt`. Try both in the integrator shoot-out.
- **Integrators belong to the world, not the particle.** RK4 and Verlet need to evaluate forces several times per step, which a single `addForce` per step can't give them. The follow-up's `ForceEvaluator` reruns the generators at trial states instead, so every integrator works on real particles and the shoot-out runs on the engine.
- **The four update rules** (with `a(x, v)` the acceleration function):
  - Explicit Euler: `x' = x + v·dt`, `v' = v + a(x, v)·dt`, both using old values.
  - Semi-implicit Euler: `v' = v + a(x, v)·dt`, then `x' = x + v'·dt`.
  - Velocity Verlet: `x' = x + v·dt + ½·a·dt²`, `a' = a(x')`, `v' = v + ½·(a + a')·dt`. Exact only when `a` doesn't depend on `v`.
  - RK4: four derivative samples (`k1`…`k4`) weighted 1, 2, 2, 1.
- **Energy for a spring oscillator:** `E = ½·m·v² + ½·k·x²`. Plot it, not position: drift is far easier to see.
- **Order in `ParticleWorld.step`:** apply forces (Phase 3 registry), integrate every particle, then (Phase 3) generate and resolve contacts.

### Where Aether differs from the book

- **Integration order.** The book's `Particle::integrate` moves the position with the *old* velocity, then updates velocity (§3.3), which is explicit Euler for position. Aether updates velocity first (semi-implicit Euler), which keeps energy bounded. The book's order is available as `ExplicitEuler` once the integrator seam lands.
- **Gravity belongs to the world.** The book stores a constant `acceleration` on each particle (§3.2.6). Aether keeps one `ParticleWorld.gravity`, scaled per particle by `gravityScale` and added as the force `gravity · gravityScale · mass`, so `Particle` knows nothing about gravity.
- **Invalid input throws.** `setMass` rejects zero, negative and `NaN` masses, and `integrate` rejects non-positive `dt`, with a `RangeError`; the book asserts.
- **Integrators are a seam** (follow-up above); the book has a single integrator.
- **Names:** `real` is `number`, `Vector3` is `Vec3`, `getAcceleration()` and similar accessors are plain fields.

### Tests

- Constant acceleration: velocity Verlet matches `x = x₀ + v₀t + ½at²` exactly; semi-implicit Euler is off by `½·a·dt·t`. Assert both, so the test documents the difference.
- `inverseMass = 0`: the particle never moves under any force.
- `damping^dt`: after 1 s of simulation, speed is `v₀ · damping` at both 30 Hz and 120 Hz.
- Spring over 10,000 steps: semi-implicit Euler's energy stays within a bounded band; explicit Euler's grows without bound.

**Demos**
- *Ballistics* (Millington ch. 4): pistol, artillery, fireball and laser presets.
- *Integrator shoot-out*: four mass-spring oscillators side by side, one per integrator, with a live energy graph.

Built: `apps/editor/src/demos/particles/ballistics.ts`. The shoot-out has since been removed. What's on screen and why: [DEMOS.md, Ballistics](./DEMOS.md#ballistics).

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 3 | §3.2 The First Two Laws (pp. 44–50), especially §3.2.4 *Adding Mass to Particles* and §3.2.6 *The Force of Gravity* | Why store inverse mass; why gravity is applied as an acceleration rather than a force. |
| Millington ch. 3 | §3.3 The Integrator (pp. 50–54) | The update equations and damping. Note how the book handles the `½·a·dt²` term and damping, then compare with the semi-implicit Euler in the Guidance above. |
| Millington ch. 4 | §4.1 Ballistics (pp. 55–60) | Projectile presets for the *Ballistics* demo. §4.2 Fireworks (pp. 60–66) is optional. |
| Glenn Fiedler, [Integration Basics](https://gafferongames.com/post/integration_basics/) | All | Explicit Euler vs semi-implicit Euler vs RK4, with code. |
| Witkin & Baraff, *Physically Based Modeling* (SIGGRAPH '99 notes, [Stanford PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf), 287 pages) | "Differential Equation Basics" (PDF pp. 5–12): initial value problems, Euler's method, its instability, midpoint method, adaptive step sizes | The clearest explanation of *why* explicit Euler diverges. Its figures of the outward spiral are the energy-drift demo in picture form. |
| Same notes | "Particle System Dynamics" (PDF pp. 13–20): phase space, the solver interface, force objects | A clean state/derivative architecture. Read §1–4 now; the force-object part previews Phase 3. |
| Chris Hecker, [Physics, Part 1: The Next Frontier](https://www.chrishecker.com/Rigid_Body_Dynamics) (*Game Developer*, 1996) | All | Linear motion and numerical integration from first principles, written for readers with high-school calculus. The PDFs have some garbled equations. |
| Newcastle University, [Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | Tutorial 2, *Linear Motion* | The same material as course notes for a C++ engine; useful as a second explanation. |
| Ten Minute Physics ([index](https://matthias-research.github.io/pages/tenMinutePhysics/index.html)) | Ep. 01–02 | Runnable browser-based examples. |
| Florian Boesch, *Integration by Example*; Jonathan Dummer, *Time-Corrected Verlet* | All (archived; links in RESOURCES.md) | Optional: visual comparisons of Euler, Verlet and RK4, and why naive Verlet breaks with a variable `dt`. |

More: [RESOURCES.md, Phase 2](./RESOURCES.md#phase-2-particles-and-integration)

**Done when:** you can explain why games default to semi-implicit Euler, and the energy graph shows it.

---

## Phase 3: Forces, springs and mass aggregates

**Goal:** particles connected into structures: ropes, cloth, soft blobs.

**Concepts:** force generators and a force registry; drag (linear and quadratic); spring forces (Hooke's law with damping); stiff springs and why they explode; hard constraints (rods and cables) as contacts; Verlet position-based constraints (Jakobsen); a first look at XPBD.

### Build

Forces come first because they only extend the integrator you already have. Contacts come next, then the structures built from them. Position-based methods come last, so you can compare them with something that already works.

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | Force generators, the registry, gravity | Apply forces through `ParticleWorld` |
| 2 | Drag | Compare the two drag terms |
| 3 | Springs and bungees | Compare the three springs side by side |
| 4 | Buoyancy | Float a particle |
| 5 | `ParticleContact` | Resolve one contact by hand |
| 6 | Contact generators, the resolver, the ground | Rest particles on the ground |
| 7 | Cables and rods | Build the bridge |
| 8 | Verlet and XPBD | Compare position-based constraints with contacts |
| 9 | Dragging and tearing | Finish rope and cloth |
| 10 | A second contact resolver: sequential impulses | Switch resolvers live on the same scenes |

**Module dependencies.** `ParticleWorld` imports `particles/forces` and `particles/contacts` at runtime, and they need the `Particle` type from `particles/particle.ts`. Use `import type` there and the barrels never form a runtime cycle. Phases 4–7 follow the same rule with `RigidBody`.

#### Step 1: Force generators and the registry

- [x] `src/forces/particle-force-generator.ts`: `ParticleForceGenerator`
- [x] `src/forces/particle-force-registry.ts`: `ParticleForceRegistry`
- [x] `src/forces/particle-gravity.ts`: `ParticleGravity`
- [x] `ParticleWorld.step` runs the registry, then integrates
- [x] `ParticleWorld.remove` drops a particle and every generator registered on it

**Covers:** force generators. A `ParticleForceGenerator` adds a force to whichever particle it is given, so one that holds only parameters, like drag, can be shared across many particles. The registry stores each particle's generators together, so a step is two plain loops and removing a particle is one `Map.delete`. Generators run grouped by particle, in a fixed order, so runs repeat exactly.

```ts
interface ParticleForceGenerator {
  updateForce(particle: Particle, dt: number): void
}

class ParticleForceRegistry {               // Map<Particle, ParticleForceGenerator[]>
  add(particle: Particle, generator: ParticleForceGenerator): void
  remove(particle: Particle, generator: ParticleForceGenerator): boolean
  removeParticle(particle: Particle): boolean
  clear(): void
  updateForces(dt: number): void            // grouped by particle, fixed order
}

class ParticleGravity implements ParticleForceGenerator {
  constructor(gravitationalAcceleration: Vec3Like)   // force = acceleration · mass
}

class ParticleWorld {
  readonly particles: Particle[] = []
  readonly forceRegistry = new ParticleForceRegistry()
  readonly gravity = new Vec3(0, -9.81, 0)  // scaled by each particle's gravityScale
  remove(particle: Particle): boolean       // also removes its generators
  step(dt: number): void
}
```

**Done when:** `ParticleGravity` on a particle with `gravityScale = 0` gives the same trajectory as the world's built-in gravity, a particle with `inverseMass = 0` doesn't move, and removing a particle from the world leaves no generator registered on it.

#### Step 2: Drag

- [x] `src/forces/particle-drag.ts`: `ParticleDrag`

**Covers:** a force that depends on velocity.

```ts
class ParticleDrag implements ParticleForceGenerator {
  constructor(k1: number, k2: number)       // k1·|v| + k2·|v|², opposing v
}
```

**Done when:** the force at `|v| = 0` is exactly zero, not `NaN`, and a falling particle reaches the terminal speed you calculate by hand.

#### Step 3: Springs

- [x] `src/forces/particle-spring.ts`: `ParticleSpring`
- [x] `src/forces/particle-anchored-spring.ts`: `ParticleAnchoredSpring`
- [x] `src/forces/particle-bungee.ts`: `ParticleBungee`
- [x] Demo: *Springs*
- [x] Demos: *Cloth* (without tearing; see Step 9), *Drumhead*, *Elastic pendulum*

**Covers:** Hooke's law. A spring pushes only the particle it is registered on, so a spring between two moving particles is registered once on each end, each pointing at the other. Removing one end leaves the spring on the other end in place, so whoever removes a connected particle also removes the springs pointing at it.

```ts
class ParticleSpring implements ParticleForceGenerator {
  constructor(other: Particle, springConstant: number, restLength: number)
}

class ParticleAnchoredSpring implements ParticleForceGenerator {
  readonly anchor: Vec3                     // copied at construction; mutable: Step 9 drags with it
  constructor(anchor: Vec3Like, springConstant: number, restLength: number)
}

class ParticleBungee implements ParticleForceGenerator {
  constructor(other: Particle, springConstant: number, restLength: number)   // pulls only
}
```

**Done when:** a spring at rest length applies no force, the two ends of a stretched spring get equal and opposite forces, a bungee applies no force while slack, and the *Springs* demo's free pair keeps zero total momentum.

#### Step 4: Buoyancy

- [x] `src/forces/particle-buoyancy.ts`: `ParticleBuoyancy`
- [x] Demo: *Raft* (*Buoyancy* and *Density column* were built too, then cut as too close to *Raft*)

**Covers:** a force that depends on position, with three regimes: out of the water, partly submerged and fully submerged.

```ts
class ParticleBuoyancy implements ParticleForceGenerator {
  constructor(maxDepth: number, volume: number, waterHeight: number,
              liquidDensity = 1000, gravity = 9.81)
}
```

Where the build goes beyond the sketch: the constructor takes positional arguments and throws a `RangeError` on a non-positive `maxDepth`, a non-finite `waterHeight` or any negative value. Layered liquids need nothing new: register one generator per surface, with the top layer's density at the top surface and the density difference at each surface below (the cut *Density column* demo did this).

**Done when:** the force is zero above the surface, `ρ · volume · g` at full submersion, and linear in between.

#### Also built in this phase

- [x] `src/forces/particle-attraction.ts`: `ParticleAttraction`, a softened inverse-square pull toward a source particle, `m · strength · r / (|r|² + ε²)^(3/2)` with `r` pointing at the source. Not in the original plan; it came out of the *Orbits* demo.

```ts
class ParticleAttraction implements ParticleForceGenerator {
  constructor(source: Particle, strength: number, softening = 0)
}
```

#### Step 5: A single contact

- [x] `src/particles/contacts/contact.ts`: `ParticleContact`, velocity resolution first, then position, with tests
- [x] `Particle.lastAcceleration`: the acceleration `integrate` actually applied, before it clears the accumulator
- [x] The resting-contact correction inside `ParticleContact`, using `lastAcceleration` and `dt`

**Covers:** separating velocity, restitution, position correction split by inverse mass, and the resting-contact correction. `Particle` needs the new field because `forceAccum` is already clear by the time contacts run.

```ts
class ParticleContact {
  particleA!: Particle                      // filled by set() before the contact is resolved
  particleB: Particle | null = null         // null: immovable scenery
  readonly normal = new Vec3()              // unit, from particleB toward particleA
  penetration = 0                           // meters; negative is a gap
  restitution = 0

  set(a: Particle, b: Particle | null, normal: Vec3Like, penetration: number, restitution: number): this
  separatingVelocity(): number              // (vA − vB) · normal
  resolve(dt: number): void                 // resolveVelocity, then resolveInterpenetration
}
```

Where the build goes beyond the sketch: `ParticleWorld.step` records `lastAcceleration` too, from the integrator's last force evaluation, just before it clears the accumulators. For semi-implicit and explicit Euler that is the acceleration the step applied; for velocity Verlet and RK4 it is the acceleration at (or near) the end of the step.

**Done when:** two equal masses with `e = 1` swap velocities, a heavy and a light particle separate in proportion to inverse mass, `particleB === null` works, two immovable particles do nothing, and a particle resting on a contact with `e = 0.5` doesn't hop.

#### Step 6: Generators, the resolver and the ground

- [x] `src/particles/contacts/contact-generator.ts`: `ParticleContactGenerator`
- [x] `src/particles/contacts/contact-resolver.ts`: `ParticleContactResolver`
- [x] `src/particles/contacts/ground-contacts.ts`: `GroundContacts`
- [x] `ParticleWorld.step` becomes forces → integrate → generate → resolve, over a preallocated contact array
- [x] Demos: *Bounce* (restitution, rebound ratios against `e²`, resting contact) and *Break* (a rack broken by a cue ball, with the resolver's iteration budget as a parameter), the first in the Contacts category

**Covers:** the split between finding contacts and resolving them, and iteration, since resolving one contact disturbs its neighbors. Resolving one contact's interpenetration changes the penetration of every other contact that shares a particle, so the resolver adjusts those contacts by how far each particle moved before the next iteration, as the book's source does with `particleMovement`.

This class is the first implementation behind the resolver seam. Code that reaches it through `ParticleWorld.contactResolver` calls only `resolveContacts`, so Step 10 can extract the interface without changing callers; anything else on the class is read by whoever constructed it.

```ts
interface ParticleContactGenerator {
  // Fills out[start...] and returns how many it wrote. out.length is the limit.
  addContacts(out: ParticleContact[], start: number): number
}

class ParticleContactResolver {
  constructor(iterations: number)
  resolveContacts(contacts: ParticleContact[], count: number, dt: number): void
}

class GroundContacts implements ParticleContactGenerator {
  constructor(particles: Particle[], height?: number, restitution?: number)
}

class ParticleWorld {
  // ...Step 1 members
  readonly contactGenerators: ParticleContactGenerator[] = []
  constructor(options?: { maxContacts?: number })
}
```

Where the build goes beyond the sketch:

- The resolver measures each particle's movement from its position before and after `resolve`, so `ParticleContact` stores nothing for it. It adjusts the penetration of every other contact sharing a moved particle and sets the resolved contact's own penetration to exactly zero, so rounding never leaves it selectable.
- The resolver skips contacts whose particles are all immovable, treats closing speeds and penetrations under 1e-9 as resolved, and stops early once nothing qualifies.
- `new ParticleContactResolver()` without `iterations` uses twice the contact count on each call. Its surface beyond `resolveContacts` is the read-only `iterations`, `iterationsUsed` and `iterationLimit` (the limit the last call allowed, so callers never repeat the default; before the first call, `iterations` or 0). These are read from the resolver instance, not through the world: the demos' `ResolverBudget` keeps the resolver it installs and reads them there.
- `ParticleWorld` takes `ParticleWorldOptions`: `maxContacts` defaults to 256. The world starts with a default `ParticleContactResolver`; a different budget is a different resolver assigned to `contactResolver`. The pool and the last step's count are readable as `contacts` and `contactCount`, for debug drawing, and the resolver is `contactResolver`, which can be replaced between steps, as `integrator` can; that is how the demos change the iteration budget.
- `GroundContacts` reads its particle array each call, so passing `world.particles` follows additions and removals. It skips immovable particles, and its restitution defaults to 0.2.

**Known limit: contacts are found once per step.** Resolving one contact can push a particle into something it had no contact with when the step began, and nothing corrects that until the next step. A stack of bouncing spheres shows it: when the bottom ball lifts off the ground, the ball above pushes it back into the ground with no ground contact to stop it, and the stack sinks and boils. The *Break* demo stays in one layer for this reason. Contact margins and generating contacts again inside the resolver are the usual fixes; Step 10's resolver and Phase 5's persistent manifolds address it. A related trap in user generators: two resting spheres that fall the same distance in a step stay exactly touching, so a generator that reports only overlaps misses their contact every other step. The demos' sphere generator counts pairs within 0.1 mm as touching.

**Done when:** a particle on `GroundContacts` keeps near-zero velocity for 1,000 steps, and running out of `maxContacts` drops contacts without crashing. Pick contacts with a negative separating velocity *or* remaining penetration, or a slow overlap never gets pushed out.

#### Step 7: Cables, rods and the bridge

- [x] `src/particles/contacts/cable.ts`: `ParticleCable`
- [x] `src/particles/contacts/rod.ts`: `ParticleRod`
- [x] Demo: *Bridge* (a rope bridge of rail cables and cross rods with optional hangers, a load that crosses it, and the resolver's iteration budget as a parameter)
- [x] Demo: *Pendulums* (a rod and a cable pendulum kicked at the same speed: the cable goes slack between `√(2gL)` and `√(5gL)`, and the rod loops from `√(4gL)`)
- [x] Demo: *Frames* (a tetrahedron, prism and cube built from rods alone, dropped spinning onto the ground; without bracing the prism and cube fold)

**Covers:** hard constraints written as contact generators, so structures need no new solver.

```ts
class ParticleCable implements ParticleContactGenerator {
  constructor(a: Particle, b: Particle, maxLength: number, restitution?: number)
}

class ParticleRod implements ParticleContactGenerator {
  constructor(a: Particle, b: Particle, length: number)
}
```

Where the build goes beyond the sketch:

- Both extend `ParticleLink` (`src/particles/contacts/link.ts`), an abstract generator holding `particleA`, `particleB` and `currentLength()`. It owns `addContacts`: each subclass supplies only `deviation(length)` (positive to pull together, negative to push apart, zero for no contact) and an abstract `restitution` (the cable's settable field; the rod's fixed 0), and the base skips a full pool, coincident particles and NaN. It isn't exported yet; export it when users need their own links.
- A link's contact normal is the direction `particleA` is pushed: toward `particleB` when the link pulls them together, away from it when a rod pushes them apart. `ParticleContact.normal` is documented that way now, not as "from B toward A".
- Constructors throw `RangeError` for the same particle at both ends, a non-positive or non-finite length, or a cable restitution outside [0, 1]. Cable restitution defaults to 0. A rod writes nothing for coincident particles, since there is no direction to push along, and nothing at exactly its length.
- `maxLength`, `restitution` and `length` are public and mutable; the *Bridge* demo's slack slider sets `maxLength`.

**What the bridge shows about the resolver.** A hanging chain of hard constraints is the worst case for worst-first resolution: each iteration fixes one link and disturbs its two neighbours, so error spreads along the chain one link per iteration. With 8 sections (about 23 contacts), the default budget of twice the contact count lets single cables stretch by up to 0.4 m (up to 0.9 m along a rail) and the deck hang about a meter deeper while a 60 kg load crosses, and it never settles. 2,000 iterations per step (about 90 per contact) keeps every cable within about a millimetre, holds rods to under 0.1 mm and settles a 150 kg load to within 2 mm per step. The demo substeps to at most 1/60 s so low physics rates stay stable. Step 10's sequential impulses with warm starting is the fix; the bridge's iteration readout is the baseline to compare against.

**Done when:** a cable does nothing while slack, a rod keeps its length within tolerance under gravity, and the bridge sags and settles under a moving load.

#### Step 8: Verlet and XPBD

- [ ] `src/particles/verlet/verlet-system.ts`: `VerletSystem`, a Jakobsen-style position-based system
- [ ] `compliance` on each stick, for XPBD

**Covers:** velocity held implicitly in two positions, constraints that move positions directly, and compliance as a stiffness that doesn't depend on iteration count. This is a separate system, not a mode of `Particle`.

```ts
class VerletPoint {
  readonly position = new Vec3()
  readonly previous = new Vec3()
  inverseMass = 1
}

interface VerletStick {
  a: VerletPoint; b: VerletPoint
  restLength: number
  compliance: number                        // m/N. 0 is rigid
  lambda: number                            // reset at the start of each step
}

class VerletSystem {
  readonly points: VerletPoint[] = []
  readonly sticks: VerletStick[] = []
  readonly gravity = new Vec3()
  iterations = 8
  step(dt: number): void                    // integrate, then iterate the sticks
}
```

**Done when:** a stick with zero compliance holds its length under gravity, an unconstrained point follows the same arc as a `Particle`, and with converged iterations a compliant stick's stretch barely changes between 20 and 40 iterations.

#### Step 9: Dragging, rope and cloth

- [ ] Pointer dragging: cast a ray onto the plane through the point facing the camera
- [ ] Holding a `Particle`: pull it with `ParticleAnchoredSpring`
- [ ] Optional `damping` along the spring axis on `ParticleSpring` and `ParticleAnchoredSpring`, so rope and cloth settle without slowing as a whole
- [ ] Holding a `VerletPoint`: set `inverseMass = 0` while held and move it toward the pointer each step, since a `VerletSystem` has no force accumulator
- [ ] Demo: *Rope and cloth*, with tearing when a stick's strain is too high

**Covers:** moving something through the simulation rather than teleporting it, in both the force-based and position-based forms, and removing a constraint at runtime.

**Done when:** you can drag the cloth at 60 Hz without it exploding, and explain which of the three methods from this phase made that possible.

#### Step 10: A second contact resolver

- [ ] Extract `ParticleContactResolver` as an interface; Step 6's class becomes `WorstFirstContactResolver`
- [ ] Move the resolution maths out of `ParticleContact` into `WorstFirstContactResolver`, so the contact is data both resolvers read
- [ ] `src/particles/contacts/sequential-impulse-resolver.ts`: `SequentialImpulseResolver`: effective mass per contact, accumulated impulses clamped at zero, a restitution threshold, Baumgarte position correction, warm starting by contact `id`
- [ ] `ParticleWorld.contactResolver` typed by the extracted interface (it is already replaceable between steps); a resolver selector and step timings in the *Bridge* and *Rope and cloth* demos

**Covers:** the seam's second implementation, and the first look at the solver family Phase 6 builds for rigid bodies. For particles the effective mass is just `1 / (wA + wB)`, so the algorithm is visible without the angular terms.

```ts
interface ParticleContactResolver {
  readonly name: string
  resolveContacts(contacts: ParticleContact[], count: number, dt: number): void
  reset(): void                             // called when swapped in: drop cached impulses
}

class ParticleContact {
  // ...Step 5 members
  id = 0                                    // set by the generator; stable across steps for warm starting
  normalImpulse = 0                         // accumulated by SequentialImpulseResolver
}
```

**Done when:** every Step 5–7 behavior test passes under both resolvers, the bridge and the resting particle behave under both, switching resolvers mid-run keeps the scene valid, and the demo shows where each one is better.

#### Finishing up

- [ ] Export from the `particles` barrels (`forces/`, `contacts/`, `verlet/`) and `src/index.ts`

### Guidance

- **Generators** add force and nothing else. Skip particles with `inverseMass === 0` so gravity doesn't need a special case.
- **Drag:** `F = −v̂ · (k₁|v| + k₂|v|²)`. Guard `|v| = 0`.
- **Spring between two particles:** with `d = pₐ − p_b`, `F = −k·(|d| − L)·d̂`. Add a damping term `−c·((vₐ − v_b)·d̂)·d̂`, or a stiff spring rings forever. Apply equal and opposite forces, or register the generator once per end.
- **Bungee** is a spring that only pulls: no force when `|d| < L`.
- **Buoyancy:** depth below the surface, `maxDepth` and `volume` give a submerged fraction; the force is `fraction · ρ · volume · g` upward.
- **Stiffness limit.** Semi-implicit Euler is stable for a spring only while `ω·dt < 2`, with `ω = √(k/m)`. The Phase 2 integrator shoot-out shows the explosion happening right at that line. That's why a higher physics rate helps.
- **Contact resolution (velocity):** separating velocity `vₛ = (vₐ − v_b)·n`. If `vₛ > 0` they're already separating. Otherwise the target is `vₛ' = −e·vₛ`, the impulse is `(vₛ' − vₛ) / (invMₐ + invM_b)`, and each particle gets `Δv = impulse · invM · ±n`.
- **Resting contact.** A particle resting on the ground picks up `a·dt` of downward velocity each step, which then bounces. Subtract the separating velocity caused by the last step's acceleration before applying restitution.
- **Contact resolution (position):** move each particle out of penetration along `n`, split in proportion to inverse mass.
- **Resolver loop:** each iteration, resolve the contact with the most negative separating velocity, then repeat, up to `iterations` times. Resolving one contact changes the others, so iteration count matters.
- **Cable** generates a contact only when stretched past its length (restitution allowed). **Rod** generates one whenever length ≠ L, with restitution 0 and the normal flipped when compressed.
- **Verlet alternative:** store `previous` position; `x' = 2x − x_prev + a·dt²`. Then iterate constraints: for each stick, move both ends toward rest length, weighted by inverse mass. Velocity is implicit, so constraints can't inject energy the way stiff springs do.
- **XPBD in one line:** with compliance `α̃ = α / dt²`, each constraint update is `Δλ = (−C − α̃λ) / (Σwᵢ|∇Cᵢ|² + α̃)`. Zero compliance gives a rigid rod; positive compliance gives a spring whose stiffness doesn't depend on iteration count.
- **Dragging with the mouse:** cast a ray onto the plane through the particle facing the camera, then pull with a stiff anchored spring (or set it as kinematic while held). Don't teleport the particle: a teleport has no velocity, and contacts react badly.

### Where Aether differs from the book

- **The registry groups generators by particle** (`Map<Particle, ParticleForceGenerator[]>`), so removing a particle is one delete and steps repeat exactly. The book keeps a flat list of particle–generator registrations (§5.2).
- **Gravity is built into the world.** The book adds gravity through `ParticleGravity` or a per-particle acceleration; Aether keeps `ParticleGravity` for custom fields but applies `ParticleWorld.gravity` itself.
- **`ParticleAnchoredSpring` copies its anchor** and exposes it for dragging; the book holds a pointer to the caller's vector.
- **`ParticleAttraction` is not in the book.** It came out of the *Orbits* demo.
- **Contacts name their particles** `particleA` and `particleB` instead of `particle[2]`, are pooled and filled with `set()`, and call the normal `normal` rather than `contactNormal`. The normal still points from the second particle toward the first, as in the book.
- **The resting-contact correction uses the total acceleration.** The book's `getAcceleration()` is the particle's constant acceleration field (usually gravity) and ignores forces from generators. Aether records `lastAcceleration` from every force in the last step, so springs and buoyancy pressing a particle into a contact are corrected too.
- **One resolver loop for velocity and penetration, as in the book's source.** The text of §7.3.1 recommends a velocity pass then a separate penetration pass; the source, and Aether, pick the contact with the lowest separating velocity among those closing *or* penetrating and resolve both at once.
- **The resolver stops when nothing needs resolving.** The book's listing indexes past the array when no contact qualifies, and its source selects contacts with any positive penetration, so rounding residue or a contact between immovable particles can take every iteration. Aether exits the loop when nothing qualifies, zeroes the resolved contact's penetration, uses a 1e-9 tolerance and skips immovable contacts.
- **Links validate their arguments and skip degenerate cases.** The book's cable and rod normalise the vector between the particles without checking it, so coincident particles give a NaN normal; Aether's rod writes no contact then. Constructors reject equal particles and non-positive lengths.
- **The resolver is a seam.** The book's worst-first resolver is the first implementation; sequential impulses (Step 10) is not in the book, and when it arrives the resolution maths moves out of `ParticleContact` into the resolvers.
- **Verlet and XPBD (Steps 8–9) are not in the book.** They come from Jakobsen and from Müller and Macklin.

### Tests

- A spring at rest length applies zero force; a stretched spring pulls the ends together with equal and opposite forces.
- A rod keeps its length within tolerance after N steps under gravity.
- A particle resting on `GroundContacts` doesn't jitter: its velocity stays near zero for 1,000 steps.
- Buoyancy at full submersion matches `ρ · volume · g`.
- The resolver handles `particles[1] === null`.

**Demos**
- *Bridge* (Millington's mass-aggregate bridge)
- *Rope and cloth*: drag particles with the mouse; tear the cloth if the strain is too high
- *Springs*: an anchored spring you can drag, a free pair joined by a spring on each end, and a bungee

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 5 | §5.1 D'Alembert's Principle (pp. 69–72); §5.2 Force Generators (pp. 72–79); §5.3 Built-in Gravity and Damping (p. 79) | The registry design and why gravity and damping bypass the registry. |
| Millington ch. 6 | §6.1 Hooke's Law (pp. 81–83); §6.2 Springlike Force Generators (pp. 83–93): basic, anchored, bungee, buoyancy | One generator per subsection; implement them in order. |
| Millington ch. 6 | §6.3 Stiff Springs (pp. 93–101) | §6.3.1 shows the explosion; §6.3.2 *Faking Stiff Springs* is a workaround. Read it critically and compare with XPBD below. |
| Millington ch. 7 | §7.1 Simple Collision Resolution (pp. 103–108): closing velocity, restitution, contact normal, impulses | The core contact math in its simplest form. |
| Millington ch. 7 | §7.2 Collision Processing (pp. 108–119), especially §7.2.2 *Resolving Interpenetration* and §7.2.3 *Resting Contacts* | Position correction split by inverse mass, and the resting-contact trick from the Guidance. |
| Millington ch. 7 | §7.3 The Contact Resolver Algorithm (pp. 119–125); §7.4 Collisionlike Things (pp. 125–131): cables, rods | Why resolution order matters; cables and rods as contact generators. |
| Millington ch. 8 | All (pp. 133–142): engine overview; rope bridges, friction, blob games | How the pieces combine. The bridge demo comes from §8.2.1. |
| Witkin & Baraff, *PBM* notes ([Stanford PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf)) | "Particle System Dynamics" §5 *User Interaction* (PDF p. 21 onward) | Mouse interaction with a spring, the approach for dragging cloth. |
| Same notes | "Implicit Methods for Differential Equations" (PDF pp. 93–97) | Why stiff equations need implicit integration. Optional, but it explains what XPBD gets right. |
| Andrew Witkin, [Constrained Dynamics](https://www.cs.cmu.edu/~baraff/pbm/constraints.pdf) (13 pages) | "Constraint Forces", "A bead on a wire", "Feedback" | The *force-based* alternative to rods: solve for the force that keeps the constraint satisfied. Read these three now; the rest belongs to Phase 7. |
| Thomas Jakobsen, [Advanced Character Physics](https://web.archive.org/web/20080410171619/http://www.teknikus.dk/tj/gdc2001.htm) | All | Verlet plus constraint relaxation; the basis of `verlet.ts`. |
| Glenn Fiedler, [Spring Physics](https://gafferongames.com/post/spring_physics/) | All | Spring and damper forces in practice. |
| Müller, Macklin et al., [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf) | Sections 3–4 | Compliance and why stiffness becomes independent of iteration count. |
| Ten Minute Physics ([index](https://matthias-research.github.io/pages/tenMinutePhysics/index.html)) | Ep. 05, 08, 09, 10, 14 | Position-based simulation, user interaction, soft bodies and cloth with runnable code. |

More: [RESOURCES.md, Phase 3](./RESOURCES.md#phase-3-forces-springs-and-mass-aggregates)

**Done when:** you can drag cloth around at 60 Hz without it exploding, and explain why.

---

## Phase 4: Rigid bodies

**Goal:** bodies that rotate as well as translate.

**Concepts:** orientation as a quaternion; angular velocity and momentum; torque; the inertia tensor in body space vs world space; why to store the **inverse** inertia tensor; applying a force at a point (`τ = r × F`); D'Alembert's principle; gyroscopic effects; the "tennis racket" (Dzhanibekov) effect.

### Build

Build the body's state first, then the forces that act on it, then integration, and only then a world to run it in. Keep the gyroscopic term until after the first demo, so you can see what's missing without it.

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | Inertia tensors for primitives | Compute and test mass properties, with no body yet |
| 2 | `RigidBody` state and derived data | Place a body and rotate its inertia into world space |
| 3 | Forces, torques and point queries | Turn off-center forces into torque |
| 4 | Integration | Move and spin a single body |
| 5 | Force generators and `World` | Run several bodies with interpolated rendering |
| 6 | The spinning-bodies demo | See that the tennis-racket flip is missing |
| 7 | The gyroscopic term | Make the flip appear |
| 8 | Velocity clamps | Keep extreme spins under control |
| 9 | Body springs and aero surfaces | Fly the aircraft |
| 10 | Mirtich's algorithm | Compute inertia for any convex hull |

#### Step 1: Inertia tensors

- [ ] `Mat3x3.setInertiaTensorCoeffs(ixx, iyy, izz, ixy?, ixz?, iyz?)`, deferred from Phase 1. Test first; callers pass positive products of inertia and the method negates the off-diagonals
- [ ] `src/bodies/inertia.ts`: sphere, box, cylinder and capsule

**Covers:** the inertia tensor as a plain matrix you can test before any body exists. Use half extents, to match Phase 5's `Box`.

```ts
function sphereInertia(mass: number, radius: number, out: Mat3x3): Mat3x3
function boxInertia(mass: number, halfExtents: Vec3Like, out: Mat3x3): Mat3x3
function cylinderInertia(mass: number, radius: number, halfHeight: number, out: Mat3x3): Mat3x3   // along Y
function capsuleInertia(mass: number, radius: number, halfHeight: number, out: Mat3x3): Mat3x3    // along Y
```

**Done when:** each result matches its formula, and a dense point sampling of the box and the capsule agrees.

#### Step 2: Body state and derived data

- [ ] `src/bodies/rigid-body.ts`: state, mass and inertia setters, `setStatic`, `calculateDerivedData`

**Covers:** the split between stored state and data derived from it each step, and the world-space inverse inertia `R · I⁻¹ · Rᵀ`.

```ts
class RigidBody {
  readonly position = new Vec3()
  readonly orientation = new Quaternion()        // constructor order is (w, x, y, z)
  readonly velocity = new Vec3()
  readonly angularVelocity = new Vec3()          // world space, rad/s
  gravityScale = 1                               // multiple of the world's gravity
  inverseMass = 1
  readonly inertiaTensor = new Mat3x3()          // body space
  readonly inverseInertiaTensor = new Mat3x3()   // body space
  linearDamping = 0.99
  angularDamping = 0.99

  // Derived by calculateDerivedData()
  readonly transform = new Mat3x4()
  readonly inverseInertiaTensorWorld = new Mat3x3()

  setMass(mass: number): void
  setInertiaTensor(inertia: Mat3x3): void        // stores it and its inverse
  setStatic(): void                              // zero inverse mass and inverse inertia
  calculateDerivedData(): void
}
```

`Mat3x3.setInverse` returns zero for a singular matrix, which would silently make a body unable to rotate. Have `setInertiaTensor` throw a `RangeError` in that case, and leave immovable bodies to `setStatic`.

**Done when:** `inverseInertiaTensorWorld` equals `inverseInertiaTensor` at the identity orientation, and a 90° rotation swaps the expected diagonal entries of a box.

#### Step 3: Forces, torques and points on the body

- [ ] Accumulators, force and torque methods, and point queries on `RigidBody`

**Covers:** `τ = r × F`, and `v + ω × r`, the formula almost every contact and joint builds on.

```ts
class RigidBody {
  // ...Step 2 members
  readonly forceAccum = new Vec3()
  readonly torqueAccum = new Vec3()

  addForce(force: Vec3Like): void                // through the center of mass
  addForceAtPoint(force: Vec3Like, worldPoint: Vec3Like): void
  addForceAtBodyPoint(force: Vec3Like, bodyPoint: Vec3Like): void
  addTorque(torque: Vec3Like): void
  getPointInWorldSpace(bodyPoint: Vec3Like, out: Vec3): Vec3
  getVelocityAtPoint(worldPoint: Vec3Like, out: Vec3): Vec3   // v + ω × r
  clearAccumulators(): void
}
```

**Done when:** a force through the center adds no torque, and a pure couple adds torque with no net force.

#### Step 4: Integration

- [ ] `RigidBody.integrate`, semi-implicit, without a gyroscopic term
- [ ] `previousPosition`, `previousOrientation` and `lastFrameAcceleration`

**Covers:** the angular half of semi-implicit Euler. Keep the velocity and position halves in separate methods, because Phase 6 runs a solver between them.

```ts
class RigidBody {
  // ...earlier members
  readonly previousPosition = new Vec3()         // for render interpolation
  readonly previousOrientation = new Quaternion()
  readonly lastFrameAcceleration = new Vec3()    // used by the Phase 6 v1 resolver

  integrateVelocity(dt: number): void            // forces, damping, clear accumulators
  integratePosition(dt: number): void            // x, q, then derived data
  integrate(dt: number): void                    // both, in that order
}
```

**Done when:** a force through the center adds no angular velocity, a couple adds no linear velocity, a symmetric body spun about a principal axis stays on it, and a static body never moves.

#### Step 5: Force generators and the world

- [ ] `src/bodies/forces/force-generator.ts` and `force-registry.ts`: `BodyForceGenerator` and `BodyForceRegistry`
- [ ] `src/bodies/forces/gravity.ts`: `BodyGravity`
- [ ] `src/bodies/world.ts`: `World`

**Covers:** the rigid-body version of Phase 3's structure, and interpolating both position and orientation by `alpha` in a demo.

```ts
interface BodyForceGenerator {
  updateForce(body: RigidBody, dt: number): void
}

class BodyForceRegistry {
  add(body: RigidBody, generator: BodyForceGenerator): void
  remove(body: RigidBody, generator: BodyForceGenerator): void
  clear(): void
  updateForces(dt: number): void
}

class World {
  readonly bodies: RigidBody[] = []
  readonly registry = new BodyForceRegistry()
  readonly gravity = new Vec3(0, -9.81, 0)       // added as a force, as in ParticleWorld
  step(dt: number): void                         // store previous state, forces and gravity, integrate
}
```

**Done when:** dropped bodies match the particle trajectories from Phase 2 with the same damping.

#### Step 6: Spinning bodies, first version

- [ ] Demo: *Spinning bodies*, with editable inertia and a spin about each principal axis

**Covers:** a way to see the bug in the next step. An asymmetric box spun about its intermediate axis should flip, and at this point it doesn't. Add a live readout of `|L|` and kinetic energy.

**Done when:** you can show the flip failing to appear and `|L|` drifting.

#### Step 7: The gyroscopic term

- [ ] Option 1: integrate angular momentum
- [ ] Option 2: one implicit Newton step in body space
- [ ] A selectable mode, so the demo can compare all three

**Covers:** `ω × (I·ω)`, and the trade between an explicit method that gains energy and an implicit one that stays stable. For option 1, derive `L = I_world · ω` at the start of `integrateVelocity`, so setting `angularVelocity` directly stays safe, and recompute `ω` from `L` once the orientation has moved.

```ts
type GyroscopicMode = 'none' | 'momentum' | 'implicit'

class RigidBody {
  // ...earlier members
  gyroscopicMode: GyroscopicMode = 'implicit'
}
```

**Done when:** the flip appears on its own, and `|L|` stays within a few percent over 10 s with `'momentum'` and tighter with `'implicit'`.

#### Step 8: Velocity clamps

- [ ] `World` settings for maximum linear speed and maximum rotation per step

**Covers:** limits that keep a body from rotating past a contact between steps, ready for Phase 6.

```ts
interface WorldSettings {
  maxLinearSpeed: number
  maxRotationPerStep: number                     // radians, default 0.25π
}

class World {
  // ...earlier members
  constructor(settings?: Partial<WorldSettings>)
}
```

**Done when:** a body given an absurd angular velocity rotates no more than the limit per step, and normal motion is unchanged.

#### Step 9: Body springs, aero surfaces and the flight sim

- [ ] `src/bodies/forces/spring.ts`: `BodySpring`, between body-space points
- [ ] `src/bodies/forces/aero.ts`: `Aero`, `AeroControl`
- [ ] Demo: *Flight sim*

**Covers:** generators that apply force at a point, and forces computed in body space and converted back to world space.

```ts
class BodySpring implements BodyForceGenerator {
  constructor(localPoint: Vec3Like, other: RigidBody, otherLocalPoint: Vec3Like,
              stiffness: number, restLength: number)
}

class Aero implements BodyForceGenerator {
  constructor(tensor: Mat3x3, localPosition: Vec3Like, wind: Vec3Like)
}

class AeroControl extends Aero {
  constructor(base: Mat3x3, min: Mat3x3, max: Mat3x3, localPosition: Vec3Like, wind: Vec3Like)
  setControl(value: number): void                // -1 to 1, blends between the tensors
}
```

**Done when:** a spring between off-center points spins both bodies, and the aircraft pitches, rolls and yaws from the matching controls.

#### Step 10: Mirtich's algorithm

- [ ] Mass properties for a closed mesh in `src/bodies/inertia.ts`

**Covers:** mass properties computed from geometry. The center of mass usually isn't the origin of the mesh, so the result has to return it. Phase 5's `ConvexHull` is the first real user, so this can wait until then.

```ts
interface MassProperties { mass: number; centerOfMass: Vec3; inertia: Mat3x3 }

function polyhedronMassProperties(vertices: Vec3Like[], faces: number[][], density: number): MassProperties
```

**Done when:** a box built as a mesh matches `boxInertia`.

#### Finishing up

- [ ] Export from the `bodies` and `math` barrels and `src/index.ts`

### Guidance

- **Shared with the Lab.** S2's `ExactRigidBody`, in `aether-lab`, reuses this phase's inertia tensors and quaternion helpers, so keep them as free functions in `math/` rather than private methods on `RigidBody`.
- **Derived data.** `calculateDerivedData` normalizes the orientation, builds `transform` from position and orientation, and computes `I⁻¹_world = R · I⁻¹_body · Rᵀ`. Call it after every integration and after anyone sets position or orientation directly.
- **Why the inverse tensor.** Every use is `Δω = I⁻¹ · τ` or `I⁻¹ · (r × impulse)`. Inverting once at setup is cheaper than solving each time, and static bodies get a zero matrix just like `inverseMass = 0`.
- **Force at a point:** add `F` to the force accumulator and `(p − position) × F` to the torque accumulator. A force through the center of mass produces no torque.
- **Integration (semi-implicit):** `a = F·invM`, with gravity already added as a force by `World`; `α = I⁻¹_world · τ`; `v += a·dt`, `ω += α·dt`; apply damping (`^dt` as in Phase 2); `x += v·dt`; `q.addScaledAngularVelocity(ω, dt)`; recompute derived data; clear accumulators. Copy `position`/`orientation` into `previous*` first.
- **The gyroscopic term.** The integration above treats ω as constant when there's no torque. That's wrong for an asymmetric body: the true equation is `I·ω̇ = τ − ω × (I·ω)`. Without that term, the tennis-racket flip **never happens** and `|L|` isn't conserved. Two fixes:
  1. Track angular momentum `L` instead: `L += τ·dt`, then `ω = I⁻¹_world · L`. This is simple and correct in direction, but explicit, so energy slowly grows.
  2. Solve the gyroscopic term implicitly with one Newton step in body space, as Bullet and Box3D do (see Catto's *Numerical Methods* below). Box3D solves `I(ω₂ − ω₁) + h·ω₂ × (I·ω₂) = 0` for `ω₂` with one Newton–Raphson iteration. This is stable; do it once option 1 has shown you the effect.
- **Velocity clamps (Box3D).** Box3D caps linear speed and limits rotation to `0.25π` per step. Without the rotation cap, a fast-spinning body can rotate past a contact between steps. Add both as `World` settings.
- **Primitive inertia** (body space, principal axes, `m` = mass):
  - Solid sphere: `⅖·m·r²` on every axis.
  - Box with full extents `w, h, d`: `Ixx = m/12·(h² + d²)`, `Iyy = m/12·(w² + d²)`, `Izz = m/12·(w² + h²)`.
  - Solid cylinder along Y: `Iyy = ½·m·r²`, `Ixx = Izz = m/12·(3r² + h²)`.
  - Capsule: cylinder plus two hemispheres with the parallel-axis theorem; derive it in your notes and test it against a dense point sampling.
- **Aero surfaces:** transform the relative wind into body space, multiply by the surface's aerodynamic tensor, transform the force back to world space and apply it at the surface's body point. `AeroControl` blends between tensors by a control input.
- **World step order (until Phase 6):** for each body, store previous state and clear accumulators; run force generators; integrate.
- **Render interpolation:** demos lerp `previousPosition → position` and slerp `previousOrientation → orientation` by `alpha`.

### Where Aether differs from the book

- **Gravity is a world force**, as for particles, rather than an acceleration stored on each body.
- **The gyroscopic term is a seam.** The book integrates `ω` with no gyroscopic term, which is `'none'` here; `'momentum'` and `'implicit'` are additions, and `'implicit'` is the default.
- **Integration is split** into `integrateVelocity` and `integratePosition`, because Phase 6's v2 and v3 solvers run between the two halves; `integrate` calls both, which matches the book.
- **Velocity clamps** (maximum speed, maximum rotation per step) come from Box3D; the book has none.
- **`previousPosition` and `previousOrientation`** are kept for render interpolation; the book renders the current state.
- **`setInertiaTensor` throws on a singular tensor** instead of silently storing a zero inverse; static bodies use `setStatic`.
- **Inertia helpers are free functions** so Aether Lab can reuse them, and Mirtich's mesh mass properties (Step 10) are not in the book.

### Tests

- A force through the center of mass produces no angular velocity.
- `addForceAtPoint` with a pure couple (equal and opposite forces at opposite points) produces no linear velocity.
- A symmetric body spun about a principal axis stays on that axis.
- Torque-free spin of an asymmetric box conserves `|L|` (within a few percent over 10 s with option 1, tighter with option 2).
- `inverseInertiaTensorWorld` equals `inverseInertiaTensor` when the orientation is identity.
- Box inertia matches the formulas above; a numerically sampled box agrees.

**Demos**
- *Spinning bodies*: boxes and cylinders with editable inertia; the tennis-racket flip about the intermediate axis
- *Flight sim* (Millington ch. 11): a simple aircraft with aero surfaces. It fits the aviation theme.

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 9 | §9.1 Rotating Objects in Two Dimensions (pp. 145–152), especially §9.1.3 *The Origin and the Center of Mass*; §9.3 Angular Velocity and Acceleration (pp. 159–161), §9.3.1 *The Velocity of a Point* | Rotation in 2D first, then `v + ω × r`. |
| Millington ch. 10 | §10.1 The Rigid Body (pp. 193–196); §10.2 Newton 2 for Rotation (pp. 196–205): torque, moment of inertia, §10.2.3 *The Inertia Tensor in World Coordinates* | The core of `RigidBody` and `calculateDerivedData`. |
| Millington ch. 10 | §10.3 D'Alembert for Rotation (pp. 205–210); §10.4 The Rigid-Body Integration (pp. 210–212) | Force at a point and the integration step. The book has no gyroscopic term, which is why the Guidance adds one. |
| Millington ch. 11 | §11.1 Overview (pp. 213–216); §11.2.1 *A Flight Simulator* (pp. 216–222); §11.2.2 *A Sailing Simulator* (pp. 222–227) | `Aero` and `AeroControl` force generators; buoyancy at an offset center (sailing). |
| Millington App. A | Common Inertia Tensors (pp. 431–433): discrete and continuous masses, cuboid, sphere, cylinder, cone | Known values for `inertia.ts` tests. |
| Witkin & Baraff, *PBM* notes ([Stanford PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf)): Baraff, "Rigid Body Simulation" Part I | §2 Rigid Body Concepts (PDF pp. 28–38), especially §2.9 *Angular Momentum* and the inertia tensor; §3 Computing d/dt Y(t) (pp. 39–43); §4 Quaternions vs. Rotation Matrices (pp. 44–47); §5 Examples (pp. 48–55) | The most rigorous derivation of the rigid-body equations. Baraff integrates angular momentum, which is option 1 in the gyroscopic guidance. |
| Same notes | Appendix A *Motion Equation Derivations*, Appendix B *Quaternion Derivations* (PDF pp. 79–83) | Where `q̇ = ½ ω q` comes from. |
| Chris Hecker, [Rigid Body Dynamics](https://www.chrishecker.com/Rigid_Body_Dynamics) | Part 2 *Angular Effects* (2D), then Part 4 *The Third Dimension* | Part 2 builds intuition in 2D; Part 4 is the 3D version, including the inertia tensor. Some equations in the PDFs are garbled. |
| Newcastle University, [Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | Tutorial 3, *Angular Motion* | Torque and angular integration as course notes. |
| Erin Catto, [Numerical Methods](https://box2d.org/files/ErinCatto_NumericalMethods_GDC2015.pdf) (GDC 2015) | The gyroscopic sections | The implicit gyroscopic solve (option 2). |
| Brian Mirtich, [Polyhedral Mass Properties](https://people.eecs.berkeley.edu/~jfc/mirtich/massProps.html) | All | Inertia tensors for convex hulls. |
| Harry Smith, [*Aircraft Flight Mechanics*: Assumed knowledge](https://aircraftflightmechanics.com/Prerequisites/Prerequisites.html#controlsurfaces) | Aircraft Anatomy (incl. wing parameters and the control-surface figure); Aerodynamic Coefficients; Aerofoils and Lift → *Lift vs Alpha* | Which surface drives which axis (ailerons → roll, elevator → pitch, rudder → yaw); `F = ½ρV²·S·C`; a lift model `C_L = a(α − α₀)` with a slope near 2π per radian and a stall cutoff. Enough for a believable flight-sim demo. |
| [Airfoil Tools](http://airfoiltools.com/) | The airfoil database | Real lift and drag curves for named airfoils. Use one to build a piecewise `C_L(α)` table instead of a straight line. |
| Box3D `src/solver.c` (velocity integration, near the top); `src/body.h` | `b3IntegrateVelocitiesTask`; `b3BodyState` vs `b3BodySim` | The implicit gyroscopic solve, Padé damping and velocity clamps in production form; hot per-step state kept apart from cold data. Box3D's *Gyroscopic Precession* and *Spinning Book* samples are the same experiments as the spinning-bodies demo. |

More: [RESOURCES.md, Phase 4](./RESOURCES.md#phase-4-rigid-bodies)

**Done when:** the tennis-racket flip appears on its own, without being scripted.

---

## Phase 5: Collision detection

**Goal:** find which bodies touch, where, and how deeply.

**Concepts:** the detection pipeline (broadphase → narrowphase → contact generation); bounding volumes (sphere, AABB, OBB); broadphase structures (uniform grid, sweep-and-prune, dynamic AABB tree / BVH); primitive tests; the separating axis theorem (SAT); support functions and Minkowski differences; GJK for distance and overlap; EPA for penetration depth; contact manifolds and clipping; persistent contacts.

### Build

Follow the data through the pipeline backward: first what a contact looks like, then how to produce one for each shape pair, and only then how to avoid testing every pair. Build the inspector early, because every later step uses it to find its bugs.

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | Shapes, support functions, `AABB` | Bound any shape |
| 2 | `Collider` | Attach a shape to a body |
| 3 | `Contact`, `ContactManifold`, the normal convention | Write down a collision result |
| 4 | Dispatch table, sphere and plane pairs | Get the first real contacts |
| 5 | Sphere–box and box–plane | Handle an oriented shape |
| 6 | Debug draw and the collision inspector | See every later step working |
| 7 | Box–box SAT, overlap only | Find the separating or least-overlap axis |
| 8 | Box–box clipping and feature IDs | Get a stable 4-point manifold |
| 9 | Brute force, the pipeline, sweep-and-prune | Run detection over a whole scene |
| 10 | GJK | Test overlap and distance for any convex pair |
| 11 | EPA | Get depth when GJK says they overlap |
| 12 | Capsule and hull pairs | Cover the rest of the pair table |
| 13 | Dynamic AABB tree | Scale to large, mostly idle scenes |
| 14 | Hull SAT and the optional hull builder | Get stable hull manifolds |

#### Step 1: Shapes and bounds

- [ ] `src/collision/shapes.ts`: `Sphere`, `Box`, `Plane`, `Capsule`, `ConvexHull` as a discriminated union, with `support` and `computeAabb`
- [ ] `src/collision/aabb.ts`: `AABB`

**Covers:** shapes as plain data, the support function, and the bounding box as the cheap approximation that the broadphase runs on.

```ts
type Shape =
  | { kind: 'sphere'; radius: number }
  | { kind: 'box'; halfExtents: Vec3 }
  | { kind: 'plane'; normal: Vec3; offset: number }       // static only
  | { kind: 'capsule'; radius: number; halfHeight: number }  // along Y
  | { kind: 'hull'; vertices: Vec3[]; faces: number[][] }

function support(shape: Shape, localDir: Vec3Like, out: Vec3): Vec3   // not defined for planes
function computeAabb(shape: Shape, transform: Mat3x4, out: AABB): AABB

class AABB {
  readonly min = new Vec3(); readonly max = new Vec3()
  overlaps(other: AABB): boolean
  union(a: AABB, b: AABB): this
  expand(margin: number): this
  surfaceArea(): number
}
```

A plane is infinite, so give it a huge `AABB` and let the broadphase treat it as always a candidate.

**Done when:** a rotated box's `AABB` contains all 8 of its corners and touches them, and each support point is the farthest in a brute-force sample of directions.

#### Step 2: Colliders

- [ ] `src/bodies/contacts/collider.ts`: `Collider` (shape + body + local offset + material)

**Covers:** the separation between a body, which has mass and motion, and a shape, which has geometry. `collision/` never sees a `Collider`: it takes shapes and world transforms, and `Collider` is how a rigid body hands it those.

```ts
class Collider {
  body: RigidBody | null           // null: static scenery
  shape: Shape
  readonly offset: Mat3x4          // shape frame relative to the body
  friction = 0.5
  restitution = 0.2
  readonly transform = new Mat3x4()    // world space, updated each step
  readonly aabb = new AABB()           // world space, updated each step
  update(margin?: number): void
}
```

**Done when:** a collider with an offset on a rotated body reports the correct world position and `AABB`.

#### Step 3: Contact data

- [ ] `src/collision/manifold.ts`: `Contact` and `Manifold`
- [ ] `src/bodies/contacts/contact-manifold.ts`: `ContactManifold`, a `Manifold` that knows its two colliders
- [ ] The normal convention and the sign of `penetration`, written in the JSDoc on `Manifold` and `Contact`

**Covers:** the shape of every result that follows. The normal points from B toward A. `penetration` is negative when there's a gap, which is what speculative contacts rely on later.

```ts
class Contact {
  readonly point = new Vec3()      // world space
  readonly normal = new Vec3()     // from B toward A
  penetration = 0                  // negative: a gap
  id = 0                           // feature key, stable across frames (used in Phase 6)
}

class Manifold {                   // collision/: geometry only
  readonly normal = new Vec3()
  readonly points: Contact[]       // preallocated, up to 4
  count = 0
}

class ContactManifold extends Manifold {   // bodies/contacts/
  a: Collider; b: Collider
}
```

**Done when:** this compiles and the convention is written down. There's nothing to run yet.

#### Step 4: Dispatch and the first pairs

- [ ] `src/collision/narrowphase/index.ts`: the dispatch table
- [ ] `sphere-sphere.ts`, `sphere-plane.ts`

**Covers:** one function per pair, a lookup by shape kinds, and one place that handles reversed arguments. Each function takes a `margin`, so contacts within that gap are reported with negative `penetration`. Pairs take shapes and their world transforms, so they can be tested without bodies.

```ts
type NarrowphaseFn = (a: Shape, xfA: Mat3x4, b: Shape, xfB: Mat3x4, margin: number, out: Manifold) => boolean

function collide(a: Shape, xfA: Mat3x4, b: Shape, xfB: Mat3x4, margin: number, out: Manifold): boolean
// Looks up 'sphere:plane'. For 'plane:sphere' it swaps the arguments and negates the normal.
```

**Done when:** each pair passes its separated, touching, shallow and deep cases with the normal sign checked, and reversed arguments give the same contact with a negated normal.

#### Step 5: Sphere–box and box–plane

- [ ] `sphere-box.ts`, `box-plane.ts`

**Covers:** working in a shape's local space, and the first manifold with more than one point.

**Done when:** a sphere whose center is inside the box is pushed out along the axis of least penetration, and a box flat on a plane gives exactly 4 contacts at its corners.

#### Step 6: Debug draw and the collision inspector

- [ ] Debug draw data: a plain array of lines and points the engine fills and demos render
- [ ] A line-batch helper in `src/playground/demos/helpers/`
- [ ] Demo: *Collision inspector*, with the pairs built so far

**Covers:** a way to see contacts, which makes the harder steps ahead much easier to debug. The engine stays free of Three.js, because it writes only numbers.

```ts
class DebugDraw {
  readonly lines: number[] = []    // x1, y1, z1, x2, y2, z2, color per line
  readonly points: number[] = []   // x, y, z, color per point
  clear(): void
  line(from: Vec3Like, to: Vec3Like, color: number): void
  point(at: Vec3Like, color: number): void
}
```

**Done when:** you can drag two shapes with gizmos and watch the point, normal and depth update.

#### Step 7: Box–box SAT, overlap only

- [ ] `box-box.ts`: test 15 axes and return the axis of least overlap, with no contact points yet

**Covers:** the separating axis theorem. Draw the chosen axis in the inspector before writing any clipping.

**Done when:** hand-computed separated, face-overlap and edge-overlap cases pick the expected axis, and a parallel-edge axis doesn't produce `NaN`.

#### Step 8: Box–box contact points

- [ ] Reference and incident faces, Sutherland–Hodgman clipping, and edge–edge closest points
- [ ] Reduction to at most 4 points
- [ ] Feature IDs on each contact

**Covers:** the manifold as a contact area rather than a point, and the IDs that make Phase 6's warm starting possible.

**Done when:** a box flat on a box gives 4 stable points, an edge–edge case gives 1, and IDs stay the same as a box moves slightly.

#### Step 9: The broadphase and the pipeline

- [ ] `src/collision/broadphase/`: `Broadphase` interface, `BruteForceBroadphase`, `SweepAndPrune`
- [ ] `src/bodies/contacts/collision-pipeline.ts`: update colliders → find pairs → run the narrowphase
- [ ] Demo: *Broadphase heatmap*

**Covers:** the funnel of broadphase then narrowphase, with brute force as the reference to test other broadphases against. The broadphase stores boxes under a number the caller chooses, so it knows nothing about colliders. `CollisionPipeline` maps those numbers back to colliders, and is what `World` calls in Phase 6.

```ts
interface Broadphase {
  add(aabb: AABB, userData: number): number    // returns a proxy
  remove(proxy: number): void
  move(proxy: number, aabb: AABB): void
  pairs(out: number[]): number     // userData pairs, flattened: a0, b0, a1, b1, ...
}

class CollisionPipeline {
  readonly manifolds: ContactManifold[] = []
  manifoldCount = 0
  margin = 0                       // speculative margin, used from Phase 6 v3
  constructor(broadphase: Broadphase)
  add(collider: Collider): void
  remove(collider: Collider): void
  update(): void
}
```

**Done when:** `SweepAndPrune` returns a superset of the brute-force pairs on random scenes, and the heatmap shows it winning at 1,000 AABBs.

#### Step 10: GJK

- [ ] `src/collision/gjk.ts`

**Covers:** the Minkowski difference and simplex iteration. Overlap comes first. Distance and closest points come next, because shapes in a speculative margin need them.

```ts
interface GjkResult {
  overlapping: boolean
  distance: number                 // 0 when overlapping
  readonly pointA: Vec3; readonly pointB: Vec3   // closest points when separated
  readonly simplex: Vec3[]         // start of EPA when overlapping
  simplexCount: number
}

function gjk(a: Shape, xfA: Mat3x4, b: Shape, xfB: Mat3x4, out: GjkResult): boolean
```

**Done when:** GJK agrees with SAT on overlap for 10,000 random box pairs, and distance matches a hand-computed case.

#### Step 11: EPA

- [ ] `src/collision/epa.ts`

**Covers:** finding depth by expanding a polytope from GJK's final simplex. Handle a simplex with fewer than 4 points, which is what GJK returns when shapes just touch.

```ts
interface EpaResult {
  readonly normal: Vec3            // from B toward A
  depth: number
  readonly pointA: Vec3; readonly pointB: Vec3
}

function epa(a: Shape, xfA: Mat3x4, b: Shape, xfB: Mat3x4, simplex: GjkResult, out: EpaResult): boolean
```

**Done when:** EPA's depth agrees with SAT's on random overlapping boxes within tolerance, and the inspector shows its normal matching SAT's axis.

#### Step 12: The rest of the pair table

- [ ] Capsule pairs and hull pairs, using GJK and EPA

**Covers:** treating a capsule or a rounded shape as a core plus a radius: run GJK on the core, then subtract the radius. Fill in the table in this order:

| | sphere | box | plane | capsule | hull |
|---|---|---|---|---|---|
| **sphere** | Step 4 | Step 5 | Step 4 | Closest point on a segment | GJK |
| **box** | | Steps 7–8 | Step 5 | GJK + EPA | GJK + EPA |
| **plane** | | | none: both static | 2 end spheres | Test the vertices |
| **capsule** | | | | Closest points between segments | GJK + EPA |
| **hull** | | | | | GJK + EPA, then Step 14 |

**Done when:** every cell passes the same cases as Step 4, and the inspector can select each shape.

#### Step 13: Dynamic AABB tree

- [ ] `src/collision/broadphase/dynamic-tree.ts`: a dynamic AABB tree with fat AABBs, SAH sibling selection and tree rotations (Box3D's broadphase)

**Covers:** surface-area cost, incremental rebalancing, and fat AABBs that spare a body from re-insertion. It implements `Broadphase`, so nothing else changes.

```ts
class DynamicTree {
  createProxy(aabb: AABB, userData: number): number
  destroyProxy(proxy: number): void
  moveProxy(proxy: number, aabb: AABB): boolean   // false: still inside its fat AABB
  query(aabb: AABB, visit: (userData: number) => boolean): void
}

class DynamicTreeBroadphase implements Broadphase { /* wraps DynamicTree */ }
```

**Done when:** it returns a superset of the brute-force pairs, and the heatmap compares all three broadphases.

#### Step 14: Hull SAT and the hull builder

- [ ] Hull–hull SAT with Gauss-map pruning, replacing the GJK + EPA entry for hull pairs
- [ ] *Optional:* `src/collision/hull-builder.ts`: Quickhull from a point cloud, so `ConvexHull` shapes can come from arbitrary meshes (Box3D builds boxes as hulls this way)

**Covers:** face-based manifolds for general hulls, since EPA alone gives one point per frame. Hulls now need their edges, so compute them when you build the hull.

**Done when:** a box built as a hull gives the same manifold as Step 8.

#### Finishing up

- [ ] Export from the `collision` and `bodies` barrels and `src/index.ts`

### Guidance

- **Pick a normal convention and test it.** Here the normal points from B toward A, so pushing A along `+n` separates the pair. Every narrowphase function must agree; a test per pair that checks the sign saves days later.
- **Dispatch table.** Key narrowphase functions by `'sphere:box'` and similar. When the requested order is reversed, swap the arguments and negate the normal. Don't write both orders.
- **Support functions** return the farthest point in a local direction: sphere `r·d̂`; box `(sign(dₓ)·hₓ, …)`; capsule = segment support + `r·d̂`; hull = vertex with max `v·d` (brute force is fine for small hulls).
- **Brute-force broadphase first.** It's the reference that later broadphases are tested against.
- **Sweep-and-prune:** sort AABB endpoints on one axis (the axis of greatest variance works well); sweep, keeping an active set; check the other two axes for active pairs. Re-sort with insertion sort each step: bodies move little between frames, so it's nearly O(n).
- **Fat AABBs** (expanded by a margin) let the broadphase skip updates for bodies that moved less than the margin. This matters for the dynamic tree later.
- **Sphere–sphere:** `d = cₐ − c_b`; contact if `|d| < rₐ + r_b`; `n = d̂` (pick any axis if the centers coincide); `pen = rₐ + r_b − |d|`.
- **Sphere–box:** move the sphere center into box space and clamp it to the half-extents to get the closest point. If the center is inside the box, push out along the axis of least penetration instead.
- **Box–plane:** test all 8 vertices; each one below the plane is a contact point.
- **Box–box SAT:** test 15 axes (3 face normals of each box, 9 edge cross products). Skip cross products with near-zero length (parallel edges). Track the axis of least overlap; prefer face axes over edge axes unless an edge axis is clearly better, or contacts flicker between frames.
  - **Face contact:** pick the reference face (on the axis' box) and the incident face (the other box's face most anti-parallel to it). Clip the incident face against the reference face's four side planes (Sutherland–Hodgman), keep points below the reference face, and reduce to at most 4.
  - **Edge–edge contact:** closest points between the two edge segments give one contact.
- **GJK:** iterate on the Minkowski difference `s(d) = s_A(d) − s_B(−d)` in world space. Handle line, triangle and tetrahedron simplex cases; stop when the new support point doesn't pass the origin. It answers overlap/distance, not penetration depth.
- **EPA:** start from GJK's final tetrahedron, repeatedly find the face closest to the origin, add the support point in its normal direction, remove faces that can see the new point, and patch the horizon. Stop when the distance improves by less than a tolerance. EPA gives one deep point; combine it with clipping or a persistent manifold to get a stable patch.
- **Feature IDs.** Give each contact point an `id` built from the features that produced it (for example reference face index and incident vertex index). Phase 6 warm starting matches points across frames by this ID.
- **Dynamic AABB tree (Box3D).** Insert each fat AABB next to the sibling that grows the tree's total surface area least (the SAH cost), then walk up refitting ancestors and applying a rotation where it lowers cost. Only re-insert a proxy when its tight AABB leaves its fat one. Box3D keeps three trees, one each for static, kinematic and dynamic bodies, so static geometry is never re-queried against itself. Test it against the brute-force broadphase.
- **Speculative contacts (Box3D).** Report contact points whose separation is *positive* but small (Box3D uses `4 × linearSlop`, about 2 cm). Phase 6's solver lets bodies close that gap but not cross it, so contacts start *before* touching and resting bodies don't overshoot. The margin is small, so this covers modest speeds only (about `margin / dt`, roughly 1 m/s at 60 Hz); faster bodies need time of impact (Phase 8). Your narrowphase functions should therefore return negative penetration (a gap) rather than no contact, up to the margin.
- **Hull–hull SAT with Gauss-map pruning.** For two convex hulls, testing every edge pair is `O(E²)`. An edge pair can only be a separating axis if the two edges' arcs on the Gauss map (the unit sphere of face normals) intersect. That test is cheap and skips most pairs (Gregorius, GDC 2013; Box3D's `b3ComputeSeparatingAxis`). Boxes are just hulls with 6 faces and 12 edges, so a general hull SAT replaces the box-specific one.
- **Manifold reduction.** Clipping two boxes can produce up to 8 points (more for hulls); keep at most 4. Start with Allen Chou's rule: the deepest point, the point farthest from it, then the points that maximize triangle and quadrilateral area. Box3D does it differently: it projects the points onto the contact plane, builds their 2D convex hull, and simplifies that hull to 4 vertices (`b3ReduceManifoldPoints`). Compare the two on a box rotated 45° on another box.

### Where Aether differs from the book

- **Collision is body-agnostic.** The book's `CollisionPrimitive` holds a body pointer and an offset. Here shapes are plain data, narrowphase functions take shapes and world transforms, and `Collider` is what attaches a shape to a body.
- **One dispatch table** keyed by shape kinds, with reversed pairs handled in one place, instead of a static method per pair on `CollisionDetector`.
- **Results are manifolds** of up to 4 points with feature IDs, so Phase 6 can match contacts across steps; the book writes independent contacts into an array.
- **The normal points from B toward A**, and penetration may be negative within a speculative margin, so contacts can begin before bodies touch.
- **GJK, EPA, hull SAT, sweep-and-prune and the dynamic AABB tree are not in the book.** It covers bounding-volume hierarchies, BSP trees, octrees and grids; Aether builds brute force and a BVH-style tree first, then the production structures behind the same `Broadphase` seam.

### Tests

- Each narrowphase pair against hand-computed cases: separated, touching, shallow, deep, and edge–edge for boxes. Check the normal sign every time.
- Reversed argument order gives the same contact with a negated normal.
- GJK agrees with SAT on overlap for 10,000 random box pairs.
- EPA depth agrees with SAT depth on random overlapping boxes within tolerance.
- The broadphase returns a superset of brute-force pairs on random scenes.
- Box resting flat on a plane yields exactly 4 contacts at the corners.

**Demos**
- *Collision inspector*: move two shapes with gizmos; see the separating axis, contact points and depth live
- *Broadphase heatmap*: 1,000 AABBs; show candidate pairs and timing for brute force vs your broadphase

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 12 | §12.1 Collision Detection Pipeline (p. 232); §12.2 Coarse Collision Detection (pp. 232–233); §12.3 Bounding Volumes (pp. 233–251): hierarchies, building them bottom-up, top-down and by insertion | The two-phase pipeline and BVH construction strategies. |
| Millington ch. 12 | §12.4 Spatial Data Structures (pp. 251–261): BSP, oct-trees and quad-trees, grids, multi-resolution maps | Alternatives to a BVH, and when each wins. |
| Millington ch. 13 | §13.1 Collision Geometry (pp. 264–265); §13.2 Contact Generation (pp. 265–273): contact data; point–face, edge–edge, edge–face, face–face; early-outs | The contact cases every narrowphase function must report. |
| Millington ch. 13 | §13.3 Primitive Collision Algorithms (pp. 273–297): two spheres, sphere–plane, box–plane, sphere–box, §13.3.5 *Colliding Two Boxes* (pp. 287–297) | Your first narrowphase functions, in this order. The box–box section covers SAT and contact coherence across frames. |
| Kenneth I. Joy, *Clipping* (UC Davis notes; local PDF: `~/Desktop/Textbooks/JoyKennethClipping-200905-175314.pdf`, 20 pages) | §2 Inside/Outside Tests for Points Against a Plane; §3 Clipping Line Segments Against a Plane; §4 Clipping a Convex Polygon. Skip the viewing-pyramid sections. | Sutherland–Hodgman polygon clipping: exactly what clipping the incident face against the reference face's side planes needs. |
| William Bittle (dyn4j) | [SAT](https://dyn4j.org/2010/01/sat/), [Contact Points Using Clipping](https://dyn4j.org/2011/11/contact-points-using-clipping/), then [GJK](https://dyn4j.org/2010/04/gjk-gilbert-johnson-keerthi/), [EPA](https://dyn4j.org/2010/05/epa-expanding-polytope-algorithm/) | The clearest illustrated walkthroughs (2D, but the ideas carry to 3D). |
| Newcastle University, [Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | Tutorial 1 *Raycasting*; Tutorial 4 *Collision Detection* | Raycasting is useful for picking and queries. Collision detection covers shape tests and the data needed for response. |
| Newcastle University, [Broad phase and Narrow phase](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/6accelerationstructures/Physics%20-%20Spatial%20Acceleration%20Structures.pdf) (16 pages) | Spatial Acceleration Structures; BSP, Quadtrees, Octrees; Node size and position; Static and dynamic objects; Sleeping Objects; Choosing a structure | Practical tradeoffs between structures, including how sleeping bodies interact with the broadphase. |
| Pierre Vigier, [Quadtree and Collision Detection](https://pvigier.github.io/2019/08/04/quadtree-collision-detection.html) | Insertion and Removal; Finding Intersections → *All Pairwise Intersections* | Storing each object in the smallest node that contains it, and reporting each pair once. Extend it to an octree if you want a third broadphase. |
| Witkin & Baraff, *PBM* notes ([Stanford PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf)) | Baraff, "Rigid Body Simulation" Part II §7 *Collision Detection* (PDF pp. 58–63) | Separating planes and exploiting coherence between frames. |
| Ericson, *Real-Time Collision Detection* | Ch. 4–5 (bounding volumes, primitive tests), 7 (spatial partitioning), 9 (GJK) | The reference when a test needs to be robust. |
| Erin Catto, [Computing Distance using GJK](https://box2d.org/files/ErinCatto_GJK_GDC2010.pdf) (GDC 2010); [Dynamic BVH](https://box2d.org/files/ErinCatto_DynamicBVH_GDC2019.pdf) (GDC 2019) | All | GJK done properly; the broadphase most production engines use. |
| Dirk Gregorius, [The Separating Axis Test between Convex Polyhedra](https://www.gdcvault.com/play/1017646/Physics-for-Game-Programmers-The) (GDC 2013); [Robust Contact Creation](https://www.gdcvault.com/play/1022193/Physics-for-Game-Programmers-Robust) (GDC 2015) | All | SAT for hulls, and stable manifolds. |
| Allen Chou, [Game Physics: Stability – Warm Starting](http://allenchou.net/2014/01/game-physics-stability-warm-starting/) | Persistent Contacts | Matching contacts across frames and reducing a manifold to 4 points (deepest, farthest from it, farthest from that segment, farthest from the triangle). |
| Ten Minute Physics | Ep. 11, 23, 24 | Spatial hashing, sweep-and-prune and BVHs with runnable code. |
| Bittner, Hapala & Havran, [Fast Insertion-Based Optimization of BVHs](https://dcgi.fel.cvut.cz/~havran/ARTICLES/bittner2013cgf_preprint.pdf) (CGF 2013); Erin Catto, [Dynamic Tree Improvements](https://box2d.org/posts/2025/03/dynamic-tree-improvements/) (2025) | All | The paper behind SAH insertion, and how Box2D v3 and Box3D refined the tree after the GDC 2019 talk. |
| Dirk Gregorius, [Implementing QuickHull](https://media.steampowered.com/apps/valve/2014/DirkGregorius_ImplementingQuickHull.pdf) (GDC 2014) | All | For the optional hull builder: half-edge mesh, conflict lists, horizon, face merging. |
| Erin Catto, [Contact Manifolds](https://box2d.org/files/ErinCatto_ContactManifolds_GDC2007.pdf) (GDC 2007) | All | Clipping-based manifolds and feature IDs, the ancestor of Box3D's manifold code. |
| Box3D `src/dynamic_tree.c`, `src/broad_phase.c`, `src/convex_manifold.c`, `src/distance.c`, `src/hull.c` | `b3FindBestSibling` and rotations; `b3ComputeSeparatingAxis` and `b3ReduceManifoldPoints`; `b3ShapeDistance`; `b3HullBuilder_*` | Compare after your versions work. Box3D's *Manifold* samples show every shape pair and make a good checklist for the collision inspector demo. |

More: [RESOURCES.md, Phase 5](./RESOURCES.md#phase-5-collision-detection)

**Done when:** box–box contacts are stable and correct as you drag the boxes through each other.

---

## Phase 6: Collision response and friction

**Goal:** bodies bounce, slide, come to rest and stack.

**Concepts:** impulses and impulsive torque; the coefficient of restitution; the effective mass at a contact; resolving velocity vs resolving penetration; Coulomb friction and the friction cone (approximated as a pyramid); resting contact and micro-collisions; **sequential impulses**; accumulated impulse clamping; warm starting; Baumgarte stabilization vs split impulses vs soft constraints; the solver iteration count trade-off.

### Build

There are three solvers here, and each one reuses the work of the last. A `Solver` interface goes in first, because each solver runs the step in a different order and the comparison demo needs all three to keep working.

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | `Solver`, settings and `World` running collision | See contacts in a live scene, with nothing resolved yet |
| 2 | v1: contact basis and velocity resolution | Make a body bounce |
| 3 | v1: penetration and friction | See where worst-first stops working on a stack |
| 4 | v2: normal impulses | Stop a body at the ground, with accumulated clamping |
| 5 | v2: Baumgarte and restitution | Correct drift and bounce properly |
| 6 | v2: friction | Hold a box on a slope |
| 7 | Persistent manifolds and warm starting | Stack 10 boxes |
| 8 | `makeSoft` | Test the softness math on its own |
| 9 | v3: the substep loop and fixed anchors | Step without re-running collision each substep |
| 10 | v3: soft bias and relax | Push out penetration without adding bounce |
| 11 | v3: restitution pass and speculative contacts | Finish Soft Step |
| 12 | The comparison demo and friction upgrade | Compare all three solvers |

#### Step 1: The solver seam

- [ ] `src/bodies/solver/solver.ts`: the `Solver` interface
- [ ] `src/bodies/solver/solver-settings.ts`: iterations, Baumgarte factor, slop, restitution threshold, warm starting on/off
- [ ] `World` owns a `CollisionPipeline` and hands the step to its solver
- [ ] Solver settings exposed in the UI

**Covers:** the step order as something each solver chooses. Add a `NullSolver` that integrates and then runs collision, so you can watch contacts appear before anything responds to them.

```ts
interface Solver {
  step(world: World, dt: number): void
}

interface SolverSettings {
  iterations: number               // about 10
  baumgarte: number                // about 0.2
  slop: number                     // about 0.005 m
  restitutionThreshold: number     // about 1 m/s
  warmStarting: boolean
  // Added for v3 in Step 9
  substeps: number                 // 4
  contactHertz: number             // 30
  contactDampingRatio: number      // 10
  contactSpeed: number             // 3 m/s
}

class World {
  // ...Phase 4 members
  readonly collision: CollisionPipeline
  solver: Solver
  addCollider(collider: Collider): void
  applyForces(dt: number): void    // used by every solver
}
```

| Solver | Order |
|---|---|
| v1 | forces → integrate → collide → resolve penetration → resolve velocity |
| v2 | forces → integrate velocities → collide → prepare → warm start → iterate → integrate positions → store impulses |
| v3 | forces → collide → prepare → per substep (integrate velocities → warm start → solve → integrate positions → relax) → restitution → store impulses |

**Done when:** bodies fall straight through the ground, with their contacts drawn as they pass.

#### Step 2: v1, velocity

- [ ] `src/bodies/solver/contact-basis.ts`: build a stable basis from a normal
- [ ] `src/bodies/solver/contact-resolver.ts`: v1, Millington-style resolver (worst contact first), velocity pass

**Covers:** contact coordinates, and velocity change per unit impulse: the single-contact formula in 3D with the angular terms. Derive it in your notes first.

```ts
function contactBasis(normal: Vec3Like, tangent1: Vec3, tangent2: Vec3): void   // same input, same output

class ContactResolver implements Solver {
  constructor(settings: SolverSettings)
  step(world: World, dt: number): void
}

interface ResolverContact {        // per point, private to v1
  manifold: ContactManifold; point: Contact
  readonly basis: Mat3x3           // contact space to world space
  readonly rA: Vec3; readonly rB: Vec3
  readonly contactVelocity: Vec3   // in contact space
  desiredDeltaVelocity: number
}
```

**Done when:** a ball with restitution 1 returns to its drop height within a few percent, and an off-center hit spins the body the correct way.

#### Step 3: v1, penetration, friction and resting

- [ ] Nonlinear position projection, split between linear and angular motion
- [ ] Removing the velocity added by the last step's acceleration, using `lastFrameAcceleration`
- [ ] Friction impulses
- [ ] Demo: *Restitution and friction lab*, first version

**Covers:** resting contact as tiny collisions, and the limits of resolving one contact at a time. Stop polishing as soon as this works.

**Done when:** a box rests on the ground, holds on a shallow ramp and slides on a steep one. A tall stack jittering here is expected, and it's the reason for v2.

#### Step 4: v2, normal impulses

- [ ] `src/bodies/solver/contact-solver.ts`: v2, sequential impulses, `prepare` and `solveVelocities` for the normal only

**Covers:** the effective mass and clamping the *accumulated* impulse rather than each increment.

```ts
interface ContactPoint {           // per point, solver-side
  readonly rA: Vec3; readonly rB: Vec3     // from each center of mass to the contact
  normalMass: number; tangentMass: [number, number]
  normalImpulse: number                    // accumulated, ≥ 0
  tangentImpulse: [number, number]         // accumulated, |P_t| ≤ μ·P_n
  velocityBias: number
}

class ContactSolver implements Solver {
  constructor(settings: SolverSettings)
  step(world: World, dt: number): void
  prepare(manifolds: ContactManifold[], count: number, dt: number): void
  warmStart(): void                // Step 7
  solveVelocities(): void          // one iteration
  storeImpulses(): void            // Step 7: copy back for next frame's warm start
}
```

Leave `pipeline.margin` at `0` for v1 and v2, so they only see contacts that are touching.

**Done when:** a dropped box comes to rest, slowly sinking, and accumulated normal impulses are never negative.

#### Step 5: v2, drift and bounce

- [ ] Baumgarte bias in `velocityBias`
- [ ] Restitution above the threshold

**Covers:** position error corrected through velocity, its energy cost, and why low-speed restitution has to be off.

**Done when:** a resting box stays at `slop` depth, and a ball with restitution 1 returns to its drop height within a few percent, then settles.

#### Step 6: v2, friction

- [ ] Two tangent rows per point, solved before the normal and clamped to `[−μ·Pₙ, μ·Pₙ]`

**Covers:** friction as constraints whose limit depends on another constraint, and the friction pyramid.

**Done when:** a box on a slope stays put when `tan θ < μ` and slides when `tan θ > μ`, and tangent impulses never exceed `μ·Pₙ`.

#### Step 7: Persistent manifolds and warm starting

- [ ] Persistent manifolds in `World`: match this step's contacts to last step's by body pair and feature ID
- [ ] `normalImpulse` and `tangentImpulse` fields on `Contact`, to carry impulses between steps
- [ ] `warmStart` and `storeImpulses`
- [ ] Demos: *Stacking* and *Dominoes*

**Covers:** carrying the answer between frames, the biggest single stacking improvement.

```ts
class ManifoldCache {
  // Copies impulses from last step's matching points onto this step's.
  match(manifolds: ContactManifold[], count: number): void
}
```

**Done when:** a 10-box stack drifts less than 1 cm over 10 s at 60 Hz with 10 iterations, and turning warm starting off makes it visibly worse.

#### Step 8: `makeSoft`

- [ ] `src/bodies/solver/softness.ts`: `makeSoft(hertz, dampingRatio, h)` → `{ biasRate, massScale, impulseScale }`, shared with Phase 7's joints

**Covers:** a constraint described as a damped spring, in hertz and damping ratio.

```ts
interface Softness { biasRate: number; massScale: number; impulseScale: number }

function makeSoft(hertz: number, dampingRatio: number, h: number, out?: Softness): Softness
// hertz = 0 is rigid: { biasRate: 0, massScale: 1, impulseScale: 0 }
```

**Done when:** the `makeSoft` tests below pass. No scene is needed yet.

#### Step 9: v3, the substep loop

- [ ] `src/bodies/solver/soft-step-solver.ts`: v3, Box3D's **Soft Step**: substeps, soft contacts, relax and restitution passes, speculative contacts. This step is the loop, using v2's rigid bias
- [ ] `deltaPosition` and `deltaRotation` on `RigidBody`, reset at the start of each step
- [ ] Anchors stored once per step, with separation estimated in each substep

**Covers:** running collision once and the solver many times, by estimating how each contact's separation has changed.

```ts
class RigidBody {
  // ...earlier members
  readonly deltaPosition = new Vec3()         // accumulated within the step
  readonly deltaRotation = new Quaternion()
}

class SoftStepSolver implements Solver {
  constructor(settings: SolverSettings)
  step(world: World, dt: number): void
}

interface SoftContactPoint extends ContactPoint {
  readonly localAnchorA: Vec3; readonly localAnchorB: Vec3   // fixed for the whole step
  readonly normal: Vec3
  baseSeparation: number                                     // s₀, from the narrowphase
  relativeVelocity: number                                   // before the solve, for restitution
}

function estimateSeparation(point: SoftContactPoint, bodyA: RigidBody, bodyB: RigidBody | null): number
```

Refresh derived data in every substep at first. That's the simple, correct version; only change it if profiling asks you to.

**Done when:** after a small motion, `estimateSeparation` matches a fresh narrowphase result within tolerance, and a dropped box stops at the ground.

#### Step 10: v3, soft bias and relax

- [ ] Soft contact bias from `makeSoft`
- [ ] The relax pass, with no bias on penetrating contacts

**Covers:** penetration pushed out like a damped spring, then the extra velocity removed so that push-out doesn't become bounce. This replaces Baumgarte and split impulses.

**Done when:** v3 with 4 substeps and 1 iteration keeps the 10-box stack within v2's drift bound, and a deep overlap separates no faster than `contactSpeed`, without launching.

#### Step 11: v3, restitution and speculative contacts

- [ ] A restitution pass after the substeps
- [ ] `pipeline.margin = 4 × slop`, and the `s > 0` branch of the bias

**Covers:** restitution as a separate pass, and contacts that begin before bodies touch.

**Done when:** a box released 1 cm above the ground lands without penetrating or bouncing, and a 100 kg box on a 1 kg box doesn't sink through. Record where v2 fails that same test.

#### Step 12: Comparison and upgrades

- [ ] Demo: *Solver comparison*, with substep and iteration sliders
- [ ] Demos: *Card house* and *Jenga*
- [ ] *Optional:* one friction constraint per manifold, plus twist and rolling friction
- [ ] Save and load scenes as JSON

**Covers:** a measured comparison, using the same scene and settings across all three solvers.

**Done when:** you can point at the scene where each solver fails and explain why.

#### Finishing up

- [ ] Export from the `bodies` barrels and `src/index.ts`

### Guidance

- **Do v1 first, briefly.** Millington's resolver builds intuition: a contact basis matrix (normal plus two tangents), velocity change per unit impulse, and resolving the worst contact while updating the others that share a body. Its nonlinear position projection splits the correction between linear and angular motion. Keep it working for the comparison demo, but don't polish it.
- **Effective mass along a direction `n`:** `1 / (invMₐ + invM_b + n·((I⁻¹ₐ(rₐ × n)) × rₐ) + n·((I⁻¹_b(r_b × n)) × r_b))`. Compute it once per point in `prepare` for the normal and for two tangents perpendicular to `n`.
- **Relative velocity** at a point, with `n` from B toward A: `v_rel = (vₐ + ωₐ × rₐ) − (v_b + ω_b × r_b)`; `vₙ = v_rel · n`, negative when approaching.
- **Normal impulse:** `λ = m_n · (target − vₙ)`, with `target = velocityBias`. Then clamp the *accumulated* impulse: `old = Pₙ; Pₙ = max(old + λ, 0); λ = Pₙ − old`. Apply `+λn` to A and `−λn` to B (linear `λ·invM`, angular `I⁻¹(r × λn)`). Clamping the accumulated value, not each increment, is what makes the iteration converge.
- **Friction:** for each tangent, `λ = m_t · (−v_t)`, then clamp the accumulated tangent impulse to `[−μ·Pₙ, μ·Pₙ]`. Solve friction before the normal in each iteration, so non-penetration has the last word.
- **Restitution:** in `prepare`, if the approach speed `−vₙ` exceeds a threshold (about 1 m/s), add `−e·vₙ` to `velocityBias`. Below the threshold, use `e = 0`, or resting objects never settle.
- **Baumgarte:** add `(β/dt) · max(pen − slop, 0)` to `velocityBias`, with `β ≈ 0.2` and `slop ≈ 0.005 m`. This is simple, but it adds energy: stacks "pop". Then try split impulses (solve the position bias into separate pseudo-velocities that are thrown away after integrating positions) or Box2D v3's soft step; Solver2D compares them on the same scenes.
- **Warm starting:** in `prepare`, copy `Pₙ` and `Pₜ` from last frame's matching point (same body pair and feature ID). Apply them as impulses before iterating. This is the single biggest stacking improvement.
- **Step order for sequential impulses:** integrate velocities from forces → collide → prepare → warm start → N velocity iterations → integrate positions → store impulses. Moving position integration after the solve is a change from Phase 4's order; `World.step` gets restructured here.
- **Static bodies** have zero inverse mass and inertia, so the same formulas work. Skip writing their velocities.

**v3: Box3D's Soft Step.** Build it once v2 stacks. It reuses v2's prepare, warm start and impulse code; what changes is the loop around it and the bias term.

- **The loop.** With `n` substeps (Box3D recommends 4) and `h = dt / n`: prepare once per step, then for each substep run integrate velocities → warm start → solve (with bias) → integrate positions → relax (without bias), one iteration each. After all substeps, run restitution (Box3D does 2 passes) and store impulses. `World.step` gets restructured again; keep v2's order selectable for the comparison demo.
- **Anchors stay fixed; separation is estimated.** Narrowphase runs once per step, not per substep. Store each contact's anchors relative to each body's center of mass, and track each body's accumulated `deltaPosition` and `deltaRotation` within the step. Inside a substep, estimate the current separation as `s = s₀ + n·((Δpₐ + Δqₐ·rₐ) − (Δp_b + Δq_b·r_b))` instead of recomputing contacts.
- **Soft contact bias.** With `ω = 2π·hertz` and damping ratio `ζ`: `biasRate = ω / (2ζ + hω)`, `impulseScale = 1 / (1 + hω(2ζ + hω))`, `massScale = 1 − impulseScale`. Then the normal update is `Δλ = −m_n·(massScale·vₙ + bias) − impulseScale·λ`, with:
  - `s > 0` (speculative, a gap): `bias = s / h` and `massScale = 1, impulseScale = 0`. The bodies may close the gap this substep but not cross it.
  - `s ≤ 0` (penetrating): `bias = max(massScale·biasRate·s, −contactSpeed)`. Penetration is pushed out like a damped spring, no faster than `contactSpeed`.
  Box3D's defaults are `contactHertz = 30`, `contactDampingRatio = 10` (heavily overdamped on purpose), `contactSpeed = 3 m/s`, and it doubles the hertz and halves the damping against static bodies.
- **Relax.** The relax pass solves with `bias = 0` for penetrating contacts (speculative ones keep `s / h`). It removes the velocity the push-out added, so separation doesn't become bounce. This replaces split impulses.
- **Restitution as its own pass.** Record the pre-solve normal velocity in `prepare`. After the substeps, for points whose approach speed exceeded `restitutionThreshold` (1 m/s) and that received impulse, solve for the target `−e·vₙ_initial`.
- **Friction per manifold (optional upgrade).** Box3D replaces per-point tangents with one 2D friction constraint at the manifold's friction center, clamped to a circle of radius `μ·ΣPₙ` (a true cone, not a pyramid), plus a twist-friction row about the normal. Rolling resistance is an angular row clamped by `resistance·radius·ΣPₙ`. Try per-point friction first, then this; the *Spinning top* and *Rolling* experiments show the difference.

### Where Aether differs from the book

- **v1 is the book's resolver**, kept as the baseline behind the `Solver` seam, not discarded. v2 (sequential impulses) and v3 (Soft Step) are not in the book.
- **The restitution threshold, warm starting, persistent manifolds, soft constraints, substeps and speculative contacts** are additions from Catto and Box3D. The book's resting-contact handling (micro-collisions with the last step's acceleration removed) lives only in v1.
- **Friction:** the book applies static and dynamic friction per contact inside its resolver; v2 clamps two tangent impulses per point (a pyramid), and v3 can upgrade to one friction cone per manifold.

### Tests

- A ball with restitution 1 dropped onto a static plane returns to its drop height within a few percent.
- A box on a slope stays put when `tan θ < μ` and slides when `tan θ > μ`.
- A 10-box stack settles and drifts less than 1 cm over 10 s at 60 Hz with 10 iterations and warm starting on.
- The same stack with warm starting off visibly sinks or jitters (assert drift is larger, as documentation).
- Accumulated normal impulses are never negative; tangent impulses never exceed `μ·Pₙ`.
- `makeSoft`: `massScale + impulseScale = 1` for any input; `hertz = 0` is rigid (`biasRate = 0`, `massScale = 1`, `impulseScale = 0`); as `hertz → ∞`, `biasRate → 1/h` and `massScale → 1`.
- v3 with 4 substeps and 1 iteration keeps the 10-box stack within the same drift bound as v2 with 10 iterations.
- v3, speculative contacts: a box released 1 cm above the ground (inside the speculative margin) lands without penetrating or bouncing.
- v3, mass ratio: a 100 kg box resting on a 1 kg box doesn't sink through (Box3D's *HighMassRatio* robustness sample). Record where v2 fails the same test.

**Demos**
- *Restitution and friction lab*: balls and boxes on an adjustable ramp
- *Stacking*: towers and pyramids; toggle warm starting and watch them collapse
- *Dominoes*
- *Solver comparison*: the same scene with Millington's resolver, sequential impulses and Soft Step side by side, with substep and iteration sliders
- *Card house* and *Jenga* (Box3D samples): hard stacking tests that separate a good solver from a merely working one

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Erik Neumann, [myPhysicsLab: Rigid Body Collisions](https://myphysicslab.com/engine2D/collision-en.html) | Physics of Collisions for Rigid Bodies in 2 Dimensions; Collision Impulse; Solving for the Impulse Parameter | The impulse formula derived step by step in 2D. Read it first. |
| Same page | Multiple Impacts; Resting Contact; Energy Bar Graph | Why naive impulses get stuck at rest, which motivates the rest of this phase. The energy graph is a good debug view for `e = 1` tests. |
| Chris Hecker, [Physics, Part 3: Collision Response](https://www.chrishecker.com/Rigid_Body_Dynamics) | All | The same derivation including angular effects, then revisit Part 4 for the 3D form. |
| Millington ch. 14 | §14.1 Impulses and Impulsive Torques (pp. 301–306) | How an impulse at a point changes linear and angular velocity. |
| Millington ch. 14 | §14.2 Collision Impulses (pp. 306–321): §14.2.1 *Change to Contact Coordinates*, §14.2.2 *Velocity Change by Impulse*, §14.2.3–14.2.6 | The contact basis matrix and velocity-per-unit-impulse: the v1 resolver's core. |
| Millington ch. 14 | §14.3 Resolving Interpenetration (pp. 321–330): linear vs nonlinear projection, avoiding excessive rotation | Why the naive linear projection looks wrong, and the nonlinear fix. |
| Millington ch. 14 | §14.4 The Collision Resolution Process (pp. 330–349) | The full v1 pipeline: preparing contact data, resolving penetration, then velocity. §14.4.5 *Alternative Update Algorithms* points toward iterative solvers. |
| Millington ch. 15 | §15.1 Resting Forces (pp. 352–354); §15.2 Micro-collisions (pp. 354–358) | Resting contact as many tiny impulses; removing accelerated velocity; lowering restitution at low speed. |
| Millington ch. 15 | §15.3 Types of Friction (pp. 358–362); §15.4 Implementing Friction (pp. 362–373); §15.5 Friction and Sequential Contact Resolution (pp. 373–374) | Static vs dynamic friction and friction as impulses in the v1 resolver. |
| Millington App. B | Useful Friction Coefficients for Games (p. 434) | Default `friction` values for materials. |
| Newcastle University, [Collision Response](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/5collisionresponse/Physics%20-%20Collision%20Response.pdf) (11 pages) | The Projection Method; The Impulse Method; Coefficient of restitution; Combined Impulse Calculation | A compact second explanation of projection plus impulse, as in a real engine codebase. |
| Witkin & Baraff, *PBM* notes ([Stanford PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf)) | Baraff, "Rigid Body Simulation" Part II: §6 *Problems of Nonpenetration Constraints*, §8 *Colliding Contact*, §9 *Resting Contact* (PDF pp. 56–78) | The rigorous view: resting contact as a complementarity problem. Optional depth; it explains what iterative solvers approximate. |
| Erin Catto, [Fast and Simple Physics using Sequential Impulses](https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf) (GDC 2006) | All | **The** reference for v2. |
| [box2d-lite](https://github.com/erincatto/box2d-lite) | `Arbiter.cpp` | The whole solver in about 200 lines. |
| Allen Chou, Game Physics series | [Resolution – Constraints & Sequential Impulse](http://allenchou.net/2013/12/game-physics-constraints-sequential-impulse/), then [Resolution – Contact Constraints](http://allenchou.net/2013/12/game-physics-resolution-contact-constraints/): Derivation; Clamping The Lagrangian Multiplier; Baumgarte Stabilization; Restitution; Frictions | The 3D contact Jacobian and every bias term, in the same order you'll implement them. Read the comments too: Catto weighs in. |
| Allen Chou | [Stability – Slops](http://allenchou.net/2014/01/game-physics-stability-slops/); [Stability – Warm Starting](http://allenchou.net/2014/01/game-physics-stability-warm-starting/): Frame Coherence; Warm Starting | Slop values and how cached impulses are reapplied. |
| Nilson Souto, [Video Game Physics Tutorial, Part III](https://www.toptal.com/game/video-game-physics-part-iii-constrained-rigid-body-simulation) | Inequality Constraints; Impulse-Based Dynamics → Sequential Impulses, Projected Gauss-Seidel, Simulating Friction Using Impulses | Shows that sequential impulses and PGS are the same algorithm. |
| Erin Catto, [Solver2D](https://box2d.org/posts/2024/02/solver2d/) | All | Position-correction strategies compared on the same scenes. |
| Glenn Fiedler, [Collision Response and Coulomb Friction](https://gafferongames.com/post/collision_response_and_coulomb_friction/) | All | A practical summary. |
| Macklin et al., [Small Steps in Physics Simulation](https://mmacklin.com/smallsteps.pdf) (SCA 2019) | §1–4 and the results figures | Why substeps with one iteration beat iterations: the argument behind v3. |
| Erin Catto, [Releasing Box2D 3.0](https://box2d.org/posts/2024/08/releasing-box2d-3.0/) | Solver; Continuous | Soft Step and speculative contacts as shipped, with the reasoning. |
| NVIDIA, [PhysX 4.0 Rigid Body Dynamics](https://gameworksdocs.nvidia.com/PhysX/4.0/documentation/PhysXGuide/Manual/RigidBodyDynamics.html) | Solver types (PGS vs TGS) | Temporal Gauss–Seidel, PhysX's relative of Soft Step. |
| Paul Firth, [Speculative Contacts](https://web.archive.org/web/2011/http://www.wildbunny.co.uk/blog/2011/03/25/speculative-contacts-an-continuous-collision-engine-approach-part-1/) (archived) | Part 1 | The speculative-contact idea in its simplest form. |
| Bender, Erleben & Trinkle, [Interactive Simulation of Rigid Body Dynamics](https://perso.liris.cnrs.fr/fzara/Web/media/files/M2-Animation/cgf12272.pdf) (CGF 2014) | Friction and stabilization sections | Friction cones vs pyramids, and a survey of every stabilization scheme in this phase. Optional depth. |
| Box3D `src/solver.c` (`b3SolverTask` stage loop), `src/solver.h` (`b3MakeSoft`), `src/contact_solver.c` | Prepare, warm start, solve, relax, restitution; friction center, twist, rolling resistance | The production v3. Read after yours works; the comments explain each choice. |

More: [RESOURCES.md, Phase 6](./RESOURCES.md#phase-6-collision-response-and-friction)

**Done when:** a 10-box stack stands still at 60 Hz with about 10 iterations (v2), and with 4 substeps and 1 iteration (v3).

---

## Phase 7: Joints, sleeping and stability

**Goal:** articulated bodies, and an engine that scales.

**Concepts:** constraints as Jacobians (Catto's "Modeling and Solving Constraints"); ball-socket, hinge, slider, distance and fixed joints; limits and motors; soft constraints (frequency and damping ratio); simulation islands (union-find); sleeping and waking; solver ordering and determinism.

### Build

Start by moving contacts behind a general `Constraint` interface. Then add joints from the simplest, one row, to the hardest. Islands and sleeping come after, since they're about scale rather than correctness.

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | `Constraint`, with contacts migrated | Solve everything in one list, with Phase 6's results unchanged |
| 2 | `DistanceJoint` | Swing a pendulum and build Newton's cradle |
| 3 | `BallSocketJoint` | Hang a chain |
| 4 | `HingeJoint` axis | Build a door |
| 5 | Hinge limits and motors | Drive a car |
| 6 | `FixedJoint` | Weld two bodies |
| 7 | Soft joints | Give any joint a frequency and damping ratio |
| 8 | Ragdoll | Combine the joints on one figure |
| 9 | Islands | Group bodies that affect each other |
| 10 | Sleeping | Stop simulating bodies at rest |
| 11 | Stats and determinism | Measure a step and repeat a run exactly |
| 12 | Box3D extensions | Add more joints, events and sensors |

#### Step 1: The constraint interface

- [ ] `src/bodies/solver/constraint.ts`: a `Constraint` interface that contacts also implement
- [ ] `src/bodies/solver/contact-constraint.ts`: one per manifold
- [ ] v2 and v3 iterate over `Constraint`s
- [ ] `World.addJoint` and `World.removeJoint`

**Covers:** the idea that a contact is just a constraint with an inequality clamp. The hook has to fit v3's solve and relax passes, so it takes a `useBias` argument. Leave v1 as it is, for the comparison demo.

```ts
interface Constraint {
  readonly bodyA: RigidBody
  readonly bodyB: RigidBody | null
  prepare(dt: number): void
  warmStart(): void
  solveVelocity(useBias: boolean): void
  solvePosition?(): boolean        // optional; true when the error is within tolerance
}
```

**Done when:** every Phase 6 test passes unchanged. If a stack test moves, the migration changed behavior.

#### Step 2: Distance joint

- [ ] `src/bodies/joints/distance-joint.ts`: `DistanceJoint`
- [ ] Demo: *Newton's cradle*

**Covers:** the recipe from `C` to `J` to `K` to `λ`, on its simplest case: one row, with a scalar effective mass.

```ts
class DistanceJoint implements Constraint {
  constructor(a: RigidBody, b: RigidBody | null, worldAnchorA: Vec3Like, worldAnchorB: Vec3Like)
  length: number                   // defaults to the initial distance
}
```

Joints turn world anchors into body-local ones at construction, and every later joint does the same.

**Done when:** a pendulum keeps its length within tolerance over 10 s.

#### Step 3: Ball-socket joint

- [ ] `Mat3x3.setSkewSymmetric(v)` (`M · w == v × w`) and `Mat3x3.add(m)`, deferred from Phase 1. The ball-socket `K` matrix needs both. Test first
- [ ] `src/bodies/joints/ball-socket-joint.ts`: `BallSocketJoint`
- [ ] Demo: *Chain bridge*

**Covers:** a three-row block solved together, with a matrix for the effective mass.

```ts
class BallSocketJoint implements Constraint {
  constructor(a: RigidBody, b: RigidBody | null, worldPivot: Vec3Like)
}
```

**Done when:** a hanging chain keeps all its anchors coincident, and `setSkewSymmetric(v).transformVec3(w)` equals `v × w`.

#### Step 4: Hinge axis

- [ ] `src/bodies/joints/hinge-joint.ts`: `HingeJoint`, ball-socket rows plus two angular rows

**Covers:** angular constraint rows, and using two perpendicular vectors to hold an axis.

```ts
class HingeJoint implements Constraint {
  constructor(a: RigidBody, b: RigidBody | null, worldPivot: Vec3Like, worldAxis: Vec3Like)
  angle(): number                  // relative rotation about the axis
}
```

**Done when:** the hinge keeps its axis aligned under off-axis torque, and spins freely about the axis.

#### Step 5: Hinge limits and motors

- [ ] Limits and a motor on `HingeJoint`
- [ ] Demo: *Car*, with hinge-joint wheels and motors

**Covers:** a one-sided row, clamped like a contact, and a row with a target speed and a bounded impulse.

```ts
class HingeJoint implements Constraint {
  // ...Step 4 members
  enableLimit(lower: number, upper: number): void
  enableMotor(speed: number, maxTorque: number): void
}
```

**Done when:** a limited hinge never exceeds its limits, and a motor reaches its target speed unloaded without exceeding `maxTorque`.

#### Step 6: Fixed joint

- [ ] `src/bodies/joints/fixed-joint.ts`: `FixedJoint`

**Covers:** a rotation error taken from the relative orientation, using the rest orientation captured at construction.

```ts
class FixedJoint implements Constraint {
  constructor(a: RigidBody, b: RigidBody | null, worldPivot: Vec3Like)
}
```

**Done when:** two welded bodies move as one under gravity and off-center hits.

#### Step 7: Soft joints

- [ ] `frequencyHz` and `dampingRatio` on each joint, using `makeSoft`

**Covers:** one softness model across contacts and joints. Clamp stiffness to a quarter of the substep rate.

```ts
interface SoftJoint {
  frequencyHz: number              // 0 for rigid
  dampingRatio: number
}
```

**Done when:** a soft distance joint oscillates at close to its set frequency, and `frequencyHz = 0` matches the rigid result.

#### Step 8: Ragdoll

- [ ] Demo: *Ragdoll*, using ball-socket and hinge joints with limits

**Covers:** several joint types working together, and high mass ratios between limbs. Cone and twist limits come in Step 12, so expect some unnatural poses here.

**Done when:** the figure falls, lands and settles without exploding.

#### Step 9: Islands

- [ ] `src/bodies/islands.ts`: union-find island builder, rebuilt every step

**Covers:** bodies and constraints as a graph, with static bodies left out of it.

```ts
class IslandBuilder {
  build(bodies: RigidBody[], constraints: Constraint[]): void
  readonly islands: readonly Island[]
}

interface Island {
  readonly bodies: RigidBody[]
  readonly constraints: Constraint[]
}
```

**Done when:** two separate stacks form two islands, and a body touching only the ground is its own island.

#### Step 10: Sleeping

- [ ] Sleeping on `RigidBody` and `World`: `isAwake`, `sleepTime`, `wake()`
- [ ] Demo: *Sleep visualizer*, tinting sleeping bodies and coloring by island

**Covers:** putting whole islands to sleep, and the events that wake them.

```ts
class RigidBody {
  // ...earlier members
  isAwake = true
  sleepTime = 0
  wake(): void
}

interface WorldSettings {
  // ...earlier members
  enableSleep: boolean
  sleepLinearTolerance: number
  sleepAngularTolerance: number
  sleepTimeThreshold: number       // 0.5 s
}
```

**Done when:** sleeping bodies don't move, and a sleeping island wakes when an awake body hits it.

#### Step 11: Stats and determinism

- [ ] `World.stats`: time per phase (broadphase, narrowphase, solve, integrate)
- [ ] A stable order for every list, checked by a determinism test

**Covers:** measuring the step without allocating, and treating repeatability as something tests can check.

```ts
interface WorldStats {
  broadphase: number; narrowphase: number; solve: number; integrate: number   // ms, last step
  awakeBodies: number; islands: number; contacts: number
}
```

**Done when:** running the same scene twice gives bit-identical body states, and 500 boxes settle, sleep and let the frame rate recover.

#### Step 12: Box3D extensions

- [ ] *Box3D extensions:* `SphericalJoint` with cone and twist limits (for the ragdoll), `PrismaticJoint`, `WheelJoint`; breakable joints; contact begin/end/hit events and sensor shapes

**Covers:** joint-specific limits, plus events gathered during the step and read afterward. Do these in whatever order your demos need them.

```ts
interface ContactEvents {
  readonly begin: ContactManifold[]
  readonly end: ContactManifold[]
  readonly hit: { manifold: ContactManifold; approachSpeed: number }[]
}

class World {
  // ...earlier members
  readonly contactEvents: ContactEvents    // cleared at the start of each step
}
```

**Done when:** a joint breaks at its threshold, a sensor reports overlap without applying force, and no user code runs inside the solver.

#### Finishing up

- [ ] Export from the `bodies` barrels and `src/index.ts`

### Guidance

- **The general recipe.** Write the position constraint `C(x) = 0`. Differentiate to get `Ċ = J·v`, where `v` stacks both bodies' linear and angular velocities. The effective mass is `K⁻¹ = (J·M⁻¹·Jᵀ)⁻¹`; each iteration computes `λ = −K⁻¹·(J·v + b)` and applies `Δv = M⁻¹·Jᵀ·λ`. Contacts from Phase 6 are this recipe with an inequality clamp. Derive each joint's `J` in your notes before coding it.
- **Distance joint:** `C = |p_b − pₐ| − L`; `J` is along the unit vector `u` between the anchors, with the angular terms `rₐ × u` and `r_b × u`. One row.
- **Ball-socket:** `C = p_b − pₐ` (three rows). Solve all three together: `K = (invMₐ + invM_b)·I − [rₐ]ₓ·I⁻¹ₐ·[rₐ]ₓ − [r_b]ₓ·I⁻¹_b·[r_b]ₓ`, using `Mat3.setSkewSymmetric` and `Mat3.invert`.
- **Hinge:** ball-socket plus two angular rows. Keep B's hinge axis perpendicular to two vectors that are perpendicular to A's axis. A **limit** is a one-sided angular row about the axis, clamped like a contact. A **motor** is a row targeting a relative angular speed, with accumulated impulse clamped to `±maxTorque·dt`.
- **Fixed joint:** ball-socket plus three angular rows from the relative orientation error (the vector part of `q_b · q_rest⁻¹ · qₐ*`).
- **Soft constraints:** given frequency `f` and damping ratio `ζ`, with effective mass `m`: `ω = 2πf`, `k = m·ω²`, `c = 2·m·ζ·ω`. Then softness `γ = 1 / (dt·(c + dt·k))` and bias factor `β = dt·k / (c + dt·k)`. Use `1 / (K + γ)` as the effective mass and add `γ·λ_accumulated` to the velocity error. `f = 0` means rigid.
  If you built v3 in Phase 6, this is the same `makeSoft` written differently: `biasRate`, `massScale` and `impulseScale` are `β/dt`, `K/(K + γ)` and `γ/(K + γ)` in disguise. Use `makeSoft` for joints too, so contacts and joints share one softness model. Box3D clamps joint stiffness to a quarter of the substep rate, because a spring stiffer than the step can resolve is just a rigid constraint with extra error.
- **Box3D's joint set** is a good target list once the four above work: revolute (= hinge) with spring, limit and motor; prismatic (slider); spherical (= ball-socket) with a cone limit and twist limits, the ragdoll joint; weld (= fixed) with separate linear and angular stiffness; wheel (suspension spring plus steering); motor; distance with spring, limits and motor. Each joint can break when its impulse exceeds a force or torque threshold.
- **Islands:** union-find (path compression, union by rank) over dynamic bodies linked by touching contacts and joints. Static bodies never join islands; otherwise everything on the ground becomes one island.
- **Persistent islands (Box3D).** Rebuilding islands every step is simple and is the right first version. Box3D keeps islands across steps instead: they merge immediately when a contact begins touching, but split lazily, at most one island per step and only when that island is a candidate for sleep. Islands exist only to decide sleep, not to order the solver. Read Catto's *Simulation Islands* post after your union-find version works, and measure the difference on 500 boxes.
- **Events (Box3D).** Games need to know what happened, not just where bodies are. Collect contact begin/end events (a manifold gained or lost all its points), hit events (approach speed above a threshold) and sensor overlap events into arrays on `World` during the step, and let callers read them afterward. Never call user code from inside the solver.
- **Sleeping:** each body accumulates `sleepTime` while `|v|² < linTol²` and `|ω|² < angTol²`, and resets it otherwise. When every body in an island has `sleepTime > 0.5 s`, put the whole island to sleep: zero the velocities and skip it in integration and solving. A body wakes on contact with an awake body, when a joint partner wakes, or when user code applies a force or sets its state.
- **Determinism:** iterate bodies and constraints in a stable order (array order, never by object identity); never use `Math.random()` in the engine; keep constraint creation order stable when reloading a scene.
- **Profiling:** `performance.now()` around each pipeline stage, written into a reused `World.stats` object; no allocation per step.

### Where Aether differs from the book

- **Joints are velocity constraints with Jacobians** (Catto) solved by v2 and v3, not contacts generated to hold bodies together as in the book's `Joint` (§17.2.1). Each solver reports which joints it supports; v1 can gain the book's contact-based joints as an option.
- **Islands** come from union-find over bodies and constraints. The book groups contacts that share bodies (§16.2.3) for its resolver; here islands only decide sleep.
- **Sleep thresholds are per island**, with linear and angular tolerances and a time threshold (Box3D). The book tracks a recency-weighted average of each body's motion (§16.2.1).
- **Events, sensors, stats and determinism tests** are additions from Box3D.

### Tests

- A pendulum on a distance joint keeps its length within tolerance over 10 s.
- A ball-socket chain hanging under gravity keeps all anchors coincident.
- A hinge keeps its axis aligned when a torque is applied off-axis; a limited hinge never exceeds its limits.
- A motor reaches its target speed when unloaded, and doesn't exceed `maxTorque`.
- Islands: two separate stacks form two islands; a body touching only the ground is its own island.
- Sleeping bodies don't move; a sleeping island wakes when hit by an awake body.
- Determinism: running the same scene twice gives bit-identical body states.

**Demos**
- *Ragdoll*
- *Chain bridge and Newton's cradle*
- *Car* with hinge-joint wheels and motors
- *Sleep visualizer*: tint sleeping bodies; color bodies by island

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 16 | §16.1 Stability (pp. 375–383): quaternion drift, interpenetration on slopes, integration stability, pessimistic collision detection, mathematical accuracy | A checklist of stability bugs to test for. |
| Millington ch. 16 | §16.2 Optimizations (pp. 383–397): §16.2.1 *Sleep*, §16.2.2 *Margins of Error*, §16.2.3 *Contact Grouping* | Sleeping, tolerances, and grouping contacts, the precursor to islands. |
| Millington ch. 17 | §17.2.1 *Ragdolls* (pp. 402–405); §17.3 Limitations of the Engine (pp. 418–419): stacks, reaction-force friction, joint assemblies, stiff springs | Joints built from contacts, and an honest list of what the v1 approach can't do. |
| Millington ch. 18 | §18.1 Simultaneous Contact Resolution (pp. 423–428): the Jacobian, the linear complementarity problem; §18.2 Reduced Coordinate Approaches (p. 428) | The bridge from the book's approach to Catto's. |
| Allen Chou, [Physics Constraints in Games Part 1 – Constraint Basics](https://www.youtube.com/watch?v=MTVdBgQY9LY) (video) | All | A visual introduction to constraints before the derivations. |
| Andrew Witkin, [Constrained Dynamics](https://www.cs.cmu.edu/~baraff/pbm/constraints.pdf) (13 pages) | All: Constraint Forces; The principle of virtual work; The general case; Building the matrices; Block-structured matrices; Solving the linear system; Feedback | The force-level derivation of `J·M⁻¹·Jᵀ·λ`. Catto's slides are the impulse-level version of this paper. |
| Erin Catto, [Modeling and Solving Constraints](https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf) (GDC 2009) | All | Jacobians and joint derivations; the main reference for `joints/`. |
| myselph.de, [Game Physics – Equality Constraints & Solver](https://web.archive.org/web/20211022100314mp_/http://myselph.de/gamePhysics/equalityConstraints.html) (archived) | Impulse and Force Based Constraints; Computing Constraint Impulses; Constraint Solver; Example: Complete Joint Constraint Derivation | A worked derivation following Catto's GDC 2009 talk. It is 2D, so use it to check your reasoning, then redo the derivation in 3D. |
| Nilson Souto, [Video Game Physics Tutorial, Part III](https://www.toptal.com/game/video-game-physics-part-iii-constrained-rigid-body-simulation) | What are Constraints?; An Example: Equality Constraints; Systems of Constraints; Optimizations → Islands, Sleeping | Constraint theory with a worked pendulum, then islands by graph search and sleeping. |
| Newcastle University, [Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | Tutorial 8, *Constraints and Solvers* | Constraints as course notes. |
| Erin Catto, [Soft Constraints](https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf) (GDC 2011) | All | Frequency and damping ratio. |
| Erin Catto, [Understanding Constraints](https://box2d.org/files/ErinCatto_UnderstandingConstraints_GDC2014.pdf) (GDC 2014) | All | A second pass after building the joints. |
| [Jolt Physics docs](https://jrouwe.github.io/JoltPhysics/) | Islands, sleeping, the step pipeline | How a production engine organizes it. |
| Erin Catto, [Simulation Islands](https://box2d.org/posts/2023/10/simulation-islands/) (2023) | All | Persistent islands with lazy splitting, and why Box2D v3 and Box3D use islands only for sleep. |
| Box3D `src/joint.c`, `src/revolute_joint.c`, `src/spherical_joint.c`, `src/weld_joint.c`, `src/island.c`, `src/solver_set.c`, `src/sensor.c`; `docs/simulation.md` | Joint prepare/warm start/solve; island merge and split; moving sleeping islands into solver sets; sensor events | Production versions of this phase. The *Ragdoll*, *Bridge*, *Door* and *Driving* samples match this phase's demos. |
| Witkin, Gleicher & Welch, [Interactive Dynamics](https://dl.acm.org/doi/pdf/10.1145/91394.91400) (*ACM SIGGRAPH Computer Graphics*, 1990) | All | Optional history: interactive constraint-based dynamics, from the same author as the constrained-dynamics notes. |
| Barzel & Barr, [A Modeling System Based on Dynamic Constraints](https://hal.science/hal-01968730/document) (SIGGRAPH 1988) | All | Optional history: the origin of solving for constraint forces on rigid bodies. The HAL site may require opening in a browser. |
| Maloisel, Grandia, Schumacher, Knoop & Bächer, [A Versatile Quaternion-based Constrained Rigid Body Dynamics](https://la.disneyresearch.com/wp-content/uploads/A_Versatile_Quaternion_based_Constrained_Rigid_Body_Dynamics.pdf) (Disney Research, *ACM TOG* 2025, 17 pages) | After your joints work | Research level: implicit integration that guarantees constraint satisfaction, with kinematic loops and redundant constraints. Read for where the field is now, not to implement. |

More: [RESOURCES.md, Phase 7](./RESOURCES.md#phase-7-joints-sleeping-and-stability)

**Done when:** 500 boxes settle, fall asleep, and the frame rate recovers.

---

## Phase 8: Stretch goals

Pick whatever interests you most.

- **Continuous collision detection (CCD):** conservative advancement or time of impact (Catto, GDC 2013). Demo: a bullet through a thin wall, with CCD off and on.
  *Approach:* only for fast, small bodies (speed · dt > a fraction of their size). Compute time of impact with conservative advancement on the GJK distance, then substep or clamp motion to that time. Box3D's split is a good model: speculative contacts (Phase 6) for everything, TOI against static geometry for fast dynamic bodies, and TOI against dynamic bodies only for bodies flagged `isBullet`. Bodies are moved back to their first time of impact at the end of the step (`b3SolveContinuous` in `src/solver.c`; *Bullet vs Stack*, *Thin Wall* and *Spinning Stick* samples).
- **Character mover (Box3D):** a kinematic capsule that slides along walls and climbs steps, built on shape casts. Cast the capsule along the desired motion, collect the planes it hits, solve for a velocity that respects all of them, and clip the motion. Box3D's `docs/character.md` and `src/mover.c` (`b3World_CastMover`, `b3SolvePlanes`, `b3ClipVector`) are a compact reference. Demo: walk a character around the stacking scenes.
- **Graph coloring and a parallel solver (Box3D):** color constraints so no two in one color share a dynamic body; constraints in one color can then be solved in any order, or in parallel. Box3D uses 24 colors with an overflow color solved serially, and doesn't color static bodies. In Aether this is the prerequisite for solving across Web Workers, and it changes solver order, so check determinism afterward (*SIMD Matters*; `src/constraint_graph.c`).
- **Struct-of-arrays body storage (Box3D):** split body data into hot per-step state (velocity, delta position, delta rotation) packed in `Float64Array`s and cold data (shape, user data). Box3D keeps awake and sleeping bodies in separate *solver sets* so the awake arrays stay contiguous. Measure before and after.
- **Contact recycling (Box3D):** skip narrowphase for a pair whose relative pose has barely changed since its manifold was last computed, and only re-estimate the separations. Resting stacks and bodies moving together (a box on a moving platform) then cost almost nothing in narrowphase, and contact points stop flickering.
  *Prerequisites:* Phase 5's one-shot manifolds, Phase 6's persistent manifolds, and v3's fixed anchors with a separation estimate. Recycling is the same estimate applied across steps instead of substeps.
  *Approach:*
  1. On a fresh manifold, cache the relative transform `T_A⁻¹·T_B`, both orientations `qA₀` and `qB₀`, and each point's `baseSeparation`.
  2. Each step, compute `movement = |Δp_rel| + angle(Δq_rel)·maxExtent`. Here `maxExtent` is the larger body's bounding radius about its center of mass (ignore static bodies), and `angle ≈ 2·|xyz part of Δq|`, so no trig is needed.
  3. If `movement` is under the tolerance *and* the rotation is under a separate angle tolerance, reuse the manifold. Keep the normal and anchors fixed in world space, and set each point's `s = baseSeparation + n·((c_B − c_A) + (ΔqB·rB − ΔqA·rA))`, with `Δq = q·q₀⁻¹`.
  4. Otherwise run narrowphase and re-cache.
  *Pitfalls:*
  - Never re-cache while recycling, or error accumulates.
  - Body-space normals and anchors misbehave for rolling shapes; keep them in world space.
  - Without the angle tolerance, the frozen normal can drift and break pairs that a joint also holds together.
  - Tolerances beyond a few centimeters show visible artifacts.
  - Add a per-body opt-out (Box3D's `enableContactRecycling`) and turn it off for character movers.
  *Tests:*
  - A settled 10-box stack produces the same body states with recycling on and off, within tolerance.
  - On the 500-box scene, `World.stats` shows narrowphase time dropping.
  - A pair recycles while it stays under tolerance, and gets a fresh manifold on the step it crosses.
- **Static meshes and height fields (Box3D):** triangle meshes with an internal BVH, and height fields for terrain, both static only. The hard part is *internal edges*: a box sliding across two coplanar triangles catches on the shared edge. Box3D precomputes edge flags (`identifyEdges`) to suppress those contacts.
- **Recording and replay (Box3D):** record every API call and step; replay it and compare state bit for bit. Combined with determinism, this turns any physics bug report into a reproducible test (`src/recording.c`, `src/replay.c`).
- **The engine in a Web Worker:** the simulation runs off the main thread; transforms come back through a `SharedArrayBuffer` (requires COOP/COEP headers in Vite).
  *Approach:* a message protocol of plain objects (`{ type: 'addBody', … }`), body state packed into a `Float64Array` (7 numbers per body: position + quaternion), double-buffered so the renderer never reads a half-written frame.
- **Determinism:** same inputs, same output, bit for bit; record and replay (Box2D's determinism post).
- **XPBD solver:** Müller's extended position-based dynamics as a fourth `Solver` implementation, compared with the other three on the same scenes; soft bodies and cloth.
- **Particles in the rigid-body world:** run particles as bodies with linear motion only through `World` and its solver, so ropes can hang from boxes and particles can hit rigid bodies. The book keeps the two engines separate; this merges them once both are complete, keeping `ParticleWorld` for scenes that need nothing else.
- **Performance:** struct-of-arrays layout in `Float64Array`s; object pooling; benchmark against cannon-es.
- **WebGPU:** move rendering to `WebGPURenderer`; later, a GPU broadphase.
- **Publishing the engine to npm** (the build and package setup below are done; TypeDoc isn't):
  - The package name `aether-physics` (`aether` is taken), which isn't reserved until the first publish.
  - Vite library mode building `src/index.ts`; `tsc --emitDeclarationOnly` for `.d.ts` files (a separate `tsconfig.build.json`, since the main config uses `noEmit`).
  - `package.json`: `exports` with `.` and `./math` subpaths, `"sideEffects": false`, `files: ["dist"]`, and `three` and `lit` absent from `dependencies`.
  - API docs generated from the TSDoc comments with TypeDoc; semantic versioning from 0.x.
- **Publishing the playground:** deploy to GitHub Pages; record GIFs for the README.
- **Better aerodynamics:** replace the linear lift curve with real airfoil data, add induced drag, and give the aircraft stability.
  *Approach:* load a `C_L(α)` / `C_D(α)` table from Airfoil Tools and interpolate it; build the forces per surface as in Phase 4.

### Resources

| Goal | Resource | Sections | Use it for |
|---|---|---|---|
| CCD | Erin Catto, [Continuous Collision](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf) (GDC 2013) | All | Time of impact and conservative advancement. |
| Determinism | Erin Catto, [Determinism](https://box2d.org/posts/2024/08/determinism/) | All | Cross-platform floating-point pitfalls. |
| Parallel solver | Erin Catto, [SIMD Matters](https://box2d.org/posts/2024/08/simd-matters/) | All | Graph coloring and the wide contact solver. |
| Collision performance | Erin Catto, [SIMD for Collision](https://box2d.org/posts/2026/07/simd-for-collision/); [Contact Recycling](https://box2d.org/posts/2026/10/contact-recycling/) (2026) | All | Box3D's narrowphase optimizations, including reusing manifolds when relative motion is tiny. |
| Contact recycling | Erin Catto, [Contact Recycling](https://box2d.org/posts/2026/10/contact-recycling/) (2026); Box2D [PR #1038](https://github.com/erincatto/box2d/pull/1038) and [issue #1046](https://github.com/erincatto/box2d/issues/1046); Box3D `src/physics_world.c` (`B3_CONTACT_RECYCLE_DISTANCE`) | All | The algorithm, the original change, and the joint failure case that motivates the rotation tolerance. |
| Contact recycling, prior art | [Bepu Physics](https://www.bepuentertainment.com/); NVIDIA, [PhysX persistent contact manifolds](https://nvidia-omniverse.github.io/PhysX/physx/5.8.0/docs/AdvancedCollisionDetection.html#persistent-contact-manifold-pcm); adoption in [Rapier #973](https://github.com/dimforge/rapier/pull/973) and [Avian #1033](https://github.com/avianphysics/avian/pull/1033) | PhysX's persistent-manifold section; the two PRs | Where the fixed-anchor idea came from, PhysX's competing approach, and two independent ports of the idea to compare against. |
| Rigid-body XPBD | Müller et al., [Detailed Rigid Body Simulation with XPBD](https://matthias-research.github.io/pages/publications/PBDBodies.pdf) (2020) | All | XPBD for rigid bodies, also substepped. Compare it with Soft Step on the same scenes, as Solver2D does. |
| Character mover, CCD, determinism | Box3D [`docs/character.md`](https://github.com/erincatto/box3d/blob/main/docs/character.md), [`docs/simulation.md`](https://github.com/erincatto/box3d/blob/main/docs/simulation.md) | Mover; Bullets; Determinism | Short, production-tested write-ups of each. |
| Web Worker | MDN, [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | All | The message protocol and transferables. |
| XPBD, soft bodies | Müller et al., [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf) | All | The full method. |
| Soft-body contact | Chen, Hsu, Liu, Macklin, Yang & Yuksel, [Offset Geometric Contact](https://graphics.cs.utah.edu/research/projects/ogc/Offset_Geometric_Contact-SIGGRAPH2025.pdf) (*ACM TOG* 44(4), SIGGRAPH 2025, 21 pages) | Introduction and method overview | Research level: penetration-free contact for cloth and deformables, designed to plug into solvers such as Vertex Block Descent. Read when the XPBD cloth starts tangling. |
| Articulated mechanisms | Maloisel et al., [A Versatile Quaternion-based Constrained Rigid Body Dynamics](https://la.disneyresearch.com/wp-content/uploads/A_Versatile_Quaternion_based_Constrained_Rigid_Body_Dynamics.pdf) (2025) | All | If the joint system grows into robots or animatronics. |
| Aerodynamics | Harry Smith, [*Aircraft Flight Mechanics*](https://aircraftflightmechanics.com/Prerequisites/Prerequisites.html) | "Drag" (skin friction, form, induced drag) on the Assumed knowledge page; then the book's later chapters on linear aerodynamic terms and stability derivatives | Drag breakdown and a model for a stable aircraft. |
| Aerodynamics | [Airfoil Tools](http://airfoiltools.com/) | The airfoil database | Lift and drag curves to load into the engine. |
| Other physics | Millington ch. 18 | §18.1–18.2 (pp. 423–429) | Simultaneous resolution and reduced coordinates, as directions to explore. |

More: [RESOURCES.md, Phase 8](./RESOURCES.md#phase-8-stretch-goals)

---

## Track S: simulation core

Track S builds Aether Lab's simulation core in a new package, `packages/aether-lab` (working name `aether-lab`), once the engine's Phase 7 is done. Paths in this track are relative to that package. It depends on `aether-physics` for the math library; nothing in the engine changes. Every phase follows the [ground rules](#ground-rules) for Track S: name the integrator and tolerance, no hidden fudges, test against the answer.

## S1: Integrators and the ODE core

**Goal:** a simulation core where the integrator, step size and error tolerance are choices, not hard-coded, and where rendering is decoupled from stepping.

**Concepts:** first-order systems `dy/dt = f(t, y)` and reducing second-order equations to them; order of accuracy and convergence; local and global error; embedded Runge–Kutta pairs and step-size control; dense output; symplectic integrators and why their energy error stays bounded; event location; stiffness.

### Build

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | `OdeSystem`, `rk4` | Integrate any system at a fixed step |
| 2 | `SecondOrderSystem`, `verlet`, `yoshida4` | Integrate conservative systems with bounded energy error |
| 3 | `rk45`: Dormand–Prince with step control | Hit a requested tolerance without choosing `h` |
| 4 | Dense output and `Simulation` | Render at any frame time without stepping to it |
| 5 | Events | Find bounce, apex and crossing times to the tolerance |
| 6 | `Trajectory` | Record a run, scrub it and compare two runs |
| 7 | `implicitMidpoint` | Integrate stiff and non-separable systems |

#### Step 1: Systems and RK4

- [ ] `src/ode/ode-system.ts`: `OdeSystem`
- [ ] `src/ode/rk4.ts`: `rk4`, fixed step, preallocated stage buffers
- [ ] `src/ode/integrator.ts`: the `Integrator` type every method implements
- [ ] `explicitEuler` and `semiImplicitEuler` for comparison only

```ts
interface OdeSystem {
  readonly size: number;
  /** Writes dy/dt at (t, y) into `out`. Must not modify `y`. */
  derivative(t: number, y: Float64Array, out: Float64Array): void;
}

interface StepResult { h: number; hNext: number; accepted: boolean; error: number }

interface Integrator {
  readonly order: number;
  step(system: OdeSystem, t: number, y: Float64Array, h: number, out: Float64Array): StepResult;
}
```

**Working when:** the harmonic oscillator's global error at `t = 10` drops by 16× when `h` halves.

#### Step 2: Second-order systems and symplectic methods

- [ ] `src/ode/second-order-system.ts`: `SecondOrderSystem`, positions and velocities as separate arrays, with an adapter to `OdeSystem`
- [ ] `src/ode/verlet.ts`: velocity Verlet (order 2)
- [ ] `src/ode/yoshida.ts`: Yoshida's fourth-order composition of Verlet

```ts
interface SecondOrderSystem {
  readonly dof: number;
  /** Writes d²x/dt² into `out`. `v` is given for velocity-dependent forces. */
  acceleration(t: number, x: Float64Array, v: Float64Array, out: Float64Array): void;
}
```

**Working when:** over 10⁴ Kepler periods, Verlet's energy error stays bounded while RK4's drifts steadily.

#### Step 3: Adaptive RK45

- [ ] `src/ode/rk45.ts`: Dormand–Prince 5(4) with FSAL, mixed absolute and relative tolerance, PI step-size controller, min and max step
- [ ] Rejected steps are retried with a smaller `h` and counted

**Working when:** for tolerances from 1e-4 to 1e-10 the Kepler orbit's error after one period stays within a small factor of the tolerance, and the step count grows as expected.

#### Step 4: Dense output and `Simulation`

- [ ] Dormand–Prince continuous extension: `y(t)` anywhere inside the last accepted step
- [ ] Linear-in-time fallback for fixed-step methods; cubic Hermite for second-order systems
- [ ] `src/ode/simulation.ts`: `Simulation`

```ts
class Simulation {
  constructor(system: OdeSystem, y0: ArrayLike<number>, options: {
    method: Integrator; tolerance?: number; h?: number; t0?: number;
  });
  readonly t: number;
  readonly y: Float64Array;
  /** Steps until the solution reaches `t`; never steps past it more than one step. */
  advanceTo(t: number): void;
  /** Writes the solution at `t` into `out`. `t` must lie within the last step. */
  sample(t: number, out: Float64Array): void;
  readonly stats: { steps: number; rejected: number; evaluations: number };
}
```

**Working when:** sampling halfway through a step matches the exact solution to the same order as the step.

#### Step 5: Events

- [ ] `src/ode/events.ts`: an event is a function `g(t, y)` whose sign change marks the event, a direction filter, and an action (`stop`, `record`, or a callback that edits `y`, e.g. a bounce)
- [ ] Locate the root on the dense output with the Illinois method, to the time tolerance
- [ ] Restart the integrator after a callback edits the state

**Working when:** a ball dropped from 10 m lands at `√(2h/g)` to 1e-10 s, and a bouncing ball's apexes follow `e²ⁿ·h` exactly.

#### Step 6: Trajectories

- [ ] `src/ode/trajectory.ts`: `Trajectory`, a recorded run stored as accepted steps plus their dense-output coefficients
- [ ] `sample(t)` anywhere in the recorded interval, by binary search over steps
- [ ] A cap on memory: keep every step, or decimate to a fixed sample rate

**Working when:** sampling a recorded run at any time matches a fresh run's `sample` at that time.

#### Step 7: Implicit midpoint

- [ ] `src/ode/implicit-midpoint.ts`: Newton iteration with a finite-difference Jacobian (a `Dual`-based Jacobian follows in S2)
- [ ] A small dense LU solve in `src/math/linalg.ts`

**Working when:** a stiff linear system with eigenvalues −1 and −10⁴ stays stable at `h = 0.1`, where RK4 blows up.

### Guidance

- **State is a `Float64Array`.** Systems pack and unpack their own state. Typed arrays keep the inner loop allocation-free, and the same layout moves into a Worker or onto the GPU unchanged.
- **Separate time from the frame.** `Simulation.advanceTo(frameTime)` takes as many internal steps as it needs, and the renderer calls `sample(frameTime)`. Track G's `FixedStepLoop` still drives the playback clock; only what happens inside a frame changes.
- **Pick integrators by the physics.** Conservative mechanics: Verlet or Yoshida-4 at a fixed step. Anything dissipative, driven, or where you want an error bar: RK45. Stiff: implicit midpoint. Charged particles in magnetic fields: Boris (S3).
- **Adaptive steps break symplecticity.** Variable `h` destroys the bounded-energy property, so don't adapt Verlet's step. Document this on the method, not in a comment.
- **Events need dense output.** Bisecting on full re-integration works, but it's slow and less accurate.

### Tests

- Convergence order for every method: run the harmonic oscillator at `h, h/2, h/4` and check the error ratio is `2^order`, within 10%.
- Kepler orbit: energy, angular momentum and period against the analytic values.
- RK45: rejected steps happen near pericenter of an eccentric orbit and not at apocenter.
- Events: exact fall time, bounce apex sequence, and a crossing that happens within one step in both directions.
- `Trajectory`: recorded and fresh samples agree; memory cap respected.

**Demo:** *Integrators*. The same eccentric Kepler orbit run by explicit Euler, semi-implicit Euler, Verlet, RK4 and RK45, with an energy-error chart on a log scale and a step-count readout. This brings back the integrator shoot-out removed in Phase 2, now built on the engine.

### Study

**Focus on**
- Why the error of an order-`p` method scales as `hᵖ`, and how to measure it in a test.
- How an embedded pair estimates its own error, and how the controller turns that into the next `h`.
- What "symplectic" buys you: a nearby Hamiltonian that the method conserves exactly, so energy error oscillates instead of drifting.
- What makes a system stiff, and why explicit methods need tiny steps on it.

**Read, in this order**

| Resource | Sections | What to take from it |
|---|---|---|
| Witkin & Baraff, *Physically Based Modeling*, "Differential Equation Basics" | All | Recap of the first-order form and the explicit methods. |
| Press et al., *Numerical Recipes* (3rd ed.) | Ch. 17: Runge–Kutta, adaptive step-size control, dense output, stiff sets | Dormand–Prince coefficients, the PI controller, and practical tolerances. |
| Hairer, Nørsett & Wanner, *Solving Ordinary Differential Equations I* | Embedded methods, step-size control, dense output | The reference behind everything in Steps 3–5. |
| Hairer, Lubich & Wanner, *Geometric Numerical Integration* | Ch. I (examples) and the symplectic integration chapter | Kepler and the outer solar system as test problems; why Verlet conserves a modified energy. |
| H. Yoshida, "Construction of higher order symplectic integrators" (*Phys. Lett. A* 150, 1990) | The fourth-order composition | The three Verlet substeps and their weights. |

More: [RESOURCES.md, Track S](./RESOURCES.md#track-s-simulation-core)

---

## S2: Exact mechanics

**Goal:** the systems of a classical mechanics course, simulated in the coordinates they are posed in.

**Concepts:** generalized coordinates; the Euler–Lagrange equations; the generalized mass matrix; Hamilton's equations; forward-mode automatic differentiation with dual and hyper-dual numbers; conserved quantities and Noether's theorem; Kepler invariants; rigid-body rotation from angular momentum; phase space, Poincaré sections and sensitivity to initial conditions.

### Build

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | `Dual`, `HyperDual` | Get exact first and second derivatives of any function |
| 2 | `LagrangianSystem` | Simulate a system from `L(q, q̇, t)` alone |
| 3 | `HamiltonianSystem` | Simulate from `H(q, p, t)`, symplectically when separable |
| 4 | `NBody` | Exact gravity with invariants |
| 5 | `ExactRigidBody` | Torque-free and driven rotation, tested against theory |
| 6 | `analysis/` monitors | Chart conserved quantities, phase portraits and Poincaré sections |

#### Step 1: Automatic differentiation

- [ ] `src/math/dual.ts`: `Dual` (value and one derivative), with `add`, `mul`, `div`, `sin`, `cos`, `exp`, `log`, `sqrt`, `pow`
- [ ] `src/math/hyper-dual.ts`: `HyperDual`, for exact second derivatives
- [ ] A small `Num` interface so user functions are written once and run with `number`, `Dual` or `HyperDual`

**Working when:** derivatives of a dozen test functions match analytic ones to machine precision.

#### Step 2: Lagrangian systems

- [ ] `src/mechanics/lagrangian-system.ts`: `LagrangianSystem implements OdeSystem`
- [ ] Builds `M = ∂²L/∂q̇²`, `C = ∂²L/∂q̇∂q`, `∂L/∂q` and `∂²L/∂q̇∂t` with `HyperDual`, then solves `M q̈ = ∂L/∂q − C q̇ − ∂²L/∂q̇∂t + Q`
- [ ] Generalized forces `Q(q, q̇, t)` for damping and driving
- [ ] Named coordinates and parameters, so users write `q.θ` and `p.g`
- [ ] Cholesky solve in `src/math/linalg.ts`; a singular `M` throws with the coordinate names

```ts
const pendulum = new LagrangianSystem({
  coordinates: ["θ"],
  parameters: { m: 1, l: 1, g: 9.81 },
  lagrangian: (q, qd, t, p, n) => {
    const T = n.mul(0.5 * p.m * p.l * p.l, n.mul(qd.θ, qd.θ));
    const V = n.mul(-p.m * p.g * p.l, n.cos(q.θ));
    return n.sub(T, V);
  },
});
```

**Working when:** the double pendulum's derived equations match the hand-derived ones at random states, and energy is conserved to the tolerance.

#### Step 3: Hamiltonian systems

- [ ] `src/mechanics/hamiltonian-system.ts`: `HamiltonianSystem`, `q̇ = ∂H/∂p`, `ṗ = −∂H/∂q` via `Dual`
- [ ] Separable `H = T(p) + V(q)` exposes a `SecondOrderSystem` view so Verlet and Yoshida apply

#### Step 4: N-body gravity

- [ ] `src/mechanics/n-body.ts`: `NBody implements SecondOrderSystem`, `G` configurable, no softening by default
- [ ] Invariants: total energy, momentum, angular momentum, and the Laplace–Runge–Lenz vector for two bodies

**Working when:** a two-body orbit's period, eccentricity and LRL vector match Kepler's values; the figure-eight three-body orbit closes after one period.

#### Step 5: Exact rigid bodies

- [ ] `src/mechanics/exact-rigid-body.ts`: state `(x, q, P, L)`, with `ω = R I⁻¹ Rᵀ L`; quaternion renormalized after each accepted step
- [ ] Reuses Phase 4's inertia tensors and quaternion helpers
- [ ] External torque function `τ(t, state)` for tops under gravity

**Working when:** a torque-free symmetric body precesses at `(I₃ − I₁)/I₁ · ω₃` in the body frame, the asymmetric body flips about its intermediate axis, and energy and `|L|` hold to the tolerance.

#### Step 6: Analysis

- [ ] `src/analysis/monitors.ts`: functions of state sampled into ring buffers, with drift relative to the initial value
- [ ] `src/analysis/poincare.ts`: section points from an S1 event on a plane or a phase of the drive
- [ ] `src/analysis/lyapunov.ts`: the largest Lyapunov exponent from two nearby runs with renormalization

### Guidance

- **Second derivatives are the cost.** An `n`-coordinate system needs `O(n²)` `HyperDual` evaluations of `L` per derivative call. That's fine for the systems in a textbook (n ≤ 6). Don't build a symbolic algebra system.
- **Constraints belong in the coordinates.** A bead on a hoop has one coordinate, not three plus a constraint. Systems that can't be written that way belong in Track G's joints.
- **Time-dependent Lagrangians are normal.** A rotating hoop or a driven pivot gives `∂L/∂t ≠ 0`. Energy then isn't conserved, and the monitors should say what is (the Jacobi integral, when it exists).

### Tests

- `Dual` and `HyperDual` against analytic derivatives.
- Simple pendulum period against `4√(l/g)·K(sin(θ₀/2))` with `K` from the arithmetic–geometric mean, for amplitudes up to 170°.
- Small-oscillation normal modes of two coupled pendulums against the eigenvalue solution.
- Kepler invariants; figure-eight closure.
- Rigid-body precession rate; energy and angular momentum conservation; the intermediate-axis flip period against the elliptic-function solution.
- Driven damped pendulum: a known period-doubling parameter gives a two-point Poincaré section.

**Demos:** *Double pendulum* (with a second, perturbed copy to show divergence), *Bead on a rotating hoop* (the bifurcation as ω passes `√(g/R)`), *Kepler orbits* (with the LRL vector drawn), *Driven pendulum* (phase portrait and Poincaré section), *Coupled oscillators* (normal modes), *Spinning top* (precession and nutation).

### Study

**Focus on**
- Deriving the general form `M(q) q̈ = …` from the Euler–Lagrange equations, so the code is just that formula.
- How dual numbers carry a derivative through ordinary arithmetic.
- What each conserved quantity tells you, and which symmetry it comes from.

**Read, in this order**

| Resource | Sections | What to take from it |
|---|---|---|
| J. R. Taylor, *Classical Mechanics* | Ch. 7 (Lagrange's equations), Ch. 8 (central forces), Ch. 10 (rigid bodies), Ch. 11 (coupled oscillators), Ch. 12 (chaos), Ch. 13 (Hamiltonian mechanics) | The test problems for this phase and their analytic answers. |
| Baydin, Pearlmutter, Radul & Siskind, "Automatic Differentiation in Machine Learning: a Survey" (*JMLR* 18, 2018) | Forward mode and dual numbers | How forward-mode AD works and what it costs. |
| J. A. Fike & J. J. Alonso, "The Development of Hyper-Dual Numbers for Exact Second-Derivative Calculations" (AIAA 2011) | The number system and its arithmetic | Exact Hessian entries without truncation error. |
| Hairer, Lubich & Wanner, *Geometric Numerical Integration* | Rigid-body and Hamiltonian examples | Integrators that respect conserved quantities. |

More: [RESOURCES.md, Track S](./RESOURCES.md#track-s-simulation-core)

---

## S3: Electrostatics, magnetostatics and charged particles

**Goal:** fields you can see, and particles that move through them.

**Concepts:** superposition; Coulomb's law and the potential; dipoles; the Biot–Savart law; the Lorentz force; cyclotron motion, E×B drift and magnetic mirrors; field lines as streamlines; equipotentials as level sets.

### Build

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | `Field`, `ScalarField`, `FieldSum` | Combine any sources by superposition |
| 2 | Sources | Place charges, line charges, dipoles, wires and loops |
| 3 | `boris` | Move charged particles accurately through E and B |
| 4 | `traceFieldLines` | Draw field lines as polylines |
| 5 | Contours and isosurfaces | Draw equipotentials in a plane or in 3D |

#### Step 1: Fields

- [ ] `src/fields/field.ts`

```ts
interface Field { sample(p: Vec3Like, t: number, out: Vec3): Vec3 }
interface ScalarField { sample(p: Vec3Like, t: number): number }
class FieldSum implements Field { readonly terms: Field[] }
```

#### Step 2: Sources

- [ ] `PointCharge` (E and V), `LineCharge` (finite segment, closed form), `Dipole`
- [ ] `CurrentSegment` (closed-form Biot–Savart for a straight segment), `CurrentLoop` (quadrature over segments), `Solenoid` and `HelmholtzPair` built from loops
- [ ] `UniformField`
- [ ] Units: SI by default, with `ε₀` and `μ₀` overridable for natural units

**Working when:** the dipole's far field matches `(1/4πε₀)(3(p·r̂)r̂ − p)/r³`, and a loop's on-axis B matches `μ₀IR²/2(R² + z²)^{3/2}`.

#### Step 3: Charged particles

- [ ] `src/fields/boris.ts`: the Boris push as an S1 `Integrator` for systems with E and B fields
- [ ] `ChargedParticles`: test charges in external fields, with optional Coulomb interaction through S2's `NBody` pattern

**Working when:** a charge in uniform B circles at `ω = qB/m` with no radius drift over 10⁴ orbits, and E×B drift speed is `E/B`.

#### Step 4: Field lines

- [ ] `src/fields/field-lines.ts`: `traceFieldLines(field, seeds, options)` integrates `dr/ds = E/|E|` with S1's RK45; stops at sinks, bounds, a maximum length or a closed loop
- [ ] Seeding around each charge proportional to `|q|`, so line density shows field strength
- [ ] Evenly spaced seeding in a plane, for 2D views
- [ ] Output: `Float32Array` polylines, ready for any renderer

#### Step 5: Equipotentials

- [ ] `src/fields/contour.ts`: marching squares on a sampled plane
- [ ] `src/fields/isosurface.ts`: marching cubes on a sampled box
- [ ] Output: vertex and index arrays

### Guidance

- **The engine produces geometry, not meshes.** Field lines, contours and isosurfaces come out as typed arrays. `aether-viz` (V3) turns them into Three.js objects.
- **Use Boris for magnetic fields.** RK4 makes cyclotron orbits spiral in or out over time. Boris conserves phase-space volume and keeps the radius exact for uniform B.
- **Field lines near point charges are singular.** Start seeds a small radius away from each charge, and stop lines that enter that radius around another charge.

### Tests

- Each source's field against its closed form; `E = −∇V` numerically for each source with a potential.
- Superposition: the field of two charges equals the sum of each.
- Boris: cyclotron frequency and radius, E×B drift, magnetic-mirror reflection where the pitch angle predicts.
- Field lines start on positive charges and end on negative ones; the number ending on a charge is proportional to its magnitude.

**Demos:** *Charges* (drag charges, see lines and equipotentials update), *Dipole*, *Cyclotron*, *E×B drift*, *Magnetic bottle*, *Helmholtz coils*.

### Study

| Resource | Sections | What to take from it |
|---|---|---|
| D. J. Griffiths, *Introduction to Electrodynamics* | Ch. 2 (electrostatics), Ch. 3 (multipole expansion), Ch. 5 (magnetostatics) | Every source in Step 2 and the answers to test against. |
| Qin et al., "Why is Boris algorithm so good?" (*Phys. Plasmas* 20, 2013) | All | Why Boris conserves phase-space volume. |
| B. Jobard & W. Lefer, "Creating Evenly-Spaced Streamlines of Arbitrary Density" (1997) | All | Seeding field lines in a plane without clutter. |
| W. Lorensen & H. Cline, "Marching Cubes" (SIGGRAPH 1987); Paul Bourke, "Polygonising a scalar field" | All | The isosurface algorithm and its lookup tables. |

More: [RESOURCES.md, Track S](./RESOURCES.md#track-s-simulation-core)

---

## S4: Boundary-value problems

**Goal:** fields around conductors, where no closed form exists.

**Concepts:** Laplace's and Poisson's equations; Dirichlet and Neumann boundaries; uniqueness; relaxation methods (Jacobi, Gauss–Seidel, SOR); multigrid; induced surface charge; the method of images as a check.

### Build

- [ ] `src/fields/grid.ts`: `ScalarGrid` and `VectorGrid` in 2D and 3D, `Float64Array` storage, bilinear and trilinear sampling; both implement `Field` or `ScalarField`
- [ ] `src/fields/laplace.ts`: conductors as cell masks with fixed potential; Jacobi, then red–black Gauss–Seidel with SOR
- [ ] `src/fields/multigrid.ts`: a V-cycle with restriction and prolongation
- [ ] `E = −∇V` by central differences; surface charge `σ = ε₀ E·n̂`
- [ ] Poisson sources from a charge-density grid

**Working when:** a point charge above a grounded plane matches the image-charge solution away from the charge, and multigrid converges in a number of V-cycles independent of grid size.

### Tests

- Parallel plates: uniform field between them.
- A rectangular box with one side at `V₀`: the separation-of-variables series.
- Grounded sphere in a uniform field: the analytic induced dipole.
- Residual reduction per iteration for each method; SOR's optimal `ω` beats Gauss–Seidel.

**Demos:** *Conductors* (draw and drag conductors in a plane, see V, E and σ), *Image charge* (numerical and image solutions side by side).

### Study

| Resource | Sections | What to take from it |
|---|---|---|
| Griffiths | Ch. 3 (Laplace's equation, images, separation of variables) | The analytic cases to test against. |
| Briggs, Henson & McCormick, *A Multigrid Tutorial* (2nd ed.) | Ch. 1–4 | Relaxation, smoothing, and the V-cycle. |
| *Numerical Recipes* | Ch. 20: relaxation methods and multigrid for boundary-value problems | SOR and a working multigrid. |

---

## S5: Waves and radiation

**Goal:** electromagnetic waves you can watch propagate, reflect, refract and radiate.

**Concepts:** the wave equation; the CFL condition; the Yee grid and leapfrog in time; sources; perfect conductors; absorbing boundaries (Mur, then PML); material parameters; retarded potentials; the Liénard–Wiechert fields and the radiation from an accelerating charge.

### Build

| Step | Adds | Afterward you can |
|---|---|---|
| 1 | `WaveString` | Show standing and travelling waves on a string |
| 2 | 1D FDTD | Send a pulse into a dielectric slab |
| 3 | 2D FDTD (TM and TE) | Show interference, diffraction and waveguides |
| 4 | Absorbing boundaries | Simulate open space |
| 5 | `RetardedField` | Show the field of a moving, accelerating charge |

- [ ] `src/fields/wave-string.ts`: the 1D wave equation with leapfrog, fixed and free ends
- [ ] `src/fields/fdtd-1d.ts`, `src/fields/fdtd-2d.ts`: Yee grids, Courant number exposed, per-cell `ε`, `μ`, `σ`
- [ ] Sources: hard and soft, Gaussian pulse, sinusoid, a dipole antenna as a driven current
- [ ] Boundaries: PEC, first-order Mur, then a convolutional PML
- [ ] `src/fields/retarded-field.ts`: stores a charge's trajectory history, solves for the retarded time by root-finding, and returns the Liénard–Wiechert E and B; implements `Field`

**Working when:** a pulse crosses the grid at `c` within the dispersion predicted for the Courant number, and a charge that stops suddenly shows a spherical shell of transverse field moving outward at `c`.

### Guidance

- **Normalize inside, SI outside.** FDTD runs in normalized units with `c = 1` and Courant number `S`; the public API takes SI and converts.
- **3D FDTD waits for the GPU.** A 3D grid big enough to be interesting is too slow on the CPU. Do 1D and 2D here; 3D comes in S6.
- **Retarded fields are a lookup, not a solver.** The history buffer is the expensive part. Cap it at the light-crossing time of the view.

### Tests

- Numerical wave speed and dispersion against the Yee dispersion relation.
- Reflection and transmission at a dielectric interface against the Fresnel coefficients.
- Total reflection at a PEC wall; reflection from a PML below a set threshold.
- Resonant frequencies of a 2D cavity against `(c/2)√((m/a)² + (n/b)²)`.
- `RetardedField` for a uniformly moving charge matches the boosted Coulomb field.

**Demos:** *String*, *Pulse and slab*, *Double slit*, *Waveguide*, *Dipole antenna*, *Stopping charge*.

### Study

| Resource | Sections | What to take from it |
|---|---|---|
| Griffiths | Ch. 9 (EM waves), Ch. 10 (retarded potentials, Liénard–Wiechert), Ch. 11 (radiation) | The physics, and the answers to test against. |
| A. Taflove & S. Hagness, *Computational Electrodynamics: The FDTD Method* | The Yee algorithm, numerical dispersion, and PML chapters | The method in full. |
| J. B. Schneider, *Understanding the FDTD Method* (free online) | The 1D, 2D and PML chapters | A gentler, code-first walk through FDTD. |
| E. M. Purcell & D. J. Morin, *Electricity and Magnetism* (3rd ed.) | The appendix on radiation from an accelerated charge | The kinked-field-line picture that the *Stopping charge* demo draws. |

---

## S6: The GPU

**Goal:** grid solvers and N-body systems large enough to look real, on WebGPU.

**Concepts:** compute shaders and WGSL; buffers, bind groups and dispatch; ping-pong buffers; workgroup memory and tiling; float32 error; sharing GPU buffers with the renderer.

### Build

- [ ] `packages/aether-gpu`: a new workspace package that depends on `aether-lab`; the caller passes in a `GPUDevice`
- [ ] 2D FDTD kernel, checked against S5's CPU solver within float32 tolerance
- [ ] 3D FDTD kernel with PML
- [ ] Jacobi and red–black Gauss–Seidel kernels for S4
- [ ] Tiled `O(N²)` N-body kernel
- [ ] Buffers exposed so `aether-viz` can draw from them without reading back to the CPU

**Working when:** each kernel matches its CPU reference on a small grid, and a 3D dipole antenna runs at interactive rates on a 128³ grid.

### Guidance

- **The CPU version is the specification.** Write a kernel only after its CPU counterpart is tested, then test the kernel against it.
- **float32 changes the tolerances.** Compare against the float64 reference with tolerances set from the step count, and say so in the tests.

### Study

| Resource | Sections | What to take from it |
|---|---|---|
| [WebGPU Fundamentals](https://webgpufundamentals.org/) | Compute shader basics, storage buffers | The API, from the ground up. |
| NVIDIA, *GPU Gems 3*, "Fast N-Body Simulation with CUDA" | All | Tiling with shared memory; the same idea maps onto WGSL workgroup memory. |

More: [RESOURCES.md, Track S](./RESOURCES.md#track-s-simulation-core)

---

## Track V: visualization library

Track V builds `packages/aether-viz`, the Three.js layer. V1 is shared: it moves the demo app's stage and helpers into the package, so the engine's demos use it too. V2–V5 are the Lab's: `createLab`, field views, the gallery and scenes. `aether-viz` depends on `aether-physics`, `aether-lab` and Three.js; neither library depends on it. **Design the API from the examples:** each phase starts by writing the Lab examples it should make possible, then builds what they need.

## V1: Extract `aether-viz`

**Goal:** the rendering pieces the demo app already has, moved into a package with no behavior change.

### Build

- [ ] `packages/aether-viz`: new workspace package; `three` as a peer dependency
- [ ] Move the stage (renderer, camera, controls, theme palette) from `apps/editor/src/stage`
- [ ] Move drawing helpers (`Polyline` and the rest) from `apps/editor/src/demos/helpers`
- [ ] Move the parameter schema (`core/params.ts`), ring buffer, and the chart, readout and callout specs from `core/demo.ts`
- [ ] `apps/editor` imports them from `aether-viz`

**Working when:** every demo runs unchanged, and the unit and smoke tests pass.

## V2: `createLab` and playback

**Goal:** a simulation set up and running in about ten lines, with a timeline.

### Build

- [ ] `createLab(container)`: renderer, camera, lights, controls, clock and a parameter panel
- [ ] Bindings from state to scene: `lab.body(shape, () => position, () => orientation?)`, `lab.trail`, `lab.arrow`, `lab.spring`, `lab.label`
- [ ] Plots: `lab.plot({ x, y })`, time series and phase plots
- [ ] Controls: `lab.slider`, `lab.toggle`, `lab.button`, from the V1 parameter schema
- [ ] Clock adapters: Track G worlds through `FixedStepLoop` with interpolation; Track S `Simulation`s through dense output
- [ ] Playback modes: real time, slow motion, and precompute-then-play; a scrubber over a recorded `Trajectory`; a ghost of a second run for comparison
- [ ] Shortcuts: `lab.lagrangian(...)`, `lab.nbody(...)` wrap the S2 systems with sensible bindings

```ts
const lab = createLab(document.querySelector("#app")!);
const pendulum = lab.lagrangian({
  coordinates: { θ1: 1.2, θ2: 0 },
  parameters: { g: 9.81 },
  lagrangian: doublePendulum,
  method: "rk45", tolerance: 1e-9,
});
lab.rod([0, 0, 0], () => pendulum.point("bob1"));
lab.rod(() => pendulum.point("bob1"), () => pendulum.point("bob2"));
lab.trail(() => pendulum.point("bob2"));
lab.plot({ x: "t", y: () => pendulum.energy(), title: "Energy" });
lab.slider("g", { min: 1, max: 20 });
```

**Working when:** the double pendulum above runs, scrubs backward and forward, and its energy plot shows drift at the tolerance.

## V3: Field visualizers

**Goal:** every S3–S5 output drawn well, and readable in 3D.

### Build

- [ ] `lab.fieldLines(field, options)`: from S3's tracer, with direction arrows and colour by magnitude
- [ ] `lab.arrows(field, grid)`: instanced arrows on a grid or a plane
- [ ] `lab.slice(field | scalar, plane)`: a heatmap texture with a perceptual colormap and a legend
- [ ] `lab.isosurface(scalar, levels)`: from S3's marching cubes
- [ ] `lab.tracers(field)`: particles advected along the field, for flow
- [ ] Draggable sources that re-trace lines on drag
- [ ] For S6: draw straight from `aether-gpu` buffers with `WebGPURenderer`

### Guidance

- **3D clutter is the enemy.** Default to a plane slice or a small number of seeded lines; let users opt into full 3D.
- **Colormaps:** viridis for magnitudes, a diverging map for signed quantities like potential.

## V4: The Lab gallery

**Goal:** textbook problems as live, editable examples on the website.

### Build

- [ ] `apps/site`: the Lab's own front page at `/lab`, separate from the engine's landing page, with a gallery organised by topic (oscillations, central forces, Lagrangian systems, rigid bodies, chaos, electrostatics, magnetostatics, conductors, waves, radiation)
- [ ] Each example: a running lab, its source in an editor, a short description, and the analytic result it's checked against
- [ ] Editing the source re-runs it in a sandboxed iframe (TypeScript type-stripped in the browser)
- [ ] Share by URL

## V5: Scenes without code

**Goal:** a teacher can build and share a simulation without writing TypeScript.

### Build

- [ ] A JSON scene format: systems, fields, visualizers, controls, playback settings; versioned
- [ ] `loadScene(lab, json)` in `aether-viz`
- [ ] A scene editor in the demo app: add sources and bodies, set parameters, pick visualizers
- [ ] Export the scene as JSON, as a URL, and as the equivalent TypeScript

### Study (Track V)

| Resource | Sections | What to take from it |
|---|---|---|
| [GlowScript / VPython](https://www.glowscript.org/) | The documentation and examples | The bar for brevity: what a ten-line simulation looks like. |
| [myPhysicsLab](https://www.myphysicslab.com/) (open source) | The simulation and graph architecture | How a mature educational simulator separates model, view and controls. |
| [PhET Interactive Simulations](https://phet.colorado.edu/) | Any EM and mechanics sims; PhET's published design research | What makes a teaching simulation clear. |
| K. Moreland, "Diverging Color Maps for Scientific Visualization" (2009) | All | Choosing colormaps for signed fields. |
| [Three.js manual](https://threejs.org/manual/) | Instancing, `BufferGeometry`, `WebGPURenderer` | Drawing many arrows and lines cheaply. |

More: [RESOURCES.md, Track V](./RESOURCES.md#track-v-visualization-library)

---

## Working rhythm for each phase

1. Work through the phase's **Study** section in order.
2. Work through the **Build** steps in order. For each one, adjust the sketch to your API decisions, write the tests, implement it in plain TypeScript with terse TSDoc on public members, and move on once its **Working when** line holds.
3. Write tests first for anything in the math library.
4. When a step adds a demo, build it and its debug visualization, following the checklist in [DEMOS.md](./DEMOS.md#2-checklist-for-a-new-demo).
5. Add the phase's UI feature.
6. Tick the boxes here and commit.
