# HyperFlow

HyperFlow should first read like the screen where teams **design agent workflows by connecting agents, tools, and human review steps**.

Under that first impression, HyperFlow is an open foundation for modern workflow builders, adopted today through installable **SDK packages for TypeScript/React apps**.

The product promise is simple:

- **ship workflow builders faster** without assembling a canvas stack from scratch
- **stay usable as workflow complexity grows** through a Rust + WASM + canvas-backed core path
- **embed naturally into existing products** instead of forcing a full-platform rewrite

HyperFlow is aimed first at teams building:

- agent builder UI and agent orchestration products
- AI workflow products embedded into existing apps
- automation SaaS workflow editors
- internal ops and approval workflow tools
- data / pipeline workflow surfaces

The **first wedge** is agent builder UI: HyperFlow should feel especially good when teams use AI coding tools to wire custom nodes, inspector panels, and workflow state without the integration story becoming tangled.

Important honesty guardrail: HyperFlow is **not** a finished SaaS product. The current repo is a bounded starter/foundation surface that should feel product-like first, then explain the foundation and SDK truth beneath it.

HyperFlow is **not** currently positioned as a generic diagramming, whiteboard, or mind-map library.

This repository is the current public bootstrap of that foundation story. It already contains a validated narrow slice of the rendering/interaction core, plus the packages and example surfaces needed to grow toward the broader workflow-builder system.

## What HyperFlow is

HyperFlow should be read in four layers:

- **first impression:** a product-like agent builder surface
- **identity:** an open foundation for modern workflow builders
- **delivery model:** installable SDK packages for TypeScript/React product teams
- **proof layer:** a product-first system whose core evolved from TS/React surfaces toward Rust + WASM + canvas as scale and complexity grew

Rust, WASM, and canvas matter here, but they are the enabling architecture — not the category definition.

## Why teams would use it

Many teams start with a general-purpose node editor, then hit friction as they add:

- larger graphs
- heavier custom node UI
- richer panels/forms/validation
- product-specific interaction rules
- long-term maintenance expectations

HyperFlow is being built for that moment: when a team wants a workflow builder surface that still feels product-ready as complexity grows, without abandoning the TypeScript/React product surface they already ship.

## Product promise

HyperFlow aims to be:

- **workflow-builder-first**: optimize for real product surfaces, not just graphics tech
- **product-shell-legible**: let people picture the actual agent-builder screen before they parse the platform story
- **foundation-minded**: support reusable workflow-building patterns, not only a single demo package
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

## HyperFlow, explained simply

If you are new to this repo, the easiest way to think about HyperFlow is:

- a **product team installs HyperFlow** to build an agent builder or workflow builder inside an existing app
- that team needs a canvas, selectable nodes, inspector flows, and host-controlled workflow state
- their end users then interact with the resulting workflow surface inside that product
- AI coding tools should be able to discover the integration seams without lots of bespoke glue
- the team does **not** want to build the rendering/math/performance layer from scratch

HyperFlow is trying to be the reusable foundation for that kind of product surface.

In plain language:

