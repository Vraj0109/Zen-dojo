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
      "Choose where the first piece ends, then solve the rest of the string the same way.",
      "Only continue when the piece you just cut is a palindrome. That prunes most of the search.",
      "Backtrack with a start index and a current list of pieces. Precompute isPal[i][j] with a table so each check is O(1).",
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
      "Add up the values of one bit across all numbers. What is that sum modulo 3 for the lonely number's bit?",
      "For each of the 32 bits, count how many numbers have it set. Numbers that appear three times contribute a multiple of 3, so the remainder is the single number's bit.",
      "Without counting per bit, two variables ones and twos can act as a base-3 counter per bit, updated with a few bit operations.",
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
      "If the total is not divisible by k, the answer is immediately false. Otherwise each group must sum to total / k.",
      "Fill the groups one at a time. Each number is either already used or goes into the current group.",
      "Use a bitmask of used numbers and the current group's sum; memoise failed masks. Sorting in descending order makes the search prune faster.",
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
      "The way back is the same as another walk from the top-left to the bottom-right. So think of two people walking at the same time.",
      "After t steps both people are on the anti-diagonal r + c = t. State: (t, row of person 1, row of person 2).",
      "If both stand on the same cell, count its cherry once. Take the best of the four ways the two people could have arrived (each moved right or down).",
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
      "Define match(i, j): does s[i..] match p[j..]?",
      "If p[j + 1] is '*', either skip the starred part (match(i, j + 2)) or, when s[i] fits p[j], consume one character and stay on the star (match(i + 1, j)).",
      "Otherwise the next characters must fit one to one. Memoise on (i, j) or fill a table from the back.",
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
      "Like regular expressions, but the star stands alone and matches anything.",
      "dp[i][j]: do the first i characters of s match the first j of p? A '*' is either empty (dp[i][j-1]) or swallows one more character (dp[i-1][j]).",
      "A greedy two-pointer version remembers the last star and how far it has consumed, and backs up to it on a mismatch: O(|s| * |p|) worst case but usually fast.",
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
      "Let f(i, j) be the number of ways the first j letters of t appear in the first i letters of s.",
      "If s[i-1] != t[j-1], the letter cannot be used: f(i, j) = f(i-1, j).",
      "If they are equal you may use it or skip it: f(i, j) = f(i-1, j-1) + f(i-1, j). The base cases are f(i, 0) = 1.",
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
      "Let cut[i] be the fewest cuts for the first i characters.",
      "cut[i] = min over j < i of cut[j] + 1 where s[j..i-1] is a palindrome (or 0 if the whole prefix is a palindrome).",
      "You need fast palindrome checks: precompute isPal[j][i] with a DP, or expand around every centre and update cut[] from there.",
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
      "Each merge removes k - 1 piles. When is it possible at all? Check (n - 1) % (k - 1).",
      "Interval DP: dp[i][j] is the best cost to merge piles i..j as far as possible; the result of the best split gives piles that can still be merged.",
      "dp[i][j] = min over split points m (stepping by k - 1) of dp[i][m] + dp[m+1][j]. If (j - i) % (k - 1) == 0, the whole range collapses to one pile for an extra sum(i..j).",
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
      "Think of four states: after the first buy, after the first sell, after the second buy, after the second sell.",
      "Keep the best profit (or best balance) for each state while scanning the prices once.",
      "buy1 = max(buy1, -p); sell1 = max(sell1, buy1 + p); buy2 = max(buy2, sell1 - p); sell2 = max(sell2, buy2 + p). The answer is sell2.",
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
      "Generalise the two-transaction solution: keep a pair of states for each transaction number.",
      "buy[t] is the best balance while holding during transaction t, sell[t] the best balance after finishing it.",
      "For each price and each t from 1 to k: buy[t] = max(buy[t], sell[t-1] - p); sell[t] = max(sell[t], buy[t] + p). If k >= n / 2, just add up all positive differences.",
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
      "First count all numbers that are shorter than n: with d digits available, there are d^len of each length len.",
      "Then count the numbers with the same length as n and at most n, digit by digit from the left.",
      "At each position count the allowed digits smaller than n's digit (each gives d^(remaining) numbers). If n's digit itself is allowed, move on to the next position; otherwise stop. Reaching the end means n itself is buildable: add 1.",
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
      "Count by length: how many k-digit numbers have all distinct digits?",
      "The first digit has 9 choices (1 to 9), the second has 9 (0 to 9 except the first), the third 8, and so on.",
      "Add up the counts for lengths 1 to n, plus 1 for the number 0. For n above 10 nothing new appears, because digits would have to repeat.",
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
      "Decide greedily from the leaves up. A leaf should not hold a camera; its parent should.",
      "Give each node one of three states: covered by a camera below, has a camera itself, or not covered yet.",
      "A node must get a camera if any child is not covered. A node is covered for free if some child has a camera. Count cameras as you place them; if the root ends up uncovered, add one more.",
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
      "With at most 14 tasks you can describe the set of finished tasks as a bitmask.",
      "dp[mask] is the minimum number of sessions to do exactly the tasks in mask, and among those the least time used in the last session.",
      "From a mask add one more task: if it fits in the current session, add its hours; otherwise start a new session. Keep the better pair (sessions, time in last session).",
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
      "Each child has two constraints: one from the left neighbour and one from the right neighbour.",
      "Do a left-to-right pass: if a child rates higher than the one on the left, give one more than that child; otherwise 1.",
      "Then a right-to-left pass: if a child rates higher than the one on the right, make sure it has at least one more than that child (take the max with the first pass). Sum the result.",
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
      "When is it possible at all? Look at the most frequent letter: it can fill at most every second position.",
      "It is possible exactly when the highest count is at most (n + 1) / 2.",
      "To find the smallest answer, build it position by position: try letters from 'a' up, skip the previous letter, and accept a letter only if the rest can still be arranged (the rest's highest count must not exceed what fits, and the last letter placed cannot be reused at the start).",
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
      { input: [49979], output: 5130 },
    ],
    hints: [
      "A number is composite if it is a multiple of a smaller prime.",
      "Keep a boolean array. For each prime p, mark p * p, p * p + p, p * p + 2p, ... as not prime.",
      "You only need to start crossing out from p * p, and only for p with p * p < n. Then count the unmarked numbers from 2 up.",
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
      "x^n = (x^(n/2))^2 when n is even, and x * (x^((n-1)/2))^2 when n is odd.",
      "Do it iteratively: square the base each step and multiply it into the result whenever the current bit of n is 1.",
      "For negative n, compute with |n| and invert at the end. Use a 64-bit variable for n so that -2^31 can be negated.",
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
      "b is far too big to turn into a number. Process it one digit at a time.",
      "If b = 10 * b' + d, then a^b = (a^b')^10 * a^d.",
      "Walk the digits: result = (result^10 mod 1337) * (a^d mod 1337) mod 1337, with a small modular power function. Reduce a modulo 1337 first.",
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
      "Two points define a line. Fix one point and look at all the others.",
      "Group the other points by the direction (dx, dy) from the fixed point. Points with the same direction are on the same line through it.",
      "Normalise each direction: divide dx and dy by their gcd and fix the sign (for example make dx positive). Use a map from the pair to a count, and take the largest group plus 1.",
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
      "Total = area of A + area of B - area of the overlap.",
      "The overlap, if there is one, is itself a rectangle. Its width is min(ax2, bx2) - max(ax1, bx1).",
      "If the width or the height is zero or negative the rectangles do not overlap, so use max(0, width) * max(0, height).",
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
      "Use prefix sums P. The sum of a subarray (i, j] is P[j] - P[i], and you want lower <= P[j] - P[i] <= upper.",
      "For each j count the earlier prefixes P[i] in [P[j] - upper, P[j] - lower]. A plain double loop is O(n^2).",
      "Use merge sort on the prefix sums: before merging two sorted halves, count pairs (i in left, j in right) with two moving pointers. A Fenwick tree over compressed prefix sums also works.",
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
      "Only the last indexDiff numbers matter at any moment: a sliding window.",
      "For the new number x you need to know whether the window holds a value in [x - valueDiff, x + valueDiff].",
      "An ordered set answers it: lower_bound(x - valueDiff) gives the smallest candidate; check that it is at most x + valueDiff. Or use buckets of width valueDiff + 1 so each bucket holds at most one value.",
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
      "Keep every square already placed with its x-range and the height of its top.",
      "A new square [l, l + s) lands on the highest top among the squares whose x-range overlaps it strictly.",
      "With 1000 squares an O(n^2) scan is enough: new top = s + max(top of overlapping squares), then update the running maximum. A segment tree with range assignment is the way to scale it.",
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
