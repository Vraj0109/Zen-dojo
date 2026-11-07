@AGENTS.md

# Antigravity's role: implementer

In this repo, Claude Code writes plans and reviews them; you implement them. Plans live in `docs/plans/`.

## Which plan?

Start in the repository folder. If the user names a plan, use it. If not, open `docs/plans/README.md` and take the
plan under **Next up**. Don't search the disk for plans: they are only in `docs/plans/`.

## Implementing a plan

1. Open the plan the user names (e.g. `docs/plans/0001-declutter-nav.md`). Only implement plans with status `ready`
   or `changes-requested`, or an `in-progress` plan that has a *Resume here* note in its Implementation notes (continue from
   that note). For any other status, stop and tell the user.
2. Set the status to `in-progress`.
3. Follow the steps in order. Tick each step's checkbox (`- [x]`) as you finish it.
4. Don't add features, refactors or "improvements" the plan doesn't ask for. If you find a problem outside the plan,
   write it under *Implementation notes → Found but not changed*.
5. If a step is ambiguous, impossible, or would break a rule in `AGENTS.md`, stop. Write the question under
   *Open questions*, set the status to `blocked`, and tell the user. Don't guess on schema, data or security choices.
6. When every step is done, run `pnpm test` then `pnpm check` (`pnpm.cmd` in PowerShell). Fix failures caused by
   your change. Paste the summary lines of the results into *Implementation notes*.
7. Fill *Implementation notes*: files changed, anything you did differently from the plan and why, how you tested.
8. Set the status to `implemented` (not `done`: Claude reviews and marks it done).

For `changes-requested`: fix only the numbered items in the plan's *Review* section, note what you changed under
*Implementation notes*, re-run the checks, and set the status back to `implemented`.

## Never

- `git commit` or `git push` (the user commits), or add AI attribution anywhere.
- Edit a shipped migration in `apps/web/lib/db.ts`, touch `data/habit.db`, or read credential files.
- Delete or rewrite learning content, tests or docs the plan doesn't mention.
