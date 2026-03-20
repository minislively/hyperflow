import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HyperFlowPocCanvas,
  fitPocViewportToNodes,
  focusPocViewportOnNode,
  updateNodeData,
  useSelectedNode,
  useWorkflowNodesState,
  useWorkflowSelection,
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
  WORKFLOW_DETAILS,
  WORKFLOW_SEQUENCE,
  type ManagerResponseNodeData,
  type StarterSurfaceState,
  type TaskBriefNodeData,
  type WorkflowNode,
} from "./starter-data";
import {
  getDefaultStarterViewport,
  getNodeFocusViewportOptions,
  getSelectedNodeDetails,
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

function getTicketFormValues(node: WorkflowNode): TicketFormDraft {
  const data = node.data as TaskBriefNodeData;
  return {
    title: data.form.title,
    status: data.form.status,
    sourceLabel: data.form.sourceLabel,
  };
}

function getDraftResponseFormValues(node: WorkflowNode): DraftResponseFormDraft {
  const data = node.data as ManagerResponseNodeData;
  return {
    title: data.form.title,
    tone: data.form.tone,
    outputSummary: data.form.outputSummary,
  };
}

function CustomerTicketInspectorForm({
  node,
  onApply,
}: {
  node: WorkflowNode;
  onApply: (values: TicketFormDraft) => void;
}) {
  const values = getTicketFormValues(node);
  const { register, handleSubmit, reset, formState } = useForm<TicketFormDraft>({
    defaultValues: values,
  });

  useEffect(() => {
    reset(values);
  }, [node.id, values.sourceLabel, values.status, values.title, reset]);

  return (
    <>
      <p className="inspector-summary">Edit the task-intake workflow step with the same graph-state-first seam a host app would connect to react-hook-form.</p>
      <form className="config-group-card form-card" onSubmit={handleSubmit(onApply)}>
        <h3>Task Brief form</h3>
        <label>
          <span>Title</span>
          <input {...register("title")} />
        </label>
        <label>
          <span>Status</span>
          <input {...register("status")} />
        </label>
        <label>
          <span>Source label</span>
          <input {...register("sourceLabel")} />
        </label>
        <div className="state-actions">
          <button type="submit" className="primary">Apply</button>
          <button type="button" className="secondary" onClick={() => reset(values)} disabled={!formState.isDirty}>Reset</button>
        </div>
      </form>
    </>
  );
}

function DraftResponseInspectorForm({
  node,
  onApply,
}: {
  node: WorkflowNode;
  onApply: (values: DraftResponseFormDraft) => void;
}) {
  const values = getDraftResponseFormValues(node);
  const { register, handleSubmit, reset, formState } = useForm<DraftResponseFormDraft>({
    defaultValues: values,
  });

  useEffect(() => {
    reset(values);
  }, [node.id, values.outputSummary, values.title, values.tone, reset]);

  return (
    <>
      <p className="inspector-summary">Edit the manager-response workflow step through react-hook-form and commit the result back through `updateNodeData(...)`.</p>
      <form className="config-group-card form-card" onSubmit={handleSubmit(onApply)}>
        <h3>Manager Response form</h3>
        <label>
          <span>Title</span>
          <input {...register("title")} />
        </label>
        <label>
          <span>Tone</span>
          <input {...register("tone")} />
        </label>
        <label>
          <span>Output summary</span>
          <textarea {...register("outputSummary")} />
        </label>
        <div className="state-actions">
          <button type="submit" className="primary">Apply</button>
          <button type="button" className="secondary" onClick={() => reset(values)} disabled={!formState.isDirty}>Reset</button>
        </div>
      </form>
    </>
  );
}

export function App() {
  const activeScenario = STARTER_SCENARIOS[0];
  const [nodes, setNodes, onNodesChange] = useWorkflowNodesState<WorkflowNode>(INITIAL_WORKFLOW_NODES);
  const [viewport, setViewport] = useState<PocViewport>(() => getDefaultStarterViewport());
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: activeScenario.defaultNodeId });
  const [metrics, setMetrics] = useState<PocMetrics | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<HyperFlowCanvasMode>("inspect");
  const [surfaceState, setSurfaceState] = useState<StarterSurfaceState>("live");

  const selectedNode = useSelectedNode({ nodes, selection });
  const selectedNodeId = selection.nodeId;
  const selectedNodeDetails = getSelectedNodeDetails(mode === "inspect" && surfaceState === "live" ? selectedNode : undefined, 0);
  const activeSurfaceState = STARTER_SURFACE_STATES.find((state) => state.id === surfaceState)!;
  const activeSurfaceGuidance = surfaceState === "live" ? null : STARTER_SURFACE_GUIDANCE[surfaceState];
  const isLiveSurface = surfaceState === "live";
  const integrationSeams = [
    { label: "Host owns", value: "nodes + selection" },
    { label: "Custom UI", value: "nodeRenderers injection" },
    { label: "Inspector commit", value: "updateNodeData(...)" },
    { label: "AI-friendly seam", value: "discoverable React hooks + state helpers" },
  ];
  const shellHighlights = [
    { label: "Primary fit", value: "Agent builder UI" },
    { label: "Promise", value: "Low-friction integration seams" },
    { label: "Proof slice", value: "Select → configure → Apply" },
  ];

  function resetWorkflowTemplate() {
    onNodesChange(INITIAL_WORKFLOW_NODES);
    setViewport(fitPocViewportToNodes(INITIAL_WORKFLOW_NODES, getStarterViewportOptions()));
    onSelectionChange({ nodeId: activeScenario.defaultNodeId });
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
      onSelectionChange({ nodeId: activeScenario.defaultNodeId });
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
    onSelectionChange({ nodeId });
    setViewport(focusPocViewportOnNode(nextNode, viewport, getNodeFocusViewportOptions(viewport)));
  }

  function restoreLiveSurface(nextMode: HyperFlowCanvasMode) {
    setSurfaceState("live");
    setMode(nextMode);
    setViewport(fitPocViewportToNodes(nodes, getStarterViewportOptions()));
    onSelectionChange({ nodeId: activeScenario.defaultNodeId });
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

  function applyTicketDraft(values: TicketFormDraft) {
    if (!selectedNode || selectedNode.type !== "task-brief") return;

    updateNodeData(setNodes, selectedNode.id, (node) => {
      const current = node as WorkflowNode;
      const currentData = current.data as TaskBriefNodeData;
      return {
        data: {
          ...currentData,
          title: values.title,
          status: values.status,
          sourceLabel: values.sourceLabel,
          summary: `${values.sourceLabel} tasks enter the agent workflow through ${values.status.toLowerCase()}.`,
          form: { ...values },
        },
      };
    });
  }

  function applyDraftResponse(values: DraftResponseFormDraft) {
    if (!selectedNode || selectedNode.type !== "manager-response") return;

    updateNodeData(setNodes, selectedNode.id, (node) => {
      const current = node as WorkflowNode;
      const currentData = current.data as ManagerResponseNodeData;
      return {
        data: {
          ...currentData,
          title: values.title,
          tone: values.tone,
          outputSummary: values.outputSummary,
          summary: `${values.tone} response prepared with ${values.outputSummary.toLowerCase()}.`,
          form: { ...values },
        },
      };
    });
  }

  return (
    <main className="starter-shell">
      <header className="starter-toolbar">
        <div className="starter-toolbar__hero">
          <div>
            <p className="eyebrow">HyperFlow workflow builder SDK</p>
            <h1>Agent builder workflow starter</h1>
            <p className="toolbar-copy">
              This starter shows the product experience directly: select an agent workflow step, edit fields in the inspector, click Apply, and see the workflow state plus node UI update together with low integration friction.
            </p>
          </div>

          <div className="starter-summary-strip" aria-label="Product summary">
            {shellHighlights.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="toolbar-actions">
          <section className="toolbar-section">
            <div className="toolbar-section__header">
              <p className="panel-eyebrow">Scenario</p>
              <h2>{activeScenario.label}</h2>
            </div>
            <div className="toolbar-group">
              <button className="active" type="button">
                <strong>{activeScenario.label}</strong>
                <span>{activeScenario.subtitle}</span>
              </button>
            </div>
          </section>

          <section className="toolbar-section">
            <div className="toolbar-section__header">
              <p className="panel-eyebrow">Workflow actions</p>
              <h2>Primary workflow controls</h2>
            </div>
            <div className="toolbar-group compact toolbar-group--primary">
              <button type="button" className={mode === "inspect" ? "active" : ""} onClick={() => setInteractionMode("inspect")}>Inspect mode</button>
              <button type="button" className={mode === "read-only" ? "active" : ""} onClick={() => setInteractionMode("read-only")}>Overview mode</button>
              <button type="button" onClick={focusSelectedNode} disabled={!isLiveSurface || !selectedNode}>Focus selected</button>
              <button type="button" onClick={resetWorkflowTemplate} disabled={!isLiveSurface}>Reset template</button>
            </div>
          </section>

          <div className="toolbar-meta-grid">
            <section className="toolbar-section toolbar-section--utility">
              <div className="toolbar-section__header">
                <p className="panel-eyebrow">Canvas utilities</p>
                <h2>Viewport tools</h2>
              </div>
              <div className="toolbar-group compact toolbar-group--utility">
                <button type="button" onClick={() => zoomBy(0.85)} disabled={!isLiveSurface}>Zoom out</button>
                <button type="button" onClick={() => zoomBy(1.15)} disabled={!isLiveSurface}>Zoom in</button>
              </div>
            </section>

            <section className="toolbar-section toolbar-section--states">
              <div className="toolbar-section__header">
                <p className="panel-eyebrow">Starter states</p>
                <h2>Evaluating bounded shell states</h2>
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
            </section>
          </div>
        </div>
      </header>

      <section className="starter-content">
        <section className="starter-canvas-card">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Workflow canvas</p>
              <h2>{isLiveSurface ? "Agent builder workflow" : `${activeSurfaceState.label} state`}</h2>
            </div>
            <div className="panel-badges">
              <span>{isLiveSurface ? (ready ? "Engine ready" : "Loading engine") : activeSurfaceState.label}</span>
              <span>{nodes.length} workflow steps</span>
              <span>{mode === "inspect" ? "Inspector editing" : "Product overview"}</span>
              {isLiveSurface && selectedNode ? <span>Selected step: {selectedNodeDetails.title}</span> : null}
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
                onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
                onMetricsChange={setMetrics}
                onReadyChange={setReady}
                width={starterCanvasSize.width}
                height={starterCanvasSize.height}
              />

              <p className="canvas-caption">
                {mode === "inspect"
                  ? "Select Task Brief or Manager Response, update the form, then press Apply to commit the workflow change."
                  : "Overview mode keeps the workflow context visible while editing remains scoped to inspect mode."}
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
              <p className="panel-eyebrow">Workflow inspector</p>
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
                  : "Workflow overview"
                : `${activeSurfaceState.label} state`}
            </span>
          </div>

          {surfaceState === "live" ? (
            <>
              <section className="quick-jump-card">
                <div className="quick-jump-header">
                  <div>
                    <p className="panel-eyebrow">Workflow path</p>
                    <h3>Current step and path</h3>
                  </div>
                  <button type="button" onClick={() => jumpToNode(activeScenario.defaultNodeId)}>Jump to primary step</button>
                </div>
                <div className="current-step-card">
                  <span>Current step</span>
                  <strong>{mode === "inspect" ? selectedNodeDetails.title : activeScenario.label}</strong>
                  <p>{mode === "inspect" ? selectedNodeDetails.description : activeScenario.summary}</p>
                </div>
                <div className="quick-jump-list">
                  {WORKFLOW_SEQUENCE.map((nodeId, index) => {
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
                        <span className="quick-jump-step">Step {index + 1}</span>
                        <strong>{label}</strong>
                        <span>{status}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="scenario-proof-card emphasis">
                <h3>Integration seam proof</h3>
                <p>This starter is intentionally showing the host-app seams an AI coding assistant has to wire without heavy bespoke glue.</p>
                <dl className="inspector-grid">
                  {integrationSeams.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {mode === "read-only" ? (
                <>
                  <p className="inspector-summary">{activeScenario.summary}</p>
                  <div className="scenario-proof-card">
                    <h3>Starter proof</h3>
                    <p>{activeScenario.proof}</p>
                  </div>
                  <div className="scenario-proof-card">
                    <h3>Why this workflow</h3>
                    <p>{activeScenario.why}</p>
                  </div>
                  <div className="scenario-proof-card code-card">
                    <h3>Implementation path</h3>
                    <pre>{`Host state -> HyperFlow canvas -> Inspector form -> updateNodeData(...)`}</pre>
                  </div>
                </>
              ) : selectedNode?.type === "task-brief" ? (
                <CustomerTicketInspectorForm node={selectedNode} onApply={applyTicketDraft} />
              ) : selectedNode?.type === "manager-response" ? (
                <DraftResponseInspectorForm node={selectedNode} onApply={applyDraftResponse} />
              ) : (
                <>
                  <p className="inspector-summary">{selectedNodeDetails.summary}</p>
                  <p className="inspector-description">This supporting node stays read-only in the first agent-builder editing proof.</p>
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
