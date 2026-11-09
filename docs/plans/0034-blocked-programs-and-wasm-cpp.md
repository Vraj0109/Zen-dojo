# 0034: Blocked C++ programs and WebAssembly C++ runner

- **Status:** ready <!-- Part A implemented, Part B plan-only -->
- **Planned by:** Claude Code / Antigravity, 2026-11-09
- **Implemented by:** Antigravity (Part A)

## Goal

Provide a smooth experience when Windows 11 Smart App Control (or strict Defender reputation protection) blocks locally compiled C++ executables.

- **Part A (implemented now):** When Windows blocks the temporary `main.exe` built by `g++`, the editor displays a clear explanatory banner, automatically switches the language picker to Java (or JavaScript if Java is not installed), and remembers the language choice for that problem.
- **Part B (plan only):** A roadmap for running C++ directly as WebAssembly inside Node.js (via bundled wasm clang), eliminating native process spawning entirely and bypassing OS binary execution policies.

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

### Part B: WebAssembly C++ Runner in Node (Plan only)

#### 1. Architecture Overview
Instead of invoking the host's native `g++` and spawning an unsigned `main.exe`, the judge can compile C++ source to a WebAssembly module (`.wasm`) and execute it directly within Node's built-in V8 WebAssembly engine using WASI.

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

#### 2. Size, Speed, and Timing Trade-offs
- **Package Size:**
  - Bundling a WebAssembly Clang toolchain (`clang.wasm`, `lld.wasm`) plus minimal sysroot headers (`<vector>`, `<string>`, `<algorithm>`, `<iostream>`) adds approximately 25–45 MB to the desktop build or server assets.
  - Mitigations: Use a pruned sysroot containing only the standard C++ headers required by DSA problems; compress with Brotli or keep as an optional on-demand download for web/desktop.
- **Compilation Speed:**
  - Native `g++` compiles typical DSA problems in ~300–700 ms.
  - `clang.wasm` running inside Node takes approximately 1.5–2.5 s per compilation (3–4× slower).
- **Execution Speed:**
  - Wasm execution speed in V8 is near-native (~1.2–2× native speed for compute-intensive loops).
  - Fast startup: Instantiating a `WebAssembly.Instance` avoids process creation overhead (~10–20 ms vs ~50–100 ms `spawn` on Windows).
  - Time limits: Adjust `JUDGE_LIMITS.batchMs` and `TIME_MULTIPLIER.cpp` to account for compilation and wasm runtime overhead (e.g. multiplier 1.5×).
- **Security & Sandboxing:**
  - Strict memory sandbox: Wasm runs in isolated linear memory (`WebAssembly.Memory`), eliminating system calls, file system escapes, or access to disk outside the WASI virtual FS.
  - Windows Smart App Control and Defender will never block execution because no native executable file is created or executed.

#### 3. Desktop Installer Signing (Azure Trusted Signing)
- When distributing the Zen Dojo desktop app (`apps/desktop`), unsigned installer executables trigger Microsoft Defender SmartScreen warnings and aggressive Smart App Control scrutiny.
- **Requirement:** Integrate **Azure Trusted Signing** (formerly Microsoft Identity Verification / Trusted Signing service) in the CI release workflow (`electron-builder`).
- Signing configuration in `apps/desktop/package.json` (`build.win.azureSignOptions` or `signtool.exe` with Azure Trusted Signing dlib):
  - Validates developer identity.
  - Establishes immediate SmartScreen reputation without expensive physical hardware tokens.
  - Eliminates "Unknown Publisher" warnings and reduces false-positive virus scanner blocks.

#### 4. Implementation Steps for Part B
- [ ] **B.1. Toolchain Evaluation & Prototype:**
  - Evaluate `wasm-clang` vs `@wasmer/sdk` vs a lightweight WebAssembly C++ compiler package.
  - Create a prototype script in `scripts/try-wasm-cpp.mjs` verifying compilation of a simple vector-sorting program to wasm and executing with Node's `node:wasi`.
- [ ] **B.2. Sysroot Packaging:**
  - Package minimal libc++ headers and runtime stubs into `apps/web/lib/judge/wasm/sysroot/`.
  - Ensure `#include <bits/stdc++.h>` or standard DSA headers resolve cleanly.
- [ ] **B.3. Wasm Runner Implementation:**
  - Implement `apps/web/lib/judge/run-wasm.ts` matching the `runSet` interface from `run.ts`.
  - Capture standard output and virtual `results.txt` via WASI in-memory streams.
- [ ] **B.4. Dynamic Fallback Integration:**
  - In `apps/web/lib/judge/run.ts`, when `isBlockedSpawnError` is triggered, automatically fall back to `runWasmCpp()` if enabled, transparently running the problem without failing.
- [ ] **B.5. Benchmarking & Limits:**
  - Measure memory consumption and execution time across 50 representative roadmap problems.
  - Tune timeouts and memory limits accordingly.

#### 5. Acceptance Criteria for Part B
- C++ code compiles and runs entirely in-memory via WebAssembly on machines with Smart App Control enabled without spawning any native process.
- All standard DSA problem test cases pass with identical outputs to native `g++`.
- Electron desktop builds include Azure Trusted Signing in release workflows.

## Acceptance criteria

- [x] Blocked C++ process spawn errors are classified as unavailable with a helpful explanation.
- [x] In the problem workspace (`judge-workspace.tsx`), encountering a blocked run displays an alert banner explaining the cause and noting that Java/JavaScript work.
- [x] The editor switches automatically to Java (or JavaScript if Java is not installed) and persists the preference per problem.
- [x] Pure helpers in `blocked.ts` have 100% test coverage in `blocked.test.ts`.
- [x] `docs/troubleshooting.md` exists and is linked from `AGENTS.md`.
- [x] Part B architecture, trade-offs, steps, and Azure Trusted Signing requirements are fully documented.
- [x] `pnpm check` passes.

## Open questions

*(None)*

## Implementation notes

- Created `apps/web/lib/judge/blocked.ts` with pure helpers: `isBlockedSpawnError`, `isBlockedRunMessage`, `pickFallbackLanguage`, and `blockedBannerMessage`.
- Re-exported `isBlockedSpawnError` from `blocked.ts` in `apps/web/lib/judge/run.ts` to keep existing server imports working.
- Extended `apps/web/lib/judge/blocked.test.ts` covering error classification, message matching, fallback language resolution, and banner generation.
- Updated `apps/web/app/judge-workspace.tsx` to display an inline alert banner when a blocked C++ run occurs, switch to Java/JavaScript, and store problem-specific language preference in `localStorage` under `habit-judge-lang:<id>`.
- Created `docs/troubleshooting.md` detailing the Windows Smart App Control C++ blocking issue, explaining why Java and Node work, providing user workarounds, and cross-linked it in `AGENTS.md`.
