# 0097: System design mock (prompt, phased timer, whiteboard, rubric)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0097-system-design-mock.html

## Goal

Run a system design interview alone: you get a short, deliberately vague prompt, a 45-minute clock split into the seven phases
the app already teaches, a built-in whiteboard for boxes and arrows, and an "interviewer" panel that holds the facts you must
ask for and throws one change at you in the deep dive. At the end you score yourself with a design rubric. The score feeds the
same exercise record and Review schedule as the existing design practice log.

## Context

- **Mock model (defined by 0096, do not redefine):** table `mock_sessions`, `MockKind = "design"`, `PHASES`/`RUBRICS` registries with
  stub files `phases-design.ts` and `rubrics-design.ts`, `MOCK_KIND_META.design.ready`, `PhaseTimer`
  (`apps/web/app/mock/phase-timer.tsx`), `SESSION_VIEWS`, `ScoreForm`, `MockResult`, and the data layer `apps/web/lib/mock.ts`
  (`createMockSession`, `saveMockProgress`, `finishMockSession`, `saveScores`). Transcript payloads go in `transcript.extra`.
  Read the merged 0096 first and use its exact names.
- **Prompts to cover:** the 27 system design exercises in `packages/shared/src/study.ts` (`SYSTEM_DESIGN.exercises.items`, ids
  `sdd-url-shortener`, `sdd-rate-limiter`, ... `sdd-catalog`; `sdDesign(...)` calls). The seven phases are `SD_STEPS` in the same
  file: `req` 5, `est` 4, `api` 5, `hld` 10, `deep` 15, `fail` 5, `wrap` 1 minutes (45 in all). `phases-design.ts` builds its list
  from `SYSTEM_DESIGN.exercises.steps` so there is one source of truth.
- **Reference answers to compare with after the mock:** `WALKTHROUGHS` and `DESIGN_DEEP` in `packages/shared/src/learn/` (the
  `EvaluationCriterion` list per design is a good model for what "strong" looks like). The mock links to
  `/study/sd/<exercise id>` afterwards (route `app/study/[area]/[id]`; area id is `sd`).
- **Diagrams:** `apps/web/lib/diagrams.ts` `addDiagram({ itemId, title, url, image })` stores uploaded images (base64, 3 MB cap, PNG,
  JPEG, WebP, GIF; no SVG). The board can export a PNG and save it there with `itemId` = the exercise id, so it shows on
  `/study/diagrams` and in backups.
- **Why our own board:** an embedded third-party whiteboard is a large dependency, needs its own CSS and storage, and does not run
  offline inside the Electron build. A small board (boxes, arrows, labels, freehand) covers what a 45-minute design needs and keeps
  data in our row.
- Conventions: `AGENTS.md` (no emoji, plain writing, our own words, tests next to code, `:memory:` DB, no `Date.now()` in render).

## Data shapes (new)

`packages/shared/src/mock/design-prompts-types.ts`

```ts
export interface DesignMockPrompt {
  id: string;                      // "sdd-url-shortener"; must be a key of ALL_EXERCISES
  opening: string;                 // what the interviewer says first, 1-2 sentences, vague on purpose
  /** Facts the interviewer only gives when asked. `topic` is a short label ("Scale", "Latency", "Consistency"). */
  facts: { topic: string; answer: string }[];      // 4-7 items
  /** One change thrown in later. `when` is the phase id it appears in. */
  twists: { when: "deep" | "fail"; say: string; goodAnswer: string }[];   // 1-2 items
  strong: string[];                // 4-6 short signs of a strong answer for this design
  weak: string[];                  // 3-5 common weak signals
  note?: string;                   // optional: where numbers are practice values, not claims about a real company
}
```

`packages/shared/src/mock/design-prompts.ts` exports `DESIGN_PROMPTS: Record<string, DesignMockPrompt>` merged from
`design-prompts-a.ts` (first 14 ids) and `design-prompts-b.ts` (last 13).

`packages/shared/src/mock/board.ts` (pure)

