# 0112: Content database: schema, client and one-time seed from the repo files

- **Status:** in-progress (wave 1 done, see docs/plans/wave1-content-db.md)
- **Planned by:** Claude Code, 2026-11-23
- **Implemented by:** (implementer fills in)
- **Series:** content in the database, plans 0112 to 0119. Overview with diagrams: `docs/architecture/content-in-db.md`.
  Order: **0112** (this) → 0113 admin guardrails → 0114 read path and caching → 0115 offline copy and updates →
  0116 admin editor → 0117 cutover (delete the repo files) → 0118 AI prompt buttons → 0119 update
  notifications.

## Goal

Create a separate **content database** that holds every course, lesson, problem, test case, hint and solution, and a
command that fills it once from the files in `packages/shared/` exactly as they are today. Nothing the user sees changes
in this plan: the app still reads the files. A parity test proves the database holds the same content as the files, so
plan 0114 can switch reading over safely.

## Context

Decisions made with the user (2026-11-23):

- **One shared content database is the source of truth** for everyone: a new Turso database `zen-dojo-content`. The
  hosted site reads it directly. The desktop app and the offline web copy keep a downloaded copy (plan 0115).
- Admin edits go only to that database (plans 0113, 0116). After cutover (plan 0117) the content files are deleted.

What exists today:

- Content is TypeScript and Markdown in the repo, about 20 MB:
  - Problems: `packages/shared/src/judge/problems-*.ts` (486 `ProblemSpec`s, type in `judge/types.ts`), collected as
    `JUDGE_PROBLEMS` (`judge/index.ts`). Ownership groups in `judge/solution-groups.ts` list every spec file.
  - Java/Python optimal code and brute force code: `packages/shared/content/solutions/<id>.java|.py|.brute.cpp|.brute.java|.brute.py`,
    bundled by `pnpm solutions:build` into `packages/shared/src/judge/generated/solutions.ts` (`SOLUTIONS`, `BRUTE`).
    Read through `@habit/shared/solutions` (`solutionCode`, `bruteCode`, `solutionLangs`, `bruteLangs`).
  - Interview walkthroughs: `packages/shared/content/interview/<id>.md` (frontmatter `optimal:`, `brute:`), bundled into
    `judge/generated/interview.ts`. Shown by `apps/web/app/solution-walkthrough.tsx`.
  - Stress tests: `judge/stress*.ts`. **These are code** (`StressCase.make: () => unknown[]`), not data. They stay in
    the repo and keep being looked up by problem id. They are not moved, in any plan of this series.
  - Lessons and courses: `packages/shared/src/learn/*.ts` (78 files: `dsa-articles-*`, `design-depth-*`, `lld-*`,
    `designs-*`, …), `study.ts` (study areas, concept checklists), Markdown in `packages/shared/content/{core,lld,sd}`
    compiled by `pnpm content:build` into `learn/generated/`. Also `reading.ts`, `revise.ts` (quiz deck, key numbers),
    `cp-algorithms.ts`, `thinking-map.ts`.
- `apps/web/lib/db.ts` is the **user** database (per user on hosted, `habit.db` on desktop). It already has a
  `content_items` table (plan 0030) for single items added with `pnpm content:add`. That table is per user and is
  replaced by the content database (0117 removes it; do not touch it here).
- Hosted mode: `docs/hosted-architecture.md`. One Turso database per user, plus a control DB and the hub DB. The content
  DB is one more database (about 97 user databases remain under the free cap of 100).

Pitfalls:

- The content DB is **not** user data. Do not add its tables to `MIGRATIONS` in `lib/db.ts` or to `BACKUP_TABLES`.
  It has its own migration list and its own `PRAGMA user_version`.
- `getDb()` may resolve to a per-request guest DB on hosted. The content DB never goes through `getDb()`.
- Never touch `data/habit.db`. Local dev uses a new file `data/content.db` (git-ignored, add it to `.gitignore`).
- Do not reformat or "fix" content while seeding. The seed is a faithful copy. Content fixes happen in the admin editor
  later.

