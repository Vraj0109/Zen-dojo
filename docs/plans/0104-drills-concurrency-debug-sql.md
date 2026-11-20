# 0104: Drills: concurrency, find-the-bug, predict-the-output and SQL

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** SPEC.md section, if any
- **Mockup:** docs/mockups/interview-prep/0104-drills.html
- **Depends on:** none required. Set 0095-0111: 0110 (readiness) may count drill progress; 0098 (LLD mock) may link
  concurrency drills. Neither is needed here.

## Goal

SDE2/SWE3 loops contain questions the problem list does not cover: write a thread-safe class, read code and say what it
prints, find the bug in 20 lines, write a SQL query. Add a **Drills** area under Practice with four kinds of exercise:

- **Concurrency** (12): fix or write a thread-safe Java class; a hidden test harness hammers it with threads and says
  what failed ("lost updates: expected 4000, got 3187").
- **Find the bug** (30): code that almost works; edit it until the tests pass (Java and Python, some C++).
- **Predict the output** (24): read a snippet, type what it prints, then see the walkthrough.
- **SQL** (40): write a query against a small dataset; your result is compared with the reference result.

## Context

- The judge: `packages/shared/src/judge/*` (`ProblemSpec`, `Case`, `JudgeLang`), `apps/web/lib/judge/run.ts`
  (`runCode`), the run route `apps/web/app/api/judge/run/route.ts` (its `specFor` resolves ids via
  `resolveProblemSpec(id, getPackProblemSpec)`), the problem screen `apps/web/app/judge-workspace.tsx` and
  `problem-workspace.tsx`. The tools finder is `apps/web/lib/judge/resolve.ts`; on hosted deployments running code is
  blocked (`apps/web/lib/hosted/no-run.ts`, `hosted-run-notice.tsx`): code drills follow that rule.
- Multi-file Java projects already run: `apps/web/lib/judge/run-project.ts` (`runJavaProject`, timeout, compile
  diagnostics), route `apps/web/app/api/judge/run-project/route.ts`, editor `apps/web/app/components/project-editor.tsx`,
  file helpers `apps/web/lib/project-files.ts`, drafts stored in `problem_notes.code` (also how "Your classes" in LLD
  works, `apps/web/app/study/[area]/[id]/page.tsx`). Concurrency drills reuse all of that.
- `@libsql/client` is already a dependency (`apps/web/lib/db.ts`). SQL drills use a **separate in-memory database**
  per run. The dialect is SQLite (say so on the page: window functions, CTEs and `date()` work; `TOP`, `ILIKE`,
  `DATEDIFF` do not).
- Practice entry point: `apps/web/app/dsa/page.tsx` (tabs, Boss fights link). Add a "Drills" link next to the boss
  link (one line; the file has uncommitted edits from other work, append only).
- XP is computed from rows (AGENTS.md): add the drill table to the sum in `apps/web/lib/progress.ts`.
- Conventions: migration in `db.ts` + `schema.ts`, table in `BACKUP_TABLES` and the sync map (`SYNC_TABLE_MAP_V3` in
  `lib/sync-triggers.ts`; if another plan already added V3, use the next free one), server actions in `actions.ts`
  followed by `refresh()`, tests next to the code, content written for this app, no emoji.

## Out of scope

- Running concurrency drills in C++ or Python (Java only; the judge threads story is clearest there).
- Other SQL engines, writes (INSERT/UPDATE/DDL by the learner), query plans/indexes lessons (a later plan can link to
  `db-indexing`).
- Adding drills to the stuck list, review queue or boss fights.
- AI hints or AI grading (0099).
- Changing existing LeetCode problems, the problem list, or the LLD projects.

## Data model

`packages/shared/src/drills.ts` (pure types and helpers, exported from `index.ts`):

```ts
export type DrillKind = "concurrency" | "debug" | "output" | "sql";
export interface DrillBase { id: string; kind: DrillKind; title: string; level: "easy" | "medium" | "hard";
  topics: string[]; statement: string[]; hints: string[]; explanation: string[]; checkedOn: string }
// ids: cc-<name>, dbg-<name>, out-<name>, sql-<nn>-<name>
export interface SqlDrill extends DrillBase { kind: "sql"; dataset: string; solution: string; ordered: boolean }
export interface OutputDrill extends DrillBase { kind: "output"; lang: "java" | "python" | "cpp"; code: string; answer: string }
export interface DebugDrill extends DrillBase { kind: "debug"; spec: ProblemSpec; starter: Partial<Record<JudgeLang, string>>; bugs: string[] }
export interface ConcurrencyDrill extends DrillBase { kind: "concurrency"; files: { name: string; code: string }[]; reference: { name: string; code: string }[]; runs: number; timeoutMs: number }
export interface SqlDataset { id: string; title: string; tables: { name: string; columns: [string, string][] }[]; ddl: string }
```

