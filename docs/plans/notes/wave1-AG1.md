# Wave 1 Implementation Notes: Agent AG1

- **Task**: Admin guardrails (Plan 0113, steps 1, 4, 5, 6, 7, 8 cases 1–5, 9)
- **Status**: Completed

---

## 1. Files Created and Changed

### Files Created:
- `apps/web/lib/auth/admin.ts`: Unified admin module with `isAdminClaims`, `requireAdminPage`, `requireAdminAction`, `requireAdminRequest`, and `AdminDeniedError`. Uses `mintAdminProof` from `admin-proof.ts`.
- `apps/web/lib/auth/admin.test.ts`: Tests for `isAdminClaims` truth table, `requireAdminRequest` (401/403/CSRF/success), `requireAdminPage`, and `requireAdminAction`.
- `apps/web/app/admin/guard.test.ts`: TypeScript compiler API static audit enforcing that every `"use server"` function calls `requireAdminAction` first, route handlers call `requireAdminRequest` first, and default exports in pages/layouts call `requireAdminPage`.
- `apps/web/app/api/admin/content/route.test.ts`: Route tests for anonymous (401), non-admin (403), disallowed admin (403), and authorized admin (200).
- `docs/plans/notes/wave1-AG1.md`: This notes document.

### Files Modified:
- `apps/web/lib/auth/session.ts`: Updated `getSession` and `doRefresh` to delegate admin determination to `isAdminClaims`. Preserved `requireAdmin` as a thin wrapper calling `requireAdminPage`.
- `apps/web/app/admin/layout.tsx`: Removed `isHosted()` gates (`HostedGate` and `isHosted` in `AdminNav`). Converted `AdminLayout` default export to async calling `requireAdminPage()`.
- `apps/web/app/admin/page.tsx`: Updated `Dashboard` and default export to call `requireAdminPage()`.
- `apps/web/app/admin/problems/page.tsx`: Updated `ProblemsTable` and default export to call `requireAdminPage()`.
- `apps/web/app/admin/study/page.tsx`: Updated `StudyTables` and default export to call `requireAdminPage()`.
- `apps/web/app/admin/study/[area]/[id]/page.tsx`: Updated `Editor` and default export to call `requireAdminPage()`.
- `apps/web/app/admin/actions.ts`: Exported server actions now call `requireAdminAction()` first, catching `AdminDeniedError` and returning `{ ok: false, errors: ["Not allowed."] }`.
- `apps/web/app/admin/study-actions.ts`: Exported server actions now call `requireAdminAction()` first, catching `AdminDeniedError` and returning `{ ok: false, errors: ["Not allowed."] }`.
- `apps/web/app/admin/admin.test.ts`: Updated action tests to verify `requireAdminAction` failure returning `{ ok: false, errors: ["Not allowed."] }`.
- `apps/web/app/admin/study.test.ts`: Updated action tests to verify `requireAdminAction` failure returning `{ ok: false, errors: ["Not allowed."] }`.
- `apps/web/app/api/admin/content/route.ts`: Replaced `adminDenied` with `requireAdminRequest`. Added `// TODO(wave2): writeAudit`.
- `apps/web/lib/content-admin.ts`: Deleted obsolete `adminDenied` and `CONTENT_ADMIN_TOKEN` references.
- `scripts/content.mjs`: Removed `CONTENT_ADMIN_TOKEN` fallback; now requires `--token <access token>` for `--url` mode.
- `packages/sync-worker/src/profile.test.ts`: Added test verifying profile PUT ignores/rejects admin/role fields and subsequent tokens have `adm: false`.
- `packages/sync-worker/src/auth/routes.test.ts`: Added test verifying user upsert ignores extra fields from GitHub and `adm` strictly follows `ADMIN_USER_IDS`.
- `docs/hosting.md`: Updated `--url` docs to mention access token; removed `/admin` 404 from "Not available hosted".
- `docs/hosted-architecture.md`: Added "Admins" section; removed `/admin` 404 from "Not available hosted".
- `docs/content-editing.md`: Updated `--url` docs to use `--token <access token>` and removed references to `CONTENT_ADMIN_TOKEN`.

