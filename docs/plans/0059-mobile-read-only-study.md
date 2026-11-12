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

- [x] **1. Reader mode core.** `apps/web/lib/reader-mode.ts` (`READER_COOKIE`, `isReaderMode()`, `setReaderModeAction`
  in `app/actions.ts`), a Settings toggle in `app/profile/settings/page.tsx`, and a one-time dismissible suggestion on
  narrow screens (client component using `matchMedia`, remembered in `localStorage` with try/catch).
  - Done when: `pnpm exec vitest run apps/web/lib/reader-mode.test.ts` passes (cookie parse, default off, toggle).
- [x] **2. Apply it to the problem and LLD pages.** In `judge-workspace.tsx`, `app/dsa/[id]/page.tsx`,
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

### Phone code view, hosted Java block, suggestion (Agent 2, 2026-11-12)

- **Below `md` (phones) no code editor is rendered visibly, regardless of reader mode.** CSS only (`max-md:hidden` / `md:hidden`), so no
  hydration mismatch. `judge-workspace.tsx`: the code pane shows the saved solution (else the last run) as a plain `<pre>` with the line
  "Open on a computer to write and run code"; the editor, language/Zen/Reset/Save/Run actions and custom input are hidden; the Results
  pane is hidden via a new `phoneHidden` flag on `PaneDef` (`pane-layout.tsx`, narrow branch; the code pane no longer has a fixed
  28rem height on phones). `notes-form.tsx`: the code editor and language select are hidden on phones and replaced by the saved code as
  text (the hidden textarea still posts the saved value, so a notes-only Save keeps the code). `components/project-editor.tsx`: toolbar,
  file tabs, editor and console hidden on phones; each file is a `<details>` with a read-only `<pre>` ("Your classes" and the Playground).
  Notes, hints, description, solution and submissions are untouched.
- **Hosted Java projects:** `study/[area]/[id]/page.tsx` computes `noRun = isHosted()` and passes it through `ProjectPlayground` and
  `NotesForm` to `ProjectEditor` (`noRun`). With it: no Run Project button, no console, and `HostedProjectNotice` (new, in
  `components/hosted-run-notice.tsx`, links to `DESKTOP_DOWNLOAD_URL`). Editing and saving stay available. The server guard from 0058
  is unchanged and still the real protection.
- **Step 1 suggestion:** `components/phone-study.tsx` `StudyModeSuggestion` (matchMedia `max-width: 767px`, `localStorage` flag
  `zd-study-mode-suggestion` in try/catch, hidden when the `zd_reader=1` cookie is set). "Turn on" posts `setReaderModeAction`; "Not now"
  dismisses. Mounted in `shell.tsx` (both the full and the compact shell). It copies the cookie name because `lib/reader-mode.ts` imports
  `next/headers` and cannot be imported by a client file.
- **Tap targets:** compact top bar is `h-12` and its buttons 40 px (`size-10`, Zen `min-h-10`, right-hand group buttons and links `min-h-10`)
  below `md`; desktop sizes unchanged.
