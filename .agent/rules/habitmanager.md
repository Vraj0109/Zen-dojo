# HabitManager workspace rules

Read and follow `AGENTS.md` (shared rules) and `GEMINI.md` (your role: implementer) at the repository root before
making any change.

In short:
- Implement only the plan the user names in `docs/plans/`, with status `ready` or `changes-requested`.
- Follow its steps in order, tick them off, fill *Implementation notes*, run `pnpm test` and `pnpm check`,
  then set the status to `implemented`.
- If something is unclear, write it under *Open questions*, set the status to `blocked`, and stop.
- Never commit or push, never edit shipped migrations, never touch `data/habit.db`.
