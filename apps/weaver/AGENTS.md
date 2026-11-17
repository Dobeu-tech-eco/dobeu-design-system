# AGENTS.md

Architecture, commands, and conventions live in `CLAUDE.md` (source of truth) and `replit.md`. Read those first. This file only adds Cursor Cloud environment specifics.

## Cursor Cloud specific instructions

This is a pnpm monorepo (Design System Weaver): one Express API (`@workspace/api-server`) plus two Vite SPAs (`@workspace/design-forge`, `@workspace/mockup-sandbox`) backed by PostgreSQL + Drizzle. Standard dev/build/test commands are in `CLAUDE.md`.

### Node version
- The project requires Node 24, but the base image's default non-interactive shell resolves to an older system Node. Use nvm's Node 24 explicitly, e.g. `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` (or `nvm use 24`) before running pnpm. tmux/login shells pick up the nvm default alias (24); plain non-interactive `Shell` calls may not.

### Startup recipe (bring everything up)
Dependencies are refreshed by the startup update script (`pnpm install`). The rest is manual because service startup is intentionally not in the update script:
1. Start Postgres (installed during setup, not auto-started on boot): `sudo pg_ctlcluster 16 main start`. A `weaver` role/database were created during setup; connect with `DATABASE_URL="postgres://weaver:weaver@127.0.0.1:5432/weaver"`. If the role/db are missing on a fresh VM, recreate them via `sudo -u postgres psql` (`CREATE ROLE weaver LOGIN PASSWORD 'weaver' CREATEDB; CREATE DATABASE weaver OWNER weaver;`).
2. Create/refresh tables: `pnpm --filter @workspace/db run push`.
3. Start the API (needs the env vars below), then the SPAs. Run long-lived servers under tmux. See `CLAUDE.md` for the exact per-package dev commands.

### Services, ports, and how they connect
- `@workspace/api-server` — Express API on **port 5000**. `design-forge`'s Vite dev server hardcodes a proxy of `/api` → `http://localhost:5000`, so the API must run on 5000 for the SPA to work.
- `@workspace/design-forge` — main SPA, port **3000** (`strictPort`). This is the primary product UI.
- `@workspace/mockup-sandbox` — standalone preview SPA, port **3001**; no API dependency.
- Postgres must be running and reachable via `DATABASE_URL`. Create the schema once with `pnpm --filter @workspace/db run push` (drizzle-kit push; no migration files).

### Required environment variables (API server)
The API server reads these at startup and **throws at module import if any are unset**:
- `PORT` (use `5000`), `DATABASE_URL` (Postgres connection string)
- `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL` — the OpenAI wrapper (`lib/integrations-openai-ai-server`) throws if these are missing, so the server won't boot without them even though "AI" is nominally optional.

### AI dependency — what needs a real key vs. what doesn't
- Setting the two `AI_INTEGRATIONS_OPENAI_*` vars to any non-empty value lets the server boot.
- The **import** flow (`POST /api/projects/import/{markdown,figma,repo}`) calls the model via `composeProfile` and needs a working OpenAI-compatible endpoint to produce a design profile.
- The **generate + download** flow (`POST /api/projects/:id/generations`, `GET /api/generations/:id/download`) is deterministic; it only uses the model for optional "mapping notes" and falls back to deterministic notes on any failure. So generation/download work end-to-end without a real key as long as a project already exists.
- To exercise the full import→generate→download flow without provisioning a real key, point `AI_INTEGRATIONS_OPENAI_BASE_URL` at a local OpenAI-compatible stub that returns a valid design-profile JSON envelope (shape defined in `artifacts/api-server/src/lib/ai.ts` / `profile-schema.ts`). In production, provision a real OpenAI integration.

### Gotchas
- `api-server`'s `dev` script is **build-then-start** (esbuild bundle, not a watcher). After changing server code, re-run the dev command to pick up changes; there is no hot reload.
- The `preinstall` hook rejects npm/yarn — use pnpm only.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` and prunes non-linux-x64 native binaries via `overrides`; keep both.
