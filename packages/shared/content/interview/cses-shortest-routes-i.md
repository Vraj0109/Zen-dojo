---
id: cses-shortest-routes-i
pattern: CSES: graph algorithms
difficulty: medium
optimal: "O((n + m) * log n) time, O(n + m) space"
reviewed: false
---

## Clarify first
- Are edge weights non-negative? Yes, all flight costs c satisfy 1 <= c <= 10^9.
- Are edges directed or undirected? Directed flights from city a to city b.
- Can there be multiple edges between the same pair of cities? Yes, flight schedules can contain multiple direct flights between the same endpoints with different costs.
- What if a city cannot be reached from city 1? Return -1 for that city's distance.
- Can total path costs exceed standard 32-bit integer limits? Yes, with up to 10^5 edges each costing up to 10^9, cumulative costs reach 10^14, requiring 64-bit integers.

## Examples to say out loud
Suppose n = 3 and flights are (1 -> 2 with cost 6), (1 -> 3 with cost 2), (3 -> 2 with cost 3), and (1 -> 3 with cost 4).
For city 1, distance to itself is 0.
For city 3, the direct flight gives distance 2.
For city 2, we compare direct flight cost 6 against route 1 -> 3 -> 2 with cost 2 + 3 = 5. The shorter route costs 5.
The final output vector is [0, 5, 2].

If n = 4 with a chain 1 -> 2 (3), 2 -> 3 (4), 3 -> 4 (1), distances accumulate: 0 for city 1, 3 for city 2, 7 for city 3, and 8 for city 4, yielding [0, 3, 7, 8].

## Brute force
A brute-force Bellman-Ford algorithm would relax all m edges up to n - 1 times.
While correct, Bellman-Ford takes O(n * m) time. For n = 100,000 and m = 200,000, that requires 2 * 10^10 operations, which will heavily time out.
Because all edge weights are strictly positive, we do not have negative cycles, making Dijkstra's algorithm the ideal greedy choice.

## The key observation
Since all edge weights are strictly non-negative, the shortest distance to the currently unvisited vertex with the minimum tentative distance cannot be improved by any further detours.
Using a min-priority queue allows us to extract vertices in increasing order of shortest path distances, guaranteeing each vertex distance is finalized the first time it is extracted and relaxed.

## Optimal approach
1. Construct an adjacency list where each city u stores pairs (v, w) representing an outgoing flight to v with weight w.
2. Allocate a 64-bit distance array of size n + 1, initializing all entries to infinity (e.g. 4 * 10^18) and setting dist[1] = 0.
3. Push (0, 1) into a min-priority queue storing (distance, vertex) pairs.
4. While the priority queue is non-empty:
   - Extract the pair (d, u) with minimum d.
   - If d > dist[u], this entry is an outdated stale record; skip it.
   - For each outgoing edge (v, w) from u:
     - If dist[u] + w < dist[v], update dist[v] = dist[u] + w and push (dist[v], v) into the queue.
5. Create a result array of length n. For each city i from 1 to n, store dist[i] if reachable, or -1 if dist[i] remains infinity.

Complexity: O((n + m) * log n) time using a binary heap priority queue, and O(n + m) space for the graph and priority queue.

## Code walkthrough
In step 1, `adj[f[0]].push_back({f[1], f[2]})` builds the directed graph.
The distance array uses `long long` with constant `INF = 4e18` to prevent 32-bit overflow.
In the extraction loop, `if (d > dist[u]) continue;` is crucial: because C++ `std::priority_queue` does not support decrease-key, we insert new pairs whenever a shorter path is found. Stale entries with larger distances are quickly discarded.
When iterating through neighbors `for (const auto& [v, w] : adj[u])`, relaxing `dist[v] = dist[u] + w` pushes `{dist[v], v}` to the min-heap.
Finally, an array of size n maps cities 1 through n to 0-indexed positions.

## Test it out loud
- Single vertex with no flights: n = 1, flights = []. dist[1] = 0. Returns [0].
- Large edge weight: n = 2, flight (1, 2, 10^9). Returns [0, 1000000000]. Verified 64-bit integrity.
- Redundant and parallel edges: flight (1, 2, 10) and (1, 2, 4). The edge with cost 4 is picked first; relaxation with cost 10 is ignored.
- Unreachable component: n = 3, flight (1, 2, 5). City 3 has no incoming edges, dist[3] remains INF, resulting in [0, 5, -1].

## Follow-ups
- How does Dijkstra compare to 0-1 BFS? If edge weights were constrained to only 0 or 1, a deque-based 0-1 BFS would achieve O(n + m) linear time without log factors.
- What if edge weights were negative? Dijkstra fails with negative weights because finalized nodes can be re-relaxed; we would need SPFA or Bellman-Ford.
- How would you reconstruct the path from 1 to a target vertex? Maintain a parent array `parent[v] = u` whenever edge (u, v) successfully relaxes dist[v].

## Common mistakes
- Using 32-bit integers: distances can easily reach 2 * 10^14, causing signed integer overflow and negative distances.
- Omitting the stale entry check `if (d > dist[u]) continue;`: without it, redundant heap extractions can degrade performance.
- Allocating an n x n adjacency matrix: with n = 100,000, a matrix requires tens of gigabytes of memory, causing out-of-memory errors.

## Further reading
- Dijkstra's single-source shortest path algorithm
- Priority queues and lazy deletion techniques in C++
- Analysis of shortest path algorithms on sparse graphs
