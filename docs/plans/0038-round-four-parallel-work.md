# 0038: Round four: who does what (plans 0014, 0022, 0025, 0031, 0012)

- **Status:** ready
- **Planned by:** Antigravity, 2026-11-09
- **Implemented by:** 4 parallel agents (2 Claude Code, 2 Antigravity)
- **Spec:** Architectural decisions, speed requirements, and parallel work distribution

## Architectural Decision on WebAssembly C++ (Plan 0034 Part B)

**Decision: Reject / Drop WebAssembly C++ runtime in favor of maximum performance.**

- **Rationale:** WebAssembly Clang/C++ compilers in Node/V8 run **5× to 15× slower** in compilation time, inflate desktop bundle size by 40+ MB, and exhibit 2× to 4× slower runtime execution on complex algorithms.
- Zen Dojo's primary design goal is to be **instantaneous and blazingly fast** ("fast as fuck").
- On Windows 11 with Smart App Control (SAC):
  - Java and JavaScript already execute via signed runtimes (`java.exe` and `node.exe`) at native speed with zero OS blocks.
  - Plan 0034 Part A already automatically detects blocked native C++ runs, alerts the user, and auto-switches to Java/JavaScript seamlessly.
  - The correct industry-standard resolution for native desktop distribution without compromising speed is **code signing the installer and executables (Azure Trusted Signing)**, not slowing down the engine with an in-browser Wasm compiler.

---

## Agent Coordination Rules

1. **Isolation:** Each agent works on its assigned branch in its own worktree or directory:
   - `agent/claude-problems` (Claude Agent 1)
   - `agent/claude-sysdesign` (Claude Agent 2)
   - `agent/agy-lld` (Antigravity Agent 1)
   - `agent/agy-diagrams` (Antigravity Agent 2)
2. **Fast Targeted Testing:** Never run full `pnpm check` during iterative work. Run only targeted tests:
   ```powershell
   pnpm.cmd exec vitest run <file> -t "<filter>"
   ```
3. **Check Before Handover:** Run `pnpm check` once before handing off work.
4. **Git Safety:** Commit locally with plain-English messages. Do not push, tag, or add `Co-Authored-By`. Never touch `data/habit.db`.
5. **Zero File Overlap:** Agents must only touch the files assigned in their table below.

---

## Work Distribution Matrix

| Agent | Platform | Primary Plan | Description & Tasks | Files Owned |
|---|---|---|---|---|
| **Agent 1** | **Claude Code 1** | **Plan 0022** (Problem Library) | **Roadmap & Logic-Building Problems:**<br>1. Complete judge specs for the ~30 remaining roadmap problems.<br>2. Add curated logic-building problems from AtCoder, Codeforces, Project Euler, and Kattis.<br>3. Verify all inputs/outputs with C++ reference answers and include large stress inputs. | `packages/shared/src/judge/problems-*.ts`<br>`packages/shared/src/judge/stress-*.ts`<br>`packages/shared/src/judge/index.ts`<br>`packages/shared/src/dsa.ts` |
| **Agent 2** | **Claude Code 2** | **Plan 0014** (Batch E Depth) & **Plan 0031** (System Design Parity) | **Deep System Design & Interactive Architecture:**<br>1. Expand the 7 Batch E system designs (Metrics, Kafka, Recommendations, Building Blocks, Delivery Slots, Pricing, Catalog) to 1,500+ words with real-world capacity numbers, failure modes, and interview trade-offs.<br>2. Add interactive architecture blocks and evaluation criteria. | `packages/shared/src/learn/design-depth-*.ts`<br>`packages/shared/src/learn/designs-*.ts`<br>`packages/shared/src/learn/design-extra.ts`<br>`apps/web/app/design-deep.tsx` |
| **Agent 3** | **Antigravity 1** | **Plan 0025** (LLD Batch F) | **8 New Low-Level Design Java Projects:**<br>Build full Java 17 codebases with unit tests, 1,000+ word walkthroughs, and Mermaid diagrams for:<br>1. Pub-Sub Message Queue<br>2. Order Book Matching Engine<br>3. Text Editor with Undo/Redo<br>4. Distributed Job Scheduler<br>5. Digital Wallet / Multi-Currency Ledger<br>6. API Gateway with Rate Limiter<br>7. Inventory Management System<br>8. Social Media Activity Feed | `packages/shared/src/learn/lld-projects-*.ts`<br>`apps/web/lib/lld-projects.test.ts`<br>`packages/shared/src/learn/lld-*.ts` |
| **Agent 4** | **Antigravity 2** | **Plan 0012** (Diagrams Polish) & **Plan 0034** (ADR Closeout) | **Mermaid Diagrams Polish & Architecture Closeout:**<br>1. Audit and insert Mermaid sequence and architecture diagrams across Core CS (OS, Databases, Networking, Concurrency) and DSA lessons.<br>2. Update Plan 0034 to record the Architectural Decision rejecting Wasm C++ to preserve maximum speed. | `packages/shared/src/learn/diagrams.ts`<br>`packages/shared/src/learn/core-*.ts`<br>`docs/plans/0034-blocked-programs-and-wasm-cpp.md` |

---

## Merge Order

1. **Merge Order:** Agent 4 $\rightarrow$ Agent 2 $\rightarrow$ Agent 3 $\rightarrow$ Agent 1.
2. Run `pnpm check` after each merge.
3. Update `docs/plans/README.md` and `docs/HANDOFF.md`.
