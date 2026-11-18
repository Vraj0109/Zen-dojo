# Zen Dojo design system

Status: approved for build (2026-11-19), plan 0083. Nothing in the app uses it yet. Mockups: "Zen Dojo redesign mockups"
(https://claude.ai/artifact/Da18ULMwvybAWrQ13uRXmj, private). After you approve this file, a plan in `docs/plans/` moves the app onto these tokens screen by screen.

## Direction

**Keep what works today, fix what holds it back.** The current app already has the right bones: a quiet sidebar, dark
and light modes, a green accent, flat cards and plain wording. The redesign keeps that look as the default theme
(**Dojo**) and improves hierarchy, motivation, reading comfort and speed. Structure stays calm, like Linear or Notion.
Motivation comes from progress you can feel (streak, XP bar, daily-goal ring) shown with real numbers, never from
confetti, mascots everywhere or loud gradients. Warmer palettes (Ember and others) are themes, and every token can be
changed in the custom theme.

Things we never do: purple-to-blue gradients, gradient text, glass panels, emoji as icons, three identical cards in a
row as decoration, shadows on everything, more than one accent colour on one screen.

## What changes from today's UI

Found by looking at the live site (Today, Practice, Learn, a lesson):

1. **Pages open blank for 3 to 5 seconds.** Every page shows a faded placeholder before content appears. Fix: render
   the page shell and first section at once, stream the rest, and keep skeletons only for waits over 1 second.
2. **Today shows no motivation.** No streak, XP or goal is visible; "This week" and "Week focus" are collapsed rows
   that look empty. Fix: a progress row (daily-goal ring, XP bar, streak) and open, useful week and review cards.
3. **Practice is heavy at the top.** Four all-caps stat tiles full of zeros, then five dropdowns and a separate Filter
   button. Fix: one line of stats in plain case, a search box and one Filters button (sheet on phone, popover on
   desktop), applied as you pick.
4. **Lesson lines are too long.** Text runs about 90 characters wide and the outline is collapsed. Fix: a 68-character
   column, the outline open on the right on wide screens, a clear "Mark as learned" and next-lesson link at the end.
5. **Low-contrast grey text** in captions and table cells. Fix: muted text at 4.5:1 or more on its background.
6. **The sidebar mixes jobs.** Back and forward arrows by the logo, a timer box and a large Sign in button compete with
   navigation. Fix: streak and XP under the logo, the timer only while it runs, account and sync in one compact row at
   the bottom.
7. **The guest notice floats over content.** Fix: a slim bar at the top of the content area that can be dismissed.
8. **Course cards all look the same.** Fix: a coloured subject mark, a visible progress bar and a clear next step.

## Colour

Every colour has one role. Pages use the token names (Tailwind classes such as `bg-surface`, `text-muted`), never raw
values. Contrast: body text 4.5:1 or more on its background, large text and icons 3:1 or more.

### Light (default theme "Dojo")

| Token | Value | Role |
|---|---|---|
| `background` | `#F7F7F5` | Page background |
| `surface` | `#FFFFFF` | Cards, panels, inputs, menus |
| `surface-2` | `#EFEFEB` | Sunken areas: sidebar, table header, code block frame, hover row |
| `line` | `#E4E4E0` | Borders and dividers (1px) |
| `line-strong` | `#D3D3CE` | Input borders, focused card edge |
| `foreground` | `#1A1A1A` | Main text, headings |
| `muted` | `#66665F` | Secondary text, captions, icons at rest (5.6:1 on background) |
| `primary` | `#2F7D5B` | Main buttons, links, selected nav item, focus ring (4.9:1 on white) |
| `primary-hover` | `#256A4C` | Hover and pressed state of primary |
| `primary-soft` | `#E3F0E8` | Selected nav background, primary badge background |
| `on-primary` | `#FFFFFF` | Text and icons on primary |
| `reward` | `#E8A317` | Streak flame, XP bar fill, earned badges. Decoration only, never text on light backgrounds |
| `reward-soft` | `#FDF1D6` | Background of streak and XP chips |
| `success` | `#2E7D4F` | Solved, passed tests, done tasks |
| `warning` | `#9A6210` | Due for review, slow run, near limit (4.9:1 on background; `#A86A12` was 4.1:1) |
| `danger` | `#B8322A` | Failed tests, destructive actions, errors |

### Dark

| Token | Value | Notes |
|---|---|---|
| `background` | `#111211` | Near-black, not pure black |
| `surface` | `#1A1B1A` | |
| `surface-2` | `#222322` | |
| `line` | `#2C2D2B` | |
| `line-strong` | `#3B3D3A` | |
| `foreground` | `#ECECEA` | |
| `muted` | `#9A9A94` | |
| `primary` | `#5BB98A` | Lighter so it reads on dark (6.0:1 on background) |
| `primary-hover` | `#73C69C` | |
| `primary-soft` | `#1D3328` | |
| `on-primary` | `#0B1A12` | Dark text on the light-orange button |
| `reward` | `#F2B63C` | |
| `reward-soft` | `#33280F` | |
| `success` | `#5CB884` | |
| `warning` | `#E0A23A` | |
| `danger` | `#EF6F64` | |

### Subject and difficulty colours

Used only as a small dot, a 3px left edge or a chip, never as a large fill.

| Token | Light | Dark | Role |
|---|---|---|---|
| `cat-dsa` | `#2F6FD6` | `#6EA2F0` | DSA |
| `cat-sd` | `#8A4FC9` | `#B48AE8` | System design |
| `cat-lld` | `#0F8A8A` | `#4CC2C2` | Low-level design |
| `cat-core` | `#7A6A55` | `#B8A88F` | Core CS |
| `cat-beh` | `#B7791F` | `#E3AE55` | Behavioural |
| `cat-mock` | `#2F7D5B` | `#5BB98A` | Mock interviews |
| `diff-easy` | `success` | | |
| `diff-medium` | `warning` | | |
| `diff-hard` | `danger` | | |

## Themes and the custom theme

A theme is a full set of the colour tokens above plus a font pair and a radius scale. Built-in themes:

| Theme | Feel | Background / primary |
|---|---|---|
| **Dojo** (default) | Today's look, sharpened: neutral, green | `#F7F7F5` / `#2F7D5B` |
| **Ember** | Warm paper, orange | `#FAF7F2` / `#C2481B` |
| **Ocean** | Cool blue, clear | `#F4F7FA` / `#2563B8` |
| **Dusk** | Muted violet evening | `#F7F5F9` / `#6B4FB8` |
| **Paper** | Black on cream, book-like, serif headings | `#FBF8F1` / `#1F1A14` |
| **Terminal** | Dark only, green on black, mono headings | `#0E110E` / `#4ADE80` |

Each built-in theme has a light and a dark version (Terminal is dark only).

**Custom theme** (Settings > Appearance > Custom). Start from any theme, then change any token:

- Colours: background, surface, surface-2, line, foreground, muted, primary, reward, success, warning, danger, each
  with a colour picker and a hex field, for light and dark separately.
- `on-primary` and `primary-hover` are worked out automatically (black or white text by contrast; hover 8% darker in
  light, 8% lighter in dark) but can be overridden.
- Fonts: UI font, heading font, code font. Pick from the bundled list or type any Google Font name.
- Shape: radius (Sharp 4 / Default 8 / Round 12) and density (Compact / Comfortable).
- A live preview card shows a button, a link, a card, a progress bar and body text while you edit.
- A contrast check under each text colour shows the ratio and warns below 4.5:1 (it warns; it never blocks).
- Export and import a theme as a small JSON file; it syncs to your account like other appearance settings.

## Typography

| Use | Family | Why |
|---|---|---|
| UI and body | **Figtree** | Friendly, round, very legible at small sizes; warmer than Inter or Geist |
| Headings | **Figtree** (600 to 700) | One family keeps it calm; Paper theme switches headings to **Newsreader** |
| Code | **JetBrains Mono** | Clear 0/O and 1/l, good ligature-free default for interview code |

Reading fonts in Settings (Lexend, Atkinson Hyperlegible, custom) stay and replace the UI and body family.

Scale (rem at 16px base, line height):

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `text-xs` | 12px | 16px | 500 | Labels, badges, timestamps |
| `text-sm` | 14px | 20px | 400 | Secondary text, table cells, nav items |
| `text-base` | 16px | 26px | 400 | Body and lesson text |
| `text-lg` | 18px | 28px | 600 | Card titles |
| `text-xl` | 22px | 30px | 600 | Section headings |
| `text-2xl` | 28px | 36px | 700 | Page titles |
| `text-3xl` | 36px | 44px | 700 | Big numbers (streak, XP, today's count) |

Weights in use: 400, 500, 600, 700. Lesson text max width 68 characters (`max-w-[68ch]`). Numbers that change (XP,
timers, counts) use tabular figures (`tabular-nums`).

## Spacing and layout

- Base unit 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Inside a card: 20px (16px compact). Between cards: 16px. Between page sections: 40px.
- Layout is wide (the user prefers wide pages): content area up to 1440px with a 240px sidebar; reading pages (lessons)
  centre a 68ch text column with a sticky outline on the right from 1280px up.
- Phone (under 768px): no sidebar; bottom tab bar (Today, Practice, Learn, Review, You), 16px side margins, touch
  targets at least 44px.

## Shape and depth

- Radius: `sm` 6px (badges, inputs), `md` 10px (buttons, cards), `lg` 14px (panels, dialogs), `full` (chips, avatars,
  progress bars). Custom theme can switch the whole scale to Sharp or Round.
- Depth comes from borders and surfaces first. Shadows only on things that float:
  - `shadow-sm`: `0 1px 2px rgba(31,26,20,0.06)` for raised cards on hover.
  - `shadow-lg`: `0 8px 24px rgba(31,26,20,0.12)` for menus, popovers and dialogs.
  - Dark mode uses no shadows; floating things get `line-strong` borders instead.

## Components

- **Buttons.** Primary: `primary` fill, `on-primary` text, 36px high (40px on phone), radius `md`, weight 600. Secondary:
  `surface` with a `line-strong` border, `foreground` text. Quiet: no border, `muted` text, `surface-2` on hover.
  Danger: `danger` text and border, filled only in the confirm dialog. All: 2px `primary` focus ring with 2px offset;
  disabled at 45% opacity, no hover. Labels start with a verb ("Start session", "Mark done"), never "OK" or "Submit".
- **Links.** `primary`, no underline until hover inside UI; always underlined inside lesson text.
- **Inputs.** 36px, `surface`, `line-strong` border, radius `sm`, visible label above, help or error text below in
  `muted` or `danger`. Focus: `primary` border plus ring.
- **Cards.** `surface`, 1px `line`, radius `md`, 20px padding, no shadow at rest. A card that links somewhere gets
  `line-strong` and `shadow-sm` on hover. A subject is shown with a 3px left edge in its `cat-*` colour.
- **Sidebar.** `surface-2` background, 240px wide, items 32px high with an icon and label; the selected item has
  `primary-soft` background and `primary` text and icon. Streak and XP sit at the top under the logo, account at the
  bottom.
- **Progress.** Bars are 6px high, radius `full`, `surface-2` track, `primary` fill (lessons, courses) or `reward` fill
  (XP). Rings for the daily goal: 4px stroke. Numbers next to every bar ("12 of 40").
- **Streak and XP chips.** `reward-soft` background, flame or bolt icon in `reward`, number in `foreground` 600.
- **Badges and tags.** 20px high, `text-xs` 500, radius `sm`; difficulty uses the `diff-*` colour as text on a 12%
  tinted background.
- **Tables and lists.** Rows 44px, `line` dividers, `surface-2` header and hover. Solved rows get a `success` check,
  not a coloured row.
- **Tabs.** Text tabs with a 2px `primary` underline on the selected one; no pill backgrounds.
- **Dialogs and sheets.** Radius `lg`, `shadow-lg`, 24px padding; on phone they become bottom sheets with a grab bar.
  Destructive confirms name the thing being deleted.
- **Empty states.** One line of plain text, one primary action, a small line icon. No illustrations or mascots.
- **Loading.** Nothing for waits under 100ms, inline spinner up to 1s, skeleton blocks in `surface-2` beyond that.
- **Code.** Editor and code blocks on `surface` (light) or `#0D0E0D` (dark) with JetBrains Mono 14px; the existing
  Shiki token colours are kept but checked against the new backgrounds.
- **Rewards.** On finishing a task: the check animates (150ms) and the XP chip counts up. A level up or a new badge gets
  one small toast with the badge. No full-screen confetti. All motion respects reduced-motion.

## Motion

- Durations: 120ms (hover, press), 180ms (menus, tabs), 240ms (sheets, dialogs). Easing `cubic-bezier(0.2, 0, 0, 1)`.
- Animate only opacity and transform. Under `prefers-reduced-motion`, everything becomes an instant or opacity-only change.

## Icons and imagery

- One icon set: **Lucide**, 1.75px stroke, 16px in text and nav, 20px in buttons and empty states. Icons are `muted` at
  rest and take the text colour of their context.
- No stock photos. Imagery is the content itself: diagrams, code, charts. The Buddy pet keeps its own art and stays the
  only illustrated element, in the corner, never in the layout.
- Charts use `primary`, `reward` and the `cat-*` colours; gridlines in `line`.

## Open decisions

1. Whether Paper's serif headings (Newsreader) are worth the extra font download.
2. Figma file: needs the Figma connector signed in (`/mcp`) before the mockups can be built there.
