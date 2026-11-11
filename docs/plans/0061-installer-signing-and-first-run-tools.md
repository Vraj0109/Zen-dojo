# 0061: Installer signing and a first-run "Check my tools" screen

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (implementer fills in)
- **Spec:** extends plan 0034 (blocked programs) and the release workflow of `AGENTS.md`
- **Estimate at this project's pace:** Part A one round (3 to 5 hours). Part B steps B1 and B2 about 1 hour. Steps B3 and
  B4 about half a day **after** you have an approved signing route and the secrets in GitHub (approval and
  identity checks take days and are outside our control).

## Goal

1. **Part A.** A fresh install on any PC tells you plainly which tools are missing for running code (C++ compiler,
   Java JDK, Node) and gives a one-click-copy install command for your operating system. JavaScript problems stop
   needing Node installed at all.
2. **Part B.** The downloads stop looking suspicious: install instructions for the unavoidable first-install warnings,
   and wiring for real code signing on Windows (and macOS) as soon as you have a certificate route.

## Context (verified)

- `setup.cmd`, `setup.ps1`, `setup.sh` are **developer** scripts (install Node, pnpm, a compiler, a JDK, build the
  repo). An installed app never runs them. The installer ships its own Next server (`apps/desktop/electron-builder.yml`,
  `extraResources: server`), so reading, tracking and notes work on any PC.
- Running code uses the machine's tools: `apps/web/lib/judge/run.ts` line 81 `tool(envName, fallback)` (`HABIT_GPP` /
  `g++`, `HABIT_JAVAC` / `javac`, `HABIT_JAVA` / `java`) and line 82
  `nodeBinary = () => process.env.HABIT_NODE || (process.versions.electron ? "node" : process.execPath)`. **Inside the
  desktop app JavaScript therefore needs `node` on PATH.** `apps/web/lib/judge/run-project.ts:35` has its own copy of `tool`.
  The "not found" messages (`MISSING` near line 237) already print a Windows `winget` hint.
- `apps/desktop/main.js:112` starts the server with `utilityProcess.fork(...)` and sets `HABIT_DESKTOP: "1"`.
- Windows installer is NSIS and **unsigned**, so SmartScreen warns ("Windows protected your PC", More info, Run
  anyway). Windows 11 Smart App Control can also block unsigned programs the judge just compiled
  (`docs/troubleshooting.md`). macOS builds are an arm64 `.dmg` ad-hoc signed with no Developer ID, so Gatekeeper warns
  once and Intel Macs get no build. Linux ships an AppImage.
- The release workflow `.github/workflows/desktop.yml` builds three OSes, then a `release` job publishes
  `docs/releases/<tag>.md` plus generated notes with `softprops/action-gh-release@v2` (step "Release notes", lines
  about 79 to 92).
- Rules from AGENTS.md: never put certificates, passwords or tokens in the repo or in chat; secrets are added by the
  user as GitHub secrets. Never run `pnpm desktop:build` (releases build on GitHub when a tag is pushed). Never reuse or
  move a published tag.

## Design (decided)

**Part A**

- One pure module `packages/shared/src/tool-hints.ts` holds the install commands per OS (data, easy to update, with the
  date each command was verified in a comment): Windows `winget install BrechtSanders.WinLibs.POSIX.UCRT` (C++),
  `winget install EclipseAdoptium.Temurin.17.JDK` (Java), `winget install OpenJS.NodeJS.LTS` (Node, only useful outside
  the desktop app) and `winget install Python.Python.3.12` (Python, added by plan 0062); macOS `xcode-select --install` (C++),
  `brew install openjdk@17` (Java), `brew install node`, `brew install python`; Linux per package manager
  (`sudo apt-get install g++`, `openjdk-17-jdk`, `nodejs`, `python3`; the `dnf` equivalents). The tools covered are `cpp`,
  `java`, `javascript`, `python`. The implementer checks that
  each `winget` id exists with `winget search` or the winget package index before committing the data.
- `apps/web/lib/judge/tools.ts` (server-only): `detectTools()` runs `g++ --version`, `javac -version`, `java -version`
  and the node check with `execFile` (timeout 5 s, fixed args, no shell) using the **same** `tool()` resolution as the
  judge, and returns `{ id, label, found, version, usedFor, hint }` for `cpp`, `java`, `javascript`. It never throws.
- **Node-less JavaScript:** when `process.versions.electron` is set and `HABIT_NODE` is not, run the judge's JavaScript
  with `process.execPath` and the environment variable `ELECTRON_RUN_AS_NODE=1`, falling back to `node` on PATH if that
  spawn fails with a missing/blocked error. This needs a small change to how `runProcess` passes `env` and a matching
  change in `detectTools()`. Caveat to verify on a real build: on a PC where Smart App Control blocks unsigned
  programs this may also be blocked (the app itself is unsigned until Part B3 is done); the fallback covers that.
