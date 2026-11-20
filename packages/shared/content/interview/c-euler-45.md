---
id: c-euler-45
pattern: cses-euler
difficulty: hard
optimal: "O(sqrt(ans)) time, O(1) space"
reviewed: false
---

## Clarify first
- What are the definitions of the polygonal numbers?
  - Triangular numbers: $T(n) = \frac{n(n + 1)}{2}$
  - Pentagonal numbers: $P(n) = \frac{n(3n - 1)}{2}$
  - Hexagonal numbers: $H(n) = n(2n - 1)$
- What is required? Find the smallest integer strictly greater than `after` that is simultaneously triangular, pentagonal, and hexagonal.
- What are the bounds on `after`? $0 \le \text{after} \le 10^{12}$.
- Does the answer fit in standard integer types? For `after = 10^{12}`, the answer can exceed $10^{14}$, requiring 64-bit integer types (`long long` in C++, `long` in Java).

## Examples to say out loud
- Consider `after = 0`.
  $T(1) = P(1) = H(1) = 1$.
  $1 > 0$, so the answer is 1.
- Consider `after = 1`.
  The next number that is triangular, pentagonal, and hexagonal is 40755:
  $T(285) = 40755$, $P(165) = 40755$, $H(143) = 40755$.
  Result: 40755.
- Consider `after = 40755`.
  The next number is $H(27777) = 1,533,776,805$.

## Brute force
A three-pointer approach might generate triangular, pentagonal, and hexagonal sequences simultaneously, advancing the smallest index. However, calculating triangular numbers is redundant due to a key algebraic identity.

## The key observation
Observe the relation between hexagonal and triangular numbers:
$H(n) = n(2n - 1) = \frac{(2n - 1)((2n - 1) + 1)}{2} = T(2n - 1)$.
Every hexagonal number is identically a triangular number with an odd index $2n - 1$.
Therefore, any number that is hexagonal is automatically triangular.
We only need to iterate over hexagonal numbers $H(n) = n(2n - 1)$ strictly greater than `after` and test if $H(n)$ is also pentagonal.
To test if a number $x$ is pentagonal, solve $x = \frac{m(3m - 1)}{2} \implies 3m^2 - m - 2x = 0$.
By the quadratic formula: $m = \frac{1 + \sqrt{1 + 24x}}{6}$.
$x$ is pentagonal if and only if $1 + 24x$ is a perfect square and $(1 + \sqrt{1 + 24x})$ is divisible by 6.

## Optimal approach
1. Define a helper `isPentagonal(x)`:
   - Compute $d = 1 + 24x$.
   - Calculate integer square root $r = \lfloor \sqrt{d} \rfloor$.
   - Return `true` if $r \times r == d$ and $(1 + r) \pmod 6 == 0$, else `false`.
2. Iterate $n = 1, 2, 3, \dots$:
   - Compute $h = n(2n - 1)$.
   - If $h > \text{after}$ and `isPentagonal(h)`:
     - Return $h$.
3. Complexity:
   - Time Complexity: $O(\sqrt{\text{ans}})$ iterations. For $\text{ans} \approx 1.5 \times 10^9$, $n \approx 27,777$, taking less than 1 millisecond. Even for $\text{ans} \approx 10^{14}$, $n \approx 5 \times 10^6$ iterations, running in under 50 milliseconds.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `long long d = 1 + 24 * x;`: Form discriminant for the pentagonal inverse equation.
- `long long r = (long long)sqrtl((long double)d); while (r * r > d) r--; while ((r + 1) * (r + 1) <= d) r++;`: Exact integer square root without floating-point inaccuracies.
- `return r * r == d && (1 + r) % 6 == 0;`: Verification of integrality for $m$.
- `for (long long n = 1;; n++)`: Generate hexagonal numbers sequentially.
- `if (h > after && isPent(h)) return h;`: Filter values strictly exceeding the threshold.

## Test it out loud
- Test 1: `after = 0` $\to n = 1, h = 1$, $1 + 24 = 25 \to r = 5$, $(1+5)\%6 == 0 \to$ returns 1.
- Test 2: `after = 1` $\to$ reaches $n = 143, h = 40755 \to$ returns 40755.
- Test 3: `after = 40754` $\to$ returns 40755.
- Test 4: `after = 40755` $\to$ reaches $n = 27777 \to$ returns 1533776805.

## Follow-ups
- How to start directly near `after` rather than $n = 1$?
  Set $n = \max(1\text{LL}, \lfloor \sqrt{\text{after} / 2} \rfloor)$, instantly jumping to values where $h > \text{after}$.
- Can this be formulated as a Diophantine equation?
  Yes, equating $n(2n-1) = \frac{m(3m-1)}{2}$ yields a generalized Pell equation $(6m - 1)^2 - 3(4n - 1)^2 = -2$, whose solutions can be generated exponentially fast via matrix exponentiation.

## Common mistakes
- Generating triangular numbers, which grow at half the rate and take twice as many iterations.
- Floating-point imprecision when using `sqrt` directly on 64-bit integers near $10^{14}$; exact integer square root checks are necessary.
- 32-bit integer overflow: $24 \times x$ for $x \approx 10^{12}$ reaches $2.4 \times 10^{13}$, which exceeds 32 bits.
