# 0095: Story bank and behavioural question bank (Amazon principles, Google attributes)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0095-story-bank.html

## Goal

Behavioural rounds are a third of many loops (Amazon tests leadership principles in almost every interview) and the
app has nothing for them. Add a **story bank** (the user writes 8 to 10 real stories once, in STAR form, with numbers and
principle tags), a **question bank** of about 96 behavioural questions tagged to Amazon's 16 leadership principles,
Google's "Googleyness" attributes and ten company-neutral competencies, a **coverage view** that shows which principles
have no story, and a **practise mode** (pick a question, pick a story, speak with a timer, self-rate). Shaky answers
come back through the Review queue. An optional one-shot "Check my story" uses the existing AI helper.

This plan defines the behavioural data that 0098 (behavioural mock) and 0099 (AI interviewer) reuse.

## Context

Exists and is reused (confirmed by grep on 2026-11-21):

- AI: `apps/web/lib/ai/context.ts` (`parseChatRequest` allows exactly one mode: problem, lesson, buddy or portfolio
  summary; `buildChat` builds the prompt on the server), `apps/web/app/api/ai/chat/route.ts`,
  `packages/shared/src/ai-prompts.ts` (pure prompt builders, `trimChatHistory`, `cleanPersona`),
  `apps/web/lib/ai/guard.ts` (`guardAi`, BYOK guard). Cloud providers need the existing consent setting; do not bypass it.
- Review queue: `apps/web/lib/review.ts` (`ReviewItem` union, `REVIEW_KIND_LABELS`, `getReviewQueue`), page
  `apps/web/app/review/page.tsx`, card `review-card.tsx`.
- Sync: `apps/web/lib/sync-triggers.ts` (`SYNC_TABLE_MAP_V1`, `SYNC_TABLE_MAP_V2`, `syncMigrationSqlV2`), `sync-engine.ts`
  (`DEFAULTS` per local table), `sync-schema.ts` (`USER_SYNC_TABLES`), hub copy in `apps/web/lib/hub/migrations.ts`.
- Backup: `BACKUP_TABLES` in `apps/web/lib/backup.ts`. Migrations: `MIGRATIONS` in `apps/web/lib/db.ts`, schema in
  `apps/web/lib/schema.ts`.
- Nav: the Interview hub `/mock` and its nav entry come from plan 0096. This plan adds a card on that hub.

New in this plan: `stories` and `behavioral_progress` tables, `packages/shared/src/behavioral/`, `apps/web/lib/behavioral.ts`,
routes under `/mock/behavioral`, and a "coach" AI mode that 0109 reuses.

Conventions that apply (`AGENTS.md`): Next 16 `cacheComponents` (request data in an async component with
`await connection()` inside `<Suspense>`), server actions in `apps/web/app/actions.ts` call `refresh()`, dates are local
`YYYY-MM-DD` (`dates.ts`), a new table must be added to `BACKUP_TABLES` and to the sync map, never edit a shipped
migration, tests next to the code with `DATABASE_URL=":memory:"`.

### Content rules (all question and principle text)

Our own words. Do not copy question lists from Amazon, Google, LeetCode, Glassdoor, Blind or books. The principle names are
public facts and may be used as names; the one-line meanings are written fresh. Every principle set carries
`source` ("the company's public careers pages") and `lastChecked: "2026-11-21"`. Companies rename and add principles
(Amazon went from 14 to 16 in 2021): the UI shows the last-checked date and the lesson text says to confirm on the
company's own site. No leaked or "real interview" questions, no claims about what a company asks.

## Data model

### `packages/shared/src/behavioral/`

- `types.ts`:
  ```ts
  export type PrincipleSetId = "amazon" | "google" | "core";
  export interface Principle { id: string; set: PrincipleSetId; name: string; meaning: string; listenFor: string[] }
  export interface BehavioralQuestion {
    id: string;              // "bq-001"
    text: string;
    principles: string[];    // Principle ids, 1 to 3
    followUps: string[];     // 2 probing follow-ups an interviewer asks
    strong: string;          // what a strong answer contains, 1 to 2 sentences
    weak: string;            // the usual weak answer, 1 sentence
    level: "all" | "senior"; // "senior" = expects scope, influence or mentoring (SDE2 and up)
  }
  export const STORY_FIELDS: readonly ["situation","task","action","result","learned"];
  ```
