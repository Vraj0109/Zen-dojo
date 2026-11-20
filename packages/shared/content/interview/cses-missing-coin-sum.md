---
id: cses-missing-coin-sum
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of $n$ positive integer coin values.
- How are sums formed? By choosing any subset of the given coins and taking their sum.
- What is the goal? Find the smallest positive integer ($1, 2, 3, \dots$) that cannot be created by any subset of coins.
- Can coins have duplicate values? Yes, coins can have identical values.
- What are the constraints? $1 \le n \le 200000$ and $1 \le \text{coins}[i] \le 10^9$.
- Can the answer exceed 32-bit limits? Yes, the sum of all coins can reach $2 \times 10^{14}$, so the answer must be stored in a 64-bit integer (`long long`).

## Examples to say out loud
- Consider `coins = [2, 9, 1, 2, 7]`:
  - Sort coins: `[1, 2, 2, 7, 9]`.
  - Start with `reach = 1` (target to form is 1).
  - Coin 1: $1 \le 1$. We can form 1. New formable range is $[1, 1]$. Next unformed sum is `reach = 1 + 1 = 2`.
  - Coin 2: $2 \le 2$. We can form $[1, 1 + 2] = [1, 3]$. Next unformed sum is `reach = 2 + 2 = 4`.
  - Coin 2: $2 \le 4$. We can form $[1, 3 + 2] = [1, 5]$. Next unformed sum is `reach = 4 + 2 = 6`.
  - Coin 7: $7 > 6$. We cannot form 6 because all remaining coins are $\ge 7$.
  - The smallest unformable sum is 6.
- Edge case: `coins = [2, 3, 5]`:
  - Smallest coin is 2, which is $> 1$.
  - 1 cannot be formed. Return 1.

## Brute force
A brute-force solution would attempt subset-sum DP (like the knapsack problem) checking if every integer $1, 2, 3, \dots$ is formable. With coin values up to $10^9$ and total sums up to $10^{14}$, allocating a DP table or boolean array will cause an immediate Out Of Memory error or Time Limit Exceeded. A greedy induction strategy after sorting finds the answer in $O(n \log n)$ time.

## The key observation
Suppose we have sorted the coins in ascending order. Let `reach` be the smallest positive integer that we cannot currently form. This means we can already form every integer in the continuous range $[1, \text{reach} - 1]$.
Now consider the next coin $c$:
- If $c \le \text{reach}$: By adding $c$ to all previously formable sums in $[1, \text{reach} - 1]$, we can now form every sum in $[c, \text{reach} + c - 1]$. Since $c \le \text{reach}$, this new interval overlaps or connects seamlessly with $[1, \text{reach} - 1]$, expanding our formable range to $[1, \text{reach} + c - 1]$. The new smallest unformable sum becomes $\text{reach} + c$.
- If $c > \text{reach}$: Since the coins are sorted, all subsequent coins will be $\ge c > \text{reach}$. No remaining coin or combination of remaining coins can ever help form $\text{reach}$. Therefore, $\text{reach}$ can never be formed, and it is the exact answer.

## Optimal approach
1. Sort the `coins` array in ascending order.
2. Initialize `reach = 1` using a 64-bit integer (`long long`).
3. For each coin $c$ in `coins`:
   - If $c > \text{reach}$, break out of the loop.
   - Otherwise, update `reach += c`.
4. Return `reach`.

Complexity:
- Time: $O(n \log n)$ to sort the coins, followed by an $O(n)$ single-pass greedy scan.
- Space: $O(1)$ auxiliary space beyond the sorting stack.

## Code walkthrough
- `sort(coins.begin(), coins.end())`: Orders coins from smallest to largest to enable the inductive range expansion.
- `long long reach = 1`: Invariant: all integers in $[1, \text{reach} - 1]$ can be formed; `reach` is the current candidate target.
- `if (c > reach) break`: If the next coin creates a gap, `reach` can never be filled.
- `reach += c`: Extends the contiguous range of formable sums seamlessly.

## Test it out loud
- Test case $1$: `[1, 1, 1, 1]`. Coins extend reach: $1 \to 2 \to 3 \to 4 \to 5$. Returns 5.
- Test case $2$: `[1, 2, 4, 8, 16]`. Powers of 2 double reach each step: $1 \to 2 \to 4 \to 8 \to 16 \to 32$. Returns 32.
- Test case $3$: `[1000000000]`. Coin $> 1 \implies$ returns 1.
- Test case $4$: `[1, 2, 5, 10]`. Reach progression: $1 \to 2 \to 4$. At coin 5, $5 > 4 \implies$ returns 4.

## Follow-ups
- Why does the array need to be sorted? If coins were examined out of order, we might see large coins before small coins and falsely assume a gap exists when smaller coins could bridge it.
- Can this answer any query on arbitrary coin multiset prefixes in $O(\log^2(\sum c))$? Yes, by using a persistent segment tree to fetch all coins $\le \text{reach}$ in logarithmic steps.

## Common mistakes
- 32-bit integer overflow: The sum of $200000$ coins of value $10^9$ can reach $2 \times 10^{14}$, which overflows 32-bit signed integers. `reach` must be 64-bit (`long long`).
- Checking strict inequality incorrectly: Checking $c \ge \text{reach}$ instead of $c > \text{reach}$ incorrectly breaks when $c == \text{reach}$, even though $c == \text{reach}$ validly extends the range.

## Further reading
- [Smallest Unformable Sum on Wikipedia](https://en.wikipedia.org/wiki/Change-making_problem)
