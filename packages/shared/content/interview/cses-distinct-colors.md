---
id: cses-distinct-colors
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n log n) time, O(n) space"
reviewed: false
---

## Clarify first
- What is given? A tree rooted at node 1 with n nodes, node colors in `colors` (1-indexed for nodes 1 to n), and `edges`.
- What should be computed? For every node v, count the number of distinct colors present in its entire subtree.
- What should be returned? An array `ans` of length n, where `ans[i]` is the count for node i + 1.
- What are the constraints? n up to 200,000, and colors up to 10^9.
- Can colors be negative or 0? Colors are positive integers up to 10^9.

## Examples to say out loud
Suppose n = 5, colors = [2, 3, 2, 2, 3], edges = [[1, 2], [1, 3], [3, 4], [3, 5]].
- Node 4 has color 2. Subtree has distinct colors {2}, count = 1.
- Node 5 has color 3. Subtree has distinct colors {3}, count = 1.
- Node 3 has color 2, with children 4 (color 2) and 5 (color 3). Distinct colors are {2, 3}, count = 2.
- Node 2 has color 3. Leaf node, count = 1.
- Node 1 has color 2, with children 2 and 3. Subtree distinct colors are {2, 3}, count = 2.
Output: [2, 1, 2, 1, 1].

## Brute force
For every node v, run a DFS traversing all descendants in its subtree, collecting node colors into a hash set, and setting `ans[v - 1] = set.size()`.
On a skewed chain of length n, each subtree traversal takes O(n) time, yielding O(n^2) total time.
With n = 200,000, 4 * 10^10 operations will cause a Time Limit Exceeded error.
We need an approach running in O(n log n) time.

## The key observation
Flatten the tree into an array using an Euler tour (DFS entry timer `tin` and exit timer `tout`).
Node v's subtree corresponds exactly to the contiguous range `[tin[v], tout[v]]` in the traversal order array `arr`.
The problem reduces to: given an array `arr` of length n, answer n range distinct queries `[tin[v], tout[v]]`.
We can answer these offline:
- Group queries by their right endpoint `tout[v]`.
- Sweep a pointer `r` from 1 to n.
- For each color seen at position `r`, if it was previously seen at position `p`, remove the point value 1 at `p` in a Fenwick tree (Binary Indexed Tree) and add 1 at `r`.
- Then, for all queries whose range ends at `r`, the number of distinct colors in `[l, r]` is the prefix sum `query(r) - query(l - 1)`.

## Optimal approach
1. Build adjacency list `adj` from `edges`.
2. Run an iterative DFS from root 1:
   - Assign DFS entry time `tin[u]` and exit time `tout[u]`.
   - Populate `arr[tin[u]] = colors[u - 1]`.
3. Create a query bucket list `byEnd` where `byEnd[r]` stores all nodes `v` whose `tout[v] == r`.
4. Initialize a Fenwick tree of size n and a hash map `last` to track the most recent index of each color.
5. Sweep `r` from 1 to n:
   - If color `arr[r]` is in `last`, decrement position `last[arr[r]]` in the Fenwick tree by 1.
   - Increment position `r` in the Fenwick tree by 1.
   - Update `last[arr[r]] = r`.
   - For each node `v` in `byEnd[r]`, query the range `[tin[v], r]` using `query(r) - query(tin[v] - 1)` and store the result in `ans[v - 1]`.
6. Return `ans`.

Complexity: O(n log n) time (n insertions and updates in a Fenwick tree taking O(log n) each) and O(n) space.

## Code walkthrough
In C++, `tin` and `tout` are populated using an explicit stack to prevent stack overflow.
The array `arr[tin[v]] = colors[v - 1]` stores colors indexed by visitation time.
`byEnd[tout[v]].push_back(v)` groups query lookups by their interval right boundary.
Inside the sweep-line loop:
`add(f->second, -1)` removes the older occurrence so that each unique color only contributes once—at its rightmost appearance.
`add(r, 1)` registers the new rightmost occurrence.
`ans[v - 1] = sum(r) - sum(tin[v] - 1)` computes active color markers strictly inside `[tin[v], tout[v]]`.

## Test it out loud
- Single node: tree with 1 node, color 7. Output is [1].
- Star graph: root 1 with children all having distinct colors. Node 1 gets count equal to number of distinct colors, each leaf gets 1.
- Identical colors: all nodes have color 5. At each step, previous index is subtracted and new index is added, keeping Fenwick sum in any range equal to 1. Output is [1, 1, ..., 1].
- Chain graph: deep tree where each subtree query covers a contiguous prefix of the flattened array. Handled in O(n log n) without recursion limits.

## Follow-ups
- Could this be solved online? Yes, using a persistent segment tree to maintain the distinct elements per prefix, answering each range query in O(log n) time online.
- What about DSU on tree (Sack / Small-to-Large merging)? Yes, maintaining a set or frequency map and merging child data into the largest child's container solves it in O(n log^2 n) or O(n log n) time without offline sweep-line.
- How does memory scale if colors are very large? Large color values are handled with a hash map or coordinate compression, requiring O(n) memory.

## Common mistakes
- Using recursive DFS in languages like Python or C++ on deep trees: causes recursion limit or stack overflow. Use an iterative DFS.
- Double-counting colors when an element appears multiple times inside the same subtree: subtracting the previous occurrence at `last[c]` ensures only the latest occurrence within the current window is counted.
- 0-indexing vs 1-indexing confusion: `tin` and `tout` are typically 1-indexed, matching Fenwick tree standard indexing.

## Further reading
- Euler tour technique for tree flattening
- Fenwick tree offline range distinct queries
- DSU on tree (small to large merging)
