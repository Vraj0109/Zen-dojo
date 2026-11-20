---
id: abc164-c
pattern: cses-atcoder
difficulty: medium
optimal: "O(n * L) time, O(n * L) space"
reviewed: false
---

## Clarify first
- What does the input contain? A list of $n$ item names (strings) drawn from a lottery/gacha machine.
- What should be returned? The count of distinct/unique item names drawn across all $n$ draws.
- What are the constraints? $1 \le n \le 200,000$, and each name is a string of 1 to 10 lowercase English letters.
- Are duplicate item names possible? Yes, drawing the same item name multiple times only contributes 1 to the count of distinct kinds.

## Examples to say out loud
- Consider `s = ["apple", "orange", "apple"]`.
  The items drawn are "apple", "orange", and "apple".
  The unique item kinds are "apple" and "orange".
  Total distinct kinds: 2.
- Consider `s = ["grape", "grape", "grape", "grape"]`.
  Only one unique kind ("grape") $\to$ returns 1.
- Consider `s = ["a", "b"]`.
  Two distinct items $\to$ returns 2.

## Brute force
A naive approach would maintain a list of seen unique names. For each new item name, search linearly through the list of seen items; if not found, append it to the list. For $n = 200,000$, linear scanning takes $O(n^2 \cdot L)$ time, requiring billions of string comparisons and timing out. Using a hash set or sorting the strings reduces this to near-linear time.

## The key observation
The problem is simply finding the cardinality of the set of input strings.
By inserting all $n$ strings into a hash set (e.g. `unordered_set<string>` in C++, `HashSet<String>` in Java, or `set(s)` in Python), duplicates are automatically de-duplicated.
The size of the set at the end gives the exact number of distinct item kinds in $O(n \cdot L)$ expected time.
Alternatively, sorting the array of strings in $O(n \log n \cdot L)$ time and counting adjacent differences also achieves $O(1)$ extra space beyond the array.

## Optimal approach
1. Initialize an empty hash set of strings `seen`.
2. Insert each string from the input array $s$ into `seen`.
3. Return the size of `seen`: `(int)seen.size()`.
4. Complexity:
   - Time Complexity: $O(n \cdot L)$ expected time, where $n \le 200,000$ and $L \le 10$ is the maximum string length. Hashing and inserting each short string takes $O(L)$ average time. Total runtime is ~50 milliseconds.
   - Space Complexity: $O(n \cdot L)$ auxiliary space to store the unique string elements in the hash set.

## Code walkthrough
- `unordered_set<string> seen(s.begin(), s.end());`: Bulk insert all $n$ strings into a hash set, discarding duplicate occurrences.
- `return (int)seen.size();`: Return the count of unique string keys in the set.

## Test it out loud
- Test 1: `s = ["a"]` $\to$ set contains `{"a"}` $\to$ size 1.
- Test 2: `s = ["a", "b"]` $\to$ set contains `{"a", "b"}` $\to$ size 2.
- Test 3: `s = ["a", "a"]` $\to$ set contains `{"a"}` $\to$ size 1.
- Test 4: `s = ["ab", "ba", "ab", "aa", "bb", "ba"]` $\to$ unique items: "ab", "ba", "aa", "bb" $\to$ size 4.

## Follow-ups
- How would you solve this with $O(1)$ auxiliary space?
  Sort the string array $s$ in place in $O(n \log n \cdot L)$ time. Then, count unique elements by iterating $i$ from 1 to $n - 1$ and incrementing whenever $s[i] \ne s[i - 1]$.
- What if the number of draws $n$ was huge (e.g. $10^9$) and strings came from an infinite stream?
  We could use probabilistic cardinality estimation algorithms like HyperLogLog, which estimates distinct elements within a 1-2% error margin using only a few kilobytes of memory.

## Common mistakes
- Using an $O(n^2)$ linear search over seen items.
- Using `std::set<string>` (red-black tree) instead of `std::unordered_set<string>`: while both pass, `std::set` incurs an unnecessary $O(n \log n \cdot L)$ overhead and higher constant factors from tree node allocations.
