# Runbook: move sign-in and sync from Cloudflare to Vercel and Turso (plan 0073)

After this move the site itself answers sign-in and sync under `https://<site>/hub`. The Cloudflare Worker
`zen-dojo-sync` and the D1 database `zen-dojo-db` are retired. Replace `<site>` with your Vercel address
(today `zen-dojo-lovat.vercel.app`). Nothing here prints a secret; never paste a secret into chat, an issue or a commit.

Who runs what: every step is for **you** unless it says "lead". The commands below are for PowerShell on Windows
(`npx.cmd`, `pnpm.cmd`).

## Before you start: where each secret lives

| Name | Where it is today | What to do |
| --- | --- | --- |
| `JWT_PRIVATE_JWK` | Worker secret (Cloudflare never shows it again). Your copy is the git-ignored file `packages/sync-worker/jwt-private.jwk.json`, written by `scripts/gen-keys.mjs` (see `docs/sync-security.md`). | Reuse that file (step 3). |
| `JWT_PUBLIC_JWK` | Committed in `packages/sync-worker/wrangler.jsonc` (`vars`). It is public. | Copy it from there. |
| `GITHUB_CLIENT_SECRET` | Worker secret. GitHub shows a secret only once, when you create it. | If you did not save it, generate a new one in the GitHub OAuth app (step 4). Old secrets keep working until you delete them, and nobody is signed out. |
| `GITHUB_CLIENT_ID`, `ADMIN_USER_IDS` | `wrangler.jsonc` (`vars`), not secret. | Copy them. |

**If `jwt-private.jwk.json` is missing or does not match the public key:** the old private key cannot be recovered. Do not
guess. Generate a new pair with `node scripts/gen-keys.mjs --force`, use the new private and public keys in Vercel, and
accept that **every device and the site is signed out once** and signs in again with GitHub. No data is lost. Tell the
lead so the plan notes record it.

## 1. Make the hub database (Turso)

```
turso db create zen-dojo-hub --group zen-dojo
```

```
turso db show zen-dojo-hub --url
```

```
turso db tokens create zen-dojo-hub
```

Keep the URL (`libsql://...`) and the token somewhere private. Do not paste the token in chat.

## 2. Check that your private key matches today's public key

Compare the `x` and `y` values by eye without printing the private part. The file holds `x`, `y` and a secret `d`; show
only the first two:

```
$k = Get-Content packages/sync-worker/jwt-private.jwk.json -Raw | ConvertFrom-Json; "$($k.x) $($k.y)"
```

```
Select-String -Path packages/sync-worker/wrangler.jsonc -Pattern 'JWT_PUBLIC_JWK'
```

The `x` and `y` must be the same in both lines. Different, or the file is missing: read the box above about a lost key.

## 3. Set the Vercel environment variables

Run from the repo root (the project is linked already). Each command asks for the value at the prompt; choose
**Sensitive** for secrets. Use environment `production` (add `preview` too if you test previews).

```
npx.cmd vercel env add HUB_DATABASE_URL production
```

```
npx.cmd vercel env add HUB_DATABASE_AUTH_TOKEN production --sensitive
```

```
npx.cmd vercel env add GITHUB_CLIENT_ID production
```

```
npx.cmd vercel env add GITHUB_CLIENT_SECRET production --sensitive
```

```
npx.cmd vercel env add JWT_PUBLIC_JWK production
```

```
npx.cmd vercel env add ADMIN_USER_IDS production
```

```
npx.cmd vercel env add ALLOWED_REDIRECTS production
```

```
npx.cmd vercel env add ALLOWED_ORIGIN production
```

```
npx.cmd vercel env add HUB_URL production
```

Values: `ALLOWED_REDIRECTS` is `https://<site>/auth/callback` (exact, no trailing slash; keep any other entry that
`wrangler.jsonc` lists today). `ALLOWED_ORIGIN` is `*` as today. `HUB_URL` is `https://<site>/hub`. Check
`PUBLIC_SITE_URL` is `https://<site>`.

The private key goes in from the file, so it is never shown on screen:

```
Get-Content packages/sync-worker/jwt-private.jwk.json -Raw | npx.cmd vercel env add JWT_PRIVATE_JWK production --sensitive
```

Then redeploy production so the variables apply (`npx.cmd vercel deploy --prod`).

## 4. GitHub OAuth app (prepare, switch in step 8)

GitHub, Settings, Developer settings, OAuth Apps, your app. If you did not save the client secret, click **Generate a new
client secret** and put it into `GITHUB_CLIENT_SECRET` (run that step 3 command again, then redeploy). Do not delete the
old secret yet. Do not change the callback URL yet: until step 8 the Worker still needs the old one.

## 5. Freeze

Stop using the desktop app, the site and `pnpm dev` for a few minutes. Close the desktop app so it does not sync.

## 6. Export D1 and import into the hub

```
npx.cmd wrangler d1 export zen-dojo-db --remote --output dump.sql
```

Set the hub address and token for this one shell (values from step 1; do not echo them):

```
$env:HUB_DATABASE_URL = "libsql://<hub-host>"
$env:HUB_DATABASE_AUTH_TOKEN = Read-Host "hub token"
```

```
node scripts/hub-import.mjs dump.sql
```

The script is safe to run again (it replaces rows with the same key) and prints a row count per table. Delete `dump.sql`
afterwards: it contains everyone's data.

## 7. Compare row counts with D1

For each table the importer printed, read D1's count and compare:

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "SELECT count(*) FROM tasks"
```

Repeat for `problem_solves`, `sessions`, `public_profiles` and the other tables the importer listed. Every number must
match. If one does not, stop and use the Rollback section. Nothing in D1 was changed.

## 8. Switch

1. In the GitHub OAuth app set **Authorization callback URL** to `https://<site>/hub/auth/github/callback`.
2. Open `https://<site>/hub/.well-known/jwks.json`. It must show the same `x` and `y` as `JWT_PUBLIC_JWK` in `wrangler.jsonc`.

## 9. Verify

- Sign in on the site. You land signed in and your data is there.
- Sign in with `pnpm dev` (set `HUB_URL=https://<site>/hub` for it) and sync. A change on one device shows up on the other.
- Open your public profile `/u/<publicId>` in a private window: it loads without sign-in. Unpublish, then publish once.
- `https://<site>/hub/api/public/u/none` answers 404.

## 10. Release the desktop app (lead)

The lead bumps `apps/desktop/package.json`, tags `vX.Y.Z` and pushes the tag (see AGENTS.md). Install the new version.
It uses the site's `/hub` address. Installed older builds keep their old Worker address, which is already switched off
in GitHub after step 8, so install the new build soon after the switch.

## 11. Retire Cloudflare (later, once the new desktop version is installed)

1. The lead decides how long the Worker stays up read-only (plan 0073, open question).
2. Delete the Worker and D1:

```
npx.cmd wrangler delete --name zen-dojo-sync
```

```
npx.cmd wrangler d1 delete zen-dojo-db
```

3. The lead deletes `.github/workflows/deploy-worker.yml`.
4. Revoke the Cloudflare API token and remove the GitHub repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
5. Delete the old GitHub client secret if you generated a new one.

## Rollback

Nothing in D1 was changed, so going back is a change of address only:

1. Set the GitHub OAuth callback URL back to `https://zen-dojo-sync.habit-sync-worker.workers.dev/auth/github/callback`.
2. Remove `HUB_URL` in Vercel so clients fall back to the Worker address, then redeploy:

```
npx.cmd vercel env rm HUB_URL production
```

3. Desktop builds from before the move still point at the Worker and need nothing.
4. Changes made on the hub after the switch are not in D1. Tell the lead if anyone synced in that window.

## If something fails

- `/hub/...` answers 500: a Vercel variable is missing or wrong. The error names a step, never a value; read the Vercel function logs.
- Everyone is asked to sign in again: `JWT_PRIVATE_JWK` is not the key that signed the old tokens (see the box at the top).
- GitHub says the redirect_uri is not associated with the app: step 8.1 was not saved, or `ALLOWED_REDIRECTS` differs.
