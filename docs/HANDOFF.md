# Handoff

Written 2026-11-09, updated after parallel agent work and post-merge integration on branch `main`.
For the next agent (Claude Code, Antigravity or anything else).
Read this first, then `AGENTS.md`, then the plan you pick up. It describes what the project is, what is done, what is open, the Windows blocking issue, the tight memory constraint, how to verify, and pitfalls to avoid.

## 1. The project in four lines

**Zen Dojo** (renamed from HabitManager on 2026-11-09) is an offline, open-source engineering course and practice platform:
DSA with an in-process local code judge (C++, Java, JavaScript), system design depth, low-level design Java projects, core CS subjects,
Mermaid diagrams, reading tracker, and spaced-repetition review queue. Next.js 16 + SQLite (libSQL), packaged as an Electron desktop app,
pnpm workspace (`apps/web`, `apps/desktop`, `apps/extension`, `packages/shared`). Single user, local-first.

## 2. How we work (the user's rules)

- **Git:** Commit with plain-English messages when instructed in the prompt. Never push, never tag, never add `Co-Authored-By` or any AI attribution.
- **Do not run `pnpm desktop:build`** (~10 minutes, high memory usage). Releases are built by GitHub Actions when a tag is pushed.
- **Memory on this machine is tight:** Run only **ONE** `pnpm.cmd check` at a time. Close dev servers when done. Use targeted tests (`pnpm.cmd exec vitest run <file>`) while working.
- **Tests must stay fast:** Do not add per-problem test loops across all problems. Run targeted problem checks (`pnpm.cmd exec vitest run apps/web/lib/judge -t "<id>"`).
- **Done means checked:** `pnpm check` (lint, typecheck, test, build) must pass before a plan is marked `implemented`.
- **Writing style:** Plain, specific language; no hype; no emoji in the UI (enforced by `apps/web/app/no-emoji.test.ts`: use SVG icons).
- **Never touch `data/habit.db`** or the desktop app-data folder (`%APPDATA%\HabitManager`). Test against `:memory:` or a temporary copy.
- **Plan status transitions:** An implementer sets status to `implemented` (never `done`). The reviewer evaluates against acceptance criteria and marks `done`.

## 3. Current State of the Codebase

All four parallel agent worktrees (`zd-a`, `zd-b`, `zd-c`, `zd-d`) are merged into `main`. `git branch --no-merged main` is completely empty.

### What is fully implemented:

1. **CSES Logic-Building List (Plan 0029 - Implemented):**
   - Merged `agent/b-problems` into `main`.
   - CSES introductory specs registered in judge with C++ reference answers and large inputs in `stress-cses-intro.ts`.
   - 5 CSES practice groupings in `DSA_GROUPS` (`cses-intro`, `cses-sorting`, `cses-dp`, `cses-graph`, `cses-misc`) with pattern tags.
   - Pattern guides registered in `dsa-d.ts`.
   - All tests passing.

2. **All 67 Roadmap Pattern Articles & Fallback Retired (Plan 0008 Step 11 - Implemented):**
   - All 67 roadmap DSA patterns have complete, deep 8-section articles (`dsa-articles-a.ts` through `dsa-articles-k.ts`).
   - Missing `bipartite` article added with recursive DFS and iterative BFS implementations.
   - C++ snippets for all 67 articles compile cleanly (`pattern-article-code.test.ts`).
   - Old short-guide fallback (`<ArticleLayout toc={toc}>...`) removed from `apps/web/app/dsa/pattern/[id]/page.tsx`.
   - `pattern-articles.test.ts` now strictly asserts that all 67 roadmap patterns have an article (zero tolerance).
   - `/revise?tab=dsa` retains recap lines.

3. **Windows Smart App Control Handling & WebAssembly Plan (Plan 0034 - Part A Implemented, Part B Planned):**
   - Windows 11 Smart App Control blocks unsigned `main.exe` compiled by `g++` (`spawn UNKNOWN` / `EPERM`).
   - Server returns `{ status: "unavailable", message: ... }` via `isBlockedSpawnError`.
   - Editor (`judge-workspace.tsx`) displays an alert banner explaining why C++ was blocked, notes that Java and JavaScript work through signed runtimes, automatically switches the language picker to Java (or JS if Java is missing), and persists the preference per problem (`habit-judge-lang:<id>`).
   - Pure helpers in `apps/web/lib/judge/blocked.ts` tested in `blocked.test.ts`.
   - `docs/troubleshooting.md` created with a "Windows blocks C++" guide and linked from `AGENTS.md`.
   - Part B plan written: running C++ in-process via WebAssembly in Node, size/speed/timing trade-offs, step list, acceptance criteria, and Azure Trusted Signing for desktop distribution.

