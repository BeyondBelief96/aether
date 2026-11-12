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

/**
 * Keeps a world's resolver matched to the `resolverParams` values, and reports the iterations
 * the installed resolver used.
 */
export class ResolverBudget {
    private readonly world: ParticleWorld;
    private resolver: ParticleContactResolver;

    constructor(world: ParticleWorld, values: ResolverValues) {
        this.world = world;
        this.resolver = install(world, values);
    }

    /** Installs a new resolver if either resolver parameter changed. */
    update(values: ResolverValues, changed: ReadonlySet<string>): void {
        if (changed.has("auto") || changed.has("iterations")) {
            this.resolver = install(this.world, values);
        }
    }

    /**
     * "used of limit" for the last step's resolve.
     *
     * @param warnAtLimit Whether running out of iterations is flagged. Off for scenes that always
     *   use the whole budget.
     */
    readout(warnAtLimit = true): Readout {
        const { iterationsUsed, iterationLimit } = this.resolver;
        return {
            label: "Iterations",
            value: `${iterationsUsed} of ${iterationLimit}`,
            warn: warnAtLimit && iterationLimit > 0 && iterationsUsed >= iterationLimit,
        };
    }
}

/** Gives `world` a new resolver for `values` and returns it. */
function install(world: ParticleWorld, values: ResolverValues): ParticleContactResolver {
    const resolver = new ParticleContactResolver(values.auto ? undefined : values.iterations);
    world.contactResolver = resolver;
    return resolver;
}
