import {
  createHyperflowWasmBridge,
  type HyperflowAnchorResolutionRequest,
  type HyperflowEdgeAnchorResolutionRequest,
  type HyperflowEdgePathResolutionRequest,
  type HyperflowPoint,
  type HyperflowRenderedEdgeAnchorResolutionRequest,
  type HyperflowResolvedEdgeAnchor,
  type HyperflowResolvedEdgeCurve,
  type HyperflowResolvedRenderedEdgeAnchors,
  type HyperflowResolvedNodeAnchors,
  type HyperflowRuntimeNode,
  type HyperflowViewport,
  type HyperflowWasmBridge,
  type HyperflowWasmSourceOptions,
} from "../../wasm-bindings/src/index.js";
import { drawVisibleBoxes, type CanvasLikeContext, type CanvasRenderOptions } from "../../renderer-canvas/src/index.js";

export type PocNodePosition = {
  x: number;
  y: number;
};

export type PocNodeSize = {
  width: number;
  height: number;
};

export type PocNode<TData extends Record<string, unknown> = Record<string, unknown>, TType extends string = string> = {
  id: number;
  position: PocNodePosition;
  size: PocNodeSize;
  data: TData;
  type: TType;
};

export type PocEdge<TType extends string = string> = {
  id: string;
  source: number;
  target: number;
  type?: TType;
  bend?: PocNodePosition | null;
};

export type PocAnchorSide = "left" | "right" | "top" | "bottom";

const POC_ANCHOR_SIDES: PocAnchorSide[] = ["left", "right", "top", "bottom"];
const POC_DIRECTIONAL_SIDE_SECTOR = Math.PI / 3;

export type PocAnchorPoint = {
  x: number;
  y: number;
  side: PocAnchorSide;
};

export type PocResolvedNodeAnchors = {
  inputAnchor: PocAnchorPoint;
  outputAnchor: PocAnchorPoint;
};

export type PocResolvedEdgeAnchor = PocAnchorPoint & {
  slot: number;
  slotCount: number;
};

export type PocResolvedEdgeAnchors = {
  edgeId: string;
  sourceAnchor: PocResolvedEdgeAnchor;
  targetAnchor: PocResolvedEdgeAnchor;
};

export type PocResolvedRenderableEdge = {
  id: string;
  sourceAnchor: PocResolvedEdgeAnchor;
  targetAnchor: PocResolvedEdgeAnchor;
  curve: PocResolvedEdgeCurve;
  path: string;
  bendOffsetWorldX: number;
  bendOffsetWorldY: number;
  bendWorldX: number;
  bendWorldY: number;
  hasBend: boolean;
};

export type PocEdgeCurveRequestOptions = {
  sourceAnchor: PocResolvedEdgeAnchor;
  targetAnchor: PocResolvedEdgeAnchor;
  sourceX?: number;
  sourceY?: number;
  targetX?: number;
  targetY?: number;
  sourceSpread?: number;
  targetSpread?: number;
  spreadStep?: number;
  bendOffsetX?: number | null;
  bendOffsetY?: number | null;
  minimumCurveOffset?: number;
};

export type PocRenderableEdgeResolutionOptions<TData extends Record<string, unknown>, TType extends string> = {
  nodes: Array<PocNode<TData, TType>>;
  edges: PocEdge[];
  resolvedEdgeAnchorsById: Map<string, PocResolvedEdgeAnchors>;
  projectX?: (worldX: number) => number;
  projectY?: (worldY: number) => number;
  spreadStep?: number;
  minimumCurveOffset?: number;
  resolveCurves?: (requests: PocEdgePathResolutionRequest[]) => PocResolvedEdgeCurve[];
};

export type PocEdgeAnchorResolutionRequest = {
  x: number;
  y: number;
  width: number;
  height: number;
  side: PocAnchorSide;
  slot: number;
  slotCount: number;
  spreadStep?: number;
};

export type PocRenderedEdgeAnchorResolutionRequest = HyperflowRenderedEdgeAnchorResolutionRequest;
export type PocAnchorResolutionRequest = HyperflowAnchorResolutionRequest;
export type PocLowLevelEdgeAnchorResolutionRequest = HyperflowEdgeAnchorResolutionRequest;
export type PocEdgePathResolutionRequest = HyperflowEdgePathResolutionRequest;
export type PocLowLevelResolvedEdgeAnchor = HyperflowResolvedEdgeAnchor;
export type PocRenderedResolvedEdgeAnchors = HyperflowResolvedRenderedEdgeAnchors;
export type PocResolvedEdgeCurve = HyperflowResolvedEdgeCurve;

export type PocRuntimeNode = HyperflowRuntimeNode;
export type VisibleBox = HyperflowRuntimeNode;
export type PocViewport = HyperflowViewport;

export type PocMetrics = {
  fixtureSize: number;
  visibleCount: number;
  viewportUpdateMs: number;
  renderMs: number;
  zoom: number;
  x: number;
  y: number;
};

