import { useMemo, useState } from "react";
import { FIXTURE_SIZES, getFixture } from "../../../benchmarks/fixtures.js";
import { HyperFlowPocCanvas, createPocViewport, type PocMetrics, type PocNode, type PocViewport } from "@hyperflow/react";

type Scenario = {
  id: number;
  label: string;
  subtitle: string;
  summary: string;
  proof: string;
  why: string;
  defaultNodeId: number;
};

type WorkflowDetails = {
  title: string;
  status: string;
  summary: string;
  description: string;
  why: string;
  configGroups: { title: string; fields: { label: string; value: string }[] }[];
  example: string;
};

type InteractionMode = "inspect" | "read-only";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const STARTER_SCENARIOS: Scenario[] = [
  {
    id: 100,
    label: "Fast first proof",
    subtitle: "Starter-like small graph",
    summary: "Use the smallest fixture to understand the React starter shell before you inspect scale.",
    proof: "Shows that the same current slice can power a React toolbar/canvas/inspector surface without pretending the full Starter Kit already exists.",
    why: "Best for quickly validating that the new product proof reads like a workflow builder, not only a renderer demo.",
    defaultNodeId: 1,
  },
  {
    id: 300,
    label: "Mid graph check",
    subtitle: "Bigger proof with same shell",
    summary: "Move to a denser fixture and confirm the starter shell still feels readable.",
    proof: "Demonstrates that the thin React surface keeps the same product story while the graph grows.",
    why: "Useful for checking whether the shell still feels product-like beyond the smallest case.",
    defaultNodeId: 3,
  },
  {
    id: 1000,
    label: "Dense graph tour",
    subtitle: "Stress the current slice",
    summary: "Inspect the largest current fixture to understand the outer limit of this bounded proof slice.",
    proof: "Shows the React starter shell under the heaviest shared demo fixture without widening scope into full editor features.",
    why: "Best for judging how honest and useful the thin slice still feels at the edge of the current proof.",
    defaultNodeId: 6,
  },
];

