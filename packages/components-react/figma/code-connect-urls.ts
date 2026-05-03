/**
 * Code Connect document URLs.
 *
 * Defaults target **Dobeu Tech Solutions Design System** in team project
 * `591515572` (file key below), with primitives on the Components page.
 * Override with `DOBEU_FIGMA_FILE_URL` (base design URL, no `node-id`) and
 * `DOBEU_FIGMA_NODE_*` when mapping to another file or branch.
 *
 * To resolve node ids from **published** library component keys via Figma
 * REST, run `pnpm --filter @dobeu/components-react figma:resolve-nodes` with
 * `FIGMA_ACCESS_TOKEN` set (see `figma/library-component-keys.json`).
 */

const DEFAULT_FILE_KEY = "nTTFiPqhEBvbzw5ZDe2JIa";

/** Default node ids in the canonical design file (Components page). */
const DEFAULT_NODES = {
  button: "2:6",
  input: "2:7",
  card: "2:9",
  navbar: "2:13",
} as const;

export type CodeConnectComponent = keyof typeof DEFAULT_NODES;

function stripQuery(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

function normalizeNodeId(raw: string): string {
  return raw.trim().replace(/:/g, "-");
}

function baseDesignUrl(): string {
  const fromEnv = process.env.DOBEU_FIGMA_FILE_URL?.trim();
  if (fromEnv) return stripQuery(fromEnv);
  return `https://www.figma.com/design/${DEFAULT_FILE_KEY}/Dobeu-Tech-Solutions-Design-System`;
}

const NODE_ENV: Record<CodeConnectComponent, string | undefined> = {
  button: process.env.DOBEU_FIGMA_NODE_BUTTON,
  input: process.env.DOBEU_FIGMA_NODE_INPUT,
  card: process.env.DOBEU_FIGMA_NODE_CARD,
  navbar: process.env.DOBEU_FIGMA_NODE_NAVBAR,
};

function nodeIdFor(component: CodeConnectComponent): string {
  const fromEnv = NODE_ENV[component]?.trim();
  if (fromEnv) return normalizeNodeId(fromEnv);
  return normalizeNodeId(DEFAULT_NODES[component]);
}

/** Full Figma design URL for Code Connect `figma.connect` second argument. */
export function codeConnectDocumentUrl(component: CodeConnectComponent): string {
  return `${baseDesignUrl()}?node-id=${nodeIdFor(component)}`;
}