export type PocRenderOptions = CanvasRenderOptions;

export type PocRenderer = (
  context: CanvasLikeContext,
  visibleBoxes: VisibleBox[],
  viewport: PocViewport,
  options?: PocRenderOptions,
) => number | void;

export function getPocNodeCenter<TData extends Record<string, unknown>, TType extends string>(
  node: PocNode<TData, TType>,
): PocNodePosition {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

export function getPocNodeAnchorPoint<TData extends Record<string, unknown>, TType extends string>(
  node: PocNode<TData, TType>,
  toward: PocNodePosition,
): PocAnchorPoint {
  const center = getPocNodeCenter(node);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { x: node.position.x + node.size.width, y: center.y, side: "right" }
      : { x: node.position.x, y: center.y, side: "left" };
  }

  return dy >= 0
    ? { x: center.x, y: node.position.y + node.size.height, side: "bottom" }
    : { x: center.x, y: node.position.y, side: "top" };
}

function getOppositePocAnchorSide(side: PocAnchorSide): PocAnchorSide {
  switch (side) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "top":
      return "bottom";
    case "bottom":
      return "top";
  }
}

function resolvePocDirectionalAnchorSide(dx: number, dy: number): PocAnchorSide {
  const angle = Math.atan2(dy, dx);

  if (angle > -POC_DIRECTIONAL_SIDE_SECTOR && angle <= POC_DIRECTIONAL_SIDE_SECTOR) {
    return "right";
  }
  if (angle > POC_DIRECTIONAL_SIDE_SECTOR && angle <= Math.PI - POC_DIRECTIONAL_SIDE_SECTOR) {
    return "bottom";
  }
  if (angle <= -POC_DIRECTIONAL_SIDE_SECTOR && angle > -Math.PI + POC_DIRECTIONAL_SIDE_SECTOR) {
    return "top";
  }
  return "left";
}

export function resolvePocNodeRoleAnchorSide<TData extends Record<string, unknown>, TType extends string>(
  node: PocNode<TData, TType>,
  options: {
    toward: PocNodePosition;
    role: "input" | "output";
    preferredSide?: PocAnchorSide;
  },
): PocAnchorSide {
  const center = getPocNodeCenter(node);

  function scoreAnchorSide(side: PocAnchorSide) {
    const anchor = getPocNodeAnchorPointForSide(node, side);
    const dx = options.toward.x - center.x;
    const dy = options.toward.y - center.y;
    const preferredDirectionalSide = resolvePocDirectionalAnchorSide(dx, dy);
    const oppositeDirectionalSide = getOppositePocAnchorSide(preferredDirectionalSide);
    const orthogonalPenalty =
      side !== preferredDirectionalSide && side !== oppositeDirectionalSide ? 18 : 0;
    const oppositePenalty = side === oppositeDirectionalSide ? 42 : 0;
    const preferredPenalty = options.preferredSide && side !== options.preferredSide ? 36 : 0;
    const roleBiasPenalty =
      options.role === "input"
        ? side === "left"
          ? 0
          : side === "top" || side === "bottom"
            ? 8
            : 16
        : side === "right"
          ? 0
          : side === "top" || side === "bottom"
            ? 8
            : 16;
    const distancePenalty = (Math.abs(anchor.x - options.toward.x) + Math.abs(anchor.y - options.toward.y)) * 0.12;

    return oppositePenalty + orthogonalPenalty + preferredPenalty + roleBiasPenalty + distancePenalty;
  }

  return POC_ANCHOR_SIDES.reduce<{ side: PocAnchorSide; score: number }>(
    (best, side) => {
      const score = scoreAnchorSide(side);
      return score < best.score ? { side, score } : best;
    },
    { side: getPocNodeAnchorPoint(node, options.toward).side, score: Number.POSITIVE_INFINITY },
  ).side;
}

function getPocNodeAnchorPointForSide<TData extends Record<string, unknown>, TType extends string>(
  node: PocNode<TData, TType>,
  side: PocAnchorSide,
): PocAnchorPoint {
  const center = getPocNodeCenter(node);

  switch (side) {
    case "left":
      return { x: node.position.x, y: center.y, side };
    case "right":
      return { x: node.position.x + node.size.width, y: center.y, side };
    case "top":
      return { x: center.x, y: node.position.y, side };
    case "bottom":
      return { x: center.x, y: node.position.y + node.size.height, side };
  }
}

export function getPocOrthogonalAnchorPoint<TData extends Record<string, unknown>, TType extends string>(
  node: PocNode<TData, TType>,
  side: PocAnchorSide,
  toward: PocNodePosition,
): PocAnchorPoint {
  const center = getPocNodeCenter(node);

  if (side === "left" || side === "right") {
    return toward.y >= center.y
      ? { x: center.x, y: node.position.y + node.size.height, side: "bottom" }
      : { x: center.x, y: node.position.y, side: "top" };
  }

  return toward.x >= center.x
    ? { x: node.position.x + node.size.width, y: center.y, side: "right" }
    : { x: node.position.x, y: center.y, side: "left" };
}