- `principles.ts`: `PRINCIPLES: Principle[]` and `PRINCIPLE_SETS: {id, title, source, lastChecked, note}[]`.
  Amazon ids: `amz-customer-obsession`, `amz-ownership`, `amz-invent-simplify`, `amz-right-a-lot`, `amz-learn-curious`,
  `amz-hire-develop`, `amz-highest-standards`, `amz-think-big`, `amz-bias-for-action`, `amz-frugality`, `amz-earn-trust`,
  `amz-dive-deep`, `amz-backbone`, `amz-deliver-results`, `amz-best-employer`, `amz-broad-responsibility` (16).
  Google ids (publicly described "Googleyness" attributes, 7): `ggl-ambiguity`, `ggl-feedback`, `ggl-status-quo`,
  `ggl-user-first`, `ggl-right-thing`, `ggl-team-care`, `ggl-collaboration`. Core ids (10): `core-ownership`,
  `core-conflict`, `core-failure`, `core-influence`, `core-ambiguity`, `core-mentoring`, `core-prioritising`,
  `core-technical-decision`, `core-customer-impact`, `core-feedback`.
- `questions.ts`: assembles `BEHAVIORAL_QUESTIONS` from `questions-amazon.ts`, `questions-google.ts` and
  `questions-core.ts` (exported arrays, so each agent owns its file). Target: Amazon 40 (2 to 3 per principle), Google 21
  (3 per attribute), core 35 (3 to 4 per competency); about 96 in total, at least 30 marked `senior`.
- `coverage.ts` (pure): `storyCoverage(stories, set)` returns per principle the story ids and a `gaps` list;
  `questionStatus(progress)`; `nextQuestions(progress, stories, today, n)` picks practice questions (never practised first,
  then shaky and due, then solid and oldest), preferring principles with no story or a thin one.
- `prompts.ts` is not here: the coach prompt lives in `packages/shared/src/coach-prompts.ts` (step 0, see below).

### Migration (append to `MIGRATIONS` in `apps/web/lib/db.ts`, next free index)

```sql
CREATE TABLE stories (
  id TEXT PRIMARY KEY,                 -- crypto.randomUUID()
  title TEXT NOT NULL,
  situation TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  learned TEXT NOT NULL DEFAULT '',
  metrics TEXT NOT NULL DEFAULT '',    -- free text: "2.1 s to 600 ms; 3.4 points"
  principles TEXT NOT NULL DEFAULT '[]', -- JSON array of principle ids
  created_on TEXT NOT NULL,            -- local YYYY-MM-DD
  updated_on TEXT NOT NULL
);
CREATE TABLE behavioral_progress (
  question_id TEXT PRIMARY KEY,        -- "bq-001"
  story_id TEXT,                       -- last story used, may point to a deleted story
  status TEXT NOT NULL DEFAULT 'new',  -- new | shaky | solid
  practised_on TEXT NOT NULL DEFAULT '',
  times INTEGER NOT NULL DEFAULT 0,
  due_on TEXT NOT NULL DEFAULT '',     -- next review date, '' when solid and not due
  notes TEXT NOT NULL DEFAULT ''
);
```

Also: add both to `schema.ts` (Drizzle), `BACKUP_TABLES`, a sync map, and the cloud copy in `hub/migrations.ts`
(`user_id`, `updated_at`, `synced_at` columns like the other tables there). Sync keys: `stories` is `key: "single"`,
`keyCols: ["id"]`; `behavioral_progress` is `key: "single"`, `keyCols: ["question_id"]`. Add a new
`SYNC_TABLE_MAP_V3` and `syncMigrationSqlV3()` modelled on V2, and register the V3 SQL as its own `MIGRATIONS` entry
(unless another plan of 0095-0111 already added V3: then append your two tables to the one that is unmerged, or add V4;
check `git log` and the file before starting). Add `DEFAULTS` entries in `sync-engine.ts` for NOT NULL text columns.
Stories are the user's private words: they are excluded from the public portfolio and profile (`lib/portfolio.ts` reads
none of it; keep it that way).

## Out of scope

- The behavioural *mock* with a timer and rubric (0098) and the AI interviewer that talks back (0099); this plan only
  has self-practice and a one-shot story check.
- Company-specific tailoring beyond tags (0108 links to this), resume and project stories (0109).
- Voice recording or speech-to-text.
- Real or "leaked" questions, company-specific question lists.

## Steps

### Step 0 (lead, before agents): foundation

