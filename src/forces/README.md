# forces (Phases 3–4)

Force generators and the force registry: gravity, drag, springs, bungee, buoyancy, and later rigid-body versions applied at body points.

A `ParticleForceGenerator` holds only parameters and is added per particle with `forces.add(particle, generator)`, so one drag or buoyancy instance can be shared. A `ParticleForce` holds the particles it acts on and is added with `forces.add(force)`; springs use it so both ends come from one calculation. `ParticleWorld.remove(particle)` drops every force whose `particles` include it. `forces.add` returns a handle to pass to `forces.remove`.

Uniform forces belong on the world, not in the registry: `ParticleWorld.gravity` and `Particle.damping` cost one loop instead of one registration per particle.

See [PLAN.md, Phase 3](../../docs/PLAN.md#phase-3-forces-springs-and-mass-aggregates).
