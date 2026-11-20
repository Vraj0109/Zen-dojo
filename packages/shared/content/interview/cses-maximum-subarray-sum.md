---
id: cses-maximum-subarray-sum
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- Must the subarray be contiguous and non-empty? Yes, the subarray must contain at least one element and consist of consecutive elements.
- Can numbers be negative? Yes, values range from $-10^9$ to $10^9$.
- Can the answer exceed 32-bit integer limits? Yes, an array of $200000$ elements each equal to $10^9$ has a maximum sum of $2 \times 10^{14}$, which requires 64-bit integers (`long long`).
- What are the length bounds? $1 \le n \le 200000$.

## Examples to say out loud
- Consider `arr = [-1, 3, -2, 5, 3, -5, 2, 2]`:
  - $i = 0$ (-1): max ending here = -1, max so far = -1.
  - $i = 1$ (3): max ending here = $\max(3, -1 + 3) = 3$, max so far = 3.
  - $i = 2$ (-2): max ending here = $\max(-2, 3 - 2) = 1$, max so far = 3.
  - $i = 3$ (5): max ending here = $\max(5, 1 + 5) = 6$, max so far = 6.
  - $i = 4$ (3): max ending here = $\max(3, 6 + 3) = 9$, max so far = 9.
  - Subarray `[3, -2, 5, 3]` gives 9.
- Edge case: all negative `arr = [-5, -2, -8, -1]`:
  - Because the subarray must be non-empty, we cannot return 0.
  - The maximum sum is the single largest element: -1.

## Brute force
A naive brute-force method would compute the sum of all $\frac{n(n + 1)}{2}$ contiguous subarrays in $O(n^2)$ time with prefix sums, or $O(n^3)$ without prefix sums. For $n = 200000$, $\approx 2 \times 10^{10}$ subarrays would result in a severe Time Limit Exceeded. Kadane's algorithm evaluates the maximum subarray in a single linear pass in $O(n)$ time and $O(1)$ space.

## The key observation
For any index $i$, the maximum sum of a non-empty subarray ending at position $i$ satisfies a simple recurrence:
$$\text{cur}[i] = \max(\text{arr}[i], \text{cur}[i - 1] + \text{arr}[i])$$
If the previous subarray sum $\text{cur}[i - 1]$ is positive, extending it by $\text{arr}[i]$ is better than starting fresh. If $\text{cur}[i - 1]$ is negative or zero, starting a new subarray starting at $\text{arr}[i]$ is strictly better. The global answer is simply the maximum $\text{cur}[i]$ observed across all $i$.

## Optimal approach
1. Initialize `max_so_far = arr[0]` and `cur = arr[0]` using 64-bit integers.
2. Iterate through index $i$ from $1$ to $n - 1$:
   - Update `cur = max((long long)arr[i], cur + arr[i])`.
   - Update `max_so_far = max(max_so_far, cur)`.
3. Return `max_so_far`.

Complexity:
- Time: $O(n)$ as we process each element in the array once in a single linear pass.
- Space: $O(1)$ auxiliary space using two 64-bit integer variables.

## Code walkthrough
- `long long max_so_far = arr[0], cur = arr[0]`: Initializes both local running sum and global best with the first element, correctly supporting arrays of all negative numbers.
- `for (size_t i = 1; i < arr.size(); i++)`: Advances element by element.
- `cur = max((long long)arr[i], cur + arr[i])`: Either resets the subarray to start at `arr[i]` or extends the current running subarray.
- `max_so_far = max(max_so_far, cur)`: Tracks the highest peak across all ending positions.

## Test it out loud
- Test case $1$: `[1, 2, 3, 4, 5]`. All positive $\implies$ whole array sum = 15.
- Test case $2$: `[-10]`. Single negative element $\implies$ returns -10.
- Test case $3$: `[1000000000, 1000000000, 1000000000]`. Exceeds 32-bit limits $\implies$ correctly returns 3000000000.
- Test case $4$: `[-5, -2, -8, -1]`. All negative $\implies$ returns -1.

## Follow-ups
- How to return the start and end indices of the optimal subarray? Track `start`, `temp_start`, and `end`. When `cur` resets to `arr[i]`, update `temp_start = i`. When `cur > max_so_far`, set `start = temp_start` and `end = i`.
- What if the array is circular? The maximum circular subarray sum is either the standard maximum subarray sum or $\text{total\_sum} - \text{minimum\_subarray\_sum}$ (unless all elements are negative).

## Common mistakes
- Initializing `max_so_far = 0`: If all elements are negative (e.g. `[-5, -2, -1]`), initializing to 0 returns 0 instead of -1, violating the non-empty requirement.
- 32-bit integer overflow: The sum of elements can reach $\pm 2 \times 10^{14}$. Using 32-bit `int` wraps around into negative values.

## Further reading
- [Kadane's Algorithm on Wikipedia](https://en.wikipedia.org/wiki/Maximum_subarray_problem)
