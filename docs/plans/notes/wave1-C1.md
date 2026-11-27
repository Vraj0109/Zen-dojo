# Wave 1, C1: inventory, templates, file mappers

Plan 0112 steps 1 and 2. Owner files only: `packages/shared/src/content-model/` `templates.ts`, `from-files.ts`,
`to-spec.ts`, `lesson-map.ts` and their tests. No existing content file was changed.

## Step 1: inventory of content constants

Counts from a scratch script that imports the real exports (not committed). "Target" is the content table.

### Problems

| Constant (file) | TS type | Count | Target |
|---|---|---|---|
| `JUDGE_PROBLEMS` (`judge/index.ts`), merged from `LEETCODE_SPECS*`, `CSES_SPECS*`, `CSES_RANGE_SPECS`, `CSES_TREE_SPECS`, `OTHER_SPECS`, `LOGIC_SPECS_*`, `PROBLEMS_LOGIC_D`, `DESIGN_SPECS_A-C`, `SPECIAL_SPECS` (`judge/problems-*.ts`) | `Record<string, ProblemSpec>` | 486 | `problems` + `test_cases` + `hints` + `page_sections` (statement, solution) |
| Subsets `CSES_PROBLEMS` 136, `LOGIC_PROBLEMS` 150, `OTHER_PROBLEMS` 2 | `Record<string, ProblemSpec>` | (subsets) | derived, not separate |
| `CSES_SPECS_*`, `CSES_RANGE_ENTRIES`, `CSES_TREE_ENTRIES`, `LOGIC_ENTRIES_C` etc. | `ProblemSpec[]` / entries | (part of 486) | same problems |
| `SOLUTIONS` (`judge/generated/solutions.ts`) | `Record<id, {java?, python?}>` | 486 keys | `problem` extra → `code` block (variant optimal, java/python) |
| `BRUTE` (same file) | `Record<id, {cpp?, java?, python?}>` | 315 | `problem` extra.brute → `code` block (variant brute) |
| `INTERVIEW` (`judge/generated/interview.ts`) | `Record<id, {md, optimal, reviewed}>` | 486 | `problem` extra.interviewMd → solution sections (frontmatter kept as `_interviewFrontmatter`) |
| `STRESS*` (`judge/stress*.ts`) | `StressCase[]` with `make: () => unknown[]` | many | **code, skipped**: never stored |
| `SOLUTION_GROUPS` (`judge/solution-groups.ts`) | ownership metadata | 10 groups | not content: file ownership |
| `PROBLEMS` (`dsa.ts`) | roadmap list | 496 | **not mapped yet** (see questions: 496 vs 486) |
| `DSA_GROUPS` 10, `ALL_PATTERNS` 76 | roadmap metadata | | not mapped (pattern ids are the `problems.pattern` values) |

### Concept lessons, design and LLD walkthroughs, patterns

