# HabitManager

Daily progress tracker for the SDE2 (Amazon) / SWE3 (Google) 16-week prep roadmap.
Bare-bones version: daily + weekly tasks generated from the roadmap, tick/untick, custom
tasks, XP, levels and a streak. Data is stored locally in `data/habit.db` (SQLite).

## Quick start

```powershell
.\setup.cmd          # installs anything missing (Node, pnpm, VS Code extensions), then builds
pnpm start           # http://localhost:3000
```

For development with hot reload: `pnpm dev`.

### Windows: "running scripts is disabled on this system"

PowerShell blocks `pnpm.ps1` / `npm.ps1` when its execution policy is `Restricted` (the
Windows default). `setup.cmd` detects this and offers to fix it; or run once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**What it does**

| Policy | Effect |
|---|---|
| `Restricted` (Windows default) | No `.ps1` scripts run at all, including the `pnpm.ps1` / `npm.ps1` launchers |
| `RemoteSigned` (this fix) | Scripts on your computer run; scripts downloaded from the internet run only if digitally signed |

- Applies to **your user account only** (`-Scope CurrentUser`), not other users or the whole machine. No admin needed.
- Persistent: survives restarts and applies to every PowerShell window.
- Only affects PowerShell `.ps1` files. `.exe` programs (node, git) and `.cmd` files were never blocked.
- A company Group Policy overrides it; in that case use `pnpm.cmd` instead.

**Check the current setting**

```powershell
Get-ExecutionPolicy -List
```

**Undo it** (back to the Windows default)

```powershell
Set-ExecutionPolicy -Scope CurrentUser Undefined
```

**Don't want to change it?** Type `pnpm.cmd` / `npm.cmd` instead of `pnpm` / `npm`. They work under any policy.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | TypeScript check across the workspace |
| `pnpm lint` | ESLint |
| `pnpm test` | Run all tests once (Vitest) |
| `pnpm test:watch` | Re-run tests on every file change |
| `pnpm check` | Everything CI runs: lint, typecheck, test, build |

## Tests and CI

- `packages/shared/src/*.test.ts`: date math (including DST), XP/levels, streaks, plan data.
- `apps/web/lib/tasks.test.ts`: task generation, ticking, XP, streaks and plan-start changes
  against a real in-memory SQLite database (no files touched).
- GitHub Actions (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, `test` and `build` on
  every push to `main` and every pull request, on both Windows and Linux.

Run `pnpm check` before pushing to catch what CI would.

## Layout

```
apps/web/          Next.js app (Today page, server actions, SQLite via Drizzle + libSQL)
packages/shared/   Roadmap data, day templates, date helpers, XP/level/streak logic
data/              Local database (git-ignored)
```

Set `DATABASE_URL` (e.g. `file:C:/path/habit.db`) to store the database somewhere else.
