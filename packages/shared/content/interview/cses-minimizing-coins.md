---
id: cses-minimizing-coins
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n \times target) time and O(target) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of $n$ distinct positive coin denominations, and an integer `target`.
- How many times can each coin denomination be used? Unlimited times (unbounded coin change).
- What is the objective? Find the minimum total number of coins needed to form `target`.
- What should be returned if it is impossible to form `target`? Return -1.
- What are the constraints? $1 \le n \le 100$, $1 \le \text{target} \le 10^6$, and $1 \le \text{coins}[i] \le 10^6$.

## Examples to say out loud
- Consider `coins = [1, 5, 7]` and `target = 11`:
  - 11 can be formed as $5 + 5 + 1$ (3 coins).
  - Can it be formed with 2 coins? Possible pairs: $7+7=14, 7+5=12, 7+1=8, 5+5=10, 5+1=6, 1+1=2$. None equal 11.
  - Minimal coins = 3.
- Consider `coins = [3, 5]` and `target = 4`:
  - Smallest positive sums formable are 3, 5, 6, 8, etc. Sum 4 cannot be formed.
  - Return -1.
- Edge case: `coins = [2, 4, 6]`, `target = 7`:
  - All coins are even; target is odd $\implies$ impossible, returns -1.

## Brute force
A brute-force solution would perform a depth-first search (DFS) over coin choices to find the minimum depth reaching `target`. In the worst case (with coin 1), recursion depth is $10^6$ with branching factor up to 100, resulting in exponential $100^{10^6}$ states and stack overflow. Unbounded knapsack dynamic programming evaluates all subproblems in bottom-up order in $O(n \times \text{target})$ time.

## The key observation
Let $\text{dp}[x]$ represent the minimum number of coins needed to form sum $x$.
To form sum $x$, the last coin used must be some denomination $c \in \text{coins}$ with $c \le x$.
The optimal number of coins to form the remaining sum $x - c$ is $\text{dp}[x - c]$.
Therefore, the optimal substructure is:
$$\text{dp}[x] = \min_{c \in \text{coins}, c \le x} (\text{dp}[x - c] + 1)$$
Base case: $\text{dp}[0] = 0$ (0 coins needed for sum 0), and all other $\text{dp}[x] = \infty$.

## Optimal approach
1. Define a large constant $\text{INF} = 10^9$.
2. Allocate an array `dp` of size $\text{target} + 1$ filled with $\text{INF}$.
3. Set base case: `dp[0] = 0`.
4. Iterate $i$ from $1$ to `target`:
   - For each coin $c$ in `coins`:
     - If $i \ge c$ and $\text{dp}[i - c] \ne \text{INF}$:
       - Update $\text{dp}[i] = \min(\text{dp}[i], \text{dp}[i - c] + 1)$.
5. If $\text{dp}[\text{target}] \ge \text{INF}$, return -1; otherwise, return $\text{dp}[\text{target}]$.

Complexity:
- Time: $O(n \times \text{target})$. With $n \le 100$ and $\text{target} \le 10^6$, total operations $\le 10^8$, executing in $\approx 80$ ms in C++.
- Space: $O(\text{target})$ to store the 1D DP table.

## Code walkthrough
- `const int INF = 1e9`: Sentinel representing an unreachable sum without overflowing when $+1$ is added.
- `vector<int> dp(target + 1, INF); dp[0] = 0`: Array initialization.
- `for (int i = 1; i <= target; i++)`: Computes answers for each sub-target in ascending order.
- `if (i >= c && dp[i - c] != INF)`: Ensures the prior subproblem is reachable before attempting relaxation.
- `dp[i] = min(dp[i], dp[i - c] + 1)`: Standard Bellman-Ford / shortest-path edge relaxation.
- `return dp[target] >= INF ? -1 : dp[target]`: Distinguishes unreachable target sums from valid answers.

## Test it out loud
- Test case $1$: `coins = [1, 5, 7]`, target = 11. Transitions reach $\text{dp}[10] = 2$ ($5+5$), then $\text{dp}[11] = \min(\text{dp}[10]+1, \text{dp}[6]+1, \text{dp}[4]+1) = 3$. Returns 3.
- Test case $2$: `coins = [2, 4, 6]`, target = 7. All odd entries remain $\text{INF}$, returns -1.
- Test case $3$: `coins = [1]`, target = 10. Each step adds 1 coin $\implies$ returns 10.
- Test case $4$: `coins = [5, 7]`, target = 12. $\text{dp}[12] = \text{dp}[7] + 1 = 1 + 1 = 2$. Returns 2.

## Follow-ups
- How to reconstruct the exact coins used in the optimal combination? Maintain a `parent[x]` array storing the coin $c$ that achieved the minimum for each sum $x$. Trace backward from `target` by subtracting `parent[curr]` until reaching 0.
- Can BFS be used instead of DP? Yes, since edge weights are 1, BFS from 0 to `target` finds the shortest path, visiting states in increasing order of coin count and exiting early once `target` is popped.

## Common mistakes
- Using `INT_MAX` for infinity: Adding 1 to `INT_MAX` causes signed 32-bit integer overflow into negative values. Using $10^9$ prevents overflow.
- Incorrect base case: Failing to set `dp[0] = 0` leaves everything at infinity, returning -1 for all inputs.

## Further reading
- [Change-Making Problem on Wikipedia](https://en.wikipedia.org/wiki/Change-making_problem)
