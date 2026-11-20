# 0102: Amazon-style online assessment simulation

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0102-amazon-oa.html

## Goal

Many SDE2 loops start with an online assessment (OA): a timed set of coding problems, often a short debugging section and a
"work style" questionnaire, taken alone, with no hints, on a platform you have not used. Add an **OA simulation** to the
Interview hub: pick a format (Amazon-style by default), the app builds the set from your own problem pool, runs the parts
back to back under one clock with the hints and solutions hidden, scores each part, and sends what you missed to the stuck
list. It trains pressure, pacing and partial credit, not the exact questions.

## Context

- **Mock model (0096 defines it, do not redefine):** `mock_sessions` with `kind = "oa"`, routes `/mock`, `/mock/oa/new`,
  `/mock/session/<id>`, `packages/shared/src/mock/rubrics.ts`, `apps/web/app/mock/phase-timer.tsx`. An OA session uses:
  `prompt_ref` = the format id, `settings_json` = `{ format, language, seed, problemIds[], debugIds[], scenarioIds[] }`,
  `transcript_json` = an event log (part started/finished, run and submit counts, window-blur count), `scores_json` =
  per-part results (below). Misses go to the stuck list through 0096's helper (`logStruggle` in `apps/web/lib/struggles.ts`).
  If 0096 names a field differently, use 0096's name.
- **Problem pool:** `JUDGE_PROBLEMS` (`packages/shared/src/judge/index.ts`, 486 problems, each `ProblemSpec` with
  `examples`, `tests`, `constraints`, optional `difficulty`, `pattern`) and `PROBLEMS` in `packages/shared/src/dsa.ts`
  (roadmap problems with `difficulty` and pattern groups). Use the `source === "leetcode"` problems that have a `difficulty`.
  Prefer ones you have not solved (`problem_solves`, via `apps/web/lib/dsa.ts`).
- **Judge:** `apps/web/app/judge-workspace.tsx` (`JudgeWorkspace` takes `tabs`, `header`, `readOnly`, `nextHref`), and
  `apps/web/app/api/judge/run/route.ts`. Important: today a successful Submit there calls `recordJudgePass` (marks the
  problem solved, gives XP) and may call `saveSolution`. An OA must not do that while the clock runs, so the route gets one
  new optional body field, `oa: <sessionId>`, which (a) checks the session exists, is kind `oa`, not ended, and lists this
  problem id, else 403; (b) skips `recordJudgePass` and `saveSolution`; (c) still runs and returns results. Hidden tests
  already work as in a real OA: `mode: "run"` runs only examples, Submit runs all.
- **Hosted site:** `hostedNoRun` blocks running code there; the OA coding part is local-app only, and `/mock/oa/new` says so
  on the hosted site (the debugging and work-style parts still work).
- **Related content:** the walkthroughs in `packages/shared/content/interview/<id>.md` and `solution-walkthrough.tsx` are
  shown only on the results screen. 0104 adds code-reading questions; this plan ships its own small debugging set so it does
  not depend on 0104. 0095 defines the leadership principle tags the work-style scenarios use; this plan carries its own
  list of principle names as a const and does not depend on 0095's table.
- **Facts about the real assessment.** What Amazon uses changes by role, year and team, and the company says so itself.
  The default format here is what candidates have commonly and publicly described for software engineer roles: two coding
  problems in roughly 70 minutes, a short debugging section, and a work-style (leadership principles) simulation. It is a
  practice shape, not a copy of any real test, and no real questions are used. Every format in the data has a
  `lastChecked: "2026-11-21"` date and the UI says "Check your invitation email for your real format". Keep the facts general
  and do not add anything from an NDA or a leaked list.
- **Conventions that apply:** content in our own words; no emoji; tests next to code; no `Date.now()` in render (timers come
  from `phase-timer`); seeded shuffle helper already exists in `packages/shared/src/revise.ts` (use it for picks).

## Design

**Formats** (`packages/shared/src/oa/formats.ts`):

