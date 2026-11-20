---
id: c-kattis-cold
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? An integer `n` denoting the number of temperature measurements, followed by `n` space-separated integers `t_1, t_2, ..., t_n`.
- What are we asked to compute? The number of temperatures that are strictly less than zero (`t_i < 0`).
- What are the constraints? `1 <= n <= 100`, and each temperature `t_i` is between `-10^6` and `10^6`.
- Is zero considered negative? No, zero is non-negative; only values strictly less than zero count.

## Examples to say out loud
- Consider `n = 3` and temperatures: `[5, -10, 15]`:
  - 5 is not < 0.
  - -10 is < 0 (count = 1).
  - 15 is not < 0.
  - Output is 1.
- Consider `n = 5` and temperatures: `[-14, -5, -39, -5, -7]`:
  - All 5 numbers are negative. Output is 5.
- Edge case: Temperatures `[0, 0, 0]`: Count is 0.

## Brute force
A single linear pass over the `n` temperature values inspecting whether each value is negative is already minimal. Since every element must be read to determine its sign, no faster approach is possible.

## The key observation
We only need to maintain a running integer counter. As we read each of the `n` temperatures, if the value is negative (`val < 0`), we increment the counter.

## Optimal approach
1. Read integer `n`.
2. Initialize `count = 0`.
3. For `i` from 1 to `n`:
   - Read temperature `val`.
   - If `val < 0`, increment `count`.
4. Output `count`.

Complexity:
- Time complexity: O(n) because each of the `n` numbers is read and compared once in O(1) time.
- Space complexity: O(1) auxiliary space as each number can be processed on the fly without storing an array.

## Code walkthrough
- `int count = 0`: Running tally of sub-zero temperatures.
- `while (n--)`: Processes all `n` input readings.
- `int temp; cin >> temp;`: Reads the current temperature.
- `if (temp < 0) count++`: Increments count if strictly negative.
- `cout << count`: Prints total negative count.

## Test it out loud
- `n = 3, [5, -10, 15]`: Only `-10` is negative. Count = 1. Correct.
- `n = 2, [0, -1]`: `0` is ignored, `-1` increments count. Count = 1. Correct.
- `n = 1, [100]`: No negatives. Count = 0. Correct.

## Follow-ups
- How to parallelize or vectorize this for millions of sensor inputs? Using SIMD intrinsics (e.g. AVX2), we can load 8 integers at a time, apply a signed comparison mask against zero, and use `_mm256_movemask_epi8` to accumulate counts in parallel.

## Common mistakes
- Counting `temp <= 0` instead of `temp < 0`, incorrectly including freezing temperature (0 degrees).
