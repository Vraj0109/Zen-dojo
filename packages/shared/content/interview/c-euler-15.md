---
id: c-euler-15
pattern: cses-euler
difficulty: medium
optimal: "O(h + w + log p) time, O(h + w) space"
brute: same
reviewed: false
---

## Clarify first

- What grid dimensions are given? (`h` rows and `w` columns of squares, meaning $(h + 1) \times (w + 1)$ lattice vertices).
- What moves are permitted? (Only moves moving strictly right or strictly down along the grid lines).
- What are the ranges of `h` and `w`? ($0 \le h, w \le 100,000$).
- How should large counts be returned? (Return the result modulo $10^9 + 7$).
- What should be returned if `h = 0` or `w = 0`? (If $h = 0$ or $w = 0$, there is only one straight line path to the destination, so the answer is 1).

## Examples to say out loud

- Base case: `h = 0, w = 0`. Top-left and bottom-right corners coincide; 1 way.
- Single dimension: `h = 1, w = 3`. Total moves is $1 + 3 = 4$. Exactly 1 move is down: choices are `D-R-R-R`, `R-D-R-R`, `R-R-D-R`, `R-R-R-D` (4 paths).
- Standard square: `h = 2, w = 2`. Total moves is $2 + 2 = 4$. Number of ways to choose which 2 moves are down is $\binom{4}{2} = \frac{4 \times 3}{2} = 6$. Output is 6.

## Brute force

A recursive formulation computes paths via standard grid dynamic programming: $dp[r][c] = dp[r-1][c] + dp[r][c-1]$. Filling a 2D matrix of dimensions $(h + 1) \times (w + 1)$ requires $O(h \times w)$ time and space. When $h = w = 100,000$, $h \times w = 10^{10}$ cells, which consumes tens of gigabytes of memory and billions of operations, causing memory and time limit exhaustion.

## The key observation

Any valid path from $(0, 0)$ to $(h, w)$ consists of exactly $h$ downward steps and $w$ rightward steps, totaling $n = h + w$ steps. A path is uniquely determined by choosing which $h$ of the $h + w$ total steps are downward steps. Thus, the total number of distinct paths is given by the binomial coefficient:
$$\binom{h + w}{h} = \frac{(h + w)!}{h! \times w!}$$
Because the modulus $M = 10^9 + 7$ is prime, we compute the answer in modular arithmetic using Fermat's Little Theorem: $\frac{1}{x!} \equiv (x!)^{M - 2} \pmod M$.

## Optimal approach

1. Let $n = h + w$ and define modulus $MOD = 10^9 + 7$.
2. Precompute factorials modulo $MOD$: allocate an array `fact` of size $n + 1$ with `fact[0] = 1`, and compute `fact[i] = fact[i - 1] * i % MOD` for $i = 1 \dots n$.
3. Compute the modular inverses of $h!$ and $w!$ using binary modular exponentiation:
   - $\text{inv}(h!) = \text{power}(\text{fact}[h], MOD - 2) \pmod{MOD}$.
   - $\text{inv}(w!) = \text{power}(\text{fact}[w], MOD - 2) \pmod{MOD}$.
4. Compute the result: `(fact[n] * inv_h % MOD) * inv_w % MOD`.
5. Return the result as an integer.

Complexity:
- Time: `O(h + w + log p)` where $p = 10^9 + 7$. Computing factorials takes $O(h + w)$ operations, and computing two modular inverses via fast power takes $O(\log p) \approx 30$ multiplications.
- Space: `O(h + w)` auxiliary space to store the factorial lookup array.

## Code walkthrough

In the reference implementation:
- `long long power(long long b, long long e)`: implements repeated squaring to compute $(b^e) \pmod{MOD}$ in logarithmic time.
- `vector<long long> fact(n + 1, 1);`: maintains factorial table up to $n = h + w$.
- `fact[i] = fact[i - 1] * i % MOD;`: evaluates modular factorials iteratively in linear time.
- `power(fact[h], MOD - 2)`: computes the modular multiplicative inverse of $h!$ based on Fermat's Little Theorem since $MOD$ is prime.
- `fact[n] * power(...) % MOD * power(...) % MOD`: computes $\frac{n!}{h! w!} \pmod{MOD}$.

## Test it out loud

- `h = 0, w = 0`:
  - $n = 0$, `fact[0] = 1`.
  - Inverses of `fact[0]` are $1^{MOD-2} \equiv 1$.
  - Result is $1 \times 1 \times 1 = 1$.
- `h = 1, w = 1`:
  - $n = 2$, `fact[2] = 2`, `fact[1] = 1`.
  - Inverses of 1 are 1.
  - Result is $2 \times 1 \times 1 = 2$.
- `h = 2, w = 2`:
  - $n = 4$, `fact[4] = 24`, `fact[2] = 2`.
  - $\binom{4}{2} = 24 \times 2^{-1} \times 2^{-1} = 24 / 4 = 6$. Matches output 6.

## Follow-ups

- What if we need to answer multiple queries with different $h$ and $w$?
  Precompute `fact` and `inv_fact` arrays once up to the maximum $N = 200,000$. Each query can then be answered in $O(1)$ time by returning `fact[h + w] * inv_fact[h] % MOD * inv_fact[w] % MOD`.
- What if the grid contains obstacle cells that cannot be stepped on?
  Sort obstacles by coordinates and use inclusion-exclusion dynamic programming: count paths to each obstacle avoiding earlier obstacles, subtracting paths passing through obstacles from total paths.

## Common mistakes

- Performing integer division before modulo: `(fact[n] / (fact[h] * fact[w])) % MOD` is invalid in modular arithmetic because `fact[n] % MOD` is not divisible by `fact[h] % MOD` in ordinary integer division.
- Modulo operations omitted in intermediate products, causing 64-bit integer overflow when multiplying three large numbers.
- Forgetting that $h$ and $w$ can be 0, which would fail if base cases for 0! are not handled as 1.

## Further reading

- Combinatorics on lattice paths and Catalan numbers.
- Fermat's Little Theorem and modular inverse via extended Euclidean algorithm.
