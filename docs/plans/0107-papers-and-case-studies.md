# 0107: Papers and engineering case studies in the app

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** SPEC.md section, if any
- **Mockup:** docs/mockups/interview-prep/0107-papers-and-case-studies.html
- **Depends on:** none. Set 0095-0111: 0097 (system design mock) and 0099 (AI interviewer) can use these lessons as
  follow-up material; not required.

## Goal

Strong system design answers borrow from the classic papers (Dynamo, Raft, Bigtable, Spanner) and from public postmortems
and engineering write-ups. Today `reading.ts` only holds links. Add **24 paper lessons and 16 case-study lessons**, written in
our own words: the problem, the core idea, how it works, trade-offs, and exactly what to say in an interview, with a link to the
original and a "last checked" date. They are normal study lessons (checklist, confidence, review) in the System design course,
plus a **Papers and case studies** index page to browse them.

## Context

- Study areas and concepts: `packages/shared/src/study.ts` (`SYSTEM_DESIGN`, sections `sd-fundamentals`, `sd-storage`,
  `sd-blocks`, then the classic designs). Lessons are Markdown in `packages/shared/content/sd/<concept-id>.md`
  (`docs/content-editing.md`, section "The Markdown format"), built by `pnpm content:build` into
  `packages/shared/src/learn/generated/lessons.ts`; `learn.test.ts` fails for any concept without a lesson. This is exactly how plan
  0093 added 27 pattern lessons (`docs/plans/0093-design-patterns-catalogue.md`): follow its structure.
- `packages/shared/src/reading.ts` already links 11 of the papers (ids `dynamo`, `gfs`, `mapreduce`, `bigtable`, `chubby`, `spanner`,
  `dapper`, `raft`, `zookeeper`, `cassandra`, `memcache-fb`) and several write-ups (`discord-messages`, `figma-multiplayer`,
  `uber-h3`, `stripe-idempotency`, `stripe-rate-limiters`, `snowflake`, `the-log`, `s3-durability`). Reading entries list the concept ids
  they help with in `items`; the lesson page shows them. Adding the new concept ids to those `items` arrays is how a lesson gets its
  "original" link, so no content-pipeline change is needed.
- Tests that count things: `apps/web/lib/study.test.ts` asserts the System design section sizes (`[8, 10, 14]` at the time of
  planning) and `packages/shared/src/focus.test.ts`/`study.test.ts` may check that concepts appear in a week focus; the implementer
  updates the counts and, if a test requires every concept to sit in the roadmap, adds these to the week where "D. Classic designs" is studied
  or exempts them with a one-line comment.
- Index page: `apps/web/app/study/` (see `reading/page.tsx` for a page of cards); study data via `getStudyView("sd")`
  (`apps/web/lib/study.ts`) gives per-concept confidence for the progress marks.
- No new database table, migration or sync.
- **Content rules (important):** our own words, plain short sentences, no emoji. Never copy sentences, figures or diagrams from a
  paper or a company blog; no quotes. Company facts must be general and publicly stated by the company; do not use or guess internal
  numbers. Give a number only if the source states it, say "as reported in <year>", round it, and mark that it may have changed.
  Every lesson ends with a "Sources and last checked" section holding the original title, authors or company, venue or site, year, the
  URL as it is in `reading.ts`, and `Last checked: YYYY-MM-DD`. If an agent cannot verify a claim or the link, it leaves the claim out
  or replaces the item (and says so in *Implementation notes*).

## The 40 lessons

Concept ids and titles (sentence case). Papers (`pp-`), section "E. Papers", 24:

