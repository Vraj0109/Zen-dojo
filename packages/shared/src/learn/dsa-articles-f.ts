import type { PatternArticle } from "./types";

// Full pattern articles, group "Graphs, part 1" (plan 0008, batch 5): graph-bfs, graph-dfs, topo-sort, union-find,
// state-space-bfs. Format and rules: plan 0007. Code is C++17. Blocks of one article are concatenated and compiled
// together, so helper names are unique per article.

export const DSA_ARTICLES_F: Record<string, PatternArticle> = {
  "graph-bfs": {
    intro:
      "Breadth-first search explores a graph outward in concentric frontier waves of increasing edge distance from a starting vertex. Because edges are traversed in order of hop count, the first time BFS reaches any vertex in an unweighted graph, it has found a shortest path. When generalized to multi-source BFS, multiple starting vertices are placed in the initial queue simultaneously, computing the shortest distance to the nearest source across every cell in a single pass. You reach for breadth-first search when finding shortest paths in unweighted graphs or grids, measuring wave propagation such as fire or infection spreading, finding minimum transformation steps between words, or bridging disconnected components.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine dropping a pebble into a still pond. Ripples expand outward uniformly in concentric circles, reaching every point in the pond in the exact order of its distance from the splash. Breadth-first search (BFS) operates on this exact physical intuition. By using a first-in, first-out (FIFO) queue, BFS processes all vertices at distance 0, then all vertices at distance 1, then all vertices at distance 2, and so forth.

In many graph and grid problems, the objective is not simply reachability, but finding the minimum number of steps or shortest path to achieve an objective. In unweighted graphs where every edge has equal weight 1, BFS is optimal. Unlike depth-first search, which plunges deep along one arbitrary path and can wander down a lengthy dead-end before finding the destination, BFS guarantees that the moment the target vertex is popped from the queue, the path taken to reach it is minimal in edge count.

The multi-source extension arises when multiple origins act simultaneously. Consider Rotting Oranges, where multiple rotten oranges rot adjacent fresh oranges each minute, or 01 Matrix, where we want the distance from each cell to the nearest 0. A naive approach might run a separate BFS from each cell, leading to quadratic or worse time complexity. Multi-source BFS eliminates this redundancy: by enqueuing all starting sources simultaneously at step 0 and marking them visited immediately, the search frontier expands outward from all sources at once like multiple pebbles dropped into the pond. The wavefronts meet seamlessly, and each cell is visited by whichever source is nearest.

Tracking rounds or elapsed time is accomplished through level-by-level queue processing. By snapshotting the queue size at the beginning of each round (int sz = q.size()), an inner loop processes exactly the vertices belonging to the current distance frontier before any newly discovered neighbors at the next distance are touched. Incrementing a counter after each level directly measures elapsed time in discrete rounds.`,
      },
      {
        title: "Why it works",
        body: `The correctness of BFS as a shortest-path algorithm rests on the queue monotonicity invariant: at any point during BFS execution, the queue contains vertices whose shortest-path distances from the source differ by at most 1, and the distances appear in non-decreasing order.

Let dist(v) denote the true shortest-path distance (in edges) from source s to v. We prove by induction that vertices are enqueued and dequeued in non-decreasing order of dist(v), and when edge (u, v) is traversed to discover an unvisited vertex v, dist(v) = dist(u) + 1.
Base case: The queue initially holds s with dist(s) = 0.
Inductive step: Suppose the invariant holds. All vertices at distance d are dequeued before any vertex at distance d + 1. When a vertex u at distance d is dequeued, its unvisited neighbors v are assigned distance d + 1 and appended to the back of the queue. Any alternative path from s to v discovered later must pass through some other node w dequeued after u, so dist(w) >= d, meaning that alternative path has length dist(w) + 1 >= d + 1. Thus, the first discovered distance d + 1 is minimal.

A vital operational invariant is marking vertices as visited upon insertion (push) rather than upon extraction (pop). If vertex v is a common neighbor of several vertices currently in the queue at distance d, and marking is delayed until pop, each of those vertices will observe v as unvisited and push duplicate copies of v into the queue. This causes the queue size to explode exponentially, degrading runtime from O(V + E) to O(V * 2^E) and causing Memory Limit Exceeded. Marking upon push guarantees that every vertex enters the queue at most once.

Multi-source BFS correctness follows from virtual source reduction. Introducing a hypothetical super-source S connected to every true source with a directed edge of weight 0 turns the multi-source problem into single-source BFS from S. Because all true sources are at distance 0 from S, pushing all sources to the queue at step 0 is mathematically identical to running standard BFS from S after relaxing the weight-0 edges.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Rotting Oranges on a 3x3 grid:
Row 0: [2, 1, 1]
Row 1: [1, 1, 0]
Row 2: [0, 1, 1]
Here 2 represents a rotten orange, 1 is fresh, and 0 is an empty cell.
Initial scan:
Rotten orange at (0, 0) pushed to queue. Fresh orange count = 6. Elapsed minutes = 0.
Queue: [(0, 0)].

Minute 1 (queue size = 1):
Pop (0, 0).
Neighbors of (0, 0):
- (1, 0) is fresh: set grid[1][0] = 2, fresh becomes 5, push (1, 0).
- (0, 1) is fresh: set grid[0][1] = 2, fresh becomes 4, push (0, 1).
Minutes elapsed: 1.
Queue: [(1, 0), (0, 1)].

Minute 2 (queue size = 2):
Pop (1, 0):
- (1, 1) is fresh: set grid[1][1] = 2, fresh becomes 3, push (1, 1).
- (2, 0) is 0: empty cell, ignore.
Pop (0, 1):
- (0, 2) is fresh: set grid[0][2] = 2, fresh becomes 2, push (0, 2).
- (1, 1) is already rotten (marked during pop of (1, 0)), ignore!
Minutes elapsed: 2.
Queue: [(1, 1), (0, 2)].

Minute 3 (queue size = 2):
Pop (1, 1):
- (2, 1) is fresh: set grid[2][1] = 2, fresh becomes 1, push (2, 1).
Pop (0, 2): no fresh neighbors.
Minutes elapsed: 3.
Queue: [(2, 1)].

Minute 4 (queue size = 1):
Pop (2, 1):
- (2, 2) is fresh: set grid[2][2] = 2, fresh becomes 0, push (2, 2).
Minutes elapsed: 4.
Queue: [(2, 2)].

Minute 5 (queue size = 1):
Fresh count is 0, so loop terminates.
Total minutes required = 4.
All fresh oranges rotted, returning 4.`,
      },
      {
        title: "Implementation",
        body: `Multi-source BFS seeds the queue with all source vertices at distance 0, marking them visited on push. Level-by-level queue popping increments elapsed steps as the wavefront expands.`,
        code: `// Rotting Oranges: multi-source BFS counting minutes until all fresh oranges rot.
int orangesRotting(vector<vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    queue<pair<int, int>> q;
    int fresh = 0;
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (grid[r][c] == 2) q.push({r, c});
            else if (grid[r][c] == 1) fresh++;
        }
    }
    if (fresh == 0) return 0;

    int minutes = 0;
    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};

    while (!q.empty() && fresh > 0) {
        int sz = q.size();
        for (int i = 0; i < sz; i++) {
            auto [r, c] = q.front();
            q.pop();
            for (int d = 0; d < 4; d++) {
                int nr = r + dr[d], nc = c + dc[d];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] == 1) {
                    grid[nr][nc] = 2; // Mark visited immediately on push
                    fresh--;
                    q.push({nr, nc});
                }
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}

