import { useMemo, useState } from "react";
import { FIXTURE_SIZES, getFixture } from "../../../benchmarks/fixtures.js";
import {
  HyperFlowPocCanvas,
  fitPocViewportToNodes,
  focusPocViewportOnNode,
  type HyperFlowCanvasMode,
  type PocMetrics,
  type PocNode,
  type PocViewport,
} from "@hyperflow/react";

import { STARTER_SCENARIOS, WORKFLOW_DETAILS, WORKFLOW_SEQUENCE } from "./starter-data";
import {
  getDefaultStarterViewport,
  getNodeFocusViewportOptions,
  getSelectedNode,
  getSelectedNodeDetails,
  getStarterScenarioBySize,
  getStarterViewportOptions,
  starterCanvasSize,
} from "./starter-helpers";

export function App() {
  const [scenarioSize, setScenarioSize] = useState(FIXTURE_SIZES[0]);
  const nodes = useMemo(() => getFixture(scenarioSize), [scenarioSize]);
  const [viewport, setViewport] = useState<PocViewport>(() => getDefaultStarterViewport());
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(1);
  const [metrics, setMetrics] = useState<PocMetrics | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<HyperFlowCanvasMode>("inspect");

  const selectedNode = getSelectedNode(nodes, selectedNodeId);
  const selectedNodeDetails = getSelectedNodeDetails(mode === "inspect" ? selectedNode : undefined, scenarioSize);
  const activeScenario = getStarterScenarioBySize(scenarioSize);

  function handleScenarioChange(size: number) {
    setScenarioSize(size);
    const nextNodes = getFixture(size);
    const nextScenario = getStarterScenarioBySize(size);
    setViewport(fitPocViewportToNodes(nextNodes, getStarterViewportOptions()));
    setSelectedNodeId(nextScenario.defaultNodeId ?? nextNodes[0]?.id ?? null);
  }

  function zoomBy(multiplier: number) {
    setViewport((current) => ({
      ...current,
      zoom: Math.max(0.35, Math.min(current.zoom * multiplier, 1.8)),
    }));
  }

  function setInteractionMode(nextMode: HyperFlowCanvasMode) {
    setMode(nextMode);
    if (nextMode === "inspect" && selectedNodeId === null) {
      setSelectedNodeId(activeScenario.defaultNodeId ?? nodes[0]?.id ?? null);
    }
  }

  function focusSelectedNode() {
    if (!selectedNode) return;
    setMode("inspect");
    setViewport(focusPocViewportOnNode(selectedNode, viewport, getNodeFocusViewportOptions(viewport)));
  }

  function jumpToNode(nodeId: number) {
    const nextNode = nodes.find((node) => node.id === nodeId);
    if (!nextNode) return;
    setMode("inspect");
    setSelectedNodeId(nodeId);
    setViewport(focusPocViewportOnNode(nextNode, viewport, getNodeFocusViewportOptions(viewport)));
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
            <button type="button" onClick={() => setViewport(fitPocViewportToNodes(nodes, getStarterViewportOptions()))}>Fit view</button>
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
            mode={mode}
            onNodeSelect={setSelectedNodeId}
            onMetricsChange={setMetrics}
            onReadyChange={setReady}
            width={starterCanvasSize.width}
            height={starterCanvasSize.height}
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
