# Handoff

Written 2026-11-09 by Claude Code, after release **0.4.0**. For the next agent (Claude Code, Antigravity or anything else).
Read this first, then `AGENTS.md`, then the plan you pick up. It says what the project is, what is done, what to do next and in what
order, how to verify, and the mistakes already made.

## 1. The project in four lines

**Zen Dojo** (renamed from HabitManager on 2026-11-09; first Prepwise, then Zen Forge, then Zen Dojo) is an offline, open-source
engineering course and practice tool: DSA with a built-in code judge, system design, low-level design, core CS, reading list,
review queue. Next.js 16 + SQLite (libSQL), packaged as an Electron desktop app, pnpm workspace (`apps/web`, `apps/desktop`,
`apps/extension`, `packages/shared`). Single user, local only. The user prepares for SDE2/SWE3 interviews but wants it to feel
like a learning platform (Striver, GeeksforGeeks), not a habit tracker.

## 2. How we work (the user's rules)

- **Git:** commit only when the user asks in this conversation; never add `Co-Authored-By` or AI attribution. **Never push or tag
  unless asked.** The user asked for the 0.4.0 release explicitly on 2026-11-09; that does not cover later releases.
- **Do not build the desktop installer to "check" something** (`pnpm desktop:build`, 10 minutes). The user said it is a waste.
  Releases are built by the GitHub workflow when a tag is pushed.
- **Tests must stay fast.** `pnpm check` takes about 3.5 minutes. The user rejected running every problem's reference solution
  and every Java project on each run; do not add per-item test loops. Check new content by running just its ids.
- **Done means checked:** `pnpm check` (lint, typecheck, test, build) before saying work is done. Report failures as they are.
- **Writing for the user:** plain, specific, short; no hype; no emoji in the UI (a test enforces it, including check marks: use SVG).
- **Never touch `data/habit.db`** or the desktop app-data folder (`%APPDATA%\HabitManager`; the folder keeps that old name on purpose).
- **Depth is wanted** for learning content (see plans 0008, 0013 to 0015, 0025). LLD answers must be rich and diagram-heavy.
- **Content must be easy for other AI agents to edit** (the user wants to use Antigravity to fix content cheaply). Plans 0023 and 0024 are about this.
- **Ask for decisions only when they change the plan.** Naming and design taste are the user's.

## 3. State on 2026-11-09 (release 0.4.0)

Released: tag `v0.4.0` pushed; the `Desktop app` workflow builds Windows, macOS and Linux installers and publishes the release with
`docs/releases/v0.4.0.md`. (Check `gh release list`; if the workflow failed, read its log with `gh run view --log-failed`. Never reuse or
move a published tag: fix and ship 0.4.1.) The user's installed copy is the old build until they install a new one. The Windows
shortcut may keep the old name and icon.

What exists (all in 0.4.0):

- **Judge:** 81 problems run (77 roadmap, 4 CSES) in C++, Java, JavaScript. Specs `packages/shared/src/judge/problems-*.ts`, large inputs
  `judge/stress.ts`, harnesses `apps/web/lib/judge/harness*.ts`, runner `run.ts`, route `app/api/judge/run/route.ts`, UI
  `app/judge-workspace.tsx`, `judge-panel.tsx`, `pane-layout.tsx` (resizable and swappable panes).
- **Learn:** hub of course cards (`lib/courses.ts`, `app/study/page.tsx`), lessons, 27 design walkthroughs, LLD Java projects (parking lot,
  elevator, vending machine, LRU + rate limiter, URL shortener, logger + notifications), 22 of 67 DSA pattern articles, Mermaid diagrams.
- **Personalisation:** themes (7 styles, 5 accents, WCAG-tested), custom colours, custom font (installed name or uploaded file in IndexedDB),
  profile name and picture, reading fonts, focus reading, animations switch, game features off by default. Code: `lib/theme.ts`,
  `lib/custom.ts`, `app/custom-appearance.tsx`, `app/theme-picker.tsx`.
