---
id: cses-range-xor-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + q) time, O(n) space"
reviewed: false
---

## Clarify first
- Are query ranges 1-based and inclusive? Yes, query [a, b] specifies elements from 1-based index a to b inclusive.
- Can elements in the array change? No, the array is strictly static.
- What operation is requested? The bitwise XOR sum of elements in the range: arr[a - 1] ^ ... ^ arr[b - 1].
- What are the constraints on array length and queries? Both array length and number of queries are up to 200,000.
- Can values exceed 32-bit integer limits? Values are up to 10^9 (< 2^30), so 32-bit signed integers are sufficient without overflow.

## Examples to say out loud
Suppose arr = [3, 2, 4, 5, 1, 1, 5, 3] and queries are:
- [2, 4]: elements are 2, 4, 5. 2 ^ 4 ^ 5 = 6 ^ 5 = 3.
- [5, 6]: elements are 1, 1. Equal values cancel out: 1 ^ 1 = 0.
- [1, 8]: XOR sum of all elements gives 6.
- [3, 3]: single element is 4.
Output list: [3, 0, 6, 4].

## Brute force
A naive approach loops from index a - 1 to b - 1 for each query, accumulating XOR.
Each query takes O(b - a + 1) time, leading to O(q * n) overall runtime.
For n = 200,000 and q = 200,000, up to 4 * 10^10 operations will cause a Time Limit Exceeded error.
Since XOR is its own inverse, prefix XORs allow answering every query in O(1) time.

## The key observation
Bitwise XOR is associative, commutative, and self-inverting: x ^ x = 0 and x ^ 0 = x.
If we define a prefix XOR array `pref` where `pref[i]` is the XOR sum of the first i elements, then:
`pref[b] ^ pref[a - 1] = (arr[0] ^ ... ^ arr[a - 2] ^ arr[a - 1] ^ ... ^ arr[b - 1]) ^ (arr[0] ^ ... ^ arr[a - 2])`.
All terms from index 0 to a - 2 cancel each other out, leaving exactly the range XOR sum from a - 1 to b - 1.

## Optimal approach
1. Allocate an array `pref` of size n + 1 with `pref[0] = 0`.
2. Compute prefix XOR values: for i from 0 to n - 1, set `pref[i + 1] = pref[i] ^ arr[i]`.
3. For each query [a, b]:
   - Evaluate `pref[b] ^ pref[a - 1]`.
   - Append the result to the output list.
4. Return the list of answers.

Complexity: O(n + q) time (O(n) precomputation and O(1) per query), and O(n) space for the prefix XOR array.

## Code walkthrough
In C++, vector `pref(n + 1, 0)` initializes the zero base.
The loop `for (int i = 0; i < n; i++) pref[i + 1] = pref[i] ^ arr[i];` computes the cumulative XOR values in a single linear pass.
We reserve capacity in `ans` equal to `queries.size()`.
For each query `[q[0], q[1]]`, `pref[q[1]] ^ pref[q[0] - 1]` extracts the interval answer in constant time.

## Test it out loud
- Single element: arr = [9], query = [1, 1]. `pref[1] ^ pref[0] = 9 ^ 0 = 9`. Returns [9].
- Identical elements: arr = [6, 6, 6], query = [1, 2]. 6 ^ 6 = 0. Query [1, 3] gives 6 ^ 6 ^ 6 = 6.
- Powers of two: arr = [1, 2, 4, 8], query = [1, 4]. 1 ^ 2 ^ 4 ^ 8 = 15.
- Disjoint subsegment: arr = [1, 2, 3, 4, 5], query = [2, 4]. Elements are 2, 3, 4. 2 ^ 3 ^ 4 = 1 ^ 4 = 5. `pref[4] ^ pref[1] = 4 ^ 1 = 5`.

## Follow-ups
- What if updates were allowed (point update)? We would use a Fenwick tree or Segment Tree with XOR operation to handle updates and queries in O(log n) time.
- What if we needed to find the maximum subarray XOR? We would insert prefix XOR values into a Trie and query for the maximum XOR path in O(30) time per element.
- Does this work for 2D grids? Yes, 2D prefix XOR arrays allow querying rectangular subgrids in O(1) time using 2D inclusion-exclusion.

## Common mistakes
- Off-by-one with 1-based indexing: subtracting 1 from a is required (`pref[b] ^ pref[a - 1]`), not `pref[b] ^ pref[a]`.
- Forgetting `pref[0] = 0`: without a 0 at index 0, queries covering the entire array from a = 1 would access invalid memory or produce incorrect XOR results.
- Overcomplicating with Segment Trees: building a Segment Tree for static XOR queries adds an unnecessary O(log n) query overhead and extra memory when a prefix array is O(1).

## Further reading
- Prefix XOR technique and range query applications
- Bitwise XOR properties and algebraic invariants
- Binary Trie for maximum XOR subsegment problems
