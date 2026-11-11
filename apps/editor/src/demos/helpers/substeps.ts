/**
 * How many equal substeps split `dt` so none is longer than `maxStep`. Stiff demos substep by
 * this instead of a fixed count, so lowering the physics rate keeps them stable.
 */
export function substepsFor(dt: number, maxStep: number): number {
    return Math.max(1, Math.ceil(dt / maxStep - 1e-9));
}
