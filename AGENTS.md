# Zen Forge: rules for every coding agent

Shared rules for any AI agent working in this repo (Claude Code, Antigravity, others). Tool-specific roles live in
`CLAUDE.md` (planner/reviewer) and `GEMINI.md` (implementer); both import this file.

Personal progress tracker for a 16-week SDE2/SWE3 interview-prep roadmap. Local-first: Next.js app + SQLite file,
also packaged as an Electron desktop app. Product spec: `SPEC.md` (git-ignored, may be absent): read it only when
planning new features.

## How work flows: plan, implement, review

1. The user asks Claude for a feature. Claude writes a plan in `docs/plans/NNNN-short-name.md` (template:
   `docs/plans/TEMPLATE.md`, workflow: `docs/plans/README.md`) and sets its status to `ready`.
2. The user asks Antigravity to implement that plan. It follows the plan's steps, updates the plan's checkboxes and
   *Implementation notes*, runs the checks, and sets the status to `implemented`.
3. The user asks Claude to review. Claude checks the diff against the plan's acceptance criteria and writes the
   *Review* section: `done`, or `changes-requested` with a list of fixes.

The plan file is the contract and the shared memory between tools. Whoever works on a plan keeps it up to date.

## Commands (run from repo root)

- `pnpm dev` / `pnpm build` / `pnpm start`: web app on http://localhost:3000
- `pnpm test`: Vitest, all tests once (~6s). `pnpm check`: lint + typecheck + test + build (what CI runs)
- `pnpm desktop:build`: Electron installer for the current OS in `apps/desktop/dist/` (~2 min);
  `pnpm desktop:dev`: Electron window on the dev server
- Windows: in PowerShell use `pnpm.cmd` / `npm.cmd` (script execution policy may block `pnpm.ps1`)

## Layout

- `packages/shared/src/`: pure logic + data, no I/O. `plan.ts` (16 weeks, task templates), `dsa.ts`
  (67 patterns, 201 problems; LeetCode slugs verified against LeetCode), `dates.ts`, `game.ts` (XP/level/streak),
  `study.ts` (study areas: concept checklists + practice exercises; system design and LLD from the PDF, core CS written
  for this app), `stats.ts` (badges, heatmap, best streak), `focus.ts` (per-week patterns/concepts/designs that Today
  links tasks to), `reading.ts` (reading list), `learn/` (lessons per concept; `deep-*.ts` and `more-*.ts` recap and
  deeper sections; design walkthroughs + `design-extra.ts` follow-ups; LLD reference answers + `lld-extra.ts`;
  `dsa-*.ts` pattern guides with C++ templates; tests check every item has its content), `revise.ts` (last-days plan,
  key numbers, quiz deck, seeded shuffle)
- `apps/web/lib/`: server-only data layer. `db.ts` (libSQL client + `MIGRATIONS`), `schema.ts` (Drizzle),
  `tasks.ts`, `dsa.ts`, `progress.ts` (XP/streak from every XP row: tasks, solves, practice sessions, covered
  concepts), `study.ts`, `stats.ts` (heatmap, balance, badges), `focus.ts` (week focus + task links), `review.ts`
  (review queue), `revise.ts` (interview date, weak spots), `struggles.ts` (stuck list), `timer.ts` (focus minutes),
  `boss.ts`, `reading.ts`, `diagrams.ts` (images stored base64; served by `api/diagrams/[id]`), `pattern-notes.ts`,
  `roadmap.ts`, `backup.ts`, `leetcode/{client,sync,extension}.ts`
- `apps/web/app/`: pages `/` (Today), `/review`, `/revise` (Quick revise), `/dsa`, `/dsa/boss`, `/dsa/pattern/[id]`,
  `/dsa/[id]`, `/study/reading`, `/study/diagrams`, `/study/[area]`, `/study/[area]/[id]`, `/roadmap`, `/profile`
  (stats), `/profile/settings`; sidebar nav in `nav.tsx`; all mutations in `actions.ts` (server actions);
  `api/ext/*` route handlers for the extension (pairing-key auth in `lib/leetcode/extension.ts`)
- `apps/extension/`: MV3 extension, plain JS + `// @ts-check` (typechecked, no build step). `lib/leetcode.js`
  (queries/parsing) and `lib/sync.js` (backfill/recent/capture, I/O injected) are pure and tested; `content.js`
  runs on leetcode.com and calls GraphQL with the user's own session; `background.js` is the only part that
  calls the app
