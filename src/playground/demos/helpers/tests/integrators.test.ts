import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    explicitEuler,
    rk4,
    semiImplicitEuler,
    velocityVerlet,
    type AccelFn,
    type Integrator,
    type OscillatorState,
} from "../integrators";

const ALL: readonly (readonly [string, Integrator])[] = [
    ["explicitEuler", explicitEuler],
    ["semiImplicitEuler", semiImplicitEuler],
    ["velocityVerlet", velocityVerlet],
    ["rk4", rk4],
];

/** Runs `integrator` from `start` for `steps` steps and returns the final state. */
function run(
    integrator: Integrator,
    start: OscillatorState,
    accel: AccelFn,
    dt: number,
    steps: number,
): OscillatorState {
    const state = { ...start };
    for (let i = 0; i < steps; i++) integrator(state, accel, dt);
    return state;
}

/** A unit-mass spring with angular frequency `omega`. */
const spring =
    (omega: number): AccelFn =>
    (x) =>
        -omega * omega * x;

/** Energy of a unit-mass spring, relative to `½ω²` (the energy at x = 1, v = 0). */
const relativeEnergy = ({ x, v }: OscillatorState, omega: number): number =>
    (v * v) / (omega * omega) + x * x;

describe("constant acceleration", () => {
    const a = -9.81;
    const x0 = 2;
    const v0 = 12;
    const dt = 1 / 60;
    const steps = 600;
    const t = steps * dt;
    const accel: AccelFn = () => a;
    const exactX = x0 + v0 * t + 0.5 * a * t * t;
    const exactV = v0 + a * t;

    it("velocity Verlet matches x₀ + v₀t + ½at² exactly", () => {
        const s = run(velocityVerlet, { x: x0, v: v0 }, accel, dt, steps);
        expect(s.x).toBeCloseTo(exactX, 9);
        expect(s.v).toBeCloseTo(exactV, 9);
    });

    it("RK4 matches x₀ + v₀t + ½at² exactly", () => {
        const s = run(rk4, { x: x0, v: v0 }, accel, dt, steps);
        expect(s.x).toBeCloseTo(exactX, 9);
        expect(s.v).toBeCloseTo(exactV, 9);
    });

    it("semi-implicit Euler is off in position by +½·a·dt·t", () => {
        const s = run(semiImplicitEuler, { x: x0, v: v0 }, accel, dt, steps);
        expect(s.x - exactX).toBeCloseTo(0.5 * a * dt * t, 9);
        expect(s.v).toBeCloseTo(exactV, 9);
    });

    it("explicit Euler is off in position by −½·a·dt·t", () => {
        const s = run(explicitEuler, { x: x0, v: v0 }, accel, dt, steps);
        expect(s.x - exactX).toBeCloseTo(-0.5 * a * dt * t, 9);
        expect(s.v).toBeCloseTo(exactV, 9);
    });
});

describe("single-step update rules", () => {
    const accel: AccelFn = (x, v) => 3 * x + 5 * v;
    const dt = 0.1;
    const start = { x: 1, v: 2 }; // a = 13

    it("explicit Euler advances both values from the old state", () => {
        const s = run(explicitEuler, start, accel, dt, 1);
        expect(s.x).toBeCloseTo(1.2, 12);
        expect(s.v).toBeCloseTo(3.3, 12);
    });

    it("semi-implicit Euler moves the position with the new velocity", () => {
        const s = run(semiImplicitEuler, start, accel, dt, 1);
        expect(s.v).toBeCloseTo(3.3, 12);
        expect(s.x).toBeCloseTo(1.33, 12);
    });

    it("velocity Verlet averages the old and new accelerations", () => {
        const s = run(velocityVerlet, start, accel, dt, 1);
        const x1 = 1 + 2 * dt + 0.5 * 13 * dt * dt;
        const a1 = accel(x1, 2 + 13 * dt);
        expect(s.x).toBeCloseTo(x1, 12);
        expect(s.v).toBeCloseTo(2 + 0.5 * (13 + a1) * dt, 12);
    });

    it("RK4 samples the derivative at four points", () => {
        const samples: number[] = [];
        run(
            rk4,
            start,
            (x, v) => {
                samples.push(x);
                return accel(x, v);
            },
            dt,
            1,
        );
        expect(samples).toHaveLength(4);
        expect(samples[0]).toBe(1);
        expect(samples[1]).toBeCloseTo(1 + 0.05 * 2, 12);
    });
});

