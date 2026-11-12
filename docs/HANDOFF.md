# Handoff

Last updated 2026-11-11 (after release 0.7.1, plans written up to 0065). For the next agent (Claude Code, Antigravity or anything else).
Read this, then `AGENTS.md`, then `docs/plans/README.md` ("Next up"), then the plan you pick up.

**Update rule:** at the end of every round the lead updates the "State" section here and the "Next up" block in
`docs/plans/README.md`. If they disagree with the plan files, the plan files and the index at the bottom of the README win.

**Starting a fresh chat? Paste this:**

```
Read docs/HANDOFF.md and docs/plans/README.md ("Next up"). Tell me the current state, which plans are ready, what the next
round is and what is blocked on me. Then wait for my go.
```

## 1. The project

**Zen Dojo** (repo `Vraj0109/Zen-dojo`, local remote still named `habit-manager`; old names HabitManager, Prepwise) is an interview-prep
course and practice platform: DSA with a local code judge (C++, Java, JavaScript; Python is coming in plan 0062), system design depth, low-level design
Java projects, core CS, diagrams, reading tracker, spaced-repetition review, a 16-week plan. Local-first Next.js 16 + libSQL app, packaged as an
Electron desktop app, with optional **accounts and cloud sync** (GitHub sign-in through the site's `/hub` routes + a Turso hub database; before the plan 0073 cutover: Cloudflare Worker + D1). pnpm workspace: `apps/web`,
`apps/desktop`, `apps/extension`, `packages/shared`, `packages/sync-worker`. Layout and conventions are in `AGENTS.md`.

## 2. How we work (the user's rules)

- **Roles:** Claude Code is the lead/coordinator and writes plans (`/plan`); Antigravity implements, and in "rounds" the user runs **3 Claude agents
  and 3 Antigravity agents** with strict file ownership (see the round plans, for example `0065`). Claude agents take the heavy, trigger-sensitive,
  engine work and finish in about half Antigravity's time; Antigravity takes bulk content and UI work against fixed contracts. The user
  deliberately sends the token-heavy content work to Antigravity.
- **Git:** commit with plain-English messages only when told to; **never push, tag or add any AI attribution / `Co-Authored-By`** unless the user explicitly
  asks in that conversation. Never reuse or move a published tag.
- **Tests:** while working run only targeted tests (`pnpm exec vitest run <file>`, `pnpm -r typecheck`, eslint on changed files). The lead runs **one**
  `pnpm check` (6 to 9 minutes) at the end. Never run `pnpm desktop:build` (releases build on GitHub when a tag is pushed). Memory is tight: one heavy
  command at a time.
- **User data:** never touch `data/habit.db` or `%APPDATA%\HabitManager`; use `:memory:` or a copy (`DATABASE_URL=file:C:/Temp/habit-test.db`).
- **Secrets:** never print, store or commit secrets; the user sets them (`wrangler secret put`, GitHub secrets). Never run `wrangler ... --remote` from an agent.
- **UI:** no emoji (SVG icons; enforced by `no-emoji.test.ts`), wide layouts, plain specific language, no hype.
- **Windows:** use `pnpm.cmd`; PowerShell for wrangler.
- **Statuses:** implementer sets `implemented`; reviewer sets `done`. Plans 0051 to 0055 are built and released but still say `ready` until the user confirms
  the installed desktop app signs in.

## 3. State (2026-11-11)

**Released: 0.7.1** (tag `v0.7.1`, installers for Windows, macOS arm64, Linux AppImage built by `.github/workflows/desktop.yml`).

Built: accounts, GitHub sign-in, abuse guard, cloud sync (SQLite triggers, `lib/sync-engine.ts`, Worker pull by server time), desktop sign-in through `zendojo://`,
Java editor for "Your classes", multi-select filters and deep search on `/dsa`, accent plus grey solved ticks, separate delete-cloud-data and delete-device-data,
admin problem editor, solved-means-tests-passed, TLE handling. Cloudflare (retired by plan 0073, see `docs/migration-cloudflare-to-vercel.md`): Worker `zen-dojo-sync`, D1 `zen-dojo-db`, deploy workflow `deploy-worker.yml` (kept until decommission).

**Rounds thirteen to sixteen are done. Released up to 0.7.3; plans 0068 (Buddy avatar, AI lines, `/admin/study`) and 0069 (Petdex pets, pet-voice AI, chat with the Buddy, edge-snapping throw physics, Portfolio and certificates) are implemented with `pnpm check` green and not yet released.** Still to check by hand: importing a Petdex pet in the Settings screen and watching it animate, the Portfolio page and a certificate print, Gemini and Codex through the Test button once installed. The public profile page (`/u/<userId>`) needs the hosted site (plan 0058).

**Round twelve is done (plan 0065, `pnpm check` green, not yet released):** Python in the judge (0062), Java and Python reference solutions for all 486 problems as
plain files plus a verifier (0063, see `docs/solutions.md`), the "tools for running code" check and install notes (0061 part A and B1/B2), three UI fixes (0057).
Known gap: `cses-grid-path-description.py` is correct but too slow for the 5 s Python limit (fails `solutions:verify`). Still to check by hand: Python picker and run in the
browser, JavaScript without Node on the first CI-built release, macOS/Linux install commands. Python on Windows needs `HABIT_PYTHON` if a shell predates the install.

Open work, in plan order (index: `docs/plans/README.md`):

| Plan | What | Status |
|---|---|---|
| 0061 B3/B4 | Windows and macOS code signing | waits for the user's route and GitHub secrets |
| 0058 | **Next:** hosted web app (per-user database acting as a sync device; no code running on the server) | ready |
| 0059 | Phone read-only mode, installable web app, bottom nav | ready, needs 0058 deployed to be useful |
| 0045 | Admin study pages (the `/admin/study` link is a 404) | in progress |
| 0022 / 0032 | More problem sources; old hosted roadmap (superseded by 0058) | open |

Known gaps: no phone account button (0059), some tables do not sync yet (reading list, stuck list, boss fights), 0036's schedule shift is replaced by 0056.
User-side chores (optional tidy-ups, nothing depends on them): replace the broad Cloudflare API token, delete the R2 key and the old `SYNC_TOKEN` Worker secret, fix the OAuth app homepage typo. Desktop sign-in was confirmed working on 2026-11-11.

## 4. Things that have bitten before

- **Windows Smart App Control** blocks unsigned programs that `g++` just built (`spawn UNKNOWN` / `EPERM`). The judge reports `unavailable`, the editor banner switches
  to Java/JavaScript; Java and Node run through signed runtimes. See `docs/troubleshooting.md`.
- The desktop app's JavaScript judge currently needs `node` on PATH (plan 0062 changes that to the app's own runtime).
- The installed desktop app holds port 3000; `pnpm dev` then fails or shows the installed app. `pnpm desktop:dev` only opens a window; run `HABIT_DESKTOP=1 pnpm dev` first.
- Server Components cannot set cookies; only route handlers may refresh auth tokens (rotation reuse revokes the device).
- Never import `server-only` modules into client components (the production build, not typecheck, catches it).
- Append-only migrations in `lib/db.ts`; `tasks`, `problem_notes`, settings and others are synced with fixed column lists (`lib/sync-triggers.ts` and the Worker) so a new column needs
  a Worker + D1 migration too. Device-specific settings must go on the sync denylist.
- Problems are **TypeScript** (`packages/shared/src/judge/problems-*.ts`); lessons are Markdown (`packages/shared/content`, `pnpm content:build`); Java and Python solutions will be plain files
  (`packages/shared/content/solutions`, plan 0063).

## 5. Machine and commands

Windows 11, Node v26, pnpm, g++ (WinLibs), JDK Temurin 17. Python 3 is needed once plan 0062 lands.

```powershell
pnpm.cmd dev                                   # web app on http://localhost:3000 (use a copy of the database)
pnpm.cmd exec vitest run <file> -t "<filter>"  # fast targeted test
pnpm.cmd -r typecheck
pnpm.cmd check                                 # lint + typecheck + test + build; lead runs once at the end
pnpm.cmd content:build                         # lessons Markdown -> generated TypeScript
```