- **UI:** a page `apps/web/app/profile/settings/tools/page.tsx` ("Tools for running code") listing the three tools with
  a green/amber state, what each is used for, the command for the detected OS (with a Copy button), and a **Check
  again** button. A dismissible notice on Today appears **only in the desktop app** and only when something is missing,
  with a link to that page. It says that reading, plans and notes work without them.

**Part B**

- **No signing is required to ship Part B1 and B2.** They are documentation and release-note text.
- **Signing routes** (record in `docs/signing.md`, the user chooses; verify current terms before relying on this table):

| Route | Cost | Notes |
|---|---|---|
| Do nothing, document the warning | free | users click More info, Run anyway |
| SignPath Foundation | free for open-source projects after approval | signs through GitHub Actions; publisher shown is theirs; needs an open-source licence and an application |
| Microsoft Trusted/Artifact Signing (Azure) | about $10 a month | electron-builder supports it (`win.azureSignOptions`); identity validation and region eligibility apply |
| OV/EV certificate | roughly $200 to $500 a year | identity checks, hardware or cloud key; reputation still builds with downloads |
| Apple Developer ID + notarization (macOS) | $99 a year | needed to remove the Gatekeeper warning; builds then use `mac.notarize` and a Developer ID certificate |

- Signing reputation: even a signed new publisher can see SmartScreen warnings until enough people have installed it.
  Say so in `docs/signing.md`.

## Out of scope

- Buying or applying for anything on the user's behalf; storing certificates or tokens in the repo; bundling a C++
  compiler or JDK inside the installer; an Intel macOS build (separate decision; note it in `docs/signing.md`);
  Microsoft Store (MSIX) packaging.

## Steps

Targeted tests only; the lead runs one `pnpm check`. Never `pnpm desktop:build`. Local commits with explicit paths; no
push, no attribution.

### Part A: tools check

- [ ] **A1. Hints data** `packages/shared/src/tool-hints.ts` (`ToolId`, `InstallHints`, `hintFor(tool, platform, pkgManager?)`),
  exported from the package index.
  - Done when: `pnpm exec vitest run packages/shared/src/tool-hints.test.ts` passes (every tool has a hint for
    win32, darwin and linux; unknown platform gets a plain "see the project's troubleshooting page").
- [ ] **A2. Detection** `apps/web/lib/judge/tools.ts` plus exporting the resolver pieces from `run.ts`
  (`tool`, `nodeBinary`) so there is one source of truth (update `run-project.ts` to import `tool` instead of copying it).
  - Done when: `pnpm exec vitest run apps/web/lib/judge/tools.test.ts` passes with a fake PATH folder: tool present
    (found, version parsed), absent (found false), `HABIT_GPP` pointing at a missing file (found false), timeout
    handled.
- [ ] **A3. Node-less JavaScript. MOVED to plan 0062 (step 1)** so one agent owns `run.ts`. Skip this step here; `tools.ts`
  (A2) should call `resolveTool(...)` from `apps/web/lib/judge/resolve.ts` instead of the old `tool()`/`nodeBinary()`, and
  treat `python` like the other three tools (id `python`, hints for `Python.Python.3.12`, `python3`).
  - Done when: a unit test with a stubbed spawn shows `ELECTRON_RUN_AS_NODE=1` and `process.execPath` are used when
    `process.versions.electron` is set and `HABIT_NODE` is not, and that a missing-binary result falls back to `node`;
    the existing `judge.test.ts` JavaScript cases still pass (run that file once; it skips C++/Java without tools).
- [ ] **A4. UI** `apps/web/app/profile/settings/tools/page.tsx` (+ a client `copy-button` if none exists in
  `app/ui.tsx`), a link from `profile/settings/page.tsx`, and the Today notice (desktop only via `HABIT_DESKTOP`,
  dismissal remembered in the `settings` table key `tools_notice_dismissed`, **device-specific: add it to the sync
  denylist**).
  - Done when: typecheck and eslint pass; with `HABIT_GPP=/nonexistent` the page shows C++ missing with the command and
    Check again re-runs detection; the notice does not appear in a plain browser.
- [ ] **A5. Docs** one paragraph in `docs/troubleshooting.md` ("Run code needs a compiler"), linking the new page.
  - Done when: the file mentions the page and the three tools.

### Part B: signing and warnings

- [ ] **B1. `docs/signing.md`** with the table above (re-verified: prices, eligibility, current electron-builder keys),
  what the user does for each route (apply, which GitHub secret names to create, never pasting them into chat),
  the SmartScreen reputation caveat, and the macOS Gatekeeper steps (right-click Open, or
  `xattr -dr com.apple.quarantine "/Applications/Zen Dojo.app"`).
  - Done when: the file exists and names the exact secret names the workflow will read.
