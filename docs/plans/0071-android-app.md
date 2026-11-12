# 0071: Android app (Capacitor shell around the hosted site)

- **Status:** ready (start only after the user has chosen Android in plan 0070, *Open questions*)
- **Planned by:** Claude Code, 2026-11-12
- **Implemented by:** (implementer fills in)
- **Spec:** decision in 0070; hosted site in 0058; phone mode in 0059; desktop deep-link sign-in in 0051

## Goal

An Android app called Zen Dojo that opens the hosted site (https://zen-dojo-lovat.vercel.app) in a native shell, signs
in with GitHub through the system browser, and adds a few native things: a daily reminder, share, offline lessons and a
safer place for the AI key. It can be installed as a signed APK (no store) and, once the user has a Play account, from
Google Play. It reads, plans, takes notes, ticks tasks and chats with the user's own AI key. It cannot run code.

## Context

- Decision and costs: `docs/plans/0070-mobile-apps-overview.md`. Read its "Claims not verified" list.
- Existing sign-in: `apps/web/app/auth/start/route.ts` (PKCE verifier in the `zd_pkce` cookie, redirect to the sync
  Worker), `apps/web/app/auth/callback/route.ts` (reads `code` and `state`, checks the cookie, exchanges the code with
  the Worker). The Worker already accepts the exact redirect `zendojo://auth/callback`
  (`packages/sync-worker/src/auth/oauth.ts`, `DESKTOP_REDIRECT`), so **no Worker change or deploy is needed**.
  `apps/desktop/lib/deeplink.js` (`parseAuthDeepLink`) is the validator to copy: only `code` and `state`, URL-safe
  characters, length limits.
- Capacitor (checked 2026-11-12, https://capacitorjs.com/docs/next/main/reference/support-policy): v8 is the current
  active release (released 2025-12-08), minimum Android Studio 2025.2.1 and Xcode 26. v9 is unreleased.
  Use v8.
- `server.url` loads a remote site in the WebView and is documented as not intended for production
  (https://capacitorjs.com/docs/config). External hosts open in the system browser by default (same page).
- Next static export cannot hold this app (server actions, cookies, request-time routes:
  https://nextjs.org/docs/app/guides/static-exports), so the shell loads the live site.
- Native OAuth rule: use an external user-agent (browser), never an embedded WebView
  (RFC 8252 sections 4 and 8.12, https://datatracker.ietf.org/doc/html/rfc8252). On Android that is Chrome Custom Tabs
  (Android's `WebView` docs also warn not to let the user navigate to pages that are not yours:
  https://developer.android.com/develop/ui/views/layout/webapps/webview).
- Play rules (checked 2026-11-12):
  - Developer account: US$25 one-time, identity verification with government ID, age 18 or over
    (https://support.google.com/googleplay/android-developer/answer/6112435).
  - Personal accounts created after 2023-11-13 must run a closed test with at least 12 testers opted in continuously
    for at least 14 days before applying for production access
    (https://support.google.com/googleplay/android-developer/answer/14151465).
  - New apps and updates must target Android 16 (API level 36) or higher by 2026-08-31 (extensions possible to
    2026-11-01, which has passed) (https://support.google.com/googleplay/android-developer/answer/11926878). So
    `targetSdk` must be 36 or higher.

## Out of scope

- iOS (plan 0072), Wear OS, Android TV, Chromebook-specific work.
- Server push notifications (needs a server job and keys). Local scheduled reminders only.
- Running code, a code editor on the phone, in-app purchases, ads, analytics SDKs.
- Changes to the sync Worker (the redirect is already allowed). If the user later wants Android App Links
  (`https://` redirects), that is a new plan because it needs a Worker `ALLOWED_REDIRECTS` change and a deploy.
- A React Native / Expo rewrite.

## Open decisions (write the answer under *Open questions* before step 1)

1. **Application id.** Default `app.zendojo.mobile`. It cannot change after the first Play upload. The user may want a
   domain they own.
2. **Account type.** Personal (needs the 12 testers for 14 days) or organisation (needs a legal entity; the testing rule
   is for personal accounts only).
3. **Distribution.** Store, sideloaded APK only, or both.

## Steps

Targeted tests only (`pnpm exec vitest run <file>`, `pnpm -r typecheck`). Never run the full `pnpm test` during
the steps. Local commits only when the user asks; no push; no AI attribution.

- [ ] **1. Create the Capacitor project.** New workspace package `apps/mobile/` (add it to `pnpm-workspace.yaml` if
  `apps/*` is not already matched). Files: `package.json` (name `@habit/mobile`, dependencies `@capacitor/core`,
  `@capacitor/cli`, `@capacitor/android`, all `^8`), `capacitor.config.ts` (`appId`, `appName: "Zen Dojo"`,
  `webDir: "www"`, `server: { url: "https://zen-dojo-lovat.vercel.app" }`, `android.appendUserAgent: "ZenDojoApp/1"`),
  `www/index.html` (a minimal local page: logo and "Opening Zen Dojo..."), `tsconfig.json`, `.gitignore`
  (keystores, `android/app/build`, `local.properties`). Run `pnpm exec cap add android` so `apps/mobile/android/` is
  committed (generated Gradle project; no secrets).
  - Done when: `pnpm -r typecheck` passes and `apps/mobile/android/` exists with `targetSdk` (in
    `android/variables.gradle`) at 36 or higher.
- [ ] **2. Spike: does the remote site run in the shell?** Build a debug APK in Android Studio (user's machine or the CI
  job in step 10), open it on an emulator or phone. Verify: the site loads, bottom nav and the keyboard work, cookies
  persist after killing and reopening the app, external links open in the system browser, and the Back button goes
  back in the site's history (add `@capacitor/app` `backButton` handling: `window.history.back()` if possible, else
  exit). Record the result in *Implementation notes*.
  - Done when: the notes say what worked and what did not. If the remote site fails to behave (cookies, back button,
    bridge missing on the remote origin), stop and set the status to `blocked` with the finding; the fallback is the
    PWA from 0059.
- [ ] **3. User agent and app mode.** Confirm requests from the shell carry `ZenDojoApp/1` (see 0070 step 2,
  `apps/web/lib/app-shell.ts`). Log it once in a debug build only.
  - Done when: a request logged on the dev site shows the token, and the "Add to Home Screen" hint is hidden in the app.
- [ ] **4. Back button, status bar, splash, safe areas.** Add `@capacitor/status-bar` and `@capacitor/splash-screen`,
  set the status bar colour to the theme background `#1c1715` (match `apps/web/app/manifest.ts`), splash with the logo
  from `docs/branding`. Generate adaptive launcher icons from the logo (Android Studio Image Asset, or
  `@capacitor/assets` if its docs for v8 confirm it; **unverified**).
  - Done when: on a device the status bar matches the page, the splash shows for under 2 seconds, and the launcher icon
    is the Zen Dojo mark (adaptive and round).
- [ ] **5. Native GitHub sign-in (system browser).** Flow, which mirrors the desktop one:
  1. In the app, the sign-in button (client component `apps/web/app/components/app-sign-in.tsx`, rendered only when
     `isAppShell`) calls `fetch("/auth/start?app=1&format=json")`. Change `apps/web/app/auth/start/route.ts`: when
     `app=1` and the request is from the app shell, use `callbackUrl = "zendojo://auth/callback"` and, when
     `format=json`, answer `{ "url": "<Worker /auth/github/start URL>" }` instead of redirecting, still setting the
     `zd_pkce` cookie (so the verifier lives in the app's WebView).
  2. The component calls `Browser.open({ url })` from `@capacitor/browser` (the plugin docs say it uses the `androidx.browser` library, i.e. Custom Tabs, https://capacitorjs.com/docs/apis/browser, checked 2026-11-12).
  3. After GitHub, the Worker redirects to `zendojo://auth/callback?code=...&state=...`. Add an intent filter for
     scheme `zendojo`, host `auth`, path `/callback` to `AndroidManifest.xml`, with `launchMode="singleTask"` so the
     existing app instance receives it.
  4. A listener (`App.addListener("appUrlOpen", ...)` in a small client component `app-deep-links.tsx`) validates the
     URL with a copy of `parseAuthDeepLink` (move the pure function to `packages/shared/src/deeplink.ts`, import it from
     both the desktop and the web app, keep `apps/desktop/lib/deeplink.test.ts` passing), closes the Custom Tab with
     `Browser.close()`, and navigates to `/auth/callback?code=...&state=...` on the site origin. The cookie is there,
     so the existing callback route finishes the sign-in.
  - Done when: `pnpm exec vitest run apps/web/app/auth/auth-routes.test.ts packages/shared/src/deeplink.test.ts` pass
    with new cases (app mode returns JSON with the zendojo redirect; without `app=1` behaviour is unchanged; invalid
    deep links are rejected: extra params, wrong host, long values), and on a device a full sign-in works and survives
    killing the app. **Never** show the GitHub page inside the app's own WebView.
- [ ] **6. Guest mode and delete-my-data are reachable.** Check that signed-out users can browse (they can, hosted
  guest mode) and that Settings, Delete my data is reachable inside the app in two taps. Google requires an in-app
  deletion path and a web link for apps that create accounts (**unverified**, check Play's "account deletion" policy
  page at implementation time). `/privacy` from 0070 step 3 must mention the web path.
  - Done when: both are reachable by hand and the path is written in *Implementation notes*.
- [ ] **7. Offline lessons (shared with the PWA).** Lessons are the same for everyone, so they can be cached without
  user data. Add a build script `apps/web/scripts/build-offline-lessons.mjs` that renders lesson text from
  `packages/shared` (`LESSONS`) into plain static HTML plus an index under `apps/web/public/offline-lessons/` (no
  notes, no ticks, no per-user content, no scripts). Extend `apps/web/public/sw.js` to cache that
  folder only when the user taps "Save lessons for offline" on a new Settings card; still never cache any other HTML
  or any `/api/` request. Add the card in `apps/web/app/profile/settings/page.tsx`.
  - Done when: `pnpm exec vitest run apps/web/lib/offline-lessons.test.ts` passes (every lesson id has a file, no file
    contains the words "Delete my data" or user-specific markers, total size reported), and in airplane mode the saved
    lessons open from the offline page while `/` shows the offline screen.
- [ ] **8. Daily reminder and key storage.** Add `@capacitor/local-notifications` (a daily reminder at a time the user
  picks, set in a Settings card shown only in the app; no server, no push). Add Android 13+ notification permission
  handling (ask only when the user turns the reminder on). Move the BYOK AI key from `localStorage` to the Android
  keystore through a maintained secure-storage plugin (choose at implementation time and record the choice and its
  maintenance status; **unverified**), keeping `localStorage` as the fallback for the PWA.
  Add a share action (`@capacitor/share`) on lessons and problems that shares the page URL.
  - Done when: the reminder fires on a device at the chosen time with the app closed, can be turned off, and the key
    survives an app restart without being in `localStorage` (check via remote debugging at `chrome://inspect`).
- [ ] **9. Release build, signing and versioning.** Gradle `release` build type producing an AAB and a signed APK.
  `versionCode` increases with every upload and `versionName` follows `0.1.0`. Use Play App Signing; the user
  generates the **upload key** (see "Only you can do"). Keep the keystore out of the repo.
  - Done when: `./gradlew bundleRelease assembleRelease` succeeds with signing values read from environment
    variables or a git-ignored `keystore.properties`, and the build skips signing cleanly when they are missing
    (a debug-signed APK is produced instead), the same rule as `docs/signing.md`.
- [ ] **10. CI.** New `.github/workflows/android.yml`, triggered by tags `android-v*` and manual dispatch (never by
  the desktop `v*` tags): Node 22, JDK 21, Android SDK, `pnpm install`, `cap sync android`, build, upload the APK and
  AAB as workflow artifacts. Signing secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) are read only when present. Capacitor 8 needs JDK 21 and Android SDK 36
  according to a third-party upgrade guide (https://capawesome.io/blog/how-to-upgrade-your-capacitor-app-to-capacitor-8/,
  **not an official page**); confirm against Capacitor's own Android docs when writing the workflow.
  - Done when: a manual run on a branch produces a debug APK artifact.
- [ ] **11. Store listing material (files only).** Under `docs/store/android/`: `listing.md` (short description up to
  80 characters, full description, category Education, contact email placeholder), `data-safety.md` (answers drawn
  from the facts in 0070 step 3: collects GitHub id, name, avatar, learning progress, notes, saved code; stored on the
  developer's own infrastructure; AI key stays on device; no ads; no sale of data; deletion path),
  `screenshots.md` (list of the screens to capture on a phone and a 7 or 10 inch tablet), `testing.md` (how to run the
  closed test: recruit 12 testers, collect their Google accounts, opt them in for 14 days, what to ask them to do).
  - Done when: the four files exist and every claim in `data-safety.md` can be traced to a file or setting in the repo.
- [ ] **12. Docs.** `docs/mobile.md` gets an "Android app" section: install the APK (enable install from this source
  for one app only), update, sign in, what the app cannot do.
  - Done when: the section exists and is accurate for the built APK.
- [ ] **13. Tests and check.** `pnpm exec vitest run` on the files added above, `pnpm -r typecheck`, then `pnpm check`
  once at the end.
  - Done when: all pass.

## Acceptance criteria

- [ ] A signed release APK installs on a real Android phone and opens the hosted site full screen.
- [ ] GitHub sign-in completes through Chrome Custom Tabs and the `zendojo://auth/callback` deep link, and the user
  is signed in after restarting the app. No sign-in page is ever rendered inside the app's own WebView.
- [ ] Signed-out users can browse as guests.
- [ ] The Back button, keyboard and safe areas behave on a phone and a tablet.
- [ ] Offline lessons open without a connection; no signed-in page is cached.
- [ ] The daily reminder works with the app closed and can be switched off.
- [ ] The build targets API level 36 or higher and `versionCode` is set.
- [ ] No keystore, password or token is in the repo.
- [ ] `pnpm check` passes. No changes to the sync Worker.

## Pitfalls

- `appId` is permanent once uploaded.
- `server.url` means a new web deploy changes the app instantly (good) and a broken deploy breaks the app instantly
  (bad). Keep Vercel previews for testing; point debug builds at a preview URL through an environment variable in
  `capacitor.config.ts`.
- The custom scheme `zendojo://` can be claimed by another app on the phone. The PKCE verifier stays in the WebView
  cookie, so a hijacked code is useless, but keep the code validation strict and the state check unchanged.
- Cookies: if the session cookie is `Secure` and `SameSite=Lax`, check it survives in the Android WebView
  (step 2). If not, fix it in `apps/web/lib/auth/session.ts` rather than with a workaround in the shell.
- Never add `allowNavigation` for other hosts, and never use `addJavascriptInterface` with remote pages (Android docs
  warning, link in Context).
- Android 13 and later need a runtime permission for notifications; denying it must not break the app.
- The Play closed-test clock starts when 12 testers are opted in, not when the app is uploaded. Start recruiting early.
- Target API: re-check the target level on the Play page before each release; the requirement changes yearly.

## Only you can do

- Create a Google Play developer account (US$25), verify identity with a government ID and a card, and pass the
  device check through the Play Console mobile app. Decide personal or organisation.
- Create the upload keystore (`keytool`), keep a backup offline, and add the four `ANDROID_*` secrets in GitHub
  (Settings, Secrets and variables, Actions). Never share them in chat.
- Enrol Play App Signing when the console asks.
- Recruit 12 testers for 14 days if the account is personal.
- Fill the store listing, the Data safety form, the content rating questionnaire, the target audience and the
  privacy policy URL (`https://zen-dojo-lovat.vercel.app/privacy`). Use `docs/store/android/*` as the source.
- Provide a real contact email, screenshots, and a test device or emulator.
- Decide when to go from closed test to production.

## Open questions

(User: answer the three open decisions here.)

## Implementation notes

(Implementer fills in.)

## Review

(Reviewer fills in.)
