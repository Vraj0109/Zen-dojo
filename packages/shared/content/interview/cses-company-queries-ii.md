---
id: cses-company-queries-ii
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log n) time, O(n log n) space"
reviewed: false
---

## Clarify first
- How is the company tree represented? Employee 1 is the general director (root). Array `bosses` has length n - 1, where `bosses[i]` is the direct boss of employee i + 2.
- What does each query [a, b] ask? Find the lowest common boss (Lowest Common Ancestor, LCA) of employee a and employee b.
- Can an employee be their own boss/ancestor? Yes, an employee counts as their own ancestor.
- What if a == b? The lowest common boss of an employee and themselves is that employee.
- What are the constraints? Up to 200,000 employees and 200,000 queries.

## Examples to say out loud
Suppose n = 5 and bosses are [1, 1, 2, 3] (employees 2, 3 report to 1; 4 reports to 2; 5 reports to 3).
- Query [4, 5]: 4 reports to 2 -> 1. 5 reports to 3 -> 1. The lowest common ancestor is employee 1. Output: 1.
- Query [2, 4]: 4 reports to 2, so 2 is an ancestor of 4. LCA is 2. Output: 2.
- Query [3, 3]: node with itself gives itself. Output: 3.
Output list: [1, 2, 3].

## Brute force
For each query [a, b], traverse upward from a to the root and record all visited ancestors in a hash set.
Then traverse upward from b until hitting the first ancestor present in the set.
In the worst case (a long linear chain of depth n), this search takes O(n) time per query.
With 200,000 queries, this results in O(q * n) = 4 * 10^10 operations and times out.
Binary lifting precomputes power-of-two ancestor jumps, allowing any LCA query to be answered in O(log n) time.

## The key observation
If two nodes a and b are at different depths in the tree, their LCA cannot be deeper than the shallower node.
Therefore, the first step is to lift the deeper node upward until both nodes are at the exact same depth.
If `a == b` after this lift, one was an ancestor of the other, and we are done.
If they are still distinct, they must converge to their LCA somewhere above their current depth.
We can test large power-of-two jumps: for j from `LOG - 1` down to 0, if `up[j][a] != up[j][b]`, it means the 2^j ancestor is still below the LCA, so we can safely jump both nodes together: `a = up[j][a]` and `b = up[j][b]`.
When the loop finishes, a and b are direct children of the LCA, so the answer is their common parent `up[0][a]`.

## Optimal approach
1. Root the tree at node 1. Run BFS to compute `dep` (depth) and `par` (direct parent) for every employee.
2. Build the binary lifting table `up[LOG][n + 1]`:
   - `up[0][v] = par[v]`.
   - For j from 1 to LOG - 1: `up[j][v] = up[j - 1][up[j - 1][v]]`.
3. To compute `lca(a, b)`:
   - Ensure `dep[a] >= dep[b]`, swapping if necessary.
   - Lift `a` by `diff = dep[a] - dep[b]` using powers of 2.
   - If `a == b`, return `a`.
   - For j from LOG - 1 down to 0:
     - If `up[j][a] != up[j][b]`, jump both: `a = up[j][a]`, `b = up[j][b]`.
   - Return `up[0][a]`.
4. Answer all queries and return the result list.

Complexity: O((n + q) log n) time (O(n log n) preprocessing and O(log n) per LCA query), and O(n log n) space.

## Code walkthrough
In C++, `adj` stores bidirectional boss relationships.
BFS records `dep[v] = dep[u] + 1` and `par[v] = u`.
Table construction computes `up[j][v] = up[j - 1][up[j - 1][v]]` for all levels j up to `LOG`.
In the `lca(a, b)` lambda:
`int diff = dep[a] - dep[b]; for (int j = 0; j < LOG; j++) if (diff >> j & 1) a = up[j][a];` aligns the depths.
The check `if (a == b) return a;` catches ancestor-descendant pairs immediately.
The descending loop `for (int j = LOG - 1; j >= 0; j--)` maintains `up[j][a] != up[j][b]` so that `a` and `b` never jump into or above the LCA.
Finally, `return up[0][a];` returns their immediate parent.

## Test it out loud
- Same node: a = 1, b = 1. Depths are equal, `a == b` check immediately returns 1.
- Direct parent-child: a = 2, b = 4 (where 4 reports to 2). `dep[4] - dep[2] = 1`. 4 lifts to 2. `a == b` returns 2.
- Siblings: a = 2, b = 3 (both report to 1). Depths are equal. First jump comparison finds `up[0][2] == up[0][3] == 1`, loop does not jump. Returns `up[0][2] = 1`.
- Deep tree: chain of 100,000 nodes. Depths align in O(log n) jumps and LCA resolves in O(log n) comparisons without recursion.

## Follow-ups
- Can LCA be solved in O(1) query time? Yes, using Euler tour + Sparse Table (Farach-Colton and Bender algorithm) with O(n log n) or O(n) preprocessing and O(1) query.
- What if queries were all offline? Tarjan's off-line LCA algorithm uses Disjoint Set Union (DSU) to answer all q queries in O(n + q * alpha(n)) time.
- How does binary lifting LCA compare to Euler tour LCA? Binary lifting is easier to write and uses less memory (n * log n vs 2n * log(2n)), making it standard for competitive programming.

## Common mistakes
- Forgetting to align depths first: jumping both nodes when they are at different depths can result in mismatched comparisons.
- Jumping when `up[j][a] == up[j][b]`: jumping when ancestors are equal jumps into or above the LCA, losing track of the lowest common point. We must jump only when `up[j][a] != up[j][b]`.
- Level order in binary lifting build: outer loop must be j (the power of 2), inner loop v (the vertex).

## Further reading
- Lowest Common Ancestor binary lifting technique
- Farach-Colton and Bender algorithm for O(1) LCA
- Tarjan's offline LCA algorithm using Disjoint Set Union
