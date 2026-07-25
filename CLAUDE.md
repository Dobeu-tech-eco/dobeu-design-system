# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope and parent context

This directory is a sub-tree of the larger `dobeu-eco` workspace (see `/mnt/c/Users/jswil/dobeu-eco/CLAUDE.md`). The parent workspace is *not* a code repo, but **this directory is** — a real pnpm + Turborepo TypeScript monorepo. The "do not initialize git here" and "no build/lint/test" rules in the parent CLAUDE.md do **not** apply inside this subtree.

Authoritative spec for this monorepo:

- `Design-System/docs/specs/2026-04-30-dobeu-design-system-design.md` — full architecture and decisions
- `Design-System/docs/specs/2026-04-30-dobeu-design-system-plan-01-foundation.md` — foundation plan

These specs live in the parent workspace tree (synced to Drive at `/dobeu-eco/Implementation/specs/`). Read them before non-trivial work.

In-repo governance docs (`docs/`):

- `docs/figma-pro-library-setup.md` — canonical Figma library structure & publish governance
- `docs/token-contract.md` — Figma ↔ code token mapping contract (read before editing `@dobeu-private/tokens`)
- `docs/component-parity-checklist.md` — variant/props parity checklist for `components-react`
- `docs/design-to-code-workflow.md` — end-to-end delivery workflow
- `docs/changeset-policy.md` — release/versioning policy (read before adding a changeset)

## Commands

Package manager is pinned to `pnpm@10.33.2` via `packageManager`. Turbo orchestrates per-package tasks.

```bash
pnpm install                       # bootstrap workspace
pnpm build                         # turbo build (respects ^build dep graph; outputs dist/**)
pnpm test                          # turbo test (depends on ^build)
pnpm lint                          # turbo lint
pnpm typecheck                     # turbo typecheck (depends on ^build)
pnpm publish-packages              # turbo build && changeset publish
```

Scoped to a single package (after packages exist under `packages/*` or `apps/*`):

```bash
pnpm --filter @dobeu-private/tokens build
pnpm --filter @dobeu-private/components-react test
turbo run test --filter=@dobeu-private/components-react -- --run path/to/file.test.ts
```

## Architecture

Workspace layout (`pnpm-workspace.yaml`): `packages/*` + `apps/*`. Planned packages per `README.md`:

- `@dobeu-private/tokens` — design tokens, multi-target output (CSS vars, Tailwind config, Framer JSON, Webflow JSON). This is the **root** of the build graph: every other package depends on it via `^build`.
- `@dobeu-private/components-react` — React components, mapped to Figma via Code Connect.
- `@dobeu-private/icons` — icon set.
- `@dobeu-private/motifs` — per-property illustration kits (one set per Dobeu domain).

Cross-cutting conventions:

- **Tokens are the source of truth** for color/typography/spacing. Never hardcode brand values in `components-react` — pull from `@dobeu-private/tokens`. Brand constants (palette `#6B5CE7`/`#4A3FA8`/`#F4A261`, dark surface `#1A1A2E`, Nunito/Quicksand, lowercase `dobeu` wordmark) come from the parent CLAUDE.md and must round-trip through tokens, not be re-declared per package.
- **Multi-target export from tokens** means token changes ripple to four downstream consumers (CSS, Tailwind, Framer, Webflow). When editing tokens, verify all four output formats build and the Framer/Webflow JSON shapes are still valid for their respective import flows.
- **Code Connect**: `components-react` components ship Figma Code Connect mappings. When adding/renaming a component, update the Code Connect mapping in the same change so Figma → code stays bidirectional.

TypeScript base config (`tsconfig.base.json`): ES2022 / ESNext / Bundler resolution, `strict`, `noUncheckedIndexedAccess`, declaration + source maps. Each package extends this.

Turbo task graph (`turbo.json`): `build` and `typecheck` and `test` all depend on upstream `^build`, so changing a token forces dependent packages to rebuild before their tests/typechecks run. `lint` is independent.

## Surfaces this design system feeds

Per the parent v5 scope gate, the design system must serve these production surfaces. Keep token/component output compatible with all of them:

- **Framer Pro** → `dobeu.dev` (consumes Framer JSON token export; no Framer REST API exists, so updates land via Plugin SDK or manual import)
- **Webflow Pro** → `dobeu.online` (consumes Webflow JSON token export; Webflow Logic is sunset — no conditional logic in Webflow, that lives in Make.com)
- React apps in the dobeu-eco repos (consume `@dobeu-private/components-react` directly)

Do not introduce tokens or components that only work in one of these targets without an equivalent path for the others.

## Working conventions

- **Do not bypass the token layer.** A new color, font size, or spacing value lands in `@dobeu-private/tokens` first, then is consumed.
- **Changesets** drive versioning (`@changesets/cli` is installed at the root). New user-facing changes in any package require a changeset entry before `publish-packages`.
- **Git lives here.** Unlike the parent `dobeu-eco` workspace, this subtree is intended to be tracked and pushed (target repo TBD per the foundation plan). Normal commit/PR conventions apply.
- **No `apps/*` or `packages/*` exist yet** — the workspace is currently a skeleton (root config only). The first real package per the foundation plan is `@dobeu-private/tokens`; build it before anything that would import from it.
