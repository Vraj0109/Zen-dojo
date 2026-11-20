# 0103: Company and frequency lists

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0103-company-lists.html

## Goal

"Which problems should I do for Amazon in the 3 weeks I have?" Add **company lists** and a **frequency tier** to the problems
the app already has. Pick a company, see its list ordered by how often these problems are reported, see how much of it you
have solved, and turn it into a day-by-day plan for your interview date. Problem rows and the workspace header show a small
"Seen at" chip. You can add or remove your own company tags (for example after a recruiter call). No new problems: every
entry points at one of the existing 486 judged problems, 67 patterns, and the study-area designs.

## Context

- **Problems:** `JUDGE_PROBLEMS` (`packages/shared/src/judge/index.ts`, 486 `ProblemSpec`s, ids `lc-<n>`, `cses-<slug>`,
  `c-<slug>`) and `PROBLEMS` / `PROBLEM_LIST` in `packages/shared/src/dsa.ts` (roadmap problems with `difficulty`, grouped by
  pattern). Lists use these ids. Only `source === "leetcode"` problems and a few well-known others make sense for company
  tags; the content test enforces that every id exists.
- **Designs and LLD:** exercise ids in `ALL_EXERCISES` (`packages/shared/src/study.ts`, areas `sd` and `lld`).
- **Practice page and filters:** `/dsa` (`apps/web/app/dsa/page.tsx`), filters in `apps/web/lib/dsa-filters.ts`
  (`FilterKey`, URL parameters, OR within a filter, AND across) and `apps/web/app/dsa/filter-group.tsx` (`FilterChip`),
  rows in `apps/web/app/dsa/problem-ui.tsx`, the workspace header in `apps/web/app/dsa/[id]/`. **These files have uncommitted
  edits from other work in the repo right now: run `git status` first, build on the working tree, and do not revert them.**
- **Progress:** `getDsaView()` in `apps/web/lib/dsa.ts` gives solve status per problem (`unsolved | solved | due | resolved`).
  `getInterviewDate()` and `getCountdown()` in `apps/web/lib/revise.ts` give the interview date.
- **Settings sync:** user tags are stored in the `settings` table under one key, `company_tags`, a JSON object
  `{ "<problemId>": ["amazon", "google"] }`. `settings` already syncs and backs up and the key has no secret word, so no
  migration, no `BACKUP_TABLES` change and no sync change is needed. Cap: 500 problems, 6 companies each; the action rejects
  more. (Settings sync is last-write-wins per key, which is fine for a personal tag list; say so in *Implementation notes*.)
