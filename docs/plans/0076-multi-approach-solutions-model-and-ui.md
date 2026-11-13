# 0076: Several solution approaches per problem (model, tooling, UI, AI helper)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-13
- **Implemented by:** (implementer fills in)
- **Spec:** extends plan 0063 (reference solutions in three languages) and plan 0067 (AI helper)
- **Companion:** plan 0077 (audit and authoring) writes the content on top of this model. Build 0076 first.

## Goal

Each problem can show **several reference solutions that go from brute force to optimal**, each with its time and space
complexity, why it is slower or faster than the next, and when an interviewer would prefer it. Where there is a
time-versus-space trade-off the solutions are separate entries (Two Sum: brute force, sort plus two pointers, hash map).
Every approach exists in C++, Java and Python and must pass the same tests through the existing verifier. Today a problem
has exactly one solution per language, and it is not always the one an interviewer expects.

## Context (verified 2026-11-13)

- Java and Python solutions are flat files `packages/shared/content/solutions/<problem-id>.java|.py` (973 files now).
  Problem ids contain dashes (`cses-weird-algorithm`, `c-euler-1`) and no dots. The first line `# verify: skip-stress` in a
  `.py` file skips large inputs. Rules: `docs/solutions.md`.
- C++ lives on the problem: `ProblemSpec.solution: { idea: string[]; complexity: string; cpp: string }`
  (`packages/shared/src/judge/types.ts` line 62) in `packages/shared/src/judge/problems-*.ts`.
- `scripts/solutions.mjs` (`readSolutionFiles`, `renderGenerated`, `checkFiles`, `generatedIsCurrent`, commands `build`,
  `check`, `status`, `todo`) writes `packages/shared/src/judge/generated/solutions.ts`
  (`SOLUTIONS: Record<id, { java?, python? }>`, about 640 KB today). Only the lead runs `pnpm solutions:build`.
- `packages/shared/src/judge/solutions.ts` exports `SolutionLang`, `SOLUTION_LANGS`, `SOLUTION_LANG_LABEL`,
  `hasBundledSolutions(spec)`, `solutionCode(spec, lang)`, `solutionLangs(spec)`. Server code only.
- Verifier: `scripts/solutions-verify.mjs` -> `apps/web/lib/judge/solutions-verify.test.ts` (`verifyFile`, skipped unless
  `SOLUTIONS_FILES` is set). It derives the id from the file name (`name.slice(0, -ext.length)`), so a dotted name would
  break it today; it does not yet run `.cpp` files.
- Structural tests: `packages/shared/src/judge/solutions.test.ts`, `apps/web/lib/judge/solutions-files.test.ts`.
- UI: `apps/web/app/problem-workspace.tsx` ("Show the solution" `<details>` at about line 100, then `SolutionCode`),
  `apps/web/app/solution-tabs.tsx` (`SolutionTabs`, remembers the language in `localStorage` key `zen-dojo.solution-lang`).
  `spec.solution.idea` and `spec.solution.complexity` are printed above the tabs. The page that hosts it is
  `apps/web/app/dsa/[id]/page.tsx`; `apps/web/app/judge-workspace.tsx` is the editor side (not changed here).
- AI helper: `apps/web/lib/ai/context.ts` (`parseChatRequest`, `buildChat`; `revealSolution` boolean is read from the body
  and `spec.solution` is passed to the prompt only when it is true), `packages/shared/src/ai-prompts.ts`
  (`buildChatMessages`, `SolutionInfo`, the `reveal` block near line 91 to 112), `apps/web/app/dsa/ai-chat.tsx`
  (`reveal` state, `post(..., revealNow)`), route `apps/web/app/api/ai/chat/route.ts`.
- Content packs: `packages/shared/src/packs.ts` (`PackProblem.solution?: { idea, complexity, cpp? }`, validation near line
  192), `docs/content-packs.md` line 125. Stored (admin or pack) problems keep C++ only; `hasBundledSolutions` guards that.
- Finding that motivated this plan: Group Anagrams (`lc-49`) uses the sorted word as the key in C++
  (`problems-leetcode-2.ts` around line 683, complexity text "O(n * k log k) time"), in `lc-49.java` and in `lc-49.py`. Its own hint
  says a 26-count key is O(k) per word. So the stored reference is the slower of the two. Also `lc-242` (Valid Anagram) and
  `lc-125` do not exist as problems.

