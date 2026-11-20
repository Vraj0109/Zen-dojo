---
id: cses-prefix-sum-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + q log n) time, O(n) space"
reviewed: false
---

## Clarify first
- What does each query type do? Type 1: [1, k, u] updates the k-th element to value u (1-based index). Type 2: [2, a, b] asks for the maximum prefix sum of the subarray from position a to b.
- Can elements be negative? Yes, values range from -10^9 to 10^9.
- Can the prefix be empty? Yes, the empty prefix is allowed, meaning the maximum prefix sum is never negative (minimum answer is 0).
- Can sums exceed 32-bit limits? Yes, summing up to 200,000 values of magnitude 10^9 can reach 2 * 10^14, requiring 64-bit integers.
- What should be returned? An array of 64-bit integers containing the answers to type 2 queries in order.

## Examples to say out loud
Suppose arr = [1, 2, -3, 3, 1, -5, 1, 4] and queries are:
- [2, 2, 5]: subarray is [2, -3, 3, 1]. Prefixes are: empty (0), 2, 2 + (-3) = -1, -1 + 3 = 2, 2 + 1 = 3. Maximum prefix sum is 3.
- [2, 1, 8]: full array. Running sums are 0, 1, 3, 0, 3, 4, -1, 0, 4. Maximum prefix sum is 4.
- [1, 3, 1]: change index 3 from -3 to 1. Subarray at [2, 5] is now [2, 1, 3, 1]. Prefixes are 0, 2, 3, 6, 7. Maximum prefix sum is 7.
Output: [3, 4, 7].

If all elements in a range are negative, e.g. [-5, -1, -2], all non-empty prefix sums are negative, so the empty prefix gives 0.

## Brute force
For each type 2 query, perform a linear scan from a to b, maintaining a running cumulative sum and tracking its maximum (initialized to 0).
Each query takes O(b - a + 1) time, which is O(n) in the worst case.
With 200,000 queries and 200,000 elements, this takes O(q * n) = 4 * 10^10 operations, leading to a Time Limit Exceeded error.
Static prefix sums do not support point updates efficiently. A Segment Tree with monoid merging enables both updates and range queries in O(log n) time.

## The key observation
To find the maximum prefix sum of an arbitrary range [a, b], each segment tree node covering a range must store two quantities:
1. `sum`: the total sum of all elements in the range.
2. `pref`: the maximum prefix sum within this range (with empty prefix allowed, so `pref >= 0`).
When merging a left child L and right child R to form parent node P:
- `P.sum = L.sum + R.sum`.
- `P.pref = max(L.pref, L.sum + R.pref)`.
This merge operation is associative, meaning we can combine any decomposition of subsegments from left to right. Order matters because `L.sum + R.pref` reflects crossing from the left child into the right child.

## Optimal approach
1. Define a segment tree node holding 64-bit integers `sum` and `pref`.
2. Define a merge function: `merge(L, R) = {L.sum + R.sum, max(L.pref, L.sum + R.pref)}`.
3. Build the segment tree over `arr`:
   - Base case leaf at index l: `t[v] = {arr[l], max(0LL, (long long)arr[l])}`.
   - Internal node: recursively build left and right children and set `t[v] = merge(t[2 * v], t[2 * v + 1])`.
4. Process each query `q`:
   - If `q[0] == 1` (update [1, k, u]):
     - Update leaf at index `k - 1` to `{u, max(0LL, (long long)u)}` and recompute ancestors.
   - If `q[0] == 2` (query [2, a, b]):
     - Query range [a - 1, b - 1] by folding covering segment nodes from left to right.
     - Extract `pref` from the merged result and append to answers.
5. Return the answers list.

Complexity: O(n + q log n) time (O(n) build and O(log n) per update or range query), and O(n) space for the segment tree nodes.

## Code walkthrough
In C++, `struct Node { long long sum, pref; }` represents tree nodes.
The leaf initialization `max(0, a[l])` ensures the empty prefix choice is baked into individual leaves.
The query function splits range [a, b] around midpoint m:
- If `b <= m`, query only left child.
- If `a > m`, query only right child.
- Otherwise, return `mergeNodes(query(left), query(right))`. The order of arguments is critical: left child must be the first parameter to guarantee correct prefix accumulation.
For type 2 queries, `query(1, 0, n - 1, q[1] - 1, q[2] - 1).pref` retrieves the maximum prefix sum.

## Test it out loud
- All negative elements: arr = [-3], query = [2, 1, 1]. Leaf is {-3, 0}. Result is 0. Update [1, 1, 3] changes leaf to {3, 3}. Next query returns 3. Output: [0, 3].
- Large values: arr = [10^9, 10^9, 10^9], query [2, 1, 3]. Prefixes accumulate to 3 * 10^9, safely handled by 64-bit integers.
- Partial negative prefix: arr = [5, -5, 5, -5]. Range [1, 4] reaches max prefix 5 at index 1 and index 3.
- Range within segment: arr = [1, 2, 3, 4, 5], query [2, 3, 5] inspects elements {3, 4, 5}, returning 3 + 4 + 5 = 12.

## Follow-ups
- How does this relate to Maximum Subarray Sum queries? To query the maximum subarray sum (Kadane on ranges), each node stores four values: `total_sum`, `max_pref`, `max_suff`, and `max_subarray`. This problem is a direct subset requiring only `sum` and `pref`.
- What if empty prefix was not allowed? Then `pref` would be initialized to `x` instead of `max(0, x)`, and `pref` could be negative.
- Can this be written iteratively? Yes, by collecting left boundary nodes and right boundary nodes separately, and then merging right nodes in reverse order onto left nodes.

## Common mistakes
- Non-commutative merging in range query: returning `merge(right, left)` instead of `merge(left, right)` will calculate suffix-like sums instead of prefix sums.
- Using 32-bit signed integers: range sums can reach 2 * 10^14, overflowing 32-bit `int`; `long long` is mandatory for both `sum` and `pref`.
- Allowing negative answers when empty prefix is permitted: omitting `max(0, x)` when initializing or evaluating results will return negative numbers instead of 0.

## Further reading
- Segment Tree node merging and monoid properties
- Maximum prefix sum and maximum subarray sum range queries
- Combining non-commutative operations on Segment Trees
