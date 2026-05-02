# Dobeu Design System

Monorepo for the Dobeu Design System v2. See the spec at `Design-System/docs/specs/2026-04-30-dobeu-design-system-design.md` (synced to `/dobeu-eco/Implementation/specs/` in Drive) for the full architecture and decisions.

## Packages

- `@dobeu/tokens` — design tokens (CSS vars, Tailwind config, Framer JSON, Webflow JSON)
- `@dobeu/components-react` — React components mapped via Code Connect
- `@dobeu/icons` — icon set
- `@dobeu/motifs` — per-property illustration kits

## Setup

```
pnpm install
pnpm build
pnpm test
```

## Plan

See `Design-System/docs/specs/2026-04-30-dobeu-design-system-plan-01-foundation.md` for the foundation implementation plan.
