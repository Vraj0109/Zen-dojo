# 0079: Desktop sign-in after the move to Vercel (priority)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-14
- **Implemented by:** (implementer fills in)
- **Spec:** none

## Goal

Signing in from the desktop app works again, end to end, with the single GitHub OAuth app whose callback now points at
the Vercel site. When something does go wrong, the user sees which step failed and what to do, instead of being left on
a blank Vercel page or a generic "sign-in failed".

## Context

### How desktop sign-in works today (0.9.0)

1. Desktop window → local server `GET /auth/start` (`apps/web/app/auth/start/route.ts`). Because `HABIT_DESKTOP=1`
   (set in `apps/desktop/main.js`), the callback is `zendojo://auth/callback`. The route stores
   `{ state, verifier, next }` in the `zd_pkce` cookie and 302s to
   `https://zen-dojo-lovat.vercel.app/hub/auth/github/start?redirect_uri=zendojo://auth/callback&...`.
2. `main.js` sees the redirect to a hub origin (`isWorkerRedirect` + `hubOrigins` in `apps/desktop/lib/deeplink.js`),
   cancels it in the window (`will-redirect` → `preventDefault`) and opens it in the system browser.
3. Hub start (`packages/sync-worker/src/auth/oauth.ts` `start`, served on Vercel by `apps/web/app/hub/[...path]/route.ts`
   via `apps/web/lib/hub/handler.ts`) stores the state and 302s to GitHub. GitHub does not get a `redirect_uri`, so it
   always uses the OAuth app's registered callback URL: now `https://zen-dojo-lovat.vercel.app/hub/auth/github/callback`.
4. Hub callback (`oauth.ts` `callback`) looks the state up, exchanges GitHub's code, makes a one-time code and 302s the
   browser to `zendojo://auth/callback?code=…&state=…` (`backToApp`).
5. Windows starts a second app instance with that link; `second-instance` → `handleDeepLink` → the window loads
   `http://127.0.0.1:<port>/auth/callback?code&state` (`apps/web/app/auth/callback/route.ts`), which checks the
   `zd_pkce` cookie, posts to hub `/auth/token`, and sets `zd_at` / `zd_rt` / `zd_u`.

### What was checked while planning (2026-11-14)

