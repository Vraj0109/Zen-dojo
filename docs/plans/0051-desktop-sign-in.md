# 0051: Sign in from the desktop app (deep link back into the app)

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-10
- **Implemented by:** (implementer fills in) Claude Code agents A and B, Antigravity agent D (see "Agents")
- **Spec:** extends plan 0049 (accounts)
- **Priority:** 1 (do first)

## Goal

In the installed desktop app, "Continue with GitHub" opens your normal browser, you approve, and you land **back in the
desktop app, signed in**. Today the browser finishes the sign-in and shows `localhost:3000`, and the app window stays
signed out.

## Context (why it fails today, verified)

- The desktop window loads the bundled Next server on `http://127.0.0.1:<port>` (`apps/desktop/main.js`, port from
  `pickPort`, default 3000). Links to other origins open in the system browser (`isExternal` in `lib/setup.js`,
  `will-navigate` and `setWindowOpenHandler`), so the Worker's GitHub URL leaves the app.
- The sign-in finishes in that browser: GitHub sends it to the Worker, and the Worker redirects it to
  `http://127.0.0.1:<port>/auth/callback?code=...`. The system browser (not Electron) loads that page, and the session
  cookies (`zd_at`, `zd_rt`) are stored in the **browser's** cookie jar. The `zd_pkce` cookie that the callback needs
  was set in **Electron's** jar, so even on the right port the exchange would fail with `state`.
- If another process (such as `pnpm dev`) uses port 3000, the browser shows that app instead.
- `main.js` already has `requestSingleInstanceLock` and a `second-instance` handler (focus only).

## Design (decided)

- Use a **custom protocol**, `zendojo://`, as the way back into the app. The desktop flow:
  1. The app window opens `/auth/start`. The Next server knows it runs inside the desktop app because `main.js` passes
     `HABIT_DESKTOP=1` in its environment. In that mode `start` sets `zd_pkce` (in **Electron's** session), uses
     `redirect_uri=zendojo://auth/callback`, and redirects to the Worker as today.
  2. `main.js` catches the redirect to the Worker host with a `will-redirect` handler on the window, cancels it and
     opens that URL in the system browser (`shell.openExternal`). The browser does GitHub and the Worker.
  3. The Worker redirects the browser to `zendojo://auth/callback?code=...&state=...`. The OS starts or focuses
     Zen Dojo and hands it the URL (macOS: `open-url`; Windows and Linux: the `second-instance` event's `argv`, or
     `argv` at first launch).
  4. `main.js` checks the URL (exactly `zendojo:`, host `auth`, path `/callback`, only `code` and `state`), then loads
     `http://127.0.0.1:<port>/auth/callback?code=...&state=...` **in the app window**. That request carries the
     `zd_pkce` cookie from step 1, exchanges the code, sets the session cookies in Electron's jar and redirects home.
- **Worker:** allow exactly the redirect `zendojo://auth/callback` (and nothing else with that scheme). Everything else
  in `isAllowedRedirect` stays. PKCE (code verifier held only by the app) means a program that intercepts the
  `zendojo://` URL still cannot redeem the code.
- Web sign-in (browser) is unchanged.
- Dev mode (`devMode`, `pnpm desktop:dev`): register the protocol with `app.setAsDefaultProtocolClient("zendojo",
  process.execPath, [path.resolve(process.argv[1])])` so it works unpackaged. Not required to be perfect.

## Out of scope

- Any change to refresh-token rules, session length, admin, or the sync engine.
- A "paste a code" fallback; Linux desktop environments that do not register protocol handlers for AppImage (note it
  in the release notes instead).
- Code signing.

## Agents and file ownership (zero overlap)

Targeted tests only; the lead runs one `pnpm check` at the end. Plain-English local commits with explicit
`git add <paths>`; no push, tag or attribution; never touch `data/habit.db`. Read each file once, edit, verify once.

| Agent | Owns | Fast check |
|---|---|---|
| **A** (Claude) Worker | `packages/sync-worker/src/auth/oauth.ts`, `src/auth/routes.test.ts` (add cases), `packages/sync-worker/wrangler.jsonc` (no change expected; note only) | `pnpm exec vitest run packages/sync-worker` |
| **B** (Claude) Web | `apps/web/app/auth/start/route.ts`, `apps/web/app/auth/callback/route.ts`, `apps/web/app/auth/auth-routes.test.ts`, `apps/web/lib/auth/util.ts` | `pnpm exec vitest run apps/web/app/auth apps/web/lib/auth` + typecheck |
| **D** (Antigravity) Desktop | `apps/desktop/main.js`, `apps/desktop/lib/deeplink.js` (new), `apps/desktop/lib/deeplink.test.ts` (new), `apps/desktop/electron-builder.yml`, `apps/desktop/package.json` (only the build `protocols` or scripts, not the version) | `pnpm exec vitest run apps/desktop` + `pnpm --filter desktop typecheck` |

## Steps

### Agent A: Worker

- [ ] **A1. Allow the app's deep link.** In `isAllowedRedirect` accept exactly `zendojo://auth/callback` (no query, no
  fragment, no userinfo, no port, no extra path, case-exact). Keep every existing rejection. Make sure `backToApp`
  builds the redirect with a plain `Location` header for a non-http scheme (some runtimes reject `Response.redirect`
  for custom schemes; use `new Response(null, { status: 302, headers: { location } })`).
  - Done when: tests show `zendojo://auth/callback` is accepted and the code and state arrive in the `Location`;
    `zendojo://auth/callback/x`, `zendojo://evil/callback`, `zendojo://auth/callback?x=1`, `zendojo2://auth/callback`
    and `javascript:` are rejected; existing redirect tests still pass.
