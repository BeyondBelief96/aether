# Aether: build plan

A 3D rigid-body physics engine written from scratch in TypeScript, plus a browser playground for poking at it. The project has two goals:

1. **Learn how physics engines work** by writing the math, integrators, collision detection and solvers by hand.
2. **Learn modern web UI** (TypeScript, Lit web components, CSS layout, Canvas and WebGL, Web Workers) by building the playground around the engine.

Each phase ends with something you can **see** (a demo) and something you can **trust** (tests). Every phase lists the classes to write, how to approach them, and what to read. The full reading list is in [RESOURCES.md](./RESOURCES.md).

The class sketches below are starting points, not specifications. Signatures will change as you learn; record the decisions you make in the module READMEs and your phase notes.

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
| **The engine is a publishable library.** `src/index.ts` is the package entry point. Public methods accept `Vec3Like` / `QuatLike` and return engine types. Source comments are terse API docs; explanations go in `docs/`. | Users can pass `THREE.Vector3` directly, and the code reads like a library, not a tutorial. |

### Folder layout

```
src/
  index.ts      public package entry point (engine + math only)
  math/         Vec3, Mat3, Mat4, Quat, scalar helpers       (Phase 1)
  engine/       loop, Particle, RigidBody, World, islands     (Phases 0, 2, 4, 7)
  forces/       gravity, drag, springs, buoyancy, aero        (Phases 3, 4)
  collision/    shapes, AABB, broadphase, narrowphase, GJK    (Phase 5)
  constraints/  contacts, solver, joints                      (Phases 3, 6, 7)
  demos/        one file per demo; the only engine+Three.js code
  ui/           Lit components: app shell, viewport, sidebar, panels
docs/           this plan, resources, notes
```

File names are lowercase kebab-case (`rigid-body.ts`), one main class per file, tests next to the code (`rigid-body.test.ts`). Each folder has an `index.ts` barrel; other modules import from the barrel, not from individual files.

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

Each phase below has a **Study** section: what to focus on, then a reading list in order with the exact sections to read and what to take from each. Read the Millington sections first for the shape of the topic, then the other sources for alternatives and depth.

Millington resolves contacts one at a time, ordered by severity. Modern engines (Box2D, Bullet, Jolt) use **sequential impulses**, an iterative solver over all contacts. Phase 6 builds Millington's version first, then Catto's, so you can compare them.

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

Each phase still builds Millington's version first. Where Box3D does something meaningfully different, the phase says so in its Guidance, and the **Read** table ends with the Box3D files to compare against. Read Box3D *after* your version works.

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
- [x] Library entry point `src/index.ts` and `Vec3Like` in `src/math/types.ts`

**Tests:** `loop.test.ts` covers step counting, leftover alpha, the frame clamp, dropped time, pause, single-step and time scale.

**Demo:** *Fixed timestep*. Two orbiting balls, one interpolated and one not. At 10 Hz physics you can see why interpolation matters.

**Web skills:** Vite project setup; Lit `static properties` with `declare` fields; Shadow DOM styling; custom events up, properties down; `ResizeObserver`; CSS grid app layout.

### Study

**Focus on**
- Why the accumulator decouples simulation rate from frame rate, and what `alpha` means physically (how far between the last two physics states the screen is).
- The spiral of death: what causes it and why clamping frame time is the fix.
- What a physics engine is responsible for and what it isn't (rendering, game logic, animation).
- The design choices you'll meet later: iterative vs simultaneous contact resolution, impulses vs forces. Knowing they exist now makes Phases 6–7 easier to place.

**Read, in this order**

| Resource | Sections | What to take from it |
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

Deferred to the phase that first uses them: `Mat3.setInertiaTensorCoeffs` (Phase 4), `Mat3.setSkewSymmetric` and `Mat3.add` (Phase 7). The tests directory is `src/math/tests/` rather than next to each file.

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

### Tests

