import { getFixture } from "../../../benchmarks/fixtures.js";
import { createPocEngine, createPocViewport, type PocEngine, type PocMetrics, type PocNode, type PocViewport } from "../../../packages/sdk/src/index.js";

type Scenario = {
  id: string;
  size: number;
  eyebrow: string;
  label: string;
  summary: string;
  proof: string;
  why: string;
  intro: string;
  defaultViewport: Pick<PocViewport, "x" | "y" | "zoom">;
};

type WorkflowField = {
  label: string;
  value: string;
};

type WorkflowConfigGroup = {
  title: string;
  fields: WorkflowField[];
};

type WorkflowNode = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  why: string;
  configGroups: WorkflowConfigGroup[];
  example: string;
};

type GuidedStep = {
  id: "scenario" | "summary" | "navigate" | "hit-test";
  title: string;
  detail: string;
};

type RequiredElementMap = {
  "#poc-canvas": HTMLCanvasElement;
  "#scenario-list": HTMLDivElement;
  "#scenario-title": HTMLElement;
  "#scenario-summary": HTMLElement;
  "#scenario-proof": HTMLElement;
  "#scenario-why": HTMLElement;
  "#stage-caption": HTMLElement;
  "#hit-result": HTMLElement;
  "#flow-intro": HTMLElement;
  "#guided-steps": HTMLOListElement;
  "#flow-status": HTMLElement;
  "#metric-scenario": HTMLElement;
  "#metric-scale": HTMLElement;
  "#metric-visible": HTMLElement;
  "#metric-viewport": HTMLElement;
  "#metric-render": HTMLElement;
  "#inspector-node-title": HTMLElement;
  "#inspector-node-subtitle": HTMLElement;
  "#inspector-node-description": HTMLElement;
  "#inspector-node-why": HTMLElement;
  "#inspector-config-groups": HTMLDivElement;
  "#inspector-example": HTMLPreElement;
  "#workflow-outline": HTMLDivElement;
  "#pan-left": HTMLButtonElement;
  "#pan-right": HTMLButtonElement;
  "#pan-up": HTMLButtonElement;
  "#pan-down": HTMLButtonElement;
  "#zoom-out": HTMLButtonElement;
  "#zoom-in": HTMLButtonElement;
};

const SCENARIOS: Scenario[] = [
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

const WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: 1,
    title: "Task Brief",
    subtitle: "Input · Configured",
    description: "Receives the incoming user task before planning, tools, or memory steps begin.",
    why: "This keeps the flow grounded in a concrete operator request instead of an abstract graph node.",
    configGroups: [
      {
        title: "Source",
        fields: [
          { label: "Type", value: "Task intake" },
          { label: "Primary fields", value: "goal, constraints, context" },
        ],
      },
      {
        title: "Example payload",
        fields: [
          { label: "Goal", value: "Refactor the auth flow" },
          { label: "Context", value: "React app + shared UI kit" },
        ],
      },
    ],
    example: `{
  "goal": "Refactor the auth flow",
  "constraints": ["keep behavior stable", "preserve current routes"],
  "context": "React app + shared UI kit"
}`,
  },
  {
    id: 2,
    title: "Planner Agent",
    subtitle: "AI step · Configured",
    description: "Breaks the incoming task into steps before execution begins.",
    why: "If this step is unclear, the evaluator cannot see how the workflow becomes operationally useful.",
    configGroups: [
      {
        title: "Planning",
        fields: [
          { label: "Model", value: "gpt-5.4-mini" },
          { label: "Plan depth", value: "Medium" },
        ],
      },
      {
        title: "Outputs",
        fields: [{ label: "Generated", value: "Plan, substeps, risk notes" }],
      },
    ],
    example: "Plan ready: auth audit -> route mapping -> component refactor",
  },
  {
    id: 3,
    title: "Delegation Router",
    subtitle: "Logic step · Rules active",
    description: "Routes work to the right agent lane or execution path.",
    why: "This is where the workflow stops being generic AI and starts looking like a real agent product.",
    configGroups: [
      {
        title: "Routing rules",
        fields: [
          { label: "Planning + low risk", value: "Direct executor" },
          { label: "Cross-cutting + risky", value: "Architect review" },
          { label: "Fallback", value: "Manual triage" },
        ],
      },
    ],
    example: "Route selected: executor + reviewer lane",
  },
  {
    id: 4,
    title: "Memory Retrieval",
    subtitle: "Tool step · Search ready",
    description: "Pulls relevant project memory and prior context before action.",
    why: "It shows that the workflow can use stored context instead of acting without grounding.",
    configGroups: [
      {
        title: "Search settings",
        fields: [
          { label: "Mode", value: "Hybrid retrieval" },
          { label: "Source", value: "Project memory + docs" },
        ],
      },
    ],
    example: "Matched context: auth-guidelines, component-map",
  },
  {
    id: 5,
    title: "Tool Executor",
    subtitle: "Tool step · Connected",
    description: "Runs code, shell, or API tools and returns execution output.",
    why: "The same agent surface should show where tool execution happens, not only reasoning steps.",
    configGroups: [
      {
        title: "Execution",
        fields: [
          { label: "Tools", value: "shell, grep, codeintel" },
          { label: "Sandbox", value: "Scoped" },
        ],
      },
      {
        title: "Returned fields",
        fields: [{ label: "Fields", value: "stdout, diagnostics, artifacts" }],
      },
    ],
    example: "Tool result: typecheck passed, patch artifact generated",
  },
  {
    id: 6,
    title: "Manager Response",
    subtitle: "AI step · Draft ready",
    description: "Generates the operator-facing response after planning, memory, and tool execution.",
    why: "This is where the evaluator sees the workflow create visible product value, not just move data around.",
    configGroups: [
      {
        title: "Response settings",
        fields: [
          { label: "Tone", value: "Concise operator" },
          { label: "Output", value: "Answer + execution trace" },
        ],
      },
    ],
    example: "Draft ready: recommended patch + execution summary",
  },
  {
    id: 7,
    title: "Human Review",
    subtitle: "Output step · Human review",
    description: "Packages the draft and route decision for a final operator review.",
    why: "It reassures evaluators that the flow supports human control instead of pretending everything is fully autonomous.",
    configGroups: [
      {
        title: "Review policy",
        fields: [
          { label: "Approval required", value: "Yes" },
          { label: "Escalation path", value: "Operator handoff" },
        ],
      },
    ],
    example: "Ready for operator approval",
  },
];

