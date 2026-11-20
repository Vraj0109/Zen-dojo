---
id: c-euler-6
pattern: cses-euler
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first

- What is the range of `n`? (`n` is an integer between 1 and 10,000).
- Exactly what difference is requested? (The square of the sum of the first `n` positive integers minus the sum of the squares of the first `n` positive integers: $(\sum_{i=1}^n i)^2 - \sum_{i=1}^n i^2$).
- Can the answer or intermediate calculations overflow 32-bit signed integers? (Yes, for $n = 10000$, the sum is $5 \times 10^7$ and its square is $2.5 \times 10^{15}$, requiring 64-bit integer types like `long long` in C++ or `long` in Java).
- What should be returned for `n = 1`? (For $n = 1$, $1^2 - 1^2 = 0$).

## Examples to say out loud

- Base case: `n = 1`. Sum is 1, square of sum is $1^2 = 1$. Sum of squares is $1^2 = 1$. Difference is $1 - 1 = 0$.
- Small case: `n = 3`. Sum is $1 + 2 + 3 = 6$, squared is $6^2 = 36$. Sum of squares is $1^2 + 2^2 + 3^2 = 1 + 4 + 9 = 14$. Difference is $36 - 14 = 22$.
- Standard case: `n = 10`. Sum is 55, squared is $55^2 = 3025$. Sum of squares is $1^2 + \dots + 10^2 = 385$. Difference is $3025 - 385 = 2640$.

## Brute force

A direct iterative simulation runs a loop `for i = 1 to n`, maintaining two 64-bit running totals: `sum += i` and `sum_sq += i * i`. After the loop finishes, compute `sum * sum - sum_sq`. This approach runs in `O(n)` time and `O(1)` space. While $n \le 10000$ executes quickly enough in iteration, looping is unnecessary because well-known closed-form mathematical identities allow computing the answer in constant `O(1)` time.

## The key observation

Both quantities have exact closed-form algebraic formulas:
1. The sum of the first $n$ integers is given by the triangular number formula: $s = \frac{n(n + 1)}{2}$.
2. The sum of the squares of the first $n$ integers is given by the square pyramidal number formula: $q = \frac{n(n + 1)(2n + 1)}{6}$.
Evaluating both formulas with 64-bit arithmetic yields the answer $(s^2 - q)$ directly in $O(1)$ operations without any loops.

## Optimal approach

1. Cast `n` to a 64-bit signed integer.
2. Compute the sum of the first `n` numbers: `s = n * (n + 1) / 2`.
3. Compute the sum of squares: `q = n * (n + 1) * (2 * n + 1) / 6`.
4. Return `s * s - q`.

Complexity:
- Time: `O(1)` because the calculation uses a fixed number of basic arithmetic operations (multiplications, additions, and divisions).
- Space: `O(1)` auxiliary space since only scalar integer variables are allocated.

## Code walkthrough

In the reference implementation:
- `long long s = (long long)n * (n + 1) / 2;`: computes the Gaussian sum in 64-bit integers.
- `long long q = (long long)n * (n + 1) * (2LL * n + 1) / 6;`: computes the sum of squares using `2LL` to ensure the intermediate multiplication does not overflow.
- `return s * s - q;`: squares the linear sum and subtracts the sum of squares, yielding the final difference.

## Test it out loud

- `n = 1`:
  - `s = 1 * 2 / 2 = 1`.
  - `q = 1 * 2 * 3 / 6 = 1`.
  - `s * s - q = 1 - 1 = 0`.
- `n = 2`:
  - `s = 2 * 3 / 2 = 3`.
  - `q = 2 * 3 * 5 / 6 = 5`.
  - `s * s - q = 9 - 5 = 4`.
  - Check by hand: $(1+2)^2 - (1^2+2^2) = 9 - 5 = 4$. Correct.
- `n = 5`:
  - `s = 5 * 6 / 2 = 15`.
  - `q = 5 * 6 * 11 / 6 = 55`.
  - `s * s - q = 225 - 55 = 170`. Correct.

## Follow-ups

- What if $n$ is up to $10^9$?
  The closed-form formulas still apply, but $s^2$ would reach $(10^{18} / 2)^2 \approx 2.5 \times 10^{35}$, which exceeds 64-bit integer capacity. For such large bounds, either 128-bit integers (`__int128`) or arithmetic modulo $M$ (using modular inverse for division by 2 and 6) would be required.
- Can we factor the expression algebraically before calculating?
  Yes: $s^2 - q = \frac{n(n + 1)}{2} \left[ \frac{n(n + 1)}{2} - \frac{2n + 1}{3} \right] = \frac{n(n^2 - 1)(3n + 2)}{12}$. This eliminates one multiplication step.

## Common mistakes

- Performing calculations using 32-bit signed integers: for $n = 10000$, `n * (n + 1) * (2 * n + 1)` reaches $\approx 2 \times 10^{12}$, which overflows a standard 32-bit integer ($2.14 \times 10^9$) and yields negative garbage.
- Omitting `2LL` or 64-bit casting on $n$, causing the intermediate compiler expression to be evaluated as 32-bit `int` prior to assignment.
- Subtracting the square of the sum from the sum of squares instead of the reverse order specified by the problem.

## Further reading

- Derivation of polynomial summation formulas via Faulhaber's formula.
- Square pyramidal numbers and geometric interpretations.
