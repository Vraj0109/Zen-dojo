---
id: cses-list-removals
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n log n) time, O(n) space"
reviewed: false
---

## Clarify first
- How are removals specified? An array of 1-based indices `positions` where `positions[j]` is the position in the current surviving list.
- Does the list shrink after each deletion? Yes, elements after the deleted position shift left by 1 index.
- What should be returned? An array containing the original values removed, in the order of their removal.
- Are all positions guaranteed to be valid? Yes, constraints state `positions[j]` is between 1 and the current remaining length.
- What are the constraints? Array length n up to 200,000, and values up to 10^9.

## Examples to say out loud
Suppose arr = [2, 6, 1, 4, 2] and positions = [3, 1, 3, 1, 1].
- Removal 1: position 3 in [2, 6, 1, 4, 2] is value 1. Surviving list becomes [2, 6, 4, 2].
- Removal 2: position 1 in [2, 6, 4, 2] is value 2. Surviving list becomes [6, 4, 2].
- Removal 3: position 3 in [6, 4, 2] is value 2. Surviving list becomes [6, 4].
- Removal 4: position 1 in [6, 4] is value 6. Surviving list becomes [4].
- Removal 5: position 1 in [4] is value 4.
Output list of removed values: [1, 2, 2, 6, 4].

## Brute force
Using a dynamic array or vector and calling `.erase()` shifts all subsequent elements to the left on every removal.
Each erasure takes O(n) time.
With n = 200,000 deletions, this quadratic O(n^2) process performs 2 * 10^10 shifts, causing a Time Limit Exceeded error.
Instead of actually shifting array elements, we can maintain surviving presence flags using a Fenwick tree or Segment Tree.

## The key observation
Imagine an indicator array of length n where `present[i] = 1` if element i has not yet been deleted, and `0` once deleted.
The 1-based current rank of element i among surviving elements is exactly the prefix sum of presence flags: `prefix_sum(i)`.
Therefore, asking for the element at current position k is equivalent to finding the smallest original index `idx` such that `prefix_sum(idx) == k`.
Using binary lifting on a Fenwick tree (or binary search), we can find this index in O(log n) time, retrieve `arr[idx - 1]`, and set `present[idx] = 0` (decrementing the Fenwick tree at `idx`).

## Optimal approach
1. Allocate a Fenwick tree `bit` of size n + 1.
2. Initialize every index from 1 to n with 1 (all elements initially present) in O(n) time using Fenwick parent propagation.
3. Find the highest power of 2 less than or equal to n: `top`.
4. For each query rank k in `positions`:
   - Initialize `pos = 0`.
   - For `step = top; step > 0; step >>= 1`:
     - If `pos + step <= n` and `bit[pos + step] < k`:
       - `pos += step`.
       - `k -= bit[pos]`.
   - The target original index is `idx = pos + 1`.
   - Record `arr[idx - 1]` in the output list.
   - Remove the element by decrementing the Fenwick tree at `idx`: for `i = idx; i <= n; i += i & -i`, `bit[i]--`.
5. Return the list of removed values.

Complexity: O(n log n) time because binary lifting and point update each take O(log n) per removal, and O(n) space.

## Code walkthrough
In C++, the linear build `bit[i] += 1; int j = i + (i & -i); if (j <= n) bit[j] += bit[i];` populates the Fenwick tree in O(n) time.
The binary lifting loop directly uses powers of two from `top` down to 1.
If the segment `bit[pos + step]` holds strictly fewer than `k` surviving elements, it means the target lies further to the right, so we add `step` to `pos` and subtract `bit[pos]` from `k`.
When the loop finishes, `pos` is the largest index with prefix sum < k, so `idx = pos + 1` is the exact element with prefix sum == k.
We read `arr[idx - 1]` and then decrement the Fenwick tree along `i += i & -i`.

## Test it out loud
- Single element: arr = [7], positions = [1]. `pos = 0`, `idx = 1`. Returns [7].
- Deleting strictly from the front: arr = [1, 2, 3, 4, 5], positions = [1, 1, 1, 1, 1]. Returns [1, 2, 3, 4, 5].
- Deleting strictly from the back: positions = [5, 4, 3, 2, 1]. Returns [5, 4, 3, 2, 1].
- Alternating deletions: arr = [5, 4, 3, 2, 1], positions = [3, 3, 2, 1, 1]. Position 3 is 3. Remaining [5, 4, 2, 1]. Position 3 is 2. Remaining [5, 4, 1]. Output: [3, 2, 4, 5, 1].

## Follow-ups
- How does binary lifting on Fenwick compare to binary searching prefix sums? Standard binary search calls `query()` at each step, taking O(log^2 n). Binary lifting on the tree directly inspects Fenwick nodes in a single pass of O(log n).
- Can this be done with an order-statistic tree (GNU PBDS)? Yes, `__gnu_pbds::tree` provides `find_by_order` and `erase` in O(log n) time directly.
- What if elements were inserted dynamically as well as removed? Fenwick trees require knowing the maximum index in advance; dynamic insertions at arbitrary ranks require a Treap or balanced BST.

## Common mistakes
- Using `std::vector::erase()`: copying elements on each deletion degrades complexity to O(n^2), timing out for n = 200,000.
- Off-by-one with 0-based and 1-based indexing: `idx` from the Fenwick tree is 1-based, so accessing the original array requires `arr[idx - 1]`.
- Subtracting `k -= bit[pos]` incorrectly: during binary lifting, the count subtracted must correspond to the newly included prefix block at `pos`.

## Further reading
- Binary lifting on Fenwick trees (BIT binary search)
- Order statistic trees and dynamic rank queries
- Fenwick tree construction in linear time
