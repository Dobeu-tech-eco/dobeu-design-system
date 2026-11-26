import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as tar from "tar";
import { composeProfile, type AiProfileResult } from "../ai";
import { badRequest, unprocessable } from "./../http-error";

const execFileAsync = promisify(execFile);

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100MB tarball cap
const MAX_SCAN_FILES = 6000;
const MAX_CSS_FILES = 200;
const MAX_FILE_READ_BYTES = 250_000;

export interface RepoRef {
  provider: "github" | "gitlab" | "bitbucket" | "git";
  /** Normalized https URL (no trailing .git except for generic clones where it is preserved). */
  httpsUrl: string;
  /** Full path after host, without leading slash or .git — e.g. "vercel/geist-ui" or "group/sub/project". */
  fullPath: string;
  repoName: string;
}

export function parseRepoUrl(raw: string): RepoRef {
  let url = raw.trim();
  if (url.length < 8) throw badRequest("Repository URL is too short.");
  const sshMatch = /^git@([^:]+):(.+)$/.exec(url);
  if (sshMatch) url = `https://${sshMatch[1]}/${sshMatch[2]}`;
  if (!/^https?:\/\//i.test(url)) throw badRequest("Repository URL must start with http(s):// or git@");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw badRequest("Repository URL is not a valid URL.");
  }
  const host = parsed.hostname.toLowerCase();
  const fullPath = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.git$/i, "");
  if (!fullPath || !fullPath.includes("/")) {
    throw badRequest("Repository URL must include an owner and repository name.");
  }
  const provider =
    host === "github.com" || host === "www.github.com"
      ? "github"
      : host === "gitlab.com" || host === "www.gitlab.com"
        ? "gitlab"
        : host === "bitbucket.org" || host === "www.bitbucket.org"
          ? "bitbucket"
          : "git";
  const repoName = fullPath.split("/").pop() ?? fullPath;
  return {
    provider,
    httpsUrl: `${parsed.protocol}//${parsed.host}/${fullPath}${provider === "git" ? ".git" : ""}`,
    fullPath,
    repoName,
  };
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(90_000),
    headers: { "User-Agent": "design-system-forge" },
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_DOWNLOAD_BYTES) throw new Error("Repository archive exceeds the 100MB size cap.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error("Repository archive exceeds the 100MB size cap.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export interface FetchedRepo {
  /** Directory containing the repository contents (no .git). */
  dir: string;
  branch: string | null;
  warnings: string[];
  cleanup: () => Promise<void>;
}

/** Fetch a public repo snapshot into a temp dir. Tarball first, `git clone --depth 1` as fallback. */
export async function fetchRepoToTemp(ref: RepoRef): Promise<FetchedRepo> {
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "forge-repo-"));
  const srcDir = path.join(tmpRoot, "src");
  await fsp.mkdir(srcDir, { recursive: true });
  const cleanup = async () => {
    await fsp.rm(tmpRoot, { recursive: true, force: true });
  };
  const warnings: string[] = [];

  const tarballUrls: string[] = [];
  if (ref.provider === "github") {
    tarballUrls.push(`https://codeload.github.com/${ref.fullPath}/tar.gz/HEAD`);
  } else if (ref.provider === "gitlab") {
    tarballUrls.push(
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(ref.fullPath)}/repository/archive.tar.gz`,
    );
  } else if (ref.provider === "bitbucket") {
    tarballUrls.push(`https://bitbucket.org/${ref.fullPath}/get/HEAD.tar.gz`);
  }

  for (const url of tarballUrls) {
    try {
      const buf = await downloadToBuffer(url);
      const tarPath = path.join(tmpRoot, "archive.tar.gz");
      await fsp.writeFile(tarPath, buf);
      // Peek at the first entry to learn the "<repo>-<ref>" prefix (branch hint).
      let prefix = "";
      await tar.t({
        file: tarPath,
        onReadEntry: (entry) => {
          if (!prefix) prefix = entry.path.split("/")[0] ?? "";
        },
      });
      await tar.x({ file: tarPath, cwd: srcDir, strip: 1 });
      await fsp.rm(tarPath, { force: true });
      let branch: string | null = null;
      const marker = `${ref.repoName}-`;
      if (prefix.startsWith(marker)) {
        const rest = prefix.slice(marker.length);
        branch = /^[0-9a-f]{40}$/i.test(rest) ? null : rest;
      }
      return { dir: srcDir, branch, warnings, cleanup };
    } catch (err) {
      warnings.push(
        `Archive download failed (${err instanceof Error ? err.message.slice(0, 120) : "error"}); trying git clone.`,
      );
    }
  }

  // Generic / fallback: shallow clone.
  try {
    await fsp.rm(srcDir, { recursive: true, force: true });
    await execFileAsync(
      "git",
      ["clone", "--depth", "1", "--single-branch", ref.httpsUrl.replace(/\.git$/, "") + ".git", srcDir],
      { timeout: 180_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, maxBuffer: 10 * 1024 * 1024 },
    );
    let branch: string | null = null;
    try {
      const { stdout } = await execFileAsync("git", ["-C", srcDir, "rev-parse", "--abbrev-ref", "HEAD"], {
        timeout: 15_000,
      });
      branch = stdout.trim() || null;
    } catch {
      branch = null;
    }
    await fsp.rm(path.join(srcDir, ".git"), { recursive: true, force: true });
    return { dir: srcDir, branch, warnings, cleanup };
  } catch (err) {
    await cleanup();
    throw unprocessable(
      `Could not fetch the repository. Make sure it is public and the URL is correct. (${err instanceof Error ? err.message.slice(0, 200) : "unknown error"})`,
    );
  }
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "vendor",
  "coverage",
  ".turbo",
  ".cache",
  "__pycache__",
]);

