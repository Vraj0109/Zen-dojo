# 0106: Estimation drills (capacity math, scored)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** SPEC.md section, if any
- **Mockup:** docs/mockups/interview-prep/0106-estimation-drills.html
- **Depends on:** none. Set 0095-0111: 0097 (system design mock) can reuse `scoreEstimate` for its estimation phase;
  0110 (readiness) can read `estimationSummary()`. Neither is required.

## Goal

System design rounds start with numbers: "how many requests per second", "how much storage per year", "how many servers".
The lesson `sd-estimation` explains the method, but nobody practises it. Add **60 estimation drills** and **30 "know your
numbers" quick-fire questions**. You type an estimate, it is scored by how close you are in orders of magnitude (the only
thing an interviewer cares about), and you see a worked solution with the shortcuts. The page also shows whether you guess
too high or too low.

## Context

- Today: lesson `sd-estimation` ("Back-of-envelope estimation") in `packages/shared/src/study.ts` and
  `packages/shared/content/sd/sd-estimation.md`; `KEY_NUMBERS` (latency, size and throughput tables) in
  `packages/shared/src/revise.ts`; the system design time plan has an `est` phase (4 minutes, same file near line 71).
  Quick revise shows the key numbers at `/revise`.
- `seededRandom(seed)` exists in `packages/shared/src/revise.ts` (used by the quiz deck); reuse it for the daily set. No
  `Math.random()`/`Date.now()` during render (lint rule); dates are local `YYYY-MM-DD` strings (`dates.ts`).
- Study pages: `apps/web/app/study/page.tsx` (add a card next to Reading and Diagrams), `apps/web/app/study/reading/page.tsx`
  as layout example. New routes: `/study/estimation`, `/study/estimation/[id]`, `/study/estimation/quick`.
- XP is computed from rows (AGENTS.md): add the new table to the sum in `apps/web/lib/progress.ts`.
- Convention list for a new table: migration appended to `MIGRATIONS` in `apps/web/lib/db.ts`, `schema.ts`, `"estimation_attempts"` in
  `BACKUP_TABLES` (`lib/backup.ts`), sync entry in the next free `SYNC_TABLE_MAP_V<n>` array of `lib/sync-triggers.ts` (key `sync_id`
  like `problem_struggles`, plus defaults in `lib/sync-engine.ts` `DEFAULTS`), server action in `actions.ts` that calls `refresh()`.
- Content rules: scenarios use made-up products ("a photo-sharing app", "a ride-hailing service"), never claims about a real company's
  traffic. Hardware numbers (latency, throughput, sizes) are general public figures that drift with hardware; every drill and every
  quick-fire item has a `checkedOn` date.

## Data model

`packages/shared/src/estimation.ts` (pure, exported from `index.ts`):

```ts
export type EstimateKind = "qps" | "storage" | "bandwidth" | "memory" | "servers" | "latency";
export interface EstGiven { name: string; label: string; value: number }          // numbers stated in the scenario
export interface EstAssumption { name: string; label: string; value: number; why: string } // numbers you must choose
export interface EstStep { name: string; label: string; expr: string }             // expr uses names from givens, assumptions, earlier steps
export interface EstimationDrill {
  id: string;                 // est-<name>
  kind: EstimateKind; title: string; level: "easy" | "medium" | "hard";
  scenario: string[];         // paragraphs; the givens appear in the text
  givens: EstGiven[]; assumptions: EstAssumption[]; steps: EstStep[];
  answer: { step: string; unit: string; display: "plain" | "bytes" | "duration" };
  tolerance: "loose" | "strict";   // strict when there is nothing to assume
  shortcuts: string[];        // the rounding tricks used (1 day ~ 10^5 s, 1M per day ~ 12 per second ...)
  checkedOn: string;
}
export interface NumberSense { id: string; question: string; truth: number; unit: string; note: string; checkedOn: string } // ns-<name>
```

- `evalExpr(expr, scope)`: a tiny parser for numbers, names, `+ - * / ^`, parentheses, unary minus. No `eval`, no `Function`. Throws on
  unknown names.
- `solveDrill(d)`: evaluates assumptions, then steps in order; returns every step's value and the final `truth`.
- `scoreEstimate(user, truth, tolerance)`: `e = |log10(user / truth)|`. Loose: points 4 if e <= log10(1.5), 3 if <= log10(3),
  2 if <= 1 (within 10x), 1 if <= 2 (within 100x), else 0. Strict: 4 within 1.2x, 3 within 2x, 2 within 5x, 1 within 10x, else 0.
  Returns `{ points, e, direction: "high" | "low" | "right", label }` with labels "Spot on", "Interview-good", "Right ballpark",
  "Off by a lot", "Way off". Zero or negative input is refused before scoring.
- `parseEstimate(text, display)`: accepts `3500000`, `3.5e6`, `3,500,000`, and for `plain` answers also `3.5m`, `40k`, `2 billion`,
  `1.2b`, `5 trillion`. For `bytes` and `duration` answers only plain numbers and `e` notation (the unit is shown next to the box;
  `m` would be ambiguous). Returns a number or a plain-words error.
