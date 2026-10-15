# Box3D: the second reference

[Box3D](https://github.com/erincatto/box3d) is Erin Catto's 3D successor to Box2D v3: portable C17, MIT licensed, version 0.1.0 (first public release in May 2026, actively developed). Where Millington's Cyclone engine teaches the *ideas* one at a time, Box3D shows what those ideas look like after twenty years of refinement in a production engine. [PLAN.md](./PLAN.md) uses Millington as the backbone and Box3D as the "how a modern engine does it" reference at the end of each phase.

Facts below were checked against `main` on 2026-10-13. File paths are relative to the Box3D repo.

**How to use it**

- **Build your version first, then read Box3D's.** Box3D is heavily optimized (SIMD lanes, graph coloring, solver sets, arena allocation), so its code is a poor first explanation. Read Catto's talks and blog posts for the explanation, and the code to check details.
- **Translate ideas, not structure.** C structs in contiguous arrays, `b3`-prefixed functions and handle IDs don't map one-to-one onto TypeScript classes. Phase 8's performance work is where Aether moves closer to Box3D's data layout.
- **The repo's `docs/` folder is the best entry point.** `docs/simulation.md` (the step loop, islands, sleeping, bullets, determinism), `docs/collision.md` (shapes, manifolds, queries), `docs/character.md` (mover), and `docs/reading.md` (Catto's own reading list).
- **The samples are a demo checklist.** `samples/` has about 180 scenes, and many line up with Aether demos: Card House, Jenga, Arch, Dominoes, Gyroscopic Precession, Spinning Book, Bullet vs Stack, Thin Wall, Ragdoll, Rolling Resistance, Conveyor. `shared/benchmarks.c` has the benchmark scenes (pyramids, joint grid, rain, washer).

---

## Millington (Cyclone) vs Box3D

| Topic | Millington / Cyclone | Box3D | Aether phase |
|---|---|---|---|
| **Rotation storage** | Quaternion, normalized each step; 3×4 transform matrix derived | Quaternion `b3Quat`; transform is `{p, q}` with no derived matrix stored. Rotation integrated as `q + ½(ω·h)q`, then normalized (`src/math_internal.h`, `b3IntegrateRotation`) | 1, 4 |
| **Integrator** | Semi-implicit Euler, applied once per step | Semi-implicit Euler, applied once per **substep** | 2, 4, 6 |
| **Damping** | `v *= damping^dt` | Padé approximation `v *= 1 / (1 + h·c)` (`src/solver.c`), with `c` in 1/s | 2, 4 |
| **Gyroscopic term** | Not present | Implicit: one Newton–Raphson iteration on `I(ω₂ − ω₁) + h·ω₂ × (I·ω₂) = 0` in body space (`src/solver.c`, `B3_GYROSCOPIC_ITERATIONS`) | 4 |
| **Velocity limits** | None | Max linear speed and max rotation per step (`B3_MAX_ROTATION = 0.25π`) | 4 |
| **Shapes** | Sphere, box, plane (half-space) | Sphere, capsule, convex hull (boxes are hulls), triangle mesh, height field, compound. Meshes, height fields and compounds are static-only. No cylinder: hull approximations instead (`docs/faq.md`) | 5 |
| **Hull building** | Not covered | Quickhull with half-edge mesh and face merging (`src/hull.c`) | 5, 8 |
| **Broadphase** | BVH discussed, simple implementation | Three dynamic AABB trees (static, kinematic, dynamic) with SAH insertion and tree rotations, partial rebuilds (`src/broad_phase.c`, `src/dynamic_tree.c`) | 5 |
| **Narrowphase** | Hand-written box–box SAT, sphere/plane cases | Per-pair routines; hull–hull SAT with Gauss-map edge pruning, reference/incident clipping, reduced to ≤ 4 points (`src/convex_manifold.c`, `src/manifold.c`). GJK distance with a simplex cache (`src/distance.c`) | 5 |
| **Contact persistence** | Contacts regenerated each frame | Persistent contacts with warm starting, plus **contact recycling**: reuse last step's manifold when the relative pose barely changed, re-estimating only the separations | 5, 6, 8 |
| **Speculative contacts** | No | Yes: contacts created within `4 × linear slop` of touching, solved with a positive bias so bodies close the gap but don't cross it | 5, 6 |
| **Solver** | Resolve the worst contact first, separate velocity and penetration passes | **Soft Step**: substepped soft sequential impulses. Per substep: integrate velocities → warm start → solve (with bias) → integrate positions → relax (no bias). Then restitution passes (`src/solver.c`, `b3SolverStage_*`) | 6 |
| **Position correction** | Nonlinear projection (linear + angular split) | Soft constraints: penetration is fed back as a spring with frequency `contactHertz` and damping ratio, capped at `contactSpeed`. The relax pass removes the bias velocity so it doesn't turn into bounce | 6 |
| **Friction** | Per-contact-point, static and dynamic coefficients | **One** 2D friction constraint per manifold at a weighted friction center, clamped to a circle (a true cone), plus a twist-friction constraint. One coefficient. Mixing: geometric mean (`src/contact_solver.c`) | 6 |
| **Restitution** | Applied during the velocity pass | Separate pass after all substeps, using the pre-solve normal velocity; below `restitutionThreshold`, no bounce | 6 |
| **Rolling resistance** | No | Angular constraint clamped by `resistance × radius × normalImpulse` | 6 |
| **Joints** | Contacts reused as joints (ch. 17 ragdoll) | Jacobian joints: revolute, prismatic, spherical (cone + twist limits), weld, wheel, distance, motor, parallel, filter. All soft (`hertz`, `dampingRatio`), with springs, limits and motors; breakable through force/torque thresholds | 7 |
| **Soft constraint parameters** | Not covered | `b3MakeSoft(hertz, ζ, h)` → `{biasRate, massScale, impulseScale}` (`src/solver.h`). Joint stiffness is clamped to ¼ of the substep rate | 6, 7 |
| **Islands and sleep** | Sleep per body; "contact grouping" | Persistent islands used only for sleeping. Merge on begin-touch; split lazily (at most one island per step). Sleeping islands move into their own *solver set* so awake data stays contiguous (`src/island.c`, `src/solver_set.c`) | 7 |
| **CCD** | Not covered | Speculative contacts for the common case; time of impact (`b3TimeOfImpact`, conservative advancement) for fast bodies against static geometry; `isBullet` bodies also against dynamic bodies | 8 |
| **API** | Pointers to objects | Handle IDs `{index, world, generation}` with `b3Body_IsValid` (`include/box3d/id.h`) | 8 |
| **Events and queries** | Not covered | Contact begin/end/hit events, sensor events, body-move events, joint-break events; ray, shape and overlap queries; a character mover (`src/mover.c`) | 7, 8 |
| **Parallelism** | Single-threaded | Graph coloring (24 colors, last one is a single-threaded overflow), one contact per SIMD lane, task-system hooks (`src/constraint_graph.c`, `src/contact_solver_wide.inl`) | 8 |
| **Determinism** | Not addressed | Deterministic across thread counts and platforms: creation order, strict floating point, its own `sin`/`cos`/`atan2`; recording and replay (`src/recording.c`, `src/replay.c`) | 7, 8 |
| **Large worlds** | Not addressed | Optional double-precision positions (`docs/large_worlds.md`) | not needed: Aether already uses `Float64Array` |