- [ ] **0a. Types, migration, sync.** Create `packages/shared/src/behavioral/types.ts` and `index.ts` (export from
  `packages/shared/src/index.ts`), the migration, `schema.ts` tables, `BACKUP_TABLES`, sync map V3, `DEFAULTS`, hub
  migration. Create empty arrays in `questions-amazon.ts`, `questions-google.ts`, `questions-core.ts` and the full
  `principles.ts` (the 33 principles with `meaning` and `listenFor`: lead writes these, they are short).
  - Done when: `pnpm exec vitest run apps/web/lib/db.test.ts apps/web/lib/backup.test.ts apps/web/lib/sync-triggers.test.ts apps/web/lib/sync-engine.test.ts` passes (update the
    expected table lists in those tests) and `pnpm -r typecheck` passes.
- [ ] **0b. Data layer skeleton.** `apps/web/lib/behavioral.ts` (server-only) with signatures and `throw new Error("todo")`
  bodies for: `listStories`, `getStory`, `saveStory(input)`, `deleteStory(id)`, `getProgress()`, `recordPractice({questionId, storyId, rating, notes}, today)`.
  Server actions stubs in `apps/web/app/actions.ts`: `saveStoryAction`, `deleteStoryAction`, `recordBehavioralPracticeAction`.
- [ ] **0c. Coach AI mode.** New `packages/shared/src/coach-prompts.ts`: `export type CoachTask = "story-review"` (0109
  adds `"resume-review"`, `"project-review"`), `isCoachTask`, `buildCoachMessages({task, text, context, history})`
  returning `ChatMessage[]` (system text per task, our own wording, no emoji, "never invent facts about the person").
  In `apps/web/lib/ai/context.ts` add `coach?: { task: CoachTask; context?: string }` to `ChatRequest`, count it in the
  "exactly one mode" check in `parseChatRequest`, and handle it in `buildChat`. The text the user wants checked is the
  last user message. Cap `context` at 6000 characters.
  - Done when: `pnpm exec vitest run apps/web/lib/ai/context.test.ts packages/shared/src/ai-prompts.test.ts` passes with new cases
    (valid coach request, unknown task rejected, two modes together rejected, prompt contains the text and no secrets).
- [ ] **0d. Route skeleton.** `apps/web/app/mock/behavioral/page.tsx` (tabs shell: Stories, Questions, Coverage, Practise,
  each a placeholder component file owned by an agent below), and a card "Story bank" on the `/mock` hub page from 0096.
  If `/mock` does not exist yet, stop and tell the user: this plan starts after 0096 step 0.
  - Done when: `/mock/behavioral` renders the four tab labels with placeholders.

### Agents (after step 0, in parallel, disjoint files)

- [ ] **1. Agent A: Amazon questions.** Only `packages/shared/src/behavioral/questions-amazon.ts`. 40 questions, ids
  `bq-001` to `bq-040`, 2 to 3 per Amazon principle (see ids above), each with `followUps` (2), `strong`, `weak`, `level`.
  Mix everyday phrasing ("Tell me about a time you...") and situational ones; at least 12 `senior`.
  - Context budget (read only this): this plan, `behavioral/types.ts`, `behavioral/principles.ts`. Nothing else.
  - Done when: the file typechecks, ids are unique and in range, every Amazon principle has at least 2 questions, no text
    copied from any source (say so in *Implementation notes*), and `pnpm exec vitest run packages/shared/src/behavioral` passes.
- [ ] **2. Agent B: Google and core questions.** Only `questions-google.ts` (ids `bq-041` to `bq-061`, 3 per attribute)
  and `questions-core.ts` (ids `bq-062` to `bq-096`, 3 to 4 per competency), same fields, at least 18 `senior` between them.
  Also `packages/shared/content/` is not touched.
  - Context budget: this plan, `types.ts`, `principles.ts`.
  - Done when: as for agent A, with Google attributes and core competencies each having at least 3 questions.
- [ ] **3. Agent C: stories UI.** Files under `apps/web/app/mock/behavioral/`: `stories.tsx` (list + editor panel as in
  the mockup, wide layout, forms post to server actions and work without JS), `coverage.tsx` (principle matrix with
  per-set filter, gaps first), `story-form.tsx`; and the data functions `listStories`, `getStory`, `saveStory`,
  `deleteStory` in `apps/web/lib/behavioral.ts`, with `saveStoryAction`/`deleteStoryAction`. Limits: title 120, each STAR
  field 1500, metrics 300, at most 60 stories, principles must be known ids. "Check with AI" button on the editor calls
  `/api/ai/chat` with `coach: { task: "story-review" }`, streams into a note box, shows the existing "AI is off" message
  when `ai_enabled` is not set (copy the pattern of the lesson chat component, do not write a new client).
  - Context budget: this plan, `mockups/0095-story-bank.html`, `apps/web/app/mock/behavioral/page.tsx`, `lib/behavioral.ts`,
    one existing server-action form (e.g. in `apps/web/app/profile/settings/`), `apps/web/app/ui.tsx`, the lesson chat component.
  - Done when: create, edit, delete a story in the browser at 1280 and 390 px; the coverage tab shows a gap for a
    principle with no story; the AI button shows the off message with AI off.
