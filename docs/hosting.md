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

The same app can run as a website where each person signs in with GitHub and sees their own progress. Design, the
decision record and the checked provider facts are in `docs/hosted-architecture.md`. The desktop app needs none of this.

Hosting: **Vercel** (Hobby, free), project root `apps/web`. Data: one **Turso** database per signed-in user. Signed-out
visitors browse as guests on a throwaway in-memory database; nothing they do is saved. Settings live in Vercel
environment variables, never in the repo.

| Variable | Secret | Meaning |
| --- | --- | --- |
| `HABIT_HOSTED` | no | `1` turns hosted mode on |
| `CONTROL_DATABASE_URL` | no | `libsql://` URL of the control database |
| `CONTROL_DATABASE_AUTH_TOKEN` | yes | token for the control database |
| `TURSO_API_TOKEN` | yes | Turso Platform API token (creates and deletes user databases) |
| `TURSO_ORG` | no | Turso organization slug |
| `TURSO_GROUP` | no | Turso group for new user databases |
| `HUB_URL` | no | base URL of sign-in and sync, `https://<site>/hub` (defaults to the site's own `/hub`; old `SYNC_WORKER_URL` still works as an override) |
| `HUB_DATABASE_URL` | no | `libsql://` URL of the hub database `zen-dojo-hub` |
| `HUB_DATABASE_AUTH_TOKEN` | yes | token for the hub database |
| `GITHUB_CLIENT_ID` | no | GitHub OAuth app id |
| `GITHUB_CLIENT_SECRET` | yes | GitHub OAuth app secret |
| `JWT_PRIVATE_JWK` | yes | private signing key for sign-in tokens |
| `JWT_PUBLIC_JWK` | no | matching public key |
| `ADMIN_USER_IDS`, `ALLOWED_REDIRECTS`, `ALLOWED_ORIGIN` | no | admin ids, allowed sign-in return addresses, CORS origin |
| `PUBLIC_SITE_URL` | no | public origin of the site, no trailing slash |

After the move (plan 0073) sign in and sync go through the site's own `/hub` routes and the hub database; the former Worker secrets are Vercel environment variables.
Before cutover the Cloudflare Worker `zen-dojo-sync` still serves them; the steps to move are in `docs/migration-cloudflare-to-vercel.md`.

First deploy checklist:

1. Make a Vercel account (Hobby) and a Turso account.
2. In Turso, create a group and note the organization slug and the group name.
3. Create the control database in that group, create a token for it, and note its `libsql://` URL.
4. Create a Platform API token in Turso (account settings, API tokens).
5. Create the hub database `zen-dojo-hub` and its token (`docs/migration-cloudflare-to-vercel.md`).
6. In Vercel, import the GitHub repo as a new project. Set Root Directory to `apps/web`. Add the environment
   variables from the table above and mark the secret ones as sensitive. If you do not know the site address yet, set
   `PUBLIC_SITE_URL` after the first deploy and redeploy.
7. Deploy.
8. Set `ALLOWED_REDIRECTS` in Vercel to `https://<site>/auth/callback` (exact, no trailing slash) and redeploy.
9. Open the site, sign in with GitHub, and check that your progress appears after the first sync.
10. For later releases: deploy the new app version first, then let each user's database migrate on first use. Never
    run two versions against one database at once.

Limits: the Turso Free plan allows 100 databases (the control database is one, so about 99 users) and 10 million rows
written per month for everyone. Vercel Hobby is for non-commercial, personal use only. Details and sources:
`docs/hosted-architecture.md`.

What is not available hosted:

- Running code (Run, Submit, the Java project Run, tool installs): every such route answers 403 `hosted-no-run`;
  the screen says "Running code is available in the desktop app". Editing, saving and reading keep working.
- The browser extension and its pairing key, restoring a database file, the local backup download in Settings, AI
  help that uses programs on the computer, and the `/admin` portal (404).
- Saving as a guest: signed-out visitors can look around, but progress saves only after GitHub sign-in.
- Sync runs on request (at most once per 20 seconds per user) and after each change, not in the background.
