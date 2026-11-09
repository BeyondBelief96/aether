import { describe, expect, it } from "vitest";
import { FixedStepLoop } from "../loop";

// 8 Hz keeps dt = 0.125, which is exact in binary floating point.
const HZ = 8;

function countSteps(loop: FixedStepLoop, ...timesMs: number[]) {
    let steps = 0;
    let result = loop.advance(timesMs[0] ?? 0, () => steps++);
    for (const t of timesMs.slice(1)) result = loop.advance(t, () => steps++);
    return { steps, result };
}

describe("FixedStepLoop", () => {
    it("takes no steps on the first frame", () => {
        const { steps } = countSteps(new FixedStepLoop(HZ), 1000);
        expect(steps).toBe(0);
    });

    it("takes one step per dt of elapsed time", () => {
        const { steps, result } = countSteps(new FixedStepLoop(HZ), 0, 250);
        expect(steps).toBe(2);
        expect(result.alpha).toBe(0);
    });

    it("carries leftover time as alpha", () => {
        const { steps, result } = countSteps(new FixedStepLoop(HZ), 0, 187.5);
        expect(steps).toBe(1);
        expect(result.alpha).toBe(0.5);
    });

    it("passes dt to the step callback", () => {
        const loop = new FixedStepLoop(HZ);
        const seen: number[] = [];
        loop.advance(0, (dt) => seen.push(dt));
        loop.advance(125, (dt) => seen.push(dt));
        expect(seen).toEqual([0.125]);
    });

    it("caps a long frame instead of spiralling", () => {
        const { steps } = countSteps(new FixedStepLoop(HZ), 0, 5000);
        expect(steps).toBe(2); // 0.25 s cap / 0.125 s
    });

    it("drops time beyond maxStepsPerFrame", () => {
        const loop = new FixedStepLoop(240);
        loop.maxStepsPerFrame = 4;
        const { steps, result } = countSteps(loop, 0, 100);
        expect(steps).toBe(4);
        expect(result.droppedTime).toBe(true);
        expect(result.alpha).toBeLessThan(1);
    });

    it("scales time", () => {
        const loop = new FixedStepLoop(HZ);
        loop.timeScale = 0.5;
        expect(countSteps(loop, 0, 250).steps).toBe(1);
    });

    it("does not step while paused, and does not bank the paused time", () => {
        const loop = new FixedStepLoop(HZ);
        loop.paused = true;
        const paused = countSteps(loop, 0, 250);
        expect(paused.steps).toBe(0);
        expect(paused.result.alpha).toBe(1);

        loop.paused = false;
        expect(countSteps(loop, 375).steps).toBe(1);
    });

    it("runs a queued single step while paused", () => {
        const loop = new FixedStepLoop(HZ);
        loop.paused = true;
        loop.stepOnce();
        expect(countSteps(loop, 0).steps).toBe(1);
        expect(countSteps(loop, 125).steps).toBe(0);
    });

    it("tracks simulated time and resets it", () => {
        const loop = new FixedStepLoop(HZ);
        countSteps(loop, 0, 125, 250);
        expect(loop.simTime).toBe(0.25);
        loop.reset();
        expect(loop.simTime).toBe(0);
    });

    it("rejects a non-positive rate", () => {
        const loop = new FixedStepLoop();
        expect(() => {
            loop.hz = 0;
        }).toThrow(RangeError);
    });
});
