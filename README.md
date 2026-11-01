# Aether

A 3D rigid-body physics engine written from scratch in TypeScript, with a browser playground built on Lit and Three.js.

This is a learning project. The engine is built in phases, from vectors to stacking boxes to ragdolls, following Ian Millington's *Game Physics Engine Development*, Erin Catto's solver talks, and the resources collected at [brm.io/game-physics-for-beginners](https://brm.io/game-physics-for-beginners/).

- **[docs/PLAN.md](docs/PLAN.md):** the phased build plan, with goals, checklists, tests and demos for each phase
- **[docs/RESOURCES.md](docs/RESOURCES.md):** books, articles, talks and reference engines for each phase
- **[docs/DEMOS.md](docs/DEMOS.md):** how to build a demo: templates, using the engine from Three.js, demo controls and UI style

## Running it

```sh
npm install
npm run dev        # playground at http://localhost:5173
npm test           # Vitest in watch mode
npm run test:run   # Vitest once
npm run typecheck  # tsc, no emit
npm run build      # typecheck, then production build to dist/
```

Keyboard: **Space** pauses, **.** steps once while paused, **R** resets the demo.

## Layout

```
src/
  math/         Vec3, Mat3, Mat4, Quat                     Phase 1
  engine/       game loop, Particle, RigidBody, World      Phases 0, 2, 4, 7
  forces/       force generators                           Phases 3, 4
  collision/    shapes, broadphase, narrowphase            Phase 5
  constraints/  contact solver, joints                     Phases 6, 7
  demos/        one file per demo (the only engine + Three.js code)
  ui/           Lit components
```

## Rules

- The engine (`math`, `engine`, `forces`, `collision`, `constraints`) never imports `three` or touches the DOM. Demos are the bridge.
- Physics runs on a fixed timestep; rendering interpolates between steps.
- TypeScript runs with `erasableSyntaxOnly`: no `enum`, `namespace` or parameter properties.
- Lit components use `static properties` with `declare` fields and `customElements.define`, never decorators.

## Progress

| Phase | Topic | Status |
|---|---|---|
| 0 | Scaffold and game loop | ✅ |
| 1 | Math library | |
| 2 | Particles and integration | |
| 3 | Forces, springs and mass aggregates | |
| 4 | Rigid bodies | |
| 5 | Collision detection | |
| 6 | Collision response and friction | |
| 7 | Joints, sleeping and stability | |
| 8 | Stretch goals | |
