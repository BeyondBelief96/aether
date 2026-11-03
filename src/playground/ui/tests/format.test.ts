import { describe, expect, it } from "vitest";
import { formatCompact, formatDegrees, formatNumber } from "../format/format";

const FIGURE_SPACE = "\u2007";
const MINUS = "\u2212";

describe("formatNumber", () => {
    it("pads positive numbers with a figure space", () => {
        expect(formatNumber(1)).toBe(`${FIGURE_SPACE}1.000`);
    });

    it("uses a real minus sign for negative numbers", () => {
        expect(formatNumber(-0.25)).toBe(`${MINUS}0.250`);
    });

    it("never prints negative zero", () => {
        expect(formatNumber(-0.0001)).toBe(`${FIGURE_SPACE}0.000`);
        expect(formatNumber(-0)).toBe(`${FIGURE_SPACE}0.000`);
    });

    it("rounds to the requested number of digits", () => {
        expect(formatNumber(0.12345, 2)).toBe(`${FIGURE_SPACE}0.12`);
        expect(formatNumber(60, 0)).toBe(`${FIGURE_SPACE}60`);
    });

    it("prints a dash for non-finite values", () => {
        expect(formatNumber(NaN)).toBe("—");
        expect(formatNumber(Infinity)).toBe("—");
        expect(formatNumber(-Infinity)).toBe("—");
    });
});

describe("formatDegrees", () => {
    it("converts radians to degrees", () => {
        expect(formatDegrees(Math.PI / 2)).toBe(`${FIGURE_SPACE}90.0°`);
        expect(formatDegrees(-Math.PI)).toBe(`${MINUS}180.0°`);
    });
});

describe("formatCompact", () => {
    it("matches formatNumber below 1000", () => {
        expect(formatCompact(12.5)).toBe(formatNumber(12.5));
        expect(formatCompact(-999.5, 1)).toBe(formatNumber(-999.5, 1));
    });

    it("uses exponent form from 1000 up", () => {
        expect(formatCompact(1000)).toBe(`${FIGURE_SPACE}1.0e+3`);
        expect(formatCompact(1.26e22)).toBe(`${FIGURE_SPACE}1.3e+22`);
    });

    it("uses a real minus sign in exponent form", () => {
        expect(formatCompact(-2500)).toBe(`${MINUS}2.5e+3`);
    });

    it("prints non-finite values as a dash", () => {
        expect(formatCompact(Infinity)).toBe("—");
        expect(formatCompact(NaN)).toBe("—");
    });
});
