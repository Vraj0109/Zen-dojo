import type { ProblemSpec } from "./types";

// Batch 8: backtracking, dynamic programming, maths and geometry. Written for this app.

export const LEETCODE_SPECS_8: ProblemSpec[] = [
  {
    id: "lc-131",
    source: "leetcode",
    title: "Palindrome Partitioning",
    statement: [
      "Cut a string into pieces so that every piece is a palindrome (reads the same forwards and backwards). Return every possible way to do it, each as the list of pieces in order.",
      "The partitions may be returned in any order.",
    ],
    constraints: ["1 <= s.length <= 16","s consists of lowercase English letters"],
    fn: {name: "partition",params: [{name: "s",type: "string"}],returns: "string[][]"},
    examples: [
      { input: ["aab"], output: [["a","a","b"],["aa","b"]] },
      { input: ["a"], output: [["a"]] },
    ],
    tests: [
      { input: ["ab"], output: [["a","b"]] },
      { input: ["aa"], output: [["a","a"],["aa"]] },
      { input: ["aaa"], output: [["a","a","a"],["a","aa"],["aa","a"],["aaa"]] },
      { input: ["abc"], output: [["a","b","c"]] },
      { input: ["aba"], output: [["a","b","a"],["aba"]] },
      { input: ["abba"], output: [["a","b","b","a"],["a","bb","a"],["abba"]] },
      { input: ["racecar"], output: [["r","a","c","e","c","a","r"],["r","a","cec","a","r"],["r","aceca","r"],["racecar"]] },
    ],
    unordered: true,
    hints: [
      "Think about the first piece of the string. How many choices are there for where it ends, and what is left after that?",
      "Only a piece that reads the same both ways is allowed. Checking this again and again is wasteful, so what could you compute once up front?",
      "Precompute which substrings are palindromes, using smaller inner substrings first. Then backtrack from a start index, cutting only at palindromic ends.",
      "Edge case: a single character is always a palindrome, and the whole string may be one piece.",
    ],
    solution: {
      idea: [
        "Backtracking over cut positions. From position start, try every end such that s[start..end] is a palindrome, push that piece, recurse from end + 1, and pop. When start reaches the end of the string, record the current list.",
      ],
      complexity: "O(n * 2^n) time in the worst case (all letters equal), O(n^2) for the palindrome table.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    string s;
    vector<vector<bool>> pal;
    vector<vector<string>> out;
    vector<string> cur;
    void go(int start) {
        if (start == (int)s.size()) { out.push_back(cur); return; }
        for (int end = start; end < (int)s.size(); end++) {
            if (!pal[start][end]) continue;
            cur.push_back(s.substr(start, end - start + 1));
            go(end + 1);
            cur.pop_back();
        }
    }
public:
    vector<vector<string>> partition(string str) {
        s = str;
        int n = (int)s.size();
        pal.assign(n, vector<bool>(n, false));
        for (int i = n - 1; i >= 0; i--)
            for (int j = i; j < n; j++)
                pal[i][j] = s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1]);
        out.clear();
        cur.clear();
        go(0);
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-137",
    source: "leetcode",
    title: "Single Number II",
    statement: [
      "Every number in the array appears exactly three times, except one number that appears once. Return the one that appears once.",
      "Aim for linear time and constant extra space, so no hash map. Think about each bit position on its own.",
    ],
    constraints: ["1 <= nums.length <= 30000","-2^31 <= nums[i] <= 2^31 - 1","every value appears three times except one value that appears once"],
    fn: {name: "singleNumber",params: [{name: "nums",type: "int[]"}],returns: "int"},
    examples: [
      { input: [[2,2,3,2]], output: 3 },
      { input: [[0,1,0,1,0,1,99]], output: 99 },
    ],
    tests: [
      { input: [[5]], output: 5 },
      { input: [[-1]], output: -1 },
      { input: [[7,7,7,8]], output: 8 },
      { input: [[-2,-2,1,-2]], output: 1 },
      { input: [[2147483647,5,5,5]], output: 2147483647 },
      { input: [[-2147483648,9,9,9]], output: -2147483648 },
      { input: [[4,4,4,6,6,6,1]], output: 1 },
    ],
    hints: [
      "Each number appears three times except one. Instead of looking at whole numbers, what could you examine for each bit position separately?",
      "For a bit that the lonely number does not have, how many times can it appear among the others? What does that say about the count modulo 3?",
      "Count the ones in each bit position and take that count modulo 3. The leftover bit tells you what the lonely number has in that position.",
      "Edge case: negative numbers have bits too. Count bits as unsigned values and convert the result back at the end.",
    ],
    solution: {
      idea: [
        "Count set bits per position modulo 3. The remainder at each bit is exactly the bit of the number that appears once. Build the answer from the 32 remainders (as unsigned, then cast back to a signed int so negatives work).",
      ],
      complexity: "O(32 n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int singleNumber(vector<int>& nums) {
        unsigned res = 0;
        for (int b = 0; b < 32; b++) {
            int cnt = 0;
            for (int x : nums) cnt += ((unsigned)x >> b) & 1u;
            if (cnt % 3) res |= (1u << b);
        }
        return (int)res;
    }
};
`,
    },
  },
  {
    id: "lc-698",
    source: "leetcode",
    title: "Partition to K Equal Sum Subsets",
    statement: [
      "Given an array of positive integers and a number k, decide whether the array can be split into k non-empty groups, every number used exactly once, so that all k groups have the same sum.",
      "Return true if such a split exists.",
    ],
    constraints: ["1 <= k <= nums.length <= 16","1 <= nums[i] <= 10000","the numbers fit easily in an int"],
    fn: {name: "canPartitionKSubsets",params: [{name: "nums",type: "int[]"},{name: "k",type: "int"}],returns: "bool"},
    examples: [
      { input: [[4,3,2,3,5,2,1],4], output: true, explanation: "(5), (1, 4), (2, 3), (2, 3) each add up to 5." },
      { input: [[1,2,3,4],3], output: false },
    ],
    tests: [
      { input: [[1],1], output: true },
      { input: [[1,1],2], output: true },
      { input: [[1,2],2], output: false },
      { input: [[2,2,2,2,3,4,5],4], output: false },
      { input: [[10,10,10,7,7,7,7,7,7,6,6,6],3], output: true },
      { input: [[1,1,1,1,2,2,2,2],4], output: true },
      { input: [[3,3,3,3],3], output: false },
    ],
    hints: [
      "If the total cannot be split into k equal parts, nothing else matters. What must each group sum to when it can?",
      "Think of filling the groups one after another. For a given set of numbers already used, what does the current group's partial sum depend on?",
      "Use a bitmask of used numbers, since the partial sum follows from the mask. Remember which masks already failed so you never explore them again.",
      "Edge case: a number larger than the target makes the answer false at once. Trying large numbers first makes failures show up sooner.",
    ],
    solution: {
      idea: [
        "Bitmask DP over subsets. dp[mask] is true if the numbers in mask can be arranged into complete groups plus one partial group. Keep sum[mask] % target as the size of the partial group; adding a number is allowed if it does not push the partial group past target.",
      ],
      complexity: "O(2^n * n) time, O(2^n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool canPartitionKSubsets(vector<int>& nums, int k) {
        int n = (int)nums.size();
        long long total = accumulate(nums.begin(), nums.end(), 0LL);
        if (total % k) return false;
        int target = (int)(total / k);
        for (int x : nums) if (x > target) return false;
        vector<int> fill(1 << n, -1);
        fill[0] = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (fill[mask] < 0) continue;
            for (int i = 0; i < n; i++) {
                if (mask & (1 << i)) continue;
                if (fill[mask] + nums[i] > target) continue;
                int nm = mask | (1 << i);
                if (fill[nm] < 0) fill[nm] = (fill[mask] + nums[i]) % target;
            }
        }
        return fill[(1 << n) - 1] == 0;
    }
};
`,
    },
  },
  {
    id: "lc-741",
    source: "leetcode",
    title: "Cherry Pickup",
    statement: [
      "A square grid has cells with 1 (a cherry), 0 (empty) or -1 (a thorn you cannot step on). You walk from the top-left to the bottom-right, moving only right or down, then walk back to the top-left moving only left or up.",
      "Each cherry can be picked once (the cell becomes empty after you pick it). Return the maximum number of cherries you can collect, or 0 if there is no path through the thorns.",
    ],
    constraints: ["1 <= n <= 50","grid[i][j] is -1, 0 or 1","grid[0][0] != -1 and grid[n-1][n-1] != -1"],
    fn: {name: "cherryPickup",params: [{name: "grid",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[0,1,-1],[1,0,-1],[1,1,1]]], output: 5 },
      { input: [[[1,1,-1],[1,-1,1],[-1,1,1]]], output: 0 },
    ],
    tests: [
      { input: [[[1]]], output: 1 },
      { input: [[[0]]], output: 0 },
      { input: [[[1,1],[1,1]]], output: 4 },
      { input: [[[0,1],[1,0]]], output: 2 },
      { input: [[[1,-1],[1,1]]], output: 3 },
      { input: [[[1,1,1],[1,1,1],[1,1,1]]], output: 8 },
      { input: [[[1,0,0,1],[0,1,1,0],[1,1,0,0],[0,0,1,1]]], output: 7 },
    ],
    hints: [
      "The walk back is a walk in reverse. Can you turn the return trip into a second walk that moves the same way as the first?",
      "If two walkers move one step at a time, where can both be after t steps? What do they share on every step?",
      "Track only the row of each walker, since the column follows from the step count. Choose the best of the four moves the two walkers could have come from.",
      "Edge case: when both walkers stand on the same cell, count its cherry only once, and never step onto a thorn.",
    ],
    solution: {
      idea: [
        "DP over diagonals. dp[t][r1][r2] is the most cherries two walkers can have collected after t steps with walker 1 in row r1 and walker 2 in row r2 (columns are t - r1 and t - r2). Add each cell's cherry, counting a shared cell once, and skip thorns. The answer is max(0, dp[2n-2][n-1][n-1]).",
      ],
      complexity: "O(n^3) time, O(n^2) space with rolling arrays.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int cherryPickup(vector<vector<int>>& grid) {
        int n = (int)grid.size();
        const int NEG = INT_MIN / 2;
        vector<vector<int>> dp(n, vector<int>(n, NEG));
        dp[0][0] = grid[0][0];
        for (int t = 1; t <= 2 * n - 2; t++) {
            vector<vector<int>> nd(n, vector<int>(n, NEG));
            for (int r1 = max(0, t - (n - 1)); r1 <= min(n - 1, t); r1++) {
                int c1 = t - r1;
                if (grid[r1][c1] == -1) continue;
                for (int r2 = max(0, t - (n - 1)); r2 <= min(n - 1, t); r2++) {
                    int c2 = t - r2;
                    if (grid[r2][c2] == -1) continue;
                    int best = NEG;
                    for (int d1 = 0; d1 < 2; d1++)
                        for (int d2 = 0; d2 < 2; d2++) {
                            int p1 = r1 - d1, p2 = r2 - d2;
                            if (p1 < 0 || p2 < 0) continue;
                            best = max(best, dp[p1][p2]);
                        }
                    if (best == NEG) continue;
                    int gain = grid[r1][c1] + (r1 != r2 ? grid[r2][c2] : 0);
                    nd[r1][r2] = best + gain;
                }
            }
            dp = nd;
        }
        return max(0, dp[n - 1][n - 1]);
    }
};
`,
    },
  },
  {
    id: "lc-10",
    source: "leetcode",
    title: "Regular Expression Matching",
    statement: [
      "Implement matching of a string s against a pattern p. In the pattern, '.' matches any single character, and '*' means zero or more of the character just before it (that character may itself be '.').",
      "The whole string must match the whole pattern, not just a part of it. Return true or false.",
    ],
    constraints: ["1 <= s.length <= 20","1 <= p.length <= 20","s has lowercase letters only","p has lowercase letters, '.' and '*' only","every '*' follows a valid character to repeat"],
    fn: {name: "isMatch",params: [{name: "s",type: "string"},{name: "p",type: "string"}],returns: "bool"},
    examples: [
      { input: ["aa","a"], output: false },
      { input: ["aa","a*"], output: true },
      { input: ["ab",".*"], output: true },
    ],
    tests: [
      { input: ["a","a"], output: true },
      { input: ["a","."], output: true },
      { input: ["aab","c*a*b"], output: true },
      { input: ["mississippi","mis*is*p*."], output: false },
      { input: ["abc","a.c"], output: true },
      { input: ["aaa","a*a"], output: true },
      { input: ["a","ab*"], output: true },
      { input: ["ab",".*c"], output: false },
    ],
    hints: [
      "Instead of matching the whole strings at once, think about matching their ends. What is the smallest question you can ask?",
      "When a pattern character is followed by a star, what are its two choices at the current position in the string?",
      "Solve the suffix questions from the back, storing each answer in a table or memo. Each state depends only on states further along.",
      "Edge case: a star can match zero characters, so a pattern made only of starred characters can match the empty string.",
    ],
    solution: {
      idea: [
        "Dynamic programming on suffixes. dp[i][j] is true if s[i..] matches p[j..]. first = i < n and (p[j] == s[i] or p[j] == '.'). If p[j+1] == '*' then dp[i][j] = dp[i][j+2] or (first and dp[i+1][j]); else dp[i][j] = first and dp[i+1][j+1].",
      ],
      complexity: "O(|s| * |p|) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isMatch(string s, string p) {
        int n = (int)s.size(), m = (int)p.size();
        vector<vector<bool>> dp(n + 2, vector<bool>(m + 2, false));
        dp[n][m] = true;
        for (int i = n; i >= 0; i--) {
            for (int j = m - 1; j >= 0; j--) {
                bool first = i < n && (p[j] == s[i] || p[j] == '.');
                if (j + 1 < m && p[j + 1] == '*') dp[i][j] = dp[i][j + 2] || (first && dp[i + 1][j]);
                else dp[i][j] = first && dp[i + 1][j + 1];
            }
        }
        return dp[0][0];
    }
};
`,
    },
  },
  {
    id: "lc-44",
    source: "leetcode",
    title: "Wildcard Matching",
    statement: [
      "Match a string s against a pattern p where '?' matches any single character and '*' matches any sequence of characters, including the empty one.",
      "The whole string must be matched. Return true if it matches.",
    ],
    constraints: ["0 <= s.length, p.length <= 2000","s has lowercase letters only","p has lowercase letters, '?' and '*' only"],
    fn: {name: "isMatch",params: [{name: "s",type: "string"},{name: "p",type: "string"}],returns: "bool"},
    examples: [
      { input: ["aa","a"], output: false },
      { input: ["aa","*"], output: true },
      { input: ["cb","?a"], output: false },
    ],
    tests: [
      { input: ["",""], output: true },
      { input: ["","*"], output: true },
      { input: ["","?"], output: false },
      { input: ["abc","a*c"], output: true },
      { input: ["abc","a?c"], output: true },
      { input: ["adceb","*a*b"], output: true },
      { input: ["acdcb","a*c?b"], output: false },
      { input: ["abcabczzzde","*abc???de*"], output: true },
    ],
    hints: [
      "This is like the regex problem, but the star stands alone and matches any run of characters. What question do you ask about prefixes of the two strings?",
      "Think of a star as matching nothing, or as swallowing one more character of the string while staying on the star.",
      "A table over prefixes solves this in quadratic time. A greedy version that backs up to the last star is often faster.",
      "Edge case: leading stars can match the empty string, and several stars in a row behave like one.",
    ],
    solution: {
      idea: [
        "Table DP. dp[0][0] = true; a leading run of stars matches the empty string. For j with p[j-1] == '*': dp[i][j] = dp[i][j-1] || dp[i-1][j]; otherwise dp[i][j] = dp[i-1][j-1] and (p[j-1] == '?' or equal to s[i-1]).",
      ],
      complexity: "O(|s| * |p|) time, O(|p|) space with a rolling row.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isMatch(string s, string p) {
        int n = (int)s.size(), m = (int)p.size();
        vector<vector<bool>> dp(n + 1, vector<bool>(m + 1, false));
        dp[0][0] = true;
        for (int j = 1; j <= m; j++) if (p[j - 1] == '*') dp[0][j] = dp[0][j - 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                if (p[j - 1] == '*') dp[i][j] = dp[i][j - 1] || dp[i - 1][j];
                else dp[i][j] = dp[i - 1][j - 1] && (p[j - 1] == '?' || p[j - 1] == s[i - 1]);
            }
        }
        return dp[n][m];
    }
};
`,
    },
  },
  {
    id: "lc-115",
    source: "leetcode",
    title: "Distinct Subsequences",
    statement: [
      "Count how many different ways the string t can be formed as a subsequence of s (deleting some characters of s without reordering the rest). Different sets of positions count as different ways, even when the resulting letters look the same.",
      "The answer fits in a 32-bit signed integer for all valid inputs.",
    ],
    constraints: ["1 <= s.length, t.length <= 1000","s and t consist of English letters","the answer fits in a 32-bit signed integer"],
    fn: {name: "numDistinct",params: [{name: "s",type: "string"},{name: "t",type: "string"}],returns: "int"},
    examples: [
      { input: ["rabbbit","rabbit"], output: 3, explanation: "Choose which one of the three b's to drop." },
      { input: ["babgbag","bag"], output: 5 },
    ],
    tests: [
      { input: ["a","a"], output: 1 },
      { input: ["a","b"], output: 0 },
      { input: ["ab","abc"], output: 0 },
      { input: ["aaa","a"], output: 3 },
      { input: ["aaa","aa"], output: 3 },
      { input: ["abcabc","abc"], output: 4 },
      { input: ["ddd","dddd"], output: 0 },
      { input: ["aabb","ab"], output: 4 },
    ],
    hints: [
      "Count the ways, not the distinct strings. When you look at the next letter of s, you may use it or skip it. How does the count for a prefix of t relate to a shorter prefix?",
      "If the current letters of s and t differ, the letter of s can only be skipped. What changes when they match?",
      "When they match, add the count from using the letter to the count from skipping it. Keep one row of counts and update it from the back so it can be reused in place.",
      "Edge case: the empty target appears in any string in exactly one way, which is the starting count.",
    ],
    solution: {
      idea: [
        "2D DP, rolled to one row. dp[j] = ways to form t[0..j) from the part of s seen so far. Iterate j downwards so that dp[j-1] still holds the previous row's value when you add it.",
      ],
      complexity: "O(|s| * |t|) time, O(|t|) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int numDistinct(string s, string t) {
        int m = (int)t.size();
        vector<unsigned long long> dp(m + 1, 0);
        dp[0] = 1;
        for (char c : s)
            for (int j = m; j >= 1; j--)
                if (t[j - 1] == c) dp[j] += dp[j - 1];
        return (int)dp[m];
    }
};
`,
    },
  },
  {
    id: "lc-132",
    source: "leetcode",
    title: "Palindrome Partitioning II",
    statement: [
      "Cut a string into pieces so that every piece is a palindrome. Return the smallest number of cuts needed.",
      "A string that is already a palindrome needs 0 cuts.",
    ],
    constraints: ["1 <= s.length <= 2000","s consists of lowercase English letters"],
    fn: {name: "minCut",params: [{name: "s",type: "string"}],returns: "int"},
    examples: [
      { input: ["aab"], output: 1, explanation: "aa | b." },
      { input: ["a"], output: 0 },
      { input: ["ab"], output: 1 },
    ],
    tests: [
      { input: ["aa"], output: 0 },
      { input: ["aba"], output: 0 },
      { input: ["abc"], output: 2 },
      { input: ["abcba"], output: 0 },
      { input: ["aabbaa"], output: 0 },
      { input: ["abcdefg"], output: 6 },
      { input: ["noonabbad"], output: 2 },
      { input: ["cdd"], output: 1 },
    ],
    hints: [
      "Instead of listing all cuts, ask for the fewest cuts needed for each prefix. How does a prefix's answer depend on shorter prefixes?",
      "If the last piece of a prefix is a palindrome, the cut count is one more than the best for the part before it. How can you know which last pieces are palindromes quickly?",
      "Precompute a palindrome table over substrings, then fill the cut counts from left to right, taking the minimum over the possible last pieces.",
      "Edge case: a prefix that is already a palindrome needs zero cuts, so check the whole prefix first.",
    ],
    solution: {
      idea: [
        "Palindrome table plus a 1D DP. isPal[i][j] = s[i] == s[j] and (j - i < 2 or isPal[i+1][j-1]). Then cut[j] = 0 if isPal[0][j], else min over i of cut[i - 1] + 1 for palindromic s[i..j].",
      ],
      complexity: "O(n^2) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minCut(string s) {
        int n = (int)s.size();
        vector<vector<bool>> pal(n, vector<bool>(n, false));
        for (int i = n - 1; i >= 0; i--)
            for (int j = i; j < n; j++)
                pal[i][j] = s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1]);
        vector<int> cut(n, 0);
        for (int j = 0; j < n; j++) {
            if (pal[0][j]) { cut[j] = 0; continue; }
            cut[j] = j;
            for (int i = 1; i <= j; i++)
                if (pal[i][j]) cut[j] = min(cut[j], cut[i - 1] + 1);
        }
        return cut[n - 1];
    }
};
`,
    },
  },
  {
    id: "lc-1000",
    source: "leetcode",
    title: "Minimum Cost to Merge Stones",
    statement: [
      "Stones lie in a row; stones[i] is the number of stones in pile i. One move merges exactly k consecutive piles into one pile, and costs the total number of stones in those k piles.",
      "Return the minimum total cost to end with a single pile, or -1 if that is impossible.",
    ],
    constraints: ["1 <= stones.length <= 30","2 <= k <= 30","1 <= stones[i] <= 100"],
    fn: {name: "mergeStones",params: [{name: "stones",type: "int[]"},{name: "k",type: "int"}],returns: "int"},
    examples: [
      { input: [[3,2,4,1],2], output: 20 },
      { input: [[3,2,4,1],3], output: -1, explanation: "Each merge removes k - 1 = 2 piles, so 4 piles never reduce to 1." },
      { input: [[3,5,1,2,6],3], output: 25 },
    ],
    tests: [
      { input: [[7],2], output: 0 },
      { input: [[7],5], output: 0 },
      { input: [[1,2],2], output: 3 },
      { input: [[1,2,3],3], output: 6 },
      { input: [[1,1,1,1,1,1,1],3], output: 13 },
      { input: [[4,4,4,4],2], output: 32 },
      { input: [[2,3,5,7,11,13],2], output: 97 },
    ],
    hints: [
      "Each merge removes a fixed number of piles. From the pile count alone, can you tell whether all piles can end as one?",
      "Think of the best cost to merge a run of consecutive piles into as few piles as possible. How can such a run be split into two smaller runs?",
      "Split a run at points that keep the left part mergeable into one pile. If the whole run can end as one pile, add the total stones in it once.",
      "Edge case: check feasibility first so impossible inputs return -1, and use prefix sums for run totals.",
    ],
    solution: {
      idea: [
        "Interval DP with prefix sums. dp[i][j] is the minimum cost to turn piles i..j into the fewest possible piles. Split into a left part ending in one pile and a right part, stepping m by k - 1. When the range can become exactly one pile, add the range sum for the last merge.",
      ],
      complexity: "O(n^3 / k) time, O(n^2) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int mergeStones(vector<int>& stones, int k) {
        int n = (int)stones.size();
        if ((n - 1) % (k - 1)) return -1;
        vector<int> pre(n + 1, 0);
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + stones[i];
        const int INF = 1e9;
        vector<vector<int>> dp(n, vector<int>(n, 0));
        for (int len = k; len <= n; len++) {
            for (int i = 0; i + len <= n; i++) {
                int j = i + len - 1;
                dp[i][j] = INF;
                for (int m = i; m < j; m += k - 1)
                    dp[i][j] = min(dp[i][j], dp[i][m] + dp[m + 1][j]);
                if ((len - 1) % (k - 1) == 0) dp[i][j] += pre[j + 1] - pre[i];
            }
        }
        return dp[0][n - 1];
    }
};
`,
    },
  },
  {
    id: "lc-123",
    source: "leetcode",
    title: "Best Time to Buy and Sell Stock III",
    statement: [
      "prices[i] is the price of a stock on day i. You may complete at most two transactions (a transaction is one buy followed by one sell), and you must sell before buying again. Return the maximum profit you can make.",
      "You may not hold more than one share at a time. If no profit is possible, return 0.",
    ],
    constraints: ["1 <= prices.length <= 100000","0 <= prices[i] <= 100000"],
    fn: {name: "maxProfit",params: [{name: "prices",type: "int[]"}],returns: "int"},
    examples: [
      { input: [[3,3,5,0,0,3,1,4]], output: 6 },
      { input: [[1,2,3,4,5]], output: 4 },
      { input: [[7,6,4,3,1]], output: 0 },
    ],
    tests: [
      { input: [[5]], output: 0 },
      { input: [[1,2]], output: 1 },
      { input: [[2,1]], output: 0 },
      { input: [[1,5,1,5,1,5]], output: 8 },
      { input: [[6,1,3,2,4,7]], output: 7 },
      { input: [[3,2,6,5,0,3]], output: 7 },
      { input: [[1,4,2,7,3,9]], output: 12 },
    ],
    hints: [
      "Picture a day-by-day walk where you hold a share or hold cash, and track how many sales are finished. How many situations do you need to describe?",
      "Track the best value for each situation as you scan the prices once. Which situation's value depends on which other one?",
      "Each day, update the holding states from the cash states before them and today's price. The answer is the best cash state after the second sale.",
      "Edge case: prices that only fall must give 0, so start the cash states at zero and the holding states at a very negative value.",
    ],
    solution: {
      idea: [
        "Constant-state DP. buy1 is the best balance holding the first share, sell1 after selling it, buy2 holding the second, sell2 after selling that. Update them in order for each price; the last one is the answer.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int buy1 = INT_MIN / 2, sell1 = 0, buy2 = INT_MIN / 2, sell2 = 0;
        for (int p : prices) {
            buy1 = max(buy1, -p);
            sell1 = max(sell1, buy1 + p);
            buy2 = max(buy2, sell1 - p);
            sell2 = max(sell2, buy2 + p);
        }
        return sell2;
    }
};
`,
    },
  },
  {
    id: "lc-188",
    source: "leetcode",
    title: "Best Time to Buy and Sell Stock IV",
    statement: [
      "prices[i] is a stock's price on day i. You may make at most k transactions (each is one buy then one sell) and may hold only one share at a time. Return the maximum profit.",
      "When k is large (at least half the number of days), every rising step can be taken, so the limit no longer matters.",
    ],
    constraints: ["1 <= k <= 100","1 <= prices.length <= 1000","0 <= prices[i] <= 1000"],
    fn: {name: "maxProfit",params: [{name: "k",type: "int"},{name: "prices",type: "int[]"}],returns: "int"},
    examples: [
      { input: [2,[2,4,1]], output: 2 },
      { input: [2,[3,2,6,5,0,3]], output: 7 },
    ],
    tests: [
      { input: [1,[5]], output: 0 },
      { input: [1,[1,5,2,8]], output: 7 },
      { input: [2,[1,5,2,8]], output: 10 },
      { input: [3,[1,5,2,8]], output: 10 },
      { input: [2,[7,6,4,3,1]], output: 0 },
      { input: [100,[1,2,3,4,5,6,7,8]], output: 7 },
      { input: [2,[1,2,4,2,5,7,2,4,9,0]], output: 13 },
    ],
    hints: [
      "Generalise the two-sale idea. How many states per transaction number do you need, and how many transactions can help at all?",
      "For each transaction count, keep the best value while holding a share and the best profit after selling. How does one transaction's state depend on the previous one?",
      "Scan the prices once and update every transaction count from the one before it. If k is at least half the number of days, every rising step can be taken, so just add them up.",
      "Edge case: k can be zero or larger than the number of days, and both must be handled without going out of range.",
    ],
    solution: {
      idea: [
        "DP over transactions with two arrays of size k + 1. Each price updates every transaction count in O(k). When k is at least n / 2 the limit is irrelevant and a greedy sum of rises is enough (and avoids a big table).",
      ],
      complexity: "O(n * k) time, O(k) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxProfit(int k, vector<int>& prices) {
        int n = (int)prices.size();
        if (k >= n / 2) {
            int total = 0;
            for (int i = 1; i < n; i++) if (prices[i] > prices[i - 1]) total += prices[i] - prices[i - 1];
            return total;
        }
        vector<int> buy(k + 1, INT_MIN / 2), sell(k + 1, 0);
        for (int p : prices) {
            for (int t = 1; t <= k; t++) {
                buy[t] = max(buy[t], sell[t - 1] - p);
                sell[t] = max(sell[t], buy[t] + p);
            }
        }
        return sell[k];
    }
};
`,
    },
  },
  {
    id: "lc-902",
    source: "leetcode",
    title: "Numbers At Most N Given Digit Set",
    statement: [
      "You have a set of digits (given as strings, in increasing order, without 0 needed). You may write numbers by using each digit from the set as many times as you like.",
      "Count how many positive integers that can be written this way are less than or equal to n.",
    ],
    constraints: ["1 <= digits.length <= 9","digits[i] is a single digit from 1 to 9, all different, sorted increasing","1 <= n <= 1000000000"],
    fn: {name: "atMostNGivenDigitSet",params: [{name: "digits",type: "string[]"},{name: "n",type: "int"}],returns: "int"},
    examples: [
      { input: [["1","3","5","7"],100], output: 20 },
      { input: [["1","4","9"],1000000000], output: 29523 },
      { input: [["7"],8], output: 1 },
    ],
    tests: [
      { input: [["5"],4], output: 0 },
      { input: [["5"],5], output: 1 },
      { input: [["1","2"],1], output: 1 },
      { input: [["1","2"],22], output: 6 },
      { input: [["1","2"],23], output: 6 },
      { input: [["3","4","8"],4], output: 2 },
      { input: [["1","2","3"],321], output: 34 },
    ],
    hints: [
      "Count the numbers by length first. For lengths shorter than n, does the bound n matter at all?",
      "For numbers with the same length as n, compare digit by digit from the left. At each position, how many allowed digits make the number smaller, and how many positions are left after it?",
      "Each smaller choice leaves a fixed number of free positions with the same number of options each, so count them with powers. Continue only while the digit of n is allowed.",
      "Edge case: if every digit of n is in the set, n itself counts, so add one at the end.",
    ],
    solution: {
      idea: [
        "Digit counting. Numbers with fewer digits than n: sum of d^len. For the same length, walk n's digits: add (count of allowed digits below n[i]) * d^(L - i - 1); continue only if n[i] is itself allowed; if all L digits were allowed, add one for n itself.",
      ],
      complexity: "O(L * d) time for L digits in n.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int atMostNGivenDigitSet(vector<string>& digits, int n) {
        string s = to_string(n);
        int L = (int)s.size(), d = (int)digits.size();
        long long total = 0, p = 1;
        for (int len = 1; len < L; len++) { p *= d; total += p; }
        for (int i = 0; i < L; i++) {
            bool same = false;
            long long below = 0;
            for (auto& dg : digits) {
                if (dg[0] < s[i]) below++;
                else if (dg[0] == s[i]) same = true;
            }
            long long rest = 1;
            for (int k = 0; k < L - i - 1; k++) rest *= d;
            total += below * rest;
            if (!same) return (int)total;
        }
        return (int)(total + 1);
    }
};
`,
    },
  },
  {
    id: "lc-357",
    source: "leetcode",
    title: "Count Numbers with Unique Digits",
    statement: [
      "Given n, count the numbers x with 0 <= x < 10^n whose digits are all different (no digit appears twice in x).",
      "For example, 11 and 100 are not counted, but 0, 7, 98 and 102 are.",
    ],
    constraints: ["0 <= n <= 8"],
    fn: {name: "countNumbersWithUniqueDigits",params: [{name: "n",type: "int"}],returns: "int"},
    examples: [
      { input: [2], output: 91, explanation: "100 numbers from 0 to 99, minus the 9 with a repeated digit (11, 22, ..., 99)." },
      { input: [0], output: 1 },
    ],
    tests: [
      { input: [1], output: 10 },
      { input: [3], output: 739 },
      { input: [4], output: 5275 },
      { input: [5], output: 32491 },
      { input: [6], output: 168571 },
      { input: [7], output: 712891 },
      { input: [8], output: 2345851 },
    ],
    hints: [
      "Group the numbers by how many digits they have. Can a number with many digits still have all of its digits different?",
      "For a k-digit number, how many choices are there for the first digit, then for each later digit? Each choice removes a digit that is already used.",
      "Multiply the counts as the length grows, then add them up over all lengths. Once you pass ten digits, no new numbers appear.",
      "Edge case: n = 0 gives only the number 0, and the single-digit numbers include 0 as well.",
    ],
    solution: {
      idea: [
        "Product formula. For length k the count is 9 * 9 * 8 * ... (k factors in total). The answer is 1 + the sum of these for k = 1..min(n, 10).",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countNumbersWithUniqueDigits(int n) {
        if (n == 0) return 1;
        int total = 10, cur = 9, avail = 9;
        for (int k = 2; k <= min(n, 10); k++) {
            cur *= avail;
            avail--;
            total += cur;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "lc-968",
    source: "leetcode",
    title: "Binary Tree Cameras",
    statement: [
      "You put cameras on some nodes of a binary tree. A camera watches its own node, its parent and its children.",
      "Return the smallest number of cameras needed so that every node is watched. A tree is given level by level, with null for a missing child: [1,null,2,3] is a root 1 with no left child, a right child 2, and 3 as the left child of 2. Every node value is 0 and only the shape matters.",
    ],
    constraints: ["1 <= number of nodes <= 1000","every node value is 0"],
    fn: {name: "minCameraCover",params: [{name: "root",type: "tree"}],returns: "int"},
    examples: [
      { input: [[0,0,null,0,0]], output: 1 },
      { input: [[0,0,null,0,null,0,null,null,0]], output: 2 },
    ],
    tests: [
      { input: [[0]], output: 1 },
      { input: [[0,0]], output: 1 },
      { input: [[0,0,0]], output: 1 },
      { input: [[0,0,0,0,0,0,0]], output: 2 },
      { input: [[0,null,0,null,0,null,0]], output: 2 },
      { input: [[0,0,null,0,null,0,null,0]], output: 2 },
      { input: [[0,0,0,null,0,null,0]], output: 2 },
    ],
    hints: [
      "Think about the leaves first. Where would a camera do the most good, on a leaf or on its parent?",
      "Each node can be covered by a child's camera, hold a camera itself, or be uncovered so far. What does a node need to know from its children to decide?",
      "Process children before the parent. An uncovered child forces a camera on the node; a child with a camera covers the node for free. Count placements and check the root at the end.",
      "Edge case: an empty tree needs no cameras, and a root still uncovered after the walk needs one more.",
    ],
    solution: {
      idea: [
        "Post-order greedy with states 0 (not covered), 1 (has a camera), 2 (covered without a camera). A null child counts as covered. If a child is 0, put a camera here (return 1); else if a child is 1, return 2; else return 0. If the root returns 0, one extra camera is needed.",
      ],
      complexity: "O(n) time, O(h) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    int cameras;
    int go(TreeNode* n) {
        if (!n) return 2;
        int l = go(n->left), r = go(n->right);
        if (l == 0 || r == 0) { cameras++; return 1; }
        if (l == 1 || r == 1) return 2;
        return 0;
    }
public:
    int minCameraCover(TreeNode* root) {
        cameras = 0;
        if (go(root) == 0) cameras++;
        return cameras;
    }
};
`,
    },
  },
  {
    id: "lc-1986",
    source: "leetcode",
    title: "Minimum Number of Work Sessions to Finish the Tasks",
    statement: [
      "tasks[i] is the number of hours task i takes. You work in sessions of at most sessionTime consecutive hours, and a task must fit completely inside one session (you cannot split it). Tasks can be done in any order.",
      "Return the minimum number of sessions needed to finish all the tasks.",
    ],
    constraints: ["1 <= tasks.length <= 14","1 <= tasks[i] <= 10","max(tasks[i]) <= sessionTime <= 15"],
    fn: {name: "minSessions",params: [{name: "tasks",type: "int[]"},{name: "sessionTime",type: "int"}],returns: "int"},
    examples: [
      { input: [[1,2,3],3], output: 2 },
      { input: [[3,1,3,1,1],8], output: 2 },
      { input: [[1,2,3,4,5],15], output: 1 },
    ],
    tests: [
      { input: [[5],5], output: 1 },
      { input: [[5,5,5],5], output: 3 },
      { input: [[1,1,1,1],2], output: 2 },
      { input: [[4,4,4,4,4,4],8], output: 3 },
      { input: [[2,3,3,4,4,4,5,6,7,10],12], output: 4 },
      { input: [[9,8,8,4,6],14], output: 3 },
      { input: [[1,2,3,4,5,6,7,8,9,10,1,2,3,4],15], output: 5 },
    ],
    hints: [
      "With at most 14 tasks, the set of finished tasks is small enough to describe completely. How could you name a set of tasks with one number?",
      "For each set of finished tasks you care about two things: how many sessions are used and how full the last one is. Which pair is better?",
      "Build up the sets one task at a time. A task fits if the current session has room; otherwise start a new session. Keep the best pair for each set.",
      "Edge case: the starting state is one open session with no hours used, so an empty set of tasks still uses that session.",
    ],
    solution: {
      idea: [
        "Bitmask DP over subsets of tasks. State value is a pair (sessions used, hours used in the last session), compared lexicographically. Adding task i to the pair: if hours + t[i] <= sessionTime, same session; else a new session with t[i] hours.",
      ],
      complexity: "O(2^n * n) time, O(2^n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minSessions(vector<int>& tasks, int sessionTime) {
        int n = (int)tasks.size();
        vector<pair<int, int>> dp(1 << n, {INT_MAX, INT_MAX});
        dp[0] = {1, 0};
        for (int mask = 0; mask < (1 << n); mask++) {
            if (dp[mask].first == INT_MAX) continue;
            for (int i = 0; i < n; i++) {
                if (mask & (1 << i)) continue;
                pair<int, int> cur = dp[mask];
                if (cur.second + tasks[i] <= sessionTime) cur.second += tasks[i];
                else { cur.first++; cur.second = tasks[i]; }
                int nm = mask | (1 << i);
                if (cur < dp[nm]) dp[nm] = cur;
            }
        }
        return dp[(1 << n) - 1].first;
    }
};
`,
    },
  },
  {
    id: "lc-135",
    source: "leetcode",
    title: "Candy",
    statement: [
      "Children stand in a line and each has a rating. You give every child at least one candy, and a child with a higher rating than a direct neighbour must get more candy than that neighbour.",
      "Return the minimum total number of candies.",
    ],
    constraints: ["1 <= ratings.length <= 20000","0 <= ratings[i] <= 20000"],
    fn: {name: "candy",params: [{name: "ratings",type: "int[]"}],returns: "int"},
    examples: [
      { input: [[1,0,2]], output: 5, explanation: "Candies 2, 1, 2." },
      { input: [[1,2,2]], output: 4, explanation: "Candies 1, 2, 1: equal ratings do not force more." },
    ],
    tests: [
      { input: [[7]], output: 1 },
      { input: [[3,3,3]], output: 3 },
      { input: [[1,2,3,4]], output: 10 },
      { input: [[4,3,2,1]], output: 10 },
      { input: [[1,3,2,2,1]], output: 7 },
      { input: [[1,2,87,87,87,2,1]], output: 13 },
      { input: [[1,3,4,5,2]], output: 11 },
      { input: [[5,1,5,1,5]], output: 8 },
    ],
    hints: [
      "Each child has a rule with the left neighbour and a rule with the right neighbour. Can you handle the two sides separately?",
      "Walk from left to right. If a child rates higher than the child on its left, what is the least candy that satisfies that side?",
      "Walk from right to left with the same idea, take the larger of the two values for each child, and add up the result.",
      "Edge case: every child starts with at least one candy, so children with equal ratings still get one each.",
    ],
    solution: {
      idea: [
        "Two passes. left[i] satisfies the left neighbour, right[i] the right neighbour; the candies at i are max(left[i], right[i]). Both rules are satisfied and nothing larger than needed is given.",
      ],
      complexity: "O(n) time, O(n) space (O(1) extra is possible with a slope-counting approach).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int candy(vector<int>& ratings) {
        int n = (int)ratings.size();
        vector<int> c(n, 1);
        for (int i = 1; i < n; i++) if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
        for (int i = n - 2; i >= 0; i--) if (ratings[i] > ratings[i + 1]) c[i] = max(c[i], c[i + 1] + 1);
        long long total = 0;
        for (int x : c) total += x;
        return (int)total;
    }
};
`,
    },
  },
  {
    id: "lc-767",
    source: "leetcode",
    title: "Reorganize String",
    statement: [
      "Rearrange the letters of a string so that no two equal letters are next to each other. If that is impossible, return an empty string.",
      "Several rearrangements may work. To make the answer unique, return the lexicographically smallest valid one (compare letter by letter, 'a' before 'b').",
    ],
    constraints: ["1 <= s.length <= 500","s consists of lowercase English letters"],
    fn: {name: "reorganizeString",params: [{name: "s",type: "string"}],returns: "string"},
    examples: [
      { input: ["aab"], output: "aba" },
      { input: ["aaab"], output: "" },
    ],
    tests: [
      { input: ["a"], output: "a" },
      { input: ["aa"], output: "" },
      { input: ["ab"], output: "ab" },
      { input: ["abc"], output: "abc" },
      { input: ["aabb"], output: "abab" },
      { input: ["vvvlo"], output: "vlvov" },
      { input: ["aaabbc"], output: "ababac" },
      { input: ["zzzyyxw"], output: "wxzyzyz" },
    ],
    hints: [
      "When is it possible at all to arrange letters so no two equal ones touch? Think about the letter that appears most often.",
      "The most frequent letter can fill at most every second position. How does that limit compare with the total length?",
      "Build the answer one position at a time, trying the smallest letters first. Accept a letter only if the rest can still be arranged, and never repeat the previous letter.",
      "Edge case: a string with only one kind of letter and length above one is impossible, so return an empty string.",
    ],
    solution: {
      idea: [
        "Greedy with a feasibility check. At each step pick the smallest letter c that differs from the previous one and leaves a feasible remainder: with R letters left, the maximum count m must satisfy m <= (R + 1) / 2, and the count of c itself (it cannot come next) must satisfy cnt[c] <= R / 2. With only 26 letters each step costs O(26 * 26).",
      ],
      complexity: "O(26 * 26 * n) time, O(26) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    bool feasible(const vector<int>& cnt, int rem, int last) {
        if (rem == 0) return true;
        int mx = 0;
        for (int c : cnt) mx = max(mx, c);
        if (mx > (rem + 1) / 2) return false;
        if (last >= 0 && cnt[last] > rem / 2) return false;
        return true;
    }
public:
    string reorganizeString(string s) {
        vector<int> cnt(26, 0);
        for (char c : s) cnt[c - 'a']++;
        int n = (int)s.size();
        if (!feasible(cnt, n, -1)) return "";
        string out;
        int last = -1;
        for (int pos = 0; pos < n; pos++) {
            bool placed = false;
            for (int c = 0; c < 26; c++) {
                if (cnt[c] == 0 || c == last) continue;
                cnt[c]--;
                if (feasible(cnt, n - pos - 1, c)) {
                    out += char('a' + c);
                    last = c;
                    placed = true;
                    break;
                }
                cnt[c]++;
            }
            if (!placed) return "";
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-204",
    source: "leetcode",
    title: "Count Primes",
    statement: [
      "Return how many prime numbers are strictly less than n.",
      "Testing each number by trial division is too slow for large n. Use the Sieve of Eratosthenes.",
    ],
    constraints: ["0 <= n <= 5000000"],
    fn: {name: "countPrimes",params: [{name: "n",type: "int"}],returns: "int"},
    examples: [
      { input: [10], output: 4, explanation: "2, 3, 5 and 7." },
      { input: [0], output: 0 },
      { input: [1], output: 0 },
    ],
    tests: [
      { input: [2], output: 0 },
      { input: [3], output: 1 },
      { input: [4], output: 2 },
      { input: [20], output: 8 },
      { input: [100], output: 25 },
      { input: [1000], output: 168 },
    ],
    stress: [
      { label: "n = 49979", make: () => [49979] },
    ],
    hints: [
      "Testing every number by division is slow. Instead of asking whether each number is prime, what could you do once you know a prime?",
      "A composite number has a smaller prime factor, so something already marked it. When you process a prime p, which of its multiples still need marking?",
      "Use a boolean array and cross out multiples of each prime, starting from its square. Stop the outer loop once the square reaches n.",
      "Edge case: n below 3 has no primes, so check this before setting up the array.",
    ],
    solution: {
      idea: [
        "Sieve of Eratosthenes. Assume everything from 2 is prime; for each p whose square is below n, cross out its multiples from p * p. The survivors are the primes below n.",
      ],
      complexity: "O(n log log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countPrimes(int n) {
        if (n < 3) return 0;
        vector<bool> comp(n, false);
        for (long long p = 2; p * p < n; p++) {
            if (comp[p]) continue;
            for (long long m = p * p; m < n; m += p) comp[m] = true;
        }
        int count = 0;
        for (int i = 2; i < n; i++) if (!comp[i]) count++;
        return count;
    }
};
`,
    },
  },
  {
    id: "lc-50",
    source: "leetcode",
    title: "Pow(x, n)",
    statement: [
      "Compute x raised to the power n, where x is a real number and n is an integer that may be negative. A negative power means one over the positive power.",
      "Use fast exponentiation: repeated squaring needs only about log n multiplications. Watch for n = -2^31, whose negation does not fit in a 32-bit int.",
    ],
    constraints: ["-100.0 < x < 100.0","-2^31 <= n <= 2^31 - 1","n is an integer","either x is not zero or n > 0","-10000 <= x^n <= 10000"],
    fn: {name: "myPow",params: [{name: "x",type: "double"},{name: "n",type: "int"}],returns: "double"},
    examples: [
      { input: [2,10], output: 1024 },
      { input: [2.1,3], output: 9.261 },
      { input: [2,-2], output: 0.25 },
    ],
    tests: [
      { input: [5,0], output: 1 },
      { input: [0,5], output: 0 },
      { input: [1,2147483647], output: 1 },
      { input: [-1,2147483647], output: -1 },
      { input: [-1,-2147483648], output: 1 },
      { input: [2,-1], output: 0.5 },
      { input: [0.5,4], output: 0.0625 },
      { input: [-2,3], output: -8 },
      { input: [1.0001,1000], output: 1.1051653926 },
    ],
    hints: [
      "Multiplying x by itself n times is too slow for a large n. Can you halve the work at each step?",
      "Think of x to the power n as squaring the base while using the bits of n. What does each bit of the exponent tell you?",
      "Walk through the bits of n from low to high: square the base at each step, and multiply it into the result when the bit is 1.",
      "Edge case: a negative n means one over the positive power, and the most negative 32-bit int cannot be negated, so store n in a 64-bit variable.",
    ],
    solution: {
      idea: [
        "Binary exponentiation. Keep base = x and e = |n| as a long long. While e > 0: if e is odd, result *= base; base *= base; e >>= 1. If n was negative, return 1 / result.",
      ],
      complexity: "O(log |n|) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    double myPow(double x, int n) {
        long long e = n;
        bool neg = e < 0;
        if (neg) e = -e;
        double result = 1.0, base = x;
        while (e > 0) {
            if (e & 1) result *= base;
            base *= base;
            e >>= 1;
        }
        return neg ? 1.0 / result : result;
    }
};
`,
    },
  },
  {
    id: "lc-372",
    source: "leetcode",
    title: "Super Pow",
    statement: [
      "Compute a^b modulo 1337, where a is a positive integer and b is a huge non-negative number given as an array of its decimal digits, most significant digit first.",
      "For example b = [1, 0] means b = 10.",
    ],
    constraints: ["1 <= a <= 2^31 - 1","1 <= b.length <= 2000","0 <= b[i] <= 9","b has no leading zeros"],
    fn: {name: "superPow",params: [{name: "a",type: "int"},{name: "b",type: "int[]"}],returns: "int"},
    examples: [
      { input: [2,[3]], output: 8 },
      { input: [2,[1,0]], output: 1024 },
      { input: [1,[4,3,3,8,5,2]], output: 1 },
    ],
    tests: [
      { input: [2,[1]], output: 2 },
      { input: [3,[2]], output: 9 },
      { input: [7,[1,0,0]], output: 574 },
      { input: [2147483647,[2,0,0,0]], output: 407 },
      { input: [1336,[9,9]], output: 1336 },
      { input: [5,[4,3,2,1]], output: 985 },
      { input: [10,[1,0,0,0,0,0,0,0,0,0]], output: 221 },
    ],
    hints: [
      "The exponent is far too big to turn into a number. What can you do with its digits one at a time?",
      "If the exponent is written as ten times a shorter exponent plus one digit, how does the power split up?",
      "Process the digits from left to right, raising the running result to the tenth power and multiplying by the base raised to the digit. Reduce modulo 1337 at each step.",
      "Edge case: reduce the base modulo 1337 first, and remember that the exponent may be given with a leading zero.",
    ],
    solution: {
      idea: [
        "Digit-by-digit exponentiation. Start with result = 1. For each digit d of b: result = pow(result, 10) * pow(a, d) mod 1337. The modular pow is the usual square-and-multiply on numbers below 1337, so nothing overflows a 64-bit integer.",
      ],
      complexity: "O(len(b) * log 10) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long pw(long long base, int e) {
        long long r = 1;
        base %= 1337;
        while (e > 0) {
            if (e & 1) r = r * base % 1337;
            base = base * base % 1337;
            e >>= 1;
        }
        return r;
    }
public:
    int superPow(int a, vector<int>& b) {
        long long result = 1;
        for (int d : b) result = pw(result, 10) * pw(a, d) % 1337;
        return (int)result;
    }
};
`,
    },
  },
  {
    id: "lc-149",
    source: "leetcode",
    title: "Max Points on a Line",
    statement: [
      "Given points on a plane with integer coordinates, return the largest number of points that lie on one straight line.",
      "Beware of vertical lines and of floating-point slopes: compare slopes as reduced fractions instead.",
    ],
    constraints: ["1 <= points.length <= 300","-10000 <= x, y <= 10000","all points are distinct"],
    fn: {name: "maxPoints",params: [{name: "points",type: "int[][]"}],returns: "int"},
    examples: [
      { input: [[[1,1],[2,2],[3,3]]], output: 3 },
      { input: [[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]], output: 4 },
    ],
    tests: [
      { input: [[[0,0]]], output: 1 },
      { input: [[[0,0],[1,1]]], output: 2 },
      { input: [[[0,0],[0,1],[0,2],[1,5]]], output: 3 },
      { input: [[[0,0],[1,0],[2,0],[3,1]]], output: 3 },
      { input: [[[0,0],[1,1],[0,1],[1,0]]], output: 2 },
      { input: [[[-10000,-10000],[10000,10000],[0,0],[1,2]]], output: 3 },
      { input: [[[2,3],[3,3],[-5,3]]], output: 3 },
    ],
    hints: [
      "Two points define a line, so ask which other points line up with a given pair. Could you fix one point and look at everything else from it?",
      "Points on the same line through the fixed point all lie in the same direction from it. How could you group them by direction?",
      "Describe each direction by its slope as a reduced pair of whole numbers, so no floating-point values are needed. Count the most common direction and add the fixed point.",
      "Edge case: a vertical line has no horizontal step, so normalise signs carefully. Inputs with at most two points are trivially on one line.",
    ],
    solution: {
      idea: [
        "For each anchor point, count the other points by reduced direction (dx / g, dy / g) with a canonical sign. The largest count + 1 is the best line through that anchor; the answer is the best over all anchors. No floating-point division is needed.",
      ],
      complexity: "O(n^2) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxPoints(vector<vector<int>>& points) {
        int n = (int)points.size();
        if (n <= 2) return n;
        int best = 1;
        for (int i = 0; i < n; i++) {
            map<pair<int, int>, int> cnt;
            for (int j = i + 1; j < n; j++) {
                int dx = points[j][0] - points[i][0], dy = points[j][1] - points[i][1];
                int g = __gcd(abs(dx), abs(dy));
                dx /= g; dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }
                best = max(best, ++cnt[{dx, dy}] + 1);
            }
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-223",
    source: "leetcode",
    title: "Rectangle Area",
    statement: [
      "Two rectangles with sides parallel to the axes are given by their bottom-left corner (ax1, ay1) and top-right corner (ax2, ay2), and likewise (bx1, by1) and (bx2, by2).",
      "Return the total area covered by the two rectangles together. Where they overlap, count the overlapping part once.",
    ],
    constraints: ["-10000 <= all coordinates <= 10000","ax1 <= ax2, ay1 <= ay2, bx1 <= bx2, by1 <= by2"],
    fn: {name: "computeArea",params: [{name: "ax1",type: "int"},{name: "ay1",type: "int"},{name: "ax2",type: "int"},{name: "ay2",type: "int"},{name: "bx1",type: "int"},{name: "by1",type: "int"},{name: "bx2",type: "int"},{name: "by2",type: "int"}],returns: "int"},
    examples: [
      { input: [-3,0,3,4,0,-1,9,2], output: 45 },
      { input: [-2,-2,2,2,-2,-2,2,2], output: 16 },
    ],
    tests: [
      { input: [0,0,1,1,2,2,3,3], output: 2 },
      { input: [0,0,2,2,1,1,3,3], output: 7 },
      { input: [0,0,4,4,1,1,2,2], output: 16 },
      { input: [0,0,2,2,2,0,4,2], output: 8 },
      { input: [-10000,-10000,10000,10000,-10000,-10000,10000,10000], output: 400000000 },
      { input: [0,0,0,0,0,0,0,0], output: 0 },
      { input: [0,0,5,1,2,-3,3,4], output: 11 },
    ],
    hints: [
      "Adding the two areas counts the overlap twice. How could you correct for that?",
      "The overlap is itself a rectangle. What are its left and right edges along the x-axis?",
      "Take the larger of the two left edges and the smaller of the two right edges, and do the same for height. If either length is negative, the overlap is zero.",
      "Edge case: rectangles that only touch along an edge have zero overlap, and the same arithmetic still works.",
    ],
    solution: {
      idea: [
        "Inclusion-exclusion. overlapW = max(0, min(ax2, bx2) - max(ax1, bx1)), overlapH likewise for y. Answer = areaA + areaB - overlapW * overlapH. The largest area is 20000 * 20000 = 4 * 10^8 each, so the sum stays near 8 * 10^8 and fits in an int.",
      ],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int computeArea(int ax1, int ay1, int ax2, int ay2, int bx1, int by1, int bx2, int by2) {
        long long a = (long long)(ax2 - ax1) * (ay2 - ay1);
        long long b = (long long)(bx2 - bx1) * (by2 - by1);
        long long w = max(0, min(ax2, bx2) - max(ax1, bx1));
        long long h = max(0, min(ay2, by2) - max(ay1, by1));
        return (int)(a + b - w * h);
    }
};
`,
    },
  },
  {
    id: "lc-327",
    source: "leetcode",
    title: "Count of Range Sum",
    statement: [
      "Count how many contiguous subarrays have a sum between lower and upper, both included. A subarray is a run of one or more neighbouring elements.",
      "The sums can exceed 32 bits, so use 64-bit arithmetic.",
    ],
    constraints: ["1 <= nums.length <= 100000","-2^31 <= nums[i] <= 2^31 - 1","-100000 <= lower <= upper <= 100000"],
    fn: {name: "countRangeSum",params: [{name: "nums",type: "int[]"},{name: "lower",type: "int"},{name: "upper",type: "int"}],returns: "int"},
    examples: [
      { input: [[-2,5,-1],-2,2], output: 3 },
      { input: [[0],0,0], output: 1 },
    ],
    tests: [
      { input: [[1],1,1], output: 1 },
      { input: [[1],2,3], output: 0 },
      { input: [[1,2,3],3,3], output: 2 },
      { input: [[0,0,0],0,0], output: 6 },
      { input: [[-1,-1,-1],-2,-1], output: 5 },
      { input: [[2147483647,-2147483648,-1,0],-1,0], output: 4 },
      { input: [[3,-2,4,-1,2],0,4], output: 10 },
    ],
    hints: [
      "A range sum is a difference of two prefix sums. Can you turn the question about ranges into a question about pairs of prefix values?",
      "For each right end, which earlier prefix values fall inside a window set by lower and upper? A plain double loop would be too slow.",
      "Use merge sort over the prefix sums. While merging two sorted halves, count the pairs that cross the middle with two moving pointers.",
      "Edge case: prefix sums can exceed 32 bits, so use 64-bit values, and remember the empty prefix at index zero is 0.",
    ],
    solution: {
      idea: [
        "Merge sort over the prefix sums. For each element of the right half, find with two pointers the range of left-half elements whose difference falls in [lower, upper]; both pointers only move forward. Add the counts, then merge. Total O(n log n).",
      ],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long lo, hi;
    long long sortCount(vector<long long>& p, vector<long long>& tmp, int l, int r) {
        if (r - l <= 1) return 0;
        int m = (l + r) / 2;
        long long res = sortCount(p, tmp, l, m) + sortCount(p, tmp, m, r);
        int a = l, b = l;
        for (int j = m; j < r; j++) {
            while (a < m && p[j] - p[a] > hi) a++;
            while (b < m && p[j] - p[b] >= lo) b++;
            res += b - a;
        }
        merge(p.begin() + l, p.begin() + m, p.begin() + m, p.begin() + r, tmp.begin() + l);
        copy(tmp.begin() + l, tmp.begin() + r, p.begin() + l);
        return res;
    }
public:
    int countRangeSum(vector<int>& nums, int lower, int upper) {
        lo = lower; hi = upper;
        int n = (int)nums.size();
        vector<long long> p(n + 1, 0), tmp(n + 1);
        for (int i = 0; i < n; i++) p[i + 1] = p[i] + nums[i];
        return (int)sortCount(p, tmp, 0, n + 1);
    }
};
`,
    },
  },
  {
    id: "lc-220",
    source: "leetcode",
    title: "Contains Duplicate III",
    statement: [
      "Return true if there are two different indices i and j such that |i - j| <= indexDiff and |nums[i] - nums[j]| <= valueDiff. Otherwise return false.",
      "In words: two numbers that are close in position and also close in value.",
    ],
    constraints: ["2 <= nums.length <= 100000","-1000000000 <= nums[i] <= 1000000000","1 <= indexDiff <= nums.length","0 <= valueDiff <= 1000000000"],
    fn: {name: "containsNearbyAlmostDuplicate",params: [{name: "nums",type: "int[]"},{name: "indexDiff",type: "int"},{name: "valueDiff",type: "int"}],returns: "bool"},
    examples: [
      { input: [[1,2,3,1],3,0], output: true },
      { input: [[1,0,1,1],1,2], output: true },
      { input: [[1,5,9,1,5,9],2,3], output: false },
    ],
    tests: [
      { input: [[1,1],1,0], output: true },
      { input: [[1,2],1,0], output: false },
      { input: [[1,2],1,1], output: true },
      { input: [[-1000000000,1000000000],2,1000000000], output: false },
      { input: [[-1000000000,1000000000],2,2000000000], output: true },
      { input: [[8,7,15,1,6,1,9,15],1,3], output: true },
      { input: [[10,100,11,9,100,10],1,1], output: false },
    ],
    hints: [
      "Only numbers close together in position matter. What does the set of recent numbers look like as you scan?",
      "For a new number, you need to know whether a number close in value sits in the window. Is there an ordered structure that finds the nearest value quickly?",
      "Keep the window in an ordered set. Find the smallest value at least x minus valueDiff, and check it is no larger than x plus valueDiff. Remove numbers that leave the window.",
      "Edge case: the number leaving the window is the one indexDiff places back, and sums of values can exceed 32 bits.",
    ],
    solution: {
      idea: [
        "Sliding window with an ordered set. Insert nums[i]; before inserting, find the smallest stored value >= nums[i] - valueDiff and check it is <= nums[i] + valueDiff (use 64-bit to avoid overflow). Remove nums[i - indexDiff] when the window is full.",
      ],
      complexity: "O(n log k) time for window size k, O(k) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool containsNearbyAlmostDuplicate(vector<int>& nums, int indexDiff, int valueDiff) {
        set<long long> window;
        for (int i = 0; i < (int)nums.size(); i++) {
            auto it = window.lower_bound((long long)nums[i] - valueDiff);
            if (it != window.end() && *it <= (long long)nums[i] + valueDiff) return true;
            window.insert(nums[i]);
            if (i >= indexDiff) window.erase(nums[i - indexDiff]);
        }
        return false;
    }
};
`,
    },
  },
  {
    id: "lc-699",
    source: "leetcode",
    title: "Falling Squares",
    statement: [
      "Squares fall one at a time onto a number line. positions[i] = [left, side] describes a square whose left edge is at x = left and whose side length is side. It falls straight down until it lands on the line or on top of squares already placed. Touching sides only (without overlapping in x) does not count as landing on a square.",
      "After each square has landed, record the height of the tallest stack so far. Return that list of heights.",
    ],
    constraints: ["1 <= positions.length <= 1000","1 <= left <= 100000000","1 <= side <= 1000000"],
    fn: {name: "fallingSquares",params: [{name: "positions",type: "int[][]"}],returns: "int[]"},
    examples: [
      { input: [[[1,2],[2,3],[6,1]]], output: [2,5,5] },
      { input: [[[100,100],[200,100]]], output: [100,100] },
    ],
    tests: [
      { input: [[[1,1]]], output: [1] },
      { input: [[[1,2],[1,2]]], output: [2,4] },
      { input: [[[1,2],[3,2]]], output: [2,2] },
      { input: [[[1,5],[2,2],[3,1]]], output: [5,7,8] },
      { input: [[[4,6],[1,2],[2,4],[5,1]]], output: [6,6,10,11] },
      { input: [[[9,7],[1,9],[3,1]]], output: [7,16,17] },
      { input: [[[1,1],[2,1],[3,1],[1,3]]], output: [1,1,1,4] },
    ],
    hints: [
      "Each square lands on top of whatever it overlaps. For a new square, which earlier squares could it touch?",
      "Only squares that overlap strictly in x matter, and the new square rests on the highest top among them. What is its own top then?",
      "With at most 1000 squares, a scan over the earlier squares is fast enough. Keep a running maximum of the height after each landing.",
      "Edge case: squares that only touch at a side do not overlap, so use strict comparisons.",
    ],
    solution: {
      idea: [
        "Brute force with intervals. Store (left, right, top) for each landed square. For a new square, find the maximum top among stored squares with left < newRight and newLeft < right, add the side, store it, and push the running maximum into the answer.",
      ],
      complexity: "O(n^2) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> fallingSquares(vector<vector<int>>& positions) {
        vector<array<int, 3>> placed;
        vector<int> ans;
        int best = 0;
        for (auto& p : positions) {
            int l = p[0], r = p[0] + p[1];
            int base = 0;
            for (auto& q : placed)
                if (l < q[1] && q[0] < r) base = max(base, q[2]);
            int top = base + p[1];
            placed.push_back({l, r, top});
            best = max(best, top);
            ans.push_back(best);
        }
        return ans;
    }
};
`,
    },
  },
];
