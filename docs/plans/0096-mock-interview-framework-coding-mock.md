# 0096: Mock interview framework and the coding mock

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0096-mock-framework-coding-mock.html

## Goal

Add a new top-level destination, **Interview** (`/mock`), where you run timed mock interviews alone. This plan builds the
**shared mock model** that plans 0097, 0098, 0099, 0100 and 0102 build on: one table (`mock_sessions`) that syncs and is
backed up, a rubric per interview kind, a phase bar, a scoring sheet, and a history. It ships one complete kind, the
**coding mock**: a problem picked for you, a phase bar (clarify, approach, code, test, wrap-up), the existing judge
workspace without hints or solutions, and a rubric score at the end. Misses go back into your review loop.

## Context

What exists and what to reuse (all confirmed in the repo):

- **Judge workspace:** `apps/web/app/judge-workspace.tsx` exports `JudgeWorkspace`, which takes `id`, `spec`, `templates`,
  `tabs` (a list of `{ id, label, node }`), `header`, `readOnly`, `nextHref`, `xpGain`. `apps/web/app/dsa/[id]/page.tsx` builds
  the tabs (`ProblemDescription`, `ProblemHelp`, `ProblemSolution`, Notes, Ask AI, Stuck log). The mock page builds its own
  tab list with only the description. `startersFor(spec)` and `workspaceSpec(spec)` come from `problem-workspace.tsx` and
  `workspace-helpers.ts`. `JUDGE_PROBLEMS[id]` (shared `judge/index.ts`) is the pool; `ProblemSpec.kind` is `"function"` or
  `"design"`. The coding mock uses function problems only.
- **Stuck list:** `apps/web/lib/struggles.ts` has `logStruggle(problemId, kind, reason)` with kinds `hint | failed | slow`, and
  `isProblemId`. It only accepts problem ids. The review queue (`lib/review.ts`) reads open entries and links to `/dsa/<id>`.
- **Practice log:** `apps/web/lib/study.ts` `logPractice(id, { minutes, scores, notes, link })` stores a scored run of a study
  exercise (`sdd-*` system designs, `lldp-*` LLD problems; see `ALL_EXERCISES` in shared `study.ts`) and feeds the same Review
  queue through its spacing rule. Step scores are integers 1-5 per `FrameworkStep.id`.
- **Boss fights** (`lib/boss.ts`, `app/dsa/boss/page.tsx`) show how a candidate list is built from `getDsaView()`; copy the
  idea for picking, not the code.
- **Timer:** `apps/web/app/timer-store.ts` and `timer-math.ts` are the focus timer (localStorage). The mock timer is separate
  and derives its clock from `mock_sessions.started_at`, so it survives a reload and cannot drift.
- **Sync:** `apps/web/lib/sync-triggers.ts` (`SYNC_TABLE_MAP_V1`, `_V2`, trigger SQL, `syncMigrationSqlV2`),
  `lib/sync-engine.ts` (`DEFAULTS` for NOT NULL columns), `lib/hub/migrations.ts` (`HUB_MIGRATIONS`, `HUB_TABLES`),
  `packages/sync-worker/{schema.sql, migrations/, src/index.ts}` (`PK`, `COLUMNS`). Last hub migration is `0008`
  (`run_detail`), last worker migration is `0007_solution_run_detail.sql`.
- **Backup:** `apps/web/lib/backup.ts` `BACKUP_TABLES`.
- **Nav:** `apps/web/app/nav.tsx` (`MAIN`, `ROADMAP`, `SIDEBAR`, `TABS`, `ICONS`), `nav.test.ts`. `DESIGN.md` section 5 says "5 primary
  destinations"; update it.
- Conventions from `AGENTS.md` that apply: Next 16 `cacheComponents` (request data in an async component with
  `await connection()` inside `<Suspense>`), server actions in `app/actions.ts` call `refresh()`, dates are local
  `YYYY-MM-DD`, no `Date.now()` or `Math.random()` during render, new tables go in `MIGRATIONS` + `schema.ts` +
  `BACKUP_TABLES` + sync, tests next to the code, `:memory:` DB in tests.
- **Other plans in flight touch the same registries.** 0095 appends its own `MIGRATIONS` entry and sync map, 0097/0098/0102
  replace one stub file each (listed in step 0). Migrations are append-only: whoever merges second appends after the first;
  never reorder or edit a shipped one.

## The shared mock model (the contract other plans copy)

### Table (local, SQLite)

