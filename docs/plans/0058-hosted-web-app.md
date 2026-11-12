# 0058: Hosted web app (sign in, see and track your progress in a browser; no code running on the server)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (implementer fills in)
- **Spec:** builds on 0049 (accounts), 0050 (sync), 0032 (hosted roadmap, older and broader)
- **Estimate at this project's pace:** two rounds (about 1 to 2 days of agent time). Your own setup steps (hosting
  account, database account, domain) are on top and depend on you.

## Goal

Zen Dojo also runs at a web address. You sign in with the same GitHub account as the desktop app and see the same
progress, notes, plan and lessons on any computer or phone. You can mark things done and write notes.

**Running C++, Java or JavaScript on the server is deliberately not part of this plan.** On the hosted site the Run
and Submit buttons say "Running code is available in the desktop app". The reasons and the future options are in
step 1's decision record. This keeps the hosted site cheap, safe and quick to ship.

## Context (verified)

- The app is a Next.js 16 server with one local libSQL database (`apps/web/lib/db.ts`, `getDb()`, migrations in
  `MIGRATIONS`, tracked by `PRAGMA user_version`). It can already use a remote libSQL database through `DATABASE_URL`
  and `DATABASE_AUTH_TOKEN` (`docs/hosting.md`), but that holds **one person's** data.
- Accounts, sessions and the sync API already exist in the Worker (`packages/sync-worker`, D1). Sign-in goes through
  the Worker with GitHub; the Next app keeps cookies `zd_at`, `zd_rt`, `zd_pkce`, `zd_u` (`apps/web/lib/auth/*`).
  The Worker only accepts redirects to its own allow-list: `isAllowedRedirect` in
  `packages/sync-worker/src/auth/oauth.ts`, extended through the `ALLOWED_REDIRECTS` Worker variable.
- The sync engine (`apps/web/lib/sync-engine.ts`: `runSync(opts)`, `linkAccount(userId, db?)`, `getSyncStatus`) already
  takes an optional database client. That is the key idea below.
- Judge routes live under `apps/web/app/api/judge/**` and the editor's Run buttons call them
  (`apps/web/lib/judge/run.ts` spawns `g++`, `javac`, `java`, `node` on the machine that runs the server).
- Admin pages (`/admin/**`) edit content in the database and are gated by `ADMIN_USER_IDS` through `requireAdmin()`.
- AGENTS.md conventions that apply: never put credentials or the Worker's secrets in the repo; secrets are set by the
  user (`wrangler secret put`, host dashboard); never touch `data/habit.db`; Next 16 `cacheComponents` rules; schema
  changes only by appending migrations.

## Design (decided; step 1 writes it down and checks the facts that were assumed)

