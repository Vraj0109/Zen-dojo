import type { ProblemSpec } from "./types";

// Batch 5: intervals, prefix sums, stacks, greedy, dynamic programming and bit tricks. Written for this app.

const inc = "#include <bits/stdc++.h>\nusing namespace std;\n\n";

export const LEETCODE_SPECS_5: ProblemSpec[] = [
  {
    id: "lc-1094",
    source: "leetcode",
    title: "Car Pooling",
    statement: [
      "A car has capacity empty seats and only drives east. trips[i] = [passengers, from, to] means that many passengers get in at kilometre from and get out at kilometre to.",
      "Return true if every trip can be served without ever carrying more than capacity passengers at the same time.",
    ],
    constraints: ["1 <= trips.length <= 1000", "1 <= passengers <= 100", "0 <= from < to <= 1000", "1 <= capacity <= 100000"],
    fn: { name: "carPooling", params: [{ name: "trips", type: "int[][]" }, { name: "capacity", type: "int" }], returns: "bool" },
    examples: [
      { input: [[[2, 1, 5], [3, 3, 7]], 4], output: false, explanation: "Between kilometre 3 and 5 there are 5 passengers." },
      { input: [[[2, 1, 5], [3, 3, 7]], 5], output: true },
    ],
    tests: [
      { input: [[[2, 1, 5], [3, 5, 7]], 3], output: true },
      { input: [[[3, 2, 7], [3, 7, 9], [8, 3, 9]], 11], output: true },
      { input: [[[9, 3, 4], [9, 1, 7], [4, 2, 4], [7, 4, 5]], 23], output: true },
      { input: [[[9, 3, 4], [9, 1, 7], [4, 2, 4], [7, 4, 5]], 21], output: false },
      { input: [[[5, 0, 1]], 4], output: false },
      { input: [[[1, 0, 1000]], 1], output: true },
    ],
    hints: [
      "The passenger count only changes at the start and end of a trip.",
      "Add the passengers at kilometre from and remove them at kilometre to, in an array indexed by kilometre.",
      "Sweep the array keeping a running total. If it ever exceeds capacity, return false.",
    ],
    solution: {
      idea: ["Difference array: +p at from, -p at to (people leave exactly when they arrive at to). A running sum over the kilometres is the load at each point."],
      complexity: "O(n + K) time, O(K) space, where K = 1001.",
      cpp: `${inc}class Solution {
public:
    bool carPooling(vector<vector<int>>& trips, int capacity) {
        vector<int> diff(1002, 0);
        for (auto& t : trips) { diff[t[1]] += t[0]; diff[t[2]] -= t[0]; }
        int load = 0;
        for (int d : diff) { load += d; if (load > capacity) return false; }
        return true;
    }
};
`,
    },
  },
  {
    id: "lc-1109",
    source: "leetcode",
    title: "Corporate Flight Bookings",
    statement: [
      "There are n flights numbered 1 to n. bookings[i] = [first, last, seats] reserves that many seats on every flight from first to last, inclusive.",
      "Return an array answer of length n where answer[i] is the total number of seats booked on flight i + 1.",
    ],
    constraints: ["1 <= n <= 20000", "1 <= bookings.length <= 20000", "1 <= first <= last <= n", "1 <= seats <= 10000"],
    fn: { name: "corpFlightBookings", params: [{ name: "bookings", type: "int[][]" }, { name: "n", type: "int" }], returns: "int[]" },
    examples: [
      { input: [[[1, 2, 10], [2, 3, 20], [2, 5, 25]], 5], output: [10, 55, 45, 25, 25] },
      { input: [[[1, 2, 10], [2, 2, 15]], 2], output: [10, 25] },
    ],
    tests: [
      { input: [[[1, 1, 5]], 1], output: [5] },
      { input: [[[1, 3, 2], [1, 3, 3]], 3], output: [5, 5, 5] },
      { input: [[[3, 3, 7]], 4], output: [0, 0, 7, 0] },
      { input: [[[2, 4, 1], [1, 2, 1]], 4], output: [1, 2, 1, 1] },
      { input: [[[1, 4, 3]], 4], output: [3, 3, 3, 3] },
      { input: [[[2, 2, 1], [2, 2, 1], [2, 2, 1]], 3], output: [0, 3, 0] },
    ],
    hints: [
      "Adding to every flight in a range one by one is too slow when there are 20000 bookings.",
      "Record only where a range starts (+seats) and where it ends (-seats at last + 1).",
      "The answer is the running sum of that difference array.",
    ],
    solution: {
      idea: ["Difference array. Each booking touches two cells; one prefix-sum pass produces all totals."],
      complexity: "O(n + m) time, O(n) space.",
      cpp: `${inc}class Solution {
public:
    vector<int> corpFlightBookings(vector<vector<int>>& bookings, int n) {
        vector<int> diff(n + 2, 0), ans(n);
        for (auto& b : bookings) { diff[b[0]] += b[2]; diff[b[1] + 1] -= b[2]; }
        int run = 0;
        for (int i = 1; i <= n; i++) { run += diff[i]; ans[i - 1] = run; }
        return ans;
    }
};
`,
    },
  },
  {
    id: "lc-239",
    source: "leetcode",
    title: "Sliding Window Maximum",
    statement: [
      "A window of size k slides from the left end of nums to the right end, one position at a time.",
      "Return the maximum of every window, in order.",
    ],
    constraints: ["1 <= nums.length <= 100000", "-10000 <= nums[i] <= 10000", "1 <= k <= nums.length"],
    fn: { name: "maxSlidingWindow", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returns: "int[]" },
    examples: [
      { input: [[1, 3, -1, -3, 5, 3, 6, 7], 3], output: [3, 3, 5, 5, 6, 7] },
      { input: [[1], 1], output: [1] },
    ],
    tests: [
      { input: [[1, -1], 1], output: [1, -1] },
      { input: [[9, 11], 2], output: [11] },
      { input: [[4, -2], 2], output: [4] },
      { input: [[7, 2, 4], 2], output: [7, 4] },
      { input: [[1, 3, 1, 2, 0, 5], 3], output: [3, 3, 2, 5] },
      { input: [[5, 4, 3, 2, 1], 3], output: [5, 4, 3] },
    ],
    hints: [
      "Recomputing the maximum of every window costs O(n*k): too slow for the largest input.",
      "Keep a queue of indices whose values are decreasing. The front is always the maximum of the window.",
      "Before pushing index i, pop from the back every index whose value is <= nums[i]; pop the front when it has left the window.",
    ],
    solution: {
      idea: ["Monotonic deque of indices with decreasing values. A smaller earlier element can never be the maximum once a bigger later one is in the window, so it is discarded. Each index enters and leaves once."],
      complexity: "O(n) time, O(k) space.",
      cpp: `${inc}class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        deque<int> dq;
        vector<int> ans;
        for (int i = 0; i < (int)nums.size(); i++) {
            while (!dq.empty() && dq.front() <= i - k) dq.pop_front();
            while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();
            dq.push_back(i);
            if (i >= k - 1) ans.push_back(nums[dq.front()]);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "lc-918",
    source: "leetcode",
    title: "Maximum Sum Circular Subarray",
    statement: [
      "nums is a circular array: the last element is followed by the first. Return the largest sum of a non-empty subarray of this circular array.",
      "A subarray may wrap around the end, but each element can be used at most once.",
    ],
    constraints: ["1 <= nums.length <= 30000", "-30000 <= nums[i] <= 30000"],
    fn: { name: "maxSubarraySumCircular", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[1, -2, 3, -2]], output: 3 },
      { input: [[5, -3, 5]], output: 10, explanation: "Take the last 5 and the first 5." },
      { input: [[-3, -2, -3]], output: -2 },
    ],
    tests: [
      { input: [[3, -1, 2, -1]], output: 4 },
      { input: [[2, -2, 2, 7, 8, 0]], output: 19 },
      { input: [[-2]], output: -2 },
      { input: [[1, 2, 3]], output: 6 },
      { input: [[-5, 4, -5]], output: 4 },
      { input: [[5, 5]], output: 10 },
      { input: [[-1, -2]], output: -1 },
    ],
    hints: [
      "A subarray is either in the middle (ordinary Kadane) or wraps around.",
      "A wrapping subarray is the whole array minus a middle subarray, so you want the minimum middle subarray.",
      "Answer = max(maxKadane, total - minKadane). If every number is negative, total - minKadane would be 0 (empty), so return maxKadane.",
    ],
    solution: {
      idea: ["Two Kadane passes. The best wrapping sum is total minus the smallest subarray. The special case is an all-negative array, where removing everything leaves an empty (not allowed) subarray."],
      complexity: "O(n) time, O(1) space.",
      cpp: `${inc}class Solution {
public:
    int maxSubarraySumCircular(vector<int>& nums) {
        int total = 0, curMax = 0, best = nums[0], curMin = 0, worst = nums[0];
        for (int x : nums) {
            total += x;
            curMax = max(curMax + x, x); best = max(best, curMax);
            curMin = min(curMin + x, x); worst = min(worst, curMin);
        }
        return best < 0 ? best : max(best, total - worst);
    }
};
`,
    },
  },
  {
    id: "lc-57",
    source: "leetcode",
    title: "Insert Interval",
    statement: [
      "intervals is a list of non-overlapping intervals [start, end] sorted by start. Insert newInterval and merge anything that overlaps, so the result is again sorted and non-overlapping.",
      "Intervals that only touch (such as [1,5] and [5,7]) overlap.",
    ],
    constraints: ["0 <= intervals.length <= 10000", "0 <= start <= end <= 100000", "intervals is sorted by start and has no overlaps"],
    fn: { name: "insert", params: [{ name: "intervals", type: "int[][]" }, { name: "newInterval", type: "int[]" }], returns: "int[][]" },
    examples: [
      { input: [[[1, 3], [6, 9]], [2, 5]], output: [[1, 5], [6, 9]] },
      { input: [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], output: [[1, 2], [3, 10], [12, 16]] },
    ],
    tests: [
      { input: [[], [5, 7]], output: [[5, 7]] },
      { input: [[[1, 5]], [2, 3]], output: [[1, 5]] },
      { input: [[[1, 5]], [6, 8]], output: [[1, 5], [6, 8]] },
      { input: [[[3, 5]], [1, 2]], output: [[1, 2], [3, 5]] },
      { input: [[[1, 5]], [5, 7]], output: [[1, 7]] },
      { input: [[[1, 2], [4, 5]], [0, 10]], output: [[0, 10]] },
    ],
    hints: [
      "Intervals entirely before newInterval can be copied unchanged, and so can intervals entirely after it.",
      "In the middle, every interval that overlaps newInterval shrinks into it: take the smaller start and the larger end.",
      "Three passes with one index: copy while end < new.start; merge while start <= new.end; copy the rest.",
    ],
    solution: {
      idea: ["The input is already sorted, so one linear scan is enough: left part, merged middle, right part."],
      complexity: "O(n) time, O(n) space for the answer.",
      cpp: `${inc}class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
        vector<vector<int>> out;
        size_t i = 0, n = intervals.size();
        while (i < n && intervals[i][1] < newInterval[0]) out.push_back(intervals[i++]);
        while (i < n && intervals[i][0] <= newInterval[1]) {
            newInterval[0] = min(newInterval[0], intervals[i][0]);
            newInterval[1] = max(newInterval[1], intervals[i][1]);
            i++;
        }
        out.push_back(newInterval);
        while (i < n) out.push_back(intervals[i++]);
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-435",
    source: "leetcode",
    title: "Non-overlapping Intervals",
    statement: [
      "Given a list of intervals, return the minimum number of intervals you must remove so that the remaining ones do not overlap.",
      "Intervals that only touch at an end point, like [1,2] and [2,3], do not overlap.",
    ],
    constraints: ["1 <= intervals.length <= 100000", "-50000 <= start < end <= 50000"],
    fn: { name: "eraseOverlapIntervals", params: [{ name: "intervals", type: "int[][]" }], returns: "int" },
    examples: [
      { input: [[[1, 2], [2, 3], [3, 4], [1, 3]]], output: 1, explanation: "Remove [1,3]." },
      { input: [[[1, 2], [1, 2], [1, 2]]], output: 2 },
      { input: [[[1, 2], [2, 3]]], output: 0 },
    ],
    tests: [
      { input: [[[1, 100], [11, 22], [1, 11], [2, 12]]], output: 2 },
      { input: [[[0, 2], [1, 3], [2, 4], [3, 5], [4, 6]]], output: 2 },
      { input: [[[1, 5]]], output: 0 },
      { input: [[[1, 10], [2, 3], [4, 5], [6, 7]]], output: 1 },
      { input: [[[1, 2]]], output: 0 },
      { input: [[[1, 3], [1, 3]]], output: 1 },
      { input: [[[1, 2], [2, 4], [1, 4]]], output: 1 },
      { input: [[[0, 5], [1, 2], [3, 4]]], output: 1 },
    ],
    hints: [
      "Keeping the most intervals is the same as removing the fewest.",
      "Greedy: among intervals that conflict, keep the one that ends earliest, because it leaves the most room.",
      "Sort by end. Keep an interval if its start >= the end of the last kept one; otherwise count a removal.",
    ],
    solution: {
      idea: ["Classic activity selection. Sorting by end time and always taking the interval that finishes first is optimal (an exchange argument: swapping any chosen interval for the earliest-ending one never hurts)."],
      complexity: "O(n log n) time, O(1) extra space.",
      cpp: `${inc}class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
        int removed = 0, end = INT_MIN;
        for (auto& iv : intervals) {
            if (iv[0] >= end) end = iv[1];
            else removed++;
        }
        return removed;
    }
};
`,
    },
  },
  {
    id: "lc-442",
    source: "leetcode",
    title: "Find All Duplicates in an Array",
    statement: [
      "nums has n integers, each between 1 and n, and every value appears once or twice.",
      "Return every value that appears twice, in any order. A solution that uses O(n) time and no extra memory beyond the answer is expected.",
    ],
    constraints: ["1 <= nums.length <= 100000", "1 <= nums[i] <= nums.length", "Each value appears once or twice"],
    fn: { name: "findDuplicates", params: [{ name: "nums", type: "int[]" }], returns: "int[]" },
    unordered: true,
    examples: [
      { input: [[4, 3, 2, 7, 8, 2, 3, 1]], output: [2, 3] },
      { input: [[1, 1, 2]], output: [1] },
      { input: [[1]], output: [] },
    ],
    tests: [
      { input: [[2, 2]], output: [2] },
      { input: [[1, 2, 3, 4]], output: [] },
      { input: [[3, 3, 1, 1]], output: [3, 1] },
      { input: [[5, 4, 6, 7, 9, 3, 10, 9, 5, 6]], output: [5, 6, 9] },
      { input: [[1, 1]], output: [1] },
      { input: [[3, 1, 3]], output: [3] },
      { input: [[1, 2, 3, 1, 2, 3]], output: [1, 2, 3] },
    ],
    hints: [
      "A hash set works but uses O(n) extra memory. The values are 1..n, which are valid indices.",
      "Use the array itself as a visited table: seeing value v means 'mark index v - 1'.",
      "Mark by negating nums[v - 1]. If it is already negative when you arrive, v is a duplicate.",
    ],
    solution: {
      idea: ["Because every value is a valid index, the sign of nums[v-1] can store 'v has been seen'. The second visit finds a negative number and records v."],
      complexity: "O(n) time, O(1) extra space (the array is modified).",
      cpp: `${inc}class Solution {
public:
    vector<int> findDuplicates(vector<int>& nums) {
        vector<int> out;
        for (int i = 0; i < (int)nums.size(); i++) {
            int v = abs(nums[i]);
            if (nums[v - 1] < 0) out.push_back(v);
            else nums[v - 1] = -nums[v - 1];
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-1392",
    source: "leetcode",
    title: "Longest Happy Prefix",
    statement: [
      "A happy prefix is a non-empty proper prefix of s that is also a suffix of s (proper means not the whole string).",
      "Return the longest happy prefix of s, or the empty string if there is none.",
    ],
    constraints: ["1 <= s.length <= 100000", "s has only lowercase English letters"],
    fn: { name: "longestPrefix", params: [{ name: "s", type: "string" }], returns: "string" },
    examples: [
      { input: ["level"], output: "l", explanation: "'l' is both a prefix and a suffix; 'le' and 'el' differ." },
      { input: ["ababab"], output: "abab" },
    ],
    tests: [
      { input: ["a"], output: "" },
      { input: ["abcabc"], output: "abc" },
      { input: ["aaaa"], output: "aaa" },
      { input: ["abc"], output: "" },
      { input: ["abcdabcab"], output: "ab" },
      { input: ["abab"], output: "ab" },
    ],
    hints: [
      "Comparing every prefix with the suffix of the same length is O(n^2).",
      "This is exactly the 'failure function' (pi array) of the KMP algorithm.",
      "pi[i] = length of the longest proper prefix of s[0..i] that is also its suffix. The answer is the first pi[n-1] characters.",
    ],
    solution: {
      idea: ["Build the KMP prefix function. pi[i] extends pi[i-1] if the next character matches, otherwise falls back through pi. The last value is the length of the longest happy prefix."],
      complexity: "O(n) time, O(n) space.",
      cpp: `${inc}class Solution {
public:
    string longestPrefix(string s) {
        int n = s.size();
        vector<int> pi(n, 0);
        for (int i = 1; i < n; i++) {
            int k = pi[i - 1];
            while (k > 0 && s[i] != s[k]) k = pi[k - 1];
            if (s[i] == s[k]) k++;
            pi[i] = k;
        }
        return s.substr(0, pi[n - 1]);
    }
};
`,
    },
  },
  {
    id: "lc-1011",
    source: "leetcode",
    title: "Capacity To Ship Packages Within D Days",
    statement: [
      "Packages with the given weights must be shipped in the listed order, one ship load per day. A load is a run of consecutive packages whose total weight is at most the ship's capacity.",
      "Return the smallest capacity that ships everything within days days.",
    ],
    constraints: ["1 <= days <= weights.length <= 50000", "1 <= weights[i] <= 500"],
    fn: { name: "shipWithinDays", params: [{ name: "weights", type: "int[]" }, { name: "days", type: "int" }], returns: "int" },
    examples: [
      { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5], output: 15 },
      { input: [[3, 2, 2, 4, 1, 4], 3], output: 6 },
      { input: [[1, 2, 3, 1, 1], 4], output: 3 },
    ],
    tests: [
      { input: [[10], 1], output: 10 },
      { input: [[1, 1, 1, 1], 4], output: 1 },
      { input: [[1, 1, 1, 1], 1], output: 4 },
      { input: [[5, 5, 5, 5], 2], output: 10 },
      { input: [[1, 2, 3, 4, 5], 1], output: 15 },
      { input: [[2, 2, 2, 2], 2], output: 4 },
      { input: [[7, 2, 5, 10, 8], 2], output: 18 },
      { input: [[9, 8, 7], 3], output: 9 },
    ],
    hints: [
      "If a capacity works, any larger one works too. That monotonic yes/no is a binary search signal.",
      "The capacity is at least max(weights) and at most sum(weights).",
      "For a candidate capacity, simulate greedily: start a new day whenever the next package does not fit. Count the days.",
    ],
    solution: {
      idea: ["Binary search on the answer. feasible(c) packs greedily and counts days; the smallest feasible c in [max, sum] is the answer."],
      complexity: "O(n log(sum)) time, O(1) space.",
      cpp: `${inc}class Solution {
public:
    int shipWithinDays(vector<int>& weights, int days) {
        int lo = *max_element(weights.begin(), weights.end());
        int hi = accumulate(weights.begin(), weights.end(), 0);
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2, used = 1, load = 0;
            for (int w : weights) {
                if (load + w > mid) { used++; load = 0; }
                load += w;
            }
            if (used <= days) hi = mid; else lo = mid + 1;
        }
        return lo;
    }
};
`,
    },
  },
  {
    id: "lc-410",
    source: "leetcode",
    title: "Split Array Largest Sum",
    statement: [
      "Split nums into exactly k non-empty contiguous parts. The cost of a split is the largest sum among its parts.",
      "Return the smallest possible cost.",
    ],
    constraints: ["1 <= nums.length <= 1000", "0 <= nums[i] <= 1000000", "1 <= k <= min(50, nums.length)"],
    fn: { name: "splitArray", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returns: "int" },
    examples: [
      { input: [[7, 2, 5, 10, 8], 2], output: 18, explanation: "[7,2,5] and [10,8]." },
      { input: [[1, 2, 3, 4, 5], 2], output: 9 },
    ],
    tests: [
      { input: [[1, 4, 4], 3], output: 4 },
      { input: [[5], 1], output: 5 },
      { input: [[2, 3, 1, 2, 4, 3], 5], output: 4 },
      { input: [[1, 2, 3, 4, 5], 1], output: 15 },
      { input: [[0, 0, 0], 2], output: 0 },
      { input: [[1, 2, 3], 3], output: 3 },
    ],
    hints: [
      "Ask the reverse question: can the array be split into at most k parts so that no part exceeds X?",
      "That answer is monotonic in X, so binary search X between max(nums) and sum(nums).",
      "Check X greedily: extend the current part until the next number would exceed X, then start a new part.",
    ],
    solution: {
      idea: ["Same shape as 'ship packages in D days': binary search on the maximum part sum with a greedy feasibility check. A DP over (index, parts) also works in O(n^2 k)."],
      complexity: "O(n log(sum)) time, O(1) space.",
      cpp: `${inc}class Solution {
public:
    int splitArray(vector<int>& nums, int k) {
        long long lo = *max_element(nums.begin(), nums.end()), hi = accumulate(nums.begin(), nums.end(), 0LL);
        while (lo < hi) {
            long long mid = (lo + hi) / 2, cur = 0;
            int parts = 1;
            for (int x : nums) {
                if (cur + x > mid) { parts++; cur = 0; }
                cur += x;
            }
            if (parts <= k) hi = mid; else lo = mid + 1;
        }
        return (int)lo;
    }
};
`,
    },
  },
  {
    id: "lc-179",
    source: "leetcode",
    title: "Largest Number",
    statement: [
      "Arrange the non-negative integers in nums so that, written one after another, they form the largest possible number. Return it as a string, because it can be very long.",
      "If the result would be only zeros, return \"0\".",
    ],
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 1000000000"],
    fn: { name: "largestNumber", params: [{ name: "nums", type: "int[]" }], returns: "string" },
    examples: [
      { input: [[10, 2]], output: "210" },
      { input: [[3, 30, 34, 5, 9]], output: "9534330" },
    ],
    tests: [
      { input: [[0, 0]], output: "0" },
      { input: [[1]], output: "1" },
      { input: [[20, 1]], output: "201" },
      { input: [[34323, 3432]], output: "343234323" },
      { input: [[111311, 1113]], output: "1113111311" },
      { input: [[9, 91]], output: "991" },
    ],
    hints: [
      "Sorting numerically (or alphabetically) does not work: 30 should come after 3, but 9 before 34.",
      "Decide the order of two numbers a and b by comparing the strings a+b and b+a.",
      "Sort with that comparison, join, and handle the all-zero case.",
    ],
    solution: {
      idea: ["a should come before b exactly when a+b > b+a as strings. This comparison is a valid total order, so sorting with it gives the largest concatenation."],
      complexity: "O(n log n * L) time where L is the digit count.",
      cpp: `${inc}class Solution {
public:
    string largestNumber(vector<int>& nums) {
        vector<string> s;
        for (int x : nums) s.push_back(to_string(x));
        sort(s.begin(), s.end(), [](const string& a, const string& b) { return a + b > b + a; });
        if (s[0] == "0") return "0";
        string out;
        for (auto& x : s) out += x;
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-315",
    source: "leetcode",
    title: "Count of Smaller Numbers After Self",
    statement: [
      "For every index i, count how many elements to the right of i are strictly smaller than nums[i].",
      "Return the counts as an array.",
    ],
    constraints: ["1 <= nums.length <= 100000", "-10000 <= nums[i] <= 10000"],
    fn: { name: "countSmaller", params: [{ name: "nums", type: "int[]" }], returns: "int[]" },
    examples: [
      { input: [[5, 2, 6, 1]], output: [2, 1, 1, 0] },
      { input: [[-1]], output: [0] },
      { input: [[-1, -1]], output: [0, 0] },
    ],
    tests: [
      { input: [[2, 0, 1]], output: [2, 0, 0] },
      { input: [[1, 2, 3]], output: [0, 0, 0] },
      { input: [[3, 2, 1]], output: [2, 1, 0] },
      { input: [[1, 1, 1, 0]], output: [1, 1, 1, 0] },
      { input: [[1, 0]], output: [1, 0] },
      { input: [[0, 0, 0]], output: [0, 0, 0] },
      { input: [[2, 1, 3, 0]], output: [2, 1, 1, 0] },
    ],
    hints: [
      "Checking every pair is O(n^2), too slow for 100000 numbers.",
      "Walk from the right and keep a structure that counts how many values smaller than x you have already seen.",
      "A Fenwick tree (binary indexed tree) over the value range does 'count of values < x' and 'add x' in O(log V). Shift values to make them positive.",
    ],
    solution: {
      idea: ["Process right to left. Before inserting nums[i], query the Fenwick tree for the number of inserted values smaller than it. Merge sort with index tracking is an alternative."],
      complexity: "O(n log V) time, O(V) space with V = 20001.",
      cpp: `${inc}class Solution {
public:
    vector<int> countSmaller(vector<int>& nums) {
        const int OFF = 10001, V = 20003;
        vector<int> bit(V + 1, 0), ans(nums.size());
        auto add = [&](int i) { for (; i <= V; i += i & -i) bit[i]++; };
        auto sum = [&](int i) { int s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
        for (int i = (int)nums.size() - 1; i >= 0; i--) {
            int p = nums[i] + OFF;
            ans[i] = sum(p - 1);
            add(p);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "lc-907",
    source: "leetcode",
    title: "Sum of Subarray Minimums",
    statement: [
      "For every contiguous subarray of arr, take its smallest element. Return the sum of all those minimums.",
      "The answer can be large, so return it modulo 1000000007.",
    ],
    constraints: ["1 <= arr.length <= 30000", "1 <= arr[i] <= 30000"],
    fn: { name: "sumSubarrayMins", params: [{ name: "arr", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[3, 1, 2, 4]], output: 17, explanation: "Subarray minimums: 3,1,2,4,1,1,2,1,1,1." },
      { input: [[11, 81, 94, 43, 3]], output: 444 },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[2, 2]], output: 6 },
      { input: [[1, 2, 3]], output: 10 },
      { input: [[3, 2, 1]], output: 10 },
      { input: [[1, 1, 1]], output: 6 },
      { input: [[5]], output: 5 },
      { input: [[4, 3]], output: 10 },
      { input: [[1, 5]], output: 7 },
    ],
    hints: [
      "There are about n^2 / 2 subarrays. Instead of listing them, count how many subarrays each element is the minimum of.",
      "For arr[i], find how far left (previous smaller) and how far right (next smaller or equal) it stays the minimum. The count is left * right.",
      "Use a monotonic stack to find both boundaries in O(n). Break ties on one side only, so equal values are not counted twice.",
    ],
    solution: {
      idea: ["Contribution technique: arr[i] * (i - prevLess) * (nextLessOrEqual - i). Previous strictly smaller on the left and next smaller-or-equal on the right makes every subarray choose exactly one minimum."],
      complexity: "O(n) time, O(n) space.",
      cpp: `${inc}class Solution {
public:
    int sumSubarrayMins(vector<int>& arr) {
        const long long MOD = 1'000'000'007;
        int n = arr.size();
        vector<int> left(n), right(n);
        stack<int> st;
        for (int i = 0; i < n; i++) {
            while (!st.empty() && arr[st.top()] >= arr[i]) st.pop();
            left[i] = st.empty() ? i + 1 : i - st.top();
            st.push(i);
        }
        st = stack<int>();
        for (int i = n - 1; i >= 0; i--) {
            while (!st.empty() && arr[st.top()] > arr[i]) st.pop();
            right[i] = st.empty() ? n - i : st.top() - i;
            st.push(i);
        }
        long long ans = 0;
        for (int i = 0; i < n; i++) ans = (ans + (long long)arr[i] * left[i] % MOD * right[i]) % MOD;
        return (int)ans;
    }
};
`,
    },
  },
  {
    id: "lc-227",
    source: "leetcode",
    title: "Basic Calculator II",
    statement: [
      "Evaluate an expression string made of non-negative integers, the operators + - * / and spaces. There are no parentheses.",
      "Multiplication and division happen before addition and subtraction. Division truncates toward zero. The expression is always valid and every intermediate value fits in a 32-bit integer.",
    ],
    constraints: ["1 <= s.length <= 300000", "s has digits, spaces and + - * /", "Every number is in [0, 2^31 - 1]"],
    fn: { name: "calculate", params: [{ name: "s", type: "string" }], returns: "int" },
    examples: [
      { input: ["3+2*2"], output: 7 },
      { input: [" 3/2 "], output: 1 },
      { input: [" 3+5 / 2 "], output: 5 },
    ],
    tests: [
      { input: ["14-3/2"], output: 13 },
      { input: ["1-1+1"], output: 1 },
      { input: ["2*3*4"], output: 24 },
      { input: ["100000000/1/2/3/4/5/6/7/8/9/10"], output: 27 },
      { input: ["42"], output: 42 },
      { input: ["0-2147483647"], output: -2147483647 },
    ],
    hints: [
      "Keep a stack of terms that still have to be added together.",
      "When you read a number, apply the operator that came before it: + pushes it, - pushes its negative, * and / combine it with the top of the stack.",
      "At the end the answer is the sum of the stack. You can also keep just the last term and a running total, using O(1) space.",
    ],
    solution: {
      idea: ["One pass. Remember the previous operator; when a number ends, apply that operator. Multiplication and division fix the last term immediately, addition and subtraction start a new term."],
      complexity: "O(n) time, O(1) space with a running total.",
      cpp: `${inc}class Solution {
public:
    int calculate(string s) {
        long long total = 0, last = 0, cur = 0;
        char op = '+';
        for (size_t i = 0; i <= s.size(); i++) {
            char c = i < s.size() ? s[i] : '+';
            if (isdigit(c)) { cur = cur * 10 + (c - '0'); continue; }
            if (c == ' ') continue;
            if (op == '+') { total += last; last = cur; }
            else if (op == '-') { total += last; last = -cur; }
            else if (op == '*') last *= cur;
            else last /= cur;
            op = c; cur = 0;
        }
        return (int)(total + last);
    }
};
`,
    },
  },
  {
    id: "lc-394",
    source: "leetcode",
    title: "Decode String",
    statement: [
      "An encoded string follows the rule k[text]: the text inside the brackets is repeated k times. Rules can be nested. k is a positive integer and the input is always valid.",
      "Return the decoded string.",
    ],
    constraints: ["1 <= s.length <= 30", "s has lowercase letters, digits and square brackets", "1 <= k <= 300", "The decoded length is below 100000"],
    fn: { name: "decodeString", params: [{ name: "s", type: "string" }], returns: "string" },
    examples: [
      { input: ["3[a]2[bc]"], output: "aaabcbc" },
      { input: ["3[a2[c]]"], output: "accaccacc" },
      { input: ["2[abc]3[cd]ef"], output: "abcabccdcdcdef" },
    ],
    tests: [
      { input: ["abc"], output: "abc" },
      { input: ["10[a]"], output: "aaaaaaaaaa" },
      { input: ["2[a2[b]]c"], output: "abbabbc" },
      { input: ["1[x]"], output: "x" },
      { input: ["2[a]"], output: "aa" },
      { input: ["a2[b]c"], output: "abbc" },
      { input: ["2[ab]2[cd]"], output: "ababcdcd" },
    ],
    hints: [
      "Nested brackets mean 'finish the inside first'. That is a stack.",
      "On '[', push the text built so far and the repeat count, then start fresh. On ']', pop and repeat the current text that many times.",
      "Read multi-digit numbers digit by digit: count = count * 10 + digit.",
    ],
    solution: {
      idea: ["Two stacks (or one of pairs): previous strings and repeat counts. Closing a bracket repeats the current string and appends it to the one on top."],
      complexity: "O(output length) time and space.",
      cpp: `${inc}class Solution {
public:
    string decodeString(string s) {
        vector<pair<string, int>> st;
        string cur;
        int num = 0;
        for (char c : s) {
            if (isdigit(c)) num = num * 10 + (c - '0');
            else if (c == '[') { st.push_back({cur, num}); cur.clear(); num = 0; }
            else if (c == ']') {
                auto [prev, k] = st.back(); st.pop_back();
                string rep;
                for (int i = 0; i < k; i++) rep += cur;
                cur = prev + rep;
            } else cur += c;
        }
        return cur;
    }
};
`,
    },
  },
  {
    id: "lc-621",
    source: "leetcode",
    title: "Task Scheduler",
    statement: [
      "Each letter in tasks is a task that takes one time unit. Between two runs of the same task there must be at least n other time units (they can be other tasks or idle).",
      "Return the least number of time units needed to finish all tasks.",
    ],
    constraints: ["1 <= tasks.length <= 100000", "tasks[i] is an uppercase letter A to Z", "0 <= n <= 100"],
    fn: { name: "leastInterval", params: [{ name: "tasks", type: "string[]" }, { name: "n", type: "int" }], returns: "int" },
    examples: [
      { input: [["A", "A", "A", "B", "B", "B"], 2], output: 8, explanation: "A B idle A B idle A B." },
      { input: [["A", "A", "A", "B", "B", "B"], 0], output: 6 },
      { input: [["A", "A", "A", "A", "A", "A", "B", "C", "D", "E", "F", "G"], 2], output: 16 },
    ],
    tests: [
      { input: [["A"], 5], output: 1 },
      { input: [["A", "A"], 3], output: 5 },
      { input: [["A", "B", "C", "D"], 2], output: 4 },
      { input: [["A", "A", "B", "B"], 1], output: 4 },
      { input: [["A", "B"], 0], output: 2 },
      { input: [["A", "A", "A"], 1], output: 5 },
      { input: [["A", "A", "B"], 2], output: 4 },
    ],
    hints: [
      "The most frequent task decides the shape: it needs the biggest gaps.",
      "If the most frequent task runs f times, there are f - 1 gaps of length n + 1 between them, plus a last slot.",
      "Answer = max(tasks.length, (f - 1) * (n + 1) + (number of tasks with frequency f)). Other tasks fill the gaps; if there are enough of them no idle time is needed.",
    ],
    solution: {
      idea: ["Lay the most frequent task out first, leaving n slots between copies. Everything else fits into those slots; idle time only appears if the slots outnumber the other tasks. The formula gives that bound, and the total can never be below the number of tasks."],
      complexity: "O(n) time, O(1) space.",
      cpp: `${inc}class Solution {
public:
    int leastInterval(vector<string>& tasks, int n) {
        int cnt[26] = {0};
        for (auto& t : tasks) cnt[t[0] - 'A']++;
        int f = *max_element(cnt, cnt + 26), ties = 0;
        for (int c : cnt) if (c == f) ties++;
        return max((int)tasks.size(), (f - 1) * (n + 1) + ties);
    }
};
`,
    },
  },
  {
    id: "lc-494",
    source: "leetcode",
    title: "Target Sum",
    statement: [
      "Put a + or a - sign in front of every number in nums and add them up.",
      "Return the number of different sign choices whose total equals target.",
    ],
    constraints: ["1 <= nums.length <= 20", "0 <= nums[i] <= 1000", "0 <= sum(nums) <= 1000", "-1000 <= target <= 1000"],
    fn: { name: "findTargetSumWays", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int" },
    examples: [
      { input: [[1, 1, 1, 1, 1], 3], output: 5 },
      { input: [[1], 1], output: 1 },
    ],
    tests: [
      { input: [[1], 2], output: 0 },
      { input: [[0, 0, 0], 0], output: 8 },
      { input: [[1, 2, 3], 0], output: 2 },
      { input: [[1, 0], 1], output: 2 },
      { input: [[100], -200], output: 0 },
      { input: [[2, 2], 0], output: 2 },
    ],
    hints: [
      "Trying all 2^n sign patterns works for n = 20 but a smarter model is shorter.",
      "Split the numbers into a '+' group P and a '-' group N. Then P - N = target and P + N = sum, so P = (sum + target) / 2.",
      "Count subsets of nums that add up to P with a knapsack array. If (sum + target) is odd or negative, the answer is 0. Zeros double the count, which the knapsack handles naturally.",
    ],
    solution: {
      idea: ["Reduce to subset-sum counting: dp[s] = number of ways to reach sum s, iterating each number and s downwards. Zeros are handled correctly because dp[s] += dp[s - 0] doubles it."],
      complexity: "O(n * sum) time, O(sum) space.",
      cpp: `${inc}class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (abs(target) > total || (total + target) % 2) return 0;
        int need = (total + target) / 2;
        vector<int> dp(need + 1, 0);
        dp[0] = 1;
        for (int x : nums)
            for (int s = need; s >= x; s--) dp[s] += dp[s - x];
        return dp[need];
    }
};
`,
    },
  },
  {
    id: "lc-221",
    source: "leetcode",
    title: "Maximal Square",
    statement: [
      "matrix is a grid of 0s and 1s. Find the largest square that contains only 1s and return its area.",
    ],
    constraints: ["1 <= rows, columns <= 300", "matrix[i][j] is 0 or 1"],
    fn: { name: "maximalSquare", params: [{ name: "matrix", type: "int[][]" }], returns: "int" },
    examples: [
      { input: [[[1, 0, 1, 0, 0], [1, 0, 1, 1, 1], [1, 1, 1, 1, 1], [1, 0, 0, 1, 0]]], output: 4 },
      { input: [[[0, 1], [1, 0]]], output: 1 },
      { input: [[[0]]], output: 0 },
    ],
    tests: [
      { input: [[[1]]], output: 1 },
      { input: [[[1, 1], [1, 1]]], output: 4 },
      { input: [[[1, 1, 1], [1, 1, 1], [1, 1, 1]]], output: 9 },
      { input: [[[1, 1, 1, 1], [1, 1, 1, 1]]], output: 4 },
      { input: [[[0, 0], [0, 0]]], output: 0 },
      { input: [[[1, 0], [1, 1]]], output: 1 },
    ],
    hints: [
      "Let dp[i][j] be the side of the largest all-ones square whose bottom-right corner is (i, j).",
      "If matrix[i][j] is 0, dp[i][j] = 0. Otherwise it depends on the three neighbours above, left and diagonal.",
      "dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]). The answer is the largest dp value, squared.",
    ],
    solution: {
      idea: ["The three neighbours each limit how far the square can grow in one direction; the smallest of them is the safe side length."],
      complexity: "O(rows * cols) time, O(cols) space with a rolling row.",
      cpp: `${inc}class Solution {
public:
    int maximalSquare(vector<vector<int>>& matrix) {
        int R = matrix.size(), C = matrix[0].size(), best = 0;
        vector<vector<int>> dp(R + 1, vector<int>(C + 1, 0));
        for (int i = 1; i <= R; i++)
            for (int j = 1; j <= C; j++)
                if (matrix[i - 1][j - 1] == 1) {
                    dp[i][j] = 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
                    best = max(best, dp[i][j]);
                }
        return best * best;
    }
};
`,
    },
  },
  {
    id: "lc-309",
    source: "leetcode",
    title: "Best Time to Buy and Sell Stock with Cooldown",
    statement: [
      "prices[i] is a stock price on day i. You may buy and sell as often as you like, holding at most one share at a time.",
      "After you sell, you cannot buy on the next day (a one-day cooldown). Return the maximum profit.",
    ],
    constraints: ["1 <= prices.length <= 5000", "0 <= prices[i] <= 1000"],
    fn: { name: "maxProfit", params: [{ name: "prices", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[1, 2, 3, 0, 2]], output: 3, explanation: "Buy 1, sell 2, cool down, buy 0, sell 2." },
      { input: [[1]], output: 0 },
    ],
    tests: [
      { input: [[2, 1]], output: 0 },
      { input: [[1, 2, 4]], output: 3 },
      { input: [[6, 1, 3, 2, 4, 7]], output: 6 },
      { input: [[1, 4, 2]], output: 3 },
      { input: [[1, 2]], output: 1 },
      { input: [[3, 3, 3]], output: 0 },
    ],
    hints: [
      "Think of the day as a state machine: holding a share, just sold (cooldown), or resting with no share.",
      "hold = max(hold, rest - price); sold = hold + price; rest = max(rest, previous sold).",
      "Update the three values each day, using the previous day's values. The answer is max(sold, rest) on the last day.",
    ],
    solution: {
      idea: ["Three-state DP rolled into three variables. The cooldown is enforced because you can only buy from the 'rest' state, which you reach one day after selling."],
      complexity: "O(n) time, O(1) space.",
      cpp: `${inc}class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int hold = INT_MIN / 2, sold = 0, rest = 0;
        for (int p : prices) {
            int prevSold = sold;
            sold = hold + p;
            hold = max(hold, rest - p);
            rest = max(rest, prevSold);
        }
        return max(sold, rest);
    }
};
`,
    },
  },
  {
    id: "lc-763",
    source: "leetcode",
    title: "Partition Labels",
    statement: [
      "Cut the string s into as many pieces as possible so that every letter appears in at most one piece.",
      "Return the sizes of the pieces in order.",
    ],
    constraints: ["1 <= s.length <= 500", "s has only lowercase English letters"],
    fn: { name: "partitionLabels", params: [{ name: "s", type: "string" }], returns: "int[]" },
    examples: [
      { input: ["ababcbacadefegdehijhklij"], output: [9, 7, 8], explanation: "ababcbaca, defegde, hijhklij." },
      { input: ["eccbbbbdec"], output: [10] },
    ],
    tests: [
      { input: ["a"], output: [1] },
      { input: ["abc"], output: [1, 1, 1] },
      { input: ["aab"], output: [2, 1] },
      { input: ["abab"], output: [4] },
      { input: ["aa"], output: [2] },
      { input: ["abca"], output: [4] },
      { input: ["abcd"], output: [1, 1, 1, 1] },
    ],
    hints: [
      "If a letter appears in a piece, the piece must reach that letter's last occurrence.",
      "Record the last index of every letter first.",
      "Scan left to right keeping the farthest last-index seen; when the scan reaches it, the piece ends.",
    ],
    solution: {
      idea: ["Greedy with last occurrences. The end of the current piece is the maximum last occurrence of any letter inside it; when i reaches that end, cut."],
      complexity: "O(n) time, O(1) space.",
      cpp: `${inc}class Solution {
public:
    vector<int> partitionLabels(string s) {
        int last[26];
        for (int i = 0; i < (int)s.size(); i++) last[s[i] - 'a'] = i;
        vector<int> out;
        int start = 0, end = 0;
        for (int i = 0; i < (int)s.size(); i++) {
            end = max(end, last[s[i] - 'a']);
            if (i == end) { out.push_back(end - start + 1); start = i + 1; }
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-452",
    source: "leetcode",
    title: "Minimum Number of Arrows to Burst Balloons",
    statement: [
      "Each balloon is a horizontal segment points[i] = [xstart, xend]. An arrow shot straight up at position x bursts every balloon with xstart <= x <= xend.",
      "Return the fewest arrows that burst all balloons.",
    ],
    constraints: ["1 <= points.length <= 100000", "-2147483648 <= xstart < xend <= 2147483647"],
    fn: { name: "findMinArrowShots", params: [{ name: "points", type: "int[][]" }], returns: "int" },
    examples: [
      { input: [[[10, 16], [2, 8], [1, 6], [7, 12]]], output: 2 },
      { input: [[[1, 2], [3, 4], [5, 6], [7, 8]]], output: 4 },
      { input: [[[1, 2], [2, 3], [3, 4], [4, 5]]], output: 2 },
    ],
    tests: [
      { input: [[[1, 2]]], output: 1 },
      { input: [[[2, 3], [2, 3]]], output: 1 },
      { input: [[[-2147483648, 2147483647]]], output: 1 },
      { input: [[[-2147483648, 0], [0, 2147483647]]], output: 1 },
      { input: [[[1, 10], [2, 3], [4, 5]]], output: 2 },
      { input: [[[1, 2], [3, 4]]], output: 2 },
    ],
    hints: [
      "Like choosing non-overlapping intervals, but touching balloons can share an arrow.",
      "Sort by the end of each balloon and shoot at the end of the first one.",
      "That arrow also bursts every balloon whose start is <= it. Skip those; the next balloon starts a new arrow. Beware overflow when you compare 32-bit extremes: use long long or compare instead of subtracting.",
    ],
    solution: {
      idea: ["Sort by end; shoot at the earliest end. Any balloon starting at or before that point is already burst. This is the same exchange argument as activity selection."],
      complexity: "O(n log n) time, O(1) extra space.",
      cpp: `${inc}class Solution {
public:
    int findMinArrowShots(vector<vector<int>>& points) {
        sort(points.begin(), points.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
        int arrows = 1;
        long long pos = points[0][1];
        for (auto& p : points)
            if (p[0] > pos) { arrows++; pos = p[1]; }
        return arrows;
    }
};
`,
    },
  },
  {
    id: "lc-136",
    source: "leetcode",
    title: "Single Number",
    statement: [
      "Every number in nums appears twice except one, which appears once. Return that one.",
      "Aim for linear time and constant extra memory.",
    ],
    constraints: ["1 <= nums.length <= 30000", "-30000 <= nums[i] <= 30000", "Exactly one number appears once"],
    fn: { name: "singleNumber", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[2, 2, 1]], output: 1 },
      { input: [[4, 1, 2, 1, 2]], output: 4 },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[-1, -1, -2]], output: -2 },
      { input: [[0, 5, 0]], output: 5 },
      { input: [[7, 3, 7, 3, 9, 8, 8]], output: 9 },
      { input: [[3, 3, 5]], output: 5 },
      { input: [[10, 20, 10]], output: 20 },
    ],
    hints: [
      "A hash map of counts works but uses O(n) memory.",
      "XOR has two useful properties: x ^ x = 0 and x ^ 0 = x.",
      "XOR all numbers together. Pairs cancel and the single number is left.",
    ],
    solution: {
      idea: ["XOR is commutative and associative, so the order does not matter and every pair cancels to 0."],
      complexity: "O(n) time, O(1) space.",
      cpp: `${inc}class Solution {
public:
    int singleNumber(vector<int>& nums) {
        int r = 0;
        for (int x : nums) r ^= x;
        return r;
    }
};
`,
    },
  },
  {
    id: "lc-338",
    source: "leetcode",
    title: "Counting Bits",
    statement: [
      "For every number from 0 to n, count the 1 bits in its binary form. Return the counts as an array of length n + 1.",
      "Try to do it in O(n) total, not O(n log n).",
    ],
    constraints: ["0 <= n <= 100000"],
    fn: { name: "countBits", params: [{ name: "n", type: "int" }], returns: "int[]" },
    examples: [
      { input: [2], output: [0, 1, 1] },
      { input: [5], output: [0, 1, 1, 2, 1, 2] },
    ],
    tests: [
      { input: [0], output: [0] },
      { input: [1], output: [0, 1] },
      { input: [8], output: [0, 1, 1, 2, 1, 2, 2, 3, 1] },
      { input: [16], output: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1] },
      { input: [3], output: [0, 1, 1, 2] },
      { input: [4], output: [0, 1, 1, 2, 1] },
    ],
    hints: [
      "Counting bits of each number separately costs O(log n) each.",
      "Compare i with i >> 1: it is the same number without its last bit.",
      "bits[i] = bits[i >> 1] + (i & 1).",
    ],
    solution: {
      idea: ["Dynamic programming over the binary representation: dropping the lowest bit gives a smaller number whose answer is already known."],
      complexity: "O(n) time, O(n) space for the answer.",
      cpp: `${inc}class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> bits(n + 1, 0);
        for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
        return bits;
    }
};
`,
    },
  },
  {
    id: "lc-260",
    source: "leetcode",
    title: "Single Number III",
    statement: [
      "Exactly two numbers in nums appear once; every other number appears twice. Return the two single numbers, in any order.",
      "Use linear time and constant extra space.",
    ],
    constraints: ["2 <= nums.length <= 30000", "-2147483648 <= nums[i] <= 2147483647", "Exactly two numbers appear once"],
    fn: { name: "singleNumber", params: [{ name: "nums", type: "int[]" }], returns: "int[]" },
    unordered: true,
    examples: [
      { input: [[1, 2, 1, 3, 2, 5]], output: [3, 5] },
      { input: [[-1, 0]], output: [-1, 0] },
    ],
    tests: [
      { input: [[0, 1]], output: [0, 1] },
      { input: [[4, 4, 9, 6]], output: [9, 6] },
      { input: [[2147483647, -2147483648]], output: [2147483647, -2147483648] },
      { input: [[1, 1, 2, 2, 3, 4]], output: [3, 4] },
      { input: [[1, 1, 2, 3]], output: [2, 3] },
      { input: [[5, 6]], output: [5, 6] },
    ],
    hints: [
      "XOR of everything gives a ^ b, where a and b are the two singles. It is not zero, so a and b differ in some bit.",
      "Pick any set bit of a ^ b. It splits all numbers into two groups; a and b land in different groups.",
      "XOR each group separately. Pairs stay together and cancel, so each group leaves one single. Beware overflow when isolating the lowest set bit of INT_MIN: use long long.",
    ],
    solution: {
      idea: ["Partition by a bit where the singles differ, then apply the XOR trick to each half. The lowest set bit is x & -x (computed in 64 bits to avoid overflow on INT_MIN)."],
      complexity: "O(n) time, O(1) space.",
      cpp: `${inc}class Solution {
public:
    vector<int> singleNumber(vector<int>& nums) {
        long long x = 0;
        for (int v : nums) x ^= v;
        long long bit = x & -x;
        int a = 0, b = 0;
        for (int v : nums) {
            if ((long long)v & bit) a ^= v; else b ^= v;
        }
        return {a, b};
    }
};
`,
    },
  },
  {
    id: "lc-474",
    source: "leetcode",
    title: "Ones and Zeroes",
    statement: [
      "strs is a list of binary strings. Choose as many of them as possible so that together they contain at most m zeros and at most n ones.",
      "Return the size of the largest such subset.",
    ],
    constraints: ["1 <= strs.length <= 600", "1 <= strs[i].length <= 100", "strs[i] has only '0' and '1'", "1 <= m, n <= 100"],
    fn: { name: "findMaxForm", params: [{ name: "strs", type: "string[]" }, { name: "m", type: "int" }, { name: "n", type: "int" }], returns: "int" },
    examples: [
      { input: [["10", "0001", "111001", "1", "0"], 5, 3], output: 4, explanation: "10, 0001, 1, 0." },
      { input: [["10", "0", "1"], 1, 1], output: 2 },
    ],
    tests: [
      { input: [["0"], 1, 0], output: 1 },
      { input: [["1"], 1, 0], output: 0 },
      { input: [["00", "11", "01"], 2, 2], output: 2 },
      { input: [["0", "0", "0"], 2, 5], output: 2 },
      { input: [["10", "01"], 1, 1], output: 1 },
      { input: [["1", "1"], 0, 1], output: 1 },
    ],
    hints: [
      "Each string is an item with two costs (zeros, ones) and value 1: a 0/1 knapsack with two capacities.",
      "dp[i][j] = the most strings you can take using at most i zeros and j ones.",
      "For each string with z zeros and o ones, update dp from the bottom-right down to (z, o): dp[i][j] = max(dp[i][j], dp[i-z][j-o] + 1).",
    ],
    solution: {
      idea: ["Two-dimensional 0/1 knapsack. Iterating both dimensions downwards ensures each string is used at most once."],
      complexity: "O(len * m * n) time, O(m * n) space.",
      cpp: `${inc}class Solution {
public:
    int findMaxForm(vector<string>& strs, int m, int n) {
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
        for (auto& s : strs) {
            int z = count(s.begin(), s.end(), '0'), o = (int)s.size() - z;
            for (int i = m; i >= z; i--)
                for (int j = n; j >= o; j--) dp[i][j] = max(dp[i][j], dp[i - z][j - o] + 1);
        }
        return dp[m][n];
    }
};
`,
    },
  },
  {
    id: "lc-354",
    source: "leetcode",
    title: "Russian Doll Envelopes",
    statement: [
      "envelopes[i] = [width, height]. One envelope fits inside another only if both its width and its height are strictly smaller.",
      "Return the largest number of envelopes you can nest like Russian dolls. Rotating is not allowed.",
    ],
    constraints: ["1 <= envelopes.length <= 100000", "1 <= width, height <= 100000"],
    fn: { name: "maxEnvelopes", params: [{ name: "envelopes", type: "int[][]" }], returns: "int" },
    examples: [
      { input: [[[5, 4], [6, 4], [6, 7], [2, 3]]], output: 3, explanation: "[2,3] -> [5,4] -> [6,7]." },
      { input: [[[1, 1], [1, 1], [1, 1]]], output: 1 },
    ],
    tests: [
      { input: [[[1, 2]]], output: 1 },
      { input: [[[4, 5], [4, 6], [6, 7], [2, 3], [1, 1]]], output: 4 },
      { input: [[[1, 3], [3, 5], [6, 7], [6, 8], [8, 4], [9, 5]]], output: 3 },
      { input: [[[2, 100], [3, 200], [4, 300], [5, 500], [5, 400], [5, 250], [6, 370], [6, 360], [7, 380]]], output: 5 },
      { input: [[[1, 1], [2, 2]]], output: 2 },
      { input: [[[1, 1], [1, 2]]], output: 1 },
    ],
    hints: [
      "Two dimensions are hard; sort by width to remove one of them.",
      "After sorting by width, the problem is the longest strictly increasing subsequence of heights.",
      "For equal widths, sort heights in decreasing order so two envelopes of the same width cannot both be chosen. Then use the O(n log n) LIS with binary search.",
    ],
    solution: {
      idea: ["Sort by width ascending and height descending on ties, then run patience-sorting LIS on the heights. The descending tie-break stops equal widths from chaining."],
      complexity: "O(n log n) time, O(n) space.",
      cpp: `${inc}class Solution {
public:
    int maxEnvelopes(vector<vector<int>>& envelopes) {
        sort(envelopes.begin(), envelopes.end(), [](auto& a, auto& b) { return a[0] != b[0] ? a[0] < b[0] : a[1] > b[1]; });
        vector<int> tails;
        for (auto& e : envelopes) {
            auto it = lower_bound(tails.begin(), tails.end(), e[1]);
            if (it == tails.end()) tails.push_back(e[1]); else *it = e[1];
        }
        return (int)tails.size();
    }
};
`,
    },
  },
  {
    id: "lc-673",
    source: "leetcode",
    title: "Number of Longest Increasing Subsequence",
    statement: [
      "Return how many different longest strictly increasing subsequences nums has. Subsequences are different when they use different index sets.",
    ],
    constraints: ["1 <= nums.length <= 2000", "-1000000 <= nums[i] <= 1000000", "The answer fits in a 32-bit integer"],
    fn: { name: "findNumberOfLIS", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[1, 3, 5, 4, 7]], output: 2, explanation: "1,3,5,7 and 1,3,4,7." },
      { input: [[2, 2, 2, 2, 2]], output: 5 },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[1, 2, 4, 3, 5, 4, 7, 2]], output: 3 },
      { input: [[3, 2, 1]], output: 3 },
      { input: [[1, 2, 3]], output: 1 },
      { input: [[1, 1, 2]], output: 2 },
      { input: [[5]], output: 1 },
    ],
    hints: [
      "Track two numbers per index: the length of the longest increasing subsequence ending there, and how many have that length.",
      "For each j < i with nums[j] < nums[i]: if len[j] + 1 is longer, copy count[j]; if equal, add count[j].",
      "At the end, sum count[i] over every i whose len[i] is the overall maximum.",
    ],
    solution: {
      idea: ["O(n^2) DP with a length array and a count array. The count for i is the sum of counts of the best predecessors."],
      complexity: "O(n^2) time, O(n) space.",
      cpp: `${inc}class Solution {
public:
    int findNumberOfLIS(vector<int>& nums) {
        int n = nums.size(), best = 0, ans = 0;
        vector<int> len(n, 1), cnt(n, 1);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] >= nums[i]) continue;
                if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; }
                else if (len[j] + 1 == len[i]) cnt[i] += cnt[j];
            }
            best = max(best, len[i]);
        }
        for (int i = 0; i < n; i++) if (len[i] == best) ans += cnt[i];
        return ans;
    }
};
`,
    },
  },
  {
    id: "lc-312",
    source: "leetcode",
    title: "Burst Balloons",
    statement: [
      "Balloon i carries the number nums[i]. Bursting balloon i earns nums[i - 1] * nums[i] * nums[i + 1] coins, where i - 1 and i + 1 are its current neighbours. A neighbour that is off the end counts as a balloon with value 1.",
      "Return the maximum coins you can collect by bursting all balloons in the best order.",
    ],
    constraints: ["1 <= nums.length <= 300", "0 <= nums[i] <= 100"],
    fn: { name: "maxCoins", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[3, 1, 5, 8]], output: 167 },
      { input: [[1, 5]], output: 10 },
    ],
    tests: [
      { input: [[7]], output: 7 },
      { input: [[3, 1]], output: 6 },
      { input: [[0, 0]], output: 0 },
      { input: [[2, 3, 4]], output: 36 },
      { input: [[1, 1, 1]], output: 3 },
      { input: [[0]], output: 0 },
      { input: [[1, 2, 3]], output: 12 },
    ],
    hints: [
      "Thinking about which balloon to burst first is hard, because neighbours keep changing.",
      "Think about the last balloon k to burst inside a range (i, j). When it bursts, its neighbours are the range ends i and j.",
      "dp[i][j] = max over k in (i, j) of dp[i][k] + dp[k][j] + a[i] * a[k] * a[j], with a padded by 1 on both ends.",
    ],
    solution: {
      idea: ["Interval DP choosing the last balloon in each open interval. Each side is independent because k separates them. The recurrence is cubic."],
      complexity: "O(n^3) time, O(n^2) space.",
      cpp: `${inc}class Solution {
public:
    int maxCoins(vector<int>& nums) {
        vector<int> a = {1};
        for (int x : nums) a.push_back(x);
        a.push_back(1);
        int n = a.size();
        vector<vector<int>> dp(n, vector<int>(n, 0));
        for (int len = 2; len < n; len++)
            for (int i = 0; i + len < n; i++) {
                int j = i + len;
                for (int k = i + 1; k < j; k++)
                    dp[i][j] = max(dp[i][j], dp[i][k] + dp[k][j] + a[i] * a[k] * a[j]);
            }
        return dp[0][n - 1];
    }
};
`,
    },
  },
];