```sql
CREATE TABLE mock_sessions (
  id TEXT PRIMARY KEY,                 -- crypto.randomUUID()
  kind TEXT NOT NULL,                  -- 'coding' | 'design' | 'lld' | 'behavioral' | 'oa'
  prompt_ref TEXT NOT NULL DEFAULT '', -- coding: problem id; design: 'sdd-...'; lld: 'lldp-...'; behavioral: set id; oa: format id
  started_at INTEGER NOT NULL,         -- epoch ms
  ended_at INTEGER,                    -- null while running
  duration_s INTEGER,                  -- seconds actually used (ended_at - started_at), set on finish
  on_date TEXT NOT NULL,               -- local YYYY-MM-DD of the start (for lists and stats)
  settings_json TEXT NOT NULL DEFAULT '{}',
  transcript_json TEXT NOT NULL DEFAULT '{}',
  scores_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0  -- epoch ms, local ordering only (not uploaded)
);
CREATE INDEX mock_sessions_kind_started ON mock_sessions (kind, started_at);
CREATE INDEX mock_sessions_on_date ON mock_sessions (on_date);
```

Deviation from the planning brief, on purpose: no local `deleted_at`. The sync triggers already write a tombstone when a row
is deleted (`sync_stamps.deleted_at`), so a delete is a real `DELETE`. The cloud tables have their own `deleted_at` column.
`kind` is not a SQL `CHECK` (a later kind should not need a table rebuild); the data layer validates it.

### Types (`packages/shared/src/mock/types.ts`)

```ts
export const MOCK_KINDS = ["coding", "design", "lld", "behavioral", "oa"] as const;
export type MockKind = (typeof MOCK_KINDS)[number];

export type Scorer = "self" | "ai" | "friend";
export type Level = 1 | 2 | 3 | 4;
export type Verdict = "no_hire" | "lean_no_hire" | "lean_hire" | "hire";

/** One thing an interviewer scores. Anchors are plain-words descriptions of what a 1, 2, 3 and 4 look like. */
export interface RubricCriterion {
  id: string;                          // stable, kebab-case, unique inside the rubric
  label: string;                       // "Clarifying the problem"
  asks: string;                        // the question the scorer answers, one sentence
  anchors: [string, string, string, string]; // index 0 is level 1 ... index 3 is level 4
  weight: number;                      // > 0; weights are normalised when scoring
  critical?: boolean;                  // a 1 here caps the verdict at lean_no_hire
  /** Optional link to a study framework step id (design and LLD): lets a mock score feed `logPractice`. */
  stepId?: string;
}
export interface Rubric {
  kind: MockKind;
  version: number;                     // bump when criteria or anchors change meaning
  title: string;
  criteria: RubricCriterion[];
}

export interface PhaseSpec {
  id: string;                          // "clarify"
  label: string;                       // "Clarify"
  minutes: number;                     // planned minutes at the base duration
  hint: string;                        // one line: what to do in this phase
}

/** One line of the session log. Same names 0099 uses for the AI chat. */
export interface TranscriptEntry {
  role: "interviewer" | "candidate" | "system";
  content: string;
  phase?: string;
  atS: number;                         // seconds since start
  hint?: 1 | 2 | 3;
}
export interface PhaseLogEntry { id: string; startedAtS: number; endedAtS: number | null }
export interface MockTranscript {
  entries: TranscriptEntry[];
  phases: PhaseLogEntry[];
  /** kind-specific payload: coding keeps runs, design keeps the board (0097), lld keeps files (0098) */
  extra?: Record<string, unknown>;
}

export interface ScoreSheet {
  rubricVersion: number;
  by: Scorer;
  criteria: Record<string, { level: Level; note?: string }>;
  overall: number;                     // weighted average, 1.00 to 4.00, two decimals
  verdict: Verdict;
  summary?: string;                    // one paragraph; the AI or the friend may fill it
  at: number;                          // epoch ms when saved
}
export type MockScores = Partial<Record<Scorer, ScoreSheet>>;

export interface MockSettings {
  totalMinutes: number;
  interviewer: Scorer;                 // who plays the interviewer: yourself, the AI (0099) or a friend (0100)
  hintsAllowed: boolean;
  /** kind-specific: coding keeps { language, difficulty, source } */
  [key: string]: unknown;
}

export interface MockSession {
  id: string; kind: MockKind; promptRef: string; startedAt: number; endedAt: number | null;
  durationS: number | null; onDate: string;
  settings: MockSettings; transcript: MockTranscript; scores: MockScores; notes: string;
}
export const MOCK_LIMITS = { transcriptChars: 60_000, notesChars: 4_000, noteChars: 500, entryChars: 2_000 } as const;
```

