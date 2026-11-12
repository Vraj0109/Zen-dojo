# 0073: Move the sync Worker and D1 to Vercel and Turso (four agents)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-12
- **Implemented by:** (four agents; each fills its own part of *Implementation notes*)
- **Builds on:** 0044 / 0050 (cloud sync), 0049 (accounts), 0058 (hosted site), 0069 (public profile)
- **Estimate:** one round for four agents (about half a day of agent time). Your own steps are listed in "Only the user can do".

## Goal

Everything runs on **Vercel (the site and its API) and Turso (data)**. The Cloudflare Worker `zen-dojo-sync` and the D1 database
`zen-dojo-db` are retired. The desktop app, `pnpm dev` and the website sign in and sync through the website's own API.
Nothing the user sees changes: same GitHub sign-in, same sync, same public profile.

## Context (verified, 2026-11-12)

- **The Worker** (`packages/sync-worker/src`, about 2,500 lines with tests) is plain `fetch(request, env, ctx)` code. It uses only
  WebCrypto, `fetch` and **D1** (`env.DB.prepare(sql).bind(...).first() / .all() / .run()` and `env.DB.batch([...])`), three
  rate-limit bindings (`env.RL_AUTH`, `env.RL_SYNC`, `env.RL_IP`) and `ctx.waitUntil`. Routes: `/auth/*` and
  `/.well-known/jwks.json` (`src/auth/routes.ts`), `/api/sync*` (`src/index.ts`), `/api/profile/public` and
  `/api/public/u/:id` (`src/profile.ts`), abuse guard (`src/guard/`). D1 tables come from `migrations/0002` to `0006`
  (and `schema.sql`).
- **The idea of this plan:** do not rewrite the Worker. Run the same code inside the Next app, behind a small adapter that
  makes **Turso look like D1**, and point every client at the new address. The protocol, the tokens and the table shapes do
  not change, so the desktop sync client keeps working.
- **Where clients find the Worker today:** `AUTH_WORKER_URL` / `SYNC_WORKER_URL` (default
  `https://zen-dojo-sync.habit-sync-worker.workers.dev`) in `apps/web/lib/auth/jwks.ts`, `apps/web/lib/auth/session.ts`
  (`workerFetch`), `apps/web/lib/public-profile.ts`, `apps/web/lib/sync-engine.ts`, and `workerOrigin` in `apps/desktop/main.js`
  (deep links, `lib/deeplink.js`).
- **Turso limits learned the hard way (2026-11-12), apply them to all new code:** Turso refuses `PRAGMA user_version = N`
  ("SQL not allowed statement") and `BEGIN ... COMMIT` scripts over HTTPS. Keep schema versions in a table
  (`zd_schema_version`, see `migrateRemote` in `apps/web/lib/db.ts`) and use `client.batch([...], "write")` for atomic groups.
  Free plan: 100 databases, 5 GB, 10 million rows written a month (`docs/hosted-architecture.md`).
- **Paths:** the site already has `/auth/start` and `/auth/callback` (its own cookie sign-in). So the Worker's routes are mounted
  under the prefix **`/hub`** (for example `/hub/auth/github/start`, `/hub/api/sync/push`). The client base URL becomes
  `https://<site>/hub`. Clients build URLs as `base + path`, so the prefix lives in the base.
- AGENTS.md rules apply: targeted tests only, the lead runs one `pnpm check`, never touch `data/habit.db`, no secrets in the
  repo, no emoji.

## Design (decided)

1. **Hub database** = one new Turso database, `zen-dojo-hub`, with the same multi-tenant schema as D1 (`user_id` columns).
   Versioned with `zd_schema_version`.
2. **D1 shim** `createD1FromLibsql(client): D1Database` implements only what the Worker calls: `prepare().bind().first()/all()/run()`
   (`results`, `meta.changes`, `meta.last_row_id`), `batch()` (as one atomic `client.batch(..., "write")`), `exec()` if used.
3. **Rate limits:** `RL_*` bindings are replaced by a small table in the hub (`rate_counters(key, window_start, count)`) behind the
   same `{ limit({key}) -> {success} }` shape. Limits stay 20/60/300 per 60 s as in `wrangler.jsonc`.
4. **Mount:** `apps/web/app/hub/[...path]/route.ts` (Node runtime, all HTTP methods) calls the Worker's `fetch` with an `env`
   built from `process.env` and the shim, and `ctx.waitUntil` implemented with Next's `after()`.
