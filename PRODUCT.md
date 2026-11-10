# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Developers evaluating or using `aether-physics`** (primary): people deciding whether to adopt the npm package, or already using it, who want to see what the engine does and how to call it from their own code.
- **Public visitors** (primary): anyone browsing the hosted playground or, later, the engine's website, exploring the demos as a showcase.
- **The author** (secondary): builds each phase and uses the playground to check that the engine behaves as intended.

Usage is desktop-first. Phones must work, but do not need full parity with desktop.

## Product Purpose

Aether is a 3D rigid-body physics engine written from scratch in TypeScript and published on npm as `aether-physics`. The playground is a browser app that runs the engine in interactive demos.

A demo succeeds when a visitor can:

- **play with it:** drag objects, move sliders and watch the result change live;
- **understand the physics:** see why an integrator gains or loses energy, why a stiff spring explodes, and what gimbal lock looks like;
- **learn the API:** see how the engine is used, so they can do the same in their own code.

The end goal is a website for the engine that presents it, hosts every playground demo and carries the full documentation.

## Positioning

- Written from scratch in plain TypeScript, with no physics dependency underneath.
- The engine never imports a renderer or touches the DOM. Public methods accept `Vec3Like` / `QuatLike`, so a `THREE.Vector3` can be passed in directly, and the engine can run in Node or a Web Worker.
- Physics runs on a fixed timestep, and rendering interpolates between steps.
- Every demo shows the numbers that prove the physics is right: energy ratios, total momentum, `ω·dt`, quaternion norms.

## Operating Context

- The playground is deployed to GitHub Pages on every push to `main` (https://beyondbelief96.github.io/aether/).
- It is built with Lit web components and Three.js and runs in the browser with Vite.
- Demos are numbered by phase. Each phase adds engine features and at least one demo.
- Keyboard: Space pauses, `.` steps once while paused, R resets the demo.

## Capabilities and Constraints

- Current package scope (0.x): the math library (Vec3, Mat3, Mat4, Quaternion), a fixed-timestep loop, particles, a particle world, and force generators (gravity, drag, springs, anchored springs, bungees). Rigid bodies, collisions, contacts and joints come in later phases. The API can change in any 0.x release.
- Current demos: Timestep (Phase 0), Rotation gizmo (Phase 1), Ballistics and Integrator shoot-out (Phase 2), Springs (Phase 3).
- Terminology: "demo", "phase", "panel" (a demo's controls), "readout" (a computed value shown in a panel), "physics rate" (Hz), "time scale".
- Axis colours are fixed: X is red, Y is green, Z is blue, everywhere in the UI and the 3D view.
- **Undecided:** the structure, domain and hosting of the future engine website; whether the playground stays a standalone app or becomes part of that site; whether the public framing keeps the "learning project" description the README uses today.

## Brand Commitments

- Name: **Aether**. Package name: `aether-physics`.
- Current tagline in the app: "A 3D physics engine, from scratch."
- License: MIT.

## Evidence on Hand

- The live playground and its five demos.
- Unit tests for the engine and the playground's helpers (Vitest), plus a browser smoke test that loads every demo.
- API guides in `src/engine/README.md` and `src/math/README.md`, and the build plan in `docs/PLAN.md`.
- None yet: users, testimonials, benchmarks, performance comparisons with other engines, or download figures. Future work must not invent them.

## Product Principles

1. **Interactive first.** Every concept can be pushed and pulled live, not just watched.
2. **Show the proof.** A demo shows the numbers that prove it right, with units and a fixed precision, next to the motion they describe.
3. **The engine is the product.** Demos show how `aether-physics` is used, and nothing in them depends on playground-only tricks.
4. **Honest scope.** Present what the engine does today. Unbuilt phases are labelled as unbuilt.
5. **Desktop-first, phone-safe.** Optimise for desktop exploration, and never break on a phone.

## Accessibility & Inclusion

- Keyboard reachable, with visible focus on every control. Every input has a visible label or an `aria-label`.
- Light and dark themes follow the system setting.
- Colour is never the only carrier of meaning. Axis colours also have X/Y/Z labels.
- No formal WCAG conformance level is committed yet. Text contrast is held to 4.5:1 in practice.
