# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Design System Weaver** — a tool that imports a design source (a markdown brief, a Figma `.fig` file, or a code repository), extracts a normalized **DesignProfile** (colors, typography, spacing, radius, shadows, tone), and then **generates** ready-to-use theme/token code packages from that profile targeting a catalog of design-system frameworks. Deterministic generators produce the files; OpenAI is used only for optional commentary/mapping notes.

Two user-facing SPAs sit in front of one API: `design-forge` (the main app) and `mockup-sandbox` (a preview/mockup rendering environment).

## Commands

Run from the repo root unless noted. Package manager is **pnpm only** (a `preinstall` hook rejects npm/yarn).

- `pnpm run typecheck` — full typecheck: `tsc --build` for `lib/*` project refs, then per-package `typecheck` in `artifacts/*` and `scripts`.
- `pnpm run build` — typecheck, then `build` in every package (esbuild for the server, Vite for the SPAs).
- `pnpm --filter @workspace/api-server run dev` — build + start the Express API (needs `PORT` and `DATABASE_URL`; `PORT=5000` per replit.md).
- `pnpm --filter @workspace/design-forge run dev` — Vite dev server for the main SPA.
- `pnpm --filter @workspace/mockup-sandbox run dev` — Vite dev server for the mockup preview app.
- `pnpm --filter @workspace/api-spec run codegen` — **regenerate the API client + Zod schemas from `lib/api-spec/openapi.yaml`** (Orval). Run this after any API contract change.
- `pnpm --filter @workspace/db run push` — push Drizzle schema to the DB (dev only; `push-force` to skip prompts).
- Typecheck one package: `pnpm --filter @workspace/<name> run typecheck`.

There is **no test runner or linter wired up** yet — `typecheck` and `build` are the only quality gates.

## Architecture

pnpm workspace. `artifacts/*` are the deployable apps; `lib/*` are shared libraries consumed via `workspace:*`. Shared dependency versions are pinned in the `catalog:` block of `pnpm-workspace.yaml` — reference `catalog:` in package.json rather than hardcoding versions.

**The API contract is generated, not hand-written.** `lib/api-spec/openapi.yaml` is the single source of truth. Orval codegen fans it out into:
- `lib/api-zod/src/generated/**` — request/response Zod schemas (validated at the server route layer).
- `lib/api-client-react/src/generated/**` — TanStack Query hooks consumed by the SPAs.

Never edit files under `**/generated/**` by hand — change `openapi.yaml` and re-run `codegen`. Do not change the OpenAPI `info.title` (`Api`); it drives generated import paths.

**Data flow:** SPA → generated React Query hook → Express route (`artifacts/api-server/src/routes/`: health, design-systems, projects, generations, stats) → validate with api-zod → Drizzle (`lib/db`) against Postgres. Route handlers live behind `/api`.

**Server** (`artifacts/api-server`): Express 5, pino/pino-http logging, `express.json({ limit: "60mb" })` because `.fig` uploads arrive base64-encoded in JSON. Bundled by esbuild via `build.mjs` into `dist/index.mjs` (ESM); `dev` runs build-then-start (not a tsx watcher). Domain logic in `src/lib/`: `analysis/` (figma/markdown/repo source parsers → DesignProfile), `generators/` (profile → theme packages, deterministic), `design-systems.ts` (target framework catalog), `color.ts` (hex/HSL, ramps), `ai.ts` (OpenAI wrapper).

**DB** (`lib/db`): Drizzle + `node-postgres`. Two tables in `src/schema/`: `projects` (an imported source + its extracted `DesignProfileJson`) and `generations` (files generated for a project against a design system, FK cascade on project). `db` and `pool` are created eagerly and throw if `DATABASE_URL` is unset.

**SPAs** (`design-forge`, `mockup-sandbox`): React 19, Vite 7, Tailwind v4 (`@tailwindcss/vite`), Radix UI + shadcn-style components (`components.json`), `wouter` for routing, TanStack Query for data, Replit Vite plugins. `mockup-sandbox` additionally has `mockupPreviewPlugin.ts` (a Vite plugin) and uses chokidar/fast-glob to discover mockups.

**AI** (`lib/integrations-openai-ai-server`): thin OpenAI SDK wrapper with `p-limit`/`p-retry`; subpath exports `./batch`, `./image`, `./audio`.

## Conventions & gotchas

- **`zod/v4`**: the `catalog:` pins zod `^3.25`, but `lib/db` schema imports from `zod/v4` (the v4 API shipped inside the v3 package). Match the surrounding file's import path.
- **Supply-chain guard**: `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (packages must be ≥1 day old before install). Do not disable it; use `minimumReleaseAgeExclude` only for trusted scoped packages.
- **Non-`main` esbuild/rollup/tailwind/lightningcss platform binaries are pruned** via `overrides` (Replit is linux-x64 only). If you add a native-binary dep, expect to extend those overrides.
- `DesignProfileJson` in `lib/db/src/schema/projects.ts` is a hand-maintained structural mirror of the API `DesignProfile`; the api-zod schema is the actual validator at the route layer. Keep them in sync when the profile shape changes.
- `replit.md` is the operator-facing runbook (mostly an unfilled template); this file is the source of truth for architecture.
