---
id: cses-salary-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log (n + q)) time, O(n + q) space"
reviewed: false
---

## Clarify first
- What operations are performed? Type 1: [1, k, x] changes the salary of employee k (1-based) to x. Type 2: [2, a, b] counts employees with salary between a and b inclusive.
- What range of values can salaries take? Salaries and query bounds can reach 10^9.
- Can we index directly by salary? No, values up to 10^9 cannot fit into an array without memory limits.
- What should be returned? An array containing only the answers to type 2 queries in order.
- What are the input constraints? Up to 200,000 employees and 200,000 queries.

## Examples to say out loud
Suppose initial salaries are [3, 7, 2, 2, 5] and queries are:
- [2, 2, 3]: count in [2, 3]. Salaries are 3, 2, 2 (3 employees). Output: 3.
- [1, 3, 6]: employee 3 salary changes to 6. Salaries are [3, 7, 6, 2, 5].
- [2, 2, 3]: range [2, 3] now contains 3 and 2 (2 employees). Output: 2.
- [1, 5, 2]: employee 5 salary changes to 2. Salaries are [3, 7, 6, 2, 2].
- [2, 2, 3]: range [2, 3] now contains 3, 2, 2 (3 employees). Output: 3.
Output: [3, 2, 3].

## Brute force
A naive approach loops through all n employees for every type 2 query, taking O(n) per query.
With 200,000 queries, this O(q * n) method takes 4 * 10^10 operations and times out.
Coordinate compression combined with a Fenwick tree allows logarithmic updates and queries.

## The key observation
At most n + q distinct salary values ever appear across the initial state and all updates (at most 400,000 values).
Collecting and sorting these values maps each salary to a compressed rank 1 to m.
A Fenwick tree over these ranks maintains salary frequencies.
Changing a salary decrements the old rank's count and increments the new rank's count in O(log m).
A range query [a, b] uses `lower_bound(a)` and `upper_bound(b)` to count salaries in O(log m).

## Optimal approach
1. Collect initial salaries and update values x into vector `vals`.
2. Sort `vals` and remove duplicates to get unique values of size m.
3. Allocate a Fenwick tree of size m + 1 initialized to 0.
4. Keep array `cur` for current employee salaries, and populate the tree with initial salaries.
5. For each query:
   - If type 1 [1, k, x]:
     - Decrement frequency of old salary `cur[k - 1]`.
     - Set `cur[k - 1] = x`.
     - Increment frequency of new salary `x`.
   - If type 2 [2, a, b]:
     - Binary search: `lo = lower_bound(vals, a) - vals.begin()`, `hi = upper_bound(vals, b) - vals.begin()`.
     - Range count is `prefix_sum(hi) - prefix_sum(lo)`. Append to answers.
6. Return answers list.

Complexity: O((n + q) log (n + q)) time and O(n + q) space.

## Code walkthrough
In C++, `vals` collects `salaries` and update values. `unique` yields distinct sorted values.
The lambda `id(v)` uses `lower_bound` on `vals` to map salary `v` to a 1-based index.
The Fenwick tree `add(i, v)` updates tree nodes along `i += i & -i`.
The prefix sum `pre(i)` accumulates counts along `i -= i & -i`.
For range query [2, a, b], `lo` is the count of unique values strictly less than a, and `hi` is the count of unique values <= b.
`pre(hi) - pre(lo)` gives the exact count in [a, b].

## Test it out loud
- Single employee: salaries = [5], queries = [[2, 1, 10], [1, 1, 20], [2, 1, 10], [2, 20, 20]]. Returns [1, 0, 1].
- Exact boundary match: salaries = [4, 4, 4, 4], query [2, 4, 4] returns 4.
- Empty range: bounds [1, 3] on array [4, 4, 4] gives `lo == hi`, returning 0.
- 10^9 salary values: large values compress safely into ranks <= 400,000.

## Follow-ups
- What if queries arrive online? Use a dynamic (pointer-based) Segment tree or an Order Statistic Tree (GNU PBDS).
- Why omit query bounds a and b from `vals`? `lower_bound` and `upper_bound` locate the correct rank range even when bounds are absent.
- What if we also needed the sum of salaries in [a, b]? Maintain a second Fenwick tree for salary sums.

## Common mistakes
- Adding a and b to `vals`: unnecessary and enlarges coordinate table.
- Forgetting to decrement the old salary on update: causes ghost counts.
- Indexing errors with 1-based Fenwick trees: ensure `lo` and `hi` bounds match tree indices.

## Further reading
- Coordinate compression techniques for range queries
- Fenwick tree frequency counters
- Dynamic segment trees vs coordinate compression