| Agent | Concepts |
|---|---|
| A (12) | `pp-dynamo`, `pp-gfs`, `pp-mapreduce`, `pp-bigtable`, `pp-chubby`, `pp-spanner`, `pp-dapper`, `pp-raft`, `pp-zookeeper`, `pp-cassandra`, `pp-memcache-fb` (Scaling Memcache at Facebook), `pp-paxos` (Paxos made simple) |
| B (12) | `pp-kafka` (the Kafka log paper), `pp-borg`, `pp-tao` (Facebook's social graph store), `pp-haystack` (Facebook photo storage), `pp-zanzibar` (Google authorization), `pp-aurora`, `pp-percolator`, `pp-gorilla` (in-memory time series), `pp-crdt` (conflict-free replicated data types), `pp-consistent-hashing` (Karger et al.), `pp-lsm-tree`, `pp-dremel` |

Case studies (`cs-`), section "F. Engineering case studies", 16 (agent C):
`cs-discord-messages`, `cs-figma-multiplayer`, `cs-uber-h3`, `cs-stripe-idempotency`, `cs-stripe-rate-limiting`, `cs-twitter-snowflake`,
`cs-instagram-sharded-ids`, `cs-pinterest-sharding`, `cs-dropbox-magic-pocket`, `cs-netflix-chaos-engineering`, `cs-notion-postgres-sharding`,
`cs-linkedin-kafka-log`, `cs-github-2018-outage` (public postmortem), `cs-cloudflare-2019-regex-outage` (public postmortem),
`cs-aws-s3-2017-outage` (public postmortem), `cs-facebook-2021-outage` (public postmortem).
If a source for one of them cannot be found as a public, stable page, replace it with another public engineering write-up or postmortem
that is in `reading.ts`, keep the `cs-` prefix, and record it.

## Lesson format (each agent, per concept)

File `packages/shared/content/sd/<id>.md`; front matter `id`, `title` (same as `study.ts`), `area: sd`, `section: E. Papers` or
`F. Engineering case studies`. Two shared checklists (use exactly this text in `study.ts`):

```ts
const PAPER_POINTS = "The problem and the setting; The core idea; How it works; Trade-offs and limits; Where it shows up in system design interviews";
const CASE_POINTS = "The problem and the scale; What they changed; Why it worked and what it cost; What you would say in an interview; Related designs and concepts";
```

- `## Overview` 2-4 sentences. `## What to know`: the five points, `N. <point text exactly> :: <explanation, 2-5 sentences>`. `## Recap`: 2-3 one-liners.
- `## Go deeper`, in this order: `### The problem and the setting {point: 0}` (or "The problem and the scale"), `### The core idea {point: 1}`
  (or "What they changed"), `### How it works {point: 2}` (one `mermaid` diagram, flowchart or sequence, drawn by us), `### Trade-offs and limits {point: 3}`,
  `### In interviews {point: 4}` (name the `sd-*` concepts and `sdd-*` designs of this app it informs, what to say in one breath, the usual
  misreading), then `### Sources and last checked` (no point).
- `## Interview questions` 3-5, `## Common mistakes` 3-5.
- Papers: 600-900 words in total beyond the headings, case studies 500-800. Say what the paper does NOT solve.

## Out of scope

- Changing the existing designs (`sdd-*`), walkthroughs, `reading.ts` entries other than adding concept ids to `items` and the missing papers.
- Quizzes and flashcards for the new lessons, AI summaries, copies of PDFs, or fetching papers at run time.
- Other papers or blogs than the 40 listed; company interview "leaks".

## Steps

Step 0 is the lead (about half a day). Then A-D in parallel with disjoint files. Only the lead runs `pnpm content:build` and `pnpm check`.

- [ ] **0. Lead: skeleton.**
  - `packages/shared/src/study.ts`: add two sections after the last existing SD section, `sd-papers` ("E. Papers", 24 concepts, `PAPER_POINTS`)
    and `sd-case-studies` ("F. Engineering case studies", 16 concepts, `CASE_POINTS`), titles as in the table, in table order; `weeks` like the
    classic designs section. Update `apps/web/lib/study.test.ts` and any other count assertion.
  - `packages/shared/src/reading.ts`: add the missing papers as entries (`paxos`, `kafka-paper`, `borg`, `tao`, `haystack`, `zanzibar`, `aurora`,
    `percolator`, `gorilla`, `crdt`, `karger-hashing`, `lsm-tree`, `dremel`, plus entries for case-study sources that are not there yet:
    Instagram IDs, Pinterest sharding, Dropbox Magic Pocket, Netflix chaos engineering, Notion sharding, and the four postmortems), each with
    the real public URL, `kind`, `by` and a one-line `why` of our own; add the new concept ids to `items` of the entries that already exist.
    The lead verifies every URL opens (browser or `curl -I`) and records the date.
  - Page skeleton `apps/web/app/study/papers/page.tsx` ("not yet" empty state). Then `learn` tests fail only for the 40 missing lessons.
  - Done when: `pnpm content:check` passes (it reports "out of date" once lessons are added; expected), `pnpm exec vitest run packages/shared/src/learn`
    fails only on "every concept has a lesson", `pnpm exec vitest run apps/web/lib/study.test.ts` passes.
- [ ] **1. Agent A: papers part 1 (12).** Owns `packages/shared/content/sd/pp-*.md` for the 12 ids of row A.
- [ ] **2. Agent B: papers part 2 (12).** Owns the 12 `pp-*.md` files of row B.
- [ ] **3. Agent C: case studies (16).** Owns `packages/shared/content/sd/cs-*.md`.
  - Each agent, per file: write from your own understanding; open the public original (paper page or company blog) to check names, years and any number
    you use; add the diagram; run `pnpm content:check`.
  - Context budget (read only this): this plan; the "The Markdown format" section of `docs/content-editing.md`;
    `packages/shared/content/sd/sd-cap.md` as a style example; the reading entry for your item in `packages/shared/src/reading.ts`; the original.
    Do not run `pnpm content:build`, do not edit `study.ts`, `reading.ts` or other agents' files.
  - Done when: your files pass `content:check`; each has the five points, a mermaid diagram, interview questions, common mistakes, and a "Sources and last
    checked" section with the URL and `Last checked: 2026-11-DD`; you listed in *Implementation notes* per file the one number you used (or "none") and its
    source year.
- [ ] **4. Agent D: index page and tests.** Owns `apps/web/app/study/papers/**` and `packages/shared/src/papers.test.ts`.
  - `/study/papers`: header, filter chips (All, Papers, Case studies, plus topic chips derived from a `topic` map in `apps/web/app/study/papers/topics.ts`:
    storage, consensus, caching, messaging, scheduling, observability, outages), a card per lesson (title, kind chip, year, one-line what-it-teaches taken
    from the lesson's *Overview* first sentence, confidence mark from `getStudyView`), link to `/study/sd/<id>`, and a "Read the original" link from
    `reading.ts`. Linked from the System design course page (a button "Papers and case studies") and from `study/page.tsx` if there is room. See the mockup.
  - Tests (`packages/shared/src/papers.test.ts`): 24 `pp-` and 16 `cs-` concepts exist in `SYSTEM_DESIGN`; each has a lesson in the generated lessons; each lesson
    contains a "Sources and last checked" section with a date `YYYY-MM-DD` and an `https://` URL; each concept id appears in the `items` of at least one reading entry
    whose URL is the one in that section; no lesson body has emoji; each lesson has a mermaid block; word count 400-1200.
  - Context budget: this plan; the mockup; `apps/web/app/study/reading/page.tsx`; `apps/web/lib/study.ts`; `packages/shared/src/study.ts`.
  - Done when: the page lists all 40 with filters working with JS and as plain links without, 390 px has no sideways scroll, tests pass once A-C land.
- [ ] **5. Lead.** `pnpm content:build`, `pnpm exec vitest run packages/shared/src/learn packages/shared/src/papers.test.ts apps/web/lib/study.test.ts`,
  accuracy review of 8 lessons (3 papers, 3 case studies, 2 postmortems) against their originals, browser check of `/study/papers`, `/study/sd`
  (two new sections) and two lessons at 1280 and 390 px, `pnpm check`, Review.

## Acceptance criteria

- [ ] The System design course has "E. Papers" (24 lessons) and "F. Engineering case studies" (16 lessons); existing concepts and progress are unchanged.
- [ ] Every lesson has the five points, a diagram, interview questions, common mistakes, the original's link and a last-checked date; no copied text.
- [ ] `/study/papers` browses all 40 with filters and shows your confidence on each.
- [ ] Every new link in `reading.ts` was opened by the lead on the checked date.
- [ ] `learn` tests and `pnpm check` pass.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Estimate

- Step 0 (lead): about 0.5 day (sections, 20-odd reading entries with verified URLs, test counts).
- Agents A, B, C in parallel: about 1.25 days each (12-16 lessons with a diagram and source check each); agent D: about 0.5 day.
- Review (accuracy matters more than usual): about 0.5 day.
- Total: about 2.5 calendar days at the current pace.
- Main risk: confident but wrong detail about a paper or an outage. Mitigation: "leave it out if you cannot check it", numbers only with a source
  year, the lead's 8-lesson accuracy review, and the last-checked line. Second risk: a company page moves; the last-checked date and the lead's URL check make that visible.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