// 01 Matrix: distance of each cell to nearest 0 using multi-source BFS.
vector<vector<int>> updateMatrix(vector<vector<int>>& mat) {
    int m = mat.size(), n = mat[0].size();
    vector<vector<int>> dist(m, vector<int>(n, -1));
    queue<pair<int, int>> q;
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (mat[r][c] == 0) {
                dist[r][c] = 0;
                q.push({r, c});
            }
        }
    }
    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};
    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && dist[nr][nc] == -1) {
                dist[nr][nc] = dist[r][c] + 1;
                q.push({nr, nc});
            }
        }
    }
    return dist;
}`,
      },
      {
        title: "Implementation: Word Ladder and bidirectional BFS",
        body: `Word Ladder finds the shortest transformation sequence between words. Bidirectional breadth-first search searches simultaneously forward from the beginning word and backward from the ending word, expanding whichever frontier is currently smaller.`,
        code: `// Word Ladder using bidirectional BFS.
int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
    unordered_set<string> dict(wordList.begin(), wordList.end());
    if (!dict.count(endWord)) return 0;

    unordered_set<string> forwardSet{beginWord};
    unordered_set<string> backwardSet{endWord};
    unordered_set<string> visited;
    int step = 1;

    while (!forwardSet.empty() && !backwardSet.empty()) {
        if (forwardSet.size() > backwardSet.size()) {
            swap(forwardSet, backwardSet); // Expand smaller frontier
        }
        unordered_set<string> nextFrontier;
        for (string word : forwardSet) {
            for (int i = 0; i < (int)word.size(); i++) {
                char original = word[i];
                for (char c = 'a'; c <= 'z'; c++) {
                    word[i] = c;
                    if (backwardSet.count(word)) return step + 1;
                    if (dict.count(word) && !visited.count(word)) {
                        visited.insert(word);
                        nextFrontier.insert(word);
                    }
                }
                word[i] = original;
            }
        }
        forwardSet = move(nextFrontier);
        step++;
    }
    return 0;
}`,
      },
      {
        title: "Variants",
        body: `Bidirectional BFS: When searching for the shortest path between a specific start and destination in an unweighted graph with branching factor b and distance d, standard BFS explores O(b^d) vertices. Bidirectional BFS expands two frontiers simultaneously: one forward from start, and one backward from target. When the two frontiers intersect, the shortest path is found. The search visits at most 2 * b^(d/2) vertices, which is an exponential reduction in explored states and memory.

0-1 BFS with Deque: When graph edge weights are restricted to only 0 and 1, a priority queue (Dijkstra) is not needed. Using std::deque, edges with weight 0 are pushed to the front of the deque, while edges with weight 1 are pushed to the back. This maintains the monotonic ordering of distances in the queue, achieving O(V + E) shortest path runtime.

Two-Stage Search (Shortest Bridge): When connecting two isolated components (such as finding the minimum flips to connect two islands), Phase 1 uses DFS to flood-fill and discover all cells of the first island, inserting all its border cells into a queue. Phase 2 runs multi-source BFS outward from those cells until the frontier touches the second island.

Multi-source distance maps with obstacle removal: In grid games where obstacles can be removed or walls can be broken at a cost, state can be extended to (row, column, remaining_breaks) and explored using BFS or 0-1 BFS.`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
For standard and multi-source BFS on a graph with V vertices and E edges, each vertex is enqueued at most once and dequeued at most once. For each dequeued vertex, all its outgoing edges are scanned. The total time complexity is strictly O(V + E).
For an m x n grid with 4-directional movement, V = m * n and E <= 4 * m * n, yielding an optimal O(m * n) time complexity.
For Word Ladder, if word length is L and dictionary size is N, generating all 26 * L single-character mutations for each word takes O(26 * L^2) per word, giving O(N * 26 * L^2) total time with bidirectional BFS.

Space complexity:
The queue stores at most the maximum width of the search frontier, which in the worst case is O(V) vertices.
The visited structure (grid in-place modification or separate 2D boolean table / hash set) requires O(V) space.
Total auxiliary space is O(V), or O(m * n) for grids.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Marking visited on pop instead of push: This is the most prevalent bug in BFS implementations. When multiple vertices on level d share a neighbor on level d + 1, failure to mark that neighbor upon push causes it to be enqueued multiple times. This leads to exponential memory growth and Time Limit Exceeded. Always mark the vertex visited at the exact moment it is pushed.

Zero targets at initialization: In Rotting Oranges, if the initial grid contains 0 fresh oranges, the answer is 0 minutes, not -1. If your loop requires at least one queue step to finish and returns -1 if queue is initially empty, this test case will fail. Always check if (fresh == 0) return 0; before the main loop.

Unreachable cells: In multi-source spreading problems, fresh cells may be permanently isolated by empty spaces or walls. After the BFS queue is exhausted, always verify whether any fresh cells remain. If fresh > 0, return -1.

Word Ladder dictionary lookup cost: Naively checking every word in the dictionary to find if it differs by 1 character takes O(N * L) per word, which gives O(N^2 * L) overall. When N = 5000 and L = 5, testing all 26 * L = 130 character mutations against an unordered_set is orders of magnitude faster (130 * L operations vs 25,000 operations per word).`,
      },
      {
        title: "Practice order",
        body: `Start with Rotting Oranges to master multi-source queue initialization and level-by-level time tracking. Next, solve 01 Matrix to practice multi-source distance propagation where every cell calculates distance to the nearest target. Then solve Shortest Bridge to combine depth-first flood fill with multi-source breadth-first expansion. Finally, complete Word Ladder using bidirectional BFS to experience how meeting in the middle exponentially reduces state exploration.`,
      },
    ],
  },

  "graph-dfs": {
    intro:
      "Depth-first search traverses a graph by exploring as deeply as possible along each branch before backtracking. On graphs and grids, it serves as the universal engine for connected components, flood fill, reachability analysis, and cycle detection. Because DFS visits all vertices in a connected component in a single launch, counting the number of launches directly counts isolated islands or provinces. You reach for depth-first search when solving flood fill on grids, deep-copying graphs with cycles, identifying cycle boundaries, or reversing flow directions to solve multi-destination reachability.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine walking through an unfamiliar labyrinth with a ball of string and a stick of chalk. At every junction, you choose an unexplored corridor, unrolling your string behind you and marking visited intersections with chalk so you never loop back. If you hit a dead end, you retrace your steps along the string until you find another unexplored corridor. This is depth-first search.

On a grid, DFS becomes the familiar paint-bucket flood fill tool found in graphic design software. Starting at a clicked pixel, it colors all connected pixels sharing the same color. In problems like Number of Islands, each cell with '1' represents land. When we encounter an unvisited land cell, we increment our island count and launch a DFS flood fill from that cell. The DFS spreads to all orthogonally connected land cells, marking them as visited (or sinking them to '0'). When the DFS returns, the entire island has been explored, and our outer loop continues looking for the next unvisited island.

In graph cloning (Clone Graph), a naive copy fails because graphs can contain arbitrary cycles, self-loops, and multiple paths between vertices. Deep-copying requires replicating both the vertices and the exact topology of edges. Depth-first search provides the traversal backbone: by maintaining a hash map that registers each newly created clone node before exploring its neighbors, any cyclical edge back to an already visited vertex can immediately retrieve the cloned node from the map without triggering infinite recursion.

Another powerful intuition in graph DFS is reversing the problem perspective. In Pacific Atlantic Water Flow, we are asked which cells can flow downhill to both the Pacific and Atlantic oceans. Checking each cell independently by walking downhill causes massive redundant work. Instead, we invert the question: start DFS from the ocean shores and flow uphill! Finding the intersection of cells reachable from the Pacific and cells reachable from the Atlantic immediately yields the answer in linear time.`,
      },
      {
        title: "Why it works",
        body: `Correctness of component identification relies on the reachability equivalence relation. In an undirected graph G = (V, E), the relation 'u is reachable from v' is an equivalence relation (reflexive, symmetric, transitive). The equivalence classes of this relation are precisely the connected components of G.
When DFS is launched from vertex s, it visits vertex s and recursively traverses all edges incident to visited vertices. By structural induction, DFS terminates if and only if every vertex reachable from s has been visited. Because no edge exists between disjoint connected components, a single DFS starting from s visits every vertex in s's component and no vertex from any other component. Therefore, iterating through all vertices and initiating DFS only on unvisited vertices partitions V into its connected components and counts them accurately.

For Clone Graph, the invariant is that every vertex u in the original graph is cloned at most once. When cloneGraph(u) is invoked:
1. If u is null, return null.
2. If u already exists in the copies map, return copies[u].
3. Otherwise, allocate clone = new Node(u->val), immediately insert copies[u] = clone, and then recursively clone all neighbors of u.
Because copies[u] is populated before processing u's neighbor list, any back-edge or cycle pointing back to u immediately encounters case 2, returning the cloned pointer and terminating the cycle.

For Pacific Atlantic Water Flow, water flows from cell A to cell B if height(A) >= height(B). Define the reversed directed graph G' where an edge exists from B to A iff height(A) >= height(B) (water flows uphill). By transitivity of directed paths, a directed path exists from cell C to an ocean border in G if and only if a directed path exists from the ocean border to cell C in G'. Because DFS from a set of border vertices computes the transitive closure of reachable vertices in G', running uphill DFS from the Pacific border finds all cells that can reach the Pacific, and running uphill DFS from the Atlantic border finds all cells that can reach the Atlantic. Their intersection is the exact set of valid cells.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Number of Islands on this 4x4 grid:
Row 0: ['1', '1', '0', '0']
Row 1: ['1', '1', '0', '0']
Row 2: ['0', '0', '1', '0']
Row 3: ['0', '0', '0', '1']

We iterate over cells row by row, with island_count = 0:
At (0, 0): grid[0][0] == '1'. An unvisited island is found!
Increment island_count to 1.
Launch DFS at (0, 0):
- Sink (0, 0) to '0'.
- Recurse down to (1, 0): sink (1, 0) to '0'.
  - Recurse down to (2, 0): cell is '0', return.
  - Recurse right to (1, 1): sink (1, 1) to '0'.
    - Recurse up to (0, 1): sink (0, 1) to '0'.
      - All neighbors of (0, 1) are '0' or out of bounds. Return.
    - All neighbors of (1, 1) are '0' or out of bounds. Return.
  - All neighbors of (1, 0) explored. Return.
- All neighbors of (0, 0) explored. Return.
The entire 2x2 block in the top-left is now '0'.

Outer loop continues:
Cells (0, 1), (0, 2), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3), (2, 0), (2, 1) are all '0'.
At (2, 2): grid[2][2] == '1'.
Increment island_count to 2.
Launch DFS at (2, 2):
- Sink (2, 2) to '0'.
- All 4 neighbors are '0' or out of bounds. Return.