---

## 2. Test Commands and Results

Fast check suite:
```
pnpm exec vitest run apps/web/lib/auth apps/web/app/admin apps/web/app/api/admin packages/sync-worker/src/profile.test.ts packages/sync-worker/src/auth/routes.test.ts
```
Result:
```
Test Files  9 passed (9)
     Tests  139 passed (139)
  Duration  2.70s
```

Typecheck checks:
- `npx tsc --noEmit -p apps/web/tsconfig.json`:
  - `apps/web/lib/auth/admin.ts`, `session.ts`, `app/admin/**`, `app/api/admin/**`: 0 errors.
  - Found error in unowned file `apps/web/lib/content.test.ts(8,10)` importing removed `adminDenied` (see section 5).
- `npx tsc --noEmit -p packages/sync-worker/tsconfig.json`:
  - `profile.test.ts`, `routes.test.ts`: 0 errors.
  - Existing errors in unowned files `guard.test.ts` and `index.test.ts`.

---

## 3. Places Where Admin Writes Occur (`// TODO(wave2): writeAudit`)

As instructed for wave 1 (steps 2 & 3 deferred to wave 2 / agent C2), `// TODO(wave2): writeAudit` comments have been placed at every write callsite:
1. `apps/web/app/admin/actions.ts:117` in `save()` before `upsertItem(built.item, "admin")`
2. `apps/web/app/admin/actions.ts:175` in `deleteProblemAction()` before `deleteItem("problem:" + id)`
3. `apps/web/app/admin/study-actions.ts:22` in `saveLessonAction()` before `upsertItem(built.item, "admin")`
4. `apps/web/app/admin/study-actions.ts:40` in `revertLessonAction()` before `deleteItem("patch:" + concept)`
5. `apps/web/app/api/admin/content/route.ts:32` in `POST()` before `addItems(body)`
6. `apps/web/app/api/admin/content/route.ts:42` in `DELETE()` before `deleteItem(id)`

---

## 4. Promotion Safety Audit (Step 7)

A search across `apps/web/app`, `apps/web/lib`, and `packages/sync-worker/src` for `adm\b|admin:|role` verified that no caller or client request body can grant or elevate privileges:
- `packages/sync-worker/src/profile.ts`: Uses `sanitizePortfolio`, strictly allowlisting fields. Rejects unknown keys (`admin`, `adm`, `role`) with 400.
- `packages/sync-worker/src/auth/oauth.ts`: Upserts only `github_id`, `name`, `avatar_url` into the `users` table. The `adm` claim in the access token is computed purely from `env.ADMIN_USER_IDS` via `isAdmin(env, user.id)`.
- `apps/web/app/auth/callback/route.ts`: Sets browser cookies (`zd_at`, `zd_rt`, `zd_u`) from the hub exchange; does not write to any admin table or role column.
- `apps/web/app/api/ai/*` & `buddy-chat`: Mentions of `role` are exclusively LLM message roles (`"user" | "assistant" | "system"`).
- `apps/web/app/admin/*`: ARIA attributes (`role="dialog"`, `role="status"`).
- `apps/web/app/api/sync/*`: Syncs user solves, task checklists, and study progress. The schema contains no `role` or `admin` column.

---

## 5. Deviations from the Plan & Questions for the Lead

- **Unused import in `apps/web/lib/content.test.ts`**:
  `apps/web/lib/content.test.ts` line 8 imports `adminDenied` from `./content-admin`. `adminDenied` was deleted from `lib/content-admin.ts` per step 5 of plan 0113. However, `apps/web/lib/content.test.ts` was not in AG1's owned files list in `wave1-content-db.md`. Per the wave 1 rules ("Edit or create only the files listed above... Type errors in files another agent owns are not yours; note them"), `content.test.ts` was not modified. The lead can remove the unused import line from `content.test.ts`.

---

## 6. Anything Found but Not Changed

- `packages/sync-worker/src/guard/guard.test.ts` and `packages/sync-worker/src/index.test.ts` have pre-existing TypeScript type errors regarding `node:fs` and implicit `any`. These files are owned by other agents/lead and were not touched.
