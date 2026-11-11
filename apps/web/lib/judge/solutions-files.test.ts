import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkFiles, generatedIsCurrent, readSolutionFiles, renderGenerated } from "../../../../scripts/solutions.mjs";

describe("the solutions folder reader", () => {
  it("reads files, normalises line endings, flags bad names and detects a stale bundle", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "solutions-"));
    const gen = `${dir}-gen.ts`;
    try {
      fs.writeFileSync(path.join(dir, "lc-1.java"), "class Solution {}\r\n");
      fs.writeFileSync(path.join(dir, "lc-1.py"), "class Solution: pass\n");
      fs.writeFileSync(path.join(dir, "lc-2.txt"), "x");
      fs.writeFileSync(path.join(dir, "README.md"), "# readme");
      const { files, errors } = readSolutionFiles(dir);
      expect(files.map((x) => x.name)).toEqual(["lc-1.java", "lc-1.py"]);
      expect(files[0].code).toBe("class Solution {}\n");
      expect(checkFiles(files, errors, new Set(["lc-1"]))).toEqual(["lc-2.txt: extension must be .java or .py"]);

      fs.rmSync(path.join(dir, "lc-2.txt"));
      fs.writeFileSync(gen, renderGenerated(readSolutionFiles(dir).files));
      expect(generatedIsCurrent(dir, gen)).toBe(true);
      fs.writeFileSync(path.join(dir, "lc-1.py"), "class Solution: pass  # changed\n");
      expect(generatedIsCurrent(dir, gen)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(gen, { force: true });
    }
  });
});
