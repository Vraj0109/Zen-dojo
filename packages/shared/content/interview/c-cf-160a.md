---
id: c-cf-160a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n log n) time, O(1) extra space"
brute: same
reviewed: false
---

## Clarify first
- What is the condition for taking coins? The sum of coins you take must be strictly greater than the sum of coins left for your twin.
- Can the sums be equal? No, your sum must be strictly larger ($> \text{twin's sum}$).
- What are we minimizing? The total count of coins taken, not their monetary value.
- What are the constraints? Number of coins $n \le 100$, and each coin value is an integer between 1 and 100.

## Examples to say out loud
- Consider `coins = [3, 3]`.
  Total sum is 6. Taking 1 coin gives 3 against 3 (equal, not strictly greater).
  Taking 2 coins gives 6 against 0 ($6 > 0$).
  Result: 2 coins.
- Consider `coins = [2, 1, 2]`.
  Total sum is 5.
  Taking the largest coin (value 2) gives 2 against 3 ($2 \le 3$).
  Taking the two largest coins (values 2 and 2) gives $2 + 2 = 4$ against 1 ($4 > 1$).
  Result: 2 coins.
- Consider `coins = [100, 1, 1, 1]`.
  Taking the single coin 100 gives 100 against 3 ($100 > 3$).
  Result: 1 coin.

## Brute force
A brute force approach would explore all subsets of coins: for each subset size $k$ from 1 to $n$, evaluate all $\binom{n}{k}$ subsets, sum their values, and check if the sum exceeds half the total sum. Since $n \le 100$, examining subsets is exponential ($2^{100}$). But greedily picking coins from highest to lowest value guarantees the minimal count.

## The key observation
To reach a target sum strictly greater than half the total coin value using the fewest coins, each choice should contribute as much value as possible. Therefore, a greedy approach that sorts the coins in descending order and picks the largest available coins one by one is mathematically optimal. As soon as $2 \times \text{my\_sum} > \text{total\_sum}$, the condition is met.

## Optimal approach
1. Compute the total sum of all coins: `total = sum(coins)`.
2. Sort the array of coins in descending order.
3. Initialize `my_sum = 0` and `count = 0`.
4. Iterate through the sorted coins:
   - Add the current coin value to `my_sum`.
   - Increment `count` by 1.
   - If `2 * my_sum > total`, break out of the loop.
5. Return `count`.
6. Complexity:
   - Time Complexity: $O(n \log n)$ due to sorting the $n$ coins. The subsequent linear accumulation takes $O(n)$ time.
   - Space Complexity: $O(1)$ auxiliary space if sorting in place, or $O(n)$ depending on the language's sorting algorithm.

## Code walkthrough
- `sort(coins.rbegin(), coins.rend());`: Sort the coins in non-increasing order so largest denominations come first.
- `int total = 0; for (int c : coins) total += c;`: Calculate total sum across all coins.
- `int mine = 0, count = 0;`: Track the accumulated sum and number of coins taken.
- `for (int c : coins)`: Greedily accumulate coins starting from the largest.
- `if (2 * mine > total) break;`: Check if our accumulated value strictly exceeds the twin's share (`mine > total - mine`, which simplifies to `2 * mine > total`).
- `return count;`: Return the minimal count of coins needed.

## Test it out loud
- Test 1: `coins = [1]` $\to$ `total = 1`, `mine = 1`, `2 * 1 > 1` $\to$ returns 1.
- Test 2: `coins = [5, 1]` $\to$ `total = 6`, largest is 5, `2 * 5 = 10 > 6` $\to$ returns 1.
- Test 3: `coins = [1, 1, 1]` $\to$ `total = 3`, taking two 1s gives $2 \times 2 = 4 > 3 \to$ returns 2.
- Test 4: `coins = [4, 4, 4, 4]` $\to$ `total = 16`, need $> 8$, taking three 4s gives $12 > 8 \to$ returns 3.

## Follow-ups
- Can we achieve $O(n)$ time if coin values are bounded?
  Yes, since coin values are between 1 and 100, we can use counting sort / bucket sort to sort the coins in $O(n + \text{max\_val})$ time and $O(\text{max\_val})$ space.
- What if there are 3 siblings splitting coins equally?
  Partitioning among 3 players is NP-hard (3-partition problem) and requires dynamic programming if exact equal partitioning is asked, unlike this simple strictly-greater greedy variant.

## Common mistakes
- Checking `mine >= total - mine` instead of strictly greater `mine > total - mine` (or `2 * mine > total`). Ties are not allowed.
- Sorting in ascending order and taking smaller coins first, which maximizes rather than minimizes the number of coins needed.