- [ ] **4. Agent D: questions, practise, review.** Files `apps/web/app/mock/behavioral/questions.tsx`,
  `practise.tsx`, `practise-timer.tsx` (self-contained 2-minute timer; use `apps/web/app/timer-store.ts` only if it fits,
  else a local `useState` timer), `packages/shared/src/behavioral/coverage.ts` (+ test), and `getProgress`,
  `recordPractice` in `lib/behavioral.ts` with `recordBehavioralPracticeAction`. Rating: four yes/no checks
  (one real story, "I" not "we", a number in the result, a lesson) give solid at 4, shaky below 3, otherwise
  shaky with due in 3 days; solid sets `due_on` to 14 days. Review integration: in `apps/web/lib/review.ts` add kind
  `"behavioral"` (label "Behavioural answer") for shaky questions with `due_on <= today`, href `/mock/behavioral?tab=practise&q=<id>`;
  update `review-card.tsx` and the Review page only as far as needed to render the new kind.
  - Context budget: this plan, the mockup, `lib/review.ts`, `app/review/review-card.tsx`, `lib/behavioral.ts`, `behavioral/types.ts`.
  - Done when: practise 5 questions end to end, rating shaky makes the question appear in `/review` three days later (test with
    a faked `Date`), and the Questions tab filters by "not practised" and "no story linked".

### Step 5 (lead): finish

- [ ] **5.** `pnpm exec vitest run apps/web/lib/behavioral.test.ts packages/shared/src/behavioral apps/web/lib/review.test.ts`,
  browser check of all four tabs (1280 and 390 px, light and dark), then `pnpm check` once.
  - Done when: all pass; Implementation notes list agent notes and anything found but not changed.

### Tests (written by the agent that owns each file)

- `packages/shared/src/behavioral/behavioral.test.ts` (A and B add their cases): ids unique and sequential, every
  question references existing principle ids, 1 to 3 principles, every principle has at least 2 questions, text lengths,
  no duplicate question text (case-insensitive), `source` and `lastChecked` present for each set, no "TODO".
- `packages/shared/src/behavioral/coverage.test.ts` (D): gaps, `nextQuestions` ordering, rating rules.
- `apps/web/lib/behavioral.test.ts` (C and D, in-memory DB, fake `Date`): save/validate/delete story, limits, unknown
  principle rejected, `recordPractice` sets status and due date, deleting a story keeps progress rows.
- Extend `db.test.ts`, `backup.test.ts`, `sync-triggers.test.ts` and `sync-engine.test.ts` for the two tables (a story
  edit queues one upsert; a delete queues a delete).

## Acceptance criteria

- [ ] `/mock/behavioral` has Stories, Questions, Coverage and Practise tabs matching the mockup (wide on desktop, usable at 390 px, light and dark).
- [ ] The user can write, edit and delete stories with STAR fields, numbers and principle tags; the coverage view lists
      principles without a story first.
- [ ] About 96 questions exist (Amazon 16 principles, Google 7 attributes, 10 core competencies), each with follow-ups and strong/weak notes; the principle sets show a last-checked date.
- [ ] Practise mode records a rating; shaky answers appear in Review when due.
- [ ] "Check with AI" works through the existing AI settings and is off when AI is off; cloud providers still need consent.
- [ ] Stories and progress are in backups and sync; stories never appear on the public profile.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files named above (or explained in *Implementation notes*).

## Estimate

- Step 0: 0.25 agent-day (one lead session; the 33 principle texts are the longest part).
- Parallel agents: 0.75 agent-day wall time (A and B write about 96 questions, C and D build the UI; all four at once).
- Review and fixes: 0.25 day.
- **Total: about 1.25 calendar days** (about 1.5 if question quality needs a second pass).
- Main risk: question quality. Short, generic or near-duplicate questions make the bank useless; the test for
  duplicates and the strong/weak fields are the guard, and the reviewer should read 15 questions at random.

## Dependencies

- Needs 0096 step 0 (the `/mock` hub and the Interview nav entry). Can run in parallel with the rest of 0096.
- 0098 and 0099 build on `behavioral/` and on the coach mode; 0108 links the principle sets per company; 0109 adds coach tasks.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
