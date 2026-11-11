import { describe, expect, it } from "vitest";
import {
    choice,
    decodeValues,
    defaults,
    digitsOf,
    encodeValues,
    number,
    sanitize,
    toggle,
    vec3,
} from "../params";
import { blendValues } from "../morph";
import { formatHash, parseHash } from "../route";

const schema = {
    k: number({ label: "Stiffness", min: 2, max: 200, step: 1, default: 20 }),
    damping: number({ label: "Damping", min: 0.5, max: 1, step: 0.01, default: 0.9 }),
    mode: choice({
        label: "Mode",
        options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
        ],
        default: "a",
    }),
    auto: toggle({ label: "Auto", default: true }),
    axis: vec3({ label: "Axis", default: { x: 0, y: 1, z: 0 }, nonzero: true }),
};

describe("sanitize", () => {
    it("clamps and snaps numbers to the step", () => {
        expect(sanitize(schema.k, 500)).toBe(200);
        expect(sanitize(schema.k, 20.4)).toBe(20);
        expect(sanitize(schema.damping, 0.934)).toBe(0.93);
        expect(sanitize(schema.k, NaN)).toBeUndefined();
    });

    it("rejects unknown choices, non-booleans and zero directions", () => {
        expect(sanitize(schema.mode, "c")).toBeUndefined();
        expect(sanitize(schema.auto, "yes")).toBeUndefined();
        expect(sanitize(schema.axis, { x: 0, y: 0, z: 0 })).toBeUndefined();
        expect(sanitize(schema.axis, { x: 1, y: 2, z: 3 })).toEqual({ x: 1, y: 2, z: 3 });
    });
});

describe("encodeValues / decodeValues", () => {
    it("writes only values that differ from their defaults", () => {
        const values = { ...defaults(schema), k: 40, auto: false };
        expect(encodeValues(schema, values).toString()).toBe("k=40&auto=0");
    });

    it("round-trips every kind", () => {
        const values = {
            k: 150,
            damping: 0.55,
            mode: "b" as const,
            auto: false,
            axis: { x: 1, y: 0, z: -2 },
        };
        expect(decodeValues(schema, encodeValues(schema, values))).toEqual(values);
    });

    it("falls back to defaults for invalid or unknown entries", () => {
        const query = new URLSearchParams("k=abc&mode=zzz&axis=0,0,0&other=1&damping=");
        expect(decodeValues(schema, query)).toEqual(defaults(schema));
    });
});

describe("digitsOf", () => {
    it("follows the step unless digits is given", () => {
        expect(digitsOf(schema.k)).toBe(0);
        expect(digitsOf(schema.damping)).toBe(2);
        expect(digitsOf({ ...schema.k, digits: 3 })).toBe(3);
    });
});

describe("blendValues", () => {
    it("blends numbers and vectors and switches other kinds at once", () => {
        const from = { k: 0, axis: { x: 0, y: 0, z: 0 }, mode: "a" };
        const to = { k: 100, axis: { x: 2, y: 2, z: 2 }, mode: "b" };
        const half = blendValues(schema, from, to, 0.5);
        expect(half.k).toBeCloseTo(87.5); // ease-out cubic at 0.5
        expect(half.axis).toEqual({ x: 1.75, y: 1.75, z: 1.75 });
        expect(half.mode).toBe("b");
        expect(blendValues(schema, from, to, 1)).toEqual(to);
    });
});

describe("parseHash / formatHash", () => {
    it("reads a demo id and its query", () => {
        const route = parseHash("#/springs?k=40");
        expect(route).toMatchObject({ view: "demo", id: "springs" });
        if (route.view === "demo") expect(route.query.get("k")).toBe("40");
    });

    it("treats an empty hash as the default demo and #/demos as the index", () => {
        expect(parseHash("")).toMatchObject({ view: "demo", id: "" });
        expect(parseHash("#/demos")).toEqual({ view: "index" });
    });

    it("round-trips", () => {
        const hash = "#/ballistics?projectile=laser&auto=0";
        expect(formatHash(parseHash(hash))).toBe(hash);
        expect(formatHash({ view: "index" })).toBe("#/demos");
    });
});
