# example-react-starter

`examples/react-starter` is now a **paged Learn surface** for HyperFlow.

It no longer pretends to be a finished editor demo.
Instead, it explains the current role of HyperFlow through separate readable pages.

## Current structure

- locale-aware top-level paths such as `/ko/learn`, `/ko/reference`, and `/ko/roadmap`
- browser-language-based default locale detection
- bilingual Korean / English toggle
- markdown-driven page content
- a narrower explanation of what HyperFlow actually proves today

## Current pages

- `/ko/learn`
- `/ko/learn/current-role`
- `/ko/learn/validated-slice`
- `/ko/reference`
- `/ko/reference/architecture`
- `/ko/roadmap`
- `/en/learn`
- `/en/learn/current-role`
- `/en/learn/validated-slice`
- `/en/reference`
- `/en/reference/architecture`
- `/en/roadmap`

## What it does not claim yet

This example does **not** mean HyperFlow already ships:

- palette / add-node workflow
- edge authoring
- workflow-builder templates
- full product shells
- broad React wrapper maturity

## Run

From the repo root:

```bash
pnpm run dev:react-starter
```

Expected local URL:

```text
http://localhost:5173/ko/learn
```
