# 0109: Career kit: resume check, project deep-dives, applications tracker, offers and negotiation

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0109-career-kit.html

## Goal

Getting the interview and closing the offer are part of the job search, and today they live in notes and spreadsheets.
Add a **Career kit** under the Interview hub with four private tools:

1. **Resume**: paste the resume as text, get an instant rule-based check (weak verbs, missing numbers, length, long
   bullets, pronouns), a short guide, and an optional AI review.
2. **Projects**: a deep-dive template with 12 prompts per project (role, scale, why this design, alternatives, what went
   wrong, what you would change) and a drill of the follow-ups interviewers ask.
3. **Applications**: a small board (wishlist, applied, OA, interviewing, offer, closed) with the next step and date.
4. **Offers**: side-by-side compare with year-by-year totals from base, bonus, equity vesting and sign-on, plus a short
   negotiation guide.

All of it stays on this device unless the user turns on sync; none of it ever appears on the public profile.

## Context

Exists (confirmed on 2026-11-21):

- AI: `apps/web/lib/ai/context.ts`, `apps/web/app/api/ai/chat/route.ts`, `packages/shared/src/ai-prompts.ts`,
  `apps/web/lib/ai/guard.ts`. Plan 0095 step 0c adds the **coach mode** (`packages/shared/src/coach-prompts.ts`,
  `coach: { task, context }` in `ChatRequest`); this plan adds two more tasks to it and must not add a new mode.
- Sync and storage: `apps/web/lib/sync-triggers.ts` (`SYNC_TABLE_MAP_V1/V2`), `sync-engine.ts` (`DEFAULTS`),
  `hub/migrations.ts`, `BACKUP_TABLES` in `backup.ts`, `MIGRATIONS` in `db.ts`, `schema.ts`.
- Public profile: `apps/web/lib/portfolio.ts` and `public-profile.ts` read only progress numbers; keep the new tables out of them.
- The Interview hub `/mock` and nav entry come from 0096; the plan's `mock_app` category is in `packages/shared/src/plan.ts`.

Conventions (`AGENTS.md`): Next 16 `cacheComponents` (async component + `await connection()` inside `<Suspense>`),
server actions in `apps/web/app/actions.ts` call `refresh()`, dates are local `YYYY-MM-DD`, new tables in `BACKUP_TABLES`
and the sync map, tests next to the code, forms work without JS, wide layouts, plain writing.

### Privacy rules (apply to every step)

- A resume holds personal details. Before text goes to any AI provider, `redactContacts()` (pure, in
  `career/redact.ts`) removes email addresses, phone numbers, URLs and street-like lines, and the UI says so. Cloud
  providers still need the existing consent setting. Resume text is never logged.
- Offer and application data are exported by the normal backup and sync only. No analytics, no telemetry.
- Money maths is arithmetic on numbers the user typed. The offers page says it is not financial advice and that equity
  value depends on the offer letter. Vesting presets are editable and labelled "commonly reported; confirm in your offer letter".
- Guide text (resume guide, negotiation guide) is written in our own words from general practice. No copied articles,
  no company-specific salary data, no promises about outcomes. Each guide page has `lastChecked: "2026-11-21"`.

## Data model

Migration (append to `MIGRATIONS` in `db.ts`, next free index):

