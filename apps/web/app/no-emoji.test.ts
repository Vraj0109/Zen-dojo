import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;

function findTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTsxFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("No emoji guard", () => {
  it("apps/web/app contains no emoji or disallowed symbols in .tsx files", () => {
    const root = path.resolve(__dirname);
    const files = findTsxFiles(root);
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        const match = line.match(EMOJI_RE);
        if (match) {
          const relativePath = path.relative(path.resolve(__dirname, "../../.."), file).replace(/\\/g, "/");
          violations.push(
            `${relativePath}:${index + 1} contains disallowed character '${match[0]}' (U+${match[0].codePointAt(0)?.toString(16).toUpperCase()})`
          );
        }
      });
    }

    expect(violations, `Found emoji/symbols:\n${violations.join("\n")}`).toEqual([]);
  });
});
