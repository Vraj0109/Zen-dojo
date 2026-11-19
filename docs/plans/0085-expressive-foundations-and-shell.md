# 0085: Expressive redesign, part 1: tokens, fonts, shared parts and the app shell

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-20
- **Implemented by:** (implementer fills in)
- **Spec:** the "Expressive (Google style)" page of the mockup canvas
  (https://claude.ai/artifact/Da18ULMwvybAWrQ13uRXmj, private to the user; ask the lead for screenshots if you cannot
  open it). Boards used here: "Expressive system", "Part: navigation rail", "Account menu", "Part: phone navigation bar",
  "Today" (shell only). `docs/design-review-2026-11-19.md` lists what was wrong before.

## Goal

The user approved a new look for the whole app: Material 3 Expressive, the way Google might build Zen Dojo. It is
playful but calm: Google Sans, a tonal green palette, pill buttons, big rounded cards, scalloped badges and a nav rail.
This plan lays the foundations every other part uses: tokens, fonts, shared components and the app shell. The shell is a
fixed frame: the rail never scrolls, only the page content does. Plans 0086 to 0089 then move each screen onto it.

This is part 1 of 5 and must land first:
- **0085** (this plan): foundations and shell.
- **0086:** Practice.
- **0087:** problem workspace.
- **0088:** Today and Learn.
- **0089:** Review, profile, settings, sign in, and the final scan.

## Context

- **Plans 0083 and 0084:** 0083 (Dojo design system) and 0084 (fixes and site scan) are built.
  - 0084's changes are still uncommitted in the working tree. Ask the user to commit them before you start; don't
    commit them yourself.
  - This plan replaces 0083's look (Figtree, 6/10/14 px radii, sidebar). It keeps 0083's token names, theme ids and the
    custom theme format.
- **Tokens:**
  - `apps/web/app/globals.css` defines `--background`, `--surface`, `--surface-2`, `--line`, `--line-strong`,
    `--foreground`, `--muted`, `--primary`, `--primary-hover`, `--primary-soft`, `--on-primary`, `--reward`,
    `--reward-soft`, `--success`, `--warning`, `--danger`, `--cat-*` and `--r-sm/md/lg`.
  - They are mapped to Tailwind in `@theme inline`.
  - `apps/web/lib/theme.ts` has `THEME_TOKENS`, `STYLES` (`classic` shown as Dojo, plus `paper`, `ocean`, `terminal`,
    `sage`, `dusk`, `ember`) with light and dark values for every token, `ACCENTS`, `FONTS`, the boot script
    `THEME_INIT_SCRIPT` and `applyTheme`.
  - 0084 added a guard so `--primary` never resolves to the danger colour.
- **Fonts:** `apps/web/app/layout.tsx` loads Figtree, JetBrains Mono, Lexend and Atkinson with `next/font/google`.
  Google Sans is available in this Next version (`Google_Sans` in `next/font/google`, checked in
  `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`).
- **Shell:**
  - `app/shell.tsx` holds the layout, phone header, the desktop top bar with back/forward, and theme sync.
  - `app/nav.tsx` has the sidebar, the nav items and `NavFooterLinks`.
  - `app/components/account-popover.tsx` is the account menu. Its items are: account header, Account and devices,
    Settings, Profile and stats, Admin (admins only), Upload this device's progress, Sign out, plus `SyncStatusPill`.
  - `app/components/sync-status.tsx` is the sync status.
  - The phone tab bar lives in `shell.tsx`/`nav.tsx`.
- **Shared UI:** `app/ui.tsx` (`buttonClass`, `Stat`, `Difficulty`, `StatusMark`, `ProgressBar`, `PageMain`, chips),
  `app/learn-blocks.tsx`, `app/tabs.tsx`, `app/section-tabs.tsx`, `app/skeletons.tsx`.
- **Conventions (AGENTS.md):**
  - Next 16 with `cacheComponents`.
  - Forms work without JS.
  - No `Date.now()`/`Math.random()` in render.
  - No emoji; `app/no-emoji.test.ts` checks this.
  - Tests go next to the code.
  - Targeted tests only while working; `pnpm check` once at the end.
  - Never touch `data/habit.db`.

