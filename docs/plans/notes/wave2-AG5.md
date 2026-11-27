# Wave 2 Round A — AG5 Implementation Notes

**Agent:** AG5 (Antigravity)  
**Task:** Desktop: ship a content DB, copy it on first start, run updates on a timer; snapshot script (plan 0115 steps 5 & 9).

---

## Files Created or Changed

### Created
- `scripts/content-snapshot.mjs`: Downloads `/api/content/units` and all unit pages (`/api/content/unit/<unit>?v=&page=`) from the hosted origin, validates snapshot chunks, applies migrations from `apps/web/lib/content-db/migrations.ts`, stores units using `applyUnits` into a temporary database file, and atomically replaces `--out <file.db>` alongside creating `<file.db>.version`.
- `apps/desktop/lib/content-setup.js`: Plain JS with `// @ts-check`. Pure logic for copy decisions (`decideContentCopy` covering `missing`, `older`, `equal`, `newer`, `no-shipped`, and `shouldCopyContent`), atomic database copying with stale sidecar removal (`copyContentDatabase`), and database version inspection (`readContentVersion`).
- `apps/desktop/lib/content-setup.test.ts`: Vitest suite covering all copy decision branches (`missing`, `older`, `equal`, `newer`, `no-shipped`), atomic database copying and WAL sidecar removal, and version detection.

### Modified
- `apps/desktop/main.js`:
  - Shipped content setup: on startup before utility process launches, checks if `resources/content.db` should be copied into `<app-data>/content.db` (when missing or older) using `setupContentDatabase`.
  - Periodic background sync: starts 20 seconds after launch and then runs every 6 hours (`setupContentSync`), sending a local `POST` request to `http://127.0.0.1:<port>/api/content/sync`.
- `apps/desktop/scripts/prepare-server.mjs`: Added content snapshot generation targeting `apps/desktop/resources/content.db` so the built standalone server package includes the latest content snapshot.
- `apps/desktop/scripts/after-pack.cjs`: Added copying of `resources/content.db` (and `.version` if present) into the packaged application's `resources/` folder.
- `apps/desktop/package.json`: Added `build.extraResources` mapping `resources/content.db` -> `resources/content.db` (build config only).
- `.github/workflows/desktop.yml`: Added step `Content snapshot` running `node --import ./scripts/lib/register-ts.mjs scripts/content-snapshot.mjs --out apps/desktop/resources/content.db` immediately before `pnpm desktop:build`.
- `docs/troubleshooting.md`: Added sections `## Content is out of date` (explaining manual sync trigger via Settings, background sync schedule, logs) and `## Needs a newer app version` (explaining schema incompatibility protection and update flow).

---

## Test Commands and Results

1. **Unit tests for content setup:**
   ```bash
   pnpm exec vitest run apps/desktop/lib/content-setup.test.ts
   ```
   **Result:**
   ```
   ✓ apps/desktop/lib/content-setup.test.ts (9 tests) 23ms
   Test Files  1 passed (1)
        Tests  9 passed (9)
   ```

2. **Existing desktop unit tests:**
   ```bash
   pnpm exec vitest run apps/desktop/lib/setup.test.ts apps/desktop/lib/updates.test.ts
   ```
   **Result:**
   ```
   ✓ apps/desktop/lib/updates.test.ts (4 tests) 5ms
   ✓ apps/desktop/lib/setup.test.ts (10 tests) 74ms
   Test Files  2 passed (2)
        Tests  14 passed (14)
   ```

3. **Syntax checks on created/modified JS/MJS/CJS scripts:**
   ```bash
   node --check apps/desktop/main.js scripts/content-snapshot.mjs apps/desktop/lib/content-setup.js apps/desktop/scripts/prepare-server.mjs apps/desktop/scripts/after-pack.cjs
   ```
   **Result:** Clean exit (code 0).

4. **Desktop typecheck:**
   ```bash
   pnpm --filter desktop typecheck
   ```
   **Result:** Clean exit (code 0), no emit errors.

---

## Manual Verification Steps for Desktop Build (as per instruction: do not run `pnpm desktop:build`)

To verify the desktop packaging and offline operation manually:
1. Ensure `apps/desktop/resources/content.db` is present (either via `node --import ./scripts/lib/register-ts.mjs scripts/content-snapshot.mjs --out apps/desktop/resources/content.db` or copied from a local content database).
2. Run `pnpm desktop:build` (which runs `prepare-server.mjs`, bundles Next.js standalone, runs `content:snapshot`, and packages with `after-pack.cjs`).
3. Set `HABIT_DATA_DIR` to a temporary empty directory:
   ```bash
   $env:HABIT_DATA_DIR = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "zd-manual-test")
   ```
4. Disconnect from the internet or set airplane mode.
5. Launch the unpackaged or packaged desktop executable (e.g. `apps/desktop/dist/win-unpacked/Zen Dojo.exe` or `pnpm desktop`).
6. Verify:
   - On first launch, `<temp>/content.db` is automatically created from `resources/content.db`.
   - The app opens with all courses, lessons, and problems available offline.
   - 20 seconds after launch, `server.log` shows the local `POST /api/content/sync` attempt without crashing the server.

---

## Deviations from the Plan and Why

None. Everything was implemented according to plan 0115 step 5 and step 9, and wave 2 notes.

---

## Questions for the Lead

- `scripts/content-snapshot.mjs` was written to work both with direct Node (`node scripts/content-snapshot.mjs`) by using `register("./lib/register-ts.mjs", import.meta.url)` internally, and with `--import ./scripts/lib/register-ts.mjs`. When adding `content:snapshot` and `content:pull` aliases to root `package.json`, either form works.

---

## Found but Not Changed

- None.
