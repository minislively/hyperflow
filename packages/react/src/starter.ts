import { createPocViewport, type PocNode, type PocViewport } from "@hyperflow/sdk";

export type HyperFlowCanvasMode = "inspect" | "read-only";

export function fitPocViewportToNodes(
  nodes: PocNode[],
  options: {
    width?: number;
    height?: number;
    padding?: number;
    minZoom?: number;
    maxZoom?: number;
  } = {},
): PocViewport {
  const width = options.width ?? 960;
  const height = options.height ?? 540;
  const padding = options.padding ?? 48;
  const minZoom = options.minZoom ?? 0.35;
  const maxZoom = options.maxZoom ?? 1.25;

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + node.size.width));
  const maxY = Math.max(...nodes.map((node) => node.position.y + node.size.height));
  const zoom = Math.min(
    width / (maxX - minX + padding * 2),
    height / (maxY - minY + padding * 2),
  );

  return createPocViewport(width, height, {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    zoom: Math.max(minZoom, Math.min(zoom, maxZoom)),
  });
}

export function focusPocViewportOnNode(
  node: PocNode,
  currentViewport: PocViewport,
  options: {
    width?: number;
    height?: number;
    minZoom?: number;
  } = {},
): PocViewport {
  const width = options.width ?? currentViewport.width ?? 960;
  const height = options.height ?? currentViewport.height ?? 540;
  const minZoom = options.minZoom ?? 0.7;
  const zoom = Math.max(currentViewport.zoom, minZoom);
  const centeredX = Math.max(0, node.position.x + node.size.width / 2 - width / (2 * zoom));
  const centeredY = Math.max(0, node.position.y + node.size.height / 2 - height / (2 * zoom));

  return createPocViewport(width, height, {
    x: centeredX,
    y: centeredY,
    zoom,
  });
}

export function isInteractiveCanvasMode(mode: HyperFlowCanvasMode) {
  return mode === "inspect";
}
