import type { PatternGuide } from "./types";

// DSA pattern guides: dynamic programming, greedy and math, advanced structures. Templates are C++.

export const DSA_GUIDES_D: Record<string, PatternGuide> = {
  "dp-1d": {
    idea: "dp[i] = the answer for the first i items (or ending at i), built from a few earlier states. Write the recurrence first, then fill bottom-up; usually only the last one or two states are needed, so space drops to O(1).",
    signals: ["Number of ways to reach step i", "Best total when you can't take adjacent items", "Decode a string where pieces have length 1 or 2", "Minimum jumps/cost to reach the end"],
    steps: [
      "Define dp[i] in words ('ways to decode the first i characters').",
      "Write the transition from smaller i and the base cases.",
      "Fill left to right; compress to rolling variables when dp[i] only uses dp[i−1], dp[i−2].",
    ],
    template: `int rob(vector<int>& a) {                 // House Robber
    int take = 0, skip = 0;                    // best ending with/without the previous house
    for (int x : a) { int t = skip + x; skip = max(skip, take); take = t; }
    return max(take, skip);
}

int numDecodings(const string& s) {        // dp over prefix length
    int prev2 = 1, prev1 = s[0] != '0';        // dp[0], dp[1]
    for (int i = 2; i <= (int)s.size(); i++) {
        int cur = 0;
        if (s[i - 1] != '0') cur += prev1;
        int two = stoi(s.substr(i - 2, 2));
        if (two >= 10 && two <= 26) cur += prev2;
        prev2 = prev1; prev1 = cur;
    }
    return prev1;
}

int jump(vector<int>& a) {                 // Jump Game II: greedy BFS layers
    int jumps = 0, end = 0, far = 0;
    for (int i = 0; i + 1 < (int)a.size(); i++) {
        far = max(far, i + a[i]);
        if (i == end) { jumps++; end = far; }
    }
    return jumps;
}`,
    complexity: "O(n) time, O(1) space after compression.",
    variations: ["Climbing Stairs (70): Fibonacci.", "House Robber (198); circular version: run twice excluding first or last.", "Decode Ways (91): '0' handling.", "Jump Game II (45): greedy is the optimized DP."],
    pitfalls: ["Base cases (empty prefix = 1 way).", "Leading zeros in decode problems.", "Compressing space before the recurrence is correct."],
    recap: ["Define dp[i] in words, then transition + base.", "Roll variables when only the last 2 are used.", "House robber: take = skip + x, skip = max(skip, take)."],
  },

  knapsack: {
    idea: "Items with weights and values, a capacity. 0/1: each item once, so loop capacity downwards to avoid reusing the item in the same round. Unbounded: loop upwards. Counting ways uses the same loops with + instead of max.",
    signals: ["Choose a subset hitting a target sum / within a capacity", "Coin change: min coins or number of ways", "Partition into two equal sums", "Assign + or − to reach a target (subset sum in disguise)", "Two capacities (zeros and ones)"],
    steps: [
      "0/1: for item, for c = C down to w: dp[c] = best(dp[c], dp[c − w] + v).",
      "Unbounded: for item, for c = w up to C.",
      "Number of combinations (order doesn't matter): items outer, capacity inner. Permutations: capacity outer.",
      "Target sum with ±: subset sum to (total + target) / 2.",
    ],
    template: `int coinChange(vector<int>& coins, int amount) {        // unbounded, min count
    vector<int> dp(amount + 1, INT_MAX);
    dp[0] = 0;
    for (int c : coins)
        for (int x = c; x <= amount; x++)
            if (dp[x - c] != INT_MAX) dp[x] = min(dp[x], dp[x - c] + 1);
    return dp[amount] == INT_MAX ? -1 : dp[amount];
}

int change(int amount, vector<int>& coins) {             // number of combinations
    vector<unsigned long long> dp(amount + 1, 0);
    dp[0] = 1;
    for (int c : coins) for (int x = c; x <= amount; x++) dp[x] += dp[x - c];
    return dp[amount];
}

bool canPartition(vector<int>& a) {                      // 0/1 subset sum
    int total = accumulate(a.begin(), a.end(), 0);
    if (total % 2) return false;
    bitset<10001> can; can[0] = 1;                       // bitset trick: shift-or
    for (int x : a) can |= can << x;
    return can[total / 2];
}

int findMaxForm(vector<string>& strs, int m, int n) {     // two capacities
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (auto& s : strs) {
        int z = count(s.begin(), s.end(), '0'), o = s.size() - z;
        for (int i = m; i >= z; i--) for (int j = n; j >= o; j--) dp[i][j] = max(dp[i][j], dp[i - z][j - o] + 1);
    }
    return dp[m][n];
}`,
    complexity: "O(n · C) time, O(C) space (1D rolling array).",
    variations: ["Coin Change (322) and Coin Change II (518).", "Partition Equal Subset Sum (416).", "Target Sum (494): subset sum to (S + target) / 2; check parity and sign.", "Ones and Zeroes (474)."],
    pitfalls: ["Wrong loop direction (0/1 needs downward).", "Swapping loop order when counting combinations vs permutations.", "Counting overflow: use long long or modulo."],
    recap: ["0/1: capacity downward. Unbounded: upward.", "Combinations: items outer. Permutations: capacity outer.", "±target ⇒ subset sum to (total + target) / 2."],
  },

  lis: {
    idea: "Longest increasing subsequence in O(n log n): keep tails[len] = the smallest possible tail of an increasing subsequence of length len+1; each new number replaces the first tail ≥ it (binary search). The length of tails is the LIS length.",
    signals: ["Longest increasing/non-decreasing subsequence", "Nesting envelopes / boxes (2D LIS after sorting)", "Number of LIS", "Minimum deletions to make a sequence sorted"],
    steps: [
      "O(n²): dp[i] = 1 + max dp[j] for j < i with a[j] < a[i].",
      "O(n log n): lower_bound in tails (strict increase) or upper_bound (non-decreasing).",
      "2D: sort by width ascending and height descending (so equal widths can't chain), then LIS on heights.",
    ],
    template: `int lengthOfLIS(vector<int>& a) {
    vector<int> tails;
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x); else *it = x;
    }
    return tails.size();
}

int maxEnvelopes(vector<vector<int>>& e) {
    sort(e.begin(), e.end(), [](auto& a, auto& b) { return a[0] != b[0] ? a[0] < b[0] : a[1] > b[1]; });
    vector<int> tails;
    for (auto& x : e) {
        auto it = lower_bound(tails.begin(), tails.end(), x[1]);
        if (it == tails.end()) tails.push_back(x[1]); else *it = x[1];
    }
    return tails.size();
}

int findNumberOfLIS(vector<int>& a) {               // O(n^2) with counts
    int n = a.size(), best = 0, ways = 0;
    vector<int> len(n, 1), cnt(n, 1);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) if (a[j] < a[i]) {
            if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; }
            else if (len[j] + 1 == len[i]) cnt[i] += cnt[j];
        }
        if (len[i] > best) { best = len[i]; ways = cnt[i]; } else if (len[i] == best) ways += cnt[i];
    }
    return ways;
}`,
    complexity: "O(n log n) for length; O(n²) for counting (O(n log n) with a Fenwick tree).",
    variations: ["LIS (300).", "Russian Doll Envelopes (354): sort trick.", "Number of LIS (673).", "tails isn't the actual subsequence; keep parent pointers to reconstruct."],
    pitfalls: ["Envelope sort: heights descending for equal widths.", "lower_bound vs upper_bound for strict vs non-strict."],
    recap: ["tails[k] = smallest tail of length k+1; replace with lower_bound.", "2D: sort w asc, h desc, LIS on h.", "Counting needs len[] and cnt[]."],
  },

  "grid-dp": {
    idea: "dp[i][j] depends on neighbours already computed (top, left, top-left). Paths, minimum path sums and largest squares fill row by row; usually one row of memory is enough.",
    signals: ["Count paths or minimum cost from top-left to bottom-right with right/down moves", "Largest square/rectangle of 1s", "Two walkers collecting items (state = both positions)"],
    steps: [
      "Base row/column, then dp[i][j] = f(dp[i−1][j], dp[i][j−1], dp[i−1][j−1]).",
      "Roll to a 1D array: dp[j] holds the row above until overwritten.",
      "Two walkers: walk both simultaneously with step t; state (t, r1, r2), c = t − r.",
    ],
    template: `int minPathSum(vector<vector<int>>& g) {
    int m = g.size(), n = g[0].size();
    vector<int> dp(n, INT_MAX);
    dp[0] = 0;
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            dp[j] = g[i][j] + (j == 0 ? dp[j] : min(dp[j], dp[j - 1]));
    return dp[n - 1];
}

int maximalSquare(vector<vector<char>>& g) {
    int m = g.size(), n = g[0].size(), best = 0;
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (g[i - 1][j - 1] == '1') {
                dp[i][j] = 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
                best = max(best, dp[i][j]);
            }
    return best * best;
}`,
    complexity: "O(m·n) time, O(n) space with a rolling row.",
    variations: ["Unique Paths (62): or combinatorics C(m+n−2, m−1).", "Minimum Path Sum (64).", "Maximal Square (221).", "Cherry Pickup (741): two walkers forward, avoid double counting a shared cell."],
    pitfalls: ["Cherry Pickup greedy (best path, then best again) is wrong.", "First row/column initialization."],
    recap: ["Fill in dependency order; roll to one row.", "Square: 1 + min(top, left, diag).", "Two walkers: same step t, state (t, r1, r2)."],
  },

  "two-string-dp": {
    idea: "dp[i][j] = answer for prefixes s[0..i) and t[0..j). Compare the last characters: match moves diagonally; otherwise take the best of dropping one char from either string (or the edit operations). Regex/wildcard add cases for '*'.",
    signals: ["Edit distance, LCS, shortest common supersequence", "Regular expression or wildcard matching", "Count distinct subsequences of s equal to t", "Interleaving strings"],
    steps: [
      "Size (m+1) × (n+1); row/column 0 are empty prefixes.",
      "LCS: match ? dp[i−1][j−1] + 1 : max(dp[i−1][j], dp[i][j−1]).",
      "Edit distance: match ? diag : 1 + min(insert, delete, replace).",
      "Wildcard '*': dp[i][j] = dp[i][j−1] (empty) || dp[i−1][j] (eat one char).",
      "Regex 'x*': dp[i][j] = dp[i][j−2] (zero x) || (x matches s[i−1] && dp[i−1][j]).",
    ],
    template: `int minDistance(const string& a, const string& b) {        // edit distance
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1));
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1]
                     : 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
    return dp[m][n];
}

bool isMatch(const string& s, const string& p) {            // regex with . and *
    int m = s.size(), n = p.size();
    vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
    dp[0][0] = true;
    for (int j = 2; j <= n; j++) dp[0][j] = p[j - 1] == '*' && dp[0][j - 2];
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++) {
            if (p[j - 1] == '*') {
                bool one = p[j - 2] == '.' || p[j - 2] == s[i - 1];
                dp[i][j] = dp[i][j - 2] || (one && dp[i - 1][j]);
            } else dp[i][j] = (p[j - 1] == '.' || p[j - 1] == s[i - 1]) && dp[i - 1][j - 1];
        }
    return dp[m][n];
}

int numDistinct(const string& s, const string& t) {          // count subsequences
    vector<unsigned long long> dp(t.size() + 1, 0);
    dp[0] = 1;
    for (char c : s)
        for (int j = t.size(); j >= 1; j--)                    // backwards: 0/1 style
            if (t[j - 1] == c) dp[j] += dp[j - 1];
    return dp[t.size()];
}`,
    complexity: "O(m·n) time, O(n) space with rolling rows.",
    variations: ["Edit Distance (72).", "LCS (1143).", "Regular Expression Matching (10).", "Wildcard Matching (44).", "Distinct Subsequences (115)."],
    pitfalls: ["Off-by-one between dp indices and string indices.", "Regex: '*' applies to the previous char; initialize dp[0][j] for patterns like a*b*.", "Overflow in counting problems."],
    recap: ["dp over prefixes, (m+1) × (n+1).", "Match ⇒ diagonal; else combine top/left.", "Regex '*': zero copies (j−2) or one more (i−1)."],
  },

  "interval-dp": {
    idea: "dp[l][r] = best answer for the subarray l..r, computed from smaller intervals by choosing a split point k (or the last element removed). Fill by increasing length.",
    signals: ["Burst balloons, matrix chain multiplication, merge stones", "Minimum cuts for palindrome partitioning", "Optimal way to combine a sequence where cost depends on neighbours"],
    steps: [
      "Define dp[l][r] and what k means ('k is the last balloon burst in (l, r)').",
      "for len = 2..n, for l, r = l + len − 1, for k in (l, r): combine dp[l][k] and dp[k][r] plus a cost.",
      "Pad with sentinels (balloons with value 1 at both ends).",
    ],
    template: `int maxCoins(vector<int>& nums) {                     // Burst Balloons
    vector<int> a = {1};
    a.insert(a.end(), nums.begin(), nums.end());
    a.push_back(1);
    int n = a.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));       // open interval (l, r)
    for (int len = 2; len < n; len++)
        for (int l = 0; l + len < n; l++) {
            int r = l + len;
            for (int k = l + 1; k < r; k++)              // k is burst last
                dp[l][r] = max(dp[l][r], dp[l][k] + dp[k][r] + a[l] * a[k] * a[r]);
        }
    return dp[0][n - 1];
}

int minCut(const string& s) {                          // Palindrome Partitioning II
    int n = s.size();
    vector<vector<bool>> pal(n, vector<bool>(n, false));
    vector<int> cut(n, 0);
    for (int r = 0; r < n; r++) {
        cut[r] = r;
        for (int l = 0; l <= r; l++)
            if (s[l] == s[r] && (r - l < 2 || pal[l + 1][r - 1])) {
                pal[l][r] = true;
                cut[r] = l == 0 ? 0 : min(cut[r], cut[l - 1] + 1);
            }
    }
    return cut[n - 1];
}`,
    complexity: "O(n³) time, O(n²) space (palindrome cuts O(n²)).",
    variations: ["Burst Balloons (312): think of the last burst, not the first.", "Palindrome Partitioning II (132).", "Minimum Cost to Merge Stones (1000): merge only when (len − 1) % (k − 1) == 0."],
    pitfalls: ["Filling by l then r instead of by length (uses uncomputed states).", "Choosing 'first burst' which makes subproblems dependent."],
    recap: ["dp[l][r] from a split k; fill by length.", "Burst balloons: k is the last one.", "Sentinels at the ends."],
  },

  "state-machine-dp": {
    idea: "Model each day as being in one of a few states (holding a stock, not holding, cooldown, transactions used) and write transitions between them. Every stock problem is the same table with different states.",
    signals: ["Buy/sell stock with limits, fees, or cooldowns", "Problems where you're in one of k modes and each step switches or stays"],
    steps: [
      "List the states and draw the arrows (buy: free → hold, sell: hold → free/cooldown).",
      "Each day: new[state] = best over incoming arrows from yesterday.",
      "At most k transactions: hold[j], free[j] for j = 1..k.",
    ],
    template: `int maxProfitCooldown(vector<int>& p) {
    int hold = INT_MIN, sold = 0, rest = 0;            // states after today
    for (int x : p) {
        int prevSold = sold;
        sold = hold + x;                               // sell today
        hold = max(hold, rest - x);                    // buy from rest (not right after a sale)
        rest = max(rest, prevSold);                    // cooldown passes
    }
    return max(sold, rest);
}

int maxProfitK(int k, vector<int>& p) {
    vector<int> buy(k + 1, INT_MIN), sell(k + 1, 0);
    for (int x : p)
        for (int j = 1; j <= k; j++) {
            buy[j] = max(buy[j], sell[j - 1] - x);
            sell[j] = max(sell[j], buy[j] + x);
        }
    return sell[k];
}`,
    complexity: "O(n · states) time, O(states) space.",
    variations: ["Best Time I (121): one transaction, track min price.", "II (122): unlimited, sum positive differences.", "III (123) and IV (188): k transactions; if k ≥ n/2 treat as unlimited.", "With Cooldown (309)."],
    pitfalls: ["Starting hold at 0 (you can't hold without buying): use INT_MIN or −p[0], and never subtract from INT_MIN.", "Updating a state with today's already-updated value of another state."],
    recap: ["Draw states and arrows first.", "new state = max over incoming arrows from yesterday.", "k transactions: buy[j], sell[j]."],
  },

  "digit-dp": {
    idea: "Count numbers ≤ N with a digit property by building them digit by digit from the most significant, tracking whether you're still 'tight' to N's prefix (limited to N's digit) plus whatever the property needs (used-digit mask, sum, leading zeros). Memoize on the non-tight states.",
    signals: ["Count numbers in [L, R] whose digits satisfy something", "N up to 10¹⁸ (can't iterate)", "Unique digits, digit sums, numbers from a digit set"],
    steps: [
      "Answer for [L, R] = f(R) − f(L − 1).",
      "dfs(pos, tight, started, state): try digits 0..(tight ? N[pos] : 9).",
      "Memoize only when !tight (and started, if relevant).",
    ],
    template: `// Count numbers in [1, n] with all distinct digits
string N;
int memo[11][1 << 10];
int dfs(int pos, int mask, bool tight, bool started) {
    if (pos == (int)N.size()) return started;
    if (!tight && started && memo[pos][mask] != -1) return memo[pos][mask];
    int limit = tight ? N[pos] - '0' : 9, total = 0;
    for (int d = 0; d <= limit; d++) {
        if (started && (mask >> d & 1)) continue;
        bool nowStarted = started || d != 0;
        total += dfs(pos + 1, nowStarted ? mask | 1 << d : 0, tight && d == limit, nowStarted);
    }
    if (!tight && started) memo[pos][mask] = total;
    return total;
}
int countDistinct(long long n) { N = to_string(n); memset(memo, -1, sizeof memo); return dfs(0, 0, true, false); }`,
    complexity: "O(digits × states × 10).",
    variations: ["Numbers At Most N Given Digit Set (902): shorter lengths + digit-by-digit for full length.", "Count Numbers with Unique Digits (357): also a closed-form product.", "Digit sum divisible by k: state = sum mod k."],
    pitfalls: ["Leading zeros counted as used digits.", "Memoizing tight states (they depend on N's suffix)."],
    recap: ["f(R) − f(L−1).", "State: pos, tight, started, property.", "Memo only non-tight."],
  },

  "tree-dp-2": {
    idea: "Same as tree DP: each node returns a small set of states and parents combine them. Camera placement is the classic three-state version: covered without a camera, has a camera, not covered.",
    signals: ["Minimum nodes to cover/guard a tree", "Max independent set on a tree", "Choose nodes with parent/child constraints"],
    steps: [
      "Name states precisely (0 = not covered, 1 = covered, no camera, 2 = has camera).",
      "Greedy-from-leaves version: place a camera at a node if any child is uncovered.",
      "Or full DP: return min cost for each state and combine.",
    ],
    template: `int cameras = 0;
// 0 = not covered, 1 = covered (no camera), 2 = has camera
int dfs(TreeNode* n) {
    if (!n) return 1;                                  // null counts as covered
    int l = dfs(n->left), r = dfs(n->right);
    if (l == 0 || r == 0) { cameras++; return 2; }     // a child needs us
    if (l == 2 || r == 2) return 1;                    // a child covers us
    return 0;
}
int minCameraCover(TreeNode* root) { cameras = 0; return dfs(root) == 0 ? cameras + 1 : cameras; }`,
    complexity: "O(n) time, O(h) stack.",
    variations: ["Binary Tree Cameras (968).", "House Robber III (337): {take, skip}.", "Minimum vertex cover / dominating set on trees."],
    pitfalls: ["Forgetting the root may be left uncovered.", "Treating null as 'not covered' (forces cameras on leaves)."],
    recap: ["Name the states.", "Cameras: place when a child is uncovered; null = covered.", "Check the root at the end."],
  },

  "bitmask-dp-assign": {
    idea: "Held-Karp TSP: dp[mask][last] = cheapest way to visit exactly the cities in mask ending at last. Assignment problems use dp[mask] where the number of set bits tells you which item comes next.",
    signals: ["Visit all of n ≤ 16-20 nodes with minimum cost", "Assign n tasks to n workers/sessions with constraints", "Minimum sessions to finish tasks with a time limit"],
    steps: [
      "TSP: dp[1 << start][start] = 0; for mask, for last in mask, for next not in mask: relax dp[mask | next][next].",
      "Assignment: process items in order; popcount(mask) is the index of the current person.",
      "Sessions: dp[mask] = (sessions used, time in the last session); compare lexicographically.",
    ],
    template: `int tsp(vector<vector<int>>& d) {                       // return to 0
    int n = d.size(), FULL = 1 << n;
    vector<vector<int>> dp(FULL, vector<int>(n, INT_MAX / 2));
    dp[1][0] = 0;
    for (int mask = 1; mask < FULL; mask++)
        for (int last = 0; last < n; last++) {
            if (!(mask >> last & 1) || dp[mask][last] >= INT_MAX / 2) continue;
            for (int nx = 0; nx < n; nx++) if (!(mask >> nx & 1))
                dp[mask | 1 << nx][nx] = min(dp[mask | 1 << nx][nx], dp[mask][last] + d[last][nx]);
        }
    int best = INT_MAX;
    for (int last = 0; last < n; last++) best = min(best, dp[FULL - 1][last] + d[last][0]);
    return best;
}

int minSessions(vector<int>& t, int limit) {             // (sessions, used in last)
    int n = t.size();
    vector<pair<int, int>> dp(1 << n, {INT_MAX, INT_MAX});
    dp[0] = {1, 0};
    for (int mask = 0; mask < (1 << n); mask++)
        for (int j = 0; j < n; j++) if (!(mask >> j & 1)) {
            auto [s, used] = dp[mask];
            pair<int, int> nx = used + t[j] <= limit ? make_pair(s, used + t[j]) : make_pair(s + 1, t[j]);
            dp[mask | 1 << j] = min(dp[mask | 1 << j], nx);
        }
    return dp[(1 << n) - 1].first;
}`,
    complexity: "TSP O(2ⁿ · n²); assignment O(2ⁿ · n).",
    variations: ["Travelling salesman (Held-Karp).", "Minimum Number of Work Sessions (1986).", "Fair distribution of cookies: submask enumeration or backtracking with pruning."],
    pitfalls: ["INT_MAX + cost overflow; use INT_MAX / 2.", "Memory 2²⁰ × 20 ints = 80 MB; check n."],
    recap: ["dp[mask][last] for paths through all nodes.", "popcount(mask) = whose turn it is.", "Pair states (sessions, used) compare lexicographically."],
  },

  "dp-optimizations": {
    idea: "When a DP transition is a min/max over a range of previous states, the right structure cuts a factor of n: a monotonic deque for sliding ranges, prefix sums for sum transitions, convex hull trick for dp[j] + a[i]·b[j] forms, and divide and conquer / Knuth when the optimal split point is monotone.",
    signals: ["dp[i] = max over j in [i−k, i−1] of dp[j] + cost (sliding window)", "dp[i] = min over j of dp[j] + b[j]·x[i] (lines)", "Interval DP where opt[l][r−1] ≤ opt[l][r] ≤ opt[l+1][r] (Knuth)", "O(n²) is too slow by exactly one factor of n"],
    steps: [
      "Write the naive transition and identify its shape.",
      "Sliding range max/min → monotonic deque of indices ordered by dp value.",
      "Sum over a range of j → prefix sums of dp.",
      "Linear in a[i] with monotone slopes → convex hull trick (deque of lines); arbitrary → Li Chao tree.",
    ],
    template: `// Constrained Subsequence Sum: dp[i] = a[i] + max(0, max dp[j] for i-k <= j < i)
int constrainedSubsetSum(vector<int>& a, int k) {
    int n = a.size(), best = INT_MIN;
    vector<int> dp(n);
    deque<int> dq;                                     // indices, dp decreasing
    for (int i = 0; i < n; i++) {
        if (!dq.empty() && dq.front() < i - k) dq.pop_front();
        dp[i] = a[i] + (dq.empty() ? 0 : max(0, dp[dq.front()]));
        while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();
        dq.push_back(i);
        best = max(best, dp[i]);
    }
    return best;
}

// Prefix sums over dp: ways[i] = sum of ways[j] for j in [i-maxJump, i-minJump]
// keep pre[i] = ways[0] + ... + ways[i-1], then ways[i] = pre[i-minJump+1] - pre[i-maxJump].`,
    complexity: "Typically O(n²) → O(n) or O(n log n).",
    variations: ["Monotonic deque (Constrained Subsequence Sum, Jump Game VI).", "Prefix sums of dp (Frog jumps with ranges, dice roll counts).", "Convex hull trick (minimum cost partition with squared costs).", "Knuth / divide and conquer optimization on interval and partition DPs."],
    pitfalls: ["Applying CHT without monotone slopes or queries.", "Off-by-one in the window bounds."],
    recap: ["Name the transition's shape first.", "Sliding max → deque; range sum → prefix sums.", "Lines → convex hull trick."],
  },

  "greedy-proof": {
    idea: "A greedy algorithm makes the locally best choice and never revisits it. It's only right if you can argue it: 'staying ahead' (greedy is never behind any solution) or an exchange argument. In interviews, state the argument in one sentence.",
    signals: ["Can you reach the end? How far can you go?", "Minimum candies/resources with neighbour constraints", "Partition into as many parts as possible", "Gas station circuit"],
    steps: [
      "Propose the greedy rule.",
      "Test it on a small tricky case by hand.",
      "Justify: staying ahead or exchange.",
      "If neither works, fall back to DP.",
    ],
    template: `bool canJump(vector<int>& a) {                      // reach as far as possible
    for (int i = 0, far = 0; i < (int)a.size(); i++) {
        if (i > far) return false;
        far = max(far, i + a[i]);
    }
    return true;
}

int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        total += gas[i] - cost[i]; tank += gas[i] - cost[i];
        if (tank < 0) { start = i + 1; tank = 0; }     // no station up to i can be the start
    }
    return total >= 0 ? start : -1;
}

int candy(vector<int>& r) {                          // two passes
    int n = r.size();
    vector<int> c(n, 1);
    for (int i = 1; i < n; i++) if (r[i] > r[i - 1]) c[i] = c[i - 1] + 1;
    for (int i = n - 2; i >= 0; i--) if (r[i] > r[i + 1]) c[i] = max(c[i], c[i + 1] + 1);
    return accumulate(c.begin(), c.end(), 0);
}

vector<int> partitionLabels(const string& s) {
    int last[26];
    for (int i = 0; i < (int)s.size(); i++) last[s[i] - 'a'] = i;
    vector<int> out;
    for (int i = 0, start = 0, end = 0; i < (int)s.size(); i++) {
        end = max(end, last[s[i] - 'a']);
        if (i == end) { out.push_back(end - start + 1); start = i + 1; }
    }
    return out;
}`,
    complexity: "Usually O(n) or O(n log n).",
    variations: ["Jump Game (55).", "Gas Station (134): if the tank goes negative at i, no start in [start, i] works.", "Candy (135): left pass + right pass.", "Partition Labels (763).", "Task Scheduler (621)."],
    pitfalls: ["Trusting a greedy that fails on a 3-element counterexample; test first.", "Not explaining why it's correct."],
    recap: ["Propose, test small, justify (stay ahead / exchange).", "Gas station: reset start when the tank goes negative.", "Two-pass for neighbour constraints."],
  },

  "exchange-argument": {
    idea: "To prove a greedy order is optimal, take any optimal solution that differs from greedy and swap two adjacent elements into greedy order; show the result is no worse. Repeating the swap turns any optimum into the greedy answer.",
    signals: ["Choose an order or a set where pairwise swaps make sense", "Minimum arrows/points to cover intervals", "Rearrange so no two adjacent items are equal"],
    steps: [
      "Sort by the key the swap argument suggests (end time, ratio, deadline).",
      "Process greedily.",
      "In the interview, say: 'If an optimal answer picks something ending later first, swapping in the earlier-ending one keeps it valid and no worse'.",
    ],
    template: `int findMinArrowShots(vector<vector<int>>& p) {      // sort by end
    sort(p.begin(), p.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
    int arrows = 0; long long pos = LLONG_MIN;
    for (auto& b : p) if (b[0] > pos) { arrows++; pos = b[1]; }
    return arrows;
}

string reorganizeString(const string& s) {             // most frequent first, fill even then odd slots
    vector<int> cnt(26, 0);
    for (char c : s) cnt[c - 'a']++;
    int n = s.size(), top = max_element(cnt.begin(), cnt.end()) - cnt.begin();
    if (cnt[top] > (n + 1) / 2) return "";
    string out(n, ' ');
    int i = 0;
    auto place = [&](int c) { while (cnt[c]-- > 0) { if (i >= n) i = 1; out[i] = 'a' + c; i += 2; } };
    place(top);
    for (int c = 0; c < 26; c++) place(c);
    return out;
}`,
    complexity: "O(n log n) for the sort.",
    variations: ["Minimum Number of Arrows (452).", "Reorganize String (767): impossible if max count > (n+1)/2.", "Scheduling to minimize lateness: sort by deadline."],
    pitfalls: ["Comparator overflow with a[1] − b[1] on large values; compare directly.", "Points touching at the edge: >= vs >."],
    recap: ["Swap two adjacent items into greedy order: no worse ⇒ greedy optimal.", "Interval cover: sort by end.", "Most frequent first for 'no two adjacent'."],
  },

  "number-theory": {
    idea: "Know a handful of tools cold: gcd (Euclid), sieve of Eratosthenes, fast exponentiation (square and multiply), modular inverse via Fermat when the modulus is prime, and nCr mod p with precomputed factorials.",
    signals: ["Count primes up to n", "Compute aⁿ mod m with huge n", "Answers 'modulo 1e9+7'", "Combinations mod p"],
    steps: [
      "Sieve: mark multiples starting from i·i.",
      "Power: while e: if e & 1 multiply result; square base; e >>= 1.",
      "Inverse (p prime): a^(p−2) mod p.",
      "nCr mod p: fact[], invFact[] up to n; C = fact[n]·invFact[r]·invFact[n−r].",
    ],
    template: `const long long MOD = 1'000'000'007;

long long power(long long b, long long e, long long m = MOD) {
    long long r = 1; b %= m;
    for (; e > 0; e >>= 1, b = b * b % m) if (e & 1) r = r * b % m;
    return r;
}
long long inverse(long long a) { return power(a, MOD - 2); }       // MOD prime

vector<long long> fact, invFact;
void initFact(int n) {
    fact.assign(n + 1, 1); invFact.assign(n + 1, 1);
    for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
    invFact[n] = inverse(fact[n]);
    for (int i = n; i > 0; i--) invFact[i - 1] = invFact[i] * i % MOD;
}
long long nCr(int n, int r) { return r < 0 || r > n ? 0 : fact[n] * invFact[r] % MOD * invFact[n - r] % MOD; }

int countPrimes(int n) {
    if (n < 3) return 0;
    vector<bool> composite(n, false);
    int count = 0;
    for (long long i = 2; i < n; i++) {
        if (composite[i]) continue;
        count++;
        for (long long j = i * i; j < n; j += i) composite[j] = true;
    }
    return count;
}
// gcd: std::gcd(a, b); lcm: a / gcd(a, b) * b`,
    complexity: "Sieve O(n log log n). Power O(log e). Factorials O(n) then O(1) per nCr.",
    variations: ["Count Primes (204).", "Pow(x, n) (50): negative n → 1/x, careful with INT_MIN.", "Super Pow (372): aᵇ mod 1337 with b as digit array.", "Modular inverse, nCr mod p."],
    pitfalls: ["Overflow before % (multiply in long long).", "Fermat inverse only when the modulus is prime and a isn't a multiple of it.", "Negative results: (x % m + m) % m."],
    recap: ["Square-and-multiply for powers.", "Inverse = a^(p−2) mod p.", "Precompute factorials for nCr."],
  },

  combinatorics: {
    idea: "Count with formulas instead of enumeration (paths = C(m+n−2, m−1)), and use probability tricks for sampling: prefix sums + binary search for weighted picks, reservoir sampling for streams of unknown length.",
    signals: ["Count arrangements/paths/ways", "Pick randomly with weights", "Pick uniformly from a stream or a list you can't store"],
    steps: [
      "Paths in a grid: choose which of the (m−1)+(n−1) moves are downs.",
      "Weighted pick: prefix sums, random target in [1, total], upper_bound.",
      "Reservoir (k = 1): keep the i-th item with probability 1/i.",
    ],
    template: `class WeightedPicker {                               // Random Pick with Weight
    vector<long long> pre;
    mt19937 rng{random_device{}()};
public:
    WeightedPicker(vector<int>& w) { long long s = 0; for (int x : w) pre.push_back(s += x); }
    int pickIndex() {
        uniform_int_distribution<long long> d(1, pre.back());
        return lower_bound(pre.begin(), pre.end(), d(rng)) - pre.begin();
    }
};

int reservoirPick(ListNode* head) {                    // uniform over an unknown-length list
    mt19937 rng{random_device{}()};
    int chosen = 0, i = 0;
    for (ListNode* n = head; n; n = n->next)
        if (uniform_int_distribution<int>(0, i++)(rng) == 0) chosen = n->val;   // prob 1/i
    return chosen;
}

long long uniquePaths(int m, int n) {                   // C(m+n-2, m-1) without overflow
    long long r = 1;
    for (int k = 1; k <= m - 1; k++) r = r * (n - 1 + k) / k;
    return r;
}`,
    complexity: "Weighted pick O(log n) per pick; reservoir O(n) one pass, O(1) memory.",
    variations: ["Unique Paths (62).", "Random Pick with Weight (528).", "Linked List Random Node (382): reservoir sampling.", "Inclusion-exclusion for 'at least one' counts."],
    pitfalls: ["Using rand() % n (biased, small RAND_MAX on some platforms).", "Overflow in factorial formulas; multiply then divide stepwise."],
    recap: ["Grid paths = C(m+n−2, m−1).", "Weighted: prefix sums + lower_bound.", "Reservoir: keep item i with probability 1/i."],
  },

  geometry: {
    idea: "Interview geometry is mostly integer arithmetic: cross products for orientation, gcd-normalized slopes for collinearity, and min/max overlaps for rectangles. Avoid floating point whenever you can.",
    signals: ["Max points on a line", "Rectangle overlap / union area", "Orientation, convex hull", "Distance comparisons (compare squared distances)"],
    steps: [
      "Slopes: for each anchor point, normalize (dx, dy) by gcd and sign; count in a map.",
      "Rectangle overlap: width = max(0, min(right) − max(left)), same for height.",
      "Orientation: cross(b − a, c − a) > 0 means counter-clockwise.",
    ],
    template: `int maxPoints(vector<vector<int>>& p) {
    int n = p.size(), best = min(n, 2);
    for (int i = 0; i < n; i++) {
        map<pair<int, int>, int> slopes;
        for (int j = i + 1; j < n; j++) {
            int dx = p[j][0] - p[i][0], dy = p[j][1] - p[i][1];
            int g = gcd(dx, dy);
            dx /= g; dy /= g;
            if (dx < 0 || (dx == 0 && dy < 0)) { dx = -dx; dy = -dy; }   // one sign per direction
            best = max(best, ++slopes[{dx, dy}] + 1);
        }
    }
    return best;
}

int computeArea(int ax1, int ay1, int ax2, int ay2, int bx1, int by1, int bx2, int by2) {
    long long w = max(0, min(ax2, bx2) - max(ax1, bx1));
    long long h = max(0, min(ay2, by2) - max(ay1, by1));
    return (long long)(ax2 - ax1) * (ay2 - ay1) + (long long)(bx2 - bx1) * (by2 - by1) - w * h;
}

long long cross(pair<long long, long long> a, pair<long long, long long> b, pair<long long, long long> c) {
    return (b.first - a.first) * (c.second - a.second) - (b.second - a.second) * (c.first - a.first);
}`,
    complexity: "Max points O(n² log n). Rectangle area O(1).",
    variations: ["Max Points on a Line (149).", "Rectangle Area (223).", "Convex hull (Andrew's monotone chain) with cross products.", "K closest points: compare squared distances, heap or quickselect."],
    pitfalls: ["Floating-point slopes (precision, vertical lines).", "Duplicate points.", "Overflow multiplying coordinates; use long long."],
    recap: ["Slopes as gcd-normalized integer pairs.", "Overlap = max(0, min(ends) − max(starts)).", "Cross product sign = orientation."],
  },

  "segment-tree": {
    idea: "A segment tree stores an aggregate (sum, min, max) for every power-of-two segment, so point updates and range queries are O(log n). A Fenwick tree (BIT) does prefix sums with less code when the aggregate is invertible.",
    signals: ["Range queries mixed with point updates", "Counting with order (smaller to the right, range sum counts) over compressed values", "Range updates + range queries (lazy propagation)", "Falling squares / skyline over coordinates"],
    steps: [
      "Fenwick: add(i, v) walks i += i & −i; sum(i) walks i −= i & −i (1-indexed).",
      "Segment tree (iterative): leaves at n..2n−1; update climbs; query walks l and r inward.",
      "Big coordinates: compress values (sort + unique) first.",
      "Range updates: lazy tags pushed down before visiting children.",
    ],
    template: `struct Fenwick {
    vector<long long> t;
    Fenwick(int n) : t(n + 1, 0) {}
    void add(int i, long long v) { for (i++; i < (int)t.size(); i += i & -i) t[i] += v; }   // 0-indexed API
    long long sum(int i) { long long s = 0; for (i++; i > 0; i -= i & -i) s += t[i]; return s; } // [0, i]
    long long range(int l, int r) { return sum(r) - (l ? sum(l - 1) : 0); }
};

struct SegTree {                                      // iterative, point assign, range sum [l, r)
    int n; vector<long long> t;
    SegTree(int n) : n(n), t(2 * n, 0) {}
    void set(int i, long long v) { for (t[i += n] = v; i > 1; i >>= 1) t[i >> 1] = t[i] + t[i ^ 1]; }
    long long query(int l, int r) {
        long long s = 0;
        for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
            if (l & 1) s += t[l++];
            if (r & 1) s += t[--r];
        }
        return s;
    }
};`,
    complexity: "O(log n) per update/query; O(n) memory (4n for recursive segment trees).",
    variations: ["Range Sum Query - Mutable (307).", "Count of Range Sum (327): prefix sums + BIT over compressed values (or merge sort).", "Falling Squares (699): coordinate compression + range max with assignment.", "Order statistics: BIT over counts + binary lifting to find the k-th element."],
    pitfalls: ["Fenwick indices are 1-based internally.", "Forgetting coordinate compression for values up to 10⁹.", "Lazy propagation: push before recursing, pull after."],
    recap: ["BIT: i += i & −i to update, i −= i & −i to query.", "Segment tree for non-invertible aggregates (min/max).", "Compress coordinates first."],
  },

  "sparse-table": {
    idea: "For static arrays with idempotent queries (min, max, gcd), precompute st[k][i] = answer for [i, i + 2^k). Any range is covered by two overlapping power-of-two blocks: O(1) per query. Sqrt decomposition splits the array into √n blocks for O(√n) updates and queries with simple code.",
    signals: ["Many range min/max queries, no updates", "LCA via Euler tour + RMQ", "Need simple updates + queries and n ≈ 10⁵ (sqrt blocks)"],
    steps: [
      "st[0] = a; st[k][i] = min(st[k−1][i], st[k−1][i + 2^(k−1)]).",
      "Query [l, r]: k = log2(r − l + 1); min(st[k][l], st[k][r − 2^k + 1]).",
      "Sqrt: block = √n; keep block aggregates; queries combine partial blocks element by element.",
    ],
    template: `struct SparseMin {
    vector<vector<int>> st;
    SparseMin(const vector<int>& a) {
        int n = a.size(), K = __lg(n) + 1;
        st.assign(K, a);
        for (int k = 1; k < K; k++)
            for (int i = 0; i + (1 << k) <= n; i++)
                st[k][i] = min(st[k - 1][i], st[k - 1][i + (1 << (k - 1))]);
    }
    int query(int l, int r) {                          // inclusive
        int k = __lg(r - l + 1);
        return min(st[k][l], st[k][r - (1 << k) + 1]);
    }
};

struct SqrtSum {
    int B; vector<long long> a, block;
    SqrtSum(vector<long long> v) : B(max(1, (int)sqrt(v.size()))), a(v), block((v.size() + B - 1) / B, 0) {
        for (int i = 0; i < (int)a.size(); i++) block[i / B] += a[i];
    }
    void set(int i, long long v) { block[i / B] += v - a[i]; a[i] = v; }
    long long query(int l, int r) {                    // inclusive
        long long s = 0;
        while (l <= r && l % B) s += a[l++];
        while (l + B - 1 <= r) { s += block[l / B]; l += B; }
        while (l <= r) s += a[l++];
        return s;
    }
};`,
    complexity: "Sparse table: O(n log n) build, O(1) query, no updates. Sqrt: O(√n) per operation.",
    variations: ["RMQ for LCA after an Euler tour.", "Range GCD (idempotent).", "Mo's algorithm: offline range queries sorted by block for O((n + q)√n)."],
    pitfalls: ["Sparse table only works for idempotent ops (sum double-counts the overlap).", "Using __lg(0)."],
    recap: ["Two overlapping 2^k blocks answer a min/max query in O(1).", "Static data only.", "Sqrt blocks: simple, O(√n)."],
  },

  "ordered-set": {
    idea: "A balanced BST (std::set / std::map / multiset) keeps keys sorted with O(log n) insert, erase, and neighbour lookups (lower_bound, upper_bound, prev). Use it for calendars, sliding windows needing nearby values, and sweep lines.",
    signals: ["Find the nearest value ≥ x or ≤ x while inserting/deleting", "Booking intervals without overlap", "Count overlaps with a sweep (+1/−1 map)", "Almost duplicate within index and value distance"],
    steps: [
      "Calendar: map start → end; check the next interval (lower_bound) and the previous one.",
      "k-booking: map time → delta (+1 at start, −1 at end); sweep to find the max overlap.",
      "Nearby values in a window: multiset of the last k elements; lower_bound(x − t).",
    ],
    template: `class MyCalendar {                                   // no double booking
    map<int, int> booked;                              // start -> end
public:
    bool book(int s, int e) {
        auto next = booked.lower_bound(s);
        if (next != booked.end() && next->first < e) return false;
        if (next != booked.begin() && prev(next)->second > s) return false;
        booked[s] = e;
        return true;
    }
};

class MyCalendarThree {                              // max concurrent bookings
    map<int, int> delta;
public:
    int book(int s, int e) {
        delta[s]++; delta[e]--;
        int cur = 0, best = 0;
        for (auto& [t, d] : delta) best = max(best, cur += d);
        return best;
    }
};

bool containsNearbyAlmostDuplicate(vector<int>& a, int k, int t) {
    multiset<long long> window;
    for (int i = 0; i < (int)a.size(); i++) {
        auto it = window.lower_bound((long long)a[i] - t);
        if (it != window.end() && *it <= (long long)a[i] + t) return true;
        window.insert(a[i]);
        if (i >= k) window.erase(window.find(a[i - k]));
    }
    return false;
}`,
    complexity: "O(log n) per operation; the sweep in Calendar III is O(n) per booking (O(log n) with a lazy segment tree).",
    variations: ["My Calendar I/II/III (729, 731, 732).", "Contains Duplicate III (220): multiset window or buckets of size t + 1.", "Policy-based tree (GNU pb_ds) for order statistics: find_by_order, order_of_key."],
    pitfalls: ["multiset::erase(value) removes all copies.", "Overflow in a[i] ± t; use long long.", "Checking only the next interval, not the previous, for overlap."],
    recap: ["lower_bound for ≥ x, prev(it) for < x.", "Booking: check next and previous intervals.", "Sweep counts with a map of +1/−1."],
  },

  randomized: {
    idea: "Randomness gives simple algorithms with good expected behaviour (random pivots, sampling) and compact probabilistic structures that trade a small error for huge memory savings (Bloom filters, consistent hashing for load spread).",
    signals: ["Uniform sampling from a stream (reservoir)", "Set membership with tiny memory and acceptable false positives", "Distribute keys over servers that join and leave", "Shuffle an array uniformly"],
    steps: [
      "Fisher-Yates: for i from n−1 down to 1, swap a[i] with a[random 0..i].",
      "Bloom filter: k hash functions set k bits; a query is 'maybe present' only if all k bits are set.",
      "Consistent hashing: put servers (with many virtual nodes) on a ring; a key goes to the next server clockwise.",
    ],
    template: `void shuffle(vector<int>& a, mt19937& rng) {           // Fisher-Yates
    for (int i = a.size() - 1; i > 0; i--)
        swap(a[i], a[uniform_int_distribution<int>(0, i)(rng)]);
}

struct Bloom {
    vector<bool> bits; int k;
    Bloom(int m, int k) : bits(m), k(k) {}
    size_t h(const string& s, int i) const { return (hash<string>{}(s) + i * 0x9e3779b97f4a7c15ULL * (i + 1)) % bits.size(); }
    void add(const string& s) { for (int i = 0; i < k; i++) bits[h(s, i)] = true; }
    bool mightContain(const string& s) const { for (int i = 0; i < k; i++) if (!bits[h(s, i)]) return false; return true; }
};

struct Ring {                                            // consistent hashing with virtual nodes
    map<size_t, string> ring;
    void addServer(const string& s, int vnodes = 100) { for (int i = 0; i < vnodes; i++) ring[hash<string>{}(s + "#" + to_string(i))] = s; }
    void removeServer(const string& s, int vnodes = 100) { for (int i = 0; i < vnodes; i++) ring.erase(hash<string>{}(s + "#" + to_string(i))); }
    string serverFor(const string& key) {
        auto it = ring.lower_bound(hash<string>{}(key));
        return (it == ring.end() ? ring.begin() : it)->second;   // wrap around
    }
};`,
    complexity: "Shuffle O(n). Bloom O(k) per op, false-positive rate ≈ (1 − e^(−kn/m))^k. Ring O(log V) per lookup.",
    variations: ["Linked List Random Node (382): reservoir.", "Bloom filter sizing: m ≈ −n ln p / (ln 2)², k ≈ (m/n) ln 2.", "Consistent hashing: only ~1/N of keys move when a server joins."],
    pitfalls: ["Bloom filters can't delete (use counting Bloom filters).", "Too few virtual nodes ⇒ uneven load."],
    recap: ["Fisher-Yates: swap a[i] with a[rand 0..i], i descending.", "Bloom: no false negatives, tunable false positives.", "Ring + virtual nodes: few keys move on membership change."],
  },

  "design-ds": {
    idea: "Design problems test choosing the right combination of structures so every operation hits its complexity target. List the operations, their required costs, then pick a structure (or two kept in sync) for each.",
    signals: ["Implement a class with several operations and stated complexities", "Time-based key-value store, snapshot arrays, hit counters", "Insert/delete/getRandom in O(1)", "Social feed with follow/unfollow"],
    steps: [
      "Write the operations and target complexities as a table.",
      "Pick structures: hash map for lookup, vector for random index, heap/merge for top items, binary search over timestamps.",
      "Keep the structures consistent on every mutation.",
      "Mention thread safety and memory if they ask follow-ups.",
    ],
    template: `class RandomizedSet {                                 // O(1) insert, remove, getRandom
    vector<int> vals;
    unordered_map<int, int> idx;
public:
    bool insert(int v) { if (idx.count(v)) return false; idx[v] = vals.size(); vals.push_back(v); return true; }
    bool remove(int v) {
        auto it = idx.find(v);
        if (it == idx.end()) return false;
        int last = vals.back();
        vals[it->second] = last; idx[last] = it->second;   // move last into the hole
        vals.pop_back(); idx.erase(v);
        return true;
    }
    int getRandom() { return vals[rand() % vals.size()]; }
};

class TimeMap {                                        // get(key, t): latest value at time <= t
    unordered_map<string, vector<pair<int, string>>> m;   // timestamps arrive increasing
public:
    void set(const string& k, const string& v, int t) { m[k].push_back({t, v}); }
    string get(const string& k, int t) {
        auto& v = m[k];
        auto it = upper_bound(v.begin(), v.end(), make_pair(t, string(1, char(127))));
        return it == v.begin() ? "" : prev(it)->second;
    }
};

class SnapshotArray {                                  // per-index history of (snap, value)
    vector<vector<pair<int, int>>> h; int snapId = 0;
public:
    SnapshotArray(int n) : h(n, {{0, 0}}) {}
    void set(int i, int v) { if (h[i].back().first == snapId) h[i].back().second = v; else h[i].push_back({snapId, v}); }
    int snap() { return snapId++; }
    int get(int i, int s) { return prev(upper_bound(h[i].begin(), h[i].end(), make_pair(s, INT_MAX)))->second; }
};`,
    complexity: "Per the targets: O(1) hash operations, O(log n) binary searches over histories.",
    variations: ["Design Twitter (355): per-user tweet lists + k-way merge with a heap.", "Design Hit Counter (362): circular buffer of 300 seconds.", "Time Based Key-Value Store (981).", "Snapshot Array (1146).", "Insert Delete GetRandom O(1) (380)."],
    pitfalls: ["Forgetting to update the moved element's index in RandomizedSet.", "Copying whole arrays per snapshot (O(n) each)."],
    recap: ["Table of operations → structure per operation.", "Swap-with-last for O(1) delete from an array.", "Histories + binary search for time travel."],
  },
  "cses-intro": {
    idea: "The CSES introductory problems are short and mostly ask for care, not cleverness: read the constraints, pick a type that cannot overflow, and handle the smallest inputs. They train the habits that make every harder problem safer: estimate the work from n, use 64-bit integers for sums and products, and test the edges before you submit.",
    signals: [
      "n up to 10^5 or 10^6 means an O(n) or O(n log n) answer; a nested loop over n will not finish.",
      "Sums, products or counts that can pass about 2 billion need long long, even if every input fits in int.",
      "A statement that guarantees a property (exactly one missing number, a sequence that always ends) usually points at a simple pass, a formula or an XOR.",
    ],
    steps: [
      "Write down the limits and compute the worst-case value of every quantity you add, multiply or count.",
      "Choose the simplest algorithm that fits the time limit; a single pass or a formula is common here.",
      "Work the smallest inputs by hand (n = 1, n = 2, all equal) and check your code on them first.",
      "Run the examples and your own edge cases in the app, then look at the console output if something differs.",
    ],
    template: `#include <bits/stdc++.h>
using namespace std;

// A typical shape for these problems (the in-app version is a function; the CSES version reads input):
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long total = 0;          // 64-bit: sums grow quickly
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        total += x;
    }
    cout << total << "\n";
    return 0;
}`,
    complexity: "Usually O(n) time and O(1) extra space; check that n * (work per element) stays under about 10^8 simple steps.",
    variations: [
      "Weird Algorithm: simulate a rule until it ends; the values can exceed 32 bits.",
      "Missing Number: arithmetic series or XOR to find the one absent value in O(n).",
      "Repetitions: one scan with a running counter and a best-so-far.",
      "Increasing Array: a greedy left to right pass with a 64-bit answer.",
    ],
    pitfalls: [
      "Looping over the wrong length (the Missing Number list has n - 1 values, not n).",
      "Using int for a running total or product and overflowing silently.",
      "Printing extra text or forgetting the newline when the real judge compares output exactly.",
    ],
    recap: ["Do the arithmetic on the limits first.", "long long for sums, products and counts.", "Test n = 1 and all-equal inputs before submitting."],
  },
};