- Identities: `a × b ⊥ a` and `⊥ b`; `a × a = 0`; `|normalize(v)| = 1`; `M · M⁻¹ = I`; `det(Mᵀ) = det(M)`.
- Known values: a 90° rotation about +Y maps +X to −Z; a 90° rotation about +Z maps +X to +Y.
- Round trips: `Mat3.setFromQuat(q).transformVec3(v)` equals `q.rotateVec3(v)`; `transformInversePoint(transformPoint(p)) = p`.
- Composition order: `(a · b).rotateVec3(v)` equals `a.rotate(b.rotate(v))`.
- Aliasing: `v.cross(v)`, `m.multiply(m)`.
- Property-based (add `fast-check` as a dev dependency): random unit quaternions preserve vector length; random invertible matrices round-trip.

Register the custom matchers in a Vitest setup file (`test.setupFiles` in `vite.config.ts`). Add a `declare module 'vitest'` augmentation so TypeScript knows about them.

**Demo:** *Rotation gizmo*. Sliders for axis and angle drive a quaternion; show the rotated basis vectors, the matching Euler angles, and gimbal lock when using Euler input.

**Web skills:** a reusable `<aether-slider>` component; a `<aether-vec3-input>` that emits a vector; formatting numbers in monospace for the UI.

### Study

**Focus on**
- **Geometric meaning over formulas.** Dot product = projection and angle; cross product = perpendicular direction with magnitude `|a||b| sin θ`, and its sign depends on handedness. Three.js is right-handed; check which convention each source uses before copying a formula.
- **Change of basis.** `M · v` vs `Mᵀ · v`, and `R · A · Rᵀ` for re-expressing a matrix in another frame. Phase 4's world-space inertia tensor is exactly this.
- **Points vs directions.** Points get translated, directions don't. This is the reason `Mat4` has separate `transformPoint` and `transformDirection`.
- **Quaternions as an implementation tool.** You need to compose, normalize, rotate a vector, convert to a matrix, and integrate by angular velocity. You don't need the 4D theory.
- **Aliasing and allocation.** These are the two bug sources that tests catch and eyes don't.

**Read, in this order**

| Resource | Sections | What to take from it |
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

- [ ] `src/engine/particle.ts`: `Particle`
- [ ] `src/engine/integrators.ts`: four integrators behind one function type, for the shoot-out demo
- [ ] `src/engine/particle-world.ts`: `ParticleWorld`
- [ ] Export from `src/engine/index.ts` and `src/index.ts`

```ts
class Particle {
  readonly position = new Vec3()
  readonly velocity = new Vec3()
  readonly acceleration = new Vec3()      // constant acceleration, e.g. gravity
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
  step(dt: number): void
}
```

### Guidance

- **Store inverse mass.** Infinite mass becomes `0`, so you never divide by zero, and static objects fall out naturally: every `Δv = impulse · invMass` is zero.
- **`Particle.integrate` uses semi-implicit Euler:** `a = acceleration + force · invMass`, then `v += a·dt`, then `v *= damping^dt`, then `x += v·dt`, then clear the accumulator. Updating velocity *before* position is the whole difference from explicit Euler.
- **Frame-rate-independent damping.** `damping^dt` gives the same decay at 30 Hz and 120 Hz. A plain `v *= 0.99` per step does not. Box3D instead uses `v *= 1 / (1 + dt·c)`, with a damping rate `c` in 1/s: the Padé approximation of `e^(−c·dt)`, cheaper than `pow` and stable at any `dt`. Try both in the integrator shoot-out.
- **Keep integrators separate from `Particle`.** RK4 and Verlet need to evaluate forces several times per step. That doesn't fit a force accumulator, so build them as pure functions over a 1D oscillator state for the demo. `Particle` stays on semi-implicit Euler.
- **The four update rules** (with `a(x, v)` the acceleration function):
  - Explicit Euler: `x' = x + v·dt`, `v' = v + a(x, v)·dt`, both using old values.
  - Semi-implicit Euler: `v' = v + a(x, v)·dt`, then `x' = x + v'·dt`.
  - Velocity Verlet: `x' = x + v·dt + ½·a·dt²`, `a' = a(x')`, `v' = v + ½·(a + a')·dt`. Exact only when `a` doesn't depend on `v`.
  - RK4: four derivative samples (`k1`…`k4`) weighted 1, 2, 2, 1.
