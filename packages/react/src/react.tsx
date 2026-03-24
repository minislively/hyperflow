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
  onViewportChange?: (viewport: PocViewport) => void;
  onEdgeConnect?: (sourceNodeId: number, targetNodeId: number) => void;
  onEdgeBendChange?: (edgeId: string, nextBend: PocEdge["bend"]) => void;
  onMetricsChange?: (metrics: PocMetrics) => void;
  onReadyChange?: (ready: boolean) => void;
};

function buildSmoothEdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  bendX,
  bendY,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  bendX?: number | null;
  bendY?: number | null;
}) {
  const dx = targetX - sourceX;
  const sign = dx >= 0 ? 1 : -1;
  const absoluteDx = Math.abs(dx);
  const baseOffset = Math.max(48, absoluteDx * 0.35);

  if (bendX == null || bendY == null) {
    return `M ${sourceX} ${sourceY} C ${sourceX + sign * baseOffset} ${sourceY}, ${targetX - sign * baseOffset} ${targetY}, ${targetX} ${targetY}`;
  }

  const defaultMidX = (sourceX + targetX) / 2;
  const defaultMidY = (sourceY + targetY) / 2;
  const influenceX = (bendX - defaultMidX) * 0.18;
  const influenceY = (bendY - defaultMidY) * 0.7;
  const minX = Math.min(sourceX, targetX) + 18;
  const maxX = Math.max(sourceX, targetX) - 18;
  const controlOneX = Math.min(maxX, Math.max(minX, sourceX + sign * baseOffset + influenceX));
  const controlTwoX = Math.min(maxX, Math.max(minX, targetX - sign * baseOffset + influenceX));
  const controlOneY = sourceY + influenceY;
  const controlTwoY = targetY + influenceY;

  return `M ${sourceX} ${sourceY} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${targetX} ${targetY}`;
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
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const isInteractive = interactive ?? isInteractiveCanvasMode(mode);
  const viewportRef = useRef(viewport);
  const onNodePositionChangeRef = useRef(onNodePositionChange);
  const onViewportChangeRef = useRef(onViewportChange);
  const onEdgeBendChangeRef = useRef(onEdgeBendChange);
  const ignoreCanvasClickUntilRef = useRef(0);
  const scheduledFrameRef = useRef<number | null>(null);
  const pendingNodePositionRef = useRef<{ nodeId: number; nextPosition: PocNode["position"] } | null>(null);
  const pendingViewportRef = useRef<PocViewport | null>(null);
  const pendingEdgeBendRef = useRef<{ edgeId: string; nextBend: PocEdge["bend"] } | null>(null);
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
  const nodeById = useMemo(() => new Map(nodes.map((node) => [Number(node.id), node])), [nodes]);

  useEffect(() => {
    viewportRef.current = viewport;
    onNodePositionChangeRef.current = onNodePositionChange;
    onViewportChangeRef.current = onViewportChange;
    onEdgeBendChangeRef.current = onEdgeBendChange;
  }, [onEdgeBendChange, onNodePositionChange, onViewportChange, viewport]);

  function flushPendingUpdates() {
    scheduledFrameRef.current = null;

    const pendingNodePosition = pendingNodePositionRef.current;
    if (pendingNodePosition && onNodePositionChangeRef.current) {
      onNodePositionChangeRef.current(pendingNodePosition.nodeId, pendingNodePosition.nextPosition);
    }
    pendingNodePositionRef.current = null;

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
    selectNode(node.id, { additive });
    if (!additive) {
      selectEdge(null);
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

    if (dragState.kind === "node" && onNodePositionChangeRef.current) {
      pendingNodePositionRef.current = {
        nodeId: dragState.nodeId,
        nextPosition: {
          x: Math.max(0, dragState.startPosition.x + deltaWorldX),
          y: Math.max(0, dragState.startPosition.y + deltaWorldY),
        },
      };
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

        return {
          box,
          node,
          Renderer,
          data: getNodeRendererData?.(node),
          screenX: (box.x - viewport.x) * viewport.zoom,
          screenY: (box.y - viewport.y) * viewport.zoom,
          screenWidth: box.width * viewport.zoom,
          screenHeight: box.height * viewport.zoom,
        };
      })
      .filter(Boolean) as Array<{
      box: VisibleBox;
      node: PocNode;
      Renderer: React.ComponentType<HyperFlowPocNodeRendererProps<any>>;
      data: unknown;
      screenX: number;
      screenY: number;
      screenWidth: number;
      screenHeight: number;
    }>;
  }, [getNodeRendererData, getNodeRendererKey, nodeById, nodeRenderers, viewport.x, viewport.y, viewport.zoom, visibleBoxes]);

  const renderedEdges = useMemo(() => {
    return edges
      .map((edge) => {
        const sourceNode = nodeById.get(Number(edge.source));
        const targetNode = nodeById.get(Number(edge.target));
        if (!sourceNode || !targetNode) return null;

        const sourceX = (sourceNode.position.x + sourceNode.size.width - viewport.x) * viewport.zoom;
        const sourceY = (sourceNode.position.y + sourceNode.size.height / 2 - viewport.y) * viewport.zoom;
        const targetX = (targetNode.position.x - viewport.x) * viewport.zoom;
        const targetY = (targetNode.position.y + targetNode.size.height / 2 - viewport.y) * viewport.zoom;
        const defaultBendX = (sourceNode.position.x + sourceNode.size.width + targetNode.position.x) / 2;
        const defaultBendY =
          (sourceNode.position.y + sourceNode.size.height / 2 + targetNode.position.y + targetNode.size.height / 2) / 2;
        const bendWorldX = edge.bend?.x ?? defaultBendX;
        const bendWorldY = edge.bend?.y ?? defaultBendY;
        const bendX = (bendWorldX - viewport.x) * viewport.zoom;
        const bendY = (bendWorldY - viewport.y) * viewport.zoom;
        const path = buildSmoothEdgePath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          bendX: edge.bend ? bendX : null,
          bendY: edge.bend ? bendY : null,
        });

        return {
          id: edge.id,
          path,
          bendX,
          bendY,
          bendWorldX,
          bendWorldY,
          hasBend: Boolean(edge.bend),
          midX: edge.bend ? bendX : (sourceX + targetX) / 2,
          midY: edge.bend ? bendY : (sourceY + targetY) / 2,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      path: string;
      midX: number;
      midY: number;
      bendX: number;
      bendY: number;
      bendWorldX: number;
      bendWorldY: number;
      hasBend: boolean;
    }>;
  }, [edges, nodeById, viewport.x, viewport.y, viewport.zoom]);

  const renderedHandles = useMemo(() => {
    if (!onEdgeConnect) return [];

    return nodes.map((node) => {
      const screenLeft = (node.position.x - viewport.x) * viewport.zoom;
      const screenTop = (node.position.y - viewport.y) * viewport.zoom;
      const screenWidth = node.size.width * viewport.zoom;
      const screenHeight = node.size.height * viewport.zoom;
      return {
        id: node.id,
        inputX: screenLeft - 7,
        outputX: screenLeft + screenWidth - 7,
        y: screenTop + screenHeight / 2 - 7,
      };
    });
  }, [nodes, onEdgeConnect, viewport.x, viewport.y, viewport.zoom]);

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

      {renderedEdges.length > 0 ? (
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
                  startEdgeDrag(edge.id, event.clientX, event.clientY, { x: edge.bendWorldX, y: edge.bendWorldY }, event.pointerId);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectNode(null);
                  selectEdge(edge.id, { additive: event.shiftKey });
                  if (!isInteractive || !onEdgeBendChange || event.button !== 0) return;
                  startEdgeDrag(edge.id, event.clientX, event.clientY, { x: edge.bendWorldX, y: edge.bendWorldY });
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
        </svg>
      ) : null}

      {renderedHandles.length > 0 ? (
        <div className="hf-handle-overlay">
          {renderedHandles.map((handle) => (
            <Fragment key={handle.id}>
              <button
                type="button"
                className="hf-node-handle hf-node-handle-input"
                style={{ left: `${handle.inputX}px`, top: `${handle.y}px` }}
                aria-label={`Connect into node ${handle.id}`}
                onClick={(event) => {
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
                style={{ left: `${handle.outputX}px`, top: `${handle.y}px` }}
                aria-label={`Connect from node ${handle.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleHandleClick("source", handle.id);
                }}
              />
            </Fragment>
          ))}
        </div>
      ) : null}

      {renderedCustomNodes.length > 0 ? (
        <div className="hf-node-overlay">
          {renderedCustomNodes.map(({ box, node, Renderer, data, screenX, screenY, screenWidth, screenHeight }) => (
            <div
              key={node.id}
              className="hf-node-overlay-item"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
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
          ))}
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
