# Prepwise

Daily progress tracker for the SDE2 (Amazon) / SWE3 (Google) 16-week prep roadmap.
Data is stored locally in `data/habit.db` (SQLite).

| Page | What it does |
|---|---|
| **Today** (`/`) | Daily + weekly tasks from the roadmap, each with a button to the exact problem, concept or design to work on; the week's focus panel (patterns, concepts, designs with your progress), with ‹ › to work ahead (`/?week=N`); custom tasks, XP, level, streak, review reminders |
| **Review** (`/review`) | One queue for everything due: stuck problems (3 days after each miss), 14-day re-solves, concepts rated below Solid, designs due for practice. Quick actions (solved cold, still stuck, rate 1-5) and skip |
| **Quick revise** (`/revise`) | For the days before an interview: set your interview date for a countdown (also on Today) and a plan for each of the last 7 days; your weak spots (concepts below Solid, uncovered patterns, designs not practised, the stuck list); every "Remember" box for DSA, system design, LLD and core CS on one page (filter to weak spots only); latency/capacity numbers, Big-O and the interview frameworks; a quiz of 230+ interview questions with key points to check against. Print or save as PDF |
| **DSA** (`/dsa`) | 67 patterns / 201 problems from the roadmap; mark solved (XP by difficulty), re-solve due 14 days later; LeetCode auto-sync; search and filter by name/number, difficulty, status (incl. stuck list), notes and LeetCode topic; a cheat sheet per pattern (your template code + how to recognize it) |
| **Boss fight** (`/dsa/boss`) | 2 unsolved mediums/hards from your weakest patterns so far, a 2-hour timer, and a result form (solves recorded, hints and misses go on the stuck list, ticks the weekend timed-set task) |
| **Pattern guide** (`/dsa/pattern/<id>`) | For each of the 67 patterns: the idea, how to spot it, steps, a C++ template with complexity, variations tied to the list's problems, pitfalls and a recap; your practice list, cheat sheet and a focus timer alongside |
| **Problem** (`/dsa/<id>`) | Patterns it belongs to, solve status, your notes and saved solution code (📝 on the DSA list), and every accepted LeetCode submission imported by the extension; focus timer; stuck list (log a hint/miss/slow solve, clear when solved cold) |
| **Design** (`/study/sd`) | System design from the roadmap: 30 concepts (fundamentals, data storage, building blocks) with a "what to know" checklist, 1-5 confidence and notes; 27 classic designs with a practice log scored on the 45-minute framework, re-practice in 7/14/30 days by score, and notes. Every concept has a lesson (overview, an explanation per checklist point, a "Remember" box, deeper sections with worked examples and code, interview questions, common mistakes); every design has a reference walkthrough (requirements → estimates → API → data → design → deep dives → trade-offs), the numbers and decisions to remember, and follow-up questions with answers, a focus timer, your diagrams (image upload or Excalidraw link) and a reading list |
| **Reading list** (`/study/reading`) | 45 papers, books, docs and engineering posts (DDIA, Dynamo, Raft, Kafka, Stripe idempotency…) linked to the concepts they explain; mark read, add your own links |
| **Diagrams** (`/study/diagrams`) | Gallery of every diagram you saved, for week 16 revision |
| **LLD** (`/study/lld`) | The roadmap's 6 LLD topics as lessons + checklists, and its 10 classic problems with a practice log scored on the 4-step LLD answer, a reference answer with a Java sketch, one use case traced through the classes, edge cases to name, notes and your class code |
| **Core CS** (`/study/core`) | Operating systems, databases and networks: 24 lessons with checklists, interview questions, confidence, notes and review reminders |
| **Roadmap** (`/roadmap`, bottom of the sidebar) | All 16 weeks with focus areas; goals, tasks, problems and XP per week; link to any week's focus |
| **Profile** (`/profile`) | Level, streak (current and best), 16-week activity heatmap, balance of the last 28 days' XP vs the plan's 40/35/15/10 split, and 19 badges with progress |
| **Settings** (`/profile/settings`) | Plan start date, LeetCode username sync and extension pairing key, backup: download all data as one JSON file; restore from one (all or nothing, safety copy saved to a `backups` folder next to the database first) |

