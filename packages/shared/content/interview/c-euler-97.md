---
id: c-euler-97
pattern: cses-euler
difficulty: medium
optimal: "O(log e) time, O(1) space"
reviewed: false
---

## Clarify first
- What formula is being evaluated? The expression $a \times 2^e + 1$.
- What should be returned? The last $k$ decimal digits of this huge number, represented as an integer (equivalent to $(a \times 2^e + 1) \pmod{10^k}$).
- Are leading zeros retained? The question specifies returning the value as a number, so leading zeros are dropped by returning the standard integer modulo result.
- What are the parameter bounds? $1 \le a \le 10^9$, $0 \le e \le 10^{15}$, and $1 \le k \le 15$.
- Why can't we compute $2^e$ directly? For $e = 10^{15}$, $2^e$ has hundreds of trillions of digits. We must work exclusively under modular arithmetic modulo $M = 10^k$.

## Examples to say out loud
- Consider $a = 3, e = 4, k = 3$.
  Formula: $3 \times 2^4 + 1 = 3 \times 16 + 1 = 48 + 1 = 49$.
  Last 3 digits: $49 \pmod{1000} = 49$.
  Result: 49.
- Consider $a = 1, e = 10, k = 2$.
  Formula: $1 \times 2^{10} + 1 = 1024 + 1 = 1025$.
  Last 2 digits: $1025 \pmod{100} = 25$.
  Result: 25.
- Edge case: $a = 1, e = 0, k = 1$.
  $1 \times 2^0 + 1 = 1 \times 1 + 1 = 2$.
  Result: 2.

## Brute force
A naive approach would perform repeated multiplication: start with 1, multiply by 2 and take modulo $10^k$ for $e$ iterations. Since $e$ can reach $10^{15}$, performing $10^{15}$ sequential multiplications would take months of computation. Binary exponentiation (repeated squaring) computes $2^e \pmod{10^k}$ in just $\approx 50$ operations.

## The key observation
1. By modular arithmetic properties:
   $(a \cdot 2^e + 1) \pmod{10^k} = \left(((a \pmod{10^k}) \cdot (2^e \pmod{10^k})) \pmod{10^k} + 1\right) \pmod{10^k}$.
2. For $k \le 15$, the modulus $M = 10^k \le 10^{15}$ fits comfortably inside a standard 64-bit integer (`unsigned long long`).
3. However, when multiplying two numbers below $10^{15}$, their intermediate product can reach $10^{30}$, which exceeds 64 bits ($2^{64} \approx 1.84 \times 10^{19}$).
   Therefore, modular multiplications must use 128-bit integers (`unsigned __int128` in C++, or `BigInteger` in Java).

## Optimal approach
1. Compute modulus $M = 10^k$ using a 64-bit unsigned integer.
2. Compute $R = 2^e \pmod M$ using binary exponentiation:
   - Initialize `r = 1 % M`, `base = 2 % M`.
   - While $e > 0$:
     - If the lowest bit of $e$ is 1: `r = (unsigned __int128)r * base % M`.
     - `base = (unsigned __int128)base * base % M`.
     - Shift $e$ right by 1: $e \leftarrow e >> 1$.
3. Multiply by $a$: `v = (unsigned __int128)(a % M) * r % M`.
4. Add 1 and take modulo: `result = (v + 1) % M`.
5. Return `result`.
6. Complexity:
   - Time Complexity: $O(\log_2 e)$ modular multiplications. For $e \le 10^{15}$, $\log_2(10^{15}) \approx 50$ iterations, running in under 1 microsecond.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `ull M = 1; for (int i = 0; i < k; i++) M *= 10;`: Construct modulus $10^k$.
- `ull base = 2 % M, r = 1 % M;`: Base values for modular exponentiation.
- `while (ee) { if (ee & 1) r = (unsigned __int128)r * base % M; ... }`: Binary exponentiation with 128-bit casting to prevent overflow.
- `ull v = (unsigned __int128)(a % M) * r % M;`: Scale by coefficient $a$.
- `return (long long)((v + 1) % M);`: Add 1 and return the final $k$ digits.

## Test it out loud
- Test 1: $a = 1, e = 0, k = 1 \to M = 10$, $r = 1$, $v = 1$, $(1 + 1) \% 10 = 2$.
- Test 2: $a = 5, e = 3, k = 2 \to M = 100$, $5 \times 8 + 1 = 41 \to$ returns 41.
- Test 3: $a = 7, e = 100, k = 5 \to$ returns 37633.
- Test 4: $a = 28433, e = 7830457, k = 10$ (the classic Euler 97 prime) $\to$ returns 8739992577.

## Follow-ups
- What is the significance of the numbers in Euler 97?
  $28433 \times 2^{7830457} + 1$ was discovered in 2004 as a massive non-Mersenne prime with 2,357,207 digits.
- What if $k > 18$ so $10^k$ exceeds 64 bits?
  Use arbitrary-precision arithmetic (`BigInteger` or Karatsuba multiplication with Montgomery reduction).

## Common mistakes
- Performing multiplication `(r * base) % M` using standard 64-bit `uint64_t`: for $M = 10^{15}$, $r \times \text{base}$ reaches $10^{30}$, overflowing 64 bits and returning incorrect answers.
- Looping $e$ times instead of using binary exponentiation, leading to immediate TLE.
- Forgetting to take $a \pmod M$ before multiplying.
