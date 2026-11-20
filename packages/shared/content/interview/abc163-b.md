---
id: abc163-b
pattern: cses-atcoder
difficulty: medium
optimal: "O(m) time, O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? An integer $n$ representing the total number of vacation days, and an array $a$ where $a[i]$ is the number of days required to finish the $i$-th piece of homework.
- How can days be spent? Each day, you can either work on homework or spend the entire day playing. You cannot do both on the same day.
- Must all pieces of homework be completed? Yes, all $m$ homework assignments must be fully completed within the $n$ vacation days.
- What should be returned? The maximum number of days you can spend playing. If it is impossible to finish all homework assignments within $n$ days, return $-1$.
- What are the constraints? $1 \le n \le 1,000,000$, and $1 \le a[i] \le 10,000$ with array length $m \le 10,000$.

## Examples to say out loud
- Consider $n = 41$ and $a = [5, 6]$.
  Total homework days needed: $5 + 6 = 11$.
  $11 \le 41$, so all homework can be finished.
  The remaining days available for playing: $41 - 11 = 30$.
  Result: 30.
- Consider $n = 10$ and $a = [5, 6]$.
  Total days needed: $5 + 6 = 11$.
  $11 > 10$, so the homework cannot be finished in 10 days.
  Result: $-1$.
- Consider $n = 5$ and $a = [5]$.
  Total needed: 5. Days left for playing: $5 - 5 = 0$.
  Result: 0.

## Brute force
Because every piece of homework must be completed and cannot be skipped, the total days spent on homework is completely fixed and equal to $\sum_{i=1}^m a[i]$. There is no scheduling flexibility or optimization of homework order that alters the total days required. Computing the sum of array $a$ in a single linear pass is already optimal.

## The key observation
Since each assignment $i$ requires $a[i]$ days and assignments are executed on distinct days, the total required working days is:
$S = \sum_{i=1}^m a[i]$.
- If $S > n$, the holiday is not long enough to finish all homework: return $-1$.
- If $S \le n$, the remaining days $n - S$ can all be spent playing: return $n - S$.
With $m \le 10,000$ and $a[i] \le 10,000$, the sum $S$ can reach $10^8$. Using a 64-bit integer accumulator prevents any risk of integer overflow.

## Optimal approach
1. Initialize a 64-bit sum accumulator `sum = 0`.
2. Iterate through each element $x$ in array $a$:
   - Add $x$ to `sum`.
3. If `sum > n`, return `-1`.
4. Otherwise, return `(int)(n - sum)`.
5. Complexity:
   - Time Complexity: $O(m)$, where $m$ is the length of array $a$. We inspect each element once.
   - Space Complexity: $O(1)$, using only one scalar accumulator.

## Code walkthrough
- `long long sum = 0;`: Initialize 64-bit integer to prevent overflow during accumulation.
- `for (int x : a) sum += x;`: Sum up the days needed across all homework pieces.
- `return sum > n ? -1 : (int)(n - sum);`: Check feasibility against total vacation days $n$; return remaining play days or -1.

## Test it out loud
- Test 1: $n = 1, a = [1] \to \text{sum} = 1 \le 1 \to 1 - 1 = 0$.
- Test 2: $n = 5, a = [5] \to \text{sum} = 5 \le 5 \to 0$.
- Test 3: $n = 5, a = [6] \to \text{sum} = 6 > 5 \to -1$.
- Test 4: $n = 100, a = [1, 2, 3] \to \text{sum} = 6 \le 100 \to 100 - 6 = 94$.
- Test 5: $n = 30, a = [10, 10, 10] \to \text{sum} = 30 \le 30 \to 0$.

## Follow-ups
- What if each assignment could only be done on specific permitted days (e.g. interval scheduling)?
  This would become a bipartite matching or flow scheduling problem.
- What if you could drop some assignments to maximize play days subject to a minimum score threshold?
  This would become the 0/1 knapsack problem.

## Common mistakes
- Using a 32-bit signed integer for the sum when $m$ and $a[i]$ are large; while $10^8$ fits in a 32-bit int, using `long long` is best practice for sums of large arrays.
- Returning 0 instead of -1 when the homework cannot be finished.
- Returning a negative number when `sum > n` instead of -1.
