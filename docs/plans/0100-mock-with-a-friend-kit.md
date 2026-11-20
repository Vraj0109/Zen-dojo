# 0100: Mock with a friend kit (interviewer guide, score sheet, share)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0100-mock-with-a-friend-kit.html

## Goal

A friend can interview you, or you can interview a friend, using only what this app produces. For any coding problem, system
design, LLD problem or behavioural question the app builds an **interviewer guide**: what to say, what to hold back, a hint ladder,
what a strong answer contains, follow-ups, red flags. The friend gets it as one **self-contained HTML file** (works offline, on a
phone, no account) with a built-in **score sheet**. When the mock ends, the friend copies a short **result code** and you paste
it into your session: their scores and comments appear next to your own.

No server, no link to a hosted page, no new account: the file and the code travel by chat or email.

## Context

- **Mock model (0096, do not redefine):** `mock_sessions`, `scores_json` = `{ self?, ai?, friend? }` of `ScoreSheet`, `Rubric`,
  `rubricFor(kind)`, `saveScoresAction(id, by, input, summary?)`, `ScoreForm`, `MockResult`, `/mock/session/[id]`, `settings.interviewer`
  (`"self" | "ai" | "friend"`). Read the merged 0096 first and copy its names.
- **Prompt data to build guides from (read, do not copy into new content):**
  - coding: `JUDGE_PROBLEMS[id]` (`statement`, `examples`, `constraints`, `hints` with the smallest nudge first, `solution.idea`,
    `solution.complexity`) and `INTERVIEW[id]` (`packages/shared/src/judge/generated/interview.ts`: Markdown with `##` sections such as
    "Clarify first"; parse by heading, tolerate missing sections). Follow-ups from 0101 (`FOLLOWUPS[id]`) when that plan is merged;
    skip the section when it is not.
  - design (0097): `DESIGN_PROMPTS[id]` (`opening`, `facts`, `twists`, `strong`, `weak`) and `DESIGN_DEEP[id].criteria`
    (`area`, `strong`, `weak`) from `packages/shared/src/learn/`.
  - LLD (0098): `LLD_PROMPTS[id]` (`requirements`, `run`, `extension`, `edgeCases`, `strong`, `weak`).
  - behavioural (0095, 0098): `BEHAVIORAL_QUESTIONS` (`text`, `followUps`, `strong`, `weak`, `principles`) and `PRINCIPLES`.
- **Rubrics:** `RUBRICS` from 0096 and the per-kind files (0097, 0098). The score sheet in the HTML file embeds the rubric (criteria and
  anchors) so it works offline.
- **Print:** the app already has a print button in Quick revise (`apps/web/app/revise/print-button.tsx`); the guide view reuses the
  same approach (`window.print()` with a print stylesheet).
- Conventions: `AGENTS.md`. Content in the guides is assembled from existing app content, so no new facts; wording that the
  builder adds (labels, instructions) is our own and short.

## Data shapes (new)

`packages/shared/src/mock/friend-types.ts`

```ts
export type GuideBlock =
  | { type: "say"; title: string; lines: string[] }                  // words the interviewer can say out loud
  | { type: "hold"; title: string; items: { topic: string; answer: string }[] }  // facts to give only when asked
  | { type: "ladder"; title: string; steps: string[] }               // hints, smallest first
  | { type: "watch"; title: string; strong: string[]; weak: string[] } // what to listen for
  | { type: "twist"; title: string; say: string; goodAnswer: string; when: string }
  | { type: "notes"; title: string; items: string[] };               // reference outline, follow-ups, edge cases
export interface GuideDoc {
  v: 1;
  kind: MockKind;
  promptRef: string;
  title: string;                      // "Interviewer guide: Merge Intervals"
  minutes: number;                    // suggested length
  phases: { id: string; label: string; minutes: number; hint: string }[];
  blocks: GuideBlock[];
  rubricKind: MockKind;
  rubricVersion: number;
  sid: string;                        // the mock_sessions id this guide was made for ("" for a generic guide)
  madeOn: string;                     // YYYY-MM-DD
}
/** What the friend sends back. */
export interface FriendResult {
  v: 1;
  sid: string;
  rubricVersion: number;
  name: string;                       // the friend's first name or initials, max 40 chars
  levels: Record<string, 1 | 2 | 3 | 4>;   // criterion id -> level
  notes: Record<string, string>;      // criterion id -> short comment, max 200 chars each
  summary: string;                    // max 600 chars
}
```