- **Rust core** does the heavy math work
- **WASM bridge** lets TypeScript/JavaScript talk to that Rust core
- **Canvas renderer** draws the visible nodes
- **SDK packages** wrap those lower-level pieces in a simpler product-facing API
- **React package** makes that SDK usable in a React app today
- **examples/** show what the current proof looks like in a real UI

Important: this repo is **not yet a full workflow builder product**.
Today it is a **working narrow slice that proves the foundation story can be real in a React product surface**.

## Beginner mental model: how the pieces connect

Korean beginner guide: [`docs/architecture/hyperflow-beginner-guide-ko.md`](./docs/architecture/hyperflow-beginner-guide-ko.md)

When you run the React starter, the flow is roughly:

1. `examples/react-starter` provides the demo app UI
2. `@hyperflow/react` provides the React-facing canvas and state helpers
3. `@hyperflow/sdk` provides the small current engine API
4. `packages/wasm-bindings` connects JavaScript to Rust/WASM
5. `packages/core-rs` calculates visibility and hit testing
6. `packages/renderer-canvas` draws the visible nodes on canvas

That means:

- the **example app** owns product UI and form logic
- the **React package** owns thin integration seams
- the **SDK + Rust/WASM + renderer** own the currently proven engine path

## What is actually working today

Here is the simplest honest status map for this repo:

| Area | Status today | What it means |
| --- | --- | --- |
| `packages/core-rs` | Implemented | Real Rust viewport/culling/hit-test logic exists |
| `packages/wasm-bindings` | Implemented at JS runtime | JS bridge works, but TS-facing entry is still placeholder-like |
| `packages/renderer-canvas` | Implemented at JS runtime | Canvas box rendering works, but TS-facing entry is still placeholder-like |
| `packages/sdk` | Implemented | Thin current PoC API exists |
| `packages/react` | Implemented | Thin React wrapper and hooks exist |
| `examples/react-starter` | Implemented | Best current product-style demo |
| `examples/vanilla-starter` | Partly implemented | Useful demo harness, but more internal/proof-like |
| `packages/vue` / `svelte` / `vanilla` / `theme-default` | Placeholder | Present as future package boundaries, not mature implementations |

So if you are evaluating the repo, the most important truth is:

> **HyperFlow already has a real narrow core path, but much of the broader package map is still future-facing scaffold.**

## React Flow comparison, correctly framed

HyperFlow can be evaluated by teams who are also considering React Flow–style tools, but that comparison is **secondary**.

- **Primary framing:** HyperFlow is an **open foundation for modern workflow builders**
- **Delivery reality:** teams adopt it through **workflow-builder SDK packages** for TypeScript/React apps
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
pnpm run check
pnpm run verify
```

Use `pnpm run check` for quick workspace validation and `pnpm run verify` for runtime test verification.


## Fastest React proof path

If you want to see the current workflow-builder foundation direction in a React surface first, run:

```bash
pnpm run dev
```

Open this URL in your browser:

```text
http://localhost:5173/
```

If the page loads correctly, you should immediately see:

- a product-like action bar at the top
- a left rail with agent/tool building blocks
- a workflow canvas in the center
- an inspector panel for the selected step
- a visible starter/maturity cue so the shell stays honest about scope

Quick 30-second user check:

1. Click a visible node on the canvas.
2. Change a field in the inspector.
3. Click `Apply` and confirm the node content updates.

If this works, the current React starter proof path is running as intended.

The current React starter is designed to prove the product experience directly:

- select a workflow node
- edit its inspector form
- click `Apply`
- watch the custom node UI and graph state update together
- power the inspector with `react-hook-form` while keeping `@hyperflow/react` graph-state-first

Supporting proof that makes that possible:

- starter-like `toolbar + canvas + inspector` composition
- bounded starter states (`live / loading / empty / error`)
- package-level custom node injection through `nodeRenderers`
- React-like host state ownership through `useWorkflowNodesState`
- explicit package-level selection handling through `useWorkflowSelection`
- a documented `react-hook-form` integration pattern built on `useSelectedNode` + `updateNodeData`

Minimal custom-node seam example:

```tsx
import { HyperFlowPocCanvas } from "@hyperflow/react";

<HyperFlowPocCanvas
  nodes={nodes}
  viewport={viewport}
  nodeRenderers={{
    "task-brief": TaskBriefNode,
    "manager-response": ManagerResponseNode,
  }}
  getNodeRendererKey={(node) =>
    node.id === 1 ? "task-brief" : node.id === 6 ? "manager-response" : null
  }
/>
```

This is still a thin proof seam, not a full stable node registry API.

The intended usage model is:

- HyperFlow owns canvas + graph-state seams
- the host app owns `nodes` and `selection`
- inspector forms can be built with libraries like `react-hook-form`
- Apply flows commit back through `updateNodeData(...)`


## Primary commands

```bash
pnpm run dev          # react starter dev server
pnpm run build        # react starter production build
pnpm run check        # workspace structure validation
pnpm test             # runtime tests (build:wasm + rust + js)
pnpm run test:e2e     # browser-level UI flow test (react starter)
pnpm run verify       # check + test (no benchmark)
pnpm run verify:full  # verify + benchmark
pnpm run serve        # serve static demo at :4173
```

First-time E2E setup may require:

```bash
pnpm exec playwright install chromium
```

Manual harness URL after `pnpm run serve`:

```text
http://localhost:4173/examples/vanilla-starter/index.html
```

## Canonical product direction

See the main product definition in [`docs/prd/hyperflow-prd-v0.1.md`](./docs/prd/hyperflow-prd-v0.1.md).

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

- first: agent-builder Apply-driven integration proof
- second: custom-node seam + host-state helper that make that proof possible
- third: deeper package ergonomics and broader editing surface expansion

## Evaluator workflow

To test the current guided demo with first-time evaluators, use:

- `docs/evaluator/README.md`
- `docs/evaluator/session-checklist.md`
- `docs/evaluator/session-script.md`
- `docs/evaluator/feedback-template.md`
