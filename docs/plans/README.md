# Feature plans

Each feature is planned here before it's built. Claude Code writes and reviews plans; Antigravity implements them.
The rules for both are in `AGENTS.md` (shared), `CLAUDE.md` and `GEMINI.md` at the repo root.

## Next up

Done so far: 0001, 0002, 0006, 0010. From 2026-11-07 Claude Code implements plans too (the user asked); 0011 is built and waits for your look; next is **0007**.

```powershell
cd C:\MyStuff\Projects\HabbitManager      # always start agy inside the repo
agy -i "Implement docs/plans/0010-no-emoji-leetcode-style-ui.md"
```

Then, in this order (run `/review-plan NNNN` in Claude Code after each):
1. **0011** coloured code and a code editor (needs 0010 first, both touch the problem page).
2. **0007** full DSA pattern articles: the format, tests, and three exemplar articles. **Stop and read them**, then tell
   Claude whether the depth is right; Claude then sets 0008 to `ready`.
3. **0008** the other 64 pattern articles, one batch (group) per sitting.
4. **0004** nav and Today, then **0005** global timer and Simple mode (0005 needs 0004).
5. **0009** reading sources and two small lessons (data only, independent; a cheaper model is fine).
6. **0003 steps 3-6**: cp-algorithms Reference tab. Lowest priority: extra reading on top of our own full articles.
   Do it after 0007 (it adds a tab to the new pattern page).

Update this section when a plan is done.

## Workflow

| Step | Who | You say | Result |
|---|---|---|---|
| 1. Plan | Claude Code | `/plan <what you want>` | `docs/plans/NNNN-name.md`, status `ready` |
| 2. Implement | Antigravity | "Implement docs/plans/NNNN-name.md" | code changes, plan updated, status `implemented` |
| 3. Review | Claude Code | `/review-plan NNNN` | *Review* filled in, status `done` or `changes-requested` |
| 4. Fix (if needed) | Antigravity | "Fix the review items in docs/plans/NNNN-name.md" | status back to `implemented`, then review again |
| 5. Commit | You | `git add …` / `git commit` | Claude suggests the message in step 3 |

### Running Antigravity from a terminal (`agy`)

From the repo root (it loads `AGENTS.md` and `GEMINI.md` automatically):

```powershell
agy -i "Implement docs/plans/0001-name.md"                        # interactive: watch it work and approve steps
agy -i "Fix the review items in docs/plans/0001-name.md"          # after a changes-requested review
agy -p "Summarize docs/plans/0001-name.md" --mode plan            # read-only question, prints and exits
```

Use `-i` (interactive) for implementing so you can approve file edits and commands. Avoid
`--dangerously-skip-permissions`.

Statuses: `draft` → `ready` → `in-progress` → `implemented` → `done`, plus `blocked` (implementer has a question
under *Open questions*; answer it in the plan, set it back to `ready`) and `changes-requested`.

## Rules for plans

- One plan per feature, small enough to implement and review in one sitting. Split big features into numbered parts.
- Plans are committed with the code they describe, so the history shows why things changed.
- Numbers never get reused. A dropped plan keeps its file with status `dropped`.

## Index

| # | Plan | Status |
|---|---|---|
| 0001 | [DSA pages: the problem first, everything else in tabs](0001-dsa-focus-and-tabs.md) | done |
| 0002 | [Study pages: all the learning first, your notes and tools after](0002-study-pages-learn-first.md) | done |
| 0003 | [cp-algorithms articles as a reference tab on DSA pattern guides](0003-cp-algorithms-reference.md) | in-progress (step 2 written, steps 3-6 open) |
| 0004 | [Five-item navigation and a short "Up next" Today](0004-nav-and-today.md) | ready |
| 0005 | [One focus timer for the whole app, and Simple mode](0005-global-timer-and-simple-mode.md) | ready |
| 0006 | [Learning pages: one calm reading layout, no summaries inside lessons](0006-learning-pages-declutter.md) | done |
| 0007 | [Full DSA pattern articles: structure, checks, three exemplars](0007-dsa-pattern-articles.md) | ready |
| 0008 | [The remaining 64 DSA pattern articles, one group at a time](0008-dsa-pattern-articles-batches.md) | draft (waits for the 0007 exemplars) |
| 0009 | [Reading sources for system design, LLD, core CS, and two gap lessons](0009-reading-sources-and-gap-lessons.md) | ready |
| 0010 | [No emoji, and LeetCode-style simple lists on the DSA pages](0010-no-emoji-leetcode-style-ui.md) | done |
| 0011 | [Coloured code everywhere, and a real code editor where you write code](0011-code-highlighting-and-editor.md) | implemented (by Claude Code; waiting for your look) |
