# Portable tools (desktop app)

The Run button needs a C++ compiler, a JDK and Python 3 (JavaScript uses the app's own runtime). Instead of installing
them by hand, the desktop app can download portable copies into its own data folder. No administrator rights, nothing
changes on your system, and **Remove** deletes it all.

Where: **Profile, Settings, Tools for running code**. Each card has **Set up**. A confirmation shows the source, version,
download size and disk space first; nothing downloads before you press **Download**. **Set up all missing tools** does
the same for several at once. **Cancel** stops a running download and keeps nothing.

## What is downloaded

Versions are pinned in `packages/shared/src/tool-catalog.ts` with the SHA-256 of each file (checked 2026-11-11).

| Tool | Version | Source | Download | On disk |
|---|---|---|---|---|
| Java | Temurin JDK 17.0.21+9 | Eclipse Adoptium (`github.com/adoptium/temurin17-binaries`) | about 170 to 185 MB | about 320 MB |
| Python | CPython 3.12.16, "install_only" build | python-build-standalone (`github.com/astral-sh/python-build-standalone`) | 24 to 65 MB | 100 to 250 MB |
| C++, Windows only | GCC 16.2.0, MinGW-w64 14.0.0 (UCRT, no LLVM) | WinLibs (`github.com/brechtsanders/winlibs_mingw`) | about 264 MB | about 925 MB |

- **macOS C++:** not downloaded. The card has a button that runs `xcode-select --install` (Apple's own installer window).
- **Linux C++:** not downloaded. The card shows the install command for your distribution (for example `sudo apt install g++`).

## Where it lives

`<app data folder>/tools/<tool>/<version>/`, plus `tools/manifest.json` listing what is installed. The desktop app passes
the folder to its server as `HABIT_TOOLS_DIR`. Windows: `%APPDATA%\HabitManager\tools`. To remove everything by hand,
close the app and delete that `tools` folder; **Remove** on a card does the same for one tool.

Order of choice for each tool: your `HABIT_*` environment variable, then the downloaded copy, then the program on PATH.
The card says which one is in use.

## How it stays safe

- HTTPS only, and the address always comes from the catalogue, never from a request. Only the catalogue's own host and
  GitHub's release redirect hosts are allowed, at most 3 redirects, each one checked.
- The download may not be larger than the listed size plus 5 percent. The SHA-256 is verified **before** anything is
  unpacked; a mismatch deletes the file and installs nothing.
- The archive's file list is read first; any path outside the target folder (`..`, absolute paths) rejects the archive.
- It unpacks into a temporary folder and moves it into place in one step. Any failure removes the partial folder. The
  downloaded archive is deleted afterwards. Only one download runs at a time.
- The only programs started from a downloaded tool are the tool itself with `--version` (to detect it) and, later,
  your own code when you press Run. The routes work only in the desktop app and only from its own window.

## If something goes wrong

- **Antivirus quarantines the compiler.** Allow the `tools` folder in the app data folder, press **Remove**, then **Set up** again.
- **Windows still blocks the C++ programs you build** (Smart App Control): see `docs/troubleshooting.md`. This is about the
  programs the compiler makes, not the compiler. Java and Python are not affected.
- **Download interrupted or checksum message.** Check your connection and try again. A checksum message means the file was not what
  the publisher released; nothing was kept.
- **Updating a tool:** a new app version may pin a newer version; press **Remove**, then **Set up**.

## Docker

Not needed on the desktop. It would only be useful as a runner for a future hosted version of the app.

## For maintainers

- Change a version: edit `tool-catalog.ts` (URL, `bytes`, `sha256`, `binDir`), run `pnpm exec vitest run packages/shared/src/tool-catalog.test.ts`,
  then trigger the **Tools smoke test** workflow (`.github/workflows/tools-smoke.yml`, manual) which downloads, verifies,
  unpacks and runs every tool on Windows, macOS and Linux runners.
- The real-download test is `apps/web/lib/tools/smoke.test.ts` and only runs with `TOOLS_SMOKE=1`.
