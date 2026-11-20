---
id: cses-mex-grid-construction
pattern: cses-introductory
difficulty: medium
optimal: "O(n^2) time and O(n^2) space"
reviewed: false
---

## Clarify first
- What are the dimensions of the grid? An $n \times n$ square grid.
- How is the value of each cell determined? Cell $(i, j)$ is filled with the mex (minimum excluded non-negative integer) of all numbers to its left in the same row and all numbers above it in the same column.
- What order is the grid filled? Row by row from top to bottom, and left to right within each row.
- What are the constraints on $n$? $1 \le n \le 100$.

## Examples to say out loud
- Consider $n = 3$:
  - Row 0, Col 0: no elements left or above. $\text{mex}(\emptyset) = 0$.
  - Row 0, Col 1: left has $\{0\}$, above has $\emptyset$. $\text{mex}(\{0\}) = 1$.
  - Row 0, Col 2: left has $\{0, 1\}$. $\text{mex}(\{0, 1\}) = 2$.
  - Row 1, Col 0: above has $\{0\}$. $\text{mex}(\{0\}) = 1$.
  - Row 1, Col 1: left has $\{1\}$, above has $\{1\}$. $\text{mex}(\{1\}) = 0$.
  - Row 1, Col 2: left has $\{1, 0\}$, above has $\{2\}$. $\text{mex}(\{0, 1, 2\}) = 3$.
  - Row 2, Col 0: above has $\{0, 1\}$. $\text{mex} = 2$.
  - Row 2, Col 1: left has $\{2\}$, above has $\{1, 0\}$. $\text{mex}(\{0, 1, 2\}) = 3$.
  - Row 2, Col 2: left has $\{2, 3\}$, above has $\{2, 3\}$. $\text{mex}(\{2, 3\}) = 0$.
  - Grid: `[[0, 1, 2], [1, 0, 3], [2, 3, 0]]`.
- Notice the algebraic pattern:
  - $(0, 0) = 0 \oplus 0 = 0$.
  - $(0, 1) = 0 \oplus 1 = 1$.
  - $(1, 1) = 1 \oplus 1 = 0$.
  - $(1, 2) = 1 \oplus 2 = 3$.
  - $(2, 2) = 2 \oplus 2 = 0$.
  - In general, cell $(i, j) = i \oplus j$.

## Brute force
A direct simulation marks used values in the row prefix (up to $j$) and column prefix (up to $i$) using a boolean array of size $2n + 2$, then scans for the smallest unmarked non-negative integer. Because scanning takes $O(n)$ work per cell, simulating all $n^2$ cells takes $O(n^3)$ time. For $n = 100$, $n^3 = 10^6$ operations, which easily runs within time limits. However, recognizing the Nim-sum identity reduces the complexity to $O(n^2)$.

## The key observation
The mex rule defining cell $(i, j)$ is identical to the Sprague-Grundy theorem definition for the independent game of Nim with two piles of sizes $i$ and $j$. By the properties of Nim-addition, the Grundy value of state $(i, j)$ is the bitwise XOR sum:
$$g[i][j] = i \oplus j$$
We can verify this inductively: the mex of $\{i' \oplus j \mid i' < i\} \cup \{i \oplus j' \mid j' < j\}$ is mathematically guaranteed to equal $i \oplus j$. Thus, every cell $(i, j)$ can be evaluated in $O(1)$ time via bitwise XOR without inspecting predecessors.

## Optimal approach
1. Allocate an $n \times n$ matrix of integers.
2. For each row $i$ from $0$ to $n - 1$:
   - For each column $j$ from $0$ to $n - 1$:
     - Either set $g[i][j] = i \oplus j$, or compute the mex over $g[i][k]$ ($k < j$) and $g[k][j]$ ($k < i$).
3. Return the populated matrix.

Complexity:
- Time: $O(n^2)$ using the XOR formula (or $O(n^3)$ using direct mex simulation).
- Space: $O(n^2)$ to store and return the $n \times n$ grid.

## Code walkthrough
- `vector<vector<int>> g(n, vector<int>(n, 0))`: Allocates the grid buffer.
- `vector<bool> used(2 * n + 2, false)`: A boolean tracker for values appearing to the left or above. The mex cannot exceed $i + j \le 2n$.
- `for (int k = 0; k < j; k++) used[g[i][k]] = true`: Gathers numbers in the current row to the left.
- `for (int k = 0; k < i; k++) used[g[k][j]] = true`: Gathers numbers in the current column above.
- `while (used[m]) m++`: Finds the minimum excluded non-negative integer.
- `g[i][j] = m`: Assigns the computed mex.

## Test it out loud
- Test case $1$: $n = 1 \implies [[0]]$.
- Test case $2$: $n = 2 \implies [[0, 1], [1, 0]]$.
- Test case $3$: $n = 3 \implies [[0, 1, 2], [1, 0, 3], [2, 3, 0]]$.
- Test case $4$: $n = 4 \implies$ Cayley table of the Klein four-group under XOR.

## Follow-ups
- How does this connect to game theory? This table represents the Grundy function (Nim-values) for 2-pile Nim where a player can reduce either the first pile (moving left) or the second pile (moving up).
- What if $n$ were up to $10^5$ and we only needed to query cell $(r, c)$? With the XOR formula $r \oplus c$, any individual cell query takes $O(1)$ time and $O(1)$ memory.

## Common mistakes
- Underestimating the maximum possible mex value: If sizing the `used` array as $n$, larger coordinates like $(n - 1, n - 1)$ can have mex up to $2n - 1$, causing index out-of-bounds errors. The array must be sized at least $2n + 2$.
- Confusing 0-indexed and 1-indexed coordinates: The mex rule applies starting with indices $0 \dots n - 1$.

## Further reading
- [Sprague-Grundy Theorem on Wikipedia](https://en.wikipedia.org/wiki/Sprague%E2%80%93Grundy_theorem)
