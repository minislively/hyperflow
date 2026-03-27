import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const usageExitCode = 64;
const defaultPreset = "benchmark";
const defaultFailOn = "none";
const supportedFailOns = new Set([defaultFailOn, "over", "not-within"]);
const captureTestTag = "@perf-live-capture";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const evaluateCliPath = path.join(repoRoot, "tooling/evaluate-perf-baseline.mjs");
const captureSpecPath = path.join(repoRoot, "tests/e2e/react-starter.apply-flow.spec.js");

function failUsage(message) {
  console.error(message);
  process.exit(usageExitCode);
}

function parseArgs(argv) {
  const options = {
    preset: defaultPreset,
    failOn: defaultFailOn,
    artifact: path.join(repoRoot, "test-results", "perf-live", `${defaultPreset}-readout.json`),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case "--preset":
        if (!next) failUsage("Missing value for --preset.");
        options.preset = next;
        options.artifact = path.join(repoRoot, "test-results", "perf-live", `${next}-readout.json`);
        index += 1;
        break;
      case "--fail-on":
        if (!next) failUsage("Missing value for --fail-on.");
        options.failOn = next;
        index += 1;
        break;
      case "--artifact":
        if (!next) failUsage("Missing value for --artifact.");
        options.artifact = path.resolve(repoRoot, next);
        index += 1;
        break;
      default:
        failUsage(`Unknown argument: ${arg}`);
    }
  }

  if (options.preset !== "benchmark") {
    failUsage("--preset must be benchmark for the current live perf lane.");
  }
  if (!supportedFailOns.has(options.failOn)) {
    failUsage("--fail-on must be one of: none, over, not-within.");
  }

  return options;
}

function runCommand(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await fs.mkdir(path.dirname(options.artifact), { recursive: true });
  await fs.rm(options.artifact, { force: true });

  const captureResult = runCommand(
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      captureSpecPath,
      "--grep",
      captureTestTag,
      "--workers=1",
      "--reporter=line",
    ],
    { HYPERFLOW_LIVE_PERF_OUTPUT: options.artifact },
  );

  if (captureResult.status !== 0) {
    if (captureResult.stdout) process.stderr.write(captureResult.stdout);
    if (captureResult.stderr) process.stderr.write(captureResult.stderr);
    process.exit(captureResult.status ?? 1);
  }

  const evaluateResult = runCommand(process.execPath, [
    evaluateCliPath,
    "--preset",
    options.preset,
    "--readout",
    options.artifact,
    "--fail-on",
    options.failOn,
  ]);

  if (evaluateResult.stderr) {
    process.stderr.write(evaluateResult.stderr);
  }

  const payload = evaluateResult.stdout.trim().length > 0 ? JSON.parse(evaluateResult.stdout) : null;
  const result = {
    mode: "live-single",
    preset: options.preset,
    artifact: path.relative(repoRoot, options.artifact),
    evaluation: payload,
  };

  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(evaluateResult.status ?? 0);
}

await main();
