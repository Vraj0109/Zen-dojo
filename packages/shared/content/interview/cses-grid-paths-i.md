---
id: cses-grid-paths-i
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n^2) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the dimensions and coordinates? An $n \times n$ grid. You start at $(0, 0)$ (top-left) and want to reach $(n - 1, n - 1)$ (bottom-right).
- What movements are permitted? You can only move right or down.
- What do the grid characters mean? '.' denotes an open cell, and '*' denotes a trap that cannot be visited.
- What if the start or destination cell has a trap? The answer is 0.
- What modulo is required? Modulo $10^9 + 7$.
- What are the constraints? $1 \le n \le 1000$.

## Examples to say out loud
- Consider $n = 4$ with grid:
  ```
  ....
  .*..
  ...*
  *...
  ```
  - Traps block routes through $(1, 1)$, $(2, 3)$, and $(3, 0)$.
  - Paths avoiding traps:
    - Down-Right paths navigating around traps total 3 valid routes.
    - Output: 3.
- Edge case: start or finish is blocked:
  - If `grid[0][0] == '*'` or `grid[n-1][n-1] == '*'`, no path can start or finish, output is 0.
- Minimal case: $1 \times 1$ grid `[["."]]`:
  - Start is destination, path length 0 steps, output is 1.

## Brute force
A brute-force solution would use depth-first search or recursive exploration of all paths from $(0, 0)$ to $(n - 1, n - 1)$. On an open $n \times n$ grid, there are $\binom{2n - 2}{n - 1}$ paths. For $n = 1000$, this binomial coefficient has hundreds of digits ($\approx 10^{600}$), which would never terminate. Dynamic programming evaluates all cell path counts in $O(n^2)$ time.

## The key observation
To reach cell $(r, c)$, any valid path must arrive from either the cell directly above $(r - 1, c)$ via a downward move, or from the cell directly to the left $(r, c - 1)$ via a rightward move.
If `grid[r][c] == '*'`, cell $(r, c)$ cannot be traversed, so $\text{dp}[r][c] = 0$.
Otherwise:
$$\text{dp}[r][c] = (\text{dp}[r - 1][c] + \text{dp}[r][c - 1]) \pmod{10^9 + 7}$$
Because $\text{dp}[r][c]$ only depends on the current row and the previous row, space can be compressed to a single 1D array of size $n$, where $\text{dp}[c]$ represents the value from above and $\text{dp}[c - 1]$ represents the value from the left.

## Optimal approach
1. Check edge cases: if $n == 0$, or `grid[0][0] == '*'`, or `grid[n-1][n-1] == '*'`, return 0 immediately.
2. Initialize a 1D DP array of size $n$ filled with 0, and set $\text{dp}[0] = 1$.
3. For each row $r$ from $0$ to $n - 1$:
   - For each column $c$ from $0$ to $n - 1$:
     - If `grid[r][c] == '*'`: set $\text{dp}[c] = 0$.
     - Else if $c > 0$: update $\text{dp}[c] = (\text{dp}[c] + \text{dp}[c - 1]) \pmod{10^9 + 7}$.
4. Return $\text{dp}[n - 1]$.

Complexity:
- Time: $O(n^2)$ because we visit each of the $n^2$ grid cells once, performing $O(1)$ operations per cell. For $n = 1000$, $10^6$ operations finish in $\approx 5$ ms.
- Space: $O(n)$ space using the row-compressed 1D array.

## Code walkthrough
- `if (n == 0 || grid[0][0] == '*' || grid[n - 1][n - 1] == '*') return 0`: Defensive check for blocked endpoints.
- `vector<int> dp(n, 0); dp[0] = 1`: Base case seeding $(0, 0)$ with 1 path.
- `for (int r = 0; r < n; r++)`: Iterates row by row.
- `if (grid[r][c] == '*') dp[c] = 0`: Traps reset the incoming paths for this column to 0.
- `else if (c > 0) dp[c] = (dp[c] + dp[c - 1]) % MOD`: In-place update: `dp[c]` (value from previous row above) is combined with `dp[c - 1]` (value from current row left).
- `return dp[n - 1]`: The destination cell holds the total valid path count.

## Test it out loud
- Test case $1$: `[["."]]`. Returns 1.
- Test case $2$: `[["..", ".."]]`. Paths are (Right, Down) and (Down, Right) $\implies$ returns 2.
- Test case $3$: `[["..", ".*"]]`. Destination cell is blocked $\implies$ returns 0.
- Test case $4$: `[["...", ".*.", "..."]]`. Center is blocked $\implies$ path can only skirt top-right or bottom-left corners $\implies$ returns 2.

## Follow-ups
- What if the grid is $N \times M$ with $N, M \le 10^5$, but the number of traps $K$ is small ($K \le 2000$)? Compute paths using combinatorics $\binom{\Delta r + \Delta c}{\Delta r}$ and use inclusion-exclusion DP over the $K$ traps in $O(K^2)$ time.
- Can we return the lexicographically smallest path? Trace from start to end by greedily attempting Right then Down if the remaining target has $> 0$ paths.

## Common mistakes
- Not checking if start or finish is blocked: Failing to check `grid[0][0] == '*'` will falsely report paths if the DP array seeds `dp[0] = 1`.
- Forgetting to reset trap cells in 1D DP: In 1D DP, if a trap is encountered, `dp[c]` must be explicitly set to 0. Otherwise, stale values from the row above will carry forward.

## Further reading
- [Lattice Path on Wikipedia](https://en.wikipedia.org/wiki/Lattice_path)
