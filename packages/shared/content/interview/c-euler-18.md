---
id: c-euler-18
pattern: cses-euler
difficulty: medium
optimal: "O(n^2) time, O(n) space"
brute: same
reviewed: false
---

## Clarify first
- What shape is the input? A triangular array of numbers where row $i$ has $i + 1$ elements ($0$-indexed).
- What moves are permitted? Starting at the apex `triangle[0][0]`, from position $(i, j)$ in row $i$ you may only move to $(i + 1, j)$ or $(i + 1, j + 1)$ in row $i + 1$.
- What is the objective? Find the maximum total sum along any path from the top row to the bottom row.
- What are the constraints? Number of rows $n$ is up to 1000, and numbers are non-negative integers up to 99.

## Examples to say out loud
- Consider the 4-row triangle:
  ```
     3
    7 4
   2 4 6
  8 5 9 3
  ```
  Starting at 3, choosing 7 gives 10; then choosing 4 gives 14; then choosing 9 gives $14 + 9 = 23$.
  Path: $3 \to 7 \to 4 \to 9$, total sum is 23.
- Edge case: 1 row `[[5]]`. Total is 5.
- Edge case: `[[0]]`. Total is 0.

## Brute force
A brute force recursive search explores all paths from the apex to the base. At each step, there are 2 choices, leading to $2^{n - 1}$ distinct paths. For $n = 15$ this is $2^{14} = 16384$ paths, but for $n = 1000$, $2^{999}$ is astronomically large and will never terminate. We need dynamic programming.

## The key observation
Notice optimal substructure: for any position $(i, j)$, the maximum sum achievable from that position down to the bottom depends only on the values at $(i+1, j)$ and $(i+1, j+1)$.
Specifically:
$\text{best}(i, j) = \text{triangle}[i][j] + \max(\text{best}(i + 1, j), \text{best}(i + 1, j + 1))$.
Working bottom-up from row $n - 2$ up to row $0$, every decision reduces to picking the larger of two adjacent entries directly below it. This collapses the exponential branching into an $O(n^2)$ dynamic program requiring only a single 1D array of size $n$.

## Optimal approach
1. Let $n$ be the number of rows in the triangle.
2. Initialize a 1D array `dp` with the values of the bottom row: `dp = triangle[n - 1]`.
3. Loop row index $i$ backward from $n - 2$ down to $0$:
   - For each column index $j$ from $0$ up to $i$:
     - Update `dp[j] = triangle[i][j] + max(dp[j], dp[j + 1])`.
4. After processing the top row ($i = 0$), `dp[0]` contains the maximum path sum from apex to bottom.
5. Return `dp[0]`.
6. Complexity:
   - Time Complexity: $O(n^2)$, where $n$ is the number of rows. Total additions performed: $\sum_{i=1}^{n-1} i = \frac{n(n-1)}{2} = O(n^2)$.
   - Space Complexity: $O(n)$ auxiliary space to store the 1D DP row of length $n$.

## Code walkthrough
- `int n = triangle.size();`: Determine triangle height.
- `vector<int> d = triangle[n - 1];`: Copy the bottom row as base cases for DP.
- `for (int i = n - 2; i >= 0; i--)`: Sweep upward row by row.
- `d[j] = triangle[i][j] + max(d[j], d[j + 1]);`: Overwrite `d[j]` with the maximum sum achievable through either left or right child.
- `return d[0];`: Apex accumulated result.

## Test it out loud
- Test 1: `triangle = [[[5]]]` $\to n = 1$, loop does not run $\to$ returns 5.
- Test 2: `triangle = [[[1], [1, 1]]]` $\to$ row 0: $1 + \max(1, 1) = 2 \to$ returns 2.
- Test 3: `triangle = [[[99], [0, 0], [0, 0, 0]]]` $\to$ bottom row zeros collapse upward to $99 \to$ returns 99.
- Test 4: `triangle = [[[1], [2, 3], [3, 2, 1]]]` $\to$ row 1: $2 + \max(3, 2) = 5$, $3 + \max(2, 1) = 5$; row 0: $1 + \max(5, 5) = 6 \to$ returns 6.

## Follow-ups
- How would you reconstruct the actual path of numbers that achieved this maximum?
  Store choices in a 2D choice table `choice[i][j] = (d[j+1] > d[j] ? 1 : 0)`. Then trace from $(0, 0)$ downwards following the chosen branch at each step.
- What if the triangle values can be negative?
  The same recurrence $\text{best}(i, j) = \text{triangle}[i][j] + \max(\text{best}(i+1, j), \text{best}(i+1, j+1))$ remains strictly valid because subproblem optimality does not depend on positivity.

## Common mistakes
- Running top-down without memoization, resulting in exponential $O(2^n)$ time limit exceeded.
- Attempting a greedy top-down choice (always picking the larger adjacent number on the next row). Greedy fails because a smaller immediate choice can lead to massive values further down.
- Array out-of-bounds in 1D DP: forgetting that row $i$ has $i + 1$ elements, so column $j$ accesses $j$ and $j + 1$.
