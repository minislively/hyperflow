# HyperFlow Evaluator Workflow

Use this workflow to test the guided `examples/vanilla-starter` demo with first-time evaluators.

## What this workflow is for

The current goal is simple:

> Can a first-time evaluator understand what the HyperFlow demo proves within roughly 30 seconds?

This workflow helps you run lightweight sessions, capture hesitation points, and decide whether the next refinement pass should focus on copy, information hierarchy, or guided interaction wording.

## Artifacts

- `docs/evaluator/session-checklist.md` — facilitator checklist before, during, and after a session
- `docs/evaluator/session-script.md` — lightweight session script and neutral prompts
- `docs/evaluator/feedback-template.md` — note-taking template plus success/confusion rubric

## Minimum session setup

1. Open the guided demo:
   - `http://localhost:4173/examples/vanilla-starter/index.html`
2. Use the current repo branch/build that already passes:
   - `pnpm run verify`
3. Recruit a first-time evaluator who has not been coached on the intended story.
4. Decide upfront whether the session will be recorded; if not, make sure the facilitator can capture notes live without slowing the session down.

## What to look for

- Do they understand what HyperFlow is proving quickly?
- Do the scenario names make sense without translation?
- Do the guided steps reduce guesswork?
- Do the summary cards feel informative instead of debug-heavy?

## What comes after sessions

After 3-5 sessions, compare notes:

- repeated hesitation point = likely refinement target
- repeated misunderstanding = likely copy or hierarchy issue
- smooth comprehension = signal that the current story is working
