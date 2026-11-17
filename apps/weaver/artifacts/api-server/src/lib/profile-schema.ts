import { z } from "zod/v4";
import type { DesignProfileJson } from "@workspace/db";
import { mix, normalizeHex, readableOn, isDark } from "./color";

const hex = z
  .string()
  .transform((v) => normalizeHex(v))
  .pipe(z.string().regex(/^#[0-9a-f]{6}$/));

const optionalHex = z
  .string()
  .nullish()
  .transform((v) => (v == null ? null : normalizeHex(v)));

export const designProfileSchema = z.object({
  colors: z.object({
    primary: hex,
    secondary: optionalHex,
    accent: optionalHex,
    background: hex,
    surface: optionalHex,
    text: hex,
    muted: optionalHex,
    border: optionalHex,
    success: optionalHex,
    warning: optionalHex,
    danger: optionalHex,
    palette: z
      .array(
        z.object({
          name: z.string().min(1).max(60),
          hex,
          role: z.string().max(60).nullish(),
        }),
      )
      .max(24)
      .optional(),
  }),
  typography: z.object({
    headingFont: z.string().min(1).max(120),
    bodyFont: z.string().min(1).max(120),
    monoFont: z.string().max(120).nullish(),
    baseSizePx: z.number().min(10).max(24).nullish(),
    scaleRatio: z.number().min(1.05).max(1.8).nullish(),
    headingWeight: z.number().min(100).max(900).nullish(),
    bodyWeight: z.number().min(100).max(900).nullish(),
  }),
  spacing: z.object({
    basePx: z.number().min(2).max(16),
    density: z.enum(["compact", "comfortable", "spacious"]),
  }),
  radius: z.object({
    basePx: z.number().min(0).max(32),
    style: z.enum(["sharp", "subtle", "rounded", "pill"]),
  }),
  shadows: z.object({
    style: z.enum(["none", "subtle", "elevated", "dramatic"]),
  }),
  tone: z.object({
    summary: z.string().min(1).max(500),
    descriptors: z.array(z.string().min(1).max(40)).min(1).max(10),
  }),
});

export type ParsedProfile = z.infer<typeof designProfileSchema>;

export function toProfileJson(p: ParsedProfile): DesignProfileJson {
  return p as DesignProfileJson;
}

/** A fully-resolved palette with every optional slot filled deterministically. */
export interface ResolvedProfile {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
    onPrimary: string;
    palette: { name: string; hex: string; role?: string | null }[];
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
    baseSizePx: number;
    scaleRatio: number;
    headingWeight: number;
    bodyWeight: number;
  };
  spacing: { basePx: number; density: "compact" | "comfortable" | "spacious" };
  radius: { basePx: number; style: "sharp" | "subtle" | "rounded" | "pill" };
  shadows: { style: "none" | "subtle" | "elevated" | "dramatic" };
  tone: { summary: string; descriptors: string[] };
  darkMode: boolean;
}

export function resolveProfile(profile: DesignProfileJson): ResolvedProfile {
  const c = profile.colors;
  const bg = normalizeHex(c.background) ?? "#ffffff";
  const text = normalizeHex(c.text) ?? "#111827";
  const primary = normalizeHex(c.primary) ?? "#3b82f6";
  const dark = isDark(bg);
  const towardText = (t: number) => mix(bg, text, t);
  return {
    colors: {
      primary,
      secondary: normalizeHex(c.secondary ?? null) ?? mix(primary, dark ? "#ffffff" : "#000000", 0.25),
      accent: normalizeHex(c.accent ?? null) ?? primary,
      background: bg,
      surface: normalizeHex(c.surface ?? null) ?? towardText(0.035),
      text,
      muted: normalizeHex(c.muted ?? null) ?? towardText(0.55),
      border: normalizeHex(c.border ?? null) ?? towardText(0.14),
      success: normalizeHex(c.success ?? null) ?? "#15803d",
      warning: normalizeHex(c.warning ?? null) ?? "#b45309",
      danger: normalizeHex(c.danger ?? null) ?? "#b91c1c",
      onPrimary: readableOn(primary),
      palette: (c.palette ?? []).map((p) => ({
        name: p.name,
        hex: normalizeHex(p.hex) ?? "#000000",
        role: p.role ?? null,
      })),
    },
    typography: {
      headingFont: profile.typography.headingFont,
      bodyFont: profile.typography.bodyFont,
      monoFont: profile.typography.monoFont ?? "ui-monospace, SFMono-Regular, Menlo, monospace",
      baseSizePx: profile.typography.baseSizePx ?? 16,
      scaleRatio: profile.typography.scaleRatio ?? 1.25,
      headingWeight: profile.typography.headingWeight ?? 600,
      bodyWeight: profile.typography.bodyWeight ?? 400,
    },
    spacing: profile.spacing,
    radius: profile.radius,
    shadows: profile.shadows,
    tone: profile.tone,
    darkMode: dark,
  };
}
