# Figma Pro Library Setup

This document defines the canonical Figma Pro library structure for Dobeu Design System v2.

## Canonical File Structure

- `Foundations`
  - Color primitives
  - Semantic color aliases
  - Typography scale and text styles
  - Spacing, radius, and elevation
- `Components`
  - Primitives (`Button`, `Input`, `Card`, `Navbar`)
  - Stateful variants (hover, focus, disabled, loading)
  - Interaction notes for implementation parity
- `Brand Variants`
  - Domain accent variants (`dev`, `net`, `online`, `io`)
  - Shared logo geometry with variant accents only
- `Documentation`
  - Usage examples
  - Do/Don't guidance
  - Accessibility annotations

## Governance Model

- **Design foundations owners** maintain `Foundations`.
- **Component owners** maintain `Components`.
- **Release managers** approve publish operations for the shared library.
- **Code owners** ensure package updates match published Figma components.

## Publish Rules

1. Foundation token edits must update variable descriptions and intended usage.
2. Every component variant must map to implementable props/states in React.
3. Breaking changes in variants or property names must include migration notes.
4. Every publish must reference a related implementation issue or PR.

## Canonical design file (team project)

- **Project:** team `1534493113136360585`, project `591515572` ([Figma project](https://www.figma.com/files/team/1534493113136360585/project/591515572)).
- **Design file:** [Dobeu Tech Solutions Design System](https://www.figma.com/design/nTTFiPqhEBvbzw5ZDe2JIa/Dobeu-Tech-Solutions-Design-System) — file key `nTTFiPqhEBvbzw5ZDe2JIa`.
- **Pages:** Foundations (variables + overview), Components (`Button` set, `Input`, `Card`, `Navbar`), Brand Variants (TLD accent swatches), Documentation (handoff checklist).
- **Code Connect default node ids** (Dev Mode / `node-id`): Button component set `2:6`, Input `2:7`, Card `2:9`, Navbar `2:13` (colon form `2:6` etc.; URLs use hyphen `2-6`).
- **Team library publish:** in Figma, open the file → **Assets** (or file menu) → **Publish as team library** when ready for cross-file consumption. After publish, component keys appear in the REST/API flows; until then, Code Connect defaults in the repo point at this file’s node ids directly.

## Figma-to-Code Handoff Checklist

- Variables use stable slash naming (`color/brand/indigoPrimary`).
- Components include explicit state variants (default/hover/focus/disabled).
- Property controls map to code-safe primitive types (`string`, `boolean`, `enum`).
- Dev mode specs include spacing, sizing, and typography tokens.
- Code Connect defaults to **Dobeu Tech Solutions Design System** (`nTTFiPqhEBvbzw5ZDe2JIa`) with node ids for `Button`, `Input`, `Card`, and `Navbar` documented above. Override with `DOBEU_FIGMA_FILE_URL` (base design URL, no `node-id`) plus `DOBEU_FIGMA_NODE_BUTTON`, `DOBEU_FIGMA_NODE_INPUT`, `DOBEU_FIGMA_NODE_CARD`, and `DOBEU_FIGMA_NODE_NAVBAR` when mapping to a different file (e.g. another branch or published library copy).
- Resolve published library `node_id` values from component keys using `pnpm --filter @dobeu/components-react figma:resolve-nodes` with `FIGMA_ACCESS_TOKEN` set. Keys live in `packages/components-react/figma/library-component-keys.json`.
