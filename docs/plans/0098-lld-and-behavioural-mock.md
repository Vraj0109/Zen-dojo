# 0098: LLD machine-coding mock and behavioural mock

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0098-lld-and-behavioural-mock.html

## Goal

Two more interview kinds on the shared mock model:

1. **LLD machine-coding mock.** You get a written requirements spec (as in a real machine-coding round), a multi-file Java editor
   you can run, and a phase bar: clarify, model, code, extend. At the extend phase the interviewer adds a change request. You
   score yourself with an LLD rubric; the score goes to the exercise's practice record and Review schedule.
2. **Behavioural mock.** Three to five questions from the question bank (0095), a speaking timer per answer, a story picker from
   your story bank, a follow-up probe, and a rubric score. Weak answers mark the question shaky so it returns in practice.

## Context

- **Mock model (0096, do not redefine):** `mock_sessions`, `MockKind` `"lld"` and `"behavioral"`, stub files `rubrics-lld.ts`,
  `rubrics-behavioral.ts`, `phases-lld.ts`, `phases-behavioral.ts`, `MOCK_KIND_META`, `PhaseTimer`, `SESSION_VIEWS`, `ScoreForm`,
  `MockResult`, `lib/mock.ts` (`createMockSession`, `saveMockProgress`, `saveScores`). Its `saveScores` already bridges design and
  LLD rubrics to `logPractice` through each criterion's `stepId`, but only one criterion per `stepId` (the rubric test enforces
  unique `stepId`s). Read the merged 0096 first and use its exact names.
- **LLD prompts:** the 24 LLD exercises in `packages/shared/src/study.ts` (`LOW_LEVEL_DESIGN.exercises.items`, ids `lldp-parking-lot` ...
  `lldp-social-feed`) and the four phases `LLD_STEPS` (`clarify` 5, `model` 10, `code` 20, `extend` 10 = 45 minutes). A machine-coding
  round is often 60 to 90 minutes, so the setup offers 45, 60 and 90 through `scalePhases`.
- **Editor and runner:** `apps/web/app/components/project-editor.tsx` exports `ProjectEditor` (props `projectId`, `initialFiles`,
  `value`/`onChange` for controlled use, `storageKey`, `readOnly`, `noRun`, `reference`) and runs the project on the local judge
  (`lib/judge/run-project.ts`, `project-entry.ts`). `app/study/[area]/[id]/project-playground.tsx` is a small example of using it.
- **Reference answers (shown after the mock):** `LLD_PROJECTS` (full Java projects) and `LLD_DEEP`, `lldGuide(id)` from
  `packages/shared/src/learn/`; the study page is `/study/lld/<id>`.
- **Behavioural data (0095, do not redefine):** `packages/shared/src/behavioral/` (`BEHAVIORAL_QUESTIONS` with `id`, `text`,
  `principles`, `followUps`, `strong`, `weak`, `level`; `PRINCIPLES`; `nextQuestions`, `storyCoverage`), tables `stories` and
  `behavioral_progress`, data layer `apps/web/lib/behavioral.ts`. Step 0 reads the merged 0095 and copies the exact names; the
  setter that marks a question practised (status `shaky` or `solid`, `due_on`) is called by this plan, not rewritten.
- **Existing reading:** lessons `lld-oop`, `lld-solid`, `lld-patterns`, `lld-modeling` and the 27 pattern lessons (0093).
- Conventions: `AGENTS.md`. Content rules: our own words; no copied statements from LeetCode, GFG, books or company sites; no
  claims about what a company asks; numbers in prompts are examples.

## Data shapes (new)

`packages/shared/src/mock/lld-prompts-types.ts`

```ts
export interface LldMockPrompt {
  id: string;                    // "lldp-parking-lot"; must be a key of ALL_EXERCISES
  opening: string;               // 1-2 sentences, what the interviewer says first
  requirements: string[];        // 5-8 numbered requirements, given up front (machine coding states the spec)
  run: { demo: string; sample: { input: string; output: string }[] };  // what Main should show; 2-3 small sample runs
  extension: { say: string; touches: string[] };   // the change request at the extend phase; `touches` = classes it should reach
  edgeCases: string[];           // 3-5 things a careful candidate handles
  strong: string[];              // 4-6 signs of a strong answer
  weak: string[];                // 3-5 common weak signals
}
```

`packages/shared/src/mock/lld-prompts.ts`: `LLD_PROMPTS: Record<string, LldMockPrompt>` merged from `lld-prompts-a.ts` (ids 1-12) and
`lld-prompts-b.ts` (ids 13-24).

`packages/shared/src/mock/behavioral-mock.ts` (pure)

