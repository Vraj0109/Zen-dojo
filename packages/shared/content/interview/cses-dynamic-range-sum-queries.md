---
id: cses-dynamic-range-sum-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) * log n) time, O(n) space"
reviewed: false
---

## Clarify first
- What operations are performed? Type 1 updates `arr[k - 1] = u`. Type 2 computes the sum of elements from 1-based index a to b inclusive.
- Can values or sums exceed 32-bit limits? Yes, values are up to 10^9 and n is up to 2 * 10^5, so range sums reach 2 * 10^14, requiring 64-bit integers.
- Can indices be 1-based? Yes, both updates (index k) and queries (ranges [a, b]) are given using 1-based indexing.
- What should be returned? An array containing only the results of type 2 queries in chronological order.
- Are values strictly positive? Yes, 1 <= arr[i], u <= 10^9.

## Examples to say out loud
Suppose arr = [3, 2, 4, 5, 1, 1, 5, 3] and operations are:
- [2, 1, 4]: sum of first 4 elements is 3 + 2 + 4 + 5 = 14.
- [2, 5, 6]: sum of elements 5 and 6 is 1 + 1 = 2.
- [1, 3, 1]: update element at index 3 from 4 to 1. The array is now [3, 2, 1, 5, 1, 1, 5, 3].
- [2, 1, 4]: new sum of first 4 elements is 3 + 2 + 1 + 5 = 11.
Output list of query results is [14, 2, 11].

## Brute force
If we use a plain array, updating an element takes O(1) time, but answering a range sum takes O(n) time.
If we use a static prefix sum array, range sum takes O(1) time, but updating an element requires rebuilding prefix sums in O(n) time.
With up to 200,000 updates and 200,000 queries, both naive approaches yield O(q * n) time, exceeding 4 * 10^10 operations and timing out.
A Binary Indexed Tree (Fenwick tree) balances updates and queries to O(log n) time each.

## The key observation
A Fenwick tree stores partial prefix sums where each index i is responsible for an interval of length `lsb(i) = i & -i` ending at i.
Because an index's ancestors in the Fenwick tree represent all intervals containing that index, point updates propagate along `i += i & -i` in O(log n) steps.
Likewise, the prefix sum up to index i is obtained by summing nodes along `i -= i & -i` in O(log n) steps.
Any range sum [a, b] is then efficiently computed as `query(b) - query(a - 1)`.

## Optimal approach
1. Maintain an internal 64-bit array `a` to store current values of elements, and a Fenwick tree array `bit` of size n + 1 initialized to 0.
2. For each element i from 0 to n - 1, populate the Fenwick tree with `add(i + 1, arr[i])`.
3. Process operations sequentially:
   - If operation is `[1, k, u]`:
     - Calculate the change: `delta = u - a[k - 1]`.
     - Update internal value: `a[k - 1] = u`.
     - Apply point update: `add(k, delta)`.
   - If operation is `[2, a, b]`:
     - Compute range sum: `query(b) - query(a - 1)`.
     - Append result to the output list.
4. Return the list of query outputs.

Complexity: O((n + q) * log n) time since each update and query takes O(log n) time, and O(n) space for the Fenwick tree and value array.

## Code walkthrough
In C++, `vector<long long> bit(n + 1, 0)` uses 1-based indexing matching Fenwick tree math.
The `add(idx, val)` lambda loops `for (; idx <= n; idx += idx & -idx) bit[idx] += val;` propagating delta up the tree.
The `query(idx)` lambda loops `for (; idx > 0; idx -= idx & -idx) s += bit[idx];` accumulating prefixes.
We maintain `vector<long long> a` so that when a type 1 update `[1, k, u]` arrives, we can compute `delta = u - a[k - 1]` before setting `a[k - 1] = u`.
For type 2 `[2, l, r]`, `query(r) - query(l - 1)` computes the inclusive range sum in O(log n) time.

## Test it out loud
- Update then query: arr = [5], operations = [[2, 1, 1], [1, 1, 9], [2, 1, 1]]. Initial query returns 5. Update changes value to 9. Next query returns 9. Output: [5, 9].
- Large values: arr = [10^9, 10^9], query [2, 1, 2] returns 2 * 10^9. Updating first element to 5 * 10^8 results in 1.5 * 10^9. No 32-bit overflow.
- Updating end of array: arr = [10, 20, 30, 40], update [1, 4, 50]. Total sum increases from 100 to 110. Range [1, 4] gives 110.
- Consecutive updates before query: multiple type 1 updates followed by a type 2 query reflect all changes correctly.

## Follow-ups
- How does a Fenwick tree compare to a Segment tree? Fenwick trees use less memory (n vs 4n) and have smaller constant factors and simpler code. However, Segment trees are more versatile for arbitrary associative operations like range minimum.
- Can we support range updates and point queries? Yes, by storing difference arrays in the Fenwick tree.
- Can we support both range updates and range queries? Yes, using two Fenwick trees to track linear polynomial coefficients.

## Common mistakes
- Adding `u` instead of `delta = u - arr[k - 1]`: point updates must add the difference between the new value and old value, not the new value itself.
- 0-based vs 1-based indexing in Fenwick bit math: `idx += idx & -idx` goes into an infinite loop if `idx == 0`; 1-based indexing is mandatory.
- Using 32-bit types: with elements up to 10^9, prefix sums exceed 2^31 - 1, causing arithmetic overflow if 64-bit integers are not used.

## Further reading
- Fenwick tree (Binary Indexed Tree) fundamentals and applications
- Range update and range query with Fenwick trees
- Segment trees vs Fenwick trees performance comparison
