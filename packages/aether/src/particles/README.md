# particles

The particle system: point masses, the world that steps them, and their force generators. Pure TypeScript, with no `three` imports and no DOM access.

| Export | Purpose |
|---|---|
| `Particle` | Point mass integrated with semi-implicit Euler |
| `ParticleWorld` | Collection of particles stepped together |

Force generators live in [`forces/`](forces/README.md). The clock is `FixedStepLoop` in [`loop/`](../loop/README.md).

All quantities are SI: meters, seconds, kilograms, newtons.

## Simulating particles

```ts
import { FixedStepLoop, Particle, ParticleWorld } from 'aether-physics';

const ball = new Particle();
ball.setMass(2);
ball.damping = 0.99;
ball.position.set(0, 10, 0);
ball.velocity.set(3, 4, 0);

const world = new ParticleWorld(); // gravity defaults to (0, -9.81, 0)
world.particles.push(ball);

const loop = new FixedStepLoop(60);

function frame(now: number): void {
  const { alpha } = loop.advance(now, (dt) => {
    // Forces last one step, so apply them inside the callback.
    ball.addForce({ x: 1, y: 0, z: 0 });
    world.step(dt);
  });
  // Draw here. `alpha` blends the previous and current state.
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

The vector fields on `Particle` are `readonly` references, so change them in place with `set`, `copy` or `add`. They are plain objects with `x`, `y` and `z`, so a renderer can read them directly, as in `mesh.position.copy(ball.position)` for Three.js.

Add and remove particles by changing `world.particles` directly, between steps.

### Interpolating for rendering

The engine keeps only the current state. To render between steps, copy `position` before stepping and blend with `alpha`:

```ts
import { Vec3 } from 'aether-physics';

const previous = ball.position.clone();
const drawn = new Vec3();

const { alpha } = loop.advance(now, (dt) => {
  previous.copy(ball.position);
  world.step(dt);
});
drawn.copy(previous).lerp(ball.position, alpha);
```

### The integration step

`ParticleWorld.step` runs the force generators and adds each movable particle's gravity, `gravity · gravityScale · mass`, as a force. `Particle.integrate(dt)` then does the following, in order:

1. `v += forceAccum · inverseMass · dt`
2. `v *= damping^dt`
3. `x += v · dt`
4. Clears `forceAccum`.

## API decisions

### Inverse mass

`Particle` stores `inverseMass` rather than `mass`, so an immovable particle is `inverseMass = 0`, and code that applies a force or impulse needs no special case and never divides by zero. `setMass(Infinity)` sets this up. `setMass` rejects zero, negative and `NaN` masses with a `RangeError`, because a massless point has no meaningful response to force.

`inverseMass` is a plain field and isn't validated when assigned directly. Keep it finite and non-negative.

### Immovable particles ignore their velocity

A particle with `inverseMass = 0` skips the whole update, including its own `velocity` and gravity. Its accumulator is still cleared, so forces don't build up and take effect if it's later given a finite mass.

### Gravity belongs to the world

`ParticleWorld.gravity` is one acceleration shared by every particle, and each particle scales it by `gravityScale`: `0` ignores gravity and a negative value rises. The world adds gravity as a force proportional to mass, so a light particle and a heavy one fall at the same rate, and changing gravity means changing one vector rather than every particle. `Particle` itself knows nothing about gravity: a particle integrated outside a world gets none.

Gravity that varies by particle or position, such as a point attractor, belongs in a force generator instead.

### Damping is per second

`damping` is the fraction of velocity kept after one second, applied as `damping^dt`, so the decay is the same at any step size. `1` disables it and `0` stops the particle within a step. It applies to every source of velocity, so it also limits the speed reached under gravity.

The field isn't validated. Values outside `[0, 1]` add energy or produce `NaN`.

### Non-positive timesteps are errors

`Particle.integrate` throws a `RangeError` unless `dt > 0`. A negative `dt` would make damping add energy, and a zero `dt` would silently consume queued forces. `ParticleWorld.step` inherits this through each particle, so an empty world accepts any `dt`.

### Particles use one integrator

Verlet and RK4 evaluate forces more than once per step, which a force accumulator can't do: a force is added once and consumed once. Particles therefore stay on semi-implicit Euler.

## Testing

Tests live in `tests/`, and the force generators' tests in `forces/tests/`.

See [PLAN.md, Phase 2](../../../../docs/PLAN.md#phase-2-particles-and-integration).
