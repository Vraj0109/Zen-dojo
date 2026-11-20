---
id: cses-subarray-sum-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + m log n) time, O(n) space"
reviewed: false
---

## Clarify first
- What does each query represent? An update [k, x] sets the k-th element (1-based) of the array to x.
- What should be reported after each update? The maximum sum of any contiguous subarray of the whole array.
- Can elements be negative? Yes, values range from -10^9 to 10^9.
- Is an empty subarray allowed? Yes, the empty subarray is valid and has sum 0, so the answer is never negative (minimum answer is 0).
- Can answers exceed 32-bit limits? Yes, subarray sums can reach 2 * 10^14, requiring 64-bit integers.

## Examples to say out loud
Suppose arr = [1, 3, -1, 2, 1] and updates are:
- [2, 4]: element at position 2 becomes 4. Array is [1, 4, -1, 2, 1]. Best subarray is the entire array: 1 + 4 - 1 + 2 + 1 = 7.
- [3, 1]: element at position 3 becomes 1. Array is [1, 4, 1, 2, 1]. Best subarray is the whole array with sum 9.
- [5, -3]: element at position 5 becomes -3. Array is [1, 4, 1, 2, -3]. Best subarray is [1, 4, 1, 2] with sum 8.
Output list: [7, 9, 8].

If all elements are negative, e.g. [-1, -2], the empty subarray gives 0.

## Brute force
After each update, run Kadane's algorithm over the whole array in O(n) time.
With m = 200,000 updates on an array of size n = 200,000, this takes O(m * n) = 4 * 10^10 operations, leading to a Time Limit Exceeded error.
Dynamic Kadane requires a Segment Tree where each node maintains contiguous subarray properties that can be merged in O(1) time.

## The key observation
For any block of an array, a maximum subarray sum either lies entirely within the left child, entirely within the right child, or crosses the midpoint.
To maintain this under point updates, each segment tree node stores four values:
1. `sum`: total sum of all elements in the block.
2. `pref`: maximum prefix sum (at least 0).
3. `suf`: maximum suffix sum (at least 0).
4. `best`: maximum contiguous subarray sum (at least 0).
When merging left child L and right child R:
- `P.sum = L.sum + R.sum`
- `P.pref = max(L.pref, L.sum + R.pref)`
- `P.suf = max(R.suf, R.sum + L.suf)`
- `P.best = max({L.best, R.best, L.suf + R.pref})`
Because the query is always over the entire array, the answer after each update is simply `root.best`.

## Optimal approach
1. Define a segment tree node holding 64-bit integers: `sum`, `pref`, `suf`, `best`.
2. Define a leaf creation helper: for value x, `p = max(0LL, x)`, returning `{x, p, p, p}`.
3. Define the merge function combining left child L and right child R into parent P using the four formulas above.
4. Build the segment tree recursively over initial `arr`.
5. For each update [k, x]:
   - Update leaf at index `k - 1` with value x.
   - Recompute ancestor nodes along the root-to-leaf path in O(log n) time.
   - Append `t[1].best` (root node's best subarray sum) to the output list.
6. Return the list of answers.

Complexity: O(n + m log n) time (O(n) initial build and O(log n) per point update), and O(n) space for the segment tree array.

## Code walkthrough
In C++, `struct Node { long long sum, pref, suf, best; }` stores the 64-bit attributes.
The `leaf(x)` function ensures all empty subarray choices (`max(0LL, x)`) are initialized correctly.
In `mergeNodes(l, r)`:
- Prefix extends: `max(l.pref, l.sum + r.pref)`
- Suffix extends: `max(r.suf, r.sum + l.suf)`
- Best combines left, right, or crossing: `max({l.best, r.best, l.suf + r.pref})`
In the main loop, each update calls `update(1, 0, n - 1, q[0] - 1, q[1])` and reads `t[1].best` directly.

## Test it out loud
- Single element: arr = [5], update [1, -5] gives 0 (empty prefix beats -5). Next update [1, 5] gives 5. Output: [0, 5].
- Crossing midpoint: arr = [1, 2, 3], update [2, -10] makes array [1, -10, 3]. Best is 3. Update [2, 10] makes [1, 10, 3], best is 1 + 10 + 3 = 14.
- All negatives: arr = [-1, -1, -1, -1], update [1, 1] gives 1. Updates [4, 1], [2, 1], [3, 1] incrementally increase best to 4.
- 64-bit integrity: sums exceeding 2 * 10^9 are preserved without arithmetic overflow.

## Follow-ups
- What if queries also asked for subarray sums over arbitrary ranges [a, b]? The exact same node structure and merge function are used; we simply query range [a, b] by folding covering segment nodes from left to right.
- What if empty subarrays were not allowed? Then `best` could be negative. A leaf with negative x would have `p = x`, and merging would need to handle negative combinations carefully.
- Can this support range additions? Yes, using lazy propagation with segment trees, though tracking how lazy increments affect `pref`, `suf`, and `best` requires careful interval length scaling.

## Common mistakes
- Using 32-bit signed integers: cumulative sums easily exceed 2^31 - 1, causing overflow; `long long` is required for all node fields.
- Forgetting the crossing case: calculating `best` as only `max(L.best, R.best)` omits subarrays spanning across the midpoint (`L.suf + R.pref`).
- Inverting prefix/suffix in crossing sum: the crossing sum must be `L.suf + R.pref` (suffix of left meets prefix of right), not `L.pref + R.suf`.

## Further reading
- Dynamic Kadane's algorithm on Segment Trees
- Segment Tree monoid merge for range maximum subarray sum
- Divide and conquer maximum subarray algorithms
