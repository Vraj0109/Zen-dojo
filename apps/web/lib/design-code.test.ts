import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DESIGN_DEEP } from "@habit/shared";

// The Java in system design depth content (learn/design-depth-*.ts) compiles without warnings and runs to completion.
// Skipped without a JDK on PATH; CI has JDK 17.

vi.setConfig({ testTimeout: 120_000 });

const hasJdk = spawnSync("javac", ["-version"], { encoding: "utf8" }).status === 0;

describe.skipIf(!hasJdk)(`design Java code compiles and runs (${hasJdk ? "javac found" : "skipped: no javac on PATH"})`, () => {
  for (const [id, d] of Object.entries(DESIGN_DEEP)) {
    for (const c of d.code ?? []) {
      it(`${id}: ${c.name}`, () => {
        const dir = mkdtempSync(path.join(tmpdir(), "habit-design-"));
        try {
          const cls = c.name.replace(/\.java$/, "");
          writeFileSync(path.join(dir, c.name), c.code);
          const comp = spawnSync("javac", ["-Xlint:all", "-d", dir, path.join(dir, c.name)], { encoding: "utf8" });
          expect(comp.status, `javac:\n${comp.stderr}`).toBe(0);
          expect(comp.stderr, "javac warnings").toBe("");
          const run = spawnSync("java", ["-cp", dir, cls], { encoding: "utf8", timeout: 60_000 });
          expect(run.status, `run:\n${run.stdout}\n${run.stderr}`).toBe(0);
          expect(run.stdout.trim().length).toBeGreaterThan(0);
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });
    }
  }
});
