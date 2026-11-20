# 0108: Company process and levels guide (Google, Amazon, Meta, Microsoft, Uber)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Mockup:** docs/mockups/interview-prep/0108-company-guide.html

## Goal

Knowing how a company runs its hiring loop, what each round tests and which level you are applying for removes a lot of
stress and wasted preparation. Add a **Company guide** to the Interview hub: one page per company (Google, Amazon, Meta,
Microsoft, Uber) with the loop stage by stage, what each round tests at the SDE2 / L4-L5 level, where to practise it in
this app, common mistakes and a prep checklist you can tick off; plus a **levels comparison** (SDE1/SDE2/Senior across
the five), a small glossary (hiring committee, bar raiser, team match, loop, OA) and a "last checked" date on every page.

## Context

Exists (confirmed on 2026-11-21): the `/mock` Interview hub and nav entry come from plan 0096 (not built yet);
`packages/shared/src/plan.ts` has category `mock_app`; Learn courses in `apps/web/lib/courses.ts`; settings table and
synced settings (`apps/web/lib/synced-prefs.ts`, `isSyncableSettingKey` in `sync-triggers.ts`); sync maps
`SYNC_TABLE_MAP_V1/V2` and `syncMigrationSqlV2` in `apps/web/lib/sync-triggers.ts`; `BACKUP_TABLES` in
`apps/web/lib/backup.ts`; migrations in `apps/web/lib/db.ts`; cloud copy in `apps/web/lib/hub/migrations.ts`.
Static data with a typed shape in `packages/shared/src/` is the pattern used by `reading.ts` and `focus.ts`.

Conventions from `AGENTS.md`: Next 16 `cacheComponents` (async component with `await connection()` inside `<Suspense>`),
server actions in `actions.ts` call `refresh()`, new table goes in `BACKUP_TABLES` and the sync map, tests next to code,
plain writing.

### Content rules (important)

- Our own words. Do not copy from company careers pages, candidate guides, Glassdoor, Blind, LeetCode Discuss, YouTube or
  books. Write general, publicly known facts only: round names, rough durations, what a round assesses. **No internal
  or leaked material, no "real questions", no claims about a specific team's process, no salary numbers.**
- Hiring processes change often (Amazon, Google and Meta all changed rounds in recent years). Every company page has
  `lastChecked: "2026-11-21"`, a `confidence` note ("general public knowledge; confirm details with your recruiter"), and
  fields marked `mayChange: true` render with a small "may change" label. Level tables say "approximate".
- Level mapping facts to include as a starting point and the agents must keep them hedged ("commonly"): Amazon SDE I
  (L4), SDE II (L5), Senior SDE (L6); Google L3, L4 (SWE III), L5 (Senior); Meta E3, E4, E5; Microsoft levels 59-60,
  61-62 (SDE II), 63-64 (Senior); Uber L3, L4, L5a (names vary). The user's target is "SDE2 / SWE3": Amazon L5, Google L4,
  Meta E4, Microsoft 61-62, Uber L4. If an agent cannot support a claim from general knowledge, leave it out.

## Data model

`packages/shared/src/companies/`:

```ts
export type RoundKind = "recruiter" | "oa" | "phone" | "coding" | "design" | "lld" | "behavioral" | "hiring-review" | "team-match";
export interface CompanyRound {
  kind: RoundKind; name: string; typical: string;        // "45 to 60 min", "4 to 5 interviews"
  what: string;                                          // what happens, 1 to 2 sentences
  tests: string[];                                       // what they assess at the SDE2 level
  prepare: { label: string; href: string }[];            // links into this app (/dsa, /study/sd, /mock/..., /mock/behavioral)
  mayChange: boolean;
}
export interface CompanyGuide {
  id: "google" | "amazon" | "meta" | "microsoft" | "uber";
  name: string; summary: string;                         // 2 to 3 sentences
  rounds: CompanyRound[];                                // in order
  levelNote: string;                                     // which level this guide assumes
  principlesSet?: "amazon" | "google";                   // links to 0095 principle sets when they exist
  commonMistakes: string[];                              // 4 to 6
  tips: string[];                                        // 4 to 6
  checklist: { id: string; label: string; href?: string }[]; // 8 to 10 prep items, ids stable ("amazon-stories")
  lastChecked: string; confidence: string;
}
export interface LevelRow { experience: string; google: string; amazon: string; meta: string; microsoft: string; uber: string; target?: boolean }
export interface GlossaryTerm { term: string; meaning: string }
```

