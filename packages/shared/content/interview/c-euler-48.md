---
id: c-euler-48
pattern: cses-euler
difficulty: medium
optimal: "O(n log n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What series is being evaluated? (The sum of self-powers: $S = \sum_{k=1}^n k^k = 1^1 + 2^2 + 3^3 + \dots + n^n$).
- What should be returned? (The last `digits` digits of the sum, returned as a numeric integer without leading zeros; for example, if the last digits are `"0405"`, return 405).
- What are the constraints on $n$ and `digits`? ($1 \le n \le 100,000$ and $1 \le \text{digits} \le 15$).
- Can the intermediate products exceed 64-bit integer limits? (Yes: modulo $m = 10^{\text{digits}}$ can be up to $10^{15}$. Multiplying two numbers modulo $10^{15}$ produces a product up to $10^{30}$, which exceeds $2^{64} - 1 \approx 1.84 \times 10^{19}$. 128-bit integer types like `__int128` in C++ or `BigInteger` in Java/Python are required).
- What should be returned for $n = 1$? ($1^1 \bmod 10^{\text{digits}} = 1$).

## Examples to say out loud

- Small series: `n = 3, digits = 2`.
  - $1^1 = 1$
  - $2^2 = 4$
  - $3^3 = 27$
  - Full sum: $1 + 4 + 27 = 32$. Last 2 digits: 32. Output is 32.
- Stated example: `n = 10, digits = 10`.
  - Full sum is $10,405,071,317$.
  - Last 10 digits as a number: 405071317 (leading zero is dropped in numeric return). Output is 405071317.
- Single term: `n = 1, digits = 1`. $1^1 = 1$. Output is 1.

## Brute force

A brute-force strategy computes the exact powers $k^k$ using arbitrary-precision big integers and adds them together into a large accumulator, finally taking `total % 10^digits`. For $n = 100,000$, the term $100000^{100000}$ has 500,000 decimal digits. Storing and computing big integers with hundreds of thousands of digits takes immense memory and minutes of CPU time.

## The key observation

We only need the last `digits` digits of the final sum, which is mathematically equivalent to computing:
$$\left( \sum_{k=1}^n k^k \right) \bmod 10^{\text{digits}}$$
Because modular arithmetic distributes over addition and multiplication ($(a \times b) \bmod m = ((a \bmod m) \times (b \bmod m)) \bmod m$), we never need to compute the full powers!
For each term $k \in [1, n]$, we evaluate $k^k \bmod 10^{\text{digits}}$ directly using binary modular exponentiation (repeated squaring) in $O(\log k)$ time. We then accumulate each term into a running sum modulo $10^{\text{digits}}$.

## Optimal approach

1. Calculate the modulus: $m = 10^{\text{digits}}$.
2. Implement 128-bit modular multiplication: `mulmod(a, b, m) = (unsigned __int128)a * b % m`.
3. Implement modular binary exponentiation:
   - `powmod(base, exp, m)` computes $(\text{base}^{\text{exp}}) \bmod m$ using repeated squaring in $O(\log \text{exp})$ steps.
4. Initialize a 64-bit accumulator `total = 0`.
5. For $k = 1$ up to $n$:
   - Add `powmod(k, k, m)` to `total`.
   - Update `total = total % m`.
6. Return `(long long)total`.

Complexity:
- Time: `O(n log n)` time because there are $n$ terms, and computing $k^k \bmod m$ takes $O(\log k)$ modular multiplications. For $n = 100,000$, $\sum \log_2(k) \approx 1.5 \times 10^6$ operations, which finishes in about 20 ms.
- Space: `O(1)` auxiliary space as only scalar 64-bit integer variables are allocated.

## Code walkthrough

In the reference implementation:
- `u64 mulmod(u64 a, u64 b, u64 m)`: casts to `unsigned __int128` before multiplication to safely handle values up to $10^{30}$ without 64-bit overflow.
- `u64 powmod(u64 b, u64 e, u64 m)`: computes $b^e \bmod m$ in logarithmic time via binary exponentiation.
- `u64 m = 1; for (int i = 0; i < digits; i++) m *= 10;`: computes the modulus $10^{\text{digits}}$.
- `for (int k = 1; k <= n; k++) total = (total + powmod(k, k, m)) % m;`: sums the modular self-powers term by term.
- `return (long long)total;`: returns the numeric tail.

## Test it out loud

- `n = 1, digits = 1`:
  - $m = 10$. $1^1 \bmod 10 = 1$. Returns 1.
- `n = 2, digits = 1`:
  - $m = 10$. $1^1 + 2^2 = 1 + 4 = 5$. $5 \bmod 10 = 5$. Returns 5.
- `n = 3, digits = 2`:
  - $m = 100$. $1 + 4 + 27 = 32 \bmod 100 = 32$. Returns 32.
- `n = 10, digits = 3`:
  - Last 3 digits of full sum 10405071317 is 317. Returns 317.

## Follow-ups

- What if `digits` is up to 100?
  For large digit counts, 128-bit arithmetic is insufficient. We would use arbitrary-precision big integer modular exponentiation (such as Java's `BigInteger.modPow` or Python's `pow(k, k, m)`).
- What if $n = 10^9$?
  Terms where $k \ge \text{digits}$ and $k$ has factors of 10 become 0 mod $10^{\text{digits}}$ if factored properly, but in general Chinese Remainder Theorem mod $2^{\text{digits}}$ and $5^{\text{digits}}$ can optimize repeated residue periods.

## Common mistakes

- Standard 64-bit overflow during multiplication: when $\text{digits} = 15$, $m = 10^{15}$. Multiplying two numbers $\approx 10^{15}$ gives $10^{30}$, overflowing 64-bit integers ($1.8 \times 10^{19}$) unless `__int128` or a split-multiplication routine is used.
- Attempting to compute the full integer $k^k$ before taking modulo, crashing on out-of-memory or timing out.
- Returning a string with leading zeros instead of an integer as required by the problem return type.

## Further reading

- Binary modular exponentiation (square-and-multiply algorithm).
- 128-bit integer arithmetic in GCC/Clang compilers (`__int128`).