- Installed app: `Zen Dojo.exe` 0.9.0 in `%LOCALAPPDATA%\Programs\HabitManager\Zen Dojo`.
- `zendojo://` is registered to that exe (`HKCU\Software\Classes\zendojo\shell\open\command`).
- The running desktop server's `/auth/start` redirects to the Vercel hub with `redirect_uri=zendojo://auth/callback`.
- The Vercel hub's `/auth/github/start` accepts that redirect and 302s to GitHub.
- The old Worker and the Vercel hub use the same GitHub client id.
- The desktop `server.log` has no auth lines at all: the callback route logs nothing, so the failure is invisible.
- Steps 3 to 5 could not be run by the planner (they need the user's GitHub sign-in).

### Why it breaks, and what is fragile

- **Older builds (0.8.x and earlier) cannot work any more.** They send the browser to the old Worker, which stores the
  state in D1. GitHub then sends the browser to the Vercel callback (the only registered URL), which has never seen
  that state and answers `invalid_state` on a Vercel page. This matches "it now opens the Vercel URL". Only an update
  fixes those builds; the hub can at least say so (step 5).
- **0.9.0 has three weak points**, any of which can produce the same symptom:
  1. The hub hands off to the app with a bare `302` to `zendojo://`. The browser tab is left on a blank
     `zen-dojo-lovat.vercel.app/hub/auth/github/callback` page with only the browser's own "Open Zen Dojo?" prompt.
     If that prompt is dismissed or blocked, nothing happens and the user is stuck on a Vercel page.
  2. The PKCE verifier lives only in the `zd_pkce` cookie set on the 302 whose navigation Electron cancels. If that
     cookie is not kept (or the window's cookie jar is cleared between start and callback), step 5 fails.
  3. Every failure in the local `/auth/callback` becomes `/login?error=state` with no log line, so nobody can tell
     which step failed.
- The desktop window shows nothing while the user is in the browser, so it looks like nothing happened.

### Do we need a second GitHub OAuth app?

No. With 0.9.0 and later, web and desktop both go through the Vercel hub, and the desktop gets back through the
`zendojo://` link that the hub issues itself. One OAuth app with the callback
`https://zen-dojo-lovat.vercel.app/hub/auth/github/callback` serves both. A second app would only be needed to keep the
old Cloudflare Worker signing in 0.8.x builds, which is not worth it (the Worker is being retired).

## Out of scope

- Keeping pre-0.9.0 builds working (no forwarding of unknown states to the old Worker).
- A second GitHub OAuth app, or any change to the OAuth app's settings.
- Changing web (browser) sign-in behaviour, apart from the clearer error messages, which it shares.
- Mobile apps (plans 0070 to 0072).
- Releasing: the lead bumps the version and tags only when the user asks.

## Steps

- [ ] **1. Name the failure: distinct error codes and one log line per failure.** In
  `apps/web/app/auth/callback/route.ts` replace the single `error=state` with these codes:
  `missing` (no code or state in the URL), `no_pkce` (no stored PKCE for this state), `state_mismatch`,
  `token_unreachable` (fetch threw), `token_refused` (non-OK, not 429), `rate_limited` (429, already exists),
  `token_bad` (OK but no tokens). Before each redirect, `console.error("auth callback: <code>")` with the HTTP status
  where there is one. Never log the code, state, verifier or tokens. In `apps/web/app/login/page.tsx` `errorText`,
  give each code one plain sentence and the next action, e.g. `no_pkce`: "This sign-in was started in another window
  or took longer than 10 minutes. Click Sign in again." Keep the old `state` text for links already out there.
  - Done when: each failure path redirects with its own code, prints one line, and `/login?error=<code>` shows its text.

- [ ] **2. Desktop: keep the PKCE verifier on the local server, not only in a cookie.** Add
  `apps/web/lib/auth/desktop-pkce.ts` with `rememberDesktopPkce(state, { verifier, next })` and
  `takeDesktopPkce(state)` (single use, deletes on read), held in a module-level `Map` on `globalThis` (the desktop
  server is one process), entries expire after 10 minutes, at most 20 entries (drop the oldest). In
  `auth/start/route.ts`, when `HABIT_DESKTOP === "1"`, call `rememberDesktopPkce` as well as setting the cookie. In
  `auth/callback/route.ts`, when `HABIT_DESKTOP === "1"` and the cookie is missing or its state differs, use
  `takeDesktopPkce(state)`. The state is 32 random bytes, so it is a safe key. Never use the map when
  `HABIT_DESKTOP` is not `1` (the hosted site has many users and instances).
  - Done when: on the desktop server a callback with a valid state works with no `zd_pkce` cookie, a second use of the
    same state fails with `no_pkce`, and the web path is unchanged.

- [ ] **3. Hub: a real hand-off page for the desktop link.** In `packages/sync-worker/src/auth/oauth.ts` `backToApp`,
  when the redirect is exactly `zendojo://auth/callback`, answer `200` with a small HTML page instead of a bare 302:
  title "Back to Zen Dojo", one line "Signed in. Switching back to the Zen Dojo app...", a large link/button
  "Open Zen Dojo" whose `href` is the `zendojo://` URL, a `<meta http-equiv="refresh" content="0;url=...">` to the same
  URL, and a line "You can close this tab once the app shows you as signed in." Headers: `content-type:
  text/html; charset=utf-8`, `cache-control: no-store`, `referrer-policy: no-referrer`,
  `content-security-policy: default-src 'none'; style-src 'unsafe-inline'`, `x-frame-options: DENY`. HTML-escape the URL
  (it contains `&`). Error hand-offs (`access_denied`, `github_failed`, `rate_limited`) to the desktop use the same page
  with "Sign-in did not finish. Open Zen Dojo to try again." No emoji; plain inline CSS that reads in light and dark.
  Web redirects (`http(s)`) keep the 302.
  - Done when: the hub callback for a desktop state returns the HTML page with the escaped link, and web callbacks still
    302.

- [ ] **4. Desktop window: show that sign-in continues in the browser.** In `apps/desktop/main.js`, after
  `shell.openExternal(target)` for a hub URL from `will-redirect`/`will-navigate`, load
  `${serverOrigin}/login?waiting=1` in the window. In `apps/web/app/login/page.tsx`, when `waiting=1`, show:
  "Finish signing in in your browser. Zen Dojo will switch back here when you are done." plus a "Start again" link to
  `/auth/start` and a "Cancel" link to `/`. Put the "should we show the waiting page for this URL" check in
  `apps/desktop/lib/deeplink.js` as a pure function (`isSignInHandoff(url, origins)`: a hub origin and a path ending in
  `/auth/github/start`) so it is tested; other hub URLs keep today's behaviour.
  - Done when: clicking Sign in on desktop opens the browser and the window shows the waiting text; finishing in the
    browser replaces it with the signed-in app.

- [ ] **5. Hub: explain an unknown or expired state.** In `oauth.ts` `callback`, when the state is not found or has
  expired, answer `400` with the same HTML page style (not JSON): "This sign-in link has expired or was started by an
  older Zen Dojo desktop app. If you use the desktop app, update it to version 0.9.0 or later (Help, then Check for
  updates, or download it from the releases page), then sign in again." Link the releases page
  `https://github.com/Vraj0109/Zen-dojo/releases/latest`. Keep `noteAuthFailure` as is. Keep JSON for API-style callers
  only if a test depends on it; the callback is only ever opened by a browser.
  - Done when: opening the hub callback with an unknown state shows that page with status 400.

- [ ] **6. Tests.** Extend:
  - `apps/web/app/auth/auth-routes.test.ts`: each new error code; desktop start stores the PKCE in the map; desktop
    callback works with no cookie; the map entry is single use and expires (fake `Date`); web mode never reads the map.
  - `packages/sync-worker/src/auth/routes.test.ts` (or the oauth test that already covers `callback`): desktop
    hand-off returns 200 HTML with the escaped `zendojo://` link and the security headers; web hand-off still 302;
    unknown state returns the 400 HTML page.
  - `apps/web/lib/hub/hub-e2e.test.ts`: one full desktop round trip with `redirect_uri=zendojo://auth/callback` (start,
    callback reads the link out of the page, token exchange succeeds).
  - `apps/desktop/lib/deeplink.test.ts`: `isSignInHandoff` true for both hub origins' `/auth/github/start` (with and
    without the `/hub` prefix) and false for look-alike hosts and other paths.
  - Done when: these files pass with `pnpm exec vitest run <file>`.

- [ ] **7. Docs.** In `docs/hosted-architecture.md` (sign-in section) describe the desktop path as above, the hand-off
  page, and that one OAuth app serves web and desktop. In `apps/web/lib/faq.ts` add or update the entry "Desktop sign-in
  opens the website and stops": update to the latest version; click "Open Zen Dojo" on the page if the browser asks.
  - Done when: both are updated in plain language.

## Acceptance criteria

- [ ] With a build containing this change, desktop sign-in completes: browser opens, GitHub, hand-off page, the app
      shows the user signed in, and sync starts. (User checks on their machine; the lead builds a test installer only
      when asked.)
- [ ] Web sign-in on https://zen-dojo-lovat.vercel.app still works after the hub deploy.
- [ ] A failed desktop sign-in shows a specific reason on `/login` and writes one line to `server.log`, with no
      secrets.
- [ ] A pre-0.9.0 sign-in attempt lands on a page that tells the user to update.
- [ ] No new GitHub OAuth app and no OAuth app setting change is needed.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
