# example-react-starter

`examples/react-starter` is now a **frontend-oriented Learn surface** for HyperFlow.

It no longer pretends to be a finished editor demo. Instead, it gives frontend teams a React Flow-like documentation structure with separate Learn, Reference, Examples, and Roadmap sections.

## Current structure

- locale-aware top-level paths such as `/ko/learn`, `/ko/reference`, `/ko/examples`, and `/ko/roadmap`
- browser-language-based default locale detection
- bilingual Korean / English toggle
- markdown-driven page content
- docs categories aligned to the current product maturity

## Current sections

### Learn
- `/ko/learn`
- `/ko/learn/installation`
- `/ko/learn/core-concepts`
- `/ko/learn/react-integration`
- `/ko/learn/customization`
- `/ko/learn/layouting`
- `/ko/learn/performance`
- `/ko/learn/troubleshooting`

### Reference
- `/ko/reference`
- `/ko/reference/runtime-model`
- `/ko/reference/viewport-selection`

### Examples
- `/ko/examples`
- `/ko/examples/minimal-embed`
- `/ko/examples/host-controlled-state`

### Roadmap
- `/ko/roadmap`

English routes mirror the same shape under `/en/...`.

## What it does not claim yet

This example does **not** mean HyperFlow already ships:

- palette / add-node workflow
- edge authoring
- workflow-builder templates
- full product shells
- broad React wrapper maturity

## Why Learn comes first

This surface is intentionally written for frontend teams who need to answer:

- what do I install?
- what does HyperFlow actually own?
- how does it fit into my existing React app?
- what can I customize today?
- does it include layouting or not?

The Learn section now front-loads those answers before pushing people into examples.

## Run

From the repo root:

```bash
pnpm run dev:react-starter
```

Expected local URL:

```text
http://localhost:5173/ko/learn
```
