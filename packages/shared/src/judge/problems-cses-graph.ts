import type { ProblemSpec } from "./types";

// CSES graph algorithms. Statements, hints and solutions are written for this app; the original tasks are linked. Written for this app.

export const CSES_SPECS_GRAPH: ProblemSpec[] = [
  {
    id: "cses-counting-rooms",
    source: "cses",
    title: "Counting Rooms",
    url: "https://cses.fi/problemset/task/1192",
    statement: [
      "You are given a map of a building represented as an n x m grid of characters. Each cell is either a floor ('.') or a wall ('#').",
      "Two floor cells belong to the same room if they share a common side (horizontal or vertical). You can move between any two floor cells in the same room without crossing walls.",
      "Return the total number of rooms (connected components of '.' floor cells) in the building.",
    ],
    constraints: [
      "1 <= grid.length <= 1000",
      "1 <= grid[0].length <= 1000",
      "grid[i] contains only '.' and '#'",
      "All rows in grid have the same length",
    ],
    fn: {name: "countingRooms",params: [{name: "grid",type: "string[]"}],returns: "int"},
    examples: [
      { input: [["########","#..#...#","####.#.#","#..#...#","########"]], output: 3, explanation: "There are three separate rooms: two on the left of size 2, and one on the right of size 8." },
      { input: [["###","#.#","###"]], output: 1, explanation: "Only the single center cell is a floor cell, forming 1 room." },
    ],
    tests: [
      { input: [["###","###","###"]], output: 0 },
      { input: [[".","."]], output: 1 },
      { input: [[".#.","#.#",".#."]], output: 5 },
      { input: [["#...#...#"]], output: 2 },
      { input: [[".....",".###.",".#.#.",".###.","....."]], output: 2 },
      { input: [["#.###","#...#","###.#","#...#","###.#"]], output: 1 },
      { input: [["."]], output: 1 },
      { input: [["#"]], output: 0 },
    ],
    hints: [
      "This is a standard connected components problem on a 2D grid. Each room is a maximal connected component of '.' cells.",
      "Iterate over every cell. When you encounter an unvisited '.' cell, increment your room count and traverse all floor cells in that room using BFS or iterative DFS.",
      "Mark visited cells by replacing '.' with '#' directly in the grid, or maintain a visited array. Iterative BFS or an explicit stack avoids call stack overflow on large grids.",
    ],
    solution: {
      idea: [
        "Model the floor grid as an undirected graph where each '.' cell is a vertex and edges connect orthogonally adjacent floor cells.",
        "Scan through the grid cell by cell. Whenever an unvisited '.' cell is found, increment the room counter and launch a breadth-first search (BFS) to mark all reachable floor cells.",
        "Using BFS with a queue prevents recursion depth issues on 1000x1000 grids.",
      ],
      complexity: "O(n * m) time, O(n * m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countingRooms(vector<string>& grid) {
        if (grid.empty() || grid[0].empty()) return 0;
        int n = grid.size(), m = grid[0].size();
        int rooms = 0;
        int dr[4] = {-1, 1, 0, 0};
        int dc[4] = {0, 0, -1, 1};
        vector<pair<int, int>> q;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == '.') {
                    rooms++;
                    grid[i][j] = '#';
                    q.push_back({i, j});
                    size_t head = 0;
                    while (head < q.size()) {
                        auto [r, c] = q[head++];
                        for (int k = 0; k < 4; k++) {
                            int nr = r + dr[k], nc = c + dc[k];
                            if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] == '.') {
                                grid[nr][nc] = '#';
                                q.push_back({nr, nc});
                            }
                        }
                    }
                    q.clear();
                }
            }
        }
        return rooms;
    }
};
`,
    },
  },
  {
    id: "cses-labyrinth",
    source: "cses",
    title: "Labyrinth",
    url: "https://cses.fi/problemset/task/1193",
    statement: [
      "You are given a labyrinth represented as an n x m grid of characters. Each cell is either a floor ('.'), a wall ('#'), the start ('A'), or the target ('B').",
      "You can move from any cell to an adjacent cell (up, down, left, right) as long as the destination cell is not a wall '#'.",
      "Return the minimum number of steps needed to move from 'A' to 'B'. If 'B' cannot be reached from 'A', return -1.",
    ],
    constraints: [
      "1 <= grid.length <= 1000",
      "1 <= grid[0].length <= 1000",
      "grid[i] contains only '.', '#', 'A', and 'B'",
      "There is exactly one 'A' and exactly one 'B' in the grid",
      "All rows in grid have the same length",
    ],
    fn: {name: "labyrinth",params: [{name: "grid",type: "string[]"}],returns: "int"},
    examples: [
      { input: [["########","#.A#...#","#.##.#B#","#......#","########"]], output: 9, explanation: "The shortest path from 'A' down into the open corridor and back up to 'B' takes 9 steps." },
      { input: [["A#B","###","..."]], output: -1, explanation: "'B' is blocked on all sides by walls, so it is unreachable from 'A'." },
    ],
    tests: [
      { input: [["AB"]], output: 1 },
      { input: [["A",".","B"]], output: 2 },
      { input: [["A#B",".#.","..."]], output: 6 },
      { input: [["A....","####.",".....",".####","....B"]], output: 16 },
      { input: [["A....",".....","..#..",".#B#.","..#.."]], output: -1 },
      { input: [["A...B",".....","....."]], output: 4 },
      { input: [["###.###","#A...B#","###.###"]], output: 4 },
    ],
    hints: [
      "Because every step has uniform cost 1, Breadth-First Search (BFS) is guaranteed to find the shortest path first.",
      "Locate the starting coordinates of 'A' and the target 'B'. Initialize a queue with 'A' at distance 0.",
      "Track distances or visited cells in a 2D array (or flattened 1D array). The moment 'B' is popped or reached, return that distance. If the queue becomes empty without reaching 'B', return -1.",
    ],
    solution: {
      idea: [
        "Run Breadth-First Search (BFS) starting at 'A'.",
        "Since each step has unit weight, the first time BFS reaches 'B' yields the minimum number of steps.",
        "Use a flattened 1D distance array of size n * m initialized to -1 to represent unvisited cells, avoiding overhead.",
      ],
      complexity: "O(n * m) time, O(n * m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int labyrinth(vector<string>& grid) {
        int n = grid.size(), m = grid[0].size();
        int sr = -1, sc = -1, tr = -1, tc = -1;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 'A') { sr = i; sc = j; }
                else if (grid[i][j] == 'B') { tr = i; tc = j; }
            }
        }
        if (sr == -1 || tr == -1) return -1;
        vector<int> dist(n * m, -1);
        dist[sr * m + sc] = 0;
        vector<int> q;
        q.reserve(n * m);
        q.push_back(sr * m + sc);
        size_t head = 0;
        int dr[4] = {-1, 1, 0, 0};
        int dc[4] = {0, 0, -1, 1};
        while (head < q.size()) {
            int u = q[head++];
            int r = u / m, c = u % m;
            if (r == tr && c == tc) return dist[u];
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] != '#') {
                    int v = nr * m + nc;
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.push_back(v);
                    }
                }
            }
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "cses-building-roads",
    source: "cses",
    title: "Building Roads",
    url: "https://cses.fi/problemset/task/1666",
    statement: [
      "The kingdom consists of n cities numbered 1 to n, and m bidirectional roads connecting certain pairs of cities.",
      "The king wants to build new roads between cities so that there is a route between every pair of cities.",
      "Return the minimum number of new roads needed to make the entire network connected (which equals the number of connected components minus 1).",
    ],
    constraints: [
      "1 <= n <= 100000",
      "0 <= roads.length <= 200000",
      "Each road is [u, v] with 1 <= u, v <= n and u != v",
    ],
    fn: {name: "buildingRoads",params: [{name: "n",type: "int"},{name: "roads",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [4,[[1,2],[3,4]]], output: 1, explanation: "There are two separate components {1, 2} and {3, 4}. Building 1 road between them connects all 4 cities." },
      { input: [5,[[1,2],[2,3],[3,4],[4,5]]], output: 0, explanation: "All 5 cities are already connected in a single component, so 0 new roads are needed." },
    ],
    tests: [
      { input: [1,[]], output: 0 },
      { input: [4,[]], output: 3 },
      { input: [6,[[1,2],[2,3],[4,5]]], output: 2 },
      { input: [5,[[1,2],[2,3],[3,1],[4,5]]], output: 1 },
      { input: [7,[[1,3],[2,4],[5,6],[6,7]]], output: 2 },
      { input: [3,[[1,2],[2,3],[1,3]]], output: 0 },
      { input: [8,[[1,2],[3,4],[5,6],[7,8]]], output: 3 },
    ],
    hints: [
      "Consider the cities and roads as an undirected graph. Two cities are already reachable if they belong to the same connected component.",
      "If a graph has C connected components, connecting them all into a single component requires at least C - 1 edges.",
      "Count the number of connected components C using Disjoint Set Union (DSU) or BFS/DFS, and return C - 1.",
    ],
    solution: {
      idea: [
        "Count the number of connected components C in the undirected graph.",
        "Connecting C components into one connected graph requires at least C - 1 edges (e.g. connecting one representative from each component).",
        "Disjoint Set Union (DSU) with path compression maintains component counts efficiently in O((n + m) * alpha(n)) time.",
      ],
      complexity: "O(n + m * alpha(n)) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct DSU {
        vector<int> parent;
        int comps;
        DSU(int n) : parent(n + 1), comps(n) {
            iota(parent.begin(), parent.end(), 0);
        }
        int find(int i) {
            if (parent[i] == i) return i;
            return parent[i] = find(parent[i]);
        }
        void unite(int i, int j) {
            int rootI = find(i);
            int rootJ = find(j);
            if (rootI != rootJ) {
                parent[rootI] = rootJ;
                comps--;
            }
        }
    };
public:
    int buildingRoads(int n, vector<vector<int>>& roads) {
        DSU dsu(n);
        for (const auto& r : roads) {
            dsu.unite(r[0], r[1]);
        }
        return dsu.comps - 1;
    }
};
`,
    },
  },
  {
    id: "cses-message-route",
    source: "cses",
    title: "Message Route",
    url: "https://cses.fi/problemset/task/1667",
    statement: [
      "A network consists of n computers numbered 1 to n, and m bidirectional connections.",
      "You want to send a message from computer 1 to computer n along the network.",
      "Return the minimum number of computers on a valid route from computer 1 to computer n (inclusive of both 1 and n). If there is no route from computer 1 to computer n, return -1.",
    ],
    constraints: [
      "2 <= n <= 100000",
      "1 <= connections.length <= 200000",
      "Each connection is [u, v] with 1 <= u, v <= n and u != v",
    ],
    fn: {name: "messageRoute",params: [{name: "n",type: "int"},{name: "connections",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [5,[[1,2],[1,3],[1,4],[2,3],[5,4]]], output: 3, explanation: "The shortest route is 1 -> 4 -> 5, which visits 3 computers." },
      { input: [5,[[1,2],[3,4],[4,5]]], output: -1, explanation: "Computer 1 cannot reach computer 5, so the message cannot be delivered." },
    ],
    tests: [
      { input: [2,[[1,2]]], output: 2 },
      { input: [3,[[1,2],[2,3]]], output: 3 },
      { input: [4,[[1,2],[1,3],[2,4],[3,4]]], output: 3 },
      { input: [4,[[1,2],[2,3]]], output: -1 },
      { input: [6,[[1,2],[2,3],[3,4],[4,5],[5,6],[1,6]]], output: 2 },
      { input: [6,[[1,2],[2,3],[3,6],[1,4],[4,5],[5,6]]], output: 4 },
      { input: [7,[[1,2],[2,3],[4,5],[5,7]]], output: -1 },
    ],
    hints: [
      "Since every network connection has unit length, Breadth-First Search (BFS) finds the path with the fewest hops.",
      "Run BFS starting at computer 1. Maintain a distance array recording the number of hops from computer 1.",
      "If computer n is reached at distance d, the route consists of d + 1 computers. If BFS completes without reaching n, return -1.",
    ],
    solution: {
      idea: [
        "Build an adjacency list representation of the network.",
        "Perform a Breadth-First Search (BFS) starting from computer 1.",
        "Track edge distances in an array. If computer n is reachable at distance d, the number of computers along the route is d + 1. If unreachable, return -1.",
      ],
      complexity: "O(n + m) time, O(n + m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int messageRoute(int n, vector<vector<int>>& connections) {
        vector<vector<int>> adj(n + 1);
        for (const auto& c : connections) {
            adj[c[0]].push_back(c[1]);
            adj[c[1]].push_back(c[0]);
        }
        vector<int> dist(n + 1, -1);
        dist[1] = 0;
        vector<int> q;
        q.reserve(n);
        q.push_back(1);
        size_t head = 0;
        while (head < q.size()) {
            int u = q[head++];
            if (u == n) return dist[u] + 1;
            for (int v : adj[u]) {
                if (dist[v] == -1) {
                    dist[v] = dist[u] + 1;
                    q.push_back(v);
                }
            }
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "cses-building-teams",
    source: "cses",
    title: "Building Teams",
    url: "https://cses.fi/problemset/task/1668",
    statement: [
      "There are n pupils numbered 1 to n, and m friendships between pairs of pupils.",
      "You want to divide the pupils into two teams such that no two friends are on the same team.",
      "Return true if such a valid 2-coloring (bipartite division) is possible, or false if it is impossible.",
    ],
    constraints: [
      "1 <= n <= 100000",
      "0 <= friendships.length <= 200000",
      "Each friendship is [u, v] with 1 <= u, v <= n and u != v",
    ],
    fn: {name: "buildingTeams",params: [{name: "n",type: "int"},{name: "friendships",type: "int[][]"}],returns: "bool"},
    examples: [
      { input: [5,[[1,2],[1,3],[4,5]]], output: true, explanation: "A valid assignment is team 1: {1, 4}, team 2: {2, 3, 5}. No two friends are on the same team." },
      { input: [3,[[1,2],[2,3],[3,1]]], output: false, explanation: "The three pupils form an odd cycle of length 3 (a triangle), so 2 teams are impossible." },
    ],
    tests: [
      { input: [1,[]], output: true },
      { input: [4,[[1,2],[2,3],[3,4],[4,1]]], output: true },
      { input: [5,[[1,2],[2,3],[3,4],[4,5],[5,1]]], output: false },
      { input: [4,[[1,2],[1,3],[1,4]]], output: true },
      { input: [6,[[1,2],[2,3],[3,1],[4,5],[5,6]]], output: false },
      { input: [6,[[1,2],[3,4],[5,6]]], output: true },
      { input: [4,[[1,2],[2,3],[3,4],[4,1],[1,3]]], output: false },
    ],
    hints: [
      "Dividing pupils into two teams with no edges between members of the same team is graph 2-coloring (testing if the graph is bipartite).",
      "A graph is bipartite if and only if it contains no odd cycles.",
      "Traverse each connected component using BFS or DFS. Assign alternating colors (1 and 2). If an adjacent pupil is already colored with the same color, return false.",
    ],
    solution: {
      idea: [
        "A valid division into two teams without internal friendships is equivalent to testing whether the graph is bipartite.",
        "Check every connected component using BFS. Start an uncolored vertex with color 1, and color all its neighbors with 3 - color[u] (alternating 1 and 2).",
        "If we ever encounter an adjacent vertex that already shares the same color, an odd cycle is present, so return false. If all components are colored without conflicts, return true.",
      ],
      complexity: "O(n + m) time, O(n + m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool buildingTeams(int n, vector<vector<int>>& friendships) {
        vector<vector<int>> adj(n + 1);
        for (const auto& f : friendships) {
            adj[f[0]].push_back(f[1]);
            adj[f[1]].push_back(f[0]);
        }
        vector<int> color(n + 1, 0);
        vector<int> q;
        for (int i = 1; i <= n; i++) {
            if (color[i] != 0) continue;
            color[i] = 1;
            q.clear();
            q.push_back(i);
            size_t head = 0;
            while (head < q.size()) {
                int u = q[head++];
                for (int v : adj[u]) {
                    if (color[v] == 0) {
                        color[v] = 3 - color[u];
                        q.push_back(v);
                    } else if (color[v] == color[u]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
};
`,
    },
  },
  {
    id: "cses-round-trip",
    source: "cses",
    title: "Round Trip",
    url: "https://cses.fi/problemset/task/1669",
    statement: [
      "A country has n cities numbered 1 to n and m bidirectional roads connecting distinct pairs of cities.",
      "A round trip is a simple cycle of length at least 3: you start at some city, travel through two or more other cities, and return to the starting city without traversing any road more than once.",
      "Return true if there is at least one round trip (cycle) in the network, or false if the network is acyclic (a forest).",
    ],
    constraints: [
      "1 <= n <= 100000",
      "0 <= roads.length <= 200000",
      "Each road is [u, v] with 1 <= u, v <= n and u != v",
      "There is at most one road between any two cities",
    ],
    fn: {name: "roundTrip",params: [{name: "n",type: "int"},{name: "roads",type: "int[][]"}],returns: "bool"},
    examples: [
      { input: [5,[[1,2],[1,3],[1,4],[2,3],[5,4]]], output: true, explanation: "Cities 1, 2, and 3 form a triangle (cycle of length 3), which constitutes a valid round trip." },
      { input: [4,[[1,2],[2,3],[3,4]]], output: false, explanation: "The roads form a single simple path without cycles, so no round trip is possible." },
    ],
    tests: [
      { input: [3,[[1,2],[2,3],[3,1]]], output: true },
      { input: [3,[[1,2],[2,3]]], output: false },
      { input: [5,[[1,2],[2,3],[3,4],[4,5],[5,2]]], output: true },
      { input: [6,[[1,2],[1,3],[1,4],[4,5],[4,6]]], output: false },
      { input: [6,[[1,2],[3,4],[4,5],[5,3]]], output: true },
      { input: [4,[[1,2],[2,3],[3,4],[4,1]]], output: true },
      { input: [1,[]], output: false },
    ],
    hints: [
      "In a simple undirected graph without multi-edges or self-loops, any cycle must have length at least 3.",
      "You can detect cycles using Disjoint Set Union (DSU) or Depth-First Search (DFS).",
      "With DSU: iterate through each road [u, v]. If find(u) == find(v), adding this edge completes a cycle! Otherwise, unite the two components.",
    ],
    solution: {
      idea: [
        "In a simple undirected graph, a cycle exists if and only if an edge connects two vertices that are already in the same connected component.",
        "Process each road using Disjoint Set Union (DSU). For each road [u, v], check if find(u) == find(v). If so, a cycle of length >= 3 exists, so return true. Otherwise, union u and v.",
        "If all roads are processed without finding an edge between already-connected vertices, the graph is a forest, so return false.",
      ],
      complexity: "O(n + m * alpha(n)) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    struct DSU {
        vector<int> parent;
        DSU(int n) : parent(n + 1) {
            iota(parent.begin(), parent.end(), 0);
        }
        int find(int i) {
            if (parent[i] == i) return i;
            return parent[i] = find(parent[i]);
        }
        bool unite(int i, int j) {
            int rootI = find(i);
            int rootJ = find(j);
            if (rootI == rootJ) return false;
            parent[rootI] = rootJ;
            return true;
        }
    };
public:
    bool roundTrip(int n, vector<vector<int>>& roads) {
        DSU dsu(n);
        for (const auto& r : roads) {
            if (!dsu.unite(r[0], r[1])) return true;
        }
        return false;
    }
};
`,
    },
  },
  {
    id: "cses-monsters",
    source: "cses",
    title: "Monsters",
    url: "https://cses.fi/problemset/task/1194",
    statement: [
      "You are trapped in a labyrinth represented as an n x m grid of characters. Each cell is either a floor ('.'), a wall ('#'), your starting position ('A'), or a monster's start ('M'). There may be zero, one, or multiple monsters.",
      "At each step, you can move to an adjacent floor cell (up, down, left, right). Monsters move to adjacent floor cells at the same time.",
      "You escape successfully the moment you reach any boundary cell of the grid (row 0, row n - 1, column 0, or column m - 1). However, you cannot enter a cell at or after the time any monster can reach it.",
      "Return the minimum number of steps needed to reach the boundary and escape safely. If it is impossible to escape, return -1.",
    ],
    constraints: [
      "1 <= grid.length <= 1000",
      "1 <= grid[0].length <= 1000",
      "grid[i] contains only '.', '#', 'A', and 'M'",
      "There is exactly one 'A' and zero or more 'M' in the grid",
      "All rows in grid have the same length",
    ],
    fn: {name: "monsters",params: [{name: "grid",type: "string[]"}],returns: "int"},
    examples: [
      { input: [["########","#M..A..#","#.#.M#.#","#M#..#..","#.######"]], output: 5, explanation: "The player can move down and right towards the open boundary cell at row 3, column 7 without being intercepted by any monster." },
      { input: [["###","#A#","###"]], output: -1, explanation: "The player is completely enclosed by walls and cannot reach any boundary cell." },
    ],
    tests: [
      { input: [["A.",".."]], output: 0 },
      { input: [["A"]], output: 0 },
      { input: [["###","#A.","###"]], output: 1 },
      { input: [["#####","#M.A.","#####"]], output: 1 },
      { input: [["#####","#A.M.","#####"]], output: -1 },
      { input: [[".....",".M...","..A..",".....","....."]], output: 2 },
      { input: [["#####","#A#M#","#.#.#","..#.."]], output: 2 },
    ],
    hints: [
      "Monsters take optimal shortest paths. A monster's arrival time at any cell is the minimum BFS distance from all monsters.",
      "First, run a multi-source BFS starting with all monster positions at time 0 to compute mdist[r][c].",
      "Next, run BFS for the player starting at 'A' at time 0. The player can step into neighbor (nr, nc) at time t + 1 only if t + 1 < mdist[nr][nc].",
      "If 'A' is already on a boundary cell, 0 steps are needed. The first time player BFS reaches any boundary cell, return that step count.",
    ],
    solution: {
      idea: [
        "First, run a multi-source BFS initialized with all 'M' cells at distance 0 to compute mdist[r][c], the minimum time any monster can reach each cell.",
        "If 'A' starts on the boundary, return 0 immediately.",
        "Run a second BFS starting from 'A' at time 0. The player can advance to an adjacent floor cell (nr, nc) if pdist[u] + 1 < mdist[v].",
        "The first time the player reaches a cell on any of the four grid boundaries, return the distance. If the player queue empties, return -1.",
      ],
      complexity: "O(n * m) time, O(n * m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int monsters(vector<string>& grid) {
        int n = grid.size(), m = grid[0].size();
        int ar = -1, ac = -1;
        vector<int> mq;
        vector<int> mdist(n * m, 1e9);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 'M') {
                    mdist[i * m + j] = 0;
                    mq.push_back(i * m + j);
                } else if (grid[i][j] == 'A') {
                    ar = i; ac = j;
                }
            }
        }
        int dr[4] = {-1, 1, 0, 0};
        int dc[4] = {0, 0, -1, 1};
        size_t mhead = 0;
        while (mhead < mq.size()) {
            int u = mq[mhead++];
            int r = u / m, c = u % m;
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] != '#') {
                    int v = nr * m + nc;
                    if (mdist[v] > mdist[u] + 1) {
                        mdist[v] = mdist[u] + 1;
                        mq.push_back(v);
                    }
                }
            }
        }

        if (ar == 0 || ar == n - 1 || ac == 0 || ac == m - 1) return 0;

        vector<int> pdist(n * m, -1);
        vector<int> pq;
        pdist[ar * m + ac] = 0;
        pq.push_back(ar * m + ac);
        size_t phead = 0;
        while (phead < pq.size()) {
            int u = pq[phead++];
            int r = u / m, c = u % m;
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr][nc] != '#') {
                    int v = nr * m + nc;
                    if (pdist[v] == -1 && pdist[u] + 1 < mdist[v]) {
                        pdist[v] = pdist[u] + 1;
                        if (nr == 0 || nr == n - 1 || nc == 0 || nc == m - 1) {
                            return pdist[v];
                        }
                        pq.push_back(v);
                    }
                }
            }
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "cses-shortest-routes-i",
    source: "cses",
    title: "Shortest Routes I",
    url: "https://cses.fi/problemset/task/1671",
    statement: [
      "There are n cities numbered 1 to n and m directed flight connections.",
      "Each flight is given as [a, b, c], meaning a directed flight from city a to city b with length (cost) c.",
      "Find the shortest route distance from city 1 to every city 1, 2, ..., n.",
      "Return an array of n integers (64-bit), where the i-th element (0-indexed) is the shortest distance from city 1 to city i + 1.",
    ],
    constraints: [
      "1 <= n <= 100000",
      "1 <= flights.length <= 200000",
      "Each flight is [a, b, c] with 1 <= a, b <= n and 1 <= c <= 1000000000",
      "City 1 can reach all cities (or distance is -1 if unreachable)",
    ],
    fn: {name: "shortestRoutesI",params: [{name: "n",type: "int"},{name: "flights",type: "int[][]"}],returns: "long[]"},
    examples: [
      { input: [3,[[1,2,6],[1,3,2],[3,2,3],[1,3,4]]], output: [0,5,2], explanation: "Shortest path to city 1 is 0; to city 2 is 1 -> 3 -> 2 with cost 2 + 3 = 5; to city 3 is 2." },
      { input: [4,[[1,2,3],[2,3,4],[3,4,1]]], output: [0,3,7,8], explanation: "A simple line network giving distances 0, 3, 7, and 8 for cities 1 through 4." },
    ],
    tests: [
      { input: [1,[]], output: [0] },
      { input: [2,[[1,2,1000000000]]], output: [0,1000000000] },
      { input: [4,[[1,2,5],[2,4,10],[1,3,2],[3,4,1]]], output: [0,5,2,3] },
      { input: [3,[[1,2,10],[1,2,4],[2,3,3]]], output: [0,4,7] },
      { input: [5,[[1,2,2],[1,3,4],[2,4,7],[3,4,1],[4,5,3]]], output: [0,2,4,5,8] },
      { input: [4,[[1,2,1],[2,3,2]]], output: [0,1,3,-1] },
      { input: [3,[[1,2,3],[2,1,3],[2,3,4],[3,2,1]]], output: [0,3,7] },
    ],
    hints: [
      "All edge costs are positive, so Dijkstra's algorithm is optimal.",
      "Use a min-priority queue storing pairs of (distance, city).",
      "Flight costs can sum up to 2 * 10^14, which exceeds 32 bits: use 64-bit integers (long long) for distance calculations.",
    ],
    solution: {
      idea: [
        "Use Dijkstra's algorithm with a min-priority queue to find single-source shortest paths from city 1.",
        "Maintain distances in a 64-bit vector initialized to infinity, with dist[1] = 0.",
        "Pop the closest vertex. For each outgoing edge u -> v with weight w, relax dist[v] and push the new distance into the priority queue.",
        "Collect the shortest distance for all cities 1 through n (returning -1 for any unreachable city).",
      ],
      complexity: "O((n + m) * log n) time, O(n + m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> shortestRoutesI(int n, vector<vector<int>>& flights) {
        vector<vector<pair<int, int>>> adj(n + 1);
        for (const auto& f : flights) {
            adj[f[0]].push_back({f[1], f[2]});
        }
        const long long INF = 4e18;
        vector<long long> dist(n + 1, INF);
        priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
        dist[1] = 0;
        pq.push({0, 1});
        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();
            if (d > dist[u]) continue;
            for (const auto& [v, w] : adj[u]) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.push({dist[v], v});
                }
            }
        }
        vector<long long> out(n);
        for (int i = 1; i <= n; i++) {
            out[i - 1] = (dist[i] == INF ? -1LL : dist[i]);
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "cses-cycle-finding",
    source: "cses",
    title: "Cycle Finding",
    url: "https://cses.fi/problemset/task/1197",
    statement: [
      "You are given a directed graph with n vertices numbered 1 to n and m edges.",
      "Each edge is given as [a, b, c], meaning a directed edge from vertex a to vertex b with integer weight c (which can be negative).",
      "Determine whether the graph contains any negative weight cycle (a directed cycle whose total edge weight is strictly less than 0). Return true if a negative cycle exists, or false otherwise.",
    ],
    constraints: [
      "1 <= n <= 2500",
      "1 <= edges.length <= 5000",
      "Each edge is [a, b, c] with 1 <= a, b <= n and -1000000000 <= c <= 1000000000",
    ],
    fn: {name: "cycleFinding",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"}],returns: "bool"},
    examples: [
      { input: [4,[[1,2,1],[2,3,2],[3,1,-4],[3,4,1]]], output: true, explanation: "The cycle 1 -> 2 -> 3 -> 1 has total weight 1 + 2 - 4 = -1 < 0, which is a negative weight cycle." },
      { input: [4,[[1,2,1],[2,3,2],[3,1,1],[3,4,1]]], output: false, explanation: "The cycle 1 -> 2 -> 3 -> 1 has total weight 1 + 2 + 1 = 4 > 0, so no negative cycle exists." },
    ],
    tests: [
      { input: [2,[[1,2,3],[2,1,-4]]], output: true },
      { input: [2,[[1,2,3],[2,1,-2]]], output: false },
      { input: [3,[[1,2,-5],[2,3,10],[3,1,2]]], output: false },
      { input: [4,[[1,2,5],[3,4,2],[4,3,-3]]], output: true },
      { input: [5,[[1,1,-1],[1,2,2],[2,3,3]]], output: true },
      { input: [3,[[1,2,1],[2,3,2],[3,1,-3]]], output: false },
      { input: [5,[[1,2,-10],[2,3,-20],[3,4,-30],[4,5,-40]]], output: false },
    ],
    hints: [
      "The Bellman-Ford algorithm detects negative cycles in directed graphs.",
      "The graph may be disconnected, so initialize all vertex distances to 0 (equivalent to adding an imaginary source node connected to all vertices with weight 0).",
      "Perform n iterations of edge relaxation. If any distance is still reduced on the n-th pass, a negative cycle must exist.",
    ],
    solution: {
      idea: [
        "Detect negative weight cycles using the Bellman-Ford algorithm.",
        "Initialize dist[i] = 0 for all i from 1 to n to check all components simultaneously.",
        "Relax all edges up to n times. In a graph with n vertices, any simple path has at most n - 1 edges.",
        "If any distance is successfully relaxed on the n-th pass, the graph must contain a negative weight cycle.",
      ],
      complexity: "O(n * m) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool cycleFinding(int n, vector<vector<int>>& edges) {
        vector<long long> dist(n + 1, 0);
        bool any = false;
        for (int iter = 1; iter <= n; iter++) {
            any = false;
            for (const auto& e : edges) {
                int u = e[0], v = e[1];
                long long w = e[2];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    any = true;
                }
            }
            if (!any) break;
        }
        return any;
    }
};
`,
    },
  },
  {
    id: "cses-course-schedule",
    source: "cses",
    title: "Course Schedule",
    url: "https://cses.fi/problemset/task/1679",
    statement: [
      "There are n courses numbered 1 to n and m prerequisite requirements.",
      "Each requirement is given as [a, b], meaning course a must be completed before course b can be taken.",
      "Determine whether it is possible to find an order to complete all n courses without circular dependencies (i.e. whether the prerequisite graph is a directed acyclic graph). Return true if possible, or false if circular dependencies make it impossible.",
    ],
    constraints: [
      "1 <= n <= 100000",
      "0 <= requirements.length <= 200000",
      "Each requirement is [a, b] with 1 <= a, b <= n and a != b",
    ],
    fn: {name: "courseSchedule",params: [{name: "n",type: "int"},{name: "requirements",type: "int[][]"}],returns: "bool"},
    examples: [
      { input: [3,[[1,2],[2,3]]], output: true, explanation: "The courses can be completed in order 1 -> 2 -> 3." },
      { input: [3,[[1,2],[2,3],[3,1]]], output: false, explanation: "The courses form a circular dependency 1 -> 2 -> 3 -> 1, so none of them can be started." },
    ],
    tests: [
      { input: [1,[]], output: true },
      { input: [2,[[1,2],[2,1]]], output: false },
      { input: [4,[[1,2],[1,3],[2,4],[3,4]]], output: true },
      { input: [4,[[1,2],[2,3],[3,2],[3,4]]], output: false },
      { input: [5,[[1,2],[3,4]]], output: true },
      { input: [5,[[1,2],[3,4],[4,5],[5,3]]], output: false },
      { input: [6,[[1,3],[2,3],[3,4],[2,5],[4,6],[5,6]]], output: true },
    ],
    hints: [
      "This is topological sorting on a directed graph.",
      "Compute the in-degree of each course. Courses with in-degree 0 can be taken immediately.",
      "Use Kahn's algorithm: maintain a queue of courses with in-degree 0. As courses are removed from the queue, decrement the in-degree of dependent courses. If all n courses are processed, return true; otherwise, a cycle exists.",
    ],
    solution: {
      idea: [
        "Apply Kahn's algorithm for topological sorting.",
        "Calculate the in-degree of all courses. Enqueue every course with in-degree 0.",
        "Repeatedly dequeue a course and decrement the in-degrees of its outgoing neighbors. Whenever a neighbor's in-degree drops to 0, enqueue it.",
        "If the total number of courses dequeued equals n, all courses can be completed without circular dependencies. Otherwise, a cycle is present.",
      ],
      complexity: "O(n + m) time, O(n + m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool courseSchedule(int n, vector<vector<int>>& requirements) {
        vector<vector<int>> adj(n + 1);
        vector<int> indeg(n + 1, 0);
        for (const auto& r : requirements) {
            adj[r[0]].push_back(r[1]);
            indeg[r[1]]++;
        }
        vector<int> q;
        q.reserve(n);
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.push_back(i);
        }
        size_t head = 0;
        while (head < q.size()) {
            int u = q[head++];
            for (int v : adj[u]) {
                if (--indeg[v] == 0) {
                    q.push_back(v);
                }
            }
        }
        return (int)q.size() == n;
    }
};
`,
    },
  },
  {
    id: "cses-longest-flight-route",
    source: "cses",
    title: "Longest Flight Route",
    url: "https://cses.fi/problemset/task/1680",
    statement: [
      "A country has n cities numbered 1 to n and m directed flight connections. The flight network is a directed acyclic graph (DAG).",
      "You want to travel from city 1 to city n visiting as many cities as possible.",
      "Return the maximum number of cities on a directed path from city 1 to city n (including both 1 and n). If city n cannot be reached from city 1, return -1.",
    ],
    constraints: [
      "2 <= n <= 100000",
      "1 <= flights.length <= 200000",
      "Each flight is [a, b] with 1 <= a, b <= n and a != b",
      "The flight network is guaranteed to be a directed acyclic graph (DAG)",
    ],
    fn: {name: "longestFlightRoute",params: [{name: "n",type: "int"},{name: "flights",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [5,[[1,2],[2,3],[3,5],[1,4],[4,5],[1,5]]], output: 4, explanation: "The longest route from 1 to 5 is 1 -> 2 -> 3 -> 5, visiting 4 cities." },
      { input: [4,[[1,2],[3,4]]], output: -1, explanation: "City 4 cannot be reached from city 1, so the route does not exist." },
    ],
    tests: [
      { input: [2,[[1,2]]], output: 2 },
      { input: [3,[[1,2],[2,3],[1,3]]], output: 3 },
      { input: [4,[[1,2],[2,3],[3,4],[1,4]]], output: 4 },
      { input: [5,[[1,2],[2,4],[3,5],[4,5]]], output: 4 },
      { input: [5,[[2,3],[3,4],[4,5]]], output: -1 },
      { input: [6,[[1,2],[1,3],[2,4],[3,4],[4,5],[4,6],[5,6]]], output: 5 },
      { input: [4,[[1,2],[2,3]]], output: -1 },
    ],
    hints: [
      "While longest paths are NP-hard in general graphs, the longest path in a DAG can be computed in linear time using dynamic programming.",
      "Obtain a topological ordering of the vertices using Kahn's algorithm or DFS.",
      "Let dp[u] be the maximum number of cities on a path from city 1 to city u. Set dp[1] = 1 and dp[u] = -1 for all u != 1. Iterate through vertices in topological order and relax outgoing edges.",
    ],
    solution: {
      idea: [
        "Find the longest path on a DAG using topological sorting and dynamic programming.",
        "Obtain a topological order using Kahn's algorithm with in-degrees.",
        "Initialize dp array with dp[1] = 1 (1 city on the path) and all other dp[i] = -1. For each vertex u in topological order, if dp[u] != -1, update dp[v] = max(dp[v], dp[u] + 1) for every edge u -> v.",
        "Return dp[n], which is -1 if city n is unreachable.",
      ],
      complexity: "O(n + m) time, O(n + m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int longestFlightRoute(int n, vector<vector<int>>& flights) {
        vector<vector<int>> adj(n + 1);
        vector<int> indeg(n + 1, 0);
        for (const auto& f : flights) {
            adj[f[0]].push_back(f[1]);
            indeg[f[1]]++;
        }
        vector<int> q;
        q.reserve(n);
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.push_back(i);
        }
        vector<int> topo;
        topo.reserve(n);
        size_t head = 0;
        while (head < q.size()) {
            int u = q[head++];
            topo.push_back(u);
            for (int v : adj[u]) {
                if (--indeg[v] == 0) q.push_back(v);
            }
        }
        vector<int> dp(n + 1, -1);
        dp[1] = 1;
        for (int u : topo) {
            if (dp[u] == -1) continue;
            for (int v : adj[u]) {
                if (dp[u] + 1 > dp[v]) {
                    dp[v] = dp[u] + 1;
                }
            }
        }
        return dp[n];
    }
};
`,
    },
  },
  {
    id: "cses-game-routes",
    source: "cses",
    title: "Game Routes",
    url: "https://cses.fi/problemset/task/1681",
    statement: [
      "A game has n levels numbered 1 to n and m one-way teleporters between levels. The teleporter network is a directed acyclic graph (DAG).",
      "You want to know how many different paths exist to play the game from level 1 to level n.",
      "Return the total number of paths from level 1 to level n modulo 1000000007 (10^9 + 7).",
    ],
    constraints: [
      "1 <= n <= 100000",
      "0 <= teleporters.length <= 200000",
      "Each teleporter is [a, b] with 1 <= a, b <= n and a != b",
      "The game network is a directed acyclic graph (DAG)",
    ],
    fn: {name: "gameRoutes",params: [{name: "n",type: "int"},{name: "teleporters",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [4,[[1,2],[1,3],[2,3],[2,4],[3,4]]], output: 3, explanation: "There are 3 valid paths from 1 to 4: 1 -> 2 -> 4, 1 -> 2 -> 3 -> 4, and 1 -> 3 -> 4." },
      { input: [4,[[1,2],[3,4]]], output: 0, explanation: "Level 4 cannot be reached from level 1, so there are 0 paths." },
    ],
    tests: [
      { input: [1,[]], output: 1 },
      { input: [2,[[1,2]]], output: 1 },
      { input: [3,[[1,2],[2,3],[1,3]]], output: 2 },
      { input: [4,[[1,2],[1,3],[2,4],[3,4]]], output: 2 },
      { input: [5,[[1,2],[1,3],[2,4],[3,4],[4,5]]], output: 2 },
      { input: [5,[[1,2],[1,3],[2,4],[3,4],[2,5],[3,5],[4,5]]], output: 4 },
      { input: [6,[[1,2],[2,3],[3,4],[4,5],[5,6]]], output: 1 },
    ],
    hints: [
      "Since the network has no cycles (DAG), path counts can be accumulated in topological order.",
      "Let ways[u] be the number of paths from level 1 to level u modulo 10^9 + 7. Set ways[1] = 1 and all other ways[i] = 0.",
      "Iterate in topological order: for each outgoing edge u -> v, add ways[u] to ways[v] modulo 10^9 + 7.",
    ],
    solution: {
      idea: [
        "Path counting on a DAG using topological sorting and dynamic programming.",
        "Compute in-degrees and process levels in topological order using Kahn's algorithm.",
        "Initialize ways[1] = 1 and ways[i] = 0 for i > 1. When visiting level u, add ways[u] modulo (10^9 + 7) into ways[v] for every teleporter u -> v.",
        "Return ways[n].",
      ],
      complexity: "O(n + m) time, O(n + m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int gameRoutes(int n, vector<vector<int>>& teleporters) {
        const int MOD = 1000000007;
        vector<vector<int>> adj(n + 1);
        vector<int> indeg(n + 1, 0);
        for (const auto& t : teleporters) {
            adj[t[0]].push_back(t[1]);
            indeg[t[1]]++;
        }
        vector<int> q;
        q.reserve(n);
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.push_back(i);
        }
        vector<int> ways(n + 1, 0);
        ways[1] = 1;
        size_t head = 0;
        while (head < q.size()) {
            int u = q[head++];
            for (int v : adj[u]) {
                ways[v] = (ways[v] + ways[u]) % MOD;
                if (--indeg[v] == 0) q.push_back(v);
            }
        }
        return ways[n];
    }
};
`,
    },
  },
  {
    id: "cses-flight-discount",
    source: "cses",
    title: "Flight Discount",
    url: "https://cses.fi/problemset/task/1195",
    statement: [
      "You want to travel by air from city 1 to city n. There are m directed flights available between cities.",
      "Each flight is represented as [a, b, c], meaning a directed flight from city a to city b with price c.",
      "You have a special discount coupon that allows you to halve the price of exactly one flight along your route: a flight with price c costs floor(c / 2).",
      "Return the minimum total price to travel from city 1 to city n using the discount coupon on at most one flight.",
    ],
    constraints: [
      "2 <= n <= 100000",
      "1 <= flights.length <= 200000",
      "Each flight is [a, b, c] with 1 <= a, b <= n and 1 <= c <= 1000000000",
      "There is at least one path from city 1 to city n",
    ],
    fn: {name: "flightDiscount",params: [{name: "n",type: "int"},{name: "flights",type: "int[][]"}],returns: "long"},
    examples: [
      { input: [3,[[1,2,3],[2,3,5]]], output: 5, explanation: "Halving the second flight (price 5 -> 2) gives a total cost of 3 + 2 = 5." },
      { input: [4,[[1,2,100],[2,4,100],[1,3,10],[3,4,200]]], output: 110, explanation: "Route 1 -> 3 -> 4 with flight 3 -> 4 halved costs 10 + 100 = 110." },
    ],
    tests: [
      { input: [2,[[1,2,7]]], output: 3 },
      { input: [2,[[1,2,1]]], output: 0 },
      { input: [3,[[1,2,10],[2,3,20],[1,3,25]]], output: 12 },
      { input: [4,[[1,2,1000000000],[2,4,1000000000],[1,3,2],[3,4,2]]], output: 3 },
      { input: [4,[[1,2,1000000000],[2,3,1000000000],[3,4,1000000000]]], output: 2500000000 },
      { input: [4,[[1,2,5],[2,1,5],[2,3,10],[3,4,8],[1,4,30]]], output: 15 },
      { input: [5,[[1,2,4],[2,3,8],[3,4,16],[4,5,32]]], output: 44 },
    ],
    hints: [
      "Model this as a shortest path problem on an expanded graph with states (city, discount_used), where discount_used is 0 or 1.",
      "From state (u, 0) through an edge (u, v, c), you can either transition to (v, 0) at cost c (saving the discount), or to (v, 1) at cost floor(c / 2).",
      "From state (u, 1), the discount has already been used, so you can only transition to (v, 1) at cost c.",
      "Run Dijkstra's algorithm over the 2n states. The answer is dist[n][1].",
    ],
    solution: {
      idea: [
        "Use Dijkstra's algorithm on an expanded state graph where each city has two states: (u, 0) representing coupon not yet used, and (u, 1) representing coupon used.",
        "From (u, 0), traversing an edge (u, v, c) offers two transitions: to (v, 0) with cost +c, or to (v, 1) with discounted cost +floor(c / 2).",
        "From (u, 1), traversing an edge (u, v, c) transitions only to (v, 1) with cost +c.",
        "A min-priority queue over tuples (cost, city, used) computes the minimum cost to reach (n, 1).",
      ],
      complexity: "O((n + m) * log n) time, O(n + m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long flightDiscount(int n, vector<vector<int>>& flights) {
        vector<vector<pair<int, int>>> adj(n + 1);
        for (const auto& f : flights) {
            adj[f[0]].push_back({f[1], f[2]});
        }
        const long long INF = 4e18;
        vector<vector<long long>> dist(n + 1, vector<long long>(2, INF));
        using State = tuple<long long, int, int>;
        priority_queue<State, vector<State>, greater<State>> pq;
        dist[1][0] = 0;
        pq.push({0, 1, 0});
        while (!pq.empty()) {
            auto [d, u, used] = pq.top();
            pq.pop();
            if (d > dist[u][used]) continue;
            for (const auto& [v, c] : adj[u]) {
                if (used == 0) {
                    if (dist[u][0] + c < dist[v][0]) {
                        dist[v][0] = dist[u][0] + c;
                        pq.push({dist[v][0], v, 0});
                    }
                    long long discounted = c / 2;
                    if (dist[u][0] + discounted < dist[v][1]) {
                        dist[v][1] = dist[u][0] + discounted;
                        pq.push({dist[v][1], v, 1});
                    }
                } else {
                    if (dist[u][1] + c < dist[v][1]) {
                        dist[v][1] = dist[u][1] + c;
                        pq.push({dist[v][1], v, 1});
                    }
                }
            }
        }
        return dist[n][1];
    }
};
`,
    },
  },
];
