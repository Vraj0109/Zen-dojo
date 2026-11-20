---
id: cses-range-queries-and-copies
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + q log n) time, O(n + q log n) space"
reviewed: false
---

## Clarify first
- What operations are performed?
  - Type 1: [1, k, a, x] sets the a-th element of array k to x.
  - Type 2: [2, k, a, b] returns the sum of elements at positions a to b in array k.
  - Type 3: [3, k] clones array k, assigning it the next consecutive array ID.
- Are arrays initially indexed from 1? Yes, the initial array is array 1.
- Do subsequent updates on a cloned array affect the original or other copies? No, each copy is completely independent.
- Can values or sums exceed 32 bits? Yes, array elements are up to 10^9 and n is up to 200,000, so sums reach 2 * 10^14, requiring 64-bit integers.
- What should be returned? An array containing the answers to all type 2 range sum queries in order.

## Examples to say out loud
Suppose initial array 1 is [1, 2, 3, 4] and queries are:
- [2, 1, 1, 4]: sum of array 1 is 1 + 2 + 3 + 4 = 10.
- [3, 1]: clone array 1; this new array becomes array 2.
- [1, 2, 1, 10]: update array 2 at position 1 to 10. Array 2 is now [10, 2, 3, 4].
- [2, 2, 1, 4]: sum of array 2 is 10 + 2 + 3 + 4 = 19.
- [2, 1, 1, 4]: array 1 was untouched, so its sum remains 10.
Output list: [10, 19, 10].

## Brute force
If we explicitly duplicate the full array on each type 3 copy query, each clone takes O(n) time and O(n) space.
With up to 200,000 copy operations, copying 200,000 elements each time requires O(q * n) = 4 * 10^10 operations and tens of gigabytes of RAM, causing Memory Limit Exceeded and Time Limit Exceeded.
A Persistent Segment Tree shares unmodified subtrees across versions, allowing O(1) cloning and O(log n) updates.

## The key observation
Each array can be represented by the root node of a Persistent Segment Tree.
When a copy query [3, k] is issued, we simply duplicate the root pointer of array k: `roots.push_back(roots[k - 1])` in O(1) time!
When an update [1, k, a, x] modifies array k, we do not mutate existing tree nodes in-place.
Instead, we create new nodes only along the root-to-leaf path to position a (path copying), reusing all untouched child pointers from the old version.
This path copying creates only O(log n) new nodes per update, guaranteeing that other arrays sharing those unchanged subtrees remain completely unaffected.

## Optimal approach
1. Represent each segment tree node with left child pointer `L`, right child pointer `R`, and range sum `S`.
2. Build the initial tree over `arr` recursively, returning the root of version 1.
3. Maintain a list of root pointers `roots`, initialized with `[root1]`.
4. Process queries:
   - If type 1 [1, k, a, x]:
     - Call persistent update: `roots[k - 1] = update(roots[k - 1], 0, n - 1, a - 1, x)`.
     - In `update(v, l, r, p, x)`: clone node v, recurse on the child containing p, retain the other child, and set `S = S[new_left] + S[new_right]`.
   - If type 2 [2, k, a, b]:
     - Query range sum: `query(roots[k - 1], 0, n - 1, a - 1, b - 1)`.
     - Append result to answers list.
   - If type 3 [3, k]:
     - Clone array k: `roots.push_back(roots[k - 1])`.
5. Return answers list.

Complexity: O(n + q log n) time (O(n) initial build, O(1) copy, O(log n) update and query), and O(n + q log n) space for persistent nodes.

## Code walkthrough
In C++, parallel vectors `vector<int> L, R; vector<long long> S;` manage tree nodes compactly.
The `newNode(l, r, s)` function allocates node indices incrementally.
In `update`:
- If `l == r`, return `newNode(0, 0, x)`.
- If `p <= m`, recursively update left child `nl = update(nl, ...)`, leaving right child `nr = R[v]` unchanged.
- If `p > m`, recursively update right child, leaving left child unchanged.
- Return `newNode(nl, nr, S[nl] + S[nr])`.
For type 3 queries, `roots.push_back(roots[q[1] - 1])` copies the reference in O(1) time.
For type 2 queries, standard recursive segment tree range summation evaluates the sum in O(log n) time.

## Test it out loud
- Single element array: arr = [9], query [2, 1, 1, 1] gives 9. Copy [3, 1] makes array 2. Update [1, 2, 1, 4] changes array 2 to 4. Query on array 2 gives 4. Query on array 1 still gives 9. Output: [9, 4, 9].
- Chained copies: copy 1 to 2, copy 2 to 3, copy 3 to 4. Updating array 4 leaves arrays 1, 2, and 3 unmodified.
- Overlapping ranges: range queries on subsegments [a, b] correctly decompose into O(log n) canonical persistent nodes.
- 64-bit bounds: node sum `S` uses `long long`, correctly accumulating values up to 2 * 10^14.

## Follow-ups
- How many nodes are allocated in total? Initial build uses 2n nodes. Each update creates at most floor(log2(n)) + 1 approx 18 nodes. With 200,000 updates, total nodes <= 4 * 10^6, which easily fits in ~64 MB.
- Can this support rollback or version history travel? Yes, persistent segment trees natively retain all historical snapshots since no node is ever overwritten.
- What if updates were range updates? Range updates with persistence require lazy propagation or fractional cascading, which requires careful push-down cloning of lazy tags.

## Common mistakes
- Mutating existing nodes in-place: modifying `t[v]` directly corrupts all other arrays sharing that node.
- Copying full arrays on type 3: causes catastrophic O(q * n) time and memory exhaustion.
- 32-bit integer overflow: node sums must use 64-bit `long long` to prevent overflow on large cumulative values.

## Further reading
- Persistent Segment Trees and path copying technique
- Functional data structures and tree sharing
- Range queries with historical versioning