| Constant (file) | TS type | Count | Target |
|---|---|---|---|
| `LESSONS` (`learn/index.ts`, from `learn/generated/lessons.ts`) | `Record<id, Lesson>` | 89 | `lessons` template `concept`, course `sd`/`lld`/`core` |
| `LESSON_EXTRA` (same) | `Record<id, LessonExtra>` | 89 | concept extra (recap, deeper) into the same lesson |
| `STUDY_AREAS` (`study.ts`): `SYSTEM_DESIGN` 32 concepts, `LOW_LEVEL_DESIGN` 33, `CORE_CS` 24 | `StudyArea[]` | 3 areas, 89 concepts | `courses` (3 rows); concept checklists in `lessons.meta.points` and as point titles |
| Study exercises: `SYSTEM_DESIGN.exercises` 27, `LOW_LEVEL_DESIGN.exercises` 24, `CORE_CS` none | in `StudyArea.exercises` | 51 | `courses.data.exercises` (ids equal the design and LLD lesson ids) |
| `WALKTHROUGHS` (`learn/index.ts`, `designs-a/b.ts`) | `Record<id, Walkthrough>` | 27 | `lessons` template `design` |
| `DESIGN_DEEP` (`learn/design-depth-*.ts`) | `Record<id, WalkthroughDeep>` | 27 | design lesson (diagrams, deep sections; architecture, criteria, code in `meta`) |
| `WALKTHROUGH_EXTRA` (`learn/design-extra.ts`) | `Record<id, WalkthroughExtra>` | 27 | design lesson (recap, follow-ups) |
| `LLD_GUIDES` (`learn/lld.ts`) | `Record<id, LldGuide>` | 24 | `lessons` template `lld` |
| `LLD_DEEP` (`learn/lld-deep-*.ts`) | `Record<id, LldDeep>` | 24 | LLD lesson (walkthrough, diagrams, concurrency) |
| `LLD_EXTRA` (`learn/lld-extra.ts`) | `Record<id, LldExtra>` | 24 | LLD lesson (recap, flow, edge cases) |
| `LLD_PROJECTS` (`learn/lld-projects-*.ts`) | `Record<id, LldProject>` (Java files, tests) | 24 | `docs` kind `lld-project` (code bundle, not a page) |
| `PATTERN_GUIDES` (`learn/dsa-*.ts`) | `Record<id, PatternGuide>` | 76 | `lessons` template `pattern`, id `pattern-<id>`, course `dsa-patterns` |
| `PATTERN_ARTICLES` (`learn/dsa-articles-*.ts`, `dsa-sites-articles-*.ts` are included) | `Record<id, PatternArticle>` | 71 | `lessons` template `article`, id `article-<id>`, course `dsa-patterns` |
| `DSA_SITES_GUIDES`, `DSA_SITES_ARTICLES_*` | `Record<...>` | (inside 76 / 71) | merged into the two records above |
| `MEETING_DEEP`, `WALLET_*`, `API_GATEWAY_*`, `*_GUIDE`, `*_EXTRA`, `*_DEEP` in `lld-deep-*.ts` | parts | (inside the records above) | not separate targets |
| `DESIGN_EXTRA` = `WALKTHROUGH_EXTRA` | | | same as above |
| `learn/generated/lessons.ts` `GENERATED_LESSONS` | `Record<id, GeneratedLesson>` | 89 | source of `LESSONS` and `LESSON_EXTRA` |

### Docs (list-like data, body = the constant)

| Constant (file) | TS type | Count | `docs.kind` |
|---|---|---|---|
| `READING` (`reading.ts`) | `Reading[]` | 65 | `reading` |
| `LAST_DAYS_PLAN` (`revise.ts`) | `PlanPhase[]` | 4 | `revise-plan` |
| `KEY_NUMBERS` (`revise.ts`) | `{title, rows}[]` | 3 | `key-numbers` |
| `COMPLEXITY_TABLE` (`revise.ts`) | `[string, string][]` | 11 | `complexity-table` |
| `QUIZ_DECK` (`revise.ts`) | `QuizCard[]` | 340 | `quiz-deck` |
| `CP_ALGO_ARTICLES` (`cp-algorithms.ts`) | `Record<string, string[]>` | 42 keys | `cp-algorithms` |
| `CONSTRAINT_HINTS` (`thinking-map.ts`) | array | 12 | `constraint-hints` |
| `LEETCODE_TAGS` (`thinking-map.ts`) | `string[]` | 71 | `leetcode-tags` |
| `THINK_PATTERNS` (`thinking-map.ts`) | `Record<id, ThinkPattern>` | 82 | `think-patterns` |
| `THINK_SIGNALS` (`thinking-map.ts`) | array | 16 | `think-signals` |
| `READING_ROUTINE` (`thinking-map.ts`) | `ReadStep[]` | 6 | `reading-routine` |
| `CLUES` (`thinking-map.ts`) | array | 132 | `clues` |
| `WORKED_EXAMPLES` (`thinking-map.ts`) | array | 30 | `worked-examples` |
| `OPTIMIZE_MOVES` (`thinking-map.ts`) | array | 37 | `optimize-moves` |

### Skipped (code, or not learner content)

- Functions, stay in code: `judge/templates.ts` (`templateFor`, `cppType` etc.), `judge/design.ts`, `judge/stress-gen.ts`,
  `learn/diagram-sources.ts` (`allDiagrams()`), `learn/index.ts` (`lldGuide()`, `readingMinutes()`), `revise.ts`
  (`quizCards`, `pickCard`, `seededRandom`), `study.ts` (`practiceState` etc.), `dsa.ts` functions, `reading.ts` `readingFor`,
  `cp-algorithms.ts` `cpAlgoUrl`, `thinking-map.ts` none.
