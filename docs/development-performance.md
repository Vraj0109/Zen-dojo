# Development & Test Performance Guide

Zen Dojo runs real compilers (`g++` for C++ and `javac` for Java) directly inside Vitest to guarantee that every educational code snippet, reference solution, and LLD project compiles and runs cleanly. Because of this, running the full test suite compiles dozens of native binaries and can take 3.5 to 5.5 minutes if run improperly.

Follow these rules to keep development cycle times under 5 seconds.

---

## 1. Testing Tiers & Rules for Agents

### Tier 1: Targeted File Tests (2 to 5 seconds) — USE DURING ACTIVE DEVELOPMENT
Never run `pnpm test` or `pnpm check` while iterating on code. Run only the single test file corresponding to the files you edited:
```bash
# Testing diagrams:
pnpm exec vitest run apps/web/lib/diagrams-parse.test.ts

# Testing learn guides, LLD systems, and design depth registration:
pnpm exec vitest run packages/shared/src/learn/learn.test.ts

# Testing system design depth:
pnpm exec vitest run packages/shared/src/learn/design-depth.test.ts

# Testing problem library & judge harnesses:
pnpm exec vitest run apps/web/lib/judge/judge.test.ts

# Testing UI navigation / breadcrumbs / TOC:
pnpm exec vitest run apps/web/app/toc-items.test.ts
```

### Tier 2: Workspace Typecheck (10 to 15 seconds)
Run this after writing TypeScript definitions to check all 4 packages without running heavy compilers:
```bash
pnpm -r typecheck
```

### Tier 3: Fast Test Suite (`pnpm test:fast`) (15 to 25 seconds) — PRE-COMMIT VERIFICATION
Runs all application unit, integration, and UI tests across all workspace packages while skipping the slow compiler-heavy test suites (Judge harness, Java multi-file runners, LLD project builds, lesson Java demos, design Java code, and C++ pattern article compilations):
```bash
pnpm test:fast
```
Skipped suites in fast mode:
- `apps/web/lib/judge/judge.test.ts`
- `apps/web/lib/judge/project-run.test.ts`
- `apps/web/lib/judge/pack-tools.test.ts`
- `apps/web/lib/judge/judge-tle.test.ts`
- `apps/web/lib/lld-projects.test.ts`
- `apps/web/lib/core-code.test.ts`
- `apps/web/lib/design-code.test.ts`
- `apps/web/lib/pattern-article-code.test.ts`

### Tier 4: Full Gatekeeper Check (`pnpm check`) — RUN ONLY ONCE BEFORE PUSH
- **NEVER** run `pnpm test` followed by `pnpm check`. `pnpm check` already runs `pnpm test` as its third step. Running both back-to-back simply compiles 100+ native executables twice.
- Run `pnpm check` only **once** as the final sign-off when all agent work is completed and ready to commit/push.

---

## 2. Windows Defender File-Scanning Exclusion

On Windows 11, Windows Defender scans every ephemeral `.exe` and `.class` file emitted by `g++` and `javac` in `%TEMP%` and the workspace. Adding an exclusion cuts compile times by 50% to 70%.

Run this once in PowerShell as Administrator:
```powershell
Add-MpPreference -ExclusionPath "C:\MyStuff\Projects\HabbitManager"
```

---

## 3. Parallel Agent Coordination

When working with parallel subagents (Claude Code + Antigravity):
- Divide tasks into independent files so agents never conflict or lock the same files.
- Subagents must ONLY use **Tier 1 targeted vitest runs**.
- The coordinating agent runs the single final `pnpm check` after merging.

---

## 4. Content caching

Content (problems, courses, lessons, docs) is read from the content database through `apps/web/lib/content-repo/`
(plan 0114). Each read is a `'use cache: remote'` function with `cacheLife('max')` and cache tags from
`packages/shared/src/content-model/tags.ts`. Remote falls back to Next's in-memory LRU when no cache handler is
configured (desktop and `next start`); on Vercel the platform provides the shared handler.

| Tag | Covers |
|---|---|
| `content` | everything (full import or snapshot apply) |
| `problems` | the problem list (summaries) |
| `problem:<id>` | one problem, its solution page and its judge spec |
| `courses` | the course list with lesson summaries |
| `course:<id>` | one course and its lesson list |
| `lesson:<id>` | one lesson |
| `docs:<kind>` | the list of one doc kind |
| `doc:<kind>:<id>` | one doc |
| `content-version` | the content version number |

**Rule: after a content write, call the invalidation helper; nothing else.** Use `expireContentTagsInAction(changes)`
in a server action (read-your-own-writes) or `expireContentTagsInRoute(changes)` in a route handler or background job.
`changes` is the list the write helpers return, for example `[{ entity: "lesson", id, courseId }]`.

Public JSON routes under `/api/content/*` are versioned: `?v=<current version>` is immutable for a year with an ETag,
and an old or missing `v` redirects (302, no-store) to the current one. Stress generators stay in code; the judge spec
is built with `getProblemSpec(id)`, which is not cached as a whole because the generators are functions.
