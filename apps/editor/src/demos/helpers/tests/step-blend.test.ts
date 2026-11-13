import { describe, expect, it } from "vitest";
import { Particle } from "aether-physics";
import { StepBlend } from "../step-blend";

function at(x: number): Particle {
    const p = new Particle();
    p.position.set(x, 0, 0);
    return p;
}

describe("StepBlend", () => {
    it("blends between the remembered and current positions", () => {
        const p = at(0);
        const blend = new StepBlend();
        blend.remember([p]);
        p.position.x = 2;
        blend.blend(0.25);
        expect(blend.positionOf(p).x).toBeCloseTo(0.5);
    });

    it("reads the position before the last step", () => {
        const p = at(1);
        const blend = new StepBlend();
        blend.remember([p]);
        p.position.x = 5;
        expect(blend.previousOf(p).x).toBe(1);
        expect(blend.previousOf(at(7)).x).toBe(7);
    });

    it("reads a particle it never remembered at its current position", () => {
        const blend = new StepBlend();
        blend.blend(0);
        expect(blend.positionOf(at(3)).x).toBe(3);
    });

    it("forgets particles on reset and forget", () => {
        const a = at(0);
        const b = at(0);
        const blend = new StepBlend();
        blend.remember([a, b]);
        a.position.x = 4;
        b.position.x = 4;
        blend.blend(0);
        blend.reset([b]);
        expect(blend.positionOf(a).x).toBe(4);
        blend.forget(b);
        b.position.x = 6;
        expect(blend.positionOf(b).x).toBe(6);
    });
});