### The Expressive tokens (from the "Expressive system" board)

| Token | Light | Dark | Role |
|---|---|---|---|
| `background` | `#F6FBF5` | `#0F1512` | page canvas |
| `surface` | `#FFFFFF` | `#1B211E` | cards, panes |
| `surface-2` | `#EBF0EA` | `#252B28` | search fields, tracks, segmented controls |
| `line` | `#DEE5DD` | `#2F3631` | card borders, row dividers |
| `line-strong` | `#C0C9C1` | `#404943` | input and chip outlines |
| `outline` (new) | `#707971` | `#8A938B` | outlined buttons |
| `foreground` | `#171D19` | `#DEE4DE` | text |
| `muted` | `#404943` | `#BFC9C1` | secondary text |
| `primary` | `#1E6B4A` | `#8FD8B0` | filled buttons, links, active state |
| `on-primary` | `#FFFFFF` | `#003822` | text on primary |
| `primary-hover` | `#185A3E` | `#A6E3C2` | hover on primary |
| `primary-container` (new) | `#B6F1CF` | `#0F5236` | hero cards, "next up" rows |
| `on-primary-container` (new) | `#00210F` | `#ABF4CB` | text on it |
| `primary-soft` | `#D2E8D9` | `#334B3D` | tonal buttons, selected nav pill, chips |
| `on-primary-soft` (new) | `#0D1F15` | `#D2E8D9` | text on it |
| `reward-soft` | `#FFDDB2` | `#6A3C00` | focus FAB, streak, XP, boss cards (tertiary) |
| `on-reward-soft` (new) | `#2C1600` | `#FFDDB2` | text on it |
| `reward` | `#8B5000` | `#FFB95C` | XP numbers, warm icons |
| `success` | `#1E6B4A` | `#8FD8B0` | passed |
| `warning` | `#9A5B00` | `#FFB95C` | medium difficulty, due |
| `danger` | `#BA1A1A` | `#FFB4AB` | errors and failed cases only |
| `danger-soft` (new) | `#FFDAD6` | `#93000A` | error boxes |
| `on-danger-soft` (new) | `#410002` | `#FFDAD6` | text on them |

Subject tones (`--cat-*`, each with an `on-` partner):

| Subject | Light background / text | Dark background / text |
|---|---|---|
| DSA | `#D6E3FF` / `#001B3E` | `#284777` / `#D6E3FF` |
| System design | `#F0DBFF` / `#2A0E45` | `#56397A` / `#F0DBFF` |
| LLD | `#BCEBEE` / `#002022` | `#1D4E51` / `#BCEBEE` |
| Core CS | `#D2E8D9` / `#0D1F15` | `#334B3D` / `#D2E8D9` |
| Behavioural | `#FFDDB2` / `#2C1600` | `#6A3C00` / `#FFDDB2` |

**Shape:**
- Radii: `r-sm` 10 px (chips, small boxes), `r-md` 16 px (inputs, rows), `r-lg` 24 px (cards, panes), `r-xl` 32 px (hero
  cards), `full` (buttons, pills, search).
- Buttons are pills: 40 px tall (small) or 44–48 px (normal).
- Cards: 1 px `line` border in light, no border in dark; no shadow at rest.
- Shadow only on menus and sheets: `0 8px 28px` at alpha 0.07 in light, 0.4 in dark.

**Type:**
- Google Sans 400/500/600; never above 600.
- Sizes: body 16, secondary 14, meta 12 minimum, h2 18–22, page titles 36 (28 on phone), hero numbers 40.
- Line height 1.2 for headings and 1.5 for body.
- Code: JetBrains Mono 400/500.

**Decoration:**
- Scalloped badge shape (SVG path below) for streak, level and badges.
- Wavy progress line on the XP bar.
- Pattern tiles use small varied shapes (rounded square, circle, leaf corners) in the subject tone.

The scalloped badge path:
`M50 4 61 13 75 10 80 24 94 30 90 44 98 56 87 66 88 80 74 83 66 95 52 90 38 96 30 84 16 81 15 67 4 57 12 44 8 30 22 24 27 10 41 12z`
(viewBox `0 0 100 100`).

## Out of scope

