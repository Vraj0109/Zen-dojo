import type { ProblemSpec } from "./types";

// Logic building: AtCoder Beginner Contest tasks, rewritten in our own words as functions (each links to the original). The expected outputs of every test were produced by running the C++ reference solution.

export const LOGIC_SPECS_ATCODER: ProblemSpec[] = [
  {
    id: "c-atc-abc086-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/abc086_a",
    title: "Product (AtCoder ABC 086 A)",
    statement: [
      "Two positive whole numbers a and b are given. Decide whether their product a * b is even or odd and return the word Even or Odd.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= a, b <= 10000"],
    fn: {"name":"productParity","params":[{"name":"a","type":"int"},{"name":"b","type":"int"}],"returns":"string"},
    examples: [
      { input: [3,4], output: "Even", explanation: "3 * 4 = 12, which is even." },
      { input: [1,21], output: "Odd", explanation: "1 * 21 = 21, which is odd." },
    ],
    tests: [
      { input: [1,1], output: "Odd" },
      { input: [2,2], output: "Even" },
      { input: [9999,9999], output: "Odd" },
      { input: [10000,9999], output: "Even" },
      { input: [7,10000], output: "Even" },
      { input: [5,3], output: "Odd" },
    ],
    hints: [
      "You do not need to multiply anything. Think about when a product of two numbers is odd.",
      "a * b is odd only when both a and b are odd.",
      "Check (a % 2 == 1 && b % 2 == 1): if it is true return Odd, otherwise Even.",
    ],
    solution: {
      idea: [
        "A product is odd exactly when both factors are odd. Test a % 2 and b % 2 and return Odd or Even.",
      ],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string productParity(int a, int b) { return (a % 2 == 1 && b % 2 == 1) ? "Odd" : "Even"; }
};
`,
    },
  },
  {
    id: "c-atc-abc081-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/abc081_b",
    title: "Shift Only (AtCoder ABC 081 B)",
    statement: [
      "You have a list of whole numbers on a blackboard. In one move, if every number on the board is even, you may replace each number by half of it. Return the largest number of moves you can make.",
      "If a number is odd you cannot move any more. A board that never runs out of moves cannot happen because every number is positive. Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= a.length <= 200", "1 <= a[i] <= 1000000000"],
    fn: {"name":"shiftOnly","params":[{"name":"a","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[8,12,40]], output: 2, explanation: "Halve once: 4, 6, 20. Halve again: 2, 3, 10. Now 3 is odd: stop." },
      { input: [[5,6,8,10]], output: 0 },
    ],
    tests: [
      { input: [[1]], output: 0 },
      { input: [[2]], output: 1 },
      { input: [[999999999]], output: 0 },
      { input: [[536870912]], output: 29 },
      { input: [[1000000000,500000000,250000000]], output: 7 },
      { input: [[16,16,16,16,24]], output: 3 },
      { input: [[6,10,14,18]], output: 1 },
    ],
    hints: [
      "You can simulate: while all numbers are even, halve all and count. How many times can that loop run at most?",
      "A number below 2^30 can be halved fewer than 30 times, so a simulation is quick.",
      "A neat alternative: the answer is the smallest number of trailing zero bits (factors of 2) among all the numbers.",
    ],
    solution: {
      idea: [
        "Count how many times each number can be divided by 2 (its factors of two) and return the minimum over all numbers. The board allows exactly that many moves.",
      ],
      complexity: "O(n log max) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int shiftOnly(vector<int> a) {
        int best = 100;
        for (int x : a) {
            int c = 0;
            while (x % 2 == 0) { x /= 2; c++; }
            best = min(best, c);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc087-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/abc087_b",
    title: "Coins (AtCoder ABC 087 B)",
    statement: [
      "You own a coins worth 500 yen, b coins worth 100 yen and c coins worth 50 yen. Count in how many ways you can choose some of them so that their total value is exactly x yen. Two ways differ if they use a different number of coins of some kind.",
      "Choosing zero coins of a kind is allowed. Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["0 <= a, b, c <= 50", "a + b + c >= 1", "50 <= x <= 20000", "x is a multiple of 50"],
    fn: {"name":"coinWays","params":[{"name":"a","type":"int"},{"name":"b","type":"int"},{"name":"c","type":"int"},{"name":"x","type":"int"}],"returns":"int"},
    examples: [
      { input: [2,2,2,100], output: 2, explanation: "Either 100 yen from one 100-yen coin, or from two 50-yen coins." },
      { input: [5,1,0,150], output: 0 },
    ],
    tests: [
      { input: [0,0,1,50], output: 1 },
      { input: [1,0,0,500], output: 1 },
      { input: [0,0,1,100], output: 0 },
      { input: [50,50,50,20000], output: 266 },
      { input: [50,50,50,10000], output: 266 },
      { input: [30,20,10,7000], output: 26 },
      { input: [4,0,40,2000], output: 5 },
    ],
    hints: [
      "There are at most 51 choices for each kind of coin, so about 51^3 combinations in total.",
      "Try every number i of 500-coins (0..a), every j of 100-coins (0..b) and every k of 50-coins (0..c).",
      "Count the triples with 500 * i + 100 * j + 50 * k == x. About 132000 checks: fast enough.",
    ],
    solution: {
      idea: [
        "Three nested loops over how many coins of each kind to use; count the combinations whose value equals x.",
      ],
      complexity: "O(a * b * c) time, at most about 132000 steps; O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int coinWays(int a, int b, int c, int x) {
        int count = 0;
        for (int i = 0; i <= a; i++)
            for (int j = 0; j <= b; j++)
                for (int k = 0; k <= c; k++)
                    if (500 * i + 100 * j + 50 * k == x) count++;
        return count;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc083-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/abc083_b",
    title: "Some Sums (AtCoder ABC 083 B)",
    statement: [
      "Look at the whole numbers from 1 to n. For each of them add up its decimal digits (the digit sum of 1234 is 10). Add together all the numbers whose digit sum is at least a and at most b, and return that total.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= n <= 1000000", "1 <= a <= b <= 100"],
    fn: {"name":"someSums","params":[{"name":"n","type":"int"},{"name":"a","type":"int"},{"name":"b","type":"int"}],"returns":"long"},
    examples: [
      { input: [20,2,5], output: 84, explanation: "The numbers 2, 3, 4, 5, 11, 12, 13, 14, 20 have digit sums from 2 to 5, and they add up to 84." },
      { input: [10,1,2], output: 13 },
    ],
    tests: [
      { input: [1,1,1], output: 1 },
      { input: [9,10,20], output: 0 },
      { input: [100,1,100], output: 5050 },
      { input: [1000000,1,54], output: 500000500000 },
      { input: [1000000,30,40], output: 210398122935 },
      { input: [999999,54,54], output: 999999 },
    ],
    hints: [
      "n is at most a million, so you can look at every number one at a time.",
      "Compute the digit sum of a number by repeatedly taking x % 10 and dividing x by 10.",
      "If the digit sum is in [a, b], add the number (not its digit sum!) to a total. Use a 64-bit total: the sum can reach about 5 * 10^11.",
    ],
    solution: {
      idea: [
        "Loop i from 1 to n, compute the digit sum, and add i to the total when the digit sum lies in [a, b].",
      ],
      complexity: "O(n log n) time (about 7 digits per number), O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long someSums(int n, int a, int b) {
        long long total = 0;
        for (int i = 1; i <= n; i++) {
            int s = 0;
            for (int x = i; x > 0; x /= 10) s += x % 10;
            if (s >= a && s <= b) total += i;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc088-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/abc088_b",
    title: "Card Game for Two (AtCoder ABC 088 B)",
    statement: [
      "Alice and Bob play with cards that each show a number. They take turns, Alice first. On a turn, the player takes the card with the biggest number left. When the cards are gone, each player's score is the sum of the numbers on their cards.",
      "Both play to maximise their own score, which means they always take the biggest card. Return Alice's score minus Bob's score. Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= cards.length <= 100000", "1 <= cards[i] <= 100"],
    fn: {"name":"cardGame","params":[{"name":"cards","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[3,1]], output: 2, explanation: "Alice takes 3, Bob takes 1: 3 - 1 = 2." },
      { input: [[2,7,4]], output: 5, explanation: "Alice 7 and 2 (9), Bob 4: 9 - 4 = 5." },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[5,5]], output: 0 },
      { input: [[1,2,3,4,5,6]], output: 3 },
      { input: [[100,100,100]], output: 100 },
      { input: [[9,7,4,2,1]], output: 5 },
      { input: [[1,1,1,1,1,100]], output: 99 },
    ],
    hints: [
      "Taking the biggest card is the best move for both, so you only need to simulate that.",
      "Sort the cards from biggest to smallest. Alice takes positions 0, 2, 4, ... and Bob takes positions 1, 3, 5, ...",
      "Add Alice's cards and subtract Bob's: result += (i % 2 == 0 ? card : -card).",
    ],
    solution: {
      idea: [
        "Sort descending, then add the cards at even positions and subtract those at odd positions.",
      ],
      complexity: "O(n log n) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int cardGame(vector<int> cards) {
        sort(cards.rbegin(), cards.rend());
        int diff = 0;
        for (size_t i = 0; i < cards.size(); i++) diff += (i % 2 == 0) ? cards[i] : -cards[i];
        return diff;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc085-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/abc085_b",
    title: "Kagami Mochi (AtCoder ABC 085 B)",
    statement: [
      "You have round rice cakes of various diameters. A stack is built by putting cakes on top of each other so that every cake is strictly smaller than the one below it. Return the largest possible number of cakes in one stack.",
      "Cakes of the same diameter cannot both be in a stack, and you may use any subset of the cakes. Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= d.length <= 100000", "1 <= d[i] <= 100000"],
    fn: {"name":"kagamiMochi","params":[{"name":"d","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[10,8,8,6]], output: 3, explanation: "Use diameters 10, 8 and 6 (only one of the two 8s)." },
      { input: [[15,15,15]], output: 1 },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[1,2,3,4,5]], output: 5 },
      { input: [[5,5,5,5,4,4,3]], output: 3 },
      { input: [[100000,1,100000,1]], output: 2 },
      { input: [[7,3,9,3,7,1,9,2]], output: 5 },
      { input: [[2,2]], output: 1 },
    ],
    hints: [
      "Only the sizes matter, so ask what limits the stack: two cakes of the same size can never both be used.",
      "Any set of distinct diameters can be stacked from biggest to smallest.",
      "So the answer is the number of distinct diameters. Use a set, or sort and count the changes.",
    ],
    solution: {
      idea: [
        "The best stack uses one cake of each different diameter, ordered from large to small, so the answer is the number of distinct values.",
      ],
      complexity: "O(n log n) time with sorting or a set, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int kagamiMochi(vector<int> d) {
        return (int)set<int>(d.begin(), d.end()).size();
    }
};
`,
    },
  },
  {
    id: "c-atc-abc085-c",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/abc085_c",
    title: "Otoshidama Combinations (AtCoder ABC 085 C)",
    statement: [
      "A bag holds exactly n bills. Each bill is worth 10000, 5000 or 1000 yen, and the bills add up to y yen in total. Count how many different (number of 10000s, number of 5000s, number of 1000s) triples are possible.",
      "The original task asks you to print any one valid triple (or -1 -1 -1 if none exists); a count has the same difficulty and a single correct answer, so it is used here. y is always a multiple of 1000. Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= n <= 2000", "1000 <= y <= 20000000", "y is a multiple of 1000"],
    fn: {"name":"otoshidamaWays","params":[{"name":"n","type":"int"},{"name":"y","type":"int"}],"returns":"int"},
    examples: [
      { input: [9,45000], output: 2, explanation: "Nine bills worth 45000 yen: for example 0 ten-thousands, 9 five-thousands and 0 thousands, or 4 ten-thousands, 0 five-thousands and 5 thousands. Count all such triples." },
      { input: [20,196000], output: 0 },
    ],
    tests: [
      { input: [1,1000], output: 1 },
      { input: [1,2000], output: 0 },
      { input: [3,18000], output: 0 },
      { input: [1000,1234000], output: 7 },
      { input: [2000,20000000], output: 1 },
      { input: [2000,2000000], output: 1 },
      { input: [2000,8000000], output: 167 },
    ],
    hints: [
      "If you know how many 10000-yen bills (x) and 5000-yen bills (y) there are, the number of 1000-yen bills is forced: z = n - x - y.",
      "So loop x from 0 to n and y from 0 to n - x. That is at most about 2 million pairs.",
      "For each pair check 10000 * x + 5000 * y + 1000 * z == total. Count the pairs that work.",
    ],
    solution: {
      idea: [
        "Loop over the number of 10000s and 5000s; the number of 1000s is n minus those two. Count the pairs whose total value equals y. At most n^2 / 2 pairs.",
      ],
      complexity: "O(n^2) time (about 2 million steps), O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int otoshidamaWays(int n, int y) {
        int count = 0;
        for (int a = 0; a <= n; a++)
            for (int b = 0; a + b <= n; b++) {
                int c = n - a - b;
                if (10000LL * a + 5000LL * b + 1000LL * c == y) count++;
            }
        return count;
    }
};
`,
    },
  },
  {
    id: "c-atc-arc089-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/arc089_a",
    title: "Traveling (AtCoder ABC 086 C)",
    statement: [
      "A traveller starts at the point (0, 0) at time 0. A plan lists points to visit: plan[i] = [t, x, y] means that at time t the traveller must stand at (x, y). Times are increasing.",
      "In every unit of time the traveller must move exactly one step to one of the four neighbouring points (up, down, left or right). Standing still is not allowed. Return true if the traveller can follow the whole plan, otherwise false. Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= plan.length <= 100000", "0 < plan[0][0] < plan[1][0] < ... <= 1000000000", "0 <= x, y <= 100000"],
    fn: {"name":"canFollowPlan","params":[{"name":"plan","type":"int[][]"}],"returns":"bool"},
    examples: [
      { input: [[[3,1,2],[6,1,1]]], output: true, explanation: "Reach (1, 2) in three steps, then (1, 1) in another three steps (for example by stepping away and back once)." },
      { input: [[[2,100,100]]], output: false },
    ],
    tests: [
      { input: [[[1,0,1]]], output: true },
      { input: [[[1,1,1]]], output: false },
      { input: [[[2,0,0]]], output: true },
      { input: [[[1,0,0]]], output: false },
      { input: [[[4,1,2]]], output: false },
      { input: [[[3,0,0]]], output: false },
      { input: [[[10,3,4],[11,3,5],[14,6,5]]], output: false },
      { input: [[[1000000000,100000,100000]]], output: true },
    ],
    hints: [
      "Check one leg at a time: from the previous point (and time) to the next. Which two numbers describe a leg?",
      "A leg takes dt time units and covers a Manhattan distance of d = |dx| + |dy|. You need d <= dt.",
      "Extra time must be burned in pairs of steps (step away and come back), so dt - d must also be even. Check both conditions for every leg, starting from (0, 0) at time 0.",
    ],
    solution: {
      idea: [
        "For each leg compute dt (time difference) and d (|dx| + |dy|). The leg is possible exactly when d <= dt and (dt - d) is even, because every wasted move has to be cancelled by a move back.",
        "All legs must be possible. Start from time 0 at (0, 0).",
      ],
      complexity: "O(n) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool canFollowPlan(vector<vector<int>> plan) {
        long long t = 0, x = 0, y = 0;
        for (auto& p : plan) {
            long long dt = p[0] - t, d = llabs(p[1] - x) + llabs(p[2] - y);
            if (d > dt || (dt - d) % 2 != 0) return false;
            t = p[0]; x = p[1]; y = p[2];
        }
        return true;
    }
};
`,
    },
  },
  {
    id: "c-atc-arc065-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abs/tasks/arc065_a",
    title: "Daydream (AtCoder ABC 049 C)",
    statement: [
      "You have an endless supply of four words: dream, dreamer, erase and eraser. Writing them one after another in any order and number gives a string. Return true if the string s can be produced this way, otherwise false.",
      "The tricky part is that the words overlap: the text dreamerase can be split as dream + erase, but a greedy reader that takes dreamer first gets stuck on ase. Think about how to decide without trying every split. Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= s.length <= 100000", "s contains only lowercase letters"],
    fn: {"name":"isDaydream","params":[{"name":"s","type":"string"}],"returns":"bool"},
    examples: [
      { input: ["erasedream"], output: true, explanation: "erase + dream." },
      { input: ["dreameraser"], output: true, explanation: "dream + eraser, or dreamer + aser fails; the first split works." },
      { input: ["dreamerer"], output: false },
    ],
    tests: [
      { input: ["dream"], output: true },
      { input: ["dreamer"], output: true },
      { input: ["erase"], output: true },
      { input: ["eraser"], output: true },
      { input: ["dreamerase"], output: true },
      { input: ["dreame"], output: false },
      { input: ["eraseer"], output: false },
      { input: ["dreamdreamerdream"], output: true },
    ],
    hints: [
      "A simple loop that checks 'does the text start with dream?' can go wrong when both dream and dreamer fit. A greedy choice from the front needs care.",
      "A known trick: reverse the text and the four words. In reversed form no word is the start of another one, so matching greedily from the front can never choose wrongly.",
      "Or use dynamic programming: ok[i] is true when the first i characters can be built. ok[0] = true, and ok[i] is true if some word w ends at i and ok[i - len(w)] is true.",
    ],
    solution: {
      idea: [
        "ok[i] says that the first i letters can be built from the words. Start with ok[0] = true. For each i, try each of the four words: if the word matches the letters just before i and ok[i - length] is true, then ok[i] is true. The answer is ok[n].",
      ],
      complexity: "O(n) time (4 comparisons of at most 7 letters per position), O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isDaydream(string s) {
        const vector<string> words = {"dream", "dreamer", "erase", "eraser"};
        int n = s.size();
        vector<char> ok(n + 1, 0);
        ok[0] = 1;
        for (int i = 1; i <= n; i++)
            for (auto& w : words) {
                int len = w.size();
                if (i >= len && ok[i - len] && s.compare(i - len, len, w) == 0) ok[i] = 1;
            }
        return ok[n];
    }
};
`,
    },
  },
];
