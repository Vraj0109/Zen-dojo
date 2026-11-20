---
id: cses-permutations
pattern: cses-introductory
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What constitutes a "beautiful" permutation? A permutation of $1, 2, \dots, n$ is beautiful if no two adjacent elements have an absolute difference of $1$.
- What should be returned if no such permutation exists? Return an empty array.
- What specific ordering should we construct? Per the problem statement, list all even numbers in increasing order followed by all odd numbers in increasing order (e.g., for $n = 4$: $[2, 4, 1, 3]$).
- What are the bounds on $n$? $1 \le n \le 10^6$.

## Examples to say out loud
- Consider $n = 5$:
  - Even numbers in ascending order: $[2, 4]$.
  - Odd numbers in ascending order: $[1, 3, 5]$.
  - Combined: $[2, 4, 1, 3, 5]$.
  - Adjacent differences: $|2 - 4| = 2$, $|4 - 1| = 3$, $|1 - 3| = 2$, $|3 - 5| = 2$. None equal 1, valid.
- Edge case: $n = 1$:
  - Array $[1]$ has no adjacent pairs, so it is trivially beautiful. Return $[1]$.
- Edge cases: $n = 2$ and $n = 3$:
  - For $n = 2$, options are $[1, 2]$ and $[2, 1]$, both have difference 1. Impossible, return empty array.
  - For $n = 3$, permutations like $[1, 3, 2]$ or $[2, 1, 3]$ always have adjacent elements differing by 1. Impossible, return empty array.

## Brute force
A brute-force method would generate all $n!$ permutations using backtracking or standard library permutation iterators and verify each until finding a valid one. Generating $n!$ permutations is infeasible even for $n = 12$, and completely impossible for $n = 10^6$. We can solve this constructively in $O(n)$ time.

## The key observation
If we group numbers by parity:
- Any two consecutive even numbers differ by 2 (e.g. $2, 4, 6, \dots$).
- Any two consecutive odd numbers differ by 2 (e.g. $1, 3, 5, \dots$).
The only boundary to check is the junction between the last even number and the first odd number. By placing all even numbers first and all odd numbers second, the junction is between the largest even number $2\lfloor n/2 \rfloor$ and the first odd number $1$. For $n \ge 4$, the largest even number is at least $4$, so the difference at the boundary is at least $4 - 1 = 3 \ne 1$. Thus, the construction is always valid for all $n \ge 4$.

## Optimal approach
1. Handle base cases:
   - If $n = 1$, return $[1]$.
   - If $n = 2$ or $n = 3$, return an empty array.
2. Initialize an output array of capacity $n$.
3. Append all even numbers from $2$ up to $n$ in increments of $2$.
4. Append all odd numbers from $1$ up to $n$ in increments of $2$.
5. Return the resulting array.

Complexity:
- Time: $O(n)$ since each number from $1$ to $n$ is visited and added once.
- Space: $O(n)$ to hold the constructed permutation.

## Code walkthrough
- `if (n == 1) return {1}`: A single element has no adjacent neighbors, trivially valid.
- `if (n == 2 || n == 3) return {}`: No permutation of $\{1, 2\}$ or $\{1, 2, 3\}$ can avoid adjacent numbers differing by 1.
- `for (int i = 2; i <= n; i += 2) out.push_back(i)`: Collects $2, 4, 6, \dots$.
- `for (int i = 1; i <= n; i += 2) out.push_back(i)`: Collects $1, 3, 5, \dots$. The seam between the last even number and $1$ has absolute difference $\ge 3$.

## Test it out loud
- Test case $1$: $n = 1$. Returns $[1]$.
- Test case $2$: $n = 2$. Returns $[]$.
- Test case $3$: $n = 3$. Returns $[]$.
- Test case $4$: $n = 4$. Evens: $[2, 4]$. Odds: $[1, 3]$. Result: $[2, 4, 1, 3]$. Differences are $2, 3, 2$.
- Test case $5$: $n = 6$. Evens: $[2, 4, 6]$. Odds: $[1, 3, 5]$. Seam is $|6 - 1| = 5 \ne 1$.

## Follow-ups
- Could we place odd numbers first instead of evens? If $n$ is odd, placing odds first makes the boundary between $n$ and $2$, which is $n - 2 \ge 3$ for $n \ge 5$. But for $n = 4$, odds are $[1, 3]$ and evens $[2, 4]$, making the seam between $3$ and $2$, which fails because $|3 - 2| = 1$. Thus, even first is universally robust for all $n \ge 4$.
- Can this be generalized to circular permutations where the first and last elements are also adjacent? Yes, with careful parity offset matching if $n \ge 5$.

## Common mistakes
- Failing to handle $n = 2$ and $n = 3$ explicitly: Missing these checks will produce $[2, 1]$ or $[2, 1, 3]$, both of which violate the condition.
- Using 1-based indexing improperly or swapping the evens/odds order: Placing odds first fails on even values of $n$ like $n = 4$ ($[1, 3, 2, 4]$ has $|3 - 2| = 1$).

## Further reading
- [Permutations on Wikipedia](https://en.wikipedia.org/wiki/Permutation)
