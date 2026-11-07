import type { PatternGuide } from "./types";

// DSA pattern guides: arrays/strings/hashing and searching/sorting. Templates are C++.

export const DSA_GUIDES_A: Record<string, PatternGuide> = {
  "hash-map": {
    idea: "Trade memory for time: store what you've seen (values, counts, first index) in a hash map so each later question ('have I seen the complement?', 'how many times?') is O(1) instead of a rescan. Most O(n²) pair searches become O(n) this way.",
    signals: [
      "Find a pair/triple with a target sum, difference or product",
      "Count frequencies, find duplicates, or the first unique element",
      "Group items that are 'the same' under some key (anagrams, same pattern)",
      "Subarray with sum/xor equal to k (combine with prefix sums)",
    ],
    steps: [
      "Decide what the key is (the value, a sorted string, a count signature, a prefix sum) and what you store (index, count, list).",
      "Single pass: for each element, first query the map for what you need, then insert the current element (order matters for 'two different indices').",
      "For grouping, build a canonical key: sorted string or a 26-count tuple joined into a string.",
    ],
    template: `// Two Sum: one pass, look up the complement before inserting.
vector<int> twoSum(vector<int>& a, int target) {
    unordered_map<int, int> seen;            // value -> index
    for (int i = 0; i < (int)a.size(); i++) {
        auto it = seen.find(target - a[i]);
        if (it != seen.end()) return {it->second, i};
        seen[a[i]] = i;
    }
    return {};
}

// Grouping by a canonical key (Group Anagrams).
vector<vector<string>> groupAnagrams(vector<string>& words) {
    unordered_map<string, vector<string>> groups;
    for (auto& w : words) {
        string key = w;
        sort(key.begin(), key.end());        // or a 26-count signature for O(L)
        groups[key].push_back(w);
    }
    vector<vector<string>> out;
    for (auto& [k, g] : groups) out.push_back(move(g));
    return out;
}`,
    complexity: "O(n) time on average, O(n) extra space. Sorting-based keys add O(L log L) per string.",
    variations: [
      "Top K Frequent (347): count with a map, then bucket sort by frequency (O(n)) or a size-k min-heap (O(n log k)).",
      "Subarray Sum Equals K (560): map of prefix sum → count; answer += count[prefix − k]. Seed count[0] = 1.",
      "Longest consecutive sequence: put everything in a set, only start counting from x where x−1 isn't in the set.",
    ],
    pitfalls: [
      "Inserting before checking, so an element pairs with itself.",
      "unordered_map with pair/vector keys needs a custom hash; encode to a string or use map.",
      "Adversarial inputs can make unordered_map O(n) per op; on Codeforces-style judges add a custom hash or reserve().",
    ],
    recap: ["Check the map for the complement, then insert yourself.", "Grouping = canonical key (sorted string or count signature).", "Prefix sum + map counts subarrays with a target sum; seed {0: 1}."],
  },

  "prefix-sums": {
    idea: "Precompute running totals so any range sum is a subtraction: sum(l..r) = P[r+1] − P[l]. The mirror trick, a difference array, turns many range updates into O(1) each, then one prefix pass applies them all.",
    signals: [
      "Many range-sum queries on a static array",
      "Many 'add v to every element in [l, r]' updates, then read the final array",
      "Subarray sums equal to / divisible by k (prefix + hash map)",
      "Product of everything except me (prefix and suffix products)",
    ],
    steps: [
      "Build P with P[0] = 0 and P[i+1] = P[i] + a[i] (size n+1 avoids edge cases).",
      "Range sum [l, r] = P[r+1] − P[l].",
      "Difference array: diff[l] += v, diff[r+1] −= v; final a[i] = prefix sum of diff up to i.",
      "2D: P[i+1][j+1] = a[i][j] + P[i][j+1] + P[i+1][j] − P[i][j]; query with inclusion-exclusion.",
    ],
    template: `// 1D prefix sums
vector<long long> P(n + 1, 0);
for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
auto rangeSum = [&](int l, int r) { return P[r + 1] - P[l]; };   // inclusive l..r

// Difference array: apply many range additions in O(1) each
vector<long long> diff(n + 1, 0);
for (auto& [l, r, v] : updates) { diff[l] += v; diff[r + 1] -= v; }
for (int i = 0, run = 0; i < n; i++) { run += diff[i]; a[i] += run; }

// Count subarrays with sum k
int countK(vector<int>& a, int k) {
    unordered_map<long long, int> cnt{{0, 1}};
    long long s = 0; int ans = 0;
    for (int x : a) { s += x; if (cnt.count(s - k)) ans += cnt[s - k]; cnt[s]++; }
    return ans;
}`,
    complexity: "O(n) build, O(1) per query or update; O(n) space. 2D is O(rows × cols) build.",
    variations: [
      "Car Pooling (1094) / Corporate Flight Bookings (1109): difference array over stops or flights, then check capacity during the prefix pass.",
      "Product of Array Except Self (238): left products in the output array, then multiply by a running right product; no division.",
      "Subarray sum divisible by k: map over (prefix mod k + k) mod k.",
    ],
    pitfalls: ["Off-by-one: use size n+1 and P[r+1] − P[l].", "Overflow: use long long for sums.", "Negative mod in C++: normalize with ((s % k) + k) % k."],
    recap: ["sum(l..r) = P[r+1] − P[l], P has n+1 entries.", "Range add: diff[l] += v, diff[r+1] −= v, then prefix-sum.", "Prefix + hash map counts subarrays with sum k."],
  },

  "two-pointers": {
    idea: "Two indices move through the data so each step discards candidates you can prove are useless. On a sorted array, if the sum is too small move the left pointer up, if too big move the right one down: O(n) instead of checking all pairs.",
    signals: ["Sorted array (or you can sort) and you want pairs/triples with a target", "In-place edits: remove duplicates, move zeros, partition", "Compare from both ends: palindromes, container/area problems", "Merge two sorted sequences"],
    steps: [
      "Opposite ends: l = 0, r = n−1; compare, then move the pointer whose move can improve the answer.",
      "Same direction (read/write): r scans everything, w marks where the next kept element goes.",
      "For k-sum, fix the first element(s) in a loop and run two pointers on the rest; skip equal values to avoid duplicate answers.",
    ],
    template: `// 3Sum: sort, fix i, two pointers on the rest, skip duplicates.
vector<vector<int>> threeSum(vector<int>& a) {
    sort(a.begin(), a.end());
    vector<vector<int>> res;
    int n = a.size();
    for (int i = 0; i < n - 2; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;
        int l = i + 1, r = n - 1;
        while (l < r) {
            int s = a[i] + a[l] + a[r];
            if (s < 0) l++;
            else if (s > 0) r--;
            else {
                res.push_back({a[i], a[l], a[r]});
                while (l < r && a[l] == a[l + 1]) l++;
                while (l < r && a[r] == a[r - 1]) r--;
                l++; r--;
            }
        }
    }
    return res;
}

// Read/write pointers: remove duplicates in place from a sorted array.
int removeDuplicates(vector<int>& a) {
    int w = 0;
    for (int r = 0; r < (int)a.size(); r++)
        if (w == 0 || a[r] != a[w - 1]) a[w++] = a[r];
    return w;
}`,
    complexity: "O(n) per pass (O(n²) for 3Sum, O(n log n) if you sort first); O(1) extra space.",
    variations: [
      "Container With Most Water (11): move the shorter wall; the taller one can't do better with a narrower width.",
      "Trapping Rain Water (42): two pointers with leftMax/rightMax; water at the lower side = its max − height.",
      "Dutch national flag (Sort Colors): three pointers low/mid/high.",
    ],
    pitfalls: ["Forgetting to skip duplicates in k-sum.", "Using two pointers on unsorted data where the monotonic argument doesn't hold.", "Integer overflow in 4Sum: cast to long long."],
    recap: ["Sorted + pairs → two pointers from both ends.", "Move the pointer that can still improve the answer (prove why).", "Read/write pointers for in-place filtering."],
  },

  "sliding-window": {
    idea: "Maintain a window [l, r] and its summary (counts, sum, distinct) incrementally: extend r every step, and shrink l while the window breaks the rule. Every element enters and leaves once, so it's O(n).",
    signals: ["Longest/shortest contiguous subarray or substring satisfying a condition", "At most / exactly k distinct, k replacements, sum ≥ target with non-negative numbers", "Fixed window size k (averages, max of each window)"],
    steps: [
      "Variable window: for r in 0..n−1 add a[r]; while window invalid, remove a[l++]; update the answer (longest after shrinking, shortest while valid).",
      "Fixed window: add a[r]; once r ≥ k−1 record the answer and remove a[r−k+1].",
      "'Exactly k' = atMost(k) − atMost(k−1).",
    ],
    template: `// Longest substring without repeating characters
int lengthOfLongestSubstring(const string& s) {
    vector<int> cnt(256, 0);
    int best = 0;
    for (int l = 0, r = 0; r < (int)s.size(); r++) {
        cnt[(unsigned char)s[r]]++;
        while (cnt[(unsigned char)s[r]] > 1) cnt[(unsigned char)s[l++]]--;
        best = max(best, r - l + 1);
    }
    return best;
}

// Minimum window containing all chars of t (shrink while valid)
string minWindow(const string& s, const string& t) {
    vector<int> need(128, 0);
    for (char c : t) need[c]++;
    int missing = t.size(), bestL = 0, bestLen = INT_MAX;
    for (int l = 0, r = 0; r < (int)s.size(); r++) {
        if (need[s[r]]-- > 0) missing--;
        while (missing == 0) {
            if (r - l + 1 < bestLen) { bestLen = r - l + 1; bestL = l; }
            if (++need[s[l++]] > 0) missing++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestL, bestLen);
}`,
    complexity: "O(n) time (each index enters and leaves once); O(alphabet) or O(k) space.",
    variations: [
      "Fruit Into Baskets (904): longest window with at most 2 distinct values.",
      "Sliding Window Maximum (239): fixed window + monotonic deque of indices.",
      "Negative numbers break the 'shrink while sum too big' logic; use prefix sums + map or a deque on prefix sums instead.",
    ],
    pitfalls: ["Applying it when shrinking doesn't monotonically fix the condition (negatives).", "Updating the answer in the wrong place (before vs after shrinking).", "Using a map when a fixed array of 26/128 is faster."],
    recap: ["Expand r always; shrink l while invalid; answer after shrink (longest) or inside the loop (shortest).", "Exactly k = atMost(k) − atMost(k−1).", "Needs monotonicity: negatives break it."],
  },

  kadane: {
    idea: "Best subarray ending at i is either a[i] alone or a[i] appended to the best subarray ending at i−1. Track that running value and the global best: O(n), O(1).",
    signals: ["Maximum (or minimum) sum/product of a contiguous subarray", "Circular array max subarray", "'Best segment' where each element extends or restarts"],
    steps: [
      "cur = max(a[i], cur + a[i]); best = max(best, cur).",
      "For products, track both max and min ending here (a negative flips them).",
      "Circular: answer = max(normal max, total − min subarray), unless all numbers are negative.",
    ],
    template: `int maxSubArray(vector<int>& a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < (int)a.size(); i++) {
        cur = max(a[i], cur + a[i]);
        best = max(best, cur);
    }
    return best;
}

int maxProduct(vector<int>& a) {
    int hi = a[0], lo = a[0], best = a[0];
    for (int i = 1; i < (int)a.size(); i++) {
        if (a[i] < 0) swap(hi, lo);
        hi = max(a[i], hi * a[i]);
        lo = min(a[i], lo * a[i]);
        best = max(best, hi);
    }
    return best;
}

int maxSubarraySumCircular(vector<int>& a) {
    int total = 0, curMax = 0, curMin = 0, mx = INT_MIN, mn = INT_MAX;
    for (int x : a) {
        curMax = max(x, curMax + x); mx = max(mx, curMax);
        curMin = min(x, curMin + x); mn = min(mn, curMin);
        total += x;
    }
    return mx < 0 ? mx : max(mx, total - mn);   // all negative: wrap would be empty
}`,
    complexity: "O(n) time, O(1) space.",
    variations: ["Maximum Product Subarray (152): keep max and min.", "Maximum Sum Circular Subarray (918): total − min subarray.", "Return indices: remember where cur restarted."],
    pitfalls: ["Initializing best to 0 when all numbers can be negative.", "Circular case when every value is negative (total − min = 0 is an empty subarray)."],
    recap: ["cur = max(x, cur + x).", "Products: track max and min, swap on negatives.", "Circular = max(maxSub, total − minSub) unless all negative."],
  },

  intervals: {
    idea: "Sort intervals by start (or end), then sweep once: overlapping neighbours merge, and greedy choices (keep the interval that ends earliest) become safe. For 'how many at once', sweep over start/end events.",
    signals: ["Merge, insert, or remove overlapping intervals", "Minimum rooms/platforms/resources at the same time", "Maximum non-overlapping set, or minimum removals to make them disjoint", "Free time across several schedules"],
    steps: [
      "Merge: sort by start; if next.start ≤ last.end extend last.end, else push.",
      "Max non-overlapping: sort by end; take an interval if its start ≥ end of the last taken.",
      "Max overlap: events (+1 at start, −1 at end), sort with ends before starts at the same time (for half-open intervals), track the running max; or a min-heap of end times.",
    ],
    template: `vector<vector<int>> merge(vector<vector<int>>& in) {
    sort(in.begin(), in.end());
    vector<vector<int>> out;
    for (auto& iv : in) {
        if (!out.empty() && iv[0] <= out.back()[1]) out.back()[1] = max(out.back()[1], iv[1]);
        else out.push_back(iv);
    }
    return out;
}

// Minimum meeting rooms: min-heap of end times
int minMeetingRooms(vector<vector<int>>& in) {
    sort(in.begin(), in.end());
    priority_queue<int, vector<int>, greater<int>> ends;
    for (auto& iv : in) {
        if (!ends.empty() && ends.top() <= iv[0]) ends.pop();   // reuse a room
        ends.push(iv[1]);
    }
    return ends.size();
}

// Fewest removals for non-overlap = n - max non-overlapping (sort by end)
int eraseOverlapIntervals(vector<vector<int>>& in) {
    sort(in.begin(), in.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
    int kept = 0, lastEnd = INT_MIN;
    for (auto& iv : in) if (iv[0] >= lastEnd) { kept++; lastEnd = iv[1]; }
    return in.size() - kept;
}`,
    complexity: "O(n log n) for the sort, O(n) sweep; heap version O(n log n).",
    variations: ["Insert Interval (57): copy those ending before, merge the overlapping run, copy the rest; O(n) without sorting.", "Employee Free Time (759): merge all schedules, gaps between merged intervals are free time.", "Interval intersections of two sorted lists: two pointers, advance the one that ends first."],
    pitfalls: ["Touching intervals: is [1,2] and [2,3] an overlap? Read the problem (≤ vs <).", "Sorting by start when the greedy needs sort by end.", "Mutating the input in a merge when the caller needs it."],
    recap: ["Merge: sort by start, extend the last.", "Max non-overlapping: sort by end, greedy.", "Concurrent count: heap of ends or +1/−1 sweep."],
  },

  "cyclic-sort": {
    idea: "When values are in 1..n, each value has a home index (v−1). Swap values into their homes in O(n); afterwards any index i whose value isn't i+1 reveals a missing or duplicate number, with O(1) extra space.",
    signals: ["Array of n numbers in range 1..n (or 0..n)", "Find missing, duplicate, or first missing positive in O(n) time and O(1) space", "You may modify the input"],
    steps: [
      "For each i: while a[i] is in range and a[a[i]−1] != a[i], swap a[i] into its home.",
      "Scan: the first i with a[i] != i+1 gives the answer (missing = i+1, duplicate = a[i]).",
      "Alternative 'index as hash': mark presence by negating a[|v|−1].",
    ],
    template: `int firstMissingPositive(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n; i++)
        while (a[i] > 0 && a[i] <= n && a[a[i] - 1] != a[i])
            swap(a[i], a[a[i] - 1]);
    for (int i = 0; i < n; i++)
        if (a[i] != i + 1) return i + 1;
    return n + 1;
}

// Index as hash: all duplicates (values in 1..n, each appears once or twice)
vector<int> findDuplicates(vector<int>& a) {
    vector<int> res;
    for (int x : a) {
        int i = abs(x) - 1;
        if (a[i] < 0) res.push_back(abs(x));
        else a[i] = -a[i];
    }
    return res;
}`,
    complexity: "O(n) time (each swap places one value for good), O(1) extra space.",
    variations: ["First Missing Positive (41): ignore values outside 1..n.", "Find All Duplicates (442): negation marking.", "Find the Duplicate Number (287) without modifying input: Floyd's cycle detection instead."],
    pitfalls: ["Infinite loop when swapping equal values: check a[a[i]−1] != a[i], not a[i] != i+1.", "Forgetting the range check before indexing."],
    recap: ["Value v belongs at index v−1; swap it home.", "Then the first misplaced index is the answer.", "Or mark seen values by negating a[v−1]."],
  },

  "string-matching": {
    idea: "Find a pattern in a text faster than O(n·m) by reusing work: KMP's failure function or the Z-function tell you how much of the pattern is already matched after a mismatch; Rabin-Karp compares rolling hashes in O(1) per shift.",
    signals: ["Find occurrences of a pattern in a text", "Longest prefix that is also a suffix (happy prefix)", "Repeated substring, string periodicity", "Compare many substrings for equality (hashing)"],
    steps: [
      "KMP: build lps[i] = length of the longest proper prefix of p[0..i] that is also a suffix; when matching, on mismatch fall back j = lps[j−1] instead of restarting.",
      "Z-function on p + '$' + t: positions with z == |p| are matches.",
      "Rabin-Karp: hash = Σ s[i]·B^(m−1−i) mod M; slide by removing the left char and adding the right; verify on hash match (or use two moduli).",
    ],
    template: `vector<int> buildLps(const string& p) {
    vector<int> lps(p.size(), 0);
    for (int i = 1, len = 0; i < (int)p.size(); ) {
        if (p[i] == p[len]) lps[i++] = ++len;
        else if (len > 0) len = lps[len - 1];
        else lps[i++] = 0;
    }
    return lps;
}

int strStr(const string& t, const string& p) {     // first occurrence, KMP
    if (p.empty()) return 0;
    auto lps = buildLps(p);
    for (int i = 0, j = 0; i < (int)t.size(); ) {
        if (t[i] == p[j]) { i++; j++; if (j == (int)p.size()) return i - j; }
        else if (j > 0) j = lps[j - 1];
        else i++;
    }
    return -1;
}

vector<int> zFunction(const string& s) {
    int n = s.size();
    vector<int> z(n, 0);
    for (int i = 1, l = 0, r = 0; i < n; i++) {
        if (i < r) z[i] = min(r - i, z[i - l]);
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
}`,
    complexity: "KMP and Z: O(n + m) time, O(m) or O(n + m) space. Rabin-Karp: O(n + m) expected.",
    variations: ["Longest Happy Prefix (1392): lps of the whole string, last value.", "Repeated String Match (686): repeat a until length ≥ |b|, try once more, search with KMP.", "Repeated substring pattern: n % (n − lps[n−1]) == 0 and lps[n−1] > 0."],
    pitfalls: ["Rabin-Karp hash collisions: verify or double-hash.", "Negative values after modular subtraction: add M before taking mod.", "Using std::string::find in an interview where they asked for the algorithm."],
    recap: ["KMP: on mismatch j = lps[j−1], never move i back.", "Z on p + '$' + t: z == |p| marks a match.", "Rolling hash: remove left, multiply, add right; verify on collision."],
  },

  matrix: {
    idea: "Treat a grid as indices you can walk in controlled orders: layer by layer (spiral), by transposing and reversing (rotation), or by using the first row/column as storage for flags to work in place.",
    signals: ["Spiral or diagonal order output", "Rotate an image 90° in place", "Set rows/columns to zero in place", "Search in a row- and column-sorted matrix"],
    steps: [
      "Spiral: keep top, bottom, left, right bounds; walk each edge, shrink that bound, stop when they cross.",
      "Rotate clockwise: transpose (swap a[i][j], a[j][i] for j > i), then reverse each row.",
      "Set zeroes: record whether row 0 / column 0 had zeros, use them as markers for the rest, apply, then fix row 0 / column 0 last.",
      "Sorted matrix search: start top-right; go left if bigger, down if smaller (O(m + n)).",
    ],
    template: `vector<int> spiralOrder(vector<vector<int>>& m) {
    vector<int> out;
    int top = 0, bot = m.size() - 1, left = 0, right = m[0].size() - 1;
    while (top <= bot && left <= right) {
        for (int j = left; j <= right; j++) out.push_back(m[top][j]);
        top++;
        for (int i = top; i <= bot; i++) out.push_back(m[i][right]);
        right--;
        if (top <= bot) { for (int j = right; j >= left; j--) out.push_back(m[bot][j]); bot--; }
        if (left <= right) { for (int i = bot; i >= top; i--) out.push_back(m[i][left]); left++; }
    }
    return out;
}

void rotate(vector<vector<int>>& m) {             // 90° clockwise
    int n = m.size();
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) swap(m[i][j], m[j][i]);
    for (auto& row : m) reverse(row.begin(), row.end());
}`,
    complexity: "O(m·n) time; O(1) extra space for the in-place versions.",
    variations: ["Spiral Matrix (54): guard the bottom and left walks for single rows/columns.", "Rotate Image (48): counter-clockwise = transpose then reverse each column.", "Set Matrix Zeroes (73): first row/col as markers."],
    pitfalls: ["Double-counting the middle row or column in a spiral.", "Overwriting markers before reading them in set-zeroes (handle row 0/col 0 last)."],
    recap: ["Spiral: four bounds, shrink after each edge, guard the last two walks.", "Rotate = transpose + reverse rows.", "In-place flags: use row 0 and column 0."],
  },

  "bs-index": {
    idea: "Binary search works on any predicate that is false…false true…true over the index range; you search for the first true. Sorted arrays are the simple case; rotated arrays and peaks work because one half is always provably ordered or uphill.",
    signals: ["Sorted (or rotated sorted) array, find a target or a boundary", "Find first/last position of x, insertion point", "Peak element, minimum of a rotated array", "O(log n) is required"],
    steps: [
      "Write the predicate: ok(mid) is false then true. Search lo..hi for the first true.",
      "Use lo + (hi − lo) / 2 and a loop invariant you can state ('answer is in [lo, hi]').",
      "Rotated array: one side of mid is sorted; check whether the target lies in that sorted side, else go to the other.",
    ],
    template: `// First index in [lo, hi) where ok(i) is true; hi if none.
template <class F> int firstTrue(int lo, int hi, F ok) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (ok(mid)) hi = mid; else lo = mid + 1;
    }
    return lo;
}
// lower_bound: firstTrue(0, n, [&](int i){ return a[i] >= x; })

int searchRotated(vector<int>& a, int t) {
    int lo = 0, hi = a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == t) return mid;
        if (a[lo] <= a[mid]) {                       // left half sorted
            if (a[lo] <= t && t < a[mid]) hi = mid - 1; else lo = mid + 1;
        } else {                                     // right half sorted
            if (a[mid] < t && t <= a[hi]) lo = mid + 1; else hi = mid - 1;
        }
    }
    return -1;
}

int findPeakElement(vector<int>& a) {
    int lo = 0, hi = a.size() - 1;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] < a[mid + 1]) lo = mid + 1; else hi = mid;   // walk uphill
    }
    return lo;
}`,
    complexity: "O(log n) time, O(1) space.",
    variations: ["Search in Rotated Sorted Array (33).", "Find Peak Element (162): go toward the larger neighbour.", "Median of Two Sorted Arrays (4): binary search the partition of the shorter array so left halves hold (m+n+1)/2 elements and maxLeft ≤ minRight."],
    pitfalls: ["Infinite loops from lo = mid with lo < hi; pair lo = mid + 1 with hi = mid.", "Mixing inclusive and exclusive bounds in one loop.", "Duplicates in a rotated array break the 'sorted half' test; shrink lo++/hi-- when a[lo] == a[mid] == a[hi]."],
    recap: ["Find the first true of a monotone predicate.", "lo < hi with hi = mid / lo = mid + 1 never loops forever.", "Rotated: one half is sorted, test the target against it."],
  },

  "bs-answer": {
    idea: "When the question is 'smallest X that works' (or largest), and 'X works' is monotone (if X works, X+1 works), binary search over X and check feasibility greedily. The check is usually O(n), so total O(n log range).",
    signals: ["Minimize the maximum / maximize the minimum", "Smallest speed/capacity/days such that a schedule fits", "Split an array into k parts minimizing the largest sum", "Answer range is large (up to 10⁹) but checkable"],
    steps: [
      "Bounds: lo = smallest possible answer, hi = one that surely works.",
      "Write feasible(x) greedily (pack as much as possible per bucket, count buckets).",
      "Binary search for the first x with feasible(x) true.",
    ],
    template: `// Koko Eating Bananas: minimum speed to finish within h hours.
int minEatingSpeed(vector<int>& piles, int h) {
    auto feasible = [&](long long k) {
        long long hours = 0;
        for (int p : piles) hours += (p + k - 1) / k;     // ceil
        return hours <= h;
    };
    long long lo = 1, hi = *max_element(piles.begin(), piles.end());
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (feasible(mid)) hi = mid; else lo = mid + 1;
    }
    return lo;
}

// Split Array Largest Sum: smallest cap so at most k parts are needed.
int splitArray(vector<int>& a, int k) {
    long long lo = *max_element(a.begin(), a.end()), hi = accumulate(a.begin(), a.end(), 0LL);
    auto parts = [&](long long cap) {
        int cnt = 1; long long cur = 0;
        for (int x : a) { if (cur + x > cap) { cnt++; cur = 0; } cur += x; }
        return cnt;
    };
    while (lo < hi) {
        long long mid = (lo + hi) / 2;
        if (parts(mid) <= k) hi = mid; else lo = mid + 1;
    }
    return lo;
}`,
    complexity: "O(n log R) where R is the answer range.",
    variations: ["Capacity to Ship Packages (1011): lo = max weight, hi = total.", "Aggressive cows: maximize the minimum gap; feasible(d) places cows greedily left to right; search for the last true.", "Real-valued answers: iterate ~100 times or until hi − lo < ε."],
    pitfalls: ["Wrong lower bound (capacity below the largest item is never feasible).", "Overflow in the feasibility sum.", "Searching for 'last true' with the 'first true' template; flip the predicate or use mid = lo + (hi − lo + 1) / 2."],
    recap: ["Monotone feasible(x) → binary search the answer.", "Greedy check in O(n).", "Pick bounds that are definitely infeasible / feasible."],
  },

  quickselect: {
    idea: "Partition the array around a pivot like quicksort, then recurse only into the side that holds the k-th element. Average O(n) because the problem size shrinks geometrically; a random pivot avoids the O(n²) worst case.",
    signals: ["k-th largest/smallest without fully sorting", "Partition by a predicate in place (colors, even/odd, < pivot)", "Top-k elements in any order"],
    steps: [
      "Pick a random pivot, swap it to the end, Lomuto-partition: everything smaller to the left.",
      "If the pivot's final index equals the target index, done; else recurse left or right.",
      "Three-way partition (<, =, >) handles many duplicates.",
    ],
    template: `int partition(vector<int>& a, int l, int r) {         // Lomuto, pivot random
    swap(a[l + rand() % (r - l + 1)], a[r]);
    int p = a[r], i = l;
    for (int j = l; j < r; j++) if (a[j] < p) swap(a[i++], a[j]);
    swap(a[i], a[r]);
    return i;
}

int findKthLargest(vector<int>& a, int k) {
    int target = a.size() - k, l = 0, r = a.size() - 1;
    while (true) {
        int p = partition(a, l, r);
        if (p == target) return a[p];
        if (p < target) l = p + 1; else r = p - 1;
    }
}
// Library: nth_element(a.begin(), a.begin() + target, a.end());

void sortColors(vector<int>& a) {                  // Dutch flag, 3-way
    int lo = 0, mid = 0, hi = a.size() - 1;
    while (mid <= hi) {
        if (a[mid] == 0) swap(a[lo++], a[mid++]);
        else if (a[mid] == 2) swap(a[mid], a[hi--]);
        else mid++;
    }
}`,
    complexity: "Average O(n), worst O(n²) (rare with random pivots); O(1) extra space iterative.",
    variations: ["Kth Largest (215): target index n − k.", "Sort Colors (75): 3-way partition, don't advance mid after swapping with hi.", "Heap alternative: size-k min-heap, O(n log k), better for streams."],
    pitfalls: ["Fixed first/last pivot on sorted input → O(n²).", "Advancing mid after swapping with hi in Dutch flag (the swapped-in value is unchecked)."],
    recap: ["Partition, then recurse into one side only: O(n) average.", "Random pivot.", "3-way partition for duplicates / Dutch flag."],
  },

  "custom-sort": {
    idea: "Many greedy problems become trivial once items are in the right order. Find the comparison that makes 'take items in this order' optimal, often by comparing the two orders of a pair (a then b vs b then a).",
    signals: ["Arrange items to form the largest number / smallest cost", "Reconstruct a queue from (height, count) constraints", "Process tasks by deadline, end time, ratio", "'Order matters and a local swap argument works'"],
    steps: [
      "Find the key: for pair orderings, compare a+b vs b+a (concatenation), or cost(a,b) vs cost(b,a).",
      "Check the comparator is a strict weak ordering (transitive, irreflexive) or std::sort may crash.",
      "After sorting, a single greedy pass builds the answer.",
    ],
    template: `string largestNumber(vector<int>& nums) {
    vector<string> s;
    for (int x : nums) s.push_back(to_string(x));
    sort(s.begin(), s.end(), [](const string& a, const string& b) { return a + b > b + a; });
    if (s[0] == "0") return "0";
    string out;
    for (auto& x : s) out += x;
    return out;
}

// Queue reconstruction: tallest first, insert each at index k.
vector<vector<int>> reconstructQueue(vector<vector<int>>& p) {
    sort(p.begin(), p.end(), [](auto& a, auto& b) {
        return a[0] != b[0] ? a[0] > b[0] : a[1] < b[1];
    });
    vector<vector<int>> q;
    for (auto& x : p) q.insert(q.begin() + x[1], x);
    return q;
}`,
    complexity: "O(n log n) for the sort (times the comparison cost), plus the pass.",
    variations: ["Largest Number (179).", "Queue Reconstruction by Height (406): shorter people are invisible to taller ones, so insert tallest first.", "Minimum cost to hire workers: sort by wage/quality ratio, heap of qualities."],
    pitfalls: ["A comparator using >= breaks strict weak ordering → undefined behaviour.", "All zeros: '000' should be '0'."],
    recap: ["Compare the two orders of a pair (a+b vs b+a).", "Comparator must be strict (<, not <=).", "Sort, then one greedy pass."],
  },

  "merge-sort-count": {
    idea: "Merge sort's merge step sees, for each element of the right half, exactly how many left-half elements are bigger. Count those cross pairs during the merge to count inversions or pairs with an order condition in O(n log n).",
    signals: ["Count pairs i < j with a[i] > a[j] (or > 2·a[j])", "For each element, count smaller elements to its right", "n up to 10⁵, so O(n²) is too slow"],
    steps: [
      "Recursively sort both halves (counting inside each).",
      "Before or during merging, count cross pairs with two pointers over the sorted halves.",
      "Merge normally. To attribute counts to original indices, sort pairs (value, index).",
    ],
    template: `// Reverse Pairs: count i < j with a[i] > 2 * a[j]
long long sortCount(vector<int>& a, vector<int>& tmp, int l, int r) {
    if (r - l <= 1) return 0;
    int m = (l + r) / 2;
    long long cnt = sortCount(a, tmp, l, m) + sortCount(a, tmp, m, r);
    for (int i = l, j = m; i < m; i++) {               // both halves sorted
        while (j < r && (long long)a[i] > 2LL * a[j]) j++;
        cnt += j - m;
    }
    merge(a.begin() + l, a.begin() + m, a.begin() + m, a.begin() + r, tmp.begin() + l);
    copy(tmp.begin() + l, tmp.begin() + r, a.begin() + l);
    return cnt;
}
int reversePairs(vector<int>& a) { vector<int> tmp(a.size()); return sortCount(a, tmp, 0, a.size()); }`,
    complexity: "O(n log n) time, O(n) space.",
    variations: ["Count of Smaller Numbers After Self (315): merge (value, index) pairs; when taking from the left, add how many right elements were already taken.", "Reverse Pairs (493).", "Alternative: Fenwick tree over compressed values, scanning right to left."],
    pitfalls: ["Overflow in 2·a[j]: use long long.", "Counting during the merge for conditions that aren't the merge order (do a separate two-pointer pass like above)."],
    recap: ["Count cross pairs between sorted halves with two pointers.", "Then merge.", "Fenwick over compressed values is the alternative."],
  },
};
