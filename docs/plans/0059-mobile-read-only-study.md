# 0059: Study on your phone (read-only mode, installable web app, phone navigation)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (implementer fills in)
- **Spec:** builds on 0058 (hosted web app); a native app is a later step (see the end)
- **Estimate at this project's pace:** one round (4 to 6 hours). Needs plan 0058 deployed to be useful on a real
  phone, but can be built and tested at phone width before that.

## Goal

On a phone you can read problems, hints, solutions, your saved code and past submissions, lessons, your plan and your
notes, and tick plan tasks. You **cannot** run code or submit. It installs to the home screen like an app. No App Store
or Play Store account is needed for this plan.

## Context (verified)

- The shell has a compact mode (`apps/web/app/shell.tsx`, `shell-compact`) with a menu drawer, history buttons, Zen
  toggle and a sync pill. It has **no account button** on phones (a known gap listed in the 0.7.1 release notes).
- Nav items live in `apps/web/app/nav.tsx` (Today, Practice, Learn, Review; Profile is secondary).
- Problem page workspace: `apps/web/app/judge-workspace.tsx` (editor, Run, Submit), `apps/web/app/dsa/[id]/page.tsx`,
  notes form `apps/web/app/notes-form.tsx`, LLD "Your classes" editor `apps/web/app/components/project-editor.tsx`.
- Past runs are stored in `solution_runs`; saved code and notes in `problem_notes`.
- Reader mode is a **comfort mode, not security**: a cookie can be edited by the user. Real protection against running
  code on the hosted server is plan 0058 step 6.

## Design (decided)

- **Reader mode** = cookie `zd_reader=1` (`SameSite=Lax`, 1 year, set from a Settings toggle and suggested once on a
  narrow screen: "Study mode on this phone: read-only, no Run"). A helper `lib/reader-mode.ts` `isReaderMode()` reads it
  on the server (cookies are request-time data: use it inside the async components that already call `connection()`).
- In reader mode: Run, Submit, Check, Reset and "Mark solved" controls are not rendered; code editors render
  **read-only** (editor `readOnly`/`editable={false}` prop) showing the saved code; "Your classes" shows the files as
  read-only tabs; notes stay **editable as plain text** (decided default; change in one place `READER_NOTES_EDITABLE`).
  Hints, solutions, test cases, statements, past submissions and lessons all show.
- **Installable web app:** `apps/web/app/manifest.ts` (Next metadata route) with name "Zen Dojo", `display: "standalone"`,
  theme/background colours from the existing tokens, icons from `docs/branding` (192, 512, maskable), plus the
  `apple-touch-icon` metadata. A tiny service worker `apps/web/public/sw.js` caches only the offline fallback page
  `app/offline/page.tsx` and static assets; it must never cache API or authenticated HTML.
- **Phone navigation:** below `md` show a fixed bottom tab bar (Today, Practice, Learn, Review, You) built from the
  same `nav.tsx` data, and add an **account button** (avatar) to the compact top bar that opens the existing
  `AccountPopover` content. Pages get bottom padding so the bar never covers content.

## Out of scope

- A native iOS/Android app (below); push notifications; offline editing; any code execution on phones; changing
  desktop layouts.

## Steps

Targeted tests only; check visually at 390 x 844 in the built-in browser (resize preset "mobile") against a copy of the
database. Local commits, explicit paths, no push, no attribution.

- [ ] **1. Reader mode core.** `apps/web/lib/reader-mode.ts` (`READER_COOKIE`, `isReaderMode()`, `setReaderModeAction`
  in `app/actions.ts`), a Settings toggle in `app/profile/settings/page.tsx`, and a one-time dismissible suggestion on
  narrow screens (client component using `matchMedia`, remembered in `localStorage` with try/catch).
  - Done when: `pnpm exec vitest run apps/web/lib/reader-mode.test.ts` passes (cookie parse, default off, toggle).
- [ ] **2. Apply it to the problem and LLD pages.** In `judge-workspace.tsx`, `app/dsa/[id]/page.tsx`,
  `app/study/[area]/[id]/page.tsx`, `notes-form.tsx`, `project-editor.tsx`: hide Run/Submit/Check/Reset/Mark solved,
  make editors read-only, keep notes editable, keep solutions and hints. Pass a single `readOnly` prop down; do not
  scatter cookie reads.
  - Done when: with the cookie set, no Run/Submit control exists in the DOM on a DSA page, an LLD page and a design
    page (check with `find` in the browser), and the saved code is visible and not editable.
- [ ] **3. Phone navigation and account button.** `apps/web/app/nav.tsx` (export the items for reuse),
  new `apps/web/app/components/bottom-nav.tsx` (shown below `md` only, `aria-current` for the active tab),
  `shell.tsx` compact bar gets an account button using `AccountPopover` (if the popover assumes the sidebar, add a
  `compact` prop; do not fork it).
  - Done when: at 390 px width you can reach Today, Practice, Learn, Review and Account without the drawer, and the bar
    covers no content.
- [ ] **4. Installable app.** `app/manifest.ts`, icons under `apps/web/public/icons/`, metadata for apple touch icon
  in `app/layout.tsx`, `public/sw.js` registered from a small client component (register only in production),
  `app/offline/page.tsx`.
  - Done when: Lighthouse-style checks pass in the browser's Application panel (manifest valid, installable); going
    offline shows the offline page instead of a browser error; authenticated pages are never served from the cache.
- [ ] **5. Phone layout pass.** At 390 px wide check Today, `/dsa`, a problem page, `/study/sd`, a lesson, Review and
  Account: no horizontal scroll, tap targets at least 40 px, filters usable (plan 0053's dropdowns), long titles truncate.
  Fix what breaks with Tailwind classes only.
  - Done when: each page above has `scrollWidth <= clientWidth` at 390 px (console check) and a note in
    *Implementation notes* lists anything left.
- [ ] **6. Docs.** `docs/mobile.md`: how to install on iPhone (Share, Add to Home Screen) and Android, what reader mode
  hides, how to turn it off.
  - Done when: the file exists and is linked from `docs/hosting.md`.

## Acceptance criteria

- [ ] On a phone-width window with reader mode on, you can read a problem with hints and the solution, see your saved
  code and past submissions, read a lesson, tick a plan task and edit notes, and nothing offers Run or Submit.
- [ ] The site can be installed to the home screen and opens full screen with the Zen Dojo icon.
- [ ] The phone has bottom navigation and an account button.
- [ ] Turning reader mode off in Settings restores Run and Submit on desktop.
- [ ] `pnpm check` passes.

## Pitfalls

- Never cache signed-in pages in the service worker; a shared phone would show someone else's data.
- Reader mode is not a permission system; do not rely on it for anything the server must refuse.
- Cookies are request-time: reading them in a cached component breaks `cacheComponents`; keep it inside the dynamic
  Suspense boundary.

## Later: a native app (not part of this plan)

An Expo / React Native app that calls the hosted site's API would add store presence, push reminders and offline
lessons. At this project's pace that is about two rounds plus store review (Apple $99 a year, Google $25 once; Apple
review time is outside our control). Do it only if the installable web app turns out not to be enough. It needs
its own plan, an API layer for the data the pages read today, and the same read-only rule.

## Open questions

## Implementation notes

## Review
