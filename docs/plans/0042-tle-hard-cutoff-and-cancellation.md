# 0042: Time Limit Exceeded (TLE) hard cutoff and process tree cancellation

- **Status:** ready
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** (implementer fills in)
- **Spec:** none (extends plans 0018 and 0021)

## Goal

When user code exceeds the execution time limit (such as an infinite loop, accidental $O(N^2)$ algorithm on $N=10^5$, or operations exceeding $10^8$ to $10^9$ cycles), the judge immediately terminates the entire process tree, stops further execution, and reports a clear "Time Limit Exceeded (TLE)" result with the runtime and failing test case, instead of hanging or spinning CPU in the background.

## Context

- `apps/web/lib/judge/run.ts` executes user-submitted code (C++, Java, JavaScript) through `runProcess`.
- Currently, `runProcess` uses `child.kill("SIGKILL")` upon timeout. On Windows, `child.kill` sends a standard signal that does not reliably terminate child processes or subprocess trees (e.g., binaries spawned under MinGW or JVM processes), occasionally leaving orphan threads running and consuming CPU.
- Standard coding platforms (LeetCode, Codeforces, AtCoder, CSES) enforce strict time limits ($\sim 1.0\text{s}$ to $2.0\text{s}$ per test case, or $\approx 10^8$ basic operations).
- In `CaseResult`, timeouts are marked with `problem: "timeout"`, but the UI presentation does not give the recognizable "Time Limit Exceeded (TLE)" badge with millisecond granularity, comparison against the limit, and immediate runaway abort.

## Out of scope

- Distributed sandbox clusters (Docker/gVisor/Firecracker) — this plan targets the local judge on Windows, macOS, and Linux.
- Client-side browser execution (Wasm).

## Steps

- [ ] **1. Robust process tree termination on all platforms.**
  - In `apps/web/lib/judge/run.ts`, implement cross-platform process tree killing:
    - On Windows: Use `taskkill /pid <PID> /T /F` via `execFile` to guarantee every descendant process and thread is immediately terminated.
    - On POSIX (Linux/macOS): Spawn with detached process groups (`detached: true`) and kill `-child.pid` with `SIGKILL`.
  - Ensure standard file descriptors and watchers are closed cleanly on timeout without memory leaks.
  - Done when: A test case with an intentional `while(true)` infinite loop terminates cleanly within the configured timeout and leaves 0 orphan processes in the OS process table.

- [ ] **2. Explicit per-problem & per-test time limits with TLE status.**
  - Add optional `timeLimitMs?: number` to `ProblemSpec` (defaulting to 1,000ms for C++, 2,500ms for Java, 4,000ms for JavaScript).
  - Add explicit `"tle"` case status to `CaseResult`:
    ```typescript
    export type CaseResult = {
      ...
      problem?: "exception" | "crash" | "timeout" | "memory" | "not-run" | "tle";
      timeLimitMs?: number;
      elapsedMs?: number;
    }
    ```
  - When a test case exceeds `timeLimitMs`, immediately abort all subsequent test cases, mark the current case as `"tle"`, mark subsequent cases as `"not-run"`, and stop total execution time.
  - Done when: Runaway code stops immediately on the first timing out test case without running remaining cases.

- [ ] **3. UI: LeetCode-style TLE display in the test runner.**
  - In `apps/web/app/dsa/[id]/workspace.tsx` and result panels:
    - Display an amber/red "Time Limit Exceeded (TLE)" badge.
    - Show the exact elapsed time vs. allowed limit (e.g., `Time Limit Exceeded: 1,520ms (limit: 1,000ms)`).
    - Highlight the specific test case and input that triggered the TLE.
  - Done when: Submitting an infinite loop renders the TLE badge and shows input details for the failed case.

- [ ] **4. Tests.**
  - In `apps/web/lib/judge/judge.test.ts`:
    - Add tests for infinite loop detection in C++, Java, and JavaScript.
    - Verify that `taskkill` (on Windows) or process group kill terminates the program and returns `{ problem: "tle" }` (or `"timeout"`).
    - Verify that subsequent cases are marked `"not-run"`.
  - Done when: `pnpm exec vitest run apps/web/lib/judge/judge.test.ts -t "time limit"` passes in $< 10\text{s}$.

## Acceptance criteria

- [ ] Infinite loops (`while(true)`) and $O(N^2)$ solutions on $N \ge 10^5$ terminate strictly within the configured time limit.
- [ ] No orphan zombie processes remain running in the OS after TLE termination.
- [ ] UI displays a clear "Time Limit Exceeded (TLE)" badge with elapsed time and the failing test case input.
- [ ] `pnpm check` passes.

## Open questions

(none)

## Implementation notes

(Implementer fills in)

## Review

(Reviewer fills in)
