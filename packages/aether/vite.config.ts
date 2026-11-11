import { defineConfig } from "vitest/config";

/** Builds the npm package to dist/. */
export default defineConfig({
    publicDir: false,
    build: {
        outDir: "dist",
        lib: {
            entry: { index: "src/index.ts", math: "src/math/index.ts" },
            formats: ["es"],
        },
    },
    test: {
        include: ["src/**/*.test.ts"],
        setupFiles: ["src/math/tests/matchers.ts"],
    },
});
