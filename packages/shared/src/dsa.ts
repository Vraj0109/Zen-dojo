// DSA patterns and practice problems from the roadmap PDF ("DSA patterns" section).
// LeetCode titles/slugs/difficulties are the official ones; the PDF abbreviates some titles.

import { addDays, daysBetween } from "./dates";

export type Difficulty = "easy" | "medium" | "hard";

export interface Problem {
  id: string; // "lc-560" for LeetCode, "c-..." for other items
  title: string;
  url?: string;
  /** LeetCode only */
  number?: number;
  slug?: string;
  difficulty?: Difficulty;
  premium?: boolean;
  /** One line on what the problem teaches (shown in the problem header and as a tooltip in lists) */
  why?: string;
}

export interface Pattern {
  id: string;
  name: string;
  recognize: string;
  problems: string[]; // Problem ids
}

export interface PatternGroup {
  id: string;
  title: string;
  patterns: Pattern[];
}

const D = { E: "easy", M: "medium", H: "hard" } as const;

function lc(number: number, title: string, slug: string, d: keyof typeof D, premium = false): Problem {
  return {
    id: `lc-${number}`,
    number,
    title,
    slug,
    difficulty: D[d],
    url: `https://leetcode.com/problems/${slug}/`,
    ...(premium ? { premium } : {}),
  };
}

/** A CSES Problem Set task (https://cses.fi/problemset/). Judged in the app like the LeetCode ones; no LeetCode data. */
function cses(slug: string, title: string, task: number, why?: string): Problem {
  return { id: `cses-${slug}`, title, url: `https://cses.fi/problemset/task/${task}`, ...(why ? { why } : {}) };
}

function other(id: string, title: string, url?: string): Problem {
  return { id: `c-${id}`, title, ...(url ? { url } : {}) };
}

