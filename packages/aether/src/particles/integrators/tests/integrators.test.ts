import { describe, expect, it } from "vitest";
import { Particle, ParticleWorld } from "../..";
import type { ParticleForceGenerator } from "../../forces";
import type { ParticleIntegrator } from "..";
import { ExplicitEuler, Rk4, SemiImplicitEuler, VelocityVerlet } from "..";

const ALL: [string, () => ParticleIntegrator][] = [
    ["SemiImplicitEuler", () => new SemiImplicitEuler()],
    ["ExplicitEuler", () => new ExplicitEuler()],
    ["VelocityVerlet", () => new VelocityVerlet()],
    ["Rk4", () => new Rk4()],
];

/** Pulls toward the origin with `−k·x`. */
function hookeToOrigin(k: number): ParticleForceGenerator {
    return {
        updateForce: (p) =>
            p.addForce({ x: -k * p.position.x, y: -k * p.position.y, z: -k * p.position.z }),
    };
}

/** A world with no gravity and one undamped particle of mass 1 on `x(0) = 1`, `k = 1`. */
function oscillator(integrator: ParticleIntegrator): { world: ParticleWorld; p: Particle } {
    const world = new ParticleWorld();
    world.gravity.set(0, 0, 0);
    world.integrator = integrator;
    const p = new Particle();
    p.damping = 1;
    p.position.set(1, 0, 0);
    world.particles.push(p);
    world.forceRegistry.add(p, hookeToOrigin(1));
    return { world, p };
}

/** Error in x at `t = 10` for the unit oscillator, whose exact solution is `cos t`. */
function oscillatorError(integrator: ParticleIntegrator, dt: number): number {
    const { world, p } = oscillator(integrator);
    const steps = Math.round(10 / dt);
    for (let i = 0; i < steps; i++) world.step(dt);
    return Math.abs(p.position.x - Math.cos(steps * dt));
}

describe.each(ALL)("%s", (_name, make) => {
    it("moves a free particle at constant velocity", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        world.integrator = make();
        const p = new Particle();
        p.damping = 1;
        p.velocity.set(1, -2, 3);
        world.particles.push(p);

        for (let i = 0; i < 60; i++) world.step(1 / 60);

        expect(p.position).toBeCloseToVec3({ x: 1, y: -2, z: 3 });
        expect(p.velocity).toBeCloseToVec3({ x: 1, y: -2, z: 3 });
    });

    it("keeps the fraction `damping` of velocity per second", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        world.integrator = make();
        const p = new Particle();
        p.damping = 0.5;
        p.velocity.set(10, 0, 0);
        world.particles.push(p);

        for (let i = 0; i < 60; i++) world.step(1 / 60);

        expect(p.velocity.x).toBeCloseTo(5, 9);
    });

    it("never moves an immovable particle", () => {
        const world = new ParticleWorld();
        world.integrator = make();
        const p = new Particle();
        p.setMass(Infinity);
        p.position.set(1, 2, 3);
        p.velocity.set(5, 5, 5);
        world.particles.push(p);
        world.forceRegistry.add(p, hookeToOrigin(100));

        for (let i = 0; i < 60; i++) world.step(1 / 60);

        expect(p.position).toBeCloseToVec3({ x: 1, y: 2, z: 3 });
        expect(p.velocity).toBeCloseToVec3({ x: 5, y: 5, z: 5 });
    });

    it("clears the accumulators after the step", () => {
        const world = new ParticleWorld();
        world.integrator = make();
        const p = new Particle();
        world.particles.push(p);
        p.addForce({ x: 1, y: 0, z: 0 });

        world.step(1 / 60);

        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("conserves the momentum of a free pair joined by springs", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        world.integrator = make();
        const a = new Particle();
        const b = new Particle();
        a.damping = b.damping = 1;
        b.setMass(3);
        a.position.set(-1, 0, 0);
        b.position.set(1, 0.5, 0);
        a.velocity.set(0, 2, 0);
        b.velocity.set(0, -2 / 3, 0);
        world.particles.push(a, b);
        const k = 20;
        const pull = (other: Particle): ParticleForceGenerator => ({
            updateForce: (p) =>
                p.addForce({
                    x: k * (other.position.x - p.position.x),
                    y: k * (other.position.y - p.position.y),
                    z: k * (other.position.z - p.position.z),
                }),
        });
        world.forceRegistry.add(a, pull(b));
        world.forceRegistry.add(b, pull(a));

        for (let i = 0; i < 600; i++) world.step(1 / 60);

        expect(a.velocity.x * a.mass + b.velocity.x * b.mass).toBeCloseTo(0, 9);
        expect(a.velocity.y * a.mass + b.velocity.y * b.mass).toBeCloseTo(0, 9);
    });
});

