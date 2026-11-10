# 0053: Solved ticks (accent plus grey) and DSA search with multi-select filters

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-10
- **Implemented by:** (implementer fills in)
- **Spec:** builds on plan 0022 follow-ups (solved means tests passed) and `apps/web/lib/dsa-filters.ts`
- **Priority:** 3

## Goal

1. **Ticks.** A problem solved in this app shows one tick in the **accent colour**. If you also solved it on
   LeetCode, a **second, grey tick** is added after it. Solved only on LeetCode shows a single faint grey tick.
2. **Search.** The search box finds problems by title, topic, description, and test cases, not only title and number.
3. **Filters.** Each filter (source, status, difficulty, topic, notes) is a **multi-choice** control: tick any number
   of options, each filter has "Select all" and "Clear", and an empty filter means no filtering. A "Clear all" resets
   everything.

## Context (verified)

- `StatusMark` in `apps/web/app/ui.tsx` draws solved-here as a green tick (`text-diff-easy`), and solved-here plus
  LeetCode as two overlapping accent ticks (commit 92afb0a). Callers: `app/dsa/problem-ui.tsx`,
  `app/dsa/[id]/page.tsx` (two places), plus single-tick uses on `app/page.tsx`, `app/dsa/page.tsx` and `app/dsa/boss/page.tsx`.
- Filters live in the URL and are single-valued: `q`, `topic`, `difficulty`, `status`, `has`, `source`; parsed in
  `apps/web/lib/dsa-filters.ts` (`parseDsaFilters`, `matches`, `filterProblems`, `matchesSource`, `parseSource`) and
  rendered as `<select>`s by the form in `apps/web/app/dsa/page.tsx` (around lines 262-320). `dsaTabHref` copies the
  params when switching tabs.
- `matches` searches title, id and number only. Descriptions and test cases are in
  `JUDGE_PROBLEMS` (`packages/shared/src/judge/index.ts`: `statement`, `examples`, `tests`) for judgeable problems; LeetCode topics are in `ProblemView.topics`.
- Page tests: `apps/web/lib/dsa-filters.test.ts`.

## Design (decided)

- **Ticks:** `StatusMark` states: `here` (accent, one tick); `here + leetcode` (accent tick, then a grey tick placed
  to its right, not overlapping); `leetcode only` (one grey tick at 60% opacity). Re-solve and unsolved stay as they
  are. All other callers that show a plain solved tick keep working (they pass no `here`).
- **URL format:** repeated parameters, e.g. `/dsa?difficulty=easy&difficulty=medium&status=solved&q=graph`. An absent
  parameter means "no filter". Old single-value URLs keep working (they are just one value).
- **Parsing:** `DsaFilters` becomes `{ q: string; topic: string[]; difficulty: Difficulty[]; status: StatusKey[]; has: HasKey[]; source: DsaSource[] }`, all validated against the allowed lists, capped (20 values each, 100 chars for `q`). A problem matches a filter when it matches **any** selected value of that filter; across filters all must match (AND).
- **Search text:** `q` is split on spaces; every word must be found (case-insensitive) in the problem's searchable text: title, id, number,
  topics, pattern names, source name, statement text, hints, and the text of its example and test inputs and expected
  outputs. Digit-only `q` still means an exact problem number (keep the current rule). The searchable text is built
  once on the server per request from `JUDGE_PROBLEMS` and `ProblemView`, lower-cased, in a `Map` cached at module level (not per row), and test cases are
  truncated to the first 2,000 characters per problem so the index stays small. Rank is not needed.
- **UI:** each filter is a `<details>` dropdown button showing the filter name and a count ("Status (2)"). Inside:
  checkboxes (a real `<form method="get">`, so it works without JavaScript), plus two small buttons "Select all" and
  "Clear" (these need JavaScript; enhance with a tiny client component, `FilterGroup`, that sets all checkboxes; without JS the user ticks boxes by hand). A "Clear all" link goes to `/dsa`. Active filters also show as removable chips under the form, each a link that removes just that value.
- Keep the Re-solve and Other tabs and `dsaTabHref` behavior; update it for repeated params.

## Out of scope

- Server-side pagination or full-text engines; searching notes or your saved code; changing what "solved" means.

## Steps

Do in order. Targeted tests only (`pnpm exec vitest run apps/web/lib/dsa-filters.test.ts`, `pnpm --filter web typecheck`). Local commits with explicit paths; no push or attribution.

- [ ] **1. `StatusMark` ticks** (`apps/web/app/ui.tsx`). Implement the three states. Use `text-accent` for here, `text-muted` for the grey tick. No emoji, SVG only.
  - Done when: a small test (or render in `ui` tests if present) or a typecheck-visible prop contract shows the three cases; the three single-tick callers are unchanged; hover text says "Solved here", "Solved here and on LeetCode", "Solved on LeetCode, not solved here yet".
- [ ] **2. Filters model** (`apps/web/lib/dsa-filters.ts`). Change `DsaFilters` to the array shape; update `parseDsaFilters`,
  `hasActiveFilters`, `matches`, `parseSource`/`matchesSource` (source becomes an array in the same params object, keep `matchesSource` for one value), `filterProblems`, and add `buildSearchIndex(problems, specs)` plus `searchText(problem)`.
  - Done when: `dsa-filters.test.ts` is updated and covers: repeated values OR within a filter and AND across filters, empty means all, old single-value URLs, invalid values dropped, search hits in title, topic, statement, and test input, number-only search, all words must match, caps.
- [ ] **3. Page and form** (`apps/web/app/dsa/page.tsx`, new `apps/web/app/dsa/filter-group.tsx`). Replace the `<select>`s with `FilterGroup` dropdowns; chips; "Clear all"; update `dsaTabHref`; update the placeholder to "Search title, topic, description or tests".
  - Done when: typecheck and eslint pass; with JavaScript off the form still filters; Select all and Clear work with JavaScript.
- [ ] **4. Check on real data.** Search "graph" and "[1,2,3]"-style input text; combine two difficulties and one status; confirm the result count and that clearing works. Page stays fast (note the response time in *Implementation notes*).
  - Done when: noted.
- [ ] **5. Final (lead):** one `pnpm check`.

## Acceptance criteria

- [ ] Solved here: one accent tick. Solved here and on LeetCode: accent tick plus a grey tick. LeetCode only: one faint grey tick.
- [ ] Searching a word from a problem's description or from a test input finds it.
- [ ] Each filter allows several choices, has Select all and Clear, and no choice means no filtering; "Clear all" resets the page.
- [ ] Old bookmarked `/dsa?difficulty=easy` links still work.
- [ ] `pnpm check` passes.

## Pitfalls

- Building the search text for 800+ problems on every request is slow; cache it at module level.
- Do not put user notes or saved code into the shared search index.
- Keep it working without JavaScript (forms post as GET).

## Open questions

## Implementation notes

## Review
