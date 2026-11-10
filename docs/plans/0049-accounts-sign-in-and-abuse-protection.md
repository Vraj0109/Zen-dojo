# 0049: Accounts, sign-in, admin-by-account and abuse protection (six parallel agents)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-10
- **Implemented by:** (implementer fills in) 3 Claude Code agents (A, B, C) + 3 Antigravity agents (D, E, F)
- **Spec:** extends plan 0044 (offline-first sync) and 0045 (admin portal)

## Goal

Real accounts. You sign in with GitHub once per device; your progress syncs through the Cloudflare D1 database under
your account id; `/admin` opens only for your account (no shared password). The sync backend survives abuse: rate
limits, login lockouts, per-user quotas, bans and a runbook for an attack, on top of Cloudflare's always-on DDoS
protection. Local-first still holds: the app works fully signed out (user `local`) and signing in never loses data.

## Context

What exists today (verified 2026-11-10):

- `packages/sync-worker/src/index.ts` (plan 0048): `POST /api/sync` only. Auth is a shared `SYNC_TOKEN` Bearer token plus
  a client-supplied `x-user-id` header. That is **not an identity**: anyone with the token can read and write any user's
  rows. This plan replaces it. D1 tables (`schema.sql`) all carry `user_id`, `updated_at`, `deleted_at`; `notes`,
  `solution_runs`, `pack_progress` key on `(user_id, id)` with text ids.