```ts
export type NodeKind = "box" | "db" | "queue" | "cache" | "client" | "lb" | "cloud";
export interface BoardNode { id: string; kind: NodeKind; x: number; y: number; w: number; h: number; label: string }
export interface BoardEdge { id: string; from: string; to: string; label?: string; dashed?: boolean; arrow: "end" | "both" | "none" }
export interface BoardText { id: string; x: number; y: number; text: string }
export interface BoardStroke { id: string; pts: [number, number][] }
export interface BoardDoc { v: 1; w: number; h: number; nodes: BoardNode[]; edges: BoardEdge[]; texts: BoardText[]; strokes: BoardStroke[] }
export const BOARD_LIMITS = { nodes: 80, edges: 160, texts: 60, strokes: 60, pointsPerStroke: 400, chars: 30_000, label: 60 } as const;
export const emptyBoard(): BoardDoc;
export function addNode(b: BoardDoc, kind: NodeKind, x: number, y: number): BoardDoc;       // immutable; returns b unchanged at the limit
export function moveNode(b: BoardDoc, id: string, x: number, y: number): BoardDoc;
export function connect(b: BoardDoc, from: string, to: string): BoardDoc;                  // no self edge, no duplicate (same direction)
export function removeItem(b: BoardDoc, id: string): BoardDoc;                              // node removal also removes its edges
export function simplifyStroke(pts: [number, number][], tolerance?: number): [number, number][]; // Douglas-Peucker, then capped
export function parseBoard(raw: unknown): BoardDoc;                                          // never throws; drops bad items and dangling edges
export function boardSize(b: BoardDoc): number;                                              // JSON length, for the cap
```

The board lives in `transcript.extra.board`. Reveals and twists are `TranscriptEntry` rows (`role: "interviewer"`, `phase` set).

## Design rubric (`rubrics-design.ts`, `version: 1`)

Seven criteria that line up with the phases, each with `stepId` so 0096's `saveScores` can call `logPractice` with step scores.
Weights in brackets. Agent A writes all four anchors for each in plain words, in the same style as the coding rubric
(`rubrics-coding.ts`); the ends are fixed here.

| id | stepId | Question | Level 1 | Level 4 |
|---|---|---|---|---|
| `requirements` (1) | `req` | Did you pin down what to build before drawing? | Drew boxes at once; no scope. | Functional and non-functional goals agreed, scale and out-of-scope stated. |
| `estimation` (1) | `est` | Did the numbers change the design? | No numbers, or numbers never used. | Peak QPS, storage and bandwidth worked out and used to pick a store and a cache. |
| `api-data` (1) | `api` | Are the API and data model clear? | No API; data model missing. | Main calls, entities and keys, and the access patterns that drive the store choice. |
| `architecture` (2, critical) | `hld` | Does the high-level design work end to end? | Components do not connect to a working read or write path. | One request walked through each path; every component has a stated job. |
| `deep-dive` (2) | `deep` | Did you go deep where it is hard? | Stayed at the surface. | Two hard parts explored with alternatives, costs and a clear pick. |
| `reliability` (1) | `fail` | Did you find what breaks? | No failure thinking. | Single points of failure, retries, hot spots, multi-region and monitoring addressed. |
| `communication` (1) | `wrap` | Could the interviewer follow and steer you? | Silent stretches; no summary. | Narrated decisions, took the twist calmly, closed with trade-offs and next steps. |

## Phases and prompts

- `phases-design.ts` exports `DESIGN_PHASES: PhaseSpec[]` mapped from `SYSTEM_DESIGN.exercises.steps` (id, label = `title`, minutes,
  hint). Length options on the setup page: 35, 45 (default), 60 through `scalePhases`.
- Twist timing: a "Twist" card appears when `deep` starts (and a second one when `fail` starts, if the prompt has one). The card
  shows the interviewer's line; "Show a good answer" is hidden until the mock is ended.

## Out of scope

- AI interviewer (0099), friend kit (0100), shared whiteboard between people, real-time collaboration.
- Auto-layout, image import into the board, shape libraries beyond the seven node kinds, zoom beyond fit-to-width.
- Writing new reference walkthroughs (they exist); a "company-specific" design prompt set.
- Scoring from the board automatically.

## Steps

Step 0 first, then agents A-D in parallel on disjoint files.

