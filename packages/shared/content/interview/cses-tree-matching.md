---
id: cses-tree-matching
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What is a matching in a tree? A set of edges such that no two chosen edges share a common vertex.
- What should be returned? The maximum number of edges in any valid matching.
- Can n = 1? Yes, if n = 1, there are 0 edges, so the maximum matching has size 0.
- Are edges undirected? Yes, n - 1 undirected edges forming a valid tree.
- What are the constraints? Up to 200,000 nodes.

## Examples to say out loud
Suppose n = 5 and edges are (1, 2), (1, 3), (3, 4), and (3, 5).
If we match (1, 2) and (3, 4), neither node 1, 2, 3, nor 4 is repeated. We cannot add any more edges because node 5 can only connect to node 3, which is already used.
Maximum matching size is 2.

Suppose n = 4 in a line: (1, 2), (2, 3), (3, 4).
Matching (1, 2) and (3, 4) uses 2 disjoint edges. Maximum matching is 2.

## Brute force
We could formulate this as maximum weight matching or branch over every edge (take or don't take) with backtracking.
Backtracking takes exponential time O(2^n).
While maximum matching in general graphs requires Edmonds' blossom algorithm in O(V^2 * E), trees have no cycles.
A greedy bottom-up strategy (or tree DP) finds the optimal matching in strictly linear O(n) time.

## The key observation
Consider a leaf node in a rooted tree. A leaf node has only one adjacent edge: the edge connecting it to its parent.
If the leaf is ever to be matched, it must be matched with its parent.
Furthermore, matching a leaf with its parent is always optimal: if an optimal matching instead used an edge between the parent and the parent's parent, swapping that edge for the leaf-parent edge yields another valid matching of equal size.
Therefore, a greedy bottom-up sweep (from leaves up to the root) that matches any unmatched node with its unmatched parent is guaranteed to find a maximum matching.

## Optimal approach
1. Root the tree arbitrarily at node 1.
2. Run a BFS from node 1 to compute parent pointers `par[v]` and collect nodes in a traversal `order`.
3. Allocate a boolean array `used` of size n + 1 initialized to false.
4. Iterate through `order` in reverse (from index n - 1 down to 1):
   - Let `v = order[i]`.
   - If `!used[v]` and `!used[par[v]]`:
     - Match them: mark `used[v] = true` and `used[par[v]] = true`.
     - Increment `ans++`.
5. Return `ans`.

Complexity: O(n) time (BFS visits each node/edge once, reverse sweep is O(n)), and O(n) space for adjacency list, parent array, and queue.

## Code walkthrough
In C++, `adj` stores undirected edges.
`vector<int> par(n + 1, 0), order;` records the root-to-leaf topological ordering via BFS starting at node 1.
In the reverse pass `for (int i = n - 1; i >= 1; i--)`:
Extracting `v = order[i]` inspects children before parents.
The condition `if (!used[v] && !used[par[v]])` checks whether both endpoints of the edge `(v, par[v])` are currently free.
If both are free, we greedily take the edge: `used[v] = used[par[v]] = 1; ans++;`.
Because root 1 has no parent (`par[1] == 0`), the loop terminates before `i = 0`.

## Test it out loud
- Base case 1 node: n = 1, edges = []. Loop does not execute, returns 0.
- Single edge: n = 2, edges = [[1, 2]]. Leaf 2 matches with parent 1, returns 1.
- Star graph: n = 5, edges (1, 2), (1, 3), (1, 4), (1, 5). Reverse loop matches leaf 5 with parent 1. Once parent 1 is used, other leaves cannot match. Returns 1.
- Line of 4 nodes: 1 - 2 - 3 - 4. Reverse order checks 4 (matches with 3). Next checks 2 (matches with 1). Returns 2.

## Follow-ups
- Can this be written with tree DP instead of greedy? Yes: let `dp[u][0]` be max matching in u's subtree without matching u, and `dp[u][1]` with u matched to one of its children. Both give identical results.
- What if edges had weights (maximum weight tree matching)? The greedy choice does not work for arbitrary weights; tree DP computes `dp[u][0]` and `dp[u][1]` with weights in O(n) time.
- Why use reverse BFS instead of recursive DFS? A degenerate linear tree of 200,000 nodes can overflow the recursion stack. Reverse BFS is iterative and stack-safe.

## Common mistakes
- Stack overflow with recursive DFS on deep trees: using recursion without increasing stack limits can cause runtime crashes on long linear chains.
- Matching parent with root: ensuring node 1's parent is not matched inadvertently (loop stops at `i >= 1` or checks `par[v] != 0`).
- Processing top-down instead of bottom-up: matching top-down can greedily consume internal nodes early, leaving multiple leaves stranded.

## Further reading
- Tree matching and greedy leaf-exchange argument
- Tree dynamic programming for independent sets and matchings
- Maximum bipartite matching on acyclic graphs
