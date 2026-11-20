# 0111: Optional tracks through the course library (ML, frontend, mobile system design)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0111-optional-tracks.html (the filtered library view; it lives inside the Learn page, below the course cards)

## Goal

Most SWE interviews need DSA, system design and low-level design, which the app already covers. Some roles add a
specialist round: **ML system design**, **frontend** (browser, performance, UI design) or **mobile system design**. Ship these
as three **optional tracks** in the existing course library (plan 0081), so nobody downloads what they do not need, and make
the library easier to use for them: a category filter, a "See topics" preview before downloading, a time estimate, and a
small "Which tracks do I need?" helper.

## Context

Exists (confirmed on 2026-11-21):

- Content packs: `packages/shared/src/packs.ts` (`Pack`, `PackLesson`, `validatePack`, `validateFeed`, `FeedPackEntry` with
  `category`, `bytes`, `items`, `minAppVersion`, `DEFAULT_COURSE_CATALOG_URL`), `docs/content-packs.md` (format, limits: 2 MB,
  500 items, 60,000 characters of text per lesson, Mermaid supported in lessons).
- Library: `apps/web/lib/packs.ts` (`getCourseLibrary`, `LibraryCourse`, `installLibraryCourse`, catalog cache in settings),
  UI in `apps/web/app/study/page.tsx` (`CourseLibrarySection`, a horizontal card strip) and `library-download.tsx`;
  tests in `apps/web/lib/course-library.test.ts` and `courses-catalog-script.test.ts`.
- Catalog builder `scripts/courses-catalog.mjs` (`pnpm courses:catalog <courses repo>`; fills `sha256`, `bytes`, `items`,
  `category`), pack checker `pnpm pack:check`, example repo layout in `docs/examples/courses-repo/`. The live courses live in
  the separate repo `Vraj0109/zen-dojo-courses` (the lead copies finished packs there; agents do not touch it).
- Learn course cards and progress for installed packs already work (`listPacks`, `getPackProgress`).

New: lesson **source Markdown** in this repo under `courses-src/<course-id>/` (so lessons are reviewable and testable in
diffs), a builder `scripts/pack-from-md.mjs` that turns a folder into a valid pack JSON, three courses, two optional catalog
fields (`topics`, `minutes`), and the library UI changes.

Conventions (`AGENTS.md`): our own words, learning content written for this app (no copying from books, courses, blogs or
company engineering posts), plain short sentences, no emoji, accuracy first; Next 16 `cacheComponents` rules for UI;
tests next to code. A lesson that explains how something works at a company says "commonly" and stays general; no internal
or leaked details.

## The three tracks (lesson lists are fixed so agents do not overlap)

Pack ids, category `"Optional tracks"`, `revision: "1.0.0"`. Lesson ids `<prefix>-<slug>`; about 900 to 1,400 words each.

**`ml-system-design`, "ML system design" (16 lessons, prefix `ml-`)**: framing (framing an ML problem and picking metrics),
data (data, labels and leakage), features (features, feature stores and training-serving skew), baselines (baselines and
model choice), offline-eval, online-eval (A/B tests and guardrail metrics), embeddings-ann (embeddings and nearest-neighbour
search), recsys (recommendation: candidates then ranking), search-ranking, ads-ctr (click prediction and calibration), fraud
(fraud and anomaly detection), llm-rag (LLM features and retrieval-augmented generation), serving (model serving, latency and
cost), monitoring (monitoring and drift), pipeline (training pipelines and retraining), template (a 45-minute answer template
and a 5-minute drill).

**`frontend-interview`, "Frontend interview" (16 lessons, prefix `fe-`)**: browser-render (how the browser renders a page),
event-loop (JavaScript event loop and async), performance (loading, Core Web Vitals, rendering cost), networking-caching
(HTTP caching, CDNs, prefetching), state (state management choices), components (component API design), a11y (accessibility
basics that interviewers check), security (XSS, CSRF, CSP), build (bundling and code splitting), testing (what to test in the
UI), design-autocomplete, design-infinite-feed, design-chat-ui, design-collab-editor (concepts only: operations, conflicts),
design-dashboard, js-coding (debounce, throttle, promise helpers, deep clone, event emitter: each with a runnable snippet).

**`mobile-system-design`, "Mobile system design" (14 lessons, prefix `mob-`)**: lifecycle (app lifecycle and why the process
is killed), architecture (layers, unidirectional data flow), networking (requests on bad networks, retries, pagination),
offline-sync (local database as source of truth, sync and conflicts), storage (databases, key-value, secure storage), battery-memory
(battery, memory and background limits), push (push notifications and delivery), images (loading, caching, memory), releases
(staged rollout, feature flags, forced updates), security (tokens, pinning, device storage), design-chat, design-feed,
design-upload (photo and video upload with resume), template (answer template and drill).

