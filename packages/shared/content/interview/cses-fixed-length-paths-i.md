---
id: cses-fixed-length-paths-i
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n log n) time, O(n) space"
reviewed: false
---

## Clarify first
- What is given? An undirected tree with n nodes numbered 1 to n, and a target distance k.
- What should be counted? The number of unordered pairs of distinct nodes (u, v) such that the simple path between them contains exactly k edges.
- What should be returned? The total count as a 64-bit integer, since the count can reach O(n^2).
- What are the constraints? n up to 200,000, 1 <= k <= n.
- Can k = 1? Yes, that simply counts the number of edges, which equals n - 1.

## Examples to say out loud
Suppose n = 5, k = 2, edges = [[1, 2], [1, 3], [3, 4], [3, 5]].
- Path 2 - 1 - 3 has length 2.
- Path 1 - 3 - 4 has length 2.
- Path 1 - 3 - 5 has length 2.
- Path 4 - 3 - 5 has length 2.
The valid unordered pairs are {2, 3}, {1, 4}, {1, 5}, and {4, 5}.
Total count = 4.

Suppose n = 4, k = 3, edges = [[1, 2], [2, 3], [3, 4]].
- Only pair {1, 4} has path length 3.
Total count = 1.

## Brute force
Run a BFS or DFS from every node to compute the distance to all other nodes.
For each starting node, count how many nodes lie at distance k, then divide the total sum by 2.
This takes O(n) per node, leading to O(n^2) total time.
With n = 200,000, n^2 = 4 * 10^10 operations causes a Time Limit Exceeded error.
We need an O(n log n) divide-and-conquer strategy using Centroid Decomposition.

## The key observation
In any tree component, if we pick a centroid c, any simple path of length k either:
1. Passes through c (or starts/ends at c).
2. Lies entirely within one of the subtrees formed by removing c.
By choosing c as the centroid, each connected component after removing c has size at most n / 2.
Thus, the decomposition tree has height at most O(log n).
For paths passing through c, we process the child subtrees of c one by one:
- Maintain an array `cnt[d]`, the number of nodes at distance d from c among subtrees already processed (with `cnt[0] = 1` for c itself).
- For each node in the current child subtree at distance `d <= k`, it forms a valid path of length k with every node recorded at distance `k - d`, contributing `cnt[k - d]` paths.
- After evaluating the current child subtree, we insert its node depths into `cnt`.
This counts every path through c exactly once without double counting paths within the same subtree.

## Optimal approach
1. Initialize `removed[u] = false` for all nodes and an explicit decomposition stack containing node 1.
2. While the stack is not empty, pop component seed `start`:
   - Run BFS from `start` ignoring removed nodes to identify all nodes in the component and their parents.
   - Compute component subtree sizes in reverse BFS order.
   - Find the centroid `c` of the component: start at `start` and greedily step to any neighbor `v` whose subtree size satisfies `sz[v] * 2 > total_size`.
3. Count paths passing through `c`:
   - Initialize `cnt[0] = 1`, and track `max_seen = 0`.
   - For each neighbor `child` of `c` that is not removed:
     - Run BFS from `child` to collect all nodes in its subtree along with their depths (distance to `c`).
     - For each depth `d`, if `k - d >= 0` and `k - d <= max_seen`, add `cnt[k - d]` to `ans`.
     - After querying, add 1 to `cnt[d]` for each `d`, updating `max_seen = max(max_seen, d)`.
   - Clear only the modified indices of `cnt` up to `max_seen` back to 0.
4. Mark `removed[c] = true`.
5. Push all non-removed neighbors of `c` onto the decomposition stack.
6. Return `ans`.

Complexity: O(n log n) time because each node participates in O(log n) centroid levels, and clearing `cnt` up to `max_seen` avoids O(n) zero-filling overhead. Space complexity is O(n).

## Code walkthrough
In C++, `stk` maintains active component roots for centroid decomposition iteratively.
The loop `sz[par[comp[i]]] += sz[comp[i]]` calculates sizes bottom-up without recursion.
The loop `c = nxt` quickly descends to the component centroid.
Inside the child processing loop:
`ans += cnt[k - d]` counts connections between the new subtree and previously visited subtrees (or centroid `c` when `d == k`).
The reset loop `for (int d = 0; d <= max_seen; d++) cnt[d] = 0` cleans up only touched indices, maintaining O(component_size) time per centroid step.

## Test it out loud
- Base case k = 1: each edge contributes 1, total paths = n - 1.
- Line graph with k = 2: 1-2-3-4 has pairs (1, 3) and (2, 4), total = 2.
- Star graph: center node with n - 1 leaves. For k = 2, every pair of leaves has distance 2, giving (n - 1) * (n - 2) / 2 paths. Centroid picks center first and finds all pairs immediately.
- Disconnected case / unreachable k: if k >= n, no path can have length k, correctly returns 0.

## Follow-ups
- What if paths can have length at most k instead of exactly k? That is Fixed-Length Paths II, solved using a Fenwick tree or prefix sums over the depth frequencies in O(n log n) or O(n log^2 n) time.
- Can this be solved with DSU on tree (Small-to-Large merging)? Yes, maintaining depth counts per subtree and merging smaller subtrees into larger ones gives an O(n log n) or O(n) solution using vector pointer swaps.
- Why is clearing `cnt` with `max_seen` critical? Zeroing the whole `cnt` array of size n on every centroid would degrade overall time to O(n^2) on skewed trees.

## Common mistakes
- Integer overflow: the answer can reach n * (n - 1) / 2 ~ 2 * 10^10, requiring a 64-bit integer (`long long` in C++).
- Re-zeroing the entire `cnt` array of size n: this adds O(n) per centroid step, raising the complexity to O(n^2).
- Adding a subtree to `cnt` before querying: leads to false paths formed between two nodes in the same branch that pass through the branch rather than through `c`.

## Further reading
- Centroid Decomposition on trees
- Divide and conquer on tree paths
- Small-to-Large merging (DSU on tree)
