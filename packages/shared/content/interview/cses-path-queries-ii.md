---
id: cses-path-queries-ii
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + q log^2 n) time, O(n) space"
reviewed: false
---

## Clarify first
- What operations are performed?
  - Type 1: [1, s, x] updates value at node s to x.
  - Type 2: [2, a, b] asks for the maximum value on the simple path between node a and node b.
- What should be returned? An array of answers for type 2 queries.
- What are the constraints? Up to 200,000 nodes and 200,000 queries, values up to 10^9.
- Why can't we use simple Euler tour prefix sums? Maximum is not invertible, so path queries with point updates require a segment tree over tree paths.
- Does the graph form a connected tree? Yes, n nodes and n - 1 undirected edges.

## Examples to say out loud
Suppose n = 5, values = [2, 5, 3, 1, 4], edges (1, 2), (1, 3), (3, 4), and (3, 5).
- Query [2, 2, 4]: path 2 - 1 - 3 - 4 has values {2, 5, 3, 1}, maximum is 5.
- Query [1, 3, 9]: node 3 changes from 3 to 9.
- Query [2, 2, 4]: path 2 - 1 - 3 - 4 has values {2, 5, 9, 1}, maximum is 9.
- Query [2, 4, 5]: path 4 - 3 - 5 has values {1, 9, 4}, maximum is 9.
Output list: [5, 9, 9].

## Brute force
For each query, walk from a to b via their LCA using parent pointers, tracking maximum value.
Each query takes O(n) time on deep trees.
With 200,000 queries, O(q * n) = 4 * 10^10 operations times out.
Heavy-Light Decomposition (HLD) decomposes any path into at most O(log n) contiguous segments queryable in a Segment Tree in O(log^2 n) time.

## The key observation
In Heavy-Light Decomposition:
- For each node, the child with largest subtree size is the "heavy child". All other children are "light".
- Heavy edges group nodes into disjoint "heavy chains".
- Any path to the root crosses at most O(log n) light edges because each light edge at least doubles subtree size.
By assigning consecutive segment tree indices along each heavy chain, any path between a and b splits into at most O(log n) contiguous 1D subsegments.
We maintain an iterative Segment Tree over these positions.
Updating node s changes a single leaf in O(log n).
Querying path [a, b] jumps chain by chain until both nodes share a chain, taking O(log^2 n).

## Optimal approach
1. Run BFS from root 1 to find parent pointers `par`, depths `dep`, and traversal `order`.
2. Compute subtree sizes `sz` bottom-up. Record heavy child `heavy[u]` for each node.
3. Assign segment tree positions `pos[v]` chain by chain:
   - Walk each chain from `head[u] = u` down heavy edges: `pos[v] = cnt++`, `head[v] = u`.
4. Build an iterative Segment Tree of size 2n initialized with values ordered by `pos`.
5. Process queries:
   - If `q[0] == 1`: update leaf at `pos[s] + n` to x in O(log n).
   - If `q[0] == 2`:
     - While `head[a] != head[b]`:
       - If `dep[head[a]] < dep[head[b]]`, swap a and b.
       - Query segment `[pos[head[a]], pos[a]]` and update running maximum.
       - Jump up: `a = par[head[a]]`.
     - When `head[a] == head[b]`, query remaining segment between `min(pos[a], pos[b])` and `max(pos[a], pos[b])`.
6. Return answers list.

Complexity: O(n + q log^2 n) time (at most 2 * log n segment lookups of cost O(log n)), and O(n) space.

## Code walkthrough
In C++, `sz` and `heavy` are computed bottom-up over `order`.
The loop `for (int v = u; v != 0; v = heavy[v])` lays out each heavy chain contiguously.
The iterative segment tree `seg(2 * n, 0)` enables fast non-recursive point updates and range queries.
In the query loop, `while (head[a] != head[b])` repeatedly picks the node whose chain head is deeper.
`query(pos[head[a]], pos[a])` evaluates the chain segment, then `a = par[head[a]]` crosses the light edge.
When both nodes share the same chain, `query(pos[a], pos[b])` evaluates the final connecting segment.

## Test it out loud
- Base case 1 node: values = [5], query [2, 1, 1] gives 5. Update [1, 1, 9] sets to 9. Next query gives 9. Output: [5, 9].
- Chain graph: all nodes lie on a single heavy chain. Any query reduces to a single range query in O(log n).
- Crossing LCA: query [2, 4, 5] where LCA is 3. Both branches climb to 3, correctly returning 9.
- Sibling query: query on direct edge returns `max(values[0], values[1])`.

## Follow-ups
- How does HLD handle path sum queries? Replace range maximum in the Segment Tree with range sum. HLD works for any associative monoid operation.
- Can we achieve O(log n) query time instead of O(log^2 n)? Link-Cut Trees support path queries in O(log n) amortized time, but are more complex to implement.
- How to support edge weight updates? Store edge weights on the deeper node of each edge, excluding the LCA node during path queries.

## Common mistakes
- Comparing `dep[a] < dep[b]` instead of `dep[head[a]] < dep[head[b]]`: chain jumping must compare depths of chain heads.
- Using recursive DFS on trees of size 200,000: recursive DFS can overflow the call stack; iterative BFS prevents this.
- Off-by-one in final range query: ensure `pos[a]` and `pos[b]` are sorted before querying.

## Further reading
- Heavy-Light Decomposition theory and logarithmic chain proof
- Iterative Segment Tree integration with HLD
- Tree path query patterns in competitive programming
