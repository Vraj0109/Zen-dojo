---
id: c-atc-abc083-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(n log n) time (about 7 digits per number), O(1) space"
reviewed: false
---

## Clarify first

- What numbers are considered? (Every integer from 1 up to $n$ inclusive).
- What is the condition for including a number? (The sum of the decimal digits of the number must be between $a$ and $b$ inclusive: $a \le \text{digit\_sum}(i) \le b$).
- What value is accumulated into the answer? (The integer $i$ itself is added to the running sum, not its digit sum).
- What are the constraints on $n$, $a$, and $b$? ($1 \le n \le 1,000,000$ and $1 \le a \le b \le 100$).
- Can the total sum exceed standard 32-bit signed integers? (Yes, the sum of all integers up to $10^6$ is $\approx 5 \times 10^{11}$, requiring a 64-bit integer type like `long long` in C++ or `long` in Java).

## Examples to say out loud

- Standard case: `n = 20, a = 2, b = 5`.
  - Qualifying numbers from 1 to 20: 2, 3, 4, 5 (digit sums 2, 3, 4, 5), 11 ($1+1=2$), 12 ($1+2=3$), 13 ($1+3=4$), 14 ($1+4=5$), 20 ($2+0=2$).
  - Sum of these numbers: $2 + 3 + 4 + 5 + 11 + 12 + 13 + 14 + 20 = 84$. Returns 84.
- Boundary case: `n = 1, a = 1, b = 1`. 1 has digit sum 1; returns 1.
- No match case: `n = 9, a = 10, b = 20`. Single-digit numbers 1..9 have digit sums 1..9, none of which reach 10. Returns 0.

## Brute force

A direct simulation iterates through each integer $i$ from 1 to $n$, computes the digit sum of $i$ by extracting digits, checks if the sum falls in $[a, b]$, and adds $i$ to an accumulator. Since $n \le 10^6$ and each number has at most $\approx \log_{10}(n) \le 7$ digits, this requires at most $7 \times 10^6$ loop iterations, which completes in about 20 ms. Because this simulation is already linear in number of digits and runs within milliseconds, it is both simple and optimal.

## The key observation

The constraints ($n \le 10^6$) are small enough that a direct iteration over all $n$ numbers is well within the typical 1-second time limit. For each number $i$, we can extract each decimal digit in base 10 using `i % 10` and `i /= 10` in $O(\log_{10} i)$ steps. Accumulating the matching numbers using a 64-bit integer avoids overflow without needing dynamic programming or digit DP.

## Optimal approach

1. Initialize a 64-bit accumulator `total = 0`.
2. For each integer `i` from 1 up to `n`:
   a. Compute the digit sum `s`:
      - Set `s = 0` and a copy `x = i`.
      - While `x > 0`: add `x % 10` to `s`, then divide `x /= 10`.
   b. Check if $a \le s \le b$.
   c. If so, add `i` to `total`.
3. Return `total`.

Complexity:
- Time: `O(n log n)` (or more precisely $O(n \log_{10} n)$) time. For $n = 1,000,000$, the number of digits is at most 7, resulting in roughly $6 \times 10^6$ basic division and modulo operations.
- Space: `O(1)` auxiliary space because only scalar accumulator and loop variables are used.

## Code walkthrough

In the reference implementation:
- `long long total = 0;`: prevents 32-bit integer overflow by holding sums up to $5 \times 10^{11}$ in a 64-bit integer.
- `for (int i = 1; i <= n; i++)`: iterates sequentially through all candidates from 1 to $n$.
- `for (int x = i; x > 0; x /= 10) s += x % 10;`: extracts decimal digits from least significant to most significant and sums them into `s`.
- `if (s >= a && s <= b) total += i;`: filters by the target range $[a, b]$ and accumulates the actual number `i`.
- `return total;`: returns the accumulated sum.

## Test it out loud

- `n = 10, a = 1, b = 2`:
  - Numbers 1, 2 have digit sums 1, 2 $\implies$ adds 1, 2.
  - Numbers 3..9 have digit sums $> 2 \implies$ skipped.
  - Number 10 has digit sum $1 + 0 = 1 \in [1, 2] \implies$ adds 10.
  - Total is $1 + 2 + 10 = 13$. Returns 13.
- `n = 100, a = 1, b = 100`:
  - Every number from 1 to 100 has digit sum between 1 and 18, which is entirely inside $[1, 100]$.
  - Every number is included: $\sum_{i=1}^{100} i = \frac{100 \times 101}{2} = 5050$. Returns 5050.

## Follow-ups

- What if $n$ is up to $10^{18}$?
  For $n = 10^{18}$, looping through every number is impossible. We would use Digit Dynamic Programming: define DP state `dp(index, sum, is_tight)` to count both the number of valid numbers and the sum of valid numbers with digit sum in $[a, b]$ in $O(18 \times 162) \approx O(1)$ time.
- What if we need to answer many range queries $[l, r]$?
  We can precompute prefix sums `pref[i]` where `pref[i]` is the answer for $n = i$, allowing range queries in $O(1)$ by computing `pref[r] - pref[l - 1]`.

## Common mistakes

- Adding the digit sum `s` instead of the original number `i` to `total`.
- Using 32-bit signed integers for `total`: when $n = 10^6$ and all numbers qualify, the total sum is $\approx 5 \times 10^{11}$, which overflows 32-bit integers ($2.14 \times 10^9$) into negative values.
- Converting each integer to a string (e.g. `to_string(i)`) instead of using integer arithmetic (`% 10`, `/ 10`), incurring substantial string allocation and heap overhead.

## Further reading

- Digit sum properties and casting out nines in modular arithmetic.
- Digit DP (Digit Dynamic Programming) for large $n \le 10^{18}$.
