import { describe, expect, it } from "vitest";
import { GroundContacts, Particle, ParticleWorld } from "aether-physics";
import { ResolverBudget } from "../resolver";

function sunk(count: number): ParticleWorld {
    const world = new ParticleWorld();
    for (let i = 0; i < count; i++) {
        const p = new Particle();
        p.position.set(i, -1, 0);
        world.particles.push(p);
    }
    world.contactGenerators.push(new GroundContacts(world.particles));
    return world;
}

describe("ResolverBudget", () => {
    it("shows a fixed budget before the first step", () => {
        const budget = new ResolverBudget(sunk(1), { auto: false, iterations: 20 });
        expect(budget.readout().value).toBe("0 of 20");
    });

    it("installs a new resolver only when a resolver parameter changes", () => {
        const world = sunk(1);
        const budget = new ResolverBudget(world, { auto: true, iterations: 20 });
        const first = world.contactResolver;
        budget.update({ auto: true, iterations: 20 }, new Set(["load"]));
        expect(world.contactResolver).toBe(first);
        budget.update({ auto: false, iterations: 1 }, new Set(["auto"]));
        expect(world.contactResolver).not.toBe(first);
    });

    it("reports the installed resolver and warns when it runs out", () => {
        const world = sunk(3);
        const budget = new ResolverBudget(world, { auto: false, iterations: 1 });
        world.step(1 / 60);
        expect(budget.readout()).toEqual({ label: "Iterations", value: "1 of 1", warn: true });
        expect(budget.readout(false).warn).toBe(false);
    });
});
