import type { PatternArticle } from "./types";

// Full pattern articles, group "Graphs, part 2" (plan 0008, step 6): dijkstra, bellman-ford, floyd-warshall,
// mst, tarjan, eulerian. Format and rules: plan 0007. Code is C++17. Blocks of one article are concatenated
// and compiled together, so helper names are unique per article.

export const DSA_ARTICLES_G: Record<string, PatternArticle> = {
  dijkstra: {
    intro:
      "Dijkstra's algorithm solves the single-source shortest path problem on weighted directed or undirected graphs with non-negative edge weights. By maintaining a set of tentative distances and greedily settling the unvisited vertex with the minimum tentative distance at each step, Dijkstra guarantees that each vertex's shortest path is finalized exactly once upon extraction. The standard modern implementation pairs an adjacency list with a min-priority queue using lazy deletion, achieving O((V + E) log V) time without needing an explicit decrease-key operation. You reach for Dijkstra when calculating shortest transit routes, network packet routing with latency costs, minimax bottleneck paths such as Path With Minimum Effort and Swim in Rising Water, or computing shortest paths in state spaces with non-negative edge costs.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine turning on a water faucet at a source junction in a network of pipes. Water expands outward continuously along every connected pipe at a uniform speed. Pipes with smaller weights (shorter lengths or lower resistances) are filled faster. The moment water reaches any junction for the first time, it has arrived via the fastest possible route. No water traveling along any other path can arrive earlier because all pipe lengths are strictly non-negative.

Dijkstra's algorithm operates on this exact physical intuition. Unlike Breadth-First Search, which assumes every edge has an identical weight of 1 and measures distance in discrete hop counts, Dijkstra accommodates arbitrary non-negative edge weights. A path with three short edges of weight 2 (total distance 6) is recognized as far superior to a single-hop edge of weight 100.

The algorithm maintains a distance array dist, initialized to infinity for all vertices except the source vertex s, where dist[s] = 0. A min-priority queue stores pairs of (distance, vertex), ordered by smallest distance. At each step, the algorithm extracts the unsettled vertex u with the smallest tentative distance dist[u]. For every outgoing edge (u, v) with weight w, if dist[u] + w < dist[v], a shorter path to v has been discovered. We update dist[v] = dist[u] + w and push (dist[v], v) into the min-priority queue.

In textbook descriptions, updating dist[v] invokes a decrease-key operation on the priority queue. However, standard library data structures such as C++'s std::priority_queue do not support efficient decrease-key operations. Instead, we use lazy deletion: we push the new pair (dist[v], v) into the heap without modifying or removing the obsolete prior entry. When an entry (d, u) is eventually popped from the heap, we compare d against the current settled distance dist[u]. If d > dist[u], this entry is a stale remnant of an earlier, inferior path and is immediately skipped with a single check: if (d > dist[u]) continue. This lazy-deletion technique achieves identical asymptotic complexity with minimal overhead and clean code.`,
      },
      {
        title: "Why it works",
        body: `The correctness of Dijkstra's algorithm relies on the greedy choice property, which holds if and only if all edge weights are non-negative.

Theorem: When vertex u is extracted from the min-priority queue with minimum tentative distance dist[u] among all unsettled vertices, dist[u] is equal to the true shortest path distance delta(s, u) from the source s to u.

Proof by Induction:
Let S denote the set of settled vertices whose shortest path distances have already been finalized.
Base case: Initially S is empty. The source s is extracted first with dist[s] = 0. Since all edge weights are non-negative, any alternative path to s would have non-negative length, so delta(s, s) = 0 = dist[s]. Thus the base case holds.

Inductive step: Suppose that for all vertices already in S, dist[v] = delta(s, v). Let u be the next vertex extracted from the priority queue (u not in S), having tentative distance dist[u].
Suppose for contradiction that dist[u] > delta(s, u). Then there exists an actual shortest path P from s to u in G such that the total weight w(P) < dist[u].
Because s is in S and u is not in S, path P must start in S and eventually leave S. Let (x, y) be the first edge along path P such that x is in S and y is not in S (y may possibly be u itself).
Decompose path P into: s -> ... -> x -> y -> ... -> u.
Because all subpaths of a shortest path are themselves shortest paths, the prefix from s to y is a shortest path to y, meaning delta(s, y) = delta(s, x) + w(x, y).
By the inductive hypothesis, x was already settled in S, so its outgoing edges were relaxed, which means dist[y] <= dist[x] + w(x, y) = delta(s, x) + w(x, y) = delta(s, y).
Because all edge weights in the graph are non-negative, the remaining suffix of path P from y to u has total weight w(y -> u) >= 0.
Therefore:
delta(s, u) = delta(s, y) + w(y -> u) >= delta(s, y) >= dist[y].
However, the algorithm selected vertex u rather than vertex y from the priority queue. Since the priority queue extracts the vertex with minimum tentative distance among all vertices outside S, we must have dist[u] <= dist[y].
Combining these inequalities yields:
dist[u] <= dist[y] <= delta(s, u).
This directly contradicts our assumption that dist[u] > delta(s, u). Hence, dist[u] must equal delta(s, u).

Why non-negative weights are mandatory:
If edge weights can be negative, the inequality w(y -> u) >= 0 collapses! A negative edge encountered later along the path could retroactively reduce the path cost below dist[u]. Once Dijkstra settles a vertex u, it never revisits u or updates its finalized distance. With negative weights, this premature finalization leads to incorrect shortest paths, or infinite loops if stale checks are omitted. For graphs with negative weights, the Bellman-Ford algorithm must be used instead.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Network Delay Time on a directed graph with n = 4 vertices and source k = 2.
Directed edges given as (u, v, weight):
(2, 1, 1), (2, 3, 1), (3, 4, 1), (1, 4, 3).

Initial state:
dist = [inf, inf, 0, inf, inf] (1-indexed)
Priority Queue (min-heap of {dist, node}): [{0, 2}]

Step 1:
Pop {0, 2}.
d = 0 matches dist[2] = 0. Vertex 2 is permanently settled!
Relax neighbors of 2:
- Edge (2, 1, weight 1): dist[2] + 1 = 1 < dist[1] (inf). Set dist[1] = 1, push {1, 1}.
- Edge (2, 3, weight 1): dist[2] + 1 = 1 < dist[3] (inf). Set dist[3] = 1, push {1, 3}.
Queue: [{1, 1}, {1, 3}]

Step 2:
Pop {1, 1}.
d = 1 matches dist[1] = 1. Vertex 1 is settled!
Relax neighbors of 1:
- Edge (1, 4, weight 3): dist[1] + 3 = 4 < dist[4] (inf). Set dist[4] = 4, push {4, 4}.
Queue: [{1, 3}, {4, 4}]

Step 3:
Pop {1, 3}.
d = 1 matches dist[3] = 1. Vertex 3 is settled!
Relax neighbors of 3:
- Edge (3, 4, weight 1): dist[3] + 1 = 2 < dist[4] (currently 4). Set dist[4] = 2, push {2, 4}.
Queue: [{2, 4}, {4, 4}]

Step 4:
Pop {2, 4}.
d = 2 matches dist[4] = 2. Vertex 4 is settled!
Vertex 4 has no outgoing edges.
Queue: [{4, 4}]

Step 5:
Pop {4, 4}.
Here d = 4, but dist[4] is already 2! Because d > dist[4] (4 > 2), this is a stale entry from Step 2.
The check if (d > dist[u]) continue catches it and discards it immediately without relaxing any edges.
Queue is now empty.

Final distance array:
dist[1] = 1, dist[2] = 0, dist[3] = 1, dist[4] = 2.
The maximum delay time to reach all nodes is max(1, 0, 1, 2) = 2.`,
      },
      {
        title: "Implementation",
        body: `Here is the canonical implementation of Dijkstra's algorithm solving Network Delay Time. A min-priority queue with std::greater pairs distance with vertex id, and lazy deletion discards stale heap entries in O(1) time.`,
        code: `// Network Delay Time: single-source shortest path using Dijkstra's algorithm.
int networkDelayTime(vector<vector<int>>& times, int n, int k) {
    // Build adjacency list: u -> list of (v, weight)
    vector<vector<pair<int, int>>> adj(n + 1);
    for (const auto& t : times) {
        adj[t[0]].push_back({t[1], t[2]});
    }

    const int INF = 1e9;
    vector<int> dist(n + 1, INF);
    // Min-heap storing {distance, vertex}
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;

    dist[k] = 0;
    pq.push({0, k});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();

        // Lazy deletion: skip stale entries from earlier relaxations
        if (d > dist[u]) continue;

        for (const auto& [v, weight] : adj[u]) {
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                pq.push({dist[v], v});
            }
        }
    }

    int maxDist = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == INF) return -1; // Unreachable node
        maxDist = max(maxDist, dist[i]);
    }
    return maxDist;
}`,
      },
      {
        title: "Variants",
        body: `Minimax Bottleneck Path (Path With Minimum Effort / Swim in Rising Water):
In standard Dijkstra, path cost is the additive sum of edge weights. In minimax problems, path cost is defined as the maximum edge weight encountered along the path. Instead of relaxing with dist[u] + weight, the transition becomes max(dist[u], weight). Because the max operation is monotonic (adding a non-negative edge weight cannot decrease the path maximum), Dijkstra's greedy choice property remains completely valid.

State-Augmented Dijkstra (Cheapest Flights Within K Stops):
When edge traversals carry a secondary constraint, such as a fuel limit, battery charge, or maximum allowed transfers, the graph vertex space is expanded to a state tuple (vertex, constraint_state). Distances are tracked in a 2D table dist[u][stops], preventing paths with higher costs but fewer stops from being discarded prematurely.

0-1 BFS (Dial's Algorithm with binary weights):
When edge weights are restricted to {0, 1}, a full priority queue is unnecessarily heavy. A std::deque processes 0-weight edges by pushing them to the front and 1-weight edges to the back, computing shortest paths in optimal O(V + E) time without logarithmic heap overhead.

Multi-Source Dijkstra:
When shortest paths are needed from any of several starting locations simultaneously, all source vertices are inserted into the min-priority queue at distance 0 before the loop begins. The search wavefront expands concurrently from all origins, computing the distance to the closest source across the entire graph.`,
      },
      {
        title: "Implementation: Minimax Path",
        body: `Path With Minimum Effort demonstrates Dijkstra applied to a 2D grid where path cost is the maximum absolute elevation difference between consecutive cells.`,
        code: `// Path With Minimum Effort: minimax Dijkstra on a 2D grid.
int minimumEffortPath(vector<vector<int>>& heights) {
    int rows = heights.size(), cols = heights[0].size();
    const int INF = 1e9;
    vector<vector<int>> effort(rows, vector<int>(cols, INF));

    // Min-heap storing {current_max_effort, row, col}
    using State = tuple<int, int, int>;
    priority_queue<State, vector<State>, greater<State>> pq;

    effort[0][0] = 0;
    pq.push({0, 0, 0});

    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};

    while (!pq.empty()) {
        auto [eff, r, c] = pq.top();
        pq.pop();

        if (eff > effort[r][c]) continue;
        if (r == rows - 1 && c == cols - 1) return eff;

        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                int nextEff = max(eff, abs(heights[r][c] - heights[nr][nc]));
                if (nextEff < effort[nr][nc]) {
                    effort[nr][nc] = nextEff;
                    pq.push({nextEff, nr, nc});
                }
            }
        }
    }
    return 0;
}`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
Using a binary min-heap with adjacency lists, each vertex is extracted from the priority queue at most once as a settled node, contributing O(V log V) time. Each of the E edges is relaxed at most once, which can insert a new pair into the priority queue, contributing O(E log V) time. With lazy deletion, the priority queue may hold up to E elements, making heap operations cost O(log E) = O(log V^2) = O(2 log V) = O(log V). Therefore, the overall time complexity is strictly O((V + E) log V).
For dense graphs where E is close to V^2, an unheaped array-based Dijkstra running in O(V^2) is theoretically faster, but on competitive programming graphs and real-world networks which are almost always sparse (E << V^2), the min-heap implementation dominates.

Space complexity:
The adjacency list requires O(V + E) memory to store vertices and directed edges. The distance array requires O(V) space. In the worst case, the lazy-deletion min-heap can store up to O(E) elements simultaneously before stale entries are cleared. The total auxiliary space complexity is O(V + E).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Negative edge weights: Dijkstra's greedy choice assumption breaks down completely when any edge weight is negative. A negative edge can provide a retroactive discount to a path through an already settled vertex, leading to incorrect distances. Use Bellman-Ford or SPFA when negative weights exist.

Omitting lazy-deletion stale checks: Forgetting the if (d > dist[u]) continue; check causes stale entries to re-examine all outgoing edges of u multiple times. In pathological graphs with many parallel paths, this leads to exponential queue expansions and Time Limit Exceeded (TLE).

Integer overflow on distance addition: Initializing unreachable distances to INT_MAX can lead to integer overflow when executing dist[u] + weight. If dist[u] is INT_MAX, dist[u] + weight wraps around to negative values, corrupting shortest path comparisons. Always use a safe sentinel like 1e9 or 1e18 (with long long), or explicitly guard relaxations with if (dist[u] != INF).

1-indexed versus 0-indexed vertex numbering: Graph problems frequently alternate between 0-indexed vertices (0 to n - 1) and 1-indexed vertices (1 to n). Size your adjacency lists and distance tables to n + 1 when 1-indexed to avoid out-of-bounds memory accesses.

Disconnected target reachability: If the destination vertex cannot be reached from the source, dist[target] remains at the initial sentinel infinity. Always verify whether dist[target] == INF before returning or formatting the answer.`,
      },
      {
        title: "Practice order",
        body: `Begin with Network Delay Time to master the standard min-heap template, lazy deletion, and 1-indexed graph representations. Next, solve Path With Minimum Effort to learn the minimax adaptation where path cost is defined as the maximum step effort rather than an additive sum. Then, solve Swim in Rising Water to reinforce minimax grid navigation under time constraints. Finally, study Cheapest Flights Within K Stops to see why hop-bounded constraints challenge standard Dijkstra and how state augmentation or Bellman-Ford handles step limits.`,
      },
    ],
  },

  "bellman-ford": {
    intro:
      "The Bellman-Ford algorithm computes single-source shortest paths on arbitrary directed graphs, including those with negative edge weights, and detects reachable negative weight cycles. Unlike greedy algorithms that finalize vertices early, Bellman-Ford repeatedly relaxes every edge in the graph across V - 1 rounds, based on the structural principle that any simple shortest path contains at most V - 1 edges. A subsequent V-th relaxation round serves as an infallible negative cycle detector. For sparse graphs in practice, the Shortest Path Faster Algorithm (SPFA) optimizes relaxation by maintaining a FIFO queue of candidate vertices, while 0-1 BFS provides an optimal O(V + E) alternative when edge weights are constrained to 0 and 1. You reach for Bellman-Ford when graphs contain negative weights, detecting currency arbitrage in financial networks, shortest paths with hop limits such as Cheapest Flights Within K Stops, and grid reachability with binary obstacles in Minimum Obstacle Removal to Reach Corner.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine you are tracking rumors spreading through a social network. At time 0, only the original source knows the truth. In round 1, everyone directly connected to the source by a single link learns the rumor and estimates their arrival time. In round 2, people two links away hear the rumor through intermediaries. With each passing round, the information propagates one edge deeper into the network.

Edge relaxation is the core operational primitive of shortest path algorithms: if we know an estimated distance dist[u] to vertex u, and there is a directed edge from u to v with weight w, then the distance to v can be at most dist[u] + w. If dist[u] + w < dist[v], we relax the edge by updating dist[v] = dist[u] + w.

Why does Bellman-Ford execute exactly V - 1 rounds of edge relaxation?
Consider any graph without negative weight cycles. The shortest path between any two vertices must be a simple path: it never needs to visit any vertex more than once, because revisiting a vertex would form a cycle of non-negative weight, which could be excised without increasing the total path length. In a graph with V vertices, any simple path can contain at most V - 1 edges.
In round 1, all shortest paths consisting of 1 edge are correctly computed.
In round 2, all shortest paths consisting of at most 2 edges are correctly computed.
By round V - 1, all shortest paths consisting of at most V - 1 edges are guaranteed to be fully discovered!

What happens if we run a V-th round?
If the graph contains no negative cycles reachable from the source, all shortest paths are simple and have at most V - 1 edges. Therefore, every edge has already reached its optimal relaxed state, and round V will produce zero updates.
However, if any edge can still be relaxed during round V, it means a path's cost can be reduced by using V or more edges. The only way traversing more edges reduces cost is if the path loops through a cycle whose total weight is strictly negative! Thus, the V-th round acts as an elegant, foolproof detector of negative cycles.

Hop-Constrained Shortest Paths:
In problems like Cheapest Flights Within K Stops, we want the shortest path from source to destination using at most K stops (which corresponds to at most K + 1 flight edges). Bellman-Ford maps directly onto this requirement: we run exactly K + 1 rounds of relaxation. To prevent a chain of relaxations within a single round from traversing multiple edges (for example, relaxing 0 -> 1 and then immediately relaxing 1 -> 2 using the newly updated dist[1]), we create a snapshot copy of the previous round's distances and read strictly from that copy during relaxation.`,
      },
      {
        title: "Why it works",
        body: `We present the formal correctness proof of Bellman-Ford's path convergence and negative cycle detection.

Convergence Lemma:
Let G = (V, E) be a directed graph with source s, and assume G contains no negative-weight cycles reachable from s. For any vertex v reachable from s, let delta(s, v) be the shortest path distance from s to v. Let P = (v_0 = s, v_1, v_2, ..., v_k = v) be an arbitrary simple shortest path from s to v, where k <= V - 1. Then after i rounds of Bellman-Ford relaxation (where 1 <= i <= k), dist[v_i] = delta(s, v_i).

Proof by Induction on i:
Base case (i = 0): Prior to the first round, dist[s] = 0 = delta(s, s). The base case holds.
Inductive step: Assume that after round i - 1, dist[v_{i-1}] = delta(s, v_{i-1}).
In round i, the algorithm considers every edge in E, including the edge (v_{i-1}, v_i) on path P.
During the relaxation of (v_{i-1}, v_i), the algorithm executes:
dist[v_i] <= dist[v_{i-1}] + w(v_{i-1}, v_i) = delta(s, v_{i-1}) + w(v_{i-1}, v_i) = delta(s, v_i).
Because dist[v_i] can never be strictly less than the true shortest path distance delta(s, v_i) (no path shorter than the shortest path exists), we must have dist[v_i] = delta(s, v_i).
Since every simple path has at most V - 1 edges, after V - 1 rounds, dist[v] = delta(s, v) for every reachable vertex v.

Negative Cycle Detection Theorem:
A graph G contains a negative cycle reachable from s if and only if some edge can be relaxed in the V-th round.

Proof:
(=>) Suppose there is a negative cycle C = (x_0, x_1, ..., x_k = x_0) reachable from s, where sum_{j=1}^k w(x_{j-1}, x_j) < 0.
Assume for contradiction that no edge can be relaxed in round V. Then for all edges in the graph, dist[v] <= dist[u] + w(u, v).
In particular, for every edge along the cycle C:
dist[x_j] <= dist[x_{j-1}] + w(x_{j-1}, x_j) for all j from 1 to k.
Summing these k inequalities around the entire cycle:
sum_{j=1}^k dist[x_j] <= sum_{j=1}^k dist[x_{j-1}] + sum_{j=1}^k w(x_{j-1}, x_j).
Because the cycle returns to its starting vertex, the set of vertices {x_1, ..., x_k} is identical to {x_0, ..., x_{k-1}}.
Thus, sum_{j=1}^k dist[x_j] equals sum_{j=1}^k dist[x_{j-1}].
Subtracting this identical sum from both sides yields:
0 <= sum_{j=1}^k w(x_{j-1}, x_j) = weight(C) < 0.
This is a direct contradiction (0 < 0). Therefore, at least one edge on the negative cycle must be relaxable in round V.
(<=) If an edge (u, v) can be relaxed in round V, there exists a path from s to v with V edges whose weight is strictly less than any path with fewer edges. By the Pigeonhole Principle, a path with V edges visits V + 1 vertices, meaning at least one vertex must be repeated. The repeated subpath forms a cycle whose total weight must be negative (otherwise removing it would not increase the path weight). Hence, a reachable negative cycle exists.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Cheapest Flights Within K Stops with n = 4, src = 0, dst = 3, k = 1.
Flights: [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]].
Here k = 1 means at most 1 stop, allowing at most k + 1 = 2 flights.

Initial state:
dist = [0, inf, inf, inf]

Round 1 (allows paths with at most 1 flight):
Snapshot copy of dist: prev = [0, inf, inf, inf]
Relax all flight edges using prev:
- Flight [0, 1, 100]: prev[0] = 0 != inf -> dist[1] = min(inf, 0 + 100) = 100.
- Flight [1, 2, 100]: prev[1] = inf -> skipped.
- Flight [2, 0, 100]: prev[2] = inf -> skipped.
- Flight [1, 3, 600]: prev[1] = inf -> skipped.
- Flight [2, 3, 200]: prev[2] = inf -> skipped.
End of Round 1:
dist = [0, 100, inf, inf]
Only destination 1 was reachable in 1 flight.

Round 2 (allows paths with at most 2 flights):
Snapshot copy of dist: prev = [0, 100, inf, inf]
Relax all flight edges using prev:
- Flight [0, 1, 100]: prev[0] = 0 -> dist[1] = min(100, 0 + 100) = 100.
- Flight [1, 2, 100]: prev[1] = 100 -> dist[2] = min(inf, 100 + 100) = 200.
- Flight [2, 0, 100]: prev[2] = inf -> skipped.
- Flight [1, 3, 600]: prev[1] = 100 -> dist[3] = min(inf, 100 + 600) = 700.
- Flight [2, 3, 200]: prev[2] = inf -> skipped.
End of Round 2:
dist = [0, 100, 200, 700]

Notice why the snapshot prev was vital:
If we had updated dist in-place during Round 1, flight [0, 1, 100] would set dist[1] = 100, and subsequent flight [1, 2, 100] in the same round would have set dist[2] = 200, effectively using 2 flights in Round 1! The snapshot ensures each round traverses strictly one flight.
Since k = 1 stops corresponds to 2 rounds, the algorithm terminates.
Shortest price to destination 3 within 1 stop is dist[3] = 700.
(The cheaper route 0 -> 1 -> 2 -> 3 costs 400 but requires 2 stops / 3 flights, which exceeds the k = 1 stop limit).`,
      },
      {
        title: "Implementation",
        body: `Here is the hop-constrained Bellman-Ford implementation solving Cheapest Flights Within K Stops. A temporary copy of the distance array isolates each round to exactly one edge traversal.`,
        code: `// Cheapest Flights Within K Stops: hop-constrained Bellman-Ford.
int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
    const int INF = 1e9;
    vector<int> dist(n, INF);
    dist[src] = 0;

    // k stops means at most k + 1 flights (edges)
    for (int round = 0; round <= k; round++) {
        vector<int> prev = dist; // Snapshot previous round's distances
        for (const auto& f : flights) {
            int u = f[0], v = f[1], price = f[2];
            if (prev[u] != INF && prev[u] + price < dist[v]) {
                dist[v] = prev[u] + price;
            }
        }
    }

    return dist[dst] == INF ? -1 : dist[dst];
}`,
      },
      {
        title: "Variants",
        body: `Shortest Path Faster Algorithm (SPFA):
Standard Bellman-Ford unconditionally scans all E edges every round, even if the source vertices of those edges experienced no distance improvements. SPFA optimizes this with a queue: only vertices whose distances were relaxed in the previous step are placed into the queue. When u is popped, only its outgoing edges are relaxed. To detect negative cycles, SPFA tracks the number of times each vertex has entered the queue; if any vertex enters V times, a negative cycle exists. While worst-case O(V * E) on adversarial graphs, SPFA averages O(E) on typical sparse graphs.

0-1 BFS with std::deque (Minimum Obstacle Removal to Reach Corner):
When edge weights are strictly 0 or 1, we can compute single-source shortest paths in O(V + E) time without a priority queue. A std::deque maintains the distance frontier: 0-weight edges push to the front (cost unchanged, processed in current level), while 1-weight edges push to the back (cost incremented by 1, processed in the next level). This eliminates the logarithmic overhead of Dijkstra and the multi-pass overhead of Bellman-Ford.

Negative Cycle Extraction:
To reconstruct the actual vertices participating in a negative cycle, maintain a predecessor array parent. When an edge (u, v) relaxes during the V-th round, trace backward along parent pointers for V steps to guarantee landing inside the cycle, then collect the cycle vertices until the starting node is revisited.`,
      },
      {
        title: "Implementation: 0-1 BFS",
        body: `Minimum Obstacle Removal to Reach Corner models the grid as a weighted graph where empty cells have weight 0 and obstacle cells have weight 1. A double-ended queue (std::deque) pushes 0-weight moves to the front and 1-weight moves to the back, ensuring vertices are extracted in monotonic order of cumulative obstacles removed in linear O(m * n) time.`,
        code: `// Minimum Obstacle Removal to Reach Corner: 0-1 BFS using std::deque.
int minimumObstacles(vector<vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    const int INF = 1e9;
    vector<vector<int>> dist(m, vector<int>(n, INF));
    deque<pair<int, int>> dq;

    dist[0][0] = 0;
    dq.push_front({0, 0});

    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};

    while (!dq.empty()) {
        auto [r, c] = dq.front();
        dq.pop_front();

        if (r == m - 1 && c == n - 1) return dist[r][c];

        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                int weight = grid[nr][nc];
                if (dist[r][c] + weight < dist[nr][nc]) {
                    dist[nr][nc] = dist[r][c] + weight;
                    if (weight == 0) {
                        dq.push_front({nr, nc}); // 0-cost edge goes to front
                    } else {
                        dq.push_back({nr, nc});  // 1-cost edge goes to back
                    }
                }
            }
        }
    }
    return dist[m - 1][n - 1];
}`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
Standard Bellman-Ford runs V - 1 rounds of edge relaxation, scanning all E edges in each round. With an optional V-th round for negative cycle detection, total time is strictly O(V * E).
Hop-constrained Bellman-Ford runs K + 1 rounds, taking O(K * E) time.
SPFA achieves average-case O(E) on random sparse graphs, but can degenerate to O(V * E) on specially constructed adversarial grid graphs.
0-1 BFS visits each vertex once and traverses each edge once using a double-ended queue, running in strictly optimal O(V + E) time.

Space complexity:
Standard Bellman-Ford and hop-constrained variants require O(V) auxiliary space for the distance array and snapshot vector, and O(E) to store the edge list.
0-1 BFS requires O(V) memory for the 2D distance table and std::deque. Overall auxiliary space is O(V + E).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Cascading updates in hop-constrained shortest paths: When implementing hop-limited shortest paths, updating the distance array in-place allows a single iteration to chain multiple edges together. For instance, relaxing edge (u, v) and then (v, w) in the same loop allows a 2-hop path to be counted in 1 round. Always clone the distance array (vector<int> prev = dist) at the start of each round and read exclusively from prev.

Integer overflow on unreachable nodes: When checking if prev[u] + price < dist[v], if prev[u] is initialized to INT_MAX, adding price will cause signed integer overflow and undefined behavior. Guard the relaxation with if (prev[u] != INF).

Unreachable negative cycles: Standard Bellman-Ford initialized with dist[src] = 0 and dist[v] = INF for all v != src only detects negative cycles that are reachable from the source vertex src. If a negative cycle exists in a disconnected component, it will not be detected. To detect negative cycles anywhere in the graph, initialize dist[v] = 0 for all vertices simultaneously or connect a virtual super-source to all vertices with weight 0.

Early termination optimization: In standard Bellman-Ford, if a complete round passes without a single distance update, the algorithm has reached fixed-point convergence and can safely terminate early without completing all V - 1 rounds.`,
      },
      {
        title: "Practice order",
        body: `Begin with Cheapest Flights Within K Stops to master hop-constrained Bellman-Ford relaxation and understand why snapshotting the distance array prevents cascading edge updates. Then, solve Minimum Obstacle Removal to Reach Corner to master 0-1 BFS with std::deque, learning how binary edge weights allow linear-time shortest path computation without priority queue overhead.`,
      },
    ],
  },

  "floyd-warshall": {
    intro:
      "The Floyd-Warshall algorithm is an all-pairs shortest path dynamic programming algorithm that finds the shortest path between every pair of vertices in an edge-weighted graph in O(V^3) time and O(V^2) space. It supports both positive and negative edge weights and identifies negative weight cycles anywhere in the network. The core insight decomposes the problem using permissible intermediate vertices: for every vertex pair (i, j), the algorithm determines whether routing through an intermediate vertex k improves the path compared to using only intermediate vertices from {0, ..., k - 1}. You reach for Floyd-Warshall when the graph has a small number of vertices (typically V <= 400), when dense all-pairs connectivity or transitive closure is required, and for multi-criteria network queries such as Find the City With the Smallest Number of Neighbors at a Threshold Distance.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine an airline company building out its flight route network between n cities. On day 0, passengers can only book direct non-stop flights between city i and city j. If no direct flight exists, the distance is infinite.

On day 1, the airline opens a hub in city 0. Passengers can now choose to either take the existing direct flight from i to j, or layover at hub 0: i -> 0 -> j. If the layover route is faster, the shortest distance between i and j is updated.

On day 2, the airline opens a second hub in city 1. Passengers can now take direct flights, layover at hub 0, layover at hub 1, or layover at both hubs in sequence (e.g., i -> 0 -> 1 -> j). The algorithm checks whether routing through hub 1 improves the best route previously established.

By day k, the airline has permitted hubs {0, 1, ..., k - 1} as allowable intermediate stops. At step k, the algorithm considers allowing city k as a newly enabled hub. For every pair of cities (i, j), the shortest path using any subset of intermediate hubs {0, ..., k} is either:
1. The previous best path that did not use hub k (which only uses intermediate hubs from {0, ..., k - 1}).
2. A path composed of the previous best path from i to k plus the previous best path from k to j.

Because any simple shortest path between any two vertices in a graph of V vertices visits a subset of vertices from {0, ..., V - 1}, allowing every vertex to act as an intermediate hub in succession guarantees that by the time k = V - 1 finishes, all shortest paths across the entire graph have been evaluated.

The Outermost Loop Imperative:
The most famous mistake when implementing Floyd-Warshall is placing the loop over intermediate vertex k inside the loops over i and j. The intermediate vertex k represents the state transition index of the dynamic programming recurrence: moving from subproblems over intermediate set {0, ..., k - 1} to intermediate set {0, ..., k}. Placing k on the inside means dist[i][k] and dist[k][j] would not yet reflect paths using earlier intermediate vertices, corrupting the dynamic program. The loop over k MUST be the outermost loop.`,
      },
      {
        title: "Why it works",
        body: `We formulate the dynamic programming recurrence and prove its optimal substructure.

State Definition:
Let dp[k][i][j] denote the length of the shortest path from vertex i to vertex j such that all intermediate vertices on the path are drawn strictly from the set {0, 1, ..., k}. An intermediate vertex is any vertex on the path other than the endpoints i and j.

Base Case (k = -1, or day 0 with no intermediate vertices allowed):
dp[-1][i][i] = 0 for all i.
dp[-1][i][j] = weight(i, j) if a directed edge (i, j) exists in E.
dp[-1][i][j] = infinity if i != j and no direct edge exists.

Recurrence Relation:
For k >= 0, consider a shortest path P from i to j whose intermediate vertices belong to {0, 1, ..., k}.
There are two mutually exclusive cases:
Case 1: Vertex k is not an intermediate vertex on path P.
Then all intermediate vertices on P belong to {0, 1, ..., k - 1}. The length of path P is therefore dp[k - 1][i][j].
Case 2: Vertex k is an intermediate vertex on path P.
Assuming there are no negative weight cycles, a shortest path is simple and visits vertex k at most once. Thus, vertex k divides path P into two subpaths: P_1 from i to k, and P_2 from k to j.
Because all intermediate vertices of P are in {0, ..., k}, and vertex k is an endpoint of both subpaths (not an intermediate vertex of P_1 or P_2), all intermediate vertices of P_1 and P_2 must be drawn strictly from {0, 1, ..., k - 1}.
By the principle of optimal substructure, P_1 must be a shortest path from i to k with intermediate vertices in {0, ..., k - 1}, having length dp[k - 1][i][k]. Similarly, P_2 must be a shortest path from k to j with intermediate vertices in {0, ..., k - 1}, having length dp[k - 1][k][j].
Therefore, the length of path P in this case is dp[k - 1][i][k] + dp[k - 1][k][j].

Taking the minimum over both possibilities yields the Floyd-Warshall recurrence:
dp[k][i][j] = min(dp[k - 1][i][j], dp[k - 1][i][k] + dp[k - 1][k][j]).

Space Optimization from O(V^3) to O(V^2):
Notice that for the row i = k:
dp[k][k][j] = min(dp[k - 1][k][j], dp[k - 1][k][k] + dp[k - 1][k][j]) = dp[k - 1][k][j] because dp[k - 1][k][k] = 0.
Similarly, for the column j = k:
dp[k][i][k] = min(dp[k - 1][i][k], dp[k - 1][i][k] + dp[k - 1][k][k]) = dp[k - 1][i][k].
This means values in row k and column k do not change during phase k! Updating the table in-place using a single 2D matrix dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) never reads an overwritten value prematurely, reducing space complexity from O(V^3) to O(V^2).

Negative Cycle Detection:
Initially, dist[i][i] = 0 for all i. If any negative weight cycle exists that includes vertex i, the path i -> ... -> i will yield a total weight strictly less than 0. Therefore, after Floyd-Warshall completes, if there exists any vertex i such that dist[i][i] < 0, a negative cycle exists.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Find the City With the Smallest Number of Neighbors at a Threshold Distance with n = 4, distanceThreshold = 4.
Edges: [[0, 1, 3], [1, 2, 1], [1, 3, 4], [2, 3, 1]].

Step 1: Initialize distance matrix dist[4][4] with 0 on diagonal and INF elsewhere:
[  0,   3, INF, INF]
[  3,   0,   1,   4]
[INF,   1,   0,   1]
[INF,   4,   1,   0]

Step 2: Outer loop k = 0 (intermediate vertex 0):
Check if routing through 0 improves any pair (i, j):
Only paths connected to 0 can change:
- Pair (1, 1): dist[1][0] + dist[0][1] = 3 + 3 = 6 > 0.
No values improve. Matrix remains unchanged.

Step 3: Outer loop k = 1 (intermediate vertex 1):
Pairs connected through 1:
- dist[0][2]: min(INF, dist[0][1] + dist[1][2]) = min(INF, 3 + 1) = 4.
- dist[2][0]: min(INF, dist[2][1] + dist[1][0]) = min(INF, 1 + 3) = 4.
- dist[0][3]: min(INF, dist[0][1] + dist[1][3]) = min(INF, 3 + 4) = 7.
- dist[3][0]: min(INF, dist[3][1] + dist[1][0]) = min(INF, 4 + 3) = 7.
Matrix after k = 1:
[  0,   3,   4,   7]
[  3,   0,   1,   4]
[  4,   1,   0,   1]
[  7,   4,   1,   0]

Step 4: Outer loop k = 2 (intermediate vertex 2):
Pairs connected through 2:
- dist[0][3]: min(7, dist[0][2] + dist[2][3]) = min(7, 4 + 1) = 5.
- dist[3][0]: min(7, dist[3][2] + dist[2][0]) = min(7, 1 + 4) = 5.
- dist[1][3]: min(4, dist[1][2] + dist[2][3]) = min(4, 1 + 1) = 2.
- dist[3][1]: min(4, dist[3][2] + dist[2][1]) = min(4, 1 + 1) = 2.
Matrix after k = 2:
[  0,   3,   4,   5]
[  3,   0,   1,   2]
[  4,   1,   0,   1]
[  5,   2,   1,   0]

Step 5: Outer loop k = 3 (intermediate vertex 3):
Checking pairs through 3 produces no smaller values.

Count neighbors within threshold = 4 for each city:
- City 0: reachable cities with dist <= 4 are {1 (dist 3), 2 (dist 4)} -> count = 2.
- City 1: reachable cities are {0 (dist 3), 2 (dist 1), 3 (dist 2)} -> count = 3.
- City 2: reachable cities are {0 (dist 4), 1 (dist 1), 3 (dist 1)} -> count = 3.
- City 3: reachable cities are {1 (dist 2), 2 (dist 1)} -> count = 2.

Both City 0 and City 3 have the minimum neighbor count (2).
The problem specifies choosing the city with the greatest index in case of a tie.
Comparing indices 0 and 3, City 3 is chosen. Output = 3.`,
      },
      {
        title: "Implementation",
        body: `Here is the Floyd-Warshall implementation solving Find the City With the Smallest Number of Neighbors at a Threshold Distance. Three nested loops update all-pairs distances in place, with k strictly on the outside.`,
        code: `// Find the City With the Smallest Number of Neighbors at a Threshold Distance.
int findTheCity(int n, vector<vector<int>>& edges, int distanceThreshold) {
    const int INF = 1e9;
    vector<vector<int>> dist(n, vector<int>(n, INF));

    for (int i = 0; i < n; i++) {
        dist[i][i] = 0;
    }

    for (const auto& e : edges) {
        int u = e[0], v = e[1], w = e[2];
        dist[u][v] = w;
        dist[v][u] = w;
    }

    // Floyd-Warshall: k MUST be the outermost loop
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dist[i][k] != INF && dist[k][j] != INF) {
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);
                }
            }
        }
    }

    int minNeighbors = n + 1;
    int bestCity = -1;

    for (int i = 0; i < n; i++) {
        int count = 0;
        for (int j = 0; j < n; j++) {
            if (i != j && dist[i][j] <= distanceThreshold) {
                count++;
            }
        }
        // Choose smaller count, or break ties by picking larger city index
        if (count <= minNeighbors) {
            minNeighbors = count;
            bestCity = i;
        }
    }

    return bestCity;
}`,
      },
      {
        title: "Variants",
        body: `Transitive Closure (Warshall's Algorithm):
When determining simple reachability (whether a directed path exists from i to j regardless of edge weights), the distance values are replaced with booleans. The transition simplifies to reach[i][j] = reach[i][j] || (reach[i][k] && reach[k][j]). Using std::bitset, row i can be updated by bitwise OR with row k: reach[i] |= reach[k] whenever reach[i][k] is true. This bitset acceleration reduces the runtime from O(V^3) to O(V^3 / 64), solving reachability for V up to 2000 within standard competitive programming time limits.

Path Reconstruction:
To reconstruct the sequence of vertices forming the shortest path from i to j, maintain an auxiliary matrix next_hop[i][j], initialized to j for every direct edge (i, j). When routing through k improves the distance (dist[i][k] + dist[k][j] < dist[i][j]), update next_hop[i][j] = next_hop[i][k]. The complete path is extracted by walking from start = i through curr = next_hop[curr][j] until destination j is reached.

Minimax / Maximin All-Pairs:
Floyd-Warshall readily adapts to non-additive path metrics. For widest path (maximizing the minimum edge capacity along the path), initialize dist[i][j] to edge capacities and transition via dist[i][j] = max(dist[i][j], min(dist[i][k], dist[k][j])).`,
      },
      {
        title: "Implementation: Path Reconstruction and Transitive Closure",
        body: `Path reconstruction uses a next_hop routing table initialized with direct destinations next_hop[i][j] = j and updated to next_hop[i][k] whenever routing through intermediate vertex k provides a strictly shorter path. Once the distance matrix stabilizes, tracing next_hop pointers from source to target yields the exact sequence of traversed vertices without additional graph searches.`,
        code: `// All-pairs shortest path reconstruction using next_hop pointer matrix.
vector<int> reconstructPath(int u, int v, const vector<vector<int>>& next_hop, const vector<vector<int>>& dist) {
    const int INF = 1e9;
    if (dist[u][v] == INF) return {}; // Unreachable
    vector<int> path = {u};
    while (u != v) {
        u = next_hop[u][v];
        path.push_back(u);
    }
    return path;
}`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
Floyd-Warshall consists of three nested loops, each iterating through all V vertices from 0 to V - 1. The innermost body performs an addition and a minimum comparison in O(1) time. The time complexity is strictly O(V^3) under all circumstances, regardless of edge density or graph structure.
When using std::bitset for transitive closure, bitwise parallelism processes 64 vertex pairs in a single CPU word operation, achieving O(V^3 / 64) time.

Space complexity:
The all-pairs distance matrix requires a 2D table of dimensions V x V, taking O(V^2) space. If path reconstruction is required, the next_hop matrix adds an additional O(V^2) space. Overall auxiliary space complexity is O(V^2).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Permuting the loop variables: Placing the loop over intermediate vertex k inside the loops over i and j is the single most common implementation error. The algorithm will produce incorrect distances because paths using multiple intermediate hubs will fail to assemble in the proper dynamic programming topological order. Always ensure k is the outermost loop.

Integer overflow on sentinel addition: When dist[i][k] is INF, evaluating dist[i][k] + dist[k][j] causes 32-bit signed integer overflow if INF is set to INT_MAX. Always guard with if (dist[i][k] != INF && dist[k][j] != INF) before adding, or set the INF sentinel to 1e9 (with 32-bit integers) or 1e18 (with 64-bit integers).

Duplicate parallel edges: In multigraphs with multiple edges between the same pair of vertices (u, v), initializing dist[u][v] = w naively can overwrite a smaller edge with a larger one. Always initialize with dist[u][v] = min(dist[u][v], w).

Diagonal initialization: Failing to set dist[i][i] = 0 causes self-distances to default to INF. This prevents paths from using vertex i as an endpoint properly.`,
      },
      {
        title: "Practice order",
        body: `Solve Find the City With the Smallest Number of Neighbors at a Threshold Distance to practice the canonical three-nested-loop template, in-place matrix updates, and tie-breaking logic on all-pairs shortest distances.`,
      },
    ],
  },

  mst: {
    intro:
      "A Minimum Spanning Tree (MST) is a subset of edges in a connected, edge-weighted undirected graph that connects all V vertices together without any cycles while minimizing the total sum of edge weights. Any valid spanning tree contains exactly V - 1 edges. Two foundational greedy algorithms solve the MST problem: Kruskal's algorithm, which sorts all edges globally and adds them greedily if they do not create a cycle using Disjoint Set Union (DSU), running in O(E log E); and Prim's algorithm, which grows a single connected component outward by repeatedly selecting the cheapest crossing edge with a min-priority queue, running in O(E log V). Both algorithms are mathematically justified by the Cut Property. You reach for MST algorithms when designing physical communication networks, clustering points in geometric spaces such as Min Cost to Connect All Points, or solving augmented resource networks with virtual super-sources like Optimize Water Distribution in a Village.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine laying fiber-optic cables to connect a set of cities. You want every city to be able to communicate with every other city, either directly or through intermediate relay cities. Trenching fiber along any road incurs a specific construction cost. What is the cheapest possible network that connects all cities?
Notice that you will never build a cycle of cables: if a network connects all cities and contains a cycle, you can remove the most expensive cable in that cycle and all cities will still remain fully connected at a strictly lower cost. A connected, acyclic graph on V vertices is a spanning tree, and one that minimizes the total construction cost is a Minimum Spanning Tree.

Two distinct perspectives yield two classic algorithms:

Kruskal's Algorithm (Global, Edge-Centric):
Kruskal adopts a global perspective. Imagine all possible edges dumped into a pile and sorted from cheapest to most expensive. We examine each edge in ascending order of cost.
If adding the edge connects two previously disconnected components, we include it in our tree!
If the endpoints already belong to the same connected component, adding the edge would form an unnecessary cycle with already cheaper edges, so we discard it.
We manage component membership and cycle detection using Disjoint Set Union (DSU) with path compression and union by rank or size. Kruskal naturally excels on sparse graphs or when edges are already provided as an explicit edge list.

Prim's Algorithm (Local, Frontier-Centric):
Prim adopts a growing-tree perspective, very similar to Dijkstra's shortest path algorithm. Start at an arbitrary seed vertex and declare it part of the tree.
At each step, look at all edges that cross the cut between vertices already in the tree and vertices outside the tree. Greedily pick the cheapest crossing edge, add the new vertex to the tree, and add all its incident edges to the cut frontier.
Repeat this process until all V vertices are in the tree. Prim excels on dense graphs where every vertex is connected to almost every other vertex.

The Virtual Super-Source Technique:
In problems like Optimize Water Distribution in a Village, you can either lay pipes between houses at cost pipe[i][j], or build a well at house i at cost well[i]. This looks like a mixture of vertex costs and edge costs.
We unify the problem by introducing a hypothetical virtual super-source (node 0, the 'water aquifer'). Laying a well at house i is modeled as an edge between node 0 and house i with weight well[i]. An MST on this augmented graph of V + 1 nodes automatically chooses the optimal combination of wells and pipes!`,
      },
      {
        title: "Why it works",
        body: `Both Kruskal's and Prim's algorithms are proved optimal by the Cut Property of minimum spanning trees.

The Cut Property:
Definition: A cut (S, V \\ S) is a partition of the vertices of G = (V, E) into two disjoint sets S and V \\ S. An edge e = (u, v) crosses the cut if u in S and v in V \\ S.
Theorem (Cut Property): For any cut (S, V \\ S) in a connected graph G, if edge e is a strictly minimum-weight edge crossing the cut, then edge e belongs to every minimum spanning tree of G.

Proof by Exchange Argument:
Let T be a minimum spanning tree of G, and suppose for contradiction that e = (u, v) does not belong to T.
Because T is a spanning tree, adding edge e to T creates a unique cycle C.
Since u is in S and v is in V \\ S, traversing cycle C from u to v and back must cross the cut between S and V \\ S at least once more along some other edge e' = (u', v') with u' in S and v' in V \\ S.
Now consider the graph T' = (T \\ {e'}) union {e}.
Removing e' breaks cycle C, leaving a connected graph with V - 1 edges that spans all vertices of G. Thus, T' is a valid spanning tree.
The total weight of T' is:
weight(T') = weight(T) - weight(e') + weight(e).
Because e is a minimum-weight edge crossing the cut (S, V \\ S), we know weight(e) <= weight(e').
Therefore, weight(T') <= weight(T).
Since T was assumed to be an MST, weight(T') cannot be strictly less than weight(T), meaning weight(T') = weight(T), so T' is also an MST that contains edge e. If e was strictly lighter than e', weight(T') < weight(T), directly contradicting the minimality of T. Hence, the greedy choice of selecting the cheapest edge crossing any cut is safe and optimal.

Correctness of Prim's Algorithm:
At each iteration, Prim partitions the vertices into S (vertices already in the tree) and V \\ S (vertices not yet in the tree). The algorithm greedily picks the minimum-weight edge crossing this cut. By the Cut Property, this edge is guaranteed to belong to an MST.

Correctness of Kruskal's Algorithm:
When Kruskal's algorithm selects edge e = (u, v), vertices u and v belong to two separate connected components, C_u and C_v. Consider the cut (C_u, V \\ C_u). Because Kruskal considers edges in non-decreasing order of weight, and no previously examined edge has crossed between C_u and V \\ C_u, edge e must be the minimum-weight edge crossing this cut. By the Cut Property, edge e is safe to add.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Min Cost to Connect All Points with 5 points:
Point 0: (0, 0)
Point 1: (2, 2)
Point 2: (3, 10)
Point 3: (5, 2)
Point 4: (7, 0)

Manhattan distance between (x1, y1) and (x2, y2) is |x1 - x2| + |y1 - y2|.
Because this graph is complete (every point can connect to every other point, E = V*(V-1)/2 = 10 edges), we use Prim's algorithm with an array min_dist[5] to avoid priority queue overhead.

Initial state:
in_mst = [false, false, false, false, false]
min_dist = [0, inf, inf, inf, inf]
total_cost = 0

Iteration 1:
Select unvisited point with minimum min_dist: Point 0 (dist 0).
in_mst[0] = true. total_cost += 0.
Update min_dist from Point 0 (0, 0):
- Point 1 (2, 2): |0-2| + |0-2| = 4. min_dist[1] = 4.
- Point 2 (3, 10): |0-3| + |0-10| = 13. min_dist[2] = 13.
- Point 3 (5, 2): |0-5| + |0-2| = 7. min_dist[3] = 7.
- Point 4 (7, 0): |0-7| + |0-0| = 7. min_dist[4] = 7.

Iteration 2:
Minimum unvisited point is Point 1 (dist 4).
in_mst[1] = true. total_cost += 4 (total = 4).
Update min_dist from Point 1 (2, 2):
- Point 2 (3, 10): |2-3| + |2-10| = 1 + 8 = 9 < 13. min_dist[2] = 9.
- Point 3 (5, 2): |2-5| + |2-2| = 3 < 7. min_dist[3] = 3.
- Point 4 (7, 0): |2-7| + |2-0| = 5 + 2 = 7 <= 7. min_dist[4] remains 7.

Iteration 3:
Minimum unvisited point is Point 3 (dist 3).
in_mst[3] = true. total_cost += 3 (total = 7).
Update min_dist from Point 3 (5, 2):
- Point 2 (3, 10): |5-3| + |2-10| = 2 + 8 = 10 >= 9. min_dist[2] remains 9.
- Point 4 (7, 0): |5-7| + |2-0| = 2 + 2 = 4 < 7. min_dist[4] = 4.

Iteration 4:
Minimum unvisited point is Point 4 (dist 4).
in_mst[4] = true. total_cost += 4 (total = 11).
Update min_dist from Point 4 (7, 0):
- Point 2 (3, 10): |7-3| + |0-10| = 4 + 10 = 14 >= 9. min_dist[2] remains 9.

Iteration 5:
Minimum unvisited point is Point 2 (dist 9).
in_mst[2] = true. total_cost += 9 (total = 20).
All 5 vertices are now in MST.

Final minimum cost = 20.`,
      },
      {
        title: "Implementation",
        body: `Here is the dense Prim implementation solving Min Cost to Connect All Points. Because the graph is complete, maintaining a min_dist array directly achieves optimal O(V^2) time and O(V) space without heap allocation.`,
        code: `// Min Cost to Connect All Points: dense Prim's algorithm in O(V^2).
int minCostConnectPoints(vector<vector<int>>& points) {
    int n = points.size();
    const int INF = 1e9;
    vector<int> min_dist(n, INF);
    vector<bool> in_mst(n, false);

    min_dist[0] = 0;
    int total_cost = 0;

    for (int step = 0; step < n; step++) {
        int u = -1;
        for (int i = 0; i < n; i++) {
            if (!in_mst[i] && (u == -1 || min_dist[i] < min_dist[u])) {
                u = i;
            }
        }

        in_mst[u] = true;
        total_cost += min_dist[u];

        for (int v = 0; v < n; v++) {
            if (!in_mst[v]) {
                int dist = abs(points[u][0] - points[v][0]) + abs(points[u][1] - points[v][1]);
                if (dist < min_dist[v]) {
                    min_dist[v] = dist;
                }
            }
        }
    }

    return total_cost;
}`,
      },
      {
        title: "Variants",
        body: `Kruskal's Algorithm with Disjoint Set Union:
For sparse graphs where E << V^2, Kruskal's algorithm is typically preferred. Edges are stored in a flat vector and sorted by weight. A DSU structure with path compression and union by rank processes each edge in amortized O(alpha(V)) time, completing in O(E log E) time.

Virtual Super-Source (Optimize Water Distribution in a Village):
When a problem mixes vertex-based activation costs (building a well in village i at cost well[i]) with edge-based connection costs (laying a pipe between village i and j at cost pipe[i][j]), introduce a virtual node 0. Add an edge from 0 to each village i with weight well[i]. Computing the MST on the (n + 1) vertices seamlessly solves the combined optimization.

Maximum Spanning Tree:
To find a tree that maximizes total edge weight (e.g., finding the most robust backbone), simply invert the comparator to sort edges descending in Kruskal, or use a max-priority queue in Prim.

Minimum Spanning Forest (K Components):
When clustering vertices into k distinct groups, run Kruskal's algorithm until exactly V - k edges have been added. The connected components formed by the DSU represent the optimal clusters maximizing the separation distance.`,
      },
      {
        title: "Implementation: Kruskal with Virtual Super-Source",
        body: `Kruskal's algorithm with a virtual super-source solves Optimize Water Distribution in a Village. Wells become edges from node 0, and DSU merges components.`,
        code: `// Disjoint Set Union helper for Kruskal's algorithm.
struct KruskalDSU {
    vector<int> parent;
    KruskalDSU(int n) : parent(n) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]);
    }
    bool unite(int x, int y) {
        int rx = find(x), ry = find(y);
        if (rx == ry) return false;
        parent[rx] = ry;
        return true;
    }
};

struct KruskalEdge {
    int u, v, weight;
    bool operator<(const KruskalEdge& other) const {
        return weight < other.weight;
    }
};

// Optimize Water Distribution in a Village: Kruskal with virtual node 0.
int minCostToSupplyWater(int n, vector<int>& wells, vector<vector<int>>& pipes) {
    vector<KruskalEdge> edges;
    // Connect virtual super-source 0 to each village i with well cost
    for (int i = 0; i < n; i++) {
        edges.push_back({0, i + 1, wells[i]});
    }
    for (const auto& p : pipes) {
        edges.push_back({p[0], p[1], p[2]});
    }

    sort(edges.begin(), edges.end());

    KruskalDSU dsu(n + 1);
    int total_cost = 0;
    int edges_count = 0;

    for (const auto& e : edges) {
        if (dsu.unite(e.u, e.v)) {
            total_cost += e.weight;
            edges_count++;
            if (edges_count == n) break; // n edges connects n + 1 vertices
        }
    }

    return total_cost;
}`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
Kruskal's algorithm is dominated by sorting the E edges, taking O(E log E) = O(E log V) time. The subsequent DSU operations take O(E * alpha(V)) time, where alpha is the inverse Ackermann function (effectively <= 4). Total time is O(E log E).
Prim's algorithm using a binary min-heap takes O(E log V) time, identical to Dijkstra.
Prim's algorithm on dense graphs without a heap takes O(V^2) time. For complete graphs where E = V^2 / 2 (such as geometric point clustering), the O(V^2) unheaped Prim strictly outperforms both Kruskal and heap Prim by avoiding the log V factor and reducing memory pressure.

Space complexity:
Kruskal's algorithm requires O(E) space to store the edge list and O(V) space for DSU parent arrays.
Prim's algorithm without a heap requires only O(V) auxiliary space for the min_dist and in_mst arrays. This makes dense Prim uniquely suitable when V = 1000 and allocating 10^6 explicit edges would approach memory limits.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Memory explosion on dense geometric graphs: Generating and storing all E = V * (V - 1) / 2 explicit edge objects for Kruskal on 10^4 vertices requires allocating roughly 5 * 10^7 edge structs (several hundred megabytes), causing Memory Limit Exceeded. Use Prim's algorithm with on-the-fly distance calculation to use only O(V) memory.

Disconnected graphs: If the graph is not connected, Kruskal will terminate with fewer than V - 1 edges added, and Prim will leave vertices unvisited (with min_dist remaining INF). Always check if the number of edges added equals V - 1 (or V when using a virtual super-source).

1-indexed vs 0-indexed vertices with virtual sources: When adding a virtual source at index 0, existing vertices numbered 1 to n fit naturally. If original vertices were 0-indexed (0 to n - 1), size your structures to n + 1 and map the virtual source to index n (or shift original vertices up by 1).

Equal-weight edges: If multiple edges have identical weights, the graph may possess multiple distinct Minimum Spanning Trees, but all will have the exact same total weight.`,
      },
      {
        title: "Practice order",
        body: `Begin with Min Cost to Connect All Points to learn Prim's algorithm on complete geometric graphs and observe how an O(V^2) array-based implementation avoids the memory overhead of generating explicit edge lists. Next, solve Optimize Water Distribution in a Village to master the virtual super-source pattern, learning how to seamlessly unify vertex construction costs and edge transmission costs into a single standard Kruskal MST.`,
      },
    ],
  },

  tarjan: {
    intro:
      "Tarjan's algorithm is a depth-first search framework that computes discovery times and low-link values in a single DFS pass to discover the fundamental connectivity structures of a graph: bridges (critical connections), articulation points (cut vertices), and strongly connected components (SCCs) in linear O(V + E) time. By establishing a DFS spanning tree, edges are partitioned into tree edges and back edges. The discovery time tin[u] marks when a vertex is first entered, while the low-link value low[u] represents the earliest discovery time reachable from u through its subtree using at most one back-edge. You reach for Tarjan's algorithm when identifying single points of failure in network topologies such as Critical Connections in a Network, finding biconnected components, solving 2-SAT satisfiability problems, and decomposing directed graphs into acyclic condensation DAGs.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine a communications network connecting server data centers. Some cables are redundant: if a cable is severed, traffic can simply reroute around an alternate ring. But other cables are critical bottlenecks: severing a single critical cable splits the network into two isolated partitions that can no longer communicate. In graph theory, such a critical bottleneck cable is called a bridge. Similarly, a server whose failure disconnects the remaining network is an articulation point.

How can we detect these single points of failure without redundantly testing every edge one by one in O(E * (V + E)) time? Robert Tarjan showed this can be achieved in a single linear O(V + E) DFS pass by comparing discovery times and low-link values.

The DFS Tree Perspective:
When depth-first search traverses an undirected connected graph, it constructs a DFS spanning tree. The edges traversed to reach unvisited vertices are called tree edges. All other edges in an undirected graph connect a vertex to an ancestor that was already visited earlier along the current search branch; these are called back-edges. Crucially, in an undirected graph, there are no cross-edges between separate branches!

Discovery Times and Low-Link Values:
As DFS visits vertices, we increment a global timer:
- tin[u]: the discovery timestamp when vertex u is first entered.
- low[u]: the lowest tin reachable from u or any descendant in u's DFS subtree by following tree edges down and at most one back-edge up.

The Bridge Intuition:
Suppose u is the parent of v in the DFS tree. Can v or any of its subtree descendants reach u or any ancestor of u through an alternate detour (a back-edge)?
- If yes, v's subtree has a back-edge leading to an ancestor with discovery time <= tin[u]. Therefore low[v] <= tin[u]. Edge (u, v) is part of a cycle and is NOT a bridge.
- If no, v's subtree is completely trapped! The earliest node reachable from v's subtree is v itself (or descendants inside v's subtree), meaning low[v] > tin[u]. The edge (u, v) is the sole conduit connecting v's entire subtree to the rest of the graph. Removing (u, v) isolates v's subtree completely. Hence, edge (u, v) is a bridge!

Articulation Points:
A non-root vertex u is an articulation point if it has a child v such that low[v] >= tin[u] (meaning v cannot get above u without passing through u). The root of the DFS tree is an articulation point if and only if it has two or more independent children in the DFS tree.`,
      },
      {
        title: "Why it works",
        body: `We present the formal correctness proof of Tarjan's bridge criterion.

Tree and Back-Edge Structure:
Lemma: In a DFS traversal of an undirected graph G, every edge is either a tree edge or a back-edge connecting an ancestor and a descendant in the DFS tree T.
Proof: Suppose edge (u, v) is an edge of G, and assume without loss of generality that u is discovered before v (tin[u] < tin[v]). When DFS is at vertex u, edge (u, v) is considered. If v has not yet been visited, DFS immediately traverses (u, v), making it a tree edge where u is the parent of v. If v has already been visited, v must be an ancestor of u along the current DFS recursion stack (otherwise DFS on v would have visited u before finishing). Thus, (u, v) is a back-edge to an ancestor. No cross-edges exist.

Low-Link Definition:
For any vertex u, low[u] is formally defined as:
low[u] = min { tin[u], min_{(u, w) is back-edge} tin[w], min_{(u, v) is tree edge} low[v] }.

Theorem (Tarjan's Bridge Criterion):
In an undirected graph G, a tree edge (u, v) where u is the parent of v is a bridge if and only if low[v] > tin[u].

Proof:
(=>) Suppose low[v] > tin[u].
Let T_v denote the subtree of the DFS tree rooted at v.
By definition of low[v], no vertex in T_v has a back-edge to u or to any ancestor of u.
Since all edges in G are either tree edges or back-edges, every edge incident to a vertex in T_v is either:
1. An edge connecting two vertices both inside T_v.
2. The tree edge (u, v) connecting v to its parent u.
There are no back-edges leading from T_v to any vertex outside T_v except possibly to u, but low[v] > tin[u] proves that even an edge to u does not exist.
Consequently, any path from a vertex in T_v to any vertex in V \\ T_v MUST pass through the tree edge (u, v).
If edge (u, v) is removed, no path remains between T_v and V \\ T_v. Therefore, G \\ {(u, v)} is disconnected, proving that (u, v) is a bridge.

(<=) Suppose low[v] <= tin[u].
Then by definition of low[v], there exists some descendant w in T_v (which may be v itself) that has a back-edge (w, a) to an ancestor a of v where tin[a] <= tin[u].
Because a is an ancestor of v in the DFS tree, either a = u or a is an ancestor of u.
Thus, there exists a cycle in G: from u down the tree edges to v, through T_v to w, along the back-edge from w to a, and along tree edges from a back to u.
Because edge (u, v) belongs to a cycle, removing (u, v) does not disconnect the graph; any path that previously used (u, v) can detour along the rest of the cycle. Hence, (u, v) is not a bridge.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Critical Connections in a Network with n = 4 vertices and connections:
[[0, 1], [1, 2], [2, 0], [1, 3]].
This graph forms a triangle among vertices 0, 1, 2, with a pendant node 3 attached to vertex 1.

Initialization:
timer = 0
tin = [-1, -1, -1, -1]
low = [-1, -1, -1, -1]
bridges = []

Start DFS at root u = 0, parent = -1:
timer becomes 1: tin[0] = low[0] = 1.

Explore neighbor v = 1 of 0:
1 is unvisited (tin[1] == -1). Tree edge (0, 1).
Recurse dfs(1, 0):
timer becomes 2: tin[1] = low[1] = 2.

Explore neighbor v = 0 of 1:
v == parent (0 == 0). Skip direct edge back to parent!

Explore neighbor v = 2 of 1:
2 is unvisited. Tree edge (1, 2).
Recurse dfs(2, 1):
timer becomes 3: tin[2] = low[2] = 3.

Explore neighbors of 2:
- Neighbor 1: parent, skip.
- Neighbor 0: visited! (tin[0] = 1 != -1). Back-edge (2, 0).
Update low[2] = min(low[2], tin[0]) = min(3, 1) = 1.

Node 2 has finished all neighbors. Return to dfs(1, 0):
Update low[1] = min(low[1], low[2]) = min(2, 1) = 1.
Check bridge condition for tree edge (1, 2):
Is low[2] > tin[1]? (1 > 2) is FALSE! Edge (1, 2) is NOT a bridge.

Now explore remaining neighbor v = 3 of 1:
3 is unvisited. Tree edge (1, 3).
Recurse dfs(3, 1):
timer becomes 4: tin[3] = low[3] = 4.

Explore neighbors of 3:
- Neighbor 1: parent, skip.
Node 3 has finished all neighbors. Return to dfs(1, 0):
Update low[1] = min(low[1], low[3]) = min(1, 4) = 1.
Check bridge condition for tree edge (1, 3):
Is low[3] > tin[1]? (4 > 2) is TRUE!
Edge [1, 3] is a critical connection (bridge)! Add [1, 3] to bridges.

Node 1 has finished all neighbors. Return to dfs(0, -1):
Update low[0] = min(low[0], low[1]) = min(1, 1) = 1.
Check bridge condition for tree edge (0, 1):
Is low[1] > tin[0]? (1 > 1) is FALSE! Edge (0, 1) is NOT a bridge.

DFS completes.
Resulting critical connections: [[1, 3]].`,
      },
      {
        title: "Implementation",
        body: `Here is Tarjan's bridge-finding algorithm solving Critical Connections in a Network. A single DFS tracks discovery times and updates low-link values, identifying bridges when low[v] > tin[u].`,
        code: `// Critical Connections in a Network: Tarjan's bridge-finding algorithm.
vector<vector<int>> criticalConnections(int n, vector<vector<int>>& connections) {
    vector<vector<int>> adj(n);
    for (const auto& c : connections) {
        adj[c[0]].push_back(c[1]);
        adj[c[1]].push_back(c[0]);
    }

    vector<int> tin(n, -1);
    vector<int> low(n, -1);
    vector<vector<int>> bridges;
    int timer = 0;

    auto dfs = [&](auto& self, int u, int parent) -> void {
        tin[u] = low[u] = ++timer;

        for (int v : adj[u]) {
            if (v == parent) continue; // Skip edge leading back to direct parent

            if (tin[v] != -1) {
                // Back-edge: update low with ancestor's discovery time
                low[u] = min(low[u], tin[v]);
            } else {
                // Tree edge: recurse down the DFS tree
                self(self, v, u);
                low[u] = min(low[u], low[v]);
                // If child cannot reach u or above, (u, v) is a bridge
                if (low[v] > tin[u]) {
                    bridges.push_back({u, v});
                }
            }
        }
    };

    for (int i = 0; i < n; i++) {
        if (tin[i] == -1) {
            dfs(dfs, i, -1);
        }
    }

    return bridges;
}`,
      },
      {
        title: "Variants",
        body: `Articulation Points (Cut Vertices):
A vertex u is an articulation point if removing u and its incident edges disconnects the graph.
- For a non-root vertex u: u is an articulation point if it has a DFS child v such that low[v] >= tin[u] (meaning v cannot bypass u to reach an earlier ancestor).
- For the root of the DFS tree: root is an articulation point if and only if it has 2 or more independent children in the DFS tree.

Strongly Connected Components (Tarjan's SCC on Directed Graphs):
In directed graphs, an SCC is a maximal subgraph where every vertex is reachable from every other vertex. Tarjan's algorithm uses a DFS stack to hold visited vertices. When tin[u] == low[u], vertex u is the root of an SCC; popping elements from the stack down to u retrieves all members of that SCC.

Condensation DAG:
Collapsing each SCC into a single super-vertex produces an acyclic directed graph (DAG). Dynamic programming or topological sort can then be applied to solve reachability and path counting on the condensed DAG.

2-SAT (Boolean Satisfiability):
A 2-CNF formula (a conjunction of clauses with 2 literals each) can be modeled as an implication graph. An expression (A or B) translates to directed implications (!A -> B) and (!B -> A). The 2-SAT formula is satisfiable if and only if no variable x and its negation !x belong to the same Strongly Connected Component.`,
      },
      {
        title: "Implementation: Strongly Connected Components",
        body: `Tarjan's Strongly Connected Components algorithm operates on directed graphs using an explicit traversal stack alongside tin discovery times and low-link values. When a vertex finishes all explorations with low[u] == tin[u], it acts as the canonical root of an SCC, and popping vertices from the stack until u is popped collects all members of that strongly connected component.`,
        code: `// Tarjan's Strongly Connected Components (SCC) algorithm on directed graphs.
vector<vector<int>> tarjanSCC(int n, const vector<vector<int>>& adj) {
    vector<int> tin(n, -1), low(n, -1);
    vector<bool> onStack(n, false);
    vector<int> st;
    vector<vector<int>> sccs;
    int timer = 0;

    auto dfs = [&](auto& self, int u) -> void {
        tin[u] = low[u] = ++timer;
        st.push_back(u);
        onStack[u] = true;

        for (int v : adj[u]) {
            if (tin[v] == -1) {
                self(self, v);
                low[u] = min(low[u], low[v]);
            } else if (onStack[v]) {
                low[u] = min(low[u], tin[v]);
            }
        }

        // If u is the root of an SCC, pop all vertices belonging to this SCC
        if (low[u] == tin[u]) {
            vector<int> component;
            while (true) {
                int node = st.back();
                st.pop_back();
                onStack[node] = false;
                component.push_back(node);
                if (node == u) break;
            }
            sccs.push_back(component);
        }
    };

    for (int i = 0; i < n; i++) {
        if (tin[i] == -1) dfs(dfs, i);
    }
    return sccs;
}`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
Tarjan's algorithm executes a standard depth-first search. Each vertex is visited once and its discovery and low-link values are initialized in O(1). Each undirected edge is traversed twice (once from each endpoint) in bridge and articulation point detection, while each directed edge is examined once in SCC detection. The stack operations in SCC detection push and pop each vertex exactly once. Therefore, the overall time complexity is strictly O(V + E).

Space complexity:
The adjacency list requires O(V + E) space. The auxiliary arrays tin, low, and onStack require O(V) space. The recursion stack and DFS traversal stack reach depth at most O(V). Total auxiliary space complexity is strictly O(V + E).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Updating low with low[v] instead of tin[v] for back-edges: When examining an already visited vertex v that is not the parent, the update rule MUST be low[u] = min(low[u], tin[v]); NOT min(low[u], low[v]). Using low[v] allows a path to chain multiple back-edges, which violates the low-link definition of using at most one back-edge.

Handling multiple parallel edges between the same pair of vertices: In multigraphs with multiple parallel edges between u and v, skipping the edge if (v == parent) naively by vertex ID will ignore valid parallel edges that could serve as alternative return paths. When multigraphs are possible, track the parent edge index rather than the parent vertex ID.

Root vertex edge case for articulation points: Forgetting that the root of the DFS tree is an articulation point if and only if it has >= 2 children in the DFS tree. Checking low[v] >= tin[root] will erroneously classify the root as an articulation point for any child.

Stack overflow on deep linear graphs: On graphs that degenerate into a single line of 10^5 vertices, recursive DFS will exceed standard thread stack memory limits. Use an explicit vector-based stack or increase stack size when running locally.`,
      },
      {
        title: "Practice order",
        body: `Solve Critical Connections in a Network to master Tarjan's bridge-finding algorithm, implementing discovery times and low-link calculations to detect single points of failure in network graphs.`,
      },
    ],
  },

  eulerian: {
    intro:
      "An Eulerian path is a trail in a finite graph that visits every edge exactly once. An Eulerian circuit is an Eulerian path that starts and ends at the exact same vertex. While finding a Hamiltonian path (visiting every vertex once) is NP-complete, finding an Eulerian path (visiting every edge once) is solvable in linear O(V + E) time using Hierholzer's algorithm. The existence of an Eulerian path is determined completely by local vertex degree parity and global graph connectivity. When multiple valid Eulerian paths exist, Hierholzer's algorithm can be paired with sorted adjacency lists to generate the lexicographically smallest path. You reach for Eulerian paths in route inspection and snow-plow problems, genome sequence assembly via de Bruijn graphs, and itinerary reconstruction problems such as Reconstruct Itinerary.",
    sections: [
      {
        title: "The intuition",
        body: `In 1736, Leonhard Euler solved the historic Seven Bridges of Königsberg problem, giving birth to graph theory. The citizens wondered if it was possible to take a stroll through town crossing each of the city's seven bridges across the Pregel River exactly once. Euler proved mathematically that it was impossible by analyzing vertex degrees.

Degree Balance Intuition:
Think of traveling through a graph like walking through a series of rooms connected by doorways. Whenever you enter an intermediate room through one doorway, you must leave through a different doorway. Thus, every visit to an intermediate room consumes exactly two doorways (one entrance and one exit).

For an Undirected Graph:
- Eulerian Circuit: Every vertex must have an even degree, and all vertices with non-zero degree must belong to a single connected component.
- Eulerian Path: Exactly zero or two vertices have odd degree. If two vertices have odd degree, one must be the starting vertex (an exit without a prior entrance) and the other must be the ending vertex (an entrance without a subsequent exit).

For a Directed Graph:
- Eulerian Circuit: Every vertex must have in_degree(v) == out_degree(v), and all vertices with edges must belong to a single strongly connected component.
- Eulerian Path: At most one vertex has out_degree - in_degree = 1 (the start vertex), at most one vertex has in_degree - out_degree = 1 (the end vertex), and all other vertices have in_degree == out_degree.

Hierholzer's Algorithm (Post-Order DFS / Cycle Splicing):
How do we find the actual sequence of edges? A naive greedy walk fails because you might pick a path that leads into a dead-end before visiting other detached sub-tours.
Carl Hierholzer (1873) devised an elegant post-order DFS solution:
Start at the valid starting vertex. Greedily follow unused edges. Whenever an edge is traversed, remove it from the graph so it can never be used again.
Eventually, you will become stuck at a vertex with no remaining unused outgoing edges. Because of degree balance, the ONLY vertex where you can get stuck is either the true destination vertex (for an Eulerian path) or the starting vertex (for an Eulerian circuit)!
When you are stuck at vertex u, it means u is the final destination of the remaining itinerary! We record u at the very end of our journey by pushing it onto a post-order list. Then we backtrack along our path: if an earlier vertex along the trail still has unused edges, we branch into that sub-tour until it gets stuck and splice it into our path.
Reversing the final post-order list yields the complete Eulerian path!`,
      },
      {
        title: "Why it works",
        body: `We present the formal correctness proof of Euler's degree balance theorem and Hierholzer's cycle-splicing algorithm.

Theorem (Euler 1736): A connected directed graph contains an Eulerian path if and only if:
1. At most one vertex has out_degree(v) - in_degree(v) = 1 (the start vertex s).
2. At most one vertex has in_degree(v) - out_degree(v) = 1 (the end vertex t).
3. Every other vertex has in_degree(v) == out_degree(v).
4. All edges belong to a single weakly connected component.

Proof of Hierholzer's Algorithm:
Let G satisfy the Eulerian degree conditions.
Lemma 1 (No premature dead-ends):
Suppose a trail starts at s and traverses unused edges. If the trail enters any vertex v != t, that entry consumes an incoming edge of v. Since in_degree(v) == out_degree(v) initially, the number of unused outgoing edges from v must be strictly greater than or equal to the number of unused incoming edges. Therefore, an unused outgoing edge from v must exist. The trail can only get stuck when it reaches the destination t (or s if an Eulerian circuit).

Lemma 2 (Eulerian decomposition of remaining edges):
When the initial trail T reaches t and exhausts all outgoing edges from t, remove all traversed edges of T from G to form remaining graph G'.
In G', every vertex has in_degree(v) == out_degree(v), because for every vertex v along T, an equal number of incoming and outgoing edges were removed.
Therefore, G' is a collection of edge-disjoint Eulerian cycles!

Lemma 3 (Post-order splicing):
Hierholzer's algorithm appends a vertex u to the output sequence if and only if all outgoing edges from u have been completely exhausted.
If vertex u has an attached cycle in G', the DFS will traverse and exhaust that entire sub-cycle before u itself is appended to the post-order sequence.
Because every sub-cycle is traversed and added before its root vertex completes, reversing the post-order sequence places each sub-cycle immediately after its root vertex in the forward traversal.
Since the original graph is connected, every edge is visited exactly once. Reversing the post-order sequence produces a continuous, valid Eulerian trail that traverses every edge in G.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Reconstruct Itinerary with the following flight tickets:
Tickets: [["JFK", "KUL"], ["JFK", "NRT"], ["NRT", "JFK"]]
Here all tickets depart from JFK, but we must choose the lexicographically smallest itinerary.

Graph representation (outgoing neighbors sorted lexicographically):
JFK -> ["KUL", "NRT"]
NRT -> ["JFK"]
KUL -> []

Notice the trap:
If a greedy algorithm naively chooses the smallest airport ("KUL") first, the path becomes:
JFK -> KUL.
At KUL, there are no outgoing flights! The traveler is stranded, leaving ticket ["JFK", "NRT"] and ["NRT", "JFK"] completely unused. Greedy forward traversal fails!

Hierholzer's post-order algorithm resolves this seamlessly:
Start at "JFK":
Neighbors of JFK are ["KUL", "NRT"]. Pop smallest neighbor "KUL".
Traverse edge JFK -> KUL.

At "KUL":
Neighbors of KUL are empty! KUL has no outgoing flights.
We are stuck. We push "KUL" to the post-order route:
route = ["KUL"]
Backtrack to "JFK".

At "JFK":
Neighbors of JFK still contain ["NRT"]!
Pop "NRT". Traverse edge JFK -> NRT.

At "NRT":
Neighbors of NRT are ["JFK"]. Pop "JFK".
Traverse edge NRT -> JFK.

At "JFK":
Neighbors of JFK are now completely empty!
We are stuck. Push "JFK" to the post-order route:
route = ["KUL", "JFK"]
Backtrack to "NRT".

At "NRT":
Neighbors of NRT are completely empty.
Push "NRT" to route:
route = ["KUL", "JFK", "NRT"]
Backtrack to "JFK".

At "JFK":
All neighbors of JFK are completely empty.
Push "JFK" to route:
route = ["KUL", "JFK", "NRT", "JFK"]

Final step:
Reverse the post-order route:
reverse(["KUL", "JFK", "NRT", "JFK"]) = ["JFK", "NRT", "JFK", "KUL"].

Every single ticket was traversed exactly once, the itinerary is continuous, and it is the lexicographically smallest valid journey!`,
      },
      {
        title: "Implementation",
        body: `Here is the canonical implementation of Hierholzer's algorithm solving Reconstruct Itinerary. A min-priority queue guarantees lexicographical order, and post-order DFS appends stuck vertices before reversing the final route.`,
        code: `// Reconstruct Itinerary: Eulerian path using Hierholzer's algorithm.
vector<string> findItinerary(vector<vector<string>>& tickets) {
    // Adjacency list with min-heap for lexicographical ordering
    unordered_map<string, priority_queue<string, vector<string>, greater<string>>> adj;
    for (const auto& t : tickets) {
        adj[t[0]].push(t[1]);
    }

    vector<string> route;

    // Post-order DFS traversal
    auto dfs = [&](auto& self, string u) -> void {
        auto& pq = adj[u];
        while (!pq.empty()) {
            string v = pq.top();
            pq.pop(); // Consume edge immediately
            self(self, v);
        }
        // When stuck with no outgoing edges, append to post-order route
        route.push_back(u);
    };

    dfs(dfs, "JFK");

    // Reverse post-order to get the forward Eulerian path
    reverse(route.begin(), route.end());
    return route;
}`,
      },
      {
        title: "Variants",
        body: `Iterative Hierholzer with Explicit Stack:
When the number of edges is large (e.g. 10^5 tickets or edges), recursive DFS can cause call stack overflow. An iterative implementation uses an explicit std::vector as a traversal stack. While the stack is not empty, if top vertex u has unused edges, pick the next edge and push the destination to the stack. If u has no unused edges, pop u and append to the output route.

Undirected Eulerian Circuit:
In an undirected graph, each edge (u, v) can be traversed in either direction. When edge (u, v) is traversed, both the directed half u -> v and the opposite half v -> u must be marked as consumed, typically using an edge index visited array or multiset.

De Bruijn Graphs (Genome Sequencing):
In bioinformatics, DNA fragments of length k (k-mers) are assembled into whole genomes. Instead of constructing a Hamiltonian path over fragments (which is NP-complete), fragments are modeled as directed edges between prefixes and suffixes of length k - 1. Finding an Eulerian path on this de Bruijn graph reconstructs the complete DNA sequence in linear time.

Chinese Postman Problem:
When a graph does not satisfy Eulerian degree balance, find the minimum total weight closed walk that visits every edge at least once. This is solved by pairing odd-degree vertices using minimum weight perfect matching (Blossom algorithm) and duplicating the matched shortest paths to make the graph Eulerian.`,
      },
      {
        title: "Implementation: Iterative Hierholzer for Undirected Graph",
        body: `The iterative variant of Hierholzer's algorithm manages an explicit std::vector as a traversal stack, eliminating call stack recursion limits on deep Eulerian trails. Undirected edges are tracked with a boolean visited array indexed by edge ID, allowing bidirectional connections to be consumed cleanly while maintaining the overall trail sequence.`,
        code: `// Iterative Hierholzer's algorithm for undirected Eulerian path / circuit.
vector<int> undirectedEulerianCircuit(int n, const vector<pair<int, int>>& edges, int startNode) {
    int m = edges.size();
    vector<vector<pair<int, int>>> adj(n); // v -> {neighbor, edge_index}
    for (int i = 0; i < m; i++) {
        adj[edges[i].first].push_back({edges[i].second, i});
        adj[edges[i].second].push_back({edges[i].first, i});
    }

    vector<bool> used_edge(m, false);
    vector<int> st = {startNode};
    vector<int> path;

    while (!st.empty()) {
        int u = st.back();
        while (!adj[u].empty() && used_edge[adj[u].back().second]) {
            adj[u].pop_back(); // Remove already traversed parallel/reverse edges
        }

        if (!adj[u].empty()) {
            auto [v, edge_idx] = adj[u].back();
            adj[u].pop_back();
            used_edge[edge_idx] = true;
            st.push_back(v);
        } else {
            path.push_back(u);
            st.pop_back();
        }
    }

    reverse(path.begin(), path.end());
    return path;
}`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
Building the adjacency list takes O(E log(deg)) when sorting or using priority queues to order neighbors lexicographically. In the worst case where a single vertex connects to E edges, this is O(E log E).
Hierholzer's algorithm traverses and removes each edge exactly once. Every vertex is pushed to the traversal stack and popped to the output path once. Reversing the output list of length E + 1 takes O(E) time.
Therefore, the overall time complexity is strictly O(E log E) when lexicographical ordering is required, and O(V + E) on general graphs when arbitrary edge order is acceptable.

Space complexity:
The adjacency list stores all E directed or undirected edges, requiring O(V + E) space. The traversal stack and the final output route array contain at most E + 1 vertices, requiring O(V + E) space. Total auxiliary space complexity is strictly O(V + E).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Greedy forward trapping: Greedily following edges in forward order without post-order backtracking gets trapped at dead-end sinks before exploring remaining detached cycles. Hierholzer's post-order push upon getting stuck is essential.

Duplicate identical tickets (multigraphs): Real-world inputs frequently contain duplicate tickets between the same airports (e.g. two ['JFK', 'SFO'] tickets). Using a std::set for adjacency will erase duplicate tickets! You must use a std::priority_queue, std::multiset, or vector with frequency counts to preserve all duplicate edges.

Disconnected edges: A graph may satisfy degree balance conditions on isolated subgraphs, but if some edges are not reachable from the starting vertex, no single Eulerian path can visit all edges. Always verify that path.size() == total_edges + 1.

Call stack overflow on deep paths: In problems with up to 10^5 edges, a linear graph causes recursive DFS to exceed the call stack limit. Use the iterative stack implementation when deep linear chains are possible.`,
      },
      {
        title: "Practice order",
        body: `Solve Reconstruct Itinerary to master Hierholzer's algorithm, learning how to combine priority queue edge sorting with post-order DFS backtracking to construct lexicographically smallest Eulerian paths.`,
      },
    ],
  },
};
