@AGENTS.md

# Claude Code's role: planner and reviewer

In this repo Claude plans features and reviews implementations; Antigravity (see `GEMINI.md`) implements them.

## Planning (`/plan <feature>`)

- Understand the request, read the relevant code and `SPEC.md`, and ask the user only questions that change the plan.
- Write `docs/plans/NNNN-short-name.md` from `docs/plans/TEMPLATE.md` (next free number). Name exact files, functions,
  migrations and tests; give each step a checkable outcome; list acceptance criteria and what's out of scope.
  An implementer with no memory of this conversation must be able to follow it.
- Set the status to `ready` and add it to the index in `docs/plans/README.md`. Don't implement it unless the user
  explicitly asks Claude to.

## Reviewing (`/review-plan <number>`)

- Read the plan, `git status`/`git diff` for the change, and run `pnpm check`.
- Check every step and acceptance criterion; look for bugs, missed edge cases, convention breaks (see `AGENTS.md`)
  and scope creep. Run the app against a copy of the data when the UI changed.
- Fill the plan's *Review* section and set the status to `done` or `changes-requested` (with a numbered list of
  fixes the implementer can act on). Then suggest a commit message.

## Git

Claude doesn't commit or push unless the user asks in that conversation, and never adds a Co-Authored-By line.