5. **Secrets** move from Worker secrets to Vercel environment variables (same names): `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
   `JWT_PRIVATE_JWK`, `JWT_PUBLIC_JWK`, `ADMIN_USER_IDS`, `ALLOWED_REDIRECTS`, `ALLOWED_ORIGIN`, plus `HUB_DATABASE_URL`,
   `HUB_DATABASE_AUTH_TOKEN`. The user sets them (see below); agents never see values.
6. **The hosted site stays a "device" of the hub** (as in 0058), but talks to the hub in-process or via `/hub` on itself. Removing
   the duplicate copy (hub and per-user Turso database) is a later plan, not this one.
7. **Cutover:** a short freeze, export D1, import into the hub, switch the clients' default base URL in a new desktop release.
   The Worker stays up (read only, untouched) until the new desktop version is installed, then it is deleted.

## Out of scope

- Removing the per-user Turso copy of the site, changing the sync protocol, moving off GitHub sign-in, rewriting Worker logic.
- Releasing the desktop app, deleting the Worker or D1, revoking Cloudflare tokens: the **lead** does these after verification.
- Any real Turso, Vercel or GitHub call that needs a secret: agents test with local libSQL files (`file:` URLs in a temp
  folder) and `:memory:`.

## Contracts between the agents (code against these names; do not change them without telling the lead)

| Name | Where | Owner |
| --- | --- | --- |
| `getHubDb(): Promise<Client>` (cached, migrated on first use) | `apps/web/lib/hub/db.ts` | A |
| `HUB_MIGRATIONS: string[]` (ports of `0002` to `0006`, in order) | `apps/web/lib/hub/migrations.ts` | A |
| `createD1FromLibsql(client: Client): D1Database` | `apps/web/lib/hub/d1.ts` | A |
| `createRateLimiter(client: Client, name: string, limit: number, periodSeconds: number)` | `apps/web/lib/hub/rate-limit.ts` | A |
| `hubFetch(request: Request): Promise<Response>` (builds env, runs the Worker `fetch`) | `apps/web/lib/hub/handler.ts` | B |
| Route `apps/web/app/hub/[...path]/route.ts` exporting GET, POST, PUT, DELETE, OPTIONS | | B |
| `hubBaseUrl(): string` (env `HUB_URL`, else `PUBLIC_SITE_URL` + `/hub`, else the old Worker URL) | `apps/web/lib/hub/url.ts` | C |

## Steps

Targeted tests only (`pnpm exec vitest run <file>`), `pnpm.cmd --filter web exec tsc --noEmit`, eslint on changed files.
Local commits are the lead's job. No agent runs `pnpm check`, `pnpm desktop:build`, `wrangler` or `vercel`.

### Agent A: hub storage (D1 shim, hub database, import)

- [ ] **A1. Hub client and migrations.** `apps/web/lib/hub/db.ts` (`getHubDb`, URL and token from `HUB_DATABASE_URL` /
  `HUB_DATABASE_AUTH_TOKEN`, `libsql://` converted with `hostedHttpUrl`, cached per process, migrated with the table-based
  version method) and `apps/web/lib/hub/migrations.ts` (copy the SQL of `packages/sync-worker/migrations/0002` to `0006` and the
  tables of `schema.sql` that the migrations assume, in the right order; add `rate_counters`).
  - Done when: a test opens a temp `file:` database, runs the migrations twice (second run changes nothing) and finds every
    table the Worker queries (list them by grepping `FROM|INTO|UPDATE|JOIN` in `packages/sync-worker/src`).
- [ ] **A2. D1 shim.** `apps/web/lib/hub/d1.ts`. Read every `env.DB` use in `packages/sync-worker/src` first and implement exactly
  that surface. `batch` must be atomic. `meta.changes` and `meta.last_row_id` must be right. No `PRAGMA user_version`, no
  BEGIN/COMMIT scripts.
  - Done when: a test runs a copy of the Worker's own D1 test setup (`src/auth/test-helpers.ts`, `src/index.test.ts` helpers)
    through the shim on a temp libSQL file and the same assertions pass.
- [ ] **A3. Rate limiter.** `apps/web/lib/hub/rate-limit.ts` with the `{ limit({ key }) }` shape the Worker calls (check
  `src/guard/guard.ts`). Fixed windows, expired rows deleted lazily.
  - Done when: tests show allow up to the limit, deny after, and allow again in the next window (fake `Date` only).
- [ ] **A4. One-time import.** `scripts/hub-import.mjs`: reads a D1 SQL dump file (output of `wrangler d1 export zen-dojo-db --remote
  --output dump.sql`, which the user runs) and loads its INSERT statements into the hub through the shim, table by table, in
  batches under 100 bound parameters per statement, idempotent (`INSERT OR REPLACE`), then prints row counts per table. It
  takes the hub URL and token from the environment and never prints them.
  - Done when: a test builds a small fake dump, imports it into a temp database twice and gets identical counts.

