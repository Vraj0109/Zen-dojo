# Hosted Zen Dojo: decision record (plan 0058)

Checked 2026-11-12. Each claim names the page it came from. Anything not confirmed is marked **unverified**.

## Decision

- **Hosting for the Next app:** Cloudflare Workers through `@opennextjs/cloudflare` (the owner wants Cloudflare, not
  Vercel; this replaces the earlier Vercel default). Config: `apps/web/open-next.config.ts`, `apps/web/wrangler.jsonc`
  (Worker `zen-dojo-web`), deploy workflow `.github/workflows/deploy-web.yml`. A real deploy of the app is
  **unverified** until the lead deploys it (see "Cloudflare hosting" below).
- **Data (Cloudflare only, no Turso):** one SQLite-backed Durable Object (`UserDb`) per signed-in user. The object id
  is `idFromName(userId)`, so there is no control database, no provisioning API and no tokens. The existing sync engine
  keeps each user database in step with the Worker's D1, so the hosted site is "another device". No query gets a
  `user_id`. (The earlier Turso design is superseded; its code stays for its tests and a Node host, see the end.)
- **Access:** `getDbFor(userId)` (`lib/db.ts`) finds the `USER_DB` binding through `getCloudflareContext()` and returns
  Drizzle over an adapter (`lib/hosted/do-client.ts`) that implements the libSQL `Client` subset the app uses, over RPC
  to the object. Without the binding (desktop, tests) nothing changes.
- **No code execution on the server.** Judge routes return 403 `hosted-no-run`.

## Verified facts

| Claim | Page |
| --- | --- |
| Create a database: `POST https://api.turso.tech/v1/organizations/{org}/databases`, bearer token, body `name` (lowercase letters, digits, dashes, max 64) and `group` (must exist); 409 if the name exists, 400 if the group is missing | https://docs.turso.tech/api-reference/databases/create |
| Per-database token: `POST /v1/organizations/{org}/databases/{db}/auth/tokens`, query `expiration` (default `never`, e.g. `2w1d30m`) and `authorization` (`full-access` or `read-only`); response `{ jwt }` | https://docs.turso.tech/api-reference/databases/create-token |
| Turso Free plan: 100 databases, 5 GB storage, 500 million rows read per month, 10 million rows written per month, 3 GB syncs per month | https://turso.tech/pricing |
| One group token versus per-database tokens (token model detail) | **unverified** (not fetched); this plan uses per-database tokens, which the create-token page confirms |
| libSQL over HTTP from serverless | **unverified** (not fetched); `@libsql/client` with a `libsql://` URL is the same client the app already uses for remote databases (`docs/hosting.md`) |
| The create response field names (`Hostname`) | The create page lists `DbId`, `Hostname`, `Name` but flags the values as placeholders. The code reads `database.Hostname` and also polls `GET .../databases/{name}`; check against a real response on first deploy |

## Why not the alternatives

- **Shared database with a `user_id` column:** rewrites every query, every Drizzle table and the sync triggers, and
  one missed `WHERE` leaks another person's data.
- **SQLite in the browser (WASM, OPFS):** heavy, unproven for this schema, and data would not follow you across devices
  without the same sync work anyway.

## Cost ceiling and limits

- Free tier fits about 100 users by database count (100 databases, the control database is one of them, so 99).
- Write budget: 10 million rows per month shared by all users. Sync triggers add side-table writes, so budget roughly
  3 to 5 row writes per user action. Active users are therefore limited by writes before storage.
- When a free limit is hit: Turso is the part that stops (writes fail). The site shows a plain error from the
  provisioning or query failure; reads of the Worker's cloud copy and the desktop app are unaffected. Workers Free answers 1015/exceeded-limit errors until the daily quota resets. Move to a paid plan, or invite fewer users. Exact Turso overage
  behaviour is **unverified** (the pricing page excerpt did not say).
- Workers Free has a 3 MiB compressed script limit and 100,000 requests per day; Workers Paid (5 USD per month) raises the script limit to 10 MiB. Check the size of the build first (below).

