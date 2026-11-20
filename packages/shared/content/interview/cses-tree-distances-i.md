---
id: cses-tree-distances-i
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What does the problem ask? For every node in the tree, find the maximum distance (in number of edges) from that node to any other node.
- What should be returned? An array of length n where element i (0-based) is the maximum distance for node i + 1.
- Is the graph a valid tree? Yes, n nodes and n - 1 undirected edges forming a connected acyclic graph.
- What if n = 1? A tree with a single node has maximum distance 0, returning [0].
- What are the constraints? Up to 200,000 nodes.

## Examples to say out loud
Suppose n = 5 and edges are (1, 2), (1, 3), (3, 4), and (3, 5).
The tree diameter endpoints are node 2 and node 4 (or node 5).
For node 1: furthest node is 4 or 5 at distance 2.
For node 2: furthest node is 4 or 5 at distance 3.
For node 3: furthest node is 2 at distance 2.
For node 4: furthest node is 2 at distance 3.
For node 5: furthest node is 2 at distance 3.
Output array: [2, 3, 2, 3, 3].

For a line 1 - 2 - 3:
Node 1 furthest is 3 (dist 2).
Node 2 furthest is 1 or 3 (dist 1).
Node 3 furthest is 1 (dist 2).
Output: [2, 1, 2].

## Brute force
Run a BFS or DFS from each node 1 to n to find the maximum distance from that node.
Running BFS n times takes O(n * (n + m)) = O(n^2) time.
For n = 200,000, 4 * 10^10 operations will cause a Time Limit Exceeded error.
Using tree diameter properties, we only need three BFS runs in total.

## The key observation
In any tree, the furthest node from any arbitrary node v is always one of the two endpoints of a diameter!
Proof intuition: if u and w are the two endpoints of a tree diameter (the longest simple path in the tree), any path extending out from v achieves its maximum possible length by heading towards either u or w.
Therefore, if we find diameter endpoints u and w:
`max_distance[v] = max(dist(v, u), dist(v, w))`.
We can find u and w using two standard BFS passes, and a third BFS computes distances from w.

## Optimal approach
1. Define a helper BFS function `dist(start)` that computes shortest path distances from `start` to all nodes.
2. Run `d1 = dist(1)` starting from an arbitrary node (node 1).
3. Find the node `a` that maximizes `d1[a]`. Node `a` is one endpoint of a diameter.
4. Run `da = dist(a)`.
5. Find the node `b` that maximizes `da[b]`. Node `b` is the opposite endpoint of the diameter, and `da` holds distances from `a`.
6. Run `db = dist(b)` to compute distances from endpoint `b`.
7. For each node v from 1 to n:
   - `ans[v - 1] = max(da[v], db[v])`.
8. Return `ans`.

Complexity: O(n) time because three BFS passes each take O(n) time, and O(n) space for graph representation and distance vectors.

## Code walkthrough
In C++, `adj` stores bidirectional edges.
The lambda `dist(s)` allocates `vector<int> d(n + 1, -1)` and uses a vector `q` as an iterative queue.
`d1 = dist(1)` finds the initial distance profile.
A loop over `v` finds `a` as `argmax(d1[v])`.
`da = dist(a)` gives distances from `a`, and finding `b = argmax(da[v])` locates the other diameter endpoint.
`db = dist(b)` gives distances from `b`.
Finally, `for (int v = 1; v <= n; v++) ans[v - 1] = max(da[v], db[v]);` builds the 0-indexed result array in linear time.

## Test it out loud
- Base case 1 node: n = 1, edges = []. `da[1] = 0`, `db[1] = 0`, returns [0].
- 2 nodes: n = 2, edge (1, 2). `da` from 1 gives [0, 1]. `db` from 2 gives [1, 0]. Max for each is 1. Returns [1, 1].
- Star graph: center 1 with leaves 2, 3, 4, 5. Diameter endpoints are two leaves (e.g. 2 and 3). Center is dist 1 from both. Other leaves are dist 2 from at least one endpoint. Output: [1, 2, 2, 2, 2].
- Line of 3 nodes: endpoints are 1 and 3. Center 2 is distance 1. Endpoints are distance 2. Output: [2, 1, 2].

## Follow-ups
- Can this be solved with tree DP (rerooting)? Yes, using two DFS passes: the first pass computes the top two downward depths for each subtree, and the second pass pushes the maximum upward distance from the parent down to children. Both achieve O(n) time.
- Does the diameter-endpoint property hold for weighted trees? Yes, as long as edge weights are non-negative, the furthest node from any vertex in a tree is always a diameter endpoint.
- What if the graph had cycles? On general graphs with cycles, the furthest node is not necessarily a diameter endpoint; all-pairs shortest paths would require Johnson's algorithm or BFS from every node.

## Common mistakes
- Running BFS from all n nodes: results in O(n^2) time and TLE.
- Only computing distances from one diameter endpoint: node v might be closer to endpoint a than to endpoint b; taking `max(da[v], db[v])` across both endpoints is required.
- 0-based vs 1-based indexing in output array: nodes are 1 to n, while return array is 0-indexed of length n (`ans[v - 1] = max(...)`).

## Further reading
- Tree diameter properties and furthest-node theorem
- Tree rerooting technique (all-distances in trees)
- Double BFS tree traversal algorithms
