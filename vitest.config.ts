import { defineConfig } from "vitest/config";

/** Runs every workspace's tests from the root. */
export default defineConfig({
    test: {
        projects: ["packages/*", "apps/*"],
    },
});
