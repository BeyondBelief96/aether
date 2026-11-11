import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const engine = JSON.parse(
    readFileSync(new URL("../../packages/aether/package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
    resolve: {
        // Use the engine's TypeScript source, as the tsconfig does.
        conditions: ["aether-source"],
    },
    // Vitest resolves through the SSR environment, which doesn't inherit `resolve.conditions`.
    ssr: {
        resolve: { conditions: ["aether-source"] },
    },
    define: {
        __AETHER_VERSION__: JSON.stringify(engine.version),
    },
    build: {
        // Three.js alone is ~550 kB minified.
        chunkSizeWarningLimit: 800,
    },
    test: {
        include: ["src/**/*.test.ts"],
    },
});
