# Component Parity Checklist

Use this checklist when implementing Figma components in `@dobeu-tech-eco/components-react`.

## Required Parity Dimensions

- Variant parity: every Figma variant has a corresponding prop/state.
- Property parity: text, enum, boolean, and slot properties map directly.
- Interaction parity: hover/focus/disabled/loading visual states are represented.
- Accessibility parity: semantic roles and labels are carried into implementation.
- Token parity: hardcoded colors/spacings are avoided in favor of `@dobeu-tech-eco/tokens` values.

## Initial Primitive Set

- `DobeuButton`
  - Variants: `primary`, `secondary`
  - States: default, hover, focus, disabled
- `DobeuInput`
  - States: default, focus, disabled, error
- `DobeuCard`
  - Sections: title, subtitle, body slot
- `DobeuNavbar`
  - Properties: brand text, right content slot

## Review Gate

No component is considered done until:

1. React implementation exists
2. Test coverage exists
3. Code Connect mapping exists
4. Parity checklist items are validated
