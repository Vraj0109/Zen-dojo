---
id: cses-dynamic-range-minimum-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + q log n) time, O(n) space"
reviewed: false
---

## Clarify first
- What operations are performed? Type 1 updates `arr[k - 1] = u` (1-based index k). Type 2 queries the minimum value in range [a, b] (1-based inclusive).
- Can the array elements be modified? Yes, type 1 queries mutate elements, so static structures like Sparse Tables cannot be directly applied.
- What should be returned? An array containing the answers to all type 2 minimum queries in the order they were asked.
- What are the constraints on array length and number of queries? Up to 200,000 elements and up to 200,000 queries.
- What are the value ranges? Values are between 1 and 10^9.

## Examples to say out loud
Suppose arr = [3, 2, 4, 5, 1, 1, 5, 3] and queries are:
- [2, 1, 4]: range [1, 4] covers elements {3, 2, 4, 5}, minimum is 2.
- [1, 3, 1]: update element at position 3 from 4 to 1. The array is now [3, 2, 1, 5, 1, 1, 5, 3].
- [2, 1, 4]: range [1, 4] now covers {3, 2, 1, 5}, minimum is 1.
- [2, 6, 8]: range [6, 8] covers {1, 5, 3}, minimum is 1.
Output list: [2, 1, 1].

## Brute force
A plain array implementation updates an element in O(1) time, but each range minimum query scans elements from index a - 1 to b - 1 in O(n) time.
With up to 200,000 queries, this results in O(q * n) time, requiring 4 * 10^10 operations, which causes a severe timeout.
A Segment Tree maintains range minimums hierarchically, supporting both point updates and range minimum queries in O(log n) time.

## The key observation
A Segment Tree represents a complete binary tree where each node stores the minimum of its interval.
An iterative segment tree of size 2n stores the leaves at indices n to 2n - 1, and internal nodes at indices 1 to n - 1 where `node[i] = min(node[2i], node[2i + 1])`.
A point update modifies the leaf at `n + k - 1` and moves upward to the root by halving the index, taking O(log n) steps.
A range query over [l, r) begins with leaves `l = a - 1 + n` and `r = b + n`. At each level, if `l` is an odd child, it includes `t[l++]`; if `r` is odd, it includes `t[--r]`, and both indices are halved (`l >>= 1`, `r >>= 1`). This covers the range in O(log n) steps.

## Optimal approach
1. Allocate an iterative segment tree array `t` of size 2n.
2. Initialize leaves: `t[n + i] = arr[i]` for i from 0 to n - 1.
3. Build internal nodes: for i from n - 1 down to 1, set `t[i] = min(t[2 * i], t[2 * i + 1])`.
4. Process each query `q`:
   - If `q[0] == 1` (update [1, k, u]):
     - Set leaf position `p = q[1] - 1 + n` and `t[p] = q[2]`.
     - Walk up: for `p >>= 1; p >= 1; p >>= 1`, update `t[p] = min(t[2 * p], t[2 * p + 1])`.
   - If `q[0] == 2` (query [2, a, b]):
     - Convert to half-open interval: `l = q[1] - 1 + n` and `r = q[2] + n`.
     - Initialize `res = INT_MAX`.
     - While `l < r`:
       - If `l & 1` is true, `res = min(res, t[l++])`.
       - If `r & 1` is true, `res = min(res, t[--r])`.
       - Shift `l >>= 1`, `r >>= 1`.
     - Append `res` to the output list.
5. Return the answers list.

Complexity: O(n + q log n) time (O(n) build and O(log n) per operation), and O(n) space for the segment tree array.

## Code walkthrough
In C++, vector `t(2 * n)` uses 2n elements, avoiding pointer overhead or 4n recursive allocations.
Building from `n - 1` down to 1 ensures children `2 * i` and `2 * i + 1` are already computed when computing parent `i`.
In point updates, setting `t[p] = q[2]` and looping `p >>= 1` recomputes the exact path of ancestors up to root 1.
In range queries, `l & 1` identifies when the left boundary is a right child (which cannot include its parent without including elements outside the range), so we include `t[l]` and advance `l++`. Similarly, `r & 1` checks the right boundary. Both boundaries halve at each level until they meet.

## Test it out loud
- Single element: arr = [7], queries = [[2, 1, 1], [1, 1, 3], [2, 1, 1]]. Query returns 7. Update changes to 3. Next query returns 3. Output: [7, 3].
- Range query across entire array: arr = [5, 4, 3, 2, 1], query [2, 1, 5] visits root's children and returns 1.
- Updating the minimum element: arr = [1, 2, 3, 4], update [1, 1, 10] changes 1 to 10. Query [2, 1, 4] now correctly reports new minimum 2.
- Large values: elements up to 10^9 fit inside standard 32-bit signed integers, and `INT_MAX` is greater than 10^9.

## Follow-ups
- How does an iterative segment tree compare to recursive? Iterative segment trees require half the memory (2n instead of 4n), have zero recursion overhead, and have significantly faster cache locality.
- Why can't Fenwick trees be used easily for dynamic RMQ? Fenwick trees rely on invertible operations (like addition/subtraction). Point updates in a min-Fenwick tree cannot easily decrease or increase values without O(log^2 n) rebuilding or restricted updates.
- What if we had range updates (e.g. add value to range)? That requires lazy propagation, which is typically easier to implement with a recursive segment tree.

## Common mistakes
- Half-open interval boundary: 1-based inclusive range [a, b] translates to 0-based indices [a - 1, b - 1]. In the iterative tree, the right leaf must be `q[2] + n` (exclusive bound), not `q[2] - 1 + n`.
- Using 4n size when 2n suffices: allocating 2n with the iterative layout is sufficient; using 4n without matching indexing causes bounds mismatches.
- Forgetting to recompute ancestors on update: changing only the leaf `t[p]` without updating its parent chain leaves old minimums stale.

## Further reading
- Iterative Segment Tree implementation and interval properties
- Point update and range query algorithms
- Comparison between Fenwick trees and Segment trees