## Out of scope

- Switching any page or API to read from the content DB (plan 0114).
- Any admin UI or API (plans 0113, 0116). Offline download (0115).
- Deleting files or scripts (0117). Moving stress generators, templates (`judge/templates.ts`) or app logic such as
  `plan.ts`, `focus.ts`, `game.ts`: these are code and stay.
- User-installed content packs (`lib/packs.ts`, user DB tables): unchanged.

## Data model

All tables live in the content DB. `rev` is the first 16 hex characters of the SHA-256 of the entity's canonical JSON
(sorted keys) and changes whenever the entity changes. `deleted` is a soft-delete flag (0/1). Times are epoch ms.

| Table | Columns | Notes |
|---|---|---|
| `content_meta` | `k` TEXT PK, `v` TEXT | keys: `content_version` (integer as text), `schema_version`, `seeded_from` (git sha), `updated_at` |
| `courses` | `id` PK, `area`, `title`, `summary_md`, `ord`, `data_json`, `rev`, `updated_at`, `deleted` | one row per study area / course |
| `lessons` | `id` PK, `course_id` → courses, `ord`, `title`, `template`, `meta_json`, `rev`, `updated_at`, `deleted` | every page a learner reads: concept lessons, design walkthroughs, LLD answers, pattern guides, articles. `template` names the page layout (see "Page format"); `meta_json` holds non-text fields only (concept id, difficulty, tags) |
| `page_sections` | `id` TEXT PK (uuid), `owner_kind` (`lesson`/`problem`), `owner_id`, `slot`, `ord`, `title` | one heading-level part of a page, in a template slot (for example `overview`, `point:3`, `deeper`, `questions`, `statement`, `solution`) |
| `blocks` | `id` TEXT PK (uuid), `section_id` → page_sections, `ord`, `type` (`markdown`/`code`/`diagram`/`image`), `body` (Markdown text, or Mermaid source for a diagram, or alt text for an image), `caption`, `variant` (`brute`/`semi`/`optimal`/`custom`, code only), `label`, `time_complexity`, `space_complexity`, `asset_id` → assets | the ordered content of a section. Any number of any type, in any order |
| `block_code` | `block_id` → blocks, `lang` (`cpp`/`java`/`javascript`/`python`/`sql`/`text`…), `code`; PK (`block_id`, `lang`) | a code block holds one version per language, shown as language tabs |
| `assets` | `id` TEXT PK (sha256 of the bytes), `mime` (`image/png`/`image/jpeg`/`image/webp`), `bytes` BLOB, `width`, `height`, `created_at`, `created_by` | uploaded images, up to 1 MB each; no SVG (vector drawings are Mermaid diagram blocks) |
| `problems` | `id` PK, `source`, `title`, `difficulty`, `pattern`, `url`, `kind` (`function`/`design`), `constraints_json`, `input_format_md`, `output_format_md`, `fn_json`, `design_json`, `unordered` (0/1), `complexity`, `rev`, `updated_at`, `deleted` | one row per `ProblemSpec`; the statement and solution page are `page_sections` (see below) |
| `test_cases` | `id` INTEGER PK, `problem_id` → problems, `ord`, `role` (`example`/`test`), `input_json`, `output_json`, `explanation_md` | examples first, then tests, in today's order |
| `hints` | `problem_id` → problems, `ord`, `body_md`; PK (`problem_id`, `ord`) | |
| `docs` | `kind`, `id`, `body_json`, `rev`, `updated_at`, `deleted`; PK (`kind`, `id`) | only list-like data that is not a page: reading list, revise deck, key numbers, thinking map, cp-algorithms index. `kind` values are listed in step 1 |
| `changes` | `version` INTEGER PK AUTOINCREMENT, `entity` (`course`/`lesson`/`problem`/`doc`), `entity_id`, `op` (`upsert`/`delete`), `at`, `actor` | one row per changed entity; feeds offline updates (0115) |
| `admin_audit` | `id` INTEGER PK, `at`, `actor_id`, `actor_name`, `action`, `entity`, `entity_id`, `before_json`, `after_json`, `request_id` | created now, written from plan 0113 on |

