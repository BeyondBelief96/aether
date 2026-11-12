import { describe, expect, it } from "vitest";
import { ClothSim } from "../cloth-sim";

const OPTIONS = { size: 18, spacing: 0.28, mass: 0.05, top: 6.5 };

function settle(stiffness: number, wind: number, seconds: number, hz = 60, substeps = 4): ClothSim {
    const cloth = new ClothSim(OPTIONS);
    cloth.setPins("corners");
    cloth.setStiffness(stiffness);
    cloth.setDamping(0.6);
    cloth.wind.speed = wind;
    for (let t = 0; t < seconds; t += 1 / hz) cloth.step(1 / hz, substeps);
    return cloth;
}

describe("ClothSim", () => {
    it("builds structural and shear links", () => {
        const n = OPTIONS.size;
        const cloth = new ClothSim(OPTIONS);
        expect(cloth.links.length).toBe(2 * n * (n - 1) + 2 * (n - 1) * (n - 1));
    });

    it("keeps pinned particles in place", () => {
        const cloth = settle(300, 6, 3);
        const width = (OPTIONS.size - 1) * OPTIONS.spacing;
        expect(cloth.particles[0]!.position).toEqual({ x: -width / 2, y: OPTIONS.top, z: 0 });
    });

    it.each([150, 500, 1000])("stays bounded at %d N/m with wind", (stiffness) => {
        const cloth = settle(stiffness, 10, 8);
        for (const p of cloth.particles) {
            expect(Number.isFinite(p.position.x + p.position.y + p.position.z)).toBe(true);
            expect(p.position.y).toBeGreaterThan(-5);
        }
        expect(cloth.maxStretch()).toBeLessThan(1);
    });
});
