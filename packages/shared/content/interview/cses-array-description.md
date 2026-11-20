---
id: cses-array-description
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n \times m) time and O(m) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array `arr` of $n$ integers, and an integer $m$.
- What do the values represent? Each element must be between $1$ and $m$. A value of $0$ indicates an unknown element that can be replaced by any integer in $[1, m]$.
- What is the validity condition? An array is valid if $|arr[i] - arr[i - 1]| \le 1$ for all $i \ge 1$.
- What should be returned? The total number of valid matching arrays modulo $10^9 + 7$.
- What are the constraints? $1 \le n \le 100000$, $1 \le m \le 100$, and $0 \le \text{arr}[i] \le m$.

## Examples to say out loud
- Consider `arr = [2, 0, 2]` and $m = 5$:
  - The middle element at index 1 is unknown (0).
  - Its neighbors are both 2.
  - For $|v - 2| \le 1$, $v$ can be 1, 2, or 3. All are $\le 5$.
  - Valid arrays: `[2, 1, 2]`, `[2, 2, 2]`, `[2, 3, 2]`.
  - Total valid arrays = 3.
- Consider `arr = [1, 3]` and $m = 5$:
  - Both elements are fixed, but $|3 - 1| = 2 > 1$.
  - Impossible $\implies$ returns 0.

## Brute force
A brute-force solution would recursively test every value from $1$ to $m$ for each 0 in the array. If there are $k$ zeros, there are $m^k$ potential completions. With $n = 100000$ and $m = 100$, $100^{100000}$ is unfathomably large. Because each element only constrains its immediate adjacent neighbors, dynamic programming processes the array from left to right in $O(n \times m)$ time.

## The key observation
Let $\text{dp}[v]$ be the number of valid prefixes up to index $i$ that end with value $v$ ($1 \le v \le m$).
When moving from index $i - 1$ to index $i$, a value $v$ at index $i$ can only be reached if the value at index $i - 1$ was $v - 1$, $v$, or $v + 1$.
Therefore:
$$\text{next\_dp}[v] = (\text{dp}[v - 1] + \text{dp}[v] + \text{dp}[v + 1]) \pmod{10^9 + 7}$$
- If $\text{arr}[i]$ is fixed ($\text{arr}[i] \ne 0$), then $\text{next\_dp}[v]$ is 0 for all $v \ne \text{arr}[i]$, and only computed for $v = \text{arr}[i]$.
- If $\text{arr}[i] == 0$, $v$ can range across all valid values from $1$ to $m$.
Summing $\text{dp}[v]$ over all $1 \le v \le m$ at index $n - 1$ yields the total valid configurations.

## Optimal approach
1. Define modulo $M = 1000000007$.
2. Allocate an array `dp` of size $m + 2$ initialized to 0 (using padding for boundary convenience).
3. Initialize index 0:
   - If $\text{arr}[0] == 0$: set $\text{dp}[v] = 1$ for all $1 \le v \le m$.
   - Else: set $\text{dp}[\text{arr}[0]] = 1$.
4. Loop $i$ from $1$ to $n - 1$:
   - Allocate `next_dp` of size $m + 2$ initialized to 0.
   - Determine candidate range for $v$:
     - If $\text{arr}[i] == 0$: $\text{lo} = 1, \text{hi} = m$.
     - Else: $\text{lo} = \text{hi} = \text{arr}[i]$.
   - For $v$ from $\text{lo}$ to $\text{hi}$:
     - $\text{next\_dp}[v] = (\text{dp}[v - 1] + \text{dp}[v] + \text{dp}[v + 1]) \pmod M$.
   - Update `dp = next_dp`.
5. Sum $\text{dp}[v]$ for $1 \le v \le m$ modulo $M$, and return the total.

Complexity:
- Time: $O(n \times m)$. With $n = 100000$ and $m = 100$, total transitions $\le 10^7$, running in $\approx 20$ ms.
- Space: $O(m)$ auxiliary space using two arrays of size $m + 2$.

## Code walkthrough
- `vector<int> dp(m + 2, 0)`: Tracks counts for values $1 \dots m$; index 0 and $m + 1$ act as zero-valued boundary cushions.
- `if (arr[0] == 0) for (int v = 1; v <= m; v++) dp[v] = 1`: The first element can be any value in $1 \dots m$ if unknown.
- `int lo = (arr[i] == 0) ? 1 : arr[i]; int hi = (arr[i] == 0) ? m : arr[i]`: Constrains transitions to the known number or allows any valid height.
- `long long ways = (long long)dp[v - 1] + dp[v] + dp[v + 1]`: Sums transitions from adjacent heights in the previous step.
- `ans = (ans + dp[v]) % MOD`: Aggregates all valid endings at index $n - 1$.

## Test it out loud
- Test case $1$: `arr = [1, 3]`, $m = 5$. At $i = 0$, $\text{dp}[1] = 1$. At $i = 1$, $v = 3$ can only transition from 2, 3, 4 (all 0). Returns 0.
- Test case $2$: `arr = [1, 2, 3]`, $m = 5$. Path is uniquely determined $\implies$ returns 1.
- Test case $3$: `arr = [0]`, $m = 10$. Single unknown element can take any value $1 \dots 10 \implies$ returns 10.
- Test case $4$: `arr = [0, 0]`, $m = 3$. $m + 2(m - 1) = 3 + 4 = 7$ pairs $\implies$ returns 7.

## Follow-ups
- What if $|arr[i] - arr[i - 1]| \le k$ for arbitrary $k$? We can maintain prefix sums of `dp` to compute the transition sum $\sum_{u = v - k}^{v + k} \text{dp}[u]$ in $O(1)$ time, keeping overall time $O(n \times m)$.
- What if $m$ was up to $10^9$ but the number of fixed elements was small? Between two fixed elements, the count of valid paths of length $L$ corresponds to paths in a tridiagonal transition matrix or combinatorics of Dyck paths.

## Common mistakes
- Out-of-bounds array access on $v - 1$ or $v + 1$: When $v = 1$, $v - 1 = 0$; when $v = m$, $v + 1 = m + 1$. Sizing the DP array to $m + 2$ safely absorbs boundary values as zeros.
- Forgetting modulo at each addition: Adding three integers up to $10^9$ can exceed $2 \times 10^9$, requiring `long long` for the temporary sum before modulo.

## Further reading
- [Dynamic Programming on Paths on Wikipedia](https://en.wikipedia.org/wiki/Dynamic_programming)
