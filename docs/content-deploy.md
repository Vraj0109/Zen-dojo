# Deploying the content database (owner checklist)

The lessons, problems and reading list live in one Turso database, `zen-dojo-content`. The hosted site reads it,
the desktop app downloads its copy from the site, and only you (the owner) can change it. Do the steps in order.
Run commands from the repo root. On Windows PowerShell, use `pnpm.cmd` if `pnpm` is blocked.

Commands marked **(check)** use a Turso CLI flag or a Vercel screen that this repo does not confirm; compare with
`turso <command> --help` and the Vercel dashboard before you run them.

## 1. Create the content database

1. In Turso, use the same group as the hub and control databases (`TURSO_GROUP`).
2. Create the database:

   ```
   turso db create zen-dojo-content --group <your-group>
   ```

   (check: the `--group` flag. `turso group list` shows your groups.)
3. Note its address: `turso db show zen-dojo-content --url` (check). It looks like `libsql://zen-dojo-content-<org>.turso.io`.

If it fails: a name already in use means the database exists. Check with `turso db list`. A group that does not exist
means the group name in `TURSO_GROUP` is wrong.

## 2. Create two tokens

1. A full-access token, used only on your computer for the owner commands (seed, import, resync):

   ```
   turso db tokens create zen-dojo-content
   ```

2. A read-only token, set on the site so public pages cannot write:

   ```
   turso db tokens create zen-dojo-content --read-only
   ```

   (check: the `--read-only` flag and the `tokens create` command. Turso's docs list both.)

Keep the full-access token out of the repo and out of chat. The read-only one goes into Vercel in step 3.

If it fails: a token command error usually means the database name is wrong. Re-run step 1.

## 3. Set the Vercel environment variables

In the Vercel project (root directory `apps/web`), open Settings, then Environment Variables. Add:

| Name | Value | Secret |
| --- | --- | --- |
| `CONTENT_DATABASE_URL` | the `libsql://` address from step 1 | no |
| `CONTENT_DATABASE_AUTH_TOKEN` | the full-access token | yes |
| `CONTENT_DATABASE_READ_TOKEN` | the read-only token | yes |
| `ADMIN_USER_IDS` | your GitHub id as `gh:<number>` (comma list for more admins) | no |

Confirm the hosted variables from `docs/hosting.md` are also set (`HABIT_HOSTED`, `CONTROL_DATABASE_URL`,
`HUB_URL`, `HUB_DATABASE_URL`, the GitHub and JWT values, `ALLOWED_REDIRECTS`, `PUBLIC_SITE_URL`). Mark the token values
as sensitive.

If it fails: a missing variable shows as an error on the site's pages after deploy. Fix the variable and redeploy.

## 4. Deploy

Deploy the project: push the release commit to the production branch, or use Deployments, then Redeploy, in the Vercel
dashboard (check: the exact button name). Open the site once. Pages may be empty until step 5.

If it fails: read the build log in Vercel. The usual causes are a missing variable in step 3 or a wrong root directory.

## 5. Fill the content once

This is the only time repo files are read. Run it with the full-access token in the environment:

```
CONTENT_DATABASE_AUTH_TOKEN=<full-access token> pnpm content:seed-db --url libsql://zen-dojo-content-<org>.turso.io
```

PowerShell:

```
$env:CONTENT_DATABASE_AUTH_TOKEN = "<full-access token>"
pnpm content:seed-db --url libsql://zen-dojo-content-<org>.turso.io
```

Add `--dry-run` first to see what would change without writing. Running it again changes nothing.

If it fails: a "token" or "unauthorized" error means the token is wrong or was created as read-only. Create a new
full-access token (step 2) and try again. If it stops part way, run it again: it only writes what is missing.

## 6. Check the hosted site

```
pnpm content:check-hosted --origin https://<your-site> --expect-problems 486
```

Each step prints PASS or FAIL. The command exits with 1 when any step fails.

- **version**: the site answers its content version and schema. If it fails with "needs a newer app version", the
  deployed app is older than the content: deploy the current app first.
- **units**: the unit list is not empty. If it is empty, step 5 did not run or wrote to another database.
- **unit page**: the first unit's page loads. A 404 usually means the site reads a different database than step 5 wrote to.
- **problem**: one problem answers with an ETag. Missing ETag means an old deploy; redeploy.
- **problem count**: the number of problems matches 486. A different number means the repo and the database differ;
  run `pnpm content:verify --origin https://<your-site>` to see the issues.

## 7. Sign in as the admin

Open `https://<your-site>/admin` and sign in with GitHub, using the account whose id you put in `ADMIN_USER_IDS`.
If you see "not allowed", check the id (`gh:<number>`, no spaces) and redeploy. Open one problem and one lesson to
check that they load and save.

## 8. Build the desktop app, then release

Only after steps 6 and 7 pass:

```
pnpm desktop:build
```

The build downloads the content from the site (`pnpm content:snapshot`), so the installer carries the same content
as the site. If that download fails, the build fails: fix the site first, then build again. Only then tag and
release (see `AGENTS.md`, "Desktop releases and updates").

## Forcing devices to download again

After a repair made directly in the database (a restore, a re-seed), run:

```
CONTENT_DATABASE_AUTH_TOKEN=<full-access token> pnpm content:resync --url libsql://zen-dojo-content-<org>.turso.io
```

This raises the content epoch. Every copy of the content (desktop app, web offline copy) downloads its followed units
again on its next sync. It is rare; normal admin edits do not need it. `pnpm content:import` raises the epoch by itself.

## Quick reference: symptom to fix

| Symptom | Look at |
| --- | --- |
| `content:check-hosted` says the site is unreachable | the site address (`PUBLIC_SITE_URL`), and whether the deploy finished |
| Version step says "needs a newer app version" | deploy the current app, then check again |
| Unit page or problem answers 404 | the site's `CONTENT_DATABASE_URL` is the same database step 5 wrote to |
| Problem count differs from 486 | `pnpm content:verify --origin <site>`, and the seed report from step 5 |
| `/admin` says not allowed | `ADMIN_USER_IDS`, then redeploy |
| Desktop build fails at the content download | the site passes step 6; then run `pnpm content:snapshot --out <file.db>` on its own to see the error |
