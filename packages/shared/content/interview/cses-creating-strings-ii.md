---
id: cses-creating-strings-ii
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(n + 26) time, O(n) space"
reviewed: false
---

## Clarify first
- What does string `s` contain? Only lowercase English letters `'a'` through `'z'`.
- What are we counting? The number of distinct permutations that can be formed using all letters of `s`.
- How large can `s` be? Length up to `1000000`.
- What modulus should we use? Modulo `10^9 + 7`.

## Examples to say out loud
- Consider `s = "aab"`:
  - Total length is 3, with frequencies `a: 2, b: 1`.
  - Permutations: `"aab"`, `"aba"`, `"baa"`. Total is 3.
  - Formula: `3! / (2! * 1!) = 6 / 2 = 3`.
- Consider `s = "abc"`:
  - Frequencies all 1.
  - Total is `3! = 6`.
- Consider `s = "aaaa"`:
  - All characters identical.
  - Formula: `4! / 4! = 1`.

## Brute force
Generating all permutations using backtracking or recursion and collecting unique strings in a hash set takes `O(n * n!)` time. For `n = 10^6`, this is astronomically large and will crash immediately. We need the closed-form multinomial coefficient.

## The key observation
The number of distinct permutations of a multiset with `n` elements and character frequencies `c_1, c_2, ..., c_{26}` is given by the multinomial coefficient:
`n! / (c_1! * c_2! * ... * c_{26}!)`.
Since we need the result modulo `10^9 + 7` (a prime number), division by the denominator product `D` is computed as multiplication by its modular multiplicative inverse `D^(MOD - 2) mod MOD` via Fermat's Little Theorem.

## Optimal approach
1. Set `MOD = 1000000007`.
2. Count the frequencies of each letter `'a'` through `'z'` in `s`.
3. Precompute factorials `fact[0..n]` modulo `MOD` in `O(n)` time where `n = s.length()`.
4. Initialize `denom = 1`.
5. For each character count `c`:
   - If `c > 1`, update `denom = (denom * fact[c]) % MOD`.
6. Compute the modular inverse of `denom`: `invDenom = power(denom, MOD - 2, MOD)`.
7. Compute `ans = (fact[n] * invDenom) % MOD`.
8. Return `ans` as an integer.

Complexity:
- Time: `O(n + 26)` time because computing character frequencies and factorials takes `O(n)`, iterating over 26 counts takes `O(26)`, and modular inverse takes `O(log MOD)`.
- Space: `O(n)` auxiliary space for the factorial precomputation table.

## Code walkthrough
- `vector<long long> fact(n + 1, 1);` builds `fact[i] = (fact[i - 1] * i) % MOD` iteratively.
- `vector<int> cnt(26, 0);` tallies the count of each lowercase letter.
- `for (int i = 0; i < 26; i++) if (cnt[i] > 1) denom = (denom * fact[cnt[i]]) % MOD;` multiplies the factorials of repeated letter counts into the denominator.
- `power(denom, MOD - 2, MOD)` calculates the modular multiplicative inverse using fast exponentiation.
- `ans = fact[n] * power(...) % MOD;` completes the multinomial quotient.

## Test it out loud
- Test single character `"a"`: `fact[1] = 1`, `denom = 1`, returns 1.
- Test all same `"aaaa"`: `denom = fact[4]`, `fact[4] * inv(fact[4]) = 1`, returns 1.
- Test `"aabb"`: `4! / (2! * 2!) = 24 / 4 = 6`.
- Test `"aabac"`: `n = 5`, `a: 3, b: 1, c: 1`. Result: `120 / (6 * 1 * 1) = 20`.
- Test all distinct `"abcdefgh"`: `n = 8`, `8! = 40320`. Matches expected.

## Follow-ups
- How to extend this if characters are arbitrary Unicode characters instead of 26 lowercase English letters?
  - Use a hash map instead of a fixed size-26 array to accumulate frequencies.
- Can we compute factorials in `O(1)` space?
  - We only need `fact[n]` and the factorials of character counts `fact[c]`. Since `c <= n`, computing `fact` on the fly or precomputing saves redundant work across multiple queries.

## Common mistakes
- Attempting standard integer division `/ denom` on modular values, which yields completely wrong results.
- Forgetting that `0! = 1` and `1! = 1`.