- [ ] **A2. Note for the user.** In the test file or a code comment: no new secret or var is needed; the rule is code, not
  config. Deploy happens by pushing (the deploy workflow).

### Agent B: web routes

- [ ] **B1. Desktop mode in `start`.** When `process.env.HABIT_DESKTOP === "1"`, use `redirect_uri =
  "zendojo://auth/callback"` instead of the request origin. Everything else (state, PKCE, `zd_pkce` cookie, `next`
  validation) stays. Add the cookie `maxAge` of 600 s as today.
  - Done when: tests show the Worker redirect carries `redirect_uri=zendojo%3A%2F%2Fauth%2Fcallback` in desktop mode
    and the loopback URL otherwise.
- [ ] **B2. `callback` stays origin-agnostic.** It already reads `code` and `state` from the query and the cookie; confirm it
  never compares against the request origin. If it does anywhere (including `apps/web/lib/auth/util.ts`), remove that
  dependence for this path. After success redirect to the validated `next` as today.
  - Done when: a test calls the callback with the `zd_pkce` cookie and `code`/`state` and gets session cookies and a
    redirect, regardless of the `Host` header.
- [ ] **B3. Keep web sign-in working.** Add a test that with `HABIT_DESKTOP` unset the loopback redirect is used.
  - Done when: both modes are covered.

### Agent D: desktop

- [ ] **D1. `lib/deeplink.js` (pure, tested).** Export `PROTOCOL = "zendojo"`, `parseAuthDeepLink(url)` returning
  `{ code, state } | null` (only `zendojo://auth/callback`; `code` and `state` each non-empty and at most 512 chars
  of `[A-Za-z0-9_-]`; reject anything else, including extra params, userinfo, other hosts, other paths), `findDeepLink(argv)` returning the first
  argument that starts with `zendojo://`, and `isWorkerRedirect(url, workerOrigin)`.
  - Done when: unit tests cover valid, extra params, wrong host or path, oversized values, bad characters,
    argv with and without a link, and the Worker-origin check.
- [ ] **D2. `main.js` wiring.**
  - Pass `HABIT_DESKTOP: "1"` in the server `env`. `AUTH_WORKER_URL` is read from the same env if set; derive the
    Worker origin from it with the same default as `apps/web/lib/auth/jwks.ts` (`https://zen-dojo-sync.habit-sync-worker.workers.dev`).
  - Register the protocol: `app.setAsDefaultProtocolClient(PROTOCOL)` (dev: with the execPath and script args).
  - On the window `webContents`, add `will-redirect`: if the target is the Worker origin, `preventDefault()` and
    `shell.openExternal(target)`. Also handle `will-navigate` to the Worker origin the same way (it already opens
    external links; keep that).
  - Deep link receipt: macOS `app.on("open-url", ...)` (call `event.preventDefault()`); Windows and Linux in the
    existing `second-instance` handler read `findDeepLink(argv)`, and at first launch check `process.argv`. If the window or the server is not ready yet, keep the link and handle it after
    `openWindow`. Handling = `parseAuthDeepLink`; if valid, `win.loadURL(`${origin}/auth/callback?code=...&state=...`)`
    (build with `URLSearchParams`), then focus the window; if invalid, ignore it and log nothing sensitive.
  - Never log the code or state.
  - Done when: manually (see Acceptance), plus unit tests of `deeplink.js`.
- [ ] **D3. Packaging.** In `electron-builder.yml` add `protocols: [{ name: "Zen Dojo", schemes: ["zendojo"] }]` (this
  registers it on macOS and in the Windows installer); for Linux AppImage note in `docs/troubleshooting.md` that
  the link works only when the desktop environment handles `zendojo://` (the AppImage can integrate it via
  AppImageLauncher). Edit only the protocols block and the troubleshooting note (`docs/troubleshooting.md` is also owned by Agent D for this plan).
  - Done when: `electron-builder` config parses (`pnpm --filter desktop exec electron-builder --help` is not
    needed; just keep YAML valid), and the troubleshooting note exists.

### Final (lead)

- [ ] **Z1.** Pull the commits, `pnpm -r typecheck`, one `pnpm check`. Deploy the Worker by pushing.
- [ ] **Z2.** Build an installer by pushing a tag only when the user says so (this changes the app that people download).

## Acceptance criteria

- [ ] In the installed Windows app, Account or the sidebar "Sign in" opens the system browser; after approving,
      the app window is signed in (name and avatar in the sidebar) without any browser tab left on `localhost`.
- [ ] Works when another program is using port 3000 (the app picks another port).
- [ ] If the app was closed, clicking through the browser's "Open Zen Dojo" prompt starts it signed in.
- [ ] Browser sign-in at `http://127.0.0.1:3000` still works.
- [ ] A hand-made `zendojo://auth/callback?code=x&state=y` with no matching `zd_pkce` cookie shows the sign-in error,
      not a signed-in state; other `zendojo://` URLs do nothing.
- [ ] `pnpm check` passes.

## Pitfalls

- The browser asks "Open Zen Dojo?" the first time; that is normal and cannot be removed.
- On Windows the protocol is registered by the **installer**, so test with an installed build, not only `pnpm desktop:dev`.
- `HABIT_DESKTOP` must only be set by `main.js`; the hosted web build must never set it.
- Do not run `pnpm desktop:build` (about 10 minutes and heavy on memory). Releases build on GitHub when a tag is pushed.
- Refresh tokens rotate and only route handlers may refresh; this plan does not change that.

## Open questions

(Implementer: write questions here and set the status to `blocked`.)

## Implementation notes

(Each agent adds its own subsection.)

## Review

(Reviewer fills in.)
