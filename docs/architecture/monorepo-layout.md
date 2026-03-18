# HyperFlow Monorepo Layout

This bootstrap mirrors the package boundaries described in the PRD.

## Packages

- `packages/core-rs`: Rust graph core and geometry primitives
- `packages/wasm-bindings`: JS-facing WASM bridge layer
- `packages/sdk`: framework-neutral TypeScript API surface
- `packages/renderer-canvas`: canvas/offscreen render path
- `packages/react`: React adapter
- `packages/vue`: Vue adapter
- `packages/svelte`: Svelte adapter
- `packages/vanilla`: imperative mount API
- `packages/theme-default`: baseline design tokens and theme CSS

## Supporting areas

- `examples/*`: host integration starters
- `benchmarks/`: performance fixtures and benchmark harnesses
- `docs/`: product, architecture, and contributor docs
- `tooling/`: repo-local validation and utility scripts
