import {
    ExplicitEuler,
    Rk4,
    SemiImplicitEuler,
    VelocityVerlet,
    type ParticleIntegrator,
} from "aether-physics";

const FACTORIES = {
    "semi-implicit": () => new SemiImplicitEuler(),
    explicit: () => new ExplicitEuler(),
    verlet: () => new VelocityVerlet(),
    rk4: () => new Rk4(),
} satisfies Record<string, () => ParticleIntegrator>;

/** The engine's particle integrators, by a stable key. */
export type IntegratorChoice = keyof typeof FACTORIES;

/** Every integrator the app offers, in menu order, with its display name. */
export const INTEGRATORS: readonly { readonly value: IntegratorChoice; readonly label: string }[] =
    (Object.keys(FACTORIES) as IntegratorChoice[]).map((value) => ({
        value,
        label: FACTORIES[value]().name,
    }));

/** The integrator a demo opens with. */
export const DEFAULT_INTEGRATOR: IntegratorChoice = "semi-implicit";

/** A new integrator for `choice`. */
export function makeIntegrator(choice: IntegratorChoice): ParticleIntegrator {
    return FACTORIES[choice]();
}