Rules: `parseSession(row)` never throws (bad JSON gives defaults). The transcript is capped at `transcriptChars` after
`JSON.stringify` (oldest `system` entries are dropped first). The cap keeps one sync push far below the Worker's 1 MB body
limit (`MAX_BODY_BYTES` in `packages/sync-worker/src/index.ts`).

### Rubrics and phases as data

- `packages/shared/src/mock/rubrics.ts`: `export const RUBRICS: Record<MockKind, Rubric | null>` built from one file per kind,
  and `rubricFor(kind): Rubric | null`. Files: `rubrics-coding.ts` (this plan), `rubrics-design.ts` (0097),
  `rubrics-lld.ts` and `rubrics-behavioral.ts` (0098), `rubrics-oa.ts` (0102; may stay `null`). Step 0 creates the four
  non-coding files as `export const X_RUBRIC: Rubric | null = null;`. The owner plan replaces its stub.
- `packages/shared/src/mock/phases.ts`: `export const PHASES: Record<MockKind, PhaseSpec[]>`, same pattern:
  `phases-coding.ts`, `phases-design.ts`, `phases-lld.ts`, `phases-behavioral.ts`, `phases-oa.ts` (stubs are `[]`).
  `scalePhases(phases, totalMinutes)` scales minutes proportionally, rounds, and fixes the last phase so the sum is exact
  (each phase keeps at least 1 minute). `phaseAt(phases, elapsedS)` returns `{ index, intoPhaseS, overS }` using the planned
  boundaries.
- `packages/shared/src/mock/kinds.ts`: `MOCK_KIND_META: Record<MockKind, { label; blurb; ready: boolean; newHref; tone: "c1" | "c2" | "c3" | "c4" }>`.
  `ready` is `true` only for coding in this plan. Each later plan flips its own line.

### Scoring (`packages/shared/src/mock/score.ts`)

```ts
export function scoreSheet(rubric: Rubric, by: Scorer, input: Record<string, { level: number; note?: string }>, now: number, summary?: string): ScoreSheet | null;
export function overallOf(rubric: Rubric, levels: Record<string, Level>): number;     // sum(w*level)/sum(w), 2 decimals
export function verdictOf(rubric: Rubric, levels: Record<string, Level>): Verdict;
export function missesOf(rubric: Rubric, sheet: ScoreSheet): RubricCriterion[];       // criteria scored 1 or 2
export function levelToFive(level: Level): 1 | 2 | 3 | 4 | 5;                          // 1,2,3,4 -> 1,2,4,5 (for logPractice)
```

`scoreSheet` returns `null` unless every criterion has an integer level 1-4; notes are trimmed to `MOCK_LIMITS.noteChars`.
Verdict from the weighted average: under 1.75 `no_hire`, under 2.5 `lean_no_hire`, under 3.25 `lean_hire`, otherwise `hire`.
If any `critical` criterion is 1, the verdict is at most `lean_no_hire`.

### Coding rubric (`rubrics-coding.ts`, `version: 1`, weights in brackets)

| id | Label | Level 1 | Level 2 | Level 3 | Level 4 |
|---|---|---|---|---|---|
| `clarify` (1) | Clarifying the problem | Started coding without asking anything. | Asked one or two questions but missed an input limit or edge case that mattered. | Restated the problem, asked about sizes, duplicates and empty input. | Also fixed examples and agreed what "done" means before choosing an approach. |
| `approach` (2, critical) | Approach and trade-offs | No plan, or only brute force with no sense that it is slow. | Brute force first, found the better idea only after a nudge. | Reached a good approach unaided and said why it works. | Compared two approaches, picked one on stated costs, and named the pattern. |
| `code` (2) | Writing the code | Code does not compile or does not solve the problem. | Mostly right, with bugs found only by running it. | Correct, readable, sensible names, small helpers. | Correct on the first full run, clean structure, edge cases handled in the code. |
| `testing` (1) | Testing and debugging | Did not test, or could not find a failing case. | Ran the examples only; debugging was guesswork. | Walked a small case by hand and fixed what failed from the evidence. | Chose edge cases up front, found the bug quickly, and explained the fix. |
| `complexity` (1) | Complexity and limits | Could not state time or space cost. | Stated one of them, with an error. | Stated both correctly and tied them to the constraints. | Also said what breaks at 10x input and how to change the design. |
| `communication` (1) | Thinking out loud | Long silences, no narration. | Narrated parts, hard to follow the reasoning. | Steady narration; the interviewer could follow every step. | Led the conversation, checked in at decision points, took a hint gracefully. |