Outer loop continues:
Cell (2, 3) is '0', (3, 0..2) are '0'.
At (3, 3): grid[3][3] == '1'.
Increment island_count to 3.
Launch DFS at (3, 3):
- Sink (3, 3) to '0'.
- Neighbors are out of bounds or '0'. Return.

Scan finishes. Final island_count = 3.
Notice how sinking in-place acts as our visited tracker with zero extra memory.`,
      },
      {
        title: "Implementation",
        body: `The flood-fill function sinks visited cells to 0 during recursion to avoid extra memory. Graph cloning registers each allocated clone in a map before recursing on neighbors.`,
        code: `class Node {
public:
    int val;
    vector<Node*> neighbors;
    Node() : val(0), neighbors() {}
    Node(int _val) : val(_val), neighbors() {}
    Node(int _val, vector<Node*> _neighbors) : val(_val), neighbors(_neighbors) {}
};

// Number of Islands: connected components via recursive flood fill.
int numIslands(vector<vector<char>>& grid) {
    if (grid.empty()) return 0;
    int m = grid.size(), n = grid[0].size();
    int islands = 0;

    function<void(int, int)> dfs = [&](int r, int c) {
        if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] != '1') return;
        grid[r][c] = '0'; // Sink island to mark as visited
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    };

    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (grid[r][c] == '1') {
                islands++;
                dfs(r, c);
            }
        }
    }
    return islands;
}

// Clone Graph: deep copy with node mapping to handle cycles.
Node* cloneGraphDfs(Node* node, unordered_map<Node*, Node*>& copies) {
    if (!node) return nullptr;
    if (copies.count(node)) return copies[node];
    Node* clone = new Node(node->val);
    copies[node] = clone;
    for (Node* neighbor : node->neighbors) {
        clone->neighbors.push_back(cloneGraphDfs(neighbor, copies));
    }
    return clone;
}

Node* cloneGraph(Node* node) {
    unordered_map<Node*, Node*> copies;
    return cloneGraphDfs(node, copies);
}`,
      },
      {
        title: "Implementation: Pacific Atlantic Water Flow",
        body: `Pacific Atlantic Water Flow reverses the problem by performing two independent depth-first searches starting at the ocean boundaries, flowing uphill to identify all cells capable of reaching both water bodies.`,
        code: `// Pacific Atlantic Water Flow: reverse DFS uphill from borders.
vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
    if (heights.empty()) return {};
    int m = heights.size(), n = heights[0].size();
    vector<vector<bool>> pacific(m, vector<bool>(n, false));
    vector<vector<bool>> atlantic(m, vector<bool>(n, false));

    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};

    function<void(int, int, vector<vector<bool>>&)> dfs = [&](int r, int c, vector<vector<bool>>& reachable) {
        reachable[r][c] = true;
        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && !reachable[nr][nc]) {
                if (heights[nr][nc] >= heights[r][c]) { // Water flows uphill in reverse
                    dfs(nr, nc, reachable);
                }
            }
        }
    };

    for (int r = 0; r < m; r++) {
        dfs(r, 0, pacific);
        dfs(r, n - 1, atlantic);
    }
    for (int c = 0; c < n; c++) {
        dfs(0, c, pacific);
        dfs(m - 1, c, atlantic);
    }

    vector<vector<int>> result;
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (pacific[r][c] && atlantic[r][c]) {
                result.push_back({r, c});
            }
        }
    }
    return result;
}`,
      },
      {
        title: "Variants",
        body: `Bipartite Graph Verification: DFS checks if a graph can be colored with two colors such that no two adjacent vertices share the same color. Start with an uncolored vertex, assign color 0, and recursively assign alternating color 1 - c to its neighbors. If a neighbor already has the same color c, an odd cycle is detected and the graph is not bipartite.

Directed Cycle Detection (Three-Color DFS): On directed graphs, tracking simple visited booleans is insufficient because reaching an already visited node in another branch does not imply a cycle. Vertices are colored White (0, unvisited), Gray (1, on current recursion stack), or Black (2, completely explored). Traversing an edge to a Gray vertex identifies a back-edge, proving a directed cycle exists.

