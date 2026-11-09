import { designProblem, seq } from "./design";
import type { ProblemSpec } from "./types";

// Remaining roadmap problems (plan 0022): design problems, a sliding median and a list cycle. The expected outputs of every test were produced by running the C++ reference solution.

export const DESIGN_SPECS_C: ProblemSpec[] = [
  {
    id: "lc-142",
    source: "leetcode",
    url: "https://leetcode.com/problems/linked-list-cycle-ii/",
    title: "Linked List Cycle II",
    statement: [
      "A singly linked list is given by the values of its nodes in order, nums, and a number pos. The last node points back to the node at index pos (counting from 0); if pos is -1 the last node points to nothing and there is no cycle.",
      "Return the index of the node where the cycle begins, or -1 if the list has no cycle. Aim for O(1) extra memory: walk the list with pointers instead of marking visited nodes.",
    ],
    constraints: ["0 <= nums.length <= 100000", "-100000 <= nums[i] <= 100000", "pos is -1 or a valid index of nums"],
    fn: {"name":"detectCycle","params":[{"name":"nums","type":"int[]"},{"name":"pos","type":"int"}],"returns":"int"},
    examples: [
      { input: [[3,2,0,-4],1], output: 1, explanation: "The last node (-4) points back to the node at index 1, so the cycle starts there." },
      { input: [[1,2],0], output: 0 },
      { input: [[1],-1], output: -1, explanation: "One node that points to nothing: no cycle." },
    ],
    tests: [
      { input: [[],-1], output: -1 },
      { input: [[5],0], output: 0 },
      { input: [[1,2,3,4,5],-1], output: -1 },
      { input: [[1,2,3,4,5],4], output: 4 },
      { input: [[1,2,3,4,5,6,7,8],3], output: 3 },
      { input: [[9,9,9,9],2], output: 2 },
      { input: [[1,2,3],0], output: 0 },
    ],
    hints: [
      "Detecting a cycle is the easy part: one pointer moves one step at a time, another two steps. If they ever meet, there is a cycle.",
      "Let the cycle start at distance a from the head, and let the two pointers meet at distance b past the start of the cycle. The fast one has walked twice as far as the slow one.",
      "That gives a = (cycle length) - b modulo the cycle length. So after they meet, put one pointer back at the head and move both one step at a time: they meet at the start of the cycle.",
    ],
    solution: {
      idea: [
        "Floyd's algorithm. Move slow by one and fast by two until they meet; if fast falls off the end there is no cycle.",
        "Put one pointer back at the head. Move both pointers one step at a time. They meet exactly at the node where the cycle starts, because the distance from the head to the start equals the distance from the meeting point onward to the start (modulo the cycle length).",
      ],
      complexity: "O(n) time, O(1) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int detectCycle(vector<int> nums, int pos) {
        int n = nums.size();
        if (n == 0) return -1;
        // next[i] is the node after i: the last one points to pos (or to nothing, -1).
        auto next = [&](int i) { return i + 1 < n ? i + 1 : pos; };
        int slow = 0, fast = 0;
        while (true) {
            slow = next(slow);
            if (slow < 0) return -1;
            fast = next(fast);
            if (fast < 0) return -1;
            fast = next(fast);
            if (fast < 0) return -1;
            if (slow == fast) break;
        }
        slow = 0;
        while (slow != fast) {
            slow = next(slow);
            fast = next(fast);
        }
        return slow;
    }
};
`,
    },
  },
  {
    id: "lc-480",
    source: "leetcode",
    url: "https://leetcode.com/problems/sliding-window-median/",
    title: "Sliding Window Median",
    statement: [
      "Slide a window of k numbers from the left end of nums to the right end, one step at a time. For every position of the window, find the median of the k numbers inside it: the middle number when k is odd, the average of the two middle numbers when k is even.",
      "To keep every answer a whole number, return twice the median for each window (so a median of 2.5 is reported as 5, and a median of -1 as -2). The result has nums.length - k + 1 entries.",
    ],
    constraints: ["1 <= k <= nums.length <= 100000", "-2147483648 <= nums[i] <= 2147483647"],
    fn: {"name":"slidingWindowMedian","params":[{"name":"nums","type":"int[]"},{"name":"k","type":"int"}],"returns":"long[]"},
    examples: [
      { input: [[1,3,-1,-3,5,3,6,7],3], output: [2,-2,-2,6,10,12], explanation: "The windows are [1,3,-1], [3,-1,-3], [-1,-3,5], [-3,5,3], [5,3,6], [3,6,7] with medians 1, -1, -1, 3, 5, 6. Doubled: 2, -2, -2, 6, 10, 12." },
      { input: [[1,2,3,4,2,3,1,4,2],3], output: [4,6,6,6,4,6,4] },
      { input: [[1,4,2,3],4], output: [5], explanation: "One window, sorted 1 2 3 4: the middle two are 2 and 3, their average is 2.5, doubled 5." },
    ],
    tests: [
      { input: [[7],1], output: [14] },
      { input: [[2147483647,2147483647],2], output: [4294967294] },
      { input: [[-2147483648,-2147483648,2147483647],2], output: [-4294967296,-1] },
      { input: [[5,5,5,5,5],2], output: [10,10,10,10] },
      { input: [[1,2,3,4,5,6],6], output: [7] },
      { input: [[9,8,7,6,5,4,3],4], output: [15,13,11,9] },
      { input: [[0,0,0,1,-1,1,-1],3], output: [0,0,0,2,-2] },
    ],
    hints: [
      "Sorting every window costs O(k log k) per step, which is too slow for large k. You need to keep the window sorted while it moves.",
      "A balanced structure that allows insert, erase and 'give me the middle element' works: for example a multiset plus an iterator that always points at the middle.",
      "When a number enters or leaves, move the middle iterator one step if the number landed on its left or right side. Take care with numbers equal to the middle value, and use 64-bit integers: two middle numbers of an even window can add up past 32 bits.",
    ],
    solution: {
      idea: [
        "Keep the k numbers of the window in a multiset and an iterator mid that points at the element at position k / 2 (0-based).",
        "To move the window: insert the new number, move mid one step left if the new number is smaller than the middle one, erase the number that left (moving mid first if mid points at it or the removed number is before it), and so on. Then the answer is 2 * (*mid) for odd k and *mid + *prev(mid) for even k, computed in 64 bits.",
      ],
      complexity: "O(n log k) time, O(k) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> slidingWindowMedian(vector<int> nums, int k) {
        multiset<int> window(nums.begin(), nums.begin() + k);
        auto mid = next(window.begin(), k / 2);
        vector<long long> out;
        for (int i = k;; i++) {
            if (k % 2) out.push_back(2LL * *mid);
            else out.push_back((long long)*mid + *prev(mid));
            if (i == (int)nums.size()) break;
            window.insert(nums[i]);
            if (nums[i] < *mid) mid--;
            if (nums[i - k] <= *mid) mid++;
            window.erase(window.lower_bound(nums[i - k]));
        }
        return out;
    }
};
`,
    },
  },
  designProblem({
    id: "lc-295",
    url: "https://leetcode.com/problems/find-median-from-data-stream/",
    title: "Find Median from Data Stream",
    statement: [
      "Design a structure that receives numbers one at a time and can report the median of all the numbers received so far.",
      "addNum(num) adds a number. findMedian() returns the median: the middle number when the count is odd, the average of the two middle numbers when it is even. findMedian is never called before the first addNum.",
      "Each test gives the operations in order (the class name first, then method names) and their arguments; the expected answer has one entry per operation, with null for the constructor and for methods that return nothing.",
    ],
    constraints: ["-100000 <= num <= 100000", "At most 100000 calls in total"],
    design: {"className":"MedianFinder","ctor":[],"methods":[{"name":"addNum","params":[{"name":"num","type":"int"}],"returns":"void"},{"name":"findMedian","params":[],"returns":"double"}]},
    examples: [
      { ...seq("MedianFinder() addNum(1) addNum(2) findMedian() addNum(3) findMedian()", [null,null,null,1.5,null,2]), explanation: "After 1 and 2 the median is (1 + 2) / 2 = 1.5. After adding 3 the middle number of 1, 2, 3 is 2." },
    ],
    tests: [
      seq("MedianFinder() addNum(5) findMedian()", [null,null,5]),
      seq("MedianFinder() addNum(-1) addNum(-2) findMedian() addNum(-3) findMedian() addNum(-4) findMedian() addNum(-5) findMedian()", [null,null,null,-1.5,null,-2,null,-2.5,null,-3]),
      seq("MedianFinder() addNum(4) addNum(4) addNum(4) findMedian() addNum(4) findMedian()", [null,null,null,null,4,null,4]),
      seq("MedianFinder() addNum(100000) addNum(-100000) findMedian() addNum(0) findMedian()", [null,null,null,0,null,0]),
      seq("MedianFinder() addNum(1) findMedian() addNum(100) findMedian() addNum(2) findMedian() addNum(99) findMedian() addNum(3) findMedian()", [null,null,1,null,50.5,null,2,null,50.5,null,3]),
      seq("MedianFinder() addNum(6) addNum(10) addNum(2) addNum(6) addNum(5) addNum(0) addNum(6) addNum(3) findMedian() addNum(1) findMedian()", [null,null,null,null,null,null,null,null,null,5.5,null,5]),
    ],
    hints: [
      "Keeping all numbers in a sorted list makes the median easy to read, but inserting into a sorted list costs O(n).",
      "The median only needs the middle: split the numbers into a lower half and an upper half, where every number in the lower half is at most every number in the upper half.",
      "Keep the lower half in a max-heap and the upper half in a min-heap, with sizes equal or the lower one bigger by one. Push the new number through one heap into the other to keep both halves correct, then rebalance the sizes. The median is the top of the lower heap, or the average of both tops.",
    ],
    solution: {
      idea: [
        "Two heaps: a max-heap lo with the smaller half and a min-heap hi with the larger half. Keep lo's size equal to hi's size or one more.",
        "addNum pushes the number into lo, moves lo's biggest element into hi, and if hi became bigger than lo moves hi's smallest element back. findMedian returns the top of lo when the count is odd and the average of the two tops when it is even.",
      ],
      complexity: "addNum O(log n), findMedian O(1).",
      cpp: `class MedianFinder {
    priority_queue<int> lo;                              // smaller half, biggest on top
    priority_queue<int, vector<int>, greater<int>> hi;   // larger half, smallest on top

public:
    MedianFinder() {}

    void addNum(int num) {
        lo.push(num);
        hi.push(lo.top());
        lo.pop();
        if (hi.size() > lo.size()) {
            lo.push(hi.top());
            hi.pop();
        }
    }

    double findMedian() {
        if (lo.size() > hi.size()) return lo.top();
        return ((double)lo.top() + hi.top()) / 2.0;
    }
};
`,
    },
  }),
  designProblem({
    id: "lc-432",
    url: "https://leetcode.com/problems/all-oone-data-structure/",
    title: "All O`one Data Structure",
    statement: [
      "Design a structure that counts how many times each string was added and can tell you the most and the least counted string, all in O(1) per call.",
      "inc(key) adds one to the count of key (a new key starts at 1). dec(key) takes one away; a key whose count reaches 0 is removed. dec is only called for keys that exist. getMaxKey() returns a key with the highest count and getMinKey() a key with the lowest count, or an empty string if there are no keys.",
      "Here the tests only ask for the maximum or minimum when exactly one key has it, so there is only one right answer. Each test gives the operations in order (the class name first, then method names) and their arguments; the expected answer has one entry per operation, with null for the constructor and for methods that return nothing.",
    ],
    constraints: ["1 <= key.length <= 10", "key has lowercase letters only", "At most 100000 calls in total", "getMaxKey and getMinKey are only called when their answer is unique"],
    design: {"className":"AllOne","ctor":[],"methods":[{"name":"inc","params":[{"name":"key","type":"string"}],"returns":"void"},{"name":"dec","params":[{"name":"key","type":"string"}],"returns":"void"},{"name":"getMaxKey","params":[],"returns":"string"},{"name":"getMinKey","params":[],"returns":"string"}]},
    examples: [
      { ...seq("AllOne() inc(\"hello\") inc(\"hello\") getMaxKey() getMinKey() inc(\"leet\") getMaxKey() getMinKey()", [null,null,null,"hello","hello",null,"hello","leet"]), explanation: "hello has count 2 and is both the max and the min. After leet is added with count 1, hello is the max and leet the min." },
    ],
    tests: [
      seq("AllOne() getMaxKey() getMinKey() inc(\"a\") getMaxKey() getMinKey() dec(\"a\") getMaxKey() getMinKey()", [null,"","",null,"a","a",null,"",""]),
      seq("AllOne() inc(\"a\") inc(\"a\") inc(\"a\") inc(\"b\") inc(\"b\") inc(\"c\") getMaxKey() getMinKey() dec(\"c\") getMinKey() inc(\"b\") inc(\"b\") getMaxKey() getMinKey() dec(\"b\") dec(\"b\") dec(\"b\") getMaxKey() getMinKey() dec(\"b\") getMinKey() getMaxKey()", [null,null,null,null,null,null,null,"a","c",null,"b",null,null,"b","a",null,null,null,"a","b",null,"a","a"]),
      seq("AllOne() inc(\"z\") dec(\"z\") getMaxKey() getMinKey() inc(\"z\") inc(\"z\") dec(\"z\") getMaxKey() getMinKey()", [null,null,null,"","",null,null,null,"z","z"]),
      seq("AllOne() inc(\"k1\") inc(\"k2\") inc(\"k2\") inc(\"k3\") inc(\"k3\") inc(\"k3\") inc(\"k4\") inc(\"k4\") inc(\"k4\") inc(\"k4\") inc(\"k5\") inc(\"k5\") inc(\"k5\") inc(\"k5\") inc(\"k5\") getMaxKey() getMinKey() dec(\"k5\") dec(\"k5\") dec(\"k5\") dec(\"k5\") dec(\"k5\") getMaxKey() getMinKey() dec(\"k1\") getMinKey() getMaxKey()", [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"k5","k1",null,null,null,null,null,"k4","k1",null,"k2","k4"]),
      seq("AllOne() inc(\"p\") inc(\"q\") inc(\"q\") getMinKey() dec(\"p\") getMinKey() getMaxKey() inc(\"p\") inc(\"p\") inc(\"p\") getMaxKey() getMinKey()", [null,null,null,null,"p",null,"q","q",null,null,null,"p","q"]),
      seq("AllOne() inc(\"x\") inc(\"x\") inc(\"y\") inc(\"y\") inc(\"y\") dec(\"y\") dec(\"y\") getMaxKey() getMinKey() dec(\"y\") getMaxKey() getMinKey()", [null,null,null,null,null,null,null,null,"x","y",null,"x","x"]),
    ],
    hints: [
      "A hash map from key to count gives inc and dec in O(1), but finding the biggest count would need a scan.",
      "Group keys by count: keep the distinct counts in an ordered chain (a doubly linked list of buckets sorted by count), each bucket holding the set of keys with that count.",
      "inc moves a key from its bucket to the bucket with count + 1 (creating it right after if missing); dec moves it to the bucket before (or removes it at 0). Empty buckets are unlinked. The first bucket holds the minimum keys and the last one the maximum keys.",
    ],
    solution: {
      idea: [
        "Keep a map key -> count and a sorted map count -> set of keys (or a linked list of buckets, which gives true O(1) because neighbours are found by pointer).",
        "inc and dec update both structures and delete a bucket when it becomes empty. getMaxKey takes any key of the last bucket and getMinKey any key of the first bucket.",
      ],
      complexity: "O(log n) per call with the ordered map used in the reference; O(1) with a linked list of buckets.",
      cpp: `class AllOne {
    unordered_map<string, int> count;
    map<int, set<string>> byCount;

    void move(const string& key, int from, int to) {
        if (from > 0) {
            byCount[from].erase(key);
            if (byCount[from].empty()) byCount.erase(from);
        }
        if (to > 0) {
            byCount[to].insert(key);
            count[key] = to;
        } else {
            count.erase(key);
        }
    }

public:
    AllOne() {}

    void inc(string key) {
        int c = count.count(key) ? count[key] : 0;
        move(key, c, c + 1);
    }

    void dec(string key) {
        int c = count[key];
        move(key, c, c - 1);
    }

    string getMaxKey() {
        if (byCount.empty()) return "";
        return *byCount.rbegin()->second.begin();
    }

    string getMinKey() {
        if (byCount.empty()) return "";
        return *byCount.begin()->second.begin();
    }
};
`,
    },
  }),
];
