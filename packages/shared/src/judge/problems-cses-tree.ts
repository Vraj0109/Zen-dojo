import type { ProblemSpec } from "./types";

// CSES tree algorithms (the part of the Tree Algorithms section not in problems-cses-misc.ts: Subordinates and Tree Diameter live there).
// Statements, hints and solutions are written for this app; the original tasks are linked. Trees are given as an edge list
// (int[][], 1-based) or, for the company tasks, as a boss array; queries are int[][]. Expected outputs come from the C++ reference.

export const CSES_TREE_SPECS: ProblemSpec[] = [
  {
    id: "cses-tree-matching",
    source: "cses",
    title: "Tree Matching",
    url: "https://cses.fi/problemset/task/1130",
    statement: [
      "You are given a tree with n nodes numbered 1 to n, described by n - 1 undirected edges.",
      "A matching is a set of edges in which no node appears in more than one chosen edge.",
      "Return the largest possible number of edges in a matching.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "edges.length == n - 1",
      "Each edge is [u, v] with 1 <= u, v <= n and u != v",
      "The edges form a tree",
    ],
    fn: {name: "treeMatching",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [5,[[1,2],[1,3],[3,4],[3,5]]], output: 2, explanation: "Match 1-2 and 3-4 (or 3-5); no three edges are pairwise disjoint." },
      { input: [4,[[1,2],[2,3],[3,4]]], output: 2, explanation: "Edges 1-2 and 3-4 do not share a node, so two edges fit." },
    ],
    tests: [
      { input: [1,[]], output: 0 },
      { input: [2,[[1,2]]], output: 1 },
      { input: [5,[[1,2],[1,3],[1,4],[1,5]]], output: 1 },
      { input: [6,[[5,6],[4,6],[2,4],[3,2],[3,1]]], output: 3 },
      { input: [7,[[6,1],[1,3],[7,1],[1,2],[1,5],[4,1]]], output: 1 },
      { input: [9,[[2,9],[7,5],[6,1],[4,6],[4,3],[8,1],[7,2],[1,7]]], output: 4 },
      { input: [11,[[2,3],[11,10],[8,11],[9,5],[11,4],[8,9],[7,3],[7,1],[6,1],[7,8]]], output: 5 },
      { input: [10,[[10,2],[7,5],[1,4],[9,6],[3,4],[6,5],[8,10],[6,10],[5,4]]], output: 4 },
      { input: [11,[[6,3],[11,6],[11,7],[4,7],[11,1],[5,6],[1,2],[2,10],[7,9],[2,8]]], output: 4 },
      { input: [8,[[2,5],[1,2],[5,4],[7,4],[6,5],[2,8],[6,3]]], output: 3 },
    ],
    hints: [
      "A leaf can only be matched with its parent. Taking that edge never hurts: any matching that leaves the leaf unmatched can swap its edge for the leaf edge.",
      "Root the tree and process nodes from the deepest ones up. If a node and its parent are both still free, match them.",
      "Use a BFS order from node 1 (to avoid deep recursion on long paths) and walk it backwards, counting every match you make.",
    ],
    solution: {
      idea: [
        "Root the tree at node 1 and get a BFS order together with each node's parent.",
        "Walk the order in reverse, so every node is seen after all of its descendants. If the node is unmatched, has a parent, and the parent is unmatched, match the two and add one to the answer.",
        "This is optimal by the leaf exchange argument: the deepest unmatched node can only use its parent edge, and using it is never worse.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int treeMatching(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), order;
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                order.push_back(v);
            }
        }
        vector<char> used(n + 1, 0);
        int ans = 0;
        for (int i = n - 1; i >= 1; i--) {
            int v = order[i];
            if (!used[v] && !used[par[v]]) {
                used[v] = used[par[v]] = 1;
                ans++;
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-tree-distances-i",
    source: "cses",
    title: "Tree Distances I",
    url: "https://cses.fi/problemset/task/1132",
    statement: [
      "You are given a tree with n nodes numbered 1 to n, described by n - 1 undirected edges.",
      "For every node, find the largest distance (number of edges on the path) from it to any other node of the tree.",
      "Return an array of length n whose i-th element (0-based) is that value for node i + 1.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "edges.length == n - 1",
      "Each edge is [u, v] with 1 <= u, v <= n and u != v",
      "The edges form a tree",
    ],
    fn: {name: "treeDistancesI",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [5,[[1,2],[1,3],[3,4],[3,5]]], output: [2,3,2,3,3], explanation: "Node 1 reaches node 4 in 2 steps; node 2 reaches node 4 in 3 steps; the others as shown." },
      { input: [3,[[1,2],[2,3]]], output: [2,1,2], explanation: "On a path of three nodes the ends are 2 away from each other and the middle is 1 away from both." },
    ],
    tests: [
      { input: [1,[]], output: [0] },
      { input: [2,[[1,2]]], output: [1,1] },
      { input: [6,[[4,6],[5,1],[4,3],[2,5],[3,2]]], output: [5,3,3,4,4,5] },
      { input: [7,[[6,1],[1,4],[1,7],[1,2],[1,3],[5,1]]], output: [1,2,2,2,2,2,2] },
      { input: [9,[[6,2],[5,8],[5,3],[3,1],[7,1],[6,9],[4,1],[2,5]]], output: [5,4,4,6,3,5,6,4,6] },
      { input: [12,[[7,4],[8,5],[9,1],[5,10],[6,12],[12,4],[11,8],[4,5],[3,2],[1,5],[2,5]]], output: [4,4,5,3,3,5,4,4,5,4,5,4] },
      { input: [10,[[7,2],[7,9],[10,3],[1,9],[7,8],[4,9],[10,2],[5,10],[2,6]]], output: [5,3,5,5,5,4,3,4,4,4] },
      { input: [11,[[7,8],[2,10],[5,11],[5,1],[4,11],[2,1],[6,2],[3,8],[9,11],[5,8]]], output: [3,4,5,5,3,5,5,4,5,5,4] },
      { input: [9,[[6,9],[5,8],[2,8],[1,2],[9,4],[5,7],[4,5],[1,3]]], output: [6,5,7,5,4,7,5,4,6] },
    ],
    hints: [
      "For any node, the farthest node is one of the two endpoints of a diameter of the tree. This is the key fact.",
      "Find a diameter with the usual double BFS: from node 1 reach the farthest node a, then from a reach the farthest node b.",
      "Run BFS from a and from b. The answer for node v is the larger of its two distances.",
    ],
    solution: {
      idea: [
        "Any node's farthest node can be chosen among the two endpoints a and b of a diameter. So only two distance arrays are needed.",
        "BFS from node 1 gives the farthest node a. BFS from a gives distances da and the farthest node b. BFS from b gives db.",
        "The answer for v is max(da[v], db[v]).",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    static vector<int> dist(int n, const vector<vector<int>>& adj, int s) {
        vector<int> d(n + 1, -1), q;
        d[s] = 0;
        q.push_back(s);
        for (size_t h = 0; h < q.size(); h++) {
            int u = q[h];
            for (int v : adj[u]) if (d[v] < 0) { d[v] = d[u] + 1; q.push_back(v); }
        }
        return d;
    }
public:
    vector<int> treeDistancesI(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        auto d1 = dist(n, adj, 1);
        int a = 1;
        for (int v = 1; v <= n; v++) if (d1[v] > d1[a]) a = v;
        auto da = dist(n, adj, a);
        int b = a;
        for (int v = 1; v <= n; v++) if (da[v] > da[b]) b = v;
        auto db = dist(n, adj, b);
        vector<int> ans(n);
        for (int v = 1; v <= n; v++) ans[v - 1] = max(da[v], db[v]);
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-tree-distances-ii",
    source: "cses",
    title: "Tree Distances II",
    url: "https://cses.fi/problemset/task/1133",
    statement: [
      "You are given a tree with n nodes numbered 1 to n, described by n - 1 undirected edges.",
      "For every node, compute the sum of the distances (in edges) from it to all the other nodes.",
      "Return an array of length n whose i-th element (0-based) is that sum for node i + 1. The sums can exceed 32 bits.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "edges.length == n - 1",
      "Each edge is [u, v] with 1 <= u, v <= n and u != v",
      "The edges form a tree",
    ],
    fn: {name: "treeDistancesII",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"}],returns: "long[]"},
    examples: [
      { input: [5,[[1,2],[1,3],[3,4],[3,5]]], output: [6,9,5,8,8], explanation: "Node 1 has distances 1, 1, 2, 2 to the others, so its sum is 6." },
      { input: [3,[[1,2],[2,3]]], output: [3,2,3], explanation: "End nodes: 1 + 2 = 3. Middle node: 1 + 1 = 2." },
    ],
    tests: [
      { input: [1,[]], output: [0] },
      { input: [2,[[1,2]]], output: [1,1] },
      { input: [6,[[3,6],[2,5],[4,6],[1,5],[2,3]]], output: [15,9,9,15,11,11] },
      { input: [7,[[1,6],[1,7],[1,5],[3,1],[4,1],[2,1]]], output: [6,11,11,11,11,11,11] },
      { input: [9,[[1,5],[2,6],[9,3],[1,7],[1,8],[5,6],[4,8],[8,3]]], output: [15,30,21,23,18,23,22,16,28] },
      { input: [12,[[2,1],[7,10],[5,4],[3,6],[4,12],[1,9],[1,7],[2,4],[4,8],[6,1],[2,11]]], output: [21,21,39,25,35,29,29,35,31,39,31,35] },
      { input: [10,[[9,7],[8,6],[10,7],[7,6],[9,2],[1,2],[4,9],[3,6],[5,2]]], output: [29,21,29,25,29,21,17,29,17,25] },
      { input: [11,[[3,6],[3,5],[1,6],[7,3],[4,9],[6,9],[2,8],[8,10],[11,9],[8,1]]], output: [22,36,24,33,33,19,33,27,24,36,33] },
      { input: [9,[[6,1],[2,3],[1,5],[4,8],[5,4],[4,2],[3,7],[9,8]]], output: [23,18,23,15,18,30,30,20,27] },
    ],
    hints: [
      "First solve it for the root only: the sum of the depths of all nodes.",
      "When you move the root from a node p to its child c, the nodes in c's subtree get one step closer and all the others get one step farther.",
      "So ans[c] = ans[p] - size[c] + (n - size[c]). Compute subtree sizes bottom-up, then fill the answers top-down. Use 64-bit integers.",
    ],
    solution: {
      idea: [
        "Get a BFS order from node 1. Walk it backwards to compute size[v] and the sum of depths for the root, ans[1] = sum of depth[v].",
        "Walk the order forwards: for each node c with parent p, ans[c] = ans[p] + n - 2 * size[c].",
        "The values reach about n^2 / 2, so they need long long.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> treeDistancesII(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), dep(n + 1, 0), order;
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                dep[v] = dep[u] + 1;
                order.push_back(v);
            }
        }
        vector<long long> sz(n + 1, 1), ans(n + 1, 0);
        for (int i = n - 1; i >= 1; i--) sz[par[order[i]]] += sz[order[i]];
        for (int v = 1; v <= n; v++) ans[1] += dep[v];
        for (int i = 1; i < n; i++) {
            int c = order[i];
            ans[c] = ans[par[c]] + n - 2 * sz[c];
        }
        return vector<long long>(ans.begin() + 1, ans.end());
    }
};
`,
    },
  },
  {
    id: "cses-company-queries-i",
    source: "cses",
    title: "Company Queries I",
    url: "https://cses.fi/problemset/task/1687",
    statement: [
      "A company has n employees numbered 1 to n, and employee 1 is the general director.",
      "The array bosses has length n - 1, and bosses[i] is the direct boss of employee i + 2. Following bosses upward always ends at employee 1.",
      "Each query is [x, k]: start at employee x and move to the boss k times. Return the employee you reach, or -1 if you run out of bosses before k steps.",
      "Return one answer per query, in order.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "bosses.length == n - 1",
      "1 <= bosses[i] <= n, and the bosses form a tree rooted at 1",
      "1 <= queries.length <= 200000",
      "Each query is [x, k] with 1 <= x <= n and 1 <= k <= n",
    ],
    fn: {name: "companyQueriesI",params: [{name: "n",type: "int"},{name: "bosses",type: "int[]"},{name: "queries",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [5,[1,1,2,3],[[4,1],[4,2],[4,3],[5,1],[1,1]]], output: [2,1,-1,3,-1], explanation: "Employee 4 reports to 2, who reports to 1. Asking for the 3rd boss of 4 or the 1st boss of 1 finds nobody: -1." },
      { input: [4,[1,2,3],[[4,3],[4,4],[2,1]]], output: [1,-1,1], explanation: "Chain 1 -> 2 -> 3 -> 4. The 3rd boss of 4 is 1; there is no 4th boss." },
    ],
    tests: [
      { input: [1,[],[[1,1]]], output: [-1] },
      { input: [2,[1],[[2,1],[2,2],[1,1]]], output: [1,-1,-1] },
      { input: [6,[6,4,2,3,1],[[5,2],[4,5],[6,2],[1,2],[3,3],[5,2]]], output: [4,-1,-1,-1,6,4] },
      { input: [8,[4,7,7,7,1,1,1],[[7,4],[7,2],[4,3],[7,6],[3,5],[6,5],[1,3],[4,2]]], output: [-1,-1,-1,-1,-1,-1,-1,1] },
      { input: [9,[3,8,2,6,1,5,9,1],[[8,3],[4,3],[1,5],[7,4],[2,6],[6,4],[3,4],[5,1],[7,1]]], output: [-1,8,-1,-1,-1,-1,-1,6,5] },
      { input: [10,[9,8,1,4,9,8,4,1,5],[[3,5],[7,2],[5,4],[9,2],[6,2],[7,4],[6,6],[6,3],[8,3],[10,3]]], output: [-1,4,-1,-1,1,-1,-1,-1,-1,1] },
      { input: [12,[8,4,8,7,10,4,10,4,1,8,7],[[12,4],[3,1],[8,5],[9,1],[8,3],[11,5],[7,3],[7,4],[12,1],[4,4],[1,3],[2,1]]], output: [10,4,-1,4,-1,-1,10,1,7,-1,-1,8] },
      { input: [7,[1,1,1,1,1,1],[[2,6],[2,4],[2,3],[6,1],[4,1],[2,5]]], output: [-1,-1,-1,1,1,-1] },
    ],
    hints: [
      "Walking up k steps one at a time is O(n) per query and too slow for 200000 queries.",
      "Precompute up[j][v], the 2^j-th boss of v (0 meaning none). Each row comes from the previous one: up[j][v] = up[j-1][up[j-1][v]].",
      "To answer a query, split k into binary digits and jump by 2^j for each set bit. If you reach 0 (no boss), the answer is -1. The bosses need not have smaller numbers than their reports, so build the table one level j at a time.",
    ],
    solution: {
      idea: [
        "Build a children list and BFS from employee 1 so that parents are known; set the parent of 1 to 0, a sentinel that is its own parent.",
        "Fill the binary lifting table up[j][v] for j = 0 .. LOG - 1.",
        "For each query, apply the jumps for the set bits of k. If k is larger than the depth, a jump lands on the sentinel 0 and the answer is -1.",
      ],
      complexity: "O((n + q) log n) time, O(n log n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> companyQueriesI(int n, vector<int>& bosses, vector<vector<int>>& queries) {
        vector<int> par(n + 1, 0);
        for (int i = 0; i + 1 < n; i++) par[i + 2] = bosses[i];
        int LOG = 1;
        while ((1 << LOG) <= n) LOG++;
        vector<vector<int>> up(LOG, vector<int>(n + 1, 0));
        for (int v = 1; v <= n; v++) up[0][v] = par[v];
        for (int j = 1; j < LOG; j++)
            for (int v = 1; v <= n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
        vector<int> ans;
        ans.reserve(queries.size());
        for (auto& q : queries) {
            int v = q[0];
            long long k = q[1];
            for (int j = 0; j < LOG && v != 0; j++) if (k >> j & 1) v = up[j][v];
            if (k >> LOG) v = 0;
            ans.push_back(v == 0 ? -1 : v);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-company-queries-ii",
    source: "cses",
    title: "Company Queries II",
    url: "https://cses.fi/problemset/task/1688",
    statement: [
      "A company has n employees numbered 1 to n, and employee 1 is the general director.",
      "The array bosses has length n - 1, and bosses[i] is the direct boss of employee i + 2. The bosses form a tree rooted at employee 1.",
      "Each query is [a, b]. Return the lowest common boss of a and b: the employee who is an ancestor of both (an employee counts as their own ancestor) and is as far from the director as possible.",
      "Return one answer per query, in order.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "bosses.length == n - 1",
      "1 <= bosses[i] <= n, and the bosses form a tree rooted at 1",
      "1 <= queries.length <= 200000",
      "Each query is [a, b] with 1 <= a, b <= n",
    ],
    fn: {name: "companyQueriesII",params: [{name: "n",type: "int"},{name: "bosses",type: "int[]"},{name: "queries",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [5,[1,1,2,3],[[4,5],[2,5],[1,3]]], output: [1,1,1], explanation: "4 and 5 meet at the director 1. Employee 2 is a boss of 4 only, so 2 and 5 meet at 1. For 1 and 3 the answer is 1." },
      { input: [4,[1,2,3],[[4,2],[3,3]]], output: [2,3], explanation: "On a chain the lowest common boss of 4 and 2 is 2. An employee with themselves gives themselves." },
    ],
    tests: [
      { input: [1,[],[[1,1]]], output: [1] },
      { input: [2,[1],[[1,2],[2,2],[2,1]]], output: [1,2,1] },
      { input: [6,[1,6,3,2,5],[[4,6],[4,1],[2,5],[1,5],[1,2],[3,5]]], output: [6,1,2,1,1,5] },
      { input: [8,[6,7,1,1,7,1,6],[[2,1],[2,6],[5,4],[6,4],[4,8],[2,2],[1,7],[2,6]]], output: [1,6,1,1,1,2,1,6] },
      { input: [9,[8,1,2,9,3,1,3,6],[[7,1],[5,5],[2,2],[8,4],[8,8],[8,3],[9,6],[9,7],[3,7]]], output: [1,5,2,8,8,3,6,1,1] },
      { input: [10,[7,4,1,2,2,1,4,7,9],[[6,9],[5,4],[7,4],[1,1],[7,10],[4,1],[4,3],[3,8],[5,2],[4,10]]], output: [7,1,1,1,7,1,4,4,2,1] },
      { input: [12,[1,12,12,12,1,3,3,10,1,10,2],[[8,12],[10,11],[5,4],[4,10],[11,9],[10,9],[8,6],[2,11],[1,3],[2,1],[12,7],[12,5]]], output: [12,10,12,1,10,10,1,1,1,1,12,12] },
      { input: [7,[1,1,1,1,1,1],[[1,7],[6,1],[1,5],[7,5],[4,5],[1,6]]], output: [1,1,1,1,1,1] },
    ],
    hints: [
      "The answer is the lowest common ancestor (LCA) of a and b in the tree rooted at 1.",
      "First lift the deeper node up until both have the same depth. If they are now equal, that is the answer.",
      "Otherwise jump both nodes up together by powers of two, from large to small, whenever their ancestors differ. After the loop the answer is their common parent. Precompute up[j][v] with the table recurrence up[j][v] = up[j-1][up[j-1][v]].",
    ],
    solution: {
      idea: [
        "BFS from employee 1 to get depths and parents, then build the binary lifting table up[j][v].",
        "To answer a query, lift the deeper node by the depth difference, then for j from high to low jump both nodes if up[j][a] != up[j][b].",
        "The common parent of the two nodes is the LCA.",
      ],
      complexity: "O((n + q) log n) time, O(n log n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> companyQueriesII(int n, vector<int>& bosses, vector<vector<int>>& queries) {
        vector<vector<int>> adj(n + 1);
        for (int i = 0; i + 1 < n; i++) {
            adj[bosses[i]].push_back(i + 2);
            adj[i + 2].push_back(bosses[i]);
        }
        vector<int> par(n + 1, 0), dep(n + 1, 0), order;
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                dep[v] = dep[u] + 1;
                order.push_back(v);
            }
        }
        int LOG = 1;
        while ((1 << LOG) <= n) LOG++;
        vector<vector<int>> up(LOG, vector<int>(n + 1, 0));
        for (int v = 1; v <= n; v++) up[0][v] = par[v];
        for (int j = 1; j < LOG; j++)
            for (int v = 1; v <= n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
        auto lca = [&](int a, int b) {
            if (dep[a] < dep[b]) swap(a, b);
            int diff = dep[a] - dep[b];
            for (int j = 0; j < LOG; j++) if (diff >> j & 1) a = up[j][a];
            if (a == b) return a;
            for (int j = LOG - 1; j >= 0; j--) {
                if (up[j][a] != up[j][b]) { a = up[j][a]; b = up[j][b]; }
            }
            return up[0][a];
        };
        vector<int> ans;
        ans.reserve(queries.size());
        for (auto& q : queries) ans.push_back(lca(q[0], q[1]));
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-distance-queries",
    source: "cses",
    title: "Distance Queries",
    url: "https://cses.fi/problemset/task/1135",
    statement: [
      "You are given a tree with n nodes numbered 1 to n, described by n - 1 undirected edges.",
      "Each query is [a, b]. Return the number of edges on the path between a and b.",
      "Return one answer per query, in order.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "edges.length == n - 1",
      "Each edge is [u, v] with 1 <= u, v <= n and u != v",
      "The edges form a tree",
      "1 <= queries.length <= 200000",
      "Each query is [a, b] with 1 <= a, b <= n",
    ],
    fn: {name: "distanceQueries",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"},{name: "queries",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [5,[[1,2],[1,3],[3,4],[3,5]],[[1,2],[3,5],[2,4]]], output: [1,1,3], explanation: "1 to 2 is one edge; 3 to 5 is one edge; 2 to 4 goes 2-1-3-4, three edges." },
      { input: [4,[[1,2],[2,3],[3,4]],[[1,4],[2,2]]], output: [3,0], explanation: "End to end on a path of four nodes is 3 edges; a node to itself is 0." },
    ],
    tests: [
      { input: [1,[],[[1,1]]], output: [0] },
      { input: [2,[[1,2]],[[1,2],[2,2]]], output: [1,0] },
      { input: [6,[[1,3],[4,5],[3,6],[2,4],[6,2]],[[3,1],[6,3],[6,3],[3,4],[5,3],[1,3]]], output: [1,1,1,3,4,1] },
      { input: [7,[[1,6],[1,7],[3,1],[1,2],[1,4],[5,1]],[[6,2],[1,5],[3,6],[7,1],[1,7],[3,4]]], output: [2,1,2,1,1,2] },
      { input: [9,[[8,2],[5,8],[7,1],[8,1],[3,4],[6,5],[2,9],[4,1]],[[1,1],[7,7],[5,5],[1,8],[2,4],[1,9],[2,8],[5,2],[5,8]]], output: [0,0,0,1,3,3,1,2,1] },
      { input: [11,[[2,7],[6,8],[6,3],[11,5],[2,4],[9,6],[5,10],[9,5],[2,1],[1,9]],[[2,2],[6,9],[8,10],[4,10],[8,4],[5,8],[4,10],[8,2],[9,1],[6,11]]], output: [0,1,4,5,5,3,5,4,1,3] },
      { input: [12,[[2,9],[8,3],[9,11],[8,2],[9,4],[9,10],[5,1],[6,8],[2,1],[12,4],[8,7]],[[12,7],[11,4],[10,2],[5,10],[5,3],[12,5],[4,10],[11,4],[2,11],[12,9],[3,9],[7,7]]], output: [5,2,2,4,4,5,2,2,2,2,3,0] },
      { input: [10,[[7,2],[2,8],[10,7],[1,2],[5,6],[4,5],[9,3],[9,7],[5,3]],[[5,6],[1,6],[10,4],[10,2],[8,7],[4,8],[8,9],[7,9],[3,7],[6,6]]], output: [1,6,5,2,2,6,3,1,2,0] },
    ],
    hints: [
      "In a tree there is exactly one path between two nodes, and it goes up to their lowest common ancestor and back down.",
      "With depths measured from node 1, dist(a, b) = depth[a] + depth[b] - 2 * depth[lca(a, b)].",
      "Find the LCA with binary lifting: build up[j][v] in a BFS from node 1, lift the deeper node, then jump both up while their ancestors differ.",
    ],
    solution: {
      idea: [
        "Root the tree at node 1 and compute depths and parents with BFS, then build the binary lifting table.",
        "For each query find l = lca(a, b) and answer depth[a] + depth[b] - 2 * depth[l].",
      ],
      complexity: "O((n + q) log n) time, O(n log n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> distanceQueries(int n, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), dep(n + 1, 0), order;
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                dep[v] = dep[u] + 1;
                order.push_back(v);
            }
        }
        int LOG = 1;
        while ((1 << LOG) <= n) LOG++;
        vector<vector<int>> up(LOG, vector<int>(n + 1, 0));
        for (int v = 1; v <= n; v++) up[0][v] = par[v];
        for (int j = 1; j < LOG; j++)
            for (int v = 1; v <= n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
        auto lca = [&](int a, int b) {
            if (dep[a] < dep[b]) swap(a, b);
            int diff = dep[a] - dep[b];
            for (int j = 0; j < LOG; j++) if (diff >> j & 1) a = up[j][a];
            if (a == b) return a;
            for (int j = LOG - 1; j >= 0; j--) {
                if (up[j][a] != up[j][b]) { a = up[j][a]; b = up[j][b]; }
            }
            return up[0][a];
        };
        vector<int> ans;
        ans.reserve(queries.size());
        for (auto& q : queries) ans.push_back(dep[q[0]] + dep[q[1]] - 2 * dep[lca(q[0], q[1])]);
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-counting-paths",
    source: "cses",
    title: "Counting Paths",
    url: "https://cses.fi/problemset/task/1136",
    statement: [
      "You are given a tree with n nodes numbered 1 to n, described by n - 1 undirected edges, and m paths. Each path is a pair [a, b] and consists of all nodes on the way from a to b (both ends included).",
      "For every node, count how many of the m paths contain it.",
      "Return an array of length n whose i-th element (0-based) is that count for node i + 1.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "edges.length == n - 1",
      "Each edge is [u, v] with 1 <= u, v <= n and u != v",
      "The edges form a tree",
      "1 <= paths.length <= 200000",
      "Each path is [a, b] with 1 <= a, b <= n",
    ],
    fn: {name: "countingPaths",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"},{name: "paths",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [5,[[1,2],[1,3],[3,4],[3,5]],[[1,4],[5,2],[1,2]]], output: [3,2,2,1,1], explanation: "Path 1-3-4, path 5-3-1-2 and path 1-2: node 1 is on all three paths." },
      { input: [4,[[1,2],[2,3],[3,4]],[[2,4],[3,3]]], output: [0,1,2,1], explanation: "Path 2-3-4 and the single-node path [3, 3]: node 3 is on both." },
    ],
    tests: [
      { input: [1,[],[[1,1],[1,1]]], output: [2] },
      { input: [2,[[1,2]],[[1,2],[2,2]]], output: [1,2] },
      { input: [6,[[3,2],[1,4],[4,5],[6,2],[3,5]],[[3,6],[6,5],[3,2],[4,2],[4,1],[4,1]]], output: [2,4,4,3,2,2] },
      { input: [7,[[3,1],[6,1],[4,1],[1,2],[1,7],[1,5]],[[5,7],[1,1],[3,6],[1,4],[3,6],[3,5]]], output: [6,0,3,1,2,2,1] },
      { input: [9,[[4,6],[3,7],[2,1],[1,5],[3,1],[9,1],[1,8],[6,1]],[[4,6],[1,8],[8,4],[6,1],[8,4],[7,2],[4,2],[4,6],[4,4]]], output: [6,2,1,6,0,6,1,3,0] },
      { input: [11,[[1,9],[11,8],[4,2],[10,5],[2,9],[8,3],[5,1],[6,5],[9,8],[2,7]],[[3,6],[10,1],[10,11],[2,3],[5,6],[1,1],[9,10],[10,6],[8,9],[11,3]]], output: [5,1,3,0,6,3,0,5,5,4,2] },
      { input: [12,[[5,12],[7,12],[2,12],[1,8],[3,5],[9,5],[5,6],[1,7],[4,11],[4,10],[9,10]],[[4,12],[5,8],[11,8],[6,7],[5,8],[3,10],[12,4],[8,4],[11,8],[7,2],[10,12],[2,7]]], output: [5,2,1,5,10,1,8,5,7,7,2,11] },
      { input: [10,[[9,4],[7,6],[4,2],[3,5],[1,6],[8,6],[7,10],[2,5],[3,7]],[[4,5],[10,6],[9,5],[2,3],[9,6],[7,5],[4,3],[6,3],[2,5],[10,9]]], output: [0,7,6,5,8,3,5,0,3,2] },
    ],
    hints: [
      "Walking every path costs O(n) per path in the worst case. Count by adding and then summing over subtrees instead.",
      "Root the tree. For a path from a to b with l = lca(a, b), add 1 to a and to b, and subtract 1 from l and from parent(l) (nothing for the root's parent).",
      "The number of paths through v is the sum of these marks over the subtree of v. Sum them in reverse BFS order, adding each node's total to its parent.",
    ],
    solution: {
      idea: [
        "Root the tree at 1, compute parents and depths with BFS, and build a binary lifting table to answer LCA queries.",
        "For each path put +1 on both ends and -1 on the LCA and on the LCA's parent. Together these make every node on the path contribute exactly 1 after summing the subtree.",
        "Walk the BFS order backwards adding mark[v] to mark[parent[v]]. The result at each node is its path count.",
      ],
      complexity: "O((n + m) log n) time, O(n log n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> countingPaths(int n, vector<vector<int>>& edges, vector<vector<int>>& paths) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), dep(n + 1, 0), order;
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                dep[v] = dep[u] + 1;
                order.push_back(v);
            }
        }
        int LOG = 1;
        while ((1 << LOG) <= n) LOG++;
        vector<vector<int>> up(LOG, vector<int>(n + 1, 0));
        for (int v = 1; v <= n; v++) up[0][v] = par[v];
        for (int j = 1; j < LOG; j++)
            for (int v = 1; v <= n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
        auto lca = [&](int a, int b) {
            if (dep[a] < dep[b]) swap(a, b);
            int diff = dep[a] - dep[b];
            for (int j = 0; j < LOG; j++) if (diff >> j & 1) a = up[j][a];
            if (a == b) return a;
            for (int j = LOG - 1; j >= 0; j--) {
                if (up[j][a] != up[j][b]) { a = up[j][a]; b = up[j][b]; }
            }
            return up[0][a];
        };
        vector<int> mark(n + 1, 0);
        for (auto& p : paths) {
            int l = lca(p[0], p[1]);
            mark[p[0]]++;
            mark[p[1]]++;
            mark[l]--;
            if (par[l] != 0) mark[par[l]]--;
        }
        for (int i = n - 1; i >= 1; i--) mark[par[order[i]]] += mark[order[i]];
        return vector<int>(mark.begin() + 1, mark.end());
    }
};
`,
    },
  },
  {
    id: "cses-subtree-queries",
    source: "cses",
    title: "Subtree Queries",
    url: "https://cses.fi/problemset/task/1137",
    statement: [
      "You are given a tree rooted at node 1 with n nodes numbered 1 to n. values[i] is the value stored at node i + 1, and the n - 1 undirected edges are given in edges.",
      "Process the queries in order. A query [1, s, x] sets the value of node s to x. A query [2, s] asks for the sum of the values in the subtree of s (node s and everything below it).",
      "Return the answers of the queries of the second kind, in order. Sums can exceed 32 bits.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "1 <= values[i] <= 1000000000",
      "edges.length == n - 1 and the edges form a tree",
      "1 <= queries.length <= 200000",
      "A query is [1, s, x] with 1 <= s <= n and 1 <= x <= 1000000000, or [2, s] with 1 <= s <= n",
    ],
    fn: {name: "subtreeQueries",params: [{name: "values",type: "int[]"},{name: "edges",type: "int[][]"},{name: "queries",type: "int[][]"}],returns: "long[]"},
    examples: [
      { input: [[4,2,5,2,1],[[1,2],[1,3],[3,4],[3,5]],[[2,3],[1,3,3],[2,1],[2,3]]], output: [8,12,6], explanation: "Subtree of 3 holds 5 + 2 + 1. After node 3 becomes 3 the totals are 12 for node 1 and 6 for node 3." },
      { input: [[7,1],[[1,2]],[[2,1],[1,2,10],[2,2]]], output: [8,10], explanation: "Whole tree: 7 + 1 = 8; after the update the subtree of 2 is just 10." },
    ],
    tests: [
      { input: [[5],[],[[2,1],[1,1,9],[2,1]]], output: [5,9] },
      { input: [[9,8,1,1,8,2],[[3,6],[4,2],[2,5],[4,3],[1,5]],[[2,3],[2,1],[1,6,8],[2,2],[1,6,9],[2,5],[2,4],[2,3]]], output: [3,29,18,27,11,10] },
      { input: [[2,8,9,9,6,3,3],[[3,1],[1,4],[7,1],[6,1],[2,1],[5,1]],[[2,2],[2,2],[2,7],[2,3],[2,5],[2,5],[1,4,2],[1,6,7]]], output: [8,8,3,9,6,6] },
      { input: [[4,3,4,9,1,6,5,1,5],[[7,1],[3,8],[9,5],[4,1],[6,1],[7,9],[7,8],[8,2]],[[2,7],[2,7],[2,7],[2,6],[2,2],[2,4],[1,7,1],[1,8,5],[2,4],[1,8,8]]], output: [19,19,19,6,3,9,9] },
      { input: [[6,6,4,8,1,4,1,2,3,4,6],[[9,6],[9,1],[5,1],[9,10],[10,11],[6,8],[2,6],[5,3],[5,4],[7,10]],[[2,3],[1,10,1],[1,5,9],[2,1],[2,11],[1,11,7],[2,9],[1,1,2],[2,7],[2,2],[2,11],[1,3,7]]], output: [4,50,6,24,1,6,7] },
      { input: [[6,4,8,6,4,9,4,3,5,5,6,3],[[10,7],[8,12],[1,4],[4,5],[4,8],[2,4],[3,4],[10,6],[12,11],[5,9],[12,10]],[[2,12],[2,3],[1,11,2],[1,12,4],[1,6,5],[1,6,9],[1,11,1],[1,6,1],[2,7],[2,2],[2,7],[2,2],[2,7],[2,1]]], output: [27,8,4,4,4,4,4,51] },
      { input: [[6,6,8,7,3,2,9,6,7,8],[[3,9],[4,9],[8,6],[10,4],[3,5],[5,7],[7,8],[4,1],[2,6]],[[2,3],[1,5,9],[2,6],[2,4],[2,5],[1,3,6],[1,6,7],[2,1],[2,8],[2,9],[2,7],[2,5]]], output: [34,8,62,32,71,19,50,28,37] },
      { input: [[557212988,425833888,107673996,579581048,475547347,940436058,525845995,348253129],[[1,4],[7,5],[6,4],[5,4],[5,2],[8,7],[3,7]],[[2,2],[2,6],[2,7],[2,7],[2,6],[1,2,878052971],[2,6],[1,2,367072814],[2,5],[2,6]]], output: [425833888,940436058,981773120,981773120,940436058,940436058,1824393281,940436058] },
    ],
    hints: [
      "Do a DFS and give each node an entry time tin[v]. The subtree of v is exactly the nodes with entry times from tin[v] to tout[v].",
      "Place value[v] at position tin[v] of an array. A subtree sum is now a range sum, and an update is a point change.",
      "Use a Fenwick tree (BIT) of 64-bit integers for the range sums. For an update add (x - old value) at position tin[s]. Use an explicit stack for the DFS so long chains do not overflow the call stack.",
    ],
    solution: {
      idea: [
        "Run an iterative DFS from node 1 to record tin[v] and tout[v] (the last entry time inside v's subtree).",
        "Store the values in a Fenwick tree indexed by tin. Build it by adding each value at its position.",
        "For [1, s, x], add x - cur[s] at tin[s] and set cur[s] = x. For [2, s], the answer is prefix(tout[s]) - prefix(tin[s] - 1).",
      ],
      complexity: "O((n + q) log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> subtreeQueries(vector<int>& values, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        int n = values.size();
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), tin(n + 1, 0), tout(n + 1, 0), it(n + 1, 0), st;
        int timer = 0;
        st.push_back(1);
        tin[1] = ++timer;
        while (!st.empty()) {
            int u = st.back();
            if (it[u] < (int)adj[u].size()) {
                int v = adj[u][it[u]++];
                if (v == par[u]) continue;
                par[v] = u;
                tin[v] = ++timer;
                st.push_back(v);
            } else {
                tout[u] = timer;
                st.pop_back();
            }
        }
        vector<long long> bit(n + 2, 0);
        auto add = [&](int i, long long x) { for (; i <= n; i += i & -i) bit[i] += x; };
        auto sum = [&](int i) { long long s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
        vector<long long> cur(n + 1);
        for (int v = 1; v <= n; v++) {
            cur[v] = values[v - 1];
            add(tin[v], cur[v]);
        }
        vector<long long> ans;
        for (auto& q : queries) {
            if (q[0] == 1) {
                add(tin[q[1]], q[2] - cur[q[1]]);
                cur[q[1]] = q[2];
            } else {
                ans.push_back(sum(tout[q[1]]) - sum(tin[q[1]] - 1));
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-path-queries",
    source: "cses",
    title: "Path Queries",
    url: "https://cses.fi/problemset/task/1138",
    statement: [
      "You are given a tree rooted at node 1 with n nodes numbered 1 to n. values[i] is the value stored at node i + 1, and the n - 1 undirected edges are given in edges.",
      "Process the queries in order. A query [1, s, x] sets the value of node s to x. A query [2, s] asks for the sum of the values on the path from the root (node 1) to node s, both ends included.",
      "Return the answers of the queries of the second kind, in order. Sums can exceed 32 bits.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "1 <= values[i] <= 1000000000",
      "edges.length == n - 1 and the edges form a tree",
      "1 <= queries.length <= 200000",
      "A query is [1, s, x] with 1 <= s <= n and 1 <= x <= 1000000000, or [2, s] with 1 <= s <= n",
    ],
    fn: {name: "pathQueries",params: [{name: "values",type: "int[]"},{name: "edges",type: "int[][]"},{name: "queries",type: "int[][]"}],returns: "long[]"},
    examples: [
      { input: [[4,2,5,2,1],[[1,2],[1,3],[3,4],[3,5]],[[2,4],[1,3,3],[2,4],[2,1]]], output: [11,9,4], explanation: "Path 1-3-4 sums to 4 + 5 + 2 = 11. After node 3 becomes 3 it is 9. The root alone is 4." },
      { input: [[7,1],[[1,2]],[[2,2],[1,1,2],[2,2]]], output: [8,3], explanation: "7 + 1 = 8, then 2 + 1 = 3 after the root changes." },
    ],
    tests: [
      { input: [[5],[],[[2,1],[1,1,9],[2,1]]], output: [5,9] },
      { input: [[6,5,4,6,4,8],[[6,4],[5,6],[5,3],[2,1],[4,2]],[[2,4],[1,3,2],[2,5],[2,5],[1,1,8],[2,1],[1,1,9],[2,6]]], output: [17,29,29,8,28] },
      { input: [[5,6,6,9,1,6,5],[[1,3],[1,2],[4,1],[5,1],[1,7],[6,1]],[[2,3],[2,4],[1,3,3],[1,2,6],[2,4],[2,5],[1,4,6],[2,1]]], output: [11,14,14,6,5] },
      { input: [[4,3,8,7,8,3,2,4,1],[[8,9],[1,2],[4,5],[3,1],[9,1],[9,6],[6,4],[7,2]],[[2,8],[2,1],[2,2],[2,2],[2,2],[1,3,7],[1,8,5],[2,3],[1,4,4],[2,3]]], output: [9,4,7,7,7,11,11] },
      { input: [[4,1,6,3,6,3,7,4,3,6,2],[[2,11],[8,1],[2,9],[6,10],[8,2],[3,6],[4,7],[6,1],[7,8],[7,5]],[[2,2],[1,11,4],[2,7],[2,1],[2,10],[2,3],[2,10],[2,6],[1,1,9],[2,4],[1,3,5],[2,4]]], output: [9,15,4,13,13,13,7,23,23] },
      { input: [[1,7,7,9,8,1,2,1,5,8,2,2],[[11,9],[1,3],[2,5],[4,3],[5,10],[10,8],[1,6],[12,5],[11,4],[7,8],[3,10]],[[2,7],[2,6],[1,6,8],[1,9,8],[1,1,1],[2,1],[2,9],[1,4,2],[2,8],[2,10],[2,12],[2,2],[1,8,7],[2,4]]], output: [19,2,1,27,17,16,26,31,10] },
      { input: [[6,8,1,2,2,3,4,8,8,4],[[3,7],[7,9],[6,4],[1,8],[10,2],[6,10],[3,2],[5,10],[5,1]],[[2,3],[1,6,7],[2,9],[2,4],[2,7],[2,5],[1,5,8],[2,7],[1,7,2],[2,10],[2,5],[2,7]]], output: [21,33,21,25,8,31,18,14,29] },
      { input: [[227545783,656369993,857932603,640357151,638603689,259309268,870290422,603717784],[[1,8],[3,6],[6,2],[3,5],[7,3],[6,8],[4,8]],[[2,8],[2,5],[1,6,482976817],[2,1],[2,4],[2,1],[2,3],[1,7,524496843],[2,1],[2,5]]], output: [831263567,2587109127,227545783,1471620718,227545783,2172172987,227545783,2810776676] },
    ],
    hints: [
      "The answer for node s is the sum of the values of all its ancestors including itself. Changing a node changes the answer of every node in its subtree.",
      "Use Euler entry/exit times so the subtree of s is the range tin[s] .. tout[s]. Then 'add d to every node in the subtree of s' is a range add.",
      "Keep a Fenwick tree for range add and point query (store differences: add d at tin[s], subtract d at tout[s] + 1). Initialise by adding each value over its own subtree range. Query = prefix sum at tin[s].",
    ],
    solution: {
      idea: [
        "Iterative DFS from node 1 gives tin and tout.",
        "Let D be a Fenwick tree over differences. For every node v add values[v] over the range [tin[v], tout[v]]. Then the point value at tin[s] equals the sum on the root path of s.",
        "An update [1, s, x] adds the difference x - cur[s] over the range of s's subtree. A query [2, s] is a prefix sum at tin[s].",
      ],
      complexity: "O((n + q) log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> pathQueries(vector<int>& values, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        int n = values.size();
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), tin(n + 1, 0), tout(n + 1, 0), it(n + 1, 0), st;
        int timer = 0;
        st.push_back(1);
        tin[1] = ++timer;
        while (!st.empty()) {
            int u = st.back();
            if (it[u] < (int)adj[u].size()) {
                int v = adj[u][it[u]++];
                if (v == par[u]) continue;
                par[v] = u;
                tin[v] = ++timer;
                st.push_back(v);
            } else {
                tout[u] = timer;
                st.pop_back();
            }
        }
        vector<long long> bit(n + 2, 0);
        auto add = [&](int i, long long x) { for (; i <= n; i += i & -i) bit[i] += x; };
        auto sum = [&](int i) { long long s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
        auto rangeAdd = [&](int l, int r, long long x) { add(l, x); if (r + 1 <= n) add(r + 1, -x); };
        vector<long long> cur(n + 1);
        for (int v = 1; v <= n; v++) {
            cur[v] = values[v - 1];
            rangeAdd(tin[v], tout[v], cur[v]);
        }
        vector<long long> ans;
        for (auto& q : queries) {
            if (q[0] == 1) {
                rangeAdd(tin[q[1]], tout[q[1]], q[2] - cur[q[1]]);
                cur[q[1]] = q[2];
            } else {
                ans.push_back(sum(tin[q[1]]));
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-path-queries-ii",
    source: "cses",
    title: "Path Queries II",
    url: "https://cses.fi/problemset/task/2134",
    statement: [
      "You are given a tree with n nodes numbered 1 to n. values[i] is the value stored at node i + 1, and the n - 1 undirected edges are given in edges.",
      "Process the queries in order. A query [1, s, x] sets the value of node s to x. A query [2, a, b] asks for the largest value among the nodes on the path from a to b (both ends included).",
      "Return the answers of the queries of the second kind, in order.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "1 <= values[i] <= 1000000000",
      "edges.length == n - 1 and the edges form a tree",
      "1 <= queries.length <= 200000",
      "A query is [1, s, x] with 1 <= s <= n and 1 <= x <= 1000000000, or [2, a, b] with 1 <= a, b <= n",
    ],
    fn: {name: "pathQueriesII",params: [{name: "values",type: "int[]"},{name: "edges",type: "int[][]"},{name: "queries",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [[2,5,3,1,4],[[1,2],[1,3],[3,4],[3,5]],[[2,2,4],[1,3,9],[2,2,4],[2,4,5]]], output: [5,9,9], explanation: "Path 2-1-3-4 has maximum 5. After node 3 becomes 9 the maximum is 9. Path 4-3-5 also gives 9." },
      { input: [[7,1],[[1,2]],[[2,1,2],[1,1,2],[2,1,2]]], output: [7,2], explanation: "The maximum drops from 7 to 2 after the update." },
    ],
    tests: [
      { input: [[5],[],[[2,1,1],[1,1,9],[2,1,1]]], output: [5,9] },
      { input: [[2,7,4,2,6,7],[[3,5],[4,2],[6,4],[2,1],[6,3]],[[2,3,3],[2,2,5],[2,5,6],[1,5,3],[1,6,5],[2,4,3],[2,1,4],[1,2,5]]], output: [4,7,7,5,7] },
      { input: [[8,9,2,8,1,8,8],[[2,1],[1,7],[1,4],[1,6],[3,1],[1,5]],[[2,5,2],[2,5,6],[1,5,6],[1,5,4],[1,4,3],[1,7,1],[2,5,1],[1,4,9]]], output: [9,8,8] },
      { input: [[1,5,8,5,2,9,6,9,5],[[1,8],[4,5],[2,6],[3,8],[8,6],[5,1],[4,9],[7,1]],[[2,2,1],[2,9,7],[1,1,5],[1,3,2],[1,4,6],[2,9,1],[2,1,3],[1,2,1],[1,3,1],[2,9,7]]], output: [9,6,6,9,6] },
      { input: [[9,5,4,6,2,1,5,1,1,2,6],[[4,7],[10,9],[3,7],[5,6],[1,6],[8,6],[11,10],[1,3],[2,7],[3,10]],[[2,3,7],[2,6,9],[1,8,6],[2,1,1],[1,7,5],[2,8,8],[1,5,5],[2,10,2],[2,7,5],[2,11,5],[2,5,8],[1,9,4]]], output: [5,9,9,6,5,9,9,6] },
      { input: [[6,8,4,5,4,8,8,5,3,6,2,3],[[6,7],[7,3],[4,9],[9,1],[9,11],[7,9],[4,10],[8,9],[12,3],[2,4],[5,6]],[[2,12,3],[1,1,1],[2,9,8],[2,11,7],[1,5,2],[2,8,2],[2,6,1],[1,4,5],[2,9,12],[2,12,9],[1,6,2],[2,11,7],[1,1,2],[1,4,7]]], output: [4,5,8,8,8,8,8,8] },
      { input: [[5,6,9,1,4,4,7,3,4,6],[[2,8],[3,2],[3,4],[10,7],[7,8],[8,6],[6,9],[1,9],[5,9]],[[2,3,3],[1,7,6],[2,6,8],[2,10,7],[2,3,6],[1,3,2],[1,8,1],[2,4,8],[2,3,6],[1,6,9],[2,1,5],[2,5,5]]], output: [9,4,6,9,6,6,5,4] },
      { input: [[5,5,3,8,8,9,6,3,2,8,3,6],[[4,12],[12,7],[8,11],[1,5],[12,11],[11,10],[3,5],[4,6],[5,4],[9,10],[2,10]],[[2,7,10],[2,2,8],[1,12,5],[2,7,9],[2,7,9],[1,3,9],[1,10,3],[2,6,3],[1,9,5],[1,11,7],[1,12,3],[2,10,11],[2,8,3],[2,8,10]]], output: [8,8,8,8,9,7,9,7] },
    ],
    hints: [
      "On a plain path (chain) this is a segment tree with point update and range maximum. The task is to reduce tree paths to chain ranges.",
      "Heavy-light decomposition: link each node to its child with the largest subtree (the heavy child). Every root-to-node path crosses only O(log n) light edges, so it splits into O(log n) heavy chains.",
      "Give each heavy chain consecutive positions (head first). For a query, repeatedly take the node whose chain head is deeper, query the segment tree from the head to that node, and jump to the parent of the head. When both are on the same chain, query the last range between them.",
    ],
    solution: {
      idea: [
        "Root the tree at 1. Using a BFS order compute sizes bottom-up and each node's heavy child.",
        "Assign positions chain by chain with an explicit stack so each heavy chain is contiguous, remembering head[v] (the top of the chain of v).",
        "Keep a segment tree of maximum over positions. For an update change one leaf. For a query on (a, b): while head[a] != head[b], move the node whose head is deeper: take the maximum over [pos[head], pos[node]] and set node = parent[head]. Finally take the maximum over the range between pos[a] and pos[b].",
      ],
      complexity: "O(n + q log^2 n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> pathQueriesII(vector<int>& values, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        int n = values.size();
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), dep(n + 1, 0), order, sz(n + 1, 1), heavy(n + 1, 0);
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                dep[v] = dep[u] + 1;
                order.push_back(v);
            }
        }
        for (int i = n - 1; i >= 1; i--) sz[par[order[i]]] += sz[order[i]];
        for (int i = n - 1; i >= 1; i--) {
            int v = order[i], p = par[v];
            if (heavy[p] == 0 || sz[v] > sz[heavy[p]]) heavy[p] = v;
        }
        vector<int> head(n + 1, 0), pos(n + 1, 0);
        int cnt = 0;
        for (int i = 0; i < n; i++) {
            int u = order[i];
            if (u == 1 || heavy[par[u]] != u) {
                for (int v = u; v != 0; v = heavy[v]) {
                    head[v] = u;
                    pos[v] = cnt++;
                }
            }
        }
        vector<int> seg(2 * n, 0);
        for (int v = 1; v <= n; v++) seg[n + pos[v]] = values[v - 1];
        for (int i = n - 1; i >= 1; i--) seg[i] = max(seg[2 * i], seg[2 * i + 1]);
        auto query = [&](int l, int r) {  // inclusive
            int res = 0;
            for (l += n, r += n + 1; l < r; l >>= 1, r >>= 1) {
                if (l & 1) res = max(res, seg[l++]);
                if (r & 1) res = max(res, seg[--r]);
            }
            return res;
        };
        vector<int> ans;
        for (auto& q : queries) {
            if (q[0] == 1) {
                int i = pos[q[1]] + n;
                seg[i] = q[2];
                for (i >>= 1; i >= 1; i >>= 1) seg[i] = max(seg[2 * i], seg[2 * i + 1]);
            } else {
                int a = q[1], b = q[2], res = 0;
                while (head[a] != head[b]) {
                    if (dep[head[a]] < dep[head[b]]) swap(a, b);
                    res = max(res, query(pos[head[a]], pos[a]));
                    a = par[head[a]];
                }
                if (pos[a] > pos[b]) swap(a, b);
                res = max(res, query(pos[a], pos[b]));
                ans.push_back(res);
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-distinct-colors",
    source: "cses",
    title: "Distinct Colors",
    url: "https://cses.fi/problemset/task/1139",
    statement: [
      "You are given a tree rooted at node 1 with n nodes numbered 1 to n. colors[i] is the color of node i + 1, and the n - 1 undirected edges are given in edges.",
      "For every node, count how many different colors appear in its subtree (the node itself and everything below it).",
      "Return an array of length n whose i-th element (0-based) is that count for node i + 1.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "1 <= colors[i] <= 1000000000",
      "edges.length == n - 1 and the edges form a tree",
    ],
    fn: {name: "distinctColors",params: [{name: "colors",type: "int[]"},{name: "edges",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [[2,3,2,2,3],[[1,2],[1,3],[3,4],[3,5]]], output: [2,1,2,1,1], explanation: "Node 1 sees colors 2 and 3. Node 3 sees 2 (itself and node 4) and 3 (node 5). Leaves see 1." },
      { input: [[5,5,5],[[1,2],[2,3]]], output: [1,1,1], explanation: "All nodes share one color, so every subtree has exactly one distinct color." },
    ],
    tests: [
      { input: [[7],[]], output: [1] },
      { input: [[1,2],[[1,2]]], output: [2,1] },
      { input: [[1,1,1,2,1,2,3],[[2,6],[5,6],[1,2],[4,7],[5,7],[3,4]]], output: [3,3,1,2,3,3,3] },
      { input: [[1,3,3,3,1,3,2,1],[[8,1],[5,1],[1,7],[6,1],[2,1],[1,4],[1,3]]], output: [3,1,1,1,1,1,1,1] },
      { input: [[3,3,3,3,4,4,2,2,4],[[6,9],[5,9],[9,7],[2,7],[3,6],[5,4],[9,1],[8,6]]], output: [3,1,1,1,2,3,2,1,3] },
      { input: [[1,3,4,2,5,4,3,5,5,3,3],[[5,10],[5,8],[9,7],[11,5],[2,4],[7,11],[3,7],[1,4],[6,4],[1,11]]], output: [5,1,1,3,2,1,3,1,1,1,3] },
      { input: [[5,6,4,3,5,4,2,4,2,3,2,4],[[12,5],[7,4],[4,5],[1,8],[8,10],[12,3],[4,1],[11,7],[2,12],[9,1],[6,1]]], output: [5,1,1,5,3,1,1,2,1,1,1,2] },
      { input: [[2,3,1,3,3,3,2,1,2,2],[[1,7],[7,6],[2,10],[2,6],[10,3],[10,5],[9,5],[6,4],[1,8]]], output: [3,3,1,1,2,3,3,1,1,3] },
      { input: [[34,56,16,73,2,57,88,1,93],[[2,3],[4,2],[4,6],[6,9],[5,2],[1,6],[4,8],[7,3]]], output: [9,4,2,6,1,8,1,1,1] },
    ],
    hints: [
      "Merging a set of colors for every node is too slow on a chain unless you merge small sets into large ones. There is a cleaner way with an Euler tour.",
      "Write the colors in DFS entry order. The subtree of v is a contiguous range [tin[v], tout[v]], so the task is: count distinct values in many ranges.",
      "Answer the ranges offline: sort them by right end, sweep a pointer over the array, and keep a Fenwick tree with a 1 at the last seen position of each color. The distinct count of [l, r] is the number of 1s in positions l..r.",
    ],
    solution: {
      idea: [
        "Iterative DFS from node 1 gives tin, tout and the array arr[tin[v]] = color of v.",
        "Group the queries (one per node, the range tin[v] .. tout[v]) by right end. Sweep r from 1 to n: if arr[r] was seen before at position p, remove its 1 at p; put a 1 at r and remember it.",
        "At each r, answer the queries ending there with prefix(r) - prefix(l - 1). Each color is counted once, at its latest position within the range.",
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> distinctColors(vector<int>& colors, vector<vector<int>>& edges) {
        int n = colors.size();
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), tin(n + 1, 0), tout(n + 1, 0), it(n + 1, 0), st;
        int timer = 0;
        st.push_back(1);
        tin[1] = ++timer;
        while (!st.empty()) {
            int u = st.back();
            if (it[u] < (int)adj[u].size()) {
                int v = adj[u][it[u]++];
                if (v == par[u]) continue;
                par[v] = u;
                tin[v] = ++timer;
                st.push_back(v);
            } else {
                tout[u] = timer;
                st.pop_back();
            }
        }
        vector<int> arr(n + 1);
        for (int v = 1; v <= n; v++) arr[tin[v]] = colors[v - 1];
        vector<vector<int>> byEnd(n + 1);
        for (int v = 1; v <= n; v++) byEnd[tout[v]].push_back(v);
        vector<int> bit(n + 2, 0);
        auto add = [&](int i, int x) { for (; i <= n; i += i & -i) bit[i] += x; };
        auto sum = [&](int i) { int s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
        unordered_map<int, int> last;
        last.reserve(n * 2);
        vector<int> ans(n);
        for (int r = 1; r <= n; r++) {
            auto f = last.find(arr[r]);
            if (f != last.end()) add(f->second, -1);
            add(r, 1);
            last[arr[r]] = r;
            for (int v : byEnd[r]) ans[v - 1] = sum(r) - sum(tin[v] - 1);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-finding-a-centroid",
    source: "cses",
    title: "Finding a Centroid",
    url: "https://cses.fi/problemset/task/2079",
    statement: [
      "You are given a tree with n nodes numbered 1 to n, described by n - 1 undirected edges.",
      "A centroid is a node such that, when it is removed, every remaining connected component has at most n / 2 nodes (integer division, rounding down).",
      "Every tree has at least one centroid, and at most two. Return the smallest-numbered centroid.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "edges.length == n - 1",
      "Each edge is [u, v] with 1 <= u, v <= n and u != v",
      "The edges form a tree",
    ],
    fn: {name: "findingACentroid",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [5,[[1,2],[1,3],[3,4],[3,5]]], output: 3, explanation: "Removing node 3 leaves components of sizes 2, 1 and 1, all at most 5 / 2 = 2. Removing node 1 leaves a component of size 3, which is too big." },
      { input: [4,[[1,2],[2,3],[3,4]]], output: 2, explanation: "Both 2 and 3 are centroids (components of size 1 and 2, limit 2). The smaller number is 2." },
    ],
    tests: [
      { input: [1,[]], output: 1 },
      { input: [2,[[1,2]]], output: 1 },
      { input: [6,[[6,2],[2,4],[6,5],[1,4],[5,3]]], output: 2 },
      { input: [7,[[3,1],[1,5],[1,2],[4,1],[7,1],[1,6]]], output: 1 },
      { input: [9,[[4,6],[7,5],[5,3],[3,4],[4,8],[9,8],[8,2],[1,4]]], output: 4 },
      { input: [12,[[7,2],[1,2],[1,3],[8,1],[12,5],[4,1],[9,10],[1,9],[10,5],[7,11],[5,6]]], output: 1 },
      { input: [10,[[6,8],[10,6],[4,2],[9,10],[4,3],[1,2],[2,7],[4,10],[5,6]]], output: 4 },
      { input: [11,[[6,4],[1,5],[5,9],[6,1],[10,6],[9,3],[2,11],[5,11],[8,9],[11,7]]], output: 5 },
      { input: [13,[[1,5],[6,3],[12,10],[9,3],[8,10],[2,1],[12,2],[5,7],[10,6],[9,11],[4,11],[4,13]]], output: 10 },
      { input: [8,[[4,8],[7,5],[6,1],[2,3],[7,8],[3,5],[4,6]]], output: 7 },
    ],
    hints: [
      "Root the tree at node 1 and compute the size of every subtree. Removing node v leaves its child subtrees and the rest of the tree, of size n - size[v].",
      "Node v is a centroid when the largest of those pieces is at most n / 2. Check this for every node.",
      "Take the smallest node number that passes. Compute sizes in reverse BFS order so deep trees do not overflow the stack.",
    ],
    solution: {
      idea: [
        "BFS from 1 gives the parent of every node and an order. Walk the order backwards to get size[v] and the largest child subtree biggest[v].",
        "The largest piece after removing v is max(biggest[v], n - size[v]).",
        "Return the smallest v whose largest piece is at most n / 2 (integer division).",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findingACentroid(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), order, sz(n + 1, 1), big(n + 1, 0);
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                order.push_back(v);
            }
        }
        for (int i = n - 1; i >= 1; i--) {
            int v = order[i], p = par[v];
            sz[p] += sz[v];
            big[p] = max(big[p], sz[v]);
        }
        for (int v = 1; v <= n; v++) {
            if (max(big[v], n - sz[v]) <= n / 2) return v;
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "cses-fixed-length-paths-i",
    source: "cses",
    title: "Fixed-Length Paths I",
    url: "https://cses.fi/problemset/task/2080",
    statement: [
      "You are given a tree with n nodes numbered 1 to n, described by n - 1 undirected edges, and an integer k.",
      "Count the pairs of distinct nodes whose path has exactly k edges. The pair (a, b) is the same as (b, a) and is counted once.",
      "Return the count. It can exceed 32 bits.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "1 <= k <= n",
      "edges.length == n - 1",
      "Each edge is [u, v] with 1 <= u, v <= n and u != v",
      "The edges form a tree",
    ],
    fn: {name: "fixedLengthPathsI",params: [{name: "n",type: "int"},{name: "k",type: "int"},{name: "edges",type: "int[][]"}],returns: "long"},
    examples: [
      { input: [5,2,[[1,2],[1,3],[3,4],[3,5]]], output: 4, explanation: "The paths with 2 edges are 2-1-3, 1-3-4, 1-3-5 and 4-3-5: four of them." },
      { input: [4,3,[[1,2],[2,3],[3,4]]], output: 1, explanation: "Only the pair (1, 4) is three edges apart." },
    ],
    tests: [
      { input: [1,1,[]], output: 0 },
      { input: [2,1,[[1,2]]], output: 1 },
      { input: [6,2,[[4,3],[1,5],[6,4],[2,6],[5,2]]], output: 4 },
      { input: [7,2,[[1,3],[7,1],[1,6],[1,4],[2,1],[5,1]]], output: 15 },
      { input: [9,3,[[2,6],[1,9],[4,1],[8,5],[1,2],[2,8],[5,3],[6,7]]], output: 9 },
      { input: [12,4,[[12,3],[11,4],[4,8],[12,5],[10,5],[4,9],[4,7],[7,2],[6,5],[4,12],[1,8]]], output: 13 },
      { input: [11,3,[[3,1],[3,8],[8,5],[7,6],[9,8],[10,11],[7,2],[11,4],[3,7],[1,11]]], output: 12 },
      { input: [10,5,[[8,7],[1,7],[7,2],[8,5],[5,4],[5,6],[4,9],[4,10],[3,8]]], output: 4 },
      { input: [10,1,[[1,5],[6,1],[9,8],[6,10],[7,3],[4,8],[7,8],[2,10],[3,6]]], output: 9 },
      { input: [8,8,[[8,5],[7,3],[8,2],[6,3],[2,1],[6,4],[5,4]]], output: 0 },
    ],
    hints: [
      "Counting by pairs is O(n^2). Split the tree at a node c: every path either passes through c or lies completely inside one of the pieces left after removing c.",
      "Choose c as a centroid so each piece has at most half the nodes: the recursion depth is O(log n). For paths through c, collect the distance to c of each node and count pairs of distances (from different child subtrees) adding up to k.",
      "Keep an array cnt[d], the number of nodes at distance d seen so far, starting with cnt[0] = 1 for c itself. For each child subtree, first count using cnt[k - d] for every node at depth d, then add that subtree's depths to cnt. Reset cnt before recursing, and avoid deep recursion with BFS and an explicit stack.",
    ],
    solution: {
      idea: [
        "Centroid decomposition: find the centroid c of the current component, count the paths through c, remove c, and repeat on each remaining component.",
        "For paths through c, process child subtrees one at a time: each node at depth d contributes cnt[k - d] paths with the nodes already recorded (cnt[0] holds c itself), and then the subtree's depths are added to cnt.",
        "Each level of the decomposition touches every node once, so the total is O(n log n). The answer can be around n^2 / 2, so use 64-bit counts.",
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long fixedLengthPathsI(int n, int k, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<char> removed(n + 1, 0);
        vector<int> par(n + 1, 0), sz(n + 1, 0);
        vector<int> cnt(n + 2, 0);
        long long ans = 0;
        vector<int> stk;
        stk.push_back(1);
        while (!stk.empty()) {
            int start = stk.back();
            stk.pop_back();
            // component of start: BFS order, sizes, then walk to the centroid
            vector<int> comp;
            comp.push_back(start);
            par[start] = 0;
            for (size_t h = 0; h < comp.size(); h++) {
                int u = comp[h];
                for (int v : adj[u]) if (!removed[v] && v != par[u]) { par[v] = u; comp.push_back(v); }
            }
            int total = comp.size();
            for (int u : comp) sz[u] = 1;
            for (int i = total - 1; i >= 1; i--) sz[par[comp[i]]] += sz[comp[i]];
            int c = start;
            while (true) {
                int nxt = 0;
                for (int v : adj[c]) if (!removed[v] && v != par[c] && sz[v] * 2 > total) { nxt = v; break; }
                if (!nxt) break;
                c = nxt;
            }
            // count paths through c
            cnt[0] = 1;
            int maxSeen = 0;
            for (int child : adj[c]) {
                if (removed[child]) continue;
                // depths of the nodes in this child's subtree (distance to c)
                vector<int> nodes, depth;
                nodes.push_back(child);
                depth.push_back(1);
                par[child] = c;
                for (size_t h = 0; h < nodes.size(); h++) {
                    int u = nodes[h];
                    for (int v : adj[u]) if (!removed[v] && v != par[u]) { par[v] = u; nodes.push_back(v); depth.push_back(depth[h] + 1); }
                }
                for (int d : depth) if (k - d >= 0 && k - d <= maxSeen) ans += cnt[k - d];
                for (int d : depth) { cnt[d]++; maxSeen = max(maxSeen, d); }
            }
            for (int d = 0; d <= maxSeen; d++) cnt[d] = 0;
            removed[c] = 1;
            for (int v : adj[c]) if (!removed[v]) stk.push_back(v);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-fixed-length-paths-ii",
    source: "cses",
    title: "Fixed-Length Paths II",
    url: "https://cses.fi/problemset/task/2081",
    statement: [
      "You are given a tree with n nodes numbered 1 to n, described by n - 1 undirected edges, and two integers k1 <= k2.",
      "Count the pairs of distinct nodes whose path has between k1 and k2 edges, both limits included. The pair (a, b) is the same as (b, a) and is counted once.",
      "Return the count. It can exceed 32 bits.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "1 <= k1 <= k2 <= n",
      "edges.length == n - 1",
      "Each edge is [u, v] with 1 <= u, v <= n and u != v",
      "The edges form a tree",
    ],
    fn: {name: "fixedLengthPathsII",params: [{name: "n",type: "int"},{name: "k1",type: "int"},{name: "k2",type: "int"},{name: "edges",type: "int[][]"}],returns: "long"},
    examples: [
      { input: [5,2,3,[[1,2],[1,3],[3,4],[3,5]]], output: 6, explanation: "Four pairs are 2 edges apart (see the first problem) and 2-1-3-4, 2-1-3-5 are 3 edges apart: six pairs in total." },
      { input: [4,1,3,[[1,2],[2,3],[3,4]]], output: 6, explanation: "On a path of four nodes all six pairs are between 1 and 3 edges apart." },
    ],
    tests: [
      { input: [1,1,1,[]], output: 0 },
      { input: [2,1,1,[[1,2]]], output: 1 },
      { input: [6,2,3,[[6,3],[4,6],[4,2],[5,1],[2,5]]], output: 7 },
      { input: [7,1,2,[[6,1],[2,1],[4,1],[1,7],[1,5],[3,1]]], output: 21 },
      { input: [9,2,4,[[2,6],[8,7],[2,7],[1,3],[1,5],[9,7],[4,3],[7,1]]], output: 27 },
      { input: [12,3,6,[[7,12],[11,9],[1,7],[7,11],[5,7],[6,3],[10,2],[2,4],[4,9],[8,3],[6,5]]], output: 36 },
      { input: [11,2,5,[[9,7],[7,6],[5,4],[1,10],[3,4],[1,8],[8,11],[4,10],[7,10],[2,8]]], output: 45 },
      { input: [10,4,10,[[9,4],[4,1],[8,5],[7,9],[7,5],[7,3],[9,2],[5,10],[6,4]]], output: 12 },
      { input: [10,1,10,[[9,7],[7,6],[10,8],[7,4],[2,6],[6,1],[5,8],[4,5],[3,4]]], output: 45 },
      { input: [8,5,5,[[3,6],[2,5],[4,6],[4,5],[8,1],[2,7],[3,8]]], output: 3 },
    ],
    hints: [
      "Use the same centroid decomposition as for an exact length: every path passes through some centroid c, and its two halves lie in different child subtrees of c (or one half is c itself).",
      "For a node at depth d in the current child subtree, the partners it needs have depth between k1 - d and k2 - d. That is a range count over the depths recorded so far.",
      "Keep a Fenwick tree indexed by depth, put depth 0 (the centroid) in first, and for each child subtree first query then insert. After the centroid is done, undo your insertions. Clamp the range to [0, n].",
    ],
    solution: {
      idea: [
        "Find the centroid c of each component with sizes computed by BFS, count the paths through c, remove c, and continue with every remaining component using an explicit stack.",
        "Through c: iterate child subtrees; each node at depth d adds count(depths in [max(0, k1 - d), k2 - d]) from a Fenwick tree that holds the depths of c and of the earlier subtrees. Then insert this subtree's depths.",
        "Undo the Fenwick insertions before the next centroid. Total time is O(n log^2 n).",
      ],
      complexity: "O(n log^2 n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long fixedLengthPathsII(int n, int k1, int k2, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<char> removed(n + 1, 0);
        vector<int> par(n + 1, 0), sz(n + 1, 0);
        vector<int> cnt(n + 2, 0);
        vector<int> bit(n + 3, 0);
        auto bitAdd = [&](int i, int x) { for (i++; i <= n + 1; i += i & -i) bit[i] += x; };
        auto bitSum = [&](int i) { int s = 0; for (i++; i > 0; i -= i & -i) s += bit[i]; return s; };  // depths 0..i
        long long ans = 0;
        vector<int> stk;
        stk.push_back(1);
        while (!stk.empty()) {
            int start = stk.back();
            stk.pop_back();
            // component of start: BFS order, sizes, then walk to the centroid
            vector<int> comp;
            comp.push_back(start);
            par[start] = 0;
            for (size_t h = 0; h < comp.size(); h++) {
                int u = comp[h];
                for (int v : adj[u]) if (!removed[v] && v != par[u]) { par[v] = u; comp.push_back(v); }
            }
            int total = comp.size();
            for (int u : comp) sz[u] = 1;
            for (int i = total - 1; i >= 1; i--) sz[par[comp[i]]] += sz[comp[i]];
            int c = start;
            while (true) {
                int nxt = 0;
                for (int v : adj[c]) if (!removed[v] && v != par[c] && sz[v] * 2 > total) { nxt = v; break; }
                if (!nxt) break;
                c = nxt;
            }
            // count paths through c
            bitAdd(0, 1);
            vector<int> added;
            added.push_back(0);
            for (int child : adj[c]) {
                if (removed[child]) continue;
                // depths of the nodes in this child's subtree (distance to c)
                vector<int> nodes, depth;
                nodes.push_back(child);
                depth.push_back(1);
                par[child] = c;
                for (size_t h = 0; h < nodes.size(); h++) {
                    int u = nodes[h];
                    for (int v : adj[u]) if (!removed[v] && v != par[u]) { par[v] = u; nodes.push_back(v); depth.push_back(depth[h] + 1); }
                }
                for (int d : depth) {
                    int lo = max(0, k1 - d), hi = k2 - d;
                    if (hi < 0) continue;
                    hi = min(hi, n);
                    if (lo > hi) continue;
                    ans += bitSum(hi) - (lo > 0 ? bitSum(lo - 1) : 0);
                }
                for (int d : depth) { bitAdd(d, 1); added.push_back(d); }
            }
            for (int d : added) bitAdd(d, -1);
            removed[c] = 1;
            for (int v : adj[c]) if (!removed[v]) stk.push_back(v);
        }
        return ans;
    }
};
`,
    },
  },
];

/** What the lead needs for the dsa.ts entries (cses(...) lines and a pattern). `d` is the key of D in dsa.ts. */
export interface CsesTreeEntry {
  id: string;
  title: string;
  url: string;
  /** CSES task number */
  task: number;
  d: "E" | "M" | "H";
  difficulty: "easy" | "medium" | "hard";
  /** Suggested pattern: a new pattern "cses-tree" (needs a guide in learn/dsa-*.ts) or the existing "cses-misc" */
  pattern: "cses-tree";
  tags: string[];
  why: string;
}

export const CSES_TREE_ENTRIES: CsesTreeEntry[] = [
  { id: "cses-tree-matching", title: "Tree Matching", url: "https://cses.fi/problemset/task/1130", task: 1130, d: "M", difficulty: "medium", pattern: "cses-tree", tags: ["tree","greedy","dp"], why: "Maximum matching on a tree: greedily pair each unmatched node with its unmatched parent, leaves first." },
  { id: "cses-tree-distances-i", title: "Tree Distances I", url: "https://cses.fi/problemset/task/1132", task: 1132, d: "M", difficulty: "medium", pattern: "cses-tree", tags: ["tree","bfs","diameter"], why: "Farthest node from every node: it is always one end of a diameter, so two BFS runs from the ends are enough." },
  { id: "cses-tree-distances-ii", title: "Tree Distances II", url: "https://cses.fi/problemset/task/1133", task: 1133, d: "H", difficulty: "hard", pattern: "cses-tree", tags: ["tree","rerooting","dp"], why: "Rerooting: the sum of distances to every node, computed from the parent's sum in O(1) per node." },
  { id: "cses-company-queries-i", title: "Company Queries I", url: "https://cses.fi/problemset/task/1687", task: 1687, d: "M", difficulty: "medium", pattern: "cses-tree", tags: ["tree","binary-lifting"], why: "k-th ancestor queries with binary lifting: jump by powers of two in O(log n) per query." },
  { id: "cses-company-queries-ii", title: "Company Queries II", url: "https://cses.fi/problemset/task/1688", task: 1688, d: "M", difficulty: "medium", pattern: "cses-tree", tags: ["tree","lca","binary-lifting"], why: "Lowest common ancestor of two employees by binary lifting: equalise depths, then jump both up together." },
  { id: "cses-distance-queries", title: "Distance Queries", url: "https://cses.fi/problemset/task/1135", task: 1135, d: "M", difficulty: "medium", pattern: "cses-tree", tags: ["tree","lca","binary-lifting"], why: "Distance between two nodes is depth(a) + depth(b) - 2 * depth(lca): LCA turns it into a formula." },
  { id: "cses-counting-paths", title: "Counting Paths", url: "https://cses.fi/problemset/task/1136", task: 1136, d: "H", difficulty: "hard", pattern: "cses-tree", tags: ["tree","lca","difference-array"], why: "Tree difference array: +1 at both ends, -1 at the LCA and its parent, then add up subtrees bottom-up." },
  { id: "cses-subtree-queries", title: "Subtree Queries", url: "https://cses.fi/problemset/task/1137", task: 1137, d: "H", difficulty: "hard", pattern: "cses-tree", tags: ["tree","euler-tour","fenwick"], why: "Euler tour turns every subtree into one contiguous range, so point updates and subtree sums become a Fenwick tree." },
  { id: "cses-path-queries", title: "Path Queries", url: "https://cses.fi/problemset/task/1138", task: 1138, d: "H", difficulty: "hard", pattern: "cses-tree", tags: ["tree","euler-tour","fenwick"], why: "Root-to-node sums under point updates: an update becomes a range add over the node's subtree in Euler order." },
  { id: "cses-path-queries-ii", title: "Path Queries II", url: "https://cses.fi/problemset/task/2134", task: 2134, d: "H", difficulty: "hard", pattern: "cses-tree", tags: ["tree","hld","segment-tree"], why: "Maximum on a tree path with point updates: heavy-light decomposition cuts any path into O(log n) array ranges." },
  { id: "cses-distinct-colors", title: "Distinct Colors", url: "https://cses.fi/problemset/task/1139", task: 1139, d: "H", difficulty: "hard", pattern: "cses-tree", tags: ["tree","euler-tour","offline","fenwick"], why: "Number of distinct values per subtree: Euler tour plus offline distinct-count queries with a Fenwick tree." },
  { id: "cses-finding-a-centroid", title: "Finding a Centroid", url: "https://cses.fi/problemset/task/2079", task: 2079, d: "M", difficulty: "medium", pattern: "cses-tree", tags: ["tree","subtree-size","centroid"], why: "A centroid keeps every remaining component at most n / 2: walk the subtree sizes to find it." },
  { id: "cses-fixed-length-paths-i", title: "Fixed-Length Paths I", url: "https://cses.fi/problemset/task/2080", task: 2080, d: "H", difficulty: "hard", pattern: "cses-tree", tags: ["tree","centroid-decomposition"], why: "Counting paths of an exact length: centroid decomposition counts the paths through each centroid in linear time." },
  { id: "cses-fixed-length-paths-ii", title: "Fixed-Length Paths II", url: "https://cses.fi/problemset/task/2081", task: 2081, d: "H", difficulty: "hard", pattern: "cses-tree", tags: ["tree","centroid-decomposition","fenwick"], why: "Counting paths with length in a range: centroid decomposition with a Fenwick tree over depths." },
];
