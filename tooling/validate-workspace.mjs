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
  "docs/architecture/sdk-contract.md",
  "docs/evaluator/README.md",
  "docs/evaluator/session-checklist.md",
  "docs/evaluator/session-script.md",
  "docs/evaluator/feedback-template.md",
  "benchmarks/fixtures.js",
  "benchmarks/run-poc.mjs",
  "benchmarks/perf-baseline-fixtures/benchmark-within.json",
  "benchmarks/perf-baseline-fixtures/benchmark-over.json",
  "benchmarks/perf-baseline-fixtures/benchmark-regressed-before.json",
  "benchmarks/perf-baseline-fixtures/benchmark-regressed-after.json",
  "packages/core-rs/Cargo.toml",
  "packages/core-rs/src/lib.rs",
  "packages/wasm-bindings/package.json",
  "packages/wasm-bindings/src/index.ts",
  "packages/wasm-bindings/src/index.js",
  "packages/sdk/src/index.ts",
  "packages/sdk/src/index.js",
  "packages/renderer-canvas/package.json",
  "packages/renderer-canvas/src/index.ts",
  "packages/renderer-canvas/src/index.js",
  "packages/react/package.json",
  "packages/vanilla/package.json",
  "examples/react-starter/package.json",
  "examples/react-starter/src/perf-baseline.ts",
  "examples/react-starter/src/perf-baseline.js",
  "examples/react-starter/src/perf-baseline.test.ts",
  "examples/react-starter/src/perf-baseline.test.js",
  "examples/react-starter/src/perf-baseline-cli.test.ts",
  "examples/react-starter/src/perf-baseline-cli.test.js",
  "examples/vanilla-starter/package.json",
  "examples/vanilla-starter/index.html",
  "examples/vanilla-starter/src/main.ts",
  "examples/vanilla-starter/src/main.js",
  "examples/vanilla-starter/src/main.runtime.js",
  "examples/vanilla-starter/src/styles.css",
  "packages/sdk/test/sdk.test.ts",
  "packages/sdk/test/sdk.test.js",
  "packages/wasm-bindings/test/bridge.test.ts",
  "packages/wasm-bindings/test/bridge.test.js",
  "packages/renderer-canvas/test/render.test.ts",
  "packages/renderer-canvas/test/render.test.js",
  "tests/e2e/react-starter.apply-flow.spec.ts",
  "tests/e2e/react-starter.apply-flow.spec.js",
  "tooling/sync-ts-artifacts.mjs",
  "tooling/evaluate-perf-baseline.mjs",
  "tooling/verify-perf-gate.mjs",
  "tooling/verify-live-perf.mjs",
  "tsconfig.json",
  "types/node-shims.d.ts"
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
