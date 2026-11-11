import { describe, expect, it } from "vitest";
import { Particle, ParticleWorld } from "../..";
import { Vec3 } from "../../../math";
import { ParticleGravity } from "../gravity";

const G = { x: 0, y: -9.81, z: 0 };

/** A particle at rest at the origin with no damping. */
function undamped(mass = 1): Particle {
    const p = new Particle();
    p.damping = 1;
    p.setMass(mass);
    return p;
}

describe("ParticleGravity", () => {
    it("adds mass times the acceleration as a force", () => {
        const p = undamped(2);
        new ParticleGravity(G).updateForce(p, 1 / 60);
        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: -19.62, z: 0 });
    });

    it("adds the same force on every call", () => {
        const gravity = new ParticleGravity(G);
        const p = undamped(2);

        for (let i = 0; i < 3; i++) {
            p.clearAccumulator();
            gravity.updateForce(p, 1 / 60);
            expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: -19.62, z: 0 });
        }
    });

    it("copies the acceleration it is given", () => {
        const source = new Vec3(0, -9.81, 0);
        const gravity = new ParticleGravity(source);
        source.set(0, 100, 0);

        const p = undamped();
        gravity.updateForce(p, 1 / 60);

        expect(p.forceAccum).toBeCloseToVec3(G);
    });

    it("does not modify the vector it is given", () => {
        const source = new Vec3(0, -9.81, 0);
        const gravity = new ParticleGravity(source);

        gravity.updateForce(undamped(5), 1 / 60);

        expect(source).toBeCloseToVec3(G);
    });

    it("skips immovable particles", () => {
        const p = undamped();
        p.setMass(Infinity);

        new ParticleGravity(G).updateForce(p, 1 / 60);

        expect(p.forceAccum).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        expect(Number.isFinite(p.forceAccum.y)).toBe(true);
    });

    it("matches the world's built-in gravity", () => {
        const world = new ParticleWorld();
        world.gravity.copy(G);
        const withGenerator = undamped(3);
        const withWorldGravity = undamped(3);
        withGenerator.gravityScale = 0;
        for (const p of [withGenerator, withWorldGravity]) p.velocity.set(2, 5, 0);
        world.particles.push(withGenerator, withWorldGravity);
        world.forceRegistry.add(withGenerator, new ParticleGravity(G));

        for (let i = 0; i < 120; i++) world.step(1 / 60);

        expect(withGenerator.position).toBeCloseToVec3(withWorldGravity.position);
        expect(withGenerator.velocity).toBeCloseToVec3(withWorldGravity.velocity);
    });

    it("makes light and heavy particles fall at the same rate", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        const gravity = new ParticleGravity(G);
        const light = undamped(1);
        const heavy = undamped(50);
        world.particles.push(light, heavy);
        world.forceRegistry.add(light, gravity);
        world.forceRegistry.add(heavy, gravity);

        for (let i = 0; i < 60; i++) world.step(1 / 60);

        expect(heavy.position).toBeCloseToVec3(light.position);
        expect(light.position.y).toBeLessThan(-4);
    });

    it("leaves immovable particles in place inside a world", () => {
        const world = new ParticleWorld();
        world.gravity.set(0, 0, 0);
        const anchor = undamped();
        anchor.setMass(Infinity);
        anchor.position.set(1, 2, 3);
        world.particles.push(anchor);
        world.forceRegistry.add(anchor, new ParticleGravity(G));

        for (let i = 0; i < 60; i++) world.step(1 / 60);

        expect(anchor.position).toBeCloseToVec3({ x: 1, y: 2, z: 3 });
    });
});
