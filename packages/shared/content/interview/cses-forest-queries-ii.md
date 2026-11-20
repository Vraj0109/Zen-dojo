---
id: cses-forest-queries-ii
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n^2 + q log^2 n) time, O(n^2) space"
reviewed: false
---

## Clarify first
- What operations are performed? Type 1: [1, y, x] flips the cell at row y, column x (cutting down a tree or growing a tree). Type 2: [2, y1, x1, y2, x2] counts trees inside the rectangle from (y1, x1) to (y2, x2) inclusive.
- How are rows and columns indexed? 1-based indexing for all coordinates.
- What are the constraints on grid size and queries? n is up to 1000, and number of queries is up to 200,000.
- What should be returned? An array containing only the answers to type 2 queries in order.
- Can values overflow 32-bit integers? The maximum tree count is n * n = 1,000,000, which fits comfortably within standard 32-bit integers.

## Examples to say out loud
Suppose n = 4 and forest grid is:
- Row 1: ".*.."
- Row 2: "*.**"
- Row 3: "**.."
- Row 4: "****"
Consider queries:
- [2, 2, 3, 4, 4]: rows 2 to 4, columns 3 to 4. Currently contains 4 trees. Answer is 4.
- [1, 3, 3]: flip square at row 3, column 3 from '.' to '*'.
- [2, 2, 3, 4, 4]: the same rectangle now contains 5 trees. Answer is 5.
Output list: [4, 5].

## Brute force
A static 2D prefix sum table answers queries in O(1) time, but each type 1 flip would require updating up to O(n^2) cells in the prefix table.
With 200,000 queries, this leads to O(q * n^2) runtime, causing a severe timeout.
A 2D Fenwick tree (Binary Indexed Tree) supports both point updates and 2D prefix sum queries in O(log^2 n) time.

## The key observation
Just as a 1D Fenwick tree manages 1D point updates and prefix sums along bitwise parent links, a 2D Fenwick tree nests the 1D update and query loops inside both dimensions.
An update at (y, x) with delta v loops outer index `i = y; i <= n; i += i & -i` and inner index `j = x; j <= n; j += j & -j`.
A 2D prefix sum `pre(y, x)` sums tree values over `i = y; i > 0; i -= i & -i` and `j = x; j > 0; j -= j & -j`.
Any rectangular query [y1, x1, y2, x2] is computed using 2D inclusion-exclusion over 4 prefix queries:
`trees = pre(y2, x2) - pre(y1 - 1, x2) - pre(y2, x1 - 1) + pre(y1 - 1, x1 - 1)`.

## Optimal approach
1. Allocate a boolean grid `g` and a 2D Fenwick table `t` of size (n + 1) x (n + 1) initialized to 0.
2. Initialize `g[i][j]` with 1 if `forest[i - 1][j - 1] == '*'` else 0, and copy into `t[i][j]`.
3. Build the 2D Fenwick tree in O(n^2) by propagating column prefixes, then row prefixes.
4. Process each query `q`:
   - If `q[0] == 1` (flip [1, y, x]):
     - Delta is -1 if `g[y][x]` is true (tree was cut), or +1 if `g[y][x]` was false (tree grew).
     - Call `upd(y, x, delta)`.
     - Toggle state: `g[y][x] ^= 1`.
   - If `q[0] == 2` (rectangle query [2, y1, x1, y2, x2]):
     - Result is `pre(y2, x2) - pre(y1 - 1, x2) - pre(y2, x1 - 1) + pre(y1 - 1, x1 - 1)`.
     - Append to the answers list.
5. Return the answers list.

Complexity: O(n^2 + q log^2 n) time (O(n^2) build and O(log^2 n) per query), and O(n^2) space for the 2D Fenwick table and grid state.

## Code walkthrough
In C++, `vector<vector<int>> t(n + 1, vector<int>(n + 1, 0))` maintains the 2D Fenwick tree.
The linear O(n^2) initialization pushes each element `t[i][j]` to `t[i][j + (j & -j)]` along columns, and then pushes `t[i][j]` to `t[i + (i & -i)][j]` along rows.
The lambda `upd(y, x, v)` executes nested `i += i & -i` and `j += j & -j` loops.
The lambda `pre(y, x)` executes nested `i -= i & -i` and `j -= j & -j` loops.
When `q[0] == 1`, `g[y][x]` determines the direction of the flip: `upd(y, x, g[y][x] ? -1 : 1)`, followed by flipping `g[y][x] ^= 1`.
For type 2, standard 2D inclusion-exclusion computes the exact rectangular sum.

## Test it out loud
- Repeated flips on 1x1 grid: `forest = ["*"]`, query [2, 1, 1, 1, 1] returns 1. Flip [1, 1, 1] cuts tree. Next query returns 0. Another flip regrows tree. Next query returns 1. Output: [1, 0, 1].
- Growing trees in empty grid: `forest = ["..", ".."]`. Initially 0 trees. Two flips at (1, 2) and (2, 1) add trees. Query on full grid returns 2.
- Tree cut inside 3x3 grid: all 9 trees present. Flipping center cell (2, 2) reduces full sum from 9 to 8, while center query [2, 2, 2, 2] returns 0.
- Inactive regions: updates in row 4 do not affect rectangle queries restricted to rows 1 to 2.

## Follow-ups
- Why is 2D Fenwick preferred over 2D Segment Tree? A 2D Fenwick tree requires only O(n^2) space and has simple, cache-friendly loops. A 2D Segment Tree requires 16n^2 memory and has much higher constant factor overhead.
- What if n was up to 10^5 and updates were sparse? We would use a coordinate-compressed or dynamic (pointer-based) 2D Segment Tree / Fenwick tree with Treaps.
- Can this support range additions and range queries in 2D? Yes, using four 2D Fenwick trees to track coefficient planes, though it is more mathematically involved.

## Common mistakes
- Not tracking current cell state: to flip a cell, you must know whether it currently contains a tree or not; without grid `g`, you cannot tell whether delta is +1 or -1.
- Initializing by calling `upd` for all initial trees: calling `upd` n^2 times takes O(n^2 log^2 n) time; using the O(n^2) propagation build is significantly faster.
- Off-by-one with 1-based indexing in BIT: running loops with `>= 0` instead of `> 0` in `pre()` causes infinite loops due to `0 - (0 & -0) = 0`.

## Further reading
- 2D Fenwick Tree (Binary Indexed Tree) architecture
- O(n^2) Fenwick tree construction algorithm
- Multidimensional range query data structures
