import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPocSvgCurvePath,
  buildSmoothPocEdgePath,
  createPocEngine,
  getPocNodeCenter,
  offsetPocAnchorWithinSide,
  projectPocNodesToRuntimeNodes,
  resolvePocEdgeAnchorsBatch,
  resolvePocRenderableEdgesBatch,
  resolvePocNodeAnchors,
  type PocEngine,
  type PocEdge,
  type PocMetrics,
  type PocAnchorSide,
  type PocNode,
  type PocResolvedEdgeAnchors,
  type PocResolvedNodeAnchors,
  type PocViewport,
  type VisibleBox,
} from "@hyperflow/sdk";
import { isInteractiveCanvasMode, type HyperFlowCanvasMode } from "./starter";

const HANDLE_SIZE = 18;
const HANDLE_HALF = HANDLE_SIZE / 2;
const EDGE_ENDPOINT_SIZE = 24;
const EDGE_ENDPOINT_HALF = EDGE_ENDPOINT_SIZE / 2;

type ConnectionPreviewState = {
  kind: "connect" | "reconnect-source" | "reconnect-target";
  edgeId: string | null;
  draggedNodeId: number;
  fixedNodeId: number | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  hoveredNodeId: number | null;
};

function resolvePreviewAnchorSide(from: { x: number; y: number }, toward: { x: number; y: number }): PocAnchorSide {
  const deltaX = toward.x - from.x;
  const deltaY = toward.y - from.y;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left";
  }
  return deltaY >= 0 ? "bottom" : "top";
}

function resolveComplementaryPreviewSide(side: PocAnchorSide): PocAnchorSide {
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

function isHorizontalPreviewSide(side: PocAnchorSide) {
  return side === "left" || side === "right";
}

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
  engine?: PocEngine | null;
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
  getNodeAnchorPreferences?: (
    node: PocNode,
  ) => {
    preferredInputSide?: PocAnchorSide;
    preferredOutputSide?: PocAnchorSide;
  };
  onNodeSelect?: (nodeId: number | null, options?: { additive?: boolean }) => void;
  onNodeSelectionBoxChange?: (nodeIds: number[], options?: { additive?: boolean }) => void;
  onEdgeSelect?: (edgeId: string | null, options?: { additive?: boolean }) => void;
  onNodePositionChange?: (nodeId: number, nextPosition: PocNode["position"]) => void;
  onNodesPositionChange?: (updates: Array<{ nodeId: number; nextPosition: PocNode["position"] }>) => void;
  onViewportChange?: (viewport: PocViewport) => void;
  onEdgeConnect?: (sourceNodeId: number, targetNodeId: number) => void;
  onEdgeReconnect?: (edgeId: string, next: { sourceNodeId?: number; targetNodeId?: number }) => void;
  onEdgeBendChange?: (edgeId: string, nextBend: PocEdge["bend"]) => void;
  onMetricsChange?: (metrics: PocMetrics) => void;
  onReadyChange?: (ready: boolean) => void;
};

function areVisibleBoxesEquivalent(left: VisibleBox[], right: VisibleBox[]) {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftBox = left[index];
    const rightBox = right[index];
    if (
      Number(leftBox.id) !== Number(rightBox.id) ||
      leftBox.x !== rightBox.x ||
      leftBox.y !== rightBox.y ||
      leftBox.width !== rightBox.width ||
      leftBox.height !== rightBox.height
    ) {
      return false;
    }
  }
  return true;
}

