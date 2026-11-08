import type { ProblemSpec } from "./types";

// Batch 3: arrays, strings, hashing, windows, binary search and stacks. Written for this app (see problems-leetcode.ts).

export const LEETCODE_SPECS_3: ProblemSpec[] = [
  {
    id: "lc-347",
    source: "leetcode",
    title: "Top K Frequent Elements",
    statement: [
      "Given a list of integers nums and a number k, return the k values that appear most often. The answer is unique, and you may return the values in any order.",
      "Aim for better than O(n log n) time.",
    ],
    constraints: ["1 <= nums.length <= 100000", "-10000 <= nums[i] <= 10000", "1 <= k <= number of distinct values", "The set of k most frequent values is unique"],
    fn: { name: "topKFrequent", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returns: "int[]" },
    unordered: true,
    examples: [
      { input: [[1, 1, 1, 2, 2, 3], 2], output: [1, 2] },
      { input: [[1], 1], output: [1] },
    ],
    tests: [
      { input: [[4, 4, 4, 5, 5, 6], 1], output: [4] },
      { input: [[-1, -1, 2, 2, 3], 2], output: [-1, 2] },
      { input: [[1, 2, 3], 3], output: [1, 2, 3] },
      { input: [[5, 5, 5, 5, 3, 3, 3, 1, 1, 7], 2], output: [5, 3] },
      { input: [[10, 10, 20, 20, 20, 30], 2], output: [20, 10] },
      { input: [[7, 7, 7, 7], 1], output: [7] },
    ],
    hints: [
      "First you need to know how many times each value occurs. What structure gives you that in one pass?",
      "A hash map from value to count. Now you need the k values with the biggest counts.",
      "Either keep a min-heap of size k over (count, value) pairs, or use bucket sort: make a list of lists indexed by count (a count can be at most n) and read the buckets from the highest count down until you have k values.",
    ],
    solution: {
      idea: [
        "Count with a hash map. Then bucket the values by their count: bucket[c] holds the values that occur exactly c times. Walk the buckets from n down to 1, collecting values until you have k. No sorting is needed, so the whole thing is O(n).",
        "The heap version costs O(n log k) and is the one to mention if the interviewer asks about streaming data.",
      ],
      complexity: "O(n) time and space with buckets; O(n log k) with a heap.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> count;
        for (int x : nums) count[x]++;
        vector<vector<int>> bucket(nums.size() + 1);
        for (auto& [value, c] : count) bucket[c].push_back(value);
        vector<int> out;
        for (int c = (int)nums.size(); c >= 1 && (int)out.size() < k; c--) {
            for (int v : bucket[c]) {
                if ((int)out.size() < k) out.push_back(v);
            }
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-560",
    source: "leetcode",
    title: "Subarray Sum Equals K",
    statement: [
      "Given a list of integers nums and an integer k, return how many contiguous, non-empty subarrays add up to exactly k.",
      "The numbers can be negative, so a sliding window does not work here.",
    ],
    constraints: ["1 <= nums.length <= 20000", "-1000 <= nums[i] <= 1000", "-10000000 <= k <= 10000000"],
    fn: { name: "subarraySum", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returns: "int" },
    examples: [
      { input: [[1, 1, 1], 2], output: 2, explanation: "The two blocks of two 1s." },
      { input: [[1, 2, 3], 3], output: 2, explanation: "[1,2] and [3]." },
    ],
    tests: [
      { input: [[1], 0], output: 0 },
      { input: [[0, 0, 0], 0], output: 6 },
      { input: [[1, -1, 0], 0], output: 3 },
      { input: [[3, 4, 7, 2, -3, 1, 4, 2], 7], output: 4 },
      { input: [[-1, -1, 1], 0], output: 1 },
      { input: [[1, 2, 1, 2, 1], 3], output: 4 },
      { input: [[2], 2], output: 1 },
      { input: [[100, -100, 100, -100], 0], output: 4 },
    ],
    hints: [
      "A subarray from i to j has sum prefix[j] - prefix[i-1]. What must the earlier prefix be, if the sum is k?",
      "For each position j, you need the number of earlier positions whose prefix sum equals prefix[j] - k.",
      "Keep a hash map from prefix-sum value to how many times it has been seen. Start with {0: 1} for the empty prefix. At each element, add map[prefix - k] to the answer, then record the current prefix.",
    ],
    solution: {
      idea: [
        "Running prefix sum plus a map of how often each prefix sum has occurred. For the current prefix p, every earlier prefix equal to p - k marks the start of a subarray that sums to k, so add that count. Then increment the count for p.",
        "Seeding the map with prefix 0 seen once makes subarrays that start at index 0 count correctly. Use long long for the prefix if values could be large.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int subarraySum(vector<int>& nums, int k) {
        unordered_map<long long, int> seen;
        seen[0] = 1;
        long long prefix = 0;
        int total = 0;
        for (int x : nums) {
            prefix += x;
            auto it = seen.find(prefix - k);
            if (it != seen.end()) total += it->second;
            seen[prefix]++;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "lc-42",
    source: "leetcode",
    title: "Trapping Rain Water",
    statement: [
      "height[i] is the height of a bar of width 1. After it rains, water collects between the bars.",
      "Return the total amount of water trapped.",
    ],
    constraints: ["1 <= height.length <= 20000", "0 <= height[i] <= 100000"],
    fn: { name: "trap", params: [{ name: "height", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], output: 6 },
      { input: [[4, 2, 0, 3, 2, 5]], output: 9 },
    ],
    tests: [
      { input: [[1]], output: 0 },
      { input: [[1, 2]], output: 0 },
      { input: [[2, 0, 2]], output: 2 },
      { input: [[3, 0, 0, 2, 0, 4]], output: 10 },
      { input: [[5, 4, 1, 2]], output: 1 },
      { input: [[0, 0, 0]], output: 0 },
      { input: [[5, 2, 1, 2, 1, 5]], output: 14 },
      { input: [[1, 0, 1, 0, 1]], output: 2 },
    ],
    hints: [
      "Look at one bar. How much water sits directly above it?",
      "The water level above bar i is min(tallest bar to its left, tallest bar to its right), minus the height of bar i (and never negative).",
      "You can precompute leftMax and rightMax arrays. To use O(1) space, keep two pointers moving inward and track the max seen from each side; always advance the side with the smaller max, because that side's water level is already decided.",
    ],
    solution: {
      idea: [
        "Two pointers, left and right, with leftMax and rightMax. If height[left] < height[right], the water above left is decided by leftMax alone (the right side has something at least as tall), so add leftMax - height[left] and move left. Otherwise do the mirror on the right.",
        "Each bar is visited once. The simple version with two precomputed arrays has the same time and is easier to explain first.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int trap(vector<int>& height) {
        int l = 0, r = (int)height.size() - 1, leftMax = 0, rightMax = 0, water = 0;
        while (l < r) {
            if (height[l] < height[r]) {
                leftMax = max(leftMax, height[l]);
                water += leftMax - height[l];
                l++;
            } else {
                rightMax = max(rightMax, height[r]);
                water += rightMax - height[r];
                r--;
            }
        }
        return water;
    }
};
`,
    },
  },
  {
    id: "lc-76",
    source: "leetcode",
    title: "Minimum Window Substring",
    statement: [
      "Given strings s and t, return the shortest substring of s that contains every character of t, counting repeated characters (if t has two a's, the window needs two a's).",
      "If no such substring exists, return the empty string. In the tests the shortest window is unique.",
    ],
    constraints: ["1 <= s.length, t.length <= 100000", "s and t contain only letters", "The shortest valid window is unique"],
    fn: { name: "minWindow", params: [{ name: "s", type: "string" }, { name: "t", type: "string" }], returns: "string" },
    examples: [
      { input: ["ADOBECODEBANC", "ABC"], output: "BANC" },
      { input: ["a", "a"], output: "a" },
      { input: ["a", "aa"], output: "", explanation: "s has only one a." },
    ],
    tests: [
      { input: ["ab", "b"], output: "b" },
      { input: ["aab", "aab"], output: "aab" },
      { input: ["bbaa", "aba"], output: "baa" },
      { input: ["cabwefgewcwaefgcf", "cae"], output: "cwae" },
      { input: ["abc", "d"], output: "" },
      { input: ["xxabxcxxbaxx", "abc"], output: "abxc" },
    ],
    hints: [
      "Try to grow a window from the left to the right until it contains everything in t. Then what?",
      "Once it is valid, shrink it from the left as far as it stays valid; that gives the shortest window ending at the current right edge.",
      "Keep a count of what t still needs per character and a single number 'missing' for how many characters are still short. Add on the right (decrement need; if it was positive, missing--). When missing hits 0, move the left edge while the character leaving is not needed, then record the window.",
    ],
    solution: {
      idea: [
        "Sliding window with a need-count table. Expand right; a character that t still needed reduces 'missing'. When missing is 0, the window is valid: advance left while the leftmost character is surplus (its need count is negative), recording the best window each time it is valid.",
        "Then drop the left character (which makes the window invalid again) and continue expanding. Every index enters and leaves the window at most once.",
      ],
      complexity: "O(|s| + |t|) time, O(alphabet) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string minWindow(string s, string t) {
        vector<int> need(128, 0);
        for (char c : t) need[(unsigned char)c]++;
        int missing = (int)t.size(), left = 0, bestStart = 0, bestLen = INT_MAX;
        for (int right = 0; right < (int)s.size(); right++) {
            if (need[(unsigned char)s[right]]-- > 0) missing--;
            while (missing == 0) {
                if (right - left + 1 < bestLen) {
                    bestLen = right - left + 1;
                    bestStart = left;
                }
                if (++need[(unsigned char)s[left]] > 0) missing++;
                left++;
            }
        }
        return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
    }
};
`,
    },
  },
  {
    id: "lc-904",
    source: "leetcode",
    title: "Fruit Into Baskets",
    statement: [
      "fruits[i] is the type of fruit on tree i, in a row. You have two baskets, each holding one type of fruit without limit. Starting at any tree, you pick one fruit from each tree moving right, and you must stop when a tree has a type that does not fit in your baskets.",
      "Return the largest number of fruits you can pick.",
    ],
    constraints: ["1 <= fruits.length <= 100000", "0 <= fruits[i] < fruits.length"],
    fn: { name: "totalFruit", params: [{ name: "fruits", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[1, 2, 1]], output: 3 },
      { input: [[0, 1, 2, 2]], output: 3, explanation: "Pick 1,2,2." },
      { input: [[1, 2, 3, 2, 2]], output: 4, explanation: "Pick 2,3,2,2." },
    ],
    tests: [
      { input: [[3, 3, 3, 1, 2, 1, 1, 2, 3, 3, 4]], output: 5 },
      { input: [[1]], output: 1 },
      { input: [[1, 1]], output: 2 },
      { input: [[1, 2, 3]], output: 2 },
      { input: [[0, 0, 1, 1]], output: 4 },
      { input: [[1, 0, 3, 4, 3]], output: 3 },
      { input: [[4, 4, 4, 4]], output: 4 },
    ],
    hints: [
      "Restate it: find the longest contiguous stretch that has at most two distinct values.",
      "Use a window [left, right]. Extend right; if the window then has three distinct values, move left forward until it has two again.",
      "Track the count of each type inside the window in a small map. When a count drops to zero, remove that type so the map size equals the number of distinct types.",
    ],
    solution: {
      idea: [
        "Variable-size sliding window over the row with a map from fruit type to count in the window. After adding fruits[right], while the map has more than two types, remove fruits[left] (erase the entry at zero) and advance left. The window length is a candidate answer after each step.",
        "This is the 'longest substring with at most K distinct characters' pattern with K = 2.",
      ],
      complexity: "O(n) time, O(1) space (at most three keys in the map).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int totalFruit(vector<int>& fruits) {
        unordered_map<int, int> basket;
        int left = 0, best = 0;
        for (int right = 0; right < (int)fruits.size(); right++) {
            basket[fruits[right]]++;
            while (basket.size() > 2) {
                if (--basket[fruits[left]] == 0) basket.erase(fruits[left]);
                left++;
            }
            best = max(best, right - left + 1);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-152",
    source: "leetcode",
    title: "Maximum Product Subarray",
    statement: [
      "Given a list of integers nums, find the contiguous non-empty block with the largest product and return that product.",
      "The product of any block fits in a 32-bit integer.",
    ],
    constraints: ["1 <= nums.length <= 20000", "-10 <= nums[i] <= 10", "The product of any subarray fits in a 32-bit integer"],
    fn: { name: "maxProduct", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[2, 3, -2, 4]], output: 6 },
      { input: [[-2, 0, -1]], output: 0, explanation: "The 0 is better than any product with a negative." },
    ],
    tests: [
      { input: [[-2]], output: -2 },
      { input: [[-2, 3, -4]], output: 24 },
      { input: [[0, 2]], output: 2 },
      { input: [[2, -5, -2, -4, 3]], output: 24 },
      { input: [[-1, -1]], output: 1 },
      { input: [[3, -1, 4]], output: 4 },
      { input: [[-3, -1, -1]], output: 3 },
      { input: [[1, 2, 3]], output: 6 },
      { input: [[0, 0]], output: 0 },
    ],
    hints: [
      "With sums you only needed the best block ending here. Why is that not enough for products?",
      "A very negative product can become very positive after multiplying by another negative number. So you also need the smallest (most negative) product ending here.",
      "Keep both curMax and curMin ending at the current element. For each x, the new max is max(x, curMax * x, curMin * x) and the new min is min(x, curMax * x, curMin * x). Compute both from the old values.",
    ],
    solution: {
      idea: [
        "Track the largest and smallest product of a block ending at the current element. A negative x swaps their roles, so compute the three candidates (x alone, x times the old max, x times the old min) and take the max and min of them. The answer is the largest curMax seen.",
        "A zero resets both to 0 naturally, because x alone is 0 and the products with it are 0.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxProduct(vector<int>& nums) {
        long long curMax = nums[0], curMin = nums[0], best = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            long long x = nums[i];
            long long a = curMax * x, b = curMin * x;
            curMax = max({x, a, b});
            curMin = min({x, a, b});
            best = max(best, curMax);
        }
        return (int)best;
    }
};
`,
    },
  },
  {
    id: "lc-41",
    source: "leetcode",
    title: "First Missing Positive",
    statement: [
      "Given an unsorted list of integers, return the smallest positive integer (1, 2, 3, ...) that is not in the list.",
      "Do it in O(n) time using only O(1) extra space (you may rearrange the list).",
    ],
    constraints: ["1 <= nums.length <= 100000", "-2147483648 <= nums[i] <= 2147483647"],
    fn: { name: "firstMissingPositive", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[1, 2, 0]], output: 3 },
      { input: [[3, 4, -1, 1]], output: 2 },
      { input: [[7, 8, 9, 11, 12]], output: 1 },
    ],
    tests: [
      { input: [[1]], output: 2 },
      { input: [[2]], output: 1 },
      { input: [[1, 2, 3]], output: 4 },
      { input: [[2, 1]], output: 3 },
      { input: [[-1, -2]], output: 1 },
      { input: [[1, 1]], output: 2 },
      { input: [[0]], output: 1 },
      { input: [[3, 2, 1, 5, 4]], output: 6 },
    ],
    hints: [
      "For a list of length n, the answer is between 1 and n + 1. Why?",
      "Only values in 1..n matter. Ideally value v would sit at index v - 1.",
      "Use the list itself as a hash table: for each position, while nums[i] is in 1..n and is not already at its home position (nums[nums[i] - 1] != nums[i]), swap it home. Afterwards the first index i with nums[i] != i + 1 gives the answer i + 1.",
    ],
    solution: {
      idea: [
        "Cyclic placement: put each value v in 1..n at index v - 1 by swapping. The check nums[v - 1] != v stops infinite loops on duplicates. Each swap puts at least one value in its final place, so there are at most n swaps in total.",
        "Scan once more: the first index whose value is not index + 1 is the answer; if all are in place, the answer is n + 1.",
      ],
      complexity: "O(n) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int firstMissingPositive(vector<int>& nums) {
        int n = (int)nums.size();
        for (int i = 0; i < n; i++) {
            while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) swap(nums[i], nums[nums[i] - 1]);
        }
        for (int i = 0; i < n; i++) {
            if (nums[i] != i + 1) return i + 1;
        }
        return n + 1;
    }
};
`,
    },
  },
  {
    id: "lc-28",
    source: "leetcode",
    title: "Find the Index of the First Occurrence in a String",
    statement: [
      "Given two strings haystack and needle, return the index of the first place needle appears inside haystack, or -1 if it does not appear.",
      "The needle is never empty.",
    ],
    constraints: ["1 <= haystack.length, needle.length <= 10000", "Both strings use lowercase letters"],
    fn: { name: "strStr", params: [{ name: "haystack", type: "string" }, { name: "needle", type: "string" }], returns: "int" },
    examples: [
      { input: ["sadbutsad", "sad"], output: 0 },
      { input: ["leetcode", "leeto"], output: -1 },
    ],
    tests: [
      { input: ["hello", "ll"], output: 2 },
      { input: ["a", "a"], output: 0 },
      { input: ["abc", "c"], output: 2 },
      { input: ["mississippi", "issip"], output: 4 },
      { input: ["aaa", "aaaa"], output: -1 },
      { input: ["abc", "abcd"], output: -1 },
      { input: ["aabaaabaaac", "aabaaac"], output: 4 },
    ],
    hints: [
      "The direct way is to try every starting position and compare. How slow is that, and when?",
      "It can be O(n * m) on inputs like 'aaaa...ab' searching for 'aaab', because you restart the comparison from scratch.",
      "KMP avoids it: precompute for the needle, for each prefix, the length of its longest proper prefix that is also a suffix (the failure table). When a mismatch happens, jump back using the table instead of restarting. The simple double loop is fine at these sizes if you can explain the trade-off.",
    ],
    solution: {
      idea: [
        "Build the failure table for the needle: fail[i] is the length of the longest proper prefix of needle[0..i] that is also a suffix of it. Then scan the haystack with a pointer j into the needle: on a mismatch, set j = fail[j - 1] (not 0); on a match advance j; when j equals the needle length you have found it.",
        "Because the haystack pointer never moves backwards, the scan is linear.",
      ],
      complexity: "O(n + m) time with KMP, O(m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int strStr(string haystack, string needle) {
        int n = (int)haystack.size(), m = (int)needle.size();
        vector<int> fail(m, 0);
        for (int i = 1, k = 0; i < m; i++) {
            while (k > 0 && needle[i] != needle[k]) k = fail[k - 1];
            if (needle[i] == needle[k]) k++;
            fail[i] = k;
        }
        for (int i = 0, j = 0; i < n; i++) {
            while (j > 0 && haystack[i] != needle[j]) j = fail[j - 1];
            if (haystack[i] == needle[j]) j++;
            if (j == m) return i - m + 1;
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "lc-54",
    source: "leetcode",
    title: "Spiral Matrix",
    statement: [
      "Given a grid of numbers with m rows and n columns, return all its elements in spiral order: along the top row left to right, down the right column, back along the bottom row, up the left column, and then inward again.",
    ],
    constraints: ["1 <= m, n <= 10", "-100 <= matrix[i][j] <= 100"],
    fn: { name: "spiralOrder", params: [{ name: "matrix", type: "int[][]" }], returns: "int[]" },
    examples: [
      { input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], output: [1, 2, 3, 6, 9, 8, 7, 4, 5] },
      { input: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], output: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] },
    ],
    tests: [
      { input: [[[1]]], output: [1] },
      { input: [[[1, 2]]], output: [1, 2] },
      { input: [[[1], [2]]], output: [1, 2] },
      { input: [[[1, 2], [3, 4]]], output: [1, 2, 4, 3] },
      { input: [[[1, 2, 3]]], output: [1, 2, 3] },
      { input: [[[1], [2], [3]]], output: [1, 2, 3] },
      { input: [[[1, 2, 3], [4, 5, 6]]], output: [1, 2, 3, 6, 5, 4] },
      { input: [[[1, 2], [3, 4], [5, 6]]], output: [1, 2, 4, 6, 5, 3] },
    ],
    hints: [
      "Think of the grid as layers, like an onion. Walk the outer layer, then the layer inside it.",
      "Keep four boundaries: top, bottom, left, right. Walk the top row, then shrink top; walk the right column, shrink right; and so on.",
      "After walking the top row and right column, check that rows and columns remain (top <= bottom, left <= right) before walking the bottom row and left column. Without the checks, a single row or column gets visited twice.",
    ],
    solution: {
      idea: [
        "Four shrinking boundaries. Each round: go left to right along the top and move top down; go down the right side and move right in; if rows remain, go right to left along the bottom and move bottom up; if columns remain, go up the left side and move left in. Stop when the boundaries cross.",
        "The two conditional checks are the entire difficulty: they prevent re-reading the middle row or column when the remaining block is a single row or column.",
      ],
      complexity: "O(m * n) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        vector<int> out;
        int top = 0, bottom = (int)matrix.size() - 1, left = 0, right = (int)matrix[0].size() - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.push_back(matrix[top][c]);
            top++;
            for (int r = top; r <= bottom; r++) out.push_back(matrix[r][right]);
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) out.push_back(matrix[bottom][c]);
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) out.push_back(matrix[r][left]);
                left++;
            }
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-875",
    source: "leetcode",
    title: "Koko Eating Bananas",
    statement: [
      "There are piles of bananas, piles[i] in pile i, and h hours. Each hour you choose one pile and eat up to k bananas from it; if the pile has fewer than k, you finish it and eat nothing more that hour.",
      "Return the smallest whole number k that lets you eat all the bananas within h hours.",
    ],
    constraints: ["1 <= piles.length <= h <= 1000000000", "1 <= piles[i] <= 1000000000"],
    fn: { name: "minEatingSpeed", params: [{ name: "piles", type: "int[]" }, { name: "h", type: "int" }], returns: "int" },
    examples: [
      { input: [[3, 6, 7, 11], 8], output: 4 },
      { input: [[30, 11, 23, 4, 20], 5], output: 30 },
      { input: [[30, 11, 23, 4, 20], 6], output: 23 },
    ],
    tests: [
      { input: [[1], 1], output: 1 },
      { input: [[1000000000], 2], output: 500000000 },
      { input: [[312884470], 312884469], output: 2 },
      { input: [[5, 5, 5], 3], output: 5 },
      { input: [[2, 2], 4], output: 1 },
      { input: [[4, 9, 3], 5], output: 4 },
      { input: [[10, 10], 3], output: 10 },
    ],
    hints: [
      "If a speed k works, does a faster speed also work? What does that tell you about searching for the answer?",
      "Yes: more speed never takes more hours. So feasibility is false, false, ..., true, true, which is exactly the shape binary search needs.",
      "Binary search k between 1 and the biggest pile. To test a k, add up ceil(pile / k) over all piles and compare with h. Use 64-bit arithmetic for the hour total.",
    ],
    solution: {
      idea: [
        "Binary search on the answer. The check function hours(k) = sum of ceil(pile / k) is non-increasing in k. Search the smallest k in [1, max pile] with hours(k) <= h.",
        "The upper bound max(pile) always works (one hour per pile, and the constraints guarantee h >= number of piles). The hour total can exceed 32 bits, so sum in long long.",
      ],
      complexity: "O(n log(max pile)) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int lo = 1, hi = *max_element(piles.begin(), piles.end());
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            long long hours = 0;
            for (int p : piles) hours += (p + mid - 1) / mid;
            if (hours <= h) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }
};
`,
    },
  },
  {
    id: "lc-215",
    source: "leetcode",
    title: "Kth Largest Element in an Array",
    statement: [
      "Given a list of integers nums and a number k, return the k-th largest element in sorted order. Duplicates count separately, so in [5,5,3] the 2nd largest is 5.",
      "Try to do better than sorting the whole list.",
    ],
    constraints: ["1 <= k <= nums.length <= 100000", "-10000 <= nums[i] <= 10000"],
    fn: { name: "findKthLargest", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returns: "int" },
    examples: [
      { input: [[3, 2, 1, 5, 6, 4], 2], output: 5 },
      { input: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], output: 4 },
    ],
    tests: [
      { input: [[1], 1], output: 1 },
      { input: [[2, 1], 1], output: 2 },
      { input: [[2, 1], 2], output: 1 },
      { input: [[5, 5, 5], 2], output: 5 },
      { input: [[-1, -1], 2], output: -1 },
      { input: [[7, 6, 5, 4, 3, 2, 1], 5], output: 3 },
      { input: [[1, 2, 3, 4, 5], 1], output: 5 },
      { input: [[9, 3, 2, 4, 8], 3], output: 4 },
    ],
    hints: [
      "Sorting works in O(n log n). What do you really need to know about the other elements?",
      "Only whether they are in the top k. A min-heap of size k holds exactly the k largest seen so far, and its top is the k-th largest.",
      "Push each number; when the heap grows past k, pop the smallest. After the last number, the heap's top is the answer. Quickselect gets O(n) on average if you want to go further.",
    ],
    solution: {
      idea: [
        "Keep a min-heap capped at k elements. Each new number goes in; if the heap now has k + 1 elements, remove the smallest. The k remaining are the k largest, and the smallest of them (the top) is the k-th largest.",
        "That is O(n log k). Quickselect partitions around a pivot and recurses into only the side that holds position n - k, for O(n) average time.",
      ],
      complexity: "O(n log k) time, O(k) space with a heap.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        priority_queue<int, vector<int>, greater<int>> heap;
        for (int x : nums) {
            heap.push(x);
            if ((int)heap.size() > k) heap.pop();
        }
        return heap.top();
    }
};
`,
    },
  },
  {
    id: "lc-84",
    source: "leetcode",
    title: "Largest Rectangle in Histogram",
    statement: [
      "heights[i] is the height of a bar of width 1 in a histogram. Find the area of the largest rectangle that fits inside the histogram (its sides along the bars, its bottom on the baseline).",
    ],
    constraints: ["1 <= heights.length <= 100000", "0 <= heights[i] <= 10000"],
    fn: { name: "largestRectangleArea", params: [{ name: "heights", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[2, 1, 5, 6, 2, 3]], output: 10, explanation: "Bars 5 and 6 give height 5, width 2." },
      { input: [[2, 4]], output: 4 },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[1, 1, 1, 1]], output: 4 },
      { input: [[0]], output: 0 },
      { input: [[5, 4, 3, 2, 1]], output: 9 },
      { input: [[1, 2, 3, 4, 5]], output: 9 },
      { input: [[6, 2, 5, 4, 5, 1, 6]], output: 12 },
      { input: [[2, 1, 2]], output: 3 },
      { input: [[3, 6, 5, 7, 4, 8, 1, 0]], output: 20 },
    ],
    hints: [
      "For each bar, imagine the widest rectangle whose height is exactly that bar. How far can it extend left and right?",
      "Until it meets a bar that is shorter than it. So for each bar you need the nearest shorter bar on each side.",
      "A stack of indices with increasing heights finds those. When a new bar is shorter than the top, pop the top: its right limit is the new bar, its left limit is the new top of the stack. Add a sentinel bar of height 0 at the end to flush the stack.",
    ],
    solution: {
      idea: [
        "Monotonic stack of indices whose heights increase. For each bar i (plus a final zero-height sentinel), while the top bar is taller than heights[i], pop it as the height; its width runs from the new stack top + 1 to i - 1, and its area is height * width. Then push i.",
        "Each bar is pushed and popped once, so the pass is linear. This is the same 'nearest smaller element' idea as Daily Temperatures, mirrored.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {
        int best = 0;
        vector<int> st;
        int n = (int)heights.size();
        for (int i = 0; i <= n; i++) {
            int h = (i == n) ? 0 : heights[i];
            while (!st.empty() && heights[st.back()] > h) {
                int height = heights[st.back()];
                st.pop_back();
                int left = st.empty() ? 0 : st.back() + 1;
                best = max(best, height * (i - left));
            }
            st.push_back(i);
        }
        return best;
    }
};
`,
    },
  },
];
