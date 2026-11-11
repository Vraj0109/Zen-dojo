# 0064: Portable tool manager (download Java, Python and a C++ compiler on request, no admin rights)

- **Status:** implemented (smoke workflow run and desktop check pending, see notes)
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (implementer fills in)
- **Spec:** extends plan 0061 (tools check screen) and plan 0062 (resolver)
- **Estimate at this project's pace:** about 1.5 rounds (Claude agents), plus a manual check on a real Mac and Linux
  machine or in the CI smoke workflow below

## Goal

A normal user who installs the desktop app can run C++, Java and Python code **without installing anything by hand**.
In Settings > Tools, a "Set up tools" button downloads portable copies of the tools into the app's own data folder
after showing what will be downloaded, from where and how big it is. No administrator rights, no system changes, and
"Remove" deletes it all.

## Context (verified 2026-11-11)

- The installer ships only the app. Running code needs `g++`, `javac`/`java`, `python` on the machine (`apps/web/lib/judge/run.ts`;
  messages in `MISSING`). `setup.cmd`/`setup.sh` are developer scripts and are not part of the installed app.
- Plan 0061 part A adds the "Tools for running code" page, `tool-hints.ts`, `apps/web/lib/judge/tools.ts` (`detectTools()`).
  Plan 0062 adds `apps/web/lib/judge/resolve.ts` with `resolveTool(id)`. This plan **extends both**; do not build it before
  they exist.
- The desktop server is a utilityProcess started in `apps/desktop/main.js` with `HABIT_DESKTOP=1`; the app-data folder is
  Electron's `userData` (overridden by `HABIT_DATA_DIR` for tests). Pass the tools folder to the server as
  `HABIT_TOOLS_DIR` (default `<userData>/tools`).
- Windows 11 Smart App Control can still block *newly built unsigned programs* (the learner's compiled C++), whatever
  compiler is used (`docs/troubleshooting.md`). Java, Python and JavaScript are not affected.
- AGENTS.md: never touch the user's app-data folder in tests (use a temp folder), no secrets in the repo, never run
  `pnpm desktop:build`.

## Design (decided)

**Catalogue** `packages/shared/src/tool-catalog.ts` (data, pure): for each tool id (`java`, `python`, `cpp`) and each
platform/arch (`win32-x64`, `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`): `{ version, url, sha256, bytes,
archive: "zip" | "tar.gz" | "tar.xz", binDir, license, source }`. The implementer fills it from the **official release
pages at implementation time** and records the date; every `sha256` is computed from the downloaded file and written into the
repo. Sources to use:

| Tool | Source |
|---|---|
| Java (Temurin JDK 17) | Adoptium releases (api.adoptium.net / github.com/adoptium) |
| Python 3 | python-build-standalone releases (github.com/astral-sh/python-build-standalone), "install_only" builds |
| C++ on Windows | WinLibs MinGW-w64 releases (github.com/brechtsanders/winlibs_mingw), the "no LLVM" zip |
| C++ on macOS | **not downloadable**: the page offers "Install Apple's command line tools" which runs `xcode-select --install` (a system dialog), then re-checks |
| C++ on Linux | the page shows the distribution's command first (plan 0061 hints); optional download of a portable Zig (`zig c++`) **only if** step 6 proves it compiles our test programs with the judge's flags |

**Install location** `<HABIT_TOOLS_DIR>/<tool>/<version>/` plus a `manifest.json` of what is installed. Install = download to a
`.part` file, verify size and SHA-256 **before** extracting, extract with the system `tar` (`tar -xf`; on Windows 10+ `tar.exe`
reads zip files; verify on a clean machine), move into place atomically, write the manifest. Any failure deletes the partial
folder. One install at a time; the user can cancel.

**Safety rules** (the point of this plan): HTTPS only; the URL must be in the catalogue, never from the request; allowed
hosts are the catalogue's hosts plus the redirect hosts GitHub uses for release assets (listed explicitly in code, checked on
each redirect, at most 3); size cap = catalogue `bytes` + 5%; hash mismatch aborts with a plain message; no archive entry may
resolve outside the target folder (reject `..` and absolute paths after listing with `tar -tf`); no scripts are run from
downloaded tools except the tools themselves with `--version`. The route works only in the desktop app
(`HABIT_DESKTOP=1`), same-origin only (`checkSameOrigin`), and never in hosted mode.

