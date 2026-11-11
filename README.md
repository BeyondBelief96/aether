# Aether

A 3D rigid-body physics engine written from scratch in TypeScript, with a browser demo app built on Lit and Three.js.

This is a learning project. The engine is built in phases, following Ian Millington's *Game Physics Engine Development*, Erin Catto's solver talks, and the resources collected at [brm.io/game-physics-for-beginners](https://brm.io/game-physics-for-beginners/).

- **[docs/PLAN.md](docs/PLAN.md):** the build plan, with goals, checklists, tests and demos for each phase
- **[docs/RESOURCES.md](docs/RESOURCES.md):** books, articles, talks and reference engines for each phase
- **[docs/DEMOS.md](docs/DEMOS.md):** how to build a demo: the demo contract, parameters, readouts and charts, and using the engine from Three.js

**[Try the demos](https://beyondbelief96.github.io/aether/)**. Each push to `main` deploys them to GitHub Pages.

## Using the package

```sh
npm install aether-physics
```

```ts
import { Quaternion, Vec3 } from 'aether-physics';

const q = new Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
q.rotateVec3({ x: 1, y: 0, z: 0 }, new Vec3()); // about (0, 0, -1)
```

Point masses move under forces in a fixed-timestep world:

```ts
import { Particle, ParticleWorld } from 'aether-physics';

const ball = new Particle();
ball.position.set(0, 10, 0);
ball.velocity.set(3, 4, 0);

const world = new ParticleWorld(); // gravity defaults to (0, -9.81, 0)
world.particles.push(ball);
for (let i = 0; i < 60; i++) world.step(1 / 60); // one simulated second
```

The package has the math library, a fixed-timestep loop, particles and force generators. The API can change in any 0.x release. See the [engine API guide](packages/aether/src/engine/README.md) and the [math API guide](packages/aether/src/math/README.md).

## Running it

The repository is an npm workspaces monorepo: the engine package in `packages/aether`, the demo app in `apps/editor`, and the website (landing page, demos at `/demos`, docs at `/docs`) in `apps/site`.

```sh
npm install
npm run dev        # the website at http://localhost:4321 (landing, /demos, /docs)
npm run dev:editor # the demo app on its own at http://localhost:5173
npm test           # Vitest in watch mode, every workspace
npm run test:run   # Vitest once
npm run typecheck  # tsc in every workspace
npm run build      # typecheck, then production build of the website to apps/site/dist/
npm run build:editor # production build of the demo app alone to apps/editor/dist/
npm run test:smoke # load the built demo app in Chrome (run npm run build:editor first)
npm run build:lib  # build the npm package to packages/aether/dist/
```

In the demo app: **Space** pauses, **.** steps once while paused, **R** resets, **1–9** pick a demo's presets. **Smooth** in the transport turns interpolation between physics steps on and off. Every parameter change is written to the URL, so a link reproduces what you see.

## Layout

```
packages/
  aether/             the npm package, aether-physics
    src/
      math/           Vec3, Mat3, Mat4, Quat
      engine/         game loop, Particle, ParticleWorld
      forces/         force generators
apps/
  editor/             the demo app, which uses the engine only through "aether-physics"
    src/
      core/           demo contract, parameter schema, URL routes, session (no UI)
      stage/          Three.js renderer, camera and theme palette
      demos/          one file per demo, by category (the only engine + Three.js code)
      ui/             Lit components (aether-editor is the app; aether-scene runs one demo bare)
  site/               the website (Astro): landing page, the demo app at /demos, docs at /docs
    src/content/docs/ documentation pages, in Markdown
docs/                 build plan, demo guide, notes
```

## Rules

- The engine never imports `three` or touches the DOM; its tsconfig has no DOM types. Demos are the bridge.
- Physics runs on a fixed timestep; rendering interpolates between steps.
- A demo describes its parameters as data and never builds UI. See [docs/DEMOS.md](docs/DEMOS.md).
- TypeScript runs with `erasableSyntaxOnly`: no `enum`, `namespace` or parameter properties.
- Lit components use `static properties` with `declare` fields and `customElements.define`, never decorators.

## License

[MIT](LICENSE)
