# 0066: Round thirteen: dynamic weeks and Backlog, portable tool manager, local AI helper (four agents)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (four agents fill in their own *Implementation notes* line below)
- **Spec:** implements `0056-dynamic-plan-weeks-and-backlog.md`, `0064-portable-tool-manager.md` and `0060-local-ai-helper.md`.
  Those three plans hold the full design and the "Done when" checks. **This file only splits the work, fixes the contracts and
  adds the things a fast, low-effort agent gets wrong.** Read it first, then your plan(s), then `AGENTS.md`.
- **Not in this round:** 0058 hosted web app and 0059 phone mode (need a deploy and your accounts), 0061 B3/B4 code signing
  (needs your route and secrets), 0045 admin study pages, syncing the reading/stuck/boss tables.

## Who does what (zero file overlap, except the three shared one-line files below)

| Agent | Plan work | Owns (only these files) | Fast check |
|---|---|---|---|
| **A** engine | 0056 steps 1, 2, 3, 6, 7 | `packages/shared/src/plan-weeks.ts` (+ test), `apps/web/lib/tasks.ts`, `apps/web/lib/tasks.test.ts`, `apps/web/app/page.tsx` (the Today header only), `apps/web/app/actions.ts` (task and plan-week actions only), `apps/web/app/profile/settings/page.tsx` (delete the shift forms only), `docs/plans/0036-*.md` (one line) | `pnpm.cmd exec vitest run packages/shared/src/plan-weeks.test.ts apps/web/lib/tasks.test.ts` |
| **B** consumers | 0056 steps 4 and 5 | `apps/web/lib/roadmap.ts`, `apps/web/app/roadmap/page.tsx`, `apps/web/lib/boss.ts`, `apps/web/lib/weekly.ts`, `apps/web/app/profile/page.tsx`, new `apps/web/app/backlog/**`, `apps/web/app/nav.tsx`, and the tests next to the first four (`roadmap`, `boss`, `weekly` if they exist; else add `roadmap.test.ts`) | `pnpm.cmd exec vitest run apps/web/lib/roadmap.test.ts apps/web/lib/weekly.test.ts` (only the files that exist) |
| **C** tools | 0064 steps 1 to 7 (with the decisions below) | `packages/shared/src/tool-catalog.ts` (+ test), `apps/web/lib/tools/**`, `apps/web/lib/judge/resolve.ts` (+ test), `apps/web/lib/judge/tools.ts` (+ test), `apps/web/app/api/tools/**`, `apps/web/app/profile/settings/tools/**`, `apps/desktop/main.js` (one env var), `.github/workflows/tools-smoke.yml`, `docs/tools.md`, `docs/troubleshooting.md` (one link) | `pnpm.cmd exec vitest run packages/shared/src/tool-catalog.test.ts apps/web/lib/tools apps/web/lib/judge/resolve.test.ts apps/web/lib/judge/tools.test.ts` |
| **D** local AI | 0060 steps 1 to 7 (with the decisions below) | `packages/shared/src/ai-models.ts`, `ai-prompts.ts` (+ tests), `apps/web/lib/ai/**`, `apps/web/lib/ui-prefs.ts` (+ test), the sync denylist file (find it with Grep for `content_feed_url` under `apps/web/lib/sync-*.ts`) (+ its test), `apps/web/app/api/ai/**`, `apps/web/app/profile/settings/ai-settings.tsx`, `apps/web/app/dsa/ask-ai.tsx`, `apps/web/app/dsa/[id]/page.tsx` (mount the panel only), `docs/local-ai.md` | `pnpm.cmd exec vitest run packages/shared/src/ai-models.test.ts packages/shared/src/ai-prompts.test.ts apps/web/lib/ai apps/web/lib/ui-prefs.test.ts apps/web/lib/sync-triggers.test.ts` |

**Shared one-line files** (several agents add exactly one thing each; always `Read` the file right before, then use `Edit` with a
small unique `old_string`; never `Write` the whole file, never reformat it):

- `packages/shared/src/index.ts`: A adds `export * from "./plan-weeks";`, C `export * from "./tool-catalog";`, D `export * from "./ai-models";` and `export * from "./ai-prompts";`.
- `apps/web/app/profile/settings/page.tsx`: A deletes the shift forms; D adds one `<AiSettings />` section (import plus element); C adds nothing (its page is `settings/tools/page.tsx`).
- `apps/web/app/actions.ts`: only A edits it. B needs `skipPlanWeekAction`: **A writes it** (contract below).

