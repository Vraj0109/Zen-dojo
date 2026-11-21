---
id: c-cf-791a
pattern: cses-codeforces
difficulty: easy
optimal: "O(log(b/a)) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the initial weights? Limak weighs $a$, and Bob weighs $b$.
- What is guaranteed about initial weights? $1 \le a \le b \le 10$.
- How do their weights change each year?
  - Limak's weight triples every year: $a_{\text{new}} = 3 \times a$.
  - Bob's weight doubles every year: $b_{\text{new}} = 2 \times b$.
- What is the stopping condition? Find the minimum full integer years until Limak's weight is strictly greater than Bob's ($a > b$).
- What if their weights are equal? If $a = b$ after a year, Limak is not strictly heavier yet; another year is required.

## Examples to say out loud
- Consider $a = 4$ and $b = 7$.
  - Initial: Limak = 4, Bob = 7. ($4 \le 7$)
  - Year 1: Limak = $4 \times 3 = 12$, Bob = $7 \times 2 = 14$. ($12 \le 14$)
  - Year 2: Limak = $12 \times 3 = 36$, Bob = $14 \times 2 = 28$. ($36 > 28$)
  Limak is strictly heavier after 2 years.
  Result: 2.
- Consider $a = 4$ and $b = 9$.
  - Year 1: 12 vs 18.
  - Year 2: 36 vs 36 (equal, not strictly greater).
  - Year 3: 108 vs 72 ($108 > 72$).
  Result: 3.
- Consider $a = 1, b = 1$.
  Year 1: 3 vs 2 ($3 > 2$) $\to$ returns 1.

## Brute force
Because $a$ triples while $b$ doubles, the ratio of their weights grows by a factor of $1.5$ each year:
$\frac{a \cdot 3^t}{b \cdot 2^t} = \frac{a}{b} \cdot (1.5)^t > 1 \iff 1.5^t > \frac{b}{a}$.
With initial weights $\le 10$, $\frac{b}{a} \le 10$. Since $1.5^6 \approx 11.39 > 10$, the loop will run at most 6 or 7 iterations in the worst possible case. A step-by-step simulation is instantaneous and optimal.

## The key observation
We simply simulate the yearly growth using a while loop:
As long as $a \le b$:
- Multiply $a$ by 3: $a \leftarrow a \times 3$.
- Multiply $b$ by 2: $b \leftarrow b \times 2$.
- Increment year count: $\text{years} \leftarrow \text{years} + 1$.
When $a > b$, return `years`.

## Optimal approach
1. Initialize an integer counter `years = 0`.
2. While $a \le b$:
   - Multiply $a$ by 3: `a *= 3`.
   - Multiply $b$ by 2: `b *= 2`.
   - Increment `years++`.
3. Return `years`.
4. Complexity:
   - Time Complexity: $O(\log_{1.5}(b / a))$ iterations. For $a, b \le 10$, the loop runs at most 6 times, taking less than 1 microsecond.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `int years = 0;`: Track the number of elapsed years.
- `while (a <= b)`: Continue as long as Limak is lighter than or equal to Bob.
- `a *= 3; b *= 2;`: Apply Limak's tripling growth and Bob's doubling growth.
- `years++;`: Advance the calendar year.
- `return years;`: Return minimal years when $a > b$.

## Test it out loud
- Test 1: $a = 1, b = 1 \to$ year 1: $a = 3, b = 2$ ($3 > 2$) $\to$ returns 1.
- Test 2: $a = 1, b = 2 \to$ year 1: 3 vs 4; year 2: 9 vs 8 ($9 > 8$) $\to$ returns 2.
- Test 3: $a = 2, b = 5 \to$ year 1: 6 vs 10; year 2: 18 vs 20; year 3: 54 vs 40 $\to$ returns 3.
- Test 4: $a = 10, b = 10 \to$ year 1: 30 vs 20 $\to$ returns 1.
- Test 5: $a = 1, b = 10 \to$ returns 6.

## Follow-ups
- Can this be solved in $O(1)$ arithmetic without a loop?
  Yes, using logarithms:
  $a \cdot 3^t > b \cdot 2^t \implies \left(\frac{3}{2}\right)^t > \frac{b}{a} \implies t > \frac{\ln(b / a)}{\ln(1.5)}$.
  Hence $t = \lfloor \frac{\ln(b / a)}{\ln(1.5)} \rfloor + 1$. Due to floating-point imprecision when $a \cdot 3^t = b \cdot 2^t$, integer simulation is safer and just as fast.
- What if $a$ and $b$ can be up to $10^9$?
  Even for $\frac{b}{a} = 10^9$, $\log_{1.5}(10^9) \approx 51$ iterations, still running instantaneously. 64-bit integers (`long long`) prevent overflow.

## Common mistakes
- Using `a < b` instead of `a <= b` as the loop condition: when weights are equal, Limak is not strictly bigger yet, so the loop must continue.
- Integer overflow if weights were large and 32-bit integers were used (not an issue here since $a, b \le 10$).
