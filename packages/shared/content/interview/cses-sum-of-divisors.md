---
id: cses-sum-of-divisors
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(sqrt(n)) time, O(1) space"
reviewed: false
---

## Clarify first
- What does `sigma(x)` represent? The sum of all positive divisors of `x`.
- What is the required calculation? Compute the sum of `sigma(x)` for all integers `x` from 1 to `n`, taken modulo `10^9 + 7`.
- What are the constraints on `n`? `1 <= n <= 10^12`.
- Since `n` can reach `10^12`, can we iterate up to `n`? No, any linear `O(n)` scan will time out. We must compute the result in `O(sqrt(n))` time.

## Examples to say out loud
- Consider `n = 3`:
  - Divisors of 1: 1 (sum = 1).
  - Divisors of 2: 1, 2 (sum = 3).
  - Divisors of 3: 1, 3 (sum = 4).
  - Total sum: `1 + 3 + 4 = 8`.
- Consider `n = 5`:
  - `sigma(1..5)` sums are 1, 3, 4, 7, 6.
  - Total sum: `1 + 3 + 4 + 7 + 6 = 21`.
- Consider `n = 1`:
  - `sigma(1) = 1`. Total sum is 1.

## Brute force
Computing `sigma(x)` for each `x` individually from 1 to `n` takes `O(n sqrt(n))` time. Reversing the summation to count how many times each divisor `d` appears, `sum_{d=1}^n d * floor(n / d)`, still requires an `O(n)` loop. With `n = 10^12`, an `O(n)` loop will exceed any execution time limit. We need square root division decomposition.

## The key observation
In the summation `sum_{d=1}^n d * floor(n / d)`, the quotient `q = floor(n / d)` only takes at most `2 * sqrt(n)` distinct integer values.
For a given starting value `l`, the quotient is `q = floor(n / l)`. The maximum integer `r` that produces this identical quotient `floor(n / r) == q` is given by `r = floor(n / q)`.
For all divisors `d` in the contiguous interval `[l, r]`, the multiplier `floor(n / d)` is constantly equal to `q`. Therefore, the sum of `d * q` over `[l, r]` is:
`q * sum_{d=l}^r d = q * ((l + r) * (r - l + 1) / 2)`.
Summing these blocks allows us to compute the entire sum in `O(sqrt(n))` steps.

## Optimal approach
1. Set `MOD = 1000000007` and modular inverse of 2: `INV2 = 500000004` (since `2 * 500000004 = 1000000008 ≡ 1 mod MOD`).
2. Initialize `ans = 0` and pointer `l = 1`.
3. While `l <= n`:
   - Compute quotient `q = n / l`.
   - Compute upper bound `r = n / q`.
   - Number of terms in this interval: `count = (r - l + 1) % MOD`.
   - Sum of the boundary terms: `sumLR = (l % MOD + r % MOD) % MOD`.
   - Total arithmetic progression sum: `termSum = (sumLR * count) % MOD * INV2 % MOD`.
   - Add contribution to answer: `ans = (ans + (q % MOD) * termSum) % MOD`.
   - Advance `l = r + 1`.
4. Return `ans` as an integer.

Complexity:
- Time: `O(sqrt(n))` time because `floor(n / l)` changes at most `2 * sqrt(n)` times. For `n = 10^12`, `sqrt(n) = 10^6` iterations, executing in a fraction of a second.
- Space: `O(1)` auxiliary space.

## Code walkthrough
- `const long long INV2 = 500000004;` represents division by 2 under modulo `10^9 + 7`.
- `while (l <= n)` chunks divisors into blocks of equal quotients:
  - `long long q = n / l;` identifies the quotient for the current interval.
  - `long long r = n / q;` determines the end of the block where the quotient remains unchanged.
  - `long long termSum = (sumLR * count) % MOD * INV2 % MOD;` computes `sum_{d=l}^r d` using the arithmetic progression formula in modular arithmetic.
  - `ans = (ans + (q % MOD) * termSum) % MOD;` factors in the common quotient `q`.
  - `l = r + 1;` jumps directly to the start of the next quotient block.

## Test it out loud
- Test `n = 1`: `q = 1, r = 1`, term sum is 1, returns 1.
- Test `n = 2`:
  - `l = 1`: `q = 2, r = 2 / 2 = 1`. Block `[1, 1]`, term 1, contributes `2 * 1 = 2`.
  - `l = 2`: `q = 1, r = 2 / 1 = 2`. Block `[2, 2]`, term 2, contributes `1 * 2 = 2`.
  - Sum is 4.
- Test `n = 4`: Returns 15.
- Test `n = 10`: Returns 87.
- Test `n = 100`: Returns 8299. All match expected sigma sums.

## Follow-ups
- How does this technique relate to other number theory problems?
  - This technique is called square root decomposition or harmonic lemma (divisor analysis). It is widely used in computing Mertens function and prefix sums of multiplicative functions.
- Why is modular inverse needed instead of normal integer division `/ 2`?
  - Because intermediate products are reduced modulo `10^9 + 7`, direct integer division does not preserve mathematical equivalence; multiplication by the modular multiplicative inverse is mandatory.

## Common mistakes
- Attempting a linear loop up to `n`, which causes TLE since `n` can reach `10^12`.
- Integer overflow before modulo: calculating `(l + r) * (r - l + 1)` without 64-bit integers and modular reduction.
- Performing `termSum / 2` after modular reduction instead of multiplying by the modular inverse of 2.