```ts
export interface BehavioralMockSettings {
  totalMinutes: number;              // derived: questions * 5
  questionIds: string[];             // 3-5 ids from BEHAVIORAL_QUESTIONS, in order
  set: "amazon" | "google" | "core" | "mixed";
  level: "all" | "senior";
  gapsFirst: boolean;
}
export interface PerQuestion {       // stored in transcript.extra.perQuestion (same order as questionIds)
  questionId: string;
  storyId: string | null;            // chosen from the story bank, or null ("a story not in my bank")
  notes: string;                     // bullet notes, max 800 chars
  answerS: number | null;            // seconds spoken before "Done answering"
  probeShown: string | null;         // the follow-up that was shown
  mark: "solid" | "shaky" | null;    // the person's own call after the mock
}
export function pickMockQuestions(
  questions: BehavioralQuestion[], stories: StoryLite[], progress: ProgressLite[],
  opts: { set: BehavioralMockSettings["set"]; level: "all" | "senior"; n: 3 | 4 | 5; gapsFirst: boolean }, seed: string,
): string[];                         // seeded; with gapsFirst prefers principles that have no story; no two questions share a principle when avoidable
export function matchStories(question: BehavioralQuestion, stories: StoryLite[]): { match: StoryLite[]; others: StoryLite[] };  // match = shares a principle
export function answerPace(answerS: number): "short" | "good" | "long";  // under 75 s, 75-180 s, over 180 s
export function behavioralPhases(n: number): PhaseSpec[];                // ids "q1-answer", "q1-probe", ... 3 min answer + 2 min probe each
```

## Rubrics (our own words; weights in brackets; `version: 1`)

**LLD** (`rubrics-lld.ts`): one `stepId` per criterion, matching `LLD_STEPS` ids.

| id | stepId | Question | Level 1 | Level 4 |
|---|---|---|---|---|
| `clarify` (1) | `clarify` | Did you confirm scope and use cases? | Started coding from the first line of the spec. | Listed use cases, scope and assumptions, and agreed them. |
| `model` (2, critical) | `model` | Are the entities, relationships and public API sensible? | One large class, or classes with no clear job. | Small classes with one job each, clear relationships, enums for states, a tidy public API. |
| `code` (2) | `code` | Does the core flow compile, run and read well? | Does not compile or run. | Compiles, the demo runs, names are clear, errors are handled. |
| `extend` (1) | `extend` | How did the design take the change request? | The change needs a rewrite. | The change touches one or two classes and an interface; thread safety discussed. |
| `quality` (1, no `stepId`) | | Are abstractions used for a reason? | Patterns forced in, or none where needed. | Interfaces where behaviour varies, composition over inheritance, no needless pattern. |
| `communication` (1, no `stepId`) | | Could the interviewer follow your decisions? | Silent coding. | Explained trade-offs as you went and checked scope at each step. |

**Behavioural** (`rubrics-behavioral.ts`), scored once for the whole mock (no `stepId`):

| id | Question | Level 1 | Level 4 |
|---|---|---|---|
| `structure` (1) | Did each answer have situation, action and a clear result? | Rambling story, no result. | Short setup, the key actions, the result and what you learned. |
| `ownership` (2, critical) | Is it clear what *you* did? | Mostly "we"; your part unclear. | Your decisions and actions are specific and in the first person. |
| `impact` (1) | Did you show the result with a number or fact? | No outcome stated. | A concrete result with a metric and its meaning. |
| `depth` (1) | Did the follow-up get specifics? | Vague or defensive under the probe. | Specific details, what you would change, the trade-off you faced. |
| `relevance` (1) | Did the story answer the question asked? | A good story for a different question. | Directly on the question and tied to the principle. |
| `concise` (1) | Was it the right length and focus? | Over three minutes or under a minute. | About two minutes, no side stories. |

Agent A writes all four anchors for each criterion in plain words (same style as `rubrics-coding.ts`).

## Out of scope

- Audio recording or speech-to-text for answers; an AI that listens (0099 handles typed text).
- A timed "write the whole system to pass hidden tests" judge for LLD (the run is your own `Main`; no automatic grading).
- Languages other than Java in the LLD mock (the project editor is Java).
- Story-bank features (0095), company-specific question sets (0108), the friend kit (0100).

## Steps

Step 0 first, then agents A-D in parallel on disjoint files. The behavioural half needs 0095 merged; the LLD half needs only 0096.