## Environment variables

| Name | Secret | Purpose |
| --- | --- | --- |
| `HABIT_HOSTED` | no | `1` turns hosted mode on |
| `USER_DB` | binding | Durable Object namespace (wrangler.jsonc), not a variable |
| `SYNC_WORKER_URL` | no | base URL of the sync Worker |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | yes (GitHub secrets, CI only) | deploy-web.yml publishes the Worker |

## Request flow

1. `proxy.ts` sends visitors with no session cookie to `/welcome` (hosted only). `/auth/*` and `/api/*` stay open;
   route handlers answer 401 themselves.
2. `getDb()` in hosted mode calls `requireUserDb()`: the session user, then `getDbFor(userId)`.
3. `getDbFor` reads the control row (creating the database and the row on first sign-in), mints a token, opens the
   client, runs pending `MIGRATIONS`, and caches the client (50 clients, oldest dropped). Failures cache nothing.

## GitHub OAuth

The GitHub OAuth app keeps its callback on the Worker. The hosted origin only has to be added to the Worker's
`ALLOWED_REDIRECTS` (plan 0058 step 7).

The GitHub OAuth app's callback stays the Worker's own `/auth/github/callback`; nothing changes in GitHub. The hosted
site starts sign-in with `redirect_uri=https://<your-site>/auth/callback`, and the Worker only accepts that exact string
when it is listed in `ALLOWED_REDIRECTS` (comma list, exact match, no wildcards). A look-alike such as
`https://zen.example.evil.com/auth/callback` is refused (test in `packages/sync-worker/src/auth/routes.test.ts`).
`wrangler.jsonc` keeps `ALLOWED_REDIRECTS` empty in the repo because the site address is not known yet; set it at deploy.

## Cloudflare hosting (2026-11-12; Workers limit figures are from memory, **unverified**)

- **Adapter:** `@opennextjs/cloudflare` 1.20.16 with `wrangler` 4.160.1, both pinned exactly in `apps/web/package.json`.
  The adapter's peer range for Next is `>=16.4.5`, which matches the app's Next 16.4.5 (npm registry metadata).
- **Cache Components risk (open upstream):** the adapter's issue tracker (opennextjs/opennextjs-cloudflare #1450, #1464,
  #1349, #1369) still has open reports of 500s, hung requests and hydration errors with `cacheComponents: true`,
  mainly around `"use cache"` entries and cached PPR shells. This app serves per-user pages after `connection()`, so it
  should avoid cached shells, and the config uses the adapter's dummy cache (no R2/KV, no cross-request cache). If a
  page misbehaves, the fallback is to run the same `HABIT_HOSTED` build on a Node host. **Unverified until deployed.**
- **Runtime:** `compatibility_flags` `nodejs_compat` and `global_fetch_strictly_public`, date 2026-11-01.
  `@libsql/client` resolves to its `web` build under the `workerd` export condition, so no native module is loaded.
  The web client only speaks to remote databases: hosted mode converts `libsql://` to `https://` (HTTP, not
  WebSocket; a Worker cannot reuse a socket across requests). `file:` databases are not available on Workers.
- **Code that cannot run on Workers** is only reachable in desktop mode: judge and tools routes (child_process) answer
  403 in hosted mode before doing any work; `lib/db.ts` only touches the file system for `file:` databases.
  The cp-algorithms articles are read from disk (`lib/cp-algorithms.ts`); on Workers the folder is missing, so the
  article block is simply empty hosted (the function already tolerates missing files).
- **Windows builds:** OpenNext officially supports Windows only through WSL, so CI builds on Ubuntu. Local build status is in the
  plan notes of this round. A `next build` warning "Dynamic filesystem access causes tracing of the whole project"
  comes from the judge, tools and AI-CLI code; it inflates the traced files, so check the bundle size.