**Nobody touches:** `AGENTS.md`, other plan files (only your own *Implementation notes* line at the bottom of this file), any
`problems-*.ts` / `stress-*.ts`, `data/habit.db`, `%APPDATA%\HabitManager`, `packages/sync-worker/**`, `apps/web/lib/db.ts` migrations
(none of these plans needs one), `packages/shared/src/judge/generated/**`.

## Order and dependencies

1. **A commits first** (within about 20 minutes): `plan-weeks.ts` + test, then `getPlanPosition()` / `getBacklogView()` /
   `skipPlanWeek()` in `lib/tasks.ts` (0056 steps 1 and 2) and the actions. Check `git log --oneline -8` for "plan weeks".
2. **B** starts with the Backlog page UI written against the contract below (it may not compile until A lands; that is
   expected). B does the consumers (`roadmap`, `boss`, `weekly`, `profile`) **after** A's first commit exists.
3. **C** and **D** are independent of A and B and of each other. C commits `tool-catalog.ts` first, D commits `ai-models.ts` first.
4. Everyone works in the same checkout at the same time. If `pnpm -r typecheck` shows errors in files you do not own, those
   belong to another agent who is mid-edit: wait two minutes and re-run; never "fix" their files.
5. When your steps are done, run your fast check, `pnpm.cmd -r typecheck` and eslint on your changed files, commit, and send the
   report (format at the bottom). The lead runs the one `pnpm check`.

## Fixed contracts (code against these exactly)

```ts
// packages/shared/src/plan-weeks.ts (Agent A)
export const SLOTS_PER_WEEK = 7;
export interface PlanWeekRow { id: number; date: string; scope: string; templateKey: string | null; status: string }
export function weekKey(week: number, key: string): string;               // weekKey(3, "dsa-warmup") === "w3:dsa-warmup"
export function parseWeekKey(key: string | null): { week: number; key: string } | null; // null for legacy / custom
export function slotDueDate(start: string, slot: number): string;          // slot 1..7 => start + slot - 1
export function todaySlot(start: string, today: string): number;           // clamp(days between + 1, 1, 7)
export function weeksLeft(cursor: number, finished: boolean): number;      // 16 - cursor + 1, 0 when finished
export function isWeekComplete<T extends PlanWeekRow>(rows: T[], week: number, start: string): boolean;
export function splitBacklog<T extends PlanWeekRow>(rows: T[], week: number, start: string, today: string):
  { overdue: T[]; today: T[]; upcoming: T[]; goals: { open: T[]; overdue: T[] } };

// apps/web/lib/tasks.ts (Agent A)
export interface PlanHistoryEntry { week: number; start: string; end: string }
export interface PlanPosition { cursor: number; start: string; finished: boolean; weeksLeft: number; history: PlanHistoryEntry[] }
export async function getPlanPosition(): Promise<PlanPosition>;            // creates settings + the week's 24 rows if missing
export interface BacklogView {
  position: PlanPosition; today: string;
  overdue: { date: string; tasks: TaskRow[] }[];                           // oldest date first
  goals: TaskRow[];                                                        // open weekly goals of this plan week
  goalsOverdue: boolean;
  upcoming: { date: string; tasks: TaskRow[] }[];                          // later slots, work-ahead
  doneCount: number; totalCount: number;                                   // of this plan week's generated rows
}
export async function getBacklogView(): Promise<BacklogView>;
export async function skipPlanWeek(): Promise<void>;

// apps/web/app/actions.ts (Agent A). Reads form field `confirm` ("on" when ticked); does nothing if not ticked.
export async function skipPlanWeekAction(formData: FormData): Promise<void>;   // calls skipPlanWeek(), then refresh()
// the existing toggle task action keeps its name and signature; B reuses it for the Backlog checkboxes.
```
`TaskRow` is whatever type `lib/tasks.ts` already uses for a task row; export it if it is not exported yet.

## Decisions made for you (so nobody stalls)

- **0064 (C):** Linux C++ is **not** downloaded (no Zig). The Tools page shows the distro command from `tool-hints.ts` for Linux C++.
  macOS C++ = a button that runs `xcode-select --install` through a fixed `execFile`, then re-checks. Windows C++ = WinLibs zip;
  Java = Temurin 17 JDK; Python = python-build-standalone `install_only` (3.12.x). Pin exact versions. Compute each `sha256`
  yourself from the official file, download only into the scratchpad / a temp folder, from the hosts named in the plan, and
  never run what you download except `--version`. Put the date checked in the file comment. If an official URL cannot be fetched,
  leave that platform out of the catalogue and say so in your report (do not invent a hash). Step 6 (workflow): write
  `.github/workflows/tools-smoke.yml` only; the lead triggers it. Also add a 60-second cache around `detectTools()` in `tools.ts`
  (the Today page calls it on every load) with a `resetToolsCache()` for tests.