- Restyling individual pages (plans 0086 to 0089). Pages keep working on the new tokens, with their old layout, until
  their plan lands.
- Any change to data, sync, the judge, server actions or AI features.
- New themes. The existing theme ids keep working; this plan only retunes their values.
- Mobile apps (dropped), Figma files.

## Steps

- [ ] **0. Load the UI skills first (required).** Before any change, load and follow these skills:
  - VectorLab: `ux-audit`, `viewports`, `anti-slop`, `page-patterns`, `spacing`, `typography`, `colour-palette`,
    `surfaces`, `icon-buttons`, `keyboard`, `motion`, `reduced-motion`.
  - Others: `frontend-design`, `ui-review`, `accessibility-audit`.

  Antigravity: use the copies in `.agents/skills/` and follow `.agent/rules/ui-work.md`. Write which skills you loaded in
  Implementation notes, and run `ux-audit` on the shell when you finish.
  - Done when: the notes list the skills and the audit result.
- [ ] **1. Tokens.** In `apps/web/app/globals.css`:
  - Set the Dojo (`classic`) light and dark values from the table above.
  - Add the new tokens and their Tailwind mappings: `bg-primary-container`, `text-on-primary-container`,
    `text-on-primary-soft`, `border-outline`, `text-on-reward-soft`, `bg-danger-soft`, `text-on-danger-soft`, and
    `bg-cat-dsa` / `text-on-cat-dsa` and the same for the other subjects.
  - Set radii `--r-sm: 10px`, `--r-md: 16px`, `--r-lg: 24px`, `--r-xl: 32px`, mapped to `rounded-sm/md/lg/xl`.
  - Add the menu shadow `--elev-menu`.
  - Retune the Shiki colours so comments pass 4.5:1 on the new code backgrounds.
  - Done when: the app builds and the token test (step 9) passes.
- [ ] **2. Themes keep working.** In `apps/web/lib/theme.ts`:
  - Add the new tokens to `THEME_TOKENS`.
  - `classic` (Dojo) uses the table values.
  - For `paper`, `ocean`, `terminal`, `sage`, `dusk` and `ember`, add a pure `deriveTones(style)` that computes each
    missing new token from that style's `primary`, `background` and `danger`. Mix toward the background (about 75% for
    `primary-container` and 85% for `primary-soft`), then pick black or white text on it by contrast. Existing tokens
    keep their values.
  - Accents keep overriding `primary` (and, through `deriveTones`, its container and soft tones).
  - The boot script sets every token before paint, so there is no flash.
  - The 0084 guard (primary never equals danger) stays.
  - Done when: each theme in Settings repaints every token in light and dark with no flash on reload, and old stored
    theme ids load.
- [ ] **3. Fonts.** In `apps/web/app/layout.tsx`:
  - Load `Google_Sans` (weights 400, 500, 600, `display: "swap"`) as `--font-google-sans` and point `--font-sans` at it.
  - Keep JetBrains Mono for `--font-mono`.
  - Keep Lexend, Atkinson, serif and the custom font as reading-font choices.
  - In `FONTS` the default label becomes "Google Sans (default)".
  - Remove Figtree once nothing uses it (search for `--font-figtree`).
  - Cap weights at 600: replace `font-bold`/`font-extrabold` in `app/**` with `font-semibold`.
  - Done when: body text renders in Google Sans, `grep -rn "font-bold\|font-extrabold" apps/web/app` finds nothing, and
    the reading-font options still switch.
