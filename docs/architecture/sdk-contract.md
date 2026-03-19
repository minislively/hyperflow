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
- `PocViewport`
- `VisibleBox`
- `PocMetrics`

### Engine operations
- `loadFixture(nodes)`
- `renderFrame(context, viewport, renderOptions?)`
- `hitTest(worldPoint)`
- `getVisibleNodeIds()`
- `getVisibleBoxes()`
- `getNodeCount()`

### Utility operations
- `createPocViewport(width, height, overrides?)`
- `createPocMetricsSummary(metrics)`

## How to interpret this contract

This contract should be read as:

- the **validated core** beneath the current HyperFlow story
- the SDK layer that proves the PoC can be consumed intentionally
- a narrow bridge between the Rust/WASM/canvas slice and future higher-level product surfaces

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

- `loadFixture(nodes)` must be called before `renderFrame(...)`
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