Phases (`phases-coding.ts`, base 45 minutes): `clarify` 4, `approach` 6, `code` 22, `test` 8, `wrap` 5 (complexity and one
follow-up). Hints per phase are one line each (for example `approach`: "Say the brute force and its cost before you improve it.").

### Phase timer component (`apps/web/app/mock/phase-timer.tsx`, client)

```tsx
export interface PhaseTimerProps {
  phases: PhaseSpec[];                 // already scaled with scalePhases
  startedAt: number;                   // mock_sessions.started_at (epoch ms)
  endedAt?: number | null;             // when set the clock freezes and the bar is read-only
  currentPhaseId: string;              // controlled by the parent; the person advances it by hand
  onAdvance: (nextPhaseId: string, atS: number) => void; // "Next phase" button; parent appends a PhaseLogEntry
  onTimeUp?: () => void;               // called once when total time is reached (the clock keeps counting as overtime)
  onFinish: () => void;                // "End mock" button (asks for confirmation inside the component)
  warnAtS?: number[];                  // default [300, 60] seconds before the end: the clock turns warning-coloured
  compact?: boolean;                   // phone: one row, hides phase labels except the current one
}
export function PhaseTimer(props: PhaseTimerProps): JSX.Element;
```

Behaviour: one segment per phase, width proportional to its minutes, fill shows time spent in it, the current segment is
outlined, a segment that ran past its plan turns `warning` coloured. A 1 Hz clock comes from `useSyncExternalStore` over a
module-level interval store (no `Date.now()` in render). Pure math lives in `apps/web/app/mock/phase-timer-math.ts`
(`elapsedS(startedAt, endedAt, now)`, `segmentStates(phases, log, nowS)`, `warningLevel(totalS, elapsedS, warnAtS)`) with a
test. There is no pause button: a real interview does not pause. `aria-live="polite"` announces only phase changes and the two
warnings, not every tick. Reduced motion: no animation on the fill.

### Routes

| Route | File | Owner |
|---|---|---|
| `/mock` (hub, history, kind cards, links) | `apps/web/app/mock/page.tsx` | this plan |
| `/mock/coding/new` (setup) | `apps/web/app/mock/coding/new/page.tsx` + `new-form.tsx` | this plan |
| `/mock/session/[id]` (live, scoring, result) | `apps/web/app/mock/session/[id]/page.tsx` | this plan |
| `/mock/design/new`, `/mock/lld/new`, `/mock/behavioral/new`, `/mock/oa/new` | skeleton pages that redirect to `/mock` until `ready` | each kind's plan replaces its page |

The session page loads the row and picks a view with `SESSION_VIEWS: Record<MockKind, ComponentType<{ session: MockSession }>>`
in `apps/web/app/mock/session-views.tsx` (coding here; others fall back to the generic `MockResult`). Three states, derived from
the row: running (`endedAt === null`), needs scoring (ended, `scores.self` missing), done. `MockResult` and `ScoreForm` are generic
and work for every kind because they only need the rubric.

### Data layer (`apps/web/lib/mock.ts`, `import "server-only"`)

```ts
createMockSession(input: { kind: MockKind; promptRef: string; settings: MockSettings }): Promise<string>  // returns id; validates kind, ref, totalMinutes 10-120
getMockSession(id: string): Promise<MockSession | null>
listMockSessions(opts?: { kind?: MockKind; limit?: number }): Promise<MockSessionSummary[]>             // newest first, no transcript
saveMockProgress(id: string, patch: { transcript?: MockTranscript; settings?: Partial<MockSettings>; notes?: string }): Promise<boolean>  // refuses an ended session; caps size
finishMockSession(id: string, now: number): Promise<boolean>                                              // sets ended_at, duration_s (idempotent)
saveScores(id: string, by: Scorer, input: Record<string, { level: number; note?: string }>, summary?: string): Promise<{ ok: boolean; misses: string[] }>
deleteMockSession(id: string): Promise<boolean>
mockStats(): Promise<{ last30: number; byKind: Record<MockKind, { count: number; avg: number | null }> }>
pickCodingPrompt(opts: { source: "unsolved" | "stuck" | "weak-pattern" | "random"; difficulty?: "easy" | "medium" | "hard"; patternId?: string; seed: string }): Promise<string | null>
```

