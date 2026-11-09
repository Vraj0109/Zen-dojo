import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ALL_CONCEPTS, LESSON_EXTRA } from "@habit/shared";

// Java demos inside system design and core CS lessons (Markdown files in packages/shared/content) must compile without
// warnings and run to completion. Only code blocks marked java that declare a main method are run. Skipped without a JDK.

vi.setConfig({ testTimeout: 120_000 });

const hasJdk = spawnSync("javac", ["-version"], { encoding: "utf8" }).status === 0;

const demos: { id: string; title: string; cls: string; code: string }[] = [];
for (const id of Object.keys(ALL_CONCEPTS)) {
  for (const s of LESSON_EXTRA[id]?.deeper ?? []) {
    if (s.lang?.toLowerCase() !== "java" || !s.code || !/static void main\(/.test(s.code)) continue;
    const cls = s.code.match(/public\s+(?:final\s+)?class\s+(\w+)/)?.[1];
    if (cls) demos.push({ id, title: s.title, cls, code: s.code });
  }
}

describe.skipIf(!hasJdk)(`Java demos in lessons compile and run (${hasJdk ? "javac found" : "skipped: no javac on PATH"})`, () => {
  it("there is at least one demo", () => expect(demos.length).toBeGreaterThan(0));
  for (const d of demos) {
    it(`${d.id}: ${d.title}`, () => {
      const dir = mkdtempSync(path.join(tmpdir(), "habit-core-"));
      try {
        writeFileSync(path.join(dir, `${d.cls}.java`), d.code);
        const c = spawnSync("javac", ["-Xlint:all", "-d", dir, path.join(dir, `${d.cls}.java`)], { encoding: "utf8" });
        expect(c.status, `javac:\n${c.stderr}`).toBe(0);
        expect(c.stderr, "javac warnings").toBe("");
        const r = spawnSync("java", ["-cp", dir, d.cls], { encoding: "utf8", timeout: 60_000 });
        expect(r.status, `run:\n${r.stdout}\n${r.stderr}`).toBe(0);
        expect(r.stdout.trim().length).toBeGreaterThan(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
