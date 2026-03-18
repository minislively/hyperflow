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
  "docs/architecture/monorepo-layout.md",
  "docs/architecture/poc-contract.md",
  "benchmarks/fixtures.js",
  "benchmarks/run-poc.mjs",
  "packages/core-rs/Cargo.toml",
  "packages/core-rs/src/lib.rs",
  "packages/wasm-bindings/package.json",
  "packages/wasm-bindings/src/index.js",
  "packages/renderer-canvas/package.json",
  "packages/renderer-canvas/src/index.js",
  "packages/react/package.json",
  "packages/vanilla/package.json",
  "examples/react-starter/package.json",
  "examples/vanilla-starter/package.json",
  "examples/vanilla-starter/index.html",
  "examples/vanilla-starter/src/main.js",
  "examples/vanilla-starter/src/styles.css"
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
