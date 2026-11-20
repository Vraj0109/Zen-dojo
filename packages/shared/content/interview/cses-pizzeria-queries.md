---
id: cses-pizzeria-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + q log n) time, O(n) space"
reviewed: false
---

## Clarify first
- How is the total pizza cost calculated? If customer at building k orders from building i, cost is `prices[i - 1] + |i - k|` (1-based indices).
- What operations exist? Type 1: [1, k, x] changes pizza price at building k to x. Type 2: [2, k] asks for minimum cost for building k.
- Can a building order from itself? Yes, walking distance is 0, so cost is `prices[k - 1]`.
- What are the constraints? Up to 200,000 buildings and 200,000 queries, prices up to 10^9.
- What should be returned? An array containing answers to all type 2 queries in order.

## Examples to say out loud
Suppose prices are [7, 6, 4, 6, 2] and queries are:
- [2, 2]: from building 2: buying at 2 costs 6; buying at 3 costs 4 + 1 = 5; buying at 5 costs 2 + 3 = 5. Best cost is 5.
- [1, 3, 10]: building 3 price becomes 10.
- [2, 3]: from building 3: buying at 3 costs 10; buying at 5 costs 2 + 2 = 4; buying at 2 costs 6 + 1 = 7. Best cost is 4.
Output: [5, 4, ...].

## Brute force
For each type 2 query, scanning all n buildings takes O(n) per query.
With 200,000 queries, this O(q * n) method performs 4 * 10^10 operations and times out.
Splitting the absolute value |i - k| turns this into two range minimum queries.

## The key observation
The distance |i - k| splits based on direction:
- For i <= k (left): `|i - k| = k - i`. Total cost is `(prices[i] - i) + k`.
- For i >= k (right): `|i - k| = i - k`. Total cost is `(prices[i] + i) - k`.
Since k is constant for a given query:
- Best left: `min_{i <= k} (prices[i] - i) + k`.
- Best right: `min_{i >= k} (prices[i] + i) - k`.
We maintain two Segment Trees: Tree A over `prices[i] - i` and Tree B over `prices[i] + i`.

## Optimal approach
1. Define arrays A and B: `A[i - 1] = prices[i - 1] - i` and `B[i - 1] = prices[i - 1] + i` (1-based i).
2. Build two segment trees `treeA` and `treeB` of size 2n.
3. For each query:
   - If type 1 [1, k, x]:
     - Update leaf in `treeA` at `k - 1` with `x - k`.
     - Update leaf in `treeB` at `k - 1` with `x + k`.
     - Recompute ancestor minimums in O(log n).
   - If type 2 [2, k]:
     - Left cost: `treeA.query(0, k) + k`.
     - Right cost: `treeB.query(k - 1, n) - k`.
     - Append `min(left_cost, right_cost)` to answers.
4. Return answers list.

Complexity: O(n + q log n) time and O(n) space.

## Code walkthrough
In C++, `A` and `B` use 2n iterative layout with `INF = LLONG_MAX / 4`.
Leaves store `prices[i] - (i + 1)` and `prices[i] + (i + 1)`.
`setv(t, p, v)` writes the leaf and updates ancestors via `p >>= 1`.
`get(t, l, r)` returns the minimum over `[l, r)`.
Query [2, k] computes `get(A, 0, k) + k` and `get(B, k - 1, n) - k` and takes the smaller value.

## Test it out loud
- Single building: prices = [5], query [2, 1] gives 5. Update [1, 1, 3] sets price to 3. Next query gives 3. Output: [5, 3].
- Two buildings: prices = [1, 100], query [2, 2]. Left gives 1 + 1 = 2; right gives 100. Minimum is 2.
- Large prices: values up to 10^9 fit in 64-bit integers and 32-bit return values.
- Flat prices: prices = [3, 3, 3, 3]. Each building buys at home with cost 3.

## Follow-ups
- Why two trees? The absolute value slope changes at k. Splitting at k makes both sides monotonic in i.
- What with travel cost multiplier c? Cost becomes `prices[i] - c * i + c * k` on left and `prices[i] + c * i - c * k` on right.
- What on a circular street? Duplicate to 2n or query two wrapped ranges.

## Common mistakes
- Off-by-one in index shift: i is 1-based, so `prices[i - 1] - i` must use 1-based i.
- Sign error on k: left side adds +k, right side subtracts -k.
- Half-open bounds: `get(A, 0, k)` covers indices 0 to k - 1 inclusive.

## Further reading
- Segment Tree range minimum queries with linear offsets
- Manhattan distance decomposition techniques
- Slope trick and convex hull comparisons
