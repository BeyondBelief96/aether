import type { DemoDefinition } from "../core/demo";
import { buoyancyDemo } from "./forces/buoyancy";
import { clothDemo } from "./forces/cloth";
import { springsDemo } from "./forces/springs";
import { fixedTimestepDemo } from "./foundations/fixed-timestep";
import { integratorsDemo } from "./foundations/integrators";
import { rotationDemo } from "./foundations/rotation";
import { ballisticsDemo } from "./particles/ballistics";
import { fireworksDemo } from "./particles/fireworks";

/** Every demo, in the order its category lists it. */
export const demos: readonly DemoDefinition[] = [
    fixedTimestepDemo,
    rotationDemo,
    integratorsDemo,
    ballisticsDemo,
    fireworksDemo,
    clothDemo,
    springsDemo,
    buoyancyDemo,
] as readonly DemoDefinition[];

/** The demo the app opens with. */
export const featuredDemo = clothDemo as DemoDefinition;

export function findDemo(id: string): DemoDefinition | undefined {
    return demos.find((demo) => demo.id === id);
}
