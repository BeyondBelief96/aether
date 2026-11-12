import { describe, expect, it } from "vitest";
import { PendulumsSim, type PendulumsOptions } from "../pendulums-sim";

const OPTIONS: PendulumsOptions = {
    pivotHeight: 3.2,
    length: 1.5,
    spacing: 3.8,
    mass: 1,
    restitution: 0,
};

/** Kicks both bobs at `speed` and runs `seconds` in 1 ms steps, tracking each one's extremes. */
function swing(speed: number, seconds = 3) {
    const sim = new PendulumsSim(OPTIONS);
    sim.kick(speed);
    const start = sim.energy(sim.rod);
    const highest = { rod: 0, cable: 0 };
    const reach = { rod: Infinity, cable: Infinity };
    for (let i = 0; i < seconds * 1000; i++) {
        sim.step(1 / 1000);
        highest.rod = Math.max(highest.rod, sim.angle(sim.rod));
        highest.cable = Math.max(highest.cable, sim.angle(sim.cable));
        reach.rod = Math.min(reach.rod, sim.reach(sim.rod));
        reach.cable = Math.min(reach.cable, sim.reach(sim.cable));
    }
    return { sim, start, highest, reach };
}

const DEGREES = Math.PI / 180;

describe("PendulumsSim", () => {
    it("hangs both bobs a link's length below their pivots", () => {
        const sim = new PendulumsSim(OPTIONS);
        for (const { pivot, bob } of sim.pendulums) {
            expect(pivot.position.y - bob.position.y).toBeCloseTo(1.5);
        }
        expect(sim.energy(sim.rod)).toBeCloseTo(0);
    });

    it("gives the thresholds for L = 1.5 m", () => {
        const sim = new PendulumsSim(OPTIONS);
        expect(sim.levelSpeed()).toBeCloseTo(Math.sqrt(2 * 9.81 * 1.5));
        expect(sim.rodLoopSpeed()).toBeCloseTo(Math.sqrt(4 * 9.81 * 1.5));
        expect(sim.cableLoopSpeed()).toBeCloseTo(Math.sqrt(5 * 9.81 * 1.5));
    });

    it("swings both the same below √(2gL), with the cable taut", () => {
        const { highest, reach } = swing(4);
        expect(highest.cable).toBeCloseTo(highest.rod, 3);
        expect(reach.cable).toBeGreaterThan(0.999);
    });

    it("lets the cable go slack between √(2gL) and √(5gL) while the rod holds the circle", () => {
        const { highest, reach } = swing(7);
        expect(reach.rod).toBeGreaterThan(0.999);
        expect(reach.cable).toBeLessThan(0.6);
        // The rod turns back where 1 − cos θ = v² / 2gL.
        expect(highest.rod).toBeCloseTo(Math.acos(1 - 49 / (2 * 9.81 * 1.5)), 1);
        expect(highest.rod).toBeLessThan(180 * DEGREES);
    });

    it("carries the rod over the top before the cable", () => {
        const { reach, highest } = swing(8.2);
        expect(highest.rod).toBeGreaterThan(179 * DEGREES);
        expect(reach.cable).toBeLessThan(0.5);
    });

    it("keeps both taut over the top above √(5gL)", () => {
        const { reach, highest } = swing(9);
        expect(highest.cable).toBeGreaterThan(179 * DEGREES);
        expect(reach.cable).toBeGreaterThan(0.99);
    });

    it("keeps the rod's energy within a few percent at 1 ms steps", () => {
        const { sim, start } = swing(7);
        expect(sim.energy(sim.rod)).toBeGreaterThan(0.95 * start);
    });

    it("reports the cable slack only while it is", () => {
        const sim = new PendulumsSim(OPTIONS);
        expect(sim.cableSlack()).toBe(false);
        sim.cable.bob.position.y += 0.5;
        expect(sim.cableSlack()).toBe(true);
    });

    it("loses energy when an inelastic cable snaps taut", () => {
        const { sim, start } = swing(7);
        expect(sim.energy(sim.cable)).toBeLessThan(0.5 * start);
    });
});
