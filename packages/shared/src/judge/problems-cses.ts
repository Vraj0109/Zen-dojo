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
  {
    id: "cses-permutations",
    source: "cses",
    url: cses(1070),
    title: "Permutations",
    statement: [
      "A permutation of integers 1, 2, ..., n is called beautiful if there are no adjacent elements whose absolute difference is 1.",
      "Construct a beautiful permutation by listing all even numbers in increasing order followed by all odd numbers in increasing order (e.g. for n = 4: [2, 4, 1, 3]).",
      "If no beautiful permutation exists (for n = 2 or n = 3), return an empty list.",
    ],
    constraints: ["1 <= n <= 1000000"],
    fn: { name: "permutations", params: [{ name: "n", type: "int" }], returns: "int[]" },
    examples: [
      { input: [5], output: [2, 4, 1, 3, 5], explanation: "Even numbers 2, 4 then odd numbers 1, 3, 5. No adjacent difference is 1." },
      { input: [3], output: [], explanation: "No beautiful permutation is possible for n = 3." },
    ],
    tests: [
      { input: [1], output: [1] },
      { input: [2], output: [] },
      { input: [4], output: [2, 4, 1, 3] },
      { input: [6], output: [2, 4, 6, 1, 3, 5] },
      { input: [7], output: [2, 4, 6, 1, 3, 5, 7] },
      { input: [8], output: [2, 4, 6, 8, 1, 3, 5, 7] },
    ],
    hints: [
      "Separate even and odd numbers: adjacent even numbers differ by 2, and adjacent odd numbers differ by 2.",
      "Place all even numbers first (2, 4, 6, ...), then all odd numbers (1, 3, 5, ...).",
      "For n = 1, [1] is valid. For n = 2 and n = 3, no beautiful permutation is possible. For n >= 4, the boundary difference between the last even number (at least 4) and 1 is at least 3, never 1.",
    ],
    solution: {
      idea: [
        "Place all even numbers from 2 up to n in increasing order, followed by all odd numbers from 1 up to n in increasing order.",
        "Adjacent evens differ by 2, adjacent odds differ by 2, and the transition from last even to 1 has difference >= 3 for n >= 4.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> permutations(int n) {
        if (n == 1) return {1};
        if (n == 2 || n == 3) return {};
        vector<int> out;
        out.reserve(n);
        for (int i = 2; i <= n; i += 2) out.push_back(i);
        for (int i = 1; i <= n; i += 2) out.push_back(i);
        return out;
    }
};
`,
    },
  },
  {
    id: "cses-number-spiral",
    source: "cses",
    url: cses(1071),
    title: "Number Spiral",
    statement: [
      "A number spiral is an infinite grid whose upper-left cell (row 1, column 1) contains the number 1.",
      "The grid is populated in successive square layers: layer z consists of all cells (y, x) with max(y, x) = z.",
      "Given row y and column x (1-indexed), return the number written at that position.",
    ],
    constraints: [
      "1 <= y, x <= 1000000000",
      "The coordinates and result fit in 64-bit integers",
    ],
    fn: {
      name: "numberSpiral",
      params: [
        { name: "y", type: "long" },
        { name: "x", type: "long" },
      ],
      returns: "long",
    },
    examples: [
      { input: [2, 3], output: 8, explanation: "At row 2, column 3, the spiral value is 8." },
      { input: [1, 1], output: 1 },
      { input: [4, 2], output: 15 },
    ],
    tests: [
      { input: [1, 3], output: 9 },
      { input: [3, 1], output: 5 },
      { input: [3, 3], output: 7 },
      { input: [4, 4], output: 13 },
      { input: [5, 3], output: 19 },
      { input: [2, 1], output: 4 },
      { input: [1000000000, 1000000000], output: 999999999000000001 },
    ],
    hints: [
      "Find the layer z = max(y, x). The previous square of size z - 1 contains numbers up to (z - 1)^2.",
      "If layer z is even, numbers increase down along column z then left along row z: row z ends with z^2.",
      "If layer z is odd, numbers increase right along row z then down along column z: column z ends with z^2.",
    ],
    solution: {
      idea: [
        "Let z = max(y, x). The inner square holds (z - 1)^2 numbers.",
        "When z is even, layer z runs clockwise: if y == z, the number is z^2 - x + 1; otherwise, it is (z - 1)^2 + y.",
        "When z is odd, layer z runs counter-clockwise: if x == z, the number is z^2 - y + 1; otherwise, it is (z - 1)^2 + x.",
      ],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long numberSpiral(long long y, long long x) {
        long long z = max(y, x);
        long long z2 = (z - 1) * (z - 1);
        if (z % 2 == 0) {
            return (y == z) ? z * z - x + 1 : z2 + y;
        } else {
            return (x == z) ? z * z - y + 1 : z2 + x;
        }
    }
};
`,
    },
  },
  {
    id: "cses-two-knights",
    source: "cses",
    url: cses(1072),
    title: "Two Knights",
    statement: [
      "For every k from 1 to n, count the number of ways two knights can be placed on a k x k chessboard such that they do not attack each other.",
      "Return an array of length n where the k-th entry (0-indexed, representing k = 1..n) is the number of valid placements on a k x k board.",
    ],
    constraints: [
      "1 <= n <= 10000",
      "Counts can exceed 32-bit integer limits",
    ],
    fn: { name: "twoKnights", params: [{ name: "n", type: "int" }], returns: "long[]" },
    examples: [
      {
        input: [8],
        output: [0, 6, 28, 96, 252, 550, 1056, 1848],
        explanation: "Results for board sizes 1x1 through 8x8.",
      },
    ],
    tests: [
      { input: [1], output: [0] },
      { input: [2], output: [0, 6] },
      { input: [3], output: [0, 6, 28] },
      { input: [4], output: [0, 6, 28, 96] },
      { input: [5], output: [0, 6, 28, 96, 252] },
      { input: [6], output: [0, 6, 28, 96, 252, 550] },
    ],
    hints: [
      "On a k x k board, total ways to choose 2 arbitrary squares is (k^2) * (k^2 - 1) / 2.",
      "Knights attack each other if and only if they form opposite corners of a 2 x 3 or 3 x 2 rectangle.",
      "Each 2 x 3 and 3 x 2 block contains 2 attacking pairs. A k x k board has (k - 1)(k - 2) blocks of size 2 x 3 and (k - 2)(k - 1) of size 3 x 2, giving 4 * (k - 1) * (k - 2) attacking pairs in total.",
    ],
    solution: {
      idea: [
        "Compute non-attacking placements as (total pairs of squares) minus (attacking pairs).",
        "Total pairs on k x k board is k^2 * (k^2 - 1) / 2.",
        "Attacking pairs correspond to opposite corners of 2x3 and 3x2 rectangles: 4 * (k - 1) * (k - 2).",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> twoKnights(int n) {
        vector<long long> res;
        res.reserve(n);
        for (long long k = 1; k <= n; k++) {
            long long total = (k * k) * (k * k - 1) / 2;
            long long attack = 4 * (k - 1) * (k - 2);
            res.push_back(total - attack);
        }
        return res;
    }
};
`,
    },
  },
  {
    id: "cses-two-sets",
    source: "cses",
    url: cses(1092),
    title: "Two Sets",
    statement: [
      "Divide the numbers 1, 2, ..., n into two sets of equal sum.",
      "Return the two sets as a list of two lists [set1, set2], each sorted in ascending order. If no partition with equal sum is possible, return an empty list.",
      "To obtain a canonical partition, use the greedy approach: scanning from n down to 1, put number k into set1 if doing so does not exceed the remaining target sum (total / 2); otherwise put k into set2.",
    ],
    constraints: ["1 <= n <= 1000000"],
    unordered: true,
    fn: { name: "twoSets", params: [{ name: "n", type: "int" }], returns: "int[][]" },
    examples: [
      {
        input: [7],
        output: [
          [1, 6, 7],
          [2, 3, 4, 5],
        ],
        explanation: "1 + 6 + 7 = 14 and 2 + 3 + 4 + 5 = 14.",
      },
      {
        input: [3],
        output: [
          [3],
          [1, 2],
        ],
        explanation: "3 = 3 and 1 + 2 = 3.",
      },
      {
        input: [6],
        output: [],
        explanation: "Total sum 1 + ... + 6 = 21 is odd, so equal division is impossible.",
      },
    ],
    tests: [
      { input: [1], output: [] },
      { input: [2], output: [] },
      { input: [4], output: [[1, 4], [2, 3]] },
      { input: [5], output: [] },
      { input: [8], output: [[3, 7, 8], [1, 2, 4, 5, 6]] },
      { input: [11], output: [[3, 9, 10, 11], [1, 2, 4, 5, 6, 7, 8]] },
      { input: [12], output: [[6, 10, 11, 12], [1, 2, 3, 4, 5, 7, 8, 9]] },
    ],
    hints: [
      "The total sum 1 + 2 + ... + n is n * (n + 1) / 2. If this sum is odd, it is impossible to divide into two equal sets.",
      "The sum is even when n is a multiple of 4 or when n = 4k + 3.",
      "To construct the sets, compute target = total / 2. Work backwards from n to 1: take element k into set 1 if target >= k, updating target -= k; otherwise put k into set 2.",
    ],
    solution: {
      idea: [
        "If total sum n*(n+1)/2 is odd, no solution exists.",
        "Otherwise, greedily add elements from n down to 1 into the first set as long as target >= i.",
        "Sort both sets before returning.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> twoSets(int n) {
        long long total = (long long)n * (n + 1) / 2;
        if (total % 2 != 0) return {};
        long long target = total / 2;
        vector<int> s1, s2;
        for (int i = n; i >= 1; i--) {
            if (target >= i) {
                s1.push_back(i);
                target -= i;
            } else {
                s2.push_back(i);
            }
        }
        reverse(s1.begin(), s1.end());
        reverse(s2.begin(), s2.end());
        return {s1, s2};
    }
};
`,
    },
  },
  {
    id: "cses-bit-strings",
    source: "cses",
    url: cses(1617),
    title: "Bit Strings",
    statement: [
      "Calculate the number of bit strings of length n.",
      "Because the answer may be very large, return it modulo 10^9 + 7 (1000000007).",
    ],
    constraints: ["1 <= n <= 1000000"],
    fn: { name: "bitStrings", params: [{ name: "n", type: "int" }], returns: "int" },
    examples: [{ input: [3], output: 8, explanation: "The 8 bit strings of length 3 are 000, 001, 010, 011, 100, 101, 110, 111." }],
    tests: [
      { input: [1], output: 2 },
      { input: [2], output: 4 },
      { input: [4], output: 16 },
      { input: [10], output: 1024 },
      { input: [30], output: 73741817 },
      { input: [100], output: 976371285 },
    ],
    hints: [
      "Each position in the string can be either 0 or 1, so for length n there are 2^n possible bit strings.",
      "Since 2^n is too large for standard integer types, compute the power modulo 10^9 + 7.",
      "You can use a loop multiplying by 2 modulo 10^9 + 7, or modular binary exponentiation in O(log n) time.",
    ],
    solution: {
      idea: [
        "The number of bit strings of length n is 2^n.",
        "Compute 2^n mod 1000000007 using fast binary exponentiation.",
      ],
      complexity: "O(log n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int bitStrings(int n) {
        long long res = 1;
        long long base = 2;
        long long mod = 1000000007;
        while (n > 0) {
            if (n & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            n >>= 1;
        }
        return res;
    }
};
`,
    },
  },
  {
    id: "cses-trailing-zeros",
    source: "cses",
    url: cses(1618),
    title: "Trailing Zeros",
    statement: [
      "Calculate the number of trailing zeros in the decimal representation of n! (n factorial).",
    ],
    constraints: ["1 <= n <= 1000000000"],
    fn: { name: "trailingZeros", params: [{ name: "n", type: "int" }], returns: "int" },
    examples: [
      { input: [20], output: 4, explanation: "20! has 4 trailing zeros (produced by factors 5, 10, 15, and 20)." },
    ],
    tests: [
      { input: [1], output: 0 },
      { input: [5], output: 1 },
      { input: [10], output: 2 },
      { input: [25], output: 6 },
      { input: [100], output: 24 },
      { input: [1000], output: 249 },
      { input: [1000000000], output: 249999998 },
    ],
    hints: [
      "A trailing zero in decimal corresponds to a factor of 10 = 2 * 5.",
      "In n!, factors of 2 are strictly more numerous than factors of 5, so the count of trailing zeros equals the power of 5 in the prime factorization of n!.",
      "Use Legendre's formula: count = floor(n / 5) + floor(n / 25) + floor(n / 125) + ... Repeat while n >= 5.",
    ],
    solution: {
      idea: [
        "Each factor of 10 adds one trailing zero. In n!, factors of 5 are the bottleneck.",
        "Add n / 5, then n / 25, n / 125, etc. In each step, divide n by 5 and add the quotient.",
      ],
      complexity: "O(log_5(n)) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int trailingZeros(int n) {
        int count = 0;
        while (n >= 5) {
            count += n / 5;
            n /= 5;
        }
        return count;
    }
};
`,
    },
  },
  {
    id: "cses-coin-piles",
    source: "cses",
    url: cses(1754),
    title: "Coin Piles",
    statement: [
      "You have two coin piles with a and b coins respectively.",
      "On each move, you can either remove 1 coin from the left pile and 2 coins from the right pile, or 2 coins from the left pile and 1 coin from the right pile.",
      "Return true if you can empty both piles, and false otherwise.",
    ],
    constraints: ["0 <= a, b <= 1000000000"],
    fn: {
      name: "coinPiles",
      params: [
        { name: "a", type: "int" },
        { name: "b", type: "int" },
      ],
      returns: "bool",
    },
    examples: [
      { input: [2, 1], output: true, explanation: "Remove 2 from the left pile and 1 from the right pile to empty both in 1 move." },
      { input: [2, 2], output: false, explanation: "No sequence of moves can empty both piles." },
      { input: [3, 3], output: true, explanation: "Remove (1, 2) then (2, 1) to empty both piles." },
    ],
    tests: [
      { input: [0, 0], output: true },
      { input: [1, 2], output: true },
      { input: [0, 1], output: false },
      { input: [4, 5], output: true },
      { input: [8, 4], output: true },
      { input: [10, 4], output: false },
      { input: [1000000000, 500000000], output: true },
      { input: [1000000000, 499999999], output: false },
    ],
    hints: [
      "Each move removes exactly 3 coins in total (1 + 2 or 2 + 1). What does that say about (a + b)?",
      "(a + b) must be divisible by 3.",
      "Furthermore, the larger pile cannot have more than twice the smaller pile: max(a, b) <= 2 * min(a, b). If both conditions hold, the piles can always be emptied.",
    ],
    solution: {
      idea: [
        "Each operation takes 3 coins total, so (a + b) % 3 == 0 is required.",
        "Also, even if we always take 2 from the larger pile and 1 from the smaller pile, the larger pile cannot be more than twice the smaller pile: max(a, b) <= 2 * min(a, b).",
        "Use 64-bit arithmetic when checking 2 * a to prevent integer overflow.",
      ],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool coinPiles(int a, int b) {
        if ((a + b) % 3 != 0) return false;
        return a <= 2LL * b && b <= 2LL * a;
    }
};
`,
    },
  },
];
