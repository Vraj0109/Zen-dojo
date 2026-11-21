import type { ProblemSpec } from "./types";

// Batch 4: greedy and dynamic programming. Written for this app (see problems-leetcode.ts).

export const LEETCODE_SPECS_4: ProblemSpec[] = [
  {
    id: "lc-55",
    source: "leetcode",
    title: "Jump Game",
    statement: [
      "You stand on the first position of a list nums. nums[i] is the farthest you can jump forward from position i (you may also jump less).",
      "Return true if you can reach the last position, otherwise false.",
    ],
    constraints: ["1 <= nums.length <= 10000", "0 <= nums[i] <= 100000"],
    fn: { name: "canJump", params: [{ name: "nums", type: "int[]" }], returns: "bool" },
    examples: [
      { input: [[2, 3, 1, 1, 4]], output: true, explanation: "Jump 1 step to index 1, then 3 steps to the end." },
      { input: [[3, 2, 1, 0, 4]], output: false, explanation: "Every path ends on index 3, whose jump length is 0." },
    ],
    tests: [
      { input: [[0]], output: true },
      { input: [[1, 0]], output: true },
      { input: [[0, 1]], output: false },
      { input: [[2, 0, 0]], output: true },
      { input: [[1, 1, 0, 1]], output: false },
      { input: [[5, 0, 0, 0, 0, 0]], output: true },
      { input: [[2, 5, 0, 0]], output: true },
      { input: [[1, 2, 0, 1]], output: true },
    ],
    hints: [
      "You do not need the actual path, only whether the end can be reached. What single number summarises your reach so far?",
      "The farthest position reachable so far. If you ever stand beyond it, you are stuck.",
      "Walk forward and update the farthest reach with position plus jump length. Stop with true once the reach covers the last position; return false if you pass the reach.",
    ],
    solution: {
      idea: [
        "Greedy: maintain the farthest reachable index. Every index up to it is reachable (you can always jump shorter), so scanning left to right and extending the frontier is enough. Failing happens only when the scan reaches an index past the frontier.",
        "A DP over 'can reach index i' is correct but O(n^2); the greedy answer is the same in O(n).",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool canJump(vector<int>& nums) {
        int farthest = 0, n = (int)nums.size();
        for (int i = 0; i < n; i++) {
            if (i > farthest) return false;
            farthest = max(farthest, i + nums[i]);
            if (farthest >= n - 1) return true;
        }
        return true;
    }
};
`,
    },
  },
  {
    id: "lc-45",
    source: "leetcode",
    title: "Jump Game II",
    statement: [
      "Same setup as Jump Game: nums[i] is the farthest you can jump from position i, and you start at position 0.",
      "Return the minimum number of jumps needed to reach the last position. It is guaranteed that you can reach it.",
    ],
    constraints: ["1 <= nums.length <= 10000", "0 <= nums[i] <= 1000", "The last position is always reachable"],
    fn: { name: "jump", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[2, 3, 1, 1, 4]], output: 2, explanation: "0 to 1, then 1 to 4." },
      { input: [[2, 3, 0, 1, 4]], output: 2 },
    ],
    tests: [
      { input: [[1]], output: 0 },
      { input: [[1, 2]], output: 1 },
      { input: [[1, 1, 1, 1]], output: 3 },
      { input: [[10, 1, 1, 1, 1]], output: 1 },
      { input: [[2, 1]], output: 1 },
      { input: [[1, 2, 3]], output: 2 },
      { input: [[3, 2, 1]], output: 1 },
      { input: [[1, 2, 1, 1, 1]], output: 3 },
    ],
    hints: [
      "Think in rounds. After one jump, which positions can you reach? After two?",
      "Each round covers a contiguous range of positions. The next round extends that range to the farthest point reachable from anywhere in the current one.",
      "Track the end of the current round and the farthest reach. When your scan reaches the end of the round, take another jump and set the new round's end to the farthest reach.",
    ],
    solution: {
      idea: [
        "This is breadth-first search in disguise. Each 'level' is the set of positions reachable with k jumps. Scan the list; track the farthest index reachable from anything scanned so far. When the scan reaches the end of the current level, count a jump and make the farthest index the new end.",
        "Stop the scan before the last index (n - 1), because reaching it needs no further jump from there.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int jump(vector<int>& nums) {
        int jumps = 0, curEnd = 0, farthest = 0, n = (int)nums.size();
        for (int i = 0; i < n - 1; i++) {
            farthest = max(farthest, i + nums[i]);
            if (i == curEnd) {
                jumps++;
                curEnd = farthest;
            }
        }
        return jumps;
    }
};
`,
    },
  },
  {
    id: "lc-62",
    source: "leetcode",
    title: "Unique Paths",
    statement: [
      "A robot starts at the top-left cell of a grid with m rows and n columns and wants to reach the bottom-right cell. It can only move right or down.",
      "Return the number of different paths.",
    ],
    constraints: ["1 <= m, n <= 100", "The answer fits in a 32-bit integer"],
    fn: { name: "uniquePaths", params: [{ name: "m", type: "int" }, { name: "n", type: "int" }], returns: "int" },
    examples: [
      { input: [3, 7], output: 28 },
      { input: [3, 2], output: 3, explanation: "Right,down,down; down,right,down; down,down,right." },
    ],
    tests: [
      { input: [1, 1], output: 1 },
      { input: [1, 5], output: 1 },
      { input: [2, 2], output: 2 },
      { input: [3, 3], output: 6 },
      { input: [4, 4], output: 20 },
      { input: [7, 3], output: 28 },
      { input: [10, 10], output: 48620 },
      { input: [5, 1], output: 1 },
    ],
    hints: [
      "To reach a cell, which cells could you have come from just before it?",
      "Only from above or from the left. So the number of paths to a cell is the sum of the paths to those two cells, with 1 along the edges.",
      "Keep one row of counts and update it row by row, adding the left neighbour into each cell. A direct count of which moves go down also works.",
    ],
    solution: {
      idea: [
        "Grid DP. Every cell's count is the sum of the counts of the cell above and the cell to its left. With one rolling row, dp[c] already holds the value from above and dp[c - 1] the one from the left, so dp[c] += dp[c - 1].",
        "The combinatorial answer C(m + n - 2, m - 1) is the same number; mention it to show you see both views.",
      ],
      complexity: "O(m * n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int uniquePaths(int m, int n) {
        vector<int> dp(n, 1);
        for (int r = 1; r < m; r++) {
            for (int c = 1; c < n; c++) dp[c] += dp[c - 1];
        }
        return dp[n - 1];
    }
};
`,
    },
  },
  {
    id: "lc-64",
    source: "leetcode",
    title: "Minimum Path Sum",
    statement: [
      "Given a grid of non-negative numbers, find a path from the top-left cell to the bottom-right cell, moving only right or down, that has the smallest sum of the numbers along it.",
      "Return that sum.",
    ],
    constraints: ["1 <= rows, columns <= 200", "0 <= grid[i][j] <= 200"],
    fn: { name: "minPathSum", params: [{ name: "grid", type: "int[][]" }], returns: "int" },
    examples: [
      { input: [[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], output: 7, explanation: "1 → 3 → 1 → 1 → 1." },
      { input: [[[1, 2, 3], [4, 5, 6]]], output: 12 },
    ],
    tests: [
      { input: [[[5]]], output: 5 },
      { input: [[[1, 2]]], output: 3 },
      { input: [[[1], [2]]], output: 3 },
      { input: [[[1, 1], [1, 1]]], output: 3 },
      { input: [[[1, 2, 5], [3, 2, 1]]], output: 6 },
      { input: [[[0, 0], [0, 0]]], output: 0 },
      { input: [[[9, 1, 4, 8]]], output: 22 },
    ],
    hints: [
      "The cheapest way to reach a cell must come through one of its two possible predecessors. Which one should it be?",
      "The cheaper of the cell above and the cell to the left, plus this cell's own cost. The top row and left column have only one way in.",
      "Fill the grid row by row, reusing it as the table if you may change it, or keep a single row of costs.",
    ],
    solution: {
      idea: [
        "Grid DP in place: for each cell add the cheaper of the top and left neighbours to its own value (treating a missing neighbour as infinity). The bottom-right cell then holds the answer.",
        "Because moves are only right and down, every cell's inputs are final before it is computed, so a simple double loop in reading order works.",
      ],
      complexity: "O(rows * columns) time, O(1) extra space when reusing the grid.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minPathSum(vector<vector<int>>& grid) {
        int rows = (int)grid.size(), cols = (int)grid[0].size();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (r == 0 && c == 0) continue;
                int up = r > 0 ? grid[r - 1][c] : INT_MAX;
                int left = c > 0 ? grid[r][c - 1] : INT_MAX;
                grid[r][c] += min(up, left);
            }
        }
        return grid[rows - 1][cols - 1];
    }
};
`,
    },
  },
  {
    id: "lc-1143",
    source: "leetcode",
    title: "Longest Common Subsequence",
    statement: [
      "Given two strings, return the length of their longest common subsequence: the longest sequence of characters that appears in both strings in the same order, though not necessarily next to each other.",
      "If there is none, return 0.",
    ],
    constraints: ["1 <= text1.length, text2.length <= 1000", "Both strings use lowercase letters"],
    fn: { name: "longestCommonSubsequence", params: [{ name: "text1", type: "string" }, { name: "text2", type: "string" }], returns: "int" },
    examples: [
      { input: ["abcde", "ace"], output: 3, explanation: "The subsequence ace." },
      { input: ["abc", "abc"], output: 3 },
      { input: ["abc", "def"], output: 0 },
    ],
    tests: [
      { input: ["a", "a"], output: 1 },
      { input: ["a", "b"], output: 0 },
      { input: ["bl", "yby"], output: 1 },
      { input: ["oxcpqrsvwf", "shmtulqrypy"], output: 2 },
      { input: ["abcba", "abcbcba"], output: 5 },
      { input: ["ezupkr", "ubmrapg"], output: 2 },
      { input: ["aggtab", "gxtxayb"], output: 4 },
    ],
    hints: [
      "Compare the last characters of the two strings. What follows when they match, and what follows when they differ?",
      "A match adds one to the answer for the shorter strings. A mismatch means dropping one character from either string, and you keep the better result.",
      "Fill a table where each cell is the answer for the first i and first j characters. Match: the diagonal cell plus one. Mismatch: the larger of the cell above and the cell to the left.",
    ],
    solution: {
      idea: [
        "A table over prefixes. A match extends the best answer for both shorter prefixes by one; a mismatch takes the better of ignoring the last character of either string. The answer is the bottom-right cell.",
        "Only the previous row is needed to compute the next, so memory can drop to O(min(n, m)). This table is also the starting point for Edit Distance and for printing the subsequence itself by walking back through the table.",
      ],
      complexity: "O(n * m) time, O(n * m) space (O(min) with rolling rows).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int longestCommonSubsequence(string text1, string text2) {
        int n = (int)text1.size(), m = (int)text2.size();
        vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                if (text1[i - 1] == text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[n][m];
    }
};
`,
    },
  },
  {
    id: "lc-72",
    source: "leetcode",
    title: "Edit Distance",
    statement: [
      "Given two strings word1 and word2, return the smallest number of operations needed to turn word1 into word2. In one operation you may insert a character, delete a character, or replace a character.",
    ],
    constraints: ["0 <= word1.length, word2.length <= 500", "Both strings use lowercase letters"],
    fn: { name: "minDistance", params: [{ name: "word1", type: "string" }, { name: "word2", type: "string" }], returns: "int" },
    examples: [
      { input: ["horse", "ros"], output: 3, explanation: "horse → rorse (replace h with r) → rose (delete r) → ros (delete e)." },
      { input: ["intention", "execution"], output: 5 },
    ],
    tests: [
      { input: ["", "abc"], output: 3 },
      { input: ["a", "a"], output: 0 },
      { input: ["abc", "abc"], output: 0 },
      { input: ["kitten", "sitting"], output: 3 },
      { input: ["sunday", "saturday"], output: 3 },
      { input: ["ab", "ba"], output: 2 },
      { input: ["park", "spake"], output: 3 },
      { input: ["abc", ""], output: 3 },
    ],
    hints: [
      "Compare the last characters of the two words. If they are equal, what does that cost?",
      "Nothing: only the shorter prefixes remain. If they differ, you can insert, delete or replace, and each choice leaves a smaller problem.",
      "Fill a table of prefix distances. Matching characters copy the diagonal value. Otherwise take one plus the smallest of the cell above, the cell to the left and the diagonal. The first row and column are just counts.",
    ],
    solution: {
      idea: [
        "A table of prefix pairs, just like the longest common subsequence. The first row and column are the cost of building or erasing a string from nothing. Each cell either inherits its diagonal (the characters match) or pays one operation and takes the cheapest of its three neighbours.",
        "Reading the table backwards gives the actual sequence of edits, which is a common follow-up.",
      ],
      complexity: "O(n * m) time, O(n * m) space (O(min) with rolling rows).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minDistance(string word1, string word2) {
        int n = (int)word1.size(), m = (int)word2.size();
        vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
        for (int i = 0; i <= n; i++) dp[i][0] = i;
        for (int j = 0; j <= m; j++) dp[0][j] = j;
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                if (word1[i - 1] == word2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
            }
        }
        return dp[n][m];
    }
};
`,
    },
  },
  {
    id: "lc-300",
    source: "leetcode",
    title: "Longest Increasing Subsequence",
    statement: [
      "Given a list of integers nums, return the length of the longest strictly increasing subsequence: values taken in their original order, not necessarily next to each other, each larger than the one before.",
    ],
    constraints: ["1 <= nums.length <= 2500", "-10000 <= nums[i] <= 10000"],
    fn: { name: "lengthOfLIS", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[10, 9, 2, 5, 3, 7, 101, 18]], output: 4, explanation: "For example 2, 3, 7, 101." },
      { input: [[0, 1, 0, 3, 2, 3]], output: 4 },
      { input: [[7, 7, 7, 7]], output: 1 },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[1, 2, 3, 4]], output: 4 },
      { input: [[4, 3, 2, 1]], output: 1 },
      { input: [[1, 3, 6, 7, 9, 4, 10, 5, 6]], output: 6 },
      { input: [[3, 5, 6, 2, 5, 4, 19, 5, 6, 7, 12]], output: 6 },
      { input: [[2, 2, 3]], output: 2 },
      { input: [[5, 1, 5, 2, 5, 3]], output: 3 },
    ],
    hints: [
      "Let the best value at a position be the longest increasing run that ends there. How could you compute it from earlier positions?",
      "Compare with every earlier smaller value and extend the best run found there. That works, but a faster method exists.",
      "Keep a list where each entry is the smallest possible last value of a run of each length. For each number, binary search for its place in the list and replace that entry, or append. The list length is the answer.",
    ],
    solution: {
      idea: [
        "Patience-sorting trick: tails stays sorted. A new number either extends the longest subsequence (it is larger than every tail, so append) or lowers the tail of some length (it replaces the first tail that is not smaller than it). The array is not itself a valid subsequence, but its length always equals the best length so far.",
        "Use lower_bound (first element >= x) so that equal values do not extend a subsequence, because the subsequence must be strictly increasing.",
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;
        for (int x : nums) {
            auto it = lower_bound(tails.begin(), tails.end(), x);
            if (it == tails.end()) tails.push_back(x);
            else *it = x;
        }
        return (int)tails.size();
    }
};
`,
    },
  },
  {
    id: "lc-416",
    source: "leetcode",
    title: "Partition Equal Subset Sum",
    statement: [
      "Given a list of positive integers, decide whether it can be split into two groups whose sums are equal. Every number goes into exactly one group.",
    ],
    constraints: ["1 <= nums.length <= 200", "1 <= nums[i] <= 100"],
    fn: { name: "canPartition", params: [{ name: "nums", type: "int[]" }], returns: "bool" },
    examples: [
      { input: [[1, 5, 11, 5]], output: true, explanation: "1 + 5 + 5 = 11." },
      { input: [[1, 2, 3, 5]], output: false },
    ],
    tests: [
      { input: [[1, 1]], output: true },
      { input: [[1]], output: false },
      { input: [[2, 2, 3, 5]], output: false },
      { input: [[3, 3, 3, 4, 5]], output: true },
      { input: [[100]], output: false },
      { input: [[1, 2, 5]], output: false },
      { input: [[14, 9, 8, 4, 3, 2]], output: true },
      { input: [[1, 1, 1, 1, 1, 1, 1]], output: false },
    ],
    hints: [
      "When can two equal halves be made at all? Look at the total first.",
      "The total must be even, and you need a group that adds up to exactly half the total. The rest then makes the other half.",
      "Build a table of which sums are reachable. For each number, go down from the target to that number and mark a sum as reachable if the sum minus the number is reachable. Going downward stops any number being reused.",
    ],
    solution: {
      idea: [
        "0/1 knapsack feasibility. Maintain a boolean array of reachable sums up to total / 2. For each number, process sums from high to low so that the updates for this number do not feed each other (that would use the number several times).",
        "A bitset makes it very fast: reach |= reach << x. The answer is reach[total / 2].",
      ],
      complexity: "O(n * total) time, O(total) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2 != 0) return false;
        int target = total / 2;
        vector<char> reach(target + 1, 0);
        reach[0] = 1;
        for (int x : nums) {
            for (int s = target; s >= x; s--) {
                if (reach[s - x]) reach[s] = 1;
            }
        }
        return reach[target];
    }
};
`,
    },
  },
  {
    id: "lc-518",
    source: "leetcode",
    title: "Coin Change II",
    statement: [
      "You have an unlimited supply of coins of the given values. Return the number of different combinations of coins that add up to exactly the amount. If it cannot be made, return 0. An amount of 0 has exactly one combination: no coins.",
      "Order does not matter: 2 + 1 and 1 + 2 are the same combination.",
    ],
    constraints: ["1 <= coins.length <= 300", "1 <= coins[i] <= 5000", "0 <= amount <= 5000", "The answer fits in a 32-bit integer"],
    fn: { name: "change", params: [{ name: "amount", type: "int" }, { name: "coins", type: "int[]" }], returns: "int" },
    examples: [
      { input: [5, [1, 2, 5]], output: 4, explanation: "5; 2+2+1; 2+1+1+1; 1+1+1+1+1." },
      { input: [3, [2]], output: 0 },
      { input: [10, [10]], output: 1 },
    ],
    tests: [
      { input: [0, [7]], output: 1 },
      { input: [4, [1, 2, 3]], output: 4 },
      { input: [5, [5]], output: 1 },
      { input: [6, [1, 2]], output: 4 },
      { input: [7, [2, 4]], output: 0 },
      { input: [10, [2, 5, 3, 6]], output: 5 },
      { input: [8, [3, 5]], output: 1 },
    ],
    hints: [
      "This counts ways, not coins, and the order of the coins must not matter. How do you avoid counting 2 then 1 and 1 then 2 as two different ways?",
      "Decide coin by coin: handle all uses of one coin before moving to the next. That fixes the order, so each combination is counted once.",
      "Keep a table of ways, starting with one way for amount zero. For each coin in turn, go upward through the amounts and add the ways for the amount minus that coin.",
    ],
    solution: {
      idea: [
        "Unbounded knapsack counting. Process one coin type at a time and let it contribute to every amount it can reach, using ways[a - c] (which already includes uses of this same coin). Because each coin type is fully handled before the next, each combination is counted once, in a fixed coin order.",
        "Swap the two loops and you would count ordered sequences instead, which gives a larger number.",
      ],
      complexity: "O(amount * coins) time, O(amount) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int change(int amount, vector<int>& coins) {
        vector<unsigned long long> ways(amount + 1, 0);
        ways[0] = 1;
        for (int c : coins) {
            for (int a = c; a <= amount; a++) ways[a] += ways[a - c];
        }
        return (int)ways[amount];
    }
};
`,
    },
  },
  {
    id: "lc-122",
    source: "leetcode",
    title: "Best Time to Buy and Sell Stock II",
    statement: [
      "prices[i] is a stock's price on day i. You may buy and sell as many times as you like, but you can hold at most one share at a time (sell before you buy again; you may buy and sell on the same day).",
      "Return the largest total profit.",
    ],
    constraints: ["1 <= prices.length <= 30000", "0 <= prices[i] <= 10000"],
    fn: { name: "maxProfit", params: [{ name: "prices", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[7, 1, 5, 3, 6, 4]], output: 7, explanation: "Buy at 1, sell at 5 (4). Buy at 3, sell at 6 (3)." },
      { input: [[1, 2, 3, 4, 5]], output: 4 },
      { input: [[7, 6, 4, 3, 1]], output: 0 },
    ],
    tests: [
      { input: [[1]], output: 0 },
      { input: [[2, 1, 2, 0, 1]], output: 2 },
      { input: [[1, 2, 1, 2]], output: 2 },
      { input: [[3, 3, 5, 0, 0, 3, 1, 4]], output: 8 },
      { input: [[6, 1, 3, 2, 4, 7]], output: 7 },
      { input: [[5, 5]], output: 0 },
      { input: [[1, 10, 1, 10]], output: 18 },
    ],
    hints: [
      "With unlimited trades, what is the profit of a rising stretch of prices, such as 1, 3, 6?",
      "Buying at the start and selling at the end gives the same total as adding up the small rises between each pair of days.",
      "Add up every day-over-day increase. Falling days add nothing, because you simply do not hold the stock on those days.",
    ],
    solution: {
      idea: [
        "Greedy: capture every upward step. Any profitable plan can be split into one-day trades without losing profit, and a one-day trade is only worth making when the price rises.",
        "The sum of positive differences equals the profit of buying at every valley and selling at the next peak.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int profit = 0;
        for (size_t i = 1; i < prices.size(); i++) {
            if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];
        }
        return profit;
    }
};
`,
    },
  },
  {
    id: "lc-91",
    source: "leetcode",
    title: "Decode Ways",
    statement: [
      "A message of capital letters is encoded as digits using A = 1, B = 2, ..., Z = 26. Given a string of digits, return the number of different ways to decode it back into letters.",
      "A digit string with an invalid group (for example a leading 0, such as 06) cannot be decoded in that way. If the whole string cannot be decoded, return 0.",
    ],
    constraints: ["1 <= s.length <= 100", "s contains only digits", "The answer fits in a 32-bit integer"],
    fn: { name: "numDecodings", params: [{ name: "s", type: "string" }], returns: "int" },
    examples: [
      { input: ["12"], output: 2, explanation: "AB (1 2) or L (12)." },
      { input: ["226"], output: 3, explanation: "BZ (2 26), VF (22 6), BBF (2 2 6)." },
      { input: ["06"], output: 0, explanation: "06 is not a valid code." },
    ],
    tests: [
      { input: ["0"], output: 0 },
      { input: ["1"], output: 1 },
      { input: ["10"], output: 1 },
      { input: ["27"], output: 1 },
      { input: ["11106"], output: 2 },
      { input: ["2101"], output: 1 },
      { input: ["123123"], output: 9 },
      { input: ["100"], output: 0 },
      { input: ["1201234"], output: 3 },
    ],
    hints: [
      "Decode from the left. At each position, how many ways can the next code be formed?",
      "One digit from 1 to 9, or two digits from 10 to 26. A zero can only be part of 10 or 20, and a leading zero is invalid.",
      "Track the number of ways for the last two prefixes. Add the previous count when the single digit is valid, and add the count from two back when the pair is valid. Two variables are enough.",
    ],
    solution: {
      idea: [
        "A Fibonacci-like DP with validity checks. For each prefix length i, add the ways for the prefix without the last digit if that digit is 1 to 9, and the ways for the prefix without the last two digits if those two digits are between 10 and 26.",
        "A zero that is not preceded by 1 or 2 contributes nothing from either rule, and the count for that prefix (and every later one that depends on it) becomes 0 as expected. Two rolling variables are enough.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int numDecodings(string s) {
        int n = (int)s.size();
        long long prev2 = 1, prev1 = (s[0] == '0') ? 0 : 1; // ways for 0 and 1 characters
        for (int i = 2; i <= n; i++) {
            long long cur = 0;
            if (s[i - 1] != '0') cur += prev1;
            int two = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
            if (two >= 10 && two <= 26) cur += prev2;
            prev2 = prev1;
            prev1 = cur;
        }
        return (int)prev1;
    }
};
`,
    },
  },
  {
    id: "lc-134",
    source: "leetcode",
    title: "Gas Station",
    statement: [
      "There are stations around a circular road. gas[i] is the fuel you get at station i, and cost[i] is the fuel needed to drive from station i to the next one. Your tank starts empty and has no size limit.",
      "Return the index of the station where you can start and complete one full lap in order, or -1 if it is impossible. If a solution exists it is unique.",
    ],
    constraints: ["1 <= n <= 100000", "0 <= gas[i], cost[i] <= 10000", "If an answer exists it is unique"],
    fn: { name: "canCompleteCircuit", params: [{ name: "gas", type: "int[]" }, { name: "cost", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], output: 3 },
      { input: [[2, 3, 4], [3, 4, 3]], output: -1 },
    ],
    tests: [
      { input: [[5], [4]], output: 0 },
      { input: [[5], [6]], output: -1 },
      { input: [[3, 1, 1], [1, 2, 2]], output: 0 },
      { input: [[1, 2], [2, 1]], output: 1 },
      { input: [[2, 0, 0, 5], [1, 2, 3, 1]], output: 3 },
      { input: [[4, 5, 2, 6, 5, 3], [3, 2, 7, 3, 2, 9]], output: -1 },
      { input: [[0, 0, 0], [0, 0, 0]], output: 0 },
    ],
    hints: [
      "If the total fuel is less than the total cost, no start can work. What can you conclude if the fuel is at least that much?",
      "A start exists. Begin at station 0 and drive; the first point where the tank runs dry tells you which starts can be skipped.",
      "When the tank goes negative at station j, no station from the start up to j can work. Restart at j+1 with an empty tank, and track the overall balance to decide at the end.",
    ],
    solution: {
      idea: [
        "One pass. Keep the total (gas minus cost over all stations) and the current tank since the candidate start. When the tank goes negative after station i, the candidate and every station between it and i fail, so set the candidate to i + 1 and reset the tank.",
        "At the end, if the total is negative return -1, otherwise the candidate is the answer. The unique-answer guarantee means this single candidate is the only possible one.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
        int total = 0, tank = 0, start = 0;
        for (int i = 0; i < (int)gas.size(); i++) {
            int diff = gas[i] - cost[i];
            total += diff;
            tank += diff;
            if (tank < 0) {
                start = i + 1;
                tank = 0;
            }
        }
        return total < 0 ? -1 : start;
    }
};
`,
    },
  },
];
