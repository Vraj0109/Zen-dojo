# Zen Dojo on your phone

Open your hosted Zen Dojo site (see `docs/hosting.md`) in the phone's browser and sign in. It works at phone width:
a tab bar at the bottom (Today, Practice, Learn, Review, You) and an account button in the top bar.

## Install it to the home screen

- **iPhone (Safari):** tap Share, then Add to Home Screen, then Add. Use Safari; other iOS browsers cannot install it.
- **Android (Chrome):** open the menu, then Install app (or Add to Home screen).

It then opens full screen with the Zen Dojo icon. It still needs a connection: if you are offline you see a short
"You are offline" page with a link to your offline copy. Your personal data and signed-in pages are never stored
on the phone by the app's service worker. The service worker is registered only in production builds, so it does not
run under `pnpm dev`.

## Offline reading by course and problem sets

You can save individual courses and DSA pattern problem sets for offline reading on your phone or computer (plan 0115).

- In **Settings** (Profile > Settings > Offline content), pick the courses or DSA patterns you want to download.
- When offline, visiting `/offline` lets you tap **Open your offline copy** (`/offline/read`), or navigations to saved
  problems and lessons automatically open in the offline reader.
- The offline reader renders text, code tabs, diagrams, and images directly from your browser's local IndexedDB store.

## Content update notices ("What's new")

When authors update a course or problem set and choose "Tell learners" (plan 0119):
- Learners who follow or have downloaded that unit receive a short notice ("What changed") when their device next syncs
  or connects online.
- A bell icon in the navigation rail highlights unread notices and opens `/whats-new`.
- If you enable **Browser notifications** in Settings, the site can show a notification when updates arrive for your
  followed courses. Offline devices receive these notices as soon as they reconnect.

## Reader mode (read-only study)

Reader mode is a comfort setting for phones (plan 0059). When it is on:

- Run, Submit, Check, Reset and Mark solved are hidden, and code editors are read-only.
- You can still read problems, hints, solutions, your saved code, past submissions, lessons and your plan; tick plan
  tasks; and edit notes.

Turn it on or off in Settings (Profile, Settings). It is stored in a cookie on that device, so it is not a security
feature; the hosted server refuses code execution on its own (plan 0058).

## Help

The in-app help and FAQ is at `/help` (You tab, Help and FAQ); the same text is in `docs/faq.md`.

## Icons

`apps/web/public/icons/` holds PNGs rendered from `apps/web/app/icon.svg` (192, 512, maskable 512, Apple touch 180).
Re-render them if the logo changes.

## Practice list on a phone

- On `/dsa`, each Filters dropdown opens as a bottom sheet with large rows, Show results and Done (plan 0074).
- Opening a group on `/dsa` scrolls to that group's header, so its first question is on screen; the header shows a spinner while it loads.
- A pattern lesson ends with a "Practice <pattern>" card that opens the Practice tab at the top.
