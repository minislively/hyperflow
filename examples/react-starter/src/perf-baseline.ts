export type EditorInteractionPhase = "idle" | "dragging" | "zooming" | "settling";

export type EditorPerfReadout = {
  fps: number | null;
  renderMs: number | null;
  viewportMs: number | null;
  inputLatencyMs: number | null;
  interactionPhase: EditorInteractionPhase;
  frameSampleCount: number;
  fixtureSize: number;
  visibleCount: number;
  avgRenderMs: number | null;
  avgViewportMs: number | null;
  avgInputLatencyMs: number | null;
  peakInputLatencyMs: number | null;
  budgetMissCount: number;
  interactionFrameSampleCount: number;
  interactionBudgetMissCount: number;
  interactionBurstCount: number;
  recentInteractionSampleCount: number;
  recentAvgRenderMs: number | null;
  recentAvgViewportMs: number | null;
  recentAvgInputLatencyMs: number | null;
  recentPeakInputLatencyMs: number | null;
  recentBudgetMissRate: number | null;
};

export type PerfBaselinePreset = "starter" | "benchmark";
export type PerfBaselineStatus = "warming" | "within" | "over";

export type PerfBaseline = {
  minSamples: number;
  minInteractionSamples: number;
  minInteractionBursts: number;
  recentInteractionWindow: number;
  maxAvgRenderMs: number;
  maxAvgViewportMs: number;
  maxAvgInputLatencyMs: number;
  maxPeakInputLatencyMs: number;
  maxBudgetMissRate: number;
};

export type PerfBaselineEvaluation = {
  status: PerfBaselineStatus;
  detail: string;
};

export type PerfBaselineComparisonVerdict = "improved" | "unchanged" | "regressed";

export type PerfBaselineComparison = {
  verdict: PerfBaselineComparisonVerdict;
  detail: string;
};

type PerfMetricSpec = {
  key: "R" | "V" | "I" | "P" | "B";
  actual: number;
  limit: number;
  unit: "ms" | "%";
};

type PerfMetricAccessor = {
  key: PerfMetricSpec["key"];
  read: (readout: EditorPerfReadout) => number | null;
  limit: (baseline: PerfBaseline) => number;
  unit: PerfMetricSpec["unit"];
};

const perfComparisonTolerances = {
  inputLatencyMs: 0.5,
  budgetMissRate: 0.02,
} as const;

export const editorPerfBaselines: Record<PerfBaselinePreset, PerfBaseline> = {
  starter: {
    minSamples: 10,
    minInteractionSamples: 4,
    minInteractionBursts: 1,
    recentInteractionWindow: 4,
    maxAvgRenderMs: 8,
    maxAvgViewportMs: 3,
    maxAvgInputLatencyMs: 45,
    maxPeakInputLatencyMs: 90,
    maxBudgetMissRate: 0.2,
  },
  benchmark: {
    minSamples: 18,
    minInteractionSamples: 6,
    minInteractionBursts: 2,
    recentInteractionWindow: 6,
    maxAvgRenderMs: 12,
    maxAvgViewportMs: 5,
    maxAvgInputLatencyMs: 65,
    maxPeakInputLatencyMs: 130,
    maxBudgetMissRate: 0.35,
  },
};

export const maxPerfRecentInteractionWindow = Math.max(
  ...Object.values(editorPerfBaselines).map((baseline) => baseline.recentInteractionWindow),
);

function formatMetricValue(spec: PerfMetricSpec) {
  return spec.unit === "ms"
    ? `${spec.actual.toFixed(1)}/${spec.limit.toFixed(0)}ms`
    : `${Math.round(spec.actual * 100)}/${Math.round(spec.limit * 100)}%`;
}

function findFirstFailure(specs: readonly PerfMetricSpec[], prefix = "") {
  const failingSpec = specs.find((spec) => spec.actual > spec.limit);
  return failingSpec ? `${prefix}${failingSpec.key} ${formatMetricValue(failingSpec)}` : null;
}

