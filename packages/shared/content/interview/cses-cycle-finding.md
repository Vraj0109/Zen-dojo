---
id: cses-cycle-finding
pattern: CSES: graph algorithms
difficulty: medium
optimal: "O(n * m) time, O(n) space"
reviewed: false
---

## Clarify first
- Are edge weights directed or undirected? Directed edges from vertex a to vertex b.
- Can edge weights be negative? Yes, weights range from -10^9 to 10^9.
- What constitutes a negative cycle? A directed cycle whose sum of edge weights is strictly less than 0.
- Can the graph have multiple disconnected components? Yes, a negative cycle might reside in any component.
- What should be returned? A boolean: true if at least one negative cycle exists anywhere in the graph, false otherwise.

## Examples to say out loud
Consider 4 vertices with edges: (1 -> 2, cost 1), (2 -> 3, cost 2), (3 -> 1, cost -4), and (3 -> 4, cost 1).
Vertices 1, 2, and 3 form a directed cycle. Summing their weights gives 1 + 2 + (-4) = -1. Because -1 is strictly less than 0, this is a negative cycle, and we return true.

In contrast, if edge (3 -> 1) had cost 1 instead of -4, the cycle sum would be 1 + 2 + 1 = 4 > 0. Since there are no other cycles with negative sums, the graph contains no negative cycles, and we return false.

## Brute force
A brute-force strategy could enumerate all simple cycles in the directed graph using Tarjan's cycle enumeration or Johnson's algorithm and compute the weight sum of each cycle.
However, a graph can have exponentially many cycles, yielding O(2^n) time complexity.
Instead, we recognize that negative cycles cause distances to decrease indefinitely during shortest path relaxation, which is the exact problem Bellman-Ford solves.

## The key observation
In any directed graph with n vertices without negative cycles, the shortest simple path between any two vertices contains at most n - 1 edges.
Consequently, after n - 1 rounds of relaxing all edges, all shortest path distances must stabilize.
If an n-th iteration still manages to decrease any vertex's tentative distance, that decrease must stem from traversing a cycle with strictly negative total weight.
To handle disconnected components simultaneously, we can initialize all initial distances to 0. This is mathematically equivalent to adding a virtual source node connected to every vertex by an edge of weight 0.

## Optimal approach
1. Allocate an array `dist` of size n + 1, initialized to 0 for all vertices.
2. Run an outer loop for iterations 1 through n:
   - Set a flag `any_relaxed = false`.
   - Iterate through every directed edge (u, v, w) in the edge list.
   - If dist[u] + w < dist[v], update dist[v] = dist[u] + w and set `any_relaxed = true`.
   - If `any_relaxed` remains false after a full pass over all edges, distances have converged early, so break out of the loop.
3. If on the n-th iteration `any_relaxed` is true, a negative cycle exists; return true.
4. If the loop terminates earlier without changes on the n-th pass, no negative cycle exists; return false.

Complexity: O(n * m) time since each of the n passes iterates through m edges, and O(n) space for the distance vector.

## Code walkthrough
In the implementation, `vector<long long> dist(n + 1, 0)` sets all initial potentials to 0, which guarantees that all disconnected components are checked simultaneously.
We loop `iter` from 1 to n. Inside, for each edge `[u, v, w]`, we check `if (dist[u] + w < dist[v])`.
When a relaxation occurs, `dist[v] = dist[u] + w` updates the distance and `any = true` notes progress.
If `!any` after an iteration, the algorithm terminates immediately, avoiding unnecessary passes.
After the n-th iteration completes, if `any` was true during iteration n, we return true. Otherwise, we return false.

## Test it out loud
- Negative 2-cycle: 2 vertices with (1 -> 2, cost 3) and (2 -> 1, cost -4). Net cost is -1. Iteration 2 relaxes distances, returning true.
- Non-negative 2-cycle: edges (1 -> 2, cost 3) and (2 -> 1, cost -2). Net cost is +1. Iteration 1 relaxes, iteration 2 finds no improvement, loop breaks, returning false.
- Self-loop with negative weight: edge (1 -> 1, cost -1). Iteration n continues to decrement dist[1], returning true.
- Disconnected graph with isolated negative cycle: component A has no cycle, component B has a negative triangle. Initializing dist to 0 allows component B to trigger relaxation on pass n, returning true.

## Follow-ups
- How would you print the actual negative cycle vertices? Maintain a `parent` array during relaxations. If relaxation occurs on pass n for vertex x, trace backward n times using parent pointers to guarantee landing inside the cycle, then trace the cycle until returning to that vertex.
- Can SPFA (Shortest Path Faster Algorithm) be used? Yes, maintaining an in-queue count per vertex (if count >= n, cycle detected) often runs much faster on average, though worst case remains O(n * m).
- What if edge weights were all non-negative? Dijkstra would be used instead, as negative cycles are impossible when all weights >= 0.

## Common mistakes
- Initializing distances to infinity from only vertex 1: if a negative cycle is not reachable from vertex 1, the algorithm would fail to detect it. Initializing all dist[i] = 0 or using an imaginary super-source fixes this.
- Using 32-bit integers: repeated negative relaxations across passes can underflow 32-bit signed integers; using 64-bit integers (`long long`) prevents overflow issues.
- Stopping at n - 1 passes: without checking whether relaxation is still possible on the n-th pass, you cannot distinguish between a long valid path and a negative cycle.

## Further reading
- Bellman-Ford shortest path and negative cycle detection
- SPFA queue-based relaxation and cycle detection heuristics
- Johnson's all-pairs shortest paths algorithm using vertex reweighting
