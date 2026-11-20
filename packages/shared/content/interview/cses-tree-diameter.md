---
id: cses-tree-diameter
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What is the definition of tree diameter? The maximum number of edges on any simple path connecting two nodes in the tree.
- How are edges represented? A list of n - 1 undirected pairs [u, v] with 1 <= u, v <= n.
- What if n = 1? A tree with a single node has 0 edges, so diameter is 0.
- Is the graph guaranteed to be a valid connected tree? Yes, constraints specify n nodes, n - 1 edges, and a valid tree structure.
- What should be returned? An integer representing the edge count of the longest simple path.

## Examples to say out loud
Consider 5 nodes with edges (1, 2), (1, 3), (3, 4), and (3, 5).
Node 1 connects to 2 and 3. Node 3 branches into 4 and 5.
The simple path connecting node 2 to node 4 visits 2 - 1 - 3 - 4.
This path contains 3 edges. No path has 4 edges, so the diameter is 3.

For 4 nodes in a line with edges (1, 2), (2, 3), and (3, 4), the path from 1 to 4 has length 3 edges.

## Brute force
A brute-force solution would run a BFS or DFS from every single node to find the maximum shortest distance across all pairs (u, v).
Running BFS from all n nodes takes O(n * (n + m)) = O(n^2) time.
For n = 200,000, n^2 = 4 * 10^10 operations, which will time out.
Because trees are acyclic and connected, the tree diameter can be determined in only two BFS passes.

## The key observation
In any undirected tree, starting from an arbitrary node (say node 1) and finding the furthest node u guarantees that u is an extreme endpoint of at least one diameter.
Proof intuition: if a diameter path exists between two nodes x and y, the furthest node from any arbitrary starting node must reach either x or y (or an equally distant extreme leaf).
Running a second BFS starting from node u to find the furthest node v finds the opposite endpoint of the diameter, and the distance between u and v is exactly the tree diameter.

## Optimal approach
1. Handle base case: if n <= 1, return 0.
2. Build an undirected adjacency list from the given edges.
3. Define a helper BFS function that takes a start node and returns the pair (furthest_node, max_distance):
   - Initialize distance array with -1 and a queue with the start node at distance 0.
   - While the queue is non-empty, pop node u and relax unvisited neighbors v with `dist[v] = dist[u] + 1`.
   - Track the node with the maximum distance.
4. Call `p1 = bfs(1)` to find one diameter endpoint `u = p1.first`.
5. Call `p2 = bfs(u)` to find the opposite endpoint `v` and maximum distance `d = p2.second`.
6. Return `d`.

Complexity: O(n) time because two BFS passes inspect each node and edge twice, and O(n) space for adjacency list, queue, and distance arrays.

## Code walkthrough
In C++, `adj[e[0]].push_back(e[1])` and `adj[e[1]].push_back(e[0])` construct the bidirectional graph.
The `bfs(start)` lambda initializes `dist(n + 1, -1)` and `dist[start] = 0`.
During queue extraction, `if (dist[u] > dist[farthest]) farthest = u;` maintains the most distant vertex seen so far.
For each neighbor `v`, `if (dist[v] == -1)` ensures each node is entered at most once.
Finally, `pair<int, int> p1 = bfs(1);` finds the first endpoint, and `bfs(p1.first).second` yields the diameter in edge count.

## Test it out loud
- Base case 1 node: n = 1, edges = []. `n <= 1` condition returns 0.
- Single edge: n = 2, edges = [[1, 2]]. BFS from 1 finds 2 at distance 1. BFS from 2 finds 1 at distance 1. Returns 1.
- Star graph: n = 5, edges = [[1, 2], [1, 3], [1, 4], [1, 5]]. BFS from 1 finds leaf (e.g. 2) at dist 1. BFS from 2 finds another leaf (e.g. 3) through center 1 at dist 2. Returns 2.
- Linear chain: n = 6 with chain 1-2-3-4-5-6. BFS from 1 finds 6 at dist 5. BFS from 6 finds 1 at dist 5. Returns 5.

## Follow-ups
- Can we find the diameter using tree DP instead of two BFSs? Yes, in a single DFS pass, each node computes the two longest downward branch lengths from its children. The diameter is the maximum sum of the two longest branches across all nodes.
- Does the two-BFS trick work on general graphs? No, the two-BFS property relies on the absence of cycles and unique simple paths; it fails on graphs with cycles.
- What if edge weights were non-negative values instead of unit costs? The two-BFS approach still holds if edge weights are non-negative, using Dijkstra or tree DFS to find the furthest node.

## Common mistakes
- Misinterpreting diameter as node count instead of edge count: if the path has k nodes, the diameter in edges is k - 1.
- Adding directed edges instead of undirected: forgetting `adj[v].push_back(u)` will break tree connectivity in traversal.
- Trying two-BFS on negative weight edges: negative edges can invalidate distance optimality, requiring dynamic programming or Bellman-Ford variants.

## Further reading
- Double BFS method for tree diameter proof and properties
- Tree dynamic programming for diameter and radius
- Centroid decomposition and tree centers
