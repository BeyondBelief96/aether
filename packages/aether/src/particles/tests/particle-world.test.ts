import { describe, expect, it } from "vitest";
import { Particle } from "../particle";
import { ParticleWorld } from "../particle-world";
import { GroundContacts, ParticleContactResolver } from "../contacts";
import { ExplicitEuler, Rk4, SemiImplicitEuler, VelocityVerlet } from "../integrators";

describe("ParticleWorld", () => {
    it("starts empty and steps without particles", () => {
        const world = new ParticleWorld();
        expect(world.particles).toEqual([]);
        expect(() => world.step(1 / 60)).not.toThrow();
    });

    it("defaults to Earth gravity", () => {
        expect(new ParticleWorld().gravity).toBeCloseToVec3({ x: 0, y: -9.81, z: 0 });
    });

    it("integrates every particle", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        const a = new Particle();
        const b = new Particle();
        a.damping = b.damping = 1;
        a.velocity.set(1, 0, 0);
        b.velocity.set(0, 2, 0);
        world.particles.push(a, b);

        world.step(0.5);

        expect(a.position).toBeCloseToVec3({ x: 0.5, y: 0, z: 0 });
        expect(b.position).toBeCloseToVec3({ x: 0, y: 1, z: 0 });
    });

    it("matches integrating the particle directly with gravity as a force", () => {
        const world = new ParticleWorld();
        const inWorld = new Particle();
        const alone = new Particle();
        world.particles.push(inWorld);
        for (const p of [inWorld, alone]) {
            p.setMass(3);
            p.velocity.set(3, 4, 5);
        }

        for (let i = 0; i < 120; i++) {
            world.step(1 / 60);
            alone.addForce({ x: 0, y: -9.81 * 3, z: 0 });
            alone.integrate(1 / 60);
        }

        expect(inWorld.position).toBeCloseToVec3(alone.position);
        expect(inWorld.velocity).toBeCloseToVec3(alone.velocity);
    });

    it("stops stepping a particle once it is removed", () => {
        const world = new ParticleWorld();
        const p = new Particle();
        p.velocity.set(1, 0, 0);
        world.particles.push(p);
        world.step(1 / 60);
        const { x } = p.position;

        world.particles.length = 0;
        world.step(1 / 60);

        expect(p.position.x).toBe(x);
    });

    it("rejects a non-positive dt when it has particles", () => {
        const world = new ParticleWorld();
        world.particles.push(new Particle());
        expect(() => world.step(0)).toThrow(RangeError);
    });

    it("applies gravity scaled by each particle's gravityScale", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, -10, 0);
        const normal = new Particle();
        const floating = new Particle();
        const rising = new Particle();
        for (const p of [normal, floating, rising]) p.damping = 1;
        floating.gravityScale = 0;
        rising.gravityScale = -0.5;
        world.particles.push(normal, floating, rising);

        world.step(0.5);

        expect(normal.velocity.y).toBeCloseTo(-5, 12);
        expect(floating.velocity.y).toBeCloseTo(0, 12);
        expect(rising.velocity.y).toBeCloseTo(2.5, 12);
    });

    it("applies gravity independently of mass", () => {
        const world = new ParticleWorld();
        const light = new Particle();
        const heavy = new Particle();
        light.damping = heavy.damping = 1;
        heavy.setMass(1000);
        world.particles.push(light, heavy);

        world.step(0.5);

        expect(light.velocity.y).toBeCloseTo(-4.905, 12);
        expect(heavy.velocity.y).toBeCloseTo(-4.905, 12);
    });

    it("leaves immovable particles and their accumulator untouched by gravity", () => {
        const world = new ParticleWorld();
        const anchor = new Particle();
        anchor.setMass(Infinity);
        anchor.position.set(1, 2, 3);
        world.particles.push(anchor);

        for (let i = 0; i < 60; i++) world.step(1 / 60);

        expect(anchor.position).toBeCloseToVec3({ x: 1, y: 2, z: 3 });
        expect(Number.isFinite(anchor.forceAccum.y)).toBe(true);
    });

    it("applies forces before integrating", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        const p = new Particle();
        p.damping = 1;
        world.particles.push(p);
        world.forceRegistry.add(p, {
            updateForce: (particle) => particle.addForce({ x: 2, y: 0, z: 0 }),
        });

        world.step(0.5);

        expect(p.velocity).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("removes a particle and stops stepping it", () => {
        const world = new ParticleWorld();
        const kept = new Particle();
        const removed = new Particle();
        world.particles.push(kept, removed);

        expect(world.remove(removed)).toBe(true);
        world.step(1 / 60);

        expect(world.particles).toEqual([kept]);
        expect(removed.position).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("drops the forces registered on a removed particle", () => {
        const world = new ParticleWorld();
        const a = new Particle();
        const b = new Particle();
        world.particles.push(a, b);
        const calls: string[] = [];
        world.forceRegistry.add(a, { updateForce: () => void calls.push("on a") });
        world.forceRegistry.add(b, { updateForce: () => void calls.push("on b") });

        world.remove(a);
        world.step(1 / 60);

        expect(calls).toEqual(["on b"]);
    });

    it("leaves forces alone when removing a particle it does not contain", () => {
        const world = new ParticleWorld();
        const outsider = new Particle();
        const calls: string[] = [];
        world.forceRegistry.add(outsider, { updateForce: () => void calls.push("outsider") });

        expect(world.remove(outsider)).toBe(false);
        world.step(1 / 60);

        expect(calls).toEqual(["outsider"]);
    });

    it.each([new SemiImplicitEuler(), new ExplicitEuler(), new VelocityVerlet(), new Rk4()])(
        "records lastAcceleration from gravity and applied forces with $name",
        (integrator) => {
            const world = new ParticleWorld();
            world.integrator = integrator;
            const p = new Particle();
            p.setMass(2);
            const wall = new Particle();
            wall.inverseMass = 0;
            world.particles.push(p, wall);

            p.addForce({ x: 4, y: 0, z: 0 });
            wall.addForce({ x: 4, y: 0, z: 0 });
            world.step(1 / 60);

            expect(p.lastAcceleration).toBeCloseToVec3({ x: 2, y: -9.81, z: 0 });
            expect(wall.lastAcceleration).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
            expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        },
    );

    it.each([{ maxContacts: -1 }, { maxContacts: 1.5 }, { resolverIterations: -1 }])(
        "rejects %o",
        (options) => {
            expect(() => new ParticleWorld(options)).toThrow(RangeError);
        },
    );

    it("keeps a particle on GroundContacts still for 1,000 steps", () => {
        const world = new ParticleWorld();
        const ball = new Particle();
        world.particles.push(ball);
        world.contactGenerators.push(new GroundContacts(world.particles, 0, 0.5));

        let maxSpeed = 0;
        for (let i = 0; i < 1000; i++) {
            world.step(1 / 60);
            maxSpeed = Math.max(maxSpeed, ball.velocity.magnitude());
        }

        expect(maxSpeed).toBeLessThan(1e-9);
        expect(ball.position.y).toBeCloseTo(0, 9);
    });

    it("bounces a dropped particle and lets it settle", () => {
        const world = new ParticleWorld();
        const ball = new Particle();
        ball.damping = 1;
        ball.position.set(0, 2, 0);
        world.particles.push(ball);
        world.contactGenerators.push(new GroundContacts(world.particles, 0, 0.5));

        let rose = false;
        for (let i = 0; i < 600; i++) {
            const before = ball.velocity.y;
            world.step(1 / 60);
            if (before < -1 && ball.velocity.y > 1) rose = true;
            expect(ball.position.y).toBeGreaterThanOrEqual(-1e-9);
        }

        expect(rose).toBe(true);
        expect(Math.abs(ball.velocity.y)).toBeLessThan(1e-6);
    });

    it("records how many contacts the last step found", () => {
        const world = new ParticleWorld();
        const low = new Particle();
        const high = new Particle();
        low.position.set(0, -1, 0);
        high.position.set(0, 5, 0);
        world.particles.push(low, high);
        world.contactGenerators.push(new GroundContacts(world.particles));

        world.step(1 / 60);
        expect(world.contactCount).toBe(1);
        expect(world.contacts[0]!.particleA).toBe(low);
    });

    it("drops contacts past maxContacts without crashing", () => {
        const world = new ParticleWorld({ maxContacts: 2 });
        for (let i = 0; i < 5; i++) {
            const p = new Particle();
            p.position.set(i, -1, 0);
            world.particles.push(p);
        }
        world.contactGenerators.push(
            new GroundContacts(world.particles),
            new GroundContacts(world.particles),
        );

        expect(() => world.step(1 / 60)).not.toThrow();
        expect(world.contactCount).toBe(2);
        expect(world.particles[0]!.position.y).toBeCloseTo(0);
        expect(world.particles[4]!.position.y).toBeLessThan(0);
    });

    it("resolves with twice the contact count unless resolverIterations is given", () => {
        const sink = (world: ParticleWorld) => {
            for (let i = 0; i < 3; i++) {
                const p = new Particle();
                p.position.set(i, -1, 0);
                world.particles.push(p);
            }
            world.contactGenerators.push(new GroundContacts(world.particles));
            world.step(1 / 60);
            return world;
        };

        const auto = sink(new ParticleWorld());
        expect(auto.contactResolver.iterationsUsed).toBe(3);
        for (const p of auto.particles) expect(p.position.y).toBeCloseTo(0);

        const capped = sink(new ParticleWorld({ resolverIterations: 1 }));
        expect(capped.contactResolver.iterationsUsed).toBe(1);
        expect(capped.particles.filter((p) => p.position.y < -0.5)).toHaveLength(2);
    });

    it("uses a resolver swapped in between steps", () => {
        const world = new ParticleWorld();
        const ball = new Particle();
        ball.position.set(0, -1, 0);
        world.particles.push(ball);
        world.contactGenerators.push(new GroundContacts(world.particles));
        world.step(1 / 60);

        const resolver = new ParticleContactResolver(0);
        world.contactResolver = resolver;
        ball.position.set(0, -1, 0);
        world.step(1 / 60);
        expect(resolver.iterationLimit).toBe(0);
        expect(ball.position.y).toBeLessThan(-0.5);
    });

    it("names resolverIterations when rejecting it", () => {
        expect(() => new ParticleWorld({ resolverIterations: -1 })).toThrow(/resolverIterations/);
    });

    it("resets the contact count and resolver iterations on a step with no contacts", () => {
        const world = new ParticleWorld();
        const ball = new Particle();
        ball.position.set(0, -1, 0);
        world.particles.push(ball);
        world.contactGenerators.push(new GroundContacts(world.particles));
        world.step(1 / 60);

        ball.position.set(0, 10, 0);
        world.step(1 / 60);
        expect(world.contactCount).toBe(0);
        expect(world.contactResolver.iterationsUsed).toBe(0);
    });

    it("clamps a generator that reports more contacts than fit", () => {
        const world = new ParticleWorld({ maxContacts: 1 });
        const ball = new Particle();
        ball.position.set(0, -1, 0);
        world.particles.push(ball);
        const ground = new GroundContacts(world.particles);
        world.contactGenerators.push({
            addContacts: (out, start) => ground.addContacts(out, start) + 4,
        });

        expect(() => world.step(1 / 60)).not.toThrow();
        expect(world.contactCount).toBe(1);
    });
});