A problem's statement and its solution page are `page_sections` with `owner_kind = "problem"` (slots `statement` and
`solution`), so a statement can also hold a diagram or an image, and a solution page is any mix of text, code and
diagram blocks. Problem fields the judge needs (signature, test cases, hints) stay in their own columns and tables.

### Page format: templates, slots and blocks

Today the format of a page is fixed by its TypeScript shape (`Lesson`, `Walkthrough`, `LldGuide`, `Section` in
`packages/shared/src/learn/types.ts`) and by the fixed Markdown headings in `docs/content-editing.md` (`## Overview`,
`## What to know`, `## Go deeper`, `### <title> {point: N}`, one Mermaid block then one code block per section). In the
database the same format is kept by three layers:

1. **Template** (in code, `packages/shared/src/content-model/templates.ts`): for each page kind (`concept`, `design`,
   `lld`, `pattern`, `article`, `problem`) the list of **slots** in display order, each with its heading, whether it
   is required, whether it repeats (Go deeper has many sections), and which block types it allows. Example for
   `concept`: `overview` (1 section), `point:N` (one per checklist point in `study.ts`, required), `recap` (optional),
   `deeper` (0..n sections, each with a title), `questions` (list), `mistakes` (optional list). For `problem`:
   `statement`, `solution`. The page renderer walks the template, so headings are always in the right place and in
   the right order, whatever the admin does inside a slot.
2. **Section**: one heading-level part inside a slot (`page_sections`). Repeating slots have many, each with a title.
3. **Blocks**: the content of a section, in order. Any number of Markdown, code, diagram (Mermaid) and image blocks,
   in any order. The old rule "prose, then at most one diagram, then at most one code block" goes away.

The seed (step 5) turns each existing shape into this form without changing what the reader sees: a `Section` with
`body`, `diagram` and `code` becomes one section with a Markdown block, a diagram block and a code block, in that
order; `explain[i]` becomes the section in slot `point:i`; a walkthrough's `deepDives` become `deeper` sections; and
so on. The parity test compares the rendered model (step 6).

A problem's or lesson's whole page (row + sections + blocks + code, and for problems the test cases and hints) is one **entity** for `rev`, `changes` and caching.
Test cases, hints and blocks have no `rev` of their own.

`content_version` = the highest `changes.version`. The seed writes one `changes` row per entity, so after the seed the
version is the number of entities.

## Steps

- [ ] **1. Inventory the content.** Make a table in *Implementation notes*: every exported content constant in
  `packages/shared/src` (grep `export const` in `judge/problems-*.ts`, `learn/*.ts`, `study.ts`, `reading.ts`,
  `revise.ts`, `cp-algorithms.ts`, `thinking-map.ts`, generated files), its TypeScript type, how many items, and which
  table it maps to (`courses`, `lessons` with which `template`, `problems`, or `docs` with which `kind`). Anything a
  learner reads as a page (concept lessons, design walkthroughs, LLD answers, pattern guides, articles) is a lesson;
  only list data is a doc. Fix the template list and the `docs.kind` list here (for example `reading`,
  `revise-deck`, `key-numbers`, `thinking-map`, `cp-algorithms`).
  - Done when: every content constant has a row, and nothing in the list is a function (functions stay in code: say so
    for each one you skip).
