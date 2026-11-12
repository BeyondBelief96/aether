import { describe, expect, it } from "vitest";
import { BoxGeometry, MeshBasicMaterial, Vector3 } from "three";
import { Strut } from "../strut";

describe("Strut", () => {
    it("spans the two points, centred between them and stretched to their distance", () => {
        const strut = new Strut(new BoxGeometry(0.1, 1, 0.1), new MeshBasicMaterial());
        strut.place({ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 4 });
        expect(strut.position.toArray()).toEqual([1, 0, 2]);
        expect(strut.scale.y).toBe(4);
        const axis = new Vector3(0, 1, 0).applyQuaternion(strut.quaternion);
        expect(axis.z).toBeCloseTo(1);
    });

    it("keeps its direction and collapses when the points coincide", () => {
        const strut = new Strut(new BoxGeometry(0.1, 1, 0.1), new MeshBasicMaterial());
        strut.place({ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 });
        const before = strut.quaternion.clone();
        strut.place({ x: 3, y: 3, z: 3 }, { x: 3, y: 3, z: 3 });
        expect(strut.scale.y).toBe(0);
        expect(strut.quaternion.equals(before)).toBe(true);
    });
});
