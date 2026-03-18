# HyperFlow Small PoC SDK Contract

This document captures the first intentionally stable SDK boundary after the small PoC.

## Stable in this slice

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

## Deferred on purpose
- edge APIs
- minimap APIs
- worker/offscreen renderer concerns
- React/Vue/Svelte wrapper contracts
- broader editor/runtime authoring APIs

## Contract source of truth

The SDK is derived from the proven PoC contract in `docs/architecture/poc-contract.md` and wraps the currently validated bridge + renderer behavior without promising the full HyperFlow product API yet.

## Known preconditions and future split

- `loadFixture(nodes)` must be called before `renderFrame(...)`. The first stable SDK keeps this explicit instead of hiding fixture lifecycle.
- The current SDK intentionally wraps both the engine-facing bridge and the canvas renderer for speed of adoption. If future non-canvas consumers appear, split candidates are `sdk-core` (engine contract) and a renderer adapter boundary.
