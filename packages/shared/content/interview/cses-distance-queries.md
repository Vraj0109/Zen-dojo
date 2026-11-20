---
id: cses-distance-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log n) time, O(n log n) space"
reviewed: false
---

## Clarify first
- What does the problem ask? For each query [a, b], find the distance (number of edges on the unique simple path) between node a and node b in the tree.
- Can a == b? Yes, the distance from a node to itself is 0 edges.
- Is the graph a valid connected tree? Yes, n nodes and n - 1 undirected edges.
- What should be returned? An array of integers containing the distance for each query in order.
- What are the constraints? Up to 200,000 nodes and 200,000 queries.

## Examples to say out loud
Suppose n = 5 and edges are (1, 2), (1, 3), (3, 4), and (3, 5).
- Query [1, 2]: direct edge, distance is 1.
- Query [3, 5]: direct edge, distance is 1.
- Query [2, 4]: path is 2 - 1 - 3 - 4. Distance is 3 edges.
- Query [2, 2]: distance to itself is 0.
Output list: [1, 1, 3, 0].

## Brute force
For each query [a, b], run a BFS or DFS from node a to find the shortest path to node b.
Each query takes O(n) time.
With 200,000 queries on a tree of size 200,000, this takes O(q * n) = 4 * 10^10 operations and times out.
Because trees have unique simple paths, the distance between any two nodes can be computed directly using their depths and Lowest Common Ancestor (LCA).

## The key observation
In any rooted tree, the unique simple path between node a and node b travels upward from a to their Lowest Common Ancestor `l = lca(a, b)`, and then downward from l to b.
If `depth[v]` represents the number of edges from the root to node v, then:
- Distance from a to l is `depth[a] - depth[l]`.
- Distance from b to l is `depth[b] - depth[l]`.
Adding these two distances gives:
`dist(a, b) = depth[a] + depth[b] - 2 * depth[l]`.
By precomputing node depths with BFS and building a binary lifting table for LCA in O(n log n) time, any distance query is answered in O(log n) time.

## Optimal approach
1. Root the tree at node 1. Perform a BFS to determine node depths `dep` and direct parents `par`.
2. Build the binary lifting table `up[LOG][n + 1]`:
   - `up[0][v] = par[v]`.
   - For j from 1 to LOG - 1: `up[j][v] = up[j - 1][up[j - 1][v]]`.
3. Define the LCA function:
   - Lift the deeper node until `dep[a] == dep[b]`.
   - If `a == b`, return `a`.
   - For j from LOG - 1 down to 0: if `up[j][a] != up[j][b]`, jump both `a = up[j][a]` and `b = up[j][b]`.
   - Return `up[0][a]`.
4. For each query [a, b]:
   - Find `l = lca(a, b)`.
   - Compute `dist = dep[a] + dep[b] - 2 * dep[l]`.
   - Append `dist` to answers list.
5. Return answers list.

Complexity: O((n + q) log n) time (O(n log n) table construction and O(log n) per LCA query), and O(n log n) space.

## Code walkthrough
In C++, `adj` stores undirected edges.
The BFS loop sets `dep[1] = 0` and calculates `dep[v] = dep[u] + 1` for all nodes.
The binary lifting table `up[j][v]` enables logarithmic ancestor jumps.
In query evaluation:
`lca(q[0], q[1])` finds the lowest common ancestor `l`.
The distance formula `dep[q[0]] + dep[q[1]] - 2 * dep[lca(q[0], q[1])]` evaluates the edge count in O(1) arithmetic after the O(log n) LCA lookup.
When `q[0] == q[1]`, `lca(q[0], q[0]) = q[0]`, giving `dep + dep - 2 * dep = 0`.

## Test it out loud
- Same node: query [1, 1]. `dep[1] + dep[1] - 2 * dep[1] = 0`.
- Direct edge: query [1, 2] where 1 is parent of 2. `dep[1] = 0`, `dep[2] = 1`, `lca = 1`. `0 + 1 - 2(0) = 1`.
- Siblings: query [2, 3] where both report to 1. `dep[2] = 1`, `dep[3] = 1`, `lca = 1`. `1 + 1 - 2(0) = 2`.
- End to end on chain: 1 - 2 - 3 - 4. Query [1, 4] gives `0 + 3 - 2(0) = 3`. Query [2, 4] gives `1 + 3 - 2(1) = 2`.

## Follow-ups
- What if edges had positive weights? Instead of unit depths, store `dist_from_root[v]`. The formula becomes `dist_root[a] + dist_root[b] - 2 * dist_root[lca(a, b)]`.
- Can this be solved in O(1) query time? Yes, using RMQ-based LCA with Euler Tour and Sparse Table; each distance query takes O(1) time after O(n log n) preprocessing.
- What if queries ask for the k-th node along the path from a to b? Calculate `d = dist(a, b)`. If k <= dist(a, lca), lift from a by k; else lift from b by (d - k).

## Common mistakes
- Forgetting to multiply `dep[lca]` by 2: subtracting `dep[lca]` only once overcounts the distance from root to LCA.
- 0-based vs 1-based indexing in BFS queue: ensure root 1 has `par[1] = 0` and `dep[1] = 0`.
- Calling deep recursion for depths: linear trees of 200,000 nodes overflow recursion stacks; iterative BFS is safe.

## Further reading
- Distance in trees via Lowest Common Ancestor
- Euler Tour technique and LCA reduction to RMQ
- Binary lifting for tree path algorithms
