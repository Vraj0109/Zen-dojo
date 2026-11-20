---
id: cses-static-range-minimum-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n log n + q) time, O(n log n) space"
reviewed: false
---

## Clarify first
- Are query ranges 1-based and inclusive? Yes, range [a, b] corresponds to 0-based indices a - 1 through b - 1.
- Are there any updates to the array elements? No, the array is strictly static.
- What are the constraints on array size and number of queries? Up to 200,000 elements and up to 200,000 queries.
- What if a == b? The range contains a single element, so its minimum is that element itself.
- What should be returned? An array containing the minimum value for each query in given order.

## Examples to say out loud
Suppose arr = [3, 2, 4, 5, 1, 1, 5, 3] and queries are [2, 4], [5, 6], [1, 8], and [3, 3].
- For [2, 4], the elements are {2, 4, 5}, minimum is 2.
- For [5, 6], the elements are {1, 1}, minimum is 1.
- For [1, 8], the entire array has minimum 1.
- For [3, 3], the single element is 4.
The output array is [2, 1, 1, 4].

## Brute force
A naive linear scan over each query's range takes O(len) time per query.
With q queries and length up to n, this takes O(q * n) time.
For n = 200,000 and q = 200,000, 4 * 10^10 operations will easily exceed the time limit.
A Segment tree could answer each query in O(log n), but since the array is static and the minimum operation is idempotent, a Sparse Table can answer each query in O(1) time after O(n log n) preprocessing.

## The key observation
The minimum function is idempotent: min(x, x) = x.
This idempotence means we can cover any interval [L, R] of length len with two overlapping power-of-two intervals of length 2^k, where k = floor(log2(len)).
The first interval starts at L: [L, L + 2^k - 1].
The second interval ends at R: [R - 2^k + 1, R].
Because every element in [L, R] belongs to at least one of these two sub-intervals, min(range) is simply min(table[k][L], table[k][R - 2^k + 1]), which is computed in O(1) time.

## Optimal approach
1. Let maxLog = floor(log2(n)) + 1. Allocate a 2D table `st[maxLog][n]`.
2. Base layer: `st[0][i] = arr[i]` for all 0 <= i < n.
3. Build higher powers of two using dynamic programming:
   - For k = 1 to maxLog - 1:
     - For i = 0 up to n - 2^k:
       - `st[k][i] = min(st[k - 1][i], st[k - 1][i + 2^(k - 1)])`.
4. For each query [a, b]:
   - Convert to 0-based indices: `l = a - 1`, `r = b - 1`.
   - Compute interval length `len = r - l + 1`.
   - Find highest power of two: `k = 31 - __builtin_clz(len)` (or `bit_length() - 1`).
   - The query result is `min(st[k][l], st[k][r - (1 << k) + 1])`.
5. Return the array of answers.

Complexity: O(n log n + q) time (O(n log n) table construction and O(1) per query), and O(n log n) space for the Sparse Table.

## Code walkthrough
In C++, `int maxLog = 32 - __builtin_clz(n)` gives the number of bit levels needed.
Row 0 copies `arr[i]`.
The table construction loop uses `len = 1 << (k - 1)`. Each entry `st[k][i]` merges two halves of size `2^(k - 1)`: `st[k - 1][i]` and `st[k - 1][i + len]`.
For query resolution, `k = 31 - __builtin_clz(len)` computes the floor of log2 in a single instruction.
Query answer `min(st[k][l], st[k][r - (1 << k) + 1])` overlaps the two halves and returns the minimum in O(1).

## Test it out loud
- Single element: arr = [42], query = [1, 1]. len = 1, k = 0. Answer is `min(st[0][0], st[0][0]) = 42`.
- Exact power of two range: arr = [5, 4, 3, 2, 1], query [1, 4]. len = 4, k = 2. Overlap covers [0, 3] cleanly, returns 2.
- Non-power of two range: len = 3, k = 1 (power 2). Covers [l, l + 1] and [r - 1, r] overlapping at the middle element. Minimum is exact.
- Strictly decreasing array: arr = [5, 4, 3, 2, 1], query [1, 5]. Overlap of lengths 4 at [0, 3] and [1, 4] finds overall minimum 1.

## Follow-ups
- What if the array values could be updated? Sparse tables take O(n log n) to recompute after updates. A Segment Tree would be preferred to handle updates in O(log n) time and queries in O(log n) time.
- Does this work for Range Sum Queries? No, addition is not idempotent (adding overlapping ranges double-counts elements). Sum queries require disjoint decompositions or prefix sums.
- Can we achieve O(n) preprocessing and O(1) RMQ? Yes, using the Fischer-Heun method (Cartesian trees and block decomposition).

## Common mistakes
- Confusing 0-based and 1-based indices: subtracting 1 from a and b is required before indexing the Sparse Table.
- Off-by-one in the second interval start: the second interval ends at `r`, so it must start at `r - (1 << k) + 1`, not `r - (1 << k)`.
- Using floating-point `log2()` inside the query loop: `std::log2` introduces floating point overhead; use `__builtin_clz` or a precomputed log array for strict O(1).

## Further reading
- Sparse Table data structure for static RMQ
- Range Minimum Query and Lowest Common Ancestor equivalence
- Fischer-Heun algorithm for optimal linear RMQ
