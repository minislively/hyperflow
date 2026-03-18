import { getFixture } from "../../../benchmarks/fixtures.js";
import { createPocEngine, createPocMetricsSummary, createPocViewport } from "../../../packages/sdk/src/index.js";

const canvas = document.querySelector("#poc-canvas");
const metricsEl = document.querySelector("#metrics");
const hitResultEl = document.querySelector("#hit-result");
const fixtureSelect = document.querySelector("#fixture-size");
const context = canvas.getContext("2d");
const viewport = createPocViewport(canvas.width, canvas.height);

let engine;
let currentFixture = getFixture(Number(fixtureSelect.value));

function loadCurrentFixture() {
  engine.loadFixture(currentFixture);
}

function render() {
  const frame = engine.renderFrame(context, viewport, {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  });

  metricsEl.textContent = createPocMetricsSummary(frame.metrics);
}

function updateFixture() {
  currentFixture = getFixture(Number(fixtureSelect.value));
  viewport.x = 0;
  viewport.y = 0;
  viewport.zoom = 1;
  loadCurrentFixture();
  render();
}

fixtureSelect.addEventListener("change", updateFixture);

const panStep = 80;
document.querySelector("#pan-left").addEventListener("click", () => {
  viewport.x = Math.max(0, viewport.x - panStep / viewport.zoom);
  render();
});
document.querySelector("#pan-right").addEventListener("click", () => {
  viewport.x += panStep / viewport.zoom;
  render();
});
document.querySelector("#pan-up").addEventListener("click", () => {
  viewport.y = Math.max(0, viewport.y - panStep / viewport.zoom);
  render();
});
document.querySelector("#pan-down").addEventListener("click", () => {
  viewport.y += panStep / viewport.zoom;
  render();
});
document.querySelector("#zoom-out").addEventListener("click", () => {
  viewport.zoom = Math.max(0.5, viewport.zoom - 0.25);
  render();
});
document.querySelector("#zoom-in").addEventListener("click", () => {
  viewport.zoom = Math.min(4, viewport.zoom + 0.25);
  render();
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const worldPoint = {
    x: viewport.x + (event.clientX - rect.left) / viewport.zoom,
    y: viewport.y + (event.clientY - rect.top) / viewport.zoom,
  };

  const hit = engine.hitTest(worldPoint);
  hitResultEl.textContent = hit === null
    ? `No hit at (${worldPoint.x.toFixed(1)}, ${worldPoint.y.toFixed(1)})`
    : `Hit node ${hit} at (${worldPoint.x.toFixed(1)}, ${worldPoint.y.toFixed(1)})`;
});

try {
  engine = await createPocEngine();
  loadCurrentFixture();
  render();
} catch (error) {
  metricsEl.textContent = `Failed to initialize WASM bridge: ${error.message}`;
  hitResultEl.textContent = "Build the WASM module with `pnpm build:wasm:poc` and reload the page.";
  console.error(error);
}
