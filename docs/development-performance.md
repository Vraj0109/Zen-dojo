# Development & Test Performance Guide

Zen Dojo runs real compilers (`g++` for C++ and `javac` for Java) directly inside Vitest to guarantee that every educational code snippet, reference solution, and LLD project compiles and runs cleanly. Because of this, running the full test suite compiles dozens of native binaries and can take 3.5 to 5.5 minutes if run improperly.

Follow these rules to keep development cycle times under 5 seconds.

---

## 1. Testing Tiers & Rules for Agents

### Tier 1: Targeted File Tests (2 to 5 seconds) — USE DURING ACTIVE DEVELOPMENT
Never run `pnpm test` or `pnpm check` while iterating on code. Run only the single test file corresponding to the files you edited:
```bash
# Testing diagrams:
pnpm exec vitest run apps/web/lib/diagrams-parse.test.ts

# Testing learn guides, LLD systems, and design depth registration:
pnpm exec vitest run packages/shared/src/learn/learn.test.ts

# Testing system design depth:
pnpm exec vitest run packages/shared/src/learn/design-depth.test.ts

# Testing problem library & judge harnesses:
pnpm exec vitest run apps/web/lib/judge/judge.test.ts

# Testing UI navigation / breadcrumbs / TOC:
pnpm exec vitest run apps/web/app/toc-items.test.ts
```

### Tier 2: Workspace Typecheck (10 to 15 seconds)
Run this after writing TypeScript definitions to check all 4 packages without running heavy compilers:
```bash
pnpm -r typecheck
```

### Tier 3: Full Gatekeeper Check (`pnpm check`) — RUN ONLY ONCE BEFORE PUSH
- **NEVER** run `pnpm test` followed by `pnpm check`. `pnpm check` already runs `pnpm test` as its third step. Running both back-to-back simply compiles 100+ native executables twice.
- Run `pnpm check` only **once** as the final sign-off when all agent work is completed and ready to commit/push.

---

## 2. Windows Defender File-Scanning Exclusion

On Windows 11, Windows Defender scans every ephemeral `.exe` and `.class` file emitted by `g++` and `javac` in `%TEMP%` and the workspace. Adding an exclusion cuts compile times by 50% to 70%.

Run this once in PowerShell as Administrator:
```powershell
Add-MpPreference -ExclusionPath "C:\MyStuff\Projects\HabbitManager"
```

---

## 3. Parallel Agent Coordination

When working with parallel subagents (Claude Code + Antigravity):
- Divide tasks into independent files so agents never conflict or lock the same files.
- Subagents must ONLY use **Tier 1 targeted vitest runs**.
- The coordinating agent runs the single final `pnpm check` after merging.