export const HyperFlowPocCanvas = memo(function HyperFlowPocCanvas({
  engine: providedEngine = null,
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
  getNodeAnchorPreferences,
  onNodeSelect,
  onNodeSelectionBoxChange,
  onEdgeSelect,
  onNodePositionChange,
  onNodesPositionChange,
  onViewportChange,
  onEdgeConnect,
  onEdgeReconnect,
  onEdgeBendChange,
  onMetricsChange,
  onReadyChange,
}: HyperFlowPocCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalEngine, setInternalEngine] = useState<PocEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleBoxes, setVisibleBoxes] = useState<VisibleBox[]>([]);
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<number | null>(null);
  const [connectionPreview, setConnectionPreview] = useState<ConnectionPreviewState | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const isInteractive = interactive ?? isInteractiveCanvasMode(mode);
  const engine = providedEngine ?? internalEngine;
  const viewportRef = useRef(viewport);
  const onNodePositionChangeRef = useRef(onNodePositionChange);
  const onNodesPositionChangeRef = useRef(onNodesPositionChange);
  const onViewportChangeRef = useRef(onViewportChange);
  const onEdgeBendChangeRef = useRef(onEdgeBendChange);
  const onMetricsChangeRef = useRef(onMetricsChange);
  const ignoreCanvasClickUntilRef = useRef(0);
  const scheduledFrameRef = useRef<number | null>(null);
  const connectionPreviewFrameRef = useRef<number | null>(null);
  const pendingNodePositionsRef = useRef<Array<{ nodeId: number; nextPosition: PocNode["position"] }> | null>(null);
  const pendingViewportRef = useRef<PocViewport | null>(null);
  const pendingEdgeBendRef = useRef<{ edgeId: string; nextBend: PocEdge["bend"] } | null>(null);
  const pendingConnectionPreviewRef = useRef<ConnectionPreviewState | null>(null);
  const suppressNextHandleClickRef = useRef(false);
  const connectionDragRef = useRef<
    | null
    | {
        pointerId: number | null;
        kind: "connect" | "reconnect-source" | "reconnect-target";
        edgeId: string | null;
        draggedNodeId: number;
        fixedNodeId: number | null;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        hoveredNodeId: number | null;
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
  const connectionPreviewWorldPoint = useMemo(
    () =>
      connectionPreview
        ? {
            x: viewport.x + connectionPreview.currentX / viewport.zoom,
            y: viewport.y + connectionPreview.currentY / viewport.zoom,
          }
        : null,
    [connectionPreview, viewport.x, viewport.y, viewport.zoom],
  );

  useEffect(() => {
    viewportRef.current = viewport;
    onNodePositionChangeRef.current = onNodePositionChange;
    onNodesPositionChangeRef.current = onNodesPositionChange;
    onViewportChangeRef.current = onViewportChange;
    onEdgeBendChangeRef.current = onEdgeBendChange;
    onMetricsChangeRef.current = onMetricsChange;
  }, [onEdgeBendChange, onMetricsChange, onNodePositionChange, onNodesPositionChange, onViewportChange, viewport]);

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
    return getCanvasScreenPointFromClientPoint(event.clientX, event.clientY);
  }

  function getCanvasScreenPointFromClientPoint(clientX: number, clientY: number) {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      screenX: (clientX - rect.left) * (canvasRef.current.width / rect.width),
      screenY: (clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  }

  useEffect(() => {
    if (providedEngine) {
      setError(null);
      onReadyChange?.(true);
      return;
    }

    let cancelled = false;

    createPocEngine()
      .then((instance) => {
        if (cancelled) return;
        setInternalEngine(instance);
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
  }, [onReadyChange, providedEngine]);

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

    setVisibleBoxes((previousBoxes) => (areVisibleBoxesEquivalent(previousBoxes, boxes) ? previousBoxes : boxes));
    onMetricsChangeRef.current?.(metrics);
  }, [engine, hasCustomNodeRendering, height, nodes, selectedNodeId, viewport, width]);

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
    options: {
      kind: "connect" | "reconnect-source" | "reconnect-target";
      edgeId?: string | null;
      draggedNodeId: number;
      fixedNodeId?: number | null;
      startX: number;
      startY: number;
      clientX: number;
      clientY: number;
      pointerId: number | null;
    },
  ) {
    const initialCanvasPoint = getCanvasScreenPointFromClientPoint(options.clientX, options.clientY);
    const currentX = initialCanvasPoint?.screenX ?? options.startX;
    const currentY = initialCanvasPoint?.screenY ?? options.startY;
    if (options.kind === "connect") {
      setPendingConnectionSourceId(options.draggedNodeId);
    } else {
      setPendingConnectionSourceId(null);
    }
    connectionDragRef.current = {
      pointerId: options.pointerId,
      kind: options.kind,
      edgeId: options.edgeId ?? null,
      draggedNodeId: options.draggedNodeId,
      fixedNodeId: options.fixedNodeId ?? null,
      startX: options.startX,
      startY: options.startY,
      currentX,
      currentY,
      hoveredNodeId: null,
      moved: false,
    };
    pendingConnectionPreviewRef.current = {
      kind: options.kind,
      edgeId: options.edgeId ?? null,
      draggedNodeId: options.draggedNodeId,
      fixedNodeId: options.fixedNodeId ?? null,
      startX: options.startX,
      startY: options.startY,
      currentX,
      currentY,
      hoveredNodeId: null,
    };
    scheduleConnectionPreview();
  }

  function connectionDragAcceptsRole(role: "source" | "target") {
    if (!connectionDragRef.current) return false;
    if (connectionDragRef.current.kind === "connect") return role === "target";
    if (connectionDragRef.current.kind === "reconnect-target") return role === "target";
    return role === "source";
  }

  function isCompatibleConnectionTarget(nodeId: number) {
    if (!connectionDragRef.current) return false;
    if (connectionDragRef.current.kind === "connect") {
      return Number(connectionDragRef.current.draggedNodeId) !== Number(nodeId);
    }
    if (connectionDragRef.current.kind === "reconnect-target") {
      return Number(connectionDragRef.current.fixedNodeId) !== Number(nodeId);
    }
    return Number(connectionDragRef.current.fixedNodeId) !== Number(nodeId);
  }

  function updateHoveredConnectionTarget(targetNodeId: number | null) {
    if (!connectionDragRef.current) return;
    const nextNodeId =
      targetNodeId !== null && isCompatibleConnectionTarget(targetNodeId) ? targetNodeId : null;
    connectionDragRef.current.hoveredNodeId = nextNodeId;
    pendingConnectionPreviewRef.current = {
      kind: connectionDragRef.current.kind,
      edgeId: connectionDragRef.current.edgeId,
      draggedNodeId: connectionDragRef.current.draggedNodeId,
      fixedNodeId: connectionDragRef.current.fixedNodeId,
      startX: connectionDragRef.current.startX,
      startY: connectionDragRef.current.startY,
      currentX: connectionDragRef.current.currentX,
      currentY: connectionDragRef.current.currentY,
      hoveredNodeId: nextNodeId,
    };
    scheduleConnectionPreview();
  }

  function finalizeConnectionDrag(pointerId: number | null) {
    if (!connectionDragRef.current || !matchesConnectionPointer(pointerId)) return false;

    const connectionDrag = connectionDragRef.current;
    let targetNodeId = connectionDrag.hoveredNodeId;
    if (targetNodeId === null && engine && canvasRef.current) {
      const { width, height } = canvasRef.current;
      const screenX = connectionDrag.currentX;
      const screenY = connectionDrag.currentY;
      if (screenX >= 0 && screenY >= 0 && screenX <= width && screenY <= height) {
        const worldPoint = {
          x: viewportRef.current.x + screenX / viewportRef.current.zoom,
          y: viewportRef.current.y + screenY / viewportRef.current.zoom,
        };
        const hitNodeId = engine.hitTest(worldPoint);
        if (hitNodeId !== null && isCompatibleConnectionTarget(hitNodeId)) {
          targetNodeId = hitNodeId;
        }
      }
    }
    if (targetNodeId !== null) {
      if (connectionDrag.kind === "connect") {
        onEdgeConnect?.(connectionDrag.draggedNodeId, targetNodeId);
        selectNode(targetNodeId);
        selectEdge(null);
      } else if (connectionDrag.kind === "reconnect-target" && connectionDrag.edgeId && onEdgeReconnect) {
        onEdgeReconnect(connectionDrag.edgeId, { targetNodeId });
        selectNode(null);
        selectEdge(connectionDrag.edgeId);
      } else if (connectionDrag.kind === "reconnect-source" && connectionDrag.edgeId && onEdgeReconnect) {
        onEdgeReconnect(connectionDrag.edgeId, { sourceNodeId: targetNodeId });
        selectNode(null);
        selectEdge(connectionDrag.edgeId);
      }
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

    if (event.shiftKey && onNodeSelectionBoxChange) {
      startSelectionDrag(event.clientX, event.clientY, true);
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
      const canvasPoint = getCanvasScreenPointFromClientPoint(event.clientX, event.clientY);
      if (canvasPoint) {
        connectionDrag.currentX = canvasPoint.screenX;
        connectionDrag.currentY = canvasPoint.screenY;
      }
      if (
        Math.abs(connectionDrag.currentX - connectionDrag.startX) > 4 ||
        Math.abs(connectionDrag.currentY - connectionDrag.startY) > 4
      ) {
        connectionDrag.moved = true;
      }
      if (engine && canvasRef.current) {
        if (canvasPoint) {
          const withinCanvas =
            canvasPoint.screenX >= 0 &&
            canvasPoint.screenY >= 0 &&
            canvasPoint.screenX <= canvasRef.current.width &&
            canvasPoint.screenY <= canvasRef.current.height;
          const hoveredNodeId = withinCanvas
            ? engine.hitTest({
                x: viewportRef.current.x + canvasPoint.screenX / viewportRef.current.zoom,
                y: viewportRef.current.y + canvasPoint.screenY / viewportRef.current.zoom,
              })
            : null;
          connectionDrag.hoveredNodeId =
            hoveredNodeId !== null && isCompatibleConnectionTarget(hoveredNodeId) ? hoveredNodeId : null;
        } else {
          connectionDrag.hoveredNodeId = null;
        }
      }
      pendingConnectionPreviewRef.current = {
        kind: connectionDrag.kind,
        edgeId: connectionDrag.edgeId,
        draggedNodeId: connectionDrag.draggedNodeId,
        fixedNodeId: connectionDrag.fixedNodeId,
        startX: connectionDrag.startX,
        startY: connectionDrag.startY,
        currentX: connectionDrag.currentX,
        currentY: connectionDrag.currentY,
        hoveredNodeId: connectionDrag.hoveredNodeId,
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

  const worldRenderedCustomNodes = useMemo(() => {
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
    visibleBoxes,
  ]);

  const renderedCustomNodes = useMemo(
    () =>
      worldRenderedCustomNodes.map((entry) => ({
        ...entry,
        screenX: (entry.box.x - viewport.x) * viewport.zoom,
        screenY: (entry.box.y - viewport.y) * viewport.zoom,
        screenWidth: entry.box.width * viewport.zoom,
        screenHeight: entry.box.height * viewport.zoom,
      })),
    [viewport.x, viewport.y, viewport.zoom, worldRenderedCustomNodes],
  );

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
        const center = getPocNodeCenter(connectedNode);
        return { x: sum.x + center.x, y: sum.y + center.y };
      },
      { x: 0, y: 0 },
    );
    return {
      x: totals.x / connectedNodes.length,
      y: totals.y / connectedNodes.length,
    };
  }

  const resolvedNodeAnchorsById = useMemo(() => {
    const requests = nodes.map((node) => {
      const center = getPocNodeCenter(node);
      const preferences = getNodeAnchorPreferences?.(node);
      const outputToward =
        pendingConnectionSourceId === Number(node.id) && connectionPreviewWorldPoint
          ? connectionPreviewWorldPoint
          : averageConnectedCenter(connectedNodeMaps.outgoingByNodeId.get(Number(node.id)) ?? []) ?? {
              x: center.x + 1,
              y: center.y,
            };
      const inputToward = averageConnectedCenter(connectedNodeMaps.incomingByNodeId.get(Number(node.id)) ?? []) ?? {
        x: center.x - 1,
        y: center.y,
      };

      return {
        nodeId: Number(node.id),
        node,
        inputToward,
        outputToward,
        preferences,
      };
    });

    const resolvedAnchors = engine
      ? engine.resolveNodeAnchorsBatch(
          requests.map(({ node, inputToward, outputToward, preferences }) => ({
            x: node.position.x,
            y: node.position.y,
            width: node.size.width,
            height: node.size.height,
            inputToward,
            outputToward,
            sameSideOffset: 18,
            preferredInputSide: preferences?.preferredInputSide,
            preferredOutputSide: preferences?.preferredOutputSide,
          })),
        )
      : requests.map(({ node, inputToward, outputToward, preferences }) =>
          resolvePocNodeAnchors(node, {
            inputToward,
            outputToward,
            sameSideOffset: 18,
            preferredInputSide: preferences?.preferredInputSide,
            preferredOutputSide: preferences?.preferredOutputSide,
          }),
        );

    return new Map<number, PocResolvedNodeAnchors>(
      requests.map(({ nodeId }, index) => [nodeId, resolvedAnchors[index] ?? null]).filter((entry): entry is [number, PocResolvedNodeAnchors] => entry[1] !== null),
    );
  }, [
    connectedNodeMaps,
    connectionPreviewWorldPoint,
    engine,
    nodes,
    pendingConnectionSourceId,
    getNodeAnchorPreferences,
  ]);

  const resolvedEdgeAnchorsById = useMemo(
    () =>
      new Map<string, PocResolvedEdgeAnchors>(
        resolvePocEdgeAnchorsBatch(
          nodes,
          edges,
          resolvedNodeAnchorsById,
          engine ? (requests) => engine.resolveEdgeAnchorsBatch(requests) : undefined,
          engine ? (requests) => engine.resolveRenderedEdgeAnchorsBatch(requests) : undefined,
        ).map((entry) => [entry.edgeId, entry] as const),
      ),
    [edges, engine, nodes, resolvedNodeAnchorsById],
  );

  const worldRenderedEdges = useMemo(() => {
    return resolvePocRenderableEdgesBatch({
      nodes,
      edges,
      resolvedEdgeAnchorsById,
      spreadStep: 18,
      minimumCurveOffset: 40 / Math.max(viewport.zoom, 0.001),
      resolveCurves: engine ? (requests) => engine.resolveEdgeCurvesBatch(requests) : undefined,
    });
  }, [edges, engine, nodes, resolvedEdgeAnchorsById, viewport.zoom]);

  const renderedEdges = useMemo(() => {
    return worldRenderedEdges.map((entry) => ({
      id: entry.id,
      worldPath: buildPocSvgCurvePath(entry.curve),
      curve: entry.curve,
      bendOffsetWorldX: entry.bendOffsetWorldX,
      bendOffsetWorldY: entry.bendOffsetWorldY,
      bendWorldX: entry.bendWorldX,
      bendWorldY: entry.bendWorldY,
      hasBend: entry.hasBend,
    })) as Array<{
      id: string;
      worldPath: string;
      curve: typeof worldRenderedEdges[number]["curve"];
      bendOffsetWorldX: number;
      bendOffsetWorldY: number;
      bendWorldX: number;
      bendWorldY: number;
      hasBend: boolean;
    }>;
  }, [worldRenderedEdges]);

  const edgeOverlayTransform = useMemo(
    () => `translate(${-viewport.x * viewport.zoom} ${-viewport.y * viewport.zoom}) scale(${viewport.zoom})`,
    [viewport.x, viewport.y, viewport.zoom],
  );

  const worldSelectedRenderedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    const renderedEdge = worldRenderedEdges.find((edge) => edge.id === selectedEdgeId) ?? null;
    const edgeRecord = edges.find((edge) => edge.id === selectedEdgeId) ?? null;
    if (!renderedEdge || !edgeRecord) return null;
    return {
      ...renderedEdge,
      sourceWorldX: renderedEdge.curve.sourceX,
      sourceWorldY: renderedEdge.curve.sourceY,
      targetWorldX: renderedEdge.curve.targetX,
      targetWorldY: renderedEdge.curve.targetY,
      sourceNodeId: Number(edgeRecord.source),
      targetNodeId: Number(edgeRecord.target),
    };
  }, [edges, selectedEdgeId, worldRenderedEdges]);

  const edgeAnchorsByNodeId = useMemo(() => {
    const incomingByNodeId = new Map<number, Array<PocResolvedEdgeAnchors["targetAnchor"]>>();
    const outgoingByNodeId = new Map<number, Array<PocResolvedEdgeAnchors["sourceAnchor"]>>();

    edges.forEach((edge) => {
      const resolved = resolvedEdgeAnchorsById.get(edge.id);
      if (!resolved) return;
      const sourceId = Number(edge.source);
      const targetId = Number(edge.target);
      outgoingByNodeId.set(sourceId, [...(outgoingByNodeId.get(sourceId) ?? []), resolved.sourceAnchor]);
      incomingByNodeId.set(targetId, [...(incomingByNodeId.get(targetId) ?? []), resolved.targetAnchor]);
    });

    return { incomingByNodeId, outgoingByNodeId };
  }, [edges, resolvedEdgeAnchorsById]);

  const worldRenderedHandles = useMemo(() => {
    if (!onEdgeConnect) return [];

    function getRepresentativeAnchor(
      anchors: Array<{ x: number; y: number; side: PocAnchorSide }>,
      fallback: { x: number; y: number; side: PocAnchorSide },
    ) {
      if (anchors.length === 0) return fallback;

      const sideCounts = anchors.reduce(
        (map, anchor) => map.set(anchor.side, (map.get(anchor.side) ?? 0) + 1),
        new Map<PocAnchorSide, number>(),
      );
      const dominantSide = [...sideCounts.entries()].sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1];
        if (left[0] === fallback.side) return -1;
        if (right[0] === fallback.side) return 1;
        return 0;
      })[0]?.[0] ?? fallback.side;
      const sameSideAnchors = anchors.filter((anchor) => anchor.side === dominantSide);
      if (sameSideAnchors.length === 0) return fallback;

      if (dominantSide === "left" || dominantSide === "right") {
        const sorted = sameSideAnchors.slice().sort((left, right) => left.y - right.y);
        return sorted[Math.floor(sorted.length / 2)] ?? fallback;
      }

      const sorted = sameSideAnchors.slice().sort((left, right) => left.x - right.x);
      return sorted[Math.floor(sorted.length / 2)] ?? fallback;
    }

    return nodes.map((node) => {
      const resolvedAnchors = resolvedNodeAnchorsById.get(Number(node.id));
      if (!resolvedAnchors) return null;
      const { inputAnchor, outputAnchor } = resolvedAnchors;
      const incomingAnchors = edgeAnchorsByNodeId.incomingByNodeId.get(Number(node.id)) ?? [];
      const outgoingAnchors = edgeAnchorsByNodeId.outgoingByNodeId.get(Number(node.id)) ?? [];
      let representativeInputAnchor = getRepresentativeAnchor(incomingAnchors, inputAnchor);
      let representativeOutputAnchor = getRepresentativeAnchor(outgoingAnchors, outputAnchor);

      const anchorsOverlap =
        representativeInputAnchor.side === representativeOutputAnchor.side &&
        Math.abs(representativeInputAnchor.x - representativeOutputAnchor.x) < 1 &&
        Math.abs(representativeInputAnchor.y - representativeOutputAnchor.y) < 1;

      if (anchorsOverlap) {
        representativeInputAnchor = offsetPocAnchorWithinSide(representativeInputAnchor, node, -14);
        representativeOutputAnchor = offsetPocAnchorWithinSide(representativeOutputAnchor, node, 14);
      }

      return {
        id: node.id,
        inputWorldX: representativeInputAnchor.x,
        inputWorldY: representativeInputAnchor.y,
        outputWorldX: representativeOutputAnchor.x,
        outputWorldY: representativeOutputAnchor.y,
        isActive:
          pendingConnectionSourceId !== null ||
          connectionPreview !== null ||
          selectedEdgeId !== null ||
          activeDragNodeIdsSet.has(Number(node.id)) ||
          selectedNodeIdsSet.has(Number(node.id)) ||
          Number(pendingConnectionSourceId) === Number(node.id),
      };
    }).filter(Boolean) as Array<{
      id: number;
      inputWorldX: number;
      inputWorldY: number;
      outputWorldX: number;
      outputWorldY: number;
      isActive: boolean;
    }>;
  }, [
    activeDragNodeIdsSet,
    connectionPreview,
    nodes,
    onEdgeConnect,
    edgeAnchorsByNodeId,
    pendingConnectionSourceId,
    resolvedNodeAnchorsById,
    selectedEdgeId,
    selectedNodeIdsSet,
  ]);

  const renderedHandles = useMemo(
    () =>
      worldRenderedHandles.map((handle) => ({
        ...handle,
        inputX: (handle.inputWorldX - viewport.x) * viewport.zoom - HANDLE_HALF,
        inputY: (handle.inputWorldY - viewport.y) * viewport.zoom - HANDLE_HALF,
        outputX: (handle.outputWorldX - viewport.x) * viewport.zoom - HANDLE_HALF,
        outputY: (handle.outputWorldY - viewport.y) * viewport.zoom - HANDLE_HALF,
      })),
    [viewport.x, viewport.y, viewport.zoom, worldRenderedHandles],
  );

  const selectedRenderedEdge = useMemo(() => {
    if (!worldSelectedRenderedEdge) return null;
    const sourcePoint = getScreenPointFromWorldPoint(
      worldSelectedRenderedEdge.sourceWorldX,
      worldSelectedRenderedEdge.sourceWorldY,
    );
    const targetPoint = getScreenPointFromWorldPoint(
      worldSelectedRenderedEdge.targetWorldX,
      worldSelectedRenderedEdge.targetWorldY,
    );
    return {
      ...worldSelectedRenderedEdge,
      sourceX: sourcePoint.x,
      sourceY: sourcePoint.y,
      targetX: targetPoint.x,
      targetY: targetPoint.y,
    };
  }, [viewport.x, viewport.y, viewport.zoom, worldSelectedRenderedEdge]);

  const connectionPreviewPath = useMemo(() => {
    if (!connectionPreview) return null;

    function getNodePreviewEndpoint(
      nodeId: number | null,
      role: "source" | "target",
    ): { x: number; y: number; side: PocAnchorSide } | null {
      if (nodeId === null) return null;
      const resolvedAnchors = resolvedNodeAnchorsById.get(Number(nodeId));
      if (!resolvedAnchors) return null;
      const anchor = role === "source" ? resolvedAnchors.outputAnchor : resolvedAnchors.inputAnchor;
      const screenPoint = getScreenPointFromWorldPoint(anchor.x, anchor.y);
      return {
        x: screenPoint.x,
        y: screenPoint.y,
        side: anchor.side,
      };
    }

    const pointerPoint = { x: connectionPreview.currentX, y: connectionPreview.currentY };

    if (connectionPreview.kind === "reconnect-source") {
      const targetEndpoint =
        getNodePreviewEndpoint(connectionPreview.fixedNodeId, "target") ?? {
          x: connectionPreview.startX,
          y: connectionPreview.startY,
          side: resolvePreviewAnchorSide(
            { x: connectionPreview.startX, y: connectionPreview.startY },
            pointerPoint,
          ),
        };
      const fallbackSourceSide = isHorizontalPreviewSide(targetEndpoint.side)
        ? resolveComplementaryPreviewSide(targetEndpoint.side)
        : resolvePreviewAnchorSide(pointerPoint, targetEndpoint);
      const sourceEndpoint =
        getNodePreviewEndpoint(connectionPreview.hoveredNodeId, "source") ?? {
          x: pointerPoint.x,
          y: pointerPoint.y,
          side: fallbackSourceSide,
        };

      return buildSmoothPocEdgePath({
        sourceX: sourceEndpoint.x,
        sourceY: sourceEndpoint.y,
        targetX: targetEndpoint.x,
        targetY: targetEndpoint.y,
        sourceSide: sourceEndpoint.side,
        targetSide: targetEndpoint.side,
      });
    }

    const sourceEndpoint =
      getNodePreviewEndpoint(
        connectionPreview.kind === "reconnect-target"
          ? connectionPreview.fixedNodeId
          : connectionPreview.draggedNodeId,
        "source",
      ) ?? {
        x: connectionPreview.startX,
        y: connectionPreview.startY,
        side: resolvePreviewAnchorSide(
          { x: connectionPreview.startX, y: connectionPreview.startY },
            pointerPoint,
          ),
        };
    const fallbackTargetSide = isHorizontalPreviewSide(sourceEndpoint.side)
      ? resolveComplementaryPreviewSide(sourceEndpoint.side)
      : resolvePreviewAnchorSide(pointerPoint, sourceEndpoint);
    const targetEndpoint =
      getNodePreviewEndpoint(connectionPreview.hoveredNodeId, "target") ?? {
        x: pointerPoint.x,
        y: pointerPoint.y,
        side: fallbackTargetSide,
      };

    return buildSmoothPocEdgePath({
      sourceX: sourceEndpoint.x,
      sourceY: sourceEndpoint.y,
      targetX: targetEndpoint.x,
      targetY: targetEndpoint.y,
      sourceSide: sourceEndpoint.side,
      targetSide: targetEndpoint.side,
    });
  }, [connectionPreview, resolvedNodeAnchorsById, viewport.x, viewport.y, viewport.zoom]);

  function getScreenPointFromWorldPoint(worldX: number, worldY: number) {
    return {
      x: (worldX - viewport.x) * viewport.zoom,
      y: (worldY - viewport.y) * viewport.zoom,
    };
  }

  function isPointNearSelectedEdgeEndpoint(
    clientX: number,
    clientY: number,
    role?: "source" | "target",
  ) {
    if (!selectedRenderedEdge) return false;
    const canvasPoint = getCanvasScreenPointFromClientPoint(clientX, clientY);
    if (!canvasPoint) return false;
    const threshold = EDGE_ENDPOINT_HALF + 8;
    const matchesEndpoint = (endpointRole: "source" | "target", x: number, y: number) =>
      (role === undefined || role === endpointRole) &&
      Math.hypot(canvasPoint.screenX - x, canvasPoint.screenY - y) <= threshold;

    return (
      matchesEndpoint("source", selectedRenderedEdge.sourceX, selectedRenderedEdge.sourceY) ||
      matchesEndpoint("target", selectedRenderedEdge.targetX, selectedRenderedEdge.targetY)
    );
  }

  function shouldSuppressSelectedEdgeBodyInteraction(
    edgeId: string,
    clientX: number,
    clientY: number,
  ) {
    if (edgeId !== selectedEdgeId) return false;
    return isPointNearSelectedEdgeEndpoint(clientX, clientY);
  }

  function renderHandleControl(
    handle: (typeof renderedHandles)[number],
    role: "source" | "target",
    key: string,
  ) {
    const isSource = role === "source";
    const handleX = isSource ? handle.outputX : handle.inputX;
    const handleY = isSource ? handle.outputY : handle.inputY;
    const isPendingSourceHandle = isSource && Number(pendingConnectionSourceId) === Number(handle.id);
    const handleClassName = [
      "hf-node-handle",
      isSource ? "hf-node-handle-output" : "hf-node-handle-input",
      handle.isActive ? "hf-node-handle-emphasis" : "hf-node-handle-resting",
      isPendingSourceHandle ? "hf-node-handle-active" : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        key={key}
        type="button"
        className={handleClassName}
        style={{
          left: `${handleX}px`,
          top: `${handleY}px`,
        }}
        aria-label={isSource ? `Connect from node ${handle.id}` : `Connect into node ${handle.id}`}
        onPointerDown={(event) => {
          if (!isSource || !isInteractive || !onEdgeConnect) return;
          event.preventDefault();
          event.stopPropagation();
          startConnectionDrag({
            kind: "connect",
            draggedNodeId: handle.id,
            startX: handleX + HANDLE_HALF,
            startY: handleY + HANDLE_HALF,
            clientX: event.clientX,
            clientY: event.clientY,
            pointerId: event.pointerId,
          });
        }}
        onPointerEnter={() => {
          if (!connectionDragRef.current || !connectionDragAcceptsRole(role)) return;
          if (!isCompatibleConnectionTarget(handle.id)) return;
          updateHoveredConnectionTarget(handle.id);
        }}
        onPointerLeave={() => {
          if (!connectionDragRef.current || !connectionDragAcceptsRole(role)) return;
          if (Number(connectionDragRef.current.hoveredNodeId) !== Number(handle.id)) return;
          updateHoveredConnectionTarget(null);
        }}
        onPointerUp={(event) => {
          if (!connectionDragRef.current || !connectionDragAcceptsRole(role)) return;
          event.preventDefault();
          event.stopPropagation();
          if (!isCompatibleConnectionTarget(handle.id)) {
            finalizeConnectionDrag(event.pointerId);
            return;
          }
          updateHoveredConnectionTarget(handle.id);
          finalizeConnectionDrag(event.pointerId);
        }}
        onClick={(event) => {
          if (selectedRenderedEdge && isPointNearSelectedEdgeEndpoint(event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          if (suppressNextHandleClickRef.current) {
            suppressNextHandleClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          event.stopPropagation();
          handleHandleClick(role, handle.id);
        }}
      />
    );
  }

  function handleHandleClick(role: "source" | "target", nodeId: number) {
    if (selectedEdgeId !== null && onEdgeReconnect) {
      if (role === "source") {
        onEdgeReconnect(selectedEdgeId, { sourceNodeId: nodeId });
      } else {
        onEdgeReconnect(selectedEdgeId, { targetNodeId: nodeId });
      }
      selectNode(nodeId);
      selectEdge(selectedEdgeId);
      setPendingConnectionSourceId(null);
      suppressNextHandleClickRef.current = false;
      return;
    }

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
          <g transform={edgeOverlayTransform}>
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
                  d={edge.worldPath}
                  vectorEffect="non-scaling-stroke"
                  className="hf-edge-overlay-hit"
                  data-edge-id={edge.id}
                  role="button"
                  aria-label={`Select edge ${edge.id}`}
                  tabIndex={0}
                  onPointerDown={(event) => {
                    if (shouldSuppressSelectedEdgeBodyInteraction(edge.id, event.clientX, event.clientY)) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    selectNode(null);
                    selectEdge(edge.id, { additive: event.shiftKey });
                    if (!isInteractive || !onEdgeBendChange) return;
                    startEdgeDrag(edge.id, event.clientX, event.clientY, { x: edge.bendOffsetWorldX, y: edge.bendOffsetWorldY }, event.pointerId);
                  }}
                  onMouseDown={(event) => {
                    if (shouldSuppressSelectedEdgeBodyInteraction(edge.id, event.clientX, event.clientY)) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    selectNode(null);
                    selectEdge(edge.id, { additive: event.shiftKey });
                    if (!isInteractive || !onEdgeBendChange || event.button !== 0) return;
                    startEdgeDrag(edge.id, event.clientX, event.clientY, { x: edge.bendOffsetWorldX, y: edge.bendOffsetWorldY });
                  }}
                  onClick={(event) => {
                    if (shouldSuppressSelectedEdgeBodyInteraction(edge.id, event.clientX, event.clientY)) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }
                    event.stopPropagation();
                    selectNode(null);
                    selectEdge(edge.id, { additive: event.shiftKey });
                  }}
                  onDoubleClick={(event) => {
                    if (shouldSuppressSelectedEdgeBodyInteraction(edge.id, event.clientX, event.clientY)) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    selectNode(null);
                    selectEdge(edge.id, { additive: event.shiftKey });
                    if (edge.hasBend) onEdgeBendChange?.(edge.id, null);
                  }}
                />
                <path
                  d={edge.worldPath}
                  vectorEffect="non-scaling-stroke"
                  className={
                    selectedEdgeId === edge.id
                      ? "hf-edge-overlay-path hf-edge-overlay-path-selected"
                      : "hf-edge-overlay-path"
                  }
                  aria-hidden="true"
                />
              </g>
            ))}
          </g>
          {connectionPreview ? (
            <path
              d={connectionPreviewPath ?? ""}
              vectorEffect="non-scaling-stroke"
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
                  {renderHandleControl(handle, "target", `under-target-${handle.id}`)}
                  {renderHandleControl(handle, "source", `under-source-${handle.id}`)}
                </Fragment>
              ))}
          </div>
          <div className="hf-handle-overlay hf-handle-overlay-over">
            {renderedHandles
              .filter((handle) => handle.isActive)
              .map((handle) => (
                <Fragment key={handle.id}>
                  {renderHandleControl(handle, "target", `over-target-${handle.id}`)}
                  {renderHandleControl(handle, "source", `over-source-${handle.id}`)}
                </Fragment>
            ))}
          </div>
        </>
      ) : null}

      {selectedRenderedEdge && isInteractive && onEdgeReconnect ? (
        <div className="hf-handle-overlay hf-handle-overlay-edge-endpoints">
          <button
            type="button"
            className="hf-node-handle hf-node-handle-active hf-edge-endpoint-handle"
            style={{
              left: `${selectedRenderedEdge.sourceX - EDGE_ENDPOINT_HALF}px`,
              top: `${selectedRenderedEdge.sourceY - EDGE_ENDPOINT_HALF}px`,
            }}
            aria-label={`Reconnect source of edge ${selectedRenderedEdge.id}`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              suppressNextHandleClickRef.current = true;
              startConnectionDrag({
                kind: "reconnect-source",
                edgeId: selectedRenderedEdge.id,
                draggedNodeId: selectedRenderedEdge.sourceNodeId,
                fixedNodeId: selectedRenderedEdge.targetNodeId,
                startX: selectedRenderedEdge.targetX,
                startY: selectedRenderedEdge.targetY,
                clientX: event.clientX,
                clientY: event.clientY,
                pointerId: event.pointerId,
              });
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          />
          <button
            type="button"
            className="hf-node-handle hf-node-handle-active hf-edge-endpoint-handle"
            style={{
              left: `${selectedRenderedEdge.targetX - EDGE_ENDPOINT_HALF}px`,
              top: `${selectedRenderedEdge.targetY - EDGE_ENDPOINT_HALF}px`,
            }}
            aria-label={`Reconnect target of edge ${selectedRenderedEdge.id}`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              suppressNextHandleClickRef.current = true;
              startConnectionDrag({
                kind: "reconnect-target",
                edgeId: selectedRenderedEdge.id,
                draggedNodeId: selectedRenderedEdge.targetNodeId,
                fixedNodeId: selectedRenderedEdge.sourceNodeId,
                startX: selectedRenderedEdge.sourceX,
                startY: selectedRenderedEdge.sourceY,
                clientX: event.clientX,
                clientY: event.clientY,
                pointerId: event.pointerId,
              });
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          />
        </div>
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
});
