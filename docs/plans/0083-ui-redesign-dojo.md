# 0083: UI redesign: the Dojo design system, screen by screen

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-19
- **Implemented by:** Claude Code (Phase 1, steps 1-5), 2026-11-19
- **Spec:** `DESIGN.md` (repo root) and the mockup canvas "Zen Dojo redesign mockups"
  (https://claude.ai/artifact/Da18ULMwvybAWrQ13uRXmj, private to the user; ask the lead for screenshots if you cannot open it)

## Goal

Move every screen onto the Dojo design system in `DESIGN.md`: the same green look people know, with clearer hierarchy,
progress you can see (streak, XP, daily goal), readable lessons, a calmer Practice page, a focused problem workspace and a
full custom theme editor. Nothing about data, sync or the judge changes; this is presentation only.

## Context

- Tokens today: `apps/web/app/globals.css` (`--background`, `--surface`, `--line`, `--muted`, `--accent`,
  `--on-accent`, `--cat-*`, `--diff-*`, Shiki colours, 6 `data-style` blocks). Tailwind v4 theme maps them
  (`bg-surface`, `text-muted`, `border-line`, `bg-accent`...).
- Fonts: `apps/web/app/layout.tsx` loads Geist, Geist Mono, Lexend, Atkinson via `next/font/google`.
- Themes: `apps/web/lib/theme.ts`: `ACCENTS` (green, blue, violet, amber, rose), `STYLES` (`classic`, `paper`, `ocean`,
  `terminal`, `sage`, `dusk`, `ember`), `FONTS`, the inline boot script, `applyTheme`, the custom palette
  (`CUSTOM_THEME_STORAGE_KEY`, keys background/surface/foreground/line/muted plus accent and a custom font). Appearance
  syncs as one record (`appearance_prefs`, plan 0075). Settings UI: `app/theme-picker.tsx`, `app/custom-appearance.tsx`.
- Shell: `app/shell.tsx` (layout, phone header, theme sync), `app/nav.tsx` (sidebar and `NavFooterLinks`),
  `app/components/account-popover.tsx`, `app/components/sync-status.tsx`, phone tab bar inside `shell.tsx`/`nav.tsx`.
- Shared UI: `app/ui.tsx` (`Stat`, `Difficulty`, `StatusMark`, `ProgressBar`, `PageMain`), `app/learn-blocks.tsx`,
  `app/tabs.tsx`, `app/section-tabs.tsx`, `app/toc.tsx`, `app/submit-button.tsx`.
- Problem workspace: `app/judge-workspace.tsx` (problem tabs, code, results, custom input, last runs, phone read-only view),
  `app/pane-layout.tsx` (three panes, presets classic/columns/stacked/focus, swap by dragging titles, maximise; stored in
  `habit-pane-layout`, per device). The judge returns per-case `CaseResult` (`lib/judge/run.ts`): pass, input, expected,
  actual, error, problem kind, elapsed time, printed output. There is no Submit, no runtime chart and no percentiles; only
  LeetCode imports have runtime and memory. Phones cannot run code.
- Conventions (AGENTS.md): Next 16 `cacheComponents`; forms work without JS; wide layouts; no emoji; tests next to code.
  `react-hooks/purity`: no `Date.now()`/`Math.random()` in render.
- `app/skeletons.test.ts` and `app/no-emoji.test.ts` guard loaders and emoji; keep them passing.

## Out of scope

- Any change to data, server actions, sync, the judge or the AI features.
- New features not in the mockups: Submit, runtime graphs or percentiles, achievements beyond what exists, mobile apps.
- Rewriting lesson content.
- Figma files.

## Phases and steps

Do the phases in order. Phase 1 must land first; phases 2 to 5 can then be split between agents (they touch different
files). Each step ends with a screenshot check at 1280 px and 390 px in light and dark against the matching mockup frame.

### Phase 1: foundations (one agent)

- [x] **1. Tokens.** In `globals.css` replace the light and dark values with DESIGN.md's Dojo values and add the new
  tokens: `surface-2`, `line-strong`, `primary-hover`, `primary-soft`, `reward`, `reward-soft`, `success`, `warning`,
  `danger`, `cat-lld`, `cat-core`. Keep `--accent`/`--on-accent` as aliases of `--primary`/`--on-primary` so old classes
  keep working until each screen is moved. Map every new token in the Tailwind theme block. Retune the Shiki colours for
  the new backgrounds (contrast 4.5:1 for comments in both modes).
  - Done when: the app builds, nothing looks broken with the old classes, and a token test (below) passes.
- [x] **2. Fonts.** In `layout.tsx` load Figtree (400/500/600/700) and JetBrains Mono (400/500) with `next/font/google`
  and point `--font-sans` / `--font-mono` at them. Keep Lexend, Atkinson and the custom font for Settings > Reading font.
  Drop Geist once nothing uses it. Default reading font label becomes "Figtree (default)" in `lib/theme.ts` `FONTS`.
  - Done when: body text renders in Figtree, code in JetBrains Mono, and the reading-font options still switch.
- [x] **3. Type, spacing, radius, shadow, motion tokens.** Add the scale from DESIGN.md as CSS variables/Tailwind theme
  values (`text-xs` to `text-3xl` with line heights, radius `sm 6 / md 10 / lg 14`, `shadow-sm`, `shadow-lg`, motion
  durations 120/180/240 ms and the easing). Respect `prefers-reduced-motion` globally.
  - Done when: utilities exist and are documented in a short comment block in `globals.css`.
- [x] **4. Themes.** In `lib/theme.ts` keep the stored ids so nobody's choice breaks: `classic` is shown as **Dojo**
  (default). Add **Ember** values to the existing `ember` style, retune `ocean`, `dusk`, `paper`, `terminal`, `sage` so
  each sets the full token set (light and dark, Terminal dark only). Accent swatches stay. Update the boot script so a
  theme sets every token before paint (no flash).
  - Done when: switching each theme in Settings repaints every token, with no flash on reload.
- [x] **5. Shared components.** Restyle `app/ui.tsx` and friends to DESIGN.md: buttons (primary/secondary/quiet/danger
  with focus ring and disabled), inputs with visible labels, cards (no shadow at rest; linked cards get `line-strong` +
  `shadow-sm` on hover), `ProgressBar` (6 px, `full` radius, number beside it), new `StreakChip` and `XpChip`
  (`reward-soft` + `reward` icon), `Difficulty` as tinted badges, `StatusMark` as check/ring icons, `Tabs` as underline
  tabs, empty state and skeleton blocks in `surface-2`. Use Lucide-style inline SVG icons (1.75 stroke) as today; no icon
  library is required.
  - Done when: a `/dev/components` page (desktop app and `pnpm dev` only, not linked, not in the hosted nav) shows every
    component in light and dark, and matches the "Design tokens" mockup frame.

### Phase 2: shell and Today (one agent)

- [ ] **6. Sidebar.** `nav.tsx`: logo row, streak and XP chips under it, five items (Today, Practice, Learn, Review,
  Roadmap) with icons, Review count in `warning`, selected item `primary-soft`; account and sync in one compact row at the
  bottom; the timer box shows only while a timer runs; back/forward arrows move out of the logo row (keep them in the
  header on desktop). Matches mockup "Component: sidebar".
- [ ] **7. Phone shell.** Phone header (title, streak chip) and the 5-tab bar (Today, Practice, Learn, Review, You), 48 px
  targets. Matches "Component: phone tab bar".
- [ ] **8. Guest notice.** A slim dismissible bar at the top of the content area instead of the floating toast.
- [ ] **9. Today.** `app/page.tsx`: greeting line with date and week, a progress row (daily-goal ring, XP bar with "N XP
  to level", streak with 7-day strip), "Up next" list with subject edge colours and done state, "This week's focus" and
  "Due for review" cards open by default. Matches "Today" desktop and phone.
- [ ] **10. Faster first paint.** Pages must show their shell and first section without waiting for slow data: move slow
  reads into their own `<Suspense>` sections, keep skeletons only for waits over 1 s. Measure Today, Practice, Learn and
  a lesson before and after on the hosted site (Vercel logs or the browser) and write the numbers in the notes.
  - Done when (6 to 10): screenshots match, and first content appears in under 1 s on a warm hosted load.

### Phase 3: Practice and the workspace (one agent)

- [x] **11. Practice list.** `app/dsa/page.tsx`: plain-case stat line, tabs (Patterns, All problems · count, Re-solve due,
  Boss battles), search plus one Filters button (popover on desktop, the 0074 bottom sheet on phone) applied as you pick,
  removable filter chips, sort menu. Groups with progress bars. "All problems" is a table (status, #, problem, pattern,
  difficulty, source, last solved) with paging of 50 and a collapsed phone row. Matches "Practice", "All problems".
- [x] **12. Pattern page.** `app/dsa/pattern/[id]`: header with progress, Learn / Practice / My template tabs, problem
  cards with "Next up", cheat sheet aside, next-pattern link. Matches "DSA pattern page".
- [x] **13. Workspace header.** `judge-workspace.tsx` / `[id]/page.tsx`: slim bar with back, "pattern · n of m", title,
  difficulty, timer, and a 4-icon layout switcher wired to the existing `pane-layout` presets.
- [x] **14. Panes.** `pane-layout.tsx`: each pane gets a title bar with a drag handle, its tabs and a maximise button;
  12 px radius panes on `surface-2` with 8 px gaps; dividers stay keyboard-resizable. Behaviour (swap, maximise, presets,
  storage) does not change.
- [x] **15. Code pane.** Language select, Reset, Restore last run and Run (Ctrl+Enter) in the pane header; line numbers.
- [x] **16. Results pane.** Tabs: **Cases** (list on the left: examples, tests, large inputs, each with pass/fail icon and
  time; detail on the right: input, expected, yours in `success`/`danger`, the reason for a failure from
  `CaseResult.problem`/`error`, and "Printed during this case" from `CaseResult.output`), **Console** (compile output and
  `beforeTests`), **Custom input** (existing run-on-this-input), **Last runs** (existing list with Load code). All cases
  passed: a `success` banner with "Saved to Notes", the XP gained and a Next problem link.
- [x] **17. Phone problem view.** Tabs Problem / Code / Last run / Notes; Code shows the existing "Open on a computer to
  write and run code" note and the read-only last run or saved code; Last run lists cases from the last saved run.
  Matches "DSA problem (phone, dark)".
- [x] **18. Boss battle and Backlog** restyled to their mockups.

### Phase 4: Learn (one agent)

- [ ] **19. Learn hub.** Continue card, course cards with subject top edge, progress and next step, course library
  section (plan 0081) restyled. Matches "Learn hub".
- [ ] **20. Course page.** Sections as cards with done/next/not-started rows and a Continue button. Matches "Course page".
- [ ] **21. Lesson page.** 68-character column, breadcrumb bar with lesson progress, outline open on the right from 1280
  px (sticky, current section marked), tip callouts, "Mark as learned · +XP" and next-lesson link at the end. Phone: back
  bar with progress, outline behind a button, sticky Ask AI / Mark learned. Matches "Lesson".
- [ ] **22. LLD project page.** Section tabs (Walkthrough, Diagrams, Full code, Playground, Edge cases, Your turn); Full code
  as file tree by package plus code viewer with a "Uses" line; "Write your own classes" button. Matches "LLD project".
- [ ] **23. Your classes editor.** Restyle the existing IDE (plan 0052): file tree with New file / New folder, open-file
  tabs, editor, Run with test output, "Compare with reference" side panel. No behaviour change. Matches "Your classes".
- [ ] **24. System design walkthrough.** Seven-step rail with done/current, step content, diagram figure, trade-off and
  numbers cards, Java snippet in a fold-out, next-step and "Draw it in Diagrams" links. Matches "System design walkthrough".
- [ ] **25. Reading list and Diagrams** restyled to their mockups.

### Phase 5: Review, profile, settings, sign in (one agent)

- [ ] **26. Review, Quick revise, Roadmap** restyled to their mockups (flashcard with the four rating buttons showing the
  next interval, weak spots, last-days plan, key numbers, 16-week strip and phases).
- [ ] **27. Profile.** Stat tiles, 12-week activity grid with the `primary` scale, subject balance bar, tabs Stats /
  Badges / Portfolio / Settings.
- [ ] **28. Settings.** Search, section list, rows with label + help + control (segmented light/dark, theme swatches,
  reading font select, switches). Note which settings sync and which stay on this device.
- [ ] **29. Custom theme editor.** `custom-appearance.tsx`: start from any theme; edit background, surface, surface-2,
  line, foreground, muted, primary, reward, success, warning, danger for light and dark separately; UI, heading and code
  font; corners Sharp/Default/Round; density Compact/Comfortable; live preview card; contrast ratio under each text colour
  with a warning below 4.5:1 (never blocks); export/import JSON. Extend the stored custom-theme JSON with the new keys,
  reading old values as before; it stays inside the `appearance_prefs` record so it syncs (plan 0075).
  - Done when: a theme exported on one device and imported on another looks identical, and old custom themes still load.
- [ ] **30. Sign in.** Centered card on desktop, full-width on phone, "Continue with GitHub" and "Try it without an
  account". Matches "Sign in".

### Phase 6: finish (lead)

- [ ] **31. Tests.**
  - `apps/web/app/design-tokens.test.ts`: every token in DESIGN.md exists in `globals.css` for light and dark; text tokens
    meet 4.5:1 on `background` and `surface` (compute contrast in the test).
  - Extend `lib/theme` tests: each built-in theme sets every token; `classic` id still loads as Dojo; old custom themes parse.
  - `custom-appearance` round trip: export, import, same values.
  - Keep `skeletons.test.ts` and `no-emoji.test.ts` passing; update snapshots only where the plan changes markup.
- [ ] **32. Accessibility and viewport pass.** Run the axe accessibility tools and the `ux-audit` / `viewports` skills on
  each screen at 375, 768 and 1280 px; fix anything at AA. No horizontal scroll at 375 px except code and wide tables in
  their own scroll box.
- [ ] **33. Docs.** Update DESIGN.md if anything changed during the build, set its status line to "in use", and add a
  "Design" link to `docs/content-editing.md` or the README for contributors.

## Acceptance criteria

- [ ] Every screen in the mockup canvas matches its frame closely in light and dark, desktop and phone.
- [ ] Existing theme choices and custom themes still load; Dojo is the default; themes switch without a flash.
- [ ] The workspace keeps all current behaviour (panes, presets, swap, maximise, Run, custom input, last runs, saved
      solution) and shows each case's input, expected, yours, failure reason and printed output clearly.
- [ ] No Submit button, runtime chart or percentile is added.
- [ ] First content on Today, Practice, Learn and a lesson appears in under 1 s on a warm hosted load.
- [ ] WCAG AA contrast and keyboard access on every screen; no page scrolls sideways at 375 px.
- [ ] `pnpm check` passes.

## Open questions

1. Whether Paper's serif headings (Newsreader) are worth the extra font download (DESIGN.md open decision 1). Default:
   skip it; Paper uses Figtree headings.

## Implementation notes

### Phase 1 (steps 1-5), 2026-11-19

- **Tokens** (`app/globals.css`): Dojo light/dark values from DESIGN.md in `:root` / `:root[data-theme="dark"]`, all new
  tokens mapped in `@theme inline` (`bg-surface-2`, `border-line-strong`, `bg-primary`, `hover:bg-primary-hover`,
  `bg-primary-soft`, `text-on-primary`, `text-reward`, `bg-reward-soft`, `text-success|warning|danger`,
  `border-cat-lld|core` ...). `--accent`/`--on-accent` are `var(--primary)`/`var(--on-primary)`; `--diff-*` are
  `var(--success|warning|danger)`. Shiki dark background is now `#0d0e0d` (DESIGN.md "Code"); comment colours pass 4.5:1.
- **Deviation: Dojo light `warning`** is `#9A6210`, not `#A86A12`: the DESIGN.md value is 4.1:1 on background and fails
  the 4.5:1 rule the token test enforces. DESIGN.md is updated to match.
- **Fonts** (`layout.tsx`): Figtree 400-700 (`--font-figtree`) and JetBrains Mono 400/500 (`--font-jetbrains-mono`); Geist
  is gone (theme-picker preview and the custom-font fallback now use Figtree). Lexend/Atkinson/custom font unchanged.
  `FONTS` default label is "Figtree (default)".
- **Scales**: text-xs..3xl with DESIGN.md line heights (this changes old `text-xl/2xl/3xl` sizes slightly), radius
  `rounded-sm/md/lg` = 6/10/14 via `--r-sm/md/lg` (themes change those three; old `rounded-xl/2xl` keep Tailwind defaults),
  `shadow-sm`/`shadow-lg` via `--elev-*` (`0 0 #0000` in dark), `duration-120/180/240` + `ease-dojo`, also
  `--dur-fast|base|slow`. Reduced motion stays global through the existing `data-motion="off"` rule (set by the init
  script from Settings > Animations or the OS); no separate media query, so "On" still overrides the OS as before.
- **Themes** (`lib/theme.ts`): `THEME_TOKENS` (16 colour tokens) and `Palette = Record<ThemeToken, string>`; every
  `STYLES` entry has full light and dark palettes, and the CSS blocks are equal (test). Ids unchanged; `classic` shows as
  **Dojo**. Ember uses DESIGN.md's `#FAF7F2`/`#C2481B`; Ocean blue, Dusk violet, Paper black-on-cream, Sage retuned;
  Terminal is `darkOnly` (light palette = dark; init script and `resolveMode(mode, osDark, style)` force `data-theme=dark`).
  Paper no longer switches body text to Georgia (DESIGN.md: Figtree everywhere; the "Serif" reading font still exists).
- **Accents**: a theme now has its own primary, so the default accent `green` is relabelled **"Theme colour"** (keeps the
  theme's primary); blue/violet/amber/rose override `--primary` in light and dark (selector repeats `[data-accent]` to
  beat the dark theme rules) with hover/soft from `color-mix`. The picker swatch and preview button show the theme's own
  primary for the default.
- **Custom theme boot script**: sets `--primary`/`--on-primary` (plus hover/soft via `color-mix`) from `accent` instead
  of `--accent`, and applies any `THEME_TOKENS` key found in the saved light/dark palette (so step 29 can add keys
  without touching the script). Old five-colour themes still load (tests). `lib/custom.ts` editor is unchanged except
  the Dojo muted default.
- **Components** (`app/ui.tsx`): `Button`, `ButtonLink`, `buttonClass(variant, size)` (primary/secondary/quiet/danger,
  sm/md), `INPUT_CLASS`, `Field`, `TextInput`, `Card` (`href`, `subject`), `Badge` (`tone`), `Difficulty` (tinted badge),
  `StatusMark` (success check, warning dashed ring, faint ring for unsolved), `ProgressBar` (`tone` primary|reward,
  `showCount` for "12 of 40"; off by default so existing callers don't print the number twice), `ProgressRing`,
  `StreakChip`, `XpChip` (both `gamify-only`), `EmptyState`, `Skeleton`, icons `FlameIcon`/`BoltIcon`/`CheckIcon`.
  `Stat` is plain case now. `Tabs` underline uses `border-primary`. `.hit-card` hover uses `line-strong` + `shadow-sm`;
  the focus ring uses `--primary`.
- **`/dev/components`** (`app/dev/components/page.tsx` + `scheme-toggle.tsx`): 404 when `isHosted()`, not in the nav,
  `robots: noindex`. A preview toggle flips light/dark and each theme without saving. Checked in the browser on
  `next dev` (light, dark, Ember). Not compared with the mockup frame (no access to the canvas from this session).
- **Tests**: new `app/design-tokens.test.ts` (DESIGN.md tables vs CSS, Tailwind mapping, scales, contrast of text
  tokens and Shiki comments); `lib/theme.test.ts` extended (every theme sets every token, contrast per theme, `classic`
  loads as Dojo, Terminal dark only, Ember values, old custom theme parses); `lib/custom.test.ts` updated for
  `--primary` and new keys. Ran: those three plus `nav`, `no-emoji`, `skeletons`, `ui-prefs` (101 passed),
  `pnpm -r typecheck`, eslint on changed files. `pnpm check` not run (phases 2-6 remain).
- For phases 2-5: use the components above rather than raw class strings, `bg-surface-2` for sidebar/table header/hover
  rows, `bg-primary-soft text-primary` for selected nav, `text-warning` for the Review count, `ProgressBar tone="reward"`
  for XP. Old skeleton components still use `bg-line/60` (`skeletons.test.ts` checks it); move them to `Skeleton` in
  phase 2 and update that test.
### Phase 3 (steps 11-18), 2026-11-19

- **Practice list** (`app/dsa/page.tsx`): page title "Practice"; a plain-case stat sentence replaces the four `Stat`
  tiles; tabs Patterns, All problems (count), Re-solve due, Other solves (kept: it held the synced extras and
  `AddedProblems`), Boss battles (links to `/dsa/boss`, hidden in simple mode). Groups sit in one card with
  `GroupHeaderLink` now drawing a chevron, the title and a `ProgressBar` (`showCount` from `sm`). Patterns inside the
  open group are cards with progress, "Learn the pattern" and the cheat sheet.
- **Filters** (`filter-group.tsx`): `FilterGroup` (five dropdowns) is replaced by `FiltersMenu` (one "Filters" button,
  popover from `md`, bottom sheet below, the five groups as fieldsets) and `SortSelect`. With JS a tick or sort change
  calls `router.replace` with the form's values (menu stays open); without JS "Show results" / a noscript Apply
  submits the GET form. Chips are `primary-soft` links with "Remove filter" labels.
- **All problems table** (`problem-ui.tsx` `ProblemTable`): status, #, problem, pattern, difficulty, source, last
  solved; paging of 50 (`?page=`), Previous/Next. Columns drop by width (# and last solved below `lg`, pattern and
  source below `xl`) and a second line under the title shows them; the header row is `sr-only` below `md`. Filtering
  on the Patterns tab shows the same table (not paged). New helpers in `lib/dsa-filters.ts`: `"all"` tab,
  `DSA_SORTS`/`parseDsaSort`/`sortProblems` (roadmap, difficulty, title, last solved), `DSA_PAGE_SIZE`/`parseDsaPage`,
  `sourceLabel`, `lastSolvedOn` (tests added in `dsa-filters.test.ts`). Row actions are shared by rows, cards and the
  table (`RowActions`).
- **Pattern page**: breadcrumb, 3xl title, header progress bar in its own Suspense (the static header paints first);
  tabs Learn / Practice / My template (+ Reference when it has articles). Practice shows `ProblemCard`s (2 columns) with
  "Next up" on the first unsolved one, an aside with the timer and a cheat-sheet summary (recognize line, template code,
  "Write/Edit my template" link); the editable `CheatSheet` moved to the My template tab. Prev/next pattern are cards.
- **Workspace header** (`[id]/page.tsx`): one slim header passed to `JudgeWorkspace` as `header` (back icon to the
  pattern's Practice tab, "pattern · n of m" from `ALL_PATTERNS`, title, difficulty, status, solve buttons, timer) and a
  small meta line (pattern chips, why, source link). `JudgeWorkspace` renders it in a bar with `LayoutSwitcher` (new
  export of `pane-layout.tsx`: 4 preset icon buttons + reset sizes, same `habit-pane-layout` store). The old text
  toolbar in `PaneLayout` is gone. The non-judged problem page keeps its layout, restyled, with its own back link.
- **Panes**: `PaneDef.tabs` puts tabs in the title bar (title becomes the sr-only name); grip-dot drag handle,
  SVG maximise/restore; panes `rounded-[12px]` on a `surface-2` box with 8 px gaps; dividers are invisible until
  hover/focus/drag (primary). Swap, maximise, presets, sizes and storage unchanged.
- **Code pane**: header has language, Zen, Reset, Restore last run (was "Last run"), Save, help and a primary Run with
  a Ctrl+Enter hint. Custom input moved out of the code pane into the Results pane. Editor (`code-editor.tsx`): primary
  focus ring (inset in the workspace), gutter padding, primary-tinted active line and selection; line numbers were
  already there.
- **Results pane** (`judge-panel.tsx` rewritten): `CasesView` (verdict line, case list grouped Examples / Tests / Large
  inputs with pass/fail icon and time; detail with input, expected, yours in `success`/`danger`, a failure reason from
  `problem`/`error`, first wrong operation for design problems, "Printed during this case"), `ConsoleView` (compiler
  message, `beforeTests`, per-case output), Custom input, Last runs (each language's run with "Load code"). All cases
  passed: a `success` banner with "Saved to Notes" (when saved), "+N XP" (`gamify-only`, from the page's
  `xpGain`) and Next problem (`nextHref`: next problem in the pattern, else the pattern's Practice tab). `Results`
  export is gone (only the workspace used it).
- **Phone view**: below 768 px `JudgeWorkspace` renders a separate view (`matchMedia`, like `PaneLayout`'s narrow check;
  server render shows the pane layout until hydration): tabs Problem (with the section tabs except Notes) / Code
  (`PhoneCodeNote` + saved solution or last run, read-only) / Last run (verdict and failed cases of the saved run) /
  Notes.
- **Boss battle and Backlog**: restyled (Boss: wide two-column with the timer aside, cards with a DSA edge, result
  chips as radio pills, `INPUT_CLASS` inputs; Backlog: count in the header, warning border while overdue, danger
  Skip button).
- **Deviations / notes**: not compared with the mockup canvas (no access); checked in the browser on `next dev` with a
  fresh database (All problems table, Filters popover applying as you pick, workspace at 1400 px with a run, phone
  view at 375 px, pattern page). `ui.tsx` and `globals.css` untouched. "Other solves" tab kept so no data disappears.
  Ran: `dsa-filters`, `no-emoji`, `skeletons`, `saved-solutions`, `design-tokens` tests, `pnpm -r typecheck`, eslint on
  changed files. `pnpm check` not run.

## Review
