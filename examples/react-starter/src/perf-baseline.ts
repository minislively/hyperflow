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

export type PerfBaselineMetricKey = PerfMetricSpec["key"];
export type PerfBaselineMetricUnit = PerfMetricSpec["unit"];
export type PerfBaselineMetricScope = "recent" | "aggregate";
export type PerfBaselineGateReason =
  | "insufficient-evidence"
  | "recent-window-failure"
  | "aggregate-failure"
  | "within-threshold";

export type PerfBaselineMetricEvidence = PerfMetricSpec & {
  scope: PerfBaselineMetricScope;
};

export type PerfBaselineGateEvidence = {
  status: PerfBaselineStatus;
  reason: PerfBaselineGateReason;
  detail: string;
  blockingMetric: PerfBaselineMetricEvidence | null;
  totalFrames: number;
  activeFrames: number;
  interactionBursts: number;
  recentSamples: number;
  recentMetrics: PerfBaselineMetricEvidence[];
  aggregateMetrics: PerfBaselineMetricEvidence[];
};

export type PerfBaselineComparisonVerdict = "improved" | "unchanged" | "regressed";
export type PerfBaselineComparisonReason =
  | "status-transition"
  | "input-latency-delta"
  | "budget-miss-delta"
  | "within-tolerance";

export type PerfBaselineComparison = {
  verdict: PerfBaselineComparisonVerdict;
  detail: string;
};

export type PerfBaselineComparisonMetricEvidence = {
  key: Extract<PerfBaselineMetricKey, "I" | "B">;
  unit: PerfBaselineMetricUnit;
  before: number;
  after: number;
  delta: number;
};

