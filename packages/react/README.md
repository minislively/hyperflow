# react

`packages/react` is the first **thin React adapter** for HyperFlow's current validated PoC slice.

It exists to support a starter-like React product proof without pretending that the full future React API is already stabilized.

## Current role

- render the validated canvas proof inside React
- expose a minimal canvas host for starter-like surfaces
- provide small viewport helpers for starter-style navigation
- support bounded product-facing examples such as `toolbar + canvas + inspector`

## Public surface right now

- `useWorkflowNodesState`
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
  useWorkflowNodesState,
  type HyperFlowCanvasMode,
  type PocNode,
} from "@hyperflow/react";

type WorkflowNode = PocNode & {
  title: string;
};

const initialNodes: WorkflowNode[] = [
  { id: 1, x: 0, y: 0, width: 96, height: 56, title: "Customer Ticket" },
];

export function Example() {
  const [mode, setMode] = useState<HyperFlowCanvasMode>("inspect");
  const [nodes, setNodes, onNodesChange] = useWorkflowNodesState(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(nodes[0]?.id ?? null);
  const [viewport, setViewport] = useState(() =>
    fitPocViewportToNodes(initialNodes, { width: 960, height: 540 }),
  );

  function applyTitle(nodeId: number, title: string) {
    updateNodeData(setNodes, nodeId, { title });
  }

  return (
    <HyperFlowPocCanvas
      nodes={nodes}
      viewport={viewport}
      mode={mode}
      selectedNodeId={selectedNodeId}
      onNodeSelect={setSelectedNodeId}
    />
  );
}
```

### Host-controlled state model

The intended mental model is:

```tsx
const [nodes, setNodes, onNodesChange] = useWorkflowNodesState(initialNodes)
```

- the host app owns `nodes`
- the builder consumes `nodes`
- node data changes should go through package-owned mutation paths such as `updateNodeData(...)`

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
