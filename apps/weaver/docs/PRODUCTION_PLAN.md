# Design System Weaver — Production Plan

> Roadmap to a fully functioning prototype hosted on Vercel.
> Owner: dobeutech. Repo: `Dobeu-tech-eco/dobeutech-designsystem-weaver`. Generated 2026-07-20.

## /goal

**Ship a fully functioning prototype of Design System Weaver on Vercel** where a user can:

1. **Provide a design source** by any of:
   - uploading a `design.md` (markdown brief),
   - uploading a `design.fig` (Figma file),
   - pasting a rendered HTML page URL, or
   - pointing at a public git repository (GitHub / GitLab / Bitbucket / any `.git`).
2. **Extract a DesignProfile** (colors, typography, spacing, radius, shadows, tone) from that source.
3. **Choose a target design system** from the curated catalog below.
4. **Generate a design system in that OS's codebase idiom**, matching the extracted design, and download/import the generated package.

"Done" = a public Vercel URL where the four import paths work end-to-end against all 10 catalog systems, with generated output that builds.

## Target design-system catalog (from `attached_assets/…vercel-compatible.xlsx`)

| # | Design System | Git repository |
|---|---------------|----------------|
| 1 | GitHub Primer | https://github.com/primer/design-system |
| 2 | Carbon Design System | https://github.com/carbon-design-system/carbon |
| 3 | Material Web (M3) | https://github.com/material-components/material-web |
| 4 | Fluent UI | https://github.com/microsoft/fluentui |
| 5 | Cloudscape | https://github.com/cloudscape-design/components |
| 6 | Vercel Geist | https://github.com/vercel/geist-ui (legacy) / next-ui |
| 7 | Radix UI | https://github.com/radix-ui/primitives |
| 8 | Atlassian Design | https://github.com/atlassian/design-system |
| 9 | Shopify Polaris | https://github.com/Shopify/polaris |
| 10 | Adobe Spectrum | https://github.com/adobe/spectrum-web-components |

These become entries in `artifacts/api-server/src/lib/design-systems.ts`; each needs a generator profile in `artifacts/api-server/src/lib/generators/`.

## Current state (what already exists)

- **Monorepo** (pnpm workspaces): `artifacts/*` apps + `lib/*` shared libs. See `CLAUDE.md`.
- **API server** (`@workspace/api-server`, Express 5): routes for health/design-systems/projects/generations/stats; source analyzers in `src/lib/analysis/` (`figma.ts`, `markdown.ts`, `repo.ts`); deterministic generators in `src/lib/generators/`; catalog in `src/lib/design-systems.ts`.
- **Contract-first API**: `lib/api-spec/openapi.yaml` → Orval → `api-zod` + `api-client-react`.
- **DB**: `lib/db` (Drizzle + Postgres), tables `projects` + `generations`.
- **Front-ends**: `design-forge` (main SPA: Home, ProjectWorkspace, History) and `mockup-sandbox` (preview). React 19 / Vite 7 / Tailwind v4.
- **AI**: `lib/integrations-openai-ai-server` (OpenAI wrapper, used for commentary only).

**Assessment:** the skeleton for all four import paths and the generator pipeline is present. The work is completing/​hardening each path, wiring the catalog, and productionizing for Vercel — not a greenfield build.

## Gap analysis (skeleton → production)

| Area | Gap | Priority |
|------|-----|----------|
| Import: HTML URL | Confirm a "fetch rendered HTML → profile" analyzer exists; `repo.ts` covers git, not arbitrary HTML pages. | P0 |
| Import: git providers | Verify GitLab/Bitbucket/generic `.git` support (not just GitHub) in `repo.ts`. | P0 |
| Catalog coverage | Ensure all 10 systems are registered with working generators. | P0 |
| Generated output builds | Add a validation step that generated packages typecheck/build. | P1 |
| Persistence on Vercel | Provision managed Postgres (Neon/Vercel Postgres); wire `DATABASE_URL`. | P0 |
| API on Vercel | Express bundle → Vercel serverless/Node function; large-body (`60mb`) handling for `.fig`. | P0 |
| Front-end hosting | Deploy `design-forge` as the primary Vercel app; decide `mockup-sandbox` fate (embed vs separate). | P0 |
| Secrets | `OPENAI_API_KEY`, `DATABASE_URL` as Vercel env vars; degrade gracefully if AI key absent. | P0 |
| Tests/CI | No test runner or CI yet; add smoke E2E for the 4 import paths + GitHub Actions. | P1 |
| Observability | pino logs → Vercel; add error surface in UI. | P2 |

## DDD architecture (bounded contexts) — for `/v3-ddd-architecture`

Model the domain as four bounded contexts with an anti-corruption layer between raw sources and the profile:

1. **Ingestion** — accepts the four source kinds; each has an adapter (`MarkdownAdapter`, `FigmaAdapter`, `HtmlUrlAdapter`, `GitRepoAdapter`). Output: raw `SourceArtifact`. (Maps to `src/lib/analysis/*`.)
2. **Design Profiling** — the core domain. `SourceArtifact` → normalized `DesignProfile` aggregate (colors/typography/spacing/radius/shadows/tone). The `DesignProfile` is the ubiquitous-language aggregate root; `api-zod` is its published-language contract.
3. **Generation** — `DesignProfile` + chosen `DesignSystem` → `GenerationPackage` (files). Each catalog system is a strategy in `generators/`. Deterministic core; AI is a supporting subdomain (optional commentary).
4. **Catalog & History** — `projects` and `generations` persistence; read models for the History page.

**Key invariant:** `DesignProfileJson` in `lib/db` mirrors the api-zod `DesignProfile`; keep them synchronized (single source = `openapi.yaml`).

## Swarm coordination plan — for `/v3-swarm-coordination`

Hierarchical topology, pipeline pattern, SendMessage-first. Spawn as one batch, `run_in_background: true`:

- **researcher** → audits `analysis/`, `generators/`, `design-systems.ts` vs the 10-system catalog; reports gaps to `architect`.
- **architect** (`system-architect`) → finalizes bounded-context boundaries + Vercel deployment shape; hands contract/interfaces to `coder`.
- **coder** ×N (one lane per import path + one per catalog generator batch) → implement; message `tester`. Use worktree isolation for parallel file writes.
- **tester** → smoke E2E per import path + generated-output build check; message `reviewer`.
- **reviewer** (`security-reviewer` + `code-reviewer`) → secrets, input validation on all four ingestion adapters (untrusted URLs/repos = SSRF surface), quality gate.

Gate to production: `pnpm run typecheck && pnpm run build` green + all 4 import paths pass smoke on a Vercel preview URL.

## Phased roadmap

**Phase 0 — Baseline (verify green).** `pnpm install`, `pnpm run typecheck`, `pnpm run build`. Fix any breakage. Provision a dev Postgres and run `pnpm --filter @workspace/db run push`. Confirm `design-forge` runs locally against the API.

**Phase 1 — Ingestion completeness (P0).** Confirm/implement all four adapters; add the HTML-URL analyzer; extend git support to GitLab/Bitbucket/generic `.git`. Harden input validation (SSRF/redirect/size limits on URL + repo fetches).

**Phase 2 — Catalog + generators (P0).** Register all 10 systems in `design-systems.ts`; implement/verify a generator per system; add a "generated output builds" validation.

**Phase 3 — Vercel productionization (P0).** Adapt the Express app to a Vercel function (or Node server target); provision Vercel Postgres/Neon; set `DATABASE_URL` + `OPENAI_API_KEY`; deploy `design-forge`; wire preview deploys.

**Phase 4 — Hardening (P1).** Smoke E2E for the four paths; GitHub Actions CI (typecheck + build + E2E on PR); UI error states; graceful AI-absent degradation.

**Phase 5 — Polish (P2).** Observability, mockup-sandbox integration decision, docs, demo dataset.

## Vercel deployment notes

- **Front-end:** deploy `artifacts/design-forge` (Vite build) as the primary project; root directory = that package, build via pnpm workspace.
- **API:** the Express app (`artifacts/api-server`, esbuild → ESM) must run as a Vercel serverless/Node function; keep the `express.json({ limit: "60mb" })` for base64 `.fig` uploads (watch Vercel body-size limits — may need direct-to-storage upload for large `.fig`).
- **DB:** Vercel Postgres or Neon; `DATABASE_URL` is required at boot (the db module throws if unset).
- **Secrets:** `OPENAI_API_KEY` (optional — AI is commentary-only, must degrade), `DATABASE_URL` (required).
- **Monorepo:** configure Vercel for pnpm workspaces; ensure the `catalog:`/`minimumReleaseAge` install settings hold in CI.

## Risks / open questions

- **`.fig` upload size** vs Vercel serverless body limits — may force presigned direct upload.
- **SSRF / untrusted fetch** — the URL and repo import paths fetch attacker-controllable targets; needs allowlist/timeout/size guards. Security review is mandatory.
- **Generated-output correctness** across 10 heterogeneous design systems is the hardest quality bar; needs the build-validation gate.
- **mockup-sandbox** role in production is undecided (embed as live preview vs drop for prototype).

## Immediate next actions

1. Run Phase 0 baseline (`install` → `typecheck` → `build`) and record the result.
2. `ruflo init` (in progress) + spawn the swarm above scoped to Phase 1.
3. Create the Vercel project and a first preview deploy of `design-forge` to establish the pipeline early.
