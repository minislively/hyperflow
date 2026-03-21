import { performance } from "node:perf_hooks";

import { getFixture, getDefaultViewport, FIXTURE_SIZES } from "./fixtures.js";
import { createHyperflowWasmBridge } from "../packages/wasm-bindings/src/index.js";
import { createMockContext, drawVisibleBoxes } from "../packages/renderer-canvas/src/index.js";

const VIEWPORT_MOVEMENT_SAMPLES = 24;
const BENCHMARK_FIXTURE_SIZES = [...new Set([...FIXTURE_SIZES, 5000, 10000, 20000])];

function createViewportMovementSequence(baseViewport) {
  return Array.from({ length: VIEWPORT_MOVEMENT_SAMPLES }, (_, step) => {
    const panStep = step % 8;
    const band = Math.floor(step / 8);
    const zoomOffset = (step % 6) - 2;

    return {
      ...baseViewport,
      x: baseViewport.x + panStep * 72 + band * 36,
      y: baseViewport.y + (panStep % 4) * 48 + band * 40,
      zoom: Number((baseViewport.zoom + zoomOffset * 0.08).toFixed(2)),
    };
  });
}

const bridge = await createHyperflowWasmBridge();

for (const size of BENCHMARK_FIXTURE_SIZES) {
  const fixture = getFixture(size);
  bridge.loadFixture(fixture);

  const viewports = createViewportMovementSequence(getDefaultViewport());
  const boxSnapshots = [];
  let visibleCount = 0;

  const viewportStart = performance.now();
  for (const viewport of viewports) {
    visibleCount = bridge.setViewport(viewport);
  }
  const viewportMs = (performance.now() - viewportStart) / viewports.length;

  const bridgeReadbackStart = performance.now();
  for (const viewport of viewports) {
    bridge.setViewport(viewport);
    const boxes = bridge.getVisibleBoxes();
    boxSnapshots.push({ boxes, viewport });
    visibleCount = boxes.length;
  }
  const bridgeReadbackMs = (performance.now() - bridgeReadbackStart) / viewports.length;

  const context = createMockContext();
  const renderStart = performance.now();
  for (const snapshot of boxSnapshots) {
    drawVisibleBoxes(context, snapshot.boxes, snapshot.viewport, { clear: true });
  }
  const renderMs = (performance.now() - renderStart) / boxSnapshots.length;

  console.log(JSON.stringify({
    fixtureSize: size,
    visibleCount,
    viewportSamples: viewports.length,
    viewportUpdateMs: Number(viewportMs.toFixed(3)),
    bridgeReadbackMs: Number(bridgeReadbackMs.toFixed(3)),
    renderMs: Number(renderMs.toFixed(3)),
    drawCalls: context.drawCalls.length,
  }));
}
