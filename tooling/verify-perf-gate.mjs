import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "tooling/evaluate-perf-baseline.mjs");
const fixturesDir = path.join(repoRoot, "benchmarks/perf-baseline-fixtures");

function fixturePath(name) {
  return path.join(fixturesDir, name);
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = result.stdout.trim();
  const payload = stdout.length > 0 ? JSON.parse(stdout) : null;
  return {
    status: result.status ?? 1,
    stderr: result.stderr,
    payload,
  };
}

const scenarios = [
  {
    name: "benchmark-within",
    expectedExit: 0,
    args: ["--preset", "benchmark", "--readout", fixturePath("benchmark-within.json"), "--fail-on", "not-within"],
    assertPayload(payload) {
      assert.equal(payload.mode, "single");
      assert.equal(payload.preset, "benchmark");
      assert.equal(payload.decision.kind, "gate");
      assert.equal(payload.decision.label, "within");
      assert.equal(payload.decision.reason, "within-threshold");
      assert.equal(payload.evidence.status, "within");
      assert.equal(payload.evidence.reason, "within-threshold");
    },
  },
  {
    name: "benchmark-over",
    expectedExit: 2,
    args: ["--preset", "benchmark", "--readout", fixturePath("benchmark-over.json"), "--fail-on", "over"],
    assertPayload(payload) {
      assert.equal(payload.mode, "single");
      assert.equal(payload.decision.kind, "gate");
      assert.equal(payload.decision.label, "over");
      assert.equal(payload.decision.reason, "recent-window-failure");
      assert.equal(payload.evidence.status, "over");
      assert.equal(payload.evidence.reason, "recent-window-failure");
      assert.equal(payload.evidence.blockingMetric?.scope, "recent");
    },
  },
  {
    name: "benchmark-regressed-compare",
    expectedExit: 0,
    args: [
      "--preset",
      "benchmark",
      "--before",
      fixturePath("benchmark-regressed-before.json"),
      "--after",
      fixturePath("benchmark-regressed-after.json"),
      "--fail-on",
      "none",
    ],
    assertPayload(payload) {
      assert.equal(payload.mode, "compare");
      assert.equal(payload.preset, "benchmark");
      assert.equal(payload.decision.kind, "comparison");
      assert.equal(payload.decision.label, "regressed");
      assert.equal(payload.decision.reason, "status-transition");
      assert.equal(payload.evidence.verdict, "regressed");
      assert.equal(payload.evidence.reason, "status-transition");
      assert.equal(payload.evidence.beforeStatus, "within");
      assert.equal(payload.evidence.afterStatus, "over");
    },
  },
  {
    name: "benchmark-regressed-fail-on",
    expectedExit: 2,
    args: [
      "--preset",
      "benchmark",
      "--before",
      fixturePath("benchmark-regressed-before.json"),
      "--after",
      fixturePath("benchmark-regressed-after.json"),
      "--fail-on",
      "regressed",
    ],
    assertPayload(payload) {
      assert.equal(payload.mode, "compare");
      assert.equal(payload.decision.kind, "comparison");
      assert.equal(payload.decision.label, "regressed");
      assert.equal(payload.decision.reason, "status-transition");
      assert.equal(payload.evidence.afterGateReason, "recent-window-failure");
    },
  },
];

const results = [];
for (const scenario of scenarios) {
  const result = runCli(scenario.args);
  assert.equal(
    result.status,
    scenario.expectedExit,
    `${scenario.name} exit mismatch. stderr: ${result.stderr || "<empty>"}`,
  );
  assert.equal(result.stderr, "", `${scenario.name} emitted unexpected stderr.`);
  assert.ok(result.payload, `${scenario.name} did not produce JSON output.`);
  scenario.assertPayload(result.payload);
  results.push({
    name: scenario.name,
    exitCode: result.status,
    decision: result.payload.decision,
  });
}

console.log(
  JSON.stringify({
    ok: true,
    mode: "fixture-perf-gate",
    scenarios: results,
  }),
);
