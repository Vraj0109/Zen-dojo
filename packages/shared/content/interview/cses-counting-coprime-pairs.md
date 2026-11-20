---
id: cses-counting-coprime-pairs
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(n + M log M) time, O(M) space where M = max(arr) <= 10^6"
reviewed: false
---

## Clarify first
- What constitutes a coprime pair? Two indices `i < j` such that `gcd(arr[i], arr[j]) == 1`.
- How large can `arr` and its elements be? `n <= 100000` and each element `arr[i] <= 1000000`.
- Can the array contain duplicates? Yes, multiple elements can share the same value.
- What return type is expected? A 64-bit integer representing the pair count, as `n * (n - 1) / 2` can reach `5 * 10^9`.

## Examples to say out loud
- Consider `arr = [2, 3, 5]`:
  - Pairs are `(2, 3)`, `(2, 5)`, and `(3, 5)`.
  - All 3 pairs have GCD 1. Output is 3.
- Consider `arr = [2, 4, 6]`:
  - All elements are even, so all pair GCDs are at least 2.
  - No pairs have GCD 1. Output is 0.
- Consider `arr = [1, 1, 1]`:
  - Every pair of 1s has `gcd(1, 1) = 1`.
  - Total pairs: `3 * 2 / 2 = 3`.

## Brute force
Checking `gcd(arr[i], arr[j])` for all `O(n^2)` pairs takes `O(n^2 log M)` time. For `n = 10^5`, `10^10` operations will severely exceed time limits. We need a sub-quadratic frequency-based approach.

## The key observation
By Möbius inversion:
For any positive integer `g`, the indicator `[g == 1]` can be expressed as `sum_{d | g} mu(d)`.
Summing over all pairs `(i, j)`:
`Total coprime pairs = sum_{d >= 1} mu(d) * (cnt[d] * (cnt[d] - 1) / 2)`,
where `cnt[d]` is the number of array elements divisible by `d`, and `mu(d)` is the Möbius function:
- `mu(1) = 1`
- `mu(d) = 0` if `d` has a squared prime factor
- `mu(d) = (-1)^k` if `d` is square-free with `k` distinct prime factors
We can precompute `mu` using a linear sieve and compute all `cnt[d]` efficiently using harmonic divisor iteration in `O(M log M)` time.

## Optimal approach
1. Let `M = max(arr)`. If `M < 1`, return 0.
2. Precompute the Möbius function `mu[1..M]` using a linear Euler sieve in `O(M)` time.
3. Count the frequency of each element in `arr` using an array `freq` of size `M + 1`.
4. Initialize `totalCoprime = 0`.
5. For each integer `d` from 1 to `M`:
   - If `mu[d] == 0`, continue.
   - Sum frequencies of multiples: `cnt = sum_{mult = d, mult += d}^{M} freq[mult]`.
   - Compute pairs divisible by `d`: `pairs = cnt * (cnt - 1) / 2`.
   - Add `mu[d] * pairs` to `totalCoprime`.
6. Return `totalCoprime`.

Complexity:
- Time: `O(n + M log M)` time where `M <= 10^6`, because the linear sieve takes `O(M)`, frequency counting takes `O(n)`, and iterating over multiples takes `sum_{d=1}^M M / d ≈ M ln M` operations.
- Space: `O(M)` auxiliary space for the sieve and frequency tables.

## Code walkthrough
- `vector<int> mu(maxVal + 1, 0);` and linear sieve populate Möbius values.
- `vector<int> freq(maxVal + 1, 0);` tabulates element occurrences in `arr`.
- Outer loop `for (int d = 1; d <= maxVal; d++)` iterates over divisors with non-zero Möbius coefficient.
- Inner loop `for (int mult = d; mult <= maxVal; mult += d)` aggregates counts of numbers containing factor `d`.
- `totalCoprime += (long long)mu[d] * pairs;` adds when `mu[d] == 1` and subtracts when `mu[d] == -1`.

## Test it out loud
- Test all even numbers `[2, 4, 6]`: `mu[1] * 3 - mu[2] * 3 = 3 - 3 = 0`. Returns 0.
- Test `[1, 1, 1]`: Only `d = 1` has count 3, returns 3.
- Test `[2, 3, 4, 5, 6]`: 10 total pairs. Non-coprime pairs sharing factors are `(2, 4), (2, 6), (4, 6), (3, 6)`. Total coprime pairs = `10 - 4 = 6`.
- Test `[6, 10, 15]`: Each pair shares a factor (2, 5, or 3). Output is 0.

## Follow-ups
- How to answer multiple dynamic updates to the array?
  - Prime factorize each inserted/removed element into square-free divisors and update frequency counts in `O(2^(omega(x)))`.
- Why does the harmonic series sum to `O(M log M)`?
  - Because `1 + 1/2 + 1/3 + ... + 1/M ≈ ln M`.

## Common mistakes
- Using 32-bit integers for `totalCoprime` or `pairs`, which overflows since the number of pairs can reach `5 * 10^9`.
- Running an `O(n^2)` pair GCD check instead of sieve-based frequency inversion.
