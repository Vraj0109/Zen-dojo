import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { LLD_PROJECTS } from "@habit/shared";

// The Java toolchain path works: one LLD project must compile, run, print what the lesson says it prints, and pass its
// own tests. (Not every project on every run: that is content checking, done when a project is written.) Skipped (with
// the reason in the test name) when no JDK is on PATH; CI installs JDK 17.

vi.setConfig({ testTimeout: 180_000 });

const hasJdk = spawnSync("javac", ["-version"], { encoding: "utf8" }).status === 0;

describe.skipIf(!hasJdk)(`LLD Java projects compile and run (${hasJdk ? "javac found" : "skipped: no javac on PATH"})`, () => {
  const targetIds = new Set([
    Object.keys(LLD_PROJECTS)[0],
    "lldp-pubsub",
    "lldp-orderbook",
    "lldp-text-editor",
    "lldp-job-scheduler",
    "lldp-wallet",
    "lldp-api-gateway",
    "lldp-inventory",
    "lldp-social-feed",
  ]);
  for (const [id, project] of Object.entries(LLD_PROJECTS).filter(([id]) => targetIds.has(id))) {
    it(id, () => {
      const dir = mkdtempSync(path.join(tmpdir(), "habit-lld-"));
      try {
        const src = path.join(dir, "src");
        const out = path.join(dir, "out");
        mkdirSync(src);
        mkdirSync(out);
        const all = [...project.files, ...(project.tests ?? [])];
        for (const f of all) writeFileSync(path.join(src, f.name), f.code);
        const compile = spawnSync("javac", ["-Xlint:all", "-d", out, ...all.map((f) => path.join(src, f.name))], { encoding: "utf8" });
        expect(compile.status, `${id} javac:\n${compile.stderr}`).toBe(0);

        const run = spawnSync("java", ["-cp", out, "Main"], { encoding: "utf8", timeout: 60_000 });
        expect(run.status, `${id} Main:\n${run.stdout}\n${run.stderr}`).toBe(0);
        for (const line of project.expectedOutput) expect(run.stdout, `${id}: Main should print "${line}"`).toContain(line);

        if (project.tests?.length) {
          const cls = project.tests[0].name.replace(/\.java$/, "");
          const t = spawnSync("java", ["-cp", out, cls], { encoding: "utf8", timeout: 60_000 });
          expect(t.status, `${id} tests:\n${t.stdout}\n${t.stderr}`).toBe(0);
          expect(t.stdout, `${id}: tests should report passes`).toContain("PASS");
          expect(t.stdout, `${id}: no failing test`).not.toContain("FAIL");
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
