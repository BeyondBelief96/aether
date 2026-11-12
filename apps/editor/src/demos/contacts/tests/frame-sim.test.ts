import { describe, expect, it } from "vitest";
import { kineticEnergy, worstRodError } from "../../helpers/measure";
import { FrameSim, type FrameOptions, type FrameShape } from "../frame-sim";

const OPTIONS: FrameOptions = {
    shape: "cube",
    braced: true,
    size: 1,
    cornerMass: 1,
    cornerRadius: 0.06,
    restitution: 0.3,
};

function dropped(options: Partial<FrameOptions> = {}, seconds = 6, hz = 60): FrameSim {
    const sim = new FrameSim({ ...OPTIONS, ...options });
    sim.drop(3, 2);
    const substeps = Math.max(1, Math.round(120 / hz));
    for (let i = 0; i < seconds * hz; i++) {
        for (let k = 0; k < substeps; k++) sim.step(1 / hz / substeps);
    }
    return sim;
}

describe("FrameSim", () => {
    it.each([
        ["tetrahedron", true, 4, 6],
        ["prism", true, 6, 12],
        ["prism", false, 6, 9],
        ["cube", true, 8, 18],
        ["cube", false, 8, 12],
    ] as const)("builds a %s (braced %s) with %i corners and %i rods", (shape, braced, n, rods) => {
        const sim = new FrameSim({ ...OPTIONS, shape, braced });
        expect(sim.particles).toHaveLength(n);
        expect(sim.rods).toHaveLength(rods);
        expect(worstRodError(sim.rods)).toBeLessThan(1e-12);
    });

    it("gives every edge the frame's size", () => {
        for (const shape of ["tetrahedron", "prism", "cube"] as FrameShape[]) {
            const sim = new FrameSim({ ...OPTIONS, shape, size: 1.5 });
            for (const rod of sim.rods.slice(0, sim.edgeCount)) expect(rod.length).toBeCloseTo(1.5);
        }
    });

    it.each([10, 60, 240])("keeps a braced cube's shape and lands it on a face at %i Hz", (hz) => {
        const sim = dropped({}, 6, hz);
        expect(worstRodError(sim.rods)).toBeLessThan(0.002);
        expect(sim.centreHeight()).toBeCloseTo(0.5 + 0.06, 2);
    });

    it("folds an unbraced cube flat", () => {
        expect(dropped({ braced: false }).centreHeight()).toBeLessThan(0.1);
    });

    it("keeps a tetrahedron rigid with six rods", () => {
        const sim = dropped({ shape: "tetrahedron" });
        expect(worstRodError(sim.rods)).toBeLessThan(0.002);
        expect(sim.centreHeight()).toBeGreaterThan(0.2);
    });

    it("reshapes in the same world, dropping the old corners", () => {
        const sim = new FrameSim(OPTIONS);
        const { world } = sim;
        sim.setShape("tetrahedron", true);
        expect(sim.world).toBe(world);
        expect(world.particles).toHaveLength(4);
        expect(world.contactGenerators).toHaveLength(1 + 6);
    });

    it("spins about its tilted axis when dropped", () => {
        const sim = new FrameSim(OPTIONS);
        sim.drop(3, 2);
        expect(kineticEnergy(sim.particles)).toBeGreaterThan(0);
        sim.drop(3, 0);
        expect(kineticEnergy(sim.particles)).toBe(0);
    });
});
