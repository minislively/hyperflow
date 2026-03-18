# HyperFlow

HyperFlow is an open-source, embed-first workflow and agent-builder UI engine designed around a Rust + WASM core, canvas-first rendering, and lightweight framework adapters.

This repository is the initial public bootstrap for the project. It establishes the OSS contract, monorepo layout, and product direction before deeper runtime implementation begins.

## What this bootstrap includes

- a fresh `hyperflow` repository with clean git history
- OSS starter files and contribution guidance
- a PRD checked into `docs/prd/`
- an initial monorepo skeleton for core engine, renderer, SDK, wrappers, theming, examples, and benchmarks
- a lightweight workspace validation script
- a first small architecture PoC covering Rust culling/hit testing, WASM bridging, and Canvas box rendering

## Guiding product promise

HyperFlow aims to be:

- **performance-first**: Rust + WASM for graph core, culling, hit testing, and viewport math
- **hybrid by design**: canvas/worker render path with DOM overlay UI where rich editing is needed
- **embed-first**: easy to insert into existing SaaS products
- **framework-neutral at the core**: adapters for React, Vue, Svelte, and vanilla JS
- **open-source friendly**: strong docs, examples, and sensible extension seams

## Initial workspace layout

```
packages/
  core-rs/
  wasm-bindings/
  sdk/
  renderer-canvas/
  react/
  vue/
  svelte/
  vanilla/
  theme-default/
examples/
  react-starter/
  vanilla-starter/
benchmarks/
docs/
  prd/
  architecture/
tooling/
```

## Getting started

```bash
pnpm install
pnpm test
```

At this stage, `pnpm test` still validates repository structure only. Use the PoC scripts below for the first architecture proof.

## PoC commands

```bash
pnpm build:wasm:poc
pnpm test:poc
pnpm bench:poc
pnpm serve:poc
```

Manual harness URL after `pnpm serve:poc`:

```
http://localhost:4173/examples/vanilla-starter/index.html
```

## Product direction

See the canonical product requirements in [`docs/prd/hyperflow-prd-v0.1.md`](./docs/prd/hyperflow-prd-v0.1.md).

## Current PoC scope

The first proof slice intentionally stays narrow:

- `packages/core-rs`: viewport math, visible culling, hit testing
- `packages/wasm-bindings`: raw WASM bridge without extra toolchain dependencies
- `packages/renderer-canvas`: visible-node box rendering only
- `examples/vanilla-starter`: thin manual harness for `100 / 300 / 1000` fixtures

Out of scope for this slice:

- edges / routing
- minimap
- worker/offscreen rendering
- undo/redo
- polished wrapper APIs

## Near-term next steps

1. lock the minimal SDK contract that follows from the PoC outputs
2. refine the PoC harness into a more demonstrable surface
3. add richer renderer capabilities only after the core seam remains stable
