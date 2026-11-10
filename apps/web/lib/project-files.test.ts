import { describe, expect, it } from "vitest";
import { MAX_FILES, MAX_TOTAL_BYTES, emptyProject, isEmptyProject, parseProjectCode, serializeProject, validateProject } from "./project-files";

const file = (name: string, content = "class A {}") => ({ name, content });

describe("project files", () => {
  it("round-trips through serialize and parse", () => {
    const files = [file("Main.java", "public class Main {}"), file("Order_2.java", "class Order {}\n// é")];
    expect(serializeProject(files)).toBe(JSON.stringify({ v: 1, files }));
    expect(parseProjectCode(serializeProject(files), "java-project")).toEqual(files);
  });

  it("opens legacy plain text as one Main.java", () => {
    expect(parseProjectCode("class Foo {}", "Java")).toEqual([{ name: "Main.java", content: "class Foo {}" }]);
    expect(parseProjectCode("class Foo {}", "")).toEqual([{ name: "Main.java", content: "class Foo {}" }]);
  });

  it("opens empty legacy text as the stub", () => {
    expect(parseProjectCode("  \n", "")).toEqual(emptyProject());
  });

  it("falls back to the stub on bad or odd JSON and never throws", () => {
    for (const bad of ["", "not json", "{", "null", "[]", '{"v":2,"files":[]}', '{"v":1,"files":[]}', '{"v":1,"files":[{"name":1}]}', '{"v":1}']) {
      expect(parseProjectCode(bad, "java-project")).toEqual(emptyProject());
    }
  });

  it("accepts a valid project", () => {
    expect(validateProject([file("Main.java"), file("Order.java")])).toEqual({ ok: true });
    expect(validateProject(emptyProject())).toEqual({ ok: true });
  });

  it("rejects illegal names", () => {
    for (const name of ["main.txt", "1Main.java", "Ma in.java", "../Evil.java", "Main", ".java", `${"A".repeat(65)}.java`, "Näme.java"]) {
      const r = validateProject([file(name)]);
      expect(r.ok, name).toBe(false);
    }
    expect(validateProject([file(`${"A".repeat(64)}.java`)])).toEqual({ ok: true });
  });

  it("rejects duplicate names", () => {
    const r = validateProject([file("A.java"), file("B.java"), file("A.java")]);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("A.java") });
  });

  it("allows 30 files and rejects 31", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => file(`C${i}.java`, "x"));
    expect(validateProject(many(MAX_FILES))).toEqual({ ok: true });
    const r = validateProject(many(MAX_FILES + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("30");
  });

  it("rejects no files", () => {
    expect(validateProject([]).ok).toBe(false);
  });

  it("rejects oversize totals, counting bytes", () => {
    expect(validateProject([file("A.java", "x".repeat(MAX_TOTAL_BYTES))])).toEqual({ ok: true });
    expect(validateProject([file("A.java", "x".repeat(MAX_TOTAL_BYTES)), file("B.java", "y")]).ok).toBe(false);
    expect(validateProject([file("A.java", "é".repeat(MAX_TOTAL_BYTES / 2 + 1))]).ok).toBe(false);
  });

  it("knows when a project is empty", () => {
    expect(isEmptyProject(emptyProject())).toBe(true);
    expect(isEmptyProject([file("Main.java", " ")])).toBe(true);
    expect(isEmptyProject([file("Main.java", "public class Main { public static void main(String[] args) { } }")])).toBe(true);
    expect(isEmptyProject([file("Main.java", "class Main { int x; }")])).toBe(false);
    expect(isEmptyProject([...emptyProject(), file("Order.java")])).toBe(false);
  });
});