export type PerfBaselineComparisonEvidence = {
  verdict: PerfBaselineComparisonVerdict;
  reason: PerfBaselineComparisonReason;
  detail: string;
  beforeStatus: PerfBaselineStatus;
  afterStatus: PerfBaselineStatus;
  beforeGateReason: PerfBaselineGateReason;
  afterGateReason: PerfBaselineGateReason;
  dominantMetric: PerfBaselineComparisonMetricEvidence | null;
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

function cloneMetricSpec(spec: PerfMetricSpec): PerfMetricSpec {
  return {
    key: spec.key,
    actual: spec.actual,
    limit: spec.limit,
    unit: spec.unit,
  };
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

export function evaluatePerfBaselineGate(
  readout: EditorPerfReadout,
  baseline: PerfBaseline,
): PerfBaselineGateEvidence {
  const totalFrames = Math.max(readout.frameSampleCount, 0);
  const activeFrames = Math.max(readout.interactionFrameSampleCount, 0);
  const interactionBursts = Math.max(readout.interactionBurstCount, 0);
  const recentSamples = Math.max(readout.recentInteractionSampleCount, 0);
  const recentMetrics = buildMetricSpecs(readout, baseline, recentMetricAccessors).map((spec) => ({
    ...cloneMetricSpec(spec),
    scope: "recent" as const,
  }));
  const aggregateMetrics = buildMetricSpecs(readout, baseline, aggregateMetricAccessors).map((spec) => ({
    ...cloneMetricSpec(spec),
    scope: "aggregate" as const,
  }));

  if (
    totalFrames < baseline.minSamples ||
    activeFrames < baseline.minInteractionSamples ||
    interactionBursts < baseline.minInteractionBursts ||
    recentSamples < baseline.recentInteractionWindow
  ) {
    return {
      status: "warming",
      reason: "insufficient-evidence",
      detail: `F ${totalFrames}/${baseline.minSamples} · A ${activeFrames}/${baseline.minInteractionSamples} · S ${interactionBursts}/${baseline.minInteractionBursts} · W ${recentSamples}/${baseline.recentInteractionWindow}`,
      blockingMetric: null,
      totalFrames,
      activeFrames,
      interactionBursts,
      recentSamples,
      recentMetrics,
      aggregateMetrics,
    };
  }

  const recentFailure = recentMetrics.find((spec) => spec.actual > spec.limit) ?? null;
  if (recentFailure) {
    return {
      status: "over",
      reason: "recent-window-failure",
      detail: `Recent ${recentFailure.key} ${formatMetricValue(recentFailure)}`,
      blockingMetric: recentFailure,
      totalFrames,
      activeFrames,
      interactionBursts,
      recentSamples,
      recentMetrics,
      aggregateMetrics,
    };
  }

  const aggregateFailure = aggregateMetrics.find((spec) => spec.actual > spec.limit) ?? null;
  if (aggregateFailure) {
    return {
      status: "over",
      reason: "aggregate-failure",
      detail: `${aggregateFailure.key} ${formatMetricValue(aggregateFailure)}`,
      blockingMetric: aggregateFailure,
      totalFrames,
      activeFrames,
      interactionBursts,
      recentSamples,
      recentMetrics,
      aggregateMetrics,
    };
  }

  const recentBudgetMissRate = readout.recentBudgetMissRate ?? 0;
  const avgInputLatencyMs = readout.avgInputLatencyMs ?? 0;
  return {
    status: "within",
    reason: "within-threshold",
    detail: `F ${totalFrames} · A ${activeFrames} · S ${interactionBursts} · W ${recentSamples} · I ${avgInputLatencyMs.toFixed(1)}/${baseline.maxAvgInputLatencyMs.toFixed(0)}ms · B ${Math.round(recentBudgetMissRate * 100)}/${Math.round(baseline.maxBudgetMissRate * 100)}%`,
    blockingMetric: null,
    totalFrames,
    activeFrames,
    interactionBursts,
    recentSamples,
    recentMetrics,
    aggregateMetrics,
  };
}

export function evaluatePerfBaseline(
  readout: EditorPerfReadout,
  baseline: PerfBaseline,
): PerfBaselineEvaluation {
  const { status, detail } = evaluatePerfBaselineGate(readout, baseline);
  return { status, detail };
}

export function comparePerfBaselineReadoutEvidence(
  before: EditorPerfReadout,
  after: EditorPerfReadout,
  baseline: PerfBaseline,
): PerfBaselineComparisonEvidence {
  const beforeGate = evaluatePerfBaselineGate(before, baseline);
  const afterGate = evaluatePerfBaselineGate(after, baseline);
  const beforeSeverity = getBaselineStatusSeverity(beforeGate.status);
  const afterSeverity = getBaselineStatusSeverity(afterGate.status);

  if (afterSeverity !== beforeSeverity) {
    return {
      verdict: afterSeverity < beforeSeverity ? "improved" : "regressed",
      reason: "status-transition",
      detail: `${beforeGate.status} → ${afterGate.status}`,
      beforeStatus: beforeGate.status,
      afterStatus: afterGate.status,
      beforeGateReason: beforeGate.reason,
      afterGateReason: afterGate.reason,
      dominantMetric: null,
    };
  }

  const beforeInput = before.avgInputLatencyMs;
  const afterInput = after.avgInputLatencyMs;
  if (beforeInput !== null && afterInput !== null) {
    const inputDelta = Number((afterInput - beforeInput).toFixed(1));
    if (Math.abs(inputDelta) > perfComparisonTolerances.inputLatencyMs) {
      return {
        verdict: inputDelta < 0 ? "improved" : "regressed",
        reason: "input-latency-delta",
        detail: `I ${beforeInput.toFixed(1)}→${afterInput.toFixed(1)}ms`,
        beforeStatus: beforeGate.status,
        afterStatus: afterGate.status,
        beforeGateReason: beforeGate.reason,
        afterGateReason: afterGate.reason,
        dominantMetric: {
          key: "I",
          unit: "ms",
          before: beforeInput,
          after: afterInput,
          delta: inputDelta,
        },
      };
    }
  }

  const beforeBudgetMissRate = getInteractionBudgetMissRate(before);
  const afterBudgetMissRate = getInteractionBudgetMissRate(after);
  const budgetDelta = Number((afterBudgetMissRate - beforeBudgetMissRate).toFixed(2));
  if (Math.abs(budgetDelta) > perfComparisonTolerances.budgetMissRate) {
    return {
      verdict: budgetDelta < 0 ? "improved" : "regressed",
      reason: "budget-miss-delta",
      detail: `B ${formatBudgetMissRate(beforeBudgetMissRate)}→${formatBudgetMissRate(afterBudgetMissRate)}`,
      beforeStatus: beforeGate.status,
      afterStatus: afterGate.status,
      beforeGateReason: beforeGate.reason,
      afterGateReason: afterGate.reason,
      dominantMetric: {
        key: "B",
        unit: "%",
        before: beforeBudgetMissRate,
        after: afterBudgetMissRate,
        delta: budgetDelta,
      },
    };
  }

  return {
    verdict: "unchanged",
    reason: "within-tolerance",
    detail: `${beforeGate.status} stable · I ${beforeInput === null ? "--" : `${beforeInput.toFixed(1)}ms`} · B ${formatBudgetMissRate(beforeBudgetMissRate)}`,
    beforeStatus: beforeGate.status,
    afterStatus: afterGate.status,
    beforeGateReason: beforeGate.reason,
    afterGateReason: afterGate.reason,
    dominantMetric: null,
  };
}

export function comparePerfBaselineReadouts(
  before: EditorPerfReadout,
  after: EditorPerfReadout,
  baseline: PerfBaseline,
): PerfBaselineComparison {
  const { verdict, detail } = comparePerfBaselineReadoutEvidence(before, after, baseline);
  return { verdict, detail };
}
