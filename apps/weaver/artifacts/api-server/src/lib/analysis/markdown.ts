import { composeProfile, type AiProfileResult } from "../ai";

const MAX_CHARS = 60_000;

export interface MarkdownAnalysis extends AiProfileResult {
  warnings: string[];
}

export async function analyzeMarkdown(fileName: string, content: string): Promise<MarkdownAnalysis> {
  const warnings: string[] = [];
  let text = content;
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS)}\n\n...[truncated for analysis]`;
    warnings.push(`The markdown file is large; analysis used the first ${Math.round(MAX_CHARS / 1000)}k characters.`);
  }

  // Cheap deterministic signals to anchor the model.
  const hexes = [...text.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map((m) => m[0].toLowerCase());
  const hexCounts = new Map<string, number>();
  for (const h of hexes) hexCounts.set(h, (hexCounts.get(h) ?? 0) + 1);
  const topHexes = [...hexCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([h, n]) => `${h} (x${n})`);
  const fontMentions = [...text.matchAll(/font(?:-family)?s?\s*[:=]?\s*([A-Z][A-Za-z ]{2,40})/g)]
    .map((m) => m[1].trim())
    .slice(0, 10);

  const signalHeader = [
    topHexes.length ? `Hex colors found in the document: ${topHexes.join(", ")}` : "No hex colors found in the document.",
    fontMentions.length ? `Possible font mentions: ${fontMentions.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await composeProfile(
    `The user uploaded a design specification markdown file named "${fileName}". Extract the design profile that this document describes or implies. The document is the source of truth; the pre-scanned signals below are only hints.`,
    `--- PRE-SCANNED SIGNALS ---\n${signalHeader}\n\n--- DOCUMENT (${fileName}) ---\n${text}`,
  );
  return { ...result, warnings };
}
