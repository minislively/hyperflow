export { createPocEngine, createPocMetricsSummary, createPocViewport } from "./index.js";

export type PocNode = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PocViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
};

export type VisibleBox = PocNode;

export type PocMetrics = {
  fixtureSize: number;
  visibleCount: number;
  viewportUpdateMs: number;
  renderMs: number;
  zoom: number;
  x: number;
  y: number;
};

export type PocEngine = {
  loadFixture(nodes: PocNode[]): number;
  renderFrame(context: unknown, viewport: PocViewport, renderOptions?: Record<string, unknown>): { boxes: VisibleBox[]; metrics: PocMetrics };
  hitTest(worldPoint: { x: number; y: number }): number | null;
  getVisibleNodeIds(): number[];
  getVisibleBoxes(): VisibleBox[];
  getNodeCount(): number;
};
