# 0094: Roadmap: everything a candidate needs to prepare for SWE3 / SDE2 interviews in one app

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (one plan at a time, see the order below)
- **Mockups:** `docs/mockups/interview-prep/` (one per plan with UI, linked from each plan)

## Goal

Make Zen Dojo the place where a candidate prepares for Google L4/L5, Amazon SDE2 and equivalent loops without needing
other sites for most of it. Today the app is strong on knowledge (DSA, system design, LLD, core CS, review). This roadmap
adds what candidates still leave for: behavioural prep, interviews under real conditions (mocks, AI interviewer, a friend),
interview follow-ups, company specifics, and career logistics. 17 plans, each split for parallel agents.

## The plans

| # | Plan | What the candidate gets | Mockup | Estimate | Needs |
|---|---|---|---|---|---|
| 0095 | [Story bank and behavioural questions](0095-story-bank-and-behavioural-questions.md) | STAR stories mapped to Amazon LPs / Google themes, ~96 questions, coverage grid, practice into Review | [0095](../mockups/interview-prep/0095-story-bank.html) | 1.25 d | - |
| 0096 | [Mock framework + coding mock](0096-mock-interview-framework-coding-mock.md) | `/mock` hub, "Interview" nav item, timed coding mock without hints, rubric scoring, history | [0096](../mockups/interview-prep/0096-mock-framework-coding-mock.html) | 3 d | - |
| 0097 | [System design mock](0097-system-design-mock.md) | 27 design prompts, seven-phase timer, built-in whiteboard, held-back facts and a twist | [0097](../mockups/interview-prep/0097-system-design-mock.html) | 2.5 d | 0096 |
| 0098 | [LLD and behavioural mock](0098-lld-and-behavioural-mock.md) | 90-minute machine-coding round with a change request; spoken behavioural round | [0098](../mockups/interview-prep/0098-lld-and-behavioural-mock.html) | 2.5 d | 0096, 0095 |
| 0099 | [AI interviewer](0099-ai-interviewer.md) | AI plays the interviewer in any mock, asks follow-ups, proposes rubric scores with quotes | [0099](../mockups/interview-prep/0099-ai-interviewer.html) | 1.5 d | 0096 |
| 0100 | [Mock with a friend kit](0100-mock-with-a-friend-kit.md) | Offline interviewer guide + score sheet; friend's scores come back as a paste-in code | [0100](../mockups/interview-prep/0100-mock-with-a-friend-kit.html) | 1.5-2 d | 0096 (+0097, 0098, 0095 per kind) |
| 0101 | [Follow-up variants](0101-followup-variants.md) | 2-4 "what if" variants per problem with approach, cost and pitfall; Review items | [0101](../mockups/interview-prep/0101-followup-variants.html) | 3 d | 0092 |
| 0102 | [Amazon OA simulation](0102-amazon-oa-simulation.md) | Two problems + debugging + work-style set under one clock; no solve or XP leaks | [0102](../mockups/interview-prep/0102-amazon-oa.html) | 2 d | 0096 |
| 0103 | [Company and frequency lists](0103-company-and-frequency-lists.md) | Company-style sets from the 486 problems, frequency tiers, a final-weeks plan builder | [0103](../mockups/interview-prep/0103-company-lists.html) | 1.5-2 d | - |
| 0104 | [Drills: concurrency, debugging, output, SQL](0104-drills-concurrency-debug-sql.md) | 12 concurrency, 30 find-the-bug, 24 predict-output, 40 SQL drills | [0104](../mockups/interview-prep/0104-drills.html) | 3.5 d | - |
| 0105 | [Language cheat sheets](0105-language-cheat-sheets.md) | C++/Java/Python idioms side by side, complexity and pitfalls, compiled by a test | [0105](../mockups/interview-prep/0105-language-cheat-sheets.html) | 2 d | - |
| 0106 | [Estimation drills](0106-estimation-drills.md) | 60 capacity drills + quick-fire, scored by order of magnitude, bias tracking | [0106](../mockups/interview-prep/0106-estimation-drills.html) | 2 d | - |
| 0107 | [Papers and case studies](0107-papers-and-case-studies.md) | 24 paper lessons and 16 case studies inside System design, `/study/papers` index | [0107](../mockups/interview-prep/0107-papers-and-case-studies.html) | 2.5 d | - |
| 0108 | [Company process and levels guide](0108-company-process-and-levels-guide.md) | How Google, Amazon, Meta, Microsoft, Uber loops work; levels; prep checklist | [0108](../mockups/interview-prep/0108-company-guide.html) | 1 d | 0096 (hub link) |
| 0109 | [Career kit](0109-career-kit-resume-projects-applications-offers.md) | Resume check + AI review, project deep-dive template, applications board, offer compare | [0109](../mockups/interview-prep/0109-career-kit.html) | 1.75 d | 0096 (hub), 0095 (coach mode) |
| 0110 | [Readiness score and weekly plan](0110-readiness-score-and-weekly-plan.md) | Score per area, trend, "this week" plan within your hours | [0110](../mockups/interview-prep/0110-readiness.html) | 1.5 d | 0095, 0096 (best last) |
| 0111 | [Optional tracks: ML, frontend, mobile](0111-optional-tracks-ml-frontend-mobile.md) | Three downloadable courses, library categories and a "which tracks do I need" helper | [0111](../mockups/interview-prep/0111-optional-tracks.html) | 2 d | - |

