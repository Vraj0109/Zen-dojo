---
id: cses-counting-paths
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + m) log n) time, O(n log n) space"
reviewed: false
---

## Clarify first
- What does each path [a, b] represent? The unique simple path between node a and node b in the tree, with both endpoints included.
- What should be computed? For every node in the tree, count how many of the given m paths contain that node.
- Can a path consist of a single node? Yes, [a, a] is a valid path containing only node a.
- What should be returned? An array of length n whose i-th element (0-based) is the path count for node i + 1.
- What are the constraints? Up to 200,000 nodes and 200,000 paths.

## Examples to say out loud
Suppose n = 5, edges are (1, 2), (1, 3), (3, 4), (3, 5), and paths are [1, 4], [5, 2], and [1, 2].
- Path [1, 4] visits nodes: 1, 3, 4.
- Path [5, 2] visits nodes: 5, 3, 1, 2.
- Path [1, 2] visits nodes: 1, 2.
Node counts:
- Node 1: on all 3 paths -> count 3.
- Node 2: on [5, 2] and [1, 2] -> count 2.
- Node 3: on [1, 4] and [5, 2] -> count 2.
- Node 4: on [1, 4] -> count 1.
- Node 5: on [5, 2] -> count 1.
Output list: [3, 2, 2, 1, 1].

## Brute force
For each path [a, b], trace the path from a to b by walking upward to their LCA, incrementing a counter on each visited node.
In the worst case, a single path can visit O(n) nodes.
With 200,000 paths, this takes O(m * n) = 4 * 10^10 operations, leading to a Time Limit Exceeded error.
Tree difference arrays allow updating paths in O(log n) time per path, followed by a single bottom-up sweep.

## The key observation
Just as a difference array allows range additions on a 1D array in O(1) by marking +1 at the start and -1 after the end, tree difference arrays allow path additions on a tree.
For a path between node a and node b with Lowest Common Ancestor `l = lca(a, b)`:
- We add +1 at node a.
- We add +1 at node b.
- We subtract 1 at node l.
- We subtract 1 at `parent(l)` (if l is not the root).
When we compute the subtree sum of these values bottom-up (accumulating each node's total into its parent):
- Nodes along the path from a up to l receive +1.
- Nodes along the path from b up to l receive +1.
- Node l receives (+1 from a-side) + (+1 from b-side) - 1 (from l's own mark) = +1.
- The parent of l receives (+1 from l's sum) - 1 (from parent's own mark) = 0, preventing the path addition from leaking into higher ancestors!

## Optimal approach
1. Root the tree at node 1. Use BFS to compute node depths `dep`, parent pointers `par`, and BFS visitation `order`.
2. Build the binary lifting table `up[LOG][n + 1]` to answer LCA queries in O(log n).
3. Allocate an array `mark` of size n + 1 initialized to 0.
4. For each path [a, b]:
   - Find `l = lca(a, b)`.
   - `mark[a]++`.
   - `mark[b]++`.
   - `mark[l]--`.
   - If `par[l] != 0`, `mark[par[l]]--`.
5. Propagate subtree sums bottom-up by traversing `order` in reverse (from n - 1 down to 1):
   - `mark[par[order[i]]] += mark[order[i]]`.
6. Return `mark[1..n]` as the result array.

Complexity: O((n + m) log n) time (binary lifting LCA for m paths, and linear bottom-up sweep), and O(n log n) space.

## Code walkthrough
In C++, `adj` stores undirected edges.
The BFS loop sets `par[1] = 0` and populates `order` and `dep`.
`up[j][v]` computes binary lifting jumps for LCA.
In the path loop:
`mark[p[0]]++`, `mark[p[1]]++`, and `mark[l]--` apply the difference marks.
The condition `if (par[l] != 0) mark[par[l]]--;` safely skips the director's non-existent parent.
The bottom-up loop `for (int i = n - 1; i >= 1; i--) mark[par[order[i]]] += mark[order[i]];` aggregates the difference marks in O(n) time.
`vector<int>(mark.begin() + 1, mark.end())` slices nodes 1 to n into a 0-indexed return vector.

## Test it out loud
- Path of length 0 (single node): path [1, 1]. `lca = 1`. `mark[1]++`, `mark[1]++`, `mark[1]--`, `mark[par[1]]--` (none). Net mark at node 1 is +1. Subtree sum is 1. Correct.
- Single edge: nodes 1-2, path [1, 2]. `lca = 1`. `mark[2]++`, `mark[1]++`, `mark[1]--`. Subtree of 2 gives 1; adding to 1 gives 1. Both nodes get 1.
- Disjoint paths: path on left subtree and path on right subtree do not affect each other.
- Shared path segment: multiple paths overlapping on an edge correctly accumulate counts.

## Follow-ups
- What if paths had weights w instead of count 1? The exact same difference formulas apply: `mark[a] += w`, `mark[b] += w`, `mark[l] -= w`, `mark[par[l]] -= w`.
- What if difference array was on tree edges instead of nodes? For edge difference arrays, mark `mark[a]++`, `mark[b]++`, and `mark[l] -= 2`.
- Can LCA be precomputed using Tarjan's offline LCA? Yes, Tarjan's algorithm with DSU finds all m LCAs in O(n + m * alpha(n)) time, reducing total time to strictly linear O(n + m).

## Common mistakes
- Forgetting to subtract at `par[l]`: without subtracting at `par[l]`, the path count will propagate all the way up to the root of the tree.
- Forgetting to subtract at `l`: node l is visited by both paths climbing up from a and b, so subtracting 1 at l avoids counting l twice.
- Applying recursive DFS on deep trees: a tree with depth 200,000 will crash the call stack; iterative BFS queue and reverse traversal prevent stack overflow.

## Further reading
- Tree difference array technique for node and edge updates
- Lowest Common Ancestor applications in tree paths
- Tarjan's offline LCA algorithm using Disjoint Set Union
