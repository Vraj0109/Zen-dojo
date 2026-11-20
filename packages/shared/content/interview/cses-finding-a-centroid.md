---
id: cses-finding-a-centroid
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What defines a centroid of a tree? A node such that when it is removed, each resulting connected component has size at most floor(n / 2).
- How many centroids can a tree have? Every tree has at least one and at most two centroids.
- What if there are two centroids? Return the one with the smaller node identifier (1-indexed).
- What are the input constraints? n between 1 and 200,000, edges form an undirected tree.
- Can n = 1? Yes, if n = 1, the single node itself is the centroid.

## Examples to say out loud
Suppose n = 5 with edges (1, 2), (1, 3), (3, 4), and (3, 5).
- Removing node 3 separates the tree into three components: {1, 2} of size 2, {4} of size 1, and {5} of size 1.
- The threshold is floor(5 / 2) = 2. Since all component sizes are <= 2, node 3 is a valid centroid.
- Removing node 1 leaves component {3, 4, 5} of size 3 > 2, so node 1 is not a centroid.
Smallest valid centroid is 3.

Consider a 4-node line graph: 1 - 2 - 3 - 4.
- Removing node 2 leaves component {1} of size 1 and {3, 4} of size 2 <= 2.
- Removing node 3 leaves component {1, 2} of size 2 and {4} of size 1 <= 2.
- Both 2 and 3 are centroids; the problem asks for the smaller index, so return 2.

## Brute force
For each node v from 1 to n:
- Temporarily remove v and run BFS or DFS on the remaining graph to determine the sizes of all connected components.
- If every component size is <= floor(n / 2), return v.
Since each BFS takes O(n) time, testing all n candidate nodes requires O(n^2) time.
With n = 200,000, this requires ~4 * 10^10 operations, causing Time Limit Exceeded.

## The key observation
Arbitrarily root the tree at node 1.
When any node v is removed, the tree breaks into:
1. The subtrees of all children of v.
2. The remaining part of the tree above v, which has size `n - subtree_size[v]`.
Therefore, the largest component after removing v is simply:
`max(max_child_subtree_size[v], n - subtree_size[v])`.
All subtree sizes can be computed in a single bottom-up pass in O(n) total time.

## Optimal approach
1. Build an adjacency list for the tree.
2. Run an iterative BFS starting from root 1:
   - Record parent pointers `par[v]` and the BFS visitation `order`.
   - Using iterative BFS avoids stack overflow on deep paths (up to 200,000 depth).
3. Initialize `sz[v] = 1` and `big[v] = 0` for all nodes.
4. Process nodes in reverse BFS order (from leaves up to the root):
   - For node `v` with parent `p = par[v]`:
     - Accumulate size: `sz[p] += sz[v]`.
     - Update largest child size: `big[p] = max(big[p], sz[v])`.
5. Iterate through candidate nodes `v` from 1 to n:
   - Compute `largest_piece = max(big[v], n - sz[v])`.
   - If `largest_piece <= n / 2`, return `v` immediately (since we iterate in increasing numerical order, the first match is the smallest node index).

Complexity: O(n) time for one BFS and one reverse sweep, and O(n) auxiliary space.

## Code walkthrough
In C++, `order` is a vector that doubles as the BFS queue.
Iterating backwards from index `n - 1` down to 1 ensures that every child's subtree size is fully computed before updating its parent `par[v]`.
`sz[v]` holds the count of nodes in v's subtree, while `big[v]` holds the size of v's largest child subtree.
For the root (node 1), `n - sz[1] = n - n = 0`, so `largest_piece = big[1]`.
Checking from `v = 1` to `n` naturally guarantees finding the smallest centroid index without needing a second pass or sorting.

## Test it out loud
- Single node (n = 1): loop terminates immediately, `max(big[1], 1 - 1) = 0 <= 0`, returns 1.
- Star graph (center 1, leaves 2..n): center 1 splits graph into n - 1 components of size 1 <= n / 2. Node 1 is immediately returned.
- Line graph (1-2-3-4): node 2 splits into components of sizes 1 and 2 <= 2; node 2 is tested before node 3 and returned.
- Deep tree: iterative BFS handles chain of 200,000 nodes without stack overflow.

## Follow-ups
- How does finding a centroid relate to Centroid Decomposition? In Centroid Decomposition, we repeatedly find the centroid of tree components to divide and conquer paths in O(n log n) time.
- Can a tree have more than two centroids? No. If there are two centroids, they are always directly connected by an edge, and removing that edge divides the tree into two equal halves of size n / 2.
- What if we instead walk from root to centroid? Starting at the root, always move to a child whose subtree size exceeds n / 2. When no such child exists, the current node is a centroid.

## Common mistakes
- Recursive DFS stack overflow: recursive calls 200,000 frames deep crash on standard call stacks. BFS + reverse order is stack-safe.
- Forgetting the component above the node: node v's components include `n - sz[v]`, not just its children.
- Returning an arbitrary centroid instead of the minimum indexed one: the problem asks for the smallest index if multiple exist.

## Further reading
- Jordan's Centroid Theorem for trees
- Centroid Decomposition algorithm for tree path queries
- Tree diameter and center properties