Eulerian Path and Circuit (Hierholzer's Algorithm): A DFS-based post-order traversal finds a path visiting every edge in a graph exactly once, reversing the post-order sequence at the end.

Tarjan's Bridges and Articulation Points: DFS discovery times and low-link values identify critical connections in networks where removing an edge or vertex disconnects the graph.`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
For general graphs with V vertices and E edges, DFS visits every vertex once and examines every edge twice (once from each endpoint in undirected graphs, or once per directed edge). The total time complexity is strictly O(V + E).
For grid problems of size m x n, each cell has at most 4 orthogonal edges. The number of vertices is m * n and the number of edges is bounded by 4 * m * n. Therefore, grid DFS runs in O(m * n) time.

Space complexity:
In recursive DFS, auxiliary space is determined by the maximum depth of the call stack. In the worst case (a long, narrow snake-like path winding across the entire grid), the recursion stack reaches depth O(V) = O(m * n).
The cloned graph requires O(V + E) memory to allocate cloned nodes and neighbor vectors, along with O(V) space for the hash map.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Call stack overflow on large grids: In competitive programming and technical interviews, grid dimensions can reach 1000 x 1000 (10^6 cells). A recursive DFS traversing a spiral or snake path will exceed the default thread call stack limit (often 1MB to 8MB), causing a crash. In production or for deep grids, rewrite the DFS using an explicit std::vector as a stack, or use BFS.

Mutating input when immutability is required: In Number of Islands, sinking '1's to '0' in-place mutates the input grid. If the caller requires the input to remain intact, you must allocate an explicit vector<vector<bool>> visited array. Always clarify with an interviewer whether modifying the input in-place is permissible.

Graph cloning cycle traps: Forgetting to insert the newly created clone into the copies map BEFORE recursing into its neighbors leads to an infinite recursion loop whenever the graph contains a cycle or bidirectional edge.

Boundary check ordering: When checking grid coordinates, always evaluate boundary conditions (r < 0 || r >= m || c < 0 || c >= n) before indexing into the grid (grid[r][c] != '1'). Reversing this order causes out-of-bounds array access and undefined behavior.`,
      },
      {
        title: "Practice order",
        body: `Start with Number of Islands to master the fundamental recursive flood-fill pattern and connected component counting on grids. Next, solve Clone Graph to understand how registering cloned nodes in a hash map manages cycles and arbitrary pointer graphs during DFS traversal. Finally, tackle Pacific Atlantic Water Flow to experience the power of problem reversal, seeing how launching DFS from boundary targets uphill avoids redundant work.`,
      },
    ],
  },

  "topo-sort": {
    intro:
      "Topological sorting arranges the vertices of a directed acyclic graph (DAG) into a linear sequence such that for every directed edge from vertex u to vertex v, u precedes v in the ordering. This ordering provides a valid execution sequence where all prerequisite constraints are honored. If a directed graph contains a cycle, no valid topological order can exist. You reach for topological sort when resolving prerequisite dependencies such as course scheduling or software package builds, deriving character alphabets from sorted dictionaries, detecting cycles in directed graphs, and executing dynamic programming along the dependency order of a DAG.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine you are getting dressed in the morning. You cannot put on your shoes before your socks, and you cannot put on your jacket before your shirt. Some tasks can be performed in parallel or in arbitrary order (such as putting on socks versus putting on your shirt), but certain hard dependencies must be strictly preserved. A topological sort is simply a linear checklist that guarantees no task appears before its prerequisites.

Two classic algorithms produce a topological sort:
1. Kahn's Algorithm (BFS with In-Degrees): The intuition is elimination of free tasks. If a vertex has an in-degree of 0, it has no remaining prerequisites. We can safely perform it right now. We place all in-degree 0 vertices into a queue. When we pop a vertex u, we add it to our output order and remove all its outgoing edges by decrementing the in-degrees of its neighbors. Any neighbor whose in-degree drops to 0 has had all its prerequisites satisfied and is immediately pushed to the queue. If we process all n vertices, the ordering is complete. If the queue empties before all vertices are processed, a circular dependency (cycle) prevented the remaining vertices from ever becoming free.

2. DFS Post-Order Reversal: The intuition is finishing time. When a depth-first search explores a vertex u, it recursively visits all downstream vertices reachable from u before returning. By the time u finishes, every single descendant of u has already completed. Therefore, if we record vertices at their moment of completion (post-order), u will appear after all its dependencies. Reversing this post-order sequence places u before all its dependencies, yielding a valid topological sort. Cycles are caught using 3-color marking during the DFS.

Topological sort is also the engine for Dynamic Programming on DAGs. On an arbitrary graph, finding the longest path is NP-hard. But on a DAG, dependencies flow in one direction. By processing vertices in topological order, we can compute longest paths, earliest completion times (as in Parallel Courses III), or total path counts in simple linear time.`,
      },
      {
        title: "Why it works",
        body: `We prove the correctness and cycle-detection guarantees for both Kahn's algorithm and DFS post-order.

Theorem: A directed graph G has a topological sort if and only if G is acyclic (a DAG).
Proof (=>): If G contains a directed cycle v_1 -> v_2 -> ... -> v_k -> v_1, then in any linear ordering, each edge requires the source to appear before the destination. Summing these inequalities requires v_1 < v_2 < ... < v_k < v_1, which is a contradiction. Hence, no cyclic graph can have a topological sort.
Proof (<=): We show Kahn's algorithm constructs a topological sort on any DAG.
Lemma: Every non-empty finite DAG has at least one vertex with in-degree 0.
If every vertex had in-degree >= 1, we could start at any vertex and walk backward along incoming edges indefinitely. Since V is finite, by the Pigeonhole Principle, we must eventually revisit a vertex, forming a directed cycle. This contradicts acyclicity. Thus, an in-degree 0 vertex must exist.
Kahn's algorithm picks an in-degree 0 vertex u. Because u has no incoming edges, placing u next in the order violates no constraints. Removing u and its outgoing edges leaves a smaller graph G', which is still a DAG. By mathematical induction on |V|, Kahn's algorithm produces a valid topological ordering of all vertices. If G contains a cycle, the vertices in the cycle never reach in-degree 0, so the algorithm terminates with fewer than n vertices in the output, reliably detecting the cycle.

DFS Post-Order Correctness:
Consider any directed edge u -> v in a DAG.
When DFS is called on u, consider the state of v:
- Case 1: v is already finished (Black). Then v has already been added to the post-order list. Since u finishes after this recursive step, u will be added to the post-order list after v. Reversing the list places u before v.
- Case 2: v is unvisited (White). DFS will visit v recursively before completing u. Thus v finishes before u, and u is added to the post-order list after v. Reversing puts u before v.
- Case 3: v is currently on the recursion stack (Gray). This means a directed path already leads from v to u, so edge u -> v forms a directed cycle. In a DAG, Case 3 never occurs.
Thus, in all acyclic cases, reversing the post-order sequence satisfies every directed edge u -> v.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Course Schedule II with numCourses = 4, and prerequisites:
[1, 0] (course 0 -> course 1)
[2, 0] (course 0 -> course 2)
[3, 1] (course 1 -> course 3)
[3, 2] (course 2 -> course 3)

Step 1: Compute in-degrees:
Course 0: in-degree = 0
Course 1: in-degree = 1 (depends on 0)
Course 2: in-degree = 1 (depends on 0)
Course 3: in-degree = 2 (depends on 1 and 2)

Step 2: Initialize queue with all in-degree 0 vertices:
Queue: [0]. Output list: [].

Step 3: Pop 0. Append to output: [0].
Decrement neighbors of 0:
- Neighbor 1: in-degree drops from 1 to 0 -> push 1.
- Neighbor 2: in-degree drops from 1 to 0 -> push 2.
Queue: [1, 2].

Step 4: Pop 1. Append to output: [0, 1].
Decrement neighbors of 1:
- Neighbor 3: in-degree drops from 2 to 1.
Queue: [2].

Step 5: Pop 2. Append to output: [0, 1, 2].
Decrement neighbors of 2:
- Neighbor 3: in-degree drops from 1 to 0 -> push 3.
Queue: [3].

Step 6: Pop 3. Append to output: [0, 1, 2, 3].
Neighbor list of 3 is empty.
Queue is now empty.
Total processed courses = 4 == numCourses.
No cycle detected.
Valid topological ordering returned: [0, 1, 2, 3]. (Notice [0, 2, 1, 3] is equally valid).`,
      },
      {
        title: "Implementation",
        body: `Kahn's algorithm uses an in-degree array and a queue of zero-dependency nodes. Directed cycle detection is also demonstrated via 3-color depth-first search.`,
        code: `// Course Schedule II: Kahn's algorithm (BFS on in-degree 0 queue).
vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    vector<int> inDegree(numCourses, 0);
    for (const auto& p : prerequisites) {
        int course = p[0], prereq = p[1];
        adj[prereq].push_back(course);
        inDegree[course]++;
    }

    queue<int> q;
    for (int i = 0; i < numCourses; i++) {
        if (inDegree[i] == 0) q.push(i);
    }

    vector<int> order;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        order.push_back(u);
        for (int v : adj[u]) {
            if (--inDegree[v] == 0) {
                q.push(v);
            }
        }
    }
    if ((int)order.size() != numCourses) return {}; // Cycle detected
    return order;
}

// Course Schedule: cycle detection using DFS 3-color coloring.
bool canFinishDfs(int u, const vector<vector<int>>& adj, vector<int>& color) {
    color[u] = 1; // Gray: currently visiting on recursion stack
    for (int v : adj[u]) {
        if (color[v] == 1) return false; // Back edge: cycle detected
        if (color[v] == 0 && !canFinishDfs(v, adj, color)) return false;
    }
    color[u] = 2; // Black: fully explored
    return true;
}

bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    for (const auto& p : prerequisites) {
        adj[p[1]].push_back(p[0]);
    }
    vector<int> color(numCourses, 0); // 0=White, 1=Gray, 2=Black
    for (int i = 0; i < numCourses; i++) {
        if (color[i] == 0 && !canFinishDfs(i, adj, color)) return false;
    }
    return true;
}`,
      },
      {
        title: "Implementation: Parallel Courses III and Alien Dictionary",
        body: `Topological sort enables dynamic programming on directed acyclic graphs. Parallel Courses III computes the earliest course completion time by relaxing paths in topological order.`,
        code: `// Parallel Courses III: Longest path DP on DAG in topological order.
int minimumTime(int n, vector<vector<int>>& relations, vector<int>& time) {
    vector<vector<int>> adj(n + 1);
    vector<int> inDegree(n + 1, 0);
    for (const auto& r : relations) {
        adj[r[0]].push_back(r[1]);
        inDegree[r[1]]++;
    }

    queue<int> q;
    vector<int> completionTime(n + 1, 0);
    for (int i = 1; i <= n; i++) {
        completionTime[i] = time[i - 1];
        if (inDegree[i] == 0) q.push(i);
    }

    int totalMaxTime = 0;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        totalMaxTime = max(totalMaxTime, completionTime[u]);
        for (int v : adj[u]) {
            completionTime[v] = max(completionTime[v], completionTime[u] + time[v - 1]);
            if (--inDegree[v] == 0) {
                q.push(v);
            }
        }
    }
    return totalMaxTime;
}`,
      },
      {
        title: "Variants",
        body: `Lexicographically Smallest Topological Sort: When multiple valid topological orderings exist and the problem asks for the lexicographically smallest one, replace the standard FIFO queue in Kahn's algorithm with a min-heap (std::priority_queue<int, vector<int>, greater<int>>). The smallest available in-degree 0 node is always selected next.

Alien Dictionary: Given a sorted dictionary of words in an alien language, find the alphabet order. Compare adjacent words to find the first differing character, creating a directed edge from the character in the earlier word to the character in the later word. If word A is a prefix of word B and A appears after B (e.g. ['apple', 'app']), the dictionary is invalid. Then run topological sort on the character graph.

Parallel Scheduling (Critical Path Method): In task graphs where each task has an execution duration, the total project duration is determined by the longest path in the DAG. In Parallel Courses III, we evaluate completionTime[v] = max(completionTime[v], completionTime[u] + time[v]) along topological order.

All Topological Sorts: Finding all valid orderings uses backtracking on Kahn's algorithm: at each step, try choosing any of the current in-degree 0 nodes, recurse, and restore in-degrees upon backtrack.`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
Building the graph and counting in-degrees takes O(V + E) time.
Kahn's algorithm enqueues each vertex once and pops each vertex once (O(V)). For each popped vertex, all outgoing edges are traversed once to decrement neighbor in-degrees (O(E)). Total time is strictly O(V + E).
DFS-based topological sort visits each vertex and edge once in O(V + E) time.
In Alien Dictionary, comparing adjacent words scans at most the total characters across all words (O(C)). Since the alphabet has at most 26 lowercase English letters, the graph has V <= 26 and E <= 26^2, making the topological sort step take O(1) time.

Space complexity:
The adjacency list requires O(V + E) memory.
The in-degree array, queue, and output vector each require O(V) space.
For DFS, the recursion call stack takes O(V) space in the worst case.
Total auxiliary space is O(V + E).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Reversed edge direction: The single most common bug in Course Schedule problems is setting the edge direction backward. If the input prerequisite pair is [a, b], meaning 'course b must be taken before course a', the directed edge is b -> a, NOT a -> b. Getting this backward reverses the dependencies and fails all tests.

Prefix contradiction in Alien Dictionary: If word1 = 'abc' and word2 = 'ab', the second word is a proper prefix of the first but appears later in the sorted list. In lexicographical sorting, a shorter prefix must always come before a longer word. This is an invalid dictionary configuration that cannot be represented by character edges. You must detect this condition and return '' immediately.

Undirected vs directed cycle detection: Detecting cycles in a directed graph CANNOT be done with standard 2-color (visited) DFS or simple Union-Find. In a directed graph, two paths reaching the same node from different directions (a diamond shape: 0 -> 1 -> 3 and 0 -> 2 -> 3) do NOT constitute a cycle. You must use 3-color DFS (White/Gray/Black) or Kahn's algorithm.

Disconnected components: A directed acyclic graph can have multiple independent components. Kahn's algorithm handles this naturally by enqueuing all vertices with in-degree 0 across all components at initialization.`,
      },
      {
        title: "Practice order",
        body: `Begin with Course Schedule to master directed cycle detection using Kahn's algorithm and 3-color DFS. Then solve Course Schedule II to build the actual linear dependency ordering. Next, tackle Alien Dictionary to practice extracting dependency edges from sequential data and handling prefix edge cases. Finally, advance to Parallel Courses III to see how topological sorting serves as the foundational ordering for dynamic programming on DAGs.`,
      },
    ],
  },

  "union-find": {
    intro:
      "The Disjoint Set Union (DSU), or Union-Find data structure, maintains a collection of disjoint sets under two near-instantaneous operations: finding the canonical representative of an element's set and uniting two sets. By combining path compression on lookups with union by size or rank on merges, DSU achieves an amortized operational time that is effectively constant. You reach for Union-Find when processing incremental dynamic connectivity in undirected graphs, detecting cycles as edges arrive online, merging equivalent entities such as user accounts sharing email addresses, and implementing Kruskal's algorithm for minimum spanning trees.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine a room of people who initially don't know each other. Each person is the leader of their own one-person team. As pairs of people become friends, their teams merge. Who should lead the newly combined team? To keep the hierarchy shallow, the smaller team agrees to accept the leader of the larger team as their new boss. Over time, when anyone asks 'who is your top boss?', a person looks up their managerial chain. And to save time in the future, every person who answered that query immediately connects their direct phone line straight to the top boss.

This is the Disjoint Set Union (DSU) data structure.
Each disjoint set is represented as a directed tree where each element points to its parent. The root of the tree points to itself and serves as the unique canonical representative of the entire set.
Two core operations define DSU:
1. find(x): Follow parent pointers up from x until reaching the root. If two elements have the same root, they belong to the same set.
2. unite(x, y): Find the root of x and the root of y. If the roots are distinct, make one root point to the other, merging the two sets.

A naive tree implementation can degenerate into a linked list of length n, degrading find to O(n) time. Two simple optimizations prevent this:
- Path Compression: During find(x), as the recursion unwinds, every node visited along the path is re-parented directly to the root. Future calls on any of those nodes resolve in O(1) time.
- Union by Size (or Rank): During unite(x, y), always attach the root of the smaller tree under the root of the larger tree. This ensures tree depth grows logarithmically at worst.

Together, these two techniques crush tree heights. Operations take amortized O(alpha(n)) time, where alpha is the inverse Ackermann function, which is strictly less than 5 for all practical values of n.`,
      },
      {
        title: "Why it works",
        body: `We analyze the structural invariants that guarantee the near-constant amortized bound.

Union by Size Invariant:
When merging sets with roots r_1 and r_2 of sizes S_1 and S_2 with S_1 >= S_2, we set parent[r_2] = r_1 and size[r_1] = S_1 + S_2.
Notice that the depth of nodes in r_1's tree does not change. The depth of nodes in r_2's tree increases by exactly 1. But for any node in r_2, its new component size is at least 2 * S_2 (at least double its previous component size). Because a component size starts at 1 and cannot exceed n, a node's depth can increase at most log2(n) times. Thus, union by size alone guarantees that the height of any tree is bounded by floor(log2(n)), ensuring O(log n) worst-case time per operation without path compression.

Path Compression Effect:
Path compression sets parent[x] = find(parent[x]). It flattens the tree aggressively. While a single operation might traverse depth d, all d nodes along the path now have depth 1. Any future lookup on these nodes takes O(1).

The Inverse Ackermann Bound:
Robert Tarjan proved in 1975 that applying both path compression and union by size (or rank) guarantees that any sequence of m operations on n elements runs in O(m * alpha(n)) time.
The Ackermann function A(i, j) grows unimaginably fast:
A(1, j) = 2j
A(2, j) = 2^j
A(3, j) = 2^(2^(...)) (a tower of j twos)
A(4, 1) = 65536, and A(4, 2) = 2^65536 (a number with roughly 20,000 decimal digits).
The inverse Ackermann function alpha(n) is the smallest integer k such that A(k, 1) >= n. For any n up to 10^80 (the estimated number of atoms in the known universe), alpha(n) <= 4. For all computational purposes, alpha(n) is effectively a small constant, meaning DSU operations execute in amortized O(1) time.

Cycle Detection Invariant:
In an undirected graph, an edge (u, v) creates a cycle if and only if u and v already belong to the same connected component. Because unite(u, v) checks whether find(u) == find(v), DSU detects cycle creation dynamically in online fashion. If find(u) == find(v), the edge is redundant; otherwise, unite merges the components.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Redundant Connection on edges: [[1, 2], [1, 3], [2, 3]].
Initialize DSU with parent = [0, 1, 2, 3] and size = [1, 1, 1, 1].

Edge 1: [1, 2]
Find roots: find(1) = 1, find(2) = 2.
Roots differ (1 != 2).
Unite: size[1] == size[2] == 1. Attach 2 under 1.
parent[2] = 1, size[1] = 2.
Graph has 2 components: {1, 2} and {3}.

Edge 2: [1, 3]
Find roots: find(1) = 1, find(3) = 3.
Roots differ (1 != 3).
Unite: size[1] = 2 > size[3] = 1. Attach 3 under 1.
parent[3] = 1, size[1] = 3.
Graph has 1 component: {1, 2, 3}.

Edge 3: [2, 3]
Find roots:
find(2): parent[2] is 1, parent[1] is 1 -> root is 1.
find(3): parent[3] is 1, parent[1] is 1 -> root is 1.
Roots are identical (1 == 1)!
Vertices 2 and 3 are ALREADY connected in the same component through node 1.
Adding edge [2, 3] creates a cycle!
We return [2, 3] as the redundant connection.

Now trace Accounts Merge:
Account 0 ('John'): ['johnsmith@mail.com', 'john_newyork@mail.com']
Account 1 ('John'): ['johnsmith@mail.com', 'john00@mail.com']
Account 2 ('Mary'): ['mary@mail.com']
Map emails to first account index seen:
'johnsmith@mail.com' -> account 0
'john_newyork@mail.com' -> account 0
For account 1:
'johnsmith@mail.com' already seen at account 0 -> unite(1, 0).
'john00@mail.com' -> account 1.
Account 0 and account 1 now share root 0.
Group all emails under root 0:
['johnsmith@mail.com', 'john_newyork@mail.com', 'john00@mail.com'].
Sort emails and emit merged result.`,
      },
      {
        title: "Implementation",
        body: `The DSU struct implements path compression in find and size comparisons in unite. Component counting is decremented upon each successful merge, and redundant edges are detected when endpoints share a root.`,
        code: `// Disjoint Set Union (DSU) with path compression and union by size.
struct DSU {
    vector<int> parent;
    vector<int> size;
    int components;

    DSU(int n) : parent(n), size(n, 1), components(n) {
        iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]); // Path compression
    }

    bool unite(int x, int y) {
        int rootX = find(x);
        int rootY = find(y);
        if (rootX == rootY) return false; // Already connected
        // Union by size: attach smaller root under larger root
        if (size[rootX] < size[rootY]) swap(rootX, rootY);
        parent[rootY] = rootX;
        size[rootX] += size[rootY];
        components--;
        return true;
    }

    bool connected(int x, int y) {
        return find(x) == find(y);
    }
};

