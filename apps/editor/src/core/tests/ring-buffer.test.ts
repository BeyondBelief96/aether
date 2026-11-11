import { describe, expect, it } from "vitest";
import { RingBuffer } from "../ring-buffer";

const contents = (buffer: RingBuffer): (number | undefined)[] =>
    Array.from({ length: buffer.length }, (_, i) => buffer.at(i));

describe("RingBuffer", () => {
    it("starts empty", () => {
        const buffer = new RingBuffer(3);
        expect(buffer.length).toBe(0);
        expect(buffer.at(0)).toBeUndefined();
    });

    it("returns values oldest first", () => {
        const buffer = new RingBuffer(3);
        buffer.push(1);
        buffer.push(2);
        expect(contents(buffer)).toEqual([1, 2]);
    });

    it("overwrites the oldest value once full", () => {
        const buffer = new RingBuffer(3);
        for (const v of [1, 2, 3, 4, 5]) buffer.push(v);
        expect(buffer.length).toBe(3);
        expect(contents(buffer)).toEqual([3, 4, 5]);
    });

    it("keeps order across many wraps", () => {
        const buffer = new RingBuffer(4);
        for (let i = 0; i < 1003; i++) buffer.push(i);
        expect(contents(buffer)).toEqual([999, 1000, 1001, 1002]);
    });

    it("works with a capacity of 1", () => {
        const buffer = new RingBuffer(1);
        buffer.push(1);
        buffer.push(2);
        expect(contents(buffer)).toEqual([2]);
    });

    it("keeps non-finite values, which mark gaps in a chart", () => {
        const buffer = new RingBuffer(2);
        buffer.push(NaN);
        buffer.push(Infinity);
        expect(contents(buffer)).toEqual([NaN, Infinity]);
    });

    it.each([-1, 0.5, 2, 99])("returns undefined for index %s when out of range", (i) => {
        const buffer = new RingBuffer(4);
        buffer.push(1);
        buffer.push(2);
        expect(buffer.at(i)).toBeUndefined();
    });

    it("empties on clear and can be reused", () => {
        const buffer = new RingBuffer(2);
        buffer.push(1);
        buffer.push(2);
        buffer.push(3);
        buffer.clear();
        expect(buffer.length).toBe(0);
        buffer.push(4);
        expect(contents(buffer)).toEqual([4]);
    });

    it.each([0, -1, 1.5, NaN])("rejects a capacity of %s", (capacity) => {
        expect(() => new RingBuffer(capacity)).toThrow(RangeError);
    });
});
