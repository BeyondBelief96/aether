# Build log

What was actually built for each step of [PLAN.md](./PLAN.md), and where it departed from the plan. The plan says what to learn and decide next; this file records what exists and why it ended up that shape. Add an entry in the same change as the work. Paths are where files lived when the step was built; the engine now lives under `packages/aether/src/` and the demos under `apps/editor/src/demos/`.

---

## Phase 0: Scaffold and game loop

- Vite, TypeScript (strict, `erasableSyntaxOnly`), Vitest.
- `FixedStepLoop` (`src/engine/loop.ts`, now `loop/loop.ts`): accumulator, `alpha`, frame-time clamp, max steps per frame, pause, single step, time scale.
- Lit shell: `aether-app` owns the loop, `aether-viewport` the Three.js renderer, camera and orbit controls, `aether-sidebar` the controls and stats.
- `Demo` interface (`mount` / `step` / `sync` / `unmount`) and a demo registry.
- Keyboard: Space pauses, `.` steps, R resets. Light and dark themes from CSS custom properties.
- Library entry point `src/index.ts`, and `Vec3Like` in `src/math/types.ts`.
- Tests: `loop.test.ts` covers step counting, leftover alpha, the frame clamp, dropped time, pause, single step and time scale.
- The *Fixed timestep* demo (two orbiting balls, one interpolated) was retired: every demo now has a Smooth switch that turns interpolation off.

## Phase 1: Math library

- `math/scalar.ts`: `EPSILON`, `approxEqual`, `clamp`.
- `math/geometry/`: `Vec3`, `Mat3x3`, `Mat3x4` (3×4 affine), `Quaternion`; `QuatLike` in `types.ts`.
- Custom Vitest matchers `toBeCloseToVec3`, `toBeCloseToQuat`; property-based tests with `fast-check`.
- API decision, recorded in `src/math/README.md`: methods write into `this` and return `this` for chaining, `clone()` for copies, `x`/`y`/`z` as plain public fields so V8 can optimise them. `Mat3x3` is stored row-major and transforms column vectors (`M · v`).
- Deferred to first use: `Mat3x3.setInertiaTensorCoeffs` (Phase 4), `Mat3x3.setSkewSymmetric` and `Mat3x3.add` (Phase 7).
- Demo: *Rotation* (`demos/rigid-bodies/rotation.ts`).

## Phase 2: Particles and integration

- `Particle` and `ParticleWorld`, exported from the package entry point; API decisions recorded in `src/engine/README.md`.
- Gravity moved from a per-particle `acceleration` to `ParticleWorld.gravity`, added by `step` as the force `gravity · gravityScale · mass`, so `Particle` knows nothing about gravity.
- `setMass` and `integrate` throw `RangeError` on invalid input. A particle with `inverseMass = 0` ignores its own velocity too.
- The first integrator shoot-out used four oscillator-only integrators in a demo helper; it was removed when the integrator seam landed.
- Demos: *Ballistics*, and *Fireworks* (not in the original plan).

### Follow-up: the integrator seam

- `particles/integrators/`: `ParticleIntegrator` and `ForceEvaluator`; `SemiImplicitEuler` (the default, moved out of `Particle.integrate`), `ExplicitEuler`, `VelocityVerlet`, `Rk4`.
- `ParticleWorld.integrator`, replaceable between steps. `Particle.integrate` delegates to `SemiImplicitEuler`.
- Each integrator declares `evaluationsPerStep`. When it is more than 1, forces added with `addForce` before `step` are saved and restored on every evaluation, so they act as constant forces through every stage. Single-evaluation integrators skip the copy.
- Damping is applied once per step, after the integrator's update, for every integrator.
- Demo app: an Integrator select in the transport strip that applies to every demo's worlds (`apps/editor/src/core/integrators.ts`), and the *Integrators* demo (the same spring or orbit in four lanes, with an energy chart, force evaluations and step times).

## Phase 3: Forces, springs and mass aggregates

### Step 1: Force generators and the registry

- `ParticleForceGenerator`, `ParticleForceRegistry` (a `Map<Particle, ParticleForceGenerator[]>`), `ParticleGravity`.
- `ParticleWorld.step` runs the registry, then integrates. `ParticleWorld.remove` drops a particle and every generator registered on it.
- Generators run grouped by particle in a fixed order, so runs repeat exactly.