- `apps/desktop/`: Electron shell, plain JS + `// @ts-check`. `scripts/prepare-server.mjs` builds the web app with
  `HABIT_STANDALONE=1` (Next `output: "standalone"`) and copies it to `server/` with pnpm's symlinked packages
  flattened (installers drop symlinks); `scripts/after-pack.cjs` adds `server/node_modules` (extraResources skips it).
  `main.js` runs the server with `utilityProcess` on 127.0.0.1:3000 (or a free port), `DATABASE_URL` in the OS
  app-data folder. `lib/setup.js` and `lib/updates.js` are pure and tested. To try a build without touching real
  data, set `HABIT_DATA_DIR`
- `docs/content-packs.md`: the JSON format for adding lessons and problems without code (`packages/shared/src/packs.ts`, `apps/web/lib/packs.ts`)
- `docs/plans/`: feature plans (see the workflow above)
- `data/habit.db`: the user's real data (git-ignored). Never modify it; test against a copy or `:memory:`

## Conventions

- **Next.js 16 with `cacheComponents`**: APIs differ from older Next. Check `apps/web/node_modules/next/dist/docs/`
  before using unfamiliar APIs. Request-time data goes in an async component that calls `await connection()`,
  wrapped in `<Suspense>`. Server actions call `refresh()` after mutating. No `Math.random()`/`Date.now()` during
  render (lint rule `react-hooks/purity`); compute in `lib/` or use seeded helpers.
- Dates are local `YYYY-MM-DD` strings (helpers in `dates.ts`); never use UTC day math.
- Schema changes: append a new SQL string to `MIGRATIONS` in `db.ts` and update `schema.ts`. Never edit a
  shipped migration (`PRAGMA user_version` tracks them). New tables must also be added to `BACKUP_TABLES` in
  `lib/backup.ts`.
- XP is computed from rows (`tasks.xp` where done, `problem_solves.xp`), not stored as a running total.
- LeetCode: the app's own sync is anonymous public GraphQL (`leetcode/client.ts`); never give the app
  LeetCode cookies/credentials. Private data (code, notes) comes only via the extension, which runs in the
  user's logged-in leetcode.com tab. Both paths record solves through `recordAccepted` in `leetcode/sync.ts`.
- Tests: `*.test.ts` next to the code. DB tests use `DATABASE_URL=":memory:"`, reset `globalThis.habitDb`,
  fake only `Date` (`vi.useFakeTimers({ toFake: ["Date"] })`), and stub `fetch` for LeetCode.
- UI: Tailwind v4 with theme tokens in `app/globals.css` (`bg-surface`, `text-muted`, `border-line`,
  `bg-accent`…); shared bits in `app/ui.tsx` and `app/learn-blocks.tsx`. Forms post to server actions and work
  without JS. The user prefers wide layouts over narrow centered pages.
- Learning content is written for this app (study notes, not copied from books). Keep it accurate; tests in
  `learn/learn.test.ts` enforce coverage.

## Desktop releases and updates

- Release: bump `version` in `apps/desktop/package.json`, commit, `git tag vX.Y.Z` (must match, the workflow checks),
  push the tag. `.github/workflows/desktop.yml` builds Windows/macOS/Linux installers and publishes a GitHub release
  with `latest*.yml` + `.blockmap`.
- Installed apps check that release at start and every 6 h (electron-updater): Windows and AppImage download and
  install on restart; macOS only notifies (no Developer ID). Never reuse or move a published tag; ship a new version.
- Before a new version first starts, `main.js` copies `habit.db` to `backups/` in the app-data folder (newest 5 kept),
  so a bad migration can be undone.

## Rules for every agent

- **Git:** never `git commit` or `git push` unless the user explicitly asks in that conversation. Never add a
  `Co-Authored-By` line or any AI attribution to commits. Suggest a commit message instead.
- **Done means checked:** run `pnpm test`, then `pnpm check`, before saying work is finished. Report failures as
  they are; don't hide or skip them.
- **Stay in scope:** do what the plan or request says. Note other problems you find instead of fixing them silently.
- **User data:** never read credentials, never modify `data/habit.db` or the desktop app-data folder; use copies or
  `:memory:` for testing.
- **Writing for the user:** plain, specific language; short sentences; no hype.
