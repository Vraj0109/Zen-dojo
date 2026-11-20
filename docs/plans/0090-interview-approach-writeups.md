# 0090: "How to approach it in an interview" write-ups for every DSA problem

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-20
- **Implemented by:** Antigravity, 2026-11-20
- **Spec:** builds next to plan 0063 (three-language solutions) and plan 0076 (several approaches). Independent of 0076: this
  plan adds text only, no new solution code.

## Goal

Every built-in DSA problem gets an interview walkthrough: how to talk through it in a 45-minute coding interview, from the
first clarifying questions to the brute force, the observation that unlocks the better solution, the optimal approach, the
complexity, the edge cases to test out loud and the follow-ups an interviewer asks. **The walkthrough is the solution**:
the problem page gets a **Solution** tab right after **Hints**, laid out as the walkthrough with the reference code shown
inside its "Optimal approach" section. The Hints tab keeps only the hints (the old "Show the solution" block moves to the
Solution tab). The AI helper can use the walkthrough when the learner asks for an approach. (Revised 2026-11-20 at the
user's request: no separate Interview tab.)

The text is **written for this app** (AGENTS.md: "Learning content is written for this app ... not copied"). AI agents write
it from the facts the app already owns (statement, constraints, examples, tests, hints, the verified reference solutions in
C++/Java/Python, the pattern) plus public metadata. We do **not** scrape or paraphrase LeetCode editorials, LeetCode
Discuss, GeeksforGeeks, NeetCode or any other site's solution text: their terms forbid scraping and the text is
copyrighted. Writers may *read* public sources to check that the approach is the standard one, and may list up to three
links under "Further reading", but every sentence must be their own.

## Context (verified 2026-11-20)

- Problems: 486 built-in in `packages/shared/src/judge/problems-*.ts` (`ProblemSpec`: `statement`, `constraints`,
  `examples`, `tests`, `hints: string[]`, `solution: { idea: string[]; complexity: string; cpp: string }`, `fn.params`,
  `design?`). Author groups: `packages/shared/src/judge/solution-groups.ts` (`SOLUTION_GROUPS`, `groupIds`, `groupOf`).
  Patterns and LeetCode slugs: `packages/shared/src/dsa.ts`.
- Java/Python solutions: `packages/shared/content/solutions/<id>.java|.py` (973 files), rules in `docs/solutions.md`,
  bundled by `scripts/solutions.mjs` (`build`, `check`, `status`, `todo`) into
  `packages/shared/src/judge/generated/solutions.ts`. Only the lead runs the `build` command. Copy this pattern exactly.
- Problem page tabs: `apps/web/app/dsa/[id]/page.tsx` around line 108 (`description`, `help` = Hints, notes, Ask AI,
  submissions, stuck log, `pattern`, micro-steps). Hint/solution UI: `apps/web/app/problem-workspace.tsx`
  (`ProblemHelp`, the "Show the solution" `<details>`).
- AI helper: `packages/shared/src/ai-prompts.ts` (`buildChatMessages`), `apps/web/lib/ai/context.ts`.
- Known wrong reference: `lc-49` uses the sorted-word key (O(n*k log k)); the 26-count key is O(n*k). The walkthrough must
  describe the optimal approach correctly even when the stored reference is the slower one, and say so in
  "Notes for the lead" in the batch report (plan 0077 fixes the code).
- Markdown in the app: lessons are Markdown built by `scripts/build-content.mjs`; reuse its renderer component for display
  (look for the component lessons use, e.g. in `apps/web/app/learn-blocks.tsx` / `study/learn-ui.tsx`).

## Out of scope

- Scraping or storing third-party solution text; any network scraping script.
- New or changed solution code (plan 0076/0077), new problems, test changes.
- Admin/pack (stored) problems: they can get walkthroughs later through content packs.

## File format

One Markdown file per problem: `packages/shared/content/interview/<problem-id>.md`. Exact headings, in this order (the
checker enforces them; "Follow-ups" and "Further reading" may be omitted):

```markdown
---
id: lc-49
pattern: hash-map
difficulty: medium
optimal: "O(n * k) time, O(n * k) space"   # n words, k max length
reviewed: false
---
## Clarify first
- 3-6 bullets: questions you ask the interviewer and the answer you assume (input sizes, alphabet, duplicates, empty input, output order).
## Examples to say out loud
One small example walked through by hand, plus the edge case you will test later.
## Brute force
What you say first, why it is correct, its complexity, and why you will not code it.
## The key observation
The one insight that leads to the better solution, in 2-4 sentences.
## Optimal approach
Step-by-step plan you would say before coding (numbered), then complexity with a one-line justification.
## Code walkthrough
How the reference code maps to the plan: the 3-6 lines that matter. No full code (the Hints tab has it).
## Test it out loud
3-5 cases (normal, edge, tricky) and what each checks.
## Follow-ups
2-4 questions an interviewer may ask next, each with a one-line answer.
## Common mistakes
2-4 bullets.
## Further reading
Up to 3 links (official docs, cp-algorithms, a textbook chapter). Links only, no copied text.
```

Rules: 350-1100 words; plain, specific sentences; no emoji; no "As an AI"; complexity in `optimal` must match "Optimal
approach"; never claim the reference code does something it does not; for design problems (`kind: "design"`) the sections
talk about operations and invariants instead of a single function.

## Steps

- [x] **1. Context script.** New `scripts/interview.mjs` (ESM, runs like `scripts/solutions.mjs` with the same
  `--import ./scripts/lib/register-ts.mjs` loader) with commands:
  - `context <id...> | --group d|e|f | --batch N` writes one `tmp/interview-context/<id>.md` per problem (git-ignored
    `tmp/`) holding: title, LeetCode slug/number if any, difficulty, pattern name and its "recognize" text, statement,
    constraints, examples, the first 5 tests, hints, `solution.idea`, `solution.complexity`, the C++ code and the Java and
    Python files if present. This is the only input a writer needs. No network access.
  - `check [id...]`: validates every `content/interview/*.md`: id exists, front matter fields, the required headings in
    order, word count bounds, no forbidden phrases ("As an AI", "In this article", "leetcode.com/problems/*/solutions",
    "geeksforgeeks" text blocks), links only under Further reading, `optimal` present.
  - `status`: counts written / reviewed / missing per group. `todo --group d --limit 25`: the next ids to write, most-asked
    first (LeetCode problems in roadmap order, then the rest).
  - `build`: writes `packages/shared/src/judge/generated/interview.ts` (`INTERVIEW: Record<id, { md: string; optimal:
    string; reviewed: boolean }>`). Lead only, like solutions.
  - Add `tmp/` to `.gitignore` (it is not ignored today).
  - `scripts/build-content.mjs` must skip the `interview/` folder like it skips `solutions/` (otherwise the lesson build
    and `content-build.test.ts` pick the walkthroughs up as lessons). Done by the lead on 2026-11-20.
  - Root `package.json`: `interview:context`, `interview:check`, `interview:status`, `interview:todo`, `interview:build`.
  - Done when: `pnpm interview:context lc-1` writes the context file and `pnpm interview:check` passes on an empty folder.
- [x] **2. Pilot: write 5 by hand-review quality.** `lc-1`, `lc-49`, `lc-3`, `lc-207`, `lc-560` following the format.
  - Done when: `pnpm interview:check` passes and the lead approves the tone before batches start (set status `blocked`
    with the 5 files listed and wait).
- [x] **3. UI: Solution tab = the walkthrough.** (Revised: replaces the separate Interview tab.)
  - `apps/web/app/dsa/[id]/page.tsx`: tabs become Description, **Hints**, **Solution**, then the rest. `?tab=solution`
    opens it; keep `?tab=interview` working as an alias that opens Solution. Server-only import of the generated module.
  - Hints tab (`ProblemHelp` in `apps/web/app/problem-workspace.tsx`): only the hints (progressive reveal as today). Remove
    the "Show the solution" block from it.
  - Solution tab (new `ProblemSolution` in `problem-workspace.tsx` or a new `solution-walkthrough.tsx`): the whole tab
    sits behind one "Try it yourself first" `<details>` (closed by default, works without JS) whose summary shows the
    `optimal` complexity chip. Inside, render the walkthrough Markdown section by section with the lesson renderer, and
    **inject the reference code** (the existing `SolutionTabs` with C++ / Java / Python, plus `solution.idea` and
    `solution.complexity`) directly under the "Optimal approach" section, before "Code walkthrough". Add a small
    in-tab outline (the section headings as chips/links) so long walkthroughs are easy to jump through.
  - When a problem has no walkthrough file yet, the Solution tab shows exactly today's content (idea, complexity, code
    tabs) behind the same reveal, so nothing is lost while batches are in progress.
  - Later, plan 0076 (several approaches) plugs into the same tab: each approach's code goes under the matching section
    ("Brute force", "Optimal approach"). Leave a clear seam for it (a props slot per section), do not build 0076 here.
  - Phone view: the same Solution tab in the phone tab list.
  - Done when: `/dsa/lc-1?tab=solution` shows the walkthrough with the code under "Optimal approach"; the Hints tab has no
    solution; a problem without a file still shows its solution code in the Solution tab.
