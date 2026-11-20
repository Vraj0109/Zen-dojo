---
id: cses-removal-game
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n^2) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the game rules? Two players take turns removing either the first or last remaining element of an array and adding its value to their personal score.
- Who plays first, and what are their strategies? Player 1 moves first. Both players play optimally to maximize their own total score.
- What should be returned? The maximum total score Player 1 can achieve.
- Can values be negative? Yes, values range from $-10^9$ to $10^9$.
- Can the answer exceed 32 bits? Yes, with $n = 5000$ and values up to $10^9$, scores can reach $5 \times 10^{12}$, requiring 64-bit integers (`long long`).
- What are the constraints? $1 \le n \le 5000$.

## Examples to say out loud
- Consider `arr = [4, 5, 1, 3]`:
  - Total sum = $4 + 5 + 1 + 3 = 13$.
  - If Player 1 takes 4, remaining is $[5, 1, 3]$. Player 2 takes 5.
  - If Player 1 takes 3, remaining is $[4, 5, 1]$. Player 2 takes 4, remaining is $[5, 1]$. Player 1 takes 5. Player 1 gets $3 + 5 = 8$. Player 2 gets $4 + 1 = 5$.
  - Both play optimally $\implies$ Player 1 scores 8.
- Edge case: single element `[10]`:
  - Player 1 takes the only element and scores 10.
- Two elements `[2, 1]`:
  - Player 1 takes $\max(2, 1) = 2$.

## Brute force
A minimax game tree recursion would evaluate all possible turns. At each turn, there are 2 choices (left or right). The game lasts $n$ turns, yielding a game tree of size $2^n$. For $n = 5000$, $2^{5000}$ is impossible. Interval dynamic programming evaluates subgames on contiguous segments $[i, j]$ in $O(n^2)$ time.

## The key observation
Instead of tracking both players' individual scores simultaneously, consider the **score difference**:
$$\Delta = \text{Current Player Score} - \text{Opponent Score}$$
Let $\text{dp}[i][j]$ be the maximum relative advantage achievable on subarray $\text{arr}[i \dots j]$:
- If the current player takes $\text{arr}[i]$, the opponent faces subarray $\text{arr}[i + 1 \dots j]$ and achieves relative advantage $\text{dp}[i + 1][j]$. Thus, the current player's net advantage is $\text{arr}[i] - \text{dp}[i + 1][j]$.
- If the current player takes $\text{arr}[j]$, the net advantage is $\text{arr}[j] - \text{dp}[i][j - 1]$.
By minimax:
$$\text{dp}[i][j] = \max(\text{arr}[i] - \text{dp}[i + 1][j], \text{arr}[j] - \text{dp}[i][j - 1])$$
Base case for single elements: $\text{dp}[i][i] = \text{arr}[i]$.
Once $\text{dp}[0][n - 1] = P_1 - P_2$ is found, knowing that $P_1 + P_2 = \text{totalSum}$, we solve the two-variable system:
$$P_1 = \frac{\text{totalSum} + \text{dp}[0][n - 1]}{2}$$

## Optimal approach
1. Compute the total sum of all elements in 64 bits: $\text{total} = \sum \text{arr}[i]$.
2. Initialize a 1D DP array of size $n$, with $\text{dp}[i] = \text{arr}[i]$ for all $i$.
3. Loop interval length `len` from 2 up to $n$:
   - For left index $i$ from 0 to $n - \text{len}$:
     - Set right index $j = i + \text{len} - 1$.
     - Update $\text{dp}[i] = \max(\text{arr}[i] - \text{dp}[i + 1], \text{arr}[j] - \text{dp}[i])$.
4. Return $(\text{total} + \text{dp}[0]) / 2$.

Complexity:
- Time: $O(n^2)$ because there are $O(n^2)$ subsegments, each taking $O(1)$ transitions. For $n = 5000$, $n^2 / 2 \approx 1.25 \times 10^7$ iterations, running in $\approx 30$ ms.
- Space: $O(n)$ space using the 1D rolling array.

## Code walkthrough
- `long long total = 0; for (int x : arr) total += x`: Sum of all numbers in the game.
- `vector<long long> dp(arr.begin(), arr.end())`: Initializes base cases for all intervals of length 1.
- `for (int len = 2; len <= n; len++)`: Evaluates intervals in order of increasing length.
- `dp[i] = max((long long)arr[i] - dp[i + 1], (long long)arr[j] - dp[i])`: In the 1D array, `dp[i + 1]` represents $\text{dp}[i + 1][j]$ and `dp[i]` represents $\text{dp}[i][j - 1]$ from the previous length step.
- `return (total + dp[0]) / 2`: Recovers Player 1's absolute score from the net differential.

## Test it out loud
- Test case $1$: `arr = [2, 1]`. $\text{total} = 3$. $\text{dp}[0] = \max(2 - 1, 1 - 2) = 1$. $P_1 = (3 + 1) / 2 = 2$.
- Test case $2$: `arr = [1, 2, 3]`. $\text{total} = 6$. Player 1 picks 3 $\to [1, 2]$. Player 2 picks 2 $\to [1]$. Player 1 picks 1. $P_1 = 3 + 1 = 4$.
- Test case $3$: `arr = [1, 100, 2]`. If P1 picks 1, P2 gets 100. P1 picks 2, P2 picks 100, P1 gets 1. $P_1 = 3$.
- Test case $4$: Single element `[10]` $\implies (10 + 10) / 2 = 10$.

## Follow-ups
- How does space optimization to 1D work without losing values? When computing $\text{dp}[i]$ for the current length, we read `dp[i + 1]` (which has not been updated yet for the current length, representing length $- 1$) and `dp[i]` (also from length $- 1$). Thus, no temporary buffer is needed.
- What if there are 3 players? Minimax with 3 players becomes a game of alliances (n-person non-zero-sum game) and does not possess a straightforward optimal substructure.

## Common mistakes
- Allocating a full $5000 \times 5000$ 64-bit matrix: A full 2D array of $5000 \times 5000$ `long long` values takes $200$ MB of memory. Compressing to a 1D vector uses only $40$ KB.
- 32-bit integer overflow: Scores and totals exceed $2^{31} - 1$. Using 32-bit `int` causes severe overflow.

## Further reading
- [Minimax and Game Theory on Wikipedia](https://en.wikipedia.org/wiki/Minimax)
