# HyperFlow Small PoC Contract

This document defines the temporary contract for the first architecture proof slice.

## Runtime fixture node shape

The Rust + WASM boundary still receives geometry-first nodes:

```ts
type PocRuntimeNode = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
```

The WASM bridge packs fixtures as a flat `Float32Array` in this order per node:

```
[id, x, y, width, height]
```

## Viewport model

```ts
type PocViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
};
```

World-space visible bounds are derived as:

- left = `x`
- top = `y`
- right = `x + width / zoom`
- bottom = `y + height / zoom`

## Bridge operations

The bridge exposes four primary actions:

1. load fixture data
2. set viewport and compute visible nodes
3. query visible boxes
4. perform point hit testing

## Output shape

Visible boxes are returned to JS as objects with:

```ts
type VisibleBox = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
```

## Explicit exclusions

This PoC does **not** include:

- edges
- routing
- minimap
- undo/redo
- grouping
- offscreen/worker rendering
- stable public API guarantees