- App logic or config, stays in code (per plan 0112 out-of-scope): `plan.ts`, `plan-weeks.ts`, `focus.ts` (`WEEK_FOCUS`),
  `game.ts`, `stats.ts` (`BADGES`), `portfolio.ts`, `freeze.ts`, `version.ts`, `packs.ts` and `content-items.ts` (format
  constants), `ai-*.ts` (model tiers, install commands, prompt limits), `tool-catalog.ts`, `tool-hints.ts`.
- Question for the lead: `buddy-lines.ts` (`BUDDY_LINE_EVENTS`, UI copy) and `buddy.ts` (`PROBLEM_MICRO_STEPS`): short
  UI text, not learner pages. Kept in code in this draft.
- Judge internal: `judge/solution-groups.ts` is ownership metadata.

Totals that matter for the seed: 486 problems, 89 concept lessons, 27 design, 24 LLD, 76 pattern, 71 article lessons,
3 courses, 14 docs kinds with the counts above, 24 `lld-project` docs. Lessons: 89 + 27 + 24 + 76 + 71 = 287.

## Files created

- `packages/shared/src/content-model/templates.ts`: `TEMPLATES`, `pageTemplate(id)`, `slotKey(stored)`,
  `validatePageAgainstTemplate(template, page)` (returns a list of problems; empty = fits).
- `packages/shared/src/content-model/from-files.ts`: `problemFromSpec(spec, extra)`, `buildPage`, `sectionInput`,
  `codeLangOf`, `parseInterview`, `solutionSections`, `langCodeOf`, `md`, `codeBlock`, `BRUTE_SAME_TEXT`,
  `ProblemExtra` type.
- `packages/shared/src/content-model/to-spec.ts`: `specFromContent(p, stress?)`.
- `packages/shared/src/content-model/lesson-map.ts`: `lessonFromFile(kind, id, value, ctx)`, `lessonToShape(lesson)`,
  `docFromFile(kind, id, value)`, `lldProjectDoc`, `courseFromStudyArea(area, ord)`, `DOC_KINDS`, `PATTERN_COURSE_ID`,
  value types `ConceptValue`, `DesignValue`, `LldValue`, `PatternValue`, `ArticleValue`, `LessonValue`, `LessonCtx`.
- Tests: `from-files.test.ts` (7 tests), `lesson-map.test.ts` (9 tests).

## Test results

- `pnpm exec vitest run packages/shared/src/content-model/from-files.test.ts packages/shared/src/content-model/lesson-map.test.ts`
  → `Test Files  2 passed (2)`, `Tests  16 passed (16)`.
