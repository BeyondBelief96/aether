import { describe, expect, it } from "vitest";
import { LineBasicMaterial } from "three";
import { Polyline } from "../polyline";

describe("Polyline.append", () => {
    it("grows until full, then drops the oldest point", () => {
        const line = new Polyline(3, new LineBasicMaterial());
        for (let x = 1; x <= 4; x++) line.append({ x, y: 0, z: 0 });
        const positions = line.geometry.getAttribute("position");
        expect(line.geometry.drawRange.count).toBe(3);
        expect([0, 1, 2].map((i) => positions.getX(i))).toEqual([2, 3, 4]);
    });

    it("starts again from the first point after setCount(0)", () => {
        const line = new Polyline(3, new LineBasicMaterial());
        line.append({ x: 1, y: 0, z: 0 });
        line.setCount(0);
        line.append({ x: 9, y: 0, z: 0 });
        expect(line.geometry.drawRange.count).toBe(1);
        expect(line.geometry.getAttribute("position").getX(0)).toBe(9);
    });
});
