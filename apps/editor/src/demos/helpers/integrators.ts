import {
    ExplicitEuler,
    Rk4,
    SemiImplicitEuler,
    VelocityVerlet,
    type ParticleIntegrator,
} from "aether-physics";
import { choice } from "../../core/params";

const INTEGRATORS = {
    "semi-implicit": () => new SemiImplicitEuler(),
    explicit: () => new ExplicitEuler(),
    verlet: () => new VelocityVerlet(),
    rk4: () => new Rk4(),
} satisfies Record<string, () => ParticleIntegrator>;

export type IntegratorChoice = keyof typeof INTEGRATORS;

/** A parameter for choosing a `ParticleWorld`'s integrator. */
export const integratorParam = () =>
    choice<IntegratorChoice>({
        label: "Integrator",
        options: [
            { value: "semi-implicit", label: "Semi-implicit" },
            { value: "explicit", label: "Explicit" },
            { value: "verlet", label: "Verlet" },
            { value: "rk4", label: "RK4" },
        ],
        default: "semi-implicit",
    });

/** A new integrator for the chosen value. */
export function makeIntegrator(value: IntegratorChoice): ParticleIntegrator {
    return INTEGRATORS[value]();
}