```ts
export interface OaPart { kind: "coding" | "debug" | "workstyle"; minutes: number; count: number; mix?: ("easy" | "medium" | "hard")[] }
export interface OaFormat { id: string; label: string; note: string; lastChecked: string; parts: OaPart[] }
export const OA_FORMATS: OaFormat[] = [
  { id: "amazon-sde2", label: "Amazon-style SDE2", ... parts: [coding 70 min x2 (medium, medium), debug 30 min x6, workstyle 20 min x8] },
  { id: "amazon-sde1", ... coding 70 min x2 (easy, medium), debug 20 x5, workstyle 20 x8 },
  { id: "coding-only", label: "Two coding problems, one clock", parts: [coding 75 x2 (medium, hard)] },
  { id: "hackerrank-style", label: "Three problems, 90 minutes", parts: [coding 90 x3 (easy, medium, medium)] },
];
```

Counts and minutes are defaults; the setup screen lets you change the clock by +/- 15 minutes.

**Parts**

1. **Coding.** `pickOaProblems(seed, mix, language?, solvedIds)` in `packages/shared/src/oa/pick.ts` (pure; unsolved first,
   one problem per pattern group, never two from the same group, deterministic for a seed). The part uses `JudgeWorkspace`
   with only the description tab, no hint/solution/notes tabs. Score for a problem = `passed / total` tests of the latest
   Submit (partial credit, as real OAs give); no Submit means 0. A "Submit and continue" button moves to the next problem; you
   can go back until the part clock ends.
2. **Debugging.** Our own set in `packages/shared/src/oa/debug.ts`: 30 short items, each `{ id, language: "java"|"python"|"cpp",
   title, code, question, choices: string[4], answer: 0-3, explanation, tags }`. Typical bugs: off-by-one, wrong
   comparison, integer overflow, mutating a list while iterating, shared mutable default argument, missing `break`, wrong
   base case, using `==` for strings, race on a counter. 6 are drawn per session.
3. **Work style.** Our own scenarios in `packages/shared/src/oa/workstyle.ts`: 30 items, each `{ id, situation,
   options: { id, text, principle }[4], best: optionId[], worst: optionId[], reasoning }`. Person picks the most and least
   effective option. The "key" is our own reasoning about ownership, customer focus, bias for action, dive deep, earning
   trust and the like; show it as "Our reading", never as the official answer. Scored: 2 points for choosing a best option
   as most effective, 2 for choosing a worst option as least effective, per scenario. Advisory only.

**Scoring and results.** `scores_json` = `{ source: "oa", parts: [{ kind, score, max, detail[] }], total: { score, max },
pace: { problemId: { firstRunS, submitS, runs, submits } }, integrity: { blurs: number } }`. The results screen shows score
per part, time per problem against the clock, the problems with failed hidden tests (links to the problem page, with its
walkthrough unlocked), wrong debug items with the explanation, and the work-style items with "Our reading". Offer "Add the
missed problems to the stuck list" (default on for problems under 100%; reason text "OA: 3 of 8 tests passed"). The
`integrity.blurs` counter is information for you ("you left this tab 4 times"), not a rule; it is not enforced and the app
says a real platform may track more.

**Rules shown before the start (and mirrored in the UI):** one sitting, no hints, no AI panel, no notes tab, the clock keeps
running if you reload (the session row has `started_at`; elapsed is computed from it), fullscreen suggested.

## Out of scope

- Reproducing a real company's questions, UI, proctoring, webcam, plagiarism detection or scoring.
- An OA for companies other than the generic and Amazon-style formats (the `OaFormat` list can grow later).
- Hosted-site code running.
- The AI interviewer (0099): there is no AI in an OA by design.
- Company problem lists (0103). If 0103 is merged, the picker may prefer problems tagged for the chosen company; until then
  it ignores that.

## Dependencies

- **0096** (mock model, hub, session route, timer). Hard.
- **0103** (company lists): optional, only improves picks.
- **0104** (code reading / debugging question types): none; this plan's debug set stands alone and a later plan may merge them.

## Steps

Step 0 first, then agents A-D in parallel on disjoint files.

