---
id: cses-dice-combinations
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the dice outcomes? A standard 6-sided die produces outcomes from $\{1, 2, 3, 4, 5, 6\}$.
- Does the order of throws matter? Yes, sequences with the same numbers in different orders (e.g. $1 + 2$ and $2 + 1$) are considered distinct.
- What modulo is required? Modulo $10^9 + 7$.
- What is the range of $n$? $1 \le n \le 10^6$.

## Examples to say out loud
- Consider $n = 3$:
  - Valid sequences:
    - Three rolls: $1 + 1 + 1$
    - Two rolls: $1 + 2$, $2 + 1$
    - One roll: $3$
  - Total ways = 4.
- Consider $n = 1$:
  - Only $[1] \implies 1$ way.
- Consider $n = 4$:
  - Ways = $1 + 1 + 1 + 1$, $1 + 1 + 2$, $1 + 2 + 1$, $2 + 1 + 1$, $1 + 3$, $3 + 1$, $2 + 2$, $4$. Total = 8.
  - Notice that for $n \le 6$, the number of ways is $2^{n - 1}$.

## Brute force
A brute-force solution would use recursion to branch over all 6 possible die rolls at each step until the sum reaches or exceeds $n$. Because the branching factor is 6, recursion visits $O(6^n)$ states, which will blow the call stack and TLE even for $n = 20$. Dynamic programming memoizes subproblems to compute the answer in linear $O(n)$ time.

## The key observation
Consider the very last roll of the die that brings the total sum to $i$.
The last roll $d$ can be any value from $\{1, 2, 3, 4, 5, 6\}$ such that $d \le i$.
Before making this last roll $d$, the preceding rolls must have summed to exactly $i - d$.
By the Law of Total Probability (sum rule of combinatorics), the total number of ways to reach sum $i$ is:
$$\text{dp}[i] = \sum_{d=1}^6 \text{dp}[i - d] \pmod{10^9 + 7}$$
Base case: $\text{dp}[0] = 1$ (there is exactly 1 way to form sum 0: making zero rolls).

## Optimal approach
1. Define modulo $M = 1000000007$.
2. Allocate an array `dp` of size $n + 1$ initialized to 0.
3. Set base case: `dp[0] = 1`.
4. Iterate $i$ from $1$ to $n$:
   - For die outcome $d$ from $1$ to $6$:
     - If $i \ge d$, add $\text{dp}[i - d]$ to $\text{dp}[i]$ modulo $M$.
5. Return `dp[n]`.

Complexity:
- Time: $O(n)$ because we perform at most 6 additions for each state $i$ from $1$ to $n$ ($6n$ operations total, completing in $\approx 5$ ms for $n = 10^6$).
- Space: $O(n)$ to store the DP table (can be optimized to $O(1)$ by keeping only the last 6 values in a sliding buffer).

## Code walkthrough
- `const int MOD = 1e9 + 7`: Modulo arithmetic constant.
- `vector<int> dp(n + 1, 0); dp[0] = 1`: DP state array with the 0-sum boundary condition.
- `for (int i = 1; i <= n; i++)`: Computes combinations for each target sum in increasing order.
- `for (int d = 1; d <= 6; d++)`: Evaluates transitions from all 6 possible previous states.
- `dp[i] = (dp[i] + dp[i - d]) % MOD`: Accumulates ways with modular reduction.

## Test it out loud
- Test case $1$: $n = 1 \implies \text{dp}[1] = \text{dp}[0] = 1$.
- Test case $2$: $n = 2 \implies \text{dp}[2] = \text{dp}[1] + \text{dp}[0] = 1 + 1 = 2$.
- Test case $3$: $n = 3 \implies \text{dp}[3] = 2 + 1 + 1 = 4$.
- Test case $4$: $n = 7 \implies \text{dp}[7] = \text{dp}[6] + \dots + \text{dp}[1] = 32 + 16 + 8 + 4 + 2 + 1 = 63$.

## Follow-ups
- How to achieve $O(1)$ space? Since $\text{dp}[i]$ only depends on the previous 6 states ($\text{dp}[i-1] \dots \text{dp}[i-6]$), maintain a circular buffer of size 6.
- What if $n = 10^{18}$? The linear recurrence $\text{dp}[i] = \sum_{d=1}^6 \text{dp}[i - d]$ can be represented as a $6 \times 6$ companion matrix. Using binary matrix exponentiation, $\text{dp}[n]$ can be computed in $O(6^3 \log n)$ time.

## Common mistakes
- Forgetting `dp[0] = 1`: Initializing `dp[0] = 0` causes all subsequent DP entries to evaluate to 0.
- Off-by-one in modulo: Summing all 6 terms without intermediate modulo or using 64-bit integer arithmetic can cause 32-bit signed integer overflow before the modulo operator.

## Further reading
- [Linear Recurrence Relations on Wikipedia](https://en.wikipedia.org/wiki/Linear_recurrence_with_constant_coefficients)
