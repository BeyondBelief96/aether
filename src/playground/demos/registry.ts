import { timestepDemo } from "./phase0-timestep";
import { rotationGizmoDemo } from "./phase1-rotation-gizmo";
import { ballisticsDemo } from "./phase2-ballistics";
import { integratorShootoutDemo } from "./phase2-integrator-shootout";
import { buoyancyDemo } from "./phase3-buoyancy";
import { springsDemo } from "./phase3-springs";
import type { DemoInfo } from "./types";

export const demos: readonly DemoInfo[] = [
    timestepDemo,
    rotationGizmoDemo,
    ballisticsDemo,
    integratorShootoutDemo,
    springsDemo,
    buoyancyDemo,
];
