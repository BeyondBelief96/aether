import type { ParamSchema, ParamValue } from "./params";

export const MORPH_MS = 420;

const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/**
 * The values `t` of the way from `from` to `to`, eased. Numbers and vectors blend; every
 * other kind switches to its target at the start.
 */
export function blendValues(
    schema: ParamSchema,
    from: Readonly<Record<string, ParamValue>>,
    to: Readonly<Record<string, ParamValue>>,
    t: number,
): Record<string, ParamValue> {
    const k = easeOut(Math.min(1, Math.max(0, t)));
    const out: Record<string, ParamValue> = {};
    for (const [key, target] of Object.entries(to)) {
        const param = schema[key];
        const start = from[key];
        if (!param || start === undefined) continue;
        if (param.kind === "number" && typeof start === "number" && typeof target === "number") {
            out[key] = start + (target - start) * k;
        } else if (
            param.kind === "vec3" &&
            typeof start === "object" &&
            typeof target === "object"
        ) {
            out[key] = {
                x: start.x + (target.x - start.x) * k,
                y: start.y + (target.y - start.y) * k,
                z: start.z + (target.z - start.z) * k,
            };
        } else {
            out[key] = target;
        }
    }
    return out;
}

/**
 * Runs `apply` once per animation frame with blended values until the target is reached.
 * Returns a function that cancels the morph. With reduced motion, applies the target at once.
 */
export function morph(
    schema: ParamSchema,
    from: Readonly<Record<string, ParamValue>>,
    to: Readonly<Record<string, ParamValue>>,
    apply: (values: Record<string, ParamValue>) => void,
): () => void {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        apply({ ...to });
        return () => {};
    }
    const start = performance.now();
    let handle = 0;
    const tick = (now: number): void => {
        const t = (now - start) / MORPH_MS;
        apply(t >= 1 ? { ...to } : blendValues(schema, from, to, t));
        if (t < 1) handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
}
