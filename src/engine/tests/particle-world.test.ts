import { describe, expect, it } from "vitest";
import { Particle } from "../particle";
import { ParticleWorld } from "../particle-world";

describe("ParticleWorld", () => {
    it("starts empty and steps without particles", () => {
        const world = new ParticleWorld();
        expect(world.particles).toEqual([]);
        expect(() => world.step(1 / 60)).not.toThrow();
    });

    it("integrates every particle", () => {
        const world = new ParticleWorld();
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

    it("matches integrating the particle directly", () => {
        const world = new ParticleWorld();
        const inWorld = new Particle();
        const alone = new Particle();
        world.particles.push(inWorld);
        for (const p of [inWorld, alone]) {
            p.velocity.set(3, 4, 5);
            p.acceleration.set(0, -9.81, 0);
        }

        for (let i = 0; i < 120; i++) {
            world.step(1 / 60);
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
});