## Decision (recommended)

**One metadata file per problem plus one code file per approach and language.** Not front matter per file (it would repeat
the same text in three languages and drift), not a folder per problem (it breaks every path the scripts and docs use).

```
packages/shared/content/solutions/
  lc-1.java                      legacy file, still valid: the approach with slug "default"
  lc-1.py
  lc-1.approaches.json           NEW, optional: the list of approaches and their text
  lc-1.brute-force.java|.py|.cpp NEW, one per approach and language
  lc-1.sort-two-pointers.java|.py|.cpp
  lc-1.hash-map.java|.py|.cpp
```

Rules:

- File name is `<problem-id>.<slug>.<ext>`; `<slug>` is `[a-z0-9-]+`. The id never contains a dot, so split on the first
  dot. The unsuffixed `<id>.java|.py` is the approach with slug `default`; its C++ is `spec.solution.cpp`. A problem without
  an `.approaches.json` is a one-approach problem and **keeps working unchanged** (no migration needed on day one).
- A new `.cpp` extension is allowed in the folder only for suffixed files (`<id>.<slug>.cpp`). C++ for slug `default` stays on
  the spec.
- `<id>.approaches.json`:

```json
{
  "approaches": [
    {
      "slug": "brute-force",
      "title": "Brute force",
      "kind": "brute",
      "time": "O(n^2)",
      "space": "O(1)",
      "idea": "Try every pair of indices.",
      "why": "Two nested loops over n items.",
      "tradeoff": "Uses no extra memory, but is too slow once n reaches about 10^5.",
      "whenToPrefer": "Say it first in an interview to show you have a correct baseline; then improve it.",
      "verify": { "skipStress": ["python", "java", "cpp"] }
    },
    { "slug": "hash-map", "title": "Hash map", "kind": "optimal", "recommended": true,
      "time": "O(n)", "space": "O(n)", "idea": "...", "why": "...", "tradeoff": "...", "whenToPrefer": "..." }
  ]
}
```

  - `kind` is one of `brute`, `better`, `optimal`, `time` (fastest, spends memory), `space` (least memory, spends time).
    Array order is display order (brute force first, optimal last); there is exactly one `recommended: true`, and it is the
    approach the AI helper and "Load into editor" style features treat as the main one.
  - `slug` `default` is allowed and maps to the legacy unsuffixed files and the spec's C++.
  - `verify.skipStress` lists languages whose large inputs are skipped for this approach (intentionally too slow). The
    examples and tests are **always** run. The legacy first-line `# verify: skip-stress` in a `.py` file keeps working for the
    `default` approach and is also accepted on suffixed `.py` files.
  - Text limits: `idea` 300 chars, `why` and `tradeoff` and `whenToPrefer` 400 chars each, `time` and `space` 60 chars.
