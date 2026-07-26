# Token Contract: Figma Variables to Code Tokens

This contract prevents drift between Figma and package outputs.

## Naming Rules

- Figma variables use slash notation: `group/subgroup/tokenName`.
- Code exports use object keys in camelCase.
- CSS custom properties use kebab-case prefixed with `--dobeu-`.

## Mapping Table

| Figma Variable | Type | Code Key | CSS Variable | Tailwind Key |
|---|---|---|---|---|
| `color/brand/indigoPrimary` | color | `colorTokens.brand.indigoPrimary` | `--dobeu-color-brand-indigo-primary` | `dobeu.indigo.primary` |
| `color/brand/indigoSlate` | color | `colorTokens.brand.indigoSlate` | `--dobeu-color-brand-indigo-slate` | `dobeu.indigo.slate` |
| `color/brand/amberWarm` | color | `colorTokens.brand.amberWarm` | `--dobeu-color-brand-amber-warm` | `dobeu.amber.warm` |
| `space/4` | number | `spacingTokens["4"]` | `--dobeu-space-4` | `dobeu-4` |
| `radius/md` | number | `radiusTokens.md` | `--dobeu-radius-md` | `dobeu-md` |
| `font/sans` | string | `typographyTokens.family.sans` | `--dobeu-font-sans` | `dobeuSans` |

## Output Contract

`@dobeu-tech-eco/tokens` must always produce all four artifacts:

1. `dist/css/variables.css`
2. `dist/tailwind/tokens.json`
3. `dist/framer/tokens.json`
4. `dist/webflow/tokens.json`

All four outputs are required before merging token changes.
