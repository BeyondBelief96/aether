import { describe, expect, it } from "vitest";
import { Particle, ParticleRod } from "aether-physics";
import { formatNumber } from "../../../core/format";
import { kineticEnergy, lengthErrorReadout, worstRodError } from "../measure";

function at(x: number): Particle {
    const p = new Particle();
    p.position.set(x, 0, 0);
    return p;
}

describe("worstRodError", () => {
    it("reports the rod furthest from its length, stretched or compressed", () => {
        const rods = [new ParticleRod(at(0), at(1.1), 1), new ParticleRod(at(0), at(0.7), 1)];
        expect(worstRodError(rods)).toBeCloseTo(0.3);
        expect(worstRodError([])).toBe(0);
    });
});

describe("kineticEnergy", () => {
    it("sums ½mv² over movable particles and skips fixed ones", () => {
        const moving = at(0);
        moving.setMass(2);
        moving.velocity.set(3, 0, 0);
        const fixed = at(1);
        fixed.inverseMass = 0;
        expect(kineticEnergy([moving, fixed])).toBeCloseTo(9);
    });
});

describe("lengthErrorReadout", () => {
    it("shows millimetres and flags errors past a centimetre", () => {
        expect(lengthErrorReadout("Rod", 0.0042)).toEqual({
            label: "Rod",
            value: `${formatNumber(4.2, 1)} mm`,
            warn: false,
        });
        expect(lengthErrorReadout("Rod", 0.02).warn).toBe(true);
    });
});
