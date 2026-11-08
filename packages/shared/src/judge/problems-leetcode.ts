import type { ProblemSpec } from "./types";

// Roadmap LeetCode problems you can run in the app. Statements, examples and tests are written for this app
// (not copied from LeetCode); the problem id matches the roadmap list in ../dsa.ts. Every reference solution is
// compiled and checked against these cases by apps/web/lib/judge/judge.test.ts.

export const LEETCODE_SPECS: ProblemSpec[] = [
  {
    id: "lc-1",
    source: "leetcode",
    title: "Two Sum",
    statement: [
      "You are given a list of integers nums and an integer target. Exactly one pair of different positions i and j has nums[i] + nums[j] equal to target.",
      "Return the two positions, in any order. You may not use the same element twice.",
    ],
    constraints: ["2 <= nums.length <= 10000", "-1000000000 <= nums[i] <= 1000000000", "-1000000000 <= target <= 1000000000", "Exactly one valid pair exists"],
    fn: { name: "twoSum", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int[]" },
    unordered: true,
    examples: [
      { input: [[2, 7, 11, 15], 9], output: [0, 1], explanation: "nums[0] + nums[1] = 2 + 7 = 9." },
      { input: [[3, 2, 4], 6], output: [1, 2], explanation: "2 + 4 = 6. The 3 at position 0 would need another 3." },
      { input: [[3, 3], 6], output: [0, 1], explanation: "Equal values are fine as long as the positions differ." },
    ],
    tests: [
      { input: [[-1, -2, -3, -4, -5], -8], output: [2, 4] },
      { input: [[0, 4, 3, 0], 0], output: [0, 3] },
      { input: [[1, 5, 9, 14, 20], 34], output: [3, 4] },
      { input: [[5, 75, 25], 100], output: [1, 2] },
      { input: [[8, 1, 6, 5], 9], output: [0, 1] },
      { input: [[2, 5, 5, 11], 10], output: [1, 2] },
      { input: [[1000000000, 7, -1000000000, 3], 0], output: [0, 2] },
    ],
    hints: [
      "Checking every pair works, but it is slow for 10000 numbers. What do you need to know about the other number when you stand on one?",
      "If you are at nums[i], the partner must be exactly target - nums[i]. Can you find out quickly whether you have already seen that value?",
      "Keep a hash map from value to position as you walk left to right. Before storing nums[i], look up target - nums[i]; if it is there you are done.",
    ],
    solution: {
      idea: [
        "Walk through the list once. For each number, ask the map whether target minus that number was seen earlier. If yes, return that earlier position and the current one. If not, remember the current number and its position.",
        "Looking up before inserting means a number is never paired with itself, and duplicates such as 3 and 3 still work because the first 3 is already in the map when the second arrives.",
      ],
      complexity: "O(n) time, O(n) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<long long, int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            auto it = seen.find((long long)target - nums[i]);
            if (it != seen.end()) return {it->second, i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
`,
    },
  },
  {
    id: "lc-20",
    source: "leetcode",
    title: "Valid Parentheses",
    statement: [
      "You are given a string s made only of the characters ( ) { } [ ]. Decide whether it is valid.",
      "A string is valid when every opening bracket is closed by a bracket of the same kind, and brackets are closed in the right order (the most recently opened one is closed first).",
    ],
    constraints: ["1 <= s.length <= 10000", "s contains only ( ) { } [ ]"],
    fn: { name: "isValid", params: [{ name: "s", type: "string" }], returns: "bool" },
    examples: [
      { input: ["()"], output: true },
      { input: ["()[]{}"], output: true },
      { input: ["(]"], output: false, explanation: "The ( is closed by a ], which is the wrong kind." },
      { input: ["([)]"], output: false, explanation: "The [ is still open when ) tries to close the (. Order matters." },
    ],
    tests: [
      { input: ["{[]}"], output: true },
      { input: ["("], output: false },
      { input: [")"], output: false },
      { input: ["(("], output: false },
      { input: ["([{}])"], output: true },
      { input: ["{[}"], output: false },
      { input: ["((()))"], output: true },
      { input: ["()))"], output: false },
      { input: ["[({})](]"], output: false },
    ],
    hints: [
      "The bracket you must close next is always the one you opened most recently. Which data structure gives you the most recent item first?",
      "Push every opening bracket on a stack. When you see a closing bracket, the top of the stack must be its partner.",
      "Fail if you meet a closing bracket with an empty stack or the wrong partner on top. At the end the stack must be empty, otherwise some bracket was never closed.",
    ],
    solution: {
      idea: [
        "Use a stack of open brackets. For an opening bracket, push it. For a closing bracket, the stack must be non-empty and its top must be the matching opener; pop it. Any other situation means the string is invalid.",
        "After the last character, an empty stack means everything was closed. A non-empty stack means some opener has no partner, such as in the string with a single open bracket.",
      ],
      complexity: "O(n) time, O(n) space for the stack.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        vector<char> st;
        for (char c : s) {
            if (c == '(' || c == '{' || c == '[') {
                st.push_back(c);
            } else {
                if (st.empty()) return false;
                char o = st.back();
                st.pop_back();
                if ((c == ')' && o != '(') || (c == '}' && o != '{') || (c == ']' && o != '[')) return false;
            }
        }
        return st.empty();
    }
};
`,
    },
  },
  {
    id: "lc-121",
    source: "leetcode",
    title: "Best Time to Buy and Sell Stock",
    statement: [
      "prices[i] is the price of a stock on day i. You may buy on one day and sell on a later day, once.",
      "Return the largest profit you can make. If no profit is possible, return 0.",
    ],
    constraints: ["1 <= prices.length <= 100000", "0 <= prices[i] <= 10000"],
    fn: { name: "maxProfit", params: [{ name: "prices", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[7, 1, 5, 3, 6, 4]], output: 5, explanation: "Buy at 1 on day 1, sell at 6 on day 4." },
      { input: [[7, 6, 4, 3, 1]], output: 0, explanation: "Prices only fall, so do not trade." },
    ],
    tests: [
      { input: [[1]], output: 0 },
      { input: [[2, 4, 1]], output: 2 },
      { input: [[3, 2, 6, 5, 0, 3]], output: 4 },
      { input: [[1, 2]], output: 1 },
      { input: [[2, 1]], output: 0 },
      { input: [[5, 5, 5]], output: 0 },
      { input: [[1, 100, 0, 99]], output: 99 },
      { input: [[10000, 1, 10000]], output: 9999 },
    ],
    hints: [
      "For a fixed selling day, which buying day gives the best profit?",
      "It is the cheapest price seen on any earlier day. You do not need to try every pair.",
      "Walk once, keeping the lowest price so far. At each day, the best profit ending today is price minus that lowest price. Keep the maximum of those.",
    ],
    solution: {
      idea: [
        "Track the minimum price seen so far. On each day, compute price minus that minimum as the profit if you sold today, and keep the best value. Then update the minimum with today's price.",
        "Because the minimum only covers earlier days, you never sell before you buy. Starting the best profit at 0 handles falling prices.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int low = INT_MAX, best = 0;
        for (int p : prices) {
            low = min(low, p);
            best = max(best, p - low);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-53",
    source: "leetcode",
    title: "Maximum Subarray",
    statement: [
      "Given a list of integers nums, find the contiguous block of at least one element that has the largest sum, and return that sum.",
    ],
    constraints: ["1 <= nums.length <= 100000", "-10000 <= nums[i] <= 10000"],
    fn: { name: "maxSubArray", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], output: 6, explanation: "The block 4, -1, 2, 1 sums to 6." },
      { input: [[1]], output: 1 },
      { input: [[5, 4, -1, 7, 8]], output: 23, explanation: "The whole list." },
    ],
    tests: [
      { input: [[-1]], output: -1 },
      { input: [[-3, -2, -1]], output: -1 },
      { input: [[-2, -1]], output: -1 },
      { input: [[2, -1, 2, -1, 2]], output: 4 },
      { input: [[1, -1, 1, -1, 1]], output: 1 },
      { input: [[0, 0, 0]], output: 0 },
      { input: [[8, -19, 5, -4, 20]], output: 21 },
    ],
    hints: [
      "Think about the best block that ends exactly at position i.",
      "Either it is just nums[i], or it is nums[i] added to the best block ending at i - 1. Pick the larger.",
      "Keep one running value: cur = max(nums[i], cur + nums[i]). The answer is the largest cur you ever see. Start with the first element, not 0, so all-negative lists work.",
    ],
    solution: {
      idea: [
        "Kadane's idea: a running block that has gone negative can only hurt whatever comes next, so restart at the current element instead. cur holds the best sum of a block ending here; best holds the maximum cur so far.",
        "Initialise both with nums[0]. Starting at 0 would wrongly return 0 for a list of negative numbers.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int cur = nums[0], best = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            cur = max(nums[i], cur + nums[i]);
            best = max(best, cur);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-70",
    source: "leetcode",
    title: "Climbing Stairs",
    statement: [
      "A staircase has n steps. Each move you climb either 1 or 2 steps. Return the number of different sequences of moves that reach the top.",
    ],
    constraints: ["1 <= n <= 45"],
    fn: { name: "climbStairs", params: [{ name: "n", type: "int" }], returns: "int" },
    examples: [
      { input: [2], output: 2, explanation: "1+1 or 2." },
      { input: [3], output: 3, explanation: "1+1+1, 1+2, 2+1." },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [4], output: 5 },
      { input: [5], output: 8 },
      { input: [10], output: 89 },
      { input: [20], output: 10946 },
      { input: [30], output: 1346269 },
      { input: [45], output: 1836311903 },
    ],
    hints: [
      "Think about the very last move. How many different last moves are there?",
      "The last move was 1 step (from n-1) or 2 steps (from n-2). So ways(n) = ways(n-1) + ways(n-2).",
      "That is the Fibonacci recurrence. Keep only the last two values in a loop. Recursion without caching is too slow for n = 45.",
    ],
    solution: {
      idea: [
        "ways(1) = 1, ways(2) = 2, and every later value is the sum of the two before it. Roll two variables forward n times.",
        "The answer for n = 45 is 1,836,311,903, which still fits in a 32-bit signed integer.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int climbStairs(int n) {
        int a = 1, b = 1;
        for (int i = 2; i <= n; i++) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }
};
`,
    },
  },
  {
    id: "lc-11",
    source: "leetcode",
    title: "Container With Most Water",
    statement: [
      "height[i] is the height of a vertical line drawn at position i. Pick two lines. Together with the x-axis they form a container; the water it holds is the distance between the lines times the shorter height.",
      "Return the largest amount of water any two lines can hold. You cannot tilt the container.",
    ],
    constraints: ["2 <= height.length <= 100000", "0 <= height[i] <= 10000"],
    fn: { name: "maxArea", params: [{ name: "height", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], output: 49, explanation: "Lines at positions 1 and 8: width 7, shorter height 7." },
      { input: [[1, 1]], output: 1 },
    ],
    tests: [
      { input: [[4, 3, 2, 1, 4]], output: 16 },
      { input: [[1, 2, 1]], output: 2 },
      { input: [[2, 3, 4, 5, 18, 17, 6]], output: 17 },
      { input: [[0, 2]], output: 0 },
      { input: [[1, 2, 4, 3]], output: 4 },
      { input: [[5, 5, 5, 5]], output: 15 },
      { input: [[1, 3, 2, 5, 25, 24, 5]], output: 24 },
    ],
    hints: [
      "Start with the widest container: the first and last lines. What limits its height?",
      "The shorter line. Moving the taller line inward can only make the width smaller and cannot raise the height limit, so it never helps.",
      "Use two pointers at both ends. Compute the area, then move the pointer that points at the shorter line inward. Repeat until they meet.",
    ],
    solution: {
      idea: [
        "Two pointers at the ends. The area is width times the shorter height. Whichever side is shorter caps the area for every container that keeps that side, so moving the other side is pointless. Move the shorter side inward and hope for a taller line.",
        "Each step discards a pointer position that cannot be part of a better container, so you only visit n positions in total.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        int l = 0, r = (int)height.size() - 1, best = 0;
        while (l < r) {
            best = max(best, (r - l) * min(height[l], height[r]));
            if (height[l] < height[r]) l++;
            else r--;
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-3",
    source: "leetcode",
    title: "Longest Substring Without Repeating Characters",
    statement: [
      "Given a string s, return the length of the longest substring (a run of consecutive characters) in which no character appears twice.",
    ],
    constraints: ["0 <= s.length <= 50000", "s consists of letters, digits, symbols and spaces"],
    fn: { name: "lengthOfLongestSubstring", params: [{ name: "s", type: "string" }], returns: "int" },
    examples: [
      { input: ["abcabcbb"], output: 3, explanation: "The answer is abc." },
      { input: ["bbbbb"], output: 1 },
      { input: ["pwwkew"], output: 3, explanation: "wke. Note that pwke is a subsequence, not a substring." },
    ],
    tests: [
      { input: [""], output: 0 },
      { input: [" "], output: 1 },
      { input: ["au"], output: 2 },
      { input: ["dvdf"], output: 3 },
      { input: ["abba"], output: 2 },
      { input: ["tmmzuxt"], output: 5 },
      { input: ["aab"], output: 2 },
    ],
    hints: [
      "A window of consecutive characters with no repeats: when does it stop being valid?",
      "When the next character is already inside the window. Then the window's left edge must move past the earlier copy.",
      "Store the last position of every character. Keep a left edge; for each right position, if the character was last seen at or after left, set left to that position plus one. The answer is the largest right - left + 1.",
    ],
    solution: {
      idea: [
        "Sliding window with a last-seen table. Moving right one character at a time, if the new character was seen inside the current window, jump left to just after that earlier copy. The window always has distinct characters.",
        "Take care with the string abba: when the second a arrives, its earlier copy is already outside the window (left has moved past it because of the b), so left must not move backwards. That is why you compare against left or use max.",
      ],
      complexity: "O(n) time, O(alphabet) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        vector<int> last(256, -1);
        int left = 0, best = 0;
        for (int r = 0; r < (int)s.size(); r++) {
            unsigned char c = s[r];
            if (last[c] >= left) left = last[c] + 1;
            last[c] = r;
            best = max(best, r - left + 1);
        }
        return best;
    }
};
`,
    },
  },
];