- Hidden test harnesses of concurrency drills live in `packages/shared/src/drills/harness.ts` (separate module, imported
  only by server code) as `HARNESS: Record<drillId, { name: string; code: string }[]>`. The harness prints `PASS` or one
  line `FAIL: <plain reason>`.
- `checkedOn` is a `YYYY-MM-DD` date: when the facts about language/library behaviour in the item were last verified.
- Debug drills are `ProblemSpec` objects (id `dbg-...`, `source: "other"`) run by the normal judge; `starter` is the buggy code
  that fills the editor. Examples and `tests` fail on the starter and pass on the fixed code.
- Table (migration, appended to `MIGRATIONS`):

```sql
CREATE TABLE drill_progress (
  item_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  solved_on TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  peeked INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0
);
```

  `schema.ts` `drillProgress`; `"drill_progress"` in `BACKUP_TABLES`; sync entry (single key `item_id`, cols all). XP
  once per item: easy 10, medium 20, hard 30, halved when the answer or solution was shown before solving. Drafts
  (your last code or query) go to `problem_notes` (`code`, `language`), check `lib/notes.ts` accepts drill ids.
- SQL comparison rules (`apps/web/lib/drills/sql-compare.ts`, pure): compare by column position, ignore column names;
  rows as a multiset unless `ordered`; numbers equal within 1e-6; `null` equals `null`; strings exact.
- SQL engine safety (`apps/web/lib/drills/sql-engine.ts`): one statement, must start with `SELECT` or `WITH`; reject
  `ATTACH`, `PRAGMA`, `VACUUM`, `load_extension`, any write keyword; fresh `:memory:` client per run (seed from
  `SQL_DATASETS[id].ddl`); at most 500 rows returned; run in a `worker_threads` worker with a 3 s limit so a runaway
  recursive query cannot freeze the server. If bundling the worker breaks `output: "standalone"` or the Electron server,
  fall back to refusing `WITH RECURSIVE` unless the drill sets `recursive: true` and note it in *Implementation notes*.
- Routes: `/dsa/drills` (hub: four tabs, progress per kind, cards), `/dsa/drills/[id]` (one drill; the page picks the
  workspace by `kind`), `POST /api/drills/sql/run`, `POST /api/drills/concurrency/run`; debug drills use the existing
  `/api/judge/run` (extend `specFor` in `route.ts` to resolve `dbg-` ids from `DRILL_SPECS`). All POST routes keep the
  same-origin check of the existing run routes.

## Steps

Step 0 first (one agent). Then agents A-D in parallel with disjoint files. Only the lead runs `pnpm check` and full
`pnpm test`. Everyone else: `pnpm exec vitest run <file>` and `pnpm -r typecheck`.

- [ ] **0. Foundation (one agent, about 0.75 day).**
  - `packages/shared/src/drills.ts` (types above, `DRILLS` registry assembled from the item files, `drillById`,
    `drillHref`, `DRILL_XP`), `packages/shared/src/drills/datasets.ts` with four datasets and their DDL + inserts
    (`company`: employees, departments, salaries, promotions; `shop`: customers, orders, order_items, products;
    `app`: users, logins, sessions, events; `social`: posts, follows, likes), 8-30 rows per table, designed so the 40
    SQL questions have non-trivial answers (ties, NULLs, a department with no employees, a customer with no orders).
  - `apps/web/lib/drills/sql-engine.ts` + `sql-compare.ts` + worker (see above), `apps/web/lib/drills/progress.ts`
    (`getDrillProgress`, `recordDrillSolved(id, {peeked})`), migration, sync, backup, `progress.ts` XP sum.
  - Routes `apps/web/app/dsa/drills/page.tsx` (hub, tabs per kind, empty list text), `apps/web/app/dsa/drills/[id]/page.tsx`
    (dispatch by kind, a plain "coming soon" panel per kind until the agents land theirs), the "Drills" link on
    `dsa/page.tsx`, one sample item per kind, in `packages/shared/src/drills/items-sample.ts`.
  - Done when: `pnpm exec vitest run packages/shared/src/drills.test.ts apps/web/lib/drills` passes (cases in step 5),
    `pnpm -r typecheck` passes, `/dsa/drills` lists the four sample items, `/dsa/drills/<sample-sql>` shows the panel.
