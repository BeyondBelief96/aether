import { describe, expect, it } from "vitest";
import { Quaternion } from "../geometry/quaternion";
import { Vec3 } from "../geometry/vec3";

describe("toBeCloseToVec3", () => {
    it("passes for equal vectors and plain Vec3Like objects", () => {
        expect(new Vec3(1, 2, 3)).toBeCloseToVec3({ x: 1, y: 2, z: 3 });
    });

    it("passes within the tolerance for the given digits", () => {
        expect(new Vec3(1, 2, 3 + 1e-4)).toBeCloseToVec3(new Vec3(1, 2, 3), 3);
    });

    it("fails when any component is outside the tolerance", () => {
        expect(new Vec3(1, 2, 3 + 1e-4)).not.toBeCloseToVec3(new Vec3(1, 2, 3), 6);
        expect(new Vec3(1.1, 2, 3)).not.toBeCloseToVec3(new Vec3(1, 2, 3));
    });
});

describe("toBeCloseToQuat", () => {
    const q = new Quaternion().setFromAxisAngle(new Vec3(0, 1, 0), 0.8);

    it("passes for the same quaternion", () => {
        expect(q.clone()).toBeCloseToQuat(q);
    });

    it("treats q and −q as the same rotation", () => {
        expect(q.clone().scale(-1)).toBeCloseToQuat(q);
    });

    it("fails for a different rotation", () => {
        const other = new Quaternion().setFromAxisAngle(new Vec3(0, 1, 0), 0.9);
        expect(other).not.toBeCloseToQuat(q);
    });

    it("fails when only some components flip sign", () => {
        const flipped = new Quaternion(q.w, -q.x, -q.y, -q.z);
        expect(flipped).not.toBeCloseToQuat(q);
    });
});