```sql
CREATE TABLE resume_versions (
  id TEXT PRIMARY KEY, label TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  created_on TEXT NOT NULL, updated_on TEXT NOT NULL
);
CREATE TABLE project_stories (
  id TEXT PRIMARY KEY, title TEXT NOT NULL,
  answers TEXT NOT NULL DEFAULT '{}',          -- JSON {promptId: text}
  created_on TEXT NOT NULL, updated_on TEXT NOT NULL
);
CREATE TABLE applications (
  id TEXT PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', level TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'wishlist',     -- wishlist|applied|oa|interviewing|offer|accepted|rejected|withdrawn
  source TEXT NOT NULL DEFAULT '',             -- referral|portal|recruiter|other
  applied_on TEXT NOT NULL DEFAULT '', next_step TEXT NOT NULL DEFAULT '', next_on TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  created_on TEXT NOT NULL, updated_on TEXT NOT NULL
);
CREATE TABLE offers (
  id TEXT PRIMARY KEY, application_id TEXT, company TEXT NOT NULL, level TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'INR',
  base INTEGER NOT NULL DEFAULT 0, bonus_pct REAL NOT NULL DEFAULT 0,
  equity_total INTEGER NOT NULL DEFAULT 0, vest_pct TEXT NOT NULL DEFAULT '[25,25,25,25]', -- JSON, per year, sums to 100
  sign_on INTEGER NOT NULL DEFAULT 0, other_yearly INTEGER NOT NULL DEFAULT 0,
  decide_by TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  created_on TEXT NOT NULL, updated_on TEXT NOT NULL
);
```

Also `schema.ts`, `BACKUP_TABLES` (4 tables), sync map entries (all `key: "single"`, `keyCols: ["id"]`, `cols` = every column)
in a V3 map shared with 0095/0096/0108 (check the file: if `SYNC_TABLE_MAP_V3` and `syncMigrationSqlV3` exist, append to the
unmerged one or create V4), `DEFAULTS` entries for NOT NULL text columns in `sync-engine.ts`, cloud copy in `hub/migrations.ts`.

Shared code, `packages/shared/src/career/`:

- `types.ts`: `ResumeFinding {severity: "fix"|"tip"; line?: number; text: string; why: string}`, `ProjectPrompt {id; label;
  hint; followUps: string[]}`, `OfferInput`, `OfferYear {year; base; bonus; equity; signOn; other; total}`,
  `APPLICATION_STATUSES` with labels and board column.
- `resume-lint.ts`: `lintResume(text): { findings: ResumeFinding[]; stats: {words; bullets; withNumbers; pageEstimate} }`.
  Rules: bullet starts with a weak opener ("responsible for", "worked on", "helped", "assisted", "involved in", "participated");
  bullet has no digit or percent; bullet over 220 characters; first-person pronouns; length (page estimate = words / 550; a tip above 1 page,
  a fix above 2 pages); the same opening verb on 3 or more bullets; no "experience" heading found. Tense is not checked. No external calls.
- `redact.ts`: `redactContacts(text)`.
- `resume-guide.ts`, `negotiation.ts`: guide pages as data: `{ id, title, intro, points: {title, body}[] }[]` (resume guide:
  6 pages; negotiation: 5 pages: before you answer, asking for time, what to ask for besides base, a call script, what to do with
  a competing offer).
- `project-prompts.ts`: 12 `ProjectPrompt`s, ids `role`, `problem`, `scale`, `architecture`, `why`, `alternatives`,
  `failure`, `metrics`, `team`, `conflict`, `next`, `learned`, each with 2 to 3 `followUps` written fresh.
- `comp.ts`: `offerYears(o: OfferInput, years = 4): OfferYear[]` (sign-on in year 1, equity by `vest_pct`, bonus = base x pct),
  `compareOffers(a[])` (year 1, year 3, average of the horizon, highest per column), `validateVest(pct)` (non-negative, sums to 100).

Coach tasks added to `coach-prompts.ts`: `"resume-review"` (context: the target role/level; output: 5 specific rewrites,
no invented facts) and `"project-review"` (context: project title; output: gaps in the story and 5 follow-up questions).

Routes under `apps/web/app/mock/career/`: `page.tsx` (hub with four cards and a "due next" strip from applications),
`resume/page.tsx`, `projects/page.tsx` (+ `[id]/page.tsx`), `applications/page.tsx`, `offers/page.tsx`. Server actions
(append to `actions.ts`): `saveResumeAction`, `deleteResumeAction`, `saveProjectAction`, `deleteProjectAction`,
`saveApplicationAction`, `moveApplicationAction`, `deleteApplicationAction`, `saveOfferAction`, `deleteOfferAction`.
Limits: resume body 20,000 characters and at most 10 versions; project answers 2000 per prompt and 30 projects; 300
applications; 20 offers; text fields trimmed and length-capped in `lib/career.ts`.