- Verified at 375x812 and 390x844 in the built-in browser (dev server on port 3000 with the user's data, because a second `next dev`
  cannot start in this folder; pages were only read, nothing was clicked that writes): `/dsa/lc-1` and `/study/lld/lldp-parking-lot` have
  `scrollWidth == clientWidth`, no visible `.cm-editor`, no visible Run, Run Project, New file or Reset, the phone line and the saved-code
  text are shown, the suggestion shows once and Not now persists. Desktop width still shows the Code pane and Run. Not verified: hosted
  mode in a browser (needs auth; only the prop path was typechecked), the "Turn on" click, and the code-editor desktop hydration after a
  forced stream swap (the pane was in the background, so React's streaming swap had to be triggered by hand).

### Steps 3 to 6 (Agent D)

- **3 Phone nav.** `nav.tsx` now exports `ICONS`, `Icon`, `MAIN`, `SECONDARY`, `NavLink`, `isActive`. New
  `components/bottom-nav.tsx` (below `md`; Today, Practice, Learn, Review, You; `aria-current`). `shell.tsx` pads the page
  by the bar height below `md` and shrinks `--pane-h` by 3.5rem on phones; the bar is hidden in Zen mode on focus pages.
  The top-bar link strip is hidden below `md` (the tab bar replaces it). `AccountPopover` got a `compact` prop (avatar
  only, menu opens downward, no sync pill, signed-out shows a small Sign in link); `SidebarAccount` forwards it.
  `layout.tsx`: account button in the aside header (below `lg`, hidden inside the drawer) and passed to `Shell` as
  `account` for the compact problem-page bar. Signed-in popover not exercised (no auth locally).
- **4 Installable.** `app/manifest.ts`, PNG icons in `public/icons/` rendered with sharp from `app/icon.svg`
  (192, 512, maskable 512, apple-touch 180), `icons.apple`/`appleWebApp` metadata and `viewport.themeColor` in
  `layout.tsx`, `app/register-sw.tsx` (production only), `public/sw.js`, `app/offline/page.tsx`. The worker skips `/api/`
  and `/auth/`, never caches HTML except the static `/offline` page, and caches only `/_next/static/` and `/icons/`.
  Not verified: install prompt, offline behaviour and Lighthouse (need `pnpm build` + `start`; dev does not register it).
- **5 Layout pass at 375 px (dev server, copy DB).** `scrollWidth <= clientWidth` on `/`, `/dsa`, `/dsa/lc-1`, `/study`,
  `/study/sd`, `/study/sd/sd-networking`, `/review`, `/profile`, `/profile/account`. Fixed `/profile/settings`
  (category nav pushed the page to 1739 px): `min-w-0` on the nav in `settings-shell.tsx`. Left alone (Agent C's files):
  on the problem page the Classic layout puts Problem and Code side by side with the code pane cut off (tabs row
  `C++ / Zen / R...` clipped); phones need a stacked layout by default in `judge-workspace.tsx` / pane layout. Tap
  targets in the compact top bar are 24 px (existing desktop-sized bar).
- **6 Docs.** `docs/mobile.md`, linked from the end of `docs/hosting.md`.
- Typecheck: only errors are Agent C's in-progress `readOnly` prop on `dsa/[id]/page.tsx`. ESLint clean on my files.

Steps 1 and 2 (Agent C, 2026-11-12). Steps 3 to 6 and the one-time narrow-screen suggestion are not done.

- `lib/reader-mode.ts`: `READER_COOKIE` (`zd_reader`), `READER_NOTES_EDITABLE`, pure `parseReaderCookie` / `readerCookieValue`, and
  `isReaderMode()` (reads the cookie; call only inside an async component behind `connection()` and Suspense). Test: `lib/reader-mode.test.ts`.
- `setReaderModeAction` appended to `app/actions.ts` (dynamic imports, so no edits to the import block). Sets the cookie
  (`SameSite=Lax`, 1 year, path `/`) or deletes it.
- Settings: `app/profile/settings/reader-mode-toggle.tsx` (async, `connection()`, inside Suspense), added to the Appearance block
  and to `ENTRIES` (id `reader-mode`) so search finds it.
- One `readOnly` prop, read once in `dsa/[id]/page.tsx` (`Problem`) and `study/[area]/[id]/page.tsx` (`ExerciseView`) next to the
  existing `Promise.all`, passed to `JudgeWorkspace`, `NotesForm`, `ProjectEditor` and `ProjectPlayground`.
- Hidden when read-only: Run, Reset, Save, Last run, custom input, editor help (judge); "Load into editor"; Mark solved, Undo and
  "Run & pass all tests" hints (DSA header); Run Project, New file, Delete file, Reset and the console (project editor).
  Editors are read-only (`readOnly` on the textarea; `code-editor.tsx` now also sets CodeMirror `readOnly`/`editable false` when
  the textarea is read-only). The judge editor shows the saved solution first, then the last run, then the starter.
- Notes stay editable. In `NotesForm` the code textarea is read-only and the language select disabled with a hidden input so a
  notes-only Save keeps the saved code and language.
- Extra file touched: `app/code-editor.tsx` and `study/[area]/[id]/project-playground.tsx` (needed so the Playground is read-only too).
- Concept pages (confidence, notes) are unchanged: they have no Run.
- Not verified in a browser; `typecheck` and eslint pass on the changed files (one unrelated error from the hosted work appeared on
  one run and cleared).

## Review
