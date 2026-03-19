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

const WORKFLOW_NODES = [
  {
    id: 1,
    title: "Customer Ticket",
    subtitle: "Input · Configured",
    description: "Receives the incoming support request before any automation begins.",
    why: "This keeps the flow grounded in a real customer problem instead of an abstract test graph.",
    configGroups: [
      {
        title: "Source",
        fields: [
          { label: "Type", value: "Support form" },
          { label: "Primary fields", value: "subject, message, customer_id" },
        ],
      },
      {
        title: "Example payload",
        fields: [
          { label: "Subject", value: "Refund request" },
          { label: "Customer", value: "cus_2048" },
        ],
      },
    ],
    example: `{\n  "subject": "Refund request",\n  "message": "I was charged twice this month.",\n  "customer_id": "cus_2048"\n}`,
  },
  {
    id: 2,
    title: "Intent Classifier",
    subtitle: "AI step · Configured",
    description: "Classifies the incoming request so the workflow can choose the right route.",
    why: "If this step is unclear, the evaluator cannot see how the workflow becomes operationally useful.",
    configGroups: [
      {
        title: "Model",
        fields: [
          { label: "Model", value: "gpt-5.4-mini" },
          { label: "Confidence threshold", value: "0.80" },
        ],
      },
      {
        title: "Labels",
        fields: [
          { label: "Enabled", value: "Billing, Technical, Account, General" },
        ],
      },
    ],
    example: "Intent: Billing\nConfidence: 0.93",
  },
  {
    id: 3,
    title: "Priority Router",
    subtitle: "Logic step · Rules active",
    description: "Routes the request based on urgency, intent, and account context.",
    why: "This is where the workflow stops being generic AI and starts looking like an operational support system.",
    configGroups: [
      {
        title: "Routing rules",
        fields: [
          { label: "Billing + urgent", value: "Escalate" },
          { label: "Technical + enterprise", value: "Priority support" },
          { label: "Fallback", value: "Standard queue" },
        ],
      },
    ],
    example: "Route selected: Billing queue",
  },
  {
    id: 4,
    title: "Knowledge Search",
    subtitle: "Tool step · Search ready",
    description: "Pulls relevant help-center context before a reply is drafted.",
    why: "It shows that the workflow can use internal knowledge instead of generating unsupported answers.",
    configGroups: [
      {
        title: "Search settings",
        fields: [
          { label: "Mode", value: "Hybrid search" },
          { label: "Source", value: "Help center + policies" },
        ],
      },
    ],
    example: "Matched docs: refund-policy, duplicate-charge-faq",
  },
  {
    id: 5,
    title: "CRM Lookup",
    subtitle: "Tool step · Customer context",
    description: "Fetches plan and support-tier context for the current customer.",
    why: "The same issue should feel different for priority customers versus standard accounts.",
    configGroups: [
      {
        title: "Lookup",
        fields: [
          { label: "Source", value: "CRM" },
          { label: "Key", value: "customer_id" },
        ],
      },
      {
        title: "Returned fields",
        fields: [
          { label: "Fields", value: "plan, status, support tier" },
        ],
      },
    ],
    example: "Plan: Pro\nSupport tier: Priority",
  },
  {
    id: 6,
    title: "Draft Response",
    subtitle: "AI step · Draft ready",
    description: "Generates an agent-ready support draft using the routed context and tool outputs.",
    why: "This is where the evaluator sees the workflow create visible product value, not just move data around.",
    configGroups: [
      {
        title: "Response settings",
        fields: [
          { label: "Tone", value: "Support-friendly" },
          { label: "Output", value: "Draft reply + internal notes" },
        ],
      },
    ],
    example: "Draft ready: refund-policy-based response generated",
  },
  {
    id: 7,
    title: "Review Output",
    subtitle: "Output step · Human review",
    description: "Packages the draft and route decision for a final support-agent review.",
    why: "It reassures evaluators that the flow supports human control instead of pretending everything is fully autonomous.",
    configGroups: [
      {
        title: "Review policy",
        fields: [
          { label: "Approval required", value: "Yes" },
          { label: "Escalation path", value: "Billing queue" },
        ],
      },
    ],
    example: "Ready for billing-team approval",
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
const inspectorNodeTitleEl = document.querySelector("#inspector-node-title");
const inspectorNodeSubtitleEl = document.querySelector("#inspector-node-subtitle");
const inspectorNodeDescriptionEl = document.querySelector("#inspector-node-description");
const inspectorNodeWhyEl = document.querySelector("#inspector-node-why");
const inspectorConfigGroupsEl = document.querySelector("#inspector-config-groups");
const inspectorExampleEl = document.querySelector("#inspector-example");
const workflowOutlineEl = document.querySelector("#workflow-outline");
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
let selectedNodeId = WORKFLOW_NODES[0].id;

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

function getSelectedNode() {
  return WORKFLOW_NODES.find((node) => node.id === selectedNodeId) ?? {
    id: selectedNodeId,
    title: `Supporting workflow step ${selectedNodeId}`,
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

function renderWorkflowOutline() {
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

function renderInspector() {
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
  hitResultEl.textContent = "Build the WASM module with `pnpm build:wasm:poc` and reload the page.";
  console.error(error);
}
