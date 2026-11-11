# forces (Phases 3–4)

Force generators and the force registry: gravity, drag, springs, bungee, buoyancy, attraction, and later rigid-body versions applied at body points.

A `ParticleForceGenerator` adds a force to whichever particle it is given, and is registered per particle with `forces.add(particle, generator)`, so one drag or buoyancy instance can be shared. A spring pushes only the particle it is registered on; register one on each end for a two-ended spring. `ParticleWorld.remove(particle)` drops the generators registered on that particle, but not springs on other particles that point at it.

`ParticleAttraction` is a softened inverse-square pull toward one particle. Like a spring it pulls only the particle it is registered on; register one on each of two particles for mutual attraction. Every pair costs a registration, so for many bodies that all attract each other a single generator over the whole set will scale better.

Uniform forces belong on the world, not in the registry: `ParticleWorld.gravity` and `Particle.damping` cost one loop instead of one registration per particle.

See [PLAN.md, Phase 3](../../../../docs/PLAN.md#phase-3-forces-springs-and-mass-aggregates).