const PROBLEM_LIST: Problem[] = [
  // 1. Arrays, strings, hashing
  lc(1, "Two Sum", "two-sum", "E"),
  lc(49, "Group Anagrams", "group-anagrams", "M"),
  lc(347, "Top K Frequent Elements", "top-k-frequent-elements", "M"),
  lc(128, "Longest Consecutive Sequence", "longest-consecutive-sequence", "M"),
  lc(560, "Subarray Sum Equals K", "subarray-sum-equals-k", "M"),
  lc(303, "Range Sum Query - Immutable", "range-sum-query-immutable", "E"),
  lc(238, "Product of Array Except Self", "product-of-array-except-self", "M"),
  lc(1094, "Car Pooling", "car-pooling", "M"),
  lc(1109, "Corporate Flight Bookings", "corporate-flight-bookings", "M"),
  lc(15, "3Sum", "3sum", "M"),
  lc(11, "Container With Most Water", "container-with-most-water", "M"),
  lc(42, "Trapping Rain Water", "trapping-rain-water", "H"),
  lc(26, "Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array", "E"),
  lc(3, "Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", "M"),
  lc(76, "Minimum Window Substring", "minimum-window-substring", "H"),
  lc(904, "Fruit Into Baskets", "fruit-into-baskets", "M"),
  lc(239, "Sliding Window Maximum", "sliding-window-maximum", "H"),
  lc(53, "Maximum Subarray", "maximum-subarray", "M"),
  lc(152, "Maximum Product Subarray", "maximum-product-subarray", "M"),
  lc(918, "Maximum Sum Circular Subarray", "maximum-sum-circular-subarray", "M"),
  lc(56, "Merge Intervals", "merge-intervals", "M"),
  lc(57, "Insert Interval", "insert-interval", "M"),
  lc(253, "Meeting Rooms II", "meeting-rooms-ii", "M", true),
  lc(435, "Non-overlapping Intervals", "non-overlapping-intervals", "M"),
  lc(759, "Employee Free Time", "employee-free-time", "H", true),
  lc(41, "First Missing Positive", "first-missing-positive", "H"),
  lc(442, "Find All Duplicates in an Array", "find-all-duplicates-in-an-array", "M"),
  lc(28, "Find the Index of the First Occurrence in a String", "find-the-index-of-the-first-occurrence-in-a-string", "E"),
  other("z-function", "Z-function", "https://cp-algorithms.com/string/z-function.html"),
  other("rabin-karp", "Rabin-Karp Algorithm", "https://cp-algorithms.com/string/rabin-karp.html"),
  lc(1392, "Longest Happy Prefix", "longest-happy-prefix", "H"),
  lc(686, "Repeated String Match", "repeated-string-match", "M"),
  lc(54, "Spiral Matrix", "spiral-matrix", "M"),
  lc(48, "Rotate Image", "rotate-image", "M"),
  lc(73, "Set Matrix Zeroes", "set-matrix-zeroes", "M"),
  // 2. Searching and sorting
  lc(33, "Search in Rotated Sorted Array", "search-in-rotated-sorted-array", "M"),
  lc(162, "Find Peak Element", "find-peak-element", "M"),
  lc(4, "Median of Two Sorted Arrays", "median-of-two-sorted-arrays", "H"),
  lc(875, "Koko Eating Bananas", "koko-eating-bananas", "M"),
  lc(1011, "Capacity To Ship Packages Within D Days", "capacity-to-ship-packages-within-d-days", "M"),
  lc(410, "Split Array Largest Sum", "split-array-largest-sum", "H"),
  other("aggressive-cows", "Aggressive Cows (SPOJ AGGRCOW)", "https://www.spoj.com/problems/AGGRCOW/"),
  lc(215, "Kth Largest Element in an Array", "kth-largest-element-in-an-array", "M"),
  lc(75, "Sort Colors", "sort-colors", "M"),
  lc(179, "Largest Number", "largest-number", "M"),
  lc(406, "Queue Reconstruction by Height", "queue-reconstruction-by-height", "M"),
  lc(315, "Count of Smaller Numbers After Self", "count-of-smaller-numbers-after-self", "H"),
  lc(493, "Reverse Pairs", "reverse-pairs", "H"),
  // 3. Linked lists, stacks, queues, heaps
  lc(142, "Linked List Cycle II", "linked-list-cycle-ii", "M"),
  lc(287, "Find the Duplicate Number", "find-the-duplicate-number", "M"),
  lc(143, "Reorder List", "reorder-list", "M"),
  lc(92, "Reverse Linked List II", "reverse-linked-list-ii", "M"),
  lc(25, "Reverse Nodes in k-Group", "reverse-nodes-in-k-group", "H"),
  lc(739, "Daily Temperatures", "daily-temperatures", "M"),
  lc(84, "Largest Rectangle in Histogram", "largest-rectangle-in-histogram", "H"),
  lc(85, "Maximal Rectangle", "maximal-rectangle", "H"),
  lc(907, "Sum of Subarray Minimums", "sum-of-subarray-minimums", "M"),
  lc(901, "Online Stock Span", "online-stock-span", "M"),
  lc(862, "Shortest Subarray with Sum at Least K", "shortest-subarray-with-sum-at-least-k", "H"),
  lc(20, "Valid Parentheses", "valid-parentheses", "E"),
  lc(32, "Longest Valid Parentheses", "longest-valid-parentheses", "H"),
  lc(224, "Basic Calculator", "basic-calculator", "H"),
  lc(227, "Basic Calculator II", "basic-calculator-ii", "M"),
  lc(772, "Basic Calculator III", "basic-calculator-iii", "H", true),
  lc(394, "Decode String", "decode-string", "M"),
  lc(23, "Merge k Sorted Lists", "merge-k-sorted-lists", "H"),
  lc(295, "Find Median from Data Stream", "find-median-from-data-stream", "H"),
  lc(621, "Task Scheduler", "task-scheduler", "M"),
  lc(502, "IPO", "ipo", "H"),
  lc(480, "Sliding Window Median", "sliding-window-median", "H"),
  lc(146, "LRU Cache", "lru-cache", "M"),
  lc(460, "LFU Cache", "lfu-cache", "H"),
  lc(432, "All O`one Data Structure", "all-oone-data-structure", "H"),
  // 4. Trees
  lc(98, "Validate Binary Search Tree", "validate-binary-search-tree", "M"),
  lc(236, "Lowest Common Ancestor of a Binary Tree", "lowest-common-ancestor-of-a-binary-tree", "M"),
  lc(543, "Diameter of Binary Tree", "diameter-of-binary-tree", "E"),
  lc(124, "Binary Tree Maximum Path Sum", "binary-tree-maximum-path-sum", "H"),
  lc(102, "Binary Tree Level Order Traversal", "binary-tree-level-order-traversal", "M"),
  lc(199, "Binary Tree Right Side View", "binary-tree-right-side-view", "M"),
  lc(987, "Vertical Order Traversal of a Binary Tree", "vertical-order-traversal-of-a-binary-tree", "H"),
  lc(105, "Construct Binary Tree from Preorder and Inorder Traversal", "construct-binary-tree-from-preorder-and-inorder-traversal", "M"),
  lc(297, "Serialize and Deserialize Binary Tree", "serialize-and-deserialize-binary-tree", "H"),
  lc(230, "Kth Smallest Element in a BST", "kth-smallest-element-in-a-bst", "M"),
  lc(173, "Binary Search Tree Iterator", "binary-search-tree-iterator", "M"),
  lc(99, "Recover Binary Search Tree", "recover-binary-search-tree", "M"),
  lc(337, "House Robber III", "house-robber-iii", "M"),
  lc(834, "Sum of Distances in Tree", "sum-of-distances-in-tree", "H"),
  lc(1483, "Kth Ancestor of a Tree Node", "kth-ancestor-of-a-tree-node", "H"),
  other("subtree-range-queries", "Subtree range queries (Euler tour)"),
  lc(208, "Implement Trie (Prefix Tree)", "implement-trie-prefix-tree", "M"),
  lc(212, "Word Search II", "word-search-ii", "H"),
  lc(421, "Maximum XOR of Two Numbers in an Array", "maximum-xor-of-two-numbers-in-an-array", "M"),
  lc(211, "Design Add and Search Words Data Structure", "design-add-and-search-words-data-structure", "M"),
  // 5. Graphs
  lc(994, "Rotting Oranges", "rotting-oranges", "M"),
  lc(127, "Word Ladder", "word-ladder", "H"),
  lc(542, "01 Matrix", "01-matrix", "M"),
  lc(934, "Shortest Bridge", "shortest-bridge", "M"),
  lc(200, "Number of Islands", "number-of-islands", "M"),
  lc(133, "Clone Graph", "clone-graph", "M"),
  lc(417, "Pacific Atlantic Water Flow", "pacific-atlantic-water-flow", "M"),
  lc(207, "Course Schedule", "course-schedule", "M"),
  lc(210, "Course Schedule II", "course-schedule-ii", "M"),
  lc(269, "Alien Dictionary", "alien-dictionary", "H", true),
  lc(2050, "Parallel Courses III", "parallel-courses-iii", "H"),
  lc(547, "Number of Provinces", "number-of-provinces", "M"),
  lc(721, "Accounts Merge", "accounts-merge", "M"),
  lc(684, "Redundant Connection", "redundant-connection", "M"),
  lc(305, "Number of Islands II", "number-of-islands-ii", "H", true),
  lc(743, "Network Delay Time", "network-delay-time", "M"),
  lc(787, "Cheapest Flights Within K Stops", "cheapest-flights-within-k-stops", "M"),
  lc(1631, "Path With Minimum Effort", "path-with-minimum-effort", "M"),
  lc(778, "Swim in Rising Water", "swim-in-rising-water", "H"),
  lc(2290, "Minimum Obstacle Removal to Reach Corner", "minimum-obstacle-removal-to-reach-corner", "H"),
  lc(1334, "Find the City With the Smallest Number of Neighbors at a Threshold Distance", "find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance", "M"),
  lc(1584, "Min Cost to Connect All Points", "min-cost-to-connect-all-points", "M"),
  lc(1168, "Optimize Water Distribution in a Village", "optimize-water-distribution-in-a-village", "H", true),
  lc(785, "Is Graph Bipartite?", "is-graph-bipartite", "M"),
  lc(886, "Possible Bipartition", "possible-bipartition", "M"),
  lc(1192, "Critical Connections in a Network", "critical-connections-in-a-network", "H"),
  lc(332, "Reconstruct Itinerary", "reconstruct-itinerary", "H"),
  lc(752, "Open the Lock", "open-the-lock", "M"),
  lc(773, "Sliding Puzzle", "sliding-puzzle", "H"),
  lc(847, "Shortest Path Visiting All Nodes", "shortest-path-visiting-all-nodes", "H"),
  // 6. Recursion, backtracking, bit manipulation
  lc(78, "Subsets", "subsets", "M"),
  lc(90, "Subsets II", "subsets-ii", "M"),
  lc(46, "Permutations", "permutations", "M"),
  lc(47, "Permutations II", "permutations-ii", "M"),
  lc(40, "Combination Sum II", "combination-sum-ii", "M"),
  lc(22, "Generate Parentheses", "generate-parentheses", "M"),
  lc(51, "N-Queens", "n-queens", "H"),
  lc(37, "Sudoku Solver", "sudoku-solver", "H"),
  lc(79, "Word Search", "word-search", "M"),
  lc(131, "Palindrome Partitioning", "palindrome-partitioning", "M"),
  lc(301, "Remove Invalid Parentheses", "remove-invalid-parentheses", "H"),
  lc(1755, "Closest Subsequence Sum", "closest-subsequence-sum", "H"),
  lc(2035, "Partition Array Into Two Arrays to Minimize Sum Difference", "partition-array-into-two-arrays-to-minimize-sum-difference", "H"),
  lc(136, "Single Number", "single-number", "E"),
  lc(137, "Single Number II", "single-number-ii", "M"),
  lc(260, "Single Number III", "single-number-iii", "M"),
  lc(338, "Counting Bits", "counting-bits", "E"),
  lc(698, "Partition to K Equal Sum Subsets", "partition-to-k-equal-sum-subsets", "M"),
  lc(1434, "Number of Ways to Wear Different Hats to Each Other", "number-of-ways-to-wear-different-hats-to-each-other", "H"),
  // 7. Dynamic programming
  lc(70, "Climbing Stairs", "climbing-stairs", "E"),
  lc(198, "House Robber", "house-robber", "M"),
  lc(91, "Decode Ways", "decode-ways", "M"),
  lc(139, "Word Break", "word-break", "M"),
  lc(45, "Jump Game II", "jump-game-ii", "M"),
  lc(322, "Coin Change", "coin-change", "M"),
  lc(518, "Coin Change II", "coin-change-ii", "M"),
  lc(416, "Partition Equal Subset Sum", "partition-equal-subset-sum", "M"),
  lc(494, "Target Sum", "target-sum", "M"),
  lc(474, "Ones and Zeroes", "ones-and-zeroes", "M"),
  lc(300, "Longest Increasing Subsequence", "longest-increasing-subsequence", "M"),
  lc(354, "Russian Doll Envelopes", "russian-doll-envelopes", "H"),
  lc(673, "Number of Longest Increasing Subsequence", "number-of-longest-increasing-subsequence", "M"),
  lc(62, "Unique Paths", "unique-paths", "M"),
  lc(64, "Minimum Path Sum", "minimum-path-sum", "M"),
  lc(221, "Maximal Square", "maximal-square", "M"),
  lc(741, "Cherry Pickup", "cherry-pickup", "H"),
  lc(329, "Longest Increasing Path in a Matrix", "longest-increasing-path-in-a-matrix", "H"),
  lc(72, "Edit Distance", "edit-distance", "M"),
  lc(1143, "Longest Common Subsequence", "longest-common-subsequence", "M"),
  lc(10, "Regular Expression Matching", "regular-expression-matching", "H"),
  lc(44, "Wildcard Matching", "wildcard-matching", "H"),
  lc(115, "Distinct Subsequences", "distinct-subsequences", "H"),
  lc(312, "Burst Balloons", "burst-balloons", "H"),
  lc(132, "Palindrome Partitioning II", "palindrome-partitioning-ii", "H"),
  lc(1000, "Minimum Cost to Merge Stones", "minimum-cost-to-merge-stones", "H"),
  lc(121, "Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "E"),
  lc(122, "Best Time to Buy and Sell Stock II", "best-time-to-buy-and-sell-stock-ii", "M"),
  lc(123, "Best Time to Buy and Sell Stock III", "best-time-to-buy-and-sell-stock-iii", "H"),
  lc(188, "Best Time to Buy and Sell Stock IV", "best-time-to-buy-and-sell-stock-iv", "H"),
  lc(309, "Best Time to Buy and Sell Stock with Cooldown", "best-time-to-buy-and-sell-stock-with-cooldown", "M"),
  lc(902, "Numbers At Most N Given Digit Set", "numbers-at-most-n-given-digit-set", "H"),
  lc(357, "Count Numbers with Unique Digits", "count-numbers-with-unique-digits", "M"),
  lc(968, "Binary Tree Cameras", "binary-tree-cameras", "H"),
  other("tsp", "Travelling Salesman (bitmask DP)"),
  lc(1986, "Minimum Number of Work Sessions to Finish the Tasks", "minimum-number-of-work-sessions-to-finish-the-tasks", "M"),
  other("dp-optimizations", "Know they exist: monotone queue DP, convex hull trick, divide & conquer DP, Knuth"),
  // 8. Greedy and math
  lc(55, "Jump Game", "jump-game", "M"),
  lc(134, "Gas Station", "gas-station", "M"),
  lc(135, "Candy", "candy", "H"),
  lc(763, "Partition Labels", "partition-labels", "M"),
  lc(452, "Minimum Number of Arrows to Burst Balloons", "minimum-number-of-arrows-to-burst-balloons", "M"),
  lc(767, "Reorganize String", "reorganize-string", "M"),
  lc(204, "Count Primes", "count-primes", "M"),
  lc(50, "Pow(x, n)", "powx-n", "M"),
  lc(372, "Super Pow", "super-pow", "M"),
  other("modular-inverse", "Modular inverse", "https://cp-algorithms.com/algebra/module-inverse.html"),
  other("ncr-mod-p", "nCr mod p", "https://cp-algorithms.com/combinatorics/binomial-coefficients.html"),
  lc(528, "Random Pick with Weight", "random-pick-with-weight", "M"),
  lc(382, "Linked List Random Node", "linked-list-random-node", "M"),
  lc(149, "Max Points on a Line", "max-points-on-a-line", "H"),
  lc(223, "Rectangle Area", "rectangle-area", "M"),
  // 9. Advanced structures
  lc(307, "Range Sum Query - Mutable", "range-sum-query-mutable", "M"),
  lc(327, "Count of Range Sum", "count-of-range-sum", "H"),
  lc(699, "Falling Squares", "falling-squares", "H"),
  other("sparse-table", "Sparse table: O(1) static range min/max", "https://cp-algorithms.com/data_structures/sparse-table.html"),
  other("sqrt-decomposition", "Sqrt decomposition", "https://cp-algorithms.com/data_structures/sqrt_decomposition.html"),
  lc(729, "My Calendar I", "my-calendar-i", "M"),
  lc(731, "My Calendar II", "my-calendar-ii", "M"),
  lc(732, "My Calendar III", "my-calendar-iii", "H"),
  lc(220, "Contains Duplicate III", "contains-duplicate-iii", "H"),
  other("bloom-filter", "Bloom filter idea"),
  other("consistent-hashing", "Consistent hashing (links to system design)"),
  lc(355, "Design Twitter", "design-twitter", "M"),
  lc(362, "Design Hit Counter", "design-hit-counter", "M", true),
  lc(981, "Time Based Key-Value Store", "time-based-key-value-store", "M"),
  lc(1146, "Snapshot Array", "snapshot-array", "M"),
  lc(380, "Insert Delete GetRandom O(1)", "insert-delete-getrandom-o1", "M"),
  // 10. CSES Problem Set
  cses("weird-algorithm", "Weird Algorithm", 1068, "Loop with Collatz branching; teaches while-loops and integer overflow."),
  cses("missing-number", "Missing Number", 1083, "Find one missing element; teaches XOR or sum formula for O(1) space."),
  cses("repetitions", "Repetitions", 1069, "Longest run of equal characters; teaches the single-pass streak counter."),
  cses("increasing-array", "Increasing Array", 1094, "Greedy pass making elements non-decreasing; teaches prefix maximum."),
  cses("permutations", "Permutations", 1070, "Constructive arrangement avoiding adjacent difference 1; evens then odds."),
  cses("number-spiral", "Number Spiral", 1071, "Direct coordinate math on square layers without simulating the grid."),
  cses("two-knights", "Two Knights", 1072, "Combinatorics: total pairs minus pairs that attack each other in 2x3 boxes."),
  cses("two-sets", "Two Sets", 1092, "Partition 1..n into equal sums using the modular pattern of sum % 4."),
  cses("bit-strings", "Bit Strings", 1617, "Fast modular exponentiation: 2^n mod 10^9+7 in O(log n) time."),
  cses("trailing-zeros", "Trailing Zeros", 1618, "Legendre formula: count factors of 5 in n!."),
  cses("coin-piles", "Coin Piles", 1754, "Solve 2a + b = x and a + 2b = y via integer division and bounds."),
  cses("palindrome-reorder", "Palindrome Reorder", 1755, "Character frequency parity: at most one odd count, mirror the pairs."),
  cses("creating-strings", "Creating Strings", 1622, "Recursion with backtracking or next_permutation to enumerate unique anagrams."),
  cses("apple-division", "Apple Division", 1623, "Exhaustive subset generation over n <= 20 via bitmask to minimize difference."),
  cses("chessboard-and-queens", "Chessboard and Queens", 1624, "Classic 8-queens backtracking with column and diagonal bitmasks."),
  cses("digit-queries", "Digit Queries", 2431, "Digit counting in length buckets (1-digit, 2-digit, ...) to pinpoint the target number."),
  cses("grid-coloring-i", "Grid Coloring I", 3311, "Greedy row-major recoloring with 4 colors avoiding old color and 2 neighbors."),
  cses("gray-code", "Gray Code", 2205, "Recursive prefix reflection: 0+G, 1+rev(G) or i ^ (i >> 1)."),
  cses("tower-of-hanoi", "Tower of Hanoi", 2165, "Divide-and-conquer recursion: move n-1, move base, move n-1."),
  cses("mex-grid-construction", "Mex Grid Construction", 3419, "Constructive mex assignment across rows and columns using diagonal offsets."),
  cses("knight-moves-grid", "Knight Moves Grid", 3217, "Unweighted BFS from (0, 0) over the 8 knight moves on an n x n board."),
  cses("string-reorder", "String Reorder", 1743, "Greedy placement of alphabetically smallest letter with remaining feasibility check."),
  cses("grid-path-description", "Grid Path Description", 1625, "Backtracking with geometric pruning (early wall collision and bifurcation)."),
  cses("distinct-numbers", "Distinct Numbers", 1621, "Sort or hash set to count unique elements in O(n log n) or O(n)."),
  cses("apartments", "Apartments", 1084, "Two pointers on two sorted arrays to match applicants with closest sizes."),
  cses("ferris-wheel", "Ferris Wheel", 1090, "Greedy two-pointer pairing of heaviest and lightest child under weight limit."),
  cses("concert-tickets", "Concert Tickets", 1091, "Binary search on multiset using upper_bound to find largest ticket <= budget."),
  cses("restaurant-customers", "Restaurant Customers", 1619, "Sweep line / coordinate compression on arrival and departure events."),
  cses("movie-festival", "Movie Festival", 1629, "Classic activity selection: sort intervals by end time and greedily accept."),
  cses("sum-of-two-values", "Sum of Two Values", 1640, "Sort and two pointers or hash map to find pair summing to target."),
  cses("maximum-subarray-sum", "Maximum Subarray Sum", 1643, "Kadane's algorithm: dynamic programming keeping current running max."),
  cses("stick-lengths", "Stick Lengths", 1074, "Median minimizes L1 distance sum: sort and pick middle element."),
  cses("missing-coin-sum", "Missing Coin Sum", 2183, "Greedy prefix reachable sum: if next coin > reach + 1, reach + 1 is missing."),
  cses("collecting-numbers", "Collecting Numbers", 2216, "Store positions of 1..n and count backward transitions where pos[x] > pos[x+1]."),
  cses("playlist", "Playlist", 1141, "Sliding window with two pointers and last-seen index map for distinct subarray."),
  cses("towers", "Towers", 1073, "Patience sorting with upper_bound: minimal towers equals longest non-decreasing subseq."),
  cses("traffic-lights", "Traffic Lights", 1163, "Ordered set of cut points and multiset of segment lengths to track max gap."),
  cses("distinct-values-subarrays", "Distinct Values Subarrays", 3420, "Sliding window two-pointer tracking frequency map to count valid subarrays."),
  cses("nearest-smaller-values", "Nearest Smaller Values", 1645, "Monotonic stack keeping strictly increasing elements to find nearest smaller left."),
  cses("subarray-sums-i", "Subarray Sums I", 1660, "Two pointers on positive array or prefix sum hash map for exact sum x."),
  cses("subarray-sums-ii", "Subarray Sums II", 1661, "Prefix sum hash map with frequency counting for arbitrary/negative numbers."),
  cses("tasks-and-deadlines", "Tasks and Deadlines", 1630, "Exchange argument: sort by duration alone to minimize completion time sum."),
  cses("sum-of-three-values", "Sum of Three Values", 1641, "Fix first element and run two-pointer search on remaining sorted suffix."),
  cses("factory-machines", "Factory Machines", 1620, "Binary search on answer: check if sum(t / k_i) >= products in time t."),
  cses("array-division", "Array Division", 1085, "Binary search on answer: check if array can be partitioned into k subarrays of max sum."),
  cses("dice-combinations", "Dice Combinations", 1633, "1D linear DP: transitions from previous 6 values dp[i] = sum(dp[i-k])."),
  cses("minimizing-coins", "Minimizing Coins", 1634, "Unbounded knapsack: min coins to reach sum x with dp[i] = min(dp[i - c] + 1)."),
  cses("coin-combinations-i", "Coin Combinations I", 1635, "Ordered coin combinations: outer loop on sum, inner on coin values."),
  cses("coin-combinations-ii", "Coin Combinations II", 1636, "Unordered coin combinations: outer loop on coins, inner on sums (0/1 unbounded)."),
  cses("removing-digits", "Removing Digits", 1637, "Greedy or 1D DP: transition subtracting each decimal digit of current number."),
  cses("grid-paths-i", "Grid Paths I", 1638, "2D grid DP counting paths from top-left to bottom-right avoiding traps."),
  cses("book-shop", "Book Shop", 1158, "Classic 0/1 knapsack with space optimization: outer loop books, reverse loop price."),
  cses("array-description", "Array Description", 1746, "State DP dp[i][v]: number of ways filling index i with value v satisfying abs(diff) <= 1."),
  cses("edit-distance", "Edit Distance", 1639, "Classic two-string DP matching characters with insert, delete, replace operations."),
  cses("rectangle-cutting", "Rectangle Cutting", 1744, "2D interval DP: min cuts to partition a x b rectangle into squares."),
  cses("money-sums", "Money Sums", 1745, "Subset sum reachability using boolean DP or bitset over coin array."),
  cses("removal-game", "Removal Game", 1097, "Game theory interval DP: minimax strategy choosing left or right end of deque."),
  cses("two-sets-ii", "Two Sets II", 1093, "Subset sum counting: number of ways to pick subset of 1..n summing to total/2."),
  cses("counting-rooms", "Counting Rooms", 1192, "Grid traversal using BFS/DFS to count connected components of floor cells."),
  cses("labyrinth", "Labyrinth", 1193, "BFS on unweighted grid to find shortest path and reconstruct directional moves."),
  cses("building-roads", "Building Roads", 1666, "Connected components using BFS/DFS or Disjoint Set Union (DSU)."),
  cses("message-route", "Message Route", 1667, "Unweighted shortest path using BFS on adjacency list with parent pointers."),
  cses("building-teams", "Building Teams", 1668, "Bipartite graph coloring using 2-coloring BFS/DFS to detect odd cycles."),
  cses("round-trip", "Round Trip", 1669, "Cycle detection in undirected graph using DFS back-edge detection."),
  cses("monsters", "Monsters", 1194, "Multi-source BFS: propagate monster arrival times, then check escape path."),
  cses("shortest-routes-i", "Shortest Routes I", 1671, "Single-source shortest paths on non-negative weighted graph via Dijkstra's algorithm."),
  cses("cycle-finding", "Cycle Finding", 1197, "Negative cycle detection and extraction using Bellman-Ford / SPFA."),
  cses("course-schedule", "Course Schedule", 1679, "Topological sort on directed graph using Kahn's algorithm (in-degrees) or DFS."),
  cses("longest-flight-route", "Longest Flight Route", 1680, "Longest path in a Directed Acyclic Graph (DAG) using topological order DP."),
  cses("game-routes", "Game Routes", 1681, "Count paths from 1 to n in a DAG using topological order DP."),
  cses("flight-discount", "Flight Discount", 1195, "State-space Dijkstra on 2 layers (coupon unused vs coupon used)."),
  cses("static-range-sum-queries", "Static Range Sum Queries", 1646, "Prefix sum array to answer static range sum queries in O(1) time."),
  cses("static-range-minimum-queries", "Static Range Minimum Queries", 1647, "Sparse table with binary powers for O(1) static range minimum queries."),
  cses("dynamic-range-sum-queries", "Dynamic Range Sum Queries", 1648, "Binary Indexed Tree (Fenwick tree) or Segment Tree for point update, range sum."),
  cses("subordinates", "Subordinates", 1674, "Tree DFS subtree size aggregation from leaves to root."),
  cses("tree-diameter", "Tree Diameter", 1131, "Two BFS passes or tree DP to compute max distance between two tree nodes."),
  cses("exponentiation", "Exponentiation", 1095, "Binary exponentiation computing a^b mod 10^9+7 in O(log b) time."),
  cses("counting-divisors", "Counting Divisors", 1713, "Sieve of Eratosthenes or prime factorization to compute divisor counts."),
  cses("common-divisors", "Common Divisors", 1081, "Bucket frequency count and GCD sieve from max value down to 1."),
  cses("binomial-coefficients", "Binomial Coefficients", 1079, "Precomputed factorials and modular inverse via Fermat's Little Theorem for nCr."),
  cses("fibonacci-numbers", "Fibonacci Numbers", 1722, "2x2 matrix exponentiation to compute nth Fibonacci number in O(log n)."),
  cses("string-matching", "String Matching", 1753, "KMP algorithm (Knuth-Morris-Pratt) or Z-algorithm for linear pattern matching."),
];

export const PROBLEMS: Record<string, Problem> = Object.fromEntries(PROBLEM_LIST.map((p) => [p.id, p]));

const L = (...numbers: number[]) => numbers.map((n) => `lc-${n}`);
const C = (...ids: string[]) => ids.map((id) => `c-${id}`);
const C2 = (...slugs: string[]) => slugs.map((slug) => `cses-${slug}`);

export const DSA_GROUPS: PatternGroup[] = [
  {
    id: "arrays",
    title: "Arrays, strings, hashing",
    patterns: [
      { id: "hash-map", name: "Hash map / counting", recognize: "Pairs, duplicates, frequency, anagrams", problems: L(1, 49, 347, 560, 128) },
      { id: "prefix-sums", name: "Prefix sums / difference array", recognize: "Range sums, many range updates", problems: L(303, 238, 1094, 1109) },
      { id: "two-pointers", name: "Two pointers", recognize: "Sorted array, pairs, in-place edits", problems: L(15, 11, 42, 26) },
      { id: "sliding-window", name: "Sliding window (fixed + variable)", recognize: "Longest/shortest substring or subarray with a condition", problems: L(3, 76, 904, 239) },
      { id: "kadane", name: "Kadane / subarray DP", recognize: "Max subarray, circular variants", problems: L(53, 152, 918) },
      { id: "intervals", name: "Intervals", recognize: "Merge, overlap, scheduling", problems: L(56, 57, 253, 435, 759) },
      { id: "cyclic-sort", name: "Cyclic sort / index as hash", recognize: "Values in range 1..n, find missing/duplicate", problems: L(41, 442) },
      { id: "string-matching", name: "String matching", recognize: "Substring search, repeated patterns", problems: [...L(28), ...C("z-function", "rabin-karp"), ...L(1392, 686)] },
      { id: "matrix", name: "Matrix traversal", recognize: "Spiral, rotate, in-place marking", problems: L(54, 48, 73) },
    ],
  },
  {
    id: "search-sort",
    title: "Searching and sorting",
    patterns: [
      { id: "bs-index", name: "Binary search on index", recognize: "Sorted or rotated sorted data", problems: L(33, 162, 4) },
      { id: "bs-answer", name: "Binary search on answer", recognize: '"Minimize the maximum" or "maximize the minimum", monotonic feasibility', problems: [...L(875, 1011, 410), ...C("aggressive-cows")] },
      { id: "quickselect", name: "Quickselect / partition", recognize: "k-th element in O(n)", problems: L(215, 75) },
      { id: "custom-sort", name: "Custom sort + greedy", recognize: "Order by a derived key", problems: L(179, 406) },
      { id: "merge-sort-count", name: "Merge sort / counting inversions", recognize: "Count pairs with order condition", problems: L(315, 493) },
    ],
  },
  {
    id: "lists-stacks-heaps",
    title: "Linked lists, stacks, queues, heaps",
    patterns: [
      { id: "fast-slow", name: "Fast/slow pointers", recognize: "Cycle, midpoint, k-th from end", problems: L(142, 287, 143) },
      { id: "list-reversal", name: "In-place reversal", recognize: "Reverse sublist or groups", problems: L(92, 25) },
      { id: "monotonic-stack", name: "Monotonic stack", recognize: "Next greater/smaller, histogram, spans", problems: L(739, 84, 85, 907, 901) },
      { id: "monotonic-deque", name: "Monotonic deque", recognize: "Sliding window min/max", problems: L(239, 862) },
      { id: "stack-parsing", name: "Stack for parsing", recognize: "Brackets, expressions, decode", problems: L(20, 32, 224, 227, 772, 394) },
      { id: "heap-top-k", name: "Heap / top-k", recognize: "k-th largest, streaming, merge k sources", problems: L(23, 295, 621, 502) },
      { id: "two-heaps", name: "Two heaps", recognize: "Median, balancing two halves", problems: L(480, 295) },
      { id: "lru-lfu", name: "LRU / LFU design", recognize: "Cache with O(1) ops", problems: L(146, 460, 432) },
    ],
  },
  {
    id: "trees",
    title: "Trees",
    patterns: [
      { id: "tree-dfs", name: "DFS recursion (pre/in/post)", recognize: "Path, depth, validate, LCA", problems: L(98, 236, 543, 124) },
      { id: "tree-bfs", name: "BFS level order", recognize: "Levels, views, shortest in tree", problems: L(102, 199, 987) },
      { id: "tree-construct", name: "Construct / serialize", recognize: "Rebuild from traversals", problems: L(105, 297) },
      { id: "bst", name: "BST properties", recognize: "Ordered queries, iterators", problems: L(230, 173, 99) },
      { id: "tree-dp", name: "Tree DP / rerooting", recognize: "Subtree values combined bottom-up, answer for every root", problems: L(337, 834) },
      { id: "binary-lifting", name: "Binary lifting / LCA / Euler tour", recognize: "Many ancestor queries", problems: [...L(1483), ...C("subtree-range-queries")] },
      { id: "trie", name: "Trie", recognize: "Prefix search, word dictionaries, XOR max", problems: L(208, 212, 421, 211) },
    ],
  },
  {
    id: "graphs",
    title: "Graphs",
    patterns: [
      { id: "graph-bfs", name: "BFS / multi-source BFS", recognize: "Shortest path unweighted, spreading", problems: L(994, 127, 542, 934) },
      { id: "graph-dfs", name: "DFS / flood fill", recognize: "Components, islands, cycle detection", problems: L(200, 133, 417) },
      { id: "topo-sort", name: "Topological sort (Kahn + DFS)", recognize: "Dependencies, ordering", problems: L(207, 210, 269, 2050) },
      { id: "union-find", name: "Union-Find (DSU)", recognize: "Dynamic connectivity, grouping", problems: L(547, 721, 684, 305) },
      { id: "dijkstra", name: "Dijkstra", recognize: "Weighted shortest path, non-negative", problems: L(743, 787, 1631, 778) },
      { id: "bellman-ford", name: "Bellman-Ford / 0-1 BFS / SPFA", recognize: "Negative edges, binary weights", problems: L(787, 2290) },
      { id: "floyd-warshall", name: "Floyd-Warshall", recognize: "All pairs, small n", problems: L(1334) },
      { id: "mst", name: "MST (Kruskal, Prim)", recognize: "Connect all at minimum cost", problems: L(1584, 1168) },
      { id: "bipartite", name: "Bipartite check / graph coloring", recognize: "Two groups, conflicts", problems: L(785, 886) },
      { id: "tarjan", name: "Tarjan: bridges, articulation points, SCC", recognize: "Critical connections", problems: L(1192) },
      { id: "eulerian", name: "Eulerian path", recognize: "Use every edge once", problems: L(332) },
      { id: "state-space-bfs", name: "Implicit graph / state-space BFS", recognize: "Puzzle states, bitmask state", problems: L(752, 773, 847) },
    ],
  },
  {
    id: "backtracking-bits",
    title: "Recursion, backtracking, bit manipulation",
    patterns: [
      { id: "subsets", name: "Subsets / permutations / combinations", recognize: "Enumerate all, with duplicates handling", problems: L(78, 46, 90, 47, 40) },
      { id: "constraint-backtracking", name: "Constraint backtracking", recognize: "Board or placement with pruning", problems: L(22, 51, 37, 79, 131, 301) },
      { id: "meet-in-middle", name: "Meet in the middle", recognize: "n up to about 40", problems: L(1755, 2035) },
      { id: "bit-tricks", name: "Bit tricks", recognize: "XOR, masks, parity, single number", problems: L(136, 137, 260, 338, 421) },
      { id: "bitmask-dp-subsets", name: "Bitmask DP", recognize: "n up to about 20, subsets as state", problems: L(698, 847, 1434) },
    ],
  },
  {
    id: "dp",
    title: "Dynamic programming",
    patterns: [
      { id: "dp-1d", name: "1D linear", recognize: "Choice at each index", problems: L(70, 198, 91, 139, 45) },
      { id: "knapsack", name: "Knapsack (0/1, unbounded, bounded)", recognize: "Pick items under a budget", problems: L(322, 518, 416, 494, 474) },
      { id: "lis", name: "LIS family", recognize: "Increasing subsequence", problems: L(300, 354, 673) },
      { id: "grid-dp", name: "Grid DP", recognize: "Paths and costs on a grid", problems: L(62, 64, 221, 741, 329) },
      { id: "two-string-dp", name: "Two-string DP", recognize: "Alignment, matching", problems: L(72, 1143, 10, 44, 115) },
      { id: "interval-dp", name: "Interval DP", recognize: "Split a range, merge cost", problems: L(312, 132, 1000) },
      { id: "state-machine-dp", name: "State machine DP", recognize: "Buy/sell, cooldowns, k transactions", problems: L(121, 122, 123, 188, 309) },
      { id: "digit-dp", name: "Digit DP", recognize: "Count numbers in [L, R] with a property", problems: L(902, 357) },
      { id: "tree-dp-2", name: "Tree DP", recognize: "Combine children results", problems: L(968, 337) },
      { id: "bitmask-dp-assign", name: "DP with bitmask", recognize: "Assignment, TSP style", problems: [...C("tsp"), ...L(1986)] },
      { id: "dp-optimizations", name: "DP optimizations", recognize: "Large n (rare in interviews)", problems: C("dp-optimizations") },
    ],
  },
  {
    id: "greedy-math",
    title: "Greedy and math",
    patterns: [
      { id: "greedy-proof", name: "Greedy with proof", recognize: "Local choice is globally safe", problems: L(55, 134, 135, 763, 621) },
      { id: "exchange-argument", name: "Exchange argument", recognize: "Ordering decisions", problems: L(452, 767) },
      { id: "number-theory", name: "Number theory", recognize: "gcd, sieve, modular arithmetic, fast power", problems: [...L(204, 50, 372), ...C("modular-inverse", "ncr-mod-p")] },
      { id: "combinatorics", name: "Combinatorics, probability", recognize: "Counting, expected value", problems: L(62, 528, 382) },
      { id: "geometry", name: "Geometry basics", recognize: "Points, lines, overlap", problems: L(149, 223) },
    ],
  },
  {
    id: "advanced",
    title: "Advanced structures (SWE3 hard rounds)",
    patterns: [
      { id: "segment-tree", name: "Segment tree / Fenwick (BIT)", recognize: "Range queries with point updates", problems: L(307, 327, 699) },
      { id: "sparse-table", name: "Sparse table, sqrt decomposition", recognize: "Static range min/max in O(1)", problems: C("sparse-table", "sqrt-decomposition") },
      { id: "ordered-set", name: "Ordered set / multiset (TreeMap)", recognize: "Floor/ceiling queries, bookings", problems: L(729, 731, 732, 220) },
      { id: "randomized", name: "Randomized and probabilistic", recognize: "Sampling, probabilistic membership", problems: [...L(382), ...C("bloom-filter", "consistent-hashing")] },
      { id: "design-ds", name: "Design problems", recognize: "Data-structure design questions", problems: L(355, 362, 981, 1146, 380) },
    ],
  },
  {
    id: "cses",
    title: "CSES Problem Set",
    patterns: [
      {
        id: "cses-intro",
        name: "CSES: introductory problems",
        recognize: "Short warm-up tasks from cses.fi; the same Run, hints and solutions as the roadmap problems",
        problems: C2(
          "weird-algorithm",
          "missing-number",
          "repetitions",
          "increasing-array",
          "permutations",
          "number-spiral",
          "two-knights",
          "two-sets",
          "bit-strings",
          "trailing-zeros",
          "coin-piles"
        ),
      },
    ],
  },
];

export const ALL_PATTERNS: Pattern[] = DSA_GROUPS.flatMap((g) => g.patterns);

/** Problems needed to call a pattern "covered" (roadmap: 4+ problems each, or all if fewer). */
export function patternTarget(p: Pattern): number {
  return Math.min(4, p.problems.length);
}

export const SOLVE_XP: Record<Difficulty | "other", number> = { easy: 5, medium: 15, hard: 30, other: 10 };
export const RESOLVE_XP = 10;
export const RESOLVE_AFTER_DAYS = 14;

export function solveXp(problem: Pick<Problem, "difficulty">): number {
  return SOLVE_XP[problem.difficulty ?? "other"];
}

export type SolveState =
  | { state: "unsolved" }
  | { state: "solved"; solvedOn: string; resolveOn: string; resolveDue: boolean }
  | { state: "resolved"; solvedOn: string; resolvedOn: string };

/** Where a problem stands given its first solve and latest re-solve dates. */
export function solveState(firstSolvedOn: string | undefined, resolvedOn: string | undefined, today: string): SolveState {
  if (!firstSolvedOn) return { state: "unsolved" };
  if (resolvedOn) return { state: "resolved", solvedOn: firstSolvedOn, resolvedOn };
  const resolveOn = addDays(firstSolvedOn, RESOLVE_AFTER_DAYS);
  return { state: "solved", solvedOn: firstSolvedOn, resolveOn, resolveDue: daysBetween(resolveOn, today) >= 0 };
}
