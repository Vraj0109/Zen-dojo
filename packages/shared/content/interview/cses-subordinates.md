---
id: cses-subordinates
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- Who is the root of the hierarchy? Employee 1 is the general director, acting as the root of the tree.
- How are bosses indexed? Array `bosses` has length n - 1, where `bosses[i]` is the direct boss of employee `i + 2` (for i from 0 to n - 2).
- What is the definition of a subordinate? Anyone who reports to the employee directly or indirectly (the subtree size minus 1).
- What should be returned? An array of length n where element i (0-based) is the total number of subordinates of employee i + 1.
- Can n = 1? Yes, if n = 1, employee 1 has 0 subordinates, returning [0].

## Examples to say out loud
Suppose n = 5 and bosses are [1, 1, 2, 3].
- Employee 2 reports to 1, and 3 reports to 1.
- Employee 4 reports to 2, and 5 reports to 3.
The hierarchy is a tree: 1 is the root with children {2, 3}. Node 2 has child 4. Node 3 has child 5.
Subordinates:
- Employee 5 has 0 subordinates.
- Employee 4 has 0 subordinates.
- Employee 3 has 1 subordinate (node 5).
- Employee 2 has 1 subordinate (node 4).
- Employee 1 has 4 subordinates (nodes 2, 3, 4, 5).
Output: [4, 1, 1, 0, 0].

## Brute force
For each employee u, we could run a breadth-first or depth-first search through their descendant subtrees to count reachable nodes.
Running a DFS for all n employees takes O(n * (n + m)) = O(n^2) time.
For n = 200,000, n^2 = 4 * 10^10 operations, which will cause a severe timeout.
Because the hierarchy is a tree, subtrees do not overlap; each employee's subordinate count is simply the sum of 1 + subordinates of each direct report.

## The key observation
The subordinate count of an employee u is directly related to subtree sizes in a rooted tree: `subordinates[u] = sum(1 + subordinates[v])` for all direct children v of u.
This recursive recurrence has optimal substructure. If we compute subtree sizes bottom-up (from leaves up to the root), each employee's count can be determined in a single pass.
A breadth-first search from the root generates a topological order by depth. Reversing this BFS order guarantees that every child is processed before its parent.

## Optimal approach
1. Build an adjacency list `adj` of size n + 1 where `adj[boss]` contains all direct employees reporting to `boss`.
2. Perform a BFS starting at root 1:
   - Initialize a vector `order` with root 1.
   - For each node u in `order`, append all children in `adj[u]` to `order`.
   - When finished, `order` contains all n employees arranged in increasing depth.
3. Allocate an array `sub` of length n initialized to 0.
4. Iterate through `order` in reverse (from index n - 1 down to 0):
   - Let `u = order[i]`.
   - For each child `v` in `adj[u]`:
     - Accumulate: `sub[u - 1] += 1 + sub[v - 1]`.
5. Return the array `sub`.

Complexity: O(n) time because BFS visits each node and edge once, and reverse aggregation takes O(n) steps, and O(n) space for adjacency list, order list, and result array.

## Code walkthrough
In C++, `adj[boss].push_back(emp)` populates the parent-child relationships where `emp = i + 2` and `boss = bosses[i]`.
`vector<int> order` reserves capacity n and initializes with node 1.
We loop `i` from 0 through `(int)order.size()`: pushing children `v` dynamically into `order` completes the BFS traversal without needing an external queue.
In the reverse pass `for (int i = n - 1; i >= 0; i--)`, we extract `u = order[i]`. For each child `v` in `adj[u]`, `sub[u - 1] += 1 + sub[v - 1]` accumulates the child plus all of the child's own subordinates.
Finally, `return sub;` returns 0-indexed subordinate counts for employees 1 to n.

## Test it out loud
- Single employee: n = 1, bosses = []. Loop doesn't execute; `sub[0] = 0`. Returns [0].
- Direct line hierarchy: n = 4, bosses = [1, 2, 3]. 4 has 0, 3 has 1, 2 has 2, 1 has 3. Returns [3, 2, 1, 0].
- Star tree: n = 5, bosses = [1, 1, 1, 1]. All four report directly to 1. Employee 1 has 4 subordinates, all others have 0. Returns [4, 0, 0, 0, 0].
- Balanced binary tree: n = 7, employees distributed evenly across 3 levels. Root has 6, children have 2 each, leaves have 0. Returns [6, 2, 2, 0, 0, 0, 0].

## Follow-ups
- Why use reverse BFS instead of recursive DFS? In languages like Python or deep tree cases (e.g., a degenerate line of 200,000 nodes), recursive DFS can trigger call-stack overflow. Reverse BFS is completely iterative and stack-safe.
- What if we also needed to know the maximum depth of each subtree? The same bottom-up reverse BFS can compute height: `height[u] = 1 + max(height[v])`.
- What if employees can transfer bosses dynamically? We would maintain subtree sizes using dynamic tree structures such as Link-Cut Trees.

## Common mistakes
- Deep recursion stack overflow: a tree of depth 200,000 crashes standard recursion unless the stack limit is significantly increased or an iterative traversal is used.
- Off-by-one with 0-based and 1-based indexing: `bosses[i]` specifies the boss for employee `i + 2`, while the output array maps employee `e` to index `e - 1`.
- Forgetting to add 1 for the child itself: adding only `sub[v - 1]` omits child `v` itself, leading to subordinate counts being 0 everywhere.

## Further reading
- Tree traversals and topological subtree DP
- Tree diameter and centroid decomposition fundamentals
- Avoiding recursion limits in deep graph and tree algorithms
