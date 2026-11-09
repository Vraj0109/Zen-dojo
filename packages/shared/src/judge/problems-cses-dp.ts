import type { ProblemSpec } from "./types";

// CSES Dynamic Programming problem specifications.
// Statements, hints, and explanations are written for this app in our own words; the original tasks are linked.

export const CSES_SPECS_DP: ProblemSpec[] = [
  {
    "id": "cses-dice-combinations",
    "source": "cses",
    "title": "Dice Combinations",
    "url": "https://cses.fi/problemset/task/1633",
    "statement": [
      "Count the number of different ways to obtain a sum of n by throwing a standard six-sided die one or more times.",
      "Each throw produces an integer outcome between 1 and 6. For example, if n = 3, there are 4 ways: 1+1+1, 1+2, 2+1, and 3.",
      "Since the answer may be very large, return it modulo 10^9 + 7."
    ],
    "constraints": [
      "1 <= n <= 1000000"
    ],
    "fn": {
      "name": "diceCombinations",
      "params": [
        {
          "name": "n",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          3
        ],
        "output": 4,
        "explanation": "The 4 valid sequences of throws are 1+1+1, 1+2, 2+1, and 3."
      },
      {
        "input": [
          1
        ],
        "output": 1,
        "explanation": "Only a single roll of 1 produces sum 1."
      },
      {
        "input": [
          4
        ],
        "output": 8,
        "explanation": "The 8 sequences are 1+1+1+1, 1+1+2, 1+2+1, 2+1+1, 1+3, 3+1, 2+2, and 4."
      }
    ],
    "tests": [
      {
        "input": [
          2
        ],
        "output": 2
      },
      {
        "input": [
          5
        ],
        "output": 16
      },
      {
        "input": [
          6
        ],
        "output": 32
      },
      {
        "input": [
          7
        ],
        "output": 63
      },
      {
        "input": [
          8
        ],
        "output": 125
      },
      {
        "input": [
          10
        ],
        "output": 492
      },
      {
        "input": [
          30
        ],
        "output": 437513522
      },
      {
        "input": [
          100
        ],
        "output": 201345653
      },
      {
        "input": [
          500
        ],
        "output": 765996555
      },
      {
        "input": [
          1000
        ],
        "output": 937196411
      }
    ],
    "hints": [
      "Consider the last throw of the die. It could be any number d from 1 to 6 as long as d <= n.",
      "If the last roll was d, the previous rolls must have summed to n - d.",
      "Define dp[i] as the number of ways to reach sum i. Then dp[i] = dp[i-1] + dp[i-2] + ... + dp[i-6], taking modulo 10^9 + 7 at each addition. Base case: dp[0] = 1."
    ],
    "solution": {
      "idea": [
        "Let dp[i] be the number of ways to reach sum i with die rolls. To reach i, the final roll can be any value d in {1, 2, 3, 4, 5, 6} where d <= i.",
        "Therefore, dp[i] is the sum of dp[i - d] for all 1 <= d <= 6. We initialize dp[0] = 1 (one empty roll sequence reaches sum 0) and evaluate up to n modulo 10^9 + 7."
      ],
      "complexity": "O(n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int diceCombinations(int n) {\n        const int MOD = 1e9 + 7;\n        vector<int> dp(n + 1, 0);\n        dp[0] = 1;\n        for (int i = 1; i <= n; i++) {\n            for (int d = 1; d <= 6; d++) {\n                if (i >= d) {\n                    dp[i] = (dp[i] + dp[i - d]) % MOD;\n                }\n            }\n        }\n        return dp[n];\n    }\n};\n"
    }
  },
  {
    "id": "cses-minimizing-coins",
    "source": "cses",
    "title": "Minimizing Coins",
    "url": "https://cses.fi/problemset/task/1634",
    "statement": [
      "You are given a list of positive coin denominations and an integer target money sum.",
      "Your task is to form the target sum using the smallest possible number of coins. Each coin denomination can be used as many times as needed.",
      "If it is impossible to form the target sum, return -1."
    ],
    "constraints": [
      "1 <= coins.length <= 100",
      "1 <= target <= 1000000",
      "1 <= coins[i] <= 1000000"
    ],
    "fn": {
      "name": "minimizingCoins",
      "params": [
        {
          "name": "coins",
          "type": "int[]"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            1,
            5,
            7
          ],
          11
        ],
        "output": 3,
        "explanation": "11 can be formed as 5 + 5 + 1 using 3 coins."
      },
      {
        "input": [
          [
            3,
            5
          ],
          4
        ],
        "output": -1,
        "explanation": "No combination of 3s and 5s sums to 4."
      }
    ],
    "tests": [
      {
        "input": [
          [
            2,
            4,
            6
          ],
          7
        ],
        "output": -1
      },
      {
        "input": [
          [
            1
          ],
          10
        ],
        "output": 10
      },
      {
        "input": [
          [
            1,
            2,
            5
          ],
          13
        ],
        "output": 4
      },
      {
        "input": [
          [
            9,
            13
          ],
          22
        ],
        "output": 2
      },
      {
        "input": [
          [
            5,
            7
          ],
          12
        ],
        "output": 2
      },
      {
        "input": [
          [
            3,
            7,
            11
          ],
          100
        ],
        "output": 12
      },
      {
        "input": [
          [
            2,
            3,
            5
          ],
          1
        ],
        "output": -1
      },
      {
        "input": [
          [
            4,
            5
          ],
          17
        ],
        "output": 4
      }
    ],
    "hints": [
      "Let dp[x] be the minimum number of coins needed to produce sum x.",
      "For each sum x from 1 to target, try ending the sum with each coin c: dp[x] = min(dp[x], dp[x - c] + 1) whenever x >= c.",
      "Initialize dp[0] = 0 and all other dp[x] = infinity. If dp[target] is still infinity at the end, return -1."
    ],
    "solution": {
      "idea": [
        "This is the classic unbounded change-making problem. We define dp[x] as the minimum coins needed to make sum x.",
        "With dp[0] = 0 and all other entries set to infinity, we iterate x from 1 to target. For each available coin c <= x, we transition via dp[x] = min(dp[x], dp[x - c] + 1)."
      ],
      "complexity": "O(target * coins.length) time, O(target) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int minimizingCoins(vector<int>& coins, int target) {\n        const int INF = 1e9;\n        vector<int> dp(target + 1, INF);\n        dp[0] = 0;\n        for (int i = 1; i <= target; i++) {\n            for (int c : coins) {\n                if (i >= c && dp[i - c] != INF) {\n                    dp[i] = min(dp[i], dp[i - c] + 1);\n                }\n            }\n        }\n        return dp[target] >= INF ? -1 : dp[target];\n    }\n};\n"
    }
  },
  {
    "id": "cses-coin-combinations-i",
    "source": "cses",
    "title": "Coin Combinations I",
    "url": "https://cses.fi/problemset/task/1635",
    "statement": [
      "Given an array of distinct positive coin denominations and an integer target, determine the number of distinct ordered sequences of coins that sum to target.",
      "Two sequences with the same coin values in a different order are counted as different. For example, [2, 3] and [3, 2] are distinct ways to reach sum 5.",
      "Since the answer can be very large, return it modulo 10^9 + 7."
    ],
    "constraints": [
      "1 <= coins.length <= 100",
      "1 <= target <= 1000000",
      "1 <= coins[i] <= 1000000, all coin denominations are distinct"
    ],
    "fn": {
      "name": "coinCombinationsI",
      "params": [
        {
          "name": "coins",
          "type": "int[]"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            2,
            3,
            5
          ],
          9
        ],
        "output": 8,
        "explanation": "The 8 ordered ways are 2+2+5, 2+5+2, 5+2+2, 3+3+3, 2+2+2+3, 2+2+3+2, 2+3+2+2, and 3+2+2+2."
      },
      {
        "input": [
          [
            1,
            2
          ],
          3
        ],
        "output": 3,
        "explanation": "The 3 ordered ways are 1+1+1, 1+2, and 2+1."
      }
    ],
    "tests": [
      {
        "input": [
          [
            5
          ],
          4
        ],
        "output": 0
      },
      {
        "input": [
          [
            5
          ],
          10
        ],
        "output": 1
      },
      {
        "input": [
          [
            2,
            4
          ],
          6
        ],
        "output": 3
      },
      {
        "input": [
          [
            1,
            3,
            4
          ],
          5
        ],
        "output": 6
      },
      {
        "input": [
          [
            1,
            2,
            5
          ],
          7
        ],
        "output": 26
      },
      {
        "input": [
          [
            3,
            7
          ],
          11
        ],
        "output": 0
      },
      {
        "input": [
          [
            2,
            5,
            10
          ],
          20
        ],
        "output": 33
      },
      {
        "input": [
          [
            1,
            2,
            3,
            5
          ],
          15
        ],
        "output": 7949
      }
    ],
    "hints": [
      "Because order matters, consider which coin is placed last in the sequence.",
      "If the last coin placed is c, the preceding coins must have formed a sum of target - c.",
      "Iterate through sum s from 1 to target in the outer loop, and iterate over all coins c in the inner loop: dp[s] = (dp[s] + dp[s - c]) % MOD."
    ],
    "solution": {
      "idea": [
        "Since different permutations count as distinct combinations, we loop over the target sum in the outer loop and consider every possible coin that could be the last one added.",
        "Let dp[s] be the number of ordered sequences summing to s. For each s from 1 to target, dp[s] is the sum of dp[s - c] for all coins c <= s. Modulo is 10^9 + 7."
      ],
      "complexity": "O(target * coins.length) time, O(target) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinCombinationsI(vector<int>& coins, int target) {\n        const int MOD = 1e9 + 7;\n        vector<int> dp(target + 1, 0);\n        dp[0] = 1;\n        for (int i = 1; i <= target; i++) {\n            for (int c : coins) {\n                if (i >= c) {\n                    dp[i] = (dp[i] + dp[i - c]) % MOD;\n                }\n            }\n        }\n        return dp[target];\n    }\n};\n"
    }
  },
  {
    "id": "cses-coin-combinations-ii",
    "source": "cses",
    "title": "Coin Combinations II",
    "url": "https://cses.fi/problemset/task/1636",
    "statement": [
      "You are given a list of distinct positive coin denominations and an integer target sum.",
      "Calculate the number of distinct unordered ways to make the target sum using any number of each coin. For example, using coins 2 and 3 to make 5, {2, 3} and {3, 2} are considered the same combination and counted only once.",
      "Return the total number of unordered combinations modulo 10^9 + 7."
    ],
    "constraints": [
      "1 <= coins.length <= 100",
      "1 <= target <= 1000000",
      "1 <= coins[i] <= 1000000, all coin denominations are distinct"
    ],
    "fn": {
      "name": "coinCombinationsII",
      "params": [
        {
          "name": "coins",
          "type": "int[]"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            2,
            3,
            5
          ],
          9
        ],
        "output": 3,
        "explanation": "The 3 unordered ways are {2, 2, 5}, {3, 3, 3}, and {2, 2, 2, 3}."
      },
      {
        "input": [
          [
            1,
            2
          ],
          4
        ],
        "output": 3,
        "explanation": "The 3 combinations are {1, 1, 1, 1}, {1, 1, 2}, and {2, 2}."
      }
    ],
    "tests": [
      {
        "input": [
          [
            3
          ],
          5
        ],
        "output": 0
      },
      {
        "input": [
          [
            3
          ],
          9
        ],
        "output": 1
      },
      {
        "input": [
          [
            2,
            5
          ],
          10
        ],
        "output": 2
      },
      {
        "input": [
          [
            1,
            5,
            10
          ],
          12
        ],
        "output": 4
      },
      {
        "input": [
          [
            2,
            3,
            7
          ],
          14
        ],
        "output": 5
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4
          ],
          10
        ],
        "output": 23
      },
      {
        "input": [
          [
            4,
            6,
            8
          ],
          15
        ],
        "output": 0
      },
      {
        "input": [
          [
            2,
            4,
            6,
            8
          ],
          20
        ],
        "output": 23
      }
    ],
    "hints": [
      "To avoid counting different permutations of the same coins, consider the coins one by one in a fixed order.",
      "Process each coin type in an outer loop. When processing coin c, update all sums from c up to target.",
      "dp[s] represents the number of ways to form sum s using only the coin types processed so far: dp[s] = (dp[s] + dp[s - c]) % MOD."
    ],
    "solution": {
      "idea": [
        "This is the classic unbounded knapsack problem where order does not matter. By putting the coin loop on the outside, we enforce that coins are added in non-decreasing order of index, eliminating duplicate permutations.",
        "We initialize dp[0] = 1. For each coin c, we update dp[s] = (dp[s] + dp[s - c]) % MOD for s from c up to target."
      ],
      "complexity": "O(target * coins.length) time, O(target) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinCombinationsII(vector<int>& coins, int target) {\n        const int MOD = 1e9 + 7;\n        vector<int> dp(target + 1, 0);\n        dp[0] = 1;\n        for (int c : coins) {\n            for (int i = c; i <= target; i++) {\n                dp[i] = (dp[i] + dp[i - c]) % MOD;\n            }\n        }\n        return dp[target];\n    }\n};\n"
    }
  },
  {
    "id": "cses-removing-digits",
    "source": "cses",
    "title": "Removing Digits",
    "url": "https://cses.fi/problemset/task/1637",
    "statement": [
      "You are given a positive integer n. In one step, you can subtract any non-zero digit that appears in the decimal representation of the current number.",
      "What is the minimum number of steps required to reduce n to 0?"
    ],
    "constraints": [
      "1 <= n <= 1000000"
    ],
    "fn": {
      "name": "removingDigits",
      "params": [
        {
          "name": "n",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          27
        ],
        "output": 5,
        "explanation": "One optimal sequence is 27 -> 20 -> 18 -> 10 -> 9 -> 0, taking 5 steps."
      },
      {
        "input": [
          9
        ],
        "output": 1,
        "explanation": "Subtract 9 to reach 0 in 1 step."
      }
    ],
    "tests": [
      {
        "input": [
          1
        ],
        "output": 1
      },
      {
        "input": [
          10
        ],
        "output": 2
      },
      {
        "input": [
          15
        ],
        "output": 3
      },
      {
        "input": [
          23
        ],
        "output": 5
      },
      {
        "input": [
          54
        ],
        "output": 10
      },
      {
        "input": [
          100
        ],
        "output": 17
      },
      {
        "input": [
          1000
        ],
        "output": 153
      },
      {
        "input": [
          99999
        ],
        "output": 13350
      }
    ],
    "hints": [
      "For any number x, check every non-zero digit d that appears in x.",
      "The subproblem dp[x] represents the minimum steps to reach 0 from x: dp[x] = 1 + min(dp[x - d]) over all digits d in x.",
      "Alternatively, observe that greedily subtracting the largest digit in x is always optimal and runs even faster!"
    ],
    "solution": {
      "idea": [
        "At any number x, choosing the maximum digit present in x yields the largest possible decrease, which greedily minimizes the total number of steps to reach 0.",
        "Dynamic programming also works: dp[x] = 1 + min(dp[x - d]) for all non-zero digits d in x, with base case dp[0] = 0. Both approaches yield the same optimal answer."
      ],
      "complexity": "O(steps * log10(n)) time using greedy, O(1) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int removingDigits(int n) {\n        int steps = 0;\n        while (n > 0) {\n            int temp = n, maxD = 0;\n            while (temp > 0) {\n                maxD = max(maxD, temp % 10);\n                temp /= 10;\n            }\n            n -= maxD;\n            steps++;\n        }\n        return steps;\n    }\n};\n"
    }
  },
  {
    "id": "cses-grid-paths-i",
    "source": "cses",
    "title": "Grid Paths",
    "url": "https://cses.fi/problemset/task/1638",
    "statement": [
      "Consider an n x n grid where each cell is either empty (represented by '.') or blocked by a trap (represented by '*').",
      "You start at the top-left cell (0, 0) and wish to reach the bottom-right cell (n - 1, n - 1). From any cell, you may only move one step to the right or one step down, and you cannot visit any cell with a trap.",
      "Count the number of paths from the start to the destination. If the start or destination cell has a trap, the answer is 0. Return the count modulo 10^9 + 7."
    ],
    "constraints": [
      "1 <= grid.length <= 1000",
      "grid[i].length == grid.length",
      "Each character in grid[i] is either '.' or '*'"
    ],
    "fn": {
      "name": "gridPaths",
      "params": [
        {
          "name": "grid",
          "type": "string[]"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            "....",
            ".*..",
            "...*",
            "*..."
          ]
        ],
        "output": 3,
        "explanation": "There are 3 valid paths from top-left to bottom-right that avoid all traps."
      },
      {
        "input": [
          [
            "*",
            "."
          ]
        ],
        "output": 0,
        "explanation": "The starting cell contains a trap, so no path exists."
      }
    ],
    "tests": [
      {
        "input": [
          [
            "."
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            "..",
            ".."
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            "..",
            ".*"
          ]
        ],
        "output": 0
      },
      {
        "input": [
          [
            "...",
            ".*.",
            "..."
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            ".*.",
            "***",
            "..."
          ]
        ],
        "output": 0
      },
      {
        "input": [
          [
            "....",
            "....",
            "....",
            "...."
          ]
        ],
        "output": 20
      },
      {
        "input": [
          [
            ".*..",
            "..*.",
            "...*",
            "...."
          ]
        ],
        "output": 5
      },
      {
        "input": [
          [
            "..",
            "*."
          ]
        ],
        "output": 1
      }
    ],
    "hints": [
      "If grid[0][0] or grid[n-1][n-1] is '*', you immediately have 0 paths.",
      "To reach cell (r, c), you can only come from (r - 1, c) or (r, c - 1).",
      "Maintain a DP table dp[r][c] = (dp[r-1][c] + dp[r][c-1]) % MOD for non-trap cells. You can optimize space to a single 1D array of size n."
    ],
    "solution": {
      "idea": [
        "Let dp[r][c] be the number of paths from (0,0) to (r,c). If grid[r][c] is '*', dp[r][c] = 0. Otherwise dp[r][c] = (dp[r-1][c] + dp[r][c-1]) % MOD.",
        "Since each row only depends on the previous row and the current row's left neighbor, we can compress the table to an array of size n."
      ],
      "complexity": "O(n^2) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int gridPaths(vector<string>& grid) {\n        int n = grid.size();\n        if (n == 0 || grid[0][0] == '*' || grid[n - 1][n - 1] == '*') return 0;\n        const int MOD = 1e9 + 7;\n        vector<int> dp(n, 0);\n        dp[0] = 1;\n        for (int r = 0; r < n; r++) {\n            for (int c = 0; c < n; c++) {\n                if (grid[r][c] == '*') {\n                    dp[c] = 0;\n                } else if (c > 0) {\n                    dp[c] = (dp[c] + dp[c - 1]) % MOD;\n                }\n            }\n        }\n        return dp[n - 1];\n    }\n};\n"
    }
  },
  {
    "id": "cses-book-shop",
    "source": "cses",
    "title": "Book Shop",
    "url": "https://cses.fi/problemset/task/1158",
    "statement": [
      "You are in a book shop which has n different books. For each book, you know its price and the total number of pages it contains.",
      "You have a budget of maxPrice and you want to maximize the total number of pages you can buy. Each book can be bought at most once.",
      "Return the maximum number of pages you can buy without exceeding the total price maxPrice."
    ],
    "constraints": [
      "1 <= prices.length == pages.length <= 1000",
      "1 <= maxPrice <= 100000",
      "1 <= prices[i], pages[i] <= 1000"
    ],
    "fn": {
      "name": "bookShop",
      "params": [
        {
          "name": "prices",
          "type": "int[]"
        },
        {
          "name": "pages",
          "type": "int[]"
        },
        {
          "name": "maxPrice",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            4,
            8,
            5,
            3
          ],
          [
            5,
            12,
            8,
            1
          ],
          10
        ],
        "output": 13,
        "explanation": "Buy books at index 0 (price 4, pages 5) and index 2 (price 5, pages 8). Total price 9 <= 10, total pages 13."
      },
      {
        "input": [
          [
            2,
            3,
            5
          ],
          [
            10,
            20,
            40
          ],
          1
        ],
        "output": 0,
        "explanation": "Every book costs more than maxPrice, so 0 pages can be bought."
      }
    ],
    "tests": [
      {
        "input": [
          [
            5
          ],
          [
            10
          ],
          5
        ],
        "output": 10
      },
      {
        "input": [
          [
            5
          ],
          [
            10
          ],
          4
        ],
        "output": 0
      },
      {
        "input": [
          [
            1,
            2,
            3
          ],
          [
            10,
            20,
            30
          ],
          5
        ],
        "output": 50
      },
      {
        "input": [
          [
            2,
            3,
            4,
            5
          ],
          [
            3,
            4,
            5,
            6
          ],
          5
        ],
        "output": 7
      },
      {
        "input": [
          [
            10,
            20,
            30
          ],
          [
            60,
            100,
            120
          ],
          50
        ],
        "output": 220
      },
      {
        "input": [
          [
            1,
            1,
            1
          ],
          [
            5,
            5,
            5
          ],
          2
        ],
        "output": 10
      },
      {
        "input": [
          [
            7,
            8,
            9
          ],
          [
            14,
            16,
            18
          ],
          15
        ],
        "output": 30
      },
      {
        "input": [
          [
            3,
            4,
            5,
            6
          ],
          [
            10,
            15,
            20,
            25
          ],
          11
        ],
        "output": 45
      }
    ],
    "hints": [
      "This is the classic 0/1 knapsack problem where prices are the item weights and pages are the values.",
      "Let dp[w] be the maximum pages you can get with total cost at most w.",
      "For each book, iterate backwards from maxPrice down to its price: dp[w] = max(dp[w], dp[w - price] + pages)."
    ],
    "solution": {
      "idea": [
        "Standard 0/1 knapsack dynamic programming. Let dp[w] be the maximum pages obtainable with at most w budget.",
        "For each book with cost p and pages pg, we traverse the budget capacity backwards from maxPrice down to p to ensure each book is used at most once: dp[w] = max(dp[w], dp[w - p] + pg)."
      ],
      "complexity": "O(n * maxPrice) time, O(maxPrice) space where n = prices.length.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int bookShop(vector<int>& prices, vector<int>& pages, int maxPrice) {\n        vector<int> dp(maxPrice + 1, 0);\n        int n = prices.size();\n        for (int i = 0; i < n; i++) {\n            int p = prices[i], pg = pages[i];\n            for (int j = maxPrice; j >= p; j--) {\n                dp[j] = max(dp[j], dp[j - p] + pg);\n            }\n        }\n        return dp[maxPrice];\n    }\n};\n"
    }
  },
  {
    "id": "cses-array-description",
    "source": "cses",
    "title": "Array Description",
    "url": "https://cses.fi/problemset/task/1746",
    "statement": [
      "You are given an array of n integers where each element is between 1 and m. Some elements are unknown and represented as 0.",
      "An array is valid if every element is between 1 and m, and the absolute difference between any two adjacent elements is at most 1 (that is, |arr[i] - arr[i - 1]| <= 1 for all i >= 1).",
      "Determine the number of valid arrays that match the given initial values. Since the answer can be large, return it modulo 10^9 + 7."
    ],
    "constraints": [
      "1 <= arr.length <= 100000",
      "1 <= m <= 100",
      "0 <= arr[i] <= m"
    ],
    "fn": {
      "name": "arrayDescription",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
        },
        {
          "name": "m",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            2,
            0,
            2
          ],
          5
        ],
        "output": 3,
        "explanation": "The unknown middle value can be 1, 2, or 3, yielding [2, 1, 2], [2, 2, 2], and [2, 3, 2]."
      },
      {
        "input": [
          [
            0,
            0
          ],
          2
        ],
        "output": 4,
        "explanation": "With m = 2, the valid arrays of length 2 are [1, 1], [1, 2], [2, 1], and [2, 2]."
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            3
          ],
          5
        ],
        "output": 0
      },
      {
        "input": [
          [
            1,
            2,
            3
          ],
          5
        ],
        "output": 1
      },
      {
        "input": [
          [
            0
          ],
          10
        ],
        "output": 10
      },
      {
        "input": [
          [
            0,
            0
          ],
          3
        ],
        "output": 7
      },
      {
        "input": [
          [
            2,
            0,
            0,
            3
          ],
          5
        ],
        "output": 6
      },
      {
        "input": [
          [
            0,
            5,
            0,
            5
          ],
          5
        ],
        "output": 4
      },
      {
        "input": [
          [
            1,
            0,
            0,
            0,
            1
          ],
          3
        ],
        "output": 9
      },
      {
        "input": [
          [
            2,
            1,
            0,
            2,
            3
          ],
          4
        ],
        "output": 2
      }
    ],
    "hints": [
      "Notice that each element only constraints its immediate neighbors. This naturally suggests processing from left to right.",
      "Let dp[v] be the number of valid prefixes ending at index i with value v, for 1 <= v <= m.",
      "For the next element, if arr[i] == 0, v can take any value in 1..m; otherwise v must equal arr[i]. Then new_dp[v] = dp[v - 1] + dp[v] + dp[v + 1]."
    ],
    "solution": {
      "idea": [
        "We process the array from left to right. Maintain dp[v], the number of valid prefix arrays ending with value v at the current index.",
        "For the next index, a value v (1 <= v <= m) can be reached from v - 1, v, or v + 1 at the previous index. If arr[i] != 0 and arr[i] != v, the count is 0.",
        "At the end, sum dp[v] for all 1 <= v <= m modulo 10^9 + 7."
      ],
      "complexity": "O(n * m) time, O(m) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int arrayDescription(vector<int>& arr, int m) {\n        const int MOD = 1e9 + 7;\n        int n = arr.size();\n        vector<int> dp(m + 2, 0);\n        if (arr[0] == 0) {\n            for (int v = 1; v <= m; v++) dp[v] = 1;\n        } else {\n            dp[arr[0]] = 1;\n        }\n        for (int i = 1; i < n; i++) {\n            vector<int> next_dp(m + 2, 0);\n            int lo = (arr[i] == 0) ? 1 : arr[i];\n            int hi = (arr[i] == 0) ? m : arr[i];\n            for (int v = lo; v <= hi; v++) {\n                long long ways = (long long)dp[v - 1] + dp[v] + dp[v + 1];\n                next_dp[v] = ways % MOD;\n            }\n            dp = move(next_dp);\n        }\n        int ans = 0;\n        for (int v = 1; v <= m; v++) {\n            ans = (ans + dp[v]) % MOD;\n        }\n        return ans;\n    }\n};\n"
    }
  },
  {
    "id": "cses-edit-distance",
    "source": "cses",
    "title": "Edit Distance",
    "url": "https://cses.fi/problemset/task/1639",
    "statement": [
      "The edit distance between two strings is the minimum number of single-character operations required to transform one string into the other.",
      "The allowed operations are: inserting a character, deleting a character, or replacing a character with another.",
      "Given two strings s1 and s2, calculate and return their edit distance."
    ],
    "constraints": [
      "1 <= s1.length, s2.length <= 5000",
      "s1 and s2 consist only of uppercase and lowercase English letters"
    ],
    "fn": {
      "name": "editDistance",
      "params": [
        {
          "name": "s1",
          "type": "string"
        },
        {
          "name": "s2",
          "type": "string"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          "LOVE",
          "MOVIE"
        ],
        "output": 2,
        "explanation": "Replace 'L' with 'M' and insert 'I': LOVE -> MOVE -> MOVIE."
      },
      {
        "input": [
          "ABC",
          "ABC"
        ],
        "output": 0,
        "explanation": "The strings are already identical, so 0 operations are required."
      }
    ],
    "tests": [
      {
        "input": [
          "A",
          "B"
        ],
        "output": 1
      },
      {
        "input": [
          "FOOD",
          "MONEY"
        ],
        "output": 4
      },
      {
        "input": [
          "INTENTION",
          "EXECUTION"
        ],
        "output": 5
      },
      {
        "input": [
          "ALGORITHM",
          "LOGARITHM"
        ],
        "output": 3
      },
      {
        "input": [
          "SHORT",
          "VERYLONGSTRING"
        ],
        "output": 12
      },
      {
        "input": [
          "AAA",
          "AAAAAA"
        ],
        "output": 3
      },
      {
        "input": [
          "KITTEN",
          "SITTING"
        ],
        "output": 3
      },
      {
        "input": [
          "HORSE",
          "ROS"
        ],
        "output": 3
      }
    ],
    "hints": [
      "Let dp[i][j] denote the edit distance between s1[0..i-1] and s2[0..j-1].",
      "If s1[i-1] == s2[j-1], the characters match without any cost: dp[i][j] = dp[i-1][j-1].",
      "Otherwise, consider the three operations: delete (dp[i-1][j] + 1), insert (dp[i][j-1] + 1), or replace (dp[i-1][j-1] + 1)."
    ],
    "solution": {
      "idea": [
        "Standard Wagner-Fischer dynamic programming algorithm for Levenshtein distance.",
        "dp[i][j] is the edit distance between s1's prefix of length i and s2's prefix of length j. If characters match, dp[i][j] = dp[i-1][j-1]. Otherwise, it is 1 + min of deletion, insertion, and substitution.",
        "We can optimize space to two rows: previous and current."
      ],
      "complexity": "O(n * m) time, O(m) space where n = s1.length and m = s2.length.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int editDistance(string s1, string s2) {\n        int n = s1.size(), m = s2.size();\n        vector<int> prev(m + 1), curr(m + 1);\n        for (int j = 0; j <= m; j++) prev[j] = j;\n        for (int i = 1; i <= n; i++) {\n            curr[0] = i;\n            for (int j = 1; j <= m; j++) {\n                if (s1[i - 1] == s2[j - 1]) {\n                    curr[j] = prev[j - 1];\n                } else {\n                    curr[j] = 1 + min({prev[j], curr[j - 1], prev[j - 1]});\n                }\n            }\n            prev = curr;\n        }\n        return prev[m];\n    }\n};\n"
    }
  },
  {
    "id": "cses-rectangle-cutting",
    "source": "cses",
    "title": "Rectangle Cutting",
    "url": "https://cses.fi/problemset/task/1744",
    "statement": [
      "Given an a x b rectangle, your task is to cut it into squares using the minimum number of straight cuts.",
      "On each cut, you choose one rectangle and make a straight cut from one side to the opposite side, either horizontally or vertically, dividing it into two smaller rectangles.",
      "Return the minimum number of cuts needed until all remaining pieces are squares."
    ],
    "constraints": [
      "1 <= a, b <= 500"
    ],
    "fn": {
      "name": "rectangleCutting",
      "params": [
        {
          "name": "a",
          "type": "int"
        },
        {
          "name": "b",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          3,
          5
        ],
        "output": 3,
        "explanation": "Cut 3x5 into 3x3 and 3x2 (1 cut). Then cut 3x2 into 2x2 and 1x2 (2 cuts). Then cut 1x2 into two 1x1 squares (3 cuts total)."
      },
      {
        "input": [
          4,
          4
        ],
        "output": 0,
        "explanation": "The rectangle is already a square, requiring 0 cuts."
      }
    ],
    "tests": [
      {
        "input": [
          1,
          1
        ],
        "output": 0
      },
      {
        "input": [
          1,
          5
        ],
        "output": 4
      },
      {
        "input": [
          2,
          3
        ],
        "output": 2
      },
      {
        "input": [
          4,
          6
        ],
        "output": 2
      },
      {
        "input": [
          5,
          6
        ],
        "output": 4
      },
      {
        "input": [
          10,
          15
        ],
        "output": 2
      },
      {
        "input": [
          11,
          13
        ],
        "output": 7
      },
      {
        "input": [
          13,
          29
        ],
        "output": 8
      }
    ],
    "hints": [
      "If the rectangle is already a square (a == b), 0 cuts are needed.",
      "Otherwise, any first cut must split either the width into k and a - k (for 1 <= k < a), or the height into k and b - k (for 1 <= k < b).",
      "Because a and b are at most 500, compute dp[w][h] = min(horizontal cuts, vertical cuts) + 1. Note that dp[w][h] = dp[h][w] by symmetry."
    ],
    "solution": {
      "idea": [
        "Let dp[w][h] be the minimum cuts to partition a w x h rectangle into squares. If w == h, dp[w][h] = 0.",
        "Otherwise, we try every possible first cut: horizontally at height k (1 <= k < h) giving dp[w][k] + dp[w][h - k] + 1, or vertically at width k (1 <= k < w) giving dp[k][h] + dp[w - k][h] + 1.",
        "By computing values in order of increasing width and height, this 2D DP solves the problem efficiently."
      ],
      "complexity": "O(a * b * (a + b)) time, O(a * b) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int rectangleCutting(int a, int b) {\n        vector<vector<int>> dp(a + 1, vector<int>(b + 1, 0));\n        for (int w = 1; w <= a; w++) {\n            for (int h = 1; h <= b; h++) {\n                if (w == h) {\n                    dp[w][h] = 0;\n                    continue;\n                }\n                int best = 1e9;\n                for (int k = 1; k < w; k++) {\n                    best = min(best, dp[k][h] + dp[w - k][h] + 1);\n                }\n                for (int k = 1; k < h; k++) {\n                    best = min(best, dp[w][k] + dp[w][h - k] + 1);\n                }\n                dp[w][h] = best;\n            }\n        }\n        return dp[a][b];\n    }\n};\n"
    }
  },
  {
    "id": "cses-money-sums",
    "source": "cses",
    "title": "Money Sums",
    "url": "https://cses.fi/problemset/task/1745",
    "statement": [
      "You are given a collection of n coins with positive values.",
      "Determine all distinct money sums that can be produced using some non-empty subset of the coins.",
      "Return all reachable sums as an array of integers sorted in strictly ascending order."
    ],
    "constraints": [
      "1 <= coins.length <= 100",
      "1 <= coins[i] <= 1000",
      "The sum of all coin values will not exceed 100000"
    ],
    "fn": {
      "name": "moneySums",
      "params": [
        {
          "name": "coins",
          "type": "int[]"
        }
      ],
      "returns": "int[]"
    },
    "examples": [
      {
        "input": [
          [
            4,
            2,
            5,
            2
          ]
        ],
        "output": [
          2,
          4,
          5,
          6,
          7,
          8,
          9,
          11,
          13
        ],
        "explanation": "The possible non-empty subset sums are 2, 4, 6, 7, 8, 9, 11, and 13."
      },
      {
        "input": [
          [
            3
          ]
        ],
        "output": [
          3
        ],
        "explanation": "With only one coin of value 3, the only possible sum is 3."
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2
          ]
        ],
        "output": [
          1,
          2,
          3
        ]
      },
      {
        "input": [
          [
            2,
            2,
            2
          ]
        ],
        "output": [
          2,
          4,
          6
        ]
      },
      {
        "input": [
          [
            1,
            3,
            5
          ]
        ],
        "output": [
          1,
          3,
          4,
          5,
          6,
          8,
          9
        ]
      },
      {
        "input": [
          [
            5,
            10,
            15
          ]
        ],
        "output": [
          5,
          10,
          15,
          20,
          25,
          30
        ]
      },
      {
        "input": [
          [
            1,
            2,
            4,
            8
          ]
        ],
        "output": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15
        ]
      },
      {
        "input": [
          [
            10,
            20,
            30,
            40
          ]
        ],
        "output": [
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ]
      },
      {
        "input": [
          [
            7,
            3,
            4
          ]
        ],
        "output": [
          3,
          4,
          7,
          10,
          11,
          14
        ]
      },
      {
        "input": [
          [
            1,
            1,
            2,
            3,
            5
          ]
        ],
        "output": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12
        ]
      }
    ],
    "hints": [
      "Let dp[s] be a boolean indicating whether sum s is reachable using a subset of coins.",
      "For each coin c, update reachable sums from maximum sum down to c: if dp[s - c] is true, then dp[s] becomes true.",
      "A bitset allows performing this transition for all sums simultaneously with bs |= (bs << c), running in microseconds."
    ],
    "solution": {
      "idea": [
        "This is the subset sum reachability problem. We maintain a boolean reachability array or bitset of size up to 100,001 with base state dp[0] = true.",
        "For each coin c, a bitset shift bs |= (bs << c) updates all achievable sums in parallel in 64-bit chunks.",
        "Finally, we collect all positive sums s where bs[s] is set."
      ],
      "complexity": "O(n * max_sum / 64) time, O(max_sum) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> moneySums(vector<int>& coins) {\n        bitset<100001> bs;\n        bs[0] = 1;\n        int maxSum = 0;\n        for (int c : coins) {\n            bs |= (bs << c);\n            maxSum += c;\n        }\n        vector<int> res;\n        for (int s = 1; s <= min(maxSum, 100000); s++) {\n            if (bs[s]) res.push_back(s);\n        }\n        return res;\n    }\n};\n"
    }
  },
  {
    "id": "cses-removal-game",
    "source": "cses",
    "title": "Removal Game",
    "url": "https://cses.fi/problemset/task/1097",
    "statement": [
      "There is a list of n numbers. Two players take turns removing either the first or last remaining number from the list and adding its value to their personal score.",
      "Both players play optimally to maximize their own total score. Player 1 moves first.",
      "Determine the maximum total score Player 1 can achieve."
    ],
    "constraints": [
      "1 <= arr.length <= 5000",
      "-1000000000 <= arr[i] <= 1000000000",
      "Return a 64-bit integer, as the score may exceed 32 bits"
    ],
    "fn": {
      "name": "removalGame",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
        }
      ],
      "returns": "long"
    },
    "examples": [
      {
        "input": [
          [
            4,
            5,
            1,
            3
          ]
        ],
        "output": 8,
        "explanation": "Player 1 takes 3 or 4 to maximize score; under optimal play Player 1 scores 8."
      },
      {
        "input": [
          [
            10
          ]
        ],
        "output": 10,
        "explanation": "Player 1 takes the only element and scores 10."
      }
    ],
    "tests": [
      {
        "input": [
          [
            2,
            1
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            1,
            2,
            3
          ]
        ],
        "output": 4
      },
      {
        "input": [
          [
            1,
            100,
            2
          ]
        ],
        "output": 3
      },
      {
        "input": [
          [
            5,
            3,
            4,
            5
          ]
        ],
        "output": 9
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5,
            6
          ]
        ],
        "output": 12
      },
      {
        "input": [
          [
            10,
            -5,
            20,
            -10
          ]
        ],
        "output": 30
      },
      {
        "input": [
          [
            -1,
            -2,
            -3
          ]
        ],
        "output": -4
      },
      {
        "input": [
          [
            7,
            1,
            5,
            3,
            6,
            4
          ]
        ],
        "output": 18
      }
    ],
    "hints": [
      "Instead of tracking both players' scores, track the difference: (current player score) - (opponent score).",
      "For a subarray arr[i..j], the current player can pick arr[i] or arr[j]. The remaining subarray will be played optimally by the opponent.",
      "Let dp[i][j] = max(arr[i] - dp[i+1][j], arr[j] - dp[i][j-1]). Once dp[0][n-1] is known, P1 - P2 = dp[0][n-1] and P1 + P2 = sum(arr), so P1 = (sum + dp[0][n-1]) / 2."
    ],
    "solution": {
      "idea": [
        "Let dp[i][j] be the maximum score difference (first player - second player) achievable on the subarray arr[i..j].",
        "When choosing arr[i], the opponent achieves dp[i+1][j], so the net gain is arr[i] - dp[i+1][j]. Symmetrically, taking arr[j] yields arr[j] - dp[i][j-1]. Thus dp[i][j] = max(arr[i] - dp[i+1][j], arr[j] - dp[i][j-1]).",
        "Since P1 + P2 = totalSum and P1 - P2 = dp[0][n-1], we have P1 = (totalSum + dp[0][n-1]) / 2. We can optimize space to O(n)."
      ],
      "complexity": "O(n^2) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long removalGame(vector<int>& arr) {\n        int n = arr.size();\n        long long total = 0;\n        for (int x : arr) total += x;\n        vector<long long> dp(arr.begin(), arr.end());\n        for (int len = 2; len <= n; len++) {\n            for (int i = 0; i <= n - len; i++) {\n                int j = i + len - 1;\n                dp[i] = max((long long)arr[i] - dp[i + 1], (long long)arr[j] - dp[i]);\n            }\n        }\n        return (total + dp[0]) / 2;\n    }\n};\n"
    }
  },
  {
    "id": "cses-two-sets-ii",
    "source": "cses",
    "title": "Two Sets II",
    "url": "https://cses.fi/problemset/task/1093",
    "statement": [
      "Count the number of ways to partition the set of numbers {1, 2, ..., n} into two subsets with equal sum.",
      "The two subsets are unordered; for example, if n = 4, the partition into {1, 4} and {2, 3} is identical to {2, 3} and {1, 4} and should be counted only once.",
      "Return the number of valid divisions modulo 10^9 + 7."
    ],
    "constraints": [
      "1 <= n <= 500"
    ],
    "fn": {
      "name": "twoSetsII",
      "params": [
        {
          "name": "n",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          7
        ],
        "output": 4,
        "explanation": "Total sum is 28. Half is 14. The 4 divisions are {1,6,7}/{2,3,4,5}, {2,5,7}/{1,3,4,6}, {3,4,7}/{1,2,5,6}, and {1,2,4,7}/{3,5,6}."
      },
      {
        "input": [
          4
        ],
        "output": 1,
        "explanation": "Total sum is 10. The only partition into equal sums of 5 is {1, 4} and {2, 3}."
      }
    ],
    "tests": [
      {
        "input": [
          1
        ],
        "output": 0
      },
      {
        "input": [
          2
        ],
        "output": 0
      },
      {
        "input": [
          3
        ],
        "output": 1
      },
      {
        "input": [
          8
        ],
        "output": 7
      },
      {
        "input": [
          11
        ],
        "output": 35
      },
      {
        "input": [
          15
        ],
        "output": 361
      },
      {
        "input": [
          16
        ],
        "output": 657
      },
      {
        "input": [
          20
        ],
        "output": 7636
      }
    ],
    "hints": [
      "The total sum of 1 through n is n * (n + 1) / 2. If this sum is odd, no equal partition is possible, so return 0.",
      "If total sum is even, each set must sum to target = total / 2.",
      "To avoid counting each pair of sets twice, fix the number n to always belong to the second set. Then find how many subsets of {1, 2, ..., n - 1} sum to target using 0/1 knapsack."
    ],
    "solution": {
      "idea": [
        "First, check if the total sum n * (n + 1) / 2 is even. If odd, answer is 0. Otherwise target = total / 4.",
        "Since partitions are unordered ({A, B} is the same as {B, A}), we fix element n to be in the second set. We then count how many subsets of {1, 2, ..., n - 1} sum to target.",
        "This is standard 0/1 knapsack: dp[j] = (dp[j] + dp[j - i]) % MOD for i from 1 to n - 1."
      ],
      "complexity": "O(n * target) time, O(target) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int twoSetsII(int n) {\n        long long total = 1LL * n * (n + 1) / 2;\n        if (total % 2 != 0) return 0;\n        int target = total / 2;\n        const int MOD = 1e9 + 7;\n        vector<int> dp(target + 1, 0);\n        dp[0] = 1;\n        for (int i = 1; i < n; i++) {\n            for (int j = target; j >= i; j--) {\n                dp[j] = (dp[j] + dp[j - i]) % MOD;\n            }\n        }\n        return dp[target];\n    }\n};\n"
    }
  }
];
