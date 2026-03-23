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
  selectedEdgeId?: string | null;
  width?: number;
  height?: number;
  className?: string;
  mode?: HyperFlowCanvasMode;
  interactive?: boolean;
  nodeRenderers?: HyperFlowPocNodeRenderers;
  getNodeRendererKey?: (node: PocNode) => string | null;
  getNodeRendererData?: (node: PocNode) => unknown;
  onNodeSelect?: (nodeId: number | null) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
  onNodePositionChange?: (nodeId: number, nextPosition: PocNode["position"]) => void;
  onViewportChange?: (viewport: PocViewport) => void;
  onEdgeConnect?: (sourceNodeId: number, targetNodeId: number) => void;
  onMetricsChange?: (metrics: PocMetrics) => void;
  onReadyChange?: (ready: boolean) => void;
};

export function HyperFlowPocCanvas({
  nodes,
  edges = [],
  viewport,
  selectedNodeId = null,
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
  onEdgeSelect,
  onNodePositionChange,
  onViewportChange,
  onEdgeConnect,
  onMetricsChange,
  onReadyChange,
}: HyperFlowPocCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<PocEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleBoxes, setVisibleBoxes] = useState<VisibleBox[]>([]);
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<number | null>(null);
  const isInteractive = interactive ?? isInteractiveCanvasMode(mode);
  const dragStateRef = useRef<
    | null
    | {
        kind: "node";
        pointerId: number;
        nodeId: number;
        startClientX: number;
        startClientY: number;
        startPosition: PocNode["position"];
      }
    | {
        kind: "pan";
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startViewport: PocViewport;
      }
  >(null);

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
      fillStyle: "rgba(99, 102, 241, 0.18)",
      strokeStyle: "rgba(99, 102, 241, 0.95)",
      lineWidth: 1,
    });

    if (selectedNodeId !== null) {
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
  }, [engine, height, nodes, onMetricsChange, selectedNodeId, viewport, width]);

  function selectNode(nodeId: number | null) {
    onNodeSelect?.(nodeId);
  }

  function selectEdge(edgeId: string | null) {
    onEdgeSelect?.(edgeId);
  }

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!isInteractive || !engine || !canvasRef.current) return;

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) return;
    const worldPoint = {
      x: viewport.x + canvasPoint.screenX / viewport.zoom,
      y: viewport.y + canvasPoint.screenY / viewport.zoom,
    };

    selectNode(engine.hitTest(worldPoint));
    selectEdge(null);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isInteractive || !engine || !canvasRef.current) return;

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) return;
    const worldPoint = {
      x: viewport.x + canvasPoint.screenX / viewport.zoom,
      y: viewport.y + canvasPoint.screenY / viewport.zoom,
    };
    const hitNodeId = engine.hitTest(worldPoint);
    const node = hitNodeId === null ? null : nodes.find((candidate) => Number(candidate.id) === Number(hitNodeId)) ?? null;

    if (node && onNodePositionChange) {
      selectNode(node.id);
      selectEdge(null);
      dragStateRef.current = {
        kind: "node",
        pointerId: event.pointerId,
        nodeId: node.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPosition: { ...node.position },
      };
      canvasRef.current.setPointerCapture(event.pointerId);
      return;
    }

    if (onViewportChange) {
      selectNode(null);
      selectEdge(null);
      dragStateRef.current = {
        kind: "pan",
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startViewport: { ...viewport },
      };
      canvasRef.current.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!canvasRef.current || !dragStateRef.current) return;

    const dragState = dragStateRef.current;
    if (dragState.pointerId !== event.pointerId) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const xScale = canvasRef.current.width / rect.width;
    const yScale = canvasRef.current.height / rect.height;
    const deltaWorldX = ((event.clientX - dragState.startClientX) * xScale) / viewport.zoom;
    const deltaWorldY = ((event.clientY - dragState.startClientY) * yScale) / viewport.zoom;

    if (dragState.kind === "node" && onNodePositionChange) {
      onNodePositionChange(dragState.nodeId, {
        x: Math.max(0, dragState.startPosition.x + deltaWorldX),
        y: Math.max(0, dragState.startPosition.y + deltaWorldY),
      });
      return;
    }

    if (dragState.kind === "pan" && onViewportChange) {
      onViewportChange({
        ...dragState.startViewport,
        x: Math.max(0, dragState.startViewport.x - deltaWorldX),
        y: Math.max(0, dragState.startViewport.y - deltaWorldY),
      });
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!canvasRef.current || !dragStateRef.current) return;
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    if (canvasRef.current.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
  }

  const renderedCustomNodes = useMemo(() => {
    if (!nodeRenderers || !getNodeRendererKey) return [];

    return visibleBoxes
      .map((box) => {
        const node = nodes.find((candidate) => Number(candidate.id) === Number(box.id));
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
  }, [getNodeRendererData, getNodeRendererKey, nodeRenderers, nodes, viewport.x, viewport.y, viewport.zoom, visibleBoxes]);

  const renderedEdges = useMemo(() => {
    return edges
      .map((edge) => {
        const sourceNode = nodes.find((node) => Number(node.id) === Number(edge.source));
        const targetNode = nodes.find((node) => Number(node.id) === Number(edge.target));
        if (!sourceNode || !targetNode) return null;

        const sourceX = (sourceNode.position.x + sourceNode.size.width - viewport.x) * viewport.zoom;
        const sourceY = (sourceNode.position.y + sourceNode.size.height / 2 - viewport.y) * viewport.zoom;
        const targetX = (targetNode.position.x - viewport.x) * viewport.zoom;
        const targetY = (targetNode.position.y + targetNode.size.height / 2 - viewport.y) * viewport.zoom;
        const controlOffset = Math.max(48, Math.abs(targetX - sourceX) * 0.35);
        const path = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

        return {
          id: edge.id,
          path,
          midX: (sourceX + targetX) / 2,
          midY: (sourceY + targetY) / 2,
        };
      })
      .filter(Boolean) as Array<{ id: string; path: string; midX: number; midY: number }>;
  }, [edges, nodes, viewport.x, viewport.y, viewport.zoom]);

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
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
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
            <Fragment key={edge.id}>
              <path
                d={edge.path}
                className="hf-edge-overlay-hit"
                data-edge-id={edge.id}
                role="button"
                aria-label={`Select edge ${edge.id}`}
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  selectNode(null);
                  selectEdge(edge.id);
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
              {selectedEdgeId === edge.id ? (
                <circle
                  className="hf-edge-overlay-marker"
                  cx={edge.midX}
                  cy={edge.midY}
                  r="6"
                  aria-hidden="true"
                />
              ) : null}
            </Fragment>
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
        <div className="hf-node-overlay" aria-hidden={isInteractive ? undefined : true}>
          {renderedCustomNodes.map(({ box, node, Renderer, data, screenX, screenY, screenWidth, screenHeight }) => (
            <div
              key={node.id}
              className="hf-node-overlay-item"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
                pointerEvents: isInteractive ? "auto" : "none",
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (!isInteractive) return;
                selectNode(node.id);
              }}
            >
              <Renderer
                node={node}
                box={box}
                data={data}
                selected={Number(selectedNodeId) === Number(node.id)}
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

      {error ? <div className="hf-canvas-error">{error}</div> : null}
    </div>
  );
}
