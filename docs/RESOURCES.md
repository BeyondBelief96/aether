# Aether: resources

Resources are grouped by the phases in [PLAN.md](./PLAN.md). ★ marks items from [brm.io, "Game physics from scratch"](https://brm.io/game-physics-for-beginners/) by Liam Brummitt (author of matter.js). Many of that page's links are from around 2012; the links below were checked in October 2026 and updated where the originals moved or died.

**Key:** 📖 book · 📄 article/paper · 🎤 talk/slides · 🎥 video · 💻 source code · 🌐 web-platform docs

---

## Core texts (use throughout)

| | Resource | Use it for |
|---|---|---|
| 📖 | **Ian Millington, *Game Physics Engine Development*** (local PDF: `~/Desktop/textbooks/Ian_Millington-Game_Physics_Engine_Development-EN.pdf`) | The backbone. Chapter order matches the phases (see the chapter map in PLAN.md). |
| 📖 | **Christer Ericson, *Real-Time Collision Detection*** — [realtimecollisiondetection.net](https://realtimecollisiondetection.net/books/rtcd/) | The standard reference for Phase 5. |
| 🎤 | **Erin Catto's GDC talks and papers** — [box2d.org/publications](https://box2d.org/publications/) | The clearest explanations of contact solvers anywhere. Phases 6–8. |
| 🎥 | **Matthias Müller, *Ten Minute Physics*** — [index](https://matthias-research.github.io/pages/tenMinutePhysics/index.html) · [code](https://github.com/matthias-research/pages) | Short videos with runnable JavaScript, so it maps straight onto a web project. |
| 📄 | **Glenn Fiedler, *Game Physics* series** — [Integration Basics](https://gafferongames.com/post/integration_basics/) · [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) · [Physics in 3D](https://gafferongames.com/post/physics_in_3d/) · [Spring Physics](https://gafferongames.com/post/spring_physics/) | ★ Short and practical; the timestep article underpins Phase 0. |
| 📄 | **Allen Chou, *Game Physics* series** — [allenchou.net/game-physics-series](https://allenchou.net/game-physics-series/) | 3D-specific: broadphase, GJK and EPA, contact manifolds, sequential impulses. |

---

## Phase 0: Scaffold and game loop

| | Resource |
|---|---|
| 📄 | ★ Glenn Fiedler, [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/): the accumulator and interpolation pattern `FixedStepLoop` implements |
| 📖 | Millington ch. 1, *Introduction*: what a physics engine is and isn't |
| 🌐 | [Vite guide](https://vite.dev/guide/) · [Vitest guide](https://vitest.dev/guide/) |
| 🌐 | [Lit docs](https://lit.dev/docs/) · [Reactive properties](https://lit.dev/docs/components/properties/) (use the "JavaScript" tab: `static properties`, no decorators) |
| 🌐 | [Three.js manual](https://threejs.org/manual/): fundamentals, responsive design, scene graph |
| 🌐 | MDN: [Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) · [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) · [CSS grid layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) |
| 🌐 | [TypeScript `erasableSyntaxOnly`](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly) |

## Phase 1: Math library

| | Resource |
|---|---|
| 📖 | Millington ch. 2, *The Mathematics of Particles*; ch. 9, *The Mathematics of Rotations* |
| 📖 | Dunn & Parberry, [*3D Math Primer for Graphics and Game Development*](https://gamemath.com/book/) (free online): vectors, matrices, quaternions done carefully |
| 🎥 | 3Blue1Brown, [*Essence of Linear Algebra*](https://www.3blue1brown.com/topics/linear-algebra): geometric intuition for dot and cross products, matrices, determinants |
| 🎥 | Ben Eater & 3Blue1Brown, [interactive quaternions](https://eater.net/quaternions) |
| 🎥 | Ten Minute Physics, ep. 07 *Intuitive 3d Vector Math for Simulation* |
| 💻 | Read for API ideas: Three.js `Vector3` / `Quaternion` / `Matrix3`; cannon-es `math/` |

## Phase 2: Particles and integration

| | Resource |
|---|---|
| 📖 | Millington ch. 3, *The Laws of Motion*; ch. 4, *The Particle Physics Engine* |
| 📄 | ★ Glenn Fiedler, [Integration Basics](https://gafferongames.com/post/integration_basics/): explicit Euler vs semi-implicit Euler vs RK4 |
| 📄 | ★ Florian Boesch, [Integration by Example: Euler vs Verlet vs Runge-Kutta](https://web.archive.org/web/20161203201525/http://codeflow.org/entries/2010/aug/28/integration-by-example-euler-vs-verlet-vs-runge-kutta/) (archived) |
| 📄 | ★ Jonathan Dummer, [A Simple Time-Corrected Verlet Integration Method](https://web.archive.org/web/20170116023423/http://lonesock.net/article/verlet.html) (archived) |
| 📄 | Witkin & Baraff, [*Physically Based Modeling* course notes](https://www.cs.cmu.edu/~baraff/sigcourse/): the "Differential Equation Basics" and "Particle Dynamics" chapters |
| 🎥 | Ten Minute Physics: ep. 01 *Introduction to 2d web browser physics*, ep. 02 *…3d and VR web browser physics*, ep. 03 *Ball collision handling in 2d* |
| 🌐 | MDN, [Canvas API tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial): for the energy graph |

## Phase 3: Forces, springs and mass aggregates

| | Resource |
|---|---|
| 📖 | Millington ch. 5–8: general forces, springs, hard constraints, the mass-aggregate engine |
| 📄 | ★ Thomas Jakobsen, [Advanced Character Physics](https://web.archive.org/web/20080410171619/http://www.teknikus.dk/tj/gdc2001.htm) (GDC 2001, archived): Verlet with position constraints, the basis of cloth and ragdolls in *Hitman* |
| 📄 | Glenn Fiedler, [Spring Physics](https://gafferongames.com/post/spring_physics/) |
| 📄 | Müller, Macklin et al., [XPBD: Position-Based Simulation of Compliant Constrained Dynamics](https://matthias-research.github.io/pages/publications/XPBD.pdf) |
| 🎥 | Ten Minute Physics: ep. 05 *The simplest possible physics simulation method*, ep. 08 *Providing user interaction with a 3d scene*, ep. 09 *Getting ready to simulate the world with XPBD*, ep. 10 *Simple and unbreakable simulation of soft bodies*, ep. 14 *The secret of cloth simulation* |
| 🎤 | Erin Catto, [Soft Constraints](https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf) (GDC 2011): stiffness without explosions |
| 🌐 | [Three.js Raycaster](https://threejs.org/docs/#api/en/core/Raycaster): for dragging particles |

## Phase 4: Rigid bodies

| | Resource |
|---|---|
| 📖 | Millington ch. 9–11: rotations, rigid-body laws of motion, the rigid-body engine |
| 📄 | ★ Chris Hecker, [Rigid Body Dynamics articles](https://www.chrishecker.com/Rigid_Body_Dynamics): four classic *Game Developer* columns; part 4 covers 3D |
| 📄 | ★ Witkin & Baraff, [*Physically Based Modeling* course notes](https://www.cs.cmu.edu/~baraff/sigcourse/) ([Pixar mirror](https://graphics.pixar.com/pbm2001/)): the "Rigid Body Dynamics" chapters |
| 📄 | ★ David Baraff, [papers and technical reports](https://www.cs.cmu.edu/~baraff/papers/index.html) |
| 📄 | Brian Mirtich, [Fast and Accurate Computation of Polyhedral Mass Properties](https://people.eecs.berkeley.edu/~jfc/mirtich/massProps.html): inertia tensors for convex hulls |
| 📄 | Glenn Fiedler, [Physics in 3D](https://gafferongames.com/post/physics_in_3d/) |
| 🎥 | Ten Minute Physics, ep. 22 *How to write a basic rigid body simulator using position based dynamics* |
| 📄 | ★ Randy Gaul, [How to Create a Custom 2D Physics Engine: Oriented Rigid Bodies](https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-oriented-rigid-bodies--gamedev-8032t) (2D, but the clearest intro to angular terms) |

## Phase 5: Collision detection

| | Resource |
|---|---|
| 📖 | Millington ch. 12, *Collision Detection*; ch. 13, *Generating Contacts* |
| 📖 | Ericson, *Real-Time Collision Detection*: ch. 4 (bounding volumes), 5 (primitive tests), 6–7 (BVHs, spatial partitioning), 9 (GJK) |
| 📄 | ★ William Bittle, [SAT (Separating Axis Theorem)](https://dyn4j.org/2010/01/sat/) (moved from codezealot.org) |
| 📄 | ★ William Bittle, [GJK](https://dyn4j.org/2010/04/gjk-gilbert-johnson-keerthi/) · [EPA](https://dyn4j.org/2010/05/epa-expanding-polytope-algorithm/) · [Contact Points Using Clipping](https://dyn4j.org/2011/11/contact-points-using-clipping/) |
| 🎤 | Erin Catto, [Computing Distance using GJK](https://box2d.org/files/ErinCatto_GJK_GDC2010.pdf) (GDC 2010) |
| 🎤 | Erin Catto, [Dynamic Bounding Volume Hierarchies](https://box2d.org/files/ErinCatto_DynamicBVH_GDC2019.pdf) (GDC 2019): the broadphase most engines use |
| 🎤 | Dirk Gregorius, [The Separating Axis Test between Convex Polyhedra](https://www.gdcvault.com/play/1017646/Physics-for-Game-Programmers-The) (GDC 2013): box–box and hull–hull SAT done properly |
| 🎤 | Dirk Gregorius, [Robust Contact Creation for Physics Simulations](https://www.gdcvault.com/play/1022193/Physics-for-Game-Programmers-Robust) (GDC 2015): contact manifolds |
| 📄 | ★ Raigan Burns & Mare Sheppard, [N Tutorial A: Collision Detection and Response](https://www.metanetsoftware.com/technique/tutorialA.html) (2D SAT, beautifully illustrated) |
| 📄 | Allen Chou, [*Game Physics* series](https://allenchou.net/game-physics-series/): broadphase, GJK, EPA, contact generation |
| 🎥 | Ten Minute Physics: ep. 11 *Finding overlaps among thousands of objects blazing fast* (spatial hashing), ep. 23 *Broad phase collision detection with Sweep and Prune*, ep. 24 *Bounding Volume Hierarchies* |

## Phase 6: Collision response and friction

| | Resource |
|---|---|
| 📖 | Millington ch. 14, *Collision Resolution*; ch. 15, *Resting Contacts and Friction* |
| 🎤 | ★ Erin Catto, [Iterative Dynamics with Temporal Coherence](https://box2d.org/files/ErinCatto_IterativeDynamics_GDC2005.pdf) (GDC 2005) |
| 🎤 | Erin Catto, [Fast and Simple Physics using Sequential Impulses](https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf) (GDC 2006): **the** sequential-impulse reference |
| 📄 | Erin Catto, [Solver2D](https://box2d.org/posts/2024/02/solver2d/): compares eight solvers (soft step, PGS, TGS, XPBD…) on the same scenes |
| 📄 | ★ Glenn Fiedler, [Collision Response and Coulomb Friction](https://gafferongames.com/post/collision_response_and_coulomb_friction/) |
| 📄 | ★ Erik Neumann, [myPhysicsLab: Rigid-body collisions](https://www.myphysicslab.com/engine2D/collision-en.html): the original "Collision Handling Methods" page has moved; see the [site index](https://www.myphysicslab.com/) |
| 📄 | ★ Randy Gaul, [How to Create a Custom 2D Physics Engine: The Basics and Impulse Resolution](https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-the-basics-and-impulse-resolution--gamedev-6331t) · [blog](https://randygaul.github.io/) |
| 📄 | ★ Paul Firth, [Physics engines for dummies](https://www.wildbunny.co.uk/blog/2011/04/06/physics-engines-for-dummies/) (the site may block automated access; open it in a browser) |
| 📄 | ★ Helmut Garstenauer, [A Unified Framework for Rigid Body Dynamics](https://web.archive.org/web/20160717002302/http://www.digitalrune.com/Portals/0/Documents/A%20Unified%20Framework%20for%20Rigid%20Body%20Dynamics.pdf) (archived thesis: impulses, constraints, solver details) |
| 💻 | [box2d-lite](https://github.com/erincatto/box2d-lite): about 1,000 lines of C++; the GDC 2006 solver in its smallest form |

## Phase 7: Joints, sleeping and stability

| | Resource |
|---|---|
| 📖 | Millington ch. 16, *Stability and Optimization*; ch. 17, *Putting It All Together* |
| 🎤 | Erin Catto, [Modeling and Solving Constraints](https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf) (GDC 2009): Jacobians, joints |
| 🎤 | Erin Catto, [Understanding Constraints](https://box2d.org/files/ErinCatto_UnderstandingConstraints_GDC2014.pdf) (GDC 2014; [video](https://www.gdcvault.com/play/1020603/Physics-for-Game-Programmers-Understanding)) |
| 🎤 | Erin Catto, [Soft Constraints](https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf) (GDC 2011): frequency and damping-ratio joints |
| 📄 | David Baraff, [Fast Contact Force Computation for Nonpenetrating Rigid Bodies](https://www.cs.cmu.edu/~baraff/papers/sig94.pdf) (SIGGRAPH 1994): the LCP view of contacts, for depth |
| 📄 | Allen Chou, [*Game Physics* series](https://allenchou.net/game-physics-series/): constraints and sequential impulses |
| 🎥 | Ten Minute Physics: ep. 06 *Writing a triple pendulum simulation is simple*, ep. 25 *Joint simulation made simple* |

## Phase 8: Stretch goals

| | Resource |
|---|---|
| 📖 | Millington ch. 18, *Other Types of Physics* |
| 🎤 | ★ Erin Catto, [Continuous Collision](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf) (GDC 2013; [video](https://www.gdcvault.com/play/1018239/Physics-for-Game-Programmers-Continuous)) |
| 📄 | Erin Catto, [Determinism](https://box2d.org/posts/2024/08/determinism/) (Box2D blog) |
| 📄 | Müller et al., [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf) |
| 📄 | ★ Mark Bayazit, convex polygon decomposition (linked from brm.io; the original page is gone, so search for "Bayazit decomposition"): for splitting concave shapes into convex pieces |
| 🌐 | MDN: [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) · [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) (requires cross-origin isolation headers) |

---

## Reference engines (read, don't copy)

| | Engine | Why read it |
|---|---|---|
| 💻 | [cannon-es](https://github.com/pmndrs/cannon-es) | 3D, JavaScript, small and readable; the closest relative to Aether |
| 💻 | [matter-js](https://github.com/liabru/matter-js) (cloned at `~/Code/matter-js`) | 2D, JavaScript, by the brm.io author; clean pipeline structure |
| 💻 | [box2d-lite](https://github.com/erincatto/box2d-lite) | The minimal sequential-impulse solver |
| 💻 | [Jolt Physics](https://github.com/jrouwe/JoltPhysics) ([docs](https://jrouwe.github.io/JoltPhysics/)) | Modern production 3D engine (*Horizon Forbidden West*); excellent architecture docs |
| 💻 | [Bullet](https://github.com/bulletphysics/bullet3) | The classic open-source 3D engine |
| 💻 | [Rapier](https://rapier.rs/) | Rust, compiles to WASM; a useful performance yardstick in the browser |

## Web UI along the way

| Phase | Topic | Resource |
|---|---|---|
| 0 | Components, reactive properties, events | [Lit docs](https://lit.dev/docs/) |
| 0 | Layout | [MDN CSS grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) |
| 2 | Hand-drawn charts | [MDN Canvas tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial) |
| 3–4 | Picking and dragging | [Three.js Raycaster](https://threejs.org/docs/#api/en/core/Raycaster) |
| 5 | Responsive panels | [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) |
| 8 | Off-main-thread physics | [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) |
