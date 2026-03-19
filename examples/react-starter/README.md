# example-react-starter

`examples/react-starter` is the first **starter-like React thin slice** for HyperFlow.

It is intentionally bounded to prove one thing well:

- an automation SaaS workflow can support `select -> edit form -> Apply -> node update` on top of the current validated HyperFlow slice

## What it proves

- HyperFlow can show a product-facing React surface, not only docs plus a vanilla PoC
- the current validated SDK/canvas slice can power a React starter shell
- package-level `nodeRenderers` registration can inject custom node UI into the starter surface
- Apply-driven form editing can update those nodes through package-owned state seams
- a bounded **read-only overview mode** can coexist with inspect mode without implying full editing
- **guided jump** and **focus selected** affordances can make the starter shell feel more product-like without introducing palette flow
- **live / loading / empty / error** states can be demonstrated without widening into full application logic
- empty and error states can show realistic host-action copy such as loading a workflow, opening a starter template, or retrying a failed load

## What it does not claim yet

This example does **not** mean HyperFlow already ships:

- a full Starter Kit UI
- palette / add-node workflow
- broad React wrapper maturity
- collaboration/version-history features

## Run

From the repo root:

```bash
pnpm run dev:react-starter
```

Expected local URL:

```text
http://localhost:5173/
```
