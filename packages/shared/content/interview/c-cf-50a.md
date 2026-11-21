---
id: c-cf-50a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What are the dimensions of the board and dominoes? (The board is an $m \times n$ grid of unit squares, and each domino measures $2 \times 1$ unit squares).
- Can dominoes overlap or extend beyond the board? (No, each domino must lie completely within the board, and no two dominoes may overlap).
- Can dominoes be rotated? (Yes, dominoes can be placed horizontally or vertically).
- What are the constraints on $m$ and $n$? ($1 \le m, n \le 10,000$).
- What should be returned? (The maximum number of $2 \times 1$ dominoes that can be packed simultaneously onto the board).

## Examples to say out loud

- Even dimension: `m = 2, n = 4`. Total squares is $2 \times 4 = 8$. Each domino occupies 2 squares. We can place $8 / 2 = 4$ dominoes with zero empty squares. Output is 4.
- Odd dimensions: `m = 3, n = 3`. Total squares is $3 \times 3 = 9$. Because each domino covers 2 squares, the theoretical upper bound is $\lfloor 9 / 2 \rfloor = 4$. Four dominoes cover 8 squares, leaving 1 empty square. Output is 4.
- Tiny board: `m = 1, n = 1`. Total squares is 1. No $2 \times 1$ domino fits. Output is 0.

## Brute force

A recursive backtracking algorithm places dominoes on empty grid cells, backtracking when no more dominoes fit, to search for the maximum placement. However, exploring all tiling configurations on an $m \times n$ board has exponential complexity ($O(2^{m \times n})$), which is completely unnecessary for rectangular domino packing.

## The key observation

The total area of the board is $m \times n$ unit squares. Since each domino covers exactly 2 unit squares, the absolute theoretical upper bound on the number of dominoes is $\lfloor (m \times n) / 2 \rfloor$.
This upper bound is always achievable:
1. If at least one dimension (say $m$) is even, we can tile the board entirely with $m / 2 \times n$ dominoes, leaving 0 empty squares.
2. If both $m$ and $n$ are odd, we can tile the $(m - 1) \times n$ subgrid completely (since $m - 1$ is even), leaving a $1 \times n$ strip. In this strip, we place $\lfloor n / 2 \rfloor$ dominoes, leaving exactly 1 square empty.
Thus, the maximum number of dominoes is always $\lfloor (m \times n) / 2 \rfloor$.

## Optimal approach

1. Compute the total number of squares on the board: $m \times n$.
2. Divide by 2 using integer division: `(m * n) / 2`.
3. Use 64-bit integer arithmetic during the multiplication to prevent 32-bit overflow when $m, n \le 10,000$.
4. Return the integer result.

Complexity:
- Time: `O(1)` as it requires only a single multiplication and division.
- Space: `O(1)` auxiliary space as no additional data structures are used.

## Code walkthrough

In the reference implementation:
- `(long long)m * n`: casts to a 64-bit integer to prevent overflow when $m \times n$ reaches $10^8$.
- `/ 2`: performs integer division (truncating towards zero) to calculate the maximum number of non-overlapping $2 \times 1$ tiles.
- `(int)(...)`: casts the final result back to a 32-bit integer for the return type.

## Test it out loud

- `m = 1, n = 1`:
  - $1 \times 1 / 2 = 0$. Returns 0.
- `m = 1, n = 2`:
  - $1 \times 2 / 2 = 1$. Returns 1.
- `m = 2, n = 4`:
  - $2 \times 4 / 2 = 4$. Returns 4.
- `m = 3, n = 3`:
  - $3 \times 3 / 2 = 9 / 2 = 4$. Returns 4.
- `m = 10000, n = 10000`:
  - $10^8 / 2 = 50,000,000$. Returns 50000000.

## Follow-ups

- What if the board has missing or defective squares (checkerboard deficit)?
  If cells are removed from the board, we color the board like a chessboard (black and white). Every $2 \times 1$ domino must cover exactly one black square and one white square. We can formulate the problem as Maximum Bipartite Matching using Hopcroft-Karp or max-flow.
- What if the dominoes are $k \times 1$ instead of $2 \times 1$?
  The general tiling problem for $k \times 1$ on an $m \times n$ grid can be achieved greedily along rows and columns, achieving $\lfloor (m \times n) / k \rfloor$ if at least one dimension is divisible by $k$.

## Common mistakes

- Integer overflow during multiplication: when $m = 10000$ and $n = 10000$, $m \times n = 10^8$, which fits in signed 32-bit integer, but if bounds were up to $10^5$, 32-bit integers would overflow.
- Over-complicating with dynamic programming or backtracking when a closed-form formula exists.
- Forgetting that an odd by odd board leaves exactly 1 square uncovered.

## Further reading

- Domino tiling theory and Kasteleyn's formula for counting tilings.
- Maximum bipartite matching on grid graphs.
