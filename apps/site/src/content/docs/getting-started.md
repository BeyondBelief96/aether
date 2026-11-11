---
title: "Getting started"
description: "Install the package and step your first world."
order: 1
group: Start
---

## Install

```sh
npm install aether-physics
```

## Step a world

```ts
import { Particle, ParticleWorld } from "aether-physics";

const ball = new Particle();
ball.position.set(0, 10, 0);
ball.velocity.set(3, 4, 0);

const world = new ParticleWorld(); // gravity is (0, -9.81, 0)
world.particles.push(ball);

for (let i = 0; i < 60; i++) world.step(1 / 60); // one simulated second
```

## Draw it

Aether has no renderer. Copy positions onto your meshes each frame; engine vectors have plain `x`, `y`, `z` fields, so `mesh.position.copy(ball.position)` works with Three.js directly.

## Next

- [Particles](../particles/)
- [Forces](../forces/)
- [The demos](../../demos/), each with its source one tab away
