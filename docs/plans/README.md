# Feature plans

Each feature is planned here before it's built. Claude Code writes and reviews plans; Antigravity implements them.
The rules for both are in `AGENTS.md` (shared), `CLAUDE.md` and `GEMINI.md` at the repo root.

## Next up

**Picking this up as a new agent? Read [`docs/HANDOFF.md`](../HANDOFF.md) first.** It has the state of every plan, the order of the remaining work, how to verify, and the mistakes already made.

Done: 0001-0007, 0009-0012, 0015-0021, 0023-0027. In progress: 0008 (batches 1-6 merged, 40 of 68 written), 0014 (batches A-D merged, 20 of 27 designs), 0022 (batches 6-9 roadmap problems, design problems, CSES additions, and DSA source filter merged).

| Plan | What | Status |
|---|---|---|
| [0014](0014-system-design-depth.md) | System design depth: walkthroughs, diagrams, Java code | in-progress (batches A-D merged, 20/27 designs) |
| [0015](0015-core-subjects-depth.md) | Core subjects (OS, DB, networking, concurrency) depth | implemented (by agent C) |
| [0021](0021-run-button-v2.md) | Run button v2: hide `#include`/imports, last run saved, custom input | implemented (by agent A) |
| [0022](0022-problem-library.md) | Problem library: remaining roadmap problems, all CSES, other platforms, design-class problems | in-progress (batches 6-9, design problems, CSES additions, DSA filter merged) |
| [0023](0023-editable-content-and-navigation.md) | Lessons as Markdown, fix SOLID and other ordering, subtopics in navigation, content-editing guide | implemented (by agent C) |
| [0024](0024-content-packs-v2.md) | Content packs v2: add to existing courses, patch lessons, update feed, pack tools | implemented (by agent A) |
| [0025](0025-more-lld-topics.md) | More LLD topics, vending machine and ATM as code | implemented (by agent D) |
| [0026](0026-parallel-agents.md) | Run plans 0021 to 0025 with four Claude agents at once | implemented (all 4 merged) |
| [0027](0027-round-two-parallel-work.md) | Round two: the rest of the open work for the same four agents | implemented (all 4 merged) |

```powershell
cd C:\MyStuff\Projects\HabbitManager      # always start agy inside the repo
agy -i "Implement docs/plans/0021-run-button-v2.md"
```

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
| 0003 | [cp-algorithms articles as a reference tab on DSA pattern guides](0003-cp-algorithms-reference.md) | implemented (by Claude Code) |
| 0004 | [Five-item navigation and a short "Up next" Today](0004-nav-and-today.md) | implemented (by Claude Code) |
| 0005 | [One focus timer for the whole app, and Simple mode](0005-global-timer-and-simple-mode.md) | implemented (by Claude Code) |
| 0006 | [Learning pages: one calm reading layout, no summaries inside lessons](0006-learning-pages-declutter.md) | done |
| 0007 | [Full DSA pattern articles: structure, checks, three exemplars](0007-dsa-pattern-articles.md) | implemented (by Claude Code; C++ not compiled yet) |
| 0008 | [The remaining 64 DSA pattern articles, one group at a time](0008-dsa-pattern-articles-batches.md) | in-progress (batches 1-3 of 10 done, 22 of 67 articles) |
| 0009 | [Reading sources for system design, LLD, core CS, and two gap lessons](0009-reading-sources-and-gap-lessons.md) | implemented (by Claude Code) |
| 0010 | [No emoji, and LeetCode-style simple lists on the DSA pages](0010-no-emoji-leetcode-style-ui.md) | done |
| 0011 | [Coloured code everywhere, and a real code editor where you write code](0011-code-highlighting-and-editor.md) | implemented (by Claude Code; waiting for your look) |
| 0012 | [Diagrams (Mermaid) in lessons, designs and articles](0012-diagrams.md) | in-progress (step 4 open) |
| 0013 | [LLD problems as full Java codebases with diagrams](0013-lld-full-java-codebases.md) | in-progress (batch A of 5 written; parking lot and elevator enriched and compiled, vending/ATM still simple; batch B complete: LRU + rate limiter, URL shortener, logger + notifications, all compiled; vending/ATM richer code and batches C-E open) |
| 0014 | [System design: diagrams, deeper explanations, Java for the key parts](0014-system-design-depth.md) | in-progress (batches A-C merged) |
| 0015 | [Core subjects: more explanation, diagrams, Java demos](0015-core-subjects-depth.md) | implemented (by agent C) |
| 0016 | [Themes: Light, Dark, System and accent colours](0016-themes.md) | implemented (by Claude Code) |
| 0017 | [Streak freeze, weekly review, time on LeetCode pages](0017-streak-freeze-weekly-review-site-time.md) | implemented (by Claude Code) |
| 0018 | [Problem statements, hints, solutions and a Run button (roadmap + CSES)](0018-in-app-problems-and-judge.md) | in-progress (engine, lists and trees, 53 problems done) |
| 0019 | [Focus styles, reading aids, game switch, desktop back/forward](0019-focus-themes-game-switch-desktop-navigation.md) | implemented (by Claude Code) |
| 0020 | [Problem workspace, CSES in the main list, Learn hub, animations, reading tracker](0020-problem-workspace-learn-hub-motion.md) | implemented (by Claude Code) |
| 0021 | [Run button v2: hidden boilerplate, last run saved, custom input](0021-run-button-v2.md) | implemented (by agent A) |
| 0022 | [A much bigger problem library](0022-problem-library.md) | in-progress (batches 6-8, design problems, DSA filter merged) |
| 0023 | [Lessons as plain, editable files; ordering; subtopic navigation](0023-editable-content-and-navigation.md) | implemented (by agent C) |
| 0024 | [Content packs v2 and over-the-air updates](0024-content-packs-v2.md) | implemented (by agent A) |
| 0025 | [More LLD topics](0025-more-lld-topics.md) | implemented (by agent D) |
| 0026 | [Run plans 0021 to 0025 with four Claude agents at once](0026-parallel-agents.md) | implemented (all 4 merged) |
| 0027 | [Round two: the rest of the open work for the same four agents](0027-round-two-parallel-work.md) | in-progress (round 2 merged) |
