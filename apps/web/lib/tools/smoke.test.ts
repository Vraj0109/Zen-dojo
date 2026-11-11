import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MANAGED_TOOL_IDS, catalogEntry, platformKey } from "@habit/shared";
import { describe, expect, it } from "vitest";
import { installTool } from "./install";
import { resolveTool, tool } from "../judge/resolve";

// Real downloads from the real hosts. Only runs in .github/workflows/tools-smoke.yml (TOOLS_SMOKE=1), never in pnpm test.
// For the current platform it installs every catalogue tool into a temp folder with the real code, asks each for its version
// and, for C++, builds and runs a hello program with the judge's flags (see run.ts).

const smoke = process.env.TOOLS_SMOKE === "1";
const key = platformKey(process.platform, process.arch);

describe.skipIf(!smoke)("portable tools, real downloads", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zd-smoke-"));
  process.env.HABIT_TOOLS_DIR = dir;

  for (const id of MANAGED_TOOL_IDS) {
    const entry = catalogEntry(id, key);
    it.skipIf(!entry)(`${id}: download, verify, unpack, run`, { timeout: 15 * 60_000 }, async () => {
      await installTool(id, entry!, { toolsDir: dir });
      const run = (file: string, args: string[]) => execFileSync(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 });
      if (id === "java") {
        const javac = tool("HABIT_JAVAC", "javac");
        const java = tool("HABIT_JAVA", "java");
        expect(path.relative(dir, javac).startsWith("..")).toBe(false);
        expect(run(javac, ["-version"]) + run(java, ["-version"])).toBeDefined();
        const src = path.join(dir, "j");
        fs.mkdirSync(src, { recursive: true });
        fs.writeFileSync(path.join(src, "Main.java"), 'public class Main { public static void main(String[] a) { System.out.println("hello"); } }');
        run(javac, ["-d", src, path.join(src, "Main.java")]);
        expect(run(java, ["-cp", src, "Main"]).trim()).toBe("hello");
      } else if (id === "python") {
        const python = resolveTool("python").file;
        expect(path.relative(dir, python).startsWith("..")).toBe(false);
        const out = run(python, ["-c", "print('hello')"]);
        expect(out.trim()).toBe("hello");
      } else {
        const gpp = tool("HABIT_GPP", "g++");
        expect(path.relative(dir, gpp).startsWith("..")).toBe(false);
        expect(run(gpp, ["--version"])).toContain("g++");
        const src = path.join(dir, "c");
        fs.mkdirSync(src, { recursive: true });
        fs.writeFileSync(path.join(src, "main.cpp"), '#include <iostream>\nint main(){ std::cout << "hello\\n"; }\n');
        const exeFile = path.join(src, process.platform === "win32" ? "main.exe" : "main");
        const flags = ["-O2", "-std=c++17", "-D_GLIBCXX_ASSERTIONS", ...(process.platform === "win32" ? ["-Wl,--stack,268435456"] : []), "-o", exeFile, path.join(src, "main.cpp")];
        run(gpp, flags);
        expect(run(exeFile, []).trim()).toBe("hello");
      }
    });
  }
});
