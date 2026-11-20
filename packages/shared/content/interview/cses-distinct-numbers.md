---
id: cses-distinct-numbers
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs and constraints? An array of integers of length $n$ ($1 \le n \le 200000$), where each value is between $1$ and $10^9$.
- What should be returned? The count of distinct values present in the array.
- Are numbers sorted originally? No, they can arrive in arbitrary order.
- Can we mutate the input array? Yes, in-place sorting is acceptable.

## Examples to say out loud
- Consider `arr = [2, 3, 2, 2, 3]`:
  - Sorting the array gives `[2, 2, 2, 3, 3]`.
  - First element is 2 (count = 1).
  - Next elements 2, 2 equal previous element.
  - Next element 3 differs from 2 (count = 2).
  - Next element 3 equals previous.
  - Return 2.
- Edge case: single element `[5]` $\implies$ returns 1.
- Edge case: all identical elements `[7, 7, 7, 7]` $\implies$ returns 1.

## Brute force
A brute-force approach would maintain an array of seen elements and, for each element in `arr`, perform a linear search to check if it has already appeared. With $n = 200000$, an $O(n^2)$ search performs up to $4 \times 10^{10}$ comparisons, resulting in a severe Time Limit Exceeded. A hash set achieves $O(n)$ average time but incurs significant hash table allocation and pointer overhead ($O(n)$ space), and can degrade to $O(n^2)$ under hash collision attacks. Sorting achieves guaranteed $O(n \log n)$ time and $O(1)$ extra space.

## The key observation
Sorting rearranges the elements so that all identical values are placed contiguously. Once sorted, any transition to a new unique number occurs precisely when an element differs from its immediate predecessor (`arr[i] != arr[i - 1]`). Thus, a single linear scan over the sorted array counting these boundary transitions determines the distinct element count.

## Optimal approach
1. If the array is empty, return 0.
2. Sort the array in ascending order in-place using an efficient introspective sort (`std::sort`).
3. Initialize a distinct counter `ans = 1` for the first element.
4. Iterate from index $1$ to $n - 1$:
   - If `arr[i] != arr[i - 1]`, increment `ans`.
5. Return `ans`.

Complexity:
- Time: $O(n \log n)$ dominated by the sorting step, followed by an $O(n)$ linear scan.
- Space: $O(1)$ auxiliary space beyond the sorting stack ($O(\log n)$ recursion stack space for quicksort/introsort).

## Code walkthrough
- `if (arr.empty()) return 0`: Defensive check for empty input.
- `sort(arr.begin(), arr.end())`: Groups duplicate keys together into contiguous runs.
- `int ans = 1`: Accounts for the first unique number.
- `for (size_t i = 1; i < arr.size(); i++)`: Compares each element with its predecessor.
- `if (arr[i] != arr[i - 1]) ans++`: Detects each run boundary and increments the count.

## Test it out loud
- Test case $1$: `[1, 2, 3, 4, 5]`. Sorted is identical. Every pair differs. Total transitions = 4, count = $1 + 4 = 5$.
- Test case $2$: `[7, 7, 7, 7]`. No elements differ from predecessor. Count = 1.
- Test case $3$: `[1000000000, 1, 1000000000, 1]`. Sorted: `[1, 1, 1000000000, 1000000000]`. One transition at index 2 $\implies$ returns 2.

## Follow-ups
- What if the range of values were small ($arr[i] \le 10^6$)? A boolean bitset of size $10^6$ would count distinct numbers in $O(n)$ time and negligible memory.
- What if data arrives in a stream with memory too small to store all elements? Use probabilistic cardinality estimation algorithms like HyperLogLog, which estimate distinct elements within a small error margin using $O(\log \log n)$ bits.

## Common mistakes
- Hash table collision worst-case: In languages like C++, `std::unordered_set` without custom hash functions can be targeted with adversarial tests that induce $O(n^2)$ bucket collisions. Sorting is immune to this vulnerability.
- Off-by-one with empty array: Initializing `ans = 1` without checking if `arr` has length 0 can return 1 for an empty array.

## Further reading
- [Sorting Algorithms on Wikipedia](https://en.wikipedia.org/wiki/Sorting_algorithm)
