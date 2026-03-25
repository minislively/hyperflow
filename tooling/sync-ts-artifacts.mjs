import fs from "node:fs/promises";
import path from "node:path";
import * as nodeModule from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const GENERATED_BANNER = "// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.\n\n";
const FORCE_FALLBACK = process.env.HYPERFLOW_FORCE_TRANSPILE_FALLBACK === "1";

const generatedPairs = [
  ["packages/sdk/src/index.ts", "packages/sdk/src/index.js"],
  ["packages/wasm-bindings/src/index.ts", "packages/wasm-bindings/src/index.js"],
  ["packages/renderer-canvas/src/index.ts", "packages/renderer-canvas/src/index.js"],
  ["examples/vanilla-starter/src/main.ts", "examples/vanilla-starter/src/main.runtime.js"],
  ["examples/react-starter/src/perf-baseline.ts", "examples/react-starter/src/perf-baseline.js"],
  ["packages/sdk/test/sdk.test.ts", "packages/sdk/test/sdk.test.js"],
  ["packages/wasm-bindings/test/bridge.test.ts", "packages/wasm-bindings/test/bridge.test.js"],
  ["packages/renderer-canvas/test/render.test.ts", "packages/renderer-canvas/test/render.test.js"],
  ["examples/react-starter/src/perf-baseline.test.ts", "examples/react-starter/src/perf-baseline.test.js"],
  ["tests/e2e/react-starter.apply-flow.spec.ts", "tests/e2e/react-starter.apply-flow.spec.js"]
];

async function resolveEsbuildTransform() {
  const candidates = [
    path.join(ROOT, "node_modules/esbuild/lib/main.js"),
    path.join(ROOT, "node_modules/.pnpm/node_modules/esbuild/lib/main.js"),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      const esbuild = await import(pathToFileURL(candidate).href);
      if (typeof esbuild.transform === "function") {
        return esbuild.transform;
      }
    } catch {}
  }

  throw new Error(
    "sync-ts-artifacts could not find node:module.stripTypeScriptTypes or an installed esbuild fallback.",
  );
}

async function transformTypeScript(source, sourceRelative) {
  if (!FORCE_FALLBACK && typeof nodeModule.stripTypeScriptTypes === "function") {
    return nodeModule.stripTypeScriptTypes(source, { mode: "transform" });
  }

  const transform = await resolveEsbuildTransform();
  const result = await transform(source, {
    loader: "ts",
    format: "esm",
    target: "esnext",
    sourcemap: false,
    sourcefile: sourceRelative,
  });
  return result.code.trimEnd();
}

async function writeGeneratedArtifact(sourceRelative, targetRelative) {
  const sourcePath = path.join(ROOT, sourceRelative);
  const targetPath = path.join(ROOT, targetRelative);
  const source = await fs.readFile(sourcePath, "utf8");
  const transformed = await transformTypeScript(source, sourceRelative);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${GENERATED_BANNER}${transformed}`);
}

await Promise.all(generatedPairs.map(([sourceRelative, targetRelative]) => writeGeneratedArtifact(sourceRelative, targetRelative)));
