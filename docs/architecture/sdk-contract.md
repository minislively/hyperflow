# HyperFlow SDK Contract (Current Validated Slice)

This document explains the **currently validated SDK boundary** inside the broader HyperFlow product direction.

Important framing:

- **Product definition:** HyperFlow is a workflow builder SDK
- **Current validated contract:** the small PoC slice described below
- **Not implied:** that the full future product API is already stabilized

## Why this document exists

The repo now positions HyperFlow as a **workflow builder SDK** rather than primarily as an engine. That broader product story still needs a narrow, honest technical boundary for what is actually proven today.

This document is that boundary.

## What is stable in the current slice

### Shapes
- `PocNode`
- `PocRuntimeNode`
- `PocViewport`
- `VisibleBox`
- `PocMetrics`

### Engine operations
- `loadFixture(runtimeNodes)`
- `renderFrame(context, viewport, renderOptions?)`
- `hitTest(worldPoint)`
- `getVisibleNodeIds()`
- `getVisibleBoxes()`
- `getNodeCount()`
- `resolveNodeAnchorsBatch(requests)`
- `resolveEdgeAnchorsBatch(requests)`
- `resolveEdgeCurvesBatch(requests)`

### Utility operations
- `createPocViewport(width, height, overrides?)`
- `createPocMetricsSummary(metrics)`
- `createPocEdgePathResolutionRequest(options)`
- `getPocNodeCenter(node)`
- `getPocCenteredSlotSpread(slot, slotCount, spreadStep?)`
- `resolvePocNodeAnchors(node, options)`
- `resolvePocEdgeCurveSpread(options)`
- `resolvePocSmoothEdgeCurve(options)`
- `buildPocSvgCurvePath(curve)`
- `buildSmoothPocEdgePath(options)`

## How to interpret this contract

This contract should be read as:

- the **validated core** beneath the current HyperFlow story
- the SDK layer that proves the PoC can be consumed intentionally
- a narrow bridge between the Rust/WASM/canvas slice and future higher-level product surfaces

## Public node shape vs runtime node shape

The current SDK now separates:

- **`PocNode`** — the editor-facing shape used by React consumers
  - `id`
  - `type`
  - `position`
  - `size`
  - `data`
- **`PocRuntimeNode`** — the geometry-only shape passed into the Rust/WASM runtime
  - `id`
  - `x`
  - `y`
  - `width`
  - `height`

That split is intentional. It makes the public node model easier to compare against React Flow-style editor nodes while keeping the runtime boundary focused on geometry and viewport work.

## Anchor and edge-path seam

The current slice also now exposes a **shared anchor/path calculation seam** in the SDK.

That seam is now intentionally consumable as a single rendered-edge helper (`resolvePocRenderableEdgesBatch(...)`) so the main canvas and starter minimap do not each maintain their own curve-projection math.

The current performance slice also pushes more of that seam through the shared engine path: the starter editor now shares one `createPocEngine(...)` instance across the main canvas and minimap so both surfaces can consume the same Rust/WASM-backed anchor/curve resolution instead of splitting between engine-backed canvas math and TS-only minimap math.

That seam is intentionally used by both:

- the main React canvas overlay
- the starter minimap projection

The goal is to keep the following on the same contract before any broader Rust/WASM migration:

- visible handle side selection
- actual edge start/end anchors
- sibling fan-out offsets
- rendered edge paths

The current validated split is now intentionally two-tiered:

- **node-level anchors** still preserve the current one-handle-per-role authoring UX
- **edge-level transient anchors** now derive per-edge start/end points and per-edge side choices, so edges no longer have to borrow a node-wide representative side when the opposite node clearly sits elsewhere
- **representative visible handles** stay on the dominant rendered side for each role so the editor affordance reads like the rendered topology instead of fighting it
- **slot-aware curve requests** derive same-side curve offsets from per-edge `slot` / `slotCount` metadata so the main canvas and minimap no longer have to invent separate sibling spread math

This means the current validated boundary is no longer only "editor-facing node shape vs runtime geometry node shape". It also includes a narrow, shared **anchor + edge-path utility layer** and a matching **batched engine seam** that higher-level surfaces can call consistently today and migrate inward later.

This contract should **not** be read as:

- the full Workflow Builder SDK API
- a complete editor/runtime authoring surface
- a guarantee that all wrapper packages are already stable
- a promise that Starter Kit UI exists in finished form today

## Deferred on purpose

Still deferred in this slice:

- edge APIs
- minimap APIs
- worker/offscreen renderer maturity
- richer editor/runtime authoring APIs
- broad React/Vue/Svelte wrapper contracts
- collaboration / version history concerns

## Contract source of truth

The current contract is derived from the proven PoC behavior in `docs/architecture/poc-contract.md` and wraps the validated bridge + renderer behavior without overpromising the broader product API.

## Known preconditions

- `loadFixture(runtimeNodes)` must be called before `renderFrame(...)`
- the current SDK intentionally keeps fixture lifecycle explicit
- the current SDK wraps both the engine-facing bridge and the canvas renderer for speed of validation in the PoC stage

## Relationship to the broader product architecture

HyperFlow can be understood in three layers:

1. **Workflow Builder SDK** — the product category
2. **Starter surface / examples / integration guidance** — the adoption layer
3. **Rust + WASM + canvas-backed core contract** — the enabling validated slice

This document describes layer 3, while helping layer 1 stay honest.

## Future split candidates

If future non-canvas or higher-level consumers appear, likely split candidates are:

- `sdk-core` — narrow engine-facing contract
- renderer adapter boundary — canvas-specific rendering seam
- higher-level integration surface — product-facing builder API

These are directional possibilities, not frozen public commitments.
