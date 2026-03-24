import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  createPocEngine,
  projectPocNodesToRuntimeNodes,
  type PocEngine,
  type PocEdge,
  type PocMetrics,
  type PocNode,
  type PocViewport,
  type VisibleBox,
} from "@hyperflow/sdk";
import { isInteractiveCanvasMode, type HyperFlowCanvasMode } from "./starter";

export type HyperFlowPocNodeRendererProps<TData = unknown> = {
  node: PocNode;
  box: VisibleBox;
  data: TData;
  selected: boolean;
  viewport: PocViewport;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  onSelect: () => void;
};

export type HyperFlowPocNodeRenderers = Record<string, React.ComponentType<HyperFlowPocNodeRendererProps<any>>>;

export type HyperFlowPocCanvasProps = {
  nodes: PocNode[];
  edges?: PocEdge[];
  viewport: PocViewport;
  selectedNodeId?: number | null;
  selectedNodeIds?: number[] | null;
  selectedEdgeId?: string | null;
  width?: number;
  height?: number;
  className?: string;
  mode?: HyperFlowCanvasMode;
  interactive?: boolean;
  nodeRenderers?: HyperFlowPocNodeRenderers;
  getNodeRendererKey?: (node: PocNode) => string | null;
  getNodeRendererData?: (node: PocNode) => unknown;
  onNodeSelect?: (nodeId: number | null, options?: { additive?: boolean }) => void;
  onNodeSelectionBoxChange?: (nodeIds: number[], options?: { additive?: boolean }) => void;
  onEdgeSelect?: (edgeId: string | null, options?: { additive?: boolean }) => void;
  onNodePositionChange?: (nodeId: number, nextPosition: PocNode["position"]) => void;
  onNodesPositionChange?: (updates: Array<{ nodeId: number; nextPosition: PocNode["position"] }>) => void;
  onViewportChange?: (viewport: PocViewport) => void;
  onEdgeConnect?: (sourceNodeId: number, targetNodeId: number) => void;
  onEdgeBendChange?: (edgeId: string, nextBend: PocEdge["bend"]) => void;
  onMetricsChange?: (metrics: PocMetrics) => void;
  onReadyChange?: (ready: boolean) => void;
};

const HANDLE_SIZE = 18;
const HANDLE_HALF = HANDLE_SIZE / 2;

type AnchorSide = "left" | "right" | "top" | "bottom";

function getNodeCenter(node: PocNode) {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

function getNodeAnchorPoint(node: PocNode, toward: { x: number; y: number }) {
  const center = getNodeCenter(node);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { x: node.position.x + node.size.width, y: center.y, side: "right" as const }
      : { x: node.position.x, y: center.y, side: "left" as const };
  }

  return dy >= 0
    ? { x: center.x, y: node.position.y + node.size.height, side: "bottom" as const }
    : { x: center.x, y: node.position.y, side: "top" as const };
}

function getOrthogonalAnchorPoint(
  node: PocNode,
  side: AnchorSide,
  toward: { x: number; y: number },
) {
  const center = getNodeCenter(node);

  if (side === "left" || side === "right") {
    return toward.y >= center.y
      ? { x: center.x, y: node.position.y + node.size.height, side: "bottom" as const }
      : { x: center.x, y: node.position.y, side: "top" as const };
  }

  return toward.x >= center.x
    ? { x: node.position.x + node.size.width, y: center.y, side: "right" as const }
    : { x: node.position.x, y: center.y, side: "left" as const };
}

