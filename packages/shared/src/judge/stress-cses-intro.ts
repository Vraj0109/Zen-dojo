import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES introductory problems (problems-cses-intro.ts). Fixed seeds, the biggest allowed sizes and the
// shapes that break slow or careless code.

const { ints, fill, letters, S } = H;

const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const STRESS_CSES_INTRO: Record<string, StressCase[]> = {
  "cses-palindrome-reorder": [S("100000 random letters", () => [letters(100000, caps, 2001)]), S("100000 times one letter", () => ["Q".repeat(100000)]), S("a palindrome made of 26 letters", () => [letters(50000, caps, 2002) + "M" + [...letters(50000, caps, 2002)].reverse().join("")]), S("two odd counts (no solution)", () => ["A".repeat(50001) + "B".repeat(49999)])],
  "cses-creating-strings": [S("8 different letters (40320 strings)", () => ["abcdefgh"]), S("8 letters with repeats", () => ["aabbccdd"]), S("8 equal letters", () => ["zzzzzzzz"])],
  "cses-apple-division": [S("20 random weights", () => [ints(20, 1, 1000000000, 2011)]), S("20 equal weights", () => [fill(20, 1000000000)]), S("20 weights 1 to 20", () => [Array.from({ length: 20 }, (_, i) => i + 1)]), S("one huge, rest tiny", () => [[1000000000, ...fill(19, 1)]])],
  "cses-chessboard-and-queens": [S("empty board", () => [fill(8, "........")]), S("scattered blocks", () => [["*.......", "..*.....", "....*...", "......*.", ".*......", "...*....", ".....*..", ".......*"]])],
  "cses-digit-queries": [S("the largest k", () => ["1000000000000000000"]), S("just before a group boundary", () => ["888888888888888888"]), S("first digit of a big number", () => ["15000000000000001"])],
  "cses-gray-code": [S("n = 16 (65536 strings)", () => [16]), S("n = 15", () => [15])],
  "cses-tower-of-hanoi": [S("n = 16 (65535 moves)", () => [16]), S("n = 15", () => [15])],
  "cses-mex-grid-construction": [S("n = 100", () => [100]), S("n = 99", () => [99])],
  "cses-knight-moves-grid": [S("n = 1000", () => [1000]), S("n = 999", () => [999]), S("n = 5", () => [5])],
  "cses-string-reorder": [S("1000000 random letters", () => [letters(1000000, caps, 2021)]), S("500000 A and 500000 B", () => ["A".repeat(500000) + "B".repeat(500000)]), S("500001 A (impossible)", () => ["A".repeat(500001) + "B".repeat(499999)]), S("two letters, tight", () => ["B".repeat(500000) + "A".repeat(499999) + "C"])],
  "cses-grid-coloring-i": [S("500 by 500 of one letter", () => [fill(500, "A".repeat(500))]), S("500 by 500 random letters", () => [Array.from({ length: 500 }, (_, i) => letters(500, "ABCD", 2031 + i))]), S("500 by 500 checkerboard", () => [Array.from({ length: 500 }, (_, i) => "AB".repeat(250).slice(i % 2, (i % 2) + 500).padEnd(500, "A"))])],
  "cses-grid-path-description": [S("all question marks", () => ["?".repeat(48)], 5000), S("a few moves fixed", () => ["R" + "?".repeat(10) + "D" + "?".repeat(36)], 5000), S("the first rows fixed", () => ["RRRRRRDLLLLLLDRRRRRR" + "?".repeat(28)], 5000)],
};
