---
id: c-euler-9
pattern: cses-euler
difficulty: medium
optimal: "O(p) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What defines a Pythagorean triplet? (Three positive integers $a < b < c$ satisfying $a^2 + b^2 = c^2$).
- What is given and what must be returned? (Given perimeter $p = a + b + c$, return the maximum product $a \times b \times c$ across all valid triplets, or -1 if none exists).
- What is the range of $p$? ($1 \le p \le 30,000$).
- Can the product exceed 32-bit signed integers? (Yes, for $p = 30,000$, the product can reach $10^{12}$, requiring 64-bit integer types like `long long`).
- Are degenerate triangles allowed? (No, $a, b, c$ must be strictly positive with $a < b < c$).

## Examples to say out loud

- Classic 3-4-5 triangle: $p = 12$. Triplet is $a = 3, b = 4, c = 5$ since $3 + 4 + 5 = 12$ and $3^2 + 4^2 = 5^2$. Product is $3 \times 4 \times 5 = 60$.
- Another standard case: $p = 30$. Triplet is $a = 5, b = 12, c = 13$ with $5 + 12 + 13 = 30$ and $25 + 144 = 169$. Product is $5 \times 12 \times 13 = 780$.
- Impossible perimeter: $p = 1$ or $p = 11$. No positive integers satisfy the conditions. Output is -1.

## Brute force

A naive search tests all pairs $a$ and $b$ using nested loops: $a$ from 1 to $p$ and $b$ from $a + 1$ to $p$. For each pair, set $c = p - a - b$ and verify $a^2 + b^2 = c^2$. With $p = 30,000$, checking $p^2 / 2 \approx 4.5 \times 10^8$ combinations is too slow and causes timeouts.

## The key observation

Substituting $c = p - a - b$ into $a^2 + b^2 = c^2$ yields:
$$a^2 + b^2 = (p - a - b)^2 = p^2 + a^2 + b^2 - 2pa - 2pb + 2ab$$
Canceling $a^2 + b^2$ and isolating $b$ gives:
$$b = \frac{p(p - 2a)}{2(p - a)}$$
Because $a < b < c$ and $a + b + c = p$, we know $3a < p$, so $a \le p / 3$. Fixing $a$ determines $b$ and $c$ in $O(1)$ arithmetic.

## Optimal approach

1. Track `best = -1` in a 64-bit integer.
2. Loop `a` from 1 up to `p / 3`:
   a. Compute numerator `num = p * (p - 2 * a)` and denominator `den = 2 * (p - a)`.
   b. If `num % den != 0`, continue.
   c. Set `b = num / den` and `c = p - a - b`.
   d. If $a < b < c$ and $a^2 + b^2 = c^2$, update `best = max(best, a * b * c)`.
3. Return `best`.

Complexity:
- Time: `O(p)` because $a$ runs at most $p / 3 \le 10,000$ times, each taking $O(1)$ operations.
- Space: `O(1)` auxiliary space for scalar registers.

## Code walkthrough

In the reference implementation:
- `long long best = -1;`: stores the maximum product found, defaulting to -1.
- `for (long long a = 1; a <= p / 3; a++)`: searches $a$ up to $p / 3$ since $a$ is the smallest side.
- `long long num = (long long)p * (p - 2 * a), den = 2 * (p - a);`: uses 64-bit integers to avoid overflow during multiplication.
- `if (num % den) continue;`: skips candidates where $b$ is not an integer.
- `long long b = num / den, c = p - a - b;`: computes the unique matching $b$ and $c$.
- `best = max(best, a * b * c);`: records the maximum product among valid triplets.

## Test it out loud

- `p = 12`:
  - `a = 3`: $num = 12 \times 6 = 72, den = 2 \times 9 = 18 \implies b = 4, c = 5$. Valid, product is 60. Returns 60.
- `p = 1`:
  - Loop does not run ($1 / 3 = 0$). Returns -1.
- `p = 24`:
  - Finds $a = 6, b = 8, c = 10$, product $6 \times 8 \times 10 = 480$. Returns 480.

## Follow-ups

- What if multiple triplets exist for the same $p$?
  Some perimeters like $p = 120$ have several triplets; taking `max(best, a * b * c)` correctly resolves ties.
- Can we solve this in $O(\sqrt{p})$?
  Yes, using Euclid's formula $p = 2m(m + n)$ and factoring $p / 2$.

## Common mistakes

- 32-bit overflow when evaluating $p \times (p - 2a)$ with large $p$.
- Missing the condition $a < b$, leading to duplicate reversed triplets or $a = b$.
- Returning 0 instead of -1 when no valid triplet exists.

## Further reading

- Algebraic derivation of Pythagorean triples and Dickson's method.
- Euclid's formula for generating primitive Pythagorean triples.
