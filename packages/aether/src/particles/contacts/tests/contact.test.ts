import { describe, expect, it } from "vitest";
import { Particle, ParticleWorld } from "../..";
import { ParticleContact } from "../contact";

const DT = 1 / 60;

/** A particle with mass `mass` moving at `(vx, vy, vz)`. */
function moving(vx: number, vy: number, vz: number, mass = 1): Particle {
    const p = new Particle();
    p.setMass(mass);
    p.velocity.set(vx, vy, vz);
    return p;
}

/** Momentum `m · v` of each particle, summed. */
function momentum(...particles: Particle[]): { x: number; y: number; z: number } {
    const total = { x: 0, y: 0, z: 0 };
    for (const p of particles) {
        total.x += p.mass * p.velocity.x;
        total.y += p.mass * p.velocity.y;
        total.z += p.mass * p.velocity.z;
    }
    return total;
}

describe("ParticleContact.set", () => {
    it("overwrites every field and returns the contact", () => {
        const a = moving(0, 0, 0);
        const b = moving(0, 0, 0);
        const contact = new ParticleContact();

        expect(contact.set(a, b, { x: 0, y: 1, z: 0 }, 0.1, 0.5)).toBe(contact);
        expect(contact.particleA).toBe(a);
        expect(contact.particleB).toBe(b);
        expect(contact.normal).toBeCloseToVec3({ x: 0, y: 1, z: 0 });
        expect(contact.penetration).toBe(0.1);
        expect(contact.restitution).toBe(0.5);
    });

    it("copies the normal rather than keeping the caller's vector", () => {
        const normal = { x: 1, y: 0, z: 0 };
        const contact = new ParticleContact().set(moving(0, 0, 0), null, normal, 0, 0);

        normal.x = 5;
        expect(contact.normal).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
    });

    it("clears particleB when reused for scenery", () => {
        const contact = new ParticleContact().set(
            moving(0, 0, 0),
            moving(0, 0, 0),
            { x: 0, y: 1, z: 0 },
            0,
            0,
        );
        contact.set(moving(0, 0, 0), null, { x: 0, y: 1, z: 0 }, 0, 0);
        expect(contact.particleB).toBeNull();
    });
});

describe("ParticleContact.separatingVelocity", () => {
    it("is negative when the particles approach along the normal", () => {
        // Normal from B toward A, A on the +x side moving −x.
        const contact = new ParticleContact().set(
            moving(-2, 0, 0),
            moving(1, 0, 0),
            { x: 1, y: 0, z: 0 },
            0,
            0,
        );
        expect(contact.separatingVelocity()).toBeCloseTo(-3);
    });

    it("is positive when the particles move apart", () => {
        const contact = new ParticleContact().set(
            moving(2, 0, 0),
            moving(-1, 0, 0),
            { x: 1, y: 0, z: 0 },
            0,
            0,
        );
        expect(contact.separatingVelocity()).toBeCloseTo(3);
    });

    it("ignores velocity perpendicular to the normal", () => {
        const contact = new ParticleContact().set(
            moving(5, -1, 3),
            moving(-4, 0, 7),
            { x: 0, y: 1, z: 0 },
            0,
            0,
        );
        expect(contact.separatingVelocity()).toBeCloseTo(-1);
    });

    it("treats a null particleB as stationary", () => {
        const contact = new ParticleContact().set(
            moving(0, -4, 0),
            null,
            { x: 0, y: 1, z: 0 },
            0,
            0,
        );
        expect(contact.separatingVelocity()).toBeCloseTo(-4);
    });

    it("does not change either particle's velocity", () => {
        const a = moving(-2, 1, 0);
        const b = moving(1, 0, 3);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 0, 0).separatingVelocity();

        expect(a.velocity).toBeCloseToVec3({ x: -2, y: 1, z: 0 });
        expect(b.velocity).toBeCloseToVec3({ x: 1, y: 0, z: 3 });
    });
});

