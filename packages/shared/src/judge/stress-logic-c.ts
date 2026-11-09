import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the round six logic problems (problems-logic-c.ts): Project Euler and AtCoder. Fixed seeds, the biggest allowed sizes and the shapes that break slow or careless code. The expected answers come from the C++ reference at run time.

const { ints, fill, range, letters, S } = H;

/** A triangle of `rows` rows with values 0..99 from a fixed linear congruential generator. */
function tri(rows: number, seed: number): number[][] {
  let s = seed;
  const t: number[][] = [];
  for (let i = 1; i <= rows; i++) {
    const r: number[] = [];
    for (let j = 0; j < i; j++) {
      s = (s * 1103515245 + 12345) % 2147483648;
      r.push(Math.floor(s / 65536) % 100);
    }
    t.push(r);
  }
  return t;
}

export const STRESS_LOGIC_C: Record<string, StressCase[]> = {
  "c-euler-18": [S("1000 rows of random values", () => [tri(1000, 7801)]), S("1000 rows of 99", () => [tri(1000, 7802).map((r) => r.map(() => 99))]), S("1000 rows of zeros", () => [tri(1000, 7803).map((r) => r.map(() => 0))])],
  "c-euler-20": [S("n = 3000", () => [3000]), S("n = 2999", () => [2999]), S("n = 1500", () => [1500])],
  "c-euler-23": [S("limit 10^9", () => [1000000000]), S("limit 28123", () => [28123]), S("limit 28122", () => [28122])],
  "c-euler-25": [S("d = 2000", () => [2000]), S("d = 1999", () => [1999]), S("d = 1000", () => [1000])],
  "c-euler-27": [S("2000 and 2000", () => [2000, 2000], 4000), S("1000 and 1000", () => [1000, 1000], 4000), S("2000 and 500", () => [2000, 500], 4000)],
  "c-euler-30": [S("p = 7", () => [7], 4000), S("p = 6", () => [6]), S("p = 5", () => [5])],
  "c-euler-34": [S("limit 10^9", () => [1000000000]), S("limit 3000000", () => [3000000]), S("limit 10^6", () => [1000000])],
  "c-euler-36": [S("limit 10^9, base 2", () => [1000000000, 2]), S("limit 10^9, base 16", () => [1000000000, 16]), S("limit 10^9, base 10", () => [1000000000, 10])],
  "c-euler-37": [S("limit 10^7", () => [10000000]), S("limit 9999999", () => [9999999])],
  "c-euler-39": [S("maxP = 5000000", () => [5000000]), S("maxP = 4999999", () => [4999999]), S("maxP = 2000000", () => [2000000])],
  "c-euler-40": [S("k = 10^15", () => [1000000000000000]), S("k near the end of a group", () => [488888888888889]), S("k = 10^12", () => [1000000000000])],
  "c-euler-41": [S("n = 9", () => [9]), S("n = 8", () => [8]), S("n = 7", () => [7]), S("n = 4", () => [4])],
  "c-euler-45": [S("the largest allowed start", () => [999999999999]), S("a start just past a hit", () => [1533776805])],
  "c-euler-47": [S("k = 4, count = 4", () => [4, 4], 3000), S("k = 4, count = 3", () => [4, 3], 3000), S("k = 3, count = 4", () => [3, 4], 3000)],
  "c-euler-52": [S("k = 6", () => [6]), S("k = 5", () => [5]), S("k = 2", () => [2])],
  "c-euler-53": [S("maxN = 5000, threshold 10^15", () => [5000, 1000000000000000], 3000), S("maxN = 5000, threshold 1", () => [5000, 1], 3000), S("maxN = 4999, threshold 10^9", () => [4999, 1000000000], 3000)],
  "c-euler-55": [S("limit 100000, 60 iterations", () => [100000, 60], 4000), S("limit 99999, 60 iterations", () => [99999, 60], 4000), S("limit 100000, 1 iteration", () => [100000, 1])],
  "c-euler-58": [S("percent 8", () => [8], 4000), S("percent 9", () => [9]), S("percent 10", () => [10])],
  "c-euler-92": [S("limit 10^8", () => [100000000]), S("limit 99999999", () => [99999999]), S("limit 50000000", () => [50000000])],
  "c-euler-97": [S("e = 10^15, k = 15", () => [1000000000, 1000000000000000, 15]), S("e = 10^15 - 1, k = 12", () => [999999937, 999999999999999, 12])],
  "abc151-a": [S("the last allowed letter", () => ["y"])],
  "abc153-a": [S("the biggest numbers", () => [10000, 1])],
  "abc154-a": [S("longest words", () => ["abcdefghij", "abcdefghik", 100, 100, "abcdefghik"])],
  "abc155-a": [S("all equal", () => [100, 100, 100])],
  "abc156-a": [S("a new player", () => [1, 4111])],
  "abc157-a": [S("n = 100", () => [100])],
  "abc158-a": [S("a mixed string", () => ["ABB"])],
  "abc159-a": [S("the largest counts", () => [100, 100])],
  "abc160-a": [S("all letters equal", () => ["zzzzzz"])],
  "abc161-a": [S("three values", () => [100, 50, 1])],
  "abc162-a": [S("a number with a 7 at the end", () => [997])],
  "abc163-b": [S("10000 big pieces", () => [1000000, fill(10000, 10000)]), S("10000 small pieces", () => [1000000, ints(10000, 1, 10, 7901)])],
  "abc165-b": [S("x = 9 * 10^15", () => [9000000000000000]), S("x = 10^9", () => [1000000000])],
  "abc169-b": [S("100000 ones", () => [fill(100000, 1)]), S("100000 numbers with a zero at the end", () => [[...fill(99999, 1000000000000000), 0]]), S("100000 twos", () => [fill(100000, 2)])],
  "abc171-b": [S("1000 random prices", () => [500, ints(1000, 1, 1000, 7911)]), S("1000 prices of 1000, k = n", () => [1000, fill(1000, 1000)])],
  "abc172-b": [S("200000 random letters", () => [letters(200000, "abcdefghijklmnopqrstuvwxyz", 7921), letters(200000, "abcdefghijklmnopqrstuvwxyz", 7922)]), S("200000 equal letters", () => ["a".repeat(200000), "a".repeat(200000)])],
  "abc175-b": [S("100 random lengths", () => [ints(100, 1, 1000000000, 7931)]), S("100 different lengths", () => [range(100, 1)]), S("100 equal lengths", () => [fill(100, 7)])],
  "abc177-b": [S("1000 letters, t of 500", () => [letters(1000, "ab", 7941), letters(500, "ab", 7942)]), S("1000 equal letters, t of 1000", () => ["a".repeat(1000), "b".repeat(1000)])],
  "abc163-c": [S("200000 employees in a chain", () => [range(199999, 1)]), S("200000 employees under the boss", () => [fill(199999, 1)])],
  "abc164-c": [S("200000 random short names", () => [Array.from({ length: 200000 }, (_, i) => letters(5, "abcdefghij", 8000 + i))], 3000), S("200000 equal names", () => [fill(200000, "abcdefghij")])],
};
