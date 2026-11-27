# Wave 1 of "content in the database": six agents in parallel

Lead: Claude Code. Plans: 0112 to 0119 (`docs/plans/`), overview `docs/architecture/content-in-db.md`.
Started 2026-11-23. This file is the work split for the first wave. Each agent reads **this file, its plan steps and
`AGENTS.md`**, nothing else is required.

Wave 1 builds the foundations that do not depend on each other. Wave 2 (seed + parity, read path, offline endpoints,
editor UI, notices UI) starts after the lead reviews wave 1.

## Already done by the lead (do not edit these files)

- `packages/shared/src/content-model/types.ts`: **the contract**. Every type the agents share. If you need a field
  that is not there, do not edit it: write the need in your notes file and work around it locally.
- `packages/shared/src/content-model/rev.ts` (+ test): `canonicalJson`, `sha256Hex`, `revOf` (sync, works in Node and
  browser).
- `packages/shared/src/content-model/index.ts`: barrel. The lead adds your exports after review. Import your sibling
  modules by relative path (`./types`, `./rev`), never through the barrel.
- `apps/web/lib/auth/admin-proof.ts`: `AdminProof` type and `mintAdminProof` (only `lib/auth/admin.ts` may call it).
- `packages/shared/src/index.ts`: already exports `./content-model`.

## Who does what

| Agent | Tool | Task | Plan steps | Owns (only these files may be created or edited) |
|---|---|---|---|---|
| C1 | Claude (Haiku) | Content inventory, templates, file → content mappers | 0112 steps 1–2 | `packages/shared/src/content-model/templates.ts`, `from-files.ts`, `to-spec.ts`, `lesson-map.ts`, their `*.test.ts` |
| C2 | Claude (Haiku) | Content DB: migrations, Drizzle schema, client, meta, write helpers, audit helper | 0112 steps 3–4, 0113 steps 2–3, 0115 step 1 columns | `apps/web/lib/content-db/**`, `.gitignore` (add `data/content.db*`), `apps/desktop/main.js` (one `CONTENT_DATABASE_URL` line) |
| C3 | Claude (Haiku) | Pure sync and notice logic | 0115 units/parts/merge/patch, 0115 snapshot validator, 0119 step 2, 0114 tag table | `packages/shared/src/content-model/units.ts`, `parts.ts`, `snapshot.ts`, `notices.ts`, `tags.ts`, their `*.test.ts` |
| AG1 | Antigravity | Admin guardrails (everything except the audit write and write-client split) | 0113 steps 1, 4, 5, 6 (no audit rows yet), 7, 8 (cases 1–5), 9 | `apps/web/lib/auth/admin.ts` (+test), `apps/web/lib/auth/session.ts`, `apps/web/app/admin/**`, `apps/web/app/api/admin/**`, `apps/web/lib/content-admin.ts`, `scripts/content.mjs`, `packages/sync-worker/src/profile.test.ts`, `packages/sync-worker/src/auth/routes.test.ts`, `docs/hosting.md`, `docs/hosted-architecture.md`, `docs/content-editing.md` |
| AG2 | Antigravity | Draft model, block operations, page Markdown format | 0116 step 1 | `packages/shared/src/content-model/draft.ts`, `page-markdown.ts`, their `*.test.ts` |
| AG3 | Antigravity | Content checks (port coverage rules) and AI prompt builders | 0117 step 2 (pure part only), 0118 step 1 | `packages/shared/src/content-model/verify.ts`, `house-rules.ts`, `admin-ai.ts`, their `*.test.ts` |

Notes per task:

- **C1** must not change any existing content file. `templates.ts` exports `TEMPLATES: Record<TemplateId, TemplateDef>`
  and `pageTemplate(id)` (not `templateFor`: that name is taken by `judge/templates.ts`); slots follow plan 0112 "Page format" and today's headings in `docs/content-editing.md`.
  `from-files.ts`: `problemFromSpec(spec, extra)` → `ContentProblem`. `to-spec.ts`: `specFromContent(p, stress?)` →
  `ProblemSpec` (exact judge fields). `lesson-map.ts`: `lessonFromFile(kind, id, value, ctx)` → `ContentLesson` and
  `lessonToShape(lesson)` → the original shape; `docFromFile(kind, id, value)` → `ContentDoc`. Section and block ids
  must be **deterministic** (for example `revOf([ownerId, slot, index])`), so re-seeding gives the same ids. Put the
  inventory table (0112 step 1) in your notes file.
- **C2** puts the 0115 `changes` columns (`parts_json`, `units_json`, `rev`, `note`, `notify`) into the **first**
  content migration (nothing has shipped yet). Write helpers take `ContentProblem`/`ContentLesson`/... from `types.ts`
  and a `parts: PartId[]` argument (default `["all"]`; C3 builds `diffParts`, wave 2 wires it). `getContentWriteDb(proof:
  AdminProof)` and `writeAudit(tx, proof, …)` import the type from `@/lib/auth/admin-proof`; tests create proofs with
  `mintAdminProof`.
- **C3**: `tags.ts` is the pure tag table from plan 0114 (`TAG`, `tagsFor`); it lives in shared instead of
  `apps/web/lib/content-repo/` so the browser can use it too. `units.ts` maps problems by `row.pattern`
  (`problems:other` when null), lessons by `row.courseId`.
- **AG1** leaves audit writes out (C2 builds `writeAudit` in parallel); add `// TODO(wave2): writeAudit` where a write
  happens and list them in notes. Keep `requireAdmin` working for existing callers.
