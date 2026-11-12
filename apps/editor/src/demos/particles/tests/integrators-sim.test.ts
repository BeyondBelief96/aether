import { describe, expect, it } from "vitest";
import { ExplicitEuler, Rk4, SemiImplicitEuler, VelocityVerlet } from "aether-physics";
import {
    IntegratorLane,
    ORBIT_PERIOD,
    ORBIT_SEMI_MAJOR,
    SPRING_REST,
    SPRING_STRETCH,
    type ShootoutOptions,
} from "../integrators-sim";

const ORIGIN = { x: 0, y: 0, z: 0 };
const SPRING: ShootoutOptions = { scene: "spring", stiffness: 40, eccentricity: 0 };
const ORBIT: ShootoutOptions = { scene: "orbit", stiffness: 0, eccentricity: 0.5 };

function run(lane: IntegratorLane, seconds: number, hz = 60): void {
    for (let i = 0; i < seconds * hz; i++) lane.step(1 / hz);
}

describe("IntegratorLane setup", () => {
    it("starts the spring stretched past its rest length", () => {
        const lane = new IntegratorLane(new SemiImplicitEuler(), ORIGIN, SPRING);
        expect(lane.body.position.distanceTo(lane.pivot)).toBeCloseTo(
            SPRING_REST + SPRING_STRETCH,
            12,
        );
        expect(lane.initialEnergy).toBeCloseTo(0.5 * 40 * SPRING_STRETCH ** 2, 12);
    });

    it("starts the orbit at periapsis with the energy of its ellipse", () => {
        const lane = new IntegratorLane(new SemiImplicitEuler(), ORIGIN, ORBIT);
        expect(lane.body.position.distanceTo(lane.pivot)).toBeCloseTo(ORBIT_SEMI_MAJOR * 0.5, 12);
        // Vis-viva: E = −μ / 2a for a body of mass 1.
        const mu = ((2 * Math.PI) / ORBIT_PERIOD) ** 2 * ORBIT_SEMI_MAJOR ** 3;
        expect(lane.initialEnergy).toBeCloseTo(-mu / (2 * ORBIT_SEMI_MAJOR), 9);
    });

    it("centres the orbit's ellipse on the lane", () => {
        const lane = new IntegratorLane(new Rk4(), ORIGIN, ORBIT);
        run(lane, ORBIT_PERIOD / 2);
        // Half a period later the body is at apoapsis, mirror image of periapsis about the origin.
        expect(lane.body.position.x).toBeCloseTo(-ORBIT_SEMI_MAJOR, 2);
        expect(lane.body.position.y).toBeCloseTo(0, 2);
        expect(lane.body.position.z).toBe(0);
    });
});

describe("IntegratorLane energy", () => {
    it("keeps RK4 and Verlet on the orbit within a fraction of a percent", () => {
        for (const integrator of [new Rk4(), new VelocityVerlet()]) {
            const lane = new IntegratorLane(integrator, ORIGIN, ORBIT);
            run(lane, 2 * ORBIT_PERIOD);
            expect(Math.abs(lane.relativeEnergy() - 1)).toBeLessThan(0.005);
        }
    });

    it("keeps semi-implicit Euler's spring energy bounded", () => {
        const lane = new IntegratorLane(new SemiImplicitEuler(), ORIGIN, SPRING);
        run(lane, 20);
        expect(Math.abs(lane.relativeEnergy() - 1)).toBeLessThan(0.2);
        expect(lane.diverged).toBe(false);
    });

    it("lets explicit Euler gain energy on the spring", () => {
        const lane = new IntegratorLane(new ExplicitEuler(), ORIGIN, SPRING);
        run(lane, 5);
        expect(lane.relativeEnergy()).toBeGreaterThan(2);
    });
});

describe("divergence", () => {
    it("stops a runaway lane and keeps its last finite state", () => {
        const lane = new IntegratorLane(new ExplicitEuler(), ORIGIN, { ...SPRING, stiffness: 600 });
        run(lane, 30, 10);
        expect(lane.diverged).toBe(true);
        expect(Number.isFinite(lane.body.position.x)).toBe(true);
        const { x } = lane.body.position;
        lane.step(0.1);
        expect(lane.body.position.x).toBe(x);
    });

    it("stops an orbit that becomes unbound", () => {
        const lane = new IntegratorLane(new SemiImplicitEuler(), ORIGIN, {
            ...ORBIT,
            eccentricity: 0.9,
        });
        run(lane, 2 * ORBIT_PERIOD, 10);
        expect(lane.diverged).toBe(true);
        expect(lane.relativeEnergy()).toBeGreaterThan(0);
    });

    it("keeps a diverging spring on its own side of the anchor", () => {
        const lane = new IntegratorLane(new ExplicitEuler(), ORIGIN, SPRING);
        let closest = Infinity;
        for (let i = 0; i < 600; i++) {
            lane.step(1 / 60);
            closest = Math.min(closest, lane.body.position.x - lane.pivot.x);
        }
        expect(lane.diverged).toBe(true);
        expect(closest).toBeGreaterThan(0);
    });

    it("records a step time", () => {
        const lane = new IntegratorLane(new Rk4(), ORIGIN, SPRING);
        run(lane, 1);
        expect(lane.stepMicros).toBeGreaterThan(0);
    });
});
