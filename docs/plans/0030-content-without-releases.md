# 0030: Add or fix one problem, test case or lesson without changing code

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** Claude Code, agent D (branch agent/d-lld), 2026-11-09
- **Spec:** none (builds on packs v2, 0024; prepares the hosted site in 0032)

## Goal

Adding a single question, a few extra test cases, a lesson or a reading link is one command or one dropped file, for the desktop
app, the local web app and later a hosted copy. No new app version, no TypeScript edit. The same content can live in a remote
database. The built-in content stays as it is; stored content is added on top of it and wins where ids match.

## Context

- Built-in content is TypeScript in `packages/shared/src/` (problems, designs, projects) and Markdown compiled to
  `learn/generated/lessons.ts` (`docs/content-editing.md`). Changing it needs a rebuild and a release.
- Packs v2 (0024) already store content in the database (`content_packs`, `pack_progress`; `lib/packs.ts`: `installPack`, `getPackProblemSpec`,
  `getAddedItems`, lesson patches with `resolveLesson`, feeds) and a pack is **all or nothing**: you ship a whole JSON pack, not one
  item. There is no way to add a test case to a built-in problem.
- The database layer is libSQL (`apps/web/lib/db.ts`, `createClient({ url })`); `DATABASE_URL` can already be a `libsql://` address, but
  `authToken` is not passed, so a hosted Turso database cannot be used yet.
- User data (tasks, solves, notes, runs, progress) must stay separate from content so a hosted site can keep one content database for
  everyone and one progress row set per user (0032).

## Out of scope

- Accounts, hosting, sync (0032).
- Moving every built-in problem and lesson into the database (the new layer makes it possible; `content:seed` below is optional).
- A visual editor in the app.

## Design

A **content item** is one JSON document with a `type`. Types, all from packs v2 where they exist:
`problem` (full spec), `tests` (**new**: extra cases appended to any problem, built-in or stored), `lesson`, `patch` (replace a built-in
lesson), `reading` (**new**: one reading-list entry), `design` and `project` (as in packs v2).
Items live in one table `content_items`: `id TEXT PRIMARY KEY` (`<type>:<target-id>`), `type`, `body` (JSON text), `rev` (integer, the
SHA-256 prefix of the body as a number is fine, or a counter), `source` ("local", "feed:<name>", "cli"), `updated_at`, `deleted` (0/1).
A tiny content **repository** (`apps/web/lib/content.ts`) is the only place that merges built-in and stored content:
`getProblem(id)`, `listAddedProblems()`, `getExtraTests(problemId)`, `resolveLesson(id)` (existing) and so on. Everything that reads
content goes through it. Packs keep working: installing a pack writes its items here with `source = "pack:<id>"`.

## Steps

- [x] **1. Table and repository.** Migration (you are the only agent allowed to add one this round): `content_items` as above, plus an
  index on `type`. `schema.ts` entry, add `"content_items"` to `BACKUP_TABLES`. `lib/content.ts`: `upsertItem(item, source)`,
  `deleteItem(id)`, `listItems(type?)`, `getItem(id)`; validation reuses the pack validators in `packages/shared/src/packs.ts` (extend with
  `tests` and `reading`, plain error messages that name the field).
  - Done when: a fresh database has the table, a backup round-trip keeps rows, an invalid item is refused with a clear message.
- [x] **2. (partly: not in the /dsa list, see notes) Stored problems appear everywhere built-in ones do.** `/dsa` list (group "Added by you", or the group named in the item), the
  problem page, `/api/judge/run` (spec lookup through the repository), pattern pages when the item has `patterns`. Ids `x:<id>`.
  - Done when: a stored problem can be opened, run and marked done, and shows in the list without a rebuild.
- [x] **3. Extra test cases for existing problems.** A `tests` item `{ type: "tests", problem: "lc-1", cases: [{ input, output? }] }`: appended
  to the problem's cases at run time (built-in or stored). If `output` is missing the app can still add the case when run through the CLI
  (step 5), which computes it with the problem's C++ reference solution (same code as `pack:build`) and stores the output.
  - Done when: adding a case that the reference answers differently from a wrong solution makes that solution fail, and removing the item
    restores the old behaviour.
- [x] **4. (reading is stored and listed only, see notes) Lessons and reading.** Stored `lesson`, `patch` and `reading` items show in Learn exactly like pack items do (reuse the packs v2 code
  paths; do not duplicate them).
  - Done when: a stored lesson appears in the chosen area and section and a stored patch replaces the built-in text with a "Back to built-in" button.
- [x] **5. Admin API and CLI.** `POST/GET/DELETE /api/admin/content` (`apps/web/app/api/admin/content/route.ts`): requires
  `Authorization: Bearer <CONTENT_ADMIN_TOKEN>`; with no env var the route answers 404; in the desktop app it only accepts 127.0.0.1.
  Scripts (Node, plain `.mjs`, plain-language errors): `pnpm content:add <file.json>` (adds one item or a list; computes missing outputs),
  `pnpm content:sync <folder>` (upserts every `*.json` in a folder; unchanged files are skipped by rev; `--prune` deletes items whose file is
  gone), `pnpm content:list`, `pnpm content:remove <id>`, `pnpm content:export <file>`. Each takes `--url <app> --token <t>` to talk to
  a running or hosted app, or writes straight to the local database when neither is given (then refuses if the app's own database file is
  the real `data/habit.db` unless `--yes`).
  - Done when: `pnpm content:add docs/examples/one-problem.json` makes the problem appear after a page reload, with no restart or build.
