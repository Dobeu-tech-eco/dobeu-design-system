import type { Response } from "express";
import archiver from "archiver";
import type { GenerationRow, ProjectRow } from "@workspace/db";
import { fetchRepoToTemp, parseRepoUrl, walkFiles } from "./analysis/repo";

const MAX_CODEBASE_FILE_BYTES = 10 * 1024 * 1024;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "design-system"
  );
}

function startZip(res: Response, filename: string): archiver.Archiver {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);
  return archive;
}

/** Zip only the generated design-system files. */
export async function streamPackageZip(
  res: Response,
  project: ProjectRow,
  generation: GenerationRow,
): Promise<void> {
  const archive = startZip(res, `${slugify(project.name)}-${generation.designSystemId}-theme.zip`);
  for (const file of generation.files) {
    archive.append(file.content, { name: file.path });
  }
  await archive.finalize();
}

/**
 * Re-fetch the imported repository and stream it with the generated
 * design-system files injected at the repo root.
 */
export async function streamCodebaseZip(
  res: Response,
  project: ProjectRow,
  generation: GenerationRow,
): Promise<void> {
  const ref = parseRepoUrl(project.sourceRef);
  const fetched = await fetchRepoToTemp(ref);
  try {
    const root = `${ref.repoName}-${generation.designSystemId}/`;
    const archive = startZip(res, `${slugify(project.name)}-${generation.designSystemId}-codebase.zip`);
    const files = await walkFiles(fetched.dir, 20_000);
    const generatedPaths = new Set(generation.files.map((f) => f.path));
    for (const file of files) {
      if (file.size > MAX_CODEBASE_FILE_BYTES) continue;
      if (generatedPaths.has(file.rel)) continue; // generated files win on collision
      archive.file(file.abs, { name: root + file.rel });
    }
    for (const file of generation.files) {
      archive.append(file.content, { name: root + file.path });
    }
    await archive.finalize();
  } finally {
    await fetched.cleanup();
  }
}
