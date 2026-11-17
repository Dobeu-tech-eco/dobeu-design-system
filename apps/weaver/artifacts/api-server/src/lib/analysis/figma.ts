import * as zlib from "node:zlib";
import JSZip from "jszip";
import { decodeBinarySchema, compileSchema } from "kiwi-schema";
import { composeProfile, type AiProfileResult } from "../ai";
import { unprocessable } from "../http-error";
import { rgbToHex } from "../color";

interface FigSignals {
  fills: Map<string, number>;
  fonts: Map<string, number>;
  fontSizes: Map<number, number>;
  radii: Map<number, number>;
  shadowCount: number;
  nodeTypes: Map<string, number>;
  frameNames: string[];
  docName: string | null;
}

function newSignals(): FigSignals {
  return {
    fills: new Map(),
    fonts: new Map(),
    fontSizes: new Map(),
    radii: new Map(),
    shadowCount: 0,
    nodeTypes: new Map(),
    frameNames: [],
    docName: null,
  };
}

function inflateChunk(chunk: Buffer): Buffer {
  try {
    return zlib.inflateRawSync(chunk);
  } catch {
    try {
      return zlib.inflateSync(chunk);
    } catch {
      return chunk;
    }
  }
}

function countInto<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

interface FigColor {
  r?: number;
  g?: number;
  b?: number;
  a?: number;
}

function figColorToHex(c: FigColor): string {
  return rgbToHex({ r: (c.r ?? 0) * 255, g: (c.g ?? 0) * 255, b: (c.b ?? 0) * 255 });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function harvestNode(node: any, signals: FigSignals): void {
  if (!node || typeof node !== "object") return;
  const type = typeof node.type === "string" ? node.type : null;
  if (type) countInto(signals.nodeTypes, type);
  if (type === "DOCUMENT" && typeof node.name === "string" && !signals.docName) signals.docName = node.name;
  if ((type === "FRAME" || type === "CANVAS") && typeof node.name === "string" && signals.frameNames.length < 40) {
    signals.frameNames.push(node.name);
  }
  const paintLists = [node.fillPaints, node.strokePaints];
  for (const paints of paintLists) {
    if (!Array.isArray(paints)) continue;
    for (const paint of paints) {
      if (!paint || paint.visible === false) continue;
      if (paint.type === "SOLID" && paint.color) {
        const alpha = typeof paint.opacity === "number" ? paint.opacity : (paint.color.a ?? 1);
        if (alpha < 0.05) continue;
        countInto(signals.fills, figColorToHex(paint.color));
      }
    }
  }
  const fontName = node.fontName;
  if (fontName && typeof fontName.family === "string") {
    const style = typeof fontName.style === "string" ? fontName.style : "";
    countInto(signals.fonts, style ? `${fontName.family} ${style}` : fontName.family);
  }
  if (typeof node.fontSize === "number" && node.fontSize > 4 && node.fontSize < 200) {
    countInto(signals.fontSizes, Math.round(node.fontSize));
  }
  const radiusKeys = [
    "cornerRadius",
    "rectangleTopLeftCornerRadius",
    "rectangleTopRightCornerRadius",
    "rectangleBottomLeftCornerRadius",
    "rectangleBottomRightCornerRadius",
  ];
  for (const key of radiusKeys) {
    const v = node[key];
    if (typeof v === "number" && v >= 0 && v <= 500) countInto(signals.radii, Math.round(v));
  }
  if (Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if (effect?.type === "DROP_SHADOW" && effect.visible !== false) signals.shadowCount += 1;
    }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const FIG_MAGIC = "fig-kiwi";

/** Decode a .fig kiwi container and harvest node-level design signals. */
function extractKiwiSignals(buf: Buffer, warnings: string[]): FigSignals | null {
  try {
    if (buf.length < 16 || buf.slice(0, 8).toString("latin1") !== FIG_MAGIC) {
      return null;
    }
    let offset = 12; // 8-byte magic + 4-byte version
    const chunks: Buffer[] = [];
    while (offset + 4 <= buf.length && chunks.length < 8) {
      const size = buf.readUInt32LE(offset);
      offset += 4;
      if (size === 0 || offset + size > buf.length) break;
      chunks.push(inflateChunk(buf.slice(offset, offset + size)));
      offset += size;
    }
    if (chunks.length < 2) {
      warnings.push("The .fig container had fewer data chunks than expected.");
      return null;
    }
    const schema = decodeBinarySchema(new Uint8Array(chunks[0]));
    const codec = compileSchema(schema);
    const decode =
      typeof codec.decodeMessage === "function"
        ? codec.decodeMessage.bind(codec)
        : (() => {
            const key = Object.keys(codec).find((k) => k.startsWith("decode") && k.endsWith("Message"));
            return key ? (codec[key] as (b: Uint8Array) => Record<string, unknown>).bind(codec) : null;
          })();
    if (!decode) {
      warnings.push("Unrecognized .fig schema (no Message decoder).");
      return null;
    }
    const message = decode(new Uint8Array(chunks[1])) as { nodeChanges?: unknown[] };
    const signals = newSignals();
    const nodes = Array.isArray(message.nodeChanges) ? message.nodeChanges : [];
    for (const node of nodes) harvestNode(node, signals);
    return signals;
  } catch (err) {
    warnings.push(
      `Binary .fig parsing was partial: ${err instanceof Error ? err.message.slice(0, 120) : "decode error"}`,
    );
    return null;
  }
}

function topOf<K>(map: Map<K, number>, n: number): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `${String(k)} (x${v})`);
}

