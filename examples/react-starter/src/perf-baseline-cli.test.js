// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const cliPath = path.join(repoRoot, "tooling/evaluate-perf-baseline.mjs");
function createReadout(overrides = {}) {
    return {
        fps: 60,
        renderMs: 4,
        viewportMs: 1,
        inputLatencyMs: 16,
        interactionPhase: "idle",
        frameSampleCount: 32,
        fixtureSize: 84,
        visibleCount: 84,
        avgRenderMs: 6,
        avgViewportMs: 2,
        avgInputLatencyMs: 28,
        peakInputLatencyMs: 72,
        budgetMissCount: 0,
        interactionFrameSampleCount: 12,
        interactionBudgetMissCount: 1,
        interactionBurstCount: 3,
        recentInteractionSampleCount: 6,
        recentAvgRenderMs: 7,
        recentAvgViewportMs: 2,
        recentAvgInputLatencyMs: 30,
        recentPeakInputLatencyMs: 80,
        recentBudgetMissRate: 0.12,
        ...overrides
    };
}
function withTempDir(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hyperflow-perf-cli-"));
    try {
        fn(dir);
    } finally{
        fs.rmSync(dir, {
            recursive: true,
            force: true
        });
    }
}
function writeJson(dir, name, value) {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, JSON.stringify(value), "utf8");
    return filePath;
}
function runCli(args) {
    return spawnSync(process.execPath, [
        cliPath,
        ...args
    ], {
        cwd: repoRoot,
        encoding: "utf8"
    });
}
test("CLI single-readout mode returns structured gate evidence", ()=>{
    withTempDir((dir)=>{
        const readoutPath = writeJson(dir, "readout.json", createReadout());
        const result = runCli([
            "--preset",
            "benchmark",
            "--readout",
            readoutPath
        ]);
        assert.equal(result.status, 0);
        assert.equal(result.stderr, "");
        const payload = JSON.parse(result.stdout);
        assert.deepEqual(payload, {
            mode: "single",
            preset: "benchmark",
            decision: {
                kind: "gate",
                label: "within",
                reason: "within-threshold",
                detail: "F 32 · A 12 · S 3 · W 6 · I 28.0/65ms · B 12/35%"
            },
            evidence: payload.evidence
        });
        assert.equal(payload.evidence.status, "within");
        assert.equal(payload.evidence.reason, "within-threshold");
    });
});
test("CLI before/after mode returns structured comparison evidence", ()=>{
    withTempDir((dir)=>{
        const beforePath = writeJson(dir, "before.json", createReadout());
        const afterPath = writeJson(dir, "after.json", createReadout({
            recentAvgRenderMs: 16,
            recentAvgViewportMs: 9,
            recentBudgetMissRate: 0.5
        }));
        const result = runCli([
            "--preset",
            "benchmark",
            "--before",
            beforePath,
            "--after",
            afterPath
        ]);
        assert.equal(result.status, 0);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.mode, "compare");
        assert.equal(payload.preset, "benchmark");
        assert.deepEqual(payload.decision, {
            kind: "comparison",
            label: "regressed",
            reason: "status-transition",
            detail: "within → over"
        });
        assert.equal(payload.evidence.afterStatus, "over");
        assert.equal(payload.evidence.afterGateReason, "recent-window-failure");
    });
});
test("CLI rejects run-poc style payloads as invalid EditorPerfReadout input", ()=>{
    withTempDir((dir)=>{
        const readoutPath = writeJson(dir, "readout.json", {
            fixtureSize: 84,
            visibleCount: 84,
            viewportSamples: 24,
            viewportUpdateMs: 1.1,
            bridgeReadbackMs: 2.2,
            renderMs: 3.3,
            drawCalls: 50
        });
        const result = runCli([
            "--preset",
            "benchmark",
            "--readout",
            readoutPath
        ]);
        assert.equal(result.status, 64);
        assert.match(result.stderr, /not valid serialized EditorPerfReadout JSON/);
        assert.match(result.stderr, /Do not pass benchmarks\/run-poc\.mjs output/);
    });
});
test("CLI fail-on over exits with code 2 for single-readout failures", ()=>{
    withTempDir((dir)=>{
        const readoutPath = writeJson(dir, "readout.json", createReadout({
            recentAvgRenderMs: 13,
            recentAvgViewportMs: 9,
            recentBudgetMissRate: 0.5
        }));
        const result = runCli([
            "--preset",
            "benchmark",
            "--readout",
            readoutPath,
            "--fail-on",
            "over"
        ]);
        assert.equal(result.status, 2);
        const payload = JSON.parse(result.stdout);
        assert.equal(payload.decision.label, "over");
        assert.equal(payload.decision.reason, "recent-window-failure");
    });
});
test("CLI rejects invalid fail-on combinations for comparison mode", ()=>{
    withTempDir((dir)=>{
        const beforePath = writeJson(dir, "before.json", createReadout());
        const afterPath = writeJson(dir, "after.json", createReadout());
        const result = runCli([
            "--preset",
            "benchmark",
            "--before",
            beforePath,
            "--after",
            afterPath,
            "--fail-on",
            "over"
        ]);
        assert.equal(result.status, 64);
        assert.match(result.stderr, /Comparison mode only supports --fail-on none\|regressed\|not-improved/);
    });
});
