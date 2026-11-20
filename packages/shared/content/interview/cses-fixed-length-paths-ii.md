---
id: cses-fixed-length-paths-ii
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n log^2 n) time, O(n) space"
reviewed: false
---

## Clarify first
- What is given? An undirected tree with n nodes numbered 1 to n, and two distance bounds k1 and k2 with 1 <= k1 <= k2 <= n.
- What should be counted? The number of unordered pairs of distinct nodes (u, v) such that their simple path length is between k1 and k2 edges, inclusive.
- What should be returned? The total count as a 64-bit integer.
- What are the constraints? n up to 200,000, edges form a valid tree.
- Can paths have length 0? No, pairs consist of distinct nodes, so path lengths are at least 1.

## Examples to say out loud
Suppose n = 5, k1 = 2, k2 = 3, edges = [[1, 2], [1, 3], [3, 4], [3, 5]].
- Paths with 2 edges: 2-1-3, 1-3-4, 1-3-5, 4-3-5 (4 paths).
- Paths with 3 edges: 2-1-3-4, 2-1-3-5 (2 paths).
- No paths have length > 3 in this tree.
- Total valid paths with lengths in [2, 3] = 4 + 2 = 6.

Suppose n = 4, k1 = 1, k2 = 3 on a line 1-2-3-4:
- All 6 node pairs have distances in [1, 3].
- Output is 6.

## Brute force
Run BFS from every node v to find distances to all other nodes.
Count how many destinations have distance in [k1, k2], and divide the final sum across all start nodes by 2.
This requires O(n) time per node, yielding O(n^2) total time.
With n = 200,000, 4 * 10^10 operations triggers Time Limit Exceeded.
We instead use Centroid Decomposition combined with a Fenwick tree.

## The key observation
Just as in Fixed-Length Paths I, we decompose the tree using its centroids:
Any path between k1 and k2 edges either:
1. Passes through the centroid c (or has c as an endpoint).
2. Is strictly contained within one of the components formed by deleting c.
For paths passing through c:
If a node in the current child subtree is at distance d from c, its complementary endpoint must have distance d' satisfying:
`k1 - d <= d' <= k2 - d`.
Since d' must lie within a range `[max(0, k1 - d), k2 - d]`, we can maintain earlier depths in a Fenwick tree (Binary Indexed Tree).
Each node queries the Fenwick tree for the count of previously seen nodes with depths in this interval in O(log n) time.
Summing over all subtrees and all centroid levels yields O(n log^2 n) overall time.

## Optimal approach
1. Maintain an iterative centroid decomposition stack initialized with node 1, and boolean array `removed`.
2. Pop component root `start`:
   - Run BFS from `start` to identify component nodes and parent pointers.
   - Compute subtree sizes bottom-up.
   - Walk from `start` to component centroid `c` by following any branch with `size * 2 > total_size`.
3. Count paths passing through `c`:
   - Initialize Fenwick tree and insert depth 0 (representing `c` itself) with weight 1.
   - Maintain a list `added` of inserted depths to quickly undo changes.
   - For each non-removed neighbor `child` of `c`:
     - Run BFS from `child` to collect all nodes in this subtree and their depths (distance to `c`).
     - For each depth `d`:
       - Define range `[lo, hi] = [max(0, k1 - d), min(k2 - d, n)]`.
       - If `lo <= hi` and `hi >= 0`, query range `[lo, hi]` in the Fenwick tree and add the count to `ans`.
     - After querying, insert each node's depth `d` into the Fenwick tree with weight 1 and append `d` to `added`.
   - Undo all Fenwick insertions by adding -1 for each depth recorded in `added`.
4. Mark `removed[c] = true`.
5. Push non-removed neighbors of `c` onto the decomposition stack.
6. Return `ans`.

Complexity: O(n log^2 n) time (O(log n) centroid levels, each doing Fenwick queries of cost O(log n)) and O(n) space.

## Code walkthrough
In C++, `bitAdd` and `bitSum` implement 1-indexed Fenwick tree operations shifted by 1 to support depth 0.
The outer loop pops components from `stk` and locates centroid `c`.
`bitAdd(0, 1)` seeds depth 0 into the Fenwick tree before exploring child subtrees.
In each child subtree, depths are collected into `depth`.
For each depth `d`:
`ans += bitSum(hi) - (lo > 0 ? bitSum(lo - 1) : 0)` evaluates how many previously seen nodes fall into the valid distance window.
`for (int d : added) bitAdd(d, -1)` cleans up only the inserted entries, avoiding an O(n) reinitialization per centroid.

## Test it out loud
- Base case k1 = k2 = 1: counts tree edges, returning n - 1.
- Line graph with k1 = 1, k2 = 3 on 4 nodes: returns all 6 pairs.
- Range with k1 > n: no paths can be formed, interval check fails, returns 0.
- Tree where all paths are of length 2: star graph with center and n - 1 leaves. For k1 = 2, k2 = 2, returns (n - 1) * (n - 2) / 2.

## Follow-ups
- Can this be optimized to O(n log n)? Yes, by maintaining prefix sums of depth counts and using two pointers over sorted depth lists instead of a Fenwick tree, or via DSU on tree with prefix sums.
- Why is an explicit stack used? Trees with 200,000 nodes can cause stack overflow with recursive DFS in languages with small default stacks; BFS and explicit stack recursion avoid this.
- How are boundary conditions handled for depth 0? Depth 0 is shifted to index 1 in the Fenwick tree so that 1-indexed bit operations handle depth 0 cleanly.

## Common mistakes
- Not resetting the Fenwick tree efficiently: zeroing the entire size-n array at every centroid makes time O(n^2); undoing only added elements maintains O(component_size * log n).
- Fenwick tree 0-index crash: Fenwick trees require positive indices; `i + 1` shift must be used when indexing by depth starting at 0.
- 32-bit integer overflow: path count can exceed 2 * 10^9; `ans` must be 64-bit integer (`long long`).

## Further reading
- Centroid Decomposition for path queries with range constraints
- Fenwick Tree range queries
- Two-pointer optimization for tree path counting
