---
id: c-atc-abc085-c
pattern: cses-atcoder
difficulty: medium
optimal: "O(n^2) time (about 2 million steps), O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What bill denominations are used? (Three denominations: 10,000 yen, 5,000 yen, and 1,000 yen).
- How many total bills must be in the bag? (Exactly $n$ bills in total: $a + b + c = n$, where $a, b, c \ge 0$).
- What is the target monetary total? (The total value of all $n$ bills must equal $y$ yen).
- What are the constraints on $n$ and $y$? ($1 \le n \le 2000$, and $1000 \le y \le 20,000,000$, with $y$ always a multiple of 1000).
- What should be returned? (The count of valid triples $(a, b, c)$ satisfying both the count and value constraints).

## Examples to say out loud

- Stated example: `n = 9, y = 45000`.
  - Triple 1: $a = 0$ (10,000 yen), $b = 9$ (5,000 yen), $c = 0$ (1,000 yen) $\implies 0 + 45000 + 0 = 45000$. Count is 9 bills.
  - Triple 2: $a = 4$ (10,000 yen), $b = 0$ (5,000 yen), $c = 5$ (1,000 yen) $\implies 40000 + 0 + 5000 = 45000$. Count is 9 bills.
  - Total valid triples: 2.
- Impossible configuration: `n = 20, y = 196000`.
  - Max possible value from 20 bills is $20 \times 10,000 = 200,000$. However, each substitution of 10,000 by 5,000 or 1,000 reduces the total by multiples of 5,000 or 9,000. No combination yields 196,000. Returns 0.
- Single bill: `n = 1, y = 1000`. One 1,000 yen bill. Returns 1.

## Brute force

A naive brute-force approach uses three nested loops over the possible number of each bill type: $a \in [0, n]$, $b \in [0, n]$, and $c \in [0, n]$. For each triple, check if $a + b + c == n$ and $10000a + 5000b + 1000c == y$. Testing all combinations requires $(n + 1)^3 \approx 2000^3 = 8 \times 10^9$ iterations, which takes several seconds and times out.

## The key observation

The condition that the bag holds exactly $n$ bills gives a linear equality constraint: $a + b + c = n$. Once we choose the number of 10,000-yen bills $a$ and the number of 5,000-yen bills $b$, the number of 1,000-yen bills is strictly determined: $c = n - a - b$. If $c \ge 0$, we only need to verify whether $10000a + 5000b + 1000c == y$. This eliminates the third loop entirely, reducing the search space from $O(n^3)$ to $O(n^2)$.

## Optimal approach

1. Initialize an integer counter `count = 0`.
2. Iterate `a` (count of 10,000-yen bills) from 0 up to `n`:
   a. Iterate `b` (count of 5,000-yen bills) from 0 up to `n - a`:
      - Set `c = n - a - b` (count of 1,000-yen bills).
      - Check if $10000 \cdot a + 5000 \cdot b + 1000 \cdot c == y$.
      - If true, increment `count`.
3. Return `count`.

Complexity:
- Time: `O(n^2)` because the nested loops evaluate $\sum_{a=0}^n (n - a + 1) = \frac{(n + 1)(n + 2)}{2} \approx 2 \times 10^6$ pairs, running in under 10 ms.
- Space: `O(1)` auxiliary space as only scalar counters and loop variables are used.

## Code walkthrough

In the reference implementation:
- `int count = 0;`: tracks the number of satisfying combinations.
- `for (int a = 0; a <= n; a++)`: fixes the number of 10,000-yen bills.
- `for (int b = 0; a + b <= n; b++)`: fixes the number of 5,000-yen bills such that the remaining bills $c \ge 0$.
- `int c = n - a - b;`: computes the forced number of 1,000-yen bills.
- `if (10000LL * a + 5000LL * b + 1000LL * c == y) count++;`: verifies total monetary value using 64-bit integer arithmetic to prevent overflow.
- `return count;`: returns the total valid configurations.

## Test it out loud

- `n = 1, y = 1000`:
  - $a = 0, b = 0 \implies c = 1$. Total value is $1000 == 1000$. `count = 1`. Returns 1.
- `n = 1, y = 2000`:
  - $a = 0, b = 0 \implies c = 1$, value 1000 != 2000.
  - $a = 0, b = 1 \implies c = 0$, value 5000 != 2000.
  - $a = 1, b = 0 \implies c = 0$, value 10000 != 2000.
  - Returns 0.
- `n = 2000, y = 20000000`:
  - $a = 2000, b = 0 \implies c = 0$, value $2000 \times 10000 = 20,000,000$. Only 1 triple exists. Returns 1.

## Follow-ups

- Can we solve this in $O(n)$ time?
  Yes, divide the value equation by 1000: $10a + 5b + c = y / 1000$. Substitute $c = n - a - b$ into this equation:
  $$10a + 5b + (n - a - b) = 9a + 4b + n = y / 1000 \implies 4b = y / 1000 - n - 9a$$
  For each $a \in [0, n]$, the value of $b$ is uniquely determined: if the right-hand side is non-negative and divisible by 4, we compute $b$, then $c = n - a - b$, and check if $b \ge 0, c \ge 0$. This reduces the time to $O(n)$ (2000 operations).

## Common mistakes

- 32-bit overflow when calculating the sum: $10000 \times 2000 = 2 \times 10^7$ fits in signed 32-bit `int`, but $y$ can reach $20,000,000$, and in larger variations intermediate multiplications can overflow without `long long`.
- Looping $b$ up to $n$ instead of $n - a$, allowing $a + b > n$ which produces negative values for $c$.
- Trying to return any one triple instead of counting all valid triples as required by this specification.

## Further reading

- System of linear Diophantine equations with bounded variables.
- Integer linear programming and constraint reduction.