### The three big ideas Box3D adds

1. **Substepping instead of iterating.** Millington and classic sequential impulses take one big step and iterate the solver many times. Box3D takes several small substeps (4 recommended) with one solve iteration each. Small steps make the linearized constraints more accurate and make stiff systems stable; Macklin's *Small Steps* paper shows why. This is the single largest change between the two engines.
2. **Soft constraints everywhere.** Instead of Baumgarte's arbitrary `β` or a separate position pass, every constraint is a spring–damper with a frequency in hertz and a damping ratio. That turns "how fast should penetration be corrected?" into a physical parameter that doesn't depend on `dt` or iteration count. The relax pass then strips the correction velocity, so pushing apart doesn't add bounce.
3. **Fewer, better constraints per contact.** One friction constraint at the friction center plus twist friction, rather than two tangents per point, gives a true friction cone and less jitter. Speculative contacts let contacts start a little before touching, so moderate-speed impacts and resting contact need no CCD pass; time of impact is reserved for fast bodies.

### What Aether should *not* copy (yet)

- **SIMD and graph coloring.** JavaScript has no portable SIMD; WebAssembly SIMD exists but is outside this project's scope. Graph coloring is still worth learning in Phase 8 as the prerequisite for a Web Worker solver.
- **Solver sets, arena allocators and handle IDs.** These are data-oriented performance choices. Revisit them only if profiling in Phase 8 points there.
- **Meshes, height fields and compounds.** Useful for games, but each is its own project. Listed as stretch goals.

---

## Box3D file map by phase

