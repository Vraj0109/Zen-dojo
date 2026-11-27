# Wave 2 Round A Implementation Notes: Agent AG4

- **Task**: Audit wiring, hosted admin write API with conflict checks, desktop forwarding, and admin content routes (Plan 0113 steps 2–3 wiring, Plan 0116 step 2, Plan 0116 "Writes" and "Conflicts" context)
- **Status**: Completed

---

## 1. Files Created and Changed

### Files Created:
- `apps/web/lib/admin-content/write.ts`:
  - `saveProblem(proof, draft, baseRev)`: Validates draft via `validateProblemDraft` and `validatePageAgainstTemplate("problem")`, checks `baseRev` conflict returning `{ ok: false, conflict: true, current }`, writes via `upsertProblem` and `writeAudit` in one transaction using `getContentWriteDb(proof)`, and skips audit when draft has identical rev. Desktop mode forwards to hosted admin API with `fetchWithAccessToken`, runs `syncContent`, and expires tags in action.
  - `deleteProblem(proof, id, baseRev)`: Checks conflict against current entity rev, performs `softDelete` and writes audit row (`action: "delete"`) in one transaction. Desktop mode forwards DELETE request to hosted admin API.
  - `saveLesson(proof, draft, baseRev)`: Validates template and draft via `validatePageAgainstTemplate`, checks `baseRev` conflict, performs `upsertLesson` and `writeAudit` in one transaction.
  - `deleteLesson(proof, id, baseRev)`: Soft-deletes lesson with audit row in one transaction.
  - `restoreFromAudit(proof, auditId)`: Loads audit row, restores problem/lesson via `upsertProblem`/`upsertLesson`, records audit row with `action: "restore"`. Desktop forwards to `/api/admin/audit`.
- `apps/web/lib/admin-content/write.test.ts`:
  - 12 comprehensive unit and integration tests covering hosted saves, duplicate rev no-op, baseRev conflicts, soft delete with audit, lesson save/delete, restore from audit, and desktop forwarding (bearer token, syncContent run, 401/403 mapping to "Not allowed.", and 409 conflict).
- `apps/web/app/api/admin/content/problems/[id]/route.ts`:
  - Handlers: `GET` (returns problem + rev or 404), `PUT` (validates draft, checks <= 2 MB body, baseRev conflict 409, saveProblem, expires tags via `revalidateTag`), `DELETE` (baseRev conflict 409, deleteProblem, expires tags). Starts with `requireAdminRequest`.
- `apps/web/app/api/admin/content/problems/[id]/route.test.ts`:
  - 8 tests: anonymous 401, non-admin 403, GET 200/404, PUT 200 + audit row + tags expired, PUT 400 invalid, PUT 409 conflict, PUT 413 > 2 MB, DELETE 200/404/409.
- `apps/web/app/api/admin/content/lessons/[id]/route.ts`:
  - Handlers: `GET`, `PUT`, `DELETE` with `requireAdminRequest`, <= 2 MB check, baseRev conflict 409, and tag invalidation.
- `apps/web/app/api/admin/content/lessons/[id]/route.test.ts`:
  - 8 tests covering 401, 403, GET 200/404, PUT 200 + audit + tag invalidation, invalid draft 400, conflict 409, body > 2 MB 413, DELETE 200/404/409.
- `apps/web/app/api/admin/audit/route.ts`:
  - `GET`: calls `listAudit` with query filters (`entity`, `entityId`, `actorId`, `limit`, `before`). Starts with `requireAdminRequest`.
  - `POST`: restores version from audit log via `restoreFromAudit`, checks <= 2 MB body, expires cache tags. Starts with `requireAdminRequest`.
- `apps/web/app/api/admin/audit/route.test.ts`:
  - 5 tests: 401 anonymous, 403 non-admin, GET 200 with filtered rows, POST 200 restore, POST 400 invalid auditId, POST 413 > 2 MB.
- `docs/plans/notes/wave2-AG4.md`: This notes document.

### Files Modified:
- `apps/web/lib/auth/session.ts`:
  - Factored out `fetchWithAccessToken(url, init)` from `workerFetch`, handling access token cookie extraction, token refresh on 401, and retrying once. Safe when called outside request scope.
  - `workerFetch` now delegates directly to `fetchWithAccessToken`.
- `apps/web/app/admin/actions.ts`:
  - Replaced legacy `TODO(wave2): writeAudit` comments in `save` and `deleteProblemAction` with calls to `writeAudit` within transactions on `getContentWriteDb(proof)`.
- `apps/web/app/admin/study-actions.ts`:
  - Replaced legacy `TODO(wave2): writeAudit` comments in `saveLessonAction` and `revertLessonAction` with calls to `writeAudit` within transactions on `getContentWriteDb(proof)`.
- `apps/web/app/api/admin/content/route.ts`:
  - Replaced legacy `TODO(wave2): writeAudit` comments in `POST` (action `"import"`) and `DELETE` (action `"delete"`) with calls to `writeAudit` on `getContentWriteDb(auth.proof)`.
- `apps/web/app/admin/admin.test.ts` & `apps/web/app/admin/study.test.ts`:
  - Used `mintAdminProof` to mock `requireAdminAction` return value so transactions on `getContentWriteDb(proof)` succeed in action tests.

---

## 2. Test Commands and Results

Fast check test command:
```bash
pnpm.cmd exec vitest run apps/web/lib/admin-content apps/web/app/api/admin apps/web/app/admin apps/web/lib/auth
```

Result:
```
Test Files  11 passed (11)
     Tests  111 passed (111)
  Duration  2.99s
```

TypeScript typecheck command:
```bash
pnpm.cmd --filter web exec tsc --noEmit
```

Result:
```
Exited with code 0 (0 errors)
```

Lint command:
```bash
pnpm.cmd --filter web lint
```

Result:
```
Clean (0 errors, 0 warnings)
```

Static guard check:
- `apps/web/app/admin/guard.test.ts` PASSED.

---

## 3. Deviations from the Plan & Why

1. **Tag Expiry in Route Handlers**:
   - In Next.js 16 App Router, `expireContentTagsInRoute` from `lib/content-repo/invalidate.ts` is called for problem routes and lesson routes where courseId is provided. Additionally, each write operation (`saveProblem`, `deleteProblem`, `saveLesson`, `deleteLesson`, `restoreFromAudit`) returns `tags: string[]`, which route handlers invalidate via `revalidateTag(tag, { expire: 0 })`.
2. **Problem Page Validation Against Template**:
   - `ContentProblem` holds two sub-pages: `draft.statement` (slot `"statement"`) and `draft.solution` (slot `"solution"`). The template `"problem"` in `TEMPLATES.problem` defines both `statement` (required) and `solution` (required). To validate draft pages against the template using `validatePageAgainstTemplate`, a combined `ContentPage` containing the sections of both `statement` and `solution` was evaluated so all required slots and block types are checked without false positives for missing slots.

---

## 4. Questions for the Lead

None. Everything specified in Wave 2 Round A row AG4 has been implemented and tested.

---

## 5. Anything Found but Not Changed

- None in files owned by AG4.