- [ ] **2. Shared types and pure mappers.** New folder `packages/shared/src/content-model/` (export it from
  `src/index.ts`):
  - `types.ts`: `CONTENT_SCHEMA_VERSION = 1`, row types (`CourseRow`, `LessonRow`, `ProblemRow`, `TestCaseRow`,
    `HintRow`, `SectionRow`, `BlockRow`, `BlockCodeRow`, `AssetRow`, `DocRow`), the assembled views `ContentPage`
    (`sections[]` each with `blocks[]`, code blocks with `code{lang: text}`), `ContentProblem` (`row + cases + hints +
    statement: ContentPage + solution: ContentPage`) and `ContentLesson` (`row + page`). Also `templates.ts` (see
    "Page format") with `validatePageAgainstTemplate(template, page)`.
  - `rev.ts`: `canonicalJson(value)` (sorted keys, no spaces) and `revOf(value)` (SHA-256, 16 hex). Use Web Crypto
    or a pure SHA-256 so it runs in Node and the browser; tests pin two known values.
  - `from-files.ts`: `problemFromSpec(spec, extra)` where `extra` = `{ java?, python?, brute?: {cpp?,java?,python?},
    interviewMd?, bruteSame? }` → `ContentProblem`. Solution sections and blocks are built so the Solution tab shows the same thing
    in the same order as today (read `apps/web/app/solution-walkthrough.tsx`): Markdown blocks from the walkthrough
    sections (split on `## ` headings, frontmatter dropped), a `code` block `variant: "brute"` label "Brute force" after
    the brute-force section (none when `brute: same`; keep the "already optimal" sentence as Markdown), and a `code`
    block `variant: "optimal"` label "Optimal" with `cpp` from `spec.solution.cpp`, plus `java`/`python` when present.
    `spec.solution.idea` and `complexity` become a Markdown block and `problems.complexity`. Problems without a
    walkthrough get: idea block, optimal code block.
  - `to-spec.ts`: `specFromContent(p: ContentProblem, stress?)` → the `ProblemSpec` the judge expects today (inverse of
    the above for the judge fields). Plan 0114 uses it.
  - Same pair for lessons: `lessonFromFile(kind, value)` maps each `learn/` shape to its template's slots, sections and
    blocks (see "Page format"), and `lessonToShape(lesson)` maps it back so today's renderers can be reused while 0114
    switches pages over. `docFromFile(kind, value)` keeps list data as `body_json`, so that round trip is exact.
    The statement becomes the `statement` page (one Markdown block per paragraph group, as today).
  - Done when: `pnpm exec vitest run packages/shared/src/content-model` passes (step 6 tests).
- [ ] **3. Content DB client and migrations.** New folder `apps/web/lib/content-db/` (all files `import "server-only"`
  except pure helpers):
  - `migrations.ts`: `CONTENT_MIGRATIONS: string[]`, first entry creates every table above with the indexes
    `test_cases(problem_id, ord)`, `page_sections(owner_kind, owner_id, slot, ord)`, `blocks(section_id, ord)`, `changes(entity, entity_id)`,
    `admin_audit(entity, entity_id, at)`. Same rules as `lib/db.ts`: append-only, tracked by `PRAGMA user_version`.
  - `schema.ts`: Drizzle tables for the above.
  - `client.ts`: `getContentDb()` returns a cached libSQL + Drizzle client (cache on `globalThis.habitContentDb`, like
    `habitDb`). URL: `CONTENT_DATABASE_URL`, else `file:<repo>/data/content.db` when not desktop, else (desktop) the
    `CONTENT_DATABASE_URL` that `apps/desktop/main.js` sets to `<app-data>/content.db` (add that line to `main.js`
    next to `DATABASE_URL`; honour `HABIT_DATA_DIR`). Token: `CONTENT_DATABASE_AUTH_TOKEN` when set. Runs pending
    `CONTENT_MIGRATIONS` once per process. `libsql://` → `https://` like `lib/hosted/control.ts` does.
  - `meta.ts`: `getContentVersion(db)`, `getSchemaVersion(db)`.
  - Done when: a test opens `:memory:`, runs migrations twice (second run does nothing), and lists the tables.
