import { useEffect, useState } from "react";
import {
  HyperFlowPocCanvas,
  fitPocViewportToNodes,
  focusPocViewportOnNode,
  updateNodeData,
  useWorkflowNodesState,
  type HyperFlowCanvasMode,
  type PocMetrics,
  type PocViewport,
} from "@hyperflow/react";
import {
  getStarterNodeRendererData,
  getStarterNodeRendererKey,
  starterNodeRenderers,
} from "./custom-nodes";
import {
  INITIAL_WORKFLOW_NODES,
  STARTER_SCENARIOS,
  STARTER_SURFACE_GUIDANCE,
  STARTER_SURFACE_STATES,
  type DraftResponseNodeData,
  type StarterSurfaceState,
  type TicketNodeData,
  type WorkflowNode,
} from "./starter-data";
import {
  getDefaultStarterViewport,
  getNodeFocusViewportOptions,
  getSelectedNode,
  getSelectedNodeDetails,
  getStarterScenarioBySize,
  getStarterViewportOptions,
  starterCanvasSize,
} from "./starter-helpers";

type TicketFormDraft = {
  title: string;
  status: string;
  sourceLabel: string;
};

type DraftResponseFormDraft = {
  title: string;
  tone: string;
  outputSummary: string;
};

type FormDraft =
  | { kind: "customer-ticket"; values: TicketFormDraft }
  | { kind: "draft-response"; values: DraftResponseFormDraft }
  | null;

function createDraft(node: WorkflowNode | undefined): FormDraft {
  if (!node) return null;
  if (node.type === "customer-ticket") {
    const data = node.data as TicketNodeData;
    return {
      kind: "customer-ticket",
      values: {
        title: data.form.title,
        status: data.form.status,
        sourceLabel: data.form.sourceLabel,
      },
    };
  }

  if (node.type === "draft-response") {
    const data = node.data as DraftResponseNodeData;
    return {
      kind: "draft-response",
      values: {
        title: data.form.title,
        tone: data.form.tone,
        outputSummary: data.form.outputSummary,
      },
    };
  }

  return null;
}