- **Shell:** `app/shell.tsx` (slim bar + slide-out menu on problem pages, Ctrl+B), `app/nav.tsx`, whole-card links (`.hit` / `.hit-link` in `globals.css`).
- **Content packs v1:** JSON packs add lessons and problems (`docs/content-packs.md`, `packages/shared/src/packs.ts`, `lib/packs.ts`,
  `/study/packs/...`). Pack format name is `prepwise-pack` (keep accepting it).
- **Other:** streak freeze, weekly review, LeetCode extension (icons and name updated), desktop back/forward gestures, backup/restore.

## 4. What is done and what is left (after parallel agents merge - round two)

Merged from parallel worktrees (`agent/a-judge`, `agent/b-problems`, `agent/c-lessons`, `agent/d-lld`):

- **Plan 0021 (implemented, agent A):** Run button v2 with hidden prelude boilerplate, compiler line number shift, `solution_runs` table saving the last run, custom input.
- **Plan 0022 (in progress, agent B & A):** Roadmap batches 6, 7, 8 and 9 merged (100 runnable roadmap problems + large inputs in `stress-6.ts` through `stress-9.ts`), design-a-class problems merged (11 problems with C++, Java, JS harnesses), empty-link problems fixed (`c-z-function`, `c-rabin-karp`), CSES Introductory expanded (7 runnable specs + stress tests), source filter (All, LeetCode, CSES) on `/dsa`.
- **Plan 0023 (implemented, agent C):** Markdown lessons in `content/**`, `build-content.mjs`, `content:build` and `content:check`, section ordering audit, subtopics in TOC and course outline.
- **Plan 0024 (implemented, agent A):** Content packs v2 with lesson patches (`type: "patch"`) and reset, Mermaid validation, content feed (`zendojo-feed`), OTA update UI in Settings > Content, `pack:check` and `pack:build` scripts, target study areas, download pack export route, safe fetch with redirect and size limits.
- **Plan 0025 (implemented, agent D):** 11 full Java projects (vending machine + ATM richer, movie booking, splitwise, library, food delivery, cab booking, games, file system, key-value store, hotel reservation, meeting rooms), 11 concept lessons.
- **Plan 0015 (implemented, agent C):** All core subjects depth (OS, Databases, Networking, and Java Concurrency) reaching 1,200+ words with runnable Java demos and diagrams.
- **Plan 0014 (in progress, agent C):** System design depth batches A, B, C and D (20 designs: payments, inventory, ticketing, order management, warehouse, URL shortener, rate limiter, KV store, notifications, typeahead, news feed, chat, video, file sync, collaborative editing, ride-sharing, maps, crawler, job scheduler, top-k) with runnable Java 17 demos and Mermaid diagrams.
- **Plan 0008 (in progress, agent D):** Batches 1 to 6 merged: 40 of 68 pattern articles complete (all Arrays/strings, Searching/sorting, Lists/stacks/heaps, Trees, Graphs part 1, and Graphs part 2).

What is left:

| # | Plan | What | Status |
|---|---|---|---|
| 1 | **0022** | CSES remaining sections and logic building from other platforms (AtCoder, Codeforces, Euler) | in progress |
| 2 | **0014** | System design batch E (7 designs: metrics, Kafka, recommendations, building-blocks, delivery-slots, pricing, catalog) | in progress (20 of 27) |
| 3 | **0008** | Remaining DSA pattern articles (batches 7 to 10: backtracking, DP, greedy/math; batches 1-6 completed) | in progress (40 of 68) |
| 4 | **0025** | Batch F new topics (optional future work) | not started |

Why this order: 0021 is small and fixes daily friction. 0023 makes content cheap to edit (so a cheaper agent can do 0022, 0025,
0014, 0015 and 0008 afterwards). 0024 lets content ship without releases. Then the content volume.

