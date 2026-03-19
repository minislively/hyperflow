import { useEffect, useRef, useState } from "react";
import { createPocEngine, type PocEngine, type PocMetrics, type PocNode, type PocViewport } from "@hyperflow/sdk";
import { isInteractiveCanvasMode, type HyperFlowCanvasMode } from "./starter";

export type HyperFlowPocCanvasProps = {
  nodes: PocNode[];
  viewport: PocViewport;
  selectedNodeId?: number | null;
  width?: number;
  height?: number;
  className?: string;
  mode?: HyperFlowCanvasMode;
  interactive?: boolean;
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
  onNodeSelect,
  onMetricsChange,
  onReadyChange,
}: HyperFlowPocCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<PocEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    engine.loadFixture(nodes);
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

    onMetricsChange?.(metrics);
  }, [engine, height, nodes, onMetricsChange, selectedNodeId, viewport, width]);

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!isInteractive || !engine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = (event.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const screenY = (event.clientY - rect.top) * (canvasRef.current.height / rect.height);
    const worldPoint = {
      x: viewport.x + screenX / viewport.zoom,
      y: viewport.y + screenY / viewport.zoom,
    };

    onNodeSelect?.(engine.hitTest(worldPoint));
  }

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
      {error ? <div className="hf-canvas-error">{error}</div> : null}
    </div>
  );
}