- **Facts and sources.** Companies do not publish their question lists, and sites that sell "company tags" own that data, so
  **do not copy any site's lists.** The lists here are the app's own editorial judgement of well-known, widely discussed
  problems and patterns for each company, written from general public knowledge (candidates' public write-ups, the
  company's own public prep pages, widely known problem names). Label them "Community-reported, approximate. Not from any
  company." Each company carries a `lastChecked: "2026-11-21"` and a one-line `process` note. Tiers are the app's own scale:
  `classic` (very often discussed), `common`, `occasional`. They say nothing about what you will be asked.
- **Related plans:** 0108 (company process and levels guide) is the place for interview process facts; this plan only links
  to the guide route 0108 defines, and only if 0108 is merged. 0102 (OA) can prefer a company's problems.
- **Conventions that apply:** pure data and helpers in `packages/shared/src/`; server data in `apps/web/lib/`; server actions
  in `apps/web/app/actions.ts` style (`refresh()` after mutating); Tailwind tokens from `globals.css`; no emoji; plain
  writing; tests next to code; a test that checks every id exists (like `learn/learn.test.ts`).

## Design

**Data** (`packages/shared/src/companies/`):

```ts
export type Tier = "classic" | "common" | "occasional";
export interface CompanyEntry { problemId: string; tier: Tier }
export interface Company {
  id: string;            // "amazon", "google", "meta", "microsoft", "apple", "uber", "bloomberg", "adobe"
  name: string;
  lastChecked: string;   // "2026-11-21"
  process: string;       // one or two plain sentences, general and public
  focus: string[];       // 3-5 short themes, e.g. "trees and graphs", "design a class"
  problems: CompanyEntry[];   // 40-70 each
  designs: { exerciseId: string; tier: Tier }[];   // 4-8 each, ids in ALL_EXERCISES
  patterns: { patternId: string; weight: 1 | 2 | 3 }[];  // ids of the 67 patterns, for "focus patterns"
}
```

One file per company (`amazon.ts`, `google.ts`, ...), assembled in `companies/index.ts` as `COMPANIES`. A second file
`companies/frequency.ts` holds the **global frequency tier** `FREQUENCY: Record<problemId, Tier>` for 200 to 250 well-known
problems across all patterns (the "if you only have a week" set).

**Helpers** (`companies/helpers.ts`, pure, tested):
`companiesFor(problemId, userTags)` (built-in plus user tags, deduplicated, user tags marked `source: "you"`),
`listFor(companyId, filters)` (ordered classic, common, occasional, then easy to hard, then pattern),
`companyProgress(list, solvedIds)` -> `{ solved, total, byTier, byDifficulty }`,
`buildCompanyPlan({ list, solvedIds, dueIds, days, perDay, today })` -> `{ date: string; problemIds: string[] }[]`
(unsolved only, classic first, interleave patterns so two days in a row are not the same pattern, re-solve-due items fill
gaps, never more than `perDay`, dates are local `YYYY-MM-DD` from `dates.ts`, never UTC maths).

**Screens**

- `/dsa/companies`: a card per company (progress ring: solved of N, number of classic problems left, last checked date).
  Link "Practice" in the nav tabs of `/dsa` ("Patterns | All | Re-solve | Other | Companies"); check `DSA_TABS` and add
  `companies` there only if tabs are the right place after reading the page; otherwise a link from the page header. 
- `/dsa/companies/[id]`: header (name, process note, focus themes, last checked, the "Community-reported" label), segmented
  tiers, difficulty and status filters, the list (reusing the row component with a tier chip), a "Plan my days" panel
  (days left from the interview date, or a number you type; problems per day; shows the next 7 days; "Add to Today"
  creates tasks through the existing tasks API in `lib/tasks.ts`, one task per day titled "Amazon list: 3 problems", linking
  to the list filtered to that day), designs and focus patterns, and "Your tags" (add the company to any problem).
- `/dsa` gains a "Company" filter chip (`FilterKey` `company`, URL `?company=amazon`) and a "Frequency" chip
  (`?freq=classic`). Rows and the workspace header show up to 3 company chips and the tier.
- Settings: none. Tag editing lives on the problem page ("Seen at" popover: toggle companies, saves with
  `setCompanyTagAction(problemId, companyId, on)`).

## Out of scope

- Fetching lists from the internet, scraping, or importing paid lists. (A user may still tag their own.)
- New problems, solutions or walkthroughs; the interview process guide (0108); mock interviews for a company.
- Predicting what you will be asked. Every screen carries the "approximate" label.
- A server-side table for tags (settings key is enough; revisit if it needs per-tag sync).

## Dependencies

None hard. Optional: **0108** (link the `process` note to the full guide), **0102** (OA picker may prefer a company's classic
problems), **0110** (readiness uses company progress as an action: "Finish your Amazon classics").

## Steps

Step 0, then agents A-D in parallel on disjoint files.

- [ ] **0. Foundation (lead).** Create `packages/shared/src/companies/types.ts` (types above), `helpers.ts` with the helper
  signatures (implement `listFor`, `companyProgress`, `companiesFor` fully; `buildCompanyPlan` stub), `index.ts` exporting
  `COMPANIES` built from eight empty per-company files (`amazon.ts` ... `adobe.ts`, each `export const AMAZON: Company = {
  id, name, lastChecked, process: "", focus: [], problems: [], designs: [], patterns: [] }`) and an empty `frequency.ts`;
  export from the shared index. Add `packages/shared/src/companies/companies.test.ts` with the validity tests below
  (they pass on empty lists except the minimum-size ones, marked `it.todo` until the agents finish). Add route skeletons
  `apps/web/app/dsa/companies/page.tsx` and `apps/web/app/dsa/companies/[id]/page.tsx` that render the company names.
  - Done when: `pnpm -r typecheck` passes and `pnpm exec vitest run packages/shared/src/companies` passes.
- [ ] **1. Agent A: content, Amazon / Microsoft / Apple.** Files: `companies/amazon.ts`, `microsoft.ts`, `apple.ts`.
  Choose 40-70 problems per company from `JUDGE_PROBLEMS`, mark tiers, 4-8 designs from `ALL_EXERCISES`, pattern weights,
  one-line `process` and 3-5 `focus` items in plain words. Only general, public knowledge; no internal or leaked material;
  no copying from any site. Context budget: this plan, `types.ts`, a one-line-per-problem index of `JUDGE_PROBLEMS`
  (id, title, difficulty, pattern; generate it with a throwaway script in the scratchpad, do not commit it), the list of
  exercise ids in `study.ts`.
  - Done when: `companies.test.ts` passes for your files: ids exist, no duplicates, size 40-70, each of the three tiers
    used, designs resolve, `lastChecked` is `2026-11-21`, `process` is 1-2 sentences, no emoji.
- [ ] **2. Agent B: content, Google / Meta / Uber / Bloomberg / Adobe.** Files: `google.ts`, `meta.ts`, `uber.ts`,
  `bloomberg.ts`, `adobe.ts`. Same rules and budget as Agent A (30-60 problems for Uber, Bloomberg and Adobe).
  - Done when: same checks pass for your files.
- [ ] **3. Agent C: global frequency and cross-checks.** Files: `companies/frequency.ts`, `companies/frequency.test.ts`. Tier
  200-250 problems across the 67 patterns (at least 2 per pattern; roughly 25% classic, 45% common, rest occasional),
  covering easy, medium and hard. Also a test that reads all eight company files and fails when a company's `classic` problem
  is missing from `FREQUENCY` (keep the two consistent; Agent C may add missing ones to `FREQUENCY` but must not edit the
  company files). Context budget: this plan, `types.ts`, the same problem index, `dsa.ts` pattern list.
  - Done when: the frequency tests pass, every pattern has at least 2 tiered problems, and the count of tiers is in range.
- [ ] **4. Agent D: UI, plan builder, user tags.** Files: `companies/helpers.ts` (`buildCompanyPlan` + `helpers.test.ts`),
  `apps/web/lib/companies.ts` (+ `companies.test.ts`; reads `getDsaView`, user tags from settings key `company_tags`,
  validates and caps), `apps/web/app/dsa/companies/page.tsx`, `.../[id]/page.tsx`, `.../plan-panel.tsx`,
  `.../company-tags.tsx`, `apps/web/app/dsa/companies/actions.ts` (`setCompanyTagAction`, `addCompanyPlanToTodayAction`),
  `apps/web/lib/dsa-filters.ts` (new `company` and `freq` filters; extend `dsa-filters.test.ts`),
  `apps/web/app/dsa/filter-group.tsx` and `page.tsx` (Company and Frequency chips; small additions only),
  `apps/web/app/dsa/problem-ui.tsx` (tier and company chips on rows). Match the mockup. `/dsa/companies/[id]` is dynamic per
  user: async component with `await connection()` inside `<Suspense>`, per the Next 16 rule in `AGENTS.md`. Context budget:
  this plan, the mockup, `dsa-filters.ts`, `filter-group.tsx` (exports), `problem-ui.tsx`, `lib/revise.ts` (interview date),
  `lib/tasks.ts` (how to add a task).
  - Done when: unit tests cover `buildCompanyPlan` (no more than `perDay`, classic first, no same pattern on consecutive
    days when avoidable, skips solved, re-solve-due fills gaps, correct local dates across a month boundary, days = 0 returns
    an empty plan), tag validation (caps, unknown company ids rejected, unknown problem ids rejected) and the new
    filters; in the browser (1280 and 390 px, light and dark) the company page, the plan panel, the filter chips and the
    "Seen at" popover work, and "Add to Today" creates tasks that show on `/`.
- [ ] **5. Review (lead).** `pnpm -r typecheck`, targeted tests, `pnpm check` once. Spot check 15 random entries per company
  for plausibility (a classic list should not contain an obscure problem) and that no label claims official data.
  - Done when: acceptance criteria below are ticked.

## Acceptance criteria

- [ ] `/dsa/companies` lists eight companies with progress; each company page shows its tiered list, focus themes, designs,
      the "Community-reported, approximate" label and the last-checked date.
- [ ] "Plan my days" builds a plan from the interview date (or a typed number of days) and adds it to Today.
- [ ] `/dsa` can be filtered by company and by frequency tier; filters live in the URL and work without JavaScript.
- [ ] Rows and the workspace header show tier and company chips; you can add or remove your own company tag on a problem
      and it persists (and syncs through settings).
- [ ] `FREQUENCY` has 200 to 250 problems across all 67 patterns; every id in every list exists (tested).
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (small edits in `/dsa` files are expected and explained in
      *Implementation notes*).

## Estimate

- Step 0: 0.25 agent-day. Agents A-D in parallel: A 0.75, B 0.75, C 0.75, D 1 agent-day. Review and fixes: 0.5 day.
- Total: about 1.5 to 2 calendar days.
- Main risk: content accuracy. Lists are editorial; the review samples them and the label says "approximate". Second risk:
  merge conflicts in `/dsa` files that already have uncommitted changes; do step 4 after those changes are committed.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in.)

## Review

(Reviewer fills in.)