- [ ] **B2. Install notes in every release.** Create `docs/releases/_install-notes.md` ("First install on Windows:
  More info, Run anyway; macOS: right-click, Open; Linux: make the AppImage executable") and make the `Release notes`
  step in `.github/workflows/desktop.yml` append it after the hand-written notes. Add the same text to the top of
  `README.md` under Install (create the section if missing).
  - Done when: a dry check of the workflow's shell (`bash -n` on the step) passes and the footer appears in a test run of
    that step against a sample notes file.
- [ ] **B3. Windows signing wiring (do only after the user names a route and adds the secrets).**
  Route Azure: add `win.azureSignOptions` (publisher, endpoint, account name, profile name from the user) to
  `apps/desktop/electron-builder.yml` and pass `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` from GitHub
  secrets to the Windows build step. Route SignPath: upload the unsigned installer as an artifact, submit it with
  SignPath's GitHub Action (read its current docs for the action version and inputs), download the signed file, and
  publish **that**. In both routes the step must be skipped cleanly when the secrets are absent so unsigned builds
  still work.
  - Done when: a pre-release tag (for example `v0.7.2-rc1`, never reusing a tag) produces a signed `.exe` whose
    properties show the publisher, and `latest.yml` still matches the published file's hash (updates verify it).
- [ ] **B4. macOS (optional, only with a Developer ID).** Developer ID certificate as base64 in `CSC_LINK` and
  `CSC_KEY_PASSWORD` secrets, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`; set `mac.identity` to the
  Developer ID, `hardenedRuntime: true` and `notarize: true` **and test that the SQLite native module still loads**
  (the current ad-hoc setup turns the hardened runtime off for exactly that reason).
  - Done when: a pre-release `.dmg` opens with no Gatekeeper warning on a clean Mac and the app starts.

## Acceptance criteria

- [ ] Settings has "Tools for running code"; on a PC without g++, a JDK or Node it says which are missing and shows a
  copyable command for that OS; Check again updates it.
- [ ] In the desktop app, JavaScript problems run with no Node installed (verified on the first CI-built release after
  this change; note the result in *Implementation notes*).
- [ ] Every future GitHub release page carries the first-install notes; `docs/signing.md` explains the routes.
- [ ] With signing secrets present (B3), the Windows installer shows a publisher; without them the build still succeeds.
- [ ] `pnpm check` passes.

## Pitfalls

- `ELECTRON_RUN_AS_NODE` must be set only on the child's environment, never on the Electron app itself.
- Do not widen what the judge may execute: only fixed binaries and the user's `HABIT_*` overrides.
- Never print or commit secrets; the workflow reads them from `secrets.*` only.
- A signed installer must be built from the same bytes that `latest.yml` hashes; sign **before** that file is produced.

## Open questions

- Which signing route does the user want (B3/B4)? Part A and B1/B2 do not depend on it.

## Implementation notes

Done by Claude agent B, round twelve: A1, A2, A4, A5, B1, B2 (A3 went to agent A, B3 and B4 stay open). Not yet reviewed.

- **A1** `packages/shared/src/tool-hints.ts` (+ test). Tools: cpp, java, javascript, python. Winget ids verified with
  `winget search --exact` on 2026-11-11: BrechtSanders.WinLibs.POSIX.UCRT, EclipseAdoptium.Temurin.17.JDK, OpenJS.NodeJS.LTS,
  Python.Python.3.12. **Unverified:** the macOS (brew, xcode-select) and Linux (apt, dnf) commands and package names.
- **A2** `apps/web/lib/judge/tools.ts` (+ test) uses `resolveTool`/`pythonCommand` from `resolve.ts`. Java needs both `javac` and
  `java`. The probe runner is injectable; tests cover found, missing, missing `HABIT_GPP` path, a throwing runner and a
  real 300 ms timeout. Python is probed by `pythonCommand()` (synchronous, up to 3 s per candidate).
- **A4** Page `/profile/settings/tools` (own folder: page, `copy-command.tsx`, `actions.ts`, `notice-state.ts`), a "Check my
  tools" card in Settings, and `app/tools-notice.tsx` on Today (desktop only via `HABIT_DESKTOP === "1"`, only when something is
  missing, dismissal stored in `settings.tools_notice_dismissed`). **Edited a file outside agent B's list:** added that key to
  `SYNC_SETTINGS_DENYLIST` in `apps/web/lib/sync-triggers.ts` (the plan requires it). Check again is a GET form that reloads
  the page. Not run in the real desktop app. Checked with `next dev` on a copy of the database and `HABIT_GPP=/nonexistent HABIT_DESKTOP=1`: the page HTML shows C++ not found with the winget command, and Today shows the notice; not looked at visually.
- **A5** `docs/troubleshooting.md` section "Run code needs a compiler, a JDK, Node or Python" (includes the Python detection order
  and the Microsoft Store stub).
- **B1** `docs/signing.md`. Prices and eligibility were written from memory, not re-verified against the providers; the file says so.
  Planned secret names are listed there.
- **B2** `docs/releases/_install-notes.md`, one added line in the "Release notes" step of `desktop.yml`, and an Install section at
  the top of `README.md`. The step was dry-run in a temp folder with a sample notes file; the footer appears after the notes.
  (README also still has the older "First launch warnings" paragraph further down; left as is.)

## Review
