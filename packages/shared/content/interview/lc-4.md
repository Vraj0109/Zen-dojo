---
id: lc-4
pattern: binary-search-on-index
difficulty: hard
optimal: "O(log(min(m, n))) time, O(1) space"
reviewed: false
---

## Clarify first
- Are both arrays sorted in non-decreasing order? Yes.
- Can one of the arrays be empty? Yes, one array can be empty, but the combined total length is at least 1.
- How is the median defined when the total number of elements is even? It is the mean of the two central values returned as a floating-point double.
- What is the expected time complexity? The standard merge takes O(m + n); we aim for O(log(min(m, n))).

## Examples to say out loud
- Odd combined length: `nums1 = [1, 3]`, `nums2 = [2]`. The merged sequence is `[1, 2, 3]`. The median is 2.
- Even combined length: `nums1 = [1, 2]`, `nums2 = [3, 4]`. The merged sequence is `[1, 2, 3, 4]`. The median is `(2 + 3) / 2.0 = 2.5`.
- Empty array: `nums1 = []`, `nums2 = [1]`. The median is 1.

## Brute force
A brute force approach merges the two sorted arrays into a new array of length `m + n` using two pointers, exactly like the merge step in merge sort. Then it accesses the middle index (or average of two middle indices). This takes O(m + n) time and O(m + n) space (or O(1) space if we count elements without storing the merged array). However, with `m + n` up to 2000, we can achieve logarithmic time via binary search.

## The key observation
Finding the median is equivalent to finding a partition that divides the combined set of elements into two halves: a left part and a right part of equal size (or left having one extra element for odd lengths).
If we take `i` elements from the first array `A`, then the number of elements `j` taken from the second array `B` is uniquely determined: `j = (m + n + 1) / 2 - i`.
The partition is valid if and only if:
1. Every element in the left half is less than or equal to every element in the right half: `A[i - 1] <= B[j]` and `B[j - 1] <= A[i]`.
Since `A` and `B` are sorted, we can binary search for the cut `i` in the shorter array.

## Optimal approach
1. Ensure `A` is the shorter array (if `m > n`, swap `A` and `B`). This guarantees `j >= 0` and minimizes the search space.
2. Binary search `i` in range `[0, m]`:
   - Compute `i = (lo + hi) / 2` and `j = (m + n + 1) / 2 - i`.
   - Find boundary values around the cut:
     - `aL = i > 0 ? A[i - 1] : -INF`, `aR = i < m ? A[i] : INF`.
     - `bL = j > 0 ? B[j - 1] : -INF`, `bR = j < n ? B[j] : INF`.
   - If `aL <= bR` and `bL <= aR`: the partition is correct.
     - If total length `m + n` is odd, return `max(aL, bL)`.
     - If even, return `(max(aL, bL) + min(aR, bR)) / 2.0`.
   - If `aL > bR`: too many elements from `A` in the left half; move `hi = i - 1`.
   - Else (`bL > aR`): too few elements from `A`; move `lo = i + 1`.

Complexity:
- Time complexity: O(log(min(m, n))) because binary search is run only on the shorter array.
- Space complexity: O(1) auxiliary space using constant primitive variables.

## Code walkthrough
- `if (a.size() > b.size()) return findMedianSortedArrays(b, a)`: Keeps `a` as the shorter array so `j` is always non-negative.
- `int half = (m + n + 1) / 2`: Computes the target left half size that accommodates both odd and even lengths cleanly.
- `aL, aR, bL, bR`: Boundary values using `INF` to seamlessly handle cuts at index 0 or index `m`.
- `if (aL <= bR && bL <= aR)`: Checks if the combined left half is completely partitioned from the right half.

## Test it out loud
- Test `a = [1, 3]`, `b = [2]`:
  - `m = 2, n = 1`. Swaps so `a = [2], b = [1, 3]`. `m = 1, n = 2`.
  - `half = (1 + 2 + 1) / 2 = 2`.
  - Binary search `lo = 0, hi = 1`. Try `i = 0, j = 2`.
    - `aL = -INF, aR = 2`, `bL = 3, bR = INF`.
    - `bL (3) > aR (2)`, so `lo = i + 1 = 1`.
  - Next: `i = 1, j = 1`.
    - `aL = 2, aR = INF`, `bL = 1, bR = 3`.
    - `2 <= 3` and `1 <= INF` hold!
    - Odd length: `max(aL, bL) = max(2, 1) = 2`. Output: 2.0.

## Follow-ups
- How does this generalize to finding the k-th smallest element of two sorted arrays? The same binary partition technique finds any k-th element by setting `half = k`.
- What if data is distributed across multiple machines? We can run binary search rounds communicating only candidate split points between machines.

## Common mistakes
- Running binary search on the longer array, causing `j` to become negative or exceed `n`.
- Forgetting floating-point division when calculating the mean of two elements for even lengths.
- Failing to use infinity sentinels when cuts land on edges `i = 0` or `i = m`.
