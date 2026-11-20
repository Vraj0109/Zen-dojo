---
id: cses-coin-combinations-ii
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n \times target) time and O(target) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of distinct positive coin denominations, and an integer `target`.
- How are combinations counted? Unordered combinations: different orderings of the same coins (e.g. $\{2, 3\}$ and $\{3, 2\}$) are considered identical and counted only **once**.
- How many times can each denomination be used? Unlimited times.
- What modulo is required? Modulo $10^9 + 7$.
- What are the constraints? $1 \le n \le 100$, $1 \le \text{target} \le 10^6$, and $1 \le \text{coins}[i] \le 10^6$.

## Examples to say out loud
- Consider `coins = [2, 3, 5]` and `target = 9`:
  - Unordered combinations:
    - $\{2, 2, 5\}$
    - $\{3, 3, 3\}$
    - $\{2, 2, 2, 3\}$
  - Total unordered ways = 3.
  - Notice in Coin Combinations I, the answer was 8 because permutations were counted; here order does not matter, so the answer is 3.
- Consider `coins = [1, 2]` and `target = 4`:
  - Combinations: $\{1, 1, 1, 1\}$, $\{1, 1, 2\}$, $\{2, 2\}$. Total = 3.

## Brute force
A brute-force recursive approach would try choosing $0, 1, 2, \dots$ copies of the first coin, then recurse on the remaining coins for the remaining sum. In the worst case (e.g. coin 1 with target $10^6$), recursion branches deeply, resulting in exponential time. Dynamic programming with the coin loop on the outside computes the answer in $O(n \times \text{target})$ time.

## The key observation
To ensure combinations are unordered, we must enforce a canonical ordering of coins in every combination (for instance, all coins of type 1 are placed first, then all of type 2, then type 3, etc.).
We achieve this mechanically by placing the **coin loop on the outside** and the **sum loop on the inside**:
For each coin $c$:
- We update the DP table using only coin $c$ and the coins that came before $c$.
- Transition: $\text{dp}[i] = (\text{dp}[i] + \text{dp}[i - c]) \pmod{10^9 + 7}$ for $i$ from $c$ up to $\text{target}$.
Because $i$ runs forwards from $c$ to $\text{target}$, a coin $c$ can be used multiple times (unbounded knapsack), but because coins are processed one by one, no combination can ever introduce an earlier coin after a later coin. This eliminates duplicate permutations.

## Optimal approach
1. Define modulo $M = 1000000007$.
2. Allocate an array `dp` of size $\text{target} + 1$ initialized to 0.
3. Set base case: `dp[0] = 1`.
4. Outer loop over each coin $c$ in `coins`:
   - Inner loop $i$ from $c$ to `target`:
     - $\text{dp}[i] = (\text{dp}[i] + \text{dp}[i - c]) \pmod M$.
5. Return `dp[\text{target}]`.

Complexity:
- Time: $O(n \times \text{target})$ where $n = |\text{coins}|$. For $n = 100$ and $\text{target} = 10^6$, total operations $\le 10^8$, finishing in $\approx 40$ ms in C++.
- Space: $O(\text{target})$ to store the 1D DP table.

## Code walkthrough
- `const int MOD = 1e9 + 7`: Modulo arithmetic constant.
- `vector<int> dp(target + 1, 0); dp[0] = 1`: Base case representing the unique empty combination summing to 0.
- `for (int c : coins)`: The outer loop processes one coin denomination at a time.
- `for (int i = c; i <= target; i++)`: Iterates forward through sums from $c$ up to $\text{target}$. Running forward allows unlimited reuse of the current coin $c$.
- `dp[i] = (dp[i] + dp[i - c]) % MOD`: Adds combinations that use at least one more instance of coin $c$.

## Test it out loud
- Test case $1$: `coins = [2, 3, 5]`, target = 9. Loop over coin 2 builds evens, coin 3 adds combinations with 3s, coin 5 adds combinations with 5s. Returns 3.
- Test case $2$: `coins = [3]`, target = 5. Target 5 is not divisible by 3 $\implies$ returns 0.
- Test case $3$: `coins = [3]`, target = 9. Exactly one combination $\{3, 3, 3\} \implies$ returns 1.
- Test case $4$: `coins = [1, 2]`, target = 4. Yields 3.

## Follow-ups
- How does the direction of the inner loop change between bounded (0/1 knapsack) and unbounded knapsack?
  - For 0/1 knapsack (each coin used at most once), iterate $i$ **backwards** from `target` down to $c$ so that each coin is used at most once.
  - For unbounded knapsack (each coin used unlimited times), iterate $i$ **forwards** from $c$ up to `target` so that updated values can be reused immediately.
- How does memory locality help this solution? Scanning contiguous memory from $c$ to $\text{target}$ has excellent CPU cache spatial locality, running up to $3\times$ faster than Coin Combinations I.

## Common mistakes
- Inverting the loop order: Putting the sum loop on the outside counts ordered sequences (permutations), giving the answer for Coin Combinations I instead of Coin Combinations II.
- Running the inner loop backwards: Running $i$ from `target` down to $c$ restricts each coin to be used at most once (0/1 knapsack), whereas coins may be used infinitely.

## Further reading
- [Unbounded Knapsack Problem on Wikipedia](https://en.wikipedia.org/wiki/Knapsack_problem#Unbounded_knapsack_problem)
