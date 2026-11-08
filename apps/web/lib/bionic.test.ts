import { describe, expect, it } from "vitest";
import { leadLength, splitText } from "./bionic";

describe("leadLength", () => {
  it("bolds one letter of short words and about 45% of long ones", () => {
    expect([1, 2, 3, 4, 5, 8, 10].map(leadLength)).toEqual([1, 1, 1, 2, 3, 4, 5]);
    expect(leadLength(0)).toBe(0);
  });
});

describe("splitText", () => {
  it("bolds the start of every word and keeps everything else", () => {
    expect(splitText("Reading is easy")).toEqual([
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

  it("leaves numbers and punctuation alone and keeps hyphenated words and apostrophes together", () => {
    const pieces = splitText("O(n log n), don't re-run 2024!");
    expect(pieces.map((p) => p.text).join("")).toBe("O(n log n), don't re-run 2024!");
    expect(pieces.filter((p) => p.bold).map((p) => p.text)).toEqual(["O", "n", "l", "n", "don", "re-"]);
    expect(pieces.some((p) => p.text.includes("2024") && !p.bold)).toBe(true);
  });

  it("always joins back to the original text, including accents and empty input", () => {
    for (const t of ["", "  ", "naïve café — über", "a-b c_d", "x\ny"]) expect(splitText(t).map((p) => p.text).join("")).toBe(t);
  });
});
