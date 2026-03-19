# vanilla-starter

`examples/vanilla-starter` is the **current guided product-demo surface** for HyperFlow's validated PoC slice.

It helps evaluators understand the product direction — a workflow builder SDK with a Starter Kit direction — through the narrow slice that is already proven today.

## What it demonstrates now

- scenario-first runtime storytelling
- Rust viewport/culling/hit-test proof through the current SDK contract
- summary cards for visible nodes, viewport work, and render timing
- a lightweight guided interaction flow

## What it does not imply yet

This demo does **not** mean HyperFlow already ships:

- a finished Starter Kit UI
- a broad editor API
- mature wrapper packages
- collaboration/version-history features

It is the current proof surface beneath that broader product direction.

## Run

From the repo root:

```bash
pnpm build:wasm:poc
pnpm serve:poc
```

Then open:

```text
http://localhost:4173/examples/vanilla-starter/index.html
```
