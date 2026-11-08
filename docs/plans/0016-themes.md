# 0016: Themes (Light, Dark, System, and accent colours)

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-08
- **Implemented by:** Claude Code, 2026-11-08
- **Spec:** none

## Goal

The user picks Light, Dark or System (follow the OS) and one of five accent colours in Profile > Settings. The choice
applies at once, survives restarts, and does not flash the wrong colours while a page loads. Diagrams, code and the code
editor follow the theme.

## Context

- Colours are CSS variables in `apps/web/app/globals.css`. Dark mode today is only `@media (prefers-color-scheme: dark)`,
  so the user cannot override the OS. Code colours (`--shiki-*`) use the same media query.
- `app/diagram.tsx` reads the variables when it draws and redraws when the OS scheme changes.
- `app/code-editor.tsx` and `pre.code-block` already use variables, so they follow once the variables change.
- Other interface settings live in the `settings` table (`lib/ui-prefs.ts`), read on the server. The root layout is
  prerendered (`cacheComponents`), so it cannot read the database without making every page dynamic. The theme must be
  applied before first paint, so it is stored in the browser (`localStorage`) and applied by a tiny inline script. This
  also means the preference is per browser/Electron profile and is not part of the backup file. Say so on the settings card.

## Out of scope

- Full named palettes (Nord, Solarized), custom colour pickers, per-page themes.
- Storing the theme in the database or in backups.
- A theme switcher in the sidebar.

## Steps

- [x] **1. `apps/web/lib/theme.ts`** (no `server-only`): `THEME_MODES`, `ACCENTS` (id, label, swatch), `DEFAULT_ACCENT`,
  storage keys, `parseMode`, `parseAccent`, `resolveMode`, `THEME_INIT_SCRIPT`, and `applyTheme(mode, accent)` (writes
  `localStorage`, sets `data-mode`, `data-theme`, `data-accent` on `<html>`, fires `habit-theme-change`).
  - Done when: the unit tests in step 6 pass.
- [x] **2. `globals.css`.** Replace both `prefers-color-scheme` blocks with `:root[data-theme="dark"]`. Add
  `color-scheme`. Add one light and one dark rule per non-default accent.
  - Done when: a test finds a light and a dark rule for every non-default accent.
- [x] **3. `layout.tsx`.** `suppressHydrationWarning` on `<html>`, and the init script in `<head>`.
  - Done when: reloading with Dark saved shows no light flash.
- [x] **4. `app/theme-picker.tsx`** (client): three mode buttons and five accent swatches, using `useSyncExternalStore`
  on the `<html>` attributes. Add it to the Interface section of `profile/settings/page.tsx`.
  - Done when: choosing a mode or accent changes the page immediately and persists after reload.
- [x] **5. `app/diagram.tsx`.** Redraw when `data-theme` or `data-accent` changes (MutationObserver on `<html>`).
  - Done when: switching theme redraws open diagrams in the new colours.
- [x] **6. Tests** `apps/web/lib/theme.test.ts`.
  - Done when: `pnpm test` passes.

## Acceptance criteria

- [ ] Light, Dark and System work; System follows the OS live
- [ ] Five accents work in light and dark
- [ ] No flash of the wrong theme on load
- [ ] Diagrams, code blocks and the editor follow the theme
- [ ] `pnpm check` passes

## Open questions

None.

## Implementation notes

- Done as planned. Dark values now live under `:root[data-theme="dark"]`; the OS media query is gone, the inline script
  resolves System itself and follows the OS live. A test fails if the media query comes back or an accent loses a rule.
- Without JavaScript the app shows the light theme (the script sets the attribute). Forms still work.
- Not checked by eye: the five accents in light and dark, and diagrams redrawing after a switch. Only the markup and
  tests were checked (`pnpm check` passes, built app serves the picker and the init script).
- **Found but not changed (superseded by the update below):** the accents were later made one colour for light and dark.
  White text on them is about 4:1 to 5:1; worth a look on small badges.

- **Update 2026-11-08 (user feedback):** accents no longer change in dark mode (one colour each, same in light and dark, and the picker swatch is that colour). Added **styles** (Classic, Paper, Ocean, Terminal) that change surfaces, text, corner roundness and the font; picker cards preview them in the current light/dark choice and accent. A test keeps the preview colours equal to `globals.css`.

## Review

(pending: run `/review-plan 0016`)
