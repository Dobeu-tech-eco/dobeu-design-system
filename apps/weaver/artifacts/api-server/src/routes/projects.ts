import { Router, type IRouter } from "express";
import { count, desc, eq, sql } from "drizzle-orm";
import { db, generationsTable, projectsTable, type ProjectRow } from "@workspace/db";
import {
  GetProjectResponse,
  ImportFigmaBody,
  ImportFigmaResponse,
  ImportMarkdownBody,
  ImportMarkdownResponse,
  ImportRepoBody,
  ImportRepoResponse,
  ListProjectsResponse,
  UpdateProjectBody,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import { analyzeMarkdown } from "../lib/analysis/markdown";
import { analyzeFigma } from "../lib/analysis/figma";
import { analyzeRepo } from "../lib/analysis/repo";
import { designProfileSchema, toProfileJson } from "../lib/profile-schema";
import { badRequest, notFound } from "../lib/http-error";

const router: IRouter = Router();

const MAX_FIG_BYTES = 30 * 1024 * 1024;

export function idParam(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("Invalid id parameter.");
  return id;
}

export function toProject(row: ProjectRow, generationCount: number) {
  return {
    id: row.id,
    name: row.name,
    sourceType: row.sourceType,
    sourceRef: row.sourceRef,
    repoProvider: row.repoProvider,
    repoBranch: row.repoBranch,
    status: row.status,
    designProfile: row.designProfile,
    warnings: row.warnings,
    sourceSummary: row.sourceSummary,
    generationCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function generationCountsByProject(): Promise<Map<number, number>> {
  const rows = await db
    .select({ projectId: generationsTable.projectId, n: count() })
    .from(generationsTable)
    .groupBy(generationsTable.projectId);
  return new Map(rows.map((r) => [r.projectId, Number(r.n)]));
}

router.get("/projects", async (_req, res) => {
  const rows = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
  const counts = await generationCountsByProject();
  res.json(ListProjectsResponse.parse(rows.map((row) => toProject(row, counts.get(row.id) ?? 0))));
});

router.post("/projects/import/markdown", async (req, res) => {
  const body = ImportMarkdownBody.parse(req.body);
  const analysis = await analyzeMarkdown(body.fileName, body.content);
  const fallbackName = body.fileName.replace(/\.(md|markdown|txt)$/i, "");
  const [row] = await db
    .insert(projectsTable)
    .values({
      name: body.name?.trim() || analysis.name.trim() || fallbackName,
      sourceType: "markdown",
      sourceRef: body.fileName,
      status: "ready",
      warnings: analysis.warnings,
      sourceSummary: analysis.summary,
      designProfile: toProfileJson(analysis.profile),
    })
    .returning();
  req.log.info({ projectId: row.id }, "markdown project imported");
  res.status(201).json(ImportMarkdownResponse.parse(toProject(row, 0)));
});

router.post("/projects/import/figma", async (req, res) => {
  const body = ImportFigmaBody.parse(req.body);
  if ((body.contentBase64.length * 3) / 4 > MAX_FIG_BYTES + 4) {
    throw badRequest("The .fig file exceeds the 30MB limit.");
  }
  const buf = Buffer.from(body.contentBase64, "base64");
  if (buf.length === 0) throw badRequest("The uploaded file is empty or not valid base64.");
  const analysis = await analyzeFigma(body.fileName, buf);
  const fallbackName = body.fileName.replace(/\.fig$/i, "");
  const [row] = await db
    .insert(projectsTable)
    .values({
      name: body.name?.trim() || analysis.name.trim() || fallbackName,
      sourceType: "figma",
      sourceRef: body.fileName,
      status: "ready",
      warnings: analysis.warnings,
      sourceSummary: analysis.summary,
      designProfile: toProfileJson(analysis.profile),
    })
    .returning();
  req.log.info({ projectId: row.id }, "figma project imported");
  res.status(201).json(ImportFigmaResponse.parse(toProject(row, 0)));
});

router.post("/projects/import/repo", async (req, res) => {
  const body = ImportRepoBody.parse(req.body);
  const analysis = await analyzeRepo(body.repoUrl);
  const [row] = await db
    .insert(projectsTable)
    .values({
      name: body.name?.trim() || analysis.name.trim() || analysis.repoName,
      sourceType: "repo",
      sourceRef: analysis.url,
      repoProvider: analysis.provider,
      repoBranch: analysis.branch,
      status: "ready",
      warnings: analysis.warnings,
      sourceSummary: analysis.summary,
      designProfile: toProfileJson(analysis.profile),
    })
    .returning();
  req.log.info({ projectId: row.id, repo: analysis.url }, "repo project imported");
  res.status(201).json(ImportRepoResponse.parse(toProject(row, 0)));
});

router.get("/projects/:id", async (req, res) => {
  const id = idParam(req.params.id);
  const [row] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!row) throw notFound("Project not found.");
  const gens = await db
    .select({
      id: generationsTable.id,
      projectId: generationsTable.projectId,
      designSystemId: generationsTable.designSystemId,
      designSystemName: generationsTable.designSystemName,
      fileCount: sql<number>`jsonb_array_length(${generationsTable.files})`,
      createdAt: generationsTable.createdAt,
    })
    .from(generationsTable)
    .where(eq(generationsTable.projectId, id))
    .orderBy(desc(generationsTable.createdAt));
  res.json(
    GetProjectResponse.parse({
      ...toProject(row, gens.length),
      generations: gens.map((g) => ({
        id: g.id,
        projectId: g.projectId,
        designSystemId: g.designSystemId,
        designSystemName: g.designSystemName,
        fileCount: Number(g.fileCount),
        createdAt: g.createdAt.toISOString(),
      })),
    }),
  );
});

router.patch("/projects/:id", async (req, res) => {
  const id = idParam(req.params.id);
  const body = UpdateProjectBody.parse(req.body);
  if (body.name === undefined && body.designProfile === undefined) {
    throw badRequest("Provide a name or a designProfile to update.");
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.designProfile !== undefined) {
    updates.designProfile = toProfileJson(designProfileSchema.parse(body.designProfile));
  }
  const [row] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
  if (!row) throw notFound("Project not found.");
  const [genRow] = await db
    .select({ n: count() })
    .from(generationsTable)
    .where(eq(generationsTable.projectId, id));
  res.json(UpdateProjectResponse.parse(toProject(row, Number(genRow?.n ?? 0))));
});

router.delete("/projects/:id", async (req, res) => {
  const id = idParam(req.params.id);
  const deleted = await db.delete(projectsTable).where(eq(projectsTable.id, id)).returning({ id: projectsTable.id });
  if (deleted.length === 0) throw notFound("Project not found.");
  res.status(204).end();
});

export default router;
