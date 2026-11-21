---
id: c-cf-617a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the starting and ending positions? The elephant starts at coordinate 0 on a 1D line and wants to reach coordinate $x$.
- What step sizes are permitted? In each step, the elephant can move forward by 1, 2, 3, 4, or 5 units.
- Can the elephant move backward? No, all steps are positive forward steps.
- What should be returned? The minimum number of steps required to reach exactly coordinate $x$.
- What are the constraints on $x$? $1 \le x \le 1,000,000$.

## Examples to say out loud
- Consider $x = 5$.
  A single step of length 5 reaches position 5.
  Result: 1.
- Consider $x = 12$.
  - Step 1: move 5 units $\to$ position 5.
  - Step 2: move 5 units $\to$ position 10.
  - Step 3: move 2 units $\to$ position 12.
  Total steps: 3.
  Notice that $\lceil 12 / 5 \rceil = 3$.
- Consider $x = 4$.
  One step of length 4 reaches 4 $\to$ result is 1.

## Brute force
A simulation approach repeatedly takes steps of size 5 while $x \ge 5$, then takes one final step for any remaining distance ($x \pmod 5$). For $x = 1,000,000$, this takes 200,000 loop steps. However, a single integer division formula computes the answer in $O(1)$ time.

## The key observation
To minimize the total number of steps, the elephant should greedily maximize the distance covered in each step by choosing the largest available step size, 5.
If $x$ is a multiple of 5, the elephant needs exactly $x / 5$ steps of size 5.
If $x$ is not a multiple of 5, the remainder $x \pmod 5 \in \{1, 2, 3, 4\}$ can be covered by a single remaining step of that exact size.
Therefore, the minimum number of steps is the ceiling division:
$\text{steps} = \lceil \frac{x}{5} \rceil$.
Using integer arithmetic with truncation towards zero:
$\lceil \frac{x}{5} \rceil = \lfloor \frac{x + 4}{5} \rfloor$.

## Optimal approach
1. Compute the ceiling division using integer arithmetic: `(x + 4) / 5`.
2. Return the result.
3. Complexity:
   - Time Complexity: $O(1)$, exactly one addition and one integer division.
   - Space Complexity: $O(1)$, no extra memory.

## Code walkthrough
- `int minStepsToFriend(int x)`: Function accepting friend's coordinate $x$.
- `return (x + 4) / 5;`: Compute ceiling division of $x$ by the maximum step size 5 using integer arithmetic.

## Test it out loud
- Test 1: $x = 1 \to (1 + 4) / 5 = 5 / 5 = 1$.
- Test 2: $x = 4 \to (4 + 4) / 5 = 8 / 5 = 1$.
- Test 3: $x = 5 \to (5 + 4) / 5 = 9 / 5 = 1$.
- Test 4: $x = 6 \to (6 + 4) / 5 = 10 / 5 = 2$.
- Test 5: $x = 10 \to (10 + 4) / 5 = 14 / 5 = 2$.
- Test 6: $x = 1000000 \to (1000004) / 5 = 200000$.

## Follow-ups
- What if the allowed step sizes were an arbitrary set of integers $\{s_1, s_2, \dots, s_k\}$?
  If the steps do not contain 1 or do not permit a greedy choice, this becomes the classic Coin Change problem solved via BFS (shortest path on an unweighted DAG) or dynamic programming.
- What if $x$ could be up to $10^{18}$?
  The formula `(x + 4) / 5` using 64-bit integers (`long long`) works identically without any risk of overflow.

## Common mistakes
- Using standard integer division `x / 5` without handling the remainder, giving 2 steps instead of 3 for $x = 12$.
- Running a subtraction loop in $O(x)$ time instead of using integer division.
- Floating-point precision truncation when using `ceil((double)x / 5)`.
