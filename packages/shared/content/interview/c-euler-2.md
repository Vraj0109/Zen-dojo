---
id: c-euler-2
pattern: cses-euler
difficulty: easy
optimal: "O(log limit) time, O(1) space"
reviewed: false
---

## Clarify first

- What are the starting terms of the sequence? (The sequence begins with 1 and 2, continuing as 3, 5, 8, 13, ...).
- Is the `limit` inclusive or exclusive? (Inclusive: even Fibonacci numbers that do not exceed `limit` are included).
- What is the maximum value of `limit`? (`limit` can reach up to 4 * 10^15, which exceeds 32-bit signed integer limits).
- What should be returned if `limit` is smaller than the first even Fibonacci number? (If `limit` is 1, return 0).
- Does the final sum fit within standard 64-bit integer types? (Yes, the sum of even Fibonacci numbers up to 4 * 10^15 is well within standard 64-bit signed integer limits).

## Examples to say out loud

- Standard case: `limit = 10`. The Fibonacci numbers not exceeding 10 are 1, 2, 3, 5, 8. The even numbers are 2 and 8. Their sum is `2 + 8 = 10`.
- Larger example: `limit = 100`. The Fibonacci numbers up to 100 are 1, 2, 3, 5, 8, 13, 21, 34, 55, 89. The even values are 2, 8, and 34. Their sum is `2 + 8 + 34 = 44`.
- Boundary case: `limit = 1`. The first term 1 is odd, and 2 exceeds the limit. The result is 0.

## Brute force

A recursive calculation of Fibonacci numbers using naive tree recursion (`fib(n) = fib(n-1) + fib(n-2)`) takes `O(2^n)` exponential time and repeatedly recomputes the same states. Alternatively, precomputing and storing an array of all terms up to `limit` requires unnecessary auxiliary heap or vector space. Generating the sequence iteratively with two state variables avoids both drawbacks.

## The key observation

Fibonacci numbers grow exponentially according to the golden ratio ($\phi \approx 1.618$). Because $F_k \approx \phi^k / \sqrt{5}$, there are fewer than 80 Fibonacci numbers below $4 \times 10^{15}$. Furthermore, the parity of the sequence follows a strict repeating pattern of odd, even, odd, odd, even, odd: every third Fibonacci number is even ($F_2=2, F_5=8, F_8=34, \dots$). Iterating linearly using two rolling 64-bit accumulators terminates in dozens of iterations.

## Optimal approach

1. Initialize two 64-bit variables `a = 1` and `b = 2` representing the current and next Fibonacci terms.
2. Maintain an accumulator `total = 0`.
3. While `a <= limit`:
   a. Check if `a` is even (`a % 2 == 0`). If so, add `a` to `total`.
   b. Compute the next term `c = a + b`.
   c. Advance the window: assign `a = b` and `b = c`.
4. Return `total`.

Complexity:
- Time: `O(log limit)` because Fibonacci numbers grow exponentially by a factor of roughly 1.618 per step, requiring at most ~78 steps for `limit <= 4 * 10^15`.
- Space: `O(1)` auxiliary space since only scalar registers are used.

## Code walkthrough

In the reference implementation:
- `long long a = 1, b = 2, total = 0;`: establishes 64-bit state variables to prevent integer overflow.
- `while (a <= limit)`: ensures no terms strictly exceeding `limit` enter the calculation.
- `if (a % 2 == 0) total += a;`: selectively filters and accumulates only the even terms.
- `long long c = a + b; a = b; b = c;`: rolls the Fibonacci state forward in constant time without array allocations.

## Test it out loud

- `limit = 1`:
  - `a = 1`: odd, not added. Next terms become `a = 2, b = 3`.
  - Loop terminates since `a > 1`. Returns `total = 0`.
- `limit = 2`:
  - `a = 1`: odd, loop continues.
  - `a = 2`: even, added to total (`total = 2`). Next `a = 3`.
  - Loop terminates since `3 > 2`. Returns 2.
- `limit = 8`:
  - `a = 2` adds 2.
  - `a = 8` adds 8.
  - Next `a = 13 > 8`, loop exits. Returns 10.

## Follow-ups

- Can we skip parity checking altogether?
  Yes, using the recurrence for even terms directly: $E_n = 4 E_{n-1} + E_{n-2}$, starting with $E_1 = 2$ and $E_2 = 8$. This advances directly through even terms.
- What if queries are issued repeatedly for multiple limits?
  Precompute prefix sums of even Fibonacci numbers once (array of size ~80) and answer queries in `O(log 80) = O(1)` using binary search.

## Common mistakes

- Using 32-bit signed integers (`int` in C++/Java), which overflow around $2 \times 10^9$ when `limit` is up to $4 \times 10^{15}$.
- Starting the sequence from 0 and 1 without accounting for the problem's base specification starting at 1 and 2 (though 0 is even, $0 + 2$ yields identical sums).
- Incrementing beyond `limit` inside the loop before checking the parity and value of the term.

## Further reading

- Properties of the Fibonacci sequence and Binet's formula.
- Modular periodicity and Pisano periods in recurrence relations.
