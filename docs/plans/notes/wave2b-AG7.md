# Wave 2 Round B — Agent AG7 Implementation Notes

## Assignment
Implement Round B of "content in the database" for owned files:
- Replace content constants from `@habit/shared` with `apps/web/lib/content-repo/lookups.ts` and `apps/web/lib/content-repo/` modules (`problems.ts`, `docs.ts`, `courses.ts`).
- DSA list reads `listProblemSummaries()` and `getDsaGroups()` and shows all problems on one page without pagination.
- Problem pages read `getProblem(id)` and `getProblemSpec(id)`.
- Solution tab (`apps/web/app/solution-walkthrough.tsx`) renders `getSolutionPage(id)` with `apps/web/app/content-page.tsx`.
- Judge and `/api/judge/run` get specs from `getProblemSpec(id)`.
- Pattern pages read `getLesson('pattern-' + id)`, `getLesson('article-' + id)`, and `getDoc('cp-algorithms', id)`.
- Keep backwards-compatible helpers for external callers where needed.
- Mock content-repo modules in unit tests with `@habit/shared` constants to keep tests fast without requiring a seeded database or failing on `cacheTag()`.

---

## Files Changed / Created

### Production Files:
1. `apps/web/app/dsa/page.tsx`:
   - Replaced direct imports of `DSA_GROUPS` with `getDsaGroups()` and `getDsaView()` (which calls `listProblemSummaries()`).
2. `apps/web/app/dsa/[id]/page.tsx`:
   - Replaced `ALL_PATTERNS`, `INTERVIEW`, `JUDGE_PROBLEMS` with `getAllPatterns()`, `getProblem()`, and `getProblemSpec()`.
3. `apps/web/app/dsa/pattern/[id]/page.tsx`:
   - Replaced `ALL_PATTERNS`, `DSA_GROUPS`, `PATTERN_GUIDES`, `PATTERN_ARTICLES` with `getAllPatterns()`, `getDsaGroups()`, `getLesson("pattern-" + id)`, `getLesson("article-" + id)`, and `lessonToShape()`.
4. `apps/web/app/dsa/boss/page.tsx`:
   - Replaced `PROBLEMS` with `getRoadmapProblems()`.
5. `apps/web/app/problem-workspace.tsx`:
   - Removed imports from `@habit/shared/solutions` (`solutionCode`, `solutionLangs`, `bruteCode`, `bruteLangs`).
6. `apps/web/app/solution-walkthrough.tsx`:
   - Replaced static walkthrough logic with `getSolutionPage(id)` and `ContentPage` (`apps/web/app/content-page.tsx`). Preserved `<details>` "Try it yourself first" behavior and section outline chips.
7. `apps/web/app/api/judge/run/route.ts`:
   - Replaced `resolveProblemSpec` from `@/lib/content` with `getProblemSpec` from `@/lib/content-repo/problems`.
8. `apps/web/lib/dsa.ts`:
   - Replaced `ALL_PATTERNS`, `DSA_GROUPS`, `JUDGE_PROBLEMS`, `PROBLEMS` with `getAllPatterns()`, `getDsaGroups()`, `getRoadmapProblems()`, `getProblemSpec()`, `listProblemSummaries()`.
9. `apps/web/lib/dsa-filters.ts`:
   - Removed `JUDGE_PROBLEMS` from module scope; added `setJudgeTextIndex` and `indexFromSpecs` so that judge problem search indexes are built from problem specs rather than hardcoded static constants.
10. `apps/web/lib/boss.ts`:
    - Replaced `PROBLEMS` with `getRoadmapProblems()`.
11. `apps/web/lib/pattern-nav.ts`:
    - Replaced `DSA_GROUPS` with `getDsaGroups()`.
12. `apps/web/lib/pattern-notes.ts`:
    - Replaced `ALL_PATTERNS` with `getAllPatterns()`.
13. `apps/web/lib/cp-algorithms.ts`:
    - Replaced `CP_ALGO_ARTICLES` with `getDoc("cp-algorithms", ...)`.
14. `apps/web/lib/struggles.ts`:
    - Replaced `PROBLEMS` with `getRoadmapProblems()`. Maintained synchronous `isProblemId` regex for callers.
15. `apps/web/lib/weekly.ts`:
    - Replaced `PROBLEMS` with `getRoadmapProblems()`.
16. `apps/web/lib/packs.ts`:
    - Replaced `LESSONS` with `getLesson` and `lessonToShape`.
17. `apps/web/lib/leetcode/extension.ts`:
    - Replaced `PROBLEMS` with `getRoadmapProblems()`.
18. `apps/web/lib/leetcode/sync.ts`:
    - Replaced `PROBLEMS` with `getRoadmapProblems()`.
19. `apps/web/lib/ai/context.ts`:
    - Replaced `JUDGE_PROBLEMS` and `INTERVIEW` with `getProblemSpec` and `getProblem`. Awaited `lessonSource`.
20. `apps/web/app/actions.ts`:
    - Replaced `ALL_EXERCISES`, `PROBLEMS`, `JUDGE_PROBLEMS` with `getAllExercises`, `getRoadmapProblems`, `getProblemSpec`.

### Test Files:
1. `apps/web/app/dsa/dsa.test.ts`:
   - Added mocks for `@/lib/content-repo/lookups` and `@/lib/content-repo/problems` (using `problemFromSpec`).
   - Updated assertion for optimal approach label in solution walkthrough from "Reference implementation" to "Optimal" (matching `ContentPage`).