export function offsetPocAnchorWithinSide<TData extends Record<string, unknown>, TType extends string>(
  anchor: PocAnchorPoint,
  node: PocNode<TData, TType>,
  offset: number,
): PocAnchorPoint {
  const inset = 14;
  if (anchor.side === "left" || anchor.side === "right") {
    const minY = node.position.y + inset;
    const maxY = node.position.y + node.size.height - inset;
    return {
      ...anchor,
      y: Math.min(maxY, Math.max(minY, anchor.y + offset)),
    };
  }

  const minX = node.position.x + inset;
  const maxX = node.position.x + node.size.width - inset;
  return {
    ...anchor,
    x: Math.min(maxX, Math.max(minX, anchor.x + offset)),
  };
}

export function resolvePocEdgeAnchor<TData extends Record<string, unknown>, TType extends string>(
  node: PocNode<TData, TType>,
  options: {
    side: PocAnchorSide;
    slot: number;
    slotCount: number;
    spreadStep?: number;
  },
): PocResolvedEdgeAnchor {
  const baseAnchor = getPocNodeAnchorPointForSide(node, options.side);
  const spreadStep = options.spreadStep ?? 18;
  const offset = (options.slot - (options.slotCount - 1) / 2) * spreadStep;
  const offsetAnchor = options.slotCount > 1 ? offsetPocAnchorWithinSide(baseAnchor, node, offset) : baseAnchor;

  return {
    ...offsetAnchor,
    slot: options.slot,
    slotCount: options.slotCount,
  };
}

export function resolvePocLowLevelEdgeAnchorsBatch(
  requests: PocEdgeAnchorResolutionRequest[],
): PocResolvedEdgeAnchor[] {
  return requests.map((request) =>
    resolvePocEdgeAnchor(
      {
        id: 0,
        type: "default",
        position: { x: request.x, y: request.y },
        size: { width: request.width, height: request.height },
        data: {},
      },
      {
        side: request.side,
        slot: request.slot,
        slotCount: request.slotCount,
        spreadStep: request.spreadStep,
      },
    ),
  );
}

export function resolvePocNodeAnchors<TData extends Record<string, unknown>, TType extends string>(
  node: PocNode<TData, TType>,
  options: {
    inputToward: PocNodePosition;
    outputToward: PocNodePosition;
    sameSideOffset?: number;
    preferredInputSide?: PocAnchorSide;
    preferredOutputSide?: PocAnchorSide;
  },
): PocResolvedNodeAnchors {
  const sameSideOffset = options.sameSideOffset ?? 18;
  const preferredInputSide = resolvePocNodeRoleAnchorSide(node, {
    toward: options.inputToward,
    role: "input",
    preferredSide: options.preferredInputSide,
  });
  const preferredOutputSide = resolvePocNodeRoleAnchorSide(node, {
    toward: options.outputToward,
    role: "output",
    preferredSide: options.preferredOutputSide,
  });

  let bestScore = Number.POSITIVE_INFINITY;
  let bestInputAnchor = getPocNodeAnchorPoint(node, options.inputToward);
  let bestOutputAnchor = getPocNodeAnchorPoint(node, options.outputToward);

  for (const inputSide of POC_ANCHOR_SIDES) {
    for (const outputSide of POC_ANCHOR_SIDES) {
      const pairPenalty =
        inputSide === outputSide
          ? 64
          : inputSide === "right" && outputSide === "left"
            ? 24
            : 0;
      const score =
        pairPenalty +
        (inputSide === preferredInputSide ? 0 : 18) +
        (outputSide === preferredOutputSide ? 0 : 18);

      if (score >= bestScore) continue;

      bestScore = score;
      bestInputAnchor = getPocNodeAnchorPointForSide(node, inputSide);
      bestOutputAnchor = getPocNodeAnchorPointForSide(node, outputSide);
    }
  }

  let inputAnchor = bestInputAnchor;
  let outputAnchor = bestOutputAnchor;

  if (inputAnchor.side === outputAnchor.side) {
    inputAnchor = getPocOrthogonalAnchorPoint(node, inputAnchor.side, options.inputToward);
    outputAnchor = offsetPocAnchorWithinSide(outputAnchor, node, sameSideOffset);
  }

  return { inputAnchor, outputAnchor };
}

