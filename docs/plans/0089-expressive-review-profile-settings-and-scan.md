# 0089: Expressive redesign, part 5: Review, Revise, Backlog, Roadmap, Profile, Settings, Sign in, and the final scan

- **Status:** ready (start after 0085; step 9 runs last, after 0086, 0087 and 0088 are done)
- **Planned by:** Claude Code, 2026-11-20
- **Implemented by:** (implementer fills in)
- **Spec:** mockup canvas (https://claude.ai/artifact/Da18ULMwvybAWrQ13uRXmj).
  - Desktop boards: "Review", "Quick revise", "Backlog", "Roadmap", "Profile", "Settings and custom theme", "Sign in".
  - Phone galleries B, C and D.

## Goal

Move the remaining screens onto the Expressive look. That includes a custom theme editor that warns you when your main
colour looks like the error colour, which is why buttons turned red before. Then check every page in the app at five
widths, so the redesign ships without broken layouts.

## Context

- Needs plan 0085: tokens, components, the shell and its layout rules.
- **Pages:**
  - Review: `app/review/page.tsx` and `app/review/week`.
  - Quick revise: `app/revise/page.tsx`.
  - Backlog: `app/backlog/page.tsx`.
  - Roadmap: `app/roadmap/page.tsx`. 0084 rebuilt its strip and its test is `roadmap.test.ts`.
  - Profile: `app/profile/page.tsx`, `profile-ui.tsx`, plus the `badges`, `portfolio`, `certificates` and `account`
    sub-pages.
  - Settings: `app/profile/settings/*` (`settings-shell.tsx`, `settings-section.tsx`, `settings-search.ts`).
  - Theme UI: `app/theme-picker.tsx` and `app/custom-appearance.tsx`. The custom theme lives under `CUSTOM_THEME_KEY`
    inside the synced `appearance_prefs` record (plan 0075).
  - Sign in: `app/login/page.tsx`.
- **Red buttons (`docs/design-review-2026-11-19.md`):** the user's saved custom theme had primary `#b21f1f`, which is
  next to `danger`. 0084 clears the custom theme when a preset is picked and guards `--primary`.
- **Pitfall:** XP and streak come from rows (`progress.ts`). Never compute them in render with `Date.now()`.

## Out of scope

- New settings, new badges, data or sync changes.
- Restyling pages owned by 0086, 0087 and 0088. Step 9 only scans them and reports, or makes small fixes.

## Steps

- [ ] **0. Load the UI skills first (required):** `ux-audit`, `viewports`, `page-patterns` (Settings is Pattern 5,
  Sign in is Form (auth)), `forms`, `labels`, `errors`, `spacing`, `typography`, `colour-palette`, `anti-slop`,
  `empty-states`, `motion`, `reduced-motion`, `frontend-design`, `ui-review`, `accessibility-audit`. Antigravity:
  `.agents/skills/`. Record them in Implementation notes.
- [ ] **1. Review:**
  - Header "Review · Card n of m · about N minutes", with progress dots (current one wider).
  - The card stack: two tonal layers behind the current card.
    - The card shows a subject pill, the question (28 px, 500) and "Show answer" (primary pill).
    - After flipping, it shows the answer box and four rating pills with their next interval: Shaky 10 min
      (`reward-soft`), Okay 2 days (`surface-2`), Solid 7 days (`primary-container`), Can teach it 21 days (`primary`).
    - No red.
  - Aside "Up next": queue rows with `SubjectShape`, and a streak card on `reward-soft`. It wraps under the card on
    narrow widths.
  - Keyboard: Space shows the answer, 1–4 rate. Add these to `SHORTCUTS` under "Review".
- [ ] **2. Quick revise:**
  - A hero on `primary`: "Interview on <date>", "N days to go", and a "10-question quiz" pill.
  - "Weak spots" cards in subject tones.
  - "Last days" plan with day tiles (-3 … 0) and "Key numbers" rows, in a two-up auto-fill grid.
  - Keep printing working (`print-button.tsx`).
- [ ] **3. Backlog:**
  - Title and the "Skipping never costs XP" line.
  - "Shift the plan a week" (outline) and "Add 2 to today" (primary).
  - Week chips, then rows with `SubjectShape`, title, meta and "Do today" (tonal).
- [ ] **4. Roadmap:**
  - Title "Your 16 weeks" and "Week n · x% done · on track for <date>".
  - The strip: 16 circles that fill from the bottom by percent done, current week bigger with a `primary` ring.
    8 per row on phone.
  - Four phase cards in tones (Foundations, Core patterns, Depth, Interview mode), each with a progress bar and state.
  - A "Week n · this week" card with DSA, SD and LLD focus tiles and "Open week n".
  - Keep `roadmap.test.ts` passing: no red for normal states.
- [ ] **5. Profile:**
  - A hero card with the avatar, "Level n · <title>", XP, a progress bar to the next level, and Settings (outline).
  - Four stat tiles in tones (streak, problems solved, concepts covered, focus time).
  - The full-width activity grid: 52 weeks by 7 days, scaled to the width, `primary` scale, "N study sessions in the
    last year", best streak, and a legend. On phone, 17 weeks.
  - "Balance this month" bars by subject.
  - Badges in scalloped shapes (earned: `reward-soft`; not yet: `surface-2`).
  - Sub-pages (badges, portfolio, certificates, account) get the same header and cards.
  - On phone, the account menu items from 0085 step 6 appear at the top of `/profile` (the You tab).
- [ ] **6. Settings:**
  - A section list on the left: Appearance, Plan and dates, LeetCode, Coding, Sync and backup, About, plus the existing
    sections. It is sticky, and below about 980 px of page width it becomes a wrapping row of pills above the content
    (container query).
  - Each section is a card with rows of label, help and control: segmented controls, switches (52×32 px, M3 style),
    selects.
  - Settings search (`settings-search.ts`) stays.
  - Note which settings sync and which stay on this device, as today.
- [ ] **7. Theme presets and the custom theme editor:**
  - Presets: swatch buttons (two-tone circle and name) in an auto-fill grid (min 104 px). The selected one gets a
    `primary` ring.
  - The custom colour rows edit every token in `THEME_TOKENS` that the editor exposes today, plus the new ones from
    0085. Each row shows the swatch, name, role and hex.
  - Light and dark are edited separately, as today.
  - A live preview card shows a problem card with Start and Later buttons and a "Delete this note" danger button, so
    primary and danger can be seen side by side.
  - **The warning:** when the primary hue is within about 25° of the danger hue and saturation is above about 40%, show
    a `danger-soft` box: "Primary is close to the danger colour, so buttons may look like errors. Pick a colour further
    from red." It never blocks saving. Put the check in a pure helper `isNearDanger(primary, danger)` in
    `lib/theme.ts`.
  - Keep the contrast-ratio warning under each text colour (below 4.5:1).
  - Font (Google Sans, Inter if it's already offered, Atkinson, Lexend, Serif, custom), Corners (Round, Soft, Sharp,
    mapping to the radius tokens) and Density (Comfortable, Compact) stay as today.
  - The Play section has switches for XP and badges, Celebrations, and Reduce motion.
  - Old custom themes still load.
  - Done when: picking `#b21f1f` as primary shows the warning, the preview shows both buttons, and export and import
    round trip.
- [ ] **8. Sign in:**
  - A centred card on soft background shapes, with no rail or nav (Form (auth) pattern).
  - The scalloped logo, "Welcome back to the dojo", and one line on what syncing does.
  - "Continue with GitHub" (primary), an "or" divider, and "Keep using it on this device only" (outline).
  - "We only read your GitHub name and avatar."
  - It works without JS, as today.
- [ ] **9. Final scan of the whole app (after 0086 to 0088 land).**
  - List every route from `apps/web/app/**/page.tsx`. Open each one on `pnpm dev` and on a production build
    (`pnpm build && pnpm start`), against a copy of the data with seeded progress (never `data/habit.db`).
  - Check each at 375, 768, 1024, 1280 and 1440 px, in light and dark.
  - For each page, check:
    - It loads with no server error, console error or hydration warning.
    - The rail stays still and only content scrolls; split views (Practice, lesson, workspace) scroll their own areas.
    - Nothing is squeezed (no word-per-line tiles or headings), overlapped (Buddy, toasts, guest bar, FAB, nav bar) or
      scrolling sideways.
    - Card grids reflow by width; side panels hide or move as their plans say.
    - Colours follow their roles: red only for errors; nothing below 12 px; nothing above weight 600.
    - Every link, tab, filter, form and shortcut works, and forms work with JS off.
    - `ux-audit`, `viewports`, `anti-slop` and `accessibility-audit` (AA) pass.
  - Record every finding in a table here (page, width, mode, problem, severity, fixed or not). Fix clear presentation
    bugs. List anything that needs a decision under Open questions.
- [ ] **10. Tests:**
  - `lib/theme.test.ts`: `isNearDanger` (true for `#b21f1f` against `#BA1A1A`, false for `#1E6B4A`).
  - The settings render shows the warning for a near-danger primary.
  - Keep `roadmap.test.ts`, `design-tokens.test.ts`, `skeletons.test.ts` and `no-emoji.test.ts` passing.
  - Update any other render tests only where markup changed.
- [ ] **11. Docs.**
  - Rewrite `DESIGN.md` for the Expressive system: tokens, shape, type, components, layout rules and the account menu.
    Mark the Dojo version as replaced.
  - In `docs/plans/README.md`, mark 0083 and 0084 as superseded by 0085–0089 (keep their rows).

## Acceptance criteria

- [ ] Review, Quick revise, Backlog, Roadmap, Profile (and sub-pages), Settings and Sign in match their boards in light
      and dark.
- [ ] Choosing a primary near red in the theme editor shows the warning and a preview next to the danger button.
- [ ] Every route passes the step 9 scan, or its finding is listed with a reason.
- [ ] `DESIGN.md` describes the Expressive system.
- [ ] `pnpm check` passes. Nothing is pushed or released until the user has looked at it.

## Open questions

(none yet)

## Implementation notes

(implementer fills in)

## Review

(reviewer fills in)
