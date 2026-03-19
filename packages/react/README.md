# react

`packages/react` is the first **thin React adapter** for HyperFlow's current validated PoC slice.

It exists to support a starter-like React product proof without pretending that the full future React API is already stabilized.

## Current role

- render the validated canvas proof inside React
- expose a minimal canvas host for starter-like surfaces
- provide small viewport helpers for starter-style navigation
- support bounded product-facing examples such as `toolbar + canvas + inspector`

## Public surface right now

- `HyperFlowPocCanvas`
- `HyperFlowPocNodeRendererProps`
- `HyperFlowPocNodeRenderers`
- `createPocViewport`
- `fitPocViewportToNodes`
- `focusPocViewportOnNode`
- `isInteractiveCanvasMode`

## Quickstart

```tsx
import { useMemo, useState } from "react";
import {
  HyperFlowPocCanvas,
  createPocViewport,
  fitPocViewportToNodes,
  type HyperFlowCanvasMode,
} from "@hyperflow/react";
import { getFixture } from "../../../benchmarks/fixtures.js";

const nodes = getFixture(100);

export function Example() {
  const [mode, setMode] = useState<HyperFlowCanvasMode>("inspect");
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(nodes[0]?.id ?? null);
  const [viewport, setViewport] = useState(() =>
    fitPocViewportToNodes(nodes, { width: 960, height: 540 }),
  );

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
