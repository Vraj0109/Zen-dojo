---
id: c-euler-26
pattern: cses-euler
difficulty: medium
optimal: "O(limit^2) worst case, but cycle lengths are far shorter than m for most d so it runs in well under a second, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What fraction is being expanded? (Unit fractions $\frac{1}{d}$ in decimal representation, for denominators $2 \le d < \text{limit}$).
- What is a repeating cycle? (The repetend of the decimal expansion; for example, $1/7 = 0.\overline{142857}$ has cycle length 6, $1/6 = 0.1\overline{6}$ has cycle length 1, and $1/8 = 0.125$ terminates with cycle length 0).
- What should be returned? (The denominator $d < \text{limit}$ that produces the longest repeating cycle; if multiple denominators tie for the longest cycle, return the smallest $d$).
- What are the constraints on `limit`? ($3 \le \text{limit} \le 20,000$).
- Can the answer fit in a standard integer? (Yes, $d < 20,000$ fits easily in standard 32-bit `int`).

## Examples to say out loud

- Smallest case: `limit = 3`. The only candidate is $d = 2$. $1/2 = 0.5$ (terminates, cycle length 0). Output is 2.
- Standard case: `limit = 11`. Testing denominators $d \in [2, 10]$:
  - $1/2 = 0.5$ (0), $1/3 = 0.\overline{3}$ (1), $1/4 = 0.25$ (0), $1/5 = 0.2$ (0), $1/6 = 0.1\overline{6}$ (1), $1/7 = 0.\overline{142857}$ (6), $1/8 = 0.125$ (0), $1/9 = 0.\overline{1}$ (1), $1/10 = 0.1$ (0).
  - Maximum cycle length is 6, produced by $d = 7$. Output is 7.
- Prime denominator: `d = 7`. The remainders during long division are $10 \to 3 \to 2 \to 6 \to 4 \to 5 \to 1$. Takes 6 steps to return to remainder 1.

## Brute force

A direct simulation performs manual long division on $1/d$, tracking remainders and their appearance positions in a hash map or array. When a remainder repeats, the difference between current position and previous position gives the cycle length. However, storing position tables and simulating full divisions for all $20,000$ denominators requires allocating hash maps and checking thousands of digits per number.

## The key observation

In decimal (base 10), factors of 2 and 5 in the denominator $d$ only contribute to terminating decimal places (since $10 = 2 \times 5$). If we divide out all factors of 2 and 5 from $d$, leaving $m$:
$$d = 2^a \times 5^b \times m \quad \text{with } \gcd(m, 10) = 1$$
- If $m = 1$, the decimal expansion terminates completely, so the cycle length is 0.
- If $m > 1$, the repeating cycle length is mathematically equal to the multiplicative order of 10 modulo $m$: the smallest positive integer $k \ge 1$ such that:
$$10^k \equiv 1 \pmod m$$
We can find $k$ by repeated modular multiplication: start with $r = 10 \bmod m$, and repeatedly update $r = (r \times 10) \bmod m$ until $r == 1$, counting the number of multiplications.

## Optimal approach

1. Track `best = -1` (maximum cycle length seen) and `bestD = 2`.
2. For each denominator `d` from 2 up to `limit - 1`:
   a. Strip factors of 2 and 5:
      - Set `m = d`.
      - While `m % 2 == 0`: divide `m /= 2`.
      - While `m % 5 == 0`: divide `m /= 5`.
   b. If $m == 1$, cycle length is 0.
   c. If $m > 1$:
      - Set `r = 10 % m` and `len = 1`.
      - While $r \ne 1$: update `r = (r * 10) % m` and increment `len++`.
   d. If `len > best` (strict inequality ensures the smallest $d$ wins ties):
      - Update `best = len` and `bestD = d`.
3. Return `bestD`.

Complexity:
- Time: `O(limit^2)` worst-case bound because finding the order of 10 mod $m$ takes at most $m \le d$ iterations. In practice, cycle lengths are far smaller than $m$ on average, and the entire search across 20,000 numbers completes in under 0.15 seconds.
- Space: `O(1)` auxiliary space as only scalar integer registers are maintained.

## Code walkthrough

In the reference implementation:
- `int best = -1, bestD = 2;`: initializes tracker for maximum cycle length and corresponding denominator.
- `while (m % 2 == 0) m /= 2; while (m % 5 == 0) m /= 5;`: removes non-periodic decimal factors, isolating the coprime kernel $m$.
- `int r = 10 % m; len = 1; while (r != 1) { r = r * 10 % m; len++; }`: computes the multiplicative order $\text{ord}_m(10)$ by generating modular powers of 10.
- `if (len > best) { best = len; bestD = d; }`: retains the earliest denominator achieving the record length.
- `return bestD;`: returns the optimal denominator.

## Test it out loud

- `limit = 3`:
  - $d = 2 \implies m = 1$. $len = 0 > -1 \implies best = 0, bestD = 2$. Returns 2.
- `limit = 4`:
  - $d = 2 \implies len = 0$.
  - $d = 3 \implies m = 3$. $r = 10 \bmod 3 = 1 \implies len = 1$. $len = 1 > 0 \implies bestD = 3$. Returns 3.
- `limit = 11`:
  - $d = 7 \implies m = 7$. $10^k \bmod 7$ sequence: 3, 2, 6, 4, 5, 1 ($k = 6$). $best = 6, bestD = 7$. Returns 7.

## Follow-ups

- How can we prune the search space for large `limit`?
  By Fermat's Little Theorem, the multiplicative order of 10 modulo prime $p$ cannot exceed $p - 1$. If we search backwards from $d = \text{limit} - 1$ down to 2 and check only primes, as soon as we find a full-reptend prime where $\text{len} == d - 1$ and $d - 1 \ge \text{best}$, we can prune heavily.
- What if base $B$ is different from base 10 (e.g. hexadecimal or binary)?
  Divide out all prime factors of the base $B$ from $d$ to obtain $m$, then find the multiplicative order of $B$ modulo $m$.

## Common mistakes

- Failing to remove factors of 2 and 5 before checking modular order: if $\gcd(d, 10) > 1$, powers of 10 modulo $d$ will never reach 1, causing an infinite loop.
- Using floating-point division `1.0 / d`, which truncates after 15-17 decimal digits and cannot detect long cycles.
- Using `>=` instead of `>` when updating `bestD`, violating the requirement to pick the smallest denominator on ties.

## Further reading

- Multiplicative order of integers and Euler's totient theorem.
- Full reptend primes (long primes) and Artin's conjecture on primitive roots.