export interface WalkedFile {
  rel: string;
  abs: string;
  size: number;
}

export async function walkFiles(root: string, maxFiles = MAX_SCAN_FILES): Promise<WalkedFile[]> {
  const results: WalkedFile[] = [];
  const stack: string[] = [root];
  while (stack.length > 0 && results.length < maxFiles) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".") ) stack.push(abs);
      } else if (entry.isFile()) {
        let size = 0;
        try {
          size = (await fsp.stat(abs)).size;
        } catch {
          continue;
        }
        results.push({ rel: path.relative(root, abs), abs, size });
      }
    }
  }
  return results;
}

async function readCapped(abs: string): Promise<string> {
  const fd = await fsp.open(abs, "r");
  try {
    const buf = Buffer.alloc(MAX_FILE_READ_BYTES);
    const { bytesRead } = await fd.read(buf, 0, MAX_FILE_READ_BYTES, 0);
    return buf.slice(0, bytesRead).toString("utf8");
  } finally {
    await fd.close();
  }
}

function countInto(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function topEntries(map: Map<string, number>, n: number): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `${k} (x${v})`);
}

/** Scan a repo working tree for design signals and produce an evidence blob for the AI. */
export async function scanRepoForSignals(dir: string): Promise<{ signalsText: string; fileCount: number }> {
  const files = await walkFiles(dir);
  const colorCounts = new Map<string, number>();
  const fontCounts = new Map<string, number>();
  const radiusCounts = new Map<string, number>();
  const customProps = new Map<string, number>();
  let shadowCount = 0;
  const frameworks: string[] = [];
  const excerpts: string[] = [];

  // package.json → framework hints
  const pkgFile = files.find((f) => f.rel === "package.json");
  if (pkgFile) {
    try {
      const pkg = JSON.parse(await readCapped(pkgFile.abs));
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) } as Record<string, string>;
      const known = [
        "react", "vue", "svelte", "next", "nuxt", "tailwindcss", "@mui/material", "antd",
        "bootstrap", "styled-components", "@emotion/react", "@chakra-ui/react", "sass",
        "@radix-ui/themes", "@primer/css", "@carbon/react", "@fluentui/react-components",
      ];
      for (const k of known) if (deps[k]) frameworks.push(`${k}@${deps[k]}`);
    } catch {
      /* ignore broken package.json */
    }
  }

  // Priority theme-ish files → excerpts
  const priorityPatterns = [
    /(^|\/)tailwind\.config\.(js|ts|cjs|mjs)$/,
    /theme[^/]*\.(ts|js|json|css)$/i,
    /tokens?[^/]*\.(json|ts|js|css)$/i,
    /variables[^/]*\.(css|scss)$/i,
    /(^|\/)(globals?|index|app|main)\.(css|scss)$/i,
  ];
  const priorityFiles = files
    .filter((f) => priorityPatterns.some((p) => p.test(f.rel)) && f.size < 400_000)
    .slice(0, 10);
  for (const f of priorityFiles) {
    try {
      const content = (await readCapped(f.abs)).slice(0, 3000);
      excerpts.push(`--- ${f.rel} ---\n${content}`);
    } catch {
      /* skip unreadable */
    }
  }

  // Stylesheet scan
  const styleFiles = files
    .filter((f) => /\.(css|scss|less)$/i.test(f.rel) && !/\.min\./.test(f.rel) && f.size < 400_000)
    .slice(0, MAX_CSS_FILES);
  for (const f of styleFiles) {
    let css: string;
    try {
      css = await readCapped(f.abs);
    } catch {
      continue;
    }
    for (const m of css.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) {
      countInto(colorCounts, m[0].toLowerCase());
    }
    for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)[;}]/gi)) {
      const fam = m[1].trim().slice(0, 100);
      if (fam && !fam.startsWith("var(")) countInto(fontCounts, fam);
    }
    for (const m of css.matchAll(/border-radius\s*:\s*([^;}{]+)[;}]/gi)) {
      countInto(radiusCounts, m[1].trim().slice(0, 40));
    }
    shadowCount += [...css.matchAll(/box-shadow\s*:/gi)].length;
    for (const m of css.matchAll(/(--[a-zA-Z0-9-_]+)\s*:\s*([^;}{]+)[;}]/g)) {
      if (customProps.size < 300) countInto(customProps, `${m[1]}: ${m[2].trim().slice(0, 60)}`);
    }
  }

  // HTML font links
  const htmlFiles = files.filter((f) => /\.(html?)$/i.test(f.rel) && f.size < 200_000).slice(0, 20);
  const googleFonts = new Set<string>();
  for (const f of htmlFiles) {
    try {
      const html = await readCapped(f.abs);
      for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?[^"'\s>]*family=([^"'&\s>]+)/g)) {
        googleFonts.add(decodeURIComponent(m[1]).replace(/\+/g, " ").split(":")[0]);
      }
    } catch {
      /* skip */
    }
  }

  const sections = [
    `FILES SCANNED: ${files.length} (stylesheets: ${styleFiles.length})`,
    frameworks.length ? `FRAMEWORK / DESIGN DEPENDENCIES:\n${frameworks.join(", ")}` : "",
    colorCounts.size ? `TOP HEX COLORS BY FREQUENCY:\n${topEntries(colorCounts, 30).join(", ")}` : "NO HEX COLORS FOUND IN STYLESHEETS",
    fontCounts.size ? `FONT-FAMILY DECLARATIONS:\n${topEntries(fontCounts, 12).join("\n")}` : "",
    googleFonts.size ? `GOOGLE FONTS LOADED: ${[...googleFonts].join(", ")}` : "",
    radiusCounts.size ? `BORDER-RADIUS VALUES:\n${topEntries(radiusCounts, 12).join(", ")}` : "",
    `BOX-SHADOW DECLARATION COUNT: ${shadowCount}`,
    customProps.size ? `CSS CUSTOM PROPERTIES (sample):\n${topEntries(customProps, 40).join("\n")}` : "",
    excerpts.length ? `KEY FILE EXCERPTS:\n${excerpts.join("\n\n")}` : "",
  ].filter(Boolean);

  return { signalsText: sections.join("\n\n").slice(0, 55_000), fileCount: files.length };
}

