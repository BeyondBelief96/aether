import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../core/demo";
import { demos } from "../registry";

describe("demo registry", () => {
    it("gives every demo a unique id", () => {
        const ids = demos.map((demo) => demo.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("keeps each demo's source in its category's folder", () => {
        for (const demo of demos) {
            expect(demo.source).toMatch(new RegExp(`^apps/editor/src/demos/${demo.category}/`));
        }
    });

    it("only uses listed categories", () => {
        const known = new Set<string>(CATEGORIES.map((category) => category.id));
        for (const demo of demos) expect(known.has(demo.category)).toBe(true);
    });
});