- **Energy for a spring oscillator:** `E = ½·m·v² + ½·k·x²`. Plot it, not position: drift is far easier to see.
- **Order in `ParticleWorld.step`:** apply forces (Phase 3 registry), integrate every particle, then (Phase 3) generate and resolve contacts.

### Tests

- Constant acceleration: velocity Verlet matches `x = x₀ + v₀t + ½at²` exactly; semi-implicit Euler is off by `½·a·dt·t`. Assert both, so the test documents the difference.
- `inverseMass = 0`: the particle never moves under any force.
- `damping^dt`: after 1 s of simulation, speed is `v₀ · damping` at both 30 Hz and 120 Hz.
- Spring over 10,000 steps: semi-implicit Euler's energy stays within a bounded band; explicit Euler's grows without bound.

**Demos**
- *Ballistics* (Millington ch. 4): pistol, artillery, fireball and laser presets.
- *Integrator shoot-out*: four mass-spring oscillators side by side, one per integrator, with a live energy graph.

**Web skills:** a hand-written `<canvas>` line chart component (no chart library): ring buffer, resizing, `devicePixelRatio`. A segmented control for choosing the integrator.

### Study

**Focus on**
- **Simulation as solving an ODE.** State `(x, v)` plus a derivative function. Every integrator is a different way of stepping that, and they differ in accuracy and in stability.
- **Stability vs accuracy.** Explicit Euler spirals outward on a circle no matter how small `dt` is; semi-implicit Euler is symplectic, so energy stays bounded. Be able to show this with the energy graph, not just state it.
- **Inverse mass** as the representation that makes immovable objects free.
- **Damping as a deliberate fudge.** It hides integrator energy gain and numerical noise; make it frame-rate independent.

**Read, in this order**

| Resource | Sections | What to take from it |
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

- [ ] `src/forces/particle-force-generator.ts`: `ParticleForceGenerator` interface and `ParticleForceRegistry`
- [ ] `src/forces/`: `ParticleGravity`, `ParticleDrag`, `ParticleSpring`, `ParticleAnchoredSpring`, `ParticleBungee`, `ParticleBuoyancy`
- [ ] `src/constraints/particle-contact.ts`: `ParticleContact` and `ParticleContactResolver`
- [ ] `src/constraints/particle-links.ts`: `ParticleCable`, `ParticleRod`, `GroundContacts` (all `ParticleContactGenerator`s)
- [ ] `src/engine/verlet.ts`: a Jakobsen-style position-based system, as a comparison
- [ ] Wire the registry and contact generators into `ParticleWorld.step`

```ts
interface ParticleForceGenerator {
  updateForce(particle: Particle, dt: number): void
}

class ParticleForceRegistry {
  add(particle: Particle, generator: ParticleForceGenerator): void
  remove(particle: Particle, generator: ParticleForceGenerator): void
  clear(): void
  updateForces(dt: number): void
}

class ParticleContact {
  particles: [Particle, Particle | null]   // null: contact with immovable scenery
  restitution: number
  readonly normal: Vec3                    // from particles[1] toward particles[0]
  penetration: number
  resolve(dt: number): void
}

interface ParticleContactGenerator {
  addContacts(out: ParticleContact[], limit: number): number   // returns the number written
}

class ParticleContactResolver {
  constructor(iterations: number)
  resolveContacts(contacts: ParticleContact[], count: number, dt: number): void
}
```

### Guidance

