---
id: cses-chessboard-and-queens
pattern: cses-introductory
difficulty: medium
optimal: "O(8!) time and O(8) space"
reviewed: false
---

## Clarify first
- What are the dimensions of the chessboard? It is a fixed $8 \times 8$ board.
- How are free and reserved squares represented? '.' represents a free square, and '*' represents a blocked square where no queen may be placed.
- How many queens must be placed? Exactly 8 queens.
- What constitutes an attack? Two queens attack each other if they share the same row, column, main diagonal, or anti-diagonal.
- What should be returned? The total number of valid non-attacking 8-queen arrangements on free squares.

## Examples to say out loud
- Consider an empty $8 \times 8$ board (all '.'):
  - This is the standard 8-queens problem.
  - The total number of solutions is well known to be 92.
- Consider a completely blocked board (all '*'):
  - No queens can be placed anywhere. Result = 0.
- Example 1 with a few asterisks:
  - Backtracking explores placements row by row. Any square with '*' is rejected immediately.
  - Out of 92 possible solutions, those that put a queen on a '*' square are pruned. Total remaining solutions = 65.

## Brute force
A naive brute force would select 8 squares out of 64 total squares ($\binom{64}{8} \approx 4.4 \times 10^9$ combinations) and test each combination for attacks and blocked squares. This would perform billions of checks and timeout. Since every row must contain exactly one queen, iterating row by row reduces the search space to $8^8 \approx 1.6 \times 10^7$ candidate placements. With pruning on columns and diagonals, only a few thousand recursive calls are ever made.

## The key observation
Since each of the 8 rows must contain exactly one queen, we can frame the search as placing one queen per row from row 0 to 7. When placing a queen at $(r, c)$:
- Column $c$ cannot be occupied by another queen.
- Main diagonal index $(r + c)$ cannot be occupied ($0 \le r + c < 15$).
- Anti-diagonal index $(r - c + 7)$ cannot be occupied ($0 \le r - c + 7 < 15$).
- Square $(r, c)$ must not be blocked ('*').
By maintaining three boolean lookup tables (or bitmasks), conflicts are checked in $O(1)$ time per cell.

## Optimal approach
1. Define a recursive function `go(row)` that returns the number of valid placements from `row` to 7:
   - Base case: If `row == 8`, all 8 queens are placed safely, return 1.
   - Initialize `total = 0`.
   - Iterate over column $c$ from 0 to 7:
     - Check if $(r, c)$ is blocked ('*') or if column $c$, diagonal $r + c$, or anti-diagonal $r - c + 7$ is already marked. If so, continue.
     - Mark column $c$, diagonal $r + c$, and anti-diagonal $r - c + 7$ as true.
     - Add `go(row + 1)` to `total`.
     - Unmark (backtrack) the three boolean flags.
2. Call `go(0)` and return the result.

Complexity:
- Time: $O(8!)$ worst-case search tree size, which evaluates in under 1 millisecond.
- Space: $O(8)$ recursion stack depth and boolean arrays of size 8 and 16.

## Code walkthrough
- `bool col[8], d1[16], d2[16]`: Lookup tables to check attacks on columns, $45^\circ$ diagonals ($r + c$), and $135^\circ$ diagonals ($r - c + 7$).
- `if (row == 8) return 1`: Successful termination of a complete 8-queen placement.
- `if (b[row][c] == '*' || col[c] || d1[row + c] || d2[row - c + 7]) continue`: Pruning check combining board obstacles and queen attack lines in $O(1)$ time.
- `col[c] = d1[row + c] = d2[row - c + 7] = true`: Places the queen and locks the column and diagonals.
- `col[c] = d1[row + c] = d2[row - c + 7] = false`: Restores state upon backtracking to allow alternate branch exploration.

## Test it out loud
- Test case $1$: Completely open board. Classic 8-queens problem, yields 92.
- Test case $2$: Completely blocked board. Every cell has '*', loop skips all columns at row 0, returns 0.
- Test case $3$: Top-left square blocked (`board[0][0] = '*'`). Queens cannot be placed at $(0, 0)$. Prunes 4 of the 92 standard solutions, leaving 88.

## Follow-ups
- How can we speed this up further? We can represent column and diagonal occupancy as 3 integer bitmasks and use bitwise operations (`~`, `& -x`) to iterate directly over open positions in $O(1)$ bit manipulations.
- What if the board were $N \times N$? For general $N$, this is the $N$-queens problem. Bitmask backtracking solves $N$ up to 16 efficiently, though count sequences for larger $N$ require symmetry exploitation.

## Common mistakes
- Negative index in diagonal array: Row index minus column index $(r - c)$ ranges from $-7$ to $+7$. Forgetting to add offset $+7$ causes out-of-bounds array access.
- Forgetting to unmark visited arrays: Failing to reset boolean flags when backtracking prevents other valid placements from being found.
- Placing multiple queens in the same row: Enforcing recursion per row naturally guarantees that no row ever holds more than one queen.

## Further reading
- [Eight Queens Puzzle on Wikipedia](https://en.wikipedia.org/wiki/Eight_queens_puzzle)
