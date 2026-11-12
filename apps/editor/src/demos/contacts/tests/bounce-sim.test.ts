import { describe, expect, it } from "vitest";
import { BounceSim } from "../bounce-sim";

const OPTIONS = {
    radius: 0.3,
    spacing: 1.5,
    restitutions: [0.9, 0.7, 0.5, 0.3],
    height: 4,
    gravity: 9.81,
};

function run(sim: BounceSim, seconds: number, hz: number): void {
    for (let i = 0; i < seconds * hz; i++) sim.step(1 / hz);
}

describe("BounceSim", () => {
    it("has no rebound ratio before the first peak after a bounce", () => {
        const sim = new BounceSim(OPTIONS);
        run(sim, 0.5, 60);
        for (const ball of sim.balls) expect(sim.reboundRatio(ball)).toBeUndefined();
    });

    it.each([0, 1, 2, 3])("rebounds ball %i close to e² at 240 Hz", (index) => {
        const sim = new BounceSim(OPTIONS);
        const ball = sim.balls[index]!;
        while (ball.peaks === 0) sim.step(1 / 240);
        const e = OPTIONS.restitutions[index]!;
        expect(sim.reboundRatio(ball)).toBeCloseTo(e * e, 1);
    });

    it.each([15, 60, 240])("brings every ball to rest on the ground at %i Hz", (hz) => {
        const sim = new BounceSim(OPTIONS);
        run(sim, 30, hz);
        for (const ball of sim.balls) {
            expect(sim.atRest(ball)).toBe(true);
            expect(sim.heightOf(ball)).toBeCloseTo(0, 9);
        }
    });

    it.each([15, 60, 240])(
        "lands a ball with no restitution and leaves it at rest at %i Hz",
        (hz) => {
            const sim = new BounceSim({ ...OPTIONS, restitutions: [0] });
            const [ball] = sim.balls;
            run(sim, 2, hz);
            expect(ball!.bounces).toBe(1);
            expect(ball!.lastPeak).toBe(0);
            expect(sim.atRest(ball!)).toBe(true);
            expect(sim.reboundRatio(ball!)).toBeUndefined();
        },
    );

    it("has no rebound ratio once a ball is at rest", () => {
        const sim = new BounceSim(OPTIONS);
        run(sim, 30, 60);
        for (const ball of sim.balls) expect(sim.reboundRatio(ball)).toBeUndefined();
    });

    it("drops again from a new height", () => {
        const sim = new BounceSim(OPTIONS);
        run(sim, 5, 60);
        sim.drop(2);
        for (const ball of sim.balls) {
            expect(sim.heightOf(ball)).toBeCloseTo(2);
            expect(ball.particle.velocity.y).toBe(0);
            expect(ball.bounces).toBe(0);
        }
    });

    it("applies a new restitution to one ball only", () => {
        const sim = new BounceSim(OPTIONS);
        sim.setRestitution(2, 1);
        expect(sim.balls.map((b) => b.ground.restitution)).toEqual([0.9, 0.7, 1, 0.3]);
    });
});