// Redundant Connection: find edge creating a cycle in an undirected graph.
vector<int> findRedundantConnection(vector<vector<int>>& edges) {
    int n = edges.size();
    DSU dsu(n + 1);
    for (const auto& edge : edges) {
        if (!dsu.unite(edge[0], edge[1])) {
            return edge; // Edge connects two nodes already in the same component
        }
    }
    return {};
}

// Number of Provinces: count connected components in an adjacency matrix.
int findCircleNum(vector<vector<int>>& isConnected) {
    int n = isConnected.size();
    DSU dsu(n);
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (isConnected[i][j]) {
                dsu.unite(i, j);
            }
        }
    }
    return dsu.components;
}`,
      },
      {
        title: "Implementation: Accounts Merge",
        body: `Accounts Merge groups accounts sharing common emails using Union-Find by mapping email strings to unique account indices and merging components that share identical email addresses.`,
        code: `// Accounts Merge: grouping accounts sharing emails using DSU.
vector<vector<string>> accountsMerge(vector<vector<string>>& accounts) {
    int n = accounts.size();
    DSU dsu(n);
    unordered_map<string, int> emailToAccount;

    for (int i = 0; i < n; i++) {
        for (int j = 1; j < (int)accounts[i].size(); j++) {
            const string& email = accounts[i][j];
            if (emailToAccount.count(email)) {
                dsu.unite(i, emailToAccount[email]);
            } else {
                emailToAccount[email] = i;
            }
        }
    }

    unordered_map<int, vector<string>> leaderToEmails;
    for (const auto& [email, accIdx] : emailToAccount) {
        int leader = dsu.find(accIdx);
        leaderToEmails[leader].push_back(email);
    }

    vector<vector<string>> mergedAccounts;
    for (auto& [leader, emails] : leaderToEmails) {
        sort(emails.begin(), emails.end());
        vector<string> entry;
        entry.push_back(accounts[leader][0]); // Name
        entry.insert(entry.end(), emails.begin(), emails.end());
        mergedAccounts.push_back(entry);
    }
    return mergedAccounts;
}`,
      },
      {
        title: "Variants",
        body: `Weighted DSU (Potential DSU): In problems such as Evaluate Division, edges represent numeric ratios: value(x) / value(y) = weight. In a weighted DSU, each node stores parent[x] and weight[x], where weight[x] = value(x) / value(parent[x]). Path compression multiplies weights along the path, allowing dynamic ratio queries between any two connected variables in O(alpha(n)) time.