### LeetCode auto-sync

In Profile → Settings, connect your LeetCode username. The app reads your **public** recent accepted
submissions from LeetCode's GraphQL API (no login, no password) and:

- ticks roadmap problems you solve (marked ⚡) and records a re-solve if you solve one again 14+ days later;
- records problems outside the roadmap under "Other LeetCode solves" (XP by difficulty);
- ticks today's DSA warm-up task when you solve something today.

It syncs when you open Today or DSA (at most every 15 minutes) or when you press **Sync now**.
LeetCode only exposes your 20 most recent accepted submissions, so open the app on busy days.
Each submission is imported once, so undoing an imported solve sticks.

### Browser extension: your full LeetCode history

`apps/extension` is a Chrome/Edge extension that imports **your own** accepted submissions:
code, language, runtime and memory (with percentiles), exact time, and the notes you wrote on them.
It calls LeetCode from inside a leetcode.com tab where you're already logged in, so it never sees your
password and nothing about your login is stored. It only runs on leetcode.com and only talks to the app on
`localhost` / `127.0.0.1`.

**Install (once)**

1. Start the app (`pnpm start`) and open **Profile → Settings**. Under *Browser extension*, click **Show pairing key** and copy it.
2. In Chrome go to `chrome://extensions` (Edge: `edge://extensions`), turn on **Developer mode**,
   click **Load unpacked** and pick the `apps/extension` folder.
3. Click the extension's icon (pin it from the puzzle-piece menu), paste the key, and click **Save & test**.

**Use**

- **Import history**: in the popup. It reads your solved list, then only checks problems that are **on
  Prepwise** (the roadmap list plus your other synced problems) and saves every accepted submission of
  those, three requests at a time. Keep the leetcode.com tab it opens until it finishes. Running it again only
  fetches new submissions. *Everything I've solved* imports all your solved problems instead (slower).
- **Live capture**: with a leetcode.com tab open, each Accepted submission is sent to the app within seconds,
  and your 20 most recent are caught up every 10 minutes.
- Submissions show up on each problem's page (`/dsa/<id>`) under *Your LeetCode submissions*.
- On the DSA list each problem shows: ✓ solved, 📝 notes (yours in the app or on LeetCode), 💻 *n* saved
  solutions, and its LeetCode topics. Topics arrive with *Import history* (no extra requests to LeetCode), so
  they appear for problems you've solved.
- Solves dated **before your plan start** count as solved (and schedule a re-solve) but give **no XP**,
  so years of history don't inflate your level.
- After pulling changes to `apps/extension`, click the reload icon on the extension's card in `chrome://extensions`.

**New key**: *New key* in Profile → Settings makes the old key stop working; paste the new one into the extension.
The key keeps other websites and programs from adding data to the app.

The database schema is versioned (`PRAGMA user_version`, see `MIGRATIONS` in `apps/web/lib/db.ts`);
existing databases upgrade automatically on start.

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

## Desktop app (Windows, macOS, Linux)

`apps/desktop` wraps the app in Electron: it runs the same Next.js server inside the app on
`http://127.0.0.1:3000` and shows it in a window. The browser extension keeps working unchanged.

**Get an installer**

- **From GitHub:** Actions → *Desktop app* → *Run workflow*. When it finishes, download the installer for your OS
  from the run's *Artifacts*. Tagged versions are published as GitHub releases (see *Releasing a new version*
  below); download the installer from the newest release.
- **Build it yourself:** `pnpm desktop:build` builds the installer for the OS you run it on, in `apps/desktop/dist/`:
  `.exe` (Windows), `.dmg` (macOS, Apple Silicon), `.AppImage` (Linux).

**Your data** lives in the OS app-data folder, not the repo (File → *Open data folder*):

| OS | Folder |
|---|---|
| Windows | `%APPDATA%\HabitManager` |
| macOS | `~/Library/Application Support/HabitManager` |
| Linux | `~/.config/HabitManager` |

(The folder keeps its old name on purpose, so updating from HabitManager to Prepwise keeps your data.)

