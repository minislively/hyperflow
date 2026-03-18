import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredPaths = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  ".gitignore",
  "package.json",
  "pnpm-workspace.yaml",
  "docs/prd/hyperflow-prd-v0.1.md",
  "packages/core-rs/Cargo.toml",
  "packages/sdk/package.json",
  "packages/renderer-canvas/package.json",
  "packages/react/package.json",
  "packages/vanilla/package.json",
  "examples/react-starter/package.json",
  "examples/vanilla-starter/package.json"
];

const missing = requiredPaths.filter((rel) => !fs.existsSync(path.join(root, rel)));
if (missing.length) {
  console.error("Missing required paths:");
  for (const rel of missing) console.error(`- ${rel}`);
  process.exit(1);
}

const packageJsons = [
  "package.json",
  "packages/wasm-bindings/package.json",
  "packages/sdk/package.json",
  "packages/renderer-canvas/package.json",
  "packages/react/package.json",
  "packages/vue/package.json",
  "packages/svelte/package.json",
  "packages/vanilla/package.json",
  "packages/theme-default/package.json",
  "examples/react-starter/package.json",
  "examples/vanilla-starter/package.json"
];

for (const rel of packageJsons) {
  JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

console.log("Workspace structure validated.");