**Resolution order** in `resolveTool(id)` (extend plan 0062's module): explicit `HABIT_*` override, then a **managed** tool if
installed and not disabled, then PATH. The Tools page says which one is in use for each tool ("Using: downloaded Java 17" /
"Using: Java from your system").

**UI** (extend the plan 0061 page): per tool a card with state (Found on your system / Downloaded / Missing), "Set up"
(opens a confirmation listing source, version, download size and disk size), progress bar with Cancel, "Remove", and the
Check again button. A top button "Set up all missing tools". Plain wording; the disk space needed is shown before download.

## Out of scope

- Updating tools automatically; multiple versions; Node (JavaScript uses the app's own runtime, plan 0062); a Docker backend
  (documented as an advanced option only); installing system-wide; macOS compiler download; anything on the hosted site or phones.

## Steps

Targeted tests only. The lead runs one `pnpm check`. No `pnpm desktop:build`. Local commits, explicit paths, no push, no attribution.
Suggested split: Agent A steps 1 to 3; Agent B steps 4 to 6.

- [x] **1. Catalogue and verification helpers.** `packages/shared/src/tool-catalog.ts` and a pure `verifyPlan(entry)`;
  `apps/web/lib/tools/download.ts` (`downloadVerified(entry, destFile, { fetch, onProgress, signal })` with host checks, size cap,
  SHA-256 streaming).
  - Done when: `pnpm exec vitest run packages/shared/src/tool-catalog.test.ts apps/web/lib/tools/download.test.ts` passes:
    every entry has https url, 64-hex hash, positive size, known archive type; stubbed fetch cases for ok, wrong hash,
    too large, redirect to a non-allowed host, 4 redirects, abort.
- [x] **2. Extract and install.** `apps/web/lib/tools/install.ts`: list (`tar -tf`) and reject unsafe entries, extract, atomic move,
  manifest read/write, `removeTool`, `installedTools()`.
  - Done when: `apps/web/lib/tools/install.test.ts` passes with a tiny tar and a tiny zip fixture built in the test: normal
    install, an entry with `..` rejected, a failed extract leaves no folder, remove deletes it. Uses a temp folder only.
- [x] **3. Resolver.** Extend `apps/web/lib/judge/resolve.ts` so `resolveTool` consults the manifest after `HABIT_*` and before
  PATH; `tools.ts` reports which source is used.
  - Done when: `resolve.test.ts` covers override > managed > PATH and a manifest pointing at a missing file (ignored).
- [x] **4. Routes.** `apps/web/app/api/tools/{status,install,remove}/route.ts`: same-origin, desktop-only (404 otherwise),
  install streams progress as JSON lines, one install at a time (409 if busy), cancel via request abort, no stack traces, never
  log URLs with tokens.
  - Done when: route tests with stubbed install code cover 404 hosted, 403 cross-origin, 409 busy, success lines.
- [x] **5. UI.** Extend `apps/web/app/profile/settings/tools/page.tsx` with the client component for cards, confirmation,
  progress and Cancel; `apps/desktop/main.js` passes `HABIT_TOOLS_DIR`.
  - Done when: typecheck and eslint pass; with a stubbed catalogue pointing at a local test file served by a throwaway
    local server, the flow shows size, progresses, installs and the tool shows "Downloaded".
- [x] **6. Proof on all three systems.** `.github/workflows/tools-smoke.yml` (manual `workflow_dispatch` only): on
  `windows-latest`, `macos-latest` and `ubuntu-latest` run a small Node script that installs each catalogue tool for that
  platform into a temp folder with the real code, runs `--version` (and, for the C++ tool, compiles and runs a hello program
  with the judge's flags from `run.ts`), and fails on any problem. For Zig on Linux, only add the catalogue entry if the judge's
  C++ flags work; otherwise leave Linux C++ to the distribution command and say so in *Implementation notes*.
  - Done when: the workflow file is committed and a run on the three runners is green (the lead triggers it; record the run
    link in *Implementation notes*).
- [x] **7. Docs.** `docs/tools.md`: what is downloaded from where, how big, where it lives, how to remove it, and the Docker
  note ("not needed on the desktop; only useful for a future hosted runner"). Link from `docs/troubleshooting.md`.
  - Done when: the page exists and is linked.

## Acceptance criteria

- [ ] On a PC with nothing installed, Settings > Tools > "Set up all missing tools" downloads Java and Python (and the C++
  compiler on Windows), shows progress, and afterwards Java and Python problems run.
- [ ] Nothing downloads without a confirmation that states the source and size; Cancel and Remove work and leave no files.
- [ ] A tampered download (wrong hash) is refused with a plain message.
- [ ] The smoke workflow is green on Windows, macOS and Linux runners.
- [ ] `pnpm check` passes.

## Pitfalls

- Never trust the catalogue's hosts blindly on redirect; check every hop.
- Extracting to the wrong place is the classic archive bug: validate entries first.
- Antivirus may quarantine a freshly extracted compiler; the page should say how to allow the folder.
- GitHub release URLs for "latest" move; pin exact versions and hashes.
- Do not store the downloaded archive after install.

## Open questions

## Implementation notes

Agent C, round thirteen (2026-11-11). Files: `packages/shared/src/tool-catalog.ts`, `apps/web/lib/tools/{manifest,download,install,handlers}.ts`, `apps/web/app/api/tools/*`, `apps/web/app/profile/settings/tools/tool-manager.tsx`, resolver and `detectTools` changes, `.github/workflows/tools-smoke.yml`, `docs/tools.md`.

- Catalogue pins: Temurin 17.0.21+9, CPython 3.12.16 (python-build-standalone 20261110), WinLibs GCC 16.2.0 (no LLVM, posix-seh-ucrt, r3). sha256 of the three Windows files computed from the downloaded files; the other platforms use the publisher's checksum for that exact file (Adoptium API, GitHub release digest). The smoke workflow checks them on real runners. No Zig, so Linux C++ stays a distro command; macOS C++ is the `xcode-select --install` button. Nothing was left out of the catalogue.
- Deviation: `tool()` in `resolve.ts` is now managed-aware (override, then download, then PATH), so `run.ts` and `run-project.ts` pick up downloaded Java and C++ without being edited. For the Windows C++ download it adds the compiler's `bin` folder to this process's PATH once, so built programs find their runtime DLLs. Managed lookups are off unless `HABIT_TOOLS_DIR` is set (only the desktop app sets it).
- Windows extraction uses the system tar.exe in the Windows System32 folder (Git Bash's GNU tar cannot read zip).
- Route logic is in `lib/tools/handlers.ts` so tests inject everything; the route files only forward.
- Step 5 was checked by typecheck, eslint and handler tests; the browser flow against a local test server and the real downloads were not run (downloaded programs were deliberately not executed here). Step 6: the workflow is committed, not triggered. The lead triggers it and records the run link here.
- `detectTools()` caches the real-machine answer for 60 seconds (`resetToolsCache()`, `{ fresh: true }`); installs and removes reset it.

## Review
