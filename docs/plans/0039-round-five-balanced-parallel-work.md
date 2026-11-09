# 0039: Round five: balanced parallel work (plans 0022, 0025, 0031)

- **Status:** ready
- **Planned by:** Antigravity, 2026-11-09
- **Implemented by:** 4 parallel agents (2 Claude Code, 2 Antigravity)
- **Spec:** Balanced workload distribution (~18-20 mins each) with zero file collisions

## Workload Balancing Rationale

In Round Four, documentation and diagram audits took ~8 minutes while full Java systems and 48 judge problems took ~25–30 minutes. 
To ensure all 4 agents complete in a synchronized ~18–20 minute window, the remaining large features are split into 4 equal-weight units:

1. **Claude Agent 1:** DSA source filter UI & competitive programming logic-building problems.
2. **Claude Agent 2:** System Design Parity for Batches A & B (10 designs: Architecture Explorer & Interview Scorecards).
3. **Antigravity Agent 1:** LLD Batch F Part 2A (2 full Java 17 systems: Digital Wallet & API Gateway).
4. **Antigravity Agent 2:** LLD Batch F Part 2B (2 full Java 17 systems: Inventory Management & Social Activity Feed).

---

## Agent Assignments & File Isolation

| Agent | Platform | Primary Focus | Exact Scope | Files Owned (Zero Collision) |
|---|---|---|---|---|
| **Agent 1** | **Claude Code 1** | Problem Library & DSA Filter | 1. Implement source filter dropdown on `/dsa` (filter by LeetCode, CSES, AtCoder, Codeforces, Euler, Kattis).<br>2. Add dedicated pattern guide articles for external sites.<br>3. Add next batch of 25 logic problems with verified C++ reference outputs and large inputs. | `apps/web/lib/dsa-filters.ts`<br>`apps/web/app/dsa/**`<br>`packages/shared/src/judge/problems-logic-*.ts`<br>`packages/shared/src/judge/stress-logic.ts`<br>`packages/shared/src/dsa.ts` |
| **Agent 2** | **Claude Code 2** | System Design Parity (Part 1) | Add Architecture Explorer blocks (Job, Scale, When it fails) and "How you will be judged" scorecards for the 10 designs in Batches A and B: URL shortener, Rate limiter, Notification service, Distributed cache, Chat system, Video streaming, Web crawler, Search autocomplete, Nearby friends, Google Docs. | `packages/shared/src/learn/design-depth-a.ts`<br>`packages/shared/src/learn/design-depth-b.ts` |
| **Agent 3** | **Antigravity 1** | LLD Batch F (Part 2A) | Implement 2 complete Java 17 systems with tests, 1,000+ word walkthroughs, and Mermaid diagrams:<br>1. **Digital Wallet & Ledger (`lldp-wallet`):** double-entry bookkeeping, ACID transaction holds, balance locking, idempotency keys.<br>2. **API Gateway (`lldp-api-gateway`):** filter pipeline, token bucket / sliding log rate limiter, auth validation, reverse proxy routing. | `packages/shared/src/learn/lld-projects-f2-wallet-gateway.ts`<br>`packages/shared/src/learn/lld-deep-f2.ts` |
| **Agent 4** | **Antigravity 2** | LLD Batch F (Part 2B) | Implement 2 complete Java 17 systems with tests, 1,000+ word walkthroughs, and Mermaid diagrams:<br>1. **Inventory Management (`lldp-inventory`):** SKU tracking, multi-warehouse allocation, reservation holds with TTL expiry, restock alerts.<br>2. **Social Media Feed (`lldp-social-feed`):** follow/unfollow graph, fan-out-on-write vs fan-out-on-read, pagination.<br>*(Follow-up queue if finished early: add architecture cards to `design-depth-c.ts`)* | `packages/shared/src/learn/lld-projects-f3-inventory-feed.ts`<br>`packages/shared/src/learn/lld-deep-f3.ts` |

---

## Shared Integration Rules

1. Each agent writes only to its owned files.
2. Shared registration files (`learn/index.ts`, `learn/lld.ts`, `learn/lld-extra.ts`, `study.ts`) will be integrated by the lead orchestrator after agent verification to avoid lock contention.
3. Fast targeted tests only during active development (`pnpm.cmd exec vitest run <file>`). Never run `pnpm check` concurrently.
4. Plain-English commit messages, no `Co-Authored-By`, never touch `data/habit.db`.
