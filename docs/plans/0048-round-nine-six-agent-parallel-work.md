# 0048: Round nine: six-agent parallel sprint (Cloudflare D1 sync, admin portal & app-wide skeletons)

- **Status:** implemented
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** 6 parallel agents (3 Antigravity, 3 Claude Code), 2026-11-10
- **Spec:** Balanced 6-way workload (~10-15 mins each) with zero file collisions and fast targeted test execution

## Workload Balancing Rationale

Round Nine delivers the full offline-first Cloudflare D1 synchronization pipeline, completes the dynamic admin content editor, and replaces all crude text loading fallbacks with high-fidelity skeleton loaders:

1. **Claude 1 (Cloudflare D1 & Worker Setup):** Leverages Claude's active Cloudflare account connection to provision the D1 database (`zen-dojo-db`), generate D1 schema migrations, and configure `packages/sync-worker/wrangler.jsonc`.
2. **Claude 2 (Cloudflare Worker Sync API & CI/CD):** Implements `packages/sync-worker/src/index.ts` with delta sync logic (`POST /api/sync`), Last-Write-Wins (LWW) conflict resolution, and the GitHub Actions deployment workflow.
3. **Claude 3 (Admin Problem Editor Drawer & Forms):** Connects the problem drawer in `apps/web/app/admin/problems/page.tsx` with live editing fields (title, slug, difficulty, description, test cases JSON, initial code) and form submissions.
4. **Antigravity 1 (Core Skeletons & Problem Workspace Skeletons):** Creates reusable skeleton primitives (`apps/web/app/components/skeleton.tsx`), builds `apps/web/app/dsa/[id]/problem-skeleton.tsx`, and updates `/dsa/[id]` and `/` (Today) Suspense fallbacks.
5. **Antigravity 2 (Roadmap, Study, Review & Profile Skeletons):** Builds domain skeletons for learning articles, review queues, and roadmaps, replacing all remaining `<p className="text-muted">Loading...</p>` across `/dsa`, `/roadmap`, `/study`, `/review`, and `/profile`.
6. **Antigravity 3 (Client Sync Manager & UI Status Indicator):** Implements `apps/web/lib/sync-manager.ts` and `apps/web/app/components/sync-status.tsx` to flush `local_sync_queue` when online, reconcile incoming deltas, and display real-time sync status.

---

## Agent Assignments & File Isolation (Zero Collisions)

| Agent | Platform | Primary Focus | Exact Scope | Files Owned (Strict Isolation) | Fast Verification Command |
|---|---|---|---|---|---|
| **Claude 1** | Claude Code | Cloudflare D1 & Worker Configuration | Provision D1 database, create D1 migration schema, configure worker bindings in `wrangler.jsonc` | `packages/sync-worker/wrangler.jsonc`<br>`packages/sync-worker/schema.sql`<br>`packages/sync-worker/package.json` | `npx wrangler d1 info` or `pnpm --filter sync-worker typecheck` |
| **Claude 2** | Claude Code | Cloudflare Worker Delta Sync API & CI/CD | Edge sync endpoint (`POST /api/sync`) with batch LWW upsert, delta pull queries, and GitHub Actions workflow | `packages/sync-worker/src/index.ts`<br>`.github/workflows/deploy-worker.yml` | `pnpm --filter sync-worker test` |
| **Claude 3** | Claude Code | Admin Problem Drawer & Actions | Interactive problem editing drawer, JSON test case validator, and save/update mutations | `apps/web/app/admin/problems/page.tsx`<br>`apps/web/app/admin/problems/problem-drawer.tsx`<br>`apps/web/app/admin/actions.ts` | `pnpm --filter web typecheck` |
| **Antigravity 1** | Antigravity | Reusable Skeletons & Workspace Skeleton | `Skeleton` primitives, split-pane problem workspace skeleton, Today dashboard skeleton | `apps/web/app/components/skeleton.tsx`<br>`apps/web/app/dsa/[id]/problem-skeleton.tsx`<br>`apps/web/app/components/today-skeleton.tsx`<br>`apps/web/app/page.tsx`<br>`apps/web/app/dsa/[id]/page.tsx` | `pnpm --filter web typecheck` |
| **Antigravity 2** | Antigravity | Study, Review & Roadmap Skeletons | Skeletons for study articles, DSA roadmap, review queue, and profile settings; removes all raw loading texts | `apps/web/app/components/study-skeleton.tsx`<br>`apps/web/app/components/roadmap-skeleton.tsx`<br>`apps/web/app/components/review-skeleton.tsx`<br>`apps/web/app/study/[area]/[id]/page.tsx`<br>`apps/web/app/study/page.tsx`<br>`apps/web/app/dsa/page.tsx`<br>`apps/web/app/roadmap/page.tsx`<br>`apps/web/app/review/page.tsx`<br>`apps/web/app/profile/page.tsx`<br>`apps/web/app/profile/settings/page.tsx` | `pnpm --filter web typecheck` |
| **Antigravity 3** | Antigravity | Client Sync Manager & Status Pill | Periodic background sync, network status watcher (`online`/`offline`), queue flusher, and sync status pill | `apps/web/lib/sync-manager.ts`<br>`apps/web/app/components/sync-status.tsx`<br>`apps/web/lib/sync-client.test.ts` | `pnpm exec vitest run apps/web/lib/sync-client.test.ts` |

---

## Testing Protocol & Rules

- **Strict Tiered Verification (Never run full `pnpm check` during iteration):**
  - **Tier 1:** Run only your owned targeted test file (takes 1-3 seconds).
  - **Tier 2:** `pnpm -r typecheck` (takes ~6-10 seconds).
  - **Tier 3:** Full `pnpm check` is run strictly **once** by the lead after all 6 agents finish and commits merge.
- **No changes to files owned by other agents.**

---

## Acceptance Criteria

- [x] Cloudflare D1 database and Worker package configured with bindings.
- [x] `/api/sync` handles batch push mutations and pulls deltas with Last-Write-Wins.
- [x] Admin portal allows adding and editing problems and test cases.
- [x] Problem workspace and Today dashboard display smooth, theme-aware skeleton loaders without layout shift.
- [x] All other routes (Study, Roadmap, Review, Profile) display tailored skeleton loaders with zero `<p className="text-muted">Loading...</p>` text remaining.
- [x] Client sync manager flushes offline mutations automatically upon reconnecting.
- [x] `pnpm -r typecheck` passes with zero errors across all packages.