export function App() {
  const activeScenario = STARTER_SCENARIOS[0];
  const [nodes, setNodes, onNodesChange] = useWorkflowNodesState<WorkflowNode>(INITIAL_WORKFLOW_NODES);
  const [viewport, setViewport] = useState<PocViewport>(() => getDefaultStarterViewport());
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(activeScenario.defaultNodeId);
  const [metrics, setMetrics] = useState<PocMetrics | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<HyperFlowCanvasMode>("inspect");
  const [surfaceState, setSurfaceState] = useState<StarterSurfaceState>("live");
  const [draft, setDraft] = useState<FormDraft>(() => createDraft(INITIAL_WORKFLOW_NODES.find((node) => node.id === activeScenario.defaultNodeId)));

  const selectedNode = getSelectedNode(nodes, selectedNodeId);
  const selectedNodeDetails = getSelectedNodeDetails(mode === "inspect" && surfaceState === "live" ? selectedNode : undefined, 0);
  const activeSurfaceState = STARTER_SURFACE_STATES.find((state) => state.id === surfaceState)!;
  const activeSurfaceGuidance = surfaceState === "live" ? null : STARTER_SURFACE_GUIDANCE[surfaceState];
  const isLiveSurface = surfaceState === "live";

  useEffect(() => {
    if (!isLiveSurface || mode !== "inspect") return;
    setDraft(createDraft(selectedNode));
  }, [isLiveSurface, mode, selectedNode]);

  function resetWorkflowTemplate() {
    onNodesChange(INITIAL_WORKFLOW_NODES);
    setViewport(fitPocViewportToNodes(INITIAL_WORKFLOW_NODES, getStarterViewportOptions()));
    setSelectedNodeId(activeScenario.defaultNodeId);
    setDraft(createDraft(INITIAL_WORKFLOW_NODES.find((node) => node.id === activeScenario.defaultNodeId)));
  }

  function zoomBy(multiplier: number) {
    if (!isLiveSurface) return;
    setViewport((current) => ({
      ...current,
      zoom: Math.max(0.35, Math.min(current.zoom * multiplier, 1.8)),
    }));
  }

  function setInteractionMode(nextMode: HyperFlowCanvasMode) {
    setMode(nextMode);
    if (nextMode === "inspect" && selectedNodeId === null) {
      setSelectedNodeId(activeScenario.defaultNodeId);
    }
  }

  function focusSelectedNode() {
    if (!isLiveSurface || !selectedNode) return;
    setMode("inspect");
    setViewport(focusPocViewportOnNode(selectedNode, viewport, getNodeFocusViewportOptions(viewport)));
  }

  function jumpToNode(nodeId: number) {
    if (!isLiveSurface) return;
    const nextNode = nodes.find((node) => node.id === nodeId);
    if (!nextNode) return;
    setMode("inspect");
    setSelectedNodeId(nodeId);
    setViewport(focusPocViewportOnNode(nextNode, viewport, getNodeFocusViewportOptions(viewport)));
    setDraft(createDraft(nextNode));
  }

  function restoreLiveSurface(nextMode: HyperFlowCanvasMode) {
    setSurfaceState("live");
    setMode(nextMode);
    setViewport(fitPocViewportToNodes(nodes, getStarterViewportOptions()));
    setSelectedNodeId(activeScenario.defaultNodeId);
  }

  function handleSurfaceAction(actionId: string) {
    if (actionId === "load-starter-workflow") {
      resetWorkflowTemplate();
      restoreLiveSurface("inspect");
      return;
    }

    if (actionId === "open-starter-template") {
      resetWorkflowTemplate();
      restoreLiveSurface("read-only");
      return;
    }

    if (actionId === "retry-load") {
      restoreLiveSurface(mode);
      return;
    }

    if (actionId === "return-safe-overview") {
      restoreLiveSurface("read-only");
    }
  }

  function applyDraft() {
    if (!selectedNode || !draft) return;

    if (draft.kind === "customer-ticket") {
      updateNodeData(setNodes, selectedNode.id, (node) => {
        const current = node as WorkflowNode;
        const currentData = current.data as TicketNodeData;
        return {
          data: {
            ...currentData,
            title: draft.values.title,
            status: draft.values.status,
            sourceLabel: draft.values.sourceLabel,
            summary: `${draft.values.sourceLabel} requests enter the automation workflow through ${draft.values.status.toLowerCase()}.`,
            form: { ...draft.values },
          },
        };
      });
      return;
    }

    if (draft.kind === "draft-response") {
      updateNodeData(setNodes, selectedNode.id, (node) => {
        const current = node as WorkflowNode;
        const currentData = current.data as DraftResponseNodeData;
        return {
          data: {
            ...currentData,
            title: draft.values.title,
            tone: draft.values.tone,
            outputSummary: draft.values.outputSummary,
            summary: `${draft.values.tone} response prepared with ${draft.values.outputSummary.toLowerCase()}.`,
            form: { ...draft.values },
          },
        };
      });
    }
  }

  function resetDraft() {
    setDraft(createDraft(selectedNode));
  }

  return (
    <main className="starter-shell">
      <header className="starter-toolbar">
        <div>
          <p className="eyebrow">HyperFlow automation SaaS proof</p>
          <h1>Apply-driven workflow editing surface</h1>
          <p className="toolbar-copy">
            This proof shows the product experience directly: select a workflow node, edit fields in the inspector, click Apply, and see the node plus graph state update together.
          </p>
        </div>

        <div className="toolbar-actions">
          <div className="toolbar-group">
            <button className="active" type="button">
              <strong>{activeScenario.label}</strong>
              <span>{activeScenario.subtitle}</span>
            </button>
          </div>

          <div className="toolbar-group compact">
            <button type="button" className={mode === "inspect" ? "active" : ""} onClick={() => setInteractionMode("inspect")}>Inspect mode</button>
            <button type="button" className={mode === "read-only" ? "active" : ""} onClick={() => setInteractionMode("read-only")}>Read-only overview</button>
            <button type="button" onClick={focusSelectedNode} disabled={!isLiveSurface || !selectedNode}>Focus selected</button>
            <button type="button" onClick={resetWorkflowTemplate} disabled={!isLiveSurface}>Reset workflow</button>
            <button type="button" onClick={() => zoomBy(0.85)} disabled={!isLiveSurface}>Zoom out</button>
            <button type="button" onClick={() => zoomBy(1.15)} disabled={!isLiveSurface}>Zoom in</button>
          </div>

          <div className="toolbar-group state-group">
            {STARTER_SURFACE_STATES.map((state) => (
              <button
                key={state.id}
                type="button"
                className={state.id === surfaceState ? "active" : ""}
                onClick={() => setSurfaceState(state.id)}
              >
                <strong>{state.label}</strong>
                <span>{state.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="starter-content">
        <section className="starter-canvas-card">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Canvas proof</p>
              <h2>{isLiveSurface ? "Automation SaaS workflow" : `${activeSurfaceState.label} state`}</h2>
            </div>
            <div className="panel-badges">
              <span>{isLiveSurface ? (ready ? "Engine ready" : "Loading engine") : activeSurfaceState.label}</span>
              <span>{nodes.length} nodes</span>
              <span>{mode === "inspect" ? "Editing flow" : "Read-only context"}</span>
              {isLiveSurface && selectedNode ? <span>Selected: {selectedNodeDetails.title}</span> : null}
              {isLiveSurface && metrics ? <span>{metrics.visibleCount} visible</span> : null}
            </div>
          </div>

          {surfaceState === "live" ? (
            <>
              <HyperFlowPocCanvas
                className="starter-canvas"
                nodes={nodes}
                viewport={viewport}
                selectedNodeId={mode === "inspect" ? selectedNodeId : null}
                mode={mode}
                nodeRenderers={starterNodeRenderers}
                getNodeRendererKey={getStarterNodeRendererKey}
                getNodeRendererData={getStarterNodeRendererData}
                onNodeSelect={setSelectedNodeId}
                onMetricsChange={setMetrics}
                onReadyChange={setReady}
                width={starterCanvasSize.width}
                height={starterCanvasSize.height}
              />

              <p className="canvas-caption">
                {mode === "inspect"
                  ? "Select Customer Ticket or Draft Response, update the form, then press Apply to commit the workflow change."
                  : "Read-only overview keeps the workflow context visible while editing remains scoped to inspect mode."}
              </p>
            </>
          ) : (
            <section className={`starter-state-card starter-state-card--${surfaceState}`}>
              <p className="panel-eyebrow">Starter surface state</p>
              <h3>{activeSurfaceGuidance?.title}</h3>
              <p>{activeSurfaceGuidance?.description}</p>
              <div className="state-actions">
                {surfaceState === "loading" ? <div className="loading-pulse" aria-hidden="true" /> : null}
                {activeSurfaceGuidance?.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={action.tone ?? "secondary"}
                    disabled={action.disabled}
                    onClick={() => handleSurfaceAction(action.id)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="starter-inspector-card">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Inspector</p>
              <h2>
                {surfaceState === "live"
                  ? mode === "inspect"
                    ? selectedNodeDetails.title
                    : activeScenario.label
                  : `${activeSurfaceState.label} guidance`}
              </h2>
            </div>
            <span className="status-chip">
              {surfaceState === "live"
                ? mode === "inspect"
                  ? selectedNodeDetails.status
                  : "Read-only scenario overview"
                : `${activeSurfaceState.label} state`}
            </span>
          </div>

          {surfaceState === "live" ? (
            <>
              <section className="quick-jump-card">
                <div className="quick-jump-header">
                  <div>
                    <p className="panel-eyebrow">Guided jump</p>
                    <h3>Choose the proof node</h3>
                  </div>
                  <button type="button" onClick={() => jumpToNode(activeScenario.defaultNodeId)}>Jump to default proof</button>
                </div>
                <div className="quick-jump-list">
                  {WORKFLOW_SEQUENCE.map((nodeId) => {
                    const details = WORKFLOW_DETAILS.get(nodeId);
                    const label = details?.title ?? `Workflow Step ${nodeId}`;
                    const status = details?.status ?? "Supporting node";
                    const isActive = mode === "inspect" && selectedNodeId === nodeId;
                    return (
                      <button
                        key={nodeId}
                        type="button"
                        className={isActive ? "active" : ""}
                        onClick={() => jumpToNode(nodeId)}
                      >
                        <strong>{label}</strong>
                        <span>{status}</span>
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
                </>
              ) : selectedNode?.type === "customer-ticket" && draft?.kind === "customer-ticket" ? (
                <>
                  <p className="inspector-summary">Edit the intake node the same way a product team would tune a support automation flow.</p>
                  <div className="config-group-card form-card">
                    <h3>Customer Ticket form</h3>
                    <label>
                      <span>Title</span>
                      <input
                        value={draft.values.title}
                        onChange={(event) => setDraft({ kind: "customer-ticket", values: { ...draft.values, title: event.target.value } })}
                      />
                    </label>
                    <label>
                      <span>Status</span>
                      <input
                        value={draft.values.status}
                        onChange={(event) => setDraft({ kind: "customer-ticket", values: { ...draft.values, status: event.target.value } })}
                      />
                    </label>
                    <label>
                      <span>Source label</span>
                      <input
                        value={draft.values.sourceLabel}
                        onChange={(event) => setDraft({ kind: "customer-ticket", values: { ...draft.values, sourceLabel: event.target.value } })}
                      />
                    </label>
                    <div className="state-actions">
                      <button type="button" className="primary" onClick={applyDraft}>Apply</button>
                      <button type="button" className="secondary" onClick={resetDraft}>Reset</button>
                    </div>
                  </div>
                </>
              ) : selectedNode?.type === "draft-response" && draft?.kind === "draft-response" ? (
                <>
                  <p className="inspector-summary">Edit the AI response node and apply the configuration the same way a workflow product team would.</p>
                  <div className="config-group-card form-card">
                    <h3>Draft Response form</h3>
                    <label>
                      <span>Title</span>
                      <input
                        value={draft.values.title}
                        onChange={(event) => setDraft({ kind: "draft-response", values: { ...draft.values, title: event.target.value } })}
                      />
                    </label>
                    <label>
                      <span>Tone</span>
                      <input
                        value={draft.values.tone}
                        onChange={(event) => setDraft({ kind: "draft-response", values: { ...draft.values, tone: event.target.value } })}
                      />
                    </label>
                    <label>
                      <span>Output summary</span>
                      <textarea
                        value={draft.values.outputSummary}
                        onChange={(event) => setDraft({ kind: "draft-response", values: { ...draft.values, outputSummary: event.target.value } })}
                      />
                    </label>
                    <div className="state-actions">
                      <button type="button" className="primary" onClick={applyDraft}>Apply</button>
                      <button type="button" className="secondary" onClick={resetDraft}>Reset</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="inspector-summary">{selectedNodeDetails.summary}</p>
                  <p className="inspector-description">This supporting node stays read-only in the first form-editing proof.</p>
                </>
              )}
            </>
          ) : (
            <section className={`starter-state-card starter-state-card--${surfaceState}`}>
              <p className="inspector-summary">{activeSurfaceGuidance?.inspectorSummary}</p>
              <dl className="inspector-grid">
                <div>
                  <dt>State</dt>
                  <dd>{activeSurfaceState.label}</dd>
                </div>
                <div>
                  <dt>Scenario</dt>
                  <dd>{activeScenario.label}</dd>
                </div>
                <div>
                  <dt>Interaction</dt>
                  <dd>{activeSurfaceGuidance?.interactionLabel}</dd>
                </div>
                <div>
                  <dt>Starter shell</dt>
                  <dd>{activeSurfaceGuidance?.shellNote}</dd>
                </div>
              </dl>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
