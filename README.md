# HyperFlow

HyperFlow is an open-source, embed-first workflow and agent-builder UI engine designed around a Rust + WASM core, canvas-first rendering, and lightweight framework adapters.

This repository is the initial public bootstrap for the project. It establishes the OSS contract, monorepo layout, and product direction before deeper runtime implementation begins.

## What this bootstrap includes

- a fresh `hyperflow` repository with clean git history
- OSS starter files and contribution guidance
- a PRD checked into `docs/prd/`
- an initial monorepo skeleton for core engine, renderer, SDK, wrappers, theming, examples, and benchmarks
- a lightweight workspace validation script

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

At this stage, `pnpm test` validates repository structure only. Implementation packages are placeholders and will be expanded incrementally.

## Product direction

See the canonical product requirements in [`docs/prd/hyperflow-prd-v0.1.md`](./docs/prd/hyperflow-prd-v0.1.md).

## Near-term next steps

1. land the first Rust core proof of concept for viewport, culling, and hit testing
2. define the JS↔WASM bridge contract
3. implement a canvas renderer proof surface
4. add React and vanilla integration examples
5. establish benchmark fixtures for 100 / 300 / 1000 node scenarios
