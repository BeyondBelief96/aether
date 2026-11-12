import { ParticleContactResolver, type ParticleWorld } from "aether-physics";
import type { Readout } from "../../core/demo";
import { number, toggle } from "../../core/params";

/**
 * The resolver's iteration budget as demo parameters: an `auto` toggle for the resolver's own
 * default, and a fixed `iterations` count shown while it is off.
 */
export function resolverParams(options: {
    readonly auto: boolean;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly default: number;
}) {
    const { auto, ...range } = options;
    return {
        auto: toggle({ label: "Auto iterations", default: auto }),
        iterations: number({
            label: "Iterations",
            ...range,
            hidden: (values) => values.auto === true,
        }),
    };
}

interface ResolverValues {
    readonly auto: boolean;
    readonly iterations: number;
}

/** Fixed iterations for `values`, or `undefined` for the resolver's default. */
export function iterationsFor(values: ResolverValues): number | undefined {
    return values.auto ? undefined : values.iterations;
}

/** Gives `world` a resolver for `values` if either resolver parameter changed. */
export function applyResolver(
    world: ParticleWorld,
    values: ResolverValues,
    changed: ReadonlySet<string>,
): void {
    if (!changed.has("auto") && !changed.has("iterations")) return;
    world.contactResolver = new ParticleContactResolver(iterationsFor(values));
}

/**
 * "used of limit" for the last step's resolve.
 *
 * @param warnAtLimit Whether running out of iterations is flagged. Off for scenes that always
 *   use the whole budget.
 */
export function iterationsReadout(world: ParticleWorld, warnAtLimit = true): Readout {
    const { iterationsUsed, iterationLimit } = world.contactResolver;
    return {
        label: "Iterations",
        value: `${iterationsUsed} of ${iterationLimit}`,
        warn: warnAtLimit && iterationLimit > 0 && iterationsUsed >= iterationLimit,
    };
}