`saveScores` also runs the **miss rules** (the brief says misses go to the stuck list; the stuck list only holds problem ids, so
other kinds use the practice log, which feeds the same Review queue):

- **coding:** each criterion at level 1 or 2 is a miss. If `approach`, `code` or `testing` is a miss, call
  `logStruggle(promptRef, "failed", "Mock: <labels>")`; if only `complexity`, `communication` or `clarify` missed, call
  `logStruggle(promptRef, "slow", "Mock: <labels>")`. Log at most one entry per session. Do **not** write `problem_solves` and do
  not award solve XP from a mock.
- **design / lld** (criteria that have a `stepId`; criteria without one are skipped, and a `stepId` is used by at most one criterion): call `logPractice(promptRef, { minutes, scores: { [stepId]: levelToFive(level) }, notes: "Mock interview", link: "" })`
  when `promptRef` is in `ALL_EXERCISES`. This gives the exercise a score and schedules it in Review.
- **behavioral / oa:** the owner plan (0098, 0102) decides; `saveScores` returns the `misses` ids and does nothing else.

Writing `by: "ai"` or `by: "friend"` replaces only that scorer's sheet; `self` is never overwritten by another scorer. Miss rules
run only for `self` (and for `friend`/`ai` only when no `self` sheet exists yet), so two scorers cannot log twice.

### Server actions (`apps/web/app/actions.ts`, all call `refresh()`)

`startMockAction(formData)` (creates the session, `redirect` to `/mock/session/<id>`), `saveMockProgressAction(id, patch)`,
`finishMockAction(id)`, `saveScoresAction(id, by, input, summary?)` (0099 and 0100 call this one), `deleteMockAction(id)`.
Each validates its input with the data layer and returns `{ ok: boolean; error?: string }` instead of throwing.

### Sync and backup registration (one place each)

Plan 0095 also adds sync tables (`stories`, `behavioral_progress`) and names its map `SYNC_TABLE_MAP_V3`. Whichever plan merges second
uses the next free name (`V4`, `syncMigrationSqlV4`) or, if the first is not merged yet, adds its tables to the same map and the
same migration entry. Likewise take the next free hub migration number and worker migration file number (`0009`/`0008` below
assume this plan lands first). Check `git log` and the files before starting step 0.

1. `apps/web/lib/db.ts`: append one `MIGRATIONS` entry: `CREATE TABLE mock_sessions ...` (above) followed by
   `syncMigrationSqlV3()`.
2. `apps/web/lib/sync-triggers.ts`: add
   ```ts
   export const SYNC_TABLE_MAP_V3: readonly SyncTableDef[] = [
     { local: "mock_sessions", cloud: "mock_sessions", key: "single", keyCols: ["id"],
       cols: ["kind", "prompt_ref", "started_at", "ended_at", "duration_s", "on_date", "settings_json", "transcript_json", "scores_json", "notes"] },
   ];
   ```
   extend `SYNC_TABLE_MAP` with it, and add `syncMigrationSqlV3()`. Refactor the "queue existing rows when linked" part of
   `syncMigrationSqlV2` into a helper taking the table map so V2 and V3 share it (V2 output must stay byte-identical; the
   existing test compares behaviour, add a snapshot-free check that V2 still queues the same tables).
3. `apps/web/lib/sync-engine.ts` `DEFAULTS`: `mock_sessions: { kind: "coding", prompt_ref: "", started_at: 0, on_date: "", settings_json: "{}", transcript_json: "{}", scores_json: "{}", notes: "", updated_at: 0 }`.
4. `apps/web/lib/hub/migrations.ts`: append `HUB_MIGRATIONS` entry `0009` creating the cloud table and add `"mock_sessions"` to
   `HUB_TABLES`:
   ```sql
   CREATE TABLE IF NOT EXISTS mock_sessions (
     user_id TEXT NOT NULL, id TEXT NOT NULL,
     kind TEXT NOT NULL, prompt_ref TEXT NOT NULL DEFAULT '', started_at INTEGER NOT NULL, ended_at INTEGER,
     duration_s INTEGER, on_date TEXT NOT NULL DEFAULT '', settings_json TEXT NOT NULL DEFAULT '{}',
     transcript_json TEXT NOT NULL DEFAULT '{}', scores_json TEXT NOT NULL DEFAULT '{}', notes TEXT NOT NULL DEFAULT '',
     updated_at INTEGER NOT NULL, deleted_at INTEGER, synced_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, id));
   CREATE INDEX IF NOT EXISTS mock_sessions_user_updated ON mock_sessions (user_id, updated_at);
   CREATE INDEX IF NOT EXISTS mock_sessions_user_synced ON mock_sessions (user_id, synced_at);
   ```
