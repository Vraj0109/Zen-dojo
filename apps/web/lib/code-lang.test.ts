import { describe, expect, it } from "vitest";
import { guessLang, toLang } from "./code-lang";

describe("toLang", () => {
  it("maps LeetCode and picker names", () => {
    expect(toLang("C++")).toBe("cpp");
    expect(toLang("Java")).toBe("java");
    expect(toLang("Python3")).toBe("python");
    expect(toLang("Python")).toBe("python");
    expect(toLang("JavaScript")).toBe("javascript");
    expect(toLang("TypeScript")).toBe("typescript");
    expect(toLang("MySQL")).toBe("sql");
    expect(toLang("C#")).toBe("csharp");
    expect(toLang("Go")).toBe("go");
    expect(toLang("Kotlin")).toBe("kotlin");
    expect(toLang("Rust")).toBe("rust");
    expect(toLang("Swift")).toBe("swift");
  });
  it("is case and space tolerant, and unknown names are text", () => {
    expect(toLang("  c++ ")).toBe("cpp");
    expect(toLang("Other")).toBe("text");
    expect(toLang("Unknown")).toBe("text");
    expect(toLang("")).toBe("text");
    expect(toLang(undefined)).toBe("text");
  });
});

describe("guessLang", () => {
  it("recognises one sample per language", () => {
    expect(guessLang("#include <vector>\nint main() {}")).toBe("cpp");
    expect(guessLang("vector<int> a;")).toBe("cpp");
    expect(guessLang("public class Foo { public void run() {} }")).toBe("java");
    expect(guessLang("SELECT id FROM users;")).toBe("sql");
    expect(guessLang("CREATE TABLE t (id INT);")).toBe("sql");
    expect(guessLang("def solve(a):\n    return a")).toBe("python");
    expect(guessLang("func main() {}")).toBe("go");
    expect(guessLang("fn main() { let mut x = 1; }")).toBe("rust");
    expect(guessLang("const f = (a) => a + 1;")).toBe("javascript");
    expect(guessLang('{ "a": 1 }')).toBe("json");
  });
  it("falls back to text for prose and pseudo-code", () => {
    expect(guessLang("1. Pick a pivot\n2. Partition")).toBe("text");
    expect(guessLang("")).toBe("text");
  });
});

describe("the judge language labels", () => {
  it("every judge language label maps to an editor language (Python included)", async () => {
    const { JUDGE_LANG_LABEL, JUDGE_LANGS } = await import("@habit/shared");
    for (const l of JUDGE_LANGS) expect(toLang(JUDGE_LANG_LABEL[l]), l).toBe(l);
  });
});
