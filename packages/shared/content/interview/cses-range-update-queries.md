---
id: cses-range-update-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log n) time, O(n) space"
reviewed: false
---

## Clarify first
- What query types exist? Type 1: [1, a, b, u] adds value u to every element in range [a, b] (1-based, inclusive). Type 2: [2, k] asks for the current value at 1-based index k.
- Can values exceed 32-bit integer limits? Yes, initial values and update values can be up to 10^9, so cumulative sums over multiple updates reach 10^14, requiring 64-bit integers.
- What should be returned? An array containing only the answers to type 2 queries in order.
- What are the constraints on array length and query count? Both up to 200,000.
- Can u be negative? The problem specifies 1 <= u <= 10^9, but using signed 64-bit integers handles general additions naturally.

## Examples to say out loud
Suppose arr = [3, 2, 4, 5, 1, 1, 5, 3] and queries are:
- [2, 4]: query index 4, value is 5.
- [1, 2, 5, 1]: add 1 to elements at positions 2 through 5.
- [1, 1, 3, 5]: add 5 to elements at positions 1 through 3.
- [2, 4]: query index 4. The first update added 1 (5 -> 6), the second update did not include index 4. Result is 6.
Output: [5, 6].

## Brute force
A naive approach loops from index a - 1 to b - 1 on each type 1 update and adds u to each element in O(n) time.
Type 2 queries read arr[k - 1] in O(1) time.
With up to 200,000 range updates, the overall time complexity is O(q * n).
4 * 10^10 operations will cause a Time Limit Exceeded error.
Instead, we can use a difference array maintained in a Fenwick tree to achieve logarithmic time for both range additions and point queries.

## The key observation
Adding u to an interval [a, b] in an array is equivalent to two point modifications in its difference array d:
- Add +u at position a.
- Add -u at position b + 1 (if b + 1 <= n).
The cumulative added value at any index k is the prefix sum of the difference array: `d[1] + d[2] + ... + d[k]`.
By storing this difference array inside a Fenwick tree (Binary Indexed Tree), a range update requires only two point updates in O(log n) time, and a point query requires one prefix sum query in O(log n) time.
The current value of the element is then `arr[k - 1] + prefix_sum(k)`.

## Optimal approach
1. Keep the initial array `arr` in memory.
2. Allocate a 64-bit Fenwick tree array `bit` of size n + 2 initialized to 0.
3. Process each query `q`:
   - If `q[0] == 1` (range update [1, a, b, u]):
     - Apply `add(a, u)` to the Fenwick tree.
     - If `b + 1 <= n`, apply `add(b + 1, -u)` to the Fenwick tree.
   - If `q[0] == 2` (point query [2, k]):
     - Compute the current value: `arr[k - 1] + pref(k)`.
     - Append to the answers list.
4. Return the answers list.

Complexity: O((n + q) log n) time because each update does at most two tree operations and each query does one, and O(n) space for the Fenwick tree and original array.

## Code walkthrough
In C++, `vector<long long> bit(n + 2, 0)` uses size `n + 2` to safely allow 1-based indexing and indexing up to `n + 1`.
The lambda `add(i, v)` runs `for (; i <= n; i += i & -i) bit[i] += v;` to push the difference delta up the Fenwick tree.
The lambda `pref(i)` runs `for (; i > 0; i -= i & -i) s += bit[i];` to sum the difference prefix up to index i.
When `q[0] == 1`, we call `add(q[1], q[3])` and `if (q[2] + 1 <= n) add(q[2] + 1, -(long long)q[3])`.
When `q[0] == 2`, the 0-based element `arr[q[1] - 1]` added to `pref(q[1])` reconstructs the updated value in O(log n) time.

## Test it out loud
- Single element: arr = [5], operations = [[2, 1], [1, 1, 1, 7], [2, 1]]. First query returns 5. Update adds 7 to [1, 1]. Second query returns 5 + 7 = 12. Output: [5, 12].
- Full array update: arr = [1, 1, 1, 1], update [1, 1, 4, 10]. Every element increases by 10. Querying any index returns 11.
- Multiple overlapping updates: updates to [1, 3] and [2, 4]. Index 2 receives both additions; index 1 receives only the first; index 4 receives only the second.
- 64-bit arithmetic: large updates up to 10^9 accumulate past 2^31 - 1, safely handled by `long long`.

## Follow-ups
- How does this compare to a lazy Segment Tree? A difference-array Fenwick tree is much simpler to code (around 10 lines), has lower constant factors, and uses minimal memory compared to a lazy Segment Tree.
- What if both range updates and range sum queries were needed? That requires two Fenwick trees (one for `d[i]` and one for `d[i] * i`), which can compute range sums via algebraic expansion.
- What if updates set values (`arr[i] = u`) instead of adding? Setting values over a range requires a Segment Tree with lazy assignment, as difference arrays do not support non-invertible assignments.

## Common mistakes
- Forgetting the boundary check `b + 1 <= n`: if `b == n`, trying to update `b + 1` without sufficient array allocation causes out-of-bounds errors.
- 32-bit integer overflow: cumulative sums reach 10^14, overflowing 32-bit integers; using 64-bit integers (`long long`) is necessary.
- Confusing point query index with 0-based: `arr[q[1] - 1]` accesses the base array, while `pref(q[1])` uses the 1-based index in the Fenwick tree.

## Further reading
- Fenwick tree for range updates and point queries
- Difference array technique for interval increments
- Range updates and range queries using dual Fenwick trees
