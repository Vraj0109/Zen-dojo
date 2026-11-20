---
id: cses-coin-combinations-i
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n \times target) time and O(target) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of distinct positive coin denominations, and an integer `target`.
- How are combinations counted? Sequences with identical coins in different orders are considered **distinct** (e.g., $[2, 3]$ and $[3, 2]$ are counted separately).
- How many times can each denomination be used? Unlimited times.
- What modulo is required? Modulo $10^9 + 7$.
- What are the constraints? $1 \le n \le 100$, $1 \le \text{target} \le 10^6$, and $1 \le \text{coins}[i] \le 10^6$.

## Examples to say out loud
- Consider `coins = [2, 3, 5]` and `target = 9`:
  - Ordered ways:
    - Three rolls: $3 + 3 + 3$ (1 way)
    - Coins with 5 and 2: $2 + 2 + 5$, $2 + 5 + 2$, $5 + 2 + 2$ (3 ways)
    - Coins with 3 and 2: $2 + 2 + 2 + 3$, $2 + 2 + 3 + 2$, $2 + 3 + 2 + 2$, $3 + 2 + 2 + 2$ (4 ways)
  - Total ordered ways = $1 + 3 + 4 = 8$.
- Consider `coins = [1, 2]` and `target = 3`:
  - Ways: $1 + 1 + 1$, $1 + 2$, $2 + 1$. Total = 3.
- Edge case: `coins = [5]`, `target = 4`:
  - Cannot reach sum 4 with denomination 5 $\implies$ returns 0.

## Brute force
A brute-force solution would branch recursively over each coin choice at every position until reaching or exceeding `target`. Because branching is done over $n$ coins for up to `target` steps, recursion takes $O(n^{\text{target}})$ time, which is completely impossible for $\text{target} = 10^6$. Dynamic programming solves this in bottom-up linear time proportional to $n \times \text{target}$.

## The key observation
Because the **order** of coins matters, any valid sequence of coins summing to $i$ must end with some specific coin $c \in \text{coins}$.
If the last coin placed is $c$, the prefix of coins preceding $c$ must sum to exactly $i - c$.
Thus, by putting the sum $i$ in the **outer loop** and iterating over all coins $c$ in the **inner loop**:
$$\text{dp}[i] = \sum_{c \in \text{coins}, c \le i} \text{dp}[i - c] \pmod{10^9 + 7}$$
Base case: $\text{dp}[0] = 1$ (1 way to form sum 0: the empty sequence).
Because every position in the sequence can independently be any coin, looping over sum on the outside naturally distinguishes different permutations.

## Optimal approach
1. Define modulo $M = 1000000007$.
2. Allocate an integer array `dp` of size $\text{target} + 1$ initialized to 0.
3. Set base case: `dp[0] = 1`.
4. Outer loop $i$ from $1$ to `target`:
   - Inner loop over each coin $c$ in `coins`:
     - If $i \ge c$:
       - $\text{dp}[i] = (\text{dp}[i] + \text{dp}[i - c]) \pmod M$.
5. Return `dp[\text{target}]`.

Complexity:
- Time: $O(n \times \text{target})$ where $n = |\text{coins}|$. For $n = 100$ and $\text{target} = 10^6$, total operations $\le 10^8$, finishing in $\approx 80$ ms.
- Space: $O(\text{target})$ to store the 1D DP array.

## Code walkthrough
- `const int MOD = 1e9 + 7`: Modulo arithmetic constant.
- `vector<int> dp(target + 1, 0); dp[0] = 1`: DP array initialized with empty sequence base case.
- `for (int i = 1; i <= target; i++)`: Iterates sequentially through all sub-target sums.
- `for (int c : coins)`: Tries placing each coin as the final element in the sequence.
- `dp[i] = (dp[i] + dp[i - c]) % MOD`: Accumulates the number of paths reaching sum $i$.

## Test it out loud
- Test case $1$: `coins = [1, 2]`, target = 3:
  - $\text{dp}[0] = 1$
  - $\text{dp}[1] = \text{dp}[0] = 1$
  - $\text{dp}[2] = \text{dp}[1] + \text{dp}[0] = 1 + 1 = 2$
  - $\text{dp}[3] = \text{dp}[2] + \text{dp}[1] = 2 + 1 = 3$. Returns 3.
- Test case $2$: `coins = [5]`, target = 4. Loop conditions $i \ge 5$ never trigger $\implies \text{dp}[4] = 0$.
- Test case $3$: `coins = [5]`, target = 10. Only $5+5 \implies 1$.

## Follow-ups
- How does this differ from Coin Combinations II? In Coin Combinations I, the loop over sums is on the outside, which counts all orderings (permutations). In Coin Combinations II, the loop over coins is on the outside, which counts unordered combinations.
- What if target was up to $10^{18}$ and coin values were small ($\le 20$)? Construct the transition matrix of size $\max(c) \times \max(c)$ and compute $\text{dp}[\text{target}]$ via binary matrix exponentiation in $O(K^3 \log \text{target})$.

## Common mistakes
- Swapping the loop order: Placing the coin loop on the outside turns the problem into Coin Combinations II (unordered combinations), yielding incorrect undercounts.
- 32-bit overflow before modulo: If multiple terms are added before modulo, integer overflow can occur. Performing modulo on every addition or accumulating in 64-bit integer prevents overflow.

## Further reading
- [Unbounded Knapsack and Compositions on Wikipedia](https://en.wikipedia.org/wiki/Composition_(combinatorics))
