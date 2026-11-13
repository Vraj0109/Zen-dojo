# 0074: Mobile practice flow fixes (filter dropdowns, end of lesson, section opens scrolled to the end)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-13
- **Implemented by:** (implementer fills in)
- **Spec:** none (follow-up to plans 0053 and 0059)

## Goal

Three phone problems on the hosted site (below the `md` breakpoint: bottom tab bar, compact top bar, reader mode):

1. The Filters dropdowns on `/dsa` are cut off by the screen edge when opened near the right side.
2. The end of a DSA pattern lesson has no way to open that pattern's Practice list.
3. Opening a group such as "Searching and sorting" on `/dsa` is slow, and the page lands scrolled to the end of the group
   instead of at its first question.

## Context

What exists today (all paths verified):

- **Filters.** `apps/web/app/dsa/filter-group.tsx` exports `FilterGroup`, a client `<details>` with `className="group relative"`.
  Its panel is `absolute left-0 top-full z-30 mt-1 min-w-[13rem] max-w-xs`, so it always opens to the right of the
  trigger and overflows the viewport when the trigger sits at the right. `FilterBar` in `apps/web/app/dsa/page.tsx` renders five
  of them (Source, Status, Difficulty, Topic, Notes) inside `<form action="/dsa" method="get" className="flex flex-wrap ...">`,
  so which one ends up at the right edge changes with the text width. The checkboxes post as a GET form; the "Filter" button
  applies them. `FilterGroup` already closes on `pointerdown` outside.
- **Pattern page.** `apps/web/app/dsa/pattern/[id]/page.tsx`: `PatternPage` > `PatternView` renders `Tabs` (Learn, Practice,
  Reference; `?tab=practice`), then `ArticleView` (Learn) / `Reference` / `Practice`, then a bottom `<nav aria-label="Other patterns">`
  with previous and next pattern (`ALL_PATTERNS[idx - 1]` / `[idx + 1]`, which crosses group boundaries; it keeps `?tab=practice`
  only when on the Practice tab). **The Learn tab ends with that prev/next nav and nothing that opens Practice.** The only way to
  Practice is the `Tabs` row at the top, which is far away after a long article on a phone.
  `ALL_PATTERNS` and `DSA_GROUPS` come from `packages/shared/src/dsa.ts`; `PATTERN_ARTICLES` from `packages/shared/src/learn/index.ts`.
  A pattern without an article opens on Practice by default (`defaultTab`). The Learn hub's DSA course (`lib/courses.ts`
  `dsaCourse`) links to `/dsa/pattern/[id]`, so there is one lesson page type for DSA. The study areas under `/study/[area]` are
  System design, LLD and Core CS only (`STUDY_AREAS` in `packages/shared/src/study.ts`), not DSA.
- **`/dsa` groups.** `Dsa()` in `apps/web/app/dsa/page.tsx` renders every group as an accordion header `Link`
  `href="/dsa?group=<id>#g-<id>"` with **`scroll={false}`** and `prefetch={false}`. Only the open group's patterns are rendered
  (`openGroup`, default `groups[0]`, i.e. "Arrays, strings, hashing"). Opening another group is a full server navigation: the
  first group collapses and the tapped one expands.
- **Scroll CSS.** `apps/web/app/globals.css` line 189: `html { scroll-behavior: smooth; scroll-padding-top: 1.25rem; }`.
  Anchors use `scroll-mt-32 lg:scroll-mt-4` (`g-<id>` and `p-<id>` blocks in `page.tsx`). `Tabs` (`apps/web/app/tabs.tsx`)
  also uses `scroll={false}` on every link.
- **Shell.** `apps/web/app/shell.tsx` pads the page by `BAR_PAD = max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]` for
  the fixed `BottomNav` (`components/bottom-nav.tsx`, `z-40`, `h-14` items). `components/section-scrubber.tsx` (`z-30`) runs only on
  `/study`, `/dsa/pattern` and `/help`, not on `/dsa`. No `loading.tsx` or `template.tsx` exists under `apps/web/app`; the loading
  UI is the in-page `<Suspense fallback={<DsaRoadmapSkeleton />}>`.