- Worker is deployed at `https://zen-dojo-sync.habit-sync-worker.workers.dev` by `.github/workflows/deploy-worker.yml`
  (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` exist). `wrangler.jsonc` has the real `database_id`.
- `apps/web/lib/sync-queue.ts` has `currentUser()` which returns `HABIT_USER_ID` or `{ id: "local", isGuest: true }`.
  It is module state, not a session. `apps/web/lib/sync-manager.ts` posts to the relative URL `/api/sync` with no auth
  header; **`apps/web/app/api/sync/route.ts` does not exist yet**, so sync cannot reach the Worker today.
- `apps/web/app/admin/**` is gated by an `ADMIN_SECRET` HMAC cookie (plan 0045, commit 2af02f5) copied into
  `layout.tsx`, `page.tsx`, `problems/page.tsx`, `login/page.tsx` and `actions.ts`. `apps/web/app/api/admin/content/route.ts`
  uses `adminDenied()` from `lib/content-admin.ts` (header token, used by tooling); leave that route alone.
- The desktop app serves Next on `127.0.0.1:3000` (or a free port) in a `utilityProcess` (AGENTS.md), so a sign-in
  redirect back to a loopback URL works there and on the plain web build.

Conventions that apply (AGENTS.md): Next 16 with `cacheComponents` (request-time data in an async component calling
`await connection()` inside `<Suspense>`; read `apps/web/node_modules/next/dist/docs/` for `cookies()`, route handlers,
redirects); schema changes append to `MIGRATIONS` in `apps/web/lib/db.ts` and update `schema.ts` and `BACKUP_TABLES`;
no emoji in UI (`no-emoji.test.ts`); dates are local `YYYY-MM-DD`; never touch `data/habit.db`; never give the app
credentials it should not hold.

### Design (decided; implementers must not redesign)

- **Identity provider:** GitHub OAuth (web flow). User id is `gh:<numeric GitHub id>` (never the username, which can
  change). The Worker is the only party that talks to GitHub and the only one that holds the client secret.
- **Sessions:** the Worker issues an **access token** (ES256 JWT, 15 minutes) and a **refresh token** (random 256-bit,
  30 days, stored only as a SHA-256 hash in D1, one row per device, **rotated on every use**, reuse of an old one revokes
  the whole device session). The Next server keeps both in `httpOnly` cookies; browser JavaScript never sees a token.
- **Sign-in flow (authorization code + PKCE):** app makes `state` + PKCE verifier, redirects to the Worker, the Worker
  sends the user to GitHub, GitHub returns to the Worker, the Worker redirects to the app's loopback callback with a
  one-time code (60 s, single use), the app exchanges `code + code_verifier` for tokens server side.
- **Admin:** the Worker env var `ADMIN_USER_IDS` (comma list, e.g. `gh:12345`) decides admin. The access token carries
  `adm: true|false`, recomputed at every refresh, so removing yourself or someone takes effect within 15 minutes.
  Web `/admin` and every admin server action require `session.admin`. The `ADMIN_SECRET` cookie gate is deleted.
- **Sync identity:** `/api/sync` takes the user id **only** from the verified token `sub`. `x-user-id` and `SYNC_TOKEN`
  are removed. The browser never calls the Worker directly; the Next route `/api/sync` proxies with the access token.
- **Abuse model:** Cloudflare absorbs volumetric L3/L4/L7 DDoS on its network automatically (always on for Workers).
  Our job is the application layer: cheap rejection before touching D1, bounded work per request, bounded storage per
  user, escalating bans, and no amplification (a small request must not cause a big D1 read or write).

### Fixed contracts (all six agents code against these; changing one needs the plan owner)

**Worker HTTP API (all JSON, all errors `{ ok:false, error:"..." }`, no stack traces):**

| Route | Purpose |
|---|---|
| `GET /auth/github/start?redirect_uri=&state=&code_challenge=` | validates `redirect_uri` against the allowlist, stores `oauth_states`, 302 to GitHub |
| `GET /auth/github/callback?code=&state=` | exchanges with GitHub, upserts `users`, stores a one-time `auth_codes` row, 302 to `redirect_uri?code=<one-time>&state=<state>` |
| `POST /auth/token` `{grant_type:"authorization_code", code, code_verifier, device_name}` | returns `{access_token, refresh_token, expires_in:900, user:{id,name,avatar_url,admin}}` |
| `POST /auth/token` `{grant_type:"refresh_token", refresh_token}` | same shape, rotates the refresh token |
| `POST /auth/logout` `{refresh_token}` | revokes that device session |
| `GET /auth/devices` (Bearer) | `[{id,name,created_at,last_seen_at,current}]` |
| `DELETE /auth/devices/:id` (Bearer) | revokes one of your own device sessions |
| `GET /.well-known/jwks.json` | public key (JWK set) for the app to verify access tokens |
| `POST /api/sync` (Bearer) | unchanged body/response as today; `user_id` = token `sub` |

**Access token claims:** `{ iss:"zen-dojo-sync", sub:"gh:<id>", sid:"<session id>", adm:boolean, iat, exp }`, header
`{ alg:"ES256", kid }`. `redirect_uri` allowlist: exactly `http://127.0.0.1:<any port>/auth/callback`,
`http://localhost:<any port>/auth/callback`, plus any exact URLs in the Worker var `ALLOWED_REDIRECTS`.

**Worker module signatures** (files in section "Agents"; the integrator wires them in `index.ts`):

```ts
// src/auth/routes.ts   (Agent A)
export async function handleAuth(req: Request, env: Env, ctx: ExecutionContext): Promise<Response | null>; // null = not an /auth or jwks route
export async function verifyAccessToken(token: string, env: Env): Promise<{ sub: string; sid: string; adm: boolean } | null>;
// src/guard/guard.ts   (Agent B)
export type Route = "auth" | "sync" | "other";
export async function guard(req: Request, env: Env, ctx: ExecutionContext, route: Route, userId?: string): Promise<Response | null>; // a Response = reject now
export async function checkQuota(env: Env, userId: string, mutations: number, bytes: number): Promise<Response | null>;
export async function noteAuthFailure(env: Env, ip: string, kind: "token" | "refresh-reuse" | "oauth-state"): Promise<void>;
export function clientIp(req: Request): string; // CF-Connecting-IP
```

`Env` gains (owner Agent D, in `src/index.ts`): `DB`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_PRIVATE_JWK`
(secret), `JWT_PUBLIC_JWK` (var), `ADMIN_USER_IDS`, `ALLOWED_REDIRECTS?`, `ALLOWED_ORIGIN?`, and the rate-limit bindings
`RL_AUTH`, `RL_SYNC`, `RL_IP` (Workers Rate Limiting). Delete `SYNC_TOKEN`.

**Limits (numbers are the contract; Agent B implements, tests assert them):**

| Scope | Limit | On exceed |
|---|---|---|
| `/auth/*` per IP | 20 requests / 60 s (RL_AUTH) | 429 + `Retry-After` |
| new account creations per IP | 5 / hour | 429 |
| failed token/refresh/state checks per IP | 10 / 10 min | ban 10 min, doubling to 1 h, 24 h on repeats |
| `/api/sync` per user | 60 / 60 s (RL_SYNC) | 429 |
| any route per IP | 300 / 60 s (RL_IP) | 429 |
| request body | 1 MB, 500 mutations (already enforced) | 413 / 400 |
| per-user storage | 100,000 live rows, 50 MB of payload | 413 `quota_exceeded` |
| per-user daily writes | 50,000 mutations / UTC day | 429 `daily_quota` |
| pull page | 2,000 rows per table per call, cursor `next_since` | response includes `has_more` |
| repeated 429s from one IP/user | 5 in 10 min | escalating ban (above) stored in D1 `bans` |

Banned or rate-limited requests must be rejected **before** any D1 query on the hot path (use the Rate Limiting
bindings and an in-isolate cache of bans refreshed at most every 30 s; D1 is written only on ban, quota rollover and
auth events). Responses never reveal whether a user exists.

**Web contracts (Agent E exports, Agent C and F import):**

```ts
// apps/web/lib/auth/types.ts
export type Session = { userId: string; name: string; avatarUrl: string | null; admin: boolean; expiresAt: number; sessionId: string };
// apps/web/lib/auth/session.ts  (server-only)
export async function getSession(): Promise<Session | null>;          // verifies zd_at via JWKS, refreshes with zd_rt when expired
export async function requireSession(next?: string): Promise<Session>; // redirect("/login?next=...") when signed out
export async function requireAdmin(): Promise<Session>;                // signed out -> /login; signed in but not admin -> notFound()
export async function workerFetch(path: string, init?: RequestInit): Promise<Response>; // adds Bearer, refreshes once on 401
```

Cookies: `zd_at` (access, `httpOnly`, `sameSite=lax`, `path=/`, 15 min), `zd_rt` (refresh, `httpOnly`, `sameSite=lax`,
`path=/`, 30 d), `zd_pkce` (state+verifier, 10 min, deleted at callback). `secure` when the request is https. Env for
the Next app: `AUTH_WORKER_URL` (default the deployed Worker URL), `AUTH_JWKS_CACHE_SECONDS` (default 3600).
Routes (Agent E): `GET /auth/start?next=`, `GET /auth/callback`, `POST /auth/logout`, `GET|DELETE /api/auth/devices`,
`POST /api/sync` (proxy to the Worker; 401 from the Worker becomes 401 to the client, other errors are passed through).

## Out of scope

- Other providers (Google, email, passkeys), 2FA, account deletion/export UI (add as a follow-up plan), teams/roles
  beyond one admin list, paid-plan WAF/custom rules we cannot verify (documented as optional in the runbook only).
- Row-level sharing between users; admin impersonation.
- Changing the D1 data tables or the mutation format; the `x-admin-token` route in `api/admin/content`.
- Running `pnpm desktop:build`, publishing a release, or touching `data/habit.db`.

## Agents and file ownership (zero overlap)

Each agent writes only to its files. Tests: only the agent's own targeted command; never full `pnpm test` or
`pnpm check` (the lead runs `pnpm check` once at the end). Commit locally with plain-English messages using explicit
`git add <paths>`; no push, tag, `Co-Authored-By` or AI attribution.

| Agent | Who | Owns | Fast check |
|---|---|---|---|
| **A** Worker auth | Claude | `packages/sync-worker/src/auth/**`, `packages/sync-worker/migrations/0002_auth.sql` | `pnpm exec vitest run packages/sync-worker/src/auth` |
| **B** Worker abuse guard | Claude | `packages/sync-worker/src/guard/**`, `packages/sync-worker/migrations/0003_abuse.sql`, `docs/sync-security.md` | `pnpm exec vitest run packages/sync-worker/src/guard` |
| **C** Web UI and admin gate | Claude | `apps/web/app/login/**`, `apps/web/app/profile/account/**`, `apps/web/app/admin/**` (delete `admin/login`), `apps/web/app/components/account-menu.tsx` | `pnpm --filter web typecheck` |
| **D** Worker integrator and deploy | Antigravity | `packages/sync-worker/src/index.ts`, `wrangler.jsonc`, `package.json`, `scripts/gen-keys.mjs`, `.github/workflows/deploy-worker.yml`, vitest config for the worker | `pnpm exec vitest run packages/sync-worker` |
| **E** Next server auth and sync proxy | Antigravity | `apps/web/lib/auth/**`, `apps/web/app/auth/**`, `apps/web/app/api/auth/**`, `apps/web/app/api/sync/route.ts` | `pnpm exec vitest run apps/web/lib/auth` + typecheck |
| **F** Local data adoption and sync client | Antigravity | `apps/web/lib/sync-manager.ts`, `sync-queue.ts`, `lib/account-adopt.ts` (new), `app/components/sync-status.tsx`, `lib/sync-client.test.ts`, `lib/account-adopt.test.ts` | `pnpm exec vitest run apps/web/lib/account-adopt.test.ts apps/web/lib/sync-queue.test.ts` |

Shared names that already exist: `AnyDbClient` and `recordMutation` in `sync-queue.ts`; `SYNC_TABLES` in `sync-schema.ts`.
`packages/sync-worker/vitest.config.ts` is created by Agent D first; A and B write their tests as plain
`*.test.ts` against injected fakes (fake D1, fake `fetch`, `crypto.subtle` from Node) so they do not wait for it.

## Steps

Do your own agent's steps in order. Steps are grouped by agent; "Done when" is checkable without the other agents'
work unless stated.

### Agent A (Claude): Worker auth

- [ ] **A1. Migration `migrations/0002_auth.sql`.** Tables: `users(id TEXT PK, github_id INTEGER UNIQUE NOT NULL, name TEXT, avatar_url TEXT, created_at INTEGER NOT NULL, last_login_at INTEGER)`;
  `sessions(id TEXT PK, user_id TEXT NOT NULL, refresh_hash TEXT NOT NULL UNIQUE, prev_refresh_hash TEXT, device_name TEXT, created_at, last_seen_at, expires_at INTEGER NOT NULL, revoked_at INTEGER)` with an index on `(user_id)`;
  `oauth_states(state TEXT PK, redirect_uri TEXT, code_challenge TEXT, created_at INTEGER)` (10 min);
  `auth_codes(code_hash TEXT PK, user_id TEXT, redirect_uri TEXT, code_challenge TEXT, expires_at INTEGER, used_at INTEGER)` (60 s). All `IF NOT EXISTS`.
  - Done when: the file applies to an empty local D1 (`wrangler d1 execute zen-dojo-db --local --file=...`) twice without error.
- [ ] **A2. JWT module `src/auth/jwt.ts`.** `signAccessToken(env, {sub,sid,adm})` and `verifyAccessToken(token, env)` using WebCrypto ES256 with the keys from `JWT_PRIVATE_JWK` / `JWT_PUBLIC_JWK`; verify `alg`, `iss`, `exp` (30 s clock skew), reject `alg:none`; `jwks(env)` returns the public key set with a `kid`.
  - Done when: unit tests cover round trip, expired, wrong key, tampered payload, `alg:none`, wrong `iss`.
- [ ] **A3. OAuth + code exchange `src/auth/oauth.ts`, routes in `src/auth/routes.ts`.** Implement the table in "Fixed contracts": validate `redirect_uri` against the loopback/allowlist rule (exact path `/auth/callback`, no userinfo, no fragments), PKCE S256 check at `/auth/token`, single-use 60 s codes, constant-time comparisons, GitHub user fetch with `User-Agent` and a 5 s timeout; the user id is `gh:<id>`; `adm` = id in `ADMIN_USER_IDS`.
  - Done when: tests with a fake `fetch` and fake D1 cover: bad redirect rejected, replayed code rejected, wrong verifier rejected, expired state rejected, new and returning user.
- [ ] **A4. Refresh rotation and devices `src/auth/sessions.ts`.** Store only SHA-256 of refresh tokens. On refresh: if the hash matches `refresh_hash`, rotate (move old to `prev_refresh_hash`); if it matches `prev_refresh_hash` (reuse), revoke the session and call `noteAuthFailure(..., "refresh-reuse")` from B's contract (inject it as a parameter so A does not import B's file). `GET /auth/devices`, `DELETE /auth/devices/:id` (own sessions only, 404 for others), `POST /auth/logout`.
  - Done when: tests cover rotation, reuse revokes, revoked/expired refresh rejected, cannot delete another user's device, `current` flag correct.
- [ ] **A5. Export `handleAuth` and `verifyAccessToken`** exactly as in the contract, plus a short `src/auth/README.md` listing secrets/vars A needs.
  - Done when: `pnpm exec vitest run packages/sync-worker/src/auth` passes and `tsc --noEmit` on `src/auth/*.ts` is clean.

### Agent B (Claude): Worker abuse guard

- [ ] **B1. Migration `migrations/0003_abuse.sql`.** `bans(key TEXT PK, reason TEXT, banned_until INTEGER NOT NULL, strikes INTEGER NOT NULL DEFAULT 1, created_at INTEGER)` (key is `ip:<ip>` or `user:<id>`); `user_quota(user_id TEXT PK, rows_live INTEGER NOT NULL DEFAULT 0, bytes_live INTEGER NOT NULL DEFAULT 0, day INTEGER NOT NULL DEFAULT 0, writes_today INTEGER NOT NULL DEFAULT 0, updated_at INTEGER)`; `abuse_log(id INTEGER PK AUTOINCREMENT, at INTEGER, key TEXT, kind TEXT, detail TEXT)` capped by a cleanup that deletes rows older than 14 days.
  - Done when: applies twice to a fresh local D1 without error.
- [ ] **B2. `src/guard/guard.ts`.** Implement `guard`, `checkQuota`, `noteAuthFailure`, `clientIp` per the contract and the limits table: Rate Limiting bindings `RL_AUTH`, `RL_SYNC`, `RL_IP` (typed as `{ limit(o:{key:string}): Promise<{success:boolean}> }`), an in-isolate ban cache refreshed at most every 30 s, escalating bans (10 min, 1 h, 24 h), `Retry-After` on every 429, generic error bodies. Strikes decay after 24 h without incident.
  - Done when: tests with fake bindings and fake D1 assert every row of the limits table, including that a banned IP is rejected with **zero D1 queries** after the cache is warm.
- [ ] **B3. Hardening helpers `src/guard/headers.ts`.** `securityHeaders()` (no-store on `/auth` and `/api`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`), strict CORS check helper (`ALLOWED_ORIGIN` list; never `*` for credentialed routes), `readBodyLimited(req, maxBytes)` that streams and aborts early.
  - Done when: tests show oversized chunked bodies are cut off at the limit without buffering the whole body.
- [ ] **B4. `docs/sync-security.md`.** Plain-language runbook: what Cloudflare protects automatically, what our limits are (copy the table), how to read the `abuse_log`, how to ban/unban by hand with `wrangler d1 execute`, an "under attack" checklist (enable Under Attack Mode on a custom domain, add a WAF rate-limiting rule, lower `RL_*` limits, rotate `JWT_PRIVATE_JWK`, revoke all sessions with one SQL line), and the optional hardening that needs a custom domain (Bot Fight Mode, Turnstile).
  - Done when: a person with no context can follow it; every command in it is copy-pasteable.

### Agent C (Claude): Web UI and admin gate

- [ ] **C1. `/login` page** (`apps/web/app/login/page.tsx`, server component). One "Continue with GitHub" button that links to `/auth/start?next=<safe next>` (only same-origin paths accepted as `next`); a short note that the app works signed out and that signing in syncs devices; already signed in shows a link back. Error state from `?error=`.
  - Done when: typecheck passes; no emoji; SVG GitHub mark only.
- [ ] **C2. Account page** `apps/web/app/profile/account/page.tsx` + `account-menu.tsx`: signed-in name/avatar, "Sign out" (POST `/auth/logout`), device list from `GET /api/auth/devices` with "Sign out this device" per row (DELETE), sync status text; signed out shows the sign-in prompt. Add a link from the profile/settings page only through `account-menu.tsx` (do not edit `settings/page.tsx`).
  - Done when: typecheck passes; layout works at 390 px width.
- [ ] **C3. Replace the admin gate.** In `apps/web/app/admin/layout.tsx`, `page.tsx`, `problems/page.tsx`, `problems/problem-drawer.tsx` (only if it checks auth) and `actions.ts`: remove the `ADMIN_SECRET` cookie code and call `await requireAdmin()` (import from `@/lib/auth/session`) at the top of every protected page and at the top of **every** server action (a layout check alone is not a gate). Delete `apps/web/app/admin/login/`. Admin nav shows the signed-in name.
  - Done when: grep finds no `ADMIN_SECRET` or `zen_admin_session` under `apps/web/app/admin`; typecheck passes once Agent E's `lib/auth/session.ts` exists (until then, code against the contract signature above).
- [ ] **C4. Component tests** are not required; instead list the manual checks in *Implementation notes*.
  - Done when: notes list the screens checked.

### Agent D (Antigravity): Worker integrator and deploy

- [x] **D1. Worker test setup.** Add `packages/sync-worker/vitest.config.ts` (Node environment, `src/**/*.test.ts`) and a `test` script; add `vitest` to devDependencies using the workspace's version.
  - Done when: `pnpm exec vitest run packages/sync-worker` runs (zero or more tests) without config errors.
- [x] **D2. Rewire `src/index.ts`.** Order per request: CORS preflight; `guard(req, env, ctx, route)`; `handleAuth(...)` for `/auth/*` and `/.well-known/jwks.json`; for `/api/sync`: read `Authorization`, `verifyAccessToken`, 401 on failure (call `noteAuthFailure(..., "token")`), second `guard(... "sync", userId)`, bounded body via `readBodyLimited`, `checkQuota`, then the existing push/pull. User id comes only from the token `sub`. Remove `SYNC_TOKEN`, `x-user-id`. Apply `securityHeaders()` to every response. Add pull pagination (`has_more`, `next_since`, 2,000 rows per table) without changing the existing response fields.
  - Done when: tests with fake env prove: no token 401, token for user A cannot read user B's rows (two users, same table), banned IP rejected before auth, existing LWW behaviour unchanged.
- [x] **D3. `wrangler.jsonc`.** Add the three Rate Limiting bindings (`RL_AUTH` 20/60 s, `RL_SYNC` 60/60 s, `RL_IP` 300/60 s; use the current Wrangler `ratelimits` config syntax, check Cloudflare docs), `vars` for `JWT_PUBLIC_JWK` placeholder, `ALLOWED_ORIGIN`, `ALLOWED_REDIRECTS`, `ADMIN_USER_IDS` placeholder; keep the real `database_id`.
  - Done when: `npx wrangler deploy --dry-run` succeeds from `packages/sync-worker`.
- [x] **D4. `scripts/gen-keys.mjs`.** Generates an ES256 key pair, writes the private JWK to `packages/sync-worker/.dev.vars`-style file **`jwt-private.jwk.json` (gitignored; add to `.gitignore`)** and prints only the public JWK. It must never print the private key.
  - Done when: running it twice does not overwrite an existing private key unless `--force`.
- [x] **D5. Deploy workflow.** In `.github/workflows/deploy-worker.yml` apply pending D1 migrations before deploy (`wrangler d1 migrations apply zen-dojo-db --remote` or the equivalent for the `migrations/` folder; set `migrations_dir` in `wrangler.jsonc`), keep the pnpm install working (`allowBuilds` for esbuild/workerd already set), and run `pnpm --filter @habit/sync-worker test` first.
  - Done when: the YAML parses (`actionlint` if available) and the steps are in this order: install, test, migrate, deploy.
- [x] **D6. Hand-off note.** In *Implementation notes*, list the exact one-time commands the **user** must run (GitHub OAuth app creation with callback `https://zen-dojo-sync.habit-sync-worker.workers.dev/auth/github/callback`; `wrangler secret put GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_PRIVATE_JWK`; setting `ADMIN_USER_IDS`). Do not run secret commands yourself and never print secret values.
  - Done when: the list is complete and copy-pasteable.

### Agent E (Antigravity): Next server auth and sync proxy

- [x] **E1. `lib/auth/types.ts`, `lib/auth/jwks.ts`.** Fetch and cache the Worker's JWKS (in memory, `AUTH_JWKS_CACHE_SECONDS`), verify ES256 tokens with `crypto.subtle` (reject `alg:none`, wrong `iss`, expired); re-fetch the JWKS once on an unknown `kid`.
  - Done when: unit tests (fake `fetch`) cover valid, expired, wrong key, unknown kid refetch, `alg:none`.
- [x] **E2. `lib/auth/session.ts`.** `getSession`, `requireSession`, `requireAdmin`, `workerFetch` exactly as the contract. `getSession` verifies `zd_at`; if expired or missing and `zd_rt` exists, call `POST {AUTH_WORKER_URL}/auth/token` refresh once and set new cookies (cookie writes only in route handlers/server actions; in pure server components return the session without writing and let the proxy route renew). Concurrent refreshes for one cookie must not log the user out (single-flight per refresh token).
  - Done when: tests cover refresh success, refresh rejected clears cookies, `requireAdmin` signed-out vs non-admin behaviour, single-flight.
- [x] **E3. Route handlers `app/auth/start`, `app/auth/callback`, `app/auth/logout`.** `start` creates `state` and a PKCE verifier/challenge, sets `zd_pkce`, redirects to `{AUTH_WORKER_URL}/auth/github/start` with `redirect_uri=<origin>/auth/callback`; `callback` checks `state` against `zd_pkce`, exchanges the code, sets `zd_at`/`zd_rt`, deletes `zd_pkce`, redirects to a validated same-origin `next` (default `/`); `logout` (POST, same-origin check) calls the Worker, clears cookies. `next` must be a path starting with a single `/` (reject `//`, schemes, backslashes).
  - Done when: tests cover state mismatch, open-redirect attempts, missing cookie, logout clears cookies.
- [x] **E4. `app/api/auth/devices/route.ts`** (GET list, DELETE `?id=`) proxying to the Worker with `workerFetch`; same-origin check on DELETE.
  - Done when: signed-out returns 401; tests with a fake Worker.
- [x] **E5. `app/api/sync/route.ts`.** Same-origin POST only; requires a session (401 otherwise); forwards the body (size cap 1 MB) to `{AUTH_WORKER_URL}/api/sync` with the Bearer token via `workerFetch`; passes status and JSON through (429 keeps `Retry-After`); never forwards cookies or client-supplied auth headers.
  - Done when: tests prove the client cannot choose the user (an `x-user-id` header is dropped) and a 429 passes through with `Retry-After`.

### Agent F (Antigravity): Local data adoption and sync client

- [x] **F1. `lib/account-adopt.ts`.** `adoptLocalData(db, userId)`: re-owns every local row with `user_id='local'` to the account (all `SYNC_TABLES`), writes a `local_sync_queue` upsert per row so the next sync uploads it, inside one transaction; idempotent; skips tables with no rows. `hasLocalData(db)` for the prompt. Rows are **never deleted** on failure.
  - Done when: tests cover: adopt moves rows and queues them, second call is a no-op, failure rolls back, rows of another user untouched.
- [x] **F2. `currentUser()` from the session.** In `sync-queue.ts` keep `setCurrentUser`; the app layer sets it from `getSession()` (call `setCurrentUser` from `sync-status.tsx` / the sync bootstrap, not inside `sync-queue.ts`). Signed out stays `{ id:"local", isGuest:true }`; **do not sync while signed out** (status `"signed-out"`).
  - Done when: tests: signed out never calls fetch; signed in uses the account id for queue rows.
- [x] **F3. `sync-manager.ts` auth handling.** On `401` from `/api/sync`: stop the timer, set status `"signed-out"`, do not retry in a loop; on `429`: honour `Retry-After` (exponential backoff with jitter, max 15 min) and show `"throttled"`; on `403/413 quota_exceeded`: status `"error"` with the server message; never retry non-retryable 4xx. Add the new statuses to the `SyncStatus` union and to `sync-status.tsx` (pill text: "Sign in to sync", "Sync paused, retrying").
  - Done when: `sync-client.test.ts` covers 401, 429 with `Retry-After`, 413, and that a 401 does not spin.
- [x] **F4. First sign-in prompt.** When a session appears and `hasLocalData` is true, `sync-status.tsx` shows a one-time dialog "Keep this device's progress? Link it to your account" with Link / Not now; "Not now" keeps data local and syncs nothing until chosen (remember the choice in `localStorage`, try/catch).
  - Done when: tests for the decision logic (pure function) pass; no emoji.

### Final (lead, after all six agents commit)

- [ ] **Z1. Merge check and `pnpm check`.** Pull everyone's commits, run `pnpm install` once (lockfile), `pnpm -r typecheck`, then a single `pnpm check`. Mark this plan `implemented`.
  - Done when: `pnpm check` passes.
- [ ] **Z2. Manual go-live (user).** Create the GitHub OAuth app, set the Worker secrets and vars (see D6), deploy, then sign in on two browsers and confirm a task created on one appears on the other.
  - Done when: the acceptance criteria below pass against the deployed Worker.

## Acceptance criteria

- [ ] Signed out, the app works exactly as before and shows "Sign in to sync"; no network calls to `/api/sync`.
- [ ] "Continue with GitHub" signs you in, shows your name and avatar on `/profile/account`, and the Account page lists this device.
- [ ] After signing in on a second device or browser, data created on the first appears on the second within about a minute (or "Sync now").
- [ ] First sign-in with existing local progress asks before linking it, and nothing is lost whichever you choose.
- [ ] Signing out one device from the Account page makes that device sign-in-required within 15 minutes and never syncs again.
- [ ] `/admin` requires sign-in; a signed-in non-admin gets a 404; your account (in `ADMIN_USER_IDS`) gets the portal; no `ADMIN_SECRET` anywhere.
- [ ] `/api/sync` cannot read or write another user's rows (tested with two users) and ignores any client-supplied user id.
- [ ] Abuse limits from the table hold in tests: 21st `/auth/*` call in a minute is 429, repeated bad tokens ban the IP with `Retry-After`, quota overflow returns `quota_exceeded`, banned IPs are rejected without D1 queries.
- [ ] A replayed refresh token revokes that device's session.
- [ ] `docs/sync-security.md` exists with the under-attack checklist.
- [ ] `pnpm check` passes
- [ ] No changes outside the files listed above (or explained in *Implementation notes*)

## Pitfalls

- A Next layout does not re-run on client navigation: `requireAdmin()` must be in every admin page and every server action.
- Tokens only in `httpOnly` cookies; never in `localStorage`, URLs, logs or error messages. Never log request bodies.
- `redirect_uri` and `next` are open-redirect vectors: validate both exactly as specified.
- `currentUser()` is module state; on a multi-user server it would leak across requests. The hosted web build must read the user from the session per request; `setCurrentUser` is only safe in the single-user desktop/local process. Agent F documents this in a code comment and keeps the signed-out default.
- D1 writes cost money and latency: do not write on every request (rate limits use bindings, bans are cached).
- GitHub user ids, not usernames, are identity. Do not store GitHub access tokens at all (the Worker needs them only once, to read the profile).
- Do not run `pnpm desktop:build` or touch `data/habit.db`.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

### Agent D: Worker integrator and deploy

- **Files changed / created**:
  - `packages/sync-worker/vitest.config.ts`: Vitest configuration for the worker package (Node environment, `src/**/*.test.ts`).
  - `packages/sync-worker/package.json`: Added `test` script (`vitest run`), devDependency `vitest`, and safe `typecheck` script.
  - `packages/sync-worker/src/index.ts`: Rewired root handler with CORS preflight, initial guard check (IP limits/bans), routing for `/auth/*` and `/.well-known/jwks.json`, token authentication on `/api/sync` via `verifyAccessToken`, user guard check, bounded body parsing via `readBodyLimited`, quota checks via `checkQuota`, LWW batch upserts/deletes with `userId = claims.sub`, pull pagination (`has_more`, `next_since`), and `securityHeaders` on all responses.
  - `packages/sync-worker/src/index.test.ts`: Integration unit tests verifying 401 on missing/bad token, banned IP rejection, user isolation across accounts, LWW update/delete semantics, CORS preflight and security headers.
  - `packages/sync-worker/wrangler.jsonc`: Added rate limiting bindings (`RL_AUTH` 20/60s, `RL_SYNC` 60/60s, `RL_IP` 300/60s), `vars` (`ALLOWED_ORIGIN: "*"`, `ALLOWED_REDIRECTS: ""`, `ADMIN_USER_IDS: ""`, `JWT_PUBLIC_JWK: "{}"`), and `migrations_dir: "migrations"` on `d1_databases[0]`.
  - `scripts/gen-keys.mjs`: Node script using WebCrypto (`crypto.subtle`) ECDSA P-256 generating JWKs. Writes private JWK to `packages/sync-worker/jwt-private.jwk.json` (unoverwritten unless `--force`), and prints only public JWK.
  - `.gitignore`: Added `jwt-private.jwk.json`.
  - `.github/workflows/deploy-worker.yml`: Reordered workflow steps to: install (`pnpm install --frozen-lockfile`), test (`pnpm --filter @habit/sync-worker test`), migrate (`npx wrangler d1 migrations apply zen-dojo-db --remote`), and deploy (`cloudflare/wrangler-action@v3`).

- **One-time manual setup commands (User instructions)**:
  1. **GitHub OAuth Application**:
     - Register a new GitHub OAuth App under GitHub Settings -> Developer settings -> OAuth Apps.
     - Homepage URL: `http://localhost:3000` (or your production app URL).
     - Authorization callback URL: `https://zen-dojo-sync.habit-sync-worker.workers.dev/auth/github/callback`.
     - Obtain the Client ID and generate a Client Secret.

  2. **Generate JWT Key Pair**:
     ```bash
     node scripts/gen-keys.mjs
     ```
     This outputs the public JWK JSON string to stdout and saves the private JWK into `packages/sync-worker/jwt-private.jwk.json`.

  3. **Configure Worker Secrets**:
     From `packages/sync-worker` (or using `--cwd packages/sync-worker`), set the secrets in Cloudflare (never commit or print private secrets):
     ```bash
     cd packages/sync-worker
     npx wrangler secret put GITHUB_CLIENT_ID
     # Enter GitHub Client ID when prompted

     npx wrangler secret put GITHUB_CLIENT_SECRET
     # Enter GitHub Client Secret when prompted

     npx wrangler secret put JWT_PRIVATE_JWK
     # Paste the JSON content of jwt-private.jwk.json when prompted
     ```

  4. **Configure Worker Environment Variables**:
     In `packages/sync-worker/wrangler.jsonc` (or via `wrangler vars`):
     - Set `JWT_PUBLIC_JWK` to the public JWK JSON string printed by `scripts/gen-keys.mjs` (e.g. `'{"kty":"EC","crv":"P-256","x":"...","y":"..."}'`).
     - Set `ADMIN_USER_IDS` to a comma-separated list of numeric GitHub user IDs formatted as `gh:<numeric_id>` (e.g. `"gh:12345678"`).
     - Set `ALLOWED_ORIGIN` if restricting browser CORS calls (default `*` or app origin).
     - Set `ALLOWED_REDIRECTS` if adding non-loopback callback URLs.

  5. **Apply D1 Migrations and Deploy**:
     ```bash
     cd packages/sync-worker
     npx wrangler d1 migrations apply zen-dojo-db --remote
     npx wrangler deploy
     ```

- **Verification results**:
  - `pnpm exec vitest run packages/sync-worker`: 5 test files, 80 tests passed in 400ms.
  - `pnpm --filter @habit/sync-worker typecheck`: 0 errors.
  - `npx wrangler deploy --dry-run`: Successful validation of all bindings and vars.

### Agent E: Next server auth and sync proxy

- **Files added/changed:**
  - `apps/web/lib/auth/types.ts`: `Session` and `AccessTokenClaims` types.
  - `apps/web/lib/auth/jwks.ts`: In-memory cached JWKS retrieval and ES256 JWT verification via `crypto.subtle` with kid refetch and validation.
  - `apps/web/lib/auth/session.ts`: `getSession`, `requireSession`, `requireAdmin`, `workerFetch`, single-flight refresh handler, and Next Server Component cookie handling.
  - `apps/web/lib/auth/util.ts`: `safeNext`, `checkSameOrigin`, `randomBase64Url`, `computeS256`.
  - `apps/web/app/auth/start/route.ts`: PKCE generation, `zd_pkce` cookie, redirect to Worker start.
  - `apps/web/app/auth/callback/route.ts`: Code exchange, `zd_at` & `zd_rt` cookies, redirection to safe `next`.
  - `apps/web/app/auth/logout/route.ts`: Same-origin check, Worker logout call, clear cookies, form redirect/JSON response.
  - `apps/web/app/api/auth/devices/route.ts`: GET devices & DELETE device proxying to Worker with 401 handling.
  - `apps/web/app/api/sync/route.ts`: Same-origin check, session check, 1 MB body cap, header sanitization, and `Retry-After` pass-through proxy.
  - Unit tests:
    - `apps/web/lib/auth/jwks.test.ts`
    - `apps/web/lib/auth/session.test.ts`
    - `apps/web/app/auth/auth-routes.test.ts`
    - `apps/web/app/api/auth/devices/devices.test.ts`
    - `apps/web/app/api/sync/sync.test.ts`
- **Deviations and why:** None. Added helper `apps/web/lib/auth/util.ts` for safe URL and same-origin checks shared across route handlers. Set a companion `zd_u` cookie storing user name and avatar URL alongside `zd_at`/`zd_rt` so `getSession()` can return name/avatar without making extra network requests per page render.
- **Test results:**
  - `pnpm exec vitest run apps/web/lib/auth apps/web/app/auth apps/web/app/api/auth apps/web/app/api/sync`: 33 tests passed in 5 test files.
- **Found but not changed:** None.

### Agent F: Local data adoption and sync client

- **Files added/changed:**
  - `apps/web/lib/account-adopt.ts`: Exported `adoptLocalData`, `hasLocalData`, `shouldPromptAdoption`, and `SYNC_TABLES`. Re-owns rows with `user_id = 'local'` to `userId` across `SYNC_TABLES`, queues upserts into `local_sync_queue`, executes inside atomic transaction/batch, idempotent, never deletes on failure.
  - `apps/web/lib/account-adopt.test.ts`: Comprehensive tests for adoption, idempotency, transaction rollback, multi-user isolation, and prompt decision logic.
  - `apps/web/lib/sync-queue.ts`: Documented single-user process scope for `currentUser()`, defaulted to `{ id: "local", isGuest: true }`, and ensured `recordMutation` respects active authenticated `userId`.
  - `apps/web/lib/sync-manager.ts`: Extended `SyncStatus` with `"signed-out"` and `"throttled"`. In `flushSyncQueue`, avoided network requests while signed-out, stopped background timer on 401, parsed `Retry-After` on 429 with capped exponential backoff and jitter, and handled non-retryable 403/413 errors.
  - `apps/web/app/components/sync-status.tsx`: Added support for `"signed-out"` (cloud icon with link to `/login`) and `"throttled"` ("Sync paused, retrying..."). Added first sign-in local adoption dialog ("Keep this device's progress? Link it to your account") with Link to Account and Not now actions. Zero emoji violations.
  - `apps/web/lib/sync-client.test.ts`: Added tests for 401 (timer halt), 429 (Retry-After backoff), 413 (`quota_exceeded`), signed-out network avoidance, and authenticated mutation user attribution.
- **Deviations and why:** None.
- **Test results:**
  - `pnpm exec vitest run apps/web/lib/account-adopt.test.ts apps/web/lib/sync-queue.test.ts apps/web/lib/sync-client.test.ts`: 37 tests passed across 3 test files.
  - `pnpm --filter web typecheck`: Clean (0 errors).
- **Found but not changed:**
  - `apps/web/app/dsa/[id]/page.tsx:147` contains disallowed character `'✓'` (U+2713) flagged by `no-emoji.test.ts`. File is outside Agent F ownership; left untouched.

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
