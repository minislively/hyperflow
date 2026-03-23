# react

`packages/react` is the current **thin React adapter** for HyperFlow's validated slice.

## Current status

- package name: `@hyperflow/react`
- package visibility: **private workspace package**
- verified development flow: **pnpm workspace only**
- peer dependencies: **React 19** and **React DOM 19**

Today this package is best read as a repo-local integration layer, not as a broadly published npm package.

## What this package is for

Use `@hyperflow/react` when a host React app needs:

- a runtime-backed canvas seam
- host-controlled node state
- host-controlled selection state
- a small set of helper hooks around the current PoC runtime

## What it does not try to be yet

This package does **not** currently claim:

- a full editor shell
- a published install flow for arbitrary external apps
- broad authoring primitives
- palette / add-node workflow maturity
- history / collaboration features

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

## Verified local setup

From the repo root:

```bash
pnpm install
pnpm run dev:react-starter
```

Expected Learn URL:

```text
http://localhost:5173/ko/learn
```

That starter explains how frontend teams should think about installation, core concepts, React integration, customization, layouting, and performance.

## Minimal usage shape

```tsx
import { useState } from "react";
import {
  HyperFlowPocCanvas,
  createPocViewport,
  updateNodeData,
  useSelectedNode,
  useWorkflowNodesState,
  useWorkflowSelection,
  type PocNode,
} from "@hyperflow/react";

type ExampleNode = PocNode & {
  data: {
    title: string;
  };
};

const initialNodes: ExampleNode[] = [
  {
    id: 1,
    x: 0,
    y: 0,
    width: 180,
    height: 92,
    data: { title: "Node A" },
  },
];

export function Example() {
  const [nodes, setNodes] = useWorkflowNodesState(initialNodes);
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
  const selectedNode = useSelectedNode({ nodes, selection });
  const [viewport] = useState(() => createPocViewport(0, 0, 1));

  function renameSelectedNode() {
    if (!selectedNode) return;
    updateNodeData(setNodes, selectedNode.id, (node) => ({
      data: { ...node.data, title: `${node.data.title} updated` },
    }));
  }

  return (
    <>
      <HyperFlowPocCanvas
        nodes={nodes}
        viewport={viewport}
        selectedNodeId={selection.nodeId}
        onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
      />
      <button type="button" onClick={renameSelectedNode} disabled={!selectedNode}>
        Rename selected node
      </button>
    </>
  );
}
```

## Mental model

- the host app owns `nodes`
- the host app owns `selection`
- HyperFlow renders the runtime-backed canvas
- product-specific inspector, toolbar, persistence, and permissions stay in the host app

## Optional custom renderer seam

`HyperFlowPocCanvas` still exposes a narrow custom renderer seam:

```tsx
<HyperFlowPocCanvas
  nodes={nodes}
  viewport={viewport}
  nodeRenderers={{
    "custom-node": CustomNode,
  }}
  getNodeRendererKey={(node) => (node.id === 1 ? "custom-node" : null)}
/>
```

Treat this as a thin proof seam, not as a final stable node registry API.

## Direction

The current direction is:

1. frontend teams learn the validated runtime slice through docs and small examples
2. the React adapter stays thin and honest
3. broader workflow-builder semantics come later on top of that foundation
