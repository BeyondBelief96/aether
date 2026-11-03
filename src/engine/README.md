# engine

The simulation clock and the particle system. Pure TypeScript, with no `three` imports and no DOM access.

| Export | Purpose |
|---|---|
| `FixedStepLoop` | Fixed-timestep clock with an accumulator, pause, single-step and time scale |
| `Particle` | Point mass integrated with semi-implicit Euler |
| `ParticleWorld` | Collection of particles stepped together |
| `explicitEuler`, `semiImplicitEuler`, `velocityVerlet`, `rk4` | Interchangeable integrators for a one-dimensional state |
| `OscillatorState`, `AccelFn`, `Integrator`, `FrameResult` | Supporting types |

All quantities are SI: meters, seconds, kilograms, newtons.

## Simulating particles

```ts
import { FixedStepLoop, Particle, ParticleWorld } from 'aether-physics';

const ball = new Particle();
ball.setMass(2);
ball.damping = 0.99;
ball.position.set(0, 10, 0);
ball.velocity.set(3, 4, 0);
ball.acceleration.set(0, -9.81, 0);

const world = new ParticleWorld();
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

`Particle.integrate(dt)` does the following, in order:

1. `v += (acceleration + forceAccum · inverseMass) · dt`
2. `v *= damping^dt`
3. `x += v · dt`
4. Clears `forceAccum`.

## Choosing an integrator

`Particle` always uses semi-implicit Euler. The standalone integrators work on a one-dimensional `OscillatorState`, and a function can evaluate its acceleration as often as it needs to:

```ts
import { rk4, type AccelFn } from 'aether-physics';

const k = 40; // N/m
const m = 1; // kg
const spring: AccelFn = (x) => (-k / m) * x;

const state = { x: 1, v: 0 };
for (let i = 0; i < 60; i++) rk4(state, spring, 1 / 60);
```

`state` is updated in place, and no integrator allocates.

| Integrator | Order | `accel` calls per step | Undamped spring | Stable while |
|---|---|---|---|---|
| `explicitEuler` | 1 | 1 | Energy grows | Never |
| `semiImplicitEuler` | 1 | 1 | Energy stays in a bounded band | `ω·dt < 2` |
| `velocityVerlet` | 2 | 2 | Energy stays in a tighter band | `ω·dt < 2` |
| `rk4` | 4 | 4 | Energy slowly decays | `ω·dt < 2√2` |

Here `ω = √(k/m)` is the spring's angular frequency. The test suite verifies each order and limit.

## API decisions

### Inverse mass

`Particle` stores `inverseMass` rather than `mass`, so an immovable particle is `inverseMass = 0`, and code that applies a force or impulse needs no special case and never divides by zero. `setMass(Infinity)` sets this up. `setMass` rejects zero, negative and `NaN` masses with a `RangeError`, because a massless point has no meaningful response to force.

`inverseMass` is a plain field and isn't validated when assigned directly. Keep it finite and non-negative.

### Immovable particles ignore their velocity

A particle with `inverseMass = 0` skips the whole update, including its own `velocity` and `acceleration`. Its accumulator is still cleared, so forces don't build up and take effect if it's later given a finite mass.

### Gravity is an acceleration

`acceleration` isn't divided by mass, so a light particle and a heavy one fall at the same rate without scaling a force by each particle's mass.

### Damping is per second

`damping` is the fraction of velocity kept after one second, applied as `damping^dt`, so the decay is the same at any step size. `1` disables it and `0` stops the particle within a step. It applies to every source of velocity, so it also limits the speed reached under constant acceleration.

The field isn't validated. Values outside `[0, 1]` add energy or produce `NaN`.

### Non-positive timesteps are errors

`Particle.integrate` throws a `RangeError` unless `dt > 0`. A negative `dt` would make damping add energy, and a zero `dt` would silently consume queued forces. `ParticleWorld.step` inherits this through each particle, so an empty world accepts any `dt`.

### Verlet with velocity-dependent acceleration

The standard form of velocity Verlet evaluates the new acceleration from position alone. `velocityVerlet` also passes `accel` an Euler estimate of the new velocity, which keeps the method second order on damped systems and gives the same result when `accel` ignores velocity.

### Integrators are separate from `Particle`

Verlet and RK4 evaluate forces more than once per step, which a force accumulator can't do: a force is added once and consumed once. Particles therefore stay on semi-implicit Euler, and the other integrators are pure functions over a state and an acceleration function.

## Testing

Tests sit next to the code as `*.test.ts`. The integrator tests measure each method's order of accuracy by halving `dt`, run undamped springs for 10,000 steps, and find each stability limit, so the claims in the table above are checked and not just stated.

See [PLAN.md, Phase 2](../../docs/PLAN.md#phase-2-particles-and-integration).
