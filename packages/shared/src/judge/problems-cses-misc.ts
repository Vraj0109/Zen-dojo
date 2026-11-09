import type { ProblemSpec } from "./types";

// CSES Range Queries, Trees, Mathematics, and String problems.
// Statements, hints and solutions are written for this app; the original tasks are linked. Written for this app.

export const CSES_SPECS_MISC: ProblemSpec[] = [
  {
    id: "cses-static-range-sum-queries",
    source: "cses",
    title: "Static Range Sum Queries",
    url: "https://cses.fi/problemset/task/1646",
    statement: [
      "Given an array of n integers and a series of queries, calculate the sum of values in each range [a, b].",
      "The query indices a and b are 1-based and inclusive: the range covers all elements from arr[a - 1] to arr[b - 1].",
      "Return an array containing the answer for each query in order.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "1 <= arr[i] <= 10^9",
      "1 <= a <= b <= arr.length for each query [a, b]",
    ],
    fn: {name: "staticRangeSumQueries",params: [{name: "arr",type: "int[]"},{name: "queries",type: "int[][]"}],returns: "long[]"},
    examples: [
      { input: [[3,2,4,5,1,1,5,3],[[2,4],[5,6],[1,8],[3,3]]], output: [11,2,24,4], explanation: "For [2, 4], sum is 2 + 4 + 5 = 11. For [5, 6], sum is 1 + 1 = 2. For [1, 8], total sum is 24. For [3, 3], single element is 4." },
      { input: [[10,20,30],[[1,1],[1,3],[2,3]]], output: [10,60,50], explanation: "Sums are 10, 10 + 20 + 30 = 60, and 20 + 30 = 50." },
    ],
    tests: [
      { input: [[5],[[1,1]]], output: [5] },
      { input: [[1,2,3,4,5],[[1,2],[2,4],[3,5],[1,5]]], output: [3,9,12,15] },
      { input: [[1000000000,1000000000,1000000000],[[1,3],[2,3],[1,1]]], output: [3000000000,2000000000,1000000000] },
      { input: [[7,7,7,7,7,7,7],[[1,7],[2,6],[4,4]]], output: [49,35,7] },
      { input: [[4,8,15,16,23,42],[[1,6],[2,5],[3,4],[6,6]]], output: [108,62,31,42] },
      { input: [[100,200,300,400,500,600,700,800,900,1000],[[1,10],[5,5],[2,9],[3,7]]], output: [5500,500,4400,2500] },
    ],
    hints: [
      "Calculating each query by summing from index a to b in a loop takes O(n) per query, which is too slow.",
      "Precompute a prefix sum array pref where pref[k] is the sum of the first k elements (with pref[0] = 0).",
      "The sum in range [a, b] (1-based) is then simply pref[b] - pref[a - 1], answered in O(1) time. Remember to use 64-bit integers to prevent overflow.",
    ],
    solution: {
      idea: [
        "Compute a prefix sum array of size n + 1 where pref[i] = sum of arr[0 .. i - 1].",
        "Each query [a, b] is answered in O(1) by evaluating pref[b] - pref[a - 1].",
        "Because elements can be up to 10^9 and n up to 200,000, cumulative sums require 64-bit integers.",
      ],
      complexity: "O(n + q) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> staticRangeSumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size();
        vector<long long> pref(n + 1, 0);
        for (int i = 0; i < n; i++) {
            pref[i + 1] = pref[i] + arr[i];
        }
        vector<long long> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0], b = q[1];
            ans.push_back(pref[b] - pref[a - 1]);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-static-range-minimum-queries",
    source: "cses",
    title: "Static Range Minimum Queries",
    url: "https://cses.fi/problemset/task/1647",
    statement: [
      "Given an array of n integers and a series of queries, find the minimum value in each range [a, b].",
      "The query indices a and b are 1-based and inclusive: the range covers all elements from arr[a - 1] to arr[b - 1].",
      "Return an array containing the minimum value for each query in order.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "1 <= arr[i] <= 10^9",
      "1 <= a <= b <= arr.length for each query [a, b]",
    ],
    fn: {name: "staticRangeMinimumQueries",params: [{name: "arr",type: "int[]"},{name: "queries",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [[3,2,4,5,1,1,5,3],[[2,4],[5,6],[1,8],[3,3]]], output: [2,1,1,4], explanation: "For [2, 4], min of {2, 4, 5} is 2. For [5, 6], min of {1, 1} is 1. For [1, 8], overall min is 1. For [3, 3], single element is 4." },
      { input: [[10,5,8,2,9],[[1,2],[2,4],[3,5]]], output: [5,2,2], explanation: "Min of [10, 5] is 5; min of [5, 8, 2] is 2; min of [8, 2, 9] is 2." },
    ],
    tests: [
      { input: [[42],[[1,1]]], output: [42] },
      { input: [[5,4,3,2,1],[[1,1],[1,3],[1,5],[3,5]]], output: [5,3,1,1] },
      { input: [[1,2,3,4,5],[[1,5],[2,4],[3,3],[4,5]]], output: [1,2,3,4] },
      { input: [[1000000000,500000000,1000000000],[[1,3],[1,1],[2,3]]], output: [500000000,1000000000,500000000] },
      { input: [[9,3,7,1,8,2,6,4,5],[[1,9],[2,8],[3,4],[6,9]]], output: [1,1,1,2] },
      { input: [[6,6,6,6,6],[[1,5],[2,3],[4,4]]], output: [6,6,6] },
    ],
    hints: [
      "Because the array values never change, you can precalculate range minimums.",
      "Use a Sparse Table: precompute table[k][i], which stores the minimum value in the interval of length 2^k starting at index i.",
      "For any range [L, R] of length len = R - L + 1, let k = floor(log2(len)). The minimum is min(table[k][L], table[k][R - 2^k + 1]), which answers each query in O(1) time.",
    ],
    solution: {
      idea: [
        "Build a Sparse Table in O(n log n) time. table[k][i] = min(table[k - 1][i], table[k - 1][i + 2^(k - 1)]).",
        "For each query [a, b], find the greatest power of 2 that does not exceed the interval length: k = 31 - __builtin_clz(len).",
        "The minimum in the range is min(table[k][a - 1], table[k][b - (1 << k)]), requiring O(1) time per query.",
      ],
      complexity: "O(n log n + q) time, O(n log n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> staticRangeMinimumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size();
        if (n == 0) return {};
        int maxLog = 32 - __builtin_clz(n);
        vector<vector<int>> st(maxLog, vector<int>(n));
        for (int i = 0; i < n; i++) st[0][i] = arr[i];
        for (int k = 1; k < maxLog; k++) {
            int len = 1 << (k - 1);
            for (int i = 0; i + (1 << k) <= n; i++) {
                st[k][i] = min(st[k - 1][i], st[k - 1][i + len]);
            }
        }
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int l = q[0] - 1;
            int r = q[1] - 1;
            int len = r - l + 1;
            int k = 31 - __builtin_clz(len);
            ans.push_back(min(st[k][l], st[k][r - (1 << k) + 1]));
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-dynamic-range-sum-queries",
    source: "cses",
    title: "Dynamic Range Sum Queries",
    url: "https://cses.fi/problemset/task/1648",
    statement: [
      "Given an array of n integers and a series of operations, process each operation in order.",
      "An operation of type 1 is [1, k, u]: update the value at 1-based index k to u (i.e. arr[k - 1] = u).",
      "An operation of type 2 is [2, a, b]: calculate the sum of values in the range [a, b] (1-based, inclusive).",
      "Return an array containing the results of all type 2 queries in order.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "1 <= arr[i], u <= 10^9",
      "1 <= k <= arr.length for type 1 updates",
      "1 <= a <= b <= arr.length for type 2 queries",
    ],
    fn: {name: "dynamicRangeSumQueries",params: [{name: "arr",type: "int[]"},{name: "queries",type: "int[][]"}],returns: "long[]"},
    examples: [
      { input: [[3,2,4,5,1,1,5,3],[[2,1,4],[2,5,6],[1,3,1],[2,1,4]]], output: [14,2,11], explanation: "Sum of arr[0..3] is 3 + 2 + 4 + 5 = 14. Sum of arr[4..5] is 1 + 1 = 2. Update changes arr[2] from 4 to 1. New sum of arr[0..3] is 3 + 2 + 1 + 5 = 11." },
      { input: [[1,2,3],[[2,1,3],[1,2,10],[2,1,3]]], output: [6,14], explanation: "Initial sum is 1 + 2 + 3 = 6. After setting arr[1] to 10, sum becomes 1 + 10 + 3 = 14." },
    ],
    tests: [
      { input: [[5],[[2,1,1],[1,1,9],[2,1,1]]], output: [5,9] },
      { input: [[10,20,30,40],[[2,2,3],[1,1,5],[2,1,4],[1,4,50],[2,1,4]]], output: [50,95,105] },
      { input: [[1000000000,1000000000],[[2,1,2],[1,1,500000000],[2,1,2]]], output: [2000000000,1500000000] },
      { input: [[1,1,1,1,1],[[1,3,10],[1,4,20],[2,1,5],[2,3,4]]], output: [33,30] },
      { input: [[8,4,2,1],[[2,1,4],[1,2,0],[2,1,2],[2,2,4]]], output: [15,8,3] },
      { input: [[3,1,4,1,5,9,2,6],[[2,1,8],[1,4,7],[2,3,6],[1,1,10],[2,1,3]]], output: [31,25,15] },
    ],
    hints: [
      "Static prefix sums cannot easily support updates because each update takes O(n) time.",
      "Use a Fenwick tree (Binary Indexed Tree) or Segment Tree, which supports both point updates and range sum queries in O(log n) time.",
      "When arr[k - 1] is updated to u, the difference delta = u - arr[k - 1] is added to the Fenwick tree at index k, and arr[k - 1] is set to u.",
    ],
    solution: {
      idea: [
        "Maintain a Fenwick tree (1-based Binary Indexed Tree) storing 64-bit prefix sums.",
        "Initialize the Fenwick tree with the initial array elements.",
        "For an update [1, k, u], compute delta = u - arr[k - 1], update the tree at position k with delta, and set arr[k - 1] = u.",
        "For a range sum query [2, a, b], compute query(b) - query(a - 1).",
      ],
      complexity: "O((n + q) log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> dynamicRangeSumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size();
        vector<long long> bit(n + 1, 0);
        auto add = [&](int idx, long long val) {
            for (; idx <= n; idx += idx & -idx) bit[idx] += val;
        };
        auto query = [&](int idx) -> long long {
            long long s = 0;
            for (; idx > 0; idx -= idx & -idx) s += bit[idx];
            return s;
        };
        vector<long long> a(arr.begin(), arr.end());
        for (int i = 0; i < n; i++) {
            add(i + 1, a[i]);
        }
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1];
                long long u = q[2];
                long long delta = u - a[k - 1];
                a[k - 1] = u;
                add(k, delta);
            } else if (q[0] == 2) {
                int l = q[1], r = q[2];
                ans.push_back(query(r) - query(l - 1));
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-subordinates",
    source: "cses",
    title: "Subordinates",
    url: "https://cses.fi/problemset/task/1674",
    statement: [
      "A company has n employees numbered 1 to n, where employee 1 is the general director.",
      "For each employee from 2 to n, you are given their direct boss. The bosses array has length n - 1, where bosses[i] is the direct boss of employee i + 2.",
      "A subordinate of an employee is anyone who reports to them directly or indirectly.",
      "Return an array of length n where the i-th element (0-based) is the total number of subordinates of employee i + 1.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "bosses.length == n - 1",
      "1 <= bosses[i] <= n for each i from 0 to n - 2",
    ],
    fn: {name: "subordinates",params: [{name: "n",type: "int"},{name: "bosses",type: "int[]"}],returns: "int[]"},
    examples: [
      { input: [5,[1,1,2,3]], output: [4,1,1,0,0], explanation: "Employee 1 manages 2 and 3; 2 manages 4; 3 manages 5. Counts are [4, 1, 1, 0, 0]." },
      { input: [4,[1,2,3]], output: [3,2,1,0], explanation: "Chain of command 1 -> 2 -> 3 -> 4. Counts are [3, 2, 1, 0]." },
    ],
    tests: [
      { input: [1,[]], output: [0] },
      { input: [2,[1]], output: [1,0] },
      { input: [5,[1,1,1,1]], output: [4,0,0,0,0] },
      { input: [6,[1,1,2,2,3]], output: [5,2,1,0,0,0] },
      { input: [7,[1,1,2,2,3,3]], output: [6,2,2,0,0,0,0] },
      { input: [8,[1,2,1,4,2,6,1]], output: [7,3,0,1,0,1,0,0] },
    ],
    hints: [
      "The reporting hierarchy forms a tree rooted at employee 1. The number of subordinates of node u is the size of its subtree minus 1.",
      "You can traverse the tree from the root using BFS to compute a topological order of employees.",
      "Processing the topological order in reverse (from leaves up to the root) allows you to accumulate subtree sizes: for each child v of u, add 1 + subordinates[v] to subordinates[u].",
    ],
    solution: {
      idea: [
        "Construct an adjacency list representing direct subordinates for each boss.",
        "Perform a BFS starting from node 1 to order all nodes by depth.",
        "Iterate through the BFS order in reverse (bottom-up): for each node u, its subordinate count is the sum of (1 + subordinates[v]) over all direct subordinates v.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> subordinates(int n, vector<int>& bosses) {
        vector<vector<int>> adj(n + 1);
        for (int i = 0; i < n - 1; i++) {
            int emp = i + 2;
            int boss = bosses[i];
            adj[boss].push_back(emp);
        }
        vector<int> order;
        order.reserve(n);
        order.push_back(1);
        for (int i = 0; i < (int)order.size(); i++) {
            int u = order[i];
            for (int v : adj[u]) {
                order.push_back(v);
            }
        }
        vector<int> sub(n, 0);
        for (int i = n - 1; i >= 0; i--) {
            int u = order[i];
            for (int v : adj[u]) {
                sub[u - 1] += 1 + sub[v - 1];
            }
        }
        return sub;
    }
};
`,
    },
  },
  {
    id: "cses-tree-diameter",
    source: "cses",
    title: "Tree Diameter",
    url: "https://cses.fi/problemset/task/1131",
    statement: [
      "You are given a tree consisting of n nodes numbered 1 to n, and n - 1 undirected edges.",
      "The diameter of a tree is the maximum number of edges on any simple path between two nodes.",
      "Return the diameter of the tree.",
    ],
    constraints: [
      "1 <= n <= 200000",
      "edges.length == n - 1",
      "Each edge is a pair [u, v] with 1 <= u, v <= n and u != v",
      "The given edges form a valid tree",
    ],
    fn: {name: "treeDiameter",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [5,[[1,2],[1,3],[3,4],[3,5]]], output: 3, explanation: "The longest path is 2 - 1 - 3 - 4 (or 2 - 1 - 3 - 5), which has 3 edges." },
      { input: [4,[[1,2],[2,3],[3,4]]], output: 3, explanation: "The nodes form a single line of length 3 edges." },
    ],
    tests: [
      { input: [1,[]], output: 0 },
      { input: [2,[[1,2]]], output: 1 },
      { input: [5,[[1,2],[1,3],[1,4],[1,5]]], output: 2 },
      { input: [6,[[1,2],[2,3],[3,4],[4,5],[5,6]]], output: 5 },
      { input: [7,[[1,2],[1,3],[2,4],[2,5],[3,6],[3,7]]], output: 4 },
      { input: [8,[[1,2],[2,3],[2,4],[1,5],[5,6],[6,7],[6,8]]], output: 5 },
    ],
    hints: [
      "The diameter is the length of the longest shortest path between any two nodes in the tree.",
      "A standard technique is two breadth-first searches (BFS). Start at an arbitrary node (say node 1) and find the furthest node u.",
      "The node u is guaranteed to be one endpoint of a diameter. Run a second BFS from u to find the furthest node v. The distance between u and v is the diameter.",
    ],
    solution: {
      idea: [
        "If n <= 1, the diameter is 0.",
        "Run BFS from node 1 to find the node furthest away, u.",
        "Run a second BFS starting from node u; the maximum distance found is the diameter of the tree.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int treeDiameter(int n, vector<vector<int>>& edges) {
        if (n <= 1) return 0;
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        auto bfs = [&](int start) -> pair<int, int> {
            vector<int> dist(n + 1, -1);
            queue<int> q;
            dist[start] = 0;
            q.push(start);
            int farthest = start;
            while (!q.empty()) {
                int u = q.front();
                q.pop();
                if (dist[u] > dist[farthest]) {
                    farthest = u;
                }
                for (int v : adj[u]) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.push(v);
                    }
                }
            }
            return {farthest, dist[farthest]};
        };
        pair<int, int> p1 = bfs(1);
        pair<int, int> p2 = bfs(p1.first);
        return p2.second;
    }
};
`,
    },
  },
  {
    id: "cses-exponentiation",
    source: "cses",
    title: "Exponentiation",
    url: "https://cses.fi/problemset/task/1095",
    statement: [
      "Calculate a^b modulo 10^9 + 7.",
      "By convention, 0^0 = 1.",
      "Return the answer as an integer.",
    ],
    constraints: [
      "0 <= a, b <= 10^9",
    ],
    fn: {name: "exponentiation",params: [{name: "a",type: "int"},{name: "b",type: "int"}],returns: "int"},
    examples: [
      { input: [3,4], output: 81, explanation: "3^4 = 81, and 81 modulo 10^9 + 7 is 81." },
      { input: [0,0], output: 1, explanation: "0^0 is defined as 1." },
    ],
    tests: [
      { input: [2,8], output: 256 },
      { input: [123,0], output: 1 },
      { input: [0,5], output: 0 },
      { input: [2,30], output: 73741817 },
      { input: [10,9], output: 1000000000 },
      { input: [345678,987654], output: 342718019 },
      { input: [1000000000,1000000000], output: 312556845 },
    ],
    hints: [
      "Multiplying a by itself b times takes O(b) operations, which times out for b up to 10^9.",
      "Use binary exponentiation: if b is even, a^b = (a^2)^(b / 2); if b is odd, a^b = a * a^(b - 1).",
      "Multiply using 64-bit integers and reduce modulo 10^9 + 7 after each multiplication to avoid overflow.",
    ],
    solution: {
      idea: [
        "Binary exponentiation computes a^b in O(log b) multiplications.",
        "While b > 0: if the lowest bit of b is 1, multiply the result by the base modulo 10^9 + 7.",
        "Square the base modulo 10^9 + 7 and divide b by 2.",
      ],
      complexity: "O(log b) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int exponentiation(int a, int b) {
        long long base = a;
        long long exp = b;
        long long mod = 1000000007;
        long long res = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return (int)res;
    }
};
`,
    },
  },
  {
    id: "cses-counting-divisors",
    source: "cses",
    title: "Counting Divisors",
    url: "https://cses.fi/problemset/task/1713",
    statement: [
      "Given a positive integer x, calculate the number of positive divisors of x.",
      "For example, 16 has 5 divisors: 1, 2, 4, 8, and 16.",
    ],
    constraints: [
      "1 <= x <= 1000000",
    ],
    fn: {name: "countingDivisors",params: [{name: "x",type: "int"}],returns: "int"},
    examples: [
      { input: [16], output: 5, explanation: "Divisors of 16 are 1, 2, 4, 8, and 16 (5 divisors)." },
      { input: [17], output: 2, explanation: "17 is a prime number, so its divisors are only 1 and 17 (2 divisors)." },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [2], output: 2 },
      { input: [12], output: 6 },
      { input: [36], output: 9 },
      { input: [100], output: 9 },
      { input: [720], output: 30 },
      { input: [999983], output: 2 },
    ],
    hints: [
      "Divisors come in pairs: if d divides x, then x / d is also a divisor.",
      "You only need to loop d from 1 up to floor(sqrt(x)).",
      "For each divisor d: if d * d == x, count 1; otherwise count 2 (both d and x / d).",
    ],
    solution: {
      idea: [
        "Iterate d from 1 up to floor(sqrt(x)).",
        "Whenever x % d == 0, if d * d == x count 1 divisor, otherwise count 2 divisors (d and x / d).",
        "For x <= 10^6, sqrt(x) <= 1000, so this runs in at most 1000 steps.",
      ],
      complexity: "O(sqrt(x)) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countingDivisors(int x) {
        int count = 0;
        for (int d = 1; d * d <= x; d++) {
            if (x % d == 0) {
                if (d * d == x) count += 1;
                else count += 2;
            }
        }
        return count;
    }
};
`,
    },
  },
  {
    id: "cses-common-divisors",
    source: "cses",
    title: "Common Divisors",
    url: "https://cses.fi/problemset/task/1081",
    statement: [
      "You are given an array of n integers.",
      "Find the maximum greatest common divisor (GCD) of any pair of distinct elements arr[i] and arr[j] (where i != j).",
    ],
    constraints: [
      "2 <= arr.length <= 200000",
      "1 <= arr[i] <= 1000000",
    ],
    fn: {name: "commonDivisors",params: [{name: "arr",type: "int[]"}],returns: "int"},
    examples: [
      { input: [[3,14,15,7,9]], output: 7, explanation: "Pair {14, 7} has GCD 7, which is the maximum possible among any pair." },
      { input: [[2,4,8,16]], output: 8, explanation: "Pair {8, 16} has GCD 8, which is the maximum." },
    ],
    tests: [
      { input: [[10,20]], output: 10 },
      { input: [[7,11,13]], output: 1 },
      { input: [[5,5,5]], output: 5 },
      { input: [[12,18,24,30]], output: 12 },
      { input: [[100,200,300,400,500]], output: 200 },
      { input: [[21,35,15,20,28]], output: 7 },
    ],
    hints: [
      "Checking all pairs takes O(n^2) time, which is too slow.",
      "Instead of checking pairs of numbers, iterate over the potential common divisor g from the maximum value down to 1.",
      "Count how many numbers in arr are multiples of g: multiples = count[g] + count[2g] + count[3g] + ... If multiples >= 2, then g is a common divisor of at least two numbers. The first such g is the maximum!",
    ],
    solution: {
      idea: [
        "Find M = max(arr) and count the frequency of each value in a frequency array.",
        "Loop g from M down to 1: sum the frequencies of all multiples of g (g, 2g, 3g, ... <= M).",
        "The first g with a total count >= 2 is the maximum GCD of any pair.",
        "The inner loop runs M/1 + M/2 + ... + M/M = O(M log M) operations in total.",
      ],
      complexity: "O(n + M log M) time, O(M) space where M = max(arr) <= 10^6.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int commonDivisors(vector<int>& arr) {
        int maxVal = 0;
        for (int x : arr) if (x > maxVal) maxVal = x;
        vector<int> cnt(maxVal + 1, 0);
        for (int x : arr) cnt[x]++;
        for (int g = maxVal; g >= 1; g--) {
            int multiples = 0;
            for (int k = g; k <= maxVal; k += g) {
                multiples += cnt[k];
                if (multiples >= 2) return g;
            }
        }
        return 1;
    }
};
`,
    },
  },
  {
    id: "cses-binomial-coefficients",
    source: "cses",
    title: "Binomial Coefficients",
    url: "https://cses.fi/problemset/task/1079",
    statement: [
      "Given a list of queries where each query is a pair [a, b], calculate the binomial coefficient a choose b modulo 10^9 + 7.",
      "The binomial coefficient is defined as a! / (b! * (a - b)!). If b < 0 or b > a, the answer is 0.",
      "Return an array containing the answer for each query in order.",
    ],
    constraints: [
      "1 <= queries.length <= 100000",
      "0 <= b <= a <= 1000000 for each query [a, b]",
    ],
    fn: {name: "binomialCoefficients",params: [{name: "queries",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [[[3,1],[5,3],[6,0]]], output: [3,10,1], explanation: "3 choose 1 is 3; 5 choose 3 is 10; 6 choose 0 is 1." },
      { input: [[[10,5],[4,4],[4,2]]], output: [252,1,6], explanation: "10 choose 5 is 252; 4 choose 4 is 1; 4 choose 2 is 6." },
    ],
    tests: [
      { input: [[[0,0]]], output: [1] },
      { input: [[[1,0],[1,1]]], output: [1,1] },
      { input: [[[5,2],[7,3],[8,4]]], output: [10,35,70] },
      { input: [[[20,10],[15,7],[12,6]]], output: [184756,6435,924] },
      { input: [[[1000,500],[10000,5000]]], output: [159835829,2413012] },
      { input: [[[1000000,500000],[1000000,1]]], output: [996692777,1000000] },
    ],
    hints: [
      "Precompute factorials modulo 10^9 + 7 up to the maximum a value (at most 10^6).",
      "Division modulo prime p = 10^9 + 7 can be computed using modular inverse: 1 / x = x^(p - 2) mod p by Fermat's Little Theorem.",
      "Precompute inverse factorials in O(M): compute invFact[M] = (fact[M])^(p - 2) mod p, then iteratively invFact[i - 1] = invFact[i] * i mod p. Then each query takes O(1) time.",
    ],
    solution: {
      idea: [
        "Precalculate factorials fact[0..M] modulo 10^9 + 7, where M is the maximum a across all queries.",
        "Compute invFact[M] using binary exponentiation, and then compute invFact[i - 1] = invFact[i] * i % MOD for all i down to 1.",
        "Answer each query [a, b] in O(1) as fact[a] * invFact[b] % MOD * invFact[a - b] % MOD.",
      ],
      complexity: "O(M + q) time, O(M) space where M = max(a) <= 10^6 and q is queries.length.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> binomialCoefficients(vector<vector<int>>& queries) {
        const long long MOD = 1000000007;
        int maxA = 0;
        for (const auto& q : queries) {
            if (q[0] > maxA) maxA = q[0];
        }
        if (maxA < 1) maxA = 1;
        vector<long long> fact(maxA + 1, 1);
        for (int i = 2; i <= maxA; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        auto power = [&](long long base, long long exp) -> long long {
            long long res = 1;
            base %= MOD;
            while (exp > 0) {
                if (exp & 1) res = (res * base) % MOD;
                base = (base * base) % MOD;
                exp >>= 1;
            }
            return res;
        };
        vector<long long> invFact(maxA + 1, 1);
        invFact[maxA] = power(fact[maxA], MOD - 2);
        for (int i = maxA - 1; i >= 0; i--) {
            invFact[i] = (invFact[i + 1] * (i + 1)) % MOD;
        }
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0], b = q[1];
            if (b < 0 || b > a) {
                ans.push_back(0);
            } else {
                long long cur = fact[a] * invFact[b] % MOD;
                cur = cur * invFact[a - b] % MOD;
                ans.push_back((int)cur);
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-fibonacci-numbers",
    source: "cses",
    title: "Fibonacci Numbers",
    url: "https://cses.fi/problemset/task/1722",
    statement: [
      "The Fibonacci sequence is defined by F_0 = 0, F_1 = 1, and F_n = F_{n - 1} + F_{n - 2} for all n >= 2.",
      "Given an integer n, calculate F_n modulo 10^9 + 7.",
    ],
    constraints: [
      "0 <= n <= 10^18",
    ],
    fn: {name: "fibonacciNumbers",params: [{name: "n",type: "long"}],returns: "int"},
    examples: [
      { input: [8], output: 21, explanation: "The first several Fibonacci numbers are 0, 1, 1, 2, 3, 5, 8, 13, 21. F_8 is 21." },
      { input: [0], output: 0, explanation: "F_0 is defined as 0." },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [2], output: 1 },
      { input: [10], output: 55 },
      { input: [20], output: 6765 },
      { input: [50], output: 586268941 },
      { input: [100], output: 687995182 },
      { input: [1000000], output: 918091266 },
      { input: [1000000000000000000], output: 209783453 },
    ],
    hints: [
      "Linear iteration is O(n), which is far too slow when n reaches 10^18.",
      "Write the Fibonacci transition in matrix form: [[F_{k+1}, F_k], [F_k, F_{k-1}]] = [[1, 1], [1, 0]]^k.",
      "Use matrix exponentiation by repeated squaring to raise the 2x2 matrix to the power n in O(log n) multiplications, taking all arithmetic modulo 10^9 + 7.",
    ],
    solution: {
      idea: [
        "Represent the transition as multiplying by the 2x2 matrix M = [[1, 1], [1, 0]].",
        "M^n = [[F_{n+1}, F_n], [F_n, F_{n-1}]].",
        "Compute M^n using binary matrix exponentiation in O(log n) matrix multiplications modulo 10^9 + 7.",
      ],
      complexity: "O(log n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int fibonacciNumbers(long long n) {
        if (n == 0) return 0;
        if (n == 1) return 1;
        const long long MOD = 1000000007;
        auto multiply = [&](const vector<vector<long long>>& A, const vector<vector<long long>>& B) {
            vector<vector<long long>> C(2, vector<long long>(2, 0));
            for (int i = 0; i < 2; i++) {
                for (int j = 0; j < 2; j++) {
                    for (int k = 0; k < 2; k++) {
                        C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD;
                    }
                }
            }
            return C;
        };
        vector<vector<long long>> res = {{1, 0}, {0, 1}};
        vector<vector<long long>> base = {{1, 1}, {1, 0}};
        long long exp = n;
        while (exp > 0) {
            if (exp & 1) res = multiply(res, base);
            base = multiply(base, base);
            exp >>= 1;
        }
        return (int)res[0][1];
    }
};
`,
    },
  },
  {
    id: "cses-string-matching",
    source: "cses",
    title: "String Matching",
    url: "https://cses.fi/problemset/task/1753",
    statement: [
      "Given a string s and a pattern string, calculate the number of occurrences of the pattern in s.",
      "Occurrences may overlap: for example, the pattern aa appears 4 times in aaaaa.",
    ],
    constraints: [
      "1 <= s.length, pattern.length <= 1000000",
      "Both s and pattern consist only of lowercase English letters",
    ],
    fn: {name: "stringMatching",params: [{name: "s",type: "string"},{name: "pattern",type: "string"}],returns: "int"},
    examples: [
      { input: ["saippuakauppias","pp"], output: 2, explanation: "The pattern 'pp' appears twice in 'saippuakauppias': at index 4 and index 11." },
      { input: ["aaaaa","aa"], output: 4, explanation: "Overlapping matches are counted: 'aa' occurs starting at indices 0, 1, 2, and 3 (4 times)." },
    ],
    tests: [
      { input: ["hello","world"], output: 0 },
      { input: ["abcde","c"], output: 1 },
      { input: ["ababa","aba"], output: 2 },
      { input: ["mississippi","issi"], output: 2 },
      { input: ["abacaba","a"], output: 4 },
      { input: ["abababab","abab"], output: 3 },
      { input: ["a","a"], output: 1 },
    ],
    hints: [
      "A naive search takes O(|s| * |pattern|) time, which will time out for strings of length up to 10^6.",
      "Use the Knuth-Morris-Pratt (KMP) algorithm to achieve linear O(|s| + |pattern|) time.",
      "Compute the prefix function (pi table) for the pattern. Then scan string s while maintaining the length of the longest matched prefix. Whenever the matched length equals the pattern length, increment your match count and use pi to shift the matching window.",
    ],
    solution: {
      idea: [
        "Precompute the KMP prefix function (pi array) for the pattern in O(|pattern|) time.",
        "Scan through s character by character, updating the longest matched prefix using the pi array.",
        "Whenever the matched length equals |pattern|, increment the count and set the matched length to pi[|pattern| - 1] to continue finding overlapping occurrences.",
      ],
      complexity: "O(|s| + |pattern|) time, O(|pattern|) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int stringMatching(string s, string pattern) {
        int m = pattern.size();
        int n = s.size();
        if (m == 0 || n < m) return 0;
        vector<int> pi(m, 0);
        for (int i = 1, j = 0; i < m; i++) {
            while (j > 0 && pattern[i] != pattern[j]) j = pi[j - 1];
            if (pattern[i] == pattern[j]) j++;
            pi[i] = j;
        }
        int count = 0;
        for (int i = 0, j = 0; i < n; i++) {
            while (j > 0 && s[i] != pattern[j]) j = pi[j - 1];
            if (s[i] == pattern[j]) j++;
            if (j == m) {
                count++;
                j = pi[j - 1];
            }
        }
        return count;
    }
};
`,
    },
  },
];
