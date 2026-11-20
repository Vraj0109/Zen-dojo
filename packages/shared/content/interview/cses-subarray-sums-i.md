---
id: cses-subarray-sums-i
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the properties of the array elements? All elements in the array are **strictly positive** integers ($\text{arr}[i] \ge 1$).
- What constitutes a subarray? A contiguous, non-empty sequence of elements.
- What should be returned? The total count of subarrays whose elements sum to `target`.
- What are the constraints? $1 \le n \le 200000$ and $1 \le \text{target}, \text{arr}[i] \le 10^9$.

## Examples to say out loud
- Consider `arr = [2, 4, 1, 2, 7]` and `target = 7`:
  - Subarray $[2, 4, 1]$ has sum $2 + 4 + 1 = 7$.
  - Subarray $[7]$ has sum 7.
  - Total valid subarrays = 2 (matches problem statement count).
- Consider `arr = [1, 1, 1, 1]` and `target = 2`:
  - Valid subarrays: $[1, 1]$ at indices $0 \dots 1$, $1 \dots 2$, and $2 \dots 3$.
  - Total count = 3.
- Edge case: no subarray matches $\implies$ return 0.

## Brute force
A brute force approach would test all $\frac{n(n + 1)}{2}$ subarrays. For $n = 200000$, checking $2 \times 10^{10}$ subarrays takes $O(n^2)$ time, causing a severe Time Limit Exceeded. A general hash map with prefix sums solves this in $O(n)$ time and $O(n)$ space, but because all numbers are strictly positive, a two-pointer sliding window solves it in $O(n)$ time and $O(1)$ space.

## The key observation
Because all numbers are strictly positive ($\text{arr}[i] > 0$), the prefix sum and window sum are **strictly monotonic**:
- Expanding the right boundary $r$ strictly increases the window sum.
- Shrinking the left boundary $l$ strictly decreases the window sum.
This monotonicity guarantees that as $r$ increases from $0$ to $n - 1$, the matching left boundary $l$ never needs to move backwards. We can maintain a sliding window $[l, r]$ and adjust $l$ forward whenever the window sum exceeds `target`.

## Optimal approach
1. Initialize pointers `l = 0`, `count = 0`, and a 64-bit running sum `sum = 0`.
2. Iterate `r` from $0$ to $n - 1$:
   - Add $\text{arr}[r]$ to `sum`.
   - While `sum > target` and `l <= r`:
     - Subtract $\text{arr}[l]$ from `sum` and increment `l`.
   - If `sum == target`:
     - Increment `count`.
3. Return `count`.

Complexity:
- Time: $O(n)$ because both `l` and `r` only advance from $0$ to $n - 1$, visiting each element at most twice.
- Space: $O(1)$ auxiliary space using scalar pointers and sum variables.

## Code walkthrough
- `int l = 0, count = 0`: Window left bound and match accumulator.
- `long long sum = 0`: 64-bit accumulator to avoid integer overflow during window expansion.
- `sum += arr[r]`: Extends window to the right.
- `while (sum > target && l <= r) sum -= arr[l++]`: Shrinks window from the left until sum is $\le \text{target}$.
- `if (sum == target) count++`: Records each exact target match.

## Test it out loud
- Test case $1$: `[5, 5, 5]`, target = 5. Each single element hits target $\implies$ count = 3.
- Test case $2$: `[1, 2, 3, 4, 5]`, target = 15. Whole array sum is 15 $\implies$ count = 1.
- Test case $3$: `[10, 20, 30]`, target = 5. Smallest element 10 exceeds target $\implies$ count = 0.
- Test case $4$: `[1000000000]`, target = $10^9$. Single element $\implies$ count = 1.

## Follow-ups
- What if array elements could be zero or negative? Two pointers fails because the window sum is no longer monotonic. We must use a prefix-sum hash map (as in Subarray Sums II).
- What if we needed to find the shortest or longest subarray summing to target? Maintain $\min(r - l + 1)$ or $\max(r - l + 1)$ whenever `sum == target`.

## Common mistakes
- 32-bit integer overflow: Even though each element is $\le 10^9$, summing several elements can exceed $2^{31} - 1$. `sum` must be a 64-bit integer (`long long`).
- Off-by-one in loop condition: Using `l < r` instead of `l <= r` prevents shrinking single-element windows when $\text{arr}[r] > \text{target}$.

## Further reading
- [Two Pointers on Wikipedia](https://en.wikipedia.org/wiki/Two-pointer_technique)
