---
id: c-atc-abc087-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(a * b * c) time, at most about 132000 steps; O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What coin denominations are available? (Three denominations: 500 yen, 100 yen, and 50 yen).
- How many coins of each type can be used? (We have $a$ coins of 500 yen, $b$ coins of 100 yen, and $c$ coins of 50 yen, where $0 \le a, b, c \le 50$).
- Can we choose zero coins of a particular denomination? (Yes, choosing 0 coins of any denomination is allowed).
- What is the range of target value $x$? ($50 \le x \le 20,000$, and $x$ is guaranteed to be a multiple of 50).
- When are two selections considered different? (Two ways are distinct if they use a different quantity of 500-yen, 100-yen, or 50-yen coins).

## Examples to say out loud

- Standard case: `a = 2, b = 2, c = 2, x = 100`.
  - Option 1: 0 of 500 yen, 1 of 100 yen, 0 of 50 yen ($0 + 100 + 0 = 100$).
  - Option 2: 0 of 500 yen, 0 of 100 yen, 2 of 50 yen ($0 + 0 + 100 = 100$).
  - Total distinct combinations: 2.
- Impossible total: `a = 5, b = 1, c = 0, x = 150`.
  - Available coins can only form multiples of 100 (from 500s and 100s) because $c = 0$.
  - 150 cannot be formed. Returns 0.
- Exact match on single coin: `a = 0, b = 0, c = 1, x = 50`. Returns 1.

## Brute force

A recursive backtracking algorithm could explore decisions coin by coin (either take or skip each individual coin). However, coins of the same denomination are indistinguishable. Because $a, b, c \le 50$, iterating directly over the count of coins used for each denomination ($i \in [0, a]$, $j \in [0, b]$, $k \in [0, c]$) explores $(a + 1)(b + 1)(c + 1) \le 51^3 = 132,651$ states. Checking each state takes $O(1)$ arithmetic, which executes in a few milliseconds and is well within standard execution time limits.

## The key observation

The problem bounds are extremely small: each coin type has at most 51 possible counts $(0 \dots 50)$. Rather than generating full subset trees or using dynamic programming, three nested loops enumerating the count of 500-yen, 100-yen, and 50-yen coins cover all possible combinations. The sum $500i + 100j + 50k$ is compared against $x$, incrementing a counter whenever equality holds.

## Optimal approach

1. Initialize a counter `count = 0`.
2. Loop `i` from 0 up to `a` (count of 500-yen coins):
   a. If $500 \times i > x$, break or continue.
   b. Loop `j` from 0 up to `b` (count of 100-yen coins):
      - If $500 \times i + 100 \times j > x$, break or continue.
      - Loop `k` from 0 up to `c` (count of 50-yen coins):
        - If $500 \times i + 100 \times j + 50 \times k == x$, increment `count`.
3. Return `count`.

Complexity:
- Time: `O(a * b * c)` because there are at most $(a + 1)(b + 1)(c + 1) \le 51 \times 51 \times 51 \approx 132,651$ loop iterations, each performing basic arithmetic.
- Space: `O(1)` auxiliary space as only scalar loop counters are maintained.

## Code walkthrough

In the reference implementation:
- `int count = 0;`: tracks the number of valid coin configurations.
- `for (int i = 0; i <= a; i++)`: iterates through all possible quantities of 500-yen coins.
- `for (int j = 0; j <= b; j++)`: iterates through all possible quantities of 100-yen coins.
- `for (int k = 0; k <= c; k++)`: iterates through all possible quantities of 50-yen coins.
- `if (500 * i + 100 * j + 50 * k == x) count++;`: verifies whether the chosen combination matches the target amount $x$.
- `return count;`: returns the total number of qualifying combinations.

## Test it out loud

- `a = 0, b = 0, c = 1, x = 50`:
  - $i = 0, j = 0, k = 1 \implies 50 \times 1 = 50 == x$. `count = 1`. Returns 1.
- `a = 1, b = 0, c = 0, x = 500`:
  - $i = 1, j = 0, k = 0 \implies 500 \times 1 = 500 == x$. `count = 1`. Returns 1.
- `a = 0, b = 0, c = 1, x = 100`:
  - Max possible value is 50, which cannot reach 100. Returns 0.

## Follow-ups

- Can we reduce the complexity to $O(a \times b)$?
  Yes, by solving for $k$ directly: given $i$ and $j$, the required value from 50-yen coins is $\text{rem} = x - (500i + 100j)$. If $\text{rem} \ge 0$, $\text{rem} \bmod 50 == 0$, and $\text{rem} / 50 \le c$, then exactly one valid $k$ exists. This reduces iterations from 132,651 to $51 \times 51 \approx 2,601$.
- What if $a, b, c$ and $x$ were up to $10^5$?
  We would formulate it as the Unbounded/Bounded Knapsack Coin Change DP, or use generating functions and polynomial convolution.

## Common mistakes

- Looping strictly less than instead of less than or equal (`i < a` instead of `i <= a`), missing the possibility of using all $a$ coins.
- Starting the loop at 1 instead of 0, missing the valid cases where 0 coins of a denomination are selected.
- Assuming the greedy choice (taking the maximum number of 500-yen coins first) works; this problem asks for the count of all combinations, not an optimal coin count.

## Further reading

- Coin change problem formulations (counting combinations vs minimizing coins).
- Generating functions for restricted integer partitions.