export function createPocEdgeSpreadMaps<TData extends Record<string, unknown>, TType extends string>(
  nodes: Array<PocNode<TData, TType>>,
  edges: PocEdge[],
  nodeAnchorsById: Map<number, PocResolvedNodeAnchors>,
  spreadStep = 18,
) {
  const sourceSpreadByEdgeId = new Map<string, number>();
  const targetSpreadByEdgeId = new Map<string, number>();
  const nodeById = new Map(nodes.map((node) => [Number(node.id), node] as const));

  const edgePositionMetric = (node: PocNode<TData, TType>, side: PocAnchorSide) => {
    const center = getPocNodeCenter(node);
    return side === "left" || side === "right" ? center.y : center.x;
  };

  const outgoingBySource = new Map<number, PocEdge[]>();
  const incomingByTarget = new Map<number, PocEdge[]>();

  edges.forEach((edge) => {
    const sourceId = Number(edge.source);
    const targetId = Number(edge.target);
    outgoingBySource.set(sourceId, [...(outgoingBySource.get(sourceId) ?? []), edge]);
    incomingByTarget.set(targetId, [...(incomingByTarget.get(targetId) ?? []), edge]);
  });

  outgoingBySource.forEach((group, sourceId) => {
    const sourceAnchor = nodeAnchorsById.get(sourceId)?.outputAnchor;
    if (!sourceAnchor || group.length <= 1) return;
    group
      .slice()
      .sort((left, right) => {
        const leftTarget = nodeById.get(Number(left.target));
        const rightTarget = nodeById.get(Number(right.target));
        if (!leftTarget || !rightTarget) return 0;
        return edgePositionMetric(leftTarget, sourceAnchor.side) - edgePositionMetric(rightTarget, sourceAnchor.side);
      })
      .forEach((edge, index, ordered) => {
        sourceSpreadByEdgeId.set(edge.id, getPocCenteredSlotSpread(index, ordered.length, spreadStep));
      });
  });

  incomingByTarget.forEach((group, targetId) => {
    const targetAnchor = nodeAnchorsById.get(targetId)?.inputAnchor;
    if (!targetAnchor || group.length <= 1) return;
    group
      .slice()
      .sort((left, right) => {
        const leftSource = nodeById.get(Number(left.source));
        const rightSource = nodeById.get(Number(right.source));
        if (!leftSource || !rightSource) return 0;
        return edgePositionMetric(leftSource, targetAnchor.side) - edgePositionMetric(rightSource, targetAnchor.side);
      })
      .forEach((edge, index, ordered) => {
        targetSpreadByEdgeId.set(edge.id, getPocCenteredSlotSpread(index, ordered.length, spreadStep));
      });
  });

  return { sourceSpreadByEdgeId, targetSpreadByEdgeId };
}

export function getPocCenteredSlotSpread(slot: number, slotCount: number, spreadStep = 18) {
  if (slotCount <= 1) return 0;
  return (slot - (slotCount - 1) / 2) * spreadStep;
}

export function resolvePocEdgeCurveSpread({
  spread,
  slot,
  slotCount,
  spreadStep = 18,
}: {
  spread?: number;
  slot?: number;
  slotCount?: number;
  spreadStep?: number;
}) {
  if (typeof slot === "number" && Number.isFinite(slot) && typeof slotCount === "number" && slotCount > 0) {
    return getPocCenteredSlotSpread(slot, slotCount, spreadStep);
  }
  return spread ?? 0;
}

export function createPocEdgePathResolutionRequest({
  sourceAnchor,
  targetAnchor,
  sourceX = sourceAnchor.x,
  sourceY = sourceAnchor.y,
  targetX = targetAnchor.x,
  targetY = targetAnchor.y,
  sourceSpread,
  targetSpread,
  spreadStep = 18,
  bendOffsetX,
  bendOffsetY,
  minimumCurveOffset = 40,
}: PocEdgeCurveRequestOptions): PocEdgePathResolutionRequest {
  return {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceSide: sourceAnchor.side,
    targetSide: targetAnchor.side,
    sourceSpread,
    targetSpread,
    sourceSlot: sourceAnchor.slot,
    sourceSlotCount: sourceAnchor.slotCount,
    targetSlot: targetAnchor.slot,
    targetSlotCount: targetAnchor.slotCount,
    spreadStep,
    bendOffsetX,
    bendOffsetY,
    minimumCurveOffset,
  };
}