Files: `types.ts`, `google.ts`, `amazon.ts`, `meta.ts`, `microsoft.ts`, `uber.ts` (each exports one `CompanyGuide`),
`levels.ts` (`LEVELS: LevelRow[]`, `LEVELS_NOTE`, `LEVELS_LAST_CHECKED`), `glossary.ts`, `index.ts` (`COMPANIES`,
`getCompany(id)`).

Migration (append to `MIGRATIONS` in `db.ts`, next free index):

```sql
CREATE TABLE company_checklist (
  company_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  done_on TEXT NOT NULL,        -- local YYYY-MM-DD
  PRIMARY KEY (company_id, item_id)
);
```

Plus `schema.ts`, `BACKUP_TABLES`, sync map entry `{ local: "company_checklist", cloud: "company_checklist", key: "composite",
keyCols: ["company_id","item_id"], cols: ["company_id","item_id","done_on"] }` in a **V3** map (shared with 0095 and 0096:
check whether `SYNC_TABLE_MAP_V3`/`syncMigrationSqlV3` already exists in the file; if yes, append to the unmerged one or
make V4), `DEFAULTS` entry `{ done_on: "" }`, cloud copy in `hub/migrations.ts`.
One setting key `interview_target_level` (`"entry" | "mid" | "senior"`, default `"mid"`) in `settings`, only used to highlight the row.

Routes: `/mock/companies` (cards, levels table, glossary), `/mock/companies/[id]` (guide page), both read-only plus the
checklist toggle server action `toggleCompanyChecklistAction(companyId, itemId, done)`.

## Out of scope

- Company-wise problem and frequency lists (0103), the Amazon OA simulation (0102), question banks (0095).
- Salary figures, compensation bands, anything about specific teams, referral advice (0109 covers offers).
- Live scraping or fetching company sites. All content is written by hand and dated.
- Companies beyond the five (a later plan can add more by adding one file).

## Steps

### Step 0 (lead, before agents): foundation

- [ ] **0.** Create `companies/types.ts`, empty-but-typed stubs for the five guides (id, name, `lastChecked`, empty arrays),
  `levels.ts` with the table skeleton (rows and column names, cells `""`), `glossary.ts` with the term list (term only),
  `index.ts`; migration, `schema.ts`, `BACKUP_TABLES`, sync map, `DEFAULTS`, hub migration; `apps/web/lib/companies.ts`
  (server-only: `getChecklistDone(companyId)`, `setChecklistItem(companyId, itemId, done, today)`, `getTargetLevel()`,
  `setTargetLevel()`); the action stub; route skeleton `apps/web/app/mock/companies/page.tsx` and
  `[id]/page.tsx` rendering the company name; a "Company guide" card on the `/mock` hub (0096). If `/mock` is missing,
  stop and tell the user: this plan starts after 0096 step 0.
  - Done when: `pnpm -r typecheck` passes; the update to `db`, `backup`, `sync-triggers`, `sync-engine` tests passes (run those four files only);
    `/mock/companies/amazon` renders a title.

### Agents (after step 0, in parallel, disjoint files)

- [ ] **1. Agent A: Google and Amazon.** Only `companies/google.ts` and `companies/amazon.ts`: 5 to 7 rounds each (Amazon:
  recruiter, online assessment, phone, final loop with coding / design / LLD / principle rounds, debrief; Google: recruiter,
  phone screens, onsite-style loop of coding, design (for L4 and above, as publicly described), behavioural/"Googleyness"
  round, hiring review, team match), `tests`, `prepare` links to real app routes, 5 mistakes, 5 tips, 9 checklist items.
  - Context budget (read only this): this plan, `companies/types.ts`, `docs/mockups/interview-prep/0108-company-guide.html`,
    `packages/shared/src/study.ts` section titles only (to link real routes).
  - Done when: both files typecheck, every `prepare.href` is a route that exists or one that 0095, 0096, 0097, 0098, 0102
    will add (listed in a comment), no sentence copied from any source, every round has `mayChange` set.