Rollback DSU (Persistent DSU): Path compression mutates parent pointers irreversibly. In algorithms requiring backtracks (such as divide-and-conquer on offline dynamic graph queries), we disable path compression and use ONLY union by size or rank. History changes are logged on an explicit stack, allowing undoing the most recent unite operation in O(1) time while maintaining O(log n) tree depth.

Kruskal's Minimum Spanning Tree: Sort all edges in ascending order of weight. For each edge (u, v, w), if unite(u, v) succeeds, include the edge in the spanning tree. Terminate when n - 1 edges have been added.

Grid Connectivity (Number of Islands II): In an m x n grid where land cells are added dynamically one by one, each cell (r, c) is mapped to integer id r * n + c. When a new land cell is activated, increment the component counter and invoke unite with any adjacent cells that are already land.`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
Initialization of parent and size vectors takes O(n) time.
Each find and unite operation takes amortized O(alpha(n)) time, which is strictly less than 5 operations for any practical dataset, rendering operations effectively O(1).
For Redundant Connection with E edges, total time is O(E * alpha(V)).
For Accounts Merge with N accounts and total emails E_total, uniting emails takes O(E_total * alpha(N)), and sorting the grouped emails takes O(E_total * log(E_total)) time.

Space complexity:
The parent and size arrays require O(n) space.
In Accounts Merge, storing the hash maps mapping emails to IDs and grouping emails requires O(E_total) memory.
Total auxiliary space is O(n + E_total).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Comparing parents instead of roots: A pervasive mistake is writing if (parent[x] == parent[y]). Because path compression occurs lazily during find, parent[x] is not guaranteed to be the root. Always compare canonical roots using if (find(x) == find(y)).

Using path compression with Rollback DSU: Path compression modifies pointers without recording the previous parent state. If an algorithm requires rolling back unions (such as maintaining dynamic connectivity over time), path compression breaks rollback consistency. Use only union by rank or size in rollback implementations.

Edge case with 1-based indexing: Graph problems often label vertices from 1 to n rather than 0 to n - 1. Initializing DSU with size n causes out-of-bounds memory access on node n. Always size the DSU with n + 1 for 1-indexed inputs.

Deleting edges: Union-Find is strictly an incremental data structure; it cannot delete edges. When a problem asks to delete edges and report connectivity, invert the query sequence: read all queries offline, delete all required edges upfront, and process queries in reverse by adding edges back.`,
      },
      {
        title: "Practice order",
        body: `Start with Number of Provinces to build and verify the basic DSU structure on an adjacency matrix. Next, solve Redundant Connection to see how DSU detects cycle creation online when adding undirected edges. Then solve Accounts Merge to practice mapping non-integer keys (strings and emails) to integer IDs and grouping components. Finally, tackle Number of Islands II to implement dynamic, incremental component tracking on 2D grids.`,
      },
    ],
  },

  "state-space-bfs": {
    intro:
      "State-space breadth-first search solves optimization problems on implicit graphs where vertices represent configuration states and edges represent legal transition moves. Unlike standard graph problems where vertices and edges are provided as input lists, the graph in state-space BFS is constructed on the fly as states are explored. Because every legal move typically incurs a uniform cost of one step, breadth-first search is guaranteed to find the minimum number of moves to transform a starting state into a target configuration. You reach for state-space BFS when solving combinatorial puzzles such as combination locks or sliding tiles, finding paths that require collecting keys, or finding the shortest path that visits all vertices using bitmask states.",
    sections: [
      {
        title: "The intuition",
        body: `In classical graph algorithms, you are handed a list of cities and highways. But in a puzzle game like Rubik's cube, a 15-puzzle sliding tile board, or a rotating combination lock, no explicit map of cities exists. The entire 'world' consists of states: configurations of the board or dials. Moving a tile or turning a wheel transforms the current configuration into a new one.

This is an implicit graph. The vertices are states, and the directed edges are the legal moves. Because finding the shortest solution to a puzzle means finding a sequence with the fewest moves, and every move counts as 1 step, breadth-first search (BFS) is the ideal search algorithm.

The central challenge in state-space search is defining and encoding the state:
1. Completeness: The state must encapsulate every piece of information that affects future legal moves and victory conditions. In Open the Lock, the 4 digits completely define the state. In Shortest Path Visiting All Nodes, however, knowing your current location is not enough; you must also know which subset of nodes has already been visited. Thus, the state is the pair (current_node, visited_bitmask).
2. Compactness: Because BFS stores visited states in a hash set or boolean array, states must be compact. We encode configurations as short strings (e.g. '123450' for a 2x3 sliding puzzle), integers, or bitmasks where the k-th bit indicates whether vertex k has been visited.

Another key intuition is multi-source initialization. In Shortest Path Visiting All Nodes, you are allowed to start at any arbitrary node. Rather than running n separate searches, we push all n initial states (i, 1 << i) into the queue at step 0. The search expands outward simultaneously from all starting locations, terminating the instant any state achieves a full bitmask.`,
      },
      {
        title: "Why it works",
        body: `Correctness relies on the unweighted shortest-path property of BFS applied to the configuration space.

Let S be the set of all valid configurations, and let T subset S be the target configurations. Let s_0 in S be the start state. Transitions between states have uniform cost 1.
We prove that BFS discovers states in strictly non-decreasing order of move count.
Base case: The queue is initialized with s_0 at distance 0.
Inductive step: Suppose the queue maintains the monotonicity invariant. By popping state u at distance d and generating all valid successor states v = move(u), any previously unvisited state v is assigned distance d + 1 and enqueued. Any alternative path to v discovered later must have length >= d + 1. Because BFS terminates the instant a state in T is encountered, the returned move count is guaranteed to be minimal.

Why is the state definition complete?
Consider Shortest Path Visiting All Nodes. A naive graph walk might track only visited_nodes as a set. But a path can revisit previously visited vertices legally to reach unvisited ones. If our state were only u, visiting u a second time would be pruned as a duplicate, preventing valid solutions. If our state were only mask, we would not know which edges are available to traverse next. By defining the state as the tuple (u, mask), we distinguish between being at vertex u with set A visited versus being at vertex u with set B visited. This state space has size n * 2^n, which is finite and small enough for n <= 12 to explore completely.

Pruning and Dead-End Invariant:
In puzzle problems like Open the Lock, certain states are prohibited (deadends). Treating deadends as walls in a maze, we insert all deadends into our visited set before the search begins. The BFS frontier naturally flows around deadends without ever expanding their successors.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Open the Lock from '0000' to target '0202' with deadends: ['0201', '0101', '0102', '1212', '2002'].
Initial state: '0000'.
Deadends added to visited set: {'0000' is not dead; visited contains deadends + '0000'}.
Queue: ['0000']. Steps = 0.

Step 1 (size = 1):
Pop '0000'.
8 possible moves (turning each of the 4 wheels by +1 or -1):
Wheel 0: '1000', '9000'
Wheel 1: '0100', '0900'
Wheel 2: '0010', '0090'
Wheel 3: '0001', '0009'
None are in deadends. All 8 are marked visited and pushed to queue.
Steps = 1.

Step 2 (size = 8):
Pop '1000', '9000', etc.
When popping '0100':
Moves include:
- Turn wheel 1 to 2 -> '0200' (valid, pushed).
- Turn wheel 1 to 0 -> '0000' (already visited, ignored).
- Turn wheel 2 to 1 -> '0110' (valid, pushed).
- Turn wheel 3 to 1 -> '0101' (DEADEND! Skipped!).
Notice how the deadend '0101' is blocked from entering the queue.

The search continues level by level.
At step 6, expanding '0201' is blocked, but path '0000' -> '0001' -> '0002' -> '0102' (blocked) ...
Instead, path '0000' -> '0100' -> '0200' -> '0210' -> '0220' -> ... reaches '0202'.
The queue pops '0202' at step 6.
Target reached! Return 6.`,
      },
      {
        title: "Implementation",
        body: `Open the Lock uses BFS over 4-digit strings, pruning deadends. Sliding Puzzle serializes the 2x3 board into a 6-character string, moving the blank tile according to an adjacency map.`,
        code: `// Open the Lock: BFS finding minimum wheel turns avoiding deadends.
int openLock(vector<string>& deadends, string target) {
    unordered_set<string> dead(deadends.begin(), deadends.end());
    if (dead.count("0000")) return -1;
    if (target == "0000") return 0;

    queue<string> q;
    unordered_set<string> visited;
    q.push("0000");
    visited.insert("0000");

    int steps = 0;
    while (!q.empty()) {
        int sz = q.size();
        for (int s = 0; s < sz; s++) {
            string cur = q.front();
            q.pop();
            if (cur == target) return steps;

            for (int i = 0; i < 4; i++) {
                char orig = cur[i];
                for (int delta : {-1, 1}) {
                    cur[i] = '0' + (orig - '0' + delta + 10) % 10;
                    if (!dead.count(cur) && !visited.count(cur)) {
                        visited.insert(cur);
                        q.push(cur);
                    }
                }
                cur[i] = orig;
            }
        }
        steps++;
    }
    return -1;
}

// Sliding Puzzle: 2x3 board solved with BFS on string state.
int slidingPuzzle(vector<vector<int>>& board) {
    string start = "";
    for (int r = 0; r < 2; r++) {
        for (int c = 0; c < 3; c++) {
            start += to_string(board[r][c]);
        }
    }
    string target = "123450";
    if (start == target) return 0;

    // Legal swap moves from each of the 6 positions of '0'
    vector<vector<int>> moves = {
        {1, 3},       // 0
        {0, 2, 4},    // 1
        {1, 5},       // 2
        {0, 4},       // 3
        {1, 3, 5},    // 4
        {2, 4}        // 5
    };

    queue<string> q;
    unordered_set<string> visited;
    q.push(start);
    visited.insert(start);

    int steps = 0;
    while (!q.empty()) {
        int sz = q.size();
        for (int s = 0; s < sz; s++) {
            string cur = q.front();
            q.pop();
            if (cur == target) return steps;
            int zeroPos = cur.find('0');
            for (int nextPos : moves[zeroPos]) {
                string nextState = cur;
                swap(nextState[zeroPos], nextState[nextPos]);
                if (!visited.count(nextState)) {
                    visited.insert(nextState);
                    q.push(nextState);
                }
            }
        }
        steps++;
    }
    return -1;
}`,
      },
      {
        title: "Implementation: Shortest Path Visiting All Nodes",
        body: `Shortest Path Visiting All Nodes models state as a tuple of the current node and a bitmask of all visited vertices, exploring the implicit state space using multi-source BFS.`,
        code: `// Shortest Path Visiting All Nodes: state space BFS with (node, bitmask).
int shortestPathLength(vector<vector<int>>& graph) {
    int n = graph.size();
    if (n <= 1) return 0;
    int targetMask = (1 << n) - 1;

    // queue holds {node, mask}
    queue<pair<int, int>> q;
    vector<vector<bool>> visited(n, vector<bool>(1 << n, false));

    // Multi-source start: can begin at any node
    for (int i = 0; i < n; i++) {
        q.push({i, 1 << i});
        visited[i][1 << i] = true;
    }

    int steps = 0;
    while (!q.empty()) {
        int sz = q.size();
        for (int s = 0; s < sz; s++) {
            auto [u, mask] = q.front();
            q.pop();
            if (mask == targetMask) return steps;
            for (int v : graph[u]) {
                int nextMask = mask | (1 << v);
                if (!visited[v][nextMask]) {
                    visited[v][nextMask] = true;
                    q.push({v, nextMask});
                }
            }
        }
        steps++;
    }
    return -1;
}`,
      },
      {
        title: "Variants",
        body: `Bidirectional State-Space BFS: In puzzles with a known unique goal state (such as Sliding Puzzle or the 15-puzzle), searching simultaneously forward from the initial board and backward from '123450' cuts the search depth from d to d / 2. If the branching factor is b, this reduces visited states from O(b^d) to O(b^(d/2)), providing an immense speedup.

A* Heuristic Search: When the state space is too vast for exhaustive BFS (such as the 8-puzzle or 15-puzzle with millions of states), A* search uses a priority queue ordered by f(s) = g(s) + h(s), where g(s) is the exact moves taken so far and h(s) is an admissible heuristic (such as the Manhattan distance of tiles to their target positions).

Shortest Path with Keys and Doors: In a grid with locked doors and keys (e.g. Shortest Path to Get All Keys), state is modeled as (row, column, keys_bitmask). Picking up key 'a' updates the bitmask with mask | (1 << 0). A door 'A' can only be traversed if mask & (1 << 0) is non-zero.

Word Ladder as State-Space BFS: Word transformation is a state-space search where states are words and transitions are 1-letter substitutions found in a dictionary.`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
State-space BFS runs in O(S * T) time, where S is the number of reachable states and T is the number of transitions per state.
For Open the Lock, there are 10^4 = 10,000 possible 4-digit combinations. Each state has 8 transitions (4 dials * 2 directions). Thus, the search takes at most 10,000 * 8 = 80,000 operations, running in a few milliseconds.
For Sliding Puzzle on a 2x3 board, there are 6! = 720 permutations, of which exactly half (360) are reachable due to parity constraints. Each state has at most 4 transitions, taking at most 1,440 operations.
For Shortest Path Visiting All Nodes on a graph with n vertices, there are n * 2^n states, each having up to n outgoing edges. Total time is O(n^2 * 2^n). For n = 12, 12^2 * 4096 is approximately 5.9 * 10^5 operations, easily running within 20ms.

Space complexity:
Space is dominated by the visited collection and queue, taking O(S) memory.
Open the Lock uses an unordered_set<string> of at most 10,000 strings.
Shortest Path Visiting All Nodes uses a 2D boolean table vector<vector<bool>> of size n * 2^n, requiring negligible space (less than 1MB).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `State explosion beyond memory limits: Before writing a state-space BFS, always calculate the size of the state space! If the number of reachable states exceeds 10^7, plain BFS will run out of memory or time. You must use bitmask compression, Meet-in-the-Middle, A* heuristic search, or dynamic programming.

Target equals start state: If the starting configuration is already the target configuration (e.g. target is '0000' in Open the Lock, or n = 1 in Shortest Path Visiting All Nodes), the minimum moves required is 0. Returning -1 or advancing the loop can fail. Check if (start == target) return 0; before entering the BFS loop.

Start state is a deadend: In Open the Lock, if '0000' is in the deadends list, it cannot be traversed. You must return -1 immediately. Checking deadends only inside the neighbor transition loop will fail to block the initial state.

Incomplete state definition: Omitting necessary state history when revisiting vertices is legal. If a problem allows revisiting cells, the state MUST include what changed between visits (such as collected keys, remaining obstacles, or visited bitmask); otherwise, visited checks will erroneously prune valid paths.`,
      },
      {
        title: "Practice order",
        body: `Start with Open the Lock to learn basic state-space BFS on discrete dial states and practice dead-end pruning. Next, solve Sliding Puzzle to practice board string serialization and neighbor transition tables. Finally, conquer Shortest Path Visiting All Nodes to master combining vertex positions with bitmasks to traverse an exponential state space in polynomial time.`,
      },
    ],
  },
};