Sum: about 35 agent-led days of work if done one after another.

## Decisions every plan must follow (settles conflicts found while planning)

1. **Sync table maps.** Several plans add synced tables. Each plan creates the **next free** `SYNC_TABLE_MAP_Vn` +
   `syncMigrationSqlVn` at the time it is implemented (never edits a shipped one), with the matching hub migration and
   worker migration numbers taken at that time. Expected order if the waves below are followed: V3 0096 (`mock_sessions`),
   V4 0095 (`stories`, `behavioral_progress`), V5 0108, V6 0109, V7 0101, V8 0104, V9 0106. Two plans in flight at once:
   the one that merges second renumbers.
2. **AI.** 0095 adds the one shared "coach" chat mode (`coach: { task, context }`); 0109 adds tasks to it. 0099 uses its
   own routes (`/api/ai/interviewer`, `/score`) and does not add a chat mode.
3. **Mock data.** Only 0096 defines `mock_sessions`, `RUBRICS`, `PHASES`, `PhaseTimer` and the score shapes; 0097-0100
   and 0102 register their kind in those registries.
4. **Navigation.** One new rail item, **Interview** (`/mock`), added by 0096 between Review and Roadmap; on phones it is
   reached from the You tab. Other plans add cards to the `/mock` hub, not rail items.
5. **Review queue.** `apps/web/lib/review.ts` gets new item kinds from 0095 (`behavioral`) and 0101 (`followup`); land
   them in different waves or merge carefully.
6. **Content rules.** Own words, no copied problem or editorial text, company facts general and public with a
   `lastChecked` date, no salary numbers presented as facts.
7. **Files with other edits in flight** (`dsa/page.tsx`, `filter-group.tsx`, `globals.css`, root `package.json`,
   `study/page.tsx`): append only, and commit open work before a plan starts.

## Order (waves), two tools in parallel

Claude and Antigravity each run one plan at a time, with that plan's own four agents.

| Wave | Claude | Antigravity | Calendar days |
|---|---|---|---|
| 0 | review 0092 | finish 0092 (brute force + optimal code, hints) | ~2 |
| 1 | 0096 mock framework (foundation) | 0095 story bank | ~3 |
| 2 | 0097 system design mock | 0103 company lists, then 0108 company guide | ~2.5 |
| 3 | 0098 LLD + behavioural mock | 0101 follow-up variants | ~3 |
| 4 | 0099 AI interviewer, then 0102 OA | 0104 drills | ~3.5 |
| 5 | 0100 friend kit, then 0109 career kit | 0105 cheat sheets, then 0106 estimation | ~4 |
| 6 | 0110 readiness (last, needs the rest) | 0107 papers and case studies, then 0111 tracks | ~4.5 |

**Total: about 22 calendar days (4 to 5 weeks)** at the current pace (plans 0074-0093: about 20 plans in 8 days).
After wave 1 (about 5 days from now) the app already has mocks, the story bank and the Interview hub; after wave 3
(about 11 days) every interview round can be practised; waves 4-6 add the drills, guides and the readiness score.

Ways to go faster: run content-only plans (0103, 0105, 0106, 0107, 0111) as a third stream, since they touch few shared
files; or cut scope (0111 and 0107 are the most optional).

## Release points

- After wave 1: 0.10.0 (Interview hub, coding mock, story bank).
- After wave 3: 0.11.0 (all mock kinds, follow-ups).
- After wave 6: 1.0.0 candidate (complete prep loop). Each release gets `docs/releases/vX.Y.Z.md` before the tag.

## Out of scope

Live human matching between strangers, video calls, paid content, scraping company question lists.

## Review

(Each plan has its own review; this roadmap is done when all 17 are `done`.)
