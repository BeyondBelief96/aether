import { describe, expect, it } from "vitest";
import { formatHash, isRouteHash, parseHash } from "../route";

describe("parseHash", () => {
    it("reads a demo id and its parameters", () => {
        const route = parseHash("#/springs?stiffness=40");
        expect(route).toMatchObject({ view: "demo", id: "springs" });
        expect(route.view === "demo" && route.query.get("stiffness")).toBe("40");
    });

    it("reads the index", () => {
        expect(parseHash("#/demos")).toEqual({ view: "index" });
    });

    it("treats an empty hash as the default demo", () => {
        expect(parseHash("")).toMatchObject({ view: "demo", id: "" });
    });

    it("treats an in-page anchor as the default demo, not a demo called that", () => {
        expect(isRouteHash("#content")).toBe(false);
        expect(parseHash("#content")).toMatchObject({ view: "demo", id: "" });
    });

    it("survives a malformed escape", () => {
        expect(() => parseHash("#/%E0%A4%A")).not.toThrow();
        expect(parseHash("#/%E0%A4%A")).toMatchObject({ view: "demo", id: "%E0%A4%A" });
    });

    it("round-trips through formatHash", () => {
        const hash = "#/elastic-pendulum?angle=20";
        expect(formatHash(parseHash(hash))).toBe(hash);
    });
});