- [ ] **0. Foundation (lead).** Create `design-prompts-types.ts`, an empty `design-prompts.ts` (`DESIGN_PROMPTS = { ...A, ...B }`)
  with empty `design-prompts-a.ts` and `design-prompts-b.ts` exports (`Record<string, DesignMockPrompt>` = `{}`), `board.ts` with the
  types, limits and function signatures (bodies throw), `phases-design.ts` (final), and `rubrics-design.ts` (still `null`, agent A
  fills it). Export all from `packages/shared/src/mock/index.ts`. Add skeletons `apps/web/app/mock/design/new/page.tsx` (replaces the
  0096 redirect page), `apps/web/app/mock/design-session.tsx` (renders the phase bar only) and register it in `SESSION_VIEWS`.
  - Done when: `pnpm -r typecheck` passes and `/mock/design/new` renders a heading.
- [ ] **1. Agent A: rubric and board logic.** Files: `rubrics-design.ts`, `board.ts`, `board.test.ts`, `rubrics-design.test.ts`
  (all under `packages/shared/src/mock/`). Write the rubric (four anchors per criterion), implement the board functions.
  Context budget (read only this): this plan, `packages/shared/src/mock/types.ts`, `rubrics-coding.ts`, the `SD_STEPS` block in
  `packages/shared/src/study.ts` (lines 69-77).
  - Done when: `pnpm exec vitest run packages/shared/src/mock/board.test.ts packages/shared/src/mock/rubrics-design.test.ts` passes:
    each `stepId` is a real step id; weights sum to 9; `addNode` stops at the limit; `removeItem` removes edges; `connect` rejects
    self and duplicate; `simplifyStroke` keeps ends and caps points; `parseBoard` drops dangling edges and survives `null`, strings
    and over-long labels; `boardSize` of a full board stays under `BOARD_LIMITS.chars`.
- [ ] **2. Agent B: prompt content, first 14.** File: `design-prompts-a.ts`. One `DesignMockPrompt` for each of: `sdd-url-shortener`,
  `sdd-rate-limiter`, `sdd-kv-store`, `sdd-notifications`, `sdd-news-feed`, `sdd-chat`, `sdd-video`, `sdd-file-sync`,
  `sdd-ride-sharing`, `sdd-typeahead`, `sdd-crawler`, `sdd-job-scheduler`, `sdd-payments`, `sdd-inventory`.
  Content rules: our own words; numbers are practice values and say so in `note` where a number could be mistaken for a fact about
  a real company; no company internals; `opening` is one or two sentences and does not list requirements; each `facts` item is
  something a strong candidate would ask about; each `twist` changes one assumption (a 10x spike, a region loss, a new
  consistency need) and has a short `goodAnswer`.
  Context budget: this plan, `design-prompts-types.ts`, the matching `sdDesign(...)` lines in `study.ts` (title and focus), and for
  each id the first 30 lines of its entry in `packages/shared/src/learn/designs-a.ts` or `designs-b.ts` for scope (do not copy text).
  - Done when: the file typechecks and `design-prompts.test.ts` (agent C) shows no missing id for these 14.
- [ ] **3. Agent C: prompt content, last 13, and the coverage test.** Files: `design-prompts-b.ts`, `design-prompts.test.ts`. Ids:
  `sdd-ticketing`, `sdd-metrics`, `sdd-kafka`, `sdd-collab-editing`, `sdd-maps`, `sdd-top-k`, `sdd-recommendations`,
  `sdd-building-blocks`, `sdd-order-management`, `sdd-warehouse`, `sdd-delivery-slots`, `sdd-pricing`, `sdd-catalog`. For
  `sdd-building-blocks` read its title and focus in `study.ts` first and write a prompt that fits it. Same content rules as agent B.
  Test: every id in `ALL_EXERCISES` that starts with `sdd-` has a prompt; each prompt has 4-7 facts, 1-2 twists, 4-6 strong, 3-5 weak;
  no empty strings; `twists[].when` is `deep` or `fail`; no emoji (use the regex from `apps/web/app/no-emoji.test.ts`).
  Context budget: same as agent B.
  - Done when: `pnpm exec vitest run packages/shared/src/mock/design-prompts.test.ts` passes (after B finishes).