- [ ] **4. Shared components** in `app/ui.tsx` and friends, matching the "Expressive system" board:
  - `buttonClass(kind, size)`:
    - Kinds: `primary` (filled), `tonal` (`primary-soft`), `outline` (`outline` border, `primary` text), `quiet`
      (text only), `danger`, `reward` (tertiary).
    - All are pills, 40 px (sm) or 48 px (md) tall, with a visible focus ring and a disabled state.
    - Keep the old kind names working as aliases: `secondary` becomes `tonal`.
  - Cards are `rounded-lg`, `bg-surface`, with a `line` border in light only.
  - Hero cards are `rounded-xl` on `primary-container`.
  - Inputs and search fields are pills on `surface-2`, 48 px tall, with a visible label (sr-only label for search with a
    magnifier icon).
  - Filter chips are 36 px tall, `r-sm`, outlined; when selected they use `primary-soft`.
  - `Tabs` and `SectionTabs` become a segmented pill group on `surface-2`, with the selected tab in `primary-soft`.
  - `ProgressBar` is a 10 px pill track on `surface-2` with the fill in `primary`, and a number beside it.
  - Add a `WavyProgress` variant for XP: an SVG wave for the done part and a straight line for the rest.
  - Add a `Scallop` component (`size`, `fill`, children centred) using the badge path above. Use it for streak, level
    and badges.
  - `Difficulty` text colours: easy `success`, medium `warning`, hard `danger`.
  - `StatusMark`: done is a filled `primary` circle with a check; due is a `reward-soft` circle; not started is a 2 px
    `line-strong` ring.
  - `SubjectShape` (new): a 40–44 px rounded shape in the subject tone (DSA rounded square, SD circle, LLD leaf, core
    soft square, behavioural reversed leaf) with an icon. Used in task rows and queues.
  - Skeletons use `surface-2` blocks with the new radii.
  - Done when: `/dev/components` (from 0083) shows every component in light and dark and matches the board.
- [ ] **5. App shell: fixed frame, rail, scrolling content.** In `app/shell.tsx` and `app/nav.tsx`:
  - **Frame:** at `md` and up, the root is `flex h-dvh overflow-hidden`, with a 96 px rail on the left and a `<main>`
    that is the only scroll area (`flex-1 min-w-0 overflow-y-auto`).
    - Printing must still show everything: `print:h-auto print:overflow-visible`.
    - Below `md`, the window scrolls as today and the phone nav bar is fixed at the bottom.
  - **Rail, top to bottom:**
    - The "ZD" logo, a 40 px rounded square in `primary`.
    - The focus FAB: 56 px, `rounded-[18px]`, `reward-soft`, play icon. It starts a focus session using the existing
      timer action. While a timer runs it shows the countdown (`mm:ss`) instead, so the old timer box goes.
    - Five items: Today, Practice, Learn, Review (with a count badge, 12 px text), Roadmap. Each is an icon in a
      56×32 px pill (selected: `primary-soft`, filled icon) with a 12 px label underneath.
    - At the very bottom (`mt-auto`, 24 px from the edge): the avatar button, which opens the account menu (step 6).
  - **Top bar:** desktop back/forward arrows move from the sidebar to a slim row at the top of `<main>`, left aligned,
    44 px targets. Keep this row only if the arrows are used today; otherwise drop it and note why.
  - **Phone nav bar (below `md`):** five items: Today, Practice, Learn, Review, You. "You" opens `/profile` and is
    selected on profile and settings pages. Use the same pill style, 80 px tall plus the safe-area inset.
  - Remove the old sidebar markup and anything only it used (streak/XP chips in the sidebar now live on Today).
  - Done when: on every page at 1280 px the rail stays still while the content scrolls, the avatar sits at the bottom of
    the window, and at 390 px the nav bar is at the bottom and content is never hidden under it.
- [ ] **6. Account menu.** Rewrite `app/components/account-popover.tsx` as the menu on the "Account menu" board.
  - **Trigger:** the rail avatar.
    - 40 px circle in `reward-soft` with the user's initial or GitHub avatar, inside a 48 px button.
    - A 12 px status dot at the bottom-right shows sync state from `sync-status.tsx`: `primary` for synced, `warning`
      for pending, `danger` for error. Hide the dot for guests.
  - **Menu:**
    - Placement: opens to the right of the rail, anchored to the bottom, 320 px wide, `rounded-[28px]`, `surface`,
      menu shadow.
    - Keyboard: `role="menu"`, arrow keys move between items, Esc closes, focus returns to the avatar, a click outside
      closes.
    - Contents, top to bottom:
      - Header: avatar, "Signed in with GitHub" (or "Administrator"), "Level N · X XP".
      - Sync row on `primary-soft`: "Synced with the web app · 2 min ago", from the existing sync status. Pending and
        error states use their own words.
      - Profile and stats.
      - Account and devices, with the sub-line "Desktop app, web, extension".
      - Settings.
      - Admin (admins only).
      - Upload this device's progress (existing action, with its progress text as the sub-line).
      - Keyboard shortcuts, with a `?` key hint. It opens the sheet from step 7.
      - Theme: a Light / Dark / System segmented control. It writes the same setting as Settings, so it syncs through
        `appearance_prefs`.
      - Sign out (existing POST form to `/auth/logout`, works without JS).
  - **Guests:** the menu shows "Not signed in", a "Sign in to sync" primary button (link to `/login`), Settings,
    Keyboard shortcuts and Theme.
  - **Phone:** the same items appear as a section at the top of `/profile` (the "You" tab), not as a popover.
  - Done when: every item works with the keyboard, sign out works with JS off, and the theme switch changes the theme
    and still holds after a reload on another device.
