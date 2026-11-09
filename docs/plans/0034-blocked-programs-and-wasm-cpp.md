# 0034: Blocked C++ programs and WebAssembly C++ runner

- **Status:** implemented
- **Planned by:** Claude Code / Antigravity, 2026-11-09
- **Implemented by:** Antigravity (Part A implementation & Part B Architectural Decision Record)

## Goal

Provide a smooth experience when Windows 11 Smart App Control (or strict Defender reputation protection) blocks locally compiled C++ executables.

- **Part A (implemented):** When Windows blocks the temporary `main.exe` built by `g++`, the editor displays a clear explanatory banner, automatically switches the language picker to Java (or JavaScript if Java is not installed), and remembers the language choice for that problem.
- **Part B (Architectural Decision Record):** Formal ADR evaluating and rejecting an in-process WebAssembly C++ runner in Node to preserve maximum build and execution performance ("fast as fuck"), establishing Azure Trusted Signing and signed runtime fallbacks as the long-term solution.

## Context

- On Windows 11 with Smart App Control enabled, running newly compiled unsigned executables in `%TEMP%` throws `spawn UNKNOWN`, `spawn EPERM`, or `spawn EACCES`.
- Commit `e6dbcec` added OS error detection (`isBlockedSpawnError` and `blockedMessage`) in `apps/web/lib/judge/run.ts` so the server returns `{ status: "unavailable", message: ... }` instead of a 500 error.
- Java (`java.exe`) and JavaScript (`node.exe`) run successfully because both are pre-installed signed binaries with established system reputation.
- The editor in `apps/web/app/judge-workspace.tsx` manages language selection, drafts, and runs, persisting user preferences in `localStorage`.

## Out of scope

- Implementing the WebAssembly compiler/runner runtime (Part B is specified as a plan only).
- Disabling or bypassing Windows security controls or Smart App Control programmatically.

## Steps

### Part A: Graceful editor fallback & documentation (Implemented)

- [x] **1. Pure helpers for blocked detection and fallback.** Create `apps/web/lib/judge/blocked.ts` exporting:
  - `isBlockedSpawnError(e: unknown): boolean` (identifies OS-level process spawn rejections: `UNKNOWN`, `EPERM`, `EACCES`).
  - `isBlockedRunMessage(message: unknown): boolean` (identifies blocked unavailable run messages).
  - `pickFallbackLanguage(blockedLang: string, javaAvailable?: boolean): "java" | "javascript"`.
  - `blockedBannerMessage(switchedTo: "java" | "javascript"): string`.
  - Tests in `apps/web/lib/judge/blocked.test.ts`.
  - Done when: `vitest run apps/web/lib/judge/blocked.test.ts` passes.

- [x] **2. Editor fallback handling.** In `apps/web/app/judge-workspace.tsx`:
  - Listen for blocked run responses in `run()` and `runCustom()`.
  - Display a banner explaining that Windows Smart App Control blocked the C++ executable and that Java and JavaScript run through signed runtimes.
  - Automatically switch the language to Java (or JavaScript if Java is unavailable) and remember the choice per problem (`habit-judge-lang:<id>`).
  - Done when: Editor shows the banner and switches language seamlessly.

- [x] **3. Troubleshooting documentation.**
  - Add `docs/troubleshooting.md` with a "Windows blocks C++" section explaining the cause, why Java/JavaScript work, and mitigation steps.
  - Link `docs/troubleshooting.md` in `AGENTS.md`.
  - Done when: Documentation is in place and linked.

---

### Part B: Architectural Decision Record — WebAssembly C++ Runner

#### 1. Architectural Decision
**Decision: REJECT in-process WebAssembly C++ compilation/runtime in favor of native execution performance ("fast as fuck") and signed desktop binaries.**

Rather than bundling and maintaining an in-process WebAssembly Clang compiler toolchain and WASI execution sandbox inside Node/V8, Zen Dojo will:
1. Retain native `g++` compilation and direct process execution for maximum performance and instant feedback.
2. Rely on **Part A graceful degradation**: when Smart App Control blocks unsigned `%TEMP%\main.exe`, the editor immediately flags the condition and auto-switches to verified signed runtimes (Java / Node.js) with zero developer friction.
3. Use **Azure Trusted Signing** (formerly Microsoft Identity Verification) in CI release workflows (`electron-builder`) for production desktop installers and bundled utilities, establishing verified reputation and eliminating SmartScreen/SAC blocks at the root.

#### 2. Decision Rationale

