import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("token output artifacts", () => {
  const root = resolve(process.cwd(), "dist");
  const cssPath = resolve(root, "css/variables.css");
  const tailwindPath = resolve(root, "tailwind/tokens.json");
  const framerPath = resolve(root, "framer/tokens.json");
  const webflowPath = resolve(root, "webflow/tokens.json");

  it("creates all required output files", () => {
    expect(existsSync(cssPath)).toBe(true);
    expect(existsSync(tailwindPath)).toBe(true);
    expect(existsSync(framerPath)).toBe(true);
    expect(existsSync(webflowPath)).toBe(true);
  });

  it("emits css custom properties", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("--dobeu-color-brand-indigo-primary");
    expect(css).toContain("--dobeu-font-sans");
  });

  it("emits valid framer and webflow json shapes", () => {
    const framer = JSON.parse(readFileSync(framerPath, "utf8"));
    const webflow = JSON.parse(readFileSync(webflowPath, "utf8"));
    expect(Array.isArray(framer.collections)).toBe(true);
    expect(webflow.colors["brand-indigo-primary"]).toBe("#6B5CE7");
  });
});
