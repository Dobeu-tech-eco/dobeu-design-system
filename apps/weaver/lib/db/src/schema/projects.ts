import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Structural mirror of the API DesignProfile schema (validated with api-zod at the route layer). */
export interface PaletteColorJson {
  name: string;
  hex: string;
  role?: string | null;
}

export interface DesignProfileJson {
  colors: {
    primary: string;
    secondary?: string | null;
    accent?: string | null;
    background: string;
    surface?: string | null;
    text: string;
    muted?: string | null;
    border?: string | null;
    success?: string | null;
    warning?: string | null;
    danger?: string | null;
    palette?: PaletteColorJson[];
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    monoFont?: string | null;
    baseSizePx?: number | null;
    scaleRatio?: number | null;
    headingWeight?: number | null;
    bodyWeight?: number | null;
  };
  spacing: { basePx: number; density: "compact" | "comfortable" | "spacious" };
  radius: { basePx: number; style: "sharp" | "subtle" | "rounded" | "pill" };
  shadows: { style: "none" | "subtle" | "elevated" | "dramatic" };
  tone: { summary: string; descriptors: string[] };
}

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull(), // markdown | figma | repo
  /** Original file name (markdown/figma) or repository URL (repo). */
  sourceRef: text("source_ref").notNull(),
  repoProvider: text("repo_provider"), // github | gitlab | bitbucket | git
  repoBranch: text("repo_branch"),
  status: text("status").notNull().default("ready"), // ready | failed
  warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
  sourceSummary: text("source_summary"),
  designProfile: jsonb("design_profile").$type<DesignProfileJson>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectRow = typeof projectsTable.$inferSelect;
