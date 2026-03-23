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

Expected main editor URL:

```text
http://localhost:5173/ko
```

Supporting docs remain available at:

```text
http://localhost:5173/ko/learn
```

That starter now opens an editor-first surface first, then explains installation, core concepts, React integration, customization, layouting, and performance through Learn.

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
    type: "default",
    position: { x: 0, y: 0 },
    size: { width: 180, height: 92 },
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

## Public node vs runtime node

The React-facing node shape is now editor-friendly:

```ts
type PocNode<TData = Record<string, unknown>> = {
  id: number;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: TData;
};
```

The Rust + WASM runtime still uses a smaller geometry contract internally:

```ts
type PocRuntimeNode = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
```

`HyperFlowPocCanvas` projects editor nodes into runtime nodes before the viewport/culling path runs. That split keeps the public API easier to learn without pushing product-level data through the runtime boundary.

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
