import { defineConfig } from 'vite';

/** Builds the npm package. The playground's build is in vite.config.ts. */
export default defineConfig({
  publicDir: false, // the favicon belongs to the playground
  build: {
    outDir: 'dist',
    lib: {
      entry: { index: 'src/index.ts', math: 'src/math/index.ts' },
      formats: ['es'],
    },
  },
});