### Step 2: Drag

- `ParticleDrag(k1, k2)`: `k1·|v| + k2·|v|²` opposing `v`, exactly zero at rest.

### Step 3: Springs

- `ParticleSpring`, `ParticleAnchoredSpring` (copies its anchor; the anchor is mutable for dragging), `ParticleBungee`.
- A spring pushes only the particle it is registered on, so a spring between two moving particles is registered once on each end. Whoever removes a connected particle also removes the springs pointing at it.
- Demos: *Springs*, *Cloth* (no tearing yet), *Drumhead*, *Elastic pendulum*.

### Step 4: Buoyancy

- `ParticleBuoyancy(maxDepth, volume, waterHeight, liquidDensity = 1000, gravity = 9.81)`, positional arguments; throws `RangeError` on a non-positive `maxDepth`, non-finite `waterHeight` or any negative value.
- Layered liquids need nothing new: one generator per surface, using the density difference at each lower surface.
- Demo: *Raft*. *Buoyancy* and *Density column* were built, then cut as too close to *Raft*.

### Also built: attraction

- `ParticleAttraction(source, strength, softening = 0)`: `m · strength · r / (|r|² + ε²)^(3/2)`. Came out of the *Orbits* demo.

### Step 5: A single contact

- `ParticleContact`: velocity resolution, then position, with the resting-contact correction.
- `Particle.lastAcceleration`, recorded by `ParticleWorld.step` from the integrator's last force evaluation just before it clears the accumulators. For the Euler integrators that is the acceleration the step applied; for velocity Verlet and RK4 it is the acceleration at or near the end of the step.
- Contacts name their particles `particleA` / `particleB`, are pooled and filled with `set()`.

### Step 6: Generators, the resolver and the ground

- `ParticleContactGenerator` (`addContacts(out, start)` returns how many it wrote), `ParticleContactResolver` (worst first), `GroundContacts`.
- `ParticleWorld.step` became forces → integrate → generate → resolve, over a preallocated pool. `ParticleWorldOptions.maxContacts` defaults to 256; `contacts`, `contactCount` and `contactResolver` are readable, and the resolver is replaceable between steps.
- The resolver measures each particle's movement from its position before and after `resolve`, adjusts the penetration of every other contact sharing a moved particle, and zeroes the resolved contact's own penetration so rounding never leaves it selectable.
- It skips contacts whose particles are all immovable, treats closing speeds and penetrations under 1e-9 as resolved, and stops once nothing qualifies.
- `new ParticleContactResolver()` without `iterations` uses twice the contact count per call. Its read-only `iterations`, `iterationsUsed` and `iterationLimit` are read from the instance; the demos' `ResolverBudget` keeps the resolver it installs.
- `GroundContacts` reads its particle array on each call, skips immovable particles, and defaults restitution to 0.2.
- Known limit: contacts are found once per step. Resolving one can push a particle into something it had no contact with when the step began. A stack of spheres sinks and boils; *Break* stays in one layer for this reason. Two resting spheres that fall the same distance stay exactly touching, so a generator that reports only overlaps misses their contact every other step; the demos' sphere generator counts pairs within 0.1 mm as touching.
- Demos: *Bounce*, *Break*.

### Step 7: Cables, rods and the bridge

- `ParticleCable`, `ParticleRod`, both extending `ParticleLink` (`particles/contacts/link.ts`, not exported yet). The base owns `addContacts`; each subclass supplies `deviation(length)` and `restitution`. The base skips a full pool, coincident particles and NaN.
- A link's contact normal is the direction `particleA` is pushed, so `ParticleContact.normal` is documented that way rather than "from B toward A".
- Constructors throw `RangeError` for the same particle at both ends, a non-positive or non-finite length, or a cable restitution outside [0, 1]. `maxLength`, `restitution` and `length` are public and mutable.
- What the bridge showed: a hanging chain is the worst case for worst-first resolution. With 8 sections (about 23 contacts) the default budget lets cables stretch by up to 0.4 m and the deck hang about a metre deeper under a 60 kg load, and it never settles. 2,000 iterations per step holds every cable within about a millimetre. The demo substeps to at most 1/60 s.
- Demos: *Bridge*, *Pendulums* (rod vs cable kicked at the same speed), *Frames* (rod-only tetrahedron, prism and cube).