export interface FigmaAnalysis extends AiProfileResult {
  warnings: string[];
}

export async function analyzeFigma(fileName: string, buf: Buffer): Promise<FigmaAnalysis> {
  const warnings: string[] = [];
  let figBuf = buf;
  let metaName: string | null = null;

  // Newer .fig exports are ZIP containers with a canvas.fig inside.
  if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
    try {
      const zip = await JSZip.loadAsync(buf);
      const entryName =
        zip.file("canvas.fig") != null
          ? "canvas.fig"
          : Object.keys(zip.files).find((n) => n.endsWith(".fig")) ?? null;
      if (entryName) {
        figBuf = Buffer.from(await zip.file(entryName)!.async("uint8array"));
      } else {
        warnings.push("The .fig ZIP container had no inner canvas; parsing the raw file instead.");
      }
      const metaEntry = zip.file("meta.json");
      if (metaEntry) {
        try {
          const meta = JSON.parse(await metaEntry.async("string"));
          if (typeof meta?.file_name === "string") metaName = meta.file_name;
        } catch {
          /* ignore meta */
        }
      }
    } catch {
      warnings.push("The file looked like a ZIP container but could not be opened; parsing raw bytes.");
    }
  }

  const signals = extractKiwiSignals(figBuf, warnings);
  const hasSignals =
    signals != null &&
    (signals.fills.size > 0 || signals.fonts.size > 0 || signals.radii.size > 0 || signals.nodeTypes.size > 0);

  if (!signals || !hasSignals) {
    throw unprocessable(
      "Could not extract design data from this .fig file. Make sure it is a Figma local export (File → Save local copy) and not a renamed link or image.",
    );
  }

  const evidence = [
    signals.docName ? `DOCUMENT NAME: ${signals.docName}` : "",
    metaName ? `FILE NAME (metadata): ${metaName}` : "",
    `NODE TYPE COUNTS: ${topOf(signals.nodeTypes, 12).join(", ")}`,
    signals.fills.size
      ? `SOLID FILL COLORS BY FREQUENCY (includes text/canvas/shape fills):\n${topOf(signals.fills, 30).join(", ")}`
      : "NO SOLID FILLS DECODED",
    signals.fonts.size ? `FONTS USED (family + style):\n${topOf(signals.fonts, 15).join("\n")}` : "",
    signals.fontSizes.size ? `FONT SIZES: ${topOf(signals.fontSizes, 15).join(", ")}` : "",
    signals.radii.size ? `CORNER RADII: ${topOf(signals.radii, 15).join(", ")}` : "",
    `DROP SHADOW EFFECT COUNT: ${signals.shadowCount}`,
    signals.frameNames.length ? `FRAME/PAGE NAMES: ${signals.frameNames.slice(0, 25).join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await composeProfile(
    `The user uploaded a Figma .fig file named "${fileName}". The binary was decoded and the design signals below were extracted. Derive the design profile of this Figma document. The most frequent large-area fills usually indicate background/surface colors; high-frequency saturated colors usually indicate the primary/brand color; text fills usually indicate the text color.`,
    evidence,
  );
  if (metaName && result.name === fileName) result.name = metaName;
  return { ...result, warnings };
}