export function resolvePocEdgeAnchorsBatch<TData extends Record<string, unknown>, TType extends string>(
  nodes: Array<PocNode<TData, TType>>,
  edges: PocEdge[],
  nodeAnchorsById: Map<number, PocResolvedNodeAnchors>,
  resolveLowLevelAnchors: (requests: PocEdgeAnchorResolutionRequest[]) => PocResolvedEdgeAnchor[] = resolvePocLowLevelEdgeAnchorsBatch,
  resolveRenderedAnchors?: (requests: PocRenderedEdgeAnchorResolutionRequest[]) => PocRenderedResolvedEdgeAnchors[],
): PocResolvedEdgeAnchors[] {
  void nodeAnchorsById;
  const nodeById = new Map(nodes.map((node) => [Number(node.id), node] as const));

  if (resolveRenderedAnchors) {
    const requestMeta: string[] = [];
    const requests: PocRenderedEdgeAnchorResolutionRequest[] = [];

    edges.forEach((edge) => {
      const sourceNode = nodeById.get(Number(edge.source));
      const targetNode = nodeById.get(Number(edge.target));
      if (!sourceNode || !targetNode) return;

      requests.push({
        sourceId: Number(sourceNode.id),
        sourceX: sourceNode.position.x,
        sourceY: sourceNode.position.y,
        sourceWidth: sourceNode.size.width,
        sourceHeight: sourceNode.size.height,
        targetId: Number(targetNode.id),
        targetX: targetNode.position.x,
        targetY: targetNode.position.y,
        targetWidth: targetNode.size.width,
        targetHeight: targetNode.size.height,
        spreadStep: 18,
      });
      requestMeta.push(edge.id);
    });

    return resolveRenderedAnchors(requests)
      .map((entry, index) => {
        const edgeId = requestMeta[index];
        if (!edgeId) return null;
        return {
          edgeId,
          sourceAnchor: entry.sourceAnchor,
          targetAnchor: entry.targetAnchor,
        };
      })
      .filter((entry): entry is PocResolvedEdgeAnchors => entry !== null);
  }

  const sourceRequests: PocEdgeAnchorResolutionRequest[] = [];
  const sourceMeta: string[] = [];
  const targetRequests: PocEdgeAnchorResolutionRequest[] = [];
  const targetMeta: string[] = [];

  const edgePositionMetric = (node: PocNode<TData, TType>, side: PocAnchorSide) => {
    const center = getPocNodeCenter(node);
    return side === "left" || side === "right" ? center.y : center.x;
  };

  const outgoingGroups = new Map<string, PocEdge[]>();
  const incomingGroups = new Map<string, PocEdge[]>();
  const sourceSideByEdgeId = new Map<string, PocAnchorSide>();
  const targetSideByEdgeId = new Map<string, PocAnchorSide>();

  edges.forEach((edge) => {
    const sourceId = Number(edge.source);
    const targetId = Number(edge.target);
    const sourceNode = nodeById.get(sourceId);
    const targetNode = nodeById.get(targetId);
    if (!sourceNode || !targetNode) return;
    const sourceSide = resolvePocNodeRoleAnchorSide(sourceNode, {
      toward: getPocNodeCenter(targetNode),
      role: "output",
    });
    const targetSide = resolvePocNodeRoleAnchorSide(targetNode, {
      toward: getPocNodeCenter(sourceNode),
      role: "input",
    });
    if (!sourceSide || !targetSide) return;
    sourceSideByEdgeId.set(edge.id, sourceSide);
    targetSideByEdgeId.set(edge.id, targetSide);
    const outgoingKey = `${sourceId}:${sourceSide}`;
    const incomingKey = `${targetId}:${targetSide}`;
    outgoingGroups.set(outgoingKey, [...(outgoingGroups.get(outgoingKey) ?? []), edge]);
    incomingGroups.set(incomingKey, [...(incomingGroups.get(incomingKey) ?? []), edge]);
  });

  outgoingGroups.forEach((group, key) => {
    const [sourceIdText, sourceSide] = key.split(":") as [string, PocAnchorSide];
    const sourceId = Number(sourceIdText);
    const sourceNode = nodeById.get(sourceId);
    if (!sourceNode) return;
    group
      .slice()
      .sort((left, right) => {
        const leftTarget = nodeById.get(Number(left.target));
        const rightTarget = nodeById.get(Number(right.target));
        if (!leftTarget || !rightTarget) return 0;
        return edgePositionMetric(leftTarget, sourceSide) - edgePositionMetric(rightTarget, sourceSide);
      })
      .forEach((edge, index, ordered) => {
        sourceRequests.push({
          x: sourceNode.position.x,
          y: sourceNode.position.y,
          width: sourceNode.size.width,
          height: sourceNode.size.height,
          side: sourceSide,
          slot: index,
          slotCount: ordered.length,
        });
        sourceMeta.push(edge.id);
      });
  });

  incomingGroups.forEach((group, key) => {
    const [targetIdText, targetSide] = key.split(":") as [string, PocAnchorSide];
    const targetId = Number(targetIdText);
    const targetNode = nodeById.get(targetId);
    if (!targetNode) return;
    group
      .slice()
      .sort((left, right) => {
        const leftSource = nodeById.get(Number(left.source));
        const rightSource = nodeById.get(Number(right.source));
        if (!leftSource || !rightSource) return 0;
        return edgePositionMetric(leftSource, targetSide) - edgePositionMetric(rightSource, targetSide);
      })
      .forEach((edge, index, ordered) => {
        targetRequests.push({
          x: targetNode.position.x,
          y: targetNode.position.y,
          width: targetNode.size.width,
          height: targetNode.size.height,
          side: targetSide,
          slot: index,
          slotCount: ordered.length,
        });
        targetMeta.push(edge.id);
      });
  });

  const sourceAnchorsByEdgeId = new Map<string, PocResolvedEdgeAnchor>();
  resolveLowLevelAnchors(sourceRequests).forEach((anchor, index) => {
    sourceAnchorsByEdgeId.set(sourceMeta[index]!, anchor);
  });

  const targetAnchorsByEdgeId = new Map<string, PocResolvedEdgeAnchor>();
  resolveLowLevelAnchors(targetRequests).forEach((anchor, index) => {
    targetAnchorsByEdgeId.set(targetMeta[index]!, anchor);
  });

  return edges
    .map((edge) => {
      const sourceAnchor = sourceAnchorsByEdgeId.get(edge.id);
      const targetAnchor = targetAnchorsByEdgeId.get(edge.id);
      if (!sourceAnchor || !targetAnchor) return null;
      return {
        edgeId: edge.id,
        sourceAnchor,
        targetAnchor,
      };
    })
    .filter((entry): entry is PocResolvedEdgeAnchors => entry !== null);
}