On first launch it offers to import your existing `data/habit.db` (it copies the file; the original isn't changed).
Stop `pnpm start` / `pnpm dev` first so the copy is up to date. Or start fresh and restore a JSON backup in
Profile → Settings. The desktop app and `pnpm start` use separate databases, so pick one to use day to day.

**First launch warnings.** The installers aren't signed with a paid certificate:

- **Windows:** SmartScreen says *Windows protected your PC*. Click *More info* → *Run anyway*.
- **macOS:** if it says the app *is damaged* or *can't be opened*, run `xattr -cr /Applications/Prepwise.app`, then
  open it again (or right-click → *Open*).
- **Linux:** `chmod +x Prepwise-*.AppImage`. If it exits with a *SUID sandbox* error (Ubuntu 24.04+), start it
  with `--no-sandbox`.

**Updates.** The installed app checks GitHub releases 10 seconds after it starts and every 6 hours (or Help →
*Check for updates…*):

- **Windows and Linux (AppImage):** the update downloads in the background, then it asks *Restart now* or *Later*
  (Later installs it the next time you quit).
- **macOS:** installing updates needs a paid Apple Developer ID, so it tells you a new version is out and opens the
  release page to download the new `.dmg`.
- **Your data is backed up first.** The first time a new version starts, it copies `habit.db` to `backups/` in the
  data folder (`habit-v0.2.0-to-v0.3.0-….db`) before any database migration runs; the newest 5 are kept.

**Releasing a new version**

1. Bump `version` in `apps/desktop/package.json` (e.g. `0.2.0` → `0.3.0`) and commit.
2. `git tag v0.3.0` then `git push origin main --tags`. The tag must match the version or the workflow stops.
3. The *Desktop app* workflow builds all three installers and publishes the release; installed apps pick it up.

**Port.** It uses 3000, the extension's default. If 3000 is busy (say `pnpm start` is running), it picks another port
and tells you which; set that URL in the extension, or close the other app and restart. `HABIT_PORT=4000` picks a port.

**Development:** `pnpm desktop:dev` opens the window on the dev server (run `pnpm dev` first).
`pnpm --filter desktop prepare-server` then `pnpm desktop` runs the bundled server without making an installer.
`HABIT_DATA_DIR=/some/folder` uses another data folder, to try a build without touching your data.

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
| `pnpm desktop:build` | Desktop installer for this OS (`apps/desktop/dist/`) |
| `pnpm desktop:dev` | Desktop window on the dev server (run `pnpm dev` first) |

## Tests and CI

- `packages/shared/src/*.test.ts`: date math (including DST), XP/levels, streaks, plan data.
- `apps/web/lib/tasks.test.ts`: task generation, ticking, XP, streaks and plan-start changes
  against a real in-memory SQLite database (no files touched).
- GitHub Actions (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, `test` and `build` on
  every push to `main` and every pull request, on both Windows and Linux.
- `.github/workflows/desktop.yml` builds the desktop installers on Windows, macOS and Linux (run by hand, or on a `v*` tag).

Run `pnpm check` before pushing to catch what CI would.

## Working with AI agents

Features are planned by Claude Code and implemented by Antigravity, with the plan file as the hand-off:

1. In Claude Code: `/plan <feature>` writes `docs/plans/NNNN-name.md` (status `ready`).
2. In Antigravity: "Implement docs/plans/NNNN-name.md" (status becomes `implemented`).
3. In Claude Code: `/review-plan NNNN` checks the change and marks the plan `done` or `changes-requested`.

Shared rules for every agent are in `AGENTS.md`; `CLAUDE.md` and `GEMINI.md` import it and add each tool's role;
`.agent/rules/` points Antigravity's editor at the same files. The full workflow is in `docs/plans/README.md`.

## Layout

```
apps/web/          Next.js app (pages, server actions, /api/ext for the extension, SQLite via Drizzle + libSQL)
apps/desktop/      Electron shell: bundles the Next.js server and shows it in a window
apps/extension/    Chrome/Edge extension (plain JS, no build step) that imports your LeetCode submissions
packages/shared/   Roadmap data, day templates, date helpers, XP/level/streak logic
data/              Local database (git-ignored)
```

Set `DATABASE_URL` (e.g. `file:C:/path/habit.db`) to store the database somewhere else.
