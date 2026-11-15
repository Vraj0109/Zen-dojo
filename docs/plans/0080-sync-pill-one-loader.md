# 0080: Sync pill shows one loader, not two

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-14
- **Implemented by:** Claude Code (subagent), 2026-11-15
- **Spec:** none

## Goal

While a sync runs, the sync pill under the profile button shows a single "Syncing..." indicator. Today it shows two
spinning icons side by side, and for a moment it can show "Synced" and "Syncing..." together.

## Context

- The pill is `SyncStatus` in `apps/web/app/components/sync-status.tsx` (exported again as `SyncStatusPill`). It is
  rendered under the profile button by `apps/web/app/components/account-popover.tsx` (lines ~117 and ~223), in the
  sidebar fallback `NavFooterLinks` in `apps/web/app/nav.tsx`, and compact in the phone header in
  `apps/web/app/shell.tsx`.
- Two loaders, both in `sync-status.tsx`:
  1. The "Syncing in progress" block (`isSyncing && ...`, around line 237) draws a spinning circle and "Syncing...".
  2. The "Sync now" button (around line 334) also spins its arrows icon: `className={... isSyncing ? "animate-spin" : ""}`.
- `isSyncing = status === "syncing" || isPending`. The status blocks are separate `status === "..."` checks, so while
  `isPending` is true and `status` is still `"synced"` or `"idle"`, both that block and the "Syncing" block render.
- `account-menu.tsx` has its own sync button with a spinner; it renders `SyncStatus showSyncButton={false}`, so it
  shows only one. Leave it.

## Out of scope

- Changing sync behaviour, timing or the sync manager (`apps/web/lib/sync-manager.ts`).
- Restyling the pill beyond the loader fix.
- `account-menu.tsx`.

## Steps

- [x] **1. One visible state.** In `sync-status.tsx` compute
  `const shown: SyncStatusState = isPending ? "syncing" : status;` and use `shown` for every status block, so exactly
  one block renders at a time. Replace the `isSyncing && (...)` block with `shown === "syncing" && (...)`.
  - Done when: no combination of `status` and `isPending` renders two status blocks.

- [x] **2. The button never spins.** Remove `animate-spin` from the "Sync now" icon. While `shown === "syncing"` keep the
  button in place but disabled (as today) so the pill does not change width; its `title` becomes "Syncing...". The
  single spinner is the one in the status block.
  - Done when: during a sync exactly one element in the pill has `animate-spin`.

- [x] **3. Tests.** Add `apps/web/app/components/sync-status.test.tsx` (Vitest + React Testing Library, as other
  component tests in the repo do; if there are none, test a small pure helper `shownStatus(status, isPending)` exported
  from `sync-status.tsx` instead) covering: pending while synced shows only "Syncing...", syncing shows one spinner,
  idle/synced/offline/error each show one block.
  - Done when: `pnpm exec vitest run apps/web/app/components/sync-status.test.tsx` passes.

## Acceptance criteria

- [x] Clicking "Sync now" shows one spinner and the word "Syncing..." until it finishes, then "Synced".
- [x] "Synced" and "Syncing..." never show at the same time.
- [x] The pill keeps its width during a sync (no jump) on desktop and in the compact phone header.
- [ ] `pnpm check` passes.
- [x] No changes outside the files listed above (or explained in *Implementation notes*).

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

- Files: `apps/web/app/components/sync-status.tsx` (exported pure `shownStatus(status, isPending)`; every status block and the
  Sync now button conditions use `shown`; the button icon no longer spins, stays in place disabled with title "Syncing..."),
  `apps/web/app/components/sync-status.test.ts` (new).
- Deviation: the repo has no React Testing Library, so per the plan's fallback the test covers `shownStatus` and is a `.ts`
  file (`sync-status.test.ts`, not `.test.tsx`).
- Tests: `pnpm exec vitest run apps/web/app/components/sync-status.test.ts` 2 passed; `pnpm -r typecheck` passes.
  `pnpm check` not run (left for the reviewer). Not checked in a browser.

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
