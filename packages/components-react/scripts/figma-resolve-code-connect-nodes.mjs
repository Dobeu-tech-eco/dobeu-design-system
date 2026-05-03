#!/usr/bin/env node
/**
 * Resolve published library component keys to file_key + node_id via Figma REST.
 *
 * Usage:
 *   FIGMA_ACCESS_TOKEN=... node scripts/figma-resolve-code-connect-nodes.mjs
 *
 * Prints shell-ready exports for DOBEU_FIGMA_FILE_URL and DOBEU_FIGMA_NODE_*.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keysPath = join(__dirname, "../figma/library-component-keys.json");

const token = process.env.FIGMA_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Missing FIGMA_ACCESS_TOKEN (Figma personal access token).");
  process.exit(1);
}

const raw = readFileSync(keysPath, "utf8");
const keys = JSON.parse(raw);

const entries = Object.entries(keys).filter(
  ([k, v]) => typeof v === "string" && !k.startsWith("$")
);

async function fetchComponent(key) {
  const res = await fetch(`https://api.figma.com/v1/components/${key}`, {
    headers: { "X-Figma-Token": token },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API ${res.status} for key ${key}: ${text}`);
  }
  return res.json();
}

const results = {};
for (const [name, componentKey] of entries) {
  const meta = await fetchComponent(componentKey);
  results[name] = {
    file_key: meta.meta?.file_key,
    node_id: meta.meta?.node_id,
    name: meta.meta?.name,
  };
}

const fileKeys = new Set(Object.values(results).map((r) => r.file_key));
if (fileKeys.size !== 1) {
  console.warn("Warning: components resolve to different file_key values:", [
    ...fileKeys,
  ]);
}

const fileKey = [...fileKeys][0];
const base = `https://www.figma.com/design/${fileKey}/dobeu-design-system`;

console.log("\n# Paste into your shell (or CI secrets) for Code Connect:\n");
console.log(`export DOBEU_FIGMA_FILE_URL="${base}"`);
const ENV_BY_NAME = {
  button: "DOBEU_FIGMA_NODE_BUTTON",
  input: "DOBEU_FIGMA_NODE_INPUT",
  card: "DOBEU_FIGMA_NODE_CARD",
  navbar: "DOBEU_FIGMA_NODE_NAVBAR",
};

for (const [name, r] of Object.entries(results)) {
  const env = ENV_BY_NAME[name] ?? `DOBEU_FIGMA_NODE_${name.toUpperCase()}`;
  const node = (r.node_id ?? "").replace(/:/g, "-");
  console.log(`export ${env}="${node}"`);
}
console.log("\n# Component names from API:\n");
console.log(JSON.stringify(results, null, 2));