## Out of scope

- Resume file upload or PDF parsing, resume templates, LaTeX; the check works on pasted text only.
- Cover letters, LinkedIn, email sending, calendar sync, reminders outside the app, browser extension capture of jobs.
- Company salary data or market comparisons; tax maths; currency conversion.
- The AI interviewer (0099); company guides (0108).

## Steps

### Step 0 (lead, before agents): foundation

- [ ] **0a.** `career/types.ts`, `career/index.ts` (export from the shared index), migration, `schema.ts`, `BACKUP_TABLES`,
  sync map and `DEFAULTS`, hub migration, `apps/web/lib/career.ts` (server-only, function signatures with `throw new Error("todo")`
  for each of the four areas), action stubs.
  - Done when: `pnpm exec vitest run apps/web/lib/db.test.ts apps/web/lib/backup.test.ts apps/web/lib/sync-triggers.test.ts apps/web/lib/sync-engine.test.ts`
    passes with the updated table lists; `pnpm -r typecheck` passes.
- [ ] **0b. Coach tasks.** Needs 0095 step 0c. In `coach-prompts.ts` add `"resume-review"` and `"project-review"` with
  prompts and tests (extend `ai-prompts.test.ts` or add `coach-prompts.test.ts`).
  - Done when: `pnpm exec vitest run packages/shared/src/coach-prompts.test.ts apps/web/lib/ai/context.test.ts` passes.
- [ ] **0c. Routes skeleton.** `/mock/career` hub page with four cards linking to four placeholder pages; a "Career kit" card
  on the `/mock` hub (0096). If `/mock` or the coach mode is missing, stop and tell the user (needs 0096 step 0 and 0095 step 0c).
  - Done when: the five routes render titles.

### Agents (after step 0, in parallel, disjoint files)

- [ ] **1. Agent A: resume.** `career/resume-lint.ts`, `career/redact.ts`, `career/resume-guide.ts` (+ tests),
  `apps/web/app/mock/career/resume/` (`page.tsx`, `resume-editor.tsx`, `findings.tsx`), resume functions in `lib/career.ts`
  and the two resume actions. Page as in the mockup: versions select, textarea, "Run check" (client-side call of `lintResume`
  so no round trip), findings list with the stats card, "Review with AI" (coach `resume-review`; sends `redactContacts(text)`;
  shows "AI is off" when AI is off), and the guide as a collapsible list.
  - Context budget (read only this): this plan, the mockup, `career/types.ts`, `coach-prompts.ts`, the lesson chat component
    (to copy how the AI call streams), `apps/web/app/ui.tsx`.
  - Done when: pasting the mockup's sample resume produces the three findings shown, `redactContacts` removes an email, a phone
    number with spaces and a URL, and the AI call body never contains them (test on the request builder).
- [ ] **2. Agent B: projects.** `career/project-prompts.ts` (+ test), `apps/web/app/mock/career/projects/`
  (`page.tsx`, `[id]/page.tsx`, `project-form.tsx`, `drill.tsx`), project functions and actions. Form with the 12 prompts and a
  completeness counter ("9 of 12 answered"); "5-minute drill" shows the `followUps` of the prompts the user answered, one at a
  time with a timer and a "my answer was clear / vague" self-rating (stored in `localStorage` only, not in the DB); optional
  "Check with AI" via coach `project-review`.
  - Context budget: this plan, the mockup, `career/types.ts`, `coach-prompts.ts`, `apps/web/app/ui.tsx`.
  - Done when: create a project, answer 4 prompts, reload (kept), run the drill, delete the project.
