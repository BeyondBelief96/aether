import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // The "aether-physics" alias is defined once, in tsconfig.json.
    tsconfigPaths: true,
  },
  build: {
    // Three.js alone is ~550 kB minified; it is one dependency, not a sign of bloat.
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/math/tests/matchers.ts'],
  },
});
