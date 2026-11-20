---
id: cses-tree-distances-ii
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What does the problem ask? For every node in the tree, compute the sum of distances from it to all other n - 1 nodes.
- What should be returned? An array of length n where element i (0-based) is the total distance sum for node i + 1.
- Can distance sums exceed 32-bit integer limits? Yes, for a linear tree of length n = 200,000, distance sums reach n * (n - 1) / 2 approx 2 * 10^10, requiring 64-bit integers.
- Is the graph a valid tree? Yes, n nodes and n - 1 undirected edges forming a single connected component.
- What if n = 1? A tree with 1 node has sum of distances 0, returning [0].

## Examples to say out loud
Suppose n = 5 and edges are (1, 2), (1, 3), (3, 4), and (3, 5).
For node 1: distances to 2, 3, 4, 5 are 1, 1, 2, 2. Sum is 1 + 1 + 2 + 2 = 6.
For node 3: distances to 1, 2, 4, 5 are 1, 2, 1, 1. Sum is 1 + 2 + 1 + 1 = 5.
For node 2: distances are 1 (to 1), 2 (to 3), 3 (to 4), 3 (to 5). Sum is 1 + 2 + 3 + 3 = 9.
For nodes 4 and 5: each has distances 1, 2, 3, 2. Sum is 8.
Output array: [6, 9, 5, 8, 8].

## Brute force
Run a BFS or DFS from every node 1 to n, summing the shortest distances to all other nodes.
Running BFS from all n nodes takes O(n * (n + m)) = O(n^2) time.
For n = 200,000, this requires 4 * 10^10 operations and times out.
Using tree rerooting (all-distances in trees), we compute the root's answer first, and then transfer the root to children in O(1) time each.

## The key observation
Suppose we know the total distance sum for a parent node p, `ans[p]`, and we want to compute the distance sum for its child c, `ans[c]`.
Moving the root from p across the edge (p, c) to c affects distances as follows:
- Every node in c's subtree gets 1 step closer to c than to p (decreasing the sum by `sz[c]`).
- Every node outside c's subtree gets 1 step farther from c than from p (increasing the sum by `n - sz[c]`).
Therefore:
`ans[c] = ans[p] - sz[c] + (n - sz[c]) = ans[p] + n - 2 * sz[c]`.
This enables computing `ans` for all nodes in a top-down pass after an initial bottom-up pass computes subtree sizes and root depth sums.

## Optimal approach
1. Root the tree at node 1. Perform a BFS to determine parent pointers `par`, node depths `dep`, and BFS visitation `order`.
2. Initialize `sz[v] = 1` for all nodes.
3. Compute subtree sizes bottom-up by traversing `order` in reverse (from index n - 1 down to 1):
   - `sz[par[order[i]]] += sz[order[i]]`.
4. Calculate root answer: `ans[1] = sum(dep[v])` for all v from 1 to n.
5. Compute answers for all other nodes top-down by traversing `order` forwards (from index 1 to n - 1):
   - Let child `c = order[i]`.
   - `ans[c] = ans[par[c]] + n - 2 * sz[c]`.
6. Return `ans[1..n]` as an array of 64-bit integers.

Complexity: O(n) time (two linear passes over BFS order), and O(n) space for tree adjacency and DP arrays.

## Code walkthrough
In C++, `adj` stores undirected edges.
The BFS loop records `par[v] = u`, `dep[v] = dep[u] + 1`, and appends `v` to `order`.
In the bottom-up loop `for (int i = n - 1; i >= 1; i--)`, `sz[par[order[i]]] += sz[order[i]]` aggregates sizes from leaves up to the root.
The initial root sum is `ans[1] += dep[v]`.
In the top-down loop `for (int i = 1; i < n; i++)`, `ans[c] = ans[par[c]] + n - 2 * sz[c]` computes child answers using 64-bit integer arithmetic.
Finally, `vector<long long>(ans.begin() + 1, ans.end())` returns 0-indexed values for nodes 1 to n.

## Test it out loud
- Base case 1 node: n = 1, edges = []. `ans[1] = 0`. Returns [0].
- 2 nodes: n = 2, edge (1, 2). `sz[2] = 1`. `ans[1] = 1`. `ans[2] = 1 + 2 - 2 * 1 = 1`. Output: [1, 1].
- Star graph: center 1 with leaves 2 to 7. `ans[1] = 6`. For leaf c, `sz[c] = 1`, `ans[c] = 6 + 7 - 2(1) = 11`. Output: [6, 11, 11, 11, 11, 11, 11].
- Chain of 3 nodes: 1 - 2 - 3. Node 2 is center with sum 1 + 1 = 2. Endpoints have sum 3. Output: [3, 2, 3].

## Follow-ups
- How does rerooting generalize to weighted trees? Instead of +1 and -1, moving across edge of weight w scales: `ans[c] = ans[p] + (n - 2 * sz[c]) * w`.
- Can this be written with two DFS passes? Yes, DFS 1 computes subtree sizes and depths; DFS 2 pushes `ans` down to children.
- Why use BFS order instead of DFS? Recursive DFS can cause stack overflow on trees of depth 200,000. BFS queue order is completely iterative and safe.

## Common mistakes
- 32-bit integer overflow: distance sums reach n * (n - 1) / 2 = 2 * 10^10, which overflows 32-bit `int`; `long long` is required for `sz` and `ans`.
- Top-down before bottom-up: `sz[c]` must be fully computed before calculating `ans[c]`.
- Off-by-one in return array slice: nodes are 1 to n; slicing must return elements 1 through n, not 0 through n - 1.

## Further reading
- Tree rerooting technique (all-roots DP)
- Subtree size aggregation and tree centroid properties
- Iterative tree traversals avoiding recursion limits
