# Aether: monorepo plan

How the repo is split into the npm package, the demo app, and (next) the website. The package and demo app split is done: `packages/aether` and `apps/editor`. The website is `apps/site` (Astro): the landing page at `/`, the demo app mounted at `/demos`, and documentation at `/docs`.

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
    └── site/               the website (Astro): landing, /demos (mounts apps/editor), /docs
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

## The website

`apps/site` is an Astro static site. It imports the demo app as a workspace package:

| Import | What it is |
|---|---|
| `@aether/editor/element` | `<aether-editor>`, the full demo app. The site mounts it at `/demos` with the `embedded` attribute, which drops the app's own wordmark, outbound links and footer |
| `@aether/editor/scene` | `<aether-scene demo="cloth" values="wind=10">`, one demo running bare, for pages that show the engine at work. It stops drawing while off screen and never captures scroll |
| `@aether/editor/tokens.css`, `@aether/editor/fonts`, `@aether/editor/palette` | The visual system, so the site and the app are one design |

The demo app keeps hash routing (`/demos/#/cloth?wind=10`), so it works under any base path and needs no server rewrites. Docs are Markdown in `apps/site/src/content/docs`; pages marked `stub: true` show an outline notice until the API settles. When the API stabilises, generate the API reference with TypeDoc into the same collection, or move the docs to Starlight, which reads the same Markdown.

### Deploying

- **GitHub Pages** (now): `.github/workflows/deploy-site.yml` builds the site with `SITE_BASE=/<repo>/` and publishes `apps/site/dist`.
- **Railway** (planned): build with `npm ci && npm run build`, start with `npm start` (`astro preview` on `$PORT`), no `SITE_BASE`. A static host in front of `apps/site/dist` works too; the site has no server code.
