import { describe, expect, it } from "vitest";
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  type ProjectFile,
  emptyProject,
  isEmptyProject,
  parseProjectCode,
  serializeProject,
  validateProject,
} from "@/lib/project-files";

describe("LLD classes multi-file project logic", () => {
  describe("parseProjectCode", () => {
    it("parses valid JSON when language is java-project", () => {
      const json = JSON.stringify({
        v: 1,
        files: [{ name: "Order.java", content: "public class Order {}" }],
      });
      const parsed = parseProjectCode(json, "java-project");
      expect(parsed).toEqual([
        { name: "Order.java", content: "public class Order {}" },
      ]);
    });

    it("opens legacy non-JSON code as a single Main.java file", () => {
      const javaCode = "public class Solution { int solve() { return 1; } }";
      expect(parseProjectCode(javaCode, "Java")).toEqual([
        { name: "Main.java", content: javaCode },
      ]);

      const pythonCode = "def solve():\n    return 42";
      expect(parseProjectCode(pythonCode, "python")).toEqual([
        { name: "Main.java", content: pythonCode },
      ]);
    });

    it("returns emptyProject stub for empty or whitespace-only code", () => {
      expect(parseProjectCode("", "Java")).toEqual(emptyProject());
      expect(parseProjectCode("   \n\t  ", "Java")).toEqual(emptyProject());
      expect(parseProjectCode("", "java-project")).toEqual(emptyProject());
      expect(parseProjectCode("   ", "java-project")).toEqual(emptyProject());
    });

    it("gracefully falls back to emptyProject on malformed or corrupted JSON without throwing", () => {
      const corruptions = [
        "{ bad json",
        "{\"v\": 1, \"files\": [",
        "undefined",
        "NaN",
        "null",
        "12345",
        "true",
      ];
      for (const bad of corruptions) {
        expect(() => parseProjectCode(bad, "java-project")).not.toThrow();
        expect(parseProjectCode(bad, "java-project")).toEqual(emptyProject());
      }
    });

    it("falls back to emptyProject on invalid schema or structure", () => {
      const invalidStructures = [
        JSON.stringify({}),
        JSON.stringify({ v: 2, files: [{ name: "Main.java", content: "" }] }),
        JSON.stringify({ files: [{ name: "Main.java", content: "" }] }), // missing v: 1
        JSON.stringify({ v: 1 }), // missing files array
        JSON.stringify({ v: 1, files: "not-an-array" }),
        JSON.stringify({ v: 1, files: [] }), // empty files array
        JSON.stringify({ v: 1, files: [null] }),
        JSON.stringify({ v: 1, files: [{ name: 123, content: "test" }] }),
        JSON.stringify({ v: 1, files: [{ name: "Main.java", content: 456 }] }),
      ];
      for (const invalid of invalidStructures) {
        expect(parseProjectCode(invalid, "java-project")).toEqual(emptyProject());
      }
    });
  });

  describe("serializeProject", () => {
    it("produces expected JSON format with v: 1 and files array", () => {
      const files: ProjectFile[] = [
        { name: "Main.java", content: "public class Main {}" },
        { name: "User.java", content: "public class User {}" },
      ];
      const serialized = serializeProject(files);
      expect(serialized).toBe(
        JSON.stringify({
          v: 1,
          files: [
            { name: "Main.java", content: "public class Main {}" },
            { name: "User.java", content: "public class User {}" },
          ],
        }),
      );
    });

    it("round-trips through serialize and parse", () => {
      const files: ProjectFile[] = [
        { name: "Main.java", content: "public class Main { public static void main(String[] args) {} }" },
        { name: "Order.java", content: "public class Order { private String id; }" },
        { name: "Payment_Service.java", content: "class Payment_Service {} // unicode support: € £" },
      ];
      const serialized = serializeProject(files);
      const deserialized = parseProjectCode(serialized, "java-project");
      expect(deserialized).toEqual(files);
    });
  });

  describe("validateProject", () => {
    it("returns error when files list is empty", () => {
      const result = validateProject([]);
      expect(result).toEqual({ ok: false, error: "Add at least one Java file." });
    });

    it("returns error when file count exceeds MAX_FILES (30)", () => {
      const thirtyFiles: ProjectFile[] = Array.from({ length: MAX_FILES }, (_, i) => ({
        name: `File${i}.java`,
        content: `class File${i} {}`,
      }));
      expect(validateProject(thirtyFiles)).toEqual({ ok: true });

      const thirtyOneFiles: ProjectFile[] = [
        ...thirtyFiles,
        { name: "Extra.java", content: "class Extra {}" },
      ];
      const result = validateProject(thirtyOneFiles);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain(`${MAX_FILES}`);
      }
    });

    it("returns plain English error with file name on illegal file names", () => {
      const badNames = [
        "123.java", // starts with number
        "User.kt", // not java extension
        "My-Class.java", // hyphen not allowed
        "bad space.java", // whitespace
        "Order.Java", // uppercase extension
        "Main.cpp",
        "A".repeat(65) + ".java", // exceeds length limit
        ".java", // missing class name
        "Special$Class.java", // dollar sign
      ];

      for (const name of badNames) {
        const result = validateProject([{ name, content: "class Test {}" }]);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toContain(`"${name}"`);
          expect(result.error).toContain("is not a valid file name");
        }
      }
    });

    it("returns error when duplicate file names exist", () => {
      const files: ProjectFile[] = [
        { name: "Order.java", content: "class Order {}" },
        { name: "Item.java", content: "class Item {}" },
        { name: "Order.java", content: "class OrderDuplicate {}" },
      ];
      const result = validateProject(files);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Order.java");
        expect(result.error).toContain("There are two files named Order.java");
      }
    });

    it("returns error when total byte size exceeds MAX_TOTAL_BYTES (200 KB)", () => {
      const exactFit: ProjectFile[] = [
        { name: "Big.java", content: "a".repeat(MAX_TOTAL_BYTES) },
      ];
      expect(validateProject(exactFit)).toEqual({ ok: true });

      const slightlyOver: ProjectFile[] = [
        { name: "Big.java", content: "a".repeat(MAX_TOTAL_BYTES + 1) },
      ];
      const result = validateProject(slightlyOver);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("too large");
        expect(result.error).toContain("The limit is 200 KB in total");
      }

      // Multi-byte UTF-8 characters count by actual byte length
      const multiByteChars = "€".repeat(Math.floor(MAX_TOTAL_BYTES / 3) + 1); // 3 bytes per €
      const utf8Over = validateProject([{ name: "Utf8.java", content: multiByteChars }]);
      expect(utf8Over.ok).toBe(false);
    });

    it("returns ok: true for valid project file sets", () => {
      expect(validateProject(emptyProject())).toEqual({ ok: true });
      expect(
        validateProject([
          { name: "Main.java", content: "public class Main {}" },
          { name: "Order_Item.java", content: "public class Order_Item {}" },
          { name: "User123.java", content: "public class User123 {}" },
        ]),
      ).toEqual({ ok: true });
    });
  });

  describe("isEmptyProject", () => {
    it("returns true for fresh emptyProject stub", () => {
      expect(isEmptyProject(emptyProject())).toBe(true);
    });

    it("returns true for empty or whitespace-only file content", () => {
      expect(isEmptyProject([{ name: "Main.java", content: "" }])).toBe(true);
      expect(isEmptyProject([{ name: "Main.java", content: "   \n\t  " }])).toBe(true);
      expect(
        isEmptyProject([
          { name: "Main.java", content: "   " },
          { name: "Empty.java", content: "" },
        ]),
      ).toBe(true);
    });

    it("returns true when Main.java matches the stub even with varying whitespace", () => {
      const variedWhitespace =
        "public   class  Main  {\n  public   static void   main(String[] args) {\n  }\n}\n";
      expect(isEmptyProject([{ name: "Main.java", content: variedWhitespace }])).toBe(true);
    });

    it("returns false when user adds code to Main.java", () => {
      const modifiedMain: ProjectFile[] = [
        {
          name: "Main.java",
          content: "public class Main { public static void main(String[] args) { System.out.println(1); } }",
        },
      ];
      expect(isEmptyProject(modifiedMain)).toBe(false);
    });

    it("returns false when user adds additional classes with content", () => {
      const withExtraClass: ProjectFile[] = [
        ...emptyProject(),
        { name: "Order.java", content: "public class Order {}" },
      ];
      expect(isEmptyProject(withExtraClass)).toBe(false);
    });
  });

  describe("form logic and dirty state tracking", () => {
    it("correctly detects dirty unsaved changes by comparing serialized project JSON", () => {
      const initialFiles: ProjectFile[] = [
        { name: "Main.java", content: "public class Main {}" },
        { name: "Order.java", content: "public class Order {}" },
      ];
      const initialSerialized = serializeProject(initialFiles);

      // Same content (clean state)
      const identicalCopy: ProjectFile[] = [
        { name: "Main.java", content: "public class Main {}" },
        { name: "Order.java", content: "public class Order {}" },
      ];
      expect(serializeProject(identicalCopy)).toBe(initialSerialized);

      // Modified code content in one file (dirty)
      const modifiedContent: ProjectFile[] = [
        { name: "Main.java", content: "public class Main { int count; }" },
        { name: "Order.java", content: "public class Order {}" },
      ];
      expect(serializeProject(modifiedContent)).not.toBe(initialSerialized);

      // Adding a new class (dirty)
      const addedFile: ProjectFile[] = [
        ...initialFiles,
        { name: "User.java", content: "public class User {}" },
      ];
      expect(serializeProject(addedFile)).not.toBe(initialSerialized);

      // Removing a file (dirty)
      const removedFile: ProjectFile[] = [initialFiles[0]];
      expect(serializeProject(removedFile)).not.toBe(initialSerialized);

      // Renaming a file (dirty)
      const renamedFile: ProjectFile[] = [
        { name: "Main.java", content: "public class Main {}" },
        { name: "CustomerOrder.java", content: "public class Order {}" },
      ];
      expect(serializeProject(renamedFile)).not.toBe(initialSerialized);
    });

    it("supports upgrading legacy note: single Main.java -> add class -> serialize as java-project", () => {
      const legacyNote = "public class Solution { public int solve() { return 100; } }";
      const legacyLanguage = "Java";

      // 1. Load legacy note: opens as single Main.java
      const projectFiles = parseProjectCode(legacyNote, legacyLanguage);
      expect(projectFiles).toEqual([
        { name: "Main.java", content: legacyNote },
      ]);

      // 2. User modifies project by adding a new class
      const upgradedFiles: ProjectFile[] = [
        ...projectFiles,
        {
          name: "PaymentProcessor.java",
          content: "public class PaymentProcessor { public boolean process() { return true; } }",
        },
      ];

      // 3. Validate upgraded project files
      const validation = validateProject(upgradedFiles);
      expect(validation.ok).toBe(true);

      // 4. Serialize to java-project JSON
      const serialized = serializeProject(upgradedFiles);
      expect(typeof serialized).toBe("string");

      // 5. Subsequent load as java-project preserves all files
      const reloaded = parseProjectCode(serialized, "java-project");
      expect(reloaded).toEqual(upgradedFiles);
      expect(reloaded).toHaveLength(2);
      expect(reloaded[0].name).toBe("Main.java");
      expect(reloaded[1].name).toBe("PaymentProcessor.java");
    });
  });
});