| Phase | Read in Box3D | What to compare |
|---|---|---|
| 1 Math | `include/box3d/math_functions.h`, `src/math_internal.h` | `b3Quat`, `b3Transform`, `b3IntegrateRotation`, `b3Matrix3`. Note how little matrix code a quaternion-first engine needs |
| 4 Rigid bodies | `src/body.h`, `src/body.c`, `src/solver.c` (velocity integration near the top) | Body state split into hot `b3BodyState` and cold `b3BodySim`; Padé damping; the implicit gyroscopic solve; velocity clamps |
| 5 Collision | `src/dynamic_tree.c`, `src/broad_phase.c`, `src/convex_manifold.c`, `src/manifold.c`, `src/distance.c`, `src/hull.c`, `src/capsule.c` | Tree insertion and rotations; hull–hull SAT and clipping; manifold reduction; GJK with a simplex cache; Quickhull |
| 6 Response | `src/contact_solver.c`, `src/solver.c`, `src/solver.h` (`b3MakeSoft`), `src/contact.c` | Prepare / warm start / solve / relax / restitution; friction center and twist friction; rolling resistance; speculative bias |
| 7 Joints, sleep | `src/joint.c`, `src/revolute_joint.c`, `src/spherical_joint.c`, `src/weld_joint.c`, `src/prismatic_joint.c`, `src/island.c`, `src/solver_set.c`, `src/sensor.c` | Joint Jacobians with soft parameters, limits and motors; persistent islands; sleeping by moving islands between solver sets; sensors and events |
| 8 Stretch | `src/constraint_graph.c`, `src/contact_solver_wide.inl`, `src/mover.c`, `src/recording.c`, `src/replay.c`, `docs/simulation.md` (Bullets, Determinism) | Graph coloring, wide solver, CCD for bullets, character mover, deterministic replay |

---

## Literature behind Box3D

Grouped by topic. Each link was checked on 2026-10-13 unless marked otherwise.

### Solvers and soft constraints

