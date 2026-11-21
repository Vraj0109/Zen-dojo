import type { ProblemSpec } from "./types";

// Logic building: Codeforces problems, rewritten in our own words as functions (each links to the original). The expected outputs of every test were produced by running the C++ reference solution.

export const LOGIC_SPECS_CODEFORCES: ProblemSpec[] = [
  {
    id: "c-cf-4a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/4/A",
    title: "Watermelon (Codeforces 4A)",
    statement: [
      "Two friends want to share a watermelon that weighs w kilograms. Each must get a part whose weight is a positive even number of kilograms (the two parts need not be equal). Return true if that is possible.",
      "Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= w <= 100"],
    fn: {"name":"canSplitWatermelon","params":[{"name":"w","type":"int"}],"returns":"bool"},
    examples: [
      { input: [8], output: true, explanation: "2 + 6, or 4 + 4." },
      { input: [5], output: false },
    ],
    tests: [
      { input: [1], output: false },
      { input: [2], output: false },
      { input: [3], output: false },
      { input: [4], output: true },
      { input: [99], output: false },
      { input: [100], output: true },
    ],
    hints: [
      "Think about the sum of two even numbers. Does it have a particular parity?",
      "Both parts must be positive and even, so what is the smallest total they can make? What must w be for a split to exist?",
      "Check that w is even and that w is greater than 2.",
    ],
    solution: {
      idea: [
        "Two positive even parts exist exactly when w is even and at least 4: take 2 and w - 2.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool canSplitWatermelon(int w) { return w % 2 == 0 && w > 2; }
};
`,
    },
  },
  {
    id: "c-cf-1a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/1/A",
    title: "Theatre Square (Codeforces 1A)",
    statement: [
      "A rectangular square measures n by m metres and must be covered by square flagstones with side a metres. The stones cannot be broken, they may stick out past the edge, and their sides must be parallel to the sides of the square. Return the smallest number of stones that cover it completely.",
      "Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= n, m, a <= 10000000"],
    fn: {"name":"flagstones","params":[{"name":"n","type":"int"},{"name":"m","type":"int"},{"name":"a","type":"int"}],"returns":"long"},
    examples: [
      { input: [6,6,4], output: 4, explanation: "You need ceil(6 / 4) = 2 stones along each side: 2 * 2 = 4." },
      { input: [1,1,1], output: 1 },
    ],
    tests: [
      { input: [1,1,10000000], output: 1 },
      { input: [10,10,5], output: 4 },
      { input: [10,10,3], output: 16 },
      { input: [7,3,2], output: 8 },
      { input: [10000000,10000000,1], output: 100000000000000 },
      { input: [10000000,9999999,3], output: 11111112222222 },
    ],
    hints: [
      "Cover each side separately. How many stones of length a are needed to cover one side of length n?",
      "Covering a side may need one stone that overhangs. How do you round up in integer arithmetic?",
      "Round each side up as (length plus a minus 1) divided by a, then multiply the two counts.",
      "The product can reach about 10^14, so use 64-bit integers before multiplying.",
    ],
    solution: {
      idea: [
        "Stones needed along one side: ceil(n / a); along the other: ceil(m / a). Their product, computed in 64 bits, is the answer.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long flagstones(int n, int m, int a) {
        long long x = (n + (long long)a - 1) / a, y = (m + (long long)a - 1) / a;
        return x * y;
    }
};
`,
    },
  },
  {
    id: "c-cf-231a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/231/A",
    title: "Team (Codeforces 231A)",
    statement: [
      "Three friends take part in a contest. For each problem, each friend says whether he is sure about the solution (1) or not (0). The team writes a solution only if at least two of the three are sure.",
      "rows[i] holds the three answers for problem i. Return how many problems the team will solve. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= rows.length <= 1000", "rows[i] has three entries, each 0 or 1"],
    fn: {"name":"teamProblems","params":[{"name":"rows","type":"int[][]"}],"returns":"int"},
    examples: [
      { input: [[[1,1,0],[1,1,1],[1,0,0]]], output: 2 },
      { input: [[[1,0,0],[0,1,0]]], output: 0 },
    ],
    tests: [
      { input: [[[0,0,0]]], output: 0 },
      { input: [[[1,1,1]]], output: 1 },
      { input: [[[0,1,1],[1,0,1],[1,1,0]]], output: 3 },
      { input: [[[1,0,0],[0,1,0],[0,0,1]]], output: 0 },
      { input: [[[1,1,0],[0,0,0],[1,1,1],[0,0,1],[0,1,1]]], output: 3 },
      { input: [[[0,0,0],[0,0,0]]], output: 0 },
    ],
    hints: [
      "Each problem depends only on its own row. Can you decide each row on its own?",
      "A row counts when at least two of its three answers are 1. How can you count the 1s in a row?",
      "Add the three values of each row and count the rows where the sum is at least 2.",
    ],
    solution: {
      idea: [
        "Sum each row; count the rows with a sum of 2 or more.",
      ],
      complexity: "O(n) time.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int teamProblems(vector<vector<int>> rows) {
        int count = 0;
        for (auto& r : rows) if (r[0] + r[1] + r[2] >= 2) count++;
        return count;
    }
};
`,
    },
  },
  {
    id: "c-cf-158a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/158/A",
    title: "Next Round (Codeforces 158A)",
    statement: [
      "After a contest, the scores of n participants are given from the highest to the lowest (equal scores can repeat). The k-th place gets promoted, together with everyone who scored at least as much as them, but only players with a positive score can be promoted.",
      "Return how many participants are promoted. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= k <= scores.length <= 50", "0 <= scores[i] <= 100", "scores is sorted from highest to lowest"],
    fn: {"name":"nextRound","params":[{"name":"scores","type":"int[]"},{"name":"k","type":"int"}],"returns":"int"},
    examples: [
      { input: [[10,9,8,7,7,7,5,5],5], output: 6, explanation: "The 5th place has 7 points. Everyone with at least 7 is promoted: the first six." },
      { input: [[0,0,0,0],3], output: 0 },
    ],
    tests: [
      { input: [[5],1], output: 1 },
      { input: [[0],1], output: 0 },
      { input: [[3,2,1],3], output: 3 },
      { input: [[3,2,0],3], output: 2 },
      { input: [[1,1,1,1,1],1], output: 5 },
      { input: [[100,50,50,50,10],2], output: 4 },
    ],
    hints: [
      "The scores are already sorted from highest to lowest. What does that tell you about who gets promoted?",
      "The k-th place score is a threshold. Who scores at or above it, and do zero scores matter?",
      "Find the score at place k, then count the participants whose score is at least that and greater than zero.",
      "If the threshold is zero, nobody with a zero score is promoted. Since the list is sorted, you can stop at the first score below the threshold.",
    ],
    solution: {
      idea: [
        "Let t = scores[k - 1]. Count the participants whose score is at least t and greater than 0.",
      ],
      complexity: "O(n) time.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int nextRound(vector<int> scores, int k) {
        int t = scores[k - 1], count = 0;
        for (int s : scores) if (s >= t && s > 0) count++;
        return count;
    }
};
`,
    },
  },
  {
    id: "c-cf-50a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/50/A",
    title: "Domino Piling (Codeforces 50A)",
    statement: [
      "You have an m by n board of unit squares and as many 2 by 1 dominoes as you like. A domino can lie either way but must lie completely on the board, and dominoes cannot overlap. Return the largest number of dominoes that fit.",
      "Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= m, n <= 10000"],
    fn: {"name":"dominoPiling","params":[{"name":"m","type":"int"},{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [2,4], output: 4 },
      { input: [3,3], output: 4, explanation: "9 squares, each domino covers 2, so at most 4; and 4 can be placed." },
    ],
    tests: [
      { input: [1,1], output: 0 },
      { input: [1,2], output: 1 },
      { input: [1,10000], output: 5000 },
      { input: [10000,10000], output: 50000000 },
      { input: [9999,9999], output: 49990000 },
      { input: [5,7], output: 17 },
    ],
    hints: [
      "Each domino covers two squares. What is the most dominoes you could fit, even in theory?",
      "Could you always reach that bound? Think about tiling rows with horizontal dominoes and what odd sizes do.",
      "Multiply the two sizes and halve the total with integer division, rounding down.",
      "Use 64-bit integers for the product, to be safe.",
    ],
    solution: {
      idea: [
        "The bound m * n / 2 (rounded down) is reached by tiling rows with horizontal dominoes and handling a left-over column or row with vertical ones, so the answer is m * n / 2.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int dominoPiling(int m, int n) { return (int)((long long)m * n / 2); }
};
`,
    },
  },
  {
    id: "c-cf-263a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/263/A",
    title: "Beautiful Matrix (Codeforces 263A)",
    statement: [
      "A 5 by 5 matrix holds twenty-four 0s and a single 1. In one move you may swap two neighbouring rows or two neighbouring columns. The matrix is called beautiful when the 1 sits in the middle cell (row 2, column 2, counting from 0).",
      "Return the smallest number of moves that makes it beautiful. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["grid is 5 by 5", "exactly one cell is 1, all others are 0"],
    fn: {"name":"beautifulMatrix","params":[{"name":"grid","type":"int[][]"}],"returns":"int"},
    examples: [
      { input: [[[0,0,0,0,0],[0,0,0,0,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]], output: 3, explanation: "The 1 is at row 1, column 4: one row move and two column moves." },
    ],
    tests: [
      { input: [[[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0]]], output: 0 },
      { input: [[[1,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]], output: 4 },
      { input: [[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,1]]], output: 4 },
      { input: [[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,0,0,0],[0,0,0,0,0]]], output: 2 },
      { input: [[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,1,0],[0,0,0,0,0],[0,0,0,0,0]]], output: 1 },
      { input: [[[0,0,0,0,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]], output: 4 },
    ],
    hints: [
      "Only the position of the single 1 matters. Where is it, and where does it need to go?",
      "A row swap and a column swap change different coordinates. How many steps does each coordinate need?",
      "Add the distance of the row from the middle row to the distance of the column from the middle column.",
      "Scan the grid to find the 1, then take the absolute differences from the centre cell at row 2, column 2.",
    ],
    solution: {
      idea: [
        "Locate the 1 at (r, c). Each adjacent row swap changes r by one, each adjacent column swap changes c by one, so the minimum number of moves is |r - 2| + |c - 2|.",
      ],
      complexity: "O(25) = O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int beautifulMatrix(vector<vector<int>> grid) {
        for (int r = 0; r < 5; r++)
            for (int c = 0; c < 5; c++)
                if (grid[r][c] == 1) return abs(r - 2) + abs(c - 2);
        return -1;
    }
};
`,
    },
  },
  {
    id: "c-cf-546a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/546/A",
    title: "Soldier and Bananas (Codeforces 546A)",
    statement: [
      "A soldier wants to buy w bananas. The first banana costs k dollars, the second 2k, the third 3k, and so on up to the w-th, which costs w * k. He has n dollars.",
      "Return how many dollars he must borrow to buy all w bananas (0 if he has enough). Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= k, w <= 100000", "0 <= n <= 1000000000"],
    fn: {"name":"borrowMoney","params":[{"name":"k","type":"int"},{"name":"n","type":"int"},{"name":"w","type":"int"}],"returns":"long"},
    examples: [
      { input: [3,17,4], output: 13, explanation: "The bananas cost 3 + 6 + 9 + 12 = 30 and he has 17, so he borrows 13." },
      { input: [1,100,3], output: 0 },
    ],
    tests: [
      { input: [1,0,1], output: 1 },
      { input: [5,15,3], output: 15 },
      { input: [5,30,3], output: 0 },
      { input: [100000,0,100000], output: 500005000000000 },
      { input: [100000,1000000000,100000], output: 500004000000000 },
      { input: [2,5,10], output: 105 },
    ],
    hints: [
      "The price of each banana grows by a fixed amount. Can you find the total without adding the prices one by one?",
      "The total is k times the sum of the consecutive whole numbers from 1 to w.",
      "Use the formula for the sum of consecutive whole numbers, multiply by the unit price, then subtract the money he has, with zero as the floor.",
      "The total can reach about 5 * 10^14, so use 64-bit integers, and compute w times w plus 1 before dividing by 2.",
    ],
    solution: {
      idea: [
        "Total = k * w * (w + 1) / 2 in 64 bits; the amount to borrow is max(0, total - n).",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long borrowMoney(int k, int n, int w) {
        long long total = (long long)k * w * (w + 1) / 2;
        return max(0LL, total - n);
    }
};
`,
    },
  },
  {
    id: "c-cf-158b",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/158/B",
    title: "Taxi (Codeforces 158B)",
    statement: [
      "There are groups of schoolchildren who want to ride taxis. groups[i] (from 1 to 4) is the size of group i. A taxi seats four. A group must ride together in one taxi (it cannot be split), but a taxi may carry several groups as long as the total is at most four.",
      "Return the smallest number of taxis needed. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= groups.length <= 100000", "1 <= groups[i] <= 4"],
    fn: {"name":"taxi","params":[{"name":"groups","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[1,2,4,3,3]], output: 4, explanation: "Taxi 1: the group of 4. Taxi 2: 3 and 1. Taxi 3: the other 3. Taxi 4: 2." },
      { input: [[2,3,4,4,2,1,3,1]], output: 5 },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[4,4,4]], output: 3 },
      { input: [[2,2,2,2]], output: 2 },
      { input: [[1,1,1,1,1]], output: 2 },
      { input: [[3,3,3,1]], output: 3 },
      { input: [[2,1,1]], output: 1 },
      { input: [[3,2,2,1,1,1]], output: 3 },
    ],
    hints: [
      "Groups cannot be split, so each group is one unit. Which group sizes can share a taxi with which?",
      "Only the number of groups of each size matters. Which sizes fill a taxi by themselves, and which can pair with others?",
      "Give each group of four its own taxi, pair each three with a one, then pair the twos with each other and use the leftover room for ones.",
      "A single leftover group of two can take up to two ones. The remaining ones fill taxis of four, so divide by four and round up.",
    ],
    solution: {
      idea: [
        "Let c1..c4 be the counts. Taxis = c4 + c3 (each 3 gets its own taxi), and the 1s first fill those 3-taxis: c1 = max(0, c1 - c3).",
        "Then add c2 / 2 taxis for pairs of 2s. If c2 is odd, one more taxi holds that 2 and up to two 1s: subtract 2 from c1 (not below 0). Finally add ceil(c1 / 4) taxis for the remaining 1s.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int taxi(vector<int> groups) {
        int c[5] = {0, 0, 0, 0, 0};
        for (int g : groups) c[g]++;
        int taxis = c[4] + c[3];
        int ones = max(0, c[1] - c[3]);
        taxis += c[2] / 2;
        if (c[2] % 2) {
            taxis++;
            ones = max(0, ones - 2);
        }
        taxis += (ones + 3) / 4;
        return taxis;
    }
};
`,
    },
  },
  {
    id: "c-cf-363b",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/363/B",
    title: "Fence (Codeforces 363B)",
    statement: [
      "A fence has n planks in a row with heights h[0], h[1], ..., h[n - 1]. You want to cut out k consecutive planks so that the total height of the removed planks is as small as possible.",
      "Return the smallest start position (counted from 1) of a block of k consecutive planks whose total height is the minimum. The original lets you print any such position; here the smallest one is required so the answer is unique. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= k <= h.length <= 150000", "1 <= h[i] <= 100"],
    fn: {"name":"fenceStart","params":[{"name":"h","type":"int[]"},{"name":"k","type":"int"}],"returns":"int"},
    examples: [
      { input: [[1,2,6,1,1,7,1],3], output: 3, explanation: "The blocks have sums 9, 9, 8, 9, 9. The smallest sum, 8, is at planks 3 to 5." },
      { input: [[5,5,5],2], output: 1 },
    ],
    tests: [
      { input: [[4],1], output: 1 },
      { input: [[3,1,2],1], output: 2 },
      { input: [[9,9,9,1,1],2], output: 4 },
      { input: [[1,100,1,100,1],3], output: 1 },
      { input: [[7,7,7,7],4], output: 1 },
      { input: [[5,4,3,2,1],2], output: 4 },
      { input: [[2,2,1,3,2,2,1,3],2], output: 2 },
    ],
    hints: [
      "Adding up every block of k planks from scratch repeats a lot of work. What do two neighbouring blocks have in common?",
      "Moving the block one step changes only two planks: one enters and one leaves. How can you update the sum with that?",
      "Slide a window of length k, adjusting the sum by the entering plank minus the leaving plank, and track the smallest sum seen.",
      "Update the best only on a strictly smaller sum, so the earliest start wins ties, and convert the 0-based start to a 1-based one.",
    ],
    solution: {
      idea: [
        "Compute the sum of the first k planks, then slide the window one plank at a time: add the new plank, subtract the one that left. Keep the smallest sum and the first (1-based) start where it occurs.",
      ],
      complexity: "O(n) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int fenceStart(vector<int> h, int k) {
        long long sum = 0;
        for (int i = 0; i < k; i++) sum += h[i];
        long long best = sum;
        int start = 1;
        for (int i = k; i < (int)h.size(); i++) {
            sum += h[i] - h[i - k];
            if (sum < best) { best = sum; start = i - k + 2; }
        }
        return start;
    }
};
`,
    },
  },
  {
    id: "c-cf-580a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/580/A",
    title: "Kefa and First Steps (Codeforces 580A)",
    statement: [
      "Kefa recorded his daily earnings for n days as a list a. A non-decreasing subsegment is a block of consecutive days in which the earnings never go down from one day to the next.",
      "Return the length of the longest such block. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= a.length <= 100000", "1 <= a[i] <= 1000000000"],
    fn: {"name":"longestNonDecreasingRun","params":[{"name":"a","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[2,2,1,3,4,1]], output: 3, explanation: "The days 3 to 5 (1, 3, 4) never go down." },
      { input: [[2,2,9]], output: 3 },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[5,4,3,2,1]], output: 1 },
      { input: [[1,2,3,4,5]], output: 5 },
      { input: [[3,3,3,3]], output: 4 },
      { input: [[1,2,1,2,1,2]], output: 2 },
      { input: [[1000000000,1,1000000000]], output: 2 },
    ],
    hints: [
      "You need the longest run of consecutive days with no drop. Does the answer depend on anything beyond each day and the day before it?",
      "Only the comparison between each day and the day before matters. When does a run continue, and when does it break?",
      "Walk the list once, keeping the current run length and the best length. Extend the run when a day is not lower than the day before, otherwise reset it to 1.",
      "Equal neighbours count as non-decreasing, so they extend the run.",
    ],
    solution: {
      idea: [
        "Keep a counter run. For each i: if a[i] >= a[i - 1] add one to run, else reset run to 1. The answer is the largest run seen.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int longestNonDecreasingRun(vector<int> a) {
        int best = 1, run = 1;
        for (size_t i = 1; i < a.size(); i++) {
            run = a[i] >= a[i - 1] ? run + 1 : 1;
            best = max(best, run);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "c-cf-466a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/466/A",
    title: "Cheap Travel (Codeforces 466A)",
    statement: [
      "Ann will take n rides on the subway. A single ride ticket costs a. A special ticket gives m rides for b in total (you may use fewer than m of them, but you cannot carry them over).",
      "You may buy any number of both kinds of ticket. Return the smallest amount of money for n rides. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= n, m, a, b <= 1000"],
    fn: {"name":"cheapTravel","params":[{"name":"n","type":"int"},{"name":"m","type":"int"},{"name":"a","type":"int"},{"name":"b","type":"int"}],"returns":"int"},
    examples: [
      { input: [6,2,1,2], output: 6, explanation: "A special ticket costs 2 for 2 rides: the same as two single tickets. 6 rides cost 6." },
      { input: [5,2,2,3], output: 8 },
    ],
    tests: [
      { input: [1,1,1,1], output: 1 },
      { input: [1,10,5,3], output: 3 },
      { input: [10,3,1,100], output: 10 },
      { input: [10,3,5,6], output: 23 },
      { input: [1000,1000,1000,1], output: 1 },
      { input: [7,4,3,10], output: 19 },
    ],
    hints: [
      "Compare the price of a special ticket with the price of single tickets for the same number of rides. When is the special one worth it?",
      "The cheapest plan uses only a few options: all singles, some full bundles plus singles, or one extra bundle to cover the rest.",
      "Compute each option directly with division and remainder, then take the minimum. Do not overlook rounding up to one more bundle.",
      "Use 64-bit integers, since the price of many rides can be large. The options are closed form, so no loop is needed.",
    ],
    solution: {
      idea: [
        "Let full = n / m and rest = n % m. Candidates: (1) n * a, (2) (full + 1) * b, (3) full * b + rest * a. The answer is the smallest of the three; 3 covers the case where a special ticket is worth it only for full groups.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int cheapTravel(int n, int m, int a, int b) {
        int full = n / m, rest = n % m;
        return min({n * a, (full + 1) * b, full * b + rest * a});
    }
};
`,
    },
  },
  {
    id: "c-cf-1352c",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/1352/C",
    title: "K-th Not Divisible by n (Codeforces 1352C)",
    statement: [
      "List the positive whole numbers that are not divisible by n in increasing order. Return the k-th number of that list. For n = 3 the list is 1, 2, 4, 5, 7, 8, 10, ..., so for k = 7 the answer is 10.",
      "k can be as large as 10^9, so you cannot generate the list. Find a formula. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["2 <= n <= 1000000000", "1 <= k <= 1000000000"],
    fn: {"name":"kthNotDivisible","params":[{"name":"n","type":"int"},{"name":"k","type":"int"}],"returns":"long"},
    examples: [
      { input: [3,7], output: 10 },
      { input: [4,12], output: 15 },
    ],
    tests: [
      { input: [2,1], output: 1 },
      { input: [2,2], output: 3 },
      { input: [2,1000000000], output: 1999999999 },
      { input: [1000000000,1000000000], output: 1000000001 },
      { input: [1000000000,999999999], output: 999999999 },
      { input: [5,4], output: 4 },
      { input: [5,5], output: 6 },
    ],
    hints: [
      "In each block of n consecutive numbers, which ones are skipped?",
      "Each full group of n minus 1 allowed numbers includes exactly one skipped multiple. How many skipped numbers come before the k-th allowed one?",
      "Count how many full groups of n minus 1 come before k, and add that count to k directly.",
      "Use 64-bit integers, since k can be large.",
    ],
    solution: {
      idea: [
        "Before the k-th good number there are exactly (k - 1) / (n - 1) multiples of n. So the answer is k + (k - 1) / (n - 1), computed in 64-bit integers.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long kthNotDivisible(int n, int k) { return (long long)k + (k - 1) / (n - 1); }
};
`,
    },
  },
  {
    id: "c-cf-1475a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/1475/A",
    title: "Odd Divisor (Codeforces 1475A)",
    statement: [
      "Given a positive whole number n, decide whether it has an odd divisor greater than 1: an odd number x > 1 such that n divides evenly by x. Return true or false.",
      "n can be as large as 10^14, so you cannot try every divisor. Think about what n looks like when it has no odd divisor at all. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["2 <= n <= 100000000000000"],
    fn: {"name":"hasOddDivisor","params":[{"name":"n","type":"long"}],"returns":"bool"},
    examples: [
      { input: [6], output: true, explanation: "3 is an odd divisor of 6." },
      { input: [4], output: false },
    ],
    tests: [
      { input: [2], output: false },
      { input: [3], output: true },
      { input: [1024], output: false },
      { input: [1025], output: true },
      { input: [70368744177664], output: false },
      { input: [99999999999999], output: true },
      { input: [96], output: true },
    ],
    hints: [
      "Think about which numbers have no odd divisor greater than 1 at all. What do they look like?",
      "If you strip all factors of 2 from n, what is left? When is nothing left except 1?",
      "A power of two has exactly one set bit in binary, so n AND (n minus 1) is zero exactly for powers of two.",
      "Answer true when n is not a power of two. Treat n = 1 as a power of two, since it has no odd divisor above 1.",
    ],
    solution: {
      idea: [
        "Write n = 2^e * m with m odd. If m > 1, then m is an odd divisor; if m = 1, every divisor is a power of two. So the answer is true unless n is a power of two, which is the case when n & (n - 1) is 0.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool hasOddDivisor(long long n) { return (n & (n - 1)) != 0; }
};
`,
    },
  },
];
