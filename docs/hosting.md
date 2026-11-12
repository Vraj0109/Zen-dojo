# Using a remote database (libSQL / Turso)

The app stores everything in a libSQL database. By default that is a file on this computer (`data/habit.db`). The same code can use a
remote libSQL database, for example one on Turso:

```
DATABASE_URL=libsql://<your-db>.turso.io
DATABASE_AUTH_TOKEN=<token from the database provider>
```

- `DATABASE_AUTH_TOKEN` is only sent when it is set. With a `file:` address nothing changes.
- On the first start the app runs its migrations against that database (it records how many have run in `PRAGMA user_version`), so an
  empty remote database becomes a complete one. Never run two different app versions against one database at the same time during an upgrade.
- Content added with `pnpm content:add` (table `content_items`) lives in the same database. To add content to a hosted copy, either point
  the command at the database (`DATABASE_URL` and `DATABASE_AUTH_TOKEN` set) or use `--url` with the app's `CONTENT_ADMIN_TOKEN`
  (see `docs/content-editing.md`, "Add one thing").
- The desktop app keeps its database in the operating system's app-data folder and does not need any of this.
- Accounts, one progress set per user and a shared content database are a later step (plan 0032). Today the database holds one person's data.
- Phone use, installing to the home screen and reader mode: `docs/mobile.md`.

## Hosted Zen Dojo (plan 0058)

The same app can run as a website where each person signs in with GitHub and sees their own progress. Design and the
checked provider facts are in `docs/hosted-architecture.md`. The desktop app does not need any of this.

Hosting target: **Cloudflare Workers** (OpenNext adapter). Settings live in Worker variables and secrets, or in GitHub
secrets and variables for the deploy workflow, never in the repo. Secrets are marked.

| Variable | Secret | Meaning |
| --- | --- | --- |
| `HABIT_HOSTED` | no | `1` turns hosted mode on |
| `SYNC_WORKER_URL` | no | base URL of the deployed sync Worker |

The web Worker is `zen-dojo-web` (`apps/web/wrangler.jsonc`). The sync Worker's own secrets (`GITHUB_CLIENT_SECRET`, `JWT_PRIVATE_JWK`) are set with `wrangler secret put` and are separate.

First deploy checklist:

1. Deploy the sync Worker first. Set `ALLOWED_REDIRECTS` in `packages/sync-worker/wrangler.jsonc` to
   `https://<your-site>/auth/callback` (exact, no trailing slash), then deploy it.
2. Nothing to create for data: each user's database is a SQLite Durable Object made on first use (binding `USER_DB`,
   class `UserDb`, migration `v1` in `wrangler.jsonc`).
3. Deploy the site (below). `HABIT_HOSTED=1` is set in `wrangler.jsonc`.
4. Open the site, sign in with GitHub, and check that your progress appears after the first sync.
5. Deploy a new app version first, then let each user's database migrate on first use. Never run two versions against
   one database at once.

Deploying the site to Cloudflare:

- Automatic: `.github/workflows/deploy-web.yml` (manual run, tag `web-v*`, or push to main touching `apps/web`).
  GitHub secrets: `CLOUDFLARE_API_TOKEN` (Workers edit permission), `CLOUDFLARE_ACCOUNT_ID`. GitHub variables:
  `SYNC_WORKER_URL`, and `HOSTED_WEB_ENABLED=true` (without it only a manual run deploys). No Turso account or secret.
- By hand (Linux, macOS or WSL; the adapter does not support native Windows): from `apps/web`, `pnpm cf:build`, then
  `pnpm cf:deploy`. Local preview: `pnpm cf:preview`. Set secrets with `wrangler secret put <NAME>`.
- After the first deploy, set `ALLOWED_REDIRECTS` on the sync Worker to `https://<site>/auth/callback` and redeploy it.
- Per-user data is one Durable Object per user (facts and limits: `docs/hosted-architecture.md`). The Worker entry is `apps/web/worker.ts`.

What is not available hosted:

- Running code (Run, Submit, the Java project Run, tool installs): every such route answers 403 `hosted-no-run`;
  the screen says "Running code is available in the desktop app". Editing, saving and reading keep working.
- The browser extension and its pairing key, restoring a database file, the local backup download in Settings, AI
  help that uses programs on the computer, and the `/admin` portal (404).
- Sync runs on request (at most once per 20 seconds per user) and after each change, not in the background.