- **Generators** add force and nothing else. Skip particles with `inverseMass === 0` so gravity doesn't need a special case.
- **Drag:** `F = −v̂ · (k₁|v| + k₂|v|²)`. Guard `|v| = 0`.
- **Spring between two particles:** with `d = pₐ − p_b`, `F = −k·(|d| − L)·d̂`. Add a damping term `−c·((vₐ − v_b)·d̂)·d̂`, or a stiff spring rings forever. Apply equal and opposite forces, or register the generator once per end.
- **Bungee** is a spring that only pulls: no force when `|d| < L`.
- **Buoyancy:** depth below the surface, `maxDepth` and `volume` give a submerged fraction; the force is `fraction · ρ · volume · g` upward.
- **Stiffness limit.** Semi-implicit Euler is stable for a spring only while `ω·dt < 2`, with `ω = √(k/m)`. The stiffness lab demo should show the explosion happening right at that line. That's why a higher physics rate helps.
- **Contact resolution (velocity):** separating velocity `vₛ = (vₐ − v_b)·n`. If `vₛ > 0` they're already separating. Otherwise the target is `vₛ' = −e·vₛ`, the impulse is `(vₛ' − vₛ) / (invMₐ + invM_b)`, and each particle gets `Δv = impulse · invM · ±n`.
- **Resting contact.** A particle resting on the ground picks up `a·dt` of downward velocity each step, which then bounces. Subtract the separating velocity caused by the last step's acceleration before applying restitution.
- **Contact resolution (position):** move each particle out of penetration along `n`, split in proportion to inverse mass.
- **Resolver loop:** each iteration, resolve the contact with the most negative separating velocity, then repeat, up to `iterations` times. Resolving one contact changes the others, so iteration count matters.
- **Cable** generates a contact only when stretched past its length (restitution allowed). **Rod** generates one whenever length ≠ L, with restitution 0 and the normal flipped when compressed.
- **Verlet alternative:** store `previous` position; `x' = 2x − x_prev + a·dt²`. Then iterate constraints: for each stick, move both ends toward rest length, weighted by inverse mass. Velocity is implicit, so constraints can't inject energy the way stiff springs do.
- **XPBD in one line:** with compliance `α̃ = α / dt²`, each constraint update is `Δλ = (−C − α̃λ) / (Σwᵢ|∇Cᵢ|² + α̃)`. Zero compliance gives a rigid rod; positive compliance gives a spring whose stiffness doesn't depend on iteration count.
- **Dragging with the mouse:** cast a ray onto the plane through the particle facing the camera, then pull with a stiff anchored spring (or set it as kinematic while held). Don't teleport the particle: a teleport has no velocity, and contacts react badly.

### Tests

- A spring at rest length applies zero force; a stretched spring pulls the ends together with equal and opposite forces.
- A rod keeps its length within tolerance after N steps under gravity.
- A particle resting on `GroundContacts` doesn't jitter: its velocity stays near zero for 1,000 steps.
- Buoyancy at full submersion matches `ρ · volume · g`.
- The resolver handles `particles[1] === null`.

**Demos**
- *Bridge* (Millington's mass-aggregate bridge)
- *Rope and cloth*: drag particles with the mouse; tear the cloth if the strain is too high
- *Stiffness lab*: raise spring stiffness until it explodes; watch it stabilize at a higher physics rate

**Web skills:** pointer events and raycasting from the screen to a 3D plane to drag particles. An auto-generated parameter panel: each demo declares a parameter schema (a union type such as `{ kind: 'range', key, label, min, max, step, value } | { kind: 'toggle', … }`) and the sidebar renders sliders and toggles from it.

### Study

**Focus on**
- **Force accumulation (D'Alembert's principle).** Many forces become one sum per step, so generators stay independent of each other.
- **Why stiff springs explode.** Know the `ω·dt < 2` limit and be able to predict the stiffness lab's breaking point before running it.
- **Three ways to keep particles apart or together:** stiff springs (forces), contacts with impulses (Millington's rods and cables), and position projection (Jakobsen, XPBD). Each has a failure mode. The point of this phase is to feel all three.
- **Closing velocity, restitution and the contact normal.** These ideas carry straight into Phase 6; master them here in the simple linear case.
- **Resting contact.** Why a particle on the ground jitters, and the "remove last step's acceleration" fix.

**Read, in this order**

| Resource | Sections | What to take from it |
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

- [ ] `src/engine/rigid-body.ts`: `RigidBody`
- [ ] `src/engine/inertia.ts`: inertia tensors for primitives; Mirtich's algorithm for convex hulls
- [ ] `src/forces/body-force-generator.ts`: `BodyForceGenerator` and `BodyForceRegistry`
- [ ] `src/forces/`: `BodyGravity`, `BodySpring` (between body-space points), `Aero`, `AeroControl`
- [ ] `src/engine/world.ts`: `World`
- [ ] Gyroscopic term in angular integration
- [ ] `Mat3x3.setInertiaTensorCoeffs(ixx, iyy, izz, ixy?, ixz?, iyz?)`, deferred from Phase 1. Test first; callers pass positive products of inertia and the method negates the off-diagonals

```ts
class RigidBody {
  readonly position = new Vec3()
  readonly orientation = new Quat()
  readonly velocity = new Vec3()
  readonly angularVelocity = new Vec3()          // world space, rad/s
  readonly acceleration = new Vec3()             // constant, e.g. gravity
  inverseMass = 1
  readonly inverseInertiaTensor = new Mat3()     // body space
  linearDamping = 0.99
  angularDamping = 0.99

  // Derived each step by calculateDerivedData()
  readonly transform = new Mat4()
  readonly inverseInertiaTensorWorld = new Mat3()
  readonly lastFrameAcceleration = new Vec3()    // used by the Phase 6 v1 resolver

  // Kept for render interpolation
  readonly previousPosition = new Vec3()
  readonly previousOrientation = new Quat()

  setMass(mass: number): void
  setInertiaTensor(inertia: Mat3): void          // stores the inverse
  calculateDerivedData(): void
  addForce(force: Vec3Like): void
  addForceAtPoint(force: Vec3Like, worldPoint: Vec3Like): void
  addForceAtBodyPoint(force: Vec3Like, bodyPoint: Vec3Like): void
  addTorque(torque: Vec3Like): void
  getPointInWorldSpace(bodyPoint: Vec3Like, out: Vec3): Vec3
  getVelocityAtPoint(worldPoint: Vec3Like, out: Vec3): Vec3   // v + ω × r
  clearAccumulators(): void
  integrate(dt: number): void
}

interface BodyForceGenerator {
  updateForce(body: RigidBody, dt: number): void
}

class World {
  readonly bodies: RigidBody[] = []
  readonly registry = new BodyForceRegistry()
  step(dt: number): void
}
```

### Guidance

- **Derived data.** `calculateDerivedData` normalizes the orientation, builds `transform` from position and orientation, and computes `I⁻¹_world = R · I⁻¹_body · Rᵀ`. Call it after every integration and after anyone sets position or orientation directly.
- **Why the inverse tensor.** Every use is `Δω = I⁻¹ · τ` or `I⁻¹ · (r × impulse)`. Inverting once at setup is cheaper than solving each time, and static bodies get a zero matrix just like `inverseMass = 0`.
- **Force at a point:** add `F` to the force accumulator and `(p − position) × F` to the torque accumulator. A force through the center of mass produces no torque.
- **Integration (semi-implicit):** `a = acceleration + F·invM`; `α = I⁻¹_world · τ`; `v += a·dt`, `ω += α·dt`; apply damping (`^dt` as in Phase 2); `x += v·dt`; `q.addScaledAngularVelocity(ω, dt)`; recompute derived data; clear accumulators. Copy `position`/`orientation` into `previous*` first.
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

**Web skills:** an object inspector: click a body (Three.js `Raycaster`) to show its live state in a side panel; reactive `state: true` properties updated on a throttle; a selection outline in Three.js.

### Study

**Focus on**
- **The velocity of a point on a body:** `v + ω × r`. Almost every contact and joint formula in Phases 6–7 starts here.
- **The inertia tensor as a change of basis.** It's constant in body space and rotates as `R · I · Rᵀ`. Understand why you store it inverted and why it must be recomputed every step.
- **Torque from off-center forces:** `τ = r × F`, and the fact that a pure couple causes rotation but no translation.
- **Angular momentum vs angular velocity.** Baraff integrates `L`; Millington integrates `ω`. The difference is the gyroscopic term. Make the tennis-racket flip appear to prove you understand it.
- **Aerodynamic forces as `q·S·C`.** Dynamic pressure times area times a coefficient that depends on angle of attack. This is the whole flight sim.

**Read, in this order**

| Resource | Sections | What to take from it |
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

- [ ] `src/collision/shapes.ts`: `Sphere`, `Box`, `Plane`, `Capsule`, `ConvexHull` as a discriminated union
- [ ] `src/collision/collider.ts`: `Collider` (shape + body + local offset + material)
- [ ] `src/collision/aabb.ts`: `AABB`
- [ ] `src/collision/broadphase/`: `Broadphase` interface, `BruteForceBroadphase`, `SweepAndPrune`
- [ ] `src/collision/narrowphase/`: one file per pair, plus a dispatch table
- [ ] `src/collision/gjk.ts`, `src/collision/epa.ts`
- [ ] `src/collision/contact.ts`: `Contact` and `ContactManifold`
- [ ] Debug draw data: a plain array of lines and points the engine fills and demos render
- [ ] `src/collision/broadphase/dynamic-tree.ts`: a dynamic AABB tree with fat AABBs, SAH sibling selection and tree rotations (Box3D's broadphase)
- [ ] *Optional:* `src/collision/hull-builder.ts`: Quickhull from a point cloud, so `ConvexHull` shapes can come from arbitrary meshes (Box3D builds boxes as hulls this way)

```ts
type Shape =
  | { kind: 'sphere'; radius: number }
  | { kind: 'box'; halfExtents: Vec3 }
  | { kind: 'plane'; normal: Vec3; offset: number }       // static only
  | { kind: 'capsule'; radius: number; halfHeight: number }
  | { kind: 'hull'; vertices: Vec3[]; faces: number[][] }

// Per kind: support(shape, localDir, out) and computeAabb(shape, transform, out)

class Collider {
  body: RigidBody | null           // null: static scenery
  shape: Shape
  readonly offset: Mat4            // shape frame relative to the body
  friction = 0.5
  restitution = 0.2
  readonly aabb = new AABB()       // world space, updated each step
}

class AABB {
  readonly min = new Vec3(); readonly max = new Vec3()
  overlaps(other: AABB): boolean
  union(a: AABB, b: AABB): this
  expand(margin: number): this
  surfaceArea(): number
}

interface Broadphase {
  add(collider: Collider): void
  remove(collider: Collider): void
  update(): void
  pairs(out: [Collider, Collider][]): number
}

class Contact {
  readonly point = new Vec3()      // world space
  readonly normal = new Vec3()     // from B toward A
  penetration = 0
  id = 0                           // feature key, stable across frames (used in Phase 6)
}

class ContactManifold {
  a: Collider; b: Collider
  readonly normal = new Vec3()
  readonly points: Contact[]       // up to 4
}
```

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

**Web skills:** Three.js `TransformControls` for gizmos; a performance HUD using `performance.now()` with p50 and p95; CSS container queries so the inspector panel adapts to its width.

### Study

**Focus on**
- **The pipeline as a funnel.** The broadphase is cheap and conservative, and the narrowphase is exact. Measure how many pairs each stage rejects.
- **Contact data, not just yes/no.** Every test must produce a point, a normal with a consistent sign, and a depth. Normal-sign bugs are the most common source of "bodies explode on contact".
- **SAT for boxes** first, including the reference/incident face clipping. That is where stable resting contact comes from.
- **Support functions and the Minkowski difference.** Once those click, GJK and EPA are bookkeeping.
- **Temporal coherence.** Contacts that persist between frames, with feature IDs and manifold reduction to 4 points, feed warm starting in Phase 6.

**Read, in this order**

| Resource | Sections | What to take from it |
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

- [ ] `src/constraints/contact-resolver.ts`: v1, Millington-style resolver (worst contact first)
- [ ] `src/constraints/contact-solver.ts`: v2, sequential impulses with friction and warm starting
- [ ] `src/constraints/soft-step-solver.ts`: v3, Box3D's **Soft Step**: substeps, soft contacts, relax and restitution passes, speculative contacts
- [ ] `src/constraints/softness.ts`: `makeSoft(hertz, dampingRatio, h)` → `{ biasRate, massScale, impulseScale }`, shared with Phase 7's joints
- [ ] `src/constraints/solver-settings.ts`: iterations, Baumgarte factor, slop, restitution threshold, warm starting on/off
- [ ] Persistent manifolds in `World`: match this step's contacts to last step's by body pair and feature ID
- [ ] `World.step` runs the full pipeline: forces → broadphase → narrowphase → solve → integrate
- [ ] Solver settings exposed in the UI

```ts
interface ContactPoint {           // per point, solver-side
  readonly rA: Vec3; readonly rB: Vec3     // from each center of mass to the contact
  normalMass: number; tangentMass: [number, number]
  normalImpulse: number                    // accumulated, ≥ 0
  tangentImpulse: [number, number]         // accumulated, |P_t| ≤ μ·P_n
  velocityBias: number
}

class ContactSolver {
  constructor(settings: SolverSettings)
  prepare(manifolds: ContactManifold[], dt: number): void
  warmStart(): void
  solveVelocities(): void          // one iteration
  storeImpulses(): void            // copy back for next frame's warm start
}
```

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

### Tests

- A ball with restitution 1 dropped onto a static plane returns to its drop height within a few percent.
- A box on a slope stays put when `tan θ < μ` and slides when `tan θ > μ`.
- A 10-box stack settles and drifts less than 1 cm over 10 s at 60 Hz with 10 iterations and warm starting on.
- The same stack with warm starting off visibly sinks or jitters (assert drift is larger, as documentation).
- Accumulated normal impulses are never negative; tangent impulses never exceed `μ·Pₙ`.
- `makeSoft`: `massScale + impulseScale = 1` for any input; `hertz = 0` gives all zeros (rigid); as `hertz → ∞`, `biasRate → 1/h` and `massScale → 1`.
- v3 with 4 substeps and 1 iteration keeps the 10-box stack within the same drift bound as v2 with 10 iterations.
- v3, speculative contacts: a box released 1 cm above the ground (inside the speculative margin) lands without penetrating or bouncing.
- v3, mass ratio: a 100 kg box resting on a 1 kg box doesn't sink through (Box3D's *HighMassRatio* robustness sample). Record where v2 fails the same test.

**Demos**
- *Restitution and friction lab*: balls and boxes on an adjustable ramp
- *Stacking*: towers and pyramids; toggle warm starting and watch them collapse
- *Dominoes*
- *Solver comparison*: the same scene with Millington's resolver, sequential impulses and Soft Step side by side, with substep and iteration sliders
- *Card house* and *Jenga* (Box3D samples): hard stacking tests that separate a good solver from a merely working one

**Web skills:** save and load scenes as JSON, and share a scene in the URL hash; an undo stack for scene edits.

### Study

**Focus on**
- **The single-contact impulse formula.** Derive `j = −(1 + e)·vₙ / (invMₐ + invM_b + angular terms)` yourself in your notes before reading anyone's code. Every solver is this formula, applied repeatedly.
- **Contact coordinates.** A normal plus two tangents, and the effective mass along each. Millington's contact basis and Catto's tangent rows are the same idea.
- **Why one-at-a-time resolution fails for stacks**, and why clamping the *accumulated* impulse fixes it.
- **Position drift.** Projection vs Baumgarte vs split impulses vs soft constraints: each trades energy, stability and accuracy differently.
- **Warm starting.** Measure it: the stacking demo should show the difference.

**Read, in this order**

| Resource | Sections | What to take from it |
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

- [ ] `src/constraints/constraint.ts`: a `Constraint` interface that contacts also implement
- [ ] `src/constraints/joints/`: `DistanceJoint`, `BallSocketJoint`, `HingeJoint` (limits, motor), `FixedJoint`
- [ ] `Mat3x3.setSkewSymmetric(v)` (`M · w == v × w`) and `Mat3x3.add(m)`, deferred from Phase 1. The ball-socket `K` matrix needs both. Test first
- [ ] `src/engine/islands.ts`: union-find island builder
- [ ] Sleeping on `RigidBody` and `World`: `isAwake`, `sleepTime`, `wake()`
- [ ] `World.stats`: time per phase (broadphase, narrowphase, solve, integrate)
- [ ] *Box3D extensions:* `SphericalJoint` with cone and twist limits (for the ragdoll), `PrismaticJoint`, `WheelJoint`; breakable joints; contact begin/end/hit events and sensor shapes

```ts
interface Constraint {
  readonly bodyA: RigidBody
  readonly bodyB: RigidBody | null
  prepare(dt: number): void
  warmStart(): void
  solveVelocity(): void
  solvePosition?(): boolean        // optional; true when the error is within tolerance
}

class HingeJoint implements Constraint {
  constructor(a: RigidBody, b: RigidBody | null, worldPivot: Vec3Like, worldAxis: Vec3Like)
  enableLimit(lower: number, upper: number): void
  enableMotor(speed: number, maxTorque: number): void
  frequencyHz: number              // 0 for rigid
  dampingRatio: number
}
```

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

**Web skills:** a Lit tree view of the scene graph; a flame-graph-style timing bar for each step.

### Study

**Focus on**
- **The constraint recipe:** position constraint `C` → velocity constraint `J·v` → effective mass `J·M⁻¹·Jᵀ` → impulse `Jᵀ·λ`. Derive every joint by hand with this recipe before coding it.
- **Why constraint impulses lie along `Jᵀ`:** they do no work. This one fact explains the whole method.
- **Drift and its correction.** Velocity constraints let positions creep; Baumgarte, soft constraints and position passes are three answers.
- **Islands and sleeping** as graph problems: union-find over a body/constraint graph, with static bodies excluded.
- **Where Millington's engine stops.** Ch. 17's limitations section lists exactly what sequential impulses fix.

**Read, in this order**

| Resource | Sections | What to take from it |
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
- **XPBD solver:** Müller's extended position-based dynamics as an alternative to impulses; soft bodies and cloth.
- **Performance:** struct-of-arrays layout in `Float64Array`s; object pooling; benchmark against cannon-es.
- **WebGPU:** move rendering to `WebGPURenderer`; later, a GPU broadphase.
- **Publishing the engine to npm:**
  - A scoped or unclaimed package name (`aether` is taken).
  - Vite library mode building `src/index.ts`; `tsc --emitDeclarationOnly` for `.d.ts` files (a separate `tsconfig.build.json`, since the main config uses `noEmit`).
  - `package.json`: `exports` with `.` and `./math` subpaths, `"sideEffects": false`, `files: ["dist"]`, and `three` and `lit` absent from `dependencies`.
  - API docs generated from the TSDoc comments with TypeDoc; semantic versioning from 0.x.
- **Publishing the playground:** deploy to GitHub Pages; record GIFs for the README.
- **Better aerodynamics:** replace the linear lift curve with real airfoil data, add induced drag, and give the aircraft stability.
  *Approach:* load a `C_L(α)` / `C_D(α)` table from Airfoil Tools and interpolate it; build the forces per surface as in Phase 4.

### Study

| Goal | Resource | Sections | What to take from it |
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

## Working rhythm for each phase

1. Work through the phase's **Study** section in order. Take notes in `docs/notes/phase-N.md`.
2. Sketch the classes from the **Build** section; adjust the signatures to your API decisions.
3. Write tests for the math first.
4. Implement the engine side in plain TypeScript, with terse TSDoc on public members.
5. Build the demo and its debug visualization.
6. Add the phase's UI feature.
7. Write down what surprised you in the notes file, tick the boxes here, and commit.