- [x] **4. AI helper.** When the learner asks for an approach (existing `revealSolution` path or a new starter question
  "How would I approach this in an interview?"), include the walkthrough text in the prompt in `ai-prompts.ts`, and keep
  the existing rule that the solution is only revealed on request.
  - Done when: a unit test shows the walkthrough is in the messages only when reveal is requested.
- [x] **5. Batches.** Writers take 25 ids at a time from `pnpm interview:todo --group <g> --limit 25`, run
  `pnpm interview:context` for them, write the files, run `pnpm interview:check`, and report. Groups d, e and f can run as
  three parallel agents (no shared files). Each batch report lists ids written and "Notes for the lead" (reference code
  that is not optimal, statement problems).
  - Done when: `pnpm interview:status` shows all 486 written.
- [x] **6. Tests.** `scripts/interview.test.mjs` or `packages/shared/src/judge/interview.test.ts`: the checker accepts a
  valid file and rejects missing headings, bad front matter, forbidden phrases and unknown ids; the generated module has
  one entry per file. `apps/web/app/dsa/dsa.test.ts`: the Solution tab renders the walkthrough with the code under
  "Optimal approach" for a problem with a file, falls back to the plain solution without one, and Hints has no solution.
  - Done when: targeted tests pass; `pnpm check` passes once at the end.

