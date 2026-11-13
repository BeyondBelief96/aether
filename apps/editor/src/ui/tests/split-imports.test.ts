import { describe, expect, it } from "vitest";
import { localImports, splitImports } from "../split-imports";

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

describe("localImports", () => {
    it("lists the modules imported from the same folder, in order", () => {
        const source = [
            'import { Mesh } from "three";',
            'import { number } from "../../core/params";',
            'import { BridgeSim } from "./bridge-sim";',
            'import type { Load } from "./load";',
            "",
            'const later = "./not-an-import";',
        ].join("\n");
        expect(localImports(source)).toEqual(["bridge-sim", "load"]);
    });

    it("is empty when nothing comes from the same folder", () => {
        expect(localImports('import { a } from "../a";\nconst b = 1;\n')).toEqual([]);
    });
});