### Lesson shape (every lesson, as Markdown)

`# Title`, then `## Overview` (what it is, why interviewers ask), `## Core ideas` (the points to be able to say out loud,
with one Mermaid diagram where a picture helps), `## Worked example` (design lessons: requirements, rough numbers, design,
deep dives, trade-offs; concept lessons: one concrete scenario), `## What interviewers listen for` (4 to 6 bullets),
`## Interview questions` (4 to 6, to answer out loud), `## Common mistakes` (3 to 5). Code only where it teaches. JavaScript and
Python snippets must run (`node`, `python`); Kotlin and Swift snippets are short sketches labelled "sketch" and kept
syntactically simple. Say which numbers are rough estimates. Do not claim how a named company builds a product.

## Data and file layout

```
courses-src/<course-id>/course.json   { "id", "title", "description", "category": "Optional tracks", "revision": "1.0.0",
                                        "sections": [ { "title": "...", "files": ["01-framing.md", ...] } ] }
courses-src/<course-id>/NN-<slug>.md  one lesson; lesson id = "<prefix>-<slug>"; title = first "# " line
```

`description` is two sentences: what the track covers, then "Good if ..." (who needs it).

Catalog additions (both optional, so old catalogs still validate): `topics?: string[]` (up to 8 lesson titles, each at most
80 characters) and `minutes?: number` (estimated study time: total words / 60 (reading plus answering out loud), rounded to 5, at most 600). Produced by
`scripts/courses-catalog.mjs` from the pack; read by the library UI.

## Out of scope

- Practice problems, quizzes or judged code in the tracks (lessons only; a later plan can add problems).
- Other tracks (security, data engineering, DevOps, embedded). Adding one later is a folder in `courses-src/` plus a catalog run.
- Changing the built-in system design or LLD areas, or the pack format version.
- Publishing: the lead copies the three pack files into `Vraj0109/zen-dojo-courses`, runs `pnpm courses:catalog`, and pushes
  there. The agents never push or touch that repo.
- Paid or private courses, ratings, comments.

## Steps

### Step 0 (lead, before agents): builder and skeleton

- [ ] **0a. Builder.** `scripts/pack-from-md.mjs` and the script `pnpm pack:md <course-dir> -o <pack.json>` in the root
  `package.json` (same `register-ts` flags as `pack:check`). It reads `course.json` and the Markdown files, builds
  `{ format: "zendojo-pack", version: 2, id, title, description, category, revision, sections: [{ title, items: [{ type: "lesson",
  id, title, markdown }] }] }`, runs `validatePack`, refuses a lesson that contains `TODO` (override with `--draft`) or is
  under 400 words, and prints item count, bytes and the estimated minutes. Test in `scripts/pack-from-md.test.ts` (or next to
  `courses-catalog-script.test.ts`): a temp folder with two lessons builds; a missing file, a duplicate id, a `TODO` and a
  lesson over the 60,000-character limit each fail with a clear message.
  - Done when: `pnpm exec vitest run scripts/pack-from-md.test.ts` (or the path used) passes.
- [ ] **0b. Skeleton.** Create `courses-src/ml-system-design/`, `frontend-interview/`, `mobile-system-design/` with
  `course.json` (sections and file lists from the lesson lists above, e.g. sections "Foundations", "Designs", "Practice") and one
  placeholder `.md` per lesson containing only `# Title` (the build refuses them without `--draft`, which is intended).
  - Done when: `pnpm pack:md courses-src/ml-system-design --draft -o <scratch>/ml.json` succeeds for all three.

### Agents (after step 0, in parallel, disjoint files)

- [ ] **1. Agent A: ML system design.** Only `courses-src/ml-system-design/*.md`: write all 16 lessons.
  - Context budget (read only this): this plan, `courses-src/ml-system-design/course.json`,
    `packages/shared/content/sd/` one design lesson as a tone and length example, "The Markdown format" and Mermaid parts of
    `docs/content-packs.md`. Nothing else.
  - Done when: `pnpm pack:md courses-src/ml-system-design -o <scratch>/ml.json` succeeds (no TODO, each lesson 800 words or
    more), `pnpm pack:check <scratch>/ml.json` passes, every Python snippet ran, and *Implementation notes* list per lesson
    the scenario used.
- [ ] **2. Agent B: Frontend interview.** Only `courses-src/frontend-interview/*.md`: 16 lessons; every JavaScript snippet
  in `js-coding` and elsewhere was run with `node` (say so per lesson).
  - Context budget and Done when: as agent A (with `frontend-interview`, `fe.json`).