describe("order of accuracy", () => {
    const omega = 2;
    const damping = 0.5;
    const cases = [
        { name: "undamped", accel: spring(omega) },
        {
            name: "velocity-dependent",
            accel: ((x, v) => -omega * omega * x - damping * v) as AccelFn,
        },
    ];
    const orders = [
        { name: "explicitEuler", integrator: explicitEuler, order: 1 },
        { name: "semiImplicitEuler", integrator: semiImplicitEuler, order: 1 },
        { name: "velocityVerlet", integrator: velocityVerlet, order: 2 },
        { name: "rk4", integrator: rk4, order: 4 },
    ];

    /** Global error against a fine RK4 reference solution at t = 2 s. */
    function error(integrator: Integrator, accel: AccelFn, steps: number) {
        const start = { x: 1, v: 0 };
        const reference = run(rk4, start, accel, 2 / 20_000, 20_000);
        return Math.abs(
            run(integrator, start, accel, 2 / steps, steps).x - reference.x,
        );
    }

    for (const { name: caseName, accel } of cases) {
        it.each(orders)(
            `$name has order $order on a ${caseName} oscillator`,
            ({ integrator, order }) => {
                const measured = Math.log2(
                    error(integrator, accel, 400) /
                        error(integrator, accel, 800),
                );
                expect(measured).toBeGreaterThan(order - 0.2);
                expect(measured).toBeLessThan(order + 0.2);
            },
        );
    }
});

describe("energy over 10,000 steps of an undamped spring", () => {
    const omega = 2 * Math.PI;
    const dt = 1 / 60;

    /** Largest |E/E₀ − 1| over the run, and the final E/E₀. */
    function measure(integrator: Integrator) {
        const state = { x: 1, v: 0 };
        const accel = spring(omega);
        let worst = 0;
        for (let i = 0; i < 10_000; i++) {
            integrator(state, accel, dt);
            worst = Math.max(
                worst,
                Math.abs(relativeEnergy(state, omega) - 1),
            );
        }
        return { worst, final: relativeEnergy(state, omega) };
    }

    it("grows without bound under explicit Euler", () => {
        expect(measure(explicitEuler).final).toBeGreaterThan(1e6);
    });

    it("stays in a bounded band under semi-implicit Euler", () => {
        expect(measure(semiImplicitEuler).worst).toBeLessThan(0.11);
    });

    it("stays in a tighter band under velocity Verlet", () => {
        expect(measure(velocityVerlet).worst).toBeLessThan(0.006);
    });

    it("decays slowly under RK4", () => {
        const { worst, final } = measure(rk4);
        expect(final).toBeLessThan(1);
        expect(worst).toBeLessThan(0.002);
    });

    it("explicit Euler's energy grows at every step size", () => {
        for (const stepDt of [1 / 30, 1 / 240, 1 / 1920]) {
            const s = run(explicitEuler, { x: 1, v: 0 }, spring(omega), stepDt, 2000);
            expect(relativeEnergy(s, omega)).toBeGreaterThan(1);
        }
    });
});

describe("stability limits on an undamped spring", () => {
    const omega = 1;

    /** Whether energy has blown up after many steps at the given `ω·dt`. */
    const diverges = (integrator: Integrator, omegaDt: number): boolean => {
        const s = run(integrator, { x: 1, v: 0 }, spring(omega), omegaDt, 5000);
        return !(relativeEnergy(s, omega) < 1e3);
    };

    it.each([
        ["semiImplicitEuler", semiImplicitEuler],
        ["velocityVerlet", velocityVerlet],
    ] as const)("%s is stable below ω·dt = 2 and not above it", (_, integrator) => {
        expect(diverges(integrator, 1.9)).toBe(false);
        expect(diverges(integrator, 2.1)).toBe(true);
    });

    it("RK4 is stable below ω·dt = 2√2 and not above it", () => {
        expect(diverges(rk4, 2.8)).toBe(false);
        expect(diverges(rk4, 2.9)).toBe(true);
    });

    it("explicit Euler diverges even at a small ω·dt", () => {
        expect(diverges(explicitEuler, 0.1)).toBe(true);
    });
});

describe.each(ALL)("%s", (_, integrator) => {
    it("leaves a state at equilibrium unchanged", () => {
        const s = run(integrator, { x: 0, v: 0 }, spring(3), 1 / 60, 100);
        expect(s).toEqual({ x: 0, v: 0 });
    });

    it("moves a free particle in a straight line", () => {
        const s = run(integrator, { x: 1, v: 2 }, () => 0, 0.25, 8);
        expect(s.x).toBeCloseTo(5, 12);
        expect(s.v).toBe(2);
    });

    it("is linear in the initial state", () => {
        const scalar = fc.double({ min: -100, max: 100, noNaN: true });
        fc.assert(
            fc.property(scalar, scalar, (x, v) => {
                const accel = spring(2);
                const once = run(integrator, { x, v }, accel, 1 / 60, 10);
                const twice = run(integrator, { x: 2 * x, v: 2 * v }, accel, 1 / 60, 10);
                expect(twice.x).toBeCloseTo(2 * once.x, 9);
                expect(twice.v).toBeCloseTo(2 * once.v, 9);
            }),
        );
    });
});