- [ ] **2. Agent B: Meta and Microsoft.** Only `companies/meta.ts` and `companies/microsoft.ts`, same rules.
  - Context budget: as agent A.
  - Done when: as agent A.
- [ ] **3. Agent C: Uber, levels, glossary.** Only `companies/uber.ts`, `companies/levels.ts`, `companies/glossary.ts`.
  Levels table with 3 rows (new grad to 2 years, 3 to 6 years marked `target`, 6 to 10 years), cells hedged, a note that
  titles differ by team and year; glossary of at least 12 terms (loop, OA, bar raiser, hiring committee, team match, onsite,
  virtual onsite, leveling, down-level, scope, calibration, hiring manager screen), each 1 to 2 sentences in our words.
  - Context budget: as agent A, plus this plan's "Content rules".
  - Done when: files typecheck; every company column of `LEVELS` is filled; glossary has 12 or more terms.
- [ ] **4. Agent D: pages.** Only `apps/web/app/mock/companies/` (`page.tsx`, `[id]/page.tsx`, `levels-table.tsx`,
  `checklist.tsx`, `round-list.tsx`) and `lib/companies.ts` bodies and the action. Layout as in the mockup: company tabs
  as links, rounds as a numbered list with "Prepare with" links, right column with the level card, the checklist with a
  progress bar, and a "Source and date" card; a "may change" tag on `mayChange` rounds; the levels table highlights the
  row for the user's target level; wide layout, works without JS (checklist posts to the server action).
  - Context budget: this plan, the mockup, `companies/types.ts`, one existing server-action form, `apps/web/app/ui.tsx`.
  - Done when: ticking an item survives reload, the page works at 1280 and 390 px in light and dark, and
    `/mock/companies/unknown` returns the not-found page.

### Step 5 (lead): finish

- [ ] **5.** Read every guide once for accuracy and copy risk (spot-check three claims per company against general knowledge;
  delete what cannot be supported), `pnpm exec vitest run packages/shared/src/companies apps/web/lib/companies.test.ts`, browser
  check, `pnpm check` once.

### Tests

- `packages/shared/src/companies/companies.test.ts`: five companies exist; each has 5 or more rounds, a `lastChecked` date
  in `YYYY-MM-DD`, 4 to 6 mistakes and tips, 8 to 10 checklist items with unique ids prefixed by the company id; `prepare`
  hrefs start with `/`; levels table has no empty cell and exactly one `target` row; glossary has 12 or more unique terms;
  no string contains "TODO", "salary", "$" or a URL (keeps out pay figures and copied links).
- `apps/web/lib/companies.test.ts` (in-memory DB): tick and untick, unknown company or item rejected, target level default
  and validation.
- Extend the db, backup and sync tests for `company_checklist`.

## Acceptance criteria

- [ ] `/mock/companies` lists five companies, the levels comparison and the glossary; `/mock/companies/<id>` shows the loop, what each round tests, where to practise, mistakes, tips and the checklist.
- [ ] Every page shows "last checked 2026-11-21" and a "confirm with your recruiter" note; uncertain facts carry a "may change" tag.
- [ ] The checklist persists, is in backups and syncs.
- [ ] No salary numbers, no real or leaked questions, nothing copied (the reviewer checks three passages per company).
- [ ] `pnpm check` passes.
- [ ] No changes outside the files named above (or explained in *Implementation notes*).

## Estimate

- Step 0: 0.25 agent-day.
- Parallel agents: 0.5 agent-day wall time (three content agents, one UI agent).
- Review and fixes: 0.25 day (accuracy pass is the long part).
- **Total: about 1 calendar day.**
- Main risk: stale or wrong facts. The `lastChecked` field, hedged wording and the reviewer's spot-check are the guard;
  schedule a yearly re-check.

## Dependencies

- Needs 0096 step 0 (hub, nav). Links forward to 0095 (stories), 0097/0098 (mocks), 0102 (OA), 0103 (company lists); links
  to routes that do not exist yet must be hidden or shown as "coming soon" by the page (agent D: filter hrefs against a
  small allow-list in `lib/companies.ts` that the lead updates as plans land).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
