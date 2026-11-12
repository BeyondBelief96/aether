# aether-physics

A 3D rigid-body physics engine written from scratch in TypeScript. No dependencies; it never touches the DOM, so it runs in the browser, in Node and in Web Workers.

**[Live demos](https://beyondbelief96.github.io/aether/)** · [Repository](https://github.com/BeyondBelief96/aether)

## Usage

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

The package has the math library, a fixed-timestep loop, particles and force generators. The API can change in any 0.x release.

## License

MIT
