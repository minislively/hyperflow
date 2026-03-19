# HyperFlow

HyperFlow is an open-source **workflow builder SDK** for teams shipping node-based products such as automation builders, agent orchestration tools, internal ops workflows, and approval/process editors.

The product promise is simple:

- **ship workflow editors faster** without building a canvas stack from scratch
- **stay usable as graphs grow** through a Rust + WASM + canvas-backed architecture
- **embed naturally into existing products** instead of forcing a full-platform rewrite

This repository is the current public bootstrap. It already contains a validated small PoC for the rendering/interaction core, plus the package and documentation structure needed to grow toward the broader SDK + Starter Kit surface.

## What HyperFlow is

HyperFlow is positioned as a:

- **high-performance workflow builder SDK** for product teams
- **Starter Kit direction** for faster evaluation and adoption
- **product-first, engine-second** system

Rust, WASM, and canvas are important here, but they are the enabling implementation — not the category definition.

## Why teams would use it

Teams usually start with a general-purpose node editor, then hit friction as they add:

- larger graphs
- heavier custom node UI
- richer panels/forms/validation
- product-specific interaction rules
- long-term maintenance expectations

HyperFlow is being built for that moment: when a team wants a workflow builder surface that still feels product-ready as complexity grows.

## Product promise

HyperFlow aims to be:

- **workflow-builder-first**: optimize for real product surfaces, not just graphics tech
- **performance-aware at scale**: use Rust + WASM + canvas where DOM-heavy editors usually degrade
- **embed-first**: fit into existing SaaS products and internal tools
- **framework-friendly**: keep a framework-neutral core with adapter surfaces for React and beyond
- **honest about maturity**: clearly separate what is validated today from what is directional

## Current repo state

The current repository proves a **narrow validated slice**, not the full future product.

Validated now:

- Rust viewport math, visible culling, and hit testing
- a thin WASM bridge
- canvas visible-box rendering
- a guided vanilla demo surface
- a minimal stable SDK contract for the current PoC
- a React starter proof with package-level `nodeRenderers` custom-node injection

Not yet product-complete:

- rich editor APIs
- full wrapper maturity
- Starter Kit UI
- collaboration/history features
- broad public API stabilization across all packages

## React Flow comparison, correctly framed

HyperFlow can be evaluated by teams who are also considering React Flow–style tools, but that comparison is **secondary**.

- **Primary framing:** HyperFlow is a **workflow builder SDK**
- **Secondary framing:** if you are hitting scale, customization, or long-term architecture limits with DOM-first editors, HyperFlow is a relevant alternative to evaluate

## What this bootstrap includes

- a fresh `hyperflow` repository with clean git history
- OSS starter files and contribution guidance
- a canonical PRD in `docs/prd/`
- an initial monorepo skeleton for core engine, renderer, SDK, wrappers, theming, examples, and benchmarks
- a lightweight workspace validation script
- a first small architecture PoC covering Rust culling/hit testing, WASM bridging, and canvas box rendering

## Initial workspace layout

```text
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
  evaluator/
tooling/
```

## Getting started

```bash
pnpm install
pnpm test
```

At this stage, `pnpm test` validates repository structure. Use the PoC commands below to exercise the currently validated rendering/interaction slice.


## Fastest React proof path

If you want to see the current Workflow Builder SDK direction in a React surface first, run:

```bash
pnpm run dev:react-starter
```

Then open:

```text
http://localhost:5173/
```

The current React starter now proves the product experience more directly:

- select a workflow node
- edit its inspector form
- click `Apply`
- watch the custom node UI and graph state update together

Supporting proof that makes that possible:

- starter-like `toolbar + canvas + inspector` composition
- bounded starter states (`live / loading / empty / error`)
- package-level custom node injection through `nodeRenderers`
- React-like host state ownership through `useWorkflowNodesState`

Minimal custom-node seam example:

```tsx
import { HyperFlowPocCanvas } from "@hyperflow/react";

<HyperFlowPocCanvas
  nodes={nodes}
  viewport={viewport}
  nodeRenderers={{
    "customer-ticket": CustomerTicketNode,
    "draft-response": DraftResponseNode,
  }}
  getNodeRendererKey={(node) =>
    node.id === 1 ? "customer-ticket" : node.id === 6 ? "draft-response" : null
  }
/>
```

This is still a thin proof seam, not a full stable node registry API.


## PoC commands

```bash
pnpm build:wasm:poc
pnpm test:poc
pnpm bench:poc
pnpm serve:poc
```

Manual harness URL after `pnpm serve:poc`:

```text
http://localhost:4173/examples/vanilla-starter/index.html
```

## Canonical product direction

See the main product definition in [`docs/prd/workflow-builder-sdk-prd-v0.1.md`](./docs/prd/workflow-builder-sdk-prd-v0.1.md).

## Current validated slice

The current validated slice now covers both the original PoC seam and the first package-facing React usage proof:

- `packages/core-rs`: viewport math, visible culling, hit testing
- `packages/wasm-bindings`: raw WASM bridge without extra toolchain dependencies
- `packages/renderer-canvas`: visible-node box rendering only
- `packages/sdk`: the current validated SDK contract for the PoC slice
- `packages/react`: thin React adapter with `nodeRenderers` and `useWorkflowNodesState`-class package seams
- `examples/react-starter`: starter-like React proof for custom nodes, state previews, and host-controlled usage model
- `examples/vanilla-starter`: legacy guided product-demo surface for the earlier proof story

Deferred intentionally in this slice:

- edges / routing
- minimap
- worker/offscreen rendering maturity
- undo/redo
- polished wrapper APIs
- collaboration / version history

## Stable SDK surface after the PoC

The current stable SDK slice covers:

- viewport and visible-box shapes
- frame metrics shape
- a thin engine contract for fixture load, render frame, visible queries, and hit test

This is **not yet the full future HyperFlow product API**. It is the currently validated contract beneath the broader workflow builder SDK direction.

Current SDK precondition: call `loadFixture(nodes)` before rendering a frame.

## Near-term next step

The current public-facing story should now be read in this order:

- first: automation-SaaS Apply-driven form editing proof
- second: custom-node seam + host-state helper that make that proof possible
- third: deeper package ergonomics and broader editing surface expansion

## Evaluator workflow

To test the current guided demo with first-time evaluators, use:

- `docs/evaluator/README.md`
- `docs/evaluator/session-checklist.md`
- `docs/evaluator/session-script.md`
- `docs/evaluator/feedback-template.md`