Result code format: `ZDM1.` + base64url of the UTF-8 JSON of a `FriendResult`. Maximum 4,000 characters. `decodeResult(code, ctx)` returns
`{ ok: true, result, sheet } | { ok: false, error }` and rejects: wrong prefix, bad base64 or JSON, `v` not 1, `sid` different from the
session, `rubricVersion` different from the rubric in use, a criterion id that is not in the rubric, a level outside 1-4, a missing
criterion, strings over their limits. It strips control characters and angle brackets from names and notes. The code is **not
signed**: it is the friend's opinion, shown as "Scored by <name>" and kept in `scores.friend`; it never changes your own scores and
never triggers the miss rules twice (0096's rule: only `self`, or `friend` when no `self` sheet exists).

Standalone HTML file rules (`renderGuideHtml(doc, rubric): string`): one string, inline CSS and JS only, no external URL of any kind
(no fonts, no CDN, no images), valid at 390 px and 1280 px, light and dark (`prefers-color-scheme`), everything from `GuideDoc` and
`Rubric` HTML-escaped, no `eval`, no `innerHTML` with data (build nodes with `textContent`). Sections: Before you start (how to run
the round, 5 lines), the phases with a simple timer the friend can start, the blocks, the score sheet (one card per criterion with the
four anchors as radio buttons and a note field), a "Make result code" button that shows the code and a "Copy" button, and a
footer that says it was made by Zen Dojo on the given date. The file works if the friend opens it from a chat attachment on a phone.

## Routes and UI

| Route | File | What |
|---|---|---|
| `/mock/friend` (query `?kind=&ref=&session=`) | `apps/web/app/mock/friend/page.tsx` | choose a kind and a prompt, preview the guide, Download, Copy as text, Print (one page, no per-prompt routes) |
| mock setup pages | one line in each `new-form.tsx` | "Interviewer: Me, AI, A friend" radio; "A friend" shows a note and a "Get the guide" link that opens `/mock/friend` with the prompt chosen |
| session result | `apps/web/app/mock/friend-import.tsx`, mounted in `MockResult` | "Add a friend's score": a textarea for the result code, "Add", then the friend's sheet appears beside yours (anchors, notes, summary) |

The Interview hub gets a card **Mock with a friend** (one entry appended to 0096's `HUB_LINKS`). When `interviewer = "friend"` the live
session hides nothing, but the result page shows the import box first and the self-score second.

Two ways to use the kit: (a) **you are the candidate**: start a mock with the friend as interviewer, send the friend the file made
for this session (`sid` set), the friend scores on their phone, you paste the code; (b) **you are the interviewer**: open
`/mock/friend`, pick any prompt, download the generic file (`sid` empty) and use it yourself; no import step.

## Out of scope

- Hosted share links, accounts for the friend, real-time sync of the session, video calls, screen sharing.
- Signing or verifying that the code came from a real person (it is an opinion, not a credential).
- Guides for the OA kind (0102 has no interviewer) and for company-specific rounds (0108).
- New interview content; the guide only re-arranges what the app already holds.
- Exporting your transcript to the friend (they see your screen on a call).

## Steps

Step 0 first, then agents A-D in parallel on disjoint files.

- [ ] **0. Foundation (lead).** Create `packages/shared/src/mock/friend-types.ts` (above), `friend-guide.ts` (`buildGuide(kind, ref, ctx): GuideDoc | null`,
  dispatching to the per-kind builders; bodies throw), `friend-render.ts` (`renderGuideHtml`, `renderGuideText`; bodies throw),
  `friend-code.ts` (`encodeResult`, `decodeResult`; bodies throw), empty per-kind files `friend-guide-{coding,design,lld,behavioral}.ts`
  exporting a builder that returns `null`, export all from `packages/shared/src/mock/index.ts`. Add `apps/web/app/mock/friend/page.tsx`
  (heading only), add the hub card, and the `interviewer` radio to the coding setup form (0096) only. Decide `ctx` shape:
  `{ today: string; sid: string; rubric: Rubric; followups?: Record<string, Followup[]> }` (the web layer passes `FOLLOWUPS` when it exists).
  - Done when: `pnpm -r typecheck` passes and `/mock/friend` renders.
- [ ] **1. Agent A: coding and design guides.** Files: `friend-guide-coding.ts`, `friend-guide-design.ts`, `friend-guide-a.test.ts` (all in
  `packages/shared/src/mock/`). Coding blocks: "Say" (the problem statement, read as written, plus "ask the candidate to restate it"),
  "Hold back" (constraints and edge cases the candidate should ask about), "Ladder" (the problem's `hints` in order, with "give one
  only after two minutes of being stuck"), "Watch" (from the interview section on the optimal idea and complexity; strong and weak
  from the rubric anchors for levels 4 and 1), "Notes" (reference outline: `solution.idea`, complexity, follow-ups when present).
  Design blocks: "Say" (`opening`), "Hold back" (`facts`), "Twist" (one block per twist with its phase), "Watch" (`strong`, `weak`),
  "Notes" (the `DESIGN_DEEP[id].criteria` rows as "area: strong / weak", capped at 8). Phases from `PHASES[kind]` scaled to the
  suggested minutes (coding 45, design 45).
  Context budget: this plan, `friend-types.ts`, `packages/shared/src/mock/{types.ts, design-prompts-types.ts, phases.ts}`,
  `packages/shared/src/judge/types.ts` (ProblemSpec), and for the test one or two entries of `INTERVIEW` (read the headings only).
  - Done when: `pnpm exec vitest run packages/shared/src/mock/friend-guide-a.test.ts` passes: a guide for a known coding id and a known
    `sdd-` id has every block type it should; an unknown ref returns `null`; a problem without an `INTERVIEW` entry still builds (no
    "Notes" outline, no throw); hints keep their order; no block is empty; with `followups` passed the section appears, without it it does not.
- [ ] **2. Agent B: LLD and behavioural guides.** Files: `friend-guide-lld.ts`, `friend-guide-behavioral.ts`, `friend-guide-b.test.ts`.
  LLD blocks: "Say" (`opening` and the numbered `requirements`, given up front), "Hold back" (`edgeCases` as topics the candidate
  should raise), "Twist" (the `extension`, phase `extend`, `touches` as the good answer), "Watch" (`strong`, `weak`), "Notes" (reference
  class names from `LLD_PROJECTS[id]` file names, and `lldGuide(id).patterns`). Behavioural blocks: for `ref` = one question id or a
  comma list of up to five: "Say" (each question), "Ladder" (its `followUps`), "Watch" (`strong`, `weak`, and the principle meaning from
  `PRINCIPLES` as "listen for": `listenFor`), "Notes" (a reminder: the interviewer interrupts with one follow-up, not a lecture).
  Context budget: this plan, `friend-types.ts`, `packages/shared/src/mock/{lld-prompts-types.ts, types.ts}`,
  `packages/shared/src/behavioral/types.ts`.
  - Done when: `pnpm exec vitest run packages/shared/src/mock/friend-guide-b.test.ts` passes (LLD guide for `lldp-parking-lot`, behavioural
    guide for two question ids, unknown id returns `null`, no empty blocks).
- [ ] **3. Agent C: renderers and result code.** Files: `friend-render.ts`, `friend-code.ts`, `friend-render.test.ts`, `friend-code.test.ts`.
  Implement `renderGuideHtml`, `renderGuideText` (plain Markdown: headings, bullets), `encodeResult`, `decodeResult`, and the small
  inline script of the HTML file (timer, radio state, building the code with `btoa` over UTF-8 and base64url, copy button with a
  fallback to selecting the text). Context budget: this plan, `friend-types.ts`, `packages/shared/src/mock/{types.ts, score.ts}`,
  `docs/mockups/interview-prep/0100-mock-with-a-friend-kit.html` (the file's look: colours, spacing; reuse the token values inline).
  - Done when: `pnpm exec vitest run packages/shared/src/mock/friend-render.test.ts packages/shared/src/mock/friend-code.test.ts` passes:
    the HTML has no `http://`, `https://`, `src=` or `<link` (except an `<a>` to nothing); data containing `<script>`, quotes and `&`
    is escaped; round trip `encodeResult` then `decodeResult` returns the same levels and notes; every rejection case in the rules
    above is covered (wrong `sid`, wrong `rubricVersion`, level 5, missing criterion, unknown id, over-long note, bad base64, 5,000
    characters); the base64url helper used by the HTML file and by `decodeResult` gives the same bytes for ASCII and for text with accents.
- [ ] **4. Agent D: UI and wiring.** Files: `apps/web/app/mock/friend/page.tsx`, `apps/web/app/mock/friend/friend-picker.tsx`,
  `apps/web/app/mock/friend/guide-preview.tsx`, `apps/web/app/mock/friend-import.tsx`, `apps/web/app/mock/friend/download.ts`,
  the `interviewer` radio in the other setup forms (design, LLD, behavioural: one control each, only if those pages exist),
  `apps/web/lib/mock-friend.ts` (+ test: `importFriendResult(sessionId, code)` calls `decodeResult` then `saveScores(id, "friend", ...)`).
  Page: kind tabs, a prompt picker with search (coding problems from `JUDGE_PROBLEMS`, designs, LLD, questions), a preview of the
  guide (same blocks, read-only), buttons Download file (`Blob` download, file name `zen-dojo-interviewer-guide-<ref>.html`),
  Copy as text, Print (print stylesheet shows only the guide). With `?session=<id>` the file is made for that session (`sid` set).
  Import box in `MockResult`: paste, Add, error text in plain words ("This code is for a different mock", "This code is for an older
  version of the score sheet"), then the friend's sheet in a card.
  Context budget: this plan, the mockup, `packages/shared/src/mock/friend-*.ts` (signatures only), `apps/web/app/mock/mock-result.tsx`,
  `apps/web/app/revise/print-button.tsx`, `apps/web/lib/mock.ts` (`saveScores` signature), `DESIGN.md` sections 3-4.
  - Done when: `pnpm exec vitest run apps/web/lib/mock-friend.test.ts` passes (valid code stores `scores.friend` and leaves `scores.self`
    alone; wrong session rejected; second import replaces the first); in the browser a downloaded file opens, scores, makes a code,
    and the code imports; at 390 and 1280 px.
- [ ] **5. Wire-up and review (lead).** Open a downloaded file with the network off; check no request is made. Run `pnpm check` once.
  - Done when: `pnpm check` passes and the offline check is in *Implementation notes*.

## Acceptance criteria

- [ ] `/mock/friend` builds a guide for a coding problem, a system design, an LLD problem and one to five behavioural questions.
- [ ] The downloaded file works offline on a phone, shows no external request, includes the score sheet for the right rubric version,
      and makes a result code.
- [ ] Pasting the code into a mock session adds the friend's scores and comments next to yours; a code for another session or an old
      rubric version is refused with a plain message.
- [ ] Your own scores are never changed by an import; the miss rules do not run twice.
- [ ] Guides use only content already in the app; a missing interview write-up or follow-up list does not break a guide.
- [ ] `pnpm check` passes
- [ ] No changes outside the files listed above (or explained in *Implementation notes*)

## Estimate

- Step 0: 0.25 agent-day.
- Parallel: A 0.75, B 0.5, C 0.75, D 0.75 agent-days, so about 0.75 calendar days.
- Review and fixes: 0.25 day.
- Total: **about 1.5 to 2 calendar days**, after 0096 and (for the design, LLD and behavioural guides) 0097, 0098 and 0095 are merged.
  The coding guide and the whole file and code path can be built and reviewed right after 0096.
- Main risk: the standalone HTML file must stay free of external requests and unsafe string handling (the tests in step 3 are the guard);
  second risk is the order of merges (the per-kind builders return `null` until their data exists, so the plan degrades instead of failing).

## Dependencies

- **0096** (hard). **0097**, **0098**, **0095** (for design, LLD, behavioural guides; the builders return `null` until each exists).
  **0101** (optional follow-ups in the coding guide). 0099 is independent: the AI interviewer and the friend are alternatives chosen by
  `settings.interviewer`.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
