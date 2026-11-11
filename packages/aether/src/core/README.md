# core

The simulation clock, shared by every system in the engine. Pure TypeScript, with no `three` imports and no DOM access.

| Export | Purpose |
|---|---|
| `FixedStepLoop` | Fixed-timestep clock with an accumulator, pause, single-step and time scale |
| `FrameResult` | Supporting type |

`FixedStepLoop.advance(now, step)` calls `step(dt)` once for each whole timestep elapsed since the last frame and returns `alpha`, the fraction of a step left over, for interpolating the drawn state. See the [particles guide](../particles/README.md#simulating-particles) for a complete loop.

## Testing

Tests live in `tests/`.

See [PLAN.md, Phase 0](../../../../docs/PLAN.md#phase-0-scaffold-and-game-loop-).
