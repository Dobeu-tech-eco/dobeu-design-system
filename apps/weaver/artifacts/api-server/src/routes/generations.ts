import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, generationsTable, projectsTable, type GenerationRow } from "@workspace/db";
import {
  CreateGenerationBody,
  CreateGenerationResponse,
  DownloadGenerationQueryParams,
  GetGenerationResponse,
} from "@workspace/api-zod";
import { getDesignSystem } from "../lib/design-systems";
import { generateForSystem } from "../lib/generators";
import { resolveProfile } from "../lib/profile-schema";
import { mappingNotes } from "../lib/ai";
import { badRequest, notFound } from "../lib/http-error";
import { streamCodebaseZip, streamPackageZip } from "../lib/zip";
import { idParam } from "./projects";

const router: IRouter = Router();

function toGeneration(row: GenerationRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    designSystemId: row.designSystemId,
    designSystemName: row.designSystemName,
    files: row.files,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

router.post("/projects/:id/generations", async (req, res) => {
  const projectId = idParam(req.params.id);
  const body = CreateGenerationBody.parse(req.body);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) throw notFound("Project not found.");
  const system = getDesignSystem(body.designSystemId);
  if (!system) throw badRequest(`Unknown design system "${body.designSystemId}".`);

  const resolved = resolveProfile(project.designProfile);
  const pkg = generateForSystem(system, resolved, project.name);
  const aiNotes = await mappingNotes({
    systemName: system.name,
    organization: system.organization,
    themingFormat: system.themingFormat,
    profileJson: JSON.stringify(project.designProfile),
    fileList: pkg.files.map((f) => f.path),
  });
  const notes = aiNotes ?? `${pkg.deterministicNotes}\n\nNote: AI mapping commentary was unavailable; these notes were generated deterministically.`;

  const [row] = await db
    .insert(generationsTable)
    .values({
      projectId: project.id,
      designSystemId: system.id,
      designSystemName: system.name,
      status: "complete",
      files: pkg.files,
      notes,
    })
    .returning();
  req.log.info({ generationId: row.id, system: system.id }, "generation created");
  res.status(201).json(CreateGenerationResponse.parse(toGeneration(row)));
});

router.get("/generations/:id", async (req, res) => {
  const id = idParam(req.params.id);
  const [row] = await db.select().from(generationsTable).where(eq(generationsTable.id, id));
  if (!row) throw notFound("Generation not found.");
  res.json(GetGenerationResponse.parse(toGeneration(row)));
});

router.delete("/generations/:id", async (req, res) => {
  const id = idParam(req.params.id);
  const deleted = await db
    .delete(generationsTable)
    .where(eq(generationsTable.id, id))
    .returning({ id: generationsTable.id });
  if (deleted.length === 0) throw notFound("Generation not found.");
  res.status(204).end();
});

router.get("/generations/:id/download", async (req, res) => {
  const id = idParam(req.params.id);
  const query = DownloadGenerationQueryParams.parse(req.query);
  const scope = query.scope ?? "package";
  const [row] = await db.select().from(generationsTable).where(eq(generationsTable.id, id));
  if (!row) throw notFound("Generation not found.");
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, row.projectId));
  if (!project) throw notFound("Parent project not found.");

  if (scope === "codebase") {
    if (project.sourceType !== "repo") {
      throw badRequest("Codebase export is only available for repository imports.");
    }
    req.log.info({ generationId: id }, "streaming codebase zip");
    await streamCodebaseZip(res, project, row);
    return;
  }
  req.log.info({ generationId: id }, "streaming package zip");
  await streamPackageZip(res, project, row);
});

export default router;
