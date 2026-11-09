import type { ProblemSpec } from "./types";

// Algorithm reference problems from cp-algorithms.com and similar sources.
// Statements, examples, test cases, and solutions are written for this app.

export const OTHER_SPECS: ProblemSpec[] = [
  {
    id: "c-z-function",
    source: "other",
    url: "https://cp-algorithms.com/string/z-function.html",
    title: "Z-function",
    statement: [
      "Given a string s of length n, compute its Z-array.",
      "The Z-array is an array of length n where the i-th element z[i] is the length of the longest common prefix between s and the suffix of s starting at index i (that is, s[i..n-1]).",
      "By definition, z[0] is set to 0.",
    ],
    constraints: [
      "1 <= s.length <= 100000",
      "s consists only of lowercase English letters",
    ],
    fn: { name: "zFunction", params: [{ name: "s", type: "string" }], returns: "int[]" },
    examples: [
      {
        input: ["aaaaa"],
        output: [0, 4, 3, 2, 1],
        explanation: "For suffix starting at index 1 ('aaaa'), it matches 4 characters of the prefix.",
      },
      {
        input: ["aaabaab"],
        output: [0, 2, 1, 0, 2, 1, 0],
      },
      {
        input: ["abacaba"],
        output: [0, 0, 1, 0, 3, 0, 1],
      },
    ],
    tests: [
      { input: ["a"], output: [0] },
      { input: ["abcdef"], output: [0, 0, 0, 0, 0, 0] },
      { input: ["ababab"], output: [0, 0, 4, 0, 2, 0] },
      { input: ["aab"], output: [0, 1, 0] },
      { input: ["baaaaa"], output: [0, 0, 0, 0, 0, 0] },
      { input: ["aaaaab"], output: [0, 4, 3, 2, 1, 0] },
      { input: ["abcdeabcde"], output: [0, 0, 0, 0, 0, 5, 0, 0, 0, 0] },
      { input: ["zzzzz"], output: [0, 4, 3, 2, 1] },
    ],
    hints: [
      "A naive comparison takes O(n^2) time. Maintain a match segment (Z-box) [l, r) that extends furthest to the right, where r = max(j + z[j]).",
      "For position i, if i < r, initialize z[i] with min(r - i, z[i - l]) using previously computed values inside the current Z-box.",
      "After initializing z[i], expand it while characters s[z[i]] and s[i + z[i]] match. Whenever i + z[i] exceeds r, update l = i and r = i + z[i].",
    ],
    solution: {
      idea: [
        "Maintain the segment [l, r) that has the rightmost boundary r = max(j + z[j]) reached so far.",
        "For each position i from 1 to n - 1, if i is inside the segment (i < r), copy z[i - l] bounded by r - i.",
        "Extend the match greedily past r, then update [l, r) if the new match extends beyond r. Every character is matched at most once beyond r, achieving O(n) total time.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> zFunction(string s) {
        int n = s.size();
        vector<int> z(n, 0);
        int l = 0, r = 0;
        for (int i = 1; i < n; i++) {
            if (i < r) {
                z[i] = min(r - i, z[i - l]);
            }
            while (i + z[i] < n && s[z[i]] == s[i + z[i]]) {
                z[i]++;
            }
            if (i + z[i] > r) {
                l = i;
                r = i + z[i];
            }
        }
        return z;
    }
};
`,
    },
  },
  {
    id: "c-rabin-karp",
    source: "other",
    url: "https://cp-algorithms.com/string/rabin-karp.html",
    title: "Rabin-Karp Algorithm",
    statement: [
      "Given a pattern string and a text string, find all occurrences of pattern in text.",
      "Return a list of all 0-based starting indices where pattern appears in text, in increasing order.",
      "If pattern does not appear in text or pattern is longer than text, return an empty list.",
    ],
    constraints: [
      "1 <= pattern.length <= 100000",
      "1 <= text.length <= 100000",
      "pattern and text consist only of lowercase English letters",
    ],
    fn: {
      name: "rabinKarp",
      params: [
        { name: "pattern", type: "string" },
        { name: "text", type: "string" },
      ],
      returns: "int[]",
    },
    examples: [
      {
        input: ["aba", "abacaba"],
        output: [0, 4],
        explanation: "pattern 'aba' occurs at index 0 ('aba'caba) and index 4 (abac'aba').",
      },
      {
        input: ["a", "aaaa"],
        output: [0, 1, 2, 3],
      },
      {
        input: ["xyz", "abcdef"],
        output: [],
      },
    ],
    tests: [
      { input: ["a", "a"], output: [0] },
      { input: ["b", "a"], output: [] },
      { input: ["aa", "aaaaa"], output: [0, 1, 2, 3] },
      { input: ["abc", "abc"], output: [0] },
      { input: ["longerpattern", "short"], output: [] },
      { input: ["ab", "cabdabeab"], output: [1, 4, 7] },
      { input: ["needle", "findthehaystackneedleinneedleneedles"], output: [15, 23, 29] },
      { input: ["ba", "abacaba"], output: [1, 5] },
    ],
    hints: [
      "Compute a polynomial rolling hash for pattern and compare it against the hashes of all substrings of text with length equal to pattern.length.",
      "With base p and modulus m, the hash of a substring can be extracted from prefix hashes in O(1) time: (h[i + len] - h[i]) / p^i mod m.",
      "When hashes match, compare the actual substring to pattern to rule out hash collisions.",
    ],
    solution: {
      idea: [
        "Precompute powers of base p modulo m and prefix hashes of text.",
        "Calculate the hash of pattern. For each candidate window in text of length pattern.length, compute its hash in O(1) time.",
        "If window hash equals pattern hash, verify the match with direct string comparison to avoid collision false positives.",
      ],
      complexity: "O(n + m) average time, O(n) space where n is text length and m is pattern length.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> rabinKarp(string pattern, string text) {
        int p_len = pattern.size();
        int t_len = text.size();
        vector<int> occurrences;
        if (p_len > t_len || p_len == 0) return occurrences;

        const long long p = 31;
        const long long m = 1e9 + 9;

        vector<long long> p_pow(max(p_len, t_len) + 1);
        p_pow[0] = 1;
        for (int i = 1; i < (int)p_pow.size(); i++) {
            p_pow[i] = (p_pow[i - 1] * p) % m;
        }

        vector<long long> h(t_len + 1, 0);
        for (int i = 0; i < t_len; i++) {
            h[i + 1] = (h[i] + (text[i] - 'a' + 1) * p_pow[i]) % m;
        }

        long long h_s = 0;
        for (int i = 0; i < p_len; i++) {
            h_s = (h_s + (pattern[i] - 'a' + 1) * p_pow[i]) % m;
        }

        for (int i = 0; i <= t_len - p_len; i++) {
            long long cur_h = (h[i + p_len] + m - h[i]) % m;
            if (cur_h == (h_s * p_pow[i]) % m) {
                if (text.compare(i, p_len, pattern) == 0) {
                    occurrences.push_back(i);
                }
            }
        }
        return occurrences;
    }
};
`,
    },
  },
];
