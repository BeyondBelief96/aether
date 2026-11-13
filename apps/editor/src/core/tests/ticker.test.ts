import { describe, expect, it } from "vitest";
import { Ticker } from "../ticker";

describe("Ticker", () => {
    it("counts whole intervals and carries the remainder", () => {
        const ticker = new Ticker(0.25);
        expect(ticker.advance(0.125)).toBe(0);
        expect(ticker.advance(0.25)).toBe(1);
        expect(ticker.advance(0.5)).toBe(2);
        expect(ticker.advance(0.125)).toBe(1);
    });

    it("starts over after a reset", () => {
        const ticker = new Ticker(0.5);
        ticker.advance(0.4);
        ticker.reset();
        expect(ticker.advance(0.4)).toBe(0);
    });

    it("rejects a non-positive interval", () => {
        expect(() => new Ticker(0)).toThrow(RangeError);
    });
});
