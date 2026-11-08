import type { ProblemSpec } from "./types";

// CSES Problem Set (https://cses.fi/problemset/) problems you can run in the app. CSES programs read standard
// input; here each one is turned into a function you implement, like LeetCode. The statements are short summaries
// in our own words and the test cases were written for this app: CSES's own tests are not public, so a pass here
// is a good sign, not proof that CSES will accept it. Open the original for the exact statement.

const cses = (n: number) => `https://cses.fi/problemset/task/${n}`;

export const CSES_SPECS: ProblemSpec[] = [
  {
    id: "cses-weird-algorithm",
    source: "cses",
    url: cses(1068),
    title: "Weird Algorithm",
    statement: [
      "Start with a positive integer n. While n is not 1: if n is even, divide it by 2; if n is odd, multiply it by 3 and add 1.",
      "Return every value n takes, in order, starting with the original n and ending with 1.",
    ],
    constraints: ["1 <= n <= 1000000", "Every value in the sequence fits in a 64-bit integer"],
    fn: { name: "weirdAlgorithm", params: [{ name: "n", type: "int" }], returns: "long[]" },
    examples: [{ input: [3], output: [3, 10, 5, 16, 8, 4, 2, 1], explanation: "3 is odd: 10. 10 is even: 5. And so on until 1." }],
    tests: [
      { input: [1], output: [1] },
      { input: [2], output: [2, 1] },
      { input: [4], output: [4, 2, 1] },
      { input: [5], output: [5, 16, 8, 4, 2, 1] },
      { input: [6], output: [6, 3, 10, 5, 16, 8, 4, 2, 1] },
      { input: [7], output: [7, 22, 11, 34, 17, 52, 26, 13, 40, 20, 10, 5, 16, 8, 4, 2, 1] },
      { input: [16], output: [16, 8, 4, 2, 1] },
    ],
    hints: [
      "Just do what the statement says in a loop. There is no trick in the algorithm itself.",
      "Use a 64-bit type for the running value: 3n + 1 can pass the range of a 32-bit int for large n.",
      "Push n into the result first, then loop while n != 1, updating n and pushing it each time.",
    ],
    solution: {
      idea: [
        "Simulate. Store the starting value, then repeat the even/odd rule, storing each new value, until you reach 1.",
        "The only catch is overflow: use long long for the running value even though the parameter is an int.",
      ],
      complexity: "O(length of the sequence); for n up to a million this is a few hundred steps.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> weirdAlgorithm(int n) {
        vector<long long> out;
        long long x = n;
        out.push_back(x);
        while (x != 1) {
            x = (x % 2 == 0) ? x / 2 : 3 * x + 1;
            out.push_back(x);
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "cses-missing-number",
    source: "cses",
    url: cses(1083),
    title: "Missing Number",
    statement: [
      "You are given n and a list of n - 1 distinct numbers, each between 1 and n. Exactly one number from 1 to n is missing. Return it.",
    ],
    constraints: ["2 <= n <= 200000", "nums has n - 1 distinct values in 1..n, so nums.size() is n - 1 (one less than n): loop over nums.size(), not n"],
    fn: { name: "missingNumber", params: [{ name: "n", type: "int" }, { name: "nums", type: "int[]" }], returns: "int" },
    examples: [{ input: [5, [2, 3, 1, 5]], output: 4 }],
    tests: [
      { input: [2, [1]], output: 2 },
      { input: [2, [2]], output: 1 },
      { input: [3, [3, 1]], output: 2 },
      { input: [6, [1, 2, 3, 4, 5]], output: 6 },
      { input: [6, [2, 3, 4, 5, 6]], output: 1 },
      { input: [10, [10, 9, 8, 7, 6, 5, 4, 3, 1]], output: 2 },
      { input: [4, [4, 2, 1]], output: 3 },
      { input: [7, [7, 6, 5, 3, 2, 1]], output: 4 },
    ],
    hints: [
      "Careful: the list holds n - 1 numbers, so valid indexes are 0 to n - 2. Looping to n reads one past the end.",
      "If you add up 1 through n, what do you get? And what would the list add up to without the missing number?",
      "The difference between the two sums is the missing number.",
      "Sum of 1..n is n * (n + 1) / 2. Use a 64-bit type: for n = 200000 it is about 2 * 10^10.",
    ],
    solution: {
      idea: [
        "Total = n(n+1)/2. Subtract every number in the list. What is left is the one you never subtracted.",
        "The total does not fit in 32 bits for the largest n, so accumulate in long long. XOR of 1..n against XOR of the list also works and avoids overflow.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int missingNumber(int n, vector<int>& nums) {
        long long total = (long long)n * (n + 1) / 2;
        for (int x : nums) total -= x;
        return (int)total;
    }
};
`,
    },
  },
  {
    id: "cses-repetitions",
    source: "cses",
    url: cses(1069),
    title: "Repetitions",
    statement: ["Given a DNA string made of the letters A, C, G and T, return the length of the longest run of the same letter in a row."],
    constraints: ["1 <= s.length <= 1000000", "s contains only A, C, G, T"],
    fn: { name: "repetitions", params: [{ name: "s", type: "string" }], returns: "int" },
    examples: [{ input: ["ATTCGGGA"], output: 3, explanation: "GGG." }],
    tests: [
      { input: ["A"], output: 1 },
      { input: ["AAAA"], output: 4 },
      { input: ["ACGT"], output: 1 },
      { input: ["AACCC"], output: 3 },
      { input: ["GGAAAT"], output: 3 },
      { input: ["ACCGGGTTTT"], output: 4 },
      { input: ["TGCAAAAC"], output: 4 },
      { input: ["AATTGGCCAAAAA"], output: 5 },
    ],
    hints: [
      "Compare each letter with the one before it.",
      "Keep the length of the current run: add one when the letter matches the previous one, otherwise reset it to 1.",
      "Track the maximum run length while you scan. Remember the string has at least one letter, so the answer is at least 1.",
    ],
    solution: {
      idea: ["One pass with a counter for the current run and a variable for the best run seen."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int repetitions(string s) {
        int best = 1, run = 1;
        for (size_t i = 1; i < s.size(); i++) {
            run = (s[i] == s[i - 1]) ? run + 1 : 1;
            best = max(best, run);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "cses-increasing-array",
    source: "cses",
    url: cses(1094),
    title: "Increasing Array",
    statement: [
      "You are given a list of integers. In one move you may increase any element by 1. Return the smallest number of moves that makes the list non-decreasing (each element at least as large as the one before it).",
    ],
    constraints: ["1 <= x.length <= 200000", "1 <= x[i] <= 1000000000", "The answer can exceed 32 bits"],
    fn: { name: "increasingArray", params: [{ name: "x", type: "long[]" }], returns: "long" },
    examples: [{ input: [[3, 2, 5, 1, 7]], output: 5, explanation: "Raise 2 to 3 (1 move) and 1 to 5 (4 moves)." }],
    tests: [
      { input: [[1, 2, 3]], output: 0 },
      { input: [[5, 4, 3, 2, 1]], output: 10 },
      { input: [[1]], output: 0 },
      { input: [[2, 2, 2]], output: 0 },
      { input: [[10, 1]], output: 9 },
      { input: [[1, 10, 1, 10, 1]], output: 18 },
      { input: [[1000000000, 1, 1000000000, 1]], output: 1999999998 },
      { input: [[4, 5, 4, 5, 4, 5]], output: 2 },
    ],
    hints: [
      "Only increasing is allowed, so a smaller element has to rise up to the one before it. Never lower anything.",
      "Go left to right. If x[i] is smaller than x[i - 1], you must raise it by exactly the difference, and no more.",
      "Add up those differences in a 64-bit variable, and use the raised value (not the original) as x[i - 1] for the next comparison.",
    ],
    solution: {
      idea: [
        "Greedy: processing left to right, the cheapest way to fix position i is to lift it to the previous value exactly. Lifting more would only make later fixes costlier.",
        "Count the lifts in a long long: a list of a million-sized values can need about 2 * 10^14 moves.",
      ],
      complexity: "O(n) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long increasingArray(vector<long long>& x) {
        long long moves = 0;
        for (size_t i = 1; i < x.size(); i++) {
            if (x[i] < x[i - 1]) {
                moves += x[i - 1] - x[i];
                x[i] = x[i - 1];
            }
        }
        return moves;
    }
};
`,
    },
  },
];