- **0060 (D):** model tiers `llama3.2:3b` (4 GB), `qwen2.5-coder:7b` (8 GB), `qwen2.5-coder:14b` (16 GB), `qwen2.5-coder:32b` (32 GB).
  Check each tag exists on `https://ollama.com/library/<name>` (WebFetch) and put the date in the file comment; if a tag is gone,
  use the nearest tag that exists and say so in the report. Settings keys: `ai_enabled`, `ai_model`, `ai_ollama_url`; all three
  go on the sync denylist **and** are not "protected" in `erase-data.ts` (leave `erase-data.ts` alone). Reader mode (plan 0059) does
  not exist yet: check `process.env.HABIT_HOSTED !== "1"` only.
- **0056 (A, B):** follow the plan's Design section literally. "Skip the rest of this week" needs the confirmation checkbox.
  Wording: plain, no red, no emoji (use inline SVG if an icon is needed).

## Rules for everyone (read twice)

- Windows: run `pnpm.cmd` (not `pnpm`) and `npm.cmd`. In Git Bash use forward slashes. Do not use `&&` in PowerShell.
- **Never** run `pnpm test`, `pnpm check`, `pnpm build` or `pnpm desktop:build`. They take minutes and the lead runs one `pnpm check` at the end.
- Fast loop: `pnpm.cmd exec vitest run <files>` (1 to 5 s), then `pnpm.cmd -r typecheck`, then
  `cd apps/web; pnpm.cmd exec eslint <your changed files under apps/web>`. Fix every error in **your** files before committing.
- DB tests: copy the header of `apps/web/lib/tasks.test.ts` exactly (`DATABASE_URL=":memory:"`, delete `globalThis.habitDb`,
  `vi.useFakeTimers({ toFake: ["Date"] })`). Never touch `data/habit.db` or the desktop app-data folder.
- Next.js 16 with `cacheComponents`: a page that reads the database or time must be an async server component that calls
  `await connection()` inside a `<Suspense>`; copy how `apps/web/app/page.tsx` or `apps/web/app/roadmap/page.tsx` does it. Server
  actions call `refresh()` after changing data (import it the way `actions.ts` already does). No `Date.now()` or `Math.random()`
  while rendering; compute dates in `lib/` code. Forms must post to server actions and work without JavaScript.
- Dates are local `YYYY-MM-DD` strings; use the helpers in `packages/shared/src/dates.ts` (`addDays`, `daysBetween`, ...). Never
  do UTC day math, never `new Date("2026-11-09")` for a local date.
- Styling: Tailwind v4 theme tokens (`bg-surface`, `text-muted`, `border-line`, `bg-accent`), shared bits from `app/ui.tsx`. Wide
  layouts, no emoji (inline SVG), no red alarm styling for the Backlog. Copy an existing page's markup instead of inventing.
- Read a file once, make all its edits, then check. Do not re-read a file you just edited. When unsure how something works, `Grep`
  for an existing example and copy its pattern; do not guess an API (especially Next 16: look in `apps/web/node_modules/next/dist/docs/`).
- Stay in scope. If you find a bug in a file you do not own, write it in your report; do not fix it.
- Never read or print secrets. No `wrangler`, no network calls from app code except what your plan allows (C: the catalogue hosts,
  D: loopback Ollama only).
- Git: explicit `git add <paths>` (never `git add .` / `-A`), plain-English message, **no push, no tag, no attribution or
  Co-Authored-By line**. Several agents commit in one checkout; if you get an `index.lock` error, wait 5 seconds and retry. Commit
  after each plan step, not only at the end.
- Update your plan's checkboxes (`- [x]`) and fill that plan's *Implementation notes* with what you did and any deviation. Add
  one line for your agent under *Implementation notes* in **this** file.

## Report format (your final message)

```
Agent <A|B|C|D>: <done | partly done>
Commits: <hashes with one-line messages>
Checks: <the fast-check command and its result, typecheck result, eslint result>
Deviations from the plan: <none | list>
Problems in files I do not own: <none | list>
Not done / needs a human: <none | list>
```

