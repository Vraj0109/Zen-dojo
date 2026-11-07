import type { PatternArticle } from "./types";

// Full pattern articles, group 1 (arrays, strings, hashing). Written for this app; code is C++17 and compiles on its own
// (pattern-article-code.test.ts compiles every block). Blocks within one article may use each other's helpers.

export const DSA_ARTICLES_A: Record<string, PatternArticle> = {
  // ----------------------------------------------------------------------------------------------------- hash map
  "hash-map": {
    intro:
      "Many array and string problems ask the same small question again and again: have I seen this value before, how many times, or which earlier items look like this one? A hash map answers that in constant time on average, so a scan that would compare every pair becomes a single pass. You reach for it when a problem mentions pairs, duplicates, frequencies, anagrams, or a subarray whose sum must hit a target.",
    sections: [
      {
        title: "The intuition",
        body: "Take Two Sum: find two numbers that add up to a target. The direct way checks every pair, which is n times n steps, about a million operations for 1,000 numbers and ten billion for 100,000. The slow part is not the arithmetic. It is the repeated question 'is there an earlier number equal to target minus this one?', answered by rereading the array each time.\n\nA hash map is a notebook with instant lookup. You walk through the array once. For each number you first ask the notebook whether its partner has been written down, and only then write the number itself. You trade memory for time: the notebook holds up to n entries, and in return every question costs one lookup instead of one scan.\n\nA hash map does three different jobs, and it helps to know which one a problem needs. It can remember (value to index, or just 'seen'), it can count (value to how many times), and it can group (a canonical key to the list of items that share it). Anagram problems group by a key such as the sorted letters. Subarray problems count prefix sums. Most of the pattern is choosing the right key and the right thing to store.",
      },
      {
        title: "Why it works",
        body: "The reasoning is an invariant. After you have processed the first i elements, the map describes exactly those i elements: every value you saw, with its index or its count. When element i arrives, the map is a faithful picture of everything before it, so one lookup answers a question about the whole prefix.\n\nThat gives correctness for pair problems. Suppose a valid pair exists at positions p and q with p less than q. When the scan reaches q, the element at p is already in the map, because it was inserted when the scan passed p. The lookup for the complement of a[q] therefore finds it. Each valid pair is found at the moment its later element arrives, and no pair is missed.\n\nThe order of 'look up, then insert' matters. If you insert first, an element can match itself. With target 6 and the array [3, 2, 4], inserting 3 and then asking for 3 would wrongly report the pair (0, 0). Looking up first guarantees the match is an earlier, different position.\n\nFor counting and grouping the argument is simpler. A count is exact because every element increments exactly one counter. A group is correct when two items get the same key exactly when they are equivalent, which is why the key must capture everything that matters and nothing else.\n\nThe constant time is an average, not a promise. A hash table spreads keys over buckets; with a decent hash function the expected bucket size is a small constant. In the worst case every key lands in one bucket and a lookup costs n. That does not happen on honest input, but it does happen on inputs built to attack a known hash function, a point we return to under pitfalls.",
      },
      {
        title: "A worked example",
        body: "First, Two Sum on the array [2, 7, 11, 15] with target 9. The map starts empty and stores value to index.\n\nStep 1, i = 0, value 2: the complement is 9 - 2 = 7. The map is empty, so 7 is not there. Insert 2 at index 0. Map: {2: 0}.\nStep 2, i = 1, value 7: the complement is 9 - 7 = 2. The map has 2 at index 0, so the answer is (0, 1). We stop.\n\nSecond, the prefix-sum use: count subarrays of [1, 2, 3] whose sum is 3. The map counts how many times each prefix sum has occurred, and it starts as {0: 1} for the empty prefix.\n\nStep 1, value 1: prefix = 1. We need an earlier prefix equal to 1 - 3 = -2. There is none, so the count stays 0. Record prefix 1. Map: {0: 1, 1: 1}.\nStep 2, value 2: prefix = 3. We need an earlier prefix equal to 3 - 3 = 0. The map has 0 once, so the count becomes 1. That subarray is [1, 2]. Record prefix 3. Map: {0: 1, 1: 1, 3: 1}.\nStep 3, value 3: prefix = 6. We need an earlier prefix equal to 6 - 3 = 3. The map has 3 once, so the count becomes 2. That subarray is [3].\n\nThe answer is 2: the subarrays [1, 2] and [3]. The idea behind it is that the sum of a[i..j] equals prefix[j + 1] minus prefix[i], so a subarray ending at the current position sums to k exactly when an earlier prefix equals the current prefix minus k.",
      },
      {
        title: "Implementation",
        body: "Two Sum in one pass. Read the loop in this order: ask for the complement, return if it is there, and only then record the current value. The map goes from value to the index where it was last seen. If the input may repeat values, the later index overwrites the earlier one, which is fine for returning any valid pair, because the pair is found when the later element arrives.\n\nA few details make this safe. The function returns an empty vector when there is no pair, so the caller must check. The complement target minus a[i] can overflow int if the values are near the limits of int; on such inputs compute it in long long.",
        code: `// Two Sum: one pass. Look up the complement BEFORE inserting the current element,
// so an element is never paired with itself.
vector<int> twoSum(const vector<int>& a, int target) {
    unordered_map<int, int> seen;              // value -> index where we saw it
    for (int i = 0; i < (int)a.size(); i++) {
        auto it = seen.find(target - a[i]);
        if (it != seen.end()) return {it->second, i};
        seen[a[i]] = i;
    }
    return {};                                 // no pair
}`,
      },
      {
        title: "Implementation: counting and grouping",
        body: "Counting is the simplest use: cnt[x]++ creates the entry with value 0 the first time you touch it and then increments it. Grouping needs a key that two items share exactly when they are equivalent. For anagrams, two words are anagrams when their letter counts match, so the 26 counts written as a string make a canonical key. Sorting the letters of each word also works and is easier to write, but it costs L log L per word of length L, while counting costs L.\n\nThe separator in the key matters. Joining counts with nothing would make the counts (1, 11) and (11, 1) look the same; a separator character keeps them apart.\n\nTop K Frequent Elements shows a standard follow-up: after counting, you could sort by frequency, but frequencies are at most n, so you can put each value in a bucket indexed by its count and read the buckets from the highest down. That is linear instead of n log n.",
        code: `// Frequency table: how many times each value occurs.
unordered_map<int, int> countAll(const vector<int>& a) {
    unordered_map<int, int> cnt;
    for (int x : a) cnt[x]++;                  // operator[] inserts 0 first, then ++ makes it 1
    return cnt;
}

// Group Anagrams: words are anagrams exactly when their letter counts match,
// so the 26 counts, written as a string, are a canonical key.
vector<vector<string>> groupAnagrams(const vector<string>& words) {
    unordered_map<string, vector<string>> groups;
    for (const string& w : words) {
        array<int, 26> c{};                    // all zeros
        for (char ch : w) c[ch - 'a']++;
        string key;
        for (int v : c) key += to_string(v) + '#';   // '#' keeps (1, 11) apart from (11, 1)
        groups[key].push_back(w);
    }
    vector<vector<string>> out;
    for (auto& kv : groups) out.push_back(move(kv.second));
    return out;
}

// Top K Frequent Elements: count, then bucket values by frequency (a frequency is at most n).
vector<int> topKFrequent(const vector<int>& a, int k) {
    unordered_map<int, int> cnt;
    for (int x : a) cnt[x]++;
    vector<vector<int>> bucket(a.size() + 1);  // bucket[f] = values that occur exactly f times
    for (auto& kv : cnt) bucket[kv.second].push_back(kv.first);
    vector<int> out;
    for (int f = (int)a.size(); f >= 1 && (int)out.size() < k; f--)
        for (int v : bucket[f]) {
            out.push_back(v);
            if ((int)out.size() == k) break;
        }
    return out;
}`,
      },
      {
        title: "Implementation: prefix sums with a map",
        body: "This is the version that turns a hard-looking problem into a pass over the array. The map stores how many times each prefix sum has occurred. The line seen[0] = 1 is the empty prefix, and without it you would miss every subarray that starts at index 0.\n\nUse long long for the running sum. Even when the inputs fit in int, the sum of many of them may not. And insert the current prefix after the lookup, not before: with k = 0 the lookup would otherwise find the prefix you just inserted and count an empty subarray that does not exist.",
        code: `// Subarray Sum Equals K: count subarrays whose sum is k.
// sum(i..j) = prefix[j+1] - prefix[i], so a subarray ending here sums to k
// exactly when some earlier prefix equals (current prefix - k).
int subarraySum(const vector<int>& a, int k) {
    unordered_map<long long, int> seen;        // prefix sum -> how many times it has occurred
    seen[0] = 1;                               // the empty prefix, so subarrays starting at index 0 count
    long long prefix = 0;
    int count = 0;
    for (int x : a) {
        prefix += x;
        auto it = seen.find(prefix - k);
        if (it != seen.end()) count += it->second;
        seen[prefix]++;                        // insert AFTER the lookup
    }
    return count;
}`,
      },
      {
        title: "Variants",
        body: "Counting how many subarrays hit a target and finding the longest one use the same prefix idea with different bookkeeping. To count, store how many times each prefix occurred. To find the longest, store the first index where each prefix occurred, because the earliest start gives the longest subarray. Note that the map is seeded with -1 for the empty prefix, and that emplace is used so a later occurrence does not overwrite the earlier index.\n\nThere are other common variants. Subarrays with equal numbers of 0s and 1s become 'sum is 0' once you treat each 0 as -1. Subarrays whose sum is divisible by k use the prefix sum modulo k as the key. Checking whether two strings are anagrams needs only a count array, no hash map. When the keys are small integers or letters, a plain array indexed by the key is faster and simpler than unordered_map.",
        code: `// Longest subarray with sum exactly k. Keep the FIRST index where each prefix appeared;
// the earliest start gives the longest subarray.
int longestSubarraySum(const vector<int>& a, long long k) {
    unordered_map<long long, int> first;       // prefix sum -> earliest index where it appeared
    first[0] = -1;                             // the empty prefix ends before index 0
    long long prefix = 0;
    int best = 0;
    for (int i = 0; i < (int)a.size(); i++) {
        prefix += a[i];
        auto it = first.find(prefix - k);
        if (it != first.end()) best = max(best, i - it->second);
        first.emplace(prefix, i);              // emplace keeps the earlier index if the key exists
    }
    return best;
}`,
      },
      {
        title: "Variants: counting with a fixed array",
        body: "When the keys come from a small fixed range, replace the hash map with an array. Valid Anagram is the cleanest example: add one for each letter of the first string, subtract one for each letter of the second, and the strings are anagrams exactly when every counter ends at zero. The array version has no hashing, no allocation and no worst case, and it is usually several times faster than unordered_map. Use it whenever the alphabet is 26 lowercase letters, 128 ASCII characters or 256 bytes.",
        code: `// Valid Anagram: one counter per lowercase letter, no hash map needed.
bool isAnagram(const string& s, const string& t) {
    if (s.size() != t.size()) return false;
    int cnt[26] = {};
    for (char c : s) cnt[c - 'a']++;
    for (char c : t) cnt[c - 'a']--;
    for (int v : cnt) if (v != 0) return false;
    return true;
}`,
      },
      {
        title: "Complexity",
        body: "Two Sum does one lookup and at most one insert per element. With an expected constant cost per operation, the time is O(n) and the extra space is O(n), because in the worst case every element is stored. Compare that with O(n squared) time and O(1) space for the pair scan: the map buys a factor of n in time for a factor of n in memory.\n\nGroup Anagrams with the count key costs O(L) per word to build the key, so O(n times L) overall for n words of length L, plus the cost of hashing the key itself, which is also proportional to its length. Sorting each word instead costs O(L log L) per word, so O(n times L log L). Top K Frequent with buckets is O(n) time and O(n) space, against O(n log n) for sorting counts.\n\nThe 'expected' in expected O(1) is real. A badly distributed hash, or input crafted against a known hash function, can push every key into one bucket and make each operation O(n), so the whole algorithm O(n squared). In practice this matters on competitive judges that include anti-hash tests; there you either use a randomised hash or an ordered map, which has a guaranteed O(log n) per operation. unordered_map also has a large constant factor from its node allocations. If you know the number of entries in advance, call reserve to avoid rehashing; if the keys are small integers, use an array.",
      },
      {
        title: "Pitfalls and edge cases",
        body: "Insert after the lookup. The most common Two Sum bug is writing the value into the map first, which lets an element pair with itself. Check the case of equal values too: with [3, 3] and target 6, the second 3 must find the first.\n\nSeed the prefix map correctly. For counting, start with {0: 1}. For the longest subarray, start with {0: -1}. Forgetting the seed silently loses every subarray that begins at the first element, and the bug only shows on inputs where such a subarray is the answer.\n\nUse long long for sums. The sum of a few large ints overflows, and the overflow produces wrong keys rather than a crash. Do the arithmetic for the complement or the prefix in long long.\n\nRemember that operator[] inserts. Writing if (cnt[x] > 0) on a key that is absent creates it with value 0, which changes size() and can alter later logic. Use find or count when you only want to test for presence.\n\nBe careful with keys that are not already hashable. std::pair has no default hash for unordered_map, so either encode the pair into one long long, use a map, or supply your own hash. Never use floating-point numbers as keys.\n\nFinally, a hash map does not need the numbers to be non-negative or sorted. That is its strength over two pointers and sliding windows, which need an ordering or a monotonic property that negative numbers can break. When a subarray problem has negative values, the prefix-sum map is usually the right tool.",
      },
      {
        title: "Practice order",
        body: "1. Two Sum (easy). The pattern at its smallest: remember what you have seen, and look up before you insert.\n2. Group Anagrams (medium). The map holds a list per key. The skill here is choosing a canonical key; try both the sorted string and the 26-count key and compare their costs.\n3. Top K Frequent Elements (medium). Counting first, then a second structure to pick the largest counts. Try the heap solution and then the bucket solution.\n4. Subarray Sum Equals K (medium). The prefix-sum map. This is the one that unlocks a whole family of problems; make sure you can explain why the map starts as {0: 1} and why negative numbers are allowed.\n\nAfter these, redo Subarray Sum Equals K for the longest subarray with sum k using the first-index version above, then solve the same problem with a sliding window and notice why it fails when the array has negative values.",
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ two pointers
  "two-pointers": {
    intro:
      "Two pointers replaces a nested loop over pairs with two indices that move in a controlled way, so each element is visited a constant number of times. It works when the data has an order you can exploit, such as a sorted array, or when you are rewriting an array in place with a reader and a writer. Reach for it on sorted pairs and triples, on palindromes and merges, and on in-place removal.",
    sections: [
      {
        title: "The intuition",
        body: "Suppose a sorted array and a target, and you want two numbers that add to it. Checking every pair is n times n. But the array is sorted, which means a lot of those pairs can be ruled out without looking at them.\n\nPut one finger at the smallest element and one at the largest. If their sum is too big, the largest element is too big for every partner, because even the smallest remaining partner is already too much. So you can drop it and move the right finger left. If the sum is too small, the smallest element is too small for every partner, so you move the left finger right. Each step throws away one element for good, and after n steps the fingers meet.\n\nThere are three common shapes. Opposite ends: the fingers start at both ends and move toward each other, as in pair sums, palindromes and Container With Most Water. Same direction: a fast reader and a slow writer move forward together, used to rewrite an array in place, as in removing duplicates or moving zeroes. Two sequences: one finger per array, advancing whichever is smaller, as when merging two sorted lists. What they share is that the position of each finger only ever moves one way, so the total work is linear.",
      },
      {
        title: "Why it works",
        body: "Every two-pointer algorithm rests on an invariant: a statement about the region the fingers have not yet discarded. For a pair sum on a sorted array the invariant is 'if a valid pair exists, both of its elements lie inside the window from l to r'. At the start the window is the whole array, so it holds.\n\nNow look at one step. Suppose a[l] + a[r] is greater than the target. Take any partner l' with l' at least l and less than r. Because the array is sorted, a[l'] is at least a[l], so a[l'] + a[r] is also greater than the target. That means a[r] cannot belong to any valid pair inside the window, so discarding it keeps the invariant true. The case where the sum is too small is symmetric. When the sum equals the target you have your answer; when the fingers meet, the window is empty and no pair exists.\n\nContainer With Most Water needs a different argument. The area for walls l and r is min(h[l], h[r]) times (r - l). Say h[l] is the shorter wall. Keeping l and moving r inward can only shrink the width, and the height is still capped by h[l], so no pair that uses l with a smaller r can beat the area you just computed. So l can be discarded, and you move the shorter side.\n\nFor the reader and writer, the invariant is about what has been written. After the reader has looked at i elements, the first w positions of the array hold exactly the answer for those i elements, in order. Each step either appends the current element at position w or skips it.",
      },
      {
        title: "A worked example",
        body: "Opposite ends. The sorted array is [1, 2, 4, 7, 11, 15] and the target is 15. The fingers are l at the start and r at the end.\n\nl = 0, r = 5: 1 + 15 = 16, which is greater than 15, so move r left. r = 4.\nl = 0, r = 4: 1 + 11 = 12, which is less than 15, so move l right. l = 1.\nl = 1, r = 4: 2 + 11 = 13, still less, so l = 2.\nl = 2, r = 4: 4 + 11 = 15. Found: the values at positions 2 and 4.\n\nFour steps for six elements, and every step discarded one element.\n\nReader and writer. Remove duplicates from the sorted array [0, 0, 1, 1, 1, 2, 2, 3]. The writer w starts at 1, because the first element is always kept, and the reader r starts at 1.\n\nr = 1, value 0: equal to a[w - 1] = 0, skip.\nr = 2, value 1: different from 0, so write it at a[1] and set w = 2.\nr = 3 and r = 4, value 1: equal to a[w - 1] = 1, skip both.\nr = 5, value 2: different, write at a[2], w = 3.\nr = 6, value 2: skip.\nr = 7, value 3: different, write at a[3], w = 4.\n\nThe first 4 positions now read [0, 1, 2, 3] and the function returns 4. Nothing was shifted: each element was copied at most once.",
      },
      {
        title: "Implementation",
        body: "The loop condition is l less than r, not less than or equal, because a pair needs two different positions. Each iteration must move at least one pointer, or the loop never ends; in the pair-sum code every branch either returns or moves a finger.\n\nTwo Sum on a sorted array returns positions in the sorted array, which is the same as the input only if you did not sort it. If you had to sort an unsorted input first, you have lost the original indices; in that case use a hash map, or sort pairs of value and index.\n\nIn Container With Most Water, move the finger at the shorter wall, as the proof showed. If the walls are equal, moving either is fine, because the next pair loses at least that wall anyway.",
        code: `// Two Sum on a sorted array: returns the 0-based positions of a pair summing to target.
pair<int, int> twoSumSorted(const vector<int>& a, int target) {
    int l = 0, r = (int)a.size() - 1;
    while (l < r) {
        long long sum = (long long)a[l] + a[r];
        if (sum == target) return {l, r};
        if (sum < target) l++;                 // too small: only a larger left value can help
        else r--;                              // too big: only a smaller right value can help
    }
    return {-1, -1};
}

// Container With Most Water: h[i] are wall heights; pick two walls to hold the most water.
int maxArea(const vector<int>& h) {
    int l = 0, r = (int)h.size() - 1, best = 0;
    while (l < r) {
        best = max(best, min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) l++;                  // the shorter wall limits the area; keeping it can only get worse
        else r--;
    }
    return best;
}`,
      },
      {
        title: "Implementation: 3Sum with duplicates skipped",
        body: "3Sum is a pair-sum problem inside a loop. Sort the array, fix the first value a[i], and run the two-pointer search on the rest for a pair summing to -a[i]. That is O(n squared) overall, against O(n cubed) for three nested loops.\n\nThe delicate part is duplicates. The answer must not contain the same triple twice. Skip a first value that equals the previous first value, since it would produce the same triples again. After you record a triple, move both fingers and then skip over repeated values on each side. Without those skips the output contains duplicates; with the wrong skips you drop real answers, so test it on inputs like [0, 0, 0, 0] and [-2, 0, 0, 2, 2].\n\nThe early break when a[i] is positive is an optimisation: the array is sorted, so if the smallest of the three is already positive, the sum cannot be zero.",
        code: `// 3Sum: all unique triples that add to zero. Sort, fix the first value, then run two pointers on the rest.
vector<vector<int>> threeSum(vector<int> a) {
    sort(a.begin(), a.end());
    vector<vector<int>> out;
    int n = (int)a.size();
    for (int i = 0; i + 2 < n; i++) {
        if (a[i] > 0) break;                   // smallest value already positive: no triple can reach 0
        if (i > 0 && a[i] == a[i - 1]) continue;   // same first value as before: same triples again
        int l = i + 1, r = n - 1;
        while (l < r) {
            long long sum = (long long)a[i] + a[l] + a[r];
            if (sum < 0) l++;
            else if (sum > 0) r--;
            else {
                out.push_back({a[i], a[l], a[r]});
                l++;
                r--;
                while (l < r && a[l] == a[l - 1]) l++;   // skip repeated middle values
                while (l < r && a[r] == a[r + 1]) r--;   // skip repeated last values
            }
        }
    }
    return out;
}`,
      },
      {
        title: "Implementation: reader and writer",
        body: "For in-place edits, the reader scans every element and the writer marks where the next kept element goes. The writer never passes the reader, so nothing you still need is overwritten. This is how you remove duplicates from a sorted array, or move all the zeroes to the end while keeping the order of the others, using O(1) extra space.\n\nIn Remove Duplicates the test compares the reader's value with the last kept value, a[w - 1], not with the reader's previous value; both work on sorted input, but comparing with the last kept value generalises to variants such as 'allow each value at most twice'. In Move Zeroes the non-zero values are copied forward and the tail is filled with zeroes at the end, which is simpler than swapping and does at most one write per element plus the fill.",
        code: `// Remove Duplicates from Sorted Array, in place. Returns the new length.
// a[0..w) always holds the distinct values seen so far; r reads ahead.
int removeDuplicates(vector<int>& a) {
    if (a.empty()) return 0;
    int w = 1;
    for (int r = 1; r < (int)a.size(); r++)
        if (a[r] != a[w - 1]) a[w++] = a[r];
    return w;
}

// Move Zeroes: non-zero values are copied forward (order kept), then the tail is zero-filled.
void moveZeroes(vector<int>& a) {
    int w = 0;
    for (int r = 0; r < (int)a.size(); r++)
        if (a[r] != 0) a[w++] = a[r];
    fill(a.begin() + w, a.end(), 0);
}`,
      },
      {
        title: "Variants",
        body: "Several well-known problems are this pattern with a third finger or a different stopping rule. The Dutch national flag (Sort Colors) partitions an array of 0s, 1s and 2s in one pass with three regions and three fingers. Closest sum, 4Sum and 'count pairs with sum at most target' keep the same skeleton: for counting pairs, when a[l] + a[r] is at most the target, every element between l and r also pairs with a[l], so you add r - l at once and move l.\n\nPalindrome checks put the fingers at both ends and move inward while the characters match. Merging two sorted arrays uses one finger per array and advances the smaller. The fast and slow pointer pair on linked lists, covered in its own pattern, is also two pointers, with different speeds instead of different directions.\n\nThe Dutch flag code below keeps an invariant for each region: everything before lo is 0, everything from lo to i is 1, everything after hi is 2, and the part from i to hi is not yet examined. When you swap a 2 to the back, do not advance i, because the value that arrived at i has not been looked at.",
        code: `// Sort Colors (Dutch national flag): one pass, three regions.
// a[0..lo) are 0s, a[lo..i) are 1s, a[hi+1..n) are 2s, a[i..hi] is not examined yet.
void sortColors(vector<int>& a) {
    int lo = 0, i = 0, hi = (int)a.size() - 1;
    while (i <= hi) {
        if (a[i] == 0) swap(a[i++], a[lo++]);
        else if (a[i] == 2) swap(a[i], a[hi--]);   // do not advance i: the swapped-in value is unchecked
        else i++;
    }
}`,
      },
      {
        title: "Variants: trapping rain water",
        body: "Trapping Rain Water looks different, but the two-finger idea fits. The water above a bar is the lower of the tallest bar to its left and the tallest bar to its right, minus the bar's own height. A first solution stores both running maxima in arrays. The two-pointer version removes the arrays.\n\nKeep the tallest bar seen from each side. Compare the two current bars. Say the left bar is the lower one. Then the right side certainly holds a bar at least as tall as h[r], and every bar the left finger has already passed was lower than some bar on the right at the time it was passed, so the right side also holds something at least as tall as leftMax. The limit for the water above the left bar is therefore leftMax alone, and you can settle that bar now and move l. If the right bar is the lower one, settle it the same way with rightMax and move r. Each bar is settled once, so the time is linear and the extra space is constant.",
        code: `// Trapping Rain Water with two pointers and O(1) space. The water above a bar is limited by the lower of the
// tallest bars on its left and right; the pointer on the lower side already knows its limit.
int trap(const vector<int>& h) {
    int l = 0, r = (int)h.size() - 1, leftMax = 0, rightMax = 0, water = 0;
    while (l < r) {
        if (h[l] < h[r]) {
            leftMax = max(leftMax, h[l]);
            water += leftMax - h[l];
            l++;
        } else {
            rightMax = max(rightMax, h[r]);
            water += rightMax - h[r];
            r--;
        }
    }
    return water;
}`,
      },
      {
        title: "Complexity",
        body: "The pointers only move forward, and every iteration moves at least one of them. For opposite-end scans that is at most n steps, because the gap r minus l shrinks by one each time; for a reader and writer it is exactly n steps, because the reader visits each element once. So the scan is O(n) time and O(1) extra space. That is true even though the code may look like a loop inside a loop: in 3Sum the inner while loops share one pair of fingers per value of i, so the inner work per i is O(n), not O(n) per step.\n\nThe sort, when one is needed, dominates: O(n log n). Two Sum on unsorted data therefore costs O(n log n) with two pointers, against O(n) with a hash map, which is why the hash map is the better choice when you do not need a sorted order and you need the original indices. 3Sum costs O(n log n) for the sort plus O(n squared) for the scans, so O(n squared) overall. It is the same bound as the hash-based approach, but it uses no extra space apart from the sort and handles duplicates more simply.",
      },
      {
        title: "Pitfalls and edge cases",
        body: "Check that the data really has the order you rely on. Opposite-end pair sums need a sorted array. If you sort a copy, you lose the original positions, so a problem that asks for indices needs a different approach or a sort of (value, index) pairs.\n\nWatch the loop condition and the boundaries. Use l less than r for pairs. In 3Sum, the first index runs only while two elements remain after it. An off-by-one here causes either a missed answer or an out-of-range read; test arrays of length 0, 1, 2 and 3.\n\nHandle duplicates deliberately. In 3Sum skip equal first values, and after recording a triple skip equal values on both fingers. A common mistake is to skip before recording, which drops the first of several equal answers, or to compare against the wrong neighbour.\n\nUse long long for sums when values can be large, as the sum of three ints can overflow.\n\nIn Container With Most Water, move the finger at the shorter wall. Moving the taller one never helps, and a solution that moves the wrong one passes small examples but fails larger ones.\n\nFor in-place edits, do not let the writer pass the reader. And remember that after removing duplicates the elements beyond the returned length are not meaningful, so a caller must only read the first w positions.",
      },
      {
        title: "Practice order",
        body: "1. Remove Duplicates from Sorted Array (easy). The reader and writer. Do it first, because the invariant 'a[0..w) is the answer so far' is the cleanest example of the idea.\n2. Container With Most Water (medium). The opposite-end scan and its correctness argument. Make sure you can explain why moving the shorter wall is safe.\n3. 3Sum (medium). A two-pointer search inside a loop, with careful duplicate handling. Write it from memory and test it on all-zero and heavily repeated inputs.\n4. Trapping Rain Water (hard). The same two fingers with a running maximum on each side. Solve it first with prefix and suffix arrays, then reduce it to O(1) space.\n\nAfterwards, try Sort Colors and the pair-counting variant, then return to a problem that looks like two pointers but is not: Two Sum on an unsorted array, where the hash map from the previous article is the right tool.",
      },
    ],
  },

  // --------------------------------------------------------------------------------------------- sliding window
  "sliding-window": {
    intro:
      "A sliding window keeps a contiguous stretch of an array or string and moves its two ends forward, updating a small summary as elements enter and leave. That turns problems about the longest, shortest or best subarray or substring from quadratic into linear. It works when growing the window and shrinking it have predictable effects on whether the window is valid.",
    sections: [
      {
        title: "The intuition",
        body: "A subarray is defined by two ends, and there are about n squared pairs of ends. If checking one pair takes a pass over the window, the brute force is cubic. The sliding window removes both costs.\n\nPicture a window between a left end and a right end. You grow it by moving the right end forward by one, and you shrink it by moving the left end forward by one. Instead of recomputing the summary of the window each time, you update it: when an element enters you add it in, when an element leaves you take it out. A sum, a count of each letter, and the number of distinct values can all be updated in constant time per element.\n\nThe second saving is that the left end never moves backwards. Once you decide that no window starting at an earlier position can be the answer, you never look at those positions again. Each element is added once and removed at most once, so the total number of moves is at most 2n. That is the whole trick: two monotone ends and a summary that can be updated incrementally.",
      },
      {
        title: "Why it works",
        body: "The pattern is valid when the question has a monotone structure. Take 'longest substring with at most k distinct characters'. If a window is valid, every smaller window inside it is valid too, because removing characters cannot add distinct ones. So when the window becomes invalid after you extend it, you can fix it by shrinking from the left, and the first valid window you reach is the longest one that ends at the current right end.\n\nThat gives the central argument. For each right end, the left end sits at the smallest position that makes the window valid. As the right end moves forward, that smallest position can only stay the same or move forward, never back, because a window ending later has at least as many elements to be invalid with. Since the left end never needs to retreat, there is no reason to look at the positions it has passed, and the scan is linear.\n\nThe same logic covers 'shortest window that is valid', for example the smallest subarray with a sum of at least a target when every number is positive. Now growing the window keeps it valid, so you expand until it becomes valid and then shrink as far as you can while it stays valid, recording the length each time.\n\nThis is also exactly why the method fails with negative numbers. If values can be negative, adding an element can make a sum smaller, so 'extend to increase, shrink to decrease' no longer holds. A window that is too large may become valid again by extending it, which breaks the monotone rule. In that situation use prefix sums with a hash map instead.",
      },
      {
        title: "A worked example",
        body: "Longest substring without repeating characters, on the string 'abcabcbb'. The window is from left to right, and we keep the last index where each character was seen.\n\nright = 0, 'a': not in the window, window 'a', length 1. Best = 1.\nright = 1, 'b': window 'ab', length 2. Best = 2.\nright = 2, 'c': window 'abc', length 3. Best = 3.\nright = 3, 'a': 'a' was last seen at index 0, which is inside the window, so left jumps to 1. Window 'bca', length 3. Best stays 3.\nright = 4, 'b': last seen at index 1, inside the window, so left = 2. Window 'cab', length 3.\nright = 5, 'c': last seen at 2, so left = 3. Window 'abc', length 3.\nright = 6, 'b': last seen at 4, so left = 5. Window 'cb', length 2.\nright = 7, 'b': last seen at 6, so left = 7. Window 'b', length 1.\n\nThe answer is 3. Notice that the right end moved 8 times and the left end moved to 7 in total: neither went backwards. The reason left can jump straight past the old position of a repeated character is that every window containing both copies is invalid, so the earliest valid left end is one past the old copy.",
      },
      {
        title: "Implementation",
        body: "The easiest case is a fixed-size window. The window always has k elements: build the first window, then for each new element add it and remove the one that falls out of the left. The summary here is just a running sum. Always check that k is at least 1 and no larger than the array.\n\nFor the variable-size case, the shape of the loop is: for each right end, add the element, then while the window is invalid shrink from the left, then record the answer. The longest substring without repeating characters keeps the last position of each byte in an array of 256 entries, so a repeat can move the left end directly, instead of shrinking one step at a time.",
        code: `// Maximum sum of any k consecutive elements (fixed-size window).
long long maxSumOfK(const vector<int>& a, int k) {
    if (k <= 0 || k > (int)a.size()) return 0;
    long long window = 0;
    for (int i = 0; i < k; i++) window += a[i];    // first window
    long long best = window;
    for (int i = k; i < (int)a.size(); i++) {
        window += a[i] - a[i - k];                 // one element enters, one leaves
        best = max(best, window);
    }
    return best;
}

// Longest Substring Without Repeating Characters (variable window, longest valid).
int lengthOfLongestSubstring(const string& s) {
    array<int, 256> last;
    last.fill(-1);                                  // last index where each byte was seen
    int best = 0, left = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        unsigned char c = s[right];
        if (last[c] >= left) left = last[c] + 1;    // c is inside the window: jump past its old position
        last[c] = right;
        best = max(best, right - left + 1);
    }
    return best;
}`,
      },
      {
        title: "Implementation: minimum window substring",
        body: "This is the standard shortest-valid-window problem: find the smallest part of s that contains every character of t, counting repeats. The array need holds how many copies of each character are still required; it goes negative when the window has extra copies. The counter missing tracks how many required characters (with repeats) the window still lacks, so checking validity is one comparison, not a scan over 256 counters.\n\nExtend the right end until the window is valid. Then shrink from the left as long as it stays valid, recording the best length each time. When you remove a character that the window needed, missing goes back up and the shrinking stops.\n\nOne detail to get right is when to record the answer: inside the shrinking loop, while the window is valid, before you remove the left element. Recording after the loop would record an invalid window.",
        code: `// Minimum Window Substring (variable window, shortest valid).
string minWindow(const string& s, const string& t) {
    if (t.empty() || s.size() < t.size()) return "";
    array<int, 256> need{};
    for (unsigned char c : t) need[c]++;
    int missing = (int)t.size();                    // characters of t still missing, counting repeats
    int bestStart = 0, bestLen = INT_MAX, left = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        unsigned char c = s[right];
        if (need[c] > 0) missing--;                 // this character was still needed
        need[c]--;                                  // goes negative for extra copies
        while (missing == 0) {                      // window is valid: shrink it as far as possible
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            unsigned char d = s[left];
            need[d]++;
            if (need[d] > 0) missing++;             // removing d broke the window
            left++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
}`,
      },
      {
        title: "Variants",
        body: "Most window problems are one of four shapes. Fixed size: the window length is given, as in the maximum sum of k elements. Longest valid: extend freely and shrink only while invalid, recording after the fix. Shortest valid: extend until valid, then shrink while still valid, recording inside the loop. Count of valid windows: for each right end, every window that starts between the leftmost valid start and right is also valid, so you add the number of such starts.\n\nThe 'at most k distinct values' problem is the typical longest-valid case, and it is also Fruit Into Baskets with k equal to 2. A useful trick follows from the counting form: the number of subarrays with exactly k distinct values equals the number with at most k minus the number with at most k minus 1. That turns a condition that is not monotone ('exactly k') into two that are.\n\nThe code below keeps a count per value in a hash map and erases an entry when its count reaches zero, so the number of distinct values is the size of the map. The counting function adds the window length for each right end, because every window ending at right and starting at or after left is valid. It assumes k is at least 1.",
        code: `// Longest subarray with at most k distinct values (Fruit Into Baskets is k = 2).
int longestAtMostKDistinct(const vector<int>& a, int k) {
    unordered_map<int, int> cnt;
    int best = 0, left = 0;
    for (int right = 0; right < (int)a.size(); right++) {
        cnt[a[right]]++;
        while ((int)cnt.size() > k) {               // too many distinct values: shrink from the left
            if (--cnt[a[left]] == 0) cnt.erase(a[left]);
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}

// Number of subarrays with at most k distinct values (every window ending at right counts).
long long countAtMostK(const vector<int>& a, int k) {
    unordered_map<int, int> cnt;
    long long total = 0;
    int left = 0;
    for (int right = 0; right < (int)a.size(); right++) {
        cnt[a[right]]++;
        while ((int)cnt.size() > k) {
            if (--cnt[a[left]] == 0) cnt.erase(a[left]);
            left++;
        }
        total += right - left + 1;
    }
    return total;
}

// Exactly k distinct values = at most k minus at most (k - 1).
long long countExactlyK(const vector<int>& a, int k) { return countAtMostK(a, k) - countAtMostK(a, k - 1); }`,
      },
      {
        title: "Variants: window maximum with a monotonic deque",
        body: "A sum or a count can be updated when an element leaves, but a maximum cannot: if the leaving element was the maximum, you would have to rescan the window. Sliding Window Maximum solves this with a deque of indices whose values are in decreasing order.\n\nWhen a new element arrives, pop from the back every index whose value is not larger, because those elements are older and smaller, so they can never be the maximum of any later window. Then push the new index. The front of the deque is the index of the current maximum. Before reading it, pop from the front any index that has left the window. Every index is pushed once and popped once, so the whole scan is linear, even though the code contains a loop inside a loop.",
        code: `// Sliding Window Maximum: the maximum of every window of size k, in O(n) with a monotonic deque.
// The deque holds indices with decreasing values, so the front is always the window maximum. Needs k >= 1.
vector<int> maxSlidingWindow(const vector<int>& a, int k) {
    deque<int> dq;
    vector<int> out;
    for (int i = 0; i < (int)a.size(); i++) {
        while (!dq.empty() && dq.front() <= i - k) dq.pop_front();     // the front left the window
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();     // smaller older values can never win
        dq.push_back(i);
        if (i >= k - 1) out.push_back(a[dq.front()]);
    }
    return out;
}`,
      },
      {
        title: "Complexity",
        body: "The time is O(n) even though many of these functions contain a while loop inside a for loop. The reason is amortised counting: the right end moves forward n times in total, and the left end also only moves forward, at most n times in total. The inner loop does not restart for each right end, so the combined number of iterations of both loops is at most 2n. Each iteration costs constant time when the summary update is constant, as it is for sums, counts and the number of distinct values.\n\nSpace depends on the summary. A fixed alphabet needs an array of 26, 128 or 256 counters, which is O(1). A hash map of counts needs O(k) when the window holds at most k distinct values, and O(n) in the worst case. The sliding window maximum deque holds at most k indices, so O(k) space and O(n) time overall.\n\nThe brute force for comparison: checking every pair of ends is O(n squared) windows, and recomputing the summary of each costs O(n) more, so O(n cubed) in the plainest version. The window method reduces that to linear because it never recomputes and never revisits.",
      },
      {
        title: "Pitfalls and edge cases",
        body: "Negative numbers. The sum-based windows assume that adding an element increases the sum and removing one decreases it. With negative values that breaks, and the method gives wrong answers without any error. Use a prefix-sum hash map for those problems.\n\nOff-by-one in the length. With both ends inclusive, the window length is right minus left plus one. With a half-open window from left up to but not including right, it is right minus left. Pick one convention and keep to it.\n\nRecording at the wrong time. For longest-valid windows, record after the shrinking loop, when the window is valid. For shortest-valid windows, record inside the loop, before you remove the left element. Mixing these up gives lengths that are off by one or invalid windows.\n\nMaintaining the validity counter. In Minimum Window Substring, update the missing counter only when a needed character enters (the count was positive) or when removing a character makes the count positive again. Comparing all 256 counters at every step works but costs a factor of 256.\n\nEmpty and short inputs. Handle k larger than the array, k equal to zero, an empty string, and a target string longer than the source. Most window bugs show up on these inputs.\n\nThe deque holds indices, not values. If you store values you cannot tell when an element has left the window. And remember a window that is not contiguous is not a window problem: if you may skip elements, you are looking at dynamic programming or a different pattern.",
      },
      {
        title: "Practice order",
        body: "1. Fruit Into Baskets (medium). At most two distinct values: the cleanest longest-valid window. Write it with a hash map first, then think about whether a fixed array would do.\n2. Longest Substring Without Repeating Characters (medium). The same shape with a last-seen array so the left end can jump. Trace 'abcabcbb' by hand against the table above.\n3. Minimum Window Substring (hard). The shortest-valid window with a need table and a missing counter. This is the problem that tests whether you can keep a validity counter correct while shrinking.\n4. Sliding Window Maximum (hard). A window whose summary cannot be updated simply, solved with a monotonic deque.\n\nAs a follow-up, solve the number of subarrays with exactly k distinct values using at-most(k) minus at-most(k minus 1), and then try a sum-based problem with negative numbers to see exactly where the window method stops working.",
      },
    ],
  },
};