- [ ] **4. Agent D: UI.** Files: `apps/web/app/mock/design/new/{page.tsx, new-form.tsx}`, `apps/web/app/mock/design-session.tsx`,
  `apps/web/app/mock/design-board.tsx`, `apps/web/app/mock/interviewer-card.tsx`, `apps/web/app/mock/design-board-math.ts` (+ test).
  Setup: choose a design from a list (search, "least practiced first", "Surprise me" using a seeded pick), length 35/45/60,
  "Show the opening line only" (default on; the checklist of facts stays hidden). Session: `PhaseTimer` on top; main area is the
  board (SVG, pointer events: tap a palette item then tap the canvas to place it, drag to move, a "Connect" tool: tap a node then
  another, double-tap to rename a label, a pen tool for freehand, undo and redo with 50 steps, delete key and a delete button,
  "Fit" and "Export PNG" and "Save to my diagrams" via the existing diagram upload); side panel (`interviewer-card.tsx`): the
  opening, the phase hint, "Facts you can ask about" (chips by `topic`; tapping one reveals the answer and logs an interviewer
  entry), and the twist card. Phone: the panel is a bottom sheet; the board scrolls inside its own area, no page scroll while
  drawing (`touch-action: none` on the canvas only). Autosave the board and transcript with a 2 s debounce through
  `saveMockProgressAction`, respecting `BOARD_LIMITS` (show "Board is full" instead of failing). After End: `MockResult` shows the
  board read-only, reveals used, then 0096's `ScoreForm` with the design rubric, then links "Compare with the reference design"
  (`/study/sd/<id>`) and "Good answers to the twists". Pure geometry (hit tests, snapping to a 8 px grid, edge anchor points, PNG
  size) lives in `design-board-math.ts`.
  Context budget: this plan, the mockup, `packages/shared/src/mock/{board.ts, design-prompts-types.ts, types.ts}` (types only),
  `apps/web/app/mock/phase-timer.tsx` (props), `apps/web/app/mock/session-views.tsx`, `apps/web/app/study/diagrams/diagram-drop.tsx`
  and `apps/web/lib/diagrams.ts` (upload path), `DESIGN.md` sections 2-4.
  - Done when: `pnpm exec vitest run apps/web/app/mock/design-board-math.test.ts` passes; in the browser at 1280 and 390 px you can
    place five nodes, connect them, label one, draw a stroke, undo twice, export a PNG, end the mock and score it; a reload keeps
    the board and the clock.
- [ ] **5. Wire-up and review (lead).** Set `MOCK_KIND_META.design.ready = true`, fill `design` in `PHASES` and `RUBRICS`, run
  `pnpm check` once, check one end-to-end mock: after saving, `/study/sd/sdd-url-shortener` shows a new practice entry with per-step
  scores and the exercise is scheduled in `/review`.
  - Done when: `pnpm check` passes and the manual check is in *Implementation notes*.

## Acceptance criteria

- [ ] Interview hub shows System design as ready and `/mock/design/new` starts a session with a chosen or random design.
- [ ] The phase bar uses the seven existing phases and 45 minutes by default; length 35 and 60 scale the phases.
- [ ] The board supports nodes, labelled arrows, text, freehand, undo, export PNG and saving to diagrams; it survives a reload and
      respects the size limits.
- [ ] Facts are hidden until you reveal them; the twist appears when the deep-dive phase starts; reveals are in the transcript.
- [ ] Scoring uses the design rubric; saving writes a practice entry with per-step scores and schedules a review.
- [ ] All 27 designs have a prompt; content tests pass.
- [ ] `pnpm check` passes
- [ ] No changes outside the files listed above (or explained in *Implementation notes*)

## Estimate

- Step 0: 0.5 agent-day.
- Parallel: A 0.5, B 0.5, C 0.5, D 1.5 agent-days (the board is the long pole), so about 1.5 calendar days.
- Review and fixes: 0.5 day (touch input on the board needs a real phone-size pass).
- Total: **about 2.5 calendar days**, starting after 0096 is merged.
- Main risk: pointer and touch handling on the board (drag versus scroll on phones). Keep the tool model simple (tap to place) and
  test at 390 px early.

## Dependencies

- **0096** (hard). Uses by name: `PhaseTimer`, `ScoreForm`, `SESSION_VIEWS`, `scalePhases`, `saveScoresAction`.
- 0099 reads `DESIGN_PROMPTS` for its interviewer playbook; 0100 reads `DESIGN_PROMPTS` for the interviewer guide. Keep the type name
  and file path stable.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
