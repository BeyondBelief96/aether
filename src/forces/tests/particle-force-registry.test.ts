import { describe, expect, it } from "vitest";
import { Particle } from "../../engine";
import type { ParticleForce, ParticleForceGenerator } from "../particle-force";
import { ParticleForceRegistry } from "../particle-force-registry";

/** A force on `particles` that records each call into `log`. */
function force(particles: Particle[], name: string, log: string[]): ParticleForce {
    return { particles, apply: () => void log.push(name) };
}

/** A generator that records each call into `log`. */
function recorder(name: string, log: string[]): ParticleForceGenerator {
    return { updateForce: () => void log.push(name) };
}

describe("ParticleForceRegistry", () => {
    it("starts empty", () => {
        const registry = new ParticleForceRegistry();
        expect(registry.size).toBe(0);
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

    it("passes dt to forces that hold their own particles", () => {
        const registry = new ParticleForceRegistry();
        const calls: number[] = [];
        registry.add({ particles: [], apply: (dt) => void calls.push(dt) });

        registry.updateForces(0.25);

        expect(calls).toEqual([0.25]);
    });

    it("runs both kinds of registration in the order they were added", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const a = new Particle();
        const b = new Particle();
        registry.add(a, recorder("generator", log));
        registry.add(force([a, b], "pair", log));
        registry.add(b, recorder("generator 2", log));

        registry.updateForces(1 / 60);

        expect(log).toEqual(["generator", "pair", "generator 2"]);
    });

    it("applies a generator pair added twice twice", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const g = recorder("g", log);
        registry.add(p, g);
        registry.add(p, g);

        registry.updateForces(1 / 60);

        expect(registry.size).toBe(2);
        expect(log).toEqual(["g", "g"]);
    });

    it("ignores a force added again", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const f = force([new Particle()], "f", log);

        expect(registry.add(f)).toBe(f);
        expect(registry.add(f)).toBe(f);
        registry.updateForces(1 / 60);

        expect(registry.size).toBe(1);
        expect(log).toEqual(["f"]);
    });

    it("removes a generator registration by its handle", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const g = recorder("g", log);
        const first = registry.add(p, g);
        registry.add(p, g);

        expect(registry.remove(first)).toBe(true);
        expect(registry.remove(first)).toBe(false);
        registry.updateForces(1 / 60);

        expect(registry.size).toBe(1);
        expect(log).toEqual(["g"]);
    });

    it("removes a force by reference", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const f = force([new Particle(), new Particle()], "pair", log);
        registry.add(f);

        expect(registry.remove(f)).toBe(true);
        expect(registry.remove(f)).toBe(false);
        registry.updateForces(1 / 60);

        expect(log).toEqual([]);
    });

    it("leaves everything in place when removing an unregistered force", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        registry.add(force([], "a", log));

        expect(registry.remove(force([], "missing", log))).toBe(false);
        registry.updateForces(1 / 60);

        expect(log).toEqual(["a"]);
    });

    it("keeps the remaining order after a removal", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        registry.add(p, recorder("a", log));
        const b = registry.add(p, recorder("b", log));
        registry.add(p, recorder("c", log));
        registry.add(p, recorder("d", log));

        registry.remove(b);
        registry.updateForces(1 / 60);

        expect(log).toEqual(["a", "c", "d"]);
    });

    it("removes every force acting on a particle and keeps the rest in order", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const a = new Particle();
        const b = new Particle();
        const c = new Particle();
        registry.add(a, recorder("on a", log));
        registry.add(b, recorder("on b", log));
        registry.add(force([a, c], "a–c", log));
        registry.add(force([b, c], "b–c", log));
        registry.add(c, recorder("on c", log));

        expect(registry.removeParticle(a)).toBe(2);
        expect(registry.removeParticle(a)).toBe(0);
        registry.updateForces(1 / 60);

        expect(registry.size).toBe(3);
        expect(log).toEqual(["on b", "b–c", "on c"]);
    });

    it("drops a removed force from the index of its other particles", () => {
        const registry = new ParticleForceRegistry();
        const a = new Particle();
        const b = new Particle();
        registry.add(force([a, b], "a–b", []));

        registry.removeParticle(a);

        expect(registry.removeParticle(b)).toBe(0);
    });

    it("removes nothing for a particle with no forces", () => {
        const registry = new ParticleForceRegistry();
        registry.add(new Particle(), recorder("a", []));
        expect(registry.removeParticle(new Particle())).toBe(0);
        expect(registry.size).toBe(1);
    });

    it("skips a force removed by an earlier force in the same step", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        let victim: ParticleForce | undefined;
        registry.add(p, { updateForce: () => void (victim && registry.remove(victim)) });
        victim = registry.add(p, recorder("victim", log));
        registry.add(p, recorder("after", log));

        registry.updateForces(1 / 60);
        registry.updateForces(1 / 60);

        expect(registry.size).toBe(2);
        expect(log).toEqual(["after", "after"]);
    });

    it("runs a force added by an earlier force in the same step", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const late = force([], "late", log);
        registry.add(force([], "early", log)).apply = () => {
            log.push("early");
            registry.add(late);
        };

        registry.updateForces(1 / 60);

        expect(log).toEqual(["early", "late"]);
    });

    it("keeps order across removals and later additions", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        const q = new Particle();
        registry.add(p, recorder("a", log));
        registry.add(q, recorder("b", log));
        registry.removeParticle(p);
        registry.add(p, recorder("c", log));

        registry.updateForces(1 / 60);

        expect(log).toEqual(["b", "c"]);
    });

    it("clears every registration", () => {
        const registry = new ParticleForceRegistry();
        const log: string[] = [];
        const p = new Particle();
        registry.add(p, recorder("a", log));
        registry.add(force([p], "b", log));

        registry.clear();
        registry.updateForces(1 / 60);

        expect(registry.size).toBe(0);
        expect(registry.removeParticle(p)).toBe(0);
        expect(log).toEqual([]);
    });
});