- [ ] **3. Agent C: Mobile system design.** Only `courses-src/mobile-system-design/*.md`: 14 lessons; Kotlin and Swift
  snippets are labelled sketches.
  - Context budget and Done when: as agent A (with `mobile-system-design`, `mob.json`).
- [ ] **4. Agent D: library UI and catalog.** Files: `packages/shared/src/packs.ts` (`topics`, `minutes` in `FeedPackEntry` and
  `validateFeed`: wrong types rejected, both optional), `scripts/courses-catalog.mjs` (fill `topics` from the first 8 lesson
  titles and `minutes` from word count), `apps/web/lib/packs.ts` (pass the fields through `LibraryCourse`; add
  `TRACK_ROLES` mapping a role to suggested track ids: backend none, ML engineer `ml-system-design`, frontend
  `frontend-interview`, mobile `mobile-system-design`, full stack `frontend-interview`), `apps/web/app/study/page.tsx` and a
  new `apps/web/app/study/library-filter.tsx` (client component: category chips built from the catalog's categories with "All"
  first; with "All" the strip stays as today, with a category chosen the cards wrap in a grid; "See topics" toggles
  the `topics` list on a card with `aria-expanded`; time shown as "about 5 hours"; the "Which tracks do I need?" card with a
  role select showing the suggestion), `docs/content-packs.md` (a short "Optional tracks and courses-src" section and the two
  new catalog fields), `apps/web/lib/faq.ts` one entry ("Do I need the ML, frontend or mobile tracks?").
  - Context budget: this plan, the mockup, `apps/web/app/study/page.tsx`, `library-download.tsx`, `apps/web/lib/packs.ts`
    (library part), `packs.ts` in shared (`FeedPackEntry`, `validateFeed`), `scripts/courses-catalog.mjs`.
  - Done when: with a mocked catalog of three tracks the filter, the preview and the helper work at 1280 and 390 px in light and
    dark; old catalogs without `topics` or `minutes` still render; `course-library.test.ts` and
    `courses-catalog-script.test.ts` pass with new cases.

### Step 5 (lead): finish

- [ ] **5a.** Build the three packs, run `pnpm pack:check` on each, run `pnpm courses:catalog` on a copy of the courses repo
  (`docs/examples/courses-repo/` layout) and confirm `topics` and `minutes` appear. Read two lessons per track in the browser
  after installing the packs from local files (Settings, content packs), check a Mermaid diagram renders. Spot-check five factual
  claims per track against general knowledge and fix or delete what is wrong.
- [ ] **5b.** `pnpm exec vitest run apps/web/lib/course-library.test.ts scripts` then `pnpm check` once. Then copy the packs and
  catalog into the courses repo and tell the user (the user pushes).

### Tests

- `scripts/pack-from-md` test (step 0a); `packs.test.ts` cases for `topics` and `minutes` validation; `course-library.test.ts` for
  pass-through; `courses-catalog-script.test.ts` for topics and minutes; a test that builds each `courses-src/*` folder and
  asserts: valid pack, the lesson counts above, no `TODO`, each lesson 800 words or more and has the five `##` sections, ids unique
  and prefixed, Mermaid fences balanced.

## Acceptance criteria

- [ ] Three courses (16, 16 and 14 lessons) build to valid packs; every lesson has the five sections and 800 or more words.
- [ ] The Learn library shows category chips, a "See topics" preview, a time estimate and the "Which tracks do I need?" helper;
      the tracks download and appear as Learn courses with progress, as other library courses do.
- [ ] Old catalogs (no `topics`, no `minutes`) still validate and render.
- [ ] Code snippets run (JavaScript, Python) or are clearly labelled sketches; nothing is copied; no claims about how named
      companies build products.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files named above (or explained in *Implementation notes*).

## Estimate

- Step 0: 0.25 agent-day (builder plus skeleton).
- Parallel agents: 1.5 agent-days wall time (three content agents write 46 lessons of about 1,100 words, about 50,000 words in all, plus snippet runs; agent D's UI work finishes inside that time). Comparable to 0090 (486 walkthroughs in about 1.5 days).
- Review and fixes: 0.3 day (accuracy spot-check is the long part).
- **Total: about 2 calendar days.**
- Main risk: technical accuracy of specialist content (ML metrics, mobile OS behaviour changes between releases). Mitigation:
  hedged wording ("commonly", "check the current platform docs"), a factual spot-check in step 5, and a yearly re-check noted in
  each course description.

## Dependencies

- Builds on 0081 (course library, implemented). Independent of 0095-0110. 0108 may link to these tracks from company pages
  (Google and Meta ML roles) once they are published.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