- `formatEstimate(value, display)`: "3.5 million", "2.6 TB", "850 ms".
- `estimationSummary(attempts)`: per kind average points of the last 20 attempts, `bias` per kind (mean of signed
  `log10(user/truth)`, shown as "you tend to guess about 4x too low"), best and weakest kind, attempts this week.
- Daily set: `dailySet(date, drills, senses)` = 3 drills of different kinds + 2 quick-fire items, seeded by the date, so it is the
  same all day and no `Math.random`.
- Table:

```sql
CREATE TABLE estimation_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  drill_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  attempted_on TEXT NOT NULL,
  answer REAL NOT NULL,
  truth REAL NOT NULL,
  points INTEGER NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX estimation_attempts_drill ON estimation_attempts (drill_id);
```

  `mode` is `estimate` or `quickfire`. XP per attempt: 4 points = 5 XP, 3 = 3, 2 = 1, else 0; no XP for a drill you already
  scored 3 or more on today (the action checks and writes 0).

## Out of scope

- Real company traffic numbers, price/cost estimates (they change), and region/currency conversion.
- Cost drills ("how much per month on a cloud"), free-text answers graded by AI, hand-drawn working.
- Adding estimation to the stuck list or review queue (a later plan may). Changing `sd-estimation` text or `KEY_NUMBERS`.
- The system design mock itself (0097).

## Steps

Step 0 first (one agent). Then agents A-D in parallel with disjoint files. Only the lead runs `pnpm check` and full `pnpm test`.

- [ ] **0. Foundation (one agent, about 0.5 day).**
  - `packages/shared/src/estimation.ts` (all functions above, `ESTIMATE_KINDS` with a label and one-line description per kind,
    `DRILLS` and `SENSE` registries assembled from `estimation-drills-a.ts`, `estimation-drills-b.ts`, `estimation-sense.ts`),
    exports from `index.ts`, three starter drills (one `qps`, one `storage`, one `latency`) and three quick-fire items so the pages
    have data.
  - Migration, `schema.ts` (`estimationAttempts`), backup, sync entry, `apps/web/lib/estimation.ts` (`recordAttempt`, `getAttempts`,
    `getSummary`, the "no XP twice a day" rule), the `apps/web/lib/progress.ts` XP sum, server action `submitEstimateAction` in
    `actions.ts` (parses with `parseEstimate`, scores on the server, stores, `refresh()`).
  - Route skeletons for the three pages with a plain list of drills.
  - Done when: `pnpm exec vitest run packages/shared/src/estimation.test.ts apps/web/lib/estimation.test.ts` passes (step 5),
    `pnpm -r typecheck` passes, `/study/estimation` lists the starter drills.
- [ ] **1. Agent A: drills part 1 (30), file `packages/shared/src/estimation-drills-a.ts`.**
  - `qps` x12 (messages per second for a chat app, peak QPS from daily active users, read QPS with a cache hit rate, fan-out writes
    for a feed, API calls for a metrics pipeline, search queries, a login storm, ...), `bandwidth` x8 (egress for video, upload
    bandwidth, replication traffic, backup window), `latency` x10 (time to scan 1 GB from memory vs SSD vs network, sequential vs
    random reads, a request that fans out to N services with p99, how long to transfer a dataset between regions, ...).
  - Context budget (read only this): this plan; `packages/shared/src/estimation.ts` (types and the three starters); the "Latency",
    "Conversions" and "Capacity rules of thumb" tables in `KEY_NUMBERS` of `packages/shared/src/revise.ts`; `packages/shared/content/sd/sd-estimation.md`.
  - Done when: the content tests (step 5) pass for the file: every drill solves, truth is positive and finite, the scenario text
    mentions every given (formatted like "50 million"), there are 2-5 steps, 1-4 assumptions each with a `why`, one to three shortcuts, `checkedOn` set.