- [ ] **0. Foundation (lead).** Create `lld-prompts-types.ts`, `lld-prompts.ts` (merge of two empty records), empty `lld-prompts-a.ts`
  and `lld-prompts-b.ts`, `behavioral-mock.ts` with types and signatures (bodies throw), `phases-lld.ts` (final: map from
  `LOW_LEVEL_DESIGN.exercises.steps`), export from `packages/shared/src/mock/index.ts`. Replace the 0096 redirect pages
  `apps/web/app/mock/lld/new/page.tsx` and `apps/web/app/mock/behavioral/new/page.tsx` with placeholders (0095 already owns
  `apps/web/app/mock/behavioral/page.tsx`; do not touch it) and register empty `lld-session.tsx` and `behavioral-session.tsx` in
  `SESSION_VIEWS`. Read the merged 0095 and write the real import names at the top of `behavioral-mock.ts`.
  - Done when: `pnpm -r typecheck` passes and both `new` pages render a heading.
- [ ] **1. Agent A: rubrics, phases, behavioural logic and UI.** Files: `packages/shared/src/mock/{rubrics-lld.ts, rubrics-behavioral.ts, phases-behavioral.ts, behavioral-mock.ts, behavioral-mock.test.ts, rubrics-lld.test.ts}`,
  `apps/web/app/mock/behavioral/new/{page.tsx, new-form.tsx}`, `apps/web/app/mock/behavioral-session.tsx`,
  `apps/web/lib/mock-behavioral.ts` (+ test), and a `behavioral` branch in `saveScores` in `apps/web/lib/mock.ts` (one small block).
  Logic per the shapes above. UI: setup (question set, 3/4/5 questions, level, "Cover my gaps first", preview of chosen
  questions with "Swap"); session: one question card at a time, `PhaseTimer` over `behavioralPhases(n)`, story picker with matching
  stories first and "No story for this", notes box, "Start answering" / "Done answering" buttons that record `answerS` and show
  `answerPace`, "Show the follow-up" (one of `followUps`, logged as an interviewer transcript entry), after the last question a
  review screen: per question the story used, pace, `strong` and `weak` revealed, a "Solid / Shaky" choice, then `ScoreForm`
  with the behavioural rubric. Branch in `saveScores`: for each question marked `shaky`, call 0095's progress setter (status
  `shaky`, due in 3 days); for `solid`, status `solid`; return the shaky ids as `misses`.
  Context budget: this plan, the mockup, `packages/shared/src/mock/{types.ts, rubrics-coding.ts, phases.ts}`,
  `packages/shared/src/behavioral/{types.ts, coverage.ts}`, `apps/web/lib/behavioral.ts`, `apps/web/lib/mock.ts` (signatures and `saveScores`).
  - Done when: `pnpm exec vitest run packages/shared/src/mock apps/web/lib/mock-behavioral.test.ts` passes: `pickMockQuestions` is
    seeded and deterministic, respects set and level, avoids repeated principles, prefers gaps; `matchStories` splits by shared
    principle; `answerPace` boundaries (74/75/180/181); `behavioralPhases(3)` has six phases and the right minutes; both rubrics have
    unique ids and `stepId`s, four non-empty anchors, positive weights; the `behavioral` branch marks questions and returns
    misses. In the browser at 1280 and 390 px a three-question mock can be run and scored.
- [ ] **2. Agent B: LLD prompts 1-12.** File: `lld-prompts-a.ts`. Ids: `lldp-parking-lot`, `lldp-elevator`, `lldp-booking`,
  `lldp-lru-rate-limiter`, `lldp-url-shortener`, `lldp-splitwise`, `lldp-games`, `lldp-vending-atm`, `lldp-logger-notifications`,
  `lldp-food-cab`, `lldp-file-system-kv`, `lldp-library`. Requirements are numbered, testable, and short; `run.sample` has
  two or three small input/output examples that a `Main` could print; the `extension` is a realistic change (a new vehicle type, a
  second payment method, a priority queue) and `touches` names classes from the reference project when one exists.
  Context budget: this plan, `lld-prompts-types.ts`, for each id its `lldProblem(...)` line in `study.ts` and the first 40 lines of its
  entry in `packages/shared/src/learn/lld-projects-*.ts` (file names and class names only; do not copy code or text).
  - Done when: the file typechecks; coverage test (agent C) shows no missing id among these 12.
- [ ] **3. Agent C: LLD prompts 13-24 and the coverage test.** Files: `lld-prompts-b.ts`, `lld-prompts.test.ts`. Ids: `lldp-cab`,
  `lldp-kv-store`, `lldp-hotel`, `lldp-meeting-rooms`, `lldp-pubsub`, `lldp-orderbook`, `lldp-text-editor`, `lldp-job-scheduler`,
  `lldp-wallet`, `lldp-api-gateway`, `lldp-inventory`, `lldp-social-feed`. Test: every `lldp-` id in `ALL_EXERCISES` has a prompt;
  5-8 requirements, 2-3 samples, 3-5 edge cases, 4-6 strong, 3-5 weak, one extension; no empty strings; no emoji; every name in
  `extension.touches` that is capitalised appears as a class name in the matching `LLD_PROJECTS[id]` files when that project exists
  (soft check: report the count, fail only if none match for more than 3 prompts).
  Context budget: same as agent B.
  - Done when: `pnpm exec vitest run packages/shared/src/mock/lld-prompts.test.ts` passes after B finishes.
