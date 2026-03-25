import test from "node:test";
import assert from "node:assert/strict";

import {
  editorPerfBaselines,
  evaluatePerfBaseline,
  formatPerfBaselineTarget,
  type EditorPerfReadout,
} from "./perf-baseline.js";

function createReadout(overrides: Partial<EditorPerfReadout> = {}): EditorPerfReadout {
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
    ...overrides,
  };
}

test("formatPerfBaselineTarget prints stable baseline labels", () => {
  const target = formatPerfBaselineTarget(editorPerfBaselines.benchmark);

  assert.match(target, /F≥18/);
  assert.match(target, /A≥6/);
  assert.match(target, /S≥2/);
  assert.match(target, /W≥6/);
  assert.match(target, /R≤12ms/);
  assert.match(target, /B≤35%/);
});

test("evaluatePerfBaseline returns warming when recent evidence is still insufficient", () => {
  const evaluation = evaluatePerfBaseline(
    createReadout({
      frameSampleCount: 40,
      interactionFrameSampleCount: 12,
      interactionBurstCount: 3,
      recentInteractionSampleCount: 4,
    }),
    editorPerfBaselines.benchmark,
  );

  assert.deepEqual(evaluation, {
    status: "warming",
    detail: "F 40/18 · A 12/6 · S 3/2 · W 4/6",
  });
});

test("evaluatePerfBaseline prioritizes recent-window failures before aggregate failures", () => {
  const evaluation = evaluatePerfBaseline(
    createReadout({
      avgRenderMs: 18,
      recentAvgRenderMs: 13,
      recentAvgViewportMs: 9,
      recentBudgetMissRate: 0.5,
    }),
    editorPerfBaselines.benchmark,
  );

  assert.deepEqual(evaluation, {
    status: "over",
    detail: "Recent R 13.0/12ms",
  });
});

test("evaluatePerfBaseline uses stable recent metric ordering before later recent failures", () => {
  const evaluation = evaluatePerfBaseline(
    createReadout({
      recentAvgViewportMs: 7,
      recentAvgInputLatencyMs: 90,
      recentPeakInputLatencyMs: 140,
    }),
    editorPerfBaselines.benchmark,
  );

  assert.deepEqual(evaluation, {
    status: "over",
    detail: "Recent V 7.0/5ms",
  });
});

test("evaluatePerfBaseline uses aggregate metric order when recent metrics are within target", () => {
  const evaluation = evaluatePerfBaseline(
    createReadout({
      avgInputLatencyMs: 80,
      peakInputLatencyMs: 170,
      interactionBudgetMissCount: 8,
      recentAvgInputLatencyMs: 40,
      recentPeakInputLatencyMs: 90,
      recentBudgetMissRate: 0.2,
    }),
    editorPerfBaselines.benchmark,
  );

  assert.deepEqual(evaluation, {
    status: "over",
    detail: "I 80.0/65ms",
  });
});

test("evaluatePerfBaseline returns within when aggregate and recent metrics satisfy thresholds", () => {
  const evaluation = evaluatePerfBaseline(createReadout(), editorPerfBaselines.benchmark);

  assert.deepEqual(evaluation, {
    status: "within",
    detail: "F 32 · A 12 · S 3 · W 6 · B 12%",
  });
});