function buildMetricSpecs(
  readout: EditorPerfReadout,
  baseline: PerfBaseline,
  accessors: readonly PerfMetricAccessor[],
) {
  return accessors.map((accessor) => ({
    key: accessor.key,
    actual: accessor.read(readout) ?? Number.POSITIVE_INFINITY,
    limit: accessor.limit(baseline),
    unit: accessor.unit,
  }));
}

function getInteractionBudgetMissRate(readout: EditorPerfReadout) {
  const activeFrames = Math.max(readout.interactionFrameSampleCount, 0);
  return activeFrames === 0 ? 0 : Number((readout.interactionBudgetMissCount / activeFrames).toFixed(2));
}

function formatBudgetMissRate(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function getBaselineStatusSeverity(status: PerfBaselineStatus) {
  switch (status) {
    case "within":
      return 0;
    case "warming":
      return 1;
    case "over":
      return 2;
  }
}

const aggregateMetricAccessors: readonly PerfMetricAccessor[] = [
  { key: "R", read: (readout) => readout.avgRenderMs, limit: (baseline) => baseline.maxAvgRenderMs, unit: "ms" },
  {
    key: "V",
    read: (readout) => readout.avgViewportMs,
    limit: (baseline) => baseline.maxAvgViewportMs,
    unit: "ms",
  },
  {
    key: "I",
    read: (readout) => readout.avgInputLatencyMs,
    limit: (baseline) => baseline.maxAvgInputLatencyMs,
    unit: "ms",
  },
  {
    key: "P",
    read: (readout) => readout.peakInputLatencyMs,
    limit: (baseline) => baseline.maxPeakInputLatencyMs,
    unit: "ms",
  },
  {
    key: "B",
    read: (readout) => getInteractionBudgetMissRate(readout),
    limit: (baseline) => baseline.maxBudgetMissRate,
    unit: "%",
  },
];

const recentMetricAccessors: readonly PerfMetricAccessor[] = [
  {
    key: "R",
    read: (readout) => readout.recentAvgRenderMs,
    limit: (baseline) => baseline.maxAvgRenderMs,
    unit: "ms",
  },
  {
    key: "V",
    read: (readout) => readout.recentAvgViewportMs,
    limit: (baseline) => baseline.maxAvgViewportMs,
    unit: "ms",
  },
  {
    key: "I",
    read: (readout) => readout.recentAvgInputLatencyMs,
    limit: (baseline) => baseline.maxAvgInputLatencyMs,
    unit: "ms",
  },
  {
    key: "P",
    read: (readout) => readout.recentPeakInputLatencyMs,
    limit: (baseline) => baseline.maxPeakInputLatencyMs,
    unit: "ms",
  },
  {
    key: "B",
    read: (readout) => readout.recentBudgetMissRate,
    limit: (baseline) => baseline.maxBudgetMissRate,
    unit: "%",
  },
];

export function formatPerfBaselineTarget(baseline: PerfBaseline) {
  return `F≥${baseline.minSamples} · A≥${baseline.minInteractionSamples} · S≥${baseline.minInteractionBursts} · W≥${baseline.recentInteractionWindow} · R≤${baseline.maxAvgRenderMs.toFixed(0)}ms · V≤${baseline.maxAvgViewportMs.toFixed(0)}ms · I≤${baseline.maxAvgInputLatencyMs.toFixed(0)}ms · P≤${baseline.maxPeakInputLatencyMs.toFixed(0)}ms · B≤${Math.round(baseline.maxBudgetMissRate * 100)}%`;
}

export function evaluatePerfBaseline(
  readout: EditorPerfReadout,
  baseline: PerfBaseline,
): PerfBaselineEvaluation {
  const totalFrames = Math.max(readout.frameSampleCount, 0);
  const activeFrames = Math.max(readout.interactionFrameSampleCount, 0);
  const interactionBursts = Math.max(readout.interactionBurstCount, 0);
  const recentSamples = Math.max(readout.recentInteractionSampleCount, 0);

  if (
    totalFrames < baseline.minSamples ||
    activeFrames < baseline.minInteractionSamples ||
    interactionBursts < baseline.minInteractionBursts ||
    recentSamples < baseline.recentInteractionWindow
  ) {
    return {
      status: "warming",
      detail: `F ${totalFrames}/${baseline.minSamples} · A ${activeFrames}/${baseline.minInteractionSamples} · S ${interactionBursts}/${baseline.minInteractionBursts} · W ${recentSamples}/${baseline.recentInteractionWindow}`,
    };
  }

  const recentFailure = findFirstFailure(buildMetricSpecs(readout, baseline, recentMetricAccessors), "Recent ");
  if (recentFailure) {
    return {
      status: "over",
      detail: recentFailure,
    };
  }

  const aggregateFailure = findFirstFailure(buildMetricSpecs(readout, baseline, aggregateMetricAccessors));
  if (aggregateFailure) {
    return {
      status: "over",
      detail: aggregateFailure,
    };
  }

  const recentBudgetMissRate = readout.recentBudgetMissRate ?? 0;
  const avgInputLatencyMs = readout.avgInputLatencyMs ?? 0;
  return {
    status: "within",
    detail: `F ${totalFrames} · A ${activeFrames} · S ${interactionBursts} · W ${recentSamples} · I ${avgInputLatencyMs.toFixed(1)}/${baseline.maxAvgInputLatencyMs.toFixed(0)}ms · B ${Math.round(recentBudgetMissRate * 100)}/${Math.round(baseline.maxBudgetMissRate * 100)}%`,
  };
}

export function comparePerfBaselineReadouts(
  before: EditorPerfReadout,
  after: EditorPerfReadout,
  baseline: PerfBaseline,
): PerfBaselineComparison {
  const beforeEvaluation = evaluatePerfBaseline(before, baseline);
  const afterEvaluation = evaluatePerfBaseline(after, baseline);
  const beforeSeverity = getBaselineStatusSeverity(beforeEvaluation.status);
  const afterSeverity = getBaselineStatusSeverity(afterEvaluation.status);

  if (afterSeverity !== beforeSeverity) {
    return {
      verdict: afterSeverity < beforeSeverity ? "improved" : "regressed",
      detail: `${beforeEvaluation.status} → ${afterEvaluation.status}`,
    };
  }

  const beforeInput = before.avgInputLatencyMs;
  const afterInput = after.avgInputLatencyMs;
  if (beforeInput !== null && afterInput !== null) {
    const inputDelta = Number((afterInput - beforeInput).toFixed(1));
    if (Math.abs(inputDelta) > perfComparisonTolerances.inputLatencyMs) {
      return {
        verdict: inputDelta < 0 ? "improved" : "regressed",
        detail: `I ${beforeInput.toFixed(1)}→${afterInput.toFixed(1)}ms`,
      };
    }
  }

  const beforeBudgetMissRate = getInteractionBudgetMissRate(before);
  const afterBudgetMissRate = getInteractionBudgetMissRate(after);
  const budgetDelta = Number((afterBudgetMissRate - beforeBudgetMissRate).toFixed(2));
  if (Math.abs(budgetDelta) > perfComparisonTolerances.budgetMissRate) {
    return {
      verdict: budgetDelta < 0 ? "improved" : "regressed",
      detail: `B ${formatBudgetMissRate(beforeBudgetMissRate)}→${formatBudgetMissRate(afterBudgetMissRate)}`,
    };
  }

  return {
    verdict: "unchanged",
    detail: `${beforeEvaluation.status} stable · I ${beforeInput === null ? "--" : `${beforeInput.toFixed(1)}ms`} · B ${formatBudgetMissRate(beforeBudgetMissRate)}`,
  };
}