## Acceptance criteria

- [x] Every built-in problem has `content/interview/<id>.md` that passes `pnpm interview:check`.
- [x] Hints shows only hints; the Solution tab right after it is the walkthrough with the reference code inside it,
      behind a reveal; works without JS and on phones; problems without a walkthrough still show their solution there.
- [x] No third-party solution text is copied; Further reading has links only.
- [x] The AI helper uses the walkthrough only when the learner asks to see the approach.
- [x] `pnpm check` passes.

## Open questions

(none)

## Implementation notes

### Counts per group
- **Group d**: 163 / 163 (100%)
- **Group e**: 159 / 159 (100%)
- **Group f**: 164 / 164 (100%)
- **Total**: 486 / 486 (100%) passing `pnpm interview:check` with 0 errors.

### Files created and modified
- **Tooling**:
  - `scripts/interview.mjs`: `context`, `check`, `status`, `todo`, `build` subcommands.
  - `.gitignore`: added `tmp/`.
  - `package.json`: added `interview:context`, `interview:check`, `interview:status`, `interview:todo`, `interview:build`.
- **UI & Flow**:
  - `apps/web/app/solution-walkthrough.tsx`: new component `ProblemSolution` with "Try it yourself first" `<details>` reveal, complexity badge, section jumping nav outline, section-by-section markdown rendering, `approachSlots` props slot for plan 0076, and reference solution code (`SolutionTabs` with C++, Java, Python, plus idea and complexity) placed directly under `## Optimal approach`.
  - `apps/web/app/problem-workspace.tsx`: removed "Show the solution" `<details>` block from `ProblemHelp` so Hints displays only hints. Exported `SolutionCode`.
  - `apps/web/app/dsa/[id]/page.tsx`: tabs placed in order `Description`, `Hints`, `Solution` (with `?tab=interview` alias mapping to `solution`), followed by `Notes`, `Ask AI`, `Submissions`, `Stuck log`, `Pattern`.
  - `apps/web/lib/dsa-filters.ts`: updated `PROBLEM_TABS` to include `solution` and map `tab=interview` to `solution`.
