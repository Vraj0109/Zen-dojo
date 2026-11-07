import type { PatternGuide } from "./types";

// DSA pattern guides: linked lists, stacks, queues, heaps, and trees. Templates are C++.

export const DSA_GUIDES_B: Record<string, PatternGuide> = {
  "fast-slow": {
    idea: "Two pointers moving at different speeds through a sequence. If there is a cycle the fast one laps the slow one; if not, fast reaches the end when slow is in the middle. Floyd's trick then finds the cycle entrance with O(1) memory.",
    signals: ["Detect a cycle in a linked list or in a function x → f(x)", "Find the middle node or the k-th node from the end", "Find a duplicate in 1..n without modifying the array (it's a cycle)"],
    steps: [
      "slow = fast = head; loop while fast && fast->next: slow 1 step, fast 2 steps; meeting means a cycle.",
      "Cycle start: reset one pointer to head, move both 1 step; they meet at the entrance.",
      "k-th from end: advance fast k steps first, then move both until fast hits the end.",
    ],
    template: `ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next; fast = fast->next->next;
        if (slow == fast) {
            for (slow = head; slow != fast; slow = slow->next, fast = fast->next) {}
            return slow;                       // cycle entrance
        }
    }
    return nullptr;
}

ListNode* middle(ListNode* head) {             // second middle for even length
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }
    return slow;
}

int findDuplicate(vector<int>& a) {            // index -> a[index] is a linked list
    int slow = a[0], fast = a[a[0]];
    while (slow != fast) { slow = a[slow]; fast = a[a[fast]]; }
    for (slow = 0; slow != fast; ) { slow = a[slow]; fast = a[fast]; }
    return slow;
}`,
    complexity: "O(n) time, O(1) space.",
    variations: ["Linked List Cycle II (142).", "Find the Duplicate Number (287): treat i → a[i] as next pointers.", "Reorder List (143): find middle, reverse the second half, merge alternately."],
    pitfalls: ["Null checks: test fast && fast->next before stepping.", "Which middle for even length (start fast at head->next for the first middle)."],
    recap: ["Meet ⇒ cycle; reset one to head, step both by 1 ⇒ entrance.", "fast at end ⇒ slow at middle.", "Array of 1..n values is a linked list i → a[i]."],
  },

  "list-reversal": {
    idea: "Reverse links in place with three pointers (prev, cur, next). For sublists and k-groups, keep a pointer to the node before the segment so you can reconnect both ends after reversing.",
    signals: ["Reverse a whole list, a range [m, n], or every k nodes", "Palindrome check of a list in O(1) space", "Reorder/rotate lists"],
    steps: [
      "Use a dummy node before head so the head can change without special cases.",
      "Walk to the node before the segment; reverse k nodes; connect before→newHead and oldHead→after.",
      "For k-groups, first check that k nodes remain; if not, leave them.",
    ],
    template: `ListNode* reverse(ListNode* head) {
    ListNode* prev = nullptr;
    while (head) { ListNode* nxt = head->next; head->next = prev; prev = head; head = nxt; }
    return prev;
}

ListNode* reverseBetween(ListNode* head, int m, int n) {      // 1-indexed
    ListNode dummy(0, head), *before = &dummy;
    for (int i = 1; i < m; i++) before = before->next;
    ListNode* cur = before->next;
    for (int i = 0; i < n - m; i++) {                         // head insertion
        ListNode* move = cur->next;
        cur->next = move->next;
        move->next = before->next;
        before->next = move;
    }
    return dummy.next;
}

ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy(0, head), *before = &dummy;
    while (true) {
        ListNode* check = before;
        for (int i = 0; i < k && check; i++) check = check->next;
        if (!check) break;                                    // fewer than k left
        ListNode* cur = before->next;
        for (int i = 0; i < k - 1; i++) {
            ListNode* move = cur->next;
            cur->next = move->next; move->next = before->next; before->next = move;
        }
        before = cur;                                         // old first is now last
    }
    return dummy.next;
}`,
    complexity: "O(n) time, O(1) space.",
    variations: ["Reverse Linked List II (92): head insertion inside the range.", "Reverse Nodes in k-Group (25).", "Palindrome list: reverse the second half, compare, optionally restore."],
    pitfalls: ["Losing the rest of the list: save next before rewiring.", "Forgetting the dummy node when m = 1."],
    recap: ["prev/cur/next, save next first.", "Dummy node + pointer to the node before the segment.", "Head insertion reverses a range in one pass."],
  },

  "monotonic-stack": {
    idea: "Keep a stack of indices whose values are increasing (or decreasing). When a new value breaks the order, every popped index has just found its next greater/smaller element. Each index is pushed and popped once: O(n).",
    signals: ["Next/previous greater or smaller element", "Span problems (how many days until warmer, stock span)", "Largest rectangle in a histogram, maximal rectangle", "Sum over all subarrays of min/max (contribution technique)"],
    steps: [
      "Decide the order: for next greater, keep a decreasing stack and pop while a[stack.top] < a[i].",
      "Pop = resolve: the popped index's answer is i.",
      "For contribution counting, find for each i the previous smaller (strict) and next smaller (non-strict) boundaries; i is the min of (i − left) × (right − i) subarrays.",
    ],
    template: `vector<int> dailyTemperatures(vector<int>& t) {
    vector<int> ans(t.size(), 0), st;                 // decreasing temperatures
    for (int i = 0; i < (int)t.size(); i++) {
        while (!st.empty() && t[st.back()] < t[i]) {
            ans[st.back()] = i - st.back();
            st.pop_back();
        }
        st.push_back(i);
    }
    return ans;
}

int largestRectangleArea(vector<int>& h) {
    h.push_back(0);                                   // sentinel flushes the stack
    vector<int> st;
    int best = 0;
    for (int i = 0; i < (int)h.size(); i++) {
        while (!st.empty() && h[st.back()] >= h[i]) {
            int height = h[st.back()]; st.pop_back();
            int left = st.empty() ? -1 : st.back();
            best = max(best, height * (i - left - 1));
        }
        st.push_back(i);
    }
    h.pop_back();
    return best;
}`,
    complexity: "O(n) time, O(n) space.",
    variations: ["Daily Temperatures (739).", "Largest Rectangle in Histogram (84): width is between the previous smaller and the current index.", "Sum of Subarray Minimums (907): contribution a[i] × left × right, strict on one side to avoid double counting.", "Online Stock Span (901): stack of (price, span)."],
    pitfalls: ["Storing values instead of indices (you need distances).", "Equal values: use < on one side and <= on the other in contribution problems.", "Forgetting to flush the stack at the end (sentinel)."],
    recap: ["Pop when the new value breaks the order; the popped index's answer is i.", "Store indices.", "Contribution: a[i] × (i − prevSmaller) × (nextSmaller − i)."],
  },

  "monotonic-deque": {
    idea: "A deque of indices with monotone values gives the max (or min) of a sliding window in O(1): drop indices that left the window from the front, drop values that can never be the max again from the back.",
    signals: ["Max/min of every window of size k", "Shortest subarray with sum ≥ k when values can be negative (deque over prefix sums)", "DP where dp[i] = best of dp[j] over a sliding range of j"],
    steps: [
      "For each i: pop back while a[back] ≤ a[i] (they're dominated); push i.",
      "Pop front if it's outside the window (front ≤ i − k).",
      "Front is the window max once i ≥ k − 1.",
    ],
    template: `vector<int> maxSlidingWindow(vector<int>& a, int k) {
    deque<int> dq;                                   // indices, values decreasing
    vector<int> out;
    for (int i = 0; i < (int)a.size(); i++) {
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) out.push_back(a[dq.front()]);
    }
    return out;
}

// Shortest subarray with sum >= k (negatives allowed): deque over prefix sums
int shortestSubarray(vector<int>& a, int k) {
    int n = a.size(), best = INT_MAX;
    vector<long long> P(n + 1, 0);
    for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
    deque<int> dq;                                   // increasing prefix sums
    for (int i = 0; i <= n; i++) {
        while (!dq.empty() && P[i] - P[dq.front()] >= k) { best = min(best, i - dq.front()); dq.pop_front(); }
        while (!dq.empty() && P[dq.back()] >= P[i]) dq.pop_back();
        dq.push_back(i);
    }
    return best == INT_MAX ? -1 : best;
}`,
    complexity: "O(n) time, O(k) space.",
    variations: ["Sliding Window Maximum (239).", "Shortest Subarray with Sum at Least K (862).", "Constrained subsequence sum: dp[i] = a[i] + max(0, max dp[j] for j in [i−k, i−1])."],
    pitfalls: ["Storing values (can't tell when they leave the window).", "Using < vs ≤ when popping changes nothing for max, but matters if you need the leftmost index."],
    recap: ["Back: pop dominated values. Front: pop expired indices.", "Front is the window's best.", "Works over prefix sums for negative numbers."],
  },

  "stack-parsing": {
    idea: "A stack holds the context you'll return to: open brackets, the number and sign before a parenthesis, or partial results waiting for a higher-precedence operator to finish.",
    signals: ["Valid parentheses, matching brackets", "Evaluate an expression with + − * / and parentheses", "Decode nested encodings like 3[a2[c]]", "Simplify paths, remove adjacent duplicates"],
    steps: [
      "Brackets: push openers, on a closer check the top matches.",
      "Calculator with + − only: keep result and sign; on '(' push (result, sign) and reset; on ')' pop and combine.",
      "With * and /: keep a stack of terms; + pushes num, − pushes −num, * and / apply to the top; answer is the sum.",
    ],
    template: `// Basic Calculator II: + - * / without parentheses
int calculate(const string& s) {
    vector<long long> st;
    long long num = 0; char op = '+';
    for (int i = 0; i <= (int)s.size(); i++) {
        char c = i < (int)s.size() ? s[i] : '+';          // flush at the end
        if (isdigit(c)) { num = num * 10 + (c - '0'); continue; }
        if (c == ' ') continue;
        if (op == '+') st.push_back(num);
        else if (op == '-') st.push_back(-num);
        else if (op == '*') st.back() *= num;
        else st.back() /= num;                            // truncates toward zero
        op = c; num = 0;
    }
    return accumulate(st.begin(), st.end(), 0LL);
}

// Decode String: 3[a2[c]] -> accaccacc
string decodeString(const string& s) {
    vector<pair<string, int>> st;
    string cur; int k = 0;
    for (char c : s) {
        if (isdigit(c)) k = k * 10 + (c - '0');
        else if (c == '[') { st.push_back({cur, k}); cur.clear(); k = 0; }
        else if (c == ']') {
            auto [prev, times] = st.back(); st.pop_back();
            string rep;
            while (times--) rep += cur;
            cur = prev + rep;
        } else cur += c;
    }
    return cur;
}`,
    complexity: "O(n) time (plus output size for decoding), O(n) stack.",
    variations: ["Valid Parentheses (20).", "Basic Calculator (224): (result, sign) stack for parentheses; unary minus.", "Basic Calculator II (227) / III (772): recursion on parentheses + the term stack.", "Decode String (394)."],
    pitfalls: ["Multi-digit numbers: accumulate digits.", "Forgetting to flush the last number.", "Unary minus at the start or right after '('."],
    recap: ["Stack = context to return to.", "Term stack: + push, − push negative, * / fold into top.", "On '(' push state and reset; on ')' pop and combine."],
  },

  "heap-top-k": {
    idea: "A heap keeps the best k items seen so far in O(log k) per insert, or repeatedly gives the next smallest of many sorted sources. For 'k largest', keep a min-heap of size k: its top is the k-th largest.",
    signals: ["Top/bottom k elements, k-th largest in a stream", "Merge k sorted lists/arrays", "Repeatedly take the best available option (greedy scheduling, IPO)", "Running median (see two heaps)"],
    steps: [
      "k largest: min-heap; push each, pop when size > k.",
      "k-way merge: push the head of each list (value, list id); pop the smallest, push its successor.",
      "Greedy with unlock: sort by requirement; push everything now affordable into a max-heap; take the top.",
    ],
    template: `ListNode* mergeKLists(vector<ListNode*>& lists) {
    auto cmp = [](ListNode* a, ListNode* b) { return a->val > b->val; };
    priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> pq(cmp);
    for (auto* l : lists) if (l) pq.push(l);
    ListNode dummy, *tail = &dummy;
    while (!pq.empty()) {
        ListNode* n = pq.top(); pq.pop();
        tail->next = n; tail = n;
        if (n->next) pq.push(n->next);
    }
    return dummy.next;
}

// IPO: at most k projects, capital grows by profit
int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {
    vector<pair<int, int>> p;                      // (capital needed, profit)
    for (int i = 0; i < (int)profits.size(); i++) p.push_back({capital[i], profits[i]});
    sort(p.begin(), p.end());
    priority_queue<int> avail;
    for (int i = 0; k--; ) {
        while (i < (int)p.size() && p[i].first <= w) avail.push(p[i++].second);
        if (avail.empty()) break;
        w += avail.top(); avail.pop();
    }
    return w;
}`,
    complexity: "Top-k: O(n log k). k-way merge: O(N log k) for N total items. Space O(k).",
    variations: ["Merge k Sorted Lists (23).", "Task Scheduler (621): counting formula (maxCount − 1) × (n + 1) + numMax, or a heap simulation.", "IPO (502): sort by capital + max-heap of profits.", "Find Median from Data Stream (295): two heaps."],
    pitfalls: ["std::priority_queue is a max-heap by default; use greater<> for a min-heap.", "Comparator direction is reversed from sort (a > b means min-heap)."],
    recap: ["k largest → min-heap of size k.", "k-way merge: heap of list heads.", "priority_queue default is max-heap."],
  },

  "two-heaps": {
    idea: "Split the numbers into a lower half (max-heap) and an upper half (min-heap) of equal size (± 1). The median is at the tops. Each insert rebalances in O(log n).",
    signals: ["Running median of a stream", "Median of every sliding window", "Balance two groups where you need the boundary element quickly"],
    steps: [
      "Insert into lo (max-heap), then move lo's top to hi, then if hi is bigger move hi's top back to lo.",
      "Median: lo.top() if sizes differ, else the average of the tops.",
      "Sliding window: lazy deletion (count elements to delete, discard when they reach a top) or use two multisets.",
    ],
    template: `class MedianFinder {
    priority_queue<int> lo;                                   // max-heap, lower half
    priority_queue<int, vector<int>, greater<int>> hi;        // min-heap, upper half
public:
    void addNum(int x) {
        lo.push(x);
        hi.push(lo.top()); lo.pop();
        if (hi.size() > lo.size()) { lo.push(hi.top()); hi.pop(); }
    }
    double findMedian() {
        return lo.size() > hi.size() ? lo.top() : (lo.top() + (double)hi.top()) / 2.0;
    }
};

// Sliding window median with two multisets
vector<double> medianSlidingWindow(vector<int>& a, int k) {
    multiset<int> lo, hi;
    vector<double> out;
    auto balance = [&] {
        while (lo.size() > hi.size() + 1) { hi.insert(*prev(lo.end())); lo.erase(prev(lo.end())); }
        while (hi.size() > lo.size()) { lo.insert(*hi.begin()); hi.erase(hi.begin()); }
    };
    for (int i = 0; i < (int)a.size(); i++) {
        if (lo.empty() || a[i] <= *prev(lo.end())) lo.insert(a[i]); else hi.insert(a[i]);
        if (i >= k) {
            int old = a[i - k];
            if (lo.count(old) && old <= *prev(lo.end())) lo.erase(lo.find(old)); else hi.erase(hi.find(old));
        }
        balance();
        if (i >= k - 1) out.push_back(k % 2 ? *prev(lo.end()) : ((double)*prev(lo.end()) + *hi.begin()) / 2.0);
    }
    return out;
}`,
    complexity: "O(log n) per insert, O(1) median. Window version O(n log k).",
    variations: ["Find Median from Data Stream (295).", "Sliding Window Median (480): multisets or lazy deletion.", "Follow-up: values in 0..100 → counting array, O(100) median."],
    pitfalls: ["Integer overflow when averaging two ints: cast to double or long long first.", "multiset::erase(value) erases all copies; erase(find(value)) erases one."],
    recap: ["lo = max-heap, hi = min-heap, |lo| = |hi| or |hi| + 1.", "Push to lo, move top to hi, rebalance.", "Windows: multisets or lazy deletion."],
  },

  "lru-lfu": {
    idea: "O(1) caches combine a hash map (key → node) with a structure that orders by recency: a doubly linked list for LRU, and per-frequency lists plus a min-frequency pointer for LFU.",
    signals: ["Design a cache with get/put in O(1)", "Evict least recently or least frequently used", "All O(1) data structure with inc/dec and getMax/getMin"],
    steps: [
      "LRU: list front = most recent. get → move node to front. put → update or insert at front; if over capacity, evict back.",
      "LFU: key → (value, freq, iterator); freq → list of keys (front = most recent); minFreq. On access, move the key to freq+1's list and bump minFreq if its old list emptied.",
      "Use std::list and store iterators; splice moves nodes in O(1).",
    ],
    template: `class LRUCache {
    int cap;
    list<pair<int, int>> order;                                   // front = most recent
    unordered_map<int, list<pair<int, int>>::iterator> pos;
public:
    LRUCache(int capacity) : cap(capacity) {}
    int get(int key) {
        auto it = pos.find(key);
        if (it == pos.end()) return -1;
        order.splice(order.begin(), order, it->second);           // move to front, O(1)
        return it->second->second;
    }
    void put(int key, int value) {
        if (auto it = pos.find(key); it != pos.end()) {
            it->second->second = value;
            order.splice(order.begin(), order, it->second);
            return;
        }
        if ((int)order.size() == cap) { pos.erase(order.back().first); order.pop_back(); }
        order.emplace_front(key, value);
        pos[key] = order.begin();
    }
};

class LFUCache {
    int cap, minFreq = 0;
    struct Entry { int value, freq; list<int>::iterator it; };
    unordered_map<int, Entry> entries;
    unordered_map<int, list<int>> byFreq;                         // freq -> keys, front = newest
    void touch(int key) {
        Entry& e = entries[key];
        byFreq[e.freq].erase(e.it);
        if (byFreq[e.freq].empty() && minFreq == e.freq) minFreq++;
        byFreq[++e.freq].push_front(key);
        e.it = byFreq[e.freq].begin();
    }
public:
    LFUCache(int capacity) : cap(capacity) {}
    int get(int key) {
        if (!entries.count(key)) return -1;
        touch(key);
        return entries[key].value;
    }
    void put(int key, int value) {
        if (cap == 0) return;
        if (entries.count(key)) { entries[key].value = value; touch(key); return; }
        if ((int)entries.size() == cap) {
            int victim = byFreq[minFreq].back();                   // least recent among least frequent
            byFreq[minFreq].pop_back();
            entries.erase(victim);
        }
        minFreq = 1;
        byFreq[1].push_front(key);
        entries[key] = {value, 1, byFreq[1].begin()};
    }
};`,
    complexity: "O(1) per operation; O(capacity) space.",
    variations: ["LRU Cache (146).", "LFU Cache (460).", "All O`one Data Structure (432): buckets of keys per count in a linked list.", "Thread-safe LRU: one mutex around get/put, or sharded caches."],
    pitfalls: ["Evicting before checking whether the key already exists.", "LFU: forgetting to reset minFreq to 1 on insert.", "Capacity 0."],
    recap: ["LRU = hash map + doubly linked list; splice to front.", "LFU = key map + freq → list + minFreq.", "Update existing keys before evicting."],
  },

  "tree-dfs": {
    idea: "Most tree problems are 'what does each subtree return to its parent?'. Define that return value (height, sum, best path ending here, validity + range), combine children's results in post-order, and update a global answer when the best answer passes through the node.",
    signals: ["Height, diameter, balanced, path sums", "Validate a BST or find an LCA", "Max path sum anywhere in the tree", "Any property that a node can compute from its children"],
    steps: [
      "Pre-order: pass information down (current path sum, allowed range).",
      "Post-order: compute from children's return values (heights, sums).",
      "When the answer can bend through a node (diameter, max path), return the one-sided value but update a global with both sides.",
    ],
    template: `// Diameter: return height, update best with left + right.
int best = 0;
int height(TreeNode* n) {
    if (!n) return 0;
    int l = height(n->left), r = height(n->right);
    best = max(best, l + r);
    return 1 + max(l, r);
}

// Max path sum: negative branches contribute 0.
int maxGain(TreeNode* n, int& ans) {
    if (!n) return 0;
    int l = max(0, maxGain(n->left, ans)), r = max(0, maxGain(n->right, ans));
    ans = max(ans, n->val + l + r);
    return n->val + max(l, r);
}

// Validate BST: pass the allowed range down.
bool valid(TreeNode* n, long long lo, long long hi) {
    if (!n) return true;
    if (n->val <= lo || n->val >= hi) return false;
    return valid(n->left, lo, n->val) && valid(n->right, n->val, hi);
}

// LCA in a binary tree
TreeNode* lca(TreeNode* n, TreeNode* p, TreeNode* q) {
    if (!n || n == p || n == q) return n;
    TreeNode* l = lca(n->left, p, q);
    TreeNode* r = lca(n->right, p, q);
    return l && r ? n : (l ? l : r);
}`,
    complexity: "O(n) time; O(h) recursion stack (O(n) for a skewed tree).",
    variations: ["Validate BST (98): ranges, not just parent comparisons.", "LCA (236).", "Diameter (543).", "Binary Tree Maximum Path Sum (124): initialize the answer to INT_MIN."],
    pitfalls: ["Checking only node vs children for BST validity.", "Deep skewed trees overflow the stack: convert to iterative if n is 10⁵+.", "Initializing max path sum to 0 when all values are negative."],
    recap: ["Define what a subtree returns.", "Return one side, update global with both sides.", "BST validity needs (lo, hi) bounds."],
  },

  "tree-bfs": {
    idea: "A queue processes the tree level by level. Take the queue's size at the start of each level to know where the level ends; that's all you need for level averages, right side view, zigzag, or minimum depth.",
    signals: ["Level order output, per-level aggregates", "Right/left side view", "Minimum depth (BFS stops early)", "Vertical order (BFS with column index)"],
    steps: [
      "Push root; while queue not empty: size = q.size(); pop size nodes, push their children.",
      "Record per level: last node for right view, values for level order.",
      "Vertical order: carry (node, row, col); group by col, sort by (row, value).",
    ],
    template: `vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> out;
    if (!root) return out;
    queue<TreeNode*> q; q.push(root);
    while (!q.empty()) {
        int sz = q.size();
        out.emplace_back();
        while (sz--) {
            TreeNode* n = q.front(); q.pop();
            out.back().push_back(n->val);
            if (n->left) q.push(n->left);
            if (n->right) q.push(n->right);
        }
    }
    return out;
}

// Vertical traversal: (col, row, val) sorted
vector<vector<int>> verticalTraversal(TreeNode* root) {
    vector<tuple<int, int, int>> nodes;
    queue<tuple<TreeNode*, int, int>> q; q.push({root, 0, 0});
    while (!q.empty()) {
        auto [n, row, col] = q.front(); q.pop();
        nodes.push_back({col, row, n->val});
        if (n->left) q.push({n->left, row + 1, col - 1});
        if (n->right) q.push({n->right, row + 1, col + 1});
    }
    sort(nodes.begin(), nodes.end());
    vector<vector<int>> out;
    int lastCol = INT_MIN;
    for (auto& [col, row, v] : nodes) {
        if (col != lastCol) { out.emplace_back(); lastCol = col; }
        out.back().push_back(v);
    }
    return out;
}`,
    complexity: "O(n) time (O(n log n) for vertical order), O(width) queue.",
    variations: ["Level Order (102).", "Right Side View (199): last node of each level.", "Vertical Order Traversal (987): ties sorted by value."],
    pitfalls: ["Reading q.size() inside the loop condition (it changes as you push).", "Vertical order ties: same row and column sort by value."],
    recap: ["Snapshot q.size() per level.", "Right view = last per level.", "BFS finds minimum depth first."],
  },

  "tree-construct": {
    idea: "A preorder gives the root first; the inorder tells you how many nodes are in the left subtree. Recurse on index ranges with a value → inorder index map. Serialization is any traversal that records null markers so the shape is unambiguous.",
    signals: ["Build a tree from two traversals", "Serialize/deserialize a tree to a string", "Build a BST from preorder (bounds)"],
    steps: [
      "Map value → index in inorder.",
      "build(preL, inL, inR): root = pre[preL]; k = idx[root]; leftSize = k − inL; left = build(preL+1, inL, k−1); right = build(preL+1+leftSize, k+1, inR).",
      "Serialize with preorder and '#' for null; deserialize by reading tokens in the same order.",
    ],
    template: `TreeNode* build(vector<int>& pre, int& p, int inL, int inR, unordered_map<int, int>& idx) {
    if (inL > inR) return nullptr;
    int v = pre[p++];
    TreeNode* n = new TreeNode(v);
    n->left = build(pre, p, inL, idx[v] - 1, idx);
    n->right = build(pre, p, idx[v] + 1, inR, idx);
    return n;
}
TreeNode* buildTree(vector<int>& pre, vector<int>& in) {
    unordered_map<int, int> idx;
    for (int i = 0; i < (int)in.size(); i++) idx[in[i]] = i;
    int p = 0;
    return build(pre, p, 0, in.size() - 1, idx);
}

string serialize(TreeNode* n) {
    if (!n) return "#";
    return to_string(n->val) + "," + serialize(n->left) + "," + serialize(n->right);
}
TreeNode* parse(istringstream& in) {
    string tok;
    getline(in, tok, ',');
    if (tok == "#") return nullptr;
    TreeNode* n = new TreeNode(stoi(tok));
    n->left = parse(in); n->right = parse(in);
    return n;
}
TreeNode* deserialize(const string& s) { istringstream in(s); return parse(in); }`,
    complexity: "O(n) time and space.",
    variations: ["Construct from Preorder and Inorder (105).", "Serialize and Deserialize Binary Tree (297).", "Postorder + inorder: take the root from the end and build right before left."],
    pitfalls: ["Duplicate values break the value → index map.", "Recursion depth for big skewed trees; an iterative BFS serializer avoids it.", "Building left/right in the wrong order when consuming the preorder pointer."],
    recap: ["Preorder gives roots; inorder splits left/right.", "Shared preorder index; build left first.", "Serialize with null markers."],
  },

  bst: {
    idea: "In a BST, inorder traversal visits values in sorted order, and at each node you know which side the target is on. Use that to get k-th smallest, iterators, range queries, and to repair swapped nodes.",
    signals: ["k-th smallest/largest in a BST", "BST iterator with O(h) memory", "Two nodes swapped by mistake", "Search, insert, delete, floor/ceiling"],
    steps: [
      "Iterative inorder with an explicit stack: push all left children, pop, visit, go right.",
      "k-th smallest: stop at the k-th pop.",
      "Recover swapped nodes: in the inorder sequence find the first and last 'drop' (prev > cur); swap those two values.",
    ],
    template: `class BSTIterator {
    stack<TreeNode*> st;
    void pushLeft(TreeNode* n) { for (; n; n = n->left) st.push(n); }
public:
    BSTIterator(TreeNode* root) { pushLeft(root); }
    bool hasNext() { return !st.empty(); }
    int next() {
        TreeNode* n = st.top(); st.pop();
        pushLeft(n->right);
        return n->val;
    }
};

int kthSmallest(TreeNode* root, int k) {
    BSTIterator it(root);
    while (--k) it.next();
    return it.next();
}

void recoverTree(TreeNode* root) {
    TreeNode *first = nullptr, *second = nullptr, *prev = nullptr;
    stack<TreeNode*> st;
    for (TreeNode* n = root; n || !st.empty(); ) {
        while (n) { st.push(n); n = n->left; }
        n = st.top(); st.pop();
        if (prev && prev->val > n->val) { if (!first) first = prev; second = n; }
        prev = n;
        n = n->right;
    }
    swap(first->val, second->val);
}`,
    complexity: "O(h) per iterator step amortized O(1); O(n) for full traversals; O(h) space.",
    variations: ["Kth Smallest in a BST (230): follow-up with frequent inserts → keep subtree sizes.", "BST Iterator (173).", "Recover BST (99): Morris traversal for O(1) space."],
    pitfalls: ["Recover BST with adjacent swapped nodes: only one drop, so set second on every drop.", "Deleting a node with two children: replace with the inorder successor."],
    recap: ["Inorder of a BST is sorted.", "Iterator = stack of left spine.", "Swapped nodes: first drop's prev, last drop's cur."],
  },

  "tree-dp": {
    idea: "Compute DP values per node from its children (post-order), often with a small state like 'node taken / not taken'. Rerooting computes the answer for every node as the root in O(n) by passing the parent's contribution down in a second DFS.",
    signals: ["Choose nodes with an adjacency constraint (no two adjacent)", "An answer per node as if it were the root (sum of distances)", "Min cameras / guards to cover the tree"],
    steps: [
      "First DFS (post-order): dp[node] from children, e.g. {take, skip}.",
      "Rerooting: answer[child] = answer[parent] adjusted by moving the root across the edge; second DFS (pre-order).",
      "For sum of distances: ans[child] = ans[parent] − size[child] + (n − size[child]).",
    ],
    template: `// House Robber III: returns {rob this node, skip this node}
pair<int, int> rob(TreeNode* n) {
    if (!n) return {0, 0};
    auto [lt, ls] = rob(n->left);
    auto [rt, rs] = rob(n->right);
    return {n->val + ls + rs, max(lt, ls) + max(rt, rs)};
}

// Sum of distances in a tree (rerooting)
vector<int> sumOfDistancesInTree(int n, vector<vector<int>>& edges) {
    vector<vector<int>> g(n);
    for (auto& e : edges) { g[e[0]].push_back(e[1]); g[e[1]].push_back(e[0]); }
    vector<int> size(n, 1), ans(n, 0);
    function<void(int, int)> down = [&](int u, int p) {          // sizes + ans[0]
        for (int v : g[u]) if (v != p) { down(v, u); size[u] += size[v]; ans[u] += ans[v] + size[v]; }
    };
    function<void(int, int)> up = [&](int u, int p) {            // reroot to children
        for (int v : g[u]) if (v != p) { ans[v] = ans[u] - size[v] + (n - size[v]); up(v, u); }
    };
    down(0, -1); up(0, -1);
    return ans;
}`,
    complexity: "O(n) time, O(n) space.",
    variations: ["House Robber III (337).", "Sum of Distances in Tree (834).", "Binary Tree Cameras (968): states covered / has camera / not covered."],
    pitfalls: ["Recomputing children in both branches (exponential) instead of returning a pair.", "Recursion depth on a path-shaped tree of 10⁵ nodes; use iterative order or increase stack."],
    recap: ["Return a small state tuple per node.", "Rerooting: second DFS moves the root across each edge.", "Sum of distances: ans[c] = ans[p] − size[c] + n − size[c]."],
  },

  "binary-lifting": {
    idea: "Precompute up[k][v] = the 2^k-th ancestor of v. Any jump of d levels is a combination of powers of two (O(log n)), and LCA lifts the deeper node to the same depth, then lifts both while their ancestors differ. An Euler tour turns subtrees into contiguous ranges.",
    signals: ["k-th ancestor queries", "Many LCA queries on a static tree", "Distance between two nodes (depth[u] + depth[v] − 2·depth[lca])", "Subtree sum/update queries (Euler tour + Fenwick/segment tree)"],
    steps: [
      "DFS to get depth and up[0] (parent).",
      "up[k][v] = up[k−1][ up[k−1][v] ].",
      "kth ancestor: for each bit set in k, jump.",
      "LCA: lift deeper to equal depth; if equal return; for k from high to low, if up[k][u] != up[k][v] jump both; answer is up[0][u].",
    ],
    template: `struct LCA {
    int LOG; vector<vector<int>> up; vector<int> depth, tin, tout; int timer = 0;
    LCA(int n, vector<vector<int>>& g, int root = 0) : LOG(__lg(n) + 1), up(LOG, vector<int>(n)), depth(n), tin(n), tout(n) {
        function<void(int, int)> dfs = [&](int u, int p) {
            tin[u] = timer++;                       // Euler tour: subtree = [tin, tout)
            up[0][u] = p;
            for (int v : g[u]) if (v != p) { depth[v] = depth[u] + 1; dfs(v, u); }
            tout[u] = timer;
        };
        dfs(root, root);
        for (int k = 1; k < LOG; k++)
            for (int v = 0; v < n; v++) up[k][v] = up[k - 1][up[k - 1][v]];
    }
    int kth(int v, int k) {
        for (int b = 0; b < LOG && v != -1; b++) if (k >> b & 1) v = up[b][v];
        return v;
    }
    int lca(int u, int v) {
        if (depth[u] < depth[v]) swap(u, v);
        u = kth(u, depth[u] - depth[v]);
        if (u == v) return u;
        for (int k = LOG - 1; k >= 0; k--)
            if (up[k][u] != up[k][v]) { u = up[k][u]; v = up[k][v]; }
        return up[0][u];
    }
};`,
    complexity: "O(n log n) preprocessing, O(log n) per query, O(n log n) memory.",
    variations: ["Kth Ancestor of a Tree Node (1483): return −1 when jumping past the root (use −1 as the root's parent and guard).", "Subtree range queries: Euler tour indices + Fenwick tree for point update / subtree sum.", "Path queries: combine binary lifting with max/min tables along each jump."],
    pitfalls: ["Root's parent: set to itself (for LCA) or −1 (for k-th ancestor) and guard accordingly.", "Recursive DFS depth on long chains."],
    recap: ["up[k][v] = up[k−1][up[k−1][v]].", "LCA: equalize depth, then lift both from the highest bit.", "Euler tour: subtree = [tin, tout)."],
  },

  trie: {
    idea: "A tree keyed by characters: every path from the root spells a prefix. Lookups and prefix checks cost O(length) regardless of how many words are stored, and a DFS over the trie prunes whole groups of words at once.",
    signals: ["Prefix queries (startsWith, autocomplete, count words with prefix)", "Search many words in a grid (Word Search II)", "Wildcard matching against a dictionary", "Maximum XOR of two numbers (binary trie)"],
    steps: [
      "Node: children[26] (or a map) + isEnd (+ counters).",
      "Insert: walk/create children; mark end.",
      "Word Search II: insert all words; DFS the grid while following trie children; prune when the child is missing; remove found words to avoid duplicates.",
      "Max XOR: insert bits from high to low; for each number greedily go to the opposite bit when it exists.",
    ],
    template: `struct Trie {
    struct Node { int next[26]; bool end = false; Node() { memset(next, -1, sizeof next); } };
    vector<Node> t{Node()};
    void insert(const string& w) {
        int u = 0;
        for (char c : w) {
            if (t[u].next[c - 'a'] == -1) { t[u].next[c - 'a'] = t.size(); t.emplace_back(); }
            u = t[u].next[c - 'a'];
        }
        t[u].end = true;
    }
    int walk(const string& w) {
        int u = 0;
        for (char c : w) if ((u = t[u].next[c - 'a']) == -1) return -1;
        return u;
    }
    bool search(const string& w) { int u = walk(w); return u != -1 && t[u].end; }
    bool startsWith(const string& p) { return walk(p) != -1; }
};

// Maximum XOR of two numbers: binary trie, 31 bits
int findMaximumXOR(vector<int>& a) {
    vector<array<int, 2>> t(1, {-1, -1});
    int best = 0;
    for (int x : a) {
        int u = 0, v = 0, cur = 0;
        for (int b = 30; b >= 0; b--) {                    // insert
            int bit = x >> b & 1;
            if (t[u][bit] == -1) { t[u][bit] = t.size(); t.push_back({-1, -1}); }
            u = t[u][bit];
        }
        for (int b = 30; b >= 0; b--) {                    // query: prefer the opposite bit
            int want = (x >> b & 1) ^ 1;
            if (t[v][want] != -1) { cur |= 1 << b; v = t[v][want]; } else v = t[v][want ^ 1];
        }
        best = max(best, cur);
    }
    return best;
}`,
    complexity: "O(L) per insert/search; O(total characters × alphabet) memory. Max XOR: O(n · 31).",
    variations: ["Implement Trie (208).", "Word Search II (212): trie-guided DFS, prune empty branches.", "Max XOR (421).", "Add and Search Word (211): '.' tries every child."],
    pitfalls: ["Memory blow-up with 26 pointers per node for huge inputs (use maps or arrays of ints).", "Word Search II returning duplicates: clear end after finding."],
    recap: ["Paths are prefixes; cost is O(length).", "Trie + DFS prunes many words at once.", "Binary trie: greedily take the opposite bit for max XOR."],
  },
};