export interface RepoAnalysis extends AiProfileResult {
  warnings: string[];
  provider: RepoRef["provider"];
  branch: string | null;
  /** Normalized https URL — stored as the project's sourceRef. */
  url: string;
  repoName: string;
}

export async function analyzeRepo(rawUrl: string): Promise<RepoAnalysis> {
  const ref = parseRepoUrl(rawUrl);
  const fetched = await fetchRepoToTemp(ref);
  try {
    const { signalsText, fileCount } = await scanRepoForSignals(fetched.dir);
    if (fileCount === 0) {
      throw unprocessable("The repository appears to be empty — nothing to analyze.");
    }
    const warnings = [...fetched.warnings];
    if (!signalsText.includes("TOP HEX COLORS BY FREQUENCY")) {
      warnings.push("Few explicit styling signals were found; the profile leans on inference from the stack and structure.");
    }
    const result = await composeProfile(
      `The user imported the public repository "${ref.httpsUrl}" (${ref.provider}). Derive the design profile of this codebase's UI from the scanned signals below. Weight explicit theme/token definitions over incidental colors. If the repo is a component library, profile its default theme.`,
      signalsText,
    );
    return {
      ...result,
      warnings,
      provider: ref.provider,
      branch: fetched.branch,
      url: ref.httpsUrl,
      repoName: ref.repoName,
    };
  } finally {
    await fetched.cleanup();
  }
}