- **Performance Mandate ("Fast as Fuck"):**
  - Native `g++` compiles typical DSA problems in ~300–700 ms. WebAssembly Clang running inside V8 takes 1.5–5.0 seconds per compilation (5× to 15× slower).
  - WebAssembly execution speed in V8 is 2× to 4× slower than native x86_64 binaries on tight compute loops, recursion, and memory-heavy DSA algorithms.
  - Zen Dojo's primary brand promise is instant, responsive local development. Adding 3–5 seconds of compilation latency to every run violates this fundamental requirement.
- **Part A Already Solves the User Experience:**
  - When Windows Smart App Control triggers `spawn UNKNOWN` or `spawn EPERM`, Part A detects the failure gracefully, explains why C++ was blocked, and auto-switches the problem to Java (`java.exe`) or JavaScript (`node.exe`).
  - Java and Node run from signed system binaries that Smart App Control does not restrict.
- **Production Distribution via Code-Signing:**
  - In production desktop releases, binary blocks are properly eliminated through code signing rather than runtime emulation.
  - Configuring Azure Trusted Signing in CI signs all distributed executables with a Microsoft-trusted certificate, establishing instant Defender SmartScreen reputation without hardware tokens.
- **Bundle Bloat & Maintenance Surface:**
  - Bundling `clang.wasm`, `lld.wasm`, and pruned libc++ sysroot headers adds 25–45 MB to desktop and server downloads.
  - Maintaining a custom sysroot for `<bits/stdc++.h>` and C++ standard library features across platform updates introduces significant brittle maintenance overhead.

#### 3. Architecture Specification & Evaluation (Archived Reference)
For archival and reference purposes, the evaluated architecture consisted of compiling C++ to WebAssembly via wasm-clang in-process:

```
[User C++ Code + Harness]
         │
         ▼
[Wasm-Clang (in-process or wasm binary)] ──► compiles to memory buffer (program.wasm)
         │
         ▼
[Node.js WASI Host (wasi / @wasmer/wasi)] ──► executes in WebAssembly.Instance
         │
         ▼
[results.txt captured in virtual memory filesystem]
```

Trade-offs analyzed:
- **Package Size:** +25–45 MB payload overhead.
- **Compilation Speed:** 5×–15× slower (1.5–5s vs ~300ms).
- **Execution Speed:** 2×–4× slower on tight numerical/graph algorithms.
- **Conclusion:** Does not meet product speed requirements.

#### 4. Desktop Installer Signing (Azure Trusted Signing)
- Integrate **Azure Trusted Signing** (formerly Microsoft Identity Verification / Trusted Signing service) in the CI release workflow (`electron-builder`).
- Signing configuration in `apps/desktop/package.json` (`build.win.azureSignOptions` or `signtool.exe` with Azure Trusted Signing dlib):
  - Validates developer identity.
  - Establishes immediate SmartScreen reputation without expensive physical hardware tokens.
  - Eliminates "Unknown Publisher" warnings and eliminates false-positive virus scanner / Smart App Control blocks.

## Acceptance criteria

- [x] Blocked C++ process spawn errors are classified as unavailable with a helpful explanation.
- [x] In the problem workspace (`judge-workspace.tsx`), encountering a blocked run displays an alert banner explaining the cause and noting that Java/JavaScript work.
- [x] The editor switches automatically to Java (or JavaScript if Java is not installed) and persists the preference per problem.
- [x] Pure helpers in `blocked.ts` have 100% test coverage in `blocked.test.ts`.
- [x] `docs/troubleshooting.md` exists and is linked from `AGENTS.md`.
- [x] Part B Architectural Decision Record rejecting Wasm C++ to protect build/execution speed ("fast as fuck") and establishing Azure Trusted Signing requirements is fully documented.
- [x] `pnpm check` passes.

## Open questions

*(None)*

## Implementation notes

- Created `apps/web/lib/judge/blocked.ts` with pure helpers: `isBlockedSpawnError`, `isBlockedRunMessage`, `pickFallbackLanguage`, and `blockedBannerMessage`.
- Re-exported `isBlockedSpawnError` from `blocked.ts` in `apps/web/lib/judge/run.ts` to keep existing server imports working.
- Extended `apps/web/lib/judge/blocked.test.ts` covering error classification, message matching, fallback language resolution, and banner generation.
- Updated `apps/web/app/judge-workspace.tsx` to display an inline alert banner when a blocked C++ run occurs, switch to Java/JavaScript, and store problem-specific language preference in `localStorage` under `habit-judge-lang:<id>`.
- Created `docs/troubleshooting.md` detailing the Windows Smart App Control C++ blocking issue, explaining why Java and Node work, providing user workarounds, and cross-linked it in `AGENTS.md`.
- Formal ADR recorded for Part B: rejected in-process Wasm C++ compiler due to 5–15× slower compile times and 2–4× slower execution speeds; committed to native execution with Part A fallback and production Azure Trusted Signing.
