import { describe, expect, it } from "vitest";
import { Substeps, substepsFor } from "../substeps";

describe("substepsFor", () => {
    it("uses the fewest substeps no longer than the limit", () => {
        expect(substepsFor(1 / 60, 1 / 240)).toBe(4);
        expect(substepsFor(1 / 60, 1 / 50)).toBe(1);
        expect(substepsFor(1 / 10, 1 / 240)).toBe(24);
    });
});

describe("Substeps", () => {
    it("runs equal substeps that add up to the step", () => {
        const substeps = new Substeps(1 / 120);
        const lengths: number[] = [];
        substeps.run(1 / 30, (h) => lengths.push(h));
        expect(lengths).toHaveLength(4);
        expect(lengths.reduce((a, b) => a + b)).toBeCloseTo(1 / 30);
        expect(substeps.count).toBe(4);
        expect(substeps.substep).toBeCloseTo(1 / 120);
        expect(substeps.readout()).toEqual({ label: "Substeps per step", value: "4" });
    });

    it("reports a 60 Hz step before the first run", () => {
        expect(new Substeps(1 / 240).count).toBe(4);
    });
});