- [ ] **7. Keyboard shortcuts sheet.** New `app/components/shortcuts-sheet.tsx`.
  - It is a dialog that lists shortcuts grouped as "Everywhere" (`?` show this list, `Esc` close) and "Problem
    workspace" (filled in by plan 0087).
  - Open it with `?` when focus is not in a text field, or from the account menu.
  - Show the Mac key names (Cmd) when `navigator.platform`/`userAgentData` says macOS, and Ctrl otherwise. Work this out
    in an effect, not during render.
  - Export a `SHORTCUTS` list from `app/shortcuts.ts` so 0087 adds its entries in one place.
  - Done when: `?` opens the sheet on any page, and Esc closes it and returns focus.
- [ ] **8. Responsive rules, written once.**
  - Add a short "Layout rules" comment block to `globals.css`, and the matching utilities:
    - **Card grids:** use `grid-template-columns: repeat(auto-fill, minmax(min(100%, Npx), 1fr))`. Add
      `grid-auto-cards-200/240/300` utilities in `@theme` or `@utility`. Never a fixed 3 or 4 columns.
    - **Side panels** (jump lists, outlines, file trees, progress asides) hide or move by the page's own width using
      container queries. `<main>` gets `container-type: inline-size` (`@container` in Tailwind v4), so pages use
      `@max-[1260px]:hidden` and similar.
    - **Text:** nothing below 12 px; `max-w-[70ch]` for prose.
    - **Targets:** 44 px minimum.
    - **Overflow:** no horizontal page scroll at 375 px.
    - **Lists:** no pagination anywhere. Long lists are one scroll area, with `content-visibility: auto` on rows when
      there are more than about 100.
  - Done when: the utilities exist and the comment block is there.
- [ ] **9. Tests.**
  - `apps/web/app/design-tokens.test.ts`:
    - Every token in the table exists in `globals.css` for light and dark.
    - Text pairs (`foreground`, `muted`, `on-*`) meet 4.5:1 on their backgrounds.
    - `primary` is never equal to `danger`.
  - `apps/web/lib/theme.test.ts` (extend):
    - Every style returns every token after `deriveTones`.
    - `classic` still loads.
    - Old custom themes parse.
    - `deriveTones` gives text that passes 4.5:1.
  - A shell render test (or extend an existing one): the rail has five links, the avatar button has `aria-haspopup`, and
    the phone nav bar has five links including You.
  - Keep `skeletons.test.ts` and `no-emoji.test.ts` passing.
  - Done when: these targeted tests pass with `pnpm exec vitest run <file>`.

## Acceptance criteria

- [ ] Every page uses Google Sans and the tonal green palette, in light and dark. Other themes still work and look
      finished, with no missing tokens.
- [ ] On desktop the rail never scrolls; the avatar sits at the bottom of the window on every page; only the content
      scrolls.
- [ ] Clicking the avatar opens the account menu with every item listed in step 6, and all of them work. The sync dot
      shows the real sync state.
- [ ] `?` opens the shortcuts list from any page.
- [ ] Phone (390 px): the nav bar has Today, Practice, Learn, Review, You; nothing is hidden behind it; no sideways
      scroll.
- [ ] No text below 12 px and no weight above 600.
- [ ] `pnpm check` passes.

## Open questions

(none yet)

## Implementation notes

(implementer fills in)

## Review

(reviewer fills in)
