# example-react-starter

`examples/react-starter` is the first **starter-like React thin slice** for HyperFlow.

It is intentionally bounded to prove one thing well:

- a React-rendered `toolbar + canvas + inspector` surface can be built on the current validated HyperFlow slice

## What it proves

- HyperFlow can show a product-facing React surface, not only docs plus a vanilla PoC
- the current validated SDK/canvas slice can power a React starter shell
- click-based inspector updates can stay tied to real current-slice proof signals
- a bounded **read-only overview mode** can coexist with inspect mode without implying full editing
- **guided jump** and **focus selected** affordances can make the starter shell feel more product-like without introducing palette flow
- **live / loading / empty / error** states can be demonstrated without widening into full application logic

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
