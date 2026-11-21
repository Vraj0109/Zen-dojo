---
id: c-cf-231a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What does each row represent? (Each row contains three integers representing the confidence of three friends on a single problem, where 1 means sure and 0 means not sure).
- When does the team solve a problem? (The team solves a problem if and only if at least two of the three friends are sure about the solution).
- What are the constraints on the number of problems? (`1 <= rows.length <= 1000`, with each row having exactly three entries, each 0 or 1).
- What should be returned? (The total count of problems that the team will solve).

## Examples to say out loud

- Standard case: `rows = [[1, 1, 0], [1, 1, 1], [1, 0, 0]]`.
  - Problem 1: `1 + 1 + 0 = 2 >= 2` $\implies$ solved.
  - Problem 2: `1 + 1 + 1 = 3 >= 2` $\implies$ solved.
  - Problem 3: `1 + 0 + 0 = 1 < 2` $\implies$ not solved.
  - Total solved: 2.
- Unanimous rejection: `rows = [[1, 0, 0], [0, 1, 0]]`.
  - Problem 1 has sum 1, Problem 2 has sum 1. Neither reaches 2. Total solved: 0.
- All sure: `rows = [[1, 1, 1]]`. Sum is 3. Total solved: 1.

## Brute force

A brute-force strategy would iterate through each problem row, count how many 1s appear by checking all three elements individually with conditional statements, and increment a problem counter if the count is at least 2. Because each row contains only 3 elements, checking them one by one already runs in $O(1)$ time per row and $O(n)$ overall.

## The key observation

Because each friend's answer is either 0 or 1, the number of friends sure about problem $i$ is simply the arithmetic sum of the three values in that row: $r[0] + r[1] + r[2]$. The problem is solved if and only if this sum is at least 2: $r[0] + r[1] + r[2] \ge 2$. We iterate through all rows and count how many rows satisfy this condition.

## Optimal approach

1. Initialize a counter `count = 0`.
2. For each row `r` in `rows`:
   - Compute the sum: `s = r[0] + r[1] + r[2]`.
   - If `s >= 2`, increment `count`.
3. Return `count`.

Complexity:
- Time: `O(n)` where $n$ is the number of problems (`rows.length`). Summing 3 integers takes $O(1)$ operations per row.
- Space: `O(1)` auxiliary space as we only use a scalar counter without allocating memory.

## Code walkthrough

In the reference implementation:
- `int count = 0;`: maintains the number of problems the team will attempt.
- `for (auto& r : rows)`: iterates through each contest problem in order.
- `if (r[0] + r[1] + r[2] >= 2) count++;`: adds the three boolean flags and checks whether the majority threshold of 2 is met.
- `return count;`: returns the final number of solved problems.

## Test it out loud

- `rows = [[0, 0, 0]]`:
  - Sum is 0, which is $< 2$. Returns 0.
- `rows = [[1, 1, 1]]`:
  - Sum is 3, which is $\ge 2$. Returns 1.
- `rows = [[0, 1, 1], [1, 0, 1], [1, 1, 0]]`:
  - Each row has exactly two 1s, summing to 2.
  - All 3 problems are solved. Returns 3.
- `rows = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]`:
  - Each row has only one 1, summing to 1. Returns 0.

## Follow-ups

- What if there are $m$ friends instead of 3 and the threshold is $k$?
  We sum all $m$ entries in the row in $O(m)$ time and check whether $\sum_{j=0}^{m-1} r[j] \ge k$, running in $O(n \times m)$ time overall.
- What if inputs are packed as bitmasks?
  If each row is represented as a single integer, we can use `__builtin_popcount(row) >= 2` to test the condition in a single CPU cycle.

## Common mistakes

- Requiring unanimous agreement (checking if sum is 3 instead of at least 2).
- Off-by-one errors in row indexing.
- Creating temporary copies of large vectors instead of iterating by reference.

## Further reading

- Majority vote algorithms and threshold logic.
- Bitwise population count (`__builtin_popcount`) for binary feature summation.