**The hosted site is "another device".** Each signed-in user gets **their own libSQL database** on the hosted side
(database per user, for example on Turso). The existing sync engine keeps that database in step with the cloud copy
(the Worker's D1) exactly like a desktop does. So the desktop, the hosted site and any second computer all agree, and
**no existing query is rewritten** to carry a `user_id`.

- `getDb()` becomes `getDb()` for desktop/local (unchanged) and, when `HABIT_HOSTED=1`, resolves the current user's
  client from the session (`getDbFor(userId)`), cached per process.
- A small control database (`CONTROL_DATABASE_URL`) maps `user_id` to the user's database name/URL. First sign-in
  provisions one database through the provider's API, runs `MIGRATIONS`, links the sync (`linkAccount`) and pulls.
- No background poller on serverless hosting: sync runs **on request** (throttled to once per 20 seconds per user,
  using the Worker's cheap `GET /api/sync/head` check) and **after each mutation** (`after()` from `next/server`).
- Hosting target for the Next app: default **Vercel** (best fit for Next 16 `cacheComponents`); Cloudflare via OpenNext
  is the alternative. Step 1 confirms with a deploy of the real app and records the decision.
- **No server-side code execution.** In hosted mode every judge/run route returns `403 { ok:false, error:"hosted-no-run" }`
  and the UI explains it. Future options, in order: (1) JavaScript only, in a sandboxed browser Worker; (2) a separate
  sandboxed runner service (gVisor/Firecracker-style isolation, no network, hard CPU/memory/time caps, per-user quotas)
  as a later paid or invite-only feature; (3) C++ as WebAssembly (rejected in plan 0034 for speed and size).
  Running strangers' code on your servers is the biggest risk of this project, so it needs its own plan.
- Admin pages are **disabled in hosted mode** for now (content edits would need a shared content database).

## Out of scope

- Running any user code on the server; the JavaScript-in-browser runner (a follow-up plan); the admin portal on the
  hosted site; billing; custom domains beyond one; teams or sharing; email.
- The phone experience beyond what already works (plan 0059).

## Steps

Targeted tests only; the lead runs one `pnpm check`. Local commits with explicit paths; no push, no attribution.
Suggested split: Agent A steps 1 to 4; Agent B steps 5 to 7; Agent C step 8 and docs.

- [ ] **1. Decision record `docs/hosted-architecture.md`.** Verify against the providers' **current** docs (do not
  rely on memory): per-user databases on Turso (creation API, limits, free-tier database count, token model: one group
  token vs per-database tokens), Vercel Hobby limits and terms (non-commercial), libSQL over HTTP from serverless.
  Record the choice (default above), why shared-database-with-`user_id` and in-browser SQLite were rejected (rewrites
  every query / heavy and unproven), the cost ceiling per active user, and what happens when free limits are hit.
  - Done when: the file exists, each claim names the page it was checked on, and it lists the env vars needed
    (`HABIT_HOSTED`, `CONTROL_DATABASE_URL`, `CONTROL_DATABASE_AUTH_TOKEN`, `TURSO_API_TOKEN`, `TURSO_ORG`,
    `TURSO_GROUP`, `SYNC_WORKER_URL`).
- [ ] **2. `lib/hosted.ts`** with `isHosted()` (reads `HABIT_HOSTED === "1"`), and `lib/hosted/control.ts`
  (control DB schema `hosted_users(user_id TEXT PRIMARY KEY, db_url TEXT NOT NULL, created_at TEXT NOT NULL)`, created with
  `CREATE TABLE IF NOT EXISTS`, get/insert).
  - Done when: unit tests with `:memory:` pass: insert, get, double insert is a no-op.
- [ ] **3. Provisioning and per-user client** `lib/hosted/provision.ts` and a change in `lib/db.ts`:
  `provisionUserDb(userId)` calls the provider API (stubbed `fetch` in tests), waits until ready, returns the URL;
  `getDbFor(userId)` caches the client in a `Map` (cap 50, drop the oldest), runs pending `MIGRATIONS` on first use per
  process (use the existing runner), and never logs tokens. `getDb()` calls `getDbFor` only when `isHosted()`.
  - Done when: tests with a stubbed provider cover first sign-in (creates), second (reuses), provider failure (a plain
    error the page can show, nothing cached), and that two users get different clients.
- [ ] **4. Require sign-in and bind the user.** In hosted mode `apps/web/app/layout.tsx` (or the existing shell
  gate) redirects signed-out visitors to a plain landing/sign-in page `apps/web/app/welcome/page.tsx` (what the app is, a
  "Continue with GitHub" button using the existing `/auth/start`); server actions and route handlers call a shared
  `requireUserDb()` that returns the session user's client or throws a 401.
  - Done when: signed out, every page except `/welcome` and `/auth/*` redirects; signed in, `getDb()` returns that
    user's database (test with a fake session).
- [ ] **5. Sync as a device.** `lib/hosted/sync.ts`: `syncOnRequest(userId)` (throttle 20 s in memory per user, head
  check first, then `runSync({ db })`) called from the root server component for signed-in hosted users, and
  `syncAfterMutation(userId)` through `after()` inside the existing `refresh()` helper path (or each action; pick the
  single place that all mutating actions already pass through). First sign-in: `linkAccount(userId, db)` then a pull.
  - Done when: an end-to-end test (reuse `apps/web/lib/sync-e2e.test.ts` setup) shows a row written by a "desktop"
    appears in the hosted user's database after `syncOnRequest`, and a hosted write reaches the Worker.
- [ ] **6. No code running.** In hosted mode, `apps/web/app/api/judge/**` and any other route that spawns a program return
  403 `hosted-no-run` before doing anything. In the UI (`judge-workspace.tsx`, the Run and Submit buttons, the LLD
  Java project editor's Run) show a single plain notice "Running code is available in the desktop app" with a link to
  the downloads page and keep editing, saving and reading working.
  - Done when: a test proves the routes return 403 with `HABIT_HOSTED=1` and still work without it; the notice renders.
- [ ] **7. Worker allow-list and docs.** Add the hosted origin to the Worker's `ALLOWED_REDIRECTS` variable in
  `packages/sync-worker/wrangler.jsonc` (a plain `vars` entry, no secrets) and a GitHub OAuth callback note in
  `docs/hosted-architecture.md`. Write `docs/hosting.md` "Hosted Zen Dojo" section: every env var, which are secrets,
  the first-deploy checklist (deploy the Worker first, then the site), and "what is not available hosted".
  - Done when: `pnpm exec vitest run packages/sync-worker` passes with a test that the hosted origin is accepted and
    a look-alike origin (`https://zen.example.evil.com`) is refused.
- [ ] **8. Hide what hosted cannot do:** in hosted mode hide the extension pairing, "Import database", backup
  download of the *local file*, the Desktop updates box and `/admin` links; keep Account and Delete cloud data. Add
  `isHosted()` guards in the pages that render them.
  - Done when: each hidden item has a one-line test or a typecheck-visible guard, and `/admin` returns 404 hosted.

## Acceptance criteria

- [ ] On a hosted deploy, signing in with the account you use on the desktop shows the same solved problems, notes
  and plan position (after the first sync).
- [ ] Ticking a task on the website shows up on the desktop within one sync, and the other way round.
- [ ] A second GitHub account sees an empty, separate set.
- [ ] Run and Submit say they are desktop-only and never reach a server process; the judge routes return 403.
- [ ] No secret is in the repo; `docs/hosting.md` lists what to set.
- [ ] `pnpm check` passes.

## Pitfalls

- Never run the migrations of two app versions against the same database at once; deploy the new version, then let
  per-user databases migrate lazily on first use.
- Serverless cold starts: keep `getDbFor` cheap, no work at import time.
- The Worker rate limits apply to the hosted site as one client per user; keep the 20 s throttle.
- A hosted database is user data: no logging of rows or tokens; delete-my-data (plan 0054) must also drop the hosted
  database when the user closes the account (add a hook, test with the stub).

## Open questions

- Which hosting account and domain? (User decides at deploy; code does not depend on it.)

## Implementation notes

### 2026-11-12: hosting moved to Vercel and Turso

The Cloudflare Workers attempt (OpenNext, a Durable Object per user, the anonymous cookie and `proxy.ts`, the deploy-web
workflow) was removed: Workers Free allows 10 ms CPU per request and pages measured 80 to 1200 ms. The site now targets
Vercel Hobby with one Turso database per signed-in user; signed-out visitors get a throwaway in-memory guest database.
`docs/hosted-architecture.md` and the hosted section of `docs/hosting.md` were rewritten to match. Older notes below
that mention Workers, Durable Objects or the anonymous cookie are historical.

### Steps 5 to 8 (Agent B)

- Step 5: `lib/hosted/sync.ts` (`syncOnRequest`, `syncAfterMutation`, 20 s throttle, links the database on first
  sign-in, never throws; the engine's own head check is the cheap check). `lib/hosted/refresh.ts` is a drop-in
  `refresh()` that also schedules `syncAfterMutation` through `after()`; `app/actions.ts` now imports it (one line).
  `app/components/hosted-sync.tsx` (`HostedSyncOnRequest`) must be mounted once in `layout.tsx` inside `<Suspense>`
  (not mounted by me: layout belongs to another agent). Admin/tools actions still use `next/cache` refresh.
  Tests: `lib/hosted/sync.test.ts` (desktop row reaches the hosted db, hosted write reaches the Worker, throttle,
  account mismatch, Worker down).
- Step 6: `lib/hosted/no-run.ts` (`hostedNoRun()` 403 `{ ok:false, error:"hosted-no-run", message }`) guards
  `api/judge/run` (GET and POST), `api/judge/run-project` and `api/tools/{install,remove,status}`. AI routes already
  disabled hosted via `guardAi`. UI: `app/components/hosted-run-notice.tsx` (`FailureText`) shows the notice with a
  download link in `judge-workspace.tsx` and `project-editor.tsx` (one-line changes). Test: `lib/hosted/no-run.test.ts`.
- Step 7: look-alike test in `packages/sync-worker/src/auth/routes.test.ts`. `ALLOWED_REDIRECTS` stays empty in
  `wrangler.jsonc` on purpose: the site address is unknown and a guessed host could be claimed by someone else; set at
  deploy (documented). `docs/hosting.md` has the "Hosted Zen Dojo" section; OAuth note added to `docs/hosted-architecture.md`.
- Step 8: settings page hides the extension card (and skips `getExtensionStatus`), and the whole Backup block
  (download and restore) when hosted; `api/ext/*` and `api/backup/restore` return 404 hosted; `/admin` layout calls
  `notFound()` hosted. There is no "Desktop updates box" in the web app (updates live in Electron), so nothing to hide.
  The account page's own backup link (`delete-data.tsx`) and the admin link in `account-popover.tsx` are not touched.

Agent A, steps 1 to 4 (status left `ready`/in-progress; steps 5 to 8 belong to others).

- Step 1: `docs/hosted-architecture.md`. Token model and libSQL-over-HTTP pages were not fetched: marked unverified.
- Step 2: `lib/hosted/control.ts` (+test). `isHosted()` already existed.
- Step 3: `lib/hosted/provision.ts` (+test): `provisionUserDb`, `mintDbToken` (1-day per-database token), `ensureUserDbUrl`.
  `lib/db.ts`: `getDbFor(userId, deps?)` with a 50-entry Map, lazy migrate, no cache on failure; `getDb()` hosted branch
  uses a dynamic import of `lib/hosted/require-user-db.ts`. Tests in `lib/hosted/user-db.test.ts`.
- Step 4: the gate is `apps/web/proxy.ts` (Next 16 proxy) plus pure `lib/hosted/gate.ts` (+test), so `layout.tsx` was not
  touched. The proxy only checks that a `zd_at`/`zd_rt` cookie exists; pages still verify the session. `/api/*` is open
  at the proxy and relies on `requireUserDb()` (401). `app/welcome/page.tsx` links to `/auth/start`.
  Server actions already call `getDb()`, so they are bound to the user through the hosted branch.
- Tests: `pnpm.cmd exec vitest run apps/web/lib/hosted` passes; `pnpm.cmd -r typecheck` and eslint on changed files clean.
- Left: the hosted `getDb()` test only proves the branch is taken; `/login` still exists beside `/welcome`.

## Review
