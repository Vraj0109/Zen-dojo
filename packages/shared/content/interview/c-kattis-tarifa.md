---
id: c-kattis-tarifa
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- How does the data rollover plan work? (The plan allocates $x$ megabytes at the start of each month; unused megabytes from previous months roll over indefinitely into subsequent months).
- For how many months is usage tracked? (The array `used` records usage for $n$ months, where $n = \text{used.length}$).
- Which month's available megabytes should be returned? (Month $n + 1$, which is the month immediately following the tracked period, after receiving month $n + 1$'s allocation).
- What are the constraints on $x$, $n$, and monthly usage? ($1 \le x \le 100$, $1 \le n \le 100$, and each $0 \le used[i] \le 10,000$).
- Can the user exceed their available data in any month? (No, problem guarantees the user never uses more data than was available in that month).

## Examples to say out loud

- Standard case: `x = 10, used = [4, 6, 2]`.
  - Over the $n = 3$ tracked months plus month 4, the user receives $4 \times 10 = 40$ megabytes in total.
  - Total used across the first 3 months: $4 + 6 + 2 = 12$ megabytes.
  - Available in month 4: $40 - 12 = 28$ megabytes. Output is 28.
- Full usage: `x = 10, used = [10, 10, 10]`.
  - Received: $4 \times 10 = 40$. Used: 30.
  - Available: $40 - 30 = 10$ megabytes. Output is 10.
- Single month: `x = 1, used = [0]`.
  - Received in months 1 and 2: $2 \times 1 = 2$. Used: 0. Available: 2. Output is 2.

## Brute force

A step-by-step month-by-month simulation maintains a running balance `available = 0`. For each month $i$ from 1 to $n$, add $x$ megabytes, subtract $used[i - 1]$, and store the remaining rollover. Finally, at month $n + 1$, add $x$ one more time and return `available`. With $n \le 100$, this simulation takes $O(n)$ time and $O(1)$ space.

## The key observation

Because unused megabytes roll over completely without expiring, we do not need to track balances month by month.
Over the span of $n + 1$ months (months $1$ through $n + 1$), the user receives exactly:
$$\text{total\_received} = x \times (n + 1)$$
The total megabytes consumed during the first $n$ months is:
$$\text{total\_used} = \sum_{i=0}^{n-1} used[i]$$
The data available at the beginning of month $n + 1$ is simply the total data received minus the total data used:
$$\text{available} = x \times (n + 1) - \sum_{i=0}^{n-1} used[i]$$

## Optimal approach

1. Calculate the total data received across all $n + 1$ months:
   `total = x * (used.length + 1)`.
2. Sum all elements in the `used` array:
   - For each value `u` in `used`, subtract `u` from `total`.
3. Return `total`.

Complexity:
- Time: `O(n)` where $n$ is `used.length`. We make a single linear pass over the $n \le 100$ elements.
- Space: `O(1)` auxiliary space as only a single integer accumulator is maintained.

## Code walkthrough

In the reference implementation:
- `int total = x * ((int)used.size() + 1);`: computes the cumulative data allocated over the full $(n + 1)$-month timeline.
- `for (int u : used) total -= u;`: deducts the consumption of each month from the cumulative pool.
- `return total;`: returns the net available data remaining for month $n + 1$.

## Test it out loud

- `x = 1, used = [0]`:
  - `total = 1 * (1 + 1) = 2`.
  - `total -= 0 = 2`. Returns 2.
- `x = 1, used = [1]`:
  - `total = 1 * 2 = 2`.
  - `total -= 1 = 1`. Returns 1.
- `x = 100, used = [0, 0, 0]`:
  - `total = 100 * (3 + 1) = 400`. Returns 400.
- `x = 7, used = [10, 0, 0]`:
  - `total = 7 * 4 = 28`.
  - Deducts 10, leaves 18. Returns 18.

## Follow-ups

- What if data expires after $k$ months (limited rollover)?
  If rollover expires after $k$ months, cumulative subtraction fails; we must simulate with a sliding window or queue of size $k$ to track which monthly allotments expire.
- What if there are multiple plans with varying monthly allowances?
  Sum the individual allowances for months $1 \dots n + 1$ and subtract the total consumption.

## Common mistakes

- Multiplying $x$ by $n$ instead of $n + 1$, forgetting that month $n + 1$ also grants $x$ megabytes.
- Simulating with a month-by-month loop and capping at zero if usage appears to exceed allowance (the problem guarantees total available data is never exceeded).
- Off-by-one errors in array length vs month index.

## Further reading

- Cumulative sum (prefix sum) reductions.
- Inventory accounting and FIFO / LIFO queue models.
