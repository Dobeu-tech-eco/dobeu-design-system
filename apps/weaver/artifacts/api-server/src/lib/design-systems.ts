/**
 * Catalog of supported target design systems.
 * Source: user-provided spreadsheet of top Vercel-deployable open-source design systems.
 */
export interface DesignSystemEntry {
  id: string;
  name: string;
  organization: string;
  repoUrl: string;
  description: string;
  themingFormat: string;
  outputFormats: string[];
  brandColor: string;
}

export const DESIGN_SYSTEMS: DesignSystemEntry[] = [
  {
    id: "primer",
    name: "Primer",
    organization: "GitHub",
    repoUrl: "https://github.com/primer/css",
    description:
      "GitHub's design system powering github.com — pragmatic, dense, developer-first UI primitives.",
    themingFormat: "CSS custom properties (--color-*, --primer-*) with light/dark color modes",
    outputFormats: ["css", "typescript", "json", "markdown"],
    brandColor: "#0969DA",
  },
  {
    id: "carbon",
    name: "Carbon Design System",
    organization: "IBM",
    repoUrl: "https://github.com/carbon-design-system/carbon",
    description:
      "IBM's open-source system for products and digital experiences, built on IBM Design Language.",
    themingFormat: "SCSS theme maps compiled to --cds-* custom properties",
    outputFormats: ["scss", "css", "json", "markdown"],
    brandColor: "#0F62FE",
  },
  {
    id: "material-web",
    name: "Material Web (M3)",
    organization: "Google",
    repoUrl: "https://github.com/material-components/material-web",
    description:
      "Google's Material Design 3 web components with dynamic color and token-driven theming.",
    themingFormat: "--md-sys-* design tokens (color, typescale, shape)",
    outputFormats: ["css", "json", "markdown"],
    brandColor: "#6750A4",
  },
  {
    id: "fluent",
    name: "Fluent UI",
    organization: "Microsoft",
    repoUrl: "https://github.com/microsoft/fluentui",
    description:
      "Microsoft's cross-platform design system behind Microsoft 365, themed via BrandVariants ramps.",
    themingFormat: "TypeScript BrandVariants (16-stop brand ramp) + createLightTheme/createDarkTheme",
    outputFormats: ["typescript", "json", "markdown"],
    brandColor: "#0F6CBD",
  },
  {
    id: "cloudscape",
    name: "Cloudscape Design System",
    organization: "AWS",
    repoUrl: "https://github.com/cloudscape-design/components",
    description:
      "AWS's system for building intuitive, data-heavy web consoles and cloud products.",
    themingFormat: "Theming API — applyTheme() with token overrides",
    outputFormats: ["typescript", "json", "markdown"],
    brandColor: "#0972D3",
  },
  {
    id: "geist",
    name: "Geist",
    organization: "Vercel",
    repoUrl: "https://github.com/vercel/geist-ui",
    description:
      "Vercel's minimalist aesthetic — monochrome-first, sharp typography, deploy-page energy. (Catalog links the legacy geist-ui repo.)",
    themingFormat: "Theme object (themes.createFromLight) + CSS custom properties",
    outputFormats: ["typescript", "css", "json", "markdown"],
    brandColor: "#000000",
  },
  {
    id: "radix",
    name: "Radix Themes",
    organization: "Radix UI (WorkOS)",
    repoUrl: "https://github.com/radix-ui/themes",
    description:
      "Composable theme layer over Radix primitives with 12-step color scales and accessible defaults.",
    themingFormat: "Theme component props + 12-step color scale CSS variables",
    outputFormats: ["css", "tsx", "json", "markdown"],
    brandColor: "#3E63DD",
  },
  {
    id: "atlassian",
    name: "Atlassian Design System",
    organization: "Atlassian",
    repoUrl: "https://github.com/atlassian/atlassian-frontend-mirror",
    description:
      "The system behind Jira, Confluence and Trello — token-driven with strong semantic naming.",
    themingFormat: "Design tokens exposed as --ds-* custom properties",
    outputFormats: ["css", "typescript", "json", "markdown"],
    brandColor: "#0052CC",
  },
  {
    id: "polaris",
    name: "Polaris",
    organization: "Shopify",
    repoUrl: "https://github.com/Shopify/polaris",
    description:
      "Shopify's admin design system — commerce-grade forms, data views and merchant workflows.",
    themingFormat: "--p-* custom properties (color, space, radius, shadow token groups)",
    outputFormats: ["css", "json", "markdown"],
    brandColor: "#008060",
  },
  {
    id: "spectrum",
    name: "Spectrum",
    organization: "Adobe",
    repoUrl: "https://github.com/adobe/spectrum-css",
    description:
      "Adobe's design language for creative tools — scale-aware components and precise color science.",
    themingFormat: "--spectrum-* custom properties with global + alias token layers",
    outputFormats: ["css", "json", "markdown"],
    brandColor: "#1473E6",
  },
];

export function getDesignSystem(id: string): DesignSystemEntry | undefined {
  return DESIGN_SYSTEMS.find((s) => s.id === id);
}
