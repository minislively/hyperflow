import fs from "node:fs/promises";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

const ROOT = process.cwd();
const GENERATED_BANNER = "// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.\n\n";

const generatedPairs = [
  ["packages/sdk/src/index.ts", "packages/sdk/src/index.js"],
  ["packages/wasm-bindings/src/index.ts", "packages/wasm-bindings/src/index.js"],
  ["packages/renderer-canvas/src/index.ts", "packages/renderer-canvas/src/index.js"],
  ["examples/vanilla-starter/src/main.ts", "examples/vanilla-starter/src/main.runtime.js"],
  ["packages/sdk/test/sdk.test.ts", "packages/sdk/test/sdk.test.js"],
  ["packages/wasm-bindings/test/bridge.test.ts", "packages/wasm-bindings/test/bridge.test.js"],
  ["packages/renderer-canvas/test/render.test.ts", "packages/renderer-canvas/test/render.test.js"],
  ["tests/e2e/react-starter.apply-flow.spec.ts", "tests/e2e/react-starter.apply-flow.spec.js"]
];

async function writeGeneratedArtifact(sourceRelative, targetRelative) {
  const sourcePath = path.join(ROOT, sourceRelative);
  const targetPath = path.join(ROOT, targetRelative);
  const source = await fs.readFile(sourcePath, "utf8");
  const transformed = stripTypeScriptTypes(source, { mode: "transform" });
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${GENERATED_BANNER}${transformed}`);
}

await Promise.all(generatedPairs.map(([sourceRelative, targetRelative]) => writeGeneratedArtifact(sourceRelative, targetRelative)));
