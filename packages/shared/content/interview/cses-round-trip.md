---
id: cses-round-trip
pattern: CSES: graph algorithms
difficulty: medium
optimal: "O(n + m * alpha(n)) time, O(n) space"
reviewed: false
---

## Clarify first
- Are the roads bidirectional or directed? They are undirected (bidirectional).
- Are self-loops or multi-edges possible? The problem states there is at most one road between any two distinct cities, so the graph is simple.
- What defines a round trip? A simple cycle of length at least 3, meaning a path that starts and ends at the same vertex with at least two intermediate vertices and no repeated edges.
- Can the graph be disconnected? Yes, the network can consist of multiple disjoint connected components.
- What should we return? Return true if any round trip cycle exists, or false if the network is an acyclic forest.

## Examples to say out loud
Consider 5 cities with roads between (1, 2), (1, 3), (1, 4), (2, 3), and (5, 4).
When we examine edges (1, 2) and (1, 3), vertices 1, 2, and 3 become part of the same component.
When edge (2, 3) is processed, both endpoints already belong to the same connected component. Adding (2, 3) closes a cycle among vertices 1, 2, and 3. Since the graph is simple, this cycle has length 3, so we immediately return true.

For an edge case, consider 4 cities with roads (1, 2), (2, 3), and (3, 4).
These edges form a simple linear tree without any back-edges or alternate paths. No two endpoints ever belong to the same component prior to uniting them, so we return false.

## Brute force
We could run a depth-first search from every unvisited vertex, tracking visited nodes and their parents. Whenever a neighbor is encountered that is already visited and not the immediate parent, a cycle of length at least 3 has been discovered.
While DFS also runs in linear time, a naive path-enumeration or trying all simple paths takes exponential time O(n!). DFS is valid, but Disjoint Set Union provides a clean incremental approach without recursion overhead.

## The key observation
In a simple undirected graph without self-loops or multi-edges, any cycle must consist of at least 3 edges.
If we inspect edges one by one using a Disjoint Set Union (DSU) structure, an edge between vertex u and vertex v forms a cycle if and only if u and v already share the same representative root.
If they do, adding edge (u, v) connects two already-connected nodes, completing a cycle.

## Optimal approach
1. Initialize a DSU structure for n vertices where each vertex is initially its own parent.
2. Iterate through each road connecting city u and city v.
3. Compute the root of u and the root of v using path compression.
4. If root(u) == root(v), u and v are already connected through existing edges; adding edge (u, v) creates a cycle, so return true.
5. If root(u) != root(v), link one root to the other (union operation) and proceed to the next road.
6. If all roads are processed and no edge connects nodes in the same component, the entire graph is acyclic, so return false.

Complexity: O(n + m * alpha(n)) time where alpha is the inverse Ackermann function, which is practically linear, and O(n) space for the parent array.

## Code walkthrough
In our DSU structure, the constructor fills the parent array such that parent[i] = i for all i from 1 to n.
The `find(i)` function applies path compression by recursively looking up the representative and setting `parent[i] = find(parent[i])`.
The `unite(u, v)` function finds the roots of u and v. If they match, it returns false indicating they are already merged. Otherwise, it sets `parent[rootU] = rootV` and returns true.
In the main method, we loop over each road: if `!dsu.unite(u, v)`, we return true immediately. If the loop completes, we return false.

## Test it out loud
- Triangle graph: 3 vertices, edges (1, 2), (2, 3), (3, 1). Edge (1, 2) merges 1 and 2. Edge (2, 3) merges 3 into component {1, 2}. Edge (3, 1) connects two nodes already having the same root, returning true.
- Simple line: 3 vertices, edges (1, 2), (2, 3). Edge (1, 2) succeeds. Edge (2, 3) succeeds. No edges left, returns false.
- Disconnected graph with cycle in second component: cities 1-2 and 3-4-5-3. Component 1-2 has no cycle. Component 3-4-5 encounters edge (5, 3) closing a cycle and returns true.
- Empty roads list: n cities, 0 edges. Loop terminates without finding a cycle, returns false.

## Follow-ups
- How would you reconstruct and print the actual cycle vertices instead of just returning a boolean? We can use DFS with parent tracking and node colors (unvisited, visiting, visited). When a visiting node is hit, backtrack along parent pointers until the start node is reached, then reverse the collected path.
- Can we handle dynamic edge additions online? Yes, DSU natively supports online edge additions and checks in near-constant time per query.
- What if the graph had parallel edges? Parallel edges would need to be filtered out first or handled carefully so two identical edges between the same pair do not trigger a false cycle of length 2.

## Common mistakes
- Treating the parent edge in undirected DFS as a cycle: if DFS is used, passing the immediate parent parameter is critical to avoid reporting a bidirectional edge as a 2-cycle.
- Forgetting 1-based indexing for cities: the input uses 1 to n, so allocating an array of size n + 1 prevents out-of-bounds errors.
- Omitting path compression in DSU: without path compression or union by rank, tree height can degrade to O(n), making total runtime O(m * n).

## Further reading
- Tarjan's Disjoint Set Union algorithms and path compression analysis
- Depth-First Search cycle detection in undirected graphs
- Kruskal's minimum spanning tree algorithm cycle property
