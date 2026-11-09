import type { ProblemSpec } from "./types";

// Batch 7: graphs, shortest paths, backtracking. Written for this app.

export const LEETCODE_SPECS_7: ProblemSpec[] = [
  {
    id: "lc-207",
    source: "leetcode",
    title: "Course Schedule",
    statement: [
      "There are numCourses courses numbered 0 to numCourses - 1. Each pair [a, b] in prerequisites means you must finish course b before course a.",
      "Return true if it is possible to finish all courses, and false if the prerequisites contain a cycle that makes it impossible.",
    ],
    constraints: ["1 <= numCourses <= 2000","0 <= prerequisites.length <= 5000","0 <= a, b < numCourses","all pairs are distinct"],
    fn: {name: "canFinish",params: [{name: "numCourses",type: "int"},{name: "prerequisites",type: "int[][]"}],returns: "bool"},
    examples: [
      { input: [2,[[1,0]]], output: true },
      { input: [2,[[1,0],[0,1]]], output: false, explanation: "Each course needs the other first." },
    ],
    tests: [
      { input: [1,[]], output: true },
      { input: [3,[]], output: true },
      { input: [3,[[1,0],[2,1]]], output: true },
      { input: [3,[[1,0],[2,1],[0,2]]], output: false },
      { input: [4,[[1,0],[2,0],[3,1],[3,2]]], output: true },
      { input: [2,[[0,0]]], output: false },
      { input: [5,[[1,0],[2,1],[3,2],[4,3],[2,4]]], output: false },
    ],
    hints: [
      "Model courses as nodes and prerequisites as directed edges. A valid plan exists exactly when the graph has no cycle.",
      "Count how many prerequisites each course still has (its in-degree). Courses with zero can be taken now.",
      "Kahn's algorithm: repeatedly take a course with in-degree 0, and lower the in-degree of the courses that depend on it. If you take all of them, the answer is true.",
    ],
    solution: {
      idea: [
        "Topological sort with in-degrees. Queue all courses with no prerequisites; when a course is taken, decrement its dependents and queue those that reach 0. The schedule exists if and only if all courses get taken.",
      ],
      complexity: "O(V + E) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> g(numCourses);
        vector<int> indeg(numCourses, 0);
        for (auto& p : prerequisites) { g[p[1]].push_back(p[0]); indeg[p[0]]++; }
        queue<int> q;
        for (int i = 0; i < numCourses; i++) if (indeg[i] == 0) q.push(i);
        int taken = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            taken++;
            for (int v : g[u]) if (--indeg[v] == 0) q.push(v);
        }
        return taken == numCourses;
    }
};
`,
    },
  },
  {
    id: "lc-210",
    source: "leetcode",
    title: "Course Schedule II",
    statement: [
      "Same setting as Course Schedule: a pair [a, b] means course b must be taken before course a. Return an order in which you can take all the courses, or an empty array if that is impossible.",
      "Many orders can be valid. To make the answer unique, return the lexicographically smallest one: at each step take the smallest course number that is available.",
    ],
    constraints: ["1 <= numCourses <= 2000","0 <= prerequisites.length <= 5000","0 <= a, b < numCourses","all pairs are distinct"],
    fn: {name: "findOrder",params: [{name: "numCourses",type: "int"},{name: "prerequisites",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [2,[[1,0]]], output: [0,1] },
      { input: [4,[[1,0],[2,0],[3,1],[3,2]]], output: [0,1,2,3], explanation: "0 first; then 1 and 2 are free and 1 is smaller; then 2; then 3." },
      { input: [1,[]], output: [0] },
    ],
    tests: [
      { input: [3,[]], output: [0,1,2] },
      { input: [3,[[0,1],[1,2]]], output: [2,1,0] },
      { input: [3,[[1,0],[2,1],[0,2]]], output: [] },
      { input: [4,[[0,3],[1,3],[2,3]]], output: [3,0,1,2] },
      { input: [5,[[4,0],[3,0],[2,1]]], output: [0,1,2,3,4] },
      { input: [2,[[1,0],[0,1]]], output: [] },
      { input: [4,[[1,0],[3,2]]], output: [0,1,2,3] },
    ],
    hints: [
      "This is a topological sort. It also tells you when there is a cycle.",
      "Process courses whose prerequisites are all done. Output a course when you take it.",
      "To get the smallest order, keep the available courses in a min-heap instead of a plain queue. If fewer than numCourses were output, return an empty array.",
    ],
    solution: {
      idea: [
        "Kahn's algorithm with a min-heap of zero in-degree courses. Taking the smallest available course every time gives the lexicographically smallest topological order. If the output is shorter than numCourses, a cycle exists.",
      ],
      complexity: "O((V + E) log V) time, O(V + E) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> findOrder(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> g(numCourses);
        vector<int> indeg(numCourses, 0);
        for (auto& p : prerequisites) { g[p[1]].push_back(p[0]); indeg[p[0]]++; }
        priority_queue<int, vector<int>, greater<int>> pq;
        for (int i = 0; i < numCourses; i++) if (indeg[i] == 0) pq.push(i);
        vector<int> order;
        while (!pq.empty()) {
            int u = pq.top(); pq.pop();
            order.push_back(u);
            for (int v : g[u]) if (--indeg[v] == 0) pq.push(v);
        }
        if ((int)order.size() != numCourses) return {};
        return order;
    }
};
`,
    },
  },
  {
    id: "lc-2050",
    source: "leetcode",
    title: "Parallel Courses III",
    statement: [
      "There are n courses numbered 1 to n. A relation [a, b] means course a must be finished before course b can start. time[i] is how many months course i + 1 takes.",
      "You can take any number of courses at the same time, as long as their prerequisites are finished. Return the minimum number of months needed to finish every course. The relations never form a cycle.",
    ],
    constraints: ["1 <= n <= 50000","0 <= relations.length <= 50000","1 <= a, b <= n and a != b","time.length == n","1 <= time[i] <= 10000","the graph has no cycle"],
    fn: {name: "minimumTime",params: [{name: "n",type: "int"},{name: "relations",type: "int[][]"},{name: "time",type: "int[]"}],returns: "int"},
    examples: [
      { input: [3,[[1,3],[2,3]],[3,2,5]], output: 8, explanation: "Courses 1 and 2 run together (3 months), then course 3 takes 5." },
      { input: [5,[[1,5],[2,5],[3,5],[3,4],[4,5]],[1,2,3,4,5]], output: 12 },
    ],
    tests: [
      { input: [1,[],[7]], output: 7 },
      { input: [3,[],[4,9,2]], output: 9 },
      { input: [3,[[1,2],[2,3]],[1,2,3]], output: 6 },
      { input: [4,[[1,2],[1,3],[2,4],[3,4]],[2,5,1,3]], output: 10 },
      { input: [4,[[4,3],[3,2],[2,1]],[1,1,1,1]], output: 4 },
      { input: [5,[[1,2],[3,2],[4,5]],[10,1,10,3,3]], output: 11 },
    ],
    hints: [
      "A course can start as soon as the last of its prerequisites ends.",
      "So finish[c] = time[c] + max(finish of its prerequisites), or just time[c] if it has none.",
      "Process the courses in topological order (Kahn's algorithm) and keep finish[] up to date. The answer is the maximum finish time.",
    ],
    solution: {
      idea: [
        "Longest path in a DAG. In topological order, propagate start[next] = max(start[next], finish[cur]) along every edge, with finish[c] = start[c] + time[c]. The answer is the largest finish.",
      ],
      complexity: "O(n + E) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minimumTime(int n, vector<vector<int>>& relations, vector<int>& time) {
        vector<vector<int>> g(n + 1);
        vector<int> indeg(n + 1, 0), start(n + 1, 0);
        for (auto& r : relations) { g[r[0]].push_back(r[1]); indeg[r[1]]++; }
        queue<int> q;
        for (int i = 1; i <= n; i++) if (indeg[i] == 0) q.push(i);
        int best = 0;
        while (!q.empty()) {
            int u = q.front(); q.pop();
            int fin = start[u] + time[u - 1];
            best = max(best, fin);
            for (int v : g[u]) {
                start[v] = max(start[v], fin);
                if (--indeg[v] == 0) q.push(v);
            }
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-547",
    source: "leetcode",
    title: "Number of Provinces",
    statement: [
      "There are n cities. isConnected[i][j] is 1 if city i and city j are directly connected, otherwise 0 (the matrix is symmetric and every city is connected to itself).",
      "A province is a group of cities connected directly or through other cities, with no connection to outside cities. Return the number of provinces.",
    ],
    constraints: ["1 <= n <= 200","isConnected[i][j] is 0 or 1","isConnected[i][i] == 1","isConnected[i][j] == isConnected[j][i]"],
    fn: {name: "findCircleNum",params: [{name: "isConnected",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[1,1,0],[1,1,0],[0,0,1]]], output: 2 },
      { input: [[[1,0,0],[0,1,0],[0,0,1]]], output: 3 },
    ],
    tests: [
      { input: [[[1]]], output: 1 },
      { input: [[[1,1],[1,1]]], output: 1 },
      { input: [[[1,0],[0,1]]], output: 2 },
      { input: [[[1,1,1],[1,1,1],[1,1,1]]], output: 1 },
      { input: [[[1,0,0,1],[0,1,1,0],[0,1,1,0],[1,0,0,1]]], output: 2 },
      { input: [[[1,1,0,0],[1,1,1,0],[0,1,1,0],[0,0,0,1]]], output: 2 },
    ],
    hints: [
      "Count connected components of an undirected graph.",
      "Walk from an unvisited city with DFS or BFS, mark everything reachable, and add one to the count.",
      "A union-find (disjoint set) works too: start with n sets, and each successful union reduces the count by one.",
    ],
    solution: {
      idea: [
        "DFS over the adjacency matrix. Each time you start a new search from an unvisited city you have found a new province.",
      ],
      complexity: "O(n^2) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    void dfs(vector<vector<int>>& m, vector<bool>& seen, int u) {
        seen[u] = true;
        for (int v = 0; v < (int)m.size(); v++)
            if (m[u][v] && !seen[v]) dfs(m, seen, v);
    }
public:
    int findCircleNum(vector<vector<int>>& isConnected) {
        int n = (int)isConnected.size(), count = 0;
        vector<bool> seen(n, false);
        for (int i = 0; i < n; i++)
            if (!seen[i]) { count++; dfs(isConnected, seen, i); }
        return count;
    }
};
`,
    },
  },
  {
    id: "lc-721",
    source: "leetcode",
    title: "Accounts Merge",
    statement: [
      "Each account is a list whose first item is a person's name and the rest are email addresses. Two accounts belong to the same person if they share at least one email. Different people may have the same name.",
      "Merge the accounts of each person. Return the merged accounts as lists with the name first and the emails sorted in increasing order. The accounts may be returned in any order.",
    ],
    constraints: ["1 <= accounts.length <= 1000","2 <= accounts[i].length <= 10","names and emails are short lowercase or mixed-case strings","all accounts that share an email have the same name"],
    fn: {name: "accountsMerge",params: [{name: "accounts",type: "string[][]"}],returns: "string[][]"},
    examples: [
      { input: [[["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]], output: [["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]] },
    ],
    tests: [
      { input: [[["A","a@x.com"]]], output: [["A","a@x.com"]] },
      { input: [[["A","a@x.com"],["A","b@x.com"]]], output: [["A","a@x.com"],["A","b@x.com"]] },
      { input: [[["A","a@x.com","b@x.com"],["A","b@x.com","c@x.com"]]], output: [["A","a@x.com","b@x.com","c@x.com"]] },
      { input: [[["A","c@x.com"],["B","d@x.com"],["A","e@x.com","c@x.com"]]], output: [["B","d@x.com"],["A","c@x.com","e@x.com"]] },
      { input: [[["Bo","z@y.com","a@y.com"],["Cy","m@y.com"],["Bo","a@y.com","q@y.com"],["Bo","q@y.com","r@y.com"]]], output: [["Bo","a@y.com","q@y.com","r@y.com","z@y.com"],["Cy","m@y.com"]] },
      { input: [[["X","1@e.com"],["X","2@e.com"],["X","3@e.com"],["X","1@e.com","3@e.com"]]], output: [["X","1@e.com","3@e.com"],["X","2@e.com"]] },
    ],
    unordered: true,
    hints: [
      "An email is the thing that links accounts. Think of emails as the nodes of a graph.",
      "Union-find: give every email an owner, and union all the emails inside one account. Remember the name for each email.",
      "After all unions, group the emails by their root, sort each group, and put the name in front.",
    ],
    solution: {
      idea: [
        "Disjoint set over emails. For every account, union its first email with each later one. Then collect emails by root, sort them, and prepend the account name. Same name does not mean same person: only a shared email does.",
      ],
      complexity: "O(N log N) time for N emails in total (sorting), O(N) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    vector<int> par;
    int find(int x) { return par[x] == x ? x : par[x] = find(par[x]); }
public:
    vector<vector<string>> accountsMerge(vector<vector<string>>& accounts) {
        map<string, int> id;
        vector<string> emails, owner;
        for (auto& a : accounts)
            for (size_t i = 1; i < a.size(); i++)
                if (!id.count(a[i])) { id[a[i]] = (int)emails.size(); emails.push_back(a[i]); owner.push_back(a[0]); }
        par.resize(emails.size());
        iota(par.begin(), par.end(), 0);
        for (auto& a : accounts)
            for (size_t i = 2; i < a.size(); i++) par[find(id[a[i]])] = find(id[a[1]]);
        map<int, vector<string>> groups;
        for (size_t i = 0; i < emails.size(); i++) groups[find((int)i)].push_back(emails[i]);
        vector<vector<string>> out;
        for (auto& [root, list] : groups) {
            sort(list.begin(), list.end());
            list.insert(list.begin(), owner[root]);
            out.push_back(list);
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-684",
    source: "leetcode",
    title: "Redundant Connection",
    statement: [
      "A tree with n nodes (numbered 1 to n) had one extra edge added, so it now has exactly one cycle. The edges are given in the order they were added.",
      "Return an edge that can be removed so the rest is a tree again. If several edges could be removed, return the one that appears last in the input.",
    ],
    constraints: ["3 <= n <= 1000","edges.length == n","1 <= a < b <= n","no repeated edges","the graph is connected"],
    fn: {name: "findRedundantConnection",params: [{name: "edges",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [[[1,2],[1,3],[2,3]]], output: [2,3] },
      { input: [[[1,2],[2,3],[3,4],[1,4],[1,5]]], output: [1,4] },
    ],
    tests: [
      { input: [[[1,2],[2,3],[1,3]]], output: [1,3] },
      { input: [[[1,2],[1,3],[1,4],[3,4]]], output: [3,4] },
      { input: [[[1,2],[2,3],[3,4],[4,5],[1,5]]], output: [1,5] },
      { input: [[[1,4],[3,4],[1,3],[1,2],[4,5]]], output: [1,3] },
      { input: [[[2,7],[7,8],[3,6],[2,5],[6,8],[4,8],[2,8],[1,8],[7,10],[3,9]]], output: [2,8] },
      { input: [[[1,2],[1,3],[2,3],[3,4]]], output: [2,3] },
    ],
    hints: [
      "Add the edges one by one. When does an edge create the cycle?",
      "When its two endpoints are already connected through earlier edges.",
      "Use union-find. Before uniting the endpoints of an edge, check whether they already share a root. The first edge for which they do is the answer.",
    ],
    solution: {
      idea: [
        "Disjoint set union. Process the edges in order; the edge whose endpoints are already in the same set closes the cycle. Because only one extra edge exists, that edge is the last one that can be removed.",
      ],
      complexity: "O(n * alpha(n)) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    vector<int> par;
    int find(int x) { return par[x] == x ? x : par[x] = find(par[x]); }
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = (int)edges.size();
        par.resize(n + 1);
        iota(par.begin(), par.end(), 0);
        for (auto& e : edges) {
            int a = find(e[0]), b = find(e[1]);
            if (a == b) return e;
            par[a] = b;
        }
        return {};
    }
};
`,
    },
  },
  {
    id: "lc-743",
    source: "leetcode",
    title: "Network Delay Time",
    statement: [
      "A network has n nodes labelled 1 to n. times[i] = [u, v, w] means a signal sent from u arrives at v after w time units (a directed edge).",
      "A signal is sent from node k. Return how long it takes for every node to receive it, or -1 if some node never does.",
    ],
    constraints: ["1 <= k <= n <= 100","1 <= times.length <= 6000","1 <= u, v <= n and u != v","0 <= w <= 100","each (u, v) pair appears at most once"],
    fn: {name: "networkDelayTime",params: [{name: "times",type: "int[][]"},{name: "n",type: "int"},{name: "k",type: "int"}],returns: "int"},
    examples: [
      { input: [[[2,1,1],[2,3,1],[3,4,1]],4,2], output: 2 },
      { input: [[[1,2,1]],2,1], output: 1 },
      { input: [[[1,2,1]],2,2], output: -1 },
    ],
    tests: [
      { input: [[],1,1], output: 0 },
      { input: [[[1,2,0]],2,1], output: 0 },
      { input: [[[1,2,5],[1,3,2],[3,2,1]],3,1], output: 3 },
      { input: [[[1,2,1],[2,3,2],[1,3,4]],3,1], output: 3 },
      { input: [[[1,2,1],[3,2,1]],3,1], output: -1 },
      { input: [[[1,2,1],[2,1,3],[2,3,1],[3,4,100]],4,1], output: 102 },
    ],
    hints: [
      "The time a node receives the signal is the length of the shortest path from k.",
      "All weights are non-negative, so Dijkstra's algorithm applies.",
      "Run Dijkstra from k with a min-heap. The answer is the largest shortest distance; if any node is unreachable, return -1.",
    ],
    solution: {
      idea: [
        "Single-source shortest paths with Dijkstra and a priority queue. The delay is the maximum of all shortest distances, or -1 when a node stays at infinity.",
      ],
      complexity: "O(E log V) time, O(V + E) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        vector<vector<pair<int, int>>> g(n + 1);
        for (auto& t : times) g[t[0]].push_back({t[1], t[2]});
        vector<int> dist(n + 1, INT_MAX);
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
        dist[k] = 0;
        pq.push({0, k});
        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (d > dist[u]) continue;
            for (auto [v, w] : g[u])
                if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
        }
        int best = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == INT_MAX) return -1;
            best = max(best, dist[i]);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-787",
    source: "leetcode",
    title: "Cheapest Flights Within K Stops",
    statement: [
      "There are n cities and flights[i] = [from, to, price]. Find the cheapest price to travel from src to dst using at most k stops in between (so at most k + 1 flights). Return -1 if no such trip exists.",
      "The cheapest path overall may use too many stops, so plain Dijkstra on price is not enough.",
    ],
    constraints: ["1 <= n <= 100","0 <= flights.length <= n * (n - 1) / 2","0 <= from, to < n and from != to","1 <= price <= 10000","0 <= src, dst, k < n and src != dst","there are no repeated flights"],
    fn: {name: "findCheapestPrice",params: [{name: "n",type: "int"},{name: "flights",type: "int[][]"},{name: "src",type: "int"},{name: "dst",type: "int"},{name: "k",type: "int"}],returns: "int"},
    examples: [
      { input: [4,[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]],0,3,1], output: 700 },
      { input: [3,[[0,1,100],[1,2,100],[0,2,500]],0,2,1], output: 200 },
      { input: [3,[[0,1,100],[1,2,100],[0,2,500]],0,2,0], output: 500 },
    ],
    tests: [
      { input: [2,[],0,1,0], output: -1 },
      { input: [2,[[0,1,7]],0,1,0], output: 7 },
      { input: [3,[[0,1,1],[1,2,1]],0,2,0], output: -1 },
      { input: [3,[[0,1,1],[1,2,1]],0,2,1], output: 2 },
      { input: [4,[[0,1,1],[1,2,1],[2,3,1],[0,3,10]],0,3,1], output: 10 },
      { input: [4,[[0,1,1],[1,2,1],[2,3,1],[0,3,10]],0,3,2], output: 3 },
      { input: [5,[[0,1,5],[1,2,5],[0,3,2],[3,1,2],[1,4,1],[4,2,1]],0,2,2], output: 7 },
    ],
    hints: [
      "The number of flights matters as well as the price, so state = (city, flights used).",
      "Bellman-Ford fits: run k + 1 rounds, each round relaxing every flight using the prices from the previous round only.",
      "Copy the distance array at the start of each round and relax from the old copy, so one round adds at most one flight.",
    ],
    solution: {
      idea: [
        "Bellman-Ford limited to k + 1 rounds. dist[v] is the best price using at most the current number of flights. Each round relaxes all edges from a snapshot of the previous round, so the path length grows by at most one per round.",
      ],
      complexity: "O(k * E) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
        const int INF = 1e9;
        vector<int> dist(n, INF);
        dist[src] = 0;
        for (int round = 0; round <= k; round++) {
            vector<int> next = dist;
            for (auto& f : flights)
                if (dist[f[0]] < INF) next[f[1]] = min(next[f[1]], dist[f[0]] + f[2]);
            dist = next;
        }
        return dist[dst] >= INF ? -1 : dist[dst];
    }
};
`,
    },
  },
  {
    id: "lc-1631",
    source: "leetcode",
    title: "Path With Minimum Effort",
    statement: [
      "A grid of heights is given. You start at the top-left cell and want to reach the bottom-right cell, moving up, down, left or right.",
      "The effort of a route is the largest absolute height difference between two consecutive cells on it. Return the smallest effort over all routes.",
    ],
    constraints: ["1 <= rows, columns <= 100","1 <= heights[i][j] <= 1000000"],
    fn: {name: "minimumEffortPath",params: [{name: "heights",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[1,2,2],[3,8,2],[5,3,5]]], output: 2 },
      { input: [[[1,2,3],[3,8,4],[5,3,5]]], output: 1 },
      { input: [[[1,2,1,1,1],[1,2,1,2,1],[1,2,1,2,1],[1,2,1,2,1],[1,1,1,2,1]]], output: 0 },
    ],
    tests: [
      { input: [[[7]]], output: 0 },
      { input: [[[1,10]]], output: 9 },
      { input: [[[1],[5],[2]]], output: 4 },
      { input: [[[1,1000000],[1000000,1]]], output: 999999 },
      { input: [[[4,3,4,10,5,5,9,2],[10,8,2,10,9,7,5,6],[5,8,10,10,10,7,4,2],[5,1,3,1,1,3,1,9],[6,4,10,6,10,9,4,6]]], output: 5 },
      { input: [[[3,3],[3,3]]], output: 0 },
    ],
    hints: [
      "This is a shortest path, but the cost of a route is its largest step, not the sum.",
      "Dijkstra works with the cost of reaching a cell defined as max(cost so far, this step's difference).",
      "Alternatively binary search the effort limit E and check with BFS whether the end is reachable using only steps of at most E.",
    ],
    solution: {
      idea: [
        "Dijkstra with a bottleneck cost. dist[cell] is the smallest possible maximum step on a route to it. Moving to a neighbour gives max(dist[cell], |difference|); pop cells in increasing dist order and relax.",
      ],
      complexity: "O(R * C log(R * C)) time, O(R * C) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minimumEffortPath(vector<vector<int>>& h) {
        int r = (int)h.size(), c = (int)h[0].size();
        vector<vector<int>> dist(r, vector<int>(c, INT_MAX));
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> pq;
        dist[0][0] = 0;
        pq.push({0, 0, 0});
        int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
        while (!pq.empty()) {
            auto [d, x, y] = pq.top(); pq.pop();
            if (d > dist[x][y]) continue;
            if (x == r - 1 && y == c - 1) return d;
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c) continue;
                int nd = max(d, abs(h[nx][ny] - h[x][y]));
                if (nd < dist[nx][ny]) { dist[nx][ny] = nd; pq.push({nd, nx, ny}); }
            }
        }
        return 0;
    }
};
`,
    },
  },
  {
    id: "lc-778",
    source: "leetcode",
    title: "Swim in Rising Water",
    statement: [
      "An n by n grid holds the distinct numbers 0 to n * n - 1: grid[i][j] is the elevation of that cell. At time t the water level is t, and you can stand on or move into a cell only if its elevation is at most t. You can swim any distance instantly.",
      "Starting at the top-left cell at time 0, return the least time at which you can reach the bottom-right cell.",
    ],
    constraints: ["n == grid.length == grid[i].length","1 <= n <= 50","0 <= grid[i][j] < n * n","all values are distinct"],
    fn: {name: "swimInWater",params: [{name: "grid",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[0,2],[1,3]]], output: 3, explanation: "The end cell itself has elevation 3, so you must wait until time 3." },
      { input: [[[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]]], output: 16 },
    ],
    tests: [
      { input: [[[0]]], output: 0 },
      { input: [[[0,1],[2,3]]], output: 3 },
      { input: [[[3,2],[0,1]]], output: 3 },
      { input: [[[0,3],[1,2]]], output: 2 },
      { input: [[[0,1,2],[3,4,5],[6,7,8]]], output: 8 },
      { input: [[[8,7,6],[5,4,3],[2,1,0]]], output: 8 },
      { input: [[[6,0,3],[5,2,1],[8,7,4]]], output: 6 },
    ],
    hints: [
      "The answer is the smallest water level t for which a path of cells all with elevation <= t exists.",
      "That is the same bottleneck-path problem as 'minimum effort': minimise the largest elevation on the route.",
      "Dijkstra with a min-heap keyed by the maximum elevation seen on the way. The first time you pop the end cell, you have the answer.",
    ],
    solution: {
      idea: [
        "Bottleneck shortest path. cost(cell) = max(cost of the previous cell, its elevation). A heap pops the cheapest frontier cell; the cost when the bottom-right cell is popped is the minimum time. Binary search on t with a flood fill also works.",
      ],
      complexity: "O(n^2 log n) time, O(n^2) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int swimInWater(vector<vector<int>>& grid) {
        int n = (int)grid.size();
        vector<vector<bool>> seen(n, vector<bool>(n, false));
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> pq;
        pq.push({grid[0][0], 0, 0});
        seen[0][0] = true;
        int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
        while (!pq.empty()) {
            auto [t, x, y] = pq.top(); pq.pop();
            if (x == n - 1 && y == n - 1) return t;
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen[nx][ny]) continue;
                seen[nx][ny] = true;
                pq.push({max(t, grid[nx][ny]), nx, ny});
            }
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "lc-2290",
    source: "leetcode",
    title: "Minimum Obstacle Removal to Reach Corner",
    statement: [
      "A grid has 0 for an empty cell and 1 for an obstacle. You start at the top-left corner and want to reach the bottom-right corner, moving up, down, left or right. You may remove obstacles, one at a time, by walking into them.",
      "Return the minimum number of obstacles that must be removed. The start and end cells are empty.",
    ],
    constraints: ["1 <= rows, columns <= 100000","2 <= rows * columns <= 100000","grid[i][j] is 0 or 1","grid[0][0] == grid[rows - 1][columns - 1] == 0"],
    fn: {name: "minimumObstacles",params: [{name: "grid",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[0,1,1],[1,1,0],[1,1,0]]], output: 2 },
      { input: [[[0,1,0,0,0],[0,1,0,1,0],[0,0,0,1,0]]], output: 0 },
    ],
    tests: [
      { input: [[[0,0]]], output: 0 },
      { input: [[[0],[0]]], output: 0 },
      { input: [[[0,1],[1,0]]], output: 1 },
      { input: [[[0,1,1,1],[0,0,0,0]]], output: 0 },
      { input: [[[0,1,0],[0,1,0],[0,1,0]]], output: 1 },
      { input: [[[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0]]], output: 4 },
      { input: [[[0,0,0],[1,1,0],[0,0,0]]], output: 0 },
    ],
    hints: [
      "Think of each cell as costing 1 to enter if it holds an obstacle and 0 otherwise. You want the cheapest route.",
      "Dijkstra works, but every edge weight is only 0 or 1.",
      "A deque does it in linear time (0-1 BFS): push a 0-cost neighbour to the front and a 1-cost neighbour to the back.",
    ],
    solution: {
      idea: [
        "0-1 BFS. dist[cell] is the fewest obstacles removed to get there. Entering an empty cell costs 0 (push front), entering an obstacle costs 1 (push back). The deque always holds distances in non-decreasing order, so each cell is settled once.",
      ],
      complexity: "O(rows * columns) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minimumObstacles(vector<vector<int>>& grid) {
        int r = (int)grid.size(), c = (int)grid[0].size();
        vector<vector<int>> dist(r, vector<int>(c, INT_MAX));
        deque<pair<int, int>> dq;
        dist[0][0] = 0;
        dq.push_back({0, 0});
        int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
        while (!dq.empty()) {
            auto [x, y] = dq.front(); dq.pop_front();
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c) continue;
                int w = grid[nx][ny];
                if (dist[x][y] + w < dist[nx][ny]) {
                    dist[nx][ny] = dist[x][y] + w;
                    if (w == 0) dq.push_front({nx, ny}); else dq.push_back({nx, ny});
                }
            }
        }
        return dist[r - 1][c - 1];
    }
};
`,
    },
  },
  {
    id: "lc-1334",
    source: "leetcode",
    title: "Find the City With the Smallest Number of Neighbors at a Threshold Distance",
    statement: [
      "There are n cities (0 to n - 1) joined by weighted two-way roads edges[i] = [a, b, w]. For each city count how many other cities can be reached with a shortest-path distance of at most distanceThreshold.",
      "Return the city with the fewest reachable cities. If several cities tie, return the one with the largest number.",
    ],
    constraints: ["2 <= n <= 100","1 <= edges.length <= n * (n - 1) / 2","0 <= a < b < n","1 <= w, distanceThreshold <= 10000","all pairs (a, b) are distinct"],
    fn: {name: "findTheCity",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"},{name: "distanceThreshold",type: "int"}],returns: "int"},
    examples: [
      { input: [4,[[0,1,3],[1,2,1],[1,3,4],[2,3,1]],4], output: 3 },
      { input: [5,[[0,1,2],[0,4,8],[1,2,3],[1,4,2],[2,3,1],[3,4,1]],2], output: 0 },
    ],
    tests: [
      { input: [2,[[0,1,5]],4], output: 1 },
      { input: [2,[[0,1,5]],5], output: 1 },
      { input: [3,[[0,1,1],[1,2,1]],1], output: 2 },
      { input: [3,[[0,1,1],[1,2,1]],2], output: 2 },
      { input: [4,[[0,1,1],[2,3,1]],5], output: 3 },
      { input: [4,[[0,1,10],[0,2,1],[2,3,1],[1,3,1]],4], output: 3 },
    ],
    hints: [
      "You need the shortest distance between every pair of cities, and n is only 100.",
      "Floyd-Warshall computes all pairs in O(n^3): for each middle city k, try dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).",
      "Then count, for each city, the others within the threshold, and pick the smallest count, preferring the larger index on ties.",
    ],
    solution: {
      idea: [
        "All-pairs shortest paths with Floyd-Warshall (use a large INF, and take care not to add two INF values together). Count neighbours within the threshold and keep the best city, with ties broken towards the larger number.",
      ],
      complexity: "O(n^3) time, O(n^2) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findTheCity(int n, vector<vector<int>>& edges, int distanceThreshold) {
        const long long INF = 1e15;
        vector<vector<long long>> d(n, vector<long long>(n, INF));
        for (int i = 0; i < n; i++) d[i][i] = 0;
        for (auto& e : edges) d[e[0]][e[1]] = d[e[1]][e[0]] = e[2];
        for (int k = 0; k < n; k++)
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++)
                    d[i][j] = min(d[i][j], d[i][k] + d[k][j]);
        int best = -1, bestCount = INT_MAX;
        for (int i = 0; i < n; i++) {
            int cnt = 0;
            for (int j = 0; j < n; j++) if (i != j && d[i][j] <= distanceThreshold) cnt++;
            if (cnt <= bestCount) { bestCount = cnt; best = i; }
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-1584",
    source: "leetcode",
    title: "Min Cost to Connect All Points",
    statement: [
      "You are given points on a plane. The cost of connecting two points is the Manhattan distance |x1 - x2| + |y1 - y2|.",
      "Return the minimum total cost to connect all the points so that there is exactly one simple path between any two of them (a minimum spanning tree).",
    ],
    constraints: ["1 <= points.length <= 1000","-1000000 <= x, y <= 1000000","all points are distinct"],
    fn: {name: "minCostConnectPoints",params: [{name: "points",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[0,0],[2,2],[3,10],[5,2],[7,0]]], output: 20 },
      { input: [[[3,12],[-2,5],[-4,1]]], output: 18 },
    ],
    tests: [
      { input: [[[0,0]]], output: 0 },
      { input: [[[0,0],[1,1]]], output: 2 },
      { input: [[[0,0],[0,1],[0,2],[0,3]]], output: 3 },
      { input: [[[-1000000,-1000000],[1000000,1000000]]], output: 4000000 },
      { input: [[[0,0],[1,0],[0,1],[1,1]]], output: 3 },
      { input: [[[2,-3],[-17,-8],[13,8],[-17,-15]]], output: 53 },
    ],
    hints: [
      "Every pair of points is a possible edge, which makes a complete graph. You want its minimum spanning tree.",
      "Kruskal sorts all about n^2 / 2 edges and uses union-find. Prim grows the tree from one point.",
      "For dense graphs Prim without a heap is simple: keep minDist[v] to the tree, repeatedly add the closest outside point, and update the others. O(n^2).",
    ],
    solution: {
      idea: [
        "Prim's algorithm in O(n^2). Start at point 0. Each round, pick the outside point with the smallest distance to the tree, add that distance to the total, and update the other points' best distances. Use long long for the sum.",
      ],
      complexity: "O(n^2) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minCostConnectPoints(vector<vector<int>>& p) {
        int n = (int)p.size();
        vector<long long> best(n, LLONG_MAX);
        vector<bool> in(n, false);
        best[0] = 0;
        long long total = 0;
        for (int it = 0; it < n; it++) {
            int u = -1;
            for (int i = 0; i < n; i++) if (!in[i] && (u == -1 || best[i] < best[u])) u = i;
            in[u] = true;
            total += best[u];
            for (int v = 0; v < n; v++) {
                if (in[v]) continue;
                long long d = llabs((long long)p[u][0] - p[v][0]) + llabs((long long)p[u][1] - p[v][1]);
                best[v] = min(best[v], d);
            }
        }
        return (int)total;
    }
};
`,
    },
  },
  {
    id: "lc-785",
    source: "leetcode",
    title: "Is Graph Bipartite?",
    statement: [
      "An undirected graph is given as an adjacency list: graph[u] lists the neighbours of node u (the lists are consistent, so v is in graph[u] exactly when u is in graph[v], and no node is its own neighbour). The graph may be disconnected.",
      "The graph is bipartite if its nodes can be split into two groups so that every edge joins nodes from different groups. Return true if it is.",
    ],
    constraints: ["1 <= n <= 100","0 <= graph[u].length < n","graph[u] has no repeated values and does not contain u","the adjacency lists are symmetric"],
    fn: {name: "isBipartite",params: [{name: "graph",type: "int[][]"}],returns: "bool"},
    examples: [
      { input: [[[1,2,3],[0,2],[0,1,3],[0,2]]], output: false, explanation: "Nodes 0, 1 and 2 form a triangle." },
      { input: [[[1,3],[0,2],[1,3],[0,2]]], output: true },
    ],
    tests: [
      { input: [[[]]], output: true },
      { input: [[[1],[0]]], output: true },
      { input: [[[1,2],[0,2],[0,1]]], output: false },
      { input: [[[],[2],[1]]], output: true },
      { input: [[[1],[0,2],[1,3],[2,4],[3]]], output: true },
      { input: [[[1,4],[0,2],[1,3],[2,4],[3,0]]], output: false },
      { input: [[[1,2],[0],[0],[4],[3]]], output: true },
    ],
    hints: [
      "Try to colour the nodes with two colours so that neighbours differ.",
      "Start a BFS or DFS from each uncoloured node. Give it a colour and give each neighbour the opposite colour.",
      "If you meet a neighbour that already has the same colour as the current node, there is an odd cycle: return false. Remember to start searches from every component.",
    ],
    solution: {
      idea: [
        "Two-colouring with BFS. Colour a start node 0, its neighbours 1, theirs 0, and so on. A conflict (an edge between two nodes of the same colour) proves an odd cycle, so the graph is not bipartite. Repeat from every uncoloured node.",
      ],
      complexity: "O(V + E) time, O(V) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isBipartite(vector<vector<int>>& graph) {
        int n = (int)graph.size();
        vector<int> color(n, -1);
        for (int s = 0; s < n; s++) {
            if (color[s] != -1) continue;
            color[s] = 0;
            queue<int> q;
            q.push(s);
            while (!q.empty()) {
                int u = q.front(); q.pop();
                for (int v : graph[u]) {
                    if (color[v] == -1) { color[v] = color[u] ^ 1; q.push(v); }
                    else if (color[v] == color[u]) return false;
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
    id: "lc-886",
    source: "leetcode",
    title: "Possible Bipartition",
    statement: [
      "n people are numbered 1 to n. dislikes[i] = [a, b] means person a and person b do not get along and must not be put in the same group.",
      "Return true if everyone can be split into two groups (either may be empty) so that no pair that dislikes each other is in the same group.",
    ],
    constraints: ["1 <= n <= 2000","0 <= dislikes.length <= 10000","1 <= a < b <= n","all pairs are distinct"],
    fn: {name: "possibleBipartition",params: [{name: "n",type: "int"},{name: "dislikes",type: "int[][]"}],returns: "bool"},
    examples: [
      { input: [4,[[1,2],[1,3],[2,4]]], output: true, explanation: "Groups {1, 4} and {2, 3}." },
      { input: [3,[[1,2],[1,3],[2,3]]], output: false },
    ],
    tests: [
      { input: [1,[]], output: true },
      { input: [2,[[1,2]]], output: true },
      { input: [5,[[1,2],[2,3],[3,4],[4,5],[1,5]]], output: false },
      { input: [5,[[1,2],[2,3],[3,4],[4,5]]], output: true },
      { input: [6,[[1,2],[3,4],[5,6]]], output: true },
      { input: [4,[[1,2],[2,3],[3,4],[1,4]]], output: true },
      { input: [7,[[1,2],[3,4],[4,5],[3,5]]], output: false },
    ],
    hints: [
      "Draw a graph where each dislike is an edge. What do the two groups look like?",
      "It is exactly the question of whether the graph is bipartite.",
      "Build the adjacency lists, then two-colour every component with BFS or DFS. A conflict means false.",
    ],
    solution: {
      idea: [
        "Same as testing bipartiteness: edges are dislikes; try to 2-colour each connected component. An odd cycle of dislikes makes it impossible.",
      ],
      complexity: "O(n + E) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool possibleBipartition(int n, vector<vector<int>>& dislikes) {
        vector<vector<int>> g(n + 1);
        for (auto& d : dislikes) { g[d[0]].push_back(d[1]); g[d[1]].push_back(d[0]); }
        vector<int> color(n + 1, -1);
        for (int s = 1; s <= n; s++) {
            if (color[s] != -1) continue;
            color[s] = 0;
            queue<int> q;
            q.push(s);
            while (!q.empty()) {
                int u = q.front(); q.pop();
                for (int v : g[u]) {
                    if (color[v] == -1) { color[v] = color[u] ^ 1; q.push(v); }
                    else if (color[v] == color[u]) return false;
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
    id: "lc-1192",
    source: "leetcode",
    title: "Critical Connections in a Network",
    statement: [
      "n servers (0 to n - 1) are joined by undirected cables connections[i] = [a, b]. The network is connected. A cable is critical if removing it would leave some servers unable to reach each other (a bridge).",
      "Return all critical connections, in any order. Each pair may be written in either direction.",
    ],
    constraints: ["2 <= n <= 100000","n - 1 <= connections.length <= 100000","0 <= a, b < n and a != b","no repeated cables","the network is connected"],
    fn: {name: "criticalConnections",params: [{name: "n",type: "int"},{name: "connections",type: "int[][]"}],returns: "int[][]"},
    examples: [
      { input: [4,[[0,1],[1,2],[2,0],[1,3]]], output: [[1,3]], explanation: "0, 1, 2 form a cycle, so only the cable to 3 is critical." },
      { input: [2,[[0,1]]], output: [[0,1]] },
    ],
    tests: [
      { input: [3,[[0,1],[1,2],[2,0]]], output: [] },
      { input: [3,[[0,1],[1,2]]], output: [[1,2],[0,1]] },
      { input: [4,[[0,1],[1,2],[2,3],[3,0]]], output: [] },
      { input: [5,[[0,1],[1,2],[2,0],[1,3],[3,4]]], output: [[3,4],[1,3]] },
      { input: [6,[[0,1],[1,2],[2,0],[2,3],[3,4],[4,5],[5,3]]], output: [[2,3]] },
      { input: [4,[[0,1],[0,2],[0,3]]], output: [[0,1],[0,2],[0,3]] },
    ],
    unordered: true,
    hints: [
      "A bridge is an edge that is not on any cycle.",
      "In a DFS tree, give each node a discovery time and a low-link: the earliest discovery time reachable from its subtree using at most one back edge.",
      "A tree edge (u, v) is a bridge when low[v] > disc[u]: nothing below v can climb back to u or above. Use an iterative DFS for 100000 nodes if recursion is risky.",
    ],
    solution: {
      idea: [
        "Tarjan's bridge-finding algorithm. disc[u] is the DFS entry time, low[u] the smallest disc reachable through the subtree plus one back edge. After visiting child v of u, set low[u] = min(low[u], low[v]); if low[v] > disc[u], the edge u-v is critical. Skip the edge back to the parent.",
      ],
      complexity: "O(V + E) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> criticalConnections(int n, vector<vector<int>>& connections) {
        vector<vector<pair<int, int>>> g(n);
        for (int i = 0; i < (int)connections.size(); i++) {
            g[connections[i][0]].push_back({connections[i][1], i});
            g[connections[i][1]].push_back({connections[i][0], i});
        }
        vector<int> disc(n, -1), low(n, 0), it(n, 0), parentEdge(n, -1), parent(n, -1);
        vector<vector<int>> out;
        int timer = 0;
        vector<int> st = {0};
        disc[0] = low[0] = timer++;
        while (!st.empty()) {
            int u = st.back();
            if (it[u] < (int)g[u].size()) {
                auto [v, id] = g[u][it[u]++];
                if (id == parentEdge[u]) continue;
                if (disc[v] == -1) {
                    disc[v] = low[v] = timer++;
                    parent[v] = u;
                    parentEdge[v] = id;
                    st.push_back(v);
                } else {
                    low[u] = min(low[u], disc[v]);
                }
            } else {
                st.pop_back();
                int p = parent[u];
                if (p != -1) {
                    low[p] = min(low[p], low[u]);
                    if (low[u] > disc[p]) out.push_back({p, u});
                }
            }
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-332",
    source: "leetcode",
    title: "Reconstruct Itinerary",
    statement: [
      "tickets[i] = [from, to] is a flight between two airports named by three capital letters. Use every ticket exactly once to build one trip that starts at JFK, and return the airports visited in order.",
      "If several trips are possible, return the one that is smallest in lexical order (compare the airport names one by one). A valid trip always exists.",
    ],
    constraints: ["1 <= tickets.length <= 300","from and to are 3 capital letters","from != to","a trip that uses every ticket starting at JFK exists"],
    fn: {name: "findItinerary",params: [{name: "tickets",type: "string[][]"}],returns: "string[]"},
    examples: [
      { input: [[["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]], output: ["JFK","MUC","LHR","SFO","SJC"] },
      { input: [[["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"],["ATL","SFO"]]], output: ["JFK","ATL","JFK","SFO","ATL","SFO"] },
    ],
    tests: [
      { input: [[["JFK","AAA"]]], output: ["JFK","AAA"] },
      { input: [[["JFK","AAA"],["AAA","JFK"]]], output: ["JFK","AAA","JFK"] },
      { input: [[["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]], output: ["JFK","NRT","JFK","KUL"] },
      { input: [[["JFK","BBB"],["JFK","AAA"],["AAA","JFK"],["BBB","CCC"]]], output: ["JFK","AAA","JFK","BBB","CCC"] },
      { input: [[["JFK","AAA"],["JFK","AAA"],["AAA","JFK"],["AAA","JFK"]]], output: ["JFK","AAA","JFK","AAA","JFK"] },
      { input: [[["JFK","ATL"],["ATL","JFK"],["JFK","SFO"],["SFO","ATL"],["ATL","SFO"]]], output: ["JFK","ATL","JFK","SFO","ATL","SFO"] },
    ],
    hints: [
      "You need a path that uses every edge exactly once: an Eulerian path.",
      "Greedily taking the smallest airport can get stuck at a dead end while tickets remain.",
      "Hierholzer's algorithm: DFS, always taking the smallest unused destination, and add an airport to the answer only when it has no tickets left. The answer is that list reversed.",
    ],
    solution: {
      idea: [
        "Hierholzer's algorithm with destinations sorted. Recursively follow the smallest unused ticket; when an airport has none left, push it to the route. Dead ends are pushed first, so reversing the list gives the lexically smallest Eulerian path.",
      ],
      complexity: "O(E log E) time, O(E) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    map<string, multiset<string>> g;
    vector<string> route;
    void visit(const string& a) {
        while (!g[a].empty()) {
            string next = *g[a].begin();
            g[a].erase(g[a].begin());
            visit(next);
        }
        route.push_back(a);
    }
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        g.clear();
        route.clear();
        for (auto& t : tickets) g[t[0]].insert(t[1]);
        visit("JFK");
        reverse(route.begin(), route.end());
        return route;
    }
};
`,
    },
  },
  {
    id: "lc-752",
    source: "leetcode",
    title: "Open the Lock",
    statement: [
      "A lock has four wheels, each showing a digit 0 to 9 and wrapping around (9 turns to 0 and 0 to 9). One move turns one wheel by one step. The lock starts at 0000.",
      "Some combinations are dead ends: if the lock shows one of them it stops turning. Return the minimum number of moves to reach the target, or -1 if that is impossible.",
    ],
    constraints: ["1 <= deadends.length <= 500","deadends[i] and target are 4-digit strings","target is not in deadends"],
    fn: {name: "openLock",params: [{name: "deadends",type: "string[]"},{name: "target",type: "string"}],returns: "int"},
    examples: [
      { input: [["0201","0101","0102","1212","2002"],"0202"], output: 6 },
      { input: [["8888"],"0009"], output: 1 },
      { input: [["8887","8889","8878","8898","8788","8988","7888","9888"],"8888"], output: -1 },
    ],
    tests: [
      { input: [["0000"],"0202"], output: -1 },
      { input: [[],"0000"], output: 0 },
      { input: [[],"0001"], output: 1 },
      { input: [[],"9999"], output: 4 },
      { input: [[],"5555"], output: 20 },
      { input: [["0100","1000","0010","0001","9000","0900","0090","0009"],"1111"], output: -1 },
      { input: [["0201","0101","0102","1212","2002"],"0000"], output: 0 },
    ],
    hints: [
      "Each lock state is a node; each state has 8 neighbours (4 wheels, 2 directions).",
      "Breadth-first search from 0000 finds the fewest moves.",
      "Put the dead ends in a set and treat them as already visited. If 0000 itself is a dead end, the answer is -1 (unless the target is 0000, which is not allowed in the input when it is a dead end).",
    ],
    solution: {
      idea: [
        "BFS over at most 10000 states. Mark the dead ends as visited up front; from each state generate the 8 neighbours by turning one wheel up or down; the first time the target is reached, its distance is the answer.",
      ],
      complexity: "O(10^4 * 8) time, O(10^4) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int openLock(vector<string>& deadends, string target) {
        unordered_set<string> seen(deadends.begin(), deadends.end());
        if (seen.count("0000")) return -1;
        if (target == "0000") return 0;
        queue<pair<string, int>> q;
        q.push({"0000", 0});
        seen.insert("0000");
        while (!q.empty()) {
            auto [s, d] = q.front(); q.pop();
            for (int i = 0; i < 4; i++) {
                for (int delta : {1, 9}) {
                    string t = s;
                    t[i] = char('0' + (t[i] - '0' + delta) % 10);
                    if (seen.count(t)) continue;
                    if (t == target) return d + 1;
                    seen.insert(t);
                    q.push({t, d + 1});
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
    id: "lc-773",
    source: "leetcode",
    title: "Sliding Puzzle",
    statement: [
      "A board has 2 rows and 3 columns holding the tiles 1 to 5 and one empty square written 0. A move swaps the empty square with a tile next to it (up, down, left or right).",
      "The puzzle is solved when the board reads [[1,2,3],[4,5,0]]. Return the minimum number of moves to solve the given board, or -1 if it cannot be solved.",
    ],
    constraints: ["board.length == 2","board[i].length == 3","board holds each of 0 to 5 exactly once"],
    fn: {name: "slidingPuzzle",params: [{name: "board",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[1,2,3],[4,0,5]]], output: 1 },
      { input: [[[1,2,3],[5,4,0]]], output: -1 },
      { input: [[[4,1,2],[5,0,3]]], output: 5 },
    ],
    tests: [
      { input: [[[1,2,3],[4,5,0]]], output: 0 },
      { input: [[[1,2,0],[4,5,3]]], output: 1 },
      { input: [[[0,1,2],[3,4,5]]], output: 15 },
      { input: [[[3,2,4],[1,5,0]]], output: 14 },
      { input: [[[1,0,2],[4,5,3]]], output: 2 },
      { input: [[[5,4,3],[2,1,0]]], output: 14 },
      { input: [[[2,3,0],[1,5,4]]], output: -1 },
    ],
    hints: [
      "There are only 6! = 720 positions, so the whole state space is tiny.",
      "Turn the board into a string such as \"123450\" and run BFS from the start toward the goal.",
      "Precompute which positions are next to each index in the flattened board, then swap the 0 with each neighbour to create the next states.",
    ],
    solution: {
      idea: [
        "BFS on board states encoded as 6-character strings. Neighbours of each cell index in the flattened 2x3 board are fixed, so each state has at most 3 successors. If the goal is never reached, the position is unsolvable (half of the arrangements are).",
      ],
      complexity: "O(720) states, effectively constant time.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int slidingPuzzle(vector<vector<int>>& board) {
        string start;
        for (auto& row : board) for (int x : row) start += char('0' + x);
        const string goal = "123450";
        vector<vector<int>> nb = {{1, 3}, {0, 2, 4}, {1, 5}, {0, 4}, {1, 3, 5}, {2, 4}};
        unordered_set<string> seen = {start};
        queue<pair<string, int>> q;
        q.push({start, 0});
        while (!q.empty()) {
            auto [s, d] = q.front(); q.pop();
            if (s == goal) return d;
            int z = (int)s.find('0');
            for (int j : nb[z]) {
                string t = s;
                swap(t[z], t[j]);
                if (seen.insert(t).second) q.push({t, d + 1});
            }
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "lc-847",
    source: "leetcode",
    title: "Shortest Path Visiting All Nodes",
    statement: [
      "An undirected connected graph has n nodes (0 to n - 1) given as an adjacency list graph. You may start at any node, may finish at any node, and may revisit nodes and reuse edges.",
      "Return the length (number of edges) of the shortest walk that visits every node at least once.",
    ],
    constraints: ["1 <= n <= 12","graph[i] has no repeated values and does not contain i","the adjacency lists are symmetric","the graph is connected"],
    fn: {name: "shortestPathLength",params: [{name: "graph",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[1,2,3],[0],[0],[0]]], output: 4, explanation: "For example 1 -> 0 -> 2 -> 0 -> 3." },
      { input: [[[1],[0,2,4],[1,3,4],[2],[1,2]]], output: 4 },
    ],
    tests: [
      { input: [[[]]], output: 0 },
      { input: [[[1],[0]]], output: 1 },
      { input: [[[1,2],[0,2],[0,1]]], output: 2 },
      { input: [[[1],[0,2],[1,3],[2]]], output: 3 },
      { input: [[[1,2,3,4],[0],[0],[0],[0]]], output: 6 },
      { input: [[[1,3],[0,2],[1,3],[0,2]]], output: 3 },
    ],
    hints: [
      "Because n is at most 12, the set of visited nodes fits in a bitmask of 12 bits.",
      "A state is (current node, set of visited nodes). The goal is any state whose mask has all bits set.",
      "BFS over these states, starting from every node at once with its own bit set. The first time you reach the full mask, the distance is the answer.",
    ],
    solution: {
      idea: [
        "Multi-source BFS over (node, mask) states: n * 2^n of them, each with degree-many moves. Start with (i, 1 << i) for every i at distance 0. The distance of the first state with a full mask is the shortest walk.",
      ],
      complexity: "O(2^n * n * deg) time, O(2^n * n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int shortestPathLength(vector<vector<int>>& graph) {
        int n = (int)graph.size();
        int full = (1 << n) - 1;
        vector<vector<int>> dist(n, vector<int>(1 << n, -1));
        queue<pair<int, int>> q;
        for (int i = 0; i < n; i++) { dist[i][1 << i] = 0; q.push({i, 1 << i}); }
        while (!q.empty()) {
            auto [u, mask] = q.front(); q.pop();
            if (mask == full) return dist[u][mask];
            for (int v : graph[u]) {
                int nm = mask | (1 << v);
                if (dist[v][nm] == -1) { dist[v][nm] = dist[u][mask] + 1; q.push({v, nm}); }
            }
        }
        return 0;
    }
};
`,
    },
  },
  {
    id: "lc-90",
    source: "leetcode",
    title: "Subsets II",
    statement: [
      "Given an array that may contain duplicates, return all its distinct subsets (the power set without repeated subsets). Two subsets are the same if they hold the same numbers with the same counts, whatever the order of the elements.",
      "The subsets may be returned in any order.",
    ],
    constraints: ["1 <= nums.length <= 10","-10 <= nums[i] <= 10"],
    fn: {name: "subsetsWithDup",params: [{name: "nums",type: "int[]"}],returns: "int[][]"},
    examples: [
      { input: [[1,2,2]], output: [[],[1],[1,2],[1,2,2],[2],[2,2]] },
      { input: [[0]], output: [[],[0]] },
    ],
    tests: [
      { input: [[1]], output: [[],[1]] },
      { input: [[1,1]], output: [[],[1],[1,1]] },
      { input: [[2,1,2]], output: [[],[1],[1,2],[1,2,2],[2],[2,2]] },
      { input: [[3,3,3]], output: [[],[3],[3,3],[3,3,3]] },
      { input: [[1,2,3]], output: [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]] },
      { input: [[4,4,4,1,4]], output: [[],[1],[1,4],[1,4,4],[1,4,4,4],[1,4,4,4,4],[4],[4,4],[4,4,4],[4,4,4,4]] },
      { input: [[-1,0,-1]], output: [[],[-1],[-1,-1],[-1,-1,0],[-1,0],[0]] },
    ],
    unordered: true,
    hints: [
      "Generate subsets with backtracking: at each position either include the element or not.",
      "Sort the array first so equal numbers sit next to each other.",
      "To avoid duplicates, when you loop over choices at one level, skip a number if it equals the previous number at that same level.",
    ],
    solution: {
      idea: [
        "Sort, then backtrack: record the current subset at each call, and for each index i from start onward, skip i when i > start and nums[i] == nums[i - 1], otherwise include nums[i] and recurse from i + 1. The skip rule removes repeated branches.",
      ],
      complexity: "O(n * 2^n) time, O(n) extra space plus the output.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    void go(vector<int>& a, int start, vector<int>& cur, vector<vector<int>>& out) {
        out.push_back(cur);
        for (int i = start; i < (int)a.size(); i++) {
            if (i > start && a[i] == a[i - 1]) continue;
            cur.push_back(a[i]);
            go(a, i + 1, cur, out);
            cur.pop_back();
        }
    }
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> out;
        vector<int> cur;
        go(nums, 0, cur, out);
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-47",
    source: "leetcode",
    title: "Permutations II",
    statement: [
      "Given an array that may contain duplicates, return all its distinct permutations (orderings). Orderings that look identical because they swap equal numbers count once.",
      "The permutations may be returned in any order.",
    ],
    constraints: ["1 <= nums.length <= 8","-10 <= nums[i] <= 10"],
    fn: {name: "permuteUnique",params: [{name: "nums",type: "int[]"}],returns: "int[][]"},
    examples: [
      { input: [[1,1,2]], output: [[1,1,2],[1,2,1],[2,1,1]] },
      { input: [[1,2,3]], output: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]] },
    ],
    tests: [
      { input: [[1]], output: [[1]] },
      { input: [[1,1]], output: [[1,1]] },
      { input: [[1,2]], output: [[1,2],[2,1]] },
      { input: [[2,2,2]], output: [[2,2,2]] },
      { input: [[0,1,0,0]], output: [[0,0,0,1],[0,0,1,0],[0,1,0,0],[1,0,0,0]] },
      { input: [[-1,-1,3]], output: [[-1,-1,3],[-1,3,-1],[3,-1,-1]] },
      { input: [[1,1,2,2]], output: [[1,1,2,2],[1,2,1,2],[1,2,2,1],[2,1,1,2],[2,1,2,1],[2,2,1,1]] },
    ],
    unordered: true,
    hints: [
      "Build the permutation one position at a time, trying each unused number.",
      "Sort the array so equal numbers are adjacent, and keep a used[] flag for each position.",
      "Skip a number if it equals the previous number and that previous copy is not used in the current path. That forces equal numbers to be placed in a fixed left-to-right order.",
    ],
    solution: {
      idea: [
        "Sort, then backtrack with a used[] array. At each depth try every unused index i, but skip i when nums[i] == nums[i - 1] and used[i - 1] is false: the same value would just be tried again in the same slot.",
      ],
      complexity: "O(n * n!) time, O(n) extra space plus the output.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    void go(vector<int>& a, vector<bool>& used, vector<int>& cur, vector<vector<int>>& out) {
        if (cur.size() == a.size()) { out.push_back(cur); return; }
        for (int i = 0; i < (int)a.size(); i++) {
            if (used[i]) continue;
            if (i > 0 && a[i] == a[i - 1] && !used[i - 1]) continue;
            used[i] = true;
            cur.push_back(a[i]);
            go(a, used, cur, out);
            cur.pop_back();
            used[i] = false;
        }
    }
public:
    vector<vector<int>> permuteUnique(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> out;
        vector<int> cur;
        vector<bool> used(nums.size(), false);
        go(nums, used, cur, out);
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-40",
    source: "leetcode",
    title: "Combination Sum II",
    statement: [
      "Given a list of candidate numbers (which may repeat) and a target, return every distinct combination of candidates that adds up to the target. Each number in the list can be used at most once.",
      "Combinations are the same if they hold the same numbers, whatever the order. The result may be in any order.",
    ],
    constraints: ["1 <= candidates.length <= 100","1 <= candidates[i] <= 50","1 <= target <= 30"],
    fn: {name: "combinationSum2",params: [{name: "candidates",type: "int[]"},{name: "target",type: "int"}],returns: "int[][]"},
    examples: [
      { input: [[10,1,2,7,6,1,5],8], output: [[1,1,6],[1,2,5],[1,7],[2,6]] },
      { input: [[2,5,2,1,2],5], output: [[1,2,2],[5]] },
    ],
    tests: [
      { input: [[1],1], output: [[1]] },
      { input: [[1],2], output: [] },
      { input: [[2,2,2],4], output: [[2,2]] },
      { input: [[3,1,3,5,1,1],8], output: [[1,1,1,5],[1,1,3,3],[3,5]] },
      { input: [[4,4,4],8], output: [[4,4]] },
      { input: [[1,2,3,4,5],9], output: [[1,3,5],[2,3,4],[4,5]] },
      { input: [[10,20,30],5], output: [] },
    ],
    unordered: true,
    hints: [
      "Backtracking: choose numbers one by one while the running sum stays at or below the target.",
      "Sort first. Once a candidate is larger than the remaining target, every later one is too, so you can stop that loop.",
      "To avoid duplicate combinations, at one level of the recursion skip a number equal to the one just tried. Pass i + 1 to the next level because each element is used once.",
    ],
    solution: {
      idea: [
        "Sort, then DFS(start, remaining). For i from start: break if a[i] > remaining; skip if i > start and a[i] == a[i - 1]; otherwise take a[i] and recurse with i + 1 and remaining - a[i]. Record the path when remaining reaches 0.",
      ],
      complexity: "Exponential in the worst case, O(2^n) combinations to explore; pruning keeps typical inputs small.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    void go(vector<int>& a, int start, int rem, vector<int>& cur, vector<vector<int>>& out) {
        if (rem == 0) { out.push_back(cur); return; }
        for (int i = start; i < (int)a.size(); i++) {
            if (a[i] > rem) break;
            if (i > start && a[i] == a[i - 1]) continue;
            cur.push_back(a[i]);
            go(a, i + 1, rem - a[i], cur, out);
            cur.pop_back();
        }
    }
public:
    vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end());
        vector<vector<int>> out;
        vector<int> cur;
        go(candidates, 0, target, cur, out);
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-51",
    source: "leetcode",
    title: "N-Queens",
    statement: [
      "Place n queens on an n by n chessboard so that no two queens attack each other: no two share a row, a column or a diagonal.",
      "Return every distinct solution. A solution is a list of n strings of length n, where Q marks a queen and . an empty square. The solutions may be returned in any order.",
    ],
    constraints: ["1 <= n <= 9"],
    fn: {name: "solveNQueens",params: [{name: "n",type: "int"}],returns: "string[][]"},
    examples: [
      { input: [4], output: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]] },
      { input: [1], output: [["Q"]] },
    ],
    tests: [
      { input: [2], output: [] },
      { input: [3], output: [] },
      { input: [5], output: [["Q....","..Q..","....Q",".Q...","...Q."],["Q....","...Q.",".Q...","....Q","..Q.."],[".Q...","...Q.","Q....","..Q..","....Q"],[".Q...","....Q","..Q..","Q....","...Q."],["..Q..","Q....","...Q.",".Q...","....Q"],["..Q..","....Q",".Q...","...Q.","Q...."],["...Q.","Q....","..Q..","....Q",".Q..."],["...Q.",".Q...","....Q","..Q..","Q...."],["....Q",".Q...","...Q.","Q....","..Q.."],["....Q","..Q..","Q....","...Q.",".Q..."]] },
      { input: [6], output: [[".Q....","...Q..",".....Q","Q.....","..Q...","....Q."],["..Q...",".....Q",".Q....","....Q.","Q.....","...Q.."],["...Q..","Q.....","....Q.",".Q....",".....Q","..Q..."],["....Q.","..Q...","Q.....",".....Q","...Q..",".Q...."]] },
      { input: [7], output: [["Q......","..Q....","....Q..","......Q",".Q.....","...Q...",".....Q."],["Q......","...Q...","......Q","..Q....",".....Q.",".Q.....","....Q.."],["Q......","....Q..",".Q.....",".....Q.","..Q....","......Q","...Q..."],["Q......",".....Q.","...Q...",".Q.....","......Q","....Q..","..Q...."],[".Q.....","...Q...","Q......","......Q","....Q..","..Q....",".....Q."],[".Q.....","...Q...",".....Q.","Q......","..Q....","....Q..","......Q"],[".Q.....","....Q..","Q......","...Q...","......Q","..Q....",".....Q."],[".Q.....","....Q..","..Q....","Q......","......Q","...Q...",".....Q."],[".Q.....","....Q..","......Q","...Q...","Q......","..Q....",".....Q."],[".Q.....",".....Q.","..Q....","......Q","...Q...","Q......","....Q.."],[".Q.....","......Q","....Q..","..Q....","Q......",".....Q.","...Q..."],["..Q....","Q......",".....Q.",".Q.....","....Q..","......Q","...Q..."],["..Q....","Q......",".....Q.","...Q...",".Q.....","......Q","....Q.."],["..Q....","....Q..","......Q",".Q.....","...Q...",".....Q.","Q......"],["..Q....",".....Q.",".Q.....","....Q..","Q......","...Q...","......Q"],["..Q....","......Q",".Q.....","...Q...",".....Q.","Q......","....Q.."],["..Q....","......Q","...Q...","Q......","....Q..",".Q.....",".....Q."],["...Q...","Q......","..Q....",".....Q.",".Q.....","......Q","....Q.."],["...Q...","Q......","....Q..",".Q.....",".....Q.","..Q....","......Q"],["...Q...",".Q.....","......Q","....Q..","..Q....","Q......",".....Q."],["...Q...",".....Q.","Q......","..Q....","....Q..","......Q",".Q....."],["...Q...","......Q","..Q....",".....Q.",".Q.....","....Q..","Q......"],["...Q...","......Q","....Q..",".Q.....",".....Q.","Q......","..Q...."],["....Q..","Q......","...Q...","......Q","..Q....",".....Q.",".Q....."],["....Q..","Q......",".....Q.","...Q...",".Q.....","......Q","..Q...."],["....Q..",".Q.....",".....Q.","..Q....","......Q","...Q...","Q......"],["....Q..","..Q....","Q......",".....Q.","...Q...",".Q.....","......Q"],["....Q..","......Q",".Q.....","...Q...",".....Q.","Q......","..Q...."],["....Q..","......Q",".Q.....",".....Q.","..Q....","Q......","...Q..."],[".....Q.","Q......","..Q....","....Q..","......Q",".Q.....","...Q..."],[".....Q.",".Q.....","....Q..","Q......","...Q...","......Q","..Q...."],[".....Q.","..Q....","Q......","...Q...","......Q","....Q..",".Q....."],[".....Q.","..Q....","....Q..","......Q","Q......","...Q...",".Q....."],[".....Q.","..Q....","......Q","...Q...","Q......","....Q..",".Q....."],[".....Q.","...Q...",".Q.....","......Q","....Q..","..Q....","Q......"],[".....Q.","...Q...","......Q","Q......","..Q....","....Q..",".Q....."],["......Q",".Q.....","...Q...",".....Q.","Q......","..Q....","....Q.."],["......Q","..Q....",".....Q.",".Q.....","....Q..","Q......","...Q..."],["......Q","...Q...","Q......","....Q..",".Q.....",".....Q.","..Q...."],["......Q","....Q..","..Q....","Q......",".....Q.","...Q...",".Q....."]] },
      { input: [8], output: [["Q.......","....Q...",".......Q",".....Q..","..Q.....","......Q.",".Q......","...Q...."],["Q.......",".....Q..",".......Q","..Q.....","......Q.","...Q....",".Q......","....Q..."],["Q.......","......Q.","...Q....",".....Q..",".......Q",".Q......","....Q...","..Q....."],["Q.......","......Q.","....Q...",".......Q",".Q......","...Q....",".....Q..","..Q....."],[".Q......","...Q....",".....Q..",".......Q","..Q.....","Q.......","......Q.","....Q..."],[".Q......","....Q...","......Q.","Q.......","..Q.....",".......Q",".....Q..","...Q...."],[".Q......","....Q...","......Q.","...Q....","Q.......",".......Q",".....Q..","..Q....."],[".Q......",".....Q..","Q.......","......Q.","...Q....",".......Q","..Q.....","....Q..."],[".Q......",".....Q..",".......Q","..Q.....","Q.......","...Q....","......Q.","....Q..."],[".Q......","......Q.","..Q.....",".....Q..",".......Q","....Q...","Q.......","...Q...."],[".Q......","......Q.","....Q...",".......Q","Q.......","...Q....",".....Q..","..Q....."],[".Q......",".......Q",".....Q..","Q.......","..Q.....","....Q...","......Q.","...Q...."],["..Q.....","Q.......","......Q.","....Q...",".......Q",".Q......","...Q....",".....Q.."],["..Q.....","....Q...",".Q......",".......Q","Q.......","......Q.","...Q....",".....Q.."],["..Q.....","....Q...",".Q......",".......Q",".....Q..","...Q....","......Q.","Q......."],["..Q.....","....Q...","......Q.","Q.......","...Q....",".Q......",".......Q",".....Q.."],["..Q.....","....Q...",".......Q","...Q....","Q.......","......Q.",".Q......",".....Q.."],["..Q.....",".....Q..",".Q......","....Q...",".......Q","Q.......","......Q.","...Q...."],["..Q.....",".....Q..",".Q......","......Q.","Q.......","...Q....",".......Q","....Q..."],["..Q.....",".....Q..",".Q......","......Q.","....Q...","Q.......",".......Q","...Q...."],["..Q.....",".....Q..","...Q....","Q.......",".......Q","....Q...","......Q.",".Q......"],["..Q.....",".....Q..","...Q....",".Q......",".......Q","....Q...","......Q.","Q......."],["..Q.....",".....Q..",".......Q","Q.......","...Q....","......Q.","....Q...",".Q......"],["..Q.....",".....Q..",".......Q","Q.......","....Q...","......Q.",".Q......","...Q...."],["..Q.....",".....Q..",".......Q",".Q......","...Q....","Q.......","......Q.","....Q..."],["..Q.....","......Q.",".Q......",".......Q","....Q...","Q.......","...Q....",".....Q.."],["..Q.....","......Q.",".Q......",".......Q",".....Q..","...Q....","Q.......","....Q..."],["..Q.....",".......Q","...Q....","......Q.","Q.......",".....Q..",".Q......","....Q..."],["...Q....","Q.......","....Q...",".......Q",".Q......","......Q.","..Q.....",".....Q.."],["...Q....","Q.......","....Q...",".......Q",".....Q..","..Q.....","......Q.",".Q......"],["...Q....",".Q......","....Q...",".......Q",".....Q..","Q.......","..Q.....","......Q."],["...Q....",".Q......","......Q.","..Q.....",".....Q..",".......Q","Q.......","....Q..."],["...Q....",".Q......","......Q.","..Q.....",".....Q..",".......Q","....Q...","Q......."],["...Q....",".Q......","......Q.","....Q...","Q.......",".......Q",".....Q..","..Q....."],["...Q....",".Q......",".......Q","....Q...","......Q.","Q.......","..Q.....",".....Q.."],["...Q....",".Q......",".......Q",".....Q..","Q.......","..Q.....","....Q...","......Q."],["...Q....",".....Q..","Q.......","....Q...",".Q......",".......Q","..Q.....","......Q."],["...Q....",".....Q..",".......Q",".Q......","......Q.","Q.......","..Q.....","....Q..."],["...Q....",".....Q..",".......Q","..Q.....","Q.......","......Q.","....Q...",".Q......"],["...Q....","......Q.","Q.......",".......Q","....Q...",".Q......",".....Q..","..Q....."],["...Q....","......Q.","..Q.....",".......Q",".Q......","....Q...","Q.......",".....Q.."],["...Q....","......Q.","....Q...",".Q......",".....Q..","Q.......","..Q.....",".......Q"],["...Q....","......Q.","....Q...","..Q.....","Q.......",".....Q..",".......Q",".Q......"],["...Q....",".......Q","Q.......","..Q.....",".....Q..",".Q......","......Q.","....Q..."],["...Q....",".......Q","Q.......","....Q...","......Q.",".Q......",".....Q..","..Q....."],["...Q....",".......Q","....Q...","..Q.....","Q.......","......Q.",".Q......",".....Q.."],["....Q...","Q.......","...Q....",".....Q..",".......Q",".Q......","......Q.","..Q....."],["....Q...","Q.......",".......Q","...Q....",".Q......","......Q.","..Q.....",".....Q.."],["....Q...","Q.......",".......Q",".....Q..","..Q.....","......Q.",".Q......","...Q...."],["....Q...",".Q......","...Q....",".....Q..",".......Q","..Q.....","Q.......","......Q."],["....Q...",".Q......","...Q....","......Q.","..Q.....",".......Q",".....Q..","Q......."],["....Q...",".Q......",".....Q..","Q.......","......Q.","...Q....",".......Q","..Q....."],["....Q...",".Q......",".......Q","Q.......","...Q....","......Q.","..Q.....",".....Q.."],["....Q...","..Q.....","Q.......",".....Q..",".......Q",".Q......","...Q....","......Q."],["....Q...","..Q.....","Q.......","......Q.",".Q......",".......Q",".....Q..","...Q...."],["....Q...","..Q.....",".......Q","...Q....","......Q.","Q.......",".....Q..",".Q......"],["....Q...","......Q.","Q.......","..Q.....",".......Q",".....Q..","...Q....",".Q......"],["....Q...","......Q.","Q.......","...Q....",".Q......",".......Q",".....Q..","..Q....."],["....Q...","......Q.",".Q......","...Q....",".......Q","Q.......","..Q.....",".....Q.."],["....Q...","......Q.",".Q......",".....Q..","..Q.....","Q.......","...Q....",".......Q"],["....Q...","......Q.",".Q......",".....Q..","..Q.....","Q.......",".......Q","...Q...."],["....Q...","......Q.","...Q....","Q.......","..Q.....",".......Q",".....Q..",".Q......"],["....Q...",".......Q","...Q....","Q.......","..Q.....",".....Q..",".Q......","......Q."],["....Q...",".......Q","...Q....","Q.......","......Q.",".Q......",".....Q..","..Q....."],[".....Q..","Q.......","....Q...",".Q......",".......Q","..Q.....","......Q.","...Q...."],[".....Q..",".Q......","......Q.","Q.......","..Q.....","....Q...",".......Q","...Q...."],[".....Q..",".Q......","......Q.","Q.......","...Q....",".......Q","....Q...","..Q....."],[".....Q..","..Q.....","Q.......","......Q.","....Q...",".......Q",".Q......","...Q...."],[".....Q..","..Q.....","Q.......",".......Q","...Q....",".Q......","......Q.","....Q..."],[".....Q..","..Q.....","Q.......",".......Q","....Q...",".Q......","...Q....","......Q."],[".....Q..","..Q.....","....Q...","......Q.","Q.......","...Q....",".Q......",".......Q"],[".....Q..","..Q.....","....Q...",".......Q","Q.......","...Q....",".Q......","......Q."],[".....Q..","..Q.....","......Q.",".Q......","...Q....",".......Q","Q.......","....Q..."],[".....Q..","..Q.....","......Q.",".Q......",".......Q","....Q...","Q.......","...Q...."],[".....Q..","..Q.....","......Q.","...Q....","Q.......",".......Q",".Q......","....Q..."],[".....Q..","...Q....","Q.......","....Q...",".......Q",".Q......","......Q.","..Q....."],[".....Q..","...Q....",".Q......",".......Q","....Q...","......Q.","Q.......","..Q....."],[".....Q..","...Q....","......Q.","Q.......","..Q.....","....Q...",".Q......",".......Q"],[".....Q..","...Q....","......Q.","Q.......",".......Q",".Q......","....Q...","..Q....."],[".....Q..",".......Q",".Q......","...Q....","Q.......","......Q.","....Q...","..Q....."],["......Q.","Q.......","..Q.....",".......Q",".....Q..","...Q....",".Q......","....Q..."],["......Q.",".Q......","...Q....","Q.......",".......Q","....Q...","..Q.....",".....Q.."],["......Q.",".Q......",".....Q..","..Q.....","Q.......","...Q....",".......Q","....Q..."],["......Q.","..Q.....","Q.......",".....Q..",".......Q","....Q...",".Q......","...Q...."],["......Q.","..Q.....",".......Q",".Q......","....Q...","Q.......",".....Q..","...Q...."],["......Q.","...Q....",".Q......","....Q...",".......Q","Q.......","..Q.....",".....Q.."],["......Q.","...Q....",".Q......",".......Q",".....Q..","Q.......","..Q.....","....Q..."],["......Q.","....Q...","..Q.....","Q.......",".....Q..",".......Q",".Q......","...Q...."],[".......Q",".Q......","...Q....","Q.......","......Q.","....Q...","..Q.....",".....Q.."],[".......Q",".Q......","....Q...","..Q.....","Q.......","......Q.","...Q....",".....Q.."],[".......Q","..Q.....","Q.......",".....Q..",".Q......","....Q...","......Q.","...Q...."],[".......Q","...Q....","Q.......","..Q.....",".....Q..",".Q......","......Q.","....Q..."]] },
    ],
    unordered: true,
    hints: [
      "Place the queens row by row; each row holds exactly one queen, so you only choose a column.",
      "A square (row, col) is attacked if its column, its diagonal (row - col) or its anti-diagonal (row + col) is already used.",
      "Keep three boolean arrays for columns and the two diagonals. Place, recurse to the next row, and undo (backtrack).",
    ],
    solution: {
      idea: [
        "Backtracking with O(1) conflict checks. cols[c], d1[row + c] and d2[row - c + n - 1] record which column and diagonals hold a queen. When row reaches n, build the board strings from the chosen columns.",
      ],
      complexity: "Roughly O(n!) time with pruning, O(n) space beyond the output.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    int n;
    vector<bool> cols, d1, d2;
    vector<int> pos;
    vector<vector<string>> out;
    void go(int row) {
        if (row == n) {
            vector<string> board(n, string(n, '.'));
            for (int r = 0; r < n; r++) board[r][pos[r]] = 'Q';
            out.push_back(board);
            return;
        }
        for (int c = 0; c < n; c++) {
            if (cols[c] || d1[row + c] || d2[row - c + n - 1]) continue;
            cols[c] = d1[row + c] = d2[row - c + n - 1] = true;
            pos[row] = c;
            go(row + 1);
            cols[c] = d1[row + c] = d2[row - c + n - 1] = false;
        }
    }
public:
    vector<vector<string>> solveNQueens(int nn) {
        n = nn;
        cols.assign(n, false);
        d1.assign(2 * n, false);
        d2.assign(2 * n, false);
        pos.assign(n, 0);
        out.clear();
        go(0);
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-79",
    source: "leetcode",
    title: "Word Search",
    statement: [
      "A grid of single letters and a word are given. Return true if the word can be traced in the grid by starting anywhere and moving step by step to a neighbouring cell (up, down, left or right), without using the same cell twice in one path.",
      "The letters are given as strings of length one, because the judge uses string arrays for text grids.",
    ],
    constraints: ["1 <= rows, columns <= 6","1 <= word.length <= 15","board cells and word use lowercase and uppercase English letters"],
    fn: {name: "exist",params: [{name: "board",type: "string[][]"},{name: "word",type: "string"}],returns: "bool"},
    examples: [
      { input: [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCCED"], output: true },
      { input: [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"SEE"], output: true },
      { input: [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCB"], output: false, explanation: "It would need the same B twice." },
    ],
    tests: [
      { input: [[["a"]],"a"], output: true },
      { input: [[["a"]],"b"], output: false },
      { input: [[["a","b"]],"ba"], output: true },
      { input: [[["a","b"]],"aba"], output: false },
      { input: [[["a","a"],["a","a"]],"aaaa"], output: true },
      { input: [[["a","a"],["a","a"]],"aaaaa"], output: false },
      { input: [[["C","A","A"],["A","A","A"],["B","C","D"]],"AAB"], output: true },
    ],
    hints: [
      "Try every cell as a possible start of the word.",
      "From a matching cell, DFS to the four neighbours looking for the next letter. Mark the cell as used while it is on the current path.",
      "Unmark the cell when the DFS returns (backtrack) so other paths can use it. Stop at once when the whole word is matched.",
    ],
    solution: {
      idea: [
        "DFS with backtracking from each cell. dfs(r, c, i) succeeds if the cell matches word[i] and one neighbour continues with i + 1. The cell is temporarily overwritten with a marker so the path cannot reuse it.",
      ],
      complexity: "O(R * C * 3^L) time for word length L, O(L) space for the recursion.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    bool dfs(vector<vector<string>>& b, const string& w, int r, int c, int i) {
        if (i == (int)w.size()) return true;
        if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size() || b[r][c][0] != w[i]) return false;
        string saved = b[r][c];
        b[r][c] = "#";
        bool ok = dfs(b, w, r + 1, c, i + 1) || dfs(b, w, r - 1, c, i + 1) || dfs(b, w, r, c + 1, i + 1) || dfs(b, w, r, c - 1, i + 1);
        b[r][c] = saved;
        return ok;
    }
public:
    bool exist(vector<vector<string>>& board, string word) {
        for (int r = 0; r < (int)board.size(); r++)
            for (int c = 0; c < (int)board[0].size(); c++)
                if (dfs(board, word, r, c, 0)) return true;
        return false;
    }
};
`,
    },
  },
];