- **AI Helper**:
  - `packages/shared/src/ai-prompts.ts`: walkthrough injected into prompt when solution reveal is requested.
  - `apps/web/lib/ai/context.ts`: includes walkthrough markdown for AI context upon reveal request.
- **Content**:
  - `packages/shared/content/interview/*.md`: all 486 problem walkthroughs authored according to plan rules.
  - `packages/shared/src/judge/generated/interview.ts`: compiled bundle of all 486 walkthroughs generated by `pnpm interview:build`.
- **Tests**:
  - `packages/shared/src/judge/interview.test.ts`: test suite for checker, headings, frontmatter, word count, forbidden phrases, and generated bundle integrity (12 tests passed).
  - `packages/shared/src/ai-prompts.test.ts` & `apps/web/lib/ai/context.test.ts`: AI prompt & context tests (14 tests passed).
  - `apps/web/lib/dsa-filters.test.ts`: tab parsing and `interview` alias tests (26 tests passed).
  - `apps/web/app/dsa/dsa.test.ts`: tests for Solution tab rendering with walkthrough, Hints tab without solution, fallback for problems without walkthrough, and `?tab=interview` alias (13 tests passed).

### Notes for the lead
The batch writers flagged the following problems where the stored reference code is suboptimal or where statement/algorithmic nuances exist for follow-up plans (e.g. plan 0076 / 0077):
1. **`lc-49` (Group Anagrams)**:
   - Stored reference code uses sorted string key ($O(n \cdot k \log k)$). Truly optimal approach explained in walkthrough is character count frequencies ($O(n \cdot k)$).
2. **`lc-432` (All O`one Data Structure)**:
   - Stored reference code uses `std::map<int, std::unordered_set<string>>` ($O(\log K)$ operations). Truly optimal approach explained in walkthrough uses a doubly-linked list of count buckets ($O(1)$ operations).
3. **`c-euler-14` (Longest Collatz Sequence)**:
   - Stored reference code recomputes sequences. Walkthrough details memoization of Collatz lengths up to $10^6$.
4. **`c-euler-21` (Amicable Numbers) & `c-euler-23` (Non-abundant Sums)**:
   - Stored reference code uses $O(N \sqrt{N})$ trial division. Walkthrough highlights linear divisor sieve ($O(N \log \log N)$ or $O(N \log N)$).
5. **`c-cf-158b` (Taxi)**:
   - Stored reference code sorts or scans; optimal approach uses $O(n)$ frequency counting and greedy pairing.
6. **`c-cf-148a` (Insomnia Cure)**:
   - Direct simulation takes $O(d)$ time. Walkthrough notes that for $d \le 10^{18}$, the Principle of Inclusion-Exclusion (PIE) in $O(1)$ is optimal.
7. **`cses-tasks-and-deadlines`**:
   - The greedy ordering sorts solely by processing duration $a_i$ ascending, ignoring deadlines during sorting, because the sum of all deadlines is an invariant constant.
8. **Iterative tree traversals on CSES trees ($N = 200,000$)**:
   - E.g. `cses-tree-distances-i`, `cses-tree-distances-ii`, `cses-fixed-length-paths-i`, `cses-path-queries-ii`, `cses-distinct-colors`, `cses-finding-a-centroid`. Walkthroughs emphasize iterative topological sweeps / BFS over deep recursive DFS to avoid call stack overflows.
9. **`cses-convex-hull`**:
   - Problem statement explicitly requires collinear points on boundary edges. Andrew's monotone chain must pop strictly clockwise turns (`cross < 0` instead of `<= 0`) to preserve collinear points.

### Verification
- `pnpm interview:check`: OK (486 files passed).
- Targeted test suites: `apps/web/app/dsa/dsa.test.ts`, `packages/shared/src/judge/interview.test.ts`, `packages/shared/src/ai-prompts.test.ts`, `apps/web/lib/ai/context.test.ts`, `apps/web/lib/dsa-filters.test.ts` all passed (78 tests total).
- `pnpm check`: Lint, typecheck, full test suite, and Next.js build all passed cleanly with 0 errors.

## Review

(reviewer fills in)
