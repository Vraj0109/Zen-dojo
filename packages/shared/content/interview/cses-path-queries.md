---
id: cses-path-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log n) time, O(n) space"
reviewed: false
---

## Clarify first
- How is the tree structured? Rooted at node 1 with n nodes numbered 1 to n.
- What operations exist?
  - Type 1: [1, s, x] sets the value of node s to x.
  - Type 2: [2, s] asks for the sum of values on the simple path from root 1 to node s (both ends included).
- What should be returned? An array containing the answers to type 2 queries in order.
- Can values or path sums exceed 32-bit limits? Yes, values are up to 10^9 and paths can have length 200,000, so path sums reach 2 * 10^14, requiring 64-bit integers.
- What are the constraints? Up to 200,000 nodes and 200,000 queries.

## Examples to say out loud
Suppose n = 5, values are [4, 2, 5, 2, 1] (nodes 1 to 5), edges are (1, 2), (1, 3), (3, 4), (3, 5), and queries are:
- [2, 4]: path from root 1 to 4 is 1 - 3 - 4. Values are 4 + 5 + 2 = 11. Output: 11.
- [1, 3, 3]: node 3's value changes from 5 to 3.
- [2, 4]: path 1 - 3 - 4 now has values 4 + 3 + 2 = 9. Output: 9.
- [2, 1]: path to root itself is just node 1 with value 4. Output: 4.
Output list: [11, 9, 4].

## Brute force
For each type 2 query, traverse up parent pointers from node s to root 1, summing values along the path.
In the worst case (a long linear tree of depth n), each query takes O(n) steps.
With 200,000 queries, this results in O(q * n) = 4 * 10^10 operations and times out.
By inverting the relationship between path queries and subtree updates, we can use a range-update point-query Fenwick tree.

## The key observation
Consider the contribution of a single node v:
Node v lies on the root-to-s path if and only if s lies in the subtree of v!
Therefore, increasing the value of node v by delta increases the path sum of every node in v's subtree by delta, and affects no other nodes.
Under an Euler tour flattening where the subtree of v corresponds to the 1D range `[tin[v], tout[v]]`:
- Updating the value of node s becomes a range addition of `delta = x - cur[s]` over `[tin[s], tout[s]]`.
- Querying the path sum to node s becomes a point query at index `tin[s]`!
Using a difference array inside a Fenwick tree, range additions take O(log n) time and point queries take O(log n) time.

## Optimal approach
1. Run an iterative DFS from root 1 to compute entry times `tin` and exit times `tout` for all nodes.
2. Allocate a 64-bit Fenwick tree array `bit` of size n + 2 initialized to 0.
3. For range additions over `[l, r]` with value v:
   - Call `add(l, v)`.
   - If `r + 1 <= n`, call `add(r + 1, -v)`.
4. Initialize the tree: for each node v from 1 to n, add `values[v - 1]` over range `[tin[v], tout[v]]`.
5. Process each query `q`:
   - If `q[0] == 1` (update [1, s, x]):
     - Delta is `q[2] - cur[s]`.
     - Update range: `rangeAdd(tin[s], tout[s], delta)`.
     - Update current value: `cur[s] = q[2]`.
   - If `q[0] == 2` (query [2, s]):
     - Point query: `sum(tin[s])`.
     - Append to answers list.
6. Return answers list.

Complexity: O((n + q) log n) time (DFS in O(n), O(log n) per operation), and O(n) space.

## Code walkthrough
In C++, an iterative stack with `vector<int> it` handles DFS cleanly without recursion limits.
`tin[1] = ++timer` and `tout[u] = timer` record entry and exit timestamps.
The `rangeAdd(l, r, x)` helper executes `add(l, x)` and `if (r + 1 <= n) add(r + 1, -x)` on the difference array.
When initializing, each node pushes its value to its entire subtree via `rangeAdd(tin[v], tout[v], cur[v])`.
When an update arrives, `rangeAdd(tin[q[1]], tout[q[1]], delta)` adjusts the difference marks.
When a path query arrives, `sum(tin[q[1]])` computes the prefix sum of differences at `tin[q[1]]`, recovering the exact root-to-s path sum in O(log n).

## Test it out loud
- Base case root: values = [5], query [2, 1] gives 5. Update [1, 1, 9] gives 9. Output: [5, 9].
- Direct child: 1 - 2. Root is 7, child is 1. Path to 2 gives 7 + 1 = 8. Updating root to 2 changes path to 2 + 1 = 3. Output: [8, 3].
- Independent subtrees: updating node 2 does not affect path to node 3 if they are siblings.
- 64-bit bounds: path sums accumulate to 2 * 10^14, safely handled by `long long`.

## Follow-ups
- How does this compare to Heavy-Light Decomposition (HLD)? For root-to-node paths, Euler tour range addition + point query is much simpler than HLD (O(log n) vs O(log^2 n) and simpler code). HLD is needed when querying paths between two arbitrary nodes with dynamic updates.
- What if path queries asked for path maximum instead of path sum? Maximum is not invertible, so difference arrays cannot be used; HLD with a Segment Tree is required.
- Can this support queries between arbitrary nodes a and b? `dist_sum(a, b) = path(a) + path(b) - path(lca(a, b)) - path(par[lca(a, b)])`.

## Common mistakes
- Confusing subtree sum with path sum: Subtree Queries is point-update range-query; Path Queries is range-update point-query.
- Recursion stack overflow on deep trees: 200,000 nodes will crash standard recursive DFS. Iterative DFS avoids this.
- Missing `r + 1 <= n` boundary check in `rangeAdd`: if `tout[s] == n`, attempting to write to `n + 1` requires sufficient Fenwick array sizing (size n + 2).

## Further reading
- Tree Euler Tour linearization for path and subtree duality
- Fenwick tree range update point query technique
- Comparison of tree path query methods (Euler tour vs HLD)
