---
id: cses-exponentiation-ii
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(q log MOD) time, O(1) space where q is queries.length"
reviewed: false
---

## Clarify first
- What expression are we evaluating? `a^(b^c) mod (10^9 + 7)`.
- How is the tower evaluated? Top-down: `b^c` is computed first, then `a` is raised to that power.
- What should `0^0` evaluate to? Per problem statement, `0^0 = 1`.
- Can `a, b, c` be 0? Yes, `0 <= a, b, c <= 10^9`.

## Examples to say out loud
- Consider `[3, 7, 1]`:
  - `7^1 = 7`.
  - `3^7 = 2187`. Modulo `10^9 + 7` gives 2187.
- Consider `[15, 2, 2]`:
  - `2^2 = 4`.
  - `15^4 = 50625`.
- Consider `[3, 4, 5]`:
  - `4^5 = 1024`.
  - `3^1024 mod (10^9 + 7) = 763327764`.
- Consider `[0, 0, 0]`:
  - `0^0 = 1`, then `0^1 = 0`. Returns 0.

## Brute force
Computing `b^c` directly without modular reduction would produce a number with up to billions of digits, which is impossible to represent or compute. Taking `b^c mod (10^9 + 7)` is mathematically incorrect because the modulus in the exponent of a modular base behaves differently than the modulus of the base.

## The key observation
Since `MOD = 10^9 + 7` is a prime number, by Fermat's Little Theorem:
`a^(MOD - 1) ≡ 1 (mod MOD)` for any integer `a` coprime to `MOD`.
Consequently, powers in the exponent wrap around modulo `phi(MOD) = MOD - 1 = 10^9 + 6`.
Therefore:
1. First compute the exponent `exp = (b^c) mod (10^9 + 6)` using binary exponentiation.
2. Then compute `res = (a^exp) mod (10^9 + 7)` using binary exponentiation.

## Optimal approach
1. Define constants `MOD = 1000000007` and `PHI = 1000000006`.
2. Implement a standard binary modular exponentiation function `power(base, exp, mod)`.
3. For each query `[a, b, c]`:
   - Compute `exp = power(b, c, PHI)`.
   - Compute `res = power(a, exp, MOD)`.
   - Append `res` to the output array.
4. Return the results.

Complexity:
- Time: `O(q log MOD)` time where `q` is the number of queries, since each query performs two modular exponentiations of `O(log MOD)` multiplications each.
- Space: `O(1)` auxiliary space beyond the output array.

## Code walkthrough
- `long long power(long long base, long long exp, long long mod)` computes `(base^exp) % mod` in `O(log exp)` steps using repeated squaring:
  - Takes `base %= mod;` initially.
  - Multiplies `res = (res * base) % mod;` whenever the current bit of `exp` is 1.
  - Squares `base = (base * base) % mod;` and halves `exp >>= 1;`.
- In `exponentiationII`:
  - `long long exp = power(b, c, PHI);` computes the exponent under modulo `10^9 + 6`.
  - `long long res = power(a, exp, MOD);` raises base `a` to power `exp` under modulo `10^9 + 7`.

## Test it out loud
- Test base case `[0, 0, 0]`: `power(0, 0, PHI) = 1`, then `power(0, 1, MOD) = 0`. Output 0.
- Test base case `[2, 0, 0]`: `power(0, 0, PHI) = 1`, then `power(2, 1, MOD) = 2`. Output 2.
- Test zero base `[0, 5, 2]`: `power(5, 2, PHI) = 25`, `power(0, 25, MOD) = 0`. Output 0.
- Test zero exponent `[5, 0, 5]`: `power(0, 5, PHI) = 0`, `power(5, 0, MOD) = 1`. Output 1.
- Test small powers `[3, 7, 1]`: Output matches 2187.

## Follow-ups
- What if the power tower had four levels: `a^(b^(c^d))`?
  - Compute modulo the iterated Euler totient function: `c^d mod phi(phi(MOD))`, then `b^(result) mod phi(MOD)`, then `a^(result) mod MOD`.
- What if `MOD` was not prime?
  - Use Euler's totient theorem and handle non-coprime bases with the power reduction property `a^b ≡ a^(b mod phi(m) + phi(m)) (mod m)` for `b >= phi(m)`.

## Common mistakes
- Reducing `b^c` modulo `10^9 + 7` instead of `10^9 + 6`, producing incorrect exponents.
- Using 32-bit integers during modular multiplication, causing overflow before the modulo operation.
