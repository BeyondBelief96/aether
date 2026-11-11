import { describe, expect, it } from "vitest";
import { splitImports } from "../split-imports";

describe("splitImports", () => {
    it("separates the leading import statements from the body", () => {
        const source =
            'import { a } from "x";\nimport {\n    b,\n} from "y";\n\n/** Doc. */\nconst c = 1;\n';
        expect(splitImports(source)).toEqual([
            'import { a } from "x";\nimport {\n    b,\n} from "y";\n',
            "/** Doc. */\nconst c = 1;\n",
        ]);
    });

    it("returns the whole source as the body when there are no imports", () => {
        expect(splitImports("const a = 1;\n")).toEqual(["", "const a = 1;\n"]);
    });
});