- [ ] **4. Write helpers.** `apps/web/lib/content-db/write.ts`: `upsertProblem(tx, p: ContentProblem, actor)`,
  `upsertLesson`, `upsertCourse`, `upsertDoc`, `softDelete(tx, entity, id, actor)`, and `putAsset(tx, bytes, mime,
  actor)` (id = sha256, so the same image uploaded twice is stored once; assets are referenced by blocks and are not
  entities of their own). Each one: computes `rev`; if equal
  to the stored `rev`, does nothing and returns `{ changed: false }`; otherwise replaces the entity's child rows
  (delete + insert for cases, hints, sections, blocks, block code) inside the transaction, inserts one `changes` row, and updates
  `content_meta.content_version` and `updated_at`. Callers pass an open transaction (`db.transaction(async (tx) => …)`).
  - Done when: writing the same problem twice adds one `changes` row, and changing one hint adds a second.
- [ ] **5. Seed command.** `scripts/content-seed-db.mjs`, wired as `"content:seed-db"` in the root `package.json`
  (same `node --import ./scripts/lib/register-ts.mjs` prefix as the other content scripts). It imports the current
  shared exports, maps them with step 2, and writes them with step 4 (actor `"seed"`) in batches of 50 entities per
  transaction. Flags: `--url <libsql url>` and token from `CONTENT_DATABASE_AUTH_TOKEN` (hosted DB), default the local
  `data/content.db`; `--dry-run` prints counts only. It sets `content_meta.seeded_from` to `git rev-parse HEAD`.
  Re-running is safe (unchanged entities are skipped by `rev`). It prints counts per table and the final version.
  - Done when: `pnpm content:seed-db` on an empty `data/content.db` prints 486 problems and the counts from step 1, and
    a second run prints "0 changed".
- [ ] **6. Tests.**
  - `packages/shared/src/content-model/content-model.test.ts`: `revOf` is stable under key order; `problemFromSpec`
    for three fixed problems (one with `brute: same`, one design problem, one with Java/Python/brute in all three
    languages) gives the expected block order and labels; `specFromContent(problemFromSpec(spec))` deep-equals the
    judge fields of `spec` (statement, constraints, fn, design, examples, tests, hints, solution.cpp, unordered).
  - `apps/web/lib/content-db/seed.test.ts` (**parity**, the key test of this plan): seed every problem, lesson, course
    and doc into `:memory:`, read each back, and compare to the files: for all 486 problems, `specFromContent` equals
    the file spec; `solutionCode`/`bruteCode` for every language equal the code in the blocks; every lesson round-trips through `lessonFromFile` / `lessonToShape` to the same shape, and
    every doc round-trips exactly. Print the first 5 mismatches on failure. Mark it so it runs in `pnpm test` but does not compile
    or run code.
  - `apps/web/lib/content-db/write.test.ts`: step 4 cases, soft delete adds an `op: "delete"` change.
  - Done when: `pnpm exec vitest run packages/shared/src/content-model apps/web/lib/content-db` passes, then
    `pnpm check` once at the end.
- [ ] **7. Docs.** `docs/hosting.md`: add `CONTENT_DATABASE_URL` and `CONTENT_DATABASE_AUTH_TOKEN` to the variable
  table, and a "Create the content database" step to the first-deploy checklist (create `zen-dojo-content` in the same
  Turso group, create a full-access token for seeding, run `pnpm content:seed-db --url …`). Note the database count in
  `docs/hosted-architecture.md` "Limits".
  - Done when: both docs mention the content DB.

## Acceptance criteria

- [ ] `pnpm content:seed-db` fills an empty local `data/content.db`; a second run changes nothing.
- [ ] The parity test passes for all 486 problems and every lesson, course and doc.
- [ ] The app looks and behaves exactly as before (no page reads the content DB yet).
- [ ] `data/content.db` is git-ignored; `data/habit.db` was never opened.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
