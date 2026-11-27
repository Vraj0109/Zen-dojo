# Wave 2, round A, C5: content repository, cache tags, public read API, build content DB

Plans 0114 steps 2, 3, 6, 6b, 8 (step 4 to 5 are round B; step 7 test parts done here, except the fixture, which C4 wrote).

## Files (all created by C5)

- `apps/web/lib/content-repo/stress.ts`: `stressFor(id)` (judge stress lookup, see deviations).
- `apps/web/lib/content-repo/problems.ts`: `listProblemSummaries()`, `getProblem(id)`, `getProblemSpec(id)` (not cached, see deviations), `getSolutionPage(id)`.
- `apps/web/lib/content-repo/courses.ts`: `listCourses()` (course + lesson summaries), `getCourse(id)`, `getLesson(id)`.
- `apps/web/lib/content-repo/docs.ts`: `listDocs(kind)`, `getDoc(kind, id)`.
- `apps/web/lib/content-repo/version.ts`: `getContentVersionCached()` returns `{ version, schema }`.
- `apps/web/lib/content-repo/assets.ts`: `getAssetFile(id)` (uncached, see deviations).
- `apps/web/lib/content-repo/invalidate.ts`: `contentTagsFor(changes)`, `expireContentTagsInAction(changes)` (updateTag), `expireContentTagsInRoute(changes)` (revalidateTag with `{ expire: 0 }`).
- `apps/web/lib/content-repo/http.ts`: `serveVersioned(request, load)` (302 / 304 / 404 / immutable logic shared by the routes), `etagMatches`, `IMMUTABLE_CACHE`.
- `apps/web/lib/content-repo/tags.ts`: re-export of `TAG`, `tagsFor` from `@habit/shared` (the table itself is not in this folder).
- Routes: `apps/web/app/api/content/version/route.ts`, `problems/route.ts`, `problems/[id]/route.ts`, `courses/route.ts`, `courses/[id]/route.ts`, `lessons/[id]/route.ts`, `docs/[kind]/route.ts`, `docs/[kind]/[id]/route.ts`, `assets/[id]/route.ts`.
- Tests: `apps/web/lib/content-repo/content-repo.test.ts`, `invalidate.test.ts`, `tags.test.ts`; `apps/web/app/api/content/content-routes.test.ts`.
- `scripts/ensure-content-db.mjs`; `apps/web/package.json` (only the `prebuild` line added).
- `docs/development-performance.md`: new section 4 "Content caching".

## Test and check results

