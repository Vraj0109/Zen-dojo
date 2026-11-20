---
id: c-euler-14
pattern: cses-euler
difficulty: medium
optimal: "O(limit * average walk) time, O(limit) space; fast in practice"
reviewed: false
---

## Clarify first

- What is the definition of the Collatz sequence? (For an integer $n$: if $n$ is even, $n \to n / 2$; if odd, $n \to 3n + 1$. The chain stops when reaching 1).
- How is the chain length measured? (The chain length counts all terms from the starting number through the final 1, so the chain for 1 has length 1, and 13 has length 10).
- Is the starting number strictly below `limit`? (Yes, the search domain is $1 \le s < \text{limit}$).
- What is the range of `limit`? ($2 \le \text{limit} \le 3,000,000$).
- How should ties in chain length be resolved? (Return the smallest starting number among those achieving the maximum length).
- Can intermediate terms exceed 32-bit signed integers? (Yes, during $3n + 1$ operations, values easily exceed $2 \times 10^9$, requiring 64-bit integer types like `long long`).

## Examples to say out loud

- Base case: `limit = 2`. The only starting number strictly below 2 is 1, with chain length 1. Returns 1.
- Small case: `limit = 3`. Starting numbers are 1 (length 1) and 2 (chain 2 $\to$ 1, length 2). Returns 2.
- Example case: `limit = 10`. Let's examine starting numbers:
  - $s = 9$: sequence is 9, 28, 14, 7, 22, 11, 34, 17, 52, 26, 13, 40, 20, 10, 5, 16, 8, 4, 2, 1 (20 terms).
  - All numbers $1 \le s \le 8$ have chain lengths shorter than 20 terms.
  - The starting number with the longest chain is 9.

## Brute force

A brute-force strategy simulates the full Collatz walk from each starting number $s = 1, 2, \dots, \text{limit} - 1$ until it reaches 1, without storing any previous results. Because different Collatz trajectories frequently merge into identical subpaths (for example, every even number immediately jumps into an earlier sequence), this causes massive redundant recomputations. For $\text{limit} = 3,000,000$, unmemoized simulation takes several seconds and risks timing out.

## The key observation

Collatz trajectories exhibit optimal substructure: if the path from $s$ eventually visits a value $x < s$, the total chain length from $s$ is simply the number of steps taken to reach $x$ plus the already-known chain length of $x$: $\text{len}[s] = \text{steps} + \text{len}[x]$. By processing starting numbers in increasing order $s = 2, 3, \dots, \text{limit} - 1$ and memoizing $\text{len}[s]$ in a flat array, we stop the simulation as soon as $x < s$, drastically shortening each walk.

## Optimal approach

1. Allocate an integer array `len` of size `limit` initialized to 0.
2. Set base case: `len[1] = 1`.
3. Initialize `best = 1` to track the starting number with the maximum length.
4. Iterate `s` from 2 up to `limit - 1`:
   a. Set a 64-bit variable `x = s` and a step counter `steps = 0`.
   b. While $x \ge s$:
      - If $x$ is even, $x = x / 2$; otherwise $x = 3x + 1$.
      - Increment `steps`.
   c. Record `len[s] = steps + len[x]`.
   d. If `len[s] > len[best]`, update `best = s` (using strict inequality ensures smaller starting numbers win ties).
5. Return `best`.

Complexity:
- Time: `O(limit * average walk)` where the average number of steps until $x < s$ is bounded by a small constant (experimentally fewer than 3 to 5 steps on average). For $\text{limit} = 3 \times 10^6$, this takes under 100 ms.
- Space: `O(limit)` auxiliary space for the `len` table of 3,000,000 32-bit integers (~12 MB).

## Code walkthrough

In the reference implementation:
- `vector<int> len(limit, 0); len[1] = 1;`: stores precomputed chain lengths for all $s < \text{limit}$.
- `long long x = s;`: uses a 64-bit integer to prevent integer overflow when $3x + 1$ exceeds $2^{31} - 1$.
- `while (x >= s)`: continues the Collatz step sequence only until reaching a previously solved value $x < s$.
- `len[s] = steps + len[x];`: retrieves the memoized tail length in $O(1)$ time.
- `if (len[s] > len[best]) best = s;`: maintains the optimal start, naturally preserving the smallest index on ties due to strict greater-than comparison.

## Test it out loud

- `limit = 2`:
  - `best = 1`. Loop from $s = 2$ to $s < 2$ does not run. Returns 1.
- `limit = 4`:
  - `s = 2`: $x = 2 \to x = 1$ (1 step). $x = 1 < 2$. `len[2] = 1 + len[1] = 2`. `best` becomes 2.
  - `s = 3`: $x = 3 \to 10 \to 5 \to 16 \to 8 \to 4 \to 2$ (6 steps). $x = 2 < 3$. `len[3] = 6 + len[2] = 8`. `best` becomes 3.
  - Returns 3.
- `limit = 10`:
  - $s = 9$ achieves length 20, exceeding all smaller starters. Returns 9.

## Follow-ups

- What if `limit` is $10^8$?
  A flat array of $10^8$ integers would take 400 MB. To save memory, we can memoize only every $k$-th value, or store only lengths up to a cache threshold (e.g. $10^7$) while letting higher intermediate values recurse.
- Can we parallelize the computation?
  Yes, multiple threads can evaluate chunks of starting numbers independently by maintaining a read-only or lock-free cache, or by computing local maximums.

## Common mistakes

- Using 32-bit signed integers for $x$: intermediate Collatz values for starting numbers below $10^6$ can exceed $2^{31} - 1$ (for example, starting at 27 peaks at 9232, and 837799 peaks at over $8.4 \times 10^9$), causing integer overflow and infinite cycles.
- Stopping the while loop only when $x == 1$ instead of $x < s$, discarding the memoization speedup.
- Using `>=` instead of `>` when updating `best`, which incorrectly favors larger starting numbers on length ties.

## Further reading

- The Collatz Conjecture (the $3n + 1$ problem) and Terras' theorem on stopping times.
- Dynamic programming and memoization techniques in recurrence sequences.
