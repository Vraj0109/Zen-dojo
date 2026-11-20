---
id: c-cf-148a
pattern: cses-codeforces
difficulty: easy
optimal: "O(d) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? Four integers `k`, `l`, `m`, `n` denoting attack intervals/multiples, and an integer `d` representing the total number of dragons (numbered 1 to `d`).
- What makes a dragon damaged? A dragon numbered `i` is damaged if `i` is divisible by at least one of `k`, `l`, `m`, or `n`.
- What is the output? The total number of damaged dragons between 1 and `d`.
- What are the constraints? `1 <= k, l, m, n <= 10` and `1 <= d <= 10^5`.

## Examples to say out loud
- Consider `k = 1, l = 2, m = 3, n = 4, d = 12`: Since `k = 1`, every single integer from 1 to 12 is divisible by 1. Therefore, all 12 dragons are damaged.
- Consider `k = 2, l = 3, m = 4, n = 5, d = 24`:
  - Every multiple of 2, 3, 4, or 5 is counted.
  - The undamaged dragons in 1..24 are those coprime to 2, 3, 5: namely 1, 7, 11, 13, 17, 19, 23 (7 dragons).
  - Damaged dragons: `24 - 7 = 17`.

## Brute force
Since `d <= 10^5`, we can simply iterate an integer `i` from 1 to `d` and check if `i % k == 0 || i % l == 0 || i % m == 0 || i % n == 0`. This loop does at most 10^5 iterations, each taking O(1) time. This is already extremely fast and easily passes the 2-second time limit.

## The key observation
A dragon `i` suffers damage if `i` is a multiple of any of the four numbers. Alternatively, one could use the Principle of Inclusion-Exclusion (PIE) to solve it in O(1) mathematical time using LCMs of subsets. However, with `d <= 10^5`, direct simulation in O(d) is trivial, completely avoids integer overflow issues, and requires minimal code.

## Optimal approach
1. Initialize `damaged = 0`.
2. Iterate `i` from 1 to `d`.
3. If `i % k == 0` or `i % l == 0` or `i % m == 0` or `i % n == 0`, increment `damaged`.
4. Return `damaged`.

Complexity:
- Time complexity: O(d) operations, which takes ~1 ms for `d = 10^5`. If `d` were up to 10^18, we would use Inclusion-Exclusion in O(2^4) = O(1) time.
- Space complexity: O(1) auxiliary space as we only keep a counter.

## Code walkthrough
- `int count = 0`: Running tally of damaged dragons.
- `for (int i = 1; i <= d; i++)`: Checks each dragon from 1 to `d`.
- `if (i % k == 0 || i % l == 0 || i % m == 0 || i % n == 0) count++`: Tests divisibility by any of the four attackers.
- `return count`: Final count of affected dragons.

## Test it out loud
- `k=1, l=2, m=3, n=4, d=12`: Every number divides 1, count reaches 12. Correct.
- `k=2, l=3, m=4, n=5, d=24`: Count of numbers divisible by 2, 3, or 5 in 1..24 is 17. Correct.
- `d = 1, k = 2, l = 3, m = 4, n = 5`: 1 is not divisible by any, count is 0. Correct.

## Follow-ups
- How would you solve this if `d <= 10^18`? Direct iteration would TLE. We would use the Principle of Inclusion-Exclusion over the 2^4 - 1 non-empty subsets of `{k, l, m, n}`, adding `floor(d / LCM(subset))` for odd subset sizes and subtracting for even subset sizes.

## Common mistakes
- Double-counting dragons divisible by more than one factor if implemented as `(d/k) + (d/l) + ...` without inclusion-exclusion.
- Off-by-one errors starting from 0 instead of 1.
