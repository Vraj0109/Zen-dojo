# 0070: Mobile apps overview (decision record: PWA, Capacitor, React Native, native)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-12
- **Implemented by:** (implementer fills in)
- **Spec:** builds on 0058 (hosted web app) and 0059 (phone read-only mode, installable web app). Child plans: 0071 (Android), 0072 (iOS and iPad).

## Goal

Decide how Zen Dojo gets onto phones and tablets, and in what order. This plan is mostly a decision record. It has
two small build steps (a shared mobile-readiness pass on the web app) and then hands off to 0071 and 0072. After it,
the user knows what runs on a phone, what does not, which path is recommended, what it costs, and what only the user
can do.

## Context

What exists today (checked in the repo on 2026-11-12):

- The site runs on Vercel at https://zen-dojo-lovat.vercel.app (Hobby, free) with one Turso database per signed-in
  user and a throwaway in-memory database for guests (`docs/hosted-architecture.md`). The sync Worker on Cloudflare
  does GitHub sign-in and cloud sync (`packages/sync-worker`).
- The site is already an installable web app: `apps/web/app/manifest.ts` (`display: "standalone"`), icons in
  `apps/web/public/icons/`, a small service worker `apps/web/public/sw.js` that caches only an offline page and static
  assets. Phone navigation (bottom tab bar), reader mode and a phone code view (code is shown as text, no editor)
  came from plan 0059. See `docs/mobile.md`.
- Sign-in: `apps/web/app/auth/start/route.ts` makes a PKCE verifier, stores it in the `zd_pkce` cookie and redirects
  to the Worker's `/auth/github/start` with `redirect_uri`. The Worker accepts a redirect only if it is on
  `localhost`/`127.0.0.1`, exactly `zendojo://auth/callback` (the desktop deep link, hard-coded in
  `packages/sync-worker/src/auth/oauth.ts`), or exactly listed in `ALLOWED_REDIRECTS`.
- Bring-your-own-key AI: `apps/web/app/ai-key-setup.tsx` keeps the key in the browser (`localStorage`) and sends it in
  a request header with each AI request; `apps/web/app/api/ai/*` never stores it. Hosted mode has no local AI and no
  CLI providers.
