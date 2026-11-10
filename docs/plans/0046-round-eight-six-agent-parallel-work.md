# 0046: Round eight: six-agent parallel sprint (TLE cancellation, Java IDE, sync engine & admin)

- **Status:** ready
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** 6 parallel agents (3 Antigravity, 3 Claude Code), 2026-11-10
- **Spec:** Balanced 6-way workload (~10-15 mins each) with zero file collisions and fast targeted test execution

## Workload Balancing Rationale

Round Eight tackles the core execution reliability, interactive design practice, offline sync data layer, and dynamic administration:
1. **Antigravity 1:** Hard TLE cutoff & cross-platform process tree cancellation (Plan 0042 backend).
2. **Claude 1:** TLE UI presentation, badges, elapsed runtime & failing case indicator (Plan 0042 frontend).
3. **Antigravity 2:** Multi-file Java compilation & execution backend for LLD / System Design (Plan 0043 backend).
4. **Claude 2:** Multi-file tabbed IDE UI component with class creation, deletion & persistence (Plan 0043 frontend).
5. **Antigravity 3:** Multi-tenant offline-first schema, `local_sync_queue`, and mutation interceptor (Plan 0044 data layer).
6. **Claude 3:** Admin portal layout, authentication gate, and problems manager dashboard (Plan 0045 admin UI).

---

## Agent Assignments & File Isolation (Zero Collisions)

| Agent | Platform | Primary Focus | Exact Scope | Files Owned (Strict Isolation) | Fast Targeted Test Command |
|---|---|---|---|---|---|
| **Antigravity 1** | Antigravity | TLE & Process Tree Killing | Windows `taskkill /pid <PID> /T /F` & POSIX detached process tree killing, immediate abort on timeout, `problem: "tle"` | `apps/web/lib/judge/run.ts`<br>`apps/web/lib/judge/judge-tle.test.ts` | `pnpm exec vitest run apps/web/lib/judge/judge-tle.test.ts` |
| **Claude 1** | Claude Code | TLE UI & Indicators | Amber/red TLE badge, elapsed ms vs limit display, failed test case highlighting in workspace | `apps/web/app/dsa/[id]/workspace.tsx`<br>`apps/web/app/dsa/[id]/result-panel.tsx` | `pnpm --filter web typecheck` |
| **Antigravity 2** | Antigravity | Java IDE Backend Runner | Multi-file Java compilation (`javac -Xlint:all *.java`), execution (`java -Xmx256m Main`), diagnostic parsing | `apps/web/lib/judge/run-project.ts`<br>`apps/web/app/api/judge/run-project/route.ts`<br>`apps/web/lib/judge/project-run.test.ts` | `pnpm exec vitest run apps/web/lib/judge/project-run.test.ts` |
| **Claude 2** | Claude Code | Java Tabbed IDE UI | Tabbed file editor, "+ New Class", delete file, terminal output panel, integrated into LLD & SD pages | `apps/web/app/components/project-editor.tsx`<br>`apps/web/app/study/[area]/[id]/project-playground.tsx` | `pnpm --filter web typecheck` |
| **Antigravity 3** | Antigravity | Offline Sync Queue & Schema | `user_id`, `updated_at`, `deleted_at` migrations, `local_sync_queue` table, mutation tracking | `apps/web/lib/sync-schema.ts`<br>`apps/web/lib/sync-queue.ts`<br>`apps/web/lib/sync-queue.test.ts` | `pnpm exec vitest run apps/web/lib/sync-queue.test.ts` |
| **Claude 3** | Claude Code | Admin Portal UI | Admin layout, `/admin/login`, `/admin/problems` dashboard with search and difficulty filters | `apps/web/app/admin/layout.tsx`<br>`apps/web/app/admin/page.tsx`<br>`apps/web/app/admin/problems/page.tsx`<br>`apps/web/app/admin/login/page.tsx` | `pnpm --filter web typecheck` |

---

## Testing Protocol & Rules

- **Strict Tiered Verification (Never run full `pnpm check` during iteration):**
  - **Tier 1:** Run only your owned targeted test file (takes 1-3 seconds).
  - **Tier 2:** `pnpm -r typecheck` (takes ~10 seconds).
  - **Tier 3:** Full `pnpm check` is run strictly **once** by the lead after all 6 agents finish and commits merge.
- **No changes to files owned by other agents.**

---

## Acceptance Criteria

- [ ] Infinite loops terminate immediately with process tree kill and report `problem: "tle"`.
- [ ] UI displays Time Limit Exceeded badge with elapsed time and input.
- [ ] Multi-file Java backend compiles multiple classes and executes `Main`.
- [ ] Tabbed IDE allows creating, deleting, and editing Java classes with localStorage persistence.
- [ ] Local sync queue records mutations with `updated_at` and soft deletes.
- [ ] `/admin` routes provide protected dashboard and problem management interface.
- [ ] Fast targeted tests pass for all components.
- [ ] Workspace typecheck passes cleanly (`pnpm -r typecheck`).