describe("ParticleContact.resolve, velocity", () => {
    it("swaps the velocities of equal masses with restitution 1", () => {
        const a = moving(-1, 0, 0);
        const b = moving(2, 0, 0);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 0, 1).resolve(DT);

        expect(a.velocity).toBeCloseToVec3({ x: 2, y: 0, z: 0 });
        expect(b.velocity).toBeCloseToVec3({ x: -1, y: 0, z: 0 });
    });

    it("leaves equal masses moving together with restitution 0", () => {
        const a = moving(-1, 0, 0);
        const b = moving(3, 0, 0);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 0, 0).resolve(DT);

        expect(a.velocity).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
        expect(b.velocity).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
    });

    it("sets the separating velocity to −restitution times the closing velocity", () => {
        const contact = new ParticleContact().set(
            moving(-1, 0, 0, 2),
            moving(3, 0, 0, 5),
            { x: 1, y: 0, z: 0 },
            0,
            0.5,
        );
        const before = contact.separatingVelocity();
        contact.resolve(DT);
        expect(contact.separatingVelocity()).toBeCloseTo(-0.5 * before);
    });

    it("changes each velocity in proportion to inverse mass and conserves momentum", () => {
        const light = moving(-2, 0, 0, 1);
        const heavy = moving(1, 0, 0, 4);
        const before = momentum(light, heavy);
        new ParticleContact().set(light, heavy, { x: 1, y: 0, z: 0 }, 0, 0.8).resolve(DT);

        const lightChange = light.velocity.x - -2;
        const heavyChange = heavy.velocity.x - 1;
        expect(lightChange / -heavyChange).toBeCloseTo(light.inverseMass / heavy.inverseMass);
        expect(momentum(light, heavy)).toBeCloseToVec3(before);
    });

    it("changes only the velocity component along the normal", () => {
        const a = moving(4, -3, 2);
        const b = moving(-1, 1, 5);
        new ParticleContact().set(a, b, { x: 0, y: 1, z: 0 }, 0, 0.5).resolve(DT);

        expect(a.velocity.x).toBeCloseTo(4);
        expect(a.velocity.z).toBeCloseTo(2);
        expect(b.velocity.x).toBeCloseTo(-1);
        expect(b.velocity.z).toBeCloseTo(5);
    });

    it("bounces a particle off scenery when particleB is null", () => {
        const ball = moving(1, -4, 0);
        new ParticleContact().set(ball, null, { x: 0, y: 1, z: 0 }, 0, 0.5).resolve(DT);
        expect(ball.velocity).toBeCloseToVec3({ x: 1, y: 2, z: 0 });
    });

    it("treats an immovable particleB like scenery", () => {
        const ball = moving(1, -4, 0);
        const wall = moving(0, 0, 0, Infinity);
        new ParticleContact().set(ball, wall, { x: 0, y: 1, z: 0 }, 0, 0.5).resolve(DT);

        expect(ball.velocity).toBeCloseToVec3({ x: 1, y: 2, z: 0 });
        expect(wall.velocity).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("does nothing when both particles are immovable", () => {
        const a = moving(-1, 0, 0, Infinity);
        const b = moving(1, 0, 0, Infinity);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 0, 1).resolve(DT);

        expect(a.velocity).toBeCloseToVec3({ x: -1, y: 0, z: 0 });
        expect(b.velocity).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
    });

    it("leaves separating particles alone", () => {
        const a = moving(2, 0, 0);
        const b = moving(-1, 0, 0);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 0, 1).resolve(DT);

        expect(a.velocity).toBeCloseToVec3({ x: 2, y: 0, z: 0 });
        expect(b.velocity).toBeCloseToVec3({ x: -1, y: 0, z: 0 });
    });

    it("does not change the contact normal", () => {
        const contact = new ParticleContact().set(
            moving(-1, 0, 0),
            moving(1, 0, 0),
            { x: 1, y: 0, z: 0 },
            0,
            1,
        );
        contact.resolve(DT);
        expect(contact.normal).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
    });
});

