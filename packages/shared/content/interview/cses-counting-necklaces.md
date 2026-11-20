---
id: cses-counting-necklaces
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(sqrt(n)) time, O(1) space"
reviewed: false
---

## Clarify first
- How many pearls and colors are there? `n` pearls, each can be chosen from `m` distinct colors.
- What symmetries are considered equivalent? Rotational symmetry only (cyclic permutations under the cyclic group `C_n`). Reflections (flipping the necklace) are not considered equivalent.
- How large can `n` and `m` be? Up to `1000000`.
- What modulus should we return? Modulo `10^9 + 7`.

## Examples to say out loud
- Consider `n = 4, m = 3`:
  - 4 pearls, 3 colors. Rotational equivalence gives 24 distinct classes.
- Consider `n = 1, m = 5`:
  - With 1 pearl, any of the 5 colors forms a unique necklace. Output is 5.
- Consider `n = 2, m = 2`:
  - Pearl colorings: `(0, 0)`, `(0, 1) = (1, 0)`, `(1, 1)`. Total is 3.

## Brute force
Generating all `m^n` colored necklaces and checking equivalence under the `n` rotations would take `O(n * m^n)` operations. For `n = 10^6` and `m = 10^6`, this is far beyond what can be computed by brute force. We need Burnside's Lemma.

## The key observation
By Burnside's Lemma:
The number of distinct orbits under the cyclic group `C_n` is the average number of fixed points across all rotations:
`Number of necklaces = (1 / n) * sum_{k=0}^{n-1} |Fix(r^k)|`.
A rotation by `k` steps decomposes the `n` positions into `gcd(k, n)` disjoint cycles of equal length. For a necklace to remain unchanged under rotation by `k`, all positions within the same cycle must share the exact same color. Since there are `m` colors, there are `m^{gcd(k, n)}` invariant colorings.
Grouping all `k` by their greatest common divisor `d = gcd(k, n)` where `d | n`, the number of values of `k` in `[0, n - 1]` with `gcd(k, n) = d` is `phi(n / d)`.
Thus:
`Number of necklaces = (1 / n) * sum_{d | n} phi(n / d) * m^d mod (10^9 + 7)`.

## Optimal approach
1. Set `MOD = 1000000007`.
2. Implement a helper function `getPhi(x)` that computes Euler's totient `phi(x)` in `O(sqrt(x))` time by trial division.
3. Implement `power(base, exp, mod)` for modular exponentiation.
4. Initialize `sum = 0`.
5. Iterate through all divisors `d` of `n` by checking `d * d <= n`:
   - If `n % d == 0`:
     - Calculate `phi1 = getPhi(n / d) % MOD`.
     - Calculate `term1 = (phi1 * power(m, d, MOD)) % MOD`.
     - Add `term1` to `sum`.
     - If `d * d != n`:
       - Let `d2 = n / d`.
       - Calculate `phi2 = getPhi(n / d2) % MOD`.
       - Calculate `term2 = (phi2 * power(m, d2, MOD)) % MOD`.
       - Add `term2` to `sum`.
6. Multiply `sum` by the modular inverse of `n`: `ans = (sum * power(n, MOD - 2, MOD)) % MOD`.
7. Return `ans` as an integer.

Complexity:
- Time: `O(sqrt(n))` time because iterating over divisors up to `sqrt(n)` and factoring each divisor to evaluate `phi` takes sub-millisecond time.
- Space: `O(1)` auxiliary space.

## Code walkthrough
- `long long getPhi(long long x)` finds `x * prod(1 - 1/p)` for each distinct prime factor `p` of `x`.
- In `countingNecklaces`:
  - `for (int d = 1; (long long)d * d <= n; d++)` iterates over paired divisors `(d, n / d)`.
  - `term1 = (phi1 * power(m, d, MOD)) % MOD;` evaluates `phi(n / d) * m^d`.
  - `term2` symmetrically evaluates the paired divisor `d2 = n / d`.
  - `sum` aggregates all orbit contributions.
- `power(n, MOD - 2, MOD)` computes `1 / n mod MOD` via Fermat's Little Theorem to divide by the group size `|C_n| = n`.

## Test it out loud
- Test `n = 1, m = 5`: `d = 1`, `phi(1) = 1`, `m^1 = 5`, `sum = 5`. `5 * 1 / 1 = 5`.
- Test `n = 2, m = 2`:
  - Divisors are 1 and 2.
  - `d = 1`: `phi(2) * 2^1 = 1 * 2 = 2`.
  - `d = 2`: `phi(1) * 2^2 = 1 * 4 = 4`.
  - Sum = 6. Dividing by `n = 2` gives `6 / 2 = 3`.
- Test `n = 3, m = 2`: Divisors 1 and 3. `(phi(3) * 2^1 + phi(1) * 2^3) / 3 = (2 * 2 + 1 * 8) / 3 = 12 / 3 = 4`.
- Test `n = 4, m = 3`: Matches 24.
- Test `n = 6, m = 2`: Matches 14.

## Follow-ups
- What if reflections were also allowed (dihedral group `D_n` instead of cyclic group `C_n`)?
  - This is Polya's Enumeration Theorem for bracelets. We would also include reflections across axes of symmetry (distinguishing even and odd `n`) and divide by `2n`.
- How to optimize if `n` is queried repeatedly for multiple colors `m`?
  - Precompute divisors and Euler's totient using a linear sieve.

## Common mistakes
- Dividing by `n` using integer division `/ n` after taking `sum % MOD` instead of multiplying by the modular inverse `n^(MOD - 2)`.
- Forgetting to handle the paired divisor `n / d` when `d * d < n`, missing half of the divisors.