- [ ] **3. Agent C: applications.** `apps/web/app/mock/career/applications/` (`page.tsx`, `board.tsx`, `application-form.tsx`),
  application functions and actions, `career/application-status.ts` (+ test). Board columns Wishlist, Applied, OA,
  Interviewing, Offer, Closed (accepted, rejected, withdrawn), cards show next step and date with a "due in N days" tag
  (`next_on` compared with `toLocalDate()` in `lib/`, never `Date.now()` in render); move with a select on the card (works
  without JS) and drag-and-drop is not required; filter Active / Closed; moving a card to Offer offers "Add this offer"
  (links to `/mock/career/offers?from=<id>`).
  - Context budget: this plan, the mockup, `career/types.ts`, `apps/web/lib/dates.ts` (shared `dates.ts`), `apps/web/app/ui.tsx`.
  - Done when: add 4 applications, move one to Offer, the due tag appears for a `next_on` within 3 days, filter works.
- [ ] **4. Agent D: offers.** `career/comp.ts`, `career/negotiation.ts` (+ tests), `apps/web/app/mock/career/offers/`
  (`page.tsx`, `offer-form.tsx`, `compare-table.tsx`, `negotiation-guide.tsx`), offer functions and actions. Compare table as in
  the mockup (rows base, bonus, equity, sign-on, year 1, year 3, average, best value highlighted); vest presets 25/25/25/25,
  5/15/40/40, 10/20/30/40, 33/33/22/12 (editable, labelled); `?from=<applicationId>` prefills company and level; the not-advice
  line; guide pages from `negotiation.ts`.
  - Context budget: this plan, the mockup, `career/types.ts`, `apps/web/app/ui.tsx`.
  - Done when: the mockup's two sample offers give exactly its totals (Tailspin year 1 56,80,000, year 3 51,80,000, average
    53,05,000; Contoso year 1 45,10,000, year 3 57,10,000, average 54,10,000), `validateVest` rejects 90 and 110 totals.

### Step 5 (lead): finish

- [ ] **5.** `pnpm exec vitest run packages/shared/src/career apps/web/lib/career.test.ts`, browser check of the hub and four
  pages (1280 and 390 px, light and dark), check that nothing from these tables reaches `/u/<name>` (public profile), `pnpm check` once.

### Tests

- `career/resume-lint.test.ts`: each rule has a positive and a negative case; the sample resume's findings; empty text.
- `career/redact.test.ts`: email, phone (several formats), URL, address-like line; ordinary text unchanged.
- `career/comp.test.ts`: the six totals above, one-year horizon, sign-on only in year 1, vest validation, zero bonus.
- `career/project-prompts.test.ts`: 12 unique ids, 2 to 3 follow-ups each.
- `apps/web/lib/career.test.ts` (in-memory DB, fake `Date`): CRUD and limits for each of the four tables, status validation,
  unknown status rejected, an offer survives deletion of its application.
- Extend db, backup, sync tests for the four tables; extend `portfolio` test to assert none of the four tables is read.

## Acceptance criteria

- [ ] Career kit hub and four pages work as in the mockup at 1280 and 390 px, light and dark, without JS for forms.
- [ ] The resume check runs locally and instantly; the AI review sends redacted text only and is off when AI is off.
- [ ] Projects keep answers per prompt and offer a follow-up drill; applications show a board with next-step dates;
      offers compare year by year with the totals above.
- [ ] Nothing here appears on the public profile; all four tables are in backups and sync.
- [ ] Guide text is original, dated 2026-11-21, with the not-advice note on offers.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files named above (or explained in *Implementation notes*).

## Estimate

- Step 0: 0.4 agent-day (four tables plus sync plumbing and the coach tasks).
- Parallel agents: 1 agent-day wall time (four UI areas of 0.5 to 1 day each, run in parallel; D and A are the largest).
- Review and fixes: 0.4 day.
- **Total: about 1.75 calendar days.**
- Main risk: sync plumbing for four new tables colliding with 0095/0108 migrations. Land the V3 sync map once (whoever
  merges first) and have the others append; check `git log` before step 0.

## Dependencies

- Needs 0096 step 0 (hub, nav) and 0095 step 0c (coach AI mode). 0108 links to this; 0110 may read the application board.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
