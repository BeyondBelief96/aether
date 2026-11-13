import type { Readout } from "../../core/demo";

/**
 * How many equal substeps split `dt` so none is longer than `maxStep`. Stiff demos substep by
 * this instead of a fixed count, so lowering the physics rate keeps them stable.
 */
export function substepsFor(dt: number, maxStep: number): number {
    return Math.max(1, Math.ceil(dt / maxStep - 1e-9));
}

/** Splits each physics step into the fewest equal substeps no longer than `maxStep`. */
export class Substeps {
    readonly maxStep: number;
    #dt = 1 / 60;

    constructor(maxStep: number) {
        this.maxStep = maxStep;
    }

    /** Substeps in the last step run, or in a 60 Hz step before the first. */
    get count(): number {
        return substepsFor(this.#dt, this.maxStep);
    }

    /** Length of one substep of the last step run, in seconds. */
    get substep(): number {
        return this.#dt / this.count;
    }

    /** Calls `step` once per substep of `dt`, with the substep's length. */
    run(dt: number, step: (h: number) => void): void {
        this.#dt = dt;
        const count = this.count;
        for (let i = 0; i < count; i++) step(dt / count);
    }

    readout(): Readout {
        return { label: "Substeps per step", value: String(this.count) };
    }
}
