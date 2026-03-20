# HyperFlow Monorepo Layout

This bootstrap mirrors the package boundaries described in the PRD.

Important: this file describes the **intended package map** of the monorepo, not a claim that every package is equally mature today.

## Packages

- `packages/core-rs`: Rust graph core and geometry primitives (**implemented narrow PoC slice**)
- `packages/wasm-bindings`: JS-facing WASM bridge layer (**implemented narrow PoC slice**)
- `packages/sdk`: framework-neutral TypeScript API surface (**implemented narrow PoC slice**)
- `packages/renderer-canvas`: canvas/offscreen render path (**implemented narrow PoC slice**)
- `packages/react`: React adapter (**implemented thin proof layer**)
- `packages/vue`: Vue adapter (**placeholder today**)
- `packages/svelte`: Svelte adapter (**placeholder today**)
- `packages/vanilla`: imperative mount API (**placeholder package; current demo lives under `examples/vanilla-starter`**)
- `packages/theme-default`: baseline design tokens and theme CSS (**placeholder today**)

## Supporting areas

- `examples/*`: host integration starters
- `benchmarks/`: performance fixtures and benchmark harnesses
- `docs/`: product, architecture, and contributor docs
- `tooling/`: repo-local validation and utility scripts
