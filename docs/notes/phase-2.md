# Phase 2: particles and integration

Drafted from the final work session. The section at the end is personal, so it's left for you to fill in.

## What got built

- `Particle`, `ParticleWorld`, and four integrators (`explicitEuler`, `semiImplicitEuler`, `velocityVerlet`, `rk4`) behind one `Integrator` type.
- Tests that measure the claims rather than state them: each integrator's order of accuracy, its energy over 10,000 steps, and its stability limit.
- The ballistics demo: four presets, trails, velocity arrows, and a dashed no-damping reference path.
- The integrator shoot-out: four oscillators, exact-solution ghosts, a live energy graph, and both damping models.
- Reusable UI: `<aether-line-chart>`, `RingBuffer`, `<aether-segmented>`, `Polyline`, `formatCompact` and `view.setCamera`.
- An engine API guide in `src/engine/README.md`, and smoke-test coverage for both demos.

## Decisions

- **Immovable means immovable.** `inverseMass = 0` skips the update entirely, so a stray `velocity` on a static particle doesn't move it. The accumulator is still cleared.
- **Invalid input throws.** `setMass` rejects non-positive masses, and `integrate` rejects non-positive `dt`. This follows `FixedStepLoop.hz`. A negative `dt` would turn damping into energy gain.
- **Verlet estimates the new velocity.** The plan's rule evaluates `a(x')` only. Passing `v + a·dt` as well keeps the method second order on damped systems and changes nothing when `a` ignores velocity. A test measures the order on both kinds of system.
- **`ParticleWorld` stays thin.** No `add` or `remove`: `particles` is a public array. Add methods when something needs to happen on insertion, such as registering with a broadphase.
- **Damping isn't validated.** It's a plain field that a demo might set every frame. The README documents the valid range.
- **Demos can set the camera.** Ballistics needs to see 200 m, so `DemoView` gained `setCamera`, and the app resets the camera before each `mount`. Older demos are unchanged.
- **The graph samples by time, not by step.** It records 30 samples per simulated second whatever the physics rate, so its width always means 20 s. At 5 Hz, one step produces several identical samples, which is why the line looks like stairs.
- **Choosing an integrator highlights it.** The plan's segmented control is for choosing the integrator, but all four always run, since comparing them is the point. Choosing one highlights it in the graph and viewport.

## Bugs and how they were found

**Failing tests before any work started.** `properties.test.ts` couldn't find `fast-check`, and `tsc` reported 36 errors in the same file. `node_modules` predated that dependency, so the code was fine and `npm ci` fixed it.

**A property named `focus`.** It shadowed `HTMLElement.focus()`, which `tsc` caught as an incompatible override. It's now `focused`. Lit properties share a namespace with the DOM, so check the name when a panel property is a common word.

**A speckled ball.** A screenshot of the shoot-out showed black flecks on the RK4 bob. RK4 tracks the exact solution so closely that its bob and ghost occupied the same space, and they were z-fighting. The ghost is now 25% larger, which also makes it read as a halo.

**Cameras that looked fine on paper.** The first shoot-out camera cut off the anchors, and a side-on ballistics camera lost the muzzle and every short shot. The fireball was invisible. Both came from screenshots: no test would have caught them. The final ballistics camera looks down the range from behind the muzzle, where perspective fits both 10 m and 200 m.

**Test problems that looked like app bugs.** Neither of these was a fault in the demos:

- The smoke test's "Fire" locator also matched "Fireball" and "Auto-fire", because Playwright's text match is a case-insensitive substring. It now asks for the exact button name.
- R seemed not to reset the shoot-out. The script had just clicked a button, and `aether-app` ignores shortcuts while a button has focus. With nothing focused, R works.

## Known limits

- **Shortcuts stop working after clicking a panel button.** This is the behavior noted above, from Phase 0. Only Space needs to be held back for a focused button, so R and `.` could keep working. These demos have more buttons, which makes it easier to hit.
- **Range isn't clipped at 200 m.** A laser shot reports about 201 m, because it ends on the first step past the limit. Only ground hits are measured at the crossing point.

## Questions from the walkthrough

1. **Why do games default to semi-implicit Euler?** It costs the same as explicit Euler, one force evaluation per step, but its energy stays bounded while `ω·dt < 2`. Moving the position with the new velocity is the only change. RK4 is far more accurate, but needs four force evaluations, which is expensive and doesn't fit a force accumulator.
2. **Why does explicit Euler gain energy at every step size?** For a spring, each step multiplies energy by `1 + (ω·dt)²`, which is always above 1. A smaller `dt` slows the growth but never stops it. The tests check this at three step sizes.
3. **Why is RK4 more accurate than Verlet, but "worse" over a long run?** RK4's error per step is far smaller, but it always removes energy, so an oscillator slowly dies. Verlet's energy error is larger but doesn't accumulate. It oscillates around the true value indefinitely.
4. **Why does mass make no difference in the ballistics demo?** Only forces are divided by mass, and the presets use `acceleration`, which is applied directly. That's why gravity is an acceleration: every object falls at the same rate.
5. **Why does `damping^dt` give the same decay at any rate?** `n` steps of length `1/n` multiply velocity by `(damping^(1/n))^n = damping`. A plain `v *= 0.99` per step depends on how many steps run per second.
6. **Why does `1/(1+c·dt)` drift at low physics rates?** It only approximates `e^(−c·dt)`, and the two agree when `c·dt` is small. At `c = 2` and 5 Hz, it keeps 18.6% per second rather than 13.5%. In exchange it's cheaper, and it can't overshoot at any `dt`.

## What you read

<!-- Which parts of Millington, Fiedler, Witkin & Baraff and the other Phase 2 resources did you get through? -->
