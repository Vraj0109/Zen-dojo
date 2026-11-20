---
id: cses-bracket-sequences-i
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What defines a valid bracket sequence? Every opening bracket has a matching closing bracket and in every prefix the count of `'('` is at least the count of `')'`.
- What if length `n` is odd? An odd number of brackets can never be balanced; return 0 immediately.
- How large can `n` be? Up to `1000000`.
- What modulus should we return? Modulo `10^9 + 7`.

## Examples to say out loud
- Consider `n = 6`:
  - Number of bracket pairs is `k = 3`.
  - Valid sequences: `((()))`, `(()())`, `(())()`, `()(())`, `()()()`.
  - Total is 5.
- Consider `n = 2`:
  - `k = 1`. Valid sequence: `()`. Total is 1.
- Consider `n = 7`:
  - `n` is odd; no balanced sequence can exist. Total is 0.
- Consider `n = 4`:
  - `k = 2`. Valid sequences: `(())`, `()()`. Total is 2.

## Brute force
Generating all `2^n` bracket combinations and validating prefixes takes `O(n * 2^n)` time. For `n = 10^6`, this is astronomically large. We need the closed-form combinatorial formula for Dyck paths.

## The key observation
If `n` is odd, the answer is 0.
If `n` is even, let `k = n / 2` be the number of pairs of opening and closing brackets.
The number of valid Dyck paths of length `2k` (balanced bracket sequences with `k` pairs) is given by the `k`-th Catalan number:
`C_k = binom(2k, k) / (k + 1) = (2k)! / (k! * (k + 1)!)`.
We can evaluate `C_k` modulo `10^9 + 7` using precomputed factorials and modular multiplicative inverse via Fermat's Little Theorem.

## Optimal approach
1. If `n % 2 != 0`, return 0.
2. Let `k = n / 2`. If `k == 0`, return 1.
3. Precompute factorials `fact[0..2k]` modulo `MOD = 10^9 + 7` in `O(n)` time.
4. Compute the denominator: `denom = (fact[k] * fact[k]) % MOD`, then `denom = (denom * (k + 1)) % MOD`.
5. Compute the modular inverse of `denom`: `invDenom = power(denom, MOD - 2, MOD)`.
6. Compute the result: `ans = (fact[2 * k] * invDenom) % MOD`.
7. Return `ans` as an integer.

Complexity:
- Time: `O(n)` time to precompute factorials up to `2k = n`, plus `O(log MOD)` for the modular inverse.
- Space: `O(n)` auxiliary space for the factorial lookup table.

## Code walkthrough
- `if (n % 2 != 0) return 0;` handles parity immediately.
- `int k = n / 2;` computes the pair count.
- `vector<long long> fact(2 * k + 1, 1);` builds factorial table modulo `10^9 + 7`.
- `denom = (fact[k] * fact[k]) % MOD;` and `denom = (denom * (k + 1)) % MOD;` forms `k! * (k + 1)!`.
- `power(denom, MOD - 2, MOD)` computes the modular inverse via Fermat's Little Theorem.
- `ans = fact[2 * k] * power(...) % MOD;` multiplies numerator `(2k)!` by the inverted denominator.

## Test it out loud
- Test odd lengths `n = 1` or `n = 7`: Parity check fires, returns 0.
- Test `n = 2` (`k = 1`): `C_1 = 2! / (1! * 2!) = 1`. Returns 1.
- Test `n = 4` (`k = 2`): `C_2 = 4! / (2! * 3!) = 24 / 12 = 2`. Returns 2.
- Test `n = 6` (`k = 3`): `C_3 = 6! / (3! * 4!) = 720 / 144 = 5`. Returns 5.
- Test `n = 8` (`k = 4`): `C_4 = 14`. Returns 14.
- Test `n = 10` (`k = 5`): `C_5 = 42`. Matches expected.

## Follow-ups
- How does the reflection principle prove the Catalan formula?
  - Any monotonic path on a grid from `(0, 0)` to `(k, k)` that crosses above the diagonal `y = x` can be reflected across the line `y = x + 1` into an invalid path ending at `(k - 1, k + 1)`. Subtracting invalid paths: `binom(2k, k) - binom(2k, k - 1) = binom(2k, k) / (k + 1)`.
- What if the sequence must start with a specific prefix?
  - Use dynamic programming on prefixes or general ballot theorem (Raney's lemma / reflection principle with offsets).

## Common mistakes
- Forgetting that odd lengths can never be balanced, omitting the `n % 2 != 0` check.
- Dividing directly by `k + 1` after taking modulo without computing the modular multiplicative inverse.
