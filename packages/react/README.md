# react

`packages/react` is the first **thin React adapter** for HyperFlow's current validated PoC slice.

It exists to support a starter-like React product proof without pretending that the full future React API is already stabilized.

## Current role

- render the validated canvas proof inside React
- expose a minimal canvas host for starter-like surfaces
- provide a host-controlled state model for workflow nodes
- support product-facing editing examples such as `select -> edit form -> Apply -> node update`

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
import { useState } from "react";
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
    type: "customer-ticket",
    data: { title: "Customer Ticket", status: "Input · Ready" },
  },
];

export function Example() {
  const [mode, setMode] = useState<HyperFlowCanvasMode>("inspect");
  const [nodes, setNodes] = useWorkflowNodesState(initialNodes);
  const [selection, setSelection] = useWorkflowSelection({ nodeId: initialNodes[0]?.id ?? null });
  const selectedNode = useSelectedNode({ nodes, selection });
  const [draftTitle, setDraftTitle] = useState(initialNodes[0].data.title);
  const [viewport] = useState(() =>
    fitPocViewportToNodes(initialNodes, { width: 960, height: 540 }),
  );

  function applyChanges() {
    if (!selection.nodeId) return;
    updateNodeData(setNodes, selection.nodeId, (node) => ({
      data: { ...node.data, title: draftTitle },
    }));
  }

  return (
    <>
      <HyperFlowPocCanvas
        nodes={nodes}
        viewport={viewport}
        mode={mode}
        selectedNodeId={selection.nodeId}
        onNodeSelect={(nodeId) => setSelection({ nodeId })}
      />
      <button onClick={applyChanges} disabled={!selectedNode}>Apply</button>
    </>
  );
}
```

### Host-controlled state model

The intended mental model is:

```tsx
const [nodes, setNodes, onNodesChange] = useWorkflowNodesState(initialNodes)
const [selection, setSelection] = useWorkflowSelection({ nodeId: initialNodes[0]?.id ?? null })
```

- the host app owns `nodes`
- the host app also owns `selection`
- the builder consumes both
- the inspector can derive the selected node through `useSelectedNode(...)`
- clicking `Apply` commits through package-owned mutation paths such as `updateNodeData(...)`

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
    "customer-ticket": CustomerTicketNode,
    "draft-response": DraftResponseNode,
  }}
  getNodeRendererKey={(node) => node.id === 1 ? "customer-ticket" : node.id === 6 ? "draft-response" : null}
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
