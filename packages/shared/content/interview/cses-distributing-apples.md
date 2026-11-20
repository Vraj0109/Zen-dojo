---
id: cses-distributing-apples
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(n + m) time, O(n + m) space"
reviewed: false
---

## Clarify first
- Are the apples identical or distinct? Apples are indistinguishable.
- Are the children distinct? Yes, children are distinct individuals.
- Can a child receive zero apples? Yes, each child can receive any non-negative integer number of apples (`>= 0`).
- What are the constraints on `n` and `m`? `1 <= n, m <= 1000000`.
- What modulus should we return? Modulo `10^9 + 7`.

## Examples to say out loud
- Consider `n = 3` children and `m = 2` apples:
  - Possible distributions: `(2, 0, 0), (0, 2, 0), (0, 0, 2), (1, 1, 0), (1, 0, 1), (0, 1, 1)`.
  - Total ways is 6.
- Consider `n = 1` child and `m = 10` apples:
  - All 10 apples must be given to the single child: `(10)`. Total ways is 1.
- Consider `n = 2` children and `m = 3` apples:
  - Possible distributions: `(3, 0), (2, 1), (1, 2), (0, 3)`. Total ways is 4.

## Brute force
A recursive backtracking search trying all non-negative integer partitions of `m` into `n` components would take `O(binom(n + m - 1, m))` operations. When `n = m = 10^6`, this number is vastly larger than the number of atoms in the universe and will hang indefinitely. We need the closed-form combinatorial formula.

## The key observation
This is the classic "Stars and Bars" theorem in combinatorics:
Distributing `m` indistinguishable items among `n` distinguishable bins with non-negative allocations corresponds to arranging `m` stars (items) and `n - 1` bars (dividers) in a line.
The total number of positions is `m + (n - 1) = n + m - 1`.
We choose `m` positions for the stars (or equivalently `n - 1` positions for the dividers):
`Ways = binom(n + m - 1, m) = (n + m - 1)! / ((n - 1)! * m!)`.
We compute this combination modulo `10^9 + 7` using precomputed factorials and modular inverse via Fermat's Little Theorem.

## Optimal approach
1. Let `total = n + m - 1`.
2. Precompute factorials `fact[0..total]` modulo `MOD = 10^9 + 7` in `O(total)` time.
3. Compute the denominator: `denom = (fact[n - 1] * fact[m]) % MOD`.
4. Invert `denom` modulo `MOD` using fast binary exponentiation: `power(denom, MOD - 2, MOD)`.
5. Multiply numerator and inverse denominator: `ans = (fact[total] * invDenom) % MOD`.
6. Return `ans` as an integer.

Complexity:
- Time: `O(n + m)` time to precompute factorials up to `n + m - 1`, plus `O(log MOD)` for the modular inverse.
- Space: `O(n + m)` auxiliary space for the factorial table.

## Code walkthrough
- `int total = n + m - 1;` represents the combined count of stars and bars.
- `vector<long long> fact(total + 1, 1);` builds factorial lookups modulo `10^9 + 7`.
- `long long denom = (fact[n - 1] * fact[m]) % MOD;` multiplies the two denominator terms.
- `power(denom, MOD - 2, MOD)` computes the modular inverse via Fermat's Little Theorem.
- `long long ans = fact[total] * power(...) % MOD;` calculates the final binomial coefficient.

## Test it out loud
- Test `n = 3, m = 2`: `total = 4`. `fact[4] / (fact[2] * fact[2]) = 24 / 4 = 6`. Correct.
- Test `n = 1, m = 10`: `total = 10`. `fact[10] / (fact[0] * fact[10]) = 1`. Correct.
- Test `n = 2, m = 3`: `total = 4`. `fact[4] / (fact[1] * fact[3]) = 24 / 6 = 4`. Correct.
- Test `n = 4, m = 4`: `total = 7`. `binom(7, 4) = 35`.
- Test `n = 5, m = 0`: 0 apples to 5 children gives exactly 1 way: `(0, 0, 0, 0, 0)`.

## Follow-ups
- What if each child must receive at least 1 apple?
  - Pre-allocate 1 apple to each child, leaving `m - n` apples to distribute freely: `binom((m - n) + n - 1, m - n) = binom(m - 1, n - 1)`.
- What if each child has an upper capacity limit `c`?
  - Solve using inclusion-exclusion or generating functions / polynomial multiplication.

## Common mistakes
- Confusing `n` and `m` in the stars and bars formula, using `n + m` instead of `n + m - 1`.
- Forgetting that when `m = 0`, the answer should be 1, which requires handling `fact[0] = 1`.
