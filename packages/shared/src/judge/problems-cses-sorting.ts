import type { ProblemSpec } from "./types";

// CSES Sorting and Searching problems (Section 1). Statements, hints and solutions are written for this app; the original tasks are linked.

const cses = (n: number) => `https://cses.fi/problemset/task/${n}`;

export const CSES_SPECS_SORTING: ProblemSpec[] = [
  {
    "id": "cses-distinct-numbers",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1621",
    "title": "Distinct Numbers",
    "statement": [
      "You are given a list of integers. Your task is to calculate the total number of distinct values present in the list.",
      "Return the count of unique values."
    ],
    "constraints": [
      "1 <= arr.length <= 200000",
      "1 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "distinctNumbers",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
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
            2,
            2,
            3
          ]
        ],
        "explanation": "There are two distinct values: 2 and 3.",
        "output": 2
      },
      {
        "input": [
          [
            5
          ]
        ],
        "explanation": "A single-element array contains exactly 1 unique value.",
        "output": 1
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5
          ]
        ],
        "output": 5
      },
      {
        "input": [
          [
            7,
            7,
            7,
            7,
            7,
            7
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            1000000000,
            1,
            1000000000,
            1
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            10,
            20,
            10,
            30,
            20,
            40,
            50,
            10
          ]
        ],
        "output": 5
      },
      {
        "input": [
          [
            9,
            8,
            7,
            6,
            5,
            4,
            3,
            2,
            1
          ]
        ],
        "output": 9
      },
      {
        "input": [
          [
            42,
            42
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            100,
            200,
            300,
            400,
            500,
            600,
            700,
            800,
            900,
            1000
          ]
        ],
        "output": 10
      }
    ],
    "hints": [
      "If the numbers were arranged in sorted order, where would identical numbers end up?",
      "Sorting brings duplicate values adjacent to each other. You can count how many elements differ from their predecessor.",
      "Sort the array in O(n log n) time, initialize the count to 1, and increment whenever arr[i] != arr[i - 1]."
    ],
    "solution": {
      "idea": [
        "Sort the array so that identical values become adjacent.",
        "Loop through the sorted array from the second element onward, incrementing the count whenever the current element differs from the previous one."
      ],
      "complexity": "O(n log n) time, O(1) auxiliary space beyond sorting.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int distinctNumbers(vector<int>& arr) {\n        if (arr.empty()) return 0;\n        sort(arr.begin(), arr.end());\n        int ans = 1;\n        for (size_t i = 1; i < arr.size(); i++) {\n            if (arr[i] != arr[i - 1]) ans++;\n        }\n        return ans;\n    }\n};\n"
    }
  },
  {
    "id": "cses-apartments",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1084",
    "title": "Apartments",
    "statement": [
      "There are n applicants looking for apartments and m available apartments. Each applicant has a desired apartment size, and will accept any apartment whose size differs from their desired size by at most k (i.e. size is between desired - k and desired + k inclusive).",
      "Each apartment can be assigned to at most one applicant. Determine the maximum number of applicants who can get an apartment."
    ],
    "constraints": [
      "1 <= applicants.length, apartments.length <= 200000",
      "0 <= k <= 10^9",
      "1 <= applicants[i], apartments[j] <= 10^9"
    ],
    "fn": {
      "name": "apartments",
      "params": [
        {
          "name": "applicants",
          "type": "int[]"
        },
        {
          "name": "apartments",
          "type": "int[]"
        },
        {
          "name": "k",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            60,
            45,
            80,
            60
          ],
          [
            30,
            60,
            75
          ],
          5
        ],
        "explanation": "Applicant 1 (60) takes apartment 2 (60). Applicant 3 (80) takes apartment 3 (75). Two applicants get apartments.",
        "output": 2
      },
      {
        "input": [
          [
            50
          ],
          [
            50
          ],
          0
        ],
        "explanation": "With k = 0, applicant matches the exact size.",
        "output": 1
      }
    ],
    "tests": [
      {
        "input": [
          [
            10,
            20,
            30
          ],
          [
            5,
            15,
            25
          ],
          5
        ],
        "output": 3
      },
      {
        "input": [
          [
            100,
            200
          ],
          [
            10,
            20
          ],
          5
        ],
        "output": 0
      },
      {
        "input": [
          [
            40,
            50,
            60
          ],
          [
            40,
            50,
            60
          ],
          0
        ],
        "output": 3
      },
      {
        "input": [
          [
            10,
            30,
            50
          ],
          [
            20,
            40
          ],
          10
        ],
        "output": 2
      },
      {
        "input": [
          [
            1,
            1000000000
          ],
          [
            500000000
          ],
          1000000000
        ],
        "output": 1
      },
      {
        "input": [
          [
            25,
            35,
            45,
            55
          ],
          [
            30,
            50
          ],
          5
        ],
        "output": 2
      },
      {
        "input": [
          [
            5,
            5,
            5
          ],
          [
            5
          ],
          0
        ],
        "output": 1
      }
    ],
    "hints": [
      "Consider sorting both the applicants' desired sizes and the available apartment sizes.",
      "Process the smallest applicant and the smallest apartment. If the apartment is too small for the applicant, can it ever be useful to any larger applicant?",
      "Use a two-pointer approach: if an apartment is too small, advance to the next apartment. If it is too large, advance to the next applicant. Otherwise, match them and advance both."
    ],
    "solution": {
      "idea": [
        "Sort both applicants and apartments in ascending order.",
        "Greedily match the applicant requesting the smallest size with the smallest suitable apartment. If the current apartment is smaller than applicant - k, it can never satisfy any subsequent applicant, so discard it. If it is larger than applicant + k, the current applicant cannot be satisfied by this or any larger apartment, so move to the next applicant."
      ],
      "complexity": "O(n log n + m log m) time, O(1) auxiliary space beyond sorting.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int apartments(vector<int>& applicants, vector<int>& apartments, int k) {\n        sort(applicants.begin(), applicants.end());\n        sort(apartments.begin(), apartments.end());\n        int i = 0, j = 0, matched = 0;\n        while (i < (int)applicants.size() && j < (int)apartments.size()) {\n            if (apartments[j] < applicants[i] - k) {\n                j++;\n            } else if (apartments[j] > applicants[i] + k) {\n                i++;\n            } else {\n                matched++;\n                i++;\n                j++;\n            }\n        }\n        return matched;\n    }\n};\n"
    }
  },
  {
    "id": "cses-ferris-wheel",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1090",
    "title": "Ferris Wheel",
    "statement": [
      "There are n children waiting to ride a ferris wheel. Each child has a known weight. A gondola can carry at most two children, and their combined weight must not exceed x.",
      "Find the minimum number of gondolas needed so that all children can ride."
    ],
    "constraints": [
      "1 <= weights.length <= 200000",
      "1 <= x <= 10^9",
      "1 <= weights[i] <= x"
    ],
    "fn": {
      "name": "ferrisWheel",
      "params": [
        {
          "name": "weights",
          "type": "int[]"
        },
        {
          "name": "x",
          "type": "int"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            7,
            2,
            3,
            9
          ],
          10
        ],
        "explanation": "Pair children with weights 7 and 3 (sum 10), and weights 2 and 9 (sum 11 exceeds 10, so 9 rides alone and 2 rides alone). Total 3 gondolas.",
        "output": 3
      },
      {
        "input": [
          [
            5,
            5,
            5,
            5
          ],
          10
        ],
        "explanation": "Two gondolas: (5, 5) and (5, 5).",
        "output": 2
      }
    ],
    "tests": [
      {
        "input": [
          [
            2,
            3,
            7,
            9
          ],
          9
        ],
        "output": 3
      },
      {
        "input": [
          [
            10,
            10,
            10
          ],
          10
        ],
        "output": 3
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
          ],
          7
        ],
        "output": 3
      },
      {
        "input": [
          [
            1
          ],
          5
        ],
        "output": 1
      },
      {
        "input": [
          [
            1000000000,
            1000000000
          ],
          1000000000
        ],
        "output": 2
      },
      {
        "input": [
          [
            2,
            4,
            6,
            8,
            10
          ],
          12
        ],
        "output": 3
      },
      {
        "input": [
          [
            1,
            1,
            1,
            1,
            1
          ],
          2
        ],
        "output": 3
      }
    ],
    "hints": [
      "Sort the weights in ascending order.",
      "Consider the heaviest remaining child. If they can pair with anyone, they can definitely pair with the lightest available child.",
      "Use two pointers: if weights[lightest] + weights[heaviest] <= x, put both in one gondola (increment left pointer). Regardless, the heaviest child takes that gondola (decrement right pointer)."
    ],
    "solution": {
      "idea": [
        "Sort the children by weight in ascending order.",
        "Greedily attempt to pair the heaviest remaining child with the lightest remaining child. If their combined weight is at most x, both share a gondola. Otherwise, the heaviest child cannot pair with anyone and must ride alone."
      ],
      "complexity": "O(n log n) time, O(1) auxiliary space beyond sorting.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int ferrisWheel(vector<int>& weights, int x) {\n        sort(weights.begin(), weights.end());\n        int i = 0, j = (int)weights.size() - 1;\n        int gondolas = 0;\n        while (i <= j) {\n            if (i < j && weights[i] + weights[j] <= x) {\n                i++;\n            }\n            j--;\n            gondolas++;\n        }\n        return gondolas;\n    }\n};\n"
    }
  },
  {
    "id": "cses-concert-tickets",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1091",
    "title": "Concert Tickets",
    "statement": [
      "There are n concert tickets available, each with a given price. Customers arrive one by one. Each customer announces the maximum price they are willing to pay for a ticket.",
      "For each customer in order, assign them the most expensive available ticket whose price does not exceed their maximum price, and remove that ticket from circulation. If no suitable ticket exists, assign -1.",
      "Return an array containing the ticket price paid by each customer in the order of their arrival."
    ],
    "constraints": [
      "1 <= tickets.length, maxPrices.length <= 200000",
      "1 <= tickets[i], maxPrices[j] <= 10^9"
    ],
    "fn": {
      "name": "concertTickets",
      "params": [
        {
          "name": "tickets",
          "type": "int[]"
        },
        {
          "name": "maxPrices",
          "type": "int[]"
        }
      ],
      "returns": "int[]"
    },
    "examples": [
      {
        "input": [
          [
            5,
            3,
            7,
            8,
            5
          ],
          [
            4,
            8,
            3
          ]
        ],
        "explanation": "First customer wants at most 4: buys 3. Second wants at most 8: buys 8. Third wants at most 3: no ticket <= 3 left, gets -1.",
        "output": [
          3,
          8,
          -1
        ]
      },
      {
        "input": [
          [
            10
          ],
          [
            5,
            10
          ]
        ],
        "explanation": "First customer wants at most 5: gets -1. Second wants at most 10: gets 10.",
        "output": [
          -1,
          10
        ]
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2,
            3
          ],
          [
            1,
            2,
            3
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
            10,
            20,
            30
          ],
          [
            5,
            5,
            5
          ]
        ],
        "output": [
          -1,
          -1,
          -1
        ]
      },
      {
        "input": [
          [
            5,
            5,
            5,
            5
          ],
          [
            5,
            5,
            5,
            5,
            5
          ]
        ],
        "output": [
          5,
          5,
          5,
          5,
          -1
        ]
      },
      {
        "input": [
          [
            100,
            200,
            300,
            400
          ],
          [
            250,
            400,
            150
          ]
        ],
        "output": [
          200,
          400,
          100
        ]
      },
      {
        "input": [
          [
            1000000000
          ],
          [
            1000000000
          ]
        ],
        "output": [
          1000000000
        ]
      },
      {
        "input": [
          [
            8,
            2,
            6,
            4
          ],
          [
            7,
            5,
            3,
            1
          ]
        ],
        "output": [
          6,
          4,
          2,
          -1
        ]
      },
      {
        "input": [
          [
            9,
            9,
            3,
            3
          ],
          [
            10,
            4,
            3,
            2
          ]
        ],
        "output": [
          9,
          3,
          3,
          -1
        ]
      }
    ],
    "hints": [
      "Since tickets are removed when purchased, you need a dynamic data structure that supports predecessor queries.",
      "A balanced binary search tree, such as std::multiset in C++, allows finding the largest element <= target using upper_bound and decrementing the iterator.",
      "Remember to erase by iterator (ms.erase(it)) instead of value so that only one copy of duplicate ticket prices is removed."
    ],
    "solution": {
      "idea": [
        "Store the ticket prices in a multiset.",
        "For each customer, query upper_bound for their budget. If the iterator is at begin(), no ticket is <= budget. Otherwise, step backward one position to obtain the largest affordable ticket price, record it, and erase that specific element using the iterator."
      ],
      "complexity": "O((n + m) log n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> concertTickets(vector<int>& tickets, vector<int>& maxPrices) {\n        multiset<int> ms(tickets.begin(), tickets.end());\n        vector<int> ans;\n        ans.reserve(maxPrices.size());\n        for (int p : maxPrices) {\n            auto it = ms.upper_bound(p);\n            if (it == ms.begin()) {\n                ans.push_back(-1);\n            } else {\n                --it;\n                ans.push_back(*it);\n                ms.erase(it);\n            }\n        }\n        return ans;\n    }\n};\n"
    }
  },
  {
    "id": "cses-restaurant-customers",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1619",
    "title": "Restaurant Customers",
    "statement": [
      "You are given the arrival and leaving times of n customers at a restaurant, where each customer is represented as [arrival, departure].",
      "Every customer arrives at time arrival and leaves at time departure. Find the maximum number of customers present in the restaurant at any one time."
    ],
    "constraints": [
      "1 <= customers.length <= 200000",
      "Each entry has length 2 with 1 <= arrival < departure <= 10^9",
      "All arrival and departure times are distinct integers"
    ],
    "fn": {
      "name": "restaurantCustomers",
      "params": [
        {
          "name": "customers",
          "type": "int[][]"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            [
              5,
              8
            ],
            [
              2,
              4
            ],
            [
              3,
              9
            ]
          ]
        ],
        "explanation": "At time 3.5, customers [2, 4] and [3, 9] are present (2 customers). The maximum number present at any time is 2.",
        "output": 2
      },
      {
        "input": [
          [
            [
              1,
              10
            ],
            [
              2,
              9
            ],
            [
              3,
              8
            ]
          ]
        ],
        "explanation": "All 3 customers are present simultaneously between time 3 and 8. The maximum is 3.",
        "output": 3
      }
    ],
    "tests": [
      {
        "input": [
          [
            [
              1,
              2
            ],
            [
              3,
              4
            ],
            [
              5,
              6
            ]
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            [
              1,
              100
            ],
            [
              2,
              90
            ],
            [
              3,
              80
            ],
            [
              4,
              70
            ]
          ]
        ],
        "output": 4
      },
      {
        "input": [
          [
            [
              10,
              20
            ]
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            [
              1,
              6
            ],
            [
              2,
              5
            ],
            [
              7,
              10
            ],
            [
              8,
              9
            ]
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            [
              1000000,
              2000000
            ],
            [
              1500000,
              2500000
            ],
            [
              1800000,
              3000000
            ]
          ]
        ],
        "output": 3
      },
      {
        "input": [
          [
            [
              1,
              4
            ],
            [
              2,
              7
            ],
            [
              5,
              9
            ],
            [
              8,
              12
            ],
            [
              10,
              15
            ]
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            [
              1,
              5
            ],
            [
              6,
              10
            ],
            [
              11,
              15
            ],
            [
              16,
              20
            ]
          ]
        ],
        "output": 1
      }
    ],
    "hints": [
      "Each customer arrival increases the count of people by 1, and each departure decreases it by 1.",
      "Create two events for each customer: (arrival, +1) and (departure, -1).",
      "Sort all events by time. Sweep through the sorted events while maintaining a running counter of currently present customers, tracking the maximum value."
    ],
    "solution": {
      "idea": [
        "Convert each customer interval into two discrete events: an arrival (+1) and a departure (-1).",
        "Sort all events chronologically. Iterate through the sorted events, updating the running occupancy and recording the maximum occupancy achieved."
      ],
      "complexity": "O(n log n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int restaurantCustomers(vector<vector<int>>& customers) {\n        vector<pair<int, int>> events;\n        events.reserve(customers.size() * 2);\n        for (auto& c : customers) {\n            events.emplace_back(c[0], 1);\n            events.emplace_back(c[1], -1);\n        }\n        sort(events.begin(), events.end());\n        int cur = 0, best = 0;\n        for (auto& [t, delta] : events) {\n            cur += delta;\n            best = max(best, cur);\n        }\n        return best;\n    }\n};\n"
    }
  },
  {
    "id": "cses-movie-festival",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1629",
    "title": "Movie Festival",
    "statement": [
      "In a movie festival, n movies are shown. Each movie is given as [start, end], indicating its start and end times.",
      "You can watch a movie if you arrive at or before its start time and stay until its end time. If one movie ends at time t, you can immediately begin watching another movie that starts at time t.",
      "Determine the maximum number of movies you can watch completely."
    ],
    "constraints": [
      "1 <= movies.length <= 200000",
      "Each entry has length 2 with 1 <= start < end <= 10^9"
    ],
    "fn": {
      "name": "movieFestival",
      "params": [
        {
          "name": "movies",
          "type": "int[][]"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            [
              3,
              5
            ],
            [
              4,
              9
            ],
            [
              5,
              8
            ]
          ]
        ],
        "explanation": "Watch movie [3, 5] then movie [5, 8]. You watch 2 movies.",
        "output": 2
      },
      {
        "input": [
          [
            [
              1,
              10
            ],
            [
              2,
              5
            ],
            [
              6,
              9
            ]
          ]
        ],
        "explanation": "Watch [2, 5] and then [6, 9] for a total of 2 movies, instead of the long movie [1, 10].",
        "output": 2
      }
    ],
    "tests": [
      {
        "input": [
          [
            [
              1,
              2
            ],
            [
              2,
              3
            ],
            [
              3,
              4
            ],
            [
              4,
              5
            ]
          ]
        ],
        "output": 4
      },
      {
        "input": [
          [
            [
              1,
              100
            ],
            [
              2,
              100
            ],
            [
              3,
              100
            ]
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            [
              10,
              20
            ]
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            [
              1,
              4
            ],
            [
              3,
              5
            ],
            [
              0,
              6
            ],
            [
              5,
              7
            ],
            [
              3,
              9
            ],
            [
              5,
              9
            ],
            [
              6,
              10
            ],
            [
              8,
              11
            ],
            [
              8,
              12
            ],
            [
              2,
              14
            ],
            [
              12,
              16
            ]
          ]
        ],
        "output": 4
      },
      {
        "input": [
          [
            [
              100,
              200
            ],
            [
              50,
              150
            ],
            [
              150,
              250
            ],
            [
              250,
              350
            ]
          ]
        ],
        "output": 3
      },
      {
        "input": [
          [
            [
              1,
              3
            ],
            [
              2,
              4
            ],
            [
              3,
              5
            ],
            [
              7,
              9
            ],
            [
              8,
              10
            ]
          ]
        ],
        "output": 3
      },
      {
        "input": [
          [
            [
              1,
              10
            ],
            [
              2,
              3
            ],
            [
              4,
              5
            ],
            [
              6,
              7
            ],
            [
              8,
              9
            ]
          ]
        ],
        "output": 4
      }
    ],
    "hints": [
      "This is the classic interval scheduling problem.",
      "Which greedy choice leaves the most remaining time for future movies?",
      "Sort movies by their end times in ascending order. Pick the movie that ends earliest, then among the remaining movies that start at or after that movie's end, pick the one that ends earliest, and repeat."
    ],
    "solution": {
      "idea": [
        "Sort the movies by their ending time. If two movies end at the same time, their start times can be ordered arbitrarily.",
        "Iterate through the sorted movies. Greedily pick each movie whose starting time is greater than or equal to the ending time of the previously watched movie."
      ],
      "complexity": "O(n log n) time, O(1) auxiliary space beyond sorting.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int movieFestival(vector<vector<int>>& movies) {\n        sort(movies.begin(), movies.end(), [](const vector<int>& a, const vector<int>& b) {\n            if (a[1] != b[1]) return a[1] < b[1];\n            return a[0] < b[0];\n        });\n        int count = 0;\n        int lastEnd = 0;\n        for (const auto& m : movies) {\n            if (m[0] >= lastEnd) {\n                count++;\n                lastEnd = m[1];\n            }\n        }\n        return count;\n    }\n};\n"
    }
  },
  {
    "id": "cses-sum-of-two-values",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1640",
    "title": "Sum of Two Values",
    "statement": [
      "You are given an array of n integers and a target sum.",
      "Find two distinct positions i and j (1-based indices with 1 <= i < j <= n) such that arr[i - 1] + arr[j - 1] == target.",
      "If multiple pairs exist, return the pair [i, j] with the smallest 1-based index i (and smallest j among ties). If no such pair exists, return [-1, -1]."
    ],
    "constraints": [
      "1 <= arr.length <= 200000",
      "1 <= target <= 10^9",
      "1 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "sumOfTwoValues",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "returns": "int[]"
    },
    "examples": [
      {
        "input": [
          [
            2,
            7,
            5,
            1
          ],
          8
        ],
        "explanation": "arr[1] + arr[3] = 7 + 1 = 8. Indices are 2 and 4 (1-based), so return [2, 4].",
        "output": [
          2,
          4
        ]
      },
      {
        "input": [
          [
            1,
            2,
            3
          ],
          10
        ],
        "explanation": "No two values sum to 10, so return [-1, -1].",
        "output": [
          -1,
          -1
        ]
      }
    ],
    "tests": [
      {
        "input": [
          [
            3,
            3
          ],
          6
        ],
        "output": [
          1,
          2
        ]
      },
      {
        "input": [
          [
            1,
            3,
            3,
            5
          ],
          6
        ],
        "output": [
          1,
          4
        ]
      },
      {
        "input": [
          [
            5,
            4,
            3,
            2,
            1
          ],
          6
        ],
        "output": [
          1,
          5
        ]
      },
      {
        "input": [
          [
            1000000000,
            500000000,
            500000000
          ],
          1000000000
        ],
        "output": [
          2,
          3
        ]
      },
      {
        "input": [
          [
            10,
            20,
            30,
            40,
            50
          ],
          90
        ],
        "output": [
          4,
          5
        ]
      },
      {
        "input": [
          [
            7
          ],
          7
        ],
        "output": [
          -1,
          -1
        ]
      },
      {
        "input": [
          [
            4,
            2,
            5,
            1,
            6
          ],
          8
        ],
        "output": [
          2,
          5
        ]
      }
    ],
    "hints": [
      "For each element arr[i - 1], the required matching value is target - arr[i - 1].",
      "You need to find a position j > i where arr[j - 1] == target - arr[i - 1].",
      "Sort pairs of (value, 1-based index). For each 1-based index i from 1 to n, binary search for (target - arr[i - 1], i + 1) to find the smallest j > i."
    ],
    "solution": {
      "idea": [
        "Pair each element with its 1-based index and sort these pairs ascending by value and then by index.",
        "Loop i from 1 to n. For each i, compute the needed value target - arr[i - 1], and use lower_bound on the sorted pairs for (needed, i + 1). The first i that finds a matching pair gives the pair with the smallest i, and the smallest j > i for that i. If no pair is found, return [-1, -1]."
      ],
      "complexity": "O(n log n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> sumOfTwoValues(vector<int>& arr, int target) {\n        int n = arr.size();\n        vector<pair<int, int>> sorted_arr(n);\n        for (int k = 0; k < n; k++) sorted_arr[k] = {arr[k], k + 1};\n        sort(sorted_arr.begin(), sorted_arr.end());\n\n        for (int i = 1; i <= n; i++) {\n            int needed = target - arr[i - 1];\n            auto it = lower_bound(sorted_arr.begin(), sorted_arr.end(), make_pair(needed, i + 1));\n            if (it != sorted_arr.end() && it->first == needed) {\n                return {i, it->second};\n            }\n        }\n        return {-1, -1};\n    }\n};\n"
    }
  },
  {
    "id": "cses-maximum-subarray-sum",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1643",
    "title": "Maximum Subarray Sum",
    "statement": [
      "Given an array of n integers, find the maximum sum of values in a contiguous, non-empty subarray."
    ],
    "constraints": [
      "1 <= arr.length <= 200000",
      "-10^9 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "maximumSubarraySum",
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
            -1,
            3,
            -2,
            5,
            3,
            -5,
            2,
            2
          ]
        ],
        "explanation": "The subarray [3, -2, 5, 3] has sum 9, which is the maximum possible.",
        "output": 9
      },
      {
        "input": [
          [
            -5,
            -2,
            -8,
            -1
          ]
        ],
        "explanation": "Since the subarray must be non-empty, the best choice is [-1] with sum -1.",
        "output": -1
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5
          ]
        ],
        "output": 15
      },
      {
        "input": [
          [
            -10
          ]
        ],
        "output": -10
      },
      {
        "input": [
          [
            1000000000,
            1000000000,
            1000000000
          ]
        ],
        "output": 3000000000
      },
      {
        "input": [
          [
            10,
            -5,
            20,
            -30,
            40
          ]
        ],
        "output": 40
      },
      {
        "input": [
          [
            -3,
            4,
            -1,
            2,
            1,
            -5,
            4
          ]
        ],
        "output": 6
      },
      {
        "input": [
          [
            -1000000000,
            -1000000000
          ]
        ],
        "output": -1000000000
      },
      {
        "input": [
          [
            5,
            -1,
            5,
            -1,
            5
          ]
        ],
        "output": 13
      }
    ],
    "hints": [
      "This is Kadane's algorithm.",
      "As you move through the array, maintain the maximum subarray sum ending at the current position.",
      "At element i, either extend the previous subarray (cur + arr[i]) or start a new subarray with arr[i] alone. Track the maximum seen. Remember to use 64-bit integers to prevent overflow."
    ],
    "solution": {
      "idea": [
        "Use Kadane's algorithm. Maintain a running sum cur representing the maximum subarray sum ending at the current index.",
        "For each element, cur = max((long long)arr[i], cur + arr[i]), and update the overall maximum. 64-bit integers prevent overflow when sums exceed 2^31 - 1."
      ],
      "complexity": "O(n) time, O(1) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long maximumSubarraySum(vector<int>& arr) {\n        long long max_so_far = arr[0];\n        long long cur = arr[0];\n        for (size_t i = 1; i < arr.size(); i++) {\n            cur = max((long long)arr[i], cur + arr[i]);\n            max_so_far = max(max_so_far, cur);\n        }\n        return max_so_far;\n    }\n};\n"
    }
  },
  {
    "id": "cses-stick-lengths",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1074",
    "title": "Stick Lengths",
    "statement": [
      "There are n sticks with given lengths. You want to modify all sticks so that they all have the same length.",
      "You can lengthen or shorten each stick. Changing the length of a stick from a to b costs |a - b|.",
      "Find the minimum total cost to make all sticks equal in length."
    ],
    "constraints": [
      "1 <= lengths.length <= 200000",
      "1 <= lengths[i] <= 10^9"
    ],
    "fn": {
      "name": "stickLengths",
      "params": [
        {
          "name": "lengths",
          "type": "int[]"
        }
      ],
      "returns": "long"
    },
    "examples": [
      {
        "input": [
          [
            2,
            3,
            1,
            5,
            2
          ]
        ],
        "explanation": "Changing all sticks to length 2 costs |2-2| + |3-2| + |1-2| + |5-2| + |2-2| = 0 + 1 + 1 + 3 + 0 = 5.",
        "output": 5
      },
      {
        "input": [
          [
            10,
            10,
            10
          ]
        ],
        "explanation": "All sticks are already equal, cost is 0.",
        "output": 0
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            100
          ]
        ],
        "output": 99
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5
          ]
        ],
        "output": 6
      },
      {
        "input": [
          [
            1000000000,
            1,
            1000000000
          ]
        ],
        "output": 999999999
      },
      {
        "input": [
          [
            7
          ]
        ],
        "output": 0
      },
      {
        "input": [
          [
            4,
            8,
            15,
            16,
            23,
            42
          ]
        ],
        "output": 54
      },
      {
        "input": [
          [
            5,
            5,
            5,
            10,
            10,
            10
          ]
        ],
        "output": 15
      },
      {
        "input": [
          [
            1,
            1,
            1,
            1,
            9
          ]
        ],
        "output": 8
      }
    ],
    "hints": [
      "The function to minimize is the sum of absolute differences: sum |lengths[i] - x|.",
      "The value x that minimizes the sum of absolute distances to a set of points is the median.",
      "Sort the lengths, find the element at index n / 2, and sum the absolute differences."
    ],
    "solution": {
      "idea": [
        "The sum of absolute deviations sum |x_i - m| is minimized when m is the median of the values.",
        "Sort the array and select lengths[n / 2] as the target length. Calculate the total cost by summing |lengths[i] - m| using 64-bit integers."
      ],
      "complexity": "O(n log n) time, O(1) auxiliary space beyond sorting.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long stickLengths(vector<int>& lengths) {\n        sort(lengths.begin(), lengths.end());\n        int median = lengths[lengths.size() / 2];\n        long long total = 0;\n        for (int x : lengths) {\n            total += std::abs((long long)x - median);\n        }\n        return total;\n    }\n};\n"
    }
  },
  {
    "id": "cses-missing-coin-sum",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/2183",
    "title": "Missing Coin Sum",
    "statement": [
      "You have n coins with positive integer values. What is the smallest positive integer sum that cannot be formed by choosing a subset of the coins?"
    ],
    "constraints": [
      "1 <= coins.length <= 200000",
      "1 <= coins[i] <= 10^9"
    ],
    "fn": {
      "name": "missingCoinSum",
      "params": [
        {
          "name": "coins",
          "type": "int[]"
        }
      ],
      "returns": "long"
    },
    "examples": [
      {
        "input": [
          [
            2,
            9,
            1,
            2,
            7
          ]
        ],
        "explanation": "Sorted coins are 1, 2, 2, 7, 9. Using subsets we can form 1, 2, 3 (1+2), 4 (2+2), 5 (1+2+2). Sum 6 cannot be formed, so the answer is 6.",
        "output": 6
      },
      {
        "input": [
          [
            2,
            3,
            5
          ]
        ],
        "explanation": "Coin 1 is missing, so sum 1 cannot be formed.",
        "output": 1
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            1,
            1,
            1
          ]
        ],
        "output": 5
      },
      {
        "input": [
          [
            1,
            2,
            4,
            8,
            16
          ]
        ],
        "output": 32
      },
      {
        "input": [
          [
            1000000000
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            1,
            2,
            5,
            10,
            20,
            50
          ]
        ],
        "output": 4
      },
      {
        "input": [
          [
            1,
            1000000000
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            1,
            2,
            3,
            7
          ]
        ],
        "output": 14
      },
      {
        "input": [
          [
            1
          ]
        ],
        "output": 2
      }
    ],
    "hints": [
      "Sort the coin values in ascending order.",
      "Suppose using a subset of the coins seen so far, you can form every integer sum from 1 up to reach - 1. What happens when you consider the next coin c?",
      "If c <= reach, you can now form all sums up to reach + c - 1. If c > reach, reach can never be formed, so it is the answer."
    ],
    "solution": {
      "idea": [
        "Sort the coins ascending. Maintain reach, the smallest sum not yet formable (initially 1).",
        "For each coin c in sorted order: if c <= reach, we can extend our formable range from [1, reach - 1] to [1, reach + c - 1], so reach += c. If c > reach, we can never form reach, so we stop and return reach."
      ],
      "complexity": "O(n log n) time, O(1) auxiliary space beyond sorting.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long missingCoinSum(vector<int>& coins) {\n        sort(coins.begin(), coins.end());\n        long long reach = 1;\n        for (int c : coins) {\n            if (c > reach) break;\n            reach += c;\n        }\n        return reach;\n    }\n};\n"
    }
  },
  {
    "id": "cses-collecting-numbers",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/2216",
    "title": "Collecting Numbers",
    "statement": [
      "You are given an array of size n containing a permutation of the integers from 1 to n.",
      "You want to collect the numbers from 1 to n in increasing order (first 1, then 2, then 3, and so on).",
      "In each round, you scan the array from left to right and collect any number if it is the next number needed. What is the minimum number of rounds required to collect all numbers?"
    ],
    "constraints": [
      "1 <= arr.length <= 200000",
      "arr is a permutation of integers from 1 to n"
    ],
    "fn": {
      "name": "collectingNumbers",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            4,
            2,
            1,
            5,
            3
          ]
        ],
        "explanation": "Round 1 collects 1, 2, 3. Round 2 collects 4, 5. Total rounds: 2.",
        "output": 3
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5
          ]
        ],
        "explanation": "All numbers are already in order and collected in round 1.",
        "output": 1
      }
    ],
    "tests": [
      {
        "input": [
          [
            5,
            4,
            3,
            2,
            1
          ]
        ],
        "output": 5
      },
      {
        "input": [
          [
            1
          ]
        ],
        "output": 1
      },
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
            3,
            2,
            4
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            3,
            1,
            4,
            2
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            2,
            4,
            1,
            3,
            5
          ]
        ],
        "output": 3
      },
      {
        "input": [
          [
            6,
            5,
            4,
            3,
            2,
            1
          ]
        ],
        "output": 6
      }
    ],
    "hints": [
      "Track the index where each number from 1 to n appears in the array.",
      "Can you collect number x in the same round as number x - 1?",
      "Number x can be collected in the same round as x - 1 if and only if position[x] > position[x - 1]. Whenever position[x] < position[x - 1], a new round must be started."
    ],
    "solution": {
      "idea": [
        "Record the position of each value from 1 to n in a lookup array pos.",
        "Start with 1 round. Iterate from x = 2 to n. Whenever pos[x] < pos[x - 1], the number x appears to the left of x - 1, meaning it cannot be picked in the current pass and requires a new round."
      ],
      "complexity": "O(n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int collectingNumbers(vector<int>& arr) {\n        int n = arr.size();\n        vector<int> pos(n + 1);\n        for (int i = 0; i < n; i++) {\n            pos[arr[i]] = i;\n        }\n        int rounds = 1;\n        for (int x = 2; x <= n; x++) {\n            if (pos[x] < pos[x - 1]) rounds++;\n        }\n        return rounds;\n    }\n};\n"
    }
  },
  {
    "id": "cses-playlist",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1141",
    "title": "Playlist",
    "statement": [
      "You are given a playlist of n songs, each identified by an integer ID.",
      "Find the length of the longest contiguous sequence of songs in which no song appears more than once."
    ],
    "constraints": [
      "1 <= songs.length <= 200000",
      "1 <= songs[i] <= 10^9"
    ],
    "fn": {
      "name": "playlist",
      "params": [
        {
          "name": "songs",
          "type": "int[]"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            1,
            2,
            1,
            3,
            2,
            7,
            4,
            2
          ]
        ],
        "explanation": "The sequence [1, 3, 2, 7, 4] consists of 5 unique songs.",
        "output": 5
      },
      {
        "input": [
          [
            5,
            5,
            5,
            5
          ]
        ],
        "explanation": "All songs are identical, so the longest sequence of unique songs has length 1.",
        "output": 1
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5
          ]
        ],
        "output": 5
      },
      {
        "input": [
          [
            42
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            1,
            2,
            1,
            2,
            1,
            2
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            10,
            20,
            30,
            10,
            40,
            50,
            60,
            20
          ]
        ],
        "output": 6
      },
      {
        "input": [
          [
            1000000000,
            999999999,
            1000000000
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            3,
            1,
            4,
            1,
            5,
            9,
            2,
            6,
            5
          ]
        ],
        "output": 6
      },
      {
        "input": [
          [
            7,
            8,
            9,
            10,
            7
          ]
        ],
        "output": 4
      }
    ],
    "hints": [
      "Use a sliding window defined by two pointers, left and right.",
      "Maintain a map or hash table storing the most recent index where each song was seen.",
      "When expanding the window at right, if songs[right] was seen at index last >= left, jump left to last + 1. The window size is right - left + 1."
    ],
    "solution": {
      "idea": [
        "Use the two-pointer sliding window technique.",
        "Maintain the most recent index of each song in a map. As right advances from 0 to n - 1, if songs[right] has been observed inside the current window [left, right], update left to lastSeen[songs[right]] + 1. Update the maximum window length at each step."
      ],
      "complexity": "O(n log n) time with std::map, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int playlist(vector<int>& songs) {\n        map<int, int> lastPos;\n        int left = 0, best = 0;\n        for (int right = 0; right < (int)songs.size(); right++) {\n            auto it = lastPos.find(songs[right]);\n            if (it != lastPos.end() && it->second >= left) {\n                left = it->second + 1;\n            }\n            lastPos[songs[right]] = right;\n            best = max(best, right - left + 1);\n        }\n        return best;\n    }\n};\n"
    }
  },
  {
    "id": "cses-towers",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1073",
    "title": "Towers",
    "statement": [
      "You are given n cubes in a specific order, each with a given size.",
      "You want to build towers using the cubes. Each cube must either be placed on top of an existing tower, provided its size is strictly smaller than the cube currently on top of that tower, or used to start a new tower.",
      "Find the minimum number of towers needed to place all cubes in the order they are given."
    ],
    "constraints": [
      "1 <= cubes.length <= 200000",
      "1 <= cubes[i] <= 10^9"
    ],
    "fn": {
      "name": "towers",
      "params": [
        {
          "name": "cubes",
          "type": "int[]"
        }
      ],
      "returns": "int"
    },
    "examples": [
      {
        "input": [
          [
            3,
            8,
            2,
            1,
            5
          ]
        ],
        "explanation": "Cube 3 starts tower 1. Cube 8 starts tower 2. Cube 2 goes on tower 1 (on 3). Cube 1 goes on tower 1 (on 2). Cube 5 goes on tower 2 (on 8). Total 2 towers.",
        "output": 2
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4
          ]
        ],
        "explanation": "Each cube is larger than preceding cubes, so each cube requires its own tower. Total 4 towers.",
        "output": 4
      }
    ],
    "tests": [
      {
        "input": [
          [
            5,
            4,
            3,
            2,
            1
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            7,
            7,
            7,
            7
          ]
        ],
        "output": 4
      },
      {
        "input": [
          [
            10
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            4,
            2,
            8,
            5,
            1,
            9
          ]
        ],
        "output": 3
      },
      {
        "input": [
          [
            1000000000,
            1000000000,
            500000000
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            1,
            5,
            2,
            6,
            3,
            7
          ]
        ],
        "output": 4
      },
      {
        "input": [
          [
            9,
            3,
            8,
            2,
            7,
            1
          ]
        ],
        "output": 2
      }
    ],
    "hints": [
      "When placing a cube, which tower top should you choose if multiple tops are strictly greater than the cube?",
      "Greedily place the cube on the tower with the smallest top that is strictly greater than the cube.",
      "Maintain the list of tower tops in a sorted vector. Use std::upper_bound to find the best tower top in O(log k) time and update it."
    ],
    "solution": {
      "idea": [
        "Maintain a sorted list of current tower tops.",
        "For each cube, find the smallest tower top that is strictly greater than the cube using binary search (std::upper_bound). If such a tower exists, replace its top with the current cube. If no such tower exists, create a new tower by appending the cube's size. The number of towers is the size of the list."
      ],
      "complexity": "O(n log n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int towers(vector<int>& cubes) {\n        vector<int> tops;\n        for (int c : cubes) {\n            auto it = upper_bound(tops.begin(), tops.end(), c);\n            if (it == tops.end()) {\n                tops.push_back(c);\n            } else {\n                *it = c;\n            }\n        }\n        return (int)tops.size();\n    }\n};\n"
    }
  },
  {
    "id": "cses-traffic-lights",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1163",
    "title": "Traffic Lights",
    "statement": [
      "There is a street of length streetLength, extending from position 0 to streetLength. Initially, there are no traffic lights.",
      "Traffic lights are added one by one at the positions specified in the positions array.",
      "After each traffic light is installed, calculate the length of the longest passage without traffic lights."
    ],
    "constraints": [
      "1 <= streetLength <= 10^9",
      "1 <= positions.length <= 200000",
      "All values in positions are distinct integers between 1 and streetLength - 1"
    ],
    "fn": {
      "name": "trafficLights",
      "params": [
        {
          "name": "streetLength",
          "type": "int"
        },
        {
          "name": "positions",
          "type": "int[]"
        }
      ],
      "returns": "int[]"
    },
    "examples": [
      {
        "input": [
          8,
          [
            3,
            6,
            2
          ]
        ],
        "explanation": "Initial passage is [0, 8] (len 8). After light at 3: passages [0, 3] and [3, 8], max is 5. After light at 6: passages [0, 3], [3, 6], [6, 8], max is 3. After light at 2: passages [0, 2], [2, 3], [3, 6], [6, 8], max is 3. Result: [5, 3, 3].",
        "output": [
          5,
          3,
          3
        ]
      },
      {
        "input": [
          10,
          [
            5
          ]
        ],
        "explanation": "Light at 5 splits street into [0, 5] and [5, 10], both length 5. Result: [5].",
        "output": [
          5
        ]
      }
    ],
    "tests": [
      {
        "input": [
          5,
          [
            1,
            2,
            3,
            4
          ]
        ],
        "output": [
          4,
          3,
          2,
          1
        ]
      },
      {
        "input": [
          100,
          [
            50
          ]
        ],
        "output": [
          50
        ]
      },
      {
        "input": [
          20,
          [
            15,
            5,
            10
          ]
        ],
        "output": [
          15,
          10,
          5
        ]
      },
      {
        "input": [
          1000000000,
          [
            100000000,
            900000000
          ]
        ],
        "output": [
          900000000,
          800000000
        ]
      },
      {
        "input": [
          12,
          [
            2,
            6,
            10,
            4,
            8
          ]
        ],
        "output": [
          10,
          6,
          4,
          4,
          2
        ]
      },
      {
        "input": [
          10,
          [
            1,
            9,
            5
          ]
        ],
        "output": [
          9,
          8,
          4
        ]
      },
      {
        "input": [
          16,
          [
            8,
            4,
            12,
            2,
            6,
            10,
            14
          ]
        ],
        "output": [
          8,
          8,
          4,
          4,
          4,
          4,
          2
        ]
      }
    ],
    "hints": [
      "Maintain the set of current light positions (including 0 and streetLength).",
      "When a light is placed at position p, it splits an existing passage [left, right] into [left, p] and [p, right].",
      "Use a std::set to track the boundaries and a std::multiset to track the passage lengths so you can remove the old length and insert the two new lengths in O(log n) time."
    ],
    "solution": {
      "idea": [
        "Maintain a set containing the light positions initialized with {0, streetLength}, and a multiset containing the passage lengths initialized with {streetLength}.",
        "For each incoming light position p, locate the containing interval [l, r] using upper_bound on the position set. Remove (r - l) from the length multiset, insert (p - l) and (r - p), and insert p into the position set. The maximum length after each addition is *lengths.rbegin()."
      ],
      "complexity": "O(n log n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> trafficLights(int streetLength, vector<int>& positions) {\n        set<int> lights = {0, streetLength};\n        multiset<int> lens = {streetLength};\n        vector<int> ans;\n        ans.reserve(positions.size());\n        for (int p : positions) {\n            auto it = lights.upper_bound(p);\n            int r = *it;\n            int l = *prev(it);\n            lens.erase(lens.find(r - l));\n            lens.insert(p - l);\n            lens.insert(r - p);\n            lights.insert(p);\n            ans.push_back(*lens.rbegin());\n        }\n        return ans;\n    }\n};\n"
    }
  },
  {
    "id": "cses-distinct-values-subarrays",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/3420",
    "title": "Distinct Values Subarrays",
    "statement": [
      "Given an array of n integers, count the total number of subarrays in which every element is distinct.",
      "A subarray is a contiguous, non-empty part of the array."
    ],
    "constraints": [
      "1 <= arr.length <= 200000",
      "1 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "distinctValuesSubarrays",
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
            1,
            2,
            1,
            3
          ]
        ],
        "explanation": "Valid subarrays: [1], [2], [1], [3], [1, 2], [2, 1], [1, 3], [2, 1, 3]. Total = 8.",
        "output": 8
      },
      {
        "input": [
          [
            1,
            1,
            1
          ]
        ],
        "explanation": "Only subarrays of length 1 have distinct elements: [1], [1], [1]. Total = 3.",
        "output": 3
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5
          ]
        ],
        "output": 15
      },
      {
        "input": [
          [
            7
          ]
        ],
        "output": 1
      },
      {
        "input": [
          [
            1000000000,
            1000000000
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            1,
            2,
            3,
            1,
            2,
            3
          ]
        ],
        "output": 15
      },
      {
        "input": [
          [
            4,
            5,
            6,
            7,
            8,
            9,
            10
          ]
        ],
        "output": 28
      },
      {
        "input": [
          [
            2,
            1,
            2,
            1,
            2
          ]
        ],
        "output": 9
      },
      {
        "input": [
          [
            3,
            3,
            2,
            2,
            1,
            1
          ]
        ],
        "output": 8
      }
    ],
    "hints": [
      "Use a sliding window [l, r] where all elements within the window are distinct.",
      "For each position r from 0 to n - 1, adjust l so that arr[r] appears only once in [l, r].",
      "The number of valid subarrays ending at index r is r - l + 1. Accumulate this count into a 64-bit integer."
    ],
    "solution": {
      "idea": [
        "Use a two-pointer sliding window.",
        "Maintain a map of the last observed position of each value. As r moves from 0 to n - 1, if arr[r] was seen at index lastPos >= l, move l to lastPos + 1. All subarrays starting between l and r and ending at r have all distinct elements, contributing r - l + 1 to the total count."
      ],
      "complexity": "O(n log n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long distinctValuesSubarrays(vector<int>& arr) {\n        map<int, int> lastPos;\n        long long total = 0;\n        int l = 0;\n        for (int r = 0; r < (int)arr.size(); r++) {\n            auto it = lastPos.find(arr[r]);\n            if (it != lastPos.end() && it->second >= l) {\n                l = it->second + 1;\n            }\n            lastPos[arr[r]] = r;\n            total += (r - l + 1);\n        }\n        return total;\n    }\n};\n"
    }
  },
  {
    "id": "cses-nearest-smaller-values",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1645",
    "title": "Nearest Smaller Values",
    "statement": [
      "Given an array of n integers, for each position find the 1-based position of the nearest element to its left that has a strictly smaller value.",
      "If no such element exists to the left, output 0 for that position."
    ],
    "constraints": [
      "1 <= arr.length <= 200000",
      "1 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "nearestSmallerValues",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
        }
      ],
      "returns": "int[]"
    },
    "examples": [
      {
        "input": [
          [
            2,
            5,
            1,
            4,
            8,
            3,
            2,
            5
          ]
        ],
        "explanation": "For 2: 0. For 5: 2 at index 1. For 1: 0. For 4: 1 at index 3. For 8: 4 at index 4. For 3: 1 at index 3. For 2: 1 at index 3. For 5: 2 at index 7. Output: [0, 1, 0, 3, 4, 3, 3, 7].",
        "output": [
          0,
          1,
          0,
          3,
          4,
          3,
          3,
          7
        ]
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4
          ]
        ],
        "explanation": "Each element has the immediately preceding element as its nearest smaller value: [0, 1, 2, 3].",
        "output": [
          0,
          1,
          2,
          3
        ]
      }
    ],
    "tests": [
      {
        "input": [
          [
            4,
            3,
            2,
            1
          ]
        ],
        "output": [
          0,
          0,
          0,
          0
        ]
      },
      {
        "input": [
          [
            5,
            5,
            5,
            5
          ]
        ],
        "output": [
          0,
          0,
          0,
          0
        ]
      },
      {
        "input": [
          [
            1000000000
          ]
        ],
        "output": [
          0
        ]
      },
      {
        "input": [
          [
            2,
            1,
            3,
            2,
            4
          ]
        ],
        "output": [
          0,
          0,
          2,
          2,
          4
        ]
      },
      {
        "input": [
          [
            10,
            20,
            15,
            30,
            25
          ]
        ],
        "output": [
          0,
          1,
          1,
          3,
          3
        ]
      },
      {
        "input": [
          [
            3,
            1,
            4,
            1,
            5,
            9,
            2,
            6
          ]
        ],
        "output": [
          0,
          0,
          2,
          0,
          4,
          5,
          4,
          7
        ]
      },
      {
        "input": [
          [
            7,
            2,
            9,
            1,
            8,
            3
          ]
        ],
        "output": [
          0,
          0,
          2,
          0,
          4,
          4
        ]
      }
    ],
    "hints": [
      "This problem is a classic application of a monotonic stack.",
      "Maintain a stack of pairs (value, 1-based index) for elements seen so far.",
      "Before processing arr[i], pop elements from the stack that are greater than or equal to arr[i], since they cannot be the nearest smaller value for arr[i] or any future element. The top of the stack is then the nearest smaller value."
    ],
    "solution": {
      "idea": [
        "Maintain a monotonic stack storing (value, 1-based index) in strictly increasing order of value.",
        "For each element arr[i], pop from the stack while stack.top().value >= arr[i]. If the stack becomes empty, record 0; otherwise record stack.top().index. Then push (arr[i], i + 1) onto the stack. Each element is pushed and popped at most once."
      ],
      "complexity": "O(n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> nearestSmallerValues(vector<int>& arr) {\n        vector<int> ans;\n        ans.reserve(arr.size());\n        stack<pair<int, int>> st;\n        for (int i = 0; i < (int)arr.size(); i++) {\n            while (!st.empty() && st.top().first >= arr[i]) {\n                st.pop();\n            }\n            if (st.empty()) {\n                ans.push_back(0);\n            } else {\n                ans.push_back(st.top().second);\n            }\n            st.push({arr[i], i + 1});\n        }\n        return ans;\n    }\n};\n"
    }
  },
  {
    "id": "cses-subarray-sums-i",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1660",
    "title": "Subarray Sums I",
    "statement": [
      "Given an array of n positive integers, count the number of contiguous subarrays whose sum equals target.",
      "All elements in the array are strictly positive integers."
    ],
    "constraints": [
      "1 <= arr.length <= 200000",
      "1 <= target <= 10^9",
      "1 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "subarraySumsI",
      "params": [
        {
          "name": "arr",
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
            4,
            1,
            2,
            7
          ],
          7
        ],
        "explanation": "Subarrays with sum 7 are [2, 4, 1] and [7]. Total count is 2.",
        "output": 3
      },
      {
        "input": [
          [
            1,
            1,
            1,
            1
          ],
          2
        ],
        "explanation": "Subarrays with sum 2 are [1, 1] at indices 0-1, 1-2, and 2-3. Total count is 3.",
        "output": 3
      }
    ],
    "tests": [
      {
        "input": [
          [
            5,
            5,
            5
          ],
          5
        ],
        "output": 3
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5
          ],
          15
        ],
        "output": 1
      },
      {
        "input": [
          [
            10,
            20,
            30
          ],
          5
        ],
        "output": 0
      },
      {
        "input": [
          [
            1000000000
          ],
          1000000000
        ],
        "output": 1
      },
      {
        "input": [
          [
            3,
            1,
            4,
            1,
            5,
            2,
            2
          ],
          5
        ],
        "output": 3
      },
      {
        "input": [
          [
            1,
            2,
            1,
            2,
            1,
            2
          ],
          3
        ],
        "output": 5
      },
      {
        "input": [
          [
            4,
            2,
            1,
            3,
            1,
            1,
            2
          ],
          4
        ],
        "output": 4
      }
    ],
    "hints": [
      "Since all numbers are strictly positive, any subarray sum increases monotonically as the right endpoint expands and decreases as the left endpoint advances.",
      "Use a two-pointer sliding window to maintain a running sum.",
      "Expand right by adding arr[right]. While the sum exceeds target, subtract arr[left] and increment left. Whenever sum == target, increment the answer."
    ],
    "solution": {
      "idea": [
        "Because all elements are positive, the running sum is monotonic.",
        "Maintain a window [left, right] and its sum. For each right, add arr[right]. While sum > target and left <= right, subtract arr[left] and increment left. If sum == target, increment the match count."
      ],
      "complexity": "O(n) time, O(1) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int subarraySumsI(vector<int>& arr, int target) {\n        int l = 0, count = 0;\n        long long sum = 0;\n        for (int r = 0; r < (int)arr.size(); r++) {\n            sum += arr[r];\n            while (sum > target && l <= r) {\n                sum -= arr[l++];\n            }\n            if (sum == target) count++;\n        }\n        return count;\n    }\n};\n"
    }
  },
  {
    "id": "cses-subarray-sums-ii",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1661",
    "title": "Subarray Sums II",
    "statement": [
      "Given an array of n integers (which can be positive, zero, or negative), count the number of contiguous subarrays whose sum equals target."
    ],
    "constraints": [
      "1 <= arr.length <= 200000",
      "-10^9 <= target <= 10^9",
      "-10^9 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "subarraySumsII",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "returns": "long"
    },
    "examples": [
      {
        "input": [
          [
            2,
            -1,
            3,
            5,
            -2
          ],
          7
        ],
        "explanation": "Subarrays with sum 7: [2, -1, 3, 5, -2] (sum 7) and [-1, 3, 5] (sum 7). Total = 2.",
        "output": 2
      },
      {
        "input": [
          [
            0,
            0,
            0
          ],
          0
        ],
        "explanation": "All 6 subarrays have sum 0: three of length 1, two of length 2, one of length 3.",
        "output": 6
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2,
            3
          ],
          3
        ],
        "output": 2
      },
      {
        "input": [
          [
            -1,
            1,
            -1,
            1
          ],
          0
        ],
        "output": 4
      },
      {
        "input": [
          [
            1000000000,
            -1000000000,
            1000000000
          ],
          1000000000
        ],
        "output": 3
      },
      {
        "input": [
          [
            5,
            -5,
            5,
            -5,
            5
          ],
          5
        ],
        "output": 6
      },
      {
        "input": [
          [
            10,
            20,
            30
          ],
          100
        ],
        "output": 0
      },
      {
        "input": [
          [
            -2,
            0,
            2,
            -2,
            2
          ],
          0
        ],
        "output": 6
      },
      {
        "input": [
          [
            1,
            -1,
            1,
            -1,
            1,
            -1
          ],
          0
        ],
        "output": 9
      }
    ],
    "hints": [
      "Because elements can be negative or zero, the two-pointer approach does not work.",
      "A subarray arr[i..j] has sum pref[j + 1] - pref[i]. Setting this equal to target gives pref[i] = pref[j + 1] - target.",
      "Maintain a map of prefix sum frequencies. Initialize with count of 0 being 1. For each prefix sum, add freq[pref - target] to the total."
    ],
    "solution": {
      "idea": [
        "Use prefix sums and a frequency map.",
        "For each element, compute the cumulative prefix sum pref. The number of subarrays ending at the current index with sum equal to target is the frequency of pref - target seen previously. Use a 64-bit integer for prefix sums and total count."
      ],
      "complexity": "O(n log n) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long subarraySumsII(vector<int>& arr, int target) {\n        map<long long, int> freq;\n        freq[0] = 1;\n        long long pref = 0;\n        long long count = 0;\n        for (int x : arr) {\n            pref += x;\n            auto it = freq.find(pref - target);\n            if (it != freq.end()) {\n                count += it->second;\n            }\n            freq[pref]++;\n        }\n        return count;\n    }\n};\n"
    }
  },
  {
    "id": "cses-tasks-and-deadlines",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1630",
    "title": "Tasks and Deadlines",
    "statement": [
      "You are given n tasks to complete. Each task is represented as [duration, deadline].",
      "You process the tasks one after another without pauses, starting at time 0. If task i finishes at time f, your reward for that task is deadline - f (which may be negative).",
      "Find the maximum total reward you can achieve by choosing the optimal task processing order."
    ],
    "constraints": [
      "1 <= tasks.length <= 200000",
      "Each entry has length 2 with 1 <= duration, deadline <= 10^9"
    ],
    "fn": {
      "name": "tasksAndDeadlines",
      "params": [
        {
          "name": "tasks",
          "type": "int[][]"
        }
      ],
      "returns": "long"
    },
    "examples": [
      {
        "input": [
          [
            [
              6,
              10
            ],
            [
              8,
              15
            ],
            [
              5,
              12
            ]
          ]
        ],
        "explanation": "Process in order of duration: task 3 (dur 5, finishes at 5, reward 12-5=7), task 1 (dur 6, finishes at 11, reward 10-11=-1), task 2 (dur 8, finishes at 19, reward 15-19=-4). Total reward = 7 - 1 - 4 = 2.",
        "output": 2
      },
      {
        "input": [
          [
            [
              10,
              5
            ]
          ]
        ],
        "explanation": "Single task finishes at 10, reward 5 - 10 = -5.",
        "output": -5
      }
    ],
    "tests": [
      {
        "input": [
          [
            [
              1,
              10
            ],
            [
              2,
              10
            ],
            [
              3,
              10
            ]
          ]
        ],
        "output": 20
      },
      {
        "input": [
          [
            [
              5,
              20
            ],
            [
              5,
              10
            ],
            [
              5,
              15
            ]
          ]
        ],
        "output": 15
      },
      {
        "input": [
          [
            [
              1000000000,
              1000000000
            ]
          ]
        ],
        "output": 0
      },
      {
        "input": [
          [
            [
              4,
              2
            ],
            [
              3,
              1
            ],
            [
              5,
              3
            ],
            [
              1,
              5
            ]
          ]
        ],
        "output": -15
      },
      {
        "input": [
          [
            [
              10,
              100
            ],
            [
              20,
              200
            ],
            [
              5,
              50
            ]
          ]
        ],
        "output": 295
      },
      {
        "input": [
          [
            [
              2,
              5
            ],
            [
              1,
              2
            ],
            [
              3,
              8
            ],
            [
              2,
              4
            ]
          ]
        ],
        "output": 2
      },
      {
        "input": [
          [
            [
              7,
              10
            ],
            [
              3,
              10
            ],
            [
              5,
              10
            ],
            [
              2,
              10
            ]
          ]
        ],
        "output": 6
      }
    ],
    "hints": [
      "Total reward is sum(deadline_i - finish_time_i) = sum(deadline_i) - sum(finish_time_i).",
      "The sum of deadlines is independent of the order in which tasks are executed.",
      "To minimize the sum of finish times, order tasks by shortest processing time first (duration ascending)."
    ],
    "solution": {
      "idea": [
        "Total reward equals sum(deadlines) - sum(finish_times). The deadline sum is constant regardless of order.",
        "The first task duration is counted n times in the total completion time, the second (n - 1) times, and so on. To minimize this sum, sort tasks by duration in ascending order.",
        "Use 64-bit integers for the running time and total reward to prevent overflow."
      ],
      "complexity": "O(n log n) time, O(1) auxiliary space beyond sorting.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long tasksAndDeadlines(vector<vector<int>>& tasks) {\n        sort(tasks.begin(), tasks.end(), [](const vector<int>& a, const vector<int>& b) {\n            return a[0] < b[0];\n        });\n        long long current_time = 0;\n        long long total_reward = 0;\n        for (const auto& task : tasks) {\n            current_time += task[0];\n            total_reward += (task[1] - current_time);\n        }\n        return total_reward;\n    }\n};\n"
    }
  },
  {
    "id": "cses-sum-of-three-values",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1641",
    "title": "Sum of Three Values",
    "statement": [
      "You are given an array of n integers and a target sum.",
      "Find three distinct positions i, j, and k (1-based indices with 1 <= i < j < k <= n) such that arr[i - 1] + arr[j - 1] + arr[k - 1] == target.",
      "Return the 1-based indices [i, j, k] in strictly increasing order (i < j < k). If no such triplet exists, return [-1, -1, -1]. In all test cases where a solution exists, the triplet of indices is unique."
    ],
    "constraints": [
      "1 <= arr.length <= 5000",
      "1 <= target <= 10^9",
      "1 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "sumOfThreeValues",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
        },
        {
          "name": "target",
          "type": "int"
        }
      ],
      "returns": "int[]"
    },
    "examples": [
      {
        "input": [
          [
            2,
            7,
            5,
            1
          ],
          8
        ],
        "explanation": "arr[0] + arr[2] + arr[3] = 2 + 5 + 1 = 8. Indices are 1, 3, and 4 (1-based), so return [1, 3, 4].",
        "output": [
          1,
          3,
          4
        ]
      },
      {
        "input": [
          [
            1,
            2,
            3
          ],
          10
        ],
        "explanation": "No three elements sum to 10, so return [-1, -1, -1].",
        "output": [
          -1,
          -1,
          -1
        ]
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2,
            3,
            4
          ],
          9
        ],
        "output": [
          2,
          3,
          4
        ]
      },
      {
        "input": [
          [
            1,
            2,
            3
          ],
          6
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
            10,
            20,
            30,
            40
          ],
          50
        ],
        "output": [
          -1,
          -1,
          -1
        ]
      },
      {
        "input": [
          [
            100,
            200,
            300,
            400,
            500
          ],
          1000
        ],
        "output": [
          1,
          4,
          5
        ]
      },
      {
        "input": [
          [
            5,
            1,
            9,
            3,
            7
          ],
          15
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
            10,
            20
          ],
          30
        ],
        "output": [
          -1,
          -1,
          -1
        ]
      },
      {
        "input": [
          [
            8,
            15,
            3,
            2,
            9
          ],
          14
        ],
        "output": [
          3,
          4,
          5
        ]
      }
    ],
    "hints": [
      "Pair each element with its original 1-based index and sort the array by value.",
      "Fix the first element of the triplet by iterating through the sorted array.",
      "For each fixed first element, use two pointers (left and right) on the remaining suffix to find two elements that sum to target - arr[first]."
    ],
    "solution": {
      "idea": [
        "Store each number with its 1-based index and sort by value.",
        "Iterate through the array fixing the first element a[i]. Use two pointers (l = i + 1, r = n - 1) on the remaining elements. If a[i] + a[l] + a[r] == target, sort their original indices and return [i, j, k]. If the sum is too small, advance l; if too large, decrement r. If no triplet is found, return [-1, -1, -1]."
      ],
      "complexity": "O(n^2) time, O(n) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> sumOfThreeValues(vector<int>& arr, int target) {\n        int n = arr.size();\n        vector<pair<int, int>> a(n);\n        for (int i = 0; i < n; i++) a[i] = {arr[i], i + 1};\n        sort(a.begin(), a.end());\n        for (int i = 0; i < n - 2; i++) {\n            int l = i + 1, r = n - 1;\n            while (l < r) {\n                long long s = (long long)a[i].first + a[l].first + a[r].first;\n                if (s == target) {\n                    vector<int> ans = {a[i].second, a[l].second, a[r].second};\n                    sort(ans.begin(), ans.end());\n                    return ans;\n                } else if (s < target) {\n                    l++;\n                } else {\n                    r--;\n                }\n            }\n        }\n        return {-1, -1, -1};\n    }\n};\n"
    }
  },
  {
    "id": "cses-factory-machines",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1620",
    "title": "Factory Machines",
    "statement": [
      "A factory has n machines that make products. Each machine i takes a known time machines[i] to produce one product.",
      "All machines work simultaneously and independently. What is the minimum amount of time required to produce t products?"
    ],
    "constraints": [
      "1 <= machines.length <= 200000",
      "1 <= t <= 10^9",
      "1 <= machines[i] <= 10^9"
    ],
    "fn": {
      "name": "factoryMachines",
      "params": [
        {
          "name": "machines",
          "type": "int[]"
        },
        {
          "name": "t",
          "type": "int"
        }
      ],
      "returns": "long"
    },
    "examples": [
      {
        "input": [
          [
            3,
            2,
            5
          ],
          7
        ],
        "explanation": "In 8 units of time: machine 1 makes 8/3 = 2 products, machine 2 makes 8/2 = 4 products, machine 3 makes 8/5 = 1 product. Total products = 2 + 4 + 1 = 7. Minimum time is 8.",
        "output": 8
      },
      {
        "input": [
          [
            2
          ],
          5
        ],
        "explanation": "A single machine takes 2 time units per product. 5 products take 10 time units.",
        "output": 10
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            1,
            1
          ],
          10
        ],
        "output": 4
      },
      {
        "input": [
          [
            1000000000
          ],
          1000000000
        ],
        "output": 1000000000000000000
      },
      {
        "input": [
          [
            10,
            20,
            30
          ],
          1
        ],
        "output": 10
      },
      {
        "input": [
          [
            4,
            6,
            8,
            10
          ],
          15
        ],
        "output": 24
      },
      {
        "input": [
          [
            5,
            5,
            5,
            5
          ],
          20
        ],
        "output": 25
      },
      {
        "input": [
          [
            1000000000,
            1000000000
          ],
          1
        ],
        "output": 1000000000
      },
      {
        "input": [
          [
            3,
            7,
            11
          ],
          50
        ],
        "output": 90
      }
    ],
    "hints": [
      "If you are given a fixed time limit T, can you easily determine how many products the factory can produce?",
      "In time T, machine i produces floor(T / machines[i]) products. The total count is sum(floor(T / machines[i])).",
      "Since the total number of products increases monotonically with T, binary search for the minimum time T such that total products >= t."
    ],
    "solution": {
      "idea": [
        "Binary search over the answer (time T).",
        "The lower bound is 1 and the upper bound is min(machines) * t (using the fastest machine exclusively). For a candidate time mid, compute sum(mid / m). Stop summing early if the count reaches t to prevent 64-bit overflow. If products >= t, try smaller times; otherwise increase time."
      ],
      "complexity": "O(n log(min(machines) * t)) time, O(1) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long factoryMachines(vector<int>& machines, int t) {\n        long long lo = 1;\n        int min_val = machines[0];\n        for (int m : machines) min_val = min(min_val, m);\n        long long hi = (long long)min_val * t;\n        long long ans = hi;\n        while (lo <= hi) {\n            long long mid = lo + (hi - lo) / 2;\n            long long products = 0;\n            for (int m : machines) {\n                products += mid / m;\n                if (products >= t) break;\n            }\n            if (products >= t) {\n                ans = mid;\n                hi = mid - 1;\n            } else {\n                lo = mid + 1;\n            }\n        }\n        return ans;\n    }\n};\n"
    }
  },
  {
    "id": "cses-array-division",
    "source": "cses",
    "url": "https://cses.fi/problemset/task/1085",
    "title": "Array Division",
    "statement": [
      "Given an array of n positive integers, divide the array into k contiguous non-empty subarrays such that the maximum subarray sum is minimized.",
      "Find this minimum possible maximum subarray sum."
    ],
    "constraints": [
      "1 <= k <= arr.length <= 200000",
      "1 <= arr[i] <= 10^9"
    ],
    "fn": {
      "name": "arrayDivision",
      "params": [
        {
          "name": "arr",
          "type": "int[]"
        },
        {
          "name": "k",
          "type": "int"
        }
      ],
      "returns": "long"
    },
    "examples": [
      {
        "input": [
          [
            2,
            4,
            7,
            3,
            5
          ],
          3
        ],
        "explanation": "Optimal division into 3 subarrays: [2, 4], [7], [3, 5]. Their sums are 6, 7, 8. The maximum sum is 8.",
        "output": 8
      },
      {
        "input": [
          [
            1,
            2,
            3,
            4
          ],
          4
        ],
        "explanation": "Each element forms its own subarray: [1], [2], [3], [4]. The maximum sum is 4.",
        "output": 4
      }
    ],
    "tests": [
      {
        "input": [
          [
            1,
            2,
            3,
            4,
            5
          ],
          1
        ],
        "output": 15
      },
      {
        "input": [
          [
            10,
            10,
            10,
            10
          ],
          2
        ],
        "output": 20
      },
      {
        "input": [
          [
            1000000000,
            1000000000
          ],
          1
        ],
        "output": 2000000000
      },
      {
        "input": [
          [
            5,
            1,
            2,
            7,
            3,
            4
          ],
          3
        ],
        "output": 8
      },
      {
        "input": [
          [
            100
          ],
          1
        ],
        "output": 100
      },
      {
        "input": [
          [
            3,
            2,
            4,
            1,
            2,
            5
          ],
          4
        ],
        "output": 5
      },
      {
        "input": [
          [
            1,
            1000000000,
            1
          ],
          2
        ],
        "output": 1000000001
      }
    ],
    "hints": [
      "Consider the decision problem: can the array be divided into at most k subarrays such that no subarray exceeds a given maximum sum M?",
      "To check a sum M, greedily pack elements into the current subarray until adding the next element would exceed M, then start a new subarray. Count how many subarrays are formed.",
      "Binary search on M between max(arr) and sum(arr)."
    ],
    "solution": {
      "idea": [
        "Binary search on the maximum subarray sum.",
        "The search range is [max(arr), sum(arr)]. For a test value mid, greedily accumulate elements into the current subarray; when the next element would cause the sum to exceed mid, start a new subarray. If the total number of subarrays is <= k, mid is achievable, so search lower; otherwise search higher."
      ],
      "complexity": "O(n log(sum(arr))) time, O(1) space.",
      "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    long long arrayDivision(vector<int>& arr, int k) {\n        long long lo = 0, hi = 0;\n        for (int x : arr) {\n            lo = max(lo, (long long)x);\n            hi += x;\n        }\n        long long ans = hi;\n        while (lo <= hi) {\n            long long mid = lo + (hi - lo) / 2;\n            int count = 1;\n            long long cur = 0;\n            for (int x : arr) {\n                if (cur + x > mid) {\n                    count++;\n                    cur = x;\n                } else {\n                    cur += x;\n                }\n            }\n            if (count <= k) {\n                ans = mid;\n                hi = mid - 1;\n            } else {\n                lo = mid + 1;\n            }\n        }\n        return ans;\n    }\n};\n"
    }
  }
];
