import type { ProblemSpec } from "./types";

// CSES Range Queries, round seven (Claude agent 1): 15 more tasks as plain functions. Statements, hints and solutions
// are written for this app; each task links to the original. Where the original reads standard input, the function
// takes arrays and a list of queries (a query is [type, ...numbers], 1-based positions) and returns the answers of the
// queries that ask for one. Every expected output came from compiling and running the C++ reference solution.

export const CSES_RANGE_SPECS: ProblemSpec[] = [
  {
    id: "cses-dynamic-range-minimum-queries",
    source: "cses",
    title: "Dynamic Range Minimum Queries",
    url: "https://cses.fi/problemset/task/1649",
    statement: [
      "You are given an array of n integers and a list of queries that are processed in order. A query [1, k, u] sets the k-th element to u (k is 1-based). A query [2, a, b] asks for the smallest value among the elements at positions a to b, both included.",
      "Return the answers to all queries of the second kind, in the order they were asked. Updates produce no output. Static tricks such as a sparse table stop working because the array changes between questions.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "1 <= arr[i], u <= 10^9",
      "1 <= k <= arr.length and 1 <= a <= b <= arr.length",
      "Every query starts with 1 or 2",
    ],
    fn: {"name":"dynamicRangeMinimumQueries","params":[{"name":"arr","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[3,2,4,5,1,1,5,3],[[2,1,4],[1,3,1],[2,1,4],[2,6,8]]], output: [2,1,1], explanation: "The first question sees 3 2 4 5 with minimum 2. After the update the array starts 3 2 1 5, so the same question gives 1. Positions 6 to 8 hold 1 5 3, minimum 1." },
      { input: [[10,20],[[2,1,2],[1,1,30],[2,1,2]]], output: [10,20], explanation: "Minimum of 10 and 20 is 10. After setting the first element to 30 the minimum is 20." },
    ],
    tests: [
      { input: [[7],[[2,1,1],[1,1,3],[2,1,1]]], output: [7,3] },
      { input: [[5,4,3,2,1],[[2,1,5],[1,5,9],[2,1,5],[2,4,5],[1,4,100],[2,4,5]]], output: [1,2,2,9] },
      { input: [[1000000000,1000000000,1000000000],[[2,1,3],[1,2,1],[2,1,3],[2,3,3]]], output: [1000000000,1,1000000000] },
      { input: [[1,2,3,4],[[1,1,10],[1,2,10],[1,3,10],[2,1,4],[1,4,10],[2,1,4]]], output: [4,10] },
      { input: [[2,2,2,2,2,2],[[2,2,5],[1,3,1],[2,2,5],[2,4,6],[1,3,2],[2,1,6]]], output: [2,1,2,2] },
      { input: [[1,2],[[1,1,5],[1,2,4],[2,1,2]]], output: [4] },
    ],
    hints: [
      "Scanning the whole range for each question is too slow when the array keeps changing. What could you store so a single change touches only a few stored values?",
      "Store the minimum of each block of a balanced binary split of the array. A single change then affects only the blocks that contain that position, one per level.",
      "Use an iterative segment tree: leaves hold the values and each parent holds the minimum of its two children. Update a leaf and walk up; for a range, walk both ends upward and combine the nodes you pick.",
      "The input is 1-based but the tree is 0-based, so convert both ends of each range before you start.",
    ],
    solution: {
      idea: [
        "Keep an iterative segment tree t of size 2n where t[n + i] holds arr[i] and every inner node holds the minimum of its two children.",
        "A point update rewrites one leaf and recomputes its ancestors in O(log n).",
        "A range query converts [a, b] to the half-open [a - 1, b) on leaves and combines the O(log n) boundary nodes.",
      ],
      complexity: "O(n + q log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> dynamicRangeMinimumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size();
        vector<int> t(2 * n);
        for (int i = 0; i < n; i++) t[n + i] = arr[i];
        for (int i = n - 1; i >= 1; i--) t[i] = min(t[2 * i], t[2 * i + 1]);
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int p = q[1] - 1 + n;
                t[p] = q[2];
                for (p >>= 1; p >= 1; p >>= 1) t[p] = min(t[2 * p], t[2 * p + 1]);
            } else {
                int l = q[1] - 1 + n, r = q[2] + n;
                int res = INT_MAX;
                for (; l < r; l >>= 1, r >>= 1) {
                    if (l & 1) res = min(res, t[l++]);
                    if (r & 1) res = min(res, t[--r]);
                }
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
    id: "cses-range-xor-queries",
    source: "cses",
    title: "Range Xor Queries",
    url: "https://cses.fi/problemset/task/1650",
    statement: [
      "Given an array of n integers and q queries, compute the bitwise xor of the elements at positions a to b (1-based, both included) for every query [a, b].",
      "Return the q answers in order. The array never changes between queries.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "1 <= arr[i] <= 10^9",
      "1 <= a <= b <= arr.length for each query [a, b]",
    ],
    fn: {"name":"rangeXorQueries","params":[{"name":"arr","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[3,2,4,5,1,1,5,3],[[2,4],[5,6],[1,8],[3,3]]], output: [3,0,6,4], explanation: "For [2, 4]: 2 xor 4 xor 5 = 3. For [5, 6] the two equal values 1 and 1 cancel to 0. The whole array xors to 6, and a single element is itself (4)." },
      { input: [[6,6,6],[[1,3],[1,2],[2,2]]], output: [6,0,6], explanation: "Three 6s give 6, two 6s cancel to 0, and a single element is itself." },
    ],
    tests: [
      { input: [[9],[[1,1]]], output: [9] },
      { input: [[1,2,3,4,5],[[1,5],[2,4],[3,3],[1,2]]], output: [1,5,3,3] },
      { input: [[1000000000,1000000000,999999999],[[1,3],[1,2],[2,3]]], output: [999999999,0,1023] },
      { input: [[7,7,7,7,7,7],[[1,6],[1,5],[2,5],[3,4]]], output: [0,7,0,0] },
      { input: [[1,2,4,8,16,32,64],[[1,7],[4,7],[2,3]]], output: [127,120,6] },
      { input: [[536870912,536870911,1],[[1,2],[1,3],[3,3]]], output: [1073741823,1073741822,1] },
    ],
    hints: [
      "Recomputing the xor of each range from scratch is wasteful. Could you compute the xor of any range from values stored in advance?",
      "Xor cancels itself: a xor a is 0. If you know the xor of everything up to position a-1 and up to position b, the part in between is what remains when the two are combined.",
      "Build a running xor array once, then answer each query with one xor of two stored entries.",
      "Use an empty prefix with value 0 at index 0, so queries that start at position 1 need no special case.",
    ],
    solution: {
      idea: [
        "Define pref[0] = 0 and pref[i] = pref[i - 1] ^ arr[i - 1].",
        "Elements before a appear in both pref[b] and pref[a - 1], so they cancel and the xor of the range remains.",
        "Each answer is one xor; values stay below 2^30, so int is enough.",
      ],
      complexity: "O(n + q) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> rangeXorQueries(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size();
        vector<int> pref(n + 1, 0);
        for (int i = 0; i < n; i++) pref[i + 1] = pref[i] ^ arr[i];
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) ans.push_back(pref[q[1]] ^ pref[q[0] - 1]);
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-range-update-queries",
    source: "cses",
    title: "Range Update Queries",
    url: "https://cses.fi/problemset/task/1651",
    statement: [
      "You are given an array of n integers and a list of queries processed in order. A query [1, a, b, u] adds u to every element at positions a to b (1-based, inclusive). A query [2, k] asks for the current value of the k-th element.",
      "Return the answers to all queries of the second kind, in order. The values can grow beyond 32 bits, so the answers are 64-bit integers.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "1 <= arr[i], u <= 10^9",
      "1 <= a <= b <= arr.length and 1 <= k <= arr.length",
      "Every query starts with 1 or 2",
    ],
    fn: {"name":"rangeUpdateQueries","params":[{"name":"arr","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"long[]"},
    examples: [
      { input: [[3,2,4,5,1,1,5,3],[[2,4],[1,2,5,1],[1,1,3,5],[2,4]]], output: [5,6], explanation: "The fourth element is 5. Adding 1 to positions 2..5 makes it 6; the second update (positions 1..3) does not touch it, so the second answer is 6." },
      { input: [[1,1,1],[[1,1,3,10],[2,2],[1,2,2,5],[2,2]]], output: [11,16], explanation: "After adding 10 to everything the middle value is 11; adding 5 to position 2 makes it 16." },
    ],
    tests: [
      { input: [[5],[[2,1],[1,1,1,7],[2,1]]], output: [5,12] },
      { input: [[1,2,3,4,5],[[1,1,5,1],[2,1],[2,5],[1,2,4,10],[2,3],[2,5]]], output: [2,6,14,6] },
      { input: [[1000000000,1000000000],[[1,1,2,1000000000],[1,1,2,1000000000],[2,1],[2,2]]], output: [3000000000,3000000000] },
      { input: [[1,1,1,1],[[1,2,3,4],[2,1],[2,2],[2,3],[2,4]]], output: [1,5,5,1] },
      { input: [[9,8,7,6],[[1,4,4,3],[2,4],[1,1,4,1],[2,4],[2,1]]], output: [9,10,10] },
      { input: [[2,4,6,8,10,12],[[1,1,3,5],[1,3,6,5],[2,3],[2,6],[2,1]]], output: [16,17,7] },
    ],
    hints: [
      "Adding a value to every element of a range one by one is slow. Could you record only where the change starts and where it stops?",
      "Store each change as a difference: an add at the start and a matching subtract just after the end. The value at a position is the running total of those differences plus the original value.",
      "Keep the differences in a Fenwick tree so that each change and each running total takes logarithmic time.",
      "Values can grow large, so use 64-bit numbers for the tree and for the answers.",
    ],
    solution: {
      idea: [
        "Store the original array unchanged and a Fenwick tree over the difference array of the added amounts.",
        "A range add is two point updates: +u at a and -u at b + 1 (skip it when b + 1 is past the end).",
        "The current value at k is arr[k - 1] + prefix(k).",
      ],
      complexity: "O((n + q) log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> rangeUpdateQueries(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size();
        vector<long long> bit(n + 2, 0);
        auto add = [&](int i, long long v) { for (; i <= n; i += i & -i) bit[i] += v; };
        auto pref = [&](int i) { long long s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                add(q[1], q[3]);
                if (q[2] + 1 <= n) add(q[2] + 1, -(long long)q[3]);
            } else {
                ans.push_back(arr[q[1] - 1] + pref(q[1]));
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-forest-queries",
    source: "cses",
    title: "Forest Queries",
    url: "https://cses.fi/problemset/task/1652",
    statement: [
      "A square map of a forest has n rows of n characters. A '*' is a tree and a '.' is an empty square. Each query [y1, x1, y2, x2] describes a rectangle by its top-left square (row y1, column x1) and bottom-right square (row y2, column x2), rows and columns counted from 1.",
      "For every query, return how many trees lie inside the rectangle (borders included). The map does not change between queries.",
    ],
    constraints: [
      "1 <= n <= 1000 where n is the number of rows and each row has n characters",
      "Each character is '.' or '*'",
      "1 <= queries.length <= 200000",
      "1 <= y1 <= y2 <= n and 1 <= x1 <= x2 <= n",
    ],
    fn: {"name":"forestQueries","params":[{"name":"forest","type":"string[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[".*..","*.**","**..","****"],[[2,2,3,4],[3,1,3,1],[1,1,2,2]]], output: [3,1,2], explanation: "The rectangle rows 2..3, columns 2..4 contains the trees at (2,3), (2,4), (3,2): three trees. Square (3,1) is a tree. Rows 1..2, columns 1..2 hold the trees at (1,2) and (2,1)." },
      { input: [["..",".."],[[1,1,2,2]]], output: [0], explanation: "No trees at all." },
    ],
    tests: [
      { input: [["*"],[[1,1,1,1]]], output: [1] },
      { input: [["."],[[1,1,1,1]]], output: [0] },
      { input: [["**","**"],[[1,1,2,2],[1,1,1,2],[2,2,2,2],[1,2,2,2]]], output: [4,2,1,2] },
      { input: [["*.*",".*.","*.*"],[[1,1,3,3],[2,2,2,2],[1,1,2,2],[2,1,3,2]]], output: [5,1,2,2] },
      { input: [["....*","...*.","..*..",".*...","*...."],[[1,1,5,5],[1,1,3,3],[3,3,5,5],[2,4,4,5]]], output: [5,1,1,1] },
      { input: [["***","...","***"],[[1,1,3,3],[2,1,2,3],[1,2,3,2],[3,1,3,1]]], output: [6,0,2,1] },
    ],
    hints: [
      "Counting the cells of each rectangle one by one is too slow. Can you precompute counts that describe every rectangle that starts at the top-left corner?",
      "Let each cell hold the number of trees in the rectangle from the top-left corner down to that cell. Each such cell can be built from its upper and left neighbours and itself.",
      "Build the table once with the inclusion-exclusion recurrence. Then answer each query by subtracting two strips and adding back the overlap at the corner.",
      "Add an extra row and column of zeros at the top and left, so border queries need no special cases.",
    ],
    solution: {
      idea: [
        "Build a (n + 1) x (n + 1) table of prefix tree counts with a zero border.",
        "Each query is inclusion and exclusion over four table entries.",
        "The counts are at most 10^6, so int is enough.",
      ],
      complexity: "O(n^2 + q) time, O(n^2) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> forestQueries(vector<string>& forest, vector<vector<int>>& queries) {
        int n = forest.size();
        vector<vector<int>> p(n + 1, vector<int>(n + 1, 0));
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= n; j++)
                p[i][j] = (forest[i - 1][j - 1] == '*') + p[i - 1][j] + p[i][j - 1] - p[i - 1][j - 1];
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int y1 = q[0], x1 = q[1], y2 = q[2], x2 = q[3];
            ans.push_back(p[y2][x2] - p[y1 - 1][x2] - p[y2][x1 - 1] + p[y1 - 1][x1 - 1]);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-forest-queries-ii",
    source: "cses",
    title: "Forest Queries II",
    url: "https://cses.fi/problemset/task/1739",
    statement: [
      "A square map of a forest has n rows of n characters: '*' is a tree and '.' is an empty square. Queries are processed in order. A query [1, y, x] flips the square in row y, column x (a tree is cut down, or a tree grows on an empty square). A query [2, y1, x1, y2, x2] asks how many trees are inside the rectangle with top-left square (y1, x1) and bottom-right square (y2, x2), borders included.",
      "Return the answers to all queries of the second kind, in order. Rows and columns are counted from 1.",
    ],
    constraints: [
      "1 <= n <= 1000 where n is the number of rows and each row has n characters",
      "Each character is '.' or '*'",
      "1 <= queries.length <= 200000",
      "Type 1 queries have 1 <= y, x <= n; type 2 queries have 1 <= y1 <= y2 <= n and 1 <= x1 <= x2 <= n",
    ],
    fn: {"name":"forestQueriesII","params":[{"name":"forest","type":"string[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[".*..","*.**","**..","****"],[[2,2,3,4,4],[1,3,3],[2,2,3,4,4]]], output: [4,5], explanation: "The first query [2, 2, 3, 4, 4] covers rows 2 to 4 and columns 3 to 4, which hold 4 trees. The update flips square (3, 3) from '.' to '*', so the same rectangle then holds 5." },
      { input: [["*.",".."],[[2,1,1,2,2],[1,2,2],[1,1,1],[2,1,1,2,2]]], output: [1,1], explanation: "One tree at first. Then a tree grows at (2, 2) and the one at (1, 1) is cut, so one tree remains." },
    ],
    tests: [
      { input: [["*"],[[2,1,1,1,1],[1,1,1],[2,1,1,1,1],[1,1,1],[2,1,1,1,1]]], output: [1,0,1] },
      { input: [["..",".."],[[2,1,1,2,2],[1,1,2],[1,2,1],[2,1,1,2,2],[2,1,1,1,2]]], output: [0,2,1] },
      { input: [["***","***","***"],[[2,1,1,3,3],[1,2,2],[2,1,1,3,3],[2,2,2,2,2],[1,2,2],[2,2,2,2,2]]], output: [9,8,0,1] },
      { input: [["*.*.",".*.*","*.*.",".*.*"],[[2,1,1,4,4],[1,1,1],[1,1,2],[2,1,1,2,2],[2,3,3,4,4]]], output: [8,2,2] },
      { input: [["....","....","....","...."],[[1,4,4],[1,4,4],[2,1,1,4,4],[1,2,3],[2,2,2,3,3],[2,1,1,1,1]]], output: [0,1,0] },
      { input: [[".*.","*.*",".*."],[[1,2,2],[2,1,1,3,3],[2,1,2,3,2],[1,1,2],[2,1,2,3,2]]], output: [5,3,2] },
    ],
    hints: [
      "A precomputed table breaks as soon as one square flips. What structure can take a single change and still answer rectangle counts quickly?",
      "Use a two-dimensional Fenwick tree: a Fenwick tree over rows whose entries are Fenwick trees over columns.",
      "A point update walks a chain of rows and, inside each row, a chain of columns. A prefix count uses the same two chains, and a rectangle combines four prefixes.",
      "Keep a separate copy of the grid, so each flip knows whether it adds one tree or removes one.",
    ],
    solution: {
      idea: [
        "Keep a boolean grid and a 2D Fenwick tree of tree counts.",
        "Build the tree in O(n^2) by copying the grid into it and then pushing each cell into its Fenwick parent along columns and then along rows.",
        "A flip adds +1 or -1 at one cell; a rectangle query is four prefix queries combined by inclusion and exclusion.",
      ],
      complexity: "O(n^2 + q log^2 n) time, O(n^2) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> forestQueriesII(vector<string>& forest, vector<vector<int>>& queries) {
        int n = forest.size();
        vector<vector<int>> t(n + 1, vector<int>(n + 1, 0));
        vector<vector<char>> g(n + 1, vector<char>(n + 1, 0));
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= n; j++) { g[i][j] = forest[i - 1][j - 1] == '*'; t[i][j] = g[i][j]; }
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= n; j++) { int jj = j + (j & -j); if (jj <= n) t[i][jj] += t[i][j]; }
        for (int i = 1; i <= n; i++) {
            int ii = i + (i & -i);
            if (ii <= n) for (int j = 1; j <= n; j++) t[ii][j] += t[i][j];
        }
        auto upd = [&](int y, int x, int v) {
            for (int i = y; i <= n; i += i & -i)
                for (int j = x; j <= n; j += j & -j) t[i][j] += v;
        };
        auto pre = [&](int y, int x) {
            int s = 0;
            for (int i = y; i > 0; i -= i & -i)
                for (int j = x; j > 0; j -= j & -j) s += t[i][j];
            return s;
        };
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int y = q[1], x = q[2];
                upd(y, x, g[y][x] ? -1 : 1);
                g[y][x] ^= 1;
            } else {
                int y1 = q[1], x1 = q[2], y2 = q[3], x2 = q[4];
                ans.push_back(pre(y2, x2) - pre(y1 - 1, x2) - pre(y2, x1 - 1) + pre(y1 - 1, x1 - 1));
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-hotel-queries",
    source: "cses",
    title: "Hotel Queries",
    url: "https://cses.fi/problemset/task/1143",
    statement: [
      "A row of n hotels is numbered 1 to n from left to right. Hotel i has rooms[i - 1] free rooms. Groups arrive one at a time; group j needs groups[j] rooms, all in one hotel. Each group goes to the leftmost hotel that still has at least that many free rooms, and those rooms are then used up.",
      "For every group, in arrival order, return the number of the hotel it is placed in, or 0 if no hotel has enough rooms (that group leaves and nothing changes).",
    ],
    constraints: [
      "1 <= rooms.length, groups.length <= 200000",
      "1 <= rooms[i], groups[j] <= 10^9",
    ],
    fn: {"name":"hotelQueries","params":[{"name":"rooms","type":"int[]"},{"name":"groups","type":"int[]"}],"returns":"int[]"},
    examples: [
      { input: [[3,2,4,1,5,5,2],[4,4,7,1]], output: [3,5,0,1], explanation: "Group 4 takes hotel 3 (4 rooms, now 0). The next 4 goes to hotel 5 (now 1). Nobody has 7 rooms, so 0. A single room goes to hotel 1." },
      { input: [[1,1],[2,1,1,1]], output: [0,1,2,0], explanation: "Two rooms do not fit anywhere. Then the two single-room groups fill hotels 1 and 2, and the last group finds no space." },
    ],
    tests: [
      { input: [[5],[5,1]], output: [1,0] },
      { input: [[1,2,3],[3,3,2,1,1]], output: [3,0,2,1,0] },
      { input: [[10,10,10],[10,10,10,10]], output: [1,2,3,0] },
      { input: [[1000000000,1],[1000000000,1,1]], output: [1,2,0] },
      { input: [[2,2,2,2],[1,1,1,1,1,1,1,1,1]], output: [1,1,2,2,3,3,4,4,0] },
      { input: [[4,3,2,1],[1,2,3,4,4]], output: [1,1,2,0,0] },
    ],
    hints: [
      "Scanning all hotels from the left for each group is too slow. Could a tree that remembers the largest free room count of each range let you jump to a hotel that fits?",
      "The root of a maximum tree says at once whether any hotel can take the group. If one can, walk down, going left whenever the left side still has enough rooms.",
      "Use a segment tree of maximums. Descend to the leftmost leaf with at least the group size, subtract the group size there, and refresh the maximums on the way back up.",
      "If no hotel has enough rooms, print 0 and change nothing. A tree size that is a power of two keeps the walk down simple.",
    ],
    solution: {
      idea: [
        "Build a max segment tree over free rooms (size rounded up to a power of two, padding with 0).",
        "If the root maximum is below r the answer is 0. Otherwise descend preferring the left child whenever its maximum is at least r.",
        "Subtract r at the leaf and fix the maximums of its ancestors.",
      ],
      complexity: "O(n + q log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> hotelQueries(vector<int>& rooms, vector<int>& groups) {
        int n = rooms.size(), sz = 1;
        while (sz < n) sz <<= 1;
        vector<int> t(2 * sz, 0);
        for (int i = 0; i < n; i++) t[sz + i] = rooms[i];
        for (int i = sz - 1; i >= 1; i--) t[i] = max(t[2 * i], t[2 * i + 1]);
        vector<int> ans;
        ans.reserve(groups.size());
        for (int r : groups) {
            if (t[1] < r) { ans.push_back(0); continue; }
            int p = 1;
            while (p < sz) p = (t[2 * p] >= r) ? 2 * p : 2 * p + 1;
            t[p] -= r;
            ans.push_back(p - sz + 1);
            for (p >>= 1; p >= 1; p >>= 1) t[p] = max(t[2 * p], t[2 * p + 1]);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-list-removals",
    source: "cses",
    title: "List Removals",
    url: "https://cses.fi/problemset/task/1749",
    statement: [
      "You have a list of n integers. You then remove elements one by one. The j-th removal is given as positions[j]: remove the element currently standing at that 1-based position in the list (positions are counted among the elements that are still present, so they shift left after each removal). The positions form a valid sequence: positions[j] is at most the current length of the list.",
      "Return the values that are removed, in order.",
    ],
    constraints: [
      "1 <= arr.length <= 200000",
      "positions.length == arr.length",
      "1 <= arr[i] <= 10^9",
      "positions[j] is between 1 and arr.length - j (0-based j), so every removal is valid",
    ],
    fn: {"name":"listRemovals","params":[{"name":"arr","type":"int[]"},{"name":"positions","type":"int[]"}],"returns":"int[]"},
    examples: [
      { input: [[2,6,1,4,2],[3,1,3,1,1]], output: [1,2,2,6,4], explanation: "Position 3 is value 1 (list becomes 2 6 4 2). Position 1 is 2 (6 4 2). Position 3 is 2 (6 4). Position 1 is 6 (4). Position 1 is 4." },
      { input: [[10,20,30],[3,2,1]], output: [30,20,10], explanation: "Remove the last (30), then the second (20), then the only one left (10)." },
    ],
    tests: [
      { input: [[7],[1]], output: [7] },
      { input: [[1,2,3,4,5],[1,1,1,1,1]], output: [1,2,3,4,5] },
      { input: [[1,2,3,4,5],[5,4,3,2,1]], output: [5,4,3,2,1] },
      { input: [[5,4,3,2,1],[3,3,2,1,1]], output: [3,2,4,5,1] },
      { input: [[1000000000,999999999,1],[2,2,1]], output: [999999999,1,1000000000] },
      { input: [[9,8,7,6,5,4],[2,4,1,2,2,1]], output: [8,5,9,6,4,7] },
    ],
    hints: [
      "Removing from the middle of a list shifts everything after it. Can you find the k-th surviving element without moving anything?",
      "Mark each original position as present (1) or removed (0). The current position of an element is the number of present marks up to and including it.",
      "Keep the marks in a Fenwick tree and search for the smallest position where the running count reaches k. Descend the tree in steps of powers of two.",
      "After finding an element, clear its mark. Build the starting tree directly from all ones instead of adding n values one by one.",
    ],
    solution: {
      idea: [
        "Fenwick tree initialised to 1 for every element; the prefix sum of an index equals the number of survivors at or before it.",
        "To remove the k-th survivor, descend the tree to find the smallest index with prefix sum k.",
        "Record arr at that index and subtract one from the tree there.",
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> listRemovals(vector<int>& arr, vector<int>& positions) {
        int n = arr.size();
        vector<int> bit(n + 1, 0);
        for (int i = 1; i <= n; i++) { bit[i] += 1; int j = i + (i & -i); if (j <= n) bit[j] += bit[i]; }
        int top = 1;
        while (top * 2 <= n) top *= 2;
        vector<int> ans;
        ans.reserve(n);
        for (int k : positions) {
            int pos = 0;
            for (int step = top; step > 0; step >>= 1) {
                if (pos + step <= n && bit[pos + step] < k) { pos += step; k -= bit[pos]; }
            }
            int idx = pos + 1;
            ans.push_back(arr[idx - 1]);
            for (int i = idx; i <= n; i += i & -i) bit[i]--;
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-salary-queries",
    source: "cses",
    title: "Salary Queries",
    url: "https://cses.fi/problemset/task/1144",
    statement: [
      "A company has n employees with the given salaries. Queries are processed in order. A query [1, k, x] changes the salary of the k-th employee (1-based) to x. A query [2, a, b] asks how many employees currently earn a salary between a and b, both included.",
      "Return the answers to all queries of the second kind, in order. Salaries go up to 10^9, so you cannot index an array by salary directly.",
    ],
    constraints: [
      "1 <= salaries.length, queries.length <= 200000",
      "1 <= salaries[i], x <= 10^9",
      "1 <= k <= salaries.length",
      "1 <= a <= b <= 10^9 in type 2 queries",
    ],
    fn: {"name":"salaryQueries","params":[{"name":"salaries","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[3,7,2,2,5],[[2,2,3],[1,3,6],[2,2,3],[1,5,2],[2,2,3]]], output: [3,2,3], explanation: "At first the salaries 3, 2 and 2 are in [2, 3], so 3. After employee 3 gets 6, only 3 and 2 remain in range: 2. After employee 5 gets 2 the salaries are 3 7 6 2 2, so 3 are in range." },
      { input: [[10,20,30],[[2,15,25],[1,1,22],[2,15,25]]], output: [1,2], explanation: "Only 20 is in [15, 25]. After the first salary becomes 22 there are two such employees." },
    ],
    tests: [
      { input: [[5],[[2,1,10],[1,1,20],[2,1,10],[2,20,20]]], output: [1,0,1] },
      { input: [[1,2,3,4,5],[[2,1,5],[2,2,4],[1,1,100],[2,1,5],[2,4,100]]], output: [5,3,4,3] },
      { input: [[1000000000,1000000000],[[2,1,1000000000],[1,2,1],[2,1,1],[2,2,999999999]]], output: [2,1,0] },
      { input: [[4,4,4,4],[[2,4,4],[1,1,5],[1,2,5],[2,4,4],[2,5,5],[2,1,3]]], output: [4,2,2,0] },
      { input: [[10,20,30,40,50],[[2,25,45],[1,3,60],[2,25,45],[1,5,1],[2,1,25]]], output: [2,1,3] },
      { input: [[7,7],[[1,1,3],[1,2,3],[2,3,3],[2,4,7],[2,1,2]]], output: [2,0,0] },
    ],
    hints: [
      "Salaries go up to a billion, so you cannot index an array by salary. What can you do with only the values that actually appear?",
      "Only the initial salaries and the new salaries from updates ever matter, so each distinct value can be mapped to a small rank.",
      "Sort the collected values and keep a Fenwick tree of counts by rank. A range [a, b] becomes the difference of two prefix counts found by binary search.",
      "An update removes one count at the old rank and adds one at the new rank.",
    ],
    solution: {
      idea: [
        "Gather all values that can ever be a salary into a sorted unique vector vals.",
        "A Fenwick tree stores how many employees have each compressed salary.",
        "For [a, b], count compressed indices with vals >= a and vals <= b using lower_bound and upper_bound; queries bounds need not be in vals.",
      ],
      complexity: "O((n + q) log (n + q)) time, O(n + q) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> salaryQueries(vector<int>& salaries, vector<vector<int>>& queries) {
        vector<int> vals(salaries.begin(), salaries.end());
        for (const auto& q : queries) if (q[0] == 1) vals.push_back(q[2]);
        sort(vals.begin(), vals.end());
        vals.erase(unique(vals.begin(), vals.end()), vals.end());
        int m = vals.size();
        vector<int> bit(m + 1, 0);
        auto add = [&](int i, int v) { for (; i <= m; i += i & -i) bit[i] += v; };
        auto pre = [&](int i) { int s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
        auto id = [&](int v) { return int(lower_bound(vals.begin(), vals.end(), v) - vals.begin()) + 1; };
        vector<int> cur = salaries;
        for (int v : cur) add(id(v), 1);
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                add(id(cur[q[1] - 1]), -1);
                cur[q[1] - 1] = q[2];
                add(id(q[2]), 1);
            } else {
                int lo = int(lower_bound(vals.begin(), vals.end(), q[1]) - vals.begin());
                int hi = int(upper_bound(vals.begin(), vals.end(), q[2]) - vals.begin());
                ans.push_back(pre(hi) - pre(lo));
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-prefix-sum-queries",
    source: "cses",
    title: "Prefix Sum Queries",
    url: "https://cses.fi/problemset/task/2166",
    statement: [
      "You are given an array of n integers (they can be negative) and queries processed in order. A query [1, k, u] sets the k-th element to u. A query [2, a, b] asks for the largest sum of a prefix of the subarray from position a to position b: the best value of arr[a] + ... + arr[j] over all j from a to b. The empty prefix is allowed, so the answer is never negative.",
      "Return the answers to all queries of the second kind, in order. Positions are 1-based. (This follows the original task; the empty-prefix rule is stated here so the answer is unique.)",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "-10^9 <= arr[i], u <= 10^9",
      "1 <= k <= arr.length and 1 <= a <= b <= arr.length",
      "Every query starts with 1 or 2",
    ],
    fn: {"name":"prefixSumQueries","params":[{"name":"arr","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"long[]"},
    examples: [
      { input: [[1,2,-3,3,1,-5,1,4],[[2,2,5],[2,1,8],[1,3,1],[2,2,5]]], output: [3,4,7], explanation: "From position 2 the running sums over positions 2..5 are 2, -1, 2, 3 so the best is 3. Over the whole array the running sums are 1, 3, 0, 3, 4, -1, 0, 4, best 4. After the update the third element is 1 and positions 2..5 give 2, 3, 6, 7, best 7." },
      { input: [[-5,-1,-2],[[2,1,3],[1,2,4],[2,1,3]]], output: [0,0], explanation: "Every non-empty prefix is negative, so the answer is 0 (the empty prefix). After the update the prefix -5 + 4 is still negative, so 0 again." },
    ],
    tests: [
      { input: [[-3],[[2,1,1],[1,1,3],[2,1,1]]], output: [0,3] },
      { input: [[1,2,3,4,5],[[2,1,5],[2,3,5],[1,1,-10],[2,1,5],[2,2,5]]], output: [15,12,4,14] },
      { input: [[1000000000,1000000000,1000000000],[[2,1,3],[1,2,-1000000000],[2,1,3],[1,3,1000000000],[2,1,3]]], output: [3000000000,1000000000,1000000000] },
      { input: [[-1,-2,-3,-4],[[2,1,4],[2,2,3],[1,4,100],[2,1,4],[2,4,4]]], output: [0,0,94,100] },
      { input: [[5,-5,5,-5,5,-5],[[2,1,6],[2,2,6],[2,3,3],[1,2,6],[2,1,6]]], output: [5,0,5,16] },
      { input: [[-1000000000,1000000000,-1000000000,1000000000],[[2,1,4],[2,2,4],[1,1,1000000000],[2,1,4]]], output: [0,1000000000,2000000000] },
    ],
    hints: [
      "A single pass over the range answers one query, but the array keeps changing. Which structure answers range questions and also takes point updates?",
      "For a range, keep two numbers: its total and its best prefix sum. Two neighbouring ranges combine in a simple way, but the left one must come first.",
      "Use a segment tree whose nodes store the total and the best prefix. Combine the covering nodes from left to right, because the order matters.",
      "The empty prefix is allowed, so every stored best prefix is at least 0, even for a single negative value.",
    ],
    solution: {
      idea: [
        "Segment tree whose node holds (sum, best prefix with the empty prefix allowed).",
        "Merge(L, R) = (L.sum + R.sum, max(L.pref, L.sum + R.pref)); it is associative but order matters.",
        "Updates rewrite a leaf and recompute ancestors; queries fold the nodes covering [a, b] from left to right.",
      ],
      complexity: "O(n + q log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    struct Node { long long sum, pref; };
    static Node mergeNodes(const Node& l, const Node& r) { return {l.sum + r.sum, max(l.pref, l.sum + r.pref)}; }
    int n;
    vector<Node> t;
    void build(int v, int l, int r, vector<int>& a) {
        if (l == r) { t[v] = {a[l], max(0, a[l])}; return; }
        int m = (l + r) / 2;
        build(2 * v, l, m, a); build(2 * v + 1, m + 1, r, a);
        t[v] = mergeNodes(t[2 * v], t[2 * v + 1]);
    }
    void update(int v, int l, int r, int p, int x) {
        if (l == r) { t[v] = {x, max(0, x)}; return; }
        int m = (l + r) / 2;
        if (p <= m) update(2 * v, l, m, p, x); else update(2 * v + 1, m + 1, r, p, x);
        t[v] = mergeNodes(t[2 * v], t[2 * v + 1]);
    }
    Node query(int v, int l, int r, int a, int b) {
        if (a <= l && r <= b) return t[v];
        int m = (l + r) / 2;
        if (b <= m) return query(2 * v, l, m, a, b);
        if (a > m) return query(2 * v + 1, m + 1, r, a, b);
        return mergeNodes(query(2 * v, l, m, a, b), query(2 * v + 1, m + 1, r, a, b));
    }
    vector<long long> prefixSumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        n = arr.size();
        t.assign(4 * n, {0, 0});
        build(1, 0, n - 1, arr);
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) update(1, 0, n - 1, q[1] - 1, q[2]);
            else ans.push_back(query(1, 0, n - 1, q[1] - 1, q[2] - 1).pref);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-subarray-sum-queries",
    source: "cses",
    title: "Subarray Sum Queries",
    url: "https://cses.fi/problemset/task/1190",
    statement: [
      "You are given an array of n integers (possibly negative). Then m updates are applied one after another; update [k, x] sets the k-th element (1-based) to x. After each update, report the maximum sum of any contiguous subarray of the whole array. The empty subarray is allowed, so the answer is at least 0.",
      "Return the m answers in order. This is the dynamic version of Kadane's algorithm: rerunning it after every update is too slow.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "-10^9 <= arr[i], x <= 10^9",
      "1 <= k <= arr.length for each update [k, x]",
    ],
    fn: {"name":"subarraySumQueries","params":[{"name":"arr","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"long[]"},
    examples: [
      { input: [[1,3,-1,2,1],[[2,4],[3,1],[5,-3]]], output: [7,9,8], explanation: "After the first update the array is 1 4 -1 2 1 with best subarray 1+4-1+2+1 = 7. After the second 1 4 1 2 1 sums to 9. After the third 1 4 1 2 -3 the best is 8." },
      { input: [[-1,-2],[[1,-5],[2,3]]], output: [0,3], explanation: "All elements are negative so the empty subarray gives 0. After the second update the array is -5 3, best 3." },
    ],
    tests: [
      { input: [[5],[[1,-5],[1,5]]], output: [0,5] },
      { input: [[1,2,3],[[2,-10],[2,10],[1,-1],[3,-1]]], output: [3,14,13,10] },
      { input: [[1000000000,1000000000,1000000000],[[2,-1000000000],[2,1000000000],[1,-1000000000]]], output: [1000000000,3000000000,2000000000] },
      { input: [[-1,-1,-1,-1],[[1,1],[4,1],[2,1],[3,1]]], output: [1,1,2,4] },
      { input: [[4,-1,2,-7,3,3],[[4,0],[1,-4],[5,-10],[6,10]]], output: [11,8,3,10] },
      { input: [[0,0,0],[[2,0],[2,1],[2,-1]]], output: [0,1,0] },
    ],
    hints: [
      "Kadane's method solves one static array quickly. With many updates, what could you store for each block so that an update only re-merges a few blocks?",
      "Each block needs four numbers: its total, best prefix, best suffix and best subarray. Merging two neighbouring blocks uses only these numbers.",
      "Use a segment tree of these four values. After each update, re-merge the changed leaf up to the root. The root's best value is the answer.",
      "Empty subarrays are allowed, so every stored value is at least 0.",
    ],
    solution: {
      idea: [
        "Segment tree of nodes (sum, pref, suf, best) with the empty choice allowed.",
        "A best subarray lies entirely in the left half, entirely in the right half, or crosses the middle as (best suffix of left) + (best prefix of right).",
        "Update one leaf, recompute ancestors, and read root.best.",
      ],
      complexity: "O(n + m log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    struct Node { long long sum, pref, suf, best; };
    static Node leaf(long long x) { long long p = max(0LL, x); return {x, p, p, p}; }
    static Node mergeNodes(const Node& l, const Node& r) {
        return {l.sum + r.sum, max(l.pref, l.sum + r.pref), max(r.suf, r.sum + l.suf), max({l.best, r.best, l.suf + r.pref})};
    }
    vector<Node> t;
    void build(int v, int l, int r, vector<int>& a) {
        if (l == r) { t[v] = leaf(a[l]); return; }
        int m = (l + r) / 2;
        build(2 * v, l, m, a); build(2 * v + 1, m + 1, r, a);
        t[v] = mergeNodes(t[2 * v], t[2 * v + 1]);
    }
    void update(int v, int l, int r, int p, int x) {
        if (l == r) { t[v] = leaf(x); return; }
        int m = (l + r) / 2;
        if (p <= m) update(2 * v, l, m, p, x); else update(2 * v + 1, m + 1, r, p, x);
        t[v] = mergeNodes(t[2 * v], t[2 * v + 1]);
    }
    vector<long long> subarraySumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size();
        t.assign(4 * n, {0, 0, 0, 0});
        build(1, 0, n - 1, arr);
        vector<long long> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            update(1, 0, n - 1, q[0] - 1, q[1]);
            ans.push_back(t[1].best);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-pizzeria-queries",
    source: "cses",
    title: "Pizzeria Queries",
    url: "https://cses.fi/problemset/task/2206",
    statement: [
      "There are n buildings in a row, and building i has a pizzeria with pizza price prices[i - 1]. If you stand in building k and order from building i, you pay the price plus the walking distance |i - k|. A query [1, k, x] changes the price in building k to x. A query [2, k] asks for the cheapest total cost for someone who lives in building k, choosing the best pizzeria (possibly their own).",
      "Return the answers to all queries of the second kind, in order. Positions are 1-based.",
    ],
    constraints: [
      "1 <= prices.length, queries.length <= 200000",
      "1 <= prices[i], x <= 10^9",
      "1 <= k <= prices.length",
      "Every query starts with 1 or 2",
    ],
    fn: {"name":"pizzeriaQueries","params":[{"name":"prices","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[7,6,4,6,2],[[2,2],[1,3,10],[2,3],[1,5,1],[2,1]]], output: [5,4,5], explanation: "For building 2 the best is its own pizza for 6, or building 3 at 4 + 1 = 5. So 5. After building 3 becomes 10, building 3 itself costs 10 but building 5 costs 2 + 2 = 4 and building 2 costs 6 + 1 = 7, so 4. Then building 5 becomes 1: from building 1 that costs 1 + 4 = 5." },
      { input: [[1,100],[[2,2],[1,1,100],[2,2]]], output: [2,100], explanation: "Building 2 can walk to building 1: 1 + 1 = 2. After the update that costs 101, so it buys at home for 100." },
    ],
    tests: [
      { input: [[5],[[2,1],[1,1,3],[2,1]]], output: [5,3] },
      { input: [[1,2,3,4,5],[[2,5],[2,1],[1,1,100],[2,1],[2,3]]], output: [5,1,3,3] },
      { input: [[1000000000,1000000000,1000000000],[[2,2],[1,3,1],[2,1],[2,3]]], output: [1000000000,3,1] },
      { input: [[10,1,10,10,10,10],[[2,6],[2,1],[1,1,1],[2,4],[1,2,50],[2,6]]], output: [5,2,3,6] },
      { input: [[3,3,3,3],[[2,1],[2,2],[2,3],[2,4]]], output: [3,3,3,3] },
      { input: [[9,8,7,6,5,4,3],[[2,1],[1,7,100],[2,1],[2,7],[1,1,1],[2,7]]], output: [9,9,5,5] },
    ],
    hints: [
      "Checking every pizzeria for each query is too slow. Split the pizzerias into those left of the customer and those right of it, and look at how the distance behaves in each part.",
      "On the left, the cost is the price minus the position, plus the customer's position. On the right, it is the price plus the position, minus the customer's position.",
      "Keep two minimum segment trees: one over price minus position and one over price plus position. Query a prefix of the first and a suffix of the second.",
      "A price change updates one leaf in each tree. Use 64-bit values to be safe.",
    ],
    solution: {
      idea: [
        "Define A[i] = prices[i] - i and B[i] = prices[i] + i with i 1-based.",
        "The best cost for k is min( min over i <= k of A[i] + k, min over i >= k of B[i] - k ).",
        "Two iterative min segment trees give point update and range minimum in O(log n).",
      ],
      complexity: "O(n + q log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> pizzeriaQueries(vector<int>& prices, vector<vector<int>>& queries) {
        int n = prices.size();
        const long long INF = LLONG_MAX / 4;
        vector<long long> A(2 * n, INF), B(2 * n, INF);
        for (int i = 0; i < n; i++) { A[n + i] = (long long)prices[i] - (i + 1); B[n + i] = (long long)prices[i] + (i + 1); }
        for (int i = n - 1; i >= 1; i--) { A[i] = min(A[2 * i], A[2 * i + 1]); B[i] = min(B[2 * i], B[2 * i + 1]); }
        auto setv = [&](vector<long long>& t, int p, long long v) {
            p += n; t[p] = v;
            for (p >>= 1; p >= 1; p >>= 1) t[p] = min(t[2 * p], t[2 * p + 1]);
        };
        auto get = [&](vector<long long>& t, int l, int r) {
            long long res = INF;
            for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
                if (l & 1) res = min(res, t[l++]);
                if (r & 1) res = min(res, t[--r]);
            }
            return res;
        };
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1]; long long x = q[2];
                setv(A, k - 1, x - k);
                setv(B, k - 1, x + k);
            } else {
                int k = q[1];
                long long left = get(A, 0, k) + k;
                long long right = get(B, k - 1, n) - k;
                ans.push_back((int)min(left, right));
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-range-queries-and-copies",
    source: "cses",
    title: "Range Queries and Copies",
    url: "https://cses.fi/problemset/task/1737",
    statement: [
      "You are given an array of n integers; it is array number 1. Queries are processed in order. A query [1, k, a, x] sets the a-th element of array k to x. A query [2, k, a, b] asks for the sum of elements at positions a to b of array k. A query [3, k] creates a new array that is an exact copy of array k at that moment; it gets the next free number (2 for the first copy, 3 for the second, and so on). Later changes to one array never affect the others.",
      "Return the answers to all queries of the second kind, in order. Sums can exceed 32 bits.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "1 <= arr[i], x <= 10^9",
      "Array numbers k always refer to arrays that already exist",
      "1 <= a <= b <= arr.length",
      "Every query starts with 1, 2 or 3",
    ],
    fn: {"name":"rangeQueriesAndCopies","params":[{"name":"arr","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"long[]"},
    examples: [
      { input: [[1,2,3,4],[[2,1,1,4],[3,1],[1,2,1,10],[2,2,1,4],[2,1,1,4]]], output: [10,19,10], explanation: "Array 1 sums to 10. Array 2 is a copy of it; setting its first element to 10 gives 10 + 2 + 3 + 4 = 19, while array 1 still sums to 10." },
      { input: [[5,5],[[3,1],[3,2],[1,3,2,1],[2,3,1,2],[2,1,1,2],[2,2,1,2]]], output: [6,10,10], explanation: "Arrays 2 and 3 are copies of array 1. Only array 3 is changed, to 5 1, so its sum is 6 and the other two stay at 10." },
    ],
    tests: [
      { input: [[9],[[2,1,1,1],[3,1],[1,2,1,4],[2,2,1,1],[2,1,1,1]]], output: [9,4,9] },
      { input: [[1,1,1],[[3,1],[3,2],[3,3],[1,4,2,100],[2,4,1,3],[2,3,1,3],[2,1,1,3]]], output: [102,3,3] },
      { input: [[1000000000,1000000000],[[3,1],[1,1,1,1000000000],[1,2,2,1000000000],[2,1,1,2],[2,2,1,2]]], output: [2000000000,2000000000] },
      { input: [[1,2,3,4,5],[[1,1,3,1],[2,1,1,5],[3,1],[1,1,1,100],[2,1,1,5],[2,2,1,5],[2,2,2,3]]], output: [13,112,13,3] },
      { input: [[7,7,7],[[3,1],[1,2,1,1],[3,2],[1,3,3,2],[2,1,1,3],[2,2,1,3],[2,3,1,3]]], output: [21,15,10] },
      { input: [[2,4],[[2,1,1,2],[2,1,2,2],[1,1,2,10],[2,1,1,2]]], output: [6,4,12] },
    ],
    hints: [
      "Copying an array of 200000 numbers for every copy query is far too much. Could a copy share most of its data with the original?",
      "Use persistent segment trees: an update creates new nodes only along the path to the changed position and reuses every other node from the old version.",
      "Keep a list of roots, one per array. A copy adds the same root again. An update makes a new root for that array, and a range sum walks down from that root.",
      "Each update creates about log n new nodes, so the node storage must be sized for all updates, not just the initial tree.",
    ],
    solution: {
      idea: [
        "Build a segment tree over the initial array as version one; nodes are stored in arrays with left child, right child and sum.",
        "A point set clones the nodes along one root-to-leaf path and points them at the shared untouched subtrees.",
        "Copy is pushing the same root again; sum queries use the root of the requested array.",
      ],
      complexity: "O(n + q log n) time, O(n + q log n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> L, R;
    vector<long long> S;
    int newNode(int l, int r, long long s) { L.push_back(l); R.push_back(r); S.push_back(s); return (int)L.size() - 1; }
    int build(int l, int r, vector<int>& a) {
        if (l == r) return newNode(0, 0, a[l]);
        int m = (l + r) / 2;
        int x = build(l, m, a), y = build(m + 1, r, a);
        return newNode(x, y, S[x] + S[y]);
    }
    int update(int v, int l, int r, int p, long long x) {
        if (l == r) return newNode(0, 0, x);
        int m = (l + r) / 2;
        int nl = L[v], nr = R[v];
        if (p <= m) nl = update(nl, l, m, p, x); else nr = update(nr, m + 1, r, p, x);
        return newNode(nl, nr, S[nl] + S[nr]);
    }
    long long query(int v, int l, int r, int a, int b) {
        if (a <= l && r <= b) return S[v];
        int m = (l + r) / 2;
        long long s = 0;
        if (a <= m) s += query(L[v], l, m, a, b);
        if (b > m) s += query(R[v], m + 1, r, a, b);
        return s;
    }
    vector<long long> rangeQueriesAndCopies(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size();
        L.reserve(2 * n + 20 * queries.size() + 10); R.reserve(L.capacity()); S.reserve(L.capacity());
        newNode(0, 0, 0);
        vector<int> root;
        root.push_back(build(0, n - 1, arr));
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                root[k] = update(root[k], 0, n - 1, q[2] - 1, q[3]);
            } else if (q[0] == 2) {
                ans.push_back(query(root[q[1] - 1], 0, n - 1, q[2] - 1, q[3] - 1));
            } else {
                root.push_back(root[q[1] - 1]);
            }
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-missing-coin-sum-queries",
    source: "cses",
    title: "Missing Coin Sum Queries",
    url: "https://cses.fi/problemset/task/2184",
    statement: [
      "There are n coins with the given values. A query [a, b] asks: using only the coins at positions a to b (1-based, each coin at most once), what is the smallest positive sum that you cannot make exactly?",
      "Return the answer for each query, in order. For a single set of coins, sort them and keep the largest sum s that is fully reachable (every amount from 0 to s); a coin of value v <= s + 1 extends s to s + v, and a bigger coin leaves the gap s + 1. Doing that sort for each of 200000 ranges is too slow, so you need a faster way to evaluate it.",
    ],
    constraints: [
      "1 <= coins.length, queries.length <= 200000",
      "1 <= coins[i] <= 10^9",
      "1 <= a <= b <= coins.length",
      "Answers can be as large as about 2 * 10^14",
    ],
    fn: {"name":"missingCoinSumQueries","params":[{"name":"coins","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"long[]"},
    examples: [
      { input: [[2,9,1,2,7],[[1,3],[3,5],[2,3],[1,5]]], output: [4,4,2,6], explanation: "Coins 2 9 1: sorted 1 2 9, sums 0 to 3 are reachable and 9 is too big, so the answer is 4. Coins 1 2 7: reach 3, then 7 > 4, so 4. Coins 9 1: reach 1, 9 is too big, so 2. All five coins: sorted 1 2 2 7 9, reach 5, then 7 > 6, so the answer is 6." },
      { input: [[1,1,1,1],[[1,4],[2,3],[1,1]]], output: [5,3,2], explanation: "Four ones reach every amount up to 4, so 5. Two ones give 3. One one gives 2." },
    ],
    tests: [
      { input: [[5],[[1,1]]], output: [1] },
      { input: [[1],[[1,1]]], output: [2] },
      { input: [[1,2,4,8,16,32,64],[[1,7],[1,6],[2,7],[3,5]]], output: [128,64,1,1] },
      { input: [[1000000000,1000000000,1],[[1,3],[1,2],[3,3],[2,3]]], output: [2,1,2,2] },
      { input: [[3,1,2,1,5,10,20],[[1,7],[1,4],[4,7],[2,5],[5,7]]], output: [43,8,2,10,1] },
      { input: [[1,3,1,3,1,3],[[1,6],[2,5],[1,2],[3,4]]], output: [13,9,2,2] },
    ],
    hints: [
      "For one set of coins, sorting and extending a reachable total from zero solves it. Doing that for every range is too slow, so think about which coins matter at each step.",
      "Let s be the largest total such that every amount from 0 to s is reachable. Coins of value at most s + 1 can extend it, and the total of those coins is the next candidate for s.",
      "Use a persistent segment tree over positions, with versions by coin value. For threshold s + 1, take the version holding all coins up to that value; the range sum over positions a to b gives the new s.",
      "Stop when the total no longer grows and answer s + 1. Only about 40 rounds happen, since the total roughly doubles each time.",
    ],
    solution: {
      idea: [
        "Sort coin indices by value. Build a persistent segment tree over positions, where version c has the c smallest coins inserted (storing their values as sums).",
        "For a query, start with s = 0. Repeat: c = number of coin values <= s + 1; t = rangeSum(version c, a, b); if t == s stop, else s = t.",
        "The answer is s + 1. The loop is short because the reach at least roughly doubles each round.",
      ],
      complexity: "O((n + q * log C) log n) time, O(n log n) space (C = maximum coin value).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> L, R;
    vector<long long> S;
    int newNode(int l, int r, long long s) { L.push_back(l); R.push_back(r); S.push_back(s); return (int)L.size() - 1; }
    int add(int v, int l, int r, int p, long long x) {
        int nl = L[v], nr = R[v];
        if (l == r) return newNode(0, 0, S[v] + x);
        int m = (l + r) / 2;
        if (p <= m) nl = add(nl, l, m, p, x); else nr = add(nr, m + 1, r, p, x);
        return newNode(nl, nr, S[nl] + S[nr]);
    }
    long long query(int v, int l, int r, int a, int b) {
        if (v == 0 || b < l || r < a) return 0;
        if (a <= l && r <= b) return S[v];
        int m = (l + r) / 2;
        return query(L[v], l, m, a, b) + query(R[v], m + 1, r, a, b);
    }
    vector<long long> missingCoinSumQueries(vector<int>& coins, vector<vector<int>>& queries) {
        int n = coins.size();
        vector<int> order(n);
        iota(order.begin(), order.end(), 0);
        sort(order.begin(), order.end(), [&](int x, int y) { return coins[x] < coins[y]; });
        vector<long long> sortedVals(n);
        for (int i = 0; i < n; i++) sortedVals[i] = coins[order[i]];
        L.reserve(20 * n + 10); R.reserve(L.capacity()); S.reserve(L.capacity());
        newNode(0, 0, 0);
        vector<int> root(n + 1, 0);
        for (int i = 0; i < n; i++) root[i + 1] = add(root[i], 0, n - 1, order[i], coins[order[i]]);
        vector<long long> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            long long s = 0;
            while (true) {
                int c = int(upper_bound(sortedVals.begin(), sortedVals.end(), s + 1) - sortedVals.begin());
                long long t = query(root[c], 0, n - 1, q[0] - 1, q[1] - 1);
                if (t == s) break;
                s = t;
            }
            ans.push_back(s + 1);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-distinct-values-queries",
    source: "cses",
    title: "Distinct Values Queries",
    url: "https://cses.fi/problemset/task/1734",
    statement: [
      "Given an array of n integers and q queries, answer for each query [a, b] how many different values appear among the elements at positions a to b (1-based, both included).",
      "Return the answers in order. The array does not change. Queries can be answered in any order internally, then mapped back to the original order.",
    ],
    constraints: [
      "1 <= arr.length, queries.length <= 200000",
      "1 <= arr[i] <= 10^9",
      "1 <= a <= b <= arr.length for each query [a, b]",
    ],
    fn: {"name":"distinctValuesQueries","params":[{"name":"arr","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[3,2,3,1,2],[[1,3],[2,4],[1,5],[3,3]]], output: [2,3,3,1], explanation: "Positions 1..3 hold 3 2 3: two distinct. 2..4 hold 2 3 1: three. The whole array has 3 distinct values. A single element is one." },
      { input: [[7,7,7],[[1,3],[2,2]]], output: [1,1], explanation: "Only the value 7 appears, so the answer is 1 both times." },
    ],
    tests: [
      { input: [[1],[[1,1]]], output: [1] },
      { input: [[1,2,3,4,5],[[1,5],[2,4],[3,3],[1,1]]], output: [5,3,1,1] },
      { input: [[5,5,5,5],[[1,4],[2,3],[4,4]]], output: [1,1,1] },
      { input: [[1000000000,1,1000000000,1,2],[[1,5],[1,4],[3,5],[2,2]]], output: [3,2,3,1] },
      { input: [[1,2,1,2,1,2,3],[[1,6],[1,7],[3,6],[6,7],[2,4]]], output: [2,3,2,2,2] },
      { input: [[4,3,2,1,1,2,3,4],[[1,8],[1,4],[4,5],[3,6],[2,7]]], output: [4,4,1,2,3] },
    ],
    hints: [
      "Looking at each range separately repeats a lot of work. Could you sort the queries so that one sweep serves many of them?",
      "Sweep the right end from left to right. For each value, keep a mark only at its latest position. The marks inside a range then count its distinct values.",
      "Sort the queries by right end and keep the marks in a Fenwick tree. When a value repeats, remove its old mark and add a mark at the new position.",
      "Map the values to small indexes first, and print the answers in the original query order at the end.",
    ],
    solution: {
      idea: [
        "Process queries offline in increasing order of their right end.",
        "Keep a Fenwick tree where position p holds 1 iff p is the last occurrence (so far) of its value.",
        "Answer each query [a, b] as sum(a..b) when the sweep has reached b.",
      ],
      complexity: "O((n + q) log n) time, O(n + q) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> distinctValuesQueries(vector<int>& arr, vector<vector<int>>& queries) {
        int n = arr.size(), q = queries.size();
        vector<int> vals(arr.begin(), arr.end());
        sort(vals.begin(), vals.end());
        vals.erase(unique(vals.begin(), vals.end()), vals.end());
        vector<int> comp(n);
        for (int i = 0; i < n; i++) comp[i] = int(lower_bound(vals.begin(), vals.end(), arr[i]) - vals.begin());
        vector<int> byRight(q);
        iota(byRight.begin(), byRight.end(), 0);
        sort(byRight.begin(), byRight.end(), [&](int x, int y) { return queries[x][1] < queries[y][1]; });
        vector<int> bit(n + 1, 0), last(vals.size(), 0), ans(q);
        auto add = [&](int i, int v) { for (; i <= n; i += i & -i) bit[i] += v; };
        auto pre = [&](int i) { int s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
        int pos = 0;
        for (int id : byRight) {
            while (pos < queries[id][1]) {
                pos++;
                int c = comp[pos - 1];
                if (last[c]) add(last[c], -1);
                add(pos, 1);
                last[c] = pos;
            }
            ans[id] = pre(queries[id][1]) - pre(queries[id][0] - 1);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "cses-movie-festival-queries",
    source: "cses",
    title: "Movie Festival Queries",
    url: "https://cses.fi/problemset/task/1664",
    statement: [
      "A film festival shows n movies; movie i is described by [start, end] with start < end. A visitor can watch a set of movies as long as they do not overlap, but a movie may start at exactly the moment another one ends. For each query [a, b] the visitor arrives at time a and leaves at time b and can only watch movies that start at or after a and end at or before b.",
      "For every query, return the maximum number of movies the visitor can watch, in query order. For a single window the greedy rule is: always pick the movie that ends first among those that can still be started; with many windows you want to reuse that rule instead of rerunning it.",
    ],
    constraints: [
      "1 <= movies.length, queries.length <= 200000",
      "movies[i] = [start, end] with 1 <= start < end <= 10^9",
      "1 <= a < b <= 10^9 for each query [a, b]",
    ],
    fn: {"name":"movieFestivalQueries","params":[{"name":"movies","type":"int[][]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[[1,5],[2,3],[4,6],[3,4],[6,8]],[[1,8],[2,6],[1,2],[4,8]]], output: [4,3,0,2], explanation: "In [1, 8] pick 2-3, 3-4, 4-6, 6-8 for four movies. In [2, 6] pick 2-3, 3-4, 4-6 for three. No movie fits inside [1, 2]. In [4, 8] pick 4-6 and 6-8." },
      { input: [[[1,10],[10,20]],[[1,20],[1,10],[5,20]]], output: [2,1,1], explanation: "Both movies fit in [1, 20] (the second starts as the first ends). Only the first fits [1, 10]. Only the second fits [5, 20]." },
    ],
    tests: [
      { input: [[[1,2]],[[1,2],[1,3],[2,3]]], output: [1,1,0] },
      { input: [[[1,2],[2,3],[3,4],[4,5]],[[1,5],[2,4],[1,3],[3,5],[5,6]]], output: [4,2,2,2,0] },
      { input: [[[1,100],[2,3],[3,4],[4,5]],[[1,100],[2,5],[1,4]]], output: [3,3,2] },
      { input: [[[1,1000000000]],[[1,1000000000],[2,1000000000],[1,999999999]]], output: [1,0,0] },
      { input: [[[5,10],[5,10],[5,10]],[[5,10],[1,9],[1,20]]], output: [1,0,1] },
      { input: [[[1,4],[2,5],[3,6],[4,7],[5,8],[6,9]],[[1,9],[1,7],[2,8],[3,6],[1,4]]], output: [2,2,2,1,1] },
    ],
    hints: [
      "For one time window, a greedy rule chooses movies well. Which movie should you pick next once you finish one?",
      "After a movie ends, the best next choice is the movie that ends earliest among those starting at or after that end time. So each movie has exactly one fixed successor.",
      "Precompute each movie's successor, then use binary lifting to jump many successors at once. Count the jumps while the landing movie still ends by the end of the window.",
      "A movie may start exactly when another ends, so the search for the next start must include equal times.",
    ],
    solution: {
      idea: [
        "Sort the movies by start. suffixBest[j] is the index of the movie with the smallest end among sorted positions j..m-1.",
        "next[i] = suffixBest of the first movie whose start >= end[i]; a sentinel m means none. Build jump tables up[k][i] for k up to 18.",
        "For a query take first = suffixBest of the first movie whose start >= a. If it is missing or ends after b the answer is 0. Otherwise count 1, then for k from high to low jump to up[k][cur] when that movie exists and ends by b, adding 2^k.",
      ],
      complexity: "O((n + q) log n) time, O(n log n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> movieFestivalQueries(vector<vector<int>>& movies, vector<vector<int>>& queries) {
        int m = movies.size();
        vector<pair<int, int>> mv(m);
        for (int i = 0; i < m; i++) mv[i] = {movies[i][0], movies[i][1]};
        sort(mv.begin(), mv.end());
        vector<int> st(m), en(m + 1, INT_MAX);
        for (int i = 0; i < m; i++) { st[i] = mv[i].first; en[i] = mv[i].second; }
        vector<int> best(m + 1, m);
        for (int j = m - 1; j >= 0; j--) best[j] = (en[j] < en[best[j + 1]]) ? j : best[j + 1];
        const int LOG = 18;
        vector<vector<int>> up(LOG + 1, vector<int>(m + 1, m));
        for (int i = 0; i < m; i++) {
            int j = int(lower_bound(st.begin(), st.end(), en[i]) - st.begin());
            up[0][i] = best[j];
        }
        for (int k = 1; k <= LOG; k++)
            for (int i = 0; i <= m; i++) up[k][i] = up[k - 1][up[k - 1][i]];
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0], b = q[1];
            int j = int(lower_bound(st.begin(), st.end(), a) - st.begin());
            int cur = best[j];
            if (cur == m || en[cur] > b) { ans.push_back(0); continue; }
            int cnt = 1;
            for (int k = LOG; k >= 0; k--) {
                int nx = up[k][cur];
                if (nx != m && en[nx] <= b) { cur = nx; cnt += 1 << k; }
            }
            ans.push_back(cnt);
        }
        return ans;
    }
};
`,
    },
  },
];

/**
 * Metadata for the lead to register the problems in dsa.ts. `slug` is the first argument of
 * `cses(slug, title, task, why)` (the problem id is "cses-" + slug); `pattern` is the suggested pattern id (the
 * existing "cses-misc" pattern, so no new guide or article is needed).
 */
export interface CsesRangeEntry {
  id: string;
  slug: string;
  title: string;
  url: string;
  task: number;
  difficulty: "easy" | "medium" | "hard";
  pattern: string;
  tags: string[];
  why: string;
}

export const CSES_RANGE_ENTRIES: CsesRangeEntry[] = [
  {"id":"cses-dynamic-range-minimum-queries","slug":"dynamic-range-minimum-queries","title":"Dynamic Range Minimum Queries","url":"https://cses.fi/problemset/task/1649","task":1649,"difficulty":"medium","pattern":"cses-misc","tags":["segment-tree","point-update","range-min"],"why":"Iterative segment tree with point assignment and range minimum in O(log n)."},
  {"id":"cses-range-xor-queries","slug":"range-xor-queries","title":"Range Xor Queries","url":"https://cses.fi/problemset/task/1650","task":1650,"difficulty":"easy","pattern":"cses-misc","tags":["prefix-xor","bit-manipulation","range-query"],"why":"Prefix xor works like prefix sums because x ^ x = 0, so a range is two prefixes xored."},
  {"id":"cses-range-update-queries","slug":"range-update-queries","title":"Range Update Queries","url":"https://cses.fi/problemset/task/1651","task":1651,"difficulty":"medium","pattern":"cses-misc","tags":["fenwick-tree","difference-array","range-update"],"why":"A Fenwick tree over the difference array turns range add and point read into two point updates and one prefix sum."},
  {"id":"cses-forest-queries","slug":"forest-queries","title":"Forest Queries","url":"https://cses.fi/problemset/task/1652","task":1652,"difficulty":"medium","pattern":"cses-misc","tags":["2d-prefix-sum","grid","range-query"],"why":"Two-dimensional prefix sums answer any rectangle count in O(1) by inclusion and exclusion."},
  {"id":"cses-forest-queries-ii","slug":"forest-queries-ii","title":"Forest Queries II","url":"https://cses.fi/problemset/task/1739","task":1739,"difficulty":"hard","pattern":"cses-misc","tags":["2d-fenwick-tree","grid","point-update"],"why":"A two-dimensional Fenwick tree supports toggling one square and counting a rectangle, both in O(log^2 n)."},
  {"id":"cses-hotel-queries","slug":"hotel-queries","title":"Hotel Queries","url":"https://cses.fi/problemset/task/1143","task":1143,"difficulty":"medium","pattern":"cses-misc","tags":["segment-tree","descent","greedy"],"why":"A max segment tree lets you find the leftmost position with enough capacity by walking down the tree."},
  {"id":"cses-list-removals","slug":"list-removals","title":"List Removals","url":"https://cses.fi/problemset/task/1749","task":1749,"difficulty":"medium","pattern":"cses-misc","tags":["fenwick-tree","order-statistics","binary-descent"],"why":"Removing the k-th remaining element is an order-statistic query: a Fenwick tree finds it by binary descent."},
  {"id":"cses-salary-queries","slug":"salary-queries","title":"Salary Queries","url":"https://cses.fi/problemset/task/1144","task":1144,"difficulty":"hard","pattern":"cses-misc","tags":["fenwick-tree","offline","coordinate-compression"],"why":"Compress every salary that ever appears, then a Fenwick tree over values counts how many lie in a range."},
  {"id":"cses-prefix-sum-queries","slug":"prefix-sum-queries","title":"Prefix Sum Queries","url":"https://cses.fi/problemset/task/2166","task":2166,"difficulty":"medium","pattern":"cses-misc","tags":["segment-tree","monoid","max-prefix-sum"],"why":"Each segment tree node stores its sum and its best prefix; merging two nodes is a one-line formula."},
  {"id":"cses-subarray-sum-queries","slug":"subarray-sum-queries","title":"Subarray Sum Queries","url":"https://cses.fi/problemset/task/1190","task":1190,"difficulty":"medium","pattern":"cses-misc","tags":["segment-tree","monoid","max-subarray"],"why":"Maximum subarray sum under updates: each node keeps sum, best prefix, best suffix and best inside."},
  {"id":"cses-pizzeria-queries","slug":"pizzeria-queries","title":"Pizzeria Queries","url":"https://cses.fi/problemset/task/2206","task":2206,"difficulty":"medium","pattern":"cses-misc","tags":["segment-tree","min-with-offset","point-update"],"why":"Split the distance |i - k| into two cases and keep two minimum trees over p[i] - i and p[i] + i."},
  {"id":"cses-range-queries-and-copies","slug":"range-queries-and-copies","title":"Range Queries and Copies","url":"https://cses.fi/problemset/task/1737","task":1737,"difficulty":"hard","pattern":"cses-misc","tags":["persistent-segment-tree","versions","range-sum"],"why":"Copying an array in O(1) is a persistent segment tree: a new version shares every node it did not change."},
  {"id":"cses-missing-coin-sum-queries","slug":"missing-coin-sum-queries","title":"Missing Coin Sum Queries","url":"https://cses.fi/problemset/task/2184","task":2184,"difficulty":"hard","pattern":"cses-misc","tags":["persistent-segment-tree","greedy","offline","doubling"],"why":"The classic smallest-unreachable-sum greedy, made fast per range by summing only values below a threshold in a persistent tree."},
  {"id":"cses-distinct-values-queries","slug":"distinct-values-queries","title":"Distinct Values Queries","url":"https://cses.fi/problemset/task/1734","task":1734,"difficulty":"medium","pattern":"cses-misc","tags":["offline","fenwick-tree","sweep"],"why":"Sort queries by right end and sweep: a Fenwick tree marks only the latest position of each value, so a range count is the number of distinct values."},
  {"id":"cses-movie-festival-queries","slug":"movie-festival-queries","title":"Movie Festival Queries","url":"https://cses.fi/problemset/task/1664","task":1664,"difficulty":"hard","pattern":"cses-misc","tags":["greedy","binary-lifting","intervals"],"why":"The greedy 'earliest finishing movie next' becomes a jump pointer per movie, and binary lifting counts jumps inside a time window."},
];
