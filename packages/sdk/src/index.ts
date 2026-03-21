import { createHyperflowWasmBridge, type HyperflowNode, type HyperflowPoint, type HyperflowViewport, type HyperflowWasmBridge, type HyperflowWasmSourceOptions } from "../../wasm-bindings/src/index.js";
import { drawVisibleBoxes, type CanvasLikeContext, type CanvasRenderOptions } from "../../renderer-canvas/src/index.js";

export type PocNode = HyperflowNode;
export type VisibleBox = HyperflowNode;
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

export type PocEngineBridge = Pick<HyperflowWasmBridge, "loadFixture" | "setViewport" | "getVisibleBoxes" | "getVisibleNodeIds" | "hitTest" | "getNodeCount">;

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
  loadFixture(nodes: PocNode[]): number;
  renderFrame(context: CanvasLikeContext, viewport: PocViewport, renderOptions?: PocRenderOptions): PocFrame;
  hitTest(worldPoint: HyperflowPoint): number | null;
  getVisibleNodeIds(): number[];
  getVisibleBoxes(): VisibleBox[];
  getNodeCount(): number;
};

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
  };
}