describe("ParticleContact.resolve, interpenetration", () => {
    /** A particle at rest at `(x, y, z)` with mass `mass`. */
    function at(x: number, y: number, z: number, mass = 1): Particle {
        const p = moving(0, 0, 0, mass);
        p.position.set(x, y, z);
        return p;
    }

    it("moves equal masses apart by half the penetration each", () => {
        const a = at(0.4, 0, 0);
        const b = at(0, 0, 0);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 0.2, 0).resolve(DT);

        expect(a.position).toBeCloseToVec3({ x: 0.5, y: 0, z: 0 });
        expect(b.position).toBeCloseToVec3({ x: -0.1, y: 0, z: 0 });
    });

    it("moves A along the normal and B against it", () => {
        const a = at(0, 0, 0);
        const b = at(0, 0, 0);
        new ParticleContact().set(a, b, { x: 0, y: 0, z: 1 }, 1, 0).resolve(DT);

        expect(a.position.z).toBeGreaterThan(0);
        expect(b.position.z).toBeLessThan(0);
        expect(a.position.z - b.position.z).toBeCloseTo(1);
    });

    it("moves each particle in proportion to inverse mass", () => {
        const light = at(0, 0, 0, 1);
        const heavy = at(0, 0, 0, 3);
        new ParticleContact().set(light, heavy, { x: 0, y: 1, z: 0 }, 0.4, 0).resolve(DT);

        // w = 1 and 1/3, so the light particle takes 3/4 of the correction.
        expect(light.position).toBeCloseToVec3({ x: 0, y: 0.3, z: 0 });
        expect(heavy.position).toBeCloseToVec3({ x: 0, y: -0.1, z: 0 });
    });

    it("moves the particle the whole penetration against scenery", () => {
        const ball = at(1, -0.25, 0);
        new ParticleContact().set(ball, null, { x: 0, y: 1, z: 0 }, 0.25, 0).resolve(DT);
        expect(ball.position).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
    });

    it("does not move an immovable particleB", () => {
        const ball = at(0, -0.25, 0);
        const ground = at(0, 0, 0, Infinity);
        new ParticleContact().set(ball, ground, { x: 0, y: 1, z: 0 }, 0.25, 0).resolve(DT);

        expect(ball.position).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        expect(ground.position).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("corrects overlap even when the particles are already separating", () => {
        const a = moving(1, 0, 0);
        const b = moving(-1, 0, 0);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 0.2, 0).resolve(DT);

        expect(a.position).toBeCloseToVec3({ x: 0.1, y: 0, z: 0 });
        expect(b.position).toBeCloseToVec3({ x: -0.1, y: 0, z: 0 });
    });

    it("leaves a gap alone", () => {
        const a = at(1, 0, 0);
        const b = at(0, 0, 0);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, -0.5, 0).resolve(DT);

        expect(a.position).toBeCloseToVec3({ x: 1, y: 0, z: 0 });
        expect(b.position).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("does nothing when both particles are immovable", () => {
        const a = at(0, 0, 0, Infinity);
        const b = at(0, 0, 0, Infinity);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 1, 0).resolve(DT);

        expect(a.position).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        expect(b.position).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("does not change velocity", () => {
        const a = moving(0, 0, 0);
        const b = moving(0, 0, 0);
        new ParticleContact().set(a, b, { x: 1, y: 0, z: 0 }, 0.5, 1).resolve(DT);

        expect(a.velocity).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
        expect(b.velocity).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });
});

describe("ParticleContact.resolve, resting contact", () => {
    const G = -9.81;

    /** A particle that has just been integrated under gravity alone for one step. */
    function falling(vy: number, mass = 1): Particle {
        const p = moving(0, vy, 0, mass);
        p.lastAcceleration.set(0, G, 0);
        return p;
    }

    it("stops a particle whose closing velocity came only from the last step's acceleration", () => {
        const ball = falling(G * DT);
        new ParticleContact().set(ball, null, { x: 0, y: 1, z: 0 }, 0, 0.5).resolve(DT);
        expect(ball.velocity).toBeCloseToVec3({ x: 0, y: 0, z: 0 });
    });

    it("bounces only the closing velocity not caused by the last step's acceleration", () => {
        const ball = falling(-5);
        new ParticleContact().set(ball, null, { x: 0, y: 1, z: 0 }, 0, 0.5).resolve(DT);
        expect(ball.velocity.y).toBeCloseTo(0.5 * (5 + G * DT));
    });

    it("never turns the bounce into a closing velocity", () => {
        const ball = falling(G * DT * 0.5);
        new ParticleContact().set(ball, null, { x: 0, y: 1, z: 0 }, 0, 0.5).resolve(DT);
        expect(ball.velocity.y).toBeCloseTo(0);
    });

    it("ignores acceleration away from the contact", () => {
        const ball = moving(0, -4, 0);
        ball.lastAcceleration.set(0, 20, 0);
        new ParticleContact().set(ball, null, { x: 0, y: 1, z: 0 }, 0, 0.5).resolve(DT);
        expect(ball.velocity.y).toBeCloseTo(2);
    });

    it("ignores acceleration perpendicular to the normal", () => {
        const ball = moving(0, -4, 0);
        ball.lastAcceleration.set(30, 0, -30);
        new ParticleContact().set(ball, null, { x: 0, y: 1, z: 0 }, 0, 0.5).resolve(DT);
        expect(ball.velocity.y).toBeCloseTo(2);
    });

    it("uses the relative acceleration of the two particles", () => {
        // Both fall together: no relative acceleration, so the full closing velocity bounces.
        const a = falling(-3);
        const b = falling(1);
        const contact = new ParticleContact().set(a, b, { x: 0, y: 1, z: 0 }, 0, 0.5);
        contact.resolve(DT);
        expect(contact.separatingVelocity()).toBeCloseTo(2);
    });

    it("keeps a particle on the ground still for 1,000 steps with restitution 0.5", () => {
        const world = new ParticleWorld();
        const ball = new Particle();
        world.particles.push(ball);
        const contact = new ParticleContact();

        let maxSpeed = 0;
        for (let i = 0; i < 1000; i++) {
            world.step(DT);
            if (ball.position.y <= 0) {
                contact.set(ball, null, { x: 0, y: 1, z: 0 }, -ball.position.y, 0.5).resolve(DT);
            }
            maxSpeed = Math.max(maxSpeed, ball.velocity.magnitude());
        }

        expect(maxSpeed).toBeLessThan(1e-9);
        expect(ball.position.y).toBeCloseTo(0, 9);
    });
});