- [ ] **4. Agent D: LLD UI.** Files: `apps/web/app/mock/lld/new/{page.tsx, new-form.tsx}`, `apps/web/app/mock/lld-session.tsx`,
  `apps/web/app/mock/lld-requirements.tsx`, `apps/web/app/mock/lld-files.ts` (+ `lld-files.test.ts`). Setup: choose one of the 24
  problems (search, "least practiced first", "Surprise me"), length 45/60/90. Session: `PhaseTimer`; left column = requirements
  (numbered, from `LLD_PROMPTS`), the phase hint and, at the `extend` phase, the change request card; right = `ProjectEditor`
  (controlled; starter file `Main.java` with an empty `main` and a comment, not the reference solution) with Run. Project files are
  saved to `transcript.extra.files` (`{ name, code }[]`, at most 40,000 characters in total and 12 files; the UI shows "Too large to
  save" instead of failing) with a 2 s debounce; each run appends a system entry ("Run: ok" or "Run: compile error"). After End:
  `MockResult` shows your files read-only next to the reference project (collapsed), the edge cases and `strong`/`weak` lists, then
  `ScoreForm` with the LLD rubric, then "Compare with the reference design" (`/study/lld/<id>`) and "Pattern lessons to read"
  (link up to three `dp-*` lessons that appear in the reference project's `lldGuide(id).patterns`, matched by name).
  `lld-files.ts` has pure helpers: `clampFiles`, `totalChars`, `starterFiles(prompt)`.
  Context budget: this plan, the mockup, `apps/web/app/components/project-editor.tsx` (props and controlled usage),
  `apps/web/app/study/[area]/[id]/project-playground.tsx`, `apps/web/app/mock/{phase-timer.tsx, session-views.tsx}`,
  `packages/shared/src/mock/{types.ts, lld-prompts-types.ts}` (types only).
  - Done when: `pnpm exec vitest run apps/web/app/mock/lld-files.test.ts` passes (clamping, totals, starter has `Main`); in the browser
    at 1280 and 390 px you can start a 45-minute mock, write and run a small class, reach the extend phase, end it and score it; a
    reload keeps the files and the clock; saving the score creates a practice entry with scores for `clarify`, `model`, `code`, `extend`.
- [ ] **5. Wire-up and review (lead).** Set `MOCK_KIND_META.lld.ready` and `.behavioral.ready` to `true`; fill `PHASES`/`RUBRICS` for both;
  run `pnpm check` once; manual pass: one LLD mock (parking lot, 45 minutes) and one behavioural mock (3 questions, Amazon set); check
  `/study/lld/lldp-parking-lot` shows the new practice entry and `/mock/behavioral` Practise shows the shaky question as due.
  - Done when: `pnpm check` passes and the manual pass is in *Implementation notes*.

## Acceptance criteria

- [ ] Interview hub shows Low-level design and Behavioural as ready; each `new` page starts a session.
- [ ] LLD: requirements visible from the start, the editor runs Java, the change request appears at the extend phase, files survive a
      reload, the reference is shown only after End.
- [ ] LLD scoring writes a practice entry with per-step scores and schedules a review.
- [ ] Behavioural: 3-5 questions chosen from the bank (gaps first when asked), a story picker, answer pace shown, follow-ups on
      request, a per-question Solid/Shaky mark and a rubric score; shaky questions come back in practice.
- [ ] All 24 LLD problems have a prompt; content tests pass.
- [ ] `pnpm check` passes
- [ ] No changes outside the files listed above (or explained in *Implementation notes*)

## Estimate

- Step 0: 0.5 agent-day.
- Parallel: A 1.25, B 0.75, C 0.75, D 1.25 agent-days, so about 1.25 calendar days.
- Review and fixes: 0.5 day.
- Total: **about 2.5 calendar days**, starting after 0096 (and 0095 for the behavioural half; the LLD half can start as soon as 0096 lands).
- Main risk: the controlled `ProjectEditor` (file saving and the run state). Prompt quality is the second risk: 24 specs must be
  small enough to code in 45 minutes. Agent C's test checks shape, not difficulty; the reviewer reads five at random.

## Dependencies

- **0096** (hard). **0095** (hard for behavioural: questions, stories, progress). 0093 (pattern lessons) is already merged.
- 0099 reads `LLD_PROMPTS` and the behavioural questions for its interviewer playbook; 0100 reads both for the friend guide. Keep
  the type and file names stable.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
