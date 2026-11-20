---
id: cses-forest-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n^2 + q) time, O(n^2) space"
reviewed: false
---

## Clarify first
- What does the grid represent? An n x n square map of a forest, where '*' is a tree and '.' is an empty square.
- How are query rectangles defined? Each query [y1, x1, y2, x2] defines a rectangle by its top-left corner (row y1, col x1) and bottom-right corner (row y2, col x2), using 1-based indexing.
- Are borders included in the rectangle? Yes, all cells (r, c) with y1 <= r <= y2 and x1 <= c <= x2 are included.
- Does the forest grid change between queries? No, the grid is static with zero updates.
- What are the constraints on n and queries? Grid size n is up to 1000, and number of queries is up to 200,000.

## Examples to say out loud
Suppose n = 4 and forest grid is:
- Row 1: ".*.."
- Row 2: "*.**"
- Row 3: "**.."
- Row 4: "****"
Consider queries:
- Query [2, 2, 3, 4]: rows 2 to 3, columns 2 to 4. Cells are (2, 2)='.', (2, 3)='*', (2, 4)='*', (3, 2)='*', (3, 3)='.', (3, 4)='.'. Total trees = 3.
- Query [3, 1, 3, 1]: single square at (3, 1) has '*', so 1 tree.
- Query [1, 1, 2, 2]: top-left 2x2 square contains trees at (1, 2) and (2, 1), giving 2 trees.
Output: [3, 1, 2].

## Brute force
A naive approach loops over every row r from y1 to y2 and column c from x1 to x2 for each query, counting '*' characters.
In the worst case, a single query covering the full grid takes O(n^2) operations.
With 200,000 queries on a 1000 x 1000 grid, this results in O(q * n^2) = 2 * 10^11 operations, which will cause a massive timeout.
Since the grid never changes, precomputing a 2D prefix sum table answers any subgrid query in O(1) time.

## The key observation
We can compute a 2D prefix sum table `pref[i][j]` representing the total number of trees in the rectangular region from (1, 1) to (i, j).
The prefix sum table satisfies the 2D recurrence:
`pref[i][j] = tree(i, j) + pref[i - 1][j] + pref[i][j - 1] - pref[i - 1][j - 1]`.
Once computed in O(n^2) time, any arbitrary subgrid [y1, x1, y2, x2] can be evaluated using 2D inclusion-exclusion in O(1) time:
`trees = pref[y2][x2] - pref[y1 - 1][x2] - pref[y2][x1 - 1] + pref[y1 - 1][x1 - 1]`.

## Optimal approach
1. Allocate a 2D array `p` of size (n + 1) x (n + 1) initialized to 0.
2. Fill `p` iteratively for i from 1 to n and j from 1 to n:
   - Determine whether current cell has a tree: `tree = (forest[i - 1][j - 1] == '*') ? 1 : 0`.
   - Update: `p[i][j] = tree + p[i - 1][j] + p[i][j - 1] - p[i - 1][j - 1]`.
3. For each query [y1, x1, y2, x2]:
   - Compute: `count = p[y2][x2] - p[y1 - 1][x2] - p[y2][x1 - 1] + p[y1 - 1][x1 - 1]`.
   - Append `count` to the result list.
4. Return the result list.

Complexity: O(n^2 + q) time (O(n^2) preprocessing and O(1) per query), and O(n^2) space for the 2D prefix table.

## Code walkthrough
In C++, `vector<vector<int>> p(n + 1, vector<int>(n + 1, 0))` provides a zero-padded border at row 0 and column 0, which eliminates edge checks for boundary cells.
The nested loop accumulates the sum of the cell above `p[i - 1][j]`, the cell to the left `p[i][j - 1]`, and subtracts the doubly counted diagonal cell `p[i - 1][j - 1]`.
For queries, reading `y1 = q[0], x1 = q[1], y2 = q[2], x2 = q[3]` allows direct inclusion-exclusion lookup in O(1).
Since the total number of trees is at most n * n = 1,000,000, all counts fit comfortably in standard 32-bit signed integers.

## Test it out loud
- Grid with no trees: `forest = ["..", ".."]`, query = [1, 1, 2, 2]. `p` remains all zeroes, output is [0].
- 1x1 grid: `forest = ["*"]`, query = [1, 1, 1, 1]. Output: [1].
- Full grid rectangle: `forest = ["**", "**"]`, query = [1, 1, 2, 2]. `p[2][2] - 0 - 0 + 0 = 4`. Output: [4].
- Diagonal strip: tree at (1, 1), empty at (1, 2) and (2, 1), tree at (2, 2). Rectangle [1, 1, 2, 2] evaluates to 2.

## Follow-ups
- What if trees could be planted or cut down dynamically between queries? A static 2D prefix sum table would take O(n^2) per update. We would use a 2D Fenwick tree (Binary Indexed Tree) to achieve O(log^2 n) updates and O(log^2 n) rectangle queries.
- How much memory does the table consume? A 1000 x 1000 integer table uses approximately 4 MB of memory, well within standard memory limits (512 MB).
- Can this be generalized to 3D? Yes, a 3D prefix sum table uses 8 terms for subcuboid queries via 3D inclusion-exclusion in O(1) time.

## Common mistakes
- Forgetting to add back the top-left intersection `p[y1 - 1][x1 - 1]`: subtracting both strips removes the overlapping subgrid twice, so it must be added back once.
- 0-based vs 1-based indexing confusion: the input string characters are 0-based (`forest[i - 1][j - 1]`), while the prefix table is 1-based with row 0 and column 0 as zeroes.
- Transposing rows and columns: queries are given as [y1, x1, y2, x2] where y is the row index and x is the column index; swapping x and y will produce wrong results on non-symmetric grids.

## Further reading
- 2D prefix sums and summed-area tables
- Inclusion-exclusion principle on multidimensional grids
- 2D Fenwick trees for dynamic 2D range sum queries
