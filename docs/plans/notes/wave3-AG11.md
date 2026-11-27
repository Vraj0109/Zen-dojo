# Wave 3 AG11: hosted-site checker and deploy runbook

## Files

- `apps/web/lib/content-sync/check-hosted.ts` (new): `checkHosted({ origin, fetch, expectProblems? })` returns
  `{ ok, steps, version?, epoch?, schema?, units?, problems? }`. Pure, fetch injected, no `server-only`.
  Steps: `version`, `units`, `unit page`, `problem` (200 JSON with an ETag, body `row.id` matches), and `problem count`
  when `expectProblems` is set. A failed step makes the later ones "not run". Network errors become failed steps.
- `apps/web/lib/content-sync/check-hosted.test.ts` (new): 10 tests with a stubbed fetch (all good; version 404; empty
  units; unit page 404; schema newer than the app; expectProblems mismatch and match; problem found in a problems unit;
  missing ETag; network error).
- `scripts/content-check-hosted.mjs` (new): `--origin <url>`, `--expect-problems N`. One PASS/FAIL line per step, a
  site line, a summary. Exit 1 on any failure, 2 on bad arguments. 20 s timeout per request. No secrets sent.
- `docs/content-deploy.md` (new): the owner's numbered checklist (steps 1 to 8), "If it fails" under each step, the
  resync note, and a symptom table.
- `docs/hosting.md`: three `CONTENT_DATABASE_*` rows in the environment table, a note with a link to the runbook, and
  checklist item 10 (fill the content database and check) before "For later releases" (now item 11).

Root `package.json` not edited (`content:check-hosted` was already there).

## Commands and results

- `pnpm exec vitest run apps/web/lib/content-sync/check-hosted.test.ts`: 10 passed (run twice, once after the script
  edit).
- `cd apps/web && npx tsc --noEmit`: no errors (exit 0).
- `pnpm lint`: exit 0.
- `node --check scripts/content-check-hosted.mjs`: ok.
- Script run against `http://127.0.0.1:9` (nothing listening): version step fails with "could not be reached", the
  rest are "not run", exit 1. `--expect-problems x`: usage error, exit 2.
- Not run: the script against the live site (no network check was requested; the site is not verified here).

## Deviations and decisions

- The version step's failure text is "New content needs a newer app version (site schema N, this app M)". This matches
  the wording in `sync.ts` and is the case the brief called "site needs a newer app", since the app is the one that is
  too old.
- The default origin comes from `contentOrigin()` in `lib/content-sync/origin.ts` (CONTENT_ORIGIN, then HUB_URL without
  `/hub`, then PUBLIC_SITE_URL, then `https://zen-dojo-lovat.vercel.app`). The brief named PUBLIC_SITE_URL only; this is
  the same rule the snapshot and desktop code use, so the checker checks the same site they download from.
- `units` in the result is the number of units; `problems` is the sum of entity counts of `problems:*` units.
- When the first unit has no problem (for example `docs` first), step 4 fetches the first problems unit's page to find
  an id. This is one extra request inside that step.
- Unit ids are sent with `encodeURIComponent`, as `sync.ts` does.

## Flags I could not confirm (marked "check" in the runbook)

- `turso db create zen-dojo-content --group <group>` and `turso group list`.
- `turso db show zen-dojo-content --url`.
- `turso db tokens create zen-dojo-content` and `--read-only`.
- The Vercel dashboard button names for deploy and redeploy.

## Questions and notes for the lead

- The runbook step 8 says the desktop build fails if the content download fails. That follows from `prepare-server.mjs`
  running the snapshot, but I did not read the whole build path to confirm the failure is fatal. Please check.
- `docs/hosting.md` previously had no `CONTENT_DATABASE_*` rows. Those variables are now listed as non-secret (URL) or
  secret (tokens); `ADMIN_USER_IDS` was already listed.
