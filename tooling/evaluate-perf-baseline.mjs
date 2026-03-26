import fs from "node:fs/promises";
import path from "node:path";

import {
  comparePerfBaselineReadoutEvidence,
  editorPerfBaselines,
  evaluatePerfBaselineGate,
} from "../examples/react-starter/src/perf-baseline.js";

const allowedInteractionPhases = new Set(["idle", "dragging", "zooming", "settling"]);
const nullableNumberFields = [
  "fps",
  "renderMs",
  "viewportMs",
  "inputLatencyMs",
  "avgRenderMs",
  "avgViewportMs",
  "avgInputLatencyMs",
  "peakInputLatencyMs",
  "recentAvgRenderMs",
  "recentAvgViewportMs",
  "recentAvgInputLatencyMs",
  "recentPeakInputLatencyMs",
  "recentBudgetMissRate",
];
const numberFields = [
  "frameSampleCount",
  "fixtureSize",
  "visibleCount",
  "budgetMissCount",
  "interactionFrameSampleCount",
  "interactionBudgetMissCount",
  "interactionBurstCount",
  "recentInteractionSampleCount",
];
const defaultFailOn = "none";
const singleModeFailOns = new Set([defaultFailOn, "over", "not-within"]);
const compareModeFailOns = new Set([defaultFailOn, "regressed", "not-improved"]);
const usageExitCode = 64;
const thresholdExitCode = 2;

function failUsage(message) {
  console.error(message);
  process.exit(usageExitCode);
}

function parseArgs(argv) {
  const options = {
    preset: null,
    readout: null,
    before: null,
    after: null,
    failOn: defaultFailOn,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--preset":
        if (!next) failUsage("Missing value for --preset.");
        options.preset = next;
        index += 1;
        break;
      case "--readout":
        if (!next) failUsage("Missing value for --readout.");
        options.readout = next;
        index += 1;
        break;
      case "--before":
        if (!next) failUsage("Missing value for --before.");
        options.before = next;
        index += 1;
        break;
      case "--after":
        if (!next) failUsage("Missing value for --after.");
        options.after = next;
        index += 1;
        break;
      case "--fail-on":
        if (!next) failUsage("Missing value for --fail-on.");
        options.failOn = next;
        index += 1;
        break;
      default:
        failUsage(`Unknown argument: ${arg}`);
    }
  }

  if (options.preset !== "starter" && options.preset !== "benchmark") {
    failUsage("--preset must be one of: starter, benchmark.");
  }

  const isSingleMode = Boolean(options.readout);
  const isCompareMode = Boolean(options.before || options.after);

  if (isSingleMode === isCompareMode) {
    failUsage("Use either --readout <file> or --before <file> --after <file>.");
  }

  if (isSingleMode) {
    if (options.before || options.after) {
      failUsage("--readout cannot be combined with --before/--after.");
    }
    if (!singleModeFailOns.has(options.failOn)) {
      failUsage("Single-readout mode only supports --fail-on none|over|not-within.");
    }
    return { ...options, mode: "single" };
  }

  if (!options.before || !options.after) {
    failUsage("Comparison mode requires both --before <file> and --after <file>.");
  }
  if (!compareModeFailOns.has(options.failOn)) {
    failUsage("Comparison mode only supports --fail-on none|regressed|not-improved.");
  }

  return { ...options, mode: "compare" };
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function summarizeValidationIssues(issues) {
  if (issues.length <= 4) {
    return issues.join("; ");
  }
  return `${issues.slice(0, 4).join("; ")}; +${issues.length - 4} more`;
}

function validateEditorPerfReadout(payload, label) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    failUsage(`${label} must be a JSON object matching serialized EditorPerfReadout data.`);
  }

  const issues = [];
  const record = /** @type {Record<string, unknown>} */ (payload);

  if (!allowedInteractionPhases.has(record.interactionPhase)) {
    issues.push('interactionPhase must be one of: idle, dragging, zooming, settling');
  }

  for (const key of nullableNumberFields) {
    const value = record[key];
    if (!(value === null || isFiniteNumber(value))) {
      issues.push(`${key} must be a finite number or null`);
    }
  }

  for (const key of numberFields) {
    const value = record[key];
    if (!isFiniteNumber(value)) {
      issues.push(`${key} must be a finite number`);
    }
  }

  if (issues.length > 0) {
    failUsage(
      `${label} is not valid serialized EditorPerfReadout JSON: ${summarizeValidationIssues(issues)}. ` +
        "Do not pass benchmarks/run-poc.mjs output.",
    );
  }

  return record;
}

async function readJsonFile(filePath, label) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  let source;
  try {
    source = await fs.readFile(absolutePath, "utf8");
  } catch (error) {
    failUsage(`Unable to read ${label} file: ${absolutePath} (${error instanceof Error ? error.message : String(error)}).`);
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    failUsage(`Unable to parse ${label} JSON at ${absolutePath} (${error instanceof Error ? error.message : String(error)}).`);
  }
}

function buildSingleResult(preset, evidence) {
  return {
    mode: "single",
    preset,
    decision: {
      kind: "gate",
      label: evidence.status,
      reason: evidence.reason,
      detail: evidence.detail,
    },
    evidence,
  };
}

function buildCompareResult(preset, evidence) {
  return {
    mode: "compare",
    preset,
    decision: {
      kind: "comparison",
      label: evidence.verdict,
      reason: evidence.reason,
      detail: evidence.detail,
    },
    evidence,
  };
}

function shouldFailSingle(failOn, evidence) {
  if (failOn === "over") {
    return evidence.status === "over";
  }
  if (failOn === "not-within") {
    return evidence.status !== "within";
  }
  return false;
}

function shouldFailCompare(failOn, evidence) {
  if (failOn === "regressed") {
    return evidence.verdict === "regressed";
  }
  if (failOn === "not-improved") {
    return evidence.verdict !== "improved";
  }
  return false;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseline = editorPerfBaselines[options.preset];

  if (options.mode === "single") {
    const payload = await readJsonFile(options.readout, "readout");
    const readout = validateEditorPerfReadout(payload, "readout payload");
    const evidence = evaluatePerfBaselineGate(readout, baseline);
    const result = buildSingleResult(options.preset, evidence);
    console.log(JSON.stringify(result));
    if (shouldFailSingle(options.failOn, evidence)) {
      process.exit(thresholdExitCode);
    }
    return;
  }

  const beforePayload = await readJsonFile(options.before, "before");
  const afterPayload = await readJsonFile(options.after, "after");
  const before = validateEditorPerfReadout(beforePayload, "before payload");
  const after = validateEditorPerfReadout(afterPayload, "after payload");
  const evidence = comparePerfBaselineReadoutEvidence(before, after, baseline);
  const result = buildCompareResult(options.preset, evidence);
  console.log(JSON.stringify(result));
  if (shouldFailCompare(options.failOn, evidence)) {
    process.exit(thresholdExitCode);
  }
}

await main();