## Final (lead)

- [ ] Pull everyone's work; `pnpm.cmd -r typecheck`; **one** `pnpm.cmd check`; fix integration breaks (usually imports, the shared index, `settings/page.tsx`).
- [ ] Browser check on a **copy** of the database (`VACUUM INTO` under `C:\Temp`, `DATABASE_URL` pointing at it): Today shows `Week N of 16`; set `plan_week_start` ten days back and see the Backlog page; tick through a week; Settings shows Tools and Local AI.
- [ ] Trigger `tools-smoke.yml` on GitHub and record the run link in 0064's notes. Try the Tools download in the desktop dev build once.
- [ ] Mark 0056, 0060, 0064, 0066 `implemented`; update `docs/HANDOFF.md` "State" and `docs/plans/README.md` "Next up"; correct the old group counts in 0063/0065 (163/159/164); push or release only when the user asks.

## Acceptance criteria

- [ ] Every acceptance list in plans 0056, 0060 and 0064 (except 0064's "smoke workflow is green", which the lead confirms).
- [ ] `pnpm.cmd check` passes.
- [ ] No file outside the ownership table was changed (`git diff --stat` of the round).

## Prompts to paste (one per agent; each agent starts with an empty memory)

Agent A:

```
You are Agent A in round thirteen of Zen Dojo (C:\MyStuff\Projects\HabbitManager). Read, in this order: docs/plans/0066-round-thirteen-weeks-tools-and-local-ai.md
(your row is "A engine"), docs/plans/0056-dynamic-plan-weeks-and-backlog.md, AGENTS.md. Do plan 0056 steps 1, 2, 3, 6, 7 only. Commit the pure rules and the
getPlanPosition/getBacklogView/skipPlanWeek functions first (Agent B is waiting for the contract in 0066). Use only the commands in 0066's rules: targeted vitest,
pnpm.cmd -r typecheck, eslint. Never run pnpm test/check/build. Local commits with explicit paths, no push, no attribution. End with the report format from 0066.
```

Agent B:

```
You are Agent B in round thirteen of Zen Dojo (C:\MyStuff\Projects\HabbitManager). Read, in this order: docs/plans/0066-round-thirteen-weeks-tools-and-local-ai.md
(your row is "B consumers"), docs/plans/0056-dynamic-plan-weeks-and-backlog.md, AGENTS.md. Do plan 0056 steps 4 and 5 only. Agent A writes the engine at the same time:
code against the contracts in 0066; start with the Backlog page, and do the roadmap/boss/weekly/profile consumers once `git log` shows A's "plan weeks" commit.
Do not edit lib/tasks.ts or actions.ts. Use only the commands in 0066's rules. Local commits with explicit paths, no push, no attribution. End with the 0066 report format.
```

Agent C:

```
You are Agent C in round thirteen of Zen Dojo (C:\MyStuff\Projects\HabbitManager). Read, in this order: docs/plans/0066-round-thirteen-weeks-tools-and-local-ai.md
(your row is "C tools" and "Decisions made for you"), docs/plans/0064-portable-tool-manager.md, AGENTS.md, then apps/web/lib/judge/resolve.ts and tools.ts.
Do plan 0064 steps 1 to 7 plus the detectTools cache. Download official files only into your scratchpad/temp folder to compute hashes; never run them. Use only the
commands in 0066's rules (never pnpm desktop:build). Local commits with explicit paths, no push, no attribution. End with the 0066 report format.
```

Agent D:

```
You are Agent D in round thirteen of Zen Dojo (C:\MyStuff\Projects\HabbitManager). Read, in this order: docs/plans/0066-round-thirteen-weeks-tools-and-local-ai.md
(your row is "D local AI" and "Decisions made for you"), docs/plans/0060-local-ai-helper.md, AGENTS.md. Do plan 0060 steps 1 to 7. The AI feature only ever talks to
a loopback Ollama and is off by default; settings must not sync. Use only the commands in 0066's rules. Local commits with explicit paths, no push, no attribution.
End with the 0066 report format.
```

## Open questions

## Implementation notes

(Agents: add one line each, e.g. `A: done, commits abc123..def456, no deviations.`)
D: done, local AI per 0060 steps 1-7, no deviations beyond those in 0060 notes.
A: engine done (0056 steps 1, 2, 3, 6, 7 except consumer tests), see commit "Add plan weeks".

## Review
