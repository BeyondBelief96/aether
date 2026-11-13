# Aether: roadmap

Two products from one repository, both written from scratch in TypeScript:

- **Aether** (`aether-physics`): a 3D rigid-body physics engine for games and interactive scenes. Stable and fast at a fixed timestep. Built first.
- **Aether Lab** (working name): a simulation and visualization library for the systems in a physics course. Students and teachers declare a system, whether a double pendulum, a charged particle in a magnetic bottle or a dipole antenna, and get an accurate, instrumented 3D view of it in a few lines. Built on the engine's math once the engine is done.

They share the math library and the Three.js layer, and nothing else. They have different users, different promises (plausible at 60 Hz versus correct to a stated tolerance) and different APIs.

The project has four goals:

1. **Learn how physics engines work** by writing the math, integrators, collision detection and solvers by hand.
2. **Ship the engine**, `aether-physics`, as a library people can adopt.
3. **Ship the Lab**: an accurate simulation core with error control, generalized coordinates and fields, tested against analytic solutions, with a Three.js layer so setting up a simulation never means writing a renderer.
4. **Learn modern web UI** (TypeScript, Lit, CSS layout, Canvas, WebGL and WebGPU, Web Workers) by building the demo app, the libraries and the site.

---

## How to use this roadmap

This is a map of **concepts to learn and decisions to make**, in the order Millington's book introduces them, with the extra ideas production engines add along the way. It is not a specification. It doesn't name files or sketch classes; the shape of the code is yours to decide as you build, and the right shape depends on what the engine looks like by then.

Every step answers five questions:

- **Concept:** what to understand, and whether it is in the book (with sections) or comes from elsewhere.
- **In the engine:** how it connects to what already exists: which types it touches, which seam it sits behind, what it changes in the step pipeline.
- **Decisions:** the real choices, with their tradeoffs and what each one locks in or opens up later. A recommendation where one is clear; open where it isn't.
- **Proves it:** the demo and the behaviours that show it works.
- **Read:** what to read alongside, in order.

