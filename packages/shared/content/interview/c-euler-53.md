---
id: c-euler-53
pattern: cses-euler
difficulty: medium
optimal: "O(maxN^2) time, O(maxN) space"
brute: same
reviewed: false
---

## Clarify first
- What is being counted? The number of pairs $(n, r)$ with $1 \le n \le \text{maxN}$ and $0 \le r \le n$ such that the binomial coefficient $\binom{n}{r} > \text{threshold}$.
- What are the ranges of $\text{maxN}$ and `threshold`? $1 \le \text{maxN} \le 5000$ and $1 \le \text{threshold} \le 10^{15}$.
- Can binomial coefficients overflow 64-bit integers? Yes, $\binom{5000}{2500}$ has over 1500 decimal digits, which drastically exceeds 64-bit integer limits.
- Do we need the exact value of $\binom{n}{r}$? No, we only need to know whether $\binom{n}{r} > \text{threshold}$. Therefore, we can cap/saturate values at $\text{threshold} + 1$.

## Examples to say out loud
- Consider $\text{maxN} = 5$ and $\text{threshold} = 4$.
  - For $n = 1$: [1, 1] $\to$ none $> 4$.
  - For $n = 2$: [1, 2, 1] $\to$ none $> 4$.
  - For $n = 3$: [1, 3, 3, 1] $\to$ none $> 4$.
  - For $n = 4$: [1, 4, 6, 4, 1] $\to$ $\binom{4}{2} = 6 > 4$ (1 pair).
  - For $n = 5$: [1, 5, 10, 10, 5, 1] $\to$ $\binom{5}{1} = 5$, $\binom{5}{2} = 10$, $\binom{5}{3} = 10$, $\binom{5}{4} = 5$ (4 pairs).
  Total count: $1 + 4 = 5$.
- Consider $\text{maxN} = 1$ and $\text{threshold} = 1$.
  $n = 1$: $\binom{1}{0} = 1$, $\binom{1}{1} = 1$. Neither is strictly greater than 1 $\to$ output is 0.

## Brute force
Computing $\binom{n}{r}$ directly via $\frac{n!}{r!(n-r)!}$ requires big-integer arithmetic for numbers with thousands of digits, resulting in heavy memory churn and slow runtimes. By observing that we only care about values relative to `threshold`, saturated addition eliminates the need for arbitrary-precision arithmetic.

## The key observation
Pascal's identity states:
$\binom{n}{r} = \binom{n - 1}{r - 1} + \binom{n - 1}{r}$.
Because we only care if $\binom{n}{r} > \text{threshold}$, any value exceeding $\text{threshold} + 1$ can be replaced by $\text{cap} = \text{threshold} + 1$:
$\text{row}[r] = \min(\text{cap}, \text{row}[r] + \text{row}[r - 1])$.
Since $\text{threshold} \le 10^{15}$, the sum of two capped values is at most $2(\text{threshold} + 1) \le 2 \times 10^{15} + 2$, which fits easily inside a standard 64-bit integer (`long long`).
We can update Pascal's triangle in-place row by row from right to left using $O(\text{maxN})$ space.

## Optimal approach
1. Define `cap = threshold + 1`.
2. Allocate a 1D array `row` of size $\text{maxN} + 2$ filled with 0.
3. Set base case: `row[0] = 1`.
4. Initialize `total = 0`.
5. Loop $n$ from 1 to $\text{maxN}$:
   - Update entries in reverse from $r = n$ down to 1:
     - `row[r] = min(cap, row[r] + row[r - 1])`.
   - Count entries in row $n$ strictly exceeding `threshold`:
     - For $r = 0$ to $n$: if `row[r] > threshold`, increment `total++`.
6. Return `total` as a 64-bit integer.
7. Complexity:
   - Time Complexity: $O(\text{maxN}^2)$. For $\text{maxN} = 5000$, $\frac{5000 \times 5001}{2} \approx 1.25 \times 10^7$ additions, executing in ~25 milliseconds.
   - Space Complexity: $O(\text{maxN})$ auxiliary space for the single row buffer.

## Code walkthrough
- `long long cap = threshold + 1;`: Saturation ceiling preventing 64-bit integer overflow.
- `vector<long long> row(maxN + 2, 0); row[0] = 1;`: Single-row DP buffer for Pascal's triangle.
- `for (int r = n; r >= 1; r--) row[r] = min(cap, row[r] + row[r - 1]);`: In-place reverse scan computing row $n$ from row $n-1$.
- `for (int r = 0; r <= n; r++) if (row[r] > threshold) total++;`: Count valid combinations exceeding the cutoff.
- `return total;`: Return the grand total across all rows.

## Test it out loud
- Test 1: $\text{maxN} = 1, \text{threshold} = 1 \to$ returns 0.
- Test 2: $\text{maxN} = 5, \text{threshold} = 4 \to$ returns 5.
- Test 3: $\text{maxN} = 10, \text{threshold} = 100 \to$ returns 7.
- Test 4: $\text{maxN} = 20, \text{threshold} = 1000 \to$ returns 76.
- Test 5: $\text{maxN} = 100, \text{threshold} = 10^8 \to$ returns 3664.

## Follow-ups
- How to optimize by symmetry?
  Because $\binom{n}{r} = \binom{n}{n - r}$ and rows are unimodal, the first $r$ where $\binom{n}{r} > \text{threshold}$ allows concluding that all $r' \in [r, n - r]$ also exceed `threshold`, adding $n - 2r + 1$ to the total in $O(1)$ without scanning the rest of the row.
- What if $\text{maxN} = 10^6$ and $\text{threshold} = 10^{15}$?
  Since $\binom{n}{r}$ exceeds $10^{15}$ for small $r \le 60$, we only need to compute $\binom{n}{r}$ for $r \le 60$ using binary search or Stirling's approximation.

## Common mistakes
- Attempting to compute exact binomial coefficients without saturation, causing 64-bit integer overflow around $n = 63$.
- Updating `row[r]` from left to right instead of right to left, overwriting previous row values before they are consumed.
- Counting $\binom{n}{r} \ge \text{threshold}$ instead of strictly greater than (`> threshold`).
