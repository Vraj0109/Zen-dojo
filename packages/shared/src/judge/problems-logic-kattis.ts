import type { ProblemSpec } from "./types";

// Logic building: kattis problems, rewritten in our own words as functions (each links to the original). The expected outputs of every test were produced by running the C++ reference solution.

export const LOGIC_SPECS_KATTIS: ProblemSpec[] = [
  {
    id: "c-kattis-pot",
    source: "kattis",
    url: "https://open.kattis.com/problems/pot",
    title: "Pot (Kattis)",
    statement: [
      "Each number in the list encodes a power: its last digit is an exponent and the digits in front of it form the base. For example 212 means 21 raised to the power 2, and 305 means 30 to the power 5.",
      "Return the sum of all the powers. Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= nums.length <= 100", "10 <= nums[i] <= 309 (so the base is 1 to 30)", "the last digit (the exponent) is 0 to 9"],
    fn: {"name":"potSum","params":[{"name":"nums","type":"int[]"}],"returns":"long"},
    examples: [
      { input: [[24,31]], output: 19, explanation: "2^4 = 16 and 3^1 = 3." },
      { input: [[212,305]], output: 24300441, explanation: "21^2 = 441 and 30^5 = 24300000. Together 24300441." },
    ],
    tests: [
      { input: [[10]], output: 1 },
      { input: [[11]], output: 1 },
      { input: [[20]], output: 1 },
      { input: [[309]], output: 19683000000000 },
      { input: [[21,22,23,24,25]], output: 62 },
      { input: [[309,309,309]], output: 59049000000000 },
    ],
    hints: [
      "Split each number: the exponent is x % 10 and the base is x / 10.",
      "Raise the base to the exponent with a short loop (the exponent is at most 9).",
      "Add the powers into a 64-bit total. The biggest one, 30^9, is about 2 * 10^13.",
    ],
    solution: {
      idea: [
        "For each x take base = x / 10 and exponent = x % 10, compute base^exponent by repeated multiplication and add it to a 64-bit total.",
      ],
      complexity: "O(n * 9) time.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long potSum(vector<int> nums) {
        long long total = 0;
        for (int x : nums) {
            long long p = 1;
            for (int i = 0; i < x % 10; i++) p *= x / 10;
            total += p;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "c-kattis-tarifa",
    source: "kattis",
    url: "https://open.kattis.com/problems/tarifa",
    title: "Tarifa (Kattis)",
    statement: [
      "A mobile data plan gives x megabytes every month. Megabytes you do not use in a month are carried over to the next month. For n months you are told how many megabytes were used in each month.",
      "Return how many megabytes you have available in month n + 1 (the one just after the list ends). Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= x <= 100", "1 <= used.length <= 100", "0 <= used[i] <= 10000"],
    fn: {"name":"tarifa","params":[{"name":"x","type":"int"},{"name":"used","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [10,[4,6,2]], output: 28, explanation: "You receive 4 * 10 = 40 in total over four months and used 12 so far: 28 left." },
      { input: [10,[10,10,10]], output: 10 },
    ],
    tests: [
      { input: [1,[0]], output: 2 },
      { input: [1,[1]], output: 1 },
      { input: [100,[0,0,0]], output: 400 },
      { input: [5,[5,5,5,5,5,5]], output: 5 },
      { input: [7,[10,0,0]], output: 18 },
      { input: [50,[100,100]], output: -50 },
    ],
    hints: [
      "Over n + 1 months you will have received x * (n + 1) megabytes in total.",
      "Whatever you have already used is gone. Unused megabytes simply stay, so you do not need to track month by month.",
      "The answer is x * (n + 1) minus the sum of the used list. (The input guarantees you never use more than you have.)",
    ],
    solution: {
      idea: [
        "Total received up to and including month n + 1 is x * (n + 1). Subtract everything used in the first n months.",
      ],
      complexity: "O(n) time.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int tarifa(int x, vector<int> used) {
        int total = x * ((int)used.size() + 1);
        for (int u : used) total -= u;
        return total;
    }
};
`,
    },
  },
  {
    id: "c-kattis-sevenwonders",
    source: "kattis",
    url: "https://open.kattis.com/problems/sevenwonders",
    title: "Seven Wonders (Kattis)",
    statement: [
      "In a card game you collect cards of three kinds, written T, C and G. Your score is the square of the number of T cards, plus the square of the number of C cards, plus the square of the number of G cards, plus 7 points for every complete set (one card of each kind).",
      "Given the string of cards you collected, return the score. Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= cards.length <= 50", "cards contains only the letters T, C and G"],
    fn: {"name":"sevenWondersScore","params":[{"name":"cards","type":"string"}],"returns":"int"},
    examples: [
      { input: ["TCGTTC"], output: 21, explanation: "T: 3, C: 2, G: 1 gives 9 + 4 + 1 = 14, plus 7 for the one complete set: 21." },
      { input: ["GGGGGG"], output: 36 },
    ],
    tests: [
      { input: ["T"], output: 1 },
      { input: ["TCG"], output: 10 },
      { input: ["TTCCGG"], output: 26 },
      { input: ["TTTTCCCG"], output: 33 },
      { input: ["TCGTCGTCG"], output: 48 },
      { input: ["CCCCCCCCCC"], output: 100 },
    ],
    hints: [
      "Count how many T, C and G cards there are.",
      "The base score is t * t + c * c + g * g.",
      "The number of complete sets is the smallest of the three counts. Add 7 times that.",
    ],
    solution: {
      idea: [
        "Count each letter; score = t^2 + c^2 + g^2 + 7 * min(t, c, g).",
      ],
      complexity: "O(n) time.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int sevenWondersScore(string cards) {
        int t = 0, c = 0, g = 0;
        for (char ch : cards) { if (ch == 'T') t++; else if (ch == 'C') c++; else g++; }
        return t * t + c * c + g * g + 7 * min({t, c, g});
    }
};
`,
    },
  },
  {
    id: "c-kattis-oddmanout",
    source: "kattis",
    url: "https://open.kattis.com/problems/oddmanout",
    title: "Odd Man Out (Kattis)",
    statement: [
      "A group of friends were invited in pairs, so every invitation code appears twice in the list, except for one friend who came alone: his code appears only once. Return the code that appears once.",
      "The list is not sorted and can hold up to 99999 codes. There is a way to find the answer with a single pass and no extra memory. Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= codes.length <= 99999, odd", "1 <= codes[i] <= 2000000000", "exactly one code appears once, every other code appears exactly twice"],
    fn: {"name":"oddManOut","params":[{"name":"codes","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[1,2,3,2,1]], output: 3 },
      { input: [[7]], output: 7 },
    ],
    tests: [
      { input: [[5,5,9]], output: 9 },
      { input: [[9,5,5]], output: 9 },
      { input: [[4,8,4,8,15]], output: 15 },
      { input: [[2000000000,1,2000000000]], output: 1 },
      { input: [[3,1,4,1,5,9,2,6,5,3,9,2,6]], output: 4 },
      { input: [[11,22,33,22,11,44,44]], output: 33 },
    ],
    hints: [
      "A set or a counting map would work. Is there a way to do it with no extra memory at all?",
      "XOR (^) has two useful properties: x ^ x = 0 and x ^ 0 = x. The order of the operands does not matter.",
      "XOR all the codes together. Every pair cancels, and the code that appears once is left.",
    ],
    solution: {
      idea: [
        "XOR is its own inverse and order does not matter, so XOR-ing all codes cancels every pair and leaves the single one.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int oddManOut(vector<int> codes) {
        int x = 0;
        for (int c : codes) x ^= c;
        return x;
    }
};
`,
    },
  },
  {
    id: "c-kattis-planina",
    source: "kattis",
    url: "https://open.kattis.com/problems/planina",
    title: "Planina (Kattis)",
    statement: [
      "Start with a square whose four corners are marked (4 points). In each step, mark the middle of every side of every small square and the centre of every square, so each square is split into four smaller squares. Points that are already marked are not counted again.",
      "Return the number of marked points after n steps. With n = 0 there are 4 points; with n = 1 there are 9. Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["0 <= n <= 15"],
    fn: {"name":"planinaPoints","params":[{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [1], output: 9, explanation: "A 3 by 3 grid of points." },
      { input: [2], output: 25 },
    ],
    tests: [
      { input: [0], output: 4 },
      { input: [3], output: 81 },
      { input: [4], output: 289 },
      { input: [8], output: 66049 },
      { input: [12], output: 16785409 },
      { input: [15], output: 1073807361 },
    ],
    hints: [
      "Draw the picture for n = 0, 1 and 2 and count the points: 4, 9, 25.",
      "The points form a square grid. After n steps each side of the big square is split into 2^n parts.",
      "A side with 2^n parts has 2^n + 1 points, so the grid holds (2^n + 1)^2 points. Compute it with a shift: (1 << n) + 1.",
    ],
    solution: {
      idea: [
        "After n steps there are 2^n + 1 points along each side, so the total is (2^n + 1)^2.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int planinaPoints(int n) {
        long long side = (1LL << n) + 1;
        return (int)(side * side);
    }
};
`,
    },
  },
  {
    id: "c-kattis-bijele",
    source: "kattis",
    url: "https://open.kattis.com/problems/bijele",
    title: "Bijele (Kattis)",
    statement: [
      "A complete chess set has 1 king, 1 queen, 2 rooks, 2 bishops, 2 knights and 8 pawns. You are told how many of each piece you found, in the order king, queen, rook, bishop, knight, pawn.",
      "Return, for each kind of piece in the same order, how many more you need to make the set complete. The number is negative when you have extra pieces of that kind. Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["found.length == 6", "0 <= found[i] <= 10"],
    fn: {"name":"missingPieces","params":[{"name":"found","type":"int[]"}],"returns":"int[]"},
    examples: [
      { input: [[0,1,2,2,2,7]], output: [1,0,0,0,0,1] },
      { input: [[2,1,2,1,2,1]], output: [-1,0,0,1,0,7] },
    ],
    tests: [
      { input: [[1,1,2,2,2,8]], output: [0,0,0,0,0,0] },
      { input: [[0,0,0,0,0,0]], output: [1,1,2,2,2,8] },
      { input: [[10,10,10,10,10,10]], output: [-9,-9,-8,-8,-8,-2] },
      { input: [[1,0,1,0,1,0]], output: [0,1,1,2,1,8] },
      { input: [[3,0,2,3,0,9]], output: [-2,1,0,-1,2,-1] },
      { input: [[0,1,0,1,0,8]], output: [1,0,2,1,2,0] },
    ],
    hints: [
      "Write down how many of each piece a complete set has: 1, 1, 2, 2, 2, 8.",
      "For every kind, subtract the number you found from the number a set needs.",
      "Keep the sign: a negative result means you have too many, which is the answer to return.",
    ],
    solution: {
      idea: [
        "Keep the target list [1, 1, 2, 2, 2, 8] and return target[i] - found[i] for each i.",
      ],
      complexity: "O(1) (six entries).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> missingPieces(vector<int> found) {
        const int target[6] = {1, 1, 2, 2, 2, 8};
        vector<int> out(6);
        for (int i = 0; i < 6; i++) out[i] = target[i] - found[i];
        return out;
    }
};
`,
    },
  },
];
