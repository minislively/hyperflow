// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.

import test from "node:test";
import assert from "node:assert/strict";
import { comparePerfBaselineReadouts, editorPerfBaselines, evaluatePerfBaseline, evaluatePerfBaselineGate, formatPerfBaselineTarget } from "./perf-baseline.js";
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
test("formatPerfBaselineTarget prints stable baseline labels", ()=>{
    const target = formatPerfBaselineTarget(editorPerfBaselines.benchmark);
    assert.match(target, /F≥18/);
    assert.match(target, /A≥6/);
    assert.match(target, /S≥2/);
    assert.match(target, /W≥6/);
    assert.match(target, /R≤12ms/);
    assert.match(target, /B≤35%/);
});
test("evaluatePerfBaseline returns warming when recent evidence is still insufficient", ()=>{
    const evaluation = evaluatePerfBaseline(createReadout({
        frameSampleCount: 40,
        interactionFrameSampleCount: 12,
        interactionBurstCount: 3,
        recentInteractionSampleCount: 4
    }), editorPerfBaselines.benchmark);
    assert.deepEqual(evaluation, {
        status: "warming",
        detail: "F 40/18 · A 12/6 · S 3/2 · W 4/6"
    });
});
test("evaluatePerfBaseline prioritizes recent-window failures before aggregate failures", ()=>{
    const evaluation = evaluatePerfBaseline(createReadout({
        avgRenderMs: 18,
        recentAvgRenderMs: 13,
        recentAvgViewportMs: 9,
        recentBudgetMissRate: 0.5
    }), editorPerfBaselines.benchmark);
    assert.deepEqual(evaluation, {
        status: "over",
        detail: "Recent R 13.0/12ms"
    });
});
test("evaluatePerfBaseline uses stable recent metric ordering before later recent failures", ()=>{
    const evaluation = evaluatePerfBaseline(createReadout({
        recentAvgViewportMs: 7,
        recentAvgInputLatencyMs: 90,
        recentPeakInputLatencyMs: 140
    }), editorPerfBaselines.benchmark);
    assert.deepEqual(evaluation, {
        status: "over",
        detail: "Recent V 7.0/5ms"
    });
});
test("evaluatePerfBaseline uses aggregate metric order when recent metrics are within target", ()=>{
    const evaluation = evaluatePerfBaseline(createReadout({
        avgInputLatencyMs: 80,
        peakInputLatencyMs: 170,
        interactionBudgetMissCount: 8,
        recentAvgInputLatencyMs: 40,
        recentPeakInputLatencyMs: 90,
        recentBudgetMissRate: 0.2
    }), editorPerfBaselines.benchmark);
    assert.deepEqual(evaluation, {
        status: "over",
        detail: "I 80.0/65ms"
    });
});
test("evaluatePerfBaseline returns within when aggregate and recent metrics satisfy thresholds", ()=>{
    const evaluation = evaluatePerfBaseline(createReadout(), editorPerfBaselines.benchmark);
    assert.deepEqual(evaluation, {
        status: "within",
        detail: "F 32 · A 12 · S 3 · W 6 · I 28.0/65ms · B 12/35%"
    });
});
test("evaluatePerfBaselineGate exposes warming evidence before thresholds are met", ()=>{
    const gate = evaluatePerfBaselineGate(createReadout({
        frameSampleCount: 40,
        interactionFrameSampleCount: 12,
        interactionBurstCount: 3,
        recentInteractionSampleCount: 4
    }), editorPerfBaselines.benchmark);
    assert.equal(gate.status, "warming");
    assert.equal(gate.reason, "insufficient-evidence");
    assert.equal(gate.blockingMetric, null);
    assert.equal(gate.totalFrames, 40);
    assert.equal(gate.activeFrames, 12);
    assert.equal(gate.interactionBursts, 3);
    assert.equal(gate.recentSamples, 4);
    assert.equal(gate.recentMetrics.length, 5);
    assert.equal(gate.aggregateMetrics.length, 5);
});
test("evaluatePerfBaselineGate reports the first recent-window failure as structured evidence", ()=>{
    const gate = evaluatePerfBaselineGate(createReadout({
        avgRenderMs: 18,
        recentAvgRenderMs: 13,
        recentAvgViewportMs: 9,
        recentBudgetMissRate: 0.5
    }), editorPerfBaselines.benchmark);
    assert.equal(gate.status, "over");
    assert.equal(gate.reason, "recent-window-failure");
    assert.deepEqual(gate.blockingMetric, {
        key: "R",
        actual: 13,
        limit: 12,
        unit: "ms",
        scope: "recent"
    });
});
test("evaluatePerfBaselineGate reports the first aggregate failure when recent metrics pass", ()=>{
    const gate = evaluatePerfBaselineGate(createReadout({
        avgInputLatencyMs: 80,
        peakInputLatencyMs: 170,
        interactionBudgetMissCount: 8,
        recentAvgInputLatencyMs: 40,
        recentPeakInputLatencyMs: 90,
        recentBudgetMissRate: 0.2
    }), editorPerfBaselines.benchmark);
    assert.equal(gate.status, "over");
    assert.equal(gate.reason, "aggregate-failure");
    assert.deepEqual(gate.blockingMetric, {
        key: "I",
        actual: 80,
        limit: 65,
        unit: "ms",
        scope: "aggregate"
    });
});
test("evaluatePerfBaselineGate exposes machine-readable within-threshold evidence", ()=>{
    const gate = evaluatePerfBaselineGate(createReadout(), editorPerfBaselines.benchmark);
    assert.equal(gate.status, "within");
    assert.equal(gate.reason, "within-threshold");
    assert.equal(gate.blockingMetric, null);
    assert.equal(gate.recentMetrics[0]?.scope, "recent");
    assert.equal(gate.aggregateMetrics[0]?.scope, "aggregate");
    assert.deepEqual(gate.recentMetrics.map((metric)=>metric.key), [
        "R",
        "V",
        "I",
        "P",
        "B"
    ]);
    assert.deepEqual(gate.aggregateMetrics.map((metric)=>metric.key), [
        "R",
        "V",
        "I",
        "P",
        "B"
    ]);
});
test("comparePerfBaselineReadouts flags verdict changes before metric deltas", ()=>{
    const comparison = comparePerfBaselineReadouts(createReadout(), createReadout({
        recentAvgRenderMs: 16,
        recentAvgViewportMs: 9,
        recentBudgetMissRate: 0.5
    }), editorPerfBaselines.benchmark);
    assert.deepEqual(comparison, {
        verdict: "regressed",
        detail: "within → over"
    });
});
test("comparePerfBaselineReadouts reports input-latency improvements when status stays stable", ()=>{
    const comparison = comparePerfBaselineReadouts(createReadout({
        avgInputLatencyMs: 34,
        interactionBudgetMissCount: 2,
        interactionFrameSampleCount: 12
    }), createReadout({
        avgInputLatencyMs: 24,
        interactionBudgetMissCount: 2,
        interactionFrameSampleCount: 12
    }), editorPerfBaselines.benchmark);
    assert.deepEqual(comparison, {
        verdict: "improved",
        detail: "I 34.0→24.0ms"
    });
});
test("comparePerfBaselineReadouts reports budget-miss regressions when status stays stable", ()=>{
    const comparison = comparePerfBaselineReadouts(createReadout({
        avgInputLatencyMs: 28,
        interactionBudgetMissCount: 1,
        interactionFrameSampleCount: 12
    }), createReadout({
        avgInputLatencyMs: 28,
        interactionBudgetMissCount: 3,
        interactionFrameSampleCount: 12
    }), editorPerfBaselines.benchmark);
    assert.deepEqual(comparison, {
        verdict: "regressed",
        detail: "B 8%→25%"
    });
});
test("comparePerfBaselineReadouts returns unchanged when verdict and primary metrics stay within tolerance", ()=>{
    const comparison = comparePerfBaselineReadouts(createReadout({
        avgInputLatencyMs: 28.2,
        interactionBudgetMissCount: 2,
        interactionFrameSampleCount: 12
    }), createReadout({
        avgInputLatencyMs: 28.5,
        interactionBudgetMissCount: 2,
        interactionFrameSampleCount: 12
    }), editorPerfBaselines.benchmark);
    assert.deepEqual(comparison, {
        verdict: "unchanged",
        detail: "within stable · I 28.2ms · B 17%"
    });
});
