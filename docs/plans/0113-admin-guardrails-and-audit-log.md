# 0113: Admin guardrails: server-side admin checks everywhere, admin on the hosted site, audit log

- **Status:** in-progress (wave 1 done, see docs/plans/wave1-content-db.md)
- **Planned by:** Claude Code, 2026-11-23
- **Implemented by:** (implementer fills in)
- **Series:** content in the database (0112 to 0119), overview `docs/architecture/content-in-db.md`.
- **Needs:** 0112 (content DB client, `admin_audit` table).

## Goal

Only admins can see admin pages or change content, and that is enforced **on the server** for every page, server
action and API route, so editing client code or crafting requests does not help. Nobody can become an admin through
any API, profile update or server action: admin status comes only from the owner-set environment variable
`ADMIN_USER_IDS`. Every admin change is written to an audit log. The admin portal, today turned off on the hosted
site, works there, because content is now edited in the shared content database.

## Context

How admin works today (verified while planning):

- Sign-in is GitHub OAuth through the hub (`packages/sync-worker/src/auth/`). The hub signs a short-lived access token
  (15 min, claims `sub`, `sid`, `adm`, `iat`, `exp`) in `auth/jwt.ts`. `adm` is computed **only** by
  `isAdmin(env, userId)` in `auth/sessions.ts` from the comma list `ADMIN_USER_IDS` (for example `gh:12345`).
  There is no admin column in any table. Tampered payloads fail verification (`auth/jwt.test.ts`).
- The web app verifies the token with the hub's JWKS (`apps/web/lib/auth/jwks.ts`) and builds a `Session` with
  `admin: claims.adm` (`apps/web/lib/auth/session.ts`). `requireAdmin()` there: no session → redirect to login;
  not admin → `notFound()`.
- `apps/web/app/admin/layout.tsx` calls `requireAdmin()` and 404s on hosted (`isHosted()`). Every admin page and the
  actions in `app/admin/actions.ts` and `app/admin/study-actions.ts` call `requireAdmin()` themselves (good; keep it).
- A second, separate admin path exists: `apps/web/app/api/admin/content/route.ts` uses a static shared secret
  `CONTENT_ADMIN_TOKEN` (`adminDenied` in `lib/content-admin.ts`). A shared secret cannot be tied to a person or
  audited. This plan removes it.
- Public profile updates go to the hub (`packages/sync-worker/src/profile.ts`, `sanitizePortfolio`), which builds a
  new object from allowed fields only. Users are upserted in `auth/oauth.ts` with `name` and `avatar_url` only.

Decisions:

- **Admin = verified access token with `adm: true`, and, where the server has `ADMIN_USER_IDS` in its own environment
  (the hosted site does), `sub` is also in that list.** The second check means removing someone from the list takes
  effect on the next deploy even while their 15-minute token is still valid.
- **Role changes only by the owner:** edit `ADMIN_USER_IDS` in the Vercel project settings and redeploy. There is no
  API, action, table or CLI that grants admin. Document this.
- Reads of the content DB use a **read-only** token; only the admin write path opens a client with the write token.
  So a bug in a public page cannot write content.
- Desktop admins: the desktop server cannot write the shared content DB directly (it has no write token). Its admin
  actions call the hosted admin API with the user's access token as `Authorization: Bearer` (plan 0116 builds the
  calls; this plan builds and secures the API). The hosted API re-checks everything.

Pitfalls:

- A layout is not re-run on client navigation. Never rely on the layout alone: every page, action and route checks.
- Server actions are public POST endpoints. Anyone can call one with any form data, admin UI or not.
- Route handlers must answer 401/403 JSON, never redirect (API clients follow redirects and get a login page with 200).
- Never log tokens, cookies or request bodies. Log one line: `admin denied: <route> <reason>`.
- `'use cache'` functions cannot read cookies; admin checks must happen outside cached functions.

## Out of scope

- The editor UI (plan 0116). Rate limiting beyond what the hub already has. Multiple admin roles or permissions.
- Changing the sign-in flow, token lifetime or JWKS handling.

## Steps

