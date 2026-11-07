---
description: Review Antigravity's implementation of a plan in docs/plans/
argument-hint: <plan number, e.g. 0003>
---

Review the implementation of plan $ARGUMENTS in `docs/plans/` (the file whose name starts with that number).

Follow the reviewing rules in CLAUDE.md:

1. Read the plan, including *Implementation notes* and any *Open questions*.
2. Look at the change: `git status`, `git diff` (and new files). Compare it with every step and acceptance criterion.
3. Run `pnpm test` and `pnpm check`. If the UI changed, run the app against a copy of the database and look at it.
4. Look for bugs, missed edge cases, broken conventions from AGENTS.md, unexplained changes outside the plan, and
   missing tests.
5. Fill the plan's *Review* section:
   - `done`: a short verdict and a suggested commit message (no AI attribution).
   - `changes-requested`: a numbered list of fixes, each specific enough for the implementer to act on.
   Update the status in the plan and in the index in `docs/plans/README.md`.
6. Don't fix the code yourself unless I ask. Reply with the verdict and, if needed, the sentence to give Antigravity:
   "Fix the review items in docs/plans/NNNN-name.md".