- **What `/dsa` loads.** `Dsa()` calls `await connection()` then `Promise.all([getDsaView(), getLeetCodeStatus(), getExtensionStatus(), getSimpleMode()])`.
  `getDsaView()` in `apps/web/lib/dsa.ts` runs `solveIndex` (1 query), `getExtraSolves` (1), `getNotedIds`, `leetcodeIndex` (2),
  `openStruggles`, `getPatternNotes`, `listAddedProblems`, then `tickIndex` (3 more, sequential after the first batch), which is
  at least 10 queries in two waves, then builds a `ProblemView` for all 486 problems (`allIds.map(view)` for `due`, `allIds.flatMap` for `topics`)
  and for all 67 patterns. The pattern page's `Practice` calls the same `getDsaView()` for one pattern. Facts read from code only; no timings
  were measured while planning (see step 5 for how to get them).

### Most likely cause of problem 3 (reasoned from the code, confirm in step 4)

**Scroll position is kept across the accordion navigation, and the content above the tapped header shrinks.**
The group header link has `scroll={false}`, so Next.js neither scrolls to the `#g-<id>` hash nor to the top. At the moment
of the tap the learner is looking at the open first group (many patterns, each with a problem list and cheat sheet: several thousand px
on a phone), with the header of the next group near the screen. The server round trip then removes the first group's body and
adds the new group's body. `window.scrollY` is unchanged, but the new group's header is now thousands of px higher in the
document, so the viewport shows the middle or end of the new group (and the smooth `scroll-behavior` plus browser scroll anchoring can
make that look like an animated drop to the end). The learner must scroll up to the first question. The hash in the href is ignored
because of `scroll={false}`. The slow load makes it worse: the tap shows nothing for the whole round trip, then the page jumps.

