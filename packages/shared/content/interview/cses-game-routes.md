---
id: cses-game-routes
pattern: CSES: graph algorithms
difficulty: medium
optimal: "O(n + m) time, O(n + m) space"
reviewed: false
---

## Clarify first
- What does each teleporter [a, b] mean? A directed one-way transition from level a to level b.
- Is the game network guaranteed to have no cycles? Yes, the network is specified as a Directed Acyclic Graph (DAG).
- What should be returned? The total count of distinct paths from level 1 to level n modulo 10^9 + 7.
- What if level n cannot be reached from level 1? The path count is 0.
- What if n = 1 with no teleporters? The path starts and ends at level 1, so there is exactly 1 valid empty path.

## Examples to say out loud
Suppose n = 4 and teleporters are (1, 2), (1, 3), (2, 3), (2, 4), and (3, 4).
Let us trace paths starting at level 1:
- Route 1: 1 -> 2 -> 4
- Route 2: 1 -> 2 -> 3 -> 4
- Route 3: 1 -> 3 -> 4
There are 3 valid paths from 1 to 4, so the output is 3.

If n = 4 with teleporters (1, 2) and (3, 4), no path exists from component {1, 2} to {3, 4}. Output is 0.

## Brute force
A brute-force depth-first search could explore every path from level 1 until reaching level n, incrementing a global counter modulo 10^9 + 7 on arrival.
However, in a DAG with multiple branching and merging points (like complete DAGs), the number of distinct paths can be exponential (up to 2^(n - 2)). A naive DFS would take O(2^n) time and timeout.
Because subpaths can be shared and path counts are additive, dynamic programming on the topological sort computes the exact count in linear time.

## The key observation
In a directed acyclic graph, the number of paths from vertex 1 to vertex v equals the sum of paths from 1 to all predecessor vertices u that have a direct edge u -> v.
Equivalently, each vertex u distributes its path count `ways[u]` to each of its successors v: `ways[v] = (ways[v] + ways[u]) % MOD`.
By processing vertices in topological order, every predecessor u has its total path count finalized before any of its outgoing edges are relaxed into successor v.

## Optimal approach
1. Build an adjacency list for all teleporters and compute the in-degree of every level.
2. Initialize a queue for Kahn's algorithm with all levels having in-degree 0.
3. Allocate an array `ways` of size n + 1 initialized to 0, setting `ways[1] = 1`.
4. While the queue has elements:
   - Dequeue level u.
   - For each outgoing teleporter u -> v:
     - Accumulate `ways[v] = (ways[v] + ways[u]) % 1000000007`.
     - Decrement `indeg[v]`. If `indeg[v] == 0`, enqueue v.
5. Return `ways[n]`.

Complexity: O(n + m) time because each vertex and edge is traversed a constant number of times during the topological sweep, and O(n + m) space for graph representation and state arrays.

## Code walkthrough
We set `const int MOD = 1000000007` to prevent integer overflow during addition.
`adj[t[0]].push_back(t[1])` and `indeg[t[1]]++` construct the graph.
All nodes with `indeg[i] == 0` are initially pushed into vector `q`, which serves as a queue via an incrementing `head` index.
The array `ways` has `ways[1] = 1` while all other levels start at 0.
As level `u` is dequeued, we loop over its outgoing neighbors: `ways[v] = (ways[v] + ways[u]) % MOD`. Notice that if `ways[u]` is 0 (unreachable from level 1), adding 0 does not alter `ways[v]`.
When `--indeg[v] == 0`, `v` is pushed to `q`.
Finally, `return ways[n];` gives the path count modulo 10^9 + 7.

## Test it out loud
- Base case single node: n = 1, teleporters = []. Queue pushes 1. `ways[1] = 1`. Returns 1.
- Linear path: n = 3, (1, 2) and (2, 3). Path 1 -> 2 -> 3 is unique. Returns 1.
- Diamond path: n = 4, (1, 2), (1, 3), (2, 4), (3, 4). Paths via 2 and 3 merge at 4 giving 1 + 1 = 2 paths. Returns 2.
- Unreachable destination: n = 4, (1, 2) and (3, 4). Node 3 starts with indegree 0 but `ways[3] = 0`. Node 4 receives 0. `ways[4] = 0`. Returns 0.

## Follow-ups
- What if the graph can have cycles? With cycles, if a cycle is reachable from 1 and can reach n, there are infinitely many paths (return -1 or infinity). Tarjan's SCC algorithm or cycle detection would be needed.
- Can this be written with memoized DFS? Yes, `dfs(u)` returning the sum of `dfs(v)` for neighbors v, memoized in an array. It naturally only visits nodes reachable from 1.
- What if we want the number of paths of exact length k? That would use matrix exponentiation on the adjacency matrix in O(n^3 * log k) time.

## Common mistakes
- Forgetting modulo arithmetic at every addition: omitting `% MOD` when accumulating `ways[v]` will cause 32-bit integer overflow.
- Incorrect base case: setting `ways[1] = 0` or missing the start level will propagate zeroes throughout the entire DAG.
- Processing vertices in arbitrary order instead of topological order: calculating `ways[v]` before all incoming predecessors have contributed leads to incomplete counts.

## Further reading
- Path counting on Directed Acyclic Graphs
- Modular arithmetic in combinatorics and dynamic programming
- Topological sorting with Kahn's algorithm
