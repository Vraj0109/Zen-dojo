---
id: cses-apple-division
pattern: cses-introductory
difficulty: medium
optimal: "O(2^n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are we dividing? We are partitioning $n$ apples with given weights into two subsets.
- What is the objective? Minimize the absolute difference between the total weight of the two subsets: $|\text{sum}(S_1) - \text{sum}(S_2)|$.
- Can one subset be empty? Yes, either group may be empty.
- What are the constraints on $n$ and weights? $1 \le n \le 20$, and individual apple weights can be up to $10^9$.
- Can the total weight exceed 32 bits? Yes, $20 \times 10^9 = 2 \times 10^{10}$, so 64-bit integers (`long long`) must be used for sums.

## Examples to say out loud
- Consider weights $[3, 2, 7, 4, 1]$:
  - Total weight: $3 + 2 + 7 + 4 + 1 = 17$.
  - Partition into group 1: $\{7, 1\}$ with sum 8, and group 2: $\{3, 2, 4\}$ with sum 9.
  - Weight difference: $|9 - 8| = 1$.
  - Minimum possible difference is 1.
- Edge case: $[5]$:
  - Group 1: $\{5\}$, Group 2: $\emptyset$. Difference = $5 - 0 = 5$.
- Edge case: $[1, 1]$:
  - Group 1: $\{1\}$, Group 2: $\{1\}$. Difference = $1 - 1 = 0$.

## Brute force
This problem is an instance of the Partition Problem. In general knapsack dynamic programming, states depend on the target sum ($\frac{\text{total}}{2} \approx 10^{10}$). Because the weight range is up to $10^{10}$, pseudo-polynomial DP running in $O(n \times \text{total})$ will result in Memory Limit Exceeded and Time Limit Exceeded. However, $n \le 20$ is extremely small: $2^{20} = 1048576$, meaning checking all $2^n$ subsets takes just a fraction of a second.

## The key observation
For any subset $S \subseteq \{1, \dots, n\}$ with weight sum $s$, the remaining apples automatically form the other group with sum $\text{total} - s$. The difference between the two groups is:
$$|(\text{total} - s) - s| = |\text{total} - 2s|$$
Since $n \le 20$, we can iterate through all $2^n$ bitmasks or use depth-first search recursion. In DFS, each apple has 2 choices (include in group 1 or don't), visiting every state in $O(2^n)$ operations.

## Optimal approach
1. Compute the sum of all apple weights, `total`, using a 64-bit integer.
2. Initialize `best = total` (or infinity).
3. Use recursion or iterate through all bitmasks from $0$ to $2^n - 1$:
   - For a bitmask, compute $s$ by summing weights of elements where bit $i$ is set.
   - Update `best = min(best, abs(total - 2 * s))`.
4. Return `best`.

Complexity:
- Time: $O(2^n)$ using recursive branching (or $O(n \times 2^n)$ with bitmask loops). For $n = 20$, $2^{20} \approx 10^6$ operations, which runs in less than 20 milliseconds.
- Space: $O(n)$ recursion call stack depth (or $O(1)$ auxiliary space for bitwise iteration).

## Code walkthrough
- `long long total = 0`: Sums all elements in 64 bits to prevent overflow beyond $2 \times 10^9$.
- `for (int mask = 0; mask < (1 << n); mask++)`: Iterates through every possible subset selection of apples.
- `if (mask & (1 << i)) s += weights[i]`: Adds the weight of apple $i$ if its corresponding bit in `mask` is 1.
- `llabs(total - 2 * s)`: Evaluates the discrepancy between the two subsets using 64-bit absolute difference.
- `best = min(best, ...)`: Tracks the minimal difference observed across all $2^n$ configurations.

## Test it out loud
- Test case $1$: $[5] \implies \text{total} = 5$. Subsets: $s = 0$ (diff 5), $s = 5$ (diff 5). Result = 5.
- Test case $2$: $[1, 1] \implies \text{total} = 2$. Subset $\{1\}$ has $s = 1$. Diff = $|2 - 2(1)| = 0$.
- Test case $3$: $[1, 2] \implies \text{total} = 3$. Subsets give differences $|3 - 0| = 3$ and $|3 - 2(1)| = 1$. Result = 1.
- Test case $4$: $[1, 2, 3] \implies \text{total} = 6$. Subset $\{1, 2\}$ has $s = 3$. Diff = $|6 - 6| = 0$.

## Follow-ups
- What if $n = 40$? $2^{40} \approx 10^{12}$ is too large for plain enumeration, but we can use meet-in-the-middle: split into two halves of 20 apples each, generate all subset sums for each half, sort one half, and use binary search (`std::lower_bound`) to find the optimal sum closest to $\frac{\text{total}}{2}$ in $O(2^{n/2} \times n)$.
- What if apple weights are small (e.g., $w_i \le 1000$)? Then subset-sum boolean DP running in $O(n \times \sum w_i)$ works efficiently using a `std::bitset`.

## Common mistakes
- Integer overflow: Individual weights up to $10^9$ cause the sum of 20 items to exceed $2^{31} - 1$. Failing to cast to `long long` causes negative overflow values and incorrect math.
- Attempting full DP with weight as table size: Trying to allocate a DP array of size $10^{10}$ causes an immediate Out Of Memory crash. Recognising that $n \le 20$ means $O(2^n)$ brute force is the intended approach.

## Further reading
- [Partition Problem on Wikipedia](https://en.wikipedia.org/wiki/Partition_problem)
