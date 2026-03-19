# react

`packages/react` is the first **thin React adapter** for HyperFlow's current validated PoC slice.

It exists to support a starter-like React product proof without pretending that the full future React API is already stabilized.

## Current role

- render the validated canvas proof inside React
- expose a minimal canvas host for starter-like surfaces
- support bounded product-facing examples such as `toolbar + canvas + inspector`

## Not promised yet

This package does **not** currently claim:

- a broad React wrapper API
- full editor authoring primitives
- finished Starter Kit maturity
- palette/add-node workflow support
- collaboration/history features

## Scope note

This adapter should stay thin until the current product-proof slice is validated in real usage.
