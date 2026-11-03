import { describe, expect, it } from "vitest";
import { Particle } from "./particle";

/** A particle at rest at the origin with no damping. */
function undamped(): Particle {
    const p = new Particle();
    p.damping = 1;
    return p;
}

describe("Particle mass", () => {
    it("defaults to a mass of 1 kg", () => {
        const p = new Particle();
        expect(p.mass).toBe(1);
        expect(p.inverseMass).toBe(1);
        expect(p.hasFiniteMass()).toBe(true);
    });

    it("stores the reciprocal of the mass", () => {
        const p = new Particle();
        p.setMass(4);
        expect(p.inverseMass).toBe(0.25);
        expect(p.mass).toBe(4);
    });

    it("treats infinite mass as an inverse mass of 0", () => {
        const p = new Particle();
        p.setMass(Infinity);
        expect(p.inverseMass).toBe(0);
        expect(p.mass).toBe(Infinity);
        expect(p.hasFiniteMass()).toBe(false);
    });

    it.each([0, -1, NaN])("rejects a mass of %s", (mass) => {
        const p = new Particle();
        expect(() => p.setMass(mass)).toThrow(RangeError);
        expect(p.inverseMass).toBe(1);
    });
});

describe("Particle forces", () => {
    it("accumulates forces until integrated", () => {
        const p = new Particle();
        p.addForce({ x: 1, y: 2, z: 3 });
        p.addForce({ x: 1, y: 0, z: -3 });
        expect(p.forceAccum).toBeCloseToVec3({ x: 2, y: 2, z: 0 });
    });

    it("does not keep a reference to the force argument", () => {
        const p = new Particle();
        const force = { x: 1, y: 0, z: 0 };
        p.addForce(force);
        force.x = 99;
        expect(p.forceAccum.x).toBe(1);
    });

    it("clears the accumulator on request", () => {
        const p = new Particle();
        p.addForce({ x: 1, y: 2, z: 3 });
        p.clearAccumulator();
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("applies force divided by mass", () => {
        const p = undamped();
        p.setMass(2);
        p.addForce({ x: 10, y: 0, z: 0 });
        p.integrate(0.5);
        expect(p.velocity.x).toBeCloseTo(2.5, 12);
    });

    it("applies acceleration independently of mass", () => {
        const light = undamped();
        const heavy = undamped();
        heavy.setMass(1000);
        for (const p of [light, heavy]) {
            p.acceleration.set(0, -10, 0);
            p.integrate(0.5);
        }
        expect(light.velocity.y).toBeCloseTo(-5, 12);
        expect(heavy.velocity.y).toBeCloseTo(-5, 12);
    });

    it("clears forces after each step, so a force lasts one step", () => {
        const p = undamped();
        p.addForce({ x: 1, y: 0, z: 0 });
        p.integrate(1);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        p.integrate(1);
        expect(p.velocity.x).toBeCloseTo(1, 12);
    });
});

describe("Particle.integrate", () => {
    it("moves the position with the updated velocity", () => {
        const p = undamped();
        p.velocity.set(1, 0, 0);
        p.acceleration.set(2, 0, 0);
        p.integrate(0.5);
        expect(p.velocity.x).toBeCloseTo(2, 12);
        expect(p.position.x).toBeCloseTo(1, 12);
    });

    it("is off from the exact constant-acceleration result by ½·a·dt·t", () => {
        const a = -9.81;
        const v0 = 12;
        const dt = 1 / 60;
        const steps = 600;
        const t = steps * dt;
        const p = undamped();
        p.velocity.set(0, v0, 0);
        p.acceleration.set(0, a, 0);
        for (let i = 0; i < steps; i++) p.integrate(dt);

        const exact = v0 * t + 0.5 * a * t * t;
        expect(p.position.y - exact).toBeCloseTo(0.5 * a * dt * t, 9);
    });

    it.each([0, -1 / 60, NaN])("rejects a dt of %s", (dt) => {
        const p = new Particle();
        p.velocity.set(1, 0, 0);
        expect(() => p.integrate(dt)).toThrow(RangeError);
        expect(p.position.x).toBe(0);
    });
});

describe("immovable particles", () => {
    it("never move under forces, acceleration or their own velocity", () => {
        const p = new Particle();
        p.inverseMass = 0;
        p.position.set(1, 2, 3);
        p.velocity.set(5, 5, 5);
        p.acceleration.set(0, -10, 0);
        for (let i = 0; i < 100; i++) {
            p.addForce({ x: 1e6, y: 1e6, z: 1e6 });
            p.integrate(1 / 60);
        }
        expect(p.position).toBeCloseToVec3({ x: 1, y: 2, z: 3 });
        expect(p.velocity).toBeCloseToVec3({ x: 5, y: 5, z: 5 });
    });

    it("still clear their accumulator", () => {
        const p = new Particle();
        p.inverseMass = 0;
        p.addForce({ x: 1, y: 1, z: 1 });
        p.integrate(1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });
});

describe("damping", () => {
    it.each([30, 60, 120, 240])(
        "keeps the fraction `damping` of velocity per second at %i Hz",
        (hz) => {
            const p = new Particle();
            p.damping = 0.5;
            p.velocity.set(10, 0, 0);
            for (let i = 0; i < hz; i++) p.integrate(1 / hz);
            expect(p.velocity.x).toBeCloseTo(5, 9);
        },
    );

    it("stops the particle after one step at a damping of 0", () => {
        const p = new Particle();
        p.damping = 0;
        p.velocity.set(10, 0, 0);
        p.integrate(1 / 60);
        expect(p.velocity.x).toBe(0);
        expect(p.position.x).toBe(0);
    });

    it("leaves velocity unchanged at a damping of 1", () => {
        const p = undamped();
        p.velocity.set(10, 0, 0);
        for (let i = 0; i < 60; i++) p.integrate(1 / 60);
        expect(p.velocity.x).toBe(10);
    });
});

describe("a particle on a spring", () => {
    it("keeps its energy in a bounded band over 10,000 steps", () => {
        const k = 40;
        const p = undamped();
        p.position.set(1, 0, 0);
        const initial = 0.5 * k;

        for (let i = 0; i < 10_000; i++) {
            p.addForce({ x: -k * p.position.x, y: 0, z: 0 });
            p.integrate(1 / 60);
            const energy =
                0.5 * p.velocity.x ** 2 + 0.5 * k * p.position.x ** 2;
            expect(Math.abs(energy / initial - 1)).toBeLessThan(0.11);
        }
    });
});
