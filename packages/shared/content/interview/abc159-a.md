---
id: abc159-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first
- What does the bag contain? $n$ balls with even numbers, and $m$ balls with odd numbers. All balls are distinct.
- What are we choosing? Exactly two balls picked without replacement, where the order of selection does not matter (unordered pairs).
- When is the sum of the two chosen balls even? The sum of two integers is even if and only if both numbers have the same parity: either both are even, or both are odd.
- What are the constraints on $n$ and $m$? $0 \le n, m \le 100$ and $n + m \ge 2$.
- What should be returned? The total number of valid pairs of balls whose sum is even.

## Examples to say out loud
- Consider $n = 2$ and $m = 1$.
  - Pairs of two even balls: $\binom{2}{2} = 1$.
  - Pairs of two odd balls: $\binom{1}{2} = 0$.
  Total ways = $1 + 0 = 1$.
- Consider $n = 4$ and $m = 3$.
  - Pairs of two even balls: $\binom{4}{2} = \frac{4 \times 3}{2} = 6$.
  - Pairs of two odd balls: $\binom{3}{2} = \frac{3 \times 2}{2} = 3$.
  Total ways = $6 + 3 = 9$.
- Consider $n = 1$ and $m = 1$.
  Sum of one even and one odd is odd. There are no two evens and no two odds $\to$ returns 0.

## Brute force
A simulation approach would label $n$ balls with distinct even values and $m$ balls with distinct odd values, iterate over all $\binom{n+m}{2}$ pairs, compute their sum, and check if the sum is even. While $n + m \le 200$ has at most $\approx 20,000$ pairs, combinatorial formulas evaluate the exact count directly in $O(1)$ operations.

## The key observation
By basic number theory:
- $\text{Even} + \text{Even} = \text{Even}$
- $\text{Odd} + \text{Odd} = \text{Even}$
- $\text{Even} + \text{Odd} = \text{Odd}$
Therefore, an even sum occurs in two mutually exclusive scenarios:
1. Both chosen balls are from the $n$ even balls: $\binom{n}{2} = \frac{n(n - 1)}{2}$ ways.
2. Both chosen balls are from the $m$ odd balls: $\binom{m}{2} = \frac{m(m - 1)}{2}$ ways.
The total number of valid pairs is simply:
$\text{Total} = \frac{n(n - 1)}{2} + \frac{m(m - 1)}{2}$.
Notice that if $n < 2$ (e.g. $n = 0$ or $1$), $n(n - 1) / 2 = 0$, which handles boundary conditions naturally without branching.

## Optimal approach
1. Compute the combinations of picking 2 balls from $n$: `even_pairs = n * (n - 1) / 2`.
2. Compute the combinations of picking 2 balls from $m$: `odd_pairs = m * (m - 1) / 2`.
3. Sum the two quantities: `even_pairs + odd_pairs`.
4. Return the result.
5. Complexity:
   - Time Complexity: $O(1)$, requiring a few multiplications, subtractions, and divisions.
   - Space Complexity: $O(1)$, using no additional memory.

## Code walkthrough
- `int evenPairs(int n, int m)`: Function accepting count of even balls $n$ and odd balls $m$.
- `n * (n - 1) / 2`: Count of ways to choose two even balls.
- `m * (m - 1) / 2`: Count of ways to choose two odd balls.
- `return ... + ...;`: Sum of disjoint cases producing an even sum.

## Test it out loud
- Test 1: $n = 1, m = 1 \to 0 + 0 = 0$.
- Test 2: $n = 2, m = 0 \to 1 + 0 = 1$.
- Test 3: $n = 0, m = 2 \to 0 + 1 = 1$.
- Test 4: $n = 100, m = 0 \to \frac{100 \times 99}{2} = 4950$.
- Test 5: $n = 4, m = 3 \to 6 + 3 = 9$.

## Follow-ups
- What if we wanted the number of pairs whose sum is ODD?
  An odd sum requires choosing one even ball and one odd ball: $n \times m$ ways.
- What if we chose 3 balls instead of 2 such that their sum is even?
  Parity of 3 numbers is even if:
  - All 3 are even: $\binom{n}{3}$
  - Exactly 1 is even and 2 are odd: $n \times \binom{m}{2}$
  Total = $\binom{n}{3} + n \binom{m}{2}$.

## Common mistakes
- Adding $n \times m$ (pairs with one even and one odd), which creates an odd sum rather than an even sum.
- Overcomplicating with conditional checks for $n < 2$ or $m < 2$; the formula $\frac{x(x - 1)}{2}$ automatically evaluates to 0 for $x = 0$ and $x = 1$.
