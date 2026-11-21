---
id: c-kattis-zamka
pattern: cses-kattis
difficulty: easy
optimal: "O(D - L) time and O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Three integers `L`, `D`, and `X`.
  - `L`: lower bound of range (`1 <= L <= 10000`).
  - `D`: upper bound of range (`L <= D <= 10000`).
  - `X`: target sum of digits (`1 <= X <= 36`).
- What should be computed?
  - `N`: the minimal integer such that `L <= N <= D` and the sum of its digits equals `X`.
  - `M`: the maximal integer such that `L <= M <= D` and the sum of its digits equals `X`.
- What is the output format? Output `N` on the first line and `M` on the second line.
- Is a solution guaranteed to exist? Yes, problem guarantees at least one such integer exists.

## Examples to say out loud
- Consider `L = 1, D = 100, X = 4`:
  - Smallest integer with digit sum 4 in `[1, 100]` is `4` (since `4 <= 4 <= 100` and digit sum is 4).
  - Largest integer with digit sum 4 in `[1, 100]` is `40` (since `4 + 0 = 4`).
  - Output: `4` then `40`.
- Consider `L = 100, D = 500, X = 12`:
  - Search from `L` upwards: `129` has sum `1 + 2 + 9 = 12`.
  - Search from `D` downwards: `480` has sum `4 + 8 + 0 = 12`.
  - Output: `129` then `480`.

## Brute force
Since `D <= 10000`, the search space has at most 10,000 numbers. Computing the digit sum of a number <= 10000 takes at most 5 operations. Iterating through the range from `L` to `D` to find `N` and from `D` down to `L` to find `M` takes at most ~50,000 operations, which runs in well under 1 millisecond.

## The key observation
To find the minimum `N`, we can iterate from `L` to `D` and return the first number whose digit sum equals `X`.
To find the maximum `M`, we can iterate from `D` down to `L` and return the first number whose digit sum equals `X`.
Since the constraints are so small (`D <= 10000`), linear scan in both directions is optimal in practice and requires no complex dynamic programming.

## Optimal approach
1. Define a helper function `sum_digits(num)` that sums the base-10 digits of `num`.
2. For `N`: Loop `i` from `L` up to `D`. When `sum_digits(i) == X`, set `N = i` and break.
3. For `M`: Loop `i` from `D` down to `L`. When `sum_digits(i) == X`, set `M = i` and break.
4. Print `N`, then print `M`.

Complexity:
- Time complexity: O((D - L) * log10(D)), which is at most 10^4 * 5 = 5 * 10^4 operations (practically instant).
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `int sum_digits(int n)`: While `n > 0`, adds `n % 10` to sum and sets `n /= 10`.
- `for (int i = L; i <= D; i++)`: Finds the earliest match for minimum `N`.
- `for (int i = D; i >= L; i--)`: Finds the latest match for maximum `M`.
- `cout << N << "\n" << M << "\n"`: Emits results on separate lines.

## Test it out loud
- `L = 1, D = 100, X = 4`:
  - Upward search finds `4`. `N = 4`.
  - Downward search finds `40`. `M = 40`. Correct.
- `L = 10, D = 15, X = 3`: Upward search checks 10 (sum 1), 11 (2), 12 (3) -> `N = 12`. Downward search checks 15 (6), 14 (5), 13 (4), 12 (3) -> `M = 12`. Correct.

## Follow-ups
- How to solve this if `D <= 10^18`? Direct iteration would be too slow. We would use Digit Dynamic Programming to construct the lexicographically smallest and largest digits that sum to `X`.

## Common mistakes
- Printing `M` first and `N` second (the problem requires minimal `N` first, maximal `M` second).
- Resetting digit sum calculation incorrectly inside the loop.
