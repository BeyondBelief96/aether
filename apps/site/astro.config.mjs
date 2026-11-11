import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";

const engine = JSON.parse(
    readFileSync(new URL("../../packages/aether/package.json", import.meta.url), "utf8"),
);

export default defineConfig({
    // GitHub Pages serves the site from /<repo>/; Railway serves it from the root.
    base: process.env.SITE_BASE ?? "/",
    trailingSlash: "ignore",
    markdown: {
        shikiConfig: { themes: { light: "min-light", dark: "min-dark" } },
    },
    vite: {
        resolve: {
            // Use the engine's TypeScript source, as the tsconfig does.
            conditions: ["aether-source"],
        },
        define: {
            __AETHER_VERSION__: JSON.stringify(engine.version),
        },
        build: {
            // Three.js alone is ~550 kB minified.
            chunkSizeWarningLimit: 800,
        },
    },
});