function offsetAnchorWithinSide(
  anchor: { x: number; y: number; side: AnchorSide },
  node: PocNode,
  offset: number,
) {
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

function buildSmoothEdgePath({
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
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceSide: AnchorSide;
  targetSide: AnchorSide;
  sourceSpread?: number;
  targetSpread?: number;
  bendOffsetX?: number | null;
  bendOffsetY?: number | null;
}) {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const baseOffset = Math.max(40, Math.max(Math.abs(dx), Math.abs(dy)) * 0.28);

  function buildDirectionalControlPoint(
    x: number,
    y: number,
    side: AnchorSide,
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
    sourceSpread,
    bendInfluenceX * 0.16,
    bendInfluenceY * 0.34,
  );
  const targetControl = buildDirectionalControlPoint(
    targetX,
    targetY,
    targetSide,
    targetSpread,
    bendInfluenceX * 0.16,
    bendInfluenceY * 0.34,
  );

  return `M ${sourceX} ${sourceY} C ${sourceControl.x} ${sourceControl.y}, ${targetControl.x} ${targetControl.y}, ${targetX} ${targetY}`;
}

export function HyperFlowPocCanvas({
  nodes,
  edges = [],
  viewport,
  selectedNodeId = null,
  selectedNodeIds = null,
  selectedEdgeId = null,
  width = 960,
  height = 540,
  className,
  mode = "inspect",
  interactive,
  nodeRenderers,
  getNodeRendererKey,
  getNodeRendererData,
  onNodeSelect,
  onNodeSelectionBoxChange,
  onEdgeSelect,
  onNodePositionChange,
  onNodesPositionChange,
  onViewportChange,
  onEdgeConnect,
  onEdgeBendChange,
  onMetricsChange,
  onReadyChange,
}: HyperFlowPocCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<PocEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleBoxes, setVisibleBoxes] = useState<VisibleBox[]>([]);
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<number | null>(null);
  const [connectionPreview, setConnectionPreview] = useState<{
    sourceNodeId: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hoveredTargetId: number | null;
  } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const isInteractive = interactive ?? isInteractiveCanvasMode(mode);
  const viewportRef = useRef(viewport);
  const onNodePositionChangeRef = useRef(onNodePositionChange);
  const onNodesPositionChangeRef = useRef(onNodesPositionChange);
  const onViewportChangeRef = useRef(onViewportChange);
  const onEdgeBendChangeRef = useRef(onEdgeBendChange);
  const ignoreCanvasClickUntilRef = useRef(0);
  const scheduledFrameRef = useRef<number | null>(null);
  const connectionPreviewFrameRef = useRef<number | null>(null);
  const pendingNodePositionsRef = useRef<Array<{ nodeId: number; nextPosition: PocNode["position"] }> | null>(null);
  const pendingViewportRef = useRef<PocViewport | null>(null);
  const pendingEdgeBendRef = useRef<{ edgeId: string; nextBend: PocEdge["bend"] } | null>(null);
  const pendingConnectionPreviewRef = useRef<{
    sourceNodeId: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hoveredTargetId: number | null;
  } | null>(null);
  const suppressNextHandleClickRef = useRef(false);
  const connectionDragRef = useRef<
    | null
    | {
        pointerId: number | null;
        sourceNodeId: number;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        hoveredTargetId: number | null;
        moved: boolean;
      }
  >(null);
  const dragStateRef = useRef<
    | null
    | {
        kind: "node";
        pointerId: number | null;
        moved: boolean;
        nodeId: number;
        startClientX: number;
        startClientY: number;
        startPosition: PocNode["position"];
      }
    | {
        kind: "nodes";
        pointerId: number | null;
        moved: boolean;
        nodeIds: number[];
        startClientX: number;
        startClientY: number;
        startPositions: Array<{ nodeId: number; position: PocNode["position"] }>;
      }
    | {
        kind: "pan";
        pointerId: number | null;
        moved: boolean;
        startClientX: number;
        startClientY: number;
        startViewport: PocViewport;
      }
    | {
        kind: "selection";
        pointerId: number | null;
        moved: boolean;
        additive: boolean;
        startClientX: number;
        startClientY: number;
        currentClientX: number;
        currentClientY: number;
      }
    | {
        kind: "edge";
        pointerId: number | null;
        moved: boolean;
        edgeId: string;
        startClientX: number;
        startClientY: number;
        startBend: PocNode["position"];
      }
  >(null);
  const hasCustomNodeRendering = useMemo(() => {
    if (!nodeRenderers || !getNodeRendererKey) return false;
    return nodes.some((node) => {
      const rendererKey = getNodeRendererKey(node);
      return rendererKey ? Boolean(nodeRenderers[rendererKey]) : false;
    });
  }, [getNodeRendererKey, nodeRenderers, nodes]);
  const selectedNodeIdsSet = useMemo(() => {
    const resolvedIds = selectedNodeIds?.length ? selectedNodeIds : selectedNodeId !== null ? [selectedNodeId] : [];
    return new Set(resolvedIds.map((id) => Number(id)));
  }, [selectedNodeId, selectedNodeIds]);
  const activeDragNodeIdsSet = useMemo(() => {
    const activeIds = new Set<number>();
    const dragState = dragStateRef.current;
    if (!dragState) return activeIds;
    if (dragState.kind === "node") {
      activeIds.add(Number(dragState.nodeId));
    } else if (dragState.kind === "nodes") {
      dragState.nodeIds.forEach((nodeId) => activeIds.add(Number(nodeId)));
    }
    return activeIds;
  }, [nodes, viewport.x, viewport.y, viewport.zoom]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [Number(node.id), node])), [nodes]);

  useEffect(() => {
    viewportRef.current = viewport;
    onNodePositionChangeRef.current = onNodePositionChange;
    onNodesPositionChangeRef.current = onNodesPositionChange;
    onViewportChangeRef.current = onViewportChange;
    onEdgeBendChangeRef.current = onEdgeBendChange;
  }, [onEdgeBendChange, onNodePositionChange, onNodesPositionChange, onViewportChange, viewport]);

  function flushPendingUpdates() {
    scheduledFrameRef.current = null;

    const pendingNodePositions = pendingNodePositionsRef.current;
    if (pendingNodePositions?.length) {
      if (onNodesPositionChangeRef.current) {
        onNodesPositionChangeRef.current(pendingNodePositions);
      } else if (onNodePositionChangeRef.current) {
        pendingNodePositions.forEach((update) => {
          onNodePositionChangeRef.current?.(update.nodeId, update.nextPosition);
        });
      }
    }
    pendingNodePositionsRef.current = null;

    const pendingEdgeBend = pendingEdgeBendRef.current;
    if (pendingEdgeBend && onEdgeBendChangeRef.current) {
      onEdgeBendChangeRef.current(pendingEdgeBend.edgeId, pendingEdgeBend.nextBend);
    }
    pendingEdgeBendRef.current = null;

    const pendingViewport = pendingViewportRef.current;
    if (pendingViewport && onViewportChangeRef.current) {
      onViewportChangeRef.current(pendingViewport);
    }
    pendingViewportRef.current = null;
  }

  function schedulePendingUpdates() {
    if (scheduledFrameRef.current !== null || typeof window === "undefined") return;
    scheduledFrameRef.current = window.requestAnimationFrame(() => {
      flushPendingUpdates();
    });
  }

  function flushConnectionPreview() {
    connectionPreviewFrameRef.current = null;
    setConnectionPreview(pendingConnectionPreviewRef.current);
  }

  function scheduleConnectionPreview() {
    if (connectionPreviewFrameRef.current !== null || typeof window === "undefined") return;
    connectionPreviewFrameRef.current = window.requestAnimationFrame(() => {
      flushConnectionPreview();
    });
  }

  function clearConnectionPreview() {
    pendingConnectionPreviewRef.current = null;
    if (connectionPreviewFrameRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(connectionPreviewFrameRef.current);
      connectionPreviewFrameRef.current = null;
    }
    setConnectionPreview(null);
  }

  function getCanvasPoint(event: Pick<React.PointerEvent<HTMLCanvasElement>, "clientX" | "clientY">) {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      rect,
      screenX: (event.clientX - rect.left) * (canvasRef.current.width / rect.width),
      screenY: (event.clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  }

  useEffect(() => {
    let cancelled = false;

    createPocEngine()
      .then((instance) => {
        if (cancelled) return;
        setEngine(instance);
        onReadyChange?.(true);
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        onReadyChange?.(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onReadyChange]);

  useEffect(() => {
    if (!engine) return;
    engine.loadFixture(projectPocNodesToRuntimeNodes(nodes));
  }, [engine, nodes]);

  useEffect(() => {
    if (!engine || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    const { boxes, metrics } = engine.renderFrame(context, viewport, {
      canvasWidth: width,
      canvasHeight: height,
      fillStyle: hasCustomNodeRendering ? "rgba(0, 0, 0, 0)" : "rgba(99, 102, 241, 0.18)",
      strokeStyle: hasCustomNodeRendering ? "rgba(0, 0, 0, 0)" : "rgba(99, 102, 241, 0.95)",
      lineWidth: 1,
    });

    if (!hasCustomNodeRendering && selectedNodeId !== null) {
      const selectedBox = boxes.find((box) => Number(box.id) === Number(selectedNodeId));
      if (selectedBox) {
        const screenX = (selectedBox.x - viewport.x) * viewport.zoom;
        const screenY = (selectedBox.y - viewport.y) * viewport.zoom;
        const selectedWidth = selectedBox.width * viewport.zoom;
        const selectedHeight = selectedBox.height * viewport.zoom;

        context.save();
        context.strokeStyle = "#22c55e";
        context.lineWidth = 2;
        context.strokeRect(screenX - 2, screenY - 2, selectedWidth + 4, selectedHeight + 4);
        context.restore();
      }
    }

    setVisibleBoxes(boxes);
    onMetricsChange?.(metrics);
  }, [engine, hasCustomNodeRendering, height, nodes, onMetricsChange, selectedNodeId, viewport, width]);

  function selectNode(nodeId: number | null, options?: { additive?: boolean }) {
    onNodeSelect?.(nodeId, options);
  }

  function selectEdge(edgeId: string | null, options?: { additive?: boolean }) {
    onEdgeSelect?.(edgeId, options);
  }

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!isInteractive || !engine || !canvasRef.current) return;
    if (Date.now() < ignoreCanvasClickUntilRef.current) return;

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) return;
    const worldPoint = {
      x: viewport.x + canvasPoint.screenX / viewport.zoom,
      y: viewport.y + canvasPoint.screenY / viewport.zoom,
    };

    selectNode(engine.hitTest(worldPoint), { additive: event.shiftKey });
    selectEdge(null);
  }

  function startNodeDrag(
    node: PocNode,
    clientX: number,
    clientY: number,
    pointerId: number | null = null,
    additive = false,
  ) {
    const resolvedSelectedIds = selectedNodeIds?.length
      ? selectedNodeIds.map((id) => Number(id))
      : selectedNodeId !== null
        ? [Number(selectedNodeId)]
        : [];
    const numericNodeId = Number(node.id);
    const canGroupDrag = !additive && resolvedSelectedIds.length > 1 && resolvedSelectedIds.includes(numericNodeId);

    if (!canGroupDrag) {
      selectNode(node.id, { additive });
    }
    if (!additive && !canGroupDrag) {
      selectEdge(null);
    }
    if (canGroupDrag) {
      dragStateRef.current = {
        kind: "nodes",
        pointerId,
        moved: false,
        nodeIds: resolvedSelectedIds,
        startClientX: clientX,
        startClientY: clientY,
        startPositions: resolvedSelectedIds
          .map((nodeId) => nodeById.get(Number(nodeId)))
          .filter(Boolean)
          .map((selectedNode) => ({
            nodeId: Number(selectedNode!.id),
            position: { ...selectedNode!.position },
          })),
      };
      return;
    }

    dragStateRef.current = {
      kind: "node",
      pointerId,
      moved: false,
      nodeId: node.id,
      startClientX: clientX,
      startClientY: clientY,
      startPosition: { ...node.position },
    };
  }

  function handleNodeOverlayPointerDown(event: React.PointerEvent<HTMLDivElement>, node: PocNode) {
    if (!isInteractive || !onNodePositionChange) return;
    if (event.pointerType === "mouse") return;
    event.stopPropagation();
    startNodeDrag(node, event.clientX, event.clientY, event.pointerId, event.shiftKey);
  }

  function handleNodeOverlayMouseDown(event: React.MouseEvent<HTMLDivElement>, node: PocNode) {
    if (!isInteractive || !onNodePositionChange || event.button !== 0) return;
    event.stopPropagation();
    startNodeDrag(node, event.clientX, event.clientY, null, event.shiftKey);
  }

  function startPanDrag(clientX: number, clientY: number, pointerId: number | null = null) {
    selectNode(null);
    selectEdge(null);
    dragStateRef.current = {
      kind: "pan",
      pointerId,
      moved: false,
      startClientX: clientX,
      startClientY: clientY,
      startViewport: { ...viewportRef.current },
    };
  }

  function startSelectionDrag(clientX: number, clientY: number, additive = false, pointerId: number | null = null) {
    if (!additive) {
      selectNode(null);
      selectEdge(null);
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    setSelectionBox(
      rect
        ? {
            left: clientX - rect.left,
            top: clientY - rect.top,
            width: 0,
            height: 0,
          }
        : null,
    );
    dragStateRef.current = {
      kind: "selection",
      pointerId,
      moved: false,
      additive,
      startClientX: clientX,
      startClientY: clientY,
      currentClientX: clientX,
      currentClientY: clientY,
    };
  }

  function startEdgeDrag(
    edgeId: string,
    clientX: number,
    clientY: number,
    startBend: PocNode["position"],
    pointerId: number | null = null,
  ) {
    selectNode(null);
    selectEdge(edgeId);
    dragStateRef.current = {
      kind: "edge",
      pointerId,
      moved: false,
      edgeId,
      startClientX: clientX,
      startClientY: clientY,
      startBend,
    };
  }

  function matchesDragPointer(pointerId: number | null) {
    if (!dragStateRef.current) return false;
    if (dragStateRef.current.pointerId === null) return pointerId === null;
    return dragStateRef.current.pointerId === pointerId;
  }

  function matchesConnectionPointer(pointerId: number | null) {
    if (!connectionDragRef.current) return false;
    if (connectionDragRef.current.pointerId === null) return pointerId === null;
    return connectionDragRef.current.pointerId === pointerId;
  }

  function startConnectionDrag(
    sourceNodeId: number,
    startX: number,
    startY: number,
    clientX: number,
    clientY: number,
    pointerId: number | null,
  ) {
    setPendingConnectionSourceId(sourceNodeId);
    connectionDragRef.current = {
      pointerId,
      sourceNodeId,
      startX,
      startY,
      currentX: clientX,
      currentY: clientY,
      hoveredTargetId: null,
      moved: false,
    };
    pendingConnectionPreviewRef.current = {
      sourceNodeId,
      startX,
      startY,
      currentX: clientX,
      currentY: clientY,
      hoveredTargetId: null,
    };
    scheduleConnectionPreview();
  }

  function updateHoveredConnectionTarget(targetNodeId: number | null) {
    if (!connectionDragRef.current) return;
    connectionDragRef.current.hoveredTargetId = targetNodeId;
    pendingConnectionPreviewRef.current = {
      sourceNodeId: connectionDragRef.current.sourceNodeId,
      startX: connectionDragRef.current.startX,
      startY: connectionDragRef.current.startY,
      currentX: connectionDragRef.current.currentX,
      currentY: connectionDragRef.current.currentY,
      hoveredTargetId: targetNodeId,
    };
    scheduleConnectionPreview();
  }

  function finalizeConnectionDrag(pointerId: number | null) {
    if (!connectionDragRef.current || !matchesConnectionPointer(pointerId)) return false;

    const connectionDrag = connectionDragRef.current;
    const targetNodeId = connectionDrag.hoveredTargetId;
    if (
      connectionDrag.moved &&
      targetNodeId !== null &&
      Number(targetNodeId) !== Number(connectionDrag.sourceNodeId)
    ) {
      onEdgeConnect?.(connectionDrag.sourceNodeId, targetNodeId);
      selectNode(targetNodeId);
      selectEdge(null);
      suppressNextHandleClickRef.current = true;
      ignoreCanvasClickUntilRef.current = Date.now() + 180;
      setPendingConnectionSourceId(null);
    } else if (connectionDrag.moved) {
      setPendingConnectionSourceId(null);
    }

    connectionDragRef.current = null;
    clearConnectionPreview();
    return true;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isInteractive || !engine || !canvasRef.current) return;
    if (event.pointerType === "mouse") return;

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) return;
    const worldPoint = {
      x: viewport.x + canvasPoint.screenX / viewport.zoom,
      y: viewport.y + canvasPoint.screenY / viewport.zoom,
    };
    const hitNodeId = engine.hitTest(worldPoint);
    const node = hitNodeId === null ? null : (nodeById.get(Number(hitNodeId)) ?? null);

    if (node && onNodePositionChange) {
      startNodeDrag(node, event.clientX, event.clientY, event.pointerId, event.shiftKey);
      return;
    }

    if (event.shiftKey && onNodeSelectionBoxChange) {
      startSelectionDrag(event.clientX, event.clientY, event.shiftKey, event.pointerId);
      return;
    }

    if (onViewportChange) {
      startPanDrag(event.clientX, event.clientY, event.pointerId);
    }
  }

  function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!isInteractive || !engine || !canvasRef.current || event.button !== 0) return;

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) return;
    const worldPoint = {
      x: viewport.x + canvasPoint.screenX / viewport.zoom,
      y: viewport.y + canvasPoint.screenY / viewport.zoom,
    };
    const hitNodeId = engine.hitTest(worldPoint);
    const node = hitNodeId === null ? null : (nodeById.get(Number(hitNodeId)) ?? null);

    if (node && onNodePositionChange) {
      startNodeDrag(node, event.clientX, event.clientY, null, event.shiftKey);
      return;
    }

    if (onNodeSelectionBoxChange && !event.altKey) {
      startSelectionDrag(event.clientX, event.clientY, event.shiftKey);
      return;
    }

    if (onViewportChange) {
      startPanDrag(event.clientX, event.clientY);
    }
  }

  function handlePointerMove(
    event:
      | { pointerId: number | null; clientX: number; clientY: number }
      | React.PointerEvent<HTMLCanvasElement>,
  ) {
    if (connectionDragRef.current && matchesConnectionPointer(event.pointerId)) {
      const connectionDrag = connectionDragRef.current;
      connectionDrag.currentX = event.clientX;
      connectionDrag.currentY = event.clientY;
      if (
        Math.abs(connectionDrag.currentX - connectionDrag.startX) > 4 ||
        Math.abs(connectionDrag.currentY - connectionDrag.startY) > 4
      ) {
        connectionDrag.moved = true;
      }
      pendingConnectionPreviewRef.current = {
        sourceNodeId: connectionDrag.sourceNodeId,
        startX: connectionDrag.startX,
        startY: connectionDrag.startY,
        currentX: connectionDrag.currentX,
        currentY: connectionDrag.currentY,
        hoveredTargetId: connectionDrag.hoveredTargetId,
      };
      scheduleConnectionPreview();
    }

    if (!canvasRef.current || !dragStateRef.current) return;

    const dragState = dragStateRef.current;
    if (!matchesDragPointer(event.pointerId)) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const xScale = canvasRef.current.width / rect.width;
    const yScale = canvasRef.current.height / rect.height;
    const currentViewport = viewportRef.current;
    const deltaWorldX = ((event.clientX - dragState.startClientX) * xScale) / currentViewport.zoom;
    const deltaWorldY = ((event.clientY - dragState.startClientY) * yScale) / currentViewport.zoom;
    if (Math.abs(deltaWorldX) > 0.5 || Math.abs(deltaWorldY) > 0.5) {
      dragState.moved = true;
    }

    if (dragState.kind === "selection") {
      dragState.currentClientX = event.clientX;
      dragState.currentClientY = event.clientY;
      if (canvasRef.current) {
        const dragRect = canvasRef.current.getBoundingClientRect();
        setSelectionBox({
          left: Math.min(dragState.startClientX, dragState.currentClientX) - dragRect.left,
          top: Math.min(dragState.startClientY, dragState.currentClientY) - dragRect.top,
          width: Math.abs(dragState.currentClientX - dragState.startClientX),
          height: Math.abs(dragState.currentClientY - dragState.startClientY),
        });
      }
      return;
    }

    if (dragState.kind === "node" && (onNodesPositionChangeRef.current || onNodePositionChangeRef.current)) {
      pendingNodePositionsRef.current = [
        {
          nodeId: dragState.nodeId,
          nextPosition: {
            x: Math.max(0, dragState.startPosition.x + deltaWorldX),
            y: Math.max(0, dragState.startPosition.y + deltaWorldY),
          },
        },
      ];
      schedulePendingUpdates();
      return;
    }

    if (dragState.kind === "nodes" && (onNodesPositionChangeRef.current || onNodePositionChangeRef.current)) {
      pendingNodePositionsRef.current = dragState.startPositions.map(({ nodeId, position }) => ({
        nodeId,
        nextPosition: {
          x: Math.max(0, position.x + deltaWorldX),
          y: Math.max(0, position.y + deltaWorldY),
        },
      }));
      schedulePendingUpdates();
      return;
    }

    if (dragState.kind === "edge" && onEdgeBendChangeRef.current) {
      pendingEdgeBendRef.current = {
        edgeId: dragState.edgeId,
        nextBend: {
          x: Math.max(0, dragState.startBend.x + deltaWorldX),
          y: Math.max(0, dragState.startBend.y + deltaWorldY),
        },
      };
      schedulePendingUpdates();
      return;
    }

    if (dragState.kind === "pan" && onViewportChangeRef.current) {
      pendingViewportRef.current = {
        ...dragState.startViewport,
        x: Math.max(0, dragState.startViewport.x - deltaWorldX),
        y: Math.max(0, dragState.startViewport.y - deltaWorldY),
      };
      schedulePendingUpdates();
    }
  }

  function handlePointerEnd(event: { pointerId: number | null } | React.PointerEvent<HTMLCanvasElement>) {
    if (finalizeConnectionDrag(event.pointerId)) {
      return;
    }
    if (!dragStateRef.current) return;
    if (!matchesDragPointer(event.pointerId)) return;
    if (dragStateRef.current.kind === "selection" && dragStateRef.current.moved && canvasRef.current && onNodeSelectionBoxChange) {
      const rect = canvasRef.current.getBoundingClientRect();
      const selectionLeft = Math.min(dragStateRef.current.startClientX, dragStateRef.current.currentClientX) - rect.left;
      const selectionTop = Math.min(dragStateRef.current.startClientY, dragStateRef.current.currentClientY) - rect.top;
      const selectionRight = Math.max(dragStateRef.current.startClientX, dragStateRef.current.currentClientX) - rect.left;
      const selectionBottom = Math.max(dragStateRef.current.startClientY, dragStateRef.current.currentClientY) - rect.top;

      const selectedIds = nodes
        .filter((node) => {
          const nodeLeft = (node.position.x - viewportRef.current.x) * viewportRef.current.zoom;
          const nodeTop = (node.position.y - viewportRef.current.y) * viewportRef.current.zoom;
          const nodeRight = nodeLeft + node.size.width * viewportRef.current.zoom;
          const nodeBottom = nodeTop + node.size.height * viewportRef.current.zoom;
          return nodeLeft < selectionRight && nodeRight > selectionLeft && nodeTop < selectionBottom && nodeBottom > selectionTop;
        })
        .map((node) => Number(node.id));

      onNodeSelectionBoxChange(selectedIds, {
        additive: dragStateRef.current.additive,
      });
    }
    if (dragStateRef.current.moved) {
      ignoreCanvasClickUntilRef.current = Date.now() + 180;
    }
    flushPendingUpdates();
    setSelectionBox(null);
    dragStateRef.current = null;
  }

  function handleMouseMove(event: MouseEvent) {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== null) return;
    handlePointerMove({
      pointerId: null,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  function handleMouseEnd() {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== null) return;
    handlePointerEnd({ pointerId: null });
  }

  useEffect(() => {
    if (!isInteractive) return;

    const handleWindowPointerMove = (event: PointerEvent) => {
      handlePointerMove(event);
    };

    const handleWindowPointerEnd = (event: PointerEvent) => {
      handlePointerEnd(event);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseEnd);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseEnd);
    };
  }, [isInteractive]);

  useEffect(
    () => () => {
      if (scheduledFrameRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(scheduledFrameRef.current);
      }
      if (connectionPreviewFrameRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(connectionPreviewFrameRef.current);
      }
    },
    [],
  );

  const renderedCustomNodes = useMemo(() => {
    if (!nodeRenderers || !getNodeRendererKey) return [];

    return visibleBoxes
      .map((box) => {
        const node = nodeById.get(Number(box.id));
        if (!node) return null;
        const rendererKey = getNodeRendererKey(node);
        if (!rendererKey) return null;
        const Renderer = nodeRenderers[rendererKey];
        if (!Renderer) return null;
        const numericNodeId = Number(node.id);
        const isDragging = activeDragNodeIdsSet.has(numericNodeId);
        const isSelected = selectedNodeIdsSet.has(numericNodeId);
        const layerPriority = isDragging ? 2 : isSelected ? 1 : 0;

        return {
          box,
          node,
          Renderer,
          data: getNodeRendererData?.(node),
          screenX: (box.x - viewport.x) * viewport.zoom,
          screenY: (box.y - viewport.y) * viewport.zoom,
          screenWidth: box.width * viewport.zoom,
          screenHeight: box.height * viewport.zoom,
          isDragging,
          isSelected,
          layerPriority,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.layerPriority !== right.layerPriority) {
          return left.layerPriority - right.layerPriority;
        }
        return Number(left.node.id) - Number(right.node.id);
      }) as Array<{
      box: VisibleBox;
      node: PocNode;
      Renderer: React.ComponentType<HyperFlowPocNodeRendererProps<any>>;
      data: unknown;
      screenX: number;
      screenY: number;
      screenWidth: number;
      screenHeight: number;
      isDragging: boolean;
      isSelected: boolean;
      layerPriority: number;
    }>;
  }, [
    activeDragNodeIdsSet,
    getNodeRendererData,
    getNodeRendererKey,
    nodeById,
    nodeRenderers,
    selectedNodeIdsSet,
    viewport.x,
    viewport.y,
    viewport.zoom,
    visibleBoxes,
  ]);

  const connectedNodeMaps = useMemo(() => {
    const incomingByNodeId = new Map<number, PocNode[]>();
    const outgoingByNodeId = new Map<number, PocNode[]>();

    edges.forEach((edge) => {
      const sourceNode = nodeById.get(Number(edge.source));
      const targetNode = nodeById.get(Number(edge.target));
      if (!sourceNode || !targetNode) return;

      const sourceId = Number(sourceNode.id);
      const targetId = Number(targetNode.id);
      outgoingByNodeId.set(sourceId, [...(outgoingByNodeId.get(sourceId) ?? []), targetNode]);
      incomingByNodeId.set(targetId, [...(incomingByNodeId.get(targetId) ?? []), sourceNode]);
    });

    return { incomingByNodeId, outgoingByNodeId };
  }, [edges, nodeById]);

  function averageConnectedCenter(connectedNodes: PocNode[]) {
    if (connectedNodes.length === 0) return null;
    const totals = connectedNodes.reduce(
      (sum, connectedNode) => {
        const center = getNodeCenter(connectedNode);
        return { x: sum.x + center.x, y: sum.y + center.y };
      },
      { x: 0, y: 0 },
    );
    return {
      x: totals.x / connectedNodes.length,
      y: totals.y / connectedNodes.length,
    };
  }

  function getResolvedNodeAnchors(node: PocNode) {
    const center = getNodeCenter(node);
    const outputToward =
      pendingConnectionSourceId === Number(node.id) && connectionPreview
        ? {
            x: viewport.x + connectionPreview.currentX / viewport.zoom,
            y: viewport.y + connectionPreview.currentY / viewport.zoom,
          }
        : averageConnectedCenter(connectedNodeMaps.outgoingByNodeId.get(Number(node.id)) ?? []) ?? {
            x: center.x + 1,
            y: center.y,
          };
    const inputToward = averageConnectedCenter(connectedNodeMaps.incomingByNodeId.get(Number(node.id)) ?? []) ?? {
      x: center.x - 1,
      y: center.y,
    };

    let inputAnchor = getNodeAnchorPoint(node, inputToward);
    let outputAnchor = getNodeAnchorPoint(node, outputToward);
    if (inputAnchor.side === outputAnchor.side) {
      inputAnchor = getOrthogonalAnchorPoint(node, inputAnchor.side, inputToward);
      outputAnchor = offsetAnchorWithinSide(outputAnchor, node, 18);
    }

    return { inputAnchor, outputAnchor };
  }

  const renderedEdges = useMemo(() => {
    const nodeAnchorsById = new Map<
      number,
      {
        inputAnchor: ReturnType<typeof getResolvedNodeAnchors>["inputAnchor"];
        outputAnchor: ReturnType<typeof getResolvedNodeAnchors>["outputAnchor"];
      }
    >();
    nodes.forEach((node) => {
      nodeAnchorsById.set(Number(node.id), getResolvedNodeAnchors(node));
    });

    const sourceSpreadByEdgeId = new Map<string, number>();
    const targetSpreadByEdgeId = new Map<string, number>();
    const spreadStep = 18;

    const edgePositionMetric = (node: PocNode, side: AnchorSide) => {
      const center = getNodeCenter(node);
      return side === "left" || side === "right" ? center.y : center.x;
    };

    const getCenteredSpread = (index: number, count: number) => (index - (count - 1) / 2) * spreadStep;

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
          sourceSpreadByEdgeId.set(edge.id, getCenteredSpread(index, ordered.length));
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
          targetSpreadByEdgeId.set(edge.id, getCenteredSpread(index, ordered.length));
        });
    });

    return edges
      .map((edge) => {
        const sourceNode = nodeById.get(Number(edge.source));
        const targetNode = nodeById.get(Number(edge.target));
        if (!sourceNode || !targetNode) return null;

        const sourceCenter = getNodeCenter(sourceNode);
        const targetCenter = getNodeCenter(targetNode);
        const defaultBendWorldX = (sourceCenter.x + targetCenter.x) / 2;
        const defaultBendWorldY = (sourceCenter.y + targetCenter.y) / 2;
        const bendWorldX = defaultBendWorldX + (edge.bend?.x ?? 0);
        const bendWorldY = defaultBendWorldY + (edge.bend?.y ?? 0);
        const sourceAnchor = nodeAnchorsById.get(Number(sourceNode.id))?.outputAnchor;
        const targetAnchor = nodeAnchorsById.get(Number(targetNode.id))?.inputAnchor;
        if (!sourceAnchor || !targetAnchor) return null;
        const sourceX = (sourceAnchor.x - viewport.x) * viewport.zoom;
        const sourceY = (sourceAnchor.y - viewport.y) * viewport.zoom;
        const targetX = (targetAnchor.x - viewport.x) * viewport.zoom;
        const targetY = (targetAnchor.y - viewport.y) * viewport.zoom;
        const bendOffsetX = edge.bend ? edge.bend.x * viewport.zoom : null;
        const bendOffsetY = edge.bend ? edge.bend.y * viewport.zoom : null;
        const path = buildSmoothEdgePath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourceSide: sourceAnchor.side,
          targetSide: targetAnchor.side,
          sourceSpread: (sourceSpreadByEdgeId.get(edge.id) ?? 0) * viewport.zoom,
          targetSpread: (targetSpreadByEdgeId.get(edge.id) ?? 0) * viewport.zoom,
          bendOffsetX,
          bendOffsetY,
        });

        return {
          id: edge.id,
          path,
          bendOffsetWorldX: edge.bend?.x ?? 0,
          bendOffsetWorldY: edge.bend?.y ?? 0,
          bendWorldX,
          bendWorldY,
          hasBend: Boolean(edge.bend),
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      path: string;
      bendOffsetWorldX: number;
      bendOffsetWorldY: number;
      bendWorldX: number;
      bendWorldY: number;
      hasBend: boolean;
    }>;
  }, [edges, nodeById, viewport.x, viewport.y, viewport.zoom, connectedNodeMaps, connectionPreview, pendingConnectionSourceId]);

  const renderedHandles = useMemo(() => {
    if (!onEdgeConnect) return [];

    return nodes.map((node) => {
      const { inputAnchor, outputAnchor } = getResolvedNodeAnchors(node);

      return {
        id: node.id,
        inputX: (inputAnchor.x - viewport.x) * viewport.zoom - HANDLE_HALF,
        inputY: (inputAnchor.y - viewport.y) * viewport.zoom - HANDLE_HALF,
        outputX: (outputAnchor.x - viewport.x) * viewport.zoom - HANDLE_HALF,
        outputY: (outputAnchor.y - viewport.y) * viewport.zoom - HANDLE_HALF,
        isActive:
          pendingConnectionSourceId !== null ||
          connectionPreview !== null ||
          activeDragNodeIdsSet.has(Number(node.id)) ||
          selectedNodeIdsSet.has(Number(node.id)) ||
          Number(pendingConnectionSourceId) === Number(node.id),
      };
    });
  }, [
    activeDragNodeIdsSet,
    connectionPreview,
    nodes,
    onEdgeConnect,
    pendingConnectionSourceId,
    selectedNodeIdsSet,
    viewport.x,
    viewport.y,
    viewport.zoom,
  ]);

  function handleHandleClick(role: "source" | "target", nodeId: number) {
    if (!onEdgeConnect) return;

    if (role === "source") {
      selectNode(nodeId);
      selectEdge(null);
      setPendingConnectionSourceId((current) => (Number(current) === Number(nodeId) ? null : nodeId));
      return;
    }

    if (pendingConnectionSourceId === null) return;
    if (Number(pendingConnectionSourceId) === Number(nodeId)) {
      setPendingConnectionSourceId(null);
      return;
    }

    onEdgeConnect(pendingConnectionSourceId, nodeId);
    selectNode(nodeId);
    selectEdge(null);
    setPendingConnectionSourceId(null);
  }

  return (
    <div className={className} data-interactive={isInteractive ? "true" : "false"}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onMouseDown={handleMouseDown}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: isInteractive ? "grab" : "default",
          touchAction: "none",
        }}
      />

      {renderedEdges.length > 0 || connectionPreview ? (
        <svg className="hf-edge-overlay" width={width} height={height}>
          {renderedEdges.map((edge) => (
            <g
              key={edge.id}
              className={
                selectedEdgeId === edge.id
                  ? "hf-edge-overlay-item hf-edge-overlay-item-selected"
                  : "hf-edge-overlay-item"
              }
            >
              <path
                d={edge.path}
                className="hf-edge-overlay-hit"
                data-edge-id={edge.id}
                role="button"
                aria-label={`Select edge ${edge.id}`}
                tabIndex={0}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectNode(null);
                  selectEdge(edge.id, { additive: event.shiftKey });
                  if (!isInteractive || !onEdgeBendChange) return;
                  startEdgeDrag(edge.id, event.clientX, event.clientY, { x: edge.bendOffsetWorldX, y: edge.bendOffsetWorldY }, event.pointerId);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectNode(null);
                  selectEdge(edge.id, { additive: event.shiftKey });
                  if (!isInteractive || !onEdgeBendChange || event.button !== 0) return;
                  startEdgeDrag(edge.id, event.clientX, event.clientY, { x: edge.bendOffsetWorldX, y: edge.bendOffsetWorldY });
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  selectNode(null);
                  selectEdge(edge.id, { additive: event.shiftKey });
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectNode(null);
                  selectEdge(edge.id, { additive: event.shiftKey });
                  if (edge.hasBend) onEdgeBendChange?.(edge.id, null);
                }}
              />
              <path
                d={edge.path}
                className={
                  selectedEdgeId === edge.id
                    ? "hf-edge-overlay-path hf-edge-overlay-path-selected"
                    : "hf-edge-overlay-path"
                }
                aria-hidden="true"
              />
            </g>
          ))}
          {connectionPreview ? (
            <path
              d={buildSmoothEdgePath({
                sourceX: connectionPreview.startX,
                sourceY: connectionPreview.startY,
                targetX: connectionPreview.currentX,
                targetY: connectionPreview.currentY,
                sourceSide: connectionPreview.currentX >= connectionPreview.startX ? "right" : "left",
                targetSide: connectionPreview.currentX >= connectionPreview.startX ? "left" : "right",
              })}
              className="hf-edge-overlay-path hf-edge-overlay-path-preview"
              aria-hidden="true"
            />
          ) : null}
        </svg>
      ) : null}

      {renderedHandles.length > 0 ? (
        <>
          <div className="hf-handle-overlay hf-handle-overlay-under">
            {renderedHandles
              .filter((handle) => !handle.isActive)
              .map((handle) => (
                <Fragment key={`under-${handle.id}`}>
                  <button
                    type="button"
                    className="hf-node-handle hf-node-handle-input"
                    style={{ left: `${handle.inputX}px`, top: `${handle.inputY}px` }}
                    aria-label={`Connect into node ${handle.id}`}
                    onPointerEnter={() => {
                      if (!connectionDragRef.current) return;
                      if (Number(connectionDragRef.current.sourceNodeId) === Number(handle.id)) return;
                      updateHoveredConnectionTarget(handle.id);
                    }}
                    onPointerLeave={() => {
                      if (!connectionDragRef.current) return;
                      if (Number(connectionDragRef.current.hoveredTargetId) !== Number(handle.id)) return;
                      updateHoveredConnectionTarget(null);
                    }}
                    onPointerUp={(event) => {
                      if (!connectionDragRef.current) return;
                      event.preventDefault();
                      event.stopPropagation();
                      if (Number(connectionDragRef.current.sourceNodeId) === Number(handle.id)) {
                        finalizeConnectionDrag(event.pointerId);
                        return;
                      }
                      updateHoveredConnectionTarget(handle.id);
                      finalizeConnectionDrag(event.pointerId);
                    }}
                    onClick={(event) => {
                      if (suppressNextHandleClickRef.current) {
                        suppressNextHandleClickRef.current = false;
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      event.stopPropagation();
                      handleHandleClick("target", handle.id);
                    }}
                  />
                  <button
                    type="button"
                    className={
                      Number(pendingConnectionSourceId) === Number(handle.id)
                        ? "hf-node-handle hf-node-handle-output hf-node-handle-active"
                        : "hf-node-handle hf-node-handle-output"
                    }
                    style={{ left: `${handle.outputX}px`, top: `${handle.outputY}px` }}
                    aria-label={`Connect from node ${handle.id}`}
                    onPointerDown={(event) => {
                      if (!isInteractive || !onEdgeConnect) return;
                      event.preventDefault();
                      event.stopPropagation();
                      startConnectionDrag(
                        handle.id,
                        handle.outputX + HANDLE_HALF,
                        handle.outputY + HANDLE_HALF,
                        event.clientX,
                        event.clientY,
                        event.pointerId,
                      );
                    }}
                    onClick={(event) => {
                      if (suppressNextHandleClickRef.current) {
                        suppressNextHandleClickRef.current = false;
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      event.stopPropagation();
                      handleHandleClick("source", handle.id);
                    }}
                  />
                </Fragment>
              ))}
          </div>
          <div className="hf-handle-overlay hf-handle-overlay-over">
            {renderedHandles
              .filter((handle) => handle.isActive)
              .map((handle) => (
            <Fragment key={handle.id}>
              <button
                type="button"
                className="hf-node-handle hf-node-handle-input"
                style={{ left: `${handle.inputX}px`, top: `${handle.inputY}px` }}
                aria-label={`Connect into node ${handle.id}`}
                onPointerEnter={() => {
                  if (!connectionDragRef.current) return;
                  if (Number(connectionDragRef.current.sourceNodeId) === Number(handle.id)) return;
                  updateHoveredConnectionTarget(handle.id);
                }}
                onPointerLeave={() => {
                  if (!connectionDragRef.current) return;
                  if (Number(connectionDragRef.current.hoveredTargetId) !== Number(handle.id)) return;
                  updateHoveredConnectionTarget(null);
                }}
                onPointerUp={(event) => {
                  if (!connectionDragRef.current) return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (Number(connectionDragRef.current.sourceNodeId) === Number(handle.id)) {
                    finalizeConnectionDrag(event.pointerId);
                    return;
                  }
                  updateHoveredConnectionTarget(handle.id);
                  finalizeConnectionDrag(event.pointerId);
                }}
                onClick={(event) => {
                  if (suppressNextHandleClickRef.current) {
                    suppressNextHandleClickRef.current = false;
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  event.stopPropagation();
                  handleHandleClick("target", handle.id);
                }}
              />
              <button
                type="button"
                className={
                  Number(pendingConnectionSourceId) === Number(handle.id)
                    ? "hf-node-handle hf-node-handle-output hf-node-handle-active"
                    : "hf-node-handle hf-node-handle-output"
                }
                style={{ left: `${handle.outputX}px`, top: `${handle.outputY}px` }}
                aria-label={`Connect from node ${handle.id}`}
                onPointerDown={(event) => {
                  if (!isInteractive || !onEdgeConnect) return;
                  event.preventDefault();
                  event.stopPropagation();
                  startConnectionDrag(
                    handle.id,
                    handle.outputX + HANDLE_HALF,
                    handle.outputY + HANDLE_HALF,
                    event.clientX,
                    event.clientY,
                    event.pointerId,
                  );
                }}
                onClick={(event) => {
                  if (suppressNextHandleClickRef.current) {
                    suppressNextHandleClickRef.current = false;
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  event.stopPropagation();
                  handleHandleClick("source", handle.id);
                }}
              />
            </Fragment>
            ))}
          </div>
        </>
      ) : null}

      {renderedCustomNodes.length > 0 ? (
        <div className="hf-node-overlay">
          {renderedCustomNodes.map(
            ({ box, node, Renderer, data, screenX, screenY, screenWidth, screenHeight, layerPriority }) => (
            <div
              key={node.id}
              className="hf-node-overlay-item"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
                zIndex: layerPriority + 1,
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (isInteractive && onNodePositionChange) return;
                selectNode(node.id, { additive: event.shiftKey });
                selectEdge(null);
              }}
              onPointerDown={(event) => handleNodeOverlayPointerDown(event, node)}
              onMouseDown={(event) => handleNodeOverlayMouseDown(event, node)}
            >
              <Renderer
                node={node}
                box={box}
                data={data}
                selected={selectedNodeIdsSet.has(Number(node.id))}
                viewport={viewport}
                screenX={screenX}
                screenY={screenY}
                screenWidth={screenWidth}
                screenHeight={screenHeight}
                onSelect={() => selectNode(node.id)}
              />
            </div>
            ),
          )}
        </div>
      ) : null}

      {selectionBox ? (
        <div
          className="hf-selection-box"
          style={{
            left: `${selectionBox.left}px`,
            top: `${selectionBox.top}px`,
            width: `${selectionBox.width}px`,
            height: `${selectionBox.height}px`,
          }}
        />
      ) : null}

      {error ? <div className="hf-canvas-error">{error}</div> : null}
    </div>
  );
}
