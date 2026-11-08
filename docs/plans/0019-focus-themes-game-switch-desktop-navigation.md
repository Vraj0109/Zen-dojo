# 0019: Focus styles and reading aids, game features switch, desktop back/forward

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-08
- **Implemented by:** Claude Code, 2026-11-08
- **Spec:** user requests 2026-11-08

## Goal

1. Styles that are easier on the eyes for long study sessions, and reading aids (a reading font, bold word starts).
2. All game features (XP, levels, streaks, freezes, badges) behind a setting that is **off by default**.
3. Going back in the desktop app without scrolling to the top: swipe, mouse buttons, keys and on-screen buttons.

## What was built

- **Styles** (`lib/theme.ts`, `globals.css`): Classic, Paper, Ocean, Terminal, and three soft low-glare palettes: **Sage**
  (green-grey), **Dusk** (slate blue-grey) and **Ember** (warm cream/brown, less blue light). Each has a light and a dark
  version. `lib/theme.test.ts` checks WCAG contrast for every style and scheme: body text at least 7:1 (the strictest
  level), secondary text at least 4.5:1, and for the three soft styles body text between 10:1 and 15:1 (strong but not the
  harsh black-on-white extreme). Accent colours are one colour each in light and dark (white text on each is at least 4.5:1).
- **Reading font:** Default (Geist), Lexend, Atkinson Hyperlegible, Serif. Loaded with `next/font/google` in `layout.tsx`.
- **Focus reading** (`lib/bionic.ts`, `app/focus-reading.tsx`): bolds the first letters of words inside elements marked
  `data-focus-reading` (lesson and article bodies, problem statements). Off by default, with two strengths. **Subtle** leaves words
  of up to three letters alone, bolds under a third of longer words and uses a semi-bold (600). **Strong** bolds about half of
  every word (700). Headings, labels, emphasis, code, formulas and form fields are never changed. (First version, which bolded
  half of every word everywhere, was reported as too distracting.) Lexend lost its extra letter spacing for the same reason.
- **Game switch:** `<html data-gamify="on">` set by the same inline script from `localStorage`; XP, level, streak, freeze,
  badges, balance and XP numbers carry the class `gamify-only` and are hidden by one CSS rule unless it is on. Progress is
  still tracked underneath. Setting lives in Profile > Settings > Appearance and reading.
- **Desktop navigation** (`apps/desktop/main.js`, `lib/navigation.js`): turns on Chromium's two-finger swipe back/forward
  (`OverscrollHistoryNavigation`), handles macOS three-finger swipe, Windows mouse side buttons and browser keys
  (`app-command`), and adds a **Go** menu with Alt+Left / Alt+Right (Cmd+[ / Cmd+] on macOS). The web UI also has Back and
  Forward buttons at the top of the sidebar (`app/history-buttons.tsx`), which stay in view while a page scrolls.

## Honest limits

- No palette is proven to improve focus. Research supports comfortable contrast (not extreme), avoiding glare and, for some
  people, warmer colours at night. The numbers above are measured; the benefit is a matter of taste, so these are options.
- Studies of bold-word-starts reading ("bionic reading") have not found a general gain in speed or comprehension. It is an
  option to try, off by default, and the Settings text says so.
- The two-finger swipe depends on the touchpad driver. On Windows Precision touchpads it should work; if it does not, the
  on-screen buttons, Alt+Left, and mouse buttons do. **Not tried on a real touchpad or in a packaged build.**
- The theme, font, focus reading and game switch are stored in the browser/app window (`localStorage`), not the database,
  so they are not in backups and are not read by the server.
- Not checked by eye: the new styles and fonts in a browser.

## Acceptance criteria

- [x] Seven styles, each in light and dark; contrast test passes for all
- [x] Game features hidden by default; shown when switched on
- [x] Back/forward: gestures wired, menu, on-screen buttons
- [x] `pnpm check` passes
- [ ] Tried on a real touchpad in the desktop app (needs the user)

## Review

(pending: run `/review-plan 0019`)