### Agent B: routes and runtime (mount the Worker inside Next)

- [ ] **B1. Env adapter.** `apps/web/lib/hub/handler.ts`: build the Worker's `Env` from `process.env` (names in the design above)
  plus `DB` from A's shim and `RL_AUTH`, `RL_SYNC`, `RL_IP` from A's limiter. Import the Worker as a workspace package
  (`@habit/sync-worker`; add the package export and `transpilePackages` entry; confirm the web typecheck still passes with the
  Worker's `@cloudflare/workers-types`).
  - Done when: a unit test calls `hubFetch` with `GET /.well-known/jwks.json` and gets the public key from the env.
- [ ] **B2. Route.** `apps/web/app/hub/[...path]/route.ts` (Node runtime, `dynamic = "force-dynamic"`). Strip the `/hub` prefix
  before calling the Worker so its route matching is unchanged. `ctx.waitUntil` uses `after()`. Preserve status, headers (CORS,
  `Set-Cookie` if any, `Retry-After`), streaming bodies and the 60 KB body cap of the public profile route.
  - Done when: tests call the route handler for `OPTIONS`, `GET /hub/api/public/u/none` (404), `POST /hub/api/sync/run` without a
    token (401) and `GET /hub/auth/github/start` with an allowed redirect (302 to github.com).
- [ ] **B3. Keep Vercel happy.** No Worker-only globals in the imported code (`caches`, `WebSocketPair`, `env.ASSETS`); check
  `next build` locally (`pnpm.cmd --filter web build`) and fix import problems. Function duration for the sync routes is within
  Vercel Hobby limits (see `docs/hosted-architecture.md`); note the longest route.
  - Done when: `pnpm.cmd --filter web build` passes and the notes name any route that may exceed the limit.
- [ ] **B4. Proxy rule.** Make sure the existing session gate and any middleware in `apps/web` do not touch `/hub/*` (no cookie
  checks, no guest database creation there).
  - Done when: a test or a read of `apps/web/proxy.ts` (if it exists) shows `/hub` is excluded.

### Agent C: clients and sign-in flows

- [ ] **C1. One base URL.** `apps/web/lib/hub/url.ts` (`hubBaseUrl()`), then replace every use of `AUTH_WORKER_URL`,
  `SYNC_WORKER_URL` and the hard-coded workers.dev default in `apps/web/lib/auth/jwks.ts`, `lib/auth/session.ts`,
  `lib/public-profile.ts`, `lib/sync-engine.ts` and any other file `grep -rn "workers.dev\|WORKER_URL" apps packages` finds.
  Old environment variable names still work as overrides.
  - Done when: grep finds the old URL only in docs and in one constant used as the last fallback; the existing tests pass with
    their stubbed fetch.
- [ ] **C2. Desktop.** `apps/desktop/main.js` and `lib/deeplink.js`: `workerOrigin` and `isWorkerRedirect` accept the new origin
  (`https://<site>`) and the old Worker origin (so an old and a new build both sign in during the move). Do not change the
  `zendojo://` scheme. Keep the file plain JS with `// @ts-check`.
  - Done when: `pnpm exec vitest run apps/desktop` passes with new cases for both origins and a look-alike host being refused.
- [ ] **C3. The site signs in through the hub.** The site's own sign-in (`apps/web/app/auth/*`) must work against the hub at its own
  origin: the PKCE start, the callback and the refresh. Confirm that the redirect it sends is `https://<site>/auth/callback` and
  that `ALLOWED_REDIRECTS` documents exactly that (the Worker checks it in `src/auth/oauth.ts`). Cookies stay as they are.
  - Done when: a test runs the start and callback helpers against `hubFetch` (stubbed GitHub) and gets a session.
- [ ] **C4. Hosted sync.** `apps/web/lib/hosted/sync.ts` talks to the hub through `hubBaseUrl()` (or in-process when the base is
  this same site; pick the simpler one and say why). The 20 s throttle and the account-mismatch handling stay.
  - Done when: `pnpm exec vitest run apps/web/lib/hosted/sync.test.ts` passes.

### Agent D: cutover, CI, docs, decommission (lead runs the real steps)

- [ ] **D1. Runbook.** `docs/migration-cloudflare-to-vercel.md`, numbered, with the exact commands and who runs each: create the Turso
  database `zen-dojo-hub` and its token; generate and set the Vercel environment variables (names only; the user pastes values
  at the CLI prompt, choosing Secret); copy the secrets that exist today (the user reads them from where they were created, since
  Cloudflare does not show them again: `GITHUB_CLIENT_SECRET` from the GitHub OAuth app, a **new** `JWT_PRIVATE_JWK` / `JWT_PUBLIC_JWK`
  pair is NOT allowed because every signed-in device would be logged out: reuse the existing private key, say where it is kept
  or, if it is lost, say that everyone signs in once more); change the GitHub OAuth app's callback URL to
  `https://<site>/hub/auth/github/callback`; freeze (stop using the apps for a few minutes); `wrangler d1 export`; run
  `scripts/hub-import.mjs`; compare row counts per table with D1; switch; verify sign-in, sync and the public profile; release the
  desktop version; later delete the Worker and D1. Include a rollback (point the clients back at the Worker; nothing in D1 was
  changed).
  - Done when: a person who did not write it can follow it; every command is in its own code block; secrets never appear.
- [ ] **D2. CI.** `.github/workflows/ci.yml` still passes with the new tests (check it runs them); `.github/workflows/deploy-worker.yml`
  gets a header comment saying it is retired by this plan and is removed only in the decommission step (do not delete it yet).
  - Done when: the workflow files parse (read them) and the retirement note is there.
- [ ] **D3. Docs and Help.** Update `docs/hosting.md`, `docs/hosted-architecture.md`, `docs/account-data.md`, `docs/signing.md` only if it
  mentions the Worker, `README.md`, `docs/HANDOFF.md` and the FAQ data `apps/web/lib/faq.ts` (then run `pnpm faq:build`) so they say
  "sign in and sync go through the site" after cutover. Keep a short "Before cutover" note while the Worker is still live.
  - Done when: `pnpm exec vitest run apps/web/lib/faq.test.ts` passes and a grep for "Cloudflare" lists only history and the runbook.
- [ ] **D4. End to end.** `apps/web/lib/hub/hub-e2e.test.ts`: through `hubFetch` on a temp libSQL hub, a "desktop" device signs in (stubbed
  GitHub), pushes rows, a second device pulls them, a delete tombstone propagates, "delete cloud data" empties the user, the
  public profile publishes and unpublishes. Reuse the setup of `apps/web/lib/sync-e2e.test.ts` and `packages/sync-worker/src/index.test.ts`.
  - Done when: the file passes and covers each of those six cases.

## Only the user can do (the lead lists these again at cutover)

1. Create the Turso database `zen-dojo-hub` in the `zen-dojo` group and a token for it (not pasted in chat).
2. Add the Vercel environment variables with `npx vercel env add NAME production` (choose Secret for secrets).
3. Change the callback URL in the GitHub OAuth app settings.
4. Run `wrangler d1 export` and the import script (the lead can run these if the user says so).
5. Install the new desktop build, then confirm the old Worker is no longer used.
6. Revoke the Cloudflare API token and the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` after deletion.

## Acceptance criteria

- [ ] `GET https://<site>/hub/.well-known/jwks.json` returns the same public key the Worker serves today.
- [ ] A fresh sign-in from the desktop app, the site and `pnpm dev` succeeds against the hub.
- [ ] Rows written on one device appear on another through the hub; row counts per table equal D1's after the import.
- [ ] The public profile publishes, loads without sign-in and unpublishes.
- [ ] No code path still calls `*.workers.dev` except the documented last-resort fallback.
- [ ] `pnpm check` passes.

## Pitfalls

- The Worker's access tokens are checked without a database read (15-minute lifetime): keep that, since a Turso read on every request
  would be slow and costly.
- Turso over HTTPS: one statement per call is fine; keep batches small; never `PRAGMA user_version = N`; never a `BEGIN` script.
- Cold starts: do not run migrations or open the hub client at import time; `getHubDb()` runs them once per process on first use.
- Never log tokens, codes, refresh values, row contents or the JWK. Errors may name a step, never a value.
- The refresh-token rotation rule (reuse revokes the device) depends on atomic updates: the shim's `batch` and `run` must keep
  that atomicity.
- `JWT_PRIVATE_JWK` must be the key that signs today's tokens, or every device is logged out once. This is a decision for the user
  at cutover, not for an agent.
- Turso Free allows 10 million rows written a month for everyone: the import counts once, daily sync writes are small, but note
  the estimate in `docs/hosted-architecture.md`.

## Open questions

- Custom domain for the site (so the hub URL does not change if the Vercel name does)? Decide before the desktop release.
- Keep the Worker running read-only for how long after the desktop release?

## Implementation notes

(Each agent adds a short dated note for its steps: files changed, tests run, anything left.)

## Review
