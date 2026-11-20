---
id: cses-two-sets
pattern: cses-introductory
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What is the partition requirement? Partition the numbers $1, 2, \dots, n$ into two disjoint sets $S_1$ and $S_2$ such that their sums are equal.
- What should be returned if no such partition exists? Return an empty list.
- How should the output be formatted? Return a list of two lists $[S_1, S_2]$, with both lists sorted in ascending order.
- Is there a canonical construction expected? Yes, per statement instructions: greedily scan from $n$ down to $1$, placing $k$ into $S_1$ if it fits within the remaining target sum $\frac{\text{total}}{2}$, otherwise placing $k$ into $S_2$.
- What are the bounds on $n$? $1 \le n \le 10^6$.

## Examples to say out loud
- Consider $n = 7$:
  - Total sum = $\frac{7 \times 8}{2} = 28$.
  - Target sum for each set = $14$.
  - Scanning from 7 down to 1:
    - 7: $14 \ge 7 \implies$ add 7 to $S_1$, remaining target = $7$.
    - 6: $7 \ge 6 \implies$ add 6 to $S_1$, remaining target = $1$.
    - 5: $1 < 5 \implies$ add 5 to $S_2$.
    - 4: $1 < 4 \implies$ add 4 to $S_2$.
    - 3: $1 < 3 \implies$ add 3 to $S_2$.
    - 2: $1 < 2 \implies$ add 2 to $S_2$.
    - 1: $1 \ge 1 \implies$ add 1 to $S_1$, remaining target = $0$.
  - $S_1 = [1, 6, 7]$, $S_2 = [2, 3, 4, 5]$. Both sum to $14$.
- Consider $n = 6$:
  - Total sum = $\frac{6 \times 7}{2} = 21$.
  - 21 is odd, which cannot be divided equally into two integers. Return empty list `[]`.

## Brute force
A brute-force approach would explore all $2^n$ subsets to check if any subset sums to $\frac{\text{total}}{2}$. With $n = 10^6$, an exponential $2^n$ search or even an $O(n \times \text{total})$ dynamic programming knapsack approach is impossible due to memory and time limits. Because the elements are the consecutive integers $1 \dots n$, a greedy strategy constructs a valid partition in $O(n)$ time.

## The key observation
First, partition is possible if and only if the total sum $\frac{n(n + 1)}{2}$ is even. This occurs when $n$ is a multiple of $4$ (i.e. $n \equiv 0 \pmod 4$) or when $n \equiv 3 \pmod 4$.
Second, because the set of available numbers contains every integer from $1$ to $n$, a greedy approach running from $n$ down to $1$ is guaranteed to fill the target sum exactly: taking the largest possible numbers leaves a small remainder that can always be matched by a single smaller integer.

## Optimal approach
1. Compute the total sum $\text{total} = \frac{n(n + 1)}{2}$ using 64-bit integers.
2. If $\text{total} \pmod 2 \ne 0$, return an empty list.
3. Set $\text{target} = \frac{\text{total}}{2}$.
4. Initialize two empty lists $S_1$ and $S_2$.
5. Loop $i$ from $n$ down to $1$:
   - If $\text{target} \ge i$, append $i$ to $S_1$ and decrease $\text{target}$ by $i$.
   - Otherwise, append $i$ to $S_2$.
6. Reverse $S_1$ and $S_2$ so they are sorted in ascending order.
7. Return $[S_1, S_2]$.

Complexity:
- Time: $O(n)$ because we iterate from $n$ down to $1$ once, and reversing two lists of total size $n$ takes $O(n)$ time.
- Space: $O(n)$ to store all numbers partitioned across the two lists.

## Code walkthrough
- `long long total = (long long)n * (n + 1) / 2`: Uses 64-bit arithmetic to avoid overflow for $n = 10^6$.
- `if (total % 2 != 0) return {}`: Immediate parity check determines impossibility.
- `for (int i = n; i >= 1; i--)`: Greedy selection from largest available integers down to 1.
- `if (target >= i)`: Picks $i$ if it does not exceed the remaining target, decrementing target accordingly.
- `reverse(s1.begin(), s1.end())`: Restores increasing order in linear time without requiring an $O(n \log n)$ sort.

## Test it out loud
- Test case $1$: $n = 1$. Total sum is 1 (odd) $\implies$ returns `[]`.
- Test case $2$: $n = 2$. Total sum is 3 (odd) $\implies$ returns `[]`.
- Test case $3$: $n = 3$. Total sum is 6 (even), target = 3. 3 goes to $S_1$; 2 and 1 go to $S_2$ and $S_1$ respectively. Yields $S_1 = [3], S_2 = [1, 2]$.
- Test case $4$: $n = 4$. Total sum is 10, target = 5. Loop picks 4 (target 1), 3 to $S_2$, 2 to $S_2$, 1 to $S_1$. Yields $S_1 = [1, 4], S_2 = [2, 3]$.

## Follow-ups
- What if we needed to partition into $k$ equal subsets? This is the $k$-partition problem, which is NP-complete for general sets, but for consecutive integers $1 \dots n$, constructive pairings exist when $k$ divides the total sum and $n \ge 2k - 1$.
- How can we minimize memory overhead if only printing or streaming is required? We can determine whether each number belongs to $S_1$ or $S_2$ without buffering the full arrays.

## Common mistakes
- Integer overflow: $n \times (n + 1)$ reaches $10^{12}$ for $n = 10^6$, overflowing standard 32-bit signed integers.
- Forgetting to sort or reverse: The problem expects ascending order within each list. Since greedy scans from $n$ down to 1, reversing before returning is necessary.

## Further reading
- [Partition Problem on Wikipedia](https://en.wikipedia.org/wiki/Partition_problem)