- [ ] **1. Agent A: SQL workspace and SQL items 1-20.**
  - Files: `apps/web/app/dsa/drills/sql-workspace.tsx` (editor textarea with tab key and monospace, **Run** and
    **Check** buttons, schema panel from the dataset, your result table, "expected" table after Check, row/column
    mismatch message in plain words, hints, **Show solution** with the explanation), `apps/web/app/api/drills/sql/run/route.ts`,
    `packages/shared/src/drills/sql-items-a.ts` (sql-01 ... sql-20).
  - Topics for 1-20: select/filter/sort, joins (inner, left, anti-join), group by and having, distinct, case, string and
    date functions, subquery, correlated subquery, exists, union.
  - Context budget (read only this): this plan; `packages/shared/src/drills.ts`, `drills/datasets.ts`;
    `apps/web/lib/drills/sql-engine.ts`; the mockup.
  - Done when: each item's `solution` runs on its dataset and returns at least one row (tested), the workspace works with
    JS off for Run/Check (plain form post) and with JS on without a full reload, 390 px layout stacks.
- [ ] **2. Agent B: SQL items 21-40 and Predict the output.**
  - Files: `packages/shared/src/drills/sql-items-b.ts` (sql-21 ... sql-40: window functions (row_number, rank, dense_rank,
    lag/lead, running total), top-N per group, second highest, dedupe, self join, gaps and islands (light), pivot with case,
    median-ish with window, recursive CTE for an org chart), `packages/shared/src/drills/output-items.ts` (24 items:
    Java and Python mostly, C++ for 6: integer overflow, `==` on strings and boxed Integer, mutable default argument, late
    binding closures, evaluation order, `HashMap` iteration is not ordered (say "may print in any order" and make the
    question about a property that is guaranteed), copy vs reference, slicing, generator laziness, static init order,
    short-circuit, integer division and modulo of negatives, `String` immutability, `finally` return, sort stability,
    off-by-one in range), `apps/web/app/dsa/drills/output-workspace.tsx` (textarea answer, Check normalises whitespace and
    trailing newline, then shows the walkthrough; Show answer counts as peeked).
  - Every output snippet is deterministic. A test runs each snippet with the available tool (Java, Python, C++ via
    `resolve.ts`; skip cleanly when a tool is missing, like `solutions-verify.test.ts`) and checks the stored `answer`.
  - Context budget: this plan; `drills.ts`; `drills/datasets.ts`; `sql-engine.ts`; the mockup.
  - Done when: every SQL `solution` runs on its dataset, every output snippet's stored answer equals its real output
    where the tool exists, and the output workspace works.
- [ ] **3. Agent C: Concurrency.**
  - Files: `packages/shared/src/drills/concurrency-items.ts` (12 drills, `files` = starter, `reference` = a correct
    solution), `packages/shared/src/drills/harness.ts` (hidden harness per drill),
    `apps/web/lib/drills/concurrency-run.ts` (copies starter/user files + harness to `runJavaProject`, entry
    `DrillHarness`, `runs` repetitions inside the harness, `timeoutMs` to catch deadlock, returns the `PASS`/`FAIL` line),
    `apps/web/app/api/drills/concurrency/run/route.ts`, `apps/web/app/dsa/drills/concurrency-workspace.tsx` (reuses
    `project-editor.tsx` for files; harness files are never sent to the browser).
  - The 12: thread-safe counter, bounded blocking queue, producer-consumer with a poison pill, print in order with three
    threads, alternate print (ping-pong), read-write cache with `ReentrantReadWriteLock`, token-bucket rate limiter,
    thread-safe LRU cache, dining philosophers without deadlock, mini thread pool, double-checked locking singleton, a
    deadlock to find and fix (two accounts transferring).
  - Each drill: statement with the exact class and method signatures, the invariant the harness checks, 3 hints, an
    explanation of the bug in the starter and why the reference is correct. `java.util.concurrent` and `synchronized`
    only; Java 17.
  - Context budget: this plan; `drills.ts`; `apps/web/lib/judge/run-project.ts`; `apps/web/app/components/project-editor.tsx`;
    `apps/web/app/api/judge/run-project/route.ts`; the mockup.
  - Done when: a test (skipped without `javac`) shows for every drill that the **reference passes the harness 3 times
    in a row** and the **starter does not pass**; failure messages are plain sentences; a deadlocked solution returns
    "FAIL: timed out after N s (possible deadlock)" and does not hang the server.
