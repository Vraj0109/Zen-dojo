import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PATTERN_ARTICLES } from "@habit/shared";

// Every C++ block in a pattern article must compile. Skipped (with the reason in the test name) when no C++ compiler
// is on PATH, so a machine without g++ can still run the suite; CI runners have g++.

vi.setConfig({ testTimeout: 120_000 });

const compiler = ["g++", "clang++"].find((c) => spawnSync(c, ["--version"], { encoding: "utf8" }).status === 0);

// Blocks of one article may depend on earlier blocks of the same article (they are concatenated in order), so each
// block must only define things that do not clash when put together: helper names are unique within an article.
const PRELUDE = "#include <bits/stdc++.h>\nusing namespace std;\n";

describe.skipIf(!compiler)(`pattern article code compiles (${compiler ?? "skipped: no g++ or clang++ on PATH"})`, () => {
  for (const [id, article] of Object.entries(PATTERN_ARTICLES)) {
    it(id, () => {
      const dir = mkdtempSync(path.join(tmpdir(), "habit-article-"));
      try {
        const file = path.join(dir, `${id}.cpp`);
        writeFileSync(file, PRELUDE + article.sections.map((s) => s.code ?? "").filter(Boolean).join("\n\n") + "\n");
        const r = spawnSync(compiler!, ["-std=c++17", "-fsyntax-only", "-Wall", "-Wno-unused-function", "-Wno-sign-compare", file], { encoding: "utf8" });
        expect(r.status, `${id}:\n${r.stderr}`).toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
