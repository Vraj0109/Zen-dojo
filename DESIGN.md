# Zen Dojo Design System: Material 3 Expressive

Status: Implemented (plans 0085–0089). Supersedes and replaces the 0083 Dojo specification.
Reference: "Expressive (Google style)" canvas boards (`docs/mockups/expressive/`).

---

## 1. Direction and Principles

The Zen Dojo design system is built on **Material 3 Expressive** principles adapted for a local-first software engineering interview preparation platform:

1. **Focus and Calm**: Warm neutral canvases (`#F6FBF5` light, `#0F1512` dark) paired with tonal forest greens (`#1E6B4A` light, `#8FD8B0` dark) provide high contrast without visual fatigue during multi-hour study sessions.
2. **Intentional Hierarchy**: Expressive rounded shapes (10px to 32px radii and full pills), distinct tonal containers, and scalloped badge badges establish clear visual anchors without unnecessary borders or heavy drop shadows.
3. **Purposeful Color**: Color conveys meaning. Primary green indicates interactive progress and positive actions; reward tones indicate XP and streaks; warning indicates review urgency; danger is strictly reserved for errors and destructive actions (guarded so primary can never collide with danger).
4. **Fluid Responsiveness**: Container-query-driven layouts (`@container`) and responsive card grids (`repeat(auto-fill, minmax(min(100%, Npx), 1fr))`) ensure seamless flow from phone (375px) through large monitors (1440px+).

---

## 2. Color System

Every color has an explicit semantic role. The design system defines 23 core theme tokens plus 5 paired subject tokens. Tokens map directly to Tailwind CSS utility classes via CSS custom properties.

### 2.1 Core Tokens (Default Theme "Dojo")

| Token | Light | Dark | Role |
|---|---|---|---|
| `background` | `#F6FBF5` | `#0F1512` | Page canvas background |
| `surface` | `#FFFFFF` | `#1B211E` | Cards, panels, active tab items |
| `surface-2` | `#EBF0EA` | `#252B28` | Segmented control tracks, search bars, sunken areas |
| `line` | `#DEE5DD` | `#2F3631` | Subtle card borders in light mode; section dividers |
| `line-strong` | `#C0C9C1` | `#404943` | Input outlines, chip borders, focused edges |
| `outline` | `#707971` | `#8A938B` | Outlined button borders and inactive icon strokes |
| `foreground` | `#171D19` | `#DEE4DE` | High-emphasis body text, headings |
| `muted` | `#404943` | `#BFC9C1` | Secondary text, timestamps, captions (>= 4.5:1) |
| `primary` | `#1E6B4A` | `#8FD8B0` | Filled buttons, active links, progress fills |
| `primary-hover` | `#185A3E` | `#A6E3C2` | Hover and pressed state for primary elements |
| `primary-container` | `#B6F1CF` | `#0F5236` | Hero cards, "next up" rows, Continue pills |
| `on-primary-container` | `#00210F` | `#ABF4CB` | Text and icons on primary-container |
| `primary-soft` | `#D2E8D9` | `#334B3D` | Tonal buttons, selected nav pill, selected chips and tabs |
| `on-primary-soft` | `#0D1F15` | `#D2E8D9` | Text on primary-soft |
| `on-primary` | `#FFFFFF` | `#003822` | High-contrast text on primary filled buttons |
| `reward` | `#8B5000` | `#FFB95C` | XP numbers, warm icons |
| `reward-soft` | `#FFDDB2` | `#6A3C00` | Focus FAB, streak, XP chips, boss cards (tertiary) |
| `on-reward-soft` | `#2C1600` | `#FFDDB2` | Text on reward-soft |
| `success` | `#1E6B4A` | `#8FD8B0` | Passed cases, easy difficulty |
| `warning` | `#9A5B00` | `#FFB95C` | Medium difficulty, due |
| `danger` | `#BA1A1A` | `#FFB4AB` | Compilation errors, test failures, deletions |
| `danger-soft` | `#FFDAD6` | `#93000A` | Error boxes (compile errors, failed runs) |
| `on-danger-soft` | `#410002` | `#FFDAD6` | Text on danger soft banners |