export function buildSmoothPocEdgePath(request: PocEdgePathResolutionRequest) {
  return buildPocSvgCurvePath(
    resolvePocSmoothEdgeCurve({
      ...request,
    }),
  );
}

export function resolvePocRenderableEdgesBatch<TData extends Record<string, unknown>, TType extends string>({
  nodes,
  edges,
  resolvedEdgeAnchorsById,
  projectX = (value) => value,
  projectY = (value) => value,
  spreadStep = 18,
  minimumCurveOffset = 40,
  resolveCurves,
}: PocRenderableEdgeResolutionOptions<TData, TType>): PocResolvedRenderableEdge[] {
  const nodeById = new Map(nodes.map((node) => [Number(node.id), node] as const));
  const requests: Array<{
    id: string;
    sourceAnchor: PocResolvedEdgeAnchor;
    targetAnchor: PocResolvedEdgeAnchor;
    request: PocEdgePathResolutionRequest;
    bendOffsetWorldX: number;
    bendOffsetWorldY: number;
    bendWorldX: number;
    bendWorldY: number;
    hasBend: boolean;
  }> = [];

  edges.forEach((edge) => {
    const sourceNode = nodeById.get(Number(edge.source));
    const targetNode = nodeById.get(Number(edge.target));
    if (!sourceNode || !targetNode) return;

    const resolvedEdgeAnchors = resolvedEdgeAnchorsById.get(edge.id);
    const sourceAnchor = resolvedEdgeAnchors?.sourceAnchor;
    const targetAnchor = resolvedEdgeAnchors?.targetAnchor;
    if (!sourceAnchor || !targetAnchor) return;

    const sourceCenter = getPocNodeCenter(sourceNode);
    const targetCenter = getPocNodeCenter(targetNode);
    const defaultBendWorldX = (sourceCenter.x + targetCenter.x) / 2;
    const defaultBendWorldY = (sourceCenter.y + targetCenter.y) / 2;
    const bendWorldX = defaultBendWorldX + (edge.bend?.x ?? 0);
    const bendWorldY = defaultBendWorldY + (edge.bend?.y ?? 0);

    requests.push({
      id: edge.id,
      sourceAnchor,
      targetAnchor,
      request: createPocEdgePathResolutionRequest({
        sourceAnchor,
        targetAnchor,
        sourceX: projectX(sourceAnchor.x),
        sourceY: projectY(sourceAnchor.y),
        targetX: projectX(targetAnchor.x),
        targetY: projectY(targetAnchor.y),
        spreadStep,
        bendOffsetX: edge.bend ? projectX(bendWorldX) - projectX(defaultBendWorldX) : null,
        bendOffsetY: edge.bend ? projectY(bendWorldY) - projectY(defaultBendWorldY) : null,
        minimumCurveOffset,
      }),
      bendOffsetWorldX: edge.bend?.x ?? 0,
      bendOffsetWorldY: edge.bend?.y ?? 0,
      bendWorldX,
      bendWorldY,
      hasBend: Boolean(edge.bend),
    });
  });

  const requestPayload = requests.map((entry) => entry.request);
  const curves = resolveCurves
    ? resolveCurves(requestPayload)
    : requestPayload.map((request) => resolvePocSmoothEdgeCurve(request));

  return requests.map((entry, index) => {
    const curve = curves[index] ?? resolvePocSmoothEdgeCurve(entry.request);
    return {
      id: entry.id,
      sourceAnchor: entry.sourceAnchor,
      targetAnchor: entry.targetAnchor,
      curve,
      path: buildPocSvgCurvePath(curve),
      bendOffsetWorldX: entry.bendOffsetWorldX,
      bendOffsetWorldY: entry.bendOffsetWorldY,
      bendWorldX: entry.bendWorldX,
      bendWorldY: entry.bendWorldY,
      hasBend: entry.hasBend,
    };
  });
}

