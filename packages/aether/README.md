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

Contact generators find contacts after each step, and the world resolves them:

```ts
import { GroundContacts, ParticleCable } from 'aether-physics';

// Bounce off the plane y = 0 with restitution 0.5, then come to rest on it.
world.contactGenerators.push(new GroundContacts(world.particles, 0, 0.5));

// Tie the ball to a fixed hook: slack within 4 m, taut past it.
const hook = new Particle();
hook.inverseMass = 0;
hook.position.set(0, 12, 0);
world.contactGenerators.push(new ParticleCable(hook, ball, 4));
```

The package has the math library, a fixed-timestep loop, particles, force generators and particle contacts. The API can change in any 0.x release.

## License

MIT