Not hand-verified in 0.4.0 (tests cover the logic, nobody has clicked them): dragging dividers and swapping panes, the other layouts,
the lesson table-of-contents marker while scrolling, favourites, the new styles and fonts, Focus reading strengths, desktop swipe on a
real touchpad, custom colours/font upload/profile picture in the UI, a Run on an imported pack problem to the end, and the packaged
desktop app showing the new name and icon.

Known gaps and ideas: the GitHub repo is still `Vraj0109/habit-manager`, the app id is still `dev.habitmanager.app` (changing it
breaks updates; leave it); the plan 0012 step 4 check (a diagram shows offline in the packaged app) is still open; plans 0016 to 0020
were written after the fact and have not been through `/review-plan`.

## 5. Machine setup

| Tool | Why | Notes |
|---|---|---|
| Node 26, pnpm | everything | use `pnpm.cmd` in PowerShell and Git Bash on Windows |
| g++ (WinLibs) | the judge's C++ and the article compile test | may not be on PATH in the agent shell; the WinLibs `mingw64\bin` is under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\BrechtSanders.WinLibs...` |
| JDK 17 | Java in the judge and the LLD compile test | installed (Temurin 17) |

Tests that need a compiler skip themselves when it is missing, so a green run without g++ or javac proves little. Say which you had.

## 6. Verification

```bash
pnpm.cmd check          # lint + typecheck + test + build, about 3.5 minutes
pnpm.cmd test           # tests only
pnpm.cmd exec vitest run apps/web/lib/judge -t "lc-1094"   # just one problem while authoring
```

To look at the UI: build, then `DATABASE_URL=file:<windows path> next start -p <port>` on a temp database and load pages in a hidden
Electron window (`app.disableHardwareAcceleration()`, `show: false`, `capturePage()`), then read the PNG. Hidden windows pause CSS
transitions: set `localStorage['habit-motion']='off'` first or the slide-out menu will look closed. The helper scripts were in a
session scratchpad and are not in the repo.

## 7. Pitfalls already hit (do not repeat them)

- **Shell quoting (very common).** The Bash tool breaks on quotes and backslashes in heredocs and `node -e '...'`: the whole command fails to
  parse and nothing runs. Write files with the Write tool and scripts to a file, then run them. After writing a regex through a script, read it back.
- **The inline theme script** (`THEME_INIT_SCRIPT` in `lib/theme.ts`) is plain ES5 inside a TypeScript template literal: `\"` becomes `"`,
  `\-` becomes `-` (in a character class `.-_` is a range!). Use `String.fromCharCode(34)` and `\\-`. Tests run it against a fake document.
- **Template literals in content:** never a backtick or `${` in lesson text or Java code; avoid backslashes.
- **Hand-computed expected outputs are wrong about 1 time in 6** (5 of 28 in one batch). Compute with the reference solution (plan 0024 adds a tool).
- **Next 16 `cacheComponents`:** no `Date.now()`/`Math.random()` in render; request data behind `await connection()` inside `<Suspense>`;
  `usePathname` needs a Suspense boundary. After adding a route run `pnpm --filter web exec next typegen` or `PageProps<"/new/[route]">` fails to typecheck.
- **No emoji guard** (`apps/web/app/no-emoji.test.ts`) fails on check marks and stars in `.tsx`: draw SVG.
- **Broad process kills are blocked.** Stop a test server by its port (`netstat -ano | grep :PORT`, `taskkill //PID`), never `taskkill /IM node.exe`.
- **Do not poll a background command or chain sleeps;** wait for its completion notice.
- **Lockfile:** commit `package.json` and `pnpm-lock.yaml` together (CI uses `--frozen-lockfile`).
- **Migrations are append-only.** New tables also go into `BACKUP_TABLES` and `schema.ts`.
- **Do not leave stale claims in docs.** README, plan statuses and notes must match reality (this file was stale for a day).

## 8. Release process

Bump `version` in `apps/desktop/package.json`, add `docs/releases/vX.Y.Z.md` (hand-written notes are used as the release body),
commit, `git tag vX.Y.Z` (must equal the version), push `main` and the tag. Only when the user asks.
