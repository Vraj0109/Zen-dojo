---
id: c-euler-28
pattern: cses-euler
difficulty: easy
optimal: "O(side) time, O(1) space"
reviewed: false
---

## Clarify first

- How is the spiral constructed? (Starting with 1 at the center, moving right, down, left, up, winding outward clockwise/counterclockwise to form nested concentric square rings).
- What is meant by the diagonals? (Both main diagonals of the $(side \times side)$ grid, with the center 1 counted exactly once).
- What are the constraints on `side`? (`1 <= side <= 100000`, and `side` is guaranteed to be odd).
- Can the answer exceed 32-bit signed integers? (Yes, for $\text{side} = 100,000$, the sum of the cubes of odd integers reaches roughly $6.6 \times 10^{14}$, requiring 64-bit integer types like `long long` in C++ or `long` in Java).

## Examples to say out loud

- Base case: `side = 1`. A $1 \times 1$ grid contains only the number 1. The sum is 1.
- Small case: `side = 3`. The center is 1. The 4 corners of the $3 \times 3$ outer ring are 3, 5, 7, and 9. Total sum is $1 + 3 + 5 + 7 + 9 = 25$.
- Stated example: `side = 5`. The $5 \times 5$ outer ring adds corners 13, 17, 21, and 25. Adding these to the previous total: $25 + (13 + 17 + 21 + 25) = 25 + 76 = 101$.

## Brute force

A brute-force approach allocates a 2D matrix of size $\text{side} \times \text{side}$, simulates the spiral path cell by cell from the center outward, placing integers $1, 2, \dots, \text{side}^2$, and then iterates along the two main diagonals to sum the values. For $\text{side} = 100,000$, creating a matrix requires $10^{10}$ cells ($\approx 40$ GB of memory) and $10^{10}$ operations, which causes severe memory exhaustion and takes several seconds.

## The key observation

We do not need to construct the grid. For any concentric odd square ring of side length $s$ ($s = 3, 5, 7, \dots$), the largest value in that ring is always the top-right corner, equal to $s^2$. The four corners of the ring are spaced exactly $s - 1$ steps apart:
- Corner 1: $s^2$
- Corner 2: $s^2 - (s - 1)$
- Corner 3: $s^2 - 2(s - 1)$
- Corner 4: $s^2 - 3(s - 1)$
Summing these four corners gives:
$$4s^2 - 6(s - 1)$$
We can simply iterate through all odd values of $s$ from 3 to `side` and accumulate this expression.

## Optimal approach

1. Initialize a 64-bit accumulator `total = 1` (accounting for the center value 1).
2. Loop over each odd ring size `s` starting at 3 up to `side`, incrementing `s += 2`:
   a. Compute the sum of the four corners: `4 * s * s - 6 * (s - 1)`.
   b. Add this corner sum to `total`.
3. Return `total`.

Complexity:
- Time: `O(side)` because there are $\frac{\text{side} - 1}{2} \le 50,000$ rings, with each ring evaluated using a few constant-time arithmetic operations.
- Space: `O(1)` auxiliary space as no grid is allocated and only scalar registers are used.

## Code walkthrough

In the reference implementation:
- `long long total = 1;`: starts with the central cell value at coordinates $(0, 0)$.
- `for (long long s = 3; s <= side; s += 2)`: visits each concentric odd square boundary in turn.
- `total += 4 * s * s - 6 * (s - 1);`: directly adds the four corner values using algebraic simplification, computing the term entirely with 64-bit arithmetic.
- `return total;`: yields the accumulated diagonal sum.

## Test it out loud

- `side = 1`:
  - Loop from $s = 3$ to $s \le 1$ does not execute.
  - Returns `total = 1`.
- `side = 3`:
  - Ring $s = 3$: $4 \times 3^2 - 6(2) = 36 - 12 = 24$.
  - `total = 1 + 24 = 25`. Returns 25.
- `side = 5`:
  - Ring $s = 3$: adds 24 (`total = 25`).
  - Ring $s = 5$: $4 \times 25 - 6(4) = 100 - 24 = 76$.
  - `total = 25 + 76 = 101`. Returns 101.

## Follow-ups

- Can we solve this in $O(1)$ time without a loop?
  Yes, by summing the closed-form expressions across all rings. Let $k = \frac{s - 1}{2}$ be the ring index for $k = 1 \dots m$ where $m = \frac{\text{side} - 1}{2}$. Since $s = 2k + 1$, the sum of the four corners is $16k^2 + 4k + 4$. Using standard polynomial sum formulas for $\sum k^2$ and $\sum k$, the entire sum simplifies to:
  $$\text{total} = 1 + \frac{16m(m+1)(2m+1)}{6} + \frac{4m(m+1)}{2} + 4m = \frac{16m^3 + 30m^2 + 26m + 3}{3}$$
  This evaluates in $O(1)$ arithmetic operations.

## Common mistakes

- Using 32-bit signed integers: for $\text{side} = 100,000$, intermediate products like $4s^2$ reach $4 \times 10^{10} > 2^{31} - 1$, resulting in 32-bit signed integer overflow.
- Stepping $s$ by 1 instead of 2, accidentally evaluating even grid dimensions which do not have a single center point.
- Double-counting the center 1 by starting the corner summation at $s = 1$.

## Further reading

- Ulam spiral and number theoretical patterns on polynomial curves.
- Polynomial summation formulas via Faulhaber's formula.
