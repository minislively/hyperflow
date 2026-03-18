import { getFixture } from "../../../benchmarks/fixtures.js";
import { createPocEngine, createPocViewport } from "../../../packages/sdk/src/index.js";

const SCENARIOS = [
  {
    id: "quick-canvas",
    size: 100,
    eyebrow: "Start here",
    label: "Fast first impression",
    summary: "Use the smallest graph to understand the proof before you inspect scale.",
    proof: "Shows the full proof loop clearly: viewport refresh, canvas drawing, and node hit detection all stay easy to follow.",
    why: "Best for someone seeing HyperFlow for the first time.",
    intro: "Start here: scan the proof cards, then pan once to see the runtime summary respond.",
    defaultViewport: { x: 0, y: 0, zoom: 1 },
  },
  {
    id: "scale-check",
    size: 300,
    eyebrow: "Next step",
    label: "Scaling confidence check",
    summary: "Move to a mid-size graph and see whether the same story still feels easy to read.",
    proof: "Demonstrates that the same SDK-led demo surface remains understandable as the graph becomes denser.",
    why: "Useful when you want confidence beyond the smallest proof case.",
    intro: "Use this next to compare the product story against a more realistic graph size.",
    defaultViewport: { x: 120, y: 40, zoom: 0.95 },
  },
  {
    id: "dense-tour",
    size: 1000,
    eyebrow: "Stress story",
    label: "Dense graph walkthrough",
    summary: "Inspect the largest current graph and check whether the proof still feels understandable.",
    proof: "Shows the current proof slice under its heaviest shared demo fixture without changing the interaction model.",
    why: "Best for judging whether the narrative still works when visual density increases.",
    intro: "Use this last, once you understand the smaller scenarios.",
    defaultViewport: { x: 240, y: 120, zoom: 0.72 },
  },
];

const canvas = document.querySelector("#poc-canvas");
const context = canvas.getContext("2d");
const scenarioListEl = document.querySelector("#scenario-list");
const scenarioTitleEl = document.querySelector("#scenario-title");
const scenarioSummaryEl = document.querySelector("#scenario-summary");
const scenarioProofEl = document.querySelector("#scenario-proof");
const scenarioWhyEl = document.querySelector("#scenario-why");
const stageCaptionEl = document.querySelector("#stage-caption");
const hitResultEl = document.querySelector("#hit-result");
const flowIntroEl = document.querySelector("#flow-intro");
const guidedStepsEl = document.querySelector("#guided-steps");
const flowStatusEl = document.querySelector("#flow-status");
const metricScenarioEl = document.querySelector("#metric-scenario");
const metricScaleEl = document.querySelector("#metric-scale");
const metricVisibleEl = document.querySelector("#metric-visible");
const metricViewportEl = document.querySelector("#metric-viewport");
const metricRenderEl = document.querySelector("#metric-render");
const viewport = createPocViewport(canvas.width, canvas.height);

const controls = {
  panLeft: document.querySelector("#pan-left"),
  panRight: document.querySelector("#pan-right"),
  panUp: document.querySelector("#pan-up"),
  panDown: document.querySelector("#pan-down"),
  zoomOut: document.querySelector("#zoom-out"),
  zoomIn: document.querySelector("#zoom-in"),
};

const steps = [
  {
    id: "scenario",
    title: "Choose the story",
    detail: "Pick the scenario that matches how much graph scale you want to inspect.",
  },
  {
    id: "summary",
    title: "Read the proof cards",
    detail: "Check the active scale, nodes on screen, viewport response, and canvas response.",
  },
  {
    id: "navigate",
    title: "Move the scene once",
    detail: "Pan or zoom once to confirm the proof cards respond with the scene.",
  },
  {
    id: "hit-test",
    title: "Click any node",
    detail: "Confirm the current proof still supports direct hit detection on the canvas.",
  },
];

let engine;
let activeScenario = SCENARIOS[0];
let currentFixture = getFixture(activeScenario.size);
let completedSteps = new Set(["scenario"]);
let currentStep = "summary";

function setFlowStep(stepId) {
  if (stepId === "navigate") {
    completedSteps.add("summary");
  }
  if (stepId === "hit-test") {
    completedSteps.add("summary");
    completedSteps.add("navigate");
  }
  currentStep = stepId;
  renderGuidedSteps();
}

function renderGuidedSteps() {
  guidedStepsEl.innerHTML = "";

  for (const step of steps) {
    const item = document.createElement("li");
    item.className = "guided-step";

    if (completedSteps.has(step.id)) item.classList.add("is-complete");
    if (currentStep === step.id) item.classList.add("is-active");

    item.innerHTML = `
      <strong>${step.title}</strong>
      <span>${step.detail}</span>
    `;

    guidedStepsEl.appendChild(item);
  }

  const active = steps.find((step) => step.id === currentStep);
  flowStatusEl.textContent = active
    ? `Next: ${active.title} — ${active.detail}`
    : "You completed the guided flow. Switch scenarios to compare the product story again.";
}