2. `apps/web/lib/dsa.test.ts`: Added mocks for `content-repo/lookups` and `content-repo/problems`.
3. `apps/web/lib/dsa-filters.test.ts`: Added mocks for `content-repo/lookups` and `content-repo/problems`.
4. `apps/web/lib/pattern-nav.test.ts`: Added mocks for `content-repo/lookups` and updated calls to `await patternNeighbours(...)`.
5. `apps/web/lib/cp-algorithms.test.ts`: Added mock for `content-repo/docs` and updated call to `await cpAlgoCount(...)`.
6. `apps/web/app/api/judge/run/route.test.ts`: Added mock for `@/lib/content-repo/problems`.
7. `apps/web/lib/judge-solve.test.ts`: Added mocks for `content-repo/lookups` and `content-repo/problems`.
8. `apps/web/lib/weekly.test.ts`: Added mock for `content-repo/problems`.
9. `apps/web/lib/leetcode/extension.test.ts`: Added mocks for `content-repo/lookups` and `content-repo/problems`.
10. `apps/web/lib/leetcode/sync.test.ts`: Added mocks for `content-repo/lookups` and `content-repo/problems`.
11. `apps/web/lib/packs.test.ts`: Added mocks for `content-repo/lookups`, `content-repo/problems`, `content-repo/docs`.
12. `apps/web/lib/packs-v2.test.ts`: Added mocks for `content-repo/lookups`, `content-repo/problems`, `content-repo/docs`, `content-repo/courses`.

---

## Test Commands & Verification Results

### 1. Vitest Suite (13 test suites, 131 tests):
```bash
pnpm exec vitest run apps/web/lib/packs.test.ts apps/web/lib/packs-v2.test.ts apps/web/lib/leetcode/extension.test.ts apps/web/lib/leetcode/sync.test.ts apps/web/lib/judge-solve.test.ts apps/web/lib/weekly.test.ts apps/web/app/api/judge/run/route.test.ts apps/web/lib/cp-algorithms.test.ts apps/web/lib/judge/run.test.ts apps/web/lib/dsa.test.ts apps/web/lib/dsa-filters.test.ts apps/web/lib/pattern-nav.test.ts apps/web/app/dsa/dsa.test.ts
```
**Result**:
- Test Files: 13 passed (13)
- Tests: 131 passed (131)
- Duration: 11.72s

### 2. TypeScript Check:
```bash
pnpm --filter web exec tsc --noEmit
```
**Result**:
- Passed with 0 errors (exit code 0).

### 3. ESLint:
```bash
pnpm lint
```
**Result**:
- Passed with 0 errors, 0 warnings (exit code 0).

---

## Constant Removal Audit
A git grep was conducted across all owned files (excluding `*.test.ts`) for forbidden content constants:
`JUDGE_PROBLEMS`, `SOLUTIONS`, `BRUTE`, `INTERVIEW`, `solutionCode`, `bruteCode`, `solutionLangs`, `bruteLangs`, `PROBLEMS`, `DSA_GROUPS`, `ALL_PATTERNS`, `PATTERN_GUIDES`, `PATTERN_ARTICLES`, `CP_ALGO_ARTICLES`, `ALL_EXERCISES`.

**Result**:
- 0 occurrences found in production code. All content constants have been removed from owned production files.

---

## Deviations from the Plan & Why
1. `isProblemId(id: string)` in `apps/web/lib/struggles.ts`:
   - `apps/web/lib/timer.ts` (owned by C9) calls `isProblemId(id)` synchronously within `isTimerItem(id)`.
   - Changing `isProblemId` to async would break `timer.ts` and its synchronous callers across the app.
   - Retained `isProblemId` as a synchronous format validation function using regex `/^(lc-\d+[a-z]?|cses-\d+|c-[a-z0-9-]+|lcx-[a-z0-9-]+|pack:[a-z0-9-]+)$/`, while `getProblem` or `getProblemSpec` handles database lookups.
2. `cpAlgoCount(patternId: string)` in `apps/web/lib/cp-algorithms.ts`:
   - Converted to `async` because it queries `getDoc("cp-algorithms", "main")` from the content DB.
   - Its only caller (`apps/web/app/dsa/pattern/[id]/page.tsx`) and unit tests were updated to `await cpAlgoCount`.
3. Unit test mocking:
   - Next.js 16 cache primitives (`cacheTag`, `cacheLife`) require runtime cacheComponents infrastructure that is not initialized in standard Vitest Node/jsdom runners, throwing `Error: cacheTag() is only available with the cacheComponents config`.
   - Mocking `@/lib/content-repo/lookups`, `@/lib/content-repo/problems`, and `@/lib/content-repo/docs` in unit tests cleanly allows tests to run in milliseconds without a seeded DB while exercising full component/lib logic.

---

## Callers Outside Owned Files
- `apps/web/lib/timer.ts`: calls `isProblemId(id)` from `apps/web/lib/struggles.ts`. Kept synchronous and working as expected.
- All other callers outside owned files that invoke `getDsaView`, `markSolved`, `recordJudgePass`, `getProblemDetail`, etc., remain compatible.

---

## Questions for the Lead
None. All tasks assigned to AG7 under Wave 2 Round B are complete and verified.
