# Contributing to HyperFlow

Thanks for contributing. HyperFlow is at bootstrap stage, so changes should optimize for clarity, small diffs, and future extensibility.

## Ground rules

- keep changes small and reviewable
- prefer deletion and simplification over new abstractions
- align package boundaries to the product architecture in the PRD
- avoid introducing new dependencies without a documented reason
- add or update docs when changing public-facing structure or product promises

## Development workflow

1. create a feature branch
2. make focused changes
3. run `pnpm test`
4. open a pull request with a concise summary and verification notes

## Repository intent

This repository is intended to evolve into a performance-oriented open-source workflow engine. During bootstrap, some packages are placeholders; treat them as contracts for future implementation rather than stable APIs.
