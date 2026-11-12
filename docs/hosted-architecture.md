# Hosted Zen Dojo: decision record (plan 0058)

Last updated 2026-11-12. Items marked **unverified** were not confirmed against a provider page or a real deploy.

## Decision

- **Host:** Vercel, Hobby plan (free). Project root `apps/web`. A normal Next.js 16 build on Node functions.
- **Data:** one Turso database per signed-in user, plus one small control database that maps `userId` to that user's
  database URL. No query carries a `user_id`; isolation comes from each person having a separate database.
- **Signed-out visitors:** browse everything as guests on a throwaway in-memory database made per request. Nothing is
  saved. Progress saves only after GitHub sign-in. There is no anonymous cookie and no `proxy.ts`.
- **Sync:** the existing sync engine and the Cloudflare sync Worker (`packages/sync-worker`, free plan, D1) are
  unchanged. A signed-in user's hosted database acts as one more device in that sync.
- **No code execution on the server.** Judge and tools routes answer 403 `hosted-no-run`.

## Why Vercel and not Cloudflare Workers

A Cloudflare Workers attempt (OpenNext adapter, one Durable Object per user) was built and then removed. Workers Free
allows 10 ms of CPU per request (figure from memory, **unverified** in this pass). Rendering this app's pages measured
80 to 1200 ms each, so pages failed, and Workers Paid was not wanted. Vercel Hobby runs ordinary Node functions with a
300 s maximum duration and 4 CPU-hours of Active CPU per month included (https://vercel.com/docs/plans/hobby, checked
2026-11-12), which fits. The Workers-specific parts (OpenNext config, the web app's `wrangler.jsonc`, Durable Object
classes, the worker entry, the deploy workflow) were deleted.

## Why Turso, one database per user

- The Turso Free plan allows 100 databases, 5 GB storage, 500 million rows read and 10 million rows written per month
  (https://turso.tech/pricing, checked 2026-11-12).
- Isolation by construction: a bug in one query cannot read another person's rows, because the connection only reaches
  one database. A shared database with a `user_id` column would need every query, Drizzle table and sync trigger
  rewritten, and one missed `WHERE` would leak data.
- The app already uses `@libsql/client`, so there is no new client code.

## Why guests get no database

The free cap is 100 databases and the control database uses one. If every anonymous visitor got a database, bots and
passers-by would use the cap in days. Guests get an in-memory database (`createGuestDb` in `lib/db.ts`) that lives for
one request. Guest actions therefore do not persist; `app/components/guest-notice.tsx` says so on screen.

## Architecture

Request flow (hosted mode, `HABIT_HOSTED=1`):

1. `getDb()` calls `requireUserDb()` (`lib/hosted/require-user-db.ts`) and reads the session. Signed in: `getDbFor(userId)`.
   Signed out: `createGuestDb()`.
2. `getDbFor(userId)` (`lib/db.ts`) reads the control row through `lib/hosted/control.ts` (`CONTROL_DATABASE_URL`).
   If there is none, `lib/hosted/provision.ts` creates a Turso database through the Turso Platform API and the row
   is recorded. It then mints a database token, opens a client, runs pending `MIGRATIONS`, and caches the client in
   the process (50 clients, oldest dropped). A failure caches nothing, so the next request retries.
3. Delete-my-data: `dropHostedUserData(userId)` deletes the user's Turso database and the control row and forgets the
   cached client. It returns false when `TURSO_API_TOKEN` is not set.
4. Sync: `lib/hosted/sync.ts` syncs on request (at most once per 20 s per user) and after each change, not in the
   background, against the sync Worker at `SYNC_WORKER_URL`.

The control database is created by hand once (see `docs/hosting.md`); the app creates its table on first use
(`ensureControlSchema`). `libsql://` URLs are converted to `https://`, so the client talks HTTP.

### Turso API facts used

| Claim | Page |
| --- | --- |
| Create database: `POST https://api.turso.tech/v1/organizations/{org}/databases`, bearer token, body `name` (lowercase letters, digits, dashes, max 64) and `group` (must exist); 409 if the name exists | https://docs.turso.tech/api-reference/databases/create |
| Database token: `POST /v1/organizations/{org}/databases/{db}/auth/tokens`, query `expiration` and `authorization` (`full-access` or `read-only`); response `{ jwt }` | https://docs.turso.tech/api-reference/databases/create-token |
| Create response field names (`Hostname`): the code reads `database.Hostname` and also polls `GET .../databases/{name}` | **unverified** against a real response; check on first deploy |
| Behaviour when a free limit is hit (writes fail or are billed) | **unverified** |
| Vercel Root Directory for a monorepo is set on import (Edit next to Root Directory) | https://vercel.com/docs/monorepos |

### GitHub sign-in

The GitHub OAuth app's callback stays on the sync Worker (`/auth/github/callback`); nothing changes in GitHub. The
site starts sign-in with `redirect_uri=https://<site>/auth/callback`. The Worker accepts that only if it is listed in
`ALLOWED_REDIRECTS` (comma list, exact match, no wildcards), so a look-alike host is refused (test:
`packages/sync-worker/src/auth/routes.test.ts`). `wrangler.jsonc` keeps `ALLOWED_REDIRECTS` empty in the repo because the
site address is not known until the first deploy.

## Environment variables (Vercel project settings)

| Name | Secret | Purpose |
| --- | --- | --- |
| `HABIT_HOSTED` | no | `1` turns hosted mode on |
| `CONTROL_DATABASE_URL` | no | `libsql://` URL of the control database |
| `CONTROL_DATABASE_AUTH_TOKEN` | yes | token for the control database |
| `TURSO_API_TOKEN` | yes | Platform API token; creates and deletes user databases and mints their tokens |
| `TURSO_ORG` | no | Turso organization slug |
| `TURSO_GROUP` | no | Turso group that new user databases join |
| `SYNC_WORKER_URL` | no | base URL of the deployed sync Worker |
| `PUBLIC_SITE_URL` | no | public origin of the site, for example `https://zen-dojo.vercel.app`, no trailing slash |

## Limits

- Turso Free: 100 databases in total, so about 99 signed-in users (the control database is one). Writes are shared:
  10 million rows per month for everyone. Sync triggers add side-table writes, so budget about 3 to 5 row writes per
  user action. Writes run out before storage does.
- When a Turso limit is hit, provisioning or queries fail and the site shows an error; the desktop app and the Worker's
  cloud copy are unaffected. Exact overage behaviour is **unverified**.
- Vercel Hobby is for non-commercial, personal use only (stated on the Hobby plan page, via its fair use guidelines).
  Charging for the site or running it for a business needs Pro.
- Vercel Hobby also has 100 deployments per day and 1,000,000 function invocations per month included.
- The sync Worker's free-plan limits are covered in `docs/sync-security.md`.

## Not available hosted

Running code (Run, Submit, Java project Run, tool installs), the browser extension and its pairing key, restoring a
database file, the local backup download in Settings, AI help that uses programs on the computer, and `/admin` (404).
Guests cannot save anything.
