import { describe, expect, it } from "vitest";
import { Vec3 } from "aether-physics";
import { BridgeSim, type BridgeOptions } from "../bridge-sim";

const OPTIONS: BridgeOptions = {
    sections: 8,
    span: 10,
    width: 1.6,
    deckHeight: 4,
    hangerHeight: 2.5,
    hangerDrop: 0.6,
    nodeMass: 5,
    damping: 0.5,
    slack: 0.05,
    hangers: false,
    iterations: 2000,
};

function run(sim: BridgeSim, seconds: number, dt = 1 / 60): void {
    for (let i = 0; i < seconds / dt; i++) sim.step(dt);
}

function kineticEnergy(sim: BridgeSim): number {
    let energy = 0;
    for (const p of sim.particles) {
        if (p.inverseMass > 0) energy += 0.5 * p.mass * p.velocity.magnitudeSquared();
    }
    return energy;
}

describe("BridgeSim", () => {
    it("fixes the end particles and builds the links", () => {
        const sim = new BridgeSim(OPTIONS);
        expect(sim.particles).toHaveLength(18);
        expect(sim.node(0, 0).inverseMass).toBe(0);
        expect(sim.node(1, 8).inverseMass).toBe(0);
        expect(sim.node(0, 4).mass).toBeCloseTo(5);
        expect(sim.rods).toHaveLength(7);
        expect(sim.railCables).toHaveLength(16);
        expect(sim.hangerCables).toHaveLength(14);
        expect(sim.anchors).toHaveLength(14);
        expect(sim.world.contactGenerators).toEqual([...sim.rods, ...sim.railCables]);
    });

    it("sags into a chain and settles, every rod at its length", () => {
        const sim = new BridgeSim(OPTIONS);
        run(sim, 15);

        // A chord of 10 m with 5% slack hangs about 1.4 m deep.
        expect(sim.sag()).toBeCloseTo(1.4, 1);
        expect(sim.rodError()).toBeLessThan(1e-4);
        expect(sim.cableStretch()).toBeLessThan(1e-3);
        expect(kineticEnergy(sim)).toBeLessThan(0.5);
    });

    it("moves the lowest point toward a parked load, and settles under it", () => {
        const sim = new BridgeSim(OPTIONS);
        sim.loadMass = 100;
        sim.loadPosition = 2.5;
        run(sim, 20);
        const before = sim.particles.map((p) => p.position.clone());
        run(sim, 1);

        expect(sim.loadSection()).toBe(2);
        expect(sim.node(0, 2).mass).toBeCloseTo(55);
        let lowest = 0;
        for (let i = 1; i < 8; i++) {
            if (sim.node(0, i).position.y < sim.node(0, lowest).position.y) lowest = i;
        }
        expect(lowest).toBeLessThan(4);
        expect(sim.rodError()).toBeLessThan(1e-3);
        sim.particles.forEach((p, i) =>
            expect(p.position.distanceTo(before[i]!)).toBeLessThan(1e-3),
        );
    });

    it("carries a moving load across and back, keeping the rods at length", () => {
        const sim = new BridgeSim(OPTIONS);
        sim.loadMass = 100;
        sim.loadSpeed = 2;
        let worst = 0;
        for (let i = 0; i < 60 * 15; i++) {
            sim.step(1 / 60);
            if (i > 120) worst = Math.max(worst, sim.rodError());
            expect(sim.loadPosition).toBeGreaterThanOrEqual(0);
            expect(sim.loadPosition).toBeLessThanOrEqual(10);
        }
        expect(worst).toBeLessThan(1e-3);
        expect(sim.cableStretch()).toBeLessThan(0.05);
    });

    it("stretches when the resolver gets only twice the contact count", () => {
        const sim = new BridgeSim({ ...OPTIONS, iterations: undefined });
        run(sim, 10);
        expect(sim.cableStretch()).toBeGreaterThan(0.05);
    });

    it("hangs the deck from the hangers, leaving the ones near the ends slack", () => {
        const sim = new BridgeSim({ ...OPTIONS, hangers: true });
        run(sim, 10);

        expect(sim.world.contactGenerators).toEqual([
            ...sim.rods,
            ...sim.railCables,
            ...sim.hangerCables,
        ]);
        expect(sim.sag()).toBeCloseTo(0.6, 2);
        const taut = sim.tautCount(0.002);
        expect(taut).toBeGreaterThan(0);
        expect(taut).toBeLessThan(sim.cableCount());
    });

    it("puts the load point between the particles around it", () => {
        const sim = new BridgeSim(OPTIONS);
        sim.loadPosition = 3.75; // section 3, halfway along
        const point = sim.loadPoint(new Vec3());
        expect(point.x).toBeCloseTo(-1.25);
        expect(point.y).toBeCloseTo(4);
        expect(point.z).toBeCloseTo(0);
        expect(sim.dropUnderLoad()).toBeCloseTo(0);
    });

    it("lengthens the rail cables with slack", () => {
        const sim = new BridgeSim(OPTIONS);
        sim.setSlack(0.1);
        expect(sim.railCables[0]!.maxLength).toBeCloseTo(1.375);
    });
});
