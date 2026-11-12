import { describe, expect, it } from "vitest";
import { choiceColumns } from "../choice-columns";

describe("choiceColumns", () => {
    it("keeps every option in one row when they fit", () => {
        expect(choiceColumns(2, 240, 60)).toBe(2);
        expect(choiceColumns(4, 600, 110)).toBe(4);
    });

    it("prefers an even grid to a row with empty cells", () => {
        // Three fit, but 3 + 1 leaves two empty cells; 2 × 2 leaves none.
        expect(choiceColumns(4, 358, 110)).toBe(2);
    });

    it("keeps the most columns when no count fills every row", () => {
        // Five options: 4 + 1 leaves three empty cells, 3 + 2 one, 2 + 2 + 1 one.
        expect(choiceColumns(5, 360, 80)).toBe(3);
    });

    it("stacks the options when even two don't fit", () => {
        expect(choiceColumns(4, 200, 120)).toBe(1);
    });

    it("counts the shared 1px rule between options", () => {
        expect(choiceColumns(2, 201, 100)).toBe(2);
        expect(choiceColumns(2, 200, 100)).toBe(1);
    });

    it("handles a single option and an unmeasured width", () => {
        expect(choiceColumns(1, 300, 50)).toBe(1);
        expect(choiceColumns(3, 300, 0)).toBe(3);
    });
});
