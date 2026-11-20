// Pattern thinking map (plan 0091): signal -> pattern -> variation, plus "how to read a problem" teaching content.
// Pure data and logic, no I/O. Contract types are fixed by the plan.
// All text is written for this app in our own words. Problem statements are paraphrased, never copied.
// Templates are Python, spaces only. Variation examples are app problem ids (see dsa.ts) or "slug:<leetcode-slug>".

export type FeatureKey = "input" | "ask" | "shape" | "sorted" | "size" | "weights" | "updates" | "overlap";
export type Features = Partial<Record<FeatureKey, string[]>>;

export interface ThinkVariation {
  id: string;
  label: string;
  when: string;
  key: string;
  examples?: string[];
  features?: Features;
}

export interface ThinkPattern {
  id: string;
  label: string;
  when: string;
  key: string;
  watch: string[];
  template?: { lang: "python"; code: string; complexity: string };
  variations: ThinkVariation[];
  features: Features;
  tags: string[];
  appPattern?: string;
  covers?: string[];
}

export interface ThinkSignal {
  id: string;
  label: string;
  when: string;
  patterns: string[];
}

export interface ConstraintHint {
  n: string;
  budget: string;
  fits: string;
}

/** Step 1 of every problem: read the biggest input size, turn it into a number of operations you can afford. */
export const CONSTRAINT_HINTS: ConstraintHint[] = [
  { n: "n <= 12", budget: "O(n!) is fine", fits: "Try every order: permutations, full backtracking, brute force with little pruning." },
  { n: "n <= 20", budget: "O(2^n) to O(2^n * n)", fits: "Every subset: bitmask DP, include/exclude recursion, subset enumeration." },
  { n: "n <= 40", budget: "O(2^(n/2))", fits: "Meet in the middle: split in two halves, enumerate each, join with sort or hash." },
  { n: "n <= 100", budget: "O(n^4)", fits: "Floyd-Warshall, a small DP with an extra dimension, four nested loops." },
  { n: "n <= 500", budget: "O(n^3)", fits: "Interval DP, Floyd-Warshall, matrix chain, all triples." },
  { n: "n <= 5,000", budget: "O(n^2)", fits: "Two nested loops, 2D DP over two sequences, all pairs." },
  { n: "n <= 10^5", budget: "O(n log n)", fits: "Sort, heap, binary search, segment tree, union-find, Dijkstra, sliding window." },
  { n: "n <= 10^6", budget: "O(n) or O(n log n)", fits: "One pass with a hash map, stack or pointers; sieve; keep the constant small." },
  { n: "n <= 10^7", budget: "O(n)", fits: "A single tight scan or a sieve; no per-item sorting, no heavy objects." },
  { n: "n up to 10^9 or 10^18", budget: "O(log n) or O(sqrt n)", fits: "Binary search on the value, a formula, fast power, digit DP, number theory." },
  { n: "Grid up to 1000 x 1000", budget: "O(rows * cols)", fits: "BFS or DFS over cells, grid DP; avoid an extra log or a copy per cell." },
  { n: "Small alphabet (26) or small value range", budget: "O(n * 26) or counting", fits: "A count array instead of a hash map, counting sort, DP over letters or values." },
];

/** Official LeetCode topic tags. Every one must be reachable from a pattern's `tags` (tested). */
export const LEETCODE_TAGS: string[] = [
  "Array", "String", "Hash Table", "Dynamic Programming", "Math", "Sorting", "Greedy", "Depth-First Search",
  "Binary Search", "Database", "Matrix", "Tree", "Breadth-First Search", "Bit Manipulation", "Two Pointers",
  "Prefix Sum", "Heap (Priority Queue)", "Simulation", "Binary Tree", "Graph", "Stack", "Counting",
  "Sliding Window", "Design", "Enumeration", "Backtracking", "Union Find", "Linked List", "Number Theory",
  "Ordered Set", "Monotonic Stack", "Segment Tree", "Trie", "Combinatorics", "Bitmask", "Divide and Conquer",
  "Queue", "Recursion", "Geometry", "Binary Indexed Tree", "Memoization", "Hash Function", "Binary Search Tree",
  "Shortest Path", "String Matching", "Topological Sort", "Rolling Hash", "Game Theory", "Interactive",
  "Data Stream", "Monotonic Queue", "Brainteaser", "Doubly-Linked List", "Randomized", "Merge Sort",
  "Counting Sort", "Iterator", "Concurrency", "Probability and Statistics", "Quickselect", "Suffix Array",
  "Line Sweep", "Minimum Spanning Tree", "Bucket Sort", "Shell", "Reservoir Sampling",
  "Strongly Connected Component", "Eulerian Circuit", "Radix Sort", "Rejection Sampling",
  "Biconnected Component",
];

// ---------------------------------------------------------------------------------------------------------------
// Patterns, part 1: arrays, strings, hashing
// ---------------------------------------------------------------------------------------------------------------