Cross-cutting choices that come up in several phases, such as force-based vs impulse-based vs position-based, live once in [The big decisions](#the-big-decisions), and steps link to them.

**Keep it current.** Update this file in the same change as the work. When a step lands, mark it ✅, refresh [The engine today](#the-engine-today) if the pipeline or a seam changed, record the decision you made where the step lists it, and add new differences from the book. What was built, file by file, and where it departed from the plan goes in [BUILD-LOG.md](./BUILD-LOG.md). The README, website and demo app have no roadmap: they show only what exists.

Other docs: the reading list is [RESOURCES.md](./RESOURCES.md), the Millington vs Box3D comparison is [BOX3D.md](./BOX3D.md), and how to build a demo is [DEMOS.md](./DEMOS.md).

---

## Ground rules

These hold for every phase.

| Rule | Why |
|---|---|
| **The engine never imports `three` or touches the DOM.** `packages/aether` is plain TypeScript, type-checked without DOM types. | It can be unit-tested in Node, moved into a Web Worker, and rendered by anything. |
| **Demos are the bridge.** Only `apps/editor/src/demos/*` imports both the engine and Three.js. Once Track V starts, `packages/aether-viz` is the second bridge. | Rendering concerns stay in one place. |
| **Fixed timestep, always.** Physics steps in equal `dt` slices; the renderer interpolates. | Stable, reproducible simulation. |
| **TypeScript `erasableSyntaxOnly`.** No `enum`, `namespace`, parameter properties or `import x = require()`. | The code stays "JavaScript with types" and runs under Node's type stripping. |
| **Lit without decorators.** `static properties` with `declare` fields and `customElements.define`. | Closer to the platform; no decorator transform. |
| **Test first for math.** Every vector, matrix and quaternion operation gets a test before it is used. | A wrong cross product is miserable to find visually. |
| **Draw what you compute.** Every new concept gets a debug visualization. | Most physics bugs are obvious once you can see them. |
| **The book's version first, behind a seam.** Each concept is built Millington's way first. Production versions (Catto, Box3D, Müller) go beside it as alternatives, never replacing it. See [Seams](#seams). | You can follow the book, and every comparison demo has the book's version as its baseline. |
| **Generalize on the second implementation.** Extract an interface when the alternative arrives, not before. | Interfaces shaped by two real implementations instead of guesses. |
| **Record where Aether differs from the book.** Every phase keeps a list. | The book stays usable as a guide even where the engine has moved on. |
| **The engine is a publishable library.** Public methods accept `Vec3Like` / `QuatLike`. Source comments are terse API docs; explanations go in `docs/`. | Users can pass `THREE.Vector3`; the code reads like a library. |
| **Accuracy is explicit (Track S).** Every simulation names its integrator and a step size or tolerance. | A user should know how far to trust what they see. |
| **No hidden fudges in the Lab.** No default damping, velocity clamps or softening in `aether-lab`. | Game-grade tricks would quietly falsify a mechanics problem. |
| **Test against the answer (Track S).** Analytic solutions and convergence order. | A teaching tool has to be right, not just look right. |
| **CPU first, GPU second.** Every GPU kernel has a tested CPU reference. | GPU code is hard to debug, and float32 needs a float64 reference. |

---

## The engine today

What exists now, and how a step runs. Update this whenever the pipeline or a seam changes.

**Packages.** Only `packages/aether` (`aether-physics`) exists, with `math/`, `loop/` and `particles/`. Rigid bodies, collision detection, the Lab and `aether-viz` don't exist yet.

**State.** A `Particle` holds `position`, `velocity`, `inverseMass`, `damping` (fraction kept per second, applied as `damping^dt`), `gravityScale`, a `forceAccum` and `lastAcceleration`. The engine is **force- and impulse-based**: state is position plus velocity, forces change velocity through an integrator, and contacts change velocity with impulses and position with a direct push.

**One step of `ParticleWorld`:**

```
step(dt)
  integrator.step(particles, forces, dt)        seam: ParticleIntegrator (4 implementations)
    └ forces.evaluate()                          registry generators + world gravity, as often as the integrator asks
  lastAcceleration ← force · w; clear forces
  contact generators fill a pooled contact array ground, cables, rods, user generators
  contactResolver.resolveContacts(…)            seam: one implementation so far (worst first)
    └ per contact: velocity impulse, then position push, then fix up neighbours
```

**What works:** gravity, drag, springs, bungees, buoyancy and attraction as force generators; four switchable integrators; contacts with restitution and resting-contact correction; cables and rods as contact generators; 15 demos built on all of it.

**Known limits** (each is what a later step exists to fix):

- **Chains of hard constraints converge slowly.** Worst-first resolution fixes one contact per iteration, so error spreads one link per iteration. The *Bridge* needs about 2,000 iterations per step to hold its cables within a millimetre. → Phase 3, Steps 8 and 10.
- **Stiff springs explode** once `ω·dt > 2` with semi-implicit Euler. → Phase 3, Step 8 (compliance), Phase 6 (soft constraints).
- **Contacts are found once per step**, so resolving one can push a particle into something nothing is watching, and stacks sink. → Phase 3, Step 10; Phase 5's margins and persistent manifolds.
- **The resolution maths lives inside `ParticleContact`**, so a second resolver can't reuse the contact as plain data. → Phase 3, Step 10.
- **Particles and rigid bodies will be separate worlds.** Ropes can't hang from boxes. → [D10](#d10-one-world-or-two).

### Seams

A seam is a small interface at a point where the book and production engines differ, so both can run side by side and demos can switch between them, as Box2D's samples and Catto's [Solver2D](https://box2d.org/posts/2024/02/solver2d/) do.

| Seam | Phase | Book's version (first) | Alternatives | Status |
|---|---|---|---|---|
| `ParticleIntegrator` | 2 | Semi-implicit Euler | Explicit Euler (the book's order), velocity Verlet, RK4 | ✅ four implementations |
| Particle contact resolver | 3 | Worst contact first | Sequential impulses with warm starting | One implementation; interface extracted at Step 10 |
| Position-based particles | 3 | none (not in the book) | Verlet / PBD / XPBD | Step 8 decides whether this is a seam or a separate system |
| Gyroscopic mode | 4 | `'none'` | `'momentum'`, `'implicit'` | Planned |
| `Broadphase` | 5 | Brute force, then a bounding-volume hierarchy | Sweep-and-prune, dynamic AABB tree | Planned |
| `Solver` (rigid bodies) | 6 | v1: Millington's resolver | v2: sequential impulses; v3: Box3D's Soft Step; later XPBD | Planned |
| `Constraint` | 7 | none (the book's joints are contacts) | Jacobian rows shared by contacts and joints | Planned |

Rules for seams:

- **Data stays separate from the algorithm** once a seam has two implementations. Contacts, manifolds and joints are data every implementation reads.
- **Switching is safe between steps.** An implementation keeps only caches it can rebuild, and resets them when swapped in.
- **Every implementation passes the same tests** for the behaviour they share, and comparison demos time each stage.
- **Force generators keep no per-call state**, because multistage integrators evaluate them more than once per step.

### Folder layout

```
packages/aether/src/
  index.ts      public entry point (engine + math)
  math/         Vec3, Mat3x3, Mat3x4, Quaternion, scalar helpers
  loop/         FixedStepLoop
  particles/    Particle, ParticleWorld
    integrators/  the four integrators
    forces/       gravity, drag, springs, buoyancy, attraction
    contacts/     contacts, the resolver, ground, cables and rods
  (planned) collision/  shapes, bounds, broadphase, narrowphase; never imports a body
  (planned) bodies/     RigidBody, World, with forces/, contacts/, solver/, joints/
packages/aether-lab/  (planned) the Lab's simulation core
packages/aether-viz/  (planned) the Three.js layer shared by the demo app and the Lab
packages/aether-gpu/  (planned) WebGPU kernels for the Lab
apps/editor/src/
  core/         demo contract, parameter schema, routes, session
  stage/        Three.js renderer and theme palette
  demos/        one file per demo by category, with a Three.js-free `<name>-sim.ts` beside it
  ui/           Lit components
apps/site/      the website
docs/           this roadmap, the build log, resources, demo guide
```

The engine is split by system first and stage second. Imports run one way: `math → collision → particles` and `math → collision → bodies`. File names drop the system prefix their class carries (`particles/forces/spring.ts` exports `ParticleSpring`), one main class per file, tests in a `tests/` folder in each module, and each folder has an `index.ts` barrel.

---

## The big decisions

These choices span several phases. Each step that runs into one links here. **Aether today** records what's been chosen so far; update it when a step settles a decision.

### D1: Where constraints act: force, impulse or position

The deepest fork in engine design. Every constraint, whether a contact, a rod or a joint, has to be enforced somewhere in the chain position → velocity → acceleration.

| | Force-based | Impulse-based | Position-based |
|---|---|---|---|
| Enforced on | acceleration (a spring, or a solved constraint force) | velocity | position |
| Examples | penalty springs; Witkin & Baraff's constraint forces | Millington, Box2D/Box3D, Bullet, PhysX, Jolt's rigid bodies | Jakobsen, PBD, XPBD: Müller's work, Unity cloth, Jolt's soft bodies |
| Stiff or rigid behaviour | explodes past `ω·dt ≈ 2` unless integrated implicitly | stable; accuracy costs iterations | stable at any stiffness |
| Restitution and friction | natural | natural and exact | awkward: needs a velocity pass afterward |
| Drift | grows without feedback | needs Baumgarte, split impulses or soft constraints | none; positions are corrected directly |
| Energy | can blow up | slightly dissipative | dissipative (velocity is derived from corrected positions) |

**Aether today:** forces for springs, impulses plus a position push for contacts (the book's mix). Phase 3 Step 8 builds a position-based system so you can feel the difference; Phase 6 builds three impulse solvers; XPBD for rigid bodies is a Phase 8 option.

**Read:** Millington §1.3 (pp. 5–7) for the book's framing; Catto, [Solver2D](https://box2d.org/posts/2024/02/solver2d/), which runs all three families on the same scenes; Bender, Müller & Macklin, *A Survey on Position Based Dynamics* (Eurographics 2017 tutorial).

### D2: How the constraint system is solved

Once there are many constraints, solving one disturbs the others.

- **Worst first (Millington):** resolve the most violated constraint, update its neighbours, repeat. Easy to follow, but slow on chains and stacks.
- **Gauss–Seidel / sequential impulses / projected Gauss–Seidel:** sweep every constraint in a fixed order, keep an *accumulated* impulse per constraint and clamp the total. The industry default. Convergence is helped by warm starting.
- **Jacobi:** solve every constraint from the same old state, then apply all at once. Converges more slowly but parallelizes trivially (GPUs).
- **Graph colouring:** Gauss–Seidel within a colour, colours in sequence. Parallel and still Gauss–Seidel (Box3D).
- **Direct / LCP:** build `J·M⁻¹·Jᵀ` and solve it exactly (Dantzig, Lemke), or use reduced coordinates (Featherstone) for articulated chains. Exact, but expensive and fragile with contacts.

**Aether today:** worst first, for particles. Sequential impulses arrive in Phase 3 Step 10 for particles and Phase 6 for bodies. Colouring is Phase 8.

**Read:** Millington §7.3 and §18.1; Catto, [Sequential Impulses](https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf) (GDC 2006); Nilson Souto, [Video Game Physics Part III](https://www.toptal.com/game/video-game-physics-part-iii-constrained-rigid-body-simulation) (shows SI and PGS are the same algorithm).

### D3: Where to spend accuracy: iterations, substeps or warm starting

- **More iterations per step:** the classic knob. Cheap per iteration, but each extra iteration buys less.
- **Substeps:** split `dt` into `n` substeps with few iterations each. Macklin's "Small Steps" result: many substeps with one iteration beat few substeps with many iterations, for both XPBD and impulses. Costs integration and (optionally) collision per substep.
- **Warm starting:** start each step from last step's impulses. Nearly free and the biggest single win for stacking, but needs constraints that persist across steps (contact IDs, persistent manifolds).

**Aether today:** iterations only. The *Bridge* demo also substeps to at most 1/60 s. Warm starting needs contact IDs (Phase 3 Step 10, Phase 5); Soft Step's substeps are Phase 6 v3.

**Read:** Macklin et al., [Small Steps in Physics Simulation](https://mmacklin.com/smallsteps.pdf) (SCA 2019); Allen Chou, [Stability – Warm Starting](http://allenchou.net/2014/01/game-physics-stability-warm-starting/).

### D4: How position error is corrected

Velocity solvers drift: contacts sink, joints separate. The options, roughly in historical order:

- **Direct projection** (Millington): move the bodies apart after solving velocity. Simple and stable, but rotation from linear-only projection looks wrong, so the book adds a nonlinear version.
- **Baumgarte:** feed a fraction of the error back as target velocity. One line, but it adds energy, so stacks "pop".
- **Split impulses / pseudo-velocities:** solve the error into separate velocities that are thrown away after the position update. No added energy, extra solve.
- **Soft constraints:** model the constraint as a stiff damped spring in hertz and damping ratio, then *relax* to remove the push-out velocity (Box2D v3, Box3D). Unifies contacts and joints and tames mass ratios.
- **Compliance (XPBD):** the position-level version of the same idea.

**Aether today:** direct projection (particles). Phase 6 builds Baumgarte (v2) and soft constraints (v3).

**Read:** Catto, [Soft Constraints](https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf) (GDC 2011); Solver2D.

### D5: Integration

- **Explicit Euler:** gains energy; useful only to see why not.
- **Semi-implicit (symplectic) Euler:** velocity first, then position. Bounded energy, one force evaluation, the game default.
- **Velocity Verlet, RK4:** more accurate per step, but more force evaluations and they don't combine well with impulse contacts, which change velocity mid-step.
- **Implicit:** stable for stiff springs, but needs a linear solve.
- **Rotation adds a choice:** the gyroscopic term `ω × (I·ω)` (none, explicit via momentum, or implicit). Without it the tennis-racket flip never happens.

**Aether today:** semi-implicit Euler by default behind the `ParticleIntegrator` seam, with the other three selectable. Rigid bodies (Phase 4) start with semi-implicit Euler split into velocity and position halves, because every impulse solver runs between them.

**Read:** Glenn Fiedler, [Integration Basics](https://gafferongames.com/post/integration_basics/); Catto, [Numerical Methods](https://box2d.org/files/ErinCatto_NumericalMethods_GDC2015.pdf) (GDC 2015).

### D6: Shape of collision data

- **Shapes own a body pointer** (the book's `CollisionPrimitive`) vs **body-agnostic shapes** taking world transforms, with a `Collider` joining shape to body. Body-agnostic lets collision be tested alone, reused for queries and raycasts, and shared by particles and bodies.
- **Independent contacts** (the book) vs **manifolds** of up to four points with feature IDs. Manifolds are what make warm starting and persistent contacts possible.
- **Per-pair functions** (SAT, clipping) vs **general convex** (GJK, EPA). Specialized pairs give better manifolds; GJK handles anything with a support function.

**Aether today:** not started. The plan leans body-agnostic shapes and manifolds with feature IDs, decided in Phase 5.

**Read:** Millington ch. 12–13; Ericson, *Real-Time Collision Detection*; Catto, [Contact Manifolds](https://box2d.org/files/ErinCatto_ContactManifolds_GDC2007.pdf) (GDC 2007).

### D7: Fast motion

Thin walls and fast bullets tunnel at a fixed timestep.

- **Ignore it:** the book's choice. Fine for slow scenes.
- **Speculative contacts:** report contacts within a margin before they touch and let the solver close the gap but not cross it. Cheap, covers modest speeds, can produce ghost collisions.
- **Time of impact (TOI) / continuous collision:** find the first time of contact and advance to it. Correct but expensive; usually limited to flagged "bullets" and static geometry (Box3D's split).

**Aether today:** none. Speculative contacts arrive with Phase 6 v3; TOI is Phase 8.

**Read:** Catto, [Continuous Collision](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf) (GDC 2013); Paul Firth, [Speculative Contacts](https://web.archive.org/web/2011/http://www.wildbunny.co.uk/blog/2011/03/25/speculative-contacts-an-continuous-collision-engine-approach-part-1/).

### D8: Maximal vs reduced coordinates

- **Maximal coordinates:** every body keeps its full 6 degrees of freedom and joints remove them with constraints. General, handles loops and contacts uniformly, but chains drift and need iterations. Every game engine above does this.
- **Reduced (generalized) coordinates:** a chain is described by its joint angles (Featherstone's algorithm). Exact joints and no drift, but loops and contacts are awkward.

**Aether today:** maximal, for the engine (Phase 7). The Lab is reduced by design (S2's Lagrangian systems), which is exactly why the two are separate products.

**Read:** Millington §18.2; Catto, [Modeling and Solving Constraints](https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf) (GDC 2009); Featherstone, *Rigid Body Dynamics Algorithms*, ch. 1 (optional).

### D9: Data layout and identity

- **Objects with references** (`Particle`, `RigidBody` instances in arrays): readable, matches the book, easy to debug.
- **Handles / IDs into pools:** stable references that survive removal and reordering, safe across a Worker boundary, needed for warm starting by contact ID.
- **Struct of arrays** in `Float64Array`s, hot state apart from cold: cache-friendly and transferable to Workers or the GPU, but harder to read.

**Aether today:** objects, with preallocated pools for contacts. Contact IDs arrive in Phase 3 Step 10; SoA and handles are Phase 8, once profiling asks for them.

**Read:** Box3D's `src/body.h` (`b3BodyState` vs `b3BodySim`); Catto, [SIMD Matters](https://box2d.org/posts/2024/08/simd-matters/).

### D10: One world or two

The book builds a particle engine (ch. 3–8) and a rigid-body engine (ch. 9–17) side by side, never merged.

- **Two worlds** (current): each simple, each follows its chapters, but particles can't touch bodies.
- **Particles as bodies without rotation** in one `World` and solver: ropes can hang from boxes and particles hit bodies. Box3D has no particles at all.
- **A separate position-based layer** coupled one way (cloth driven by bodies, as many engines do for cloth).

**Aether today:** two worlds. Revisit after Phase 7; the plan keeps `ParticleWorld` either way.

### D11: Determinism and ordering

Bit-identical replays need a stable iteration order everywhere (arrays, never object identity or hash order), no `Math.random` in the engine, and care with anything order-dependent such as Gauss–Seidel sweeps, parallel solving and graph colouring. Cross-machine determinism also needs care with `Math.sin` and friends.

**Aether today:** generators run grouped by particle in a fixed order, so runs repeat exactly. A determinism test arrives in Phase 7.

**Read:** Catto, [Determinism](https://box2d.org/posts/2024/08/determinism/).

### D12: Where the engine runs

Main thread (simple, today), a Web Worker with transforms shared through a `SharedArrayBuffer` (keeps the UI smooth), or several Workers solving graph colours in parallel. Each step outward depends on D9 (data that can cross a thread boundary) and D11.

**Aether today:** main thread. Phase 8.

---

## Millington and Box3D

The main text is Ian Millington, *Game Physics Engine Development* (local PDF: `~/Desktop/Textbooks/Ian_Millington-Game_Physics_Engine_Development-EN.pdf`). Page numbers here are the book's printed numbers; **add 23 for the PDF page**.

| Book chapter | Printed pages | Phase |
|---|---|---|
| 1 Introduction | 1–12 | 0 |
| 2 The Mathematics of Particles | 13–42 | 1 |
| 3 The Laws of Motion · 4 The Particle Physics Engine | 43–66 | 2 |
| 5 Adding General Forces · 6 Springs · 7 Hard Constraints · 8 The Mass-Aggregate Engine | 69–142 | 3 |
| 9 The Mathematics of Rotations | 145–191 | 1 (§9.2, §9.4), 4 (§9.1, §9.3) |
| 10 Laws of Motion for Rigid Bodies · 11 The Rigid-Body Physics Engine | 193–227 | 4 |
| 12 Collision Detection · 13 Generating Contacts | 231–297 | 5 |
| 14 Collision Resolution · 15 Resting Contacts and Friction | 301–374 | 6 |
| 16 Stability and Optimization · 17 Putting It All Together | 375–419 | 7 |
| 18 Other Types of Physics | 423–429 | 7, 8 |
| App. A Inertia Tensors · B Friction Coefficients · D Mathematics Summary | 431–443 | 4 · 6 · 1 |

The book's code uses its own naming (`real`, `Vector3`, quaternions as `r, i, j, k`). Translate the ideas, not the identifiers.

Erin Catto's [Box3D](https://github.com/erincatto/box3d) (MIT, C17, 2026) is the modern counterpart: the same problems, solved the way Box2D v3 solves them. [BOX3D.md](./BOX3D.md) has the side-by-side comparison and a file map by phase.

| | Millington | Box3D |
|---|---|---|
| Solver | Worst contact first; separate velocity and penetration passes | Soft Step: substepped soft sequential impulses with a relax pass |
| Position error | Nonlinear projection | Soft constraints in hertz and damping ratio |
| Friction | Per point, static and dynamic | One friction cone per manifold, plus twist and rolling friction |
| Fast motion | Not handled | Speculative contacts, then time of impact for bullets |
| Collision | Box–box SAT, primitives | Hull SAT + GJK, Quickhull, dynamic AABB trees, persistent and recycled manifolds |
| Rotation | Quaternion, no gyroscopic term | Quaternion, implicit gyroscopic solve |
| Scale | Single-threaded, pointers | Islands for sleep, graph colouring, SIMD, handles, determinism |

---

## Tracks

| Track | Product | Phases | What it builds | Standard |
|---|---|---|---|---|
| **G: game-grade dynamics** | Aether (`aether-physics`) | 0–8 | Particles, rigid bodies, collision, contacts, joints | Stable, fast, plausible |
| **S: simulation core** | Aether Lab (`aether-lab`) | S1–S6 | ODE integrators with error control, exact mechanics, fields and waves | Matches analytic solutions |
| **V: visualization library** | Shared (`aether-viz`), then the Lab | V1–V5 | A Three.js layer: the demo app's stage, then `createLab` | A double pendulum in about ten lines |

**Why two products.** A game engine and a scientific simulator disagree on who owns time and accuracy, and they serve different people.

| | Aether (Track G) | Aether Lab (Track S) |
|---|---|---|
| User | A developer building a game or interactive scene | A student or teacher working a mechanics or E&M problem |
| Proof | Demos that hold up when you play with them | Matching the analytic answer |
| State | Objects that integrate themselves | One flat state vector `y` with `dy/dt = f(t, y)` |
| Integrator | Fixed: semi-implicit Euler, or substepped soft impulses | Pluggable: RK4, adaptive RK45, Verlet, Yoshida-4, Boris, implicit midpoint |
| Step size | Fixed `dt` tied to the render loop | Chosen by an error tolerance |
| Fudges | Damping, velocity clamps, soft contacts | None by default |
| Coordinates | Maximal, with constraints ([D8](#d8-maximal-vs-reduced-coordinates)) | Generalized |
| Rendering | Interpolate between the last two steps | Sample dense output at the frame's time, or play back a recording |

**What's shared.** The Lab depends on `aether-physics` for `Vec3`, `Mat3x3`, `Quaternion` and Phase 4's inertia tensors. The package is side-effect free, so the Lab doesn't pull in worlds or solvers; if that stops being true, the math moves into its own package. `aether-viz` is shared from V1.

**Order.** Phases 3–7, then S1 → V1 → S2 → S3 → V2 and V3 → S4 and S5 → V4 and V5 → S6. Phase 8's stretch goals can be done between Lab phases.

**Public surfaces.** The website and demo app present the engine and show nothing unbuilt. The Lab gets its own page at `/lab` once S1 and V1 ship; until then public surfaces don't mention it.

**Logo.** The strut mark (rods drawn as an A, a slack cable, an orange particle at the apex) is the favicon of the site and demo app and the A of the wordmark. DESIGN.md has the spec.

```
packages/aether/        aether-physics, the engine: no DOM, no three       Track G
packages/aether-lab/    aether-lab, the Lab's core: no DOM, no three       Track S
packages/aether-gpu/    WebGPU kernels for the Lab; CPU references in aether-lab
packages/aether-viz/    Three.js layer; depends on both, neither depends on it    Track V
apps/editor/            the engine's demo app, moving onto aether-viz
apps/site/              the engine's website; the Lab at /lab (V4)
```

---

## Track G: game-grade dynamics

Phases 0–8 build Aether along Millington, with Box3D as the production reference.

## Phase 0: Scaffold and game loop ✅

**Concepts:** the game loop; fixed vs variable timestep; the accumulator; interpolating render state by `alpha`; the "spiral of death" and the frame-time clamp; `requestAnimationFrame`.

**Decisions made:** the loop is a clock the user drives (`FixedStepLoop`); the engine never calls it. Every demo can turn interpolation off with the Smooth switch, which shows why it matters in any scene.

**Proved by:** loop tests for step counting, leftover alpha, the clamp, pause, single step and time scale.

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Glenn Fiedler, [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) | All | The accumulator, the frame clamp and `alpha` interpolation. |
| Millington ch. 1 | §1.2–1.4 (pp. 2–10) | §1.3.2 and §1.3.3 preview the solver families of [D1](#d1-where-constraints-act-force-impulse-or-position). §1.4.1 is a self-check list for Phase 1. |
| Liam Brummitt, [Game physics from scratch](https://brm.io/game-physics-for-beginners/) | The link list | A map of the field. |
| [Lit reactive properties](https://lit.dev/docs/components/properties/) | JavaScript tab | `static properties` without decorators. |

More: [RESOURCES.md, Phase 0](./RESOURCES.md#phase-0-scaffold-and-game-loop)

---

## Phase 1: Math library ✅

**Concepts:** dot and cross products geometrically; multiplication order; row- vs column-major storage; points vs directions; quaternion rotation, composition and normalization; gimbal lock; floating-point tolerance.

**Decisions made:**

- **Mutable methods returning `this`** (`v.add(w).scale(2)`), `clone()` for copies, plain public `x`/`y`/`z`. No allocation in solver inner loops. The cost: aliasing bugs, so every method reads its inputs into locals first.
- **Row-major storage, column vectors.** Demos build Three.js transforms from position and quaternion rather than copying matrix arrays.
- **Quaternions are `x, y, z, w`**, and the 3×4 affine matrix is `Mat3x4`. Box3D stores transforms as `{p, q}` with no matrix at all; worth comparing when Phase 4 needs world transforms.
- **Methods arrive when first used.** Still owed: `setInertiaTensorCoeffs` (Phase 4), `setSkewSymmetric` and `add` (Phase 7).

**Key ideas to keep handy:** rotate a vector with `t = 2(u × v)`, `v' = v + w·t + u × t`; integrate orientation with `q += ½·dt·ω̃·q`, then normalize; `q` and `−q` are the same rotation, so tests compare `|dot| ≈ 1`; the inverse of a rotation is its transpose.

**Where Aether differs from the book:** quaternion component order and names; chainable in-place methods accepting `Vec3Like`; inverse rigid transforms use the transposed rotation; methods are added when first used.

**Proved by:** identity, known-value, round-trip, aliasing and property-based tests; the *Rotation* demo.

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| 3Blue1Brown, [*Essence of Linear Algebra*](https://www.3blue1brown.com/topics/linear-algebra) | Ch. 1–7, 10 | Intuition before formulas. |
| Millington ch. 2 | §2.1 Vectors (pp. 15–35); §2.2 Calculus (pp. 35–42) | `Vec3`, the orthonormal basis you'll reuse for contact tangents. |
| Millington ch. 9 | §9.2 (pp. 152–159); §9.4 (pp. 161–191) | Why quaternions; the matrix and quaternion classes. |
| Song Ho Ahn, [Quaternion to Rotation Matrix](http://www.songho.ca/opengl/gl_quaternion.html) | All | A derivation and a ready-made known-value test. |
| [Interactive quaternions](https://eater.net/quaternions) | The explorable | `q · v · q*` and `q ≡ −q`. |
| Dunn & Parberry, [*3D Math Primer*](https://gamemath.com/book/) | Matrices and orientation | A more careful second treatment. |
| Millington App. D | pp. 438–440 | A one-page formula sheet. |
| Box3D `math_functions.h`, `math_internal.h` | `b3Quat`, `b3Transform`, `b3IntegrateRotation` | A quaternion-first engine with almost no matrix code. |
| Fabian Giesen, [Quaternion differentiation](https://fgiesen.wordpress.com/2012/08/24/quaternion-differentiation/) | All | Where `q̇ = ½ωq` comes from. |

More: [RESOURCES.md, Phase 1](./RESOURCES.md#phase-1-math-library)

---

## Phase 2: Particles and integration ✅

**Concepts:** Newton's second law; inverse mass (`0` means immovable); frame-rate-independent damping; explicit Euler, semi-implicit Euler, velocity Verlet, RK4; order of accuracy; energy drift and stability.

**Decisions made:**

- **Inverse mass is stored**, so static objects fall out of every `Δv = impulse · w` with no special case.
- **Semi-implicit Euler by default**, not the book's order: velocity first keeps energy bounded ([D5](#d5-integration)).
- **Gravity belongs to the world**, scaled per particle by `gravityScale`, so `Particle` knows nothing about gravity.
- **Integrators belong to the world, behind a seam.** A `ForceEvaluator` reruns the generators at trial states, so RK4 and Verlet work on real particles. This is why force generators must be stateless.
- **Damping is `damping^dt`** per step. Box3D's Padé form `v *= 1 / (1 + dt·c)` is cheaper and stable at any `dt`; a candidate when rigid bodies arrive.

**Where Aether differs from the book:** integration order (the book is explicit Euler for position, §3.3; available as `ExplicitEuler`); gravity on the world rather than a per-particle acceleration (§3.2.6); invalid input throws; integrators are a seam.

**Proved by:** velocity Verlet matching `x₀ + v₀t + ½at²` exactly; damping independent of rate; bounded vs growing energy over 10,000 spring steps; RK4's error falling 16× as `dt` halves; the *Ballistics*, *Fireworks* and *Integrators* demos.

### Resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 3 | §3.2 (pp. 44–50); §3.3 The Integrator (pp. 50–54) | Inverse mass; the book's update and damping. |
| Millington ch. 4 | §4.1 Ballistics (pp. 55–60); §4.2 Fireworks (pp. 60–66) | Demo presets. |
| Glenn Fiedler, [Integration Basics](https://gafferongames.com/post/integration_basics/) | All | The integrators side by side. |
| Witkin & Baraff, *PBM* notes ([PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf)) | "Differential Equation Basics" (PDF pp. 5–12); "Particle System Dynamics" §1–4 (pp. 13–20) | Why explicit Euler diverges; a clean state/derivative architecture. |
| Chris Hecker, [Physics, Part 1](https://www.chrishecker.com/Rigid_Body_Dynamics) | All | Linear motion and integration from first principles. |
| Newcastle University, [Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | Tutorial 2 | A second explanation as course notes. |
| Ten Minute Physics ([index](https://matthias-research.github.io/pages/tenMinutePhysics/index.html)) | Ep. 01–02 | Runnable examples. |

More: [RESOURCES.md, Phase 2](./RESOURCES.md#phase-2-particles-and-integration)

---

## Phase 3: Forces, springs and mass aggregates

**Goal:** particles connected into structures: ropes, cloth, bridges, frames. And the first real encounter with [D1](#d1-where-constraints-act-force-impulse-or-position): the same structure built from springs, from contacts, and from position constraints.

| Step | Concept | Source | Status |
|---|---|---|---|
| 1 | Force generators and the registry | Book §5.2 | ✅ |
| 2 | Velocity-dependent force: drag | Book §5.2 | ✅ |
| 3 | Springs and bungees | Book §6.1–6.2 | ✅ |
| 4 | Position-dependent force: buoyancy | Book §6.2.4 | ✅ |
| 5 | A single contact | Book §7.1–7.2 | ✅ |
| 6 | Contact generation vs resolution | Book §7.3 | ✅ |
| 7 | Hard constraints as contacts: cables and rods | Book §7.4, ch. 8 | ✅ |
| 8 | Position-based dynamics: Verlet and XPBD | Not in the book | |
| 9 | Interaction: dragging, rope, tearing cloth | Partly §8.2 | |
| 10 | A second resolver: sequential impulses | Not in the book | |

### Steps 1–4: Forces ✅

**Concept.** D'Alembert's principle: forces simply add, so each force can be a separate generator that writes into an accumulator. Drag depends on velocity, springs on relative position, buoyancy on depth with three regimes.

**What the engine chose.**

- **The registry groups generators by particle** rather than the book's flat list of pairs (§5.2), so removing a particle is one delete and runs repeat exactly.
- **A spring pushes only the particle it's registered on**, as in the book, so a two-ended spring is registered twice. The alternative, one generator applying equal and opposite forces, would halve the work and guarantee momentum conservation, but breaks the one-particle generator interface. Worth revisiting when bodies get `BodySpring` in Phase 4.
- **Generators are stateless**, required by the multistage integrators.

**What it taught.** The stiffness limit: semi-implicit Euler is stable for a spring only while `ω·dt < 2`, with `ω = √(k/m)`. The *Integrators* demo shows the explosion at exactly that line. Millington's answer (§6.3.2, *Faking Stiff Springs*) is a workaround; Step 8 is the real answer.

**Proved by:** *Springs*, *Cloth*, *Drumhead*, *Elastic pendulum*, *Raft*, *Orbits*.

### Steps 5–7: Contacts and hard constraints ✅

**Concept.** A contact is a constraint "these two must not approach": solve it with an impulse on the separating velocity `vₛ = (vₐ − v_b)·n` toward `−e·vₛ`, split by inverse mass, then push the particles out of overlap. Resting contact needs a trick: remove the velocity the last step's acceleration added before applying restitution, or a resting particle hops. Cables and rods are **contact generators**: a rod that is too long or too short just reports a contact, so structures need no new solver.

**What the engine chose.**

- **Detection and resolution are split** (generators fill a pool; a resolver consumes it), which is the shape every engine keeps.
- **One loop for velocity and penetration**, as in the book's source, picking the contact with the lowest separating velocity among those closing *or* penetrating.
- **Resting correction uses the total acceleration** (`lastAcceleration`), not just gravity, so springs and buoyancy pressing into a contact are corrected too.

**What it taught.** Worst-first resolution is easy to follow and correct for a few contacts, but a chain of hard constraints is its worst case: the *Bridge* needs about 2,000 iterations per step to hold, because error moves one link per iteration. That number is the baseline Steps 8 and 10 are measured against. Contacts generated once per step also let stacks sink (see [The engine today](#the-engine-today)).

**Proved by:** *Bounce*, *Break*, *Bridge*, *Pendulums*, *Frames*.

### Step 8: Position-based dynamics: Verlet and XPBD

**Concept.** *Not in the book*: Millington never mentions Verlet or position-based methods; §6.3.2 *Faking Stiff Springs* is the closest he gets. From Jakobsen (2001), Müller et al. (PBD, 2007) and Macklin, Müller & Chentanez (XPBD, 2016).

Instead of enforcing constraints on velocity, **predict positions, project them onto the constraints, and derive velocity from how far each point moved**:

```
predict  x* = x + v·dt + a·dt²       (or Jakobsen: x* = 2x − x_prev + a·dt²)
project  for each constraint, move its points to satisfy it, weighted by inverse mass
derive   v = (x* − x) / dt
```

Because velocity comes from the corrected positions, a constraint can never inject energy the way a stiff spring does. Arbitrarily stiff rods stay stable. **XPBD** adds a per-constraint multiplier `λ` and a compliance `α` (the inverse of stiffness), so a constraint's stiffness no longer depends on the iteration count or `dt`:

```
α̃ = α / dt²
Δλ = (−C − α̃·λ) / (Σ wᵢ|∇Cᵢ|² + α̃)
Δxᵢ = wᵢ · ∇Cᵢ · Δλ
```

`α = 0` is a rigid rod; `α > 0` is a spring that behaves the same at 8 or 80 iterations.

**In the engine.** This is the first time you build the third column of [D1](#d1-where-constraints-act-force-impulse-or-position), and it is closer to what exists than it looks:

- **The integrator is almost the same.** `x' = 2x − x_prev + a·dt²` is algebraically semi-implicit Euler with `v = (x − x_prev)/dt`. What's new is where constraints act, not the integration.
- **You've already written half of the projection.** `ParticleContact`'s position push for a rod is Jakobsen's stick projection. Millington adds a separate velocity impulse on top; PBD drops it and derives velocity instead.
- **XPBD's `λ` is Step 10's accumulated impulse at the position level** (impulse ≈ `λ/dt`). Both are Gauss–Seidel sweeps over constraints with a running multiplier ([D2](#d2-how-the-constraint-system-is-solved)), and compliance is the position-level version of the soft constraints in Phase 6 v3 ([D4](#d4-how-position-error-is-corrected)). Building this first makes Step 10 and Phase 6 much easier to read.
- **Substepping beats iterating** ([D3](#d3-where-to-spend-accuracy-iterations-substeps-or-warm-starting)). XPBD is where Macklin found it, and it is the idea behind Box3D's Soft Step.
- **It doesn't fit the current seams cleanly.** `ParticleIntegrator` assumes position plus velocity and force evaluation; `ParticleContact` resolves velocity. That mismatch is the main decision below.

**Decisions.**

- **Which form of position-based dynamics?**
  - *Jakobsen Verlet*: stores `previous` instead of velocity. The simplest possible loop; velocity is implicit. But force generators, contacts with restitution, and anything velocity-based (drag, friction) don't apply directly.
  - *Müller's PBD loop with explicit velocity*: keeps `v`, predicts, projects, then recomputes `v`. Slightly more code, but damping, drag, friction and restitution have somewhere to go, and the state looks like a `Particle`.
  - *Recommendation*: Müller's loop with XPBD compliance. It's the form the rest of the literature (and rigid-body XPBD in Phase 8) uses, and it keeps the door open to reusing forces.
- **Separate system or part of `ParticleWorld`?**
  - *A separate `VerletSystem`* with its own point type: isolated and easy to compare, but duplicates gravity, damping and drawing, and can't interact with particles or contacts.
  - *A third stage in `ParticleWorld`*: predict with the existing integrator, then project position constraints, then derive velocity. Reuses force generators and the integrator seam, and lets springs, rods and PBD sticks share a scene. Changes the world's step order and needs a new constraint type that isn't a contact.
  - *Trade*: the separate system keeps the book's engine untouched (the ground rule); the integrated one teaches more about where a pipeline bends. Either way, decide whether rods become a position constraint or stay contacts.
- **Gauss–Seidel or Jacobi projection?** Gauss–Seidel (in order, using the latest positions) converges faster; Jacobi (average all corrections) is order-independent and parallel. Start with Gauss–Seidel.
- **Iterations or substeps?** Build both knobs so the demo can show "Small Steps" directly.
- **Damping.** PBD loses energy in projection; decide whether to add damping on top or rely on that, and say which in the demo.

**Proves it.**

- A rigid stick (`α = 0`) holds its length under gravity at any iteration count that converges.
- An unconstrained point follows the same arc as a `Particle` under semi-implicit Euler.
- A compliant stick's stretch barely changes between 20 and 40 iterations (XPBD), and *does* change for plain PBD stiffness.
- The *Bridge* rebuilt with position constraints holds its shape at a few iterations per step, measured against the 2,000-iteration baseline.
- One substep sweep vs one iteration sweep at the same cost, with the error plotted.

**Read, in order.**

| Resource | Sections | Use it for |
|---|---|---|
| Thomas Jakobsen, [Advanced Character Physics](https://web.archive.org/web/20080410171619/http://www.teknikus.dk/tj/gdc2001.htm) | All | Verlet plus constraint relaxation in its simplest form. |
| Müller, Heidelberger, Hennix & Ratcliff, *Position Based Dynamics* (2007) | §3 The algorithm | The velocity-keeping loop and constraint projection. |
| Macklin, Müller & Chentanez, [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf) (2016) | §3–4 | Compliance and `λ`. |
| Macklin et al., [Small Steps in Physics Simulation](https://mmacklin.com/smallsteps.pdf) (SCA 2019) | §1–4 | Why substeps beat iterations. |
| Ten Minute Physics ([index](https://matthias-research.github.io/pages/tenMinutePhysics/index.html)) | Ep. 05, 08, 09, 10, 14 | Runnable PBD, XPBD, soft bodies and cloth. |
| Witkin & Baraff, *PBM* notes ([PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf)) | "Implicit Methods" (PDF pp. 93–97) | Why stiff systems need implicit integration, which XPBD sidesteps. |
| Catto, [Solver2D](https://box2d.org/posts/2024/02/solver2d/) | All | *After* building it: XPBD next to soft step and sequential impulses on the same scenes. Bridges into Step 10 and Phase 6. |
| Bender, Müller & Macklin, *A Survey on Position Based Dynamics* (Eurographics 2017 tutorial) | Overview | The whole family, for later. |

### Step 9: Interaction: dragging, rope and tearing cloth

**Concept.** Moving something through a simulation without teleporting it, and removing constraints at runtime. Partly in the book: §8.2 builds rope bridges; dragging and tearing are not covered.

**In the engine.** Cast a ray from the pointer onto the plane through the held point facing the camera; that target then drives the simulation one of three ways, one per [D1](#d1-where-constraints-act-force-impulse-or-position) column:

- *Force*: a stiff `ParticleAnchoredSpring` from the target (its anchor is already mutable for this). Needs damping along the spring axis, or the held point rings.
- *Position (Step 8)*: make the held point kinematic (`inverseMass = 0`) and move it toward the target each step.
- *Teleporting*: the wrong answer. A teleport has no velocity, so contacts and neighbours react badly. Worth showing once.

Tearing removes a constraint whose strain passes a threshold, which tests whether constraint storage tolerates removal mid-run ([D9](#d9-data-layout-and-identity)).

**Decisions.**

- **Spring damping.** Add damping along the spring axis (`−c·((vₐ − v_b)·d̂)·d̂`) to `ParticleSpring` and `ParticleAnchoredSpring`, so rope and cloth settle without slowing as a whole? Or leave the book's springs as they are and damp only in the demo?
- **Which cloth backs the demo?** Springs, rods or XPBD sticks, or all three switchable. Switchable is the most instructive.

**Proves it.** *Rope and cloth*: you can drag the cloth at 60 Hz without it exploding, tear it, and explain which of the phase's three methods made that possible.

**Read.** Witkin & Baraff, *PBM* notes, "Particle System Dynamics" §5 *User Interaction* (PDF p. 21); Glenn Fiedler, [Spring Physics](https://gafferongames.com/post/spring_physics/); Ten Minute Physics ep. 14 (cloth).

### Step 10: A second resolver: sequential impulses

**Concept.** *Not in the book.* Erin Catto's sequential impulses (GDC 2006): sweep every contact in order, compute the impulse each needs, **accumulate** it, and clamp the *total* rather than each increment, so later sweeps can take back what earlier ones over-applied. Carry each contact's impulse into the next step (warm starting) and a chain converges in a handful of iterations. For particles the effective mass is just `1 / (wA + wB)`, so the algorithm is visible without the angular terms Phase 6 adds.

**In the engine.** This is the resolver seam's second implementation, so by the ground rule this is when the interface gets extracted:

- The resolution maths moves out of `ParticleContact` into the worst-first resolver, so the contact becomes plain data both resolvers read.
- Warm starting needs a **stable identity per contact across steps** ([D9](#d9-data-layout-and-identity)): something like "cable 12" or "ground, particle 40". That's a contact ID set by the generator, the particle version of Phase 5's feature IDs.
- Position drift needs its own correction ([D4](#d4-how-position-error-is-corrected)), since sequential impulses only solve velocity.

**Decisions.**

- **Position correction:** keep the book's position push after the impulses, use Baumgarte bias, or split impulses? Baumgarte is the classic SI pairing and the easiest; try at least two in the demo.
- **Restitution threshold:** below some approach speed (about 1 m/s), use `e = 0` or resting particles never settle. The book handles this with the resting-contact correction; SI usually uses a threshold. Which, or both?
- **Where IDs come from:** each generator chooses (simple, but generators must be stable), or the world assigns by `(generator, index)` (uniform, but reordering breaks it).
- **Order of the sweep** affects convergence and determinism ([D11](#d11-determinism-and-ordering)). Generator order is the simple default.

**Proves it.** Every Step 5–7 behaviour test passes under both resolvers; the bridge and the resting particle behave under both; switching resolvers mid-run keeps the scene valid; and the *Bridge* and *Rope and cloth* demos gain a resolver selector with step timings that show where each one wins.

**Read.**

| Resource | Sections | Use it for |
|---|---|---|
| Erin Catto, [Fast and Simple Physics using Sequential Impulses](https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf) (GDC 2006) | All | The algorithm, accumulated clamping, warm starting. |
| [box2d-lite](https://github.com/erincatto/box2d-lite) | `Arbiter.cpp` | The whole solver in about 200 lines. |
| Allen Chou, [Constraints & Sequential Impulse](http://allenchou.net/2013/12/game-physics-constraints-sequential-impulse/) | All | The derivation, step by step. |
| Catto, [Solver2D](https://box2d.org/posts/2024/02/solver2d/) | All | Position-correction strategies compared. |

### Phase 3: where Aether differs from the book

- **The registry groups generators by particle**; the book keeps a flat list (§5.2).
- **Gravity is built into the world**; the book uses `ParticleGravity` or a per-particle acceleration. `ParticleGravity` stays for custom fields.
- **`ParticleAnchoredSpring` copies its anchor** and exposes it for dragging; the book holds a pointer.
- **`ParticleAttraction` is not in the book.**
- **Contacts name their particles** `particleA` / `particleB`, are pooled and filled with `set()`. A contact's normal is the direction `particleA` is pushed.
- **The resting-contact correction uses the total acceleration**, not just the constant acceleration field.
- **One resolver loop for velocity and penetration**, as in the book's source rather than the two passes in §7.3.1's text.
- **The resolver stops when nothing qualifies**, zeroes the resolved contact's penetration, uses a 1e-9 tolerance and skips immovable contacts. The book's listing can index past the array or spend every iteration on rounding residue.
- **Links validate their arguments** and skip coincident particles rather than producing a NaN normal.
- **The resolver is a seam.** Sequential impulses (Step 10) are not in the book.
- **Position-based dynamics (Steps 8–9) is not in the book.**

### Phase 3: other resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 5 | §5.1–5.3 (pp. 69–79) | The registry, and why gravity and damping bypass it. |
| Millington ch. 6 | §6.1–6.2 (pp. 81–93); §6.3 Stiff Springs (pp. 93–101) | One generator per subsection; read §6.3.2 critically against Step 8. |
| Millington ch. 7 | §7.1–7.4 (pp. 103–131) | Contact maths, resting contacts, the resolver, cables and rods. |
| Millington ch. 8 | All (pp. 133–142) | How the pieces combine; the bridge comes from §8.2.1. |
| Andrew Witkin, [Constrained Dynamics](https://www.cs.cmu.edu/~baraff/pbm/constraints.pdf) | "Constraint Forces", "A bead on a wire", "Feedback" | The *force-based* alternative to rods ([D1](#d1-where-constraints-act-force-impulse-or-position)). The rest belongs to Phase 7. |

More: [RESOURCES.md, Phase 3](./RESOURCES.md#phase-3-forces-springs-and-mass-aggregates)

---

## Phase 4: Rigid bodies

**Goal:** bodies that rotate as well as translate.

**Where the engine stands.** Particles have `position`, `velocity`, an accumulator and a world with a force registry and gravity. A rigid body is a particle plus orientation, angular velocity, an inertia tensor and torque, so this phase rebuilds Phase 2 and 3's structure for bodies, which is the point to apply what those phases taught (stateless generators, world-owned gravity, an integrator split you can put a solver inside). Collision doesn't exist yet, so bodies only feel forces.

| Step | Concept | Source |
|---|---|---|
| 1 | Inertia tensors | Book §10.2, App. A |
| 2 | Stored state vs derived data | Book §10.1, §10.2.3 |
| 3 | Torque and points on a body | Book §10.3 |
| 4 | Integrating rotation | Book §10.4 |
| 5 | Force generators and the world | Book ch. 11 |
| 6 | Seeing what's missing: the tennis-racket flip | Not in the book |
| 7 | The gyroscopic term | Not in the book |
| 8 | Velocity clamps | Not in the book (Box3D) |
| 9 | Forces at points: springs and aero surfaces | Book ch. 11 |
| 10 | Mass properties from geometry (Mirtich) | Not in the book |

### Step 1: Inertia tensors

**Concept.** How mass is distributed about the centre of mass: a symmetric 3×3 matrix, diagonal in the body's principal axes. Off-diagonal entries are the *negated* products of inertia.

**In the engine.** A plain matrix you can test before any body exists. `Mat3x3.setInertiaTensorCoeffs` (deferred from Phase 1) arrives here.

**Decisions.** Free functions in `math/` (the Lab reuses them in S2) vs methods on the body; half extents (matching Phase 5's boxes) vs full extents.

**Proves it.** Sphere, box, cylinder and capsule match their formulas, and a dense point sampling of the box and capsule agrees.

**Key formulas.** Solid sphere `⅖mr²`. Box with full extents `w, h, d`: `Ixx = m/12·(h² + d²)` and so on. Cylinder along Y: `Iyy = ½mr²`, `Ixx = Izz = m/12·(3r² + h²)`. Capsule: cylinder plus hemispheres by the parallel-axis theorem; derive it yourself.

### Step 2: Stored state vs derived data

**Concept.** Store position, orientation, linear and angular velocity, inverse mass and the body-space inverse inertia; derive the world transform and world-space inverse inertia `R·I⁻¹·Rᵀ` once per step. Every impulse later is `Δω = I⁻¹_world·(r × J)`, which is why the *inverse* is stored.

**Decisions.**

- **World transform as a `Mat3x4`** (the book) or **position + quaternion only** (Box3D, which never stores a matrix)? The matrix is convenient for transforming many points; `{p, q}` is smaller and has no orthonormality drift.
- **Angular velocity in world space** (the book, simpler for contacts) or body space?
- **A singular inertia tensor** silently gives a body that can't rotate. Throw, and make static bodies an explicit setting.

**Proves it.** World inverse inertia equals body inverse inertia at identity orientation; a 90° rotation swaps a box's diagonal entries as expected.

### Step 3: Torque and points on a body

**Concept.** A force at a point adds `F` to the force and `r × F` to the torque. The velocity of a point is `v + ω × r`, the formula nearly every contact and joint uses.

**Proves it.** A force through the centre adds no torque; a pure couple adds torque and no net force.

### Step 4: Integrating rotation

**Concept.** The angular half of semi-implicit Euler: `ω += I⁻¹_world·τ·dt`, then `q += ½·dt·ω̃·q` and normalize.

**In the engine.** Every impulse solver in Phase 6 runs *between* integrating velocity and integrating position. Building the split now saves a restructure later.

**Decisions.**

- **Split velocity and position integration** from the start (recommended), or write the book's single `integrate` and split it in Phase 6.
- **Damping:** the particles' `damping^dt`, or Box3D's Padé `1/(1 + dt·c)` with a rate in 1/s ([D5](#d5-integration)). Linear and angular damping separately either way.
- **An integrator seam for bodies?** Particles have one. For bodies, higher-order integrators fight with impulse contacts, so the case is weaker; the gyroscopic mode (Step 7) is the seam that matters.
- **Previous state for render interpolation**: positions lerp, orientations slerp.

**Proves it.** A symmetric body spun about a principal axis stays on it; a static body never moves.

### Step 5: Force generators and the world

**Concept.** The rigid-body version of Phase 3's structure.

**Decisions.**

- **Copy the particle design** (registry grouped by body, world gravity) or **revisit it** with what Phase 3 taught? For example, two-ended springs as one generator that applies equal and opposite forces.
- **Share code with particles?** Per [D10](#d10-one-world-or-two) and the ground rule, keep them separate now and generalize only if a second real use appears.

**Proves it.** Dropped bodies match Phase 2's particle trajectories with the same damping, rendered with interpolated position and orientation.

### Step 6: Seeing what's missing

**Concept.** *Not in the book.* An asymmetric box spun about its intermediate axis should flip periodically (the Dzhanibekov or tennis-racket effect). With the book's integration, it doesn't, and `|L|` drifts.

**Proves it.** The *Spinning bodies* demo, with editable inertia, a spin about each principal axis and live `|L|` and kinetic energy, shows the flip failing to appear.

### Step 7: The gyroscopic term

**Concept.** *Not in the book.* The true rotational equation is `I·ω̇ = τ − ω × (I·ω)`. The book drops the last term.

**In the engine.** The gyroscopic mode is a seam: `'none'` (the book), `'momentum'`, `'implicit'`.

**Decisions.**

- **Integrate angular momentum** `L += τ·dt`, `ω = I⁻¹_world·L` (Baraff's approach): simple and correct in direction, but explicit, so energy slowly grows.
- **One implicit Newton step in body space** (Bullet, Box3D): solve `I(ω₂ − ω₁) + h·ω₂ × (I·ω₂) = 0`. Stable; slightly more maths.
- **Default:** implicit, with the others kept for the demo.

**Proves it.** The flip appears unscripted; `|L|` stays within a few percent over 10 s with momentum and tighter with implicit.

**Read.** Catto, [Numerical Methods](https://box2d.org/files/ErinCatto_NumericalMethods_GDC2015.pdf) (GDC 2015); Baraff's *PBM* notes §2.9.

### Step 8: Velocity clamps

**Concept.** *Not in the book* (Box3D). Cap linear speed and rotation per step (Box3D: `0.25π`), so a fast-spinning body can't rotate past a contact between steps.

**Decisions.** World settings or per body; on by default or opt-in. They're a fudge, so they stay out of the Lab entirely.

**Proves it.** An absurd angular velocity rotates no more than the limit per step; normal motion is unchanged.

### Step 9: Forces at points: springs and aero surfaces

**Concept.** Generators that apply force at body-space points, and forces computed in body space (relative wind times an aerodynamic tensor) converted back to world space. `AeroControl` blends tensors by a control input.

**Proves it.** A spring between off-centre points spins both bodies; the *Flight sim* aircraft pitches, rolls and yaws from the matching controls.

**Read.** Millington §11.2.1–11.2.2; Harry Smith, [*Aircraft Flight Mechanics*: Assumed knowledge](https://aircraftflightmechanics.com/Prerequisites/Prerequisites.html#controlsurfaces) (which surface drives which axis; `F = ½ρV²·S·C`; a lift slope near 2π per radian with a stall cutoff); [Airfoil Tools](http://airfoiltools.com/) for real `C_L(α)` tables.

### Step 10: Mass properties from geometry

**Concept.** *Not in the book.* Mirtich's algorithm computes mass, centre of mass and inertia for any closed polyhedron. The centre of mass usually isn't the mesh origin, so bodies need an offset between shape frame and body frame.

**In the engine.** Phase 5's convex hulls are the first real user; this step can wait until then.

**Proves it.** A box built as a mesh matches the box formula.

### Phase 4: where Aether differs from the book

- **Gravity is a world force**, as for particles.
- **The gyroscopic term is a seam**; the book has none.
- **Integration is split** into velocity and position halves.
- **Velocity clamps** come from Box3D.
- **Previous position and orientation** are kept for render interpolation.
- **A singular inertia tensor throws**; static bodies are explicit.
- **Inertia helpers are free functions**, and Mirtich's mass properties are not in the book.

### Phase 4: resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 9 | §9.1 (pp. 145–152); §9.3 (pp. 159–161) | Rotation in 2D first, then `v + ω × r`. |
| Millington ch. 10 | §10.1–10.4 (pp. 193–212) | The rigid body, the inertia tensor in world space, force at a point, integration. |
| Millington ch. 11 | §11.1–11.2 (pp. 213–227) | Aero surfaces and the flight and sailing simulators. |
| Millington App. A | pp. 431–433 | Known inertia tensors for tests. |
| Witkin & Baraff, *PBM* notes ([PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf)): Baraff, "Rigid Body Simulation" I | §2–5 (PDF pp. 28–55); App. A–B (pp. 79–83) | The most rigorous derivation; Baraff integrates angular momentum. |
| Chris Hecker, [Rigid Body Dynamics](https://www.chrishecker.com/Rigid_Body_Dynamics) | Part 2 (2D), Part 4 (3D) | Intuition in 2D, then the 3D inertia tensor. |
| Newcastle University, [Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | Tutorial 3 | Torque and angular integration. |
| Brian Mirtich, [Polyhedral Mass Properties](https://people.eecs.berkeley.edu/~jfc/mirtich/massProps.html) | All | Step 10. |
| Box3D `src/solver.c` (velocity integration); `src/body.h` | `b3IntegrateVelocitiesTask`; `b3BodyState` vs `b3BodySim` | Implicit gyroscopic solve, Padé damping, clamps; hot vs cold state ([D9](#d9-data-layout-and-identity)). The *Gyroscopic Precession* and *Spinning Book* samples match Step 6. |

More: [RESOURCES.md, Phase 4](./RESOURCES.md#phase-4-rigid-bodies)

---

## Phase 5: Collision detection

**Goal:** find which bodies touch, where, and how deeply.

**Where the engine stands.** Particle contacts come from hand-written generators (ground, links, the demos' sphere test). Bodies have no shapes. This phase builds a general pipeline (broadphase → narrowphase → contact data), and its output shape decides what Phase 6's solvers can do: warm starting needs feature IDs, speculative contacts need negative penetration, soft step needs fixed anchors.

| Step | Concept | Source |
|---|---|---|
| 1 | Shapes, support functions, bounding boxes | Book §12.3, §13.1 |
| 2 | Shape vs body: the collider | Partly book (`CollisionPrimitive`) |
| 3 | What a contact is: manifolds and conventions | Book §13.2, extended |
| 4 | Dispatch and the first pairs | Book §13.3 |
| 5 | Oriented shapes: sphere–box, box–plane | Book §13.3 |
| 6 | Seeing contacts: debug draw and the inspector | Not in the book |
| 7 | The separating axis theorem | Book §13.3.5 |
| 8 | Contact points by clipping, feature IDs | Book §13.3.5, extended |
| 9 | Broadphase and the pipeline | Book §12.1–12.4 |
| 10 | GJK | Not in the book |
| 11 | EPA | Not in the book |
| 12 | The rest of the pair table | Not in the book |
| 13 | The dynamic AABB tree | Partly book (BVHs) |
| 14 | Hull SAT, Quickhull | Not in the book |

### Steps 1–3: Shapes, colliders and contact data

**Concept.** A shape is geometry; a body is mass and motion; a collider joins them with an offset and a material. The **support function** (the farthest point in a direction) is the one query that GJK, EPA and bounding boxes all need. A **manifold** is a contact *area*: one normal and up to four points.

**In the engine.** This is [D6](#d6-shape-of-collision-data). The book's `CollisionPrimitive` holds a body pointer; the plan leans toward body-agnostic shapes taking world transforms, so `collision/` never imports a body and particles could use it too.

**Decisions.**

- **Shape representation:** a discriminated union of plain data (switch on `kind`) or classes with methods. The union keeps dispatch explicit and data serializable; classes put the support function next to the data.
- **Planes:** infinite, static only. Give them a huge AABB and let the broadphase always report them, or keep them out of the broadphase.
- **The normal convention and penetration sign.** Pick one (say, from B toward A; negative penetration is a gap) and write it on the types. Particles already push `particleA` along the normal; matching that helps.
- **Manifold size and IDs:** at most 4 points, each with a feature ID that survives small motion. This is what warm starting matches on.
- **Margins:** report pairs within a margin with negative penetration, so speculative contacts ([D7](#d7-fast-motion)) work later without changing every function.

**Proves it.** A rotated box's AABB touches all 8 corners; every support point is the farthest in a brute-force sample of directions; a collider on a rotated body reports the right world AABB.

### Steps 4–6: The first pairs and the inspector

**Concept.** One function per shape pair, looked up by kinds, with reversed arguments handled in one place. Work in the local space of the oriented shape.

**Decisions.** A dispatch table keyed by kinds (one place for reversal) or the book's static method per pair. Debug draw as plain arrays of numbers the engine fills and demos render, so the engine stays free of Three.js.

**Proves it.** Each pair passes separated, touching, shallow and deep cases with the normal sign checked; reversed arguments give a negated normal; a box flat on a plane gives exactly 4 contacts. The *Collision inspector* demo lets you drag two shapes and watch point, normal and depth, and every later step uses it to find its bugs.

**Key formulas.** Sphere–sphere: `d = cₐ − c_b`, `n = d̂`, `pen = rₐ + r_b − |d|`. Sphere–box: clamp the sphere centre to the box in box space; if the centre is inside, push out along the least-penetration axis. Box–plane: every vertex below the plane.

### Steps 7–8: The separating axis theorem and clipping

**Concept.** Two convex shapes are apart if and only if some axis separates their projections. For boxes there are 15 candidates: 3 face normals each and 9 edge cross products. The axis of least overlap gives the normal; **clipping** the incident face against the reference face's side planes (Sutherland–Hodgman) gives the points; edge–edge gives one point.

**Decisions.**

- **Face vs edge preference:** prefer face axes unless an edge axis is clearly better, or contacts flicker between frames. How much better is a tuning choice.
- **Reducing to 4 points:** Allen Chou's rule (deepest, farthest from it, then maximize area) vs Box3D's 2D convex hull simplified to 4. Compare on a box rotated 45° on another.
- **Feature IDs:** reference face plus incident vertex, or edge pairs. They must survive a box moving slightly.

**Proves it.** A box flat on a box gives 4 stable points, edge–edge gives 1, parallel edges don't produce NaN, and IDs stay the same as a box moves slightly.

### Step 9: Broadphase and the pipeline

**Concept.** Most pairs are far apart; a cheap test on bounding boxes removes them before the narrowphase. Brute force is the reference every other broadphase is tested against.

**In the engine.** The `Broadphase` seam. The broadphase stores boxes under a number the caller chooses, so it knows nothing about colliders; the pipeline maps numbers back.

**Decisions.**

- **Which second broadphase:** sweep-and-prune (sort endpoints on one axis; insertion sort is nearly O(n) because bodies move little), a uniform grid or spatial hash, or the book's BVHs (§12.3) and octrees (§12.4). Each wins on different scenes; the heatmap demo should show where.
- **Fat AABBs:** expand by a margin so slow bodies skip updates.
- **Handles vs indices** for proxies ([D9](#d9-data-layout-and-identity)).

**Proves it.** Every broadphase returns a superset of the brute-force pairs on random scenes; the *Broadphase heatmap* shows candidate pairs and timing at 1,000 AABBs.

### Steps 10–12: GJK, EPA and the rest of the pair table

**Concept.** *Not in the book.* GJK finds overlap and distance for any two convex shapes using only support functions, by iterating a simplex on the Minkowski difference `s(d) = s_A(d) − s_B(−d)`. EPA expands GJK's final simplex into a polytope to find penetration depth and normal. A capsule or rounded shape is a core plus a radius: run GJK on the core and subtract.

**Decisions.**

- **Specialized pairs vs GJK everywhere.** GJK + EPA covers every convex pair with one code path but gives one point per frame and is fiddly near touching. Specialized functions give better manifolds. Most engines mix: specialized where cheap, GJK for the rest.
- **Where manifolds come from for GJK pairs:** EPA plus clipping, or a persistent manifold that accumulates points across frames.

| | sphere | box | plane | capsule | hull |
|---|---|---|---|---|---|
| **sphere** | Step 4 | Step 5 | Step 4 | Closest point on a segment | GJK |
| **box** | | Steps 7–8 | Step 5 | GJK + EPA | GJK + EPA |
| **plane** | | | both static | 2 end spheres | Test the vertices |
| **capsule** | | | | Closest points between segments | GJK + EPA |
| **hull** | | | | | GJK + EPA, then Step 14 |

**Proves it.** GJK agrees with SAT on overlap for 10,000 random box pairs; EPA depth agrees with SAT within tolerance; every cell of the table passes Step 4's cases.

### Steps 13–14: Scaling up

**Concept.** *Box3D's choices.* A dynamic AABB tree inserts each fat box beside the sibling that grows total surface area least (SAH), refits ancestors and rotates to rebalance; Box3D keeps separate trees for static, kinematic and dynamic bodies. Hull–hull SAT with Gauss-map pruning makes edge tests cheap enough to replace GJK for hulls, giving face manifolds. Quickhull builds hulls from point clouds.

**Proves it.** The tree passes the brute-force superset test and joins the heatmap; a box built as a hull gives the same manifold as Step 8.

### Phase 5: where Aether differs from the book

- **Collision is body-agnostic**; the book's primitives hold a body pointer.
- **One dispatch table** with reversal in one place, instead of a static method per pair.
- **Results are manifolds** with feature IDs; the book writes independent contacts.
- **Penetration may be negative** within a speculative margin.
- **GJK, EPA, hull SAT, sweep-and-prune and the dynamic tree are not in the book.**

### Phase 5: resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 12 | §12.1–12.4 (pp. 232–261) | The pipeline, BVH construction, spatial structures. |
| Millington ch. 13 | §13.1–13.3 (pp. 264–297), especially §13.3.5 *Colliding Two Boxes* | Contact cases and the first narrowphase functions. |
| Kenneth I. Joy, *Clipping* (local PDF: `~/Desktop/Textbooks/JoyKennethClipping-200905-175314.pdf`) | §2–4 | Sutherland–Hodgman for incident-face clipping. |
| William Bittle (dyn4j) | [SAT](https://dyn4j.org/2010/01/sat/), [Clipping](https://dyn4j.org/2011/11/contact-points-using-clipping/), [GJK](https://dyn4j.org/2010/04/gjk-gilbert-johnson-keerthi/), [EPA](https://dyn4j.org/2010/05/epa-expanding-polytope-algorithm/) | The clearest illustrated walkthroughs. |
| Newcastle University, [Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | Tutorials 1, 4; [Spatial Acceleration Structures](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/6accelerationstructures/Physics%20-%20Spatial%20Acceleration%20Structures.pdf) | Raycasting, shape tests, structure tradeoffs. |
| Pierre Vigier, [Quadtree and Collision Detection](https://pvigier.github.io/2019/08/04/quadtree-collision-detection.html) | All | A third broadphase option. |
| Witkin & Baraff, *PBM* notes | Baraff Part II §7 (PDF pp. 58–63) | Separating planes and coherence. |
| Ericson, *Real-Time Collision Detection* | Ch. 4–5, 7, 9 | The reference when a test must be robust. |
| Erin Catto, [GJK](https://box2d.org/files/ErinCatto_GJK_GDC2010.pdf) (GDC 2010); [Dynamic BVH](https://box2d.org/files/ErinCatto_DynamicBVH_GDC2019.pdf) (GDC 2019); [Contact Manifolds](https://box2d.org/files/ErinCatto_ContactManifolds_GDC2007.pdf) (GDC 2007) | All | GJK done properly; the production broadphase; clipping and feature IDs. |
| Dirk Gregorius, [SAT between Convex Polyhedra](https://www.gdcvault.com/play/1017646/Physics-for-Game-Programmers-The) (GDC 2013); [Robust Contact Creation](https://www.gdcvault.com/play/1022193/Physics-for-Game-Programmers-Robust) (GDC 2015); [Implementing QuickHull](https://media.steampowered.com/apps/valve/2014/DirkGregorius_ImplementingQuickHull.pdf) (GDC 2014) | All | Hull SAT, stable manifolds, the hull builder. |
| Allen Chou, [Stability – Warm Starting](http://allenchou.net/2014/01/game-physics-stability-warm-starting/) | Persistent Contacts | Matching contacts across frames; reduction to 4. |
| Ten Minute Physics | Ep. 11, 23, 24 | Spatial hashing, sweep-and-prune, BVHs. |
| Bittner et al., [Fast Insertion-Based Optimization of BVHs](https://dcgi.fel.cvut.cz/~havran/ARTICLES/bittner2013cgf_preprint.pdf) (2013); Catto, [Dynamic Tree Improvements](https://box2d.org/posts/2025/03/dynamic-tree-improvements/) (2025) | All | SAH insertion and its refinements. |
| Box3D `dynamic_tree.c`, `broad_phase.c`, `convex_manifold.c`, `distance.c`, `hull.c` | After yours work | The production versions; the *Manifold* samples are a checklist for the inspector. |

More: [RESOURCES.md, Phase 5](./RESOURCES.md#phase-5-collision-detection)

---

## Phase 6: Collision response and friction

**Goal:** bodies bounce, slide, come to rest and stack.

**Where the engine stands.** Bodies integrate (Phase 4) and the pipeline produces manifolds (Phase 5). Particles already have a worst-first resolver and, after Phase 3 Step 10, sequential impulses: this phase is the same two ideas with angular terms, then a third. All three solvers sit behind one `Solver` seam, because each runs the step in a different order, and the comparison demo needs all three working. This phase is [D2](#d2-how-the-constraint-system-is-solved), [D3](#d3-where-to-spend-accuracy-iterations-substeps-or-warm-starting) and [D4](#d4-how-position-error-is-corrected) made concrete.

| Solver | Source | Step order |
|---|---|---|
| v1 | Book ch. 14–15 | forces → integrate → collide → resolve penetration → resolve velocity |
| v2 | Catto, sequential impulses | forces → integrate velocities → collide → prepare → warm start → iterate → integrate positions → store impulses |
| v3 | Box3D, Soft Step | forces → collide → prepare → per substep (integrate velocities → warm start → solve → integrate positions → relax) → restitution → store impulses |

| Step | Concept | Source |
|---|---|---|
| 1 | The solver seam: step order as a choice | Not in the book |
| 2 | Impulses with angular terms; contact coordinates | Book §14.1–14.2 |
| 3 | Penetration, friction and resting contact, one at a time | Book §14.3–15.5 |
| 4 | Sequential impulses: accumulated clamping | Not in the book |
| 5 | Drift and bounce: Baumgarte and restitution threshold | Not in the book |
| 6 | Friction as dependent constraints | Not in the book |
| 7 | Persistent manifolds and warm starting | Not in the book |
| 8 | Soft constraints in hertz and damping ratio | Not in the book |
| 9 | Substeps with fixed anchors | Not in the book (Box3D) |
| 10 | Soft bias and relax | Not in the book (Box3D) |
| 11 | Restitution pass and speculative contacts | Not in the book (Box3D) |
| 12 | Comparison and friction upgrades | Not in the book |

### Step 1: The solver seam

**Concept.** Collision response isn't a function called at the end of a step; it decides the step's order. Make the order the solver's job.

**Decisions.** The seam's shape: the solver owns the whole `step` (most flexible; each solver calls shared pieces) or the world owns the step and calls hooks (less duplication, but v3's substep loop doesn't fit fixed hooks). Which settings are shared and which are per solver.

**Proves it.** With a null solver, bodies fall straight through the ground with their contacts drawn as they pass.

### Steps 2–3: v1, the book's resolver

**Concept.** Build a contact basis (normal plus two tangents), compute the velocity change per unit impulse including the angular terms, and resolve the worst contact, updating the others that share a body. Penetration uses **nonlinear projection**, split between linear and angular motion so the correction doesn't look wrong. Resting contact is micro-collisions with the last step's acceleration removed. Friction is static and dynamic, per contact.

**In the engine.** The particle resolver plus angular terms. Keep it working as the baseline, but don't polish it: its purpose is to show where one-at-a-time stops working.

**Proves it.** A ball with restitution 1 returns to its drop height within a few percent; an off-centre hit spins the body the right way; a box rests, holds on a shallow ramp, slides on a steep one. A tall stack jittering is expected, and it's the reason for v2.

### Steps 4–7: v2, sequential impulses

**Concept.** For each contact point, the effective mass along a direction `n` is `1 / (wₐ + w_b + n·((I⁻¹ₐ(rₐ × n)) × rₐ) + n·((I⁻¹_b(r_b × n)) × r_b))`. Each iteration computes `λ = m_n·(target − vₙ)` and clamps the *accumulated* impulse at zero. Friction is two tangent rows per point clamped to `±μ·Pₙ` (a pyramid), solved before the normal so non-penetration has the last word. Warm starting reapplies last step's impulses, matched by body pair and feature ID.

**Decisions.**

- **Position error ([D4](#d4-how-position-error-is-corrected)):** Baumgarte `(β/dt)·max(pen − slop, 0)` with `β ≈ 0.2`, `slop ≈ 5 mm` is the simple start; it adds energy, so stacks pop. Then split impulses. Compare both.
- **Restitution threshold:** about 1 m/s; below it, `e = 0`.
- **Where accumulated impulses live between steps:** on the contact points of a persistent manifold, or in a cache keyed by IDs.

**Proves it.** Accumulated normal impulses are never negative; tangent impulses never exceed `μ·Pₙ`; a box on a slope holds when `tan θ < μ` and slides when `tan θ > μ`; a 10-box stack drifts under 1 cm over 10 s at 60 Hz with 10 iterations, and visibly worse with warm starting off. Demos: *Stacking*, *Dominoes*.

### Steps 8–11: v3, Box3D's Soft Step

**Concept.** Model each contact as a stiff, heavily damped spring in hertz and damping ratio (`ω = 2π·hertz`, `biasRate = ω/(2ζ + hω)`, `impulseScale = 1/(1 + hω(2ζ + hω))`, `massScale = 1 − impulseScale`). Run collision once per step, then several substeps of one iteration each, estimating each contact's current separation from how far the bodies moved (`s = s₀ + n·((Δpₐ + Δqₐ·rₐ) − (Δp_b + Δq_b·r_b))`) instead of recomputing contacts. After each solve, **relax** without bias to remove the velocity the push-out added, so penetration recovery doesn't become bounce. Restitution is its own pass at the end. Contacts within a margin are **speculative**: the solver lets the gap close but not cross.

**In the engine.** The particle XPBD of Phase 3 Step 8 is the position-level cousin of this (compliance vs softness, substeps vs iterations). `makeSoft` is shared with Phase 7's joints, so contacts and joints get one softness model.

**Decisions.**

- **Box3D's defaults** (`contactHertz = 30`, damping ratio 10, `contactSpeed = 3 m/s`, doubled hertz against static bodies), or your own tuning, measured in the comparison demo.
- **Refresh derived data every substep** (simple, correct) or only when profiling asks.
- **Speculative margin size** (Box3D: `4 × linearSlop`, about 2 cm): bigger catches faster bodies but risks ghost collisions ([D7](#d7-fast-motion)).

**Proves it.** `makeSoft`: `massScale + impulseScale = 1`; `hertz = 0` is rigid. v3 with 4 substeps and 1 iteration matches v2's 10-iteration drift bound; a deep overlap separates no faster than `contactSpeed`; a box released 1 cm above the ground lands without penetrating or bouncing; a 100 kg box on a 1 kg box doesn't sink through, and you've recorded where v2 fails.

### Step 12: Comparison and friction upgrades

**Concept.** A measured comparison: same scene, same settings, three solvers. Then Box3D's friction: one 2D friction constraint at the manifold's friction centre clamped to a circle (a true cone), plus twist friction about the normal and rolling resistance.

**Proves it.** The *Solver comparison* demo with substep and iteration sliders, plus *Card house* and *Jenga*: you can point at the scene where each solver fails and explain why.

### Phase 6: where Aether differs from the book

- **v1 is the book's resolver**, kept as the baseline. v2 and v3 are not in the book.
- **Restitution threshold, warm starting, persistent manifolds, soft constraints, substeps and speculative contacts** come from Catto and Box3D. The book's resting-contact handling lives only in v1.
- **Friction:** v2 clamps two tangents per point; v3 can use one cone per manifold.

### Phase 6: resources

| Resource | Sections | Use it for |
|---|---|---|
| Erik Neumann, [myPhysicsLab: Rigid Body Collisions](https://myphysicslab.com/engine2D/collision-en.html) | All | The impulse formula derived step by step in 2D; why naive impulses stick at rest. Read first. |
| Chris Hecker, [Physics, Part 3: Collision Response](https://www.chrishecker.com/Rigid_Body_Dynamics) | All | The derivation with angular effects. |
| Millington ch. 14 | §14.1–14.4 (pp. 301–349) | v1: contact coordinates, velocity per unit impulse, nonlinear projection, the full pipeline. |
| Millington ch. 15 | §15.1–15.5 (pp. 352–374) | Micro-collisions and friction in v1. |
| Millington App. B | p. 434 | Friction coefficients. |
| Newcastle University, [Collision Response](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/5collisionresponse/Physics%20-%20Collision%20Response.pdf) | All | Projection plus impulse, compactly. |
| Witkin & Baraff, *PBM* notes | Baraff Part II §6, 8, 9 (PDF pp. 56–78) | Resting contact as a complementarity problem: what iterative solvers approximate. |
| Erin Catto, [Sequential Impulses](https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf) (GDC 2006); [box2d-lite](https://github.com/erincatto/box2d-lite) | All; `Arbiter.cpp` | v2. |
| Allen Chou, [Contact Constraints](http://allenchou.net/2013/12/game-physics-resolution-contact-constraints/); [Slops](http://allenchou.net/2014/01/game-physics-stability-slops/); [Warm Starting](http://allenchou.net/2014/01/game-physics-stability-warm-starting/) | All | The 3D contact Jacobian and every bias term in implementation order. |
| Nilson Souto, [Video Game Physics Part III](https://www.toptal.com/game/video-game-physics-part-iii-constrained-rigid-body-simulation) | Sequential Impulses, PGS, Friction | SI and PGS are the same algorithm. |
| Erin Catto, [Solver2D](https://box2d.org/posts/2024/02/solver2d/); [Releasing Box2D 3.0](https://box2d.org/posts/2024/08/releasing-box2d-3.0/) | All; Solver, Continuous | Strategies compared; Soft Step as shipped. |
| Macklin et al., [Small Steps](https://mmacklin.com/smallsteps.pdf) (2019) | §1–4 | The argument behind v3. |
| NVIDIA, [PhysX 4.0 Rigid Body Dynamics](https://gameworksdocs.nvidia.com/PhysX/4.0/documentation/PhysXGuide/Manual/RigidBodyDynamics.html) | PGS vs TGS | A relative of Soft Step. |
| Glenn Fiedler, [Collision Response and Coulomb Friction](https://gafferongames.com/post/collision_response_and_coulomb_friction/) | All | A practical summary. |
| Bender, Erleben & Trinkle, [Interactive Simulation of Rigid Body Dynamics](https://perso.liris.cnrs.fr/fzara/Web/media/files/M2-Animation/cgf12272.pdf) (2014) | Friction, stabilization | Cones vs pyramids; every stabilization scheme surveyed. |
| Box3D `solver.c`, `solver.h` (`b3MakeSoft`), `contact_solver.c` | After yours work | The production v3. |

More: [RESOURCES.md, Phase 6](./RESOURCES.md#phase-6-collision-response-and-friction)

---

## Phase 7: Joints, sleeping and stability

**Goal:** articulated bodies, and an engine that scales.

**Where the engine stands.** v2 and v3 solve contacts as rows with an inequality clamp. A joint is the same thing with an equality, so this phase generalizes contacts into constraints, then adds joints from one row to six. Islands and sleeping come after, because they're about scale, not correctness. This is [D8](#d8-maximal-vs-reduced-coordinates): every joint here is a constraint in maximal coordinates.

| Step | Concept | Source |
|---|---|---|
| 1 | Contacts as constraints: one interface | Not in the book |
| 2 | The recipe on one row: distance joint | Not in the book (book §18.1 sketches it) |
| 3 | A three-row block: ball-socket | Not in the book |
| 4 | Angular rows: hinge axis | Not in the book |
| 5 | One-sided rows and targets: limits and motors | Not in the book |
| 6 | Orientation error: fixed joint | Not in the book |
| 7 | Soft joints | Not in the book |
| 8 | Ragdoll: joints together | Book §17.2.1 (as contacts) |
| 9 | Islands | Book §16.2.3 (contact grouping) |
| 10 | Sleeping | Book §16.2.1 |
| 11 | Stats and determinism | Partly §16.1 |
| 12 | More joints, events and sensors | Not in the book (Box3D) |

### Step 1: Contacts as constraints

**Concept.** Write the position constraint `C(x) = 0`, differentiate to `Ċ = J·v`, take the effective mass `K⁻¹ = (J·M⁻¹·Jᵀ)⁻¹`, and each iteration apply `λ = −K⁻¹·(J·v + b)`, `Δv = M⁻¹·Jᵀ·λ`. A contact is this recipe with a clamp `λ ≥ 0`.

**Decisions.**

- **The constraint interface** must fit v3's solve and relax passes (a "use bias" flag) and warm starting.
- **The book's joints are contacts** (§17.2.1: a joint that drifts generates a contact pulling it back). Keep that for v1 as an option, or leave v1 without joints?
- **The migration must be behaviour-neutral**: every Phase 6 test passes unchanged.

### Steps 2–6: The joints

**Concept.** Each joint is the recipe with a different `C`:

- **Distance:** `C = |p_b − pₐ| − L`, one row along the anchor direction.
- **Ball-socket:** `C = p_b − pₐ`, three rows solved as a block with `K = (wₐ + w_b)·I − [rₐ]ₓ·I⁻¹ₐ·[rₐ]ₓ − [r_b]ₓ·I⁻¹_b·[r_b]ₓ` (needs `setSkewSymmetric` and `Mat3x3.add`, deferred from Phase 1).
- **Hinge:** ball-socket plus two angular rows holding B's axis perpendicular to two vectors perpendicular to A's.
- **Limits and motors:** a limit is a one-sided row clamped like a contact; a motor targets a relative speed with the accumulated impulse clamped to `±maxTorque·dt`.
- **Fixed:** ball-socket plus three angular rows from the relative orientation error.

**Decisions.** Block-solve the ball-socket's 3 rows (faster convergence, needs a 3×3 inverse) or solve rows one at a time (simpler, slower). Anchors stored in body space at construction. Derive each `J` on paper first.

**Proves it.** A pendulum keeps its length; a ball-socket chain keeps its anchors coincident; a hinge keeps its axis under off-axis torque; a limit is never exceeded; a motor reaches its speed without exceeding `maxTorque`; welded bodies move as one. Demos: *Newton's cradle*, *Chain bridge*, *Car*.

### Step 7: Soft joints

**Concept.** Any joint with a frequency and damping ratio, through the same `makeSoft` as v3's contacts. Catto's GDC 2011 form (`γ`, `β`) is the same model written differently. Box3D clamps joint stiffness to a quarter of the substep rate: a spring stiffer than the step can resolve is just a rigid constraint with extra error.

**Proves it.** A soft distance joint oscillates near its set frequency; frequency 0 matches the rigid result.

### Step 8: Ragdoll

**Concept.** Several joint types on one figure, with high mass ratios between limbs. Cone and twist limits come in Step 12, so expect some odd poses.

**Proves it.** The *Ragdoll* falls, lands and settles without exploding.

### Steps 9–10: Islands and sleeping

**Concept.** Bodies and constraints form a graph; a connected component is an island. Static bodies never join one, or everything on the ground becomes one island. When every body in an island has been slow for a while, the island sleeps: velocities zero, skipped by the solver, woken by contact with an awake body, a joint partner waking, or user code touching it.

**Decisions.**

- **Rebuild islands every step** with union-find (simple, the right first version) or **keep them persistent**, merging on contact and splitting lazily (Box3D). Measure on 500 boxes.
- **What islands are for:** Box3D uses them only for sleep; the book (§16.2.3) groups contacts for its resolver.
- **Sleep criteria:** the book's recency-weighted motion average (§16.2.1) or Box3D's per-island linear and angular thresholds plus a time threshold.

**Proves it.** Two stacks form two islands; a body touching only the ground is its own island; sleeping bodies don't move and wake when hit. The *Sleep visualizer* tints sleeping bodies and colours by island.

### Step 11: Stats and determinism

**Concept.** Measure the step per stage without allocating, and make repeatability a test ([D11](#d11-determinism-and-ordering)).

**Proves it.** The same scene run twice gives bit-identical states; 500 boxes settle, sleep and let the frame rate recover.

### Step 12: More joints, events and sensors

**Concept.** *Box3D's set.* Spherical joints with cone and twist limits (for the ragdoll), prismatic, wheel; breakable joints; contact begin/end/hit events and sensor shapes, collected during the step and read afterward. Never call user code from inside the solver.

**Proves it.** A joint breaks at its threshold; a sensor reports overlap without applying force.

### Phase 7: where Aether differs from the book

- **Joints are velocity constraints with Jacobians** (Catto), not contacts generated to hold bodies together (§17.2.1).
- **Islands come from union-find** and only decide sleep; the book groups contacts for its resolver (§16.2.3).
- **Sleep thresholds are per island** (Box3D); the book averages each body's motion (§16.2.1).
- **Events, sensors, stats and determinism tests** come from Box3D.

### Phase 7: resources

| Resource | Sections | Use it for |
|---|---|---|
| Millington ch. 16 | §16.1 Stability (pp. 375–383); §16.2 Optimizations (pp. 383–397) | A stability-bug checklist; sleep, margins, contact grouping. |
| Millington ch. 17 | §17.2.1 Ragdolls (pp. 402–405); §17.3 Limitations (pp. 418–419) | Joints as contacts, and what that approach can't do. |
| Millington ch. 18 | §18.1–18.2 (pp. 423–428) | Jacobians, the LCP, reduced coordinates: the bridge to Catto. |
| Allen Chou, [Constraint Basics](https://www.youtube.com/watch?v=MTVdBgQY9LY) (video) | All | A visual introduction. |
| Andrew Witkin, [Constrained Dynamics](https://www.cs.cmu.edu/~baraff/pbm/constraints.pdf) | All | The force-level derivation of `J·M⁻¹·Jᵀ·λ`. |
| Erin Catto, [Modeling and Solving Constraints](https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf) (GDC 2009); [Soft Constraints](https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf) (GDC 2011); [Understanding Constraints](https://box2d.org/files/ErinCatto_UnderstandingConstraints_GDC2014.pdf) (GDC 2014) | All | Joint derivations; frequency and damping ratio; a second pass. |
| myselph.de, [Equality Constraints & Solver](https://web.archive.org/web/20211022100314mp_/http://myselph.de/gamePhysics/equalityConstraints.html) | All | A worked 2D derivation to check yours. |
| Nilson Souto, [Video Game Physics Part III](https://www.toptal.com/game/video-game-physics-part-iii-constrained-rigid-body-simulation) | Constraints; Islands, Sleeping | A worked pendulum, then islands. |
| Newcastle University, [Physics Tutorials](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | Tutorial 8 | Constraints as course notes. |
| [Jolt Physics docs](https://jrouwe.github.io/JoltPhysics/) | Islands, sleeping, the step | How another production engine organizes it. |
| Erin Catto, [Simulation Islands](https://box2d.org/posts/2023/10/simulation-islands/) | All | Persistent islands with lazy splitting. |
| Box3D `joint.c`, `revolute_joint.c`, `spherical_joint.c`, `weld_joint.c`, `island.c`, `solver_set.c`, `sensor.c` | After yours work | Production joints, islands and sensors. |
| Witkin, Gleicher & Welch, [Interactive Dynamics](https://dl.acm.org/doi/pdf/10.1145/91394.91400) (1990); Barzel & Barr, [Dynamic Constraints](https://hal.science/hal-01968730/document) (1988) | All | Optional history. |
| Maloisel et al., [Quaternion-based Constrained Rigid Body Dynamics](https://la.disneyresearch.com/wp-content/uploads/A_Versatile_Quaternion_based_Constrained_Rigid_Body_Dynamics.pdf) (2025) | After joints work | Where the field is now. |

More: [RESOURCES.md, Phase 7](./RESOURCES.md#phase-7-joints-sleeping-and-stability)

---

## Phase 8: Stretch goals

Pick whatever interests you most. Each one settles or extends a [big decision](#the-big-decisions).

- **Continuous collision** ([D7](#d7-fast-motion)). Time of impact by conservative advancement on GJK distance, for fast small bodies only. Box3D's split: speculative contacts for everything, TOI against static geometry for fast bodies, TOI against dynamic bodies only for `isBullet` bodies. Demo: a bullet through a thin wall, CCD off and on.
- **Character mover.** A kinematic capsule that slides along walls and climbs steps: cast along the desired motion, collect the planes hit, solve for a velocity that respects them, clip.
- **Graph colouring and a parallel solver** ([D2](#d2-how-the-constraint-system-is-solved), [D12](#d12-where-the-engine-runs)). Colour constraints so no two in a colour share a dynamic body; each colour can then be solved in parallel. It changes solver order, so recheck determinism.
- **Struct-of-arrays storage** ([D9](#d9-data-layout-and-identity)). Hot per-step state in `Float64Array`s, cold data apart; awake and sleeping bodies in separate sets. Measure before and after.
- **Contact recycling.** Skip narrowphase for a pair whose relative pose barely changed and only re-estimate separations: v3's fixed-anchor estimate applied across steps. Needs persistent manifolds, a translation and a rotation tolerance (without the rotation tolerance, the frozen normal drifts and breaks joint-held pairs), world-space normals and anchors, and a per-body opt-out for character movers. Test: a settled stack gives the same states on and off, and narrowphase time drops on 500 boxes.
- **Static meshes and height fields**, and the internal-edge problem (a box catching on the shared edge of two coplanar triangles).
- **Recording and replay** ([D11](#d11-determinism-and-ordering)): record every API call, replay and compare bit for bit.
- **The engine in a Web Worker** ([D12](#d12-where-the-engine-runs)): a message protocol of plain objects, body state packed into a double-buffered `Float64Array` shared through a `SharedArrayBuffer` (needs COOP/COEP headers).
- **XPBD for rigid bodies** ([D1](#d1-where-constraints-act-force-impulse-or-position)): Müller's 2020 method as a fourth `Solver`, compared with the other three on the same scenes, as Solver2D does. Builds directly on Phase 3 Step 8.
- **One world for particles and bodies** ([D10](#d10-one-world-or-two)), so ropes hang from boxes.
- **Performance:** pooling, benchmarks against cannon-es.
- **WebGPU rendering**, and later a GPU broadphase.
- **Publishing to npm:** the build and package setup are done (`aether-physics`, Vite library mode, declarations, `exports`, side-effect free); TypeDoc API docs and semantic versioning from 0.x remain.
- **Better aerodynamics:** real airfoil `C_L(α)` / `C_D(α)` tables, induced drag, a stable aircraft.

### Resources

| Goal | Resource | Use it for |
|---|---|---|
| CCD | Catto, [Continuous Collision](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf) (GDC 2013) | Time of impact and conservative advancement. |
| Determinism | Catto, [Determinism](https://box2d.org/posts/2024/08/determinism/) | Cross-platform floating-point pitfalls. |
| Parallel solver | Catto, [SIMD Matters](https://box2d.org/posts/2024/08/simd-matters/) | Graph colouring and the wide solver. |
| Collision performance | Catto, [SIMD for Collision](https://box2d.org/posts/2026/07/simd-for-collision/); [Contact Recycling](https://box2d.org/posts/2026/10/contact-recycling/) (2026) | Box3D's narrowphase optimizations. |
| Contact recycling | Box2D [PR #1038](https://github.com/erincatto/box2d/pull/1038), [issue #1046](https://github.com/erincatto/box2d/issues/1046); [PhysX PCM](https://nvidia-omniverse.github.io/PhysX/physx/5.8.0/docs/AdvancedCollisionDetection.html#persistent-contact-manifold-pcm); [Rapier #973](https://github.com/dimforge/rapier/pull/973), [Avian #1033](https://github.com/avianphysics/avian/pull/1033) | The original change, the joint failure case, prior art and two ports. |
| Rigid-body XPBD | Müller et al., [Detailed Rigid Body Simulation with XPBD](https://matthias-research.github.io/pages/publications/PBDBodies.pdf) (2020) | XPBD for rigid bodies. |
| Character mover, CCD | Box3D [`docs/character.md`](https://github.com/erincatto/box3d/blob/main/docs/character.md), [`docs/simulation.md`](https://github.com/erincatto/box3d/blob/main/docs/simulation.md) | Short production write-ups. |
| Web Worker | MDN, [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | The protocol and transferables. |
| Soft-body contact | Chen et al., [Offset Geometric Contact](https://graphics.cs.utah.edu/research/projects/ogc/Offset_Geometric_Contact-SIGGRAPH2025.pdf) (SIGGRAPH 2025) | When XPBD cloth starts tangling. |
| Aerodynamics | Harry Smith, [*Aircraft Flight Mechanics*](https://aircraftflightmechanics.com/Prerequisites/Prerequisites.html); [Airfoil Tools](http://airfoiltools.com/) | Drag breakdown, stability, real curves. |
| Other physics | Millington ch. 18 (pp. 423–429) | Simultaneous resolution and reduced coordinates. |

More: [RESOURCES.md, Phase 8](./RESOURCES.md#phase-8-stretch-goals)

---

## Track S: simulation core

Track S builds Aether Lab's simulation core in `packages/aether-lab`, after Phase 7. It depends on `aether-physics` for math; nothing in the engine changes. The ground rules for Track S apply throughout: name the integrator and tolerance, no hidden fudges, test against the answer.

**The Lab's big decisions** (settle these in S1; later phases inherit them):

- **State as one flat `Float64Array`** with `dy/dt = f(t, y)`, rather than objects. Allocation-free, and the same layout moves into a Worker or onto the GPU. Systems pack and unpack their own state.
- **Time decoupled from frames.** The simulation takes as many internal steps as it needs to reach the frame's time, and the renderer samples dense output there. The engine's `FixedStepLoop` still drives the playback clock.
- **Integrators chosen by the physics:** symplectic at a fixed step for conservative systems, adaptive RK45 when you want an error bar, implicit for stiff systems, Boris for magnetic fields. Adaptive steps break symplecticity, so never adapt Verlet's step.
- **Generalized coordinates** ([D8](#d8-maximal-vs-reduced-coordinates)): constraints belong in the coordinates. Systems that can't be written that way belong in the engine's joints.
- **Derivatives by forward-mode automatic differentiation**, not a symbolic algebra system.

## S1: Integrators and the ODE core

**Goal:** a core where integrator, step size and tolerance are choices, and rendering is decoupled from stepping.

**Concepts:** first-order systems and reducing second-order ones; order of accuracy and convergence; local and global error; embedded Runge–Kutta pairs and step-size control; dense output; symplectic integrators; event location; stiffness.

**In the engine.** Phase 2's integrators were the warm-up: the same four methods, now on a flat state vector with error control. Velocity Verlet here is the Störmer–Verlet of Phase 3 Step 8 in its symplectic role.

| Step | Concept | Proves it |
|---|---|---|
| 1 | Systems and RK4 at a fixed step | Harmonic oscillator error drops 16× as `h` halves |
| 2 | Second-order systems; Verlet and Yoshida-4 | Over 10⁴ Kepler periods, Verlet's energy error stays bounded while RK4's drifts |
| 3 | Adaptive Dormand–Prince 5(4) with a PI controller | Kepler error tracks tolerance from 1e-4 to 1e-10 |
| 4 | Dense output and a `Simulation` that advances to a time and samples | Mid-step samples match the exact solution to the step's order |
| 5 | Events: sign changes of `g(t, y)` located on dense output | A 10 m drop lands at `√(2h/g)` to 1e-10 s; bounce apexes follow `e²ⁿ·h` |
| 6 | Recorded trajectories with scrubbing | Recorded samples match a fresh run's |
| 7 | Implicit midpoint with a small dense solver | A stiff system with eigenvalues −1 and −10⁴ stays stable at `h = 0.1` |

**Decisions.** Fixed-step and adaptive integrators behind one interface (a step returns the step taken, the next suggested step and an error) or two. How much of a trajectory to keep: every step, or decimated to a sample rate. Root finding for events: Illinois (robust) or plain bisection.

**Demo:** *Integrators*, the eccentric Kepler orbit under five methods with a log-scale energy-error chart and a step-count readout.

**Study, in order.**

| Resource | Sections | What to take from it |
|---|---|---|
| Witkin & Baraff, *PBM*, "Differential Equation Basics" | All | Recap. |
| Press et al., *Numerical Recipes* (3rd ed.) | Ch. 17 | Dormand–Prince, the PI controller, dense output. |
| Hairer, Nørsett & Wanner, *Solving ODEs I* | Embedded methods, step control, dense output | The reference for Steps 3–5. |
| Hairer, Lubich & Wanner, *Geometric Numerical Integration* | Ch. I; symplectic integration | Why Verlet conserves a modified energy. |
| H. Yoshida, "Construction of higher order symplectic integrators" (1990) | The fourth-order composition | The weights. |

More: [RESOURCES.md, Track S](./RESOURCES.md#track-s-simulation-core)

---

## S2: Exact mechanics

**Goal:** the systems of a classical mechanics course, simulated in the coordinates they're posed in.

**Concepts:** generalized coordinates; Euler–Lagrange equations and the generalized mass matrix; Hamilton's equations; forward-mode AD with dual and hyper-dual numbers; conserved quantities and Noether's theorem; Kepler invariants; rotation from angular momentum; phase space, Poincaré sections, sensitivity to initial conditions.

| Step | Concept | Proves it |
|---|---|---|
| 1 | Dual and hyper-dual numbers; user functions written once for plain numbers and AD | Derivatives of a dozen functions match to machine precision |
| 2 | Lagrangian systems: `M q̈ = ∂L/∂q − C q̇ − ∂²L/∂q̇∂t + Q`, with named coordinates | The double pendulum matches hand-derived equations; energy holds to tolerance |
| 3 | Hamiltonian systems; separable ones get a symplectic view | |
| 4 | Exact N-body gravity with invariants, no softening | Two-body period, eccentricity and Laplace–Runge–Lenz vector; the figure-eight orbit closes |
| 5 | Exact rigid bodies from `(x, q, P, L)`, reusing Phase 4's inertia | Precession rate; the intermediate-axis flip period against the elliptic solution |
| 6 | Analysis: monitors, Poincaré sections, Lyapunov exponents | A known period-doubling drive gives a two-point section |

The design target for the API:

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

**In the engine.** Phase 4's spinning-bodies demo and its gyroscopic modes are the game-grade answer to Step 5; this is the exact one, and comparing them shows what "plausible" costs.

**Decisions.** Second derivatives cost `O(n²)` hyper-dual evaluations per call: fine for textbook systems (n ≤ 6), so no symbolic algebra. A singular mass matrix throws, naming the coordinates. Time-dependent Lagrangians are normal; monitors say what *is* conserved (the Jacobi integral, when it exists).

**Demos:** *Double pendulum* with a perturbed twin, *Bead on a rotating hoop*, *Kepler orbits*, *Driven pendulum*, *Coupled oscillators*, *Spinning top*.

**Study.**

| Resource | Sections | What to take from it |
|---|---|---|
| J. R. Taylor, *Classical Mechanics* | Ch. 7, 8, 10, 11, 12, 13 | The test problems and their answers. |
| Baydin et al., "Automatic Differentiation in Machine Learning: a Survey" (2018) | Forward mode | How dual numbers carry derivatives. |
| Fike & Alonso, "Hyper-Dual Numbers" (AIAA 2011) | The number system | Exact second derivatives. |
| Hairer, Lubich & Wanner, *Geometric Numerical Integration* | Rigid-body and Hamiltonian examples | Integrators that respect invariants. |

---

## S3: Electrostatics, magnetostatics and charged particles

**Goal:** fields you can see, and particles that move through them.

**Concepts:** superposition; Coulomb and the potential; dipoles; Biot–Savart; the Lorentz force; cyclotron motion, E×B drift, magnetic mirrors; field lines as streamlines; equipotentials as level sets.

| Step | Concept | Proves it |
|---|---|---|
| 1 | Fields and superposition | The field of two charges equals the sum |
| 2 | Sources: point and line charges, dipoles, current segments and loops, solenoids, Helmholtz pairs | Dipole far field; loop on-axis B; `E = −∇V` numerically |
| 3 | The Boris push for charged particles | Cyclotron radius exact over 10⁴ orbits; E×B drift speed `E/B`; mirror reflection |
| 4 | Field lines traced with RK45, seeded by charge | Lines start on positive charges and end on negative ones, in proportion |
| 5 | Equipotentials: marching squares and cubes | |

**Decisions.** The core produces geometry (typed-array polylines and meshes), not Three.js objects; `aether-viz` draws them. SI by default with `ε₀` and `μ₀` overridable. Boris over RK4 for magnetic fields, because RK4's orbits spiral. Seeds start a small radius from each charge.

**Demos:** *Charges*, *Dipole*, *Cyclotron*, *E×B drift*, *Magnetic bottle*, *Helmholtz coils*.

**Study.** Griffiths, *Introduction to Electrodynamics*, ch. 2, 3, 5; Qin et al., "Why is Boris algorithm so good?" (2013); Jobard & Lefer, "Evenly-Spaced Streamlines" (1997); Lorensen & Cline, "Marching Cubes" (1987) and Paul Bourke's "Polygonising a scalar field".

---

## S4: Boundary-value problems

**Goal:** fields around conductors, where no closed form exists.

**Concepts:** Laplace's and Poisson's equations; Dirichlet and Neumann boundaries; uniqueness; relaxation (Jacobi, Gauss–Seidel, SOR); multigrid; induced surface charge; images as a check.

**In the engine.** Jacobi vs Gauss–Seidel is [D2](#d2-how-the-constraint-system-is-solved) again: the same trade between convergence and parallelism, now on a grid. Red–black ordering is graph colouring on a grid.

**Build toward:** scalar and vector grids that implement the field interfaces; conductors as masked cells; Jacobi, then red–black Gauss–Seidel with SOR, then a multigrid V-cycle; `E = −∇V` and `σ = ε₀ E·n̂`; Poisson sources.

**Proves it.** Parallel plates give a uniform field; a box with one side at `V₀` matches the separation-of-variables series; a grounded sphere in a uniform field matches the induced dipole; a charge above a grounded plane matches its image; multigrid converges in a number of V-cycles independent of grid size.

**Demos:** *Conductors*, *Image charge*.

**Study.** Griffiths ch. 3; Briggs, Henson & McCormick, *A Multigrid Tutorial*, ch. 1–4; *Numerical Recipes* ch. 20.

---

## S5: Waves and radiation

**Goal:** electromagnetic waves you can watch propagate, reflect, refract and radiate.

**Concepts:** the wave equation; the CFL condition; the Yee grid and leapfrog; sources; perfect conductors; absorbing boundaries (Mur, then PML); materials; retarded potentials and Liénard–Wiechert fields.

| Step | Concept | Proves it |
|---|---|---|
| 1 | The 1D wave equation on a string | Standing and travelling waves |
| 2 | 1D FDTD | Fresnel reflection and transmission at a slab |
| 3 | 2D FDTD (TM and TE) | Cavity resonances; interference and diffraction |
| 4 | Absorbing boundaries | PML reflection below a threshold |
| 5 | Retarded fields from a charge's history | A uniformly moving charge matches the boosted Coulomb field; a stopping charge radiates a shell at `c` |

**Decisions.** Normalized units inside (`c = 1`, Courant number `S`), SI outside. 3D FDTD waits for the GPU. Retarded fields are a lookup over a history buffer capped at the view's light-crossing time.

**Demos:** *String*, *Pulse and slab*, *Double slit*, *Waveguide*, *Dipole antenna*, *Stopping charge*.

**Study.** Griffiths ch. 9–11; Taflove & Hagness, *Computational Electrodynamics*; J. B. Schneider, *Understanding the FDTD Method* (free); Purcell & Morin, the appendix on radiation from an accelerated charge.

---

## S6: The GPU

**Goal:** grid solvers and N-body systems large enough to look real, on WebGPU.

**Concepts:** compute shaders and WGSL; buffers, bind groups, dispatch; ping-pong buffers; workgroup memory and tiling; float32 error; sharing GPU buffers with the renderer.

**Build toward:** `packages/aether-gpu`, taking a `GPUDevice` from the caller; 2D and 3D FDTD with PML; Jacobi and red–black kernels for S4; a tiled N-body kernel; buffers the renderer draws from without reading back.

**Decisions.** The CPU version is the specification: write a kernel only after its CPU counterpart is tested, and compare against float64 with tolerances set from the step count.

**Proves it.** Each kernel matches its CPU reference on a small grid; a 3D dipole antenna runs at interactive rates on a 128³ grid.

**Study.** [WebGPU Fundamentals](https://webgpufundamentals.org/); *GPU Gems 3*, "Fast N-Body Simulation with CUDA".

More: [RESOURCES.md, Track S](./RESOURCES.md#track-s-simulation-core)

---

## Track V: visualization library

Track V builds `packages/aether-viz`, the Three.js layer. V1 is shared with the engine's demo app; V2–V5 are the Lab's. `aether-viz` depends on `aether-physics`, `aether-lab` and Three.js; neither library depends on it. **Design the API from the examples:** each phase starts by writing the Lab examples it should make possible.

## V1: Extract `aether-viz`

Move the demo app's stage (renderer, camera, controls, theme), drawing and stepping helpers, parameter schema, ring buffer, ticker, and chart and readout specs into the package, with `three` as a peer dependency. **Proves it:** every demo runs unchanged and the tests pass.

**Decision:** what counts as engine-demo-only and what the Lab will need; extract only what both use.

## V2: `createLab` and playback

A simulation set up and running in about ten lines, with a timeline: bindings from state to scene (bodies, trails, arrows, springs, labels), plots, controls from the V1 schema, clock adapters for both engine worlds (interpolation) and Lab simulations (dense output), real-time, slow-motion and precomputed playback with a scrubber and a ghost run.

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

**Proves it:** the double pendulum above runs, scrubs both ways, and its energy plot shows drift at the tolerance.

## V3: Field visualizers

Field lines with direction and magnitude colour, instanced arrows, plane slices with a perceptual colormap and legend, isosurfaces, advected tracers, draggable sources that re-trace on drag, and drawing straight from GPU buffers for S6. **Decisions:** 3D clutter is the enemy, so default to a slice or a few seeded lines; viridis for magnitudes, a diverging map for signed quantities.

## V4: The Lab gallery

The Lab's own front page at `/lab`, with textbook problems by topic as live, editable examples: a running lab, its source in an editor (re-run in a sandboxed iframe), a description, and the analytic result it's checked against. Shareable by URL.

## V5: Scenes without code

A versioned JSON scene format, a loader, a scene editor in the demo app, and export as JSON, URL or the equivalent TypeScript, so a teacher can build and share a simulation without writing code.

### Study (Track V)

| Resource | Sections | What to take from it |
|---|---|---|
| [GlowScript / VPython](https://www.glowscript.org/) | Docs and examples | The bar for brevity. |
| [myPhysicsLab](https://www.myphysicslab.com/) | Simulation and graph architecture | Separating model, view and controls. |
| [PhET](https://phet.colorado.edu/) | EM and mechanics sims; design research | What makes a teaching simulation clear. |
| K. Moreland, "Diverging Color Maps" (2009) | All | Colormaps for signed fields. |
| [Three.js manual](https://threejs.org/manual/) | Instancing, `BufferGeometry`, `WebGPURenderer` | Many arrows and lines cheaply. |

More: [RESOURCES.md, Track V](./RESOURCES.md#track-v-visualization-library)

---

## Working rhythm for each step

1. Read the step's **Concept** and the first resource or two, enough to explain it in your own words.
2. Look at **In the engine**: find the types and seams it touches in the current code, and re-check [The engine today](#the-engine-today).
3. Make the step's **Decisions**. Sketch the shape you want, write the tests from **Proves it**, then implement.
4. Build the demo and its debug view, following [DEMOS.md](./DEMOS.md#2-checklist-for-a-new-demo).
5. Update this roadmap (✅, the decision you made, the engine map, differences from the book) and add a [BUILD-LOG.md](./BUILD-LOG.md) entry, in the same commit.
