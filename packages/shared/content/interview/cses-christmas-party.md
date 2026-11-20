---
id: cses-christmas-party
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- What is a derangement? A permutation of `n` items such that no item appears in its original position.
- What if `n = 1`? With a single child, that child must receive their own gift, so there are 0 valid derangements.
- How large can `n` be? `1 <= n <= 1000000`.
- What modulus should we use? Modulo `10^9 + 7`.

## Examples to say out loud
- Consider `n = 1`:
  - Child 1 must receive gift 1.
  - Derangements count: 0.
- Consider `n = 2`:
  - Child 1 gets gift 2, Child 2 gets gift 1.
  - Derangements count: 1.
- Consider `n = 3`:
  - Valid permutations: `(2, 3, 1)` and `(3, 1, 2)`.
  - Derangements count: 2.
- Consider `n = 4`:
  - Known derangement count `D_4 = 9`.

## Brute force
Generating all `n!` permutations and filtering for those where `perm[i] != i` takes `O(n * n!)` time. For `n = 10^6`, this is computationally impossible. We need the recurrence relation for derangements.

## The key observation
Let `D_n` be the number of derangements of `n` elements.
Consider child 1:
- Child 1 can receive any of the other `n - 1` gifts (say gift `k`).
Now consider who receives gift 1:
- Case 1: Child `k` receives gift 1. Children 1 and `k` swap gifts. The remaining `n - 2` children must form a derangement among themselves: `D_{n - 2}` ways.
- Case 2: Child `k` does NOT receive gift 1. Now child `k` is forbidden from receiving gift 1. This is structurally equivalent to a derangement of the remaining `n - 1` elements: `D_{n - 1}` ways.
Summing both disjoint cases across all `n - 1` choices for `k` gives the standard recurrence:
`D_n = (n - 1) * (D_{n - 1} + D_{n - 2}) mod (10^9 + 7)`.

## Optimal approach
1. Handle base cases:
   - If `n <= 1`, return 0.
   - If `n == 2`, return 1.
2. Maintain two state variables: `prev2 = 0` (for `D_1`) and `prev1 = 1` (for `D_2`).
3. Loop `i` from 3 up to `n`:
   - Compute `cur = ((long long)(i - 1) * (prev1 + prev2)) % 1000000007`.
   - Update `prev2 = prev1`.
   - Update `prev1 = cur`.
4. Return `prev1` as an integer.

Complexity:
- Time: `O(n)` time since we perform a single linear loop with constant operations per step.
- Space: `O(1)` auxiliary space using two scalar rolling variables.

## Code walkthrough
- `if (n <= 1) return 0;` and `if (n == 2) return 1;` quickly resolve the smallest inputs.
- `long long prev2 = 0;` corresponds to `D_1 = 0`.
- `long long prev1 = 1;` corresponds to `D_2 = 1`.
- In loop `for (int i = 3; i <= n; i++)`:
  - Multiplies `(i - 1)` with `(prev1 + prev2)` under modulo `10^9 + 7`.
  - Shifts `prev2 = prev1` and `prev1 = cur` to maintain only the two most recent values.
- `return (int)prev1;` produces the final answer `D_n`.

## Test it out loud
- Test `n = 1`: `n <= 1` returns 0.
- Test `n = 2`: `n == 2` returns 1.
- Test `n = 3`: `cur = (3 - 1) * (1 + 0) = 2 * 1 = 2`.
- Test `n = 4`: `cur = (4 - 1) * (2 + 1) = 3 * 3 = 9`.
- Test `n = 5`: `cur = (5 - 1) * (9 + 2) = 4 * 11 = 44`.
- Test `n = 6`: `cur = (6 - 1) * (44 + 9) = 5 * 53 = 265`. All match expected counts.

## Follow-ups
- Can we express `D_n` non-recursively?
  - Yes: `D_n = n! * sum_{k=0}^n (-1)^k / k!`. As `n -> infinity`, `D_n / n! ≈ 1 / e`.
- What if some specific subset of children are allowed to receive their own gifts?
  - Use general inclusion-exclusion with binomial coefficients: choose `k` fixed points in `binom(n, k)` ways and multiply by `D_{n - k}`.

## Common mistakes
- Not taking modulo at each step of the recurrence, leading to integer overflow beyond 64-bit limits.
- Storing all values in an array of size `n` when only the two previous states are needed, wasting `O(n)` memory.