const ARRAY_PATTERNS: ThinkPattern[] = [
  {
    id: "hash-map",
    label: "Hash map / counting",
    when: "You need to know whether you have seen something, how often, or which group it belongs to, and a nested loop would be too slow.",
    key: "Trade memory for time: walk the data once, and ask the map for the partner, the count or the group before (or while) you store the current item.",
    watch: [
      "Look up the partner before inserting yourself, or an element can pair with itself (equal values in Two Sum).",
      "Pick a canonical key for groups: a sorted word or a 26-count tuple for anagrams, a tuple for coordinates.",
      "Values small and bounded (letters, 1..n)? A count array is faster and simpler than a map.",
      "If the map keys are the answer you want in sorted order, a plain hash map will not give it to you.",
    ],
    template: {
      lang: "python",
      code: `def two_sum(nums, target):
    seen = {}                      # value -> index where we saw it
    for i, x in enumerate(nums):
        if target - x in seen:     # ask for the partner first
            return [seen[target - x], i]
        seen[x] = i
    return []`,
      complexity: "O(n) time, O(n) space",
    },
    variations: [
      { id: "complement", label: "Complement lookup", when: "Two items must add up to, or differ by, a target; pairs with a property.", key: "Compute what the partner would have to be and look it up while scanning.", examples: ["lc-1"], features: { shape: ["pairs"] } },
      { id: "group-key", label: "Group by a canonical key", when: "Group anagrams, strings with the same shape, points on one line.", key: "Turn every item into a key that is equal for all members of a group, then bucket by it.", examples: ["lc-49", "lc-149"] },
      { id: "frequency", label: "Count frequencies", when: "Top k frequent, majority, is it an anagram, can letters build a word.", key: "One pass to count, then read the counts (sort them, heap them, or bucket by count).", examples: ["lc-347"] },
      { id: "set-sequence", label: "Set of values, start at the beginning", when: "Longest run of consecutive numbers in unsorted data.", key: "Put all values in a set; only start counting at x when x - 1 is missing, so each run is walked once.", examples: ["lc-128"] },
      { id: "first-seen", label: "Remember the first position", when: "Longest span between two equal states (equal prefix, equal balance).", key: "Store the earliest index of each state; a later equal state gives the longest span.", examples: ["slug:contiguous-array", "lc-560"] },
    ],
    features: { input: ["array", "string"], ask: ["exists", "count-ways", "query"], size: ["large", "huge"], sorted: ["no"] },
    tags: ["Hash Table", "Counting", "Array", "String", "Hash Function"],
    appPattern: "hash-map",
  },
  {
    id: "prefix-sums",
    label: "Prefix sums / difference array",
    when: "Many range-sum questions on a fixed array, a subarray sum equal to a target with negatives allowed, or many range updates applied before one read.",
    key: "pre[j] - pre[i] is the sum of the items between i and j, so any range sum is one subtraction. Run the idea in reverse (a difference array) to make a range update cost two writes.",
    watch: [
      "Seed the counter map with {0: 1}, or a prefix that equals the target on its own is missed.",
      "The prefix array has n + 1 entries; most off-by-one bugs are here.",
      "Sums can pass 32 bits when n and values are large; use 64-bit in C++ and Java.",
      "With negative numbers a sliding window fails; prefix sums plus a map still work.",
    ],
    template: {
      lang: "python",
      code: `from collections import defaultdict

def count_subarrays_with_sum(nums, k):
    seen = defaultdict(int)
    seen[0] = 1                    # the empty prefix
    pre = ans = 0
    for x in nums:
        pre += x
        ans += seen[pre - k]       # earlier prefixes that leave exactly k
        seen[pre] += 1
    return ans`,
      complexity: "O(n) time, O(n) space",
    },
    variations: [
      { id: "range-query", label: "Static range sum", when: "Many queries sum(i..j) on data that does not change.", key: "Build pre once; each query is pre[j + 1] - pre[i].", examples: ["lc-303", "lc-238"] },
      { id: "sum-equals-k", label: "Subarray sum equals k", when: "Count or find subarrays with a given sum, negatives allowed.", key: "Count earlier prefixes equal to current - k with a hash map.", examples: ["lc-560"] },
      { id: "difference-array", label: "Difference array", when: "Many 'add v to every item from l to r' updates, one read at the end.", key: "Add v at l and subtract v at r + 1, then take a running sum.", examples: ["lc-1094", "lc-1109"] },
      { id: "prefix-2d", label: "2D prefix sums", when: "Many rectangle sums in a matrix.", key: "P[r][c] = cell + up + left - up-left; a rectangle is four lookups.", examples: ["slug:range-sum-query-2d-immutable"] },
      { id: "prefix-modulo", label: "Prefix sums with modulo", when: "Subarray sum divisible by k.", key: "Two prefixes with the same remainder mod k bound a subarray whose sum is divisible by k.", examples: ["slug:subarray-sums-divisible-by-k"] },
    ],
    features: { input: ["array", "matrix"], ask: ["query", "count-ways", "exists"], shape: ["contiguous", "ranges"], updates: ["static"] },
    tags: ["Prefix Sum", "Array", "Counting"],
    appPattern: "prefix-sums",
  },
  {
    id: "two-pointers",
    label: "Two pointers",
    when: "Sorted data (or data you may sort) and a pair or triple with a target; or an in-place edit of an array or string.",
    key: "Two indices walk toward each other or in the same direction, and every step throws away options that cannot be the answer, so the scan is linear.",
    watch: [
      "Sorting loses the original indices; keep them if the answer needs indices.",
      "Skip equal neighbours when you must not report duplicates (3Sum).",
      "Opposite ends: be able to say why moving that pointer cannot lose the answer.",
      "Same direction: the slow pointer marks the finished part, the fast pointer reads ahead.",
    ],
    template: {
      lang: "python",
      code: `def two_sum_sorted(a, target):
    l, r = 0, len(a) - 1
    while l < r:
        s = a[l] + a[r]
        if s == target:
            return l, r
        if s < target:
            l += 1                 # need a bigger sum: only moving l helps
        else:
            r -= 1                 # need a smaller sum: only moving r helps
    return None`,
      complexity: "O(n) time after sorting, O(1) space",
    },
    variations: [
      { id: "opposite-ends", label: "Opposite ends", when: "Pair sum in sorted data, container with most water, palindrome check.", key: "Start at both ends and move the side that can only make the answer better.", examples: ["lc-11", "lc-42"] },
      { id: "read-write", label: "Read and write pointer", when: "Remove duplicates, move zeroes, filter in place.", key: "The fast pointer reads every item; the slow pointer writes only the items you keep.", examples: ["lc-26"] },
      { id: "k-sum", label: "3Sum and 4Sum", when: "Triples or quadruples that add to a target.", key: "Sort, fix one (or two) items, and two-pointer the rest; skip equal values.", examples: ["lc-15"] },
      { id: "merge-two-sorted", label: "Walk two sorted inputs", when: "Merge, intersect or compare two sorted arrays.", key: "One pointer per input; advance the one with the smaller item.", examples: ["slug:merge-sorted-array", "slug:intersection-of-two-arrays-ii"] },
      { id: "partition", label: "Partition by a rule", when: "Sort colours, put evens first, split around a pivot.", key: "Keep regions for 'done low', 'unknown' and 'done high' and move the boundaries.", examples: ["lc-75"] },
    ],
    features: { input: ["array", "string"], shape: ["pairs", "contiguous"], sorted: ["yes", "can-sort"], size: ["large"] },
    tags: ["Two Pointers", "Array", "String"],
    appPattern: "two-pointers",
  },
  {
    id: "sliding-window",
    label: "Sliding window",
    when: "The longest, shortest or counted contiguous part (subarray or substring) that satisfies a rule you can update as the window moves.",
    key: "Two indices only move forward, so each item enters and leaves the window once: O(n). Grow the right edge, and shrink the left edge while the window breaks the rule.",
    watch: [
      "Negative numbers break shrinking logic for sums: use prefix sums with a map instead.",
      "Decide what the window tracks: a count map, a sum, the number of distinct items, the number of matched letters.",
      "Update the best answer at the right moment: after shrinking for 'longest valid', while shrinking for 'shortest valid'.",
      "Fixed size k is the easy case: add the new item, remove the one that falls off, read the answer.",
    ],
    template: {
      lang: "python",
      code: `from collections import defaultdict

def longest_with_at_most_k_distinct(s, k):
    cnt = defaultdict(int)
    l = best = 0
    for r, ch in enumerate(s):
        cnt[ch] += 1               # grow the right edge
        while len(cnt) > k:        # rule broken: shrink the left edge
            cnt[s[l]] -= 1
            if cnt[s[l]] == 0:
                del cnt[s[l]]
            l += 1
        best = max(best, r - l + 1)
    return best`,
      complexity: "O(n) time, O(k) space",
    },
    variations: [
      { id: "fixed-size", label: "Fixed size k", when: "The window length is given (average of k items, any anagram of a word).", key: "Add the new right item, drop the left one that falls off, then read the answer.", examples: ["slug:maximum-average-subarray-i", "slug:permutation-in-string"] },
      { id: "longest-valid", label: "Longest valid window", when: "At most k distinct, no repeating characters, at most k zeroes flipped.", key: "Expand right; while the window is invalid, shrink left; record r - l + 1.", examples: ["lc-3", "lc-904"] },
      { id: "shortest-valid", label: "Shortest valid window", when: "Smallest window containing all letters, smallest subarray with sum at least a target.", key: "Expand until valid, then shrink as far as it stays valid, recording the length every time.", examples: ["lc-76", "slug:minimum-size-subarray-sum"] },
      { id: "exactly-k", label: "Count windows with exactly K", when: "Subarrays with exactly K distinct values or K odd numbers.", key: "exactly(K) = atMost(K) - atMost(K - 1); atMost is a normal 'count valid windows' sweep.", examples: ["slug:subarrays-with-k-different-integers"] },
      { id: "window-extreme", label: "Window maximum or minimum", when: "Max or min of every window of size k.", key: "A plain window cannot find the max quickly; use a monotonic deque to keep the best index at the front.", examples: ["lc-239"] },
    ],
    features: { input: ["array", "string"], ask: ["optimal-value", "count-ways"], shape: ["contiguous"], size: ["large", "huge"], weights: ["non-negative", "none"] },
    tags: ["Sliding Window", "String", "Array", "Two Pointers"],
    appPattern: "sliding-window",
  },
  {
    id: "kadane",
    label: "Kadane / subarray DP",
    when: "Maximum (or minimum) sum or product over a contiguous part, with negative numbers allowed.",
    key: "The best subarray ending at i either starts fresh at i or extends the best one ending at i - 1: cur = max(x, cur + x).",
    watch: [
      "All numbers negative: start best at the first element, not at 0.",
      "Product needs both the max and the min ending here, because a negative number flips them.",
      "Circular: the answer is max(normal Kadane, total - minimum subarray), unless every number is negative.",
      "If they also ask for the positions, record where the running sum last reset.",
    ],
    template: {
      lang: "python",
      code: `def max_subarray(a):
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)      # start fresh, or extend
        best = max(best, cur)
    return best`,
      complexity: "O(n) time, O(1) space",
    },
    variations: [
      { id: "max-sum", label: "Maximum sum", when: "Largest sum of a contiguous part.", key: "cur = max(x, cur + x); keep the best seen.", examples: ["lc-53"] },
      { id: "max-product", label: "Maximum product", when: "Signs can flip the answer.", key: "Track the max and the min ending here; swap them when x is negative.", examples: ["lc-152"] },
      { id: "circular", label: "Circular array", when: "The subarray may wrap around the end.", key: "max(normal best, total - minimum subarray); handle the all-negative case separately.", examples: ["lc-918"] },
    ],
    features: { input: ["array"], ask: ["optimal-value"], shape: ["contiguous"], overlap: ["yes"] },
    tags: ["Array", "Dynamic Programming"],
    appPattern: "kadane",
  },
  {
    id: "intervals",
    label: "Intervals",
    when: "Items with a start and an end: merge, insert, find overlaps, free time, schedule the most, count rooms.",
    key: "Sort first: by start to merge and to scan overlaps, by end to pick the most non-overlapping ones. After sorting, one pass decides everything.",
    watch: [
      "Decide whether touching intervals (end == start) overlap; the statement tells you.",
      "Sorting is O(n log n); say it in the complexity.",
      "Merging: take the max of the two ends, not just the later end.",
      "For 'how many at once' do not merge: sweep events or use a heap of end times.",
    ],
    template: {
      lang: "python",
      code: `def merge(intervals):
    out = []
    for s, e in sorted(intervals):
        if out and s <= out[-1][1]:            # overlaps the last merged one
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out`,
      complexity: "O(n log n) time, O(n) space",
    },
    variations: [
      { id: "merge", label: "Merge overlapping", when: "Combine overlapping ranges into disjoint ones.", key: "Sort by start; extend the last range while the next one starts before it ends.", examples: ["lc-56", "lc-57"] },
      { id: "max-non-overlapping", label: "Most non-overlapping / fewest removed", when: "Keep as many as possible without overlap, or remove the fewest.", key: "Greedy: sort by end and keep an interval whenever it starts after the last kept end.", examples: ["lc-435", "lc-452"] },
      { id: "rooms-needed", label: "Maximum overlap (rooms needed)", when: "How many meetings run at once, how many rooms.", key: "A min-heap of end times, or sort start and end events and sweep with +1 and -1.", examples: ["lc-253", "lc-1094"] },
      { id: "free-time", label: "Gaps between intervals", when: "Common free time, uncovered stretches.", key: "Merge everything first, then the gaps between merged ranges are the answer.", examples: ["lc-759"] },
    ],
    features: { input: ["intervals"], ask: ["optimal-value", "transform", "count-ways"], shape: ["ranges"], sorted: ["can-sort"] },
    tags: ["Array", "Sorting", "Greedy", "Line Sweep"],
    appPattern: "intervals",
  },
  {
    id: "cyclic-sort",
    label: "Cyclic sort / index as hash",
    when: "The array holds values in 1..n (or 0..n), and you must find the missing, duplicate or misplaced numbers in O(n) time and O(1) extra space.",
    key: "Value v belongs at index v - 1. Swap each item to its home until all that can be home are; whatever sits in the wrong place afterwards is the answer.",
    watch: [
      "Use while, not if, when swapping: one position may need several swaps.",
      "Stop swapping when the target slot already holds the same value, or duplicates loop forever.",
      "Ignore values outside 1..n (zero, negatives, too large).",
      "If you may not change the input, mark with negation instead and restore, or use Floyd's cycle idea (see Fast/slow pointers).",
    ],
    template: {
      lang: "python",
      code: `def first_missing_positive(a):
    n = len(a)
    for i in range(n):
        while 1 <= a[i] <= n and a[a[i] - 1] != a[i]:
            j = a[i] - 1
            a[i], a[j] = a[j], a[i]        # send a[i] to its home slot
    for i in range(n):
        if a[i] != i + 1:
            return i + 1
    return n + 1`,
      complexity: "O(n) time, O(1) space",
    },
    variations: [
      { id: "first-missing", label: "Smallest missing positive", when: "Find the first positive integer that is not in the array.", key: "Place each value at its home, then scan for the first slot with the wrong value.", examples: ["lc-41"] },
      { id: "find-duplicates", label: "Find all duplicates", when: "Values in 1..n, some appear twice.", key: "After placing, an item sitting away from home is a duplicate; or negate a[v - 1] as a seen mark.", examples: ["lc-442"] },
    ],
    features: { input: ["array"], ask: ["exists", "kth"], shape: ["none"], size: ["large"] },
    tags: ["Array"],
    appPattern: "cyclic-sort",
  },
  {
    id: "string-matching",
    label: "String matching",
    when: "Find a pattern in a text, find repeats or borders, or compare a string with its own prefixes and suffixes.",
    key: "Do not restart the comparison from scratch after a mismatch. Reuse what you already matched: the prefix function (KMP) or the Z-function tells how much of the pattern still matches.",
    watch: [
      "Naive search is O(n * m); say why it is fine (tiny inputs) or replace it.",
      "Prefix function pi[i] = length of the longest proper prefix that is also a suffix of s[0..i].",
      "Use a separator that cannot appear in the strings (pat + '#' + text) when you search through one combined string.",
      "Hashing is simpler but can collide; verify a hash match or use a large modulus.",
    ],
    template: {
      lang: "python",
      code: `def prefix_function(s):
    pi = [0] * len(s)
    for i in range(1, len(s)):
        k = pi[i - 1]
        while k and s[i] != s[k]:
            k = pi[k - 1]              # fall back to a shorter border
        if s[i] == s[k]:
            k += 1
        pi[i] = k
    return pi

def find_all(text, pat):
    s = pat + "#" + text
    pi, m = prefix_function(s), len(pat)
    return [i - 2 * m for i in range(len(s)) if pi[i] == m]   # start indices in text`,
      complexity: "O(n + m) time, O(n + m) space",
    },
    variations: [
      { id: "kmp", label: "KMP / prefix function", when: "Find a pattern, find the longest border, detect a repeated block.", key: "Build the prefix function; a border of length k lets you resume matching at k.", examples: ["lc-28", "lc-1392"] },
      { id: "z-function", label: "Z-function", when: "For every position, how long is the match with the string's prefix.", key: "z[i] = length of the longest common prefix of s and s[i:]; reuse the rightmost match window.", examples: ["c-z-function"] },
      { id: "repeat-check", label: "Repeated string checks", when: "Is the string a repetition of a smaller block; how many repeats of a contain b.", key: "Compare with the doubled string, or use the border: block length = n - pi[n - 1].", examples: ["lc-686", "slug:repeated-substring-pattern"] },
    ],
    features: { input: ["string"], ask: ["exists", "query", "count-ways"], shape: ["contiguous"], size: ["large", "huge"] },
    tags: ["String Matching", "String"],
    appPattern: "string-matching",
  },
  {
    id: "matrix",
    label: "Matrix traversal",
    when: "A 2D array and you must walk it in a fixed shape (spiral, diagonal), rotate or transpose it, or change it in place.",
    key: "Treat it as bookkeeping: keep four boundaries, or a direction vector that turns at walls, or a spare marker that avoids a copy.",
    watch: [
      "Check boundaries after every shrink (top <= bottom, left <= right) so a single row or column is not read twice.",
      "In-place rotate = transpose, then reverse each row.",
      "In-place marking: use the first row and column as flags, and remember whether they themselves had a zero.",
      "Rows and columns are not always the same length; do not assume a square.",
    ],
    template: {
      lang: "python",
      code: `def spiral(m):
    out = []
    top, bottom, left, right = 0, len(m) - 1, 0, len(m[0]) - 1
    while top <= bottom and left <= right:
        out += m[top][left:right + 1]
        top += 1
        for r in range(top, bottom + 1):
            out.append(m[r][right])
        right -= 1
        if top <= bottom:
            out += m[bottom][left:right + 1][::-1]
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                out.append(m[r][left])
            left += 1
    return out`,
      complexity: "O(rows * cols) time, O(1) extra space",
    },
    variations: [
      { id: "spiral", label: "Spiral and layer walks", when: "Read or fill a matrix in spiral or ring order.", key: "Four shrinking boundaries; peel one layer per loop.", examples: ["lc-54"] },
      { id: "rotate", label: "Rotate or transpose in place", when: "Rotate an image by 90 degrees without a second matrix.", key: "Transpose, then reverse each row (or the reverse order for the other direction).", examples: ["lc-48"] },
      { id: "in-place-flags", label: "In-place marking", when: "If a cell is zero, clear its row and column, with O(1) extra space.", key: "Use the first row and column as flag storage.", examples: ["lc-73"] },
    ],
    features: { input: ["matrix", "grid"], ask: ["transform", "simulate"], shape: ["none"], size: ["small"] },
    tags: ["Matrix", "Array", "Simulation"],
    appPattern: "matrix",
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Patterns, part 2: searching and sorting; linked lists, stacks, queues, heaps
// ---------------------------------------------------------------------------------------------------------------

const SEARCH_LIST_PATTERNS: ThinkPattern[] = [
  {
    id: "bs-index",
    label: "Binary search on index",
    when: "Sorted or rotated-sorted data and you want a position, a boundary, a peak, or the first item that satisfies a check.",
    key: "Keep an invariant about lo and hi, look at the middle, and throw away half of the range every step: O(log n).",
    watch: [
      "Pick one loop style (lo < hi with hi = mid, or lo <= hi) and keep it; mixing them causes infinite loops.",
      "In C++ and Java use mid = lo + (hi - lo) / 2 to avoid overflow.",
      "Duplicates: decide whether you want the first or the last match (lower bound or upper bound).",
      "A rotated array always has one sorted half; test whether the target is inside it.",
    ],
    template: {
      lang: "python",
      code: `def lower_bound(a, x):
    # first index i with a[i] >= x (len(a) if none)
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] >= x:
            hi = mid               # mid might be the answer
        else:
            lo = mid + 1           # mid is too small
    return lo`,
      complexity: "O(log n) time, O(1) space",
    },
    variations: [
      { id: "first-true", label: "First position where a check is true", when: "Lower bound, first bad version, insert position.", key: "if check(mid): hi = mid else lo = mid + 1.", examples: ["lc-162", "slug:first-bad-version"] },
      { id: "rotated", label: "Rotated sorted array", when: "Search a value or find the minimum in a rotated array.", key: "One half is always sorted; decide if the target lies in the sorted half and keep that half.", examples: ["lc-33"] },
      { id: "peak", label: "Peak or local maximum", when: "Find any peak where neighbours are smaller.", key: "Compare a[mid] with a[mid + 1]; the slope tells you which side must contain a peak.", examples: ["lc-162"] },
      { id: "two-arrays", label: "Partition two sorted arrays", when: "Median or k-th of two sorted arrays in logarithmic time.", key: "Binary search the cut in the smaller array so the left parts hold exactly half the items.", examples: ["lc-4"] },
    ],
    features: { input: ["array"], ask: ["exists", "kth", "query"], sorted: ["yes"], size: ["large", "huge"] },
    tags: ["Binary Search", "Array"],
    appPattern: "bs-index",
  },
  {
    id: "bs-answer",
    label: "Binary search on answer",
    when: "You are asked to minimise the maximum or maximise the minimum, or find the smallest x that makes something possible, and checking one x is easy.",
    key: "If x works then every larger x works too (or the reverse). A feasibility check plus that one-way flip lets you binary search the answer itself.",
    watch: [
      "Get the range right: low and high must contain the answer (max item to the sum, 1 to the largest pile...).",
      "Write feasible(x) as one simple greedy pass; if the check is hard, this pattern is not the right one.",
      "Smallest feasible x: shrink hi when feasible. Largest feasible x: use mid = (lo + hi + 1) // 2 so the loop ends.",
      "Real-valued answers: loop a fixed number of times (about 60) instead of while lo < hi.",
    ],
    template: {
      lang: "python",
      code: `def smallest_feasible(lo, hi, feasible):
    # feasible is False ... False True ... True on [lo, hi]
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo`,
      complexity: "O(cost of feasible * log(range))",
    },
    variations: [
      { id: "min-capacity", label: "Smallest capacity or speed", when: "Ship packages in D days, eat all bananas in H hours, split into k parts.", key: "feasible(x) counts days, hours or parts needed at capacity x with one greedy pass.", examples: ["lc-875", "lc-1011", "lc-410"] },
      { id: "max-min-distance", label: "Largest minimum distance", when: "Place k items as far apart as possible.", key: "feasible(d) places items greedily at gaps of at least d and checks that k fit.", examples: ["c-aggressive-cows"] },
      { id: "kth-by-value", label: "K-th by counting", when: "K-th smallest in a sorted matrix or multiplication table.", key: "Binary search the value; count how many items are <= it with a staircase walk.", examples: ["slug:kth-smallest-element-in-a-sorted-matrix"] },
      { id: "real-valued", label: "Real-valued answer", when: "Answers like a maximum average or a minimum time with decimals.", key: "Binary search on a floating value for a fixed number of rounds.", examples: ["slug:maximum-average-subarray-ii"] },
    ],
    features: { input: ["array", "numbers"], ask: ["optimal-value"], size: ["large", "huge"], sorted: ["no", "can-sort"] },
    tags: ["Binary Search", "Array", "Greedy"],
    appPattern: "bs-answer",
  },
  {
    id: "quickselect",
    label: "Quickselect / partition",
    when: "You need the k-th smallest or largest item, or the median, once, and you do not need the rest in order.",
    key: "Partition around a random pivot like quicksort, but recurse into only the side that contains position k. Expected O(n).",
    watch: [
      "Worst case is O(n^2); a random pivot makes it very unlikely. Say it.",
      "Many equal values: use a three-way partition (less, equal, greater) or the loop never shrinks.",
      "If k varies per query, or data streams in, a heap is the better fit.",
      "Partitioning in three groups is also the Dutch national flag idea (sort colours).",
    ],
    template: {
      lang: "python",
      code: `import random

def kth_smallest(a, k):            # k is 0-based
    p = random.choice(a)
    lo = [x for x in a if x < p]
    eq = [x for x in a if x == p]
    if k < len(lo):
        return kth_smallest(lo, k)
    if k < len(lo) + len(eq):
        return p
    hi = [x for x in a if x > p]
    return kth_smallest(hi, k - len(lo) - len(eq))`,
      complexity: "O(n) expected, O(n) space as written",
    },
    variations: [
      { id: "kth-largest", label: "K-th largest", when: "Return the element at sorted position n - k.", key: "Ask for position n - k from a smallest-first select.", examples: ["lc-215"] },
      { id: "three-way", label: "Three-way partition", when: "Sort values from a tiny set, group equal items.", key: "Keep low, middle and high zones; swap items into place in one pass.", examples: ["lc-75"] },
    ],
    features: { input: ["array"], ask: ["kth"], size: ["large"], updates: ["static"] },
    tags: ["Quickselect", "Array"],
    appPattern: "quickselect",
  },
  {
    id: "custom-sort",
    label: "Custom sort + greedy",
    when: "The answer depends on the order of items, and the right order comes from a rule between two items (which one should go first).",
    key: "Write the comparison between two items, prove it is consistent, sort once, then a simple pass builds the answer.",
    watch: [
      "The comparator must be consistent (a total order); otherwise sorting gives garbage or errors.",
      "Compare by concatenation for strings (a + b versus b + a), by ratio or deadline for jobs.",
      "Sorting by one key and breaking ties by another is often the whole trick.",
      "State why the order is optimal: an exchange argument (see Exchange argument).",
    ],
    template: {
      lang: "python",
      code: `from functools import cmp_to_key

def largest_number(nums):
    def cmp(a, b):
        if a + b > b + a:
            return -1              # a first gives the bigger string
        if a + b < b + a:
            return 1
        return 0
    s = sorted(map(str, nums), key=cmp_to_key(cmp))
    out = "".join(s)
    return "0" if out[0] == "0" else out`,
      complexity: "O(n log n * L) time for strings of length L",
    },
    variations: [
      { id: "pairwise-order", label: "Pairwise comparator", when: "Arrange numbers or words to form the largest or smallest result.", key: "Decide which of two items goes first by comparing the two joined orders.", examples: ["lc-179"] },
      { id: "sort-then-insert", label: "Sort by one key, place by another", when: "Rebuild a queue from (height, people in front) pairs.", key: "Sort tallest first, then insert each person at the index equal to their count.", examples: ["lc-406"] },
    ],
    features: { input: ["array", "intervals"], ask: ["optimal-value", "order", "transform"], sorted: ["can-sort"] },
    tags: ["Sorting", "Greedy"],
    appPattern: "custom-sort",
  },
  {
    id: "merge-sort-count",
    label: "Merge sort / counting inversions",
    when: "Count pairs (i, j) with i < j and an order condition on the values (inversions, reverse pairs, smaller numbers to the right).",
    key: "While merging two sorted halves, the order relationship between every left item and every right item is known, so you can count pairs in bulk instead of one by one.",
    watch: [
      "Count before or while merging, depending on the condition; reverse pairs (a[i] > 2 * a[j]) need a separate pass before the merge.",
      "Use strict versus non-strict comparison carefully with equal values.",
      "A Fenwick tree over compressed values solves the same problems online.",
      "Counts can reach n^2 / 2; use a 64-bit counter.",
    ],
    template: {
      lang: "python",
      code: `def count_inversions(a):
    def sort(lo, hi):              # sorts a[lo:hi], returns inversions inside it
        if hi - lo < 2:
            return 0
        mid = (lo + hi) // 2
        cnt = sort(lo, mid) + sort(mid, hi)
        left, right = a[lo:mid], a[mid:hi]
        i = j = 0
        for k in range(lo, hi):
            if j == len(right) or (i < len(left) and left[i] <= right[j]):
                a[k] = left[i]
                i += 1
            else:
                a[k] = right[j]
                j += 1
                cnt += len(left) - i       # all remaining left items are larger
        return cnt
    return sort(0, len(a))`,
      complexity: "O(n log n) time, O(n) space (sorts the list in place)",
    },
    variations: [
      { id: "inversions", label: "Count inversions", when: "How many pairs are out of order.", key: "Every time a right item goes out before the remaining left items, add the number of left items left.", examples: ["lc-315"] },
      { id: "reverse-pairs", label: "Reverse pairs", when: "Pairs with a[i] > 2 * a[j].", key: "Count with two pointers across the two sorted halves, then merge normally.", examples: ["lc-493"] },
    ],
    features: { input: ["array"], ask: ["count-ways"], shape: ["pairs"], size: ["large"] },
    tags: ["Merge Sort", "Divide and Conquer", "Binary Indexed Tree", "Sorting"],
    appPattern: "merge-sort-count",
  },
  {
    id: "fast-slow",
    label: "Fast/slow pointers",
    when: "A linked list (or a sequence of next-steps) where you need a cycle, the middle, or the k-th item from the end without knowing the length.",
    key: "Two pointers moving at different speeds meet inside a cycle and keep a fixed gap; the meeting point and the gap carry the answer.",
    watch: [
      "Check fast and fast.next before moving, or you dereference None.",
      "Cycle start: after they meet, reset one pointer to the head and move both one step at a time.",
      "Array 'duplicate number' problems are the same idea: treat a[i] as the next pointer.",
      "Even length lists: decide which middle you want (first or second).",
    ],
    template: {
      lang: "python",
      code: `def cycle_start(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:                   # met inside the cycle
            slow = head
            while slow is not fast:
                slow, fast = slow.next, fast.next
            return slow                    # both reach the cycle start together
    return None`,
      complexity: "O(n) time, O(1) space",
    },
    variations: [
      { id: "cycle", label: "Detect a cycle and its start", when: "Does the list loop, where does it start.", key: "Fast moves two steps, slow one; they meet iff there is a cycle.", examples: ["lc-142"] },
      { id: "middle", label: "Find the middle", when: "Split a list in half, check a palindrome list.", key: "When fast reaches the end, slow is at the middle.", examples: ["slug:middle-of-the-linked-list", "slug:palindrome-linked-list"] },
      { id: "kth-from-end", label: "K-th from the end", when: "Remove the n-th node from the end in one pass.", key: "Advance one pointer k steps ahead, then move both until it ends.", examples: ["slug:remove-nth-node-from-end-of-list"] },
      { id: "array-as-list", label: "Array as a linked list", when: "n + 1 values in 1..n, one repeats, no extra space.", key: "Follow i -> a[i]; the repeated value is where the cycle begins.", examples: ["lc-287"] },
    ],
    features: { input: ["linked-list", "array"], ask: ["exists", "kth", "query"], size: ["large"] },
    tags: ["Linked List", "Two Pointers"],
    appPattern: "fast-slow",
  },
  {
    id: "list-reversal",
    label: "In-place reversal",
    when: "Reverse a whole list, a sublist, or every group of k nodes while keeping O(1) extra space.",
    key: "Walk once and flip each next pointer to the previous node; keep three names: previous, current, next. Wrap the part you reverse with a dummy head and a saved tail.",
    watch: [
      "Save current.next before you overwrite it.",
      "Use a dummy node before the head so reversing from position 1 needs no special case.",
      "Groups of k: check that k nodes remain before reversing; leave a short tail as it is.",
      "After reversing a segment, reconnect both ends (the node before it and the node after it).",
    ],
    template: {
      lang: "python",
      code: `def reverse(head):
    prev = None
    while head:
        nxt = head.next            # save before we overwrite
        head.next = prev
        prev, head = head, nxt
    return prev`,
      complexity: "O(n) time, O(1) space",
    },
    variations: [
      { id: "whole-list", label: "Reverse the whole list", when: "Plain reversal, or the building block for other problems.", key: "prev, cur, next walk.", examples: ["slug:reverse-linked-list"] },
      { id: "sublist", label: "Reverse positions m to n", when: "Reverse only part of the list.", key: "Walk to node m - 1, reverse n - m + 1 nodes, then reconnect both ends.", examples: ["lc-92"] },
      { id: "k-group", label: "Reverse in groups of k", when: "Reverse every k nodes, leave the remainder.", key: "Count k nodes ahead; reverse them; connect the group's tail to the next group's head.", examples: ["lc-25"] },
      { id: "reorder", label: "Split, reverse, interleave", when: "Reorder a list as first, last, second, second-last...", key: "Find the middle, reverse the second half, merge the two halves alternately.", examples: ["lc-143"] },
    ],
    features: { input: ["linked-list"], ask: ["transform"], size: ["large"] },
    tags: ["Linked List"],
    appPattern: "list-reversal",
  },
  {
    id: "monotonic-stack",
    label: "Monotonic stack",
    when: "For each item you need the nearest item to the left or right that is greater or smaller, or the width of the biggest span where an item is the extreme.",
    key: "Keep a stack whose values only go one way (decreasing or increasing). When a new item breaks that order, the items it pops have just found their answer: every item is pushed and popped once.",
    watch: [
      "Store indices, not values, when you need distances or widths.",
      "Decide the pop condition (strict or not) so equal values are counted exactly once.",
      "Histogram problems: add a sentinel bar of height 0 at the end to flush the stack.",
      "Circular arrays: loop i over 0 .. 2n - 1 and use i % n.",
    ],
    template: {
      lang: "python",
      code: `def next_greater(a):
    res = [-1] * len(a)
    st = []                        # indices; their values are decreasing
    for i, x in enumerate(a):
        while st and a[st[-1]] < x:
            res[st.pop()] = x      # x is the next greater for these
        st.append(i)
    return res`,
      complexity: "O(n) time, O(n) space",
    },
    variations: [
      { id: "next-greater", label: "Next greater or smaller", when: "How many days until warmer, next bigger value, stock span.", key: "Decreasing stack for next greater; pop while the top is smaller than the current item.", examples: ["lc-739", "lc-901"] },
      { id: "histogram", label: "Largest rectangle in a histogram", when: "The biggest rectangle under bars; maximal rectangle of ones in a matrix.", key: "Increasing stack; when a bar pops, its width runs from the new top to the current index.", examples: ["lc-84", "lc-85"] },
      { id: "contribution", label: "Contribution of each item", when: "Sum of the minimum (or maximum) over all subarrays.", key: "For each item find how far it stays the minimum on the left and the right; multiply the two spans.", examples: ["lc-907"] },
      { id: "circular", label: "Circular array", when: "Next greater element in a ring.", key: "Walk the array twice (indices 0 to 2n - 1, using i % n) and only push in the first pass.", examples: ["slug:next-greater-element-ii"] },
    ],
    features: { input: ["array"], ask: ["query", "optimal-value", "count-ways"], shape: ["contiguous"], size: ["large", "huge"] },
    tags: ["Monotonic Stack", "Stack", "Array"],
    appPattern: "monotonic-stack",
  },
  {
    id: "monotonic-deque",
    label: "Monotonic deque",
    when: "The maximum or minimum of every window of fixed size, or the best earlier index inside a moving range (also in DP transitions).",
    key: "Keep a deque of indices whose values are decreasing (for max). The front is always the best index; drop indices that left the window and tail indices that can never win again.",
    watch: [
      "Remove expired indices from the front before reading the answer.",
      "Pop from the back while the new value is better or equal, then push the new index.",
      "It stores indices, so you can test whether the front is still inside the window.",
      "Shortest subarray with sum at least K (negatives allowed) uses the same deque over prefix sums.",
    ],
    template: {
      lang: "python",
      code: `from collections import deque

def window_max(a, k):
    dq, out = deque(), []          # indices; values are decreasing
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x:
            dq.pop()               # these can never be the max again
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()           # front left the window
        if i >= k - 1:
            out.append(a[dq[0]])
    return out`,
      complexity: "O(n) time, O(k) space",
    },
    variations: [
      { id: "window-max", label: "Sliding window maximum", when: "Max or min of every window of size k.", key: "Decreasing deque of indices; the front is the answer.", examples: ["lc-239"] },
      { id: "prefix-deque", label: "Deque over prefix sums", when: "Shortest subarray with sum at least K, with negative numbers.", key: "Keep prefix indices with increasing prefix sums; pop from the front while the window is valid.", examples: ["lc-862"] },
      { id: "dp-window", label: "DP with a window of choices", when: "dp[i] = best of dp[j] for j in the last k positions.", key: "Maintain the window's best dp value in a deque instead of rescanning k items.", examples: ["slug:jump-game-vi"] },
    ],
    features: { input: ["array"], ask: ["query", "optimal-value"], shape: ["contiguous"], size: ["large", "huge"] },
    tags: ["Monotonic Queue", "Queue", "Sliding Window"],
    appPattern: "monotonic-deque",
  },
  {
    id: "stack-parsing",
    label: "Stack for parsing",
    when: "Nested or matching structure: brackets, expressions with precedence, encoded strings, undo-like behaviour, anything where the most recent open thing is closed first.",
    key: "Push what is waiting for its partner; when the closing part arrives, pop and combine. The stack remembers the context you return to.",
    watch: [
      "At the end the stack must be empty (unmatched opening brackets).",
      "Check for an empty stack before popping.",
      "Expressions: handle precedence by resolving multiplication and division at once, and pushing sums for later.",
      "Nested decode or parentheses: push the state (number, string, sign) when you enter and restore it when you leave.",
    ],
    template: {
      lang: "python",
      code: `def is_valid(s):
    pair = {")": "(", "]": "[", "}": "{"}
    st = []
    for ch in s:
        if ch in pair:
            if not st or st.pop() != pair[ch]:
                return False
        else:
            st.append(ch)
    return not st                  # leftovers are unmatched openers`,
      complexity: "O(n) time, O(n) space",
    },
    variations: [
      { id: "brackets", label: "Bracket matching", when: "Valid parentheses, longest valid parentheses, minimum removals.", key: "Push indices or openers, pop on a closer; the index left on the stack bounds the valid stretch.", examples: ["lc-20", "lc-32"] },
      { id: "calculator", label: "Expression calculator", when: "Evaluate + - * / and parentheses.", key: "Keep a stack of terms; apply * and / immediately, push signed terms, sum at the end; recurse or push state at parentheses.", examples: ["lc-224", "lc-227", "lc-772"] },
      { id: "decode", label: "Nested decoding", when: "Decode patterns like 3[ab2[c]].", key: "On '[' push (current string, repeat count); on ']' pop and repeat.", examples: ["lc-394"] },
    ],
    features: { input: ["string"], ask: ["exists", "transform", "optimal-value"], shape: ["none"] },
    tags: ["Stack", "String", "Recursion"],
    appPattern: "stack-parsing",
  },
  {
    id: "heap-top-k",
    label: "Heap / top-k",
    when: "Always take the current best of a changing set: k largest, k-th item, merge k sorted sources, scheduling the next job, a stream.",
    key: "A heap gives the smallest (or largest) item in O(log n). Keep a min-heap of size k to hold the k largest; for k sorted sources, push the next item from the source you just popped.",
    watch: [
      "Python's heapq is a min-heap; negate the numbers for a max-heap.",
      "For a single k-th query on a static array, quickselect is O(n) on average.",
      "Push tuples (priority, tie-breaker, item) so equal priorities do not compare uncomparable objects.",
      "Lazy deletion: mark an item as removed and skip it when it reaches the top.",
    ],
    template: {
      lang: "python",
      code: `import heapq

def kth_largest(nums, k):
    h = []                         # min-heap holding the k largest seen so far
    for x in nums:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)       # drop the smallest of the k + 1
    return h[0]`,
      complexity: "O(n log k) time, O(k) space",
    },
    variations: [
      { id: "kth", label: "K-th largest or smallest", when: "Keep only the k best seen.", key: "Size-k min-heap for the k largest; the root is the k-th largest.", examples: ["lc-215", "lc-347"] },
      { id: "merge-k", label: "Merge k sorted sources", when: "k sorted lists, k sorted arrays, smallest range covering all.", key: "Push the head of each; pop the smallest and push that source's next item.", examples: ["lc-23"] },
      { id: "greedy-schedule", label: "Greedy with a heap", when: "Always take the best available job or project next.", key: "Sort by availability, move available items into a heap by value, pop the best each round.", examples: ["lc-621", "lc-502"] },
      { id: "top-frequent", label: "Top k by frequency", when: "Most frequent words or numbers.", key: "Count first, then a size-k heap, or bucket by frequency for O(n).", examples: ["lc-347"] },
    ],
    features: { input: ["array", "stream"], ask: ["kth", "optimal-value", "order"], size: ["large"], updates: ["online"] },
    tags: ["Heap (Priority Queue)", "Array", "Data Stream"],
    appPattern: "heap-top-k",
  },
  {
    id: "two-heaps",
    label: "Two heaps",
    when: "The median or another middle statistic of a changing set, or anything that needs the best of two halves at once.",
    key: "A max-heap holds the lower half and a min-heap the upper half; sizes differ by at most one, so the middle is at the heap tops.",
    watch: [
      "Rebalance after every insert so the sizes stay within one of each other.",
      "Odd count: the larger heap's top is the median; even count: average the two tops.",
      "Sliding window median also needs lazy deletion (or a sorted structure).",
      "A plain sorted list with bisect is simpler when n is small.",
    ],
    template: {
      lang: "python",
      code: `import heapq

class MedianFinder:
    def __init__(self):
        self.lo = []               # max-heap (stored negated): lower half
        self.hi = []               # min-heap: upper half

    def add(self, x):
        heapq.heappush(self.lo, -x)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))   # biggest low goes up
        if len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))

    def median(self):
        if len(self.lo) > len(self.hi):
            return -self.lo[0]
        return (-self.lo[0] + self.hi[0]) / 2`,
      complexity: "O(log n) per add, O(1) per median",
    },
    variations: [
      { id: "running-median", label: "Running median of a stream", when: "Median after every new number.", key: "Insert into the right heap, then rebalance.", examples: ["lc-295"] },
      { id: "window-median", label: "Median of a sliding window", when: "Median of every window of size k.", key: "Two heaps with lazy deletion of items that left the window.", examples: ["lc-480"] },
    ],
    features: { input: ["stream", "array"], ask: ["query", "kth"], updates: ["online"], size: ["large"] },
    tags: ["Heap (Priority Queue)", "Data Stream", "Sliding Window"],
    appPattern: "two-heaps",
  },
  {
    id: "lru-lfu",
    label: "LRU / LFU design",
    when: "A cache or counter structure with O(1) get and put and a rule for what to evict or which key is extreme.",
    key: "Combine a hash map (find in O(1)) with an ordered structure (a linked list or buckets) that keeps the eviction order, and update both on every operation.",
    watch: [
      "Both structures must change together on every get and put.",
      "Use sentinel head and tail nodes in a doubly linked list so edge cases disappear.",
      "LFU: bucket keys by frequency, keep a min-frequency counter, and break ties by recency.",
      "In Python an OrderedDict gives you the whole LRU; in an interview, be ready to build the list yourself.",
    ],
    template: {
      lang: "python",
      code: `from collections import OrderedDict

class LRU:
    def __init__(self, cap):
        self.cap, self.d = cap, OrderedDict()

    def get(self, k):
        if k not in self.d:
            return -1
        self.d.move_to_end(k)      # most recently used goes last
        return self.d[k]

    def put(self, k, v):
        self.d[k] = v
        self.d.move_to_end(k)
        if len(self.d) > self.cap:
            self.d.popitem(last=False)     # evict the least recently used`,
      complexity: "O(1) per operation, O(capacity) space",
    },
    variations: [
      { id: "lru", label: "LRU cache", when: "Evict the least recently used key.", key: "Hash map plus doubly linked list; move a touched node to the front.", examples: ["lc-146"] },
      { id: "lfu", label: "LFU cache", when: "Evict the least frequently used key, oldest first on ties.", key: "Map key -> (value, count) plus a map count -> ordered keys; track the minimum count.", examples: ["lc-460"] },
      { id: "all-one", label: "Counter with min and max in O(1)", when: "Increment, decrement, and ask for the key with max or min count.", key: "A doubly linked list of count buckets, each holding a set of keys.", examples: ["lc-432"] },
    ],
    features: { input: ["design"], ask: ["query"], updates: ["online"], size: ["huge"] },
    tags: ["Design", "Hash Table", "Doubly-Linked List", "Linked List"],
    appPattern: "lru-lfu",
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Patterns, part 3: trees and graphs
// ---------------------------------------------------------------------------------------------------------------

const TREE_PATTERNS: ThinkPattern[] = [
  {
    id: "tree-dfs",
    label: "Tree DFS",
    when: "A binary tree (or any tree) and the answer is built from subtrees: depth, diameter, path sums, validity, lowest common ancestor.",
    key: "Decide what each recursive call returns to its parent, and what it receives from it. Return values up (height, sum); pass limits down (allowed range, path so far).",
    watch: [
      "Separate what you return to the parent from what you record as a candidate answer (diameter, max path).",
      "A null node must return a neutral value (0, empty, True).",
      "Pass down a (low, high) range for BST validity; comparing only with direct children is wrong.",
      "Very deep trees (a linked-list-shaped tree) can overflow the recursion; use an explicit stack if needed.",
    ],
    template: {
      lang: "python",
      code: `def diameter(root):
    best = 0
    def height(node):
        nonlocal best
        if not node:
            return 0
        l, r = height(node.left), height(node.right)
        best = max(best, l + r)    # the path that bends at this node
        return 1 + max(l, r)       # what the parent can extend
    height(root)
    return best`,
      complexity: "O(n) time, O(h) stack space",
    },
    variations: [
      { id: "return-up", label: "Return information up", when: "Height, diameter, balanced check, max path sum.", key: "Post-order: combine the children's results, update a global best, return your own value.", examples: ["lc-543", "lc-124"] },
      { id: "pass-down", label: "Pass information down", when: "Path sum, validate a BST, count good nodes.", key: "Pre-order carrying the running sum or the allowed range as parameters.", examples: ["lc-98"] },
      { id: "lca", label: "Lowest common ancestor", when: "Closest shared ancestor of two nodes.", key: "If both subtrees return a node, the current node is the answer; otherwise pass up whichever is non-empty.", examples: ["lc-236"] },
      { id: "path-search", label: "Search for a path", when: "Root-to-leaf paths, paths summing to a target.", key: "Append on the way down, record at leaves, undo on the way back (backtracking inside a tree).", examples: ["slug:path-sum-ii"] },
    ],
    features: { input: ["tree"], ask: ["optimal-value", "exists", "query"], shape: ["levels", "none"], size: ["large"] },
    tags: ["Tree", "Binary Tree", "Depth-First Search", "Recursion"],
    appPattern: "tree-dfs",
  },
  {
    id: "tree-bfs",
    label: "BFS level order",
    when: "The question is about levels of a tree: level order, right-side view, minimum depth, zigzag, widest level.",
    key: "Process the queue one level at a time: read the queue length at the start of the level and handle exactly that many nodes.",
    watch: [
      "Read len(queue) once before the inner loop; it changes as you add children.",
      "Right-side view is the last node of each level; left-side is the first.",
      "Minimum depth: stop at the first leaf you meet, which BFS finds earliest.",
      "Vertical order also needs column numbers (and row numbers to break ties).",
    ],
    template: {
      lang: "python",
      code: `from collections import deque

def level_order(root):
    if not root:
        return []
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):    # exactly one level
            node = q.popleft()
            level.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
        out.append(level)
    return out`,
      complexity: "O(n) time, O(width) space",
    },
    variations: [
      { id: "level-order", label: "Level order lists", when: "Return nodes grouped by level, zigzag, averages per level.", key: "Inner loop over the current level's size.", examples: ["lc-102"] },
      { id: "side-view", label: "Side view", when: "What you see from the right or left.", key: "Take the last (or first) node of each level.", examples: ["lc-199"] },
      { id: "columns", label: "Vertical order", when: "Group nodes by column.", key: "Queue holds (node, column); sort or bucket by column at the end.", examples: ["lc-987"] },
    ],
    features: { input: ["tree"], ask: ["query", "transform", "path"], shape: ["levels"], size: ["large"] },
    tags: ["Breadth-First Search", "Tree", "Binary Tree", "Queue"],
    appPattern: "tree-bfs",
  },
  {
    id: "tree-construct",
    label: "Construct / serialize a tree",
    when: "Rebuild a tree from traversals, build a balanced tree from a sorted array, or turn a tree into a string and back.",
    key: "The root is the first item of the preorder (or the last of the postorder); find it in the inorder to learn the size of the left and right parts, then recurse on both. A serialised form must record empty children too.",
    watch: [
      "Put inorder values in a hash map, or each lookup costs O(n) and the total O(n^2).",
      "Build the left subtree before the right when you read from a preorder list.",
      "Preorder alone does not identify a tree unless you also write null markers.",
      "Duplicates in the values make traversal-based rebuilding ambiguous; the problem normally rules them out.",
    ],
    template: {
      lang: "python",
      code: `def build(preorder, inorder):
    idx = {v: i for i, v in enumerate(inorder)}
    it = iter(preorder)
    def go(lo, hi):                # builds the subtree for inorder[lo:hi]
        if lo == hi:
            return None
        v = next(it)               # preorder gives the root first
        node = TreeNode(v)
        m = idx[v]
        node.left = go(lo, m)      # left before right: matches preorder order
        node.right = go(m + 1, hi)
        return node
    return go(0, len(inorder))`,
      complexity: "O(n) time, O(n) space",
    },
    variations: [
      { id: "from-traversals", label: "From two traversals", when: "Preorder + inorder, or postorder + inorder.", key: "Root from the preorder, split point from the inorder index.", examples: ["lc-105"] },
      { id: "serialize", label: "Serialize and deserialize", when: "Encode a tree to a string and decode it.", key: "Preorder with null markers; decode by consuming tokens in the same order.", examples: ["lc-297"] },
      { id: "from-sorted", label: "From a sorted array", when: "Height-balanced BST from sorted data.", key: "Choose the middle as the root and recurse on each half.", examples: ["slug:convert-sorted-array-to-binary-search-tree"] },
    ],
    features: { input: ["tree", "array"], ask: ["transform"], size: ["large"] },
    tags: ["Binary Tree", "Tree", "Divide and Conquer", "Hash Table"],
    appPattern: "tree-construct",
  },
  {
    id: "bst",
    label: "BST properties",
    when: "A binary search tree: ordered queries, k-th smallest, validation, iterators, or repairing a tree with two swapped nodes.",
    key: "In-order traversal of a BST visits values in sorted order. Most BST problems are 'do an in-order walk' or 'go left or right by comparing'.",
    watch: [
      "Validate with a (low, high) range, or with in-order values being strictly increasing, not by comparing to children only.",
      "An iterator keeps a stack of the left spine so next() is O(1) amortised.",
      "A skewed BST has height n; do not promise O(log n) unless it is balanced.",
      "Two swapped nodes show up as one or two descents in the in-order sequence.",
    ],
    template: {
      lang: "python",
      code: `def is_valid_bst(root, lo=float("-inf"), hi=float("inf")):
    if not root:
        return True
    if not lo < root.val < hi:
        return False
    return (is_valid_bst(root.left, lo, root.val)
            and is_valid_bst(root.right, root.val, hi))`,
      complexity: "O(n) time, O(h) space",
    },
    variations: [
      { id: "inorder-sorted", label: "In-order is sorted", when: "K-th smallest, validate, find the closest value, recover swapped nodes.", key: "Walk in order (iteratively with a stack) and stop when you have what you need.", examples: ["lc-230", "lc-99"] },
      { id: "iterator", label: "BST iterator", when: "next() and has_next() over the tree in order.", key: "Stack of the left spine; pop, then push the left spine of the right child.", examples: ["lc-173"] },
      { id: "search-insert-delete", label: "Search, insert, delete", when: "Basic operations on a BST.", key: "Compare and go left or right; deleting a node with two children swaps in the in-order successor.", examples: ["slug:insert-into-a-binary-search-tree"] },
    ],
    features: { input: ["tree"], ask: ["kth", "exists", "query"], sorted: ["yes"], size: ["large"] },
    tags: ["Binary Search Tree", "Tree", "Binary Tree"],
    appPattern: "bst",
  },
  {
    id: "tree-dp",
    label: "Tree DP / rerooting",
    when: "Each node's best value depends on its children's results with a choice at the node (take or skip, cover or not), or you need an answer for every possible root.",
    key: "Return a small tuple of states from each subtree (for example best if I take this node, best if I skip it) and combine children in post-order. For every-root answers, compute downwards once, then reroot by moving the answer from parent to child.",
    watch: [
      "Name the states in words first: a tuple of 'node taken' and 'node not taken' beats a clever formula.",
      "Null children return the neutral tuple (0, 0), or the base case for covers (not needed).",
      "Rerooting: the answer for a child equals the parent's answer plus a correction for the subtree that moves.",
      "Deep trees: recursion limit; iterate in reverse BFS order instead.",
    ],
    template: {
      lang: "python",
      code: `def rob(root):
    def go(node):                  # (best if node is robbed, best if skipped)
        if not node:
            return 0, 0
        lt, ls = go(node.left)
        rt, rs = go(node.right)
        take = node.val + ls + rs                  # children must be skipped
        skip = max(lt, ls) + max(rt, rs)           # children are free
        return take, skip
    return max(go(root))`,
      complexity: "O(n) time, O(h) space",
    },
    variations: [
      { id: "take-skip", label: "Take or skip a node", when: "Choose non-adjacent nodes for the best total.", key: "Return (take, skip) per node.", examples: ["lc-337"] },
      { id: "cover-states", label: "Three-state cover", when: "Place cameras, guards or lamps so every node is covered.", key: "State per node: not covered, covered without a device, has a device; combine children.", examples: ["lc-968"] },
      { id: "reroot", label: "Answer for every root", when: "Sum of distances from each node to all others.", key: "One DFS computes subtree sizes and sums; a second DFS reroots in O(1) per edge.", examples: ["lc-834"] },
    ],
    features: { input: ["tree", "graph"], ask: ["optimal-value", "count-ways"], shape: ["levels"], overlap: ["yes"] },
    tags: ["Dynamic Programming", "Tree", "Depth-First Search", "Binary Tree"],
    appPattern: "tree-dp",
    covers: ["tree-dp-2"],
  },
  {
    id: "binary-lifting",
    label: "Binary lifting / LCA / Euler tour",
    when: "Many queries about ancestors in a tree: the k-th ancestor, the lowest common ancestor, path sums, subtree ranges.",
    key: "Precompute up[j][v] = the 2^j-th ancestor of v. A jump of any length is a few table lookups: O(log n) per query after O(n log n) preparation. An Euler tour (entry and exit times) turns a subtree into a contiguous range.",
    watch: [
      "Table size is n * log n; pick LOG from n (17 covers 10^5, 20 covers 10^6).",
      "Let the root's parent be itself (or a sentinel) so jumps past the root do not crash.",
      "LCA: lift the deeper node to the same depth, then lift both while their ancestors differ.",
      "For one-off queries a plain DFS is simpler; use this when there are many.",
    ],
    template: {
      lang: "python",
      code: `LOG = 17                           # covers up to 2^17 - 1 steps

def build_up(parent):              # parent[root] = root
    up = [parent]
    for _ in range(1, LOG):
        prev = up[-1]
        up.append([prev[prev[v]] for v in range(len(parent))])
    return up

def kth_ancestor(up, v, k):
    for j in range(LOG):
        if (k >> j) & 1:
            v = up[j][v]
    return v`,
      complexity: "O(n log n) build, O(log n) per query",
    },
    variations: [
      { id: "kth-ancestor", label: "K-th ancestor", when: "Jump k steps toward the root.", key: "Break k into bits and take the matching jumps.", examples: ["lc-1483"] },
      { id: "lca-binary", label: "Lowest common ancestor by lifting", when: "Many LCA queries on one tree.", key: "Equalise depths, then lift both nodes together from the highest jump down.", examples: ["lc-1483"] },
      { id: "euler-tour", label: "Euler tour to ranges", when: "Subtree sum or update queries.", key: "Number nodes by entry time; a subtree is one range, so a Fenwick or segment tree finishes the job.", examples: ["c-subtree-range-queries"] },
    ],
    features: { input: ["tree"], ask: ["query"], updates: ["static", "point-updates"], size: ["large", "huge"] },
    tags: ["Tree", "Binary Search", "Depth-First Search", "Dynamic Programming"],
    appPattern: "binary-lifting",
  },
  {
    id: "trie",
    label: "Trie",
    when: "Many words and prefix questions: autocomplete, dictionary with wildcards, longest common prefix, words on a board, maximum XOR of two numbers.",
    key: "Store words as paths of characters (or bits) from a root; shared prefixes share nodes, so a lookup costs the word length, not the number of words.",
    watch: [
      "Mark where a word ends; a prefix is not automatically a word.",
      "Wildcards ('.'): recurse into every child at that position.",
      "Word search on a board: walk the trie and the grid together and prune dead branches.",
      "Memory: a dict per node is fine in Python; arrays of 26 are typical in C++ and Java.",
    ],
    template: {
      lang: "python",
      code: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True           # a word ends here

    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node:
                return False
            node = node[ch]
        return True`,
      complexity: "O(L) per insert or lookup, O(total characters) space",
    },
    variations: [
      { id: "prefix-dictionary", label: "Prefix and word lookup", when: "Insert, search, starts-with.", key: "Walk the characters; mark word ends.", examples: ["lc-208"] },
      { id: "wildcard", label: "Wildcard search", when: "A '.' matches any letter.", key: "DFS: at a dot try every child.", examples: ["lc-211"] },
      { id: "board-words", label: "Words on a grid", when: "Find all dictionary words in a letter board.", key: "Build a trie of the words and DFS the board along trie edges; remove found words to prune.", examples: ["lc-212"] },
      { id: "bit-trie", label: "XOR trie", when: "Maximum XOR of two numbers.", key: "Insert numbers bit by bit from the top; for each number walk the opposite bit when it exists.", examples: ["lc-421"] },
    ],
    features: { input: ["string", "array"], ask: ["exists", "query", "optimal-value"], size: ["large"] },
    tags: ["Trie", "String", "Hash Table", "Bit Manipulation"],
    appPattern: "trie",
  },
];

const GRAPH_PATTERNS: ThinkPattern[] = [
  {
    id: "graph-bfs",
    label: "BFS / multi-source BFS",
    when: "Fewest steps in an unweighted graph or grid, spreading from one or many sources at once, minimum moves to reach a target.",
    key: "BFS visits nodes in order of distance, so the first time you reach a node is the shortest way there. Put all sources in the queue at distance 0 for multi-source problems.",
    watch: [
      "Mark a node visited when you push it, not when you pop it, or it enters the queue many times.",
      "BFS is only for equal edge cost. Different costs need Dijkstra; costs of 0 and 1 need a deque.",
      "Grids: write the four (or eight) neighbour offsets once and check the bounds.",
      "Track distance by storing it with the node or by processing one level at a time.",
    ],
    template: {
      lang: "python",
      code: `from collections import deque

def bfs(sources, adj, n):
    dist = [-1] * n
    q = deque(sources)
    for s in sources:
        dist[s] = 0                # all sources start at distance 0
    while q:
        v = q.popleft()
        for w in adj[v]:
            if dist[w] == -1:      # first visit is the shortest
                dist[w] = dist[v] + 1
                q.append(w)
    return dist`,
      complexity: "O(V + E) time, O(V) space",
    },
    variations: [
      { id: "shortest-steps", label: "Fewest steps", when: "Shortest path in a grid or unweighted graph; word ladder.", key: "Plain BFS from the start; stop when you pop the target.", examples: ["lc-127", "slug:shortest-path-in-binary-matrix"] },
      { id: "multi-source", label: "Multi-source BFS", when: "Rotting oranges, distance to the nearest 0, fire spreading.", key: "Start with every source in the queue at once.", examples: ["lc-994", "lc-542"] },
      { id: "bfs-islands", label: "Shortest bridge between regions", when: "Two components and the shortest way to connect them.", key: "Collect one region (DFS), then BFS outward from all its cells.", examples: ["lc-934"] },
      { id: "levels", label: "Level-by-level spread", when: "Minimum minutes until everything is infected.", key: "Count rounds of the queue; the number of rounds is the answer.", examples: ["lc-994"] },
    ],
    features: { input: ["graph", "grid"], ask: ["optimal-value", "path"], weights: ["none"], size: ["large"] },
    tags: ["Breadth-First Search", "Graph", "Matrix", "Queue", "Shortest Path"],
    appPattern: "graph-bfs",
  },
  {
    id: "graph-dfs",
    label: "DFS / flood fill",
    when: "Connected components, islands, reachability, cycle detection, copying a graph, exploring everything reachable from a node.",
    key: "Visit a node, mark it, and recurse into every unvisited neighbour. One DFS marks a whole component, so the number of DFS starts equals the number of components.",
    watch: [
      "Mark visited before recursing, or you loop forever in a cycle.",
      "Directed cycle detection needs three states (unvisited, on the current path, done); undirected needs the parent check.",
      "A big grid can overflow the recursion; use an explicit stack in Python.",
      "Do not mutate the input unless the statement allows it; use a visited set otherwise.",
    ],
    template: {
      lang: "python",
      code: `def count_islands(grid):
    R, C = len(grid), len(grid[0])
    seen = set()

    def fill(r, c):
        stack = [(r, c)]
        seen.add((r, c))
        while stack:
            x, y = stack.pop()
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < R and 0 <= ny < C and grid[nx][ny] == "1" and (nx, ny) not in seen:
                    seen.add((nx, ny))
                    stack.append((nx, ny))

    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == "1" and (r, c) not in seen:
                fill(r, c)
                count += 1
    return count`,
      complexity: "O(V + E) time, O(V) space",
    },
    variations: [
      { id: "flood-fill", label: "Flood fill and islands", when: "Count regions, biggest region, enclosed areas.", key: "Start a fill at every unvisited land cell and count the starts.", examples: ["lc-200"] },
      { id: "reachability", label: "Reach from the border or the sources", when: "Which cells can flow to both oceans.", key: "Search backwards from the targets instead of forwards from every cell.", examples: ["lc-417"] },
      { id: "clone", label: "Clone or copy a graph", when: "Deep copy nodes with neighbours.", key: "A map old -> new node, filled while traversing.", examples: ["lc-133"] },
      { id: "cycle-detect", label: "Cycle detection", when: "Is there a cycle, in a directed or undirected graph.", key: "Directed: back-edge to a node on the current path. Undirected: a visited neighbour that is not the parent.", examples: ["lc-207"] },
    ],
    features: { input: ["graph", "grid"], ask: ["exists", "count-ways"], shape: ["components"], size: ["large"] },
    tags: ["Depth-First Search", "Graph", "Matrix", "Recursion"],
    appPattern: "graph-dfs",
  },
  {
    id: "topo-sort",
    label: "Topological sort",
    when: "Tasks with prerequisites: a valid order, whether the dependencies are consistent, the longest chain, or an order derived from comparisons (alien dictionary).",
    key: "Repeatedly take a node with no incoming edges (Kahn), or run DFS and reverse the finishing order. If nodes remain, there is a cycle and no valid order exists.",
    watch: [
      "Edge direction: prerequisite -> course. Draw one example before coding.",
      "Return an empty result when a cycle exists; compare the output length with n.",
      "Longest chain or earliest finish: process in topological order and relax each edge (DP on a DAG).",
      "When deriving edges from sorted words, compare adjacent words at the first differing letter; watch out for a longer word before its own prefix.",
    ],
    template: {
      lang: "python",
      code: `from collections import deque

def topo_order(n, edges):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:             # a must come before b
        adj[a].append(b)
        indeg[b] += 1
    q = deque(v for v in range(n) if indeg[v] == 0)
    order = []
    while q:
        v = q.popleft()
        order.append(v)
        for w in adj[v]:
            indeg[w] -= 1
            if indeg[w] == 0:
                q.append(w)
    return order if len(order) == n else []     # [] means a cycle`,
      complexity: "O(V + E) time, O(V + E) space",
    },
    variations: [
      { id: "course-order", label: "Course schedule / build order", when: "Can all tasks finish, in what order.", key: "Kahn's algorithm; compare the number of processed nodes with n.", examples: ["lc-207", "lc-210"] },
      { id: "derived-order", label: "Order from comparisons", when: "Recover an alphabet or ranking from sorted samples.", key: "Turn each adjacent pair into one edge, then topologically sort.", examples: ["lc-269"] },
      { id: "dag-dp", label: "Longest path or earliest finish on a DAG", when: "Minimum time to finish all courses with durations.", key: "Process in topological order; dp[w] = max(dp[w], dp[v] + time[w]).", examples: ["lc-2050"] },
    ],
    features: { input: ["graph"], ask: ["order", "exists", "optimal-value"], shape: ["dependencies"], size: ["large"] },
    tags: ["Topological Sort", "Graph", "Breadth-First Search", "Depth-First Search"],
    appPattern: "topo-sort",
  },
  {
    id: "union-find",
    label: "Union-Find (DSU)",
    when: "Which items are connected, merge groups, count components as edges arrive, detect the edge that closes a cycle, group accounts or equivalent items.",
    key: "Each item points to a parent; find returns the root of its group (with path compression), union joins two roots (by size). Both operations are nearly constant time.",
    watch: [
      "An edge whose two ends already share a root closes a cycle (redundant connection).",
      "Count components by subtracting one for every successful union.",
      "It only merges; it cannot split groups. If connections are removed, process time in reverse.",
      "Grids: map (r, c) to r * cols + c.",
    ],
    template: {
      lang: "python",
      code: `class DSU:
    def __init__(self, n):
        self.p = list(range(n))
        self.size = [1] * n
        self.parts = n

    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]      # path halving
            x = self.p[x]
        return x

    def union(self, a, b):
        a, b = self.find(a), self.find(b)
        if a == b:
            return False                       # already connected
        if self.size[a] < self.size[b]:
            a, b = b, a
        self.p[b] = a
        self.size[a] += self.size[b]
        self.parts -= 1
        return True`,
      complexity: "Near O(1) per operation, O(n) space",
    },
    variations: [
      { id: "components", label: "Count or list components", when: "Number of provinces, groups of friends.", key: "Union every edge; parts is the answer.", examples: ["lc-547"] },
      { id: "cycle-edge", label: "Edge that closes a cycle", when: "Find the redundant connection.", key: "The first edge whose ends already share a root.", examples: ["lc-684"] },
      { id: "group-by-key", label: "Merge by shared attribute", when: "Merge accounts that share an email.", key: "Union indices that share a key; gather the members per root.", examples: ["lc-721"] },
      { id: "online-islands", label: "Add cells over time", when: "Count islands after each added land cell.", key: "Union the new cell with its land neighbours; update the component count.", examples: ["lc-305"] },
    ],
    features: { input: ["graph", "grid"], ask: ["count-ways", "exists"], shape: ["components"], updates: ["online"] },
    tags: ["Union Find", "Graph"],
    appPattern: "union-find",
  },
  {
    id: "dijkstra",
    label: "Dijkstra",
    when: "Cheapest path in a weighted graph where every edge cost is zero or more; also grids where moving costs differ, or the cost is the biggest step on the path.",
    key: "Always expand the closest unfinished node, kept in a min-heap. Once a node is popped with its shortest distance, it never improves again.",
    watch: [
      "Negative edges break it: use Bellman-Ford. Costs of only 0 and 1 use a deque instead.",
      "Skip stale heap entries (when d > dist[v]).",
      "Extra constraint (at most k stops): the state becomes (node, stops used), not just the node.",
      "Minimise the largest edge on a path ('minimum effort'): the cost you push is max(previous, this edge).",
    ],
    template: {
      lang: "python",
      code: `import heapq

def dijkstra(adj, s):              # adj[v] = [(w, cost)], all costs >= 0
    dist = {s: 0}
    pq = [(0, s)]
    while pq:
        d, v = heapq.heappop(pq)
        if d > dist.get(v, float("inf")):
            continue               # stale entry
        for w, c in adj[v]:
            nd = d + c
            if nd < dist.get(w, float("inf")):
                dist[w] = nd
                heapq.heappush(pq, (nd, w))
    return dist`,
      complexity: "O((V + E) log V) time, O(V) space",
    },
    variations: [
      { id: "single-source", label: "Single-source shortest path", when: "Time for a signal to reach all nodes.", key: "Standard heap version; the answer is the max distance (or -1 if some node is unreachable).", examples: ["lc-743"] },
      { id: "grid-cost", label: "Weighted grid", when: "Moving into a cell costs something or depends on heights.", key: "Treat cells as nodes; push the cell cost or the path's largest step.", examples: ["lc-1631", "lc-778"] },
      { id: "state-extended", label: "Extra state: stops or fuel", when: "Cheapest with at most k stops.", key: "Node becomes (city, stops); relax only while stops are allowed.", examples: ["lc-787"] },
    ],
    features: { input: ["graph", "grid"], ask: ["optimal-value", "path"], weights: ["non-negative"], size: ["large"] },
    tags: ["Shortest Path", "Graph", "Heap (Priority Queue)"],
    appPattern: "dijkstra",
  },
  {
    id: "bellman-ford",
    label: "Bellman-Ford / 0-1 BFS / SPFA",
    when: "Shortest path where edges can be negative, a limit on the number of edges, or edge costs that are only 0 or 1.",
    key: "Bellman-Ford relaxes every edge n - 1 times: after round k, all shortest paths with at most k edges are right. 0-1 BFS keeps a deque: push cost-0 neighbours to the front and cost-1 neighbours to the back.",
    watch: [
      "A relaxation that still improves in round n signals a negative cycle reachable from the source.",
      "'At most k edges' versions must relax from a copy of last round's distances.",
      "0-1 BFS is O(V + E), faster than Dijkstra, when the weights are binary.",
      "Do not use Dijkstra with negative edges, even if it seems to work on the sample.",
    ],
    template: {
      lang: "python",
      code: `def bellman_ford(n, edges, s):
    INF = float("inf")
    dist = [INF] * n
    dist[s] = 0
    for _ in range(n - 1):
        changed = False
        for a, b, c in edges:
            if dist[a] + c < dist[b]:
                dist[b] = dist[a] + c
                changed = True
        if not changed:
            break
    return dist                    # one more improving round means a negative cycle`,
      complexity: "O(V * E) time, O(V) space",
    },
    variations: [
      { id: "negative-edges", label: "Negative edges", when: "Some edges have negative cost, detect negative cycles.", key: "n - 1 rounds of relaxing every edge; one more round that improves means a cycle.", examples: ["lc-787"] },
      { id: "at-most-k", label: "At most k edges", when: "Cheapest flight with a stop limit.", key: "k + 1 rounds, each relaxing from the previous round's copy.", examples: ["lc-787"] },
      { id: "zero-one-bfs", label: "0-1 BFS", when: "Edge costs are 0 or 1 (remove the fewest obstacles, flip the fewest cells).", key: "Deque: 0-cost edge goes to the front, 1-cost edge to the back.", examples: ["lc-2290"] },
    ],
    features: { input: ["graph", "grid"], ask: ["optimal-value", "path"], weights: ["negative", "binary"], size: ["small", "large"] },
    tags: ["Shortest Path", "Graph", "Breadth-First Search"],
    appPattern: "bellman-ford",
  },
  {
    id: "floyd-warshall",
    label: "Floyd-Warshall",
    when: "Shortest distances between every pair of nodes and the number of nodes is small (about 400 or fewer).",
    key: "Allow one more intermediate node k at a time: d[i][j] = min(d[i][j], d[i][k] + d[k][j]). The outer loop must be k.",
    watch: [
      "Loop order: k outermost, then i and j.",
      "Initialise d[i][i] = 0 and missing edges to infinity (use a safe big number, not the max int).",
      "O(n^3) is fine for n <= 400; beyond that, run Dijkstra from each node instead.",
      "For reachability only (transitive closure) use booleans.",
    ],
    template: {
      lang: "python",
      code: `def floyd(d):                      # d[i][j] = edge cost or inf, d[i][i] = 0
    n = len(d)
    for k in range(n):             # allowed intermediate nodes: 0..k
        for i in range(n):
            for j in range(n):
                if d[i][k] + d[k][j] < d[i][j]:
                    d[i][j] = d[i][k] + d[k][j]
    return d`,
      complexity: "O(n^3) time, O(n^2) space",
    },
    variations: [
      { id: "all-pairs", label: "All-pairs distances", when: "Many distance queries on a small graph; the city with the fewest neighbours within a threshold.", key: "Run the triple loop once, then read any pair in O(1).", examples: ["lc-1334"] },
      { id: "closure", label: "Reachability closure", when: "Can i reach j, for all pairs.", key: "Same loop with 'or' and 'and' instead of min and plus." },
    ],
    features: { input: ["graph"], ask: ["optimal-value", "query"], size: ["small", "tiny"], weights: ["non-negative", "negative"] },
    tags: ["Shortest Path", "Graph", "Dynamic Programming"],
    appPattern: "floyd-warshall",
  },
  {
    id: "mst",
    label: "MST (Kruskal, Prim)",
    when: "Connect all nodes with the smallest total cost: cables, roads, pipes. The structure of the result is a tree.",
    key: "Kruskal: sort edges by cost and take an edge if it joins two different groups (use union-find). Prim: grow one tree, always adding the cheapest edge that leaves it.",
    watch: [
      "A valid MST has exactly n - 1 edges; fewer means the graph is disconnected.",
      "Dense graph (points in a plane, all pairs): Prim with an array in O(n^2) avoids building every edge.",
      "A virtual node connected to every village can model 'build a well here' costs.",
      "The MST path is not the shortest path between two nodes; do not mix them up.",
    ],
    template: {
      lang: "python",
      code: `def kruskal(n, edges):             # edges are (cost, a, b)
    p = list(range(n))

    def find(x):
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x

    total = used = 0
    for c, a, b in sorted(edges):
        ra, rb = find(a), find(b)
        if ra != rb:               # joins two groups: keep it
            p[ra] = rb
            total += c
            used += 1
    return total if used == n - 1 else None`,
      complexity: "O(E log E) time, O(n) space",
    },
    variations: [
      { id: "kruskal", label: "Kruskal with union-find", when: "Edges are given or cheap to list.", key: "Sort edges, skip the ones that close a cycle.", examples: ["lc-1584"] },
      { id: "prim-dense", label: "Prim on a dense graph", when: "Points with distance as cost, n up to a few thousand.", key: "Keep the cheapest cost to reach each outside node; add the minimum one each round.", examples: ["lc-1584"] },
      { id: "virtual-node", label: "Virtual source node", when: "Each node can be built directly at a cost, or linked to another.", key: "Add node 0 connected to every node by its build cost, then run an MST.", examples: ["lc-1168"] },
    ],
    features: { input: ["graph"], ask: ["optimal-value"], weights: ["non-negative", "negative"], shape: ["components"] },
    tags: ["Minimum Spanning Tree", "Union Find", "Graph"],
    appPattern: "mst",
  },
  {
    id: "bipartite",
    label: "Bipartite check / graph coloring",
    when: "Split items into two groups so that conflicting pairs are never together; 'dislikes', 'enemies', odd cycles.",
    key: "Color a start node 0, color its neighbours 1, their neighbours 0, and so on. A graph is bipartite exactly when no edge joins two nodes of the same color (equivalently: no odd cycle).",
    watch: [
      "Run the colouring from every uncolored node; the graph may be disconnected.",
      "BFS and DFS both work; stop at the first same-color edge.",
      "More than two groups (k-coloring) is NP-hard in general; check the constraints for small n.",
      "Union-find with a 'parity' or 'enemy' link is an alternative.",
    ],
    template: {
      lang: "python",
      code: `from collections import deque

def is_bipartite(adj):
    color = {}
    for s in range(len(adj)):
        if s in color:
            continue
        color[s] = 0
        q = deque([s])
        while q:
            v = q.popleft()
            for w in adj[v]:
                if w not in color:
                    color[w] = 1 - color[v]
                    q.append(w)
                elif color[w] == color[v]:
                    return False   # an odd cycle
    return True`,
      complexity: "O(V + E) time, O(V) space",
    },
    variations: [
      { id: "two-coloring", label: "Is the graph two-colourable", when: "Is the graph bipartite.", key: "BFS or DFS colouring with a conflict check on every edge.", examples: ["lc-785"] },
      { id: "dislike-pairs", label: "Split people who dislike each other", when: "Can everyone be split into two groups given the dislike pairs.", key: "Build the dislike graph and test it for being bipartite.", examples: ["lc-886"] },
    ],
    features: { input: ["graph"], ask: ["exists"], shape: ["components"], size: ["large"] },
    tags: ["Graph", "Breadth-First Search", "Depth-First Search", "Union Find"],
    appPattern: "bipartite",
  },
  {
    id: "tarjan",
    label: "Tarjan: bridges, articulation points, SCC",
    when: "Critical connections (edges whose removal disconnects the network), cut vertices, or strongly connected components of a directed graph.",
    key: "One DFS records the discovery time tin[v] and low[v], the earliest time reachable from v's subtree using at most one back edge. If low[child] > tin[v], the edge to the child is a bridge.",
    watch: [
      "Skip the edge back to the parent (by edge id if there are parallel edges).",
      "Articulation point: a non-root v with a child whose low >= tin[v], or the root with two or more DFS children.",
      "SCC: keep a stack of nodes; when low[v] == tin[v], pop one component. Kosaraju (two DFS passes) is an alternative.",
      "Recursion depth: iterate or raise the limit for n near 10^5.",
    ],
    template: {
      lang: "python",
      code: `def bridges(n, adj):               # simple undirected graph, adj[v] = neighbours
    tin = [-1] * n
    low = [0] * n
    timer = 0
    out = []

    def dfs(v, parent):
        nonlocal timer
        tin[v] = low[v] = timer
        timer += 1
        for w in adj[v]:
            if w == parent:
                continue
            if tin[w] != -1:                    # back edge
                low[v] = min(low[v], tin[w])
            else:
                dfs(w, v)
                low[v] = min(low[v], low[w])
                if low[w] > tin[v]:             # no way around this edge
                    out.append((v, w))

    for s in range(n):
        if tin[s] == -1:
            dfs(s, -1)
    return out`,
      complexity: "O(V + E) time, O(V) space",
    },
    variations: [
      { id: "bridges", label: "Bridges (critical connections)", when: "Which links are single points of failure.", key: "low[w] > tin[v] means the edge (v, w) is a bridge.", examples: ["lc-1192"] },
      { id: "articulation", label: "Articulation points", when: "Which servers, if removed, split the network.", key: "Non-root v is a cut vertex if some child has low >= tin[v]; the root needs two DFS children." },
      { id: "scc", label: "Strongly connected components", when: "Mutual reachability groups in a directed graph; condense to a DAG.", key: "Tarjan with a stack, or Kosaraju: DFS order, then DFS on the reversed graph." },
    ],
    features: { input: ["graph"], ask: ["query", "exists", "count-ways"], shape: ["components"], size: ["large"] },
    tags: ["Strongly Connected Component", "Biconnected Component", "Graph", "Depth-First Search"],
    appPattern: "tarjan",
  },
  {
    id: "eulerian",
    label: "Eulerian path",
    when: "Use every edge exactly once (reconstruct an itinerary, draw without lifting the pen, de Bruijn sequences).",
    key: "A path exists when at most two vertices have odd (or unbalanced in/out) degree. Hierholzer's algorithm follows unused edges with DFS and writes a vertex when it is stuck; reversing that output is the path.",
    watch: [
      "Check the degree conditions first; otherwise no path exists.",
      "For lexicographically smallest, sort each adjacency list so the smallest is popped first.",
      "Do not confuse it with Hamiltonian paths (every vertex once), which are NP-hard.",
      "The path is built in reverse; reverse it at the end.",
    ],
    template: {
      lang: "python",
      code: `from collections import defaultdict

def euler_path(tickets, start):
    adj = defaultdict(list)
    for a, b in sorted(tickets, reverse=True):
        adj[a].append(b)           # pop() then gives the smallest next stop
    path, st = [], [start]
    while st:
        v = st[-1]
        if adj[v]:
            st.append(adj[v].pop())
        else:
            path.append(st.pop())  # stuck: this vertex is finished
    return path[::-1]`,
      complexity: "O(E log E) time for the sort, O(E) space",
    },
    variations: [
      { id: "itinerary", label: "Reconstruct an itinerary", when: "Use every ticket once, start at a fixed city, smallest lexical order.", key: "Hierholzer with sorted adjacency; output reversed.", examples: ["lc-332"] },
      { id: "degree-check", label: "Does a path exist", when: "Can you draw it in one stroke.", key: "Connected edges and 0 or 2 odd-degree vertices (undirected).", examples: ["lc-332"] },
    ],
    features: { input: ["graph"], ask: ["path", "exists"], shape: ["dependencies"], size: ["small", "large"] },
    tags: ["Eulerian Circuit", "Graph", "Depth-First Search"],
    appPattern: "eulerian",
  },
  {
    id: "state-space-bfs",
    label: "Implicit graph / state-space BFS",
    when: "No graph is given, but the problem is about moves between configurations: lock combinations, sliding puzzles, keys and doors, visit all nodes from any start.",
    key: "Treat each full configuration as a node, each legal move as an edge, and run BFS from the start state. The node must hold everything that affects what you can do next (position and keys, board and zero location).",
    watch: [
      "Put the whole state in the visited set (a tuple, a string, a bitmask).",
      "Estimate the number of states first; if it is too many, you need a smarter state or another pattern.",
      "A forbidden state (dead ends in a lock) is simply a node you never visit.",
      "Bitmask of visited nodes is the usual extra state for 'visit every node'.",
    ],
    template: {
      lang: "python",
      code: `from collections import deque

def min_moves(start, goal, neighbors):
    seen = {start}
    q = deque([(start, 0)])
    while q:
        state, d = q.popleft()
        if state == goal:
            return d
        for nxt in neighbors(state):       # legal moves from this state
            if nxt not in seen:
                seen.add(nxt)
                q.append((nxt, d + 1))
    return -1`,
      complexity: "O(states * moves per state) time, O(states) space",
    },
    variations: [
      { id: "lock-puzzle", label: "Combination lock / word ladder style", when: "Change one wheel or letter per move to reach a target.", key: "Neighbours are all single-change variants; skip forbidden ones.", examples: ["lc-752", "lc-127"] },
      { id: "sliding-puzzle", label: "Sliding puzzle", when: "Board arrangement puzzles.", key: "State is the board as a string; neighbours swap the blank with an adjacent tile.", examples: ["lc-773"] },
      { id: "visit-all-mask", label: "Visit every node (bitmask state)", when: "Shortest walk that touches all nodes, start anywhere.", key: "State = (current node, mask of visited); start from every node at once.", examples: ["lc-847"] },
    ],
    features: { input: ["graph", "grid", "numbers"], ask: ["optimal-value", "path"], weights: ["none"], size: ["tiny", "small"] },
    tags: ["Breadth-First Search", "Bitmask", "Graph", "Queue"],
    appPattern: "state-space-bfs",
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Patterns, part 4: backtracking, bits, dynamic programming, greedy
// ---------------------------------------------------------------------------------------------------------------

const SEARCH_SPACE_PATTERNS: ThinkPattern[] = [
  {
    id: "subsets",
    label: "Backtracking: subsets, permutations, combinations",
    when: "List every subset, ordering or combination (maybe with a sum or size rule), and the input is small (about 20 items or fewer).",
    key: "Build the answer one choice at a time: choose, explore, un-choose. The recursion tree is the set of all partial answers.",
    watch: [
      "Copy the current list when you save it (cur[:]), or every saved answer changes later.",
      "Duplicates in the input: sort, then skip an equal value that is not the first at this depth.",
      "Reuse allowed (combination sum): recurse from the same index; no reuse: recurse from i + 1.",
      "Check the size: n above about 20 means you need DP, meet in the middle or another idea.",
    ],
    template: {
      lang: "python",
      code: `def subsets_with_dups(a):
    a.sort()
    out, cur = [], []

    def go(i):
        out.append(cur[:])                 # every node is an answer
        for j in range(i, len(a)):
            if j > i and a[j] == a[j - 1]:
                continue                   # skip an equal sibling
            cur.append(a[j])
            go(j + 1)
            cur.pop()                      # un-choose

    go(0)
    return out`,
      complexity: "O(2^n * n) time, O(n) recursion depth",
    },
    variations: [
      { id: "subsets", label: "Subsets", when: "Include or exclude each item.", key: "Save at every node; recurse from index i + 1.", examples: ["lc-78", "lc-90"] },
      { id: "permutations", label: "Permutations", when: "Every ordering.", key: "A used[] array (or swapping); save when the length is n.", examples: ["lc-46", "lc-47"] },
      { id: "combination-sum", label: "Combinations with a target", when: "Pick items that add to a target, with or without reuse.", key: "Recurse with a remaining sum; stop when it is negative; avoid duplicates by sorting.", examples: ["lc-40"] },
      { id: "generate-structures", label: "Generate valid strings", when: "All balanced parentheses, all letter combinations.", key: "Extend one character at a time and only keep choices that can still become valid.", examples: ["lc-22"] },
    ],
    features: { input: ["array", "string"], ask: ["all-solutions"], shape: ["subsets"], size: ["tiny"] },
    tags: ["Backtracking", "Recursion", "Bit Manipulation", "Array"],
    appPattern: "subsets",
  },
  {
    id: "constraint-backtracking",
    label: "Constraint backtracking",
    when: "Place things on a board or in positions under rules, and you must find one or all valid arrangements (N-Queens, Sudoku, word search, partition strings).",
    key: "Backtracking plus early rejection: before you place something, test the rules; keep fast structures (sets, bitmasks) so the test is O(1). Pruning is what makes it finish.",
    watch: [
      "Test validity before recursing, not after.",
      "Keep sets or masks for columns and diagonals instead of scanning the board.",
      "Undo every change when you return, including marks on a grid.",
      "Order choices smartly (most constrained cell first in Sudoku) to cut the search.",
    ],
    template: {
      lang: "python",
      code: `def total_n_queens(n):
    cols, d1, d2 = set(), set(), set()

    def go(r):
        if r == n:
            return 1
        total = 0
        for c in range(n):
            if c in cols or (r - c) in d1 or (r + c) in d2:
                continue                   # attacked: prune
            cols.add(c)
            d1.add(r - c)
            d2.add(r + c)
            total += go(r + 1)
            cols.remove(c)
            d1.remove(r - c)
            d2.remove(r + c)
        return total

    return go(0)`,
      complexity: "Exponential in the worst case; pruning makes n <= 12 fast",
    },
    variations: [
      { id: "placement", label: "Board placement", when: "N-Queens, Sudoku.", key: "One row or cell per level; keep sets of used columns, diagonals, digits.", examples: ["lc-51", "lc-37"] },
      { id: "grid-word-search", label: "Path in a grid", when: "Does a word exist as a path through adjacent cells.", key: "DFS with a visited mark that you remove when you backtrack.", examples: ["lc-79"] },
      { id: "partition-string", label: "Partition a string", when: "Cut a string into valid pieces (palindromes, words).", key: "At each index try every next cut where the piece is valid; recurse on the rest.", examples: ["lc-131"] },
      { id: "min-removal", label: "Minimum removals to be valid", when: "Remove the fewest parentheses to make a string valid.", key: "BFS by number of removals, or DFS with a pruning bound on the removals left.", examples: ["lc-301"] },
    ],
    features: { input: ["grid", "string", "matrix"], ask: ["all-solutions", "exists", "count-ways"], size: ["tiny"] },
    tags: ["Backtracking", "Recursion", "Matrix", "String"],
    appPattern: "constraint-backtracking",
  },
  {
    id: "meet-in-middle",
    label: "Meet in the middle",
    when: "n is about 30 to 40: too big for 2^n, but 2^(n/2) is fine. Typical: subset sums close to a target, split an array into two parts with a small difference.",
    key: "Split the items into two halves, list every subset sum of each half (2^(n/2) each), then combine one value from each side with sorting plus two pointers or binary search.",
    watch: [
      "Memory is 2^(n/2) numbers per half; n = 40 means about a million each.",
      "Sort one side and binary search for the best partner of every item on the other side.",
      "Keep the subset size if the problem needs equal-sized parts (group by count).",
      "Negative numbers are fine; no monotonicity assumption is needed.",
    ],
    template: {
      lang: "python",
      code: `from bisect import bisect_left

def sums(items):
    out = [0]
    for x in items:
        out += [s + x for s in out]        # each item doubles the list
    return out

def closest_subset_sum(a, target):
    half = len(a) // 2
    left, right = sums(a[:half]), sorted(sums(a[half:]))
    best = float("inf")
    for s in left:
        i = bisect_left(right, target - s)
        for j in (i - 1, i):               # the two neighbours of the ideal partner
            if 0 <= j < len(right):
                best = min(best, abs(s + right[j] - target))
    return best`,
      complexity: "O(2^(n/2) * n) time, O(2^(n/2)) space",
    },
    variations: [
      { id: "closest-sum", label: "Subset sum closest to a goal", when: "Pick items so the sum is as close as possible to a target.", key: "Subset sums of each half, sort one side, binary search the partner.", examples: ["lc-1755"] },
      { id: "balanced-split", label: "Split into two equal-size halves", when: "Minimise the difference between two parts of size n each.", key: "Enumerate by (count, sum); for each count on the left, pair with the complement count on the right.", examples: ["lc-2035"] },
    ],
    features: { input: ["array"], ask: ["optimal-value", "exists"], shape: ["subsets"], size: ["tiny"] },
    tags: ["Array", "Binary Search", "Bit Manipulation", "Divide and Conquer", "Bitmask"],
    appPattern: "meet-in-middle",
  },
  {
    id: "bit-tricks",
    label: "Bit tricks",
    when: "XOR, masks, parity, powers of two, counting set bits, a value that appears once among pairs, or toggling flags.",
    key: "XOR cancels equal values (a ^ a = 0, a ^ 0 = a). n & (n - 1) clears the lowest set bit; n & -n isolates it. Masks let one integer hold a small set.",
    watch: [
      "Precedence: use parentheses; (x >> j) & 1, not x >> j & 1 in languages where you are unsure.",
      "Negative numbers and shifts behave differently across languages (Python integers are unbounded).",
      "Single number II (others appear three times): count each bit position modulo 3.",
      "Counting bits for 0..n: bits[i] = bits[i >> 1] + (i & 1).",
    ],
    template: {
      lang: "python",
      code: `def single_number(a):
    x = 0
    for v in a:
        x ^= v                     # pairs cancel out
    return x

def popcount(n):
    c = 0
    while n:
        n &= n - 1                 # clear the lowest set bit
        c += 1
    return c`,
      complexity: "O(n) and O(number of set bits)",
    },
    variations: [
      { id: "xor-cancel", label: "XOR cancels pairs", when: "Find the single or two single numbers among pairs.", key: "XOR everything; for two singles, split by a differing bit.", examples: ["lc-136", "lc-260"] },
      { id: "bit-counting", label: "Count bits and parity", when: "Hamming weight, bits for every number up to n.", key: "n & (n - 1) clears a bit; reuse the answer for n >> 1.", examples: ["lc-338"] },
      { id: "per-bit-modulo", label: "Count each bit separately", when: "Every number appears three times except one.", key: "For each bit, sum the bits over all numbers modulo 3; the remainder is the single number's bit.", examples: ["lc-137"] },
      { id: "max-xor", label: "Maximum XOR", when: "Largest XOR of two items.", key: "Build the answer from the top bit using a trie or a set of prefixes.", examples: ["lc-421"] },
    ],
    features: { input: ["bits", "numbers", "array"], ask: ["optimal-value", "exists", "count-ways"], size: ["large", "huge"] },
    tags: ["Bit Manipulation", "Math", "Bitmask"],
    appPattern: "bit-tricks",
  },
  {
    id: "bitmask-dp-subsets",
    label: "Bitmask DP",
    when: "n is up to about 20 and the state is 'which items are already used or visited' (assign tasks, visit all cities, partition into groups).",
    key: "Encode the set of used items as an integer mask and let dp[mask] (or dp[mask][last]) hold the best value for that set. Transitions add one item to the mask.",
    watch: [
      "States: 2^n times extra dimension; check that 2^20 * 20 fits the time limit.",
      "Iterate masks in increasing order so smaller sets are ready first.",
      "Test membership with (mask >> i) & 1 and add with mask | (1 << i).",
      "Assignment problems: the number of bits already set often tells you which person or task is next.",
    ],
    template: {
      lang: "python",
      code: `def tsp(dist):                     # shortest tour from city 0 back to city 0
    n = len(dist)
    INF = float("inf")
    dp = [[INF] * n for _ in range(1 << n)]    # dp[mask][last]
    dp[1][0] = 0
    for mask in range(1 << n):
        for last in range(n):
            if dp[mask][last] == INF:
                continue
            for nxt in range(n):
                if (mask >> nxt) & 1:
                    continue                   # already visited
                nm = mask | (1 << nxt)
                cost = dp[mask][last] + dist[last][nxt]
                if cost < dp[nm][nxt]:
                    dp[nm][nxt] = cost
    full = (1 << n) - 1
    return min(dp[full][last] + dist[last][0] for last in range(n))`,
      complexity: "O(2^n * n^2) time, O(2^n * n) space",
    },
    variations: [
      { id: "tsp", label: "Visit all, shortest route", when: "Travelling salesman style problems.", key: "dp[mask][last]: best cost having visited mask and ending at last.", examples: ["c-tsp"] },
      { id: "assign", label: "Assign items to people or groups", when: "Each person gets one hat or task; partition into k equal sums.", key: "dp[mask] = best or number of ways when the items in mask are used; add the next item to the group being filled.", examples: ["lc-1434", "lc-698"] },
      { id: "subset-of-subset", label: "Iterate submasks", when: "Split a set into two subsets; cover a set with groups.", key: "for sub in the submasks of mask: combine dp[sub] and dp[mask ^ sub]; total O(3^n).", examples: ["lc-1986"] },
    ],
    features: { input: ["array", "numbers"], ask: ["optimal-value", "count-ways", "exists"], shape: ["subsets"], size: ["tiny"], overlap: ["yes"] },
    tags: ["Bitmask", "Dynamic Programming", "Bit Manipulation"],
    appPattern: "bitmask-dp-subsets",
    covers: ["bitmask-dp-assign"],
  },
];

const DP_PATTERNS: ThinkPattern[] = [
  {
    id: "dp-1d",
    label: "Dynamic programming: 1D linear",
    when: "You need the best value or the number of ways, and the choice at each index depends on a few earlier answers: climbing, robbing, decoding, segmenting, jumping.",
    key: "Name the state in words (dp[i] = best using the first i items), write the recurrence from the last decision, set the base case, choose the fill order. If unsure, write the recursion with memo first.",
    watch: [
      "Say the state in one sentence before coding; most wrong DPs have a vague state.",
      "Base cases first: dp[0], dp[1], the empty string.",
      "If dp[i] only needs the last one or two values, keep two variables instead of an array.",
      "Counting ways: watch the modulus; optimising: initialise unreachable states to infinity (or -infinity).",
    ],
    template: {
      lang: "python",
      code: `def rob(nums):
    take = skip = 0                # best if the last house is robbed / not robbed
    for x in nums:
        take, skip = skip + x, max(take, skip)
    return max(take, skip)`,
      complexity: "O(n) time, O(1) space",
    },
    variations: [
      { id: "last-two", label: "Depends on the last one or two", when: "Climbing stairs, house robber.", key: "dp[i] = f(dp[i-1], dp[i-2]).", examples: ["lc-70", "lc-198"] },
      { id: "decode-count", label: "Count decodings", when: "Number of ways to split a string into valid codes.", key: "dp[i] = ways for the first i characters; add dp[i-1] if one char is valid, dp[i-2] if two chars are valid.", examples: ["lc-91"] },
      { id: "word-break", label: "Can a prefix be segmented", when: "Break a string into dictionary words.", key: "dp[i] is true if some j < i has dp[j] true and s[j:i] is a word.", examples: ["lc-139"] },
      { id: "min-jumps", label: "Minimum jumps", when: "Fewest steps to reach the end with jump lengths.", key: "A DP over positions, or a greedy range expansion that is BFS in disguise.", examples: ["lc-45"] },
    ],
    features: { input: ["array", "string", "numbers"], ask: ["optimal-value", "count-ways", "exists"], shape: ["subsequence", "none"], overlap: ["yes"], size: ["large", "small"] },
    tags: ["Dynamic Programming", "Memoization", "Array", "String"],
    appPattern: "dp-1d",
  },
  {
    id: "knapsack",
    label: "Knapsack (0/1, unbounded, bounded)",
    when: "Pick items with a cost or weight under a budget: coin change, partition equal subsets, target sum, subset with exact total, a two-resource budget.",
    key: "dp[c] = best value (or number of ways, or reachable true/false) using capacity c. Loop capacity downward for 0/1 (each item once) and upward for unbounded (an item can repeat).",
    watch: [
      "Direction of the capacity loop decides 0/1 versus unbounded. Mixing them is the classic bug.",
      "Coin change counting combinations: items in the outer loop; counting orderings: capacity in the outer loop.",
      "Capacity must be small (a sum up to about 10^4 to 10^5) or the table does not fit.",
      "Target sum with signs: turn it into a subset sum with (total + target) / 2.",
    ],
    template: {
      lang: "python",
      code: `def knapsack_01(items, cap):       # items are (weight, value)
    dp = [0] * (cap + 1)           # dp[c]: best value with capacity c
    for w, v in items:
        for c in range(cap, w - 1, -1):    # downward: each item used once
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]`,
      complexity: "O(n * cap) time, O(cap) space",
    },
    variations: [
      { id: "zero-one", label: "0/1 knapsack", when: "Each item used at most once; subset sum, equal partition, target sum.", key: "Loop capacity downward.", examples: ["lc-416", "lc-494"] },
      { id: "unbounded", label: "Unbounded knapsack", when: "Coin change: unlimited coins.", key: "Loop capacity upward so an item can be reused.", examples: ["lc-322", "lc-518"] },
      { id: "two-dimensions", label: "Two budgets", when: "At most m zeroes and n ones.", key: "dp over two capacities; loop both downward.", examples: ["lc-474"] },
    ],
    features: { input: ["array", "numbers"], ask: ["optimal-value", "count-ways", "exists"], shape: ["subsets"], overlap: ["yes"], size: ["small"] },
    tags: ["Dynamic Programming", "Array"],
    appPattern: "knapsack",
  },
  {
    id: "lis",
    label: "LIS family",
    when: "Longest increasing (or non-decreasing) subsequence, stacking items that must grow in two dimensions, counting such sequences.",
    key: "O(n^2) DP: dp[i] = 1 + max dp[j] for j < i with a[j] < a[i]. Faster: keep tails[k] = the smallest possible last value of an increasing subsequence of length k + 1, and binary search where each value goes.",
    watch: [
      "The tails array is not the sequence itself, only its length is meaningful.",
      "Strictly increasing uses bisect_left; non-decreasing uses bisect_right.",
      "Two dimensions (envelopes): sort by the first, and by the second descending on ties, then LIS on the second.",
      "Counting the number of LIS needs the O(n^2) DP or a tree, not the tails trick.",
    ],
    template: {
      lang: "python",
      code: `from bisect import bisect_left

def lis(a):
    tails = []                     # tails[k]: smallest last value of a length k + 1 run
    for x in a:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)`,
      complexity: "O(n log n) time, O(n) space",
    },
    variations: [
      { id: "plain-lis", label: "Longest increasing subsequence", when: "Length of the longest increasing subsequence.", key: "Tails array with binary search, or the O(n^2) DP.", examples: ["lc-300"] },
      { id: "nested-boxes", label: "Two-dimensional stacking", when: "Russian dolls: both width and height must grow.", key: "Sort by width ascending, height descending; run LIS on heights.", examples: ["lc-354"] },
      { id: "count-lis", label: "Count the longest ones", when: "How many longest increasing subsequences exist.", key: "Keep (length, count) per index in the O(n^2) DP.", examples: ["lc-673"] },
    ],
    features: { input: ["array"], ask: ["optimal-value", "count-ways"], shape: ["subsequence"], overlap: ["yes"], size: ["small", "large"] },
    tags: ["Dynamic Programming", "Binary Search", "Array"],
    appPattern: "lis",
  },
  {
    id: "grid-dp",
    label: "Grid DP",
    when: "Paths or costs on a grid where you only move right and down (or in a fixed set of directions), or the best square or rectangle ending at each cell.",
    key: "dp[r][c] depends on the cells just above and to the left, so fill row by row. Often one row is enough.",
    watch: [
      "Initialise the first row and column separately, or pad the grid with an extra border.",
      "Obstacles set dp to 0 (counting) or infinity (min cost).",
      "Movement in four directions with free revisits is a graph problem, not a DP: use BFS or Dijkstra.",
      "Increasing-path problems have no cycle, so memoised DFS works: dp[cell] = 1 + best neighbour that is bigger.",
    ],
    template: {
      lang: "python",
      code: `def min_path_sum(g):
    R, C = len(g), len(g[0])
    dp = [float("inf")] * C
    dp[0] = 0
    for r in range(R):
        for c in range(C):
            prev = dp[c] if c == 0 else min(dp[c], dp[c - 1])   # from above or from the left
            dp[c] = prev + g[r][c]
    return dp[C - 1]`,
      complexity: "O(rows * cols) time, O(cols) space",
    },
    variations: [
      { id: "count-paths", label: "Count paths", when: "How many ways to reach the corner.", key: "dp[r][c] = dp[r-1][c] + dp[r][c-1]; also a binomial coefficient.", examples: ["lc-62"] },
      { id: "min-cost-path", label: "Cheapest path", when: "Minimum sum from top-left to bottom-right.", key: "dp[r][c] = cell + min(up, left).", examples: ["lc-64"] },
      { id: "largest-square", label: "Largest square or rectangle", when: "Biggest square of ones.", key: "dp[r][c] = 1 + min(up, left, up-left) when the cell is 1.", examples: ["lc-221"] },
      { id: "two-walkers", label: "Two walkers at once", when: "Collect the most on a trip there and back.", key: "Move both walkers together: state (step, r1, r2).", examples: ["lc-741"] },
      { id: "memo-dfs", label: "Memoised DFS on a grid", when: "Longest increasing path in a matrix.", key: "dfs(cell) with a memo table; no visited set is needed because the path always increases.", examples: ["lc-329"] },
    ],
    features: { input: ["grid", "matrix"], ask: ["optimal-value", "count-ways"], shape: ["none"], overlap: ["yes"], size: ["small"] },
    tags: ["Dynamic Programming", "Matrix", "Memoization"],
    appPattern: "grid-dp",
  },
  {
    id: "two-string-dp",
    label: "Two-string DP",
    when: "Align, match or compare two strings or sequences: edit distance, common subsequence, wildcard or regex matching, count the ways one contains another.",
    key: "dp[i][j] answers the question for the first i characters of a and the first j of b. Look at the last characters: equal gives a diagonal move, different gives insert, delete or replace options.",
    watch: [
      "The table has (len a + 1) x (len b + 1) cells; row 0 and column 0 are the empty-string base cases.",
      "'Subsequence' allows gaps; 'substring' does not (longest common substring resets to 0 on a mismatch).",
      "Regex and wildcard: handle the star by trying 'match nothing' and 'match one more'.",
      "Space: row i only needs row i - 1, so two rows are enough.",
    ],
    template: {
      lang: "python",
      code: `def lcs(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[-1][-1]`,
      complexity: "O(len a * len b) time, O(len a * len b) space",
    },
    variations: [
      { id: "lcs", label: "Longest common subsequence", when: "Longest sequence in both, with gaps allowed.", key: "Equal last characters: 1 + diagonal; else the max of dropping one.", examples: ["lc-1143"] },
      { id: "edit-distance", label: "Edit distance", when: "Fewest inserts, deletes, replaces to turn a into b.", key: "Min of replace (diagonal + 1), delete (up + 1), insert (left + 1); diagonal + 0 when equal.", examples: ["lc-72"] },
      { id: "pattern-matching", label: "Wildcard and regex matching", when: "Does the string match a pattern with * and ? or . and *.", key: "dp[i][j]: does s[:i] match p[:j]; a star either consumes nothing or one more character.", examples: ["lc-10", "lc-44"] },
      { id: "count-subsequences", label: "Count distinct subsequences", when: "How many times does t appear as a subsequence of s.", key: "dp[i][j] = dp[i-1][j] (skip) + dp[i-1][j-1] if the characters are equal.", examples: ["lc-115"] },
    ],
    features: { input: ["string"], ask: ["optimal-value", "count-ways", "exists"], shape: ["subsequence"], overlap: ["yes"], size: ["small"] },
    tags: ["Dynamic Programming", "String"],
    appPattern: "two-string-dp",
  },
  {
    id: "interval-dp",
    label: "Interval DP",
    when: "A range [l, r] is built from smaller ranges: bursting balloons, merging stones, matrix chain, cutting a stick, palindrome partitioning, optimal game on a line.",
    key: "dp[l][r] = best for the range, trying every split point k inside it. Fill by increasing length so shorter ranges are ready. Often think about what happens LAST in the range, not first.",
    watch: [
      "Think 'last action' (last balloon burst, last cut): it splits the range into two independent parts.",
      "Fill order: by length, not by row.",
      "n up to about 500 matches the O(n^3) cost.",
      "Palindrome checks inside the DP are O(1) if you precompute an is_pal table.",
    ],
    template: {
      lang: "python",
      code: `def max_coins(nums):
    a = [1] + nums + [1]
    n = len(a)
    dp = [[0] * n for _ in range(n)]       # dp[l][r]: best for balloons strictly between l and r
    for length in range(2, n):
        for l in range(n - length):
            r = l + length
            for k in range(l + 1, r):      # k is the LAST balloon burst in (l, r)
                dp[l][r] = max(dp[l][r], dp[l][k] + a[l] * a[k] * a[r] + dp[k][r])
    return dp[0][n - 1]`,
      complexity: "O(n^3) time, O(n^2) space",
    },
    variations: [
      { id: "last-action", label: "Last action splits the range", when: "Burst balloons, cut a stick.", key: "Choose the last item to process; the two sides are independent subproblems.", examples: ["lc-312"] },
      { id: "merge-cost", label: "Merge with a cost", when: "Merge adjacent piles into one with minimum total cost.", key: "dp[l][r] = min over splits of left + right + cost of merging; prefix sums give the cost.", examples: ["lc-1000"] },
      { id: "palindrome-cuts", label: "Palindrome partition", when: "Fewest cuts so every piece is a palindrome.", key: "A table of which ranges are palindromes, then a 1D DP over prefixes.", examples: ["lc-132"] },
    ],
    features: { input: ["array", "string"], ask: ["optimal-value"], shape: ["ranges"], overlap: ["yes"], size: ["small"] },
    tags: ["Dynamic Programming", "Memoization"],
    appPattern: "interval-dp",
  },
  {
    id: "state-machine-dp",
    label: "State machine DP",
    when: "A sequence of days or steps where you are always in one of a few states (holding or not, cooling down, k transactions used) and each step moves between them.",
    key: "Keep one value per state per step and write each transition (buy, sell, rest) as a move from one state to another. The previous step's values are enough.",
    watch: [
      "Draw the states and arrows before writing code.",
      "Initialise 'holding' to minus infinity (you cannot hold before buying).",
      "Use the old values on the right side of the update (tuple assignment), not partly updated ones.",
      "At most k transactions: add k as another dimension of the state.",
    ],
    template: {
      lang: "python",
      code: `def max_profit_cooldown(prices):
    hold, sold, rest = float("-inf"), 0, 0
    for p in prices:
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
    return max(sold, rest)`,
      complexity: "O(n) time, O(1) space",
    },
    variations: [
      { id: "one-trade", label: "One transaction", when: "Buy once and sell once.", key: "Track the lowest price so far and the best profit.", examples: ["lc-121"] },
      { id: "unlimited", label: "Unlimited transactions", when: "Buy and sell as often as you like.", key: "Add up every positive day-to-day increase, or two states hold / not hold.", examples: ["lc-122"] },
      { id: "k-trades", label: "At most k transactions", when: "A limit on the number of trades.", key: "State (trades used, holding or not).", examples: ["lc-123", "lc-188"] },
      { id: "cooldown-fee", label: "Cooldown or fee", when: "A rest day after selling, or a fee per trade.", key: "Add a cooldown state or subtract the fee in the sell transition.", examples: ["lc-309"] },
    ],
    features: { input: ["array"], ask: ["optimal-value"], shape: ["contiguous", "none"], overlap: ["yes"], size: ["large"] },
    tags: ["Dynamic Programming", "Array"],
    appPattern: "state-machine-dp",
  },
  {
    id: "digit-dp",
    label: "Digit DP",
    when: "Count numbers in [L, R] (R up to 10^18) that satisfy a property of their digits: digit sum, no repeated digits, no forbidden digit, built from an allowed digit set.",
    key: "Walk the digits of the bound from the most significant. State: (position, what you must remember, are-we-still-tight-to-the-bound). Count(R) minus Count(L - 1) answers a range.",
    watch: [
      "The tight flag says the prefix equals the bound, so the next digit is limited by the bound's digit.",
      "Leading zeros may or may not count as digits; add a 'started' flag if they matter.",
      "Memoise only the non-tight states; the tight path is a single line.",
      "Ranges: compute f(R) - f(L - 1), or check L directly.",
    ],
    template: {
      lang: "python",
      code: `from functools import lru_cache

def count_digit_sum(N, S):         # integers in [0, N] whose digits add up to S
    digits = list(map(int, str(N)))

    @lru_cache(None)
    def go(i, left, tight):
        if left < 0:
            return 0
        if i == len(digits):
            return 1 if left == 0 else 0
        top = digits[i] if tight else 9
        return sum(go(i + 1, left - d, tight and d == top) for d in range(top + 1))

    return go(0, S, True)`,
      complexity: "O(digits * states * 10) time",
    },
    variations: [
      { id: "allowed-digits", label: "Numbers from allowed digits", when: "How many numbers up to N use only digits from a given set.", key: "Count shorter lengths by power, then walk the bound digit by digit.", examples: ["lc-902"] },
      { id: "unique-digits", label: "No repeated digit", when: "Count numbers with all different digits.", key: "Shorter lengths by permutations; for the tight part track a mask of used digits.", examples: ["lc-357"] },
    ],
    features: { input: ["numbers"], ask: ["count-ways"], shape: ["none"], size: ["huge"], overlap: ["yes"] },
    tags: ["Dynamic Programming", "Math", "Memoization"],
    appPattern: "digit-dp",
  },
  {
    id: "dp-optimizations",
    label: "DP optimizations (know they exist)",
    when: "A correct DP is O(n^2) or O(n^2 k) but n is 10^5 or more: convex hull trick, divide and conquer optimisation, Knuth optimisation, monotone queue DP. Rare in interviews.",
    key: "Look at the transition dp[i] = min over j of (dp[j] + cost(j, i)). If the best j moves in a predictable way (monotone), or cost has a special shape (a line, Monge), you can find the best j faster than scanning.",
    watch: [
      "First write the plain DP and check it on small inputs; only then optimise.",
      "A sliding-window minimum of dp[j] is a monotonic deque (dp with a window of choices).",
      "Costs that are lines in i (a * i + b) allow the convex hull trick.",
      "In an interview, naming the technique and the condition is usually enough.",
    ],
    variations: [
      { id: "window-min", label: "Monotone queue DP", when: "dp[i] uses the best dp[j] in a window of size k.", key: "Keep the window's best in a monotonic deque.", examples: ["lc-239"] },
      { id: "cht", label: "Convex hull trick", when: "dp[i] = min over j of (m_j * x_i + b_j), costs are linear in the current index.", key: "Keep the lower envelope of lines; query by binary search or pointer walk.", examples: ["c-dp-optimizations"] },
      { id: "divide-opt", label: "Divide and conquer optimisation", when: "The best split point is monotone in i.", key: "Compute the middle row's best split, recurse left and right with narrowed ranges.", examples: ["c-dp-optimizations"] },
    ],
    features: { input: ["array"], ask: ["optimal-value"], overlap: ["yes"], size: ["large"] },
    tags: ["Dynamic Programming", "Divide and Conquer", "Monotonic Queue"],
    appPattern: "dp-optimizations",
  },
  {
    id: "greedy-proof",
    label: "Greedy with proof",
    when: "A local choice (take the earliest finishing job, the furthest jump, the best ratio) can be shown to never hurt, so you never need to look back.",
    key: "Make the locally best choice and move on, but only after you can explain why it is safe: the best global answer can always be changed to start with that choice. If you cannot say why, test it against a counterexample or use DP.",
    watch: [
      "Try to break it with a tiny counterexample before trusting it.",
      "Greedy often needs a sort first, so say O(n log n).",
      "If choices overlap in effect (items interact in complicated ways), the greedy usually fails and DP is needed.",
      "Many greedies keep a running reach, a running best, or a heap of candidates.",
    ],
    template: {
      lang: "python",
      code: `def can_jump(nums):
    reach = 0                      # furthest index reachable so far
    for i, x in enumerate(nums):
        if i > reach:
            return False           # stuck before position i
        reach = max(reach, i + x)
    return True`,
      complexity: "O(n) time, O(1) space",
    },
    variations: [
      { id: "reach", label: "Furthest reach", when: "Can you get to the end, with the fewest jumps.", key: "Track the furthest position reachable; extend a jump when you pass the current limit.", examples: ["lc-55", "lc-45"] },
      { id: "running-balance", label: "Running balance", when: "Gas station: where to start so the tank never goes negative.", key: "If the total is non-negative, restart after the point where the running sum drops below zero.", examples: ["lc-134"] },
      { id: "two-pass", label: "Two passes", when: "Neighbour constraints from both sides, such as candy by ratings.", key: "One pass left to right, one right to left, then take the max.", examples: ["lc-135"] },
      { id: "last-occurrence", label: "Cut at the last occurrence", when: "Partition so each letter appears in only one part.", key: "Record the last index of each letter; cut when the current index reaches the farthest last index.", examples: ["lc-763"] },
    ],
    features: { input: ["array", "intervals", "string"], ask: ["optimal-value", "exists"], shape: ["none"], overlap: ["no"], size: ["large"] },
    tags: ["Greedy", "Array", "Sorting", "Heap (Priority Queue)"],
    appPattern: "greedy-proof",
  },
  {
    id: "exchange-argument",
    label: "Exchange argument",
    when: "A greedy order of items (jobs, intervals, letters) where you must prove that swapping two neighbours out of that order never improves the result.",
    key: "Pick an order, then show: if two adjacent items are out of that order, swapping them is not worse. Repeating this turns any answer into the greedy one. The proof also tells you the sort key.",
    watch: [
      "Compare only two adjacent items at a time; the rest of the schedule does not change.",
      "The order of earliest deadline, shortest job, or earliest end each wins under a different objective; match the key to the objective.",
      "When the greedy is easy but the proof is not, keep the proof one sentence long and test with a brute force.",
      "Arrange letters so the most frequent are separated: a heap or a placement into alternating slots.",
    ],
    template: {
      lang: "python",
      code: `def max_non_overlapping(intervals):
    count, end = 0, float("-inf")
    for s, e in sorted(intervals, key=lambda x: x[1]):     # earliest end first
        if s >= end:               # fits after the last kept interval
            count += 1
            end = e
    return count`,
      complexity: "O(n log n) time, O(1) extra space",
    },
    variations: [
      { id: "earliest-end", label: "Earliest finishing first", when: "Pick the most non-overlapping intervals, or shoot balloons with the fewest arrows.", key: "Swapping in an interval that ends earlier never blocks more.", examples: ["lc-452"] },
      { id: "separate-letters", label: "Spread the most frequent", when: "Rearrange so no two equal letters are adjacent.", key: "Always place the letter with the highest remaining count that is not the one just used.", examples: ["lc-767"] },
      { id: "job-order", label: "Order jobs by a ratio or deadline", when: "Minimise total lateness or weighted completion time.", key: "Compare two jobs by what each order costs; sort by that rule.", examples: ["lc-621"] },
    ],
    features: { input: ["array", "intervals", "string"], ask: ["optimal-value", "order"], sorted: ["can-sort"], overlap: ["no"] },
    tags: ["Greedy", "Sorting", "Heap (Priority Queue)"],
    appPattern: "exchange-argument",
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Patterns, part 5: math, advanced structures
// ---------------------------------------------------------------------------------------------------------------

const MATH_ADVANCED_PATTERNS: ThinkPattern[] = [
  {
    id: "number-theory",
    label: "Number theory",
    when: "Divisibility, gcd and lcm, primes, counting divisors, remainders, powers with a huge exponent, a modulus such as 10^9 + 7.",
    key: "Work with remainders and factors instead of the numbers themselves: gcd by Euclid, primes by a sieve, powers by repeated squaring, divisions modulo a prime through the modular inverse.",
    watch: [
      "Apply the modulus after every multiplication to keep numbers small; subtract and re-add the modulus to avoid negatives.",
      "Division modulo a prime p: multiply by pow(b, p - 2, p) (Fermat).",
      "A sieve up to n costs O(n log log n); factoring one number by trial division costs O(sqrt n).",
      "In C++ and Java, products of two numbers near 10^9 need a 64-bit type.",
    ],
    template: {
      lang: "python",
      code: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def sieve(n):                      # primes up to n, n >= 1
    is_p = [False, False] + [True] * (n - 1)
    for i in range(2, int(n ** 0.5) + 1):
        if is_p[i]:
            for j in range(i * i, n + 1, i):
                is_p[j] = False
    return [i for i, p in enumerate(is_p) if p]

def power(b, e, mod):
    r, b = 1, b % mod
    while e:
        if e & 1:
            r = r * b % mod
        b = b * b % mod
        e >>= 1
    return r`,
      complexity: "gcd O(log n); sieve O(n log log n); power O(log e)",
    },
    variations: [
      { id: "primes", label: "Primes and factors", when: "Count primes below n, factorise, divisor counts.", key: "Sieve of Eratosthenes; trial division up to sqrt(n).", examples: ["lc-204"] },
      { id: "fast-power", label: "Fast exponentiation", when: "x^n with a huge n, or modulo a number.", key: "Square the base, halve the exponent; multiply into the result when the bit is set.", examples: ["lc-50", "lc-372"] },
      { id: "modular-inverse", label: "Modular inverse and division", when: "Divide inside a modulus, nCr mod p.", key: "pow(b, p - 2, p) for prime p; or precompute factorials and inverse factorials.", examples: ["c-modular-inverse", "c-ncr-mod-p"] },
      { id: "gcd-lcm", label: "gcd and lcm tricks", when: "Make numbers equal, cycles meeting, simplest fractions.", key: "lcm(a, b) = a / gcd(a, b) * b; reduce a fraction by dividing by the gcd.", examples: ["lc-149"] },
    ],
    features: { input: ["numbers"], ask: ["count-ways", "optimal-value", "query"], size: ["huge"] },
    tags: ["Number Theory", "Math"],
    appPattern: "number-theory",
  },
  {
    id: "combinatorics",
    label: "Combinatorics, probability",
    when: "Count arrangements or selections (choose k of n, paths on a grid, stars and bars), or compute an expected value or a chance.",
    key: "Reduce to a standard count: n choose k, factorials, or a recurrence. Linearity of expectation lets you add up each item's chance without handling interactions.",
    watch: [
      "The counts get huge: use a modulus and precomputed factorials with inverse factorials.",
      "Order matters or not? Permutations versus combinations; with or without repetition.",
      "Unique paths in a grid is C(m + n - 2, m - 1).",
      "Expected value: write E = sum over items of (value * chance) before simulating anything.",
    ],
    template: {
      lang: "python",
      code: `MOD = 1_000_000_007

def build_factorials(n):
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = fact[i - 1] * i % MOD
    inv = [1] * (n + 1)
    inv[n] = pow(fact[n], MOD - 2, MOD)
    for i in range(n, 0, -1):
        inv[i - 1] = inv[i] * i % MOD
    return fact, inv

def ncr(n, r, fact, inv):
    if r < 0 or r > n:
        return 0
    return fact[n] * inv[r] % MOD * inv[n - r] % MOD`,
      complexity: "O(n) setup, O(1) per nCr",
    },
    variations: [
      { id: "binomial", label: "Choose k of n", when: "Number of subsets, grid paths, committee choices.", key: "C(n, k) with factorials and inverse factorials mod p.", examples: ["lc-62", "c-ncr-mod-p"] },
      { id: "weighted-random", label: "Probabilities from weights", when: "Pick an index with probability proportional to its weight.", key: "Prefix sums of the weights, a random number, and a binary search.", examples: ["lc-528"] },
      { id: "expected-value", label: "Expected value", when: "Average outcome of a random process.", key: "Linearity of expectation, or a DP over states with probabilities." },
    ],
    features: { input: ["numbers"], ask: ["count-ways", "query"], size: ["huge"] },
    tags: ["Combinatorics", "Math", "Probability and Statistics"],
    appPattern: "combinatorics",
  },
  {
    id: "geometry",
    label: "Geometry basics",
    when: "Points, lines, rectangles, polygons: overlap, area, collinear points, the side a point lies on, the closest pair.",
    key: "Replace pictures with exact arithmetic: the cross product tells which side a point lies on and gives areas; compare slopes as reduced fractions, not floats.",
    watch: [
      "Avoid floating point where you can: use integers, cross products and reduced fractions (dx, dy divided by their gcd).",
      "Two axis-aligned rectangles overlap iff they overlap on both the x and y ranges.",
      "Vertical lines have no slope; handle dx = 0 as its own key.",
      "Degenerate cases: duplicate points, zero-area shapes, touching edges.",
    ],
    template: {
      lang: "python",
      code: `def cross(o, a, b):                # > 0: b is left of o->a, 0: collinear, < 0: right
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

def rect_overlap(a, b):            # rectangles as (x1, y1, x2, y2), x1 < x2, y1 < y2
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]`,
      complexity: "O(1) per test",
    },
    variations: [
      { id: "collinear", label: "Points on one line", when: "Maximum number of points on a line.", key: "For each point count points by reduced slope (dx / g, dy / g).", examples: ["lc-149"] },
      { id: "rect-area", label: "Rectangle overlap and area", when: "Union area of two rectangles, do two rectangles overlap.", key: "Intersection width and height are clamped at 0; area union = A + B - intersection.", examples: ["lc-223"] },
      { id: "orientation", label: "Orientation test", when: "Is a polygon convex, does a segment cross another, convex hull.", key: "The sign of the cross product gives left, right or collinear." },
    ],
    features: { input: ["numbers", "array"], ask: ["exists", "optimal-value", "query"], size: ["small", "large"] },
    tags: ["Geometry", "Math"],
    appPattern: "geometry",
  },
  {
    id: "segment-tree",
    label: "Segment tree / Fenwick (BIT)",
    when: "Range queries (sum, min, max, count) mixed with point updates or range updates, so recomputing from scratch is too slow.",
    key: "Store partial answers over blocks in a tree so a query touches O(log n) blocks and an update fixes O(log n) of them. A Fenwick tree (BIT) does prefix sums with very little code; a segment tree handles min, max and range updates.",
    watch: [
      "Only static data? Prefix sums or a sparse table are simpler and faster.",
      "Fenwick needs an invertible operation (sum, count); for min and max use a segment tree.",
      "Range updates with range queries need lazy propagation.",
      "Large value ranges: compress the coordinates first, then use the ranks as indices.",
    ],
    template: {
      lang: "python",
      code: `class Fenwick:
    def __init__(self, n):
        self.t = [0] * (n + 1)

    def add(self, i, delta):       # i is 0-based
        i += 1
        while i < len(self.t):
            self.t[i] += delta
            i += i & -i

    def prefix(self, i):           # sum of a[0..i-1]
        s = 0
        while i > 0:
            s += self.t[i]
            i -= i & -i
        return s

    def range_sum(self, l, r):     # sum of a[l..r]
        return self.prefix(r + 1) - self.prefix(l)`,
      complexity: "O(log n) per update and query, O(n) space",
    },
    variations: [
      { id: "point-update-range-sum", label: "Point update, range sum", when: "Change one value, ask sums of ranges.", key: "Fenwick tree or an iterative segment tree.", examples: ["lc-307"] },
      { id: "count-smaller", label: "Count by value order", when: "Count smaller numbers to the right, count range sums in a band.", key: "Compress the values, then a Fenwick tree counts how many earlier values are below x.", examples: ["lc-327", "lc-315"] },
      { id: "range-max-update", label: "Range max with range assign", when: "Falling squares or skyline heights.", key: "A segment tree with lazy assignment, or compress coordinates and brute force when n is tiny.", examples: ["lc-699"] },
    ],
    features: { input: ["array"], ask: ["query"], shape: ["ranges"], updates: ["point-updates", "range-updates"], size: ["large"] },
    tags: ["Segment Tree", "Binary Indexed Tree", "Array", "Divide and Conquer"],
    appPattern: "segment-tree",
  },
  {
    id: "sparse-table",
    label: "Sparse table, sqrt decomposition",
    when: "Many range minimum or maximum queries on data that never changes, or range queries that are awkward for trees and n is moderate (sqrt blocks).",
    key: "Precompute the answer for every range whose length is a power of two. Any query is the combination of two overlapping power-of-two ranges: O(1) per query for idempotent operations (min, max, gcd).",
    watch: [
      "Overlap is safe only for idempotent operations like min and max; for sums use prefix sums.",
      "Memory is n log n.",
      "Updates require a rebuild; use a segment tree if there are updates.",
      "Sqrt decomposition: blocks of size about sqrt(n), partial blocks by hand, full blocks from precomputed values.",
    ],
    template: {
      lang: "python",
      code: `def build(a):
    t = [a[:]]                     # t[j][i] = min of a[i : i + 2^j]
    j = 1
    while (1 << j) <= len(a):
        prev, half = t[-1], 1 << (j - 1)
        t.append([min(prev[i], prev[i + half]) for i in range(len(a) - (1 << j) + 1)])
        j += 1
    return t

def query_min(t, l, r):            # inclusive range
    j = (r - l + 1).bit_length() - 1
    return min(t[j][l], t[j][r - (1 << j) + 1])`,
      complexity: "O(n log n) build, O(1) per query",
    },
    variations: [
      { id: "static-rmq", label: "Static range min or max", when: "Many queries, no updates.", key: "Two overlapping power-of-two blocks cover any range.", examples: ["c-sparse-table"] },
      { id: "sqrt-blocks", label: "Square-root decomposition", when: "Range queries with updates where a tree is overkill.", key: "Blocks of size sqrt(n); update one block, query = partial blocks + whole blocks.", examples: ["c-sqrt-decomposition"] },
    ],
    features: { input: ["array"], ask: ["query"], updates: ["static"], size: ["large"] },
    tags: ["Array", "Segment Tree", "Math"],
    appPattern: "sparse-table",
  },
  {
    id: "ordered-set",
    label: "Ordered set / multiset (TreeMap)",
    when: "You must find the nearest value above or below a given one in a changing collection (floor, ceiling), or check overlaps while inserting bookings.",
    key: "A sorted collection with O(log n) insert and nearest-neighbour search. Python has no built-in one: use a sorted list with bisect for small n, or sortedcontainers in practice; Java has TreeMap/TreeSet and C++ has std::set and std::map.",
    watch: [
      "A plain sorted list makes insert O(n) because of shifting; fine for n up to about 10^5 in practice.",
      "Use floor and ceiling to test only the two neighbours of a new value.",
      "A multiset needs counts per value; do not erase all copies by mistake.",
      "Bookings: new interval [s, e) conflicts only with the nearest start before and after it.",
    ],
    template: {
      lang: "python",
      code: `from bisect import bisect_left, bisect_right, insort

class OrderedSet:
    def __init__(self):
        self.a = []

    def add(self, x):
        insort(self.a, x)

    def ceiling(self, x):          # smallest item >= x
        i = bisect_left(self.a, x)
        return self.a[i] if i < len(self.a) else None

    def floor(self, x):            # largest item <= x
        i = bisect_right(self.a, x)
        return self.a[i - 1] if i else None`,
      complexity: "O(log n) search, O(n) insert here; a real TreeMap is O(log n) for both",
    },
    variations: [
      { id: "floor-ceiling", label: "Nearest value query", when: "Is there a value within t of x among the last k values.", key: "Keep the last k values in the set; check floor(x) and ceiling(x).", examples: ["lc-220"] },
      { id: "calendar", label: "Bookings without overlap", when: "My Calendar: accept an event only if it does not overlap earlier ones.", key: "Find the neighbours by start time; compare end and start.", examples: ["lc-729"] },
      { id: "overlap-count", label: "Count overlaps", when: "Double booking, maximum overlap so far.", key: "Store +1 at start and -1 at end in an ordered map; sweep the keys in order.", examples: ["lc-731", "lc-732"] },
    ],
    features: { input: ["array", "intervals", "stream"], ask: ["query", "exists"], updates: ["online"], size: ["large"] },
    tags: ["Ordered Set", "Binary Search", "Design", "Line Sweep"],
    appPattern: "ordered-set",
  },
  {
    id: "randomized",
    label: "Randomized and probabilistic",
    when: "A random pick with a rule (weighted, uniform, from a stream), a probabilistic membership test (Bloom filter), or spreading keys across servers (consistent hashing).",
    key: "Randomness replaces a hard exact step. Weighted picks use prefix sums and binary search; uniform picks from a stream use reservoir sampling; probabilistic structures accept a small error for lots of space.",
    watch: [
      "Check the exact probability: every item must have the right chance, not 'about right'.",
      "Weighted pick: random number in [1, total], find the first prefix >= it.",
      "A Bloom filter has false positives, never false negatives, and cannot delete.",
      "Tests with randomness need a fixed seed or a statistical check.",
    ],
    template: {
      lang: "python",
      code: `import random
from bisect import bisect_left

class WeightedPick:
    def __init__(self, w):
        self.pre, total = [], 0
        for x in w:
            total += x
            self.pre.append(total)
        self.total = total

    def pick(self):
        r = random.randint(1, self.total)      # inclusive on both ends
        return bisect_left(self.pre, r)        # first index whose prefix >= r`,
      complexity: "O(n) setup, O(log n) per pick",
    },
    variations: [
      { id: "weighted-index", label: "Weighted random index", when: "Pick index i with probability w[i] / sum.", key: "Prefix sums plus binary search.", examples: ["lc-528"] },
      { id: "uniform-from-stream", label: "Uniform from a stream", when: "Pick a random node from a list of unknown length.", key: "Reservoir sampling: replace the stored item with probability 1 / i.", examples: ["lc-382"] },
      { id: "bloom", label: "Bloom filter / consistent hashing", when: "Approximate set membership; spread keys so adding a server moves few keys.", key: "Several hash functions set bits in an array; keys hash onto a ring and belong to the next server.", examples: ["c-bloom-filter", "c-consistent-hashing"] },
    ],
    features: { input: ["stream", "array", "design"], ask: ["query"], updates: ["online"] },
    tags: ["Randomized", "Probability and Statistics", "Hash Function"],
    appPattern: "randomized",
  },
  {
    id: "design-ds",
    label: "Design problems",
    when: "The statement describes a class with operations (add, get, remove, follow, snapshot) and gives a time target for each.",
    key: "List the operations and their required costs, then pick one structure per cost: a hash map for lookup, a heap or sorted list for order, a list plus map for random access with deletion, versioned maps for history.",
    watch: [
      "Write down each operation and its target complexity before choosing structures.",
      "Keep two structures consistent on every update (map and list, map and linked list).",
      "Time-versioned data: store (time, value) pairs per key and binary search the time.",
      "Ask about edge cases: duplicates, missing keys, capacity zero, repeated removal.",
    ],
    template: {
      lang: "python",
      code: `import random

class RandomizedSet:
    def __init__(self):
        self.items, self.pos = [], {}          # list for random pick, map for lookup

    def insert(self, x):
        if x in self.pos:
            return False
        self.pos[x] = len(self.items)
        self.items.append(x)
        return True

    def remove(self, x):
        if x not in self.pos:
            return False
        i, last = self.pos[x], self.items[-1]
        self.items[i] = last                   # move the last item into the hole
        self.pos[last] = i
        self.items.pop()
        del self.pos[x]
        return True

    def get_random(self):
        return random.choice(self.items)`,
      complexity: "O(1) average per operation",
    },
    variations: [
      { id: "map-plus-list", label: "Map plus array for O(1) random delete", when: "Insert, delete and get-random all in O(1).", key: "Swap the deleted item with the last array item and fix its position in the map.", examples: ["lc-380"] },
      { id: "versioned", label: "Time-based or snapshot storage", when: "Get the value of a key at a time or snapshot id.", key: "Per key keep a list of (time, value); binary search the largest time <= query.", examples: ["lc-981", "lc-1146"] },
      { id: "feed-or-counter", label: "Feed, counter, merge of sources", when: "News feed of the latest k posts, hit counter in the last 5 minutes.", key: "Per user lists plus a heap merge; a queue or buckets for the sliding time window.", examples: ["lc-355", "lc-362"] },
    ],
    features: { input: ["design"], ask: ["query"], updates: ["online"], size: ["huge"] },
    tags: ["Design", "Hash Table", "Data Stream", "Queue"],
    appPattern: "design-ds",
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Patterns, part 6: extra nodes so every LeetCode topic tag has a home (no DSA_GROUPS entry of their own)
// ---------------------------------------------------------------------------------------------------------------

const EXTRA_PATTERNS: ThinkPattern[] = [
  {
    id: "simulation",
    label: "Simulation",
    when: "The statement is a set of rules and you just have to apply them step by step: robots, games, elevators, a bank, a process over time.",
    key: "Do exactly what the rules say, but store the state in the simplest possible way and check the size: if the number of steps is huge, look for a cycle or a formula instead of looping.",
    watch: [
      "Check how many steps the simulation needs; 10^9 steps means find a cycle or a closed form.",
      "Use direction arrays and modulo for turning instead of long if chains.",
      "Mutating data while reading it is a classic bug; copy or write to a new structure.",
      "Re-read the rules for ties and the order of events at the same time.",
    ],
    template: {
      lang: "python",
      code: `def walk(commands):                # R: turn right, L: turn left, F: step forward
    dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    x = y = d = 0
    for c in commands:
        if c == "R":
            d = (d + 1) % 4
        elif c == "L":
            d = (d - 1) % 4
        else:
            x, y = x + dirs[d][0], y + dirs[d][1]
    return x, y`,
      complexity: "O(steps) time, O(state) space",
    },
    variations: [
      { id: "step-by-step", label: "Apply the rules directly", when: "Small number of steps, clear rules.", key: "Write the state, the update rule and the stop condition; loop.", examples: ["lc-54"] },
      { id: "find-cycle", label: "Huge number of steps", when: "Run the process 10^9 times or for many days.", key: "The state repeats after some steps; find the cycle, then jump with a modulo." },
    ],
    features: { input: ["array", "grid", "string"], ask: ["simulate"], size: ["small"] },
    tags: ["Simulation"],
  },
  {
    id: "enumeration",
    label: "Brute-force enumeration",
    when: "Every candidate can be listed and checked, and the limits are small enough that listing them all is fast.",
    key: "Write the brute force on purpose, count how many candidates there are, and trim only what you must: fix some choices, loop over the rest, test each candidate in O(1).",
    watch: [
      "Count the candidates first: n^2 for pairs, n^3 for triples, 2^n for subsets.",
      "Loop over a smaller range by fixing one variable and solving for the other.",
      "Early exit and symmetry (a < b) often halve or better the work.",
      "If the brute force passes the limits, say so and stop; clever is not required.",
    ],
    variations: [
      { id: "loop-all", label: "Try every pair or triple", when: "n up to a few thousand and a simple test.", key: "Nested loops with a quick check." },
      { id: "fix-and-solve", label: "Fix one, solve the other", when: "Pairs (a, b) with a rule linking them.", key: "Loop a, compute what b must be, check that it exists." },
    ],
    features: { ask: ["exists", "count-ways", "optimal-value"], size: ["tiny", "small"] },
    tags: ["Enumeration"],
  },
  {
    id: "math-basics",
    label: "Math and digit manipulation",
    when: "Reverse or compare digits, convert bases, check palindromic numbers, simple formulas, powers, averages, Roman numerals, arithmetic without the usual operators.",
    key: "Peel digits with % 10 and // 10, build numbers with * 10 + digit, and look for a closed formula before you loop. Check overflow rules from the statement.",
    watch: [
      "Overflow: the statement may fix a 32-bit range; Python does not overflow, so check by hand.",
      "Negative numbers and division: Python floors, C++ and Java truncate toward zero.",
      "Work with integers where you can; floating point loses digits beyond about 15.",
      "Check small cases (0, 1, 9, 10, negative) against your formula.",
    ],
    template: {
      lang: "python",
      code: `def reverse_digits(x):             # x >= 0
    r = 0
    while x:
        r = r * 10 + x % 10        # take the last digit and append it
        x //= 10
    return r`,
      complexity: "O(number of digits) time, O(1) space",
    },
    variations: [
      { id: "digits", label: "Digit loops", when: "Reverse, palindrome number, add digits, happy numbers.", key: "% 10 and // 10 to walk the digits." },
      { id: "formula", label: "Closed formula", when: "Sum of a series, count of items by arithmetic.", key: "Derive the formula on paper, then test small values." },
    ],
    features: { input: ["numbers"], ask: ["transform", "query"], size: ["huge"] },
    tags: ["Math"],
  },
  {
    id: "linked-list-ops",
    label: "Linked list operations",
    when: "Plain pointer work on a linked list: merge two sorted lists, add numbers digit by digit, remove nodes, partition, copy with random pointers, flatten.",
    key: "Use a dummy head so the first node is not special, keep a tail pointer for building the result, and change one pointer at a time while saving what you would lose.",
    watch: [
      "A dummy node removes the 'head changes' special case.",
      "Draw the pointers before and after every change.",
      "Do not lose the rest of the list: save next first.",
      "Check an empty list and a single-node list.",
    ],
    template: {
      lang: "python",
      code: `def merge_two(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b             # attach whichever list still has nodes
    return dummy.next`,
      complexity: "O(n + m) time, O(1) extra space",
    },
    variations: [
      { id: "merge-lists", label: "Merge sorted lists", when: "Two or k sorted lists into one.", key: "Dummy head and a tail; for k lists use a heap.", examples: ["lc-23"] },
      { id: "dummy-head", label: "Delete or insert nodes", when: "Remove nodes with a value, partition around a value.", key: "Dummy head; walk with prev and cur.", examples: ["slug:remove-linked-list-elements"] },
      { id: "digit-lists", label: "Add numbers stored as lists", when: "Digits are in nodes, add two numbers.", key: "Walk both lists with a carry; append nodes to a result list.", examples: ["slug:add-two-numbers"] },
    ],
    features: { input: ["linked-list"], ask: ["transform"], size: ["large"] },
    tags: ["Linked List", "Doubly-Linked List"],
  },
  {
    id: "iterator-stream",
    label: "Iterator and data stream design",
    when: "Implement next() and has_next() over a structure (tree, nested lists, two lists), or maintain a statistic over numbers that arrive one at a time.",
    key: "Keep just enough state to produce the next item lazily (a stack of the path so far), or update a summary (counts, heaps, a running sum) as each number arrives so queries are cheap.",
    watch: [
      "next() and has_next() must agree; has_next can need to look ahead (skip empty inner lists).",
      "Do not flatten everything up front if the statement asks for lazy behaviour or small memory.",
      "Data stream: decide which queries must be O(1) and pay for them at insert time.",
      "Never assume the whole input fits in memory unless the statement says so.",
    ],
    template: {
      lang: "python",
      code: `class BSTIterator:
    def __init__(self, root):
        self.st = []
        self._push_left(root)

    def _push_left(self, node):
        while node:
            self.st.append(node)
            node = node.left

    def next(self):
        node = self.st.pop()
        self._push_left(node.right)
        return node.val

    def has_next(self):
        return bool(self.st)`,
      complexity: "O(1) amortised per call, O(h) space",
    },
    variations: [
      { id: "tree-iterator", label: "Iterator over a tree", when: "In-order next() on a BST.", key: "Stack of the left spine.", examples: ["lc-173"] },
      { id: "nested-iterator", label: "Iterator over nested lists", when: "Flatten nested lists lazily.", key: "A stack of iterators; has_next unwraps until an integer is ready.", examples: ["slug:flatten-nested-list-iterator"] },
      { id: "stream-summary", label: "Statistic over a stream", when: "Median, k-th largest, moving average as numbers arrive.", key: "Heaps or a fixed-size queue updated on every add.", examples: ["lc-295", "slug:kth-largest-element-in-a-stream"] },
    ],
    features: { input: ["design", "stream", "tree"], ask: ["query"], updates: ["online"] },
    tags: ["Iterator", "Data Stream", "Design"],
  },
  {
    id: "game-theory",
    label: "Game theory",
    when: "Two players take turns with perfect play and you must say who wins or what score the first player can guarantee.",
    key: "A position is winning if some move leads to a losing position for the opponent. Memoise positions (or find the pattern, parity or Nim-sum) and the answer is the value at the start.",
    watch: [
      "Define the value from the point of view of the player to move, and flip the sign for the opponent.",
      "Small state: memoise minimax. Large state: look for a pattern in small cases (multiples of k, parity).",
      "Nim-like games: XOR of pile sizes is zero means the player to move loses.",
      "Score games on a line often use interval DP with 'my best minus opponent's best'.",
    ],
    template: {
      lang: "python",
      code: `from functools import lru_cache

@lru_cache(None)
def wins(stones):                  # take 1, 2 or 3 stones; taking the last stone wins
    return any(not wins(stones - t) for t in (1, 2, 3) if t <= stones)`,
      complexity: "O(states * moves) time",
    },
    variations: [
      { id: "minimax-memo", label: "Memoised minimax", when: "Small position space, who wins.", key: "wins(state) = any move to a state where the opponent loses." },
      { id: "nim", label: "Nim and XOR", when: "Piles of stones, take any number from one pile.", key: "XOR of pile sizes zero: the player to move loses." },
      { id: "score-difference", label: "Best score difference on a line", when: "Both players pick from the ends to maximise their own total.", key: "dp[l][r] = best (mine minus opponent's) on the range; interval DP.", examples: ["slug:stone-game"] },
    ],
    features: { ask: ["exists", "optimal-value"], size: ["tiny", "small"], overlap: ["yes"] },
    tags: ["Game Theory", "Dynamic Programming", "Math"],
  },
  {
    id: "brainteaser",
    label: "Brainteaser",
    when: "The statement looks like a riddle, the constraints are tiny or huge with no obvious structure, and the answer often has a one-line rule (parity, modulo, symmetry).",
    key: "Solve the problem for n = 1, 2, 3, 4 by hand, write the results in a row, and look for the pattern; then check the rule against a brute force before trusting it.",
    watch: [
      "Do not guess a formula from two data points; brute-force more small cases.",
      "Parity, modulo and symmetry cause most one-line answers.",
      "Prove or at least test the rule on random small inputs.",
      "If you cannot find a rule in a few minutes, fall back to a normal pattern (DP, simulation).",
    ],
    variations: [
      { id: "small-cases", label: "Small cases and a pattern", when: "Nim-like, winning-or-losing with a rule on n.", key: "Compute small n by hand or by a script, then spot the pattern.", examples: ["slug:nim-game"] },
      { id: "invariant", label: "Invariant or parity", when: "Operations flip things, and you need the final state or the minimum operations.", key: "Find a quantity that never changes (or changes by a fixed amount) and reason with it.", examples: ["slug:bulb-switcher"] },
    ],
    features: { ask: ["exists", "optimal-value"], size: ["huge"] },
    tags: ["Brainteaser", "Math"],
  },
  {
    id: "interactive",
    label: "Interactive problems",
    when: "You cannot see the data; you can only call a provided function (a guess, a query) a limited number of times.",
    key: "Make every query cut the possibilities as much as possible: binary search when answers are ordered, or ask questions whose answers split the remaining candidates in half.",
    watch: [
      "Count the allowed queries; log2(n) calls usually means binary search.",
      "Do not call the API more often than needed; cache answers.",
      "Read the exact meaning of each response (higher, lower, equal; true or false).",
      "Test the boundary values of the range.",
    ],
    template: {
      lang: "python",
      code: `def first_bad(n, is_bad):          # is_bad(i) is the judge's answer, False... then True...
    lo, hi = 1, n
    while lo < hi:
        mid = (lo + hi) // 2
        if is_bad(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo                      # about log2(n) calls`,
      complexity: "O(log n) calls",
    },
    variations: [
      { id: "guess-number", label: "Guess with higher / lower feedback", when: "Find a hidden number.", key: "Binary search using the feedback.", examples: ["slug:guess-number-higher-or-lower"] },
      { id: "elimination", label: "Eliminate by comparison", when: "Find a celebrity or a special node with few queries.", key: "Each query removes one candidate; after n - 1 queries one remains, then verify it.", examples: ["slug:find-the-celebrity"] },
    ],
    features: { ask: ["query"], size: ["huge"], updates: ["online"] },
    tags: ["Interactive", "Binary Search"],
  },
  {
    id: "rolling-hash",
    label: "Rolling hash",
    when: "Compare many substrings quickly, find repeated substrings of a given length, match a pattern by hashing, or compare two ranges in O(1).",
    key: "Give every window a number built from its characters (a polynomial hash). When the window slides one step, update the hash in O(1) by removing the left character and adding the new right one.",
    watch: [
      "Use a large modulus (2^61 - 1) or two moduli; with a small one collisions happen.",
      "On a hash match, compare the strings if a wrong answer is not acceptable (Las Vegas) or accept the tiny risk.",
      "Precompute powers of the base to remove the leftmost character.",
      "Binary search on the length plus a hash set finds the longest repeated substring.",
    ],
    template: {
      lang: "python",
      code: `def find_rk(text, pat):
    B, M = 257, (1 << 61) - 1
    m = len(pat)
    if m == 0 or m > len(text):
        return -1
    hp = h = 0
    for i in range(m):
        hp = (hp * B + ord(pat[i])) % M
        h = (h * B + ord(text[i])) % M
    top = pow(B, m - 1, M)         # weight of the character that leaves the window
    for i in range(len(text) - m + 1):
        if h == hp and text[i:i + m] == pat:
            return i
        if i + m < len(text):
            h = ((h - ord(text[i]) * top) * B + ord(text[i + m])) % M
    return -1`,
      complexity: "O(n + m) expected time, O(1) space",
    },
    variations: [
      { id: "substring-search", label: "Rabin-Karp search", when: "Find a pattern in a text.", key: "Compare window hashes with the pattern hash; verify on a match.", examples: ["c-rabin-karp"] },
      { id: "repeated-substring", label: "Longest repeated substring", when: "Longest substring that appears twice.", key: "Binary search the length; hash all windows of that length into a set.", examples: ["slug:longest-duplicate-substring"] },
      { id: "range-compare", label: "Compare two ranges in O(1)", when: "Many queries 'is s[a..b] equal to s[c..d]'.", key: "Prefix hashes give any range hash by subtraction and a power." },
    ],
    features: { input: ["string"], ask: ["exists", "query"], size: ["large", "huge"] },
    tags: ["Rolling Hash", "Hash Function", "String Matching", "String"],
  },
  {
    id: "suffix-array",
    label: "Suffix array / suffix structures",
    when: "Many questions about all suffixes of a string: the number of distinct substrings, the longest repeated substring, the longest common substring of two strings.",
    key: "Sort all suffixes. Neighbours in sorted order share the longest prefixes, so adjacent common-prefix lengths (the LCP array) answer most substring questions.",
    watch: [
      "Building by sorting suffixes directly is O(n^2 log n); the doubling method is O(n log^2 n).",
      "The LCP array (Kasai) is built in O(n) from the suffix array.",
      "Distinct substrings = n(n + 1) / 2 minus the sum of the LCP values.",
      "Rarely needed in interviews; a rolling hash plus binary search often solves the same task.",
    ],
    template: {
      lang: "python",
      code: `def suffix_array(s):               # simple version, fine for short strings
    return sorted(range(len(s)), key=lambda i: s[i:])

def lcp_array(s, sa):              # Kasai: lcp[i] = common prefix of sa[i] and sa[i + 1]
    n = len(s)
    rank = [0] * n
    for i, p in enumerate(sa):
        rank[p] = i
    lcp, k = [0] * max(n - 1, 0), 0
    for i in range(n):
        if rank[i] == n - 1:
            k = 0
            continue
        j = sa[rank[i] + 1]
        while i + k < n and j + k < n and s[i + k] == s[j + k]:
            k += 1
        lcp[rank[i]] = k
        if k:
            k -= 1
    return lcp`,
      complexity: "Naive build O(n^2 log n); Kasai LCP O(n)",
    },
    variations: [
      { id: "distinct-substrings", label: "Count distinct substrings", when: "How many different substrings does a string have.", key: "n(n + 1) / 2 minus the sum of the LCP array." },
      { id: "longest-repeat", label: "Longest repeated substring", when: "Longest substring that occurs at least twice.", key: "The maximum value in the LCP array.", examples: ["slug:longest-duplicate-substring"] },
    ],
    features: { input: ["string"], ask: ["query", "count-ways", "optimal-value"], size: ["large"] },
    tags: ["Suffix Array", "String"],
  },
  {
    id: "line-sweep",
    label: "Line sweep",
    when: "Events at positions on a line (start and end of intervals, building edges, points): the maximum overlap, the skyline, the covered length, the area of a union.",
    key: "Turn each object into events at coordinates, sort the events, and sweep from left to right while a counter or an ordered structure keeps the current state.",
    watch: [
      "Decide the order of events at the same coordinate (end before start for half-open intervals).",
      "The counter holds what is active right now; read the answer when it changes.",
      "Skyline problems keep active heights in a heap or ordered map with lazy deletion.",
      "Compress coordinates when they are huge but few.",
    ],
    template: {
      lang: "python",
      code: `def max_overlap(intervals):        # half-open intervals [start, end)
    events = []
    for s, e in intervals:
        events.append((s, 1))
        events.append((e, -1))
    events.sort()                  # at the same time, -1 sorts before +1
    cur = best = 0
    for _, d in events:
        cur += d
        best = max(best, cur)
    return best`,
      complexity: "O(n log n) time, O(n) space",
    },
    variations: [
      { id: "max-overlap", label: "Maximum overlap", when: "Meeting rooms, car pooling, most booked time.", key: "+1 at start, -1 at end; track the running maximum.", examples: ["lc-253", "lc-1094"] },
      { id: "skyline", label: "Skyline", when: "Outline of overlapping buildings.", key: "Sweep the edges; keep active heights in a max-heap with lazy deletion.", examples: ["slug:the-skyline-problem"] },
      { id: "union-length", label: "Union length or area", when: "Total covered length of intervals, or area of rectangles.", key: "Sweep and keep a counter of how many intervals cover the current stretch.", examples: ["lc-759"] },
    ],
    features: { input: ["intervals", "array"], ask: ["optimal-value", "query"], shape: ["ranges"], sorted: ["can-sort"] },
    tags: ["Line Sweep", "Sorting", "Heap (Priority Queue)", "Ordered Set"],
  },
  {
    id: "sorting-family",
    label: "Sorting and distribution sorts",
    when: "Sorting is the real work or the first step: order items, find the median or ranks, count values in a small range, sort by buckets or by digits.",
    key: "Comparison sorting costs O(n log n). If the values are in a small range (or the keys have few digits), counting, bucket or radix sort get O(n): count each value, spread items over buckets, or sort digit by digit stably.",
    watch: [
      "Counting sort needs a small range of integer keys; its time is O(n + range).",
      "Bucket sort works when the data is spread evenly; for 'top k frequent' bucket by frequency.",
      "Radix sort sorts digit by digit using a stable sort for each digit.",
      "Is the sort stable? Equal keys may need to keep their original order.",
    ],
    template: {
      lang: "python",
      code: `def counting_sort(a, max_val):     # values are integers in 0..max_val
    cnt = [0] * (max_val + 1)
    for x in a:
        cnt[x] += 1
    out = []
    for v, c in enumerate(cnt):
        out.extend([v] * c)
    return out`,
      complexity: "O(n + max_val) time, O(max_val) space",
    },
    variations: [
      { id: "counting-sort", label: "Counting sort", when: "Small integer range (ages, letters, digits).", key: "Count each value, then rebuild the array from the counts." },
      { id: "bucket-by-frequency", label: "Bucket sort by frequency", when: "Top k frequent items in O(n).", key: "Bucket i holds the items that occur i times; read from the highest bucket down.", examples: ["lc-347"] },
      { id: "radix", label: "Radix sort", when: "Many integers or fixed-length strings, maximum gap.", key: "Stable sort by the least significant digit, then the next, up to the most significant." },
      { id: "sort-first", label: "Sort first, then scan", when: "Duplicates, closest pairs, merging intervals.", key: "After sorting, the relation you need becomes adjacent items.", examples: ["lc-56"] },
    ],
    features: { input: ["array"], ask: ["order", "transform"], sorted: ["can-sort"], size: ["large"] },
    tags: ["Sorting", "Counting Sort", "Bucket Sort", "Radix Sort", "Merge Sort", "Counting"],
  },
  {
    id: "divide-conquer",
    label: "Divide and conquer",
    when: "The problem on a range can be answered by splitting it in two, solving each half and combining the answers, where the combine step is cheaper than solving from scratch.",
    key: "Define what a half returns so that two halves can be merged in O(1) or O(n). Sorting, counting pairs, maximum subarray, and building trees from the middle all fit.",
    watch: [
      "Define the return value first (for max subarray: total, best prefix, best suffix, best).",
      "The recurrence T(n) = 2T(n/2) + combine decides the total cost: O(n) combine gives O(n log n).",
      "Cross-the-middle cases are where the work happens.",
      "If halves overlap in work, you may really want DP.",
    ],
    template: {
      lang: "python",
      code: `def max_subarray(a, lo=0, hi=None):
    if hi is None:
        hi = len(a)
    if hi - lo == 1:
        return a[lo], a[lo], a[lo], a[lo]          # total, best prefix, best suffix, best
    mid = (lo + hi) // 2
    lt, lp, ls, lb = max_subarray(a, lo, mid)
    rt, rp, rs, rb = max_subarray(a, mid, hi)
    return (lt + rt, max(lp, lt + rp), max(rs, rt + ls), max(lb, rb, ls + rp))`,
      complexity: "O(n) time here, O(log n) recursion depth",
    },
    variations: [
      { id: "split-combine", label: "Split, solve, combine", when: "Max subarray, closest pair, count of pairs across halves.", key: "A half returns a small summary; the combine step looks across the middle." },
      { id: "merge-count", label: "Merge-based counting", when: "Inversions, reverse pairs, range-sum counts.", key: "Count cross pairs while merging sorted halves.", examples: ["lc-315", "lc-493", "lc-327"] },
      { id: "balanced-build", label: "Build from the middle", when: "Balanced BST from a sorted array.", key: "Middle becomes the root; recurse on each half.", examples: ["slug:convert-sorted-array-to-binary-search-tree"] },
    ],
    features: { input: ["array"], ask: ["optimal-value", "count-ways", "transform"], shape: ["ranges"], size: ["large"] },
    tags: ["Divide and Conquer", "Merge Sort", "Recursion"],
  },
  {
    id: "recursion",
    label: "Recursion and memoization",
    when: "A problem that is naturally defined in terms of smaller versions of itself, or a brute-force recursion that recomputes the same inputs.",
    key: "Write the base case, the smaller call and how to combine. If the same arguments appear again and again, cache the results by argument (memoization): this is top-down DP.",
    watch: [
      "Always write the base case first and check that every call gets smaller.",
      "Make the cache key the full set of arguments that affect the answer.",
      "Python's default recursion depth is about 1000; raise it or switch to a loop for deep recursion.",
      "Do not memoize when the arguments are mutable lists; convert to tuples.",
    ],
    template: {
      lang: "python",
      code: `from functools import lru_cache

def count_paths(rows, cols):
    @lru_cache(None)
    def go(r, c):
        if r == 0 or c == 0:
            return 1               # base case: one straight path
        return go(r - 1, c) + go(r, c - 1)
    return go(rows - 1, cols - 1)`,
      complexity: "O(number of distinct states) time and space",
    },
    variations: [
      { id: "plain-recursion", label: "Smaller problem of the same kind", when: "Power, tree walks, divide into smaller instances.", key: "Base case plus a call on a strictly smaller input.", examples: ["lc-50"] },
      { id: "memoize", label: "Add a cache", when: "Overlapping subproblems.", key: "Cache the result by arguments with lru_cache or a dict; the recursion becomes top-down DP.", examples: ["lc-139"] },
    ],
    features: { ask: ["optimal-value", "count-ways", "all-solutions"], overlap: ["yes", "no"] },
    tags: ["Recursion", "Memoization"],
  },
  {
    id: "reservoir-sampling",
    label: "Reservoir and rejection sampling",
    when: "Choose a random item (or k items) fairly from data you cannot index or cannot hold in memory, or build a fair random generator from a different one.",
    key: "Reservoir: keep the first k items; for item number i, replace a random kept item with probability k / i. Rejection: generate a bigger uniform range, reject the values that do not fit evenly, and try again.",
    watch: [
      "Probabilities must be exact for each item; derive them on paper.",
      "Rejection sampling needs a range that divides evenly (use 1..40 from 1..49 to get 1..10).",
      "The expected number of retries is small, but there is no fixed upper bound.",
      "randint is inclusive on both ends in Python; many other languages are not.",
    ],
    template: {
      lang: "python",
      code: `import random

def reservoir_sample(stream, k):
    sample = []
    for i, x in enumerate(stream):
        if i < k:
            sample.append(x)
        else:
            j = random.randint(0, i)       # inclusive: 0..i
            if j < k:
                sample[j] = x              # keep x with probability k / (i + 1)
    return sample`,
      complexity: "O(n) time, O(k) space",
    },
    variations: [
      { id: "reservoir", label: "Reservoir sampling", when: "Random node from a linked list or stream of unknown length.", key: "Replace the current choice with probability 1 / i.", examples: ["lc-382"] },
      { id: "rejection", label: "Rejection sampling", when: "Make rand10 from rand7.", key: "Combine calls into a bigger uniform range, discard the extra values, retry.", examples: ["slug:implement-rand10-using-rand7"] },
    ],
    features: { input: ["stream"], ask: ["query"], updates: ["online"] },
    tags: ["Reservoir Sampling", "Rejection Sampling", "Randomized", "Probability and Statistics"],
  },
  {
    id: "probability",
    label: "Probability and statistics",
    when: "A chance, an expected value, or a statistic of data (mean, median, mode) is the answer.",
    key: "Write the sample space. For a chance, count good outcomes over all outcomes, or build it step by step with a DP over states. For an expected value, add each part's value times its chance (linearity of expectation).",
    watch: [
      "Probabilities of independent events multiply; of exclusive events add.",
      "State DP: dp[step][state] holds the chance of being there.",
      "Floating point: answers are accepted within an error; avoid subtracting nearly equal numbers.",
      "Linearity of expectation works even when the events are not independent.",
    ],
    variations: [
      { id: "state-dp", label: "Chance after k steps", when: "A knight or a walker moves randomly for k steps; chance it stays on the board.", key: "dp over steps and positions, each move shares the probability equally.", examples: ["slug:knight-probability-in-chessboard"] },
      { id: "linearity", label: "Expected value by linearity", when: "Expected number of something over many items.", key: "Sum of each item's own chance; no need to track interactions." },
      { id: "statistics", label: "Statistics of data", when: "Mean, median, mode of a big sample.", key: "Counting arrays give median and mode without sorting all items.", examples: ["slug:statistics-from-a-large-sample"] },
    ],
    features: { ask: ["query", "optimal-value"], overlap: ["yes"] },
    tags: ["Probability and Statistics", "Math"],
  },
  {
    id: "not-algorithm",
    label: "Not an algorithm problem: SQL, shell, threads",
    when: "The task says 'write a SQL query', 'write a bash script', or 'make these threads run in this order'. There is no data structure to pick.",
    key: "Different skill, different checklist. SQL: joins, GROUP BY with HAVING, window functions, NULL handling. Shell: grep, awk, sed, sort, uniq, wc, pipes. Concurrency: locks, semaphores, condition variables, barriers.",
    watch: [
      "SQL: NULL is not equal to anything (use IS NULL), and a LEFT JOIN keeps rows with no match.",
      "SQL: WHERE filters rows before grouping, HAVING filters groups after.",
      "Shell: quote variables, and remember sort | uniq -c counts only adjacent duplicates after sorting.",
      "Concurrency: say what is shared, what protects it, and how a thread waits without busy looping.",
    ],
    variations: [
      { id: "sql", label: "Database (SQL)", when: "The statement gives tables and asks for a query.", key: "Name the output columns, pick the join, group, then filter; window functions rank within groups.", examples: ["slug:second-highest-salary"] },
      { id: "shell", label: "Shell scripting", when: "Process a text file with command-line tools.", key: "Build a pipeline: filter (grep), reshape (awk, sed, cut), sort and count (sort, uniq).", examples: ["slug:tenth-line"] },
      { id: "concurrency", label: "Concurrency", when: "Threads must run in a given order, share a resource safely or alternate.", key: "A semaphore or condition variable per hand-off; each thread waits for its turn and signals the next.", examples: ["slug:print-in-order"] },
    ],
    features: { ask: ["query", "transform"] },
    tags: ["Database", "Shell", "Concurrency"],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// The pattern table
// ---------------------------------------------------------------------------------------------------------------

const ALL_THINK_PATTERNS: ThinkPattern[] = [
  ...ARRAY_PATTERNS,
  ...SEARCH_LIST_PATTERNS,
  ...TREE_PATTERNS,
  ...GRAPH_PATTERNS,
  ...SEARCH_SPACE_PATTERNS,
  ...DP_PATTERNS,
  ...MATH_ADVANCED_PATTERNS,
  ...EXTRA_PATTERNS,
];

export const THINK_PATTERNS: Record<string, ThinkPattern> = Object.fromEntries(ALL_THINK_PATTERNS.map((p) => [p.id, p]));

// ---------------------------------------------------------------------------------------------------------------
// Signals: step 2 of the thinking map. "What does the problem give you / ask for?" -> candidate patterns
// ---------------------------------------------------------------------------------------------------------------

export const THINK_SIGNALS: ThinkSignal[] = [
  {
    id: "contiguous",
    label: "Best, longest, shortest or counted contiguous part",
    when: "The answer is a subarray or substring that satisfies a rule: longest without repeats, smallest with a sum, count with sum k, best total.",
    patterns: ["sliding-window", "prefix-sums", "kadane", "monotonic-deque"],
  },
  {
    id: "sorted-search",
    label: "Sorted or sortable data, a target, a position, or an order",
    when: "Pairs or triples with a target, a position in sorted data, a minimum feasible value, or the order of items matters.",
    patterns: ["two-pointers", "bs-index", "bs-answer", "custom-sort", "sorting-family"],
  },
  {
    id: "counts-groups",
    label: "Seen before, counts, groups, missing or duplicate numbers",
    when: "Duplicates, frequency, anagrams, pairs by value, or values in 1..n with one missing or repeated.",
    patterns: ["hash-map", "cyclic-sort"],
  },
  {
    id: "strings",
    label: "Strings: find, match, prefixes, dictionaries",
    when: "Search a pattern in text, many words and prefixes, repeated substrings, comparing substrings fast.",
    patterns: ["string-matching", "trie", "rolling-hash", "suffix-array", "stack-parsing"],
  },
  {
    id: "nearest-beats",
    label: "Nesting, or the nearest greater or smaller item",
    when: "Next greater element, spans, histograms, brackets, expressions with parentheses, decode nested strings.",
    patterns: ["monotonic-stack", "monotonic-deque", "stack-parsing"],
  },
  {
    id: "ranking",
    label: "Top k, k-th, median, rank, merge k sources",
    when: "Order statistics, a running median, k best items, counting how many items are smaller, merging sorted lists.",
    patterns: ["heap-top-k", "two-heaps", "quickselect", "merge-sort-count", "ordered-set"],
  },
  {
    id: "intervals-time",
    label: "Intervals, meetings, bookings, events on a line",
    when: "Items with a start and an end, overlaps, free time, the most that fit, how many at once.",
    patterns: ["intervals", "line-sweep", "ordered-set"],
  },
  {
    id: "tree",
    label: "A tree: paths, depths, ancestors, levels",
    when: "The input is a tree, or you build one; the question is about subtrees, levels, paths, ancestors or order.",
    patterns: ["tree-dfs", "tree-bfs", "tree-construct", "bst", "tree-dp", "binary-lifting", "trie"],
  },
  {
    id: "graph",
    label: "A graph, grid or dependencies (explicit or hidden)",
    when: "Nodes and edges, a grid with moves, prerequisites, connectivity, shortest paths, spanning, cycles, puzzle states.",
    patterns: [
      "graph-bfs", "graph-dfs", "topo-sort", "union-find", "dijkstra", "bellman-ford", "floyd-warshall", "mst",
      "bipartite", "tarjan", "eulerian", "state-space-bfs",
    ],
  },
  {
    id: "generate",
    label: "Generate or check every option",
    when: "List all subsets, orderings or placements, or the limits are small enough to try everything cleverly.",
    patterns: ["subsets", "constraint-backtracking", "meet-in-middle", "bitmask-dp-subsets", "enumeration", "recursion", "divide-conquer"],
  },
  {
    id: "optimise",
    label: "Best value or count of ways: greedy or DP",
    when: "Maximum, minimum, number of ways, or true/false over choices. Try a greedy first; if a counterexample exists, the same subproblem repeats and DP is the answer.",
    patterns: [
      "greedy-proof", "exchange-argument", "dp-1d", "knapsack", "lis", "grid-dp", "two-string-dp", "interval-dp",
      "state-machine-dp", "digit-dp", "bitmask-dp-subsets", "tree-dp", "dp-optimizations",
    ],
  },
  {
    id: "numbers-bits",
    label: "Numbers, formulas, bits, geometry, probability",
    when: "Huge values, divisibility, modulo, counting formulas, bits and XOR, points and shapes, chances.",
    patterns: ["number-theory", "combinatorics", "probability", "math-basics", "geometry", "bit-tricks"],
  },
  {
    id: "structures",
    label: "Design a structure or answer many queries",
    when: "A class with operations and time targets, many range queries with updates, a cache, an iterator, random picks.",
    patterns: [
      "design-ds", "lru-lfu", "segment-tree", "sparse-table", "prefix-sums", "iterator-stream", "randomized",
      "reservoir-sampling", "ordered-set",
    ],
  },
  {
    id: "linked-list",
    label: "A linked list",
    when: "Nodes with next pointers: cycles, the middle, reversal, merging, reordering, caches built on lists.",
    patterns: ["fast-slow", "list-reversal", "linked-list-ops", "lru-lfu"],
  },
  {
    id: "puzzle-simulate",
    label: "Follow the rules, or a puzzle or game",
    when: "Apply a process step by step, walk a matrix in a fixed shape, a two-player game, a riddle, or an interactive judge.",
    patterns: ["simulation", "matrix", "enumeration", "game-theory", "brainteaser", "interactive"],
  },
  {
    id: "not-algorithm",
    label: "Not an algorithm problem: SQL, shell, threads",
    when: "The task says write a SQL query, a shell command, or coordinate threads. Different skills apply.",
    patterns: ["not-algorithm"],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// How to read a problem
// ---------------------------------------------------------------------------------------------------------------

export interface ReadStep {
  id: string;
  title: string;
  body: string;
  ask: string[];
}

export const READING_ROUTINE: ReadStep[] = [
  {
    id: "limits",
    title: "Read the limits and turn n into a time budget",
    body: "Before the story, find the largest input size. A computer does about 10^8 simple steps in a second, so the size tells you the kind of algorithm the problem expects. n = 20 invites subsets, n = 5,000 invites two nested loops, n = 10^5 invites sorting and heaps, n = 10^9 invites a formula or binary search.",
    ask: [
      "What is the biggest n (and the second biggest dimension, like k or the number of queries)?",
      "Which complexity fits that n in about 10^8 steps?",
      "Is the value range huge (10^9, 10^18) or tiny (letters, digits)? That changes hash maps and counting arrays.",
    ],
  },
  {
    id: "shape",
    title: "Name the shape of the input",
    body: "Say it in one word: array, string, linked list, tree, graph, grid, intervals, a stream of numbers, or a design with operations. The shape alone removes half of the patterns. Also note whether it is sorted and whether it can change over time.",
    ask: [
      "Is the data sorted, sortable, or in a fixed order I must keep?",
      "Is it fixed, or do updates and queries arrive over time?",
      "Is a graph hiding here (a grid, dependencies, states, words one letter apart)?",
    ],
  },
  {
    id: "ask",
    title: "Say exactly what is asked for",
    body: "Is the output one best value, a count of ways, every solution, a yes or no, a position, an order, or a changed structure? The difference between 'the minimum' and 'all the ways' is the difference between DP or greedy and backtracking. A count of ways with a large answer usually says 'modulo 10^9 + 7'.",
    ask: [
      "Do I return a value, a count, a list of all answers, a boolean, or an object?",
      "Do they want the best, the first found, or all of them?",
      "What must hold (contiguous, a subsequence, distinct, non-overlapping)?",
    ],
  },
  {
    id: "clues",
    title: "Underline the clue words",
    body: "Some words point strongly at a pattern: 'contiguous' or 'substring' (window or prefix sums), 'subsequence' (DP), 'sorted' (binary search, two pointers), 'minimum number of steps' (BFS), 'all possible' (backtracking), 'k-th' (heap, quickselect), 'prerequisite' (topological sort). Check the clue dictionary below, and read the false friend that goes with each clue.",
    ask: [
      "Which words describe the shape of the answer (contiguous, subsequence, any order)?",
      "Which words describe the goal (minimum, maximum, count, exists, all)?",
      "Does any clue have a false friend that fits this problem better?",
    ],
  },
  {
    id: "brute",
    title: "Write the brute force and find what it wastes",
    body: "Say the obvious slow solution out loud, with its cost. Then ask what it repeats, what it rescans, what it recomputes, or what it tries that can never win. The waste is the doorway to the pattern: a rescanned window becomes a sliding window, a recomputed sum becomes a prefix sum, a repeated subproblem becomes DP.",
    ask: [
      "What is the simplest correct solution, and what does it cost?",
      "What does it compute again and again?",
      "Which candidates can I throw away without checking them?",
    ],
  },
  {
    id: "pick",
    title: "Pick the pattern that removes the waste, then check it",
    body: "Match the waste to a pattern (see the optimisation moves). Then check three things: does the cost fit the budget from step 1, do the conditions of the pattern hold (non-negative numbers for a window, a one-way flip for binary search, a safe local choice for greedy), and does it work on the smallest and the strangest inputs?",
    ask: [
      "Does the complexity of this pattern fit my budget?",
      "Which condition must be true for the pattern to work, and is it true here?",
      "What are the edge cases: empty input, one item, all equal, negative numbers, huge values?",
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Clue dictionary: what you see -> what it points to -> why (and the false friend)
// `points` are pattern ids or "pattern/variation" ids from THINK_PATTERNS.
// ---------------------------------------------------------------------------------------------------------------

export type ClueKind = "constraint" | "wording" | "input" | "output";
export interface Clue {
  id: string;
  kind: ClueKind;
  phrase: string;
  points: string[]; // ThinkPattern ids, or "pattern/variation"
  why: string;
  falseFriend?: string;
}

export const CLUES: Clue[] = [
  // ----- constraint clues -----
  { id: "n-tiny", kind: "constraint", phrase: "n is at most 10 to 12", points: ["subsets", "constraint-backtracking", "enumeration"], why: "n! operations is about 479 million at n = 12, so trying every order is allowed. The authors want you to enumerate, with some pruning.", falseFriend: "A tiny n can also be a trap for bitmask DP (n up to 20); read the number carefully." },
  { id: "n-20", kind: "constraint", phrase: "n is at most 20", points: ["bitmask-dp-subsets", "subsets"], why: "2^20 is about a million, so every subset can be a state. A mask of used items is the state, or you simply enumerate subsets.", falseFriend: "Under n = 12 plain backtracking over permutations is enough; bitmask DP helps from about 15." },
  { id: "n-40", kind: "constraint", phrase: "n up to about 40", points: ["meet-in-middle"], why: "2^40 is far too big but 2^20 twice is easy: enumerate each half and join the results with sorting or hashing." },
  { id: "n-100-500", kind: "constraint", phrase: "n is at most 100 to 500 (cubic work is fine)", points: ["interval-dp", "floyd-warshall"], why: "O(n^3) is 125 million at n = 500. Interval DP (range plus a split point) and all-pairs shortest paths both cost exactly that.", falseFriend: "Cubic is also what a naive triple loop costs; check whether a hash map reduces it to n^2 first." },
  { id: "n-5000", kind: "constraint", phrase: "n is at most 5,000 (about 10^3 to 10^4)", points: ["two-string-dp", "grid-dp", "lis", "knapsack", "enumeration"], why: "O(n^2) is 25 million at n = 5000. A table over two indices (two strings, a grid, an index and a capacity) or all pairs is intended." },
  { id: "n-1e5", kind: "constraint", phrase: "n up to 10^5 (or 2 * 10^5)", points: ["sorting-family", "heap-top-k", "sliding-window", "union-find", "segment-tree"], why: "O(n log n) is fine and O(n^2) is not. Look for sort, heap, binary search, a window, union-find or a tree structure; anything nested over n is too slow.", falseFriend: "A hash map also gives O(n) here; do not reach for a heavy structure when one pass with a map is enough." },
  { id: "n-1e6", kind: "constraint", phrase: "n up to 10^6 or 10^7", points: ["hash-map", "prefix-sums", "monotonic-stack", "number-theory"], why: "Only a single pass or a sieve fits, with a small constant. No sorting inside a loop, no per-item objects.", falseFriend: "In slow languages even n log n may be too slow; prefer the linear version." },
  { id: "n-huge-value", kind: "constraint", phrase: "A number up to 10^9, 10^18 or 'x to the power n'", points: ["bs-answer", "number-theory", "math-basics", "digit-dp"], why: "You cannot loop up to the value. Use the number of digits, the log of the value, binary search over it, or a formula.", falseFriend: "A huge value with a small n (10^9 as a weight) is fine for hash maps and sorting; only the size n matters for looping." },
  { id: "modulo", kind: "constraint", phrase: "Return the answer modulo 10^9 + 7", points: ["dp-1d", "combinatorics", "number-theory", "digit-dp"], why: "The answer counts something astronomical. It is a counting DP or a combinatorial formula, and divisions need modular inverses.", falseFriend: "Modulo does not mean DP every time: if the count is a closed formula (grid paths), use nCr with inverses." },
  { id: "small-alphabet", kind: "constraint", phrase: "The string has only lowercase letters (26) or digits", points: ["hash-map", "sliding-window", "sorting-family", "trie"], why: "A fixed 26-slot array replaces a hash map, counting sort replaces comparison sort, and a trie has at most 26 children per node." },
  { id: "values-1-to-n", kind: "constraint", phrase: "Array of n numbers, each between 1 and n (or 0 and n)", points: ["cyclic-sort", "fast-slow"], why: "The values are valid indices, so each number has a home slot; you can sort in place or use the array as a linked list.", falseFriend: "If extra space is allowed, a set or count array is simpler." },
  { id: "many-queries", kind: "constraint", phrase: "Up to 10^5 queries on the same data", points: ["prefix-sums", "sparse-table", "segment-tree", "binary-lifting"], why: "Spending O(n) per query is too slow. Precompute once so each query costs O(1) or O(log n); updates in between decide between prefix sums and trees." },
  { id: "o1-per-op", kind: "constraint", phrase: "Each operation must run in O(1) average time", points: ["lru-lfu", "design-ds", "hash-map"], why: "Only hash maps, arrays, and linked lists reach constant time. The trick is to combine two of them and keep them in sync." },
  { id: "o-log-n", kind: "constraint", phrase: "Your algorithm must run in O(log n)", points: ["bs-index", "bs-answer", "bst"], why: "log n means halving: binary search on a sorted array, on a rotated array, on an answer range, or walking down a balanced tree." },
  { id: "o1-space", kind: "constraint", phrase: "In place, O(1) extra space", points: ["two-pointers", "cyclic-sort", "list-reversal", "fast-slow", "matrix"], why: "No extra array allowed, so you reuse the input as storage: pointer pairs, swapping to home slots, flipping next pointers, using the first row as flags." },
  { id: "stream-memory", kind: "constraint", phrase: "Numbers arrive one at a time; you cannot store them all", points: ["heap-top-k", "two-heaps", "reservoir-sampling", "iterator-stream"], why: "You keep a small summary that is updated on each arrival: a size-k heap, two heaps for the median, a reservoir for a random sample." },
  { id: "weights-01", kind: "constraint", phrase: "Edge or move costs are only 0 or 1", points: ["bellman-ford/zero-one-bfs", "graph-bfs"], why: "A deque (0-cost to the front, 1-cost to the back) beats Dijkstra and runs in linear time.", falseFriend: "Costs that are all 1 are plain BFS; 0-1 BFS is only needed when both values appear." },
  { id: "negative-weights", kind: "constraint", phrase: "Some edge costs are negative", points: ["bellman-ford/negative-edges"], why: "Dijkstra's greedy claim (the closest node is final) is false with negative edges; relax all edges repeatedly instead.", falseFriend: "Negative numbers in an array (not edges) break sliding windows, not Dijkstra." },
  { id: "small-graph-400", kind: "constraint", phrase: "At most a few hundred nodes and you need all pairs", points: ["floyd-warshall"], why: "The triple loop over nodes is O(n^3), perfect for n up to about 400." },
  { id: "grid-1000", kind: "constraint", phrase: "A grid up to 1000 x 1000", points: ["graph-bfs", "graph-dfs", "grid-dp"], why: "One million cells is fine if each cell is visited a constant number of times: BFS, flood fill, or one DP sweep.", falseFriend: "Per-cell work of O(rows) or O(cols) makes it a billion steps." },
  { id: "dp-too-slow", kind: "constraint", phrase: "A DP is clear but n is 10^5 and the transition scans earlier states", points: ["dp-optimizations", "monotonic-deque"], why: "The recurrence takes the best of many earlier states; a deque, a hull of lines or monotone split points find it faster." },

  // ----- wording clues -----
  { id: "contiguous", kind: "wording", phrase: "subarray, substring, contiguous", points: ["sliding-window", "prefix-sums", "kadane"], why: "Contiguous parts can be described by two indices, which a window or a prefix difference tracks in O(n).", falseFriend: "Subsequence is the other word: items may be skipped, and that is usually DP." },
  { id: "subsequence", kind: "wording", phrase: "subsequence (items may be skipped)", points: ["dp-1d", "lis", "two-string-dp"], why: "Skipping is a choice at each item, which gives overlapping subproblems and a DP table.", falseFriend: "Subarray and substring need no skipping: a window or prefix sums, not DP." },
  { id: "longest-with-limit", kind: "wording", phrase: "Longest substring with at most k distinct characters, or no repeats", points: ["sliding-window/longest-valid"], why: "The rule is about the window content, and shrinking from the left restores it, so two forward-moving indices find every maximal window.", falseFriend: "If the numbers can be negative, a sum-based rule cannot be fixed by shrinking." },
  { id: "shortest-covering", kind: "wording", phrase: "Smallest window that contains all of ... or sums to at least ...", points: ["sliding-window/shortest-valid"], why: "Grow until the window is valid, then shrink while it stays valid, recording the length." },
  { id: "sum-equals-k", kind: "wording", phrase: "Number of subarrays whose sum equals k", points: ["prefix-sums/sum-equals-k"], why: "A subarray sum is a difference of two prefix sums, so you count earlier prefixes equal to the current prefix minus k.", falseFriend: "A sliding window looks natural here but fails when numbers can be negative or zero." },
  { id: "max-subarray", kind: "wording", phrase: "Maximum sum (or product) of a contiguous subarray", points: ["kadane"], why: "The best subarray ending at each index extends the previous one or restarts, which is a one-variable DP." },
  { id: "sorted-input", kind: "wording", phrase: "The array is sorted", points: ["two-pointers", "bs-index"], why: "Sortedness gives a direction to move: pointers from both ends discard one option per step, and halving finds a position in O(log n).", falseFriend: "If the array is not sorted, check whether sorting would lose needed indices before you sort." },
  { id: "rotated-sorted", kind: "wording", phrase: "A sorted array rotated at an unknown pivot", points: ["bs-index/rotated"], why: "At least one half of any range is still sorted, so you can tell which half to keep." },
  { id: "minimise-the-maximum", kind: "wording", phrase: "Minimise the largest ..., maximise the smallest ..., smallest x such that it is possible", points: ["bs-answer"], why: "If x is possible then a larger x also is, so the answer sits on a threshold that binary search finds, with a greedy check for each guess.", falseFriend: "It sounds like DP (optimal value), but the check-and-halve structure is much simpler." },
  { id: "kth-element", kind: "wording", phrase: "k-th largest or smallest element", points: ["heap-top-k/kth", "quickselect/kth-largest"], why: "You need one order statistic, not the full order: a size-k heap or a partition that discards half each time.", falseFriend: "Sorting works, but is O(n log n); the interviewer usually wants the heap or quickselect." },
  { id: "median-stream", kind: "wording", phrase: "Median of numbers that keep arriving", points: ["two-heaps/running-median"], why: "The middle sits between a max-heap of the lower half and a min-heap of the upper half." },
  { id: "top-k-frequent", kind: "wording", phrase: "k most frequent items", points: ["heap-top-k/top-frequent", "sorting-family/bucket-by-frequency", "hash-map/frequency"], why: "Count with a hash map first, then pick the largest counts by a heap or by bucketing counts." },
  { id: "merge-k-sorted", kind: "wording", phrase: "Merge k sorted lists or arrays", points: ["heap-top-k/merge-k"], why: "At every step the next output is the smallest head among k lists, and a heap finds it in O(log k)." },
  { id: "next-greater", kind: "wording", phrase: "Next greater (or smaller) element, how many days until warmer", points: ["monotonic-stack/next-greater"], why: "A stack of unresolved items stays ordered; the current item resolves every item it beats in one pop-loop, so the total is O(n)." },
  { id: "window-extreme", kind: "wording", phrase: "Maximum or minimum of every window of size k", points: ["monotonic-deque/window-max", "sliding-window/window-extreme"], why: "A plain window cannot update a max in O(1); a deque that keeps only the possible winners does." },
  { id: "histogram", kind: "wording", phrase: "Largest rectangle, trapped water, bars", points: ["monotonic-stack/histogram", "two-pointers/opposite-ends"], why: "Each bar needs its nearest smaller bars (a stack) or the best wall on each side (two pointers).", falseFriend: "Trapping water can be a stack or two pointers; either is fine, the DP with two arrays costs extra space." },
  { id: "brackets", kind: "wording", phrase: "Valid parentheses, balanced brackets, decode nested pattern", points: ["stack-parsing/brackets", "stack-parsing/decode"], why: "The most recent opener must be closed first: last in, first out." },
  { id: "evaluate-expression", kind: "wording", phrase: "Evaluate an expression with + - * / and parentheses", points: ["stack-parsing/calculator"], why: "Multiplication binds tighter, so you finish it at once and push signed terms; parentheses are a nested restart." },
  { id: "merge-intervals", kind: "wording", phrase: "Merge overlapping intervals, insert an interval, free time", points: ["intervals/merge", "intervals/free-time"], why: "After sorting by start, overlaps are always with the last merged interval." },
  { id: "rooms-at-once", kind: "wording", phrase: "Minimum number of rooms, how many events overlap at once", points: ["intervals/rooms-needed", "line-sweep/max-overlap"], why: "Overlap count is the running total of starts minus ends along the timeline." },
  { id: "non-overlapping", kind: "wording", phrase: "Choose the most non-overlapping intervals, or remove the fewest", points: ["exchange-argument/earliest-end", "intervals/max-non-overlapping"], why: "Always keeping the one that ends first leaves the most room. An exchange argument proves it.", falseFriend: "Sorting by start (instead of end) breaks the greedy here." },
  { id: "calendar-booking", kind: "wording", phrase: "Book an event unless it conflicts with existing ones", points: ["ordered-set/calendar", "ordered-set/overlap-count"], why: "A new interval can only conflict with its neighbours in start order, which a sorted structure finds in O(log n)." },
  { id: "fewest-steps", kind: "wording", phrase: "Minimum number of steps or moves (each costs the same)", points: ["graph-bfs/shortest-steps", "state-space-bfs"], why: "BFS reaches nodes in order of the number of steps. If the 'graph' is a set of states and moves, it is BFS over states.", falseFriend: "'Minimum' with different costs per move is Dijkstra; 'minimum' over choices with overlapping subproblems is DP." },
  { id: "cheapest-weighted", kind: "wording", phrase: "Cheapest path, minimum time or cost with different edge weights", points: ["dijkstra"], why: "A heap always expands the cheapest unfinished node; with non-negative weights, it is final when popped.", falseFriend: "With negative weights use Bellman-Ford; with 0 and 1 only, 0-1 BFS." },
  { id: "at-most-k-stops", kind: "wording", phrase: "At most k stops (edges) allowed", points: ["bellman-ford/at-most-k", "dijkstra/state-extended"], why: "The number of edges used is part of the state, so rounds of relaxation (or an extended node) are needed." },
  { id: "all-pairs", kind: "wording", phrase: "Shortest distance between every pair of nodes", points: ["floyd-warshall/all-pairs"], why: "A table of all distances for a small graph is the triple loop." },
  { id: "prerequisites", kind: "wording", phrase: "Prerequisites, order of tasks, build order, can all be finished", points: ["topo-sort/course-order"], why: "Dependencies form a directed graph; a valid order exists exactly when it has no cycle." },
  { id: "derive-order", kind: "wording", phrase: "Given words sorted in an unknown alphabet, find the alphabet", points: ["topo-sort/derived-order"], why: "Each adjacent pair of words gives one ordering rule, and the rules form a graph." },
  { id: "connected-groups", kind: "wording", phrase: "Are they connected, number of groups, merge groups that share something", points: ["union-find/components", "union-find/group-by-key", "graph-dfs/flood-fill"], why: "Connectivity questions can use a DSU (when edges arrive over time) or one DFS per component (when the graph is static).", falseFriend: "Directed 'reachability' is not the same as being in one group; a DSU only fits undirected links." },
  { id: "redundant-edge", kind: "wording", phrase: "Find the edge that makes the graph have a cycle", points: ["union-find/cycle-edge"], why: "The first edge whose two ends are already connected closes a cycle." },
  { id: "connect-all-cheapest", kind: "wording", phrase: "Connect every point or node at the minimum total cost", points: ["mst"], why: "A cheapest connected structure with no cycle is a minimum spanning tree.", falseFriend: "Shortest path from one node to another is a different question (Dijkstra)." },
  { id: "two-groups", kind: "wording", phrase: "Split into two groups so that enemies are apart, is the graph two-colourable", points: ["bipartite"], why: "Alternate colours along edges; a conflict means an odd cycle." },
  { id: "critical-links", kind: "wording", phrase: "Critical connections, bridges, single points of failure", points: ["tarjan/bridges", "tarjan/articulation"], why: "An edge or node whose removal disconnects the graph is found with discovery times and low-links in one DFS." },
  { id: "use-every-edge", kind: "wording", phrase: "Use every ticket, road or edge exactly once", points: ["eulerian"], why: "Visiting every edge once is an Eulerian path; the degree conditions decide whether it exists.", falseFriend: "Visiting every vertex exactly once is a Hamiltonian path and is much harder (NP-hard)." },
  { id: "puzzle-states", kind: "wording", phrase: "Turn the lock, slide the tiles, collect keys; reach the target configuration", points: ["state-space-bfs/lock-puzzle", "state-space-bfs/sliding-puzzle"], why: "Every configuration is a node and every legal move is an edge, so the shortest sequence of moves is BFS." },
  { id: "islands", kind: "wording", phrase: "Islands, regions, connected cells, enclosed areas", points: ["graph-dfs/flood-fill", "union-find/online-islands"], why: "One fill per unvisited cell marks a whole region." },
  { id: "spreading", kind: "wording", phrase: "Spreads every minute; distance to the nearest ...", points: ["graph-bfs/multi-source"], why: "All sources start at once, so every cell is reached first by its nearest source." },
  { id: "tree-depth-path", kind: "wording", phrase: "Depth, diameter, path sum, balanced, lowest common ancestor", points: ["tree-dfs"], why: "A recursive call per node, combining what the children return." },
  { id: "tree-levels", kind: "wording", phrase: "Level by level, right side view, minimum depth, zigzag", points: ["tree-bfs"], why: "Levels are exactly the layers of a BFS." },
  { id: "rebuild-tree", kind: "wording", phrase: "Build the tree from two traversals, or serialize and restore a tree", points: ["tree-construct"], why: "The preorder root plus its position in the inorder splits the problem into two smaller trees." },
  { id: "bst-in-order", kind: "wording", phrase: "Binary search tree, k-th smallest, in-order iterator, validate", points: ["bst"], why: "In-order traversal of a BST is sorted, and all search rules use that.", falseFriend: "A plain binary tree has no order; do not rely on the BST property unless it is stated." },
  { id: "tree-choices", kind: "wording", phrase: "Pick nodes in a tree so that no two chosen nodes are adjacent, or cover all nodes", points: ["tree-dp/take-skip", "tree-dp/cover-states"], why: "The choice at a node depends on the choices at its children, so each subtree returns a small tuple of states." },
  { id: "every-root", kind: "wording", phrase: "The answer for every node as the root (sum of distances from each node)", points: ["tree-dp/reroot"], why: "Computing from scratch per root is O(n^2); shifting the root across an edge is O(1)." },
  { id: "ancestor-queries", kind: "wording", phrase: "Many queries for the k-th ancestor or the lowest common ancestor", points: ["binary-lifting"], why: "Jump tables turn a long walk into log n jumps." },
  { id: "prefix-dictionary", kind: "wording", phrase: "Words that start with a prefix, autocomplete, add and search words with dots", points: ["trie"], why: "A trie shares prefixes, so a lookup costs the length of the query word." },
  { id: "list-all", kind: "wording", phrase: "Return all subsets, all permutations, all combinations, all valid placements", points: ["subsets", "constraint-backtracking"], why: "The output itself is exponential, so a recursion that builds each answer once is the intended solution.", falseFriend: "'How many' instead of 'list all' is usually a DP or a formula; counting should not enumerate." },
  { id: "board-placement", kind: "wording", phrase: "Place queens, fill a Sudoku, find a word path in a grid", points: ["constraint-backtracking/placement", "constraint-backtracking/grid-word-search"], why: "A search with early rejection of invalid placements." },
  { id: "count-ways", kind: "wording", phrase: "How many ways to ...", points: ["dp-1d", "knapsack", "grid-dp", "combinatorics"], why: "Counting without listing means the number of ways at each stage is built from the previous stage.", falseFriend: "If they ask you to list the ways, count-DP is not enough; that is backtracking." },
  { id: "min-items-budget", kind: "wording", phrase: "Fewest coins to make an amount, can you reach exactly this total", points: ["knapsack/unbounded", "knapsack/zero-one"], why: "State is the amount reached; each item moves it.", falseFriend: "Greedy (take the biggest coin) only works for special coin systems. Try a small counterexample." },
  { id: "increasing-subseq", kind: "wording", phrase: "Longest increasing subsequence, nested envelopes", points: ["lis"], why: "A subsequence chain with an order condition, solvable in O(n log n) with the tails array." },
  { id: "two-string-compare", kind: "wording", phrase: "Edit distance, longest common subsequence, does the pattern match, distinct subsequences", points: ["two-string-dp"], why: "Two prefixes (i, j) are a natural state, with a choice looking at the last characters." },
  { id: "split-range", kind: "wording", phrase: "Burst balloons, merge piles with minimum cost, cut a stick", points: ["interval-dp/last-action", "interval-dp/merge-cost"], why: "The best way to handle a range depends on where you split it and the two halves are independent." },
  { id: "buy-sell", kind: "wording", phrase: "Buy and sell stock with a cooldown, a fee or at most k transactions", points: ["state-machine-dp"], why: "Each day you are in one of a few states, and each action moves you between states." },
  { id: "count-numbers-range", kind: "wording", phrase: "Count the integers in [1, N] whose digits satisfy a condition", points: ["digit-dp"], why: "Look at the number digit by digit with a flag that says whether you are still equal to the bound." },
  { id: "visit-all", kind: "wording", phrase: "Visit every node (or assign every item) exactly once with the smallest cost", points: ["bitmask-dp-subsets/tsp", "state-space-bfs/visit-all-mask"], why: "With a small n the set of visited items fits in a bitmask, and the state is (mask, where I am)." },
  { id: "safe-local-choice", kind: "wording", phrase: "Can you reach the end, gas station circuit, assign cookies, always take the best now", points: ["greedy-proof"], why: "A running maximum or a balance summarises the past, so you never need to revisit decisions.", falseFriend: "Greedy that fails a small counterexample is a DP in disguise." },
  { id: "arrange-order", kind: "wording", phrase: "Arrange the numbers to form the largest result, order tasks to minimise the cost", points: ["custom-sort/pairwise-order", "exchange-argument"], why: "The best order comes from comparing two items; a sort with that comparison builds it." },
  { id: "count-pairs-order", kind: "wording", phrase: "Count pairs i < j where a[i] > a[j] (or twice), smaller numbers to the right", points: ["merge-sort-count", "segment-tree/count-smaller"], why: "Counting pairs by their order is what merging sorted halves, or a Fenwick tree over ranks, does in n log n." },
  { id: "divisibility", kind: "wording", phrase: "gcd, lcm, prime, divisors, remainder, power with a huge exponent", points: ["number-theory"], why: "The statement is about the arithmetic structure of numbers, not their positions." },
  { id: "choose-count", kind: "wording", phrase: "Choose k out of n, arrangements, paths in a grid, stars and bars", points: ["combinatorics/binomial"], why: "A counting formula with factorials beats enumeration." },
  { id: "xor-bits", kind: "wording", phrase: "XOR, single number among pairs, powers of two, bit counts", points: ["bit-tricks"], why: "XOR cancels equal pairs and bit operations work on the binary form directly." },
  { id: "points-lines", kind: "wording", phrase: "Points on a line, rectangle overlap, polygon, distance between points", points: ["geometry"], why: "Use cross products and reduced fractions; avoid floating point." },
  { id: "range-updates", kind: "wording", phrase: "Range sum or minimum queries mixed with updates", points: ["segment-tree/point-update-range-sum"], why: "Both queries and updates cost log n in a tree; prefix sums handle only static data.", falseFriend: "With no updates, prefix sums or a sparse table are simpler." },
  { id: "static-range-min", kind: "wording", phrase: "Many range minimum or maximum queries on data that never changes", points: ["sparse-table/static-rmq"], why: "Two overlapping power-of-two blocks answer any query in O(1)." },
  { id: "nearest-value", kind: "wording", phrase: "Closest value, floor or ceiling, in a changing set", points: ["ordered-set/floor-ceiling"], why: "A sorted set finds the nearest neighbours in O(log n)." },
  { id: "random-pick", kind: "wording", phrase: "Pick randomly with given weights, or a random node of a list", points: ["randomized/weighted-index", "reservoir-sampling/reservoir"], why: "Prefix sums plus binary search for weights; replace-with-probability for unknown length." },
  { id: "design-class", kind: "wording", phrase: "Design a class with add, get, remove (and a required complexity)", points: ["design-ds", "lru-lfu"], why: "Pick one structure per operation cost and keep them consistent." },
  { id: "iterator", kind: "wording", phrase: "Implement next() and hasNext(), a flat iterator, a stream class", points: ["iterator-stream"], why: "Hold only the state needed to produce the next item." },
  { id: "list-cycle-middle", kind: "wording", phrase: "Cycle in a linked list, the middle node, the k-th from the end", points: ["fast-slow"], why: "Two pointers at different speeds expose the cycle and the middle without knowing the length." },
  { id: "reverse-list", kind: "wording", phrase: "Reverse a linked list, a part of it, or in groups of k", points: ["list-reversal"], why: "Flipping next pointers one by one needs only three names." },
  { id: "list-merge", kind: "wording", phrase: "Merge two sorted lists, remove nodes by value, add two numbers in lists", points: ["linked-list-ops"], why: "Pointer bookkeeping with a dummy head." },
  { id: "pattern-in-text", kind: "wording", phrase: "Find a pattern in a text, repeated block, longest prefix that is also a suffix", points: ["string-matching/kmp", "string-matching/repeat-check"], why: "The prefix function records how far a match can fall back after a mismatch." },
  { id: "compare-substrings", kind: "wording", phrase: "Longest repeated substring, compare many substrings, count distinct substrings", points: ["rolling-hash/repeated-substring", "suffix-array"], why: "Hashing or sorted suffixes compare substrings without scanning them each time." },
  { id: "matrix-walk", kind: "wording", phrase: "Spiral order, rotate the image, set rows and columns to zero in place", points: ["matrix"], why: "It is bookkeeping with boundaries and a flag trick, not a graph or DP problem." },
  { id: "follow-the-rules", kind: "wording", phrase: "Simulate the process described, apply the rules each step", points: ["simulation"], why: "The rules are the algorithm; the work is writing them down correctly.", falseFriend: "If the process runs for 10^9 steps, simulation is too slow; look for a cycle." },
  { id: "two-players", kind: "wording", phrase: "Two players alternate and play optimally; who wins", points: ["game-theory"], why: "A position is winning if some move leaves the opponent in a losing position." },
  { id: "riddle", kind: "wording", phrase: "A riddle-like rule where small cases show a pattern (Nim, flipping bulbs)", points: ["brainteaser"], why: "A direct formula exists and brute force on small inputs reveals it." },
  { id: "guess-with-api", kind: "wording", phrase: "You may call a given API at most x times to find the answer", points: ["interactive"], why: "Every call must remove as many candidates as possible, usually half." },
  { id: "sort-small-range", kind: "wording", phrase: "Sort numbers with a small range, group by count or digit", points: ["sorting-family"], why: "Counting, bucket and radix sorts skip the n log n comparison bound." },
  { id: "split-in-halves", kind: "wording", phrase: "Solve left and right halves, then combine across the middle", points: ["divide-conquer"], why: "The recursion halves the problem, and the combine step is cheap." },
  { id: "same-subproblem", kind: "wording", phrase: "The same call with the same arguments appears many times in the recursion tree", points: ["recursion/memoize", "dp-1d"], why: "A cache by arguments turns exponential recursion into polynomial work." },
  { id: "chance-expected", kind: "wording", phrase: "Probability that ..., expected number of ...", points: ["probability", "combinatorics/expected-value"], why: "Define outcomes and chances; use linearity of expectation or a DP over states." },
  { id: "sql-shell-threads", kind: "wording", phrase: "Write a SQL query, a bash one-liner, or make threads print in order", points: ["not-algorithm"], why: "These are database, shell and concurrency skills; no data structure choice is involved." },
  { id: "digits-numbers", kind: "wording", phrase: "Reverse the digits, palindrome number, add digits, convert between bases", points: ["math-basics"], why: "Peel digits with % 10 and // 10 and build numbers with * 10 + digit." },
  { id: "try-all-small", kind: "wording", phrase: "Check every pair or triple and the input is small", points: ["enumeration"], why: "When the count of candidates fits the budget, the simple loop is the right answer." },

  // ----- input clues -----
  { id: "input-array", kind: "input", phrase: "An array of integers", points: ["hash-map", "two-pointers", "sliding-window", "prefix-sums", "dp-1d"], why: "The most common shape. Decide with the rest of the statement: pairs (hash map), ranges (window or prefix sums), choices (DP).", falseFriend: "The shape alone never decides; always read what is asked." },
  { id: "input-sorted-array", kind: "input", phrase: "A sorted array or sorted list", points: ["bs-index", "two-pointers"], why: "Sorted input means use the order: binary search or pointers from the ends." },
  { id: "input-string", kind: "input", phrase: "A string (and maybe a second string or a dictionary)", points: ["sliding-window", "two-string-dp", "hash-map", "trie", "stack-parsing"], why: "Windows for substrings, DP for two strings, a stack for nesting, a trie for many words." },
  { id: "input-grid", kind: "input", phrase: "A grid of cells with obstacles, land and water, or numbers", points: ["graph-bfs", "graph-dfs", "grid-dp", "matrix"], why: "A grid is a graph whose edges are the four neighbours. Decide by what is asked: shortest steps (BFS), regions (DFS), best path with fixed moves (DP).", falseFriend: "If you can move in only two directions and the answer is a best path, it is DP, not BFS." },
  { id: "input-edge-list", kind: "input", phrase: "A list of pairs [a, b] (edges, prerequisites, friendships)", points: ["graph-dfs", "topo-sort", "union-find", "graph-bfs"], why: "Pairs describe a graph. Directed pairs with an order word are topological sort; undirected connection questions are DSU or DFS." },
  { id: "input-intervals", kind: "input", phrase: "A list of [start, end] pairs", points: ["intervals", "line-sweep"], why: "Sort first, then scan." },
  { id: "input-linked-list", kind: "input", phrase: "A linked list head", points: ["fast-slow", "list-reversal", "linked-list-ops"], why: "You can only move forward through next pointers; pointers and a dummy head are the toolkit." },
  { id: "input-binary-tree", kind: "input", phrase: "A binary tree root", points: ["tree-dfs", "tree-bfs", "tree-dp"], why: "Recursion over the structure, or a queue by levels." },
  { id: "input-bst", kind: "input", phrase: "A binary search tree", points: ["bst"], why: "Use the ordering property." },
  { id: "input-points", kind: "input", phrase: "A list of points [x, y]", points: ["geometry", "mst", "hash-map/group-key"], why: "Slopes and cross products, a spanning tree over distances, or grouping by a key." },
  { id: "input-words", kind: "input", phrase: "A list of words or a dictionary", points: ["trie", "hash-map/group-key", "topo-sort/derived-order", "state-space-bfs/lock-puzzle"], why: "Prefix structure, canonical forms, alphabet order, or word-ladder moves." },
  { id: "input-operations", kind: "input", phrase: "A class with methods and a sequence of calls", points: ["design-ds", "lru-lfu", "iterator-stream", "ordered-set"], why: "Choose structures by the cost required per method." },
  { id: "input-numbers-n", kind: "input", phrase: "A single integer n (maybe huge)", points: ["number-theory", "digit-dp", "math-basics", "brainteaser", "game-theory"], why: "A formula, digits, modular arithmetic or a pattern from small cases." },

  // ----- output clues -----
  { id: "out-indices", kind: "output", phrase: "Return the indices of two numbers", points: ["hash-map/complement", "two-pointers/opposite-ends"], why: "Indices must survive, so use a map from value to index.", falseFriend: "Two pointers on a sorted copy loses the original indices." },
  { id: "out-length", kind: "output", phrase: "Return the length of the longest ...", points: ["sliding-window", "lis", "two-string-dp", "dp-1d"], why: "Only the length is needed, so a DP value or window size is enough, not the item list.", falseFriend: "Longest contiguous is a window; longest with gaps is DP." },
  { id: "out-boolean-reach", kind: "output", phrase: "Return true if it is possible to ...", points: ["greedy-proof/reach", "dp-1d/word-break", "graph-dfs", "knapsack/zero-one"], why: "A yes or no over choices: a greedy reach, a boolean DP, graph reachability, or subset sum.", falseFriend: "Do not enumerate everything when one witness is enough." },
  { id: "out-all", kind: "output", phrase: "Return all combinations or all valid ...", points: ["subsets", "constraint-backtracking"], why: "The output size is exponential, so backtracking is expected." },
  { id: "out-min-steps", kind: "output", phrase: "Return the minimum number of steps or operations", points: ["graph-bfs", "state-space-bfs", "dp-1d", "greedy-proof"], why: "Same cost per step: BFS. Choices with overlapping subproblems: DP. A provable local rule: greedy.", falseFriend: "Do not default to DP; ask whether the moves form a graph." },
  { id: "out-order", kind: "output", phrase: "Return any valid order of tasks", points: ["topo-sort/course-order"], why: "An ordering that respects dependencies, or an empty answer when a cycle exists." },
  { id: "out-top-k", kind: "output", phrase: "Return the k closest, k largest or k most frequent", points: ["heap-top-k", "quickselect"], why: "A bounded heap or a partition keeps only the k best." },
  { id: "out-count-components", kind: "output", phrase: "Return the number of groups, islands or provinces", points: ["graph-dfs/flood-fill", "union-find/components"], why: "The count of components is the number of fills or the number of roots." },
  { id: "out-modify-in-place", kind: "output", phrase: "Modify the array or list in place and return nothing", points: ["two-pointers/read-write", "cyclic-sort", "list-reversal", "matrix/in-place-flags"], why: "Your output is the edited input; write to your own earlier positions." },
  { id: "out-lexicographic", kind: "output", phrase: "Return the lexicographically smallest result", points: ["monotonic-stack", "greedy-proof", "eulerian/itinerary"], why: "Pick the smallest possible next character that still leaves a valid solution; a stack removes worse earlier choices.", falseFriend: "Do not sort blindly; the result often has to keep the relative order of the input." },
  { id: "out-new-structure", kind: "output", phrase: "Return a new tree or list built from the input", points: ["tree-construct", "linked-list-ops"], why: "Construct it by recursion over ranges or by building with a dummy head." },
  { id: "out-path-itself", kind: "output", phrase: "Return the shortest path itself, not just its length", points: ["graph-bfs", "dijkstra"], why: "Store a parent for each node as you relax edges, then walk back from the target." },
  { id: "out-median", kind: "output", phrase: "Return the median", points: ["two-heaps", "bs-index/two-arrays", "quickselect"], why: "Two heaps for a stream; a binary search on cut positions for two sorted arrays; quickselect for a static array." },
];

// ---------------------------------------------------------------------------------------------------------------
// Worked examples: own-words statement, clues, reasoning, brute force, the pattern and the trap
// ---------------------------------------------------------------------------------------------------------------

export interface WorkedExample {
  id: string;
  title: string;
  problem?: string; // app problem id or "slug:<leetcode-slug>"
  statement: string;
  clues: string[];
  steps: string[];
  brute: string;
  pattern: string;
  variation?: string;
  trap: string;
}

export const WORKED_EXAMPLES: WorkedExample[] = [
  {
    id: "ex-longest-no-repeat",
    title: "Longest stretch without a repeated letter",
    problem: "lc-3",
    statement: "Given a string, find the length of its longest substring in which no character appears twice.",
    clues: ["contiguous", "longest-with-limit", "small-alphabet", "out-length"],
    steps: [
      "Read the limit: the string can have 5 * 10^4 characters, so n^2 pairs of ends is too slow; aim for O(n).",
      "The word is 'substring', so the answer is a contiguous part: two indices describe it.",
      "The rule (no repeats) can be restored by moving the left end forward, so a window fits.",
      "Keep the last seen position or a count per letter; when the new letter repeats, move the left end past its earlier copy.",
      "After each step the window is valid; record its length.",
    ],
    brute: "Check every pair of ends and test for repeats: O(n^2) pairs times O(n) to check. Even with a set per start it is O(n^2), which is too slow at n = 5 * 10^4.",
    pattern: "sliding-window",
    variation: "longest-valid",
    trap: "Moving the left end backwards. When a repeat appears at an old index, jump the left end to max(left, old + 1), never to a smaller value.",
  },
  {
    id: "ex-subarray-sum-k",
    title: "Count the stretches that add up to k",
    problem: "lc-560",
    statement: "Given integers (which can be negative) and a target k, count the contiguous parts whose sum is exactly k.",
    clues: ["contiguous", "sum-equals-k", "n-1e5", "negative-weights"],
    steps: [
      "The word 'contiguous' suggests a window, but read the numbers: they may be negative.",
      "Negative numbers mean growing the window can decrease the sum, so shrinking logic fails. Drop the window.",
      "A subarray sum is a difference of two prefix sums: sum(i..j) = pre[j + 1] - pre[i].",
      "So at each position ask: how many earlier prefixes equal current prefix - k? Store prefix counts in a map.",
      "Seed the map with {0: 1} so parts that start at the beginning count.",
    ],
    brute: "For every start, extend the end and keep a running sum: O(n^2). With n up to 2 * 10^4 this passes the sample but not a stricter limit, and it rescans the same parts.",
    pattern: "prefix-sums",
    variation: "sum-equals-k",
    trap: "Forgetting the empty prefix {0: 1}, which makes every subarray starting at index 0 uncounted, and using a sliding window despite negative numbers.",
  },
  {
    id: "ex-koko",
    title: "The slowest eating speed that still finishes in time",
    problem: "lc-875",
    statement: "Piles of bananas, h hours. Each hour you pick one pile and eat up to speed k bananas from it. Find the smallest k that finishes every pile within h hours.",
    clues: ["minimise-the-maximum", "n-huge-value", "o-log-n", "n-1e5"],
    steps: [
      "The question asks for the smallest speed such that something is possible: a threshold.",
      "If speed k works then any faster speed works too, so the answer lies on a one-way boundary.",
      "Checking one speed is easy: hours needed = sum of ceil(pile / k). That is O(n).",
      "Binary search k between 1 and the largest pile; each step runs the check.",
      "Total cost O(n log max pile), which fits n = 10^4.",
    ],
    brute: "Try k = 1, 2, 3, ... until the check passes: up to max pile times n work, which is too slow when piles are up to 10^9.",
    pattern: "bs-answer",
    variation: "min-capacity",
    trap: "Using integer division instead of a ceiling in the check, and setting the upper bound too low (it must be at least the largest pile).",
  },
  {
    id: "ex-three-sum",
    title: "Triples that add up to zero",
    problem: "lc-15",
    statement: "From a list of integers, list every distinct triple of different positions that sums to zero, without repeating a triple.",
    clues: ["sorted-input", "list-all", "n-5000", "input-array"],
    steps: [
      "Three items and a target: three nested loops are O(n^3), too slow for n = 3000.",
      "Sort the array. Sorting gives an order to exploit and makes duplicates sit side by side.",
      "Fix the first item, then the rest is a two-sum on a sorted range: two pointers from both ends.",
      "Move the left pointer when the sum is too small, the right when too large; on a hit skip equal values.",
      "Total O(n^2): one loop times one linear scan.",
    ],
    brute: "Try every triple: n^3 combinations, and you must also remove duplicates afterwards. At n = 3000 that is about 4.5 * 10^9 checks.",
    pattern: "two-pointers",
    variation: "k-sum",
    trap: "Duplicate triples. Skip equal values for the fixed item and for the pointers after a hit, or use a set.",
  },
  {
    id: "ex-two-sum",
    title: "Two numbers that add up to the target",
    problem: "lc-1",
    statement: "Given numbers and a target, return the positions of two different items that add up to the target.",
    clues: ["out-indices", "n-1e5", "input-array"],
    steps: [
      "Two items and a target: the partner of x is target - x, completely determined.",
      "The output wants positions, so sorting would lose them. Prefer a map from value to position.",
      "Walk once. For each x ask the map for target - x; if present, you are done.",
      "Otherwise store x. Asking before storing means an item never pairs with itself.",
    ],
    brute: "Check every pair: O(n^2) comparisons. Each x re-scans the array for its partner, though the partner is known exactly.",
    pattern: "hash-map",
    variation: "complement",
    trap: "Inserting x before the lookup, so a single 3 can pair with itself for target 6.",
  },
  {
    id: "ex-first-missing",
    title: "The smallest positive number that is missing",
    problem: "lc-41",
    statement: "In an unsorted array, find the smallest positive integer that does not appear, using linear time and constant extra space.",
    clues: ["values-1-to-n", "o1-space", "out-modify-in-place"],
    steps: [
      "The answer is always in 1..n + 1, because n numbers cannot cover more than n positives.",
      "Constant extra space forbids a set, but the array itself has n slots numbered 1..n: slot i is the home of value i.",
      "Walk the array and swap each value v in 1..n into slot v - 1 until the current slot holds a value that cannot be placed.",
      "A second pass finds the first slot whose value is not i + 1; that i + 1 is the answer.",
    ],
    brute: "Test 1, 2, 3, ... with a linear search each: O(n^2). A set gives O(n) time but O(n) space, which the statement forbids.",
    pattern: "cyclic-sort",
    variation: "first-missing",
    trap: "Using 'if' instead of 'while' for the swap, or swapping equal values forever. Stop when the target slot already holds the same value.",
  },
  {
    id: "ex-add-search-words",
    title: "A dictionary where a dot matches any letter",
    problem: "lc-211",
    statement: "Design a structure that adds words and checks whether a query, where '.' stands for any single letter, matches a stored word.",
    clues: ["prefix-dictionary", "input-words", "o1-per-op"],
    steps: [
      "Many words and prefix-like lookups: a hash set handles exact words but not wildcards.",
      "A trie stores words as paths, so a query walks the letters.",
      "For a normal letter follow one child; for '.' try every child and recurse.",
      "Mark word ends so a prefix is not mistaken for a word.",
    ],
    brute: "Store words in a list and compare the query with each: O(words * length) per query, too slow when there are many words and many queries.",
    pattern: "trie",
    variation: "wildcard",
    trap: "Treating a prefix as a full word. A node must carry an end-of-word flag.",
  },
  {
    id: "ex-daily-temperatures",
    title: "Days until a warmer day",
    problem: "lc-739",
    statement: "For each day's temperature, say how many days you wait until a warmer one (or 0 if there is none).",
    clues: ["next-greater", "n-1e5", "input-array"],
    steps: [
      "For each item you want the nearest item to the right that beats it: next greater element.",
      "Scanning right for each day is O(n^2) in the worst case (a falling sequence).",
      "Keep a stack of indices of days still waiting for a warmer day, with temperatures decreasing from bottom to top.",
      "When today is warmer than the top, pop it: its answer is today minus its index. Repeat, then push today.",
      "Each index is pushed once and popped once: O(n).",
    ],
    brute: "For every day scan forward until a warmer one: O(n^2), and a descending input makes every scan reach the end.",
    pattern: "monotonic-stack",
    variation: "next-greater",
    trap: "Storing temperatures instead of indices, which loses the distance you need.",
  },
  {
    id: "ex-decode-string",
    title: "Expand a nested repeat pattern",
    problem: "lc-394",
    statement: "Decode a string such as 3[a2[c]] where a number before brackets repeats the bracketed text.",
    clues: ["brackets", "input-string"],
    steps: [
      "Brackets that nest and 'inside first, then outside' means last in, first out: a stack.",
      "Keep the current string and the current number while reading.",
      "On '[' push the (string so far, repeat count) and start fresh.",
      "On ']' pop the pair and set the current string to the saved string plus current repeated count times.",
    ],
    brute: "Repeated string replacement of the innermost bracket pair, rescanning the string each time: O(n^2) or worse, and easy to get wrong.",
    pattern: "stack-parsing",
    variation: "decode",
    trap: "Numbers with more than one digit (like 12[a]); build the number digit by digit.",
  },
  {
    id: "ex-kth-largest",
    title: "The k-th largest number",
    problem: "lc-215",
    statement: "Return the k-th largest element of an unsorted array.",
    clues: ["kth-element", "n-1e5", "out-top-k"],
    steps: [
      "You want one order statistic, not a sorted array.",
      "Sorting is O(n log n) and works, but you do not need the whole order.",
      "A min-heap of size k holds the k largest seen so far; its root is the k-th largest.",
      "Push each number, pop when the heap exceeds k. Total O(n log k).",
      "Quickselect is the O(n) average alternative.",
    ],
    brute: "Sort everything and index: O(n log n). Fine for the limits, but it does more than asked, and a stream would not allow it.",
    pattern: "heap-top-k",
    variation: "kth",
    trap: "Using a max-heap of size n (heapq is a min-heap; negate or keep the min-heap of size k).",
  },
  {
    id: "ex-running-median",
    title: "The median as numbers keep arriving",
    problem: "lc-295",
    statement: "Support adding a number to a collection and reading the median of everything added so far.",
    clues: ["median-stream", "stream-memory", "input-operations"],
    steps: [
      "The median is the middle by order, and numbers arrive online.",
      "Re-sorting on every insert costs O(n log n) per call.",
      "Split the data into a lower half in a max-heap and an upper half in a min-heap.",
      "Keep the sizes within one, so the median is a top or the average of two tops.",
      "Each insert is a couple of heap operations: O(log n).",
    ],
    brute: "Keep a sorted list and insert with a shift: O(n) per insert, too slow for 5 * 10^4 operations in tight limits, or re-sort every time.",
    pattern: "two-heaps",
    variation: "running-median",
    trap: "Not rebalancing after every insert, so the sizes drift and the tops are no longer the middle.",
  },
  {
    id: "ex-count-smaller",
    title: "How many smaller numbers lie to the right",
    problem: "lc-315",
    statement: "For each position, count how many elements to its right are strictly smaller.",
    clues: ["count-pairs-order", "n-1e5", "input-array"],
    steps: [
      "For each i count j > i with a[j] < a[i]: a pair count with an order condition.",
      "Brute force is O(n^2), too slow at 10^5.",
      "While merging sorted halves, every time a right item goes before a left item, it is smaller than all remaining left items.",
      "Carry the original indices through the merge so each left item can add its count.",
      "Alternative: process from the right with a Fenwick tree over compressed values.",
    ],
    brute: "A nested loop counting smaller items on the right: O(n^2), about 5 * 10^9 comparisons at n = 10^5.",
    pattern: "merge-sort-count",
    variation: "inversions",
    trap: "Losing the original index when sorting, so counts are written to the wrong positions.",
  },
  {
    id: "ex-meeting-rooms",
    title: "How many rooms for these meetings",
    problem: "lc-253",
    statement: "Given the start and end time of meetings, find the least number of rooms so none overlap in the same room.",
    clues: ["rooms-at-once", "input-intervals", "n-1e5"],
    steps: [
      "Items with a start and an end: sort or sweep.",
      "The number of rooms equals the maximum number of meetings running at once.",
      "Put +1 at each start and -1 at each end, sort the events, and track the running total.",
      "At equal time, process ends before starts, so a meeting that ends exactly when another starts frees its room.",
      "The maximum of the running total is the answer. A min-heap of end times gives the same result.",
    ],
    brute: "For every moment count meetings running: O(n * time range). Or compare every pair of meetings: O(n^2).",
    pattern: "intervals",
    variation: "rooms-needed",
    trap: "Sorting events with starts before ends at the same time, which counts back-to-back meetings as overlapping.",
  },
  {
    id: "ex-diameter",
    title: "The longest path between two nodes in a tree",
    problem: "lc-543",
    statement: "Return the number of edges on the longest path between any two nodes of a binary tree.",
    clues: ["tree-depth-path", "input-binary-tree", "n-1e5"],
    steps: [
      "A tree, and a path whose best bend can sit at any node.",
      "The longest path through a node is its left height plus its right height.",
      "Write height(node): the longest downward path from node. It returns 1 + max(left, right).",
      "While computing it, record left + right as a candidate answer.",
      "Return the maximum candidate. One DFS, O(n).",
    ],
    brute: "For every node compute heights of both sides from scratch: O(n^2) in a skewed tree.",
    pattern: "tree-dfs",
    variation: "return-up",
    trap: "Returning the diameter through a node to the parent. The parent can only extend one side, so return the height, not the bend.",
  },
  {
    id: "ex-house-robber-iii",
    title: "Rob the most without taking two linked houses in a tree",
    problem: "lc-337",
    statement: "Houses form a binary tree; robbing a house forbids robbing its parent and its children. Maximise the total.",
    clues: ["tree-choices", "input-binary-tree", "count-ways"],
    steps: [
      "Choose nodes, no two adjacent: a choice at each node that depends on its children.",
      "Greedy (take the bigger level) fails on small counterexamples.",
      "Let each subtree return two numbers: best if its root is taken, best if its root is skipped.",
      "Taken = value + children's skipped values. Skipped = best of each child's two options added up.",
      "The answer is the better of the root's two numbers.",
    ],
    brute: "Recurse with 'take or skip' and no memo: the same subtrees are visited repeatedly, which is exponential.",
    pattern: "tree-dp",
    variation: "take-skip",
    trap: "Skipping a node does not force skipping its children; each child may be taken or skipped, so use the max of both child states.",
  },
  {
    id: "ex-rotting-oranges",
    title: "Minutes until every orange is rotten",
    problem: "lc-994",
    statement: "In a grid of fresh and rotten oranges, rot spreads to the four neighbours each minute. Find the minutes until none is fresh, or say it is impossible.",
    clues: ["spreading", "fewest-steps", "input-grid", "grid-1000"],
    steps: [
      "The grid is a graph, and 'spreads every minute' is a shortest-distance process from all sources at once.",
      "Put every rotten orange into the queue at time 0.",
      "BFS level by level: each level is one minute and rots the fresh neighbours.",
      "The answer is the number of levels, and if any fresh orange is left, return -1.",
    ],
    brute: "Simulate the grid each minute, rescanning all cells: O(cells * minutes). Worse, a single-source BFS from each rotten one repeats work.",
    pattern: "graph-bfs",
    variation: "multi-source",
    trap: "Counting levels wrongly: the last level adds no new rot, so subtract it, or only count a minute when something rots.",
  },
  {
    id: "ex-course-schedule",
    title: "Can all the courses be finished",
    problem: "lc-207",
    statement: "Courses have prerequisites, given as pairs. Decide whether some order lets you take them all.",
    clues: ["prerequisites", "input-edge-list", "out-order"],
    steps: [
      "Pairs that say 'a before b' form a directed graph.",
      "All courses can be finished exactly when there is no cycle.",
      "Count incoming edges (in-degree) for every course.",
      "Repeatedly take a course with zero in-degree, remove it, and lower the in-degree of what it unlocks.",
      "If you processed all courses, the answer is yes; leftovers mean a cycle.",
    ],
    brute: "Try every ordering of the courses and test it: n! orders. Or DFS from every course to look for cycles repeatedly: O(n * (n + e)).",
    pattern: "topo-sort",
    variation: "course-order",
    trap: "Reversing the edge direction. Write 'prerequisite -> course' on the page before coding.",
  },
  {
    id: "ex-network-delay",
    title: "How long until every node gets the signal",
    problem: "lc-743",
    statement: "A signal starts at one node and travels along directed links with given travel times. Find when the last node receives it, or -1 if some never do.",
    clues: ["cheapest-weighted", "input-edge-list", "n-1e5"],
    steps: [
      "Weights are travel times, all positive, and we want the earliest arrival at every node: shortest paths from one source.",
      "BFS ignores weights, so it is wrong here.",
      "Use Dijkstra: a min-heap of (time, node); pop the earliest, relax its outgoing edges.",
      "The answer is the largest shortest time, or -1 if some node was never reached.",
    ],
    brute: "Try every path from the source to every node: exponential. Bellman-Ford works (O(V * E)) but is slower than needed with non-negative weights.",
    pattern: "dijkstra",
    variation: "single-source",
    trap: "Taking the maximum over edges instead of over final distances, and forgetting the unreachable case.",
  },
  {
    id: "ex-redundant-connection",
    title: "The extra link that creates a loop",
    problem: "lc-684",
    statement: "A tree had one extra edge added, and now has a cycle. Return an edge you can remove so it is a tree again (the last such edge in the input).",
    clues: ["redundant-edge", "connected-groups", "input-edge-list"],
    steps: [
      "Edges arrive one by one and we ask whether two nodes are already connected.",
      "Union-find answers 'same group?' in nearly constant time.",
      "For each edge, find the roots of both ends. If they are the same, this edge closes the cycle: return it.",
      "Otherwise union them and continue.",
    ],
    brute: "For each edge, remove it and run a DFS to check the rest: O(E * (V + E)). Or run a DFS for connectivity before adding every edge.",
    pattern: "union-find",
    variation: "cycle-edge",
    trap: "Returning the first edge that looks wrong rather than the one that closes the cycle when processed in input order.",
  },
  {
    id: "ex-open-lock",
    title: "Fewest turns to open a combination lock",
    problem: "lc-752",
    statement: "A four-wheel lock starts at 0000. One move turns a single wheel by one step (9 wraps to 0). Some combinations are traps. Find the fewest moves to a target.",
    clues: ["puzzle-states", "fewest-steps", "n-tiny"],
    steps: [
      "No graph is drawn, but every combination is a state and every legal turn is an edge.",
      "There are only 10^4 states and every move costs one: shortest path is BFS.",
      "Start from 0000, generate the eight neighbours (each wheel up or down), skip trap states and visited ones.",
      "Return the depth at which you first reach the target; -1 if the queue empties.",
    ],
    brute: "Try every sequence of turns: eight choices per move, exponential. DFS can wander forever without finding the shortest one.",
    pattern: "state-space-bfs",
    variation: "lock-puzzle",
    trap: "Forgetting that the start state itself might be a trap, and not marking states visited when they are pushed.",
  },
  {
    id: "ex-subsets-ii",
    title: "All subsets when numbers can repeat",
    problem: "lc-90",
    statement: "Given numbers that may contain duplicates, return every distinct subset (as a set of values).",
    clues: ["list-all", "n-tiny", "input-array"],
    steps: [
      "List all subsets with n at most 10: backtracking over include or exclude choices.",
      "Duplicates in the input create repeated subsets.",
      "Sort the array so equal values sit together.",
      "In the loop over the next element, skip a value equal to the previous one unless it is the first choice at this depth.",
      "Save a copy of the current list at every call.",
    ],
    brute: "Generate all 2^n subsets and remove duplicates with a set of tuples. That passes small n but wastes work and memory; the backtracking with a skip rule never creates duplicates.",
    pattern: "subsets",
    variation: "subsets",
    trap: "Appending the live list instead of a copy, so every saved answer ends up equal and empty.",
  },
  {
    id: "ex-coin-change",
    title: "Fewest coins for an amount",
    problem: "lc-322",
    statement: "With unlimited coins of given values, find the fewest coins that sum to an amount, or -1 if impossible.",
    clues: ["min-items-budget", "n-5000", "input-array"],
    steps: [
      "Fewest items for an exact total, with unlimited use: unbounded knapsack.",
      "Try greedy (largest coin first) on coins [1, 3, 4] and amount 6: greedy gives 4 + 1 + 1 = 3 coins, but 3 + 3 = 2 is better. Greedy fails.",
      "State: dp[a] = fewest coins for amount a, with dp[0] = 0.",
      "dp[a] = 1 + min(dp[a - c]) over coins c <= a. Fill a from 1 up to the amount.",
      "Unreachable amounts stay infinite; return -1 for them.",
    ],
    brute: "Recursion that tries every coin at every amount: exponential, because the same remaining amounts repeat. Memoising it is the DP.",
    pattern: "knapsack",
    variation: "unbounded",
    trap: "Assuming greedy works. It only works for special coin systems (like US coins).",
  },
  {
    id: "ex-edit-distance",
    title: "Fewest edits to turn one word into another",
    problem: "lc-72",
    statement: "Count the least number of inserts, deletes and replaces that turn the first word into the second.",
    clues: ["two-string-compare", "n-5000", "input-string"],
    steps: [
      "Two strings and an optimal count of operations: a table over two prefixes.",
      "dp[i][j] = fewest edits to turn the first i letters of a into the first j letters of b.",
      "If the last letters are equal, dp[i][j] = dp[i-1][j-1].",
      "Otherwise take the cheapest of replace (diagonal), delete (up) and insert (left), plus one.",
      "Base cases: turning into or from the empty string costs the length.",
    ],
    brute: "Recursion on the last letters trying all three edits: exponential, with the same (i, j) pairs repeated.",
    pattern: "two-string-dp",
    variation: "edit-distance",
    trap: "Initialising the first row and column to 0 instead of the lengths.",
  },
  {
    id: "ex-jump-game",
    title: "Can you jump to the last index",
    problem: "lc-55",
    statement: "Each number is the longest jump from that position. Decide whether you can reach the last index from the first.",
    clues: ["safe-local-choice", "out-boolean-reach", "n-1e5"],
    steps: [
      "A yes or no about reaching the end. A DP over positions works, but look for a simpler summary.",
      "All that matters is the furthest index you can reach so far.",
      "Walk left to right: if the current index is beyond the reach, you are stuck, return false.",
      "Otherwise update reach = max(reach, i + jump). If reach covers the end, you win.",
      "The past is fully summarised by one number, so greedy is safe.",
    ],
    brute: "Try every jump length from every position with recursion: exponential. A memoised DP is O(n^2), too slow at n = 10^4 on strict limits.",
    pattern: "greedy-proof",
    variation: "reach",
    trap: "Checking only whether the last step lands exactly on the end, and not noticing that a zero blocks you when the reach is stuck at it.",
  },
  {
    id: "ex-stock-cooldown",
    title: "Buy and sell stock with a rest day",
    problem: "lc-309",
    statement: "Prices per day; you may trade many times, hold at most one share, and must wait a day after selling before buying. Find the best profit.",
    clues: ["buy-sell", "n-1e5", "input-array"],
    steps: [
      "Each day you are in one of three situations: holding a share, just sold, or resting (free to buy).",
      "Write the allowed moves: from holding you can keep or sell; from just-sold you must rest; from resting you can buy or rest.",
      "Keep one number per state: the best profit if you are in that state today.",
      "Update all three from yesterday's values, using tuple assignment so you read old values.",
      "The answer is the better of 'just sold' and 'resting' on the last day.",
    ],
    brute: "Try every buy and sell day combination with the cooldown rule: exponential, or O(n^2) pairs and still missing the interaction between trades.",
    pattern: "state-machine-dp",
    variation: "cooldown-fee",
    trap: "Starting 'holding' at 0, which lets you hold a free share. Start it at minus infinity.",
  },
  {
    id: "ex-single-number",
    title: "The one number without a pair",
    problem: "lc-136",
    statement: "Every number appears twice except one. Find it in linear time and constant space.",
    clues: ["xor-bits", "o1-space", "input-array"],
    steps: [
      "A hash map of counts works but uses O(n) space; the statement asks for O(1).",
      "XOR has a useful property: x ^ x = 0 and x ^ 0 = x, and it is order-independent.",
      "XOR all numbers: every pair cancels and only the single number remains.",
    ],
    brute: "Count each number with a hash map or sort and compare neighbours: O(n) space or O(n log n) time.",
    pattern: "bit-tricks",
    variation: "xor-cancel",
    trap: "Trying the trick when numbers appear three times (that needs per-bit counting modulo 3).",
  },
  {
    id: "ex-lru-cache",
    title: "A cache that drops the least recently used item",
    problem: "lc-146",
    statement: "Build a cache with a fixed capacity where get and put run in constant time and the least recently used key is evicted when it is full.",
    clues: ["design-class", "o1-per-op", "input-operations"],
    steps: [
      "Two operations must be O(1): look up by key, and find or remove the least recently used key.",
      "A hash map gives the lookup. For order you need to move an item to 'most recent' and drop the 'oldest' in O(1).",
      "A doubly linked list does that when you have the node, and the map gives you the node.",
      "On every get or put, move the node to the front. When over capacity, remove the tail and its map entry.",
      "Use sentinel nodes for head and tail to remove the edge cases.",
    ],
    brute: "Keep a list ordered by recency and scan it: O(n) per operation, which breaks the required O(1).",
    pattern: "lru-lfu",
    variation: "lru",
    trap: "Updating the list but not the map (or the reverse), so the two disagree after an eviction.",
  },
  {
    id: "ex-linked-cycle",
    title: "Where a linked list loops back",
    problem: "lc-142",
    statement: "Given a linked list that may contain a cycle, return the node where the cycle starts, or nothing.",
    clues: ["list-cycle-middle", "o1-space", "input-linked-list"],
    steps: [
      "A set of visited nodes finds the cycle but costs O(n) space; the follow-up asks for O(1).",
      "Move a slow pointer one step and a fast pointer two steps. If there is a cycle, they meet inside it.",
      "After they meet, reset one pointer to the head.",
      "Move both one step at a time; they meet exactly at the start of the cycle.",
    ],
    brute: "Remember every visited node in a hash set: O(n) time but O(n) space.",
    pattern: "fast-slow",
    variation: "cycle",
    trap: "Checking only fast, not fast.next, before moving two steps, and so dereferencing None at the list's end.",
  },
  {
    id: "ex-nim-game",
    title: "Who wins the take-1-to-3 stones game",
    problem: "slug:nim-game",
    statement: "A pile has n stones; two players take turns removing one to three; the one taking the last stone wins. You go first. Can you win?",
    clues: ["two-players", "riddle", "n-huge-value"],
    steps: [
      "Two players with perfect play. n can be huge, so a table over n is too heavy.",
      "Compute small cases by hand: n = 1, 2, 3 win; n = 4 loses (whatever you take, the opponent takes the rest).",
      "n = 5, 6, 7 win by leaving 4. n = 8 loses.",
      "The pattern: you lose exactly when n is a multiple of 4.",
      "The answer is n % 4 != 0, derived from a few small cases and a short proof by taking 4 - x after your opponent's x.",
    ],
    brute: "A memoised win/lose table over n is O(n); it is correct but wasteful for huge n, and writing it is how you discover the rule.",
    pattern: "brainteaser",
    variation: "small-cases",
    trap: "Guessing a rule from two cases. Compute at least the first eight and test the rule against the brute force.",
  },
  {
    id: "ex-second-highest-salary",
    title: "Second highest salary in a table",
    problem: "slug:second-highest-salary",
    statement: "Given a table of employees with salaries, return the second highest distinct salary, or null if there is none.",
    clues: ["sql-shell-threads"],
    steps: [
      "The statement gives a table and asks for a query: this is not an algorithm problem.",
      "Think in set terms: distinct salaries, order them downward, skip one, take one.",
      "Write it with DISTINCT, ORDER BY salary DESC, LIMIT 1 OFFSET 1, and wrap it so that no row gives NULL.",
      "Check the edge cases: one employee, ties for the top, an empty table.",
    ],
    brute: "There is no data structure to choose; the 'brute force' is reading the whole table, which the database does for you. The skill is writing a correct, readable query.",
    pattern: "not-algorithm",
    variation: "sql",
    trap: "Forgetting DISTINCT, so two employees tied for first make the second row the same salary.",
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Optimisation moves: "the brute force wastes X -> do Y -> pattern"
// ---------------------------------------------------------------------------------------------------------------

export interface OptimizeMove {
  waste: string;
  fix: string;
  pattern: string;
}

export const OPTIMIZE_MOVES: OptimizeMove[] = [
  { waste: "It looks up the same partner or count again and again with a nested loop.", fix: "Remember what you have seen in a hash map and ask the map once per item.", pattern: "hash-map" },
  { waste: "It recomputes the sum of the same range for many queries or many starting points.", fix: "Store running totals once; any range sum becomes a subtraction.", pattern: "prefix-sums" },
  { waste: "It applies the same update to many ranges one cell at a time.", fix: "Write the change at the two ends of the range in a difference array and sum once at the end.", pattern: "prefix-sums/difference-array" },
  { waste: "It rescans a whole window each time the window moves by one step.", fix: "Add the new item and remove the old one; keep the window content in a map or a sum.", pattern: "sliding-window" },
  { waste: "It checks every pair, but the data is sorted so one side's choice tells you which way to move.", fix: "Put pointers at both ends and move the one that can only improve the answer.", pattern: "two-pointers" },
  { waste: "It tries every possible answer value from low to high and tests each.", fix: "If feasibility flips once, binary search the answer with a greedy check.", pattern: "bs-answer" },
  { waste: "It scans for a position in sorted or rotated data from the start every time.", fix: "Halve the range each step by testing the middle.", pattern: "bs-index" },
  { waste: "It sorts everything just to get the k best, or searches for the best item again and again.", fix: "Keep a heap of the current best k; each step costs log k.", pattern: "heap-top-k" },
  { waste: "It scans right from each item to find the next bigger or smaller item.", fix: "Keep a stack of unresolved items; one pop-loop resolves many at once.", pattern: "monotonic-stack" },
  { waste: "It recomputes the maximum of every window from scratch.", fix: "Keep a deque of candidate indices in decreasing order; the front is the maximum.", pattern: "monotonic-deque" },
  { waste: "It recursively solves the same subproblem with the same arguments many times.", fix: "Name the state, cache the results (memoise) or fill a table bottom-up.", pattern: "dp-1d" },
  { waste: "It tries every split point of every range and repeats the subranges.", fix: "Let dp[l][r] be the best for a range and fill by increasing length, trying each last action.", pattern: "interval-dp" },
  { waste: "It tries every pair of positions (i, j) of two strings in a recursion.", fix: "A table over the two prefixes; each cell uses its neighbours.", pattern: "two-string-dp" },
  { waste: "It decides each item for or against under a budget with a recursion that repeats the same remaining budget.", fix: "dp over capacity; loop capacity downward for use-once, upward for reuse.", pattern: "knapsack" },
  { waste: "It tries every increasing chain, or scans all earlier items for each item (O(n^2)).", fix: "Keep the smallest tail of each length and binary search where an item goes.", pattern: "lis" },
  { waste: "It looks at all earlier states to find the best one for each state in a DP over a window.", fix: "Keep a monotonic deque of the best earlier states in the window.", pattern: "monotonic-deque/dp-window" },
  { waste: "It runs a shortest-path search from every start node, or explores the same node many times.", fix: "Search once from all sources at the same time (multi-source BFS), or use a heap so each node is settled once.", pattern: "graph-bfs/multi-source" },
  { waste: "It removes an edge and re-runs a connectivity search again and again.", fix: "Keep groups in a disjoint-set structure and merge on every new edge.", pattern: "union-find" },
  { waste: "It tries every order of tasks to find one that respects the dependencies.", fix: "Repeatedly take a task with no unmet prerequisite.", pattern: "topo-sort" },
  { waste: "It tries every subset of choices that can be combined safely, though a local rule decides it.", fix: "Find the local rule, sort by the right key, and prove it with an exchange argument.", pattern: "exchange-argument" },
  { waste: "It enumerates all subsets when n is 30 to 40.", fix: "Split into two halves, enumerate each half, and join them with a sort and a search.", pattern: "meet-in-middle" },
  { waste: "It treats all permutations as separate when only the set of used items matters.", fix: "Use a bitmask of used items as the DP state.", pattern: "bitmask-dp-subsets" },
  { waste: "It recomputes a range minimum or maximum for every query on unchanging data.", fix: "Precompute power-of-two blocks once and answer each query from two of them.", pattern: "sparse-table" },
  { waste: "It recomputes a range sum after every single change.", fix: "Keep a Fenwick or segment tree: update and query in log n.", pattern: "segment-tree" },
  { waste: "It counts pairs with an order condition by comparing every two items.", fix: "Count pairs in bulk while merging sorted halves, or use a Fenwick tree over ranks.", pattern: "merge-sort-count" },
  { waste: "It sorts the whole array to read the middle value or the k-th value once.", fix: "Partition around a pivot and keep only the side that holds position k.", pattern: "quickselect" },
  { waste: "It walks a linked list twice (to count, then to reach the middle or the n-th from the end).", fix: "Move two pointers at different speeds, or a pointer k steps ahead, in one pass.", pattern: "fast-slow" },
  { waste: "It searches a text for a pattern by restarting the comparison after each mismatch.", fix: "Use the prefix function so a mismatch resumes at the longest border.", pattern: "string-matching/kmp" },
  { waste: "It compares substrings character by character many times.", fix: "Hash every window with a rolling hash and compare numbers.", pattern: "rolling-hash" },
  { waste: "It uses a set or map for numbers that live in 1..n.", fix: "Use the array itself as the table: place each value at its home index.", pattern: "cyclic-sort" },
  { waste: "It scans all words for every prefix query.", fix: "Store the words in a trie; each query costs only its length.", pattern: "trie" },
  { waste: "It recomputes a value for every root of a tree from scratch.", fix: "Compute once for one root, then move the root across edges with an O(1) correction.", pattern: "tree-dp/reroot" },
  { waste: "It walks up from a node one parent at a time for each ancestor query.", fix: "Precompute jump tables (2^j-th ancestors) and jump in binary steps.", pattern: "binary-lifting" },
  { waste: "It counts a huge range of numbers one by one.", fix: "Count digit by digit with a flag for staying tight to the bound.", pattern: "digit-dp" },
  { waste: "It tests every number for primality, or every divisor from 1 to n.", fix: "Sieve the primes once; test divisors only up to the square root.", pattern: "number-theory/primes" },
  { waste: "It lists every item to pick one random item with the right chance.", fix: "Use prefix sums with a binary search, or reservoir sampling for a stream.", pattern: "randomized/weighted-index" },
  { waste: "It re-sorts after every insertion to read the nearest value.", fix: "Keep an ordered set and ask for floor and ceiling.", pattern: "ordered-set" },
];