- Running code is blocked on the hosted server (routes answer 403 `hosted-no-run`).
- Delete-my-data exists (plan 0054), which matters for both stores.
- The Next.js app uses server actions, cookies, `cacheComponents` and many request-time routes. Next's static export
  does not support server actions, cookies, route handlers that read the request, and dynamic routes without
  `generateStaticParams` (https://nextjs.org/docs/app/guides/static-exports, "Unsupported Features"). So the app
  cannot be exported to static files and bundled inside a mobile app.

## What runs on a phone, and what does not

| Thing | Phone | Why |
|---|---|---|
| Read lessons, problem statements, hints, solutions, your saved code and past submissions | yes | plain pages from the hosted site |
| See the plan, tick tasks, review queue, streak, XP | yes | server actions on the hosted site |
| Notes (plain text) | yes | existing notes form |
| Ask AI with your own key (BYOK) | yes | `x-ai-key` header path already exists; no server storage |
| Write code in an editor | not planned | phone code view is read-only text (0059); typing code on a phone is poor |
| Run or Submit code | **no** | the judge needs C++, Java, Python on a real computer; hosted routes refuse it, and phones cannot run those toolchains |
| Local AI (Ollama, CLI providers) | no | needs programs on a computer |
| Browser extension, pairing key, backup restore | no | desktop only |

Running code stays a desktop feature. A tablet with a keyboard could later get a hosted judge, but that is a
separate, large decision (it needs a sandbox and costs money) and is not part of any plan here.

## The four options

| Option | What it is | Effort | Cost | Store presence | Verdict |
|---|---|---|---|---|---|
| A. PWA (shipped) | The site, installed from the browser | done; polish only | $0 | none | keep as the base and the fallback |
| B. Capacitor wrapper | A native shell (WebView) that loads the hosted site, plus a few native plugins | about 3 rounds for both platforms | $25 once (Google), $99 a year (Apple) | Play Store, App Store | **recommended** if the user wants store apps |
| C. React Native / Expo | A second UI written from scratch, calling a new API | 8 or more rounds, plus an API layer | same fees | yes | not recommended: re-implements every page |
| D. Fully native (Kotlin and Swift) | Two separate apps | far more than C | same fees | yes | not recommended |

### Why B and not C or D

- Every page the user wants (lessons, plan, problems, notes, AI chat) already exists and already fits a phone width.
  C or D would rebuild them and then need an API for data the Server Components read directly today
  (`apps/web/lib/*`). That doubles the maintenance for a one-person project.
- B reuses the hosted site, the per-user databases, the sync Worker and the sign-in as they are.

### Honest risks of B (read before choosing)

1. **`server.url` is not meant for production.** Capacitor's config docs say loading a remote URL with `server.url`
   "is not intended for use in production" (https://capacitorjs.com/docs/config, checked 2026-11-12). It works, and
   many apps do it, but it is outside the documented path and there is no static bundle to fall back on.
   Mitigation in 0071 step 2: the shell also ships a small bundled page (`webDir`) that shows an offline library of
   lessons and a "cannot reach the site" screen, so the app is never a blank window.
2. **App Store review.** Guideline 4.2 says an app should include features, content and UI that go beyond a
   repackaged website, and that web clippings and link collections do not belong
   (https://developer.apple.com/app-store/review/guidelines/, checked 2026-11-12). A bare wrapper is likely to be
   rejected. 0072 therefore requires real native value: offline lessons, daily reminder notifications (local, no
   server), share sheet, haptics, and native sign-in. Google Play has no equal rule that I could verify, but a thin
   wrapper can still be rejected under its own policies (**unverified**, see "Claims not verified").
3. **Sign in.** GitHub sign-in must run in the system browser, never inside the app's WebView (RFC 8252 sections 4
   and 8.12, https://datatracker.ietf.org/doc/html/rfc8252). Apple guideline 4.8 also asks apps whose primary
   account comes from a third-party login to offer an equivalent privacy-focused option; that needs a decision (see
   0072, "Open decisions").
4. **Hosting limits carry over.** Turso Free is about 99 users and Vercel Hobby is for personal, non-commercial use
   only (`docs/hosted-architecture.md`). Publishing a free app to a store is still non-commercial, but the user must
   re-read the Vercel terms before listing a public app (**unverified**).

### Recommendation

1. **Phase 0: PWA polish (1 round).** Make the installable site good enough that the store apps are optional. Done
   in this plan (steps 1 and 2 below).
2. **Phase 1: Android with Capacitor (plan 0071, about 1.5 rounds plus a 14 day wait).** Cheapest fee ($25) and the
   most permissive platform. A signed APK can also be installed directly with no store at all.
3. **Phase 2: iOS and iPad with the same Capacitor project (plan 0072, about 1.5 rounds plus review).** Needs the
   $99 programme and a Mac or a macOS CI runner, because the user develops on Windows.
4. **Phase 3: native features (about 1 to 2 rounds, inside 0071 and 0072 as later steps).** Local reminders, offline
   lessons, share, haptics. Push notifications from a server are **out of scope** (they need a server job and keys).

If the user only wants the app for themselves, stop after Phase 0 and use the PWA on both platforms, or sideload the
Android APK. The stores are worth it only for discoverability, push-like reminders and the app icon feeling.

### Costs (money)

| Item | Cost | Source |
|---|---|---|
| Google Play developer account | US$25, one time | https://support.google.com/googleplay/android-developer/answer/6112435 (checked 2026-11-12) |
| Apple Developer Program | US$99 a year (local currency where offered) | https://developer.apple.com/support/enrollment/ (checked 2026-11-12) |
| Mac for iOS builds | $0 if CI macOS runners are used; hardware or rental otherwise | GitHub-hosted macOS runners: **unverified**, see 0072 |
| Hosting | unchanged ($0 on current free tiers) | `docs/hosted-architecture.md` |

### Effort estimate (rounds are 4 to 6 hours of agent work, as in 0059)

| Phase | Rounds | Waiting time outside our control |
|---|---|---|
| 0 PWA polish and mobile readiness (this plan) | 1 | none |
| 1 Android shell, sign-in, store listing (0071) | 1.5 | 14 days of closed testing for a new personal Play account; Play review |
| 2 iOS and iPad (0072) | 1.5 | Apple enrolment (can take days), TestFlight, App Review |
| 3 Native features | 1 to 2 | none |
| Total | about 5 to 6 | about 3 to 4 weeks of calendar time, mostly waiting |

## Out of scope

- Writing the Capacitor, Android or iOS projects (0071 and 0072 do that).
- React Native / Expo and fully native apps. Option C is only a fallback if Capacitor fails in practice; EAS Build builds iOS on Expo's cloud macOS runners, so no Mac is needed (https://docs.expo.dev/build/introduction/, checked 2026-11-12); its free tier was **not verified**.
- A hosted judge, code running on phones, Apple Pencil input, push notifications from a server, in-app purchases, ads.
- Changing the desktop app.

## Steps

- [ ] **1. Mobile-readiness pass on the web app.** Check against the hosted site at 390x844 and at tablet width
  (768x1024 and 1024x1366, in the built-in browser): Today, `/dsa`, a problem page, `/study/sd`, a lesson, Review,
  `/profile/settings`. Fix only layout breakage with Tailwind classes. Add `viewport-fit=cover` to the viewport
  metadata in `apps/web/app/layout.tsx` and `env(safe-area-inset-*)` padding to the compact top bar and
  `apps/web/app/components/bottom-nav.tsx` so notches and the iOS home bar do not cover content.
  - Done when: no horizontal scroll (`scrollWidth <= clientWidth`) on the pages above at both widths, the bottom bar
    clears a simulated 34 px bottom inset (set `padding-bottom` via a temporary CSS variable check), and
    *Implementation notes* lists anything left.
- [ ] **2. App mode flag.** Add `apps/web/lib/app-shell.ts` with `isAppShell(req | headers)` that is true when the
  user agent contains the token `ZenDojoApp/1` (the Capacitor projects in 0071 and 0072 append it through
  `appendUserAgent`). Use it only for: hiding the "Add to Home Screen" hint, hiding the desktop download link in
  `components/hosted-run-notice.tsx` (the App Store and Play rules are easier to meet when the app does not point at
  other downloads), and choosing app sign-in (0071 step 5). It must never be a security check.
  - Done when: `pnpm exec vitest run apps/web/lib/app-shell.test.ts` passes (token present, absent, odd casing,
    missing header).
- [ ] **3. Privacy page.** Add a public page `apps/web/app/privacy/page.tsx` (static, no request-time data) and link it
  from the sign-in page and Settings. Plain words: what the site stores (GitHub id, name, avatar, progress, notes,
  saved code), where (Turso per-user database, Cloudflare D1 for sync), AI keys (kept on the device, sent only with
  your own AI requests, never stored), no ads, no tracking, how to delete everything (Settings, Delete my data), and a
  contact address. The user supplies the contact address and confirms the wording (see "Only you can do").
  - Done when: `/privacy` renders without sign-in, has the contact placeholder `PRIVACY_CONTACT_EMAIL` read from
    `process.env` (shown as "ask the owner" when unset), and a test in `apps/web/app/privacy/privacy.test.tsx` or
    the nearest existing page test pattern checks the page mentions deletion and AI keys.
- [ ] **4. Docs.** Add a "Store apps" section to `docs/mobile.md` pointing to 0071 and 0072 and stating what a phone
  cannot do (copy the table above in short form).
  - Done when: the section exists and `docs/mobile.md` links to the three plans.
- [ ] **5. Tests.** Targeted only: `pnpm exec vitest run apps/web/lib/app-shell.test.ts`, then `pnpm -r typecheck`.
  - Done when: both pass. Run `pnpm check` once at the very end.

## Acceptance criteria

- [ ] The decision above is recorded with sources and the "Claims not verified" list is kept up to date.
- [ ] Pages in step 1 fit phone and tablet widths with safe-area padding.
- [ ] `/privacy` is public and accurate.
- [ ] The user has read the recommendation and chosen: stop at the PWA, Android only, or Android and iOS. The choice
  is written under *Open questions* by the user before 0071 or 0072 starts.
- [ ] `pnpm check` passes.

## Pitfalls

- Do not cache signed-in pages in the service worker (0059). The wrapper apps must not add their own page cache
  either; a shared tablet would show someone else's data.
- `localStorage` holds the BYOK key. The OS can clear WebView storage (**unverified** on iOS under storage pressure);
  in the apps the key moves to the OS keychain/keystore in 0071 step 8 and 0072 step 8.
- Do not paste certificates, keystores, passwords or API tokens into chat, the repo or plan files.
- Vercel Hobby terms: the user should confirm a public store listing still counts as personal, non-commercial use.
- Never move or reuse a published tag; mobile builds get their own tags (`android-v0.1.0`, `ios-v0.1.0`), not the
  desktop `vX.Y.Z` tags, so `.github/workflows/desktop.yml` does not trigger.

## Only you can do

- Choose the path (stop at PWA, Android, or both).
- Decide publisher identity: a personal developer account means your legal name is shown on both stores; an
  organisation account needs a legal entity (Apple also needs a D-U-N-S number for organisations,
  https://developer.apple.com/support/enrollment/).
- Provide a privacy contact email and approve the privacy page wording.
- Create the store accounts, pay the fees, and keep the signing keys (0071, 0072).

## Claims not verified (check before relying on them)

- Whether Google Play has a written minimum-functionality rule for web wrappers like Apple's 4.2.
- Vercel Hobby terms for a publicly listed free app.
- Expo / EAS free tier and pricing.
- iOS WebView storage eviction behaviour for `localStorage`.
- Apple and Google review times (outside our control, no stated guarantee found).

## Open questions

(User: pick the path here. Implementer: write questions here and set the status to `blocked`.)

## Implementation notes

(Implementer fills in.)

## Review

(Reviewer fills in.)
