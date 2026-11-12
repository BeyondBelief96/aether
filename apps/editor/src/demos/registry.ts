import type { DemoDefinition } from "../core/demo";
import { buoyancyDemo } from "./fluids/buoyancy";
import { densityColumnDemo } from "./fluids/density-column";
import { raftDemo } from "./fluids/raft";
import { bounceDemo } from "./collisions/bounce";
import { breakDemo } from "./collisions/break";
import { ballisticsDemo } from "./particles/ballistics";
import { fireworksDemo } from "./particles/fireworks";
import { integratorsDemo } from "./particles/integrators";
import { orbitsDemo } from "./particles/orbits";
import { rotationDemo } from "./rigid-bodies/rotation";
import { bridgeDemo } from "./soft-bodies/bridge";
import { clothDemo } from "./soft-bodies/cloth";
import { drumheadDemo } from "./soft-bodies/drumhead";
import { elasticPendulumDemo } from "./soft-bodies/elastic-pendulum";
import { springsDemo } from "./soft-bodies/springs";

/** Every demo, in the order its category lists it. Categories are ordered by `CATEGORIES`. */
export const demos: readonly DemoDefinition[] = [
    orbitsDemo,
    fireworksDemo,
    ballisticsDemo,
    integratorsDemo,
    clothDemo,
    drumheadDemo,
    elasticPendulumDemo,
    springsDemo,
    bridgeDemo,
    raftDemo,
    densityColumnDemo,
    buoyancyDemo,
    rotationDemo,
    bounceDemo,
    breakDemo,
] as readonly DemoDefinition[];

/** The demo the app opens with. */
export const featuredDemo = clothDemo as DemoDefinition;

export function findDemo(id: string): DemoDefinition | undefined {
    return demos.find((demo) => demo.id === id);
}
