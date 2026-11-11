# Aether: resources

Resources are grouped by the phases and tracks in [PLAN.md](./PLAN.md): Phases 0–8 (Track G) build the engine; Tracks S and V build Aether Lab, the simulation and visualization library. ★ marks items from [brm.io, "Game physics from scratch"](https://brm.io/game-physics-for-beginners/) by Liam Brummitt (author of matter.js). Many of that page's links are from around 2012; the links below were checked in October 2026 and updated where the originals moved or died.

**Key:** 📖 book · 📄 article/paper · 🎤 talk/slides · 🎥 video · 💻 source code · 🌐 web-platform docs

---

## Core texts (use throughout)

| | Resource | Use it for |
|---|---|---|
| 📖 | **Ian Millington, *Game Physics Engine Development*** (local PDF: `~/Desktop/Textbooks/Ian_Millington-Game_Physics_Engine_Development-EN.pdf`; PDF page = printed page + 23) | The backbone. Chapter order matches the phases; PLAN.md cites sections and pages per phase. |
| 📖 | **Christer Ericson, *Real-Time Collision Detection*** — [realtimecollisiondetection.net](https://realtimecollisiondetection.net/books/rtcd/) | The standard reference for Phase 5. |
| 🎤 | **Erin Catto's GDC talks and papers** — [box2d.org/publications](https://box2d.org/publications/) | The clearest explanations of contact solvers anywhere. Phases 6–8. |
| 💻 | **Erin Catto, *Box3D*** — [github.com/erincatto/box3d](https://github.com/erincatto/box3d) · [blog](https://box2d.org/posts/) | The modern counterpart to Millington. [BOX3D.md](./BOX3D.md) compares the two and maps Box3D's files onto the phases. Phases 1 and 4–8. |
| 🎥 | **Matthias Müller, *Ten Minute Physics*** — [index](https://matthias-research.github.io/pages/tenMinutePhysics/index.html) · [code](https://github.com/matthias-research/pages) | Short videos with runnable JavaScript, so it maps straight onto a web project. |
| 📄 | **Glenn Fiedler, *Game Physics* series** — [Integration Basics](https://gafferongames.com/post/integration_basics/) · [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) · [Physics in 3D](https://gafferongames.com/post/physics_in_3d/) · [Spring Physics](https://gafferongames.com/post/spring_physics/) | ★ Short and practical; the timestep article underpins Phase 0. |
| 📄 | **Allen Chou, *Game Physics* series** — [allenchou.net/game-physics-series](https://allenchou.net/game-physics-series/) | 3D-specific: broadphase, GJK and EPA, contact manifolds, sequential impulses. |
| 📄 | **Witkin & Baraff, *Physically Based Modeling* (SIGGRAPH '99 course notes)** — [Stanford PDF](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/phys_model.pdf) (287 pages; notes then slides) | Differential equations (PDF p. 5), particle dynamics (p. 13), rigid bodies with contact (p. 25), implicit methods (p. 93), constrained dynamics (p. 98), collision detection slides (p. 143). Phases 2–7. |
| 📄 | **Newcastle University, *Physics Tutorials*** — [index](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/) | MSc course notes: 1 Raycasting, 2 Linear Motion, 3 Angular Motion, 4 Collision Detection, 5 Collision Response, 6 Broad and Narrow Phase, 8 Constraints and Solvers. A second explanation for Phases 2–7. |
| 📄 | **Nilson Souto, *Video Game Physics Tutorial*** (Toptal) — [Part I: Rigid Body Dynamics](https://www.toptal.com/developers/game/video-game-physics-part-i-an-introduction-to-rigid-body-dynamics) · [Part II: Collision Detection](https://www.toptal.com/developers/game/video-game-physics-part-ii-collision-detection-for-solid-objects) · [Part III: Constrained Rigid Body Simulation](https://www.toptal.com/game/video-game-physics-part-iii-constrained-rigid-body-simulation) | Phases 4, 5 and 6–7 respectively. |
| 📄 | *Optional refresher:* a Physics GRE prep pack ([Dropbox folder](https://www.dropbox.com/scl/fo/lkoz1ulj0w3iwxvr79zl3/ANCqx23SJ19je2SudgXc19A?rlkey=378833iav2gmon7lkb45ts48w&e=1&dl=0), 131 MB zip of notes, formula sheets and past papers) | Not engine-specific. Useful only if classical mechanics (Newton's laws, rotation, momentum) needs brushing up. |

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
| 📄 | Song Ho Ahn, [Quaternion to Rotation Matrix](http://www.songho.ca/opengl/gl_quaternion.html): derivation of `setFromQuat`, with a worked example to use as a test |
| 💻 | Read for API ideas: Three.js `Vector3` / `Quaternion` / `Matrix3`; cannon-es `math/` |

## Phase 2: Particles and integration

| | Resource |
|---|---|
| 📖 | Millington ch. 3, *The Laws of Motion*; ch. 4, *The Particle Physics Engine* |
| 📄 | ★ Glenn Fiedler, [Integration Basics](https://gafferongames.com/post/integration_basics/): explicit Euler vs semi-implicit Euler vs RK4 |
| 📄 | ★ Florian Boesch, [Integration by Example: Euler vs Verlet vs Runge-Kutta](https://web.archive.org/web/20161203201525/http://codeflow.org/entries/2010/aug/28/integration-by-example-euler-vs-verlet-vs-runge-kutta/) (archived) |
| 📄 | ★ Jonathan Dummer, [A Simple Time-Corrected Verlet Integration Method](https://web.archive.org/web/20170116023423/http://lonesock.net/article/verlet.html) (archived) |
| 📄 | Witkin & Baraff, [*Physically Based Modeling* course notes](https://www.cs.cmu.edu/~baraff/sigcourse/): the "Differential Equation Basics" and "Particle Dynamics" chapters |
| 📄 | ★ Chris Hecker, [Physics, Part 1: The Next Frontier](https://www.chrishecker.com/Rigid_Body_Dynamics): linear motion and integration |
| 📄 | Newcastle University, Tutorial 2 *Linear Motion* ([index](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/)) |
| 🎥 | Ten Minute Physics: ep. 01 *Introduction to 2d web browser physics*, ep. 02 *…3d and VR web browser physics*, ep. 03 *Ball collision handling in 2d* |
| 🌐 | MDN, [Canvas API tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial): for the energy graph |

## Phase 3: Forces, springs and mass aggregates

| | Resource |
|---|---|
| 📖 | Millington ch. 5–8: general forces, springs, hard constraints, the mass-aggregate engine |
| 📄 | ★ Thomas Jakobsen, [Advanced Character Physics](https://web.archive.org/web/20080410171619/http://www.teknikus.dk/tj/gdc2001.htm) (GDC 2001, archived): Verlet with position constraints, the basis of cloth and ragdolls in *Hitman* |
| 📄 | Glenn Fiedler, [Spring Physics](https://gafferongames.com/post/spring_physics/) |
| 📄 | Müller, Macklin et al., [XPBD: Position-Based Simulation of Compliant Constrained Dynamics](https://matthias-research.github.io/pages/publications/XPBD.pdf) |
| 📄 | Andrew Witkin, [Constrained Dynamics](https://www.cs.cmu.edu/~baraff/pbm/constraints.pdf) (13 pages): constraint forces instead of stiff springs; first three sections here, the rest in Phase 7 |
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
| 📄 | Newcastle University, Tutorial 3 *Angular Motion* ([index](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/)) |
| 📄 | Harry Smith, [*Aircraft Flight Mechanics*: Assumed knowledge](https://aircraftflightmechanics.com/Prerequisites/Prerequisites.html#controlsurfaces): control surfaces, aerodynamic coefficients, lift vs angle of attack. For the flight-sim demo |
| 🌐 | [Airfoil Tools](http://airfoiltools.com/): airfoil database with lift and drag curves |
| 📄 | Glenn Fiedler, [Physics in 3D](https://gafferongames.com/post/physics_in_3d/) |
| 🎤 | Erin Catto, [Numerical Methods](https://box2d.org/files/ErinCatto_NumericalMethods_GDC2015.pdf) (GDC 2015): integrator stability and the implicit gyroscopic term |
| 🎥 | Ten Minute Physics, ep. 22 *How to write a basic rigid body simulator using position based dynamics* |
| 📄 | ★ Randy Gaul, [How to Create a Custom 2D Physics Engine: Oriented Rigid Bodies](https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-oriented-rigid-bodies--gamedev-8032t) (2D, but the clearest intro to angular terms) |

## Phase 5: Collision detection

| | Resource |
|---|---|
| 📖 | Millington ch. 12, *Collision Detection*; ch. 13, *Generating Contacts* |
| 📖 | Ericson, *Real-Time Collision Detection*: ch. 4 (bounding volumes), 5 (primitive tests), 6–7 (BVHs, spatial partitioning), 9 (GJK) |
| 📄 | ★ William Bittle, [SAT (Separating Axis Theorem)](https://dyn4j.org/2010/01/sat/) (moved from codezealot.org) |
| 📄 | ★ William Bittle, [GJK](https://dyn4j.org/2010/04/gjk-gilbert-johnson-keerthi/) · [EPA](https://dyn4j.org/2010/05/epa-expanding-polytope-algorithm/) · [Contact Points Using Clipping](https://dyn4j.org/2011/11/contact-points-using-clipping/) |
| 📄 | Kenneth I. Joy, *Clipping* (UC Davis notes; local PDF: `~/Desktop/Textbooks/JoyKennethClipping-200905-175314.pdf`): §2–4, point-vs-plane tests and Sutherland–Hodgman polygon clipping for contact manifolds |
| 📄 | Newcastle University, Tutorial 4 *Collision Detection* and [Tutorial 6 *Broad phase and Narrow phase*](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/6accelerationstructures/Physics%20-%20Spatial%20Acceleration%20Structures.pdf): BSP, quadtrees, octrees, static vs dynamic objects |
| 📄 | Pierre Vigier, [Quadtree and Collision Detection](https://pvigier.github.io/2019/08/04/quadtree-collision-detection.html): a dynamic quadtree broadphase with pair reporting |
| 🎤 | Erin Catto, [Computing Distance using GJK](https://box2d.org/files/ErinCatto_GJK_GDC2010.pdf) (GDC 2010) |
| 🎤 | Erin Catto, [Dynamic Bounding Volume Hierarchies](https://box2d.org/files/ErinCatto_DynamicBVH_GDC2019.pdf) (GDC 2019): the broadphase most engines use |
| 🎤 | Dirk Gregorius, [The Separating Axis Test between Convex Polyhedra](https://www.gdcvault.com/play/1017646/Physics-for-Game-Programmers-The) (GDC 2013): box–box and hull–hull SAT done properly |
| 🎤 | Dirk Gregorius, [Robust Contact Creation for Physics Simulations](https://www.gdcvault.com/play/1022193/Physics-for-Game-Programmers-Robust) (GDC 2015): contact manifolds |
| 📄 | ★ Raigan Burns & Mare Sheppard, [N Tutorial A: Collision Detection and Response](https://www.metanetsoftware.com/technique/tutorialA.html) (2D SAT, beautifully illustrated) |
| 📄 | Allen Chou, [*Game Physics* series](https://allenchou.net/game-physics-series/): broadphase, GJK, EPA, contact generation |
| 🎥 | Ten Minute Physics: ep. 11 *Finding overlaps among thousands of objects blazing fast* (spatial hashing), ep. 23 *Broad phase collision detection with Sweep and Prune*, ep. 24 *Bounding Volume Hierarchies* |
| 📄 | Gilbert, Johnson & Keerthi, [A Fast Procedure for Computing the Distance between Complex Objects](https://web.eecs.umich.edu/~grizzle/GilbertFest/Gilbert%2858%29.pdf) (1988): the original GJK paper |
| 📄 | Bittner, Hapala & Havran, [Fast Insertion-Based Optimization of BVHs](https://dcgi.fel.cvut.cz/~havran/ARTICLES/bittner2013cgf_preprint.pdf) (2013) · Erin Catto, [Dynamic Tree Improvements](https://box2d.org/posts/2025/03/dynamic-tree-improvements/) (2025): the dynamic AABB tree |
| 🎤 | Erin Catto, [Contact Manifolds](https://box2d.org/files/ErinCatto_ContactManifolds_GDC2007.pdf) (GDC 2007) · Dirk Gregorius, [Implementing QuickHull](https://media.steampowered.com/apps/valve/2014/DirkGregorius_ImplementingQuickHull.pdf) (GDC 2014) |
| 💻 | Box3D `src/dynamic_tree.c`, `src/convex_manifold.c`, `src/distance.c`, `src/hull.c` (see [BOX3D.md](./BOX3D.md)) |

## Phase 6: Collision response and friction

| | Resource |
|---|---|
| 📖 | Millington ch. 14, *Collision Resolution*; ch. 15, *Resting Contacts and Friction* |
| 🎤 | ★ Erin Catto, [Iterative Dynamics with Temporal Coherence](https://box2d.org/files/ErinCatto_IterativeDynamics_GDC2005.pdf) (GDC 2005) |
| 🎤 | Erin Catto, [Fast and Simple Physics using Sequential Impulses](https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf) (GDC 2006): **the** sequential-impulse reference |
| 📄 | Erin Catto, [Solver2D](https://box2d.org/posts/2024/02/solver2d/): compares eight solvers (soft step, PGS, TGS, XPBD…) on the same scenes |
| 📄 | ★ Glenn Fiedler, [Collision Response and Coulomb Friction](https://gafferongames.com/post/collision_response_and_coulomb_friction/) |
| 📄 | Newcastle University, [Tutorial 5 *Collision Response*](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/5collisionresponse/Physics%20-%20Collision%20Response.pdf): projection vs impulse methods |
| 📄 | Allen Chou, [Resolution – Contact Constraints](http://allenchou.net/2013/12/game-physics-resolution-contact-constraints/) · [Stability – Warm Starting](http://allenchou.net/2014/01/game-physics-stability-warm-starting/): the 3D contact Jacobian, Baumgarte, restitution, friction, persistent contacts |
| 📄 | ★ Erik Neumann, [myPhysicsLab: Rigid-body collisions](https://www.myphysicslab.com/engine2D/collision-en.html): the original "Collision Handling Methods" page has moved; see the [site index](https://www.myphysicslab.com/) |
| 📄 | ★ Randy Gaul, [How to Create a Custom 2D Physics Engine: The Basics and Impulse Resolution](https://code.tutsplus.com/how-to-create-a-custom-2d-physics-engine-the-basics-and-impulse-resolution--gamedev-6331t) · [blog](https://randygaul.github.io/) |
| 📄 | ★ Paul Firth, [Physics engines for dummies](https://www.wildbunny.co.uk/blog/2011/04/06/physics-engines-for-dummies/) (the site may block automated access; open it in a browser) |
| 📄 | ★ Helmut Garstenauer, [A Unified Framework for Rigid Body Dynamics](https://web.archive.org/web/20160717002302/http://www.digitalrune.com/Portals/0/Documents/A%20Unified%20Framework%20for%20Rigid%20Body%20Dynamics.pdf) (archived thesis: impulses, constraints, solver details) |
| 💻 | [box2d-lite](https://github.com/erincatto/box2d-lite): about 1,000 lines of C++; the GDC 2006 solver in its smallest form |
| 📄 | Macklin et al., [Small Steps in Physics Simulation](https://mmacklin.com/smallsteps.pdf) (SCA 2019): why substepping beats iterating |
| 📄 | Erin Catto, [Releasing Box2D 3.0](https://box2d.org/posts/2024/08/releasing-box2d-3.0/): Soft Step and speculative contacts as shipped |
| 📄 | NVIDIA, [PhysX 4.0 Rigid Body Dynamics](https://gameworksdocs.nvidia.com/PhysX/4.0/documentation/PhysXGuide/Manual/RigidBodyDynamics.html): PGS vs Temporal Gauss–Seidel |
| 📄 | Paul Firth, [Speculative Contacts, Part 1](https://web.archive.org/web/2011/http://www.wildbunny.co.uk/blog/2011/03/25/speculative-contacts-an-continuous-collision-engine-approach-part-1/) (archived) |
| 📄 | Bender, Erleben & Trinkle, [Interactive Simulation of Rigid Body Dynamics in Computer Graphics](https://perso.liris.cnrs.fr/fzara/Web/media/files/M2-Animation/cgf12272.pdf) (CGF 2014): survey of solvers, friction cones, stabilization |
| 💻 | Box3D `src/solver.c`, `src/solver.h`, `src/contact_solver.c`: the Soft Step solver |

## Phase 7: Joints, sleeping and stability

| | Resource |
|---|---|
| 📖 | Millington ch. 16, *Stability and Optimization*; ch. 17, *Putting It All Together* |
| 🎤 | Erin Catto, [Modeling and Solving Constraints](https://box2d.org/files/ErinCatto_ModelingAndSolvingConstraints_GDC2009.pdf) (GDC 2009): Jacobians, joints |
| 🎤 | Erin Catto, [Understanding Constraints](https://box2d.org/files/ErinCatto_UnderstandingConstraints_GDC2014.pdf) (GDC 2014; [video](https://www.gdcvault.com/play/1020603/Physics-for-Game-Programmers-Understanding)) |
| 🎤 | Erin Catto, [Soft Constraints](https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf) (GDC 2011): frequency and damping-ratio joints |
| 📄 | David Baraff, [Fast Contact Force Computation for Nonpenetrating Rigid Bodies](https://www.cs.cmu.edu/~baraff/papers/sig94.pdf) (SIGGRAPH 1994): the LCP view of contacts, for depth |
| 📄 | Allen Chou, [*Game Physics* series](https://allenchou.net/game-physics-series/): constraints and sequential impulses |
| 🎥 | Allen Chou, [Physics Constraints in Games Part 1 – Constraint Basics](https://www.youtube.com/watch?v=MTVdBgQY9LY) |
| 📄 | Andrew Witkin, [Constrained Dynamics](https://www.cs.cmu.edu/~baraff/pbm/constraints.pdf): the force-level derivation of `J·M⁻¹·Jᵀ·λ` |
| 📄 | myselph.de, [Equality Constraints & Solver](https://web.archive.org/web/20211022100314mp_/http://myselph.de/gamePhysics/equalityConstraints.html) (archived, 2D): a worked joint derivation following Catto GDC 2009 |
| 📄 | Newcastle University, Tutorial 8 *Constraints and Solvers* ([index](https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/)) |
| 📄 | Witkin, Gleicher & Welch, [Interactive Dynamics](https://dl.acm.org/doi/pdf/10.1145/91394.91400) (1990) · Barzel & Barr, [A Modeling System Based on Dynamic Constraints](https://hal.science/hal-01968730/document) (1988): optional history |
| 📄 | Maloisel et al., [A Versatile Quaternion-based Constrained Rigid Body Dynamics](https://la.disneyresearch.com/wp-content/uploads/A_Versatile_Quaternion_based_Constrained_Rigid_Body_Dynamics.pdf) (Disney Research, 2025): research level |
| 🎥 | Ten Minute Physics: ep. 06 *Writing a triple pendulum simulation is simple*, ep. 25 *Joint simulation made simple* |
| 📄 | Erin Catto, [Simulation Islands](https://box2d.org/posts/2023/10/simulation-islands/) (2023): persistent islands, lazy splitting |
| 💻 | Box3D `src/*_joint.c`, `src/island.c`, `src/solver_set.c`, `src/sensor.c` |

## Phase 8: Stretch goals

| | Resource |
|---|---|
| 📖 | Millington ch. 18, *Other Types of Physics* |
| 🎤 | ★ Erin Catto, [Continuous Collision](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf) (GDC 2013; [video](https://www.gdcvault.com/play/1018239/Physics-for-Game-Programmers-Continuous)) |
| 📄 | Erin Catto, [Determinism](https://box2d.org/posts/2024/08/determinism/) (Box2D blog) |
| 📄 | Erin Catto, [SIMD Matters](https://box2d.org/posts/2024/08/simd-matters/) · [SIMD for Collision](https://box2d.org/posts/2026/07/simd-for-collision/) · [Contact Recycling](https://box2d.org/posts/2026/10/contact-recycling/): graph coloring and Box3D's performance work |
| 📄 | Müller et al., [Detailed Rigid Body Simulation with XPBD](https://matthias-research.github.io/pages/publications/PBDBodies.pdf) (2020) |
| 💻 | Box3D [`docs/character.md`](https://github.com/erincatto/box3d/blob/main/docs/character.md) and `src/mover.c` (character mover); `src/constraint_graph.c`; `src/recording.c`, `src/replay.c` |
| 📄 | Müller et al., [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf) |
| 📄 | Chen, Hsu, Liu, Macklin, Yang & Yuksel, [Offset Geometric Contact](https://graphics.cs.utah.edu/research/projects/ogc/Offset_Geometric_Contact-SIGGRAPH2025.pdf) (SIGGRAPH 2025): penetration-free contact for cloth and deformables |
| 📄 | Harry Smith, [*Aircraft Flight Mechanics*](https://aircraftflightmechanics.com/) · [Airfoil Tools](http://airfoiltools.com/): drag models, stability derivatives, real airfoil data |
| 📄 | ★ Mark Bayazit, convex polygon decomposition (linked from brm.io; the original page is gone, so search for "Bayazit decomposition"): for splitting concave shapes into convex pieces |
| 🌐 | MDN: [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) · [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) (requires cross-origin isolation headers) |

---

## Track S: simulation core

| | Resource | Use it for |
|---|---|---|
| 📖 | Press, Teukolsky, Vetterling & Flannery, *Numerical Recipes* (3rd ed.) | S1: Runge–Kutta, adaptive step-size control, dense output, stiff systems (ch. 17). S4: relaxation and multigrid (ch. 20). |
| 📖 | Hairer, Nørsett & Wanner, *Solving Ordinary Differential Equations I* | S1: the reference for embedded pairs, step-size control and dense output. |
| 📖 | Hairer, Lubich & Wanner, *Geometric Numerical Integration* | S1–S2: symplectic methods, why energy error stays bounded, Kepler and rigid-body test problems. |
| 📄 | H. Yoshida, "Construction of higher order symplectic integrators", *Phys. Lett. A* 150 (1990) | S1: the fourth-order composition of Verlet. |
| 📖 | J. R. Taylor, *Classical Mechanics* | S2: the problem source. Lagrange's equations (ch. 7), central forces (ch. 8), rigid bodies (ch. 10), coupled oscillators (ch. 11), chaos (ch. 12), Hamiltonian mechanics (ch. 13). |
| 📄 | Baydin, Pearlmutter, Radul & Siskind, "Automatic Differentiation in Machine Learning: a Survey", *JMLR* 18 (2018) | S2: forward-mode AD and dual numbers. |
| 📄 | J. A. Fike & J. J. Alonso, "The Development of Hyper-Dual Numbers for Exact Second-Derivative Calculations" (AIAA 2011) | S2: exact second derivatives for the mass matrix. |
| 📖 | D. J. Griffiths, *Introduction to Electrodynamics* | S3–S5: the problem source. Electrostatics (ch. 2), potentials and images (ch. 3), magnetostatics (ch. 5), waves (ch. 9), retarded fields (ch. 10), radiation (ch. 11). |
| 📖 | E. M. Purcell & D. J. Morin, *Electricity and Magnetism* (3rd ed.) | S5: the kinked-field-line picture of radiation from an accelerated charge. |
| 📄 | H. Qin et al., "Why is Boris algorithm so good?", *Phys. Plasmas* 20 (2013) | S3: the Boris pusher's conservation properties. |
| 📖 | C. K. Birdsall & A. B. Langdon, *Plasma Physics via Computer Simulation* | S3: the Boris mover in its original context. |
| 📄 | B. Jobard & W. Lefer, "Creating Evenly-Spaced Streamlines of Arbitrary Density" (1997) | S3: seeding field lines in a plane. |
| 📄 | W. Lorensen & H. Cline, "Marching Cubes" (SIGGRAPH 1987) · Paul Bourke, "Polygonising a scalar field" | S3: isosurfaces for equipotentials. |
| 📖 | W. Briggs, V. E. Henson & S. McCormick, *A Multigrid Tutorial* (2nd ed.) | S4: relaxation, smoothing and the V-cycle. |
| 📖 | A. Taflove & S. Hagness, *Computational Electrodynamics: The FDTD Method* | S5: the Yee algorithm, numerical dispersion, PML. |
| 📖 | J. B. Schneider, *Understanding the FDTD Method* (free online) | S5: a code-first introduction to FDTD. |
| 🌐 | [WebGPU Fundamentals](https://webgpufundamentals.org/) | S6: compute shaders, storage buffers, WGSL. |
| 📄 | NVIDIA, *GPU Gems 3*, "Fast N-Body Simulation with CUDA" | S6: tiled N-body; the tiling maps onto WGSL workgroup memory. |

---

## Track V: visualization library

| | Resource | Use it for |
|---|---|---|
| 💻 | [GlowScript / VPython](https://www.glowscript.org/) | The bar for brevity: a simulation in ten lines. |
| 💻 | [myPhysicsLab](https://www.myphysicslab.com/) (open source) | How a mature educational simulator separates model, view, graphs and controls. |
| 🌐 | [PhET Interactive Simulations](https://phet.colorado.edu/) | What makes a teaching simulation clear; PhET publishes its design research. |
| 💻 | [Falstad applets](https://www.falstad.com/) | EM fields, waves and circuits in the browser; good reference visuals. |
| 📄 | K. Moreland, "Diverging Color Maps for Scientific Visualization" (2009) | Colormaps for signed quantities like potential. |
| 🌐 | [Three.js manual](https://threejs.org/manual/) | Instancing, `BufferGeometry` and `WebGPURenderer`, for drawing many arrows and lines. |

---

## Reference engines (read, don't copy)

| | Engine | Why read it |
|---|---|---|
| 💻 | [cannon-es](https://github.com/pmndrs/cannon-es) | 3D, JavaScript, small and readable; the closest relative to Aether |
| 💻 | [matter-js](https://github.com/liabru/matter-js) (cloned at `~/Code/matter-js`) | 2D, JavaScript, by the brm.io author; clean pipeline structure |
| 💻 | [box2d-lite](https://github.com/erincatto/box2d-lite) | The minimal sequential-impulse solver |
| 💻 | [Box3D](https://github.com/erincatto/box3d) | Catto's 3D engine (C17, MIT, 2026): Soft Step solver, hull SAT, dynamic trees, persistent islands. The second reference after Millington; see [BOX3D.md](./BOX3D.md) |
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
