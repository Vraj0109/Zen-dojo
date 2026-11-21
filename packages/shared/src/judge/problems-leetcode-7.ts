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
      "Courses are tasks with ordering rules between them. When is there an order that finishes everything, and when is there not?",
      "A course with no unfinished prerequisites can be taken now. What happens to the rest as you keep taking the available courses?",
      "Count each course's remaining prerequisites. Repeatedly take a course whose count is zero, reduce the counts of the courses that depend on it, and use a queue.",
      "If every course gets taken, the schedule works. If some never reach a count of zero, there is a cycle. Edge direction matters.",
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
      "This is the same ordering problem as before, but now you must output the order. Which courses can you start with?",
      "Whenever several courses are available, the order you take them is your choice. What rule gives the smallest order?",
      "Use the same counting approach, but keep the available courses in a min-heap so the smallest number is always taken next.",
      "If the output is shorter than the number of courses, there is a cycle, so return an empty result. A pair [a, b] means b comes first.",
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
      "A course can start only when all its prerequisites end. How long does a chain of prerequisites take in total?",
      "A course's finish time depends on the latest finish time among its prerequisites. Which order of processing makes those values known before you need them?",
      "Process courses as they become ready, using a queue and counts of unfinished prerequisites. Keep the earliest start for each course, and take the largest finish at the end.",
      "The answer is the longest chain of weighted courses, not the sum of all times. Courses with no prerequisites start at month zero.",
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
      "Cities linked directly or through others form a group. How many separate groups are there?",
      "A group can be explored from any of its members. Once a group is fully explored, count it and move on to a city you have not seen.",
      "Run a depth-first or breadth-first search from each unseen city to mark its group, and count how many searches you start.",
      "Alternatively, merge connected cities into sets and count the sets left. The matrix is symmetric, so one direction is enough.",
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
      "Shared emails link accounts together. If you treat each email as a point, what does sharing an email mean for two accounts?",
      "All emails in one account belong to one person. How can you join groups of emails so that connected emails end up in the same group?",
      "Give each email an id and join the emails of each account in a disjoint-set structure. Remember the name of each email's owner.",
      "Group the emails by their final set, sort each group, and put the name first. Two different people can share a name, so do not group by name.",
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
      "The graph started as a tree, so it had no cycle. As edges are added one at a time, when does a new edge create a cycle?",
      "An edge makes a cycle exactly when its two ends are already connected by earlier edges. How can you check that quickly as edges arrive?",
      "Use a disjoint-set structure. For each edge, check whether its two ends already share a set. The first edge that does is the answer.",
      "Only one edge closes the cycle, so the first one found is the one to return. Nodes are numbered from 1.",
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
      "Each node receives the signal at a time set by the fastest route from the source. What is the question really asking for?",
      "The last node to be reached decides the total time. How does that node's time relate to the shortest times from the source?",
      "Use a shortest-path search from the source with a min-heap, since every time is non-negative. Skip outdated heap entries when you pop them.",
      "If some node is never reached, return -1. Nodes are labelled from 1, so check every label from 1 to n.",
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
      "The cheapest route may use too many stops, so the best answer depends on both price and number of flights. What must you track?",
      "Think of rounds: after r rounds you know the cheapest price using at most r flights. How does each round build on the one before?",
      "Run a fixed number of relaxation rounds over all flights. Read prices only from the previous round's copy, so each round adds at most one flight.",
      "Use a large sentinel for unreachable cities and do not extend from them. k stops means k plus one flights, so run that many rounds.",
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
      "The cost of a route is its largest single step, not the sum. How does that change the way costs build up along a path?",
      "When you extend a route to a neighbour, the new cost is the larger of the old cost and the new step. Which search finds the cheapest such value first?",
      "Use a min-heap search over cells, where each cell keeps the best largest-step found so far. Skip outdated entries when you pop them.",
      "You can also binary search the effort limit and check reachability with a plain grid search. Both approaches give the same answer.",
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
      "Water rises over time, and a cell is usable once the level reaches its height. What single number describes a whole route?",
      "A route is only as good as its highest cell. The task is to find a route whose highest cell is as low as possible.",
      "Use a min-heap search where each cell's time is the highest elevation seen on the way. The first time the end cell is popped, that time is the answer.",
      "Pops come out in increasing time, so the first time a cell is pushed is already its best time. Mark it visited at that moment.",
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
      "Each obstacle costs one removal and empty cells are free. Could this be a shortest-path question where every cost is zero or one?",
      "A general shortest-path method works, but there is a faster one when all costs are zero or one. What structure can keep cells in order of distance without a heap?",
      "Use a double-ended queue: a zero-cost step goes to the front and a one-cost step goes to the back. Each cell is then popped at its best distance.",
      "Skip a neighbour when you cannot improve its distance. The start and the end are guaranteed to be empty.",
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
      "The graph is small, with at most 100 cities. Would computing the distance between every pair of cities be affordable?",
      "The distance between two cities may pass through any intermediate city. If you allow one more intermediate city at a time, what can you update?",
      "Use an all-pairs shortest-path table, relaxing through each city in turn as the intermediate. Then count the reachable cities for each city.",
      "Ties go to the larger city index, so compare counts with less-than-or-equal. Use a large sentinel and guard against overflow when adding.",
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
      "Every pair of points could be joined, so there are many possible links. What is the cheapest set of links that connects all points without a cycle?",
      "A cheapest cycle-free connecting set can be grown from one point at a time. Which outside point should join the tree next?",
      "Grow the tree from one point. Keep for each outside point its cheapest link to the tree, and each step add the closest one. This avoids sorting all the pairs.",
      "The graph is complete and small, so repeated scanning is fast enough. Use 64-bit sums for the total.",
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
      "Think of colouring the nodes with two colours so that every edge joins different colours. When would that be impossible?",
      "If a cycle has an odd number of edges, two colours cannot alternate all the way around it. Could you colour neighbours as you walk the graph?",
      "Colour a node, then give each neighbour the opposite colour during a breadth-first or depth-first walk. Start a new walk for each uncoloured node.",
      "A clash between neighbours means the graph is not bipartite. The graph may be disconnected, so check every node, not just one.",
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
      "Each dislike is a link between two people. Can you split people into two groups so that no link stays inside a group?",
      "Think about whether the dislike graph can be coloured with two colours, and what would block that.",
      "Build the adjacency lists, then colour each component with a walk, giving neighbours the opposite colour. A clash means the answer is false.",
      "Every person must get a colour, including people with no dislikes. The graph may be disconnected.",
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
      "Some cables are the only link between two parts of the network. How can a walk through the network reveal such a cable?",
      "A cable is critical when no other route, through a cycle, connects its two ends. What does a walk that finds a back-link tell you?",
      "Run a depth-first walk that records each node's visit time and the earliest time reachable from its subtree. A tree edge whose child cannot reach above its parent is a bridge.",
      "The network can have 100000 nodes, so an iterative stack is safer than deep recursion. Skip only the edge you came in on.",
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
      "Each ticket must be used exactly once, so the trip is a route through every edge. Why does always picking the smallest airport not always work?",
      "A walk can get stuck at an airport with no tickets left before the trip is complete. How could you backtrack to fix that?",
      "Use a depth-first walk that always takes the smallest unused destination. Record each airport when it runs out of tickets, then reverse the record.",
      "Keep each airport's destinations in a sorted multiset so the smallest is always available. Start from JFK.",
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
      "Each lock state is a point, and one turn changes one wheel by one step. Which search finds the fewest moves from one point to another?",
      "There are only 10,000 states, so you can afford to visit each one once. Which search reaches all states one step away before any two steps away?",
      "Use a breadth-first search from 0000. Each state has eight neighbours, one per wheel and direction, with wrap-around. Put the dead ends in a set and skip them.",
      "If 0000 is itself a dead end, nothing can move, so return -1. Turning 9 forward gives 0, and turning 0 backward gives 9.",
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
      "The board has only six cells and a small number of arrangements. Could you treat each arrangement as a point and find the shortest route to the solved one?",
      "Any board arrangement can be written as a short string. Which search finds the fewest moves between two such states?",
      "Use a breadth-first search over strings. From each state, swap the blank with each cell next to it. Precompute the neighbours of each cell position.",
      "Keep a set of seen states so you do not revisit them. Return -1 if the solved board is never reached.",
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
      "The graph has at most 12 nodes. Since only the set of visited nodes matters, how could you store that set compactly?",
      "A state is a current node plus the set of nodes visited so far. What would it mean to reach a state where every node has been visited?",
      "Use a breadth-first search over states that pair a node with a bit mask of visited nodes. Start from every node at once, with only itself marked.",
      "Each move costs one edge, and revisiting is allowed. The first time you reach the full set, its distance is the answer.",
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
      "Picture building a subset one element at a time. What goes wrong when the same value appears twice in the input?",
      "If you sort the input, equal values sit side by side. What does that let you do with the choices at one level?",
      "Backtrack from a start index. At each level, skip a value that equals the previous value at that same level, unless it is the first choice there.",
      "Edge case: the empty subset is a valid answer and must be included. Record every path, not only the full-length ones.",
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
      "Think of the answer as filling slots from left to right. What makes two arrangements look identical?",
      "If the input is sorted, equal numbers sit side by side. How could you force equal copies to be used in a fixed order?",
      "Keep a used flag per number. Skip a number equal to the one before it when that earlier copy is not in use, so equal copies stay in left-to-right order.",
      "Edge case: if every value is equal, there is exactly one arrangement to return.",
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
      "Think of the candidates as items that can each be taken at most once. Which order of picking lets you stop early and avoid repeats?",
      "If the candidates are sorted, what can you say about the rest of the list once one candidate is bigger than what remains of the target?",
      "Pick from a start index and move forward. At one level, skip a value equal to the previous one, so the same combination is not built twice.",
      "Edge case: a value that appears several times may be used as many times as it appears, but no more.",
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
      "Place one queen per row. Given that, what is the only decision you make for each row?",
      "Which squares are attacked by the queens already placed? Think about the column and the two diagonals each queen blocks.",
      "Use three lookup arrays for columns and the two diagonals, so each safety check is quick. Place, recurse to the next row, then undo the placement.",
      "Edge case: n = 1 has one solution, while n = 2 and n = 3 have none. Build the board strings only when a full placement is found.",
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
      "Think of the word as a path through the grid. Where could the path start, and what must it do at each step?",
      "Once a cell matches the first letter, how should the search explore the next letters? What must it remember about cells already used?",
      "Mark the current cell as used while exploring from it, then unmark it when that branch fails. Stop as soon as one path finds the whole word.",
      "Edge case: a word longer than the number of cells cannot match, and a one-letter word needs no special handling.",
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
