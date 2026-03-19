import { useMemo, useState } from "react";
import { FIXTURE_SIZES, getFixture } from "../../../benchmarks/fixtures.js";
import { HyperFlowPocCanvas, createPocViewport, type PocMetrics, type PocNode, type PocViewport } from "@hyperflow/react";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const STARTER_SCENARIOS = [
  { id: 100, label: "Fast first proof", subtitle: "Starter-like small graph" },
  { id: 300, label: "Mid graph check", subtitle: "Bigger proof with same shell" },
  { id: 1000, label: "Dense graph tour", subtitle: "Stress the current slice" },
];

const WORKFLOW_LABELS = [
  [1, { title: "Customer Ticket", status: "Input · Ready", summary: "Starting node for incoming support work." }],
  [2, { title: "Intent Classifier", status: "AI step · Configured", summary: "Classifies request intent before routing." }],
  [3, { title: "Priority Router", status: "Logic step · Active", summary: "Maps urgency and account tier to a route." }],
  [4, { title: "Knowledge Search", status: "Tool step · Search ready", summary: "Adds help-center context before drafting." }],
  [5, { title: "CRM Lookup", status: "Tool step · Context ready", summary: "Fetches plan and support tier context." }],
  [6, { title: "Draft Response", status: "AI step · Draft ready", summary: "Generates an agent-ready reply draft." }],
  [7, { title: "Review Output", status: "Output · Human review", summary: "Packages the result for approval." }],
];

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

function getNodeDetails(node: PocNode | undefined) {
  if (!node) {
    return {
      title: "No node selected",
      status: "Read-only starter proof",
      summary: "Click a node on the canvas to inspect how the current validated slice behaves inside a React starter surface.",
    };
  }

  const workflowLabel = WORKFLOW_LABELS.find(([id]) => id === node.id)?.[1];
  if (workflowLabel) {
    return workflowLabel;
  }

  return {
    title: `Workflow Step ${node.id}`,
    status: "Generated proof node",
    summary: `Grid-backed PoC node rendered through the current HyperFlow slice at (${Math.round(node.x)}, ${Math.round(node.y)}).`,
  };
}

export function App() {
  const [scenarioSize, setScenarioSize] = useState(FIXTURE_SIZES[0]);
  const nodes = useMemo(() => getFixture(scenarioSize), [scenarioSize]);
  const [viewport, setViewport] = useState<PocViewport>(() => getDefaultViewport());
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(1);
  const [metrics, setMetrics] = useState<PocMetrics | null>(null);
  const [ready, setReady] = useState(false);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedNodeDetails = getNodeDetails(selectedNode);

  function handleScenarioChange(size: number) {
    setScenarioSize(size);
    const nextNodes = getFixture(size);
    setViewport(fitViewport(nextNodes));
    setSelectedNodeId(nextNodes[0]?.id ?? null);
  }

  function zoomBy(multiplier: number) {
    setViewport((current) => ({
      ...current,
      zoom: Math.max(0.35, Math.min(current.zoom * multiplier, 1.8)),
    }));
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
              {metrics ? <span>{metrics.visibleCount} visible</span> : null}
            </div>
          </div>

          <HyperFlowPocCanvas
            className="starter-canvas"
            nodes={nodes}
            viewport={viewport}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onMetricsChange={setMetrics}
            onReadyChange={setReady}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          />

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
              <h2>{selectedNodeDetails.title}</h2>
            </div>
            <span className="status-chip">{selectedNodeDetails.status}</span>
          </div>

          <p className="inspector-summary">{selectedNodeDetails.summary}</p>

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

          <div className="inspector-note">
            <h3>Why this slice matters</h3>
            <p>
              It is the first React-facing surface that makes HyperFlow feel like a workflow builder SDK product instead of only a PoC plus docs.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
