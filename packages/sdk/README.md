# sdk

`packages/sdk` is the **current core SDK layer** for HyperFlow's validated PoC slice.

HyperFlow's product direction is a **workflow builder SDK**. This package is the narrow technical contract that currently proves that direction from the inside out.

## Stable now

- viewport shape
- visible box shape
- metrics summary shape
- engine operations for fixture load, render frame, visible queries, and hit test

## What this package represents

This package currently represents:

- the validated SDK contract beneath the present PoC
- a bridge between the Rust/WASM/canvas slice and future higher-level product surfaces
- an intentionally small surface that can be consumed without pretending the full product API already exists

## Deferred

Still deferred at this stage:

- edge/minimap/editor APIs
- broad framework wrapper contracts
- richer renderer capabilities
- collaboration/history concerns
- full Starter Kit UI

## Important scope note

This package is **not yet the whole HyperFlow product API**. It is the currently stabilized contract inside a broader workflow builder SDK direction.
