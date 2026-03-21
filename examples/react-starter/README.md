# example-react-starter

`examples/react-starter` is the first **starter-like React thin slice** for HyperFlow's open-foundation positioning, delivered through its current workflow builder SDK packages and focused on an **agent builder UI** wedge.

It is intentionally bounded to prove one thing well:

- an agent builder workflow can support `select -> edit form -> Apply -> node update` on top of the current validated HyperFlow slice
- the inspector can be powered by `react-hook-form` without pushing form-library ownership into `@hyperflow/react`

## What it proves

- HyperFlow can show a product-facing workflow builder surface that makes the broader foundation story concrete, not only docs plus a vanilla PoC
- the current validated SDK/canvas slice can power a React starter shell
- package-level `nodeRenderers` registration can inject custom node UI into the starter surface
- Apply-driven `react-hook-form` editing can update those nodes through package-owned state seams
- `useWorkflowNodesState`, `useWorkflowSelection`, `useSelectedNode`, and `updateNodeData` remain the primary host-controlled integration points
- AI coding tools can rely on a small, discoverable set of integration seams instead of bespoke glue
- a bounded **read-only overview mode** can coexist with inspect mode without implying full editing
- **workflow path jump** and **focus selected** affordances can make the starter shell feel more product-like without introducing palette flow
- **live / loading / empty / error** states can be demonstrated without widening into full application logic
- empty and error states can show realistic host-action copy such as loading a workflow, opening a starter template, or retrying a failed load

## What it does not claim yet

This example does **not** mean HyperFlow already ships:

- a full Starter Kit UI
- palette / add-node workflow
- broad React wrapper maturity
- collaboration/version-history features
- a package-level opinion about which form library a host app must use

## Run

From the repo root:

```bash
pnpm run dev:react-starter
```

Expected local URL:

```text
http://localhost:5173/
```

## Integration shape

The official pattern shown here is:

1. HyperFlow owns the canvas and graph-state seams
2. the host owns `nodes` and `selection`
3. the inspector uses `react-hook-form`
4. RHF `reset(...)` follows node selection
5. RHF `handleSubmit(...)` applies changes through `updateNodeData(...)`

This keeps the example product-like while preserving the delivery layer's thin, form-library-agnostic boundary.