Less likely, check only if step 4 disproves the above: (a) `Tabs` with `scroll={false}` on the pattern page (opening Practice from a
scrolled Learn tab keeps the old `scrollY`, so a short Practice page opens scrolled near its end; this matters for step 3's link);
(b) the `StudyArticleSkeleton` / list swap shifting layout; (c) bottom-bar padding (not a cause: it only adds space at the end).
`scrollIntoView` is not used on `/dsa`; the filter state is in the URL, not restored by script.

## Out of scope

- Moving the problem editor to phones, changing reader mode, or any desktop layout change (desktop dropdowns stay as they are).
- Rewriting `getDsaView` or the data layer, adding client-side caching, or rendering all groups at once. Step 5 is limited to measuring,
  one low-risk split and a pending indicator.
- Lesson content, the pattern order, the Learn hub, or study areas under `/study`.
- Changing `scroll={false}` on `Tabs` globally (it is right on desktop where the tabs stay in view); only the new links in this plan scroll.
- `data/habit.db`, schema, migrations, the extension, the desktop app.

## Pitfalls

- Next 16 with `cacheComponents`: request-time reads (`searchParams`, cookies, DB) stay inside an async component that calls
  `await connection()` under `<Suspense>`. Do not read `searchParams` in a new component outside Suspense. A new `LessonEnd` must use only
  static data (`ALL_PATTERNS`, `DSA_GROUPS`, `PATTERN_ARTICLES`), no DB call. No `Math.random()` / `Date.now()` in render. Check
  `apps/web/node_modules/next/dist/docs/` before using `useLinkStatus` or any unfamiliar API.
- No JS viewport detection when CSS can do it. Use `max-md:` / `md:` classes. Do not add `window.innerWidth`, `matchMedia` or
  `getBoundingClientRect` measuring to position the dropdown.
- Server actions and forms must keep working without JS (`FilterGroup` is inside a GET form). The sheet's "Show results" button is a plain
  submit button, so it works without JS; only the backdrop and Done close handlers need JS (the summary still toggles `<details>` without JS).
- `BottomNav` is `fixed z-40`; the sheet must be above it (`z-50`) and add `pb-[env(safe-area-inset-bottom)]`.
- Tap targets on phones at least 44 px high in the sheet (`max-md:min-h-11`).
- No emoji anywhere (the test `apps/web/app/no-emoji.test.ts` checks). Use the existing text arrows (`→`, `←`) only where the file already does.
- Do not touch `data/habit.db`. Test in the browser against a copy (see Acceptance criteria).
- Do not run full `pnpm test`; use targeted `pnpm exec vitest run <file>` and `pnpm -r typecheck`; `pnpm check` once at the very end.

## Steps

Do them in order. Steps 1, 2-3 and 4-6 are independent enough to split (see Suggested split).

### Problem 1: Filters dropdown on phones

- [ ] **1. Bottom sheet on phones in `apps/web/app/dsa/filter-group.tsx`.** Recommended over edge-aware positioning because five dropdowns
  wrap to different places depending on label widths, so a "flip to right-0" rule would have to be chosen per instance with JS
  measuring (against the CSS-first rule), still leaves a 13 rem panel that is hard to hit on a 375 px screen, and a thumb reaches the bottom of the
  screen, not the top. Keep the desktop panel exactly as it is (`md:` classes). Below `md`:
  - Panel (`<div className="absolute left-0 top-full ...">`): add `max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto
    max-md:z-50 max-md:mt-0 max-md:max-w-none max-md:rounded-b-none max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom))]`
    (and keep `md:absolute` behaviour by prefixing the existing `absolute left-0 top-full z-30 mt-1 min-w-[13rem] max-w-xs` utilities with
    `md:`, leaving `absolute` out below `md`).
  - Option list: `max-h-60` becomes `max-md:max-h-[55dvh]`; rows get `max-md:min-h-11` and the checkbox `max-md:size-5`.
  - Backdrop: inside the `<details>`, before the panel, `<div className="hidden group-open:block md:!hidden fixed inset-0 z-40 bg-black/40" onClick={close} aria-hidden="true" />`
    where `close` sets `detailsRef.current.open = false`. (The existing outside-`pointerdown` effect does not fire for it because it is inside
    the `<details>`; that is why it needs its own handler.) Use `max-md:group-open:block` plus `hidden` rather than `!important` if that
    works with the project's Tailwind v4 setup.
  - Footer, below the list, `md:hidden`: a full-width `<button type="submit" className="... min-h-11 rounded-lg bg-accent text-on-accent">Show results</button>` (submits
    the enclosing GET form) and a `type="button"` "Done" that closes without applying. Add `Select all` / `Clear` buttons `max-md:min-h-11 max-md:px-2` in the header row.
  - Close on Escape (`keydown` listener next to the existing `pointerdown` one).
  - Done when: at 375x812 and 390x844, opening each of Source, Status, Difficulty, Topic and Notes shows a sheet whose left and right
    edges equal the viewport edges (`getBoundingClientRect()`: `left === 0`, `right === innerWidth`, `bottom === innerHeight`), the Topic list scrolls inside it,
    "Show results" applies the selection (URL gets `?topic=...`), tapping the backdrop closes it, and at 1280 px width the dropdown is
    the same anchored panel as before with no backdrop.
- [ ] **2. Unit-free check of the markup.** If an existing test renders `FilterGroup`, extend it; otherwise no new test is required for styling
  (it is CSS). Run `pnpm exec vitest run apps/web/app/no-emoji.test.ts` and `pnpm -r typecheck`.
  - Done when: both pass.

### Problem 2: End of a pattern lesson

- [ ] **3. "Practice this pattern" and sensible next/previous at the end of Learn.** In `apps/web/app/dsa/pattern/[id]/page.tsx`:
  - Add a server component `LessonEnd({ id, name, problemCount, nextGroup })` (same file or `apps/web/app/dsa/pattern/[id]/lesson-end.tsx`). It
    renders a card below `ArticleView` (only when `currentTab === "learn" && article`): heading "Ready to practice?", text
    "<N> problems for <pattern name>, easy to hard", and a primary link `href={`/dsa/pattern/${id}?tab=practice`}` with the label "Practice <name>"
    (`max-md:min-h-11`, full width on phones). **Do not pass `scroll={false}`** on this link (the `Tabs` links do, which would keep the bottom-of-article
    scroll position and land the learner at the bottom of the Practice list, the same bug as problem 3). Secondary links: "Back to <group title>"
    (`/dsa?group=${group.id}#p-${id}`, existing target) and, only when the pattern is the last one in its group, "Next group: <title>"
    (`/dsa?group=<next group id>#g-<next group id>`, scroll enabled). `problemCount` is `pattern.problems.length` (static; the solved count needs the
    DB, so leave it out).
  - Also add a short link at the end of the Practice tab when an article exists: "Back to the lesson" (`/dsa/pattern/${id}`).
  - Keep the existing bottom `<nav aria-label="Other patterns">` as the previous/next control, but: (a) from Learn it goes to the neighbour's Learn page
    (current behaviour, keep), (b) labels become "← <prev name>" / "<next name> →" as now, with `max-md:min-h-11 max-md:flex-1` so each is a
    thumb-sized button, (c) when a neighbour is in a different group, show the group title as a small second line (`<span class="block text-xs text-muted">`).
  - Put the neighbour/group computation in a small pure function `patternNeighbours(id)` in a new `apps/web/lib/pattern-nav.ts`
    (`{ prev, next, group, nextGroup, isLastInGroup }` from `ALL_PATTERNS` / `DSA_GROUPS`).
  - Done when: at 375x812, scrolling to the bottom of `/dsa/pattern/hash-map` shows the card, tapping "Practice Hash map / counting" opens the Practice
    tab with the page scrolled to the top (`scrollY === 0` or the tabs row visible), and the previous/next buttons are at least 44 px high.
- [ ] **4a. Test.** `apps/web/lib/pattern-nav.test.ts`: first pattern has no `prev`; last pattern (`ALL_PATTERNS.at(-1)`) has no `next`; `isLastInGroup` is true
  for the last pattern of `DSA_GROUPS[0]`; `nextGroup` for it is `DSA_GROUPS[1]`; unknown id returns null.
  - Done when: `pnpm exec vitest run apps/web/lib/pattern-nav.test.ts` passes.

### Problem 3: Section opens at the end, and slowly

- [ ] **4. Confirm the cause in a browser before changing anything** (record the result in *Implementation notes*). Built-in browser, copy of the database
  (see Acceptance criteria), viewport 375x812, then repeat at 390x844:
  1. Open `/dsa` (first group open). With `javascript_tool` run `history.scrollRestoration` (note value) and `document.documentElement.scrollHeight`.
  2. Scroll so the header "Searching and sorting" is at the top third of the screen. Run
     `({y: scrollY, top: document.getElementById('g-search-sort').getBoundingClientRect().top})`.
  3. Tap the header. After the content appears, run the same expression. **Expected if the hypothesis is right:** `y` unchanged (or nearly), `top` strongly negative
     (about the height of the collapsed first group), and the screen shows the middle or end of "Searching and sorting".
  4. Control A: type `/dsa?group=search-sort#g-search-sort` in the address (full load). If this one lands on the header, the bug is the client navigation with
     `scroll={false}`, not CSS or layout.
  5. Control B: tap the second group while the page is scrolled to the very top. If it lands correctly there, that also points at the preserved `scrollY`.
  6. If none of this reproduces, check hypothesis (a) in Context: open `/dsa/pattern/hash-map`, scroll to the bottom, tap Practice in the tabs (scroll up first)
     and note `scrollY`; and look for layout shift with `PerformanceObserver` of type `layout-shift` during the tap.
  - Done when: the notes contain the before/after numbers for steps 2 and 3 and which control reproduced it.
- [ ] **5. Fix the scroll.** In `apps/web/app/dsa/page.tsx` (`Dsa()` accordion header `Link`):
  - When **opening** a group (`open === false`): remove `scroll={false}` so Next scrolls to `#g-<id>` (the `scroll-mt-32 lg:scroll-mt-4` class already offsets the compact top bar). Keep
    `scroll={false}` on the **closing** link (`/dsa?group=none`), where the header does not move.
  - Verify that Next actually performs the hash scroll after the dynamic content replaces the old content. If it does not (the target is not in the DOM at the commit
    that Next scrolls on), add a tiny client component `apps/web/app/dsa/scroll-to-group.tsx` (`"use client"`, props `{ group: string | null }`) rendered next to the open group, with a `useEffect` keyed on `group` that
    calls `document.getElementById(\`g-${group}\`)?.scrollIntoView({ block: "start" })` once per change (skip on first mount when `location.hash` is empty and the page just loaded with the default group). Do this only if the plain fix fails; do not do both.
  - Also pass the same fix to the other in-page anchor links that rely on this: `ActiveChips` links need no change.
  - Done when: repeating step 4.3 gives `top` between 0 and about 130 px (the header is at the top of the screen, below the compact bar) and the first problem row of the opened group is visible without scrolling,
    for the 2nd, 4th and last group, at 375x812 and 390x844. Desktop (1280 px): tapping a group header does not jump the page unexpectedly (it now aligns the header to the top; that is acceptable).
- [ ] **6. Why it opens slowly: measure, then three small changes.** No rewrite.
  - Measure first (put numbers in *Implementation notes*): in dev, wrap the `Promise.all` in `Dsa()` and `getDsaView()` with `console.time` locally (remove before finishing) and read the Network tab
    waterfall for the `/dsa?group=...` RSC request at 375x812 with "Slow 4G" throttling. Record: time of the RSC response, number of DB queries (the `getDb` calls listed in Context), and size of the RSC payload.
    Hosted timing against the real Vercel site cannot be measured by the implementer; do not guess it.
  - Change 1 (pending feedback): the group header becomes a small client component `GroupHeaderLink` in `apps/web/app/dsa/group-header-link.tsx` that wraps `Link` and shows
    a pending state using `useLinkStatus()` (check the Next 16 docs in `apps/web/node_modules/next/dist/docs/` for its exact import and rules) as a subtle opacity + spinner in the chevron slot. The tap then gives immediate feedback
    instead of a frozen page. Keep `aria-expanded`. Server data stays in `page.tsx`; pass only strings and numbers (`title`, `covered`, `total`, `open`, `href`).
  - Change 2 (do not block the list on the sidebar): `getLeetCodeStatus()` and `getExtensionStatus()` feed only `SyncStatus`, which is below the list on phones. Move those two calls into an async
    `SyncPanel` component (calls `await connection()` itself) rendered inside its own `<Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>` in the `<aside>`, so the group list renders without waiting for them. `getSimpleMode()` stays.
  - Change 3 (pattern Practice tab): `Practice` in `pattern/[id]/page.tsx` calls `getDsaView()` for one pattern. Leave as is unless the measurement shows it is the slowest request; if so, only note it in *Found but not changed* (a `getPatternView(id)` is a
    separate plan).
  - Done when: the notes have the measurements; the tap on a group header shows the pending state within one frame on throttled network; `SyncStatus` appears after the list; `pnpm -r typecheck` and `pnpm exec vitest run apps/web/app/skeletons.test.ts` pass.
- [ ] **7. Docs.** Add three lines to `docs/mobile.md` ("Practice list on a phone": filters open as a bottom sheet, groups open at their header, lessons end with Practice).
  - Done when: `docs/mobile.md` mentions all three.

## Acceptance criteria

All browser checks: built-in browser, viewport 375x812 and again 390x844 (`resize_window`), against a **copy** of the database (`DATABASE_URL=file:<path to a copy of data/habit.db>` or a fresh seeded file; never `data/habit.db`, never the desktop
app-data folder). Reset the viewport to desktop afterwards.

- [ ] On `/dsa` at both sizes, each of the five Filters dropdowns opens fully on screen (sheet left 0, right = viewport width), is usable with one thumb (rows at least 44 px, "Show results" at the bottom), and closes by backdrop, Done or Escape. No horizontal page scroll (`scrollWidth <= clientWidth`).
- [ ] At 1280 px the dropdowns look and behave as before (anchored panel, no backdrop).
- [ ] The bottom of `/dsa/pattern/<id>` Learn shows a "Practice <name>" card that opens `?tab=practice` at the top of the page, plus thumb-sized previous/next buttons; the Practice tab ends with a "Back to the lesson" link when an article exists.
- [ ] Tapping any group header on `/dsa` (2nd, 4th, last) puts that header at the top of the screen with its first question visible; the page is never left at the end of the group.
- [ ] The tap shows a pending indicator immediately; the Sync panel no longer delays the list.
- [ ] The cause of the scroll bug and the measurements are written in *Implementation notes*.
- [ ] `pnpm exec vitest run apps/web/lib/pattern-nav.test.ts apps/web/app/skeletons.test.ts apps/web/app/no-emoji.test.ts` pass, `pnpm -r typecheck` passes, and `pnpm check` passes once at the end.
- [ ] No files changed outside those listed here (or explained in *Implementation notes*).

## Suggested split (three agents, no shared files)

| Agent | Steps | Owns (edits only these) |
|---|---|---|
| A: Filters | 1, 2 | `apps/web/app/dsa/filter-group.tsx` |
| B: Lesson end | 3, 4a | `apps/web/app/dsa/pattern/[id]/page.tsx`, `apps/web/app/dsa/pattern/[id]/lesson-end.tsx` (new), `apps/web/lib/pattern-nav.ts` and `.test.ts` (new) |
| C: Group open and speed | 4, 5, 6, 7 | `apps/web/app/dsa/page.tsx`, `apps/web/app/dsa/group-header-link.tsx` and `scroll-to-group.tsx` (new, if needed), `docs/mobile.md` |

Agent C must not edit `filter-group.tsx` (the `FilterBar` in `page.tsx` only passes props, so no conflict). Agent B must not touch `dsa/page.tsx`; its "Next group" link only uses the existing `#g-<id>` target, which relies on Agent C's scroll fix.
Plan file edits (checkboxes, *Implementation notes*): each agent writes only its own subsection to avoid merge conflicts.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, the step 4 numbers, measurements from step 6, deviations, *Found but not changed*.)

## Review

(Reviewer fills in.)
