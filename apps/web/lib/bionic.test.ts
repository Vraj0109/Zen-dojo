import { describe, expect, it } from "vitest";
import { leadLength, splitText } from "./bionic";

describe("leadLength", () => {
  it("strong: one letter of short words and about 45% of long ones", () => {
    expect([1, 2, 3, 4, 5, 8, 10].map((n) => leadLength(n, "strong"))).toEqual([1, 1, 1, 2, 3, 4, 5]);
    expect(leadLength(0, "strong")).toBe(0);
  });

  it("subtle: short words are left alone and long ones get under a third", () => {
    expect([1, 2, 3, 4, 5, 6, 8, 10, 14].map((n) => leadLength(n, "subtle"))).toEqual([0, 0, 0, 1, 2, 2, 2, 3, 4]);
  });
});

describe("splitText", () => {
  it("strong bolds the start of every word and keeps everything else", () => {
    expect(splitText("Reading is easy", "strong")).toEqual([
      { text: "Read", bold: true },
      { text: "ing", bold: false },
      { text: " ", bold: false },
      { text: "i", bold: true },
      { text: "s", bold: false },
      { text: " ", bold: false },
      { text: "ea", bold: true },
      { text: "sy", bold: false },
    ]);
  });

  it("subtle leaves short words completely plain and bolds only a short start of longer ones", () => {
    const pieces = splitText("It is easy to read", "subtle");
    expect(pieces.map((p) => p.text).join("")).toBe("It is easy to read");
    expect(pieces.filter((p) => p.bold).map((p) => p.text)).toEqual(["e", "r"]);
  });

  it("leaves numbers and punctuation alone and keeps hyphenated words and apostrophes together", () => {
    const pieces = splitText("O(n log n), don't re-run 2024!", "strong");
    expect(pieces.map((p) => p.text).join("")).toBe("O(n log n), don't re-run 2024!");
    expect(pieces.filter((p) => p.bold).map((p) => p.text)).toEqual(["O", "n", "l", "n", "don", "re-"]);
    expect(pieces.some((p) => p.text.includes("2024") && !p.bold)).toBe(true);
  });

  it("always joins back to the original text, in both strengths", () => {
    for (const level of ["subtle", "strong"] as const) {
      for (const t of ["", "  ", "naïve café — über", "a-b c_d", "x\ny", "A longer sentence, with punctuation."]) {
        expect(splitText(t, level).map((p) => p.text).join("")).toBe(t);
      }
    }
  });
});