| Resource | What it's for |
|---|---|
| Erin Catto, [Iterative Dynamics with Temporal Coherence](https://box2d.org/files/ErinCatto_IterativeDynamics_GDC2005.pdf) (GDC 2005) | The original projected Gauss–Seidel solver, warm starting and friction model |
| Erin Catto, [Fast and Simple Physics using Sequential Impulses](https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf) (GDC 2006) | Accumulated impulses; the core loop Box3D still uses |
| Erin Catto, [Soft Constraints](https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf) (GDC 2011) | Frequency and damping ratio instead of ERP/CFM; cited in Box3D's contact solver |
| Erin Catto, [Solver2D](https://box2d.org/posts/2024/02/solver2d/) (2024) | Eight solvers compared on the same scenes. The reason Box3D uses Soft Step |
| Erin Catto, [Releasing Box2D 3.0](https://box2d.org/posts/2024/08/releasing-box2d-3.0/) (2024) | Soft Step and the speculative/TOI hybrid, introduced |
| Erin Catto, [Announcing Box3D](https://box2d.org/posts/2026/06/announcing-box3d/) (2026) | What carried over from Box2D v3 and what's new in 3D |
| Macklin et al., [Small Steps in Physics Simulation](https://mmacklin.com/smallsteps.pdf) (SCA 2019) | Why many substeps with one iteration beat one step with many iterations |
| NVIDIA, [PhysX 4.0 Rigid Body Dynamics](https://gameworksdocs.nvidia.com/PhysX/4.0/documentation/PhysXGuide/Manual/RigidBodyDynamics.html) | The citable description of Temporal Gauss–Seidel (TGS), the PhysX relative of Soft Step |
| Müller et al., [Detailed Rigid Body Simulation with Extended Position Based Dynamics](https://matthias-research.github.io/pages/publications/PBDBodies.pdf) (2020) | XPBD for rigid bodies: the main alternative to impulse solvers, also substepped |
| Bender, Erleben & Trinkle, [Interactive Simulation of Rigid Body Dynamics in Computer Graphics](https://perso.liris.cnrs.fr/fzara/Web/media/files/M2-Animation/cgf12272.pdf) (CGF 2014) | Survey: solver families, friction cones and their linearizations, stabilization |
| Baumgarte, [Stabilization of constraints and integrals of motion](https://www.sciencedirect.com/science/article/abs/pii/0045782572900187) (1972; paywalled) | Where Baumgarte stabilization comes from |

### Integration

| Resource | What it's for |
|---|---|
| Erin Catto, [Numerical Methods](https://box2d.org/files/ErinCatto_NumericalMethods_GDC2015.pdf) (GDC 2015) | Symplectic Euler, the implicit gyroscopic term |
| Erin Catto, [Numerical Integration](https://box2d.org/files/ErinCatto_NumericalIntegration_GDC2009.pdf) (GDC 2009) | Stability of integrators |
| Fabian Giesen, [Quaternion differentiation](https://fgiesen.wordpress.com/2012/08/24/quaternion-differentiation/) (2012) | The `q + ½(ω·h)q` update Box3D cites |
| Joan Solà, [Quaternion Kinematics for the Error-State Kalman Filter](https://arxiv.org/abs/1711.02508) (2017) | Rigorous treatment: exponential map vs first-order updates |

### Collision

| Resource | What it's for |
|---|---|
| Gilbert, Johnson & Keerthi, [A Fast Procedure for Computing the Distance between Complex Objects](https://web.eecs.umich.edu/~grizzle/GilbertFest/Gilbert%2858%29.pdf) (1988) | The original GJK paper |
| Erin Catto, [Computing Distance using GJK](https://box2d.org/files/ErinCatto_GJK_GDC2010.pdf) (GDC 2010) | GJK with Voronoi-region simplex solving, as in `src/distance.c` |
| Erin Catto, [Contact Manifolds](https://box2d.org/files/ErinCatto_ContactManifolds_GDC2007.pdf) (GDC 2007) | Clipping-based manifolds and feature IDs |
| Dirk Gregorius, [The Separating Axis Test between Convex Polyhedra](https://media.steampowered.com/apps/valve/2013/DGregorius_GDC2013.zip) (GDC 2013, zip of slides) | Hull–hull SAT with Gauss-map pruning, as in `b3ComputeSeparatingAxis` |
| Dirk Gregorius, [Robust Contact Creation for Physics Simulations](https://media.steampowered.com/apps/valve/2015/DirkGregorius_Contacts.pdf) (GDC 2015) | Manifold clipping and reduction |
| Dirk Gregorius, [Implementing QuickHull](https://media.steampowered.com/apps/valve/2014/DirkGregorius_ImplementingQuickHull.pdf) (GDC 2014) | The hull builder in `src/hull.c` (Gregorius contributed to it) |
| Barber, Dobkin & Huhdanpaa, The Quickhull Algorithm for Convex Hulls (ACM TOMS 1996; [DOI](https://doi.org/10.1145/235815.235821), [Qhull](http://www.qhull.org/)) | The original Quickhull paper (no free PDF found) |
| Erin Catto, [Continuous Collision](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf) (GDC 2013) | Conservative advancement and time of impact |
| Paul Firth, [Speculative Contacts, Part 1](https://web.archive.org/web/2011/http://www.wildbunny.co.uk/blog/2011/03/25/speculative-contacts-an-continuous-collision-engine-approach-part-1/) (2011, archived) | The speculative-contact idea in its simplest form |
| Erin Catto, [SIMD for Collision](https://box2d.org/posts/2026/07/simd-for-collision/) (2026); [Contact Recycling](https://box2d.org/posts/2026/10/contact-recycling/) (2026) | Box3D-specific narrowphase optimizations |

### Broadphase

| Resource | What it's for |
|---|---|
| Erin Catto, [Dynamic Bounding Volume Hierarchies](https://box2d.org/files/ErinCatto_DynamicBVH_Full.pdf) (GDC 2019, full slides) | SAH insertion and tree rotations |
| Bittner, Hapala & Havran, [Fast Insertion-Based Optimization of Bounding Volume Hierarchies](https://dcgi.fel.cvut.cz/~havran/ARTICLES/bittner2013cgf_preprint.pdf) (CGF 2013) | The paper behind the insertion strategy |
| Erin Catto, [Dynamic Tree Improvements](https://box2d.org/posts/2025/03/dynamic-tree-improvements/) (2025) | Partial rebuilds and what changed since 2019 |
| Pierre Terdiman, [Sweep-and-Prune](https://www.codercorner.com/SAP.pdf) | The classic SAP write-up (link live; contents not re-checked) |

### Islands, sleeping, parallelism and determinism

| Resource | What it's for |
|---|---|
| Erin Catto, [Simulation Islands](https://box2d.org/posts/2023/10/simulation-islands/) (2023) | Persistent islands with lazy splitting vs rebuilding every step |
| Erin Catto, [SIMD Matters](https://box2d.org/posts/2024/08/simd-matters/) (2024) | Graph coloring and the wide contact solver |
| Erin Catto, [Determinism](https://box2d.org/posts/2024/08/determinism/) (2024) | Cross-platform floating-point pitfalls |
| Smelyanskiy et al., [physics simulation on many-core](http://web.eecs.umich.edu/~msmelyan/papers/physsim_onmanycore_itj.pdf) (Intel Technology Journal; title not re-checked) | The graph-coloring approach `src/constraint_graph.c` cites |

**Not verified:** Tonge's GDC 2013 talk *Iterative Rigid Body Solvers* (only the [GDC Vault page](https://gdcvault.com/play/1017643/Physics-for-Game) exists, no slides); Erleben's 2005 thesis (no working PDF); a primary source for Bullet's split impulses; a paper on rolling resistance.
