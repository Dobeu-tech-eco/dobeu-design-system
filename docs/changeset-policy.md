# Changeset Policy

Use this policy for all user-facing package changes.

## When a changeset is required

- New tokens or token value changes in `@dobeu/tokens`
- New or changed component APIs in `@dobeu/components-react`
- Visual behavior changes that affect consumers

## Changeset guidance

- Prefer concise rationale focused on user impact.
- Include impacted packages in a single coherent changeset when shipped together.
- Do not bundle unrelated refactors into release changesets.

## Versioning intent

- Patch: fixes and backward-compatible visual/internal improvements
- Minor: backward-compatible feature additions
- Major: breaking changes to exports, props, or token contracts