const WORKFLOW_DETAILS = new Map<number, WorkflowDetails>([
  [
    1,
    {
      title: "Customer Ticket",
      status: "Input · Ready",
      summary: "Starting node for incoming support work.",
      description: "Receives the incoming support request before any automation begins.",
      why: "Keeps the workflow grounded in a concrete customer problem instead of an abstract graph.",
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
      example: `{"subject": "Refund request", "customer_id": "cus_2048"}`,
    },
  ],
  [
    2,
    {
      title: "Intent Classifier",
      status: "AI step · Configured",
      summary: "Classifies request intent before routing.",
      description: "Maps the incoming request into a bounded label set so the workflow can choose the next route.",
      why: "Shows that the starter proof is tied to an operational workflow step instead of generic AI branding.",
      configGroups: [
        {
          title: "Model",
          fields: [
            { label: "Model", value: "gpt-5.4-mini" },
            { label: "Confidence threshold", value: "0.80" },
          ],
        },
      ],
      example: "Intent: Billing · Confidence: 0.93",
    },
  ],
  [
    3,
    {
      title: "Priority Router",
      status: "Logic step · Active",
      summary: "Maps urgency and account tier to a route.",
      description: "Routes work using simple product rules instead of exposing raw graph mechanics.",
      why: "This is where the product proof starts to look like a real operations workflow.",
      configGroups: [
        {
          title: "Routing rules",
          fields: [
            { label: "Billing + urgent", value: "Escalate" },
            { label: "Fallback", value: "Standard queue" },
          ],
        },
      ],
      example: "Route selected: Billing queue",
    },
  ],
  [
    4,
    {
      title: "Knowledge Search",
      status: "Tool step · Search ready",
      summary: "Adds help-center context before drafting.",
      description: "Pulls relevant internal knowledge before any reply is drafted.",
      why: "Shows that the inspector is grounded in product logic, not only box coordinates.",
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
  ],
  [
    5,
    {
      title: "CRM Lookup",
      status: "Tool step · Context ready",
      summary: "Fetches plan and support tier context.",
      description: "Loads customer context that changes how the request should be handled.",
      why: "Makes the workflow feel product-specific rather than a generic canvas toy.",
      configGroups: [
        {
          title: "Lookup",
          fields: [
            { label: "Source", value: "CRM" },
            { label: "Key", value: "customer_id" },
          ],
        },
      ],
      example: "Plan: Pro · Support tier: Priority",
    },
  ],
  [
    6,
    {
      title: "Draft Response",
      status: "AI step · Draft ready",
      summary: "Generates an agent-ready reply draft.",
      description: "Packages the routed context into a visible product outcome.",
      why: "This is the clearest value-creation step in the current bounded proof.",
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
  ],
  [
    7,
    {
      title: "Review Output",
      status: "Output · Human review",
      summary: "Packages the result for approval.",
      description: "Shows the workflow ending in a human-controlled review step.",
      why: "Keeps the proof honest about bounded autonomy and operational control.",
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
  ],
]);

const WORKFLOW_SEQUENCE = Array.from(WORKFLOW_DETAILS.keys());

function getDefaultViewport() {
  return createPocViewport(CANVAS_WIDTH, CANVAS_HEIGHT, { x: 0, y: 0, zoom: 1 });
}

function fitViewport(nodes: PocNode[]): PocViewport {
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));
  const padding = 48;
  const zoom = Math.min(
    CANVAS_WIDTH / (maxX - minX + padding * 2),
    CANVAS_HEIGHT / (maxY - minY + padding * 2),
  );

  return createPocViewport(CANVAS_WIDTH, CANVAS_HEIGHT, {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    zoom: Math.max(0.35, Math.min(zoom, 1.25)),
  });
}

function focusViewportOnNode(node: PocNode, currentViewport: PocViewport): PocViewport {
  const zoom = Math.max(currentViewport.zoom, 0.7);
  const centeredX = Math.max(0, node.x + node.width / 2 - CANVAS_WIDTH / (2 * zoom));
  const centeredY = Math.max(0, node.y + node.height / 2 - CANVAS_HEIGHT / (2 * zoom));

  return createPocViewport(CANVAS_WIDTH, CANVAS_HEIGHT, {
    x: centeredX,
    y: centeredY,
    zoom,
  });
}

function getSelectedNodeDetails(node: PocNode | undefined, scenarioSize: number): WorkflowDetails {
  if (!node) {
    return {
      title: "No node selected",
      status: "Read-only starter proof",
      summary: "Switch to Inspect mode and click a node on the canvas to inspect the current validated slice.",
      description: "The bounded React starter now supports a real read-only overview mode alongside click-based node inspection.",
      why: "This keeps the surface product-like without pretending full editing exists yet.",
      configGroups: [
        {
          title: "Current scope",
          fields: [
            { label: "Fixture size", value: String(scenarioSize) },
            { label: "Mode", value: "Read-only overview" },
          ],
        },
      ],
      example: "Select Inspect mode to bind the inspector to a real node.",
    };
  }

  const details = WORKFLOW_DETAILS.get(node.id);
  if (details) return details;

  return {
    title: `Workflow Step ${node.id}`,
    status: "Generated proof node",
    summary: `Grid-backed PoC node rendered through the current HyperFlow slice at (${Math.round(node.x)}, ${Math.round(node.y)}).`,
    description: "This node comes from the shared grid fixture and proves that the React starter shell is bound to the real current slice.",
    why: "Useful for confirming that the inspector remains tied to actual rendered nodes even outside the named workflow steps.",
    configGroups: [
      {
        title: "Fixture details",
        fields: [
          { label: "Width × height", value: `${Math.round(node.width)} × ${Math.round(node.height)}` },
          { label: "Scenario size", value: String(scenarioSize) },
        ],
      },
    ],
    example: `Node ${node.id} @ (${Math.round(node.x)}, ${Math.round(node.y)})`,
  };
}

function getScenarioBySize(size: number) {
  return STARTER_SCENARIOS.find((scenario) => scenario.id === size) ?? STARTER_SCENARIOS[0];
}

export function App() {
  const [scenarioSize, setScenarioSize] = useState(FIXTURE_SIZES[0]);
  const nodes = useMemo(() => getFixture(scenarioSize), [scenarioSize]);
  const [viewport, setViewport] = useState<PocViewport>(() => getDefaultViewport());
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(1);
  const [metrics, setMetrics] = useState<PocMetrics | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<InteractionMode>("inspect");

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedNodeDetails = getSelectedNodeDetails(mode === "inspect" ? selectedNode : undefined, scenarioSize);
  const activeScenario = getScenarioBySize(scenarioSize);

  function handleScenarioChange(size: number) {
    setScenarioSize(size);
    const nextNodes = getFixture(size);
    const nextScenario = getScenarioBySize(size);
    setViewport(fitViewport(nextNodes));
    setSelectedNodeId(nextScenario.defaultNodeId ?? nextNodes[0]?.id ?? null);
  }

  function zoomBy(multiplier: number) {
    setViewport((current) => ({
      ...current,
      zoom: Math.max(0.35, Math.min(current.zoom * multiplier, 1.8)),
    }));
  }

  function setInteractionMode(nextMode: InteractionMode) {
    setMode(nextMode);
    if (nextMode === "inspect" && selectedNodeId === null) {
      setSelectedNodeId(activeScenario.defaultNodeId ?? nodes[0]?.id ?? null);
    }
  }

  function focusSelectedNode() {
    if (!selectedNode) return;
    setMode("inspect");
    setViewport(focusViewportOnNode(selectedNode, viewport));
  }

  function jumpToNode(nodeId: number) {
    const nextNode = nodes.find((node) => node.id === nodeId);
    if (!nextNode) return;
    setMode("inspect");
    setSelectedNodeId(nodeId);
    setViewport(focusViewportOnNode(nextNode, viewport));
  }

  return (
    <main className="starter-shell">
      <header className="starter-toolbar">
        <div>
          <p className="eyebrow">HyperFlow React thin slice</p>
          <h1>Starter-like workflow builder surface</h1>
          <p className="toolbar-copy">
            This proof keeps the scope honest: toolbar, canvas, and inspector on top of the current validated HyperFlow slice.
          </p>
        </div>

        <div className="toolbar-actions">
          <div className="toolbar-group">
            {STARTER_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                className={scenario.id === scenarioSize ? "active" : ""}
                onClick={() => handleScenarioChange(scenario.id)}
                type="button"
              >
                <strong>{scenario.label}</strong>
                <span>{scenario.subtitle}</span>
              </button>
            ))}
          </div>

          <div className="toolbar-group compact">
            <button type="button" className={mode === "inspect" ? "active" : ""} onClick={() => setInteractionMode("inspect")}>Inspect mode</button>
            <button type="button" className={mode === "read-only" ? "active" : ""} onClick={() => setInteractionMode("read-only")}>Read-only overview</button>
            <button type="button" onClick={focusSelectedNode} disabled={!selectedNode}>Focus selected</button>
            <button type="button" onClick={() => setViewport(fitViewport(nodes))}>Fit view</button>
            <button type="button" onClick={() => zoomBy(0.85)}>Zoom out</button>
            <button type="button" onClick={() => zoomBy(1.15)}>Zoom in</button>
          </div>
        </div>
      </header>

      <section className="starter-content">
        <section className="starter-canvas-card">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Canvas proof</p>
              <h2>React-rendered current slice</h2>
            </div>
            <div className="panel-badges">
              <span>{ready ? "Engine ready" : "Loading engine"}</span>
              <span>{scenarioSize} nodes</span>
              <span>{mode === "inspect" ? "Interactive inspect" : "Read-only view"}</span>
              {selectedNode ? <span>Selected: {selectedNodeDetails.title}</span> : null}
              {metrics ? <span>{metrics.visibleCount} visible</span> : null}
            </div>
          </div>

          <HyperFlowPocCanvas
            className="starter-canvas"
            nodes={nodes}
            viewport={viewport}
            selectedNodeId={mode === "inspect" ? selectedNodeId : null}
            interactive={mode === "inspect"}
            onNodeSelect={setSelectedNodeId}
            onMetricsChange={setMetrics}
            onReadyChange={setReady}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          />

          <p className="canvas-caption">
            {mode === "inspect"
              ? "Click any visible node or use the quick jump buttons to drive the inspector and focus the viewport."
              : "Read-only overview keeps the shell product-like without pretending full editing exists yet."}
          </p>

          <div className="metrics-strip">
            <div>
              <span>Fixture</span>
              <strong>{metrics?.fixtureSize ?? scenarioSize}</strong>
            </div>
            <div>
              <span>Visible</span>
              <strong>{metrics?.visibleCount ?? "—"}</strong>
            </div>
            <div>
              <span>Viewport</span>
              <strong>{metrics ? `${metrics.x.toFixed(0)}, ${metrics.y.toFixed(0)} @ ${metrics.zoom.toFixed(2)}` : "—"}</strong>
            </div>
            <div>
              <span>Render</span>
              <strong>{metrics ? `${metrics.renderMs.toFixed(2)} ms` : "—"}</strong>
            </div>
          </div>
        </section>

        <aside className="starter-inspector-card">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Inspector</p>
              <h2>{mode === "inspect" ? selectedNodeDetails.title : activeScenario.label}</h2>
            </div>
            <span className="status-chip">{mode === "inspect" ? selectedNodeDetails.status : "Read-only scenario overview"}</span>
          </div>

          <section className="quick-jump-card">
            <div className="quick-jump-header">
              <div>
                <p className="panel-eyebrow">Guided jump</p>
                <h3>Focus key workflow steps</h3>
              </div>
              <button type="button" onClick={() => jumpToNode(activeScenario.defaultNodeId)}>Jump to scenario focus</button>
            </div>
            <div className="quick-jump-list">
              {WORKFLOW_SEQUENCE.map((nodeId) => {
                const details = WORKFLOW_DETAILS.get(nodeId)!;
                const isActive = mode === "inspect" && selectedNodeId === nodeId;
                return (
                  <button
                    key={nodeId}
                    type="button"
                    className={isActive ? "active" : ""}
                    onClick={() => jumpToNode(nodeId)}
                  >
                    <strong>{details.title}</strong>
                    <span>{details.status}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {mode === "read-only" ? (
            <>
              <p className="inspector-summary">{activeScenario.summary}</p>

              <div className="scenario-proof-card">
                <h3>Proof focus</h3>
                <p>{activeScenario.proof}</p>
              </div>

              <div className="scenario-proof-card">
                <h3>Why this scenario</h3>
                <p>{activeScenario.why}</p>
              </div>

              <dl className="inspector-grid">
                <div>
                  <dt>Mode</dt>
                  <dd>Read-only overview</dd>
                </div>
                <div>
                  <dt>Fixture size</dt>
                  <dd>{scenarioSize}</dd>
                </div>
                <div>
                  <dt>Visible nodes</dt>
                  <dd>{metrics?.visibleCount ?? "—"}</dd>
                </div>
                <div>
                  <dt>Current proof</dt>
                  <dd>Toolbar + canvas + inspector</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <p className="inspector-summary">{selectedNodeDetails.summary}</p>
              <p className="inspector-description">{selectedNodeDetails.description}</p>
              <div className="scenario-proof-card emphasis">
                <h3>Why this node matters</h3>
                <p>{selectedNodeDetails.why}</p>
              </div>

              <dl className="inspector-grid">
                <div>
                  <dt>Selected node</dt>
                  <dd>{selectedNode?.id ?? "None"}</dd>
                </div>
                <div>
                  <dt>Coordinates</dt>
                  <dd>{selectedNode ? `${Math.round(selectedNode.x)}, ${Math.round(selectedNode.y)}` : "—"}</dd>
                </div>
                <div>
                  <dt>Canvas status</dt>
                  <dd>{ready ? "Connected" : "Loading"}</dd>
                </div>
                <div>
                  <dt>Interaction scope</dt>
                  <dd>Click-based proof</dd>
                </div>
              </dl>

              <div className="config-groups">
                {selectedNodeDetails.configGroups.map((group) => (
                  <section key={group.title} className="config-group-card">
                    <h3>{group.title}</h3>
                    <dl>
                      {group.fields.map((field) => (
                        <div key={`${group.title}-${field.label}`}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>

              <div className="scenario-proof-card code-card">
                <h3>Example output</h3>
                <pre>{selectedNodeDetails.example}</pre>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
