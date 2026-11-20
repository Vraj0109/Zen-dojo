---
id: cses-exponentiation
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(log b) time, O(1) space"
reviewed: false
---

## Clarify first
- What modulo is used? Modulo 10^9 + 7 (1,000,000,007).
- What is the value of 0^0? The problem statement specifies that 0^0 = 1 by convention.
- What are the constraints on a and b? Both a and b can be up to 10^9.
- Can a be greater than 10^9 + 7? Base a can be up to 10^9, so taking `a % MOD` handles any edge values cleanly.
- What should be returned? An integer representing (a^b) mod (10^9 + 7).

## Examples to say out loud
Suppose a = 3 and b = 4.
3^4 = 81. Since 81 < 10^9 + 7, the result is 81.
For the edge case 0^0, by convention it returns 1.
For a = 0 and b = 5, 0^5 = 0 mod (10^9 + 7) = 0.
For a = 2 and b = 30, 2^30 = 1073741824. Modulo 10^9 + 7 yields 73741817.

## Brute force
A naive loop computes the power by multiplying a by itself b times:
`res = 1; for (int i = 0; i < b; i++) res = (res * a) % MOD;`
With b up to 10^9, a linear loop performs 10^9 multiplications, taking several seconds and timing out.
Instead, repeated squaring (binary exponentiation) computes the result in logarithmic steps.

## The key observation
Any integer exponent b can be decomposed into a sum of powers of 2 using its binary representation.
For example, a^13 = a^(8 + 4 + 1) = a^8 * a^4 * a^1.
By repeatedly squaring the base (a, a^2, a^4, a^8, ...) and multiplying into the running result only when the corresponding bit in b is 1, we reduce b to 0 in floor(log2(b)) + 1 steps.

## Optimal approach
1. Set `res = 1`, `base = a % 1000000007`, and `exp = b`.
2. While `exp > 0`:
   - If the lowest bit of `exp` is set (`exp & 1`):
     - `res = (res * base) % 1000000007`.
   - Square the base: `base = (base * base) % 1000000007`.
   - Right-shift `exp` by 1 (`exp >>= 1`).
3. Return `(int)res`.

Complexity: O(log b) time because the exponent is halved in each iteration (at most ~30 iterations for b <= 10^9), and O(1) space.

## Code walkthrough
In C++, intermediate multiplications `res * base` and `base * base` can reach up to (10^9 + 7)^2 approx 10^18, which exceeds standard 32-bit signed integers.
Therefore, `base`, `exp`, and `res` are declared as `long long`.
The loop tests `if (exp & 1)` to multiply the current weight when the binary bit is 1.
Then `base = (base * base) % mod` prepares the next power of 2, and `exp >>= 1` moves to the next bit.
When `b = 0` initially (such as for 0^0 or 123^0), the while-loop never executes, cleanly returning `res = 1`.

## Test it out loud
- Base case 0^0: a = 0, b = 0. Loop does not run. Returns 1.
- Zero base positive exponent: a = 0, b = 5. `base = 0`. First iteration has `exp & 1 == 1`, multiplying `res = 1 * 0 = 0`. Returns 0.
- Small power: a = 2, b = 8. Binary is 1000_2. 8 -> 4 -> 2 -> 1 -> 0. Multiplies once at the 8th power: 2^8 = 256. Returns 256.
- Base equal to modulus: a = 1000000007, b = 5. `base % mod` becomes 0, returning 0.

## Follow-ups
- How would you compute modular inverse using this? If p is prime (and 10^9 + 7 is prime), Fermat's Little Theorem states that a^(p - 1) = 1 (mod p). Hence, the modular inverse of a is a^(p - 2) mod p, computed via `exponentiation(a, p - 2)`.
- What if the exponent is given as a tower of powers (e.g., a^(b^c) mod p)? Euler's totient theorem states we compute `exp = (b^c) mod (p - 1)`, then compute `a^exp mod p`.
- What if the modulus is not prime? Euler's totient theorem applies with phi(m), requiring phi(m) calculation.

## Common mistakes
- 32-bit integer overflow during squaring: `base * base` reaches 10^18 before the `% mod` is applied. Declaring variables as 64-bit `long long` avoids overflow.
- Handling of 0^0: some custom recursive implementations return 0 or fail base conditions if 0^0 is not handled properly.
- Forgetting to modulo the base initially: if a >= 10^9 + 7, omitting `base %= mod` can cause the first multiplication to overflow 64-bit limits if inputs are larger.

## Further reading
- Binary exponentiation (repeated squaring) algorithm
- Fermat's Little Theorem and modular multiplicative inverses
- Euler's totient theorem and modular power towers
