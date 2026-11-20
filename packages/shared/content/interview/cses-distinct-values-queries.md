---
id: cses-distinct-values-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log n) time, O(n + q) space"
reviewed: false
---

## Clarify first
- What does each query [a, b] ask? The number of distinct values appearing in the subarray from 1-based index a to b inclusive.
- Can values in the array be updated? No, the array is strictly static.
- What range of values can elements take? 1 <= arr[i] <= 10^9.
- Can queries be answered in any order? Yes, queries can be answered offline and mapped back to the original query order.
- What are the constraints on array length and queries? Up to 200,000 elements and up to 200,000 queries.

## Examples to say out loud
Suppose arr = [3, 2, 3, 1, 2] and queries are:
- [1, 3]: subarray [3, 2, 3] contains values {2, 3}, so 2 distinct values.
- [2, 4]: subarray [2, 3, 1] contains values {1, 2, 3}, so 3 distinct values.
- [1, 5]: whole array contains {1, 2, 3}, so 3 distinct values.
- [3, 3]: single element is 1 distinct value.
Output list: [2, 3, 3, 1].

## Brute force
For each query [a, b], insert elements from arr[a - 1] to arr[b - 1] into a hash set and return its size.
In the worst case, each query takes O(n) time.
With 200,000 queries, this results in O(q * n) operations, exceeding 4 * 10^10 operations and timing out.
By processing queries offline sorted by their right endpoint, an offline sweep with a Fenwick tree answers all queries in O((n + q) log n) time.

## The key observation
If we sweep a pointer from left to right along the array, at any moment we reach right index r, we can ensure that only the most recent occurrence of each distinct value carries a weight of 1 in a Fenwick tree, while all earlier occurrences carry a weight of 0.
With this invariant, for any query [a, r] ending at r, the number of distinct values in range [a, r] is simply the sum of weights from position a to r. Earlier duplicate occurrences to the left of a do not matter, and duplicate occurrences within [a, r] only count their rightmost position.
When moving from r - 1 to r with value x:
- If x appeared previously at index p, we subtract 1 at position p.
- We add 1 at position r.
- We record `last[x] = r`.
Then any query ending at r is evaluated as `prefix_sum(r) - prefix_sum(a - 1)` in O(log n) time.

## Optimal approach
1. Compress values in `arr` so that each distinct value has a unique ID from 0 to k - 1.
2. Store queries together with their original indices and sort them in ascending order of their right endpoint `b`.
3. Allocate a Fenwick tree of size n + 1 and an array `last` initialized to 0.
4. Maintain a pointer `pos = 0`.
5. For each query `[a, b]` (sorted by b):
   - While `pos < b`:
     - Increment `pos++`.
     - Let `c` be the compressed ID of `arr[pos - 1]`.
     - If `last[c] != 0`, remove its previous contribution: `add(last[c], -1)`.
     - Add new contribution: `add(pos, 1)`.
     - Update latest occurrence: `last[c] = pos`.
   - Query the Fenwick tree: `ans[orig_id] = pre(b) - pre(a - 1)`.
6. Return the answers array.

Complexity: O((n + q) log n) time (sorting queries and O(log n) Fenwick operations), and O(n + q) space.

## Code walkthrough
In C++, `vals` collects and deduplicates elements via `sort` and `unique`.
`comp[i]` maps each element to its compressed integer ID using `lower_bound`.
`byRight` stores query indices sorted by `queries[x][1]`.
The while-loop `while (pos < queries[id][1])` advances the right boundary pointer incrementally.
For each element, `if (last[c]) add(last[c], -1);` zeroes out the previous occurrence in the Fenwick tree, and `add(pos, 1)` activates the current index.
`pre(queries[id][1]) - pre(queries[id][0] - 1)` answers the range query at position `b` in O(log n) time.

## Test it out loud
- Identical elements: arr = [7, 7, 7], query [1, 3]. As pos advances from 1 to 3, positions 1 and 2 are successively negated. At pos = 3, only index 3 has weight 1. Range sum is 1. Output: [1].
- All unique elements: arr = [1, 2, 3, 4, 5], query [1, 5]. Every position gets +1 without cancellation. Range sum is 5.
- Single element range: query [3, 3] on [3, 2, 3, 1, 2]. Position 3 has weight 1, range sum is 1.
- Multiple queries with same right end: queries [1, 4] and [2, 4]. Handled at the same sweep position without moving `pos`.

## Follow-ups
- How to solve this online (queries cannot be reordered)? Use a Persistent Segment Tree where version r stores the array state when the right endpoint is at r. Each query [a, b] is answered on version b in O(log n) time.
- What if updates were allowed (point modification)? Offline sweep does not work; we would use Mo's algorithm with updates in O(n^(5/3)) or a 2D Segment Tree / CDQ divide and conquer.
- Can Mo's algorithm solve the static version? Yes, Mo's algorithm takes O((n + q) * sqrt(n)) time and O(n) space without Fenwick tree overhead.

## Common mistakes
- Not resetting earlier occurrences: if you do not remove `last[c]`, duplicate values within the range will be double counted.
- 0-based vs 1-based indexing in queries: query bounds [a, b] are 1-based, matching the Fenwick tree's 1-based indices.
- Sorting the output array: forgetting to map answers back to original query indices `orig_id` will return results in wrong order.

## Further reading
- Offline sweep-line technique for range distinct queries
- Persistent Segment Trees for online distinct elements queries
- Mo's algorithm for offline range frequency queries
