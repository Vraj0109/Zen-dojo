# Zen Dojo on your phone

Open your hosted Zen Dojo site (see `docs/hosting.md`) in the phone's browser and sign in. It works at phone width:
a tab bar at the bottom (Today, Practice, Learn, Review, You) and an account button in the top bar.

## Install it to the home screen

- **iPhone (Safari):** tap Share, then Add to Home Screen, then Add. Use Safari; other iOS browsers cannot install it.
- **Android (Chrome):** open the menu, then Install app (or Add to Home screen).

It then opens full screen with the Zen Dojo icon. It still needs a connection: if you are offline you see a short
"You are offline" page. Your data and signed-in pages are never stored on the phone by the app's service worker.
The service worker is registered only in production builds, so it does not run under `pnpm dev`.

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
