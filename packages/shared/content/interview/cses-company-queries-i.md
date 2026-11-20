---
id: cses-company-queries-i
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log n) time, O(n log n) space"
reviewed: false
---

## Clarify first
- How is the company structured? Employee 1 is the general director (root). Array `bosses` has length n - 1, where `bosses[i]` is the direct boss of employee i + 2.
- What does each query [x, k] ask? Starting at employee x, move upward to the direct boss k times.
- What if there are fewer than k bosses above employee x? Return -1.
- What if k = 0? The query asks for 0-th boss, which is employee x themselves. Constraints specify 1 <= k <= n.
- What are the constraints? Up to 200,000 employees and 200,000 queries.

## Examples to say out loud
Suppose n = 5 and bosses are [1, 1, 2, 3] (employees 2, 3 report to 1; 4 reports to 2; 5 reports to 3).
- Query [4, 1]: 1st boss of 4 is employee 2.
- Query [4, 2]: 2nd boss of 4 is employee 1 (director).
- Query [4, 3]: 3rd boss of 4 does not exist (director has no boss). Return -1.
- Query [1, 1]: 1st boss of director 1 does not exist. Return -1.
Output list: [2, 1, -1, -1].

## Brute force
For each query [x, k], walk up the boss pointers k times in a while-loop.
In the worst case (a long linear company hierarchy of depth n), each query takes O(k) = O(n) steps.
For 200,000 queries, this O(q * n) approach performs 4 * 10^10 steps and times out.
Binary lifting precomputes power-of-two ancestor jumps, allowing any k-th ancestor to be found in O(log n) time.

## The key observation
Any integer k can be uniquely written as a sum of powers of 2 (its binary representation).
For example, moving up 13 steps equals moving up by 8, then 4, then 1 step (13 = 8 + 4 + 1).
If we precompute `up[j][v]`, the 2^j-th boss of employee v, we can decompose any k into set bits and jump in O(log n) steps.
The binary lifting table satisfies the simple recurrence:
`up[j][v] = up[j - 1][up[j - 1][v]]`
(moving up 2^j steps is equivalent to moving up 2^(j - 1) steps twice).
We use employee 0 as a sentinel representing "no boss", with `up[j][0] = 0`.

## Optimal approach
1. Let `LOG = floor(log2(n)) + 1` (at most ~18 for n <= 200,000).
2. Allocate a table `up[LOG][n + 1]` initialized to 0.
3. Base layer (j = 0, jump of 2^0 = 1):
   - Set `up[0][1] = 0` (director has no boss).
   - For i from 0 to n - 2, set `up[0][i + 2] = bosses[i]`.
4. Fill binary lifting table:
   - For j from 1 to LOG - 1:
     - For v from 1 to n:
       - `up[j][v] = up[j - 1][up[j - 1][v]]`.
5. For each query [x, k]:
   - Let `v = x`.
   - If `k >= (1 << LOG)`, set `v = 0`.
   - Else, for j from 0 to LOG - 1:
     - If `(k >> j) & 1` is true, set `v = up[j][v]`.
     - If `v == 0`, break early.
   - Record `(v == 0) ? -1 : v`.
6. Return answers list.

Complexity: O((n + q) log n) time (O(n log n) table construction and O(log n) per query), and O(n log n) space.

## Code walkthrough
In C++, `LOG` is computed by `while ((1 << LOG) <= n) LOG++;`.
`vector<vector<int>> up(LOG, vector<int>(n + 1, 0))` handles the 0 sentinel naturally since all entries start at 0.
The recurrence `up[j][v] = up[j - 1][up[j - 1][v]]` processes level j after level j - 1 is fully completed.
In query resolution, testing `if (k >> j & 1)` checks if the j-th bit of k is set.
If so, `v = up[j][v]` executes the 2^j jump.
If `v` becomes 0, it means we jumped above the director, so subsequent jumps remain 0.
Finally, `(v == 0 ? -1 : v)` converts the sentinel back to -1.

## Test it out loud
- Base case director query: n = 1, query [1, 1]. `k = 1`, `v = up[0][1] = 0`. Returns -1.
- Exceeding tree height: n = 4 in line 1 - 2 - 3 - 4. Query [4, 4]. Binary jumps land on 0, returns -1. Query [4, 3] lands on 1, returns 1.
- Jump by power of two: query [x, 4] executes exactly one jump at j = 2 (`1 << 2 = 4`).
- Arbitrary jump: query [x, 7] executes jumps at j = 0 (1), j = 1 (2), and j = 2 (4), total jump of 7.

## Follow-ups
- How does binary lifting compare to heavy-light decomposition (HLD)? Binary lifting is much simpler to implement and uses O(log n) time per query. HLD also answers k-th ancestor in O(log n) (or O(1) with macro-micro decomposition), but requires more code.
- Can we answer queries online? Yes, binary lifting tables are completely static once built and answer each query independently in O(log n) time.
- What if edges were added dynamically (link operation)? Dynamic trees (Link-Cut Trees) support dynamic link/cut and k-th ancestor in O(log n) amortized time.

## Common mistakes
- Not defining a sentinel for "no boss": if `up[j - 1][v]` is 0 and indexing into `up` with 0 is not protected, array out-of-bounds or invalid jumps occur.
- Building table by node instead of by level: computing `up[j][v]` requires `up[j - 1]` to be fully populated across all nodes first; outer loop must be j, inner loop v.
- 0-based vs 1-based indexing for bosses: `bosses[i]` is the boss for employee `i + 2`, not `i + 1`.

## Further reading
- Binary lifting on trees for k-th ancestor queries
- Lowest Common Ancestor using binary lifting
- Level ancestor problem and jump pointers
