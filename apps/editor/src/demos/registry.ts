import type { DemoDefinition } from "../core/demo";
import { bounceDemo } from "./contacts/bounce";
import { breakDemo } from "./contacts/break";
import { bridgeDemo } from "./contacts/bridge";
import { ballisticsDemo } from "./particles/ballistics";
import { fireworksDemo } from "./particles/fireworks";
import { integratorsDemo } from "./particles/integrators";
import { orbitsDemo } from "./particles/orbits";
import { rotationDemo } from "./rigid-bodies/rotation";
import { clothDemo } from "./springs/cloth";
import { drumheadDemo } from "./springs/drumhead";
import { elasticPendulumDemo } from "./springs/elastic-pendulum";
import { raftDemo } from "./springs/raft";
import { springsDemo } from "./springs/springs";

/** Every demo, in the order its category lists it. Categories are ordered by `CATEGORIES`. */
export const demos: readonly DemoDefinition[] = [
    ballisticsDemo,
    fireworksDemo,
    orbitsDemo,
    integratorsDemo,
    springsDemo,
    elasticPendulumDemo,
    clothDemo,
    drumheadDemo,
    raftDemo,
    bounceDemo,
    breakDemo,
    bridgeDemo,
    rotationDemo,
] as readonly DemoDefinition[];

/** The demo the app opens with. */
export const featuredDemo = clothDemo as DemoDefinition;

export function findDemo(id: string): DemoDefinition | undefined {
    return demos.find((demo) => demo.id === id);
}
