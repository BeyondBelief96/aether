# Aether: monorepo plan

How the repo is split into the npm package, the demo app, and (next) the website. The package and demo app split is done: `packages/aether` and `apps/editor`. The website, `apps/site`, is still to come.

---

## Target layout

```
aether/
├── package.json            private root, "workspaces": ["packages/*", "apps/*"]
├── tsconfig.base.json      shared strict compiler options
├── packages/
│   └── aether/             the npm package
│       ├── package.json
│       ├── tsconfig.json
│       └── src/            math/, engine/, collision/, forces/, constraints/, index.ts
└── apps/
    ├── editor/             the demo app (Lit + Three.js): core/, stage/, demos/, ui/
    └── site/               planned: marketing page, docs and the hosted demos, on Railway
```

The apps depend on `"aether-physics": "*"`, which the workspace links to the local package. The package's `exports` carry an `aether-source` condition pointing at its TypeScript source; the apps resolve with that condition (Vite `resolve.conditions`, tsconfig `customConditions`), so they need no build step for the engine and import it the same way users will.

## Tooling

| Concern | Choice | Notes |
|---|---|---|
| Workspaces | npm workspaces | Already on npm. pnpm is stricter about undeclared dependencies but is optional. |
| Docs site | Starlight (Astro) or VitePress | Both can import demos from `apps/editor` to embed live simulations in pages. |
| API reference | TypeDoc + `typedoc-plugin-markdown` | Generates pages from JSDoc into the docs site. |
| Library build | `tsc` emitting `.js` + `.d.ts` to `dist/` | `tsdown` or Vite library mode if bundling is wanted. |

Package `package.json` essentials: `"type": "module"`, `"exports"`, `"types"`, `"files": ["dist"]`, `"sideEffects": false`.

## Do now

1. **Keep engine code free of DOM, Three.js and Lit.** Already true. To enforce it, give the engine folders a tsconfig without `"DOM"` in `lib` and without `vite/client` in `types`, so a stray `window` or `document` fails to compile.
2. **Treat `src/index.ts` as the only entry point.** Done: `ui/` and `demos/` import from `"aether-physics"`, an alias for `src/index.ts` set under `paths` in `tsconfig.json`. After the split those imports stay as they are, and anything missing from `index.ts` exposes a gap in the public API.
3. **Pick the npm name early.** Done: `aether-physics`. `aether` is taken, and `aetherjs` would likely be rejected as too similar to the existing `aether-js`. Check punctuation variants before choosing a name. It isn't reserved until the first publish.
4. **Rename project notes when the docs site arrives.** The current `docs/` folder (this file, PLAN.md, RESOURCES.md, notes/) is project notes, not user documentation. Consider moving it to `notes/` so it isn't confused with `apps/docs`.

## Migration steps

1. Create the root `package.json` with `"private": true` and `"workspaces"`, and move shared compiler options into `tsconfig.base.json`.
2. Move engine folders and `index.ts` into `packages/aether/src/`, along with their tests and a Vitest config.
3. Move the contents of `src/playground/`, along with `index.html`, `public/` and `vite.config.ts` into `apps/playground/`. Add `"aether-physics": "*"` as a dependency and remove the `paths` alias, so `"aether-physics"` resolves to the package.
4. Move the library build (`vite.lib.config.ts`, `tsconfig.build.json`) and `exports` into `packages/aether/`. Verify with `npm pack --dry-run` that only `dist/` ships.
5. Scaffold `apps/docs/` and wire TypeDoc output into it.
6. Run `npm install` at the root, then confirm tests, typecheck and both apps' dev servers work.