- [ ] **2. Agent B: drills part 2 (30) and quick-fire (30), files `estimation-drills-b.ts` and `estimation-sense.ts`.**
  - `storage` x12 (photos per year, logs per day, a message history, a metadata table with replication factor 3, a time series), `memory` x8
    (cache size for the hot 20 percent, session store, a bloom filter, an in-memory index), `servers` x10 (how many app servers for a
    peak QPS at an assumed per-server capacity, database shards for size and for QPS, a Kafka-like log's brokers).
  - Quick-fire x30 (`ns-*`): one number each, for example the time to read 1 MB from memory, a cross-region round trip, SSD random
    read, bytes in a UUID, seconds in a day, requests per second that 1 million per day means, size of 1 billion 4-byte integers, usual
    network bandwidth of a data-center NIC, a typical single database node write rate (stated as a range midpoint and noted as
    hardware dependent). Keep every number consistent with `KEY_NUMBERS`; where they would differ, use `KEY_NUMBERS`.
  - Context budget: same as agent A, plus `packages/shared/src/study.ts` lines for the `sd-estimation` concept.
  - Done when: same content tests pass for both files; each `ns-*` has a `note` that says why the number is what it is.
- [ ] **3. Agent C: the drill and quick-fire screens.**
  - `apps/web/app/study/estimation/[id]/page.tsx` and `estimate-form.tsx`: scenario, "given" chips, answer box with the unit beside it
    (plain form post that works without JS; with JS the result shows without a full reload), optional "Show my working" notes box
    (not scored, kept in the form only), **Reveal** after submit: your answer vs the model answer, the score label, direction
    ("about 4x too low"), a step table (`label`, expression in words, value with `formatEstimate`), the assumptions and their `why`, the
    shortcuts, and a link to `/study/sd/sd-estimation`. Next drill button picks the next unseen one of the same kind.
  - `apps/web/app/study/estimation/quick/page.tsx` and `quick-round.tsx`: a round of 10 quick-fire items, one at a time; the answer is a
    chip row of powers of ten (10^-9 ... 10^12, shown as "1 ns", "1 us", "1 ms", "1 s", "1 KB" ... by `unit`) plus a "Not sure, show it" button; correct within one order
    of magnitude = 4 points, adjacent = 2; shows the truth and the note after each; summary at the end.
  - Context budget: this plan; the mockup; `packages/shared/src/estimation.ts`; `apps/web/lib/estimation.ts`;
    `apps/web/app/study/reading/page.tsx`; `apps/web/app/ui.tsx`.
  - Done when: a wrong-by-100x answer scores 1 and says "too high" or "too low" correctly, the same page works with JS off, 390 px
    layout has no sideways scroll and the answer box keeps the numeric keyboard (`inputMode="decimal"`).
- [ ] **4. Agent D: landing page, history, stats.**
  - `apps/web/app/study/estimation/page.tsx`: today's set (5 items with done marks), a card per kind with count done and average points,
    the bias line, "weakest kind: storage (average 1.8)", a recent attempts list (title, your answer, the truth, points), and the
    quick-fire entry. Card on `study/page.tsx`. Use `estimationSummary`, `dailySet`.
  - `apps/web/lib/estimation.ts` additions: `getLandingData(today)`.
  - Context budget: this plan; the mockup; `packages/shared/src/estimation.ts`; `apps/web/lib/estimation.ts`;
    `apps/web/app/study/page.tsx`; `apps/web/app/profile/*` for a stats-card look.
  - Done when: with no attempts the page shows the empty state ("Do today's first drill"), with attempts it shows the bias and weakest
    kind, and the daily set stays the same on reload and changes the next day (test with a faked `Date`).
- [ ] **5. Tests and lead pass.**
  - `packages/shared/src/estimation.test.ts`: `evalExpr` (precedence, `^`, parentheses, unary minus, unknown name throws, no code
    execution: `"constructor"` or `"process.exit()"` throws); `scoreEstimate` boundaries for loose and strict; `parseEstimate`
    accepts and refuses the forms listed; `formatEstimate`; `estimationSummary` bias sign; `dailySet` stable for a date and different
    across dates; **content checks over all drills**: every drill solves, every step name is unique, every name used in an
    expression exists, the final value is positive, scenario text mentions every given, ids unique and prefixed, counts (60 and 30
    once agents are done), every `checkedOn` is a date, no emoji.
  - `apps/web/lib/estimation.test.ts`: `:memory:` DB; record, summary, "no XP twice a day", backup export contains the table, sync
    triggers queue a row.
  - Lead: browser check of landing, one drill and a quick round at 1280 and 390 px, light and dark; `pnpm check`; Review.

## Acceptance criteria

- [ ] `/study/estimation` shows today's 5 items, per-kind averages, your bias and recent attempts; the set is the same all day.
- [ ] A drill takes a typed estimate (`3.5e9`, `2 billion` where allowed), scores it by orders of magnitude and shows the worked
      solution, assumptions and shortcuts.
- [ ] Quick-fire rounds of 10 work and score by order of magnitude.
- [ ] 60 drills and 30 quick-fire items, all machine-checked (every drill solves, every number appears in its scenario).
- [ ] XP is awarded from attempt rows, once per drill per day for scores of 3 or more; attempts are in backups and sync.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Estimate

- Step 0: about 0.5 agent-day.
- Agents A and B (content, 60 drills + 30 items with machine checks): about 1 day each, in parallel. Agents C and D (screens): about
  0.75 day each, in parallel.
- Review and fixes: about 0.25 day.
- Total: about 2 calendar days at the current pace.
- Main risk: drills whose "model answer" is only one of several reasonable ones, so a good guess scores badly. Mitigation: `loose`
  tolerance (within 3x counts as interview-good), `why` text on every assumption, and the rule that a scenario states every number
  the answer needs except the listed assumptions.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