- [ ] **1. One admin module.** New `apps/web/lib/auth/admin.ts` (`import "server-only"`):
  - `type AdminProof = { readonly userId: string; readonly name: string; readonly __brand: "AdminProof" }`.
    Only this module can create one.
  - `isAdminClaims(claims, env = process.env)`: `claims.adm === true` and, if `env.ADMIN_USER_IDS` is non-empty,
    `sub` is in the trimmed comma list. Pure, exported for tests.
  - `requireAdminPage(next = "/admin")`: for pages and layouts. Signed out → same redirects as today's `requireAdmin`;
    not admin → `notFound()`. Returns `AdminProof`.
  - `requireAdminAction()`: for server actions. Not admin → throws `AdminDeniedError` (do not redirect from an action
    that returns form state). Callers catch it and return `{ ok: false, errors: ["Not allowed."] }`.
  - `requireAdminRequest(request)`: for route handlers. Reads `Authorization: Bearer <token>` first, else the `zd_at`
    cookie. For cookie-authenticated requests with a method other than GET/HEAD, the `Origin` header must equal the
    site origin (`PUBLIC_SITE_URL`, or the request URL's origin when unset), else 403 (CSRF). Returns
    `{ ok: true, proof } | { ok: false, response }` with 401 `{"error":"sign-in-required"}` (missing, bad signature,
    expired, `alg` not the expected one) or 403 `{"error":"not-admin"}`.
  - Keep `requireAdmin` in `session.ts` as a thin wrapper that calls `requireAdminPage` (existing callers keep working),
    and make `isAdminClaims` the single place that decides.
  - Done when: `pnpm exec vitest run apps/web/lib/auth/admin.test.ts` passes (step 8 cases 1 and 2).
- [ ] **2. Write access needs proof.** In `apps/web/lib/content-db/client.ts` (from 0112) split the client:
  `getContentDb()` uses `CONTENT_DATABASE_READ_TOKEN` when set (else `CONTENT_DATABASE_AUTH_TOKEN`, so local files and
  dev keep working); new `getContentWriteDb(proof: AdminProof)` uses `CONTENT_DATABASE_AUTH_TOKEN` and throws if
  `proof` is missing. The write helpers from 0112 (`lib/content-db/write.ts`) take the transaction from this client
  only. Add `CONTENT_DATABASE_READ_TOKEN` (Turso `authorization=read-only`) to `docs/hosting.md`.
  - Done when: a test shows `getContentWriteDb(undefined as never)` throws, and on hosted config the read client is
    built with the read token.
- [ ] **3. Audit log.** New `apps/web/lib/content-db/audit.ts`: `writeAudit(tx, proof, { action, entity, entityId,
  before, after, requestId })` inserts one `admin_audit` row **in the same transaction** as the change, so there is no
  change without a row. `before`/`after` are the full entity JSON (`null` for create/delete). `listAudit({ entity?,
  entityId?, actorId?, limit, before? })` for the UI. Actions: `create`, `update`, `delete`, `restore`, `import`.
  - Done when: a test saves a problem through a helper that calls `writeAudit`, and a forced error after the write
    leaves neither the change nor the audit row.
- [ ] **4. Admin portal on the hosted site.** In `apps/web/app/admin/layout.tsx` remove the `isHosted()` →
  `notFound()` gates (`HostedGate` and the check in `AdminNav`). Use `requireAdminPage()` in the layout and in every
  `page.tsx` under `app/admin/`. Keep `verifyProblemAction`'s hosted message (running code stays desktop only).
  Update the "Not available hosted" lists in `docs/hosting.md` and `docs/hosted-architecture.md`.
  - Done when: on a hosted build with your id in `ADMIN_USER_IDS`, `/admin` opens; signed in without admin it is a 404;
    signed out it goes to `/login?next=/admin`.
- [ ] **5. Admin API on the new check; remove the static token.** Replace `adminDenied` in
  `apps/web/app/api/admin/content/route.ts` with `requireAdminRequest`. Delete `adminDenied` and `CONTENT_ADMIN_TOKEN`
  from `lib/content-admin.ts`, `docs/content-editing.md` ("Add one thing", `--url`) and `docs/hosting.md`. The
  `content:add --url` path in `scripts/content.mjs` now needs `--token <access token>`; print a clear message if it is
  missing. (0117 retires these scripts; keep them working until then.) Every new admin route in later plans goes
  under `app/api/admin/` and starts with `requireAdminRequest`.
  - Done when: the route answers 401 without a token and 403 for a non-admin token.
- [ ] **6. Server actions use the action check.** In `app/admin/actions.ts` and `app/admin/study-actions.ts` call
  `requireAdminAction()` as the **first statement** of every exported function, inside a `try` that turns
  `AdminDeniedError` into `{ ok: false, errors: ["Not allowed."] }`. Write the audit row for every write they do
  (until 0116 moves them to the content DB they write `content_items`; audit those to the content DB too, `entity`
  `"content_item"`).
  - Done when: every exported action starts with the check (step 8 case 3 enforces it).
- [ ] **7. Nobody can promote themselves.** No code change is expected; this step adds proof:
  - `packages/sync-worker/src/profile.test.ts`: a profile PUT whose body has `admin: true`, `adm: true`,
    `role: "admin"`, `isAdmin: true` stores none of these keys, and a token issued afterwards still has `adm: false`.
  - `packages/sync-worker/src/auth/routes.test.ts`: the user upsert after GitHub sign-in ignores any extra fields, and
    `adm` follows `ADMIN_USER_IDS` only (already partly there at line ~290; extend).
  - Search the repo for any writer of `adm`/`admin`/`role` in a request body (`grep -rn "adm\b\|admin:\|role"` over
    `apps/web/app`, `apps/web/lib`, `packages/sync-worker/src`) and list the results with "safe because …" in
    *Implementation notes*.
  - Done when: the tests pass and the list is in the notes.
- [ ] **8. Tests.** Add or extend (DB tests use `:memory:` for both databases):
  1. `apps/web/lib/auth/admin.test.ts`: `isAdminClaims` truth table (adm false; adm true + list empty; adm true + not
     in list; adm true + in list with spaces).
  2. Same file, `requireAdminRequest`: no auth → 401; bearer with bad signature, `alg: none`, swapped payload
     (`adm: true` on a non-admin token), expired → 401; valid non-admin → 403; admin not in `ADMIN_USER_IDS` → 403;
     admin → ok; cookie POST with a foreign `Origin` → 403; cookie POST same origin → ok. Sign test tokens with a test
     JWK and stub the JWKS fetch.
  3. `apps/web/app/admin/guard.test.ts` (static check, no Next runtime): reads every file under `apps/web/app/admin/**`
     and `apps/web/app/api/admin/**`. For each `"use server"` file, every `export async function` body's first
     statement calls `requireAdminAction`; for each `route.ts`, every exported `GET|POST|PUT|PATCH|DELETE` calls
     `requireAdminRequest` first; for each `page.tsx`/`layout.tsx`, the default export calls `requireAdminPage`. Use
     the TypeScript compiler API (already a dependency) rather than regex. Failing output names the file and function.
  4. `apps/web/app/admin/admin.test.ts` and `study.test.ts`: for every exported action, a non-admin call returns
     "Not allowed.", writes no content row and no audit row (count before = after).
  5. `apps/web/app/api/admin/content/route.test.ts`: GET/POST/DELETE as anonymous (401), non-admin (403), admin (200),
     and that admin POST writes one audit row.
  6. `apps/web/lib/content-db/audit.test.ts`: step 3 cases.
  - Done when: `pnpm exec vitest run apps/web/lib/auth apps/web/app/admin apps/web/app/api/admin apps/web/lib/content-db packages/sync-worker/src/profile.test.ts packages/sync-worker/src/auth/routes.test.ts`
    passes, then `pnpm check` once.
- [ ] **9. Docs.** Add a section "Admins" to `docs/hosted-architecture.md`: who is an admin (`ADMIN_USER_IDS` only),
  how the owner adds or removes one (Vercel env + redeploy, takes effect within 15 minutes for old tokens and
  immediately on the hosted API), that there is no other path, the read/write token split, and where the audit log is.
  - Done when: the section exists and matches the code.

## Acceptance criteria

- [ ] Hosted: `/admin` works for an id in `ADMIN_USER_IDS`, is a 404 for other signed-in users, and asks guests to sign in.
- [ ] Calling any admin server action or admin API without admin rights changes nothing and returns "Not allowed." /
      401 / 403.
- [ ] A profile update with `admin: true` or similar fields does not make anyone an admin.
- [ ] Every admin write leaves exactly one `admin_audit` row with who, when, what and before/after.
- [ ] `CONTENT_ADMIN_TOKEN` is gone from code and docs.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
