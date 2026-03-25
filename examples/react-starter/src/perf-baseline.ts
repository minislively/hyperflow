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
    read: (readout) => {
      const activeFrames = Math.max(readout.interactionFrameSampleCount, 0);
      return activeFrames === 0 ? 0 : readout.interactionBudgetMissCount / Math.max(activeFrames, 1);
    },
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
  return {
    status: "within",
    detail: `F ${totalFrames} · A ${activeFrames} · S ${interactionBursts} · W ${recentSamples} · B ${Math.round(recentBudgetMissRate * 100)}%`,
  };
}