export function resolvePocSmoothEdgeCurve({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceSide,
  targetSide,
  sourceSpread = 0,
  targetSpread = 0,
  bendOffsetX,
  bendOffsetY,
  minimumCurveOffset = 40,
  sourceSlot,
  sourceSlotCount,
  targetSlot,
  targetSlotCount,
  spreadStep = 18,
}: PocEdgePathResolutionRequest): PocResolvedEdgeCurve {
  const effectiveSourceSpread = resolvePocEdgeCurveSpread({
    spread: sourceSpread,
    slot: sourceSlot,
    slotCount: sourceSlotCount,
    spreadStep,
  });
  const effectiveTargetSpread = resolvePocEdgeCurveSpread({
    spread: targetSpread,
    slot: targetSlot,
    slotCount: targetSlotCount,
    spreadStep,
  });
  const useSharedLaneSpread =
    (sourceSide === "left" && targetSide === "right") ||
    (sourceSide === "right" && targetSide === "left") ||
    (sourceSide === "top" && targetSide === "bottom") ||
    (sourceSide === "bottom" && targetSide === "top");
  const sharedLaneSpread = (() => {
    if (!useSharedLaneSpread) return null;
    if (effectiveSourceSpread === 0) return effectiveTargetSpread * 0.75;
    if (effectiveTargetSpread === 0) return effectiveSourceSpread * 0.75;
    return (effectiveSourceSpread + effectiveTargetSpread) / 2;
  })();
  const resolvedSourceSpread = sharedLaneSpread ?? effectiveSourceSpread;
  const resolvedTargetSpread = sharedLaneSpread ?? effectiveTargetSpread;
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const isForwardHorizontalLane =
    ((sourceSide === "right" && targetSide === "left") || (sourceSide === "left" && targetSide === "right")) &&
    Math.sign(dx || 0) === (sourceSide === "right" ? 1 : -1);
  const baseOffset = isForwardHorizontalLane
    ? Math.max(
        18,
        Math.min(minimumCurveOffset, Math.abs(dx) * 0.38),
        Math.max(Math.abs(dx), Math.abs(dy)) * 0.22,
      )
    : Math.max(minimumCurveOffset, Math.max(Math.abs(dx), Math.abs(dy)) * 0.28);
  const verticalBendFactor = isForwardHorizontalLane ? 0.24 : 0.34;

  function buildDirectionalControlPoint(
    x: number,
    y: number,
    side: PocAnchorSide,
    spread: number,
    bendX = 0,
    bendY = 0,
  ) {
    switch (side) {
      case "left":
        return { x: x - baseOffset + bendX, y: y + spread + bendY };
      case "right":
        return { x: x + baseOffset + bendX, y: y + spread + bendY };
      case "top":
        return { x: x + spread + bendX, y: y - baseOffset + bendY };
      case "bottom":
        return { x: x + spread + bendX, y: y + baseOffset + bendY };
    }
  }

  const bendInfluenceX = bendOffsetX ?? 0;
  const bendInfluenceY = bendOffsetY ?? 0;
  const sourceControl = buildDirectionalControlPoint(
    sourceX,
    sourceY,
    sourceSide,
    resolvedSourceSpread,
    bendInfluenceX * 0.16,
    bendInfluenceY * verticalBendFactor,
  );
  const targetControl = buildDirectionalControlPoint(
    targetX,
    targetY,
    targetSide,
    resolvedTargetSpread,
    bendInfluenceX * 0.16,
    bendInfluenceY * verticalBendFactor,
  );

  return {
    sourceX,
    sourceY,
    sourceControlX: sourceControl.x,
    sourceControlY: sourceControl.y,
    targetControlX: targetControl.x,
    targetControlY: targetControl.y,
    targetX,
    targetY,
  };
}

export function buildPocSvgCurvePath(curve: PocResolvedEdgeCurve) {
  return `M ${curve.sourceX} ${curve.sourceY} C ${curve.sourceControlX} ${curve.sourceControlY}, ${curve.targetControlX} ${curve.targetControlY}, ${curve.targetX} ${curve.targetY}`;
}

export function projectPocResolvedEdgeCurve(
  curve: PocResolvedEdgeCurve,
  options: {
    projectX?: (value: number) => number;
    projectY?: (value: number) => number;
  } = {},
): PocResolvedEdgeCurve {
  const projectX = options.projectX ?? ((value: number) => value);
  const projectY = options.projectY ?? ((value: number) => value);

  return {
    sourceX: projectX(curve.sourceX),
    sourceY: projectY(curve.sourceY),
    sourceControlX: projectX(curve.sourceControlX),
    sourceControlY: projectY(curve.sourceControlY),
    targetControlX: projectX(curve.targetControlX),
    targetControlY: projectY(curve.targetControlY),
    targetX: projectX(curve.targetX),
    targetY: projectY(curve.targetY),
  };
}

export type PocEngineBridge = Pick<
  HyperflowWasmBridge,
  | "loadFixture"
  | "setViewport"
  | "getVisibleBoxes"
  | "getVisibleNodeIds"
  | "hitTest"
  | "getNodeCount"
  | "resolveNodeAnchorsBatch"
  | "resolveEdgeAnchorsBatch"
  | "resolveRenderedEdgeAnchorsBatch"
  | "resolveEdgeCurvesBatch"
>;

export type PocEngineOptions = {
  bridgeFactory?: (options?: HyperflowWasmSourceOptions) => Promise<PocEngineBridge>;
  bridgeOptions?: HyperflowWasmSourceOptions;
  renderer?: PocRenderer;
  now?: () => number;
};

