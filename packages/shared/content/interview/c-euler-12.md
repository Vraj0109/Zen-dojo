---
id: c-euler-12
pattern: cses-euler
difficulty: medium
optimal: "About O(k * sqrt k) time where k is a few thousand for the largest input, O(1) space"
reviewed: false
---

## Clarify first

- What is a triangle number? (The $k$-th triangle number is the sum $T_k = 1 + 2 + \dots + k = \frac{k(k + 1)}{2}$).
- What is meant by "more than minDivisors"? (The number of positive divisors must be strictly greater than `minDivisors`, i.e., $d(T_k) > \text{minDivisors}$).
- What is the range of `minDivisors`? (`1 <= minDivisors <= 500`).
- Can the answer exceed 32-bit integer limits? (Yes, for `minDivisors = 500`, the 12375th triangle number is $76,576,500$, which fits in 32-bit signed integers, but larger queries require 64-bit `long long` for products like $k(k+1)$).
- What should be returned for `minDivisors = 1`? (The first triangle number with $> 1$ divisors is $T_2 = 3$, which has divisors 1 and 3).

## Examples to say out loud

- Small case: `minDivisors = 1`. $T_1 = 1$ has 1 divisor. $T_2 = 3$ has divisors 1 and 3 (total 2 divisors). Since $2 > 1$, output is 3.
- Standard case: `minDivisors = 5`. Let's test triangle numbers:
  - $T_1 = 1$ (1 divisor)
  - $T_2 = 3$ (2 divisors)
  - $T_3 = 6$ (1, 2, 3, 6 $\implies 4$ divisors)
  - $T_4 = 10$ (1, 2, 5, 10 $\implies 4$ divisors)
  - $T_5 = 15$ (1, 3, 5, 15 $\implies 4$ divisors)
  - $T_6 = 21$ (1, 3, 7, 21 $\implies 4$ divisors)
  - $T_7 = 28$ (divisors are 1, 2, 4, 7, 14, 28 $\implies 6$ divisors). Since $6 > 5$, output is 28.

## Brute force

A direct simulation generates triangle numbers $T_k = k(k + 1) / 2$ for $k = 1, 2, 3, \dots$ and counts divisors of $T_k$ by testing every integer $d$ from 1 to $T_k$. Testing up to $T_k$ takes $O(T_k)$ per triangle number. Even testing up to $\sqrt{T_k}$ takes $O(k)$ per step, leading to $\sum_{k=1}^K O(k) = O(K^2)$ overall time. For large divisor counts where $K \approx 10^4$ to $10^5$, this is needlessly slow.

## The key observation

The number of divisors $d(n)$ of an integer with prime factorization $n = \prod p_i^{e_i}$ is given by the multiplicative formula $d(n) = \prod (e_i + 1)$. Furthermore, because $\gcd(k, k + 1) = 1$, the two factors $a$ and $b$ (where one of $k$ or $k + 1$ is divided by 2) are strictly coprime: $\gcd(a, b) = 1$. By the multiplicative property of the divisor function, $d(T_k) = d(a \times b) = d(a) \times d(b)$. We can factor the smaller integers $a$ and $b$ independently up to $\sqrt{a}$ and $\sqrt{b}$, speeding up each step dramatically.

## Optimal approach

1. Implement a helper function `divisors(x)`:
   a. Initialize `count = 1`.
   b. For $p = 2$ up to $p \times p \le x$:
      - If $p$ divides $x$, determine exponent $e$ by dividing $x$ by $p$ repeatedly.
      - Multiply `count *= (e + 1)`.
   c. If the remaining $x > 1$, multiply `count *= 2`.
   d. Return `count`.
2. Loop $k = 1, 2, 3, \dots$:
   a. Set $a = k$ and $b = k + 1$.
   b. If $a$ is even, $a /= 2$; otherwise $b /= 2$.
   c. If `divisors(a) * divisors(b) > minDivisors`, return $k \times (k + 1) / 2$.

Complexity:
- Time: About `O(k * sqrt k)` where $k$ is the index of the first qualifying triangle number (for `minDivisors = 500`, $k = 12,375$, requiring only a few million operations and running in ~20 ms).
- Space: `O(1)` auxiliary space as factorization requires only scalar registers.

## Code walkthrough

In the reference implementation:
- `int divisors(long long x)`: factors `x` via trial division up to $\sqrt{x}$, accumulating the divisor count using prime exponent formula $\prod(e_i + 1)$.
- `long long a = k, b = k + 1; if (a % 2 == 0) a /= 2; else b /= 2;`: divides out the factor of 2 while preserving coprimality $\gcd(a, b) = 1$.
- `if (divisors(a) * divisors(b) > minDivisors)`: evaluates the total divisor count by taking advantage of multiplicativity without factoring the much larger number $T_k$.
- `return k * (k + 1) / 2;`: returns the triangle number in 64-bit precision.

## Test it out loud

- `minDivisors = 1`:
  - `k = 1`: $a = 1 / 1 = 1, b = 2 / 2 = 1$. `divisors(1) * divisors(1) = 1 * 1 = 1 <= 1`.
  - `k = 2`: $a = 2 / 2 = 1, b = 3$. `divisors(1) * divisors(3) = 1 * 2 = 2 > 1`. Returns $T_2 = 3$.
- `minDivisors = 2`:
  - `k = 2`: divisors is 2 (not $> 2$).
  - `k = 3`: $a = 3, b = 4 / 2 = 2$. Divisors: $2 \times 2 = 4 > 2$. Returns $T_3 = 6$.
- `minDivisors = 4`:
  - $T_7 = 28$ has 6 divisors. Returns 28.

## Follow-ups

- Can we optimize the factorization further?
  Yes, by noticing that in consecutive steps $k$ and $k + 1$, the term $k + 1$ in the current step becomes the term $k$ in the next step. Caching `divisors(k)` avoids redundant factorizations.
- What if `minDivisors` is up to 10,000?
  Precomputing a small prime sieve up to $\sqrt{K_{\max}}$ speeds up trial division by testing only prime numbers rather than all integers $p$.

## Common mistakes

- Factoring the full number $T_k = k(k + 1) / 2$ instead of splitting into coprime components $a$ and $b$, doing extra work on numbers that are roughly $k$ times larger.
- Forgetting to multiply by 2 for the leftover prime factor when $x > 1$ in the divisor counting routine.
- Halving both $a$ and $b$ by 2 instead of halving only the even one, producing incorrect non-integer fractions.

## Further reading

- Divisor function properties and multiplicativity in number theory.
- Highly composite numbers and Ramanujan's investigations on divisor bounds.