function renderScenarioCards() {
  scenarioListEl.innerHTML = "";

  for (const scenario of SCENARIOS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scenario-card";
    button.dataset.scenarioId = scenario.id;

    if (scenario.id === activeScenario.id) {
      button.classList.add("is-active");
    }

    button.innerHTML = `
      <span class="scenario-card__label">${scenario.eyebrow}</span>
      <strong>${scenario.label}</strong>
      <span class="scenario-card__meta">${scenario.size} nodes</span>
      <small>${scenario.summary}</small>
    `;

    button.addEventListener("click", () => applyScenario(scenario.id));
    scenarioListEl.appendChild(button);
  }
}

function updateScenarioCopy() {
  scenarioTitleEl.textContent = activeScenario.label;
  scenarioSummaryEl.textContent = activeScenario.summary;
  scenarioProofEl.textContent = activeScenario.proof;
  scenarioWhyEl.textContent = activeScenario.why;
  stageCaptionEl.textContent = activeScenario.intro;
  flowIntroEl.textContent = `Follow these steps to explore the ${activeScenario.label.toLowerCase()} scenario.`;
}

function updateMetrics(metrics) {
  metricScenarioEl.textContent = activeScenario.label;
  metricScaleEl.textContent = `${metrics.fixtureSize} nodes · zoom ${metrics.zoom.toFixed(2)}`;
  metricVisibleEl.textContent = String(metrics.visibleCount);
  metricViewportEl.textContent = `${metrics.viewportUpdateMs.toFixed(3)} ms`;
  metricRenderEl.textContent = `${metrics.renderMs.toFixed(3)} ms`;
}

function loadCurrentFixture() {
  currentFixture = getFixture(activeScenario.size);
  engine.loadFixture(currentFixture);
}

function renderFrame() {
  const frame = engine.renderFrame(context, viewport, {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  });

  updateMetrics(frame.metrics);
}

function resetViewport() {
  viewport.x = activeScenario.defaultViewport.x;
  viewport.y = activeScenario.defaultViewport.y;
  viewport.zoom = activeScenario.defaultViewport.zoom;
}

function applyScenario(scenarioId) {
  activeScenario = SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? SCENARIOS[0];
  completedSteps = new Set(["scenario"]);
  currentStep = "summary";
  hitResultEl.textContent = "Step 4: click any node to confirm hit detection.";

  updateScenarioCopy();
  renderScenarioCards();
  renderGuidedSteps();
  resetViewport();
  loadCurrentFixture();
  renderFrame();
}

function nudgeNavigation() {
  if (currentStep === "summary") {
    setFlowStep("navigate");
  }
}

const panStep = 80;
controls.panLeft.addEventListener("click", () => {
  viewport.x = Math.max(0, viewport.x - panStep / viewport.zoom);
  nudgeNavigation();
  renderFrame();
});
controls.panRight.addEventListener("click", () => {
  viewport.x += panStep / viewport.zoom;
  nudgeNavigation();
  renderFrame();
});
controls.panUp.addEventListener("click", () => {
  viewport.y = Math.max(0, viewport.y - panStep / viewport.zoom);
  nudgeNavigation();
  renderFrame();
});
controls.panDown.addEventListener("click", () => {
  viewport.y += panStep / viewport.zoom;
  nudgeNavigation();
  renderFrame();
});
controls.zoomOut.addEventListener("click", () => {
  viewport.zoom = Math.max(0.5, viewport.zoom - 0.25);
  nudgeNavigation();
  renderFrame();
});
controls.zoomIn.addEventListener("click", () => {
  viewport.zoom = Math.min(4, viewport.zoom + 0.25);
  nudgeNavigation();
  renderFrame();
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
  setFlowStep("hit-test");
});

try {
  engine = await createPocEngine();
  updateScenarioCopy();
  renderScenarioCards();
  renderGuidedSteps();
  resetViewport();
  loadCurrentFixture();
  renderFrame();
} catch (error) {
  metricScenarioEl.textContent = "WASM unavailable";
  metricScaleEl.textContent = "Build required";
  metricVisibleEl.textContent = "—";
  metricViewportEl.textContent = "—";
  metricRenderEl.textContent = "—";
  flowStatusEl.textContent = "Build the WASM module first, then reload the page.";
  hitResultEl.textContent = "Build the WASM module with `pnpm build:wasm:poc` and reload the page.";
  console.error(error);
}