- If an `.approaches.json` exists, **every listed approach must have java, python and cpp** (cpp for `default` is the spec's),
  and files with a slug not listed are an error.

Migration path: nothing is forced. When an author adds approaches to a problem, the existing `<id>.java|.py` becomes the
approach `default` (usually renamed in the json to its true kind) or is `git mv`-ed to `<id>.<slug>.java|.py` and the C++ is
copied to `<id>.<slug>.cpp`. The spec's `solution.idea` and `solution.complexity` stay as the **summary of the recommended
approach** and keep feeding the AI helper and packs. Plan 0077 decides which problems to convert.

## Out of scope

- Writing the actual extra solutions (plan 0077).
- Changing any `problems-*.ts` test data or any existing `solution.cpp`.
- Approaches for stored (admin or pack) problems in the app database; packs get the field in the format only (step 8).
- Changing the judge, the editor (`judge-workspace.tsx`), or the hint text.
- Running `pnpm solutions:build` (lead only); the implementer of this plan runs it **once at the very end** only because
  plan 0076 is the tooling plan. Content authors never run it.

## Steps

Targeted tests only (`pnpm exec vitest run <file>`, `pnpm -r typecheck`). One `pnpm check` at the very end. Follow `AGENTS.md`.
Do not run `pnpm test`.

- [ ] **1. Shared types and parser.** Create `packages/shared/src/judge/approaches.ts` (pure, no I/O):
  `ApproachKind`, `ApproachMeta` (fields above), `Approach = ApproachMeta & { code: Partial<Record<SolutionLang, string>> }`,
  `parseApproachesJson(text: string): { ok: true; approaches: ApproachMeta[] } | { ok: false; error: string }` enforcing the
  limits, unique slugs, a valid `kind`, exactly one `recommended`, `kind: "brute"` first when present. Re-export from
  `packages/shared/src/index.ts` if other judge types are exported there (check how `ProblemSpec` is exported).
  - Done when: `packages/shared/src/judge/approaches.test.ts` covers a valid file and each error (duplicate slug, two
    recommended, none recommended, over-long text, bad kind, malformed JSON) and passes.
- [ ] **2. Folder reader and file-name rule.** In `scripts/solutions.mjs` extend `readSolutionFiles` so a name
  `<id>.<slug>.<ext>` (ext `java`, `py`, `cpp`; `cpp` only with a slug) yields `{ id, slug, lang, name, code }` and
  `<id>.approaches.json` yields `{ id, approachesJson }`. Update `EXT` and the id split (first dot). Keep `<id>.java|.py`
  returning `slug: "default"`. `checkFiles` errors: unknown id, unknown slug (not in the json), a json without all three
  languages for a slug, a suffixed file without a json, an unparsable json (reuse the step 1 parser; because the script is
  plain `.mjs` that already uses `register-ts.mjs`, import the TypeScript parser).
  - Done when: `apps/web/lib/judge/solutions-files.test.ts` has new cases for each error and for a valid three-approach
    fixture in a temp dir, and the old cases still pass unchanged.
- [ ] **3. Bundle format.** `renderGenerated` keeps `SOLUTIONS` exactly as today (java/python of the `default` approach) so
  nothing existing breaks, and additionally writes `APPROACHES: Record<id, { approaches: ApproachMeta[]; code: Record<slug, { java?: string; python?: string; cpp?: string }> }>`.
  Sorted by id then by array order; deterministic. Write it to a **second file** `packages/shared/src/judge/generated/approaches.ts`
  so the existing 640 KB file does not grow; `generatedIsCurrent` checks both. Add a size note in
  *Implementation notes*: if the two files together exceed 2 MB, split `APPROACHES` per solution group (`d`, `e`, `f`) and load
  it with a dynamic `import()` in `solutions.ts` (server only).
  - Done when: `pnpm solutions:check` is clean with an empty `APPROACHES = {}`; the unit test for `renderGenerated` shows both
    outputs for a fixture and detects staleness of either.
- [ ] **4. Read API.** In `packages/shared/src/judge/solutions.ts` add
  `solutionApproaches(spec): Approach[]` (built-in problems only, via `hasBundledSolutions`; when no json exists it returns one
  synthetic approach `{ slug: "default", title: "Reference solution", kind: "optimal", recommended: true, time/space parsed
  from spec.solution.complexity or left as the full complexity string in `time`, code from `solutionCode` }`) and
  `recommendedApproach(spec)`. Keep `solutionCode(spec, lang)` and `solutionLangs(spec)` returning the recommended approach, so
  every caller that exists today is unchanged. For `default` use `spec.solution.cpp`; for others read the bundle.
  - Done when: `solutions.test.ts` has cases: a problem with no json gives one approach equal to today's output; a fixture
    spec with three approaches returns them in order with the recommended one flagged; a stored problem (own `solution.cpp`
    different from the bundled one) returns one approach with C++ only.
- [ ] **5. Verifier.** In `apps/web/lib/judge/solutions-verify.test.ts` change the id/slug derivation to split on the first
  dot, accept `.cpp`, look up `verify.skipStress` from the json (and keep the first-line marker), and run
  `runCode(target, "cpp" | "java" | "python", code)` (check `JUDGE_LANGS` in `packages/shared/src/judge` includes cpp; it does).
  Result lines become `ok lc-1.hash-map.java 1.2s`. In `scripts/solutions-verify.mjs`: ids expand to **all** files of the
  problem (default plus every approach, three languages); add `--approach <slug>`; `--group` includes suffixed files. A
  problem with approaches and a `recommended` approach whose complexity text is empty is a FAIL.
  - Done when: with a temp-folder fixture for `lc-1` (brute force, sort plus two pointers, hash map, each in three languages),
    `pnpm solutions:verify lc-1` prints nine `ok` lines; a deliberately wrong `lc-1.hash-map.py` prints `FAIL` with the case;
    a brute-force file listed in `skipStress` passes while its large inputs are skipped; without `SOLUTIONS_FILES` the file is
    skipped as before. (Do not leave fixtures in `packages/shared/content/solutions`.)
- [ ] **6. Status and todo commands.** `pnpm solutions:status` additionally prints, per group, how many problems have an
  `.approaches.json`, how many approaches in total, and every `skipStress` use. `pnpm solutions:todo <group>` is unchanged
  (it still lists missing default solutions).
  - Done when: `pnpm solutions:status` runs and shows the new lines with 0 approaches.
- [ ] **7. Problem page UI.** Replace the body of the "Show the solution" section in
  `apps/web/app/problem-workspace.tsx` (the `SolutionCode` component and the idea/complexity block) with a new client
  component `apps/web/app/approach-viewer.tsx`. The server component highlights each approach and language with the existing
  `Code` component and passes ready nodes (as `SolutionTabs` does today). Behaviour:
  - Single-approach problems render **exactly as today** (idea paragraphs, complexity line, language tabs, the muted
    "Java and Python solutions are being added" line). No selector appears.
  - Multi-approach: a stepper `role="tablist"` labelled "Solution approach" with one button per approach in order
    ("1 Brute force", "2 Sort and two pointers", "3 Hash map"), the recommended one marked with a small "Recommended" label.
    The first approach is open by default; the user can open any (no second gate; the whole section is already behind
    "Show the solution"). Remember the last approach index per problem in `localStorage` (key `zen-dojo.solution-approach.<id>`,
    try/catch, same pattern as `solution-tabs.tsx`); the language tab key `zen-dojo.solution-lang` is shared across approaches.
  - Under the stepper: chips `Time O(n^2)` and `Space O(1)`, the `idea` sentence, then two short labelled lines "Why it
    is slower or faster" (`why`) and "Trade-off" (`tradeoff`), and "An interviewer prefers it when" (`whenToPrefer`). Then the
    existing `SolutionTabs` with that approach's code (read-only, `maxHeight="24rem"`).
  - Between approaches show a one-line comparison when the previous approach exists: "Faster than 1: O(n^2) to O(n); costs O(n)
    extra space." Generate it from the chips' text only if both strings are short; otherwise omit it (do not invent text).
  - Mobile (width about 375 px): the stepper scrolls horizontally inside its own container (`overflow-x-auto`), chips wrap,
    code blocks keep their own horizontal scroll, no page-level horizontal scroll. Buttons at least 36 px tall.
  - Theme tokens only (`bg-surface`, `text-muted`, `border-line`, `bg-accent`); keyboard: left and right arrows move between
    approach tabs (and the same for the existing language tabs only if trivial; not required).
  - Done when: `pnpm dev` with a temp fixture for one problem shows the stepper, chips, text and three language tabs; a
    normal problem looks unchanged; checked at 375 px and desktop width, light and dark. Component logic that is not
    rendering (choosing the active approach from a remembered value) is in a pure function covered by
    `apps/web/app/approach-viewer.test.ts`.
- [ ] **8. AI helper reveal rules.** The gate stays: nothing about any solution reaches the prompt unless the request has
  `revealSolution: true` (unchanged in `parseChatRequest` and `buildChat` in `apps/web/lib/ai/context.ts`). New optional
  request field `approachIndex` (integer, default 0): the highest approach the learner has opened, sent by
  `apps/web/app/dsa/ai-chat.tsx` only when it already sends `revealSolution: true`. In `buildChat` build `SolutionInfo` from
  `solutionApproaches(spec)` limited to approaches `0..approachIndex` (metadata and, for the recommended one only if included,
  its C++ code); if the recommended approach is not yet included, the prompt says "the learner has seen approaches up to N;
  do not reveal later approaches unless asked" and gives their titles and complexities only. In
  `packages/shared/src/ai-prompts.ts` extend `SolutionInfo` with optional `approaches?: { title; kind; time; space; idea; why;
  tradeoff; whenToPrefer }[]` and print them in the existing reveal block (clipped like the current fields). `ai-chat.tsx` learns
  the opened index from a small shared client store or a prop passed from the problem page; if that wiring is large, send 0 and
  record it in *Found but not changed*.
  - Done when: `apps/web/lib/ai/context.test.ts` and `packages/shared/src/ai-prompts.test.ts` have cases: reveal false puts no
    approach text in the messages; reveal true with index 0 includes only the first approach; a problem without a json behaves
    exactly as today (existing assertions unchanged). `apps/web/app/api/ai/chat/route.test.ts` still passes.
- [ ] **9. Content-pack format.** In `packages/shared/src/packs.ts` accept an optional `solution.approaches: { slug, title, kind,
  time, space, idea, why, tradeoff, whenToPrefer, recommended?, cpp? }[]` with the same limits (code is C++ only for packs).
  Validate with the step 1 parser (cpp optional). Show them with `ApproachViewer` (C++ tab only). Document the field in
  `docs/content-packs.md` next to line 125 and say that Java and Python approaches are built-in only.
  - Done when: `packs` tests cover a valid pack with two approaches and the errors; docs updated; an old pack without the
    field validates exactly as before.
- [ ] **10. Docs.** Update `docs/solutions.md`: the new file names, `.approaches.json` format, skip marker, the commands'
  new output, and the rule "same I/O contract in every approach; the order is brute force first, recommended last".
  Add a short "Two approaches example" with the Two Sum json from this plan (text only, no files added to the folder).
  - Done when: a reader with no context can add `<id>.approaches.json` and three files for one problem and verify them.
- [ ] **11. Bundle once.** Run `pnpm solutions:build` once; the two generated files should be identical in content to before
  for `SOLUTIONS` and `APPROACHES = {}`.
  - Done when: `git diff --stat` shows `generated/approaches.ts` new and `generated/solutions.ts` unchanged.

## Tests (summary)

New or extended: `approaches.test.ts`, `solutions.test.ts`, `solutions-files.test.ts`, `solutions-verify.test.ts` (fixture run
with `SOLUTIONS_FILES`), `approach-viewer.test.ts`, `context.test.ts`, `ai-prompts.test.ts`, packs tests. Run each with
`pnpm exec vitest run <file>`.

## Acceptance criteria

- [ ] A problem with no `.approaches.json` looks and behaves exactly as before (page, AI helper, packs, bundle `SOLUTIONS`).
- [ ] A problem with three approaches shows a stepper (brute force to optimal), per-approach Time and Space chips, idea, why,
      trade-off and "when preferred" text, and C++/Java/Python tabs for each approach; usable at 375 px.
- [ ] `pnpm solutions:verify <id>` checks every approach in every language with the real judge; an intentionally slow approach
      is marked in the json and still passes all examples and tests.
- [ ] `pnpm solutions:check` rejects: a suffixed file without a json entry, a json entry missing a language, two or zero
      recommended approaches, an unknown id.
- [ ] The AI helper sends no solution text unless `revealSolution` is true, and then only the approaches the learner opened
      (or index 0).
- [ ] Packs with `solution.approaches` validate and show; old packs are unchanged.
- [ ] `docs/solutions.md` and `docs/content-packs.md` describe the format.
- [ ] `pnpm check` passes (run once at the end).
- [ ] No changes to `problems-*.ts` or to existing files in `packages/shared/content/solutions/`.

## Pitfalls

- Problem ids have dashes but no dots; do not split on `-`. Do not change an id.
- `verifyFile` uses the file name for the id today; update it before adding suffixed fixtures or it reports "not a problem id".
- The generated bundle is large and server-only. Never import `generated/*` from a client component; pass strings or ready
  nodes from the server (as `problem-workspace.tsx` does).
- CRLF: the reader normalises to `\n`; the json parser must accept CRLF and a BOM.
- Hydration: do not read `localStorage` during render; use `useSyncExternalStore` as `solution-tabs.tsx` does.
- Keep `spec.solution.idea/complexity` as the recommended approach's summary or the AI helper and packs go out of sync with the page.
- Windows: use `pnpm.cmd` in PowerShell. Never touch `data/habit.db`.

## Open questions

(Implementer: write questions here and set the status to `blocked`.)

## Implementation notes

(Implementer fills in.)

## Review

(Reviewer fills in.)