- [ ] **4. Agent D: Find the bug.**
  - Files: `packages/shared/src/drills/debug-items.ts` (30 `DebugDrill`s with full `spec` incl. 4-8 tests and
    `starter` in Java and Python for all, C++ for 10), `apps/web/app/dsa/drills/debug-workspace.tsx` (statement, language
    switch, editor with the buggy starter, Run/Submit with the same result panel as the problem workspace; reuse
    `judge-panel.tsx` and the code editor, do not fork them), the `specFor` change in
    `apps/web/app/api/judge/run/route.ts`.
  - Bug types (about 3 each): off-by-one in a binary search, wrong loop bound, integer overflow (`mid = (l + r) / 2`),
    missing visited check (infinite loop), modifying a list while iterating, mutable default argument, shallow copy,
    wrong comparator (not a strict ordering), forgot to reset state between test cases, `==` vs `equals`, wrong base case,
    wrong heap order, unstable key in a map, pass-by-value surprise, uninitialised variable (C++), stale cache entry.
    Each statement says what the code should do and the symptom ("returns 5 for the second example"), never where the bug is.
  - Context budget: this plan; `packages/shared/src/judge/types.ts`; `apps/web/app/api/judge/run/route.ts`;
    `apps/web/app/judge-workspace.tsx` (how Run/Submit is wired); the mockup.
  - Done when: for every drill and language the **starter fails at least one test** and the **fixed code (kept in
    `bugs` as a diff description and in a `fixed` file used only by the test) passes all tests** (test skipped without tools).
- [ ] **5. Tests and lead pass.**
  - `packages/shared/src/drills.test.ts`: ids unique and prefixed by kind; every item has `statement`, 3 `hints`
    (2 for output), an `explanation`, a `checkedOn` date; every `dataset` exists; counts (40 SQL, 12 concurrency, 30 debug,
    24 output) once the agents are done.
  - `apps/web/lib/drills/sql-engine.test.ts`: runs a SELECT; refuses `DROP TABLE`, `PRAGMA`, `ATTACH`, two statements;
    caps rows; the worker times out on an endless recursive query.
  - `apps/web/lib/drills/sql-compare.test.ts`: order ignored unless `ordered`, number tolerance, null handling, column count.
  - `apps/web/lib/drills/progress.test.ts`: `:memory:` DB, solving twice pays XP once, peeked halves XP, backup contains the table.
  - Lead: browser check of the hub and one drill per kind at 1280 and 390 px, light and dark; `pnpm check`; Review.

## Acceptance criteria

- [ ] `/dsa/drills` lists 106 drills in four tabs with progress; Practice links to it.
- [ ] A SQL drill can be run, checked against the reference result, and solved; unsafe statements are refused with a plain message.
- [ ] A concurrency drill runs the learner's Java against a hidden multi-thread harness and reports pass or a plain failure reason;
      a deadlock times out instead of hanging.
- [ ] A debug drill opens with buggy code, runs with the normal judge, and passes after the fix.
- [ ] A predict-the-output drill checks the typed answer and shows the walkthrough.
- [ ] Solving a drill adds XP once; progress is in backups and sync.
- [ ] Code drills show the hosted "cannot run here" notice on hosted deployments; SQL drills work everywhere.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Estimate

- Step 0: about 0.75 agent-day (engine, worker, datasets, routes, migration).
- Agents A-D in parallel: A about 1.25 days (UI + 20 SQL), B about 1.25 days (20 SQL + 24 output), C about 1.5 days
  (12 harnesses are real work and need repeated verification), D about 1.25 days (30 bugs in 2-3 languages).
- Review and fixes: about 0.5 day.
- Total: about 3.5 calendar days at the current pace.
- Main risk: concurrency harnesses that pass by luck or fail by luck. Mitigation: invariants that are checkable
  without timing (counts, ordering logs), 20 repetitions inside the harness, reference must pass 3 runs in a row, and the
  starter must fail. Second risk: the SQL worker under standalone/Electron (fallback written above).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
