---
description: Write an implementation plan in docs/plans/ for Antigravity to build
argument-hint: <feature to plan>
---

Plan this feature for HabitManager: $ARGUMENTS

Follow the planning rules in CLAUDE.md:

1. Read the relevant code, `AGENTS.md`, and `SPEC.md` if it exists. Ask me only questions whose answers change the plan.
2. Pick the next free number in `docs/plans/` and write `docs/plans/NNNN-short-name.md` from `docs/plans/TEMPLATE.md`.
   - Exact files, functions, migrations, UI components and tests per step, each with a "Done when".
   - Acceptance criteria I can check in the app, plus `pnpm check` passing.
   - Out of scope, and any pitfalls you found (conventions from AGENTS.md that apply).
   - Written for an implementer with no memory of this conversation.
   - If the feature is big, split it into several numbered plans that each ship something usable.
3. Set the status to `ready` and add a row to the index in `docs/plans/README.md`.
4. Don't implement anything. Reply with the plan's path, a 3-5 line summary, and the exact sentence to give
   Antigravity, e.g. "Implement docs/plans/0003-name.md".