describe("force evaluations per step", () => {
    it.each([
        ["SemiImplicitEuler", new SemiImplicitEuler(), 1],
        ["ExplicitEuler", new ExplicitEuler(), 1],
        ["VelocityVerlet", new VelocityVerlet(), 2],
        ["Rk4", new Rk4(), 4],
    ] as const)("%s evaluates forces %i time(s)", (_name, integrator, expected) => {
        const world = new ParticleWorld();
        world.integrator = integrator;
        const p = new Particle();
        world.particles.push(p);
        let calls = 0;
        world.forceRegistry.add(p, { updateForce: () => void calls++ });

        world.step(1 / 60);

        expect(calls).toBe(expected);
        expect(integrator.evaluationsPerStep).toBe(expected);
    });
});

describe("constant acceleration", () => {
    const a = -9.81;
    const v0 = 12;
    const dt = 1 / 60;
    const steps = 600;
    const t = steps * dt;
    const exact = v0 * t + 0.5 * a * t * t;

    function fall(integrator: ParticleIntegrator): number {
        const world = new ParticleWorld();
        world.gravity.set(0, a, 0);
        world.integrator = integrator;
        const p = new Particle();
        p.damping = 1;
        p.velocity.set(0, v0, 0);
        world.particles.push(p);
        for (let i = 0; i < steps; i++) world.step(dt);
        return p.position.y;
    }

    it("is exact for velocity Verlet and RK4", () => {
        expect(fall(new VelocityVerlet())).toBeCloseTo(exact, 9);
        expect(fall(new Rk4())).toBeCloseTo(exact, 9);
    });

    it("is off by ½·a·dt·t for semi-implicit Euler and by −½·a·dt·t for explicit Euler", () => {
        expect(fall(new SemiImplicitEuler()) - exact).toBeCloseTo(0.5 * a * dt * t, 9);
        expect(fall(new ExplicitEuler()) - exact).toBeCloseTo(-0.5 * a * dt * t, 9);
    });

    it("holds a force added before the step through every evaluation", () => {
        for (const integrator of [new VelocityVerlet(), new Rk4()]) {
            const world = new ParticleWorld();
            world.gravity.set(0, 0, 0);
            world.integrator = integrator;
            const p = new Particle();
            p.damping = 1;
            world.particles.push(p);

            p.addForce({ x: 2, y: 0, z: 0 });
            world.step(0.5);

            expect(p.position.x).toBeCloseTo(0.25, 12);
            expect(p.velocity.x).toBeCloseTo(1, 12);
        }
    });
});

describe("convergence on a harmonic oscillator", () => {
    it("RK4's error falls about 16× when dt halves", () => {
        const ratio = oscillatorError(new Rk4(), 0.1) / oscillatorError(new Rk4(), 0.05);
        expect(ratio).toBeGreaterThan(14);
        expect(ratio).toBeLessThan(18);
    });

    it("velocity Verlet's error falls about 4× when dt halves", () => {
        const ratio =
            oscillatorError(new VelocityVerlet(), 0.1) /
            oscillatorError(new VelocityVerlet(), 0.05);
        expect(ratio).toBeGreaterThan(3.5);
        expect(ratio).toBeLessThan(4.5);
    });

    it("explicit Euler gains energy while semi-implicit Euler keeps it bounded", () => {
        const energy = (p: Particle) => 0.5 * p.velocity.x ** 2 + 0.5 * p.position.x ** 2;
        const explicit = oscillator(new ExplicitEuler());
        const semi = oscillator(new SemiImplicitEuler());
        for (let i = 0; i < 2000; i++) {
            explicit.world.step(0.05);
            semi.world.step(0.05);
        }
        expect(energy(explicit.p)).toBeGreaterThan(2 * 0.5);
        expect(Math.abs(energy(semi.p) / 0.5 - 1)).toBeLessThan(0.05);
    });
});

describe("switching integrators", () => {
    it("continues from the current state", () => {
        const { world, p } = oscillator(new Rk4());
        for (let i = 0; i < 50; i++) world.step(0.01);
        const before = { x: p.position.x, v: p.velocity.x };

        world.integrator = new SemiImplicitEuler();
        world.step(0.01);

        // One semi-implicit step from the RK4 state, with F = −x.
        const v = before.v - before.x * 0.01;
        expect(p.velocity.x).toBeCloseTo(v, 12);
        expect(p.position.x).toBeCloseTo(before.x + v * 0.01, 12);
    });
});
