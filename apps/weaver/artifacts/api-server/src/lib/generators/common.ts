import type { GenerationFileJson } from "@workspace/db";
import type { DesignSystemEntry } from "../design-systems";
import type { ResolvedProfile } from "../profile-schema";
import { ramp, readableOn, withAlpha } from "../color";

export type GenFile = GenerationFileJson;

export function fontStack(family: string, mono = false): string {
  const fallback = mono
    ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  const quoted = /[\s]/.test(family) && !family.includes(",") ? `'${family}'` : family;
  return family.includes(",") ? family : `${quoted}, ${fallback}`;
}

export function spacingScale(basePx: number, density: ResolvedProfile["spacing"]["density"]): number[] {
  const factor = density === "compact" ? 0.85 : density === "spacious" ? 1.2 : 1;
  return [0.5, 1, 1.5, 2, 3, 4, 6, 8].map((m) => Math.round(basePx * m * factor));
}

export function radiusScale(p: ResolvedProfile): { sm: number; md: number; lg: number; full: string } {
  const base = p.radius.style === "sharp" ? 0 : p.radius.basePx;
  return {
    sm: Math.max(0, Math.round(base * 0.5)),
    md: Math.round(base),
    lg: Math.round(base * 1.75),
    full: p.radius.style === "pill" ? "9999px" : `${Math.round(base * 3)}px`,
  };
}

export function shadowPresets(p: ResolvedProfile): { sm: string; md: string; lg: string } {
  const tint = withAlpha(p.colors.text, p.darkMode ? 0.5 : 0.12);
  const soft = withAlpha(p.colors.text, p.darkMode ? 0.35 : 0.07);
  switch (p.shadows.style) {
    case "none":
      return { sm: "none", md: "none", lg: "none" };
    case "subtle":
      return { sm: `0 1px 2px ${soft}`, md: `0 1px 3px ${tint}`, lg: `0 4px 12px ${soft}` };
    case "elevated":
      return { sm: `0 1px 3px ${tint}`, md: `0 4px 12px ${tint}`, lg: `0 12px 32px ${tint}` };
    case "dramatic":
      return {
        sm: `0 2px 6px ${tint}`,
        md: `0 8px 24px ${tint}`,
        lg: `0 24px 64px ${tint}, 0 8px 16px ${soft}`,
      };
  }
}

/** Shared W3C-flavored tokens.json emitted with every generation. */
export function tokensJsonFile(p: ResolvedProfile, system: DesignSystemEntry): GenFile {
  const primaryRamp = ramp(p.colors.primary);
  const spacing = spacingScale(p.spacing.basePx, p.spacing.density);
  const radii = radiusScale(p);
  const shadows = shadowPresets(p);
  const tokens = {
    $schema: "https://design-tokens.github.io/community-group/format/",
    color: {
      primary: Object.fromEntries(
        Object.entries(primaryRamp).map(([step, hex]) => [step, { $type: "color", $value: hex }]),
      ),
      "on-primary": { $type: "color", $value: p.colors.onPrimary },
      secondary: { $type: "color", $value: p.colors.secondary },
      accent: { $type: "color", $value: p.colors.accent },
      background: { $type: "color", $value: p.colors.background },
      surface: { $type: "color", $value: p.colors.surface },
      text: { $type: "color", $value: p.colors.text },
      muted: { $type: "color", $value: p.colors.muted },
      border: { $type: "color", $value: p.colors.border },
      success: { $type: "color", $value: p.colors.success },
      warning: { $type: "color", $value: p.colors.warning },
      danger: { $type: "color", $value: p.colors.danger },
    },
    font: {
      heading: { $type: "fontFamily", $value: p.typography.headingFont },
      body: { $type: "fontFamily", $value: p.typography.bodyFont },
      mono: { $type: "fontFamily", $value: p.typography.monoFont },
      "base-size": { $type: "dimension", $value: `${p.typography.baseSizePx}px` },
      "scale-ratio": { $type: "number", $value: p.typography.scaleRatio },
      "weight-heading": { $type: "fontWeight", $value: p.typography.headingWeight },
      "weight-body": { $type: "fontWeight", $value: p.typography.bodyWeight },
    },
    spacing: Object.fromEntries(spacing.map((v, i) => [`${i + 1}`, { $type: "dimension", $value: `${v}px` }])),
    radius: {
      sm: { $type: "dimension", $value: `${radii.sm}px` },
      md: { $type: "dimension", $value: `${radii.md}px` },
      lg: { $type: "dimension", $value: `${radii.lg}px` },
      full: { $type: "dimension", $value: radii.full },
    },
    shadow: {
      sm: { $type: "shadow", $value: shadows.sm },
      md: { $type: "shadow", $value: shadows.md },
      lg: { $type: "shadow", $value: shadows.lg },
    },
    meta: {
      "target-system": { $value: system.name },
      "target-repo": { $value: system.repoUrl },
      tone: { $value: p.tone.summary },
    },
  };
  return {
    path: "design-system/tokens.json",
    content: JSON.stringify(tokens, null, 2) + "\n",
    language: "json",
    description: "Portable W3C-style design tokens distilled from the imported source",
  };
}

export function readmeFile(
  p: ResolvedProfile,
  system: DesignSystemEntry,
  projectName: string,
  fileSummaries: { path: string; purpose: string }[],
  installSteps: string[],
): GenFile {
  const lines = [
    `# ${projectName} × ${system.name}`,
    "",
    `Theme package generated by Design System Forge. It maps the design profile extracted from **${projectName}** onto **${system.name}** (${system.organization}) — themed via ${system.themingFormat}.`,
    "",
    `Design tone: ${p.tone.summary}`,
    "",
    "## Files",
    "",
    ...fileSummaries.map((f) => `- \`${f.path}\` — ${f.purpose}`),
    "",
    "## Apply the theme",
    "",
    ...installSteps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## Core values",
    "",
    "| Token | Value |",
    "| --- | --- |",
    `| Primary | \`${p.colors.primary}\` |`,
    `| Background | \`${p.colors.background}\` |`,
    `| Text | \`${p.colors.text}\` |`,
    `| Heading font | ${p.typography.headingFont} |`,
    `| Body font | ${p.typography.bodyFont} |`,
    `| Base spacing | ${p.spacing.basePx}px (${p.spacing.density}) |`,
    `| Radius | ${p.radius.basePx}px (${p.radius.style}) |`,
    `| Shadows | ${p.shadows.style} |`,
    "",
    `Reference: ${system.repoUrl}`,
    "",
  ];
  return {
    path: "design-system/README.md",
    content: lines.join("\n"),
    language: "markdown",
    description: "Install instructions and token overview",
  };
}

/** 16-stop brand ramp (Fluent-style keys 10..160), light→dark. */
export function sixteenStopRamp(hex: string): Record<number, string> {
  const r = ramp(hex);
  const stops: Record<number, string> = {};
  const seq = [r[50], r[100], r[200], r[200], r[300], r[300], r[400], r[400], r[500], r[500], r[600], r[600], r[700], r[800], r[900], r[950]];
  seq.forEach((c, i) => {
    stops[(i + 1) * 10] = c;
  });
  return stops;
}

export function onColor(bg: string): string {
  return readableOn(bg);
}
