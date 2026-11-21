---
id: c-euler-31
pattern: cses-euler
difficulty: medium
optimal: "O(coins * target) time, O(target) space"
brute: same
reviewed: false
---

## Clarify first

- What coin values are available? (An array of distinct positive integers `coins`).
- How many coins of each kind can be used? (An unlimited supply of each coin type: each denomination can be used zero, one, or multiple times).
- Does the order of coins in a combination matter? (No, two ways are identical if they use the same number of each coin; order does not matter, meaning we are counting combinations, not permutations).
- What should be returned? (The number of distinct ways to pay exactly `target`, returned modulo 1,000,000,007).
- What are the constraints on the input values? (`1 <= coins.length <= 100`, $1 \le coins[i] \le 100000$, and $0 \le target \le 100000$).
- What should be returned for `target = 0`? (There is exactly 1 way to pay 0: using zero coins).

## Examples to say out loud

- Standard case: `coins = [1, 2, 5], target = 5`.
  - Combinations forming 5:
    1. $5$ (one 5-coin)
    2. $2 + 2 + 1$
    3. $2 + 1 + 1 + 1$
    4. $1 + 1 + 1 + 1 + 1$
  - Total combinations: 4. Output is 4.
- Impossible target: `coins = [2], target = 3`.
  - An odd target cannot be formed from coins of value 2. Output is 0.
- Base case: `coins = [1], target = 0`. Exactly 1 way (empty combination). Output is 1.

## Brute force

A recursive backtracking algorithm branches on how many of each coin type to use. In the worst case with small coin values (like 1, 2, 5) and `target = 100,000`, the number of combinations is astronomical (for the standard British coins and 200 pence there are 73,682 combinations, and for target 100,000 it is in the billions). Unmemoized recursion will branch exponentially ($O(2^{\text{target}})$) and fail completely.

## The key observation

This is the classic Unbounded Knapsack / Coin Change 2 problem.
Let $ways[s]$ be the number of ways to form sum $s$.
To ensure that combinations are counted without regard to order (avoiding counting $1 + 2$ and $2 + 1$ as separate ways), we must loop over the coins in the outer loop, and update the sum $s$ in the inner loop.
For each coin $c$:
$$ways[s] = (ways[s] + ways[s - c]) \bmod MOD \quad \text{for } s \in [c, \text{target}]$$
Processing $s$ in increasing order allows the same coin $c$ to be reused multiple times (unbounded supply).

## Optimal approach

1. Define the modulus: `MOD = 1000000007`.
2. Allocate an array `ways` of size `target + 1` initialized to 0.
3. Set base case: `ways[0] = 1` (1 way to pay a sum of 0).
4. Iterate through each coin `c` in `coins`:
   - For `s` from `c` up to `target`:
     - Update: `ways[s] = (ways[s] + ways[s - c]) % MOD`.
5. Return `(int)ways[target]`.

Complexity:
- Time: `O(coins * target)` where `coins` is `coins.length` and `target` is the target sum. For $|\text{coins}| \le 100$ and $\text{target} \le 100,000$, total inner loop iterations are at most $100 \times 100,000 = 10^7$ operations, taking under 30 ms.
- Space: `O(target)` auxiliary space for the 1D DP table of size $100,001$ 64-bit integers (~800 KB).

## Code walkthrough

In the reference implementation:
- `const long long MOD = 1000000007;`: establishes the prime modulo.
- `vector<long long> ways(target + 1, 0); ways[0] = 1;`: allocates the 1D dynamic programming table.
- `for (int c : coins)`: places the coin loop outermost, enforcing that coins are considered in non-decreasing index order to prevent duplicate permutations.
- `for (int s = c; s <= target; s++)`: loops forward from `c` to `target`, naturally enabling unbounded coin reuse.
- `ways[s] = (ways[s] + ways[s - c]) % MOD;`: accumulates transition states in modular arithmetic.
- `return (int)ways[target];`: extracts the number of ways to pay the exact target sum.

## Test it out loud

- `coins = [1], target = 0`:
  - `ways[0] = 1`. Returns 1.
- `coins = [3], target = 9`:
  - $s = 3, 6, 9$ each get 1. Returns 1.
- `coins = [3], target = 10`:
  - 10 is not a multiple of 3. `ways[10] = 0`. Returns 0.
- `coins = [1, 2, 5], target = 5`:
  - Coin 1: `ways[0..5] = [1, 1, 1, 1, 1, 1]`.
  - Coin 2: adds ways: `ways[2] = 2, ways[3] = 2, ways[4] = 3, ways[5] = 3`.
  - Coin 5: `ways[5] = 3 + ways[0] = 4`. Returns 4.

## Follow-ups

- What if each coin could only be used at most once (0/1 Knapsack)?
  We would iterate $s$ backwards from `target` down to `c`: `for (int s = target; s >= c; s--)`, ensuring each coin is used at most once per state.
- What if order DID matter (permutations instead of combinations)? (Combination Sum IV):
  We would place the sum loop outermost and the coin loop innermost: `for (int s = 1; s <= target; s++) for (int c : coins)`.

## Common mistakes

- Swapping the loop order (sum loop outermost, coin loop innermost): this computes the number of ordered sequences (permutations) rather than unordered combinations.
- Forgetting to modulo $10^9 + 7$ at each addition, leading to integer overflow.
- Iterating $s$ backwards instead of forwards, accidentally restricting each coin to at most one usage.

## Further reading

- Coin Change 2 dynamic programming and unbounded knapsack.
- Generating functions and Euler's partition function.
