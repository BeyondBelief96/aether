# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Developers deciding whether to use `aether-physics`** (primary): they arrive from the website, npm or GitHub, open the demos to judge what the engine can do, and either clone the repository or install the package.
- **Developers who cloned the repository** (primary): they run the demo app locally to explore the engine, tweak its parameters, and read how each demo drives the engine.
- **Public visitors** (secondary): anyone browsing the hosted demos as a showcase.

Usage is desktop-first. Phones must work, but do not need full parity with desktop.

## Product Purpose

Aether is a web-first 3D rigid-body physics engine written from scratch for TypeScript and published on npm as `aether-physics`. It is built in phases (`docs/PLAN.md`): math, particles and forces ship today; rigid bodies, collision detection, contact solving with friction and stacking, joints with ragdolls and vehicles, sleeping, and running in a Web Worker are the roadmap.

The demo app (called "the editor" in planning) is the browser app that runs the engine in a gallery of showcase demos. Its job is to show off the engine: creative, interesting scenes that make its capabilities and possibilities obvious, with the engine's parameters exposed so people can tweak them live.

The demo app succeeds when a visitor:

- is impressed by what the engine does and wants to use it;
- can change the parameters that matter and see the scene respond immediately;
- can find the demo's code and see that it is ordinary use of the public API.

The website (`apps/site`, Astro) carries the landing page at `/`, the demo app at `/demos`, and documentation at `/docs`. It will be hosted on Railway; until then it deploys to GitHub Pages. The landing page presents Aether as what it is today: a 3D physics engine for TypeScript, shown running. Public surfaces (website, demo app, docs, npm description) show only what exists. They carry no roadmap, no outlines of future work and no "coming next"; features appear when they ship. The roadmap lives in `docs/PLAN.md` only; the README has none either.

**Aether Lab** is a second, planned product from the same repository: a simulation and visualization library for the systems in a physics course (pendulums, orbits, fields, waves), accurate to a stated tolerance, for students and teachers. It shares the engine's math library and the Three.js layer (`aether-viz`), and nothing else. It is built after the engine's Phase 7 (`docs/PLAN.md`, Tracks S and V). Public surfaces don't mention it until it ships; it then gets its own front page at `/lab`. Engine copy stays engine-focused and does not describe Lab capabilities.

## Positioning

- Written from scratch in plain TypeScript, with no physics dependency underneath.
- The engine never imports a renderer or touches the DOM. Public methods accept `Vec3Like` / `QuatLike`, so a `THREE.Vector3` can be passed in directly, and the engine can run in Node or a Web Worker.
- Physics runs on a fixed timestep, and rendering interpolates between steps.
- Demos use only the public API, so every demo doubles as an example of real usage.

## Operating Context

- Repository: npm workspaces monorepo. `packages/aether` is the npm package, `apps/editor` is the demo app (also runnable on its own), `apps/site` is the website that mounts the demo app.
- The demo app is built with Lit web components and Three.js and runs with Vite. It is deployed to GitHub Pages on every push to `main`.
- Keyboard: Space pauses, `.` steps once while paused, R resets the demo.

## Capabilities and Constraints

- Current package scope (0.x): the math library (Vec3, Mat3, Mat4, Quaternion), a fixed-timestep loop, particles, a particle world, and force generators (gravity, drag, springs, anchored springs, bungees, buoyancy). Rigid bodies, collisions, contacts and joints come later. The API can change in any 0.x release.
- Demos are grouped by what they simulate: Particles, Soft bodies, Fluids and Rigid bodies. A category is added when its first demo ships. Planned demos and build phases are not shown anywhere public.
- Demos exist to show the engine off. A demo that only teaches a concept and does not exercise the engine is cut (the fixed-timestep and integrator demos were; interpolation is a setting instead).
- Documentation pages are stubs until the API settles.
- Demos are authored in code. A user-facing scene builder is not in scope.
- Terminology: "demo", "category", "parameter" (a tweakable value), "readout" (a computed value), "physics rate" (Hz), "time scale".
- Axis colours are fixed: X is red, Y is green, Z is blue, everywhere in the UI and the 3D view.
- **Undecided:** the website's domain and stack; whether the demo app is embedded in the site or linked from it.

## Brand Commitments

- Name: **Aether**. Package name: `aether-physics`.
- License: MIT.
- Public framing is a serious engine to adopt, not a learning project. Public surfaces do not mention study plans or textbooks.
- Voice: minimal, with a little warmth. Short lines that say what is on screen or what to try; no hype and no textbook tone.

## Evidence on Hand

- The demos: Cloth, Springs, Buoyancy, Orbits, Fireworks, Ballistics, Rotation.
- Unit tests for the engine and the demo app's helpers (Vitest), plus a browser smoke test that loads every demo.
- API guides in the engine and math READMEs.
- None yet: users, testimonials, benchmarks, performance comparisons with other engines, or download figures. Future work must not invent them.

## Product Principles

1. **Show, then let them touch.** A demo should be striking on load with no input, and every parameter that matters is one control away.
2. **The engine is the product.** Demos use only the public API; nothing depends on demo-app-only tricks.
3. **Only what exists.** Present what the engine does today. Unbuilt capabilities are not shown, listed, outlined or implied; they appear when they ship.
4. **Numbers on demand.** Readouts and charts stay available for people who want proof, but they never crowd the scene.
5. **Desktop-first, phone-safe.**

## Accessibility & Inclusion

- Keyboard reachable, with visible focus on every control. Every input has a visible label or an `aria-label`.
- Light and dark themes follow the system setting.
- Colour is never the only carrier of meaning. Axis colours also have X/Y/Z labels.
- Respect `prefers-reduced-motion` for UI motion (the simulation itself is the content and keeps running).
