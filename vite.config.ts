import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    // Three.js alone is ~550 kB minified; it is one dependency, not a sign of bloat.
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
