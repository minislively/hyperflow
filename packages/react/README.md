# react

`packages/react` is the first **thin React adapter** for HyperFlow's current validated PoC slice.

It exists to support a starter-like React product proof without pretending that the full future React API is already stabilized.
The current strongest wedge is **agent builder UI**: host apps should be able to wire custom nodes, inspector panels, and workflow state with low integration friction, including when AI coding tools are helping assemble the surface.

This package is intentionally **graph-state-first** and **form-library-agnostic**:

- HyperFlow owns graph state seams and canvas interaction
- host apps choose how to build inspector forms
- `react-hook-form` is a recommended integration pattern, not a package dependency

## Current role

- render the validated canvas proof inside React
- expose a minimal canvas host for starter-like surfaces
- provide a host-controlled state model for workflow nodes
- support product-facing agent/workflow editing examples such as `select -> edit form -> Apply -> node update`
- keep the key seams small enough that AI-assisted implementation can discover and reuse them

## Public surface right now

- `useWorkflowNodesState`
- `useWorkflowSelection`
- `useSelectedNode`
- `updateNodeData`
- `HyperFlowPocCanvas`
- `HyperFlowPocNodeRendererProps`
- `HyperFlowPocNodeRenderers`
- `createPocViewport`
- `fitPocViewportToNodes`
- `focusPocViewportOnNode`
- `isInteractiveCanvasMode`

## Quickstart

```tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HyperFlowPocCanvas,
  fitPocViewportToNodes,
  updateNodeData,
  useSelectedNode,
  useWorkflowNodesState,
  useWorkflowSelection,
  type HyperFlowCanvasMode,
  type PocNode,
} from "@hyperflow/react";

type WorkflowNode = PocNode & {
  type: string;
  data: {
    title: string;
    status: string;
  };
};

const initialNodes: WorkflowNode[] = [
  {
    id: 1,
    x: 0,
    y: 0,
    width: 180,
    height: 92,
    type: "task-brief",
    data: { title: "Task Brief", status: "Input · Ready" },
  },
];

export function Example() {
  const [mode, setMode] = useState<HyperFlowCanvasMode>("inspect");
  const [nodes, setNodes] = useWorkflowNodesState(initialNodes);
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: initialNodes[0]?.id ?? null });
  const selectedNode = useSelectedNode({ nodes, selection });
  const [viewport] = useState(() =>
    fitPocViewportToNodes(initialNodes, { width: 960, height: 540 }),
  );
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { title: initialNodes[0].data.title },
  });

  useEffect(() => {
    if (!selectedNode) return;
    reset({ title: selectedNode.data.title });
  }, [selectedNode, reset]);

  function applyChanges(values: { title: string }) {
    if (!selectedNode) return;
    updateNodeData(setNodes, selectedNode.id, (node) => ({
      data: { ...node.data, title: values.title },
    }));
  }

  return (
    <>
      <HyperFlowPocCanvas
        nodes={nodes}
        viewport={viewport}
        mode={mode}
        selectedNodeId={selection.nodeId}
        onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
      />
      <form onSubmit={handleSubmit(applyChanges)}>
        <input {...register("title")} />
        <button type="submit" disabled={!selectedNode}>Apply</button>
      </form>
    </>
  );
}
```

### Host-controlled state model

The intended mental model is:

```tsx
const [nodes, setNodes, onNodesChange] = useWorkflowNodesState(initialNodes)
const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: initialNodes[0]?.id ?? null })
```

- the host app owns `nodes`
- the host app also owns `selection`
- the builder consumes both
- the inspector can derive the selected node through `useSelectedNode(...)`
- clicking `Apply` commits through package-owned mutation paths such as `updateNodeData(...)`

### Recommended `react-hook-form` pattern

Use the package seams first, then layer RHF on top:

1. `useWorkflowNodesState(...)` owns node state
2. `useWorkflowSelection(...)` owns selection
3. `useSelectedNode(...)` derives the currently edited node
4. RHF `reset(...)` repopulates the inspector when selection changes
5. RHF `handleSubmit(...)` commits through `updateNodeData(...)`

That keeps the adapter thin while still giving host apps a familiar inspector/form workflow.

Install `react-hook-form` in the host app or example package that renders the inspector. `@hyperflow/react` itself stays free of RHF-specific dependencies.

### Why this matters for AI-assisted implementation

The package is intentionally opinion-light so AI coding assistants can find a short path:

1. host owns `nodes`
2. host owns `selection`
3. `useSelectedNode(...)` resolves the edited node
4. the inspector form commits through `updateNodeData(...)`

That is the current low-friction implementation story HyperFlow is trying to make legible.

### Mode semantics

- `mode="inspect"` → click-based hit-test selection is enabled
- `mode="read-only"` → the same canvas proof renders without selection interaction

The old `interactive` boolean still works, but `mode` is the clearer starter-facing API.

### Custom node seam

`HyperFlowPocCanvas` also supports a thin starter-oriented custom node seam:

```tsx
<HyperFlowPocCanvas
  nodes={nodes}
  viewport={viewport}
  nodeRenderers={{
    "task-brief": TaskBriefNode,
    "manager-response": ManagerResponseNode,
  }}
  getNodeRendererKey={(node) => node.id === 1 ? "task-brief" : node.id === 6 ? "manager-response" : null}
/>
```

This is intentionally narrow: enough to prove host-side customizability, not a full stable node registry API.

## Not promised yet

This package does **not** currently claim:

- a broad React wrapper API
- full editor authoring primitives
- finished Starter Kit maturity
- palette/add-node workflow support
- collaboration/history features

## Scope note

This adapter should stay thin until the current product-proof slice is validated in real usage.
