---
id: cses-hotel-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + q log n) time, O(n) space"
reviewed: false
---

## Clarify first
- How are hotels assigned? Each incoming group takes the leftmost hotel that currently has at least the required number of free rooms.
- What happens when a group is placed? The hotel's room count decreases by the group size.
- What if no hotel has enough rooms for a group? Return 0 for that group, and no room counts change.
- Are hotel numbers 1-based? Yes, hotels are numbered 1 to n from left to right.
- What are the constraints on room counts and queries? Up to 200,000 hotels and up to 200,000 arriving groups, with room counts up to 10^9.

## Examples to say out loud
Suppose hotels have rooms [3, 2, 4, 1, 5, 5, 2] and arriving groups need [4, 4, 7, 1] rooms:
- Group 1 needs 4 rooms: hotels 1 (3) and 2 (2) do not fit. Hotel 3 has 4 rooms. Hotel 3 is chosen (output 3). Remaining rooms at hotel 3 become 0.
- Group 2 needs 4 rooms: hotels 1 to 4 have < 4 rooms. Hotel 5 has 5 rooms. Hotel 5 is chosen (output 5). Remaining rooms at hotel 5 become 1.
- Group 3 needs 7 rooms: no hotel has >= 7 rooms. Output 0.
- Group 4 needs 1 room: leftmost hotel with >= 1 room is hotel 1 (has 3). Output 1. Remaining rooms at hotel 1 become 2.
Output list: [3, 5, 0, 1].

## Brute force
For each group, perform a linear scan from hotel 1 to n to find the first hotel with `rooms[i] >= r`.
In the worst case, each group scans all n hotels, taking O(n) per group.
For 200,000 groups and 200,000 hotels, this takes O(q * n) = 4 * 10^10 operations, leading to a Time Limit Exceeded error.
Using a Segment Tree with range maximum queries and tree descent solves each group query in O(log n) time.

## The key observation
If we maintain a Segment Tree over the hotel room counts where each node stores the maximum room count in its subtree, the root node immediately tells us if any hotel in the entire row has at least r rooms (`root.max >= r`).
To find the leftmost hotel with >= r rooms, we descend the tree:
- If the left child's maximum is >= r, the leftmost qualifying hotel is guaranteed to lie in the left subtree; descend left.
- Otherwise, descend right.
Once reaching the leaf, we subtract r from its room count and propagate the updated maximum back up the tree.

## Optimal approach
1. Round array size n up to the smallest power of two `sz >= n`.
2. Allocate a segment tree array `t` of size 2 * sz initialized to 0.
3. Place initial room counts in leaves: `t[sz + i] = rooms[i]` for i from 0 to n - 1.
4. Build tree bottom-up: for i from sz - 1 down to 1, set `t[i] = max(t[2 * i], t[2 * i + 1])`.
5. For each group needing r rooms:
   - If `t[1] < r`, no hotel can accommodate the group; record 0.
   - Otherwise, initialize node pointer `p = 1`.
   - While `p < sz` (internal node):
     - If `t[2 * p] >= r`, set `p = 2 * p` (go left).
     - Else, set `p = 2 * p + 1` (go right).
   - At leaf `p`: decrement `t[p] -= r`.
   - Record hotel index `p - sz + 1`.
   - Walk up to the root: for `p >>= 1; p >= 1; p >>= 1`, update `t[p] = max(t[2 * p], t[2 * p + 1])`.
6. Return the recorded hotel numbers.

Complexity: O(n + q log n) time (O(n) tree construction and O(log n) descent per group), and O(n) space.

## Code walkthrough
In C++, `sz` is computed using bit shifts `while (sz < n) sz <<= 1`.
The segment tree `t(2 * sz, 0)` is sized to power of two, making binary tree navigation symmetric.
The root check `if (t[1] < r)` provides an immediate O(1) rejection when no hotel has enough capacity.
The descent loop `while (p < sz) p = (t[2 * p] >= r) ? 2 * p : 2 * p + 1;` greedily chooses the left branch whenever sufficient capacity exists, ensuring the leftmost property.
At the leaf, `ans.push_back(p - sz + 1)` translates tree leaf index to 1-based hotel index.
The update loop `p >>= 1` recomputes maximums along the ancestor chain in O(log n) time.

## Test it out loud
- Single hotel: rooms = [5], groups = [5, 1]. First group takes hotel 1, leaves 0 rooms. Second group finds 0 < 1, returns 0. Output: [1, 0].
- Exhaustion: rooms = [1, 1], groups = [2, 1, 1, 1]. Group needing 2 fails (0). First 1 takes hotel 1. Second 1 takes hotel 2. Fourth group finds no rooms left (0). Output: [0, 1, 2, 0].
- Ties resolved to leftmost: rooms = [10, 10, 10], groups = [10, 10, 10, 10]. First group takes hotel 1, second takes hotel 2, third takes hotel 3, fourth returns 0. Output: [1, 2, 3, 0].
- Large values: rooms up to 10^9 fit comfortably in 32-bit signed integers.

## Follow-ups
- How does segment tree descent compare to binary lifting? Tree descent finds the index in a single O(log n) walk. Binary search with separate range maximum queries would take O(log^2 n).
- What if groups could be split across multiple hotels? That would be a different scheduling/fractional knapsack problem.
- What if hotels can have rooms added dynamically? The same segment tree supports point additions (`t[p] += r`) followed by recomputing ancestors.

## Common mistakes
- Descending right when left child has capacity: to guarantee the leftmost hotel, we must test `t[2 * p] >= r` first and prefer left.
- Using size 2n instead of power-of-two rounding in iterative descent: rounding to power of two `sz` ensures all leaves lie at depth >= sz, avoiding uneven tree levels during `while (p < sz)`.
- Forgetting to update ancestor maximums after decrementing rooms: failing to update parents will allow future queries to see outdated capacities.

## Further reading
- Segment Tree descent (walking on a Segment Tree)
- Dynamic point updates with range maximum queries
- First element meeting condition in logarithmic time
