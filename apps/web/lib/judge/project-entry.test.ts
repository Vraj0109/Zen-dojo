import { describe, expect, it } from "vitest";
import { addMainMethod, hasMainMethod, mainClasses, packageName, pickEntry, starterMain } from "./project-entry";

const MAIN = "public static void main(String[] args) { }";
const file = (name: string, body: string, pkg = "") => ({
  name,
  content: `${pkg ? `package ${pkg};\n\n` : ""}public class ${name.replace(/\.java$/, "")} {\n    ${body}\n}\n`,
});

describe("hasMainMethod", () => {
  it("finds the usual forms of main", () => {
    expect(hasMainMethod(`class A { ${MAIN} }`)).toBe(true);
    expect(hasMainMethod("class A { static public void main(final String... a) {} }")).toBe(true);
    expect(hasMainMethod("class A { public static void main(String args[]) {} }")).toBe(true);
  });

  it("ignores main in comments and strings, and other methods called main", () => {
    expect(hasMainMethod(`class A { // ${MAIN}\n }`)).toBe(false);
    expect(hasMainMethod(`class A { /* ${MAIN} */ }`)).toBe(false);
    expect(hasMainMethod(`class A { String s = "${MAIN}"; }`)).toBe(false);
    expect(hasMainMethod("class A { public void main(String[] args) {} }")).toBe(false);
    expect(hasMainMethod("class A { static void main(int x) {} }")).toBe(false);
  });
});

describe("packageName and mainClasses", () => {
  it("qualifies classes by their package", () => {
    expect(packageName("// x\npackage demo.model;\nclass A {}")).toBe("demo.model");
    expect(packageName("class A {}")).toBe("");
    const found = mainClasses([file("Runner.java", MAIN, "demo"), file("User.java", "int id;")]);
    expect(found).toEqual([{ file: "Runner.java", className: "Runner", qualified: "demo.Runner" }]);
  });
});

describe("pickEntry", () => {
  const user = file("User.java", "int id;");
  const lot = file("ParkingLot.java", MAIN, "lot");
  const demo = file("Demo.java", MAIN);
  const main = file("Main.java", MAIN);

  it("Run file runs the open class when it has main", () => {
    expect(pickEntry({ files: [user, lot], active: "ParkingLot.java", mode: "file" })).toMatchObject({ ok: true, qualified: "lot.ParkingLot" });
  });

  it("Run file explains when the open class has no main", () => {
    expect(pickEntry({ files: [user, lot], active: "User.java", mode: "file" })).toMatchObject({ ok: false, reason: "no-main-in-file", file: "User.java" });
  });

  it("Run project prefers Main, then the only class with main", () => {
    expect(pickEntry({ files: [lot, main, demo], active: "User.java", mode: "project" })).toMatchObject({ ok: true, qualified: "Main" });
    expect(pickEntry({ files: [user, lot], active: "User.java", mode: "project" })).toMatchObject({ ok: true, qualified: "lot.ParkingLot" });
  });

  it("Run project reports a project with no main (the System design case)", () => {
    expect(pickEntry({ files: [user, file("Cache.java", "int size;")], active: "User.java", mode: "project" })).toEqual({
      ok: false,
      reason: "no-main",
      candidates: [],
    });
  });

  it("Run project asks to choose between several, then uses the remembered choice", () => {
    const choice = pickEntry({ files: [lot, demo], active: "Demo.java", mode: "project" });
    expect(choice).toMatchObject({ ok: false, reason: "choose" });
    expect(choice.ok ? [] : choice.candidates.map((c) => c.qualified)).toEqual(["lot.ParkingLot", "Demo"]);
    expect(pickEntry({ files: [lot, demo], active: "Demo.java", mode: "project", remembered: "lot.ParkingLot" })).toMatchObject({
      ok: true,
      qualified: "lot.ParkingLot",
    });
    // A remembered class that lost its main is ignored.
    expect(pickEntry({ files: [lot, demo], active: "Demo.java", mode: "project", remembered: "Gone" })).toMatchObject({ reason: "choose" });
  });
});

describe("addMainMethod", () => {
  it("inserts a main inside the class and returns the body line", () => {
    const code = "package demo;\n\n/** A user. */\npublic class User extends Base<String> implements Runnable {\n    int id;\n}\n";
    const added = addMainMethod(code, "User");
    expect(added).not.toBeNull();
    expect(hasMainMethod(added!.code)).toBe(true);
    const lines = added!.code.split("\n");
    expect(lines[added!.line - 2].trim()).toBe("public static void main(String[] args) {");
    expect(lines[added!.line - 1].trim()).toBe("");
    expect(added!.code).toContain("    int id;\n}\n");
  });

  it("skips a record header and refuses enums or a missing class", () => {
    const rec = addMainMethod("public record Point(int x, int y) {\n}\n", "Point");
    expect(rec && hasMainMethod(rec.code)).toBe(true);
    expect(addMainMethod("public enum Color { RED, GREEN }\n", "Color")).toBeNull();
    expect(addMainMethod("public class Other {}\n", "User")).toBeNull();
  });

  it("starter Main has a main method", () => {
    expect(hasMainMethod(starterMain())).toBe(true);
  });
});
