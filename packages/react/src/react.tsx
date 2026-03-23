import { useEffect, useMemo, useRef, useState } from "react";
import {
  createPocEngine,
  projectPocNodesToRuntimeNodes,
  type PocEngine,
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
  viewport: PocViewport;
  selectedNodeId?: number | null;
  width?: number;
  height?: number;
  className?: string;
  mode?: HyperFlowCanvasMode;
  interactive?: boolean;
  nodeRenderers?: HyperFlowPocNodeRenderers;
  getNodeRendererKey?: (node: PocNode) => string | null;
  getNodeRendererData?: (node: PocNode) => unknown;
  onNodeSelect?: (nodeId: number | null) => void;
  onMetricsChange?: (metrics: PocMetrics) => void;
  onReadyChange?: (ready: boolean) => void;
};

export function HyperFlowPocCanvas({
  nodes,
  viewport,
  selectedNodeId = null,
  width = 960,
  height = 540,
  className,
  mode = "inspect",
  interactive,
  nodeRenderers,
  getNodeRendererKey,
  getNodeRendererData,
  onNodeSelect,
  onMetricsChange,
  onReadyChange,
}: HyperFlowPocCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<PocEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleBoxes, setVisibleBoxes] = useState<VisibleBox[]>([]);
  const isInteractive = interactive ?? isInteractiveCanvasMode(mode);

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

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!isInteractive || !engine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = (event.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const screenY = (event.clientY - rect.top) * (canvasRef.current.height / rect.height);
    const worldPoint = {
      x: viewport.x + screenX / viewport.zoom,
      y: viewport.y + screenY / viewport.zoom,
    };

    selectNode(engine.hitTest(worldPoint));
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

  return (
    <div className={className} data-interactive={isInteractive ? "true" : "false"}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: isInteractive ? "crosshair" : "default",
        }}
      />

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
