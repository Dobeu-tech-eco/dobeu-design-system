---
"@dobeu-tech-eco/tokens": patch
---

Fix the package entry point so `import "@dobeu-tech-eco/tokens"` actually resolves. The `exports["."]`, `main`, and `types` fields pointed at `./dist/index.js`, but `rootDir: "."` with `include: ["src", "test"]` made `tsc` emit to `./dist/src/index.js` — and also shipped compiled tests under `dist/test/`. Builds now use a dedicated `tsconfig.build.json` (`rootDir: "src"`, `include: ["src"]`) that emits `src/**` flat into `dist/`, matching the declared export map; `tsconfig.json` still covers `src` + `test` for `lint`/`typecheck`.

Relative imports in `src/` now carry explicit `.js` extensions and the `tokens.json` import carries a `with { type: "json" }` attribute, so the emitted ESM is valid for Node consumers as well as bundlers. The build also cleans `dist/` first, so renamed or removed outputs no longer linger.
