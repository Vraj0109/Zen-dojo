---
id: cses-array-division
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log(\sum a)) time and O(1) space"
reviewed: false
---

## Clarify first
- What are we dividing? We must partition an array of $n$ positive integers into $k$ contiguous, non-empty subarrays.
- What is the objective? Minimize the maximum subarray sum among the $k$ subarrays.
- Are elements positive? Yes, all elements are strictly positive integers ($\text{arr}[i] \ge 1$).
- What are the constraints? $1 \le k \le n \le 200000$ and $1 \le \text{arr}[i] \le 10^9$.
- Can the subarray sums exceed 32-bit limits? Yes, the sum of all elements can reach $2 \times 10^{14}$, so binary search bounds and running subarray sums must be 64-bit integers (`long long`).

## Examples to say out loud
- Consider `arr = [2, 4, 7, 3, 5]` and $k = 3$:
  - If target maximum is 8:
    - Subarray 1: $[2, 4]$ (sum = 6, adding 7 would make 13 > 8).
    - Subarray 2: $[7]$ (sum = 7, adding 3 would make 10 > 8).
    - Subarray 3: $[3, 5]$ (sum = 8).
    - Subarrays used = 3 $\le 3$. Feasible!
  - If target maximum is 7:
    - $[2, 4]$ (sum 6), $[7]$ (sum 7), $[3]$ (sum 3), $[5]$ (sum 5). Requires 4 subarrays $> 3$. Infeasible!
  - Optimal answer is 8.
- Consider `arr = [1, 2, 3, 4]` and $k = 4$:
  - Each element forms its own subarray: $[1], [2], [3], [4]$. Maximum is $\max(1, 2, 3, 4) = 4$.

## Brute force
A brute-force strategy would test all $\binom{n-1}{k-1}$ ways to place $k-1$ partition dividers between array elements. For $n = 200000$, the number of partitions is astronomically large. Dynamic programming using $DP[i][j]$ takes $O(k \cdot n^2)$ time, which TLEs. Framing this as a binary search on the answer with a greedy feasibility check solves it in $O(n \log(\sum a))$ time.

## The key observation
Consider the decision problem: Can we divide `arr` into at most $k$ contiguous subarrays such that **no subarray has sum exceeding $M$**?
1. Monotonicity: If a maximum sum $M$ is achievable with $\le k$ subarrays, any larger limit $M' > M$ is also achievable. If $M$ is impossible, any smaller limit $M'' < M$ is also impossible.
2. Greedy verification: For a fixed threshold $M$, the optimal way to minimize the number of subarrays is to greedily pack as many consecutive elements as possible into the current subarray before exceeding $M$.
3. Search range: The minimum possible maximum subarray sum cannot be smaller than the largest single element $\max(\text{arr})$ (since every element must belong to some subarray), and cannot exceed the total sum $\sum \text{arr}$ (when $k = 1$).

## Optimal approach
1. Compute the binary search boundaries using 64-bit integers:
   - $\text{lo} = \max_{i}(\text{arr}[i])$.
   - $\text{hi} = \sum_{i} \text{arr}[i]$.
2. Initialize `ans = hi`.
3. While $\text{lo} \le \text{hi}$:
   - Compute `mid = lo + (hi - lo) / 2`.
   - Greedily count required subarrays:
     - Set `count = 1` and `cur = 0`.
     - For each element $x$ in `arr`:
       - If `cur + x > mid`: increment `count` and reset `cur = x`.
       - Else: add $x$ to `cur`.
   - If `count <= k`:
     - Capacity `mid` is feasible. Save `ans = mid` and search lower: `hi = mid - 1`.
   - Else:
     - Capacity `mid` is too small. Search higher: `lo = mid + 1`.
4. Return `ans`.

Complexity:
- Time: $O(n \log(\sum a))$. The binary search takes $\log_2(2 \times 10^{14}) \approx 48$ iterations. Each check scans $n$ elements in $O(n)$ time. For $n = 200000$, $\approx 9.6 \times 10^6$ operations, finishing in under 30 ms.
- Space: $O(1)$ auxiliary space beyond the input array.

## Code walkthrough
- `long long lo = max(arr), hi = sum(arr)`: Bounds the answer space between single largest item and full array sum.
- `int count = 1; long long cur = 0`: Accumulates elements into the active partition.
- `if (cur + x > mid) { count++; cur = x; }`: When the active partition cannot accommodate $x$, begins a new partition starting at $x$.
- `if (count <= k)`: Feasibility check: if packed into $k$ or fewer partitions, any excess partitions can be split arbitrarily without exceeding $mid$.
- `ans = mid; hi = mid - 1`: Moves left to search for a smaller valid maximum.

## Test it out loud
- Test case $1$: `arr = [1, 2, 3, 4, 5]`, $k = 1 \implies \text{lo} = 5, \text{hi} = 15$. Binary search returns 15.
- Test case $2$: `arr = [10, 10, 10, 10]`, $k = 2 \implies [10, 10]$ and $[10, 10]$, max sum = 20.
- Test case $3$: `arr = [1000000000, 1000000000]`, $k = 1 \implies 2000000000$.
- Test case $4$: `arr = [100]`, $k = 1 \implies 100$.

## Follow-ups
- How does this problem relate to LeetCode problems? It is identical to LeetCode 410 (Split Array Largest Sum) and LeetCode 1011 (Capacity To Ship Packages Within D Days).
- What if elements could be negative? Monotonicity breaks because adding an element could decrease the subarray sum, so greedy packing fails; the problem would require dynamic programming.

## Common mistakes
- Starting $\text{lo}$ at 0 or 1 instead of $\max(\text{arr})$: If $mid < \max(\text{arr})$, single elements cannot even fit in a subarray, causing `cur = x` to immediately exceed $mid$ on the next element.
- 32-bit integer overflow: Sum of elements reaches $2 \times 10^{14}$. Using 32-bit `int` wraps around into negative numbers.

## Further reading
- [Binary Search on Predicate on Wikipedia](https://en.wikipedia.org/wiki/Binary_search_algorithm)