### 2.2 Subject Category Tokens

Subject categories use balanced pastel tones in light mode and deep saturated tones in dark mode:

| Subject | Light Tone (`bg-cat-*`) | Light Text (`text-on-cat-*`) | Dark Tone (`bg-cat-*`) | Dark Text (`text-on-cat-*`) |
|---|---|---|---|---|
| **DSA** | `#D6E3FF` | `#001B3E` | `#284777` | `#D6E3FF` |
| **System Design** | `#F0DBFF` | `#2A0E45` | `#56397A` | `#F0DBFF` |
| **Low-Level Design** | `#BCEBEE` | `#002022` | `#1D4E51` | `#BCEBEE` |
| **Core CS** | `#D2E8D9` | `#0D1F15` | `#334B3D` | `#D2E8D9` |
| **Behavioural** | `#FFDDB2` | `#2C1600` | `#6A3C00` | `#FFDDB2` |

---

## 3. Typography

- **Primary UI & Headings**: **Google Sans** (weights 400, 500, 600).
- **Rule**: Never use font weights above 600 (`font-bold` and `font-extrabold` are disallowed).
- **Code & Numbers**: **JetBrains Mono** (400, 500) for editor panes, test cases, and memory/runtime statistics.
- **Reading Options**: Users can choose Lexend, Atkinson Hyperlegible, or Custom font in Settings.

### Type Scale

| Size Token | Font Size | Line Height | Typical Usage |
|---|---|---|---|
| `text-xs` | 12px (0.75rem) | 16px | Badges, kicker captions, keyboard hints |
| `text-sm` | 14px (0.875rem) | 20px | Subtitles, metadata, secondary body |
| `text-base` | 16px (1.0rem) | 24px | Default body copy, form inputs, button labels |
| `text-lg` | 18px (1.125rem) | 28px | Sub-headings, card titles |
| `text-xl` | 20px (1.25rem) | 28px | Section headings |
| `text-2xl` | 24px (1.5rem) | 32px | Sub-page headers |
| `text-3xl` | 32px (2.0rem) | 38px | Main page titles (phone: 24–28px) |
| `text-4xl` | 40px (2.5rem) | 48px | Stat hero numbers, daily countdowns |

Prose text is strictly capped at `max-w-[70ch]` for reading comfort.

---

## 4. Shape and Elevation

The Expressive shape system relies on progressive radii and pill buttons:

- `r-sm` (`10px` / `rounded-sm`): Filter chips, badges, small control boxes.
- `r-md` (`16px` / `rounded-md`): Text inputs, row items, standard dialogs.
- `r-lg` (`24px` / `rounded-lg`): Problem workspace panes, standard cards.
- `r-xl` (`32px` / `rounded-xl`): Hero cards, login container, major sheets.
- `full` (`9999px` / `rounded-full`): All action buttons, segmented pill selectors, search inputs, status dots.

### Elevation & Borders
- Cards in light mode have a 1px border using `line` (`#DEE5DD`).
- Cards in dark mode have **no borders** (`border-0`), allowing the contrast between `background` (`#0F1512`) and `surface` (`#1B211E`) to define depth naturally.
- Menus and popovers use `var(--elev-menu)`: `0 8px 28px rgba(0, 0, 0, 0.07)` in light mode, `0 8px 28px rgba(0, 0, 0, 0.40)` in dark mode.

### Decorative Elements
- **Scallop Badge**: A 24-point scalloped star SVG path (`M50 4 61 13 75 10...`) used for streak counters, level badges, and achievements.
- **Wavy Progress Line**: An undulating SVG progress indicator for the XP bar.
- **Subject Shapes**: Distinct rounded geometric tiles (rounded square, leaf corner, pill, circle) identifying study categories.

