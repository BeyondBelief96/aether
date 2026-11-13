import { describe, expect, it } from "vitest";
import { RaftSim, type RaftOptions } from "../raft-sim";

const OPTIONS: RaftOptions = {
    along: 7,
    logs: 5,
    stepX: 0.8,
    stepZ: 0.75,
    logRadius: 0.36,
    deck: 0.46,
    deckShare: 0.5,
    stiffness: 150000,
    crateRate: 400,
    crateSize: 0.6,
    maxCrates: 3,
    lakeDepth: 3.5,
    gravity: 9.81,
    wood: 500,
    damping: 0.35,
};

function settle(sim: RaftSim, seconds: number): void {
    for (let i = 0; i < seconds * 600; i++) sim.step(1 / 600);
}

describe("RaftSim", () => {
    it("floats level with the deck above the water", () => {
        const sim = new RaftSim(OPTIONS);
        settle(sim, 3);
        expect(sim.freeboard()).toBeGreaterThan(0);
        expect(sim.tilt()).toBeLessThan(0.01);
    });

    it("tips toward a crate set on one corner", () => {
        const sim = new RaftSim(OPTIONS);
        settle(sim, 1);
        expect(sim.addCrate(0, 400)).not.toBeNull();
        settle(sim, 3);
        expect(sim.tilt()).toBeGreaterThan(0.02);
        expect(sim.cargo()).toBe(400);
    });

    it("refuses a taken cell and a full deck, and removes the newest crate", () => {
        const sim = new RaftSim(OPTIONS);
        expect(sim.addCrate(0, 100)).not.toBeNull();
        expect(sim.addCrate(0, 100)).toBeNull();
        sim.addCrate(1, 100);
        sim.addCrate(2, 100);
        expect(sim.addCrate(3, 100)).toBeNull();
        expect(sim.freeCells()).toHaveLength(sim.cellCount - 3);
        const particles = sim.world.particles.length;
        expect(sim.removeCrate()?.cell).toBe(2);
        expect(sim.world.particles).toHaveLength(particles - 1);
    });

    it("picks the free cell nearest a point", () => {
        const sim = new RaftSim(OPTIONS);
        const centre = sim.cellCentre(5, sim.world.particles[0]!.position.clone());
        expect(sim.nearestFreeCell(centre)).toBe(5);
        sim.addCrate(5, 100);
        expect(sim.nearestFreeCell(centre)).not.toBe(5);
    });

    it("holds sinking particles above the lake bed", () => {
        const sim = new RaftSim({ ...OPTIONS, wood: 950 });
        for (let i = 0; i < 3; i++) sim.addCrate(i, 1500);
        settle(sim, 6);
        for (const p of sim.world.particles)
            expect(p.position.y).toBeGreaterThanOrEqual(-3.3 - 1e-9);
    });
});
