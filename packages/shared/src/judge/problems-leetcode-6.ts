import type { ProblemSpec } from "./types";

// Batch 6: arrays, strings, linked lists, stacks, heaps, trees and graphs. Written for this app.

export const LEETCODE_SPECS_6: ProblemSpec[] = [
  {
    id: "lc-26",
    source: "leetcode",
    title: "Remove Duplicates from Sorted Array",
    statement: [
      "You get an array sorted in non-decreasing order. Remove the duplicates so that each value appears once, keeping the order, and return the resulting array.",
      "On the original site you do this in place and return the new length. Here the function returns the array of distinct values, but the two-pointer idea is the same and you should still aim for O(1) extra space apart from the result.",
    ],
    constraints: ["1 <= nums.length <= 30000","-100 <= nums[i] <= 100","nums is sorted in non-decreasing order"],
    fn: {name: "removeDuplicates",params: [{name: "nums",type: "int[]"}],returns: "int[]"},
    examples: [
      { input: [[1,1,2]], output: [1,2], explanation: "The second 1 is a duplicate." },
      { input: [[0,0,1,1,1,2,2,3,3,4]], output: [0,1,2,3,4] },
    ],
    tests: [
      { input: [[5]], output: [5] },
      { input: [[1,1,1,1]], output: [1] },
      { input: [[1,2,3]], output: [1,2,3] },
      { input: [[-3,-3,-2,0,0,7]], output: [-3,-2,0,7] },
      { input: [[-100,-100,100,100]], output: [-100,100] },
      { input: [[2,2,3,3,3,3,4,4,5,5,5]], output: [2,3,4,5] },
    ],
    hints: [
      "Because the array is sorted, equal values sit next to each other.",
      "Keep a write position. Walk through the array and copy a value only if it differs from the last value you kept.",
      "Compare with the last kept value (at write - 1). The first element is always kept.",
    ],
    solution: {
      idea: [
        "Two pointers: write marks where the next distinct value goes. For each element, if it differs from the value at write - 1 (or write is 0), store it and advance write. The first write elements are the answer.",
      ],
      complexity: "O(n) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> removeDuplicates(vector<int>& nums) {
        int w = 0;
        for (int x : nums) {
            if (w == 0 || nums[w - 1] != x) nums[w++] = x;
        }
        nums.resize(w);
        return nums;
    }
};
`,
    },
  },
  {
    id: "lc-686",
    source: "leetcode",
    title: "Repeated String Match",
    statement: [
      "Given two strings a and b, return the smallest number of times a must be repeated (written one after another) so that b becomes a substring of the result. If that is impossible, return -1.",
      "For example, repeating a = \"abc\" twice gives \"abcabc\".",
    ],
    constraints: ["1 <= a.length, b.length <= 10000","a and b consist of lowercase English letters"],
    fn: {name: "repeatedStringMatch",params: [{name: "a",type: "string"},{name: "b",type: "string"}],returns: "int"},
    examples: [
      { input: ["abcd","cdabcdab"], output: 3, explanation: "abcdabcdabcd contains cdabcdab." },
      { input: ["a","aa"], output: 2 },
    ],
    tests: [
      { input: ["a","a"], output: 1 },
      { input: ["abc","wxyz"], output: -1 },
      { input: ["abc","cabcabca"], output: 4 },
      { input: ["abc","d"], output: -1 },
      { input: ["ab","bababa"], output: 4 },
      { input: ["aaaaaaaaab","ba"], output: 2 },
      { input: ["abc","abcabcabc"], output: 3 },
    ],
    hints: [
      "How many copies of a are needed just to be at least as long as b?",
      "Only that count, ceil(b.length / a.length), and that count plus one can ever be the answer. More copies never help.",
      "Build the repeated string for those two counts and search for b with the built-in find.",
    ],
    solution: {
      idea: [
        "Let k = ceil(|b| / |a|). If b appears at all, it fits in k copies, or in k + 1 when it starts inside the first copy and spills over. So test k and k + 1 and return the first that contains b, else -1.",
      ],
      complexity: "O(|b| * (|a| + |b|)) with the plain find, which is fine for these limits; a linear-time search (KMP) makes it O(|a| + |b|).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int repeatedStringMatch(string a, string b) {
        int k = ((int)b.size() + (int)a.size() - 1) / (int)a.size();
        string s;
        for (int i = 0; i < k; i++) s += a;
        if (s.find(b) != string::npos) return k;
        s += a;
        if (s.find(b) != string::npos) return k + 1;
        return -1;
    }
};
`,
    },
  },
  {
    id: "lc-143",
    source: "leetcode",
    title: "Reorder List",
    statement: [
      "A linked list L0 -> L1 -> ... -> Ln is given. Reorder it to L0 -> Ln -> L1 -> Ln-1 -> L2 -> Ln-2 -> ... : take one node from the front, then one from the back, alternately. Return the head of the reordered list.",
      "Only the links may change; the node values stay with their nodes. A list is given as a JSON array such as [1,2,3,4].",
    ],
    constraints: ["1 <= number of nodes <= 50000","1 <= node value <= 1000"],
    fn: {name: "reorderList",params: [{name: "head",type: "list"}],returns: "list"},
    examples: [
      { input: [[1,2,3,4]], output: [1,4,2,3] },
      { input: [[1,2,3,4,5]], output: [1,5,2,4,3] },
    ],
    tests: [
      { input: [[7]], output: [7] },
      { input: [[1,2]], output: [1,2] },
      { input: [[1,2,3]], output: [1,3,2] },
      { input: [[1,2,3,4,5,6]], output: [1,6,2,5,3,4] },
      { input: [[5,5,5,5]], output: [5,5,5,5] },
      { input: [[10,20,30,40,50,60,70]], output: [10,70,20,60,30,50,40] },
    ],
    hints: [
      "The back half has to be read in reverse order. A singly linked list cannot walk backwards, so change that.",
      "Find the middle with slow and fast pointers, then reverse the second half in place.",
      "Weave the two halves: take a node from the first half, then one from the reversed second half, until the second half runs out.",
    ],
    solution: {
      idea: [
        "Three steps: (1) slow/fast pointers find the middle; (2) reverse the list after the middle; (3) merge the two lists by alternating nodes. Each step is linear and uses no extra memory.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    ListNode* reorderList(ListNode* head) {
        if (!head || !head->next) return head;
        ListNode *slow = head, *fast = head;
        while (fast->next && fast->next->next) { slow = slow->next; fast = fast->next->next; }
        ListNode* prev = nullptr;
        ListNode* cur = slow->next;
        slow->next = nullptr;
        while (cur) { ListNode* nx = cur->next; cur->next = prev; prev = cur; cur = nx; }
        ListNode *a = head, *b = prev;
        while (b) {
            ListNode *an = a->next, *bn = b->next;
            a->next = b;
            b->next = an;
            a = an;
            b = bn;
        }
        return head;
    }
};
`,
    },
  },
  {
    id: "lc-862",
    source: "leetcode",
    title: "Shortest Subarray with Sum at Least K",
    statement: [
      "Given an array that may contain negative numbers and a target k, return the length of the shortest non-empty contiguous subarray whose sum is at least k. If there is none, return -1.",
      "Because of the negative numbers, the usual sliding window does not work: shrinking the window can increase the sum.",
    ],
    constraints: ["1 <= nums.length <= 100000","-10000 <= nums[i] <= 10000","1 <= k <= 1000000000"],
    fn: {name: "shortestSubarray",params: [{name: "nums",type: "int[]"},{name: "k",type: "int"}],returns: "int"},
    examples: [
      { input: [[1],1], output: 1 },
      { input: [[1,2],4], output: -1 },
      { input: [[2,-1,2],3], output: 3 },
    ],
    tests: [
      { input: [[5],5], output: 1 },
      { input: [[5],6], output: -1 },
      { input: [[-1,-1,4],4], output: 1 },
      { input: [[84,-37,32,40,95],167], output: 3 },
      { input: [[1,1,1,1],3], output: 3 },
      { input: [[-5,10,-2,3],10], output: 1 },
      { input: [[17,85,93,-45,-21],150], output: 2 },
      { input: [[10000,-10000,10000],10000], output: 1 },
    ],
    hints: [
      "Use prefix sums P: the sum of nums[i..j-1] is P[j] - P[i]. You want the closest pair i < j with P[j] - P[i] >= k.",
      "Keep candidate starting indices in a deque with increasing prefix sums. If P[j] is not larger than the prefix at the back, that back index is useless: drop it.",
      "While P[j] - P[front] >= k, record the length j - front and pop the front; a later j can only give a longer subarray with that start.",
    ],
    solution: {
      idea: [
        "Monotonic deque over prefix sums. The deque holds indices whose prefix sums increase. For each j, pop from the front while the window sum meets k (updating the best length), and pop from the back while the new prefix is smaller or equal (those starts are dominated). Then push j.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int shortestSubarray(vector<int>& nums, int k) {
        int n = (int)nums.size();
        vector<long long> p(n + 1, 0);
        for (int i = 0; i < n; i++) p[i + 1] = p[i] + nums[i];
        deque<int> dq;
        int best = n + 1;
        for (int j = 0; j <= n; j++) {
            while (!dq.empty() && p[j] - p[dq.front()] >= k) { best = min(best, j - dq.front()); dq.pop_front(); }
            while (!dq.empty() && p[dq.back()] >= p[j]) dq.pop_back();
            dq.push_back(j);
        }
        return best <= n ? best : -1;
    }
};
`,
    },
  },
  {
    id: "lc-224",
    source: "leetcode",
    title: "Basic Calculator",
    statement: [
      "Evaluate an arithmetic expression given as a string and return the result as an integer. It contains non-negative integers, the operators + and -, parentheses, and spaces.",
      "A minus sign may come before a bracket, as in \"1-(2+3)\", and a leading unary minus is written as \"(-2)\" or \"-(2+3)\". Do not use eval or a built-in expression parser.",
    ],
    constraints: ["1 <= s.length <= 30000","s has digits, '+', '-', '(', ')' and spaces","the expression is valid and every intermediate value fits in a 32-bit integer"],
    fn: {name: "calculate",params: [{name: "s",type: "string"}],returns: "int"},
    examples: [
      { input: ["1 + 1"], output: 2 },
      { input: [" 2-1 + 2 "], output: 3 },
      { input: ["(1+(4+5+2)-3)+(6+8)"], output: 23 },
    ],
    tests: [
      { input: ["0"], output: 0 },
      { input: ["12"], output: 12 },
      { input: ["-1"], output: -1 },
      { input: ["-(2 + 3)"], output: -5 },
      { input: ["10 - (2 - 3)"], output: 11 },
      { input: ["(1)"], output: 1 },
      { input: ["2-(5-6)"], output: 3 },
      { input: ["100-(20+(30-(5-1)))-4"], output: 50 },
      { input: ["- (3 + (4 + 5))"], output: -12 },
    ],
    hints: [
      "Without brackets it is a running total with a current sign. What changes when a bracket opens?",
      "A minus before a bracket flips the sign of everything inside it. Remember the sign in force when you enter.",
      "Keep a stack. On '(' push the total so far and the current sign, and start a fresh total. On ')' finish the inner total, multiply by the pushed sign and add the pushed total.",
    ],
    solution: {
      idea: [
        "Scan once keeping result, sign and the number being read. On an operator, fold the number into the result. On '(' push result and sign and reset; on ')' pop them and combine. Unary minus works because the result starts at 0.",
      ],
      complexity: "O(n) time, O(n) space for deeply nested brackets.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int calculate(string s) {
        long long res = 0, num = 0;
        int sign = 1;
        vector<long long> st;
        for (char c : s) {
            if (isdigit(c)) num = num * 10 + (c - '0');
            else if (c == '+' || c == '-') {
                res += sign * num;
                num = 0;
                sign = c == '+' ? 1 : -1;
            } else if (c == '(') {
                st.push_back(res);
                st.push_back(sign);
                res = 0;
                sign = 1;
            } else if (c == ')') {
                res += sign * num;
                num = 0;
                long long s2 = st.back(); st.pop_back();
                long long prev = st.back(); st.pop_back();
                res = prev + s2 * res;
                sign = 1;
            }
        }
        res += sign * num;
        return (int)res;
    }
};
`,
    },
  },
  {
    id: "lc-23",
    source: "leetcode",
    title: "Merge k Sorted Lists",
    statement: [
      "You get k linked lists, each sorted in ascending order. Merge them into one sorted list and return its head.",
      "Here the k lists are given as an array of arrays (each inner array is one list, possibly empty), and the result is a single list, written as a JSON array.",
    ],
    constraints: ["0 <= k <= 10000","0 <= length of each list <= 500","-10000 <= value <= 10000","the total number of nodes is at most 10000","each list is sorted in ascending order"],
    fn: {name: "mergeKLists",params: [{name: "lists",type: "int[][]"}],returns: "list"},
    examples: [
      { input: [[[1,4,5],[1,3,4],[2,6]]], output: [1,1,2,3,4,4,5,6] },
      { input: [[]], output: [] },
      { input: [[[]]], output: [] },
    ],
    tests: [
      { input: [[[3]]], output: [3] },
      { input: [[[],[],[]]], output: [] },
      { input: [[[1,2,3],[4,5,6]]], output: [1,2,3,4,5,6] },
      { input: [[[4,5,6],[1,2,3]]], output: [1,2,3,4,5,6] },
      { input: [[[-5,-5],[-5],[0,0,0]]], output: [-5,-5,-5,0,0,0] },
      { input: [[[10],[9],[8],[7],[6]]], output: [6,7,8,9,10] },
      { input: [[[1,1,1],[1,1],[1]]], output: [1,1,1,1,1,1] },
    ],
    hints: [
      "Merging two sorted lists is easy. What if you merged them pairwise, over and over?",
      "Or look only at the current head of each list: the next output value is the smallest of those k heads.",
      "Keep the heads in a min-heap (priority queue). Pop the smallest, append it, and push that list's next element. Each element is pushed and popped once, so O(N log k) overall.",
    ],
    solution: {
      idea: [
        "Min-heap of (value, list index, position). Pop the smallest, append to the result, push the next element of the same list. The heap never holds more than k items.",
      ],
      complexity: "O(N log k) time for N total nodes, O(k) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    ListNode* mergeKLists(vector<vector<int>>& lists) {
        priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> pq;
        for (int i = 0; i < (int)lists.size(); i++)
            if (!lists[i].empty()) pq.push({lists[i][0], i, 0});
        ListNode dummy(0);
        ListNode* tail = &dummy;
        while (!pq.empty()) {
            auto [v, i, j] = pq.top(); pq.pop();
            tail->next = new ListNode(v);
            tail = tail->next;
            if (j + 1 < (int)lists[i].size()) pq.push({lists[i][j + 1], i, j + 1});
        }
        return dummy.next;
    }
};
`,
    },
  },
  {
    id: "lc-502",
    source: "leetcode",
    title: "IPO",
    statement: [
      "A company can finish at most k projects before its IPO. Project i needs at least capital[i] to start and adds profits[i] to your money once finished. You start with w. A project can only be started if you currently have enough capital, and finishing it adds the profit to what you have.",
      "Choose at most k distinct projects to end with the most money, and return that final amount.",
    ],
    constraints: ["1 <= k <= 100000","0 <= w <= 1000000000","n == profits.length == capital.length","1 <= n <= 100000","0 <= profits[i] <= 10000","0 <= capital[i] <= 1000000000"],
    fn: {name: "findMaximizedCapital",params: [{name: "k",type: "int"},{name: "w",type: "int"},{name: "profits",type: "int[]"},{name: "capital",type: "int[]"}],returns: "int"},
    examples: [
      { input: [2,0,[1,2,3],[0,1,1]], output: 4, explanation: "Do project 0 (money 1), then project 2 (money 4)." },
      { input: [3,0,[1,2,3],[0,1,2]], output: 6 },
    ],
    tests: [
      { input: [1,0,[5],[0]], output: 5 },
      { input: [1,0,[5],[1]], output: 0 },
      { input: [3,100,[1,2,3],[5,5,5]], output: 106 },
      { input: [2,0,[1,2,3],[1,1,1]], output: 0 },
      { input: [5,0,[1,2,3],[0,0,0]], output: 6 },
      { input: [2,1,[5,1,9,2],[3,0,2,1]], output: 12 },
      { input: [10,0,[1,1,1,1],[0,1,2,3]], output: 4 },
    ],
    hints: [
      "At every step, among the projects you can afford, which one should you pick?",
      "The one with the highest profit: it never hurts, because more money only unlocks more projects.",
      "Sort projects by capital. For each of the k rounds, push all newly affordable projects' profits into a max-heap, then pop the largest and add it to w. Stop early if the heap is empty.",
    ],
    solution: {
      idea: [
        "Greedy with two structures: projects sorted by required capital, and a max-heap of profits of affordable projects. Repeat k times: move every project with capital <= w into the heap, take the best profit. Taking the best affordable project is optimal because money only helps later choices.",
      ],
      complexity: "O(n log n + k log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {
        int n = (int)profits.size();
        vector<pair<int, int>> proj(n);
        for (int i = 0; i < n; i++) proj[i] = {capital[i], profits[i]};
        sort(proj.begin(), proj.end());
        priority_queue<int> pq;
        long long money = w;
        int idx = 0;
        for (int round = 0; round < k; round++) {
            while (idx < n && proj[idx].first <= money) pq.push(proj[idx++].second);
            if (pq.empty()) break;
            money += pq.top();
            pq.pop();
        }
        return (int)min<long long>(money, INT_MAX);
    }
};
`,
    },
  },
  {
    id: "lc-48",
    source: "leetcode",
    title: "Rotate Image",
    statement: [
      "You are given an n by n matrix of numbers. Rotate it 90 degrees clockwise and return the rotated matrix.",
      "On the original site you rotate in place, with no second matrix. Do that if you can: the rows become columns, and you can swap four cells at a time.",
    ],
    constraints: ["n == matrix.length == matrix[i].length","1 <= n <= 20","-1000 <= matrix[i][j] <= 1000"],
    fn: {name: "rotate",params: [{name: "matrix",type: "int[][]"}],returns: "int[][]"},
    examples: [
      { input: [[[1,2,3],[4,5,6],[7,8,9]]], output: [[7,4,1],[8,5,2],[9,6,3]] },
      { input: [[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]], output: [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]] },
    ],
    tests: [
      { input: [[[7]]], output: [[7]] },
      { input: [[[1,2],[3,4]]], output: [[3,1],[4,2]] },
      { input: [[[-1,0],[0,-1]]], output: [[0,-1],[-1,0]] },
      { input: [[[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15],[16,17,18,19,20],[21,22,23,24,25]]], output: [[21,16,11,6,1],[22,17,12,7,2],[23,18,13,8,3],[24,19,14,9,4],[25,20,15,10,5]] },
      { input: [[[0,0,0],[0,1,0],[0,0,0]]], output: [[0,0,0],[0,1,0],[0,0,0]] },
      { input: [[[9,8],[7,6]]], output: [[7,9],[6,8]] },
    ],
    hints: [
      "Where does the cell in row i, column j end up after a clockwise turn?",
      "It moves to row j, column n - 1 - i. Following one cell around gives a cycle of four cells.",
      "Alternatively: transpose the matrix (swap a[i][j] with a[j][i]), then reverse every row.",
    ],
    solution: {
      idea: [
        "Transpose then reverse each row gives a clockwise quarter turn. Both steps are in place, so extra space is O(1).",
      ],
      complexity: "O(n^2) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> rotate(vector<vector<int>>& a) {
        int n = (int)a.size();
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) swap(a[i][j], a[j][i]);
        for (auto& row : a) reverse(row.begin(), row.end());
        return a;
    }
};
`,
    },
  },
  {
    id: "lc-73",
    source: "leetcode",
    title: "Set Matrix Zeroes",
    statement: [
      "Given a matrix of integers, whenever a cell is 0, set its whole row and whole column to 0. Return the changed matrix.",
      "All the zeros that count are the ones in the original matrix: a zero you create while working must not spread further. The original site asks for O(1) extra space; the simple version uses two marker arrays.",
    ],
    constraints: ["1 <= rows, columns <= 200","-2147483648 <= matrix[i][j] <= 2147483647"],
    fn: {name: "setZeroes",params: [{name: "matrix",type: "int[][]"}],returns: "int[][]"},
    examples: [
      { input: [[[1,1,1],[1,0,1],[1,1,1]]], output: [[1,0,1],[0,0,0],[1,0,1]] },
      { input: [[[0,1,2,0],[3,4,5,2],[1,3,1,5]]], output: [[0,0,0,0],[0,4,5,0],[0,3,1,0]] },
    ],
    tests: [
      { input: [[[5]]], output: [[5]] },
      { input: [[[0]]], output: [[0]] },
      { input: [[[1,2],[3,4]]], output: [[1,2],[3,4]] },
      { input: [[[0,0],[0,0]]], output: [[0,0],[0,0]] },
      { input: [[[1],[0],[3]]], output: [[0],[0],[0]] },
      { input: [[[-1,2,3,4],[5,6,7,0],[9,10,11,12]]], output: [[-1,2,3,0],[0,0,0,0],[9,10,11,0]] },
      { input: [[[2147483647,0],[-2147483648,1]]], output: [[0,0],[-2147483648,0]] },
    ],
    hints: [
      "Do not zero anything while you are still looking for zeros: the new zeros would be mistaken for old ones.",
      "First pass: remember which rows and which columns contain a zero.",
      "Second pass: zero every cell whose row or column is remembered. For O(1) space, use the first row and first column as the memory (and keep two flags for whether they themselves had a zero).",
    ],
    solution: {
      idea: [
        "Mark rows and columns that hold a zero in two boolean arrays, then clear every cell in a marked row or column. This uses O(rows + columns) space; the first row and column can replace the arrays to reach O(1).",
      ],
      complexity: "O(rows * columns) time, O(rows + columns) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> setZeroes(vector<vector<int>>& a) {
        int r = (int)a.size(), c = (int)a[0].size();
        vector<bool> row(r, false), col(c, false);
        for (int i = 0; i < r; i++)
            for (int j = 0; j < c; j++)
                if (a[i][j] == 0) row[i] = col[j] = true;
        for (int i = 0; i < r; i++)
            for (int j = 0; j < c; j++)
                if (row[i] || col[j]) a[i][j] = 0;
        return a;
    }
};
`,
    },
  },
  {
    id: "lc-162",
    source: "leetcode",
    title: "Find Peak Element",
    statement: [
      "A peak is an element strictly greater than its neighbours; treat the positions before the first and after the last element as minus infinity. Return the index of a peak in nums.",
      "On the original site a peak need not be unique and any one is accepted. Here the arrays always have exactly one peak, so there is one right answer. Your code should still run in O(log n).",
    ],
    constraints: ["1 <= nums.length <= 100000","-2^31 <= nums[i] <= 2^31 - 1","nums[i] != nums[i + 1] for every valid i","nums has exactly one peak"],
    fn: {name: "findPeakElement",params: [{name: "nums",type: "int[]"}],returns: "int"},
    examples: [
      { input: [[1,2,3,1]], output: 2, explanation: "3 is greater than both neighbours." },
      { input: [[1,3,2,1,0]], output: 1 },
    ],
    tests: [
      { input: [[5]], output: 0 },
      { input: [[1,2]], output: 1 },
      { input: [[2,1]], output: 0 },
      { input: [[1,2,3,4,5]], output: 4 },
      { input: [[5,4,3,2,1]], output: 0 },
      { input: [[-5,-2,9,4,-7,-9]], output: 2 },
      { input: [[2147483647,-2147483648]], output: 0 },
      { input: [[-2147483648,2147483647,-2147483648]], output: 1 },
    ],
    hints: [
      "Compare nums[mid] with nums[mid + 1]. What does it tell you about which side must contain a peak?",
      "If nums[mid] < nums[mid + 1], the sequence is still climbing, so a peak exists to the right. Otherwise one exists at mid or to the left.",
      "Binary search with lo < hi, moving hi = mid or lo = mid + 1. The loop ends when lo == hi.",
    ],
    solution: {
      idea: [
        "Binary search on the slope. Going uphill at mid means a peak lies strictly right of mid (the array must eventually come down or end); going downhill means mid itself or something left of it is a peak. Each step halves the range.",
      ],
      complexity: "O(log n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findPeakElement(vector<int>& nums) {
        int lo = 0, hi = (int)nums.size() - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < nums[mid + 1]) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
};
`,
    },
  },
  {
    id: "lc-4",
    source: "leetcode",
    title: "Median of Two Sorted Arrays",
    statement: [
      "Two sorted arrays are given. Return the median of all their elements together, as if you had merged them. With an even total, the median is the mean of the two middle values.",
      "A merge solves it in O(m + n). The goal is O(log(min(m, n))).",
    ],
    constraints: ["0 <= nums1.length, nums2.length <= 1000","1 <= nums1.length + nums2.length <= 2000","-1000000 <= nums1[i], nums2[i] <= 1000000","both arrays are sorted in non-decreasing order"],
    fn: {name: "findMedianSortedArrays",params: [{name: "nums1",type: "int[]"},{name: "nums2",type: "int[]"}],returns: "double"},
    examples: [
      { input: [[1,3],[2]], output: 2, explanation: "The merged array is [1,2,3]." },
      { input: [[1,2],[3,4]], output: 2.5, explanation: "The merged array is [1,2,3,4], so (2 + 3) / 2." },
    ],
    tests: [
      { input: [[],[1]], output: 1 },
      { input: [[2],[]], output: 2 },
      { input: [[1],[1]], output: 1 },
      { input: [[0,0],[0,0]], output: 0 },
      { input: [[1,2,3],[4,5,6]], output: 3.5 },
      { input: [[4,5,6],[1,2,3]], output: 3.5 },
      { input: [[-5,3,6,12,15],[-12,-10,-6,-3,4,10]], output: 3 },
      { input: [[1,1,1],[1,1]], output: 1 },
      { input: [[-1000000],[1000000]], output: 0 },
    ],
    hints: [
      "Think of cutting both arrays so that the left parts together hold half of all elements.",
      "A cut is right when every element on the left side is at most every element on the right side. Only the four elements next to the two cuts need checking.",
      "Binary search the cut in the shorter array. The cut in the longer one follows from the half size. Use sentinels of plus or minus infinity for cuts at an end.",
    ],
    solution: {
      idea: [
        "Binary search the number of elements taken from the shorter array into the left half. For a cut i in A and j = half - i in B, the cut is valid when A[i-1] <= B[j] and B[j-1] <= A[i]. Then the median comes from the largest left element and, for an even total, the smallest right element.",
      ],
      complexity: "O(log(min(m, n))) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    double findMedianSortedArrays(vector<int>& a, vector<int>& b) {
        if (a.size() > b.size()) return findMedianSortedArrays(b, a);
        int m = (int)a.size(), n = (int)b.size();
        int lo = 0, hi = m, half = (m + n + 1) / 2;
        const long long INF = 1LL << 40;
        while (lo <= hi) {
            int i = (lo + hi) / 2, j = half - i;
            long long aL = i > 0 ? a[i - 1] : -INF, aR = i < m ? a[i] : INF;
            long long bL = j > 0 ? b[j - 1] : -INF, bR = j < n ? b[j] : INF;
            if (aL <= bR && bL <= aR) {
                long long left = max(aL, bL);
                if ((m + n) % 2) return (double)left;
                return (left + min(aR, bR)) / 2.0;
            }
            if (aL > bR) hi = i - 1; else lo = i + 1;
        }
        return 0.0;
    }
};
`,
    },
  },
  {
    id: "lc-75",
    source: "leetcode",
    title: "Sort Colors",
    statement: [
      "An array holds only the numbers 0, 1 and 2 (red, white and blue). Sort it so the 0s come first, then the 1s, then the 2s, and return it.",
      "Do not call a library sort. A single pass with constant extra space is possible: the problem is known as the Dutch national flag.",
    ],
    constraints: ["1 <= nums.length <= 300","nums[i] is 0, 1 or 2"],
    fn: {name: "sortColors",params: [{name: "nums",type: "int[]"}],returns: "int[]"},
    examples: [
      { input: [[2,0,2,1,1,0]], output: [0,0,1,1,2,2] },
      { input: [[2,0,1]], output: [0,1,2] },
    ],
    tests: [
      { input: [[0]], output: [0] },
      { input: [[2]], output: [2] },
      { input: [[1,1,1]], output: [1,1,1] },
      { input: [[2,2,1,1,0,0]], output: [0,0,1,1,2,2] },
      { input: [[0,1,2,0,1,2,0,1,2]], output: [0,0,0,1,1,1,2,2,2] },
      { input: [[1,0]], output: [0,1] },
      { input: [[2,1,2,1,2]], output: [1,1,2,2,2] },
    ],
    hints: [
      "Counting how many 0s, 1s and 2s there are and rewriting the array works in two passes. Can you do one?",
      "Keep three zones: finished 0s on the left, finished 2s on the right, and an unknown middle.",
      "Use pointers lo, i, hi. If nums[i] is 0, swap it to lo; if 2, swap it to hi (and do not advance i yet, since the swapped-in value is unknown); if 1, move on.",
    ],
    solution: {
      idea: [
        "Three-way partition. Everything before lo is 0, everything after hi is 2, and i scans the unknown part in between. A swapped-in value from the right is unseen, so i stays put after a swap with hi.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> sortColors(vector<int>& nums) {
        int lo = 0, i = 0, hi = (int)nums.size() - 1;
        while (i <= hi) {
            if (nums[i] == 0) swap(nums[lo++], nums[i++]);
            else if (nums[i] == 2) swap(nums[i], nums[hi--]);
            else i++;
        }
        return nums;
    }
};
`,
    },
  },
  {
    id: "lc-406",
    source: "leetcode",
    title: "Queue Reconstruction by Height",
    statement: [
      "People are described as [h, k]: the person is h tall and exactly k people standing in front of them are at least as tall. The list you get is in random order.",
      "Return the queue that satisfies every description. The input always comes from a real queue, and the answer is unique, so there is one correct output.",
    ],
    constraints: ["1 <= people.length <= 2000","0 <= h <= 1000000","0 <= k < people.length","a valid queue exists","the queue is unique"],
    fn: {name: "reconstructQueue",params: [{name: "people",type: "int[][]"}],returns: "int[][]"},
    examples: [
      { input: [[[7,0],[4,4],[7,1],[5,0],[6,1],[5,2]]], output: [[5,0],[7,0],[5,2],[6,1],[4,4],[7,1]] },
      { input: [[[6,0],[5,0],[4,0],[3,2],[2,2],[1,4]]], output: [[4,0],[5,0],[2,2],[3,2],[1,4],[6,0]] },
    ],
    tests: [
      { input: [[[5,0]]], output: [[5,0]] },
      { input: [[[2,1],[3,0]]], output: [[3,0],[2,1]] },
      { input: [[[3,1],[3,0]]], output: [[3,0],[3,1]] },
      { input: [[[1,0],[2,0],[3,0]]], output: [[1,0],[2,0],[3,0]] },
      { input: [[[3,0],[2,1],[1,2]]], output: [[3,0],[2,1],[1,2]] },
      { input: [[[9,0],[8,1],[7,2],[6,3]]], output: [[9,0],[8,1],[7,2],[6,3]] },
    ],
    hints: [
      "Place the tallest people first: nobody shorter can change the k of a taller person.",
      "Sort by height descending, and for equal heights by k ascending.",
      "Then insert each person at index k of the answer list. People already placed are all at least as tall, so index k is exactly right.",
    ],
    solution: {
      idea: [
        "Sort by height descending (ties: k ascending) and insert each person at position k. Shorter people inserted later never affect the count seen by taller ones, and the people already in the list are all at least as tall, so the k-th slot is correct.",
      ],
      complexity: "O(n^2) time because of the list insertions, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> reconstructQueue(vector<vector<int>>& people) {
        sort(people.begin(), people.end(), [](const vector<int>& a, const vector<int>& b) {
            return a[0] != b[0] ? a[0] > b[0] : a[1] < b[1];
        });
        vector<vector<int>> out;
        for (auto& p : people) out.insert(out.begin() + p[1], p);
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-493",
    source: "leetcode",
    title: "Reverse Pairs",
    statement: [
      "Count the pairs of positions (i, j) with i < j and nums[i] > 2 * nums[j]. Return how many there are.",
      "Watch out: doubling a number near the 32-bit limit overflows an int.",
    ],
    constraints: ["1 <= nums.length <= 50000","-2^31 <= nums[i] <= 2^31 - 1"],
    fn: {name: "reversePairs",params: [{name: "nums",type: "int[]"}],returns: "int"},
    examples: [
      { input: [[1,3,2,3,1]], output: 2, explanation: "(1, 4) is 3 > 2 * 1 and (3, 4) is 3 > 2 * 1." },
      { input: [[2,4,3,5,1]], output: 3 },
    ],
    tests: [
      { input: [[1]], output: 0 },
      { input: [[5,1]], output: 1 },
      { input: [[1,5]], output: 0 },
      { input: [[2,2,2]], output: 0 },
      { input: [[-5,-5]], output: 1 },
      { input: [[2147483647,-2147483648,2147483647,-2147483648]], output: 4 },
      { input: [[5,4,3,2,1]], output: 4 },
      { input: [[-1,-2,-3,0,3]], output: 3 },
    ],
    hints: [
      "Counting every pair is O(n^2), too slow for 50000 elements in the worst case.",
      "Merge sort splits the array and compares the halves. Before merging two sorted halves, you can count the cross pairs with two pointers.",
      "For each element on the left half, advance a pointer on the right half while left > 2 * right. Use long long for the doubling.",
    ],
    solution: {
      idea: [
        "Modified merge sort. After sorting both halves, for each left element x count the right elements y with x > 2y; the right pointer only moves forward as x grows, so counting a level costs O(n). Then merge normally.",
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long count(vector<int>& a, vector<int>& tmp, int lo, int hi) {
        if (hi - lo <= 1) return 0;
        int mid = (lo + hi) / 2;
        long long res = count(a, tmp, lo, mid) + count(a, tmp, mid, hi);
        int j = mid;
        for (int i = lo; i < mid; i++) {
            while (j < hi && (long long)a[i] > 2LL * a[j]) j++;
            res += j - mid;
        }
        merge(a.begin() + lo, a.begin() + mid, a.begin() + mid, a.begin() + hi, tmp.begin() + lo);
        copy(tmp.begin() + lo, tmp.begin() + hi, a.begin() + lo);
        return res;
    }
public:
    int reversePairs(vector<int>& nums) {
        vector<int> tmp(nums.size());
        return (int)count(nums, tmp, 0, (int)nums.size());
    }
};
`,
    },
  },
  {
    id: "lc-287",
    source: "leetcode",
    title: "Find the Duplicate Number",
    statement: [
      "An array of n + 1 integers contains numbers from 1 to n. Exactly one value is repeated (it may appear more than twice); every other value appears once. Return the repeated value.",
      "Do it without changing the array and with constant extra space. Hint: think of the array as a linked list where index i points to nums[i].",
    ],
    constraints: ["1 <= n <= 100000","nums.length == n + 1","1 <= nums[i] <= n","exactly one value is repeated (possibly many times); the other values appear at most once"],
    fn: {name: "findDuplicate",params: [{name: "nums",type: "int[]"}],returns: "int"},
    examples: [
      { input: [[1,3,4,2,2]], output: 2 },
      { input: [[3,1,3,4,2]], output: 3 },
    ],
    tests: [
      { input: [[1,1]], output: 1 },
      { input: [[1,1,2]], output: 1 },
      { input: [[2,2,2,2,2]], output: 2 },
      { input: [[1,4,4,2,4]], output: 4 },
      { input: [[2,5,9,6,9,3,8,9,7,1]], output: 9 },
      { input: [[1,2,3,4,5,6,7,7]], output: 7 },
      { input: [[7,1,2,3,4,5,6,7]], output: 7 },
    ],
    hints: [
      "Sorting works but changes the array; a hash set works but uses O(n) space.",
      "Treat i -> nums[i] as a pointer. Since two indices point to the same value, following pointers must eventually enter a cycle.",
      "The duplicate is the entrance of that cycle. Find it with Floyd's tortoise and hare: meet inside the cycle, then restart one pointer from index 0 and move both one step at a time.",
    ],
    solution: {
      idea: [
        "Floyd's cycle detection on the functional graph i -> nums[i]. Index 0 is never a target (values are at least 1), so the walk from 0 leads into a cycle, and the cycle's entrance is the value reached by two different indices: the duplicate.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        int slow = nums[0], fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        slow = nums[0];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
};
`,
    },
  },
  {
    id: "lc-236",
    source: "leetcode",
    title: "Lowest Common Ancestor of a Binary Tree",
    statement: [
      "Given a binary tree and two values p and q that both occur in it, return the value of their lowest common ancestor: the deepest node that has both p and q in its subtree. A node counts as a descendant of itself.",
      "On the original site p and q are node references. Here the node values are all distinct, so a value names a node. A tree is given level by level, with null for a missing child: [1,null,2,3] is a root 1 with no left child, a right child 2, and 3 as the left child of 2.",
    ],
    constraints: ["2 <= number of nodes <= 100000","-1000000000 <= node value <= 1000000000","all node values are distinct","p != q and both are in the tree"],
    fn: {name: "lowestCommonAncestor",params: [{name: "root",type: "tree"},{name: "p",type: "int"},{name: "q",type: "int"}],returns: "int"},
    examples: [
      { input: [[3,5,1,6,2,0,8,null,null,7,4],5,1], output: 3 },
      { input: [[3,5,1,6,2,0,8,null,null,7,4],5,4], output: 5, explanation: "4 is below 5, and a node is its own descendant." },
      { input: [[1,2],1,2], output: 1 },
    ],
    tests: [
      { input: [[1,2,3],2,3], output: 1 },
      { input: [[1,2,3,4,5,6,7],4,5], output: 2 },
      { input: [[1,2,3,4,5,6,7],4,7], output: 1 },
      { input: [[1,2,null,3,null,4],3,4], output: 3 },
      { input: [[3,5,1,6,2,0,8,null,null,7,4],7,8], output: 3 },
      { input: [[3,5,1,6,2,0,8,null,null,7,4],6,4], output: 5 },
      { input: [[0,-1,1],-1,1], output: 0 },
    ],
    hints: [
      "If a node's left subtree contains one of the values and its right subtree contains the other, that node is the answer.",
      "A recursive function can return a found value (p or q) upward, or null when neither is in the subtree.",
      "At each node: if it equals p or q, return it. Otherwise ask both children. If both reply, this node is the LCA; if only one replies, pass that reply up.",
    ],
    solution: {
      idea: [
        "One DFS. lca(node) returns the node itself when it is p or q, otherwise combines the children: both non-null means this node is the split point (the answer); otherwise return whichever is non-null. The first node where both sides answer is the lowest one.",
      ],
      complexity: "O(n) time, O(h) space for the recursion (h = height).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    TreeNode* go(TreeNode* node, int p, int q) {
        if (!node) return nullptr;
        if (node->val == p || node->val == q) return node;
        TreeNode* l = go(node->left, p, q);
        TreeNode* r = go(node->right, p, q);
        if (l && r) return node;
        return l ? l : r;
    }
public:
    int lowestCommonAncestor(TreeNode* root, int p, int q) {
        return go(root, p, q)->val;
    }
};
`,
    },
  },
  {
    id: "lc-124",
    source: "leetcode",
    title: "Binary Tree Maximum Path Sum",
    statement: [
      "A path in a binary tree is a chain of nodes where each neighbouring pair is joined by an edge. It may start and end at any node and does not have to pass through the root, but it can use each node at most once.",
      "Return the largest sum of node values over all non-empty paths. A tree is given level by level, with null for a missing child: [1,null,2,3] is a root 1 with no left child, a right child 2, and 3 as the left child of 2.",
    ],
    constraints: ["1 <= number of nodes <= 30000","-1000 <= node value <= 1000"],
    fn: {name: "maxPathSum",params: [{name: "root",type: "tree"}],returns: "int"},
    examples: [
      { input: [[1,2,3]], output: 6, explanation: "The path 2 -> 1 -> 3." },
      { input: [[-10,9,20,null,null,15,7]], output: 42, explanation: "The path 15 -> 20 -> 7." },
    ],
    tests: [
      { input: [[-3]], output: -3 },
      { input: [[2,-1]], output: 2 },
      { input: [[-1,-2,-3]], output: -1 },
      { input: [[1,-2,3]], output: 4 },
      { input: [[5,4,8,11,null,13,4,7,2,null,null,null,1]], output: 48 },
      { input: [[1,2,null,3,null,4]], output: 10 },
      { input: [[-2,null,-3]], output: -2 },
      { input: [[0]], output: 0 },
    ],
    hints: [
      "Any path has a highest node, the one closest to the root. Solve for each node as that top point.",
      "For a node, the best path through it is its value plus the best downward arm on the left plus the best downward arm on the right. A negative arm is better dropped (use 0).",
      "A DFS returns to its parent only a single downward arm: value + max(left arm, right arm, 0). Update a global best with the two-armed total at every node.",
    ],
    solution: {
      idea: [
        "Post-order DFS. gain(node) = value + max(0, gain(left), gain(right)) is what the parent can use. At each node, candidate = value + max(0, gain(left)) + max(0, gain(right)); the answer is the maximum candidate over all nodes.",
      ],
      complexity: "O(n) time, O(h) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    int best;
    int gain(TreeNode* n) {
        if (!n) return 0;
        int l = max(0, gain(n->left));
        int r = max(0, gain(n->right));
        best = max(best, n->val + l + r);
        return n->val + max(l, r);
    }
public:
    int maxPathSum(TreeNode* root) {
        best = INT_MIN;
        gain(root);
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-987",
    source: "leetcode",
    title: "Vertical Order Traversal of a Binary Tree",
    statement: [
      "Give every node coordinates (row, column): the root is at (0, 0); a left child of (r, c) is at (r + 1, c - 1) and a right child at (r + 1, c + 1).",
      "Group the nodes by column, from the leftmost column to the rightmost. Inside a column list the values from the top row down; when two nodes share a row and column, put the smaller value first. Return the list of columns. A tree is given level by level, with null for a missing child: [1,null,2,3] is a root 1 with no left child, a right child 2, and 3 as the left child of 2.",
    ],
    constraints: ["1 <= number of nodes <= 1000","0 <= node value <= 1000"],
    fn: {name: "verticalTraversal",params: [{name: "root",type: "tree"}],returns: "int[][]"},
    examples: [
      { input: [[3,9,20,null,null,15,7]], output: [[9],[3,15],[20],[7]] },
      { input: [[1,2,3,4,5,6,7]], output: [[4],[2],[1,5,6],[3],[7]], explanation: "5 and 6 share row 2, column 0, so the smaller one (5) is first." },
    ],
    tests: [
      { input: [[1]], output: [[1]] },
      { input: [[1,2]], output: [[2],[1]] },
      { input: [[1,null,2]], output: [[1],[2]] },
      { input: [[1,2,3,4,6,5,7]], output: [[4],[2],[1,5,6],[3],[7]] },
      { input: [[0,8,1,null,null,3,2,null,4,5,null,null,7,6]], output: [[8],[0,3,6],[1,4,5],[2,7]] },
      { input: [[1,2,2,3,null,null,3]], output: [[3],[2],[1],[2],[3]] },
      { input: [[5,1,9,0,3,4,7]], output: [[0],[1],[5,3,4],[9],[7]] },
    ],
    hints: [
      "First collect every node together with its row and column.",
      "A DFS or BFS that carries (row, column) down to the children does it in one pass.",
      "Then sort the triples by column, then row, then value, and cut the sorted list into columns.",
    ],
    solution: {
      idea: [
        "Traverse the tree recording (column, row, value) for every node. Sorting by that triple orders columns left to right, rows top to bottom and ties by value. Walk the sorted list and start a new inner list whenever the column changes.",
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> verticalTraversal(TreeNode* root) {
        vector<tuple<int, int, int>> items;
        function<void(TreeNode*, int, int)> dfs = [&](TreeNode* n, int row, int col) {
            if (!n) return;
            items.push_back({col, row, n->val});
            dfs(n->left, row + 1, col - 1);
            dfs(n->right, row + 1, col + 1);
        };
        dfs(root, 0, 0);
        sort(items.begin(), items.end());
        vector<vector<int>> out;
        int prev = INT_MIN;
        for (auto& [c, r, v] : items) {
            if (c != prev) { out.push_back({}); prev = c; }
            out.back().push_back(v);
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-99",
    source: "leetcode",
    title: "Recover Binary Search Tree",
    statement: [
      "Exactly two nodes of a binary search tree had their values swapped by mistake. Fix the tree by swapping the two values back, and return the repaired tree.",
      "The shape of the tree does not change, only two values. Try to use O(1) extra space apart from the recursion. A tree is given level by level, with null for a missing child: [1,null,2,3] is a root 1 with no left child, a right child 2, and 3 as the left child of 2.",
    ],
    constraints: ["2 <= number of nodes <= 1000","-2^31 <= node value <= 2^31 - 1","all values are distinct","exactly two values were swapped"],
    fn: {name: "recoverTree",params: [{name: "root",type: "tree"}],returns: "tree"},
    examples: [
      { input: [[1,3,null,null,2]], output: [3,1,null,null,2], explanation: "3 and 1 were swapped." },
      { input: [[3,1,4,null,null,2]], output: [2,1,4,null,null,3] },
    ],
    tests: [
      { input: [[1,2]], output: [2,1] },
      { input: [[3,null,2]], output: [2,null,3] },
      { input: [[4,3,6,1,2,5,7]], output: [4,2,6,1,3,5,7] },
      { input: [[5,2,6,1,3,4,7]], output: [4,2,6,1,3,5,7] },
      { input: [[4,2,6,7,3,5,1]], output: [4,2,6,1,3,5,7] },
      { input: [[2,3,1]], output: [2,1,3] },
      { input: [[-2147483648,2147483647]], output: [2147483647,-2147483648] },
    ],
    hints: [
      "An inorder walk of a valid BST gives increasing values. What does the walk look like after a swap?",
      "There are one or two places where a value is smaller than the one before it. The first such 'drop' marks the larger swapped node, and the last drop marks the smaller one.",
      "During an inorder walk remember the previous node. At the first drop keep prev as the first culprit; at every drop keep the current node as the second. Swap their values at the end.",
    ],
    solution: {
      idea: [
        "Inorder traversal keeping the previous node. A descent (prev.val > cur.val) means a swapped node: the first time, first = prev; always second = cur. Swapping the values of first and second restores the BST. Adjacent swaps produce one descent, far-apart swaps two; the rule handles both.",
      ],
      complexity: "O(n) time, O(h) space (O(1) with Morris traversal).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    TreeNode *prev = nullptr, *first = nullptr, *second = nullptr;
    void walk(TreeNode* n) {
        if (!n) return;
        walk(n->left);
        if (prev && prev->val > n->val) {
            if (!first) first = prev;
            second = n;
        }
        prev = n;
        walk(n->right);
    }
public:
    TreeNode* recoverTree(TreeNode* root) {
        prev = first = second = nullptr;
        walk(root);
        if (first && second) swap(first->val, second->val);
        return root;
    }
};
`,
    },
  },
  {
    id: "lc-834",
    source: "leetcode",
    title: "Sum of Distances in Tree",
    statement: [
      "An undirected tree has n nodes labelled 0 to n - 1 and n - 1 edges. Return an array answer where answer[i] is the sum of the distances from node i to every other node (the distance is the number of edges on the path).",
      "Running a BFS from every node works in O(n^2). Aim for O(n) by reusing the answer of a parent for its child.",
    ],
    constraints: ["1 <= n <= 30000","edges.length == n - 1","0 <= a, b < n","the edges form a tree"],
    fn: {name: "sumOfDistancesInTree",params: [{name: "n",type: "int"},{name: "edges",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [6,[[0,1],[0,2],[2,3],[2,4],[2,5]]], output: [8,12,6,10,10,10] },
      { input: [1,[]], output: [0] },
      { input: [2,[[1,0]]], output: [1,1] },
    ],
    tests: [
      { input: [4,[[0,1],[1,2],[2,3]]], output: [6,4,4,6] },
      { input: [4,[[0,1],[0,2],[0,3]]], output: [3,5,5,5] },
      { input: [3,[[0,1],[1,2]]], output: [3,2,3] },
      { input: [5,[[4,3],[3,2],[2,1],[1,0]]], output: [10,7,6,7,10] },
      { input: [7,[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]]], output: [10,11,11,16,16,16,16] },
      { input: [8,[[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[5,7]]], output: [21,15,11,15,21,13,19,19] },
    ],
    hints: [
      "Root the tree at node 0. The sum of distances from the root is easy: add up the depths of all nodes.",
      "Count, for every node, how many nodes are in its subtree (cnt). Moving the viewpoint from a parent to a child brings cnt[child] nodes one step closer and the other n - cnt[child] nodes one step farther.",
      "So answer[child] = answer[parent] - cnt[child] + (n - cnt[child]). Compute the subtree sizes and the root's answer in one DFS, then push the answers down in a second one.",
    ],
    solution: {
      idea: [
        "Rerooting. First DFS: subtree sizes and the sum of distances from node 0. Second DFS: ans[child] = ans[parent] - size[child] + (n - size[child]). Use an explicit stack or iterative order if the tree is deep (30000 nodes in a chain).",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> sumOfDistancesInTree(int n, vector<vector<int>>& edges) {
        vector<vector<int>> g(n);
        for (auto& e : edges) { g[e[0]].push_back(e[1]); g[e[1]].push_back(e[0]); }
        vector<int> order, parent(n, -1);
        order.reserve(n);
        vector<int> st = {0};
        while (!st.empty()) {
            int u = st.back(); st.pop_back();
            order.push_back(u);
            for (int v : g[u]) if (v != parent[u]) { parent[v] = u; st.push_back(v); }
        }
        vector<long long> cnt(n, 1), ans(n, 0);
        for (int i = n - 1; i > 0; i--) {
            int u = order[i];
            cnt[parent[u]] += cnt[u];
            ans[parent[u]] += ans[u] + cnt[u];
        }
        for (int i = 1; i < n; i++) {
            int u = order[i];
            ans[u] = ans[parent[u]] - cnt[u] + (n - cnt[u]);
        }
        return vector<int>(ans.begin(), ans.end());
    }
};
`,
    },
  },
  {
    id: "lc-421",
    source: "leetcode",
    title: "Maximum XOR of Two Numbers in an Array",
    statement: [
      "Given an array of non-negative integers, return the largest value of nums[i] XOR nums[j] over all pairs of indices i and j (they may be equal).",
      "Trying every pair is O(n^2). Think about the bits from the top down.",
    ],
    constraints: ["1 <= nums.length <= 200000","0 <= nums[i] <= 2^31 - 1"],
    fn: {name: "findMaximumXOR",params: [{name: "nums",type: "int[]"}],returns: "int"},
    examples: [
      { input: [[3,10,5,25,2,8]], output: 28, explanation: "5 XOR 25 = 28." },
      { input: [[14,70,53,83,49,91,36,80,92,51,66,70]], output: 127 },
    ],
    tests: [
      { input: [[0]], output: 0 },
      { input: [[7]], output: 0 },
      { input: [[1,2]], output: 3 },
      { input: [[8,10,2]], output: 10 },
      { input: [[5,5,5]], output: 0 },
      { input: [[2147483647,0]], output: 2147483647 },
      { input: [[2147483647,1073741824,3]], output: 2147483644 },
      { input: [[1,2,4,8,16]], output: 24 },
    ],
    hints: [
      "To get the biggest XOR, you want the highest bit to differ if at all possible, then the next bit, and so on.",
      "Build the answer one bit at a time from bit 30 down. Suppose you want to test whether the answer has this bit set, given the bits already decided.",
      "Store the prefixes (the numbers shifted right) in a set. A candidate answer c is reachable if some prefix a and prefix b satisfy a XOR b == c, i.e. b == c XOR a. Or insert the numbers in a binary trie and for each number walk the opposite bits greedily.",
    ],
    solution: {
      idea: [
        "Greedy over bits with a hash set. For bit from 30 down to 0: keep the set of prefixes of all numbers (x >> bit). Try candidate = answer | 1 bit; if any prefix p has (candidate XOR p) in the set, the candidate is achievable, so keep it. After the last bit, answer is the maximum XOR.",
      ],
      complexity: "O(31 * n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findMaximumXOR(vector<int>& nums) {
        int best = 0;
        for (int bit = 30; bit >= 0; bit--) {
            unordered_set<int> prefixes;
            for (int x : nums) prefixes.insert(x >> bit);
            int cand = (best << 1) | 1;
            bool ok = false;
            for (int p : prefixes) {
                if (prefixes.count(cand ^ p)) { ok = true; break; }
            }
            best = ok ? cand : best << 1;
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-994",
    source: "leetcode",
    title: "Rotting Oranges",
    statement: [
      "A grid holds 0 (empty), 1 (fresh orange) or 2 (rotten orange). Every minute, each fresh orange that touches a rotten one (up, down, left or right) becomes rotten.",
      "Return the number of minutes until no fresh orange is left, or -1 if some fresh orange can never rot.",
    ],
    constraints: ["1 <= rows, columns <= 10","grid[i][j] is 0, 1 or 2"],
    fn: {name: "orangesRotting",params: [{name: "grid",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[2,1,1],[1,1,0],[0,1,1]]], output: 4 },
      { input: [[[2,1,1],[0,1,1],[1,0,1]]], output: -1, explanation: "The orange at the bottom left is cut off." },
      { input: [[[0,2]]], output: 0 },
    ],
    tests: [
      { input: [[[0]]], output: 0 },
      { input: [[[1]]], output: -1 },
      { input: [[[2]]], output: 0 },
      { input: [[[2,2],[1,1]]], output: 1 },
      { input: [[[1,2]]], output: 1 },
      { input: [[[2,1,1,1,1,1,1]]], output: 6 },
      { input: [[[0,0],[0,0]]], output: 0 },
      { input: [[[2,1,0,2,1],[1,0,1,2,1],[1,0,0,2,1]]], output: 2 },
    ],
    hints: [
      "All rotten oranges spread at the same time, like a wave.",
      "That is a multi-source BFS: start with every rotten orange in the queue, and process the queue one level (minute) at a time.",
      "Count the fresh oranges first. When BFS ends, if fresh oranges remain return -1; otherwise return the number of levels that actually rotted something.",
    ],
    solution: {
      idea: [
        "Multi-source BFS by levels. Queue all initial rotten oranges, count the fresh ones. Each level, rot the fresh neighbours of the queued cells and queue them; one level is one minute. The answer is the number of levels in which something rotted, or -1 if the fresh count never reaches zero.",
      ],
      complexity: "O(rows * columns) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int orangesRotting(vector<vector<int>>& grid) {
        int r = (int)grid.size(), c = (int)grid[0].size();
        queue<pair<int, int>> q;
        int fresh = 0;
        for (int i = 0; i < r; i++)
            for (int j = 0; j < c; j++) {
                if (grid[i][j] == 2) q.push({i, j});
                else if (grid[i][j] == 1) fresh++;
            }
        int minutes = 0;
        int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
        while (!q.empty() && fresh > 0) {
            int sz = (int)q.size();
            while (sz--) {
                auto [x, y] = q.front(); q.pop();
                for (int d = 0; d < 4; d++) {
                    int nx = x + dx[d], ny = y + dy[d];
                    if (nx < 0 || ny < 0 || nx >= r || ny >= c || grid[nx][ny] != 1) continue;
                    grid[nx][ny] = 2;
                    fresh--;
                    q.push({nx, ny});
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
};
`,
    },
  },
  {
    id: "lc-127",
    source: "leetcode",
    title: "Word Ladder",
    statement: [
      "You change one word into another by altering exactly one letter per step, and every word you pass through (apart from the start) must be in the given list.",
      "Return the number of words on the shortest such sequence, counting the start and the end word. If the end word is not in the list or no sequence exists, return 0.",
    ],
    constraints: ["1 <= beginWord.length <= 10","all words have the same length and consist of lowercase letters","1 <= wordList.length <= 5000","beginWord != endWord","the words in wordList are distinct"],
    fn: {name: "ladderLength",params: [{name: "beginWord",type: "string"},{name: "endWord",type: "string"},{name: "wordList",type: "string[]"}],returns: "int"},
    examples: [
      { input: ["hit","cog",["hot","dot","dog","lot","log","cog"]], output: 5, explanation: "hit -> hot -> dot -> dog -> cog." },
      { input: ["hit","cog",["hot","dot","dog","lot","log"]], output: 0, explanation: "cog is not in the list." },
    ],
    tests: [
      { input: ["a","c",["a","b","c"]], output: 2 },
      { input: ["hot","dog",["hot","dog"]], output: 0 },
      { input: ["hit","hot",["hot"]], output: 2 },
      { input: ["lost","cost",["most","fist","lost","cost","fish"]], output: 2 },
      { input: ["red","tax",["ted","tex","red","tax","tad","den","rex","pee"]], output: 4 },
      { input: ["game","thee",["frye","heat","tree","thee","game","free","hell","fame","faye"]], output: 7 },
      { input: ["aaa","bbb",["aab","abb","bbb"]], output: 4 },
    ],
    hints: [
      "Think of each word as a node, and connect two words that differ in exactly one letter. The question is a shortest path.",
      "Breadth-first search from the begin word finds the fewest steps. Mark words visited as you queue them (or remove them from the set).",
      "To find the neighbours of a word, try changing each position to each of the 26 letters and check whether the result is in the set. That costs L * 26 lookups instead of comparing with every word.",
    ],
    solution: {
      idea: [
        "BFS over words. Put the word list in a hash set. From the current word generate every one-letter change; if it is in the set, remove it (so it is not revisited) and queue it with distance + 1. Reaching the end word returns its distance; an empty queue returns 0.",
      ],
      complexity: "O(N * L * 26) time for N words of length L, O(N * L) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
        unordered_set<string> dict(wordList.begin(), wordList.end());
        if (!dict.count(endWord)) return 0;
        queue<pair<string, int>> q;
        q.push({beginWord, 1});
        dict.erase(beginWord);
        while (!q.empty()) {
            auto [w, d] = q.front(); q.pop();
            if (w == endWord) return d;
            for (size_t i = 0; i < w.size(); i++) {
                char orig = w[i];
                for (char c = 'a'; c <= 'z'; c++) {
                    if (c == orig) continue;
                    w[i] = c;
                    if (dict.count(w)) { dict.erase(w); q.push({w, d + 1}); }
                }
                w[i] = orig;
            }
        }
        return 0;
    }
};
`,
    },
  },
  {
    id: "lc-542",
    source: "leetcode",
    title: "01 Matrix",
    statement: [
      "Given a grid of 0s and 1s, return a grid of the same size where each cell holds the distance to the nearest 0. Distance counts steps between cells that share a side (up, down, left, right).",
      "At least one 0 is guaranteed to exist.",
    ],
    constraints: ["1 <= rows, columns <= 10000","rows * columns <= 10000","mat[i][j] is 0 or 1","there is at least one 0"],
    fn: {name: "updateMatrix",params: [{name: "mat",type: "int[][]"}],returns: "int[][]"},
    examples: [
      { input: [[[0,0,0],[0,1,0],[0,0,0]]], output: [[0,0,0],[0,1,0],[0,0,0]] },
      { input: [[[0,0,0],[0,1,0],[1,1,1]]], output: [[0,0,0],[0,1,0],[1,2,1]] },
    ],
    tests: [
      { input: [[[0]]], output: [[0]] },
      { input: [[[0,1]]], output: [[0,1]] },
      { input: [[[1,0]]], output: [[1,0]] },
      { input: [[[0,1,1,1]]], output: [[0,1,2,3]] },
      { input: [[[1,1,1],[1,1,1],[1,1,0]]], output: [[4,3,2],[3,2,1],[2,1,0]] },
      { input: [[[0],[1],[1],[1]]], output: [[0],[1],[2],[3]] },
      { input: [[[1,0,1],[1,1,1],[1,0,1]]], output: [[1,0,1],[2,1,2],[1,0,1]] },
    ],
    hints: [
      "Doing a BFS from every 1 is too slow. Flip the question: from where does distance spread out?",
      "Start BFS from all the 0 cells at once, with distance 0. Each step outward adds 1.",
      "Initialise every 1 as unvisited (-1 or infinity), queue all 0s, and when you reach an unvisited neighbour set its distance to the current cell's distance plus 1.",
    ],
    solution: {
      idea: [
        "Multi-source BFS from all zeros. The first time BFS reaches a cell is along a shortest path from the nearest zero, so that distance is final. A two-pass DP (top-left then bottom-right) gives the same answer.",
      ],
      complexity: "O(rows * columns) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> updateMatrix(vector<vector<int>>& mat) {
        int r = (int)mat.size(), c = (int)mat[0].size();
        vector<vector<int>> dist(r, vector<int>(c, -1));
        queue<pair<int, int>> q;
        for (int i = 0; i < r; i++)
            for (int j = 0; j < c; j++)
                if (mat[i][j] == 0) { dist[i][j] = 0; q.push({i, j}); }
        int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
        while (!q.empty()) {
            auto [x, y] = q.front(); q.pop();
            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d], ny = y + dy[d];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c || dist[nx][ny] != -1) continue;
                dist[nx][ny] = dist[x][y] + 1;
                q.push({nx, ny});
            }
        }
        return dist;
    }
};
`,
    },
  },
  {
    id: "lc-417",
    source: "leetcode",
    title: "Pacific Atlantic Water Flow",
    statement: [
      "A grid of heights is an island. The Pacific Ocean touches the top and left edges and the Atlantic Ocean touches the bottom and right edges. Rain falling on a cell flows to a neighbouring cell (up, down, left or right) of equal or lower height.",
      "Return every cell [row, column] from which water can reach both oceans. The cells may be listed in any order.",
    ],
    constraints: ["1 <= rows, columns <= 200","0 <= heights[r][c] <= 100000"],
    fn: {name: "pacificAtlantic",params: [{name: "heights",type: "int[][]"}],returns: "int[][]"},
    examples: [
      { input: [[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]], output: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]] },
      { input: [[[1]]], output: [[0,0]] },
    ],
    tests: [
      { input: [[[1,1],[1,1]]], output: [[0,0],[0,1],[1,0],[1,1]] },
      { input: [[[2,1],[1,2]]], output: [[0,0],[0,1],[1,0],[1,1]] },
      { input: [[[1,2,3],[8,9,4],[7,6,5]]], output: [[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]] },
      { input: [[[10,10,10],[10,1,10],[10,10,10]]], output: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]] },
      { input: [[[1,2,3,4]]], output: [[0,0],[0,1],[0,2],[0,3]] },
      { input: [[[1],[2],[3],[4]]], output: [[0,0],[1,0],[2,0],[3,0]] },
      { input: [[[3,3,3],[3,1,3],[0,2,4]]], output: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]] },
    ],
    unordered: true,
    hints: [
      "Checking every cell with its own search is slow. Reverse the direction of the flow.",
      "Start at the ocean edges and walk uphill: from a cell, move to neighbours that are at least as high. Everything reached this way can flow down to that ocean.",
      "Run the uphill search once from all Pacific border cells and once from all Atlantic border cells. The answer is the cells marked in both.",
    ],
    solution: {
      idea: [
        "Two reverse searches. DFS/BFS from the Pacific border, moving to neighbours with height >= the current one, marks every cell that can drain to the Pacific. Do the same from the Atlantic border. Output the cells marked by both.",
      ],
      complexity: "O(rows * columns) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    int r, c;
    void fill(vector<vector<int>>& h, vector<vector<bool>>& seen, int sx, int sy) {
        if (seen[sx][sy]) return;
        seen[sx][sy] = true;
        queue<pair<int, int>> q;
        q.push({sx, sy});
        int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
        while (!q.empty()) {
            auto [x, y] = q.front(); q.pop();
            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d], ny = y + dy[d];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c || seen[nx][ny] || h[nx][ny] < h[x][y]) continue;
                seen[nx][ny] = true;
                q.push({nx, ny});
            }
        }
    }
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        r = (int)heights.size(); c = (int)heights[0].size();
        vector<vector<bool>> pac(r, vector<bool>(c, false)), atl(r, vector<bool>(c, false));
        for (int i = 0; i < r; i++) { fill(heights, pac, i, 0); fill(heights, atl, i, c - 1); }
        for (int j = 0; j < c; j++) { fill(heights, pac, 0, j); fill(heights, atl, r - 1, j); }
        vector<vector<int>> out;
        for (int i = 0; i < r; i++)
            for (int j = 0; j < c; j++)
                if (pac[i][j] && atl[i][j]) out.push_back({i, j});
        return out;
    }
};
`,
    },
  },
];
