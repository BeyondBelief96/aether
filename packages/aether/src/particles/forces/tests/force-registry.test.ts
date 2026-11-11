import { describe, expect, it } from "vitest";
import { Particle } from "../..";
import type { ParticleForceGenerator } from "../force-generator";
import { ParticleForceRegistry } from "../force-registry";

/** A generator that records each call into `log`. */
function recorder(name: string, log: string[]): ParticleForceGenerator {
    return { updateForce: () => void log.push(name) };
}

describe("ParticleForceRegistry", () => {
    it("starts empty", () => {
        const registry = new ParticleForceRegistry();
        expect(() => registry.updateForces(1 / 60)).not.toThrow();
    });

    it("passes the registered particle and dt to its generator", () => {
        const registry = new ParticleForceRegistry();
        const particle = new Particle();
        const calls: [Particle, number][] = [];
        registry.add(particle, { updateForce: (p, dt) => void calls.push([p, dt]) });

        registry.updateForces(0.25);

        expect(calls).toEqual([[particle, 0.25]]);
    });

    it("runs a particle's generators in the order they were added", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        registry.add(p, recorder("a", log));
        registry.add(p, recorder("b", log));
        registry.add(p, recorder("c", log));

        registry.updateForces(1 / 60);

        expect(log).toEqual(["a", "b", "c"]);
    });

    it("groups generators by particle, in the order particles were first registered", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const q = new Particle();
        registry.add(p, recorder("p1", log));
        registry.add(q, recorder("q1", log));
        registry.add(p, recorder("p2", log));

        registry.updateForces(1 / 60);

        expect(log).toEqual(["p1", "p2", "q1"]);
    });

    it("shares one generator across particles", () => {
        const registry = new ParticleForceRegistry();
        const p = new Particle();
        const q = new Particle();
        const seen: Particle[] = [];
        const shared: ParticleForceGenerator = {
            updateForce: (particle) => void seen.push(particle),
        };
        registry.add(p, shared);
        registry.add(q, shared);

        registry.updateForces(1 / 60);

        expect(seen).toEqual([p, q]);
    });

    it("applies a pair added twice twice", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const g = recorder("g", log);
        registry.add(p, g);
        registry.add(p, g);

        registry.updateForces(1 / 60);

        expect(log).toEqual(["g", "g"]);
    });

    it("removes a registered pair", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const g = recorder("g", log);
        registry.add(p, g);

        expect(registry.remove(p, g)).toBe(true);
        expect(registry.remove(p, g)).toBe(false);
        registry.updateForces(1 / 60);

        expect(log).toEqual([]);
    });

    it("removes only the first of a duplicated pair", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const g = recorder("g", log);
        registry.add(p, g);
        registry.add(p, g);

        registry.remove(p, g);
        registry.updateForces(1 / 60);

        expect(log).toEqual(["g"]);
    });

    it("matches on both the particle and the generator", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const a = new Particle();
        const b = new Particle();
        const g = recorder("g", log);
        const h = recorder("h", log);
        registry.add(a, g);
        registry.add(b, h);

        expect(registry.remove(a, h)).toBe(false);
        expect(registry.remove(b, g)).toBe(false);
        expect(registry.remove(new Particle(), g)).toBe(false);
        registry.updateForces(1 / 60);

        expect(log).toEqual(["g", "h"]);
    });

    it("keeps the remaining order after a removal", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const b = recorder("b", log);
        registry.add(p, recorder("a", log));
        registry.add(p, b);
        registry.add(p, recorder("c", log));

        registry.remove(p, b);
        registry.updateForces(1 / 60);

        expect(log).toEqual(["a", "c"]);
    });

    it("removes every generator registered on a particle", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const a = new Particle();
        const b = new Particle();
        registry.add(a, recorder("a1", log));
        registry.add(b, recorder("b1", log));
        registry.add(a, recorder("a2", log));

        expect(registry.removeParticle(a)).toBe(true);
        expect(registry.removeParticle(a)).toBe(false);
        registry.updateForces(1 / 60);

        expect(log).toEqual(["b1"]);
    });

    it("finishes the step when a generator removes a later one", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const victim = recorder("victim", log);
        registry.add(p, { updateForce: () => void registry.remove(p, victim) });
        registry.add(p, victim);
        registry.add(p, recorder("after", log));

        registry.updateForces(1 / 60);
        registry.updateForces(1 / 60);

        expect(log).toEqual(["victim", "after", "after"]);
    });

    it("clears every registration", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        registry.add(p, recorder("a", log));
        registry.add(new Particle(), recorder("b", log));

        registry.clear();
        registry.updateForces(1 / 60);

        expect(registry.removeParticle(p)).toBe(false);
        expect(log).toEqual([]);
    });
});