const steps: GuidedStep[] = [
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

function queryRequiredElement<TSelector extends keyof RequiredElementMap>(selector: TSelector): RequiredElementMap[TSelector] {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as RequiredElementMap[TSelector];
}

function getFixtureNodes(size: number): PocNode[] {
  return getFixture(size) as PocNode[];
}

function getBackgroundWorkflowNode(selectedId: number): WorkflowNode {
  return {
    id: selectedId,
    title: `Supporting workflow step ${selectedId}`,
    subtitle: "Background step · Generic",
    description: "This node is part of the wider graph density, but it is not one of the core product-story steps.",
    why: "It helps demonstrate that the workflow remains readable even when not every visible node is a named hero step.",
    configGroups: [
      {
        title: "Current role",
        fields: [
          { label: "Type", value: "Background workflow step" },
          { label: "Purpose", value: "Adds realistic graph density around the main path" },
        ],
      },
    ],
    example: "No dedicated preview for this background step.",
  };
}

const canvas = queryRequiredElement("#poc-canvas");
const context = canvas.getContext("2d");
if (!context) {
  throw new Error("Canvas 2D context is unavailable.");
}

const scenarioListEl = queryRequiredElement("#scenario-list");
const scenarioTitleEl = queryRequiredElement("#scenario-title");
const scenarioSummaryEl = queryRequiredElement("#scenario-summary");
const scenarioProofEl = queryRequiredElement("#scenario-proof");
const scenarioWhyEl = queryRequiredElement("#scenario-why");
const stageCaptionEl = queryRequiredElement("#stage-caption");
const hitResultEl = queryRequiredElement("#hit-result");
const flowIntroEl = queryRequiredElement("#flow-intro");
const guidedStepsEl = queryRequiredElement("#guided-steps");
const flowStatusEl = queryRequiredElement("#flow-status");
const metricScenarioEl = queryRequiredElement("#metric-scenario");
const metricScaleEl = queryRequiredElement("#metric-scale");
const metricVisibleEl = queryRequiredElement("#metric-visible");
const metricViewportEl = queryRequiredElement("#metric-viewport");
const metricRenderEl = queryRequiredElement("#metric-render");
const inspectorNodeTitleEl = queryRequiredElement("#inspector-node-title");
const inspectorNodeSubtitleEl = queryRequiredElement("#inspector-node-subtitle");
const inspectorNodeDescriptionEl = queryRequiredElement("#inspector-node-description");
const inspectorNodeWhyEl = queryRequiredElement("#inspector-node-why");
const inspectorConfigGroupsEl = queryRequiredElement("#inspector-config-groups");
const inspectorExampleEl = queryRequiredElement("#inspector-example");
const workflowOutlineEl = queryRequiredElement("#workflow-outline");
const viewport = createPocViewport(canvas.width, canvas.height);

const controls = {
  panLeft: queryRequiredElement("#pan-left"),
  panRight: queryRequiredElement("#pan-right"),
  panUp: queryRequiredElement("#pan-up"),
  panDown: queryRequiredElement("#pan-down"),
  zoomOut: queryRequiredElement("#zoom-out"),
  zoomIn: queryRequiredElement("#zoom-in"),
};

let engine: PocEngine;
let activeScenario = SCENARIOS[0];
let currentFixture = getFixtureNodes(activeScenario.size);
let completedSteps = new Set<GuidedStep["id"]>(["scenario"]);
let currentStep: GuidedStep["id"] = "summary";
let selectedNodeId = WORKFLOW_NODES[0].id;

function setFlowStep(stepId: GuidedStep["id"]): void {
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

function renderGuidedSteps(): void {
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

function renderScenarioCards(): void {
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

function getSelectedNode(): WorkflowNode {
  return WORKFLOW_NODES.find((node) => node.id === selectedNodeId) ?? getBackgroundWorkflowNode(selectedNodeId);
}

function renderWorkflowOutline(): void {
  workflowOutlineEl.innerHTML = "";

  for (const node of WORKFLOW_NODES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workflow-outline__item";

    if (node.id === selectedNodeId) {
      button.classList.add("is-active");
    }

    button.innerHTML = `
      <strong>${node.title}</strong>
      <span>${node.subtitle}</span>
    `;
    button.addEventListener("click", () => {
      selectedNodeId = node.id;
      renderWorkflowOutline();
      renderInspector();
    });
    workflowOutlineEl.appendChild(button);
  }
}

function renderInspector(): void {
  const node = getSelectedNode();
  inspectorNodeTitleEl.textContent = node.title;
  inspectorNodeSubtitleEl.textContent = node.subtitle;
  inspectorNodeDescriptionEl.textContent = node.description;
  inspectorNodeWhyEl.textContent = node.why;

  inspectorConfigGroupsEl.innerHTML = "";
  for (const group of node.configGroups) {
    const section = document.createElement("section");
    section.className = "config-group";
    section.innerHTML = `<h5>${group.title}</h5>`;

    for (const field of group.fields) {
      const row = document.createElement("div");
      row.className = "config-row";
      row.innerHTML = `
        <span class="config-label">${field.label}</span>
        <strong class="config-value">${field.value}</strong>
      `;
      section.appendChild(row);
    }

    inspectorConfigGroupsEl.appendChild(section);
  }

  inspectorExampleEl.textContent = node.example;
}

function updateScenarioCopy(): void {
  scenarioTitleEl.textContent = activeScenario.label;
  scenarioSummaryEl.textContent = activeScenario.summary;
  scenarioProofEl.textContent = activeScenario.proof;
  scenarioWhyEl.textContent = activeScenario.why;
  stageCaptionEl.textContent = activeScenario.intro;
  flowIntroEl.textContent = `Follow these steps to explore the ${activeScenario.label.toLowerCase()} scenario.`;
}

function updateMetrics(metrics: PocMetrics): void {
  metricScenarioEl.textContent = activeScenario.label;
  metricScaleEl.textContent = `${metrics.fixtureSize} nodes · zoom ${metrics.zoom.toFixed(2)}`;
  metricVisibleEl.textContent = String(metrics.visibleCount);
  metricViewportEl.textContent = `${metrics.viewportUpdateMs.toFixed(3)} ms`;
  metricRenderEl.textContent = `${metrics.renderMs.toFixed(3)} ms`;
}

function loadCurrentFixture(): void {
  currentFixture = getFixtureNodes(activeScenario.size);
  engine.loadFixture(currentFixture);
}

function renderFrame(): void {
  const frame = engine.renderFrame(context, viewport, {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  });

  updateMetrics(frame.metrics);
}

function resetViewport(): void {
  viewport.x = activeScenario.defaultViewport.x;
  viewport.y = activeScenario.defaultViewport.y;
  viewport.zoom = activeScenario.defaultViewport.zoom;
}

function applyScenario(scenarioId: string): void {
  activeScenario = SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? SCENARIOS[0];
  completedSteps = new Set<GuidedStep["id"]>(["scenario"]);
  currentStep = "summary";
  selectedNodeId = WORKFLOW_NODES[0].id;
  hitResultEl.textContent = "Step 4: click any node to confirm hit detection.";

  updateScenarioCopy();
  renderScenarioCards();
  renderGuidedSteps();
  renderWorkflowOutline();
  renderInspector();
  resetViewport();
  loadCurrentFixture();
  renderFrame();
}

function nudgeNavigation(): void {
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
  if (hit !== null) {
    selectedNodeId = hit;
    renderWorkflowOutline();
    renderInspector();
  }
  setFlowStep("hit-test");
});

try {
  engine = await createPocEngine();
  updateScenarioCopy();
  renderScenarioCards();
  renderGuidedSteps();
  renderWorkflowOutline();
  renderInspector();
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
  hitResultEl.textContent = "Build the WASM module with `pnpm run build:wasm` and reload the page.";
  console.error(error);
}
