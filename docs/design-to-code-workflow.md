# Design-to-Code Workflow

This workflow defines how Dobeu ships design system changes from Figma Pro into code.

## Flow

1. Propose change in Figma (`Foundations` or `Components`).
2. Review and publish Figma library update.
3. Implement matching change in repository package(s):
   - `@dobeu-private/tokens` for variable/token changes
   - `@dobeu-private/components-react` for component changes
4. Run package tests and workspace checks.
5. Add changeset for user-facing package updates.
6. Merge and publish package artifacts.

## Change Classes

- **Foundation change**: must update token contract and all output targets.
- **Component change**: must update React component, tests, and Code Connect mapping.
- **Brand variant change**: must preserve shared logo geometry and only vary approved accents.

## Required Validation

- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## Release Readiness

A change is release-ready when:

- Figma publish notes and implementation notes are linked.
- Package changes are versioned with changesets.
- Downstream outputs (Framer/Webflow JSON) are regenerated and verified.