5. `packages/sync-worker/migrations/0008_mock_sessions.sql` (same SQL), `packages/sync-worker/schema.sql` (append), and in
   `packages/sync-worker/src/index.ts` add `mock_sessions: "id"` to `PK` and the ten uploaded columns to `COLUMNS`.
6. `apps/web/lib/backup.ts`: add `"mock_sessions"` to `BACKUP_TABLES`.
7. `apps/web/lib/schema.ts`: `export const mockSessions = sqliteTable("mock_sessions", { ... })` matching the SQL
   (`id` text primary key, integers as `integer`, JSON columns as `text` strings; parse in `lib/mock.ts`, not with `mode: "json"`, so
   a bad row never throws).
8. Check `apps/web/lib/sync-engine.ts` push batching: it batches by row count (`BATCH_SIZE = 200`). If it does not also stop at
   about 500 KB of JSON, add that byte limit (a transcript is up to 60 KB, so 200 rows could exceed the Worker's 1 MB body).

## Out of scope

- The system design, LLD, behavioural and OA mocks themselves (0097, 0098, 0102), the AI interviewer (0099), the friend kit (0100).
- Audio or video recording, speech to text, screen sharing.
- Pause or resume of the clock; reopening an ended session.
- Showing mocks in the heatmap, XP, badges, the readiness score (0110 may read `mock_sessions` later) or Today tasks of the
  `mock_app` category.
- A "Retake this problem" shortcut and trend charts (history shows a list only).

## Steps

Step 0 is done first by one agent. Then agents A to D work in parallel on disjoint files.

- [ ] **0. Foundation (one agent, first).** Create `packages/shared/src/mock/{types.ts, kinds.ts, phases.ts, rubrics.ts, score.ts, pick.ts, index.ts}`
  and the per-kind stub files (`rubrics-*.ts`, `phases-*.ts`) from the contract above. `types.ts` and `kinds.ts` are final.
  `phases.ts`, `rubrics.ts`, `score.ts`, `pick.ts` get their exported signatures with bodies that `throw new Error("not implemented")`
  (agent A fills them). Export `./mock` from `packages/shared/src/index.ts`. Add the migration, `schema.ts` table, `SYNC_TABLE_MAP_V3`,
  `syncMigrationSqlV3`, `DEFAULTS`, hub migration `0009`, worker migration `0008` + `schema.sql` + `PK`/`COLUMNS`, `BACKUP_TABLES`.
  Create `apps/web/lib/mock.ts` with the function signatures above (bodies `throw`), the five actions in `actions.ts` (bodies call
  the data layer), and route skeletons: `/mock/page.tsx`, `/mock/coding/new/page.tsx`, `/mock/session/[id]/page.tsx`
  (each renders a heading), and the four redirect-to-`/mock` pages for the other kinds. Update `sync-triggers.test.ts` for the new
  table (insert queues a row keyed by `id`, update re-queues, delete writes a tombstone), `backup.test.ts` (round trip includes
  `mock_sessions`) and `packages/sync-worker/src/index.test.ts` (table list).
  - Done when: `pnpm -r typecheck` passes; `pnpm exec vitest run apps/web/lib/sync-triggers.test.ts apps/web/lib/backup.test.ts`
    and the worker test pass; a fresh `:memory:` DB has the table; the routes render a heading.
- [ ] **1. Agent A: shared logic and the coding content.** Files: `packages/shared/src/mock/{phases.ts, score.ts, pick.ts, rubrics.ts, rubrics-coding.ts, phases-coding.ts}`
  and `packages/shared/src/mock/mock.test.ts`. Implement `scalePhases`, `phaseAt`, `scoreSheet`, `overallOf`, `verdictOf`, `missesOf`,
  `levelToFive`, a pure `pickFromCandidates(candidates, opts, seed)` (seeded FNV-1a ordering like `pickBoss`; candidate shape
  `{ id; difficulty?; patterns: string[]; solved: boolean; stuck: boolean }`), and write the coding rubric and phases exactly as in
  the tables above (hints in plain words, no emoji).
  Context budget (read only this): this plan, `packages/shared/src/mock/types.ts`, `apps/web/lib/boss.ts` (lines 1-45, for the hash).
  - Done when: `pnpm exec vitest run packages/shared/src/mock` passes with cases for: `scalePhases` sums exactly for 15/30/45/60/90
    and keeps each phase at least 1 minute; `phaseAt` at boundaries; weighted average and verdict thresholds; a `critical` 1 caps at
    `lean_no_hire`; `scoreSheet` returns `null` when a criterion is missing or 5; every rubric in `RUBRICS` that is not `null` has
    unique ids, unique `stepId`s (when set), four non-empty anchors, positive weights; picking is deterministic for a seed and respects the filters.
- [ ] **2. Agent B: data layer, actions, bridges.** Files: `apps/web/lib/mock.ts`, `apps/web/lib/mock.test.ts`, the five actions in
  `apps/web/app/actions.ts`. Implement every function above with validation and the size caps; `pickCodingPrompt` builds candidates
  from `getDsaView()` and `openStruggles()` (function problems with a `JUDGE_PROBLEMS` spec only, no premium) and calls
  `pickFromCandidates`. Implement the miss rules with `logStruggle` and `logPractice`.
  Context budget: this plan, `packages/shared/src/mock/types.ts` + `score.ts` signatures, `apps/web/lib/struggles.ts`,
  `apps/web/lib/study.ts` (`logPractice` only), `apps/web/lib/boss.ts` (candidate building), `apps/web/lib/db.test.ts` (test setup style).
  - Done when: `pnpm exec vitest run apps/web/lib/mock.test.ts` passes: create/get/list/delete; bad kind, bad ref, `totalMinutes` 5 or 500
    rejected; `saveMockProgress` refuses an ended session and trims an oversized transcript; `finishMockSession` is idempotent and
    sets `duration_s`; `saveScores` stores `self`, rejects partial input, applies each miss rule once (coding: one `problem_struggles`
    row and no `problem_solves` row; design with `sdd-*`: one `practice_sessions` row with step scores; unknown ref: nothing), and a
    second scorer does not log again; the DB test fakes only `Date`.
- [ ] **3. Agent C: hub, setup form, navigation.** Files: `apps/web/app/mock/page.tsx`, `apps/web/app/mock/hub-links.ts`,
  `apps/web/app/mock/hub-history.tsx`, `apps/web/app/mock/coding/new/{page.tsx, new-form.tsx}`, `apps/web/app/nav.tsx`,
  `apps/web/app/nav.test.ts`, `DESIGN.md` (section 5: six rail destinations, phone note), `apps/web/app/mock/skeleton.tsx`.
  Hub per the mockup: heading, kind cards from `MOCK_KIND_META` (a card with `ready: false` shows "Coming soon" and is not a link),
  a "More interview prep" row built from `HUB_LINKS: { id; label; blurb; href; enabled }[]` (starts empty; the row is hidden when
  empty; later plans append one entry), `mockStats()` strip, history list (kind filter chips, newest first, row = kind tag, prompt
  title, date, duration, overall and verdict, link to the session, delete with `useConfirm`), and an empty state with one button.
  Setup form: problem source (Unsolved, From my stuck list, Weak pattern, Random), difficulty, length 30/45/60, language, "Hints
  allowed" (default off), "Start" posts to `startMockAction`; works without JS; shows the chosen problem title after the pick
  with "Pick another". Nav: add `INTERVIEW` (`href: "/mock"`, icon `interview` = `M4 5h16v11H9l-5 4z`, `matches: ["/mock"]`) to
  `SIDEBAR` between Review and Roadmap; phone `TABS` stay at five: add `"/mock"` to the "You" tab's `matches`, and show an Interview
  row at the top of the profile menu on phones (the account popover file is `apps/web/app/components/account-menu.tsx` or the
  file `nav.tsx` imports for it; find it with Grep for "Settings" in the popover). Request data in async components with
  `await connection()` inside `<Suspense>`, with a skeleton (`skeleton.tsx`).
  Context budget: this plan, the mockup, `apps/web/app/nav.tsx`, `nav.test.ts`, `apps/web/app/review/page.tsx` (page structure and
  Suspense pattern), `apps/web/app/ui.tsx` (button and card helpers), `DESIGN.md` sections 4, 5, 7.
  - Done when: `pnpm exec vitest run apps/web/app/nav.test.ts` passes with the sixth rail item and the phone tab count unchanged;
    `/mock` renders the empty state on a fresh DB and the history on a DB with rows; `/mock/coding/new` starts a session at 1280 and
    390 px.
- [ ] **4. Agent D: session page, phase timer, scoring.** Files: `apps/web/app/mock/phase-timer.tsx`, `phase-timer-math.ts`,
  `phase-timer-math.test.ts`, `apps/web/app/mock/session/[id]/page.tsx`, `apps/web/app/mock/session-views.tsx`,
  `apps/web/app/mock/coding-session.tsx`, `apps/web/app/mock/mock-result.tsx`, `apps/web/app/mock/score-form.tsx`, and a small optional
  prop on `apps/web/app/judge-workspace.tsx`: `mock?: { onResult: (r: { passed: number; total: number; kind: "run" | "submit" }) => void }`.
  When `mock` is set, a passing Submit must not call the solve/save actions (read the Submit path first and gate only those calls)
  and must call `onResult`. Coding session: header = `PhaseTimer`; tabs = Description only (plus a "Scratch" tab holding a plain
  textarea saved to `transcript.extra.scratch`); each run or submit appends a `system` transcript entry
  (`"Run: 3/5 passed"`), saved with a 2 s debounce through `saveMockProgressAction`; "Next phase" appends a `PhaseLogEntry`; the
  phase hint shows under the bar. "End mock" calls `finishMockAction`, then the page shows `MockResult` (time per phase vs plan,
  run timeline, final test result) and `ScoreForm`: one block per rubric criterion with the four anchors as radio cards (levels
  1-4), an optional note, a summary box, live overall and verdict, Save calls `saveScoresAction`, then shows "Added to your review
  list: ..." from the returned misses. Closing the tab mid-session leaves the row running; reopening resumes from `startedAt`.
  Context budget: this plan, the mockup, `apps/web/app/judge-workspace.tsx` (props and Submit path only), `apps/web/app/dsa/[id]/page.tsx`
  (lines 95-195), `apps/web/app/problem-workspace.tsx` (`ProblemDescription`, `startersFor`), `apps/web/app/workspace-helpers.ts`.
  - Done when: `pnpm exec vitest run apps/web/app/mock/phase-timer-math.test.ts apps/web/app/judge-workspace.test.ts` passes (math:
    elapsed, segment states with overtime, warning levels, freeze when ended; judge: `mock` prop leaves normal behaviour unchanged and
    a mock Submit does not record a solve); a session can be started, run, ended and scored in the browser at 1280 and 390 px,
    and a reload during the session keeps the clock.
- [ ] **5. Wire-up and review (lead).** Run `pnpm check` once. Manual pass: start a coding mock, submit a failing and a passing
  solution, end, score with `approach` = 2, and confirm one new open entry in `/review` and none in solved problems; delete the
  session; sign in to a sync account on a test copy and confirm the row syncs (`sync-e2e.test.ts` style).
  - Done when: `pnpm check` passes and the manual pass is written in *Implementation notes*.

## Acceptance criteria

- [ ] The rail shows Interview between Review and Roadmap; on phones it is reachable from the You tab; `DESIGN.md` is updated.
- [ ] `/mock` shows kind cards (only coding enabled), history with a kind filter, and an empty state on a fresh database.
- [ ] A coding mock picks a problem by the chosen source, shows a phase bar and a clock that survive a reload, hides hints, solution
      and AI, and never records a solve or XP.
- [ ] Ending the mock shows time per phase and run results, and a rubric form with the four anchors per criterion; saving shows
      the weighted score and verdict and the misses added to Review.
- [ ] `mock_sessions` is in `MIGRATIONS`, `schema.ts`, `BACKUP_TABLES`, the sync map, the hub migration and the worker; a backup
      export and restore keeps sessions.
- [ ] Other kinds can plug in by replacing one rubric stub, one phases stub and one `MOCK_KIND_META` line, with no change to the
      table, the timer or the score form.
- [ ] `pnpm check` passes
- [ ] No changes outside the files listed above (or explained in *Implementation notes*)

## Estimate

- Step 0 (foundation): 1 agent-day (three migrations, sync refactor, stubs).
- Parallel agents: A 0.5, B 0.75, C 0.75, D 1.25 agent-days, running together, so about 1.25 calendar days.
- Review and fixes (step 5 plus one round): 0.5 day.
- Total: **about 3 calendar days**, one plan in flight per tool.
- Main risk: the `mock` prop on `judge-workspace.tsx` (a large client file; keep the change to one prop and two guarded calls) and
  the sync push size (step 0 item 8). Second risk: 0095 and 0096 both append migrations; whoever merges second must append after.

## Dependencies

- Needs nothing else. Sets up 0097, 0098, 0099, 0100 and 0102 (hard dependency for all five). 0095 (stories) is independent, but
  its migration and sync entries must be ordered against this one at merge time. 0110 (readiness) may later read `mock_sessions`.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
