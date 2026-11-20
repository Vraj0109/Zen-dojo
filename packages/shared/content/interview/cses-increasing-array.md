---
id: cses-increasing-array
pattern: cses-introductory
difficulty: medium
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What operation is permitted? In one move, we can increment any element by $1$.
- Can we decrement elements? No, elements can only be increased.
- What is the goal? To make the array non-decreasing (i.e. $x[i] \ge x[i - 1]$ for all $i \ge 1$) with the minimal total number of increments.
- Can the total number of moves exceed the 32-bit integer limit? Yes, with up to $2 \times 10^5$ elements and values up to $10^9$, descending arrays can require around $2 \times 10^{14}$ operations, requiring a 64-bit integer (`long long`).

## Examples to say out loud
- Consider $x = [3, 2, 5, 1, 7]$:
  - At index 1 ($x[1] = 2$): It is smaller than previous element $3$. We must increment it by $3 - 2 = 1$ move, turning $x[1]$ into $3$. Moves so far = 1.
  - At index 2 ($x[2] = 5$): $5 \ge 3$, valid. Moves remain 1.
  - At index 3 ($x[3] = 1$): It is smaller than previous element $5$. We must increment it by $5 - 1 = 4$ moves, turning $x[3]$ into $5$. Moves so far = 5.
  - At index 4 ($x[4] = 7$): $7 \ge 5$, valid. Moves remain 5.
  - Final total moves: 5.
- Edge case: $x = [5, 4, 3, 2, 1]$:
  - $4 \to 5$ (1 move), $3 \to 5$ (2 moves), $2 \to 5$ (3 moves), $1 \to 5$ (4 moves). Total = $1 + 2 + 3 + 4 = 10$.

## Brute force
Attempting to increment numbers one by one via simulation would take $O(\text{moves})$ time, which would exceed $10^{14}$ operations and result in a severe Time Limit Exceeded. Instead, mathematical greedy calculation computes the required difference at each index in $O(1)$ arithmetic operations.

## The key observation
Because we can only increase elements and every element must be greater than or equal to its predecessor, each element $x[i]$ must be raised to at least $x[i - 1]$. Raising $x[i]$ to anything strictly greater than $x[i - 1]$ would never help future elements (it would only force subsequent elements to be raised even higher). Hence, the locally and globally optimal choice is setting $x[i] = \max(x[i], x[i - 1])$, incurring exactly $\max(0, x[i - 1] - x[i])$ moves.

## Optimal approach
1. Initialize a 64-bit counter `moves = 0`.
2. Iterate through the array from index $1$ to $n - 1$:
   - If $x[i] < x[i - 1]$:
     - Add $x[i - 1] - x[i]$ to `moves`.
     - Update $x[i] = x[i - 1]$.
3. Return `moves`.

Complexity:
- Time: $O(n)$ where $n$ is the length of the array, performing a single pass.
- Space: $O(1)$ auxiliary space if modifying the input array in-place, or $O(n)$ if making a copy.

## Code walkthrough
- `long long moves = 0`: Uses a 64-bit integer accumulator to avoid overflow.
- `for (size_t i = 1; i < x.size(); i++)`: Compares each element with the modified predecessor.
- `if (x[i] < x[i - 1])`: Detects an inversion requiring moves.
- `moves += x[i - 1] - x[i]`: Adds the exact shortfall needed to restore the non-decreasing invariant.
- `x[i] = x[i - 1]`: Updates the current element to its new heightened value so subsequent comparisons use the raised height.

## Test it out loud
- Test case $1$: $x = [1, 2, 3]$. Already non-decreasing; returns 0 moves.
- Test case $2$: $x = [5, 4, 3, 2, 1]$. Inversions at each step; returns 10 moves.
- Test case $3$: $x = [1]$. Single element is trivially non-decreasing; loop skips, returns 0.
- Test case $4$: $x = [10, 1]$. $1$ must be raised to $10$; returns 9 moves.

## Follow-ups
- What if we cannot modify the input array in-place? We can maintain a running variable `prev_max` initialized to $x[0]$. For each element $x[i]$, if $x[i] < \text{prev\_max}$, we add $\text{prev\_max} - x[i]$ to `moves`; otherwise, we update $\text{prev\_max} = x[i]$. This achieves $O(1)$ extra space without modifying the array.
- What if we were also allowed to decrement elements by 1? That transforms the problem into finding a non-decreasing sequence minimizing $L_1$ distance, which can be solved with a slope trick using a priority queue.

## Common mistakes
- 32-bit integer overflow: Accumulating moves in a standard 32-bit signed integer will overflow when differences sum to more than $2 \times 10^9$.
- Not updating the predecessor height: Forgetting `x[i] = x[i - 1]` causes subsequent elements to be compared against the original smaller $x[i]$ rather than the required raised level.
- Starting from index 0: Accessing $x[-1]$ results in an out-of-bounds error.

## Further reading
- [Greedy Algorithms on Wikipedia](https://en.wikipedia.org/wiki/Greedy_algorithm)
