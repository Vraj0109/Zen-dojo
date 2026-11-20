---
id: cses-two-sets-ii
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n \times \text{target}) time and O(\text{target}) space"
reviewed: false
---

## Clarify first
- What are we partitioning? The set of integers $\{1, 2, \dots, n\}$ into two disjoint subsets of equal sum.
- Are partitions ordered or unordered? The two subsets are **unordered**. For example, $\{1, 4\}$ and $\{2, 3\}$ is the same division as $\{2, 3\}$ and $\{1, 4\}$, counted only **once**.
- What should be returned if no equal sum partition is possible? Return 0.
- What modulo is required? Modulo $10^9 + 7$.
- What are the constraints? $1 \le n \le 500$.

## Examples to say out loud
- Consider $n = 7$:
  - Total sum = $\frac{7 \times 8}{2} = 28$.
  - Target sum for each subset = $14$.
  - The 4 valid unordered partitions are:
    - $\{1, 6, 7\}$ and $\{2, 3, 4, 5\}$
    - $\{2, 5, 7\}$ and $\{1, 3, 4, 6\}$
    - $\{3, 4, 7\}$ and $\{1, 2, 5, 6\}$
    - $\{1, 2, 4, 7\}$ and $\{3, 5, 6\}$
  - Result: 4.
- Consider $n = 4$:
  - Total sum = $10$. Target = 5.
  - The unique partition is $\{1, 4\}$ and $\{2, 3\}$. Result: 1.
- Edge case: $n = 1$:
  - Total sum = 1 (odd) $\implies$ impossible, returns 0.
- Edge case: $n = 2$:
  - Total sum = 3 (odd) $\implies$ returns 0.

## Brute force
A brute-force solution would check all $2^n$ subsets of $\{1, \dots, n\}$ and count how many sum to $\frac{\text{total}}{2}$, then divide by 2. For $n = 500$, $2^{500}$ is unfathomably large. 0/1 knapsack dynamic programming computes the count of subsets summing to $\text{target}$ in $O(n \times \text{target})$ time.

## The key observation
First, a partition is possible if and only if the total sum $\frac{n(n + 1)}{2}$ is even. If odd, return 0.
Second, to count unordered pairs of subsets without dividing by 2 modulo $10^9 + 7$ (or taking modular inverse of 2):
Notice that in any valid partition of $\{1, 2, \dots, n\}$, the element $n$ must belong to exactly one of the two subsets.
If we **fix element $n$** to always belong to the second subset, then the first subset must be formed exclusively from elements $\{1, 2, \dots, n - 1\}$ such that their sum equals $\text{target} = \frac{\text{total}}{2}$.
Because element $n$ is never in the first subset, every valid unordered partition corresponds to **exactly one** subset of $\{1, \dots, n - 1\}$ that sums to $\text{target}$!
This completely eliminates double-counting and the need for modular division.

## Optimal approach
1. Compute $\text{total} = \frac{n(n + 1)}{2}$.
2. If $\text{total} \pmod 2 \ne 0$, return 0.
3. Set $\text{target} = \text{total} / 2$.
4. Allocate an array `dp` of size $\text{target} + 1$ initialized to 0, with $\text{dp}[0] = 1$.
5. For each integer $i$ from $1$ up to $n - 1$:
   - For $j$ from $\text{target}$ down to $i$:
     - $\text{dp}[j] = (\text{dp}[j] + \text{dp}[j - i]) \pmod{10^9 + 7}$.
6. Return $\text{dp}[\text{target}]$.

Complexity:
- Time: $O(n \times \text{target})$. With $n \le 500$, $\text{target} \approx \frac{500 \times 501}{4} \approx 62625$. Total operations $\approx 500 \times 62625 / 2 \approx 1.5 \times 10^7$, running in $\approx 25$ ms in C++.
- Space: $O(\text{target})$ auxiliary space using a 1D DP table of size $\approx 63000$ integers ($\approx 250$ KB).

## Code walkthrough
- `if (total % 2 != 0) return 0`: Parity check: odd sums cannot be split into two equal integer halves.
- `int target = total / 2`: The required sum for each subset.
- `for (int i = 1; i < n; i++)`: Iterates only up to $n - 1$, fixing element $n$ in the opposing set to avoid double-counting.
- `for (int j = target; j >= i; j--)`: 0/1 knapsack backward iteration ensuring each number from $1 \dots n - 1$ is used at most once.
- `dp[j] = (dp[j] + dp[j - i]) % MOD`: Accumulates valid subset configurations.

## Test it out loud
- Test case $1$: $n = 1 \implies$ total 1 is odd, returns 0.
- Test case $2$: $n = 3 \implies$ total 6, target 3. Loop over $i \in \{1, 2\}$: subset $\{1, 2\}$ sums to 3. Returns 1.
- Test case $3$: $n = 4 \implies$ total 10, target 5. Loop over $i \in \{1, 2, 3\}$: subset $\{2, 3\}$ sums to 5. Returns 1.
- Test case $4$: $n = 7 \implies$ total 28, target 14. Loop over $i \in 1 \dots 6$ gives $\text{dp}[14] = 4$.

## Follow-ups
- What if we ran the loop up to $n$ instead of $n - 1$? Then each unordered partition would be counted twice (once when the first set has sum $\text{target}$, and once when the second set has sum $\text{target}$). We would have to multiply by the modular inverse of 2: $\text{dp}[\text{target}] \times 2^{-1} \pmod{10^9 + 7} = \text{dp}[\text{target}] \times 500000004 \pmod{10^9 + 7}$. Running to $n - 1$ is simpler and faster.
- What if $n = 500$ and we also required the two sets to have equal size? Add an extra dimension for subset cardinality: $\text{dp}[j][k]$.

## Common mistakes
- Iterating $i$ up to $n$ and forgetting to divide by 2: Counts both $\{A, B\}$ and $\{B, A\}$, doubling the correct answer.
- Iterating $j$ forward: Running $j$ from $i$ up to $\text{target}$ allows elements to be reused infinitely (unbounded knapsack), which violates the set partition constraint.
- 32-bit integer overflow during $n(n + 1) / 2$: For $n = 500$, $500 \times 501 / 2$ fits in 32 bits, but using `1LL` is good practice.

## Further reading
- [Partition Problem and 0/1 Knapsack on Wikipedia](https://en.wikipedia.org/wiki/Partition_problem)
