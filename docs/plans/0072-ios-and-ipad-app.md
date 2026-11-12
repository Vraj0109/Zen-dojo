# 0072: iOS and iPad app (same Capacitor project as Android)

- **Status:** ready (start only after 0071 step 5 works on Android and the user has chosen iOS in plan 0070, *Open questions*)
- **Planned by:** Claude Code, 2026-11-12
- **Implemented by:** (implementer fills in)
- **Spec:** decision in 0070; Android plan 0071 (shared project `apps/mobile/`, shared sign-in design)

## Goal

An iPhone and iPad app called Zen Dojo built from the same `apps/mobile/` Capacitor project as the Android app. It
opens the hosted site, signs in with GitHub through the system browser, and has enough real native features
(offline lessons, daily reminders, share, keychain key storage, an iPad layout with Split View and keyboard shortcuts)
to be a fair candidate for App Review. It reads, plans, takes notes, ticks tasks and chats with the user's own AI key.
It cannot run code.

## Context

- Read `docs/plans/0070-mobile-apps-overview.md` (decision, costs, "Claims not verified") and
  `docs/plans/0071-android-app.md` (sign-in flow, offline lessons, app mode flag). This plan reuses all of them. Do not
  re-implement what 0071 already did; add the iOS parts.
- The developer machine is Windows. iOS builds need Xcode on macOS. Capacitor v8 needs Xcode 26 or newer
  (https://capacitorjs.com/docs/next/main/reference/support-policy, checked 2026-11-12; v9, unreleased, lists Xcode 27).
  Options: a GitHub Actions macOS runner (step 11), a rented Mac, or a Mac the user owns.
- Apple Developer Program: US$99 a year in local currency where available. Individuals need no D-U-N-S number and the
  personal legal name shows as the seller; organisations need a legal entity and a D-U-N-S number
  (https://developer.apple.com/support/enrollment/, checked 2026-11-12). The membership page lists App Store Connect,
  TestFlight and notarization under programme resources but its text did not confirm which tier includes each
  (https://developer.apple.com/support/compare-memberships/); treat "TestFlight needs the paid programme" as
  **unverified** and confirm when enrolling.
- App Review Guidelines (https://developer.apple.com/app-store/review/guidelines/, checked 2026-11-12):
  - 4.2 Minimum Functionality: apps should go beyond a repackaged website; web clippings, link collections and
    aggregators are called out. A bare wrapper is likely to be rejected.
  - 4.8 Login Services: apps that use a third-party or social login as the primary account must also offer an
    equivalent option that limits data to name and email, allows a private email, and does not collect app
    interactions for advertising without consent. Listed exceptions (own login, education or enterprise sign-in,
    government IDs, clients for one specific third-party service) do not obviously cover GitHub sign-in in a
    study app.
  - 5.1.1(v): if the app supports account creation it must offer account deletion in the app; apps without significant
    account-based features should work without logging in. Zen Dojo already has guest browsing and Delete my data
    (plan 0054).
  - 5.1.1(i): a privacy policy link in App Store Connect and inside the app (`/privacy`, 0070 step 3).
  - 5.1.2: disclose and get permission before sending personal data to third parties, including third-party AI.
    The BYOK AI feature sends the user's own prompt and problem text to the provider they chose, with their own key;
    the in-app wording must say so.
  - 2.1(a): the app must be final and tested on a device; if there is a login, give App Review a demo account and
    keep the back end live.
- Native sign-in must use an external user-agent, never an embedded WebView
  (RFC 8252 sections 4 and 8.12, https://datatracker.ietf.org/doc/html/rfc8252). On iOS the external user-agents are
  `ASWebAuthenticationSession` and `SFSafariViewController`. Apple's page for
  `ASWebAuthenticationSession` returned no body text in this pass, so its behaviour (shared Safari cookies, callback by URL scheme, `Callback.https` from iOS 17.4) is from general knowledge only (**unverified**); read it before step 5.
- Redirect: the sync Worker already accepts exactly `zendojo://auth/callback` (`packages/sync-worker/src/auth/oauth.ts`),
  so no Worker change is needed for the custom-scheme design. Universal links would need a Worker
  `ALLOWED_REDIRECTS` change and an `apple-app-site-association` file; not in this plan.

## Out of scope

- Apple Pencil support, handwriting, drawing. (Stated by the user.)
- Mac Catalyst, Apple Watch, widgets, Siri, in-app purchases, ads, analytics SDKs.
- Server push notifications (APNs). Local reminders only.
- Running code on the device.
- Changing the Worker or the desktop app.

## Open decisions (write the answers under *Open questions* before step 1)

1. **Bundle id.** Default `app.zendojo.mobile`, same as the Android application id. Permanent after the first upload.
2. **Account type.** Individual (legal name shown as seller) or organisation.
3. **Guideline 4.8.** Choose one: (a) add Sign in with Apple through the Worker (an Apple sign-in provider is a new
   Worker feature and needs an Apple Services ID and key; this is a new plan, not part of this one), (b) ask App
   Review in the first submission's notes whether GitHub sign-in qualifies given guest mode, and accept a possible
   rejection, or (c) ship the iOS app guest-only plus PWA sign-in (not recommended: progress would not save).
   Recommendation: (b) first, then (a) if rejected. This is a policy interpretation I could not confirm.
4. **Build machine.** GitHub Actions macOS runner, rented Mac, or owned Mac.

## Steps

Targeted tests only; no full `pnpm test` during steps. Local commits only when the user asks; no push; no attribution.

- [ ] **1. Add the iOS platform.** In `apps/mobile/` add `@capacitor/ios` (`^8`), run `pnpm exec cap add ios`, commit
  `apps/mobile/ios/` (Xcode project; no certificates or profiles in it). Set `ios.appendUserAgent` to
  `ZenDojoApp/1` in `capacitor.config.ts`. Set the deployment target to the Capacitor 8 default (iOS 15 per a
  third-party guide, https://capawesome.io/blog/how-to-upgrade-your-capacitor-app-to-capacitor-8/, **not official**;
  use whatever `cap add ios` generates).
  - Done when: `apps/mobile/ios/App/App.xcodeproj` exists, `capacitor.config.ts` has both platforms, and
    `pnpm -r typecheck` passes. (Building needs a Mac; see step 11.)
- [ ] **2. Spike on a Mac or macOS runner.** Run the app in the iOS Simulator (iPhone and iPad). Verify the same list
  as 0071 step 2: site loads, cookies persist after relaunch, external links open in Safari, swipe-back works, the
  keyboard does not cover inputs. Record findings in *Implementation notes*. If the remote site misbehaves in
  `WKWebView`, set the status to `blocked`; the fallback is the PWA.
  - Done when: notes list what worked and what did not.
- [ ] **3. Icons, launch screen, safe areas, status bar.** App icon 1024x1024 (no transparency) from `docs/branding`,
  launch storyboard with the logo on `#1c1715`, status bar style to match the theme. Safe areas were handled in
  0070 step 1; verify notch, Dynamic Island and home indicator on iPhone and iPad.
  - Done when: simulator screenshots show nothing under the notch or the home bar.
- [ ] **4. Info.plist and capabilities.** Set `CFBundleDisplayName` "Zen Dojo", register the URL scheme `zendojo`
  (`CFBundleURLTypes`), add `ITSAppUsesNonExemptEncryption` = false only if the user confirms the app uses just
  standard HTTPS (**check Apple's export compliance page first, unverified**). Do not add camera, location or any
  permission strings the app does not use.
  - Done when: the plist has only entries the app needs, and the list is written in *Implementation notes*.
- [ ] **5. Native GitHub sign-in.** Reuse the web side from 0071 step 5 (`/auth/start?app=1&format=json`,
  `app-sign-in.tsx`, `app-deep-links.tsx`, shared `parseAuthDeepLink`). iOS parts: open the returned URL in an
  external user-agent, either `@capacitor/browser` (its docs say it uses SFSafariViewController on iOS, https://capacitorjs.com/docs/apis/browser, checked 2026-11-12) or a
  maintained `ASWebAuthenticationSession` plugin (choose after reading both docs; record the choice and why). Receive
  `zendojo://auth/callback?...` through `App.addListener("appUrlOpen", ...)`, close the browser, then load
  `/auth/callback?code=...&state=...` in the WebView where the `zd_pkce` cookie lives. If using
  `ASWebAuthenticationSession`, its own callback handler replaces the deep link; keep one code path that ends at the
  same callback URL.
  - Done when: a full sign-in works in the simulator and on a real iPhone, survives a relaunch, and no GitHub page is
    shown in the app's own `WKWebView`. Existing tests from 0071 step 5 still pass.
- [ ] **6. iPad layout.** The target is a good tablet experience from the existing responsive site, not a new UI.
  In the Xcode project: device family iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"`), all four iPad orientations,
  **do not** set `UIRequiresFullScreen`, so Split View and Slide Over stay available (confirm the exact multitasking
  requirements in Apple's iPad documentation at implementation time, **unverified**). In the web app: check the
  shell at 768x1024, 820x1180, 1024x1366 and in half-width Split View (about 507 px and 320 px wide columns): below
  `md` the bottom nav shows, from `md` up the sidebar shows. Fix breakpoints in `apps/web/app/shell.tsx` and
  `components/bottom-nav.tsx` only if a width shows both or neither. Use `@media (pointer: coarse)` to make tap targets at
  least 44 px on touch devices in `apps/web/app/globals.css`.
  - Done when: screenshots at the five widths show a correct layout with no horizontal scroll, and a note lists the
    Split View result on a real iPad or simulator.
- [ ] **7. Hardware keyboard on iPad.** Add keyboard shortcuts on the web side where there are none, in one client
  component `apps/web/app/components/keyboard-shortcuts.tsx` mounted in `shell.tsx`: `g` then `t` Today, `g` then `p`
  Practice, `g` then `l` Learn, `g` then `r` Review, `/` focus search where a search field exists, `?` shows a help
  list. Ignore keys while an input, textarea or editor has focus. Use `keydown` handlers only; the iPadOS menu-bar
  shortcut list (`UIKeyCommand`) is not part of this plan.
  - Done when: `pnpm exec vitest run apps/web/app/components/keyboard-shortcuts.test.tsx` passes (sequences, ignored
    inside inputs, help opens and closes) and the shortcuts work with a hardware keyboard in the simulator.
- [ ] **8. Native value for App Review (guideline 4.2).** All of these ship in the first submission:
  - Offline lessons: reuse 0071 step 7; check `WKWebView` allows the service worker in the app (**unverified**: if it
    does not, cache the static lesson files with `@capacitor/filesystem` instead and record the decision).
  - Daily reminder with `@capacitor/local-notifications` (permission asked only when the user turns it on).
  - Share sheet with `@capacitor/share` on lessons and problems.
  - Haptics on task tick (`@capacitor/haptics`).
  - AI key in the iOS Keychain through a maintained secure-storage plugin (same choice as 0071 step 8).
  - Done when: each feature works on a real iPhone (or the simulator where the feature is simulated) and
    *Implementation notes* lists the plugin versions.
- [ ] **9. In-app privacy wording and deletion.** Settings in the app shows: link to `/privacy`, Delete my data (two
  taps from Settings), and the AI notice: "Your question and the problem text go to the AI provider you chose, using your
  own key." Add that notice to `apps/web/app/ai-key-setup.tsx` for everyone, not only the app.
  - Done when: a test or manual check shows the notice before the first AI request and Delete my data works in the
    simulator.
- [ ] **10. Store listing material (files only).** Under `docs/store/ios/`: `listing.md` (name, subtitle, description,
  keywords, category Education, support URL, privacy URL), `privacy-labels.md` (answers for the App Store privacy
  questions, derived from the same facts as the Android data safety file; Apple's questionnaire page was **not
  verified** in this pass, read https://developer.apple.com/app-store/app-privacy-details/ first),
  `review-notes.md` (what the app is, that guest mode shows everything read-only without login, a demo GitHub test
  account the user creates, that code running is not offered on iOS, and the answer to open decision 3),
  `screenshots.md` (required device sizes: take them from App Store Connect's current list; **unverified** here).
  - Done when: the files exist and every statement traces to the repo.
- [ ] **11. CI on a macOS runner.** New `.github/workflows/ios.yml`, triggered by tags `ios-v*` and manual dispatch:
  checkout, Node 22, `pnpm install`, `cap sync ios`, `xcodebuild` archive. Use a GitHub-hosted macOS runner whose Xcode
  is 26 or newer (check the runner images list at implementation time; **unverified**, including minutes cost for
  private repos; public repos are believed to be free, **unverified**). Signing material comes from secrets only when
  present: `IOS_CERTIFICATE_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`,
  `APPSTORE_API_KEY_ID`, `APPSTORE_API_ISSUER_ID`, `APPSTORE_API_KEY_BASE64`. Without them the job builds for the
  simulator and uploads the `.app` as an artifact. With them it signs, exports an `.ipa` and uploads it to TestFlight
  (via `xcrun altool` or Fastlane; choose after reading current docs, **unverified**).
  - Done when: a manual run on a branch produces a simulator build artifact, and the workflow never prints a secret.
- [ ] **12. TestFlight.** First upload goes to internal testing (the user's own Apple ID). Record the build number rule
  (`CFBundleVersion` increases on every upload; `CFBundleShortVersionString` follows `0.1.0`). Details of TestFlight
  limits and review are **unverified**; read https://developer.apple.com/testflight/ at that time.
  - Done when: a build is installed from TestFlight on the user's iPhone and iPad and sign-in works.
- [ ] **13. Docs.** `docs/mobile.md` gets "iPhone and iPad app" (TestFlight install, sign in, iPad shortcuts, what it
  cannot do). Link 0072 from `docs/plans/README.md` (index row added by the planner).
  - Done when: the section is accurate for the build.
- [ ] **14. Tests and check.** Targeted `pnpm exec vitest run` on new test files, `pnpm -r typecheck`, then `pnpm check`
  once.
  - Done when: all pass.

## Acceptance criteria

- [ ] The app builds with Xcode 26 or newer and runs on an iPhone and an iPad simulator and on at least one real device.
- [ ] GitHub sign-in works through the system browser and the `zendojo://auth/callback` link; no OAuth page in the
  app's own `WKWebView`.
- [ ] iPad: correct layout in full screen and in Split View, all orientations, no horizontal scroll, 44 px tap targets
  on touch.
- [ ] Hardware keyboard shortcuts work and the `?` help lists them.
- [ ] Offline lessons, daily reminder, share, haptics and keychain key storage work (the 4.2 native value).
- [ ] Guest browsing works; Delete my data is reachable in the app; `/privacy` is linked.
- [ ] Review notes and privacy answers are written and match the app.
- [ ] No certificate, profile, key or password is in the repo. `pnpm check` passes.

## Pitfalls

- Apple can reject the first submission under 4.2 or 4.8 even when everything works. Budget at least one resubmission.
  Apple's review time is not guaranteed (no figure verified).
- `WKWebView` can handle cookies, storage and service workers differently from Chrome. Test sign-in persistence after
  force-quitting the app.
- Do not let the app link to the desktop download or to payment pages: Apple rules on steering are strict and not
  verified here. The `isAppShell` flag from 0070 step 2 hides the desktop link.
- The privacy labels, the privacy URL and the actual data flows must agree, or the app can be pulled later.
- Display name "Zen Dojo" may already exist on the App Store; have a second name ready (**unverified** availability).
- Never reuse a build number. Never put the App Store Connect API key in the repo.
- Never use `--dangerously-skip-permissions` equivalents or disable ATS (App Transport Security): the site is HTTPS.

## Only you can do

- Enrol in the Apple Developer Program (US$99 a year), choose individual or organisation, and finish identity checks.
- Create the App ID, distribution certificate, provisioning profile and an App Store Connect API key, and add the six
  `IOS_*`/`APPSTORE_*` secrets in GitHub (Settings, Secrets and variables, Actions). Never paste them in chat.
- Create the app record in App Store Connect with the final bundle id, name and category.
- Fill the privacy labels, age rating, export compliance, support URL and privacy URL from `docs/store/ios/*`.
- Create a demo GitHub test account for App Review and put its credentials only in App Store Connect's review fields.
- Add yourself and any testers to TestFlight; own a real iPhone and ideally an iPad for testing.
- Decide open decision 3 (Sign in with Apple or not) after the first review answer.
- Submit for review.

## Open questions

(User: answer the four open decisions here.)

## Implementation notes

(Implementer fills in.)

## Review

(Reviewer fills in.)
