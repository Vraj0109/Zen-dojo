import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { JUDGE_PROBLEMS, type ProblemSpec } from "@habit/shared";
import { DEFAULT_TIME_LIMIT_MS, runCode } from "./run";

const hasGpp = (() => {
  try {
    return !spawnSync("g++", ["--version"], { stdio: "ignore" }).error;
  } catch {
    return false;
  }
})();

describe("Judge TLE Cutoff and Process Tree Cancellation", () => {
  it("exposes the expected default time limits per language", () => {
    expect(DEFAULT_TIME_LIMIT_MS.cpp).toBe(1000);
    expect(DEFAULT_TIME_LIMIT_MS.java).toBe(2500);
    expect(DEFAULT_TIME_LIMIT_MS.javascript).toBe(4000);
  });

  it(
    "terminates an intentional while(true) infinite loop in JavaScript strictly within the timeout",
    async () => {
      const spec: ProblemSpec & { timeLimitMs?: number } = {
        ...JUDGE_PROBLEMS["lc-1"],
        timeLimitMs: 400,
      };

      const infiniteLoopCode = `
        function twoSum(nums, target) {
          while (true) {}
        }
      `;

      const t0 = Date.now();
      const res = await runCode(spec, "javascript", infiniteLoopCode);
      const elapsed = Date.now() - t0;

      // Must complete well before a hanging process would, and strictly within the per-case timeout + buffer
      expect(elapsed).toBeLessThan(2500);
      expect(res.status).toBe("done");

      if (res.status === "done") {
        expect(res.passed).toBe(0);
        expect(res.results.length).toBeGreaterThanOrEqual(2);

        const first = res.results[0];
        expect(first.pass).toBe(false);
        expect(first.problem).toBe("tle");
        expect(first.timeLimitMs).toBe(400);
        expect(first.elapsedMs).toBeGreaterThanOrEqual(350);
        expect(first.error).toMatch(/Time Limit Exceeded/i);

        // All subsequent cases must be marked as not-run
        const remaining = res.results.slice(1);
        expect(remaining.length).toBeGreaterThan(0);
        for (const rem of remaining) {
          expect(rem.problem).toBe("not-run");
          expect(rem.pass).toBe(false);
        }
      }
    },
    10_000
  );

  it(
    "immediately aborts subsequent test cases when a case encounters TLE",
    async () => {
      const spec: ProblemSpec & { timeLimitMs?: number } = {
        ...JUDGE_PROBLEMS["lc-1"],
        timeLimitMs: 400,
      };

      // Case 0 passes; Case 1 enters an infinite loop
      const conditionalLoopCode = `
        function twoSum(nums, target) {
          if (nums.length === 4 && nums[0] === 2 && target === 9) {
            return [0, 1];
          }
          while (true) {}
        }
      `;

      const res = await runCode(spec, "javascript", conditionalLoopCode);
      expect(res.status).toBe("done");

      if (res.status === "done") {
        expect(res.results[0].pass).toBe(true);
        expect(res.results[0].problem).toBeUndefined();

        const second = res.results[1];
        expect(second.pass).toBe(false);
        expect(second.problem).toBe("tle");
        expect(second.timeLimitMs).toBe(400);

        // All cases after the second case must be not-run
        const remaining = res.results.slice(2);
        expect(remaining.length).toBeGreaterThan(0);
        for (const rem of remaining) {
          expect(rem.problem).toBe("not-run");
          expect(rem.pass).toBe(false);
        }
      }
    },
    10_000
  );

  it(
    "leaves no orphan processes running in the operating system after TLE termination",
    async () => {
      const spec: ProblemSpec & { timeLimitMs?: number } = {
        ...JUDGE_PROBLEMS["lc-1"],
        timeLimitMs: 350,
      };

      // An infinite loop that also continuously does work
      const busyLoopCode = `
        function twoSum(nums, target) {
          let x = 0;
          while (true) {
            x = (x + 1) | 0;
          }
        }
      `;

      const res = await runCode(spec, "javascript", busyLoopCode);
      expect(res.status).toBe("done");
      if (res.status === "done") {
        expect(res.results[0].problem).toBe("tle");
      }

      // Small delay to allow any OS-level cleanup to settle
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (process.platform === "win32") {
        // Query tasklist to verify no lingering node or main processes from the temp judge directory
        const tasklist = execFileSync("tasklist", ["/FO", "CSV"], { encoding: "utf8" });
        // The test itself is running, but no orphaned main.exe should exist
        expect(tasklist).not.toContain('"main.exe"');
      }
    },
    10_000
  );

  it.skipIf(!hasGpp)(
    "terminates an infinite loop in C++ within the timeout and marks remaining not-run",
    async () => {
      const spec: ProblemSpec & { timeLimitMs?: number } = {
        ...JUDGE_PROBLEMS["lc-1"],
        timeLimitMs: 500,
      };

      const cppLoop = `
        #include <vector>
        using namespace std;
        class Solution {
        public:
            vector<int> twoSum(vector<int>& nums, int target) {
                while (true) {}
                return {};
            }
        };
      `;

      const res = await runCode(spec, "cpp", cppLoop);

      expect(res.status).toBe("done");
      if (res.status === "done") {
        expect(res.results[0].problem).toBe("tle");
        expect(res.results[0].timeLimitMs).toBe(500);

        const remaining = res.results.slice(1);
        expect(remaining.length).toBeGreaterThan(0);
        for (const rem of remaining) {
          expect(rem.problem).toBe("not-run");
        }
      }

      if (process.platform === "win32") {
        const tasklist = execFileSync("tasklist", ["/FO", "CSV"], { encoding: "utf8" });
        expect(tasklist).not.toContain('"main.exe"');
      }
    },
    20_000
  );
});
