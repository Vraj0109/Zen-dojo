# Sync security and abuse runbook

For the Zen Dojo sync Worker (`packages/sync-worker`, deployed as `zen-dojo-sync`, database `zen-dojo-db`).
All commands run from the repo root in a terminal. On Windows PowerShell use `pnpm.cmd` and `npx.cmd`.
Replace `<...>` placeholders before running. Never paste secrets into chat, issues or commits.

## What Cloudflare protects for you

- Volumetric DDoS (layer 3, 4 and 7) is absorbed on Cloudflare's network automatically. Workers get this always on, with no setup.
- TLS, HTTP/2 and HTTP/3 are handled by Cloudflare.
- Requests that never reach our code cost us nothing.

What Cloudflare does not do for you, and the Worker does: rate limits per IP and per user, login lockouts, per-user storage
limits, bans, and keeping one user away from another user's rows.

## Our limits

| Scope | Limit | On exceed |
|---|---|---|
| `/auth/*` per IP | 20 requests / 60 s (`RL_AUTH`) | 429 + `Retry-After` |
| new account creations per IP | 5 / hour | 429 |
| failed token/refresh/state checks per IP | 10 / 10 min | ban 10 min, doubling to 1 h, 24 h on repeats |
| `/api/sync` per user | 60 / 60 s (`RL_SYNC`) | 429 |
| any route per IP | 300 / 60 s (`RL_IP`) | 429 |
| request body | 1 MB, 500 mutations | 413 / 400 |
| per-user storage | 100,000 live rows, 50 MB of payload | 413 `quota_exceeded` |
| per-user daily writes | 50,000 mutations / UTC day | 429 `daily_quota` |
| pull page | 2,000 rows per table per call, cursor `next_since` | response includes `has_more` |
| repeated 429s from one IP or user | 5 in 10 min | escalating ban (10 min, 1 h, 24 h) stored in D1 `bans` |

Bans are checked from a small in-memory cache that reloads from D1 at most every 30 seconds. A ban you add or remove by hand
takes effect within about 30 seconds. Strikes reset after 24 hours without an incident. Error responses are generic and never
say whether a user exists.

## Look at what is happening

Recent abuse events (newest first):

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "SELECT datetime(at/1000,'unixepoch') AS time, key, kind, detail FROM abuse_log ORDER BY id DESC LIMIT 50"
```

Who is banned right now:

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "SELECT key, reason, strikes, datetime(banned_until/1000,'unixepoch') AS until FROM bans WHERE banned_until > strftime('%s','now')*1000 ORDER BY banned_until DESC"
```

Which IPs are noisiest in the last hour:

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "SELECT key, kind, COUNT(*) AS n FROM abuse_log WHERE at > (strftime('%s','now')-3600)*1000 GROUP BY key, kind ORDER BY n DESC LIMIT 20"
```

Heaviest users by writes today:

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "SELECT user_id, rows_live, bytes_live, writes_today FROM user_quota ORDER BY writes_today DESC LIMIT 20"
```

`abuse_log` rows older than 14 days are deleted automatically.

## Ban and unban by hand

Ban an IP for 24 hours (change the IP; for a user use `user:gh:<github id>`):

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "INSERT INTO bans (key, reason, banned_until, strikes, created_at) VALUES ('ip:203.0.113.7', 'manual', (strftime('%s','now')+86400)*1000, 3, strftime('%s','now')*1000) ON CONFLICT(key) DO UPDATE SET reason='manual', banned_until=excluded.banned_until, strikes=3"
```

Unban:

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "DELETE FROM bans WHERE key = 'ip:203.0.113.7'"
```

Clear every ban:

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "DELETE FROM bans"
```

Reset one user's daily write counter (for example after a bug of ours, not an attack):

```
npx.cmd wrangler d1 execute zen-dojo-db --remote --command "UPDATE user_quota SET writes_today = 0 WHERE user_id = 'gh:12345'"
```

## Under attack checklist

Work down the list. Stop when the traffic is under control.

1. Confirm it is real. Look at `abuse_log` and the bans (commands above). Open the Worker in the Cloudflare dashboard
   (Workers and Pages, `zen-dojo-sync`, Metrics) and check requests, errors and CPU time.
2. Ban the obvious offenders by hand (section above). One IP or a few: that is usually enough.
3. Lower the limits. In `packages/sync-worker/wrangler.jsonc` reduce the `limit` of `RL_AUTH`, `RL_SYNC` and `RL_IP`
   (for example 20 to 5, 60 to 20, 300 to 100), then deploy:
   ```
   pnpm.cmd --filter @habit/sync-worker deploy
   ```
4. Stop new sign-ups while you deal with it: remove the GitHub OAuth app's client secret in GitHub (Settings, Developer
   settings, OAuth Apps), or set `ADMIN_USER_IDS` aside and re-deploy once calm. Existing sessions keep syncing until they expire.
5. Revoke every session so everyone must sign in again (this does not delete any data; your devices keep working locally):
   ```
   npx.cmd wrangler d1 execute zen-dojo-db --remote --command "UPDATE sessions SET revoked_at = strftime('%s','now')*1000 WHERE revoked_at IS NULL"
   ```
   Access tokens already issued stay valid for up to 15 minutes. To cut those too, do step 6.
   Revoke one user only: add `AND user_id = 'gh:12345'`.
6. Rotate the signing key. This invalidates all access tokens at once:
   ```
   node packages/sync-worker/scripts/gen-keys.mjs --force
   npx.cmd wrangler secret put JWT_PRIVATE_JWK --config packages/sync-worker/wrangler.jsonc
   ```
   Paste the private key from `packages/sync-worker/jwt-private.jwk.json` when asked (do not print it). Then put the new
   public key printed by the script into `JWT_PUBLIC_JWK` in `wrangler.jsonc` and deploy (step 3 command). The web app
   re-reads the public key on an unknown `kid`, so no change is needed there.
7. If you have a custom domain on Cloudflare, switch on Under Attack Mode: dashboard, your zone, Security, Settings,
   Security Level, "I'm Under Attack". Turn it off when the attack stops. It does not apply to the plain `workers.dev` URL.
8. Add a WAF rate limiting rule (also needs a zone): dashboard, Security, WAF, Rate limiting rules, create a rule for
   URI path starts with `/auth` or `/api`, count requests per IP, block for 10 minutes above a low threshold. Which options
   you get depends on your plan; the Worker's own limits still apply without it.
9. After the attack: check `abuse_log`, unban any innocent address, restore the limits in `wrangler.jsonc`, and redeploy.

## Optional hardening (needs a custom domain)

These need the Worker behind a zone you control, so they are not set up today.

- Bot Fight Mode: dashboard, Security, Bots, switch it on for the zone.
- Turnstile on the sign-in start page: create a widget in the dashboard (Turnstile), render it on the web app's `/login`
  page, and verify the token with Cloudflare's siteverify endpoint before redirecting to `/auth/start`. Keep the secret key
  in a Worker secret, not in the repo.
- A WAF custom rule that blocks requests to `/auth/*` from countries you never use.

## Notes for developers

- The guard lives in `packages/sync-worker/src/guard/`. Banned and rate-limited requests are rejected before any D1 query.
- D1 is written only when a ban is made, on quota changes of a sync that writes, on account creation, and on auth events.
- `rows_live` and `bytes_live` in `user_quota` are upper-bound estimates (every mutation counts as a new row). If a user hits
  the row limit by mistake, set the real numbers with a `SELECT COUNT(*)` on their data and an `UPDATE user_quota`.