---

## 5. Shell and Navigation Layout

1. **Desktop Shell (>= 768px)**:
   - Fixed **96px Navigation Rail** docked on the left: ZD logo, the focus FAB (shows the countdown while a session runs), the five items, and the avatar at the bottom.
   - The frame never scrolls (`html, body { overflow: clip }` from md up); `<main>` is the only scroll area and an inline-size container, so pages size side panels by the content width with `@min-[…]`/`@max-[…]` (thresholds exclude the rail).
   - The rail has **no right border line**, blending directly into the canvas background.
   - 5 primary destinations: Today, Practice, Learn, Review, Roadmap (or Backlog/Revise).
   - Bottom avatar button with sync status dot (green=synced, amber=syncing, red=error).
   - Clicking the avatar opens the **Account Popover** menu (profile, settings, shortcuts, theme toggle, sync options, sign out).
   - Content area has no artificial desktop top bar header (`HistoryButtons` removed), maximizing vertical viewing space.
   - Page content (`PageMain`) is wide: up to 1360px, centred. `narrow` (896px) is only for forms; `full` is for pages that manage their own scroll areas (Practice, the workspace).
2. **Phone Shell (< 768px)**:
   - Top slim bar with app logo and quick account access.
   - Bottom **Navigation Bar** with 5 equal tabs (Today, Practice, Learn, Review, You).
   - Account settings and profile menu items are embedded directly into the "You" tab.
3. **Workspace Focus Shell** (`/dsa/[id]`, pack problems):
   - DSA problem workspace and "Your classes" IDE switch into full-viewport layout (`h-screen overflow-hidden`).
   - Dedicated 56px (`h-14`) top bar on `background` containing:
     - 44px round back button on `surface`.
     - Kicker and problem title with difficulty badge.
     - 40px rounded-full layout switcher pill button group.
     - 44px Run (tonal: `primary-soft`) and Submit (`primary`) pills with key hints (Ctrl ' and Ctrl Enter; Cmd on macOS).
     - 44px round keyboard shortcuts button (`?`).
   - Panes are `surface` with `rounded-[24px]` corners and 8px gaps on `background`. The workspace follows the current theme (the board shows dark, but dark is not forced). Under 980px the panes stack in one column.

---

## 6. Theme Engine & Near-Danger Guard

- **Supported Themes**: Dojo (default green), Paper (high-contrast warm), Ocean (blue), Terminal (dark monospace green), Sage (muted green), Dusk (violet), Ember (terracotta).
- **Automated Palette Derivation**: Themes automatically calculate expressive companion tokens (`primary-container`, `primary-soft`, `on-*`) using `derivePalette` / `deriveTones`.
- **Near-Danger Guard**: If a user selects a custom primary color whose hue is within 25° of the danger color (`#BA1A1A`) and saturation > 40%, the theme editor displays a `danger-soft` warning banner and renders a side-by-side preview with the destructive "Delete" action to prevent deceptive or ambiguous UI states.

---

## 7. Responsive Rules

- **Card grids** never use a fixed column count: `repeat(auto-fill, minmax(min(100%, Npx), 1fr))` (`grid-auto-cards-200/240/300`), or `auto-fit` when a row must stretch to the width.
- **Side panels** (group list, lesson list, outline, progress aside) show and hide by the content width with container queries on `<main>`, so in-between window widths never squeeze the middle column. Practice: group list from 1160px, aside from 920px. Lessons: lesson list from 780px, outline from 1040px (an "Outline" button opens it below that). Workspace: panes stack under 980px.
- **375px (phone)**: one column, the phone nav bar at the bottom (content padded above it), no sideways page scroll, 44px targets.
- **768px and up**: the rail and the fixed frame.
- **Text**: nothing below 12px, nothing above weight 600, prose capped at `max-w-[70ch]`.
- **Lists**: no pagination anywhere; long lists are one scroll area with `content-visibility: auto` rows.
