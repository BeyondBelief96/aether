import { describe, expect, it } from "vitest";
import { kineticEnergy } from "../../helpers/measure";
import { Particle, ParticleContact, ParticleContactResolver, type Vec3Like } from "aether-physics";
import { BreakSim, Cushions, MAX_ROWS, SphereContacts, type BreakOptions } from "../break-sim";

const OPTIONS: BreakOptions = {
    radius: 0.18,
    halfLength: 4,
    halfWidth: 2,
    rows: 5,
    restitution: 0.95,
    damping: 0.6,
};

function at(x: number, y: number, z: number): Particle {
    const p = new Particle();
    p.position.set(x, y, z);
    return p;
}

/** Expects `actual` to match `expected` per component to 6 decimals. */
function expectVec(actual: Vec3Like, expected: Vec3Like): void {
    expect(actual.x).toBeCloseTo(expected.x, 6);
    expect(actual.y).toBeCloseTo(expected.y, 6);
    expect(actual.z).toBeCloseTo(expected.z, 6);
}

function pool(size: number): ParticleContact[] {
    return Array.from({ length: size }, () => new ParticleContact());
}

function broken(options = OPTIONS, seconds = 6, hz = 60, iterations?: number): BreakSim {
    const sim = new BreakSim(options);
    sim.world.contactResolver = new ParticleContactResolver(iterations);
    sim.shoot(12, 0.02);
    for (let i = 0; i < seconds * hz; i++) sim.step(1 / hz);
    return sim;
}

describe("SphereContacts", () => {
    it("writes one contact per overlapping pair, normal from B toward A", () => {
        const a = at(0.5, 0, 0);
        const b = at(0, 0, 0);
        const out = pool(4);
        const count = new SphereContacts([a, b, at(5, 0, 0)], 0.3, 0.4).addContacts(out, 0);

        expect(count).toBe(1);
        expect(out[0]!.particleA).toBe(a);
        expect(out[0]!.particleB).toBe(b);
        expectVec(out[0]!.normal, { x: 1, y: 0, z: 0 });
        expect(out[0]!.penetration).toBeCloseTo(0.1);
        expect(out[0]!.restitution).toBe(0.4);
    });

    it("counts spheres that exactly touch", () => {
        const out = pool(1);
        expect(new SphereContacts([at(0.6, 0, 0), at(0, 0, 0)], 0.3, 0).addContacts(out, 0)).toBe(
            1,
        );
        expect(out[0]!.penetration).toBeCloseTo(0, 12);
    });

    it("pushes coincident spheres apart vertically", () => {
        const out = pool(1);
        new SphereContacts([at(1, 1, 1), at(1, 1, 1)], 0.5, 0).addContacts(out, 0);
        expectVec(out[0]!.normal, { x: 0, y: 1, z: 0 });
        expect(out[0]!.penetration).toBeCloseTo(1);
    });

    it("stops at the end of the pool", () => {
        const particles = [at(0, 0, 0), at(0.1, 0, 0), at(0.2, 0, 0)];
        expect(new SphereContacts(particles, 1, 0).addContacts(pool(3), 1)).toBe(2);
    });
});

describe("Cushions", () => {
    it("pushes a ball through a cushion back onto the table along its normal", () => {
        const out = pool(4);
        const count = new Cushions([at(-3.9, 0, 1.95)], 0.2, 4, 2, 0).addContacts(out, 0);

        expect(count).toBe(2);
        expectVec(out[0]!.normal, { x: 1, y: 0, z: 0 });
        expect(out[0]!.penetration).toBeCloseTo(0.1);
        expectVec(out[1]!.normal, { x: 0, y: 0, z: -1 });
        expect(out[1]!.penetration).toBeCloseTo(0.15);
    });

    it("writes nothing for a ball well inside", () => {
        expect(new Cushions([at(0, 0, 0)], 0.2, 4, 2, 0).addContacts(pool(4), 0)).toBe(0);
    });
});

describe("BreakSim", () => {
    it("racks a triangle of touching balls behind the cue ball", () => {
        const sim = new BreakSim(OPTIONS);
        expect(sim.particles).toHaveLength(16);
        expect(sim.deepestOverlap()).toBeCloseTo(0, 9);
        expect(sim.particles[0]!.position.x).toBeLessThan(sim.particles[1]!.position.x);
    });

    it("spreads the rack, keeps every ball on the table, and comes to rest", () => {
        const sim = broken();
        const { radius, halfLength, halfWidth } = sim;
        for (const { position } of sim.particles) {
            expect(position.y).toBeCloseTo(radius, 2);
            expect(Math.abs(position.x)).toBeLessThan(halfLength - radius + 0.01);
            expect(Math.abs(position.z)).toBeLessThan(halfWidth - radius + 0.01);
        }
        expect(sim.deepestOverlap()).toBeLessThan(0.01);
        expect(kineticEnergy(sim.particles)).toBeLessThan(0.5);
    });

    it("leaves balls fused together with a starved resolver", () => {
        expect(broken(OPTIONS, 6, 60, 10).deepestOverlap()).toBeGreaterThan(0.05);
    });

    it("gives balls added by a re-rack the current damping", () => {
        const sim = new BreakSim({ ...OPTIONS, rows: 1 });
        sim.setDamping(0.3);
        sim.rack(4);
        for (const p of sim.particles) expect(p.damping).toBe(0.3);
    });

    it("re-racks with a different number of rows", () => {
        const sim = broken(OPTIONS, 1);
        sim.rack(3);
        expect(sim.particles).toHaveLength(7);
        expect(sim.world.particles).toHaveLength(7);
        expect(kineticEnergy(sim.particles)).toBe(0);
        expect(sim.peakContacts).toBe(0);
    });

    it("finds every contact in the largest rack", () => {
        const sim = new BreakSim({ ...OPTIONS, rows: 3 });
        sim.rack(MAX_ROWS);
        sim.step(1 / 60);
        const balls = sim.particles.length;
        const rows = MAX_ROWS;
        // Each ball rests on the table, plus every touching pair in the triangle.
        const pairs = (3 * ((rows - 1) * rows)) / 2;
        expect(sim.world.contactCount).toBe(balls + pairs);
    });

    it.each([0, 7, 2.5])("rejects a rack of %s rows", (rows) => {
        expect(() => new BreakSim(OPTIONS).rack(rows)).toThrow(RangeError);
    });
});