- [x] **6. Remote database.** `lib/db.ts`: pass `DATABASE_AUTH_TOKEN` as `authToken` when set. Document in `docs/hosting.md` (short): `DATABASE_URL=libsql://<db>.turso.io`,
  `DATABASE_AUTH_TOKEN=...`, how migrations run on first start, what stays local on the desktop. Add a unit test that `databaseUrl()`/client
  options pick up the token (no network).
  - Done when: the app starts against a `file:` URL as before and the code path for `libsql://` + token is tested with a stub.
- [x] **7. Optional seed.** `pnpm content:seed` writes every built-in problem spec as a `problem` item with `source = "builtin"` (so a hosted
  copy can have all content in one database and later drop the TypeScript bundle). Do not run it in `pnpm check`.
  - Done when: the command works against `:memory:`, and the repository prefers a stored item over the shipped one with the same id.
- [x] **8. Agent guide and examples.** Update `docs/content-editing.md` and `docs/content-packs.md`: a section "Add one thing" with one complete
  example per type in `docs/examples/` (`one-problem.json`, `extra-tests.json`, `one-lesson.json`, `one-reading.json`), the exact
  commands, and the prompt for any agent: "Read docs/content-editing.md, then add <thing> using pnpm content:add". Link from `AGENTS.md`.
  - Done when: someone with only that page can add a problem and a test case.
- [x] **9. Tests.** `content.test.ts` (`:memory:`): upsert, delete, merge order, tests append, validation errors, backup; a route test for the admin
  API (token, 404 without it); a script test for `content:sync` on a temp folder. No per-problem loops.
  - Done when: `pnpm check` passes.

## Acceptance criteria

- [ ] One command adds a problem, extra tests for an existing problem, a lesson or a reading link; no code change, build or release.
- [ ] Built-in content is untouched; stored content wins on equal ids; removing it restores the built-in.
- [ ] The app can use a remote libSQL database through two environment variables.
- [ ] Packs from 0024 still work.
- [ ] `pnpm check` passes.

## Open questions

- Should `content:sync` talk to the app by default or write to the database directly? (Plan: directly for a local database, through the API with
  `--url` for a running or hosted app.)

## Implementation notes

Done by agent D on `agent/d-lld`, 2026-11-09.

- **Table and repository (step 1).** Migration 15 `content_items` (id, type, body, rev, source, updated_at, deleted) + index on `type`;
  `schema.ts` entry; `"content_items"` in `BACKUP_TABLES` (round-trip tested). `apps/web/lib/content.ts` is the repository: `upsertItem`,
  `deleteItem` (soft delete), `listItems`, `getItem`, `getExtraTests`, `withExtraTests`, `resolveProblemSpec`, `listReading`,
  `seedBuiltinProblems`. Validation is `validateItem` in `packages/shared/src/content-items.ts`: `problem`, `lesson` and `patch` are
  validated by the existing pack validator on a one-item pack (no second set of rules); `tests` and `reading` are new.
- **Reuse of packs v2 (steps 2 and 4).** Stored problems, lessons and patches are kept in one pack with id `items`, rebuilt from the
  table after every change (`syncItemsPack` calls `installPack`). So they show in Learn as the course "Added items", problems run as
  `pack:items:<id>` through the existing Run-button path and mark progress, patches use `resolveLesson` and "Back to built-in". No pack code was
  duplicated. If the rebuild is refused (for example a Mermaid error), the row is rolled back and the message is returned.
- **Extra tests (step 3).** `tests:<problem>` items are appended to the problem's cases in `/api/judge/run` (the route now calls
  `resolveProblemSpec`); works for built-in and stored problems; the shipped spec is never mutated; deleting the item restores the old tests.
  Missing outputs are computed by `content:add` / the admin API from the problem's C++ reference solution (`computeOutputs`, same code as `pack:build`).
- **Admin API and CLI (step 5).** `/api/admin/content` GET/POST/DELETE, 404 without `CONTENT_ADMIN_TOKEN`, 401 for a wrong bearer token
  (constant-time compare); the desktop server already listens on 127.0.0.1 only. `scripts/content.mjs` with `content:add|sync|list|remove|export|seed`
  (package.json). Default is the local database (asks for `--yes` for the real `data/habit.db`), `--url/--token` uses the API.
- **Remote database (step 6).** `clientOptions()` in `lib/db.ts` passes `DATABASE_AUTH_TOKEN` as `authToken`; unit tested without a network; `docs/hosting.md`.
- **Seed (step 7).** `content:seed` stores every built-in function problem with source `builtin`; a stored `builtin` item wins over the shipped
  spec in `resolveProblemSpec`; seeding never overwrites an item you added. Seeded items are not turned into a course.
- **Docs (step 8).** `docs/content-editing.md` "Add one thing", four examples in `docs/examples/`, pointer in `docs/content-packs.md`, link in `AGENTS.md`.
- **Tests (step 9).** `apps/web/lib/content.test.ts` (in memory): upsert/replace/delete, validation messages, stored problem as pack problem,
  extra tests on built-in and stored problems, seed precedence, backup round trip, admin token check, client options, and `content:sync` run in a child
  process on a temp database (skip unchanged, `--prune`). Commands were also run by hand against a copy: all four examples were added, the missing
  outputs of `extra-tests.json` were computed by the C++ reference.
- **Not done / deviations (open for the main session):**
  1. Stored problems do **not** appear in the `/dsa` list or on pattern pages: they appear in Learn as the "Added items" course. That list lives in
     `app/dsa/**` (agent B's files this round) and `lib/dsa.ts` would need a group of added problems; I did not touch it.
  2. `reading` items are stored, listed (`content:list`) and exported, but the reading page (`/study/reading`, not in my row) does not show them yet.
  3. The route test covers the token check (`adminDenied`) and not a full request through the Next handler.
  4. Problems added this way keep pack semantics: ids are `pack:items:<id>`, not `x:<id>`.

## Review
