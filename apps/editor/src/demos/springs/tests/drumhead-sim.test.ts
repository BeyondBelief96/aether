import { describe, expect, it } from "vitest";
import { DrumheadSim, type DrumheadOptions } from "../drumhead-sim";

const OPTIONS: DrumheadOptions = {
    radius: 2,
    spacing: 0.25,
    height: 1,
    mass: 0.02,
    stiffness: 20,
    tension: 0.2,
    damping: 1,
};

describe("DrumheadSim", () => {
    it("fixes the rim and moves only the particles inside it", () => {
        const sim = new DrumheadSim(OPTIONS);
        const points = sim.grid.filter((p) => p !== null);
        const rim = points.filter((p) => !p.hasFiniteMass());
        expect(rim.length).toBeGreaterThan(0);
        expect(sim.world.particles).toHaveLength(points.length - rim.length);
        expect(sim.centre.hasFiniteMass()).toBe(true);
    });

    it("stays flat until struck", () => {
        const sim = new DrumheadSim(OPTIONS);
        for (let i = 0; i < 60; i++) sim.step(1 / 120);
        expect(Math.abs(sim.displacement(sim.centre))).toBeLessThan(1e-9);
    });

    it("carries a strike at the centre outward to the rest of the skin", () => {
        const sim = new DrumheadSim(OPTIONS);
        const outer = sim.grid[sim.slot(4, 0)]!;
        sim.strike(0, 0, 0.6, 4);
        sim.step(1 / 120);
        expect(sim.displacement(sim.centre)).toBeLessThan(0);
        expect(sim.displacement(outer)).toBe(0);
        for (let i = 0; i < 120; i++) sim.step(1 / 120);
        expect(Math.abs(sim.displacement(outer))).toBeGreaterThan(1e-4);
    });

    it("speeds waves up with the square root of the tension", () => {
        const sim = new DrumheadSim(OPTIONS);
        const slow = sim.waveSpeed();
        sim.setTension(4 * OPTIONS.tension);
        expect(sim.waveSpeed()).toBeCloseTo(2 * slow);
        expect(sim.lowestNote()).toBeCloseTo((2.405 * sim.waveSpeed()) / (2 * Math.PI * 2));
    });
});