export type PocFrame = {
  boxes: VisibleBox[];
  metrics: PocMetrics;
};

export type PocEngine = {
  loadFixture(nodes: PocRuntimeNode[]): number;
  renderFrame(context: CanvasLikeContext, viewport: PocViewport, renderOptions?: PocRenderOptions): PocFrame;
  hitTest(worldPoint: HyperflowPoint): number | null;
  getVisibleNodeIds(): number[];
  getVisibleBoxes(): VisibleBox[];
  getNodeCount(): number;
  resolveNodeAnchorsBatch(requests: PocAnchorResolutionRequest[]): HyperflowResolvedNodeAnchors[];
  resolveEdgeAnchorsBatch(requests: PocLowLevelEdgeAnchorResolutionRequest[]): PocLowLevelResolvedEdgeAnchor[];
  resolveRenderedEdgeAnchorsBatch(requests: PocRenderedEdgeAnchorResolutionRequest[]): PocRenderedResolvedEdgeAnchors[];
  resolveEdgeCurvesBatch(requests: PocEdgePathResolutionRequest[]): PocResolvedEdgeCurve[];
};

export function projectPocNodeToRuntimeNode<TData extends Record<string, unknown>, TType extends string>(
  node: PocNode<TData, TType>,
): PocRuntimeNode {
  return {
    id: Number(node.id),
    x: Number(node.position.x),
    y: Number(node.position.y),
    width: Number(node.size.width),
    height: Number(node.size.height),
  };
}

export function projectPocNodesToRuntimeNodes<TData extends Record<string, unknown>, TType extends string>(
  nodes: Array<PocNode<TData, TType>>,
): PocRuntimeNode[] {
  return nodes.map(projectPocNodeToRuntimeNode);
}

export function createPocViewport(width = 960, height = 540, overrides: Partial<PocViewport> = {}): PocViewport {
  return {
    x: 0,
    y: 0,
    width,
    height,
    zoom: 1,
    ...overrides,
  };
}

export function createPocMetricsSummary(metrics: PocMetrics): string {
  return [
    `fixtureSize: ${metrics.fixtureSize}`,
    `visibleCount: ${metrics.visibleCount}`,
    `viewportUpdateMs: ${metrics.viewportUpdateMs.toFixed(3)}`,
    `renderMs: ${metrics.renderMs.toFixed(3)}`,
    `zoom: ${metrics.zoom.toFixed(2)}`,
    `viewport: (${metrics.x.toFixed(1)}, ${metrics.y.toFixed(1)})`,
  ].join("\n");
}

export async function createPocEngine(options: PocEngineOptions = {}): Promise<PocEngine> {
  const bridgeFactory = options.bridgeFactory ?? createHyperflowWasmBridge;
  const renderer = options.renderer ?? drawVisibleBoxes;
  const now = options.now ?? (() => performance.now());
  const bridge = await bridgeFactory(options.bridgeOptions ?? {});
  let fixtureSize = 0;
  let hasLoadedFixture = false;

  return {
    loadFixture(nodes) {
      fixtureSize = nodes.length;
      hasLoadedFixture = true;
      return bridge.loadFixture(nodes);
    },

    renderFrame(context, viewport, renderOptions = {}) {
      if (!hasLoadedFixture) {
        throw new Error("loadFixture(nodes) must be called before renderFrame().");
      }
      const viewportStart = now();
      const visibleCount = bridge.setViewport(viewport);
      const boxes = bridge.getVisibleBoxes();
      const viewportUpdateMs = now() - viewportStart;

      const renderStart = now();
      renderer(context, boxes, viewport, {
        clear: true,
        canvasWidth: renderOptions.canvasWidth ?? viewport.width,
        canvasHeight: renderOptions.canvasHeight ?? viewport.height,
        ...renderOptions,
      });
      const renderMs = now() - renderStart;

      return {
        boxes,
        metrics: {
          fixtureSize,
          visibleCount,
          viewportUpdateMs,
          renderMs,
          zoom: viewport.zoom,
          x: viewport.x,
          y: viewport.y,
        },
      };
    },

    hitTest(worldPoint) {
      return bridge.hitTest(worldPoint);
    },

    getVisibleNodeIds() {
      return bridge.getVisibleNodeIds();
    },

    getVisibleBoxes() {
      return bridge.getVisibleBoxes();
    },

    getNodeCount() {
      return bridge.getNodeCount();
    },

    resolveNodeAnchorsBatch(requests) {
      return bridge.resolveNodeAnchorsBatch(requests);
    },

    resolveEdgeAnchorsBatch(requests) {
      return bridge.resolveEdgeAnchorsBatch(requests);
    },

    resolveRenderedEdgeAnchorsBatch(requests) {
      return bridge.resolveRenderedEdgeAnchorsBatch(requests);
    },

    resolveEdgeCurvesBatch(requests) {
      return bridge.resolveEdgeCurvesBatch(requests);
    },
  };
}