- `pnpm exec vitest run packages/shared/src/content-model` (includes other agents' files at the time)
  → `Test Files  8 passed (8)`, `Tests  81 passed (81)`.
- `cd packages/shared && npx tsc --noEmit` → exit 0 (no errors in any file at the time of the run).

What the tests prove: the judge fields round-trip for all 486 problems (`specFromContent(problemFromSpec(spec, extra))`
equals the spec, stress excluded); 3 chosen problems have the expected block order and labels (`abc151-a` brute: same;
the first design problem; the first problem with Java, Python and brute in all languages); every learn/ value round-trips
through `lessonFromFile`/`lessonToShape` exactly (89, 27, 24, 76, 71); every page fits its template; every doc body equals
its constant; ids are equal on two runs and unique within a lesson.

## Deviations and why

1. **`pageTemplate(id)` instead of `templateFor(id)`**: the lead's correction (name taken by `judge/templates.ts`).
2. **`validatePageAgainstTemplate` added** (plan 0112 step 2 names it). Checks unknown slots, `point:N` format, block types,
   required slots present, one-section slots. It does not require titles on many-slots (solution sections may be untitled).
3. **Presence by section**: an optional list that is present but empty is kept as a section with zero blocks (for example
   `mistakes`, `recap` marker of `extra`). Absent means no section. The editor and seed must not drop empty sections.
4. **Solution page order** follows `solution-walkthrough.tsx`. Two changes where the Solution tab showed nothing:
   the brute code and the idea + optimal code are appended at the end when the walkthrough has no "brute force" or
   "optimal approach" section. The idea is shown once (first optimal section), the optimal code in each optimal section, as today.
5. **Solution page is many untitled-or-titled sections**. Pre-heading text has `title: null`.
6. **Internal keys in `row.extra`** with a leading underscore: `_kindOmitted`, `_unorderedFalse`, `_interviewFrontmatter`.
   `specFromContent` removes them. They keep `kind`/`unordered` exact (the judge treats missing and `false` differently).
7. **Lesson ids**: concepts keep their id; design and LLD keep the exercise id; patterns `pattern-<id>`; articles `article-<id>`.
8. **Slot names**: `point:N` (indexed), `overview`, `recap`, `deeper`, `questions`, `mistakes` (plan's name for common
   mistakes; the heading says "Common mistakes"). Design: `requirements`, `estimates`, `api`, `data`, `design`, `diagrams`,
   `dives`, `deep`, `tradeoffs`, `recap`, `follow-ups`. LLD: `requirements`, `entities`, `patterns`, `code`, `extensions`,
   `walkthrough`, `diagrams`, `extra-diagrams`, `concurrency`, `recap`, `flow`, `edge-cases`. Pattern: `idea`, `signals`,
   `steps`, `template`, `complexity`, `variations`, `pitfalls`, `recap`. Article: `intro`, `sections`.
9. **Diagram titles in LLD** are the slot section titles `class`, `sequence`, `state` (the shape has no titles for them).
10. **Code language**: a code block keeps one key in `code`. The language label (`Section.lang`) is kept in `label`.
    Unknown or missing languages use key `text`.
11. **LLD projects** are `docs` kind `lld-project`, not page content (they are compiled Java bundles).
12. **Structured meta**: design deep keeps `architecture`, `criteria`, `code` in `lessons.meta`; LLD keeps the presence flags.
13. **`PATTERN_COURSE_ID = "dsa-patterns"`** is a course that has no file. The seed must create it (question below).

## Questions for the lead

1. The DSA roadmap `PROBLEMS` (`dsa.ts`) has 496 entries, `JUDGE_PROBLEMS` has 486. Which list does `problems.pattern`
   come from, and are the 10 extra roadmap entries to be a doc or problems without a spec? I did not map them.
2. Is `meta` for design/LLD allowed to hold `architecture`, `criteria` and Java `code` (structured, not text)? Or should
   they be a doc kind per lesson (`design-extra`)?
3. Pattern guides and articles need a course row `dsa-patterns`. OK to create it in the seed, or should it be a file-free
   course in `content-model` (for example `PATTERN_COURSE`)?
4. `buddy-lines.ts` and `buddy.ts` hold UI copy. Are they content (a `docs` kind) or code?
5. Confirm `docs.kind` list (14 kinds plus `lld-project`). `cp-algorithms` and `think-patterns` are one doc each
   (body = the whole record), not one doc per key.

## Fields that `types.ts` lacks (worked around)

- No flag for "present but empty" (worked around with zero-block sections, see deviation 3).
- No place for a section's language on `Section` code blocks (worked around with `BlockRow.label`).
- No place for the interview frontmatter or the `kind`/`unordered` presence on `ProblemRow` (worked around with `row.extra`
  underscore keys).
- No `kind`/`template` tag for a list section (worked around by slot key only).
- `ProblemRow.fn` is typed with `params.type: string`; I cast the judge `Ty` to it (no runtime change).

## Found but not changed

- `judge/types.ts` says `solution.idea` paragraphs and `statement` are plain text with no backticks; the Markdown blocks
  I create render them as Markdown, so a stray `*` or `_` in a statement would now be read as Markdown by a renderer.
  Not changed here (the seed copies text as is).
- `interview` frontmatter `optimal` value is the complexity badge shown in the Solution tab; it is kept only in
  `row.extra._interviewFrontmatter` (raw text). The seed or the reader should parse it when needed.
- `lesson-map.ts` `docFromFile` takes any value; the test checks bodies, not schemas.
