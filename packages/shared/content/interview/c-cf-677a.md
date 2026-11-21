---
id: c-cf-677a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- How is the road width determined? Each person walking along the fence takes up a certain width: 1 unit if their height is less than or equal to $h$, or 2 units if their height exceeds $h$.
- Are all friends walking in a single line? Yes, the total required road width is the sum of widths taken by each friend.
- What are the constraints on the number of friends $n$ and the fence height $h$? $n$ and $h$ are between 1 and 1000.
- Can individual heights be zero or negative? No, heights are positive integers between 1 and $2h$.

## Examples to say out loud
- Consider `heights = [4, 5, 14]` with `h = 7`.
  - Friend 1 has height 4: $4 \le 7$, width is 1.
  - Friend 2 has height 5: $5 \le 7$, width is 1.
  - Friend 3 has height 14: $14 > 7$, width is 2.
  Total width = $1 + 1 + 2 = 4$.
- Consider `heights = [1, 1, 1, 1, 1, 1]` with `h = 1`.
  - Every height is $\le 1$, each takes width 1.
  Total width = 6.

## Brute force
Because every friend's width contribution depends purely on whether their individual height exceeds $h$, each friend contributes independently to the sum. There is no combinatorial interaction or choice involved; checking each friend takes $O(1)$ time, making the direct one-pass solution already optimal.

## The key observation
Each friend $i$ contributes:
- $+2$ if $\text{heights}[i] > h$
- $+1$ if $\text{heights}[i] \le h$
The problem reduces to evaluating this condition for every element and accumulating the sum.

## Optimal approach
1. Initialize an accumulator variable `total_width = 0`.
2. Iterate through each height $x$ in the array `heights`:
   - If $x > h$, add 2 to `total_width`.
   - Otherwise, add 1 to `total_width`.
3. Return `total_width`.
4. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the number of friends in `heights`. Each element is inspected once.
   - Space Complexity: $O(1)$, requiring only one integer accumulator.

## Code walkthrough
- `int w = 0;`: Running total for total road width.
- `for (int x : heights)`: Iterate through the height of each friend.
- `w += x > h ? 2 : 1;`: Ternary operator adds 2 if the friend must bend down, or 1 if standing normally.
- `return w;`: Return total road width.

## Test it out loud
- Test 1: `heights = [1], h = 1` $\to 1 \le 1 \to$ width = 1.
- Test 2: `heights = [2], h = 1` $\to 2 > 1 \to$ width = 2.
- Test 3: `heights = [1000], h = 500` $\to 1000 > 500 \to$ width = 2.
- Test 4: `heights = [500, 501], h = 500` $\to 1 + 2 = 3$.
- Test 5: `heights = [1, 2, 3, 4, 5], h = 3` $\to 1+1+1+2+2 = 7$.

## Follow-ups
- Could we express the total width without a conditional branch?
  Yes, every friend takes at least 1 unit of width, plus an extra 1 if taller than $h$. Thus: $\text{total\_width} = n + \sum [x > h]$.
- How would you handle stream processing?
  Maintain the running sum and update by 1 or 2 as each friend's height is streamed in, consuming $O(1)$ auxiliary space.

## Common mistakes
- Misinterpreting the boundary condition: using $\ge h$ instead of $> h$. A friend of height equal to $h$ does NOT need to bend down.
- Unnecessary memory allocations or creating intermediate arrays instead of accumulating in a scalar variable.