- `pnpm exec vitest run apps/web/lib/content-repo apps/web/app/api/content/content-routes.test.ts`: 4 files, 41 tests, all pass (about 2.4 s). The first run had 15 route failures, all from `connection()` throwing outside a request; the route test now stubs `next/server`'s `connection`.
- `cd apps/web && npx next typegen && npx tsc --noEmit`: clean for my files. One error remains in a file I do not own: `lib/content-sync/serve.ts(189,127): Property 'title' does not exist on type 'Pattern'` (C6's file, round A in progress).
- `pnpm lint` (apps/web): passes.
- `node --check scripts/ensure-content-db.mjs`: syntax ok. The script was NOT run (see below).
- Not run, by instruction: `pnpm test`, `pnpm check`, `pnpm build`. No git state changed. `data/habit.db` not opened. `data/content.db` not created.

## The `use cache` decision

- The directive is `'use cache: remote'` on every repo function, with `cacheLife("max")` and `cacheTag(TAG.content, <entity tag>)`.
- Why it is safe: `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheHandlers.md` says: "If you don't configure `cacheHandlers`, Next.js uses an in-memory LRU cache for both `default` and `remote`." The desktop standalone server and `next start` therefore use memory, as the plan wants. On Vercel the platform provides the shared handler.
- Risk to check in review: with self-hosted, multi-instance `next start` and no handler, each instance keeps its own memory copy. A write on instance A expires only A's copy; B keeps serving stale content for up to 30 days (`max`). Hosted must run on Vercel (or set `cacheHandlers`). Desktop is one process, so it is fine.
- Not verified: the real `next build` and `next start` behavior (I was not allowed to run a build). Cached functions are also not checked for prerender errors; `ensure-content-db` is needed for that.

## Deviations from the plan, and why

1. **`getProblemSpec` is not cached.** `ProblemSpec.stress` holds `StressCase` objects with a `make()` function, and a `'use cache'` entry cannot hold functions. It calls the cached `getProblem(id)` and adds the stress. Plan said "every function", this is the one exception.
2. **Stress lookup uses `JUDGE_PROBLEMS[id]?.stress`.** The barrel (`packages/shared/src/index.ts`) does not export `STRESS_CSES_RANGE`, `_TREE`, `_MATH`, `_GEO_STR`, `STRESS_LOGIC_C`, `STRESS_LOGIC_D`, so the judge's full chain cannot be rebuilt from the barrel. The judge loop in `judge/index.ts` attaches every set to `JUDGE_PROBLEMS[id].stress`, so this is the same data. See question 1.
3. **ETag = `revOf(body)`** for entities. For problems, lessons and docs this equals the stored `rev` (write.ts computes `rev = revOf(entity)`). For `courses/[id]` the body is the course plus lesson summaries, so its ETag is not the course row's rev (stronger, still correct). Lists use `"list-<version>"` (no single rev), and the version route uses `"v<version>-s<schema>"`.
4. **`listCourses()` returns outlines** (course row plus lesson rows, no pages). `getCourse(id)` also returns lessons. Plan's "course outlines" wording; this is that.
5. **`listProblemSummaries()` adds `kind`** (function or design) to the 0114 column list. It is a small enum, not a body. Ordered by `id`; round B decides the DSA list order.
6. **`getAssetFile()` is not cached in memory.** Assets are up to 1 MB and immutable (id = SHA-256); browsers and the CDN do the caching through the `immutable` header.
7. **Routes call `await connection()`** first (as `api/diagrams/[id]` does), so they stay dynamic under cacheComponents.
8. **`content` tag on every cached function.** The 0114 table says `content` covers everything. No invalidation path expires it yet (question 3).
9. **`ensure-content-db.mjs` writes to `data/content.db.tmp` and renames** at the end, so a crash cannot leave a half-filled `content.db`. It skips when `CONTENT_DATABASE_URL` is set or `content.db` exists. The fixture (`packages/shared/test/fixtures/content-mini.json`, now present from C4: 12 problems, 3 courses, 6 lessons, 16 docs, 1 asset) is loaded through the write helpers, actor `"fixture"`. It prints `content: using the test fixture (12 problems)`; without the fixture it warns and leaves an empty migrated DB.
10. **Route tests** stub `next/cache` and `next/server.connection`, since those cannot run outside Next. The `'use cache'` directive is a no-op under Vitest, so the repo tests run the functions as plain async code and check the tags through the stubbed `cacheTag`.

## Not run (please check in your review)

- `node scripts/ensure-content-db.mjs` was not executed, so the create path (migrations, fixture load, rename) is untested. It creates `data/content.db`, and I was told to run only the listed commands. Check by running `node scripts/ensure-content-db.mjs` once in a clean checkout (also check that `register-ts.mjs` resolves `apps/web/lib/content-db/*.ts`), then `pnpm build` with no env.
- Manual check from 0114 step 4 and 5 (content files renamed away): not part of round A (pages are round B).
- `curl -I` headers on a running server: not run. The route tests check the same headers.

## Questions for the lead

1. Please export a `stressFor(id: string): StressCase[] | undefined` from `packages/shared/src/judge/index.ts` (the same chain as the loop at lines ~92-106, including `STRESS_CSES_RANGE/TREE/MATH/GEO_STR`, `STRESS_LOGIC_C/D`). Then `apps/web/lib/content-repo/stress.ts` can use it, and it no longer depends on `JUDGE_PROBLEMS` (which 0117 will remove). I did not edit that file.
2. Public problem JSON (`/api/content/problems/<id>`) returns the whole `ContentProblem`, including test cases with `role: "test"` and their expected outputs. The repo already commits these in `packages/shared`, so this exposes nothing new. Confirm, or tell me to filter `role: "test"` out of the public route (the offline unit download in 0115 would then need its own route).
3. Who expires the `content` tag? A full import or snapshot apply (0115 step 5 / AG5) should call something like `expireContentTagsInRoute([{ entity: ..., ... }])` per entity or a new helper that expires `content` alone. I did not add one; say which you want.
4. The `serve.ts` type error (C6's file) above.

## Found but not changed

- `apps/web/lib/content-sync/serve.ts(189)`: `Pattern` has no `title` (C6 file; round A is still in progress for C6).
- `docs/plans/notes/` already had `wave1-*` notes; no change there.
