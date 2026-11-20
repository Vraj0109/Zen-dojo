---
id: cses-subtree-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log n) time, O(n) space"
reviewed: false
---

## Clarify first
- How is the tree structured? Rooted at node 1 with n nodes numbered 1 to n.
- What operations are performed?
  - Type 1: [1, s, x] updates the value at node s to x.
  - Type 2: [2, s] asks for the sum of values in the entire subtree of node s (node s and all descendants).
- What should be returned? An array containing only the answers to type 2 queries in order.
- Can values or sums exceed 32 bits? Yes, initial and update values can be up to 10^9, so subtree sums reach 2 * 10^14, requiring 64-bit integers.
- What are the constraints? Up to 200,000 nodes and 200,000 queries.

## Examples to say out loud
Suppose n = 5, initial values are [4, 2, 5, 2, 1] (nodes 1 to 5), edges are (1, 2), (1, 3), (3, 4), (3, 5), and queries are:
- [2, 3]: subtree of 3 consists of nodes {3, 4, 5} with values 5 + 2 + 1 = 8. Output: 8.
- [1, 3, 3]: node 3's value changes from 5 to 3.
- [2, 1]: whole tree subtree sum is 4 + 2 + 3 + 2 + 1 = 12. Output: 12.
- [2, 3]: subtree of 3 now has values 3 + 2 + 1 = 6. Output: 6.
Output list: [8, 12, 6].

## Brute force
For each type 2 query, run a DFS or BFS from node s to sum all nodes in its subtree.
In the worst case (querying node 1 on a deep tree), each query takes O(n) time.
With 200,000 queries, this results in O(q * n) = 4 * 10^10 operations and times out.
Euler Tour flattening maps any subtree to a contiguous interval, transforming tree queries into 1D range sum queries.

## The key observation
If we perform a Depth-First Search traversal starting from root 1 and record the entry time `tin[v]` and exit time `tout[v]` of each node:
Every descendant of node s is visited after node s enters and before node s exits!
Thus, the entire subtree of node s corresponds exactly to the contiguous 1D index range `[tin[s], tout[s]]`.
Updating the value of node s is a single point update at index `tin[s]`.
Querying the sum of node s's subtree is a range sum query over `[tin[s], tout[s]]`.
A Fenwick tree over the entry times handles both point updates and range sum queries in O(log n) time.

## Optimal approach
1. Perform an iterative DFS from root 1 to compute `tin[v]` and `tout[v]` for all nodes.
2. Allocate a 64-bit Fenwick tree of size n + 2 initialized to 0.
3. For each node v from 1 to n:
   - Initialize `cur[v] = values[v - 1]`.
   - Add `cur[v]` to the Fenwick tree at position `tin[v]`.
4. Process each query `q`:
   - If `q[0] == 1` (update [1, s, x]):
     - Calculate change: `delta = x - cur[s]`.
     - Update value: `cur[s] = x`.
     - Update tree: `add(tin[s], delta)`.
   - If `q[0] == 2` (query [2, s]):
     - Query range: `sum(tout[s]) - sum(tin[s] - 1)`.
     - Append result to answers list.
5. Return answers list.

Complexity: O((n + q) log n) time (DFS in O(n), O(log n) per update/query), and O(n) space.

## Code walkthrough
In C++, an explicit stack `st` and edge index array `it` implement iterative DFS, preventing recursion stack overflow on degenerate trees of depth 200,000.
When entering node v, `tin[v] = ++timer`. When all outgoing edges are exhausted, `tout[u] = timer`.
The Fenwick tree functions `add(i, x)` and `sum(i)` use 1-based indexing with `long long`.
During initialization, `add(tin[v], cur[v])` places each node's value at its entry time.
In updates, `add(tin[q[1]], q[2] - cur[q[1]])` applies the difference.
In queries, `sum(tout[q[1]]) - sum(tin[q[1]] - 1)` extracts the exact subtree sum.

## Test it out loud
- Base case 1 node: values = [5], query [2, 1] gives 5. Update [1, 1, 9] sets to 9. Next query gives 9. Output: [5, 9].
- Leaf query: querying a leaf node has `tin[leaf] == tout[leaf]`, so the range is a single element, returning its own value.
- Root query: querying root 1 has range `[1, n]`, returning the total sum of the entire tree.
- 64-bit integrity: node values up to 10^9 accumulate past 2^31 - 1, safely managed by `long long`.

## Follow-ups
- How does Euler tour technique compare to Heavy-Light Decomposition for subtrees? Subtrees are always contiguous in Euler tour order, requiring only O(log n) via a simple Fenwick tree. HLD is only necessary when querying paths between arbitrary nodes.
- What if queries added a value to all nodes in a subtree? That would be a range addition over `[tin[s], tout[s]]`, which can be handled with a range-update Fenwick tree or lazy Segment tree.
- Can we query other subtree aggregations like maximum value? Yes, by replacing the Fenwick tree with a Segment Tree over `[tin[s], tout[s]]`.

## Common mistakes
- Call stack overflow with recursive DFS: recursive DFS crashes on deep trees of 200,000 nodes; an iterative stack or increased stack limit is necessary.
- Off-by-one in range sum subtraction: range is `[tin[s], tout[s]]`, so subtract `sum(tin[s] - 1)`, not `sum(tin[s])`.
- 32-bit signed overflow: cumulative subtree sums reach 2 * 10^14, requiring 64-bit types.

## Further reading
- Euler Tour technique (tree flattening)
- Subtree range query mapping with Fenwick trees
- Iterative tree traversal to prevent call stack overflow