- **Limits to check at first deploy:** Worker size (3 MiB compressed free, 10 MiB paid), CPU time per request (10 ms
  free, 30 s default paid), subrequests per request (50 free, 10,000 paid). A page that opens the database and
  syncs makes several subrequests; keep them low.

## Durable Object storage (checked 2026-11-12)

| Claim | Page |
| --- | --- |
| SQLite storage is enabled per class with a `new_sqlite_classes` migration; new namespaces must be SQLite-backed. A newer `exports` field is an alternative, but a Worker uses only one of `migrations` or `exports`; this repo uses `migrations` | https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/ , https://developers.cloudflare.com/changelog/post/2026-07-09-restrict-new-kv-backed-namespaces/ , https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/ |
| `ctx.storage.sql.exec(query, ...bindings)` returns a cursor with `columnNames`, `raw()`, `toArray()`, `rowsRead`, `rowsWritten`; multi-statement strings run in one `exec` | https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ |
| `sql.exec` cannot run `BEGIN`/`SAVEPOINT`; use `ctx.storage.transactionSync(cb)` (synchronous callback; a throw rolls back). So the adapter's `batch` is one `transactionSync`, and `executeMultiple` drops a leading `BEGIN` and trailing `COMMIT` | same page |
| Consume cursors before the next `await` (no snapshot isolation); numbers above 52 bits lose precision (rowids, int64) | same page |
| A Worker calls methods on a stub from `env.NS.get(env.NS.idFromName(name))` (RPC); args and results are structured-cloneable | https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects/ |
| Limits: 10 GB per object (Paid; 1 GB Free), SQL statement 100 KB, 100 bound parameters per query, row/string/BLOB 8 MB, 100 columns per table; soft 1,000 requests/s per object; a full disk fails writes with `SQLITE_FULL` while reads and deletes work; CPU per invocation 30 s default | https://developers.cloudflare.com/durable-objects/platform/limits/ |
| An object whose storage is empty when it shuts down ceases to exist (delete-my-data ends with `deleteAll()`) | https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/ |
| OpenNext: a custom worker file re-exports the default of `./.open-next/worker.js` and adds other exports such as Durable Object classes; `wrangler.jsonc` `main` points at it; the generated import needs a `@ts-ignore` | https://opennext.js.org/cloudflare/howtos/custom-worker |
| `SELECT changes()`/`last_insert_rowid()` and `CREATE TRIGGER ... BEGIN ... END` inside `exec`, and `ctx.storage.kv` | **unverified** against the real runtime (tests use a node:sqlite fake). The schema version is kept in the synchronous KV API (documented on the SQLite storage page) instead of `PRAGMA user_version`; if `changes()` throws the adapter falls back to `rowsWritten`. Check on the first deploy |

Design: `lib/hosted/user-db-core.ts` (logic inside the object, tested in Node), `user-do.ts` (the `UserDb` class),
`do-client.ts` (Worker-side `Client` adapter), `worker.ts` (OpenNext worker plus `UserDb`). Migrations run inside the
object, one transaction each with its version bump, once per database; a Worker asks `schemaVersion()` first and sends
the list only when behind. Every shipped migration must stay under 100 KB (a test checks it).

Known adapter limits: `transaction()` is buffered (writes go out as one atomic batch on commit; reads inside it throw;
`account-adopt.ts` only writes, so it works); named arguments are rejected; `lastInsertRowid` and counts above 2^53 are
imprecise. Every query is one RPC round trip (a subrequest), so keep pages to few queries; Workers Free allows 50
subrequests per request, 10,000 Paid (from memory, **unverified**).

Delete-my-data (plan 0054), hosted copy: `dropHostedUserData(userId)` in `lib/db.ts` drops every table, then clears the
object's storage. The server action for hosted accounts still has to call it (`erase-data.ts` is the desktop path).

Superseded: `lib/hosted/control.ts` and `provision.ts` (Turso control database and provisioning) run only when no
`USER_DB` binding exists and `HABIT_HOSTED=1`; kept for their tests. Delete them once nobody needs a Node host.