4. **Problem Workspace Layout Polish (Plan 0028 - Implemented):**
   - Verified live in headless Edge browser at 1440x900 and 390px mobile against a copy of the database.
   - Confirmed no "Tab indents" or "Added for you" clutter lines under the editor.
   - The `?` button displays the help text on hover/click.
   - Top bar measures 28 px and hides on `Ctrl+Shift+B`, exposing the 12 px restore strip.
   - The **Save** button in code actions and keyboard shortcut `Ctrl+S` work, displaying "Saved (verified)".
   - The Notes tab displays saved solutions with **Load into editor**.
   - Zero horizontal overflow on 390px mobile.

5. **Stored Problems Counting in Progress & Totals (Plan 0030 - Implemented):**
   - Stored problems added via `pnpm content:add` are tagged with patterns.
   - `getDsaView()` counts solved stored problems toward pattern progress (`solved`, `covered`).
   - `getDsaView().totals` includes stored problems in `problems`, `solved`, and `allSolved`.
   - `getRoadmapView()` counts solved stored problems in weekly roadmap progress.
   - Unit tests in `apps/web/lib/dsa.test.ts` pass.

6. **Prior Completed Plans:**
   - Plan 0015: Core subjects depth (OS, Databases, Networking, Concurrency).
   - Plan 0021: Run button v2 with line shifts and last run saving.
   - Plan 0023: Markdown editable lessons.
   - Plan 0024: Content packs v2 and OTA feed.
   - Plan 0025: LLD Java projects with diagrams and tests.

---

## 4. What is Open

| # | Plan | Task | Notes |
|---|---|---|---|
| 1 | **0022** | Problem library expansion | Remaining CSES sections (Sorting & Searching, DP, Graph, Range/Tree/Math/String) and problems from other platforms (AtCoder, Codeforces, Project Euler, Kattis). Link source, 6+ tests, 3+ hints, large inputs, expected outputs from C++ reference. |
| 2 | **0014** | System design batch E depth | 7 designs (metrics, Kafka, recommendations, building-blocks, delivery-slots, pricing, catalog); lengthen the shortest to 1,500+ words with numbers and failure modes. |
| 3 | **0025** | LLD batch F | Additional LLD topics (pub-sub, order book matching engine, text editor with undo, job scheduler, etc.). |
| 4 | **0034** | WebAssembly C++ Runner (Part B) | Implement in-process WebAssembly compilation and execution of C++ code in Node to eliminate native executable execution on Windows. |

---

## 5. The Windows C++ Blocking Issue

On Windows 11 with **Smart App Control** active or strict Defender reputation settings:
- `g++` compiles C++ code to a temporary executable (`main.exe`) in `%TEMP%`.
- Spawning that unsigned binary fails with `spawn UNKNOWN` or `spawn EPERM`.
- **Why Java and JavaScript work:** Java runs under `java.exe` (signed JDK runtime) and JavaScript runs under `node.exe` (signed Node.js runtime). Both have established system reputation.
- **Handling:** The judge returns status `unavailable`. The editor displays an explanatory banner and switches to Java/JavaScript, remembering the choice for that problem.
- **Long-term fix:** Plan 0034 Part B outlines compiling C++ to WebAssembly and running it in Node via WASI.
- See [`docs/troubleshooting.md`](./troubleshooting.md) for full troubleshooting details.

---

## 6. Machine & Environment Setup

| Tool | Version / Path | Purpose |
|---|---|---|
| Node.js | v26.13.0 | Application runtime & build |
| pnpm | Installed | Workspace package manager (always use `pnpm.cmd` on Windows) |
| g++ | WinLibs (GCC 16.2.0) | C++ judge & article compilation tests |
| JDK | Eclipse Temurin 17 | Java judge & LLD compilation tests |

### Commands:
```powershell
pnpm.cmd check          # Full check: lint + typecheck + vitest + next build (~3.5 min)
pnpm.cmd test           # Run all vitest suites
pnpm.cmd exec vitest run <file> -t "<filter>"  # Targeted fast test
```

---

## 7. Worktree Removal

All four agent branches have been merged into `main` and verified (`git branch --no-merged main` is empty).
To cleanly remove the temporary worktrees and local agent branches:

```powershell
git worktree remove ..\zd-a
git worktree remove ..\zd-b
git worktree remove ..\zd-c
git worktree remove ..\zd-d
git branch -d agent/a-judge agent/b-problems agent/c-lessons agent/d-lld
```
