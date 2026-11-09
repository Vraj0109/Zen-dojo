# 0032: Roadmap: a hosted Zen Dojo with accounts and sync

- **Status:** draft (a design for discussion; no agent should implement this yet)
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** (not started)
- **Spec:** none

## Goal

Turn Zen Dojo from one person's local app into an official site where people create accounts, and progress follows them across devices,
while the desktop app keeps working offline. Content is updated without redeploying the app (0030). This page is the map: what has to
change, in what order, what is risky, and what the owner has to decide.

## Where we are

- Single user, one local libSQL file, no login. All user tables (`tasks`, `problem_solves`, `settings`, notes, `solution_runs`, `pack_progress`,
  practice sessions, timer rows ...) have no user column.
- libSQL is a good fit: the same SQL runs against a hosted libSQL (Turso) database with `DATABASE_URL` and an auth token (0030 step 6).
- Content (problems, lessons) is TypeScript plus stored items (0030), separate from user data.
- The judge compiles and runs user code on the machine that runs the app. That is fine locally and **dangerous on a public server**.

## Phases

1. **Content separate from users (0030).** Content in a shared database or served by the app; progress tables only refer to content ids.
2. **Multi-user data.** Add `user_id TEXT NOT NULL` to every user table; a migration sets the existing rows to a fixed id (`local`). All reads and
   writes in `apps/web/lib/*.ts` take a `userId` from one function (`currentUser()`); local mode returns `local`. Unique keys become
   `(user_id, ...)`. Backup/restore becomes per user. Add tests that user A never sees user B (a two-user fixture on `:memory:`).
3. **Accounts.** Use an existing auth library rather than writing one: Auth.js (next-auth v5) with email magic link and Google/GitHub, sessions in
   the database. No passwords stored by us if magic link and OAuth only. Desktop app: signed out by default (local user), optional "Sign in to sync".
4. **Hosted database.** Turso (libSQL) first: no query changes, branches, point-in-time restore. One database for content and users to begin with;
   split later if it grows. Postgres only if a feature needs it (cost: Drizzle dialect swap and all raw SQL in `MIGRATIONS`).
5. **Sync for the desktop app.** Local-first: progress rows are mostly append-only (solves, practice sessions, timer rows), so merge by union of ids;
   notes and settings use last-write-wins on `updated_at`. Options: Turso embedded replicas (least code), or a small push/pull endpoint with a
   change log table. Decide after phase 3; start with "download my data / upload my data" (backup file) as the safe first version.
6. **Judge on a server.** The hard part. Options: (a) a sandbox service you run (containers with no network, CPU/memory/pid limits, read-only
   filesystem, seccomp, gVisor or Firecracker); (b) a hosted judge API (Judge0, Piston) with a self-hosted instance; (c) run in the browser
   (JavaScript in a Web Worker; C++/Java would need WASM toolchains and are heavy); (d) hosted site is for learning content and progress only, and
   running code stays in the desktop app. Recommendation: ship the hosted site **without** server-side code execution first (option d, with
   browser-side JavaScript if wanted), add a sandboxed judge later.
7. **Operations and policy.** Rate limits, abuse reports, email sending, privacy policy and data export/delete, backups, error tracking, costs,
   domain and HTTPS, terms. Content licence: our statements are in our own words and link to the originals; keep that for a public site.
8. **Admin and content roles.** The admin API from 0030 with tokens first; roles (owner, editor) when there is more than one editor.

## Order I would build it in

0030 (content without releases) -> 0033 phase 2 plan (multi-user schema, behind `currentUser()`) -> hosted libSQL for a single "owner" account ->
accounts (phase 3) -> data export/import -> sync -> judge decision.

## Decisions needed from the owner

1. Is the first hosted version allowed to skip running code on the server (progress, lessons and content only)?
2. Hosting target (Vercel, a VPS, Fly.io) and budget; Turso free tier is enough to start.
3. Sign-in methods (email link, Google, GitHub).
4. Free for everyone, or limits per account?
5. Should the desktop app stay free and offline-first even when the site exists? (Plan assumes yes.)

## Out of scope for now

Payments, teams, leaderboards, mobile apps.

## Implementation notes

## Review
