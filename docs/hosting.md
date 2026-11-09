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
