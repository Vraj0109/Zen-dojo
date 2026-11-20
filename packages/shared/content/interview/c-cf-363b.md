---
id: c-cf-363b
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) extra space"
reviewed: false
---

## Clarify first

- What does the array `h` represent? (Heights of $n$ consecutive fence planks $h[0], h[1], \dots, h[n - 1]$).
- What is to be removed? (A block of $k$ consecutive planks such that their total sum of heights is minimized).
- What indexing format should the answer return? (1-based index of the first plank in the optimal removed block).
- What should be returned in case of a tie? (The problem requires the smallest start position if multiple blocks achieve the minimum sum).
- What are the constraints on $n$, $k$, and plank heights? (`1 <= k <= h.length <= 150000`, and each height $1 \le h[i] \le 100$).

## Examples to say out loud

- Standard case: `h = [1, 2, 6, 1, 1, 7, 1], k = 3`.
  - Block 1 (index 1 to 3): $1 + 2 + 6 = 9$.
  - Block 2 (index 2 to 4): $2 + 6 + 1 = 9$.
  - Block 3 (index 3 to 5): $6 + 1 + 1 = 8$.
  - Block 4 (index 4 to 6): $1 + 1 + 7 = 9$.
  - Block 5 (index 5 to 7): $1 + 7 + 1 = 9$.
  - Minimum sum is 8, occurring at start position 3. Output is 3.
- All equal planks: `h = [5, 5, 5], k = 2`.
  - Blocks $[5, 5]$ both sum to 10. Smallest 1-based index is 1. Output is 1.
- Single plank: `h = [4], k = 1`. Returns 1.

## Brute force

A naive brute-force algorithm iterates over each possible starting index $i$ from 0 to $n - k$. For each starting plank, it runs an inner loop of length $k$ to sum $h[i \dots i + k - 1]$. There are $n - k + 1$ windows, each taking $O(k)$ time, resulting in $O(n \times k)$ time overall. For $n = 150,000$ and $k = 75,000$, $n \times k \approx 10^{10}$ operations, which causes a severe timeout.

## The key observation

Adjacent windows of length $k$ overlap heavily: window $i$ and window $i + 1$ differ by only two elements. The sum of the window starting at index $i - k + 1$ can be updated from the previous window by adding the incoming element $h[i]$ and subtracting the outgoing element $h[i - k]$. This sliding window technique updates each window sum in $O(1)$ time, reducing the total time from $O(n \times k)$ to $O(n)$.

## Optimal approach

1. Compute the initial sum of the first $k$ planks ($h[0 \dots k - 1]$): `sum`.
2. Initialize `best = sum` and record starting index `start = 1`.
3. Slide the window from index $i = k$ to $n - 1$:
   a. Update the running window sum: `sum += h[i] - h[i - k]`.
   b. If `sum < best` (strict inequality ensures the smallest start index wins ties):
      - Update `best = sum`.
      - Update `start = i - k + 2` (converting 0-based start index $i - k + 1$ to 1-based index by adding 1).
4. Return `start`.

Complexity:
- Time: `O(n)` where $n$ is the number of planks (`h.length`). We make a single pass through the array, updating sums in $O(1)$ per step.
- Space: `O(1)` auxiliary space beyond the input array as only scalar variables are used.

## Code walkthrough

In the reference implementation:
- `long long sum = 0; for (int i = 0; i < k; i++) sum += h[i];`: initializes the window sum for the first $k$ planks.
- `long long best = sum; int start = 1;`: tracks the minimum sum observed and its 1-based start index.
- `for (int i = k; i < (int)h.size(); i++)`: slides the window across the remaining planks.
- `sum += h[i] - h[i - k];`: adds the new plank at index $i$ and drops the plank at $i - k$.
- `if (sum < best) { best = sum; start = i - k + 2; }`: updates only on strict improvements, preserving the earliest start position on ties.
- `return start;`: returns the 1-based start index.

## Test it out loud

- `h = [3, 1, 2], k = 1`:
  - $i = 0$: sum 3.
  - $i = 1$: sum 1 < 3 $\implies start = 2$.
  - $i = 2$: sum 2 $\implies$ not smaller.
  - Returns 2.
- `h = [9, 9, 9, 1, 1], k = 2`:
  - Windows of size 2: $[9, 9] \to 18$, $[9, 9] \to 18$, $[9, 1] \to 10$, $[1, 1] \to 2$.
  - Minimum sum is 2 at 1-based index 4. Returns 4.
- `h = [7, 7, 7, 7], k = 4`:
  - Only one window exists. Returns 1.

## Follow-ups

- What if plank heights could be negative?
  The sliding window logic remains identical because adding the incoming plank and subtracting the outgoing plank works regardless of sign.
- What if queries with varying $k$ are given repeatedly?
  Precompute prefix sums $P[i] = \sum_{j=0}^{i-1} h[j]$ in $O(n)$ time. Any window sum $h[i \dots i + k - 1]$ can then be evaluated in $O(1)$ via $P[i + k] - P[i]$.

## Common mistakes

- 1-based vs 0-based off-by-one errors: the 0-based start index is $i - k + 1$, which becomes $i - k + 2$ in 1-based indexing.
- Using `<=` instead of `<` when updating `best`, which erroneously replaces the earliest start index with a later start index during ties.
- Recalculating the window sum from scratch in an inner loop, taking $O(n \times k)$ time.

## Further reading

- Sliding window fixed-size subarray pattern.
- Prefix sums for range sum queries.