- [ ] **0. Foundation (lead).** Read the merged 0096. Create `packages/shared/src/oa/types.ts` (`OaPart`, `OaFormat`,
  `DebugItem`, `WorkstyleItem`, `OaScores`, `OaSettings`), `packages/shared/src/oa/formats.ts` (the four formats above),
  empty-but-typed exports `DEBUG_ITEMS: DebugItem[] = []`, `WORKSTYLE_ITEMS: WorkstyleItem[] = []` in their files, export
  `oa/*` from the shared index, and add `oa` to the kinds 0096 lists if it is not already there. Add route skeletons
  `apps/web/app/mock/oa/new/page.tsx` and `apps/web/app/mock/oa/oa-session.tsx` (renders "Part X of Y" only). In
  `api/judge/run/route.ts` add the `oa` field guard described in Context with a helper `checkOaRun(sessionId, problemId)` in
  `apps/web/lib/oa.ts` (stub that returns ok in step 0; Agent A fills it in).
  - Done when: `pnpm -r typecheck` passes, `/mock/oa/new` renders a placeholder, existing judge route tests still pass
    (`pnpm exec vitest run apps/web/app/api/judge`).
- [ ] **1. Agent A: coding part and judge guard.** Files: `packages/shared/src/oa/pick.ts` (+ `pick.test.ts`),
  `apps/web/lib/oa.ts` (+ `oa.test.ts`), `apps/web/app/mock/oa/coding-part.tsx`, the `oa` branch in
  `apps/web/app/api/judge/run/route.ts` (+ cases in its existing test file or a new `run-oa.test.ts`). `lib/oa.ts`:
  `createOaSession(format, language, seed)` (inserts the `mock_sessions` row; picks problems with `pickOaProblems`, drawing
  solved ids from `lib/dsa.ts`; draws debug and scenario ids with the seeded shuffle), `checkOaRun`, `scoreCoding`
  (from the latest saved runs: `lib/solution-runs.ts`). `coding-part.tsx`: wraps `JudgeWorkspace` with `tabs` reduced to the
  description, `header` with the part clock, "Submit and continue". Context budget: this plan, `judge-workspace.tsx` props,
  `api/judge/run/route.ts`, `lib/solution-runs.ts`, `lib/dsa.ts` exports, `revise.ts` shuffle helper.
  - Done when: tests prove: Submit with `oa` set never creates a `problem_solves` row or XP; a wrong problem id, an ended
    session or a non-OA session gets 403; the pick is deterministic per seed, has no two problems from one pattern group,
    prefers unsolved, and falls back when fewer than needed are unsolved; coding score equals passed/total of the latest
    submit.
- [ ] **2. Agent B: debugging part (content + UI).** Files: `packages/shared/src/oa/debug.ts` (30 items),
  `packages/shared/src/oa/debug.test.ts`, `apps/web/app/mock/oa/debug-part.tsx`. Write the 30 items yourself (about 10 per
  language: Java, Python, C++; short, 8-20 lines; exactly one best answer; explanation of why the others fail). Check that
  each snippet really has the bug you describe by compiling or running it in a scratch folder outside the repo (note any
  missing toolchain). UI: one item per screen with the code in the existing highlighter (`apps/web/app/code.tsx`), four
  choices as radio rows, "Next", a small list of items to jump between, and a "flag for later" toggle. Context budget: this plan,
  `apps/web/app/code.tsx` props, types file.
  - Done when: tests check 30 unique ids, 4 choices each, `answer` in range, each language at least 8, no empty explanation;
    the part renders and records choices in `settings_json`-adjacent state sent through `saveOaPartAction`
    (owned by Agent D; use the agreed signature `saveOaPartAction(sessionId, part, payload)` from the types file).
