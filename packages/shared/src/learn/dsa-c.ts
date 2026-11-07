import type { PatternGuide } from "./types";

// DSA pattern guides: graphs, recursion/backtracking, bit manipulation. Templates are C++.

export const DSA_GUIDES_C: Record<string, PatternGuide> = {
  "graph-bfs": {
    idea: "BFS explores in rings of equal distance, so the first time it reaches a node is along a shortest path (unweighted). Start from several sources at once (multi-source) to get the distance to the nearest source for every cell.",
    signals: ["Shortest path / minimum steps with equal edge costs", "Distance to the nearest X for every cell", "Spreading processes: rotting oranges, fire, infection", "Word ladder style transformations"],
    steps: [
      "Push all sources with distance 0 and mark them visited when pushed (not when popped).",
      "Pop, try each neighbour; if unvisited, set dist = dist + 1, mark, push.",
      "Process level by level if you need the number of rounds (minutes).",
    ],
    template: `int orangesRotting(vector<vector<int>>& g) {
    int m = g.size(), n = g[0].size(), fresh = 0, minutes = 0;
    queue<pair<int, int>> q;
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++) {
            if (g[i][j] == 2) q.push({i, j});
            else if (g[i][j] == 1) fresh++;
        }
    int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    while (!q.empty() && fresh > 0) {
        for (int sz = q.size(); sz--; ) {
            auto [r, c] = q.front(); q.pop();
            for (auto& d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nc < 0 || nr >= m || nc >= n || g[nr][nc] != 1) continue;
                g[nr][nc] = 2; fresh--; q.push({nr, nc});
            }
        }
        minutes++;
    }
    return fresh ? -1 : minutes;
}`,
    complexity: "O(V + E) time (O(m·n) for grids), O(V) space.",
    variations: ["Rotting Oranges (994): multi-source, count levels.", "Word Ladder (127): neighbours by changing one letter; bidirectional BFS halves the search.", "01 Matrix (542): multi-source from all zeros.", "Shortest Bridge (934): DFS to mark one island, BFS outward from all its cells."],
    pitfalls: ["Marking visited when popping: the same node is pushed many times.", "Using BFS when edges have different weights (use Dijkstra or 0-1 BFS)."],
    recap: ["Mark visited when pushing.", "Multi-source: push all sources at distance 0.", "Levels = q.size() snapshot."],
  },

  "graph-dfs": {
    idea: "DFS goes as deep as possible and backtracks; on grids it's flood fill, labelling a whole connected region. Use it to count components, copy graphs, or find cells reachable from a border.",
    signals: ["Count islands/components, size of regions", "Clone a graph", "Cells reachable from an edge or from both oceans (reverse the flow)", "Any reachability question where order doesn't matter"],
    steps: [
      "For each unvisited start, DFS and mark everything reachable; count starts for components.",
      "Clone graph: map original → copy; create the copy before recursing into neighbours.",
      "Reverse thinking: instead of 'can this cell reach the ocean?', DFS from the ocean uphill.",
    ],
    template: `int numIslands(vector<vector<char>>& g) {
    int m = g.size(), n = g[0].size(), count = 0;
    function<void(int, int)> sink = [&](int r, int c) {
        if (r < 0 || c < 0 || r >= m || c >= n || g[r][c] != '1') return;
        g[r][c] = '0';
        sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);
    };
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            if (g[i][j] == '1') { count++; sink(i, j); }
    return count;
}

Node* cloneGraph(Node* node, unordered_map<Node*, Node*>& copies) {
    if (!node) return nullptr;
    if (copies.count(node)) return copies[node];
    Node* copy = copies[node] = new Node(node->val);
    for (Node* nb : node->neighbors) copy->neighbors.push_back(cloneGraph(nb, copies));
    return copy;
}`,
    complexity: "O(V + E) time; recursion depth up to V (use an explicit stack for very large grids).",
    variations: ["Number of Islands (200).", "Clone Graph (133).", "Pacific Atlantic Water Flow (417): DFS from each ocean's border uphill, intersect."],
    pitfalls: ["Stack overflow on 10⁶-cell grids with recursion; use BFS or an explicit stack.", "Modifying the input grid when the caller needs it intact (use a visited array)."],
    recap: ["One DFS per component.", "Clone: register the copy before recursing.", "Reverse the direction when many sources share one target."],
  },

  "topo-sort": {
    idea: "Order the nodes of a DAG so every edge points forward. Kahn's algorithm repeatedly removes nodes with in-degree 0; if some nodes are never removed, there's a cycle. DFS post-order reversed gives the same order.",
    signals: ["Prerequisites / dependencies / build order", "Detect a cycle in a directed graph", "Derive an order from pairwise constraints (alien dictionary)", "Longest path or earliest finish time in a DAG"],
    steps: [
      "Build adjacency and in-degrees.",
      "Queue all in-degree-0 nodes; pop, append to order, decrement neighbours, push those that hit 0.",
      "If order.size() < n there's a cycle.",
      "For DP on a DAG (earliest time), relax in topological order.",
    ],
    template: `vector<int> findOrder(int n, vector<vector<int>>& prereq) {
    vector<vector<int>> g(n);
    vector<int> indeg(n, 0), order;
    for (auto& p : prereq) { g[p[1]].push_back(p[0]); indeg[p[0]]++; }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : g[u]) if (--indeg[v] == 0) q.push(v);
    }
    return (int)order.size() == n ? order : vector<int>{};    // empty = cycle
}

// DFS version with colors: 0 = new, 1 = on stack, 2 = done
bool dfs(int u, vector<vector<int>>& g, vector<int>& color, vector<int>& post) {
    color[u] = 1;
    for (int v : g[u]) {
        if (color[v] == 1) return false;                        // back edge = cycle
        if (color[v] == 0 && !dfs(v, g, color, post)) return false;
    }
    color[u] = 2; post.push_back(u);                            // reverse post at the end
    return true;
}`,
    complexity: "O(V + E) time and space.",
    variations: ["Course Schedule I/II (207, 210).", "Alien Dictionary (269): first differing char of adjacent words gives an edge; prefix-longer-first is invalid.", "Parallel Courses III (2050): DP longest path in topological order."],
    pitfalls: ["Edge direction reversed (a needs b means b → a).", "Alien dictionary: 'abc' before 'ab' is invalid input.", "Using an undirected-graph cycle check on a directed graph."],
    recap: ["Kahn: in-degree 0 queue; fewer than n popped = cycle.", "DFS: gray node reached again = cycle; reverse post-order.", "DP over a DAG in topo order."],
  },

  "union-find": {
    idea: "Maintain disjoint sets with near-O(1) union and find, using path compression and union by size. Ideal when edges arrive over time and you only ask 'are these connected?' or 'how many components?'.",
    signals: ["Connectivity under incremental edges", "Count components, detect a redundant edge (cycle in undirected graph)", "Group equivalent items (accounts with shared emails)", "Kruskal's MST", "Number of islands with cells added over time"],
    steps: [
      "parent[i] = i, size[i] = 1.",
      "find with path compression; unite by attaching the smaller root under the larger.",
      "unite returns false if already connected (that's the redundant edge).",
      "Map arbitrary keys (emails, coordinates) to integer ids first.",
    ],
    template: `struct DSU {
    vector<int> parent, sz;
    int components;
    DSU(int n) : parent(n), sz(n, 1), components(n) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        parent[b] = a; sz[a] += sz[b]; components--;
        return true;
    }
};

vector<int> findRedundantConnection(vector<vector<int>>& edges) {
    DSU d(edges.size() + 1);
    for (auto& e : edges) if (!d.unite(e[0], e[1])) return e;
    return {};
}`,
    complexity: "O(α(n)) amortized per operation (effectively constant); O(n) space.",
    variations: ["Number of Provinces (547).", "Accounts Merge (721): union emails within each account, group by root.", "Redundant Connection (684).", "Number of Islands II (305): add a cell, union with land neighbours, track components."],
    pitfalls: ["Forgetting to call find before comparing roots.", "Union-find can't delete edges; process offline in reverse if you need deletions."],
    recap: ["Path compression + union by size.", "unite false ⇒ already connected (cycle).", "Map keys to ids first."],
  },

  dijkstra: {
    idea: "Shortest paths from a source with non-negative weights: always expand the closest unfinished node (min-heap). Once popped with its current distance, that distance is final.",
    signals: ["Weighted shortest path, all weights ≥ 0", "Minimum effort / time / cost to reach a target", "Grid where moving has varying costs", "Path minimizing the maximum edge (modified relaxation)"],
    steps: [
      "dist[src] = 0, push (0, src).",
      "Pop (d, u); skip if d > dist[u] (stale entry).",
      "Relax each edge: if d + w < dist[v], update and push.",
      "For 'minimize max edge on the path', relax with max(d, w) instead of d + w.",
    ],
    template: `vector<long long> dijkstra(int n, vector<vector<pair<int, int>>>& g, int src) {
    vector<long long> dist(n, LLONG_MAX);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;
    dist[src] = 0; pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;                     // stale
        for (auto [v, w] : g[u])
            if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
    }
    return dist;
}`,
    complexity: "O((V + E) log V) with a binary heap; O(V + E) space.",
    variations: ["Network Delay Time (743): max of all distances.", "Cheapest Flights Within K Stops (787): state (node, stops) or Bellman-Ford with k+1 rounds.", "Path With Minimum Effort (1631): relax with max(effort, |Δh|).", "Swim in Rising Water (778): minimize the max elevation along the path."],
    pitfalls: ["Negative edges make Dijkstra wrong (use Bellman-Ford).", "Not skipping stale heap entries (slower, sometimes wrong in variants).", "int overflow on distances."],
    recap: ["Min-heap, skip stale entries.", "Non-negative weights only.", "Swap + for max to minimize the bottleneck."],
  },

  "bellman-ford": {
    idea: "Relax every edge V−1 times; after round k, all shortest paths using ≤ k edges are correct. Handles negative weights and detects negative cycles. 0-1 BFS uses a deque for weights 0/1 in O(V + E).",
    signals: ["Negative edge weights", "Shortest path with at most k edges/stops", "Edge weights only 0 or 1 (0-1 BFS)", "Detect a negative cycle"],
    steps: [
      "Bellman-Ford: repeat V−1 times: for each edge (u, v, w), relax dist[v] with dist[u] + w.",
      "At most k edges: run k rounds, relaxing from a copy of the previous round's distances.",
      "0-1 BFS: pop front; weight-0 neighbours go to the front, weight-1 to the back.",
    ],
    template: `// Cheapest flights within k stops: k+1 rounds, relax from the previous round.
int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
    vector<int> dist(n, INT_MAX);
    dist[src] = 0;
    for (int round = 0; round <= k; round++) {
        vector<int> next = dist;
        for (auto& f : flights)
            if (dist[f[0]] != INT_MAX && dist[f[0]] + f[2] < next[f[1]]) next[f[1]] = dist[f[0]] + f[2];
        dist = next;
    }
    return dist[dst] == INT_MAX ? -1 : dist[dst];
}

// 0-1 BFS on a grid: cost 1 to remove an obstacle, 0 to move onto an empty cell.
int minimumObstacles(vector<vector<int>>& g) {
    int m = g.size(), n = g[0].size();
    vector<vector<int>> dist(m, vector<int>(n, INT_MAX));
    deque<pair<int, int>> dq;
    dist[0][0] = 0; dq.push_back({0, 0});
    int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    while (!dq.empty()) {
        auto [r, c] = dq.front(); dq.pop_front();
        for (auto& d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nc < 0 || nr >= m || nc >= n) continue;
            int nd = dist[r][c] + g[nr][nc];
            if (nd < dist[nr][nc]) {
                dist[nr][nc] = nd;
                g[nr][nc] ? dq.push_back({nr, nc}) : dq.push_front({nr, nc});
            }
        }
    }
    return dist[m - 1][n - 1];
}`,
    complexity: "Bellman-Ford O(V·E); k-round version O(k·E). 0-1 BFS O(V + E).",
    variations: ["Cheapest Flights (787): the copy per round enforces the stop limit.", "Minimum Obstacle Removal (2290): 0-1 BFS.", "Negative cycle: if a V-th round still relaxes something, a cycle exists."],
    pitfalls: ["Relaxing in place in the k-stops version (lets one round use several edges).", "Adding to INT_MAX (overflow); check reachability first."],
    recap: ["V−1 rounds of relaxing all edges.", "k-edge limit: relax from last round's copy.", "0/1 weights: deque, 0 to front, 1 to back."],
  },

  "floyd-warshall": {
    idea: "All-pairs shortest paths with a triple loop: for each intermediate node k, try improving every pair (i, j) through k. Simple and fine for n ≤ ~400.",
    signals: ["All-pairs distances with small n", "Count reachable nodes within a distance threshold for every node", "Transitive closure (reachability matrix)"],
    steps: [
      "dist[i][i] = 0, dist[i][j] = edge weight or INF.",
      "for k, for i, for j: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) (k must be the outer loop).",
      "Negative cycle if any dist[i][i] < 0 afterwards.",
    ],
    template: `int findTheCity(int n, vector<vector<int>>& edges, int threshold) {
    const int INF = 1e9;
    vector<vector<int>> d(n, vector<int>(n, INF));
    for (int i = 0; i < n; i++) d[i][i] = 0;
    for (auto& e : edges) d[e[0]][e[1]] = d[e[1]][e[0]] = min(d[e[0]][e[1]], e[2]);
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
    int best = -1, fewest = INT_MAX;
    for (int i = 0; i < n; i++) {
        int reach = 0;
        for (int j = 0; j < n; j++) if (i != j && d[i][j] <= threshold) reach++;
        if (reach <= fewest) { fewest = reach; best = i; }          // ties: larger index
    }
    return best;
}`,
    complexity: "O(n³) time, O(n²) space.",
    variations: ["Find the City With the Smallest Number of Neighbors (1334).", "Transitive closure with booleans (reach[i][j] |= reach[i][k] && reach[k][j]).", "Alternative for sparse graphs: Dijkstra from every node, O(V·E log V)."],
    pitfalls: ["k not outermost.", "INF + INF overflow: use 1e9 for ints or long long."],
    recap: ["k outermost.", "O(n³): only for n up to a few hundred.", "dist[i][i] < 0 ⇒ negative cycle."],
  },

  mst: {
    idea: "A minimum spanning tree connects all nodes with minimum total weight. Kruskal sorts edges and adds each one that joins two components (DSU). Prim grows one tree from a start node with a min-heap of crossing edges.",
    signals: ["Connect all points/houses/cities at minimum cost", "Minimum cost to make a network connected", "'Optimize water distribution': add a virtual node for wells"],
    steps: [
      "Kruskal: sort edges by weight; for each, if unite(u, v) succeeds, add its weight; stop at n−1 edges.",
      "Prim (dense graphs): dist[v] = cheapest edge to the tree; pick the min unvisited each round (O(n²) without a heap is fine for complete graphs).",
      "Turn 'per-node cost' into edges from a virtual node 0.",
    ],
    template: `// Min Cost to Connect All Points: complete graph, O(n²) Prim
int minCostConnectPoints(vector<vector<int>>& p) {
    int n = p.size(), total = 0;
    vector<int> dist(n, INT_MAX);
    vector<bool> in(n, false);
    dist[0] = 0;
    for (int it = 0; it < n; it++) {
        int u = -1;
        for (int v = 0; v < n; v++) if (!in[v] && (u == -1 || dist[v] < dist[u])) u = v;
        in[u] = true; total += dist[u];
        for (int v = 0; v < n; v++) {
            int w = abs(p[u][0] - p[v][0]) + abs(p[u][1] - p[v][1]);
            if (!in[v] && w < dist[v]) dist[v] = w;
        }
    }
    return total;
}

// Kruskal with the DSU from union-find
long long kruskal(int n, vector<array<int, 3>> edges) {          // {w, u, v}
    sort(edges.begin(), edges.end());
    DSU d(n);
    long long total = 0;
    for (auto [w, u, v] : edges) if (d.unite(u, v)) total += w;
    return d.components == 1 ? total : -1;
}`,
    complexity: "Kruskal O(E log E). Prim O(E log V) with a heap, O(V²) with arrays (best for dense graphs).",
    variations: ["Min Cost to Connect All Points (1584).", "Optimize Water Distribution (1168): virtual node 0 with edge cost = well cost.", "Second-best MST, MST with a forced edge: try including/excluding edges."],
    pitfalls: ["Building all O(n²) edges and sorting when Prim's O(n²) is simpler.", "Not checking the graph is connected."],
    recap: ["Kruskal = sorted edges + DSU.", "Prim O(n²) for dense/complete graphs.", "Per-node costs → virtual node."],
  },

  bipartite: {
    idea: "A graph is bipartite if you can 2-color it so every edge joins different colors; equivalently it has no odd cycle. BFS/DFS colors each component and fails on an edge between same colors.",
    signals: ["Split people into two groups where some pairs dislike each other", "Is the graph 2-colorable / has an odd cycle?", "Matching problems start from a bipartite check"],
    steps: [
      "color[v] = −1 for all; for each uncolored node, color 0 and BFS.",
      "For each edge (u, v): if uncolored, color[v] = 1 − color[u]; if same color, not bipartite.",
      "Run per component (graph may be disconnected).",
    ],
    template: `bool isBipartite(vector<vector<int>>& g) {
    int n = g.size();
    vector<int> color(n, -1);
    for (int s = 0; s < n; s++) {
        if (color[s] != -1) continue;
        queue<int> q; q.push(s); color[s] = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int v : g[u]) {
                if (color[v] == -1) { color[v] = color[u] ^ 1; q.push(v); }
                else if (color[v] == color[u]) return false;
            }
        }
    }
    return true;
}`,
    complexity: "O(V + E) time, O(V) space.",
    variations: ["Is Graph Bipartite? (785).", "Possible Bipartition (886): build the graph from dislike pairs.", "DSU alternative: union each node's neighbours together; conflict if a node joins its neighbour's set."],
    pitfalls: ["Only checking from node 0 (disconnected graphs).", "1-indexed input with a 0-indexed array."],
    recap: ["2-color by BFS; same color on an edge ⇒ not bipartite.", "Every component.", "Bipartite ⇔ no odd cycle."],
  },

  tarjan: {
    idea: "One DFS assigns each node a discovery time tin and a low-link low = the earliest tin reachable using tree edges plus one back edge. An edge (u, v) is a bridge if low[v] > tin[u]; u is an articulation point if low[v] ≥ tin[u] for some child (root: 2+ children). Same idea finds strongly connected components.",
    signals: ["Critical connections / bridges in a network", "Articulation points (single points of failure)", "Strongly connected components in a directed graph"],
    steps: [
      "DFS with timer: tin[u] = low[u] = timer++.",
      "Tree edge to v: recurse, then low[u] = min(low[u], low[v]); check bridge/articulation.",
      "Back edge to visited v (not the parent edge): low[u] = min(low[u], tin[v]).",
      "SCC (Tarjan): keep a stack; when low[u] == tin[u], pop the stack down to u as one component.",
    ],
    template: `vector<vector<int>> criticalConnections(int n, vector<vector<int>>& connections) {
    vector<vector<int>> g(n), bridges;
    for (auto& e : connections) { g[e[0]].push_back(e[1]); g[e[1]].push_back(e[0]); }
    vector<int> tin(n, -1), low(n, 0);
    int timer = 0;
    function<void(int, int)> dfs = [&](int u, int parent) {
        tin[u] = low[u] = timer++;
        for (int v : g[u]) {
            if (v == parent) continue;                 // skip the edge we came from
            if (tin[v] != -1) low[u] = min(low[u], tin[v]);
            else {
                dfs(v, u);
                low[u] = min(low[u], low[v]);
                if (low[v] > tin[u]) bridges.push_back({u, v});
            }
        }
    };
    for (int i = 0; i < n; i++) if (tin[i] == -1) dfs(i, -1);
    return bridges;
}`,
    complexity: "O(V + E) time and space.",
    variations: ["Critical Connections in a Network (1192).", "Articulation points: low[v] ≥ tin[u] (non-root) or root with ≥ 2 DFS children.", "SCCs: Tarjan's stack or Kosaraju (two DFS passes, one on the reversed graph)."],
    pitfalls: ["Parallel edges: skip the parent edge by edge id, not by parent node.", "Recursion depth on 10⁵ nodes."],
    recap: ["low = earliest tin reachable via one back edge.", "Bridge: low[v] > tin[u]. Articulation: low[v] ≥ tin[u].", "SCC: low == tin ⇒ pop a component."],
  },

  eulerian: {
    idea: "An Eulerian path uses every edge exactly once. It exists in a directed graph when at most one node has out − in = 1 (the start) and at most one has in − out = 1, all others balanced, and the edges are connected. Hierholzer's algorithm builds it by DFS, appending nodes on the way back, then reversing.",
    signals: ["Use every ticket/edge exactly once", "Reconstruct an itinerary", "De Bruijn sequences / crack the safe", "Domino or word chains using every piece"],
    steps: [
      "Check degree conditions and pick the start (out − in = 1, or any node with edges).",
      "DFS: while u has unused edges, take one (lexicographically smallest if required) and recurse.",
      "Append u after its edges are exhausted; reverse the list at the end.",
    ],
    template: `vector<string> findItinerary(vector<vector<string>>& tickets) {
    unordered_map<string, priority_queue<string, vector<string>, greater<string>>> g;
    for (auto& t : tickets) g[t[0]].push(t[1]);
    vector<string> route;
    function<void(const string&)> visit = [&](const string& u) {
        auto& out = g[u];
        while (!out.empty()) {
            string v = out.top(); out.pop();
            visit(v);
        }
        route.push_back(u);                        // post-order
    };
    visit("JFK");
    reverse(route.begin(), route.end());
    return route;
}`,
    complexity: "O(E log E) with sorted adjacency, O(E) otherwise.",
    variations: ["Reconstruct Itinerary (332): smallest lexical order via min-heaps.", "Valid Arrangement of Pairs: find the start by degree, then Hierholzer.", "Undirected graphs: 0 or 2 odd-degree nodes."],
    pitfalls: ["Greedy 'take the smallest next airport' without backtracking fails; Hierholzer's post-order fixes dead ends.", "Not reversing at the end."],
    recap: ["Degree check: at most one start (+1) and one end (−1).", "DFS, append on the way back, reverse.", "Dead ends are handled automatically by post-order."],
  },

  "state-space-bfs": {
    idea: "When the 'nodes' are states (a lock combination, a board, (position, keys collected)), BFS over states finds the minimum number of moves. Encode each state compactly (string, integer, bitmask) for the visited set.",
    signals: ["Minimum moves to turn a configuration into a target", "Puzzles: sliding tiles, locks, water jugs", "Shortest path visiting all nodes (state = (node, visited mask))", "Grid with keys/doors (state = cell + keys)"],
    steps: [
      "Define the state and how to encode it.",
      "Generate neighbours by applying every legal move.",
      "BFS from the start state (or multi-source from all starts), skip visited/dead states.",
      "Bidirectional BFS if the branching factor is large.",
    ],
    template: `int openLock(vector<string>& deadends, string target) {
    unordered_set<string> seen(deadends.begin(), deadends.end());
    if (seen.count("0000")) return -1;
    queue<string> q; q.push("0000"); seen.insert("0000");
    for (int steps = 0; !q.empty(); steps++) {
        for (int sz = q.size(); sz--; ) {
            string s = q.front(); q.pop();
            if (s == target) return steps;
            for (int i = 0; i < 4; i++)
                for (int d : {1, 9}) {
                    string t = s;
                    t[i] = '0' + (t[i] - '0' + d) % 10;
                    if (seen.insert(t).second) q.push(t);
                }
        }
    }
    return -1;
}

// Shortest path visiting every node: state (node, mask), multi-source
int shortestPathLength(vector<vector<int>>& g) {
    int n = g.size(), full = (1 << n) - 1;
    vector<vector<bool>> seen(n, vector<bool>(1 << n, false));
    queue<pair<int, int>> q;
    for (int i = 0; i < n; i++) { q.push({i, 1 << i}); seen[i][1 << i] = true; }
    for (int steps = 0; ; steps++)
        for (int sz = q.size(); sz--; ) {
            auto [u, mask] = q.front(); q.pop();
            if (mask == full) return steps;
            for (int v : g[u]) {
                int nm = mask | 1 << v;
                if (!seen[v][nm]) { seen[v][nm] = true; q.push({v, nm}); }
            }
        }
}`,
    complexity: "O(states × moves). Lock: 10⁴ states × 8 moves. Visit-all: O(n² · 2ⁿ).",
    variations: ["Open the Lock (752).", "Sliding Puzzle (773): board as a string, swap '0' with neighbours.", "Shortest Path Visiting All Nodes (847)."],
    pitfalls: ["State explosion: estimate states before coding.", "Checking dead ends only on pop (also block the start state)."],
    recap: ["Node = state; encode compactly.", "BFS gives minimum moves.", "Add a bitmask to the state for 'visit all' / keys."],
  },

  subsets: {
    idea: "Backtracking builds candidates one choice at a time: choose, recurse, un-choose. Subsets choose 'include or skip', combinations choose the next index ≥ start, permutations choose any unused element. Sorting plus 'skip equal siblings' removes duplicates.",
    signals: ["Generate all subsets, combinations, permutations", "Combination sum with or without reuse", "Input has duplicates but the output must not"],
    steps: [
      "Subsets/combinations: dfs(start): record path; for i from start: skip if i > start && a[i] == a[i−1]; push, dfs(i+1), pop.",
      "Reuse allowed: recurse with i instead of i+1.",
      "Permutations with duplicates: sort, used[], skip a[i] if a[i] == a[i−1] and !used[i−1].",
      "Prune early when the remaining target is negative (sorted input lets you break).",
    ],
    template: `vector<vector<int>> res; vector<int> path;

void subsetsDup(vector<int>& a, int start) {          // sort a first
    res.push_back(path);
    for (int i = start; i < (int)a.size(); i++) {
        if (i > start && a[i] == a[i - 1]) continue;   // skip equal siblings
        path.push_back(a[i]); subsetsDup(a, i + 1); path.pop_back();
    }
}

void combSum2(vector<int>& a, int start, int left) { // each number once, sorted
    if (left == 0) { res.push_back(path); return; }
    for (int i = start; i < (int)a.size() && a[i] <= left; i++) {
        if (i > start && a[i] == a[i - 1]) continue;
        path.push_back(a[i]); combSum2(a, i + 1, left - a[i]); path.pop_back();
    }
}

void permsDup(vector<int>& a, vector<bool>& used) {   // sort a first
    if (path.size() == a.size()) { res.push_back(path); return; }
    for (int i = 0; i < (int)a.size(); i++) {
        if (used[i] || (i > 0 && a[i] == a[i - 1] && !used[i - 1])) continue;
        used[i] = true; path.push_back(a[i]);
        permsDup(a, used);
        path.pop_back(); used[i] = false;
    }
}`,
    complexity: "Subsets O(n · 2ⁿ), permutations O(n · n!), output-bound.",
    variations: ["Subsets II (90).", "Permutations II (47).", "Combination Sum II (40).", "Bitmask enumeration: for mask in 0..2ⁿ−1 (no duplicates handling)."],
    pitfalls: ["Skipping duplicates with i > 0 instead of i > start (drops valid answers).", "Pushing path by reference instead of copying."],
    recap: ["Choose, recurse, un-choose.", "Sort + skip a[i] == a[i−1] when i > start.", "Reuse: recurse with i; no reuse: i + 1."],
  },

  "constraint-backtracking": {
    idea: "Place one decision at a time (a queen per row, a digit per cell, a letter per step) and check constraints immediately, so invalid branches die early. Fast constraint checks (bitmasks, boolean arrays) are what make it pass.",
    signals: ["N-Queens, Sudoku, word search in a grid", "Partition a string into valid pieces (palindromes, IPs)", "Find any or all assignments satisfying rules"],
    steps: [
      "Pick the order of decisions (row by row, cell by cell, the most constrained cell first).",
      "Keep O(1) constraint checks: used columns/diagonals, row/col/box masks.",
      "Mark, recurse, unmark. Return early once one solution is enough.",
    ],
    template: `// N-Queens count with bitmasks
int totalNQueens(int n) {
    int count = 0, full = (1 << n) - 1;
    function<void(int, int, int)> place = [&](int cols, int d1, int d2) {
        if (cols == full) { count++; return; }
        for (int free = full & ~(cols | d1 | d2); free; free &= free - 1) {
            int bit = free & -free;                       // lowest free column
            place(cols | bit, (d1 | bit) << 1, (d2 | bit) >> 1);
        }
    };
    place(0, 0, 0);
    return count;
}

// Word Search: mark the cell in place while it's on the path
bool exist(vector<vector<char>>& b, const string& w) {
    int m = b.size(), n = b[0].size();
    function<bool(int, int, int)> dfs = [&](int r, int c, int k) {
        if (k == (int)w.size()) return true;
        if (r < 0 || c < 0 || r >= m || c >= n || b[r][c] != w[k]) return false;
        char saved = b[r][c]; b[r][c] = '#';
        bool ok = dfs(r + 1, c, k + 1) || dfs(r - 1, c, k + 1) || dfs(r, c + 1, k + 1) || dfs(r, c - 1, k + 1);
        b[r][c] = saved;
        return ok;
    };
    for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (dfs(i, j, 0)) return true;
    return false;
}`,
    complexity: "Exponential in the worst case; pruning and O(1) checks make the practical difference.",
    variations: ["N-Queens (51): also build boards.", "Sudoku Solver (37): row/col/box bitmasks, pick the cell with fewest options.", "Word Search (79).", "Palindrome Partitioning (131): precompute isPal[i][j]."],
    pitfalls: ["Forgetting to restore state on every return path.", "Recomputing palindrome checks inside the recursion (precompute)."],
    recap: ["Decide, check in O(1), recurse, undo.", "Bitmasks for columns/diagonals.", "Most-constrained choice first."],
  },

  "meet-in-middle": {
    idea: "When n ≈ 40, 2ⁿ is too big but 2^(n/2) ≈ 10⁶ is fine. Enumerate all subset sums of each half, sort one side, and combine with binary search or two pointers.",
    signals: ["n around 30-40 with subset choices", "Closest subset sum to a goal", "Partition into two equal-size halves minimizing a difference"],
    steps: [
      "Split the array into halves A and B.",
      "Enumerate subset sums of each half (group by subset size if the size is constrained).",
      "Sort one list; for each sum in the other, binary search the best complement.",
    ],
    template: `vector<long long> sums(const vector<int>& a) {
    int n = a.size();
    vector<long long> out(1 << n, 0);
    for (int mask = 1; mask < (1 << n); mask++) {
        int low = __builtin_ctz(mask);
        out[mask] = out[mask & (mask - 1)] + a[low];       // reuse smaller mask
    }
    return out;
}

int minAbsDifference(vector<int>& nums, int goal) {
    int h = nums.size() / 2;
    auto L = sums(vector<int>(nums.begin(), nums.begin() + h));
    auto R = sums(vector<int>(nums.begin() + h, nums.end()));
    sort(R.begin(), R.end());
    long long best = LLONG_MAX;
    for (long long x : L) {
        auto it = lower_bound(R.begin(), R.end(), goal - x);
        if (it != R.end()) best = min(best, llabs(x + *it - goal));
        if (it != R.begin()) best = min(best, llabs(x + *prev(it) - goal));
    }
    return best;
}`,
    complexity: "O(2^(n/2) · n) time, O(2^(n/2)) space.",
    variations: ["Closest Subsequence Sum (1755).", "Partition Array Into Two Arrays to Minimize Sum Difference (2035): group sums by count k, pair with n/2 − k from the other half.", "4Sum count: pair sums of two arrays vs two arrays."],
    pitfalls: ["Memory: 2²⁰ long longs per side is 8 MB, fine; 2²⁵ isn't.", "Forgetting to check both neighbours around lower_bound."],
    recap: ["Split, enumerate each half, sort one, binary search.", "n ≈ 40 is the tell.", "Group by size when the count is fixed."],
  },

  "bit-tricks": {
    idea: "Integers are bit vectors. XOR cancels pairs, x & (x−1) clears the lowest set bit, x & −x isolates it, and counting bits per position solves 'appears k times' problems in O(n) with O(1) space.",
    signals: ["Every element appears twice/three times except one or two", "Count set bits for 0..n", "Maximum XOR pair", "Power of two checks, subsets as masks"],
    steps: [
      "Single number (others twice): XOR everything.",
      "Others thrice: for each bit position, count ones mod 3.",
      "Two singles: XOR all = a ^ b; split numbers by any set bit of that XOR, XOR each group.",
      "Counting bits: dp[i] = dp[i >> 1] + (i & 1).",
    ],
    template: `int singleNumber(vector<int>& a) { int x = 0; for (int v : a) x ^= v; return x; }

int singleNumberThrice(vector<int>& a) {
    int ones = 0, twos = 0;                           // bits seen once / twice (mod 3)
    for (int v : a) {
        ones = (ones ^ v) & ~twos;
        twos = (twos ^ v) & ~ones;
    }
    return ones;
}

vector<int> singleNumberTwo(vector<int>& a) {
    unsigned x = 0;
    for (int v : a) x ^= v;
    unsigned low = x & -x;                            // a bit where the two differ
    int p = 0, q = 0;
    for (int v : a) (v & low ? p : q) ^= v;
    return {p, q};
}

vector<int> countBits(int n) {
    vector<int> dp(n + 1, 0);
    for (int i = 1; i <= n; i++) dp[i] = dp[i >> 1] + (i & 1);
    return dp;
}
// Builtins: __builtin_popcount(x), __builtin_ctz(x) (x != 0), __lg(x) = index of highest bit`,
    complexity: "O(n) time, O(1) extra space for the single-number family.",
    variations: ["Single Number I/II/III (136, 137, 260).", "Counting Bits (338).", "Maximum XOR (421): binary trie or greedy prefix set."],
    pitfalls: ["x & −x on INT_MIN overflows as signed; use unsigned.", "Operator precedence: write (x & 1) == 0 with parentheses.", "Shifting 1 << 31 on int is undefined; use 1u or 1LL."],
    recap: ["XOR cancels pairs.", "x & (x−1) drops the lowest bit; x & −x keeps it.", "Per-bit counts mod k for 'appears k times'."],
  },

  "bitmask-dp-subsets": {
    idea: "With n ≤ 20, a subset fits in an int. DP over masks (dp[mask] = best for the items in mask) handles 'assign each item once' problems in O(2ⁿ · n). Masks are processed in increasing order because a mask's subsets are numerically smaller.",
    signals: ["n ≤ 16-20 items, each used once", "Partition into k equal-sum subsets", "Assign people to hats/tasks with uniqueness", "Visit all nodes (TSP-like)"],
    steps: [
      "State: dp[mask] (and sometimes the last element).",
      "Transition: add one unused element j to mask (mask | 1 << j).",
      "Partition k subsets: dp[mask] = sum of the current partial bucket (mod target) or −1 if unreachable; add j only if it fits.",
      "Hats: iterate over hats (40) and keep a mask of people (10): dp[mask] over people.",
    ],
    template: `bool canPartitionKSubsets(vector<int>& a, int k) {
    int total = accumulate(a.begin(), a.end(), 0), n = a.size();
    if (total % k) return false;
    int target = total / k;
    vector<int> dp(1 << n, -1);                       // fill of the current bucket
    dp[0] = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        if (dp[mask] == -1) continue;
        for (int j = 0; j < n; j++) {
            int next = mask | 1 << j;
            if (next == mask || dp[next] != -1) continue;
            if (dp[mask] + a[j] <= target) dp[next] = (dp[mask] + a[j]) % target;
        }
    }
    return dp[(1 << n) - 1] == 0;
}

// Iterate over submasks of mask (for "split into groups" DPs): O(3^n) overall
// for (int sub = mask; sub; sub = (sub - 1) & mask) { ... }`,
    complexity: "O(2ⁿ · n) time, O(2ⁿ) space. Submask enumeration is O(3ⁿ).",
    variations: ["Partition to K Equal Sum Subsets (698).", "Shortest Path Visiting All Nodes (847): BFS over (node, mask).", "Number of Ways to Wear Different Hats (1434): DP over hats with a mask of people."],
    pitfalls: ["n = 25+ makes 2ⁿ too large; check constraints.", "Choosing the larger dimension as the mask (mask the smaller one)."],
    recap: ["n ≤ 20 ⇒ mask DP.", "dp[mask | 1<<j] from dp[mask].", "Submasks: sub = (sub − 1) & mask."],
  },
};
