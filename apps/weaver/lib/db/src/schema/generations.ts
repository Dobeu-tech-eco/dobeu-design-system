import { pgTable, text, serial, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export interface GenerationFileJson {
  path: string;
  content: string;
  language: string;
  description?: string | null;
}

export const generationsTable = pgTable("generations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  designSystemId: text("design_system_id").notNull(),
  designSystemName: text("design_system_name").notNull(),
  status: text("status").notNull().default("complete"), // complete | failed
  files: jsonb("files").$type<GenerationFileJson[]>().notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGenerationSchema = createInsertSchema(generationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type GenerationRow = typeof generationsTable.$inferSelect;
