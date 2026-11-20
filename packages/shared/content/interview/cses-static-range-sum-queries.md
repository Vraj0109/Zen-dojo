---
id: cses-static-range-sum-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + q) time, O(n) space"
reviewed: false
---

## Clarify first
- Are query ranges inclusive and 1-based? Yes, each query [a, b] represents elements from index a - 1 to b - 1 inclusive.
- Can values in the array be updated? No, the array is static with zero updates.
- Can sums exceed 32-bit integer limits? Yes, array length is up to 2 * 10^5 and values can be up to 10^9, so total sums can reach 2 * 10^14, requiring 64-bit integers.
- Can a query cover an empty range? The constraints specify 1 <= a <= b <= n, so every range contains at least one element.
- What should be returned? A list containing the sum for each query in the same order as given.

## Examples to say out loud
Suppose array is [3, 2, 4, 5, 1, 1, 5, 3] and queries are [2, 4] and [5, 6].
For [2, 4], the elements are 2 + 4 + 5 = 11.
For [5, 6], the elements are 1 + 1 = 2.
For [1, 8], all 8 elements sum to 24.
For a single element [3, 3], the value is 4.
The output array is [11, 2, 24, 4].

## Brute force
For each query [a, b], iterate with a for-loop from index a - 1 up to b - 1, summing up the elements.
Each query takes O(n) time in the worst case. With q queries, the overall time is O(q * n).
For n = 200,000 and q = 200,000, this requires up to 4 * 10^10 operations, which will cause a Time Limit Exceeded error.
Since the array values never change, precomputing cumulative sums allows answering any range in O(1).

## The key observation
Because addition is invertible via subtraction, the sum of elements in any range arr[a - 1 .. b - 1] is exactly the prefix sum up to b minus the prefix sum up to a - 1.
By precomputing an array `pref` of size n + 1 where `pref[i]` is the sum of the first i elements, any range sum query [a, b] is simply `pref[b] - pref[a - 1]`.

## Optimal approach
1. Allocate a 64-bit array `pref` of size n + 1, setting `pref[0] = 0`.
2. Compute prefix sums in a single pass: `pref[i + 1] = pref[i] + arr[i]` for i from 0 to n - 1.
3. For each query [a, b]:
   - Compute `pref[b] - pref[a - 1]`.
   - Store the result into an answers list.
4. Return the list of answers.

Complexity: O(n + q) time (O(n) precomputation and O(1) per query), and O(n) space for the prefix sum array.

## Code walkthrough
In C++, `vector<long long> pref(n + 1, 0)` avoids 32-bit integer overflow.
The prefix accumulation loop `pref[i + 1] = pref[i] + arr[i]` builds cumulative sums up to length n.
We allocate `vector<long long> ans` and call `ans.reserve(queries.size())` to prevent dynamic reallocation.
Inside the query loop, `int a = q[0], b = q[1];` reads the 1-based indices, and `ans.push_back(pref[b] - pref[a - 1])` retrieves the exact sum in O(1) time.

## Test it out loud
- Single element array: arr = [5], query = [1, 1]. `pref` is [0, 5]. `pref[1] - pref[0] = 5`. Returns [5].
- Entire array range: arr = [1, 2, 3, 4, 5], query = [1, 5]. `pref[5] - pref[0] = 15 - 0 = 15`. Returns [15].
- Internal subsegment: arr = [1, 2, 3, 4, 5], query = [2, 4]. `pref[4] - pref[1] = 10 - 1 = 9`. Elements 2 + 3 + 4 = 9.
- Maximum values: arr = [10^9, 10^9, 10^9], query = [1, 3]. Sum is 3 * 10^9, correctly represented by 64-bit integers without overflow.

## Follow-ups
- What if the array values could be modified between queries? Prefix sums would take O(n) per update. We would use a Fenwick tree or Segment Tree to support both O(log n) updates and O(log n) queries.
- What if the array is 2D? Build a 2D prefix sum table using 2D inclusion-exclusion to answer subgrid queries in O(1) time.
- What if we needed range XOR queries instead of sum? The exact same prefix array works because XOR is self-inverse: `pref_xor[b] ^ pref_xor[a - 1]`.

## Common mistakes
- Using 32-bit integers: cumulative sums exceed 2^31 - 1, causing silent signed overflow; `long long` in C++ or `long` in Java is mandatory.
- Off-by-one errors with 1-based indexing: querying range [a, b] requires subtracting `pref[a - 1]`, not `pref[a]`.
- Forgetting to initialize `pref[0] = 0`: without a 0 at index 0, queries starting at a = 1 would access invalid memory.

## Further reading
- Prefix sum array technique and interval query patterns
- 2D prefix sums and summed-area tables
- Fenwick trees vs prefix sum arrays trade-offs
