import { performance } from "node:perf_hooks";

import { getFixture, getDefaultViewport, FIXTURE_SIZES } from "./fixtures.js";
import { createHyperflowWasmBridge } from "../packages/wasm-bindings/src/index.js";
import { createMockContext, drawVisibleBoxes } from "../packages/renderer-canvas/src/index.js";

const bridge = await createHyperflowWasmBridge();

for (const size of FIXTURE_SIZES) {
  const fixture = getFixture(size);
  bridge.loadFixture(fixture);

  const viewport = getDefaultViewport();
  const viewportStart = performance.now();
  const visibleCount = bridge.setViewport(viewport);
  const boxes = bridge.getVisibleBoxes();
  const viewportMs = performance.now() - viewportStart;

  const context = createMockContext();
  const renderStart = performance.now();
  drawVisibleBoxes(context, boxes, viewport, { clear: true });
  const renderMs = performance.now() - renderStart;

  console.log(JSON.stringify({
    fixtureSize: size,
    visibleCount,
    viewportUpdateMs: Number(viewportMs.toFixed(3)),
    renderMs: Number(renderMs.toFixed(3)),
    drawCalls: context.drawCalls.length,
  }));
}