- **AG2** tests must define their own small `TemplateDef`s; do not import `templates.ts` (C1 writes it in parallel).
- **AG3** ports rules from `packages/shared/src/learn/learn.test.ts`, `learn/order-audit.test.ts`,
  `learn/pattern-articles.test.ts`, `learn/design-depth.test.ts`, `judge/solutions.test.ts`, `judge/interview.test.ts`
  into `verifyContent(snapshot)` / `verifyEntity(entity, ctx)` over the `types.ts` shapes. **Do not delete or change
  the old tests** (that is 0117 later). Test with hand-built entities. `admin-ai.ts`: `buildAdminPrompt` and `modesFor`
  only (0118 step 1); parsers (0118 step 2) come in wave 2 because they need AG2's validation. Take the slot's
  `purpose`/`rules` from the `SlotDef` passed in; do not import `templates.ts`.

## Rules for every agent

1. Edit only the files you own (table above). If you need a change elsewhere, write it in your notes file.
2. Do not edit `types.ts`, `rev.ts`, `content-model/index.ts`, `packages/shared/src/index.ts`, any plan file, or this
   file. Do not touch `data/habit.db`.
3. Fast checks only: `pnpm exec vitest run <your test files>` and type checks. Type errors in files you do not own
   (another agent is mid-work) are not yours: ignore them and mention them in notes. **Never run `pnpm test`,
   `pnpm check` or `pnpm build`**; the lead runs `pnpm check` once after wave 1.
4. No `git commit`, `git push`, `git stash`, `git checkout`, `git reset` or branch changes.
5. Follow `AGENTS.md` conventions (local dates, no `Math.random()`/`Date.now()` in render, tests next to code,
   `:memory:` DBs, plain short comments).
6. When done, write `docs/plans/notes/wave1-<agent>.md` (for example `wave1-AG2.md`): files created or changed, test
   command and result, deviations from the plan and why, questions for the lead, anything found but not changed.

## Lead review log

- **C2 done (checked):** 22/22 tests pass, `apps/web` type check clean. Accepted: `problems.extra_json`,
  `block_code.ord`, a `zd_schema_version` table for remote DBs (untested against Turso; check on first deploy),
  loaders in `load.ts`, doc change id `kind:id`, loaders hide soft-deleted rows. Lead hardened `isAdminProof` (only
  minted proofs pass, via a WeakSet).
- **C3 done (checked):** 62/62 tests pass, shared type check clean, modules exported from the barrel. Accepted:
  `section:<id>` data is `{ page, section }`; `section-order:<slot>` data is the whole page layout; `asset:<id>` data
  is null (bytes come from the assets list); `mergeChanges` rule for delete then partial changes; `tagsFor` throws
  when `courseId`/`kind` is missing. Lead added optional `at` to `ChangeEntry`; wave 2 passes it to `noticesFrom`.
  Open for wave 2: `titles()` should receive the unit so a moved lesson gets the right `unitTitle`.
- **C1 done (checked):** 16 own tests, 81/81 across `content-model`, both type checks clean; main API exported from
  the barrel (helpers such as `md` stay internal, `md` would clash with `judge/generated/interview.ts`). All 486 problems
  and 287 pages round-trip. Accepted: empty optional lists kept as zero-block sections (seed and editor must keep
  them); LLD projects are docs `lld-project`; structured design/LLD fields in `meta` are fine. The "append code at the
  end" fallback never triggers today (every walkthrough has Brute force and Optimal sections). Decisions for wave 2:
  (1) the 496-entry roadmap list `PROBLEMS` in `dsa.ts` is list data: seed it as doc kind `dsa-problems` and fill
  `problems.pattern` from it where ids match; (2) the seed creates the `dsa-patterns` course row; (3) buddy copy stays in
  code. If AG2 also defines `validatePageAgainstTemplate`, keep C1's (templates.ts) and drop the duplicate.
- **AG1, AG2, AG3 done (checked).** All 25 test files of the six agents' areas pass (320 tests). AG2's
  `validatePageAgainstTemplate` duplicate is kept out of the barrel (C1's in `templates.ts` is the one). Draft,
  page-markdown, verify and admin-ai main APIs exported.
- **Lead fixes after review:**
  1. `apps/web/lib/content.test.ts`: removed the obsolete static-token test (AG1 removed `adminDenied`; access is now
     tested in `app/api/admin/content/route.test.ts`).
  2. Lint: `const` in `lib/content-db/write.ts:312` (C2); unused `afterEach` in `app/admin/admin.test.ts` and
     `notFound` in `lib/auth/session.ts` (AG1).
  3. Build failure `/admin: uncached or runtime data during prerendering` (AG1): the layout and the four admin pages
     awaited `requireAdminPage()` at the top of their default export, outside `<Suspense>`. Removed those top-level
     calls (each page's Suspense child already checks), moved the layout check into an `AdminGate` inside `<Suspense>`,
     and changed `guard.test.ts` to require that each page/layout file calls `requireAdminPage` in the component that
     renders its content.
  4. Removed a stray Vite cache folder `packages/shared/src/content-model/node_modules/.vite` (git-ignored).
- **`pnpm check`, 2026-11-23:** lint clean, typecheck clean, tests 2,581 passed / 20 skipped (197 files), build passed
  after fix 3 (the build was re-run alone after the fix; admin tests, typecheck and lint were re-run too).
- **Wave 1 status:** 0112 steps 1–4 done (seed + parity = wave 2); 0113 done except audit wiring (steps 2–3 helpers exist
  in `lib/content-db`, the `TODO(wave2): writeAudit` call sites need them); pure parts of 0114 (tags), 0115
  (units/parts/merge/patch/snapshot), 0116 step 1, 0117 step 2, 0118 step 1, 0119 step 2 done.