- [ ] **3. Agent C: work-style part (content + UI).** Files: `packages/shared/src/oa/workstyle.ts` (30 scenarios),
  `packages/shared/src/oa/workstyle.test.ts`, `apps/web/app/mock/oa/workstyle-part.tsx`. Scenarios are short (3-5
  sentences) workplace dilemmas for an engineer: a failing deploy at night, a teammate's unreviewed change, a vague
  requirement, a customer complaint that is a feature gap, a tight deadline with a known shortcut, a missed estimate.
  Each of the 4 options carries a principle label from this fixed list (`ownership`, `customer-obsession`, `bias-for-action`,
  `dive-deep`, `earn-trust`, `deliver-results`, `insist-on-standards`, `frugality`, `learn-and-be-curious`,
  `have-backbone`) kept as a const in the types file. At least two options per scenario are defensible and one is clearly
  worse; the `reasoning` explains the trade-off in 2-3 sentences and never claims to be the company's answer key.
  UI: scenario card, four options each with "Most effective" / "Least effective" selectors (one of each), progress dots.
  Context budget: this plan, types file, the mockup.
  - Done when: tests check 30 unique ids, 4 options, a valid `best` and `worst` set that do not overlap, principle labels
    from the fixed list, balanced coverage (each principle appears as a best option at least twice), no emoji.
- [ ] **4. Agent D: setup, session shell, results, hub.** Files: `apps/web/app/mock/oa/new/page.tsx` (+ client form),
  `apps/web/app/mock/oa/oa-session.tsx`, `apps/web/app/mock/oa/oa-results.tsx`, `apps/web/app/mock/oa/actions.ts`
  (`createOaAction`, `saveOaPartAction`, `finishOaAction`, `addMissesToStuckAction`), `packages/shared/src/oa/score.ts`
  (+ `score.test.ts`: `scoreDebug`, `scoreWorkstyle`, `totalScore`). Setup: format cards with `note` and `lastChecked`, language
  segmented control, clock adjuster, rules list, "Start assessment". Session: part tabs locked in order, the shared
  `PhaseTimer` for the section clock plus a total clock, part transitions with a "Section ends in 5:00" warning and an
  automatic move on at 0:00 (locks the current part and keeps its latest submit), reload-safe (elapsed from `started_at`).
  Results as described. Add an "Online assessment" card to the `/mock` hub (the hub file is 0096's: add only the card
  component import and one line, note it). Context budget: this plan, the mockup, 0096's `phase-timer.tsx` and hub page.
  - Done when: a full run (shortened clocks via a `?clock=1` dev setting that exists only when `NODE_ENV !== "production"`)
    goes through three parts, ends, shows results, adds the missed problems to the stuck list, and the row appears in the hub
    history; reload mid-part keeps the clock and answers; unit tests cover the three scoring functions and the
    auto-advance maths (pure helper in `score.ts` or `timing.ts`).
- [ ] **5. Review (lead).** `pnpm -r typecheck`, the targeted test files, then `pnpm check` once. Browser check at 1280 and
  390 px, light and dark, for setup, each part and results. Verify in the browser that during the OA the problem page for a
  picked problem still shows hints (the OA only hides them inside its own screen), and that no solve was recorded.
  - Done when: acceptance criteria below are all ticked.

## Acceptance criteria

- [ ] From `/mock/oa/new` you can pick a format, start, and be given the right number of coding, debugging and work-style
      items under one clock; hints, solutions, notes and the AI panel are not shown in the OA.
- [ ] A Submit during an OA does not mark the problem solved or give XP; the same Submit outside an OA still does.
- [ ] Time running out locks the current part and moves on; a reload mid-part keeps the clock and your answers.
- [ ] Results show per-part score, per-problem pace, failed hidden tests with a link to the walkthrough, debug explanations and
      "Our reading" for work-style items; misses can be added to the stuck list in one click.
- [ ] Every format shows its `lastChecked` date and the "check your invitation email" note; no real company question text is
      used.
- [ ] On the hosted site the coding part says it needs the desktop app; the other parts work.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (the hub card line and the `run/route.ts` guard are the only edits to
      existing files; explain any other in *Implementation notes*).

## Estimate

- Step 0: 0.25 agent-day. Agents A-D in parallel: A 0.75, B 1 (30 items verified by running them), C 1 (30 scenarios), D 1
  agent-day. Review and fixes: 0.5 day.
- Total: about 2 calendar days after 0096 is merged.
- Main risk: the judge route guard. The OA must never leak a solved mark or hints, and the run route is the shared path for
  every problem; keep the change tiny and test both sides. Second risk: content quality of the 60 authored items, so the
  review samples ten of each.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in.)

## Review

(Reviewer fills in.)
