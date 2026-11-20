---
id: c-cf-996a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the available banknote denominations? The denominations are 100, 20, 10, 5, and 1 dollar bills.
- What is the goal? Given an integer `n` representing the total balance to withdraw, find the minimum number of bills needed.
- What are the constraints on `n`? `1 <= n <= 10^9`.
- Does the greedy choice guarantee the minimum number of bills? Yes, because every smaller denomination divides the larger ones or forms a canonical coin system where the greedy strategy is optimal.

## Examples to say out loud
- Consider `n = 125`:
  - Take as many 100-dollar bills as possible: `125 / 100 = 1` bill, remainder is `25`.
  - Take 20-dollar bills: `25 / 20 = 1` bill, remainder is `5`.
  - Take 10-dollar bills: `5 / 10 = 0` bills.
  - Take 5-dollar bills: `5 / 5 = 1` bill, remainder is `0`.
  - Total bills = `1 + 1 + 0 + 1 + 0 = 3`.
- Consider `n = 43`:
  - `43 / 20 = 2` bills of 20, remainder 3.
  - `3 / 1 = 3` bills of 1.
  - Total bills = 5.

## Brute force
A simulation where we subtract the largest denomination one bill at a time would execute up to `10^9 / 100 = 10^7` or `10^9 / 1 = 10^9` steps. That is too slow and unnecessary when integer division `n / denomination` gives the exact count in a single arithmetic step.

## The key observation
Because the denominations `{100, 20, 10, 5, 1}` are canonical, taking the maximum possible number of the largest available bill at each step is mathematically guaranteed to minimize total bills. With integer division and modulo, we can compute the bills for each denomination in O(1) time.

## Optimal approach
1. Define the denominations array in descending order: `[100, 20, 10, 5, 1]`.
2. Initialize `ans = 0`.
3. For each denomination `d`:
   - Add `n / d` to `ans`.
   - Update `n = n % d`.
4. Return `ans`.

Complexity:
- Time complexity: O(1), as the array has exactly 5 fixed denominations.
- Space complexity: O(1) auxiliary space, requiring just a few integer variables.

## Code walkthrough
- `const int denoms[] = {100, 20, 10, 5, 1}`: Fixed descending list of banknote values.
- `int ans = 0`: Accumulator for total bills.
- `for (int d : denoms)`:
  - `ans += n / d`: Takes greedy quotient of current denomination.
  - `n %= d`: Leaves the residual amount for smaller denominations.
- `return ans`: Returns the minimal bill count.

## Test it out loud
- `n = 125`: `125/100 = 1` (rem 25), `25/20 = 1` (rem 5), `5/5 = 1` (rem 0). Total: 3. Correct.
- `n = 43`: `43/20 = 2` (rem 3), `3/1 = 3` (rem 0). Total: 5. Correct.
- `n = 1000000000`: `10^9 / 100 = 10^7`. Remainder 0. Total: 10^7. Correct.

## Follow-ups
- What if the coin denominations were arbitrary (e.g. `{1, 3, 4}`)? The greedy approach does not work for non-canonical coin systems (e.g. 6 would give 4 + 1 + 1 = 3 coins instead of 3 + 3 = 2 coins). In that general setting, we must use Dynamic Programming (unbounded knapsack).

## Common mistakes
- Simulating with subtraction in a loop instead of integer division, resulting in TLE when `n` is large.
- Sorting denominations in ascending order instead of descending order.
