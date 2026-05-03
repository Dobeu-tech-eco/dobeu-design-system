import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import tokenData from "../src/tokens.json" with { type: "json" };

const distDir = resolve(process.cwd(), "dist");

const flattenColor = (group, values) =>
  Object.entries(values).map(([name, value]) => `  --dobeu-color-${group}-${toKebab(name)}: ${value};`);

const toKebab = (value) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();

const cssLines = [
  ...flattenColor("brand", tokenData.colorTokens.brand),
  ...flattenColor("semantic", tokenData.colorTokens.semantic),
  ...flattenColor("neutral", tokenData.colorTokens.neutral),
  ...Object.entries(tokenData.spacingTokens).map(([name, value]) => `  --dobeu-space-${name}: ${value}px;`),
  ...Object.entries(tokenData.radiusTokens).map(([name, value]) => `  --dobeu-radius-${name}: ${value}px;`),
  `  --dobeu-font-sans: ${tokenData.typographyTokens.family.sans};`,
  `  --dobeu-font-mono: "${tokenData.typographyTokens.family.mono.split(",")[0]}", ui-monospace, SFMono-Regular, Menlo, monospace;`
];

const cssVariables = `:root {\n${cssLines.join("\n")}\n}\n`;

const tailwindTokens = {
  theme: {
    extend: {
      colors: {
        dobeu: {
          indigo: {
            primary: tokenData.colorTokens.brand.indigoPrimary,
            slate: tokenData.colorTokens.brand.indigoSlate,
            deep: tokenData.colorTokens.brand.indigoDeep
          },
          amber: {
            warm: tokenData.colorTokens.brand.amberWarm
          }
        }
      },
      spacing: Object.fromEntries(
        Object.entries(tokenData.spacingTokens).map(([name, value]) => [`dobeu-${name}`, `${value}px`])
      ),
      borderRadius: Object.fromEntries(
        Object.entries(tokenData.radiusTokens).map(([name, value]) => [`dobeu-${name}`, `${value}px`])
      ),
      fontFamily: {
        dobeuSans: tokenData.typographyTokens.family.sans.split(",").map((value) => value.trim()),
        dobeuMono: tokenData.typographyTokens.family.mono.split(",").map((value) => value.trim())
      }
    }
  }
};

const framerTokens = {
  collections: [
    {
      name: "color",
      modes: ["default"],
      variables: [
        { name: "brand/indigoPrimary", value: tokenData.colorTokens.brand.indigoPrimary },
        { name: "brand/indigoSlate", value: tokenData.colorTokens.brand.indigoSlate },
        { name: "brand/indigoDeep", value: tokenData.colorTokens.brand.indigoDeep },
        { name: "brand/amberWarm", value: tokenData.colorTokens.brand.amberWarm },
        { name: "semantic/success", value: tokenData.colorTokens.semantic.success },
        { name: "semantic/warning", value: tokenData.colorTokens.semantic.warning },
        { name: "semantic/error", value: tokenData.colorTokens.semantic.error }
      ]
    },
    {
      name: "spacing",
      modes: ["default"],
      variables: Object.entries(tokenData.spacingTokens).map(([name, value]) => ({
        name: `space/${name}`,
        value
      }))
    }
  ]
};

const webflowTokens = {
  colors: Object.fromEntries(
    Object.entries(tokenData.colorTokens.brand).map(([name, value]) => [`brand-${toKebab(name)}`, value])
  ),
  typography: {
    fontSans: tokenData.typographyTokens.family.sans,
    fontMono: tokenData.typographyTokens.family.mono
  },
  spacing: Object.fromEntries(
    Object.entries(tokenData.spacingTokens).map(([name, value]) => [`space-${name}`, `${value}px`])
  ),
  radius: Object.fromEntries(
    Object.entries(tokenData.radiusTokens).map(([name, value]) => [name, `${value}px`])
  )
};

const outputs = [
  { path: "dist/css/variables.css", data: cssVariables },
  { path: "dist/tailwind/tokens.json", data: JSON.stringify(tailwindTokens, null, 2) },
  { path: "dist/framer/tokens.json", data: JSON.stringify(framerTokens, null, 2) },
  { path: "dist/webflow/tokens.json", data: JSON.stringify(webflowTokens, null, 2) }
];

await mkdir(distDir, { recursive: true });

for (const output of outputs) {
  const filePath = resolve(process.cwd(), output.path);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, output.data, "utf8");
}
