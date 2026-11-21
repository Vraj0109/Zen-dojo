---
id: c-cf-263a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What are the dimensions of the matrix? (The matrix is fixed at exactly $5 \times 5$).
- What does the matrix contain? (Exactly twenty-four 0s and a single 1).
- What moves are permitted? (In one move, we may swap any two adjacent rows, or any two adjacent columns).
- When is the matrix considered "beautiful"? (When the single 1 is located in the exact center cell, which is row 2, column 2 in 0-based indexing).
- What should be returned? (The minimum number of moves required to move the 1 to the center cell $(2, 2)$).

## Examples to say out loud

- Single move away: `grid` with 1 at row 1, column 4.
  - Target is row 2, column 2.
  - Row distance: $|1 - 2| = 1$ row swap.
  - Column distance: $|4 - 2| = 2$ column swaps.
  - Total moves: $1 + 2 = 3$. Output is 3.
- Already centered: 1 is located at $(2, 2)$.
  - Row distance: $|2 - 2| = 0$, column distance $|2 - 2| = 0$.
  - Total moves: 0. Output is 0.
- Corner position: 1 is at $(0, 0)$.
  - Row moves: $|0 - 2| = 2$, column moves: $|0 - 2| = 2$.
  - Total moves: $2 + 2 = 4$. Output is 4.

## Brute force

A brute-force strategy performs Breadth-First Search (BFS) over the state space of $5 \times 5$ grids. In each step, generate all states reachable by swapping adjacent rows or columns. However, notice that swapping adjacent rows only moves the single 1 up or down by 1 position, and swapping adjacent columns only moves the 1 left or right by 1 position. Simulating full grid states is completely unnecessary.

## The key observation

Row swaps and column swaps are completely independent. Swapping row $r$ with row $r \pm 1$ changes the row coordinate of the 1 by $\pm 1$ without affecting its column coordinate. Similarly, swapping adjacent columns changes its column coordinate by $\pm 1$ without affecting its row coordinate. Moving the 1 from its current location $(r, c)$ to the center $(2, 2)$ requires exactly $|r - 2|$ vertical steps and $|c - 2|$ horizontal steps. This is the Manhattan distance:
$$\text{moves} = |r - 2| + |c - 2|$$

## Optimal approach

1. Iterate through the $5 \times 5$ grid:
   - For row `r` from 0 to 4:
     - For column `c` from 0 to 4:
       - If `grid[r][c] == 1`:
         - Return `abs(r - 2) + abs(c - 2)`.
2. Return -1 if no 1 is found (unreachable per problem constraints).

Complexity:
- Time: `O(1)` because the matrix size is strictly fixed at $5 \times 5 = 25$ cells. Scanning the 25 cells takes constant time.
- Space: `O(1)` auxiliary space as no additional memory is allocated.

## Code walkthrough

In the reference implementation:
- `for (int r = 0; r < 5; r++) for (int c = 0; c < 5; c++)`: scans the fixed 25 elements of the matrix.
- `if (grid[r][c] == 1)`: identifies the unique coordinates $(r, c)$ of the 1.
- `return abs(r - 2) + abs(c - 2);`: evaluates the $L_1$ Manhattan distance from $(r, c)$ to the central coordinate $(2, 2)$.
- `return -1;`: fallback return if the 1 was absent.

## Test it out loud

- 1 at $(2, 2)$:
  - $|2 - 2| + |2 - 2| = 0$. Returns 0.
- 1 at $(0, 0)$:
  - $|0 - 2| + |0 - 2| = 2 + 2 = 4$. Returns 4.
- 1 at $(4, 4)$:
  - $|4 - 2| + |4 - 2| = 2 + 2 = 4$. Returns 4.
- 1 at $(3, 1)$:
  - $|3 - 2| + |1 - 2| = 1 + 1 = 2$. Returns 2.

## Follow-ups

- What if the matrix is $N \times M$ where both $N$ and $M$ are odd?
  The center coordinate is $(\lfloor N / 2 \rfloor, \lfloor M / 2 \rfloor)$. The formula generalizes to $|r - \lfloor N / 2 \rfloor| + |c - \lfloor M / 2 \rfloor|$ in $O(N \times M)$ scan time.
- What if there are multiple 1s and we want to minimize total moves to bring them all together?
  This corresponds to the median problem: the optimal meeting point along each dimension is the median of the row and column coordinates, computable in $O(k \log k)$ where $k$ is the number of 1s.

## Common mistakes

- 1-based versus 0-based indexing confusion: in 1-based indexing the center is $(3, 3)$, while in 0-based indexing the center is $(2, 2)$.
- Simulating the actual swaps in the matrix instead of computing the Manhattan distance directly.
- Continuing to search after finding the 1 instead of returning immediately.

## Further reading

- Manhattan distance metric ($L_1$ norm) in grid graphs.
- 1D median property for minimizing sum of absolute distances.
